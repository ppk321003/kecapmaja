import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Plus, Pencil, Trash2, Users, Search, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

const SPREADSHEET_ID = "1x3v4BFYt6NiBq8XGP9Y-MgyD4CZXDhzuCT1eFAhzNxU";
const DEFAULT_MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM"; // Fallback to satker 3210

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

// Schemas - UPDATE: Tambah field whatsapp
const pengelolaSchema = z.object({
  nama: z.string().min(1, "Nama harus diisi").max(100),
  nip: z.string().min(1, "NIP harus diisi").max(50),
  jabatan: z.string().min(1, "Jabatan harus diisi").max(100)
});

const mitraSchema = z.object({
  no: z.string().optional(), // Optional karena hanya ditampilkan saat add, tidak saat edit
  nik: z.string().min(1, "NIK harus diisi").max(50),
  nama: z.string().min(1, "Nama harus diisi").max(100),
  pekerjaan: z.string().min(1, "Pekerjaan harus diisi").max(100),
  alamat: z.string().min(1, "Alamat harus diisi").max(200),
  bank: z.string().min(1, "Bank harus diisi").max(100),
  rekening: z.string().min(1, "Rekening harus diisi").max(50),
  kecamatan: z.string().min(1, "Kecamatan harus dipilih"),
  whatsapp: z.string().min(1, "Nomor WhatsApp harus diisi").max(20)
});

type PengelolaFormData = z.infer<typeof pengelolaSchema>;
type MitraFormData = z.infer<typeof mitraSchema>;

interface Pengelola extends PengelolaFormData {
  rowIndex: number;
  foto?: string;
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
  foto?: string;
}

// UPDATE: Tambah field whatsapp di interface Mitra
interface Mitra extends MitraFormData {
  rowIndex: number;
  foto?: string;
}

