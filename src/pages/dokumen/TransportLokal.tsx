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
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik, useJenis } from "@/hooks/use-database";
import { KomponenSelect } from "@/components/KomponenSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

// Daftar kecamatan
const KECAMATAN_LIST = [
  "Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", "Cingambul", 
  "Talaga", "Banjaran", "Argapura", "Maja", "Majalengka", 
  "Cigasong", "Sukahaji", "Sindang", "Rajagaluh", "Sindangwangi", 
  "Leuwimunding", "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", 
  "Panyingkiran", "Kadipaten", "Kertajati", "Jatitujuh", "Ligung", 
  "Sumberjaya"
];

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
  tanggalSpj: z.date({
    required_error: "Tanggal harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  totalKeseluruhan: z.number().min(0),
  honorDetails: z.array(z.object({
    type: z.enum(["organik", "mitra"]),
    personId: z.string(),
    kecamatanTujuan: z.string().min(1, "Kecamatan harus dipilih"),
    rate: z.number().min(0),
    tanggalPelaksanaan: z.date({
      required_error: "Tanggal pelaksanaan harus dipilih"
    }),
    totalHonor: z.number().min(0)
  })).optional()
});

type FormValues = z.infer<typeof formSchema>;

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
  tanggalSpj: null,
  pembuatDaftar: "",
  totalKeseluruhan: 0,
  honorDetails: []
};

