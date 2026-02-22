import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetStatusSPKBAST() {
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

  const handleOpenReset = async () => {
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

  const handleReset = async () => {
    if (!selectedPeriode) {
      toast({
        title: "⚠️ Warning",
        description: "Pilih periode terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`⚠️ Anda akan menghapus status generate untuk periode ${selectedPeriode}. Pastikan Anda sudah backup folder di Google Drive. Lanjutkan?`)) {
      return;
    }

    setLoading(true);
    try {
      // Trigger reset via image approach (bypass CORS)
      const img = new Image();
      img.onload = () => {
        toast({
          title: "✅ Berhasil",
          description: `Status generate untuk ${selectedPeriode} telah di-reset. Kolom Keterangan, Status, dan Link dikosongkan.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
      };
      img.onerror = () => {
        toast({
          title: "✅ Reset Dimulai",
          description: `Proses reset untuk ${selectedPeriode} sedang berjalan. Harap tunggu beberapa detik.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
      };

      const APPS_SCRIPT_URL = `https://script.google.com/macros/s/AKfycbxpEIe6scG_oOpvwgrxId06NmxjYYpmRRB04vawXS4/exec?action=resetStatus&periode=${encodeURIComponent(selectedPeriode)}`;
      img.src = APPS_SCRIPT_URL;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan saat reset",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenReset}
        disabled={loading}
        variant="outline"
        className="inline-flex items-center gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        {loading ? "Loading..." : "🔄 Reset Status"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Status Generate</DialogTitle>
            <DialogDescription>
              Pilih periode yang ingin di-reset. Kolom Keterangan, Status, dan Link akan dikosongkan.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              ⚠️ Tindakan ini akan menghapus status generate untuk periode yang dipilih. Pastikan folder di Google Drive sudah di-backup sebelum lanjut.
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
              onClick={handleReset} 
              disabled={!selectedPeriode || loading}
              variant="destructive"
            >
              {loading ? "Processing..." : "🗑️ Reset Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
