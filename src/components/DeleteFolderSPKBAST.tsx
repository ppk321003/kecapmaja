import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DeleteFolderSPKBAST() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPeriode, setSelectedPeriode] = useState<string>('');
  const [periodeList, setPeriodeList] = useState<string[]>([]);

  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  if (!isPPK) {
    return null;
  }

  const handleOpenDelete = async () => {
    setLoading(true);
    try {
      const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxpEIe6scG_oOpvwgrxId06NmxjYYpmRRB04vawXS4/exec?action=getPeriodeList";
      
      const response = await fetch(APPS_SCRIPT_URL);
      const data = await response.json();

      if (data.success && data.periodeList) {
        setPeriodeList(data.periodeList);
        setShowDialog(true);
      } else {
        toast({
          title: "❌ Error",
          description: "Gagal mengambil daftar periode",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPeriode) {
      toast({
        title: "⚠️ Warning",
        description: "Pilih periode terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`⚠️ Anda akan menghapus SEMUA dokumen SPK & BAST di folder "${selectedPeriode}". Tindakan ini TIDAK DAPAT DIBATALKAN. Lanjutkan?`)) {
      return;
    }

    setLoading(true);
    try {
      // Trigger delete via image approach (bypass CORS)
      const img = new Image();
      img.onload = () => {
        toast({
          title: "✅ Berhasil",
          description: `Folder ${selectedPeriode} dan semua dokumennya telah dihapus dari Google Drive.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
      };
      img.onerror = () => {
        toast({
          title: "✅ Delete Dimulai",
          description: `Proses penghapusan folder ${selectedPeriode} sedang berjalan. Harap tunggu beberapa detik.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
      };

      const APPS_SCRIPT_URL = `https://script.google.com/macros/s/AKfycbxpEIe6scG_oOpvwgrxId06NmxjYYpmRRB04vawXS4/exec?action=deleteFolder&periode=${encodeURIComponent(selectedPeriode)}`;
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
        className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        {loading ? "Loading..." : "🗑️ Delete Folder"}
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
              <label className="text-sm font-medium mb-2 block">Pilih Periode</label>
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
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={!selectedPeriode || loading}
              variant="destructive"
            >
              {loading ? "Processing..." : "🗑️ Hapus Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
