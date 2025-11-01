import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Briefcase, Plane, Car, Clock, FileSpreadsheet, FileCheck, FileSignature, Receipt, Banknote, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BuatEDokumen() {
  const navigate = useNavigate();
  
  const eDokumenMenuItems = [
    {
      title: "Daftar Hadir (Tabel Rekap)",
      url: "/e-dokumen/daftar-hadir",
      icon: Users,
      iconColor: "text-blue-600",
      description: "Buat daftar hadir kegiatan dalam format tabel rekap",
      buttonGradient: "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
    },
    {
      title: "Dokumen Pengadaan",
      url: "/e-dokumen/dokumen-pengadaan",
      icon: Briefcase,
      iconColor: "text-purple-600",
      description: "Buat dokumen pengadaan barang dan jasa",
      buttonGradient: "from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
    },
    {
      title: "Kerangka Acuan Kerja (KAK)",
      url: "/e-dokumen/kak",
      icon: FileText,
      iconColor: "text-green-600",
      description: "Buat Kerangka Acuan Kerja kegiatan",
      buttonGradient: "from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
    },
    {
      title: "Kuitansi Perjalanan Dinas",
      url: "/e-dokumen/kuitansi-perjalanan",
      icon: Car,
      iconColor: "text-red-600",
      description: "Kuitansi Perjalanan Dinas Luar Kota / Dalam Kota > 8 Jam",
      buttonGradient: "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
    },
    {
      title: "Kuitansi Transport Lokal",
      url: "/e-dokumen/kuitansi-transport",
      icon: Bike,
      iconColor: "text-orange-600",
      description: "Buat kuitansi transport lokal",
      buttonGradient: "from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
    },
    {
      title: "Lembur & Laporan",
      url: "/e-dokumen/lembur-laporan",
      icon: Clock,
      iconColor: "text-yellow-600",
      description: "Buat dokumen lembur dan laporan",
      buttonGradient: "from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800"
    },
    {
      title: "SPJ Honor (Tabel Rekap)",
      url: "/e-dokumen/spj-honor",
      icon: FileSpreadsheet,
      iconColor: "text-teal-600",
      description: "Buat SPJ Honor dalam format tabel rekap",
      buttonGradient: "from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
    },
    {
      title: "Surat Keputusan",
      url: "/e-dokumen/surat-keputusan",
      icon: FileCheck,
      iconColor: "text-indigo-600",
      description: "Buat Surat Keputusan",
      buttonGradient: "from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
    },
    {
      title: "Surat Pernyataan",
      url: "/e-dokumen/surat-pernyataan",
      icon: FileSignature,
      iconColor: "text-pink-600",
      description: "Buat Surat Pernyataan",
      buttonGradient: "from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800"
    },
    {
      title: "Tanda Terima (Tabel Rekap)",
      url: "/e-dokumen/tanda-terima",
      icon: Receipt,
      iconColor: "text-cyan-600",
      description: "Buat tanda terima dalam format tabel rekap",
      buttonGradient: "from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800"
    },
    {
      title: "Transport Lokal (Tabel Rekap)",
      url: "/e-dokumen/transport-lokal",
      icon: Bike,
      iconColor: "text-amber-600",
      description: "Buat transport lokal dalam format tabel rekap",
      buttonGradient: "from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
    },
    {
      title: "Uang Harian dan Transport Lokal (Tabel Rekap)",
      url: "/e-dokumen/uang-harian-transport",
      icon: Banknote,
      iconColor: "text-emerald-600",
      description: "Buat uang harian dan transport lokal dalam format tabel rekap",
      buttonGradient: "from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
    }
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-red-600">Buat e-Dokumen</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Pilih jenis dokumen yang ingin dibuat. Semua dokumen tersedia dalam format yang profesional dan mudah digunakan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {eDokumenMenuItems.map((item, index) => (
          <Card 
            key={item.title} 
            className="hover:shadow-xl transition-all duration-300 flex flex-col border-2 hover:border-primary/20 hover:scale-105"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${item.iconColor.replace('text', 'from')} to-gray-100`}>
                  <item.icon className={`h-8 w-8 ${item.iconColor}`} />
                </div>
                <CardTitle className="text-lg font-semibold leading-tight">
                  {item.title}
                </CardTitle>
              </div>
              <CardDescription className="mt-3 text-sm leading-relaxed">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <Button 
                onClick={() => navigate(item.url)} 
                className={`w-full bg-gradient-to-r ${item.buttonGradient} text-white font-medium py-2.5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg`}
                size="lg"
              >
                Buat Dokumen
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}