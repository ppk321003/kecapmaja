import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Search, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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
  role: string;
  honor: number;
  periode: string;
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
  pendataan: number;
  pemeriksaan: number;
  pengolahan: number;
  pekerjaanProvinsi: number;
  jumlah: number;
  isExceeded: boolean;
  warnings: string[];
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
    if (!honorStr || honorStr === '-') return 0;
    // Handle berbagai format: "704.000,-", "704.000", "704000"
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
        // Cari SBML berdasarkan tahun yang difilter
        const sbmlForYear = rows.find((row: any[]) => row[1] === tahun);
        
        if (sbmlForYear) {
          setSbmlData({
            tahunAnggaran: sbmlForYear[1],
            sbmlPendata: parseHonor(sbmlForYear[2]),
            sbmlPemeriksa: parseHonor(sbmlForYear[3]),
            sbmlPengolah: parseHonor(sbmlForYear[4]),
          });
        } else {
          // Fallback ke data terbaru jika tahun tidak ditemukan
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

  // Validasi data - dioptimalkan dan dipisahkan
  const validateData = useCallback((item: CekSBMLRow, sbml: SBMLData) => {
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

  // Process data tugas - dioptimalkan dan dipisahkan
  const processTugasData = useCallback((tugasRows: any[], periodeFilter: string) => {
    const petugasTugas: PetugasTugas[] = [];
    let matchCount = 0;

    // Pre-compute filter untuk performa
    const filterLower = periodeFilter.toLowerCase();

    for (let rowIndex = 1; rowIndex < tugasRows.length; rowIndex++) {
      const row = tugasRows[rowIndex];
      if (!row || row.length < 18) continue;

      try {
        const periode = row[2]?.toString() || "";
        const role = row[3]?.toString() || "";
        const namaPetugas = row[14]?.toString() || "";
        const nilaiRealisasi = row[17]?.toString() || "";

        // Optimasi: skip early jika data tidak memenuhi kriteria
        if (!periode.toLowerCase().includes(filterLower) || 
            !namaPetugas || 
            namaPetugas === '-' || 
            !nilaiRealisasi || 
            nilaiRealisasi === '-') {
          continue;
        }

        matchCount++;
        
        // Parse nama dan honor
        const namaList = namaPetugas.split('|').map((n: string) => n.trim()).filter(n => n && n !== '-');
        const honorList = nilaiRealisasi.split('|').map((h: string) => parseHonor(h.trim()));

        // Map setiap nama ke honor yang sesuai
        for (let i = 0; i < namaList.length; i++) {
          if (namaList[i] && honorList[i] !== undefined) {
            petugasTugas.push({
              nama: namaList[i].trim(),
              role: role.trim(),
              honor: honorList[i] || 0,
              periode: periode,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing row ${rowIndex + 2}:`, error);
      }
    }

    return { petugasTugas, matchCount };
  }, [parseHonor]);

  // Group data - dioptimalkan
  const groupPetugasData = useCallback((petugasTugas: PetugasTugas[]) => {
    const groupedData = new Map<string, CekSBMLRow>();

    for (const petugas of petugasTugas) {
      const key = petugas.nama.toLowerCase();
      
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          no: groupedData.size + 1,
          namaMitra: petugas.nama,
          pendataan: 0,
          pemeriksaan: 0,
          pengolahan: 0,
          pekerjaanProvinsi: 0,
          jumlah: 0,
          isExceeded: false,
          warnings: [],
        });
      }

      const existing = groupedData.get(key)!;
      const roleLower = petugas.role.toLowerCase();
      
      // Assign honor berdasarkan role
      if (roleLower.includes('pendataan') || roleLower.includes('pendata')) {
        existing.pendataan += petugas.honor;
      } else if (roleLower.includes('pemeriksaan') || roleLower.includes('pemeriksa')) {
        existing.pemeriksaan += petugas.honor;
      } else if (roleLower.includes('pengolah') || roleLower.includes('pengolahan')) {
        existing.pengolahan += petugas.honor;
      } else {
        existing.pendataan += petugas.honor;
      }
    }

    return groupedData;
  }, []);

  // Fetch data petugas bertugas - dioptimalkan
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
      setData([]);
      
      const periodeFilter = `${filterBulan} ${filterTahun}`;

      // Paralel fetching untuk performa lebih baik
      const [sbmlPromise, tugasPromise, masterPromise] = await Promise.allSettled([
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

      // Handle tugas data
      if (tugasPromise.status === 'rejected') throw tugasPromise.reason;
      const tugasResponse = tugasPromise.value;
      if (tugasResponse.error) throw tugasResponse.error;

      const tugasRows = tugasResponse.data?.values || [];
      if (tugasRows.length <= 1) {
        toast({
          title: "Data Tidak Ditemukan",
          description: `Tidak ada data tugas untuk periode ${periodeFilter}`,
          variant: "destructive",
        });
        return;
      }

      // Process data dengan optimasi
      const { petugasTugas, matchCount } = processTugasData(tugasRows, periodeFilter);

      if (petugasTugas.length === 0) {
        toast({
          title: "Data Tidak Ditemukan",
          description: `Tidak ada data tugas untuk periode ${periodeFilter}`,
          variant: "destructive",
        });
        return;
      }

      // Group data
      const groupedData = groupPetugasData(petugasTugas);

      // Calculate totals and validate
      const finalData = Array.from(groupedData.values()).map(item => {
        item.jumlah = item.pendataan + item.pemeriksaan + item.pengolahan + item.pekerjaanProvinsi;
        
        if (sbmlData) {
          const warnings = validateData(item, sbmlData);
          item.warnings = warnings;
          item.isExceeded = warnings.length > 0;
        }
        
        return item;
      });

      setData(finalData);

      toast({
        title: "Sukses",
        description: `Data berhasil dimuat untuk periode ${periodeFilter} - ${finalData.length} petugas ditemukan`,
      });

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
  }, [filterBulan, filterTahun, fetchSBMLData, processTugasData, groupPetugasData, validateData, sbmlData, toast]);

  // Handle input manual perubahan - dioptimalkan
  const handlePekerjaanProvinsiChange = useCallback((index: number, value: string) => {
    const numericValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
    
    setData(prev => {
      const newData = [...prev];
      const item = newData[index];
      
      item.pekerjaanProvinsi = numericValue;
      item.jumlah = item.pendataan + item.pemeriksaan + item.pengolahan + numericValue;

      if (sbmlData) {
        const warnings = validateData(item, sbmlData);
        item.warnings = warnings;
        item.isExceeded = warnings.length > 0;
      }

      return newData;
    });
  }, [sbmlData, validateData]);

  // Update SBML ketika tahun berubah
  useEffect(() => {
    if (filterTahun) {
      fetchSBMLData(filterTahun);
    }
  }, [filterTahun, fetchSBMLData]);

  const handleSearch = () => {
    fetchData();
  };

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bulan</label>
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {bulanList.map(bulan => (
                    <SelectItem key={bulan} value={bulan}>
                      {bulan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tahun</label>
              <Select value={filterTahun} onValueChange={setFilterTahun}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {tahunList.map(tahun => (
                    <SelectItem key={tahun} value={tahun}>
                      {tahun}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Memuat..." : "Cari Data"}
            </Button>

            {sbmlData && (
              <div className="ml-auto">
                <Badge variant="outline" className="text-xs py-1 px-2 bg-blue-50 border-blue-200 max-w-xs">
                  <span className="font-semibold">SBML {sbmlData.tahunAnggaran}:</span>{' '}
                  <span>Pendata {formatRupiah(sbmlData.sbmlPendata)}</span>
                </Badge>
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
                    <TableRow key={row.namaMitra} className={row.isExceeded ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{row.no}</TableCell>
                      <TableCell className="font-medium min-w-[150px]">{row.namaMitra}</TableCell>
                      
                      <TableCell className={`text-right ${row.pendataan > (sbmlData?.sbmlPendata || 0) ? "text-red-600 font-semibold" : ""}`}>
                        {formatRupiah(row.pendataan)}
                      </TableCell>
                      
                      <TableCell className={`text-right ${row.pemeriksaan > (sbmlData?.sbmlPemeriksa || 0) ? "text-red-600 font-semibold" : ""}`}>
                        {formatRupiah(row.pemeriksaan)}
                      </TableCell>
                      
                      <TableCell className={`text-right ${row.pengolahan > (sbmlData?.sbmlPengolah || 0) ? "text-red-600 font-semibold" : ""}`}>
                        {formatRupiah(row.pengolahan)}
                      </TableCell>
                      
                      <TableCell>
                        <Input
                          type="text"
                          value={row.pekerjaanProvinsi === 0 ? "" : row.pekerjaanProvinsi.toLocaleString('id-ID')}
                          onChange={(e) => handlePekerjaanProvinsiChange(index, e.target.value)}
                          className="text-right min-w-[100px]"
                          placeholder="0"
                        />
                      </TableCell>
                      
                      <TableCell className={`text-right font-semibold ${row.jumlah > (sbmlData?.sbmlPendata || 0) ? "text-red-600" : ""}`}>
                        {formatRupiah(row.jumlah)}
                      </TableCell>
                      
                      <TableCell className="text-center">
                        {row.isExceeded ? (
                          <Tooltip content={row.warnings}>
                            <div className="flex justify-center">
                              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            </div>
                          </Tooltip>
                        ) : (
                          <div className="flex justify-center">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Tooltip component yang diperbaiki
const Tooltip = ({ content, children }: { content: string[]; children: React.ReactNode }) => {
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
        <div className="absolute z-50 w-72 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <div className="font-semibold mb-2">Melebihi SBML:</div>
          <div className="space-y-1">
            {content.map((warning, index) => (
              <div key={index} className="text-xs">• {warning}</div>
            ))}
          </div>
          <div className="absolute w-3 h-3 bg-gray-900 transform rotate-45 bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
        </div>
      )}
    </div>
  );
};