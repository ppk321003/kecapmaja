import React, { useState, useEffect } from "react";
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
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

const formSchema = z.object({
  tujuanPelaksanaan: z.string().min(1, "Tujuan pelaksanaan harus diisi"),
  nomorSuratTugas: z.string().max(20, "Nomor surat tugas maksimal 20 karakter"),
  tanggalSuratTugas: z.date({required_error: "Tanggal surat tugas harus dipilih"}),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalSpj: z.date({
    required_error: "Tanggal SPJ harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  transportDetails: z.array(z.object({
    type: z.enum(["organik", "mitra"]),
    personId: z.string().min(1, "Nama harus dipilih"),
    dariKecamatan: z.string().min(1, "Dari kecamatan harus dipilih"),
    kecamatanTujuan: z.string().min(1, "Kecamatan tujuan harus dipilih"),
    rate: z.number().min(0, "Rate harus diisi"),
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
  tanggalSuratTugas: undefined
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
  const [transportOrganik, setTransportOrganik] = useState<any[]>([]);
  const [transportMitra, setTransportMitra] = useState<any[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Data queries
  const { data: programs = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(form.watch("program") || null);
  const { data: kroList = [] } = useKRO(form.watch("kegiatan") || null);
  const { data: roList = [] } = useRO(form.watch("kro") || null);
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  // Create name-to-object mappings for display purposes
  const programsMap = Object.fromEntries((programs || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));

  // Setup submission to Google Sheets
  const submitMutation = useSubmitToSheets({
    documentType: "KuitansiTransportLokal",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // Combine transportDetails for form submission
  useEffect(() => {
    const combined = [...transportOrganik, ...transportMitra];
    form.setValue("transportDetails", combined);
  }, [transportOrganik, transportMitra, form]);

  // Add organik handler
  const addOrganik = () => {
    if (organikList.length > 0) {
      setTransportOrganik([...transportOrganik, {
        type: "organik",
        personId: "",
        dariKecamatan: "Majalengka",
        kecamatanTujuan: "",
        rate: 0,
        tanggalPelaksanaan: null,
        nama: ""
      }]);
    }
  };

  // Add mitra handler
  const addMitra = () => {
    if (mitraList.length > 0) {
      setTransportMitra([...transportMitra, {
        type: "mitra",
        personId: "",
        dariKecamatan: "Majalengka",
        kecamatanTujuan: "",
        rate: 0,
        tanggalPelaksanaan: null,
        nama: ""
      }]);
    }
  };

  // Update transport detail value
  const updateTransportDetail = (type: "organik" | "mitra", index: number, field: string, value: any) => {
    if (type === "organik") {
      const updated = [...transportOrganik];
      
      // Jika mengupdate personId, kita juga update nama
      if (field === "personId") {
        const selectedPerson = organikList.find(p => p.id === value);
        updated[index] = {
          ...updated[index],
          personId: value,
          nama: selectedPerson?.name || ""
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        };
      }
      
      setTransportOrganik(updated);
    } else {
      const updated = [...transportMitra];
      
      // Jika mengupdate personId, kita juga update nama
      if (field === "personId") {
        const selectedPerson = mitraList.find(p => p.id === value);
        updated[index] = {
          ...updated[index],
          personId: value,
          nama: selectedPerson?.name || ""
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        };
      }
      
      setTransportMitra(updated);
    }
  };

  // Remove transport detail
  const removeTransportDetail = (type: "organik" | "mitra", index: number) => {
    if (type === "organik") {
      const updated = [...transportOrganik];
      updated.splice(index, 1);
      setTransportOrganik(updated);
    } else {
      const updated = [...transportMitra];
      updated.splice(index, 1);
      setTransportMitra(updated);
    }
  };

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

  // Calculate grand total transport
  const calculateGrandTotal = () => {
    const organikTotal = transportOrganik.reduce((sum, item) => sum + (item.rate || 0), 0);
    const mitraTotal = transportMitra.reduce((sum, item) => sum + (item.rate || 0), 0);
    return organikTotal + mitraTotal;
  };

  const kecamatanList = [
    "Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", 
    "Cingambul", "Talaga", "Banjaran", "Argapura", 
    "Maja", "Majalengka", "Cigasong", "Sukahaji", 
    "Sindang", "Rajagaluh", "Sindangwangi", "Leuwimunding", 
    "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", 
    "Panyingkiran", "Kadipaten", "Kertajati", "Jatitujuh", 
    "Ligung", "Sumberjaya"
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
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Tujuan Pelaksanaan */}
                  <FormField control={form.control} name="tujuanPelaksanaan" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tujuan Pelaksanaan / Kegiatan</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder={`Contoh penulisan:
• Pengawasan lapangan pendataan Sakernas Agustus 2025
• Pendataan lapangan Kerangka Sampel Area (KSA) Padi
• Briefing Petugas Survei Industri Mikro Kecil (VIMK) Tahunan Tahun 2025
• Rapat Evaluasi Susenas Maret 2025`}
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {/* Nomor Surat Tugas */}
                  <FormField control={form.control} name="nomorSuratTugas" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Surat Tugas</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Masukkan nomor surat tugas"
                          maxLength={20} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                {/* Tanggal Surat Tugas */}
                  <FormField control={form.control} name="tanggalSuratTugas" render={({ field }) => (
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
                              {field.value ? format(field.value, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
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
                  )} />
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Program */}
                    <FormField control={form.control} name="program" render={({ field }) => (
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
                            {programs.map(program => (
                              <SelectItem key={program.id} value={program.id}>
                                {program.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Kegiatan */}
                    <FormField control={form.control} name="kegiatan" render={({ field }) => (
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
                    )} />

                    {/* KRO */}
                    <FormField control={form.control} name="kro" render={({ field }) => (
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
                    )} />

                    {/* RO */}
                    <FormField control={form.control} name="ro" render={({ field }) => (
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
                    )} />

                    {/* Komponen */}
                    <FormField control={form.control} name="komponen" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Komponen</FormLabel>
                        <KomponenSelect value={field.value} onChange={field.onChange} placeholder="Pilih komponen" />
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Akun */}
                    <FormField control={form.control} name="akun" render={({ field }) => (
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
                                {akun.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Tanggal SPJ */}
                    <FormField control={form.control} name="tanggalSpj" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal (SPJ)</FormLabel>
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
                                {field.value ? format(field.value, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Pembuat Daftar */}
                    <FormField control={form.control} name="pembuatDaftar" render={({ field }) => (
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
                    )} />
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
                
                {transportOrganik.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium">Organik BPS #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTransportDetail("organik", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Nama Organik */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nama</label>
                        <Select
                          value={item.personId}
                          onValueChange={(value) => updateTransportDetail("organik", index, "personId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih nama" />
                          </SelectTrigger>
                          <SelectContent>
                            {organikList.map(organik => (
                              <SelectItem key={organik.id} value={organik.id}>
                                {organik.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dari Kecamatan */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dari Kecamatan</label>
                        <Select
                          value={item.dariKecamatan}
                          onValueChange={(value) => updateTransportDetail("organik", index, "dariKecamatan", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
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

                      {/* Kecamatan Tujuan */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Kecamatan Tujuan</label>
                        <Select
                          value={item.kecamatanTujuan}
                          onValueChange={(value) => updateTransportDetail("organik", index, "kecamatanTujuan", value)}
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

                      {/* Rate */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rate (Rp)</label>
                        <Input
                          type="number"
                          min="0"
                          value={item.rate || ""}
                          onChange={(e) => updateTransportDetail("organik", index, "rate", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      {/* Tanggal Pelaksanaan */}
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Tanggal Pelaksanaan</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !item.tanggalPelaksanaan && "text-muted-foreground"
                              )}
                            >
                              {item.tanggalPelaksanaan ? format(item.tanggalPelaksanaan, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={item.tanggalPelaksanaan}
                              onSelect={(date) => updateTransportDetail("organik", index, "tanggalPelaksanaan", date)}
                              disabled={(date) => false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                ))}
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
                
                {transportMitra.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium">Mitra Statistik #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTransportDetail("mitra", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Nama Mitra */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nama</label>
                        <Select
                          value={item.personId}
                          onValueChange={(value) => updateTransportDetail("mitra", index, "personId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih nama" />
                          </SelectTrigger>
                          <SelectContent>
                            {mitraList.map(mitra => (
                              <SelectItem key={mitra.id} value={mitra.id}>
                                {mitra.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dari Kecamatan */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dari Kecamatan</label>
                        <Select
                          value={item.dariKecamatan}
                          onValueChange={(value) => updateTransportDetail("mitra", index, "dariKecamatan", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
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

                      {/* Kecamatan Tujuan */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Kecamatan Tujuan</label>
                        <Select
                          value={item.kecamatanTujuan}
                          onValueChange={(value) => updateTransportDetail("mitra", index, "kecamatanTujuan", value)}
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

                      {/* Rate */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rate (Rp)</label>
                        <Input
                          type="number"
                          min="0"
                          value={item.rate || ""}
                          onChange={(e) => updateTransportDetail("mitra", index, "rate", parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      {/* Tanggal Pelaksanaan */}
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium">Tanggal Pelaksanaan</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !item.tanggalPelaksanaan && "text-muted-foreground"
                              )}
                            >
                              {item.tanggalPelaksanaan ? format(item.tanggalPelaksanaan, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={item.tanggalPelaksanaan}
                              onSelect={(date) => updateTransportDetail("mitra", index, "tanggalPelaksanaan", date)}
                              disabled={(date) => false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Total Section */}
            <Card>
              <CardContent className="p-6">
                <div className="text-right">
                  <h3 className="text-lg font-semibold">
                    Total Keseluruhan: Rp {calculateGrandTotal().toLocaleString("id-ID")}
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
    </Layout>
  );
};

export default KuitansiTransportLokal;