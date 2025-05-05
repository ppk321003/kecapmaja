
import React, { useState } from "react";
import { Link } from "lucide-react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { useDocumentData } from "@/hooks/use-document-data";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const DownloadDokumen = () => {
  const [activeTab, setActiveTab] = useState("kerangka-acuan-kerja");

  // Data for each table with sheet IDs
  const documents = [
    {
      id: "kerangka-acuan-kerja",
      title: "Rekap Kerangka Acuan Kerja",
      sheetId: "1X5rRbRni_Bi5rhMa8XkPMWAvpMkvkIrXNdyuYiYMzBY",
      sheetName: "IMP.KAK",
      url: "https://docs.google.com/spreadsheets/d/1X5rRbRni_Bi5rhMa8XkPMWAvpMkvkIrXNdyuYiYMzBY/edit?usp=sharing",
      columns: [
        { key: "Id", header: "ID", isSortable: true },
        { key: "Jenis Kerangka Acuan Kerja", header: "Jenis Kerangka Acuan Kerja", isSortable: true },
        { key: "Nama Kegiatan-1", header: "Nama Kegiatan", isSortable: true },
        { key: "Nama Pembuat Daftar", header: "Nama Pembuat Daftar", isSortable: true },
        { 
          key: "Link", 
          header: "Link", 
          render: (value) => (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                  <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Buka dokumen</p>
              </TooltipContent>
            </Tooltip>
          )
        }
      ]
    },
    {
      id: "daftar-hadir",
      title: "Rekap Daftar Hadir",
      sheetId: "1STp5KR6OJBGuyvp-ohkrhS_QEoTREaaA59W7AkQ4Nak",
      columns: [{
        key: "Id",
        header: "ID",
        isSortable: true
      }, {
        key: "Nama Kegiatan",
        header: "Nama Kegiatan",
        isSortable: true
      }, {
        key: "Detil",
        header: "Detil",
        isSortable: true
      }, {
        key: "Tanggal Mulai",
        header: "Tanggal Mulai",
        isSortable: true
      }, {
        key: "Tanggal Selesai",
        header: "Tanggal Selesai",
        isSortable: true
      }, {
        key: "Nama Pembuat Daftar",
        header: "Nama Pembuat Daftar",
        isSortable: true
      }, {
        key: "Link",
        header: "Link",
        render: value => <Tooltip>
                <TooltipTrigger asChild>
                  <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                    <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buka dokumen</p>
                </TooltipContent>
              </Tooltip>
      }]
    }, 
    {
      id: "spj-honor",
      title: "Rekap SPJ Honor",
      sheetId: "13okXNIK6L-ZaIYWqu7qSZNmTW3ENgt7H3gk4BbqrTPs",
      columns: [{
        key: "Id",
        header: "ID",
        isSortable: true
      }, {
        key: "Nama Kegiatan",
        header: "Nama Kegiatan",
        isSortable: true
      }, {
        key: "Detil",
        header: "Detil",
        isSortable: true
      }, {
        key: "Tanggal SPJ",
        header: "Tanggal SPJ",
        isSortable: true
      }, {
        key: "Nama Pembuat Daftar",
        header: "Nama Pembuat Daftar",
        isSortable: true
      }, {
        key: "Link",
        header: "Link",
        render: value => <Tooltip>
                <TooltipTrigger asChild>
                  <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                    <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buka dokumen</p>
                </TooltipContent>
              </Tooltip>
      }]
    }, 
    {
      id: "transport-lokal",
      title: "Rekap Transport Lokal",
      sheetId: "1muy4_6suFJy4dt5M79eVxuAn8gJVooZdOkYVO5zTzGY",
      columns: [{
        key: "Id",
        header: "ID",
        isSortable: true
      }, {
        key: "Nama Kegiatan",
        header: "Nama Kegiatan",
        isSortable: true
      }, {
        key: "Detil",
        header: "Detil",
        isSortable: true
      }, {
        key: "Tanggal SPJ",
        header: "Tanggal SPJ",
        isSortable: true
      }, {
        key: "Nama Pembuat Daftar",
        header: "Nama Pembuat Daftar",
        isSortable: true
      }, {
        key: "Link",
        header: "Link",
        render: value => <Tooltip>
                <TooltipTrigger asChild>
                  <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                    <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buka dokumen</p>
                </TooltipContent>
              </Tooltip>
      }]
    }, 
    {
      id: "uang-harian-transport",
      title: "Rekap Uang Harian dan Transport Lokal",
      sheetId: "19lo2kuC9BKccQSXvIp4rjlJiytwPR2lX8xzTl4p_vys",
      columns: [{
        key: "Id",
        header: "ID",
        isSortable: true
      }, {
        key: "Nama Kegiatan",
        header: "Nama Kegiatan",
        isSortable: true
      }, {
        key: "Detil",
        header: "Detil",
        isSortable: true
      }, {
        key: "Tanggal Mulai",
        header: "Tanggal Mulai",
        isSortable: true
      }, {
        key: "Tanggal Selesai",
        header: "Tanggal Selesai",
        isSortable: true
      }, {
        key: "Tanggal (SPJ)",
        header: "Tanggal (SPJ)",
        isSortable: true
      }, {
        key: "Nama Pembuat Daftar",
        header: "Nama Pembuat Daftar",
        isSortable: true
      }, {
        key: "Link",
        header: "Link",
        render: value => <Tooltip>
                <TooltipTrigger asChild>
                  <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                    <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buka dokumen</p>
                </TooltipContent>
              </Tooltip>
      }]
    }, 
    {
      id: "kuitansi-perjalanan-dinas",
      title: "Rekap Kuitansi Perjalanan Dinas",
      sheetId: "10Rc_YT8xv_gOnuuRWAQyVEkxfgTOWiTH5lQt3guNAa0",
      columns: [{
        key: "Id",
        header: "ID",
        isSortable: true
      }, {
        key: "Nama Pelaksana",
        header: "Nama Pelaksana",
        isSortable: true
      }, {
        key: "Nomor Surat Tugas",
        header: "Nomor Surat Tugas",
        isSortable: true
      }, {
        key: "Tujuan Pelaksanaan",
        header: "Tujuan Pelaksanaan",
        isSortable: true
      }, {
        key: "Nama Tempat Tujuan",
        header: "Nama Tempat Tujuan",
        isSortable: true
      }, {
        key: "Link",
        header: "Link",
        render: value => <Tooltip>
                <TooltipTrigger asChild>
                  <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                    <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buka dokumen</p>
                </TooltipContent>
              </Tooltip>
      }]
    }, 
    {
      id: "dokumen-pengadaan",
      title: "Rekap Dokumen Pengadaan",
      sheetId: "1WMAggLC15LYEXfZRtkr4aEOc7l7pHsj2XH0JVLqaMiE",
      columns: [{
        key: "Id",
        header: "ID",
        isSortable: true
      }, {
        key: "Nama Paket Pengadaan",
        header: "Nama Paket Pengadaan",
        isSortable: true
      }, {
        key: "Tanggal Mulai Pelaksanaan",
        header: "Tanggal Mulai Pelaksanaan",
        isSortable: true
      }, {
        key: "Tanggal Selesai Pelaksanaan",
        header: "Tanggal Selesai Pelaksanaan",
        isSortable: true
      }, {
        key: "Nama Penyedia Barang/Jasa",
        header: "Nama Penyedia Barang/Jasa",
        isSortable: true
      }, {
        key: "Link",
        header: "Link",
        render: value => <Tooltip>
                <TooltipTrigger asChild>
                  <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                    <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buka dokumen</p>
                </TooltipContent>
              </Tooltip>
      }]
    }, 
    {
      id: "tanda-terima",
      title: "Rekap Tanda Terima",
      sheetId: "1REwVfh5DNiY2UM1g-hjvSMcz-bUglMuHlDFnaEQkbgU",
      columns: [{
        key: "Id",
        header: "ID",
        isSortable: true
      }, {
        key: "Nama Kegiatan",
        header: "Nama Kegiatan",
        isSortable: true
      }, {
        key: "Detil",
        header: "Detil",
        isSortable: true
      }, {
        key: "Tanggal Pembuatan Daftar",
        header: "Tanggal Pembuatan Daftar",
        isSortable: true
      }, {
        key: "Nama Pembuat Daftar",
        header: "Nama Pembuat Daftar",
        isSortable: true
      }, {
        key: "Link",
        header: "Link",
        render: value => <Tooltip>
                <TooltipTrigger asChild>
                  <a href={value} target="_blank" rel="noreferrer" className="flex justify-center">
                    <Link className="h-5 w-5 text-blue-600 hover:text-blue-800" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Buka dokumen</p>
                </TooltipContent>
              </Tooltip>
      }]
    }
  ];

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
          <h1 className="text-2xl font-bold tracking-tight">Download Dokumen</h1>
          <p className="text-muted-foreground">
            Lihat dan download dokumen yang tersedia dalam format tabel.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-auto flex flex-wrap mb-4 overflow-x-auto bg-slate-300">
            {documents.map(doc => (
              <TabsTrigger key={doc.id} value={doc.id} className="whitespace-nowrap">
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
                <DataTable title={doc.title} columns={doc.columns} data={data || []} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default DownloadDokumen;
