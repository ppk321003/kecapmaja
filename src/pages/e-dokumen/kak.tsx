import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ProgramSelect } from "@/components/ProgramSelect";
import { KomponenSelect } from "@/components/KomponenSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus, Trash, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const TARGET_SPREADSHEET_ID = "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";
const ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const DATABASE_SHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface KegiatanDetail {
  id: string;
  namaKegiatan: string;
  volume: string;
  satuan: string;
  hargaSatuan: string;
}

interface WaveDate {
  id: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface OrganikData {
  nip: string;
  nama: string;
  jabatan: string;
  kecamatan: string;
}

interface FormData {
  jenisKak: string;
  jenisPaketMeeting: string;
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  paguAnggaran: string;
  kegiatanDetails: KegiatanDetail[];
  tanggalMulaiKegiatan: Date | null;
  tanggalAkhirKegiatan: Date | null;
  tanggalPengajuanKAK: Date | null;
  pembuatDaftar: string;
  jumlahGelombang: string;
  waveDates: WaveDate[];
}

// Options
const jenisKakOptions = ["Belanja Bahan", "Belanja Honor", "Belanja Modal", "Belanja Paket Meeting", "Belanja Perjalanan Dinas"];
const jenisPaketMeetingOptions = ["Halfday", "Fullday", "Fullboard"];
const satuanOptions = ["BLN", "BS", "Desa", "Dok", "Liter", "Lmbr", "M2", "OB", "OH", "OJP", "OK", "OP", "Paket", "Pasar", "RT", "SET", "SLS", "Stel", "Tahun", "Segmen"];

// Format tanggal Indonesia
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Fungsi untuk mendapatkan nama dari kode
const getNamaFromKode = async (sheetName: string, kode: string, namaColumn: 'C' | 'D'): Promise<string> => {
  if (!kode) return kode;
  
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: DATABASE_SHEET_ID,
        operation: "read",
        range: sheetName
      }
    });

    if (error || !data?.values) {
      console.error(`Error fetching ${sheetName}:`, error);
      return kode;
    }

    const rows = data.values.slice(1); // Skip header
    const foundRow = rows.find((row: any[]) => {
      // Cari berdasarkan kode di kolom B (index 1)
      return row[1] === kode;
    });

    if (foundRow) {
      // Kolom C = index 2, Kolom D = index 3
      const columnIndex = namaColumn === 'C' ? 2 : 3;
      return foundRow[columnIndex] || kode;
    }

    return kode;
  } catch (error) {
    console.error(`Error in getNamaFromKode for ${sheetName}:`, error);
    return kode;
  }
};

