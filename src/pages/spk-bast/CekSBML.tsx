import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Search, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const SBML_SPREADSHEET_ID = "18EBGBfhlwjZAItLI68LJEDeq-Ct7Qe4udxGKY6KWqXk";

const bulanList = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const tahunList = Array.from({ length: 9 }, (_, i) => (2022 + i).toString());

interface PetugasTugas {
  nama: string;
  nik: string;
  role: string;
  honor: number;
  periode: string;
  namaKegiatan: string;
  nilaiRealisasi: string;
}

interface MasterPetugas {
  nama: string;
  nik: string;
  pekerjaan: string;
  alamat: string;
  bank: string;
  rekening: string;
  kecamatan: string;
}

interface SBMLData {
  tahunAnggaran: string;
  sbmlPendata: number;
  sbmlPemeriksa: number;
  sbmlPengolah: number;
}

interface CekSBMLRow {
  no: number;
  namaMitra: string;
  nik: string;
  pendataan: number;
  pemeriksaan: number;
  pengolahan: number;
  pekerjaanProvinsi: number;
  jumlah: number;
  isExceeded: boolean;
  warnings: string[];
  // Tambahan untuk detail tooltips
  detailPendataan: { namaKegiatan: string; nilaiRealisasi: string }[];
  detailPemeriksaan: { namaKegiatan: string; nilaiRealisasi: string }[];
  detailPengolahan: { namaKegiatan: string; nilaiRealisasi: string }[];
}

