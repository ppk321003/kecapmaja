import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search, Plus, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ProgramSelect } from "@/components/ProgramSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
import { KomponenSelect } from "@/components/KomponenSelect";
import { AkunSelect } from "@/components/AkunSelect";

const TARGET_SPREADSHEET_ID = "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";
const ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const DATABASE_SHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface OrganikData {
  nip: string;
  nama: string;
  jabatan: string;
  kecamatan: string;
}

interface MitraData {
  id: string;
  nik: string;
  nama: string;
  pekerjaan: string;
  alamat: string;
  bank: string;
  rekening: string;
  kecamatan: string;
}

interface Peserta {
  id: string;
  nama: string;
  jenis: "organik" | "mitra";
  kecamatan?: string;
}

interface FormData {
  namaKegiatan: string;
  detil: string;
  jenis: string;
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  trainingCenter: string;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalSpj: Date | null;
  organik: string[];
  mitra: string[];
  pembuatDaftar: string;
  peserta: Peserta[];
}

// Options
const jenisOptions = ["Pelatihan", "Briefing", "Rapat Persiapan", "Rapat Evaluasi"];
const trainingCenterOptions = ["BPS Kabupaten Majalengka", "RM. Majalengka", "Fitra Hotel", "Garden Hotel", "Horison Ultima", "Achiera Hotel"];

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
        range: "DaftarHadir!A:A"
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

