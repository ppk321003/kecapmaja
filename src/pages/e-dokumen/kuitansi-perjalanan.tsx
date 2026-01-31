import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS } from "@/hooks/use-database";
import { toast } from "@/hooks/use-toast";
import { KomponenSelect } from "@/components/KomponenSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { supabase } from "@/integrations/supabase/client";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { formatNumberWithSeparator, parseFormattedNumber } from "@/lib/formatNumber";

// Interface for kecamatan details
interface KecamatanDetail {
  id: string;
  nama: string;
  tanggalBerangkat: Date | undefined;
  tanggalKembali: Date | undefined;
}

// Schema validation
const formSchema = z.object({
  jenisPerjalanan: z.string().min(1, "Jenis perjalanan harus dipilih"),
  nomorSuratTugas: z.string().min(1, "Nomor surat tugas harus diisi"),
  tanggalSuratTugas: z.date({
    required_error: "Tanggal surat tugas harus dipilih"
  }),
  namaPelaksana: z.string().min(1, "Nama pelaksana harus dipilih"),
  tujuanPerjalanan: z.string().min(1, "Tujuan perjalanan harus diisi"),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalPengajuan: z.date({
    required_error: "Tanggal pengajuan harus dipilih"
  }),
  kabupatenKota: z.string().optional(),
  namaTempatTujuan: z.string().optional(),
  tanggalBerangkat: z.date().optional(),
  tanggalKembali: z.date().optional(),
  biayaTransport: z.string().optional(),
  biayaBBM: z.string().optional(),
  biayaPenginapan: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: Partial<FormValues> = {
  jenisPerjalanan: "Dalam Kota",
  nomorSuratTugas: "",
  tanggalSuratTugas: undefined,
  namaPelaksana: "",
  tujuanPerjalanan: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalPengajuan: undefined,
  kabupatenKota: "",
  namaTempatTujuan: "",
  tanggalBerangkat: undefined,
  tanggalKembali: undefined,
  biayaTransport: "",
  biayaBBM: "",
  biayaPenginapan: ""
};

// Kecamatan options
const kecamatanOptions = ["Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", "Cingambul", "Talaga", "Banjaran", "Argapura", "Maja", "Majalengka", "Cigasong", "Sukahaji", "Sindang", "Rajagaluh", "Sindangwangi", "Leuwimunding", "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", "Panyingkiran", "Kadipaten", "Kertajati", "Jatitujuh", "Ligung", "Sumberjaya"];

// Constants
const DEFAULT_TARGET_SPREADSHEET_ID = "1o1lRjKm8-9KtAyx7eHTNUUZxGMtVi_jJ97rcFfrJOjk"; // Fallback for satker 3210
const DEFAULT_ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const getTargetSheetId = (dynamicId: string | null) => dynamicId || DEFAULT_TARGET_SPREADSHEET_ID;

// Custom hook untuk submit data
const useSubmitKuitansiToSheets = (targetSheetId: string) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      console.log('📤 Submitting kuitansi data to sheets:', data);
      
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: targetSheetId,
          operation: "append",
          range: "KuitansiPerjalananDinas!A:AZ",
          values: [data]
        }
      });

      if (error) {
        console.error('❌ Error submitting kuitansi:', error);
        throw error;
      }

      console.log('✅ Kuitansi submission successful:', result);
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

// Format tanggal Indonesia
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Fungsi untuk mendapatkan nomor urut berikutnya
const getNextSequenceNumber = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: "KuitansiPerjalananDinas!A:A"
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

// Fungsi untuk generate ID kuitansi (kui-yymmxxx)
const generateKuitansiId = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<string> => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `kui-${year}${month}`;

    // Ambil semua data untuk mencari nomor terakhir di bulan ini
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: "KuitansiPerjalananDinas!B:B"
      }
    });

    if (error) {
      console.error("Error fetching kuitansi IDs:", error);
      throw new Error("Gagal mengambil ID kuitansi terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      return `${prefix}001`;
    }

    // Filter ID yang sesuai dengan prefix bulan ini
    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[0])
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
    console.error("Error generating kuitansi ID:", error);
    throw error;
  }
};

