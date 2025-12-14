import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, FileText, Search, ChevronDown, User, Users, Trash2, Loader2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Type untuk Kegiatan Item
type KegiatanItem = {
  namaKegiatan: string;
  bebanAnggaran: string;
  harga: string;
  satuan: string;
};

// Schema Zod dengan validasi baru untuk multiple kegiatan
const suratKeputusanSchema = z.object({
  nomorSuratKeputusan: z.string().min(1, "Nomor surat keputusan harus diisi"),
  tentang: z.string().min(1, "Tentang harus diisi"),
  menimbangKesatu: z.string().min(1, "Menimbang kesatu harus diisi"),
  menimbangKedua: z.string().optional(),
  menimbangKetiga: z.string().optional(),
  menimbangKeempat: z.string().optional(),
  memutuskanKesatu: z.string().min(1, "Memutuskan kesatu harus diisi"),
  kegiatanList: z.array(z.object({
    namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
    bebanAnggaran: z.string().min(1, "Beban anggaran harus diisi"),
    harga: z.string().min(1, "Harga harus diisi"),
    satuan: z.string().min(1, "Satuan harus diisi")
  })).min(1, "Minimal satu kegiatan harus dipilih"),
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
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih")
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

type Person = {
  id: string;
  name: string;
  jabatan?: string;
};

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

// Default value untuk kegiatan
const DEFAULT_KEGIATAN: KegiatanItem = {
  namaKegiatan: "",
  bebanAnggaran: "",
  harga: "",
  satuan: ""
};

// Custom hook untuk mengambil data organik DARI GOOGLE SHEETS (bukan database)
const useOrganikList = () => {
  const [organikList, setOrganikList] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganik = async () => {
      try {
        console.log('📥 Fetching organik data from Google Sheets...');
        
        const { data, error: fetchError } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM",
            operation: "read",
            range: "MASTER.ORGANIK!A:E"
          }
        });

        if (fetchError) {
          console.error('❌ Error fetching organik from Sheets:', fetchError);
          throw fetchError;
        }

        console.log('✅ Organik data fetched from Sheets:', data);
        
        if (data?.values && data.values.length > 1) {
          const formattedData: Person[] = data.values.slice(1).map((row: any[]) => ({
            id: row[1] || row[0] || "",
            name: row[3] || row[2] || "",
            jabatan: row[4] || ""
          })).filter((item: Person) => item.id && item.name);
          
          setOrganikList(formattedData);
          console.log('📊 Formatted organik data:', formattedData);
        }
      } catch (err: any) {
        console.error('❌ Error in useOrganikList:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganik();
  }, []);

  return { data: organikList, isLoading, error };
};

// Custom hook untuk mengambil data mitra DARI GOOGLE SHEETS (bukan database)
const useMitraList = () => {
  const [mitraList, setMitraList] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMitra = async () => {
      try {
        console.log('📥 Fetching mitra data from Google Sheets...');
        
        const { data, error: fetchError } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM",
            operation: "read",
            range: "MASTER.MITRA!A:H"
          }
        });

        if (fetchError) {
          console.error('❌ Error fetching mitra from Sheets:', fetchError);
          throw fetchError;
        }

        console.log('✅ Mitra data fetched from Sheets:', data);
        
        if (data?.values && data.values.length > 1) {
          const formattedData: Person[] = data.values.slice(1).map((row: any[]) => ({
            id: row[1] || row[0] || "",
            name: row[2] || "",
            jabatan: row[4] || ""
          })).filter((item: Person) => item.id && item.name);
          
          setMitraList(formattedData);
          console.log('📊 Formatted mitra data:', formattedData);
        }
      } catch (err: any) {
        console.error('❌ Error in useMitraList:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMitra();
  }, []);

  return { data: mitraList, isLoading, error };
};

