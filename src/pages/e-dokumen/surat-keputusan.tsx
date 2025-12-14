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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

// Types untuk selected person
type SelectedPerson = {
  id: string;
  name: string;
  type: "organik" | "mitra";
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

// Komponen untuk menampilkan daftar orang yang dipilih dalam tabel
interface SelectedPersonsTableProps {
  selectedOrganik: SelectedPerson[];
  selectedMitra: SelectedPerson[];
  onRemoveOrganik: (id: string) => void;
  onRemoveMitra: (id: string) => void;
}

const SelectedPersonsTable: React.FC<SelectedPersonsTableProps> = ({
  selectedOrganik,
  selectedMitra,
  onRemoveOrganik,
  onRemoveMitra
}) => {
  if (selectedOrganik.length === 0 && selectedMitra.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-gray-50">
        <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500">Belum ada organik atau mitra statistik yang dipilih</p>
        <p className="text-sm text-gray-400 mt-1">Gunakan dropdown di atas untuk menambahkan</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabel Organik */}
      {selectedOrganik.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-blue-700">Organik BPS</CardTitle>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {selectedOrganik.length} orang
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrganik.map((person, index) => (
                    <TableRow key={person.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveOrganik(person.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-2 sr-only sm:not-sr-only">Hapus</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabel Mitra Statistik */}
      {selectedMitra.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-green-100">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-green-700">Mitra Statistik</CardTitle>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {selectedMitra.length} orang
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMitra.map((person, index) => (
                    <TableRow key={person.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveMitra(person.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-2 sr-only sm:not-sr-only">Hapus</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
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

  const selectedOrganik = useMemo(() => {
    return selectedOrganikIds
      .map(id => organikList.find(o => o.id === id))
      .filter(Boolean)
      .map(o => ({ id: o!.id, name: o!.name, type: "organik" as const }));
  }, [selectedOrganikIds, organikList]);

  const selectedMitra = useMemo(() => {
    return selectedMitraIds
      .map(id => mitraList.find(m => m.id === id))
      .filter(Boolean)
      .map(m => ({ id: m!.id, name: m!.name, type: "mitra" as const }));
  }, [selectedMitraIds, mitraList]);

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

                {/* Bagian Organik dan Mitra Statistik */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dropdown Organik */}
                    <FormField control={form.control} name="organik" render={({
                    field
                  }) => <FormItem>
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
                        </FormItem>} />

                    {/* Dropdown Mitra Statistik */}
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
                  </div>

                  {/* Dropdown Pembuat Daftar */}
                  <div className="max-w-md">
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

                  {/* Tabel untuk menampilkan daftar yang dipilih */}
                  <SelectedPersonsTable
                    selectedOrganik={selectedOrganik}
                    selectedMitra={selectedMitra}
                    onRemoveOrganik={handleRemoveOrganik}
                    onRemoveMitra={handleRemoveMitra}
                  />
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