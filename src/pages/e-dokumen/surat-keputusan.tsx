import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon, FileText, Search, ChevronDown, ChevronUp, User, Users, Trash2, Loader2, Plus, X, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
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
const DEFAULT_TARGET_SPREADSHEET_ID = "11gtkh70Qg1ggvDNl1uXtjlh051eJ3KLe4YkCODr6TPo";
const SHEET_NAME = "SuratKeputusan";
const MASTER_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";
const DEFAULT_MASTER_ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM"; // Fallback satker 3210

const getTargetSheetId = (contextValue?: string): string => {
  return contextValue || DEFAULT_TARGET_SPREADSHEET_ID;
};

// Default value untuk kegiatan
const DEFAULT_KEGIATAN: KegiatanItem = {
  namaKegiatan: "",
  bebanAnggaran: "",
  harga: "",
  satuan: ""
};

// CONTOH TEXT untuk membantu user
const CONTOH_MENIMBANG_KESATU = "Bahwa untuk kelancaran Pendataan Survei Konversi Gabah ke Beras (SKGB) Tahun 2026 Badan Pusat Statistik Kabupaten Majalengka perlu menetapkan Petugas Pendataan Survei Konversi Gabah ke Beras (SKGB) Tahun 2026 Badan Pusat Statistik Kabupaten Majalengka;";
const CONTOH_MENIMBANG_KEDUA = "Bahwa dalam upaya meningkatkan kualitas data dan pengawasan pelaksanaan Survei Konversi Gabah ke Beras (SKGB) Tahun 2026, diperlukan pengaturan yang jelas mengenai tugas dan tanggung jawab setiap petugas;";
const CONTOH_MENIMBANG_KETIGA = "Bahwa untuk memenuhi kebutuhan data yang akurat dan tepat waktu sesuai dengan target yang telah ditetapkan oleh Badan Pusat Statistik Pusat, diperlukan penunjukkan petugas yang kompeten dan berdedikasi;";
const CONTOH_MENIMBANG_KEEMPAT = "Bahwa segala biaya yang timbul sebagai akibat pelaksanaan Survei Konversi Gabah ke Beras (SKGB) Tahun 2026 dibebankan pada DIPA Badan Pusat Statistik Kabupaten Majalengka Tahun Anggaran 2026;";

// Custom hook untuk mengambil data organik dari satker-specific GOOGLE SHEETS
const useOrganikList = (): { data: Person[]; isLoading: boolean; error: any } => {
  const satkerContext = useSatkerConfigContext();
  const { data: organikBPSData, loading, error } = useOrganikBPS();
  
  const organikList: Person[] = organikBPSData.map((org: any) => ({
    id: org.nip || "",
    name: org.name || "",
    jabatan: org.jabatan || ""
  })).filter((item: Person) => item.id && item.name);

  return { data: organikList, isLoading: loading, error };
};

// Custom hook untuk mengambil data mitra dari satker-specific GOOGLE SHEETS
const useMitraList = (): { data: Person[]; isLoading: boolean; error: any } => {
  const satkerContext = useSatkerConfigContext();
  const { data: mitraStatistikData, loading, error } = useMitraStatistik();
  
  const mitraList: Person[] = mitraStatistikData.map((mitra: any) => ({
    id: mitra.nik || "",
    name: mitra.name || "",
    jabatan: mitra.pekerjaan || ""
  })).filter((item: Person) => item.id && item.name);

  return { data: mitraList, isLoading: loading, error };
};

