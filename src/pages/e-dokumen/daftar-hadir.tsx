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
import { ProgramSelect } from "@/components/ProgramSelect";
import { KomponenSelect } from "@/components/KomponenSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
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
  trainingCenter: string;
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
const CONSTANTS = {
  SPREADSHEET: {
    TARGET_ID: "11a8c8cBJrgqS4ZKKvClvq_6DYsFI8R22Aka1NTxYkF0",
    MASTER_ID: DEFAULT_MASTER_SPREADSHEET_ID,
    SOURCE_ID: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8"
  },
  SHEET_NAMES: {
    DAFTAR_HADIR: "DaftarHadir",
    ORGANIK: "MASTER.ORGANIK",
    MITRA: "MASTER.MITRA",
    AKUN: "akun"
  }
} as const;

const TRAINING_CENTER_OPTIONS = [
  "BPS Kabupaten Majalengka", "RM. Majalengka", "Fitra Hotel", 
  "Garden Hotel", "Horison Ultima", "Achiera Hotel"
];

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
  trainingCenter: "",
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

const getNamaFromKode = async (sheetName: string, kode: string, namaColumn: 'C' | 'D'): Promise<string> => {
  if (!kode) return kode;
  
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: CONSTANTS.SPREADSHEET.SOURCE_ID,
        operation: "read",
        range: sheetName
      }
    });

    if (error || !data?.values) {
      console.error(`Error fetching ${sheetName}:`, error);
      return kode;
    }

    const rows = data.values.slice(1);
    const foundRow = rows.find((row: any[]) => row[1] === kode);

    if (foundRow) {
      const columnIndex = namaColumn === 'C' ? 2 : 3;
      return foundRow[columnIndex] || kode;
    }

    return kode;
  } catch (error) {
    console.error(`Error in getNamaFromKode for ${sheetName}:`, error);
    return kode;
  }
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

const useSequenceGenerator = () => {
  const { fetchSheetData } = useSheetData();

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
  }, [fetchSheetData]);

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
  }, [fetchSheetData]);

  return { getNextSequenceNumber, generateDaftarHadirId };
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
          range: `${CONSTANTS.SHEET_NAMES.DAFTAR_HADIR}!A:O`,
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

// Komponen AkunSelect dengan Search dalam 1 baris
interface AkunSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

