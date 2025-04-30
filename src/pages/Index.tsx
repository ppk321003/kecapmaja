import React from "react";
import { Link } from "react-router-dom";
import { FileText, Globe, Database, FileArchive, File, Book, Table } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const menuItems = [{
  title: "Buat Dokumen Administrasi",
  description: "Buat berbagai jenis dokumen administrasi",
  path: "/buat-dokumen",
  icon: <FileText className="h-10 w-10" />,
  color: "bg-blue-50 dark:bg-blue-900/20",
  iconColor: "text-bps-blue"
}, {
  title: "Data Google Spreadsheet",
  description: "Lihat data dari Google Spreadsheet",
  path: "/google-sheets",
  icon: <Table className="h-10 w-10" />,
  color: "bg-purple-50 dark:bg-purple-900/20",
  iconColor: "text-purple-500"
}, {
  title: "Bahan Revisi 3210 (Web)",
  description: "Akses bahan revisi via web",
  path: "/bahan-revisi-web",
  icon: <Globe className="h-10 w-10" />,
  color: "bg-green-50 dark:bg-green-900/20",
  iconColor: "text-bps-green"
}, {
  title: "Bahan Revisi 3210 (Spreadsheet)",
  description: "Akses bahan revisi via Google Spreadsheet",
  path: "/bahan-revisi-spreadsheet",
  icon: <Database className="h-10 w-10" />,
  color: "bg-yellow-50 dark:bg-yellow-900/20",
  iconColor: "text-bps-yellow"
}, {
  title: "Riwayat Kertas Kerja (PDF)",
  description: "Lihat riwayat kertas kerja dalam format PDF",
  path: "/riwayat-kertas-kerja",
  icon: <FileArchive className="h-10 w-10" />,
  color: "bg-orange-50 dark:bg-orange-900/20",
  iconColor: "text-bps-orange"
}, {
  title: "Rekap SPK dan BAST Mitra Statistik",
  description: "Lihat rekap SPK dan BAST mitra statistik",
  path: "/rekap-spk-bast",
  icon: <File className="h-10 w-10" />,
  color: "bg-blue-50 dark:bg-blue-900/20",
  iconColor: "text-bps-blue"
}, {
  title: "Surat Pernyataan (SUPER)",
  description: "Akses surat pernyataan",
  path: "/surat-pernyataan",
  icon: <File className="h-10 w-10" />,
  color: "bg-green-50 dark:bg-green-900/20",
  iconColor: "text-bps-green"
}, {
  title: "Blanko Visum",
  description: "Akses blanko visum",
  path: "/blanko-visum",
  icon: <File className="h-10 w-10" />,
  color: "bg-yellow-50 dark:bg-yellow-900/20",
  iconColor: "text-bps-yellow"
}, {
  title: "Perka BPS Standar Biaya",
  description: "Lihat peraturan tentang standar biaya kegiatan statistik",
  path: "/perka-bps",
  icon: <Book className="h-10 w-10" />,
  color: "bg-orange-50 dark:bg-orange-900/20",
  iconColor: "text-bps-orange"
}, {
  title: "SBM Tahun Anggaran 2025",
  description: "Standar Biaya Masukan Tahun 2025",
  path: "/sbm-2025",
  icon: <Book className="h-10 w-10" />,
  color: "bg-blue-50 dark:bg-blue-900/20",
  iconColor: "text-bps-blue"
}];
const Index = () => {
  return <Layout>
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center pb-6 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <img src="/lovable-uploads/1ef78670-6d2c-4f64-8c6e-149d6b9d2d19.png" alt="Kecap Maja Logo" className="h-40 w-auto" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Kecap Maja</h1>
          <p className="mt-2 text-muted-foreground text-left">
            <span className="font-bold">KECAP:</span> Keuangan Cekatan Anggaran Pengadaan<br />
            <span className="font-bold">MAJA:</span> Maju Aman Jeung Amanah
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Aplikasi Pengelolaan Anggaran dan Pengadaan BPS Kabupaten Majalengka
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map(item => <Link key={item.path} to={item.path} className="block">
              <Card className="h-full transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-lg ${item.color}`}>
                    <div className={item.iconColor}>{item.icon}</div>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                  <div className="mt-4">
                    <Button variant="outline">Buka</Button>
                  </div>
                </CardContent>
              </Card>
            </Link>)}
        </div>
      </div>
    </Layout>;
};
export default Index;