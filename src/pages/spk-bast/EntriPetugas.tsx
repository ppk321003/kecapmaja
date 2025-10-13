import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const kecamatanList = [
  "Argapura",
  "Banjaran",
  "Bantarujeg",
  "Cigasong",
  "Cikijing",
  "Cingambul",
  "Dawuan",
  "Jatitujuh",
  "Jatiwangi",
  "Kadipaten",
  "Kasokandel",
  "Kertajati",
  "Lemahsugih",
  "Leuwimunding",
  "Ligung",
  "Maja",
  "Majalengka",
  "Malausma",
  "Palasah",
  "Panyingkiran",
  "Rajagaluh",
  "Sindang",
  "Sindangwangi",
  "Sukahaji",
  "Sumberjaya",
  "Talaga",
];

const petugasSchema = z.object({
  nik: z.string().min(1, "NIK harus diisi").max(50),
  nama: z.string().min(1, "Nama harus diisi").max(100),
  pekerjaan: z.string().min(1, "Pekerjaan harus diisi").max(100),
  alamat: z.string().min(1, "Alamat harus diisi").max(200),
  bank: z.string().min(1, "Bank harus diisi").max(100),
  rekening: z.string().min(1, "Rekening harus diisi").max(50),
  kecamatan: z.string().min(1, "Kecamatan harus dipilih").max(100),
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

  // === FETCH DATA ===
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

  // === TAMBAH / UPDATE ===
  const onSubmit = async (values: PetugasFormData) => {
    try {
      const operation = editingPetugas ? "update" : "append";

      const nomorUrut = editingPetugas
        ? editingPetugas.no
        : petugas.length > 0
        ? Math.max(...petugas.map((p) => p.no)) + 1
        : 1;

      const bodyData: any = {
        spreadsheetId: SPREADSHEET_ID,
        operation,
        range: "MASTER.MITRA",
        values: [
          [
            nomorUrut.toString(),
            values.nik,
            values.nama,
            values.pekerjaan,
            values.alamat,
            values.bank,
            values.rekening,
            values.kecamatan,
          ],
        ],
      };

      if (editingPetugas) bodyData.rowIndex = editingPetugas.rowIndex;

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: bodyData,
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: `Data petugas berhasil ${
          editingPetugas ? "diperbarui" : "ditambahkan"
        }`,
      });

      setDialogOpen(false);
      form.reset();
      setEditingPetugas(null);
      await fetchPetugas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // === EDIT ===
  const handleEdit = (pet: Petugas) => {
    setEditingPetugas(pet);
    form.reset({
      nik: pet.nik,
      nama: pet.nama,
      pekerjaan: pet.pekerjaan,
      alamat: pet.alamat,
      bank: pet.bank,
      rekening: pet.rekening,
      kecamatan: pet.kecamatan,
    });
    setDialogOpen(true);
  };

  // === DELETE ===
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
          rowIndex: pet.rowIndex,
        },
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: `Data ${pet.nama} berhasil dihapus.`,
      });

      setPetugas((prev) => prev.filter((p) => p.rowIndex !== pet.rowIndex));
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

  // === FILTER, SORT, PAGINASI ===
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

  const totalPages = Math.ceil(filteredPetugas.length / itemsPerPage);
  const paginatedPetugas = filteredPetugas.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleSort = (field: keyof Petugas) => {
    if (field === sortField) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // === RENDER ===
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entri Petugas</h1>
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
              <Plus className="mr-2 h-4 w-4" /> Tambah Petugas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPetugas ? "Edit" : "Tambah"} Petugas
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                {/* Input dinamis kecuali kecamatan */}
                {Object.keys(petugasSchema.shape).map((key) =>
                  key === "kecamatan" ? (
                    <FormField
                      key={key}
                      control={form.control}
                      name="kecamatan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kecamatan</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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
                  ) : (
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
                  )
                )}

                <Button type="submit" className="w-full">
                  {editingPetugas ? "Update" : "Tambah"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
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
            <p className="text-center py-6 text-muted-foreground">
              Memuat data...
            </p>
          ) : (
            <>
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="h-auto">
                    {[
                      "no",
                      "nik",
                      "nama",
                      "pekerjaan",
                      "alamat",
                      "bank",
                      "rekening",
                      "kecamatan",
                    ].map((col) => (
                      <TableHead
                        key={col}
                        onClick={() => handleSort(col as keyof Petugas)}
                        className="cursor-pointer select-none py-1"
                      >
                        {col.charAt(0).toUpperCase() + col.slice(1)}{" "}
                        <ArrowUpDown className="inline h-3 w-3 ml-1" />
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedPetugas.map((p) => (
                    <TableRow key={p.rowIndex} className="h-auto">
                      <TableCell className="py-1">{p.no}</TableCell>
                      <TableCell className="py-1">{p.nik}</TableCell>
                      <TableCell className="py-1">{p.nama}</TableCell>
                      <TableCell className="py-1">{p.pekerjaan}</TableCell>

                      {/* === ALAMAT === */}
                      <TableCell className="py-1 max-w-[200px] truncate">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block cursor-pointer">
                                {p.alamat.length > 30
                                  ? p.alamat.slice(0, 30) + "..."
                                  : p.alamat}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{p.alamat}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell className="py-1">{p.bank}</TableCell>
                      <TableCell className="py-1">{p.rekening}</TableCell>
                      <TableCell className="py-1">{p.kecamatan}</TableCell>
                      <TableCell className="text-right py-1">
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

              {/* PAGINATION */}
              <div className="flex justify-between items-center mt-3 text-sm">
                <p>
                  Halaman {page} dari {totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    variant="outline"
                  >
                    Awal
                  </Button>
                  <Button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    variant="outline"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    variant="outline"
                  >
                    Berikutnya
                  </Button>
                  <Button
                    disabled={page === totalPages}
                    onClick={() => setPage(totalPages)}
                    variant="outline"
                  >
                    Akhir
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
