import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Trash, Search, ChevronDown, User, Users, Loader2, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { ProgramSelect } from "@/components/ProgramSelect";
import { KomponenSelect } from "@/components/KomponenSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
import { PersonSingleSelect, Person } from "@/components/PersonMultiSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
interface FormValues {
  namaKegiatan: string;
  detil: string;
  jenis: string;
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalSpj: Date | null;
  organik: string[];
  mitra: string[];
  pembuatDaftar: string;
}

interface Option {
  id: string;
  name: string;
  jabatan?: string;
  kecamatan?: string;
}

interface AkunOption {
  id: string;
  name: string;
  kode: string;
}

// Constants
const DEFAULT_MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const DEFAULT_TARGET_SPREADSHEET_ID = "11a8c8cBJrgqS4ZKKvClvq_6DYsFI8R22Aka1NTxYkF0"; // Fallback for satker 3210

const getConstantsWithDynamicTarget = (targetSheetId: string | null) => ({
  SPREADSHEET: {
    TARGET_ID: targetSheetId || DEFAULT_TARGET_SPREADSHEET_ID,
    MASTER_ID: DEFAULT_MASTER_SPREADSHEET_ID,
    SOURCE_ID: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8"
  },
  SHEET_NAMES: {
    DAFTAR_HADIR: "DaftarHadir",
    ORGANIK: "MASTER.ORGANIK",
    MITRA: "MASTER.MITRA",
    PROGRAM: "program",
    KEGIATAN: "kegiatan",
    KRO: "kro",
    RO: "ro",
    KOMPONEN: "komponen",
    AKUN: "akun"
  }
} as const);

const JENIS_OPTIONS = ["Pelatihan", "Briefing", "Rapat Persiapan", "Rapat Evaluasi"];

const defaultValues: FormValues = {
  namaKegiatan: "",
  detil: "",
  jenis: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalMulai: null,
  tanggalSelesai: null,
  tanggalSpj: null,
  organik: [],
  mitra: [],
  pembuatDaftar: ""
};

// Utility Functions
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  return format(date, "dd MMMM yyyy", { locale: id });
};

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

// Komponen AkunSelect dengan Search dalam 1 baris
// Improved MultiSelect Component
interface MultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: Option[];
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
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Focus ke input search saat dropdown terbuka
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.jabatan && option.jabatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.kecamatan && option.kecamatan.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  // Close dropdown when clicking outside
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
      {/* Trigger Button */}
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
              <Users className="h-4 w-4" />
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

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-md animate-in fade-in-80">
          {/* Search Input */}
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Cari nama, jabatan, atau kecamatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Select All Button */}
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

          {/* Options List dengan Scroll */}
          <div className="max-h-64 overflow-y-auto">
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
                        {option.kecamatan && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Kecamatan: {option.kecamatan}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Count */}
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

// Komponen untuk menampilkan daftar peserta terpilih dengan scroll
interface SelectedParticipantsProps {
  participants: Option[];
  onRemove: (id: string) => void;
  title: string;
  type: 'organik' | 'mitra';
}

