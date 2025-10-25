import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink, Filter, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SPKData {
  no: number;
  periode: string;
  nilaiPerjanjian: number;
  nilaiRealisasi: number;
  persentaseRealisasi: number;
  link: string;
  tahun: number;
}

export default function DownloadSPKBAST() {
  const [data, setData] = useState<SPKData[]>([]);
  const [filteredData, setFilteredData] = useState<SPKData[]>([]);
  const [tahunList, setTahunList] = useState<number[]>([]);
  const [selectedTahun, setSelectedTahun] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const SPK_SPREADSHEET_ID = "1fmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc";
  const SHEET_NAME = "OUTPUT";

  // Fungsi untuk mengambil data dari Google Sheets
  const fetchDataFromSheets = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Mengambil data SPK & BAST dari Google Sheets...");

      const { data: sheetResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPK_SPREADSHEET_ID,
          operation: "read",
          range: SHEET_NAME,
        },
      });

      if (error) throw error;

      const rows = sheetResponse?.values || [];
      console.log("Total rows fetched from SPK sheet:", rows.length);

      if (rows.length === 0) {
        throw new Error('Tidak ada data ditemukan di spreadsheet');
      }

      // Skip header row (row 0) dan mulai dari row 1
      const parsedData: SPKData[] = rows.slice(1)
        .filter((row: any[]) => row && row.length >= 6) // Pastikan ada minimal 6 kolom
        .map((row: any[], index: number) => {
          try {
            // Parse data dari setiap kolom
            const no = parseInt(row[0]) || index + 1;
            const periode = row[1]?.toString()?.trim() || '';
            const nilaiPerjanjianStr = row[2]?.toString()?.trim() || '0';
            const nilaiRealisasiStr = row[3]?.toString()?.trim() || '0';
            const persentaseStr = row[4]?.toString()?.trim() || '0';
            const link = row[5]?.toString()?.trim() || '';

            // Parse nilai perjanjian - hapus "Rp", spasi, dan titik, lalu convert ke number
            const nilaiPerjanjian = parseFloat(
              nilaiPerjanjianStr
                .replace(/[^\d,]/g, '')
                .replace(',', '.')
            ) || 0;

            // Parse nilai realisasi - hapus "Rp", spasi, dan titik, lalu convert ke number
            const nilaiRealisasi = parseFloat(
              nilaiRealisasiStr
                .replace(/[^\d,]/g, '')
                .replace(',', '.')
            ) || 0;

            // Parse persentase - hapus "%" dan ganti koma dengan titik
            const persentaseRealisasi = parseFloat(
              persentaseStr
                .replace('%', '')
                .replace(',', '.')
            ) || 0;

            // Extract tahun dari periode (format: "Bulan Tahun")
            const tahunMatch = periode.match(/(\d{4})$/);
            const tahun = tahunMatch ? parseInt(tahunMatch[1]) : new Date().getFullYear();

            return {
              no,
              periode,
              nilaiPerjanjian,
              nilaiRealisasi,
              persentaseRealisasi,
              link,
              tahun
            };
          } catch (parseError) {
            console.error('Error parsing row:', row, parseError);
            return null;
          }
        })
        .filter((item): item is SPKData => item !== null); // Hapus null values

      console.log("Data berhasil diparsing:", parsedData.length, "items");

      setData(parsedData);
      setFilteredData(parsedData);
      
      // Extract unique years dari data
      const years = [...new Set(parsedData.map(item => item.tahun))].sort((a, b) => b - a);
      setTahunList(years);
      
      if (years.length > 0) {
        setSelectedTahun(years[0]); // Set tahun terbaru sebagai default
      }

      toast({
        title: "Berhasil",
        description: `Data berhasil dimuat (${parsedData.length} item)`,
        variant: "default",
      });

    } catch (err: any) {
      console.error('Error fetching SPK data:', err);
      const errorMessage = err.message || "Gagal memuat data dari Google Sheets";
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter data berdasarkan tahun yang dipilih
  useEffect(() => {
    if (selectedTahun === 'all') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item => item.tahun === selectedTahun);
      setFilteredData(filtered);
    }
  }, [selectedTahun, data]);

  // Load data saat komponen mount
  useEffect(() => {
    fetchDataFromSheets();
  }, []);

  // Fungsi untuk memformat angka ke format Rupiah
  const formatRupiah = (angka: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(angka);
  };

  // Format persentase dengan koma
  const formatPersentase = (angka: number): string => {
    return `${angka.toFixed(2).replace('.', ',')}%`;
  };

  // Hitung total berdasarkan data yang difilter
  const totalNilaiPerjanjian = filteredData.reduce((sum, item) => sum + item.nilaiPerjanjian, 0);
  const totalNilaiRealisasi = filteredData.reduce((sum, item) => sum + item.nilaiRealisasi, 0);
  const totalPersentaseRealisasi = totalNilaiPerjanjian > 0 
    ? (totalNilaiRealisasi / totalNilaiPerjanjian) * 100 
    : 0;

  // Hitung jumlah data yang ditampilkan
  const jumlahData = filteredData.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Download SPK & BAST</h1>
          <p className="text-muted-foreground mt-2">
            Unduh dokumen Surat Perjanjian Kerja dan Berita Acara Serah Terima
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Memuat data dari Google Sheets...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Download SPK & BAST</h1>
          <p className="text-muted-foreground mt-2">
            Unduh dokumen Surat Perjanjian Kerja dan Berita Acara Serah Terima
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={fetchDataFromSheets}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Download SPK & BAST</h1>
        <p className="text-muted-foreground mt-2">
          Unduh dokumen Surat Perjanjian Kerja dan Berita Acara Serah Terima
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              <CardTitle>Download Dokumen SPK & BAST</CardTitle>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter Tahun */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedTahun === 'all' ? 'all' : selectedTahun.toString()}
                  onValueChange={(value) => setSelectedTahun(value === 'all' ? 'all' : parseInt(value))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {tahunList.map((tahun) => (
                      <SelectItem key={tahun} value={tahun.toString()}>
                        {tahun}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Button */}
              <button 
                onClick={fetchDataFromSheets}
                className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          <CardDescription>
            Daftar dokumen SPK dan BAST yang tersedia untuk diunduh
            {selectedTahun !== 'all' && ` (Tahun ${selectedTahun})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
              <p className="text-muted-foreground">Tidak ada data yang ditemukan di spreadsheet</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Tidak ada data untuk tahun {selectedTahun}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        No
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Periode (Bulan) SPK
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Nilai Perjanjian Rp.
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Nilai Realisasi Rp.
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        % Realisasi
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Link
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr 
                        key={item.no} 
                        className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}
                      >
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                          {item.no}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                          {item.periode}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                          {formatRupiah(item.nilaiPerjanjian)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                          {formatRupiah(item.nilaiRealisasi)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                          <span className={`font-medium ${
                            item.persentaseRealisasi >= 90 ? 'text-green-600' : 
                            item.persentaseRealisasi >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {formatPersentase(item.persentaseRealisasi)}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Download
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Baris Total */}
                    <tr className="bg-blue-50 font-semibold">
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center" colSpan={2}>
                        TOTAL ({jumlahData} data)
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                        {formatRupiah(totalNilaiPerjanjian)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                        {formatRupiah(totalNilaiRealisasi)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                        <span className={`font-bold ${
                          totalPersentaseRealisasi >= 90 ? 'text-green-600' : 
                          totalPersentaseRealisasi >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPersentase(totalPersentaseRealisasi)}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        <span className="text-gray-400">-</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-blue-600 font-medium">Total Nilai Perjanjian</div>
                    <div className="text-2xl font-bold text-blue-700">{formatRupiah(totalNilaiPerjanjian)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-green-600 font-medium">Total Nilai Realisasi</div>
                    <div className="text-2xl font-bold text-green-700">{formatRupiah(totalNilaiRealisasi)}</div>
                  </CardContent>
                </Card>
                <Card className={`${
                  totalPersentaseRealisasi >= 90 ? 'bg-green-50 border-green-200' :
                  totalPersentaseRealisasi >= 80 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <CardContent className="p-4">
                    <div className={`text-sm font-medium ${
                      totalPersentaseRealisasi >= 90 ? 'text-green-600' :
                      totalPersentaseRealisasi >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      Rata-rata % Realisasi
                    </div>
                    <div className={`text-2xl font-bold ${
                      totalPersentaseRealisasi >= 90 ? 'text-green-700' :
                      totalPersentaseRealisasi >= 80 ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {formatPersentase(totalPersentaseRealisasi)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Informasi tambahan */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-700">
            <strong>Catatan:</strong> Data diambil langsung dari Google Sheets. 
            Pastikan koneksi internet tersedia untuk melihat data terbaru.
            {selectedTahun !== 'all' && ` Saat ini menampilkan data untuk tahun ${selectedTahun}.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}