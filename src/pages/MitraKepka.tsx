import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { Users, Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

// Master data sheets are SHARED across all satkers - use satker 3210 default (column G in satker_config)
const DEFAULT_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const MASTER_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const kecamatanList = ["Argapura", "Banjaran", "Bantarujeg", "Cigasong", "Cikijing", "Cingambul", "Dawuan", "Jatitujuh", "Jatiwangi", "Kadipaten", "Kasokandel", "Kertajati", "Lemahsugih", "Leuwimunding", "Ligung", "Maja", "Majalengka", "Malausma", "Palasah", "Panyingkiran", "Rajagaluh", "Sindang", "Sindangwangi", "Sukahaji", "Sumberjaya", "Talaga"];
const petugasSchema = z.object({
  nik: z.string().min(1, "NIK harus diisi").max(50),
  nama: z.string().min(1, "Nama harus diisi").max(100),
  pekerjaan: z.string().min(1, "Pekerjaan harus diisi").max(100),
  alamat: z.string().min(1, "Alamat harus diisi").max(200),
  bank: z.string().min(1, "Bank harus diisi").max(100),
  rekening: z.string().min(1, "Rekening harus diisi").max(50),
  kecamatan: z.string().min(1, "Kecamatan harus dipilih").max(100)
});
type PetugasFormData = z.infer<typeof petugasSchema>;
interface Petugas extends PetugasFormData {
  rowIndex: number;
  no: number;
}
const MitraKepka = () => {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const { toast } = useToast();
  
  console.log('[MitraKepka] Init - satkerContext:', {
    satkerContext_exists: !!satkerContext,
    satkerContext_isLoading: satkerContext?.isLoading,
    satkerContext_configs_count: satkerContext?.configs?.length,
    user_satker: user?.satker,
  });
  
  // Get satker-specific data using hooks (already satker-aware)
  const {
    data: organikBPSData = [],
    loading: organikLoading
  } = useOrganikBPS();
  
  const {
    data: mitraStatistikData = [],
    loading: mitraLoading
  } = useMitraStatistik();
  
  // Get satker-specific sheet ID for save/delete operations
  // NOTE: MASTER sheets are satker-specific
  const spreadsheetId = satkerContext?.getUserSatkerSheetId('masterorganik') || DEFAULT_SPREADSHEET_ID;
  
  console.log('[MitraKepka] spreadsheetId:', {
    spreadsheetId: spreadsheetId ? spreadsheetId.substring(0, 30) + '...' : 'NULL',
    is_default: spreadsheetId === DEFAULT_SPREADSHEET_ID,
    user_satker: user?.satker
  });
  
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [organik, setOrganik] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPetugas, setEditingPetugas] = useState<Petugas | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Petugas>("nama");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [organikPage, setOrganikPage] = useState(1);
  const itemsPerPage = 20;

  // Sync data dari hooks ke state
  useEffect(() => {
    console.log('[MitraKepka] Data sync triggered:', {
      user_satker: user?.satker,
      mitraStatistikData_length: mitraStatistikData.length,
      organikBPSData_length: organikBPSData.length,
      mitraLoading,
      organikLoading,
      first_mitra_name: mitraStatistikData[0]?.name,
      first_organik_name: organikBPSData[0]?.name
    });
    
    // Convert hooks data to Petugas format for MITRA
    const mitraData = mitraStatistikData.map((m, index) => ({
      rowIndex: index + 2, // Start from row 2 (header is row 1)
      no: index + 1,
      nik: m.nik,
      nama: m.name,
      pekerjaan: m.pekerjaan,
      alamat: m.alamat,
      bank: m.bank,
      rekening: m.rekening,
      kecamatan: m.kecamatan
    }));
    setPetugas(mitraData);
    
    // Convert hooks data to Petugas format for ORGANIK
    const organikData = organikBPSData.map((o, index) => ({
      rowIndex: index + 2,
      no: index + 1,
      nik: o.nip,
      nama: o.name,
      pekerjaan: o.jabatan,
      alamat: "",
      bank: o.bank,
      rekening: o.rekening,
      kecamatan: o.kecamatan
    }));
    setOrganik(organikData);
    
    setLoading(mitraLoading || organikLoading);
  }, [mitraStatistikData, organikBPSData, mitraLoading, organikLoading, user?.satker]);
  const form = useForm<PetugasFormData>({
    resolver: zodResolver(petugasSchema),
    defaultValues: {
      nik: "",
      nama: "",
      pekerjaan: "",
      alamat: "",
      bank: "",
      rekening: "",
      kecamatan: ""
    }
  });

  // Submit form untuk tambah/edit data
  const onSubmit = useCallback(async (values: PetugasFormData) => {
    try {
      const operation = editingPetugas ? "update" : "append";
      const nomorUrut = editingPetugas ? editingPetugas.no : petugas.length > 0 ? Math.max(...petugas.map(p => p.no)) + 1 : 1;
      const bodyData: any = {
        spreadsheetId: spreadsheetId,
        operation,
        range: "MASTER.MITRA",
        values: [[nomorUrut.toString(), values.nik, values.nama, values.pekerjaan, values.alamat, values.bank, values.rekening, values.kecamatan]]
      };
      if (editingPetugas) {
        bodyData.rowIndex = editingPetugas.rowIndex;
      }
      const {
        error
      } = await supabase.functions.invoke("google-sheets", {
        body: bodyData
      });
      if (error) throw error;
      toast({
        title: "Sukses",
        description: `Data mitra berhasil ${editingPetugas ? "diperbarui" : "ditambahkan"}`
      });
      setDialogOpen(false);
      form.reset();
      setEditingPetugas(null);
      // Data will auto-update from hooks
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [spreadsheetId, editingPetugas, petugas, toast]);

  // Handle edit data
  const handleEdit = (pet: Petugas) => {
    setEditingPetugas(pet);
    form.reset({
      nik: pet.nik,
      nama: pet.nama,
      pekerjaan: pet.pekerjaan,
      alamat: pet.alamat,
      bank: pet.bank,
      rekening: pet.rekening,
      kecamatan: pet.kecamatan
    });
    setDialogOpen(true);
  };

  // Handle delete data
  const handleDelete = useCallback(async (pet: Petugas) => {
    const confirmed = window.confirm(`Hapus data ${pet.nama}?`);
    if (!confirmed) return;
    try {
      setLoading(true);
      const {
        error
      } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: spreadsheetId,
          operation: "delete",
          range: "MASTER.MITRA",
          rowIndex: pet.rowIndex
        }
      });
      if (error) throw error;
      toast({
        title: "Sukses",
        description: `Data ${pet.nama} berhasil dihapus.`
      });
      setPetugas(prev => prev.filter(p => p.rowIndex !== pet.rowIndex));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, toast]);

  // Filter, sort, dan pagination
  const filteredPetugas = petugas.filter(p => Object.values(p).some(v => v.toString().toLowerCase().includes(searchQuery.toLowerCase()))).sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
    return 0;
  });
  const totalPages = Math.ceil(filteredPetugas.length / itemsPerPage);
  const paginatedPetugas = filteredPetugas.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const handleSort = (field: keyof Petugas) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };
  return <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-red-500">Mitra Kepka</h1>
          <p className="text-muted-foreground mt-2">
            Data Mitra Statistik dilinkungan BPS Kabupaten Majalengka Tahun 2025
          </p>
        </div>

        {/* Dialog Form untuk Tambah/Edit - Hanya tampil untuk Pejabat Pembuat Komitmen */}
        {isPejabatPembuatKomitmen() && <Dialog open={dialogOpen} onOpenChange={open => {
        setDialogOpen(open);
        if (!open) {
          setEditingPetugas(null);
          form.reset();
        }
      }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> 
                Tambah Mitra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPetugas ? "Edit" : "Tambah"} Mitra
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Input fields kecuali kecamatan */}
                    {Object.keys(petugasSchema.shape).filter(key => key !== "kecamatan").map(key => <FormField key={key} control={form.control} name={key as keyof PetugasFormData} render={({
                  field
                }) => <FormItem>
                              <FormLabel>
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />)}
                    
                    {/* Kecamatan Select */}
                    <FormField control={form.control} name="kecamatan" render={({
                  field
                }) => <FormItem>
                          <FormLabel>Kecamatan</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih kecamatan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {kecamatanList.map(kec => <SelectItem key={kec} value={kec}>
                                  {kec}
                                </SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>} />
                  </div>

                  <Button type="submit" className="w-full">
                    {editingPetugas ? "Update" : "Tambah"} Mitra
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>}

        {/* Tabel Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Daftar Mitra</CardTitle>
              </div>
              <Input placeholder="Cari mitra..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-xs" />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div> : <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["no", "nik", "nama", "pekerjaan", "alamat", "bank", "rekening", "kecamatan", "aksi"].map(col => <TableHead key={col} onClick={() => col !== "aksi" && handleSort(col as keyof Petugas)} className={`py-2 ${col !== "aksi" ? "cursor-pointer select-none" : ""}`}>
                            <div className="flex items-center">
                              {col === "aksi" ? "Aksi" : col.charAt(0).toUpperCase() + col.slice(1)}
                              {col !== "aksi" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                            </div>
                          </TableHead>)}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {paginatedPetugas.length === 0 ? <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Tidak ada data yang ditemukan
                          </TableCell>
                        </TableRow> : paginatedPetugas.map(p => <TableRow key={p.rowIndex}>
                            <TableCell className="py-2">{p.no}</TableCell>
                            <TableCell className="py-2">{p.nik}</TableCell>
                            <TableCell className="py-2 font-medium">{p.nama}</TableCell>
                            <TableCell className="py-2">{p.pekerjaan}</TableCell>
                            <TableCell className="py-2 max-w-[200px]">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block cursor-pointer truncate">
                                      {p.alamat.length > 30 ? p.alamat.slice(0, 30) + "..." : p.alamat}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{p.alamat}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="py-2">{p.bank}</TableCell>
                            <TableCell className="py-2">{p.rekening}</TableCell>
                            <TableCell className="py-2">{p.kecamatan}</TableCell>
                            <TableCell className="py-2">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {/* Hanya tampilkan tombol delete untuk Pejabat Pembuat Komitmen */}
                                {isPejabatPembuatKomitmen() && <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>}
                              </div>
                            </TableCell>
                          </TableRow>)}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && <div className="flex justify-between items-center mt-4 text-sm">
                    <p className="text-muted-foreground">
                      Menampilkan {paginatedPetugas.length} dari {filteredPetugas.length} mitra
                    </p>
                    <div className="flex gap-2">
                      <Button disabled={page === 1} onClick={() => setPage(1)} variant="outline" size="sm">
                        Awal
                      </Button>
                      <Button disabled={page === 1} onClick={() => setPage(page - 1)} variant="outline" size="sm">
                        Sebelumnya
                      </Button>
                      <Button disabled={page === totalPages} onClick={() => setPage(page + 1)} variant="outline" size="sm">
                        Berikutnya
                      </Button>
                      <Button disabled={page === totalPages} onClick={() => setPage(totalPages)} variant="outline" size="sm">
                        Akhir
                      </Button>
                    </div>
                  </div>}
              </>}
          </CardContent>
        </Card>

        {/* Tabel Organik BPS */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Daftar Organik BPS</CardTitle>
              </div>
              <Input placeholder="Cari organik..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-xs" />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div> : <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["no", "nik", "nama", "pekerjaan", "alamat", "bank", "rekening", "kecamatan"].map(col => <TableHead key={col} className="py-2">
                            <div className="flex items-center">
                              {col.charAt(0).toUpperCase() + col.slice(1)}
                            </div>
                          </TableHead>)}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {organik.length === 0 ? <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Tidak ada data yang ditemukan
                          </TableCell>
                        </TableRow> : organik.map(p => <TableRow key={p.rowIndex}>
                            <TableCell className="py-2">{p.no}</TableCell>
                            <TableCell className="py-2">{p.nik}</TableCell>
                            <TableCell className="py-2 font-medium">{p.nama}</TableCell>
                            <TableCell className="py-2">{p.pekerjaan}</TableCell>
                            <TableCell className="py-2 max-w-[200px]">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block cursor-pointer truncate">
                                      {p.alamat.length > 30 ? p.alamat.slice(0, 30) + "..." : p.alamat}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{p.alamat}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="py-2">{p.bank}</TableCell>
                            <TableCell className="py-2">{p.rekening}</TableCell>
                            <TableCell className="py-2">{p.kecamatan}</TableCell>
                          </TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </>}
          </CardContent>
        </Card>
      </div>
    </Layout>;
};
export default MitraKepka;