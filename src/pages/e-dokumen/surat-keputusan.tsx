import React, { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, FileText, Search, X, User, Users, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
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

// Custom Select Component dengan search
interface FormSelectProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  isMulti?: boolean;
  isSearchable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  noOptionsMessage?: () => string;
  className?: string;
  label?: string;
}

const FormSelect: React.FC<FormSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  isMulti = false,
  isSearchable = false,
  isDisabled = false,
  isLoading = false,
  noOptionsMessage = () => "Tidak ada hasil ditemukan",
  className,
  label
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options berdasarkan search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  // Fungsi untuk mendapatkan label yang dipilih
  const getSelectedLabel = () => {
    if (isMulti) {
      if (Array.isArray(value) && value.length > 0) {
        const selected = options.filter(opt => value.includes(opt.value));
        return selected.map(s => s.label).join(", ");
      }
      return "";
    } else {
      const selected = options.find(opt => opt.value === value);
      return selected?.label || "";
    }
  };

  const handleValueChange = (selectedValue: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(selectedValue)) {
        // Hapus jika sudah ada
        onChange(currentValues.filter(v => v !== selectedValue));
      } else {
        // Tambah jika belum ada
        onChange([...currentValues, selectedValue]);
      }
    } else {
      onChange(selectedValue);
      setIsOpen(false); // Tutup dropdown untuk single select
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <Select
        open={isOpen}
        onOpenChange={setIsOpen}
        value={isMulti ? undefined : value}
        onValueChange={isMulti ? undefined : handleValueChange}
        disabled={isDisabled || isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            <span className="truncate">{getSelectedLabel()}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="p-0" position="popper" align="start">
          {/* Search Input */}
          {isSearchable && (
            <div className="sticky top-0 z-50 bg-popover p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-8 h-9"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-[250px] overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {noOptionsMessage()}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = isMulti 
                    ? Array.isArray(value) && value.includes(option.value)
                    : value === option.value;
                  
                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className={cn(
                        "cursor-pointer",
                        isSelected && "bg-accent"
                      )}
                      onSelect={() => handleValueChange(option.value)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {isSelected && (
                          <span className="text-primary">✓</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </div>
            )}
          </div>

          {/* Multi-select info */}
          {isMulti && (
            <div className="p-2 border-t text-xs text-muted-foreground">
              {Array.isArray(value) && value.length > 0 
                ? `${value.length} item dipilih`
                : "Pilih satu atau lebih opsi"}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

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

// Fungsi untuk generate ID surat keputusan
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

        const kegiatanData: MasterKegiatan[] = values.slice(1).map((row: any[], index: number) => ({
          index: index + 1,
          role: row[1] || "",
          namaKegiatan: row[2] || "",
          bebanAnggaran: row[3] || "",
          harga: row[4] || "",
          satuan: row[5] || ""
        })).filter((item: MasterKegiatan) => item.namaKegiatan.trim() !== "");

        setMasterData(kegiatanData);
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

  const organikOptions = organikList.map(organik => ({
    value: organik.id,
    label: organik.name
  }));

  const mitraOptions = mitraList.map(mitra => ({
    value: mitra.id,
    label: mitra.name
  }));

  const kegiatanOptions = masterData.map(item => ({
    value: item.index.toString(),
    label: item.namaKegiatan
  }));

  // Mendapatkan daftar organik dan mitra yang dipilih
  const selectedOrganikIds = form.watch("organik") || [];
  const selectedMitraIds = form.watch("mitraStatistik") || [];

  // Fungsi untuk mendapatkan nama berdasarkan ID
  const getOrganikName = (id: string) => {
    const organik = organikList.find(o => o.id === id);
    return organik?.name || id;
  };

  const getMitraName = (id: string) => {
    const mitra = mitraList.find(m => m.id === id);
    return mitra?.name || id;
  };

  // Fungsi untuk menghapus organik
  const handleRemoveOrganik = (id: string) => {
    const currentValues = form.getValues("organik") || [];
    form.setValue("organik", currentValues.filter(item => item !== id));
  };

  // Fungsi untuk menghapus mitra
  const handleRemoveMitra = (id: string) => {
    const currentValues = form.getValues("mitraStatistik") || [];
    form.setValue("mitraStatistik", currentValues.filter(item => item !== id));
  };

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
      const formattedValue = `${selectedKegiatan.namaKegiatan} | ${selectedKegiatan.bebanAnggaran} | ${selectedKegiatan.harga} | ${selectedKegiatan.satuan}`;
      
      form.setValue("memutuskanKedua", formattedValue);
      form.setValue("selectedKegiatanId", selectedIndex.toString());
      form.trigger("memutuskanKedua");
    }
  };

  const onSubmit = async (data: SuratKeputusanFormData) => {
    setIsSubmitting(true);
    try {
      const sequenceNumber = await getNextSequenceNumber();
      const skId = await generateSKId();

      const selectedOrganiks = organikList.filter(o => data.organik.includes(o.id));
      const selectedMitras = mitraList.filter(m => data.mitraStatistik.includes(m.id));
      const selectedPembuat = organikList.find(o => o.id === data.pembuatDaftar);

      const rowData = [
        sequenceNumber,
        skId,
        data.nomorSuratKeputusan,
        data.tentang,
        data.menimbangKesatu,
        data.menimbangKedua || "",
        data.menimbangKetiga || "",
        data.menimbangKeempat || "",
        data.memutuskanKesatu,
        data.memutuskanKedua,
        `${formatTanggalIndonesia(data.tanggalMulai)} | ${formatTanggalIndonesia(data.tanggalSelesai)}`,
        formatTanggalIndonesia(data.tanggalSuratKeputusan),
        selectedOrganiks.map(o => o.name).join(" | "),
        selectedMitras.map(m => m.name).join(" | "),
        selectedPembuat?.name || "",
        data.selectedKegiatanId || ""
      ];

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
                {/* Nomor Surat Keputusan dan Tentang dengan layout yang lebih baik */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1">
                    <FormField control={form.control} name="nomorSuratKeputusan" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Nomor Surat Keputusan</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Contoh: 123/KD.01/ST/2024" 
                              className="w-full" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  </div>
                  
                  <div className="lg:col-span-3">
                    <FormField control={form.control} name="tentang" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Tentang</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Masukkan tentang (dapat berisi teks panjang)" 
                              className="min-h-[100px]" 
                              {...field} 
                            />
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
                      <label className="text-sm font-medium">Pilih dari Master Kegiatan (Opsional):</label>
                      <FormSelect
                        placeholder={isLoadingMaster ? "Memuat data..." : "Cari dan pilih kegiatan..."}
                        options={kegiatanOptions}
                        value={form.watch("selectedKegiatanId")}
                        onChange={handleKegiatanSelect}
                        isMulti={false}
                        isSearchable={true}
                        isDisabled={isLoadingMaster}
                        isLoading={isLoadingMaster}
                        noOptionsMessage={() => "Data tidak ditemukan"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pilih dari dropdown atau ketik manual dengan format: Nama Kegiatan | Beban Anggaran | Harga | Satuan
                      </p>
                    </div>
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

                {/* Bagian Organik dan Mitra Statistik - SEDERHANA */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dropdown Organik */}
                    <FormField
                      control={form.control}
                      name="organik"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organik BPS</FormLabel>
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
                        </FormItem>
                      )}
                    />

                    {/* Dropdown Mitra Statistik */}
                    <FormField
                      control={form.control}
                      name="mitraStatistik"
                      render={({ field }) => (
                        <FormItem>
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
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dropdown Pembuat Daftar */}
                  <div className="max-w-md">
                    <FormField
                      control={form.control}
                      name="pembuatDaftar"
                      render={({ field }) => (
                        <FormItem>
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
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Daftar Organik yang Dipilih - SEDERHANA */}
                  {selectedOrganikIds.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium text-blue-700">
                          Organik Terpilih ({selectedOrganikIds.length})
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrganikIds.map((id) => (
                          <div
                            key={id}
                            className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200"
                          >
                            <span className="text-sm">{getOrganikName(id)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOrganik(id)}
                              className="ml-1 text-blue-500 hover:text-blue-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daftar Mitra yang Dipilih - SEDERHANA */}
                  {selectedMitraIds.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-600" />
                        <h3 className="font-medium text-green-700">
                          Mitra Statistik Terpilih ({selectedMitraIds.length})
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedMitraIds.map((id) => (
                          <div
                            key={id}
                            className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200"
                          >
                            <span className="text-sm">{getMitraName(id)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMitra(id)}
                              className="ml-1 text-green-500 hover:text-green-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ringkasan */}
                  {(selectedOrganikIds.length > 0 || selectedMitraIds.length > 0) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Personel Terpilih</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {selectedOrganikIds.length + selectedMitraIds.length} orang
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Rincian</p>
                          <p className="text-sm font-medium">
                            {selectedOrganikIds.length} Organik + {selectedMitraIds.length} Mitra
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pesan jika belum ada yang dipilih */}
                  {selectedOrganikIds.length === 0 && selectedMitraIds.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg bg-gray-50">
                      <Users className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Belum ada personel yang dipilih</p>
                      <p className="text-sm text-gray-400 mt-1">Gunakan dropdown di atas untuk menambahkan</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
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