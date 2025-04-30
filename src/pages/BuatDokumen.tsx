
import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SeedDataButton from "@/components/SeedDataButton";

const documentTypes = [
  {
    title: "Kerangka Acuan Kerja",
    description: "Buat dokumen kerangka acuan kerja",
    path: "/dokumen/kerangka-acuan-kerja",
    color: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-bps-blue"
  },
  {
    title: "Daftar Hadir",
    description: "Buat dokumen daftar hadir",
    path: "/dokumen/daftar-hadir",
    color: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-bps-green"
  },
  {
    title: "SPJ Honor",
    description: "SPJ Honor Pendataan / Pengawasan / Instruktur",
    path: "/dokumen/spj-honor",
    color: "bg-yellow-50 dark:bg-yellow-900/20",
    iconColor: "text-bps-yellow"
  },
  {
    title: "Transport Lokal",
    description: "Transport Lokal (Pendataan, Pemeriksaan, Supervisi)",
    path: "/dokumen/transport-lokal",
    color: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-bps-blue",
    disabled: true
  },
  {
    title: "Uang Harian dan Transport Lokal",
    description: "Buat dokumen uang harian dan transport lokal",
    path: "/dokumen/uang-harian-transport",
    color: "bg-green-50 dark:bg-green-900/20",
    iconColor: "text-bps-green"
  },
  {
    title: "Tanda Terima",
    description: "Buat dokumen tanda terima",
    path: "/dokumen/tanda-terima",
    color: "bg-yellow-50 dark:bg-yellow-900/20",
    iconColor: "text-bps-yellow",
    disabled: true
  }
];

const BuatDokumen = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Buat Dokumen Administrasi</h1>
            <p className="text-muted-foreground">
              Silakan pilih jenis dokumen administrasi yang akan dibuat
            </p>
          </div>
        </div>

        <SeedDataButton />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documentTypes.map((item) => (
            <Card
              key={item.path}
              className={`h-full transition-all duration-200 hover:shadow-md ${
                item.disabled ? "opacity-60" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${item.color}`}>
                  <div className={item.iconColor}>
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">{item.description}</p>
                {item.disabled ? (
                  <Button disabled variant="outline">
                    Coming Soon
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link to={item.path}>Buat Dokumen</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default BuatDokumen;
