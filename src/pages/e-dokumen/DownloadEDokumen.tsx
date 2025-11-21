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

// Set Indonesian Timezone
const indonesianOptions = {
  timeZone: 'Asia/Jakarta',
  weekday: 'long' as const,
  year: 'numeric' as const,
  month: 'long' as const,
  day: 'numeric' as const,
  hour: '2-digit' as const,
  minute: '2-digit' as const,
  second: '2-digit' as const
};

const DownloadDokumen = () => {
  const [activeTab, setActiveTab] = useState("daftar-hadir");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Data for each table with sheet IDs - sorted alphabetically
  const documents = [{
    id: "daftar-hadir",
    title: "Daftar Hadir",
    sheetId: "1STp5KR6OJBGuyvp-ohkrhS_QEoTREaaA59W7AkQ4Nak",
    sheetName: "Sheet1",
    searchFields: ["Jenis", "Nama Kegiatan", "Pembuat Daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Jenis",
      header: "Jenis"
    }, {
      key: "Nama Kegiatan",
      header: "Nama Kegiatan"
    }, {
      key: "Pembuat Daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "dokumen-pengadaan",
    title: "Dokumen Pengadaan",
    sheetId: "1WMAggLC15LYEXfZRtkr4aEOc7l7pHsj2XH0JVLqaMiE",
    sheetName: "Sheet1",
    searchFields: ["Nama Paket Pengadaan", "Kode Kegiatan", "Penyedia Barang/Jasa"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Nama Paket Pengadaan",
      header: "Nama Paket Pengadaan"
    }, {
      key: "Kode Kegiatan",
      header: "Kode Kegiatan"
    }, {
      key: "Penyedia Barang/Jasa",
      header: "Penyedia Barang/Jasa"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "kerangka-acuan-kerja",
    title: "Kerangka Acuan Kerja",
    sheetId: "1FoRGchGACEq4E7Xh0XgvNTNI4VhTR5pIDGb9rwFY6cc",
    sheetName: "Sheet1",
    searchFields: ["Jenis Kerangka Acuan Kerja", "Nama Kegiatan-1", "Nama Pembuat Daftar"],
    columns: [{
      key: "Id",
      header: "Id"
    }, {
      key: "Jenis Kerangka Acuan Kerja",
      header: "Jenis Kerangka Acuan Kerja"
    }, {
      key: "Nama Kegiatan-1",
      header: "Nama Kegiatan"
    }, {
      key: "Nama Pembuat Daftar",
      header: "Nama Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "kuitansi-perjalanan-dinas",
    title: "Kuitansi Perjalanan Dinas",
    sheetId: "10Rc_YT8xv_gOnuuRWAQyVEkxfgTOWiTH5lQt3guNAa0",
    sheetName: "Sheet1",
    searchFields: ["Pelaksana Perjalanan Dinas", "Tujuan Pelaksanaan Perjalanan Dinas", "Jenis Perjalanan Dinas"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Jenis Perjalanan Dinas",
      header: "Jenis Perjalanan Dinas"
    }, {
      key: "Nomor Surat Tugas",
      header: "Nomor Surat Tugas"
    }, {
      key: "Tujuan Pelaksanaan Perjalanan Dinas",
      header: "Tujuan Pelaksanaan Perjalanan Dinas"
    }, {
      key: "Pelaksana Perjalanan Dinas",
      header: "Pelaksana Perjalanan Dinas"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "kuitansi-transport-lokal",
    title: "Kuitansi Transport Lokal",
    sheetId: "1_FRKSUzW12r5xGRA15fJrTjRRu7ma6omC00jNIgrKXc",
    sheetName: "KuitansiTransportLokal",
    searchFields: ["Tujuan", "Pembuat daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Tujuan",
      header: "Tujuan Kegiatan"
    },{
      key: "Tanggal Pengajuan",
      header: "Tanggal Pengajuan",
      render: (value) => {
        // Handle jika value adalah string Date(...)
        if (typeof value === 'string' && value.startsWith('Date(')) {
          // Ekstrak parameter dari Date(2025,7,21)
          const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]); // 0-based (0=Januari, 1=Februari, ...)
            const day = parseInt(match[3]);
            
            // Array nama bulan dalam Bahasa Indonesia
            const monthNames = [
              'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
              'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
            ];
            
            return `${day} ${monthNames[month]} ${year}`;
          }
        }
        
        // Fallback untuk format lain atau nilai null
        return value || '-';
      }
    }, {
      key: "Pembuat daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "lembur-laporan",
    title: "Lembur & Laporan",
    sheetId: "1baYH5dM7cAaMCRQY63YkzgqLIsb_-67Tyixno2zZEjE",
    sheetName: "Sheet1",
    searchFields: ["Kegiatan", "Pembuat daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Kegiatan",
      header: "Kegiatan"
    }, {
      key: "Tanggal Surat Tugas Lembur",
      header: "Tanggal Surat Tugas Lembur",
      render: (value) => {
        // Handle jika value adalah string Date(...)
        if (typeof value === 'string' && value.startsWith('Date(')) {
          // Ekstrak parameter dari Date(2025,7,21)
          const match = value.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]); // 0-based (0=Januari, 1=Februari, ...)
            const day = parseInt(match[3]);
            
            // Array nama bulan dalam Bahasa Indonesia
            const monthNames = [
              'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
              'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
            ];
            
            return `${day} ${monthNames[month]} ${year}`;
          }
        }
        
        // Fallback untuk format lain atau nilai null
        return value || '-';
      }
    }, {
      key: "Pembuat daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "spj-honor",
    title: "SPJ Honor",
    sheetId: "13okXNIK6L-ZaIYWqu7qSZNmTW3ENgt7H3gk4BbqrTPs",
    sheetName: "Sheet1",
    searchFields: ["Nama Kegiatan", "Jenis", "Detil", "Pembuat Daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Nama Kegiatan",
      header: "Nama Kegiatan"
    }, {
      key: "Jenis",
      header: "Jenis"
    }, {
      key: "Detil",
      header: "Detil"
    }, {
      key: "Pembuat Daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "SuratKeputusan", 
    title: "Surat Keputusan",
    sheetId: "1v591kPdTuYOldaz3tbqoQYnS3QYubt-qb1OrotBkhlc",
    sheetName: "Sheet1",
    searchFields: ["no_sk", "tentang", "Pembuat daftar"],
    columns: [{
      key: "Id",
      header: "Id"
    }, {
      key: "no_sk",
      header: "Nomor SK"
    }, {
      key: "tentang",
      header: "Tentang"
    }, {
      key: "Pembuat daftar",
      header: "Pembuat daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "surat-pernyataan",
    title: "Surat Pernyataan",
    sheetId: "1hy6xHWIcCcgfSHe-jWhIoDNR991PDI-2DmOFvX1UeIs",
    sheetName: "SuratPernyataan",
    searchFields: ["Jenis Surat Pernyataan", "kegiatan", "Organik", "Mitra Statistik", "Pembuat daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Jenis Surat Pernyataan",
      header: "Jenis Surat Pernyataan"
    }, {
      key: "kegiatan",
      header: "Kegiatan"
    }, {
      key: "Organik",
      header: "Nama Organik"
    },  {
      key: "Mitra Statistik",
      header: "Mitra Statistik"
    }, {
      key: "Pembuat daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "tanda-terima",
    title: "Tanda Terima",
    sheetId: "1REwVfh5DNiY2UM1g-hjvSMcz-bUglMuHlDFnaEQkbgU",
    sheetName: "Sheet1",
    searchFields: ["Nama Kegiatan", "Detail Kegiatan", "Pembuat Daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Nama Kegiatan",
      header: "Nama Kegiatan"
    }, {
      key: "Detail Kegiatan",
      header: "Detail Kegiatan"
    }, {
      key: "Pembuat Daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "transport-lokal",
    title: "Transport Lokal",
    sheetId: "1muy4_6suFJy4dt5M79eVxuAn8gJVooZdOkYVO5zTzGY",
    sheetName: "Sheet1",
    searchFields: ["Nama Kegiatan", "Detil", "Pembuat Daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Nama Kegiatan",
      header: "Nama Kegiatan"
    }, {
      key: "Detil",
      header: "Detil"
    }, {
      key: "Pembuat Daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }, {
    id: "uang-harian-transport",
    title: "Uang Harian dan Transport Lokal",
    sheetId: "19lo2kuC9BKccQSXvIp4rjlJiytwPR2lX8xzTl4p_vys",
    sheetName: "Sheet1",
    searchFields: ["Nama Kegiatan", "Detil", "Jenis", "Pembuat Daftar"],
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Nama Kegiatan",
      header: "Nama Kegiatan"
    }, {
      key: "Detil",
      header: "Detil"
    }, {
      key: "Jenis",
      header: "Jenis"
    }, {
      key: "Pembuat Daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
    }]
  }].sort((a, b) => a.title.localeCompare(b.title));

  // Get the active document
  const activeDocument = documents.find(doc => doc.id === activeTab) || documents[0];

  // Fetch data for the active document
  const {
    data,
    isLoading,
    isError
  } = useDocumentData({
    sheetId: activeDocument.sheetId,
    sheetName: activeDocument.sheetName
  });

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!data || !searchTerm) return data;

    const lowercasedSearch = searchTerm.toLowerCase();
    return data.filter(item => 
      activeDocument.searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(lowercasedSearch);
      })
    );
  }, [data, searchTerm, activeDocument.searchFields]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    if (!filteredData) return [];
    
    if (pageSize === 0) return filteredData; // Show all data
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil((filteredData?.length || 0) / (pageSize || 1));
  const totalItems = filteredData?.length || 0;

  // Reset pagination when data changes
  const handleTabChange = (value) => {
    setSearchTerm("");
    setCurrentPage(1);
    setActiveTab(value);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(parseInt(value));
    setCurrentPage(1);
  };

  // Pagination handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orange-600 tracking-tight">Download Dokumen</h1>
        <p className="text-muted-foreground">
          Lihat dan download dokumen yang tersedia dalam format tabel.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Waktu server: {new Date().toLocaleString('id-ID', indonesianOptions)}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full h-auto flex flex-wrap mb-4 overflow-x-auto bg-inherit">
          {documents.map(doc => (
            <TabsTrigger 
              key={doc.id} 
              value={doc.id} 
              className="whitespace-nowrap text-primary-foreground bg-primary hover:bg-primary/90 px-[15px] mx-[6px] py-[8px] my-[5px] rounded-3xl"
            >
              {doc.title}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {documents.map(doc => (
          <TabsContent key={doc.id} value={doc.id} className="mt-0 space-y-4">
            {/* Search and Page Size Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={`Cari ${doc.title.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Tampilkan:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-24">
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

            {/* Data Table */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <div className="text-center p-8">
                <p className="text-destructive">Gagal memuat data. Silakan coba lagi.</p>
              </div>
            ) : (
              <>
                <DataTable 
                  title={doc.title} 
                  columns={doc.columns} 
                  data={paginatedData || []}
                />
                
                {/* Pagination Controls */}
                {pageSize > 0 && totalItems > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} data
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                        Awal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Sebelumnya
                      </Button>
                      
                      <span className="text-sm text-muted-foreground mx-2">
                        Halaman {currentPage} dari {totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Selanjutnya
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Akhir
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
  );
};

export default DownloadDokumen;