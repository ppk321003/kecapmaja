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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  History,
  Save
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
  const [pembayaran, setPembayaran] = useState<'UP' | 'LS' | ''>('');
  const [nomorSPM, setNomorSPM] = useState('');
  const [nomorSPPD, setNomorSPPD] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'approve' | 'reject' | 'return' | null }>({ open: false, action: null });
  const { toast } = useToast();

  // Track which submission ID we've initialized for - only reset form on ID change
  const [initializedForId, setInitializedForId] = useState<string | null>(null);

  useEffect(() => {
    if (submission && submission.id !== initializedForId) {
      // Only initialize form state when viewing a NEW submission (different ID)
      setInitializedForId(submission.id);
      
      // Rebuild documents berdasarkan jenisBelanja dan subJenisBelanja
      const defaultDocs = getDocumentsByJenisBelanja(
        submission.jenisBelanja, 
        submission.subJenisBelanja || ''
      );
      
      if (defaultDocs.length > 0 && submission.documents && submission.documents.length > 0) {
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
      setPembayaran(submission.pembayaran || '');
      setNomorSPM(submission.nomorSPM || '');
      setNomorSPPD(submission.nomorSPPD || '');
      
      // Clear pembayaran jika incomplete_bendahara (user harus pilih ulang)
      if (submission.status === 'incomplete_bendahara') {
        setPembayaran('');
      }
    }
    
    // Reset initializedForId when dialog closes
    if (!submission) {
      setInitializedForId(null);
    }
  }, [submission, initializedForId]);

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

  const saveChecklistOnly = async () => {
    setIsUpdating(true);
    try {
      // Get checked documents
      const checkedDocs = documents.filter(d => d.isChecked).map(d => d.name);
      const kelengkapan = checkedDocs.join('|');

      const { data, error } = await supabase.functions.invoke('pencairan-update', {
        body: {
          id: submission.id,
          status: submission.status, // Keep same status, just update documents
          actor: userRole === 'Bendahara' ? 'bendahara' : 
                 userRole === 'Pejabat Pembuat Komitmen' ? 'ppk' :
                 userRole === 'Pejabat Penandatangan Surat Perintah Membayar' ? 'ppspm' : 'arsip',
          action: 'checklist', // Special action for just saving checklist
          kelengkapan, // Include checked documents
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: 'Berhasil',
          description: 'Checklist kelengkapan dokumen telah disimpan',
        });
        onRefresh();
      } else {
        throw new Error(data?.error || 'Failed to save checklist');
      }
    } catch (err) {
      console.error('Error saving checklist:', err);
      toast({
        title: 'Gagal menyimpan checklist',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateStatusInSheet = async (
    newStatus: string, 
    newNotes?: string, 
    actor: 'ppk' | 'ppspm' | 'bendahara' | 'arsip' = 'ppk',
    action: 'approve' | 'reject' | 'return' | 'save_spby' = 'approve'
  ) => {
    setIsUpdating(true);
    try {
      // Get checked documents
      const checkedDocs = documents.filter(d => d.isChecked).map(d => d.name);
      const kelengkapan = checkedDocs.join('|');

      const { data, error } = await supabase.functions.invoke('pencairan-update', {
        body: {
          id: submission.id,
          status: newStatus,
          notes: newNotes || notes || undefined,
          actor,
          action,
          kelengkapan, // Include checked documents
          pembayaran: actor === 'bendahara' ? pembayaran : undefined,
          nomorSPM: nomorSPM || undefined,
          nomorSPPD: actor === 'arsip' ? nomorSPPD : undefined,
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

  const executeApprove = async () => {
    let newStatus: string;
    let actor: 'bendahara' | 'ppk' | 'ppspm' | 'arsip';
    
    // Logika alur baru: SM > BENDAHARA > PPK > PPSPM > sent_kppn (Arsip catat) > complete_arsip
    if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      // For Bendahara, validate pembayaran and nomorSPM for LS
      if (userRole === 'Bendahara') {
        if (!pembayaran) {
          toast({
            title: 'Validasi gagal',
            description: 'Pilih tipe pembayaran (UP atau LS) terlebih dahulu',
            variant: 'destructive',
          });
          return;
        }
        
        if (pembayaran === 'LS' && !nomorSPM) {
          toast({
            title: 'Validasi gagal',
            description: 'Nomor SPM wajib diisi untuk pembayaran Langsung (LS)',
            variant: 'destructive',
          });
          return;
        }
        
        // UP should not go through normal approval flow
        if (pembayaran === 'UP') {
          if (submission.status === 'incomplete_bendahara') {
            toast({
              title: 'Tidak bisa mengirim UP dengan cara normal',
              description: 'Pilih: (1) Ubah ke LS dan isi SPM baru, atau (2) Gunakan "Simpan SPBy" untuk mengelompokkan UP',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Langkah salah',
              description: 'Untuk Uang Persediaan (UP), gunakan tombol "Simpan SPBy"',
              variant: 'destructive',
            });
          }
          return;
        }
      }
      
      newStatus = 'pending_ppk'; // Setelah Bendahara approve, ke PPK
      actor = 'bendahara';
    } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      newStatus = 'pending_ppspm'; // Setelah PPK approve, ke PPSPM
      actor = 'ppk';
    } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
      newStatus = 'sent_kppn'; // Setelah PPSPM approve, ke Arsip (sent_kppn)
      actor = 'ppspm';
    } else if (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') {
      // For Arsip, validate nomorSPPD
      if (userRole === 'Arsip' && !nomorSPPD) {
        toast({
          title: 'Validasi gagal',
          description: 'Nomor SP2D wajib diisi',
          variant: 'destructive',
        });
        return;
      }
      
      if (!notes) {
        toast({
          title: 'Validasi gagal',
          description: 'Catatan wajib diisi',
          variant: 'destructive',
        });
        return;
      }
      
      newStatus = 'complete_arsip'; // Setelah Arsip catat, selesai
      actor = 'arsip';
    } else {
      return;
    }

    await updateStatusInSheet(newStatus, undefined, actor, 'approve');
    
    onUpdateSubmission(submission.id, {
      status: newStatus as Submission['status'],
      documents,
      pembayaran: actor === 'bendahara' ? pembayaran as 'UP' | 'LS' : undefined,
      nomorSPM: actor === 'bendahara' ? nomorSPM : undefined,
      nomorSPPD: actor === 'arsip' ? nomorSPPD : undefined,
      ...(actor === 'bendahara' && { bendaharaCheckedAt: new Date() }),
      ...(actor === 'ppk' && { ppkCheckedAt: new Date() }),
      ...(actor === 'ppspm' && { ppspmCheckedAt: new Date() }),
      ...(actor === 'arsip' && { arsipCheckedAt: new Date() }),
    });
    onClose();
  };

  const executeReject = async () => {
    let newStatus: string;
    let actor: 'bendahara' | 'ppk' | 'ppspm' | 'arsip';
    
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
    } else if (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') {
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

  const executeReturnFromArsip = async () => {
    const newStatus = 'incomplete_ppspm';
    await updateStatusInSheet(newStatus, notes, 'arsip', 'return');

    onUpdateSubmission(submission.id, {
      status: newStatus,
      notes: notes || submission.notes,
    });
    onClose();
  };

  // Handler untuk "Simpan SPBy" button (UP flow)
  const handleSaveSPBy = async () => {
    // Status tetap pending_bendahara, tapi pembayaran dan nomorSPM kosong
    // Data akan disimpan ke Sheet dan kemudian dapat dikelompokkan di tab SPBy
    setIsUpdating(true);
    try {
      // Get checked documents
      const checkedDocs = documents.filter(d => d.isChecked).map(d => d.name);
      const kelengkapan = checkedDocs.join('|');

      const { data, error } = await supabase.functions.invoke('pencairan-update', {
        body: {
          id: submission.id,
          status: submission.status, // Keep same status
          actor: 'bendahara',
          action: 'save_spby',
          kelengkapan,
          pembayaran: 'UP',
          // nomorSPM tetap kosong untuk UP sampai dikelompokkan
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: 'SPBy berhasil disimpan',
          description: 'Pengajuan telah disimpan sebagai Uang Persediaan (UP). Lanjutkan ke tab SPBy untuk pengelompokan.',
        });
        onRefresh();
        onClose();
      } else {
        throw new Error(data?.error || 'Failed to save SPBy');
      }
    } catch (err) {
      console.error('Error saving SPBy:', err);
      toast({
        title: 'Gagal menyimpan SPBy',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canAction = canTakeAction(userRole, submission.status);
  const canReturnArsip = canReturnFromArsip(userRole, submission.status);

  const handleApprove = () => setConfirmDialog({ open: true, action: 'approve' });
  const handleReject = () => setConfirmDialog({ open: true, action: 'reject' });
  const handleReturnFromArsip = () => setConfirmDialog({ open: true, action: 'return' });

  const handleConfirm = async () => {
    setConfirmDialog({ open: false, action: null });
    switch (confirmDialog.action) {
      case 'approve':
        await executeApprove();
        break;
      case 'reject':
        await executeReject();
        break;
      case 'return':
        await executeReturnFromArsip();
        break;
    }
  };

  const getConfirmMessage = () => {
    switch (confirmDialog.action) {
      case 'approve':
        if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
          return 'Apakah Anda yakin ingin menyetujui dan mengirim ke PPK?';
        } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
          return 'Apakah Anda yakin ingin menyetujui dan mengirim ke PPSPM?';
        } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
          return 'Apakah Anda yakin ingin menyetujui dan mengirim ke Arsip?';
        } else if (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') {
          return 'Apakah Anda yakin ingin menyelesaikan pengajuan ini?';
        }
        return 'Apakah Anda yakin ingin menyetujui pengajuan ini?';
      case 'reject':
        if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
          return 'Apakah Anda yakin ingin menolak dan mengembalikan ke SM?';
        } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
          return 'Apakah Anda yakin ingin menolak dan mengembalikan ke Bendahara?';
        } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
          return 'Apakah Anda yakin ingin menolak dan mengembalikan ke PPK?';
        } else if (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') {
          return 'Apakah Anda yakin ingin menolak dan mengembalikan ke PPSPM?';
        }
        return 'Apakah Anda yakin ingin menolak pengajuan ini?';
      case 'return':
        return 'Apakah Anda yakin ingin mengembalikan ke PPSPM?';
      default:
        return 'Apakah Anda yakin?';
    }
  };

  const getApproveButtonLabel = () => {
    if (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') {
      return 'Setujui dan Kirim ke PPK';
    } else if (submission.status === 'pending_ppk' || submission.status === 'incomplete_ppk') {
      return 'Setujui dan Kirim ke PPSPM';
    } else if (submission.status === 'pending_ppspm' || submission.status === 'incomplete_ppspm') {
      return 'Setujui dan Kirim ke Arsip';
    } else if (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') {
      return 'Catat dan Selesaikan';
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
    } else if (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') {
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
                {submission.nominal && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Nilai</p>
                      <p className="font-medium">Rp {Number(submission.nominal).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                )}
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

          {/* Pembayaran Field - Bendahara only */}
          {userRole === 'Bendahara' && (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') && (
            <>
              {/* Warning for incomplete_bendahara + UP */}
              {submission.status === 'incomplete_bendahara' && submission.pembayaran === 'UP' && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <p className="font-medium text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Pengajuan dikembalikan PPK</span>
                    </p>
                    <p className="text-amber-800 text-xs leading-relaxed ml-6">
                      Pengajuan ini ditandai Uang Persediaan (UP) dengan Nomor SPM {submission.nomorSPM}. Untuk melanjutkan:
                    </p>
                    <ul className="text-amber-800 text-xs ml-6 list-disc list-inside space-y-1">
                      <li><strong>Edit Nomor SPM</strong> (jika perlu diperbaiki)</li>
                      <li><strong>Pilih metode pembayaran</strong> (LS atau tetap UP)</li>
                      <li>Jika UP: gunakan "Simpan SPBy" untuk grouping</li>
                      <li>Jika LS: isi SPM baru, lalu "Kirim ke PPK"</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pilih Pembayaran <span className="text-red-500">*</span></CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-input hover:bg-accent">
                    <input
                      type="radio"
                      name="pembayaran"
                      value="LS"
                      checked={pembayaran === 'LS'}
                      onChange={(e) => {
                        setPembayaran('LS' as const);
                        setNomorSPM('');
                      }}
                      className="w-4 h-4"
                    />
                    <span className="flex-1">
                      <span className="font-medium text-sm">Langsung (LS)</span>
                      <p className="text-xs text-muted-foreground">1 Pengajuan = 1 SPM</p>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-input hover:bg-accent">
                    <input
                      type="radio"
                      name="pembayaran"
                      value="UP"
                      checked={pembayaran === 'UP'}
                      onChange={(e) => {
                        setPembayaran('UP' as const);
                        setNomorSPM('');
                      }}
                      className="w-4 h-4"
                    />
                    <span className="flex-1">
                      <span className="font-medium text-sm">Uang Persediaan (UP)</span>
                      <p className="text-xs text-muted-foreground">Beberapa Pengajuan = 1 SPM</p>
                    </span>
                  </label>
                </div>

                {/* Nomor SPM field - only for LS */}
                {pembayaran === 'LS' && (
                  <div className="space-y-2 pt-2 border-t">
                    <label htmlFor="nomorSPM" className="text-sm font-medium">
                      Nomor SPM <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="nomorSPM"
                      type="text"
                      placeholder="Input nomor SPM (contoh: 00043A)"
                      value={nomorSPM}
                      onChange={(e) => setNomorSPM(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Wajib diisi sebelum submit</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </>
          )}

          {/* Identitas Pembayaran (Metode, SPM & SPPD) Display - Read Only */}
          {(submission.pembayaran || submission.nomorSPM || submission.nomorSPPD) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Identitas Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {submission.pembayaran && (
                  <div>
                    <p className="text-xs text-muted-foreground">Metode Pembayaran</p>
                    <p className="text-sm font-medium">
                      {submission.pembayaran === 'UP' ? 'Uang Persediaan (UP)' : 'Langsung (LS)'}
                    </p>
                  </div>
                )}
                {submission.nomorSPM && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nomor SPM</p>
                    <p className="text-sm font-medium">{submission.nomorSPM}</p>
                  </div>
                )}
                {submission.nomorSPPD && (
                  <div>
                    <p className="text-xs text-muted-foreground">Nomor SP2D</p>
                    <p className="text-sm font-medium">{submission.nomorSPPD}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                <CardContent className="pt-0 space-y-3">
                  <DocumentChecklist 
                    documents={documents} 
                    onToggle={canAction ? handleDocumentToggle : undefined}
                    readOnly={!canAction}
                  />
                  {canAction && (
                    <Button 
                      variant="outline" 
                      className="w-full text-xs"
                      onClick={saveChecklistOnly}
                      disabled={isUpdating}
                      size="sm"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3 mr-2" />
                      )}
                      Simpan Checklist
                    </Button>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {(submission.notes || canAction || canReturnArsip) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {userRole === 'Arsip' && (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') ? 'Catatan dan Identitas' : 'Catatan'}
                  {submission.status === 'sent_kppn' && <span className="text-red-500">*</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nomor SPPD field - Arsip only */}
                {userRole === 'Arsip' && (submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') && (
                  <div className="space-y-2">
                    <label htmlFor="nomorSPPD" className="text-sm font-medium">
                      Nomor SP2D <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="nomorSPPD"
                      type="text"
                      placeholder="Input nomor SP2D (contoh: 00043T)"
                      value={nomorSPPD}
                      onChange={(e) => setNomorSPPD(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Wajib diisi sebelum submit</p>
                  </div>
                )}

                {/* Notes field */}
                {(canAction || canReturnArsip) ? (
                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      Catatan {submission.status === 'sent_kppn' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      id="notes"
                      placeholder={submission.status === 'sent_kppn' ? "Catatan wajib diisi..." : "Tambahkan catatan..."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none"
                      rows={3}
                    />
                    {submission.status === 'sent_kppn' && !notes && (
                      <p className="text-xs text-red-500">Isi catatan dengan nomor SP2D dan SPM</p>
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
                {canReturnArsip ? 'Kembalikan ke PPSPM' : getRejectButtonLabel()}
              </Button>
              
              {/* For Bendahara with UP, show "Simpan SPBy" button instead */}
              {userRole === 'Bendahara' && pembayaran === 'UP' && (submission.status === 'pending_bendahara' || submission.status === 'incomplete_bendahara') ? (
                <Button 
                  className="flex-1"
                  onClick={handleSaveSPBy}
                  disabled={isUpdating || !pembayaran}
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Simpan SPBy
                </Button>
              ) : (
                <Button 
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={
                    (canAction && !allDocsComplete) || 
                    isUpdating || 
                    (submission.status === 'sent_kppn' && !notes) ||
                    (userRole === 'Bendahara' && !pembayaran) ||
                    (userRole === 'Bendahara' && pembayaran === 'LS' && !nomorSPM) ||
                    (userRole === 'Arsip' && !nomorSPPD)
                  }
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
              )}
            </div>
          )}
        </div>
      </SheetContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Aksi</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-primary hover:bg-primary/90">
              {confirmDialog.action === 'approve' ? 'Setujui' : 'Ya, Lanjutkan'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}