import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TandaTerimaData, TandaTerimaItem } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  detail: z.string().min(1, "Detail wajib diisi"),
  tanggalPembuatanDaftar: z.string().min(1, "Tanggal pembuatan daftar wajib diisi"),
  pembuatDaftar: z.string().min(1, "Pembuat daftar wajib diisi"),
  organikBPS: z.array(z.string()).optional(),
  mitraStatistik: z.array(z.string()).optional(),
  daftarItem: z.array(
    z.object({
      namaItem: z.string().min(1, "Nama item wajib diisi"),
      banyaknya: z.number().min(1, "Banyaknya wajib diisi"),
      satuan: z.string().min(1, "Satuan wajib diisi"),
    })
  ),
});

const TandaTerima = () => {
  const navigate = useNavigate();
  const [selectedOrganik, setSelectedOrganik] = useState<string[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<string[]>([]);
  
  // Fetching data from database
  const { data: organikBPS = [] } = useOrganikBPS();
  const { data: mitraStatistik = [] } = useMitraStatistik();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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
          satuan: "",   
        },
      ] as TandaTerimaItem[], // Fixed: Using type assertion to ensure compatibility
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "daftarItem",
  });
  
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    // Fix TypeScript error by ensuring all required fields are present
    const formData: TandaTerimaData = {
      namaKegiatan: values.namaKegiatan,
      detail: values.detail,
      tanggalPembuatanDaftar: values.tanggalPembuatanDaftar,
      pembuatDaftar: values.pembuatDaftar,
      organikBPS: values.organikBPS || [],
      mitraStatistik: values.mitraStatistik || [],
      daftarItem: values.daftarItem,
    };
    
    console.log("Form Data:", formData);
    toast.success("Data berhasil disimpan!");
  };
  
  const toggleOrganik = (id: string) => {
    setSelectedOrganik((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
    
    const organikValues = form.getValues("organikBPS") || [];
    if (organikValues.includes(id)) {
      form.setValue(
        "organikBPS",
        organikValues.filter((item) => item !== id)
      );
    } else {
      form.setValue("organikBPS", [...organikValues, id]);
    }
  };
  
  const toggleMitra = (id: string) => {
    setSelectedMitra((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
    
    const mitraValues = form.getValues("mitraStatistik") || [];
    if (mitraValues.includes(id)) {
      form.setValue(
        "mitraStatistik",
        mitraValues.filter((item) => item !== id)
      );
    } else {
      form.setValue("mitraStatistik", [...mitraValues, id]);
    }
  };
  
  const handleAddItem = () => {
    append({
      namaItem: "", 
      banyaknya: 1, 
      satuan: "",   
    } as TandaTerimaItem); // Fixed: Using type assertion to ensure compatibility
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tanda Terima</h1>
            <p className="text-sm text-muted-foreground">
              Dokumen tanda terima barang/dokumen
            </p>
          </div>
          <div className="hidden md:block">
            <img 
              src="/lovable-uploads/1ef78670-6d2c-4f64-8c6e-149d6b9d2d19.png" 
              alt="Kecap Maja Logo" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Tanda Terima</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nama Kegiatan */}
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
                  
                  {/* Detail */}
                  <FormField
                    control={form.control}
                    name="detail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detail</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Masukkan detail kegiatan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Tanggal Pembuatan Daftar */}
                  <FormField
                    control={form.control}
                    name="tanggalPembuatanDaftar"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Pembuatan Daftar</FormLabel>
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
                                  format(new Date(field.value), "dd MMMM yyyy")
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
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) =>
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                              }
                              initialFocus
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
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih pembuat daftar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organikBPS.map((organik) => (
                              <SelectItem key={organik.id} value={organik.name}>
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
                
                {/* Item List */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Daftar Item</h3>
                    <Button type="button" onClick={handleAddItem} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" /> Tambah Item
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Item</TableHead>
                        <TableHead>Banyaknya</TableHead>
                        <TableHead>Satuan</TableHead>
                        <TableHead className="w-24">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`daftarItem.${index}.namaItem`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Nama item" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`daftarItem.${index}.banyaknya`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="Banyaknya" 
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`daftarItem.${index}.satuan`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Satuan" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            {fields.length > 1 && (
                              <Button 
                                type="button" 
                                onClick={() => remove(index)} 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Organik BPS Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Pilih Organik BPS</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {organikBPS.map((organik) => (
                      <div key={organik.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`organik-${organik.id}`}
                          checked={selectedOrganik.includes(organik.id)}
                          onCheckedChange={() => toggleOrganik(organik.id)}
                        />
                        <label
                          htmlFor={`organik-${organik.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {organik.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Mitra Statistik Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Pilih Mitra Statistik</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {mitraStatistik.map((mitra) => (
                      <div key={mitra.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mitra-${mitra.id}`}
                          checked={selectedMitra.includes(mitra.id)}
                          onCheckedChange={() => toggleMitra(mitra.id)}
                        />
                        <label
                          htmlFor={`mitra-${mitra.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {mitra.name}
                          {mitra.kecamatan && <span className="text-xs text-muted-foreground ml-1">({mitra.kecamatan})</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/buat-dokumen")}
                  >
                    Kembali
                  </Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TandaTerima;
