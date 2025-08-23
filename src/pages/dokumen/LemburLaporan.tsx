import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Trash2, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrganikBPS } from "@/hooks/use-database";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

const formSchema = z.object({
  nomorSuratTugasLembur: z.string().min(1, "Nomor surat tugas harus diisi").max(50, "Maksimal 50 karakter"),
  tanggalSuratTugasLembur: z.date({
    required_error: "Tanggal surat tugas harus dipilih"
  }),
  tujuanPelaksanaan: z.string().min(1, "Tujuan pelaksanaan harus diisi"),
  organikBPS: z.array(z.string()).min(1, "Minimal satu organik BPS harus dipilih"),
  tanggalPelaksanaan: z.date({
    required_error: "Tanggal pelaksanaan harus dipilih"
  }),
  uraianKegiatan: z.array(z.string().min(1, "Uraian kegiatan tidak boleh kosong")).min(1, "Minimal satu uraian kegiatan"),
  outputHasil: z.array(z.string().min(1, "Output hasil tidak boleh kosong")).min(1, "Minimal satu output hasil"),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih")
}).refine((data) => {
  return data.tanggalPelaksanaan >= data.tanggalSuratTugasLembur;
}, {
  message: "Tanggal pelaksanaan tidak boleh sebelum tanggal surat tugas lembur",
  path: ["tanggalPelaksanaan"]
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  nomorSuratTugasLembur: "",
  tanggalSuratTugasLembur: null,
  tujuanPelaksanaan: "",
  organikBPS: [],
  tanggalPelaksanaan: null,
  uraianKegiatan: [""],
  outputHasil: [""],
  pembuatDaftar: ""
};

const CONTOH_TUJUAN = [
  "Penyeselesaian administrasi keuangan dan permintaan dokumen Inspektorat",
  "Persiapan pelatihan petugas Wilkerstat 2025", 
  "Evaluasi dan Validasi data entri pendataan susenas maret 2025",
  "Penyelesaian pembuatan publisitas KCDA 2025"
];

const CONTOH_URAIAN = [
  "1. Entri data Dokumen Pemutakhiran Daftar Usaha Pertanian Perorangan (UTP) Survei Ubinan Tanaman Pangan serta Penarikan Sampel Ubinan Palawija Subround 2 2025.",
  "2. Penyelesaian Administrasi Gedung"
];

const CONTOH_OUTPUT = [
  "Daftar Sampel Rumahtangga Survei Ubinan Tanaman Pangan Subround 2 2025.",
  "Draft laporan selesai disusun"
];

const LemburLaporan = () => {
  const navigate = useNavigate();
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const { data: organikList = [] } = useOrganikBPS();

  const { mutate: submitToSheets, isPending } = useSubmitToSheets({
    documentType: "lembur-laporan",
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Lembur & Laporan berhasil disimpan"
      });
      navigate("/");
    }
  });

  const handleAddOrganik = (organikId: string) => {
    if (organikId && !selectedOrganik.includes(organikId)) {
      const newSelected = [...selectedOrganik, organikId];
      setSelectedOrganik(newSelected);
      form.setValue("organikBPS", newSelected);
    }
  };

  const handleRemoveOrganik = (organikId: string) => {
    const newSelected = selectedOrganik.filter(id => id !== organikId);
    setSelectedOrganik(newSelected);
    form.setValue("organikBPS", newSelected);
  };

  const getOrganikName = (organikId: string) => {
    const organik = organikList.find(o => o.id === organikId);
    return organik?.name || "";
  };

  const addUraianKegiatan = () => {
    const currentUraian = form.getValues("uraianKegiatan");
    form.setValue("uraianKegiatan", [...currentUraian, ""]);
  };

  const removeUraianKegiatan = (index: number) => {
    const currentUraian = form.getValues("uraianKegiatan");
    if (currentUraian.length > 1) {
      form.setValue("uraianKegiatan", currentUraian.filter((_, i) => i !== index));
    }
  };

  const addOutputHasil = () => {
    const currentOutput = form.getValues("outputHasil");
    form.setValue("outputHasil", [...currentOutput, ""]);
  };

  const removeOutputHasil = (index: number) => {
    const currentOutput = form.getValues("outputHasil");
    if (currentOutput.length > 1) {
      form.setValue("outputHasil", currentOutput.filter((_, i) => i !== index));
    }
  };

  const onSubmit = (data: FormValues) => {
    const formattedData = {
      ...data,
      organikBPS: selectedOrganik.map(id => getOrganikName(id)).join(" | "),
      tanggalSuratTugasLembur: format(data.tanggalSuratTugasLembur, "yyyy-MM-dd"),
      tanggalPelaksanaan: format(data.tanggalPelaksanaan, "yyyy-MM-dd"),
      uraianKegiatan: data.uraianKegiatan.join(" | "),
      outputHasil: data.outputHasil.join(" | "),
      pembuatDaftar: getOrganikName(data.pembuatDaftar)
    };
    submitToSheets(formattedData);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600 tracking-tight">Lembur & Laporan</h1>
          <p className="text-muted-foreground">
            Buat dokumen lembur dan laporan
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Bagian 1 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Bagian 1</h3>
                  
                  <FormField
                    control={form.control}
                    name="nomorSuratTugasLembur"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Surat Tugas Lembur</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Masukkan nomor surat tugas lembur (maksimal 50 karakter)" 
                            maxLength={50}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tanggalSuratTugasLembur"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Surat Tugas Lembur</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd MMMM yyyy")
                                ) : (
                                  <span>Pilih tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tujuanPelaksanaan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tujuan Pelaksanaan / Kegiatan</FormLabel>
                        <div className="mb-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Contoh penulisan:</p>
                          <ul className="space-y-1">
                            {CONTOH_TUJUAN.map((contoh, index) => (
                              <li key={index} className="text-xs">• {contoh}</li>
                            ))}
                          </ul>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="Masukkan tujuan pelaksanaan kegiatan..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <Label>Organik BPS (Bisa pilih lebih dari 1)</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={handleAddOrganik}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih organik BPS" />
                        </SelectTrigger>
                        <SelectContent>
                          {organikList
                            .filter(organik => !selectedOrganik.includes(organik.id))
                            .map(organik => (
                              <SelectItem key={organik.id} value={organik.id}>
                                {organik.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedOrganik.length > 0 && (
                      <div className="space-y-2">
                        <Label>Organik BPS Terpilih:</Label>
                        {selectedOrganik.map(organikId => (
                          <div key={organikId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <span>{getOrganikName(organikId)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOrganik(organikId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {form.formState.errors.organikBPS && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.organikBPS.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bagian 2 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Bagian 2</h3>
                  
                  <FormField
                    control={form.control}
                    name="tanggalPelaksanaan"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Pelaksanaan</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd MMMM yyyy")
                                ) : (
                                  <span>Pilih tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => {
                                const tanggalSuratTugas = form.getValues("tanggalSuratTugasLembur");
                                return tanggalSuratTugas && date < tanggalSuratTugas;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Uraian Kegiatan */}
                    <div className="space-y-4">
                      <div>
                        <Label>Uraian kegiatan yang dilakukan</Label>
                        <div className="mb-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Contoh penulisan:</p>
                          <ul className="space-y-1">
                            {CONTOH_URAIAN.map((contoh, index) => (
                              <li key={index} className="text-xs">{contoh}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      {form.watch("uraianKegiatan").map((_, index) => (
                        <div key={index} className="flex gap-2">
                          <FormField
                            control={form.control}
                            name={`uraianKegiatan.${index}`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Textarea 
                                    placeholder={`Uraian kegiatan #${index + 1}...`}
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch("uraianKegiatan").length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeUraianKegiatan(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addUraianKegiatan}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Uraian Kegiatan
                      </Button>
                    </div>

                    {/* Output Hasil */}
                    <div className="space-y-4">
                      <div>
                        <Label>Output / Hasil Kegiatan</Label>
                        <div className="mb-2 p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Contoh penulisan:</p>
                          <ul className="space-y-1">
                            {CONTOH_OUTPUT.map((contoh, index) => (
                              <li key={index} className="text-xs">• {contoh}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      {form.watch("outputHasil").map((_, index) => (
                        <div key={index} className="flex gap-2">
                          <FormField
                            control={form.control}
                            name={`outputHasil.${index}`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Textarea 
                                    placeholder={`Output hasil #${index + 1}...`}
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch("outputHasil").length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOutputHasil(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOutputHasil}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah Output Hasil
                      </Button>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="pembuatDaftar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pembuat Daftar</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih pembuat daftar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organikList.map(organik => (
                            <SelectItem key={organik.id} value={organik.id}>
                              {organik.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => navigate("/")}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isPending} className="bg-teal-700 hover:bg-teal-600">
                    {isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default LemburLaporan;