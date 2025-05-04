
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const RekapHonorKegiatan = () => {
  const [activeTab, setActiveTab] = useState("2025");
  
  const documents = [
    {
      id: "2025",
      title: "Rekap Honor 2025",
      url: "https://docs.google.com/spreadsheets/d/1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng/edit?usp=sharing"
    },
    {
      id: "2024",
      title: "Rekap Honor 2024",
      url: "https://docs.google.com/spreadsheets/d/1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I/edit?usp=sharing"
    },
    {
      id: "2023",
      title: "Rekap Honor 2023",
      url: "https://docs.google.com/spreadsheets/d/1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw/edit?gid=1877950026#gid=1877950026"
    }
  ];
  
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekap Honor Mitra (Kegiatan)</h1>
          <p className="text-muted-foreground">
            Lihat rekap honor mitra berdasarkan kegiatan per tahun.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="2025">Rekap Honor 2025</TabsTrigger>
            <TabsTrigger value="2024">Rekap Honor 2024</TabsTrigger>
            <TabsTrigger value="2023">Rekap Honor 2023</TabsTrigger>
          </TabsList>
          
          {documents.map((doc) => (
            <TabsContent key={doc.id} value={doc.id}>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">{doc.title}</h2>
                    <p className="text-muted-foreground">
                      Klik tombol di bawah untuk membuka rekap honor dalam Google Spreadsheet.
                    </p>
                    <Button 
                      onClick={() => window.open(doc.url, "_blank")}
                      className="mt-4"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> Buka Dokumen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default RekapHonorKegiatan;
