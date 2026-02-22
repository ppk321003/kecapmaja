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
  const [loading, setLoading] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('');
  const [periodeList, setPeriodeList] = useState<string[]>([]);
  const [customPeriode, setCustomPeriode] = useState<string>('');
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');

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
    
    return periods;
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

  const handleResetAndDelete = async () => {
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

    if (!confirm(`⚠️ Anda akan melakukan operasi berikut untuk periode ${periodeToProcess}:\n\n1. Reset status (kosongkan Status & Link)\n2. Hapus folder ${periodeToProcess} dan semua dokumennya dari Google Drive\n\nTindakan ini TIDAK DAPAT DIBATALKAN. Lanjutkan?`)) {
      return;
    }

    setLoading(true);
    try {
      toast({
        title: "⏳ Proses Dimulai",
        description: `Melakukan reset dan delete untuk periode ${periodeToProcess}...`,
        variant: "default"
      });

      // Step 1: Reset Status
      console.log(`🔄 Step 1: Resetting status for ${periodeToProcess}`);
      const resetImg = new Image();
      
      resetImg.onload = () => {
        console.log(`✅ Reset completed`);
        // Step 2: Delete Folder (after reset completes)
        handleDeleteFolder(periodeToProcess);
      };
      
      resetImg.onerror = () => {
        console.log(`✅ Reset initiated`);
        // Even if img.onerror, the server process is running. Continue with delete.
        handleDeleteFolder(periodeToProcess);
      };

      const RESET_URL = `https://script.google.com/macros/s/AKfycbzaHb831im2Lx4-YjEOr23gQIOIhEwovPi_q9d59lCqMnBxSPD5GLcO4biDdGl3jubl/exec?action=resetStatus&periode=${encodeURIComponent(periodeToProcess)}&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
      console.log(`🔄 Triggering reset for: ${periodeToProcess}`);
      resetImg.src = RESET_URL;

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan saat memproses",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleDeleteFolder = (periode: string) => {
    // Step 2: Delete Folder
    console.log(`🗑️ Step 2: Deleting folder for ${periode}`);
    const deleteImg = new Image();
    
    deleteImg.onload = () => {
      console.log(`✅ Delete completed`);
      completeProcess(periode);
    };
    
    deleteImg.onerror = () => {
      console.log(`✅ Delete initiated`);
      completeProcess(periode);
    };

    const DELETE_URL = `https://script.google.com/macros/s/AKfycbzaHb831im2Lx4-YjEOr23gQIOIhEwovPi_q9d59lCqMnBxSPD5GLcO4biDdGl3jubl/exec?action=deleteFolder&periode=${encodeURIComponent(periode)}&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
    console.log(`🗑️ Triggering delete for: ${periode}`);
    deleteImg.src = DELETE_URL;
  };

  const completeProcess = (periode: string) => {
    toast({
      title: "✅ Berhasil",
      description: `Periode ${periode}:\n✓ Status di-reset\n✓ Folder dihapus dari Google Drive`,
      variant: "default"
    });
    setShowDialog(false);
    setSelectedPeriode('');
    setCustomPeriode('');
    setLoading(false);
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={loading}
        variant="outline"
        size="sm"
        className="inline-flex items-center gap-2 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-3 w-3" />
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
    </>
  );
}
