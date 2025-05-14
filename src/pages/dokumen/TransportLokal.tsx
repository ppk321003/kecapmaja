import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";

// Components
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { KomponenSelect } from "@/components/KomponenSelect";

// Hooks and Utilities
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useJenis, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { toast } from "@/hooks/use-toast";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

// Types
interface TransportDetail {
  id: string;
  type: 'organik' | 'mitra';
  personId: string;
  name: string;
  banyaknya: number;
  kecamatanTujuan: string[];
  rateTranslok: number[];
  jumlah: number;
}

// Form Schema
const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
  detil: z.string().optional(),
  jenis: z.string().min(1, "Jenis harus dipilih"),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalPengajuan: z.date({
    required_error: "Tanggal pengajuan harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih")
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = {
  namaKegiatan: "",
  detil: "",
  jenis: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalPengajuan: new Date(),
  pembuatDaftar: ""
};

const kecamatanOptions = [
  "Jatiwangi", 
  "Kasokandel", 
  "Ligung", 
  "Sumberjaya", 
  "Dawuan", 
  "Panyingkiran", 
  "Leuwimunding"
];

const TransportLokal = () => {
  const navigate = useNavigate();
  const [transportDetails, setTransportDetails] = useState<TransportDetail[]>([]);
  const [availableOrganik, setAvailableOrganik] = useState<any[]>([]);
  const [availableMitra, setAvailableMitra] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES
  });

  // Data fetching hooks
  const { data: jenisList = [] } = useJenis();
  const { data: programList = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(form.watch("program") || null);
  const { data: kroList = [] } = useKRO(form.watch("kegiatan") || null);
  const { data: roList = [] } = useRO(form.watch("kro") || null);
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [], isLoading: organikLoading } = useOrganikBPS();
  const { data: mitraList = [], isLoading: mitraLoading } = useMitraStatistik();

  // Create name-to-object mappings
  const programsMap = Object.fromEntries((programList || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, item.name]));
  const jenisMap = Object.fromEntries((jenisList || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));

  // Update available organik and mitra lists
  useEffect(() => {
    if (!organikLoading) {
      setAvailableOrganik(organikList.map(org => ({
        id: org.id,
        name: org.name,
        type: 'organik'
      })));
    }
  }, [organikList, organikLoading]);

  useEffect(() => {
    if (!mitraLoading) {
      setAvailableMitra(mitraList.map(mitra => ({
        id: mitra.id,
        name: mitra.name,
        kecamatan: mitra.kecamatan,
        type: 'mitra'
      })));
    }
  }, [mitraList, mitraLoading]);

  const submitMutation = useSubmitToSheets({
    documentType: "TransportLokal",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // Handler functions
  const addTransportDetail = (type: 'organik' | 'mitra', personId: string) => {
    const personList = type === 'organik' ? organikList : mitraList;
    const person = personList.find(p => p.id === personId);
    if (!person) return;

    const existing = transportDetails.find(detail => detail.personId === personId && detail.type === type);
    if (existing) {
      toast({
        title: "Info",
        description: `${person.name} sudah ada dalam daftar`
      });
      return;
    }

    const newDetail: TransportDetail = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      personId,
      name: person.name,
      banyaknya: 0,
      kecamatanTujuan: [],
      rateTranslok: [],
      jumlah: 0
    };
    setTransportDetails(prev => [...prev, newDetail]);
  };

  const removeTransportDetail = (id: string) => {
    setTransportDetails(prev => prev.filter(detail => detail.id !== id));
  };

  const handleTransportItemChange = (id: string, field: string, value: any) => {
    setTransportDetails(prev => prev.map(detail => {
      if (detail.id === id) {
        const updated = { ...detail, [field]: value };

        // Recalculate jumlah if banyaknya or rateTranslok changed
        if (field === "banyaknya" || field === "rateTranslok") {
          let total = 0;
          for (let i = 0; i < updated.rateTranslok.length; i++) {
            total += (updated.banyaknya || 0) * (updated.rateTranslok[i] || 0);
          }
          updated.jumlah = total;
        }
        return updated;
      }
      return detail;
    }));
  };

  const handleKecamatanChange = (detailId: string, kecamatan: string, checked: boolean) => {
    setTransportDetails(prev => prev.map(detail => {
      if (detail.id === detailId) {
        let newKecamatanTujuan = [...detail.kecamatanTujuan];
        let newRateTranslok = [...detail.rateTranslok];

        if (checked) {
          newKecamatanTujuan.push(kecamatan);
          newRateTranslok.push(0);
        } else {
          const index = newKecamatanTujuan.indexOf(kecamatan);
          if (index !== -1) {
            newKecamatanTujuan.splice(index, 1);
            newRateTranslok.splice(index, 1);
          }
        }

        // Recalculate total
        let total = 0;
        for (let i = 0; i < newRateTranslok.length; i++) {
          total += (detail.banyaknya || 0) * (newRateTranslok[i] || 0);
        }

        return {
          ...detail,
          kecamatanTujuan: newKecamatanTujuan,
          rateTranslok: newRateTranslok,
          jumlah: total
        };
      }
      return detail;
    }));
  };

  const handleRateChange = (detailId: string, kecamatanIndex: number, value: string) => {
    const rateValue = Number(value) || 0;
    setTransportDetails(prev => prev.map(detail => {
      if (detail.id === detailId) {
        const newRateTranslok = [...detail.rateTranslok];
        newRateTranslok[kecamatanIndex] = rateValue;

        // Recalculate total
        let total = 0;
        for (let i = 0; i < newRateTranslok.length; i++) {
          total += (detail.banyaknya || 0) * (newRateTranslok[i] || 0);
        }

        return {
          ...detail,
          rateTranslok: newRateTranslok,
          jumlah: total
        };
      }
      return detail;
    }));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (transportDetails.length === 0) {
        toast({
          variant: "destructive",
          title: "Daftar transport kosong",
          description: "Tambahkan minimal satu petugas"
        });
        return;
      }

      // Prepare data for submission
      const organikBPS: string[] = [];
      const mitraStatistik: string[] = [];
      
      transportDetails.forEach(detail => {
        if (detail.type === 'organik') {
          organikBPS.push(detail.personId);
        } else {
          mitraStatistik.push(detail.personId);
        }
      });

      const formData = {
        ...values,
        organikBPS,
        mitraStatistik,
        daftarTransport: transportDetails,
        _programNameMap: programsMap,
        _kegiatanNameMap: kegiatanMap,
        _kroNameMap: kroMap,
        _roNameMap: roMap,
        _komponenNameMap: komponenMap,
        _akunNameMap: akunMap,
        _jenisNameMap: jenisMap,
        _organikNameMap: organikMap,
        _mitraNameMap: mitraMap,
        _pembuatDaftarName: organikMap[values.pembuatDaftar]
      };

      await submitMutation.mutateAsync(formData);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan form"
      });
    }
  };

  // Calculate total amount
  const totalAmount = transportDetails.reduce((sum, detail) => sum + detail.jumlah, 0);

  // Transport Detail Card Component
  const TransportDetailCard = ({ detail }: { detail: TransportDetail }) => (
    <Card className="mb-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium">{detail.name}</h4>
            <p className="text-sm text-muted-foreground">
              {detail.type === 'organik' ? 'Organik BPS' : 'Mitra Statistik'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => removeTransportDetail(detail.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Banyaknya</Label>
            <Input 
              type="number" 
              value={detail.banyaknya} 
              onChange={e => handleTransportItemChange(detail.id, "banyaknya", parseInt(e.target.value, 10) || 0)} 
              placeholder="0" 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Kecamatan Tujuan</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {kecamatanOptions.map(kec => (
              <div key={kec} className="flex items-center space-x-2">
                <Checkbox 
                  id={`kec-${detail.id}-${kec}`} 
                  checked={detail.kecamatanTujuan.includes(kec)} 
                  onCheckedChange={checked => handleKecamatanChange(detail.id, kec, !!checked)} 
                />
                <Label htmlFor={`kec-${detail.id}-${kec}`} className="text-sm">
                  {kec}
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        {detail.kecamatanTujuan.length > 0 && (
          <div className="space-y-3">
            <Label>Rate Transport per Kecamatan (Rp)</Label>
            <div className="space-y-2">
              {detail.kecamatanTujuan.map((kec, kecIndex) => (
                <div key={kecIndex} className="grid grid-cols-2 gap-2 items-center">
                  <Label className="text-sm">{kec}</Label>
                  <Input 
                    type="number" 
                    value={detail.rateTranslok[kecIndex] || 0} 
                    onChange={e => handleRateChange(detail.id, kecIndex, e.target.value)} 
                    placeholder="0" 
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <Label>Jumlah (Rp)</Label>
          <Input 
            value={detail.jumlah.toLocaleString()} 
            disabled 
            className="font-bold bg-gray-50" 
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold">Transport Lokal</h1>
            <p className="text-sm text-muted-foreground">
              Formulir Transport Lokal Kegiatan
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader className="bg-gray-50 px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Informasi Kegiatan</h2>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nama Kegiatan */}
                    <div className="col-span-2">
                      <FormField 
                        control={form.control} 
                        name="namaKegiatan" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Kegiatan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan nama kegiatan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>

                    {/* Detil */}
                    <div className="col-span-2">
                      <FormField 
                        control={form.control} 
                        name="detil" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Detil Kegiatan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan detil kegiatan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>

                    {/* Jenis */}
                    <FormField 
                      control={form.control} 
                      name="jenis" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jenis</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jenisList.map(jenis => (
                                <SelectItem key={jenis.id} value={jenis.id}>
                                  {jenis.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Program */}
                    <FormField 
                      control={form.control} 
                      name="program" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program</FormLabel>
                          <Select 
                            onValueChange={value => {
                              field.onChange(value);
                              form.setValue("kegiatan", "");
                              form.setValue("kro", "");
                              form.setValue("ro", "");
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {programList.map(program => (
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

                    {/* Kegiatan */}
                    <FormField 
                      control={form.control} 
                      name="kegiatan" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kegiatan</FormLabel>
                          <Select 
                            onValueChange={value => {
                              field.onChange(value);
                              form.setValue("kro", "");
                              form.setValue("ro", "");
                            }} 
                            defaultValue={field.value} 
                            disabled={!form.watch("program")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih kegiatan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {kegiatanList.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* KRO */}
                    <FormField 
                      control={form.control} 
                      name="kro" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>KRO</FormLabel>
                          <Select 
                            onValueChange={value => {
                              field.onChange(value);
                              form.setValue("ro", "");
                            }} 
                            defaultValue={field.value} 
                            disabled={!form.watch("kegiatan")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih KRO" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {kroList.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* RO */}
                    <FormField 
                      control={form.control} 
                      name="ro" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RO</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value} 
                            disabled={!form.watch("kro")}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih RO" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roList.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Komponen */}
                    <FormField 
                      control={form.control} 
                      name="komponen" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Komponen</FormLabel>
                          <KomponenSelect 
                            value={field.value} 
                            onChange={field.onChange} 
                            placeholder="Pilih komponen" 
                          />
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Akun */}
                    <FormField 
                      control={form.control} 
                      name="akun" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Akun</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih akun" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {akunList.map(akun => (
                                <SelectItem key={akun.id} value={akun.id}>
                                  {akun.name} ({akun.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />

                    {/* Tanggal Pengajuan */}
                    <FormField 
                      control={form.control} 
                      name="tanggalPengajuan" 
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
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
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
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

                    {/* Pembuat Daftar */}
                    <FormField 
                      control={form.control} 
                      name="pembuatDaftar" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pembuat Daftar</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih pembuat daftar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {organikList.map(organik => (
                                <SelectItem key={organik.id} value={organik.id}>
                                  {organik.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Transport Details Section */}
              <Card>
                <CardHeader className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h2 className="text-lg font-semibold">Daftar Transport</h2>
                    <div className="w-full md:w-auto">
                      <Select 
                        onValueChange={value => {
                          const [type, id] = value.split('|');
                          addTransportDetail(type as 'organik' | 'mitra', id);
                        }}
                      >
                        <SelectTrigger className="w-full md:w-[250px]">
                          <SelectValue placeholder="Tambah petugas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placeholder" disabled>
                            -- Pilih Petugas --
                          </SelectItem>
                          {availableOrganik.length > 0 && (
                            <>
                              <SelectItem value="header-organik" disabled className="font-bold">
                                Organik BPS
                              </SelectItem>
                              {availableOrganik.map(org => (
                                <SelectItem key={org.id} value={`organik|${org.id}`}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                          {availableMitra.length > 0 && (
                            <>
                              <SelectItem value="header-mitra" disabled className="font-bold">
                                Mitra Statistik
                              </SelectItem>
                              {availableMitra.map(mitra => (
                                <SelectItem key={mitra.id} value={`mitra|${mitra.id}`}>
                                  {mitra.name} {mitra.kecamatan ? `- ${mitra.kecamatan}` : ''}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {transportDetails.length > 0 ? (
                    <div className="space-y-4">
                      {transportDetails.map((detail) => (
                        <TransportDetailCard key={detail.id} detail={detail} />
                      ))}

                      {/* Total amount */}
                      <div className="flex justify-end mt-6">
                        <div className="w-full md:w-1/2 lg:w-1/3 space-y-2">
                          <Label className="text-lg font-semibold">Total (Rp)</Label>
                          <Input 
                            value={totalAmount.toLocaleString()} 
                            disabled 
                            className="text-lg font-bold bg-gray-50" 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Plus className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium">Belum ada data transport</p>
                      <p className="text-sm">Pilih petugas untuk menambahkan data transport</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/buat-dokumen")}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending}
                  className="w-full sm:w-auto bg-teal-800 hover:bg-teal-700"
                >
                  {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default TransportLokal;