import { useState, useMemo } from "react";
import {
  Link as LinkIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { useDocumentData } from "@/hooks/use-document-data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Indonesian timezone formatter
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

  // === DATA DOKUMEN LENGKAP (TIDAK DIPOTONG SAMA SEKALI) ===
  const documents = [
    {
      id: "daftar-hadir",
      title: "Daftar Hadir",
      sheetId: "1STp5KR6OJBGuyvp-ohkrhS_QEoTREaaA59W7AkQ4Nak",
      sheetName: "Sheet1",
      searchFields: ["Jenis", "Nama Kegiatan", "Pembuat Daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Jenis", header: "Jenis" },
        { key: "Nama Kegiatan", header: "Nama Kegiatan" },
        { key: "Pembuat Daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "dokumen-pengadaan",
      title: "Dokumen Pengadaan",
      sheetId: "1WMAggLC15LYEXfZRtkr4aEOc7l7pHsj2XH0JVLqaMiE",
      sheetName: "Sheet1",
      searchFields: ["Nama Paket Pengadaan", "Kode Kegiatan", "Penyedia Barang/Jasa"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Nama Paket Pengadaan", header: "Nama Paket Pengadaan" },
        { key: "Kode Kegiatan", header: "Kode Kegiatan" },
        { key: "Penyedia Barang/Jasa", header: "Penyedia Barang/Jasa" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "kerangka-acuan-kerja",
      title: "Kerangka Acuan Kerja",
      sheetId: "1FoRGchGACEq4E7Xh0XgvNTNI4VhTR5pIDGb9rwFY6cc",
      sheetName: "Sheet1",
      searchFields: ["Jenis Kerangka Acuan Kerja", "Nama Kegiatan-1", "Nama Pembuat Daftar"],
      columns: [
        { key: "Id", header: "Id" },
        { key: "Jenis Kerangka Acuan Kerja", header: "Jenis Kerangka Acuan Kerja" },
        { key: "Nama Kegiatan-1", header: "Nama Kegiatan" },
        { key: "Nama Pembuat Daftar", header: "Nama Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "kuitansi-perjalanan-dinas",
      title: "Kuitansi Perjalanan Dinas",
      sheetId: "10Rc_YT8xv_gOnuuRWAQyVEkxfgTOWiTH5lQt3guNAa0",
      sheetName: "Sheet1",
      searchFields: ["Pelaksana Perjalanan Dinas", "Tujuan Pelaksanaan Perjalanan Dinas", "Jenis Perjalanan Dinas"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Jenis Perjalanan Dinas", header: "Jenis Perjalanan Dinas" },
        { key: "Nomor Surat Tugas", header: "Nomor Surat Tugas" },
        { key: "Tujuan Pelaksanaan Perjalanan Dinas", header: "Tujuan Pelaksanaan Perjalanan Dinas" },
        { key: "Pelaksana Perjalanan Dinas", header: "Pelaksana Perjalanan Dinas" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "kuitansi-transport-lokal",
      title: "Kuitansi Transport Lokal",
      sheetId: "1_FRKSUzW12r5xGRA15fJrTjRRu7ma6omC00jNIgrKXc",
      sheetName: "KuitansiTransportLokal",
      searchFields: ["Tujuan", "Pembuat daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Tujuan", header: "Tujuan Kegiatan" },
        {
          key: "Tanggal Pengajuan",
          header: "Tanggal Pengajuan",
          render: (value: any) => {
            if (typeof value === "string" && value.startsWith("Date(")) {
              const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
              if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                const monthNames = [
                  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
                ];
                return `${day} ${monthNames[month]} ${year}`;
              }
            }
            return value || "-";
          },
        },
        { key: "Pembuat daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "lembur-laporan",
      title: "Lembur & Laporan",
      sheetId: "1baYH5dM7cAaMCRQY63YkzgqLIsb_-67Tyixno2zZEjE",
      sheetName: "Sheet1",
      searchFields: ["Kegiatan", "Pembuat daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Kegiatan", header: "Kegiatan" },
        {
          key: "Tanggal Surat Tugas Lembur",
          header: "Tanggal Surat Tugas Lembur",
          render: (value: any) => {
            if (typeof value === "string" && value.startsWith("Date(")) {
              const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
              if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]);
                const day = parseInt(match[3]);
                const monthNames = [
                  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
                ];
                return `${day} ${monthNames[month]} ${year}`;
              }
            }
            return value || "-";
          },
        },
        { key: "Pembuat daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "spj-honor",
      title: "SPJ Honor",
      sheetId: "13okXNIK6L-ZaIYWqu7qSZNmTW3ENgt7H3gk4BbqrTPs",
      sheetName: "Sheet1",
      searchFields: ["Nama Kegiatan", "Jenis", "Detil", "Pembuat Daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Nama Kegiatan", header: "Nama Kegiatan" },
        { key: "Jenis", header: "Jenis" },
        { key: "Detil", header: "Detil" },
        { key: "Pembuat Daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "SuratKeputusan",
      title: "Surat Keputusan",
      sheetId: "1v591kPdTuYOldaz3tbqoQYnS3QYubt-qb1OrotBkhlc",
      sheetName: "Sheet1",
      searchFields: ["no_sk", "tentang", "Pembuat daftar"],
      columns: [
        { key: "Id", header: "Id" },
        { key: "no_sk", header: "Nomor SK" },
        { key: "tentang", header: "Tentang" },
        { key: "Pembuat daftar", header: "Pembuat daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "surat-pernyataan",
      title: "Surat Pernyataan",
      sheetId: "1hy6xHWIcCcgfSHe-jWhIoDNR991PDI-2DmOFvX1UeIs",
      sheetName: "SuratPernyataan",
      searchFields: ["Jenis Surat Pernyataan", "kegiatan", "Organik", "Mitra Statistik", "Pembuat daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Jenis Surat Pernyataan", header: "Jenis Surat Pernyataan" },
        { key: "kegiatan", header: "Kegiatan" },
        { key: "Organik", header: "Nama Organik" },
        { key: "Mitra Statistik", header: "Mitra Statistik" },
        { key: "Pembuat daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "tanda-terima",
      title: "Tanda Terima",
      sheetId: "1REwVfh5DNiY2UM1g-hjvSMcz-bUglMuHlDFnaEQkbgU",
      sheetName: "Sheet1",
      searchFields: ["Nama Kegiatan", "Detail Kegiatan", "Pembuat Daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Nama Kegiatan", header: "Nama Kegiatan" },
        { key: "Detail Kegiatan", header: "Detail Kegiatan" },
        { key: "Pembuat Daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "transport-lokal",
      title: "Transport Lokal",
      sheetId: "1muy4_6suFJy4dt5M79eVxuAn8gJVooZdOkYVO5zTzGY",
      sheetName: "Sheet1",
      searchFields: ["Nama Kegiatan", "Detil", "Pembuat Daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Nama Kegiatan", header: "Nama Kegiatan" },
        { key: "Detil", header: "Detil" },
        { key: "Pembuat Daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
    {
      id: "uang-harian-transport",
      title: "Uang Harian dan Transport Lokal",
      sheetId: "19lo2kuC9BKccQSXvIp4rjlJiytwPR2lX8xzTl4p_vys",
      sheetName: "Sheet1",
      searchFields: ["Nama Kegiatan", "Detil", "Jenis", "Pembuat Daftar"],
      columns: [
        { key: "Id", header: "ID" },
        { key: "Nama Kegiatan", header: "Nama Kegiatan" },
        { key: "Detil", header: "Detil" },
        { key: "Jenis", header: "Jenis" },
        { key: "Pembuat Daftar", header: "Pembuat Daftar" },
        {
          key: "Link",
          header: "Link",
          render: (value: string) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80 transition-colors" />
                </a>
              </TooltipTrigger>
              <TooltipContent><p>Buka dokumen</p></TooltipContent>
            </Tooltip>
          ),
        },
      ],
    },
  ].sort((a, b) => a.title.localeCompare(b.title));

  const activeDocument = documents.find((doc) => doc.id === activeTab) || documents[0];

  const { data, isLoading, isError } = useDocumentData({
    sheetId: activeDocument.sheetId,
    sheetName: activeDocument.sheetName,
  });

  const filteredData = useMemo(() => {
    if (!data || !searchTerm) return data;
    const lowercasedSearch = searchTerm.toLowerCase();
    return data.filter((item) =>
      activeDocument.searchFields.some((field) => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(lowercasedSearch);
      })
    );
  }, [data, searchTerm, activeDocument.searchFields]);

  const paginatedData = useMemo(() => {
    if (!filteredData) return [];
    if (pageSize === 0) return filteredData;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
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

  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  return (
    <div className="min-h-screen bg-background pt-4 pb-16 px-6">
      {/* Header — Senada dengan Buat e-Dokumen & Linkers */}
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
          {/* Modern Pill Tabs */}
          <TabsList className="inline-flex flex-wrap gap-3 p-2 bg-muted/50 backdrop-blur-sm rounded-2xl border border-border/60">
            {documents.map((doc) => (
              <TabsTrigger
                key={doc.id}
                value={doc.id}
                className="px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300
                           data-[state=active]:bg-primary data-[state=active]:text-primary-foreground
                           data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30
                           hover:bg-primary/10"
              >
                {doc.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {documents.map((doc) => (
            <TabsContent key={doc.id} value={doc.id} className="mt-8 space-y-6">
              {/* Search + Rows per page */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Cari di ${doc.title.toLowerCase()}...`}
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

              {/* Table */}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-16 text-destructive font-semibold">
                  Gagal memuat data. Silakan refresh halaman.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border bg-card/90 backdrop-blur-sm shadow-xl overflow-hidden">
                    <DataTable title={doc.title} columns={doc.columns} data={paginatedData || []} />
                  </div>

                  {/* Pagination */}
                  {pageSize > 0 && totalItems > pageSize && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5 border-t bg-card/50 backdrop-blur-sm rounded-2xl px-6">
                      <p className="text-sm text-muted-foreground">
                        Menampilkan {(currentPage - 1) * pageSize + 1} -{" "}
                        {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} data
                      </p>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1}>
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="px-4 text-sm font-medium">
                          Halaman {currentPage} dari {totalPages}
                        </span>

                        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages}>
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