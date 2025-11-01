import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { KomponenSelect } from "@/components/KomponenSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";
import { FormSelect } from "@/components/FormSelect";

const TARGET_SPREADSHEET_ID = "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";
const SHEET_NAME = "DaftarHadir"; // Ganti dengan nama sheet yang sesuai

interface FormValues {
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

const defaultValues: FormValues = {
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
};

const trainingCenterOptions = ["BPS Kabupaten Majalengka", "RM. Majalengka", "Fitra Hotel", "Garden Hotel", "Horison Ultima", "Achiera Hotel"];
const jenisOptions = ["Pelatihan", "Briefing", "Rapat Persiapan", "Rapat Evaluasi"];

// Format tanggal Indonesia
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

const DaftarHadir = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues
  });

  // Data queries
  const { data: programs = [] } = usePrograms();
  const { data: kegiatan = [] } = useKegiatan(watch('program') || null);
  const { data: kros = [] } = useKRO(watch('kegiatan') || null);
  const { data: ros = [] } = useRO(watch('kro') || null);
  const { data: komponenOptions = [] } = useKomponen();
  const { data: akuns = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  // Use submit to sheets hook dengan format yang sama seperti KAK
  const { submitData, isSubmitting: isSubmittingToSheets } = useSubmitToSheets({
    spreadsheetId: TARGET_SPREADSHEET_ID,
    range: SHEET_NAME,
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "Data Daftar Hadir berhasil dikirim"
      });
      navigate("/buat-dokumen");
    },
    onError: (error) => {
      console.error("Error in submit:", error);
      toast({
        title: "Error",
        description: "Gagal mengirim data ke spreadsheet",
        variant: "destructive"
      });
    }
  });

  // Reset dependent fields ketika program/kegiatan berubah
  useEffect(() => {
    if (!watch('program')) {
      setValue('kegiatan', '');
      setValue('kro', '');
      setValue('ro', '');
      setValue('komponen', '');
    }
  }, [watch('program'), setValue]);

  useEffect(() => {
    if (!watch('kegiatan')) {
      setValue('kro', '');
      setValue('ro', '');
      setValue('komponen', '');
    }
  }, [watch('kegiatan'), setValue]);

  useEffect(() => {
    if (!watch('kro')) {
      setValue('ro', '');
      setValue('komponen', '');
    }
  }, [watch('kro'), setValue]);

  useEffect(() => {
    if (!watch('ro')) {
      setValue('komponen', '');
    }
  }, [watch('ro'), setValue]);

  const handleSubmitForm = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      const timestamp = new Date().toISOString();
      
      // Cari nama-nama untuk mapping
      const programName = programs.find(p => p.id === data.program)?.name || data.program;
      const kegiatanName = kegiatan.find(k => k.id === data.kegiatan)?.name || data.kegiatan;
      const kroName = kros.find(k => k.id === data.kro)?.name || data.kro;
      const roName = ros.find(r => r.id === data.ro)?.name || data.ro;
      const komponenName = komponenOptions.find(k => k.id === data.komponen)?.name || data.komponen;
      const akunName = akuns.find(a => a.id === data.akun)?.name || data.akun;
      const pembuatDaftarName = organikList.find(o => o.id === data.pembuatDaftar)?.name || data.pembuatDaftar;

      // Format organik dan mitra sebagai string gabungan
      const organikNames = data.organik
        .map(id => organikList.find(o => o.id === id)?.name || id)
        .join(', ');
      
      const mitraNames = data.mitra
        .map(id => {
          const mitra = mitraList.find(m => m.id === id);
          return mitra ? `${mitra.name}${mitra.kecamatan ? ` - ${mitra.kecamatan}` : ''}` : id;
        })
        .join(', ');

      // Susun rowData sesuai dengan struktur spreadsheet DaftarHadir
      // Sesuaikan urutan kolom dengan header di spreadsheet
      const rowData = [
        timestamp, // ID/Timestamp
        data.namaKegiatan,
        data.detil,
        data.jenis,
        programName,
        kegiatanName,
        kroName,
        roName,
        komponenName,
        akunName,
        data.trainingCenter,
        formatTanggalIndonesia(data.tanggalMulai),
        formatTanggalIndonesia(data.tanggalSelesai),
        formatTanggalIndonesia(data.tanggalSpj),
        organikNames, // Organik BPS sebagai string gabungan
        mitraNames, // Mitra Statistik sebagai string gabungan
        pembuatDaftarName
        // Tambahkan kolom tambahan jika diperlukan sesuai struktur spreadsheet
      ];

      console.log("Mengirim data Daftar Hadir ke spreadsheet:");
      console.log("Jumlah kolom:", rowData.length);
      console.log("Data:", rowData);

      await submitData(rowData);

    } catch (error) {
      console.error("Error submitting Daftar Hadir:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengirim data",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmittingOverall = isSubmitting || isSubmittingToSheets;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">Daftar Hadir</h1>
          <p className="text-sm text-muted-foreground">
            Formulir Daftar Hadir - Sheet: {SHEET_NAME}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="namaKegiatan" 
                    control={control} 
                    rules={{ required: "Nama kegiatan harus diisi" }}
                    render={({ field }) => (
                      <Input 
                        id="namaKegiatan" 
                        placeholder="Contoh: Pelatihan Petugas Pemutakhiran Perkembangan Desa Tahun 2025" 
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    )} 
                  />
                  {errors.namaKegiatan && <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="detil">Detil Kegiatan</Label>
                  <Controller 
                    name="detil" 
                    control={control} 
                    render={({ field }) => (
                      <Input 
                        id="detil" 
                        placeholder="Contoh: Pemutakhiran Perkembangan Desa Tahun 2025" 
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    )} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="jenis" 
                    control={control} 
                    rules={{ required: "Jenis harus dipilih" }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          {jenisOptions.map(jenis => (
                            <SelectItem key={jenis} value={jenis}>
                              {jenis}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} 
                  />
                  {errors.jenis && <p className="text-sm text-destructive">{errors.jenis.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program">Program <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="program" 
                    control={control} 
                    rules={{ required: "Program harus dipilih" }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map(program => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} 
                  />
                  {errors.program && <p className="text-sm text-destructive">{errors.program.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kegiatan">Kegiatan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="kegiatan" 
                    control={control} 
                    rules={{ required: "Kegiatan harus dipilih" }}
                    render={({ field }) => (
                      <KegiatanSelect 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Pilih kegiatan" 
                        programId={watch('program')} 
                        disabled={!watch('program')}
                      />
                    )} 
                  />
                  {errors.kegiatan && <p className="text-sm text-destructive">{errors.kegiatan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kro">KRO <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="kro" 
                    control={control} 
                    rules={{ required: "KRO harus dipilih" }}
                    render={({ field }) => (
                      <KROSelect 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Pilih KRO" 
                        kegiatanId={watch('kegiatan')} 
                        disabled={!watch('kegiatan')}
                      />
                    )} 
                  />
                  {errors.kro && <p className="text-sm text-destructive">{errors.kro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ro">RO <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="ro" 
                    control={control} 
                    rules={{ required: "RO harus dipilih" }}
                    render={({ field }) => (
                      <ROSelect 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Pilih RO" 
                        kroId={watch('kro')} 
                        disabled={!watch('kro')}
                      />
                    )} 
                  />
                  {errors.ro && <p className="text-sm text-destructive">{errors.ro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="komponen">Komponen <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="komponen" 
                    control={control} 
                    rules={{ required: "Komponen harus dipilih" }}
                    render={({ field }) => (
                      <KomponenSelect 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Pilih komponen" 
                      />
                    )} 
                  />
                  {errors.komponen && <p className="text-sm text-destructive">{errors.komponen.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="akun">Akun <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="akun" 
                    control={control} 
                    rules={{ required: "Akun harus dipilih" }}
                    render={({ field }) => (
                      <AkunSelect 
                        value={field.value} 
                        onChange={field.onChange} 
                        placeholder="Pilih akun" 
                      />
                    )} 
                  />
                  {errors.akun && <p className="text-sm text-destructive">{errors.akun.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trainingCenter">Tempat Kegiatan</Label>
                  <Controller 
                    name="trainingCenter" 
                    control={control} 
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
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
                    )} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Mulai <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalMulai" 
                    control={control} 
                    rules={{ required: "Tanggal mulai harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={field.value || undefined} 
                            onSelect={field.onChange} 
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalMulai && <p className="text-sm text-destructive">{errors.tanggalMulai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalSelesai" 
                    control={control} 
                    rules={{ required: "Tanggal selesai harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={field.value || undefined} 
                            onSelect={field.onChange} 
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalSelesai && <p className="text-sm text-destructive">{errors.tanggalSelesai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Membuat Daftar <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalSpj" 
                    control={control} 
                    rules={{ required: "Tanggal membuat daftar harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar 
                            mode="single" 
                            selected={field.value || undefined} 
                            onSelect={field.onChange} 
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalSpj && <p className="text-sm text-destructive">{errors.tanggalSpj.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pembuatDaftar">Pembuat Daftar <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="pembuatDaftar" 
                    control={control} 
                    rules={{ required: "Pembuat daftar harus dipilih" }}
                    render={({ field }) => (
                      <FormSelect 
                        placeholder="Pilih pembuat daftar" 
                        options={organikList.map(item => ({
                          value: item.id,
                          label: item.name
                        }))} 
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    )} 
                  />
                  {errors.pembuatDaftar && <p className="text-sm text-destructive">{errors.pembuatDaftar.message}</p>}
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Organik BPS</Label>
                    <Controller 
                      name="organik" 
                      control={control} 
                      render={({ field }) => (
                        <div className="w-full h-full">
                          <FormSelect 
                            placeholder="Pilih organik BPS" 
                            options={organikList.map(item => ({
                              value: item.id,
                              label: item.name
                            }))} 
                            value={field.value} 
                            onChange={field.onChange} 
                            isMulti 
                          />
                        </div>
                      )} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mitra Statistik</Label>
                    <Controller 
                      name="mitra" 
                      control={control} 
                      render={({ field }) => (
                        <div className="w-full h-full">
                          <FormSelect 
                            placeholder="Pilih mitra statistik" 
                            options={mitraList.map(item => ({
                              value: item.id,
                              label: `${item.name}${item.kecamatan ? ` - ${item.kecamatan}` : ''}`
                            }))} 
                            value={field.value} 
                            onChange={field.onChange} 
                            isMulti 
                          />
                        </div>
                      )} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate("/buat-dokumen")}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmittingOverall} className="flex-1 bg-teal-700 hover:bg-teal-600">
                  {isSubmittingOverall ? "Menyimpan..." : "Simpan Dokumen"}
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