// Komponen Accordion Section - Warna netral untuk merah
const AccordionSection: React.FC<{
  title: string;
  color: "neutral" | "blue" | "green" | "orange" | "purple";
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, color, badge, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const colorClasses = {
    neutral: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" }
  };

  return (
    <div className={`border ${colorClasses[color].border} rounded-lg mb-4 overflow-hidden`}>
      <div 
        className={`${colorClasses[color].bg} p-3 flex justify-between items-center cursor-pointer`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold ${colorClasses[color].text} text-sm`}>{title}</h3>
          {badge && (
            <Badge variant="outline" className={`text-xs ${colorClasses[color].text} border-${color}-300 bg-white`}>
              {badge}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </div>
      {isOpen && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

// Custom MultiSelect Component - FIXED SCROLL ISSUE
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

  const selectedOptions = useMemo(() => {
    return options.filter(option => value.includes(option.id));
  }, [options, value]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          "h-10 border-amber-600 focus:border-amber-700"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedOptions.length > 0 ? (
            <div className="flex items-center gap-1">
              {type === 'organik' ? (
                <User className="h-4 w-4 text-blue-600" />
              ) : (
                <Users className="h-4 w-4 text-green-600" />
              )}
              <span className="truncate text-sm">
                {selectedOptions.length} terpilih
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
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={`Cari ${type}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
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
                        "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-blue-50"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex-shrink-0",
                        isSelected 
                          ? "bg-blue-600 border-blue-600" 
                          : "border-gray-300"
                      )} />
                      <span className={cn("text-gray-700", isSelected && "text-blue-700")}>
                        {option.name}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Select dengan Search untuk Master Kegiatan - FIXED SCROLL ISSUE
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
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between h-10 text-sm font-normal",
          "border-amber-600 hover:border-amber-700 focus:border-amber-700"
        )}
      >
        <span className={!value ? "text-muted-foreground" : "text-gray-700"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-80">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari kegiatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Tidak ada kegiatan ditemukan
                </div>
              ) : (
                filteredOptions.map((item) => (
                  <div
                    key={item.index}
                    onClick={() => handleSelect(item)}
                    className="px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground text-gray-700"
                  >
                    {item.namaKegiatan}
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

// Custom Select dengan Search untuk Pembuat Daftar
interface SearchablePembuatSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Person[];
  placeholder?: string;
  loading?: boolean;
}

const SearchablePembuatSelect: React.FC<SearchablePembuatSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  loading = false
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

  const selectedOption = options.find(option => option.id === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between h-10 text-sm font-normal",
          "border-amber-600 hover:border-amber-700 focus:border-amber-700"
        )}
      >
        <span className={!value ? "text-muted-foreground" : "text-gray-700"}>
          {selectedOption?.name || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-80">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari pembuat daftar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Tidak ada data ditemukan
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => {
                      onValueChange(option.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "px-3 py-2 cursor-pointer text-sm hover:bg-accent hover:text-accent-foreground text-gray-700",
                      value === option.id && "bg-blue-50 text-blue-700"
                    )}
                  >
                    {option.name}
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

// Komponen untuk form kegiatan dengan dropdown - DIPERBAIKI LEBAR KOLOM
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

  const handleMasterSelect = (masterItem: MasterKegiatan) => {
    onSelectFromMaster(index, masterItem);
    setSelectedMaster(masterItem.namaKegiatan);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            {index + 1}
          </div>
          <h4 className="font-medium text-sm text-gray-700">Kegiatan {index + 1}</h4>
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

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-2 block">
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

        {/* GRID DENGAN LEBAR KOLOM YANG DIPERBAIKI */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Nama Kegiatan - 7 kolom (58.3%) */}
          <div className="md:col-span-7">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Nama Kegiatan
            </label>
            <Input
              value={item.namaKegiatan}
              onChange={(e) => onUpdate(index, 'namaKegiatan', e.target.value)}
              placeholder="Nama kegiatan"
              className="h-9 text-sm border-amber-600 focus:border-amber-700"
            />
          </div>
          
          {/* Beban Anggaran - 2 kolom (16.7%) + 7% = 2.8 ≈ 3 kolom */}
          <div className="md:col-span-3">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Beban Anggaran
            </label>
            <Input
              value={item.bebanAnggaran}
              onChange={(e) => onUpdate(index, 'bebanAnggaran', e.target.value)}
              placeholder="2898.BMA.007.005.A.521213"
              className="h-9 text-sm border-amber-600 focus:border-amber-700"
            />
          </div>
          
          {/* Harga - 1 kolom (8.3%) + 5% = 1.4 ≈ 1 kolom */}
          <div className="md:col-span-1">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Harga
            </label>
            <Input
              value={item.harga}
              onChange={(e) => onUpdate(index, 'harga', e.target.value)}
              placeholder="1000000000"
              className="h-9 text-sm border-amber-600 focus:border-amber-700"
              maxLength={10}
            />
          </div>
          
          {/* Satuan - 1 kolom (8.3%) + 5% = 1.4 ≈ 1 kolom */}
          <div className="md:col-span-1">
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Satuan
            </label>
            <Input
              value={item.satuan}
              onChange={(e) => onUpdate(index, 'satuan', e.target.value)}
              placeholder="Orang"
              className="h-9 text-sm border-amber-600 focus:border-amber-700"
              maxLength={10}
            />
          </div>
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

        if (error) throw error;

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
        console.error('Error loading master kegiatan:', err);
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
const useSubmitSKToSheets = (targetSheetId: string = DEFAULT_TARGET_SPREADSHEET_ID) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: targetSheetId,
          operation: "append",
          range: `${SHEET_NAME}!A:P`,
          values: [data]
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitData, isSubmitting };
};

// FUNGSI YANG DIPERBAIKI: Mendapatkan nomor urut berikutnya dengan benar
const getNextSequenceNumber = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: `${SHEET_NAME}!A:A`
      }
    });

    if (error) throw error;

    const values = data?.values || [];
    
    // Jika hanya header atau kosong
    if (values.length <= 1) return 1;

    // Ambil semua nilai dari kolom A, skip header
    const sequenceNumbers = values
      .slice(1)
      .map((row: any[]) => {
        const value = row[0];
        if (!value) return 0;
        
        // Coba parse sebagai number
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed === '') return 0;
          const num = parseInt(trimmed);
          return isNaN(num) ? 0 : num;
        } else if (typeof value === 'number') {
          return value;
        }
        return 0;
      })
      .filter(num => num > 0);

    if (sequenceNumbers.length === 0) return 1;

    // Cari nilai maksimum dan tambah 1
    const maxNumber = Math.max(...sequenceNumbers);
    return maxNumber + 1;
  } catch (error) {
    console.error("Error generating sequence number:", error);
    throw error;
  }
};

