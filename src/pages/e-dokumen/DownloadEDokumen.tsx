import { useState, useMemo, useCallback } from "react";
import { Link as LinkIcon, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Pencil, Plus, Trash, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { useDocumentData } from "@/hooks/use-document-data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedActionRow, setExpandedActionRow] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingData, setDeletingData] = useState<any>(null);
  const [deletingDoc, setDeletingDoc] = useState<any>(null);
  const satkerContext = useSatkerConfigContext();

  // Mapping of document IDs to form URLs and display names
  const documentFormMap = {
    "daftar-hadir": { url: "/e-dokumen/daftar-hadir", name: "Daftar Hadir" },
    "dokumen-pengadaan": { url: "/e-dokumen/dokumen-pengadaan", name: "Dokumen Pengadaan" },
    "kerangka-acuan-kerja": { url: "/e-dokumen/kak", name: "Kerangka Acuan Kerja" },
    "kuitansi-perjalanan-dinas": { url: "/e-dokumen/kuitansi-perjalanan", name: "Kuitansi Perjalanan Dinas" },
    "kuitansi-transport-lokal": { url: "/e-dokumen/kuitansi-transport", name: "Kuitansi Transport Lokal" },
    "lembur-laporan": { url: "/e-dokumen/lembur-laporan", name: "Lembur & Laporan" },
    "spj-honor": { url: "/e-dokumen/spj-honor", name: "SPJ Honor" },
    "SuratKeputusan": { url: "/e-dokumen/surat-keputusan", name: "Surat Keputusan" },
    "surat-pernyataan": { url: "/e-dokumen/surat-pernyataan", name: "Surat Pernyataan" },
    "tanda-terima": { url: "/e-dokumen/tanda-terima", name: "Tanda Terima" },
    "transport-lokal": { url: "/e-dokumen/transport-lokal", name: "Transport Lokal" },
    "uang-harian-transport": { url: "/e-dokumen/uang-harian-transport", name: "Uang Harian dan Transport Lokal" }
  };

  // Get sheet IDs from satker config
  const satkerConfig = satkerContext?.getUserSatkerConfig() || {};
  const sheetIds = {
    daftarhadir_sheet_id: satkerConfig.daftarhadir_sheet_id || "1STp5KR6OJBGuyvp-ohkrhS_QEoTREaaA59W7AkQ4Nak",
    dokpengadaan_sheet_id: satkerConfig.dokpengadaan_sheet_id || "1WMAggLC15LYEXfZRtkr4aEOc7l7pHsj2XH0JVLqaMiE",
    kak_sheet_id: satkerConfig.kak_sheet_id || "1FoRGchGACEq4E7Xh0XgvNTNI4VhTR5pIDGb9rwFY6cc",
    kuiperjadin_sheet_id: satkerConfig.kuiperjadin_sheet_id || "10Rc_YT8xv_gOnuuRWAQyVEkxfgTOWiTH5lQt3guNAa0",
    kuitranport_sheet_id: satkerConfig.kuitranport_sheet_id || "1_FRKSUzW12r5xGRA15fJrTjRRu7ma6omC00jNIgrKXc",
    lembur_sheet_id: satkerConfig.lembur_sheet_id || "1baYH5dM7cAaMCRQY63YkzgqLIsb_-67Tyixno2zZEjE",
    spjhonor_sheet_id: satkerConfig.spjhonor_sheet_id || "13okXNIK6L-ZaIYWqu7qSZNmTW3ENgt7H3gk4BbqrTPs",
    sk_sheet_id: satkerConfig.sk_sheet_id || "1v591kPdTuYOldaz3tbqoQYnS3QYubt-qb1OrotBkhlc",
    super_sheet_id: satkerConfig.super_sheet_id || "1hy6xHWIcCcgfSHe-jWhIoDNR991PDI-2DmOFvX1UeIs",
    tandaterima_sheet_id: satkerConfig.tandaterima_sheet_id || "1REwVfh5DNiY2UM1g-hjvSMcz-bUglMuHlDFnaEQkbgU",
    spjtranslok_sheet_id: satkerConfig.spjtranslok_sheet_id || "1muy4_6suFJy4dt5M79eVxuAn8gJVooZdOkYVO5zTzGY",
    uh_sheet_id: satkerConfig.uh_sheet_id || "19lo2kuC9BKccQSXvIp4rjlJiytwPR2lX8xzTl4p_vys"
  };

  // Data for each table with sheet IDs - sorted alphabetically
  const documents = [{
    id: "daftar-hadir",
    title: "Daftar Hadir",
    sheetId: sheetIds.daftarhadir_sheet_id,
    sheetName: "DaftarHadir",
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
    sheetId: sheetIds.dokpengadaan_sheet_id,
    sheetName: "OlahDokumenPengadaan",
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
    sheetId: sheetIds.kak_sheet_id,
    sheetName: "KerangkaAcuanKerja",
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
    sheetId: sheetIds.kuiperjadin_sheet_id,
    sheetName: "KuitansiPerjalananDinas",
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
    sheetId: sheetIds.kuitranport_sheet_id,
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
    sheetId: sheetIds.lembur_sheet_id,
    sheetName: "Lembur",
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
    sheetId: sheetIds.spjhonor_sheet_id,
    sheetName: "SPJHonor",
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
    sheetId: sheetIds.sk_sheet_id,
    sheetName: "SuratKeputusan",
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
    sheetId: sheetIds.super_sheet_id,
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
    sheetId: sheetIds.tandaterima_sheet_id,
    sheetName: "TandaTerima",
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
    sheetId: sheetIds.spjtranslok_sheet_id,
    sheetName: "TransportLokal",
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
    sheetId: sheetIds.uh_sheet_id,
    sheetName: "UangHarianTransport",
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

  // Add action column to all documents
  const documentsWithActions = documents.map(doc => ({
    ...doc,
    columns: [
      ...doc.columns.filter(col => col.key !== "Link"),
      {
        key: "Aksi",
        header: "Aksi",
        render: (_, rowData) => {
          // Guard against undefined rowData
          if (!rowData || typeof rowData !== 'object') {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          
          const rowId = (rowData.Id || '').toString().trim();
          if (!rowId) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          
          const isExpanded = expandedActionRow === rowId;
          
          return (
            <div className="flex gap-1 justify-center items-center" onClick={(e) => e.stopPropagation()}>
              {isExpanded ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (doc.id === 'daftar-hadir') {
                        // Open full edit page
                        const id = rowData.Id || rowData.Id || '';
                        if (id) {
                          window.location.href = `/e-dokumen/daftar-hadir/edit/${id}`;
                        }
                      } else {
                        setEditingData(rowData);
                        setEditingDoc(doc);
                        setEditDialogOpen(true);
                      }
                      setExpandedActionRow(null);
                    }}
                    className="h-7 w-7 p-0 hover:bg-blue-100"
                  >
                    <Pencil className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    title="Duplikat"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateRow(doc, rowData);
                      setExpandedActionRow(null);
                    }}
                    className="h-7 w-7 p-0 hover:bg-green-100"
                  >
                    <Plus className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    title="Hapus"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingData(rowData);
                      setDeletingDoc(doc);
                      setDeleteDialogOpen(true);
                      setExpandedActionRow(null);
                    }}
                    className="h-7 w-7 p-0 hover:bg-red-100"
                  >
                    <Trash className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedActionRow(null);
                    }}
                    className="h-7 w-7 p-0"
                    title="Tutup"
                  >
                    <Eye className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  title="Lihat aksi"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedActionRow(rowId);
                  }}
                  className="h-7 w-7 p-0 hover:bg-gray-100"
                >
                  <Eye className="h-3.5 w-3.5 text-gray-600" />
                </Button>
              )}
            </div>
          );
        }
      },
      {
        key: "Link",
        header: "Link",
        render: value => {
          if (!value || value.trim() === '') {
            return <span className="text-xs text-muted-foreground">Link belum tersedia</span>;
          }
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-primary hover:text-primary/80" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
          );
        }
      }
    ]
  }));

  // Get the active document
  const activeDocument = documentsWithActions.find(doc => doc.id === activeTab) || documentsWithActions[0];

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Trigger a refetch by resetting data
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Selesai",
        description: "Data telah diperbarui"
      });
    }, 500);
  }, []);

  // Handle Edit: Show dialog
  const handleEditRow = useCallback((doc, rowData) => {
    setEditingData(rowData);
    setEditingDoc(doc);
    setEditDialogOpen(true);
  }, []);

  // Handle Edit Submit
  const handleEditSubmit = useCallback(async () => {
    try {
      // Update in Google Sheets
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: editingDoc.sheetId,
          operation: "update",
          range: `${editingDoc.sheetName}`,
          values: [Object.values(editingData)]
        }
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data telah diperbarui"
      });

      setEditDialogOpen(false);
      setEditingData(null);
      setEditingDoc(null);
      // Refresh data
      handleRefresh();
    } catch (error) {
      console.error('Edit error:', error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Terjadi kesalahan saat memperbarui data"
      });
    }
  }, [editingData, editingDoc, handleRefresh]);

  // Handle Duplicate: Copy row and generate new ID
  const handleDuplicateRow = useCallback(async (doc, rowData) => {
    try {
      if (doc.id === 'daftar-hadir') {
        // Call serverless duplicate endpoint
        const id = rowData.Id;
        const res = await fetch(`/functions/v1/edokumen-daftar-hadir/${encodeURIComponent(id)}/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Duplicate failed');
        }
        let data: any;
        try {
          data = await res.json();
        } catch (e) {
          const text = await res.text().catch(() => '');
          console.error('Invalid JSON response for duplicate POST', e, text);
          throw new Error('Respon server tidak valid');
        }
        toast({ title: 'Berhasil', description: `Data berhasil diduplikat dengan ID baru: ${data.newId}` });
      } else {
        // Fallback to existing behavior
        const currentId = rowData.Id || "0";
        const idParts = currentId.split('-');
        const prefix = idParts[0] || '';
        let numericPart = idParts[1] || currentId;
        const dateMatch = numericPart.match(/^(\d{4})(\d{2})(.{3})$/);
        let newId = currentId;
        if (dateMatch) {
          const yymm = dateMatch[1] + dateMatch[2];
          const seqStr = dateMatch[3];
          let seq = parseInt(seqStr) || 0;
          seq += 1;
          const newSeqStr = String(seq).padStart(3, '0');
          newId = `${prefix}-${yymm}${newSeqStr}`;
        } else {
          const numVal = parseInt(numericPart) || 0;
          newId = `${prefix}-${String(numVal + 1).padStart(numericPart.length, '0')}`;
        }
        const newRow = { ...rowData, Id: newId };
        const { data: result, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: doc.sheetId,
            operation: "append",
            range: `${doc.sheetName}!A:Z`,
            values: [Object.values(newRow)]
          }
        });
        if (error) throw error;
        toast({ title: 'Berhasil', description: `Data berhasil diduplikat dengan ID baru: ${newId}` });
      }

      handleRefresh();
    } catch (error) {
      console.error('Duplicate error:', error);
      toast({ variant: 'destructive', title: 'Gagal', description: 'Terjadi kesalahan saat menduplikat data' });
    }
  }, [handleRefresh]);

  // Handle Delete: Show confirmation dialog
  const handleDeleteRow = useCallback(async (doc, rowData) => {
    setDeletingData(rowData);
    setDeletingDoc(doc);
    setDeleteDialogOpen(true);
  }, []);

  // Handle Delete Confirm
  const handleDeleteConfirm = useCallback(async () => {
    try {
      if (deletingDoc.id === 'daftar-hadir') {
        const id = deletingData?.Id;
        const res = await fetch(`/functions/v1/edokumen-daftar-hadir/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Delete failed');
        }
      } else {
        const { data: result, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: deletingDoc.sheetId,
            operation: "delete",
            range: `${deletingDoc.sheetName}`,
            values: [[deletingData.Id]]
          }
        });

        if (error) throw error;
      }

      toast({
        title: "Berhasil",
        description: "Data telah dihapus dari database"
      });

      setDeleteDialogOpen(false);
      setDeletingData(null);
      setDeletingDoc(null);
      // Refresh data
      handleRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Terjadi kesalahan saat menghapus data"
      });
    }
  }, [deletingData, deletingDoc, handleRefresh]);

  // Fetch data for the active document
  const {
    data,
    isLoading,
    isError
  } = useDocumentData({
    sheetId: activeDocument.sheetId,
    sheetName: activeDocument.sheetName
  });

  // Filter data based on search term and sort by latest (descending)
  const filteredData = useMemo(() => {
    let filtered = data;
    
    if (!filtered) return [];
    
    // Apply search filter
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        activeDocument.searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(lowercasedSearch);
        })
      );
    }

    // Sort by ID descending (latest first)
    // Extract YYYYMM and sequence from formatted IDs (e.g., pbj-2601001 -> YYYYMM: 2601, SEQ: 001)
    return filtered.sort((a, b) => {
      const extractSortKey = (id: string) => {
        if (!id) return { yyyymm: 0, seq: 0 };
        
        // Split by dash and get the numeric part
        const parts = id.split('-');
        const numericPart = parts[1] || '';
        
        if (!numericPart || numericPart.length < 4) {
          return { yyyymm: 0, seq: 0 };
        }
        
        // Extract YYYYMM (first 4 digits) and sequence (remaining digits)
        const yyyymm = parseInt(numericPart.substring(0, 4)) || 0;
        const seq = parseInt(numericPart.substring(4)) || 0;
        
        return { yyyymm, seq };
      };
      
      const aKey = extractSortKey(a.Id);
      const bKey = extractSortKey(b.Id);
      
      // Sort by YYYYMM descending first (newer dates first)
      if (bKey.yyyymm !== aKey.yyyymm) {
        return bKey.yyyymm - aKey.yyyymm;
      }
      
      // Then sort by sequence descending (higher sequence first)
      return bKey.seq - aKey.seq;
    });
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orange-600 tracking-tight">Download Dokumen</h1>
          <p className="text-muted-foreground">
            Lihat dan download dokumen yang tersedia dalam format tabel.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Waktu server: {new Date().toLocaleString('id-ID', indonesianOptions)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full h-auto flex flex-wrap mb-4 overflow-x-auto bg-muted/80 p-1 rounded-full shadow-inner justify-center">
          {documentsWithActions.map(doc => (
            <TabsTrigger 
              key={doc.id} 
              value={doc.id} 
              className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary whitespace-nowrap"
            >
              {doc.title}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {documentsWithActions.map(doc => (
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

      {/* Edit Dialog - Redirect to form page */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data - {editingDoc?.title}</DialogTitle>
            <DialogDescription>
              Silakan gunakan form input di bawah untuk mengubah data. Ubah data yang diperlukan, lalu klik "Simpan" untuk menyimpan perubahan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              💡 <strong>Petunjuk:</strong> Form di bawah menampilkan form input dari dokumen "{editingDoc?.title}". 
              Anda dapat mengedit semua field yang tersedia.
            </p>
          </div>

          {editingData && editingDoc && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-gray-50 p-4 rounded border">
                <h4 className="font-semibold text-sm mb-3">Data yang dipilih untuk diedit:</h4>
                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">ID:</span>
                    <span className="text-sm">{editingData.Id}</span>
                  </div>
                  {editingData['Nama Kegiatan'] && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Nama Kegiatan:</span>
                      <span className="text-sm">{editingData['Nama Kegiatan']}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">Edit Data:</h4>
                <div className="grid gap-3">
                  {Object.entries(editingData).map(([key, value]) => (
                    (key !== 'Link' && key !== 'Id') && (
                      <div key={key} className="grid gap-1">
                        <label className="text-xs font-medium text-gray-700">{key}</label>
                        <input
                          type="text"
                          value={String(value || '')}
                          onChange={(e) => {
                            setEditingData({
                              ...editingData,
                              [key]: e.target.value
                            });
                          }}
                          className="w-full px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setEditingData(null);
              setEditingDoc(null);
            }}>
              Batal
            </Button>
            <Button onClick={handleEditSubmit}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-4">Apakah Anda yakin ingin menghapus data ini? Aksi ini tidak dapat diulang.</p>
                <div className="mt-3 p-3 bg-muted rounded text-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <strong>ID:</strong>
                    <span>{deletingData?.Id}</span>
                  </div>
                  {(deletingData?.['Nama Kegiatan'] || deletingData?.['kegiatan'] || deletingData?.['Kegiatan']) && (
                    <div className="flex justify-between items-start">
                      <strong>Nama Kegiatan:</strong>
                      <span>{deletingData?.['Nama Kegiatan'] || deletingData?.['kegiatan'] || deletingData?.['Kegiatan']}</span>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DownloadDokumen;