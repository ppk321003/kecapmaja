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
import { Calendar as CalendarIcon, Plus, Trash, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const TARGET_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";
const MASTER_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

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

// Mapping untuk struktur kolom spreadsheet KAK
const KAK_COLUMN_MAPPING = {
  timestamp: 0,
  jenisKak: 1,
  jenisPaketMeeting: 2,
  program: 3,
  kegiatan: 4,
  kro: 5,
  ro: 6,
  komponen: 7,
  akun: 8,
  paguAnggaran: 9,
  tanggalPengajuanKAK: 10,
  tanggalMulaiKegiatan: 11,
  tanggalAkhirKegiatan: 12,
  pembuatDaftar: 13,
  // 14-73: Detail kegiatan (15 items × 4 fields)
  jumlahGelombang: 74,
  // 75-104: Wave dates (15 items × 2 fields)
  tanggalPelaksanaanGelombang: 105
};

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

const KerangkaAcuanKerja = () => {
  const { toast } = useToast();
  const [organikData, setOrganikData] = useState<OrganikData[]>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  // Fungsi untuk mengambil data organik menggunakan Supabase function
  const fetchOrganikData = async () => {
    setLoadingOrganik(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SHEET_ID,
          operation: "read",
          range: "MASTER.ORGANIK"
        }
      });

      if (error) {
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

  // Fungsi submit menggunakan Supabase function
  const submitToSpreadsheet = async (rowData: any[]) => {
    try {
      console.log("📤 Submitting data to spreadsheet:", rowData);
      console.log("📊 Data length:", rowData.length);

      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TARGET_SPREADSHEET_ID,
          operation: "append",
          range: "Sheet1",
          values: [rowData]
        }
      });

      if (error) {
        throw new Error(error.message || 'Gagal mengirim data ke spreadsheet');
      }

      return data;
    } catch (error: any) {
      console.error("❌ Error submitting to spreadsheet:", error);
      throw error;
    }
  };

  // Load data organik saat komponen mount
  useEffect(() => {
    fetchOrganikData();
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

  // Fungsi validasi yang lebih komprehensif
  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.jenisKak) errors.push("Jenis Kerangka Acuan Kerja wajib diisi");
    if (formData.jenisKak === "Belanja Paket Meeting" && !formData.jenisPaketMeeting) {
      errors.push("Jenis Paket Meeting wajib diisi");
    }
    if (!formData.program) errors.push("Program Pembebanan wajib diisi");
    if (!formData.kegiatan) errors.push("Kegiatan wajib diisi");
    if (!formData.kro) errors.push("KRO wajib diisi");
    if (!formData.ro) errors.push("RO wajib diisi");
    if (!formData.komponen) errors.push("Komponen Output wajib diisi");
    if (!formData.akun) errors.push("Akun wajib diisi");
    if (!formData.paguAnggaran) errors.push("Pagu Anggaran wajib diisi");
    if (!formData.tanggalPengajuanKAK) errors.push("Tanggal Pengajuan KAK wajib diisi");
    if (!formData.tanggalMulaiKegiatan) errors.push("Tanggal Mulai Kegiatan wajib diisi");
    if (!formData.tanggalAkhirKegiatan) errors.push("Tanggal Akhir Kegiatan wajib diisi");
    if (!formData.pembuatDaftar) errors.push("Pembuat Daftar wajib diisi");

    // Validasi detail kegiatan
    formData.kegiatanDetails.forEach((detail, index) => {
      if (!detail.namaKegiatan) errors.push(`Nama Kegiatan ${index + 1} wajib diisi`);
      if (!detail.volume) errors.push(`Volume Kegiatan ${index + 1} wajib diisi`);
      if (!detail.satuan) errors.push(`Satuan Kegiatan ${index + 1} wajib diisi`);
      if (!detail.hargaSatuan) errors.push(`Harga Satuan Kegiatan ${index + 1} wajib diisi`);
    });

    // Validasi untuk Belanja Paket Meeting
    if (formData.jenisKak === "Belanja Paket Meeting") {
      if (!formData.jumlahGelombang || parseInt(formData.jumlahGelombang) <= 0) {
        errors.push("Jumlah Gelombang wajib diisi dan harus lebih dari 0");
      } else {
        const activeWaves = formData.waveDates.slice(0, parseInt(formData.jumlahGelombang));
        activeWaves.forEach((wave, index) => {
          if (!wave.startDate) errors.push(`Tanggal Mulai Gelombang ${index + 1} wajib diisi`);
          if (!wave.endDate) errors.push(`Tanggal Akhir Gelombang ${index + 1} wajib diisi`);
        });
      }
    }

    // Validasi logika tanggal
    if (formData.tanggalPengajuanKAK && formData.tanggalMulaiKegiatan && 
        formData.tanggalPengajuanKAK > formData.tanggalMulaiKegiatan) {
      errors.push("Tanggal pengajuan KAK harus sebelum tanggal mulai kegiatan");
    }

    if (formData.tanggalMulaiKegiatan && formData.tanggalAkhirKegiatan && 
        formData.tanggalMulaiKegiatan > formData.tanggalAkhirKegiatan) {
      errors.push("Tanggal akhir kegiatan harus setelah atau sama dengan tanggal mulai kegiatan");
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast({
          title: "Validasi Gagal",
          description: error,
          variant: "destructive"
        });
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const timestamp = new Date().toISOString();
      
      // Siapkan array untuk 15 detail kegiatan
      const kegiatanData: string[] = [];
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
          // Isi dengan empty string untuk detail yang tidak ada
          kegiatanData.push("", "", "", "");
        }
      }

      // Siapkan array untuk 15 gelombang
      const waveData: string[] = [];
      for (let i = 0; i < 15; i++) {
        if (i < parseInt(formData.jumlahGelombang)) {
          const wave = formData.waveDates[i];
          waveData.push(
            formatTanggalIndonesia(wave?.startDate) || "",
            formatTanggalIndonesia(wave?.endDate) || ""
          );
        } else {
          // Isi dengan empty string untuk gelombang yang tidak ada
          waveData.push("", "");
        }
      }

      // Susun rowData sesuai dengan mapping kolom
      const rowData = new Array(106).fill(""); // Buat array dengan 106 elemen kosong

      // Isi data sesuai mapping
      rowData[KAK_COLUMN_MAPPING.timestamp] = timestamp;
      rowData[KAK_COLUMN_MAPPING.jenisKak] = formData.jenisKak;
      rowData[KAK_COLUMN_MAPPING.jenisPaketMeeting] = formData.jenisPaketMeeting;
      rowData[KAK_COLUMN_MAPPING.program] = formData.program;
      rowData[KAK_COLUMN_MAPPING.kegiatan] = formData.kegiatan;
      rowData[KAK_COLUMN_MAPPING.kro] = formData.kro;
      rowData[KAK_COLUMN_MAPPING.ro] = formData.ro;
      rowData[KAK_COLUMN_MAPPING.komponen] = formData.komponen;
      rowData[KAK_COLUMN_MAPPING.akun] = formData.akun;
      rowData[KAK_COLUMN_MAPPING.paguAnggaran] = formData.paguAnggaran;
      rowData[KAK_COLUMN_MAPPING.tanggalPengajuanKAK] = formatTanggalIndonesia(formData.tanggalPengajuanKAK);
      rowData[KAK_COLUMN_MAPPING.tanggalMulaiKegiatan] = formatTanggalIndonesia(formData.tanggalMulaiKegiatan);
      rowData[KAK_COLUMN_MAPPING.tanggalAkhirKegiatan] = formatTanggalIndonesia(formData.tanggalAkhirKegiatan);
      rowData[KAK_COLUMN_MAPPING.pembuatDaftar] = formData.pembuatDaftar;
      
      // Isi detail kegiatan (kolom 14-73)
      for (let i = 0; i < kegiatanData.length; i++) {
        rowData[14 + i] = kegiatanData[i];
      }
      
      rowData[KAK_COLUMN_MAPPING.jumlahGelombang] = formData.jumlahGelombang;
      
      // Isi wave dates (kolom 75-104)
      for (let i = 0; i < waveData.length; i++) {
        rowData[75 + i] = waveData[i];
      }
      
      rowData[KAK_COLUMN_MAPPING.tanggalPelaksanaanGelombang] = "";

      console.log("📋 Final row data structure:", rowData);
      console.log("🔢 Total columns:", rowData.length);

      // Submit menggunakan Supabase function
      await submitToSpreadsheet(rowData);

      toast({
        title: "Sukses",
        description: "Data KAK berhasil dikirim ke spreadsheet"
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
        description: "Gagal mengirim data: " + error.message,
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
                  {!loadingOrganik && organikData.length === 0 && (
                    <p className="text-sm text-muted-foreground">Tidak ada data organik tersedia</p>
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