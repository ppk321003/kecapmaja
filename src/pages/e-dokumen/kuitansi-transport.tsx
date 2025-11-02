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
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

// Simple Searchable Select Component
const SearchableSelect: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onValueChange, options, placeholder = "Pilih...", disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
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

// Form Schema
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

// Main Component
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

  // Setup submission
  const submitMutation = useSubmitToSheets({
    spreadsheetId: "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc",
    sheetName: "KuitansiTransportLokal",
    onSuccess: () => navigate("/e-dokumen/buat")
  });

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

  // Form submission
  const onSubmit = async (data: FormValues) => {
    try {
      const transportDetailsWithNames = data.transportDetails.map(detail => ({
        ...detail,
        nama: detail.type === "organik" 
          ? organikList.find(p => p.id === detail.personId)?.name || ""
          : mitraList.find(p => p.id === detail.personId)?.name || ""
      }));

      await submitMutation.mutateAsync({ ...data, transportDetails: transportDetailsWithNames });
      
      toast({ title: "Berhasil!", description: "Data berhasil disimpan" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal menyimpan data", description: error.message });
    }
  };

  const kecamatanList = [
    "Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", "Cingambul", "Talaga", "Banjaran", 
    "Argapura", "Maja", "Majalengka", "Cigasong", "Sukahaji", "Sindang", "Rajagaluh", 
    "Sindangwangi", "Leuwimunding", "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", 
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
              <CardContent className="p-6 space-y-6">
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
              <CardContent className="p-6">
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
              <CardContent className="p-6">
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
              <Button type="button" variant="outline" onClick={() => navigate("/e-dokumen/buat")} disabled={submitMutation.isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={submitMutation.isPending || flattenedTransportDetails.length === 0} className="bg-teal-600 hover:bg-teal-700">
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