// Fungsi untuk mendapatkan nomor urut berikutnya
const getNextSequenceNumber = async (): Promise<number> => {
  try {
    // Baca kolom A (nomor urut) dari spreadsheet
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: TARGET_SPREADSHEET_ID,
        operation: "read",
        range: "KerangkaAcuanKerja!A:A"
      }
    });

    if (error) {
      console.error("Error fetching sequence numbers:", error);
      throw new Error("Gagal mengambil nomor urut terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      // Jika hanya header atau kosong, mulai dari 1
      return 1;
    }

    // Skip header dan ambil hanya angka dari kolom A
    const sequenceNumbers = values
      .slice(1) // Skip header
      .map((row: any[]) => {
        const value = row[0];
        if (typeof value === 'string' && value.trim() !== '') {
          const num = parseInt(value);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter(num => num > 0);

    if (sequenceNumbers.length === 0) {
      return 1;
    }

    return Math.max(...sequenceNumbers) + 1;
  } catch (error) {
    console.error("Error generating sequence number:", error);
    throw error;
  }
};

// Fungsi untuk mendapatkan ID KAK berikutnya
const getNextKakId = async (): Promise<string> => {
  try {
    // Baca data terakhir dari spreadsheet untuk mendapatkan nomor urut terakhir
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: TARGET_SPREADSHEET_ID,
        operation: "read",
        range: "KerangkaAcuanKerja!B:B" // Sekarang ID KAK ada di kolom B
      }
    });

    if (error) {
      console.error("Error fetching last KAK ID:", error);
      throw new Error("Gagal mengambil ID KAK terakhir");
    }

    const values = data?.values || [];
    
    // Filter hanya ID yang sesuai format kak-yymmxxx
    const kakIds = values
      .slice(1) // Skip header
      .flat()
      .filter((id: string) => id && id.startsWith('kak-'))
      .map((id: string) => {
        const match = id.match(/kak-(\d{2})(\d{2})(\d{3})/);
        if (match) {
          return {
            year: parseInt(match[1]),
            month: parseInt(match[2]),
            sequence: parseInt(match[3])
          };
        }
        return null;
      })
      .filter(Boolean);

    const now = new Date();
    const currentYear = now.getFullYear() % 100; // 2 digit terakhir tahun
    const currentMonth = now.getMonth() + 1; // Bulan 1-12

    // Cari sequence terakhir untuk bulan dan tahun ini
    const currentMonthIds = kakIds.filter((id: any) => 
      id.year === currentYear && id.month === currentMonth
    );

    let nextSequence = 1;
    if (currentMonthIds.length > 0) {
      const lastSequence = Math.max(...currentMonthIds.map((id: any) => id.sequence));
      nextSequence = lastSequence + 1;
    }

    // Format: kak-yymmxxx
    const yearStr = currentYear.toString().padStart(2, '0');
    const monthStr = currentMonth.toString().padStart(2, '0');
    const sequenceStr = nextSequence.toString().padStart(3, '0');

    return `kak-${yearStr}${monthStr}${sequenceStr}`;
  } catch (error) {
    console.error("Error generating KAK ID:", error);
    // Fallback: gunakan timestamp jika gagal
    return `kak-${Date.now()}`;
  }
};

// Komponen Select dengan Search yang lebih baik
interface SearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

