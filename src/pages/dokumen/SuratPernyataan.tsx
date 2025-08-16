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
  jenisSuratPernyataan: z.string().min(1, "Jenis surat pernyataan harus dipilih"),
  organikBPS: z.array(z.string()).min(1, "Minimal pilih 1 organik BPS"),
  namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
  tanggalSuratPernyataan: z.date({
    required_error: "Tanggal surat pernyataan harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  jenisSuratPernyataan: "",
  organikBPS: [],
  namaKegiatan: "",
  tanggalSuratPernyataan: null,
  pembuatDaftar: "",
};

const JENIS_SURAT_PERNYATAAN = [
  "Tidak Menggunakan Kendaraan Dinas",
  "Fasilitas Kantor Tidak Memenuhi"
];

const CONTOH_KEGIATAN = [
  "Konsultasi langkah-langkah akhir tahun anggaran 2024 di KPPN Pratama Kuningan",
  "Briefing Petugas Survei Industri Mikro Kecil (VIMK) Tahunan Tahun 2025",
  "Rapat Evaluasi Susenas Maret 2025"
];

const SuratPernyataan = () => {
  const navigate = useNavigate();
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const { data: organikList = [] } = useOrganikBPS();

  const { mutate: submitToSheets, isPending } = useSubmitToSheets({
    documentType: "surat-pernyataan",
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Surat Pernyataan berhasil disimpan",
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

  const onSubmit = (data: FormValues) => {
    const formattedData = {
      ...data,
      organikBPS: selectedOrganik.map(id => getOrganikName(id)).join(" | "),
      tanggalSuratPernyataan: format(data.tanggalSuratPernyataan, "yyyy-MM-dd"),
      pembuatDaftar: getOrganikName(data.pembuatDaftar)
    };
    
    submitToSheets(formattedData);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600 tracking-tight">Surat Pernyataan</h1>
          <p className="text-muted-foreground">
            Buat dokumen surat pernyataan
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="jenisSuratPernyataan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Surat Pernyataan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis surat pernyataan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {JENIS_SURAT_PERNYATAAN.map((jenis) => (
                            <SelectItem key={jenis} value={jenis}>
                              {jenis}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          .map((organik) => (
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
                      {selectedOrganik.map((organikId) => (
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

                <FormField
                  control={form.control}
                  name="namaKegiatan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Kegiatan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Masukkan nama kegiatan..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Contoh penulisan:</p>
                        <ul className="space-y-1">
                          {CONTOH_KEGIATAN.map((contoh, index) => (
                            <li key={index} className="text-xs">• {contoh}</li>
                          ))}
                        </ul>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tanggalSuratPernyataan"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Surat Pernyataan</FormLabel>
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
                          {organikList.map((organik) => (
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isPending}>
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

export default SuratPernyataan;