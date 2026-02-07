import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Loader2, RefreshCw, Zap, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  // Breakdown fields for nilai realisasi tooltip
  hargaSatuan?: number;
  totalRealisasi?: number;
  satuan?: string;
  // Raw data fields for generateSPJ record - apa adanya
  banyaknya?: string | number;     // Kolom P - apa adanya
  realisasi?: string | number;       // Kolom Q - apa adanya (baru)
  bebanAnggaran?: string | number;  // Kolom S - apa adanya (string)
  pembuatDaftar?: string;            // Kolom L
  nik?: string;                      // Kolom W
  bulan?: string;                    // Parsed from periode
  tahun?: string;                    // Parsed from periode
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

  // Get generateSPJ sheet ID from satker config - ambil dari generatespj_sheet_id (kolom W satker_config)
  const generateSPJSheetId = useMemo(() => {
    // Try to get from satker config, using a workaround for type checking
    const config = satkerConfig?.getUserSatkerConfig();
    if (config && typeof config === 'object') {
      const sheetId = (config as any)['generatespj_sheet_id'] || (config as any)['generateSPJ_sheet_id'];
      if (sheetId) return sheetId;
    }
    return null;
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

  // Dialog state untuk generate SPJ
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showStatusWarning, setShowStatusWarning] = useState(false);
  const [selectedItemForGenerate, setSelectedItemForGenerate] = useState<KegiatanSPJData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

      // Mapping kolom struktur entrikegiatan sheet - ALIGNED dengan RekapSPK.tsx:
      // A/0: No
      // B/1/3: Role (Penanggungjawab/Jenis Pekerjaan)
      // C/2: Periode (Bulan) SPK - format: "Januari 2026"
      // D/3 or E/4: Nama Kegiatan
      // J/9: Harga Satuan (per unit price)
      // K/10: Satuan (unit type)
      // L/11: Pembuat Daftar
      // N/13: Nama Petugas (names separated by |)
      // P/15: Realisasi (quantity/jumlah unit) - USED FOR JUMLAH PETUGAS
      // S/18: Beban Anggaran
      // T/19: Keterangan (Status)
      // W/22: NIK
      const noIndex = 0; // Kolom A
      const roleIndex = getColumnIndex(['role', 'jenis pekerjaan', 'pekerjaan']) || 3; // Kolom D/E - could be Jenis Pekerjaan
      const periodeIndex = 2; // Kolom C
      const jenisIndex = getColumnIndex(['jenis', 'pekerjaan']) || 3; // Kolom D - Jenis Pekerjaan
      const namaKegiatanIndex = getColumnIndex(['kegiatan', 'nama kegiatan']) || 4; // Kolom E - Nama Kegiatan
      const namaPetugasIndex = getColumnIndex(['petugas', 'nama petugas']) || 13; // Kolom N - Nama Petugas (untuk tooltip)
      const hargaSatuanIndex = getColumnIndex(['harga', 'satuan']) || 9; // Kolom J - Harga Satuan
      const satuanIndex = getColumnIndex(['satuan']) || 10; // Kolom K - Satuan
      const pembuatDaftarIndex = 11; // Kolom L - Pembuat Daftar (index 11, no fuzzy match)
      const jumlahPetugasIndex = 15; // Kolom P - Banyaknya (index 15, apa adanya)
      const realisasiIndex = 16; // Kolom Q - Realisasi (index 16, apa adanya) 
      const bebanAnggaranIndex = 18; // Kolom S - Beban Anggaran (index 18, apa adanya)
      const statusIndex = 19; // Kolom T - Keterangan/Status
      const nikIndex = getColumnIndex(['nik']) || 22; // Kolom W - NIK

      // DEBUG: Logging untuk verify column indices
      console.log('📋 Column Mapping:');
      console.log(`  noIndex: ${noIndex}, roleIndex: ${roleIndex}, periodeIndex: ${periodeIndex}`);
      console.log(`  jenisIndex: ${jenisIndex}, namaKegiatanIndex: ${namaKegiatanIndex}`);
      console.log(`  namaPetugasIndex: ${namaPetugasIndex}, hargaSatuanIndex: ${hargaSatuanIndex}, satuanIndex: ${satuanIndex}`);
      console.log(`  pembuatDaftarIndex: ${pembuatDaftarIndex}, jumlahPetugasIndex: ${jumlahPetugasIndex}, realisasiIndex: ${realisasiIndex}`);
      console.log(`  bebanAnggaranIndex: ${bebanAnggaranIndex}, statusIndex: ${statusIndex}, nikIndex: ${nikIndex}`);
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

          // Get petugas data for tooltip from kolom N (Nama Petugas) - format: "Nama1 | Nama2 | ..."
          const namaPetugasStr = row[namaPetugasIndex]?.toString() || '';
          const petugasList = namaPetugasStr
            .split('|')
            .map(name => name.trim())
            .filter(name => name.length > 0);
          
          // Jumlah Petugas = count of actual petugas names in the list
          const petugasCount = petugasList.length || 1;

          // Kolom P (Banyaknya) - ambil apa adanya
          const banyaknyaStr = row[jumlahPetugasIndex]?.toString() || '0';
          
          // Kolom Q - Realisasi (apa adanya)
          const realisasiStr = row[realisasiIndex]?.toString() || '';
          
          // Harga Satuan parsing
          const hargaSatuanStr = row[hargaSatuanIndex]?.toString() || '0';
          const hargaSatuanRaw = parseInt(hargaSatuanStr.replace(/[^0-9]/g, '') || '0') || 0;
          
          // Parse untuk nilai calculation (sum if pipe-separated)
          const banyaknyaValues = banyaknyaStr
            .split('|')
            .map(v => parseInt(v.trim().replace(/[^0-9]/g, '')) || 0)
            .filter(v => v > 0);
          const totalRealisasi = banyaknyaValues.length > 0 
            ? banyaknyaValues.reduce((sum, val) => sum + val, 0)
            : 1;
          const nilaiRealisasi = hargaSatuanRaw * totalRealisasi;

          // DEBUG first few rows
          if (index < 2) {
            console.log(`📌 Row ${index}:`, {
              kegiatan: row[namaKegiatanIndex]?.toString(),
              periode: periodeStr,
              parsedPeriode: `${bulanPeriode} ${tahunPeriode}`,
              namaPetugas: namaPetugasStr,
              petugasCount: petugasCount,
              hargaSatuan: row[hargaSatuanIndex],
              banyaknya: banyaknyaStr,
              realisasi: realisasiStr,
              pembuatDaftar: row[pembuatDaftarIndex]
            });
          }
          
          // Jenis Pekerjaan classification
          const jenisPekerjaan = row[jenisIndex]?.toString().toLowerCase() || '';
          let jenis: 'Petugas Pendataan Lapangan' | 'Petugas Pemeriksaan Lapangan' | 'Petugas Pengolahan' = 'Petugas Pengolahan';
          
          if (jenisPekerjaan.includes('pendataan')) {
            jenis = 'Petugas Pendataan Lapangan';
          } else if (jenisPekerjaan.includes('periksa') || jenisPekerjaan.includes('pemeriksaan')) {
            jenis = 'Petugas Pemeriksaan Lapangan';
          }

          // Status: jika kolom T kosong → "Belum Kirim", jika ada text "kirim" → "Kirim ke PPK"
          const statusStr = row[statusIndex]?.toString().trim() || '';
          const status = statusStr.toLowerCase().includes('kirim') ? 'Kirim ke PPK' : 'Belum Kirim';
          
          // DEBUG: Log nilai calculation untuk verification
          if (index < 2) {
            console.log(`📊 Row ${index} nilai calc:`, {
              hargaSatuan: hargaSatuanRaw,
              realisasiStr: realisasiStr,
              banyaknyaValues: banyaknyaValues,
              totalRealisasi: totalRealisasi,
              nilaiRealisasi: nilaiRealisasi
            });
          }

          return {
            no: parseInt(row[noIndex]) || index + 1,
            namaKegiatan: row[namaKegiatanIndex]?.toString() || '',
            penanggungjawab: row[roleIndex]?.toString() || '',
            jumlahPetugas: petugasCount,
            namaPetugasList: petugasList,
            jenisPekerjaan: jenis,
            nilaiRealisasi: nilaiRealisasi,
            status: status,
            periode: `${bulanPeriode} ${tahunPeriode}`,
            // Breakdown fields for tooltip
            hargaSatuan: hargaSatuanRaw,
            totalRealisasi: totalRealisasi,
            satuan: row[satuanIndex]?.toString() || 'Unit',
            // Raw data fields for generateSPJ record - apa adanya
            banyaknya: banyaknyaStr,           // Kolom P apa adanya
            realisasi: realisasiStr,            // Kolom Q apa adanya
            bebanAnggaran: row[bebanAnggaranIndex]?.toString() || '', // Kolom S apa adanya
            pembuatDaftar: row[pembuatDaftarIndex]?.toString() || '', // Kolom L
            nik: row[nikIndex]?.toString() || '',
            bulan: bulanPeriode,
            tahun: tahunPeriode
          };
        });

      console.log('✅ Data processed:', processedData.length, 'baris');
      
      // Remove exact duplicates only (all fields identical) - don't deduplicate by kegiatan+jenis
      // because same kegiatan+jenis with different petugas lists are different entries
      const deduplicatedData: KegiatanSPJData[] = [];
      const seenRows = new Set<string>();
      
      for (const item of processedData) {
        // Create hash of complete item data to detect exact duplicates only
        const itemHash = JSON.stringify({
          namaKegiatan: item.namaKegiatan,
          penanggungjawab: item.penanggungjawab,
          jenisPekerjaan: item.jenisPekerjaan,
          periode: item.periode,
          namaPetugasList: item.namaPetugasList.sort().join('|')
        });
        
        if (!seenRows.has(itemHash)) {
          seenRows.add(itemHash);
          deduplicatedData.push(item);
        }
      }
      
      console.log('✅ Data after duplicate removal:', deduplicatedData.length, 'baris');
      setData(deduplicatedData);
      setCurrentPage(1); // Reset to first page when data is loaded

      // Extract available bulan dan tahun dari periode data
      if (deduplicatedData.length > 0) {
        const periodSet = new Set(deduplicatedData.map(item => item.periode));
        const availBulanTahun = Array.from(periodSet).sort();
        console.log('Available periods:', availBulanTahun);
        
        // Cek apakah current month/year ada di available periods
        const currentPeriode = `${currentMonthName} ${currentYear}`;
        const currentPeriodeExists = availBulanTahun.includes(currentPeriode);
        
        if (currentPeriodeExists) {
          // Jika current period ada, gunakan itu (jangan override)
          console.log('✅ Current period available, keeping filters:', currentPeriode);
          setSelectedBulan(currentMonthName);
          setSelectedTahun(currentYear);
        } else if (availBulanTahun.length > 0) {
          // Hanya jika current period tidak ada, gunakan first available
          console.log('⚠️ Current period not available, using first available:', availBulanTahun[0]);
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

  // Generate ID dengan format genSPJ-yymmxxx dimana xxx adalah nomor urut perbulan
  const generateSPJId = async (bulan: string, tahun: string): Promise<string> => {
    const yy = tahun.slice(-2); // 2 digit tahun terakhir
    
    // Map nama bulan ke number (01-12)
    const bulanMap: { [key: string]: string } = {
      'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
      'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
      'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'
    };
    const mm = bulanMap[bulan] || '01';
    
    // Query generateSPJ sheet untuk dapatkan last sequential number bulan ini
    let xxx = '001';
    if (generateSPJSheetId) {
      try {
        const result = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: generateSPJSheetId,
            operation: "read",
            range: "generateSPJ"
          }
        });
        
        if (result.data?.values && Array.isArray(result.data.values)) {
          // Filter IDs untuk bulan/tahun ini
          const prefix = `genSPJ-${yy}${mm}`;
          const matchingIds = result.data.values
            .map((row: any[]) => row[0]?.toString() || '')
            .filter((id: string) => id.startsWith(prefix));
          
          if (matchingIds.length > 0) {
            // Extract last number dari matching IDs
            const numbers = matchingIds
              .map(id => parseInt(id.slice(-3)))
              .filter(n => !isNaN(n))
              .sort((a, b) => b - a);
            
            if (numbers.length > 0) {
              xxx = String(numbers[0] + 1).padStart(3, '0');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error querying last ID, using default 001:', error);
        xxx = '001';
      }
    }
    
    return `genSPJ-${yy}${mm}${xxx}`;
  };

  // Write Generate SPJ data ke sheet
  const writeToGenerateSPJ = async (item: KegiatanSPJData) => {
    if (!generateSPJSheetId) {
      toast({
        title: "Error",
        description: "generatespj_sheet_id tidak ditemukan. Pastikan kolom W (generatespj_sheet_id) sudah ditambahkan di satker_config dan diperluas",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsGenerating(true);

      // Format tanggal dalam bahasa Indonesia
      const today = new Date();
      const tanggalIndonesia = `${today.getDate()} ${currentMonthName} ${today.getFullYear()}`;

      // Generate ID (now async)
      const idSPJ = await generateSPJId(item.bulan || '', item.tahun || '');

      // Prepare data untuk ditulis
      const recordData = [
        [
          idSPJ,                           // Id (genSPJ-yymmxxx)
          item.namaKegiatan,               // Nama Kegiatan (Kolom E)
          item.periode,                    // Periode (Kolom C)
          item.penanggungjawab,            // Penanggungjawab Kegiatan (Kolom B)
          item.jenisPekerjaan,             // Jenis Pekerjaan (Kolom D)
          item.bebanAnggaran,              // Beban Anggaran (Kolom S - apa adanya)
          tanggalIndonesia,                // Tanggal (SPJ)
          item.pembuatDaftar,              // Pembuat Daftar (Kolom L)
          item.namaPetugasList.join(', '), // Nama Petugas (Kolom N - apa adanya dari sheet)
          item.banyaknya,                  // Banyaknya (Kolom P - apa adanya)
          item.hargaSatuan || 0,           // Harga Satuan (Kolom J)
          item.realisasi,                  // Realisasi (Kolom Q - apa adanya)
          item.nik                         // NIK (Kolom W)
        ]
      ];

      console.log('📝 Menulis ke generateSPJ sheet:', recordData);

      // Write ke Google Sheets via Supabase function
      const result = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: generateSPJSheetId,
          operation: "append",
          range: "generateSPJ",  // Just sheet name for append
          values: recordData
        }
      });

      if (result.error) {
        throw result.error;
      }

      console.log('✅ Data berhasil ditulis ke generateSPJ sheet');
      toast({
        title: "Sukses",
        description: `SPJ ${idSPJ} untuk "${item.namaKegiatan}" berhasil dibuat`,
        variant: "default"
      });

      return true;
    } catch (error: any) {
      console.error('❌ Error writing to generateSPJ:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal membuat SPJ",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Generate SPJ untuk single row
  const handleGenerateSPJ = (item: KegiatanSPJData) => {
    if (item.status !== 'Kirim ke PPK') {
      setSelectedItemForGenerate(item);
      setShowStatusWarning(true);
      return;
    }
    setSelectedItemForGenerate(item);
    setShowGenerateDialog(true);
  };

  // Handle konfirmasi generate SPJ
  const handleConfirmGenerate = async () => {
    if (!selectedItemForGenerate) return;
    
    const success = await writeToGenerateSPJ(selectedItemForGenerate);
    if (success) {
      setShowGenerateDialog(false);
      setSelectedItemForGenerate(null);
    }
  };

  // Handle navigasi ke EntriSPK
  const handleGoToEntriSPK = () => {
    setShowStatusWarning(false);
    setSelectedItemForGenerate(null);
    toast({
      title: "Info",
      description: "Silahkan buka menu 'Entri SPK' untuk mengubah status menjadi 'Kirim PPK'"
    });
  };

  // Download data
  return (
    <div className="min-h-screen bg-background">
      {/* Dialog Generate SPJ */}
      <AlertDialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Generate SPJ</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda akan membuat rekap tabel <span className="font-semibold text-foreground">"{selectedItemForGenerate?.namaKegiatan}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel disabled={isGenerating}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmGenerate} disabled={isGenerating}>
            {isGenerating ? 'Sedang memproses...' : 'Ya'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Status Warning */}
      <AlertDialog open={showStatusWarning} onOpenChange={setShowStatusWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Status Pekerjaan</AlertDialogTitle>
            <AlertDialogDescription>
              Status pekerjaan harus <span className="font-semibold">Kirim PPK</span> silahkan kirim pada menu <span className="font-semibold">Entri SPK</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleGoToEntriSPK}>Mengerti</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="mb-8 p-4 sm:p-6">
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
      <div className="px-4 sm:px-6 grid gap-4 mb-6">
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
                    // Show fixed range 2024-2030
                    const staticTahunArray = Array.from({ length: 7 }, (_, i) => (2024 + i).toString());
                    // Filter to show at least static range, plus any extra years from data beyond 2030
                    const tahunSet = new Set<string>(staticTahunArray);
                    availablePeriodes.forEach(p => {
                      const tahunStr = p.split(' ')[1];
                      const tahunNum = parseInt(tahunStr);
                      if (tahunNum > 2030) {
                        tahunSet.add(tahunStr);
                      }
                    });
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
      <div className="px-4 sm:px-6">
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
                      <TableHead className="min-w-[140px] max-w-[140px]">Jenis Pekerjaan</TableHead>
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
                              <Badge variant="outline" className="text-wrap break-words line-clamp-2 text-xs">
                                {item.jenisPekerjaan}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help hover:underline transition-all">
                                      Rp {item.nilaiRealisasi.toLocaleString('id-ID')}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border border-gray-200 shadow-lg max-w-xs">
                                    <div className="space-y-2">
                                      <p className="font-semibold text-gray-900">Perhitungan Nilai Realisasi</p>
                                      <div className="text-sm text-gray-700 space-y-1">
                                        <div className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded">
                                          <span>Harga Satuan:</span>
                                          <span className="font-medium">Rp {(item.hargaSatuan || 0).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                          <span className="text-gray-400">×</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded">
                                          <span>{item.satuan || 'Unit'}:</span>
                                          <span className="font-medium">{item.totalRealisasi || 1}</span>
                                        </div>
                                        <div className="flex items-center justify-center text-gray-400 my-1">
                                          <span>=</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 bg-emerald-50 p-2 rounded border border-emerald-200">
                                          <span className="font-semibold text-emerald-700">Total:</span>
                                          <span className="font-bold text-emerald-700">Rp {item.nilaiRealisasi.toLocaleString('id-ID')}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex justify-center cursor-help">
                                      {item.status === 'Kirim ke PPK' ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                      ) : (
                                        <XCircle className="h-5 w-5 text-red-600" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white border border-gray-200 shadow-lg">
                                    {item.status === 'Kirim ke PPK' ? (
                                      <div className="text-sm">
                                        <p className="font-semibold text-green-700">✓ Kirim ke PPK</p>
                                        <p className="text-gray-600 text-xs mt-1">SPJ sudah dikirimkan ke Pejabat Pembuat Komitmen</p>
                                      </div>
                                    ) : (
                                      <div className="text-sm">
                                        <p className="font-semibold text-red-700">✗ Belum Kirim</p>
                                        <p className="text-gray-600 text-xs mt-1">SPJ belum dikirimkan ke Pejabat Pembuat Komitmen</p>
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() => handleGenerateSPJ(item)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 hover:bg-blue-100 transition-colors"
                                      >
                                        <Zap className="h-4 w-4 text-blue-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-white border border-gray-200 shadow-lg">
                                      <p className="text-sm font-semibold text-blue-700">Generate SPJ</p>
                                      <p className="text-xs text-gray-600 mt-1">Buat Surat Pernyataan Jumlah untuk kegiatan ini</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() => console.log('Link icon clicked')}
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 hover:bg-gray-100 transition-colors"
                                      >
                                        <FileText className="h-4 w-4 text-gray-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-white border border-gray-200 shadow-lg">
                                      <p className="text-sm font-semibold text-gray-700">Buka Dokumen</p>
                                      <p className="text-xs text-gray-600 mt-1">Buka SPJ yang telah dibuat sebelumnya</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
