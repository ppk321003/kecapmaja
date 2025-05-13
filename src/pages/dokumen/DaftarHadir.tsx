import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { FormSelect } from "@/components/FormSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

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
  tanggalMulai: string;
  tanggalSelesai: string;
  organikBPS: string[];
  mitraStatistik: string[];
  pembuatDaftar: string;
}

// Dummy data
const jenisOptions = ["Pertemuan", "Pelatihan", "Rapat", "Sosialisasi"];
const programOptions = ["Program 1", "Program 2", "Program 3"];
const kegiatanOptions = {
  "Program 1": ["Kegiatan 1-A", "Kegiatan 1-B"],
  "Program 2": ["Kegiatan 2-A", "Kegiatan 2-B"],
  "Program 3": ["Kegiatan 3-A", "Kegiatan 3-B"]
};
const kroOptions = {
  "Kegiatan 1-A": ["KRO 1-A1", "KRO 1-A2"],
  "Kegiatan 1-B": ["KRO 1-B1", "KRO 1-B2"],
  "Kegiatan 2-A": ["KRO 2-A1", "KRO 2-A2"],
  "Kegiatan 2-B": ["KRO 2-B1", "KRO 2-B2"],
  "Kegiatan 3-A": ["KRO 3-A1", "KRO 3-A2"],
  "Kegiatan 3-B": ["KRO 3-B1", "KRO 3-B2"]
};
const roOptions = {
  "KRO 1-A1": ["RO 1-A1-1", "RO 1-A1-2"],
  "KRO 1-A2": ["RO 1-A2-1", "RO 1-A2-2"],
  "KRO 1-B1": ["RO 1-B1-1", "RO 1-B1-2"],
  "KRO 1-B2": ["RO 1-B2-1", "RO 1-B2-2"],
  "KRO 2-A1": ["RO 2-A1-1", "RO 2-A1-2"],
  "KRO 2-A2": ["RO 2-A2-1", "RO 2-A2-2"],
  "KRO 2-B1": ["RO 2-B1-1", "RO 2-B1-2"],
  "KRO 2-B2": ["RO 2-B2-1", "RO 2-B2-2"],
  "KRO 3-A1": ["RO 3-A1-1", "RO 3-A1-2"],
  "KRO 3-A2": ["RO 3-A2-1", "RO 3-A2-2"],
  "KRO 3-B1": ["RO 3-B1-1", "RO 3-B1-2"],
  "KRO 3-B2": ["RO 3-B2-1", "RO 3-B2-2"]
};
const komponenOptions = {
  "RO 1-A1-1": ["Komponen 1-A1-1-1", "Komponen 1-A1-1-2"],
  "RO 1-A1-2": ["Komponen 1-A1-2-1", "Komponen 1-A1-2-2"]
};
const akunOptions = ["Bahan", "Honor", "Modal", "Paket Meeting", "Perjalanan Dinas"];

