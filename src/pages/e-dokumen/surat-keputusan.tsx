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
import { Layout } from "@/components/Layout";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { FormSelect } from "@/components/FormSelect";
import { supabase } from "@/integrations/supabase/client";
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
    required_error: "Tanggal surat keputusan harus diisi"
  }),
  organik: z.array(z.string()),
  mitraStatistik: z.array(z.string()),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih")
}).refine(data => {
  return data.organik.length > 0 || data.mitraStatistik.length > 0;
}, {
  message: "Minimal salah satu dari Organik atau Mitra Statistik harus dipilih",
  path: ["organik"]
});

type SuratKeputusanFormData = z.infer<typeof suratKeputusanSchema>;

// Constants
const TARGET_SPREADSHEET_ID = "11gtkh70Qg1ggvDNl1uXtjlh051eJ3KLe4YkCODr6TPo";
const SHEET_NAME = "SuratKeputusan";

// Custom hook untuk submit data
const useSubmitSKToSheets = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      console.log('📤 Submitting SK data to sheets:', data);
      
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TARGET_SPREADSHEET_ID,
          operation: "append",
          range: `${SHEET_NAME}!A:O`,
          values: [data]
        }
      });

      if (error) {
        console.error('❌ Error submitting SK:', error);
        throw error;
      }

      console.log('✅ SK submission successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitData, isSubmitting };
};

// Fungsi untuk mendapatkan nomor urut berikutnya
const getNextSequenceNumber = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: TARGET_SPREADSHEET_ID,
        operation: "read",
        range: `${SHEET_NAME}!A:A`
      }
    });

    if (error) {
      console.error("Error fetching sequence numbers:", error);
      throw new Error("Gagal mengambil nomor urut terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      return 1;
    }

    const sequenceNumbers = values
      .slice(1)
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

// Fungsi untuk generate ID surat keputusan (sk-yymmxxx)
const generateSKId = async (): Promise<string> => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `sk-${year}${month}`;

    // Ambil semua data untuk mencari nomor terakhir di bulan ini
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: TARGET_SPREADSHEET_ID,
        operation: "read",
        range: `${SHEET_NAME}!B:B`
      }
    });

    if (error) {
      console.error("Error fetching SK IDs:", error);
      throw new Error("Gagal mengambil ID SK terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      return `${prefix}001`;
    }

    // Filter ID yang sesuai dengan prefix bulan ini
    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[1]) // Kolom B adalah ID
      .filter((id: string) => id && id.startsWith(prefix))
      .map((id: string) => {
        const numStr = id.replace(prefix, '');
        const num = parseInt(numStr);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    if (currentMonthIds.length === 0) {
      return `${prefix}001`;
    }

    const nextNum = Math.max(...currentMonthIds) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("Error generating SK ID:", error);
    throw error;
  }
};