const AkunSelect: React.FC<AkunSelectProps> = ({ value, onValueChange }) => {
  const [akunOptions, setAkunOptions] = useState<{ id: string; name: string; kode: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAkunOptions();
  }, []);

  // Focus ke input search saat dropdown terbuka
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  const fetchAkunOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: CONSTANTS.SPREADSHEET.SOURCE_ID,
          operation: "read",
          range: CONSTANTS.SHEET_NAMES.AKUN
        }
      });

      if (error || !data?.values) {
        console.error("Error fetching akun:", error);
        return;
      }

      const rows = data.values.slice(1);
      const options = rows
        .map((row: any[]) => ({
          id: row[1] || '',
          kode: row[1] || '',
          name: `${row[1]} - ${row[2]}` || ''
        }))
        .filter((item: any) => item.id && item.name);

      setAkunOptions(options);
    } catch (error) {
      console.error("Error in fetchAkunOptions:", error);
      toast({
        variant: "destructive",
        title: "Gagal memuat data akun",
        description: "Terjadi kesalahan saat memuat data akun"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return akunOptions;
    return akunOptions.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.kode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [akunOptions, searchTerm]);

  const selectedAkun = akunOptions.find(option => option.id === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "min-h-[40px] text-left"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedAkun ? (
            <span className="truncate">{selectedAkun.name}</span>
          ) : (
            <span className="text-muted-foreground">Pilih akun...</span>
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
                placeholder="Cari kode atau nama akun..."
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

          {/* Options List dengan Scroll */}
          <div className="max-h-64 overflow-y-auto">
            <div className="p-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data akun ditemukan
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value === option.id;
                  const [kode, nama] = option.name.split(' - ');
                  
                  return (
                    <div
                      key={option.id}
                      onClick={() => {
                        onValueChange(option.id);
                        setIsOpen(false);
                      }}
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
                            {kode}
                          </p>
                          {isSelected && (
                            <Badge variant="outline" className="text-xs">
                              Terpilih
                            </Badge>
                          )}
                        </div>
                        {nama && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {nama}
                          </p>
                        )}
                      </div>
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
  const masterSpreadsheetId = satkerContext?.getUserSatkerSheetId('masterorganik') || DEFAULT_MASTER_SPREADSHEET_ID;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<Option[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<Option[]>([]);
  const [organikList, setOrganikList] = useState<Option[]>([]);
  const [mitraList, setMitraList] = useState<Option[]>([]);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [loadingMitra, setLoadingMitra] = useState(false);

  const { submitData, isSubmitting: isSubmitLoading } = useDataSubmission();
  const { getNextSequenceNumber, generateDaftarHadirId } = useSequenceGenerator();
  const { fetchSheetData } = useSheetData();

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

  // Fetch initial data dengan loading state
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoadingOrganik(true);
        setLoadingMitra(true);

        // Fetch organik
        const organikRows = await fetchSheetData(
          masterSpreadsheetId,
          `${CONSTANTS.SHEET_NAMES.ORGANIK}!A:E`
        );
        if (organikRows.length > 1) {
          const organikData = organikRows.slice(1).map((row: any[]) => ({
            id: row[1] || '',
            name: row[3] || '',
            jabatan: row[4] || ''
          })).filter((item: any) => item.id && item.name);
          setOrganikList(organikData);
        }
        setLoadingOrganik(false);

        // Fetch mitra
        const mitraRows = await fetchSheetData(
          masterSpreadsheetId,
          `${CONSTANTS.SHEET_NAMES.MITRA}!A:H`
        );
        if (mitraRows.length > 1) {
          const mitraData = mitraRows.slice(1).map((row: any[]) => ({
            id: `mitra-${row[1]}` || '',
            name: row[2] || '',
            kecamatan: row[7] || ''
          })).filter((item: any) => item.id && item.name);
          setMitraList(mitraData);
        }
        setLoadingMitra(false);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({
          variant: "destructive",
          title: "Gagal memuat data",
          description: "Terjadi kesalahan saat memuat data peserta"
        });
        setLoadingOrganik(false);
        setLoadingMitra(false);
      }
    };

    fetchInitialData();
  }, [fetchSheetData, masterSpreadsheetId]);

  // Update selected organik and mitra
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
        getNamaFromKode("program", data.program, 'C'),
        getNamaFromKode("kegiatan", data.kegiatan, 'D'),
        getNamaFromKode("kro", data.kro, 'D'),
        getNamaFromKode("ro", data.ro, 'D'),
        getNamaFromKode("komponen", data.komponen, 'C'),
        getNamaFromKode("akun", data.akun, 'C')
      ]);

      const pembuatDaftar = organikList.find(item => item.id === data.pembuatDaftar);
      
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

  const isLoading = isSubmitting || isSubmitLoading;

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
                  <Label>Tempat Kegiatan</Label>
                  <Controller 
                    name="trainingCenter" 
                    control={control} 
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tempat kegiatan" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAINING_CENTER_OPTIONS.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} 
                  />
                </div>
              </div>

              {/* Program dan Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                      <KomponenSelect
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )} 
                  />
                  {errors.komponen && <p className="text-sm text-destructive">{errors.komponen.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Akun <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="akun" 
                    control={control} 
                    rules={{ required: "Akun harus dipilih" }}
                    render={({ field }) => (
                      <AkunSelect
                        value={field.value}
                        onValueChange={field.onChange}
                      />
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih pembuat daftar" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="max-h-64 overflow-y-auto">
                            {organikList.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-xs text-muted-foreground">{item.jabatan}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        </SelectContent>
                      </Select>
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