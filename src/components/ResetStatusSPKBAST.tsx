import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  const [customPeriode, setCustomPeriode] = useState<string>('');

  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  if (!isPPK) {
    return null;
  }

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

  const handleOpenReset = () => {
    console.log('🔄 Opening Reset dialog...');
    setShowDialog(true);
    setSelectedPeriode('');
    setCustomPeriode('');
  };

  const handleReset = async () => {
    // Use either selected period or custom period
    const periodeToReset = selectedPeriode || customPeriode;
    
    if (!periodeToReset) {
      toast({
        title: "⚠️ Warning",
        description: "Pilih periode atau masukkan periode custom terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`⚠️ Anda akan menghapus status generate untuk periode ${periodeToReset}. Pastikan Anda sudah backup folder di Google Drive. Lanjutkan?`)) {
      return;
    }

    setLoading(true);
    try {
      // Trigger reset via image approach (bypass CORS)
      const img = new Image();
      img.onload = () => {
        console.log(`✅ Reset completed for ${periodeToReset}`);
        toast({
          title: "✅ Berhasil",
          description: `Status generate untuk ${periodeToReset} telah di-reset. Kolom Keterangan, Status, dan Link dikosongkan.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
        setCustomPeriode('');
      };
      img.onerror = () => {
        console.log(`✅ Reset dimulai untuk ${periodeToReset}`);
        toast({
          title: "✅ Reset Dimulai",
          description: `Proses reset untuk ${periodeToReset} sedang berjalan. Harap tunggu beberapa detik.`,
          variant: "default"
        });
        setShowDialog(false);
        setSelectedPeriode('');
        setCustomPeriode('');
      };

      const APPS_SCRIPT_URL = `https://script.google.com/macros/s/AKfycbytFwj0PO3-rmIqX9l_pBRlL_XzLWmyJ29dtd9ATmoOx3220aqWfEF89FiWupxMu8Qb/exec?action=resetStatus&periode=${encodeURIComponent(periodeToReset)}`;
      console.log(`🔄 Triggering reset for: ${periodeToReset}`);
      console.log(`   URL: ${APPS_SCRIPT_URL}`);
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
        size="sm"
        className="inline-flex items-center gap-2 h-8 text-xs"
      >
        <RotateCcw className="h-3 w-3" />
        {loading ? "Loading..." : "Reset"}
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
              onClick={handleReset} 
              disabled={(!selectedPeriode && !customPeriode) || loading}
              variant="destructive"
            >
              {loading ? "Processing..." : "🔄 Reset Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
