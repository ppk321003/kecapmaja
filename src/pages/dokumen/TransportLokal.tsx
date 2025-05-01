
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TransportLokalData, TransportItem, KECAMATAN_MAJALENGKA } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  usePrograms, 
  useKegiatan, 
  useKRO, 
  useRO, 
  useKomponen, 
  useAkun,
  useOrganikBPS,
  useMitraStatistik
} from "@/hooks/use-database";

const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  detail: z.string().min(1, "Detail wajib diisi"),
  jenis: z.enum(["Pendataan", "Pemeriksaan", "Supervisi"], {
    required_error: "Jenis wajib dipilih",
  }),
  program: z.string().min(1, "Program wajib dipilih"),
  kegiatan: z.string().min(1, "Kegiatan wajib dipilih"),
  kro: z.string().min(1, "KRO wajib dipilih"),
  ro: z.string().min(1, "RO wajib dipilih"),
  komponen: z.string().min(1, "Komponen wajib dipilih"),
  akun: z.string().min(1, "Akun wajib dipilih"),
  tanggalPengajuan: z.string().min(1, "Tanggal pengajuan wajib diisi"),
  pembuatDaftar: z.string().min(1, "Pembuat daftar wajib diisi"),
  organikBPS: z.array(z.string()).optional(),
  mitraStatistik: z.array(z.string()).optional(),
  daftarTransport: z.array(
    z.object({
      nama: z.string().min(1, "Nama wajib diisi"),
      jenisPetugas: z.enum(["Organik BPS", "Mitra Statistik"]),
      banyaknya: z.number().min(1, "Banyaknya wajib diisi"),
      kecamatanTujuan: z.array(z.string()).min(1, "Minimal 1 kecamatan"),
      rateTranslok: z.array(z.number()).min(1, "Rate translok wajib diisi"),
      jumlah: z.number().optional(),
    })
  ).optional(),
});

