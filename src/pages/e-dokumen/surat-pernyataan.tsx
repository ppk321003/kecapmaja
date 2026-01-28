import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { supabase } from "@/integrations/supabase/client";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

// Constants
const CONSTANTS = {
  SPREADSHEET: {
    TARGET_ID: "1rGIK4xt2CiKyfuJaZe0rhyz57j_8iFDlzwRBbXnW4xo",
    MASTER_ID: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM"
  },
  SHEET_NAMES: {
    SURAT_PERNYATAAN: "SuratPernyataan",
    ORGANIK: "MASTER.ORGANIK",
    MITRA: "MASTER.MITRA"
  }
} as const;

// Form Schema
const formSchema = z.object({
  jenisSuratPernyataan: z.string().min(1, "Jenis surat pernyataan harus dipilih"),
  organikBPS: z.array(z.string()),
  mitraStatistik: z.array(z.string()),
  namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
  tanggalSuratPernyataan: z.date({
    required_error: "Tanggal surat pernyataan harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih")
}).refine((data) => {
  return data.organikBPS.length > 0 || data.mitraStatistik.length > 0;
}, {
  message: "Minimal salah satu dari Organik BPS atau Mitra Statistik harus dipilih",
  path: ["organikBPS"]
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  jenisSuratPernyataan: "",
  organikBPS: [],
  mitraStatistik: [],
  namaKegiatan: "",
  tanggalSuratPernyataan: null,
  pembuatDaftar: ""
};

const JENIS_SURAT_PERNYATAAN = ["Tidak Menggunakan Kendaraan Dinas", "Fasilitas Kantor Tidak Memenuhi"];

const CONTOH_KEGIATAN = [
  "Konsultasi langkah-langkah akhir tahun anggaran 2024 di KPPN Pratama Kuningan", 
  "Pengawasan Kerangka Sampe Area (KSA) Padi", 
  "Briefing Petugas Survei Industri Mikro Kecil (VIMK) Tahunan Tahun 2025", 
  "Rapat Evaluasi Pendataan Susenas Maret 2025"
];

// Custom Hooks
const useSheetData = () => {
  const fetchSheetData = useCallback(async (spreadsheetId: string, range: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId,
          operation: "read",
          range
        }
      });

      if (error) throw error;
      return data?.values || [];
    } catch (error) {
      console.error(`Error fetching sheet data from ${range}:`, error);
      throw error;
    }
  }, []);

  return { fetchSheetData };
};

const useSuratPernyataanSequenceGenerator = () => {
  const { fetchSheetData } = useSheetData();

  const getNextSequenceNumber = useCallback(async (): Promise<number> => {
    const values = await fetchSheetData(
      CONSTANTS.SPREADSHEET.TARGET_ID,
      `${CONSTANTS.SHEET_NAMES.SURAT_PERNYATAAN}!A:A`
    );

    if (values.length <= 1) return 1;

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

    return sequenceNumbers.length === 0 ? 1 : Math.max(...sequenceNumbers) + 1;
  }, [fetchSheetData]);

  const generateSuratPernyataanId = useCallback(async (): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `super-${year}${month}`;

    const values = await fetchSheetData(
      CONSTANTS.SPREADSHEET.TARGET_ID,
      `${CONSTANTS.SHEET_NAMES.SURAT_PERNYATAAN}!B:B`
    );

    if (values.length <= 1) return `${prefix}001`;

    // Filter hanya ID yang sesuai format dan bulan/tahun yang sama
    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[0])
      .filter((id: string) => id && id.startsWith(prefix))
      .map((id: string) => {
        const match = id.match(/super-(\d{2})(\d{2})(\d{3})/);
        if (match) {
          const sequence = parseInt(match[3]);
          return isNaN(sequence) ? 0 : sequence;
        }
        return 0;
      })
      .filter(num => num > 0);

    const nextSequence = currentMonthIds.length === 0 ? 1 : Math.max(...currentMonthIds) + 1;
    return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
  }, [fetchSheetData]);

  return { getNextSequenceNumber, generateSuratPernyataanId };
};

const useDataSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: CONSTANTS.SPREADSHEET.TARGET_ID,
          operation: "append",
          range: `${CONSTANTS.SHEET_NAMES.SURAT_PERNYATAAN}!A:H`,
          values: [data]
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitData, isSubmitting };
};

// Helper functions
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  return format(date, "d MMMM yyyy", { locale: id });
};