const SearchSelect: React.FC<SearchSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  // Reset search ketika dropdown dibuka/ditutup
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Select
      value={value}
      onValueChange={(value) => {
        onValueChange(value);
        setIsOpen(false);
      }}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedOption ? selectedOption.label : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {/* Search Input */}
        <div className="relative p-2 border-b">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        
        {/* Options */}
        <div className="max-h-[250px] overflow-y-auto">
          {filteredOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          
          {filteredOptions.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Tidak ditemukan
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

const KerangkaAcuanKerja = () => {
  const { toast } = useToast();
  const [organikData, setOrganikData] = useState<OrganikData[]>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [labelCache, setLabelCache] = useState<{[key: string]: string}>({});
  const [komponenOptions, setKomponenOptions] = useState<Array<{value: string; label: string}>>([]);
  const [akunOptions, setAkunOptions] = useState<Array<{value: string; label: string}>>([]);
  const [loadingKomponen, setLoadingKomponen] = useState(false);
  const [loadingAkun, setLoadingAkun] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    jenisKak: "",
    jenisPaketMeeting: "",
    program: "",
    kegiatan: "",
    kro: "",
    ro: "",
    komponen: "",
    akun: "",
    paguAnggaran: "",
    kegiatanDetails: [{
      id: `kegiatan-${Date.now()}`,
      namaKegiatan: "",
      volume: "",
      satuan: "",
      hargaSatuan: ""
    }],
    tanggalMulaiKegiatan: null,
    tanggalAkhirKegiatan: null,
    tanggalPengajuanKAK: null,
    pembuatDaftar: "",
    jumlahGelombang: "0",
    waveDates: []
  });

  // Fetch data organik dari Google Sheets menggunakan Supabase function
  const fetchOrganikData = async () => {
    setLoadingOrganik(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: ORGANIK_SHEET_ID,
          operation: "read",
          range: "MASTER.ORGANIK"
        }
      });

      if (error) {
        console.error("Error fetching organik data:", error);
        throw new Error(error.message || 'Gagal mengambil data organik');
      }

      const rows = data?.values || [];
      
      if (!rows || rows.length <= 1) {
        setOrganikData([]);
        return;
      }
      
      // Skip header (baris pertama)
      const organikRows = rows.slice(1);
      
      const formattedData: OrganikData[] = organikRows
        .map((row: any[]) => ({
          nip: row[1] || '', // NIP BPS (kolom B)
          nama: row[3] || '', // Nama (kolom D)
          jabatan: row[4] || '', // Jabatan (kolom E)
          kecamatan: row[5] || '' // Kecamatan (kolom F)
        }))
        .filter((item: OrganikData) => item.nama && item.nip);
      
      setOrganikData(formattedData);
      
    } catch (error: any) {
      console.error('Error fetching organik data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data organik: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingOrganik(false);
    }
  };

  // Fetch data komponen untuk search select
  const fetchKomponenOptions = async () => {
    setLoadingKomponen(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: DATABASE_SHEET_ID,
          operation: "read",
          range: "komponen"
        }
      });

      if (error || !data?.values) {
        console.error("Error fetching komponen data:", error);
        return;
      }

      const rows = data.values.slice(1); // Skip header
      const options = rows
        .map((row: any[]) => ({
          value: row[1] || '', // Kode komponen (kolom B)
          label: `${row[1]} - ${row[2]}` // Kode - Nama (kolom C)
        }))
        .filter((opt: {value: string; label: string}) => opt.value && opt.label);

      setKomponenOptions(options);
    } catch (error) {
      console.error("Error fetching komponen options:", error);
    } finally {
      setLoadingKomponen(false);
    }
  };

  // Fetch data akun untuk search select
  const fetchAkunOptions = async () => {
    setLoadingAkun(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: DATABASE_SHEET_ID,
          operation: "read",
          range: "akun"
        }
      });

      if (error || !data?.values) {
        console.error("Error fetching akun data:", error);
        return;
      }

      const rows = data.values.slice(1); // Skip header
      const options = rows
        .map((row: any[]) => ({
          value: row[1] || '', // Kode akun (kolom B)
          label: `${row[1]} - ${row[2]}` // Kode - Nama (kolom C)
        }))
        .filter((opt: {value: string; label: string}) => opt.value && opt.label);

      setAkunOptions(options);
    } catch (error) {
      console.error("Error fetching akun options:", error);
    } finally {
      setLoadingAkun(false);
    }
  };

  // Fungsi untuk mendapatkan label dengan caching
  const getLabelWithCache = async (sheetName: string, kode: string, namaColumn: 'C' | 'D'): Promise<string> => {
    const cacheKey = `${sheetName}-${kode}`;
    
    if (labelCache[cacheKey]) {
      return labelCache[cacheKey];
    }
    
    const nama = await getNamaFromKode(sheetName, kode, namaColumn);
    setLabelCache(prev => ({...prev, [cacheKey]: nama}));
    return nama;
  };

  // Fungsi submit menggunakan Supabase function
  const submitToSpreadsheet = async (rowData: any[]) => {
    try {
      console.log("📤 Submitting data to spreadsheet...");
      console.log("📊 Data length:", rowData.length);

      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TARGET_SPREADSHEET_ID,
          operation: "append",
          range: "KerangkaAcuanKerja",
          values: [rowData]
        }
      });

      if (error) {
        console.error("❌ Supabase function error:", error);
        throw new Error(error.message || 'Gagal mengirim data ke spreadsheet');
      }

      console.log("✅ Submit successful:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Error submitting to spreadsheet:", error);
      throw error;
    }
  };

  // Load data saat komponen mount
  useEffect(() => {
    fetchOrganikData();
    fetchKomponenOptions();
    fetchAkunOptions();
  }, []);

  // Effect untuk update wave dates ketika jumlahGelombang berubah
  useEffect(() => {
    const gelombangCount = parseInt(formData.jumlahGelombang) || 0;
    const newWaveDates: WaveDate[] = [];
    
    for (let i = 0; i < 15; i++) {
      if (i < gelombangCount) {
        const existingWave = formData.waveDates[i];
        newWaveDates.push({
          id: existingWave?.id || `wave-${i + 1}-${Date.now()}`,
          startDate: existingWave?.startDate || null,
          endDate: existingWave?.endDate || null
        });
      } else {
        newWaveDates.push({
          id: `wave-${i + 1}-empty`,
          startDate: null,
          endDate: null
        });
      }
    }
    
    setFormData(prev => ({
      ...prev,
      waveDates: newWaveDates
    }));
  }, [formData.jumlahGelombang]);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Reset dependent fields
      if (field === 'program') {
        newData.kegiatan = '';
        newData.kro = '';
        newData.ro = '';
        newData.komponen = '';
      } else if (field === 'kegiatan') {
        newData.kro = '';
        newData.ro = '';
        newData.komponen = '';
      } else if (field === 'kro') {
        newData.ro = '';
        newData.komponen = '';
      } else if (field === 'ro') {
        newData.komponen = '';
      } else if (field === 'jenisKak' && value !== 'Belanja Paket Meeting') {
        newData.jenisPaketMeeting = '';
        newData.jumlahGelombang = "0";
      }

      return newData;
    });
  };

  const handleWaveDateChange = (waveIndex: number, field: 'startDate' | 'endDate', date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      waveDates: prev.waveDates.map((wave, index) => 
        index === waveIndex ? { ...wave, [field]: date } : wave
      )
    }));
  };

  const handleKegiatanDetailChange = (id: string, field: keyof KegiatanDetail, value: string) => {
    setFormData(prev => ({
      ...prev,
      kegiatanDetails: prev.kegiatanDetails.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addKegiatanDetail = () => {
    if (formData.kegiatanDetails.length >= 15) {
      toast({
        title: "Peringatan",
        description: "Maksimal 15 detail kegiatan",
        variant: "destructive"
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      kegiatanDetails: [
        ...prev.kegiatanDetails,
        {
          id: `kegiatan-${Date.now()}`,
          namaKegiatan: "",
          volume: "",
          satuan: "",
          hargaSatuan: ""
        }
      ]
    }));
  };

  const removeKegiatanDetail = (id: string) => {
    if (formData.kegiatanDetails.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      kegiatanDetails: prev.kegiatanDetails.filter(item => item.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi dasar
    if (!formData.jenisKak || !formData.program || !formData.kegiatan || !formData.kro || 
        !formData.ro || !formData.komponen || !formData.akun || !formData.paguAnggaran ||
        !formData.tanggalPengajuanKAK || !formData.tanggalMulaiKegiatan || !formData.tanggalAkhirKegiatan ||
        !formData.pembuatDaftar) {
      toast({
        title: "Validasi Gagal",
        description: "Semua field wajib diisi",
        variant: "destructive"
      });
      return;
    }

    // Validasi detail kegiatan
    for (let i = 0; i < formData.kegiatanDetails.length; i++) {
      const detail = formData.kegiatanDetails[i];
      if (!detail.namaKegiatan || !detail.volume || !detail.satuan || !detail.hargaSatuan) {
        toast({
          title: "Validasi Gagal",
          description: `Detail Kegiatan ${i + 1} belum lengkap`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validasi untuk Belanja Paket Meeting
    if (formData.jenisKak === "Belanja Paket Meeting") {
      if (!formData.jenisPaketMeeting) {
        toast({
          title: "Validasi Gagal",
          description: "Jenis Paket Meeting wajib diisi",
          variant: "destructive"
        });
        return;
      }

      if (!formData.jumlahGelombang || parseInt(formData.jumlahGelombang) <= 0) {
        toast({
          title: "Validasi Gagal",
          description: "Jumlah Gelombang wajib diisi dan harus lebih dari 0",
          variant: "destructive"
        });
        return;
      }

      const activeWaves = formData.waveDates.slice(0, parseInt(formData.jumlahGelombang));
      for (let i = 0; i < activeWaves.length; i++) {
        const wave = activeWaves[i];
        if (!wave.startDate || !wave.endDate) {
          toast({
            title: "Validasi Gagal",
            description: `Tanggal Gelombang ${i + 1} belum lengkap. Tanggal mulai dan akhir wajib diisi`,
            variant: "destructive"
          });
          return;
        }
      }
    }

    // Validasi tanggal
    if (formData.tanggalPengajuanKAK && formData.tanggalMulaiKegiatan && formData.tanggalPengajuanKAK > formData.tanggalMulaiKegiatan) {
      toast({
        title: "Validasi Tanggal Gagal",
        description: "Tanggal pengajuan KAK harus sebelum tanggal mulai kegiatan",
        variant: "destructive"
      });
      return;
    }

    if (formData.tanggalMulaiKegiatan && formData.tanggalAkhirKegiatan && formData.tanggalMulaiKegiatan > formData.tanggalAkhirKegiatan) {
      toast({
        title: "Validasi Tanggal Gagal",
        description: "Tanggal akhir kegiatan harus setelah atau sama dengan tanggal mulai kegiatan",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate nomor urut dan ID KAK baru
      const [sequenceNumber, kakId] = await Promise.all([
        getNextSequenceNumber(),
        getNextKakId()
      ]);
      
      // Dapatkan nama dari kode untuk setiap field
      const [
        programNama,
        kegiatanNama, 
        kroNama,
        roNama,
        komponenNama,
        akunNama
      ] = await Promise.all([
        getLabelWithCache("program", formData.program, 'C'),
        getLabelWithCache("kegiatan", formData.kegiatan, 'D'),
        getLabelWithCache("kro", formData.kro, 'D'),
        getLabelWithCache("ro", formData.ro, 'D'),
        getLabelWithCache("komponen", formData.komponen, 'C'),
        getLabelWithCache("akun", formData.akun, 'C')
      ]);

      // Siapkan array untuk 15 detail kegiatan
      const kegiatanData = [];
      for (let i = 0; i < 15; i++) {
        if (i < formData.kegiatanDetails.length) {
          const detail = formData.kegiatanDetails[i];
          kegiatanData.push(
            detail.namaKegiatan || "",
            detail.volume || "",
            detail.satuan || "",
            detail.hargaSatuan || ""
          );
        } else {
          kegiatanData.push("", "", "", "");
        }
      }

      // Siapkan array untuk 15 gelombang
      const waveData = [];
      for (let i = 0; i < 15; i++) {
        if (i < parseInt(formData.jumlahGelombang)) {
          const wave = formData.waveDates[i];
          waveData.push(
            formatTanggalIndonesia(wave?.startDate) || "",
            formatTanggalIndonesia(wave?.endDate) || ""
          );
        } else {
          waveData.push("", "");
        }
      }

      // Susun rowData sesuai header spreadsheet - DENGAN NOMOR URUT DI KOLOM PERTAMA
      const rowData = [
        sequenceNumber, // Kolom 1: Nomor Urut
        kakId, // Kolom 2: ID KAK
        formData.jenisKak, // Kolom 3: Jenis KAK
        formData.jenisPaketMeeting, // Kolom 4: Jenis Paket Meeting
        programNama, // Kolom 5: Program Pembebanan (NAMA dari kolom C sheet program)
        kegiatanNama, // Kolom 6: Kegiatan (NAMA dari kolom D sheet kegiatan)
        kroNama, // Kolom 7: Kode Rincian Output (NAMA dari kolom D sheet kro)
        roNama, // Kolom 8: Rincian Output (NAMA dari kolom D sheet ro)
        komponenNama, // Kolom 9: Komponen Output (NAMA dari kolom C sheet komponen)
        akunNama, // Kolom 10: Akun (NAMA dari kolom C sheet akun)
        formData.paguAnggaran, // Kolom 11: Pagu Anggaran
        formatTanggalIndonesia(formData.tanggalPengajuanKAK), // Kolom 12: Tanggal Pengajuan KAK
        formatTanggalIndonesia(formData.tanggalMulaiKegiatan), // Kolom 13: Tanggal Mulai Kegiatan
        formatTanggalIndonesia(formData.tanggalAkhirKegiatan), // Kolom 14: Tanggal Akhir Kegiatan
        formData.pembuatDaftar, // Kolom 15: Pembuat Daftar
        ...kegiatanData, // Kolom 16-75: 60 fields untuk detail kegiatan (15 kegiatan × 4 field)
        formData.jumlahGelombang, // Kolom 76: Jumlah Gelombang
        ...waveData, // Kolom 77-106: 30 fields untuk wave dates (15 gelombang × 2 tanggal)
        "", // Kolom 107: Tanggal Pelaksanaan Gelombang
        "", // Kolom 108: Status
        "" // Kolom 109: Link
      ];

      console.log("📋 Final data to submit:", {
        sequenceNumber,
        kakId,
        program: programNama,
        kegiatan: kegiatanNama,
        kro: kroNama,
        ro: roNama,
        komponen: komponenNama,
        akun: akunNama
      });
      console.log("🔢 Total columns:", rowData.length);

      // Submit menggunakan Supabase function
      await submitToSpreadsheet(rowData);

      toast({
        title: "Sukses!",
        description: `Data KAK berhasil disimpan dengan ID: ${kakId} (No. ${sequenceNumber})`,
        variant: "default"
      });

      // Reset form
      setFormData({
        jenisKak: "",
        jenisPaketMeeting: "",
        program: "",
        kegiatan: "",
        kro: "",
        ro: "",
        komponen: "",
        akun: "",
        paguAnggaran: "",
        kegiatanDetails: [{
          id: `kegiatan-${Date.now()}`,
          namaKegiatan: "",
          volume: "",
          satuan: "",
          hargaSatuan: ""
        }],
        tanggalMulaiKegiatan: null,
        tanggalAkhirKegiatan: null,
        tanggalPengajuanKAK: null,
        pembuatDaftar: "",
        jumlahGelombang: "0",
        waveDates: []
      });

    } catch (error: any) {
      console.error("❌ Error submitting KAK:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShowJenisPaketMeeting = formData.jenisKak === "Belanja Paket Meeting";
  const shouldShowGelombang = formData.jenisKak === "Belanja Paket Meeting";

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Kerangka Acuan Kerja (KAK)</h1>
          <p className="text-muted-foreground mt-2">
            Form pengisian Kerangka Acuan Kerja
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form KAK</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis Kerangka Acuan Kerja <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.jenisKak} 
                    onValueChange={(value) => handleChange('jenisKak', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis KAK" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisKakOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {shouldShowJenisPaketMeeting && (
                  <div className="space-y-2">
                    <Label>Jenis Paket Meeting <span className="text-red-500">*</span></Label>
                    <Select 
                      value={formData.jenisPaketMeeting} 
                      onValueChange={(value) => handleChange('jenisPaketMeeting', value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis paket meeting" />
                      </SelectTrigger>
                      <SelectContent>
                        {jenisPaketMeetingOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Program Pembebanan <span className="text-red-500">*</span></Label>
                  <ProgramSelect
                    value={formData.program}
                    onValueChange={(value) => handleChange('program', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kegiatan <span className="text-red-500">*</span></Label>
                  <KegiatanSelect
                    value={formData.kegiatan}
                    onValueChange={(value) => handleChange('kegiatan', value)}
                    programId={formData.program}
                    disabled={!formData.program}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kode Rincian Output (KRO) <span className="text-red-500">*</span></Label>
                  <KROSelect
                    value={formData.kro}
                    onValueChange={(value) => handleChange('kro', value)}
                    kegiatanId={formData.kegiatan}
                    disabled={!formData.kegiatan}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rincian Output (RO) <span className="text-red-500">*</span></Label>
                  <ROSelect
                    value={formData.ro}
                    onValueChange={(value) => handleChange('ro', value)}
                    kroId={formData.kro}
                    disabled={!formData.kro}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Komponen Output <span className="text-red-500">*</span></Label>
                  <SearchSelect
                    value={formData.komponen}
                    onValueChange={(value) => handleChange('komponen', value)}
                    options={komponenOptions}
                    placeholder={loadingKomponen ? "Memuat data..." : "Pilih komponen output"}
                    disabled={loadingKomponen}
                  />
                  {loadingKomponen && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat data komponen...
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Akun <span className="text-red-500">*</span></Label>
                  <SearchSelect
                    value={formData.akun}
                    onValueChange={(value) => handleChange('akun', value)}
                    options={akunOptions}
                    placeholder={loadingAkun ? "Memuat data..." : "Pilih akun"}
                    disabled={loadingAkun}
                  />
                  {loadingAkun && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat data akun...
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Pagu Anggaran <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={formData.paguAnggaran}
                    onChange={(e) => handleChange('paguAnggaran', e.target.value)}
                    placeholder="Masukkan pagu anggaran"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Pengajuan KAK <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalPengajuanKAK && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalPengajuanKAK ? format(formData.tanggalPengajuanKAK, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalPengajuanKAK || undefined}
                        onSelect={(date) => handleChange('tanggalPengajuanKAK', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Mulai Kegiatan <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalMulaiKegiatan && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalMulaiKegiatan ? format(formData.tanggalMulaiKegiatan, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalMulaiKegiatan || undefined}
                        onSelect={(date) => handleChange('tanggalMulaiKegiatan', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Akhir Kegiatan <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalAkhirKegiatan && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalAkhirKegiatan ? format(formData.tanggalAkhirKegiatan, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalAkhirKegiatan || undefined}
                        onSelect={(date) => handleChange('tanggalAkhirKegiatan', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Nama Pembuat Daftar <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.pembuatDaftar} 
                    onValueChange={(value) => handleChange('pembuatDaftar', value)}
                    required
                    disabled={loadingOrganik}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingOrganik ? "Memuat data..." : "Pilih pembuat daftar"} />
                    </SelectTrigger>
                    <SelectContent>
                      {organikData.map((item) => (
                        <SelectItem key={`${item.nip}-${item.nama}`} value={item.nama}>
                          {item.nama} - {item.jabatan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingOrganik && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat data organik...
                    </div>
                  )}
                </div>

                {shouldShowGelombang && (
                  <div className="space-y-2">
                    <Label>Jumlah Gelombang <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      min="1"
                      max="15"
                      value={formData.jumlahGelombang}
                      onChange={(e) => handleChange('jumlahGelombang', e.target.value)}
                      placeholder="Masukkan jumlah gelombang (1-15)"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Detail Kegiatan */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Detail Kegiatan (Maksimal 15)</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addKegiatanDetail}
                    disabled={formData.kegiatanDetails.length >= 15}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Tambah Kegiatan
                  </Button>
                </div>

                {formData.kegiatanDetails.map((kegiatan, index) => (
                  <Card key={kegiatan.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium">Kegiatan {index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeKegiatanDetail(kegiatan.id)}
                          disabled={formData.kegiatanDetails.length <= 1}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nama Kegiatan <span className="text-red-500">*</span></Label>
                          <Input
                            value={kegiatan.namaKegiatan}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'namaKegiatan', e.target.value)}
                            placeholder="Masukkan nama kegiatan"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Volume <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={kegiatan.volume}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'volume', e.target.value)}
                            placeholder="Masukkan volume"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Satuan <span className="text-red-500">*</span></Label>
                          <Select
                            value={kegiatan.satuan}
                            onValueChange={(value) => handleKegiatanDetailChange(kegiatan.id, 'satuan', value)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              {satuanOptions.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Harga Satuan <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={kegiatan.hargaSatuan}
                            onChange={(e) => handleKegiatanDetailChange(kegiatan.id, 'hargaSatuan', e.target.value)}
                            placeholder="Masukkan harga satuan"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Wave Dates untuk Belanja Paket Meeting */}
              {shouldShowGelombang && parseInt(formData.jumlahGelombang) > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Tanggal Gelombang</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.waveDates.slice(0, parseInt(formData.jumlahGelombang)).map((wave, index) => (
                      <React.Fragment key={wave.id}>
                        <div className="space-y-2">
                          <Label>{`Tanggal Mulai Gelombang ${index + 1}`} <span className="text-red-500">*</span></Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !wave.startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {wave.startDate ? format(wave.startDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={wave.startDate || undefined}
                                onSelect={(date) => handleWaveDateChange(index, 'startDate', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>{`Tanggal Akhir Gelombang ${index + 1}`} <span className="text-red-500">*</span></Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !wave.endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {wave.endDate ? format(wave.endDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={wave.endDate || undefined}
                                onSelect={(date) => handleWaveDateChange(index, 'endDate', date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => window.history.back()}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-24"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default KerangkaAcuanKerja;