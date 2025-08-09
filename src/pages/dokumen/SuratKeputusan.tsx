import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { KomponenSelect } from "@/components/KomponenSelect";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { FormSelect } from "@/components/FormSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";
import { cn } from "@/lib/utils";

const suratKeputusanSchema = z.object({
  nomorSuratKeputusan: z.string().min(1, "Nomor surat keputusan harus diisi"),
  tentang: z.string().min(1, "Tentang harus diisi"),
  menimbangKesatu: z.string().min(1, "Menimbang kesatu harus diisi"),
  menimbangKedua: z.string().optional(),
  menimbangKetiga: z.string().optional(),
  menimbangKeempat: z.string().optional(),
  memutuskanKesatu: z.string().min(1, "Memutuskan kesatu harus diisi"),
  memutuskanKedua: z.string().optional(),
  memutuskanKetiga: z.string().optional(),
  tanggalSuratKeputusan: z.date({
    required_error: "Tanggal surat keputusan harus diisi",
  }),
  organik: z.array(z.string()).min(1, "Minimal satu organik harus dipilih"),
  mitraStatistik: z.array(z.string()).min(1, "Minimal satu mitra statistik harus dipilih"),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih"),
});

type SuratKeputusanFormData = z.infer<typeof suratKeputusanSchema>;

const SuratKeputusan = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  const form = useForm<SuratKeputusanFormData>({
    resolver: zodResolver(suratKeputusanSchema),
    defaultValues: {
      nomorSuratKeputusan: "",
      tentang: "",
      menimbangKesatu: "",
      menimbangKedua: "",
      menimbangKetiga: "",
      menimbangKeempat: "",
      memutuskanKesatu: "",
      memutuskanKedua: "",
      memutuskanKetiga: "",
      organik: [],
      mitraStatistik: [],
      pembuatDaftar: "",
    },
  });

  const submitToSheets = useSubmitToSheets({
    documentType: "surat-keputusan",
    onSuccess: () => {
      form.reset();
      setIsSubmitting(false);
      toast({
        title: "Berhasil",
        description: "Surat keputusan berhasil disimpan",
      });
    },
  });

  const organikOptions = organikList.map(organik => ({
    value: organik.id,
    label: organik.name
  }));

  const mitraOptions = mitraList.map(mitra => ({
    value: mitra.id,
    label: mitra.name
  }));

  const onSubmit = async (data: SuratKeputusanFormData) => {
    setIsSubmitting(true);
    
    try {
      const selectedOrganiks = organikList.filter(o => data.organik.includes(o.id));
      const selectedMitras = mitraList.filter(m => data.mitraStatistik.includes(m.id));
      const selectedPembuat = organikList.find(o => o.id === data.pembuatDaftar);

      const formattedData = {
        ...data,
        tanggalSuratKeputusan: format(data.tanggalSuratKeputusan, "dd MMMM yyyy", { locale: id }),
        organikNames: selectedOrganiks.map(o => o.name).join(", "),
        mitraNames: selectedMitras.map(m => m.name).join(", "),
        pembuatName: selectedPembuat?.name || "",
      };

      await submitToSheets.mutateAsync(formattedData);
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-purple-600 tracking-tight">Surat Keputusan</h1>
            <p className="text-muted-foreground">
              Formulir pembuatan surat keputusan
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Data Surat Keputusan</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="nomorSuratKeputusan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Surat Keputusan</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nomor surat keputusan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tentang"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tentang</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan tentang" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Menimbang</h3>
                  
                  <FormField
                    control={form.control}
                    name="menimbangKesatu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menimbang Kesatu</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan menimbang kesatu" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="menimbangKedua"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menimbang Kedua (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan menimbang kedua" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="menimbangKetiga"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menimbang Ketiga (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan menimbang ketiga" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="menimbangKeempat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Menimbang Keempat (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan menimbang keempat" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Memutuskan</h3>
                  
                  <FormField
                    control={form.control}
                    name="memutuskanKesatu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memutuskan Kesatu</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan memutuskan kesatu" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="memutuskanKedua"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memutuskan Kedua (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan memutuskan kedua" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="memutuskanKetiga"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memutuskan Ketiga (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan memutuskan ketiga" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="tanggalSuratKeputusan"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Surat Keputusan</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd MMMM yyyy", { locale: id })
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
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="organik"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organik</FormLabel>
                        <FormControl>
                          <FormSelect
                            placeholder="Pilih organik"
                            options={organikOptions}
                            value={field.value}
                            onChange={field.onChange}
                            isMulti={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mitraStatistik"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mitra Statistik</FormLabel>
                        <FormControl>
                          <FormSelect
                            placeholder="Pilih mitra statistik"
                            options={mitraOptions}
                            value={field.value}
                            onChange={field.onChange}
                            isMulti={true}
                          />
                        </FormControl>
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
                        <FormControl>
                          <FormSelect
                            placeholder="Pilih pembuat daftar"
                            options={organikOptions}
                            value={field.value}
                            onChange={field.onChange}
                            isMulti={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Surat Keputusan"}
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

export default SuratKeputusan;