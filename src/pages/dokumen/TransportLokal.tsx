import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { CalendarIcon, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { KomponenSelect } from "@/components/KomponenSelect";
import { FormSelect } from "@/components/FormSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
  detil: z.string().optional(),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalSpj: z.date({
    required_error: "Tanggal harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  transportDetails: z.array(z.object({
    type: z.enum(["organik", "mitra"]),
    personId: z.string().min(1, "Nama harus dipilih"),
    kecamatan: z.string().min(1, "Kecamatan harus dipilih"),
    rate: z.string().regex(/^\d+$/, "Rate harus berupa angka"),
    tanggalPelaksanaan: z.date({
      required_error: "Tanggal pelaksanaan harus dipilih"
    }),
    nama: z.string().optional()
  })).min(1, "Minimal harus ada 1 peserta")
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  namaKegiatan: "",
  detil: "",
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

const TransportLokal = () => {
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
    documentType: "TransportLokal",
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
        kecamatan: "",
        rate: "0",
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
        kecamatan: "",
        rate: "0",
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
      console.error("Error saving SPJ Transport Lokal:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    }
  };

  // Calculate grand total transport
  const calculateGrandTotal = () => {
    const organikTotal = transportOrganik.reduce((sum, item) => sum + (parseInt(item.rate) || 0), 0);
    const mitraTotal = transportMitra.reduce((sum, item) => sum + (parseInt(item.rate) || 0), 0);
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
          <h1 className="text-2xl font-bold text-orange-600">SPJ Transport Lokal</h1>
          <p className="text-sm text-muted-foreground">Formulir Surat Pertanggungjawaban Transport Lokal Kegiatan</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nama Kegiatan */}
                  <FormField control={form.control} name="namaKegiatan" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nama Kegiatan (cth: Transport Lokal Pendataan Petugas Potensi Desa Tahun 2025)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Masukkan nama kegiatan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {/* Detil */}
                  <FormField control={form.control} name="detil" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Detil (cth: Potensi Desa 2025)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Masukkan detil kegiatan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

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
                              {akun.name} ({akun.code})
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
                              {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
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
              </CardContent>
            </Card>

            {/* Organik Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Transport Lokal Organik BPS</h2>
                  <Button type="button" onClick={addOrganik} className="bg-teal-700 hover:bg-teal-600">
                    Tambah Organik
                  </Button>
                </div>

                {transportOrganik.map((transport, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-4">
                    <div className="flex justify-between">
                      <h3 className="font-medium">Organik BPS - {index + 1}</h3>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeTransportDetail("organik", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <FormSelect
                          placeholder="Pilih Organik BPS"
                          options={organikList.map(organik => ({
                            value: organik.id,
                            label: organik.name
                          }))}
                          value={transport.personId}
                          onChange={value => updateTransportDetail("organik", index, "personId", value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kecamatan Tujuan</Label>
                        <Select
                          value={transport.kecamatan}
                          onValueChange={value => updateTransportDetail("organik", index, "kecamatan", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Kecamatan" />
                          </SelectTrigger>
                          <SelectContent>
                            {kecamatanList.map(kec => (
                              <SelectItem key={kec} value={kec}>
                                {kec}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                       <div className="space-y-2">
                         <Label>Rate (Rp)</Label>
                         <Input
                           type="text"
                           pattern="[0-9]*"
                           value={transport.rate}
                           onChange={e => {
                             const value = e.target.value.replace(/\D/g, '');
                             updateTransportDetail("organik", index, "rate", value);
                           }}
                           placeholder="0"
                         />
                       </div>
                      <div className="space-y-2">
                        <Label>Tanggal Pelaksanaan</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !transport.tanggalPelaksanaan && "text-muted-foreground"
                              )}
                            >
                              {transport.tanggalPelaksanaan ? (
                                format(transport.tanggalPelaksanaan, "PPP")
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={transport.tanggalPelaksanaan}
                              onSelect={date => updateTransportDetail("organik", index, "tanggalPelaksanaan", date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                ))}

                {transportOrganik.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada data Transport Lokal organik. Klik tombol "Tambah Organik" untuk menambahkan.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Mitra Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Transport Lokal Mitra Statistik</h2>
                  <Button type="button" onClick={addMitra} className="bg-teal-700 hover:bg-teal-600">
                    Tambah Mitra
                  </Button>
                </div>

                {transportMitra.map((transport, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-4">
                    <div className="flex justify-between">
                      <h3 className="font-medium">Mitra Statistik - {index + 1}</h3>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeTransportDetail("mitra", index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <FormSelect
                          placeholder="Pilih Mitra Statistik"
                          options={mitraList.map(mitra => ({
                            value: mitra.id,
                            label: `${mitra.name}${mitra.kecamatan ? ` - ${mitra.kecamatan}` : ''}`
                          }))}
                          value={transport.personId}
                          onChange={value => updateTransportDetail("mitra", index, "personId", value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kecamatan Tujuan</Label>
                        <Select
                          value={transport.kecamatan}
                          onValueChange={value => updateTransportDetail("mitra", index, "kecamatan", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Kecamatan" />
                          </SelectTrigger>
                          <SelectContent>
                            {kecamatanList.map(kec => (
                              <SelectItem key={kec} value={kec}>
                                {kec}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                       <div className="space-y-2">
                         <Label>Rate (Rp)</Label>
                         <Input
                           type="text"
                           pattern="[0-9]*"
                           value={transport.rate}
                           onChange={e => {
                             const value = e.target.value.replace(/\D/g, '');
                             updateTransportDetail("mitra", index, "rate", value);
                           }}
                           placeholder="0"
                         />
                       </div>
                      <div className="space-y-2">
                        <Label>Tanggal Pelaksanaan</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !transport.tanggalPelaksanaan && "text-muted-foreground"
                              )}
                            >
                              {transport.tanggalPelaksanaan ? (
                                format(transport.tanggalPelaksanaan, "PPP")
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={transport.tanggalPelaksanaan}
                              onSelect={date => updateTransportDetail("mitra", index, "tanggalPelaksanaan", date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                ))}

                {transportMitra.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada data Transport Lokal mitra. Klik tombol "Tambah Mitra" untuk menambahkan.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Grand Total */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Total Keseluruhan (Rp)</Label>
                    <Input 
                      value={calculateGrandTotal().toLocaleString('id-ID')} 
                      readOnly 
                      className="font-bold text-lg" 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending} 
                    className="w-full bg-teal-700 hover:bg-teal-600"
                  >
                    {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate("/buat-dokumen")}
                  >
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default TransportLokal;
