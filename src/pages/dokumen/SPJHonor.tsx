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
  honorDetails: z.array(z.object({
    type: z.enum(["organik", "mitra"]),
    personId: z.string(),
    honorPerOrang: z.number().min(0),
    kehadiran: z.number().min(0).max(31),
    pph21: z.number().min(0).max(100),
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
  tanggalSpj: new Date(),
  pembuatDaftar: "",
  honorDetails: []
};
const SPJHonor = () => {
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
    documentType: "SPJHonor",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // Combine honorDetails for form submission
  useEffect(() => {
    const combined = [...honorOrganik, ...honorMitra];
    form.setValue("honorDetails", combined);
  }, [honorOrganik, honorMitra, form]);

  // Add organik handler
  const addOrganik = () => {
    if (organikList.length > 0) {
      setHonorOrganik([...honorOrganik, {
        type: "organik",
        personId: "",
        honorPerOrang: 0,
        kehadiran: 0,
        pph21: 5,
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
        honorPerOrang: 0,
        kehadiran: 0,
        pph21: 5,
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
      if (field === "honorPerOrang" || field === "kehadiran" || field === "pph21") {
        const honorPerOrang = field === "honorPerOrang" ? value : updated[index].honorPerOrang;
        const kehadiran = field === "kehadiran" ? value : updated[index].kehadiran;
        const pph21 = field === "pph21" ? value : updated[index].pph21;
        const subtotal = honorPerOrang * kehadiran;
        const pajak = subtotal * (pph21 / 100);
        updated[index].totalHonor = subtotal - pajak;
      }
      setHonorOrganik(updated);
    } else {
      const updated = [...honorMitra];
      updated[index] = {
        ...updated[index],
        [field]: value
      };

      // Auto calculate total honor
      if (field === "honorPerOrang" || field === "kehadiran" || field === "pph21") {
        const honorPerOrang = field === "honorPerOrang" ? value : updated[index].honorPerOrang;
        const kehadiran = field === "kehadiran" ? value : updated[index].kehadiran;
        const pph21 = field === "pph21" ? value : updated[index].pph21;
        const subtotal = honorPerOrang * kehadiran;
        const pajak = subtotal * (pph21 / 100);
        updated[index].totalHonor = subtotal - pajak;
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

  // Calculate grand total honor
  const calculateGrandTotal = () => {
    const organikTotal = honorOrganik.reduce((sum, item) => sum + item.totalHonor, 0);
    const mitraTotal = honorMitra.reduce((sum, item) => sum + item.totalHonor, 0);
    return organikTotal + mitraTotal;
  };
  return <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-700">SPJ Honor</h1>
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
                </div>
              </CardContent>
            </Card>

            {/* Organik Section - Modified Layout */}
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
                      <h3 className="font-medium">Staf {index + 1}</h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeHonorDetail("organik", index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <Select value={honor.personId} onValueChange={value => updateHonorDetail("organik", index, "personId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih staf" />
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
                        <Label>Honor per Orang (Rp)</Label>
                        <Input 
                          type="number" 
                          value={honor.honorPerOrang} 
                          onChange={e => updateHonorDetail("organik", index, "honorPerOrang", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Banyaknya</Label>
                        <Input 
                          type="number" 
                          value={honor.kehadiran} 
                          onChange={e => updateHonorDetail("organik", index, "kehadiran", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                          min="0" 
                          max="31" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PPh 21 (%)</Label>
                        <Input 
                          type="number" 
                          value={honor.pph21} 
                          onChange={e => updateHonorDetail("organik", index, "pph21", parseFloat(e.target.value) || 0)} 
                          placeholder="5" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Total Honor (Rp)</Label>
                      <Input value={honor.totalHonor.toLocaleString()} readOnly className="font-bold" />
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

            {/* Mitra Section - Modified Layout */}
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
                      <h3 className="font-medium">Mitra {index + 1}</h3>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeHonorDetail("mitra", index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <Label>Honor per Orang (Rp)</Label>
                        <Input 
                          type="number" 
                          value={honor.honorPerOrang} 
                          onChange={e => updateHonorDetail("mitra", index, "honorPerOrang", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Banyaknya</Label>
                        <Input 
                          type="number" 
                          value={honor.kehadiran} 
                          onChange={e => updateHonorDetail("mitra", index, "kehadiran", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                          min="0" 
                          max="31" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PPh 21 (%)</Label>
                        <Input 
                          type="number" 
                          value={honor.pph21} 
                          onChange={e => updateHonorDetail("mitra", index, "pph21", parseFloat(e.target.value) || 0)} 
                          placeholder="5" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Total Honor (Rp)</Label>
                      <Input value={honor.totalHonor.toLocaleString()} readOnly className="font-bold" />
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

            {/* Grand Total */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Total Keseluruhan (Rp)</Label>
                    <Input value={calculateGrandTotal().toLocaleString()} readOnly className="font-bold text-lg" />
                  </div>
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
export default SPJHonor;