const DaftarHadir = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get data from hooks
  const { data: organikBPSList = [] } = useOrganikBPS();
  const { data: mitraStatistikList = [] } = useMitraStatistik();

  // Google Sheets submission hook
  const submitToSheets = useSubmitToSheets({
    documentType: "DaftarHadir",
    sheetUrl: "https://docs.google.com/spreadsheets/d/11a8c8cBJrgqS4ZKKvClvq_6DYsFI8R22Aka1NTxYkF0/edit?gid=0#gid=0",
    onSuccess: () => {
      navigate("/buat-dokumen");
    },
    skipSaveToSupabase: true
  });

  // Define react-hook-form
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    resetField
  } = useForm<FormValues>({
    defaultValues: {
      namaKegiatan: "",
      detil: "",
      jenis: "",
      program: "",
      kegiatan: "",
      kro: "",
      ro: "",
      komponen: "",
      akun: "",
      tanggalMulai: "",
      tanggalSelesai: "",
      organikBPS: [],
      mitraStatistik: [],
      pembuatDaftar: ""
    }
  });

  // Watch for program changes to reset dependent fields
  const selectedProgram = watch("program");
  const selectedKegiatan = watch("kegiatan");
  const selectedKro = watch("kro");
  const selectedRo = watch("ro");

  // Reset dependent fields when program changes
  useEffect(() => {
    if (selectedProgram) {
      resetField("kegiatan");
      resetField("kro");
      resetField("ro");
      resetField("komponen");
    }
  }, [selectedProgram, resetField]);

  // Reset dependent fields when kegiatan changes
  useEffect(() => {
    if (selectedKegiatan) {
      resetField("kro");
      resetField("ro");
      resetField("komponen");
    }
  }, [selectedKegiatan, resetField]);

  // Reset dependent fields when kro changes
  useEffect(() => {
    if (selectedKro) {
      resetField("ro");
      resetField("komponen");
    }
  }, [selectedKro, resetField]);

  // Reset dependent fields when ro changes
  useEffect(() => {
    if (selectedRo) {
      resetField("komponen");
    }
  }, [selectedRo, resetField]);

  // For name mapping
  const [pembuatDaftarName, setPembuatDaftarName] = useState<string>("");
  const [organikNameMap, setOrganikNameMap] = useState<Record<string, string>>({});
  const [mitraNameMap, setMitraNameMap] = useState<Record<string, string>>({});

  // Effect to update name mappings when selections change
  useEffect(() => {
    // Update pembuat daftar name
    const pembuatId = watch('pembuatDaftar');
    if (pembuatId) {
      const pembuat = organikBPSList.find(item => item.id === pembuatId);
      setPembuatDaftarName(pembuat?.name || "");
    }

    // Update organik name mapping
    const organikIds = watch('organikBPS') || [];
    const newOrganikNameMap: Record<string, string> = {};
    organikIds.forEach(id => {
      const organik = organikBPSList.find(item => item.id === id);
      if (organik) {
        newOrganikNameMap[id] = organik.name;
      }
    });
    setOrganikNameMap(newOrganikNameMap);

    // Update mitra name mapping
    const mitraIds = watch('mitraStatistik') || [];
    const newMitraNameMap: Record<string, string> = {};
    mitraIds.forEach(id => {
      const mitra = mitraStatistikList.find(item => item.id === id);
      if (mitra) {
        newMitraNameMap[id] = mitra.name;
      }
    });
    setMitraNameMap(newMitraNameMap);
  }, [watch('pembuatDaftar'), watch('organikBPS'), watch('mitraStatistik'), organikBPSList, mitraStatistikList]);

