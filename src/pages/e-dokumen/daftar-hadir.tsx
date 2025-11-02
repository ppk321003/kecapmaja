import React, { useState, useEffect, useCallback } from "react";
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
import { Calendar as CalendarIcon, Trash, Search } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

// Constants
const CONSTANTS = {
  SPREADSHEET: {
    TARGET_ID: "11a8c8cBJrgqS4ZKKvClvq_6DYsFI8R22Aka1NTxYkF0",
    SOURCE_ID: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8",
    MASTER_ID: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM"
  },
  SHEET_NAMES: {
    DAFTAR_HADIR: "DaftarHadir",
    PROGRAM: "program",
    KEGIATAN: "kegiatan",
    KRO: "kro",
    RO: "ro",
    KOMPONEN: "komponen",
    AKUN: "akun",
    ORGANIK: "MASTER.ORGANIK",
    MITRA: "MASTER.MITRA"
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
      .map((row: any[]) => row[1])
      .filter((id: string) => id && id.startsWith(prefix))
      .map((id: string) => {
        const numStr = id.replace(prefix, '');
        const num = parseInt(numStr);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    const nextNum = currentMonthIds.length === 0 ? 1 : Math.max(...currentMonthIds) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
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

// Components
const SearchableSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onValueChange, options, placeholder = "Pilih...", disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filteredOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  );
};

const MultiSelect: React.FC<{
  value: string[];
  onValueChange: (value: string[]) => void;
  options: Option[];
  placeholder?: string;
}> = ({ value, onValueChange, options, placeholder = "Pilih..." }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    if (value.includes(selectedValue)) {
      onValueChange(value.filter(v => v !== selectedValue));
    } else {
      onValueChange([...value, selectedValue]);
    }
  };

  const isSelected = (optionId: string) => value.includes(optionId);

  return (
    <div className="space-y-2">
      <Select onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map((option) => (
              <SelectItem 
                key={option.id} 
                value={option.id}
                className={cn(
                  "cursor-pointer",
                  isSelected(option.id) && "bg-blue-50 text-blue-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{option.name}</span>
                    {option.jabatan && (
                      <span className="text-xs text-muted-foreground">{option.jabatan}</span>
                    )}
                    {option.kecamatan && (
                      <span className="text-xs text-muted-foreground">{option.kecamatan}</span>
                    )}
                  </div>
                  {isSelected(option.id) && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full ml-2" />
                  )}
                </div>
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
      
      {value.length > 0 && (
        <p className="text-xs text-green-600">
          {value.length} peserta terpilih
        </p>
      )}
    </div>
  );
};

// Komponen Select Khusus untuk setiap field
const KegiatanSelect: React.FC<{ 
  value: string; 
  onValueChange: (value: string) => void; 
  programId?: string 
}> = ({ value, onValueChange, programId }) => {
  const [kegiatanOptions, setKegiatanOptions] = useState<Option[]>([]);
  const { fetchSheetData } = useSheetData();

  useEffect(() => {
    const fetchKegiatan = async () => {
      if (!programId) {
        setKegiatanOptions([]);
        return;
      }

      try {
        const rows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.SOURCE_ID,
          `${CONSTANTS.SHEET_NAMES.KEGIATAN}!A:D`
        );
        
        if (rows.length > 1) {
          const options = rows
            .slice(1)
            .map((row: any[]) => ({
              id: row[2] || '',
              name: row[3] || ''
            }))
            .filter((item: any) => item.id && item.name);

          setKegiatanOptions(options);
        }
      } catch (error) {
        console.error("Error fetching kegiatan:", error);
        setKegiatanOptions([]);
      }
    };

    fetchKegiatan();
  }, [programId, fetchSheetData]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={kegiatanOptions}
      placeholder={programId ? "Pilih kegiatan" : "Pilih program terlebih dahulu"}
      disabled={!programId}
    />
  );
};

const KROSelect: React.FC<{ 
  value: string; 
  onValueChange: (value: string) => void; 
  kegiatanId?: string 
}> = ({ value, onValueChange, kegiatanId }) => {
  const [kroOptions, setKroOptions] = useState<Option[]>([]);
  const { fetchSheetData } = useSheetData();

  useEffect(() => {
    const fetchKRO = async () => {
      if (!kegiatanId) {
        setKroOptions([]);
        return;
      }

      try {
        const rows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.SOURCE_ID,
          `${CONSTANTS.SHEET_NAMES.KRO}!A:D`
        );
        
        if (rows.length > 1) {
          const options = rows
            .slice(1)
            .map((row: any[]) => ({
              id: row[2] || '',
              name: row[3] || ''
            }))
            .filter((item: any) => item.id && item.name);

          setKroOptions(options);
        }
      } catch (error) {
        console.error("Error fetching KRO:", error);
        setKroOptions([]);
      }
    };

    fetchKRO();
  }, [kegiatanId, fetchSheetData]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={kroOptions}
      placeholder={kegiatanId ? "Pilih KRO" : "Pilih kegiatan terlebih dahulu"}
      disabled={!kegiatanId}
    />
  );
};

const ROSelect: React.FC<{ 
  value: string; 
  onValueChange: (value: string) => void; 
  kroId?: string 
}> = ({ value, onValueChange, kroId }) => {
  const [roOptions, setRoOptions] = useState<Option[]>([]);
  const { fetchSheetData } = useSheetData();

  useEffect(() => {
    const fetchRO = async () => {
      if (!kroId) {
        setRoOptions([]);
        return;
      }

      try {
        const rows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.SOURCE_ID,
          `${CONSTANTS.SHEET_NAMES.RO}!A:D`
        );
        
        if (rows.length > 1) {
          const options = rows
            .slice(1)
            .map((row: any[]) => ({
              id: row[2] || '',
              name: row[3] || ''
            }))
            .filter((item: any) => item.id && item.name);

          setRoOptions(options);
        }
      } catch (error) {
        console.error("Error fetching RO:", error);
        setRoOptions([]);
      }
    };

    fetchRO();
  }, [kroId, fetchSheetData]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={roOptions}
      placeholder={kroId ? "Pilih RO" : "Pilih KRO terlebih dahulu"}
      disabled={!kroId}
    />
  );
};

const KomponenSelect: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const [komponenOptions, setKomponenOptions] = useState<Option[]>([]);
  const { fetchSheetData } = useSheetData();

  useEffect(() => {
    const fetchKomponen = async () => {
      try {
        const rows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.SOURCE_ID,
          `${CONSTANTS.SHEET_NAMES.KOMPONEN}!A:C`
        );
        
        if (rows.length > 1) {
          const options = rows.slice(1).map((row: any[]) => ({
            id: row[1] || '',
            name: row[2] || ''
          })).filter((item: any) => item.id && item.name);
          
          setKomponenOptions(options);
        }
      } catch (error) {
        console.error("Error fetching komponen:", error);
      }
    };

    fetchKomponen();
  }, [fetchSheetData]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={komponenOptions}
      placeholder="Pilih komponen"
    />
  );
};

