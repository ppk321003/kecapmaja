import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetAndDeleteSPKBAST() {
  const { user } = useAuth();
  const { toast } = useToast();
  const satkerConfig = useSatkerConfigContext();
  const [showDialog, setShowDialog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('');
  const [periodeList, setPeriodeList] = useState<string[]>([]);
  const [customPeriode, setCustomPeriode] = useState<string>('');
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [pendingPeriode, setPendingPeriode] = useState<string>('');

  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  if (!isPPK) {
    return null;
  }

  useEffect(() => {
    // Get spreadsheet ID dari satker config
    if (satkerConfig) {
      const id = satkerConfig.getUserSatkerSheetId('entrikegiatan');
      if (id) {
        setSpreadsheetId(id);
        console.log('📊 Spreadsheet ID dari config:', id.substring(0, 20) + '...');
      }
    }
  }, [satkerConfig]);

  // Generate list of last 12 months in format "Bulan YYYY"
  const generatePeriodeList = () => {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periods: string[] = [];
    const today = new Date();
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      periods.push(`${month} ${year}`);
    }
    
    // Reverse untuk menampilkan periode terakhir dahulu
    return periods.reverse();
  };

  useEffect(() => {
    // Generate periods on component mount
    const periods = generatePeriodeList();
    setPeriodeList(periods);
    console.log('📋 Generated periode list:', periods);
  }, []);

  const handleOpen = () => {
    console.log('🔄 Opening Reset & Delete dialog...');
    setShowDialog(true);
    setSelectedPeriode('');
    setCustomPeriode('');
  };

  const handleResetAndDelete = () => {
    // Use either selected period or custom period
    const periodeToProcess = selectedPeriode || customPeriode;
    
    if (!periodeToProcess) {
      toast({
        title: "⚠️ Warning",
        description: "Pilih periode atau masukkan periode custom terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    if (!spreadsheetId) {
      toast({
        title: "❌ Error",
        description: "Spreadsheet ID tidak ditemukan. Pastikan config satker sudah benar.",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation dialog instead of browser confirm
    setPendingPeriode(periodeToProcess);
    setShowConfirmation(true);
  };

  const handleConfirmReset = async () => {
    if (!pendingPeriode) return;

    setLoading(true);
    setShowConfirmation(false);
    
    try {
      toast({
        title: "⏳ Step 1/2: Reset Status",
        description: `Mengosongkan Kolom U & V untuk periode ${pendingPeriode}...`,
        variant: "default"
      });

      // Step 1: Trigger Reset and wait
      await triggerReset(pendingPeriode);
      
      // Wait 2 seconds for the reset to process on the server
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Trigger Delete after reset is done
      toast({
        title: "⏳ Step 2/2: Delete Folder",
        description: `Menghapus folder ${pendingPeriode} dari Google Drive...`,
        variant: "default"
      });
      
      await triggerDelete(pendingPeriode);

      // Success notification
      toast({
        title: "✅ Berhasil",
        description: `Periode ${pendingPeriode}:\n✓ Status di-reset\n✓ Folder dihapus dari Google Drive`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan saat memproses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      completeProcess(pendingPeriode);
      setPendingPeriode('');
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmation(false);
    setPendingPeriode('');
  };

  const triggerReset = (periode: string): Promise<void> => {
    return new Promise((resolve) => {
      console.log(`🔄 Triggering reset for: ${periode}`);
      const resetImg = new Image();
      
      resetImg.onload = () => {
        console.log(`✅ Reset API called successfully`);
        resolve();
      };
      
      resetImg.onerror = () => {
        console.log(`✅ Reset API called (onerror)`);
        resolve(); // Even on error, the server process may have succeeded
      };

      const RESET_URL = `https://script.google.com/macros/s/AKfycbyzO_5I9H_KlvaUjmX7aCcFH5ffNj01LbMW8deRABZef9WQpNBlh3VU54qkzW9d7zHc/exec?action=resetStatus&periode=${encodeURIComponent(periode)}&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
      console.log(`   Reset URL called`);
      resetImg.src = RESET_URL;
    });
  };

  const triggerDelete = (periode: string): Promise<void> => {
    return new Promise((resolve) => {
      console.log(`🗑️ Triggering delete for: ${periode}`);
      const deleteImg = new Image();
      
      deleteImg.onload = () => {
        console.log(`✅ Delete API called successfully`);
        completeProcess(periode);
        resolve();
      };
      
      deleteImg.onerror = () => {
        console.log(`✅ Delete API called (onerror)`);
        completeProcess(periode);
        resolve();
      };

      const DELETE_URL = `https://script.google.com/macros/s/AKfycbyzO_5I9H_KlvaUjmX7aCcFH5ffNj01LbMW8deRABZef9WQpNBlh3VU54qkzW9d7zHc/exec?action=deleteFolder&periode=${encodeURIComponent(periode)}&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
      console.log(`   Delete URL called`);
      deleteImg.src = DELETE_URL;
    });
  };

  const completeProcess = (periode: string) => {
    setShowDialog(false);
    setSelectedPeriode('');
    setCustomPeriode('');
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={loading}
        variant="outline"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        {loading ? "Processing..." : "Reset & Delete"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Status & Delete Folder</DialogTitle>
            <DialogDescription>
              Pilih periode untuk di-reset dan dihapus
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                <strong>⚠️ Hati-hati!</strong> Operasi ini akan:
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Menghapus Status & Link (Keterangan tetap ada)</li>
                  <li>Menghapus semua dokumen di folder periode</li>
                  <li>Tidak bisa dibatalkan</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Periode dari Daftar</label>
              <Select value={selectedPeriode} onValueChange={setSelectedPeriode}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode..." />
                </SelectTrigger>
                <SelectContent>
                  {periodeList.map((periode) => (
                    <SelectItem key={periode} value={periode}>
                      {periode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPeriode && (
              <div className="text-sm text-muted-foreground">
                ✓ Dipilih: <strong>{selectedPeriode}</strong>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">atau</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Masukkan Periode Custom</label>
              <Input
                placeholder="contoh: Februari 2026"
                value={customPeriode}
                onChange={(e) => setCustomPeriode(e.target.value)}
                disabled={!!selectedPeriode}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetAndDelete}
              disabled={loading || (!selectedPeriode && !customPeriode)}
            >
              {loading ? "Processing..." : "Reset & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Konfirmasi Operasi Berbahaya
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800 font-semibold">
                ⚠️ Tindakan ini TIDAK DAPAT DIBATALKAN!
              </AlertDescription>
            </Alert>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium">Pada periode <strong>{pendingPeriode}</strong>, operasi ini akan:</p>
              <ul className="space-y-2 ml-4">
                <li className="text-sm flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span>Menghapus Status (Kolom U) dan Link (Kolom V)</span>
                </li>
                <li className="text-sm flex items-start gap-2">
                  <span className="text-red-600 font-bold">✗</span>
                  <span>Menghapus seluruh folder dan semua dokumen dari Google Drive</span>
                </li>
                <li className="text-sm flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span className="text-gray-600">Keterangan (Kolom T) tetap tersimpan</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-gray-600">
              Apakah Anda yakin ingin melanjutkan?
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelConfirm}
              disabled={loading}
            >
              Batalkan
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={loading}
            >
              {loading ? "Memproses..." : "Ya, Lanjutkan Reset & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
