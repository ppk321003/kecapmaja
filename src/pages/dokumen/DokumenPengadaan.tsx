
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import Layout from "@/components/Layout";
import { useSaveDocument } from "@/hooks/use-database";
import { CalendarIcon } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DokumenPengadaan, METODE_PENGADAAN, BENTUK_KONTRAK, JENIS_KONTRAK, CARA_PEMBAYARAN } from "@/types";

const formSchema = z.object({
  kodeKegiatan: z.string().min(1, "Kode kegiatan wajib diisi"),
  namaPaket: z.string().min(1, "Nama paket pengadaan wajib diisi"),
  tanggalMulai: z.date({
    required_error: "Tanggal mulai harus diisi",
  }),
  tanggalSelesai: z.date({
    required_error: "Tanggal selesai harus diisi",
  }),
  spesifikasiTeknis: z.string().min(1, "Spesifikasi teknis wajib diisi"),
  volume: z.number().min(1, "Volume harus lebih dari 0"),
  satuan: z.enum(["O-H", "O-P", "O-K", "Unit", "SET"]),
  hargaSatuanAwal: z.number().min(0, "Harga satuan awal tidak boleh negatif"),
  hargaSatuanNego: z.number().min(0, "Harga satuan nego tidak boleh negatif"),
  metodePengadaan: z.string().min(1, "Metode pengadaan wajib dipilih"),
  bentukKontrak: z.string().min(1, "Bentuk/bukti kontrak wajib dipilih"),
  jenisKontrak: z.string().min(1, "Jenis kontrak wajib dipilih"),
  caraPembayaran: z.string().min(1, "Cara pembayaran wajib dipilih"),
  uangMuka: z.number().min(0, "Uang muka tidak boleh negatif"),
  nomorFormulirPermintaan: z.string().min(1, "Nomor formulir permintaan wajib diisi"),
  tanggalFormulirPermintaan: z.date({
    required_error: "Tanggal formulir permintaan harus diisi",
  }),
  tanggalKAK: z.date({
    required_error: "Tanggal KAK harus diisi",
  }),
  nomorKertasKerjaHPS: z.string().min(1, "Nomor kertas kerja HPS wajib diisi"),
  namaPenyedia: z.string().min(1, "Nama penyedia wajib diisi"),
  namaPerwakilanPenyedia: z.string().min(1, "Nama perwakilan penyedia wajib diisi"),
  jabatan: z.string().min(1, "Jabatan wajib diisi"),
  alamatPenyedia: z.string().min(1, "Alamat penyedia wajib diisi"),
  namaBank: z.string().min(1, "Nama bank wajib diisi"),
  nomorRekening: z.string().min(1, "Nomor rekening wajib diisi"),
  atasNamaRekening: z.string().min(1, "Atas nama rekening wajib diisi"),
  npwpPenyedia: z.string().min(1, "NPWP penyedia wajib diisi"),
  nomorSuratPenawaran: z.string().min(1, "Nomor surat penawaran wajib diisi"),
  nomorSuratPermohonan: z.string().min(1, "Nomor surat permohonan wajib diisi"),
  nomorInvoice: z.string().min(1, "Nomor invoice wajib diisi"),
});

