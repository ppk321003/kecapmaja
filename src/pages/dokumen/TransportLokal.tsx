
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useJenis, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { toast } from "@/components/ui/use-toast";
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
  tanggalPengajuan: z.date({ required_error: "Tanggal pengajuan harus dipilih" }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih"),
  organikBPS: z.array(z.string()).optional(),
  mitraStatistik: z.array(z.string()).optional(),
  daftarTransport: z.array(
    z.object({
      nama: z.string(),
      jenisPetugas: z.string(),
      banyaknya: z.number(),
      kecamatanTujuan: z.array(z.string()),
      rateTranslok: z.array(z.number()),
      jumlah: z.number(),
    })
  ).optional(),
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
  pembuatDaftar: "",
  organikBPS: [],
  mitraStatistik: [],
  daftarTransport: [],
};

const TransportLokal = () => {
  const navigate = useNavigate();
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  const [transportItems, setTransportItems] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Data fetching hooks
  const { data: jenisList = [] } = useJenis();
  const { data: programList = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(
    form.watch("program") || null
  );
  const { data: kroList = [] } = useKRO(
    form.watch("kegiatan") || null
  );
  const { data: roList = [] } = useRO(
    form.watch("kro") || null
  );
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();
  
  // Create name-to-object mappings for display purposes
  const programsMap = Object.fromEntries((programList || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, item.name]));
  const jenisMap = Object.fromEntries((jenisList || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));
  
  // Update transport items when Organik or Mitra selection changes
  useEffect(() => {
    const allSelected = [...selectedOrganik, ...selectedMitra];
    const newItems = allSelected.map((id) => {
      const organik = organikList.find((o) => o.id === id);
      const mitra = mitraList.find((m) => m.id === id);
      const person = organik || mitra;
      
      if (!person) return null;
      
      return {
        personId: id,
        nama: person.name,
        jenisPetugas: organik ? "Organik BPS" : "Mitra Statistik",
        banyaknya: 0,
        kecamatanTujuan: [],
        rateTranslok: [],
        jumlah: 0,
      };
    }).filter(Boolean);
    
    setTransportItems(newItems as any[]);
  }, [selectedOrganik, selectedMitra, organikList, mitraList]);
  
  const submitMutation = useSubmitToSheets({
    documentType: "TransportLokal",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });
  
  const handleOrganikChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedOrganik((prev) => [...prev, id]);
    } else {
      setSelectedOrganik((prev) => prev.filter((item) => item !== id));
    }
  };
  
  const handleMitraChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedMitra((prev) => [...prev, id]);
    } else {
      setSelectedMitra((prev) => prev.filter((item) => item !== id));
    }
  };
  
  const handleTransportItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...transportItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    
    // Recalculate jumlah if needed
    if (field === "banyaknya" || field === "rateTranslok") {
      const item = updatedItems[index];
      let total = 0;
      
      if (Array.isArray(item.rateTranslok)) {
        for (let i = 0; i < item.rateTranslok.length; i++) {
          total += (item.banyaknya || 0) * (item.rateTranslok[i] || 0);
        }
      }
      
      updatedItems[index].jumlah = total;
    }
    
    setTransportItems(updatedItems);
  };
  
  const handleKecamatanChange = (index: number, kecamatanValue: string, checked: boolean) => {
    const updatedItems = [...transportItems];
    const item = updatedItems[index];
    
    if (checked) {
      // Add kecamatan and default rate
      updatedItems[index] = {
        ...item,
        kecamatanTujuan: [...(item.kecamatanTujuan || []), kecamatanValue],
        rateTranslok: [...(item.rateTranslok || []), 0],
      };
    } else {
      // Remove kecamatan and its rate
      const kecIdx = item.kecamatanTujuan.indexOf(kecamatanValue);
      if (kecIdx !== -1) {
        const newKecamatan = [...item.kecamatanTujuan];
        const newRates = [...item.rateTranslok];
        newKecamatan.splice(kecIdx, 1);
        newRates.splice(kecIdx, 1);
        
        updatedItems[index] = {
          ...item,
          kecamatanTujuan: newKecamatan,
          rateTranslok: newRates,
        };
      }
    }
    
    setTransportItems(updatedItems);
  };

  const handleRateChange = (itemIndex: number, rateIndex: number, value: string) => {
    const updatedItems = [...transportItems];
    const item = updatedItems[itemIndex];
    const newRates = [...item.rateTranslok];
    newRates[rateIndex] = Number(value) || 0;
    
    // Calculate new total
    let total = 0;
    for (let i = 0; i < newRates.length; i++) {
      total += (item.banyaknya || 0) * (newRates[i] || 0);
    }
    
    updatedItems[itemIndex] = {
      ...item,
      rateTranslok: newRates,
      jumlah: total,
    };
    
    setTransportItems(updatedItems);
  };
  
  const onSubmit = async (data: FormValues) => {
    try {
      console.log("Form Data:", data);
      
      // Combine form data with the transport items
      const formData = {
        ...data,
        organikBPS: selectedOrganik,
        mitraStatistik: selectedMitra,
        daftarTransport: transportItems,
        // Add mappings for display in Google Sheets
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
      
      await submitMutation.mutateAsync(formData);
      
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan form",
      });
    }
  };

  // Kecamatan options (simplified list for demo)
  const kecamatanOptions = [
    "Jatiwangi",
    "Kasokandel",
    "Ligung",
    "Sumberjaya",
    "Dawuan",
    "Panyingkiran",
    "Leuwimunding",
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transport Lokal</h1>
          <p className="text-sm text-muted-foreground">
            Formulir Transport Lokal Kegiatan
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nama Kegiatan */}
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="namaKegiatan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Kegiatan</FormLabel>
                          <Input {...field} placeholder="Masukkan nama kegiatan" />
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
                          <FormLabel>Detil</FormLabel>
                          <Input {...field} placeholder="Masukkan detil kegiatan" />
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
                            {programList.map((program) => (
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
                            {kegiatanList.map((item) => (
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
                          onValueChange={(value) => {
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
                            {kroList.map((item) => (
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
                            {roList.map((item) => (
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pilih tanggal</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="p-3 pointer-events-auto"
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
                          defaultValue={field.value}
                        >
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
                </div>

                {/* Organik dan Mitra section */}
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Organik BPS</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {organikList.map((organik) => (
                        <div key={organik.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`organik-${organik.id}`}
                            checked={selectedOrganik.includes(organik.id)}
                            onCheckedChange={(checked) =>
                              handleOrganikChange(organik.id, !!checked)
                            }
                          />
                          <Label
                            htmlFor={`organik-${organik.id}`}
                            className="text-sm"
                          >
                            {organik.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Mitra Statistik</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mitraList.map((mitra) => (
                        <div key={mitra.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mitra-${mitra.id}`}
                            checked={selectedMitra.includes(mitra.id)}
                            onCheckedChange={(checked) =>
                              handleMitraChange(mitra.id, !!checked)
                            }
                          />
                          <Label
                            htmlFor={`mitra-${mitra.id}`}
                            className="text-sm"
                          >
                            {mitra.name} {mitra.kecamatan ? `- ${mitra.kecamatan}` : ''}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transport Items */}
                  {transportItems.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium">Daftar Transport</h3>
                      {transportItems.map((item, index) => (
                        <div key={index} className="border p-4 rounded-lg space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Nama</Label>
                              <Input value={item.nama} disabled />
                            </div>

                            <div className="space-y-2">
                              <Label>Jenis Petugas</Label>
                              <Input value={item.jenisPetugas} disabled />
                            </div>

                            <div className="space-y-2">
                              <Label>Banyaknya</Label>
                              <Input
                                type="number"
                                value={item.banyaknya}
                                onChange={(e) =>
                                  handleTransportItemChange(
                                    index,
                                    "banyaknya",
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Kecamatan Tujuan</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {kecamatanOptions.map((kec) => (
                                <div
                                  key={kec}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`kec-${index}-${kec}`}
                                    checked={item.kecamatanTujuan.includes(kec)}
                                    onCheckedChange={(checked) =>
                                      handleKecamatanChange(index, kec, !!checked)
                                    }
                                  />
                                  <Label
                                    htmlFor={`kec-${index}-${kec}`}
                                    className="text-sm"
                                  >
                                    {kec}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Rate Transport per Kecamatan */}
                          {item.kecamatanTujuan.length > 0 && (
                            <div className="space-y-2">
                              <Label>Rate Transport per Kecamatan (Rp)</Label>
                              <div className="space-y-2">
                                {item.kecamatanTujuan.map((kec, kecIndex) => (
                                  <div
                                    key={kecIndex}
                                    className="grid grid-cols-2 gap-2 items-center"
                                  >
                                    <Label className="text-sm">{kec}</Label>
                                    <Input
                                      type="number"
                                      value={item.rateTranslok[kecIndex] || 0}
                                      onChange={(e) =>
                                        handleRateChange(
                                          index,
                                          kecIndex,
                                          e.target.value
                                        )
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Jumlah (Rp)</Label>
                            <Input
                              value={item.jumlah.toLocaleString()}
                              disabled
                              className="font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit Buttons */}
                  <div className="flex space-x-4 pt-4">
                    <Button type="submit" disabled={submitMutation.isPending || transportItems.length === 0}>
                      {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/buat-dokumen")}
                    >
                      Batal
                    </Button>
                  </div>
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
