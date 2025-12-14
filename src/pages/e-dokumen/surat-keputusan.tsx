import React, { useState, useEffect } from "react";
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

// Schema Zod dengan validasi baru
const suratKeputusanSchema = z.object({
  nomorSuratKeputusan: z.string().min(1, "Nomor surat keputusan harus diisi"),
  tentang: z.string().min(1, "Tentang harus diisi"),
  menimbangKesatu: z.string().min(1, "Menimbang kesatu harus diisi"),
  menimbangKedua: z.string().optional(),
  menimbangKetiga: z.string().optional(),
  menimbangKeempat: z.string().optional(),
  memutuskanKesatu: z.string().min(1, "Memutuskan kesatu harus diisi"),
  memutuskanKedua: z.string()
    .min(1, "Memutuskan kedua harus diisi")
    .refine((val) => {
      // Validasi format: harus ada 3 pemisah "|" untuk 4 bagian
      const parts = val.split("|").map(part => part.trim());
      return parts.length === 4 && parts.every(part => part.length > 0);
    }, {
      message: "Format harus: Nama Kegiatan | Beban Anggaran | Harga | Satuan"
    }),
  tanggalMulai: z.date({
    required_error: "Tanggal mulai harus diisi"
  }),
  tanggalSelesai: z.date({
    required_error: "Tanggal selesai harus diisi"
  }),
  tanggalSuratKeputusan: z.date({
    required_error: "Tanggal surat keputusan harus diisi"
  }),
  organik: z.array(z.string()),
  mitraStatistik: z.array(z.string()),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih"),
  selectedKegiatanId: z.string().optional()
}).refine(data => {
  return data.organik.length > 0 || data.mitraStatistik.length > 0;
}, {
  message: "Minimal salah satu dari Organik atau Mitra Statistik harus dipilih",
  path: ["organik"]
}).refine(data => {
  return data.tanggalSelesai >= data.tanggalMulai;
}, {
  message: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
  path: ["tanggalSelesai"]
});

type SuratKeputusanFormData = z.infer<typeof suratKeputusanSchema>;

// Types untuk data master kegiatan
type MasterKegiatan = {
  index: number;
  role: string;
  namaKegiatan: string;
  bebanAnggaran: string;
  harga: string;
  satuan: string;
};

// Constants
const TARGET_SPREADSHEET_ID = "11gtkh70Qg1ggvDNl1uXtjlh051eJ3KLe4YkCODr6TPo";
const SHEET_NAME = "SuratKeputusan";
const MASTER_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

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
          range: `${SHEET_NAME}!A:P`,
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

    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[1])
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