const TransportLokal = () => {
  const navigate = useNavigate();
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  const [selectedPetugas, setSelectedPetugas] = useState<{id: string, name: string, jenis: "Organik BPS" | "Mitra Statistik"}[]>([]);
  
  // Fetching data from database
  const { data: programs = [] } = usePrograms();
  const { data: organikBPS = [] } = useOrganikBPS();
  const { data: mitraStatistik = [] } = useMitraStatistik();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      namaKegiatan: "",
      detail: "",
      jenis: "Pendataan",
      program: "",
      kegiatan: "",
      kro: "",
      ro: "",
      komponen: "",
      akun: "",
      tanggalPengajuan: format(new Date(), "yyyy-MM-dd"),
      pembuatDaftar: "",
      organikBPS: [],
      mitraStatistik: [],
      daftarTransport: [],
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "daftarTransport",
  });
  
  // Dependent dropdowns
  const { data: kegiatanList = [] } = useKegiatan(
    form.watch("program") || null
  );
  const { data: kroList = [] } = useKRO(
    form.watch("kegiatan") || null
  );
  const { data: roList = [] } = useRO(
    form.watch("kro") || null
  );
  const { data: komponenList = [] } = useKomponen(
    form.watch("ro") || null
  );
  const { data: akunList = [] } = useAkun();
  
  // Update transport items when Organik or Mitra selection changes
  useEffect(() => {
    // Build the list of selected petugas
    const petugasList: {id: string, name: string, jenis: "Organik BPS" | "Mitra Statistik"}[] = [];
    
    // Add selected organik
    selectedOrganik.forEach(id => {
      const organik = organikBPS.find(org => org.id === id);
      if (organik) {
        petugasList.push({
          id: organik.id,
          name: organik.name,
          jenis: "Organik BPS"
        });
      }
    });
    
    // Add selected mitra
    selectedMitra.forEach(id => {
      const mitra = mitraStatistik.find(m => m.id === id);
      if (mitra) {
        petugasList.push({
          id: mitra.id,
          name: mitra.name,
          jenis: "Mitra Statistik"
        });
      }
    });
    
    setSelectedPetugas(petugasList);
    
    // Update transport items
    const newTransportItems = petugasList.map(petugas => ({
      nama: petugas.name,
      jenisPetugas: petugas.jenis,
      banyaknya: 1,
      kecamatanTujuan: [] as string[],
      rateTranslok: [] as number[],
      jumlah: 0
    }));
    
    replace(newTransportItems as any);
    
  }, [selectedOrganik, selectedMitra, organikBPS, mitraStatistik, replace]);
  
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Calculate jumlah for each item
    const updatedDaftarTransport = (values.daftarTransport || []).map((item) => {
      const totalRate = (item.rateTranslok || []).reduce((sum, rate) => sum + rate, 0);
      return {
        nama: item.nama,
        jenisPetugas: item.jenisPetugas,
        banyaknya: item.banyaknya,
        kecamatanTujuan: item.kecamatanTujuan,
        rateTranslok: item.rateTranslok,
        jumlah: item.banyaknya * totalRate,
      };
    });
    
    const formData: TransportLokalData = {
      namaKegiatan: values.namaKegiatan,
      detail: values.detail,
      jenis: values.jenis,
      program: values.program,
      kegiatan: values.kegiatan,
      kro: values.kro,
      ro: values.ro,
      komponen: values.komponen,
      akun: values.akun,
      tanggalPengajuan: values.tanggalPengajuan,
      pembuatDaftar: values.pembuatDaftar,
      organikBPS: values.organikBPS || [],
      mitraStatistik: values.mitraStatistik || [],
      daftarTransport: updatedDaftarTransport,
    };
    
    console.log("Form Data:", formData);
    toast.success("Data berhasil disimpan!");
  };
  
  const toggleOrganik = (id: string) => {
    setSelectedOrganik((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
    
    const organikValues = form.getValues("organikBPS") || [];
    if (organikValues.includes(id)) {
      form.setValue(
        "organikBPS",
        organikValues.filter((item) => item !== id)
      );
    } else {
      form.setValue("organikBPS", [...organikValues, id]);
    }
  };
  
  const toggleMitra = (id: string) => {
    setSelectedMitra((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
    
    const mitraValues = form.getValues("mitraStatistik") || [];
    if (mitraValues.includes(id)) {
      form.setValue(
        "mitraStatistik",
        mitraValues.filter((item) => item !== id)
      );
    } else {
      form.setValue("mitraStatistik", [...mitraValues, id]);
    }
  };
  
  const handleRateChange = (index: number, kecIndex: number, value: string) => {
    const rates = form.getValues(`daftarTransport.${index}.rateTranslok`) || [];
    const newRates = [...rates];
    newRates[kecIndex] = parseFloat(value) || 0;
    form.setValue(`daftarTransport.${index}.rateTranslok`, newRates);
  };
  
  // Calculate total for all items
  const calculateTotal = () => {
    const daftar = form.getValues("daftarTransport") || [];
    let total = 0;
    
    daftar.forEach((item) => {
      const itemRates = item.rateTranslok || [];
      const itemTotal = item.banyaknya * itemRates.reduce((sum, rate) => sum + rate, 0);
      total += itemTotal;
    });
    
    return total;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transport Lokal</h1>
            <p className="text-sm text-muted-foreground">
              Transport Lokal (Pendataan, Pemeriksaan, Supervisi)
            </p>
          </div>
          <div className="hidden md:block">
            <img 
              src="/lovable-uploads/1ef78670-6d2c-4f64-8c6e-149d6b9d2d19.png" 
              alt="Kecap Maja Logo" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Transport Lokal</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Kegiatan */}
                  <FormField
                    control={form.control}
                    name="namaKegiatan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Kegiatan</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nama kegiatan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Detail */}
                  <FormField
                    control={form.control}
                    name="detail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detail</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan detail kegiatan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Jenis */}
                  <FormField
                    control={form.control}
                    name="jenis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pendataan">Pendataan</SelectItem>
                            <SelectItem value="Pemeriksaan">Pemeriksaan</SelectItem>
                            <SelectItem value="Supervisi">Supervisi</SelectItem>
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields
                            form.setValue("kegiatan", "");
                            form.setValue("kro", "");
                            form.setValue("ro", "");
                            form.setValue("komponen", "");
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {programs.map((program) => (
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields
                            form.setValue("kro", "");
                            form.setValue("ro", "");
                            form.setValue("komponen", "");
                          }}
                          value={field.value}
                          disabled={!form.watch("program")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kegiatan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kegiatanList.map((kegiatan) => (
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
                  
                  {/* KRO */}
                  <FormField
                    control={form.control}
                    name="kro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KRO</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields
                            form.setValue("ro", "");
                            form.setValue("komponen", "");
                          }}
                          value={field.value}
                          disabled={!form.watch("kegiatan")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih KRO" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kroList.map((kro) => (
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
                  
                  {/* RO */}
                  <FormField
                    control={form.control}
                    name="ro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RO</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent field
                            form.setValue("komponen", "");
                          }}
                          value={field.value}
                          disabled={!form.watch("kro")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih RO" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roList.map((ro) => (
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
                  
                  {/* Komponen */}
                  <FormField
                    control={form.control}
                    name="komponen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Komponen</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!form.watch("ro")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih komponen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {komponenList.map((komponen) => (
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
                  
                  {/* Akun */}
                  <FormField
                    control={form.control}
                    name="akun"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Akun</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih akun" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {akunList.map((akun) => (
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
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "dd MMMM yyyy")
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
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) =>
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                              }
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih pembuat daftar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organikBPS.map((organik) => (
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
                </div>
                
                {/* Summary Table - MOVED UP as requested */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Ringkasan</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Banyaknya</TableHead>
                        <TableHead>Kecamatan</TableHead>
                        <TableHead className="text-right">Jumlah (Rp)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const item = form.watch(`daftarTransport.${index}`);
                        const kecamatanList = item?.kecamatanTujuan || [];
                        const rateList = item?.rateTranslok || [];
                        const totalRate = rateList.reduce((sum, rate) => sum + rate, 0);
                        const jumlah = (item?.banyaknya || 0) * totalRate;
                        
                        return (
                          <TableRow key={field.id}>
                            <TableCell>{item?.nama || ""}</TableCell>
                            <TableCell>{item?.banyaknya || 0}</TableCell>
                            <TableCell>
                              <ul className="list-disc pl-5">
                                {kecamatanList.map((kec, i) => (
                                  <li key={kec}>
                                    {kec} (Rp {rateList[i]?.toLocaleString() || "0"})
                                  </li>
                                ))}
                              </ul>
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {jumlah.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={3} className="font-bold text-right">
                          Total
                        </TableCell>
                        <TableCell className="font-bold text-right">
                          Rp {calculateTotal().toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Transport Items */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Daftar Transport</h3>
                  
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`daftarTransport.${index}.nama`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nama</FormLabel>
                              <FormControl>
                                <Input placeholder="Nama" {...field} disabled />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`daftarTransport.${index}.banyaknya`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banyaknya</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Banyaknya" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`daftarTransport.${index}.kecamatanTujuan`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Kecamatan Tujuan</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  const currentValues = field.value || [];
                                  // Add if not exists
                                  if (!currentValues.includes(value)) {
                                    const newValues = [...currentValues, value];
                                    field.onChange(newValues);
                                    
                                    // Add rate for new kecamatan
                                    const currentRates = form.getValues(`daftarTransport.${index}.rateTranslok`) || [];
                                    form.setValue(`daftarTransport.${index}.rateTranslok`, [...currentRates, 0]);
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih kecamatan" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {KECAMATAN_MAJALENGKA.map((kecamatan) => (
                                    <SelectItem 
                                      key={kecamatan} 
                                      value={kecamatan}
                                      disabled={(field.value || []).includes(kecamatan)}
                                    >
                                      {kecamatan}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Selected Kecamatan with Rate */}
                      {(form.watch(`daftarTransport.${index}.kecamatanTujuan`) || []).length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Rate Translok per Kecamatan</h4>
                          <div className="space-y-2">
                            {(form.watch(`daftarTransport.${index}.kecamatanTujuan`) || []).map((kecamatan, kecIndex) => (
                              <div key={kecamatan} className="flex items-center space-x-2">
                                <div className="flex-grow">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">{kecamatan}</span>
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        // Remove kecamatan
                                        const currentKec = form.getValues(`daftarTransport.${index}.kecamatanTujuan`) || [];
                                        const currentRates = form.getValues(`daftarTransport.${index}.rateTranslok`) || [];
                                        
                                        const newKec = currentKec.filter((_, i) => i !== kecIndex);
                                        const newRates = currentRates.filter((_, i) => i !== kecIndex);
                                        
                                        form.setValue(`daftarTransport.${index}.kecamatanTujuan`, newKec);
                                        form.setValue(`daftarTransport.${index}.rateTranslok`, newRates);
                                      }}
                                    >
                                      <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                  <Input 
                                    type="number" 
                                    placeholder="Rate" 
                                    value={(form.watch(`daftarTransport.${index}.rateTranslok`) || [])[kecIndex] || 0}
                                    onChange={(e) => handleRateChange(index, kecIndex, e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                
                {/* Organik BPS Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Pilih Organik BPS</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {organikBPS.map((organik) => (
                      <div key={organik.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`organik-${organik.id}`}
                          checked={selectedOrganik.includes(organik.id)}
                          onCheckedChange={() => toggleOrganik(organik.id)}
                        />
                        <label
                          htmlFor={`organik-${organik.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {organik.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Mitra Statistik Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Pilih Mitra Statistik</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {mitraStatistik.map((mitra) => (
                      <div key={mitra.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mitra-${mitra.id}`}
                          checked={selectedMitra.includes(mitra.id)}
                          onCheckedChange={() => toggleMitra(mitra.id)}
                        />
                        <label
                          htmlFor={`mitra-${mitra.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {mitra.name}
                          {mitra.kecamatan && <span className="text-xs text-muted-foreground ml-1">({mitra.kecamatan})</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/buat-dokumen")}
                  >
                    Kembali
                  </Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TransportLokal;
