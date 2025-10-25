import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

interface SPKData {
  no: number;
  periode: string;
  nilaiPerjanjian: number;
  nilaiRealisasi: number;
  persentaseRealisasi: number;
  link: string;
}

export default function DownloadSPKBAST() {
  const [data, setData] = useState<SPKData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Menggunakan Google Sheets API dengan approach publik
        // Karena sheet sudah public, kita bisa akses via CSV export
        const SHEET_ID = '1fmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc';
        const SHEET_NAME = 'OUTPUT';
        
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`
        );
        
        if (!response.ok) {
          throw new Error('Gagal mengambil data dari Google Sheets');
        }
        
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1); // Skip header row
        
        const parsedData: SPKData[] = rows
          .filter(row => row.trim()) // Hapus baris kosong
          .map((row, index) => {
            // Parse CSV row
            const columns = row.split(',').map(col => 
              col.replace(/^"|"$/g, '').trim() // Remove quotes and trim
            );
            
            // Pastikan kolom sesuai dengan struktur
            if (columns.length >= 6) {
              return {
                no: index + 1,
                periode: columns[1] || '', // Kolom B - Periode
                nilaiPerjanjian: parseFloat(columns[2]?.replace(/[^\d.-]/g, '')) || 0, // Kolom C - Nilai Perjanjian
                nilaiRealisasi: parseFloat(columns[3]?.replace(/[^\d.-]/g, '')) || 0, // Kolom D - Nilai Realisasi
                persentaseRealisasi: parseFloat(columns[4]?.replace(/[^\d.-]/g, '')) || 0, // Kolom E - % Realisasi
                link: columns[5] || '' // Kolom F - Link
              };
            }
            
            return null;
          })
          .filter((item): item is SPKData => item !== null); // Type guard untuk filter null
        
        setData(parsedData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError("Gagal memuat data dari Google Sheets. Pastikan koneksi internet tersedia.");
        setLoading(false);
      }
    };

    fetchData();
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

  // Format persentase
  const formatPersentase = (angka: number): string => {
    return `${angka.toFixed(1)}%`;
  };

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
              <p className="text-red-500 mb-2">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
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
          <div className="flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            <CardTitle>Download Dokumen SPK & BAST</CardTitle>
          </div>
          <CardDescription>
            Daftar dokumen SPK dan BAST yang tersedia untuk diunduh
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
              <p className="text-muted-foreground">Tidak ada data yang ditemukan</p>
            </div>
          ) : (
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
                  {data.map((item, index) => (
                    <tr 
                      key={item.no} 
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}
                    >
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {item.no}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {item.periode}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {formatRupiah(item.nilaiPerjanjian)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        {formatRupiah(item.nilaiRealisasi)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                        <span className={`font-medium ${
                          item.persentaseRealisasi >= 90 ? 'text-green-600' : 
                          item.persentaseRealisasi >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPersentase(item.persentaseRealisasi)}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
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
                          <span className="text-gray-400">Tidak tersedia</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informasi tambahan */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-700">
            <strong>Catatan:</strong> Data diambil langsung dari Google Sheets. 
            Pastikan koneksi internet tersedia untuk melihat data terbaru.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}