const TransportLokal = () => {
  const navigate = useNavigate();
  const [honorOrganik, setHonorOrganik] = useState<any[]>([]);
  const [honorMitra, setHonorMitra] = useState<any[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Data queries
  const {
    data: jenisList = []
  } = useJenis();
  const {
    data: programs = []
  } = usePrograms();
  const {
    data: kegiatanList = []
  } = useKegiatan(form.watch("program") || null);
  const {
    data: kroList = []
  } = useKRO(form.watch("kegiatan") || null);
  const {
    data: roList = []
  } = useRO(form.watch("kro") || null);
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

  // Create name-to-object mappings for display purposes
  const programsMap = Object.fromEntries((programs || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, item.name]));
  const jenisMap = Object.fromEntries((jenisList || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));

  // Setup submission to Google Sheets
  const submitMutation = useSubmitToSheets({
    documentType: "TransportLokal",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // Combine honorDetails for form submission
  useEffect(() => {
    const combined = [...honorOrganik, ...honorMitra];
    const total = combined.reduce((sum, item) => sum + item.totalHonor, 0);
    form.setValue("honorDetails", combined);
    form.setValue("totalKeseluruhan", total);
  }, [honorOrganik, honorMitra, form]);

  // Add organik handler
  const addOrganik = () => {
    if (organikList.length > 0) {
      setHonorOrganik([...honorOrganik, {
        type: "organik",
        personId: "",
        kecamatanTujuan: "",
        rate: 0,
        tanggalPelaksanaan: null,
        totalHonor: 0
      }]);
    }
  };

  // Add mitra handler
  const addMitra = () => {
    if (mitraList.length > 0) {
      setHonorMitra([...honorMitra, {
        type: "mitra",
        personId: "",
        kecamatanTujuan: "",
        rate: 0,
        tanggalPelaksanaan: null,
        totalHonor: 0
      }]);
    }
  };

  // Update honor detail value
  const updateHonorDetail = (type: "organik" | "mitra", index: number, field: string, value: any) => {
    if (type === "organik") {
      const updated = [...honorOrganik];
      updated[index] = {
        ...updated[index],
        [field]: value
      };

      // Auto calculate total honor
      if (field === "rate") {
        updated[index].totalHonor = value;
      }
      setHonorOrganik(updated);
    } else {
      const updated = [...honorMitra];
      updated[index] = {
        ...updated[index],
        [field]: value
      };

      // Auto calculate total honor
      if (field === "rate") {
        updated[index].totalHonor = value;
      }
      setHonorMitra(updated);
    }
  };

  // Remove honor detail
  const removeHonorDetail = (type: "organik" | "mitra", index: number) => {
    if (type === "organik") {
      const updated = [...honorOrganik];
      updated.splice(index, 1);
      setHonorOrganik(updated);
    } else {
      const updated = [...honorMitra];
      updated.splice(index, 1);
      setHonorMitra(updated);
    }
  };

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    try {
      // Validasi tanggal pelaksanaan tidak boleh lebih awal dari tanggal SPJ
      const hasInvalidDate = data.honorDetails?.some(item => 
        item.tanggalPelaksanaan && data.tanggalSpj && 
        item.tanggalPelaksanaan > data.tanggalSpj
      );

      if (hasInvalidDate) {
        toast({
          variant: "destructive",
          title: "Validasi Gagal",
          description: "Tanggal SPJ tidak boleh lebih awal dari tanggal pelaksanaan"
        });
        return;
      }

      // Create a submission object with all the data plus mappings for proper display
      const submitData = {
        ...data,
        _programNameMap: programsMap,
        _kegiatanNameMap: kegiatanMap,
        _kroNameMap: kroMap,
        _roNameMap: roMap,
        _komponenNameMap: komponenMap,
        _akunNameMap: akunMap,
        _jenisNameMap: jenisMap,
        _organikNameMap: organikMap,
        _mitraNameMap: mitraMap,
        _pembuatDaftarName: organikMap[data.pembuatDaftar]
      };
      await submitMutation.mutateAsync(submitData);
    } catch (error: any) {
      console.error("Error saving SPJ Honor:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    }
  };

  return <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">SPJ Honor</h1>
          <p className="text-sm text-muted-foreground">Formulir Surat Pertanggungjawaban Honor Kegiatan</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nama Kegiatan */}
                  <FormField control={form.control} name="namaKegiatan" render={({
                  field
                }) => <FormItem className="col-span-2">
                        <FormLabel>Nama Kegiatan (cth: Honor Pendataan Petugas Potensi Desa Tahun 2025)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan nama kegiatan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  {/* Detil */}
                  <FormField control={form.control} name="detil" render={({
                  field
                }) => <FormItem className="col-span-2">
                        <FormLabel>Detil (cth: Potensi Desa 2025)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan detil kegiatan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  {/* Jenis */}
                  <FormField control={form.control} name="jenis" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Jenis</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {jenisList.map(jenis => <SelectItem key={jenis.id} value={jenis.id}>
                                {jenis.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih akun" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {akunList.map(akun => <SelectItem key={akun.id} value={akun.id}>
                                {akun.name} ({akun.code})
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                  {/* Tanggal SPJ */}
                  <FormField control={form.control} name="tanggalSpj" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Tanggal (SPJ)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
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

                  {/* Total Keseluruhan */}
                  <FormField control={form.control} name="totalKeseluruhan" render={({
                  field
                }) => <FormItem className="col-span-2">
                        <FormLabel>Total Keseluruhan (Rp)</FormLabel>
                        <FormControl>
                          <Input 
                            value={field.value.toLocaleString()} 
                            readOnly 
                            className="font-bold text-lg" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>
              </CardContent>
            </Card>

            {/* Organik Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Honor Organik BPS</h2>
                  <Button type="button" onClick={addOrganik} className="bg-teal-700 hover:bg-teal-600">
                    Tambah Organik
                  </Button>
                </div>

                {honorOrganik.map((honor, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-4">
                    <div className="flex justify-between">
                      <h3 className="font-medium">Organik BPS - {index + 1}</h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeHonorDetail("organik", index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <Select value={honor.personId} onValueChange={value => updateHonorDetail("organik", index, "personId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Organik BPS" />
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
                      <div className="space-y-2">
                        <Label>Kecamatan Tujuan</Label>
                        <Select 
                          value={honor.kecamatanTujuan} 
                          onValueChange={value => updateHonorDetail("organik", index, "kecamatanTujuan", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Kecamatan" />
                          </SelectTrigger>
                          <SelectContent>
                            {KECAMATAN_LIST.map(kec => (
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
                          type="number" 
                          value={honor.rate} 
                          onChange={e => updateHonorDetail("organik", index, "rate", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tanggal Pelaksanaan</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !honor.tanggalPelaksanaan && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {honor.tanggalPelaksanaan ? (
                              format(honor.tanggalPelaksanaan, "PPP")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={honor.tanggalPelaksanaan}
                            onSelect={(date) => updateHonorDetail("organik", index, "tanggalPelaksanaan", date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ))}

                {honorOrganik.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada data honor organik. Klik tombol "Tambah Organik" untuk menambahkan.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Mitra Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Honor Mitra Statistik</h2>
                  <Button type="button" onClick={addMitra} className="bg-teal-700 hover:bg-teal-600">
                    Tambah Mitra
                  </Button>
                </div>

                {honorMitra.map((honor, index) => (
                  <div key={index} className="border p-4 rounded-md space-y-4">
                    <div className="flex justify-between">
                      <h3 className="font-medium">Mitra Statistik - {index + 1}</h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeHonorDetail("mitra", index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <Select value={honor.personId} onValueChange={value => updateHonorDetail("mitra", index, "personId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih mitra" />
                          </SelectTrigger>
                          <SelectContent>
                            {mitraList.map(mitra => (
                              <SelectItem key={mitra.id} value={mitra.id}>
                                {mitra.name} {mitra.kecamatan ? `- ${mitra.kecamatan}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Kecamatan Tujuan</Label>
                        <Select 
                          value={honor.kecamatanTujuan} 
                          onValueChange={value => updateHonorDetail("mitra", index, "kecamatanTujuan", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Kecamatan" />
                          </SelectTrigger>
                          <SelectContent>
                            {KECAMATAN_LIST.map(kec => (
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
                          type="number" 
                          value={honor.rate} 
                          onChange={e => updateHonorDetail("mitra", index, "rate", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tanggal Pelaksanaan</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !honor.tanggalPelaksanaan && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {honor.tanggalPelaksanaan ? (
                              format(honor.tanggalPelaksanaan, "PPP")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={honor.tanggalPelaksanaan}
                            onSelect={(date) => updateHonorDetail("mitra", index, "tanggalPelaksanaan", date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ))}

                {honorMitra.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada data honor mitra. Klik tombol "Tambah Mitra" untuk menambahkan.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <Button type="submit" disabled={submitMutation.isPending} className="w-full bg-teal-700 hover:bg-teal-600">
                    {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/buat-dokumen")}>
                    Batal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </Layout>;
};

export default TransportLokal;