import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Briefcase, Plane, Car, Clock, FileSpreadsheet, FileCheck, FileSignature, Receipt, Banknote, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BuatEDokumen() {
  const navigate = useNavigate();
  const eDokumenMenuItems = [{
    title: "Daftar Hadir (Tabel Rekap)",
    url: "/e-dokumen/daftar-hadir",
    icon: Users,
    description: "Buat daftar hadir kegiatan dalam format tabel rekap",
    rowColor: "blue"
  }, {
    title: "Dokumen Pengadaan",
    url: "/e-dokumen/dokumen-pengadaan",
    icon: Briefcase,
    description: "Buat dokumen pengadaan barang dan jasa",
    rowColor: "blue"
  }, {
    title: "Kerangka Acuan Kerja (KAK)",
    url: "/e-dokumen/kak",
    icon: FileText,
    description: "Buat Kerangka Acuan Kerja kegiatan",
    rowColor: "blue"
  }, {
    title: "Kuitansi Perjalanan Dinas",
    url: "/e-dokumen/kuitansi-perjalanan",
    icon: Car,
    description: "Kuitansi Perjalanan Dinas Luar Kota / Dalam Kota > 8 Jam",
    rowColor: "blue"
  }, {
    title: "Kuitansi Transport Lokal",
    url: "/e-dokumen/kuitansi-transport",
    icon: Bike,
    description: "Buat kuitansi transport lokal",
    rowColor: "green"
  }, {
    title: "Lembur & Laporan",
    url: "/e-dokumen/lembur-laporan",
    icon: Clock,
    description: "Buat dokumen lembur dan laporan",
    rowColor: "green"
  }, {
    title: "SPJ Honor (Tabel Rekap)",
    url: "/e-dokumen/spj-honor",
    icon: FileSpreadsheet,
    description: "Buat SPJ Honor dalam format tabel rekap",
    rowColor: "green"
  }, {
    title: "Surat Keputusan",
    url: "/e-dokumen/surat-keputusan",
    icon: FileCheck,
    description: "Buat Surat Keputusan",
    rowColor: "green"
  }, {
    title: "Surat Pernyataan",
    url: "/e-dokumen/surat-pernyataan",
    icon: FileSignature,
    description: "Buat Surat Pernyataan",
    rowColor: "orange"
  }, {
    title: "Tanda Terima (Tabel Rekap)",
    url: "/e-dokumen/tanda-terima",
    icon: Receipt,
    description: "Buat tanda terima dalam format tabel rekap",
    rowColor: "orange"
  }, {
    title: "Transport Lokal (Tabel Rekap)",
    url: "/e-dokumen/transport-lokal",
    icon: Bike,
    description: "Buat transport lokal dalam format tabel rekap",
    rowColor: "orange"
  }, {
    title: "Uang Harian dan Transport Lokal (Tabel Rekap)",
    url: "/e-dokumen/uang-harian-transport",
    icon: Banknote,
    description: "Buat uang harian dan transport lokal dalam format tabel rekap",
    rowColor: "orange"
  }];

  const getColorClasses = rowColor => {
    const colors = {
      blue: {
        icon: "text-blue-600",
        button: "bg-blue-100 hover:bg-blue-100",
        border: "border-blue-100"
      },
      green: {
        icon: "text-green-600",
        button: "bg-green-100 hover:bg-green-100",
        border: "border-green-100"
      },
      orange: {
        icon: "text-orange-600",
        button: "bg-orange-100 hover:bg-orange-100",
        border: "border-orange-100"
      }
    };
    return colors[rowColor] || colors.blue;
  };

  return (
    <div className="space-y-8 p-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-red-500">Buat e-Dokumen</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Pilih jenis dokumen yang ingin dibuat. Semua dokumen tersedia dalam format yang profesional dan mudah digunakan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {eDokumenMenuItems.map((item, index) => {
          const colorClasses = getColorClasses(item.rowColor);
          return (
            <Card 
              key={item.title} 
              className={`hover:shadow-lg transition-all duration-300 flex flex-col border-2 ${colorClasses.border} hover:scale-105 min-h-[280px] h-full`}
            >
              <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-2xl bg-gray-50 border`}>
                    <item.icon className={`h-8 w-8 ${colorClasses.icon}`} />
                  </div>
                  <CardTitle className="text-lg font-semibold leading-tight text-gray-800">
                    {item.title}
                  </CardTitle>
                </div>
                <CardDescription className="text-sm leading-relaxed text-gray-600 line-clamp-3">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto px-6 pb-6">
                <Button 
                  onClick={() => navigate(item.url)} 
                  className={`w-full ${colorClasses.button} text-white font-medium py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg`} 
                  size="lg"
                >
                  Buat Dokumen
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}