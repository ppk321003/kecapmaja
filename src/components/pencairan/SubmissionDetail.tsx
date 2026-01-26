import { 
  Submission, 
  STATUS_LABELS, 
  UserRole, 
  canTakeAction, 
  canReturnFromArsip,
  getDocumentsByJenisBelanja,
  Document
} from '@/types/pencairan';
import { StatusBadge } from './StatusBadge';
import { WorkflowProgress } from './WorkflowProgress';
import { DocumentChecklist } from './DocumentChecklist';
import { TrackingTimeline } from './TrackingTimeline';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  AlertCircle,
  ChevronDown,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [isTrackingOpen, setIsTrackingOpen] = useState(true);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(true);
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
    actor: 'ppk' | 'ppspm' | 'bendahara' | 'arsip' = 'ppk',
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
    let actor: 'bendahara' | 'ppk' | 'ppspm' | 'arsip';
    
    // Logika alur baru: SM > BENDAHARA > PPK > PPSPM > ARSIP (after sent_kppn)
    if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      newStatus = 'pending_ppk'; // Setelah Bendahara approve, ke PPK
      actor = 'bendahara';
    } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      newStatus = 'pending_ppspm'; // Setelah PPK approve, ke PPSPM
      actor = 'ppk';
    } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
      newStatus = 'pending_arsip'; // Setelah PPSPM approve, langsung ke Arsip (sent_kppn handled separately)
      actor = 'ppspm';
    } else if (submission.status === 'pending_arsip') {
      newStatus = 'sent_arsip'; // Setelah Arsip approve, selesai
      actor = 'arsip';
    } else {
      return;
    }

    await updateStatusInSheet(newStatus, undefined, actor, 'approve');
    
    onUpdateSubmission(submission.id, {
      status: newStatus as Submission['status'],
      documents,
      ...(actor === 'bendahara' && { bendaharaCheckedAt: new Date() }),
      ...(actor === 'ppk' && { ppkCheckedAt: new Date() }),
      ...(actor === 'ppspm' && { ppspmCheckedAt: new Date() }),
      ...(actor === 'arsip' && { arsipCheckedAt: new Date() }),
    });
    onClose();
  };

  const handleReject = async () => {
    let newStatus: string;
    let actor: 'bendahara' | 'ppk' | 'ppspm' | 'kppn' | 'arsip';
    
    // Alur pengembalian sesuai alur baru
    if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      newStatus = 'incomplete_sm'; // Bendahara reject, kembali ke SM
      actor = 'bendahara';
    } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      newStatus = 'incomplete_bendahara'; // PPK reject, kembali ke Bendahara
      actor = 'ppk';
    } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
      newStatus = 'incomplete_ppk'; // PPSPM reject, kembali ke PPK
      actor = 'ppspm';
    } else if (submission.status === 'pending_arsip') {
      newStatus = 'incomplete_ppspm'; // Arsip reject, kembali ke PPSPM
      actor = 'arsip';
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

  const handleReturnFromArsip = async () => {
    const newStatus = 'incomplete_ppspm';
    await updateStatusInSheet(newStatus, notes, 'arsip', 'return');

    onUpdateSubmission(submission.id, {
      status: newStatus,
      notes: notes || submission.notes,
    });
    onClose();
  };

  const canAction = canTakeAction(userRole, submission.status);
  const canReturnArsip = canReturnFromArsip(userRole, submission.status);

  const getApproveButtonLabel = () => {
    if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      return 'Setujui dan Kirim ke PPK';
    } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      return 'Setujui dan Kirim ke PPSPM';
    } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
      return 'Setujui dan Kirim ke Arsip';
    } else if (submission.status === 'pending_arsip') {
      return 'Catat dan Arsip';
    }
    return 'Setujui';
  };

  const getRejectButtonLabel = () => {
    if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      return 'Kembalikan ke SM';
    } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      return 'Kembalikan ke Bendahara';
    } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
      return 'Kembalikan ke PPK';
    } else if (submission.status === 'pending_arsip') {
      return 'Kembalikan ke PPSPM';
    }
    return 'Tolak';
  };

  const showWorkflowNote = () => {
    if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
      return "Pengajuan sedang diperiksa oleh PPSPM (Pejabat Penandatangan Surat Perintah Membayar)";
    }
    return null;
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
          {showWorkflowNote() && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {showWorkflowNote()}
            </div>
          )}
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
                      {format(submission.submittedAt, 'd MMMM yyyy', { locale: idLocale })}
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

          {/* Tracking Timeline - Collapsible */}
          <Collapsible open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Tracking Pengajuan
                    </CardTitle>
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        isTrackingOpen && "rotate-180"
                      )} 
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <TrackingTimeline submission={submission} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Document Checklist - Collapsible */}
          <Collapsible open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Checklist Kelengkapan Dokumen
                      {canAction && !allDocsComplete && requiredDocs.length > 0 && (
                        <span className="text-xs text-destructive flex items-center gap-1 ml-2">
                          <AlertCircle className="w-3 h-3" />
                          Belum lengkap
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {checkedCount}/{documents.length}
                      </span>
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform",
                          isDocumentsOpen && "rotate-180"
                        )} 
                      />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <DocumentChecklist 
                    documents={documents} 
                    onToggle={canAction ? handleDocumentToggle : undefined}
                    readOnly={!canAction}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {(submission.notes || canAction || canReturnArsip) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Catatan {submission.status === 'pending_arsip' && <span className="text-red-500">*</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(canAction || canReturnArsip) ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder={submission.status === 'pending_arsip' ? "Catatan wajib diisi..." : "Tambahkan catatan..."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                    {submission.status === 'pending_arsip' && !notes && (
                      <p className="text-xs text-red-500">Catatan wajib diisi sebelum submit</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                    {submission.notes || 'Tidak ada catatan'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(canAction || canReturnArsip) && (
            <div className="flex gap-3 pt-4">
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={canReturnArsip ? handleReturnFromArsip : handleReject}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : canReturnArsip ? (
                  <ArrowLeft className="w-4 h-4 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                {canReturnArsip ? 'Kembalikan ke KPPN' : getRejectButtonLabel()}
              </Button>
              <Button 
                className="flex-1"
                onClick={handleApprove}
                disabled={(canAction && !allDocsComplete) || isUpdating || (submission.status === 'pending_arsip' && !notes)}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}