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
import { Calendar as CalendarIcon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik, useJenis } from "@/hooks/use-database";
import { KomponenSelect } from "@/components/KomponenSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";
import { FormSelect } from "@/components/FormSelect";
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
const DaftarHadir = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: {
      errors
    }
  } = useForm<FormValues>({
    defaultValues
  });

  // Data queries
  const {
    data: programs = []
  } = usePrograms();
  const {
    data: kegiatan = []
  } = useKegiatan(watch('program') || null);
  const {
    data: kros = []
  } = useKRO(watch('kegiatan') || null);
  const {
    data: ros = []
  } = useRO(watch('kro') || null);
  const {
    data: komponenOptions = []
  } = useKomponen();
  const {
    data: akuns = []
  } = useAkun();
  const {
    data: organikList = []
  } = useOrganikBPS();
  const {
    data: mitraList = []
  } = useMitraStatistik();
  const jenisList = [{
    id: "Pelatihan",
    name: "Pelatihan"
  }, {
    id: "Briefing",
    name: "Briefing"
  }, {
    id: "Rapat Persiapan",
    name: "Rapat Persiapan"
  }, {
    id: "Rapat Evaluasi",
    name: "Rapat Evaluasi"
  }];

  // Create name-to-object mappings for display purposes
  const programsMap = Object.fromEntries((programs || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatan || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kros || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((ros || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenOptions || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akuns || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));
  const pembuatDaftarMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const submitMutation = useSubmitToSheets({
    documentType: "DaftarHadir",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // For name mapping
  const [pembuatDaftarName, setPembuatDaftarName] = useState<string>("");
  const [organikNameMap, setOrganikNameMap] = useState<Record<string, string>>({});
  const [mitraNameMap, setMitraNameMap] = useState<Record<string, string>>({});

  // Effect to update name mappings when selections change
  useEffect(() => {
    // Update pembuat daftar name
    const pembuatId = watch('pembuatDaftar');
    if (pembuatId) {
      const pembuat = organikList.find(item => item.id === pembuatId);
      setPembuatDaftarName(pembuat?.name || "");
    }

    // Update organik name mapping
    const organikIds = watch('organik') || [];
    const newOrganikNameMap: Record<string, string> = {};
    organikIds.forEach(id => {
      const organik = organikList.find(item => item.id === id);
      if (organik) {
        newOrganikNameMap[id] = organik.name;
      }
    });
    setOrganikNameMap(newOrganikNameMap);

    // Update mitra name mapping
    const mitraIds = watch('mitra') || [];
    const newMitraNameMap: Record<string, string> = {};
    mitraIds.forEach(id => {
      const mitra = mitraList.find(item => item.id === id);
      if (mitra) {
        newMitraNameMap[id] = mitra.name;
      }
    });
    setMitraNameMap(newMitraNameMap);
  }, [watch('pembuatDaftar'), watch('organik'), watch('mitra'), organikList, mitraList]);
  const handleSubmitForm = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Combine form values with selected staff
      const submitData = {
        ...data,
        // Add name mappings for proper display in Google Sheets
        _programNameMap: programsMap,
        _kegiatanNameMap: kegiatanMap,
        _kroNameMap: kroMap,
        _roNameMap: roMap,
        _komponenNameMap: komponenMap,
        _akunNameMap: akunMap,
        _organikNameMap: organikNameMap,
        _mitraNameMap: mitraNameMap,
        _pembuatDaftarName: pembuatDaftarName
      };
      console.log('Form submitted:', submitData);

      // Submit to Google Sheets
      await submitMutation.mutateAsync(submitData);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: "Terjadi kesalahan saat menyimpan data"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-700">Daftar Hadir</h1>
          <p className="text-sm text-muted-foreground">
            Formulir Daftar Hadir
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan (cth: Pelatihan Petugas Pemutakhiran Perkembangan Desa Tahun 2025)</Label>
                  <Controller name="namaKegiatan" control={control} rules={{
                  required: "Nama kegiatan harus diisi"
                }} render={({
                  field
                }) => <Input id="namaKegiatan" placeholder="Masukkan nama kegiatan" value={field.value} onChange={field.onChange} />} />
                  {errors.namaKegiatan && <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="detil">Detil (cth: Pemutakhiran Perkembangan Desa Tahun 2025)</Label>
                  <Controller name="detil" control={control} render={({
                  field
                }) => <Input id="detil" placeholder="Masukkan detil kegiatan" value={field.value} onChange={field.onChange} />} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis</Label>
                  <Controller name="jenis" control={control} rules={{
                  required: "Jenis harus dipilih"
                }} render={({
                  field
                }) => <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          {jenisList.map(jenis => <SelectItem key={jenis.id} value={jenis.id}>
                              {jenis.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>} />
                  {errors.jenis && <p className="text-sm text-destructive">{errors.jenis.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program">Program</Label>
                  <Controller name="program" control={control} rules={{
                  required: "Program harus dipilih"
                }} render={({
                  field
                }) => <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map(program => <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>} />
                  {errors.program && <p className="text-sm text-destructive">{errors.program.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kegiatan">Kegiatan</Label>
                  <Controller name="kegiatan" control={control} rules={{
                  required: "Kegiatan harus dipilih"
                }} render={({
                  field
                }) => <Select value={field.value} onValueChange={field.onChange} disabled={!watch('program')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih kegiatan" />
                        </SelectTrigger>
                        <SelectContent>
                          {kegiatan.map(item => <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>} />
                  {errors.kegiatan && <p className="text-sm text-destructive">{errors.kegiatan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kro">KRO</Label>
                  <Controller name="kro" control={control} rules={{
                  required: "KRO harus dipilih"
                }} render={({
                  field
                }) => <Select value={field.value} onValueChange={field.onChange} disabled={!watch('kegiatan')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih KRO" />
                        </SelectTrigger>
                        <SelectContent>
                          {kros.map(item => <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>} />
                  {errors.kro && <p className="text-sm text-destructive">{errors.kro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ro">RO</Label>
                  <Controller name="ro" control={control} rules={{
                  required: "RO harus dipilih"
                }} render={({
                  field
                }) => <Select value={field.value} onValueChange={field.onChange} disabled={!watch('kro')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih RO" />
                        </SelectTrigger>
                        <SelectContent>
                          {ros.map(item => <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>} />
                  {errors.ro && <p className="text-sm text-destructive">{errors.ro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="komponen">Komponen</Label>
                  <Controller name="komponen" control={control} rules={{
                  required: "Komponen harus dipilih"
                }} render={({
                  field
                }) => <KomponenSelect value={field.value} onChange={field.onChange} placeholder="Pilih komponen" />} />
                  {errors.komponen && <p className="text-sm text-destructive">{errors.komponen.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="akun">Akun</Label>
                  <Controller name="akun" control={control} rules={{
                  required: "Akun harus dipilih"
                }} render={({
                  field
                }) => <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih akun" />
                        </SelectTrigger>
                        <SelectContent>
                          {akuns.map(akun => <SelectItem key={akun.id} value={akun.id}>
                              {akun.name} ({akun.code})
                            </SelectItem>)}
                        </SelectContent>
                      </Select>} />
                  {errors.akun && <p className="text-sm text-destructive">{errors.akun.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trainingCenter">Tempat Kegiatan</Label>
                  <Controller name="trainingCenter" control={control} render={({
                  field
                }) => <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tempat kegiatan" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainingCenterOptions.map(option => <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>} />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Controller name="tanggalMulai" control={control} rules={{
                  required: "Tanggal mulai harus diisi"
                }} render={({
                  field
                }) => <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>} />
                  {errors.tanggalMulai && <p className="text-sm text-destructive">{errors.tanggalMulai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Controller name="tanggalSelesai" control={control} rules={{
                  required: "Tanggal selesai harus diisi"
                }} render={({
                  field
                }) => <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>} />
                  {errors.tanggalSelesai && <p className="text-sm text-destructive">{errors.tanggalSelesai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal membuat daftar</Label>
                  <Controller name="tanggalSpj" control={control} rules={{
                  required: "Tanggal SPJ harus diisi"
                }} render={({
                  field
                }) => <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>} />
                  {errors.tanggalSpj && <p className="text-sm text-destructive">{errors.tanggalSpj.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pembuatDaftar">Pembuat Daftar</Label>
                  <Controller name="pembuatDaftar" control={control} rules={{
                  required: "Pembuat daftar harus dipilih"
                }} render={({
                  field
                }) => <FormSelect placeholder="Pilih pembuat daftar" options={organikList.map(item => ({
                  value: item.id,
                  label: item.name
                }))} value={field.value} onChange={field.onChange} />} />
                  {errors.pembuatDaftar && <p className="text-sm text-destructive">{errors.pembuatDaftar.message}</p>}
                </div>
              </div>

              <div className="space-y-6 pt-4">
                {/* Organik BPS dan Mitra Statistik dalam 1 baris */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Organik BPS</Label>
                    <Controller name="organik" control={control} render={({
                    field
                  }) => <div className="w-full h-full">
                          <FormSelect placeholder="Pilih organik BPS" options={organikList.map(item => ({
                      value: item.id,
                      label: item.name
                    }))} value={field.value} onChange={field.onChange} isMulti />
                        </div>} />
                  </div>

                  <div className="space-y-2">
                    <Label>Mitra Statistik</Label>
                    <Controller name="mitra" control={control} render={({
                    field
                  }) => <div className="w-full h-full">
                          <FormSelect placeholder="Pilih mitra statistik" options={mitraList.map(item => ({
                      value: item.id,
                      label: `${item.name}${item.kecamatan ? ` - ${item.kecamatan}` : ''}`
                    }))} value={field.value} onChange={field.onChange} isMulti />
                        </div>} />
                  </div>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-teal-700 hover:bg-teal-600">
                  {isSubmitting ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/buat-dokumen")}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>;
};
export default DaftarHadir;