import { useState, useEffect } from "react";
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
import { Users, Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const kecamatanList = [
  "Argapura", "Banjaran", "Bantarujeg", "Cigasong", "Cikijing", 
  "Cingambul", "Dawuan", "Jatitujuh", "Jatiwangi", "Kadipaten", 
  "Kasokandel", "Kertajati", "Lemahsugih", "Leuwimunding", "Ligung", 
  "Maja", "Majalengka", "Malausma", "Palasah", "Panyingkiran", 
  "Rajagaluh", "Sindang", "Sindangwangi", "Sukahaji", "Sumberjaya", "Talaga"
];

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
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPetugas, setEditingPetugas] = useState<Petugas | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Petugas>("nama");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { toast } = useToast();

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

  // Fetch data dari Google Sheets
  const fetchPetugas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "MASTER.MITRA"
        }
      });

      if (error) throw error;

      const rows = data.values || [];
      const petugasData = rows.slice(1).map((row: any[], index: number) => ({
        rowIndex: index + 2,
        no: Number(row[0]) || index + 1,
        nik: row[1] || "",
        nama: row[2] || "",
        pekerjaan: row[3] || "",
        alamat: row[4] || "",
        bank: row[5] || "",
        rekening: row[6] || "",
        kecamatan: row[7] || ""
      }));

      setPetugas(petugasData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetugas();
  }, []);

  // Submit form untuk tambah/edit data
  const onSubmit = async (values: PetugasFormData) => {
    try {
      const operation = editingPetugas ? "update" : "append";
      const nomorUrut = editingPetugas ? editingPetugas.no : petugas.length > 0 ? Math.max(...petugas.map(p => p.no)) + 1 : 1;

      const bodyData: any = {
        spreadsheetId: SPREADSHEET_ID,
        operation,
        range: "MASTER.MITRA",
        values: [[
          nomorUrut.toString(), 
          values.nik, 
          values.nama, 
          values.pekerjaan, 
          values.alamat, 
          values.bank, 
          values.rekening, 
          values.kecamatan
        ]]
      };

      if (editingPetugas) {
        bodyData.rowIndex = editingPetugas.rowIndex;
      }

      const { error } = await supabase.functions.invoke("google-sheets", {
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
      await fetchPetugas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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
  const handleDelete = async (pet: Petugas) => {
    const confirmed = window.confirm(`Hapus data ${pet.nama}?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
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
  };

  // Filter, sort, dan pagination
  const filteredPetugas = petugas
    .filter(p => 
      Object.values(p).some(v => 
        v.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredPetugas.length / itemsPerPage);
  const paginatedPetugas = filteredPetugas.slice(
    (page - 1) * itemsPerPage, 
    page * itemsPerPage
  );

  const handleSort = (field: keyof Petugas) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary">Mitra Kepka</h1>
          <p className="text-muted-foreground mt-2">
            Data Mitra Statistik dilinkungan BPS Kabupaten Majalengka Tahun 2025
          </p>
        </div>

        {/* Dialog Form untuk Tambah/Edit */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
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
                  {Object.keys(petugasSchema.shape)
                    .filter(key => key !== "kecamatan")
                    .map((key) => (
                      <FormField
                        key={key}
                        control={form.control}
                        name={key as keyof PetugasFormData}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  
                  {/* Kecamatan Select */}
                  <FormField
                    control={form.control}
                    name="kecamatan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kecamatan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kecamatan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {kecamatanList.map((kec) => (
                              <SelectItem key={kec} value={kec}>
                                {kec}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingPetugas ? "Update" : "Tambah"} Mitra
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Tabel Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Daftar Mitra</CardTitle>
              </div>
              <Input 
                placeholder="Cari mitra..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["no", "nik", "nama", "pekerjaan", "alamat", "bank", "rekening", "kecamatan", "aksi"].map((col) => (
                          <TableHead 
                            key={col} 
                            onClick={() => col !== "aksi" && handleSort(col as keyof Petugas)}
                            className={`py-2 ${col !== "aksi" ? "cursor-pointer select-none" : ""}`}
                          >
                            <div className="flex items-center">
                              {col === "aksi" ? "Aksi" : col.charAt(0).toUpperCase() + col.slice(1)}
                              {col !== "aksi" && <ArrowUpDown className="ml-1 h-3 w-3" />}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {paginatedPetugas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Tidak ada data yang ditemukan
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedPetugas.map((p) => (
                          <TableRow key={p.rowIndex}>
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
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleEdit(p)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDelete(p)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 text-sm">
                    <p className="text-muted-foreground">
                      Menampilkan {paginatedPetugas.length} dari {filteredPetugas.length} mitra
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        disabled={page === 1} 
                        onClick={() => setPage(1)} 
                        variant="outline" 
                        size="sm"
                      >
                        Awal
                      </Button>
                      <Button 
                        disabled={page === 1} 
                        onClick={() => setPage(page - 1)} 
                        variant="outline" 
                        size="sm"
                      >
                        Sebelumnya
                      </Button>
                      <Button 
                        disabled={page === totalPages} 
                        onClick={() => setPage(page + 1)} 
                        variant="outline" 
                        size="sm"
                      >
                        Berikutnya
                      </Button>
                      <Button 
                        disabled={page === totalPages} 
                        onClick={() => setPage(totalPages)} 
                        variant="outline" 
                        size="sm"
                      >
                        Akhir
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MitraKepka;