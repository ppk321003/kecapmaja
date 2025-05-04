
import React, { useState } from "react";
import { Link } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { useDocumentData } from "@/hooks/use-document-data";
import { Skeleton } from "@/components/ui/skeleton";

const RekapHonor = () => {
  const [activeTab, setActiveTab] = useState("2025");

  const honorData = [
    {
      id: "2025",
      title: "Rekap Honor 2025",
      sheetId: "1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng"
    },
    {
      id: "2024",
      title: "Rekap Honor 2024",
      sheetId: "1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I"
    },
    {
      id: "2023",
      title: "Rekap Honor 2023",
      sheetId: "1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw"
    }
  ];

  // Get current active data
  const activeHonorData = honorData.find(item => item.id === activeTab) || honorData[0];
  
  // Fetch data for the active tab
  const { data, isLoading, isError } = useDocumentData({
    sheetId: activeHonorData.sheetId
  });

  // Define columns dynamically based on the first data item
  const generateColumns = (data: any[]) => {
    if (!data || data.length === 0) return [];
    
    // Get all keys from the first item
    const keys = Object.keys(data[0]);
    
    return keys.map(key => ({
      key,
      header: key,
      isSortable: true
    }));
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekap Honor Mitra (Kegiatan)</h1>
          <p className="text-muted-foreground">
            Lihat rekap honor mitra per kegiatan berdasarkan tahun anggaran.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {honorData.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.title}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {honorData.map((item) => (
            <TabsContent key={item.id} value={item.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
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
                  ) : data && data.length > 0 ? (
                    <DataTable 
                      title={item.title}
                      columns={generateColumns(data)}
                      data={data}
                    />
                  ) : (
                    <p className="text-center py-8">Tidak ada data yang tersedia.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default RekapHonor;