export default function EntriPengelola() {
  const { user } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  const satkerNama = useMemo(() => {
    return satkerConfig?.configs?.[0]?.satker_nama || 'BPS Kabupaten Majalengka';
  }, [satkerConfig?.configs]);
  
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
  const [activeTab, setActiveTab] = useState("pengelola");
  const [searchPengelola, setSearchPengelola] = useState("");
  const [searchOrganik, setSearchOrganik] = useState("");
  const [searchMitra, setSearchMitra] = useState("");
  
  // State untuk pagination dan sorting Mitra
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Mitra>("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const itemsPerPage = 20;
  
  // State untuk photo viewer
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; nama: string } | null>(null);

  const { toast } = useToast();
  const satkerContext2 = useSatkerConfigContext();
  
  // Get satker-specific MASTER sheet ID
  const masterSpreadsheetId = satkerContext2?.getUserSatkerSheetId('masterorganik') || DEFAULT_MASTER_SPREADSHEET_ID;
  
  console.log('[EntriPengelola] Using satker-specific MASTER sheet:', {
    user_satker: user?.satker,
    masterSpreadsheetId: masterSpreadsheetId?.substring(0, 30) + '...',
    is_default: masterSpreadsheetId === DEFAULT_MASTER_SPREADSHEET_ID
  });

  // Role-based permissions
  const isPPK = user?.role === "Pejabat Pembuat Komitmen";
  const canEditPengelola = isPPK;
  const canAddMitra = isPPK;
  const canDeleteMitra = isPPK;

  const pengelolaForm = useForm<PengelolaFormData>({
    resolver: zodResolver(pengelolaSchema),
    defaultValues: {
      nama: "",
      nip: "",
      jabatan: ""
    }
  });

  // UPDATE: Tambah default value untuk whatsapp
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
      kecamatan: "",
      whatsapp: ""
    }
  });

  // Handle photo view
  const handlePhotoClick = (fotoUrl: string, nama: string) => {
    if (fotoUrl) {
      setSelectedPhoto({ url: fotoUrl, nama });
      setPhotoViewerOpen(true);
    }
  };

  // Handle photo download
  const handlePhotoDownload = async () => {
    if (!selectedPhoto) return;
    
    try {
      const response = await fetch(selectedPhoto.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedPhoto.nama}-foto.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
      toast({
        title: "Error",
        description: "Gagal mengunduh foto",
        variant: "destructive"
      });
    }
  };

  // Fetch data Pengelola Anggaran
  const fetchPengelola = async () => {
    try {
      setLoading(true);
      
      // Fetch foto mapping dari MASTER.ORGANIK
      let fotoMap: Record<string, string> = {};
      try {
        const { data: organikData, error: organikError } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: masterSpreadsheetId,
            operation: "read",
            range: "MASTER.ORGANIK"
          }
        });
        
        if (!organikError && organikData?.values && organikData.values.length > 0) {
          const headers = organikData.values[0];
          fotoMap = organikData.values.slice(1).reduce((acc: Record<string, string>, row: any) => {
            // Create object from headers
            const rowObj: any = {};
            headers.forEach((header: string, colIndex: number) => {
              rowObj[header.toLowerCase().trim()] = row[colIndex] || "";
            });
            
            const nip = (rowObj['nip'] || rowObj['NIP'] || "").trim();
            let foto = rowObj['foto'] || rowObj['Foto'] || "";
            
            // Convert Google Drive URL to viewable format
            if (foto && foto.includes('drive.google.com/file/d/')) {
              const fileIdMatch = foto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
              if (fileIdMatch) {
                foto = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
              }
            }
            
            if (nip && foto) {
              acc[nip] = foto;
              console.log(`[Pengelola] Mapped NIP ${nip} -> foto`, foto.substring(0, 60));
            }
            return acc;
          }, {});
          console.log(`[Pengelola] Total fotoMap entries: ${Object.keys(fotoMap).length}`, fotoMap);
        }
      } catch (err) {
        console.warn('Could not fetch foto from MASTER.ORGANIK:', err);
      }
      
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1"
        }
      });
      
      if (error) throw error;
      
      const rows = data.values || [];
      if (rows.length === 0) {
        setPengelola([]);
        setLoading(false);
        return;
      }
      
      // Use first row as headers
      const headers = rows[0];
      const pengelolaData = rows.slice(1).map((row: any[], index: number) => {
        // Create object from headers
        const rowObj: any = {};
        headers.forEach((header: string, colIndex: number) => {
          rowObj[header.toLowerCase().trim()] = row[colIndex] || "";
        });
        
        const nip = (rowObj['nip'] || rowObj['NIP'] || "").trim();
        const foto = fotoMap[nip] || "";
        if (!foto && nip) {
          console.log(`[Pengelola] No foto found for NIP: ${nip}`);
        }
        return {
          rowIndex: index + 2,
          nama: rowObj['nama'] || rowObj['Nama'] || "",
          nip: nip,
          jabatan: rowObj['jabatan'] || rowObj['Jabatan'] || "",
          foto: foto
        };
      });
      
      console.log(`[Pengelola] Loaded ${pengelolaData.length} entries with photos:`, pengelolaData.filter(p => p.foto).length);
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
      console.log('[fetchOrganik] Starting with masterSpreadsheetId:', masterSpreadsheetId?.substring(0, 30) + '...');
      
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: masterSpreadsheetId,
          operation: "read",
          range: "MASTER.ORGANIK"
        }
      });
      
      if (error) throw error;
      
      const rows = data.values || [];
      console.log('[fetchOrganik] Received rows:', rows.length, 'First row:', rows[0]);
      
      if (rows.length === 0) {
        setOrganik([]);
        setLoadingOrganik(false);
        return;
      }
      
      // Use first row as headers
      const headers = rows[0];
      console.log('[fetchOrganik] Headers from sheet:', headers);
      const organikData = rows.slice(1).map((row: any[], index: number) => {
        // Create object from headers
        const rowObj: any = {};
        headers.forEach((header: string, colIndex: number) => {
          rowObj[header.toLowerCase().trim()] = row[colIndex] || "";
          rowObj[header.trim()] = row[colIndex] || "";  // Also store original case
        });
        
        let foto = rowObj['foto'] || rowObj['Foto'] || "";
        // Convert Google Drive URL to viewable format
        if (foto && foto.includes('drive.google.com/file/d/')) {
          const fileIdMatch = foto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (fileIdMatch) {
            foto = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
          }
        }
        const nip = (rowObj['nip'] || rowObj['NIP'] || "").trim();
        if (foto) {
          console.log(`[Organik] NIP ${nip} has foto:`, foto.substring(0, 60));
        }
        return {
          rowIndex: index + 2,
          no: rowObj['no'] || rowObj['No'] || "",
          nipBps: row[1] || rowObj['nipbps'] || rowObj['NIP BPS'] || rowObj['NIPBPS'] || "",  // Kolom B (index 1)
          nip: nip,
          nama: rowObj['nama'] || rowObj['Nama'] || "",
          jabatan: rowObj['jabatan'] || rowObj['Jabatan'] || "",
          golAkhir: row[6] || rowObj['gol. akhir'] || rowObj['Gol. Akhir'] || rowObj['golakhir'] || "",  // Kolom G (index 6)
          pangkat: rowObj['pangkat'] || rowObj['Pangkat'] || "",
          foto: foto
        };
      });
      
      console.log(`[Organik] Loaded ${organikData.length} entries with photos:`, organikData.filter(o => o.foto).length);
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

  // UPDATE: Fetch data Mitra Kepka dengan kolom whatsapp (No. HP)
  const fetchMitra = async () => {
    try {
      setLoadingMitra(true);
      console.log('[fetchMitra] Starting with masterSpreadsheetId:', masterSpreadsheetId?.substring(0, 30) + '...');
      
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: masterSpreadsheetId,
          operation: "read",
          range: "MASTER.MITRA"
        }
      });
      
      if (error) throw error;

      const rows = data.values || [];
      console.log('[fetchMitra] Received rows:', rows.length, 'First row:', rows[0]);
      if (rows.length === 0) {
        setMitra([]);
        setLoadingMitra(false);
        return;
      }
      
      // Use first row as headers
      const headers = rows[0];
      const mitraData = rows.slice(1).map((row: any[], index: number) => {
        // Create object from headers
        const rowObj: any = {};
        headers.forEach((header: string, colIndex: number) => {
          rowObj[header.toLowerCase().trim()] = row[colIndex] || "";
        });
        
        let foto = rowObj['foto'] || rowObj['Foto'] || "";
        // Convert Google Drive URL to viewable format
        if (foto && foto.includes('drive.google.com/file/d/')) {
          const fileIdMatch = foto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
          if (fileIdMatch) {
            foto = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
          }
        }
        return {
          rowIndex: index + 2,
          no: rowObj['no'] || rowObj['No'] || "",
          nik: rowObj['nik'] || rowObj['NIK'] || "",
          nama: rowObj['nama'] || rowObj['Nama'] || "",
          pekerjaan: rowObj['pekerjaan'] || rowObj['Pekerjaan'] || "",
          alamat: rowObj['alamat'] || rowObj['Alamat'] || "",
          bank: rowObj['bank'] || rowObj['Bank'] || "",
          rekening: rowObj['rekening'] || rowObj['Rekening'] || "",
          kecamatan: rowObj['kecamatan'] || rowObj['Kecamatan'] || "",
          whatsapp: rowObj['whatsapp'] || rowObj['No. HP'] || rowObj['no. hp'] || "",
          foto: foto
        };
      });
      
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
  }, [masterSpreadsheetId]);

  // Fetch data when tab is switched
  useEffect(() => {
    if (activeTab === "organik" && organik.length === 0) {
      fetchOrganik();
    } else if (activeTab === "mitra" && mitra.length === 0) {
      fetchMitra();
    }
  }, [activeTab, organik.length, mitra.length, masterSpreadsheetId]);

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

  // UPDATE: Mitra Kepka CRUD dengan kolom whatsapp
  const onSubmitMitra = async (values: MitraFormData) => {
    try {
      const operation = editingMitra ? "update" : "append";
      
      // Ketika edit, gunakan no dari editingMitra; ketika add, gunakan no dari form
      const rowData = [
        editingMitra ? editingMitra.no : (values.no || ''),
        values.nik,
        values.nama,
        values.pekerjaan,
        values.alamat, // Tetap disimpan di sheet tapi tidak ditampilkan di UI
        values.bank,
        values.rekening,
        values.kecamatan,
        values.whatsapp // UPDATE: Tambah kolom whatsapp
      ];

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: masterSpreadsheetId,
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
          spreadsheetId: masterSpreadsheetId,
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

  // UPDATE: Tambah pencarian di field whatsapp
  const filteredMitra = mitra.filter(m =>
    m.nama.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.nik.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.pekerjaan.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.alamat.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.bank.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.kecamatan.toLowerCase().includes(searchMitra.toLowerCase()) ||
    m.whatsapp.toLowerCase().includes(searchMitra.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Padamel-3210 | Mitra Kepka</h1>
          <p className="text-muted-foreground mt-2">
            Kelola data pengelola anggaran, organik BPS, dan mitra Kepka
          </p>
          {user && (
            <p className="text-sm text-blue-600 mt-1">
              Role: {user.role} {isPPK && "(PPK - Akses penuh)"} {!isPPK && "(Dapat edit mitra)"}
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
                      <TableHead></TableHead>
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
                        <TableCell className="w-12 flex items-center justify-center p-2">
                          {p.foto ? (
                            <img 
                              src={p.foto} 
                              alt={p.nama}
                              className="h-8 w-8 rounded-full object-cover border border-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handlePhotoClick(p.foto!, p.nama)}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {p.nama.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{p.nama}</TableCell>
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
                        <TableCell colSpan={canEditPengelola ? 6 : 5} className="text-center py-8 text-muted-foreground">
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
                <CardTitle>Organik {satkerNama}</CardTitle>
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
                      <TableHead></TableHead>
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
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="w-12 flex items-center justify-center p-2">
                          {o.foto ? (
                            <img 
                              src={o.foto} 
                              alt={o.nama}
                              className="h-8 w-8 rounded-full object-cover border border-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handlePhotoClick(o.foto!, o.nama)}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {o.nama.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                          )}
                        </TableCell>
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
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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

        {/* Tab Mitra Kepka - BAGIAN YANG DIPERBAIKI */}
        <TabsContent value="mitra" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIK, pekerjaan, bank, kecamatan, atau WhatsApp..."
                value={searchMitra}
                onChange={(e) => setSearchMitra(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            {canAddMitra && (
              <Button onClick={() => {
                setEditingMitra(null);
                mitraForm.reset();
                setMitraDialogOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Mitra
              </Button>
            )}
          </div>

          {/* DIALOG UNTUK TAMBAH/EDIT MITRA - UPDATE: Tambah field whatsapp */}
          <Dialog open={mitraDialogOpen} onOpenChange={(open) => {
            setMitraDialogOpen(open);
            if (!open) {
              setEditingMitra(null);
              mitraForm.reset();
            }
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingMitra ? "Edit" : "Tambah"} Data Mitra Kepka</DialogTitle>
              </DialogHeader>
              <Form {...mitraForm}>
                <form onSubmit={mitraForm.handleSubmit(onSubmitMitra)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Show No field only when adding new mitra, hide when editing */}
                    {!editingMitra && (
                      <FormField 
                        control={mitraForm.control} 
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
                    )}
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
                    {/* UPDATE: Tambah field whatsapp di form */}
                    <FormField 
                      control={mitraForm.control} 
                      name="whatsapp" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor WhatsApp</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Contoh: 081234567890" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                    {/* UPDATE: Alamat tetap ada di form tapi tidak ditampilkan di tabel */}
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
                        {/* UPDATE: Hapus kolom Alamat dari UI tabel */}
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
                        {/* UPDATE: Tambah kolom WhatsApp */}
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 w-32"
                          onClick={() => handleSort("whatsapp")}
                        >
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            WhatsApp
                            <ArrowUpDown className="h-4 w-4" />
                            {sortField === "whatsapp" && (
                              <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="w-24">Bank</TableHead>
                        <TableHead className="w-28">Rekening</TableHead>
                        <TableHead className="text-right w-20">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMitra.map((m, index) => (
                        <TableRow key={m.rowIndex} className="h-12 hover:bg-gray-50">
                          <TableCell className="py-2">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                          <TableCell className="py-2 font-medium">{m.nama}</TableCell>
                          <TableCell className="py-2">{m.nik}</TableCell>
                          {/* UPDATE: Hapus tampilan Alamat dari UI tabel */}
                          <TableCell className="py-2">{m.kecamatan}</TableCell>
                          <TableCell className="py-2">{m.pekerjaan}</TableCell>
                          {/* UPDATE: Tambah kolom WhatsApp di tabel */}
                          <TableCell className="py-2">{m.whatsapp}</TableCell>
                          <TableCell className="py-2">{m.bank}</TableCell>
                          <TableCell className="py-2">{m.rekening}</TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditMitra(m)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
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

      {/* Photo Viewer Dialog */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.nama}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {selectedPhoto && (
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.nama}
                className="max-h-96 max-w-full rounded-lg object-contain"
              />
            )}
            <Button onClick={handlePhotoDownload} className="w-full">
              Download Foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}