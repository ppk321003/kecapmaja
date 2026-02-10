import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useHonorData } from '@/hooks/use-honor-data';
import { generateHonorExcel } from '@/utils/honor-excel-generator';

const currentYear = new Date().getFullYear();
const tahunOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function DownloadRekapHonor() {
  const { user } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  const { fetchHonorData } = useHonorData();
  const { toast } = useToast();

  const [showDialog, setShowDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [loading, setLoading] = useState(false);

  // Check if user is PPK and has access to current satker
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  
  // Check if user has valid satker configuration
  const hasValidSatkerConfig = satkerConfig?.configs.some(
    c => c.satker_id === user?.satker && c.entrikegiatan_sheet_id
  );

  const isVisible = isPPK && hasValidSatkerConfig;

  if (!isVisible) {
    return null;
  }

  const handleDownload = async () => {
    try {
      setLoading(true);

      const tahun = parseInt(selectedYear);

      // Fetch data
      const result = await fetchHonorData(tahun);

      if (!result) {
        toast({
          title: 'Error',
          description: 'Gagal mengambil data honor',
          variant: 'destructive'
        });
        return;
      }

      if (result.rows.length === 0) {
        toast({
          title: 'Info',
          description: `Tidak ada data honor untuk tahun ${tahun}`,
          variant: 'default'
        });
        return;
      }

      // Generate Excel file
      const filename = generateHonorExcel({
        rows: result.rows,
        satkerName: result.satkerName,
        tahun: result.tahun
      });

      toast({
        title: 'Sukses',
        description: `File ${filename} berhasil diunduh`,
        variant: 'default'
      });

      setShowDialog(false);
    } catch (error: any) {
      console.error('Error downloading honor recap:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Terjadi kesalahan saat mengunduh file',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <FileDown className="h-4 w-4" />
        Download Rekap Honor per Tahun
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Download Rekap Honor Output Kegiatan</DialogTitle>
            <DialogDescription>
              Pilih tahun untuk mengunduh rekap honor. File akan berisi data honor untuk semua kegiatan pada tahun yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Data yang ditampilkan adalah honor untuk satker <strong>{user?.satker}</strong> tahun yang dipilih.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label htmlFor="tahun" className="text-sm font-medium">
                Pilih Tahun
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="tahun">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {tahunOptions.map(tahun => (
                    <SelectItem key={tahun} value={tahun.toString()}>
                      {tahun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Memproses...' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
