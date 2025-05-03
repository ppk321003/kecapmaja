
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useSaveDocument } from "@/hooks/use-database";
import { CalendarIcon } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PerjalananDinas, KECAMATAN_MAJALENGKA } from "@/types";

const formSchema = z.object({
  jenisPerjalanan: z.enum(["luar_kota", "dalam_kota"], {
    required_error: "Jenis perjalanan dinas harus dipilih",
  }),
  nomorSuratTugas: z.string().min(1, "Nomor surat tugas wajib diisi"),
  tanggalSuratTugas: z.date({
    required_error: "Tanggal surat tugas harus diisi",
  }),
  namaPelaksana: z.string().min(1, "Nama pelaksana wajib diisi"),
  tujuanPelaksanaan: z.string().min(1, "Tujuan pelaksanaan wajib diisi"),
  
  // Luar Kota fields
  kabKotaTujuan: z.string().optional(),
  namaTempat: z.string().optional(),
  
  // Dalam Kota fields
  kecamatanTujuan: z.array(z.string()).optional(),
  
  // Common fields
  tanggalBerangkat: z.union([z.date(), z.array(z.date())]),
  tanggalKembali: z.union([z.date(), z.array(z.date())]),
  program: z.string().min(1, "Program wajib diisi"),
  kegiatan: z.string().min(1, "Kegiatan wajib diisi"),
  kro: z.string().min(1, "KRO wajib diisi"),
  ro: z.string().min(1, "RO wajib diisi"),
  komponen: z.string().min(1, "Komponen wajib diisi"),
  akun: z.string().min(1, "Akun wajib diisi"),
  tanggalPengajuan: z.date({
    required_error: "Tanggal pengajuan harus diisi",
  }),
  
  // Luar Kota additional fields
  biayaTransport: z.number().optional(),
  biayaBBMTol: z.number().optional(),
  biayaPenginapan: z.number().optional(),
});