const onSubmit = async (data: FormValues) => {
  setIsSubmitting(true);
  try {
    // Format organik names with quotes and pipe separator
    const formattedOrganikNames = data.organikBPS && data.organikBPS.length > 0 
      ? data.organikBPS
        .map(id => `"${organikNameMap[id]}"`)
        .join(" | ")
      : ""; // Return empty string if no organik selected
    
    // Format mitra names with quotes and pipe separator
    const formattedMitraNames = data.mitraStatistik && data.mitraStatistik.length > 0
      ? data.mitraStatistik
        .map(id => `"${mitraNameMap[id]}"`)
        .join(" | ")
      : ""; // Return empty string if no mitra selected

    // Prepare data for submission
    const submissionData = {
      ...data,
      organikBPS: formattedOrganikNames,
      mitraStatistik: formattedMitraNames,
      pembuatDaftar: `"${pembuatDaftarName}"`, // Format pembuatDaftar name
      // Explicitly map all fields to ensure correct order
      id: `dh-${Date.now()}`,
      namaKegiatan: data.namaKegiatan,
      detil: data.detil,
      jenis: data.jenis,
      program: data.program,
      kegiatan: data.kegiatan,
      kro: data.kro,
      ro: data.ro,
      komponen: data.komponen,
      akun: data.akun,
      tanggalMulai: data.tanggalMulai ? format(new Date(data.tanggalMulai), "dd MMMM yyyy") : "",
      tanggalSelesai: data.tanggalSelesai ? format(new Date(data.tanggalSelesai), "dd MMMM yyyy") : "",
    };

    // Save to Google Sheets only
    await submitToSheets.mutateAsync(submissionData);
  } catch (error) {
    console.error("Error submitting form:", error);
    toast({
      variant: "destructive",
      title: "Gagal menyimpan dokumen",
      description: "Terjadi kesalahan saat menyimpan data"
    });
    setIsSubmitting(false);
  }
};

  // Get filtered options based on selections
  const filteredKegiatanOptions = selectedProgram 
    ? kegiatanOptions[selectedProgram as keyof typeof kegiatanOptions] || [] 
    : [];
  const filteredKroOptions = selectedKegiatan 
    ? kroOptions[selectedKegiatan as keyof typeof kroOptions] || [] 
    : [];
  const filteredRoOptions = selectedKro 
    ? roOptions[selectedKro as keyof typeof roOptions] || [] 
    : [];
  const filteredKomponenOptions = selectedRo 
    ? komponenOptions[selectedRo as keyof typeof komponenOptions] || ["Komponen 1", "Komponen 2"] 
    : ["Komponen 1", "Komponen 2"];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Daftar Hadir</h1>
          <p className="text-sm text-muted-foreground">
            Buat dokumen daftar hadir kegiatan
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan</Label>
                  <Input 
                    id="namaKegiatan" 
                    placeholder="Masukkan nama kegiatan" 
                    {...register("namaKegiatan", {
                      required: "Nama kegiatan harus diisi"
                    })} 
                  />
                  {errors.namaKegiatan && (
                    <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="detil">Detil Kegiatan</Label>
                  <Input 
                    id="detil" 
                    placeholder="Masukkan detil kegiatan" 
                    {...register("detil")} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis Kegiatan</Label>
                  <Controller
                    control={control}
                    name="jenis"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih jenis kegiatan"
                        options={jenisOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="program">Program</Label>
                  <Controller
                    control={control}
                    name="program"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih program"
                        options={programOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kegiatan">Kegiatan</Label>
                  <Controller
                    control={control}
                    name="kegiatan"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih kegiatan"
                        options={filteredKegiatanOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isDisabled={!selectedProgram}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kro">KRO</Label>
                  <Controller
                    control={control}
                    name="kro"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih KRO"
                        options={filteredKroOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isDisabled={!selectedKegiatan}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ro">RO</Label>
                  <Controller
                    control={control}
                    name="ro"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih RO"
                        options={filteredRoOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isDisabled={!selectedKro}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="komponen">Komponen</Label>
                  <Controller
                    control={control}
                    name="komponen"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih komponen"
                        options={filteredKomponenOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isDisabled={!selectedRo}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="akun">Akun</Label>
                  <Controller
                    control={control}
                    name="akun"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih akun"
                        options={akunOptions.map(option => ({
                          value: option,
                          label: option
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Controller
                    control={control}
                    name="tanggalMulai"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Controller
                    control={control}
                    name="tanggalSelesai"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pembuatDaftar">Pembuat Daftar</Label>
                  <Controller
                    control={control}
                    name="pembuatDaftar"
                    rules={{ required: "Pembuat daftar harus dipilih" }}
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih pembuat daftar"
                        options={organikBPSList.map(item => ({
                          value: item.id,
                          label: item.name
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.pembuatDaftar && (
                    <p className="text-sm text-destructive">{errors.pembuatDaftar.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organikBPS">Organik BPS</Label>
                  <Controller
                    control={control}
                    name="organikBPS"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih organik BPS"
                        options={organikBPSList.map(item => ({
                          value: item.id,
                          label: item.name
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isMulti
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mitraStatistik">Mitra Statistik</Label>
                  <Controller
                    control={control}
                    name="mitraStatistik"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih mitra statistik"
                        options={mitraStatistikList.map(item => ({
                          value: item.id,
                          label: `${item.name}${item.kecamatan ? ` - ${item.kecamatan}` : ''}`
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isMulti
                      />
                    )}
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 bg-teal-700 hover:bg-teal-600"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/buat-dokumen")}
                >
                  Batal
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