export default function CekSBML() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CekSBMLRow[]>([]);
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [sbmlData, setSbmlData] = useState<SBMLData | null>(null);
  const { toast } = useToast();

  // Format currency helper - dioptimalkan dengan useCallback
  const formatRupiah = useCallback((amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Parse honor dari string format "704.000,-" - dioptimalkan
  const parseHonor = useCallback((honorStr: string): number => {
    if (!honorStr) return 0;
    const cleaned = honorStr.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  }, []);

  // Fetch data SBML untuk validasi - dioptimalkan
  const fetchSBMLData = useCallback(async (tahun: string) => {
    try {
      const { data: sbmlResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SBML_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (error) throw error;

      const rows = sbmlResponse?.values || [];
      if (rows.length > 1) {
        const sbmlForYear = rows.find((row: any[]) => row[1] === tahun);
        
        if (sbmlForYear) {
          setSbmlData({
            tahunAnggaran: sbmlForYear[1],
            sbmlPendata: parseHonor(sbmlForYear[2]),
            sbmlPemeriksa: parseHonor(sbmlForYear[3]),
            sbmlPengolah: parseHonor(sbmlForYear[4]),
          });
        } else {
          const latestSBML = rows[1];
          setSbmlData({
            tahunAnggaran: latestSBML[1],
            sbmlPendata: parseHonor(latestSBML[2]),
            sbmlPemeriksa: parseHonor(latestSBML[3]),
            sbmlPengolah: parseHonor(latestSBML[4]),
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching SBML data:", error);
    }
  }, [parseHonor]);

  // Fungsi validasi yang dioptimalkan
  const validateRow = useCallback((item: CekSBMLRow, sbml: SBMLData) => {
    const warnings: string[] = [];
    
    if (item.pendataan > sbml.sbmlPendata) {
      warnings.push(`Pendataan: ${formatRupiah(item.pendataan)} > ${formatRupiah(sbml.sbmlPendata)}`);
    }
    if (item.pemeriksaan > sbml.sbmlPemeriksa) {
      warnings.push(`Pemeriksaan: ${formatRupiah(item.pemeriksaan)} > ${formatRupiah(sbml.sbmlPemeriksa)}`);
    }
    if (item.pengolahan > sbml.sbmlPengolah) {
      warnings.push(`Pengolahan: ${formatRupiah(item.pengolahan)} > ${formatRupiah(sbml.sbmlPengolah)}`);
    }
    if (item.jumlah > sbml.sbmlPendata) {
      warnings.push(`Total: ${formatRupiah(item.jumlah)} > ${formatRupiah(sbml.sbmlPendata)}`);
    }
    
    return warnings;
  }, [formatRupiah]);

  // Fungsi untuk memproses data petugas dengan NIK
  const processPetugasData = useCallback((namaPetugas: string, nikPetugas: string, nilaiRealisasi: string) => {
    const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const nikList = nikPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const honorList = nilaiRealisasi.split(' | ').map(parseHonor);
    const nilaiRealisasiList = nilaiRealisasi.split(' | ').map((n: string) => n.trim());

    const result: { nama: string; nik: string; honor: number; nilaiRealisasi: string }[] = [];

    for (let j = 0; j < namaList.length; j++) {
      if (namaList[j] && honorList[j] !== undefined) {
        result.push({
          nama: namaList[j].trim(),
          nik: nikList[j] || "", // Gunakan NIK yang sesuai atau string kosong jika tidak ada
          honor: honorList[j] || 0,
          nilaiRealisasi: nilaiRealisasiList[j] || "0",
        });
      }
    }

    return result;
  }, [parseHonor]);

  // Fetch data petugas bertugas - dioptimalkan dengan Promise.all
  const fetchData = useCallback(async () => {
    if (!filterBulan || !filterTahun) {
      toast({
        title: "Peringatan",
        description: "Pilih bulan dan tahun terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const periodeFilter = `${filterBulan} ${filterTahun}`;

      // Paralel fetching untuk performa lebih baik
      const [sbmlResult, tugasResult, masterResult] = await Promise.all([
        fetchSBMLData(filterTahun),
        supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: TUGAS_SPREADSHEET_ID,
            operation: "read",
            range: "Sheet1",
          },
        }),
        supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: MASTER_SPREADSHEET_ID,
            operation: "read",
            range: "MASTER.MITRA",
          },
        })
      ]);

      if (tugasResult.error) throw tugasResult.error;
      if (masterResult.error) throw masterResult.error;

      const tugasRows = tugasResult.data?.values || [];
      const masterRows = masterResult.data?.values || [];

      // Process data dengan optimasi
      const petugasTugas: PetugasTugas[] = [];
      const masterPetugas: Map<string, MasterPetugas> = new Map();

      // Build master petugas map dengan NIK sebagai key tambahan
      for (let i = 1; i < masterRows.length; i++) {
        const row = masterRows[i];
        if (row && row[2]) {
          const nama = row[2].toString().trim();
          const nik = row[1]?.toString() || "";
          // Simpan dengan key nama dan nik untuk pencarian yang lebih akurat
          masterPetugas.set(`${nama.toLowerCase()}_${nik}`, {
            nama: nama,
            nik: nik,
            pekerjaan: row[3]?.toString() || "",
            alamat: row[4]?.toString() || "",
            bank: row[5]?.toString() || "",
            rekening: row[6]?.toString() || "",
            kecamatan: row[7]?.toString() || "",
          });
        }
      }

      // PROCESS TUGAS DATA dengan optimasi - DIMODIFIKASI untuk menyimpan detail dan NIK
      for (let i = 1; i < tugasRows.length; i++) {
        const row = tugasRows[i];
        if (!row || row.length < 22) continue; // Diperbarui untuk mengakomodasi kolom NIK (index 21)

        const periode = row[2]?.toString() || "";
        const role = row[3]?.toString() || "";
        const namaKegiatan = row[4]?.toString() || ""; // Kolom E: Nama Kegiatan
        const namaPetugas = row[13]?.toString() || ""; // Kolom N: Nama Petugas
        const nilaiRealisasi = row[16]?.toString() || ""; // Kolom Q: Nilai Realisasi
        const nikPetugas = row[21]?.toString() || ""; // Kolom V: NIK (kolom terakhir)

        if (periode === periodeFilter && namaPetugas && nilaiRealisasi) {
          const processedPetugas = processPetugasData(namaPetugas, nikPetugas, nilaiRealisasi);

          for (const petugas of processedPetugas) {
            petugasTugas.push({
              nama: petugas.nama,
              nik: petugas.nik,
              role: role.trim(),
              honor: petugas.honor,
              periode: periode,
              namaKegiatan: namaKegiatan,
              nilaiRealisasi: petugas.nilaiRealisasi,
            });
          }
        }
      }

      // Transform to CekSBMLRow format - DIMODIFIKASI untuk menggunakan Nama + NIK sebagai key
      const groupedData = new Map<string, CekSBMLRow>();

      for (const petugas of petugasTugas) {
        // Gunakan kombinasi nama dan NIK sebagai key unik
        const key = `${petugas.nama.toLowerCase()}_${petugas.nik}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            no: groupedData.size + 1,
            namaMitra: petugas.nama,
            nik: petugas.nik,
            pendataan: 0,
            pemeriksaan: 0,
            pengolahan: 0,
            pekerjaanProvinsi: 0,
            jumlah: 0,
            isExceeded: false,
            warnings: [],
            detailPendataan: [],
            detailPemeriksaan: [],
            detailPengolahan: [],
          });
        }

        const existing = groupedData.get(key)!;
        const roleLower = petugas.role.toLowerCase();
        
        // Tambahkan detail ke array yang sesuai
        const detailItem = {
          namaKegiatan: petugas.namaKegiatan,
          nilaiRealisasi: petugas.nilaiRealisasi
        };

        if (roleLower.includes('pendataan')) {
          existing.pendataan += petugas.honor;
          existing.detailPendataan.push(detailItem);
        } else if (roleLower.includes('pemeriksaan')) {
          existing.pemeriksaan += petugas.honor;
          existing.detailPemeriksaan.push(detailItem);
        } else if (roleLower.includes('pengolah')) {
          existing.pengolahan += petugas.honor;
          existing.detailPengolahan.push(detailItem);
        }
      }

      // Calculate totals and validate
      const finalData = Array.from(groupedData.values()).map(item => {
        item.jumlah = item.pendataan + item.pemeriksaan + item.pengolahan + item.pekerjaanProvinsi;
        
        if (sbmlData) {
          const warnings = validateRow(item, sbmlData);
          item.warnings = warnings;
          item.isExceeded = warnings.length > 0;
        }
        
        return item;
      });

      setData(finalData);

      if (finalData.length > 0) {
        toast({
          title: "Sukses",
          description: `Data berhasil dimuat untuk periode ${periodeFilter} - ${finalData.length} petugas ditemukan`,
        });
      } else {
        toast({
          title: "Info",
          description: `Tidak ada data untuk periode ${periodeFilter}`,
        });
      }

    } catch (error: any) {
      console.error("❌ Fetch data error:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterBulan, filterTahun, fetchSBMLData, processPetugasData, validateRow, sbmlData, toast]);

  // Handle input manual perubahan - dioptimalkan
  const handlePekerjaanProvinsiChange = useCallback((index: number, value: string) => {
    const numericValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
    
    setData(prev => {
      const newData = [...prev];
      const item = newData[index];
      
      const updatedItem = {
        ...item,
        pekerjaanProvinsi: numericValue,
        jumlah: item.pendataan + item.pemeriksaan + item.pengolahan + numericValue,
      };

      if (sbmlData) {
        const warnings = validateRow(updatedItem, sbmlData);
        updatedItem.warnings = warnings;
        updatedItem.isExceeded = warnings.length > 0;
      }

      newData[index] = updatedItem;
      return newData;
    });
  }, [sbmlData, validateRow]);

  // Update SBML ketika tahun berubah
  useEffect(() => {
    if (filterTahun) {
      fetchSBMLData(filterTahun);
    }
  }, [filterTahun, fetchSBMLData]);

  const handleSearch = () => {
    fetchData();
  };

  // SBML badge content yang dioptimalkan dengan 3 baris dan warna berbeda
  const sbmlBadgeContent = useMemo(() => {
    if (!sbmlData) return null;
    
    return (
      <div className="flex flex-col gap-1 ml-auto">
        <div className="text-xs font-semibold text-center text-gray-700 mb-1">
          SBML {sbmlData.tahunAnggaran}
        </div>
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="text-xs py-1 px-2 bg-blue-50 border-blue-200 text-blue-700">
            <span className="font-medium">Pendataan:</span> {formatRupiah(sbmlData.sbmlPendata)}
          </Badge>
          <Badge variant="outline" className="text-xs py-1 px-2 bg-green-50 border-green-200 text-green-700">
            <span className="font-medium">Pemeriksaan:</span> {formatRupiah(sbmlData.sbmlPemeriksa)}
          </Badge>
          <Badge variant="outline" className="text-xs py-1 px-2 bg-purple-50 border-purple-200 text-purple-700">
            <span className="font-medium">Pengolahan:</span> {formatRupiah(sbmlData.sbmlPengolah)}
          </Badge>
        </div>
      </div>
    );
  }, [sbmlData, formatRupiah]);

  // Hitung total untuk setiap kolom
  const totals = useMemo(() => {
    if (data.length === 0) return null;
    
    return {
      pendataan: data.reduce((sum, row) => sum + row.pendataan, 0),
      pemeriksaan: data.reduce((sum, row) => sum + row.pemeriksaan, 0),
      pengolahan: data.reduce((sum, row) => sum + row.pengolahan, 0),
      pekerjaanProvinsi: data.reduce((sum, row) => sum + row.pekerjaanProvinsi, 0),
      jumlah: data.reduce((sum, row) => sum + row.jumlah, 0),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Cek SBML</h1>
        <p className="text-muted-foreground mt-2">
          Pengecekan Standar Biaya Masukan Lainnya untuk periode tertentu
        </p>
      </div>

      {/* Filter Section */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Bulan</label>
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {bulanList.map(bulan => (
                    <SelectItem key={bulan} value={bulan} className="text-sm">
                      {bulan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Tahun</label>
              <Select value={filterTahun} onValueChange={setFilterTahun}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {tahunList.map(tahun => (
                    <SelectItem key={tahun} value={tahun} className="text-sm">
                      {tahun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="h-8 px-4 text-sm mt-5"
            >
              {loading ? "Memuat..." : "Cari Data"}
            </Button>

            {sbmlBadgeContent && (
              <div className="ml-auto">
                {sbmlBadgeContent}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <CardTitle>Hasil Cek SBML</CardTitle>
            {data.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {data.length} Petugas Ditemukan
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {filterBulan && filterTahun 
                  ? "Tidak ada data untuk periode yang dipilih" 
                  : "Pilih bulan dan tahun untuk menampilkan data"
                }
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="min-w-[150px]">Nama Mitra</TableHead>
                    <TableHead className="min-w-[120px]">NIK</TableHead>
                    <TableHead className="text-right min-w-[120px]">Pendataan</TableHead>
                    <TableHead className="text-right min-w-[120px]">Pemeriksaan</TableHead>
                    <TableHead className="text-right min-w-[120px]">Pengolahan</TableHead>
                    <TableHead className="text-right min-w-[140px]">Pekerjaan Provinsi</TableHead>
                    <TableHead className="text-right min-w-[120px]">Jumlah</TableHead>
                    <TableHead className="w-20 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={`${row.namaMitra}_${row.nik}`} className={row.isExceeded ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{row.no}</TableCell>
                      <TableCell className="font-medium min-w-[150px]">{row.namaMitra}</TableCell>
                      <TableCell className="font-mono text-xs min-w-[120px]">{row.nik || "-"}</TableCell>
                      
                      {/* Kolom Pendataan dengan Tooltip */}
                      <TableCell className="text-right">
                        <HonorTooltip 
                          details={row.detailPendataan} 
                          title="Detail Pendataan"
                          isExceeded={row.pendataan > (sbmlData?.sbmlPendata || 0)}
                          rowIndex={index}
                        >
                          <span className={row.pendataan > (sbmlData?.sbmlPendata || 0) ? "text-red-600 font-semibold" : ""}>
                            {formatRupiah(row.pendataan)}
                          </span>
                        </HonorTooltip>
                      </TableCell>
                      
                      {/* Kolom Pemeriksaan dengan Tooltip */}
                      <TableCell className="text-right">
                        <HonorTooltip 
                          details={row.detailPemeriksaan} 
                          title="Detail Pemeriksaan"
                          isExceeded={row.pemeriksaan > (sbmlData?.sbmlPemeriksa || 0)}
                          rowIndex={index}
                        >
                          <span className={row.pemeriksaan > (sbmlData?.sbmlPemeriksa || 0) ? "text-red-600 font-semibold" : ""}>
                            {formatRupiah(row.pemeriksaan)}
                          </span>
                        </HonorTooltip>
                      </TableCell>
                      
                      {/* Kolom Pengolahan dengan Tooltip */}
                      <TableCell className="text-right">
                        <HonorTooltip 
                          details={row.detailPengolahan} 
                          title="Detail Pengolahan"
                          isExceeded={row.pengolahan > (sbmlData?.sbmlPengolah || 0)}
                          rowIndex={index}
                        >
                          <span className={row.pengolahan > (sbmlData?.sbmlPengolah || 0) ? "text-red-600 font-semibold" : ""}>
                            {formatRupiah(row.pengolahan)}
                          </span>
                        </HonorTooltip>
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          type="text"
                          value={row.pekerjaanProvinsi === 0 ? "" : row.pekerjaanProvinsi.toLocaleString('id-ID')}
                          onChange={(e) => handlePekerjaanProvinsiChange(index, e.target.value)}
                          className="text-right min-w-[100px] h-8 text-sm"
                          placeholder="0"
                        />
                      </TableCell>
                      
                      <TableCell className={`text-right font-semibold ${row.jumlah > (sbmlData?.sbmlPendata || 0) ? "text-red-600" : ""}`}>
                        {formatRupiah(row.jumlah)}
                      </TableCell>
                      
                      <TableCell className="text-center">
                        {row.isExceeded ? (
                          <StatusTooltip content={row.warnings} rowIndex={index}>
                            <div className="flex justify-center">
                              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            </div>
                          </StatusTooltip>
                        ) : (
                          <div className="flex justify-center">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Baris Total */}
                  {totals && (
                    <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                      <TableCell colSpan={3} className="text-right font-bold">
                        TOTAL
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatRupiah(totals.pendataan)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatRupiah(totals.pemeriksaan)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatRupiah(totals.pengolahan)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatRupiah(totals.pekerjaanProvinsi)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {formatRupiah(totals.jumlah)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Tooltip component untuk status melebihi SBML
const StatusTooltip = ({ 
  content, 
  children,
  rowIndex 
}: { 
  content: string[]; 
  children: React.ReactNode;
  rowIndex: number;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {showTooltip && (
        <div className={`absolute z-50 w-80 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg ${
          rowIndex < 4 ? 'top-full mt-2' : 'bottom-full mb-2'
        } left-1/2 transform -translate-x-1/2`}>
          <div className="font-semibold mb-2 text-center">Melebihi SBML:</div>
          <div className="space-y-1">
            {content.map((warning, index) => (
              <div key={index} className="text-xs break-words">• {warning}</div>
            ))}
          </div>
          <div className={`absolute w-3 h-3 bg-gray-900 transform rotate-45 ${
            rowIndex < 4 
              ? 'bottom-full -translate-y-1/2' 
              : 'top-full -translate-y-1/2'
          } left-1/2 -translate-x-1/2`}></div>
        </div>
      )}
    </div>
  );
};

// Komponen Tooltip untuk Detail Honor
const HonorTooltip = ({ 
  details, 
  title, 
  isExceeded,
  rowIndex,
  children 
}: { 
  details: { namaKegiatan: string; nilaiRealisasi: string }[];
  title: string;
  isExceeded: boolean;
  rowIndex: number;
  children: React.ReactNode;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (details.length === 0) {
    return <div className="text-right">{children}</div>;
  }

  return (
    <div className="relative inline-block text-right w-full">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {showTooltip && (
        <div className={`absolute z-50 w-96 p-3 text-sm rounded-lg shadow-lg ${
          rowIndex < 4 ? 'top-full mt-2' : 'bottom-full mb-2'
        } left-1/2 transform -translate-x-1/2 ${
          isExceeded ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'
        }`}>
          <div className={`font-semibold mb-2 text-center ${
            isExceeded ? 'text-red-700' : 'text-gray-700'
          }`}>
            {title}
          </div>
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="text-xs border-b border-gray-100 pb-2 last:border-b-0">
                <div className="font-medium text-gray-900 mb-1 break-words leading-tight max-w-full">
                  {detail.namaKegiatan}
                </div>
                <div className="text-green-600 font-semibold">
                  {detail.nilaiRealisasi}
                </div>
              </div>
            ))}
          </div>
          <div className={`absolute w-3 h-3 transform rotate-45 ${
            rowIndex < 4 
              ? 'bottom-full -translate-y-1/2 border-b border-r' 
              : 'top-full -translate-y-1/2 border-t border-l'
          } left-1/2 -translate-x-1/2 ${
            isExceeded 
              ? 'bg-red-50 border-red-200' 
              : 'bg-white border-gray-200'
          }`}></div>
        </div>
      )}
    </div>
  );
};