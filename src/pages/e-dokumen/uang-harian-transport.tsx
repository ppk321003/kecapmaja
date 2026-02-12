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
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { KomponenSelect } from "@/components/KomponenSelect";
import { AkunSelect } from "@/components/AkunSelect";
import { PersonMultiSelect, PersonSingleSelect, Person } from "@/components/PersonMultiSelect";
import { supabase } from "@/integrations/supabase/client";
import { formatNumberWithSeparator } from "@/lib/formatNumber";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

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
  trainingCenter: z.string().min(1, "Training center harus diisi"),
  tanggalMulai: z.date({
    required_error: "Tanggal mulai harus dipilih"
  }),
  tanggalSelesai: z.date({
    required_error: "Tanggal selesai harus dipilih"
  }),
  tanggalSpj: z.date({
    required_error: "Tanggal SPJ harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus diisi"),
  organik: z.array(z.string()).min(1, "Minimal harus ada 1 organik"),
  mitra: z.array(z.string()).min(1, "Minimal harus ada 1 mitra")
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
  trainingCenter: "",
  tanggalMulai: undefined,
  tanggalSelesai: undefined,
  tanggalSpj: undefined,
  pembuatDaftar: "",
  organik: [],
  mitra: []
};

// Constants
const DEFAULT_TARGET_SPREADSHEET_ID = "1-cJGkEqcBDzQ1n8RgdxByEHRk3ZG9Iax8YDhwi3kPIg";
const SHEET_NAME = "UangHarianTransport";

const getTargetSheetId = (contextValue?: string): string => {
  return contextValue || DEFAULT_TARGET_SPREADSHEET_ID;
};

const trainingCenterOptions = ["BPS Kabupaten Majalengka", "RM. Majalengka", "Fitra Hotel", "Garden Hotel", "Horison Ultima", "Achiera Hotel"];
const jenisOptions = ["Fullday", "Fullboard"];

// Custom hook untuk submit data
const useSubmitUangHarianTransportToSheets = (targetSheetId: string = DEFAULT_TARGET_SPREADSHEET_ID) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      console.log('📤 Submitting uang harian transport data to sheets:', data);
      
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: targetSheetId,
          operation: "append",
          range: `${SHEET_NAME}!A:Q`,
          values: [data]
        }
      });

      if (error) {
        console.error('❌ Error submitting uang harian transport:', error);
        throw error;
      }

      console.log('✅ Uang harian transport submission successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitData, isSubmitting };
};

// Fungsi untuk mendapatkan nomor urut berikutnya
const getNextSequenceNumber = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: `${SHEET_NAME}!A:A`
      }
    });

    if (error) {
      console.error("Error fetching sequence numbers:", error);
      throw new Error("Gagal mengambil nomor urut terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      return 1;
    }

    const sequenceNumbers = values
      .slice(1)
      .map((row: any[]) => {
        const value = row[0];
        if (typeof value === 'string' && value.trim() !== '') {
          const num = parseInt(value);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter(num => num > 0);

    if (sequenceNumbers.length === 0) {
      return 1;
    }

    return Math.max(...sequenceNumbers) + 1;
  } catch (error) {
    console.error("Error generating sequence number:", error);
    throw error;
  }
};

// Fungsi untuk generate ID uang harian transport (uht-yymmxxx)
const generateUangHarianTransportId = async (targetId: string = DEFAULT_TARGET_SPREADSHEET_ID): Promise<string> => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `uht-${year}${month}`;

    // Ambil semua data untuk mencari nomor terakhir di bulan ini
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: targetId,
        operation: "read",
        range: `${SHEET_NAME}!B:B`
      }
    });

    if (error) {
      console.error("Error fetching uang harian transport IDs:", error);
      throw new Error("Gagal mengambil ID uang harian transport terakhir");
    }

    const values = data?.values || [];
    
    if (values.length <= 1) {
      return `${prefix}001`;
    }

    // Filter ID yang sesuai dengan prefix bulan ini
    const currentMonthIds = values
      .slice(1)
      .map((row: any[]) => row[1]) // Kolom B adalah ID
      .filter((id: string) => id && id.startsWith(prefix))
      .map((id: string) => {
        const numStr = id.replace(prefix, '');
        const num = parseInt(numStr);
        return isNaN(num) ? 0 : num;
      })
      .filter(num => num > 0);

    if (currentMonthIds.length === 0) {
      return `${prefix}001`;
    }

    const nextNum = Math.max(...currentMonthIds) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("Error generating uang harian transport ID:", error);
    throw error;
  }
};

const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