const KuitansiPerjalananDinas = () => {
  const navigate = useNavigate();
  const satkerContext = useSatkerConfigContext();
  const targetSheetId = getTargetSheetId(satkerContext?.getUserSatkerSheetId('kuiperjadin'));
  const [kecamatanDetails, setKecamatanDetails] = useState<KecamatanDetail[]>([]);
  const [isLuarKota, setIsLuarKota] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organikData, setOrganikData] = useState<Array<{nip: string; nama: string; jabatan: string}>>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(false);

  // Gunakan hook untuk submit data
  const { submitData, isSubmitting: isSubmitLoading } = useSubmitKuitansiToSheets(targetSheetId);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES
  });

  // Watch form values
  const watchedProgram = form.watch("program");
  const watchedKegiatan = form.watch("kegiatan");
  const watchedKRO = form.watch("kro");
  const watchedJenisPerjalanan = form.watch("jenisPerjalanan");

  // Watch for changes in jenisPerjalanan
  useEffect(() => {
    const luarKota = watchedJenisPerjalanan === "Luar Kota";
    setIsLuarKota(luarKota);
    
    // Reset kecamatan details jika beralih ke Luar Kota
    if (luarKota && kecamatanDetails.length > 0) {
      setKecamatanDetails([]);
    }
  }, [watchedJenisPerjalanan, kecamatanDetails.length]);

  // Data fetching hooks
  const { data: programList = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(watchedProgram || null);
  const { data: kroList = [] } = useKRO(watchedKegiatan || null);
  const { data: roList = [] } = useRO(watchedKRO || null);
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  
  // Get satker-specific organik sheet ID
  const organikSheetId = satkerContext?.getUserSatkerSheetId('masterorganik') || DEFAULT_ORGANIK_SHEET_ID;

  // Fetch data organik
  const fetchOrganikData = async () => {
    setLoadingOrganik(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: organikSheetId,
          operation: "read",
          range: "MASTER.ORGANIK"
        }
      });

      if (error) {
        console.error("Error fetching organik data:", error);
        throw new Error(error.message || 'Gagal mengambil data organik');
      }

      const rows = data?.values || [];
      
      if (!rows || rows.length <= 1) {
        setOrganikData([]);
        return;
      }
      
      const organikRows = rows.slice(1);
      
      const formattedData = organikRows
        .map((row: any[]) => ({
          nip: row[1] || '',
          nama: row[3] || '',
          jabatan: row[4] || ''
        }))
        .filter((item: any) => item.nama && item.nip);
      
      setOrganikData(formattedData);
      
    } catch (error: any) {
      console.error('Error fetching organik data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data organik: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingOrganik(false);
    }
  };

  // Load data organik saat komponen mount atau organikSheetId berubah
  useEffect(() => {
    fetchOrganikData();
  }, [organikSheetId]);

// GANTI bagian name mappings dengan yang ini:

// Create name mappings dengan format yang benar (hanya nama tanpa kode)
const programsMap = Object.fromEntries((programList || []).map(item => {
  const nameOnly = item.name.split(' - ')[1] || item.name; // Ambil bagian setelah " - "
  return [item.id, nameOnly];
}));

const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => {
  const nameOnly = item.name.split(' - ')[1] || item.name;
  return [item.id, nameOnly];
}));

const kroMap = Object.fromEntries((kroList || []).map(item => {
  const nameOnly = item.name.split(' - ')[1] || item.name;
  return [item.id, nameOnly];
}));

const roMap = Object.fromEntries((roList || []).map(item => {
  const nameOnly = item.name.split(' - ')[1] || item.name;
  return [item.id, nameOnly];
}));

const komponenMap = Object.fromEntries((komponenList || []).map(item => {
  const nameOnly = item.name.split(' - ')[1] || item.name;
  return [item.id, nameOnly];
}));

