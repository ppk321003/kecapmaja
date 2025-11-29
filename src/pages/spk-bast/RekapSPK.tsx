import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Search, XCircle, ArrowUpDown, Download, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const SBML_SPREADSHEET_ID = "18EBGBfhlwjZAItLI68LJEDeq-Ct7Qe4udxGKY6KWqXk";

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
  statusNotif?: string;
  rowIndex: number;
  petugasIndex: number;
  satuan: string;
  jumlahUnit: number;
  hargaSatuan: number;
  hargaSatuanFormatted: string;
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

interface DetailKegiatan {
  namaKegiatan: string;
  nilaiRealisasi: string;
  satuan: string;
  jumlahUnit: number;
  hargaSatuan: number;
  hargaSatuanFormatted: string;
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
  statusNotif: string;
  isExceeded: boolean;
  warnings: string[];
  detailPendataan: DetailKegiatan[];
  detailPemeriksaan: DetailKegiatan[];
  detailPengolahan: DetailKegiatan[];
  allMappings: {
    rowIndex: number;
    petugasIndex: number;
    namaKegiatan: string;
    statusTTD: string;
    statusNotif: string;
    periode: string;
    role: string;
  }[];
}

type SortField = 'namaMitra' | 'jumlah';
type SortDirection = 'asc' | 'desc';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function RekapSPKBAST() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RekapSPKRow[]>([]);
  const [filterBulan, setFilterBulan] = useState("");
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [sbmlData, setSbmlData] = useState<SBMLData | null>(null);
  const [sortField, setSortField] = useState<SortField>('namaMitra');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingNotif, setUpdatingNotif] = useState<{[key: string]: boolean}>({});
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

  const fetchSBMLData = useCallback(async (tahun: string) => {
    try {
      const { data: sbmlResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SBML_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1"
        }
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
            sbmlPengolah: parseHonor(sbmlForYear[4])
          });
        } else {
          const latestSBML = rows[1];
          setSbmlData({
            tahunAnggaran: latestSBML[1],
            sbmlPendata: parseHonor(latestSBML[2]),
            sbmlPemeriksa: parseHonor(latestSBML[3]),
            sbmlPengolah: parseHonor(latestSBML[4])
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching SBML data:", error);
    }
  }, [parseHonor]);

  const validateRow = useCallback((item: RekapSPKRow, sbml: SBMLData) => {
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

  const cleanPeriode = useCallback((periode: string): string => {
    if (!periode) return '';
    return periode.trim().replace(/\s+/g, ' ');
  }, []);

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

  const processPetugasData = useCallback((namaPetugas: string, nikPetugas: string, hargaSatuan: string, realisasi: string, satuan: string, statusTTD: string, statusNotif: string, masterMap: Map<string, MasterPetugas>, rowIndex: number, namaKegiatan: string, periode: string, role: string) => {
    const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const nikList = nikPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
    const realisasiList = realisasi.split(' | ').map((n: string) => n.trim());
    
    let statusList: string[] = [];
    if (statusTTD && statusTTD.trim() !== '') {
      statusList = statusTTD.split(' | ').map((n: string) => n.trim());
    }

    let notifList: string[] = [];
    if (statusNotif && statusNotif.trim() !== '') {
      notifList = statusNotif.split(' | ').map((n: string) => n.trim());
    }

    const result: PetugasTugas[] = [];
    const hargaSatuanNum = parseHonor(hargaSatuan);
    const hargaSatuanFormatted = formatRupiah(hargaSatuanNum);

    for (let j = 0; j < namaList.length; j++) {
      if (namaList[j]) {
        const nama = namaList[j].trim();
        const nik = nikList[j] || "";
        const realisasiItem = realisasiList[j] || "0";
        const jumlahUnit = parseInt(realisasiItem) || 0;
        
        let statusItem = "Belum ditandatangani";
        if (statusList[j] && statusList[j].trim() !== "") {
          statusItem = statusList[j].trim();
        } else if (statusTTD && statusTTD.trim() !== "") {
          statusItem = statusTTD.trim();
        }

        let notifItem = "belum";
        if (notifList[j] && notifList[j].trim() !== "") {
          notifItem = notifList[j].trim();
        } else if (statusNotif && statusNotif.trim() !== "") {
          notifItem = statusNotif.trim();
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
          statusTTD: statusItem,
          statusNotif: notifItem,
          rowIndex: rowIndex,
          petugasIndex: j,
          periode: periode,
          role: role,
          namaKegiatan: namaKegiatan,
          satuan: satuan,
          jumlahUnit: jumlahUnit,
          hargaSatuan: hargaSatuanNum,
          hargaSatuanFormatted: hargaSatuanFormatted
        });
      }
    }
    return result;
  }, [calculateHonor, formatRupiah, parseHonor]);

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
      for (let i = 1; i < tugasRows.length; i++) {
        const row = tugasRows[i];
        if (!row || row.length < 24) continue;

        const periode = cleanPeriode(row[2]?.toString() || "");
        const role = row[3]?.toString() || "";
        const namaKegiatan = row[4]?.toString() || "";
        const namaPetugas = row[13]?.toString() || "";
        const hargaSatuan = row[9]?.toString() || "";
        const satuan = row[10]?.toString() || "";
        const realisasi = row[15]?.toString() || "";
        const nikPetugas = row[22]?.toString() || "";
        
        let statusTTD = "Belum ditandatangani";
        if (row[23] !== undefined && row[23] !== null && row[23].toString().trim() !== "") {
          statusTTD = row[23].toString().trim();
        }

        let statusNotif = "belum";
        if (row[24] !== undefined && row[24] !== null && row[24].toString().trim() !== "") {
          statusNotif = row[24].toString().trim();
        }

        if (periode === cleanedPeriodeFilter && namaPetugas && hargaSatuan && realisasi) {
          matchCount++;
          const processedPetugas = processPetugasData(namaPetugas, nikPetugas, hargaSatuan, realisasi, satuan, statusTTD, statusNotif, masterPetugas, i, namaKegiatan, periode, role);
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
            statusNotif: "belum",
            isExceeded: false,
            warnings: [],
            detailPendataan: [],
            detailPemeriksaan: [],
            detailPengolahan: [],
            allMappings: []
          });
        }

        const existing = groupedData.get(key)!;
        const roleLower = petugas.role.toLowerCase();
        const detailItem: DetailKegiatan = {
          namaKegiatan: petugas.namaKegiatan,
          nilaiRealisasi: petugas.nilaiRealisasi,
          satuan: petugas.satuan,
          jumlahUnit: petugas.jumlahUnit,
          hargaSatuan: petugas.hargaSatuan,
          hargaSatuanFormatted: petugas.hargaSatuanFormatted
        };

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

        existing.allMappings.push({
          rowIndex: petugas.rowIndex,
          petugasIndex: petugas.petugasIndex,
          namaKegiatan: petugas.namaKegiatan,
          statusTTD: petugas.statusTTD || "Belum ditandatangani",
          statusNotif: petugas.statusNotif || "belum",
          periode: petugas.periode,
          role: petugas.role
        });

        if (petugas.statusTTD === "Sudah ditandatangani") {
          existing.statusTTD = "Sudah ditandatangani";
        }

        if (petugas.statusNotif === "sudah") {
          existing.statusNotif = "sudah";
        }
      }

      const finalData = Array.from(groupedData.values()).map(item => {
        item.jumlah = item.pendataan + item.pemeriksaan + item.pengolahan;
        if (sbmlData) {
          const warnings = validateRow(item, sbmlData);
          item.warnings = warnings;
          item.isExceeded = warnings.length > 0;
        }
        return item;
      });

      console.log("🎉 Final data length:", finalData.length);
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
  }, [filterBulan, filterTahun, cleanPeriode, processPetugasData, toast, callEdgeFunction, sbmlData, validateRow]);

  const handleStatusChange = useCallback(async (namaMitra: string, nik: string, newStatus: string) => {
    if (!isPPK) return;
    
    try {
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

      // Update local state terlebih dahulu untuk UX yang lebih baik
      setData(prev => prev.map(row => 
        row.namaMitra === namaMitra && row.nik === nik 
          ? {...row, statusTTD: newStatus}
          : row
      ));

      let successCount = 0;
      for (const mapping of relevantMappings) {
        try {
          // Baca data row yang akan diupdate
          const readResult = await callEdgeFunction("read", {
            spreadsheetId: TUGAS_SPREADSHEET_ID,
            range: `Sheet1!A${mapping.rowIndex + 1}:Z${mapping.rowIndex + 1}`
          });
          const currentRow = readResult?.values?.[0] || [];
          console.log("📊 Current row data:", currentRow);

          // Update hanya kolom status TTD (kolom X, index 23)
          const updatedRow = [...currentRow];

          // Handle multiple petugas (dipisah oleh |)
          if (updatedRow[23] && updatedRow[23].includes('|')) {
            const statusParts = updatedRow[23].split('|').map(s => s.trim());
            if (mapping.petugasIndex < statusParts.length) {
              statusParts[mapping.petugasIndex] = newStatus;
              updatedRow[23] = statusParts.join(' | ');
            } else {
              updatedRow[23] = newStatus;
            }
          } else {
            // Single petugas
            updatedRow[23] = newStatus;
          }
          console.log("🆕 Updated row data:", updatedRow);

          // Update row menggunakan operasi 'update'
          const updateResult = await callEdgeFunction("update", {
            spreadsheetId: TUGAS_SPREADSHEET_ID,
            rowIndex: mapping.rowIndex + 1,
            values: [updatedRow]
          });
          console.log("✅ Update result for mapping:", mapping, updateResult);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to update mapping ${mapping.rowIndex}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Berhasil",
          description: `Status ${item.namaMitra} diubah menjadi "${newStatus}" (${successCount}/${relevantMappings.length} data terupdate)`
        });

        // Refresh data untuk memastikan konsistensi
        setTimeout(() => {
          fetchData();
        }, 1000);
      } else {
        throw new Error("Gagal mengupdate semua data");
      }
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

  const handleNotifChange = useCallback(async (namaMitra: string, nik: string, newStatus: string) => {
    if (!isPPK) return;

    try {
      const item = data.find(row => row.namaMitra === namaMitra && row.nik === nik);
      if (!item) {
        throw new Error(`Tidak ditemukan data untuk ${namaMitra} (${nik})`);
      }

      console.log("🔄 UPDATE NOTIF REQUEST:");
      console.log("   Selected:", item.namaMitra, "NIK:", item.nik);
      console.log("   New notif status:", newStatus);

      // Set loading state untuk row ini
      setUpdatingNotif(prev => ({...prev, [`${namaMitra}_${nik}`]: true}));

      // Update local state terlebih dahulu
      setData(prev => prev.map(row => 
        row.namaMitra === namaMitra && row.nik === nik 
          ? {...row, statusNotif: newStatus}
          : row
      ));

      const currentPeriode = `${filterBulan} ${filterTahun}`;
      const relevantMappings = item.allMappings.filter(mapping => {
        const mappingPeriode = cleanPeriode(mapping.periode);
        const currentPeriodeClean = cleanPeriode(currentPeriode);
        return mappingPeriode === currentPeriodeClean;
      });

      if (relevantMappings.length === 0) {
        relevantMappings.push(...item.allMappings);
      }

      let successCount = 0;
      for (const mapping of relevantMappings) {
        try {
          // Baca data row yang akan diupdate
          const readResult = await callEdgeFunction("read", {
            spreadsheetId: TUGAS_SPREADSHEET_ID,
            range: `Sheet1!A${mapping.rowIndex + 1}:Z${mapping.rowIndex + 1}`
          });
          
          const currentRow = readResult?.values?.[0] || [];
          const updatedRow = [...currentRow];

          // Update kolom notifikasi (kolom 24, index 24)
          if (updatedRow[24] && updatedRow[24].includes('|')) {
            const notifParts = updatedRow[24].split('|').map(s => s.trim());
            if (mapping.petugasIndex < notifParts.length) {
              notifParts[mapping.petugasIndex] = newStatus;
              updatedRow[24] = notifParts.join(' | ');
            } else {
              updatedRow[24] = newStatus;
            }
          } else {
            updatedRow[24] = newStatus;
          }

          // Update row di spreadsheet
          await callEdgeFunction("update", {
            spreadsheetId: TUGAS_SPREADSHEET_ID,
            rowIndex: mapping.rowIndex + 1,
            values: [updatedRow]
          });
          
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to update notif mapping ${mapping.rowIndex}:`, error);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Berhasil",
          description: `Status notifikasi ${item.namaMitra} diubah menjadi "${newStatus === 'sudah' ? 'Sudah' : 'Belum'} kirim notif"`
        });
      } else {
        throw new Error("Gagal mengupdate semua data notifikasi");
      }

    } catch (error: any) {
      console.error("❌ Error updating notif status:", error);
      // Rollback local state
      fetchData();
      toast({
        title: "Error",
        description: "Gagal mengubah status notifikasi: " + error.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingNotif(prev => ({...prev, [`${namaMitra}_${nik}`]: false}));
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
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredData = filteredData.filter(row => 
        row.namaMitra.toLowerCase().includes(query) || 
        row.nik.toLowerCase().includes(query) || 
        row.kecamatan.toLowerCase().includes(query)
      );
    }
    if (statusFilter !== "semua") {
      filteredData = filteredData.filter(row => row.statusTTD === statusFilter);
    }
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
  }, [data, sortField, sortDirection, statusFilter, searchQuery]);

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
        'Status': row.statusTTD,
        'Notif Mitra': row.statusNotif === 'sudah' ? 'Sudah kirim notif' : 'Belum kirim notif',
        'Peringatan SBML': row.isExceeded ? 'YA' : 'TIDAK'
      }));

      const csvContent = [
        ['No', 'Nama Mitra Statistik', 'Kecamatan', 'Pendataan', 'Pemeriksaan', 'Pengolahan', 'Jumlah', 'Status', 'Notif Mitra', 'Peringatan SBML'],
        ...exportData.map(row => [
          row.No, 
          row['Nama Mitra Statistik'], 
          row.Kecamatan, 
          row.Pendataan, 
          row.Pemeriksaan, 
          row.Pengolahan, 
          row.Jumlah, 
          row.Status, 
          row['Notif Mitra'],
          row['Peringatan SBML']
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
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
    if (filterTahun) {
      fetchSBMLData(filterTahun);
    }
  }, [filterTahun, fetchSBMLData]);

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

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const sbmlBadgeContent = useMemo(() => {
    if (!sbmlData) return null;
    return (
      <div className="flex items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 text-white rounded-lg p-3">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">STANDAR BIAYA MASUKAN LAINNYA</div>
            <div className="text-sm font-semibold text-blue-600">TAHUN ANGGARAN {sbmlData.tahunAnggaran}</div>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-1 justify-end">
          <div className="flex flex-col items-center text-center p-3 min-w-[140px] bg-amber-200 rounded-3xl">
            <span className="text-base font-bold text-red-500">PENDATAAN</span>
            <span className="text-lg font-bold text-inherit">{formatRupiah(sbmlData.sbmlPendata)}</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 min-w-[140px] bg-amber-200 rounded-3xl">
            <span className="text-base font-bold text-red-500">PEMERIKSAAN</span>
            <span className="text-lg font-bold text-inherit">{formatRupiah(sbmlData.sbmlPemeriksa)}</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 min-w-[140px] bg-amber-200 rounded-3xl">
            <span className="text-base font-bold font-sans text-red-500">PENGOLAHAN</span>
            <span className="text-lg font-bold text-inherit">{formatRupiah(sbmlData.sbmlPengolah)}</span>
          </div>
        </div>
      </div>
    );
  }, [sbmlData, formatRupiah]);

  const NotifTooltip = ({ status, children }: { status: string; children: React.ReactNode }) => {
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
          <div className="absolute z-50 w-48 p-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg bottom-full mb-2 left-1/2 transform -translate-x-1/2">
            <div className="text-center">
              {status === 'sudah' ? 'Sudah kirim notif' : 'Belum kirim notif'}
            </div>
            <div className="absolute w-3 h-3 bg-gray-900 transform rotate-45 top-full -translate-y-1/2 left-1/2 -translate-x-1/2"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Cek SBML & Rekap SPK-BAST</h1>
        <p className="text-muted-foreground mt-2">
          Monitoring Cek SBML dan Rekapitulasi Surat Perintah Kerja dan Berita Acara Serah Terima yang sudah diserahkan ke Kantor BPS Kab. Majalengka
        </p>
      </div>

      {/* Card SBML */}
      {sbmlBadgeContent && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <CardContent className="p-6">
            {sbmlBadgeContent}
          </CardContent>
        </Card>
      )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium">Bulan</label>
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="h-8 text-sm">
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
                <SelectTrigger className="h-8 text-sm">
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
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua" className="text-sm">Semua Status</SelectItem>
                  <SelectItem value="Sudah ditandatangani" className="text-sm">Sudah Ditandatangani</SelectItem>
                  <SelectItem value="Belum ditandatangani" className="text-sm">Belum Ditandatangani</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs font-medium">Cari Nama/NIK/Kecamatan</label>
              <div className="relative">
                <Input 
                  placeholder="Cari petugas..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="h-8 text-sm pr-8" 
                />
                {searchQuery && (
                  <button onClick={handleClearSearch} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <Button onClick={fetchData} disabled={loading} className="h-8 px-4 text-sm">
              {loading ? "Memuat..." : "Cari Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              <CardTitle>Cek SBML & Rekap SPK-BAST</CardTitle>
              {filteredAndSortedData.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {filteredAndSortedData.length} Petugas
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              {searchQuery && (
                <Badge variant="outline" className="text-sm">
                  Pencarian: "{searchQuery}"
                  <button onClick={handleClearSearch} className="ml-1 text-gray-400 hover:text-gray-600">
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {statusFilter !== "semua" && (
                <Badge variant="outline" className="text-sm">
                  Filter: {statusFilter === "Sudah ditandatangani" ? "Sudah TTD" : "Belum TTD"}
                </Badge>
              )}
            </div>
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
                {filterBulan && filterTahun ? 
                  (searchQuery || statusFilter !== "semua" ? 
                    "Tidak ada data yang sesuai dengan filter pencarian" : 
                    "Tidak ada data untuk periode yang dipilih") : 
                  "Pilih bulan dan tahun untuk menampilkan data"}
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
                        {sortField === 'namaMitra' && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
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
                        {sortField === 'jumlah' && <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    </TableHead>
                    <TableHead className="w-16 text-center">SBML</TableHead>
                    {/* Kolom Notif Mitra - hanya untuk PPK */}
                    {isPPK && (
                      <TableHead className="w-32 text-center">Notif Mitra</TableHead>
                    )}
                    <TableHead className="w-48 text-center">Status TTD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((row, index) => (
                    <TableRow key={`${row.namaMitra}_${row.nik}_${index}`} className={row.isExceeded ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{row.no}</TableCell>
                      <TableCell className="font-medium min-w-[150px]">
                        <div>
                          <div>{row.namaMitra}</div>
                          <div className="text-xs text-muted-foreground">{row.nik}</div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">{row.kecamatan || "-"}</TableCell>
                      
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

                      {/* Kolom Notif Mitra - hanya untuk PPK */}
                      {isPPK && (
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-3">
                            <NotifTooltip status={row.statusNotif}>
                              <Badge 
                                variant={row.statusNotif === "sudah" ? "default" : "destructive"} 
                                className={`text-xs px-3 py-1 ${
                                  row.statusNotif === "sudah" 
                                    ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" 
                                    : "bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
                                }`}
                              >
                                {row.statusNotif === "sudah" ? (
                                  <CheckCircle className="h-3 w-3 mr-1 inline" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1 inline" />
                                )}
                                {row.statusNotif === "sudah" ? "Sudah" : "Belum"}
                              </Badge>
                            </NotifTooltip>
                            
                            <div className="flex items-center space-x-2">
                              <Switch 
                                checked={row.statusNotif === "sudah"} 
                                onCheckedChange={checked => 
                                  handleNotifChange(
                                    row.namaMitra, 
                                    row.nik, 
                                    checked ? "sudah" : "belum"
                                  )
                                }
                                disabled={updatingNotif[`${row.namaMitra}_${row.nik}`]}
                                className="data-[state=checked]:bg-green-600"
                              />
                              <Label className="text-xs">
                                {row.statusNotif === "sudah" ? "Batalkan" : "Kirim Notif"}
                              </Label>
                            </div>
                          </div>
                        </TableCell>
                      )}

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
                                onCheckedChange={checked => 
                                  handleStatusChange(
                                    row.namaMitra, 
                                    row.nik, 
                                    checked ? "Sudah ditandatangani" : "Belum ditandatangani"
                                  )
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
                      {isPPK && <TableCell></TableCell>}
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
        <div className={`absolute z-50 w-80 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg ${rowIndex < 4 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 transform -translate-x-1/2`}>
          <div className="font-semibold mb-2 text-center">Melebihi SBML:</div>
          <div className="space-y-1">
            {content.map((warning, index) => (
              <div key={index} className="text-xs break-words">• {warning}</div>
            ))}
          </div>
          <div className={`absolute w-3 h-3 bg-gray-900 transform rotate-45 ${rowIndex < 4 ? 'bottom-full -translate-y-1/2' : 'top-full -translate-y-1/2'} left-1/2 -translate-x-1/2`}></div>
        </div>
      )}
    </div>
  );
};

const HonorTooltip = ({
  details,
  title,
  isExceeded,
  rowIndex,
  children
}: {
  details: DetailKegiatan[];
  title: string;
  isExceeded?: boolean;
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
        <div className={`absolute z-50 w-96 p-3 text-sm rounded-lg shadow-lg ${rowIndex < 4 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 transform -translate-x-1/2 ${isExceeded ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'}`}>
          <div className={`font-semibold mb-2 text-center ${isExceeded ? 'text-red-700' : 'text-gray-700'}`}>
            {title}
          </div>
          <div className="space-y-2">
            {details.map((detail, index) => (
              <div key={index} className="text-xs border-b border-gray-100 pb-2 last:border-b-0">
                <div className="font-medium text-gray-900 mb-1 break-words leading-tight max-w-full">
                  {detail.namaKegiatan}
                </div>
                <div className="text-green-600 font-semibold">
                  {detail.jumlahUnit} {detail.satuan} × {detail.hargaSatuanFormatted} = {detail.nilaiRealisasi}
                </div>
              </div>
            ))}
          </div>
          <div className={`absolute w-3 h-3 transform rotate-45 ${rowIndex < 4 ? 'bottom-full -translate-y-1/2 border-b border-r' : 'top-full -translate-y-1/2 border-t border-l'} left-1/2 -translate-x-1/2 ${isExceeded ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}></div>
        </div>
      )}
    </div>
  );
};