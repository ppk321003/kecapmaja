import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Loader2, RefreshCw, Zap, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

interface KegiatanSPJData {
  no: number;
  namaKegiatan: string;
  penanggungjawab: string;
  jumlahPetugas: number;
  namaPetugasList: string[];
  jenisPekerjaan: 'Petugas Pendataan Lapangan' | 'Petugas Pemeriksaan Lapangan' | 'Petugas Pengolahan';
  nilaiRealisasi: number;
  status: 'Kirim ke PPK' | 'Belum Kirim';
  periode?: string;
  [key: string]: string | number | string[] | undefined;
}

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";

export default function GenerateSPJHonorMitra() {
  const satkerConfig = useSatkerConfigContext();
  const satkerNama = useMemo(() => {
    return satkerConfig?.getUserSatkerConfig()?.satker_nama || 'BPS';
  }, [satkerConfig]);

  // Get dynamic sheet ID from satker config - ambil dari entrikegiatan_sheet_id (kolom E satker_config)
  const dynamicSheetId = useMemo(() => {
    return satkerConfig?.getUserSatkerSheetId('entrikegiatan') || TUGAS_SPREADSHEET_ID;
  }, [satkerConfig]);

  // Get current month and year
  const currentDate = new Date();
  const currentMonthName = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][currentDate.getMonth()];
  const currentYear = currentDate.getFullYear().toString();

  const [data, setData] = useState<KegiatanSPJData[]>([]);
  const [filteredData, setFilteredData] = useState<KegiatanSPJData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBulan, setSelectedBulan] = useState(currentMonthName);
  const [selectedTahun, setSelectedTahun] = useState(currentYear);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Get user role from localStorage
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const userData = localStorage.getItem('simaja_user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const canAccessFeatures = () => {
    if (!currentUser) return false;
    const allowedRoles = ['Pejabat Pembuat Komitmen', 'Bendahara', 'Pejabat Pengadaan', 'Admin'];
    return allowedRoles.includes(currentUser.role);
  };

  const bulanOptions = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tahunOptions = Array.from({ length: 7 }, (_, i) => (2024 + i).toString());

  // Fetch data dari Google Sheets
  const fetchDataFromSheets = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Memulai fetch data SPJ Honor dari Google Sheets...');

      const rangesToTry = [
        "Rekapitulasi!A:Z",
        "A:Z",
        "Sheet1!A:Z",
        "Rekapitulasi"
      ];

      let sheetData = null;
      let error = null;

      for (const range of rangesToTry) {
        console.log(`🔍 Mencoba range: ${range}`);
        const result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: dynamicSheetId,
            operation: "read",
            range: range
          }
        });

        if (!result.error && result.data?.values) {
          sheetData = result.data;
          console.log(`✅ Berhasil dengan range: ${range}`);
          break;
        } else {
          error = result.error;
          console.log(`❌ Gagal dengan range: ${range}`, result.error);
        }
      }

      if (!sheetData) {
        throw error || new Error('Tidak ada data ditemukan di spreadsheet');
      }

      const rows = sheetData.values || [];
      if (rows.length === 0) {
        throw new Error('Tidak ada data ditemukan di spreadsheet');
      }

      console.log('📊 Data mentah dari Google Sheets:', rows);
      console.log('📋 Headers:', rows[0]);

      // Process data
      const headers = rows[0];
      const dataRows = rows.slice(1);

      const getColumnIndex = (possibleHeaders: string[]) => {
        for (const header of possibleHeaders) {
          const index = headers.findIndex((h: string) =>
            h && h.toString().toLowerCase().includes(header.toLowerCase())
          );
          if (index !== -1) return index;
        }
        return -1;
      };

      // Mapping kolom struktur entrikegiatan sheet sesuai EntriTarget.tsx:
      // A/0: No
      // B/1: Role (Penanggungjawab)
      // C/2: Periode (Bulan) SPK - format: "Januari 2026"
      // D/3: Jenis Pekerjaan
      // E/4: Nama Kegiatan
      // N/13: Nama Petugas (untuk count jumlah)
      // R/17: Total Realisasi
      // T/19: Keterangan (Status)
      const noIndex = 0; // Kolom A
      const roleIndex = 1; // Kolom B
      const periodeIndex = 2; // Kolom C
      const jenisIndex = getColumnIndex(['jenis', 'pekerjaan']) || 3; // Kolom D
      const namaKegiatanIndex = getColumnIndex(['kegiatan', 'nama kegiatan']) || 4; // Kolom E
      const namaPetugasIndex = getColumnIndex(['petugas', 'nama petugas']) || 13; // Kolom N - berisi "Nama1 | Nama2 | ..."
      const nilaiIndex = getColumnIndex(['total', 'realisasi']) || 17; // Kolom R - Total Realisasi
      const statusIndex = getColumnIndex(['keterangan', 'status']) || 19; // Kolom T - Keterangan

      // DEBUG: Logging untuk verify column indices
      console.log('📋 Column Mapping:');
      console.log(`  noIndex: ${noIndex}, roleIndex: ${roleIndex}, periodeIndex: ${periodeIndex}`);
      console.log(`  jenisIndex: ${jenisIndex}, namaKegiatanIndex: ${namaKegiatanIndex}`);
      console.log(`  namaPetugasIndex: ${namaPetugasIndex}, nilaiIndex: ${nilaiIndex}, statusIndex: ${statusIndex}`);
      console.log('📋 Headers:', headers);
      
      // Show first 2 data rows for debugging
      if (dataRows.length > 0) {
        console.log('📋 First data row:', dataRows[0]);
        if (dataRows.length > 1) {
          console.log('📋 Second data row:', dataRows[1]);
        }
      }

      const processedData: KegiatanSPJData[] = dataRows
        .filter((row: any[]) => row && row.length > 0 && row[namaKegiatanIndex])
        .map((row: any[], index: number) => {
          // Parse periode dari format yang kompleks seperti "Periode (Bulan) SPK: Januari 2026" atau "Januari 2026"
          const periodeStr = row[periodeIndex]?.toString() || '';
          // Ekstrak bulan dan tahun menggunakan regex untuk handle berbagai format
          const bulanTahunMatch = periodeStr.match(/(\w+)\s+(\d{4})/);
          let bulanPeriode = currentMonthName;
          let tahunPeriode = currentYear;
          
          if (bulanTahunMatch) {
            bulanPeriode = bulanTahunMatch[1]; // Nama bulan
            tahunPeriode = bulanTahunMatch[2]; // Tahun
          }

          // Count petugas dari kolom N (Nama Petugas) - format: "Nama1 | Nama2 | ..."
          const namaPetugasStr = row[namaPetugasIndex]?.toString() || '';
          const petugasList = namaPetugasStr
            .split('|')
            .map(name => name.trim())
            .filter(name => name.length > 0);
          const petugasCount = petugasList.length;

          // DEBUG first few rows
          if (index < 2) {
            console.log(`📌 Row ${index}:`, {
              kegiatan: row[namaKegiatanIndex]?.toString(),
              periode: periodeStr,
              parsedPeriode: `${bulanPeriode} ${tahunPeriode}`,
              namaPetugas: namaPetugasStr,
              petugasCount: petugasCount,
              nilai: row[nilaiIndex]
            });
          }

          const jenisPekerjaan = row[jenisIndex]?.toString().toLowerCase() || '';
          let jenis: 'Petugas Pendataan Lapangan' | 'Petugas Pemeriksaan Lapangan' | 'Petugas Pengolahan' = 'Petugas Pengolahan';
          
          if (jenisPekerjaan.includes('pendataan')) {
            jenis = 'Petugas Pendataan Lapangan';
          } else if (jenisPekerjaan.includes('periksa') || jenisPekerjaan.includes('pemeriksaan')) {
            jenis = 'Petugas Pemeriksaan Lapangan';
          }

          // Status: jika kolom U kosong → "Belum Kirim", jika ada text "kirim" → "Kirim ke PPK"
          const statusStr = row[statusIndex]?.toString().trim() || '';
          const status = statusStr.toLowerCase().includes('kirim') ? 'Kirim ke PPK' : 'Belum Kirim';
          
          // Nilai realisasi: dapat berupa "800", "Rp 800.000", atau "800 | 800 | 800"
          // Ambil nilai pertama jika ada separator, remove semua non-numeric, kemudian
          // Jika nilai < 10000 maka multiply by 1000, jika >= 10000 sudah final
          const nilaiStr = row[nilaiIndex]?.toString() || '0';
          const nilaiValueStr = nilaiStr.split('|')[0].trim(); // Ambil nilai pertama jika multiple
          const nilaiRaw = parseInt(nilaiValueStr.replace(/[^0-9]/g, '') || '0') || 0;
          const nilaiRealisasi = nilaiRaw < 10000 ? nilaiRaw * 1000 : nilaiRaw;

          return {
            no: parseInt(row[noIndex]) || index + 1,
            namaKegiatan: row[namaKegiatanIndex]?.toString() || '',
            penanggungjawab: row[roleIndex]?.toString() || '',
            jumlahPetugas: petugasCount,
            namaPetugasList: petugasList,
            jenisPekerjaan: jenis,
            nilaiRealisasi: nilaiRealisasi,
            status: status,
            periode: `${bulanPeriode} ${tahunPeriode}`
          };
        });

      console.log('✅ Data processed:', processedData.length, 'baris');
      
      // Deduplicate data - keep unique combination of kegiatan + jenisPekerjaan
      const deduplicatedData: KegiatanSPJData[] = [];
      const seenCombination = new Set<string>();
      
      for (const item of processedData) {
        const combination = `${item.namaKegiatan}|||${item.jenisPekerjaan}`;
        if (!seenCombination.has(combination)) {
          seenCombination.add(combination);
          deduplicatedData.push(item);
        }
      }
      
      console.log('✅ Data after deduplication:', deduplicatedData.length, 'baris');
      setData(deduplicatedData);
      setCurrentPage(1); // Reset to first page when data is loaded

      // Extract available bulan dan tahun dari periode data
      if (deduplicatedData.length > 0) {
        const periodSet = new Set(deduplicatedData.map(item => item.periode));
        const availBulanTahun = Array.from(periodSet).sort();
        console.log('Available periods:', availBulanTahun);
        if (availBulanTahun.length > 0) {
          // Set default selected period to first available
          const firstPeriode = availBulanTahun[0];
          const periodParts = firstPeriode?.split(' ') || [];
          setSelectedBulan(periodParts[0] || currentMonthName);
          setSelectedTahun(periodParts[1] || currentYear);
        }
      }

    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengambil data dari spreadsheet",
        variant: "destructive"
      });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromSheets();
  }, [dynamicSheetId]);

  // Filter data berdasarkan search term dan bulan/tahun
  useEffect(() => {
    let filtered = [...data];

    // Filter berdasarkan search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.namaKegiatan.toLowerCase().includes(searchLower) ||
        item.penanggungjawab.toLowerCase().includes(searchLower) ||
        item.jenisPekerjaan.toLowerCase().includes(searchLower)
      );
    }

    // Filter berdasarkan periode (bulan dan tahun)
    const selectedPeriode = `${selectedBulan} ${selectedTahun}`;
    filtered = filtered.filter(item => item.periode === selectedPeriode);

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [data, searchTerm, selectedBulan, selectedTahun]);

  // Calculate totals
  const totals = useMemo(() => ({
    petugas: filteredData.reduce((sum, item) => sum + item.jumlahPetugas, 0),
    nilai: filteredData.reduce((sum, item) => sum + item.nilaiRealisasi, 0)
  }), [filteredData]);

  // Extract available bulan/tahun from data
  const availablePeriodes = useMemo(() => {
    const periodSet = new Set(data.map(item => item.periode || ''));
    return Array.from(periodSet).filter(p => p).sort();
  }, [data]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Handle Generate SPJ untuk single row
  const handleGenerateSPJ = (item: KegiatanSPJData) => {
    toast({
      title: "Generate SPJ",
      description: `Memproses SPJ untuk kegiatan: ${item.namaKegiatan}`
    });

    // TODO: Implementasi generate SPJ akan dikonfigurasi nanti
    console.log('🚀 Generate SPJ untuk:', item);
  };

  // Download data
  return (
    <div className="min-h-screen bg-background pt-4 pb-16 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <FileText className="text-red-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generate SPJ Honor Mitra</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kelola dan generate SPJ honor mitra berdasarkan data SPK dan BAST
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="max-w-7xl mx-auto grid gap-4 mb-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kegiatan, penanggungjawab..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Bulan - Sort berdasarkan urutan bulan, bukan abjad */}
              <Select value={selectedBulan} onValueChange={setSelectedBulan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const bulanMap = new Map();
                    availablePeriodes.forEach(p => {
                      const bulanName = p.split(' ')[0];
                      bulanMap.set(bulanName, true);
                    });
                    const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                    return bulanList.filter(b => bulanMap.has(b)).map((bulan) => (
                      <SelectItem key={bulan} value={bulan}>
                        {bulan}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>

              {/* Tahun - Show semua tahun yang ada data */}
              <Select value={selectedTahun} onValueChange={setSelectedTahun}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const tahunSet = new Set<string>();
                    availablePeriodes
                      .filter(p => p.startsWith(selectedBulan))
                      .forEach(p => {
                        const tahunStr = p.split(' ')[1];
                        tahunSet.add(tahunStr);
                      });
                    // If no tahun for selected bulan, show all available years
                    if (tahunSet.size === 0) {
                      availablePeriodes.forEach(p => {
                        tahunSet.add(p.split(' ')[1]);
                      });
                    }
                    // Sort numerically
                    const tahunArray = Array.from(tahunSet).sort((a, b) => parseInt(a) - parseInt(b));
                    return tahunArray.map((tahun) => (
                      <SelectItem key={tahun} value={tahun}>
                        {tahun}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>

              {/* Refresh Button */}
              <Button
                onClick={() => {
                  setIsRefreshing(true);
                  fetchDataFromSheets().finally(() => setIsRefreshing(false));
                }}
                variant="outline"
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refresh...' : 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Section */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <Card>
            <CardContent className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Memuat data...</span>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Data SPJ Honor Mitra</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredData.length} kegiatan | Total Petugas: {totals.petugas} | Total Nilai: Rp {totals.nilai.toLocaleString('id-ID')}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="min-w-12 text-center">No</TableHead>
                      <TableHead className="min-w-[220px]">Nama Kegiatan</TableHead>
                      <TableHead className="min-w-[180px]">Penanggungjawab Kegiatan</TableHead>
                      <TableHead className="min-w-[120px] text-center">Jumlah Petugas</TableHead>
                      <TableHead className="min-w-[200px]">Jenis Pekerjaan</TableHead>
                      <TableHead className="min-w-[150px] text-right">Nilai Realisasi</TableHead>
                      <TableHead className="min-w-[140px]">Status</TableHead>
                      <TableHead className="min-w-[200px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      <>
                        {paginatedData.map((item, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="text-center font-medium">{startIndex + index + 1}</TableCell>
                            <TableCell className="font-medium">{item.namaKegiatan}</TableCell>
                            <TableCell className="text-sm">{item.penanggungjawab}</TableCell>
                            <TableCell className="text-center">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help font-semibold text-blue-600 inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors">
                                      {item.jumlahPetugas}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border border-gray-200 shadow-lg p-3 max-w-sm">
                                    <div className="space-y-2">
                                      <p className="font-semibold text-gray-900">Petugas Terlibat ({item.jumlahPetugas})</p>
                                      {item.namaPetugasList && item.namaPetugasList.length > 0 ? (
                                        <ul className="space-y-1">
                                          {item.namaPetugasList.map((nama, idx) => (
                                            <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                                              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                              {nama}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-sm text-gray-500 italic">Tidak ada data petugas</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {item.jenisPekerjaan}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              Rp {item.nilaiRealisasi.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.status === 'Kirim ke PPK' ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-xs text-green-600 font-medium">{item.status}</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-xs text-red-600 font-medium">{item.status}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center">
                                <Button
                                  onClick={() => handleGenerateSPJ(item)}
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-xs h-8"
                                >
                                  <Zap className="h-3.5 w-3.5" />
                                  Generate
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Tidak ada data yang ditampilkan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>

                {/* Total Summary */}
                {filteredData.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="grid grid-cols-3 gap-4 text-sm font-semibold">
                      <div>
                        <p className="text-muted-foreground mb-1">Total Kegiatan</p>
                        <p className="text-lg">{filteredData.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Total Petugas</p>
                        <p className="text-lg text-blue-600">{totals.petugas}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Total Nilai</p>
                        <p className="text-lg text-emerald-600">Rp {totals.nilai.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {filteredData.length > itemsPerPage && (
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Tampilkan {startIndex + 1} - {Math.min(endIndex, filteredData.length)} dari {filteredData.length} data
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Sebelumnya
                      </Button>
                      <div className="flex items-center gap-2 px-3">
                        <span className="text-sm">
                          Halaman {currentPage} dari {totalPages}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
