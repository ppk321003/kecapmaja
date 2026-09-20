import { generateNextDocumentId, getNextSequenceNumberFromSheet, monthlyPrefix } from "@/utils/document-id";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Trash2, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrganikBPS } from "@/hooks/use-database";
import { PersonMultiSelect, PersonSingleSelect, Person } from "@/components/PersonMultiSelect";
import { supabase } from "@/integrations/supabase/client";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

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
  "1. Entri data Dokumen Pemutakhiran Daftar Usaha Pertanian Perorangan (UTP) Survei Ubinan Tanaman Pangan serta Penarikan Sampel Ubinan Palawija Subround 2 2025",
  "2. Penyelesaian Administrasi Gedung"
];

const CONTOH_OUTPUT = [
  "1. Penyelesaian entri data Pemutakhiran Daftar Usaha Pertanian Perorangan (UTP) Survei Ubinan Tanaman Pangan menghasilkan Daftar Sampel Rumahtangga terpilih",
  "2. Draft laporan selesai disusun"
];

// Constants
const DEFAULT_TARGET_SPREADSHEET_ID = "1gOIlK84nhv9Hwy_3HGyR7JwD-CXEZ-iXaM5imTgtT3o"; // Fallback for satker 3210
const SHEET_NAME = "Lembur";

const getTargetSheetId = (dynamicId: string | null) => dynamicId || DEFAULT_TARGET_SPREADSHEET_ID;

// Custom hook untuk submit data
const useSubmitLemburToSheets = (targetSheetId: string) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      console.log('📤 Submitting lembur data to sheets:', data);
      
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: targetSheetId,
          operation: "append",
          range: `${SHEET_NAME}!A:J`,
          values: [data]
        }
      });

      if (error) {
        console.error('❌ Error submitting lembur:', error);
        throw error;
      }

      console.log('✅ Lembur submission successful:', result);
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

// Nomor urut berikutnya (kolom A)
const getNextSequenceNumber = async (targetId: string): Promise<number> => {
  return getNextSequenceNumberFromSheet({ spreadsheetId: targetId, sheetName: SHEET_NAME, column: 'A' });
};

// Generate ID lembur (lmbr-yymmNNN) dari kolom B
const generateLemburId = async (targetId: string): Promise<string> => {
  return generateNextDocumentId({
    spreadsheetId: targetId,
    sheetName: SHEET_NAME,
    prefix: monthlyPrefix('lmbr'),
    column: 'B',
  });
};

const LemburLaporan = () => {
  const navigate = useNavigate();
  const satkerContext = useSatkerConfigContext();
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const { data: organikList = [] } = useOrganikBPS();
  const targetSheetId = getTargetSheetId(satkerContext?.getUserSatkerSheetId('lembur'));
  const { submitData, isSubmitting: isSubmitLoading } = useSubmitLemburToSheets(targetSheetId);

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

  const formatTanggalIndonesia = (date: Date | null): string => {
    if (!date) return "";
    
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Generate nomor urut baru dan ID lembur
      const sequenceNumber = await getNextSequenceNumber(targetSheetId);
      const lemburId = await generateLemburId(targetSheetId);

      // Format data sesuai dengan header spreadsheet
      const satkerConfig = satkerContext?.getUserSatkerConfig();
      
      const rowData = [
        sequenceNumber, // Kolom 1: No
        lemburId, // Kolom 2: Id (lmbr-yymmxxx)
        data.nomorSuratTugasLembur, // Kolom 4: Nomor Surat Tugas Lembur
        formatTanggalIndonesia(data.tanggalSuratTugasLembur), // Kolom 5: Tanggal Surat Tugas Lembur
        data.tujuanPelaksanaan, // Kolom 6: Kegiatan
        selectedOrganik.map(id => getOrganikName(id)).join(" | "), // Kolom 7: Organik
        formatTanggalIndonesia(data.tanggalPelaksanaan), // Kolom 8: Tanggal Pelaksanaan
        data.uraianKegiatan.join(" | "), // Kolom 9: Uraian Kegiatan
        data.outputHasil.join(" | "), // Kolom 10: Output Hasil
        getOrganikName(data.pembuatDaftar), // Kolom 11: Pembuat daftar
        "", // Kolom 12: Status
        "" // Kolom 13: Link
      ];

      console.log('📋 Final lembur data array:', rowData);
      console.log('🔢 Total columns:', rowData.length);
      console.log('🆔 Lembur ID:', lemburId);

      // Submit data ke spreadsheet
      await submitData(rowData);

      toast({
        title: "Berhasil",
        description: `Lembur & Laporan berhasil disimpan (ID: ${lemburId})`
      });
      navigate("/");

    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan form"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isSubmitLoading;

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
                  <h3 className="text-lg font-semibold">Bagian 1 (Penugasan)</h3>
                  
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
                    <PersonMultiSelect
                      placeholder="Pilih organik BPS"
                      options={organikList.map(item => ({
                        id: item.id,
                        name: item.name,
                        jabatan: (item as any).jabatan
                      } as Person))}
                      value={selectedOrganik}
                      onValueChange={(values) => {
                        setSelectedOrganik(values);
                        form.setValue("organikBPS", values);
                      }}
                      type="organik"
                    />
                    {form.formState.errors.organikBPS && (
                      <p className="text-sm font-medium text-destructive">
                        {form.formState.errors.organikBPS.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bagian 2 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Bagian 2 (Laporan)</h3>
                  
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
                        variant="default"
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
                              <li key={index} className="text-xs">{contoh}</li>
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
                        variant="default"
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
                      <FormControl>
                        <PersonSingleSelect
                          placeholder="Pilih pembuat daftar"
                          options={organikList.map(item => ({
                            id: item.id,
                            name: item.name,
                            jabatan: (item as any).jabatan
                          } as Person))}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/e-dokumen/buat")}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Menyimpan..." : "Simpan"}
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