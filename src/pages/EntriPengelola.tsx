import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Pencil, Trash2, Users, Search, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SPREADSHEET_ID = "1x3v4BFYt6NiBq8XGP9Y-MgyD4CZXDhzuCT1eFAhzNxU";
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

// Daftar kecamatan
const KECAMATAN_LIST = [
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
  "Talaga"
];

// Schemas
const pengelolaSchema = z.object({
  nama: z.string().min(1, "Nama harus diisi").max(100),
  nip: z.string().min(1, "NIP harus diisi").max(50),
  jabatan: z.string().min(1, "Jabatan harus diisi").max(100)
});

const mitraSchema = z.object({
  no: z.string().min(1, "No harus diisi").max(10),
  nik: z.string().min(1, "NIK harus diisi").max(50),
  nama: z.string().min(1, "Nama harus diisi").max(100),
  pekerjaan: z.string().min(1, "Pekerjaan harus diisi").max(100),
  alamat: z.string().min(1, "Alamat harus diisi").max(200),
  bank: z.string().min(1, "Bank harus diisi").max(100),
  rekening: z.string().min(1, "Rekening harus diisi").max(50),
  kecamatan: z.string().min(1, "Kecamatan harus dipilih")
});

type PengelolaFormData = z.infer<typeof pengelolaSchema>;
type MitraFormData = z.infer<typeof mitraSchema>;

interface Pengelola extends PengelolaFormData {
  rowIndex: number;
}

interface Organik {
  rowIndex: number;
  no: string;
  nipBps: string;
  nip: string;
  nama: string;
  jabatan: string;
  golAkhir: string;
  pangkat: string;
}

interface Mitra extends MitraFormData {
  rowIndex: number;
}

