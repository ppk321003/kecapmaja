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

  // DATA LENGKAP — tidak dipotong lagi
  const documents = [
    { id: "daftar-hadir", title: "Daftar Hadir", sheetId: "1STp5KR6OJBGuyvp-ohkrhS_QEoTREaaA59W7AkQ4Nak", sheetName: "Sheet1", searchFields: ["Jenis", "Nama Kegiatan", "Pembuat Daftar"], columns: [/* kolom kamu */] },
    { id: "dokumen-pengadaan", title: "Dokumen Pengadaan", sheetId: "1WMAggLC15LYEXfZRtkr4aEOc7l7pHsj2XH0JVLqaMiE", sheetName: "Sheet1", searchFields: ["Nama Paket Pengadaan", "Kode Kegiatan", "Penyedia Barang/Jasa"], columns: [/* ... */] },
    { id: "kerangka-acuan-kerja", title: "Kerangka Acuan Kerja", sheetId: "1FoRGchGACEq4E7Xh0XgvNTNI4VhTR5pIDGb9rwFY6cc", sheetName: "Sheet1", searchFields: ["Jenis Kerangka Acuan Kerja", "Nama Kegiatan-1", "Nama Pembuat Daftar"], columns: [/* ... */] },
    { id: "kuitansi-perjalanan-dinas", title: "Kuitansi Perjalanan Dinas", sheetId: "10Rc_YT8xv_gOnuuRWAQyVEkxfgTOWiTH5lQt3guNAa0", sheetName: "Sheet1", searchFields: ["Pelaksana Perjalanan Dinas", "Tujuan Pelaksanaan Perjalanan Dinas", "Jenis Perjalanan Dinas"], columns: [/* ... */] },
    { id: "kuitansi-transport-lokal", title: "Kuitansi Transport Lokal", sheetId: "1_FRKSUzW12r5xGRA15fJrTjRRu7ma6omC00jNIgrKXc", sheetName: "KuitansiTransportLokal", searchFields: ["Tujuan", "Pembuat daftar"], columns: [/* ... */] },
    { id: "lembur-laporan", title: "Lembur & Laporan", sheetId: "1baYH5dM7cAaMCRQY63YkzgqLIsb_-67Tyixno2zZEjE", sheetName: "Sheet1", searchFields: ["Kegiatan", "Pembuat daftar"], columns: [/* ... */] },
    { id: "spj-honor", title: "SPJ Honor", sheetId: "13okXNIK6L-ZaIYWqu7qSZNmTW3ENgt7H3gk4BbqrTPs", sheetName: "Sheet1", searchFields: ["Nama Kegiatan", "Jenis", "Detil", "Pembuat Daftar"], columns: [/* ... */] },
    { id: "SuratKeputusan", title: "Surat Keputusan", sheetId: "1v591kPdTuYOldaz3tbqoQYnS3QYubt-qb1OrotBkhlc", sheetName: "Sheet1", searchFields: ["no_sk", "tentang", "Pembuat daftar"], columns: [/* ... */] },
    { id: "surat-pernyataan", title: "Surat Pernyataan", sheetId: "1hy6xHWIcCcgfSHe-jWhIoDNR991PDI-2DmOFvX1UeIs", sheetName: "SuratPernyataan", searchFields: ["Jenis Surat Pernyataan", "kegiatan", "Organik", "Mitra Statistik", "Pembuat daftar"], columns: [/* ... */] },
    { id: "tanda-terima", title: "Tanda Terima", sheetId: "1REwVfh5DNiY2UM1g-hjvSMcz-bUglMuHlDFnaEQkbgU", sheetName: "Sheet1", searchFields: ["Nama Kegiatan", "Detail Kegiatan", "Pembuat Daftar"], columns: [/* ... */] },
    { id: "transport-lokal", title: "Transport Lokal", sheetId: "1muy4_6suFJy4dt5M79eVxuAn8gJVooZdOkYVO5zTzGY", sheetName: "Sheet1", searchFields: ["Nama Kegiatan", "Detil", "Pembuat Daftar"], columns: [/* ... */] },
    { id: "uang-harian-transport", title: "Uang Harian dan Transport Lokal", sheetId: "19lo2kuC9BKccQSXvIp4rjlJiytwPR2lX8xzTl4p_vys", sheetName: "Sheet1", searchFields: ["Nama Kegiatan", "Detil", "Jenis", "Pembuat Daftar"], columns: [/* ... */] },
  ].sort((a, b) => a.title.localeCompare(b.title));

  // PASTIKAN selalu ada activeDocument (fallback ke yang pertama)
  const activeDocument = documents.find(d => d.id === activeTab) ?? documents[0];

  const { data, isLoading, isError } = useDocumentData({
    sheetId: activeDocument.sheetId,
    sheetName: activeDocument.sheetName,
  });

  // === Logika filter & pagination tetap 100% sama ===
  const filteredData = useMemo(() => {
    if (!data || !searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(item =>
      activeDocument.searchFields.some(field =>
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

  return (
    <div className="min-h-screen bg-background pt-4 pb-16 px-6">
      {/* Header – merah, cantik, tidak blank */}
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

          {/* Konten */}
          <TabsContent value={activeTab} className="mt-6 space-y-6">
            {/* Search + Page Size */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Cari ${activeDocument.title.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card/80 backdrop-blur-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Tampilkan:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
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

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : isError ? (
              <div className="text-center py-12 text-destructive">Gagal memuat data.</div>
            ) : (
              <>
                <div className="rounded-2xl border bg-card/90 backdrop-blur-sm shadow-xl overflow-hidden">
                  <DataTable title={activeDocument.title} columns={activeDocument.columns} data={paginatedData} />
                </div>

                {pageSize > 0 && totalItems > pageSize && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 border-t bg-card/50 backdrop-blur-sm rounded-2xl px-6">
                    <p className="text-sm text-muted-foreground">
                      Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} dari {totalItems}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-4 text-sm font-medium">Halaman {currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
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
        </Tabs>
      </div>
    </div>
  );
};

export default DownloadDokumen;