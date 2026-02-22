import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PreviewData {
  periode: string;
  nama: string;
  nik: string;
  kegiatan: string;
  status: string;
  keterangan: string;
}

export default function PreviewSPKBAST() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);

  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  if (!isPPK) {
    return null;
  }

  const handlePreview = async () => {
    setLoading(true);
    try {
      const SPK_SPREADSHEET_ID = "1fmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc";
      
      // Gunakan Supabase function untuk read sheet
      const { data: sheetResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPK_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1!A:U"
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
      const namaIdx = headers.indexOf('Nama Petugas');
      const nikIdx = headers.indexOf('NIK');
      const kegiatanIdx = headers.indexOf('Nama Kegiatan');
      const statusIdx = headers.indexOf('Status');
      const keteranganIdx = headers.indexOf('Keterangan');

      const dataToProcess: PreviewData[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const status = row[statusIdx]?.toString().trim() || '';
        const keterangan = row[keteranganIdx]?.toString().trim() || '';

        if (status === 'Generated' || keterangan !== 'Kirim ke PPK') {
          continue;
        }

        dataToProcess.push({
          periode: row[periodeIdx]?.toString().trim() || '-',
          nama: row[namaIdx]?.toString().trim() || '-',
          nik: row[nikIdx]?.toString().trim() || '-',
          kegiatan: row[kegiatanIdx]?.toString().trim() || '-',
          status: status || '-',
          keterangan: keterangan || '-'
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
        className="inline-flex items-center gap-2"
      >
        <Eye className="h-4 w-4" />
        {loading ? "Loading..." : "👁️ Preview Data"}
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
                      <th className="px-4 py-2 text-left font-semibold">No</th>
                      <th className="px-4 py-2 text-left font-semibold">Periode</th>
                      <th className="px-4 py-2 text-left font-semibold">Nama Petugas</th>
                      <th className="px-4 py-2 text-left font-semibold">NIK</th>
                      <th className="px-4 py-2 text-left font-semibold">Kegiatan</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((item, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-center">{idx + 1}</td>
                        <td className="px-4 py-2">{item.periode}</td>
                        <td className="px-4 py-2">
                          <span className={!item.nama || item.nama === '-' ? 'text-red-600 font-semibold' : ''}>
                            {item.nama}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={!item.nik || item.nik === '-' ? 'text-red-600 font-semibold' : ''}>
                            {item.nik || '⚠️ Kosong'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs">{item.kegiatan}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  ⚠️ Data berwarna merah = ada yang kosong atau tidak lengkap. Pastikan semuanya terisi sebelum lanjut generate.
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
