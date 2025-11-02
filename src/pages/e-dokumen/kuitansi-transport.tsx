import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { KomponenSelect } from "@/components/KomponenSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

// Searchable Select Components
interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  disabled = false,
  emptyMessage = "Tidak ada data"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedOption ? selectedOption.name : ""}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-60">
        <div className="relative p-2 border-b">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-center text-muted-foreground text-sm">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))
          )}
        </div>

        {searchTerm && (
          <div className="p-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSearchTerm("")}
            >
              Hapus Pencarian
            </Button>
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

interface SearchablePersonSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string; jabatan?: string; kecamatan?: string }>;
  placeholder?: string;
  disabled?: boolean;
  type?: "organik" | "mitra";
}

const SearchablePersonSelect: React.FC<SearchablePersonSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  disabled = false,
  type = "organik"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.jabatan && option.jabatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.kecamatan && option.kecamatan.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled || options.length === 0}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={options.length === 0 ? "Tidak ada data" : placeholder}>
          {selectedOption ? (
            <div className="flex flex-col text-left">
              <span className="font-medium">{selectedOption.name}</span>
              {selectedOption.jabatan && (
                <span className="text-xs text-muted-foreground">{selectedOption.jabatan}</span>
              )}
              {selectedOption.kecamatan && (
                <span className="text-xs text-muted-foreground">{selectedOption.kecamatan}</span>
              )}
            </div>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-60 w-full">
        <div className="relative p-2 border-b">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Cari ${type === 'organik' ? 'organik' : 'mitra'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-center text-muted-foreground text-sm">
              {searchTerm ? "Tidak ada data ditemukan" : "Tidak ada data tersedia"}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <SelectItem key={option.id} value={option.id} className="py-2">
                <div className="flex flex-col">
                  <span className="font-medium">{option.name}</span>
                  {option.jabatan && (
                    <span className="text-xs text-muted-foreground">{option.jabatan}</span>
                  )}
                  {option.kecamatan && (
                    <span className="text-xs text-muted-foreground">{option.kecamatan}</span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </div>

        {searchTerm && (
          <div className="p-2 border-t bg-muted/50">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Ditemukan: {filteredOptions.length} data</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setSearchTerm("")}
              >
                Hapus
              </Button>
            </div>
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

// PersonTransportGroup Component
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

interface PersonTransportGroupProps {
  personId: string;
  personName: string;
  dariKecamatan: string;
  trips: Trip[];
  type: "organik" | "mitra";
  personList: Array<{ id: string; name: string; jabatan?: string; kecamatan?: string }>;
  kecamatanList: string[];
  onUpdatePerson: (personId: string) => void;
  onUpdateDariKecamatan: (kecamatan: string) => void;
  onUpdateTrip: (tripIndex: number, field: keyof Trip, value: any) => void;
  onAddTrip: () => void;
  onRemoveTrip: (tripIndex: number) => void;
  onRemovePerson: () => void;
}

const PersonTransportGroup: React.FC<PersonTransportGroupProps> = ({
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
            className="text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor={`person-${type}`}>
              Nama {type === "organik" ? "Organik" : "Mitra"} *
            </Label>
            <SearchablePersonSelect
              value={personId}
              onValueChange={onUpdatePerson}
              options={personList}
              placeholder={`Pilih ${type === "organik" ? "organik" : "mitra"}`}
              type={type}
            />
            {personName && (
              <p className="text-xs text-green-600 font-medium">
                ✓ {personName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`dari-kecamatan-${type}`}>Dari Kecamatan *</Label>
            <Select value={dariKecamatan} onValueChange={onUpdateDariKecamatan}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kecamatan asal" />
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
            <Label>Detail Perjalanan</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddTrip}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah Perjalanan
            </Button>
          </div>

          {trips.map((trip, tripIndex) => (
            <div key={tripIndex} className="p-4 border rounded-lg bg-gray-50/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Perjalanan {tripIndex + 1}
                </span>
                {trips.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTrip(tripIndex)}
                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`kecamatan-tujuan-${type}-${tripIndex}`}>
                    Kecamatan Tujuan *
                  </Label>
                  <Select
                    value={trip.kecamatanTujuan}
                    onValueChange={(value) => onUpdateTrip(tripIndex, 'kecamatanTujuan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kecamatan tujuan" />
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
                  <Label htmlFor={`rate-${type}-${tripIndex}`}>
                    Rate Transport (Rp) *
                  </Label>
                  <Input
                    id={`rate-${type}-${tripIndex}`}
                    type="text"
                    placeholder="0"
                    value={trip.rate}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      onUpdateTrip(tripIndex, 'rate', value);
                    }}
                    className="text-right font-mono"
                  />
                  {trip.rate && (
                    <p className="text-xs text-gray-600">
                      Rp {parseInt(trip.rate).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`tanggal-${type}-${tripIndex}`}>
                    Tanggal Pelaksanaan *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !trip.tanggalPelaksanaan && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {trip.tanggalPelaksanaan ? (
                          format(trip.tanggalPelaksanaan, "PPP", { locale: idLocale })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
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

              {trip.rate && parseInt(trip.rate) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-right text-green-600">
                    Total Trip: Rp {parseInt(trip.rate).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {personName && trips.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-blue-700">
                Total untuk {personName}:
              </span>
              <span className="text-lg font-bold text-green-600">
                Rp {calculateTotal().toLocaleString('id-ID')}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {trips.length} perjalanan
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Form Schema and Types
const formSchema = z.object({
  tujuanPelaksanaan: z.string().min(1, "Tujuan pelaksanaan harus diisi"),
  nomorSuratTugas: z.string().max(50, "Nomor surat tugas maksimal 50 karakter"),
  tanggalSuratTugas: z.date({
    required_error: "Tanggal surat tugas harus dipilih"
  }),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalSpj: z.date({
    required_error: "Tanggal pengajuan harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  transportDetails: z.array(z.object({
    type: z.enum(["organik", "mitra"]),
    personId: z.string().min(1, "Nama harus dipilih"),
    dariKecamatan: z.string().min(1, "Dari kecamatan harus dipilih"),
    kecamatanTujuan: z.string().min(1, "Kecamatan tujuan harus dipilih"),
    rate: z.string().regex(/^\d+$/, "Rate harus berupa angka"),
    tanggalPelaksanaan: z.date({
      required_error: "Tanggal pelaksanaan harus dipilih"
    }),
    nama: z.string().optional()
  })).min(1, "Minimal harus ada 1 peserta")
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

// Label component
const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
    {children}
  </label>
);

const KuitansiTransportLokal = () => {
  const navigate = useNavigate();
  const [organikGroups, setOrganikGroups] = useState<PersonGroup[]>([]);
  const [mitraGroups, setMitraGroups] = useState<PersonGroup[]>([]);

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

  // Enhanced organik data with jabatan
  const enhancedOrganikList = useMemo(() => {
    return organikList.map(org => ({
      ...org,
      jabatan: org.jabatan || "Tidak ada jabatan"
    }));
  }, [organikList]);

  // Enhanced mitra data with kecamatan
  const enhancedMitraList = useMemo(() => {
    return mitraList.map(mitra => ({
      ...mitra,
      kecamatan: mitra.kecamatan || "Tidak ada kecamatan"
    }));
  }, [mitraList]);

  // Setup submission to Google Sheets
  const submitMutation = useSubmitToSheets({
    spreadsheetId: "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc",
    sheetName: "KuitansiTransportLokal",
    onSuccess: () => {
      navigate("/e-dokumen/buat");
    }
  });

  // Convert grouped data to flat structure for form validation
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

  // Debounced form update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      form.setValue("transportDetails", flattenedTransportDetails, {
        shouldValidate: false
      });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [flattenedTransportDetails, form]);

  // Memoized calculations
  const grandTotal = useMemo(() => {
    return flattenedTransportDetails.reduce((sum, item) => sum + (parseInt(item.rate) || 0), 0);
  }, [flattenedTransportDetails]);

  // Optimized event handlers
  const addOrganik = useCallback(() => {
    if (enhancedOrganikList.length > 0) {
      setOrganikGroups(prev => [...prev, {
        personId: "",
        personName: "",
        dariKecamatan: "Majalengka",
        trips: [{
          kecamatanTujuan: "",
          rate: "0",
          tanggalPelaksanaan: null
        }]
      }]);
    } else {
      toast({
        variant: "destructive",
        title: "Data organik tidak tersedia",
        description: "Tidak ada data organik yang dapat ditambahkan"
      });
    }
  }, [enhancedOrganikList.length]);

  const addMitra = useCallback(() => {
    if (enhancedMitraList.length > 0) {
      setMitraGroups(prev => [...prev, {
        personId: "",
        personName: "",
        dariKecamatan: "Majalengka",
        trips: [{
          kecamatanTujuan: "",
          rate: "0",
          tanggalPelaksanaan: null
        }]
      }]);
    } else {
      toast({
        variant: "destructive",
        title: "Data mitra tidak tersedia",
        description: "Tidak ada data mitra yang dapat ditambahkan"
      });
    }
  }, [enhancedMitraList.length]);

  // Handlers for PersonTransportGroup - Organik
  const handleUpdateOrganikPerson = useCallback((groupIndex: number, personId: string) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      const selectedPerson = enhancedOrganikList.find(p => p.id === personId);
      updated[groupIndex] = {
        ...updated[groupIndex],
        personId,
        personName: selectedPerson?.name || ""
      };
      return updated;
    });
  }, [enhancedOrganikList]);

  const handleUpdateOrganikDariKecamatan = useCallback((groupIndex: number, kecamatan: string) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        dariKecamatan: kecamatan
      };
      return updated;
    });
  }, []);

  const handleUpdateOrganikTrip = useCallback((groupIndex: number, tripIndex: number, field: keyof Trip, value: any) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        trips: updated[groupIndex].trips.map((trip, i) => 
          i === tripIndex ? { ...trip, [field]: value } : trip
        )
      };
      return updated;
    });
  }, []);

  const handleAddOrganikTrip = useCallback((groupIndex: number) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        trips: [...updated[groupIndex].trips, {
          kecamatanTujuan: "",
          rate: "0",
          tanggalPelaksanaan: null
        }]
      };
      return updated;
    });
  }, []);

  const handleRemoveOrganikTrip = useCallback((groupIndex: number, tripIndex: number) => {
    setOrganikGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        trips: updated[groupIndex].trips.filter((_, i) => i !== tripIndex)
      };
      return updated;
    });
  }, []);

  const handleRemoveOrganikPerson = useCallback((groupIndex: number) => {
    setOrganikGroups(prev => prev.filter((_, i) => i !== groupIndex));
  }, []);

  // Similar handlers for Mitra
  const handleUpdateMitraPerson = useCallback((groupIndex: number, personId: string) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      const selectedPerson = enhancedMitraList.find(p => p.id === personId);
      updated[groupIndex] = {
        ...updated[groupIndex],
        personId,
        personName: selectedPerson?.name || ""
      };
      return updated;
    });
  }, [enhancedMitraList]);

  const handleUpdateMitraDariKecamatan = useCallback((groupIndex: number, kecamatan: string) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        dariKecamatan: kecamatan
      };
      return updated;
    });
  }, []);

  const handleUpdateMitraTrip = useCallback((groupIndex: number, tripIndex: number, field: keyof Trip, value: any) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        trips: updated[groupIndex].trips.map((trip, i) => 
          i === tripIndex ? { ...trip, [field]: value } : trip
        )
      };
      return updated;
    });
  }, []);

  const handleAddMitraTrip = useCallback((groupIndex: number) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        trips: [...updated[groupIndex].trips, {
          kecamatanTujuan: "",
          rate: "0",
          tanggalPelaksanaan: null
        }]
      };
      return updated;
    });
  }, []);

  const handleRemoveMitraTrip = useCallback((groupIndex: number, tripIndex: number) => {
    setMitraGroups(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        trips: updated[groupIndex].trips.filter((_, i) => i !== tripIndex)
      };
      return updated;
    });
  }, []);

  const handleRemoveMitraPerson = useCallback((groupIndex: number) => {
    setMitraGroups(prev => prev.filter((_, i) => i !== groupIndex));
  }, []);

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    try {
      const transportDetailsWithNames = data.transportDetails.map(detail => {
        if (detail.type === "organik") {
          const person = enhancedOrganikList.find(p => p.id === detail.personId);
          return {
            ...detail,
            nama: person?.name || ""
          };
        } else {
          const person = enhancedMitraList.find(p => p.id === detail.personId);
          return {
            ...detail,
            nama: person?.name || ""
          };
        }
      });

      const submitData = {
        ...data,
        transportDetails: transportDetailsWithNames
      };

      await submitMutation.mutateAsync(submitData);
      
      toast({
        title: "Berhasil!",
        description: "Data Kuitansi Transport Lokal berhasil disimpan",
        variant: "default"
      });

    } catch (error: any) {
      console.error("Error saving Kuitansi Transport Lokal:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    }
  };

  const kecamatanList = [
    "Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", "Cingambul", 
    "Talaga", "Banjaran", "Argapura", "Maja", "Majalengka", 
    "Cigasong", "Sukahaji", "Sindang", "Rajagaluh", "Sindangwangi", 
    "Leuwimunding", "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", 
    "Panyingkiran", "Kadipaten", "Kertajati", "Jatitujuh", "Ligung", "Sumberjaya"
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">Kuitansi Transport Lokal</h1>
          <p className="text-sm text-muted-foreground">Formulir Kuitansi Transport Lokal</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informasi Umum */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Contoh Penulisan Box */}
                  <div className="bg-muted/50 border rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">Contoh penulisan:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Pengawasan lapangan pendataan Sakernas Agustus 2025</li>
                      <li>• Pendataan lapangan Kerangka Sampel Area (KSA) Padi</li>
                      <li>• Briefing Petugas Survei Industri Mikro Kecil (VIMK) Tahunan Tahun 2025</li>
                      <li>• Rapat Evaluasi Susenas Maret 2025</li>
                    </ul>
                  </div>
                  
                  {/* Tujuan Pelaksanaan */}
                  <FormField 
                    control={form.control} 
                    name="tujuanPelaksanaan" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tujuan Pelaksanaan / Kegiatan</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Masukkan tujuan pelaksanaan / kegiatan" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />

                  {/* Nomor Surat Tugas dan Tanggal Surat Tugas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField 
                      control={form.control} 
                      name="nomorSuratTugas" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Surat Tugas</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Masukkan nomor surat tugas" 
                              maxLength={50} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    <FormField 
                      control={form.control} 
                      name="tanggalSuratTugas" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Surat Tugas</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button 
                                  variant="outline" 
                                  className={cn(
                                    "w-full pl-3 text-left font-normal", 
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: idLocale })
                                  ) : (
                                    <span>Pilih tanggal</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                  </div>

                  {/* Program, Kegiatan, KRO, RO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                              {programs.map(program => (
                                <SelectItem key={program.id} value={program.id}>
                                  {program.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Kegiatan - Searchable */}
                    <FormField 
                      control={form.control} 
                      name="kegiatan" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kegiatan</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("kro", "");
                                form.setValue("ro", "");
                              }}
                              options={kegiatanList}
                              placeholder="Pilih kegiatan"
                              disabled={!form.watch("program")}
                              emptyMessage="Tidak ada kegiatan tersedia"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* KRO - Searchable */}
                    <FormField 
                      control={form.control} 
                      name="kro" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>KRO</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue("ro", "");
                              }}
                              options={kroList}
                              placeholder="Pilih KRO"
                              disabled={!form.watch("kegiatan")}
                              emptyMessage="Tidak ada KRO tersedia"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* RO - Searchable */}
                    <FormField 
                      control={form.control} 
                      name="ro" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RO</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={roList}
                              placeholder="Pilih RO"
                              disabled={!form.watch("kro")}
                              emptyMessage="Tidak ada RO tersedia"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Komponen - Searchable */}
                    <FormField 
                      control={form.control} 
                      name="komponen" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Komponen</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={komponenList}
                              placeholder="Pilih komponen"
                              emptyMessage="Tidak ada komponen tersedia"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Akun - Searchable */}
                    <FormField 
                      control={form.control} 
                      name="akun" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Akun</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={akunList}
                              placeholder="Pilih akun"
                              emptyMessage="Tidak ada akun tersedia"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Tanggal Pengajuan */}
                    <FormField 
                      control={form.control} 
                      name="tanggalSpj" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Pengajuan</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button 
                                  variant="outline" 
                                  className={cn(
                                    "w-full pl-3 text-left font-normal", 
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: idLocale })
                                  ) : (
                                    <span>Pilih tanggal</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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

                    {/* Pembuat Daftar - Searchable */}
                    <FormField 
                      control={form.control} 
                      name="pembuatDaftar" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pembuat Daftar</FormLabel>
                          <FormControl>
                            <SearchablePersonSelect
                              value={field.value}
                              onValueChange={field.onChange}
                              options={enhancedOrganikList}
                              placeholder="Pilih pembuat daftar"
                              type="organik"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organik BPS Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Organik BPS</h3>
                  <Button 
                    type="button" 
                    onClick={addOrganik} 
                    variant="outline"
                    disabled={enhancedOrganikList.length === 0}
                  >
                    Tambah Organik
                  </Button>
                </div>
                
                {organikGroups.map((group, groupIndex) => (
                  <PersonTransportGroup 
                    key={`organik-${groupIndex}-${group.personId}`} 
                    personId={group.personId}
                    personName={group.personName}
                    dariKecamatan={group.dariKecamatan}
                    trips={group.trips}
                    type="organik"
                    personList={enhancedOrganikList}
                    kecamatanList={kecamatanList}
                    onUpdatePerson={(personId) => handleUpdateOrganikPerson(groupIndex, personId)}
                    onUpdateDariKecamatan={(kecamatan) => handleUpdateOrganikDariKecamatan(groupIndex, kecamatan)}
                    onUpdateTrip={(tripIndex, field, value) => handleUpdateOrganikTrip(groupIndex, tripIndex, field, value)}
                    onAddTrip={() => handleAddOrganikTrip(groupIndex)}
                    onRemoveTrip={(tripIndex) => handleRemoveOrganikTrip(groupIndex, tripIndex)}
                    onRemovePerson={() => handleRemoveOrganikPerson(groupIndex)}
                  />
                ))}

                {organikGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Belum ada data organik</p>
                    <p className="text-sm">Klik "Tambah Organik" untuk menambahkan data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mitra Statistik Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Mitra Statistik</h3>
                  <Button 
                    type="button" 
                    onClick={addMitra} 
                    variant="outline"
                    disabled={enhancedMitraList.length === 0}
                  >
                    Tambah Mitra
                  </Button>
                </div>
                
                {mitraGroups.map((group, groupIndex) => (
                  <PersonTransportGroup 
                    key={`mitra-${groupIndex}-${group.personId}`} 
                    personId={group.personId}
                    personName={group.personName}
                    dariKecamatan={group.dariKecamatan}
                    trips={group.trips}
                    type="mitra"
                    personList={enhancedMitraList}
                    kecamatanList={kecamatanList}
                    onUpdatePerson={(personId) => handleUpdateMitraPerson(groupIndex, personId)}
                    onUpdateDariKecamatan={(kecamatan) => handleUpdateMitraDariKecamatan(groupIndex, kecamatan)}
                    onUpdateTrip={(tripIndex, field, value) => handleUpdateMitraTrip(groupIndex, tripIndex, field, value)}
                    onAddTrip={() => handleAddMitraTrip(groupIndex)}
                    onRemoveTrip={(tripIndex) => handleRemoveMitraTrip(groupIndex, tripIndex)}
                    onRemovePerson={() => handleRemoveMitraPerson(groupIndex)}
                  />
                ))}

                {mitraGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>Belum ada data mitra</p>
                    <p className="text-sm">Klik "Tambah Mitra" untuk menambahkan data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Section */}
            <Card>
              <CardContent className="p-6">
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-sky-600">
                    Total Keseluruhan: Rp {grandTotal.toLocaleString("id-ID")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {flattenedTransportDetails.length} transaksi transportasi
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/e-dokumen/buat")}
                disabled={submitMutation.isPending}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={submitMutation.isPending || flattenedTransportDetails.length === 0}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default KuitansiTransportLokal;