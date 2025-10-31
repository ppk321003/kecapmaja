import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const documentTypes = [
  {
    title: "Daftar Hadir (Tabel Rekap)",
    description: "Buat dokumen daftar hadir",
    path: "/spk-bast/entri-petugas",
    color: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-bps-blue"
  },
  {
    title: "Dokumen Pengadaan",
    description: "Buat dokumen pengadaan barang dan jasa",
    path: "/spk-bast/entri-target",
    color: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-bps-blue"
  },
  {
    title: "Kerangka Acuan Kerja",
    description: "Buat dokumen kerangka acuan kerja",
    path: "/spk-bast/cek-sbml",
    color: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-bps-green"
  },
  {
    title: "Kuitansi Perjalanan Dinas Luar Kota / Dalam Kota 8 Jam",
    description: "Buat kuitansi perjalanan dinas luar atau dalam kota 8 Jam",
    path: "/spk-bast/entri-sbml",
    color: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-bps-green"
  },
  {
    title: "Kuitansi Transport Lokal",
    description: "Buat kuitansi transport lokal",
    path: "spk-bast/entri-pengelola",
    color: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-bps-green"
  },
  {
    title: "Lembur & Laporan",
    description: "Buat dokumen lembur dan laporan",
    path: "/spk-bast/approval-ppk",
    color: "bg-indigo-50 dark:bg-indigo-900/20",
    iconColor: "text-indigo-600"
  },
  {
    title: "SPJ Honor (Tabel Rekap)",
    description: "Buat daftar SPJ Honor Pendataan / Pengawasan / Instruktur / Pengolahan",
    path: "/spk-bast/download-spk-bast",
    color: "bg-orange-50 dark:bg-orange-900/20",
    iconColor: "text-bps-orange"
  },
  {
    title: "Surat Keputusan",
    description: "Buat surat keputusan Kepala BPS Kabupaten Majalengka",
    path: "/spk-bast/download-spj",
    color: "bg-purple-50 dark:bg-purple-900/20",
    iconColor: "text-purple-600"
  },
  {
    title: "Surat Pernyataan",
    description: "Buat surat pernyataan Tidak Menggunakan Kendaraan Dinas & surat pernyataan Fasilitas Kantor Tidak Memenuhi",
    path: "/spk-bast/download-raw-data",
    color: "bg-red-50 dark:bg-red-900/20",
    iconColor: "text-red-600"
  },
  {
    title: "Tanda Terima (Tabel Rekap)",
    description: "Buat dokumen daftar tanda terima kegiatan",
    path: "/spk-bast/pedoman",
    color: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-bps-blue"
  },
  {
    title: "Transport Lokal (Tabel Rekap)",
    description: "Buat daftar Transport Lokal (Pendataan, Pemeriksaan, Supervisi)",
    path: "/spk-bast/pedoman",
    color: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-bps-green"
  },
  {
    title: "Uang Harian dan Transport Lokal (Tabel Rekap)",
    description: "Buat dokumen uang harian dan transport lokal",
    path: "/spk-bast/pedoman",
    color: "bg-orange-50 dark:bg-orange-900/20",
    iconColor: "text-bps-orange"
  }
].sort((a, b) => a.title.localeCompare(b.title));

const BuatDokumen = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-600 tracking-tight">Buat Dokumen Administrasi</h1>
            <p className="text-muted-foreground">
              Silakan pilih jenis dokumen administrasi yang akan dibuat
            </p>
          </div>
          <div className="hidden md:block">
            <img 
              src="/lovable-uploads/1ef78670-6d2c-4f64-8c6e-149d6b9d2d19.png" 
              alt="Kecap Maja Logo" 
              className="h-20 w-auto" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {documentTypes.map((item) => (
            <Card 
              key={item.path} 
              className="flex flex-col h-full transition-all duration-200 hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${item.color}`}>
                  <div className={item.iconColor}>
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="mb-4 text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
              <div className="p-4 pt-0">
                <Button asChild variant="outline" className="w-full">
                  <Link to={item.path}>Buat Dokumen</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default BuatDokumen;