const SuratKeputusan = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();
  
  const { submitData, isSubmitting: isSubmitLoading } = useSubmitSKToSheets();

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
      pembuatDaftar: ""
    }
  });

  const organikOptions = organikList.map(organik => ({
    value: organik.id,
    label: organik.name
  }));

  const mitraOptions = mitraList.map(mitra => ({
    value: mitra.id,
    label: mitra.name
  }));

  const formatTanggalIndonesia = (date: Date | null): string => {
    if (!date) return "";
    
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const onSubmit = async (data: SuratKeputusanFormData) => {
    setIsSubmitting(true);
    try {
      // Generate nomor urut baru dan ID SK
      const sequenceNumber = await getNextSequenceNumber();
      const skId = await generateSKId();

      const selectedOrganiks = organikList.filter(o => data.organik.includes(o.id));
      const selectedMitras = mitraList.filter(m => data.mitraStatistik.includes(m.id));
      const selectedPembuat = organikList.find(o => o.id === data.pembuatDaftar);

      // Format data sesuai dengan header spreadsheet
      const rowData = [
        sequenceNumber, // Kolom 1: No
        skId, // Kolom 2: Id (sk-yymmxxx)
        data.nomorSuratKeputusan, // Kolom 3: no_sk
        data.tentang, // Kolom 4: tentang
        data.menimbangKesatu, // Kolom 5: menimbang1
        data.menimbangKedua || "", // Kolom 6: menimbang2
        data.menimbangKetiga || "", // Kolom 7: menimbang3
        data.menimbangKeempat || "", // Kolom 8: menimbang4
        data.memutuskanKesatu, // Kolom 9: kesatu
        data.memutuskanKedua || "", // Kolom 10: kedua
        data.memutuskanKetiga || "", // Kolom 11: ketiga
        formatTanggalIndonesia(data.tanggalSuratKeputusan), // Kolom 12: tanggal
        selectedOrganiks.map(o => o.name).join(" | "), // Kolom 13: Organik
        selectedMitras.map(m => m.name).join(" | "), // Kolom 14: Mitra Statistik
        selectedPembuat?.name || "" // Kolom 15: Pembuat daftar
      ];

      console.log('📋 Final SK data array:', rowData);
      console.log('🔢 Total columns:', rowData.length);
      console.log('🆔 SK ID:', skId);

      // Submit data ke spreadsheet
      await submitData(rowData);

      form.reset();
      toast({
        title: "Berhasil",
        description: `Surat keputusan berhasil disimpan (ID: ${skId})`
      });
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan surat keputusan",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isSubmitLoading;

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
            <CardTitle className="text-orange-600">Data Surat Keputusan</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="nomorSuratKeputusan" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Nomor Surat Keputusan</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nomor surat keputusan" className="max-w-[150px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <div className="md:col-span-2">
                    <FormField control={form.control} name="tentang" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Tentang</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Masukkan tentang (dapat berisi teks panjang)" className="min-h-[80px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-600">Menimbang</h3>
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                    <p className="font-medium mb-2">Contoh penulisan:</p>
                    <div className="space-y-2">
                      <div>
                        <span className="font-semibold">- KESATU :</span>
                        <br />
                        bahwa untuk persiapan pelaksanaan Kegiatan Sensus Pertanian Tahun 2023, maka perlu dilaksanakan Rapat Koordinasi Daerah tentang Sensus Pertanian Tahun 2023 Badan Pusat Statistik Kabupaten Majalengka dengan Keputusan Kepala Badan Pusat Statistik Kabupaten Majalengka
                      </div>
                      <div>
                        <span className="font-semibold">- KEDUA :</span>
                        <br />
                        (Opsional) bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a, maka perlu menetapkan Keputusan Kepala Badan Pusat Statistik Kabupaten Majalengka tentang Pelaksanaan Rapat Koordinasi Daerah tentang persiapan pelaksanaan Sensus Pertanian Tahun 2023 Badan Pusat Statistik Kabupaten Majalengka
                      </div>
                      <div>
                        <span className="font-semibold">- KETIGA :</span>
                        <br />
                        (Opsional)
                      </div>
                      <div>
                        <span className="font-semibold">- KEEMPAT :</span>
                        <br />
                        (Opsional)
                      </div>
                    </div>
                  </div>
                  
                  <FormField control={form.control} name="menimbangKesatu" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KESATU - (Wajib)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan menimbang kesatu" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="menimbangKedua" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KEDUA (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan menimbang kedua" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="menimbangKetiga" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KETIGA - (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan menimbang ketiga" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="menimbangKeempat" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KEEMPAT - (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan menimbang keempat" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-700">Memutuskan</h3>
                  <div className="bg-green-50 p-4 rounded-lg text-sm text-gray-700">
                    <p className="font-medium mb-2">Contoh penulisan:</p>
                    <div className="space-y-2">
                      <div>
                        <span className="font-semibold">- KESATU :</span>
                        <br />
                        Menetapkan Panitia dan Peserta Rapat Koordinasi Daerah (Rakorda) Sensus Pertanian Tahun (ST2023) tentang Sensus Pertanian Tahun 2023 (ST2023) Badan Pusat Statistik Kabupaten Majalengka.
                      </div>
                      <div>
                        <span className="font-semibold">- KEDUA :</span>
                        <br />
                        Menetapkan Narasumber Rapat Koordinasi Daerah tentang Sensus Pertanian Tahun 2023 (ST2023) Badan Pusat Statistik Kabupaten Majalengka dengan honorarium per orang per jam berdasarkan rate bruto sesuai jabatan
                      </div>
                      <div>
                        <span className="font-semibold">- KETIGA :</span>
                        <br />
                        Pelaksanaan Rapat Koordinasi Daerah tentang Sensus Pertanian Tahun 2023 (ST2023) Badan Pusat Statistik Kabupaten Majalengka diselenggarakan pada tanggal 11 s.d. 13 Desember 2022 di Fitra Hotel Majalengka
                      </div>
                    </div>
                  </div>
                  
                  <FormField control={form.control} name="memutuskanKesatu" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KESATU - (Wajib)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan memutuskan kesatu" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="memutuskanKedua" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KEDUA - (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan memutuskan kedua" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="memutuskanKetiga" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KETIGA - (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan memutuskan ketiga" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="tanggalSuratKeputusan" render={({
                  field
                }) => <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Surat Keputusan</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "dd MMMM yyyy", {
                            locale: id
                          }) : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => date < new Date("1900-01-01")} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="organik" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Organik</FormLabel>
                        <FormControl>
                          <FormSelect placeholder="Pilih organik" options={organikOptions} value={field.value} onChange={field.onChange} isMulti={true} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="mitraStatistik" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Mitra Statistik</FormLabel>
                        <FormControl>
                          <FormSelect placeholder="Pilih mitra statistik" options={mitraOptions} value={field.value} onChange={field.onChange} isMulti={true} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="pembuatDaftar" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Pembuat Daftar</FormLabel>
                        <FormControl>
                          <FormSelect placeholder="Pilih pembuat daftar" options={organikOptions} value={field.value} onChange={field.onChange} isMulti={false} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Menyimpan..." : "Simpan Surat Keputusan"}
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