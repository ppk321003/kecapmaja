import React, { useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { useDocumentData } from "@/hooks/use-document-data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Data for each table with sheet IDs - sorted alphabetically
  const documents = [{
    id: "daftar-hadir",
    title: "Daftar Hadir",
    sheetId: "1STp5KR6OJBGuyvp-ohkrhS_QEoTREaaA59W7AkQ4Nak",
    sheetName: "Sheet1",
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Pelaksana Perjalanan Dinas",
      header: "Pelaksana Perjalanan Dinas"
    }, {
      key: "Nomor Surat Tugas",
      header: "Nomor Surat Tugas"
    }, {
      key: "Tujuan Pelaksanaan Perjalanan Dinas",
      header: "Tujuan Pelaksanaan Perjalanan Dinas"
    }, {
      key: "Jenis Perjalanan Dinas",
      header: "Jenis Perjalanan Dinas"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
    sheetName: "Lembur&Laporan",
    columns: [{
      key: "Id",
      header: "ID"
    }, {
      key: "Kegiatan",
      header: "Kegiatan"
    }, {
      key: "Tanggal Pelaksanaan",
      header: "Tanggal Pelaksanaan"
    }, {
      key: "Pembuat daftar",
      header: "Pembuat Daftar"
    }, {
      key: "Link",
      header: "Link",
      render: value => <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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
                  <LinkIcon className="h-5 w-5 text-blue-600 hover:text-blue-800" />
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

  return (
    <Layout>
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-auto flex flex-wrap mb-4 overflow-x-auto bg-inherit">
            {documents.map(doc => (
              <TabsTrigger 
                key={doc.id} 
                value={doc.id} 
                className="whitespace-nowrap text-neutral-100 bg-teal-700 hover:bg-teal-600 px-[15px] mx-[6px] py-[8px] my-[5px] rounded-3xl"
              >
                {doc.title}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {documents.map(doc => (
            <TabsContent key={doc.id} value={doc.id} className="mt-0">
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
                  <p className="text-red-500">Gagal memuat data. Silakan coba lagi.</p>
                </div>
              ) : (
                <DataTable 
                  title={doc.title} 
                  columns={doc.columns} 
                  data={data || []} 
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default DownloadDokumen;