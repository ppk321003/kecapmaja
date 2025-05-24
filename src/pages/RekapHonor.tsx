import React, { useState } from "react";
import { FileSpreadsheet, Calendar, Banknote } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RekapHonor = () => {
  const [activeTab, setActiveTab] = useState("2025");

  const honorData = [
    {
      id: "2025",
      title: "2025",
      url: "https://docs.google.com/spreadsheets/d/1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng/edit"
    },
    {
      id: "2024",
      title: "2024", 
      url: "https://docs.google.com/spreadsheets/d/1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I/edit"
    },
    {
      id: "2023",
      title: "2023",
      url: "https://docs.google.com/spreadsheets/d/1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw/edit"
    }
  ];

  const activeHonorData = honorData.find(item => item.id === activeTab) || honorData[0];

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Banknote className="mx-auto h-10 w-10 text-blue-500" />
          <h1 className="text-3xl font-bold">Rekap Honor Mitra</h1>
          <p className="text-muted-foreground">
            Akses spreadsheet honor berdasarkan tahun anggaran
          </p>
        </div>

        {/* Year Selector */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            {honorData.map(item => (
              <TabsTrigger 
                key={item.id} 
                value={item.id}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {item.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Main Action Button */}
        <Button 
          size="lg"
          onClick={() => window.open(activeHonorData.url, '_blank')}
          className="px-8 py-6 text-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <FileSpreadsheet className="mr-3 h-5 w-5" />
          Buka Rekap {activeTab}
        </Button>

        {/* Secondary Info */}
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Data honor mitra akan terbuka di Google Spreadsheet terpisah
        </p>
      </div>
    </Layout>
  );
};

export default RekapHonor;