export default function EntriPengelola() {
  // State untuk semua data
  const [pengelola, setPengelola] = useState<Pengelola[]>([]);
  const [organik, setOrganik] = useState<Organik[]>([]);
  const [mitra, setMitra] = useState<Mitra[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [loadingMitra, setLoadingMitra] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mitraDialogOpen, setMitraDialogOpen] = useState(false);
  const [editingPengelola, setEditingPengelola] = useState<Pengelola | null>(null);
  const [editingMitra, setEditingMitra] = useState<Mitra | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState("pengelola");
  const [searchPengelola, setSearchPengelola] = useState("");
  const [searchOrganik, setSearchOrganik] = useState("");
  const [searchMitra, setSearchMitra] = useState("");
  
  // State untuk pagination dan sorting Mitra
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Mitra>("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 20;

  const { toast } = useToast();

  // Get user role from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("simaja_user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role || "");
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const pengelolaForm = useForm<PengelolaFormData>({
    resolver: zodResolver(pengelolaSchema),
    defaultValues: {
      nama: "",
      nip: "",
      jabatan: ""
    }
  });

  const mitraForm = useForm<MitraFormData>({
    resolver: zodResolver(mitraSchema),
    defaultValues: {
      no: "",
      nik: "",
      nama: "",
      pekerjaan: "",
      alamat: "",
      bank: "",
      rekening: "",
      kecamatan: ""
    }
  });

  // Fetch data Pengelola Anggaran
  const fetchPengelola = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1"
        }
      });
      
      if (error) throw error;
      
      const rows = data.values || [];
      const pengelolaData = rows.slice(1).map((row: any[], index: number) => ({
        rowIndex: index + 2,
        nama: row[1] || "",
        nip: row[2] || "",
        jabatan: row[3] || ""
      }));
      
      setPengelola(pengelolaData);
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

  // Fetch data Organik BPS
  const fetchOrganik = async () => {
    try {
      setLoadingOrganik(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: "read",
          range: "MASTER.ORGANIK!A:I"
        }
      });
      
      if (error) throw error;
      
      const rows = data.values || [];
      const organikData = rows.slice(1).map((row: any[], index: number) => ({
        rowIndex: index + 2,
        no: row[0] || "",
        nipBps: row[1] || "",
        nip: row[2] || "",
        nama: row[3] || "",
        jabatan: row[4] || "",
        golAkhir: row[6] || "",
        pangkat: row[7] || ""
      }));
      
      setOrganik(organikData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingOrganik(false);
    }
  };

  // Fetch data Mitra Kepka
  const fetchMitra = async () => {
    try {
      setLoadingMitra(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: "read",
          range: "MASTER.MITRA!A:H"
        }
      });
      
      if (error) throw error;
      
      const rows = data.values || [];
      const mitraData = rows.slice(1).map((row: any[], index: number) => ({
        rowIndex: index + 2,
        no: row[0] || "",
        nik: row[1] || "",
        nama: row[2] || "",
        pekerjaan: row[3] || "",
        alamat: row[4] || "",
        bank: row[5] || "",
        rekening: row[6] || "",
        kecamatan: row[7] || ""
      }));
      
      setMitra(mitraData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingMitra(false);
    }
  };

  useEffect(() => {
    fetchPengelola();
  }, []);

  // Fetch data when tab is switched
  useEffect(() => {
    if (activeTab === "organik" && organik.length === 0) {
      fetchOrganik();
    } else if (activeTab === "mitra" && mitra.length === 0) {
      fetchMitra();
    }
  }, [activeTab, organik.length, mitra.length]);

  // Pengelola Anggaran CRUD
  const onSubmitPengelola = async (values: PengelolaFormData) => {
    try {
      const operation = editingPengelola ? "update" : "append";
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation,
          range: "Sheet1",
          values: [["", values.nama, values.nip, values.jabatan]],
          ...(editingPengelola && {
            rowIndex: editingPengelola.rowIndex
          })
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sukses",
        description: `Data pengelola anggaran berhasil ${editingPengelola ? "diperbarui" : "ditambahkan"}`
      });
      
      setDialogOpen(false);
      pengelolaForm.reset();
      setEditingPengelola(null);
      fetchPengelola();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditPengelola = (pengelola: Pengelola) => {
    setEditingPengelola(pengelola);
    pengelolaForm.reset(pengelola);
    setDialogOpen(true);
  };

  const handleDeletePengelola = async (pengelola: Pengelola) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "delete",
          rowIndex: pengelola.rowIndex
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sukses",
        description: "Data pengelola anggaran berhasil dihapus"
      });
      
      fetchPengelola();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Mitra Kepka CRUD
  const onSubmitMitra = async (values: MitraFormData) => {
    try {
      const operation = editingMitra ? "update" : "append";
      const rowData = [
        values.no,
        values.nik,
        values.nama,
        values.pekerjaan,
        values.alamat,
        values.bank,
        values.rekening,
        values.kecamatan
      ];

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation,
          range: "MASTER.MITRA",
          values: [rowData],
          ...(editingMitra && {
            rowIndex: editingMitra.rowIndex
          })
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sukses",
        description: `Data mitra berhasil ${editingMitra ? "diperbarui" : "ditambahkan"}`
      });
      
      setMitraDialogOpen(false);
      mitraForm.reset();
      setEditingMitra(null);
      fetchMitra();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditMitra = (mitra: Mitra) => {
    setEditingMitra(mitra);
    mitraForm.reset(mitra);
    setMitraDialogOpen(true);
  };

  const handleDeleteMitra = async (mitra: Mitra) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data mitra ini?")) return;
    
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: "delete",
          rowIndex: mitra.rowIndex
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sukses",
        description: "Data mitra berhasil dihapus"
      });
      
      fetchMitra();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Filter data based on search
  const filteredPengelola = pengelola.filter(p => 
    p.nama.toLowerCase().includes(searchPengelola.toLowerCase()) ||
    p.nip.toLowerCase().includes(searchPengelola.toLowerCase()) ||
    p.jabatan.toLowerCase().includes(searchPengelola.toLowerCase())
  );

  const filteredOrganik = organik.filter(o =>
    o.nama.toLowerCase().includes(searchOrganik.toLowerCase()) ||
    o.nip.toLowerCase().includes(searchOrganik.toLowerCase()) ||
    o.nipBps.toLowerCase().includes(searchOrganik.toLowerCase()) ||
    o.jabatan.toLowerCase().includes(searchOrganik.toLowerCase()) ||
    o.golAkhir.toLowerCase().includes(searchOrganik.toLowerCase()) ||
    o.pangkat.toLowerCase().includes(searchOrganik.toLowerCase())
  );

  const filteredMitra = mitra.filter(m =>
    m.nama.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.nik.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.pekerjaan.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.alamat.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.bank.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.kecamatan.toLowerCase().includes(searchMitra.toLowerCase())
  );

  // Sorting untuk Mitra
  const sortedMitra = [...filteredMitra].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField]?.toString().toLowerCase() || "";
    const bValue = b[sortField]?.toString().toLowerCase() || "";
    
    if (sortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  // Pagination untuk Mitra
  const totalPages = Math.ceil(sortedMitra.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMitra = sortedMitra.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: keyof Mitra) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Role-based permissions
  const isPPK = userRole === "Pejabat Pembuat Komitmen";
  const canEditPengelola = isPPK;
  const canEditMitra = true; // Semua role bisa edit mitra
  const canDeleteMitra = isPPK; // Hanya PPK yang bisa hapus mitra
  const canAddMitra = isPPK; // Hanya PPK yang bisa tambah mitra

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Padamel-3210 | Mitra Kepka</h1>
          <p className="text-muted-foreground mt-2">
            Kelola data pengelola anggaran, organik BPS, dan mitra Kepka
          </p>
          {userRole && (
            <p className="text-sm text-blue-600 mt-1">
              Role: {userRole} {isPPK && "(PPK - Akses penuh)"} {!isPPK && "(Dapat edit mitra)"}
            </p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pengelola" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Pengelola Anggaran
          </TabsTrigger>
          <TabsTrigger value="organik" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Organik BPS
          </TabsTrigger>
          <TabsTrigger value="mitra" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Mitra Kepka
          </TabsTrigger>
        </TabsList>

        {/* Tab Pengelola Anggaran */}
        <TabsContent value="pengelola" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIP, atau jabatan..."
                value={searchPengelola}
                onChange={(e) => setSearchPengelola(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            {canEditPengelola && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingPengelola(null);
                  pengelolaForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Pengelola
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPengelola ? "Edit" : "Tambah"} Pengelola Anggaran</DialogTitle>
                  </DialogHeader>
                  <Form {...pengelolaForm}>
                    <form onSubmit={pengelolaForm.handleSubmit(onSubmitPengelola)} className="space-y-4">
                      <FormField 
                        control={pengelolaForm.control} 
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
                        control={pengelolaForm.control} 
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
                        control={pengelolaForm.control} 
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
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCog className="h-6 w-6 text-primary" />
                <CardTitle>Daftar Pengelola Anggaran</CardTitle>
                {canEditPengelola && (
                  <span className="text-sm text-green-600 font-medium">
                    (Edit Mode)
                  </span>
                )}
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
                      {canEditPengelola && (
                        <TableHead className="text-right">Aksi</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPengelola.map((p, index) => (
                      <TableRow key={p.rowIndex}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{p.nama}</TableCell>
                        <TableCell>{p.nip}</TableCell>
                        <TableCell>{p.jabatan}</TableCell>
                        {canEditPengelola && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditPengelola(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePengelola(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {filteredPengelola.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canEditPengelola ? 5 : 4} className="text-center py-8 text-muted-foreground">
                          {searchPengelola ? "Tidak ada data yang sesuai dengan pencarian" : "Tidak ada data pengelola anggaran"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Organik BPS */}
        <TabsContent value="organik" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIP, jabatan, golongan, atau pangkat..."
              value={searchOrganik}
              onChange={(e) => setSearchOrganik(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Organik BPS Kabupaten Majalengka</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrganik ? (
                <p className="text-center py-8 text-muted-foreground">Memuat data organik...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIP</TableHead>
                      <TableHead>NIP BPS</TableHead>
                      <TableHead>Gol. Akhir</TableHead>
                      <TableHead>Pangkat</TableHead>
                      <TableHead>Jabatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganik.map((o, index) => (
                      <TableRow key={o.rowIndex}>
                        <TableCell>{o.no}</TableCell>
                        <TableCell className="font-medium">{o.nama}</TableCell>
                        <TableCell>{o.nip}</TableCell>
                        <TableCell>{o.nipBps}</TableCell>
                        <TableCell>{o.golAkhir}</TableCell>
                        <TableCell>{o.pangkat}</TableCell>
                        <TableCell>{o.jabatan}</TableCell>
                      </TableRow>
                    ))}
                    {filteredOrganik.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchOrganik ? "Tidak ada data yang sesuai dengan pencarian" : "Tidak ada data organik"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Mitra Kepka */}
        <TabsContent value="mitra" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIK, pekerjaan, alamat, bank, atau kecamatan..."
                value={searchMitra}
                onChange={(e) => setSearchMitra(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            {canAddMitra && (
              <Dialog open={mitraDialogOpen} onOpenChange={(open) => {
                setMitraDialogOpen(open);
                if (!open) {
                  setEditingMitra(null);
                  mitraForm.reset();
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
                    <DialogTitle>{editingMitra ? "Edit" : "Tambah"} Data Mitra Kepka</DialogTitle>
                  </DialogHeader>
                  <Form {...mitraForm}>
                    <form onSubmit={mitraForm.handleSubmit(onSubmitMitra)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField 
                          control={mitraForm.control} 
                          name="no" 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>No</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  disabled={!!editingMitra} // Disable nomor urut ketika edit
                                  className={editingMitra ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={mitraForm.control} 
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
                          control={mitraForm.control} 
                          name="nama" 
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Nama</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={mitraForm.control} 
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
                          control={mitraForm.control} 
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
                                  {KECAMATAN_LIST.map((kecamatan) => (
                                    <SelectItem key={kecamatan} value={kecamatan}>
                                      {kecamatan}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={mitraForm.control} 
                          name="alamat" 
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Alamat</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={mitraForm.control} 
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
                          control={mitraForm.control} 
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
                      <Button type="submit" className="w-full">
                        {editingMitra ? "Update" : "Tambah"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-6 w-6 text-primary" />
                  <CardTitle>Mitra Kepka</CardTitle>
                  <span className="text-sm text-green-600 font-medium">
                    {isPPK ? "(PPK - Akses penuh)" : "(Dapat edit)"}
                  </span>
                </div>
              </CardHeader>
            <CardContent>
              {loadingMitra ? (
                <p className="text-center py-8 text-muted-foreground">Memuat data mitra...</p>
              ) : (
                <>
                  <Table className="compact-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 w-40"
                          onClick={() => handleSort("nama")}
                        >
                          <div className="flex items-center gap-1">
                            Nama
                            <ArrowUpDown className="h-4 w-4" />
                            {sortField === "nama" && (
                              <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="w-24">NIK</TableHead>
                        <TableHead className="w-48">Alamat</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 w-32"
                          onClick={() => handleSort("kecamatan")}
                        >
                          <div className="flex items-center gap-1">
                            Kecamatan
                            <ArrowUpDown className="h-4 w-4" />
                            {sortField === "kecamatan" && (
                              <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="w-32">Pekerjaan</TableHead>
                        <TableHead className="w-24">Bank</TableHead>
                        <TableHead className="w-28">Rekening</TableHead>
                        <TableHead className="text-right w-20">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMitra.map((m, index) => (
                        <TableRow key={m.rowIndex} className="h-12 hover:bg-gray-50">
                          <TableCell className="py-2">{m.no}</TableCell>
                          <TableCell className="py-2 font-medium">{m.nama}</TableCell>
                          <TableCell className="py-2">{m.nik}</TableCell>
                          <TableCell className="py-2 max-w-[200px] truncate" title={m.alamat}>{m.alamat}</TableCell>
                          <TableCell className="py-2">{m.kecamatan}</TableCell>
                          <TableCell className="py-2">{m.pekerjaan}</TableCell>
                          <TableCell className="py-2">{m.bank}</TableCell>
                          <TableCell className="py-2">{m.rekening}</TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex justify-end gap-1">
                              {/* Tombol Edit - TAMPIL UNTUK SEMUA ROLE */}
                              <Button variant="ghost" size="sm" onClick={() => handleEditMitra(m)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {/* Tombol Hapus - HANYA TAMPIL UNTUK PPK */}
                              {canDeleteMitra && (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteMitra(m)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedMitra.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            {searchMitra ? "Tidak ada data yang sesuai dengan pencarian" : "Tidak ada data mitra"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedMitra.length)} dari {sortedMitra.length} data
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm mx-2">
                          Halaman {currentPage} dari {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}