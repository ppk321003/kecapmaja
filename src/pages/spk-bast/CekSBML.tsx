import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Search, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
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

  // Format currency helper
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Parse honor dari string format "704.000,-"
  const parseHonor = (honorStr: string): number => {
    if (!honorStr) return 0;
    const cleaned = honorStr.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  };

  // Fetch data SBML untuk validasi - DIPERBAIKI: ambil berdasarkan tahun filter
  const fetchSBMLData = async (tahun: string) => {
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
          console.log(`✅ SBML ditemukan untuk tahun ${tahun}:`, sbmlForYear);
        } else {
          // Fallback ke data terbaru jika tahun tidak ditemukan
          const latestSBML = rows[1]; // Ambil data pertama setelah header
          setSbmlData({
            tahunAnggaran: latestSBML[1],
            sbmlPendata: parseHonor(latestSBML[2]),
            sbmlPemeriksa: parseHonor(latestSBML[3]),
            sbmlPengolah: parseHonor(latestSBML[4]),
          });
          console.log(`⚠️ SBML untuk tahun ${tahun} tidak ditemukan, menggunakan ${latestSBML[1]}`);
        }
      }
    } catch (error: any) {
      console.error("Error fetching SBML data:", error);
    }
  };

  // Fetch data petugas bertugas
  const fetchData = async () => {
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
      console.log("🔍 Mencari data untuk periode:", periodeFilter);

      // Ambil SBML untuk tahun yang difilter
      await fetchSBMLData(filterTahun);

      // Fetch data tugas
      const { data: tugasResponse, error: tugasError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (tugasError) throw tugasError;

      // Fetch data master petugas
      const { data: masterResponse, error: masterError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: "read",
          range: "MASTER.MITRA",
        },
      });

      if (masterError) throw masterError;

      const tugasRows = tugasResponse?.values || [];
      const masterRows = masterResponse?.values || [];

      console.log("📊 Total rows tugas:", tugasRows.length);
      console.log("📊 Total rows master:", masterRows.length);

      // Process data
      const petugasTugas: PetugasTugas[] = [];
      const masterPetugas: Map<string, MasterPetugas> = new Map();

      // Build master petugas map - Nama di kolom C (index 2)
      masterRows.slice(1).forEach((row: any[]) => {
        if (row[2]) {
          const nama = row[2].toString().trim();
          masterPetugas.set(nama.toLowerCase(), {
            nama: nama,
            nik: row[1]?.toString() || "",
            pekerjaan: row[3]?.toString() || "",
            alamat: row[4]?.toString() || "",
            bank: row[5]?.toString() || "",
            rekening: row[6]?.toString() || "",
            kecamatan: row[7]?.toString() || "",
          });
        }
      });

      console.log("👥 Master petugas loaded:", masterPetugas.size);

      // PROCESS TUGAS DATA
      tugasRows.slice(1).forEach((row: any[], rowIndex: number) => {
        try {
          const periode = row[2]?.toString() || "";        // Kolom C: Periode (Bulan) SPK
          const role = row[3]?.toString() || "";           // Kolom D: Jenis Pekerjaan  
          const namaPetugas = row[14]?.toString() || "";   // Kolom O: Nama Petugas
          const nilaiRealisasi = row[17]?.toString() || ""; // Kolom R: Nilai Realisasi

          if (periode === periodeFilter && namaPetugas && nilaiRealisasi) {
            console.log("🎯 DATA COCOK DITEMUKAN!");
            
            // Parse nama dan honor yang dipisah " | "
            const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
            const honorList = nilaiRealisasi.split(' | ').map(parseHonor);

            console.log("👤 Nama parsed:", namaList);
            console.log("💰 Honor parsed:", honorList);

            // Map setiap nama ke honor yang sesuai
            namaList.forEach((nama: string, index: number) => {
              if (nama && honorList[index] !== undefined) {
                petugasTugas.push({
                  nama: nama.trim(),
                  role: role.trim(),
                  honor: honorList[index] || 0,
                  periode: periode,
                });
                console.log(`✅ Ditambahkan: ${nama} - ${role} - Rp ${honorList[index]}`);
              }
            });
          }
        } catch (error) {
          console.error(`❌ Error processing row ${rowIndex + 2}:`, error);
        }
      });

      console.log("📈 Total petugas tugas ditemukan:", petugasTugas.length);

      // Transform to CekSBMLRow format
      const groupedData = new Map<string, CekSBMLRow>();

      petugasTugas.forEach((petugas) => {
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
        
        // Assign honor berdasarkan role
        if (petugas.role.toLowerCase().includes('pendataan')) {
          existing.pendataan += petugas.honor;
        } else if (petugas.role.toLowerCase().includes('pemeriksaan')) {
          existing.pemeriksaan += petugas.honor;
        } else if (petugas.role.toLowerCase().includes('pengolah')) {
          existing.pengolahan += petugas.honor;
        }
      });

      // Calculate totals and validate
      const finalData = Array.from(groupedData.values()).map(item => {
        item.jumlah = item.pendataan + item.pemeriksaan + item.pengolahan + item.pekerjaanProvinsi;
        
        // Validasi
        const warnings: string[] = [];
        if (sbmlData) {
          if (item.pendataan > sbmlData.sbmlPendata) {
            warnings.push(`Pendataan melebihi SBML (${formatRupiah(sbmlData.sbmlPendata)})`);
          }
          if (item.pemeriksaan > sbmlData.sbmlPemeriksa) {
            warnings.push(`Pemeriksaan melebihi SBML (${formatRupiah(sbmlData.sbmlPemeriksa)})`);
          }
          if (item.pengolahan > sbmlData.sbmlPengolah) {
            warnings.push(`Pengolahan melebihi SBML (${formatRupiah(sbmlData.sbmlPengolah)})`);
          }
          if (item.jumlah > sbmlData.sbmlPendata) {
            warnings.push(`Total melebihi SBML Pendata (${formatRupiah(sbmlData.sbmlPendata)})`);
          }
        }
        
        item.warnings = warnings;
        item.isExceeded = warnings.length > 0;
        
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
  };

  // Handle input manual perubahan
  const handlePekerjaanProvinsiChange = (index: number, value: string) => {
    const numericValue = parseInt(value.replace(/[^\d]/g, '')) || 0;
    
    setData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        pekerjaanProvinsi: numericValue,
        jumlah: newData[index].pendataan + newData[index].pemeriksaan + newData[index].pengolahan + numericValue,
      };

      // Re-validate after change
      if (sbmlData) {
        const warnings: string[] = [];
        const item = newData[index];
        
        if (item.pendataan > sbmlData.sbmlPendata) {
          warnings.push(`Pendataan melebihi SBML (${formatRupiah(sbmlData.sbmlPendata)})`);
        }
        if (item.pemeriksaan > sbmlData.sbmlPemeriksa) {
          warnings.push(`Pemeriksaan melebihi SBML (${formatRupiah(sbmlData.sbmlPemeriksa)})`);
        }
        if (item.pengolahan > sbmlData.sbmlPengolah) {
          warnings.push(`Pengolahan melebihi SBML (${formatRupiah(sbmlData.sbmlPengolah)})`);
        }
        if (item.jumlah > sbmlData.sbmlPendata) {
          warnings.push(`Total melebihi SBML Pendata (${formatRupiah(sbmlData.sbmlPendata)})`);
        }
        
        newData[index].warnings = warnings;
        newData[index].isExceeded = warnings.length > 0;
      }

      return newData;
    });
  };

  // Update SBML ketika tahun berubah
  useEffect(() => {
    if (filterTahun) {
      fetchSBMLData(filterTahun);
    }
  }, [filterTahun]);

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
          <div className="flex gap-4 items-end">
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

            {/* SBML Badge dengan font yang lebih besar */}
            {sbmlData && (
              <div className="ml-auto">
                <Badge variant="outline" className="text-sm py-2 px-3 bg-blue-50 border-blue-200">
                  <span className="font-semibold">SBML {sbmlData.tahunAnggaran}:</span>{' '}
                  <span className="text-base font-bold">
                    Pendata {formatRupiah(sbmlData.sbmlPendata)} | 
                    Pemeriksa {formatRupiah(sbmlData.sbmlPemeriksa)} | 
                    Pengolah {formatRupiah(sbmlData.sbmlPengolah)}
                  </span>
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
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama Mitra</TableHead>
                    <TableHead className="text-right">Petugas Pendataan Lapangan</TableHead>
                    <TableHead className="text-right">Petugas Pemeriksaan Lapangan</TableHead>
                    <TableHead className="text-right">Petugas Pengolahan</TableHead>
                    <TableHead className="text-right">Pekerjaan dari Provinsi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={row.namaMitra} className={row.isExceeded ? "bg-red-50" : ""}>
                      <TableCell>{row.no}</TableCell>
                      <TableCell className="font-medium">{row.namaMitra}</TableCell>
                      
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
                          className="text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      
                      <TableCell className={`text-right font-semibold ${row.jumlah > (sbmlData?.sbmlPendata || 0) ? "text-red-600" : ""}`}>
                        {formatRupiah(row.jumlah)}
                      </TableCell>
                      
                      <TableCell>
                        {row.isExceeded ? (
                          <Tooltip content={row.warnings.join(', ')}>
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          </Tooltip>
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
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

// Tooltip component
const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      {showTooltip && (
        <div className="absolute z-50 w-64 p-2 text-xs text-white bg-gray-900 rounded shadow-lg -top-12 left-1/2 transform -translate-x-1/2">
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
};