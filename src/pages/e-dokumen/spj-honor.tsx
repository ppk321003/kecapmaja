import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
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
import { FormSelect } from "@/components/FormSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";
import { formatNumberWithSeparator, parseFormattedNumber } from "@/lib/formatNumber";

// Schema validation
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
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi")
});

type FormValues = z.infer<typeof formSchema>;

// Honor detail types
interface HonorDetail {
  type: 'organik' | 'mitra';
  personId: string;
  honorPerOrang: string;
  kehadiran: number;
  pph21: number;
  totalHonor: number;
}

const SPJHonor = () => {
  const navigate = useNavigate();
  const [honorOrganik, setHonorOrganik] = useState<HonorDetail[]>([]);
  const [honorMitra, setHonorMitra] = useState<HonorDetail[]>([]);
  
  // Setup form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      pembuatDaftar: ""
    }
  });

  // Data queries
  const { data: jenisList = [] } = useJenis();
  const { data: programs = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(form.watch("program") || null);
  const { data: kroList = [] } = useKRO(form.watch("kegiatan") || null);
  const { data: roList = [] } = useRO(form.watch("kro") || null);
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  // Setup submission to Google Sheets
  const submitMutation = useSubmitToSheets({
    spreadsheetId: "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc",
    sheetName: "SPJHonor",
    onSuccess: () => {
      toast({
        title: "Berhasil!",
        description: "Data SPJ Honor telah disimpan",
        variant: "default"
      });
      navigate("/e-dokumen/buat");
    }
  });

  // Create name mappings for display
  const jenisMap = Object.fromEntries((jenisList || []).map(item => [item.id, item.name]));
  const programsMap = Object.fromEntries((programs || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));

  // Add organik handler
  const addOrganik = () => {
    if (organikList.length > 0) {
      setHonorOrganik([...honorOrganik, {
        type: "organik",
        personId: "",
        honorPerOrang: "0",
        kehadiran: 0,
        pph21: 5,
        totalHonor: 0
      }]);
    } else {
      toast({
        variant: "destructive",
        title: "Data Kosong",
        description: "Tidak ada data organik BPS tersedia"
      });
    }
  };

  // Add mitra handler
  const addMitra = () => {
    if (mitraList.length > 0) {
      setHonorMitra([...honorMitra, {
        type: "mitra",
        personId: "",
        honorPerOrang: "0",
        kehadiran: 0,
        pph21: 0,
        totalHonor: 0
      }]);
    } else {
      toast({
        variant: "destructive",
        title: "Data Kosong",
        description: "Tidak ada data mitra statistik tersedia"
      });
    }
  };

  // Calculate total honor for a detail
  const calculateTotalHonor = (detail: HonorDetail): number => {
    const honorPerOrang = parseInt(detail.honorPerOrang) || 0;
    const kehadiran = detail.kehadiran || 0;
    const pph21 = detail.pph21 || 0;
    
    const subtotal = honorPerOrang * kehadiran;
    const pajak = subtotal * (pph21 / 100);
    return Math.max(0, subtotal - pajak);
  };

  // Update honor detail value
  const updateHonorDetail = (type: "organik" | "mitra", index: number, field: string, value: any) => {
    if (type === "organik") {
      const updated = [...honorOrganik];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      
      // Recalculate total if relevant fields changed
      if (field === "honorPerOrang" || field === "kehadiran" || field === "pph21") {
        updated[index].totalHonor = calculateTotalHonor(updated[index]);
      }
      
      setHonorOrganik(updated);
    } else {
      const updated = [...honorMitra];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      
      // Recalculate total if relevant fields changed
      if (field === "honorPerOrang" || field === "kehadiran" || field === "pph21") {
        updated[index].totalHonor = calculateTotalHonor(updated[index]);
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

  // Calculate grand total honor
  const calculateGrandTotal = (): number => {
    const organikTotal = honorOrganik.reduce((sum, item) => sum + item.totalHonor, 0);
    const mitraTotal = honorMitra.reduce((sum, item) => sum + item.totalHonor, 0);
    return organikTotal + mitraTotal;
  };

  // Format data for display in Google Sheets
  const formatHonorDetailsForSheets = (): string => {
    const allDetails = [...honorOrganik, ...honorMitra];
    
    const formatted = allDetails.map(detail => {
      const personName = detail.type === "organik" 
        ? organikMap[detail.personId] || detail.personId
        : mitraMap[detail.personId] || detail.personId;
      
      return `${personName}: ${formatNumberWithSeparator(detail.totalHonor)} (${detail.kehadiran}x${formatNumberWithSeparator(parseInt(detail.honorPerOrang))} - PPh ${detail.pph21}%)`;
    }).join("; ");
    
    return formatted;
  };

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    try {
      console.log("Form submitted with data:", data);
      console.log("Honor Organik:", honorOrganik);
      console.log("Honor Mitra:", honorMitra);
      
      // Validate honor details
      const allHonorDetails = [...honorOrganik, ...honorMitra];
      if (allHonorDetails.length === 0) {
        toast({
          variant: "destructive",
          title: "Data Honor Kosong",
          description: "Tambahkan minimal satu data honor organik atau mitra"
        });
        return;
      }
      
      // Validate each honor detail has a person selected
      for (const detail of allHonorDetails) {
        if (!detail.personId) {
          toast({
            variant: "destructive",
            title: "Data Tidak Lengkap",
            description: "Pilih nama untuk setiap detail honor"
          });
          return;
        }
      }
      
      // Prepare data for Google Sheets (format as 2D array)
      const values = [
        [
          // Main form data
          data.namaKegiatan,
          data.detil || "",
          jenisMap[data.jenis] || data.jenis,
          programsMap[data.program] || data.program,
          kegiatanMap[data.kegiatan] || data.kegiatan,
          kroMap[data.kro] || data.kro,
          roMap[data.ro] || data.ro,
          komponenMap[data.komponen] || data.komponen,
          akunMap[data.akun] || data.akun,
          format(data.tanggalSpj, 'yyyy-MM-dd'),
          organikMap[data.pembuatDaftar] || data.pembuatDaftar,
          
          // Honor summary
          formatHonorDetailsForSheets(),
          formatNumberWithSeparator(calculateGrandTotal()),
          
          // Counts
          honorOrganik.length.toString(),
          honorMitra.length.toString(),
          
          // Timestamp
          new Date().toISOString()
        ]
      ];
      
      console.log("Submitting to sheets with values:", values);
      
      const submitData = {
        spreadsheetId: "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc",
        sheetName: "SPJHonor",
        values
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

  // Reset form on cancel
  const handleCancel = () => {
    if (window.confirm("Apakah Anda yakin ingin membatalkan? Semua data yang belum disimpan akan hilang.")) {
      form.reset();
      setHonorOrganik([]);
      setHonorMitra([]);
      navigate("/e-dokumen/buat");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">SPJ Honor</h1>
          <p className="text-sm text-muted-foreground">Formulir Surat Pertanggungjawaban Honor Kegiatan</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Main Form Card */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nama Kegiatan */}
                  <FormField 
                    control={form.control}
                    name="namaKegiatan"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nama Kegiatan (cth: Honor Pendataan Petugas Potensi Desa Tahun 2025)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan nama kegiatan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Detil */}
                  <FormField 
                    control={form.control}
                    name="detil"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Detil (cth: Potensi Desa 2025)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Masukkan detil kegiatan" />
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {jenisList.map(jenis => (
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
                          value={field.value}
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
                          value={field.value}
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
                          value={field.value}
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
                          value={field.value}
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
                          onValueChange={field.onChange} 
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
                        <FormControl>
                          <AkunSelect 
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tanggal SPJ */}
                  <FormField 
                    control={form.control}
                    name="tanggalSpj"
                    render={({ field }) => (
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
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Organik Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium">Honor Organik BPS</h2>
                    <p className="text-sm text-muted-foreground">
                      Total Organik: {honorOrganik.length} orang | Total Honor: Rp {formatNumberWithSeparator(honorOrganik.reduce((sum, item) => sum + item.totalHonor, 0))}
                    </p>
                  </div>
                  <Button type="button" onClick={addOrganik} variant="default">
                    Tambah Organik
                  </Button>
                </div>

                {honorOrganik.map((honor, index) => (
                  <div key={`organik-${index}`} className="border p-4 rounded-md space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Organik BPS #{index + 1}</h3>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeHonorDetail("organik", index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Hapus
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Nama */}
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <FormSelect
                          placeholder="Pilih Organik BPS"
                          options={organikList.map(organik => ({
                            value: organik.id,
                            label: organik.name
                          }))}
                          value={honor.personId}
                          onChange={(value) => updateHonorDetail("organik", index, "personId", value)}
                        />
                      </div>
                      
                      {/* Harga Satuan */}
                      <div className="space-y-2">
                        <Label>Harga Satuan (Rp)</Label>
                        <Input 
                          type="text" 
                          value={formatNumberWithSeparator(honor.honorPerOrang)} 
                          onChange={(e) => {
                            const value = parseFormattedNumber(e.target.value);
                            updateHonorDetail("organik", index, "honorPerOrang", value.toString());
                          }} 
                          placeholder="0"
                          className="text-right"
                        />
                      </div>
                      
                      {/* Kehadiran */}
                      <div className="space-y-2">
                        <Label>Banyaknya</Label>
                        <Input 
                          type="number" 
                          value={honor.kehadiran} 
                          onChange={(e) => updateHonorDetail("organik", index, "kehadiran", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                          min="0" 
                          max="1000" 
                        />
                      </div>
                      
                      {/* PPh 21 */}
                      <div className="space-y-2">
                        <Label>PPh 21 (%)</Label>
                        <Input 
                          type="number" 
                          value={honor.pph21} 
                          onChange={(e) => updateHonorDetail("organik", index, "pph21", parseFloat(e.target.value) || 0)} 
                          placeholder="5" 
                          min="0" 
                          max="100" 
                          step="0.1"
                        />
                      </div>
                    </div>
                    
                    {/* Total Honor */}
                    <div className="space-y-2">
                      <Label>Total Honor (Rp)</Label>
                      <Input 
                        value={`Rp ${formatNumberWithSeparator(honor.totalHonor)}`} 
                        readOnly 
                        className="font-bold text-right bg-gray-50" 
                      />
                    </div>
                  </div>
                ))}

                {honorOrganik.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-md">
                    <p className="text-muted-foreground">
                      Belum ada data honor organik. Klik tombol "Tambah Organik" untuk menambahkan.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mitra Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium">Honor Mitra Statistik</h2>
                    <p className="text-sm text-muted-foreground">
                      Total Mitra: {honorMitra.length} orang | Total Honor: Rp {formatNumberWithSeparator(honorMitra.reduce((sum, item) => sum + item.totalHonor, 0))}
                    </p>
                  </div>
                  <Button type="button" onClick={addMitra} variant="default">
                    Tambah Mitra
                  </Button>
                </div>

                {honorMitra.map((honor, index) => (
                  <div key={`mitra-${index}`} className="border p-4 rounded-md space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Mitra Statistik #{index + 1}</h3>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeHonorDetail("mitra", index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Hapus
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Nama */}
                      <div className="space-y-2">
                        <Label>Nama</Label>
                        <FormSelect
                          placeholder="Pilih Mitra Statistik"
                          options={mitraList.map(mitra => ({
                            value: mitra.id,
                            label: `${mitra.name}${mitra.kecamatan ? ` - ${mitra.kecamatan}` : ''}`
                          }))}
                          value={honor.personId}
                          onChange={(value) => updateHonorDetail("mitra", index, "personId", value)}
                        />
                      </div>
                      
                      {/* Harga Satuan */}
                      <div className="space-y-2">
                        <Label>Harga Satuan (Rp)</Label>
                        <Input 
                          type="text" 
                          value={formatNumberWithSeparator(honor.honorPerOrang)} 
                          onChange={(e) => {
                            const value = parseFormattedNumber(e.target.value);
                            updateHonorDetail("mitra", index, "honorPerOrang", value.toString());
                          }} 
                          placeholder="0"
                          className="text-right"
                        />
                      </div>
                      
                      {/* Kehadiran */}
                      <div className="space-y-2">
                        <Label>Banyaknya</Label>
                        <Input 
                          type="number" 
                          value={honor.kehadiran} 
                          onChange={(e) => updateHonorDetail("mitra", index, "kehadiran", parseInt(e.target.value, 10) || 0)} 
                          placeholder="0" 
                          min="0" 
                          max="1000" 
                        />
                      </div>
                      
                      {/* PPh 21 */}
                      <div className="space-y-2">
                        <Label>PPh 21 (%)</Label>
                        <Input 
                          type="number" 
                          value={honor.pph21} 
                          onChange={(e) => updateHonorDetail("mitra", index, "pph21", parseFloat(e.target.value) || 0)} 
                          placeholder="0" 
                          min="0" 
                          max="100" 
                          step="0.1"
                        />
                      </div>
                    </div>
                    
                    {/* Total Honor */}
                    <div className="space-y-2">
                      <Label>Total Honor (Rp)</Label>
                      <Input 
                        value={`Rp ${formatNumberWithSeparator(honor.totalHonor)}`} 
                        readOnly 
                        className="font-bold text-right bg-gray-50" 
                      />
                    </div>
                  </div>
                ))}

                {honorMitra.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-md">
                    <p className="text-muted-foreground">
                      Belum ada data honor mitra. Klik tombol "Tambah Mitra" untuk menambahkan.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grand Total & Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-orange-800">Total Honor Keseluruhan:</span>
                        <span className="text-2xl font-bold text-orange-600">
                          Rp {formatNumberWithSeparator(calculateGrandTotal())}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-orange-700">
                        <p>Organik: {honorOrganik.length} orang</p>
                        <p>Mitra: {honorMitra.length} orang</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleCancel}
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submitMutation.isPending} 
                      className="w-full"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <span className="animate-spin mr-2">⟳</span>
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan Dokumen"
                      )}
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

export default SPJHonor;