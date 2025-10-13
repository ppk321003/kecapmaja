import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const petugasSchema = z.object({
  nik: z.string().min(1, "NIK harus diisi").max(50),
  nama: z.string().min(1, "Nama harus diisi").max(100),
  pekerjaan: z.string().min(1, "Pekerjaan harus diisi").max(100),
  alamat: z.string().min(1, "Alamat harus diisi").max(200),
  bank: z.string().min(1, "Bank harus diisi").max(100),
  rekening: z.string().min(1, "Rekening harus diisi").max(50),
  kecamatan: z.string().min(1, "Kecamatan harus diisi").max(100),
});

type PetugasFormData = z.infer<typeof petugasSchema>;

interface Petugas extends PetugasFormData {
  rowIndex: number;
  no: number;
}

export default function EntriPetugas() {
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
      kecamatan: "",
    },
  });

  // 🟢 FETCH DATA
  const fetchPetugas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "MASTER.MITRA",
        },
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
        kecamatan: row[7] || "",
      }));

      setPetugas(petugasData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetugas();
  }, []);

  // 🟢 SIMPAN / UPDATE
  const onSubmit = async (values: PetugasFormData) => {
    try {
      let nomorUrutBaru = editingPetugas ? editingPetugas.no : 1;
      
      // Jika menambah data baru, cari nomor urut terakhir
      if (!editingPetugas) {
        const lastNo = petugas.length > 0 ? Math.max(...petugas.map((p) => p.no)) : 0;
        nomorUrutBaru = lastNo + 1;
      }

      const rowData = [
        nomorUrutBaru.toString(),
        values.nik,
        values.nama,
        values.pekerjaan,
        values.alamat,
        values.bank,
        values.rekening,
        values.kecamatan,
      ];

      if (editingPetugas) {
        // UPDATE data yang sudah ada
        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "update",
            range: `MASTER.MITRA!A${editingPetugas.rowIndex}:H${editingPetugas.rowIndex}`,
            values: [rowData],
          },
        });

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Data petugas berhasil diperbarui",
        });
      } else {
        // TAMBAH data baru
        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "append",
            range: "MASTER.MITRA",
            values: [rowData],
          },
        });

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Data petugas berhasil ditambahkan",
        });
      }

      setDialogOpen(false);
      form.reset();
      setEditingPetugas(null);
      fetchPetugas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 🟢 EDIT
  const handleEdit = (petugas: Petugas) => {
    setEditingPetugas(petugas);
    form.reset({
      nik: petugas.nik,
      nama: petugas.nama,
      pekerjaan: petugas.pekerjaan,
      alamat: petugas.alamat,
      bank: petugas.bank,
      rekening: petugas.rekening,
      kecamatan: petugas.kecamatan,
    });
    setDialogOpen(true);
  };

  // 🟢 DELETE
  const handleDelete = async (petugas: Petugas) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data petugas ${petugas.nama}?`)) return;
    
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "delete",
          sheetName: "MASTER.MITRA",
          rowIndex: petugas.rowIndex,
        },
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: `Data petugas ${petugas.nama} berhasil dihapus`,
      });

      // Refresh data
      fetchPetugas();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus data petugas",
        variant: "destructive",
      });
    }
  };

  // 🟢 FILTER & SORT
  const filteredPetugas = petugas
    .filter((p) =>
      Object.values(p).some((v) =>
        v.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
      return 0;
    });

  const paginatedPetugas = filteredPetugas.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredPetugas.length / itemsPerPage);

  const handleSort = (field: keyof Petugas) => {
    if (field === sortField) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // 🟢 RENDER
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entri Petugas</h1>
          <p className="text-muted-foreground mt-2">
            Pendataan dan pengelolaan informasi petugas mitra statistik
          </p>
        </div>

        {/* DIALOG FORM */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPetugas(null);
              form.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Petugas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPetugas ? "Edit" : "Tambah"} Petugas</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nik"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIK</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nama"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pekerjaan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pekerjaan</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="kecamatan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kecamatan</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rekening"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rekening</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="alamat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1">
                    {editingPetugas ? "Update" : "Tambah"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setDialogOpen(false);
                      form.reset();
                      setEditingPetugas(null);
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABEL */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>Daftar Petugas</CardTitle>
            </div>
            <Input
              placeholder="Cari petugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["no", "nik", "nama", "pekerjaan", "alamat", "bank", "rekening", "kecamatan"].map(
                        (col) => (
                          <TableHead
                            key={col}
                            onClick={() => handleSort(col as keyof Petugas)}
                            className="cursor-pointer select-none hover:bg-accent"
                          >
                            <div className="flex items-center">
                              {col.charAt(0).toUpperCase() + col.slice(1)}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </div>
                          </TableHead>
                        )
                      )}
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedPetugas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "Tidak ada data yang sesuai dengan pencarian" : "Belum ada data petugas"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPetugas.map((p) => (
                        <TableRow key={p.rowIndex}>
                          <TableCell>{p.no}</TableCell>
                          <TableCell>{p.nik}</TableCell>
                          <TableCell className="font-medium">{p.nama}</TableCell>
                          <TableCell>{p.pekerjaan}</TableCell>
                          <TableCell>{p.alamat}</TableCell>
                          <TableCell>{p.bank}</TableCell>
                          <TableCell>{p.rekening}</TableCell>
                          <TableCell>{p.kecamatan}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEdit(p)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDelete(p)}
                                title="Hapus"
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

              {/* PAGINATION */}
              {filteredPetugas.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan {Math.min(paginatedPetugas.length, itemsPerPage)} dari {filteredPetugas.length} petugas
                  </p>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1} 
                      onClick={() => setPage(1)}
                    >
                      Awal
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1} 
                      onClick={() => setPage(page - 1)}
                    >
                      Sebelumnya
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === totalPages} 
                      onClick={() => setPage(page + 1)}
                    >
                      Berikutnya
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === totalPages} 
                      onClick={() => setPage(totalPages)}
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
  );
}