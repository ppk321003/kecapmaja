import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    required_error: "Tanggal SPJ harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  totalKeseluruhan: z.number().min(0),
  honorDetails: z.array(z.object({
    type: z.enum(["organik", "mitra"]),
    personId: z.string().min(1, "Nama harus dipilih"),
    kecamatanTujuan: z.string().min(1, "Kecamatan harus dipilih"),
    rate: z.number().min(0, "Rate harus diisi"),
    tanggalPelaksanaan: z.date({
      required_error: "Tanggal pelaksanaan harus dipilih"
    }),
    totalHonor: z.number().min(0)
  })).min(1, "Minimal ada satu penerima honor")
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  namaKegiatan: "",
  detil: "",
  jenis: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalSpj: undefined,
  pembuatDaftar: "",
  totalKeseluruhan: 0,
  honorDetails: []
};

const TransportLokal = () => {
  const navigate = useNavigate();
  const [honorOrganik, setHonorOrganik] = useState<FormValues["honorDetails"]>([]);
  const [honorMitra, setHonorMitra] = useState<FormValues["honorDetails"]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Data queries
  const { data: jenisList = [] } = useJenis();
  const { data: programs = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(form.watch("program"));
  const { data: kroList = [] } = useKRO(form.watch("kegiatan"));
  const { data: roList = [] } = useRO(form.watch("kro"));
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  // Setup submission to Google Sheets
  const submitMutation = useSubmitToSheets({
    documentType: "TransportLokal",
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data SPJ Transport Lokal berhasil disimpan",
        variant: "default"
      });
      navigate("/buat-dokumen");
    },
    onError: (error) => {
      toast({
        title: "Gagal",
        description: error.message || "Gagal menyimpan data",
        variant: "destructive"
      });
    }
  });

  // Combine honorDetails for form submission
  useEffect(() => {
    const combined = [...honorOrganik, ...honorMitra];
    const total = combined.reduce((sum, item) => sum + (item.totalHonor || 0), 0);
    form.setValue("honorDetails", combined);
    form.setValue("totalKeseluruhan", total);
  }, [honorOrganik, honorMitra, form]);

  // Add organik handler
  const addOrganik = () => {
    setHonorOrganik([...honorOrganik, {
      type: "organik",
      personId: "",
      kecamatanTujuan: "",
      rate: 0,
      tanggalPelaksanaan: undefined,
      totalHonor: 0
    }]);
  };

  // Add mitra handler
  const addMitra = () => {
    setHonorMitra([...honorMitra, {
      type: "mitra",
      personId: "",
      kecamatanTujuan: "",
      rate: 0,
      tanggalPelaksanaan: undefined,
      totalHonor: 0
    }]);
  };

  // Update honor detail value
  const updateHonorDetail = (type: "organik" | "mitra", index: number, field: string, value: any) => {
    const updater = type === "organik" ? setHonorOrganik : setHonorMitra;
    const currentList = type === "organik" ? honorOrganik : honorMitra;
    
    const updated = [...currentList];
    updated[index] = {
      ...updated[index],
      [field]: value
    };

    // Update total honor when rate changes
    if (field === "rate") {
      updated[index].totalHonor = Number(value) || 0;
    }

    updater(updated);
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
      // Validate tanggal pelaksanaan
      const invalidDates = data.honorDetails.filter(item => 
        item.tanggalPelaksanaan && data.tanggalSpj && 
        item.tanggalPelaksanaan > data.tanggalSpj
      );

      if (invalidDates.length > 0) {
        toast({
          variant: "destructive",
          title: "Validasi Gagal",
          description: "Tanggal SPJ tidak boleh lebih awal dari tanggal pelaksanaan"
        });
        return;
      }

      await submitMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error saving SPJ Transport Lokal:", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">SPJ Transport Lokal</h1>
          <p className="text-sm text-muted-foreground">Formulir Surat Pertanggungjawaban Transport Lokal</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informasi Kegiatan */}
            <Card>
              <CardHeader>
                <CardTitle>Informasi Kegiatan</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="namaKegiatan"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nama Kegiatan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: Transport Lokal Pendataan 2024" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="detil"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Detil Kegiatan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: Pendataan XYZ 2024" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jenis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Kegiatan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jenisList.map((jenis) => (
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

                <FormField
                  control={form.control}
                  name="program"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.resetField("kegiatan");
                          form.resetField("kro");
                          form.resetField("ro");
                        }}
                        defaultValue={field.value}
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

                <FormField
                  control={form.control}
                  name="kegiatan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kegiatan</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.resetField("kro");
                          form.resetField("ro");
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

                <FormField
                  control={form.control}
                  name="kro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KRO</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.resetField("ro");
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
                          {akunList.map((akun) => (
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

                <FormField
                  control={form.control}
                  name="tanggalSpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal SPJ</FormLabel>
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
                                format(field.value, "PPP")
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
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          {organikList.map((organik) => (
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

                <FormField
                  control={form.control}
                  name="totalKeseluruhan"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Total Keseluruhan (Rp)</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value.toLocaleString("id-ID")}
                          readOnly
                          className="font-bold text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Data Organik */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Transport Organik BPS</CardTitle>
                  <Button
                    type="button"
                    onClick={addOrganik}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Tambah Organik
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {honorOrganik.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada data transport organik
                  </p>
                ) : (
                  honorOrganik.map((honor, index) => (
                    <div key={`organik-${index}`} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Data Organik {index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHonorDetail("organik", index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Nama Organik</Label>
                          <Select
                            value={honor.personId}
                            onValueChange={(value) =>
                              updateHonorDetail("organik", index, "personId", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih organik" />
                            </SelectTrigger>
                            <SelectContent>
                              {organikList.map((organik) => (
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
                            onValueChange={(value) =>
                              updateHonorDetail("organik", index, "kecamatanTujuan", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kecamatan" />
                            </SelectTrigger>
                            <SelectContent>
                              {KECAMATAN_LIST.map((kecamatan) => (
                                <SelectItem key={kecamatan} value={kecamatan}>
                                  {kecamatan}
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
                            onChange={(e) =>
                              updateHonorDetail(
                                "organik",
                                index,
                                "rate",
                                parseInt(e.target.value) || 0
                              )
                            }
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
                              onSelect={(date) =>
                                updateHonorDetail("organik", index, "tanggalPelaksanaan", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Data Mitra */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Transport Mitra Statistik</CardTitle>
                  <Button
                    type="button"
                    onClick={addMitra}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Tambah Mitra
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {honorMitra.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Belum ada data transport mitra
                  </p>
                ) : (
                  honorMitra.map((honor, index) => (
                    <div key={`mitra-${index}`} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Data Mitra {index + 1}</h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHonorDetail("mitra", index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Nama Mitra</Label>
                          <Select
                            value={honor.personId}
                            onValueChange={(value) =>
                              updateHonorDetail("mitra", index, "personId", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih mitra" />
                            </SelectTrigger>
                            <SelectContent>
                              {mitraList.map((mitra) => (
                                <SelectItem key={mitra.id} value={mitra.id}>
                                  {mitra.name} ({mitra.kecamatan})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Kecamatan Tujuan</Label>
                          <Select
                            value={honor.kecamatanTujuan}
                            onValueChange={(value) =>
                              updateHonorDetail("mitra", index, "kecamatanTujuan", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kecamatan" />
                            </SelectTrigger>
                            <SelectContent>
                              {KECAMATAN_LIST.map((kecamatan) => (
                                <SelectItem key={kecamatan} value={kecamatan}>
                                  {kecamatan}
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
                            onChange={(e) =>
                              updateHonorDetail(
                                "mitra",
                                index,
                                "rate",
                                parseInt(e.target.value) || 0
                              )
                            }
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
                              onSelect={(date) =>
                                updateHonorDetail("mitra", index, "tanggalPelaksanaan", date)
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/buat-dokumen")}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default TransportLokal;