import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PreviewData {
  no: number;
  periode: string;
  role: string;
  jenisPekerjaan: string;
  pembebanan: string;
  namaKegiatan: string;
}

export default function PreviewSPKBAST() {
  const { user } = useAuth();
  const { toast } = useToast();
  const satkerConfig = useSatkerConfigContext();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
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
        console.log('📊 Preview - Spreadsheet ID dari config:', id.substring(0, 20) + '...');
      }
    }
  }, [satkerConfig]);

  const handlePreview = async () => {
    if (!spreadsheetId) {
      toast({
        title: "❌ Error",
        description: "Spreadsheet ID tidak ditemukan. Pastikan config satker sudah benar.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      
      // Gunakan Supabase function untuk read sheet dengan dynamic spreadsheet ID
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
        return;
      }

      const rows = sheetResponse?.values || [];
      if (rows.length <= 1) {
        toast({
          title: "ℹ️ Info",
          description: "Tidak ada data untuk di-generate",
          variant: "default"
        });
        return;
      }

      const headers = rows[0];
      const periodeIdx = headers.indexOf('Periode (Bulan) SPK');
      const roleIdx = headers.indexOf('Role');
      const jenisPekerjaanIdx = headers.indexOf('Jenis Pekerjaan');
      const pemberaanIdx = headers.indexOf('Beban Anggaran');
      const kegiatanIdx = headers.indexOf('Nama Kegiatan');
      const statusIdx = headers.indexOf('Status');
      const keteranganIdx = headers.indexOf('Keterangan');

      const dataToProcess: PreviewData[] = [];
      let rowCounter = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const status = row[statusIdx]?.toString().trim() || '';
        const keterangan = row[keteranganIdx]?.toString().trim() || '';

        if (status === 'Generated' || keterangan !== 'Kirim ke PPK') {
          continue;
        }

        rowCounter++;
        dataToProcess.push({
          no: rowCounter,
          periode: row[periodeIdx]?.toString().trim() || '-',
          role: row[roleIdx]?.toString().trim() || '-',
          jenisPekerjaan: row[jenisPekerjaanIdx]?.toString().trim() || '-',
          pembebanan: row[pemberaanIdx]?.toString().trim() || '-',
          namaKegiatan: row[kegiatanIdx]?.toString().trim() || '-'
        });
      }

      setPreviewData(dataToProcess);
      setShowDialog(true);

      if (dataToProcess.length === 0) {
        toast({
          title: "ℹ️ Info",
          description: "Tidak ada data yang memenuhi kriteria untuk di-generate",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan saat preview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handlePreview}
        disabled={loading}
        variant="outline"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
      >
        <Eye className="h-4 w-4" />
        {loading ? "Loading..." : "Preview"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview Data SPK & BAST</DialogTitle>
            <DialogDescription>
              {previewData.length > 0 
                ? `${previewData.length} data siap untuk di-generate` 
                : 'Tidak ada data yang memenuhi kriteria'}
            </DialogDescription>
          </DialogHeader>

          {previewData.length > 0 ? (
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Periksa data di bawah sebelum generate. Jika ada yang salah, edit di spreadsheet dan preview ulang.
                </AlertDescription>
              </Alert>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-center font-semibold">No</th>
                      <th className="px-4 py-2 text-left font-semibold">Periode</th>
                      <th className="px-4 py-2 text-left font-semibold">Role</th>
                      <th className="px-4 py-2 text-left font-semibold">Jenis Pekerjaan</th>
                      <th className="px-4 py-2 text-left font-semibold">Beban Anggaran</th>
                      <th className="px-4 py-2 text-left font-semibold">Nama Kegiatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-center font-medium">{item.no}</td>
                        <td className="px-4 py-2">{item.periode}</td>
                        <td className="px-4 py-2">
                          <span className={item.role === '-' ? 'text-red-600 font-semibold' : ''}>
                            {item.role}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={item.jenisPekerjaan === '-' ? 'text-red-600 font-semibold' : ''}>
                            {item.jenisPekerjaan}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={item.pembebanan === '-' ? 'text-red-600 font-semibold' : ''}>
                            {item.pembebanan}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">{item.namaKegiatan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  ⚠️ Kolom berwarna merah = ada yang kosong. Pastikan Role, Jenis Pekerjaan, dan Beban Anggaran terisi sebelum lanjut generate.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Tidak ada data yang memenuhi kriteria untuk di-generate</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
