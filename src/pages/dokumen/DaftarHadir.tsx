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
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
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
  tanggalPelaksanaan: Date | null;
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
  tanggalPelaksanaan: null,
  organik: [],
  mitra: [],
  pembuatDaftar: ""
};

const jenisList = [
  { id: "Pertemuan", name: "Pertemuan" },
  { id: "Pelatihan", name: "Pelatihan" },
  { id: "Rapat", name: "Rapat" },
  { id: "Sosialisasi", name: "Sosialisasi" }
];

const DaftarHadir = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const { data: kegiatan = [] } = useKegiatan(watch("program") || null);
  const { data: kros = [] } = useKRO(watch("kegiatan") || null);
  const { data: ros = [] } = useRO(watch("kro") || null);
  const { data: komponenOptions = [] } = useKomponen();
  const { data: akuns = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  const submitMutation = useSubmitToSheets({
    documentType: "DaftarHadir",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  const handleSubmitForm = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const submitData = { ...data };
      console.log("Form submitted:", submitData);

      // Submit to Google Sheets
      await submitMutation.mutateAsync(submitData);
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Daftar hadir telah tersimpan"
      });
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Daftar Hadir</h1>
          <p className="text-sm text-muted-foreground">Formulir Daftar Hadir Kegiatan</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan</Label>
                  <Controller
                    name="namaKegiatan"
                    control={control}
                    rules={{ required: "Nama kegiatan harus diisi" }}
                    render={({ field }) => (
                      <Input
                        id="namaKegiatan"
                        placeholder="Masukkan nama kegiatan"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.namaKegiatan && <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="detil">Detil</Label>
                  <Controller
                    name="detil"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="detil"
                        placeholder="Masukkan detil kegiatan"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis</Label>
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
                          {jenisList.map((jenis) => (
                            <SelectItem key={jenis.id} value={jenis.id}>
                              {jenis.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.jenis && <p className="text-sm text-destructive">{errors.jenis.message}</p>}
                </div>

                {/* Kontrol Dinamis */}
                {/* Program, Kegiatan, KRO, RO, Komponen, Akun */}

                <div className="space-y-2">
                  <Label htmlFor="tanggalPelaksanaan">Tanggal Pelaksanaan</Label>
                  <Controller
                    name="tanggalPelaksanaan"
                    control={control}
                    rules={{ required: "Tanggal pelaksanaan harus diisi" }}
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
                            {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.tanggalPelaksanaan && (
                    <p className="text-sm text-destructive">{errors.tanggalPelaksanaan.message}</p>
                  )}
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
    </Layout>
  );
};

export default DaftarHadir;