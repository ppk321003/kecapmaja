import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = "1x3v4BFYt6NiBq8XGP9Y-MgyD4CZXDhzuCT1eFAhzNxU";

const pengelolaSchema = z.object({
  nama: z.string().min(1, "Nama harus diisi").max(100),
  nip: z.string().min(1, "NIP harus diisi").max(50),
  jabatan: z.string().min(1, "Jabatan harus diisi").max(100),
});

type PengelolaFormData = z.infer<typeof pengelolaSchema>;

interface Pengelola extends PengelolaFormData {
  rowIndex: number;
}

export default function EntriPengelola() {
  const [pengelola, setPengelola] = useState<Pengelola[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPengelola, setEditingPengelola] = useState<Pengelola | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const { toast } = useToast();

  // Get user role from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || "");
    }
  }, []);

  const form = useForm<PengelolaFormData>({
    resolver: zodResolver(pengelolaSchema),
    defaultValues: {
      nama: "",
      nip: "",
      jabatan: "",
    },
  });

  const fetchPengelola = async () => {
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
      const pengelolaData = rows.slice(1).map((row: any[], index: number) => ({
        rowIndex: index + 2,
        nama: row[1] || "",
        nip: row[2] || "",
        jabatan: row[3] || "",
      }));

      setPengelola(pengelolaData);
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
    fetchPengelola();
  }, []);

  const onSubmit = async (values: PengelolaFormData) => {
    try {
      const operation = editingPengelola ? "update" : "append";
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: "Sheet1",
          values: [["", values.nama, values.nip, values.jabatan]],
          ...(editingPengelola && { rowIndex: editingPengelola.rowIndex }),
        },
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: `Data pengelola anggaran berhasil ${editingPengelola ? "diperbarui" : "ditambahkan"}`,
      });

      setDialogOpen(false);
      form.reset();
      setEditingPengelola(null);
      fetchPengelola();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (pengelola: Pengelola) => {
    setEditingPengelola(pengelola);
    form.reset(pengelola);
    setDialogOpen(true);
  };

  const handleDelete = async (pengelola: Pengelola) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "delete",
          rowIndex: pengelola.rowIndex,
        },
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Data pengelola anggaran berhasil dihapus",
      });

      fetchPengelola();
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
          <h1 className="text-3xl font-bold text-foreground">Entri Pengelola Anggaran</h1>
          <p className="text-muted-foreground mt-2">
            Pendataan pengelola anggaran kegiatan
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPengelola(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button disabled={userRole !== "Pejabat Pembuat Komitmen"}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Pengelola
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPengelola ? "Edit" : "Tambah"} Pengelola Anggaran</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="nip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIP</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {editingPengelola ? "Update" : "Tambah"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            <CardTitle>Daftar Pengelola Anggaran</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Jabatan</TableHead>
                  {userRole === "Pejabat Pembuat Komitmen" && (
                    <TableHead className="text-right">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pengelola.map((p, index) => (
                  <TableRow key={p.rowIndex}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{p.nama}</TableCell>
                    <TableCell>{p.nip}</TableCell>
                    <TableCell>{p.jabatan}</TableCell>
                    {userRole === "Pejabat Pembuat Komitmen" && (
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
                    )}
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