const akunMap = Object.fromEntries((akunList || []).map(item => {
  const nameOnly = item.name.split(' - ')[1] || item.name;
  return [item.id, nameOnly];
}));

  // Helper functions
  const formatDateForSheets = (date: Date | undefined): string => {
    if (!date) return "";
    return format(date, "yyyy-MM-dd");
  };

  const formatCurrency = (value: string | undefined): number => {
    if (!value) return 0;
    const numericValue = value.replace(/[^\d]/g, "");
    return parseInt(numericValue) || 0;
  };

  // Fungsi untuk generate array kecamatan sesuai urutan header
  const generateKecamatanArray = (details: KecamatanDetail[]) => {
    const arr = [];
    
    // Generate untuk 10 kecamatan sesuai header
    for (let i = 0; i < 10; i++) {
      const detail = details[i];
      arr.push(
        detail?.nama || "",
        formatDateForSheets(detail?.tanggalBerangkat) || "",
        formatDateForSheets(detail?.tanggalKembali) || ""
      );
    }
    
    return arr;
  };

  // Function to add a new kecamatan detail
  const addKecamatanDetail = () => {
    if (kecamatanDetails.length >= 10) {
      toast({
        variant: "destructive",
        title: "Batas maksimal",
        description: "Maksimal 10 kecamatan dapat ditambahkan"
      });
      return;
    }
    
    setKecamatanDetails(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      nama: "",
      tanggalBerangkat: undefined,
      tanggalKembali: undefined
    }]);
  };

  // Function to remove a kecamatan detail
  const removeKecamatanDetail = (id: string) => {
    setKecamatanDetails(prev => prev.filter(detail => detail.id !== id));
  };

  // Function to update a kecamatan detail
  const updateKecamatanDetail = (id: string, field: string, value: any) => {
    setKecamatanDetails(prev => prev.map(detail => 
      detail.id === id ? { ...detail, [field]: value } : detail
    ));
  };

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      // Validasi tambahan untuk Dalam Kota
      if (!isLuarKota && kecamatanDetails.length === 0) {
        toast({
          variant: "destructive",
          title: "Validasi gagal",
          description: "Minimal 1 kecamatan harus ditambahkan untuk perjalanan dalam kota"
        });
        setIsSubmitting(false);
        return;
      }

      // Validasi data kecamatan untuk Dalam Kota
      if (!isLuarKota) {
        for (let i = 0; i < kecamatanDetails.length; i++) {
          const detail = kecamatanDetails[i];
          if (!detail.nama || !detail.tanggalBerangkat || !detail.tanggalKembali) {
            toast({
              variant: "destructive",
              title: "Validasi gagal",
              description: `Data kecamatan ${i + 1} belum lengkap. Semua field harus diisi`
            });
            setIsSubmitting(false);
            return;
          }

          if (detail.tanggalBerangkat && detail.tanggalKembali && detail.tanggalBerangkat > detail.tanggalKembali) {
            toast({
              variant: "destructive",
              title: "Validasi tanggal gagal",
              description: `Tanggal kembali harus setelah tanggal berangkat untuk kecamatan ${i + 1}`
            });
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Validasi untuk Luar Kota
      if (isLuarKota) {
        if (!values.kabupatenKota || !values.namaTempatTujuan || !values.tanggalBerangkat || !values.tanggalKembali) {
          toast({
            variant: "destructive",
            title: "Validasi gagal",
            description: "Semua field khusus Luar Kota harus diisi"
          });
          setIsSubmitting(false);
          return;
        }

        if (values.tanggalBerangkat && values.tanggalKembali && values.tanggalBerangkat > values.tanggalKembali) {
          toast({
            variant: "destructive",
            title: "Validasi tanggal gagal",
            description: "Tanggal kembali harus setelah tanggal berangkat"
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Generate nomor urut baru dan ID kuitansi
      const sequenceNumber = await getNextSequenceNumber(targetSheetId);
      const kuitansiId = await generateKuitansiId(targetSheetId);
      
      // TRANSFORM DATA KE ARRAY SESUAI URUTAN HEADER SPREADSHEET
      const rowData = [
        sequenceNumber, // Kolom 1: No (urut)
        kuitansiId, // Kolom 2: id (kui-yymmxxx)
        values.nomorSuratTugas, // Kolom 3: Nomor Surat Tugas
        formatTanggalIndonesia(values.tanggalSuratTugas), // Kolom 4: Tanggal Surat Tugas
        values.namaPelaksana, // Kolom 5: Pelaksana Perjalanan Dinas
        values.tujuanPerjalanan, // Kolom 6: Tujuan Pelaksanaan Perjalanan Dinas
        values.kabupatenKota || "", // Kolom 7: Kab/Kota Tujuan
        values.namaTempatTujuan || "", // Kolom 8: Nama Tempat Tujuan
        formatTanggalIndonesia(values.tanggalBerangkat), // Kolom 9: Tanggal Berangkat
        formatTanggalIndonesia(values.tanggalKembali), // Kolom 10: Tanggal Kembali
        formatTanggalIndonesia(values.tanggalPengajuan), // Kolom 11: Tanggal Pengajuan
        programsMap[values.program] || values.program, // Kolom 12: Program (hanya nama)
        kegiatanMap[values.kegiatan] || values.kegiatan, // Kolom 13: Kegiatan (hanya nama)
        kroMap[values.kro] || values.kro, // Kolom 14: KRO (hanya nama)
        roMap[values.ro] || values.ro, // Kolom 15: RO (hanya nama)
        komponenMap[values.komponen] || values.komponen, // Kolom 16: Komponen (hanya nama)
        akunMap[values.akun] || values.akun, // Kolom 17: Akun (hanya nama)
        formatCurrency(values.biayaTransport), // Kolom 18: Biaya Transport Kab/Kota Tujuan (PP)
        formatCurrency(values.biayaBBM), // Kolom 19: Biaya Pembelian BBM/Tol (PP)
        formatCurrency(values.biayaPenginapan), // Kolom 20: Biaya Penginapan/Hotel
        values.jenisPerjalanan, // Kolom 21: Jenis Perjalanan Dinas
        // Kolom 22-51: 30 fields untuk kecamatan (10 kecamatan × 3 field)
        ...generateKecamatanArray(kecamatanDetails),
        "", // Kolom 52: Status
        "" // Kolom 53: Link
      ];

      console.log('📋 Final kuitansi data array:', rowData);
      console.log('🔢 Total columns:', rowData.length);
      console.log('🆔 Kuitansi ID:', kuitansiId);

      // SUBMIT DATA
      await submitData(rowData);

      toast({
        title: "Berhasil",
        description: `Data kuitansi perjalanan dinas berhasil disimpan (ID: ${kuitansiId})`
      });
      navigate("/e-dokumen/buat");

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
          <h1 className="text-2xl font-bold text-orange-600">Kuitansi Perjalanan Dinas</h1>
          <p className="text-sm text-muted-foreground">
            Formulir Kuitansi Perjalanan Dinas
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Jenis Perjalanan Dinas */}
                  <FormField 
                    control={form.control} 
                    name="jenisPerjalanan" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Perjalanan Dinas</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis perjalanan dinas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dalam Kota">Dalam Kota</SelectItem>
                            <SelectItem value="Luar Kota">Luar Kota</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Nomor Surat Tugas */}
                  <FormField 
                    control={form.control} 
                    name="nomorSuratTugas" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor Surat Tugas</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan nomor surat tugas" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Tanggal Surat Tugas */}
                  <FormField 
                    control={form.control} 
                    name="tanggalSuratTugas" 
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Surat Tugas</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button 
                                variant="outline" 
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                              mode="single" 
                              selected={field.value} 
                              onSelect={field.onChange} 
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Nama Pelaksana Perjalanan Dinas */}
                  <FormField 
                    control={form.control} 
                    name="namaPelaksana" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Pelaksana</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={loadingOrganik}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={loadingOrganik ? "Memuat data..." : "Pilih pelaksana"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organikData.map(organik => (
                              <SelectItem key={organik.nip} value={organik.nama}>
                                {organik.nama} - {organik.jabatan}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Tujuan Pelaksanaan Perjalanan Dinas */}
                  <FormField 
                    control={form.control} 
                    name="tujuanPerjalanan" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tujuan Pelaksanaan</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan tujuan pelaksanaan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Program */}
                  <FormField 
                    control={form.control} 
                    name="program" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("kegiatan", "");
                            form.setValue("kro", "");
                            form.setValue("ro", "");
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {programList.map(program => {
                              const displayName = program.name.split(' - ')[1] || program.name;
                              return (
                                <SelectItem key={program.id} value={program.id}>
                                  {displayName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Kegiatan */}
                  <FormField 
                    control={form.control} 
                    name="kegiatan" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kegiatan</FormLabel>
                        <KegiatanSelect 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("kro", "");
                            form.setValue("ro", "");
                          }} 
                          programId={watchedProgram} 
                        />
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* KRO */}
                  <FormField 
                    control={form.control} 
                    name="kro" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KRO</FormLabel>
                        <KROSelect 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("ro", "");
                          }} 
                          kegiatanId={watchedKegiatan} 
                        />
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* RO */}
                  <FormField 
                    control={form.control} 
                    name="ro" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RO</FormLabel>
                        <ROSelect 
                          value={field.value} 
                          onValueChange={field.onChange} 
                          kroId={watchedKRO} 
                        />
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Komponen */}
                  <FormField 
                    control={form.control} 
                    name="komponen" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Komponen</FormLabel>
                        <KomponenSelect 
                          value={field.value} 
                          onValueChange={field.onChange} 
                        />
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Akun */}
                  <FormField 
                    control={form.control} 
                    name="akun" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Akun</FormLabel>
                        <AkunSelect 
                          value={field.value} 
                          onValueChange={field.onChange} 
                        />
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Tanggal Pengajuan */}
                  <FormField 
                    control={form.control} 
                    name="tanggalPengajuan" 
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Pengajuan</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button 
                                variant="outline" 
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar 
                              mode="single" 
                              selected={field.value} 
                              onSelect={field.onChange} 
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Fields for Luar Kota */}
                  {isLuarKota && (
                    <>
                      {/* Kabupaten/Kota Tujuan */}
                      <FormField 
                        control={form.control} 
                        name="kabupatenKota" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kabupaten/Kota Tujuan *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan kabupaten/kota tujuan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      {/* Nama Tempat Tujuan */}
                      <FormField 
                        control={form.control} 
                        name="namaTempatTujuan" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Tempat Tujuan *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan nama tempat tujuan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      {/* Tanggal Berangkat */}
                      <FormField 
                        control={form.control} 
                        name="tanggalBerangkat" 
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Berangkat *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button 
                                    variant="outline" 
                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={field.onChange} 
                                  initialFocus 
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      {/* Tanggal Kembali */}
                      <FormField 
                        control={form.control} 
                        name="tanggalKembali" 
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Kembali *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button 
                                    variant="outline" 
                                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar 
                                  mode="single" 
                                  selected={field.value} 
                                  onSelect={field.onChange} 
                                  initialFocus 
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      {/* Biaya Transport */}
                      <FormField 
                        control={form.control} 
                        name="biayaTransport" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biaya Transport Kab/Kota Tujuan (PP)</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="0" 
                                value={formatNumberWithSeparator(field.value || "")}
                                onChange={(e) => {
                                  const value = parseFormattedNumber(e.target.value);
                                  field.onChange(value);
                                }}
                                className="text-right"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      {/* Biaya BBM/Tol */}
                      <FormField 
                        control={form.control} 
                        name="biayaBBM" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biaya Pembelian BBM/Tol (PP)</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="0" 
                                value={formatNumberWithSeparator(field.value || "")}
                                onChange={(e) => {
                                  const value = parseFormattedNumber(e.target.value);
                                  field.onChange(value);
                                }}
                                className="text-right"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />

                      {/* Biaya Penginapan/Hotel */}
                      <FormField 
                        control={form.control} 
                        name="biayaPenginapan" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biaya Penginapan/Hotel</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                placeholder="0" 
                                value={formatNumberWithSeparator(field.value || "")}
                                onChange={(e) => {
                                  const value = parseFormattedNumber(e.target.value);
                                  field.onChange(value);
                                }}
                                className="text-right"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </>
                  )}
                </div>

                {/* Kecamatan Details Section (for "Dalam Kota") */}
                {!isLuarKota && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Detail Kecamatan</h3>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addKecamatanDetail}
                        disabled={kecamatanDetails.length >= 10}
                      >
                        <Plus className="h-4 w-4 mr-2" /> 
                        Tambah Kecamatan
                      </Button>
                    </div>

                    {kecamatanDetails.length > 0 ? (
                      <div className="space-y-4">
                        {kecamatanDetails.map((detail, index) => (
                          <Card key={detail.id} className="overflow-hidden">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium text-base">
                                  Kecamatan (terjauh) {index + 1}
                                </h4>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeKecamatanDetail(detail.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Nama Kecamatan *</Label>
                                  <Select 
                                    value={detail.nama} 
                                    onValueChange={(value) => updateKecamatanDetail(detail.id, 'nama', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih kecamatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {kecamatanOptions.map(kec => (
                                        <SelectItem key={kec} value={kec}>
                                          {kec}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Tanggal Berangkat *</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        className={cn("w-full pl-3 text-left font-normal", !detail.tanggalBerangkat && "text-muted-foreground")}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {detail.tanggalBerangkat ? format(detail.tanggalBerangkat, "PPP") : <span>Pilih tanggal</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar 
                                        mode="single" 
                                        selected={detail.tanggalBerangkat} 
                                        onSelect={(date) => updateKecamatanDetail(detail.id, 'tanggalBerangkat', date)} 
                                        initialFocus 
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Tanggal Kembali *</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="outline" 
                                        className={cn("w-full pl-3 text-left font-normal", !detail.tanggalKembali && "text-muted-foreground")}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {detail.tanggalKembali ? format(detail.tanggalKembali, "PPP") : <span>Pilih tanggal</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar 
                                        mode="single" 
                                        selected={detail.tanggalKembali} 
                                        onSelect={(date) => updateKecamatanDetail(detail.id, 'tanggalKembali', date)} 
                                        initialFocus 
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center text-muted-foreground">
                        <p>Belum ada data kecamatan</p>
                        <p className="text-sm">Klik tombol di atas untuk menambahkan data kecamatan</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/e-dokumen/buat")}
                  disabled={isLoading}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Dokumen"
                  )}
                </Button>
              </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default KuitansiPerjalananDinas;