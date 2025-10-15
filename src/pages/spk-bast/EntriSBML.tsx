import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = "18EBGBfhlwjZAItLI68LJEDeq-Ct7Qe4udxGKY6KWqXk";

const sbmlSchema = z.object({
  tahunAnggaran: z.string().min(1, "Tahun anggaran harus diisi"),
  sbmlPendata: z.string().min(1, "SBML Pendata harus diisi"),
  sbmlPemeriksa: z.string().min(1, "SBML Pemeriksa harus diisi"),
  sbmlPengolah: z.string().min(1, "SBML Pengolah harus diisi"),
});

type SBMLFormData = z.infer<typeof sbmlSchema>;

interface SBML extends SBMLFormData {
  rowIndex: number;
}

export default function EntriSBML() {
  const [sbmlData, setSbmlData] = useState<SBML[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSBML, setEditingSBML] = useState<SBML | null>(null);
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

  const form = useForm<SBMLFormData>({
    resolver: zodResolver(sbmlSchema),
    defaultValues: {
      tahunAnggaran: "",
      sbmlPendata: "",
      sbmlPemeriksa: "",
      sbmlPengolah: "",
    },
  });

  const fetchSBML = async () => {
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
      const sbmlList = rows.slice(1).map((row: any[], index: number) => ({
        rowIndex: index + 2,
        tahunAnggaran: row[1] || "",
        sbmlPendata: row[2] || "",
        sbmlPemeriksa: row[3] || "",
        sbmlPengolah: row[4] || "",
      }));

      setSbmlData(sbmlList);
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
    fetchSBML();
  }, []);

  const onSubmit = async (values: SBMLFormData) => {
    try {
      const operation = editingSBML ? "update" : "append";
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: "Sheet1",
          values: [["", values.tahunAnggaran, values.sbmlPendata, values.sbmlPemeriksa, values.sbmlPengolah]],
          ...(editingSBML && { rowIndex: editingSBML.rowIndex }),
        },
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: `Data SBML berhasil ${editingSBML ? "diperbarui" : "ditambahkan"}`,
      });

      setDialogOpen(false);
      form.reset();
      setEditingSBML(null);
      fetchSBML();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (sbml: SBML) => {
    setEditingSBML(sbml);
    form.reset(sbml);
    setDialogOpen(true);
  };

  const handleDelete = async (sbml: SBML) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "delete",
          rowIndex: sbml.rowIndex,
        },
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Data SBML berhasil dihapus",
      });

      fetchSBML();
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
          <h1 className="text-3xl font-bold text-foreground">Entri SBML</h1>
          <p className="text-muted-foreground mt-2">
            Entri Standar Biaya Masukan Lainnya untuk kegiatan
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSBML(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button disabled={userRole !== "Pejabat Pembuat Komitmen"}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah SBML
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSBML ? "Edit" : "Tambah"} SBML</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="tahunAnggaran"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tahun Anggaran</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sbmlPendata"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SBML Pendata (Rp)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sbmlPemeriksa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SBML Pemeriksa (Rp)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sbmlPengolah"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SBML Pengolah (Rp)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {editingSBML ? "Update" : "Tambah"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <CardTitle>Daftar SBML</CardTitle>
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
                  <TableHead>Tahun Anggaran</TableHead>
                  <TableHead>SBML Pendata (Rp)</TableHead>
                  <TableHead>SBML Pemeriksa (Rp)</TableHead>
                  <TableHead>SBML Pengolah (Rp)</TableHead>
                  {userRole === "Pejabat Pembuat Komitmen" && (
                    <TableHead className="text-right">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sbmlData.map((sbml, index) => (
                  <TableRow key={sbml.rowIndex}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{sbml.tahunAnggaran}</TableCell>
                    <TableCell>Rp {parseInt(sbml.sbmlPendata).toLocaleString('id-ID')}</TableCell>
                    <TableCell>Rp {parseInt(sbml.sbmlPemeriksa).toLocaleString('id-ID')}</TableCell>
                    <TableCell>Rp {parseInt(sbml.sbmlPengolah).toLocaleString('id-ID')}</TableCell>
                    {userRole === "Pejabat Pembuat Komitmen" && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(sbml)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(sbml)}
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
