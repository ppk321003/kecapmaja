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
import { Calendar as CalendarIcon, Loader2, Trash } from "lucide-react";
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
}

// Options
const jenisOptions = ["Pelatihan", "Briefing", "Rapat Persiapan", "Rapat Evaluasi"];
const trainingCenterOptions = ["BPS Kabupaten Majalengka", "RM. Majalengka", "Fitra Hotel", "Garden Hotel", "Horison Ultima", "Achiera Hotel"];

const DaftarHadir = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [organikData, setOrganikData] = useState<OrganikData[]>([]);
  const [mitraData, setMitraData] = useState<MitraData[]>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [loadingMitra, setLoadingMitra] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    pembuatDaftar: ""
  });

  // Fetch data organik
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

      if (error) throw error;

      const rows = data?.values || [];
      if (rows.length <= 1) {
        setOrganikData([]);
        return;
      }
      
      const formattedData: OrganikData[] = rows.slice(1).map((row: any[]) => ({
        nip: row[1] || '',
        nama: row[3] || '',
        jabatan: row[4] || '',
        kecamatan: row[5] || ''
      })).filter((item: OrganikData) => item.nama && item.nip);
      
      setOrganikData(formattedData);
      
    } catch (error: any) {
      console.error('Error fetching organik data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data organik",
        variant: "destructive"
      });
    } finally {
      setLoadingOrganik(false);
    }
  };

  // PERBAIKAN 2: Fetch data mitra dari sheet MASTER.MITRA
  const fetchMitraData = async () => {
    setLoadingMitra(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: ORGANIK_SHEET_ID,
          operation: "read",
          range: "MASTER.MITRA"
        }
      });

      if (error) throw error;

      const rows = data?.values || [];
      console.log("Data mitra dari sheet:", rows);
      
      if (rows.length <= 1) {
        setMitraData([]);
        return;
      }
      
      const formattedData: MitraData[] = rows.slice(1).map((row: any[], index: number) => ({
        id: `mitra-${index}`,
        nik: row[1] || '', // Kolom B: NIK
        nama: row[2] || '', // Kolom C: Nama
        pekerjaan: row[3] || '', // Kolom D: Pekerjaan
        alamat: row[4] || '', // Kolom E: Alamat
        bank: row[5] || '', // Kolom F: Bank
        rekening: row[6] || '', // Kolom G: Rekening
        kecamatan: row[7] || '' // Kolom H: Kecamatan
      })).filter((item: MitraData) => item.nama);
      
      console.log("Data mitra yang diformat:", formattedData);
      setMitraData(formattedData);
      
    } catch (error: any) {
      console.error('Error fetching mitra data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data mitra",
        variant: "destructive"
      });
    } finally {
      setLoadingMitra(false);
    }
  };

  useEffect(() => {
    fetchOrganikData();
    fetchMitraData();
  }, []);

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrganikChange = (values: string[]) => {
    setFormData(prev => ({
      ...prev,
      organik: values
    }));
  };

  const handleMitraChange = (values: string[]) => {
    setFormData(prev => ({
      ...prev,
      mitra: values
    }));
  };

  const removeOrganik = (orgId: string) => {
    handleOrganikChange(formData.organik.filter(id => id !== orgId));
  };

  const removeMitra = (mitraId: string) => {
    handleMitraChange(formData.mitra.filter(id => id !== mitraId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validasi sederhana
    if (!formData.namaKegiatan || !formData.jenis || !formData.program) {
      toast({
        title: "Error",
        description: "Harap isi semua field yang wajib",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulasi submit - sesuaikan dengan kebutuhan Anda
      console.log("Data yang akan disimpan:", formData);
      
      toast({
        title: "Sukses",
        description: "Daftar hadir berhasil disimpan",
      });
      
      setTimeout(() => {
        navigate("/buat-dokumen");
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        {/* PERBAIKAN 3: Header sederhana tanpa duplikasi */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-orange-600">Daftar Hadir</h1>
          <p className="text-gray-600">Formulir Daftar Hadir</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Form Daftar Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Baris 1: Nama Kegiatan dan Detil */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Kegiatan <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.namaKegiatan}
                    onChange={(e) => handleChange('namaKegiatan', e.target.value)}
                    placeholder="Contoh: Pelatihan Petugas Pemutakhiran Perkembangan Desa Tahun 2025"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Detil Kegiatan</Label>
                  <Input
                    value={formData.detil}
                    onChange={(e) => handleChange('detil', e.target.value)}
                    placeholder="Contoh: Pemutakhiran Perkembangan Desa Tahun 2025"
                  />
                </div>
              </div>

              {/* Baris 2: Jenis dan Tempat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.jenis} 
                    onValueChange={(value) => handleChange('jenis', value)}
                    required
                  >
                    <SelectTrigger>
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
                    <SelectTrigger>
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

              {/* Baris 3: Program dan Kegiatan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Baris 4: KRO dan RO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>KRO <span className="text-red-500">*</span></Label>
                  <KROSelect
                    value={formData.kro}
                    onValueChange={(value) => handleChange('kro', value)}
                    kegiatanId={formData.kegiatan}
                    disabled={!formData.kegiatan}
                  />
                </div>

                <div className="space-y-2">
                  <Label>RO <span className="text-red-500">*</span></Label>
                  <ROSelect
                    value={formData.ro}
                    onValueChange={(value) => handleChange('ro', value)}
                    kroId={formData.kro}
                    disabled={!formData.kro}
                  />
                </div>
              </div>

              {/* Baris 5: Komponen dan AKUN - PERBAIKAN 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Komponen <span className="text-red-500">*</span></Label>
                  <KomponenSelect
                    value={formData.komponen}
                    onValueChange={(value) => handleChange('komponen', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Akun <span className="text-red-500">*</span></Label>
                  <AkunSelect
                    value={formData.akun}
                    onValueChange={(value) => {
                      console.log("Akun dipilih:", value);
                      handleChange('akun', value);
                    }}
                  />
                </div>
              </div>

              {/* Baris 6: Tanggal-tanggal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Baris 7: Pembuat Daftar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pembuat Daftar <span className="text-red-500">*</span></Label>
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
                        <SelectItem key={item.nip} value={item.nip}>
                          {item.nama} - {item.jabatan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PERBAIKAN 2: Data Mitra Statistik */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Peserta Organik */}
                <div className="space-y-3">
                  <Label>Peserta Organik BPS</Label>
                  <Select 
                    onValueChange={(value) => {
                      if (value && !formData.organik.includes(value)) {
                        handleOrganikChange([...formData.organik, value]);
                      }
                    }}
                    disabled={loadingOrganik}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tambah peserta organik" />
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
                  
                  <div className="space-y-2">
                    {formData.organik.map(orgId => {
                      const org = organikData.find(o => o.nip === orgId);
                      return (
                        <div key={orgId} className="flex items-center justify-between p-2 border rounded">
                          <span>{org?.nama}</span>
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
                </div>

                {/* Peserta Mitra - PERBAIKAN 2: Data dari MASTER.MITRA */}
                <div className="space-y-3">
                  <Label>Peserta Mitra Statistik</Label>
                  <Select 
                    onValueChange={(value) => {
                      if (value && !formData.mitra.includes(value)) {
                        handleMitraChange([...formData.mitra, value]);
                      }
                    }}
                    disabled={loadingMitra}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingMitra ? "Memuat data mitra..." : "Tambah peserta mitra"
                      } />
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
                  
                  <div className="space-y-2">
                    {formData.mitra.map(mitraId => {
                      const mitra = mitraData.find(m => m.id === mitraId);
                      return (
                        <div key={mitraId} className="flex items-center justify-between p-2 border rounded">
                          <span>{mitra?.nama}</span>
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
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/buat-dokumen")}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700"
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