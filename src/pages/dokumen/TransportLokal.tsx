import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";

// Components
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { KomponenSelect } from "@/components/KomponenSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Hooks and Utilities
import { cn } from "@/lib/utils";
import { usePrograms, useKegiatan, useKRO, useRO, useKomponen, useAkun, useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { toast } from "@/hooks/use-toast";
import { useSubmitToSheets } from "@/hooks/use-google-sheets-submit";

// Types
interface TransportDetail {
  id: string;
  type: 'organik' | 'mitra';
  personId: string;
  name: string;
  kecamatanTujuan: string;
  tanggalPelaksanaan: Date;
}

// Form Schema
const formSchema = z.object({
  namaKegiatan: z.string().min(1, "Nama kegiatan harus diisi"),
  detil: z.string().optional(),
  program: z.string().min(1, "Program harus dipilih"),
  kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
  kro: z.string().min(1, "KRO harus dipilih"),
  ro: z.string().min(1, "RO harus dipilih"),
  komponen: z.string().min(1, "Komponen harus dipilih"),
  akun: z.string().min(1, "Akun harus dipilih"),
  tanggalPengajuan: z.date({
    required_error: "Tanggal pengajuan harus dipilih"
  }),
  pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih")
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = {
  namaKegiatan: "",
  detil: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  tanggalPengajuan: new Date(),
  pembuatDaftar: ""
};

const kecamatanOptions = [
  "Jatiwangi", 
  "Kasokandel", 
  "Ligung", 
  "Sumberjaya", 
  "Dawuan", 
  "Panyingkiran", 
  "Leuwimunding"
];

const TransportLokal = () => {
  const navigate = useNavigate();
  const [transportDetails, setTransportDetails] = useState<TransportDetail[]>([]);
  const [availableOrganik, setAvailableOrganik] = useState<any[]>([]);
  const [availableMitra, setAvailableMitra] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{type: 'organik' | 'mitra', id: string} | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES
  });

  // Data fetching hooks
  const { data: programList = [] } = usePrograms();
  const { data: kegiatanList = [] } = useKegiatan(form.watch("program") || null);
  const { data: kroList = [] } = useKRO(form.watch("kegiatan") || null);
  const { data: roList = [] } = useRO(form.watch("kro") || null);
  const { data: komponenList = [] } = useKomponen();
  const { data: akunList = [] } = useAkun();
  const { data: organikList = [], isLoading: organikLoading } = useOrganikBPS();
  const { data: mitraList = [], isLoading: mitraLoading } = useMitraStatistik();

  // Create name-to-object mappings
  const programsMap = Object.fromEntries((programList || []).map(item => [item.id, item.name]));
  const kegiatanMap = Object.fromEntries((kegiatanList || []).map(item => [item.id, item.name]));
  const kroMap = Object.fromEntries((kroList || []).map(item => [item.id, item.name]));
  const roMap = Object.fromEntries((roList || []).map(item => [item.id, item.name]));
  const komponenMap = Object.fromEntries((komponenList || []).map(item => [item.id, item.name]));
  const akunMap = Object.fromEntries((akunList || []).map(item => [item.id, item.name]));
  const organikMap = Object.fromEntries((organikList || []).map(item => [item.id, item.name]));
  const mitraMap = Object.fromEntries((mitraList || []).map(item => [item.id, item.name]));

  // Update available organik and mitra lists
  useEffect(() => {
    if (!organikLoading) {
      setAvailableOrganik(organikList.map(org => ({
        id: org.id,
        name: org.name,
        type: 'organik'
      })));
    }
  }, [organikList, organikLoading]);

  useEffect(() => {
    if (!mitraLoading) {
      setAvailableMitra(mitraList.map(mitra => ({
        id: mitra.id,
        name: mitra.name,
        kecamatan: mitra.kecamatan,
        type: 'mitra'
      })));
    }
  }, [mitraList, mitraLoading]);

  const submitMutation = useSubmitToSheets({
    documentType: "TransportLokal",
    onSuccess: () => {
      navigate("/buat-dokumen");
    }
  });

  // Handler functions
  const handleAddPerson = () => {
    if (!selectedPerson) {
      toast({
        variant: "destructive",
        title: "Gagal menambahkan",
        description: "Silakan pilih petugas terlebih dahulu"
      });
      return;
    }

    const { type, id } = selectedPerson;
    const personList = type === 'organik' ? organikList : mitraList;
    const person = personList.find(p => p.id === id);
    if (!person) return;

    // Validasi: nama + tanggal tidak boleh sama
    const hasDuplicate = transportDetails.some(detail => 
      detail.personId === id && 
      detail.tanggalPelaksanaan.toDateString() === new Date().toDateString()
    );

    if (hasDuplicate) {
      toast({
        variant: "destructive",
        title: "Gagal menambahkan",
        description: `${person.name} sudah memiliki jadwal di tanggal yang sama`
      });
      return;
    }

    const newDetail: TransportDetail = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      personId: id,
      name: person.name,
      kecamatanTujuan: "",
      tanggalPelaksanaan: new Date()
    };
    
    setTransportDetails(prev => [...prev, newDetail]);
    setSelectedPerson(null);
    setIsAddDialogOpen(false);
  };

  const removeTransportDetail = (id: string) => {
    setTransportDetails(prev => prev.filter(detail => detail.id !== id));
  };

  const handleTransportItemChange = (id: string, field: string, value: any) => {
    setTransportDetails(prev => prev.map(detail => {
      if (detail.id === id) {
        return { ...detail, [field]: value };
      }
      return detail;
    }));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (transportDetails.length === 0) {
        toast({
          variant: "destructive",
          title: "Daftar transport kosong",
          description: "Tambahkan minimal satu petugas"
        });
        return;
      }

      // Format data untuk spreadsheet
      const rows = transportDetails.map(detail => ({
        // Data utama dari form
        id: `trl-${format(new Date(), 'yyMMddHHmmss')}`,
        namaKegiatan: values.namaKegiatan,
        detil: values.detil || '',
        program: programsMap[values.program] || '',
        kegiatan: kegiatanMap[values.kegiatan] || '',
        kro: kroMap[values.kro] || '',
        ro: roMap[values.ro] || '',
        komponen: komponenMap[values.komponen] || '',
        akun: akunMap[values.akun] || '',
        tanggalPengajuan: format(values.tanggalPengajuan, 'dd/MM/yyyy'),
        pembuatDaftar: organikMap[values.pembuatDaftar] || '',
        
        // Data dari transport detail
        namaPetugas: detail.name,
        jenisPetugas: detail.type === 'organik' ? 'Organik BPS' : 'Mitra Statistik',
        kecamatanTujuan: detail.kecamatanTujuan,
        tanggalPelaksanaan: format(detail.tanggalPelaksanaan, 'dd/MM/yyyy'),
        
        // Data tambahan
        _timestamp: new Date().toISOString()
      }));

      const formData = {
        action: "append",
        sheetName: "TransportLokal",
        range: "A2:P",
        values: rows.map(row => [
          row.id,
          row.namaKegiatan,
          row.detil,
          row.program,
          row.kegiatan,
          row.kro,
          row.ro,
          row.komponen,
          row.akun,
          row.tanggalPengajuan,
          row.pembuatDaftar,
          row.namaPetugas,
          row.jenisPetugas,
          row.kecamatanTujuan,
          row.tanggalPelaksanaan,
          row._timestamp
        ])
      };

      console.log("Payload yang dikirim:", formData);
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

  // Transport Detail Card Component
  const TransportDetailCard = ({ detail }: { detail: TransportDetail }) => (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Nama */}
          <div className="col-span-4">
            <Label>Nama</Label>
            <div className="font-medium">{detail.name}</div>
            <p className="text-xs text-muted-foreground">
              {detail.type === 'organik' ? 'Organik BPS' : 'Mitra Statistik'}
            </p>
          </div>
          
          {/* Kecamatan Tujuan */}
          <div className="col-span-3">
            <Label>Kecamatan Tujuan</Label>
            <Select
              value={detail.kecamatanTujuan}
              onValueChange={value => handleTransportItemChange(
                detail.id,
                "kecamatanTujuan",
                value
              )}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                {kecamatanOptions.map(kec => (
                  <SelectItem key={kec} value={kec}>
                    {kec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tanggal Pelaksanaan */}
          <div className="col-span-4">
            <Label>Tanggal Pelaksanaan</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !detail.tanggalPelaksanaan && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {detail.tanggalPelaksanaan ? (
                    format(detail.tanggalPelaksanaan, "dd/MM/yyyy")
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={detail.tanggalPelaksanaan}
                  onSelect={date => handleTransportItemChange(
                    detail.id,
                    "tanggalPelaksanaan",
                    date || new Date()
                  )}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Delete Button */}
          <div className="col-span-1 flex justify-end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => removeTransportDetail(detail.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold">Transport Lokal</h1>
            <p className="text-sm text-muted-foreground">
              Formulir Transport Lokal Kegiatan
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader className="bg-gray-50 px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Informasi Kegiatan</h2>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nama Kegiatan */}
                    <div className="col-span-2">
                      <FormField 
                        control={form.control} 
                        name="namaKegiatan" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nama Kegiatan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan nama kegiatan" />
                            </FormControl>
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
                            <FormLabel>Detil Kegiatan</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Masukkan detil kegiatan" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>

                    {/* Program */}
                    <FormField 
                      control={form.control} 
                      name="program" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program</FormLabel>
                          <Select 
                            onValueChange={value => {
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
                              {programList.map(program => (
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
                            onValueChange={value => {
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
                            onValueChange={value => {
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
                            defaultValue={field.value} 
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih akun" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {akunList.map(akun => (
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {/* Transport Details Section */}
              <Card>
                <CardHeader className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h2 className="text-lg font-semibold">Daftar Transport</h2>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Tambah Pelaksana
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Tambah Pelaksana</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label>Jenis Pelaksana</Label>
                            <Select 
                              onValueChange={(value) => {
                                setSelectedPerson(prev => ({
                                  type: value as 'organik' | 'mitra',
                                  id: prev?.id || ''
                                }));
                              }}
                              value={selectedPerson?.type || ''}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis pelaksana" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="organik">Organik BPS</SelectItem>
                                <SelectItem value="mitra">Mitra Statistik</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedPerson?.type && (
                            <div className="space-y-2">
                              <Label>Nama Pelaksana</Label>
                              <Select
                                onValueChange={(value) => {
                                  setSelectedPerson(prev => ({
                                    ...prev!,
                                    id: value
                                  }));
                                }}
                                value={selectedPerson.id}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Pilih ${selectedPerson.type === 'organik' ? 'Organik BPS' : 'Mitra Statistik'}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(selectedPerson.type === 'organik' ? availableOrganik : availableMitra).map(person => (
                                    <SelectItem key={person.id} value={person.id}>
                                      {person.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsAddDialogOpen(false)}
                          >
                            Batal
                          </Button>
                          <Button 
                            onClick={handleAddPerson}
                            disabled={!selectedPerson?.id}
                          >
                            Tambahkan
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {transportDetails.length > 0 ? (
                    <div className="space-y-2">
                      {transportDetails.map((detail) => (
                        <TransportDetailCard key={detail.id} detail={detail} />
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Plus className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium">Belum ada data transport</p>
                      <p className="text-sm">Tambahkan pelaksana untuk membuat daftar transport</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/buat-dokumen")}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending}
                  className="w-full sm:w-auto bg-teal-800 hover:bg-teal-700"
                >
                  {submitMutation.isPending ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default TransportLokal;