// FUNGSI YANG DIPERBAIKI: Generate ID surat keputusan yang benar
const generateSKId = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<string> => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `sk-${year}${month}`;

    // Ambil semua ID yang sudah ada
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: `${SHEET_NAME}!A:A` // Kolom A adalah ID
      }
    });

    if (error) throw error;

    const values = data?.values || [];
    
    // Jika hanya header atau kosong
    if (values.length <= 1) return `${prefix}001`;

    // Ambil semua ID dari bulan ini
    const currentMonthIds = values
      .slice(1) // Skip header
      .map((row: any[]) => {
        const id = row[0];
        if (!id || typeof id !== 'string') return null;
        
        // Cek apakah ID sesuai dengan pattern bulan ini
        if (id.startsWith(prefix)) {
          // Ekstrak angka dari format sk-yymmxxx
          const numStr = id.replace(prefix, '');
          const num = parseInt(numStr);
          return isNaN(num) ? 0 : num;
        }
        return null;
      })
      .filter((num): num is number => num !== null && num > 0);

    // Jika tidak ada ID untuk bulan ini
    if (currentMonthIds.length === 0) return `${prefix}001`;

    // Cari nilai maksimum dan tambah 1
    const maxNumber = Math.max(...currentMonthIds);
    const nextNumber = maxNumber + 1;
    
    // Format dengan leading zeros
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("Error generating SK ID:", error);
    throw error;
  }
};

