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

// Custom MultiSelect Component - VERSION IMPROVED
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
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
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
              <span className="truncate text-sm">
                {selectedOptions.length} {type === 'organik' ? 'organik' : 'mitra'} terpilih
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-80">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Cari ${type === 'organik' ? 'organik' : 'mitra'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
                autoFocus
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="p-1 border-b">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-7 justify-start text-xs px-2"
              onClick={handleSelectAll}
            >
              {value.length === filteredOptions.length ? (
                <>Batalkan semua pilihan</>
              ) : (
                <>Pilih semua ({filteredOptions.length})</>
              )}
            </Button>
          </div>

          <div className="max-h-[250px] overflow-auto">
            <div className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground px-2">
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
                        "flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-colors text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-blue-50"
                      )}
                    >
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border flex-shrink-0",
                        isSelected 
                          ? "bg-blue-600 border-blue-600" 
                          : "border-gray-300"
                      )}>
                        {isSelected && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "truncate text-sm",
                          isSelected ? "text-blue-700" : "text-gray-700"
                        )}>
                          {option.name}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t px-2 py-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Terpilih:</span>
              <span className="text-green-600">
                {selectedOptions.length} {type === 'organik' ? 'organik' : 'mitra'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Select dengan Search untuk Master Kegiatan - IMPROVED VERSION
interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: MasterKegiatan[];
  placeholder?: string;
  loading?: boolean;
  onItemSelect: (item: MasterKegiatan) => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  loading = false,
  onItemSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.namaKegiatan.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSelect = (item: MasterKegiatan) => {
    onItemSelect(item);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        onClick={toggleDropdown}
        className="w-full justify-between h-10"
      >
        <span className={!value ? "text-muted-foreground text-sm" : "text-sm"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-80">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari kegiatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
            </div>
          </div>

          <div className="max-h-[250px] overflow-auto">
            <div className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground px-2">
                  Tidak ada data ditemukan
                </div>
              ) : (
                filteredOptions.map((item) => (
                  <div
                    key={item.index}
                    onClick={() => handleSelect(item)}
                    className="px-2 py-1.5 cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-gray-700">
                        {item.namaKegiatan}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen untuk form kegiatan yang disederhanakan
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
  const [selectedMaster, setSelectedMaster] = useState<string>("");

  // Fungsi untuk memecah format string menjadi bagian-bagian
  const parseKegiatanString = (str: string): KegiatanItem => {
    const parts = str.split("|").map(part => part.trim());
    return {
      namaKegiatan: parts[0] || "",
      bebanAnggaran: parts[1] || "",
      harga: parts[2] || "",
      satuan: parts[3] || ""
    };
  };

  // Fungsi untuk menggabungkan menjadi string
  const formatKegiatanString = (kegiatan: KegiatanItem): string => {
    return `${kegiatan.namaKegiatan} | ${kegiatan.bebanAnggaran} | ${kegiatan.harga} | ${kegiatan.satuan}`;
  };

  // Nilai saat ini dalam format string
  const [textValue, setTextValue] = useState(formatKegiatanString(item));

  // Handler untuk perubahan manual di textarea
  const handleTextChange = (value: string) => {
    setTextValue(value);
    try {
      const parsed = parseKegiatanString(value);
      onUpdate(index, 'namaKegiatan', parsed.namaKegiatan);
      onUpdate(index, 'bebanAnggaran', parsed.bebanAnggaran);
      onUpdate(index, 'harga', parsed.harga);
      onUpdate(index, 'satuan', parsed.satuan);
    } catch (error) {
      console.error("Error parsing kegiatan string:", error);
    }
  };

  // Handler untuk pilih dari master
  const handleMasterSelect = (masterItem: MasterKegiatan) => {
    const formattedString = formatKegiatanString({
      namaKegiatan: masterItem.namaKegiatan,
      bebanAnggaran: masterItem.bebanAnggaran,
      harga: masterItem.harga,
      satuan: masterItem.satuan
    });
    setTextValue(formattedString);
    onSelectFromMaster(index, masterItem);
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm">
            {index + 1}
          </div>
          <h4 className="font-medium text-sm">Kegiatan {index + 1}</h4>
        </div>
        {index > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">
            Pilih dari Master Kegiatan:
          </label>
          <SearchableSelect
            value={selectedMaster}
            onValueChange={setSelectedMaster}
            options={masterData}
            placeholder="Cari dan pilih kegiatan..."
            loading={false}
            onItemSelect={handleMasterSelect}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            Atau ketik manual (Format: Nama Kegiatan | Beban Anggaran | Harga | Satuan):
          </label>
          <Textarea
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Contoh: Survei Sosial Ekonomi | DIPA | 1000000 | Orang/Hari"
            className="min-h-[60px] text-sm py-2 px-3"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Format harus sesuai: Nama Kegiatan | Beban Anggaran | Harga | Satuan
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
  const [showMenimbangKedua, setShowMenimbangKedua] = useState(false);
  const [showMenimbangKetiga, setShowMenimbangKetiga] = useState(false);
  const [showMenimbangKeempat, setShowMenimbangKeempat] = useState(false);
  
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
      setShowMenimbangKedua(false);
      setShowMenimbangKetiga(false);
      setShowMenimbangKeempat(false);
      
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
                            placeholder="Contoh: 123" 
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

                {/* Bagian Menimbang - Sederhana */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-red-600">Menimbang</h3>
                    <div className="flex gap-2">
                      {!showMenimbangKedua && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMenimbangKedua(true)}
                        >
                          + Kedua
                        </Button>
                      )}
                      {!showMenimbangKetiga && showMenimbangKedua && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMenimbangKetiga(true)}
                        >
                          + Ketiga
                        </Button>
                      )}
                      {!showMenimbangKeempat && showMenimbangKetiga && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMenimbangKeempat(true)}
                        >
                          + Keempat
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <FormField control={form.control} name="menimbangKesatu" render={({
                    field
                  }) => (
                    <FormItem>
                      <FormLabel>KESATU - Cth: Bahwa untuk kelancaran Pendataan Survei Konversi Gabah ke Beras (SKGB) Tahun 2026 Badan Pusat Statistik Kabupaten Majalengka perlu menetapkan Petugas Pendataan Survei Konversi Gabah ke Beras (SKGB) Tahun 2026 Badan Pusat Statistik Kabupaten Majalengka</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Masukkan menimbang kesatu" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {showMenimbangKedua && (
                    <FormField control={form.control} name="menimbangKedua" render={({
                      field
                    }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>KEDUA (Opsional)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMenimbangKedua(false)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 w-7 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea placeholder="Masukkan menimbang kedua" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {showMenimbangKetiga && (
                    <FormField control={form.control} name="menimbangKetiga" render={({
                      field
                    }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>KETIGA (Opsional)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMenimbangKetiga(false)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 w-7 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea placeholder="Masukkan menimbang ketiga" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {showMenimbangKeempat && (
                    <FormField control={form.control} name="menimbangKeempat" render={({
                      field
                    }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>KEEMPAT (Opsional)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMenimbangKeempat(false)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 w-7 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <FormControl>
                          <Textarea placeholder="Masukkan menimbang keempat" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                </div>

                {/* Bagian Memutuskan */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-red-700">Memutuskan</h3>
                  
                  <FormField control={form.control} name="memutuskanKesatu" render={({
                    field
                  }) => (
                    <FormItem>
                      <FormLabel>KESATU - Cth: PETUGAS SURVEI KONVERSI GABAH KE BERAS (SKGB) TAHUN 2026</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Masukkan memutuskan kesatu" 
                          className="w-full" 
                          {...field} 
                        />
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
                        className="gap-1 h-8"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Tambah Kegiatan
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
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
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Pilih pembuat daftar" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[250px]">
                            {organikList.map((organik) => (
                              <SelectItem key={organik.id} value={organik.id} className="text-sm py-1.5">
                                {organik.name}
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
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Personel Terpilih
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
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
                            <h4 className="font-medium text-blue-700 text-sm">Organik BPS ({selectedOrganikDetails.length})</h4>
                          </div>
                          <div className="max-h-40 overflow-auto rounded-md border p-2">
                            <div className="space-y-1">
                              {selectedOrganikDetails.map(org => (
                                <div key={org.id} className="flex items-center justify-between p-2 border rounded hover:bg-blue-50">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-sm">{org.name}</p>
                                      <Badge variant="outline" className="text-xs bg-blue-100">
                                        Organik
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeOrganik(org.id)}
                                    className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mitra Terpilih */}
                      {selectedMitraDetails.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <h4 className="font-medium text-green-700 text-sm">Mitra Statistik ({selectedMitraDetails.length})</h4>
                          </div>
                          <div className="max-h-40 overflow-auto rounded-md border p-2">
                            <div className="space-y-1">
                              {selectedMitraDetails.map(mitra => (
                                <div key={mitra.id} className="flex items-center justify-between p-2 border rounded hover:bg-green-50">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-sm">{mitra.name}</p>
                                      <Badge variant="outline" className="text-xs bg-green-100">
                                        Mitra
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeMitra(mitra.id)}
                                    className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-50 h-6 w-6 p-0"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {totalSelected === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
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