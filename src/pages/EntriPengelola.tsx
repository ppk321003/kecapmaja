import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SPREADSHEET_ID = "1x3v4BFYt6NiBq8XGP9Y-MgyD4CZXDhzuCT1eFAhzNxU";
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const pengelolaSchema = z.object({
  nama: z.string().min(1, "Nama harus diisi").max(100),
  nip: z.string().min(1, "NIP harus diisi").max(50),
  jabatan: z.string().min(1, "Jabatan harus diisi").max(100)
});

const organikSchema = z.object({
  no: z.string().min(1, "No harus diisi").max(10),
  nipBps: z.string().min(1, "NIP BPS harus diisi").max(50),
  nip: z.string().min(1, "NIP harus diisi").max(50),
  nama: z.string().min(1, "Nama harus diisi").max(100),
  jabatan: z.string().min(1, "Jabatan harus diisi").max(100),
  golAkhir: z.string().min(1, "Gol. Akhir harus diisi").max(50),
  pangkat: z.string().min(1, "Pangkat harus diisi").max(100)
});

type PengelolaFormData = z.infer<typeof pengelolaSchema>;
type OrganikFormData = z.infer<typeof organikSchema>;

interface Pengelola extends PengelolaFormData {
  rowIndex: number;
}

interface Organik extends OrganikFormData {
  rowIndex: number;
}

export default function EntriPengelola() {
  const [pengelola, setPengelola] = useState<Pengelola[]>([]);
  const [organik, setOrganik] = useState<Organik[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrganik, setLoadingOrganik] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [organikDialogOpen, setOrganikDialogOpen] = useState(false);
  const [editingPengelola, setEditingPengelola] = useState<Pengelola | null>(null);
  const [editingOrganik, setEditingOrganik] = useState<Organik | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState("pengelola");
  const [searchPengelola, setSearchPengelola] = useState("");
  const [searchOrganik, setSearchOrganik] = useState("");
  
  const { toast } = useToast();

  // Get user role from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("simaja_user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role || "");
        console.log("User role detected:", user.role);
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

  const organikForm = useForm<OrganikFormData>({
    resolver: zodResolver(organikSchema),
    defaultValues: {
      no: "",
      nipBps: "",
      nip: "",
      nama: "",
      jabatan: "",
      golAkhir: "",
      pangkat: ""
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
        golAkhir: row[6] || "", // Skip kecamatan (index 5)
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

  useEffect(() => {
    fetchPengelola();
  }, []);

  // Fetch organik data when tab is switched
  useEffect(() => {
    if (activeTab === "organik" && organik.length === 0) {
      fetchOrganik();
    }
  }, [activeTab, organik.length]);

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

  // Organik BPS CRUD
  const onSubmitOrganik = async (values: OrganikFormData) => {
    try {
      const operation = editingOrganik ? "update" : "append";
      // Include empty string for kecamatan (index 5) to maintain column structure
      const rowData = [
        values.no,
        values.nipBps,
        values.nip,
        values.nama,
        values.jabatan,
        "", // Kecamatan (empty since we're not using it)
        values.golAkhir,
        values.pangkat
      ];

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation,
          range: "MASTER.ORGANIK",
          values: [rowData],
          ...(editingOrganik && {
            rowIndex: editingOrganik.rowIndex
          })
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sukses",
        description: `Data organik BPS berhasil ${editingOrganik ? "diperbarui" : "ditambahkan"}`
      });
      
      setOrganikDialogOpen(false);
      organikForm.reset();
      setEditingOrganik(null);
      fetchOrganik();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditOrganik = (organik: Organik) => {
    setEditingOrganik(organik);
    organikForm.reset(organik);
    setOrganikDialogOpen(true);
  };

  const handleDeleteOrganik = async (organik: Organik) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data organik ini?")) return;
    
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: "delete",
          rowIndex: organik.rowIndex
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Sukses",
        description: "Data organik BPS berhasil dihapus"
      });
      
      fetchOrganik();
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

  const canEdit = userRole === "Pejabat Pembuat Komitmen";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Pengelola Anggaran & Organik BPS</h1>
          <p className="text-muted-foreground mt-2">
            Daftar pengelola anggaran dan data organik BPS Kabupaten Majalengka
          </p>
          {userRole && (
            <p className="text-sm text-blue-600 mt-1">
              Role: {userRole} {canEdit && "(Dapat mengedit semua data)"}
            </p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pengelola" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Daftar Pengelola Anggaran
          </TabsTrigger>
          <TabsTrigger value="organik" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Organik BPS Kab. Majalengka
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
            
            {canEdit && (
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
                {canEdit && (
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
                      {canEdit && (
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
                        {canEdit && (
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
                        <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-8 text-muted-foreground">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIP, jabatan, golongan, atau pangkat..."
                value={searchOrganik}
                onChange={(e) => setSearchOrganik(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            {canEdit && (
              <Dialog open={organikDialogOpen} onOpenChange={(open) => {
                setOrganikDialogOpen(open);
                if (!open) {
                  setEditingOrganik(null);
                  organikForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Organik
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingOrganik ? "Edit" : "Tambah"} Data Organik BPS</DialogTitle>
                  </DialogHeader>
                  <Form {...organikForm}>
                    <form onSubmit={organikForm.handleSubmit(onSubmitOrganik)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField 
                          control={organikForm.control} 
                          name="no" 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>No</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={organikForm.control} 
                          name="nipBps" 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>NIP BPS</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={organikForm.control} 
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
                          control={organikForm.control} 
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
                          control={organikForm.control} 
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
                        <FormField 
                          control={organikForm.control} 
                          name="golAkhir" 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gol. Akhir</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                        <FormField 
                          control={organikForm.control} 
                          name="pangkat" 
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Pangkat</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} 
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editingOrganik ? "Update" : "Tambah"}
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
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Organik BPS Kabupaten Majalengka</CardTitle>
                {canEdit && (
                  <span className="text-sm text-green-600 font-medium">
                    (Edit Mode)
                  </span>
                )}
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
                      {canEdit && (
                        <TableHead className="text-right">Aksi</TableHead>
                      )}
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
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditOrganik(o)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOrganik(o)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {filteredOrganik.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground">
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
      </Tabs>
    </div>
  );
}