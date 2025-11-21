import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Briefcase, Plane, Car, Clock, FileSpreadsheet, FileCheck, FileSignature, Receipt, Banknote, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BuatEDokumen() {
  const navigate = useNavigate();

  const eDokumenMenuItems = [
    { title: "Daftar Hadir (Tabel Rekap)", url: "/e-dokumen/daftar-hadir", icon: Users, description: "Buat daftar hadir kegiatan dalam format tabel rekap", group: "blue" },
    { title: "Dokumen Pengadaan", url: "/e-dokumen/dokumen-pengadaan", icon: Briefcase, description: "Buat dokumen pengadaan barang dan jasa", group: "blue" },
    { title: "Kerangka Acuan Kerja (KAK)", url: "/e-dokumen/kak", icon: FileText, description: "Buat Kerangka Acuan Kerja kegiatan", group: "blue" },
    { title: "Kuitansi Perjalanan Dinas", url: "/e-dokumen/kuitansi-perjalanan", icon: Car, description: "Kuitansi Perjalanan Dinas Luar Kota / Dalam Kota > 8 Jam", group: "blue" },

    { title: "Kuitansi Transport Lokal", url: "/e-dokumen/kuitansi-transport", icon: Bike, description: "Buat kuitansi transport lokal", group: "green" },
    { title: "Lembur & Laporan", url: "/e-dokumen/lembur-laporan", icon: Clock, description: "Buat dokumen lembur dan laporan", group: "green" },
    { title: "SPJ Honor (Tabel Rekap)", url: "/e-dokumen/spj-honor", icon: FileSpreadsheet, description: "Buat SPJ Honor dalam format tabel rekap", group: "green" },
    { title: "Surat Keputusan", url: "/e-dokumen/surat-keputusan", icon: FileCheck, description: "Buat Surat Keputusan", group: "green" },

    { title: "Surat Pernyataan", url: "/e-dokumen/surat-pernyataan", icon: FileSignature, description: "Buat Surat Pernyataan", group: "orange" },
    { title: "Tanda Terima (Tabel Rekap)", url: "/e-dokumen/tanda-terima", icon: Receipt, description: "Buat tanda terima dalam format tabel rekap", group: "orange" },
    { title: "Transport Lokal (Tabel Rekap)", url: "/e-dokumen/transport-lokal", icon: Bike, description: "Buat transport lokal dalam format tabel rekap", group: "orange" },
    { title: "Uang Harian dan Transport Lokal (Tabel Rekap)", url: "/e-dokumen/uang-harian-transport", icon: Banknote, description: "Buat uang harian dan transport lokal dalam format tabel rekap", group: "orange" },
  ];

  const groups = {
    blue: { label: "Dokumen Perencanaan & Pengadaan", gradient: "from-blue-500 to-cyan-500" },
    green: { label: "Keuangan & Honorarium", gradient: "from-emerald-500 to-teal-500" },
    orange: { label: "Perjalanan Dinas & Transport", gradient: "from-orange-500 to-amber-500" },
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Buat e-Dokumen
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
          Pilih jenis dokumen yang ingin Anda buat. Semua template telah disesuaikan dengan standar formal pemerintahan.
        </p>
      </div>

      {/* Grouped Cards */}
      <div className="space-y-16 max-w-7xl mx-auto">
        {Object.entries(groups).map(([key, { label, gradient }]) => {
          const items = eDokumenMenuItems.filter(i => i.group === key);
          if (items.length === 0) return null;

          return (
            <section key={key}>
              {/* Section Title */}
              <div className="mb-8 flex items-center gap-4">
                <div className={`h-1 w-16 bg-gradient-to-r ${gradient} rounded-full`} />
                <h2 className="text-2xl font-bold text-foreground">{label}</h2>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.title}
                      className="group relative overflow-hidden border bg-card/80 backdrop-blur-sm 
                                 hover:shadow-2xl hover:shadow-primary/10 
                                 transition-all duration-500 hover:-translate-y-2 
                                 hover:border-primary/30 cursor-pointer"
                    >
                      {/* Gradient Border Top */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                      <CardHeader className="pb-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 
                                         border border-primary/20 transition-all duration-300">
                            <Icon className="h-7 w-7 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-foreground leading-tight">
                              {item.title}
                            </CardTitle>
                          </div>
                        </div>
                        <CardDescription className="mt-3 text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-4">
                        <Button
                          onClick={() => navigate(item.url)}
                          className="w-full bg-gradient-to-r from-primary to-primary/90 
                                   hover:from-primary hover:to-primary/80 
                                   text-primary-foreground font-medium
                                   shadow-lg hover:shadow-xl hover:shadow-primary/30
                                   transition-all duration-300"
                          size="lg"
                        >
                          Buat Dokumen
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}