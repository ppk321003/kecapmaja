
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
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
import { toast } from "@/components/ui/use-toast";
import { TandaTerimaData, TandaTerimaItem } from "@/types";
import { useOrganikBPS, useMitraStatistik, useSaveDocument } from "@/hooks/use-database";
import { FormSelect } from "@/components/FormSelect";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

const TandaTerima = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get data from hooks
  const { data: organikBPSList = [] } = useOrganikBPS();
  const { data: mitraStatistikList = [] } = useMitraStatistik();
  const saveDocument = useSaveDocument();
  
  // Google Sheets submission hook
  const submitToSheets = useSubmitToSheets({ 
    documentType: "TandaTerima",
    onSuccess: () => {
      // Navigate after successful submission
      navigate("/buat-dokumen");
    }
  });

  // Define react-hook-form
  const { control, register, handleSubmit, formState: { errors }, watch, setValue } = useForm<TandaTerimaData>({
    defaultValues: {
      namaKegiatan: "",
      detail: "",
      tanggalPembuatanDaftar: format(new Date(), "yyyy-MM-dd"),
      pembuatDaftar: "",
      organikBPS: [],
      mitraStatistik: [],
      daftarItem: [
        // Explicitly define each required field with non-null initial values
        {
          namaItem: "",
          banyaknya: 1,
          satuan: ""
        }
      ],
    },
  });

  // Add field array for daftarItem
  const { fields, append, remove } = useFieldArray({
    control,
    name: "daftarItem",
  });

  const onSubmit = async (data: TandaTerimaData) => {
    setIsSubmitting(true);
    try {
      // First, save to Supabase
      await saveDocument.mutateAsync({
        jenisId: "00000000-0000-0000-0000-000000000008", // ID for Tanda Terima in the jenis table
        title: `Tanda Terima - ${data.namaKegiatan}`,
        data,
      });
      
      // Then, submit to Google Sheets
      await submitToSheets.mutateAsync(data);
      
      toast({
        title: "Dokumen berhasil dibuat",
        description: "Tanda terima telah tersimpan",
      });
      
      navigate("/buat-dokumen");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: "Terjadi kesalahan saat menyimpan data",
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tanda Terima</h1>
          <p className="text-sm text-muted-foreground">
            Buat dokumen tanda terima
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan</Label>
                  <Input
                    id="namaKegiatan"
                    placeholder="Masukkan nama kegiatan"
                    {...register("namaKegiatan", { required: "Nama kegiatan harus diisi" })}
                  />
                  {errors.namaKegiatan && (
                    <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detail">Detail Kegiatan</Label>
                  <Input
                    id="detail"
                    placeholder="Masukkan detail kegiatan"
                    {...register("detail")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Pembuatan Daftar</Label>
                  <Controller
                    control={control}
                    name="tanggalPembuatanDaftar"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pembuatDaftar">Pembuat Daftar</Label>
                  <Controller
                    control={control}
                    name="pembuatDaftar"
                    rules={{ required: "Pembuat daftar harus dipilih" }}
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih pembuat daftar"
                        options={organikBPSList.map(item => ({
                          value: item.id,
                          label: item.name
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.pembuatDaftar && (
                    <p className="text-sm text-destructive">{errors.pembuatDaftar.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organikBPS">Organik BPS</Label>
                  <Controller
                    control={control}
                    name="organikBPS"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih organik BPS"
                        options={organikBPSList.map(item => ({
                          value: item.id,
                          label: item.name
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isMulti
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mitraStatistik">Mitra Statistik</Label>
                  <Controller
                    control={control}
                    name="mitraStatistik"
                    render={({ field }) => (
                      <FormSelect
                        placeholder="Pilih mitra statistik"
                        options={mitraStatistikList.map(item => ({
                          value: item.id,
                          label: item.name
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        isMulti
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Daftar Item</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddItem}
                  >
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
                              min: { value: 1, message: "Minimal 1" }
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
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/buat-dokumen")}>
                  Batal
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