const DaftarHadir = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [organikData, setOrganikData] = useState<OrganikData[]>([]);
  const [mitraData, setMitraData] = useState<MitraData[]>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [loadingMitra, setLoadingMitra] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [labelCache, setLabelCache] = useState<{[key: string]: string}>({});
  
  const [formData, setFormData] = useState<FormData>({
    namaKegiatan: "",
    detil: "",
    jenis: "",
    program: "",
    kegiatan: "",
    kro: "",
    ro: "",
    komponen: "",
    akun: "",
    trainingCenter: "",
    tanggalMulai: null,
    tanggalSelesai: null,
    tanggalSpj: null,
    organik: [],
    mitra: [],
    pembuatDaftar: "",
    peserta: []
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

  // Fetch data mitra dari Google Sheets - sheet MASTER.MITRA
  const fetchMitraData = async () => {
    setLoadingMitra(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: ORGANIK_SHEET_ID, // Menggunakan sheet yang sama dengan organik
          operation: "read",
          range: "MASTER.MITRA"
        }
      });

      if (error) {
        console.error("Error fetching mitra data:", error);
        throw new Error(error.message || 'Gagal mengambil data mitra');
      }

      const rows = data?.values || [];
      
      if (!rows || rows.length <= 1) {
        setMitraData([]);
        return;
      }
      
      // Skip header (baris pertama)
      const mitraRows = rows.slice(1);
      
      const formattedData: MitraData[] = mitraRows
        .map((row: any[], index: number) => ({
          id: `mitra-${index}`,
          nik: row[1] || '', // NIK (kolom B)
          nama: row[2] || '', // Nama (kolom C)
          pekerjaan: row[3] || '', // Pekerjaan (kolom D)
          alamat: row[4] || '', // Alamat (kolom E)
          bank: row[5] || '', // Bank (kolom F)
          rekening: row[6] || '', // Rekening (kolom G)
          kecamatan: row[7] || '' // Kecamatan (kolom H)
        }))
        .filter((item: MitraData) => item.nama);
      
      setMitraData(formattedData);
      
    } catch (error: any) {
      console.error('Error fetching mitra data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data mitra: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingMitra(false);
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
          range: "DaftarHadir",
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
    fetchMitraData();
  }, []);

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
      }

      return newData;
    });
  };

  const handleOrganikChange = (values: string[]) => {
    setFormData(prev => ({
      ...prev,
      organik: values,
      peserta: [
        ...prev.peserta.filter(p => p.jenis !== "organik"),
        ...values.map(orgId => {
          const org = organikData.find(o => o.nip === orgId);
          return {
            id: `org-${orgId}`,
            nama: org?.nama || "",
            jenis: "organik" as const,
            kecamatan: org?.kecamatan
          };
        })
      ]
    }));
  };

  const handleMitraChange = (values: string[]) => {
    setFormData(prev => ({
      ...prev,
      mitra: values,
      peserta: [
        ...prev.peserta.filter(p => p.jenis !== "mitra"),
        ...values.map(mitraId => {
          const mitra = mitraData.find(m => m.id === mitraId);
          return {
            id: `mitra-${mitraId}`,
            nama: mitra?.nama || "",
            jenis: "mitra" as const,
            kecamatan: mitra?.kecamatan
          };
        })
      ]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi dasar
    if (!formData.namaKegiatan || !formData.jenis || !formData.program || !formData.kegiatan || 
        !formData.kro || !formData.ro || !formData.komponen || !formData.akun ||
        !formData.tanggalMulai || !formData.tanggalSelesai || !formData.tanggalSpj ||
        !formData.pembuatDaftar) {
      toast({
        title: "Validasi Gagal",
        description: "Semua field wajib diisi",
        variant: "destructive"
      });
      return;
    }

    // Validasi peserta
    if (formData.organik.length === 0 && formData.mitra.length === 0) {
      toast({
        title: "Validasi Gagal",
        description: "Pilih minimal satu peserta (organik atau mitra)",
        variant: "destructive"
      });
      return;
    }

    // Validasi tanggal
    if (formData.tanggalMulai && formData.tanggalSelesai && formData.tanggalMulai > formData.tanggalSelesai) {
      toast({
        title: "Validasi Tanggal Gagal",
        description: "Tanggal selesai harus setelah atau sama dengan tanggal mulai",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate nomor urut baru
      const sequenceNumber = await getNextSequenceNumber();
      
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

      // Dapatkan nama pembuat daftar
      const pembuatDaftarData = organikData.find(org => org.nip === formData.pembuatDaftar);
      const pembuatDaftarNama = pembuatDaftarData?.nama || formData.pembuatDaftar;

      // Siapkan data peserta organik (maksimal 30)
      const pesertaOrganikData = [];
      for (let i = 0; i < 30; i++) {
        if (i < formData.organik.length) {
          const orgId = formData.organik[i];
          const org = organikData.find(o => o.nip === orgId);
          pesertaOrganikData.push(org?.nama || "");
        } else {
          pesertaOrganikData.push("");
        }
      }

      // Siapkan data peserta mitra (maksimal 30)
      const pesertaMitraData = [];
      for (let i = 0; i < 30; i++) {
        if (i < formData.mitra.length) {
          const mitraId = formData.mitra[i];
          const mitra = mitraData.find(m => m.id === mitraId);
          pesertaMitraData.push(mitra?.nama || "");
        } else {
          pesertaMitraData.push("");
        }
      }

      // Susun rowData sesuai header spreadsheet
      const rowData = [
        sequenceNumber, // Kolom 1: Nomor Urut
        formData.namaKegiatan, // Kolom 2: Nama Kegiatan
        formData.detil, // Kolom 3: Detil
        formData.jenis, // Kolom 4: Jenis
        programNama, // Kolom 5: Program Pembebanan
        kegiatanNama, // Kolom 6: Kegiatan
        kroNama, // Kolom 7: KRO
        roNama, // Kolom 8: RO
        komponenNama, // Kolom 9: Komponen
        akunNama, // Kolom 10: Akun
        formData.trainingCenter, // Kolom 11: Tempat Kegiatan
        formatTanggalIndonesia(formData.tanggalMulai), // Kolom 12: Tanggal Mulai
        formatTanggalIndonesia(formData.tanggalSelesai), // Kolom 13: Tanggal Selesai
        formatTanggalIndonesia(formData.tanggalSpj), // Kolom 14: Tanggal SPJ
        pembuatDaftarNama, // Kolom 15: Pembuat Daftar
        ...pesertaOrganikData, // Kolom 16-45: 30 fields untuk peserta organik
        ...pesertaMitraData, // Kolom 46-75: 30 fields untuk peserta mitra
        "", // Kolom 76: Status
        "" // Kolom 77: Link
      ];

      console.log("📋 Final data to submit:", {
        sequenceNumber,
        namaKegiatan: formData.namaKegiatan,
        program: programNama,
        kegiatan: kegiatanNama,
        pesertaOrganik: formData.organik.length,
        pesertaMitra: formData.mitra.length
      });
      console.log("🔢 Total columns:", rowData.length);

      // Submit menggunakan Supabase function
      await submitToSpreadsheet(rowData);

      toast({
        title: "Sukses!",
        description: `Daftar Hadir berhasil disimpan dengan nomor: ${sequenceNumber}`,
        variant: "default"
      });

      // Navigate kembali setelah sukses
      setTimeout(() => {
        navigate("/buat-dokumen");
      }, 2000);

    } catch (error: any) {
      console.error("❌ Error submitting Daftar Hadir:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeOrganik = (orgId: string) => {
    handleOrganikChange(formData.organik.filter(id => id !== orgId));
  };

  const removeMitra = (mitraId: string) => {
    handleMitraChange(formData.mitra.filter(id => id !== mitraId));
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 max-w-7xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-600">Daftar Hadir</h1>
          <p className="text-muted-foreground mt-2">
            Formulir Daftar Hadir
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Form Daftar Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informasi Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan <span className="text-red-500">*</span></Label>
                  <Input
                    id="namaKegiatan"
                    value={formData.namaKegiatan}
                    onChange={(e) => handleChange('namaKegiatan', e.target.value)}
                    placeholder="Contoh: Pelatihan Petugas Pemutakhiran Perkembangan Desa Tahun 2025"
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detil">Detil Kegiatan</Label>
                  <Input
                    id="detil"
                    value={formData.detil}
                    onChange={(e) => handleChange('detil', e.target.value)}
                    placeholder="Contoh: Pemutakhiran Perkembangan Desa Tahun 2025"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Jenis <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.jenis} 
                    onValueChange={(value) => handleChange('jenis', value)}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tempat Kegiatan</Label>
                  <Select 
                    value={formData.trainingCenter} 
                    onValueChange={(value) => handleChange('trainingCenter', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih tempat kegiatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainingCenterOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Program dan Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <KomponenSelect
                    value={formData.komponen}
                    onValueChange={(value) => handleChange('komponen', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Akun <span className="text-red-500">*</span></Label>
                  <AkunSelect
                    value={formData.akun}
                    onValueChange={(value) => handleChange('akun', value)}
                  />
                </div>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Tanggal Mulai <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalMulai && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalMulai ? format(formData.tanggalMulai, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalMulai || undefined}
                        onSelect={(date) => handleChange('tanggalMulai', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalSelesai && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalSelesai ? format(formData.tanggalSelesai, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalSelesai || undefined}
                        onSelect={(date) => handleChange('tanggalSelesai', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal SPJ <span className="text-red-500">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.tanggalSpj && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggalSpj ? format(formData.tanggalSpj, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.tanggalSpj || undefined}
                        onSelect={(date) => handleChange('tanggalSpj', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Pembuat Daftar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Pembuat Daftar <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.pembuatDaftar} 
                    onValueChange={(value) => handleChange('pembuatDaftar', value)}
                    required
                    disabled={loadingOrganik}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={loadingOrganik ? "Memuat data..." : "Pilih pembuat daftar"} />
                    </SelectTrigger>
                    <SelectContent>
                      {organikData.map((item) => (
                        <SelectItem key={item.nip} value={item.nip}>
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
              </div>

              {/* Peserta Organik dan Mitra */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Peserta Organik */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Peserta Organik BPS</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Select 
                        value="" 
                        onValueChange={(value) => {
                          if (value && !formData.organik.includes(value)) {
                            handleOrganikChange([...formData.organik, value]);
                          }
                        }}
                        disabled={loadingOrganik}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingOrganik ? "Memuat data..." : "Tambah peserta organik"} />
                        </SelectTrigger>
                        <SelectContent>
                          {organikData
                            .filter(org => !formData.organik.includes(org.nip))
                            .map((item) => (
                              <SelectItem key={item.nip} value={item.nip}>
                                {item.nama} - {item.jabatan}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Daftar peserta organik yang sudah dipilih */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {formData.organik.map(orgId => {
                        const org = organikData.find(o => o.nip === orgId);
                        return (
                          <div key={orgId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{org?.nama}</p>
                              <p className="text-sm text-muted-foreground">{org?.jabatan}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOrganik(orgId)}
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Peserta Mitra */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Peserta Mitra Statistik</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Select 
                        value="" 
                        onValueChange={(value) => {
                          if (value && !formData.mitra.includes(value)) {
                            handleMitraChange([...formData.mitra, value]);
                          }
                        }}
                        disabled={loadingMitra}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingMitra ? "Memuat data..." : "Tambah peserta mitra"} />
                        </SelectTrigger>
                        <SelectContent>
                          {mitraData
                            .filter(mitra => !formData.mitra.includes(mitra.id))
                            .map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.nama} - {item.kecamatan}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                      {loadingMitra && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Memuat data mitra...
                        </div>
                      )}
                    </div>
                    
                    {/* Daftar peserta mitra yang sudah dipilih */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {formData.mitra.map(mitraId => {
                        const mitra = mitraData.find(m => m.id === mitraId);
                        return (
                          <div key={mitraId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{mitra?.nama}</p>
                              <p className="text-sm text-muted-foreground">{mitra?.kecamatan}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMitra(mitraId)}
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ringkasan Peserta */}
              {formData.peserta.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Ringkasan Peserta ({formData.peserta.length} orang)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3 text-green-600">
                          Organik BPS ({formData.organik.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {formData.peserta
                            .filter(p => p.jenis === "organik")
                            .map(p => (
                              <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{p.nama}</span>
                                <span className="text-xs text-muted-foreground">{p.kecamatan}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3 text-blue-600">
                          Mitra Statistik ({formData.mitra.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {formData.peserta
                            .filter(p => p.jenis === "mitra")
                            .map(p => (
                              <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{p.nama}</span>
                                <span className="text-xs text-muted-foreground">{p.kecamatan}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/buat-dokumen")}
                  disabled={isSubmitting}
                  className="min-w-24"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="min-w-32 bg-teal-600 hover:bg-teal-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Dokumen"
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

export default DaftarHadir;