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
        // Menggunakan Google Sheets API atau alternatif untuk mengambil data
        // Untuk sementara, kita akan menggunakan data dummy
        // Anda perlu mengimplementasikan pengambilan data aktual dari Google Sheets
        
        // Contoh data dummy - ganti dengan koneksi ke Google Sheets
        const dummyData: SPKData[] = [
          {
            no: 1,
            periode: "Januari 2024",
            nilaiPerjanjian: 50000000,
            nilaiRealisasi: 45000000,
            persentaseRealisasi: 90,
            link: "https://drive.google.com/file/d/example1/view"
          },
          {
            no: 2,
            periode: "Februari 2024",
            nilaiPerjanjian: 55000000,
            nilaiRealisasi: 52000000,
            persentaseRealisasi: 94.5,
            link: "https://drive.google.com/file/d/example2/view"
          },
          {
            no: 3,
            periode: "Maret 2024",
            nilaiPerjanjian: 60000000,
            nilaiRealisasi: 58000000,
            persentaseRealisasi: 96.7,
            link: "https://drive.google.com/file/d/example3/view"
          }
        ];

        setData(dummyData);
        setLoading(false);
      } catch (err) {
        setError("Gagal memuat data");
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

  // Fungsi untuk mengambil data aktual dari Google Sheets
  // Anda perlu mengimplementasikan ini dengan Google Sheets API
  const fetchFromGoogleSheets = async () => {
    // Implementasi pengambilan data dari Google Sheets
    // Anda bisa menggunakan library seperti google-spreadsheet
    // atau mengkonversi Google Sheets ke JSON menggunakan services seperti Sheet2API
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
            <p className="text-muted-foreground">Memuat data...</p>
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
            <p className="text-red-500">{error}</p>
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
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
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
                        {item.persentaseRealisasi}%
                      </span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}