const AkunSelect: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const [akunOptions, setAkunOptions] = useState<Option[]>([]);
  const { fetchSheetData } = useSheetData();

  useEffect(() => {
    const fetchAkun = async () => {
      try {
        const rows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.SOURCE_ID,
          `${CONSTANTS.SHEET_NAMES.AKUN}!A:C`
        );
        
        if (rows.length > 1) {
          const options = rows.slice(1).map((row: any[]) => ({
            id: row[1] || '',
            name: row[2] || ''
          })).filter((item: any) => item.id && item.name);
          
          setAkunOptions(options);
        }
      } catch (error) {
        console.error("Error fetching akun:", error);
      }
    };

    fetchAkun();
  }, [fetchSheetData]);

  return (
    <SearchableSelect
      value={value}
      onValueChange={onValueChange}
      options={akunOptions}
      placeholder="Pilih akun"
    />
  );
};

// Main Component
const DaftarHadir = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<Option[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<Option[]>([]);
  const [programs, setPrograms] = useState<Option[]>([]);
  const [organikList, setOrganikList] = useState<Option[]>([]);
  const [mitraList, setMitraList] = useState<Option[]>([]);

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

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch programs
        const programRows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.SOURCE_ID,
          `${CONSTANTS.SHEET_NAMES.PROGRAM}!A:C`
        );
        if (programRows.length > 1) {
          const programData = programRows.slice(1).map((row: any[]) => ({
            id: row[1] || '',
            name: row[2] || ''
          })).filter((item: any) => item.id && item.name);
          setPrograms(programData);
        }

        // Fetch organik
        const organikRows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.MASTER_ID,
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

        // Fetch mitra
        const mitraRows = await fetchSheetData(
          CONSTANTS.SPREADSHEET.MASTER_ID,
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
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, [fetchSheetData]);

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

      const programName = programs.find(p => p.id === data.program)?.name || data.program;
      const pembuatDaftar = organikList.find(item => item.id === data.pembuatDaftar);
      
      const rowData = [
        sequenceNumber,
        daftarHadirId,
        data.namaKegiatan,
        data.detil || "",
        data.jenis,
        programName,
        data.kegiatan,
        data.kro,
        data.ro,
        data.komponen,
        data.akun,
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
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map(program => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                {['tanggalMulai', 'tanggalSelesai', 'tanggalSpj'].map((fieldName) => (
                  <div key={fieldName} className="space-y-2">
                    <Label>
                      {fieldName === 'tanggalMulai' && 'Tanggal Mulai'}
                      {fieldName === 'tanggalSelesai' && 'Tanggal Selesai'}
                      {fieldName === 'tanggalSpj' && 'Tanggal SPJ'}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Controller 
                      name={fieldName as keyof FormValues} 
                      control={control} 
                      rules={{ required: `Tanggal ${fieldName.replace('tanggal', '').toLowerCase()} harus diisi` }}
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
                            <Calendar 
                              mode="single" 
                              selected={field.value || undefined} 
                              onSelect={field.onChange} 
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                      )} 
                    />
                    {errors[fieldName as keyof FormValues] && (
                      <p className="text-sm text-destructive">
                        {errors[fieldName as keyof FormValues]?.message}
                      </p>
                    )}
                  </div>
                ))}
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
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={organikList}
                        placeholder="Pilih pembuat daftar"
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
                    <CardTitle className="text-lg">Peserta Organik BPS</CardTitle>
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
                            placeholder="Pilih organik BPS"
                          />
                        )} 
                      />
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedOrganik.map(org => (
                        <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.jabatan}</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeOrganik(org.id)}>
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Peserta Mitra Statistik</CardTitle>
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
                            placeholder="Pilih mitra statistik"
                          />
                        )} 
                      />
                    </div>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedMitra.map(mitra => (
                        <div key={mitra.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{mitra.name}</p>
                            <p className="text-sm text-muted-foreground">{mitra.kecamatan}</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeMitra(mitra.id)}>
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => navigate("/e-dokumen/buat")} disabled={isLoading}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
                  {isLoading ? "Menyimpan..." : "Simpan Dokumen"}
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