// Custom MultiSelect Component berdasarkan skrip DaftarHadir
interface MultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: Person[];
  placeholder?: string;
  loading?: boolean;
  type: 'organik' | 'mitra';
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  loading = false,
  type
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.jabatan && option.jabatan.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionId: string) => {
    if (value.includes(optionId)) {
      onValueChange(value.filter(id => id !== optionId));
    } else {
      onValueChange([...value, optionId]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === filteredOptions.length) {
      onValueChange([]);
    } else {
      onValueChange(filteredOptions.map(option => option.id));
    }
  };

  const selectedOptions = useMemo(() => {
    return options.filter(option => value.includes(option.id));
  }, [options, value]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "min-h-[40px]"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedOptions.length > 0 ? (
            <div className="flex items-center gap-1">
              {type === 'organik' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              <span className="truncate">
                {selectedOptions.length} {type === 'organik' ? 'organik' : 'mitra'} terpilih
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-md animate-in fade-in-80">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Cari ${type === 'organik' ? 'organik' : 'mitra'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
                autoFocus
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="px-3 py-2 border-b">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-8 justify-start"
              onClick={handleSelectAll}
            >
              {value.length === filteredOptions.length ? (
                <>Batalkan semua pilihan</>
              ) : (
                <>Pilih semua ({filteredOptions.length})</>
              )}
            </Button>
          </div>

          <ScrollArea className="max-h-64">
            <div className="p-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data ditemukan
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-blue-50 border border-blue-200"
                      )}
                    >
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-sm border mt-0.5",
                        isSelected 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "border-gray-300"
                      )}>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "font-medium truncate",
                            isSelected && "text-blue-700"
                          )}>
                            {option.name}
                          </p>
                          {isSelected && (
                            <Badge variant="outline" className="text-xs">
                              Terpilih
                            </Badge>
                          )}
                        </div>
                        {option.jabatan && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {option.jabatan}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="border-t px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Terpilih:</span>
              <span className="font-medium text-green-600">
                {selectedOptions.length} {type === 'organik' ? 'organik' : 'mitra'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen untuk form kegiatan
interface KegiatanFormItemProps {
  index: number;
  item: KegiatanItem;
  onUpdate: (index: number, field: keyof KegiatanItem, value: string) => void;
  onRemove: (index: number) => void;
  masterData: MasterKegiatan[];
  onSelectFromMaster: (index: number, masterItem: MasterKegiatan) => void;
}

const KegiatanFormItem: React.FC<KegiatanFormItemProps> = ({
  index,
  item,
  onUpdate,
  onRemove,
  masterData,
  onSelectFromMaster
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium">
            {index + 1}
          </div>
          <h4 className="font-medium">Kegiatan {index + 1}</h4>
        </div>
        {index > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Pilih dari Master Kegiatan:</label>
          <Select
            onValueChange={(value) => {
              const selectedMaster = masterData.find(m => m.index.toString() === value);
              if (selectedMaster) {
                onSelectFromMaster(index, selectedMaster);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Cari dan pilih dari master..." />
            </SelectTrigger>
            <SelectContent>
              {masterData.map((masterItem) => (
                <SelectItem key={masterItem.index} value={masterItem.index.toString()}>
                  <div className="flex flex-col">
                    <span className="font-medium">{masterItem.namaKegiatan}</span>
                    <span className="text-xs text-muted-foreground">
                      {masterItem.bebanAnggaran} | {masterItem.harga} {masterItem.satuan}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nama Kegiatan *</label>
            <Input
              placeholder="Nama kegiatan"
              value={item.namaKegiatan}
              onChange={(e) => onUpdate(index, 'namaKegiatan', e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Beban Anggaran *</label>
            <Input
              placeholder="Contoh: DIPA"
              value={item.bebanAnggaran}
              onChange={(e) => onUpdate(index, 'bebanAnggaran', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Harga *</label>
            <Input
              placeholder="Contoh: 1000000"
              value={item.harga}
              onChange={(e) => onUpdate(index, 'harga', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Satuan *</label>
            <Input
              placeholder="Contoh: Orang/Hari"
              value={item.satuan}
              onChange={(e) => onUpdate(index, 'satuan', e.target.value)}
            />
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm font-mono bg-white p-2 rounded border">
            <span className="text-blue-600">Format yang akan disimpan:</span><br />
            {item.namaKegiatan} | {item.bebanAnggaran} | {item.harga} | {item.satuan}
          </p>
        </div>
      </div>
    </div>
  );
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

const SuratKeputusan = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganikDetails, setSelectedOrganikDetails] = useState<Person[]>([]);
  const [selectedMitraDetails, setSelectedMitraDetails] = useState<Person[]>([]);
  const { data: organikList, isLoading: isLoadingOrganik } = useOrganikList();
  const { data: mitraList, isLoading: isLoadingMitra } = useMitraList();
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
      kegiatanList: [DEFAULT_KEGIATAN],
      tanggalMulai: undefined,
      tanggalSelesai: undefined,
      tanggalSuratKeputusan: undefined,
      organik: [],
      mitraStatistik: [],
      pembuatDaftar: ""
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "kegiatanList"
  });

  // Gunakan watch untuk mendapatkan nilai kegiatanList dengan tipe yang benar
  const kegiatanList = form.watch("kegiatanList");
  const watchedOrganik = form.watch("organik") || [];
  const watchedMitra = form.watch("mitraStatistik") || [];

  useEffect(() => {
    const updatedOrganik = watchedOrganik
      .map(id => organikList.find(item => item.id === id))
      .filter((item): item is Person => item !== undefined);
    
    const updatedMitra = watchedMitra
      .map(id => mitraList.find(item => item.id === id))
      .filter((item): item is Person => item !== undefined);
    
    setSelectedOrganikDetails(updatedOrganik);
    setSelectedMitraDetails(updatedMitra);
  }, [watchedOrganik, watchedMitra, organikList, mitraList]);

  const formatTanggalIndonesia = (date: Date | null): string => {
    if (!date) return "";
    
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  // Handler untuk menambah kegiatan baru
  const handleAddKegiatan = () => {
    append(DEFAULT_KEGIATAN);
  };

  // Handler untuk menghapus kegiatan
  const handleRemoveKegiatan = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Handler untuk update data kegiatan
  const handleUpdateKegiatan = (index: number, field: keyof KegiatanItem, value: string) => {
    // Dapatkan nilai saat ini dari form
    const currentValues = form.getValues("kegiatanList");
    if (currentValues && currentValues[index]) {
      const updatedList = [...currentValues];
      updatedList[index] = { ...updatedList[index], [field]: value };
      form.setValue("kegiatanList", updatedList);
    }
  };

  // Handler untuk memilih dari master kegiatan
  const handleSelectFromMaster = (index: number, masterItem: MasterKegiatan) => {
    const updatedKegiatan: KegiatanItem = {
      namaKegiatan: masterItem.namaKegiatan,
      bebanAnggaran: masterItem.bebanAnggaran,
      harga: masterItem.harga,
      satuan: masterItem.satuan
    };
    
    const currentValues = form.getValues("kegiatanList");
    if (currentValues && currentValues[index]) {
      const updatedList = [...currentValues];
      updatedList[index] = updatedKegiatan;
      form.setValue("kegiatanList", updatedList);
    }
  };

  // Fungsi untuk format kegiatan menjadi string untuk spreadsheet
  const formatKegiatanForSpreadsheet = (kegiatanList: KegiatanItem[]): string => {
    return kegiatanList
      .filter(kegiatan => 
        kegiatan.namaKegiatan.trim() !== "" && 
        kegiatan.bebanAnggaran.trim() !== "" && 
        kegiatan.harga.trim() !== "" && 
        kegiatan.satuan.trim() !== ""
      )
      .map(kegiatan => `${kegiatan.namaKegiatan} | ${kegiatan.bebanAnggaran} | ${kegiatan.harga} | ${kegiatan.satuan}`)
      .join("; ");
  };

  const onSubmit = async (data: SuratKeputusanFormData) => {
    setIsSubmitting(true);
    try {
      const sequenceNumber = await getNextSequenceNumber();
      const skId = await generateSKId();

      const selectedPembuat = organikList.find(o => o.id === data.pembuatDaftar);

      // Format kegiatan untuk disimpan di spreadsheet
      const kegiatanFormatted = formatKegiatanForSpreadsheet(data.kegiatanList);

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
        kegiatanFormatted, // Disimpan dengan pemisah ";"
        `${formatTanggalIndonesia(data.tanggalMulai)} | ${formatTanggalIndonesia(data.tanggalSelesai)}`,
        formatTanggalIndonesia(data.tanggalSuratKeputusan),
        selectedOrganikDetails.map(o => o.name).join(" | "),
        selectedMitraDetails.map(m => m.name).join(" | "),
        selectedPembuat?.name || "",
        data.kegiatanList.length.toString() // Menyimpan jumlah kegiatan
      ];

      console.log('📝 Submitting SK data:', rowData);

      await submitData(rowData);

      form.reset({
        nomorSuratKeputusan: "",
        tentang: "",
        menimbangKesatu: "",
        menimbangKedua: "",
        menimbangKetiga: "",
        menimbangKeempat: "",
        memutuskanKesatu: "",
        kegiatanList: [DEFAULT_KEGIATAN],
        tanggalMulai: undefined,
        tanggalSelesai: undefined,
        tanggalSuratKeputusan: undefined,
        organik: [],
        mitraStatistik: [],
        pembuatDaftar: ""
      });
      setSelectedOrganikDetails([]);
      setSelectedMitraDetails([]);
      
      toast({
        title: "Berhasil",
        description: `Surat keputusan berhasil disimpan dengan ${data.kegiatanList.length} kegiatan (ID: ${skId})`
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

  // Fungsi untuk menghapus organik
  const removeOrganik = (id: string) => {
    const currentOrganik = form.getValues("organik") || [];
    form.setValue("organik", currentOrganik.filter(orgId => orgId !== id));
  };

  // Fungsi untuk menghapus mitra
  const removeMitra = (id: string) => {
    const currentMitra = form.getValues("mitraStatistik") || [];
    form.setValue("mitraStatistik", currentMitra.filter(mitraId => mitraId !== id));
  };

  const totalSelected = selectedOrganikDetails.length + selectedMitraDetails.length;
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
              Formulir pembuatan surat keputusan dengan multiple kegiatan
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
                {/* Nomor Surat Keputusan dan Tentang */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1">
                    <FormField control={form.control} name="nomorSuratKeputusan" render={({
                      field
                    }) => (
                      <FormItem>
                        <FormLabel>Nomor Surat Keputusan</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Contoh: 123/KD.01/ST/2024" 
                            className="w-full" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <div className="lg:col-span-3">
                    <FormField control={form.control} name="tentang" render={({
                      field
                    }) => (
                      <FormItem>
                        <FormLabel>Tentang</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan tentang (dapat berisi teks panjang)" 
                            className="min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Bagian Menimbang */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-600">Menimbang</h3>
                  
                  <FormField control={form.control} name="menimbangKesatu" render={({
                    field
                  }) => (
                    <FormItem>
                      <FormLabel>KESATU - (Wajib)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan menimbang kesatu" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="menimbangKedua" render={({
                    field
                  }) => (
                    <FormItem>
                      <FormLabel>KEDUA (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan menimbang kedua" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="menimbangKetiga" render={({
                    field
                  }) => (
                    <FormItem>
                      <FormLabel>KETIGA - (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan menimbang ketiga" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="menimbangKeempat" render={({
                    field
                  }) => (
                    <FormItem>
                      <FormLabel>KEEMPAT - (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan menimbang keempat" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Bagian Memutuskan */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-700">Memutuskan</h3>
                  
                  <FormField control={form.control} name="memutuskanKesatu" render={({
                    field
                  }) => (
                    <FormItem>
                      <FormLabel>KESATU - (Wajib)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan memutuskan kesatu" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Bagian Memutuskan Kedua dengan multiple kegiatan */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base font-semibold">KEDUA - Kegiatan yang Diputuskan (Minimal 1)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddKegiatan}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Kegiatan
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <KegiatanFormItem
                          key={field.id}
                          index={index}
                          item={kegiatanList[index] || DEFAULT_KEGIATAN}
                          onUpdate={handleUpdateKegiatan}
                          onRemove={handleRemoveKegiatan}
                          masterData={masterData}
                          onSelectFromMaster={handleSelectFromMaster}
                        />
                      ))}
                    </div>

                    {/* Preview format yang akan disimpan */}
                    {kegiatanList && kegiatanList.some(k => k.namaKegiatan.trim() !== "") && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <h4 className="font-medium text-blue-700">Preview Format Penyimpanan</h4>
                            </div>
                            <div className="bg-white p-3 rounded border font-mono text-sm whitespace-pre-wrap">
                              {kegiatanList
                                .filter(k => k.namaKegiatan.trim() !== "")
                                .map((kegiatan, index) => (
                                  <div key={index} className="mb-1">
                                    {kegiatan.namaKegiatan} | {kegiatan.bebanAnggaran} | {kegiatan.harga} | {kegiatan.satuan}
                                  </div>
                                ))}
                              <div className="mt-2 text-xs text-gray-500">
                                Catatan: Kegiatan akan disimpan dengan pemisah ";"
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Bagian Memutuskan Ketiga (tanggal range) */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-700">KETIGA - (Wajib)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="tanggalMulai" render={({
                        field
                      }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal Mulai</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "dd MMMM yyyy", { locale: id }) : "Pilih tanggal mulai"}
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
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="tanggalSelesai" render={({
                        field
                      }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal Selesai</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                  {field.value ? format(field.value, "dd MMMM yyyy", { locale: id }) : "Pilih tanggal selesai"}
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
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="tanggalSuratKeputusan" render={({
                    field
                  }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Tanggal Surat Keputusan</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd MMMM yyyy", { locale: id }) : "Pilih tanggal"}
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
                    </FormItem>
                  )} />
                </div>

                {/* Bagian Personel */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Organik */}
                    <FormField control={form.control} name="organik" render={({
                      field
                    }) => (
                      <FormItem>
                        <FormLabel>Organik BPS</FormLabel>
                        <FormControl>
                          <MultiSelect
                            value={field.value || []}
                            onValueChange={field.onChange}
                            options={organikList}
                            placeholder={isLoadingOrganik ? "Memuat data..." : "Pilih organik"}
                            loading={isLoadingOrganik}
                            type="organik"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Mitra Statistik */}
                    <FormField control={form.control} name="mitraStatistik" render={({
                      field
                    }) => (
                      <FormItem>
                        <FormLabel>Mitra Statistik</FormLabel>
                        <FormControl>
                          <MultiSelect
                            value={field.value || []}
                            onValueChange={field.onChange}
                            options={mitraList}
                            placeholder={isLoadingMitra ? "Memuat data..." : "Pilih mitra"}
                            loading={isLoadingMitra}
                            type="mitra"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Pembuat Daftar */}
                    <FormField control={form.control} name="pembuatDaftar" render={({
                      field
                    }) => (
                      <FormItem>
                        <FormLabel>Pembuat Daftar</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih pembuat daftar" />
                          </SelectTrigger>
                          <SelectContent>
                            {organikList.map((organik) => (
                              <SelectItem key={organik.id} value={organik.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{organik.name}</span>
                                  {organik.jabatan && (
                                    <span className="text-xs text-muted-foreground">{organik.jabatan}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* Tampilkan yang dipilih */}
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Personel Terpilih
                        </CardTitle>
                        <Badge variant="outline" className="text-sm">
                          Total: {totalSelected} orang
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Organik Terpilih */}
                      {selectedOrganikDetails.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <h4 className="font-medium text-blue-700">Organik BPS ({selectedOrganikDetails.length})</h4>
                          </div>
                          <ScrollArea className="max-h-40 rounded-md border p-2">
                            <div className="space-y-2">
                              {selectedOrganikDetails.map(org => (
                                <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium truncate">{org.name}</p>
                                      <Badge variant="outline" className="text-xs bg-blue-100">
                                        Organik
                                      </Badge>
                                    </div>
                                    {org.jabatan && (
                                      <p className="text-sm text-muted-foreground mt-1">{org.jabatan}</p>
                                    )}
                                  </div>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeOrganik(org.id)}
                                    className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Mitra Terpilih */}
                      {selectedMitraDetails.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <h4 className="font-medium text-green-700">Mitra Statistik ({selectedMitraDetails.length})</h4>
                          </div>
                          <ScrollArea className="max-h-40 rounded-md border p-2">
                            <div className="space-y-2">
                              {selectedMitraDetails.map(mitra => (
                                <div key={mitra.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-green-50">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium truncate">{mitra.name}</p>
                                      <Badge variant="outline" className="text-xs bg-green-100">
                                        Mitra
                                      </Badge>
                                    </div>
                                    {mitra.jabatan && (
                                      <p className="text-sm text-muted-foreground mt-1">{mitra.jabatan}</p>
                                    )}
                                  </div>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeMitra(mitra.id)}
                                    className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {totalSelected === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          Belum ada personel yang dipilih
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => window.location.href = "https://kecapmaja.vercel.app/e-dokumen/buat"}
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading || isLoadingMaster}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : "Simpan Surat Keputusan"}
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