import React, { useState } from "react";
import { FileSpreadsheet, ExternalLink, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocumentData } from "@/hooks/use-document-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const RekapHonor = () => {
  const [activeTab, setActiveTab] = useState("2025");

  const honorData = [
    {
      id: "2025",
      title: "2025",
      sheetId: "1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng",
      url: "https://docs.google.com/spreadsheets/d/1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng/edit?usp=sharing"
    },
    {
      id: "2024",
      title: "2024",
      sheetId: "1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I",
      url: "https://docs.google.com/spreadsheets/d/1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I/edit?usp=sharing"
    },
    {
      id: "2023",
      title: "2023",
      sheetId: "1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw",
      url: "https://docs.google.com/spreadsheets/d/1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw/edit?gid=1877950026#gid=1877950026"
    }
  ];

  const activeHonorData = honorData.find(item => item.id === activeTab) || honorData[0];
  const { data, isLoading, isError } = useDocumentData({ sheetId: activeHonorData.sheetId });

  // Format total honor
  const formatCurrency = (value) => {
    if (!value) return '-';
    const num = parseInt(value.replace(/\D/g, ''));
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekap Honor Mitra</h1>
          <p className="text-muted-foreground">
            Ringkasan pembayaran honor mitra tahun {activeTab}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              {honorData.map(item => (
                <TabsTrigger key={item.id} value={item.id}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {item.title}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button 
              variant="outline" 
              onClick={() => window.open(activeHonorData.url, '_blank')}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Buka Spreadsheet
              <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center p-8 text-red-500">
                Gagal memuat data. Silakan coba lagi.
              </div>
            ) : (
              <div className="space-y-3">
                {data?.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{item.kegiatan || 'Kegiatan tanpa nama'}</h3>
                        <p className="text-sm text-muted-foreground">{item.mitra || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.total)}</p>
                        <p className="text-sm text-muted-foreground">{item.tanggal || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default RekapHonor;