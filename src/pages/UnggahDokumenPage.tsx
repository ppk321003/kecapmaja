import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UnggahDokumenDialog } from "@/components/UnggahDokumenDialog";
import { Search, FileText, Download, ExternalLink, Loader2 } from "lucide-react";

interface LaporanItem {
  fileId: string;
  namaFile: string;
  waktuUpload: string;
  userUpload: string;
  jenisDokumen: string;
  link: string;
}

const METADATA_SPREADSHEET_ID = "1rq35tks1OEzyEYdMpc_mGCsS5kwIFGKSzb6j0HqTrz8";

const jenisDocumenColors: Record<string, string> = {
  "Laporan": "bg-blue-100 text-blue-800",
  "Rencana Tindak Lanjut": "bg-purple-100 text-purple-800",
  "Bukti Dukung": "bg-green-100 text-green-800",
  "Output Kegiatan": "bg-orange-100 text-orange-800",
  "Lainnya": "bg-gray-100 text-gray-800",
};

export function UnggahDokumenPage() {
  const { toast } = useToast();
  const [laporan, setLaporan] = useState<LaporanItem[]>([]);
  const [filteredLaporan, setFilteredLaporan] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLaporanData();
  }, []);

  const fetchLaporanData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: METADATA_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (error) throw error;

      const rows = data?.values || [];
      if (rows.length <= 1) {
        setLaporan([]);
        return;
      }

      // Parse headers - assuming: File ID, Nama file, Waktu upload, User, Jenis dokumen, Link
      const headers = rows[0];
      const fileIdIdx = headers.findIndex((h: string) => h?.toLowerCase().includes("file") && h?.toLowerCase().includes("id"));
      const namaFileIdx = headers.findIndex((h: string) => h?.toLowerCase().includes("nama"));
      const waktuIdx = headers.findIndex((h: string) => h?.toLowerCase().includes("waktu"));
      const userIdx = headers.findIndex((h: string) => h?.toLowerCase().includes("user"));
      const jenisIdx = headers.findIndex((h: string) => h?.toLowerCase().includes("jenis"));
      const linkIdx = headers.findIndex((h: string) => h?.toLowerCase().includes("link"));

      const laporanData = rows.slice(1).map((row: any[]) => ({
        fileId: row[fileIdIdx]?.toString().trim() || "",
        namaFile: row[namaFileIdx]?.toString().trim() || "",
        waktuUpload: row[waktuIdx]?.toString().trim() || "",
        userUpload: row[userIdx]?.toString().trim() || "",
        jenisDokumen: row[jenisIdx]?.toString().trim() || "",
        link: row[linkIdx]?.toString().trim() || "",
      })).filter((item: LaporanItem) => item.namaFile);

      setLaporan(laporanData);
      setFilteredLaporan(laporanData);
    } catch (error: any) {
      console.error("Error fetching laporan:", error);
      toast({
        title: "Error",
        description: "Gagal memuat daftar laporan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredLaporan(laporan);
    } else {
      const filtered = laporan.filter((item) =>
        item.namaFile.toLowerCase().includes(value.toLowerCase()) ||
        item.jenisDokumen.toLowerCase().includes(value.toLowerCase()) ||
        item.userUpload.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredLaporan(filtered);
    }
  };

  const handleDownload = (link: string) => {
    if (link) {
      window.open(link, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="w-full">
        {/* Header dengan Button Upload di pojok kanan atas */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">📋 Laporan</h1>
            <p className="text-muted-foreground">
              Daftar laporan per tahapan
            </p>
          </div>
          <UnggahDokumenDialog />
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Cari laporan..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Daftar Laporan - Grid Layout */}
        {!loading && (
          <>
            {filteredLaporan.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Tidak ada dokumen yang sesuai dengan pencarian" : "Belum ada dokumen yang diupload"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredLaporan.map((item, index) => (
                  <Card key={index} className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer overflow-hidden flex flex-col h-full group">
                    {/* Thumbnail / Preview Area */}
                    <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 aspect-[3/4] flex items-center justify-center overflow-hidden">
                      <div className="text-center p-4">
                        <FileText className="w-16 h-16 mx-auto text-primary/40 mb-2 group-hover:text-primary/60 transition-colors" />
                        <p className="text-xs text-muted-foreground font-semibold line-clamp-2">
                          {item.namaFile}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="flex-1 pt-3 pb-2 flex flex-col">
                      <div className="mb-2">
                        <Badge className={`text-xs ${jenisDocumenColors[item.jenisDokumen] || jenisDocumenColors["Lainnya"]}`}>
                          {item.jenisDokumen}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                        {item.userUpload}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.waktuUpload}
                      </p>
                    </CardContent>

                    {/* Actions */}
                    <div className="flex gap-2 p-2 border-t">
                      {item.link && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(item.link)}
                            className="flex-1 h-8 text-xs"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(item.link, "_blank")}
                            className="flex-1 h-8 text-xs"
                            title="Buka di tab baru"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Footer */}
            {filteredLaporan.length > 0 && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Menampilkan {filteredLaporan.length} dari {laporan.length} dokumen
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
