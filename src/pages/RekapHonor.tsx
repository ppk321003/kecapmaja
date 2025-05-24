import React, { useState } from "react";
import { FileSpreadsheet, ExternalLink, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const activeHonorData =
    honorData.find((item) => item.id === activeTab) || honorData[0];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header Utama */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-orange-700 mb-2">
            Rekap Honor Mitra (Kegiatan)
          </h1>
          <p className="text-muted-foreground text-lg">
            Pilih tahun anggaran untuk mengakses rekap honor mitra. Klik tombol di
            bawah untuk membuka spreadsheet terkait.
          </p>
        </div>

        {/* Tab Navigasi */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="mb-6">
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

          {/* Card Deskripsi dan Tombol */}
          {honorData.map((item) => (
            <TabsContent
              key={item.id}
              value={item.id}
              className="p-4 bg-gray-50 rounded-lg shadow-md"
            >
              {/* Card Deskripsi */}
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col md:flex-row items-center justify-between mb-4">
                <div className="flex items-center space-x-3 mb-4 md:mb-0">
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
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default RekapHonor;