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

export default function DeleteFolderSPKBAST() {
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

  const handleOpenDelete = () => {
    console.log('🗑️ Opening Delete dialog...');
    setShowDialog(true);
    setSelectedPeriode('');
    setCustomPeriode('');
  };

  const handleDelete = async () => {
    // Use either selected period or custom period
    const periodeToDelete = selectedPeriode || customPeriode;

    if (!periodeToDelete) {
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

    if (!confirm(`⚠️ Anda akan menghapus SEMUA dokumen SPK & BAST di folder "${periodeToDelete}". Tindakan ini TIDAK DAPAT DIBATALKAN. Lanjutkan?`)) {
      return;
    }

    setLoading(true);
    try {
      // Trigger delete via image approach (bypass CORS)
      const img = new Image();
      img.onload = () => {
        console.log(`✅ Delete completed for ${periodeToDelete}`);
        toast({
          title: "✅ Berhasil",
          description: `Folder ${periodeToDelete} dan semua dokumennya telah dihapus dari Google Drive.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
        setCustomPeriode('');
      };
      img.onerror = () => {
        console.log(`✅ Delete dimulai untuk ${periodeToDelete}`);
        toast({
          title: "✅ Delete Dimulai",
          description: `Proses penghapusan folder ${periodeToDelete} sedang berjalan. Harap tunggu beberapa detik.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
        setCustomPeriode('');
      };

      const APPS_SCRIPT_URL = `https://script.google.com/macros/s/AKfycbyzO_5I9H_KlvaUjmX7aCcFH5ffNj01LbMW8deRABZef9WQpNBlh3VU54qkzW9d7zHc/exec?action=deleteFolder&periode=${encodeURIComponent(periodeToDelete)}&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;
      console.log(`🗑️ Triggering delete for: ${periodeToDelete}`);
      console.log(`   URL: ${APPS_SCRIPT_URL}`);
      img.src = APPS_SCRIPT_URL;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan saat menghapus folder",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenDelete}
        disabled={loading}
        variant="outline"
        size="sm"
        className="inline-flex items-center gap-2 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-3 w-3" />
        {loading ? "Loading..." : "Delete"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Folder Hasil Generate</DialogTitle>
            <DialogDescription>
              Pilih periode yang ingin dihapus dari Google Drive. Teknologi ini TIDAK DAPAT DIBATALKAN.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              🗑️ HATI-HATI: Tindakan ini akan menghapus SEMUA dokumen SPK & BAST di folder periode yang dipilih. Tidak ada backup, tidak dapat di-undo!
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Pilih Periode Dari List</label>
              <Select value={selectedPeriode} onValueChange={(value) => {
                setSelectedPeriode(value);
                setCustomPeriode('');
              }}>
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">atau</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Atau Masukkan Periode Custom</label>
              <Input
                placeholder="Contoh: Januari 2024"
                value={customPeriode}
                onChange={(e) => {
                  setCustomPeriode(e.target.value);
                  setSelectedPeriode('');
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Gunakan format: "Bulan Tahun" (contoh: "Februari 2024")</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={(!selectedPeriode && !customPeriode) || loading}
              variant="destructive"
            >
              {loading ? "Processing..." : "🗑️ Delete Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
