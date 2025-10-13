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
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const ROWS_PER_PAGE = 20;

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
}

export default function EntriPetugas() {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPetugas, setEditingPetugas] = useState<Petugas | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof Petugas>("nama");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
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

  const onSubmit = async (values: PetugasFormData) => {
    try {
      const operation = editingPetugas ? "update" : "append";
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: "MASTER.MITRA",
          values: [["", values.nik, values.nama, values.pekerjaan, values.alamat, values.bank, values.rekening, values.kecamatan]],
          ...(editingPetugas && { rowIndex: editingPetugas.rowIndex }),
        },
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: `Data petugas berhasil ${editingPetugas ? "diperbarui" : "ditambahkan"}`,
      });

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

  const handleEdit = (petugas: Petugas) => {
    setEditingPetugas(petugas);
    form.reset(petugas);
    setDialogOpen(true);
  };

  const handleDelete = async (petugas: Petugas) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

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
        description: "Data petugas berhasil dihapus",
      });

      fetchPetugas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 🔍 Filter + Sort + Pagination
  const filteredSortedPetugas = useMemo(() => {
    const filtered = petugas.filter((p) =>
      Object.values(p).some((v) =>
        v.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

    const sorted = [...filtered].sort((a, b) => {
      const valA = a[sortField]?.toString().toLowerCase() || "";
      const valB = b[sortField]?.toString().toLowerCase() || "";
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [petugas, searchQuery, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredSortedPetugas.length / ROWS_PER_PAGE);
  const paginatedPetugas = filteredSortedPetugas.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const handleSort = (field: keyof Petugas) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entri Petugas</h1>
          <p className="text-muted-foreground mt-2">
            Pendataan dan pengelolaan informasi petugas mitra statistik
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Cari petugas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-xs"
          />
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPetugas ? "Edit" : "Tambah"} Petugas</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {["nik", "nama", "pekerjaan", "alamat", "bank", "rekening", "kecamatan"].map((field) => (
                    <FormField
                      key={field}
                      control={form.control}
                      name={field as keyof PetugasFormData}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{field.name.toUpperCase()}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <Button type="submit" className="w-full">
                    {editingPetugas ? "Update" : "Tambah"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle>Daftar Petugas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {["nik", "nama", "pekerjaan", "alamat", "bank", "rekening", "kecamatan"].map((col) => (
                      <TableHead
                        key={col}
                        className="cursor-pointer select-none"
                        onClick={() => handleSort(col as keyof Petugas)}
                      >
                        <div className="flex items-center gap-1">
                          {col.toUpperCase()}
                          {sortField === col && <ArrowUpDown className="h-4 w-4" />}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPetugas.map((p) => (
                    <TableRow key={p.rowIndex}>
                      <TableCell>{p.nik}</TableCell>
                      <TableCell>{p.nama}</TableCell>
                      <TableCell>{p.pekerjaan}</TableCell>
                      <TableCell>{p.alamat}</TableCell>
                      <TableCell>{p.bank}</TableCell>
                      <TableCell>{p.rekening}</TableCell>
                      <TableCell>{p.kecamatan}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
