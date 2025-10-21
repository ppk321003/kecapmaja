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
    // Handle format seperti "704.000,-" atau "704000"
    const cleaned = honorStr.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  };

  // Fetch data SBML untuk validasi
  const fetchSBMLData = async () => {
    try {
      console.log("Fetching SBML data...");
      const { data: sbmlResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SBML_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (error) {
        console.error("SBML fetch error:", error);
        throw error;
      }

      console.log("SBML response:", sbmlResponse);

      const rows = sbmlResponse?.values || [];
      if (rows.length > 1) {
        const currentYear = new Date().getFullYear().toString();
        const currentSBML = rows.find((row: any[]) => row[1] === currentYear);
        
        if (currentSBML) {
          const sbml = {
            tahunAnggaran: currentSBML[1],
            sbmlPendata: parseHonor(currentSBML[2]),
            sbmlPemeriksa: parseHonor(currentSBML[3]),
            sbmlPengolah: parseHonor(currentSBML[4]),
          };
          console.log("SBML data found:", sbml);
          setSbmlData(sbml);
        } else {
          console.log("No SBML data for current year");
          // Fallback: use first available SBML data
          if (rows.length > 1) {
            const firstSBML = rows[1];
            const sbml = {
              tahunAnggaran: firstSBML[1],
              sbmlPendata: parseHonor(firstSBML[2]),
              sbmlPemeriksa: parseHonor(firstSBML[3]),
              sbmlPengolah: parseHonor(firstSBML[4]),
            };
            console.log("Using first available SBML:", sbml);
            setSbmlData(sbml);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching SBML data:", error);
      toast({
        title: "Error SBML",
        description: "Gagal memuat data SBML: " + error.message,
        variant: "destructive",
      });
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
      console.log("Starting data fetch...");
      
      const periodeFilter = `${filterBulan} ${filterTahun}`;
      console.log("Filter periode:", periodeFilter);

      // Fetch data tugas
      console.log("Fetching tugas data...");
      const { data: tugasResponse, error: tugasError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (tugasError) {
        console.error("Tugas fetch error:", tugasError);
        throw tugasError;
      }

      // Fetch data master petugas
      console.log("Fetching master data...");
      const { data: masterResponse, error: masterError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: "read",
          range: "MASTER.MITRA",
        },
      });

      if (masterError) {
        console.error("Master fetch error:", masterError);
        throw masterError;
      }

      const tugasRows = tugasResponse?.values || [];
      const masterRows = masterResponse?.values || [];

      console.log("Tugas rows:", tugasRows.length);
      console.log("Master rows:", masterRows.length);
      console.log("Sample tugas row:", tugasRows[1]); // Row pertama setelah header

      // Process data
      const petugasTugas: PetugasTugas[] = [];
      const masterPetugas: Map<string, MasterPetugas> = new Map();

      // Build master petugas map - Nama di kolom C (index 2)
      masterRows.slice(1).forEach((row: any[], index: number) => {
        if (row[2]) { // Nama di kolom C
          const nama = row[2].toString().trim();
          masterPetugas.set(nama.toLowerCase(), {
            nama: nama,
            nik: row[1]?.toString() || "", // Kolom B
            pekerjaan: row[3]?.toString() || "", // Kolom D
            alamat: row[4]?.toString() || "", // Kolom E
            bank: row[5]?.toString() || "", // Kolom F
            rekening: row[6]?.toString() || "", // Kolom G
            kecamatan: row[7]?.toString() || "", // Kolom H
          });
        }
      });

      console.log("Master petugas count:", masterPetugas.size);
      console.log("Sample master data:", Array.from(masterPetugas.values())[0]);

      // Process tugas data - SESUAI STRUKTUR SPREADSHEET ANDA
      tugasRows.slice(1).forEach((row: any[], rowIndex: number) => {
        try {
          // Sesuaikan dengan struktur kolom yang Anda berikan
          const periode = row[2]?.toString() || ""; // Kolom C: Periode (Bulan) SPK
          const role = row[3]?.toString() || ""; // Kolom D: Jenis Pekerjaan
          const namaPetugas = row[13]?.toString() || ""; // Kolom N: Nama Petugas
          const nilaiRealisasi = row[16]?.toString() || ""; // Kolom Q: Nilai Realisasi

          console.log(`Row ${rowIndex + 2}: Periode="${periode}", Role="${role}", Nama="${namaPetugas}", Nilai="${nilaiRealisasi}"`);

          if (periode === periodeFilter && namaPetugas && nilaiRealisasi) {
            console.log(`MATCH FOUND for periode ${periodeFilter}`);
            
            const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
            const honorList = nilaiRealisasi.split(' | ').map(parseHonor);

            console.log(`Parsed - Nama:`, namaList);
            console.log(`Parsed - Honor:`, honorList);

            namaList.forEach((nama: string, index: number) => {
              if (nama && honorList[index] !== undefined) {
                petugasTugas.push({
                  nama: nama.trim(),
                  role: role.trim(),
                  honor: honorList[index] || 0,
                  periode: periode,
                });
                console.log(`Added petugas: ${nama} dengan honor: ${honorList[index]}`);
              }
            });
          }
        } catch (error) {
          console.error(`Error processing row ${rowIndex + 2}:`, error, row);
        }
      });

      console.log("Total petugas tugas found:", petugasTugas.length);
      console.log("Petugas tugas details:", petugasTugas);

      // Transform to CekSBMLRow format - Group by nama dan role
      const groupedData = new Map<string, CekSBMLRow>();

      petugasTugas.forEach((petugas) => {
        const key = petugas.nama.toLowerCase();
        
        if (!groupedData.has(key)) {
          const masterData = masterPetugas.get(key);
          if (masterData) {
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
          } else {
            console.log(`Master data not found for: ${petugas.nama}`);
            // Tetap tambahkan meski tidak ada di master
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
        }

        const existing = groupedData.get(key)!;
        
        // Assign honor berdasarkan role
        if (petugas.role.includes('Pendataan')) {
          existing.pendataan += petugas.honor;
        } else if (petugas.role.includes('Pemeriksaan')) {
          existing.pemeriksaan += petugas.honor;
        } else if (petugas.role.includes('Pengolah')) {
          existing.pengolahan += petugas.honor;
        } else {
          // Default ke pendataan jika role tidak jelas
          existing.pendataan += petugas.honor;
        }
      });

      console.log("Grouped data count:", groupedData.size);
      console.log("Grouped data:", Array.from(groupedData.values()));

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
      console.log("Final data set:", finalData);

      if (finalData.length > 0) {
        toast({
          title: "Sukses",
          description: `Data berhasil dimuat untuk periode ${periodeFilter} - ${finalData.length} petugas ditemukan`,
        });
      } else {
        toast({
          title: "Info",
          description: `Tidak ada data untuk periode ${periodeFilter}`,
          variant: "default",
        });
      }

    } catch (error: any) {
      console.error("Fetch data error:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log("Loading finished");
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

  useEffect(() => {
    fetchSBMLData();
  }, []);

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

            {sbmlData && (
              <Badge variant="outline" className="ml-auto">
                SBML {sbmlData.tahunAnggaran}: 
                Pendata {formatRupiah(sbmlData.sbmlPendata)} | 
                Pemeriksa {formatRupiah(sbmlData.sbmlPemeriksa)} | 
                Pengolah {formatRupiah(sbmlData.sbmlPengolah)}
              </Badge>
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
              <Badge variant="secondary">
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
                      
                      {/* Petugas Pendataan Lapangan */}
                      <TableCell className={`text-right ${row.pendataan > (sbmlData?.sbmlPendata || 0) ? "text-red-600 font-semibold" : ""}`}>
                        {formatRupiah(row.pendataan)}
                      </TableCell>
                      
                      {/* Petugas Pemeriksaan Lapangan */}
                      <TableCell className={`text-right ${row.pemeriksaan > (sbmlData?.sbmlPemeriksa || 0) ? "text-red-600 font-semibold" : ""}`}>
                        {formatRupiah(row.pemeriksaan)}
                      </TableCell>
                      
                      {/* Petugas Pengolahan */}
                      <TableCell className={`text-right ${row.pengolahan > (sbmlData?.sbmlPengolah || 0) ? "text-red-600 font-semibold" : ""}`}>
                        {formatRupiah(row.pengolahan)}
                      </TableCell>
                      
                      {/* Pekerjaan dari Provinsi - Editable */}
                      <TableCell>
                        <Input
                          type="text"
                          value={row.pekerjaanProvinsi === 0 ? "" : row.pekerjaanProvinsi.toLocaleString('id-ID')}
                          onChange={(e) => handlePekerjaanProvinsiChange(index, e.target.value)}
                          className="text-right"
                          placeholder="0"
                        />
                      </TableCell>
                      
                      {/* Jumlah */}
                      <TableCell className={`text-right font-semibold ${row.jumlah > (sbmlData?.sbmlPendata || 0) ? "text-red-600" : ""}`}>
                        {formatRupiah(row.jumlah)}
                      </TableCell>
                      
                      {/* Status */}
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

// Tooltip component untuk warning details
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