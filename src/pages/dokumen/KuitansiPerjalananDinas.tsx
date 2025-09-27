import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS } from "@/hooks/use-database";
import { toast } from "@/hooks/use-toast";
import { KomponenSelect } from "@/components/KomponenSelect";
import { KegiatanSelect } from "@/components/KegiatanSelect";
import { KROSelect } from "@/components/KROSelect";
import { ROSelect } from "@/components/ROSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

// Interface for kecamatan details
interface KecamatanDetail {
  id: string;
  nama: string;
  tanggalBerangkat: Date | undefined;
  tanggalKembali: Date | undefined;
}
const formSchema = z.object({
  jenisPerjalanan: z.string().min(1, "Jenis perjalanan harus dipilih"),
  nomorSuratTugas: z.string().min(1, "Nomor surat tugas harus diisi"),
  tanggalSuratTugas: z.date({
    required_error: "Tanggal surat tugas harus dipilih"
  }),
  namaPelaksana: z.string().min(1, "Nama pelaksana harus dipilih"),
  tujuanPerjalanan: z.string().min(1, "Tujuan perjalanan harus diisi"),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalPengajuan: z.date({
    required_error: "Tanggal pengajuan harus dipilih"
  }),
  kabupatenKota: z.string().optional(),
  namaTempatTujuan: z.string().optional(),
  tanggalBerangkat: z.date().optional(),
  tanggalKembali: z.date().optional(),
  biayaTransport: z.string().optional(),
  biayaBBM: z.string().optional(),
  biayaPenginapan: z.string().optional()
});
type FormValues = z.infer<typeof formSchema>;
const DEFAULT_VALUES: Partial<FormValues> = {
  jenisPerjalanan: "Dalam Kota",
  nomorSuratTugas: "",
  tanggalSuratTugas: undefined,
  namaPelaksana: "",
  tujuanPerjalanan: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalPengajuan: null,
  kabupatenKota: "",
  namaTempatTujuan: "",
  tanggalBerangkat: undefined,
  tanggalKembali: undefined,
  biayaTransport: "",
  biayaBBM: "",
  biayaPenginapan: ""
};

