import { useState, useCallback, useEffect } from "react";
import { ExternalLink, Archive, Database, FileText, Link2, DollarSignIcon, Image, Plus, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const accentColors = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
  "from-teal-500 to-teal-600",
  "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-lime-500 to-lime-600",
];

const iconOptions = [
  { name: "Archive", icon: Archive },
  { name: "Database", icon: Database },
  { name: "FileText", icon: FileText },
  { name: "Image", icon: Image },
  { name: "DollarSign", icon: DollarSignIcon },
  { name: "Link2", icon: Link2 },
  { name: "ExternalLink", icon: ExternalLink },
];

export default function Linkers() {
  const satkerContext = useSatkerConfigContext();
  const authContext = useAuth();
  const [linksData, setLinksData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingData, setDeletingData] = useState<any>(null);
  const [formData, setFormData] = useState({ judul: "", deskripsi: "", link: "", icon: "FileText" });

  const satkerConfig = satkerContext?.getUserSatkerConfig() || {};
  const linkersSheetId = satkerConfig.linkers_sheet_id || "1x-xxxxxxxxxxxxxxxxxx";
  const sheetName = "Linkers";
  const userRole = authContext?.user?.role || "";
  const canEdit = userRole === "Pejabat Pembuat Komitmen";

  // Fetch linkers data
  const fetchLinkers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: linkersSheetId,
          operation: "read",
          range: `${sheetName}!A:D`
        }
      });

      if (error) throw error;

      const rows = data?.values || [];
      if (rows.length > 1) {
        const parsed = rows.slice(1).map((row: any[], idx: number) => ({
          id: idx.toString(),
          judul: row[0] || "",
          deskripsi: row[1] || "",
          link: row[2] || "",
          icon: row[3] || "FileText"
        }));
        setLinksData(parsed.sort((a, b) => a.judul.localeCompare(b.judul)));
      }
    } catch (error) {
      console.error("Error fetching linkers:", error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Gagal memuat data linkers"
      });
    } finally {
      setIsLoading(false);
    }
  }, [linkersSheetId]);

  useEffect(() => {
    fetchLinkers();
  }, [fetchLinkers]);

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ judul: "", deskripsi: "", link: "", icon: "FileText" });
    setDialogOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setFormData({
      judul: item.judul,
      deskripsi: item.deskripsi,
      link: item.link,
      icon: item.icon
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.judul || !formData.link) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Judul dan Link harus diisi"
      });
      return;
    }

    try {
      if (editingId !== null) {
        // Update existing
        const updateIndex = linksData.findIndex(l => l.id === editingId);
        if (updateIndex >= 0) {
          const newData = [...linksData];
          newData[updateIndex] = { ...newData[updateIndex], ...formData };
          newData.sort((a, b) => a.judul.localeCompare(b.judul));
          
          const { error } = await supabase.functions.invoke("google-sheets", {
            body: {
              spreadsheetId: linkersSheetId,
              operation: "update",
              range: `${sheetName}!A${updateIndex + 2}:D${updateIndex + 2}`,
              values: [[formData.judul, formData.deskripsi, formData.link, formData.icon]]
            }
          });

          if (error) throw error;
          setLinksData(newData);
          toast({ title: "Berhasil", description: "Data linker berhasil diperbarui" });
        }
      } else {
        // Add new
        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: linkersSheetId,
            operation: "append",
            range: `${sheetName}!A:D`,
            values: [[formData.judul, formData.deskripsi, formData.link, formData.icon]]
          }
        });

        if (error) throw error;
        const newData = [...linksData, { id: linksData.length.toString(), ...formData }];
        newData.sort((a, b) => a.judul.localeCompare(b.judul));
        setLinksData(newData);
        toast({ title: "Berhasil", description: "Data linker berhasil ditambahkan" });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving linker:", error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Gagal menyimpan data linker"
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const deleteIndex = linksData.findIndex(l => l.id === deletingData.id);
      if (deleteIndex >= 0) {
        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: linkersSheetId,
            operation: "delete",
            range: `${sheetName}!A${deleteIndex + 2}:D${deleteIndex + 2}`,
            values: []
          }
        });

        if (error) throw error;
        setLinksData(linksData.filter((_, idx) => idx !== deleteIndex));
        toast({ title: "Berhasil", description: "Data linker berhasil dihapus" });
      }
    } catch (error) {
      console.error("Error deleting linker:", error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Gagal menghapus data linker"
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingData(null);
    }
  };

  const satkerNama = satkerContext?.getUserSatkerConfig()?.satker_nama || 'BPS';

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-4 pb-16 px-4 sm:px-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Memuat linkers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4 pb-16 px-4 sm:px-6">
      {/* Header */}
      <div className="max-w-[2400px] mx-auto mb-8">
        <div className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
              <Link2 className="h-9 w-9 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-red-500 tracking-tight">
                Linkers
              </h1>
              <p className="mt-1.5 text-lg text-muted-foreground">
                Kumpulan tautan penting dokumen dan aplikasi {satkerNama}
              </p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={handleAddClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Linker
            </Button>
          )}
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6 gap-6 max-w-[2400px] mx-auto">
        {linksData.map((link, index) => {
          const IconComponent = iconOptions.find(opt => opt.name === link.icon)?.icon || FileText;
          const accent = accentColors[index % accentColors.length];
          const lighterBg = accent.replace("500", "100").replace("600", "200");

          return (
            <Card
              key={link.id}
              className="group relative overflow-hidden bg-card/90 backdrop-blur-sm border border-border/50 
                         hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10
                         transition-all duration-500 hover:-translate-y-2 rounded-2xl
                         flex flex-col h-full min-h-[180px]"
            >
              {/* Gradient Top Bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 flex-1">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${lighterBg} border transition-all duration-300 group-hover:scale-110 flex-shrink-0 mt-0.5`}>
                      <IconComponent className={`h-5 w-5 ${accent.split(" ")[0].replace("from-", "text-").replace("-500", "-600")}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold text-foreground leading-tight line-clamp-2">
                        {link.judul}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1.5">
                        {link.deskripsi}
                      </CardDescription>
                    </div>
                  </div>
                </div>
                
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 flex-shrink-0 mt-1" />
              </CardHeader>

              <CardContent className="pt-0 pb-3 space-y-2">
                <button
                  onClick={() => handleOpenLink(link.link)}
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-primary to-primary/80 
                             hover:from-primary hover:to-primary/70 hover:brightness-110
                             text-primary-foreground font-medium text-sm shadow-lg hover:shadow-xl
                             relative overflow-hidden transition-all duration-300
                             flex items-center justify-center gap-2 group/btn"
                >
                  <span className="relative z-10">Buka Tautan</span>
                  <ExternalLink className="h-3 w-3 relative z-10" />
                  <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full 
                                   bg-white/20 transition-transform duration-700" />
                </button>
                
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => handleEditClick(link)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={() => {
                        setDeletingData(link);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Linker" : "Tambah Linker Baru"}</DialogTitle>
            <DialogDescription>
              Masukkan informasi linker dan pilih icon untuk menampilkannya
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="judul">Judul *</Label>
              <Input
                id="judul"
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                placeholder="Contoh: DIPA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Input
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                placeholder="Penjelasan singkat tentang linker"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Link *</Label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Pilih Icon</Label>
              <div className="grid grid-cols-4 gap-2">
                {iconOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.name}
                      onClick={() => setFormData({ ...formData, icon: opt.name })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.icon === opt.name
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      title={opt.name}
                    >
                      <Icon className="h-5 w-5 mx-auto" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Perbarui" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Linker?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus linker "{deletingData?.judul}"? Aksi ini tidak dapat diulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}