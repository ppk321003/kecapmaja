import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { TandaTerimaData, TandaTerimaItem } from "@/types";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { PersonMultiSelect, PersonSingleSelect, Person } from "@/components/PersonMultiSelect";
import { supabase } from "@/integrations/supabase/client";

const TandaTerima = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get data from hooks
  const {
    data: organikBPSList = []
  } = useOrganikBPS();
  const {
    data: mitraStatistikList = []
  } = useMitraStatistik();

  // Constants
  const TARGET_SPREADSHEET_ID = "1TbViG1lxButPEZ9rgU0aWBXWYN_8fyj3DRUqDyXawx8";
  const SHEET_NAME = "TandaTerima";

  // Custom hook untuk submit data
  const useSubmitTandaTerimaToSheets = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitData = async (data: any[]) => {
      setIsSubmitting(true);
      try {
        console.log('📤 Submitting tanda terima data to sheets:', data);
        
        const { data: result, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: TARGET_SPREADSHEET_ID,
            operation: "append",
            range: `${SHEET_NAME}!A:AQ`,
            values: [data]
          }
        });

        if (error) {
          console.error('❌ Error submitting tanda terima:', error);
          throw error;
        }

        console.log('✅ Tanda terima submission successful:', result);
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
  const getNextSequenceNumber = async (): Promise<number> => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TARGET_SPREADSHEET_ID,
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

  // Fungsi untuk generate ID tanda terima (tt-yymmxxx)
  const generateTandaTerimaId = async (): Promise<string> => {
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `tt-${year}${month}`;

      // Ambil semua data untuk mencari nomor terakhir di bulan ini
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TARGET_SPREADSHEET_ID,
          operation: "read",
          range: `${SHEET_NAME}!B:B`
        }
      });

      if (error) {
        console.error("Error fetching tanda terima IDs:", error);
        throw new Error("Gagal mengambil ID tanda terima terakhir");
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
      console.error("Error generating tanda terima ID:", error);
      throw error;
    }
  };

  const { submitData, isSubmitting: isSubmitLoading } = useSubmitTandaTerimaToSheets();

  // Define react-hook-form
  const {
    control,
    register,
    handleSubmit,
    formState: {
      errors
    },
    watch,
    setValue
  } = useForm<TandaTerimaData>({
    defaultValues: {
      namaKegiatan: "",
      detail: "",
      tanggalPembuatanDaftar: format(new Date(), "yyyy-MM-dd"),
      pembuatDaftar: "",
      organikBPS: [],
      mitraStatistik: [],
      daftarItem: [
      {
        namaItem: "",
        banyaknya: 1,
        satuan: ""
      }]
    }
  });

  // For name mapping
  const [pembuatDaftarName, setPembuatDaftarName] = useState<string>("");
  const [organikNameMap, setOrganikNameMap] = useState<Record<string, string>>({});
  const [mitraNameMap, setMitraNameMap] = useState<Record<string, string>>({});

  // Effect to update name mappings when selections change
  useEffect(() => {
    // Update pembuat daftar name
    const pembuatId = watch('pembuatDaftar');
    if (pembuatId) {
      const pembuat = organikBPSList.find(item => item.id === pembuatId);
      setPembuatDaftarName(pembuat?.name || "");
    }

    // Update organik name mapping
    const organikIds = watch('organikBPS') || [];
    const newOrganikNameMap: Record<string, string> = {};
    organikIds.forEach(id => {
      const organik = organikBPSList.find(item => item.id === id);
      if (organik) {
        newOrganikNameMap[id] = organik.name;
      }
    });
    setOrganikNameMap(newOrganikNameMap);

    // Update mitra name mapping
    const mitraIds = watch('mitraStatistik') || [];
    const newMitraNameMap: Record<string, string> = {};
    mitraIds.forEach(id => {
      const mitra = mitraStatistikList.find(item => item.id === id);
      if (mitra) {
        newMitraNameMap[id] = mitra.name;
      }
    });
    setMitraNameMap(newMitraNameMap);
  }, [watch('pembuatDaftar'), watch('organikBPS'), watch('mitraStatistik'), organikBPSList, mitraStatistikList]);

  // Add field array for daftarItem
  const {
    fields,
    append,
    remove
  } = useFieldArray({
    control,
    name: "daftarItem"
  });

  const formatTanggalIndonesia = (date: Date | null): string => {
    if (!date) return "";
    
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'long' });
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const onSubmit = async (data: TandaTerimaData) => {
    setIsSubmitting(true);
    try {
      // Generate nomor urut baru dan ID tanda terima
      const sequenceNumber = await getNextSequenceNumber();
      const tandaTerimaId = await generateTandaTerimaId();

      // Prepare data for spreadsheet submission
      const pembuatDaftar = organikBPSList.find(item => item.id === data.pembuatDaftar);
      const organikNames = Object.values(organikNameMap).join(" | ");
      const mitraNames = Object.values(mitraNameMap).join(" | ");

      // Generate array for 15 items (sesuai header)
      const itemsArray = [];
      for (let i = 0; i < 15; i++) {
        const item = data.daftarItem[i];
        if (item) {
          itemsArray.push(
            item.namaItem || "",
            item.banyaknya?.toString() || "",
            item.satuan || ""
          );
        } else {
          itemsArray.push("", "", ""); // Empty values for unused items
        }
      }

      // Format data sesuai struktur spreadsheet
      const rowData = [
        sequenceNumber, // Kolom 1: No
        tandaTerimaId, // Kolom 2: Id (tt-yymmxxx)
        data.namaKegiatan, // Kolom 3: Nama Kegiatan
        data.detail || "", // Kolom 4: Detail Kegiatan
        formatTanggalIndonesia(new Date(data.tanggalPembuatanDaftar)), // Kolom 5: Tanggal Pembuatan Daftar
        pembuatDaftar?.name || data.pembuatDaftar, // Kolom 6: Pembuat Daftar
        organikNames, // Kolom 7: Organik
        mitraNames, // Kolom 8: Mitra Statistik
        ...itemsArray // Kolom 9-53: 15 items × 3 fields = 45 fields
      ];

      console.log('📋 Final tanda terima data array:', rowData);
      console.log('🔢 Total columns:', rowData.length);
      console.log('🆔 Tanda Terima ID:', tandaTerimaId);

      // Submit to Google Sheets
      await submitData(rowData);

      toast({
        title: "Berhasil",
        description: `Tanda terima berhasil disimpan (ID: ${tandaTerimaId})`
      });
      navigate("/e-dokumen/buat");

    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: error.message || "Terjadi kesalahan saat menyimpan data"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = () => {
    // Make sure all required fields are defined when adding new items
    append({
      namaItem: "",
      banyaknya: 1,
      satuan: ""
    });
  };

  const isLoading = isSubmitting || isSubmitLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-orange-600">Tanda Terima</h1>
          <p className="text-sm text-muted-foreground">
            Buat dokumen tanda terima
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan<br />
                  (cth:Perlengkapan Pelatihan Petugas Pemutakhiran Perkembangan Desa Tahun 2025)</Label>
                  <Input id="namaKegiatan" placeholder="Masukkan nama kegiatan" {...register("namaKegiatan", {
                  required: "Nama kegiatan harus diisi"
                })} />
                  {errors.namaKegiatan && <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail">Detail Kegiatan<br />
                  (cth:Pemutakhiran Perkembangan Desa Tahun 2025)</Label>
                  <Input id="detail" placeholder="Masukkan detail kegiatan" {...register("detail")} />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Pembuatan Daftar</Label>
                  <Controller control={control} name="tanggalPembuatanDaftar" render={({
                  field
                }) => <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={date => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pembuatDaftar">Pembuat Daftar</Label>
                  <Controller control={control} name="pembuatDaftar" rules={{
                  required: "Pembuat daftar harus dipilih"
                }} render={({
                  field
                }) => <PersonSingleSelect 
                  placeholder="Pilih pembuat daftar" 
                  options={organikBPSList.map(item => ({
                    id: item.id,
                    name: item.name,
                    jabatan: (item as any).jabatan
                  } as Person))} 
                  value={field.value} 
                  onValueChange={field.onChange} 
                />} />
                  {errors.pembuatDaftar && <p className="text-sm text-destructive">{errors.pembuatDaftar.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organikBPS">Organik BPS</Label>
                  <Controller control={control} name="organikBPS" render={({
                  field
                }) => <PersonMultiSelect 
                  placeholder="Pilih organik BPS" 
                  options={organikBPSList.map(item => ({
                    id: item.id,
                    name: item.name,
                    jabatan: (item as any).jabatan
                  } as Person))} 
                  value={field.value} 
                  onValueChange={field.onChange}
                  type="organik"
                />} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mitraStatistik">Mitra Statistik</Label>
                  <Controller control={control} name="mitraStatistik" render={({
                  field
                }) => <PersonMultiSelect 
                  placeholder="Pilih mitra statistik" 
                  options={mitraStatistikList.map(item => ({
                    id: item.id,
                    name: item.name,
                    kecamatan: (item as any).kecamatan
                  } as Person))} 
                  value={field.value} 
                  onValueChange={field.onChange}
                  type="mitra"
                />} />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Daftar Item</h3>
                  <Button type="button" variant="default" size="sm" onClick={handleAddItem}>
                    <Plus className="mr-1 h-4 w-4" /> Tambah Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Item {index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => remove(index)} 
                          disabled={fields.length <= 1}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`daftarItem.${index}.namaItem`}>Nama Item</Label>
                          <Input 
                            id={`daftarItem.${index}.namaItem`} 
                            placeholder="Masukkan nama item" 
                            {...register(`daftarItem.${index}.namaItem` as const, {
                              required: "Nama item harus diisi"
                            })} 
                          />
                          {errors.daftarItem?.[index]?.namaItem && (
                            <p className="text-sm text-destructive">
                              {errors.daftarItem[index]?.namaItem?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`daftarItem.${index}.banyaknya`}>Banyaknya</Label>
                          <Input 
                            id={`daftarItem.${index}.banyaknya`} 
                            type="number" 
                            placeholder="Masukkan jumlah" 
                            {...register(`daftarItem.${index}.banyaknya` as const, {
                              required: "Jumlah harus diisi",
                              valueAsNumber: true,
                              min: {
                                value: 1,
                                message: "Minimal 1"
                              }
                            })} 
                          />
                          {errors.daftarItem?.[index]?.banyaknya && (
                            <p className="text-sm text-destructive">
                              {errors.daftarItem[index]?.banyaknya?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`daftarItem.${index}.satuan`}>Satuan</Label>
                          <Input 
                            id={`daftarItem.${index}.satuan`} 
                            placeholder="Masukkan satuan" 
                            {...register(`daftarItem.${index}.satuan` as const, {
                              required: "Satuan harus diisi"
                            })} 
                          />
                          {errors.daftarItem?.[index]?.satuan && (
                            <p className="text-sm text-destructive">
                              {errors.daftarItem[index]?.satuan?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex space-x-4">
                <Button type="button" variant="outline" onClick={() => navigate("/e-dokumen/buat")}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TandaTerima;