// Updated kecamatan options based on the requirements
const kecamatanOptions = ["Lemahsugih", "Bantarujeg", "Malausma", "Cikijing", "Cingambul", "Talaga", "Banjaran", "Argapura", "Maja", "Majalengka", "Cigasong", "Sukahaji", "Sindang", "Rajagaluh", "Sindangwangi", "Leuwimunding", "Palasah", "Jatiwangi", "Dawuan", "Kasokandel", "Panyingkiran", "Kadipaten", "Kertajati", "Jatitujuh", "Ligung", "Sumberjaya"];
const KuitansiPerjalananDinas = () => {
  const navigate = useNavigate();
  const [kecamatanDetails, setKecamatanDetails] = useState<KecamatanDetail[]>([]);
  const [isLuarKota, setIsLuarKota] = useState(false);

  // Initialize form first before using it
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES
  });

  // Watch for changes in jenisPerjalanan
  const jenisPerjalanan = form.watch("jenisPerjalanan");
  useEffect(() => {
    setIsLuarKota(jenisPerjalanan === "Luar Kota");
  }, [jenisPerjalanan]);

  // Data fetching hooks
  const {
    data: programList = []
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

  // Create name-to-object mappings for display purposes
  const programsMap = Object.fromEntries((programList || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, item.name]));
  const submitMutation = useSubmitToSheets({
    documentType: "KuitansiPerjalananDinas",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // Function to add a new kecamatan detail
  const addKecamatanDetail = () => {
    setKecamatanDetails(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      nama: "",
      tanggalBerangkat: undefined,
      tanggalKembali: undefined
    }]);
  };

  // Function to remove a kecamatan detail
  const removeKecamatanDetail = (id: string) => {
    setKecamatanDetails(prev => prev.filter(detail => detail.id !== id));
  };

  // Function to update a kecamatan detail
  const updateKecamatanDetail = (id: string, field: string, value: any) => {
    setKecamatanDetails(prev => prev.map(detail => detail.id === id ? {
      ...detail,
      [field]: value
    } : detail));
  };

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    try {
      // Combine form data with the kecamatan details
      const formData = {
        ...values,
        kecamatanDetails,
        // Add mappings for display in Google Sheets
        _programNameMap: programsMap,
        _kegiatanNameMap: kegiatanMap,
        _kroNameMap: kroMap,
        _roNameMap: roMap,
        _komponenNameMap: komponenMap,
        _akunNameMap: akunMap
      };

      // All forms for any jenis perjalanan are valid for submission
      console.log("Submitting form data:", formData);
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
  return <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">Kuitansi Perjalanan Dinas</h1>
          <p className="text-sm text-muted-foreground">
            Formulir Kuitansi Perjalanan Dinas
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Jenis Perjalanan Dinas */}
                  <FormField control={form.control} name="jenisPerjalanan" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Jenis Perjalanan Dinas</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis perjalanan dinas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Dalam Kota">Dalam Kota</SelectItem>
                            <SelectItem value="Luar Kota">Luar Kota</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                  {/* Nomor Surat Tugas */}
                  <FormField control={form.control} name="nomorSuratTugas" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Nomor Surat Tugas</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan nomor surat tugas" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  {/* Tanggal Surat Tugas */}
                  <FormField control={form.control} name="tanggalSuratTugas" render={({
                  field
                }) => <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Surat Tugas</FormLabel>
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

                  {/* Nama Pelaksana Perjalanan Dinas */}
                  <FormField control={form.control} name="namaPelaksana" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Nama Pelaksana</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih pelaksana" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organikList.map(organik => <SelectItem key={organik.id} value={organik.name}>
                                {organik.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                  {/* Tujuan Pelaksanaan Perjalanan Dinas */}
                  <FormField control={form.control} name="tujuanPerjalanan" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Tujuan Pelaksanaan</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan tujuan pelaksanaan" />
                        </FormControl>
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
                  }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {programList.map(program => <SelectItem key={program.id} value={program.id}>
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
                        <KegiatanSelect value={field.value} onChange={value => {
                    field.onChange(value);
                    form.setValue("kro", "");
                    form.setValue("ro", "");
                  }} placeholder="Pilih kegiatan" programId={form.watch("program")} />
                        <FormMessage />
                      </FormItem>} />

                  {/* KRO */}
                  <FormField control={form.control} name="kro" render={({
                  field
                }) => <FormItem>
                        <FormLabel>KRO</FormLabel>
                        <KROSelect value={field.value} onChange={value => {
                    field.onChange(value);
                    form.setValue("ro", "");
                  }} placeholder="Pilih KRO" kegiatanId={form.watch("kegiatan")} />
                        <FormMessage />
                      </FormItem>} />

                  {/* RO */}
                  <FormField control={form.control} name="ro" render={({
                  field
                }) => <FormItem>
                        <FormLabel>RO</FormLabel>
                        <ROSelect value={field.value} onChange={field.onChange} placeholder="Pilih RO" kroId={form.watch("kro")} />
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
                        <AkunSelect value={field.value} onChange={field.onChange} placeholder="Pilih akun" />
                        <FormMessage />
                      </FormItem>} />

                  {/* Tanggal Pengajuan */}
                  <FormField control={form.control} name="tanggalPengajuan" render={({
                  field
                }) => <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Pengajuan</FormLabel>
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

                  {/* Only show these fields for Luar Kota */}
                  {isLuarKota && <>
                      {/* Kabupaten/Kota Tujuan */}
                      <FormField control={form.control} name="kabupatenKota" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>Kabupaten/Kota Tujuan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan kabupaten/kota tujuan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                      {/* Nama Tempat Tujuan */}
                      <FormField control={form.control} name="namaTempatTujuan" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>Nama Tempat Tujuan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan nama tempat tujuan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                    </>}

                  {/* Fields specific to Luar Kota */}
                  {isLuarKota && <>
                      {/* Tanggal Berangkat */}
                      <FormField control={form.control} name="tanggalBerangkat" render={({
                    field
                  }) => <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Berangkat</FormLabel>
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

                      {/* Tanggal Kembali */}
                      <FormField control={form.control} name="tanggalKembali" render={({
                    field
                  }) => <FormItem className="flex flex-col">
                            <FormLabel>Tanggal Kembali</FormLabel>
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

                      {/* Biaya Transport */}
                      <FormField control={form.control} name="biayaTransport" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>Biaya Transport Kab/Kota Tujuan (PP)</FormLabel>
                            <FormControl>
                              <Input {...field} type="text" placeholder="Rp 0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                      {/* Biaya BBM/Tol */}
                      <FormField control={form.control} name="biayaBBM" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>Biaya Pembelian BBM/Tol (PP)</FormLabel>
                            <FormControl>
                              <Input {...field} type="text" placeholder="Rp 0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                      {/* Biaya Penginapan/Hotel */}
                      <FormField control={form.control} name="biayaPenginapan" render={({
                    field
                  }) => <FormItem>
                            <FormLabel>Biaya Penginapan/Hotel</FormLabel>
                            <FormControl>
                              <Input {...field} type="text" placeholder="Rp 0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                    </>}
                </div>

                {/* Kecamatan Details Section (for "Dalam Kota") */}
                {!isLuarKota && <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Detail Kecamatan</h3>
                      <Button type="button" variant="outline" size="sm" onClick={addKecamatanDetail}>
                        <Plus className="h-4 w-4 mr-2" /> Tambah Kecamatan
                      </Button>
                    </div>

                    {kecamatanDetails.length > 0 ? <div className="space-y-4">
                        {kecamatanDetails.map((detail, index) => <Card key={detail.id} className="overflow-hidden">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium text-base">Kecamatan (terjauh) {index + 1}</h4>
                                <Button variant="ghost" size="icon" onClick={() => removeKecamatanDetail(detail.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label>Nama Kecamatan</Label>
                                  <Select value={detail.nama} onValueChange={value => updateKecamatanDetail(detail.id, 'nama', value)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih kecamatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {kecamatanOptions.map(kec => <SelectItem key={kec} value={kec}>
                                          {kec}
                                        </SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Tanggal Berangkat</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !detail.tanggalBerangkat && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {detail.tanggalBerangkat ? format(detail.tanggalBerangkat, "PPP") : <span>Pilih tanggal</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar mode="single" selected={detail.tanggalBerangkat} onSelect={date => updateKecamatanDetail(detail.id, 'tanggalBerangkat', date)} initialFocus className="p-3 pointer-events-auto" />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Tanggal Kembali</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !detail.tanggalKembali && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {detail.tanggalKembali ? format(detail.tanggalKembali, "PPP") : <span>Pilih tanggal</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar mode="single" selected={detail.tanggalKembali} onSelect={date => updateKecamatanDetail(detail.id, 'tanggalKembali', date)} initialFocus className="p-3 pointer-events-auto" />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            </CardContent>
                          </Card>)}
                      </div> : <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center text-muted-foreground">
                        <p>Belum ada data kecamatan</p>
                        <p className="text-sm">Klik tombol di atas untuk menambahkan data kecamatan</p>
                      </div>}
                  </div>}

                {/* Submit Buttons */}
                <div className="flex space-x-4 pt-4">
                  <Button type="submit" disabled={submitMutation.isPending} className="bg-teal-800 hover:bg-teal-700">
                    {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/buat-dokumen")}>
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
export default KuitansiPerjalananDinas;