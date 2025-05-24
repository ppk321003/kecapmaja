import React, { useState } from "react";
import { FileSpreadsheet, ExternalLink, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable"; // Jika ingin tetap pakai tabel
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDocumentData } from "@/hooks/use-document-data";

const RekapHonor = () => {
  const [activeTab, setActiveTab] = useState("2025");

  const honorData = [
    {
      id: "2025",
      title: "Rekap Honor 2025",
      sheetId: "1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng",
      url: "https://docs.google.com/spreadsheets/d/1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng/edit?usp=sharing",
    },
    {
      id: "2024",
      title: "Rekap Honor 2024",
      sheetId: "1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I",
      url: "https://docs.google.com/spreadsheets/d/1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I/edit?usp=sharing",
    },
    {
      id: "2023",
      title: "Rekap Honor 2023",
      sheetId: "1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw",
      url: "https://docs.google.com/spreadsheets/d/1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw/edit?gid=1877950026#gid=1877950026",
    },
  ];

  // Pastikan honorData tidak kosong
  const activeHonorData =
    honorData.length > 0
      ? honorData.find((item) => item.id === activeTab) || honorData[0]
      : null;

  // Jika tidak ada honorData, tampilkan pesan
  if (!activeHonorData) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Data honor tidak tersedia</h2>
          <p>Silakan tambahkan data honor untuk melihat laporan.</p>
        </div>
      </Layout>
    );
  }

  // Gunakan hook data hanya jika activeHonorData valid
  const { data, isLoading, isError } = useDocumentData({
    sheetId: activeHonorData.sheetId,
  });

  // Fungsi untuk generate kolom tabel
  const generateColumns = (data) => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]);
    return keys.map((key) => ({
      key,
      header: key,
      isSortable: true,
    }));
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">
            Rekap Honor Mitra (Kegiatan)
          </h1>
          <p className="text-muted-foreground text-lg">
            Lihat rekap honor mitra per kegiatan berdasarkan tahun anggaran. Data
            terbaru dan terperinci tersedia melalui tombol di bawah.
          </p>
        </div>

        {/* Tab Navigasi */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="flex justify-center space-x-4">
            {honorData.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                className="px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {item.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Konten per tab */}
          {honorData.map((item) => (
            <TabsContent
              key={item.id}
              value={item.id}
              className="p-4 bg-gray-50 rounded-lg shadow-md"
            >
              {/* Header dan tombol buka spreadsheet */}
              <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                <div className="flex items-center space-x-3 mb-2 md:mb-0">
                  <Calendar className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold text-gray-700">{item.title}</h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-2"
                  onClick={() => window.open(item.url, "_blank")}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Buka Spreadsheet</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              {/* Konten data */}
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : isError ? (
                <div className="text-center p-4 bg-red-100 rounded-lg text-red-600">
                  Gagal memuat data. Silakan coba lagi.
                </div>
              ) : data && data.length > 0 ? (
                // Jika tetap ingin tabel
                <div className="overflow-x-auto">
                  <DataTable
                    title={item.title}
                    columns={generateColumns(data)}
                    data={data}
                  />
                </div>
              ) : (
                <div className="text-center p-4 bg-yellow-100 rounded-lg text-yellow-700">
                  Tidak ada data yang tersedia.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default RekapHonor;