// Fungsi untuk mengubah teks menjadi format PROPER (Huruf Kapital Setiap Kata)
const toProperCase = (text: string): string => {
  if (!text) return "";
  
  // Ubah semua ke uppercase terlebih dahulu
  return text
    .toUpperCase()
    .split(' ')
    .map(word => {
      // Handle singkatan (BPS, SKGB, dll)
      if (['BPS', 'SKGB', 'DIPA', 'TAHUN'].includes(word)) {
        return word;
      }
      // Untuk kata lainnya, pastikan huruf pertama kapital, sisanya kecil
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Fungsi untuk mengenerate Memutuskan Kesatu otomatis dari Tentang
const generateMemutuskanKesatu = (tentang: string): string => {
  if (!tentang) return "";
  
  let result = tentang;
  
  // Hapus kata-kata umum di awal
  const prefixes = [
    "tentang ", "mengenai ", "perihal ", "penetapan ", "penunjukan ",
    "pengangkatan ", "pembentukan ", "penetapan petugas ", "penetapan tim "
  ];
  
  prefixes.forEach(prefix => {
    if (result.toLowerCase().startsWith(prefix)) {
      result = result.substring(prefix.length);
    }
  });
  
  // Ubah ke format PROPER
  result = toProperCase(result);
  
  // Tambahkan "PETUGAS" di depan jika belum ada
  if (!result.toUpperCase().includes('PETUGAS') && 
      !result.toUpperCase().includes('TIM') && 
      !result.toUpperCase().includes('PENGAWAS')) {
    result = `PETUGAS ${result}`;
  }
  
  return result;
};

const SuratKeputusan = () => {
  const { toast } = useToast();
  const satkerContext = useSatkerConfigContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganikDetails, setSelectedOrganikDetails] = useState<Person[]>([]);
  const [selectedMitraDetails, setSelectedMitraDetails] = useState<Person[]>([]);
  const [showMenimbangKedua, setShowMenimbangKedua] = useState(false);
  const [showMenimbangKetiga, setShowMenimbangKetiga] = useState(false);
  const [showMenimbangKeempat, setShowMenimbangKeempat] = useState(false);
  const [tentangValue, setTentangValue] = useState("");
  
  const { data: organikList, isLoading: isLoadingOrganik } = useOrganikList();
  const { data: mitraList, isLoading: isLoadingMitra } = useMitraList();
  const { masterData, isLoading: isLoadingMaster } = useMasterKegiatan();
  
  const targetSheetId = getTargetSheetId(satkerContext?.getUserSatkerSheetId('sk'));
  const { submitData, isSubmitting: isSubmitLoading } = useSubmitSKToSheets(targetSheetId);

  const form = useForm<SuratKeputusanFormData>({
    resolver: zodResolver(suratKeputusanSchema),
    defaultValues: {
      nomorSuratKeputusan: "",
      tentang: "",
      menimbangKesatu: CONTOH_MENIMBANG_KESATU,
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

  const kegiatanList = form.watch("kegiatanList");
  const watchedOrganik = form.watch("organik") || [];
  const watchedMitra = form.watch("mitraStatistik") || [];
  const memutuskanKesatuValue = form.watch("memutuskanKesatu");
  const tentangFormValue = form.watch("tentang");

  // Fungsi untuk handle perubahan pada field "tentang"
  const handleTentangChange = (value: string) => {
    setTentangValue(value);
    form.setValue("tentang", value);
    
    // Generate otomatis Memutuskan Kesatu
    if (value.trim()) {
      const generated = generateMemutuskanKesatu(value);
      form.setValue("memutuskanKesatu", generated);
    } else {
      form.setValue("memutuskanKesatu", "");
    }
  };

  // Reset Memutuskan Kesatu jika user mengosongkan Tentang
  useEffect(() => {
    if (!tentangFormValue && memutuskanKesatuValue) {
      form.setValue("memutuskanKesatu", "");
    }
  }, [tentangFormValue, memutuskanKesatuValue, form]);

  useEffect(() => {
    const updatedOrganik = watchedOrganik
      .map(id => organikList.find(item => item.id === id))
      .filter((item): item is Person => Boolean(item));
    
    const updatedMitra = watchedMitra
      .map(id => mitraList.find(item => item.id === id))
      .filter((item): item is Person => Boolean(item));
    
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

  const handleAddKegiatan = () => {
    append(DEFAULT_KEGIATAN);
  };

  const handleRemoveKegiatan = (index: number) => {
    if (fields.length > 1) remove(index);
  };

  const handleUpdateKegiatan = (index: number, field: keyof KegiatanItem, value: string) => {
    const currentValues = form.getValues("kegiatanList");
    if (currentValues && currentValues[index]) {
      const updatedList = [...currentValues];
      updatedList[index] = { ...updatedList[index], [field]: value };
      form.setValue("kegiatanList", updatedList);
    }
  };

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
      const sequenceNumber = await getNextSequenceNumber(targetSheetId);
      const skId = await generateSKId(targetSheetId);

      const selectedPembuat = organikList.find(o => o.id === data.pembuatDaftar);

      const kegiatanFormatted = formatKegiatanForSpreadsheet(data.kegiatanList as KegiatanItem[]);
      const satkerConfig = satkerContext?.getUserSatkerConfig();
      const satkerId = satkerConfig?.satker_id || "";

      const rowData = [
        sequenceNumber,
        skId,
        satkerId,
        data.nomorSuratKeputusan,
        data.tentang,
        data.menimbangKesatu,
        data.menimbangKedua || "",
        data.menimbangKetiga || "",
        data.menimbangKeempat || "",
        data.memutuskanKesatu,
        kegiatanFormatted,
        `${formatTanggalIndonesia(data.tanggalMulai)} | ${formatTanggalIndonesia(data.tanggalSelesai)}`,
        formatTanggalIndonesia(data.tanggalSuratKeputusan),
        selectedOrganikDetails.map(o => o.name).join(" | "),
        selectedMitraDetails.map(m => m.name).join(" | "),
        selectedPembuat?.name || "",
        data.kegiatanList.length.toString()
      ];

      console.log('Submitting data:', rowData);
      await submitData(rowData);

      // Reset form dengan contoh default
      form.reset({
        nomorSuratKeputusan: "",
        tentang: "",
        menimbangKesatu: CONTOH_MENIMBANG_KESATU,
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
      setTentangValue("");
      setSelectedOrganikDetails([]);
      setSelectedMitraDetails([]);
      setShowMenimbangKedua(false);
      setShowMenimbangKetiga(false);
      setShowMenimbangKeempat(false);
      
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

  const removeOrganik = (id: string) => {
    const currentOrganik = form.getValues("organik") || [];
    form.setValue("organik", currentOrganik.filter(orgId => orgId !== id));
  };

  const removeMitra = (id: string) => {
    const currentMitra = form.getValues("mitraStatistik") || [];
    form.setValue("mitraStatistik", currentMitra.filter(mitraId => mitraId !== id));
  };

  const totalSelected = selectedOrganikDetails.length + selectedMitraDetails.length;
  const isLoading = isSubmitting || isSubmitLoading;

  // Hitung tinggi dinamis untuk textarea "tentang"
  const calculateTentangHeight = () => {
    const lineHeight = 20; // 1.25rem = 20px
    const minLines = 1;
    const maxLines = 6;
    const lines = tentangValue.split('\n').length;
    const calculatedLines = Math.min(Math.max(lines, minLines), maxLines);
    return calculatedLines * lineHeight;
  };

  return (
    <Layout>
      <div className="space-y-6 p-4">
        {/* Header - WARNA DIUBAH SESUAI TEMA SPJHonor */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-600 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            Surat Keputusan
          </h1>
          <p className="text-gray-600 ml-12 text-sm">Formulir pembuatan surat keputusan</p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="pb-3 bg-orange-50 border-b">
            <CardTitle className="text-orange-700 text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Data Surat Keputusan
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Nomor dan Tentang */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div>
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Nomor SK</FormLabel>
                      <Input 
                        placeholder="Contoh: 123" 
                        className="h-10 border-amber-600 focus:border-amber-700"
                        {...form.register("nomorSuratKeputusan")}
                      />
                      <FormMessage className="text-xs">
                        {form.formState.errors.nomorSuratKeputusan?.message}
                      </FormMessage>
                    </FormItem>
                  </div>
                  
                  <div className="lg:col-span-3">
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Tentang</FormLabel>
                      <Textarea 
                        placeholder="Contoh: Penetapan Petugas Survei Konversi Gabah ke Beras (SKGB) Tahun 2026"
                        className="text-sm resize-none overflow-hidden border-amber-600 focus:border-amber-700" 
                        style={{ 
                          height: `${calculateTentangHeight()}px`,
                          minHeight: '40px',
                          maxHeight: '120px'
                        }}
                        value={tentangValue}
                        onChange={(e) => handleTentangChange(e.target.value)}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Isi tentang surat keputusan (1 baris, otomatis generate Memutuskan Kesatu)
                      </div>
                      <FormMessage className="text-xs">
                        {form.formState.errors.tentang?.message}
                      </FormMessage>
                    </FormItem>
                  </div>
                </div>

                {/* Bagian MENIMBANG - WARNA NETRAL */}
                <AccordionSection title="MENIMBANG" color="neutral" badge="Wajib" defaultOpen={true}>
                  <div className="space-y-4">
                    <FormItem>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">KESATU</Badge>
                        <FormLabel className="text-sm text-gray-700">(Wajib diisi)</FormLabel>
                      </div>
                      <div className="mb-3 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600">
                        <div className="font-medium mb-1">Contoh lengkap:</div>
                        <div className="italic">{CONTOH_MENIMBANG_KESATU}</div>
                      </div>
                      <Textarea 
                        placeholder="Salin atau modifikasi contoh di atas sesuai kebutuhan"
                        className="min-h-[120px] text-sm border-amber-600 focus:border-amber-700" 
                        {...form.register("menimbangKesatu")}
                      />
                      <FormMessage className="text-xs">
                        {form.formState.errors.menimbangKesatu?.message}
                      </FormMessage>
                    </FormItem>

                    {/* Tombol untuk menambah menimbang opsional */}
                    <div className="space-y-4">
                      {!showMenimbangKedua && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMenimbangKedua(true)}
                          className="h-9 text-xs border-dashed w-full border-gray-300"
                        >
                          + Tambah Menimbang Kedua (Opsional)
                        </Button>
                      )}
                      
                      {showMenimbangKedua && (
                        <div className="border-l-2 border-gray-200 pl-4">
                          <FormItem>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">KEDUA</Badge>
                                <FormLabel className="text-sm text-gray-600">(Opsional)</FormLabel>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMenimbangKedua(false)}
                                className="h-6 w-6 text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="mb-3 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600">
                              <div className="font-medium mb-1">Contoh:</div>
                              <div className="italic">{CONTOH_MENIMBANG_KEDUA}</div>
                            </div>
                            <Textarea 
                              placeholder="Menimbang kedua..." 
                              className="min-h-[100px] text-sm border-amber-600 focus:border-amber-700" 
                              {...form.register("menimbangKedua")}
                            />
                          </FormItem>
                        </div>
                      )}

                      {showMenimbangKedua && !showMenimbangKetiga && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMenimbangKetiga(true)}
                          className="h-9 text-xs border-dashed w-full border-gray-300"
                        >
                          + Tambah Menimbang Ketiga (Opsional)
                        </Button>
                      )}
                      
                      {showMenimbangKetiga && (
                        <div className="border-l-2 border-gray-200 pl-4">
                          <FormItem>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">KETIGA</Badge>
                                <FormLabel className="text-sm text-gray-600">(Opsional)</FormLabel>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMenimbangKetiga(false)}
                                className="h-6 w-6 text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="mb-3 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600">
                              <div className="font-medium mb-1">Contoh:</div>
                              <div className="italic">{CONTOH_MENIMBANG_KETIGA}</div>
                            </div>
                            <Textarea 
                              placeholder="Menimbang ketiga..." 
                              className="min-h-[100px] text-sm border-amber-600 focus:border-amber-700" 
                              {...form.register("menimbangKetiga")}
                            />
                          </FormItem>
                        </div>
                      )}

                      {showMenimbangKetiga && !showMenimbangKeempat && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMenimbangKeempat(true)}
                          className="h-9 text-xs border-dashed w-full border-gray-300"
                        >
                          + Tambah Menimbang Keempat (Opsional)
                        </Button>
                      )}
                      
                      {showMenimbangKeempat && (
                        <div className="border-l-2 border-gray-200 pl-4">
                          <FormItem>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">KEEMPAT</Badge>
                                <FormLabel className="text-sm text-gray-600">(Opsional)</FormLabel>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMenimbangKeempat(false)}
                                className="h-6 w-6 text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="mb-3 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600">
                              <div className="font-medium mb-1">Contoh:</div>
                              <div className="italic">{CONTOH_MENIMBANG_KEEMPAT}</div>
                            </div>
                            <Textarea 
                              placeholder="Menimbang keempat..." 
                              className="min-h-[100px] text-sm border-amber-600 focus:border-amber-700" 
                              {...form.register("menimbangKeempat")}
                            />
                          </FormItem>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionSection>

                {/* Bagian MEMUTUSKAN - WARNA NETRAL */}
                <AccordionSection title="MEMUTUSKAN" color="neutral" defaultOpen={true}>
                  <div className="space-y-6">
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">KESATU</Badge>
                          <FormLabel className="text-sm text-gray-700">Menetapkan (Otomatis dari Tentang)</FormLabel>
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                          Auto-generated
                        </Badge>
                      </div>
                      <div className="mb-3 p-3 bg-green-50 border border-green-100 rounded text-sm">
                        <div className="flex items-start gap-2">
                          <div className="text-green-600 mt-0.5">💡</div>
                          <div>
                            <p className="text-green-700 font-medium mb-1">Otomatis dihasilkan dari field "Tentang"</p>
                            <p className="text-green-600 text-xs">Anda dapat mengedit teks di bawah ini sesuai kebutuhan</p>
                          </div>
                        </div>
                      </div>
                      <Input 
                        placeholder="Contoh: PETUGAS SURVEI KONVERSI GABAH KE BERAS (SKGB) TAHUN 2026" 
                        className="h-10 text-sm border-amber-600 focus:border-amber-700" 
                        {...form.register("memutuskanKesatu")}
                        onChange={(e) => {
                          form.setValue("memutuskanKesatu", e.target.value);
                          // Jika user mengosongkan, otomatis generate lagi dari tentang
                          if (!e.target.value.trim() && tentangValue.trim()) {
                            const generated = generateMemutuskanKesatu(tentangValue);
                            form.setValue("memutuskanKesatu", generated);
                          }
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {tentangValue ? (
                          <span className="text-green-600">
                            Diotomasi dari: "{tentangValue.substring(0, 50)}{tentangValue.length > 50 ? '...' : ''}"
                          </span>
                        ) : (
                          <span className="text-amber-600">Isi field "Tentang" terlebih dahulu untuk generate otomatis</span>
                        )}
                      </div>
                      <FormMessage className="text-xs">
                        {form.formState.errors.memutuskanKesatu?.message}
                      </FormMessage>
                    </FormItem>

                    {/* Kegiatan */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">KEDUA</Badge>
                          <FormLabel className="text-sm font-medium text-gray-700">Kegiatan yang Diputuskan (Minimal 1)</FormLabel>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddKegiatan}
                          className="h-9 px-4 text-sm border-gray-300"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Tambah Kegiatan
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <KegiatanFormItem
                            key={field.id}
                            index={index}
                            item={(kegiatanList[index] as KegiatanItem) || DEFAULT_KEGIATAN}
                            onUpdate={handleUpdateKegiatan}
                            onRemove={handleRemoveKegiatan}
                            masterData={masterData}
                            onSelectFromMaster={handleSelectFromMaster}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tanggal Range */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">KETIGA</Badge>
                        <FormLabel className="text-sm font-medium text-gray-700">Jangka Waktu Pelaksanaan</FormLabel>
                      </div>
                      <div className="flex flex-col md:flex-row items-center gap-3">
                        <FormItem className="flex-1 w-full">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full h-10 justify-start text-sm font-normal border-amber-600 hover:border-amber-700", !form.watch("tanggalMulai") && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("tanggalMulai") ? format(form.watch("tanggalMulai"), "dd/MM/yyyy") : "Tanggal Mulai"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar 
                                mode="single" 
                                selected={form.watch("tanggalMulai")} 
                                onSelect={(date) => form.setValue("tanggalMulai", date)} 
                                initialFocus 
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="text-xs">
                            {form.formState.errors.tanggalMulai?.message}
                          </FormMessage>
                        </FormItem>
                        
                        <span className="text-gray-400 text-sm">sampai</span>
                        
                        <FormItem className="flex-1 w-full">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full h-10 justify-start text-sm font-normal border-amber-600 hover:border-amber-700", !form.watch("tanggalSelesai") && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.watch("tanggalSelesai") ? format(form.watch("tanggalSelesai"), "dd/MM/yyyy") : "Tanggal Selesai"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar 
                                mode="single" 
                                selected={form.watch("tanggalSelesai")} 
                                onSelect={(date) => form.setValue("tanggalSelesai", date)}
                                disabled={date => {
                                  const tanggalMulai = form.watch("tanggalMulai");
                                  return tanggalMulai ? date < tanggalMulai : false;
                                }}
                                initialFocus 
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="text-xs">
                            {form.formState.errors.tanggalSelesai?.message}
                          </FormMessage>
                        </FormItem>
                      </div>
                    </div>
                  </div>
                </AccordionSection>

                {/* Tanggal Surat Keputusan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Tanggal Surat Keputusan</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-10 justify-start text-sm font-normal border-amber-600 hover:border-amber-700", !form.watch("tanggalSuratKeputusan") && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch("tanggalSuratKeputusan") ? format(form.watch("tanggalSuratKeputusan"), "dd/MM/yyyy") : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={form.watch("tanggalSuratKeputusan")} 
                          onSelect={(date) => form.setValue("tanggalSuratKeputusan", date)} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-xs">
                      {form.formState.errors.tanggalSuratKeputusan?.message}
                    </FormMessage>
                  </FormItem>
                </div>

                {/* PERSONEL */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-700 text-lg">PERSONEL</h3>
                        <p className="text-sm text-gray-600">Pilih personel untuk surat keputusan</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-sm bg-blue-50 text-blue-700 border-blue-300">
                      {totalSelected} orang terpilih
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Organik */}
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-blue-600 flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        Organik BPS
                      </FormLabel>
                      <MultiSelect
                        value={form.watch("organik") || []}
                        onValueChange={(value) => form.setValue("organik", value)}
                        options={organikList}
                        placeholder={isLoadingOrganik ? "Memuat data..." : "Pilih organik"}
                        loading={isLoadingOrganik}
                        type="organik"
                      />
                      <FormMessage className="text-xs">
                        {form.formState.errors.organik?.message}
                      </FormMessage>
                    </FormItem>

                    {/* Mitra */}
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-green-600 flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4" />
                        Mitra Statistik
                      </FormLabel>
                      <MultiSelect
                        value={form.watch("mitraStatistik") || []}
                        onValueChange={(value) => form.setValue("mitraStatistik", value)}
                        options={mitraList}
                        placeholder={isLoadingMitra ? "Memuat data..." : "Pilih mitra"}
                        loading={isLoadingMitra}
                        type="mitra"
                      />
                      <FormMessage className="text-xs">
                        {form.formState.errors.mitraStatistik?.message}
                      </FormMessage>
                    </FormItem>

                    {/* Pembuat Daftar */}
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 mb-2">Pembuat Daftar</FormLabel>
                      <SearchablePembuatSelect
                        value={form.watch("pembuatDaftar")}
                        onValueChange={(value) => form.setValue("pembuatDaftar", value)}
                        options={organikList}
                        placeholder="Pilih pembuat daftar"
                        loading={isLoadingOrganik}
                      />
                      <FormMessage className="text-xs">
                        {form.formState.errors.pembuatDaftar?.message}
                      </FormMessage>
                    </FormItem>
                  </div>

                  {/* Badges yang dipilih */}
                  {(selectedOrganikDetails.length > 0 || selectedMitraDetails.length > 0) && (
                    <Card className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-gray-700 mb-3">Personel Terpilih:</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedOrganikDetails.map(org => (
                            <Badge key={org.id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 py-1.5 px-3">
                              <User className="h-3 w-3 mr-1.5" />
                              <span className="mr-1.5">{org.name}</span>
                              <button 
                                onClick={() => removeOrganik(org.id)}
                                className="text-blue-500 hover:text-blue-700 ml-auto"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {selectedMitraDetails.map(mitra => (
                            <Badge key={mitra.id} variant="outline" className="bg-green-50 text-green-700 border-green-300 hover:bg-green-100 py-1.5 px-3">
                              <Users className="h-3 w-3 mr-1.5" />
                              <span className="mr-1.5">{mitra.name}</span>
                              <button 
                                onClick={() => removeMitra(mitra.id)}
                                className="text-green-500 hover:text-green-700 ml-auto"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Tombol Aksi - WARNA DIUBAH SESUAI TEMA SPJHonor */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="lg"
                    onClick={() => window.history.back()}
                    className="h-11 px-6 border-gray-300"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700 h-11 px-8 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Surat Keputusan"
                    )}
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