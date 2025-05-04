
import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const RekapHonorKegiatan = () => {
  const honorLinks = [
    {
      year: "2025",
      url: "https://docs.google.com/spreadsheets/d/1b51_2anraWMF47DYGCGGCfXMwfopX68HSs3z2dwcDng/edit?usp=sharing",
      title: "Rekap Honor 2025"
    },
    {
      year: "2024",
      url: "https://docs.google.com/spreadsheets/d/1lDq7-8rspR8qt424P5gwRmbpUTCcndSTKlV9eR0QD3I/edit?usp=sharing",
      title: "Rekap Honor 2024"
    },
    {
      year: "2023",
      url: "https://docs.google.com/spreadsheets/d/1f2eIDvVuF8N5X_UnrxmI99Y6vz4zY5TPDe6jq7X70Vw/edit?gid=1877950026#gid=1877950026",
      title: "Rekap Honor 2023"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekap Honor Mitra (Kegiatan)</h1>
          <p className="text-muted-foreground">
            Akses dokumen rekap honor mitra berdasarkan kegiatan per tahun.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {honorLinks.map((link) => (
            <Card key={link.year} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{link.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-muted-foreground mb-4">
                  Dokumen rekap honor mitra untuk tahun {link.year}
                </p>
                <div className="mt-auto pt-4">
                  <a 
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <span>Buka Dokumen</span>
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default RekapHonorKegiatan;