const DokumenPengadaan = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kodeKegiatan: "",
      namaPaket: "",
      spesifikasiTeknis: "",
      volume: 1,
      satuan: "Unit",
      hargaSatuanAwal: 0,
      hargaSatuanNego: 0,
      metodePengadaan: "",
      bentukKontrak: "",
      jenisKontrak: "",
      caraPembayaran: "",
      uangMuka: 0,
      nomorFormulirPermintaan: "",
      nomorKertasKerjaHPS: "",
      namaPenyedia: "",
      namaPerwakilanPenyedia: "",
      jabatan: "",
      alamatPenyedia: "",
      namaBank: "",
      nomorRekening: "",
      atasNamaRekening: "",
      npwpPenyedia: "",
      nomorSuratPenawaran: "",
      nomorSuratPermohonan: "",
      nomorInvoice: "",
    },
  });
  
  const { mutateAsync: saveDocument } = useSaveDocument();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Format dates to strings for storage
      const formData: DokumenPengadaan = {
        ...values,
        tanggalMulai: format(values.tanggalMulai, 'yyyy-MM-dd'),
        tanggalSelesai: format(values.tanggalSelesai, 'yyyy-MM-dd'),
        tanggalFormulirPermintaan: format(values.tanggalFormulirPermintaan, 'yyyy-MM-dd'),
        tanggalKAK: format(values.tanggalKAK, 'yyyy-MM-dd'),
      };
      
      const result = await saveDocument({
        jenisId: "dokumen_pengadaan", 
        title: `Dokumen Pengadaan - ${values.namaPaket}`,
        data: formData
      });
      
      toast({
        title: "Berhasil!",
        description: "Dokumen Pengadaan berhasil disimpan.",
      });
      
      form.reset();
      
    } catch (error) {
      console.error("Error saving document:", error);
      toast({
        variant: "destructive",
        title: "Gagal!",
        description: "Terjadi kesalahan saat menyimpan dokumen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dokumen Pengadaan</h1>
            <p className="text-muted-foreground">
              Formulir pembuatan dokumen pengadaan barang dan jasa
            </p>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              {/* Informasi Umum Pengadaan */}
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Umum Pengadaan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="kodeKegiatan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kode Kegiatan</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan kode kegiatan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="namaPaket"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Paket Pengadaan</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nama paket" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tanggalMulai"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal Mulai Pelaksanaan</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    field.value ? "" : "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMMM yyyy")
                                  ) : (
                                    "Pilih tanggal"
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
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tanggalSelesai"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal Selesai Pelaksanaan</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    field.value ? "" : "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMMM yyyy")
                                  ) : (
                                    "Pilih tanggal"
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
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Detail Spesifikasi dan Harga */}
              <Card>
                <CardHeader>
                  <CardTitle>Detail Spesifikasi dan Harga</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name="spesifikasiTeknis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Spesifikasi Teknis</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Masukkan spesifikasi teknis" 
                                className="min-h-[200px]" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="volume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Volume</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                              placeholder="Masukkan volume" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="satuan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Satuan</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih satuan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="O-H">O-H (Orang-Hari)</SelectItem>
                              <SelectItem value="O-P">O-P (Orang-Paket)</SelectItem>
                              <SelectItem value="O-K">O-K (Orang-Kegiatan)</SelectItem>
                              <SelectItem value="Unit">Unit</SelectItem>
                              <SelectItem value="SET">SET</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hargaSatuanAwal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harga Satuan Awal</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                              placeholder="Masukkan harga satuan awal" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="hargaSatuanNego"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harga Satuan Setelah Nego</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                              placeholder="Masukkan harga satuan setelah nego" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Metode dan Kontrak */}
              <Card>
                <CardHeader>
                  <CardTitle>Metode dan Kontrak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="metodePengadaan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metode Pengadaan</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih metode pengadaan" />
                            </SelectTrigger>
                            <SelectContent>
                              {METODE_PENGADAAN.map((metode) => (
                                <SelectItem key={metode} value={metode}>
                                  {metode}
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
                      name="bentukKontrak"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bentuk/Bukti Kontrak</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih bentuk/bukti kontrak" />
                            </SelectTrigger>
                            <SelectContent>
                              {BENTUK_KONTRAK.map((bentuk) => (
                                <SelectItem key={bentuk} value={bentuk}>
                                  {bentuk}
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
                      name="jenisKontrak"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jenis Kontrak</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis kontrak" />
                            </SelectTrigger>
                            <SelectContent>
                              {JENIS_KONTRAK.map((jenis) => (
                                <SelectItem key={jenis} value={jenis}>
                                  {jenis}
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
                      name="caraPembayaran"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cara Pembayaran</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih cara pembayaran" />
                            </SelectTrigger>
                            <SelectContent>
                              {CARA_PEMBAYARAN.map((cara) => (
                                <SelectItem key={cara} value={cara}>
                                  {cara}
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
                      name="uangMuka"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uang Muka</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                              placeholder="Masukkan jumlah uang muka" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Dokumen Pengadaan */}
              <Card>
                <CardHeader>
                  <CardTitle>Dokumen Pengadaan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="nomorFormulirPermintaan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Formulir Permintaan</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nomor formulir" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tanggalFormulirPermintaan"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal Formulir Permintaan</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    field.value ? "" : "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMMM yyyy")
                                  ) : (
                                    "Pilih tanggal"
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
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tanggalKAK"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal Kerangka Acuan Kerja (KAK)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${
                                    field.value ? "" : "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(field.value, "dd MMMM yyyy")
                                  ) : (
                                    "Pilih tanggal"
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
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nomorKertasKerjaHPS"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Kertas Kerja Penyusunan HPS</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Contoh: 001/PPK/3210/PL.300/KSA/12/2024" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Informasi Penyedia */}
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Penyedia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="namaPenyedia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Penyedia Barang/Jasa</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nama penyedia" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="namaPerwakilanPenyedia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Perwakilan Penyedia</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nama perwakilan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="jabatan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jabatan</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan jabatan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="alamatPenyedia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alamat Penyedia</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Masukkan alamat penyedia" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="namaBank"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Bank</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nama bank" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nomorRekening"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Rekening</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nomor rekening" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="atasNamaRekening"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Atas Nama Rekening</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan atas nama rekening" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="npwpPenyedia"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NPWP Penyedia</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan NPWP penyedia" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Informasi Surat */}
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Surat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="nomorSuratPenawaran"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Surat Penawaran Harga</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nomor surat penawaran" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nomorSuratPermohonan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Surat Permohonan Pembayaran</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nomor surat permohonan" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nomorInvoice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor Invoice Pembayaran</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Masukkan nomor invoice" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default DokumenPengadaan;
