import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Search, XCircle, ArrowUpDown, Download } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tahunList = Array.from({ length: 9 }, (_, i) => (2024 + i).toString());

interface PetugasTugas {
  nama: string;
  nik: string;
  kecamatan: string;
  role: string;
  honor: number;
  periode: string;
  namaKegiatan: string;
  nilaiRealisasi: string;
  statusTTD?: string;
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

interface RekapSPKRow {
  no: number;
  namaMitra: string;
  nik: string;
  kecamatan: string;
  pendataan: number;
  pemeriksaan: number;
  pengolahan: number;
  jumlah: number;
  statusTTD: string;
  isExceeded: boolean;
  warnings: string[];
  detailPendataan: {
    namaKegiatan: string;
    nilaiRealisasi: string;
  }[];
  detailPemeriksaan: {
    namaKegiatan: string;
    nilaiRealisasi: string;
  }[];
  detailPengolahan: {
    namaKegiatan: string;
    nilaiRealisasi: string;
  }[];
}

type SortField = 'namaMitra' | 'jumlah';
type SortDirection = 'asc' | 'desc';

export default function RekapSPKBAST() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RekapSPKRow[]>([]);
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [sortField, setSortField] = useState<SortField>('namaMitra');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();

  const isPPK = user?.role === "Pejabat Pembuat Komitmen";

  const formatRupiah = useCallback((amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }, []);

  const parseHonor = useCallback((honorStr: string): number => {
    if (!honorStr) return 0;
    const cleaned = honorStr.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  }, []);

  const calculateHonor = useCallback((hargaSatuanStr: string, realisasiStr: string): number => {
    const hargaSatuan = parseHonor(hargaSatuanStr);
    let realisasi = 0;
    if (realisasiStr) {
      const cleanedRealisasi = realisasiStr.replace(',', '.');
      realisasi = parseFloat(cleanedRealisasi) || 0;
    }
    const result = hargaSatuan * realisasi;
    return result;
  }, [parseHonor]);

  const cleanPeriode = useCallback((periode: string): string => {
    if (!periode) return '';
    return periode.trim().replace(/\s+/g, ' ');
  }, []);

  const processPetugasData = useCallback((namaPetugas: string, nikPetugas: string, hargaSatuan: string, realisasi: string, statusTTD: string, masterMap: Map<string, MasterPetugas>) => {
    const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const nikList = nikPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const realisasiList = realisasi.split(' | ').map((n: string) => n.trim());
    
    // Handle status yang mungkin kosong atau tidak sesuai format
    let statusList: string[] = [];
    if (statusTTD && statusTTD.trim() !== '') {
      statusList = statusTTD.split(' | ').map((n: string) => n.trim());
    }
    
    const result: {
      nama: string;
      nik: string;
      kecamatan: string;
      honor: number;
      nilaiRealisasi: string;
      statusTTD: string;
    }[] = [];

    for (let j = 0; j < namaList.length; j++) {
      if (namaList[j]) {
        const nama = namaList[j].trim();
        const nik = nikList[j] || "";
        const realisasiItem = realisasiList[j] || "0";
        
        // Handle status - default ke "Belum diproses" jika kosong
        let statusItem = "Belum diproses";
        if (statusList[j] && statusList[j].trim() !== "") {
          statusItem = statusList[j].trim();
        } else if (statusTTD && statusTTD.trim() !== "") {
          statusItem = statusTTD.trim();
        }
        
        const honor = calculateHonor(hargaSatuan, realisasiItem);
        const nilaiRealisasi = formatRupiah(honor);
        
        let kecamatan = "";
        const masterKey = `${nama.toLowerCase()}_${nik}`;
        
        if (masterMap.has(masterKey)) {
          kecamatan = masterMap.get(masterKey)!.kecamatan;
        } else {
          for (const [key, value] of masterMap.entries()) {
            if (key.toLowerCase().startsWith(nama.toLowerCase() + '_')) {
              kecamatan = value.kecamatan;
              break;
            }
          }
        }

        result.push({
          nama: nama,
          nik: nik,
          kecamatan: kecamatan || "",
          honor: honor,
          nilaiRealisasi: nilaiRealisasi,
          statusTTD: statusItem
        });
      }
    }
    return result;
  }, [calculateHonor, formatRupiah]);