const SelectedParticipants: React.FC<SelectedParticipantsProps> = ({
  participants,
  onRemove,
  title,
  type
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{title}:</h4>
        <Badge variant="secondary">
          {participants.length} {type}
        </Badge>
      </div>
      <div className="border rounded-lg p-2">
        <div 
          ref={scrollAreaRef}
          className="h-40 overflow-y-auto pr-2"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f3f4f6'
          }}
        >
          <div className="space-y-2">
            {participants.map(participant => (
              <div key={participant.id} className="flex items-center justify-between p-2 border rounded hover:bg-accent/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate text-sm">{participant.name}</p>
                    <Badge variant="outline" className="text-xs">
                      Terpilih
                    </Badge>
                  </div>
                  {participant.jabatan && (
                    <p className="text-xs text-muted-foreground mt-1">{participant.jabatan}</p>
                  )}
                  {participant.kecamatan && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Kecamatan: {participant.kecamatan}
                    </p>
                  )}
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRemove(participant.id)}
                  className="ml-2 h-7 w-7 p-0"
                >
                  <Trash className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const DaftarHadir = () => {
  const navigate = useNavigate();
  const satkerContext = useSatkerConfigContext();
  const daftarHadirSheetId = satkerContext?.getUserSatkerSheetId('daftarhadir') || DEFAULT_TARGET_SPREADSHEET_ID;
  const CONSTANTS = getConstantsWithDynamicTarget(daftarHadirSheetId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<Option[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<Option[]>([]);

  // Get organik and mitra data from hooks (already satker-aware)
  const { data: organikDataFromHook, loading: loadingOrganik } = useOrganikBPS();
  const { data: mitraDataFromHook, loading: loadingMitra } = useMitraStatistik();

  // Transform hook data to Option format
  const organikList: Option[] = useMemo(() => 
    organikDataFromHook.map(item => ({
      id: item.nip,
      name: item.name,
      jabatan: item.jabatan
    })) || [],
    [organikDataFromHook]
  );

  const mitraList: Option[] = useMemo(() => 
    mitraDataFromHook.map(item => ({
      id: `mitra-${item.nik}`,
      name: item.name,
      kecamatan: item.kecamatan
    })) || [],
    [mitraDataFromHook]
  );

  const { fetchSheetData } = useSheetData();

  // Define sequence generation functions with access to CONSTANTS
  const getNextSequenceNumber = useCallback(async (): Promise<number> => {
    const values = await fetchSheetData(
      CONSTANTS.SPREADSHEET.TARGET_ID,
      `${CONSTANTS.SHEET_NAMES.DAFTAR_HADIR}!A:A`
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
  }, [fetchSheetData, CONSTANTS]);

  const generateDaftarHadirId = useCallback(async (): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `dh-${year}${month}`;

    const values = await fetchSheetData(
      CONSTANTS.SPREADSHEET.TARGET_ID,
      `${CONSTANTS.SHEET_NAMES.DAFTAR_HADIR}!B:B`
    );

    if (values.length <= 1) return `${prefix}001`;

    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[0])
      .filter((id: string) => id && id.startsWith(prefix))
      .map((id: string) => {
        const match = id.match(/dh-(\d{2})(\d{2})(\d{3})/);
        if (match) {
          const sequence = parseInt(match[3]);
          return isNaN(sequence) ? 0 : sequence;
        }
        return 0;
      })
      .filter(num => num > 0);

    const nextSequence = currentMonthIds.length === 0 ? 1 : Math.max(...currentMonthIds) + 1;
    return `${prefix}${nextSequence.toString().padStart(3, '0')}`;
  }, [fetchSheetData, CONSTANTS]);

  const submitData = useCallback(async (data: any[]) => {
    const { data: result, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: CONSTANTS.SPREADSHEET.TARGET_ID,
        operation: "append",
        range: `${CONSTANTS.SHEET_NAMES.DAFTAR_HADIR}!A:O`,
        values: [data]
      }
    });

    if (error) throw error;
    return result;
  }, [CONSTANTS]);

  const fetchAkunOptions = useCallback(async (): Promise<Option[]> => {
    const values = await fetchSheetData(
      CONSTANTS.SPREADSHEET.TARGET_ID,
      `${CONSTANTS.SHEET_NAMES.AKUN}!A2:B1000`
    );

    return values.map((row: any[]) => ({
      value: row[0],
      label: row[1]
    }));
  }, [fetchSheetData, CONSTANTS]);

  const getNamaFromKode = useCallback(async (type: string, kode: string): Promise<string> => {
    if (!kode) return '';
    
    const sheetMap: { [key: string]: { name: string; namaCol: 'C' | 'D' } } = {
      program: { name: 'program', namaCol: 'C' },
      kegiatan: { name: 'kegiatan', namaCol: 'D' },
      kro: { name: 'kro', namaCol: 'D' },
      ro: { name: 'ro', namaCol: 'D' },
      komponen: { name: 'komponen', namaCol: 'C' },
      akun: { name: 'akun', namaCol: 'C' }
    };
    
    const sheetInfo = sheetMap[type];
    if (!sheetInfo) {
      console.warn(`Unknown type for getNamaFromKode: ${type}`);
      return kode;
    }

    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: CONSTANTS.SPREADSHEET.SOURCE_ID,
          operation: "read",
          range: sheetInfo.name
        }
      });

      if (error || !data?.values) {
        console.error(`Error fetching ${sheetInfo.name}:`, error);
        return kode;
      }

      const rows = data.values.slice(1); // Skip header
      const foundRow = rows.find((row: any[]) => {
        // Cari berdasarkan kode di kolom B (index 1)
        return row && row[1] === kode;
      });

      if (foundRow) {
        // Kolom C = index 2, Kolom D = index 3
        const columnIndex = sheetInfo.namaCol === 'C' ? 2 : 3;
        const result = foundRow[columnIndex] || kode;
        console.log(`Found ${type}/${kode} -> ${result}`);
        return result;
      }

      console.warn(`No matching kode found for ${type}: ${kode}`);
      return kode;
    } catch (error) {
      console.error(`Error getting nama from kode for ${type}/${kode}:`, error);
      return kode;
    }
  }, [CONSTANTS]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({ defaultValues });

  const watchedProgram = watch('program');
  const watchedKegiatan = watch('kegiatan');
  const watchedKRO = watch('kro');
  const watchedOrganik = watch('organik');
  const watchedMitra = watch('mitra');

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (!watchedProgram) {
      setValue('kegiatan', '');
      setValue('kro', '');
      setValue('ro', '');
    }
  }, [watchedProgram, setValue]);

  useEffect(() => {
    if (!watchedKegiatan) {
      setValue('kro', '');
      setValue('ro', '');
    }
  }, [watchedKegiatan, setValue]);

  useEffect(() => {
    if (!watchedKRO) {
      setValue('ro', '');
    }
  }, [watchedKRO, setValue]);

  // Update selected organik and mitra when watched values change
  useEffect(() => {
    const updatedOrganik = (watchedOrganik || [])
      .map(id => organikList.find(item => item.id === id))
      .filter(Boolean) as Option[];
    
    const updatedMitra = (watchedMitra || [])
      .map(id => mitraList.find(item => item.id === id))
      .filter(Boolean) as Option[];
    
    setSelectedOrganik(updatedOrganik);
    setSelectedMitra(updatedMitra);
  }, [watchedOrganik, watchedMitra, organikList, mitraList]);

  const handleSubmitForm = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      console.log('Form data on submit:', data);
      
      const [sequenceNumber, daftarHadirId] = await Promise.all([
        getNextSequenceNumber(),
        generateDaftarHadirId()
      ]);

      // Dapatkan nama dari kode untuk setiap field
      const [
        programNama,
        kegiatanNama, 
        kroNama,
        roNama,
        komponenNama,
        akunNama
      ] = await Promise.all([
        getNamaFromKode("program", data.program),
        getNamaFromKode("kegiatan", data.kegiatan),
        getNamaFromKode("kro", data.kro),
        getNamaFromKode("ro", data.ro),
        getNamaFromKode("komponen", data.komponen),
        getNamaFromKode("akun", data.akun)
      ]);

      console.log('Resolved names:', { programNama, kegiatanNama, kroNama, roNama, komponenNama, akunNama });

      const pembuatDaftar = organikList.find(item => item.id === data.pembuatDaftar);
      const satkerConfig = satkerContext?.getUserSatkerConfig();
      
      const rowData = [
        sequenceNumber,
        daftarHadirId,
        data.namaKegiatan,
        data.detil || "",
        data.jenis,
        programNama,
        kegiatanNama,
        kroNama,
        roNama,
        komponenNama,
        akunNama,
        formatTanggalIndonesia(data.tanggalMulai),
        formatTanggalIndonesia(data.tanggalSelesai),
        pembuatDaftar?.name || data.pembuatDaftar,
        selectedOrganik.map(org => org.name).join(" | "),
        selectedMitra.map(mitra => mitra.name).join(" | ")
      ];

      console.log('Final rowData to submit:', rowData);

      await submitData(rowData);

      toast({
        title: "Sukses!",
        description: `Daftar Hadir berhasil disimpan (ID: ${daftarHadirId})`,
        variant: "default"
      });
      
      navigate("/e-dokumen/buat");

    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeOrganik = (id: string) => {
    const currentOrganik = watch('organik') || [];
    setValue('organik', currentOrganik.filter(orgId => orgId !== id));
  };

  const removeMitra = (id: string) => {
    const currentMitra = watch('mitra') || [];
    setValue('mitra', currentMitra.filter(mitraId => mitraId !== id));
  };

  const isLoading = isSubmitting;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-600">Daftar Hadir</h1>
          <p className="text-muted-foreground mt-2">Formulir Daftar Hadir</p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Form Daftar Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
              {/* Informasi Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="namaKegiatan" 
                    control={control} 
                    rules={{ required: "Nama kegiatan harus diisi" }}
                    render={({ field }) => (
                      <Input 
                        {...field} 
                        placeholder="Contoh: Pelatihan Petugas Pemutakhiran Perkembangan Desa Tahun 2025"
                      />
                    )} 
                  />
                  {errors.namaKegiatan && <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detil">Detil Kegiatan</Label>
                  <Controller 
                    name="detil" 
                    control={control} 
                    render={({ field }) => (
                      <Input 
                        {...field} 
                        placeholder="Contoh: Pemutakhiran Perkembangan Desa Tahun 2025"
                      />
                    )} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Jenis <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="jenis" 
                    control={control} 
                    rules={{ required: "Jenis harus dipilih" }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          {JENIS_OPTIONS.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} 
                  />
                  {errors.jenis && <p className="text-sm text-destructive">{errors.jenis.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Program Pembebanan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="program" 
                    control={control} 
                    rules={{ required: "Program harus dipilih" }}
                    render={({ field }) => (
                      <ProgramSelect
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )} 
                  />
                  {errors.program && <p className="text-sm text-destructive">{errors.program.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Kegiatan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="kegiatan" 
                    control={control} 
                    rules={{ required: "Kegiatan harus dipilih" }}
                    render={({ field }) => (
                      <KegiatanSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        programId={watchedProgram}
                        disabled={!watchedProgram}
                      />
                    )} 
                  />
                  {errors.kegiatan && <p className="text-sm text-destructive">{errors.kegiatan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>KRO <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="kro" 
                    control={control} 
                    rules={{ required: "KRO harus dipilih" }}
                    render={({ field }) => (
                      <KROSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        kegiatanId={watchedKegiatan}
                        disabled={!watchedKegiatan}
                      />
                    )} 
                  />
                  {errors.kro && <p className="text-sm text-destructive">{errors.kro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>RO <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="ro" 
                    control={control} 
                    rules={{ required: "RO harus dipilih" }}
                    render={({ field }) => (
                      <ROSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        kroId={watchedKRO}
                        disabled={!watchedKRO}
                      />
                    )} 
                  />
                  {errors.ro && <p className="text-sm text-destructive">{errors.ro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Komponen <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="komponen" 
                    control={control} 
                    rules={{ required: "Komponen harus dipilih" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <KomponenSelect
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  {errors.komponen && <p className="text-sm text-destructive">{errors.komponen.message}</p>}
                </div>\n\n                <div className="space-y-2">
                  <Label>Akun <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="akun" 
                    control={control} 
                    rules={{ required: "Akun harus dipilih" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AkunSelect
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                  {errors.akun && <p className="text-sm text-destructive">{errors.akun.message}</p>}
                </div>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalMulai" 
                    control={control} 
                    rules={{ required: "Tanggal mulai harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalMulai && <p className="text-sm text-destructive">{errors.tanggalMulai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalSelesai" 
                    control={control} 
                    rules={{ required: "Tanggal selesai harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalSelesai && <p className="text-sm text-destructive">{errors.tanggalSelesai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal SPJ <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalSpj" 
                    control={control} 
                    rules={{ required: "Tanggal SPJ harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : "Pilih tanggal"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalSpj && <p className="text-sm text-destructive">{errors.tanggalSpj.message}</p>}
                </div>
              </div>

              {/* Pembuat Daftar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pembuat Daftar <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="pembuatDaftar" 
                    control={control} 
                    rules={{ required: "Pembuat daftar harus dipilih" }}
                    render={({ field }) => (
                      <PersonSingleSelect
                        placeholder="Pilih pembuat daftar"
                        options={organikList.map(item => ({
                          id: item.id,
                          name: item.name,
                          jabatan: item.jabatan
                        } as Person))}
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )} 
                  />
                  {errors.pembuatDaftar && <p className="text-sm text-destructive">{errors.pembuatDaftar.message}</p>}
                </div>
              </div>

              {/* Peserta Organik dan Mitra */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Peserta Organik BPS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Controller 
                        name="organik" 
                        control={control} 
                        render={({ field }) => (
                          <MultiSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={organikList}
                            placeholder="Pilih peserta organik BPS"
                            loading={loadingOrganik}
                            type="organik"
                          />
                        )} 
                      />
                    </div>
                    
                    {selectedOrganik.length > 0 && (
                      <SelectedParticipants
                        participants={selectedOrganik}
                        onRemove={removeOrganik}
                        title="Daftar Organik Terpilih"
                        type="organik"
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Peserta Mitra Statistik
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Controller 
                        name="mitra" 
                        control={control} 
                        render={({ field }) => (
                          <MultiSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={mitraList}
                            placeholder="Pilih peserta mitra statistik"
                            loading={loadingMitra}
                            type="mitra"
                          />
                        )} 
                      />
                    </div>
                    
                    {selectedMitra.length > 0 && (
                      <SelectedParticipants
                        participants={selectedMitra}
                        onRemove={removeMitra}
                        title="Daftar Mitra Terpilih"
                        type="mitra"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => navigate("/e-dokumen/buat")} disabled={isLoading}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : "Simpan Dokumen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DaftarHadir;