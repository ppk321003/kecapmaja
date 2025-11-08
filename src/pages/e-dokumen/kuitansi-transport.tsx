import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Trash2, Search, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { supabase } from "@/integrations/supabase/client";

// Constants
const CONSTANTS = {
  SPREADSHEET: {
    TARGET_ID: "1K0tEfeN45iwyq8yOqaCyZc1p3CLnAotQ6Iuu5NFilkI",
    MASTER_ID: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM"
  },
  SHEET_NAMES: {
    KUITANSI: "KuitansiTransportLokal",
    ORGANIK: "MASTER.ORGANIK",
    MITRA: "MASTER.MITRA"
  }
} as const;

const SearchableSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onValueChange, options, placeholder = "Pilih...", disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectTriggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

  // Measure trigger width when it becomes available
  useEffect(() => {
    if (selectTriggerRef.current) {
      const width = selectTriggerRef.current.offsetWidth;
      setTriggerWidth(width);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Auto focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure the dropdown is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSearchTerm(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    // Prevent Enter key from closing the dropdown
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Reset search term ketika dropdown ditutup
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      disabled={disabled}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger ref={selectTriggerRef} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent 
        className="max-h-60"
        style={{ 
          width: triggerWidth ? `${triggerWidth}px` : 'auto',
          minWidth: 'var(--radix-select-trigger-width)'
        }}
        position="popper"
        align="start"
      >
        {/* Sticky search header */}
        <div className="sticky top-0 z-10 bg-popover p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Cari..."
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              className="pl-8"
              // Prevent blur when clicking inside input
              onMouseDown={(e) => e.preventDefault()}
            />
          </div>
        </div>
        
        <div className="max-h-44 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground px-2">
              Tidak ada hasil ditemukan
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem 
                key={option.id} 
                value={option.id}
                className="truncate"
              >
                {option.name}
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

// Interfaces
interface Trip {
  kecamatanTujuan: string;
  rate: string;
  tanggalPelaksanaan: Date | null;
}

interface PersonGroup {
  personId: string;
  personName: string;
  dariKecamatan: string;
  trips: Trip[];
}

// Form Schema dengan validasi tanggal duplikat
const formSchema = z.object({
  tujuanPelaksanaan: z.string().min(1, "Tujuan pelaksanaan harus diisi"),
  nomorSuratTugas: z.string().max(50, "Nomor surat tugas maksimal 50 karakter"),
  tanggalSuratTugas: z.date({ required_error: "Tanggal surat tugas harus dipilih" }),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalSpj: z.date({ required_error: "Tanggal pengajuan harus dipilih" }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  transportDetails: z.array(z.object({
    type: z.enum(["organik", "mitra"]),
    personId: z.string().min(1, "Nama harus dipilih"),
    dariKecamatan: z.string().min(1, "Dari kecamatan harus dipilih"),
    kecamatanTujuan: z.string().min(1, "Kecamatan tujuan harus dipilih"),
    rate: z.string().regex(/^\d+$/, "Rate harus berupa angka"),
    tanggalPelaksanaan: z.date({ required_error: "Tanggal pelaksanaan harus dipilih" }),
    nama: z.string().optional()
  })).min(1, "Minimal harus ada 1 peserta")
}).refine((data) => {
  // Validasi: nama tidak boleh bepergian di tanggal yang sama
  const datePersonMap = new Map();
  
  for (const detail of data.transportDetails) {
    const key = `${detail.nama}-${detail.tanggalPelaksanaan?.toISOString().split('T')[0]}`;
    if (datePersonMap.has(key)) {
      return false; // Duplikat ditemukan
    }
    datePersonMap.set(key, true);
  }
  
  return true;
}, {
  message: "Satu orang tidak boleh memiliki perjalanan di tanggal yang sama",
  path: ["transportDetails"]
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  tujuanPelaksanaan: "",
  nomorSuratTugas: "",
  tanggalSuratTugas: undefined,
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalSpj: undefined,
  pembuatDaftar: "",
  transportDetails: []
};

// PersonTransportGroup Component
const PersonTransportGroup: React.FC<{
  personId: string;
  personName: string;
  dariKecamatan: string;
  trips: Trip[];
  type: "organik" | "mitra";
  personList: Array<{ id: string; name: string }>;
  kecamatanList: string[];
  onUpdatePerson: (personId: string) => void;
  onUpdateDariKecamatan: (kecamatan: string) => void;
  onUpdateTrip: (tripIndex: number, field: keyof Trip, value: any) => void;
  onAddTrip: () => void;
  onRemoveTrip: (tripIndex: number) => void;
  onRemovePerson: () => void;
}> = ({
  personId,
  personName,
  dariKecamatan,
  trips,
  type,
  personList,
  kecamatanList,
  onUpdatePerson,
  onUpdateDariKecamatan,
  onUpdateTrip,
  onAddTrip,
  onRemoveTrip,
  onRemovePerson,
}) => {
  const calculateTotal = () => {
    return trips.reduce((sum, trip) => sum + (parseInt(trip.rate) || 0), 0);
  };

  return (
    <Card className="mb-4 border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-blue-700">
            {type === "organik" ? "Organik BPS" : "Mitra Statistik"}
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemovePerson}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <FormLabel>Nama {type === "organik" ? "Organik" : "Mitra"} *</FormLabel>
            <SearchableSelect
              value={personId}
              onValueChange={onUpdatePerson}
              options={personList}
              placeholder={`Pilih ${type}`}
            />
          </div>

          <div className="space-y-2">
            <FormLabel>Dari Kecamatan *</FormLabel>
            <Select value={dariKecamatan} onValueChange={onUpdateDariKecamatan}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kecamatan" />
              </SelectTrigger>
              <SelectContent>
                {kecamatanList.map(kecamatan => (
                  <SelectItem key={kecamatan} value={kecamatan}>
                    {kecamatan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <FormLabel>Detail Perjalanan</FormLabel>
            <Button type="button" variant="outline" size="sm" onClick={onAddTrip}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Perjalanan
            </Button>
          </div>

          {trips.map((trip, tripIndex) => (
            <div key={tripIndex} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">Perjalanan {tripIndex + 1}</span>
                {trips.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTrip(tripIndex)}
                    className="text-red-500 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <FormLabel>Kecamatan Tujuan *</FormLabel>
                  <Select
                    value={trip.kecamatanTujuan}
                    onValueChange={(value) => onUpdateTrip(tripIndex, 'kecamatanTujuan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kecamatan" />
                    </SelectTrigger>
                    <SelectContent>
                      {kecamatanList.map(kecamatan => (
                        <SelectItem key={kecamatan} value={kecamatan}>
                          {kecamatan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FormLabel>Rate Transport (Rp) *</FormLabel>
                  <Input
                    type="text"
                    placeholder="0"
                    value={trip.rate}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      onUpdateTrip(tripIndex, 'rate', value);
                    }}
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel>Tanggal Pelaksanaan *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !trip.tanggalPelaksanaan && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {trip.tanggalPelaksanaan ? format(trip.tanggalPelaksanaan, "PPP", { locale: idLocale }) : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={trip.tanggalPelaksanaan || undefined}
                        onSelect={(date) => onUpdateTrip(tripIndex, 'tanggalPelaksanaan', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          ))}
        </div>

        {personName && trips.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total {personName}:</span>
              <span className="font-bold text-green-600">
                Rp {calculateTotal().toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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

const useKuitansiSequenceGenerator = () => {
  const { fetchSheetData } = useSheetData();

  const getNextSequenceNumber = useCallback(async (): Promise<number> => {
    const values = await fetchSheetData(
      CONSTANTS.SPREADSHEET.TARGET_ID,
      `${CONSTANTS.SHEET_NAMES.KUITANSI}!A:A`
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

  const generateKuitansiId = useCallback(async (): Promise<string> => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `ku-${year}${month}`;

    const values = await fetchSheetData(
      CONSTANTS.SPREADSHEET.TARGET_ID,
      `${CONSTANTS.SHEET_NAMES.KUITANSI}!B:B`
    );

    if (values.length <= 1) return `${prefix}001`;

    // Filter hanya ID yang sesuai format dan bulan/tahun yang sama
    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[0])
      .filter((id: string) => id && id.startsWith(prefix))
      .map((id: string) => {
        const match = id.match(/ku-(\d{2})(\d{2})(\d{3})/);
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

  return { getNextSequenceNumber, generateKuitansiId };
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
          range: `${CONSTANTS.SHEET_NAMES.KUITANSI}!A:W`,
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

// Helper functions
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  return format(date, "d MMMM yyyy", { locale: idLocale });
};

const extractDisplayName = (fullText: string) => {
  const parts = fullText.split(' - ');
  return parts.length > 1 ? parts[1] + ` (${parts[0]})` : fullText;
};

// Main Component
const KuitansiTransportLokal = () => {
  const navigate = useNavigate();
  const [organikGroups, setOrganikGroups] = useState<PersonGroup[]>([]);
  const [mitraGroups, setMitraGroups] = useState<PersonGroup[]>([]);
  const [duplicateErrors, setDuplicateErrors] = useState<{[key: string]: string}>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Data queries
  const watchedProgram = form.watch("program");
  const watchedKegiatan = form.watch("kegiatan");
  const watchedKro = form.watch("kro");

  const { data: programs = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(watchedProgram || null);
  const { data: kroList = [] } = useKRO(watchedKegiatan || null);
  const { data: roList = [] } = useRO(watchedKro || null);
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  const { submitData, isSubmitting } = useDataSubmission();
  const { getNextSequenceNumber, generateKuitansiId } = useKuitansiSequenceGenerator();

  // Convert grouped data to flat structure
  const flattenedTransportDetails = useMemo(() => {
    const flattened: any[] = [];
    [...organikGroups, ...mitraGroups].forEach(group => {
      group.trips.forEach(trip => {
        flattened.push({
          type: organikGroups.includes(group) ? "organik" : "mitra",
          personId: group.personId,
          nama: group.personName,
          dariKecamatan: group.dariKecamatan,
          kecamatanTujuan: trip.kecamatanTujuan,
          rate: trip.rate,
          tanggalPelaksanaan: trip.tanggalPelaksanaan
        });
      });
    });
    return flattened;
  }, [organikGroups, mitraGroups]);

  // Update form values
  useEffect(() => {
    form.setValue("transportDetails", flattenedTransportDetails, { shouldValidate: false });
  }, [flattenedTransportDetails, form]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return flattenedTransportDetails.reduce((sum, item) => sum + (parseInt(item.rate) || 0), 0);
  }, [flattenedTransportDetails]);

  // Validasi duplikat tanggal untuk nama yang sama
  useEffect(() => {
    const errors: {[key: string]: string} = {};
    const datePersonMap = new Map();
    
    flattenedTransportDetails.forEach((detail, index) => {
      if (detail.nama && detail.tanggalPelaksanaan) {
        const key = `${detail.nama}-${detail.tanggalPelaksanaan.toISOString().split('T')[0]}`;
        if (datePersonMap.has(key)) {
          errors[`detail-${index}`] = `${detail.nama} sudah memiliki perjalanan di tanggal ${formatTanggalIndonesia(detail.tanggalPelaksanaan)}`;
        }
        datePersonMap.set(key, true);
      }
    });
    
    setDuplicateErrors(errors);
  }, [flattenedTransportDetails]);

  // Simple event handlers
  const addOrganik = useCallback(() => {
    setOrganikGroups(prev => [...prev, {
      personId: "",
      personName: "",
      dariKecamatan: "Majalengka",
      trips: [{ kecamatanTujuan: "", rate: "0", tanggalPelaksanaan: null }]
    }]);
  }, []);

  const addMitra = useCallback(() => {
    setMitraGroups(prev => [...prev, {
      personId: "",
      personName: "",
      dariKecamatan: "Majalengka",
      trips: [{ kecamatanTujuan: "", rate: "0", tanggalPelaksanaan: null }]
    }]);
  }, []);

  // Organik handlers
  const handleUpdateOrganikPerson = useCallback((groupIndex: number, personId: string) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      const selectedPerson = organikList.find(p => p.id === personId);
      updated[groupIndex] = {
        ...updated[groupIndex],
        personId,
        personName: selectedPerson?.name || ""
      };
      return updated;
    });
  }, [organikList]);

  const handleUpdateOrganikDariKecamatan = useCallback((groupIndex: number, kecamatan: string) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = { ...updated[groupIndex], dariKecamatan: kecamatan };
      return updated;
    });
  }, []);

  const handleUpdateOrganikTrip = useCallback((groupIndex: number, tripIndex: number, field: keyof Trip, value: any) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex].trips[tripIndex] = { ...updated[groupIndex].trips[tripIndex], [field]: value };
      return updated;
    });
  }, []);

  const handleAddOrganikTrip = useCallback((groupIndex: number) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex].trips.push({ kecamatanTujuan: "", rate: "0", tanggalPelaksanaan: null });
      return updated;
    });
  }, []);

  const handleRemoveOrganikTrip = useCallback((groupIndex: number, tripIndex: number) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex].trips = updated[groupIndex].trips.filter((_, i) => i !== tripIndex);
      return updated;
    });
  }, []);

  const handleRemoveOrganikPerson = useCallback((groupIndex: number) => {
    setOrganikGroups(prev => prev.filter((_, i) => i !== groupIndex));
  }, []);

  // Mitra handlers (similar to organik)
  const handleUpdateMitraPerson = useCallback((groupIndex: number, personId: string) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      const selectedPerson = mitraList.find(p => p.id === personId);
      updated[groupIndex] = {
        ...updated[groupIndex],
        personId,
        personName: selectedPerson?.name || ""
      };
      return updated;
    });
  }, [mitraList]);

  const handleUpdateMitraDariKecamatan = useCallback((groupIndex: number, kecamatan: string) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = { ...updated[groupIndex], dariKecamatan: kecamatan };
      return updated;
    });
  }, []);

  const handleUpdateMitraTrip = useCallback((groupIndex: number, tripIndex: number, field: keyof Trip, value: any) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex].trips[tripIndex] = { ...updated[groupIndex].trips[tripIndex], [field]: value };
      return updated;
    });
  }, []);

  const handleAddMitraTrip = useCallback((groupIndex: number) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex].trips.push({ kecamatanTujuan: "", rate: "0", tanggalPelaksanaan: null });
      return updated;
    });
  }, []);

  const handleRemoveMitraTrip = useCallback((groupIndex: number, tripIndex: number) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex].trips = updated[groupIndex].trips.filter((_, i) => i !== tripIndex);
      return updated;
    });
  }, []);

  const handleRemoveMitraPerson = useCallback((groupIndex: number) => {
    setMitraGroups(prev => prev.filter((_, i) => i !== groupIndex));
  }, []);

  // Format data untuk spreadsheet
  const formatDataForSpreadsheet = useCallback(async (data: FormValues): Promise<any[]> => {
    const [sequenceNumber, kuitansiId] = await Promise.all([
      getNextSequenceNumber(),
      generateKuitansiId()
    ]);

    // Pisahkan data organik dan mitra
    const organikDetails = data.transportDetails.filter(detail => detail.type === "organik");
    const mitraDetails = data.transportDetails.filter(detail => detail.type === "mitra");

    // Ambil data program, kegiatan, dll dari form dan format display name
    const selectedProgram = extractDisplayName(programs.find(p => p.id === data.program)?.name || "");
    const selectedKegiatan = extractDisplayName(kegiatanList.find(k => k.id === data.kegiatan)?.name || "");
    const selectedKRO = extractDisplayName(kroList.find(k => k.id === data.kro)?.name || "");
    const selectedRO = extractDisplayName(roList.find(r => r.id === data.ro)?.name || "");
    const selectedKomponen = extractDisplayName(komponenList.find(k => k.id === data.komponen)?.name || "");
    const selectedAkun = extractDisplayName(akunList.find(a => a.id === data.akun)?.name || "");
    const pembuatDaftarName = organikList.find(p => p.id === data.pembuatDaftar)?.name || "";

    // Gabungkan semua data dengan pemisah |
    const organikNames = organikDetails.map(detail => detail.nama).filter(Boolean).join(" | ");
    const mitraNames = mitraDetails.map(detail => detail.nama).filter(Boolean).join(" | ");

    const organikKecamatanTujuan = organikDetails.map(detail => detail.kecamatanTujuan).filter(Boolean).join(" | ");
    const organikDariKecamatan = organikDetails.map(detail => detail.dariKecamatan).filter(Boolean).join(" | ");
    const organikRates = organikDetails.map(detail => detail.rate).filter(Boolean).join(" | ");
    const organikTanggal = organikDetails.map(detail => formatTanggalIndonesia(detail.tanggalPelaksanaan)).filter(Boolean).join(" | ");

    const mitraKecamatanTujuan = mitraDetails.map(detail => detail.kecamatanTujuan).filter(Boolean).join(" | ");
    const mitraDariKecamatan = mitraDetails.map(detail => detail.dariKecamatan).filter(Boolean).join(" | ");
    const mitraRates = mitraDetails.map(detail => detail.rate).filter(Boolean).join(" | ");
    const mitraTanggal = mitraDetails.map(detail => formatTanggalIndonesia(detail.tanggalPelaksanaan)).filter(Boolean).join(" | ");

    // Siapkan data untuk spreadsheet sesuai urutan header
    return [
      sequenceNumber.toString(), // No
      kuitansiId, // Id
      data.tujuanPelaksanaan, // Tujuan
      data.nomorSuratTugas, // Nomor Surat
      formatTanggalIndonesia(data.tanggalSuratTugas), // Tanggal Surat Tugas
      selectedProgram, // Program
      selectedKegiatan, // Kegiatan
      selectedKRO, // KRO
      selectedRO, // RO
      selectedKomponen, // Komponen
      selectedAkun, // Akun
      formatTanggalIndonesia(data.tanggalSpj), // Tanggal Pengajuan
      pembuatDaftarName, // Pembuat daftar
      organikNames, // Organik
      organikDariKecamatan, // Dari Kecamatan (organik)
      organikKecamatanTujuan, // Kecamatan Tujuan (organik)
      organikRates, // rate (organik)
      organikTanggal, // tanggal (organik)
      mitraNames, // Mitra Statistik
      mitraDariKecamatan, // Dari Kecamatan (mitra)
      mitraKecamatanTujuan, // Kecamatan Tujuan (mitra)
      mitraRates, // rate (mitra)
      mitraTanggal, // tanggal (mitra)
      grandTotal.toString() // Total
    ];
  }, [programs, kegiatanList, kroList, roList, komponenList, akunList, organikList, grandTotal, getNextSequenceNumber, generateKuitansiId]);

  // Form submission
  const onSubmit = async (data: FormValues) => {
    try {
      // Cek duplikat sebelum submit
      if (Object.keys(duplicateErrors).length > 0) {
        toast({
          variant: "destructive",
          title: "Validasi gagal",
          description: "Terdapat duplikat perjalanan pada tanggal yang sama untuk orang yang sama"
        });
        return;
      }

      // Tambahkan nama ke transport details
      const transportDetailsWithNames = data.transportDetails.map(detail => ({
        ...detail,
        nama: detail.type === "organik" 
          ? organikList.find(p => p.id === detail.personId)?.name || ""
          : mitraList.find(p => p.id === detail.personId)?.name || ""
      }));

      const formDataWithNames = {
        ...data,
        transportDetails: transportDetailsWithNames
      };

      // Format data untuk spreadsheet
      const rowData = await formatDataForSpreadsheet(formDataWithNames);
      
      console.log("Data yang akan dikirim ke spreadsheet:", rowData);
      
      // Submit ke Google Sheets
      await submitData(rowData);

      toast({ 
        title: "Berhasil!", 
        description: `Data kuitansi transport lokal berhasil disimpan (ID: ${rowData[1]})` 
      });
      
      navigate("/e-dokumen/buat");

    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({ 
        variant: "destructive", 
        title: "Gagal menyimpan data", 
        description: error.message || "Terjadi kesalahan saat menyimpan data" 
      });
    }
  };

  const kecamatanList = [
    "Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", "Cingambul", "Talaga", "Banjaran", 
    "Argapura", "Maja", "Majalengka", "Cigasong", "Sukahaji", "Sindang", "Rajagaluh", 
    "Sindangwangi", "Leuwimunding", "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", 
    "Panyingkiran", "Kadipaten", "Kertajati", "Jatitujuh", "Ligung", "Sumberjaya"
  ];

  const isLoading = isSubmitting;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-600">Kuitansi Transport Lokal</h1>
          <p className="text-muted-foreground mt-2">Formulir Kuitansi Transport Lokal</p>
        </div>

        {/* Tampilkan error duplikat */}
        {Object.keys(duplicateErrors).length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-red-700 mb-2">Validasi Gagal:</h4>
              <ul className="text-sm text-red-600 space-y-1">
                {Object.values(duplicateErrors).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informasi Umum */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Umum</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 border rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Contoh penulisan:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Pengawasan lapangan pendataan Sakernas Agustus 2025</li>
                    <li>• Pendataan lapangan Kerangka Sampel Area (KSA) Padi</li>
                  </ul>
                </div>
                
                <FormField control={form.control} name="tujuanPelaksanaan" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tujuan Pelaksanaan / Kegiatan</FormLabel>
                    <FormControl><Input {...field} placeholder="Masukkan tujuan pelaksanaan" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="nomorSuratTugas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Surat Tugas</FormLabel>
                      <FormControl><Input {...field} placeholder="Masukkan nomor surat tugas" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="tanggalSuratTugas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Surat Tugas</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full justify-start text-left", !field.value && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP", { locale: idLocale }) : "Pilih tanggal"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="program" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <Select onValueChange={(value) => { field.onChange(value); form.setValue("kegiatan", ""); form.setValue("kro", ""); form.setValue("ro", ""); }} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih program" /></SelectTrigger></FormControl>
                        <SelectContent>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="kegiatan" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kegiatan</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value}
                          onValueChange={(value) => { field.onChange(value); form.setValue("kro", ""); form.setValue("ro", ""); }}
                          options={kegiatanList}
                          placeholder="Pilih kegiatan"
                          disabled={!form.watch("program")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="kro" render={({ field }) => (
                    <FormItem>
                      <FormLabel>KRO</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value}
                          onValueChange={(value) => { field.onChange(value); form.setValue("ro", ""); }}
                          options={kroList}
                          placeholder="Pilih KRO"
                          disabled={!form.watch("kegiatan")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="ro" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RO</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={roList}
                          placeholder="Pilih RO"
                          disabled={!form.watch("kro")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="komponen" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Komponen</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={komponenList}
                          placeholder="Pilih komponen"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="akun" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Akun</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={akunList}
                          placeholder="Pilih akun"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="tanggalSpj" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal Pengajuan</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full justify-start text-left", !field.value && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP", { locale: idLocale }) : "Pilih tanggal"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="pembuatDaftar" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pembuat Daftar</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          options={organikList}
                          placeholder="Pilih pembuat daftar"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Organik Section */}
            <Card>
              <CardHeader>
                <CardTitle>Organik BPS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Organik BPS</h3>
                  <Button type="button" onClick={addOrganik} variant="outline">Tambah Organik</Button>
                </div>
                
                {organikGroups.map((group, groupIndex) => (
                  <PersonTransportGroup 
                    key={`organik-${groupIndex}`} 
                    {...group}
                    type="organik"
                    personList={organikList}
                    kecamatanList={kecamatanList}
                    onUpdatePerson={(personId) => handleUpdateOrganikPerson(groupIndex, personId)}
                    onUpdateDariKecamatan={(kecamatan) => handleUpdateOrganikDariKecamatan(groupIndex, kecamatan)}
                    onUpdateTrip={(tripIndex, field, value) => handleUpdateOrganikTrip(groupIndex, tripIndex, field, value)}
                    onAddTrip={() => handleAddOrganikTrip(groupIndex)}
                    onRemoveTrip={(tripIndex) => handleRemoveOrganikTrip(groupIndex, tripIndex)}
                    onRemovePerson={() => handleRemoveOrganikPerson(groupIndex)}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Mitra Section */}
            <Card>
              <CardHeader>
                <CardTitle>Mitra Statistik</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Mitra Statistik</h3>
                  <Button type="button" onClick={addMitra} variant="outline">Tambah Mitra</Button>
                </div>
                
                {mitraGroups.map((group, groupIndex) => (
                  <PersonTransportGroup 
                    key={`mitra-${groupIndex}`} 
                    {...group}
                    type="mitra"
                    personList={mitraList}
                    kecamatanList={kecamatanList}
                    onUpdatePerson={(personId) => handleUpdateMitraPerson(groupIndex, personId)}
                    onUpdateDariKecamatan={(kecamatan) => handleUpdateMitraDariKecamatan(groupIndex, kecamatan)}
                    onUpdateTrip={(tripIndex, field, value) => handleUpdateMitraTrip(groupIndex, tripIndex, field, value)}
                    onAddTrip={() => handleAddMitraTrip(groupIndex)}
                    onRemoveTrip={(tripIndex) => handleRemoveMitraTrip(groupIndex, tripIndex)}
                    onRemovePerson={() => handleRemoveMitraPerson(groupIndex)}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Total Section */}
            <Card>
              <CardContent className="p-6">
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-sky-600">
                    Total Keseluruhan: Rp {grandTotal.toLocaleString("id-ID")}
                  </h3>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/e-dokumen/buat")} disabled={isLoading}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading || flattenedTransportDetails.length === 0 || Object.keys(duplicateErrors).length > 0} className="bg-teal-600 hover:bg-teal-700">
                {isLoading ? "Menyimpan..." : "Simpan Dokumen"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default KuitansiTransportLokal;