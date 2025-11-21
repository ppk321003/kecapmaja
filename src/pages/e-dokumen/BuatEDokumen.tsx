import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Briefcase, Car, Clock, FileSpreadsheet, FileCheck, FileSignature, Receipt, Banknote, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BuatEDokumen() {
  const navigate = useNavigate();

  const eDokumenMenuItems = [
    { title: "Daftar Hadir (Tabel Rekap)", url: "/e-dokumen/daftar-hadir", icon: Users, description: "Buat daftar hadir kegiatan dalam format tabel rekap" },
    { title: "Dokumen Pengadaan", url: "/e-dokumen/dokumen-pengadaan", icon: Briefcase, description: "Buat dokumen pengadaan barang dan jasa" },
    { title: "Kerangka Acuan Kerja (KAK)", url: "/e-dokumen/kak", icon: FileText, description: "Buat Kerangka Acuan Kerja kegiatan" },
    { title: "Kuitansi Perjalanan Dinas", url: "/e-dokumen/kuitansi-perjalanan", icon: Car, description: "Kuitansi Perjalanan Dinas Luar Kota / Dalam Kota > 8 Jam" },
    { title: "Kuitansi Transport Lokal", url: "/e-dokumen/kuitansi-transport", icon: Bike, description: "Buat kuitansi transport lokal" },
    { title: "Lembur & Laporan", url: "/e-dokumen/lembur-laporan", icon: Clock, description: "Buat dokumen lembur dan laporan" },
    { title: "SPJ Honor (Tabel Rekap)", url: "/e-dokumen/spj-honor", icon: FileSpreadsheet, description: "Buat SPJ Honor dalam format tabel rekap" },
    { title: "Surat Keputusan", url: "/e-dokumen/surat-keputusan", icon: FileCheck, description: "Buat Surat Keputusan" },
    { title: "Surat Pernyataan", url: "/e-dokumen/surat-pernyataan", icon: FileSignature, description: "Buat Surat Pernyataan" },
    { title: "Tanda Terima (Tabel Rekap)", url: "/e-dokumen/tanda-terima", icon: Receipt, description: "Buat tanda terima dalam format tabel rekap" },
    { title: "Transport Lokal (Tabel Rekap)", url: "/e-dokumen/transport-lokal", icon: Bike, description: "Buat transport lokal dalam format tabel rekap" },
    { title: "Uang Harian dan Transport Lokal (Tabel Rekap)", url: "/e-dokumen/uang-harian-transport", icon: Banknote, description: "Buat uang harian dan transport lokal dalam format tabel rekap" },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
          Buat e-Dokumen
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Pilih jenis dokumen yang ingin Anda buat. Semua template telah disesuaikan dengan standar formal pemerintahan.
        </p>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7 max-w-7xl mx-auto">
        {eDokumenMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              className="group relative overflow-hidden bg-card/95 backdrop-blur-sm border border-border/60 
                         hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 
                         transition-all duration-500 hover:-translate-y-3 rounded-2xl h-full flex flex-col"
            >
              {/* Gradient Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 
                                   border border-primary/20 group-hover:border-primary/40 
                                   transition-all duration-300">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-foreground leading-tight pt-1">
                    {item.title}
                  </CardTitle>
                </div>
                <CardDescription className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </CardDescription>
              </CardHeader>

              {/* Button selalu di posisi bawah sama */}
              <CardContent className="mt-auto pt-6 pb-1">
                <Button
                  onClick={() => navigate(item.url)}
                  className="w-full h-12 text-base font-semibold
                             bg-gradient-to-r from-primary to-primary/90 
                             hover:from-primary hover:to-primary/80
                             text-primary-foreground
                             shadow-lg hover:shadow-xl hover:shadow-primary/25
                             relative overflow-hidden
                             transition-all duration-300
                             group-hover:scale-105"
                  size="lg"
                >
                  <span className="relative z-10">Buat Dokumen</span>
                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full 
                                   bg-white/20 transition-transform duration-700" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}