  const fetchData = useCallback(async () => {
    if (!filterBulan || !filterTahun) {
      toast({
        title: "Peringatan",
        description: "Pilih bulan dan tahun terlebih dahulu",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const periodeFilter = `${filterBulan} ${filterTahun}`;
      const cleanedPeriodeFilter = cleanPeriode(periodeFilter);

      console.log("🔍 Fetching data untuk periode:", cleanedPeriodeFilter);

      const [tugasResult, masterResult] = await Promise.all([
        supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: TUGAS_SPREADSHEET_ID,
            operation: "read",
            range: "Sheet1!A:X"
          }
        }),
        supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: MASTER_SPREADSHEET_ID,
            operation: "read",
            range: "MASTER.MITRA"
          }
        })
      ]);

      if (tugasResult.error) throw tugasResult.error;
      if (masterResult.error) throw masterResult.error;

      const tugasRows = tugasResult.data?.values || [];
      const masterRows = masterResult.data?.values || [];
      
      console.log("📊 Total rows dari spreadsheet:", tugasRows.length);
      console.log("👥 Total master petugas:", masterRows.length);

      const petugasTugas: PetugasTugas[] = [];
      const masterPetugas: Map<string, MasterPetugas> = new Map();

      // Process master data
      for (let i = 1; i < masterRows.length; i++) {
        const row = masterRows[i];
        if (row && row[2]) {
          const nama = row[2].toString().trim();
          const nik = row[1]?.toString() || "";
          const key = `${nama.toLowerCase()}_${nik}`;
          masterPetugas.set(key, {
            nama: nama,
            nik: nik,
            pekerjaan: row[3]?.toString() || "",
            alamat: row[4]?.toString() || "",
            bank: row[5]?.toString() || "",
            rekening: row[6]?.toString() || "",
            kecamatan: row[7]?.toString() || ""
          });
        }
      }

      console.log("🗺️ Master petugas map size:", masterPetugas.size);

      let matchCount = 0;
      // Process tugas data
      for (let i = 1; i < tugasRows.length; i++) {
        const row = tugasRows[i];
        if (!row || row.length < 24) continue;

        const periode = cleanPeriode(row[2]?.toString() || "");
        const role = row[3]?.toString() || "";
        const namaKegiatan = row[4]?.toString() || "";
        const namaPetugas = row[13]?.toString() || "";
        const hargaSatuan = row[9]?.toString() || "";
        const realisasi = row[15]?.toString() || "";
        const nikPetugas = row[22]?.toString() || "";
        const statusTTD = row[23]?.toString() || "Belum diproses";

        if (periode === cleanedPeriodeFilter && namaPetugas && hargaSatuan && realisasi) {
          matchCount++;
          const processedPetugas = processPetugasData(namaPetugas, nikPetugas, hargaSatuan, realisasi, statusTTD, masterPetugas);
          
          for (const petugas of processedPetugas) {
            petugasTugas.push({
              nama: petugas.nama,
              nik: petugas.nik,
              kecamatan: petugas.kecamatan,
              role: role.trim(),
              honor: petugas.honor,
              periode: periode,
              namaKegiatan: namaKegiatan,
              nilaiRealisasi: petugas.nilaiRealisasi,
              statusTTD: petugas.statusTTD
            });
          }
        }
      }

      console.log("✅ Rows yang match filter:", matchCount);
      console.log("👤 Total petugas tugas:", petugasTugas.length);

      // Group data by petugas
      const groupedData = new Map<string, RekapSPKRow>();
      
      for (const petugas of petugasTugas) {
        const key = `${petugas.nama.toLowerCase()}_${petugas.nik}`;
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            no: groupedData.size + 1,
            namaMitra: petugas.nama,
            nik: petugas.nik,
            kecamatan: petugas.kecamatan,
            pendataan: 0,
            pemeriksaan: 0,
            pengolahan: 0,
            jumlah: 0,
            statusTTD: petugas.statusTTD,
            isExceeded: false,
            warnings: [],
            detailPendataan: [],
            detailPemeriksaan: [],
            detailPengolahan: []
          });
        }

        const existing = groupedData.get(key)!;
        const roleLower = petugas.role.toLowerCase();
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

        // Update status jika ada yang lebih baru
        if (petugas.statusTTD === "Sudah ditandatangani") {
          existing.statusTTD = "Sudah ditandatangani";
        }
      }

      const finalData = Array.from(groupedData.values()).map(item => {
        item.jumlah = item.pendataan + item.pemeriksaan + item.pengolahan;
        return item;
      });

      console.log("🎉 Final data length:", finalData.length);
      console.log("📋 Sample data:", finalData.slice(0, 3));

      setData(finalData);

      if (finalData.length > 0) {
        toast({
          title: "Sukses",
          description: `Data berhasil dimuat untuk periode ${cleanedPeriodeFilter} - ${finalData.length} petugas ditemukan`
        });
      } else {
        toast({
          title: "Info",
          description: `Tidak ada data untuk periode ${cleanedPeriodeFilter}`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error("❌ Fetch data error:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [filterBulan, filterTahun, cleanPeriode, processPetugasData, toast]);

  const handleToggleStatus = useCallback(async (index: number) => {
    if (!isPPK) return;

    try {
      const item = data[index];
      const newStatus = item.statusTTD === "Sudah ditandatangani" 
        ? "Belum ditandatangani" 
        : "Sudah ditandatangani";

      // Update local state
      setData(prev => {
        const newData = [...prev];
        newData[index] = { ...newData[index], statusTTD: newStatus };
        return newData;
      });

      // Update spreadsheet
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          operation: 'update-status-bulk',
          range: 'Sheet1',
          nik: item.nik,
          nama: item.namaMitra,
          status: newStatus
        }
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Status ${item.namaMitra} diubah menjadi "${newStatus}"`
      });

    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Gagal mengubah status: " + error.message,
        variant: "destructive"
      });
    }
  }, [data, isPPK, toast]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const sortedData = useMemo(() => {
    if (!data.length) return [];
    
    return [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortField === 'namaMitra') {
        aValue = a.namaMitra.toLowerCase();
        bValue = b.namaMitra.toLowerCase();
      } else {
        aValue = a.jumlah;
        bValue = b.jumlah;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    }).map((item, index) => ({
      ...item,
      no: index + 1
    }));
  }, [data, sortField, sortDirection]);

  const handleExportExcel = useCallback(async () => {
    if (!isPPK) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya PPK yang dapat mengekspor data",
        variant: "destructive"
      });
      return;
    }

    try {
      const exportData = sortedData.map(row => ({
        'No': row.no,
        'Nama Mitra Statistik': row.namaMitra,
        'Kecamatan': row.kecamatan,
        'Pendataan': formatRupiah(row.pendataan),
        'Pemeriksaan': formatRupiah(row.pemeriksaan),
        'Pengolahan': formatRupiah(row.pengolahan),
        'Jumlah': formatRupiah(row.jumlah),
        'Status': row.statusTTD
      }));

      // Simulasi ekspor CSV
      const csvContent = [
        ['No', 'Nama Mitra Statistik', 'Kecamatan', 'Pendataan', 'Pemeriksaan', 'Pengolahan', 'Jumlah', 'Status'],
        ...exportData.map(row => [
          row.No,
          row['Nama Mitra Statistik'],
          row.Kecamatan,
          row.Pendataan,
          row.Pemeriksaan,
          row.Pengolahan,
          row.Jumlah,
          row.Status
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Rekap_SPK_BAST_${filterBulan}_${filterTahun}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Berhasil",
        description: "Data berhasil diekspor"
      });

    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast({
        title: "Error",
        description: "Gagal mengekspor data: " + error.message,
        variant: "destructive"
      });
    }
  }, [sortedData, isPPK, filterBulan, filterTahun, formatRupiah, toast]);

  useEffect(() => {
    if (filterBulan && filterTahun) {
      fetchData();
    }
  }, [filterBulan, filterTahun, fetchData]);

  const totals = useMemo(() => {
    if (data.length === 0) return null;
    return {
      pendataan: data.reduce((sum, row) => sum + row.pendataan, 0),
      pemeriksaan: data.reduce((sum, row) => sum + row.pemeriksaan, 0),
      pengolahan: data.reduce((sum, row) => sum + row.pengolahan, 0),
      jumlah: data.reduce((sum, row) => sum + row.jumlah, 0)
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-red-500">Rekap SPK & BAST</h1>
        <p className="text-muted-foreground mt-2">
          Rekapitulasi Surat Perintah Kerja dan Berita Acara Serah Terima
        </p>
      </div>

      {/* Filter Section */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filter Periode
            </div>
            {isPPK && (
              <Button onClick={handleExportExcel} size="sm" className="h-8 gap-2">
                <Download className="h-4 w-4" />
                Ekspor Excel
              </Button>
            )}
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

            <Button onClick={fetchData} disabled={loading} className="h-8 px-4 text-sm mt-5">
              {loading ? "Memuat..." : "Cari Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <CardTitle>Rekap SPK & BAST</CardTitle>
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
                {filterBulan && filterTahun ? "Tidak ada data untuk periode yang dipilih" : "Pilih bulan dan tahun untuk menampilkan data"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="min-w-[160px]">
                      <button className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors" onClick={() => handleSort('namaMitra')}>
                        Nama Mitra Statistik
                        <ArrowUpDown className="h-4 w-4" />
                        {sortField === 'namaMitra' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="min-w-[120px]">Kecamatan</TableHead>
                    <TableHead className="text-right min-w-[120px]">Pendataan</TableHead>
                    <TableHead className="text-right min-w-[120px]">Pemeriksaan</TableHead>
                    <TableHead className="text-right min-w-[120px]">Pengolahan</TableHead>
                    <TableHead className="text-right min-w-[120px]">
                      <button className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors ml-auto" onClick={() => handleSort('jumlah')}>
                        Jumlah
                        <ArrowUpDown className="h-4 w-4" />
                        {sortField === 'jumlah' && (
                          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="w-32 text-center">Status TTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row, index) => (
                    <TableRow key={`${row.namaMitra}_${row.nik}`}>
                      <TableCell className="font-medium">{row.no}</TableCell>
                      <TableCell className="font-medium min-w-[150px]">{row.namaMitra}</TableCell>
                      <TableCell className="min-w-[120px]">{row.kecamatan || "-"}</TableCell>
                      
                      <TableCell className="text-right">
                        <HonorTooltip details={row.detailPendataan} title="Detail Pendataan" rowIndex={index}>
                          <span>{formatRupiah(row.pendataan)}</span>
                        </HonorTooltip>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <HonorTooltip details={row.detailPemeriksaan} title="Detail Pemeriksaan" rowIndex={index}>
                          <span>{formatRupiah(row.pemeriksaan)}</span>
                        </HonorTooltip>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <HonorTooltip details={row.detailPengolahan} title="Detail Pengolahan" rowIndex={index}>
                          <span>{formatRupiah(row.pengolahan)}</span>
                        </HonorTooltip>
                      </TableCell>
                      
                      <TableCell className="text-right font-semibold">
                        {formatRupiah(row.jumlah)}
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge 
                            variant={row.statusTTD === "Sudah ditandatangani" ? "default" : "destructive"}
                            className={`text-xs ${
                              row.statusTTD === "Sudah ditandatangani" 
                                ? "bg-green-100 text-green-800 hover:bg-green-100" 
                                : row.statusTTD === "Belum ditandatangani"
                                ? "bg-red-100 text-red-800 hover:bg-red-100"
                                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            }`}
                          >
                            {row.statusTTD === "Sudah ditandatangani" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : row.statusTTD === "Belum ditandatangani" ? (
                              <XCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Search className="h-3 w-3 mr-1" />
                            )}
                            {row.statusTTD}
                          </Badge>
                          
                          {isPPK && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(index)}
                              className="h-6 text-xs"
                            >
                              {row.statusTTD === "Sudah ditandatangani" ? "Batalkan" : "Tandatangani"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
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

// Komponen Tooltip untuk Detail Honor
const HonorTooltip = ({
  details,
  title,
  rowIndex,
  children
}: {
  details: {
    namaKegiatan: string;
    nilaiRealisasi: string;
  }[];
  title: string;
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
        <div className={`absolute z-50 w-96 p-3 text-sm bg-white border border-gray-200 rounded-lg shadow-lg ${
          rowIndex < 4 ? 'top-full mt-2' : 'bottom-full mb-2'
        } left-1/2 transform -translate-x-1/2`}>
          <div className="font-semibold mb-2 text-center text-gray-700">
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
          <div className={`absolute w-3 h-3 bg-white border border-gray-200 transform rotate-45 ${
            rowIndex < 4 
              ? 'bottom-full -translate-y-1/2 border-b border-r' 
              : 'top-full -translate-y-1/2 border-t border-l'
          } left-1/2 -translate-x-1/2`}></div>
        </div>
      )}
    </div>
  );
};