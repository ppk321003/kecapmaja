import { 
  Submission, 
  STATUS_LABELS, 
  UserRole, 
  canTakeAction, 
  canReturnFromKppn,
  getDocumentsByJenisBelanja,
  Document
} from '@/types/pencairan';
import { StatusBadge } from './StatusBadge';
import { WorkflowProgress } from './WorkflowProgress';
import { DocumentChecklist } from './DocumentChecklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { 
  FileText, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle,
  Send,
  ArrowLeft,
  MessageSquare,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubmissionDetailProps {
  submission: Submission | null;
  open: boolean;
  onClose: () => void;
  onUpdateSubmission: (id: string, updates: Partial<Submission>) => void;
  userRole: UserRole;
  onRefresh: () => void;
}

export function SubmissionDetail({ 
  submission, 
  open, 
  onClose,
  onUpdateSubmission,
  userRole,
  onRefresh
}: SubmissionDetailProps) {
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (submission) {
      // Rebuild documents berdasarkan jenisBelanja dan subJenisBelanja
      const defaultDocs = getDocumentsByJenisBelanja(
        submission.jenisBelanja, 
        submission.subJenisBelanja || ''
      );
      
      if (defaultDocs.length > 0 && submission.documents && submission.documents.length > 0) {
        // Map checked status dari submission.documents ke defaultDocs
        const checkedTypes = submission.documents
          .filter(d => d.isChecked)
          .map(d => d.type);
        const checkedNames = submission.documents
          .filter(d => d.isChecked)
          .map(d => d.name.toLowerCase());
          
        const mergedDocs = defaultDocs.map(doc => ({
          ...doc,
          isChecked: checkedTypes.includes(doc.type) || 
                     checkedNames.some(name => doc.name.toLowerCase().includes(name.split(' ')[0]))
        }));
        setDocuments(mergedDocs);
      } else if (defaultDocs.length > 0) {
        setDocuments(defaultDocs);
      } else {
        setDocuments(submission.documents || []);
      }
      
      setNotes(submission.notes || '');
    }
  }, [submission]);

  if (!submission) return null;

  const handleDocumentToggle = (index: number) => {
    const newDocs = [...documents];
    newDocs[index] = { ...newDocs[index], isChecked: !newDocs[index].isChecked };
    setDocuments(newDocs);
  };

  const allDocsComplete = documents.every(d => !d.isRequired || d.isChecked);
  const requiredDocs = documents.filter(d => d.isRequired);
  const checkedCount = documents.filter(d => d.isChecked).length;
  const requiredCheckedCount = requiredDocs.filter(d => d.isChecked).length;

  const updateStatusInSheet = async (
    newStatus: string, 
    newNotes?: string, 
    actor: 'ppk' | 'bendahara' | 'kppn' = 'ppk',
    action: 'approve' | 'reject' | 'return' = 'approve'
  ) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('pencairan-update', {
        body: {
          id: submission.id,
          status: newStatus,
          notes: newNotes || notes || undefined,
          actor,
          action,
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: 'Status berhasil diperbarui',
          description: `Status pengajuan telah diubah menjadi ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] || newStatus}`,
        });
        onRefresh();
      } else {
        throw new Error(data?.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast({
        title: 'Gagal memperbarui status',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprove = async () => {
    let newStatus: string;
    let actor: 'ppk' | 'bendahara' | 'kppn';
    
    if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      newStatus = 'pending_bendahara';
      actor = 'ppk';
    } else if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      newStatus = 'sent_kppn';
      actor = 'bendahara';
    } else {
      return;
    }

    await updateStatusInSheet(newStatus, undefined, actor, 'approve');
    
    onUpdateSubmission(submission.id, {
      status: newStatus as Submission['status'],
      documents,
      ...(submission.status === 'pending_ppk' && { ppkCheckedAt: new Date() }),
      ...(submission.status === 'pending_bendahara' && { 
        bendaharaCheckedAt: new Date(),
        sentToKppnAt: newStatus === 'sent_kppn' ? new Date() : undefined
      }),
    });
    onClose();
  };

  const handleReject = async () => {
    let newStatus: string;
    let actor: 'ppk' | 'bendahara' | 'kppn';
    
    if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      newStatus = 'incomplete_sm';
      actor = 'ppk';
    } else if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      newStatus = 'incomplete_ppk';
      actor = 'bendahara';
    } else {
      return;
    }

    await updateStatusInSheet(newStatus, notes, actor, 'reject');

    onUpdateSubmission(submission.id, {
      status: newStatus as Submission['status'],
      documents,
      notes: notes || submission.notes,
    });
    onClose();
  };

  const handleReturnToBendahara = async () => {
    const newStatus = 'incomplete_bendahara';
    await updateStatusInSheet(newStatus, notes, 'kppn', 'return');

    onUpdateSubmission(submission.id, {
      status: newStatus,
      notes: notes || submission.notes,
    });
    onClose();
  };

  const canAction = canTakeAction(userRole, submission.status);
  const canReturn = canReturnFromKppn(userRole, submission.status);

  const getApproveButtonLabel = () => {
    if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      return 'Kirim ke Bendahara';
    }
    return 'Kirim ke KPPN';
  };

  const getRejectButtonLabel = () => {
    if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      return 'Kembalikan ke SM';
    }
    return 'Kembalikan ke PPK';
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg leading-tight">{submission.title}</SheetTitle>
              <p className="text-sm text-muted-foreground font-mono">{submission.id}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <StatusBadge status={submission.status} />
            {canAction && (
              <div className="text-xs text-muted-foreground">
                <FileText className="w-3 h-3 inline mr-1" />
                {checkedCount}/{documents.length} dokumen
                • {requiredCheckedCount}/{requiredDocs.length} wajib
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Progress Pengajuan</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowProgress status={submission.status} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pengaju</p>
                    <p className="font-medium">{submission.submitterName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tanggal Pengajuan</p>
                    <p className="font-medium">
                      {format(submission.submittedAt, 'd MMMM yyyy', { locale: id })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Jenis Belanja</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {submission.jenisBelanja}
                    {submission.subJenisBelanja && ` - ${submission.subJenisBelanja}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Checklist Kelengkapan Dokumen</CardTitle>
                {canAction && !allDocsComplete && requiredDocs.length > 0 && (
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Dokumen wajib belum lengkap
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <DocumentChecklist 
                documents={documents} 
                onToggle={canAction ? handleDocumentToggle : undefined}
                readOnly={!canAction}
              />
            </CardContent>
          </Card>

          {(submission.notes || canAction || canReturn) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Catatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(canAction || canReturn) ? (
                  <Textarea
                    placeholder="Tambahkan catatan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                    {submission.notes || 'Tidak ada catatan'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {canAction && (
            <div className="flex gap-3 pt-4">
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleReject}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                {getRejectButtonLabel()}
              </Button>
              <Button 
                className="flex-1"
                onClick={handleApprove}
                disabled={!allDocsComplete || isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk' ? (
                  <Send className="w-4 h-4 mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {getApproveButtonLabel()}
              </Button>
            </div>
          )}

          {canReturn && (
            <div className="flex gap-3 pt-4">
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleReturnToBendahara}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowLeft className="w-4 h-4 mr-2" />
                )}
                Kembalikan ke Bendahara
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
