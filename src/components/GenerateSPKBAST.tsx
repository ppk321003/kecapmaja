import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Zap, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GenerateSPKBAST() {
  const { user } = useAuth();
  const { toast } = useToast();
  const satkerConfig = useSatkerConfigContext();
  const [isLoading, setIsLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [periodeList, setPeriodeList] = useState<Array<{ periode: string; count: number }>>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Only show for Pejabat Pembuat Komitmen
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  if (!isPPK) {
    return null;
  }

  useEffect(() => {
    // Get spreadsheet ID dan output folder ID dari satker config
    if (satkerConfig) {
      const id = satkerConfig.getUserSatkerSheetId('entrikegiatan');
      const outputFolderId = satkerConfig.getUserSatkerSheetId('spkoutput');
      if (id) {
        setSpreadsheetId(id);
        console.log('📊 Spreadsheet ID dari config:', id.substring(0, 20) + '...');
      }
      if (outputFolderId) {
        setFolderId(outputFolderId);
        console.log('📊 Output folder ID dari config:', outputFolderId.substring(0, 20) + '...');
      }
    }
  }, [satkerConfig]);

  const handleGenerate = async () => {
    if (!spreadsheetId) {
      toast({
        title: "❌ Error",
        description: "Spreadsheet ID tidak ditemukan. Pastikan config satker sudah benar.",
        variant: "destructive"
      });
      return;
    }

    // Fetch preview data untuk confirmation
    setLoadingPreview(true);
    try {
      const { data: sheetResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: spreadsheetId,
          operation: "read",
          range: "Sheet1!A:Z"
        }
      });

      if (error) {
        toast({
          title: "❌ Error",
          description: "Gagal membaca data dari spreadsheet",
          variant: "destructive"
        });
        setLoadingPreview(false);
        return;
      }

      const rows = sheetResponse?.values || [];
      if (rows.length <= 1) {
        toast({
          title: "ℹ️ Info",
          description: "Tidak ada data untuk di-generate",
          variant: "default"
        });
        setLoadingPreview(false);
        return;
      }

      const headers = rows[0];
      const periodeIdx = headers.indexOf('Periode (Bulan) SPK');
      const statusIdx = headers.indexOf('Status');
      const keteranganIdx = headers.indexOf('Keterangan');

      // Group data by periode with "Kirim ke PPK" status
      const periodeMap = new Map<string, number>();
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const status = row[statusIdx]?.toString().trim() || '';
        const keterangan = row[keteranganIdx]?.toString().trim() || '';

        if (status !== 'Generated' && keterangan === 'Kirim ke PPK') {
          const periode = row[periodeIdx]?.toString().trim() || '-';
          periodeMap.set(periode, (periodeMap.get(periode) || 0) + 1);
        }
      }

      if (periodeMap.size === 0) {
        toast({
          title: "ℹ️ Info",
          description: "Tidak ada data dengan status 'Kirim ke PPK' untuk di-generate",
          variant: "default"
        });
        setLoadingPreview(false);
        return;
      }

      // Convert to array and sort by periode (reverse)
      const periodeArray = Array.from(periodeMap.entries())
        .map(([periode, count]) => ({ periode, count }))
        .sort((a, b) => b.periode.localeCompare(a.periode));

      setPeriodeList(periodeArray);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan saat memproses",
        variant: "destructive"
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmGenerate = async () => {
    setIsLoading(true);
    setShowConfirmation(false);
    
    try {
      // Call Supabase Edge Function to trigger Apps Script
      const templateSpkId = satkerConfig?.getUserSatkerConfig()?.template_spk_id;
      const body: Record<string, string> = {
        spreadsheetId: spreadsheetId,
        folderId: folderId
      };
      if (templateSpkId) {
        body.templateSpkId = templateSpkId;
      }

      const { data, error } = await supabase.functions.invoke("generate-spk-bast", {
        body
      });

      if (error) {
        console.error('Error from Supabase function:', error);
        toast({
          title: "⚠️ Warning",
          description: "Tidak dapat menghubungi server. Proses mungkin tetap berjalan di background. Cek Google Drive Anda dalam 5-10 menit.",
          variant: "default"
        });
        setIsLoading(false);
        return;
      }

      console.log('✅ Generation triggered via Supabase:', data);
      
      // Tampilkan success message
      toast({
        title: "✅ Generating Started",
        description: "Proses generation SPK & BAST dimulai. Harap tunggu beberapa menit dan cek Google Drive Anda untuk hasil dokumen di folder periode.",
        variant: "default"
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error calling generation:', error);
      
      // Still show a success message as the process might have started
      toast({
        title: "✅ Request Sent",
        description: "Proses generation telah dikirim. Cek Google Drive Anda dalam 5-10 menit untuk hasil dokumen.",
        variant: "default"
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleGenerate}
        disabled={isLoading || loadingPreview}
        variant="default"
        className="bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
      >
        <Zap className="h-4 w-4" />
        {isLoading ? "Generating..." : loadingPreview ? "Loading..." : "Generate"}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Zap className="h-5 w-5" />
              Konfirmasi Generate SPK & BAST
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800 font-semibold">
                ✓ Data siap untuk di-generate
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm font-medium">Periode dan jumlah data yang akan di-generate:</p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {periodeList.map((item) => (
                  <div key={item.periode} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">{item.periode}</span>
                    <span className="bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full text-xs">
                      {item.count} data
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600">
                Total: <strong>{periodeList.reduce((sum, item) => sum + item.count, 0)} dokumen</strong> akan dibuat
              </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-sm">
                <strong>ℹ️ Catatan:</strong> Proses generation memakan waktu beberapa menit tergantung jumlah data. Harap jangan keluar aplikasi sampai selesai. Cek Google Drive Anda dalam 5-10 menit.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirmGenerate}
              disabled={isLoading}
            >
              {isLoading ? "Generating..." : "Ya, Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
