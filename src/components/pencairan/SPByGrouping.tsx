import { useState } from 'react';
import { Submission } from '@/types/pencairan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Edit2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface SPByGroupingProps {
  upSubmissions: Submission[];
  onUpdateSubmissions: (ids: string[], updates: Partial<Submission>) => void;
  onRefresh: () => void;
}

export function SPByGrouping({
  upSubmissions,
  onUpdateSubmissions,
  onRefresh,
}: SPByGroupingProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nomorSPM, setNomorSPM] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [changePaymentDialog, setChangePaymentDialog] = useState<{ open: boolean; submissionId: string | null }>({ open: false, submissionId: null });
  const [changePaymentType, setChangePaymentType] = useState<'UP' | 'LS'>('UP');
  const [changePaymentSPM, setChangePaymentSPM] = useState('');
  const [isChangingPayment, setIsChangingPayment] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(upSubmissions.map(sub => sub.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const handleOpenConfirmDialog = () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Validasi gagal',
        description: 'Pilih minimal 1 pengajuan',
        variant: 'destructive',
      });
      return;
    }

    if (!nomorSPM.trim()) {
      toast({
        title: 'Validasi gagal',
        description: 'Nomor SPM wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmProcess = async () => {
    setShowConfirmDialog(false);
    setIsProcessing(true);
    try {
      // Update all selected submissions: assign SPM and change status to pending_ppk in ONE call
      const results = await Promise.all(
        selectedIds.map(submissionId =>
          supabase.functions.invoke('pencairan-update', {
            body: {
              id: submissionId,
              nomorSPM: nomorSPM.trim(),
              actor: 'bendahara',
              action: 'approve', // This will assign SPM and change status to pending_ppk
            },
          })
        )
      );

      console.log('[SPByGrouping] Process results:', results);

      // Check if any updates failed
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('[SPByGrouping] Errors from backend:', errors);
        throw new Error(`${errors.length} pengajuan gagal diproses`);
      }

      toast({
        title: 'Berhasil',
        description: `${selectedIds.length} pengajuan berhasil dikelompokkan dengan SPM ${nomorSPM} dan dikirim ke PPK`,
      });

      // Update local state
      onUpdateSubmissions(selectedIds, {
        status: 'pending_ppk',
        nomorSPM: nomorSPM.trim(),
        pembayaran: 'UP',
      });

      // Reset form
      setSelectedIds([]);
      setNomorSPM('');
      
      // Refresh from server
      onRefresh();
    } catch (err) {
      console.error('Error processing submissions:', err);
      toast({
        title: 'Gagal memproses',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChangePaymentDialog = (submissionId: string) => {
    const submission = upSubmissions.find(s => s.id === submissionId);
    if (submission) {
      setChangePaymentDialog({ open: true, submissionId });
      setChangePaymentType((submission.pembayaran as 'UP' | 'LS') || 'UP');
      setChangePaymentSPM(submission.nomorSPM || '');
    }
  };

  const handleChangePayment = async () => {
    if (!changePaymentDialog.submissionId) return;

    // Validasi
    if (changePaymentType === 'LS' && !changePaymentSPM.trim()) {
      toast({
        title: 'Validasi gagal',
        description: 'Nomor SPM wajib diisi untuk pembayaran Langsung (LS)',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('pencairan-update', {
        body: {
          id: changePaymentDialog.submissionId,
          pembayaran: changePaymentType,
          nomorSPM: changePaymentType === 'LS' ? changePaymentSPM.trim() : '',
          actor: 'bendahara',
          action: 'save_spby',
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Berhasil',
          description: `Metode pembayaran diubah ke ${changePaymentType === 'UP' ? 'Uang Persediaan (UP)' : 'Langsung (LS)'}`,
        });
        setChangePaymentDialog({ open: false, submissionId: null });
        setChangePaymentType('UP');
        setChangePaymentSPM('');
        onRefresh();
      } else {
        throw new Error(data?.error || 'Gagal mengubah metode pembayaran');
      }
    } catch (err) {
      console.error('Error changing payment:', err);
      toast({
        title: 'Gagal mengubah metode pembayaran',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Grouping Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Kelompokkan Pengajuan UP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Pilih pengajuan UP yang akan dikelompokkan dalam satu SPM, kemudian input nomor SPM untuk mengelompokkannya.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Pilih Pengajuan</label>
            <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
              {upSubmissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada pengajuan UP</p>
              ) : (
                <>
                  <label className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedIds.length === upSubmissions.length && upSubmissions.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <span className="text-sm font-semibold">Pilih Semua ({upSubmissions.length})</span>
                  </label>
                  <div className="border-t pt-2"></div>
                  {upSubmissions.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                      <Checkbox
                        checked={selectedIds.includes(sub.id)}
                        onCheckedChange={(checked) => handleSelectOne(sub.id, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sub.title}</p>
                        <p className="text-xs text-muted-foreground">{sub.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.submitterName} • {format(sub.submittedAt, 'd MMMM yyyy', { locale: idLocale })}
                        </p>
                      </div>
                      {sub.nomorSPM && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          SPM: {sub.nomorSPM}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChangePaymentDialog(sub.id)}
                        className="flex-shrink-0"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Ubah
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-medium">Nomor SPM</label>
              <input
                type="text"
                placeholder="Input nomor SPM (misal: SPM-001/2025)"
                value={nomorSPM}
                onChange={(e) => setNomorSPM(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Nomor ini akan disimpan untuk {selectedIds.length} pengajuan yang dipilih dan langsung dikirim ke PPK
              </p>
              
              {/* Unified Button - Group & Send */}
              <Button
                onClick={handleOpenConfirmDialog}
                disabled={isProcessing || selectedIds.length === 0 || !nomorSPM.trim()}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Kelompokkan & Kirim ke PPK ({selectedIds.length})
              </Button>
            </div>
          )}

          {/* Confirmation Dialog */}
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Pengajuan</AlertDialogTitle>
                <AlertDialogDescription>
                  Anda akan mengelompokkan <strong>{selectedIds.length} pengajuan</strong> dengan <strong>SPM {nomorSPM}</strong> dan langsung mengirimnya ke PPK.
                  <br />
                  <br />
                  Status akan otomatis berubah dari <strong>pending_bendahara</strong> menjadi <strong>pending_ppk</strong>.
                  <br />
                  Proses ini tidak dapat dibatalkan setelah dikonfirmasi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogAction onClick={handleConfirmProcess}>
                Ya, Lanjutkan
              </AlertDialogAction>
              <AlertDialogCancel>Batal</AlertDialogCancel>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Change Payment Dialog */}
      <Dialog open={changePaymentDialog.open} onOpenChange={(open) => setChangePaymentDialog({ ...changePaymentDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Metode Pembayaran</DialogTitle>
            <DialogDescription>
              Pilih metode pembayaran (UP atau LS) untuk pengajuan ini
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment-method"
                  value="UP"
                  checked={changePaymentType === 'UP'}
                  onChange={() => {
                    setChangePaymentType('UP');
                    setChangePaymentSPM('');
                  }}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium">Uang Persediaan (UP)</p>
                  <p className="text-xs text-muted-foreground">Tidak memerlukan nomor SPM</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment-method"
                  value="LS"
                  checked={changePaymentType === 'LS'}
                  onChange={() => setChangePaymentType('LS')}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium">Langsung (LS)</p>
                  <p className="text-xs text-muted-foreground">Memerlukan nomor SPM</p>
                </div>
              </label>
            </div>

            {changePaymentType === 'LS' && (
              <div className="space-y-2">
                <label htmlFor="change-spm" className="text-sm font-medium">
                  Nomor SPM <span className="text-red-500">*</span>
                </label>
                <input
                  id="change-spm"
                  type="text"
                  placeholder="Contoh: SPM-001/2025"
                  value={changePaymentSPM}
                  onChange={(e) => setChangePaymentSPM(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangePaymentDialog({ open: false, submissionId: null })}
              disabled={isChangingPayment}
            >
              Batal
            </Button>
            <Button
              onClick={handleChangePayment}
              disabled={isChangingPayment || (changePaymentType === 'LS' && !changePaymentSPM.trim())}
            >
              {isChangingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {upSubmissions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Tidak ada pengajuan dengan tipe pembayaran Uang Persediaan (UP)</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
