import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Briefcase, Car, Clock, FileSpreadsheet, FileCheck, FileSignature, Receipt, Banknote, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";

const accentColors = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-violet-500 to-violet-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
  "from-teal-500 to-teal-600",
  "from-purple-500 to-purple-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-lime-500 to-lime-600",
];

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
    <div className="min-h-screen bg-background pt-4 pb-16 px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-red-500 tracking-tight">
          Buat e-Dokumen
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Pilih jenis dokumen yang ingin Anda buat. Semua template telah disesuaikan dengan standar formal pemerintahan.
        </p>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7 max-w-7xl mx-auto">
        {eDokumenMenuItems.map((item, index) => {
          const Icon = item.icon;
          const accent = accentColors[index % accentColors.length];
          const lighterBg = accent.replace("500", "100").replace("600", "200");
          const iconColor = accent.split(" ")[0].replace("from-", "text-").replace("-500", "-600");

          return (
            <Card
              key={item.title}
              className="group relative overflow-hidden bg-card/95 backdrop-blur-sm border border-border/60 
                         hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 
                         transition-all duration-500 hover:-translate-y-3 rounded-2xl h-full flex flex-col cursor-pointer"
            >
              {/* Top bar warna-warni */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  {/* Icon background warna-warni */}
                  <div className={`p-3.5 rounded-xl bg-gradient-to-br ${lighterBg} border transition-all duration-300 group-hover:scale-110`}>
                    <Icon className={`h-8 w-8 ${iconColor}`} />
                  </div>
                  <CardTitle className="text-lg font-semibold text-foreground leading-tight pt-1">
                    {item.title}
                  </CardTitle>
                </div>
                <CardDescription className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </CardDescription>
              </CardHeader>

              {/* Tombol: 100% SAMA PERSIS dengan di Linkers */}
              <CardContent className="mt-auto pt-6 pb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(item.url);
                  }}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 
                             hover:from-primary hover:to-primary/70 hover:brightness-110
                             text-primary-foreground font-medium text-sm shadow-lg hover:shadow-xl
                             relative overflow-hidden transition-all duration-300
                             flex items-center justify-center gap-2 group/btn"
                >
                  <span className="relative z-10">Buat Dokumen</span>
                  <ExternalLink className="h-4 w-4 relative z-10" />
                  <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full 
                                   bg-white/20 transition-transform duration-700" />
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}