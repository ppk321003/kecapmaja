import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Briefcase, Plane, Car, Clock, FileSpreadsheet, FileCheck, FileSignature, Receipt, Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function BuatEDokumen() {
  const navigate = useNavigate();
  const eDokumenMenuItems = [{
    title: "Daftar Hadir (Tabel Rekap)",
    url: "/e-dokumen/daftar-hadir",
    icon: Users,
    description: "Buat daftar hadir kegiatan dalam format tabel rekap"
  }, {
    title: "Dokumen Pengadaan",
    url: "/e-dokumen/dokumen-pengadaan",
    icon: Briefcase,
    description: "Buat dokumen pengadaan barang dan jasa"
  }, {
    title: "Kerangka Acuan Kerja (KAK)",
    url: "/e-dokumen/kak",
    icon: FileText,
    description: "Buat Kerangka Acuan Kerja kegiatan"
  }, {
    title: "Kuitansi Perjalanan Dinas",
    url: "/e-dokumen/kuitansi-perjalanan",
    icon: Plane,
    description: "Kuitansi Perjalanan Dinas Luar Kota / Dalam Kota > 8 Jam"
  }, {
    title: "Kuitansi Transport Lokal",
    url: "/e-dokumen/kuitansi-transport",
    icon: Car,
    description: "Buat kuitansi transport lokal"
  }, {
    title: "Lembur & Laporan",
    url: "/e-dokumen/lembur-laporan",
    icon: Clock,
    description: "Buat dokumen lembur dan laporan"
  }, {
    title: "SPJ Honor (Tabel Rekap)",
    url: "/e-dokumen/spj-honor",
    icon: FileSpreadsheet,
    description: "Buat SPJ Honor dalam format tabel rekap"
  }, {
    title: "Surat Keputusan",
    url: "/e-dokumen/surat-keputusan",
    icon: FileCheck,
    description: "Buat Surat Keputusan"
  }, {
    title: "Surat Pernyataan",
    url: "/e-dokumen/surat-pernyataan",
    icon: FileSignature,
    description: "Buat Surat Pernyataan"
  }, {
    title: "Tanda Terima (Tabel Rekap)",
    url: "/e-dokumen/tanda-terima",
    icon: Receipt,
    description: "Buat tanda terima dalam format tabel rekap"
  }, {
    title: "Transport Lokal (Tabel Rekap)",
    url: "/e-dokumen/transport-lokal",
    icon: Car,
    description: "Buat transport lokal dalam format tabel rekap"
  }, {
    title: "Uang Harian dan Transport Lokal (Tabel Rekap)",
    url: "/e-dokumen/uang-harian-transport",
    icon: Banknote,
    description: "Buat uang harian dan transport lokal dalam format tabel rekap"
  }];
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Buat e-Dokumen</h1>
        <p className="text-muted-foreground mt-2">Pilih jenis dokumen yang ingin dibuat</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eDokumenMenuItems.map(item => <Card key={item.title} className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader>
              <item.icon className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription className="flex-grow">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <Button onClick={() => navigate(item.url)} className="w-full" variant="default">
                Buat Dokumen
              </Button>
            </CardContent>
          </Card>)}
      </div>
    </div>;
}