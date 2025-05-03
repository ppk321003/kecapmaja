
import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, PlusIcon, TrashIcon } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useSaveDocument, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";
import { KomponenSelect } from "@/components/KomponenSelect";

// Common schema for honor details
const honorDetailSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["organik", "mitra"]),
  personId: z.string().min(1, "Nama tidak boleh kosong"),
  jabatan: z.string().optional(),
  honor: z.coerce.number().min(0, "Honor harus positif"),
  pajak: z.coerce.number().min(0, "Pajak harus positif"),
  diterima: z.coerce.number().min(0, "Diterima harus positif")
});

// Schema for form validation
const spjHonorSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
  detil: z.string().optional(),
  jenis: z.enum(["Pendataan", "Pemeriksaan", "Supervisi"]),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalSpj: z.date({
    required_error: "Tanggal SPJ harus diisi",
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  honorDetails: z.array(honorDetailSchema).min(1, "Minimal satu data honor harus diisi")
});

// Type for the form data
type SPJHonorFormData = z.infer<typeof spjHonorSchema>;

export default function SPJHonorPage() {
  // Form initialization with default values
  const form = useForm<SPJHonorFormData>({
    resolver: zodResolver(spjHonorSchema),
    defaultValues: {
      namaKegiatan: "",
      detil: "",
      jenis: "Pendataan",
      program: "",
      kegiatan: "",
      kro: "",
      ro: "",
      komponen: "",
      akun: "",
      pembuatDaftar: "",
      honorDetails: []
    }
  });

  // Get form values to use in dependent queries
  const formValues = form.watch();

  // Queries for dropdown options
  const { data: programs = [] } = usePrograms();
  const { data: kegiatan = [] } = useKegiatan(formValues.program || null);
  const { data: kros = [] } = useKRO(formValues.kegiatan || null);
  const { data: ros = [] } = useRO(formValues.kro || null);
  const { data: komponenOptions = [] } = useKomponen();
  const { data: akuns = [] } = useAkun();
  const { data: organikBPS = [] } = useOrganikBPS();
  const { data: mitraStatistik = [] } = useMitraStatistik();

  // Track if form is in edit mode
  const [editMode, setEditMode] = useState(false);

  // Create unique ID for new honor details
  const [nextId, setNextId] = useState(1);

  // Mutation for saving document to database
  const saveDocument = useSaveDocument();

  // Google Sheets submission hook
  const submitToSheets = useSubmitToSheets({
    documentType: "SPJHonor",
    onSuccess: () => {
      // Reset form after successful submission to Google Sheets
      form.reset();
      setNextId(1);
    }
  });

  // Add a new honor detail
  const addHonorDetail = (type: "organik" | "mitra") => {
    const currentDetails = form.getValues("honorDetails") || [];
    form.setValue("honorDetails", [
      ...currentDetails,
      {
        id: `new-${nextId}`,
        type,
        personId: "",
        jabatan: "",
        honor: 0,
        pajak: 0,
        diterima: 0
      }
    ]);
    setNextId(nextId + 1);
  };

  // Remove an honor detail by index
  const removeHonorDetail = (index: number) => {
    const currentDetails = form.getValues("honorDetails") || [];
    form.setValue("honorDetails", currentDetails.filter((_, i) => i !== index));
  };

  // Calculate diterima (net amount) when honor or pajak changes
  const calculateDiterima = (index: number) => {
    const details = form.getValues("honorDetails");
    const detail = details[index];
    if (detail) {
      const honor = Number(detail.honor) || 0;
      const pajak = Number(detail.pajak) || 0;
      const diterima = honor - pajak;
      form.setValue(`honorDetails.${index}.diterima`, diterima);
    }
  };

  // Build name maps for selected values
  const buildNameMaps = (formData: any) => {
    // Create maps to convert IDs to display names
    const _programNameMap: Record<string, string> = {};
    const _kegiatanNameMap: Record<string, string> = {};
    const _kroNameMap: Record<string, string> = {};
    const _roNameMap: Record<string, string> = {};
    const _komponenNameMap: Record<string, string> = {};
    const _akunNameMap: Record<string, string> = {};
    const _organikNameMap: Record<string, any> = {};
    const _mitraNameMap: Record<string, any> = {};

    // Populate maps from available options
    programs.forEach(item => _programNameMap[item.id] = item.name);
    kegiatan.forEach(item => _kegiatanNameMap[item.id] = item.name);
    kros.forEach(item => _kroNameMap[item.id] = item.name);
    ros.forEach(item => _roNameMap[item.id] = item.name);
    komponenOptions.forEach(item => _komponenNameMap[item.id] = item.name);
    akuns.forEach(item => _akunNameMap[item.id] = item.name);
    
    organikBPS.forEach(item => _organikNameMap[item.id] = item);
    mitraStatistik.forEach(item => _mitraNameMap[item.id] = item);

    return {
      ...formData,
      _programNameMap,
      _kegiatanNameMap,
      _kroNameMap,
      _roNameMap,
      _komponenNameMap,
      _akunNameMap,
      _organikNameMap,
      _mitraNameMap
    };
  };

  // Form submission handler
  const onSubmit = async (data: SPJHonorFormData) => {
    try {
      // First save to database
      const enrichedData = buildNameMaps(data);
      const saveResult = await saveDocument.mutateAsync({
        jenisId: "3e12f89e-b2a8-4308-94be-9343e7503328", // ID for SPJ Honor in the jenis table
        title: data.namaKegiatan,
        data: enrichedData
      });

      // Then submit to Google Sheets
      if (saveResult) {
        await submitToSheets.mutateAsync(enrichedData);
      }
    } catch (error) {
      console.error("Error saving SPJ Honor:", error);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Daftar Penerimaan Honor</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detail Kegiatan</CardTitle>
                <CardDescription>Informasi umum tentang kegiatan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="detil"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Detil</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Masukkan detail kegiatan" 
                            className="min-h-[80px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tanggalSpj"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal (SPJ)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "dd MMMM yyyy")
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
                        <FormControl>
                          <Input placeholder="Nama pembuat daftar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kode Anggaran</CardTitle>
                <CardDescription>Pilih kode anggaran terkait kegiatan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="program"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('kegiatan', '');
                            form.setValue('kro', '');
                            form.setValue('ro', '');
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih program" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {programs.map((item) => (
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

                  <FormField
                    control={form.control}
                    name="kegiatan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kegiatan</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('kro', '');
                            form.setValue('ro', '');
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger disabled={!formValues.program}>
                              <SelectValue placeholder="Pilih kegiatan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kegiatan.map((item) => (
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

                  <FormField
                    control={form.control}
                    name="kro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KRO</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('ro', '');
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger disabled={!formValues.kegiatan}>
                              <SelectValue placeholder="Pilih KRO" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kros.map((item) => (
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

                  <FormField
                    control={form.control}
                    name="ro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RO</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger disabled={!formValues.kro}>
                              <SelectValue placeholder="Pilih RO" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ros.map((item) => (
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

                  <FormField
                    control={form.control}
                    name="komponen"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Komponen</FormLabel>
                        <KomponenSelect
                          value={field.value}
                          onChange={field.onChange} 
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
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih Akun" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {akuns.map((item) => (
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daftar Penerima Honor</CardTitle>
                <CardDescription>
                  Tambahkan rincian penerima honor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addHonorDetail('organik')}
                      className="flex items-center"
                    >
                      <PlusIcon className="mr-1 h-4 w-4" /> Tambah Organik BPS
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addHonorDetail('mitra')}
                      className="flex items-center"
                    >
                      <PlusIcon className="mr-1 h-4 w-4" /> Tambah Mitra Statistik
                    </Button>
                  </div>

                  {form.watch("honorDetails")?.map((_, index) => (
                    <Card key={index} className="border border-gray-200">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeHonorDetail(index)}
                            className="absolute right-0 top-0"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>

                          <FormField
                            control={form.control}
                            name={`honorDetails.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipe</FormLabel>
                                <Select
                                  onValueChange={(value: "organik" | "mitra") => {
                                    field.onChange(value);
                                    form.setValue(`honorDetails.${index}.personId`, "");
                                  }}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih tipe" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="organik">Organik BPS</SelectItem>
                                    <SelectItem value="mitra">Mitra Statistik</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`honorDetails.${index}.personId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nama</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih nama" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {form.watch(`honorDetails.${index}.type`) === 'organik'
                                      ? organikBPS.map((item) => (
                                          <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                          </SelectItem>
                                        ))
                                      : mitraStatistik.map((item) => (
                                          <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                          </SelectItem>
                                        ))
                                    }
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`honorDetails.${index}.jabatan`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Jabatan</FormLabel>
                                <FormControl>
                                  <Input placeholder="Jabatan" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`honorDetails.${index}.honor`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Honor (Rp)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      calculateDiterima(index);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`honorDetails.${index}.pajak`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pajak (Rp)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      calculateDiterima(index);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`honorDetails.${index}.diterima`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Diterima (Rp)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    readOnly
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveDocument.isPending || submitToSheets.isPending}
                >
                  {saveDocument.isPending || submitToSheets.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
