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
  const [selectedTahun, setSelectedTahun] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const SPK_SPREADSHEET_ID = "1fmSGAb0lE_iszZPH4I9ols1SAUfDeNU-AOBpG5-Tygc";
  const SHEET_NAME = "OUTPUT";

  // === Fungsi utama untuk ambil data dari Google Sheets ===
  const fetchDataFromSheets = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🚀 Mengambil data SPK & BAST dari Google Sheets...");

      const { data: sheetResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPK_SPREADSHEET_ID,
          operation: "read",
          range: SHEET_NAME,
        },
      });

      if (error) throw error;

      console.log("📄 Hasil mentah dari Supabase:", sheetResponse);

      // Ambil data values dari struktur yang benar
      const rows = sheetResponse?.data?.values || sheetResponse?.values || [];

      console.log("✅ Total rows fetched:", rows.length);

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("Tidak ada data ditemukan di spreadsheet");
      }

      // Lewati header baris pertama
      const parsedData: SPKData[] = rows
        .slice(1)
        .filter((row: any[]) => row && row.length >= 6)
        .map((row: any[], index: number) => {
          try {
            const no = parseInt(row[0]) || index + 1;
            const periode = row[1]?.toString()?.trim() || "";
            const nilaiPerjanjianStr = row[2]?.toString()?.trim() || "0";
            const nilaiRealisasiStr = row[3]?.toString()?.trim() || "0";
            const persentaseStr = row[4]?.toString()?.trim() || "0";
            const link = row[5]?.toString()?.trim() || "";

            // Parsing angka dengan aman
            const nilaiPerjanjian =
              parseFloat(nilaiPerjanjianStr.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
            const nilaiRealisasi =
              parseFloat(nilaiRealisasiStr.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
            const persentaseRealisasi =
              parseFloat(persentaseStr.replace("%", "").replace(",", ".")) || 0;

            const tahunMatch = periode.match(/(\d{4})$/);
            const tahun = tahunMatch ? parseInt(tahunMatch[1]) : new Date().getFullYear();

            return {
              no,
              periode,
              nilaiPerjanjian,
              nilaiRealisasi,
              persentaseRealisasi,
              link,
              tahun,
            };
          } catch (parseError) {
            console.error("Error parsing row:", row, parseError);
            return null;
          }
        })
        .filter((item): item is SPKData => item !== null);

      console.log("📊 Data berhasil diparsing:", parsedData.length, "items");

      setData(parsedData);
      setFilteredData(parsedData);

      const years = [...new Set(parsedData.map((item) => item.tahun))].sort((a, b) => b - a);
      setTahunList(years);

      if (years.length > 0) setSelectedTahun(years[0]);

      toast({
        title: "Berhasil",
        description: `Data berhasil dimuat (${parsedData.length} item)`,
        variant: "default",
      });
    } catch (err: any) {
      console.error("❌ Error fetching SPK data:", err);
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

  // === Filter data berdasarkan tahun ===
  useEffect(() => {
    if (selectedTahun === "all") {
      setFilteredData(data);
    } else {
      const filtered = data.filter((item) => item.tahun === selectedTahun);
      setFilteredData(filtered);
    }
  }, [selectedTahun, data]);

  // === Jalankan fetch saat pertama kali render ===
  useEffect(() => {
    fetchDataFromSheets();
  }, []);

  // === Format helper ===
  const formatRupiah = (angka: number): string =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(angka);

  const formatPersentase = (angka: number): string =>
    `${angka.toFixed(2).replace(".", ",")}%`;

  const totalNilaiPerjanjian = filteredData.reduce(
    (sum, item) => sum + item.nilaiPerjanjian,
    0
  );
  const totalNilaiRealisasi = filteredData.reduce(
    (sum, item) => sum + item.nilaiRealisasi,
    0
  );
  const totalPersentaseRealisasi =
    totalNilaiPerjanjian > 0
      ? (totalNilaiRealisasi / totalNilaiPerjanjian) * 100
      : 0;
  const jumlahData = filteredData.length;

  // === Kondisi Loading & Error ===
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Download SPK & BAST</h1>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Memuat data dari Google Sheets...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Download SPK & BAST</h1>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchDataFromSheets}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
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

  // === Tampilan utama ===
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
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedTahun === "all" ? "all" : selectedTahun.toString()}
                  onValueChange={(value) =>
                    setSelectedTahun(value === "all" ? "all" : parseInt(value))
                  }
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

              <button
                onClick={fetchDataFromSheets}
                className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          <CardDescription>
            Daftar dokumen SPK dan BAST yang tersedia untuk diunduh
            {selectedTahun !== "all" && ` (Tahun ${selectedTahun})`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {filteredData.length === 0 ? (
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
                      <th className="border px-4 py-3">No</th>
                      <th className="border px-4 py-3 text-left">Periode (Bulan) SPK</th>
                      <th className="border px-4 py-3 text-right">Nilai Perjanjian Rp.</th>
                      <th className="border px-4 py-3 text-right">Nilai Realisasi Rp.</th>
                      <th className="border px-4 py-3 text-center">% Realisasi</th>
                      <th className="border px-4 py-3 text-center">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => (
                      <tr key={item.no} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border px-4 py-3 text-center">{item.no}</td>
                        <td className="border px-4 py-3">{item.periode}</td>
                        <td className="border px-4 py-3 text-right">
                          {formatRupiah(item.nilaiPerjanjian)}
                        </td>
                        <td className="border px-4 py-3 text-right">
                          {formatRupiah(item.nilaiRealisasi)}
                        </td>
                        <td className="border px-4 py-3 text-center">
                          {formatPersentase(item.persentaseRealisasi)}
                        </td>
                        <td className="border px-4 py-3 text-center">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Download
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-semibold">
                      <td className="border px-4 py-3 text-center" colSpan={2}>
                        TOTAL ({jumlahData} data)
                      </td>
                      <td className="border px-4 py-3 text-right">
                        {formatRupiah(totalNilaiPerjanjian)}
                      </td>
                      <td className="border px-4 py-3 text-right">
                        {formatRupiah(totalNilaiRealisasi)}
                      </td>
                      <td className="border px-4 py-3 text-center">
                        {formatPersentase(totalPersentaseRealisasi)}
                      </td>
                      <td className="border px-4 py-3 text-center">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
