import React from "react";
import { Link } from "react-router-dom";
import { FileText, Globe, Database, FileArchive, File, Book, Table } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  return <Layout>
      <div className="space-y-8">
        {/* Hero section with two columns */}
        <div className={`flex flex-col ${!isMobile ? 'md:flex-row' : ''} gap-8 items-center`}>
          {/* Left column - Description */}
          <div className="flex-1 text-left">
            <h1 className="mb-4 text-4xl font-bold text-center text-sky-900">Kecap Maja</h1>
            <p className="text-muted-foreground pl-6 text-justify my-0 mx-0 font-normal py-0 px-0">
              Merupakan aplikasi Pengelolaan Anggaran dan Pengadaan BPS Kabupaten Majalengka yang memiliki arti:
            </p>
            <div className="space-y-3">
              <p className="text-blue-900 text-base">
                <span className="font-bold">KECAP -</span> Keuangan Cekatan Anggaran Pengadaan
              </p>
              <p className="text-muted-foreground pl-6 px-0 text-justify">
                Menunjukkan pengelolaan keuangan yang cepat, efisien, dan tanggap, mengacu pada pengelolaan anggaran yang ditujukan untuk pengadaan barang dan jasa
              </p>
              <p className="text-blue-900">
                <span className="font-bold">MAJA -</span> Maju Aman Jeung Amanah
              </p>
              <p className="text-muted-foreground pl-6 px-0 text-justify">
                Bergerak maju dengan jaminan keamanan dan kehati-hatian, menunjukkan bahwa segala proses dilakukan dengan penuh tanggung jawab dan integritas
              </p>
            </div>
            
          </div>

          {/* Right column - Image */}
          <div className="flex-1 flex justify-center">
            <img alt="Kecap Maja Logo" className="max-w-full h-auto max-h-72" src="/lovable-uploads/459d5e42-9ffb-4efe-8bdc-3d5756ad7aed.png" />
          </div>
        </div>

        {/* Menu grid */}
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