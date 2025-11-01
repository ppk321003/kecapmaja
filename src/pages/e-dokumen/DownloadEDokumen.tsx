import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download } from "lucide-react";

export default function DownloadEDokumen() {
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "daftar-hadir", label: "Daftar Hadir" },
    { id: "dokumen-pengadaan", label: "Dokumen Pengadaan" },
    { id: "kak", label: "Kerangka Acuan Kerja" },
    { id: "kuitansi-perjalanan", label: "Kuitansi Perjalanan Dinas" },
    { id: "kuitansi-transport", label: "Kuitansi Transport Lokal" },
    { id: "lembur-laporan", label: "Lembur & Laporan" },
    { id: "spj-honor", label: "SPJ Honor" },
    { id: "surat-keputusan", label: "Surat Keputusan" },
    { id: "surat-pernyataan", label: "Surat Pernyataan" },
    { id: "tanda-terima", label: "Tanda Terima" },
    { id: "transport-lokal", label: "Transport Lokal" },
    { id: "uang-harian", label: "Uang Harian dan Transport Lokal" },
  ];

  // Sample data - replace with real data later
  const sampleData = [
    { id: "dh-2510003", jenis: "Briefing", namaKegiatan: "ASESMEN JABATAN FUNGSIONAL AHLI MUDA BPS KABUPATEN MAJALENGKA TAHUN 2025", pembuatDaftar: "Nia Kania, S.E." },
    { id: "dh-2510002", jenis: "Rapat Evaluasi", namaKegiatan: "Rapat Evaluasi Survei Harga Kemahaian Konstruksi Tahun 2025", pembuatDaftar: "Uta Sutara" },
    { id: "dh-2510001", jenis: "Rapat Evaluasi", namaKegiatan: "Rapat Evaluasi Kegiatan Survei Bahan Pokok Non Rumah Tangga (SBPNRT) 2025", pembuatDaftar: "Uta Sutara" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Download e-Dokumen</h1>
        <p className="text-muted-foreground mt-2">Lihat dan download dokumen yang tersedia dalam format tabel.</p>
        <p className="text-sm text-muted-foreground mt-1">Waktu server: Sabtu, 1 November 2025 pukul 08.31.01</p>
      </div>

      <Tabs defaultValue={tabs[0].id} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-muted p-2">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex-shrink-0 whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">10 baris</span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Nama Kegiatan</TableHead>
                        <TableHead>Pembuat Daftar</TableHead>
                        <TableHead className="text-center">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.jenis}</TableCell>
                          <TableCell>{item.namaKegiatan}</TableCell>
                          <TableCell>{item.pembuatDaftar}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