const KuitansiPerjalananDinas = () => {
  const { data: programs } = usePrograms();
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const { data: kegiatans } = useKegiatan(selectedProgram);
  const [selectedKegiatan, setSelectedKegiatan] = useState<string | null>(null);
  const { data: kros } = useKRO(selectedKegiatan);
  const [selectedKRO, setSelectedKRO] = useState<string | null>(null);
  const { data: ros } = useRO(selectedKRO);
  const [selectedRO, setSelectedRO] = useState<string | null>(null);
  // Fix: Call useKomponen without arguments
  const { data: komponens } = useKomponen();
  const { data: akuns } = useAkun();
  const { data: organiks } = useOrganikBPS();
  
  const [selectedKecamatans, setSelectedKecamatans] = useState<string[]>([]);
  const [kecamatanEntries, setKecamatanEntries] = useState<{kecamatan: string, tanggalBerangkat: Date | null, tanggalKembali: Date | null}[]>([
    {kecamatan: "", tanggalBerangkat: null, tanggalKembali: null}
  ]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jenisPerjalanan: "luar_kota",
      nomorSuratTugas: "",
      namaPelaksana: "",
      tujuanPelaksanaan: "",
      program: "",
      kegiatan: "",
      kro: "",
      ro: "",
      komponen: "",
      akun: "",
      kecamatanTujuan: [],
    },
  });
  
  const jenisPerjalanan = form.watch("jenisPerjalanan");
  const { mutateAsync: saveDocument } = useSaveDocument();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const addKecamatanEntry = () => {
    setKecamatanEntries([...kecamatanEntries, {kecamatan: "", tanggalBerangkat: null, tanggalKembali: null}]);
  };
  
  const removeKecamatanEntry = (index: number) => {
    if (kecamatanEntries.length > 1) {
      setKecamatanEntries(kecamatanEntries.filter((_, i) => i !== index));
    }
  };
  
  const updateKecamatanEntry = (index: number, field: keyof typeof kecamatanEntries[0], value: any) => {
    const updatedEntries = [...kecamatanEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setKecamatanEntries(updatedEntries);
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Create the base formData object with required fields
      const formData: PerjalananDinas = {
        jenisPerjalanan: values.jenisPerjalanan,
        nomorSuratTugas: values.nomorSuratTugas,
        namaPelaksana: values.namaPelaksana,
        tujuanPelaksanaan: values.tujuanPelaksanaan,
        program: values.program,
        kegiatan: values.kegiatan,
        kro: values.kro,
        ro: values.ro,
        komponen: values.komponen,
        akun: values.akun,
        tanggalSuratTugas: format(values.tanggalSuratTugas, 'yyyy-MM-dd'),
        tanggalPengajuan: format(values.tanggalPengajuan, 'yyyy-MM-dd'),
        tanggalBerangkat: '', // Will be set below based on jenisPerjalanan
        tanggalKembali: ''    // Will be set below based on jenisPerjalanan
      };
      
      // Handle different date formats based on jenisPerjalanan
      if (values.jenisPerjalanan === 'luar_kota') {
        if (values.kabKotaTujuan) formData.kabKotaTujuan = values.kabKotaTujuan;
        if (values.namaTempat) formData.namaTempat = values.namaTempat;
        if (values.biayaTransport) formData.biayaTransport = values.biayaTransport;
        if (values.biayaBBMTol) formData.biayaBBMTol = values.biayaBBMTol;
        if (values.biayaPenginapan) formData.biayaPenginapan = values.biayaPenginapan;
        
        if (values.tanggalBerangkat instanceof Date) {
          formData.tanggalBerangkat = format(values.tanggalBerangkat, 'yyyy-MM-dd');
        }
        if (values.tanggalKembali instanceof Date) {
          formData.tanggalKembali = format(values.tanggalKembali, 'yyyy-MM-dd');
        }
      }
      
      // For dalam kota, format the kecamatan entries
      if (values.jenisPerjalanan === 'dalam_kota') {
        formData.kecamatanTujuan = kecamatanEntries.map(e => e.kecamatan);
        formData.tanggalBerangkat = kecamatanEntries.map(e => 
          e.tanggalBerangkat ? format(e.tanggalBerangkat, 'yyyy-MM-dd') : ''
        );
        formData.tanggalKembali = kecamatanEntries.map(e => 
          e.tanggalKembali ? format(e.tanggalKembali, 'yyyy-MM-dd') : ''
        );
      }
      
      const result = await saveDocument({
        jenisId: "kuitansi_perjalanan_dinas", 
        title: `Kuitansi Perjalanan Dinas ${values.jenisPerjalanan === 'luar_kota' ? 'Luar Kota' : 'Dalam Kota'} - ${values.namaPelaksana}`,
        data: formData
      });
      
      toast({
        title: "Berhasil!",
        description: "Dokumen Kuitansi Perjalanan Dinas berhasil disimpan.",
      });
      
      form.reset();
      
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        variant: "destructive",
        title: "Gagal!",
        description: "Terjadi kesalahan saat menyimpan dokumen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kuitansi Perjalanan Dinas</h1>
            <p className="text-muted-foreground">
              Formulir pembuatan kuitansi perjalanan dinas
            </p>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Jenis Perjalanan Dinas</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="jenisPerjalanan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Perjalanan Dinas</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset related fields when changing jenis
                            if (value === "dalam_kota") {
                              form.setValue("kabKotaTujuan", undefined);
                              form.setValue("namaTempat", undefined);
                              form.setValue("biayaTransport", undefined);
                              form.setValue("biayaBBMTol", undefined);
                              form.setValue("biayaPenginapan", undefined);
                            } else {
                              form.setValue("kecamatanTujuan", []);
                              // Reset kecamatan entries
                              setKecamatanEntries([{kecamatan: "", tanggalBerangkat: null, tanggalKembali: null}]);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis perjalanan dinas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="luar_kota">Luar Kota</SelectItem>
                            <SelectItem value="dalam_kota">Dalam Kota</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Data Umum</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="nomorSuratTugas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Surat Tugas</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nomor surat tugas" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tanggalSuratTugas"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal Surat Tugas</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    field.value ? "" : "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMMM yyyy")
                                  ) : (
                                    "Pilih tanggal"
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
                                disabled={(date) => date > new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="namaPelaksana"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Pelaksana Perjalanan Dinas</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih pelaksana" />
                            </SelectTrigger>
                            <SelectContent>
                              {organiks?.map((organik) => (
                                <SelectItem key={organik.id} value={organik.name}>
                                  {organik.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tujuanPelaksanaan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tujuan Pelaksanaan Perjalanan Dinas</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Masukkan tujuan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Luar Kota Form */}
              {jenisPerjalanan === "luar_kota" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Perjalanan Luar Kota</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="kabKotaTujuan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kab/Kota Tujuan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan kab/kota tujuan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="namaTempat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Tempat Tujuan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan nama tempat" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="tanggalBerangkat"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Berangkat</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${
                                      field.value ? "" : "text-muted-foreground"
                                    }`}
                                  >
                                    {field.value instanceof Date ? (
                                      format(field.value, "dd MMMM yyyy")
                                    ) : (
                                      "Pilih tanggal"
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value instanceof Date ? field.value : undefined}
                                  onSelect={field.onChange}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="tanggalKembali"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Kembali</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${
                                      field.value ? "" : "text-muted-foreground"
                                    }`}
                                  >
                                    {field.value instanceof Date ? (
                                      format(field.value, "dd MMMM yyyy")
                                    ) : (
                                      "Pilih tanggal"
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value instanceof Date ? field.value : undefined}
                                  onSelect={field.onChange}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Dalam Kota Form - Kecamatan Entries */}
              {jenisPerjalanan === "dalam_kota" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Perjalanan Dalam Kota</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {kecamatanEntries.map((entry, index) => (
                        <div key={index} className="border p-4 rounded-md">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium">Kecamatan {index + 1}</h3>
                            {index > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeKecamatanEntry(index)}
                                className="text-red-500"
                              >
                                Hapus
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`kecamatan-${index}`}>Kecamatan Tujuan</Label>
                              <Select
                                value={entry.kecamatan}
                                onValueChange={(value) => updateKecamatanEntry(index, 'kecamatan', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih kecamatan" />
                                </SelectTrigger>
                                <SelectContent>
                                  {KECAMATAN_MAJALENGKA.map((kecamatan) => (
                                    <SelectItem key={kecamatan} value={kecamatan}>{kecamatan}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`tgl-berangkat-${index}`}>Tanggal Berangkat</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    id={`tgl-berangkat-${index}`}
                                    variant={"outline"}
                                    className="w-full pl-3 text-left font-normal"
                                  >
                                    {entry.tanggalBerangkat ? (
                                      format(entry.tanggalBerangkat, "dd MMMM yyyy")
                                    ) : (
                                      "Pilih tanggal"
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={entry.tanggalBerangkat || undefined}
                                    onSelect={(date) => updateKecamatanEntry(index, 'tanggalBerangkat', date)}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor={`tgl-kembali-${index}`}>Tanggal Kembali</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    id={`tgl-kembali-${index}`}
                                    variant={"outline"}
                                    className="w-full pl-3 text-left font-normal"
                                  >
                                    {entry.tanggalKembali ? (
                                      format(entry.tanggalKembali, "dd MMMM yyyy")
                                    ) : (
                                      "Pilih tanggal"
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={entry.tanggalKembali || undefined}
                                    onSelect={(date) => updateKecamatanEntry(index, 'tanggalKembali', date)}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={addKecamatanEntry}
                      >
                        Tambah Kecamatan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Biaya (Luar Kota Only) */}
              {jenisPerjalanan === "luar_kota" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Biaya Perjalanan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="biayaTransport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biaya Transport Kab/Kota Tujuan (PP)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                placeholder="Masukkan biaya" 
                              />
                            </FormControl>
                            <FormDescription>Kendaraan Umum</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="biayaBBMTol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biaya Pembelian BBM/Tol (PP)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                placeholder="Masukkan biaya" 
                              />
                            </FormControl>
                            <FormDescription>Kendaraan Pribadi/Dinas</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="biayaPenginapan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biaya Penginapan/Hotel</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                placeholder="Masukkan biaya" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Program/Kegiatan/KRO */}
              <Card>
                <CardHeader>
                  <CardTitle>Program/Kegiatan/Akun</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="program"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedProgram(value);
                              // Reset dependent fields
                              setSelectedKegiatan(null);
                              setSelectedKRO(null);
                              setSelectedRO(null);
                              form.setValue("kegiatan", "");
                              form.setValue("kro", "");
                              form.setValue("ro", "");
                              form.setValue("komponen", "");
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih program" />
                            </SelectTrigger>
                            <SelectContent>
                              {programs?.map((program) => (
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
                    
                    <FormField
                      control={form.control}
                      name="kegiatan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kegiatan</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedKegiatan(value);
                              // Reset dependent fields
                              setSelectedKRO(null);
                              setSelectedRO(null);
                              form.setValue("kro", "");
                              form.setValue("ro", "");
                              form.setValue("komponen", "");
                            }}
                          >
                            <SelectTrigger disabled={!selectedProgram}>
                              <SelectValue placeholder="Pilih kegiatan" />
                            </SelectTrigger>
                            <SelectContent>
                              {kegiatans?.map((kegiatan) => (
                                <SelectItem key={kegiatan.id} value={kegiatan.id}>
                                  {kegiatan.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="kro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>KRO</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedKRO(value);
                              // Reset dependent fields
                              setSelectedRO(null);
                              form.setValue("ro", "");
                              form.setValue("komponen", "");
                            }}
                          >
                            <SelectTrigger disabled={!selectedKegiatan}>
                              <SelectValue placeholder="Pilih KRO" />
                            </SelectTrigger>
                            <SelectContent>
                              {kros?.map((kro) => (
                                <SelectItem key={kro.id} value={kro.id}>
                                  {kro.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="ro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RO</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedRO(value);
                              // Reset komponen
                              form.setValue("komponen", "");
                            }}
                          >
                            <SelectTrigger disabled={!selectedKRO}>
                              <SelectValue placeholder="Pilih RO" />
                            </SelectTrigger>
                            <SelectContent>
                              {ros?.map((ro) => (
                                <SelectItem key={ro.id} value={ro.id}>
                                  {ro.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="komponen"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Komponen</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger disabled={!selectedRO}>
                              <SelectValue placeholder="Pilih komponen" />
                            </SelectTrigger>
                            <SelectContent>
                              {komponens?.map((komponen) => (
                                <SelectItem key={komponen.id} value={komponen.id}>
                                  {komponen.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="akun"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Akun</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih akun" />
                            </SelectTrigger>
                            <SelectContent>
                              {akuns?.map((akun) => (
                                <SelectItem key={akun.id} value={akun.id}>
                                  {akun.code} - {akun.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    field.value ? "" : "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMMM yyyy")
                                  ) : (
                                    "Pilih tanggal"
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
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default KuitansiPerjalananDinas;