// Custom hook untuk mengambil data master kegiatan
const useMasterKegiatan = () => {
  const [masterData, setMasterData] = useState<MasterKegiatan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: MASTER_SPREADSHEET_ID,
            operation: "read",
            range: "Sheet1!A:F"
          }
        });

        if (error) {
          throw new Error(`Gagal mengambil data master: ${error.message}`);
        }

        const values = data?.values || [];
        
        if (values.length <= 1) {
          setMasterData([]);
          return;
        }

        // Convert spreadsheet data to MasterKegiatan objects
        const kegiatanData: MasterKegiatan[] = values.slice(1).map((row: any[], index: number) => ({
          index: index + 1,
          role: row[1] || "",
          namaKegiatan: row[2] || "",
          bebanAnggaran: row[3] || "",
          harga: row[4] || "",
          satuan: row[5] || ""
        })).filter((item: MasterKegiatan) => item.namaKegiatan.trim() !== "");

        setMasterData(kegiatanData);
        console.log('📊 Master kegiatan loaded:', kegiatanData.length, 'items');
      } catch (err: any) {
        console.error('❌ Error loading master kegiatan:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  return { masterData, isLoading, error };
};

const SuratKeputusan = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();
  const { masterData, isLoading: isLoadingMaster } = useMasterKegiatan();
  
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
      tanggalMulai: undefined,
      tanggalSelesai: undefined,
      tanggalSuratKeputusan: undefined,
      organik: [],
      mitraStatistik: [],
      pembuatDaftar: "",
      selectedKegiatanId: ""
    }
  });

  // Watch untuk memutuskanKedua agar bisa validasi real-time
  const memutuskanKeduaValue = form.watch("memutuskanKedua");

  const organikOptions = organikList.map(organik => ({
    value: organik.id,
    label: organik.name
  }));

  const mitraOptions = mitraList.map(mitra => ({
    value: mitra.id,
    label: mitra.name
  }));

  // Buat opsi untuk dropdown master kegiatan
  const kegiatanOptions = masterData.map(item => ({
    value: item.index.toString(),
    label: item.namaKegiatan
  }));

  const formatTanggalIndonesia = (date: Date | null): string => {
    if (!date) return "";
    
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  // Handler untuk ketika user memilih dari dropdown kegiatan
  const handleKegiatanSelect = (selectedValue: string) => {
    const selectedIndex = parseInt(selectedValue);
    const selectedKegiatan = masterData.find(item => item.index === selectedIndex);
    
    if (selectedKegiatan) {
      // Format: Nama Kegiatan | Beban Anggaran | Harga | Satuan
      const formattedValue = `${selectedKegiatan.namaKegiatan} | ${selectedKegiatan.bebanAnggaran} | ${selectedKegiatan.harga} | ${selectedKegiatan.satuan}`;
      
      // Update kedua field sekaligus
      form.setValue("memutuskanKedua", formattedValue);
      form.setValue("selectedKegiatanId", selectedIndex.toString());
      
      // Trigger validation
      form.trigger("memutuskanKedua");
    }
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
      // Note: Kolom memutuskanKetiga diubah menjadi tanggal range
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
        data.memutuskanKedua, // Kolom 10: kedua (format: Nama | Beban | Harga | Satuan)
        // Kolom 11: ketiga (sekarang jadi tanggal range)
        `${formatTanggalIndonesia(data.tanggalMulai)} | ${formatTanggalIndonesia(data.tanggalSelesai)}`,
        formatTanggalIndonesia(data.tanggalSuratKeputusan), // Kolom 12: tanggal
        selectedOrganiks.map(o => o.name).join(" | "), // Kolom 13: Organik
        selectedMitras.map(m => m.name).join(" | "), // Kolom 14: Mitra Statistik
        selectedPembuat?.name || "", // Kolom 15: Pembuat daftar
        data.selectedKegiatanId || "" // Kolom 16: ID kegiatan terpilih (untuk tracking)
      ];

      console.log('📋 Final SK data array:', rowData);
      console.log('🔢 Total columns:', rowData.length);
      console.log('🆔 SK ID:', skId);
      console.log('📅 Date range:', rowData[10]);

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
                        <strong>Format wajib:</strong> Nama Kegiatan | Beban Anggaran | Harga | Satuan<br />
                        Contoh: honor petugas pendataan lapangan sksppi di kab/kota | 2898.BMA.007.005.A.521213 | 75000 | Dok
                      </div>
                      <div>
                        <span className="font-semibold">- KETIGA :</span>
                        <br />
                        <strong>Sekarang menjadi:</strong> Tanggal Mulai | Tanggal Selesai<br />
                        Contoh: 15 Desember 2025 | 31 Desember 2025
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

                  {/* Bagian Memutuskan Kedua dengan dropdown */}
                  <div className="space-y-4">
                    <FormField control={form.control} name="memutuskanKedua" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>KEDUA - (Wajib)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Format: Nama Kegiatan | Beban Anggaran | Harga | Satuan" 
                              className="min-h-[100px] font-mono text-sm" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                    {/* Dropdown untuk memilih dari master kegiatan */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pilih dari Master Kegiatan:</label>
                      <FormSelect
                        placeholder={isLoadingMaster ? "Memuat data..." : "Cari dan pilih kegiatan..."}
                        options={kegiatanOptions}
                        value={form.watch("selectedKegiatanId")}
                        onChange={(value) => handleKegiatanSelect(value as string)}
                        isMulti={false}
                        isSearchable={true}
                        isDisabled={isLoadingMaster}
                        isLoading={isLoadingMaster}
                        noOptionsMessage={() => "Data tidak ditemukan"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pilih dari dropdown atau ketik manual dengan format: Nama | Beban Anggaran | Harga | Satuan
                      </p>
                    </div>
                    
                    {/* Validasi format real-time */}
                    {memutuskanKeduaValue && memutuskanKeduaValue.includes("|") && (
                      <div className="text-xs">
                        <p className="font-medium">Format terdeteksi:</p>
                        <div className="grid grid-cols-4 gap-2 mt-1">
                          {memutuskanKeduaValue.split("|").map((part, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded border">
                              <span className="font-medium">
                                {index === 0 ? "Nama" : 
                                 index === 1 ? "Beban" : 
                                 index === 2 ? "Harga" : "Satuan"}:
                              </span>
                              <p className="truncate">{part.trim()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bagian Memutuskan Ketiga (sekarang jadi tanggal range) */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-700">KETIGA - (Wajib)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="tanggalMulai" render={({
                      field
                    }) => <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Mulai</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd MMMM yyyy", {
                                locale: id
                              }) : <span>Pilih tanggal mulai</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={field.onChange} 
                                  disabled={date => date < new Date("1900-01-01")} 
                                  initialFocus 
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>} />

                      <FormField control={form.control} name="tanggalSelesai" render={({
                      field
                    }) => <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Selesai</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd MMMM yyyy", {
                                locale: id
                              }) : <span>Pilih tanggal selesai</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={field.onChange} 
                                  disabled={date => {
                                    const tanggalMulai = form.getValues("tanggalMulai");
                                    return tanggalMulai ? date < tanggalMulai : date < new Date("1900-01-01");
                                  }} 
                                  initialFocus 
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Output: {formatTanggalIndonesia(form.watch("tanggalMulai"))} | {formatTanggalIndonesia(form.watch("tanggalSelesai"))}
                    </div>
                  </div>
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
                            <Calendar 
                              mode="single" 
                              selected={field.value} 
                              onSelect={field.onChange} 
                              disabled={date => date < new Date("1900-01-01")} 
                              initialFocus 
                            />
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
                          <FormSelect 
                            placeholder="Cari dan pilih organik" 
                            options={organikOptions} 
                            value={field.value} 
                            onChange={field.onChange} 
                            isMulti={true} 
                            isSearchable={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="mitraStatistik" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Mitra Statistik</FormLabel>
                        <FormControl>
                          <FormSelect 
                            placeholder="Cari dan pilih mitra statistik" 
                            options={mitraOptions} 
                            value={field.value} 
                            onChange={field.onChange} 
                            isMulti={true} 
                            isSearchable={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="pembuatDaftar" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Pembuat Daftar</FormLabel>
                        <FormControl>
                          <FormSelect 
                            placeholder="Cari dan pilih pembuat daftar" 
                            options={organikOptions} 
                            value={field.value} 
                            onChange={field.onChange} 
                            isMulti={false} 
                            isSearchable={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => window.location.href = "https://kecapmaja.vercel.app/e-dokumen/buat"}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={isLoading || isLoadingMaster}>
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