import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { KomponenSelect } from "@/components/KomponenSelect";
import { AkunSelect } from "@/components/AkunSelect";
import PersonTransportGroup from "@/components/PersonTransportGroup";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

// New interfaces for grouped transport data
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
const KuitansiTransportLokal = () => {
  const navigate = useNavigate();
  const [organikGroups, setOrganikGroups] = useState<PersonGroup[]>([]);
  const [mitraGroups, setMitraGroups] = useState<PersonGroup[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Data queries - Use memoized values to prevent excessive re-renders
  const watchedProgram = form.watch("program");
  const watchedKegiatan = form.watch("kegiatan");
  const watchedKro = form.watch("kro");
  const {
    data: programs = []
  } = usePrograms();
  const {
    data: kegiatanList = []
  } = useKegiatan(watchedProgram || null);
  const {
    data: kroList = []
  } = useKRO(watchedKegiatan || null);
  const {
    data: roList = []
  } = useRO(watchedKro || null);
  const {
    data: komponenList = []
  } = useKomponen();
  const {
    data: akunList = []
  } = useAkun();
  const {
    data: organikList = []
  } = useOrganikBPS();
  const {
    data: mitraList = []
  } = useMitraStatistik();

  // Create memoized name-to-object mappings for display purposes
  const programsMap = useMemo(() => Object.fromEntries((programs || []).map(item => [item.id, item.name])), [programs]);
  const kegiatanMap = useMemo(() => Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name])), [kegiatanList]);
  const kroMap = useMemo(() => Object.fromEntries((kroList || []).map(item => [item.id, item.name])), [kroList]);
  const roMap = useMemo(() => Object.fromEntries((roList || []).map(item => [item.id, item.name])), [roList]);
  const komponenMap = useMemo(() => Object.fromEntries((komponenList || []).map(item => [item.id, item.name])), [komponenList]);
  const akunMap = useMemo(() => Object.fromEntries((akunList || []).map(item => [item.id, item.name])), [akunList]);
  const organikMap = useMemo(() => Object.fromEntries((organikList || []).map(item => [item.id, item.name])), [organikList]);
  const mitraMap = useMemo(() => Object.fromEntries((mitraList || []).map(item => [item.id, item.name])), [mitraList]);

  // Setup submission to Google Sheets
  const submitMutation = useSubmitToSheets({
    documentType: "KuitansiTransportLokal",
    onSuccess: () => {
      navigate("/buat-dokumen");
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

  // Debounced form update to prevent excessive re-renders
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

  // Optimized event handlers with useCallback for grouped data
  const addOrganik = useCallback(() => {
    if (organikList.length > 0) {
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
    }
  }, [organikList.length]);
  const addMitra = useCallback(() => {
    if (mitraList.length > 0) {
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
    }
  }, [mitraList.length]);

  // Handlers for PersonTransportGroup
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
        trips: updated[groupIndex].trips.map((trip, i) => i === tripIndex ? {
          ...trip,
          [field]: value
        } : trip)
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
        trips: updated[groupIndex].trips.map((trip, i) => i === tripIndex ? {
          ...trip,
          [field]: value
        } : trip)
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
      // Tambahkan nama ke setiap transportDetail
      const transportDetailsWithNames = data.transportDetails.map(detail => {
        if (detail.type === "organik") {
          const person = organikList.find(p => p.id === detail.personId);
          return {
            ...detail,
            nama: person?.name || ""
          };
        } else {
          const person = mitraList.find(p => p.id === detail.personId);
          return {
            ...detail,
            nama: person?.name || ""
          };
        }
      });
      const submitData = {
        ...data,
        transportDetails: transportDetailsWithNames,
        _programNameMap: programsMap,
        _kegiatanNameMap: kegiatanMap,
        _kroNameMap: kroMap,
        _roNameMap: roMap,
        _komponenNameMap: komponenMap,
        _akunNameMap: akunMap,
        _organikNameMap: organikMap,
        _mitraNameMap: mitraMap,
        _pembuatDaftarName: organikMap[data.pembuatDaftar]
      };
      await submitMutation.mutateAsync(submitData);
    } catch (error: any) {
      console.error("Error saving Kuitansi Transport Lokal:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    }
  };
  const kecamatanList = ["Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", "Cingambul", "Talaga", "Banjaran", "Argapura", "Maja", "Majalengka", "Cigasong", "Sukahaji", "Sindang", "Rajagaluh", "Sindangwangi", "Leuwimunding", "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", "Panyingkiran", "Kadipaten", "Kertajati", "Jatitujuh", "Ligung", "Sumberjaya"];
  return <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">Kuitansi Transport Lokal</h1>
          <p className="text-sm text-muted-foreground">Formulir Kuitansi Transport Lokal</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  <FormField control={form.control} name="tujuanPelaksanaan" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Tujuan Pelaksanaan / Kegiatan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Masukkan tujuan pelaksanaan / kegiatan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                  {/* Nomor Surat Tugas dan Tanggal Surat Tugas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="nomorSuratTugas" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Nomor Surat Tugas</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan nomor surat tugas" maxLength={50} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                    <FormField control={form.control} name="tanggalSuratTugas" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Tanggal Surat Tugas</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP", {
                              locale: idLocale
                            }) : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => false} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Program */}
                    <FormField control={form.control} name="program" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Program</FormLabel>
                        <Select onValueChange={value => {
                      field.onChange(value);
                      form.setValue("kegiatan", "");
                      form.setValue("kro", "");
                      form.setValue("ro", "");
                    }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {programs.map(program => <SelectItem key={program.id} value={program.id}>
                                {program.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                    {/* Kegiatan */}
                    <FormField control={form.control} name="kegiatan" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Kegiatan</FormLabel>
                        <Select onValueChange={value => {
                      field.onChange(value);
                      form.setValue("kro", "");
                      form.setValue("ro", "");
                    }} defaultValue={field.value} disabled={!form.watch("program")}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kegiatan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kegiatanList.map(item => <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                    {/* KRO */}
                    <FormField control={form.control} name="kro" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>KRO</FormLabel>
                        <Select onValueChange={value => {
                      field.onChange(value);
                      form.setValue("ro", "");
                    }} defaultValue={field.value} disabled={!form.watch("kegiatan")}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih KRO" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kroList.map(item => <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                    {/* RO */}
                    <FormField control={form.control} name="ro" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>RO</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch("kro")}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih RO" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roList.map(item => <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                    {/* Komponen */}
                    <FormField control={form.control} name="komponen" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Komponen</FormLabel>
                        <KomponenSelect value={field.value} onChange={field.onChange} placeholder="Pilih komponen" />
                        <FormMessage />
                      </FormItem>} />

                    {/* Akun */}
                    <FormField control={form.control} name="akun" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Akun</FormLabel>
                        <FormControl>
                          <AkunSelect value={field.value} onChange={field.onChange} placeholder="Pilih akun" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                    {/* Tanggal Pengajuan */}
                    <FormField control={form.control} name="tanggalSpj" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Tanggal Pengajuan</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP", {
                              locale: idLocale
                            }) : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => false} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>} />

                    {/* Pembuat Daftar */}
                    <FormField control={form.control} name="pembuatDaftar" render={({
                    field
                  }) => <FormItem>
                        <FormLabel>Pembuat Daftar</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih pembuat daftar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organikList.map(organik => <SelectItem key={organik.id} value={organik.id}>
                                {organik.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organik BPS Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Organik BPS</h3>
                  <Button type="button" onClick={addOrganik} variant="outline">
                    Tambah Organik
                  </Button>
                </div>
                
                {organikGroups.map((group, groupIndex) => <PersonTransportGroup key={`organik-${groupIndex}-${group.personId}`} personId={group.personId} personName={group.personName} dariKecamatan={group.dariKecamatan} trips={group.trips} type="organik" personList={organikList} kecamatanList={kecamatanList} onUpdatePerson={personId => handleUpdateOrganikPerson(groupIndex, personId)} onUpdateDariKecamatan={kecamatan => handleUpdateOrganikDariKecamatan(groupIndex, kecamatan)} onUpdateTrip={(tripIndex, field, value) => handleUpdateOrganikTrip(groupIndex, tripIndex, field, value)} onAddTrip={() => handleAddOrganikTrip(groupIndex)} onRemoveTrip={tripIndex => handleRemoveOrganikTrip(groupIndex, tripIndex)} onRemovePerson={() => handleRemoveOrganikPerson(groupIndex)} />)}
              </CardContent>
            </Card>

            {/* Mitra Statistik Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Mitra Statistik</h3>
                  <Button type="button" onClick={addMitra} variant="outline">
                    Tambah Mitra
                  </Button>
                </div>
                
                {mitraGroups.map((group, groupIndex) => <PersonTransportGroup key={`mitra-${groupIndex}-${group.personId}`} personId={group.personId} personName={group.personName} dariKecamatan={group.dariKecamatan} trips={group.trips} type="mitra" personList={mitraList} kecamatanList={kecamatanList} onUpdatePerson={personId => handleUpdateMitraPerson(groupIndex, personId)} onUpdateDariKecamatan={kecamatan => handleUpdateMitraDariKecamatan(groupIndex, kecamatan)} onUpdateTrip={(tripIndex, field, value) => handleUpdateMitraTrip(groupIndex, tripIndex, field, value)} onAddTrip={() => handleAddMitraTrip(groupIndex)} onRemoveTrip={tripIndex => handleRemoveMitraTrip(groupIndex, tripIndex)} onRemovePerson={() => handleRemoveMitraPerson(groupIndex)} />)}
              </CardContent>
            </Card>

            {/* Total Section */}
            <Card>
              <CardContent className="p-6">
                 <div className="text-right">
                   <h3 className="text-lg font-semibold text-bps-orange">
                     Total Keseluruhan: Rp {grandTotal.toLocaleString("id-ID")}
                   </h3>
                 </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/buat-dokumen")}>
                Batal
              </Button>
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>;
};
export default KuitansiTransportLokal;