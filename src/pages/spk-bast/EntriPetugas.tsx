import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
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
  namaBank: z.string().min(1, "Nama Bank harus diisi").max(100),
  noRekening: z.string().min(1, "No. Rekening harus diisi").max(50),
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
  const { toast } = useToast();

  const form = useForm<PetugasFormData>({
    resolver: zodResolver(petugasSchema),
    defaultValues: {
      nik: "",
      nama: "",
      pekerjaan: "",
      alamat: "",
      namaBank: "",
      noRekening: "",
    },
  });

  const fetchPetugas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (error) throw error;

      const rows = data.values || [];
      const petugasData = rows.slice(1).map((row: any[], index: number) => ({
        rowIndex: index + 2,
        nik: row[0] || "",
        nama: row[1] || "",
        pekerjaan: row[2] || "",
        alamat: row[3] || "",
        namaBank: row[4] || "",
        noRekening: row[5] || "",
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
          range: "Sheet1",
          values: [[values.nik, values.nama, values.pekerjaan, values.alamat, values.namaBank, values.noRekening]],
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entri Petugas</h1>
          <p className="text-muted-foreground mt-2">
            Pendataan dan pengelolaan informasi petugas mitra statistik
          </p>
        </div>
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
              Tambah Petugas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPetugas ? "Edit" : "Tambah"} Petugas</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="namaBank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Bank</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="noRekening"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. Rekening Bank</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {editingPetugas ? "Update" : "Tambah"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIK</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Nama Bank</TableHead>
                  <TableHead>No. Rekening Bank</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {petugas.map((p) => (
                  <TableRow key={p.rowIndex}>
                    <TableCell>{p.nik}</TableCell>
                    <TableCell>{p.nama}</TableCell>
                    <TableCell>{p.pekerjaan}</TableCell>
                    <TableCell>{p.alamat}</TableCell>
                    <TableCell>{p.namaBank}</TableCell>
                    <TableCell>{p.noRekening}</TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