const UangHarianTransport = () => {
  const navigate = useNavigate();
  const satkerContext = useSatkerConfigContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<any[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<any[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Data queries
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

  const targetSheetId = getTargetSheetId(satkerContext?.getUserSatkerSheetId('uh'));
  const { submitData, isSubmitting: isSubmitLoading } = useSubmitUangHarianTransportToSheets(targetSheetId);

  // Effect untuk update selected organik dan mitra
  useEffect(() => {
    const organikIds = form.watch('organik') || [];
    const mitraIds = form.watch('mitra') || [];
    
    const updatedOrganik = organikIds.map(id => 
      organikList.find(item => item.id === id)
    ).filter(Boolean);
    
    const updatedMitra = mitraIds.map(id => 
      mitraList.find(item => item.id === id)
    ).filter(Boolean);
    
    setSelectedOrganik(updatedOrganik);
    setSelectedMitra(updatedMitra);
  }, [form.watch('organik'), form.watch('mitra'), organikList, mitraList]);

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Generate nomor urut baru dan ID uang harian transport
      const sequenceNumber = await getNextSequenceNumber(targetSheetId);
      const uangHarianTransportId = await generateUangHarianTransportId(targetSheetId);

      // Get names for display
      const programName = programs.find(p => p.id === data.program)?.name.split(' - ')[1] || data.program;
      const kegiatanName = kegiatanList.find(k => k.id === data.kegiatan)?.name.split(' - ')[1] || data.kegiatan;
      const kroName = kroList.find(k => k.id === data.kro)?.name.split(' - ')[1] || data.kro;
      const roName = roList.find(r => r.id === data.ro)?.name.split(' - ')[1] || data.ro;
      const komponenName = komponenList.find(k => k.id === data.komponen)?.name.split(' - ')[1] || data.komponen;
      const akunName = akunList.find(a => a.id === data.akun)?.name.split(' - ')[1] || data.akun;
      const pembuatDaftarName = organikList.find(o => o.id === data.pembuatDaftar)?.name || data.pembuatDaftar;

      // Format data sesuai struktur spreadsheet
      const satkerConfig = satkerContext?.getUserSatkerConfig();
      const satkerId = satkerConfig?.satker_id || "";
      
      const rowData = [
        sequenceNumber, // Kolom 1: No
        uangHarianTransportId, // Kolom 2: Id (uht-yymmxxx)
        satkerId, // Kolom 3: Satker ID
        data.namaKegiatan, // Kolom 4: Nama Kegiatan
        data.detil || "", // Kolom 5: Detil
        data.jenis, // Kolom 6: Jenis
        programName, // Kolom 7: Program
        kegiatanName, // Kolom 8: Kegiatan
        kroName, // Kolom 9: KRO
        roName, // Kolom 10: RO
        komponenName, // Kolom 11: Komponen
        akunName, // Kolom 12: Akun
        data.trainingCenter, // Kolom 13: Training Center
        formatTanggalIndonesia(data.tanggalMulai), // Kolom 14: Tanggal Mulai
        formatTanggalIndonesia(data.tanggalSelesai), // Kolom 15: Tanggal Selesai
        formatTanggalIndonesia(data.tanggalSpj), // Kolom 16: Tanggal (SPJ)
        pembuatDaftarName, // Kolom 17: Pembuat Daftar
        selectedOrganik.map(org => org.name).join(" | "), // Kolom 18: Organik
        selectedMitra.map(mitra => mitra.name).join(" | ") // Kolom 19: Mitra Statistik
      ];

      console.log('📋 Final uang harian transport data array:', rowData);
      console.log('🔢 Total columns:', rowData.length);
      console.log('🆔 Uang Harian Transport ID:', uangHarianTransportId);

      // Submit to Google Sheets
      await submitData(rowData);

      toast({
        title: "Berhasil",
        description: `Uang Harian Transport berhasil disimpan (ID: ${uangHarianTransportId})`
      });
      navigate("/e-dokumen/buat");

    } catch (error: any) {
      console.error("Error saving Uang Harian Transport:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeOrganik = (id: string) => {
    const currentOrganik = form.watch('organik') || [];
    const updatedOrganik = currentOrganik.filter(orgId => orgId !== id);
    form.setValue('organik', updatedOrganik);
  };

  const removeMitra = (id: string) => {
    const currentMitra = form.watch('mitra') || [];
    const updatedMitra = currentMitra.filter(mitraId => mitraId !== id);
    form.setValue('mitra', updatedMitra);
  };

  const isLoading = isSubmitting || isSubmitLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">Uang Harian Transport</h1>
          <p className="text-sm text-muted-foreground">Formulir Uang Harian Transport Kegiatan</p>
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
                      <FormLabel>Nama Kegiatan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Masukkan nama kegiatan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                  
                  {/* Detil */}
                  <FormField control={form.control} name="detil" render={({
                  field
                }) => <FormItem className="col-span-2">
                      <FormLabel>Detil</FormLabel>
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
                          {jenisOptions.map(jenis => (
                            <SelectItem key={jenis} value={jenis}>
                              {jenis}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                  {/* Training Center */}
                  <FormField control={form.control} name="trainingCenter" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Training Center</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nama training center" {...field} />
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
                  }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {programs.map(program => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name.split(' - ')[1] || program.name}
                            </SelectItem>
                          ))}
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
                          {kegiatanList.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name.split(' - ')[1] || item.name}
                            </SelectItem>
                          ))}
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
                          {kroList.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name.split(' - ')[1] || item.name}
                            </SelectItem>
                          ))}
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
                          {roList.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name.split(' - ')[1] || item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                  {/* Komponen */}
                  <FormField control={form.control} name="komponen" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Komponen</FormLabel>
                      <KomponenSelect value={field.value} onValueChange={field.onChange} />
                      <FormMessage />
                    </FormItem>} />

                  {/* Akun */}
                  <FormField control={form.control} name="akun" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Akun</FormLabel>
                      <FormControl>
                        <AkunSelect value={field.value} onValueChange={field.onChange} />
                      </FormControl>
                       <FormMessage />
                     </FormItem>} />

                   {/* Tanggal Mulai */}
                  <FormField control={form.control} name="tanggalMulai" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Tanggal Mulai</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>} />

                  {/* Tanggal Selesai */}
                  <FormField control={form.control} name="tanggalSelesai" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Tanggal Selesai</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                              {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>} />

                  {/* Pembuat Daftar */}
                  <FormField control={form.control} name="pembuatDaftar" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Pembuat Daftar</FormLabel>
                      <FormControl>
                        <PersonSingleSelect
                          placeholder="Pilih pembuat daftar"
                          options={organikList.map(item => ({
                            id: item.id,
                            name: item.name,
                            jabatan: (item as any).jabatan
                          } as Person))}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                </div>
              </CardContent>
            </Card>

            {/* Peserta Organik dan Mitra */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Peserta Organik */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-medium">Peserta Organik BPS</h2>
                  
                  <div className="space-y-2">
                    <FormField control={form.control} name="organik" render={({
                    field
                  }) => <PersonMultiSelect 
                      placeholder="Pilih organik BPS" 
                      options={organikList.map(item => ({
                        id: item.id,
                        name: item.name,
                        jabatan: (item as any).jabatan
                      } as Person))} 
                      value={field.value} 
                      onValueChange={field.onChange}
                      type="organik"
                    />} />
                  </div>
                  
                  {/* Daftar peserta organik yang sudah dipilih */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedOrganik.map(org => (
                      <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.jabatan}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOrganik(org.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Peserta Mitra */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-medium">Peserta Mitra Statistik</h2>
                  
                  <div className="space-y-2">
                    <FormField control={form.control} name="mitra" render={({
                    field
                  }) => <PersonMultiSelect 
                      placeholder="Pilih mitra statistik" 
                      options={mitraList.map(item => ({
                        id: item.id,
                        name: item.name,
                        kecamatan: (item as any).kecamatan
                      } as Person))} 
                      value={field.value} 
                      onValueChange={field.onChange}
                      type="mitra"
                    />} />
                  </div>
                  
                  {/* Daftar peserta mitra yang sudah dipilih */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedMitra.map(mitra => (
                      <div key={mitra.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{mitra.name}</p>
                          <p className="text-sm text-muted-foreground">{mitra.kecamatan}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMitra(mitra.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ringkasan Peserta */}
            {(selectedOrganik.length > 0 || selectedMitra.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium mb-4">
                    Ringkasan Peserta ({selectedOrganik.length + selectedMitra.length} orang)
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 text-green-600">
                        Organik BPS ({selectedOrganik.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedOrganik.map(org => (
                          <div key={org.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{org.name}</span>
                            <span className="text-xs text-muted-foreground">{org.jabatan}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 text-blue-600">
                        Mitra Statistik ({selectedMitra.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedMitra.map(mitra => (
                          <div key={mitra.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{mitra.name}</span>
                            <span className="text-xs text-muted-foreground">{mitra.kecamatan}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tombol Aksi */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-end gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/e-dokumen/buat")}
                    disabled={isLoading}
                    className="min-w-24"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="min-w-32"
                  >
                    {isLoading ? "Menyimpan..." : "Simpan Dokumen"}
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

export default UangHarianTransport;