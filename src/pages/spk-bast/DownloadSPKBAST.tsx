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
        // Data statis berdasarkan yang Anda berikan
        const staticData: SPKData[] = [
          {
            no: 1,
            periode: "Januari 2025",
            nilaiPerjanjian: 57688000,
            nilaiRealisasi: 57688000,
            persentaseRealisasi: 100.00,
            link: ""
          },
          {
            no: 2,
            periode: "Februari 2025",
            nilaiPerjanjian: 247088000,
            nilaiRealisasi: 246960000,
            persentaseRealisasi: 99.95,
            link: ""
          },
          {
            no: 3,
            periode: "Maret 2025",
            nilaiPerjanjian: 82135000,
            nilaiRealisasi: 82109000,
            persentaseRealisasi: 99.97,
            link: ""
          },
          {
            no: 4,
            periode: "April 2025",
            nilaiPerjanjian: 75798000,
            nilaiRealisasi: 75798000,
            persentaseRealisasi: 100.00,
            link: ""
          },
          {
            no: 5,
            periode: "Mei 2025",
            nilaiPerjanjian: 75660000,
            nilaiRealisasi: 75660000,
            persentaseRealisasi: 100.00,
            link: ""
          },
          {
            no: 6,
            periode: "Juni 2025",
            nilaiPerjanjian: 198356000,
            nilaiRealisasi: 198356000,
            persentaseRealisasi: 100.00,
            link: ""
          },
          {
            no: 7,
            periode: "Juli 2025",
            nilaiPerjanjian: 152428000,
            nilaiRealisasi: 152428000,
            persentaseRealisasi: 100.00,
            link: ""
          },
          {
            no: 8,
            periode: "Agustus 2025",
            nilaiPerjanjian: 99307000,
            nilaiRealisasi: 99307000,
            persentaseRealisasi: 100.00,
            link: ""
          },
          {
            no: 9,
            periode: "September 2025",
            nilaiPerjanjian: 154009000,
            nilaiRealisasi: 154009000,
            persentaseRealisasi: 100.00,
            link: ""
          },
          {
            no: 10,
            periode: "Oktober 2025",
            nilaiPerjanjian: 10581000,
            nilaiRealisasi: 7196000,
            persentaseRealisasi: 68.01,
            link: ""
          },
          {
            no: 11,
            periode: "November 2025",
            nilaiPerjanjian: 0,
            nilaiRealisasi: 0,
            persentaseRealisasi: 0.00,
            link: ""
          },
          {
            no: 12,
            periode: "Desember 2025",
            nilaiPerjanjian: 0,
            nilaiRealisasi: 0,
            persentaseRealisasi: 0.00,
            link: ""
          }
        ];

        setData(staticData);
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

  // Format persentase dengan koma
  const formatPersentase = (angka: number): string => {
    return `${angka.toFixed(2).replace('.', ',')}%`;
  };

  // Hitung total
  const totalNilaiPerjanjian = data.reduce((sum, item) => sum + item.nilaiPerjanjian, 0);
  const totalNilaiRealisasi = data.reduce((sum, item) => sum + item.nilaiRealisasi, 0);
  const totalPersentaseRealisasi = totalNilaiPerjanjian > 0 
    ? (totalNilaiRealisasi / totalNilaiPerjanjian) * 100 
    : 0;

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
              <p className="text-muted-foreground">Memuat data...</p>
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
                    TOTAL
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
                  Total % Realisasi
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
        </CardContent>
      </Card>
    </div>
  );
}