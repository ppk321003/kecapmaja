import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Search, XCircle, ArrowUpDown, Download, Filter } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  rowIndex: number;
  petugasIndex: number;
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
  allMappings: {
    rowIndex: number;
    petugasIndex: number;
    namaKegiatan: string;
    statusTTD: string;
    periode: string;
    role: string;
  }[];
}

type SortField = 'namaMitra' | 'jumlah';
type SortDirection = 'asc' | 'desc';

// Fungsi untuk delay (menghindari rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function RekapSPKBAST() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RekapSPKRow[]>([]);
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [sortField, setSortField] = useState<SortField>('namaMitra');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>("semua");
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

  // Fungsi yang lebih robust untuk memanggil edge function
  const callEdgeFunction = useCallback(async (operation: string, body: any, retries = 3): Promise<any> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📡 Attempt ${attempt}: Calling edge function for ${operation}`);
        
        const result = await supabase.functions.invoke("google-sheets", {
          body: {
            operation,
            ...body
          }
        });

        if (result.error) {
          console.error(`❌ Edge function error (attempt ${attempt}):`, result.error);
          
          if (attempt < retries) {
            await delay(1000 * attempt);
            continue;
          }
          
          throw result.error;
        }

        console.log(`✅ Edge function success for ${operation}`);
        return result.data;

      } catch (error: any) {
        console.error(`❌ Edge function call failed (attempt ${attempt}):`, error);
        
        if (attempt === retries) {
          throw new Error(`Gagal memproses data: ${error.message || 'Unknown error'}`);
        }
        
        await delay(1000 * attempt);
      }
    }
  }, []);

  const processPetugasData = useCallback((namaPetugas: string, nikPetugas: string, hargaSatuan: string, realisasi: string, statusTTD: string, masterMap: Map<string, MasterPetugas>, rowIndex: number, namaKegiatan: string, periode: string, role: string) => {
    const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const nikList = nikPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const realisasiList = realisasi.split(' | ').map((n: string) => n.trim());
    
    let statusList: string[] = [];
    if (statusTTD && statusTTD.trim() !== '') {
      statusList = statusTTD.split(' | ').map((n: string) => n.trim());
    }
    
    const result: PetugasTugas[] = [];

    for (let j = 0; j < namaList.length; j++) {
      if (namaList[j]) {
        const nama = namaList[j].trim();
        const nik = nikList[j] || "";
        const realisasiItem = realisasiList[j] || "0";
        
        let statusItem = "Belum ditandatangani";
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
          // Cari dengan nama saja jika NIK tidak cocok
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
          statusTTD: statusItem,
          rowIndex: rowIndex,
          petugasIndex: j,
          periode: periode,
          role: role,
          namaKegiatan: namaKegiatan
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
        callEdgeFunction("read", {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          range: "Sheet1"
        }),
        callEdgeFunction("read", {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          range: "MASTER.MITRA"
        })
      ]);

      const tugasRows = tugasResult?.values || [];
      const masterRows = masterResult?.values || [];
      
      console.log("📊 Total rows dari spreadsheet:", tugasRows.length);

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

      let matchCount = 0;
      
      // Process tugas data
      for (let i = 1; i < tugasRows.length; i++) {
        const row = tugasRows[i];
        if (!row || row.length < 22) continue;

        const periode = cleanPeriode(row[2]?.toString() || "");
        const role = row[3]?.toString() || "";
        const namaKegiatan = row[4]?.toString() || "";
        const namaPetugas = row[13]?.toString() || "";
        const hargaSatuan = row[9]?.toString() || "";
        const realisasi = row[15]?.toString() || "";
        const nikPetugas = row[22]?.toString() || "";
        
        let statusTTD = "Belum ditandatangani";
        if (row[23] !== undefined && row[23] !== null && row[23].toString().trim() !== "") {
          statusTTD = row[23].toString().trim();
        }

        if (periode === cleanedPeriodeFilter && namaPetugas && hargaSatuan && realisasi) {
          matchCount++;
          const processedPetugas = processPetugasData(namaPetugas, nikPetugas, hargaSatuan, realisasi, statusTTD, masterPetugas, i, namaKegiatan, periode, role);
          
          for (const petugas of processedPetugas) {
            petugasTugas.push({
              ...petugas,
              role: role.trim(),
              periode: periode
            });
          }
        }
      }

      console.log("✅ Rows yang match filter:", matchCount);
      console.log("👤 Total petugas tugas:", petugasTugas.length);

      // Group data dengan menyimpan semua mappings
      const groupedData = new Map<string, RekapSPKRow>();
      
      for (const petugas of petugasTugas) {
        const key = `${petugas.nama}_${petugas.nik}`;
        
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
            statusTTD: "Belum ditandatangani",
            detailPendataan: [],
            detailPemeriksaan: [],
            detailPengolahan: [],
            allMappings: []
          });
        }

        const existing = groupedData.get(key)!;
        const roleLower = petugas.role.toLowerCase();
        const detailItem = {
          namaKegiatan: petugas.namaKegiatan,
          nilaiRealisasi: petugas.nilaiRealisasi
        };

        // Kelompokkan berdasarkan role
        if (roleLower.includes('pendataan') || roleLower.includes('petugas pendataan')) {
          existing.pendataan += petugas.honor;
          existing.detailPendataan.push(detailItem);
        } else if (roleLower.includes('pemeriksaan') || roleLower.includes('petugas pemeriksaan')) {
          existing.pemeriksaan += petugas.honor;
          existing.detailPemeriksaan.push(detailItem);
        } else if (roleLower.includes('pengolah') || roleLower.includes('petugas pengolahan')) {
          existing.pengolahan += petugas.honor;
          existing.detailPengolahan.push(detailItem);
        } else {
          existing.pendataan += petugas.honor;
          existing.detailPendataan.push(detailItem);
        }

        // Simpan semua mappings dengan informasi lengkap
        existing.allMappings.push({
          rowIndex: petugas.rowIndex,
          petugasIndex: petugas.petugasIndex,
          namaKegiatan: petugas.namaKegiatan,
          statusTTD: petugas.statusTTD,
          periode: petugas.periode,
          role: petugas.role
        });

        // Tentukan status TTD overall: jika ada satu saja "Sudah ditandatangani", maka overall "Sudah ditandatangani"
        if (petugas.statusTTD === "Sudah ditandatangani") {
          existing.statusTTD = "Sudah ditandatangani";
        }
      }

      const finalData = Array.from(groupedData.values()).map(item => {
        item.jumlah = item.pendataan + item.pemeriksaan + item.pengolahan;
        return item;
      });

      console.log("🎉 Final data length:", finalData.length);
      
      // Debug: Log mapping untuk setiap petugas
      finalData.forEach((item, index) => {
        console.log(`📋 Petugas ${index + 1}: ${item.namaMitra} (${item.nik})`);
        console.log(`   Status: ${item.statusTTD}`);
        console.log(`   Total Mappings: ${item.allMappings.length}`);
        item.allMappings.forEach((mapping, idx) => {
          console.log(`   Mapping ${idx + 1}: row ${mapping.rowIndex}, index ${mapping.petugasIndex}, ${mapping.namaKegiatan}`);
        });
      });

      setData(finalData);

      if (finalData.length > 0) {
        toast({
          title: "Sukses",
          description: `Data berhasil dimuat untuk periode ${cleanedPeriodeFilter} - ${finalData.length} petugas ditemukan`
        });
      } else {
        toast({
          title: "Info",
          description: `Tidak ada data untuk periode ${cleanedPeriodeFilter}. Coba pilih periode lain.`,
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
  }, [filterBulan, filterTahun, cleanPeriode, processPetugasData, toast, callEdgeFunction]);

  // PERBAIKAN: Fungsi update dengan identifier unik (nama + nik) daripada index
  const handleStatusChange = useCallback(async (namaMitra: string, nik: string, newStatus: string) => {
    if (!isPPK) return;

    try {
      // Cari item berdasarkan identifier unik, bukan index
      const item = data.find(row => row.namaMitra === namaMitra && row.nik === nik);
      
      if (!item) {
        throw new Error(`Tidak ditemukan data untuk ${namaMitra} (${nik})`);
      }

      console.log("🔄 UPDATE REQUEST DETAILS:");
      console.log("   Selected:", item.namaMitra, "NIK:", item.nik);
      console.log("   New status:", newStatus);

      if (!item.allMappings || item.allMappings.length === 0) {
        throw new Error("Tidak ditemukan mapping ke spreadsheet");
      }

      const currentPeriode = `${filterBulan} ${filterTahun}`;
      
      // Filter mappings yang sesuai dengan periode yang dipilih
      const relevantMappings = item.allMappings.filter(mapping => {
        const mappingPeriode = cleanPeriode(mapping.periode);
        const currentPeriodeClean = cleanPeriode(currentPeriode);
        return mappingPeriode === currentPeriodeClean;
      });

      if (relevantMappings.length === 0) {
        console.warn("⚠️ No mappings found for current period, using all mappings");
        relevantMappings.push(...item.allMappings);
      }

      console.log("   Relevant mappings:", relevantMappings);

      // Update local state
      setData(prev => prev.map(row => 
        row.namaMitra === namaMitra && row.nik === nik 
          ? { ...row, statusTTD: newStatus }
          : row
      ));

      // Update setiap mapping yang relevan
      const updatePromises = relevantMappings.map(async (mapping) => {
        console.log(`   Updating mapping: row ${mapping.rowIndex}, petugasIndex ${mapping.petugasIndex}`);
        
        return await callEdgeFunction("update-status-specific", {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          rowIndex: mapping.rowIndex,
          petugasIndex: mapping.petugasIndex,
          status: newStatus,
          nama: item.namaMitra,
          nik: item.nik
        });
      });

      const results = await Promise.all(updatePromises);
      console.log("✅ All update results:", results);

      toast({
        title: "Berhasil",
        description: `Status ${item.namaMitra} diubah menjadi "${newStatus}"`
      });

    } catch (error: any) {
      console.error("❌ Error updating status:", error);
      
      // Refresh data untuk rollback
      fetchData();

      toast({
        title: "Error",
        description: "Gagal mengubah status: " + error.message,
        variant: "destructive"
      });
    }
  }, [data, isPPK, filterBulan, filterTahun, cleanPeriode, toast, callEdgeFunction, fetchData]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const filteredAndSortedData = useMemo(() => {
    if (!data.length) return [];
    
    let filteredData = data;
    
    // Apply status filter
    if (statusFilter !== "semua") {
      filteredData = data.filter(row => row.statusTTD === statusFilter);
    }
    
    // Apply sorting
    const sorted = [...filteredData].sort((a, b) => {
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
    });
    
    return sorted.map((item, index) => ({
      ...item,
      no: index + 1
    }));
  }, [data, sortField, sortDirection, statusFilter]);

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
      const exportData = filteredAndSortedData.map(row => ({
        'No': row.no,
        'Nama Mitra Statistik': row.namaMitra,
        'Kecamatan': row.kecamatan,
        'Pendataan': formatRupiah(row.pendataan),
        'Pemeriksaan': formatRupiah(row.pemeriksaan),
        'Pengolahan': formatRupiah(row.pengolahan),
        'Jumlah': formatRupiah(row.jumlah),
        'Status': row.statusTTD
      }));

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
  }, [filteredAndSortedData, isPPK, filterBulan, filterTahun, formatRupiah, toast]);

  useEffect(() => {
    if (filterBulan && filterTahun) {
      fetchData();
    }
  }, [filterBulan, filterTahun, fetchData]);

  const totals = useMemo(() => {
    if (filteredAndSortedData.length === 0) return null;
    return {
      pendataan: filteredAndSortedData.reduce((sum, row) => sum + row.pendataan, 0),
      pemeriksaan: filteredAndSortedData.reduce((sum, row) => sum + row.pemeriksaan, 0),
      pengolahan: filteredAndSortedData.reduce((sum, row) => sum + row.pengolahan, 0),
      jumlah: filteredAndSortedData.reduce((sum, row) => sum + row.jumlah, 0)
    };
  }, [filteredAndSortedData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Rekap SPK & BAST</h1>
        <p className="text-muted-foreground mt-2">
          Rekapitulasi Surat Perintah Kerja dan Berita Acara Serah Terima
        </p>
      </div>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filter Data
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

            <div className="space-y-1">
              <label className="text-xs font-medium">Status TTD</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-8 text-sm">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua" className="text-sm">Semua Status</SelectItem>
                  <SelectItem value="Sudah ditandatangani" className="text-sm">Sudah Ditandatangani</SelectItem>
                  <SelectItem value="Belum ditandatangani" className="text-sm">Belum Ditandatangani</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchData} disabled={loading} className="h-8 px-4 text-sm mt-5">
              {loading ? "Memuat..." : "Cari Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              <CardTitle>Rekap SPK & BAST</CardTitle>
              {filteredAndSortedData.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {filteredAndSortedData.length} Petugas
                </Badge>
              )}
            </div>
            {statusFilter !== "semua" && (
              <Badge variant="outline" className="text-sm">
                Filter: {statusFilter === "Sudah ditandatangani" ? "Sudah TTD" : "Belum TTD"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          ) : filteredAndSortedData.length === 0 ? (
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
                    <TableHead className="w-48 text-center">Status TTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((row, index) => (
                    <TableRow key={`${row.namaMitra}_${row.nik}_${index}`}>
                      <TableCell className="font-medium">{row.no}</TableCell>
                      <TableCell className="font-medium min-w-[150px]">
                        <div>
                          <div>{row.namaMitra}</div>
                          <div className="text-xs text-muted-foreground">{row.nik}</div>
                        </div>
                      </TableCell>
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
                        <div className="flex flex-col items-center gap-3">
                          <Badge 
                            variant={row.statusTTD === "Sudah ditandatangani" ? "default" : "destructive"}
                            className={`text-xs px-3 py-1 ${
                              row.statusTTD === "Sudah ditandatangani" 
                                ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" 
                                : "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
                            }`}
                          >
                            {row.statusTTD === "Sudah ditandatangani" ? (
                              <CheckCircle className="h-3 w-3 mr-1 inline" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1 inline" />
                            )}
                            {row.statusTTD}
                          </Badge>
                          
                          {isPPK && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={row.statusTTD === "Sudah ditandatangani"}
                                onCheckedChange={(checked) => 
                                  handleStatusChange(row.namaMitra, row.nik, checked ? "Sudah ditandatangani" : "Belum ditandatangani")
                                }
                                className="data-[state=checked]:bg-green-600"
                              />
                              <Label className="text-xs">
                                {row.statusTTD === "Sudah ditandatangani" ? "Batalkan" : "Tandatangani"}
                              </Label>
                            </div>
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