import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink, Filter, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DownloadRekapHonor from "@/components/DownloadRekapHonor";
import GenerateSPKBAST from "@/components/GenerateSPKBAST";
import PreviewSPKBAST from "@/components/PreviewSPKBAST";
import ResetAndDeleteSPKBAST from "@/components/ResetAndDeleteSPKBAST";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
interface SPKData {
  no: number;
  periode: string;
  jumlahSPK: number;
  nilaiPerjanjian: number;
  nilaiRealisasi: number;
  persentaseRealisasi: number;
  link: string;
  tahun: number;
  bulan: string;
}

// Daftar nama bulan
const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export default function DownloadSPKBAST() {
  const { user } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  const [data, setData] = useState<SPKData[]>([]);
  const [filteredData, setFilteredData] = useState<SPKData[]>([]);
  const [selectedTahun, setSelectedTahun] = useState<number>(2026);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  
  // Ambil spreadsheet ID entrikegiatan dari satker config (kolom E per satker)
  const SPK_SPREADSHEET_ID = satkerConfig?.getUserSatkerSheetId('entrikegiatan') || "";

  // Generate tahun list dari 2024 sampai 2030
  const tahunList = Array.from({
    length: 7
  }, (_, i) => 2024 + i);

  // Fungsi untuk generate data lengkap 12 bulan
  const generateCompleteData = (tahun: number, existingData: SPKData[]): SPKData[] => {
    const completeData: SPKData[] = [];

    // Buat map dari data yang ada untuk lookup cepat
    const existingDataMap = new Map<string, SPKData>();
    existingData.forEach(item => {
      const key = `${item.bulan} ${tahun}`;
      existingDataMap.set(key, item);
    });

    // Generate 12 bulan lengkap
    bulanList.forEach((bulan, index) => {
      const periode = `${bulan} ${tahun}`;
      const existingItem = existingDataMap.get(periode);
      if (existingItem) {
        // Jika ada data, gunakan data yang ada
        completeData.push({
          ...existingItem,
          no: index + 1 // Nomor urut berdasarkan urutan bulan
        });
      } else {
        // Jika tidak ada data, buat data kosong
        completeData.push({
          no: index + 1,
          periode: periode,
          jumlahSPK: 0,
          nilaiPerjanjian: 0,
          nilaiRealisasi: 0,
          persentaseRealisasi: 0,
          link: "",
          tahun: tahun,
          bulan: bulan
        });
      }
    });
    return completeData;
  };

  // Fungsi untuk mengambil data dari Google Sheets dengan berbagai approach
  const fetchDataFromSheets = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Mengambil data SPK & BAST dari Google Sheets...");

      // Coba beberapa range yang mungkin untuk sheet entrikegiatan
      const rangesToTry = [
        "Sheet1!A:W",
        "Sheet1!A:Z",
        "Sheet1!A1:W200",
        "Sheet1!A1:Z200",
        "A:W",
        "A:Z",
        "OUTPUT!A:G",
        "OUTPUT!A1:G100",
        "OUTPUT",
        "Sheet1!A:G",
        "A:G"
      ];
      let sheetData: any[] = [];
      let successfulRange = "";
      for (const range of rangesToTry) {
        try {
          console.log(`Mencoba range: ${range}`);
          const {
            data: sheetResponse,
            error
          } = await supabase.functions.invoke("google-sheets", {
            body: {
              spreadsheetId: SPK_SPREADSHEET_ID,
              operation: "read",
              range: range
            }
          });
          if (error) {
            console.log(`Error dengan range ${range}:`, error);
            continue;
          }
          const rows = sheetResponse?.values || [];
          console.log(`Range ${range} berhasil, jumlah rows:`, rows.length);
          if (rows.length > 0) {
            sheetData = rows;
            successfulRange = range;
            break;
          }
        } catch (rangeError) {
          console.log(`Range ${range} gagal:`, rangeError);
          continue;
        }
      }
      if (sheetData.length === 0) {
        throw new Error('Tidak ada data ditemukan di spreadsheet dengan range yang dicoba');
      }
      console.log("Data mentah dari sheets:", sheetData);
      console.log("Range yang berhasil:", successfulRange);

      // Cari header untuk memastikan struktur data
      const headerRow = sheetData[0];
      console.log("Header row:", headerRow);

      const getHeaderIndex = (labels: string[]) => {
        const lowerHeaders = headerRow.map((h: any) => (h || '').toString().toLowerCase());
        return labels.reduce((found, label) => {
          if (found >= 0) return found;
          return lowerHeaders.findIndex(h => h.includes(label.toLowerCase()));
        }, -1);
      };

      const periodeIndex = getHeaderIndex(['periode (bulan) spk', 'periode', 'periode (bulan)']);
      const namaPetugasIndex = getHeaderIndex(['nama petugas', 'petugas']);
      const nikIndex = getHeaderIndex(['nik', 'nip']);
      const linkIndex = getHeaderIndex(['link', 'url']);
      const hargaSatuanIndex = 9; // Kolom J: Harga Satuan
      const targetIndex = 14; // Kolom O: Target
      const realisasiIndex = 15; // Kolom P: Realisasi
      const nilaiRealisasiIndex = 16; // Kolom Q: Nilai Realisasi (per petugas atau total)
      const totalRealisasiIndex = 17; // Kolom R: Total Realisasi (numeric)

      const dataStartIndex = 1;
      const parsedData: SPKData[] = [];
      const monthlyAggregation = new Map<string, {
        periode: string;
        tahun: number;
        bulan: string;
        nikSet: Set<string>;
        namaSet: Set<string>;
        link: string;
        nilaiPerjanjian: number;
        nilaiRealisasi: number;
      }>();

      const normalizeMonthName = (raw: string): string => {
        const lower = raw.toLowerCase();
        return bulanList.find(m => lower.includes(m.toLowerCase())) || raw;
      };

      const normalizePersonValues = (raw: string): string[] => {
        return raw
          .split(/\||;|\n/)
          .map(value => value.trim())
          .filter(Boolean)
          .map(value => value.toLowerCase());
      };

      for (let i = dataStartIndex; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (!row || row.length === 0) continue;
        try {
          const periodeRaw = periodeIndex >= 0
            ? row[periodeIndex]?.toString()?.trim() || ''
            : row[2]?.toString()?.trim() || row[1]?.toString()?.trim() || row[0]?.toString()?.trim() || '';
          const namaPetugasRaw = namaPetugasIndex >= 0 ? row[namaPetugasIndex]?.toString()?.trim() || '' : '';
          const nikRaw = nikIndex >= 0 ? row[nikIndex]?.toString()?.trim() || '' : '';
          const link = linkIndex >= 0 ? row[linkIndex]?.toString()?.trim() || '' : '';
          const hargaSatuanRaw = row[hargaSatuanIndex]?.toString()?.trim() || '';
          const targetRaw = row[targetIndex]?.toString()?.trim() || '';
          const realisasiRaw = row[realisasiIndex]?.toString()?.trim() || '';
          const nilaiRealisasiRaw = nilaiRealisasiIndex >= 0 ? row[nilaiRealisasiIndex]?.toString()?.trim() || '' : '';
          const totalRealisasiRaw = totalRealisasiIndex >= 0 ? row[totalRealisasiIndex]?.toString()?.trim() || '' : '';

          if (!periodeRaw) continue;
          const periodeMatch = periodeRaw.match(/([A-Za-z]{3,})\s+(\d{4})/);
          if (!periodeMatch) continue;

          const bulan = normalizeMonthName(periodeMatch[1]);
          const tahun = parseInt(periodeMatch[2], 10);
          if (isNaN(tahun)) continue;

          const periode = `${bulan} ${tahun}`;
          const key = `${bulan}-${tahun}`;
          const existing = monthlyAggregation.get(key) || {
            periode,
            tahun,
            bulan,
            nikSet: new Set<string>(),
            namaSet: new Set<string>(),
            link: '',
            nilaiPerjanjian: 0,
            nilaiRealisasi: 0
          };

          if (nikRaw) {
            normalizePersonValues(nikRaw).forEach(value => existing.nikSet.add(value));
          }
          if (namaPetugasRaw) {
            normalizePersonValues(namaPetugasRaw).forEach(value => existing.namaSet.add(value));
          }
          if (!existing.link && link) {
            existing.link = link;
          }

          // Helper: Parse single nilai (sederhana - hanya parseFloat)
          const parseSingleNilai = (str: string): number => {
            return parseFloat(str) || 0;
          };

          // Helper: Parse nilai yang dipisah | dan hitung total setelah dikalikan hargaSatuan
          // (sama seperti calculateRealisasiLikeEntri di Dashboard.tsx)
          const parseNilaiDenganMultiplier = (str: string, multiplier: number): number => {
            if (!str) return 0;
            const segments = str
              .split(/\||;|\n/)
              .map(segment => segment.trim())
              .filter(Boolean);

            return segments.reduce((sum, segment) => {
              const value = parseSingleNilai(segment);
              return sum + Math.round(value * multiplier);
            }, 0);
          };

          const hargaSatuan = parseSingleNilai(hargaSatuanRaw);

          // PERBAIKAN: Hitung Nilai Perjanjian dari Target (Kolom O) × Harga Satuan (Kolom J)
          // Setiap item dalam Target (dipisah |) dikalikan dengan Harga Satuan, lalu sum
          const nilaiPerjanjian = parseNilaiDenganMultiplier(targetRaw, hargaSatuan);
          
          // PERBAIKAN: Hitung Nilai Realisasi dari Realisasi (Kolom P) × Harga Satuan (Kolom J)
          // Setiap item dalam Realisasi (dipisah |) dikalikan dengan Harga Satuan, lalu sum
          const nilaiRealisasi = parseNilaiDenganMultiplier(realisasiRaw, hargaSatuan);

          // PERBAIKAN: Agregasi per bulan menggunakan SUM (bukan MAX) seperti di Dashboard.tsx
          existing.nilaiPerjanjian += nilaiPerjanjian;
          existing.nilaiRealisasi += nilaiRealisasi;

          monthlyAggregation.set(key, existing);
        } catch (parseError) {
          console.error(`Error parsing row ${i}:`, row, parseError);
        }
      }

      const getUniqueCount = (entry: { nikSet: Set<string>; namaSet: Set<string> }) => {
        return Math.max(entry.nikSet.size, entry.namaSet.size);
      };

      for (const entry of monthlyAggregation.values()) {
        parsedData.push({
          no: 0,
          periode: entry.periode,
          jumlahSPK: getUniqueCount(entry),
          nilaiPerjanjian: entry.nilaiPerjanjian,
          nilaiRealisasi: entry.nilaiRealisasi,
          persentaseRealisasi: entry.nilaiPerjanjian > 0 ? entry.nilaiRealisasi / entry.nilaiPerjanjian * 100 : 0,
          link: entry.link,
          tahun: entry.tahun,
          bulan: entry.bulan
        });
      }
      console.log("Data berhasil diparsing:", parsedData.length, "items");
      if (parsedData.length === 0) {
        throw new Error('Data ditemukan tetapi tidak dapat diparsing. Periksa format spreadsheet.');
      }
      setData(parsedData);

      // Generate data lengkap untuk tahun yang dipilih
      const dataForSelectedYear = parsedData.filter(item => item.tahun === selectedTahun);
      const completeData = generateCompleteData(selectedTahun, dataForSelectedYear);
      setFilteredData(completeData);
      toast({
        title: "Berhasil",
        description: `Data berhasil dimuat (${parsedData.length} item)`,
        variant: "default"
      });
    } catch (err: any) {
      console.error('Error fetching SPK data:', err);
      const errorMessage = err.message || "Gagal memuat data dari Google Sheets";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fallback ke data dummy jika fetch gagal
  const useDummyData = () => {
    const dummyData: SPKData[] = [{
      no: 0,
      periode: "Januari 2025",
      jumlahSPK: 60,
      nilaiPerjanjian: 57688000,
      nilaiRealisasi: 57688000,
      persentaseRealisasi: 100.00,
      link: "https://drive.google.com/drive/folders/17uw-Buqts9-y6nhnZ9t5scuCO8W81Jrx",
      tahun: 2025,
      bulan: "Januari"
    }, {
      no: 0,
      periode: "Februari 2025",
      jumlahSPK: 125,
      nilaiPerjanjian: 247088000,
      nilaiRealisasi: 246960000,
      persentaseRealisasi: 99.95,
      link: "https://drive.google.com/drive/folders/1sGgsfiL56h_naiQXt1U29Qd-qMuOVO-e",
      tahun: 2025,
      bulan: "Februari"
    }, {
      no: 0,
      periode: "Maret 2025",
      jumlahSPK: 63,
      nilaiPerjanjian: 82135000,
      nilaiRealisasi: 82109000,
      persentaseRealisasi: 99.97,
      link: "https://drive.google.com/drive/folders/1z5wS1mKJc9OOOXrY0yaTJh2VLd8og4CP",
      tahun: 2025,
      bulan: "Maret"
    }, {
      no: 0,
      periode: "April 2025",
      jumlahSPK: 58,
      nilaiPerjanjian: 75798000,
      nilaiRealisasi: 75798000,
      persentaseRealisasi: 100.00,
      link: "https://drive.google.com/drive/folders/1xHJa-MVJGOO_X0pvAsixGaBy1dI59IN6",
      tahun: 2025,
      bulan: "April"
    }, {
      no: 0,
      periode: "Mei 2025",
      jumlahSPK: 59,
      nilaiPerjanjian: 75660000,
      nilaiRealisasi: 75660000,
      persentaseRealisasi: 100.00,
      link: "https://drive.google.com/drive/folders/1u3jpApJOqJfi2kpecXolLDaC7bnWlFwT",
      tahun: 2025,
      bulan: "Mei"
    }, {
      no: 0,
      periode: "Juni 2025",
      jumlahSPK: 117,
      nilaiPerjanjian: 198356000,
      nilaiRealisasi: 198356000,
      persentaseRealisasi: 100.00,
      link: "https://drive.google.com/drive/folders/1_1zujGiti7BVBSCn-9Ww3Qmp3NimDOGG",
      tahun: 2025,
      bulan: "Juni"
    }, {
      no: 0,
      periode: "Juli 2025",
      jumlahSPK: 87,
      nilaiPerjanjian: 152428000,
      nilaiRealisasi: 152428000,
      persentaseRealisasi: 100.00,
      link: "https://drive.google.com/drive/folders/1zjRgSMwWAYi0EJOedcK2VDQXNX1bdzL1",
      tahun: 2025,
      bulan: "Juli"
    }, {
      no: 0,
      periode: "Agustus 2025",
      jumlahSPK: 56,
      nilaiPerjanjian: 99307000,
      nilaiRealisasi: 99307000,
      persentaseRealisasi: 100.00,
      link: "https://drive.google.com/drive/folders/1rBeIMikKn9GE0q9UBcrnIinSLNMLtb2z",
      tahun: 2025,
      bulan: "Agustus"
    }, {
      no: 0,
      periode: "September 2025",
      jumlahSPK: 90,
      nilaiPerjanjian: 154009000,
      nilaiRealisasi: 154009000,
      persentaseRealisasi: 100.00,
      link: "https://drive.google.com/drive/folders/1E-vxHhzN_35VPbPjKOrH22vZylIykj1T",
      tahun: 2025,
      bulan: "September"
    }, {
      no: 0,
      periode: "Oktober 2025",
      jumlahSPK: 12,
      nilaiPerjanjian: 7196000,
      nilaiRealisasi: 7196000,
      persentaseRealisasi: 100.00,
      link: "",
      tahun: 2025,
      bulan: "Oktober"
    }];
    setData(dummyData);

    // Generate data lengkap untuk tahun yang dipilih
    const dataForSelectedYear = dummyData.filter(item => item.tahun === selectedTahun);
    const completeData = generateCompleteData(selectedTahun, dataForSelectedYear);
    setFilteredData(completeData);
    setError(null);
    toast({
      title: "Menggunakan Data Contoh",
      description: "Data aktual tidak dapat diambil, menampilkan data contoh",
      variant: "default"
    });
  };

  // Filter data berdasarkan tahun yang dipilih dan generate data lengkap
  useEffect(() => {
    if (data.length > 0) {
      const dataForSelectedYear = data.filter(item => item.tahun === selectedTahun);
      const completeData = generateCompleteData(selectedTahun, dataForSelectedYear);
      setFilteredData(completeData);
    } else {
      // Jika tidak ada data, generate data kosong untuk tahun yang dipilih
      const emptyData = generateCompleteData(selectedTahun, []);
      setFilteredData(emptyData);
    }
  }, [selectedTahun, data]);

  // Load data saat komponen mount
  useEffect(() => {
    if (SPK_SPREADSHEET_ID) {
      fetchDataFromSheets();
    }
  }, [SPK_SPREADSHEET_ID]);

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
    if (angka === 0) return "0,00%";
    return `${angka.toFixed(2).replace('.', ',')}%`;
  };

  // Hitung total berdasarkan data yang difilter
  const totalJumlahSPK = filteredData.reduce((sum, item) => sum + item.jumlahSPK, 0);
  const totalNilaiPerjanjian = filteredData.reduce((sum, item) => sum + item.nilaiPerjanjian, 0);
  const totalNilaiRealisasi = filteredData.reduce((sum, item) => sum + item.nilaiRealisasi, 0);
  const totalPersentaseRealisasi = totalNilaiPerjanjian > 0 ? totalNilaiRealisasi / totalNilaiPerjanjian * 100 : 0;
  const jumlahData = filteredData.length;
  if (loading) {
    return <div className="space-y-6">
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
      </div>;
  }
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Download SPK & BAST</h1>
        <p className="text-muted-foreground mt-2">
          Unduh dokumen Surat Perjanjian Kerja dan Berita Acara Serah Terima
        </p>
      </div>

      {/* Section for Download Rekap Honor & Generate SPK/BAST - visible only for PPK */}
      {user?.role === 'Pejabat Pembuat Komitmen' && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">Fitur Tambahan</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Kelola dokumen SPK & BAST dan rekap honor output kegiatan per tahun
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <PreviewSPKBAST />
                <GenerateSPKBAST />
                <ResetAndDeleteSPKBAST />
                <DownloadRekapHonor />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <Select value={selectedTahun.toString()} onValueChange={value => setSelectedTahun(parseInt(value))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunList.map(tahun => <SelectItem key={tahun} value={tahun.toString()}>
                        {tahun}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button onClick={fetchDataFromSheets} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                {error && <button onClick={useDummyData} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors">
                    Gunakan Contoh
                  </button>}
              </div>
            </div>
          </div>
          <CardDescription>
            Daftar dokumen SPK dan BAST yang tersedia untuk diunduh - Tahun {selectedTahun}
            {error && " - Sedang menampilkan data contoh"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <span className="font-medium">Peringatan:</span> 
                <span>{error}</span>
              </div>
            </div>}

          {filteredData.length === 0 ? <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Tidak ada data yang ditemukan
              </p>
            </div> : <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        No
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Periode (Bulan) SPK
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Jumlah SPK/BAST
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Nilai Perjanjian
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Nilai Realisasi
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Realisasi
                      </th>
                      <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                        Link
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, index) => <tr key={`${selectedTahun}-${item.bulan}`} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                          {item.no}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                          {item.periode}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                          {item.jumlahSPK > 0 ? item.jumlahSPK : "-"}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                          {item.nilaiPerjanjian > 0 ? formatRupiah(item.nilaiPerjanjian) : "-"}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                          {item.nilaiRealisasi > 0 ? formatRupiah(item.nilaiRealisasi) : "-"}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                          <span className={`font-medium ${item.persentaseRealisasi >= 90 ? 'text-green-600' : item.persentaseRealisasi >= 80 ? 'text-yellow-600' : item.persentaseRealisasi > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {item.persentaseRealisasi > 0 ? formatPersentase(item.persentaseRealisasi) : "-"}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          {item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors">
                              <ExternalLink className="h-4 w-4" />
                              Download
                            </a> : <span className="text-gray-400">-</span>}
                        </td>
                      </tr>)}
                    
                    {/* Baris Total */}
                    <tr className="bg-blue-50 font-semibold">
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center" colSpan={2}>
                        TOTAL ({filteredData.filter(item => item.nilaiPerjanjian > 0).length} data berisi nilai)
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                        {totalJumlahSPK}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                        {formatRupiah(totalNilaiPerjanjian)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-right">
                        {formatRupiah(totalNilaiRealisasi)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900 text-center">
                        <span className={`font-bold ${totalPersentaseRealisasi >= 90 ? 'text-green-600' : totalPersentaseRealisasi >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-blue-600 font-medium">Total Jumlah SPK/BAST</div>
                    <div className="text-2xl font-bold text-blue-700">{totalJumlahSPK}</div>
                  </CardContent>
                </Card>
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
                <Card className={`${totalPersentaseRealisasi >= 90 ? 'bg-green-50 border-green-200' : totalPersentaseRealisasi >= 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <CardContent className="p-4">
                    <div className={`text-sm font-medium ${totalPersentaseRealisasi >= 90 ? 'text-green-600' : totalPersentaseRealisasi >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      Rata-rata % Realisasi
                    </div>
                    <div className={`text-2xl font-bold ${totalPersentaseRealisasi >= 90 ? 'text-green-700' : totalPersentaseRealisasi >= 80 ? 'text-yellow-700' : 'text-red-700'}`}>
                      {formatPersentase(totalPersentaseRealisasi)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>}
        </CardContent>
      </Card>

      {/* Informasi tambahan */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="p-4">
          <p className="text-sm text-orange-700">
            <strong>Catatan:</strong> Data menampilkan semua bulan dalam tahun {selectedTahun}.
            Pastikan koneksi internet tersedia untuk melihat data terbaru.
          </p>
        </CardContent>
      </Card>
    </div>;
}