// Main Component
const SuratPernyataan = () => {
  const navigate = useNavigate();
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  const { submitData, isSubmitting } = useDataSubmission();
  const { getNextSequenceNumber, generateSuratPernyataanId } = useSuratPernyataanSequenceGenerator();

  const handleAddOrganik = (organikId: string) => {
    if (organikId && !selectedOrganik.includes(organikId)) {
      const jenisSurat = form.getValues("jenisSuratPernyataan");
      const isFasilitasKantor = jenisSurat === "Fasilitas Kantor Tidak Memenuhi";

      // If "Fasilitas Kantor Tidak Memenuhi", only allow 1 organik
      if (isFasilitasKantor && selectedOrganik.length >= 1) {
        toast({
          variant: "destructive",
          title: "Peringatan",
          description: "Untuk jenis 'Fasilitas Kantor Tidak Memenuhi' hanya boleh memilih 1 orang Organik BPS"
        });
        return;
      }
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

  const handleAddMitra = (mitraId: string) => {
    if (mitraId && !selectedMitra.includes(mitraId)) {
      const newSelected = [...selectedMitra, mitraId];
      setSelectedMitra(newSelected);
      form.setValue("mitraStatistik", newSelected);
    }
  };

  const handleRemoveMitra = (mitraId: string) => {
    const newSelected = selectedMitra.filter(id => id !== mitraId);
    setSelectedMitra(newSelected);
    form.setValue("mitraStatistik", newSelected);
  };

  const getOrganikName = (organikId: string) => {
    const organik = organikList.find(o => o.id === organikId);
    return organik?.name || "";
  };

  const getMitraName = (mitraId: string) => {
    const mitra = mitraList.find(m => m.id === mitraId);
    return mitra?.name || "";
  };

  // Format data untuk spreadsheet
  const formatDataForSpreadsheet = useCallback(async (data: FormValues): Promise<any[]> => {
    const [sequenceNumber, suratPernyataanId] = await Promise.all([
      getNextSequenceNumber(),
      generateSuratPernyataanId()
    ]);

    const organikNames = selectedOrganik.map(id => getOrganikName(id)).filter(Boolean).join(" | ");
    const mitraNames = selectedMitra.map(id => getMitraName(id)).filter(Boolean).join(" | ");
    const pembuatDaftarName = getOrganikName(data.pembuatDaftar);

    // Siapkan data untuk spreadsheet sesuai urutan header
    return [
      sequenceNumber.toString(), // No
      suratPernyataanId, // Id (format: super-yymmxxx)
      data.jenisSuratPernyataan, // Jenis Surat Pernyataan
      organikNames, // Organik
      mitraNames, // Mitra Statistik
      data.namaKegiatan, // kegiatan
      formatTanggalIndonesia(data.tanggalSuratPernyataan), // tanggal
      pembuatDaftarName // Pembuat daftar
    ];
  }, [selectedOrganik, selectedMitra, getNextSequenceNumber, generateSuratPernyataanId]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Validasi tambahan untuk "Fasilitas Kantor Tidak Memenuhi"
      if (data.jenisSuratPernyataan === "Fasilitas Kantor Tidak Memenuhi" && selectedOrganik.length !== 1) {
        toast({
          variant: "destructive",
          title: "Validasi gagal",
          description: "Untuk jenis 'Fasilitas Kantor Tidak Memenuhi' harus memilih tepat 1 orang Organik BPS"
        });
        return;
      }

      // Format data untuk spreadsheet
      const rowData = await formatDataForSpreadsheet(data);
      
      console.log("Data yang akan dikirim ke spreadsheet:", rowData);
      
      // Submit ke Google Sheets
      await submitData(rowData);

      toast({ 
        title: "Berhasil!", 
        description: `Surat Pernyataan berhasil disimpan (ID: ${rowData[1]})` 
      });
      
      navigate("/e-dokumen/buat");

    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({ 
        variant: "destructive", 
        title: "Gagal menyimpan data", 
        description: error.message || "Terjadi kesalahan saat menyimpan data" 
      });
    }
  };

  const isLoading = isSubmitting;
  const watchedJenisSurat = form.watch("jenisSuratPernyataan");

  // Reset mitra ketika jenis surat berubah ke "Fasilitas Kantor Tidak Memenuhi"
  useEffect(() => {
    if (watchedJenisSurat === "Fasilitas Kantor Tidak Memenuhi" && selectedMitra.length > 0) {
      setSelectedMitra([]);
      form.setValue("mitraStatistik", []);
    }
  }, [watchedJenisSurat, selectedMitra.length, form]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-600">Surat Pernyataan</h1>
          <p className="text-muted-foreground mt-2">Buat dokumen surat pernyataan</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Surat Pernyataan</CardTitle>
          </CardHeader>
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
                          {JENIS_SURAT_PERNYATAAN.map(jenis => (
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

                {/* Organik BPS Section */}
                <div className="space-y-4">
                  <Label>
                    Organik BPS {watchedJenisSurat === "Fasilitas Kantor Tidak Memenuhi" ? "(Hanya bisa pilih 1 orang)" : "(Bisa pilih lebih dari 1)"}
                  </Label>
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
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedOrganik.length > 0 && (
                    <div className="space-y-2">
                      <Label>Organik BPS Terpilih:</Label>
                      {selectedOrganik.map(organikId => (
                        <div key={organikId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                          <span className="font-medium">{getOrganikName(organikId)}</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveOrganik(organikId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

                {/* Mitra Statistik Section - Only show for "Tidak Menggunakan Kendaraan Dinas" */}
                {watchedJenisSurat === "Tidak Menggunakan Kendaraan Dinas" && (
                  <div className="space-y-4">
                    <Label>Mitra Statistik (Bisa pilih lebih dari 1)</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={handleAddMitra}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih mitra statistik" />
                        </SelectTrigger>
                        <SelectContent>
                          {mitraList
                            .filter(mitra => !selectedMitra.includes(mitra.id))
                            .map(mitra => (
                              <SelectItem key={mitra.id} value={mitra.id}>
                                {mitra.name}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedMitra.length > 0 && (
                      <div className="space-y-2">
                        <Label>Mitra Statistik Terpilih:</Label>
                        {selectedMitra.map(mitraId => (
                          <div key={mitraId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                            <span className="font-medium">{getMitraName(mitraId)}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveMitra(mitraId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                        <p className="font-medium mb-1">Contoh penulisan nama kegiatan:</p>
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
                                "w-full justify-start text-left font-normal", 
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP", { locale: id }) : "Pilih tanggal"}
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
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate("/e-dokumen/buat")} disabled={isLoading}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Menyimpan..." : "Simpan Dokumen"}
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