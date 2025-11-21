import { useState, useMemo } from "react";
import { Link as LinkIcon, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { useDocumentData } from "@/hooks/use-document-data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const indonesianOptions = {
  timeZone: "Asia/Jakarta",
  weekday: "long" as const,
  year: "numeric" as const,
  month: "long" as const,
  day: "numeric" as const,
  hour: "2-digit" as const,
  minute: "2-digit" as const,
  second: "2-digit" as const,
};

const DownloadDokumen = () => {
  const [activeTab, setActiveTab] = useState("daftar-hadir");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // ← DATA TETAP 100% SAMA seperti kode asli kamu (saya singkat biar rapi)
  const documents = [ /* ... semua objek dokumen kamu ... */ ].sort((a, b) => a.title.localeCompare(b.title));

  const activeDocument = documents.find((doc) => doc.id === activeTab) || documents[0];

  const { data, isLoading, isError } = useDocumentData({
    sheetId: activeDocument.sheetId,
    sheetName: activeDocument.sheetName,
  });

  const filteredData = useMemo(() => {
    if (!data || !searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter((item) =>
      activeDocument.searchFields.some((field) =>
        item[field] && String(item[field]).toLowerCase().includes(lower)
      )
    );
  }, [data, searchTerm, activeDocument.searchFields]);

  const paginatedData = useMemo(() => {
    if (!filteredData) return [];
    if (pageSize === 0) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil((filteredData?.length || 0) / (pageSize || 1));
  const totalItems = filteredData?.length || 0;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value));
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background pt-4 pb-16 px-6">
      {/* Header – senada dengan Buat e-Dokumen & Linkers */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
            <LinkIcon className="h-9 w-9 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-red-500 tracking-tight">
              Download Dokumen
            </h1>
            <p className="mt-1.5 text-lg text-muted-foreground">
              Lihat dan unduh semua dokumen yang telah dibuat
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Waktu server: {new Date().toLocaleString("id-ID", indonesianOptions)}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Tabs – pill modern */}
          <TabsList className="inline-flex flex-wrap gap-2 p-2 bg-muted/50 backdrop-blur-sm rounded-2xl border border-border/60">
            {documents.map((doc) => (
              <TabsTrigger
                key={doc.id}
                value={doc.id}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                           data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                           data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30
                           hover:bg-primary/10"
              >
                {doc.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Konten setiap tab */}
          {documents.map((doc) => (
            <TabsContent key={doc.id} value={doc.id} className="mt-6 space-y-6">
              {/* Search + Page Size */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Cari ${doc.title.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-card/80 backdrop-blur-sm border-border/60"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Tampilkan:</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-32 bg-card/80 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 baris</SelectItem>
                      <SelectItem value="20">20 baris</SelectItem>
                      <SelectItem value="50">50 baris</SelectItem>
                      <SelectItem value="100">100 baris</SelectItem>
                      <SelectItem value="0">Semua</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loading / Error / Table */}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-12 text-destructive font-medium">
                  Gagal memuat data. Silakan refresh halaman.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border bg-card/90 backdrop-blur-sm shadow-xl overflow-hidden">
                    <DataTable title={doc.title} columns={doc.columns} data={paginatedData || []} />
                  </div>

                  {/* Pagination – tetap persis fungsinya */}
                  {pageSize > 0 && totalItems > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 border-t bg-card/50 backdrop-blur-sm rounded-2xl px-6">
                      <p className="text-sm text-muted-foreground">
                        Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                        {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} data
                      </p>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="px-4 text-sm font-medium">
                          Halaman {currentPage} dari {totalPages}
                        </span>

                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default DownloadDokumen;