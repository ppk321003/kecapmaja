import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Target, CheckSquare, DollarSign, UserCog, CheckCircle, Download, Database, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SPKBast() {
  const navigate = useNavigate();

  const spkBastMenuItems = [
    { 
      title: "Entri Petugas", 
      url: "/spk-bast/entri-petugas", 
      icon: Users,
      description: "Pendataan dan pengelolaan informasi petugas mitra statistik"
    },
    { 
      title: "Entri Kegiatan", 
      url: "/spk-bast/entri-target", 
      icon: Target,
      description: "Input target dan kegiatan yang akan dilaksanakan"
    },
    { 
      title: "Cek SBML", 
      url: "/spk-bast/cek-sbml", 
      icon: CheckSquare,
      description: "Verifikasi dan pengecekan Standar Biaya Masukan Lainnya"
    },
    { 
      title: "Entri SBML", 
      url: "/spk-bast/entri-sbml", 
      icon: DollarSign,
      description: "Input data Standar Biaya Masukan Lainnya"
    },
    { 
      title: "Entri Pengelola Anggaran", 
      url: "/spk-bast/entri-pengelola", 
      icon: UserCog,
      description: "Pendataan pengelola anggaran kegiatan"
    },
    { 
      title: "Approval PPK", 
      url: "/spk-bast/approval-ppk", 
      icon: CheckCircle,
      description: "Persetujuan dari Pejabat Pembuat Komitmen"
    },
    { 
      title: "Download SPK & BAST", 
      url: "/spk-bast/download-spk-bast", 
      icon: Download,
      description: "Unduh dokumen Surat Perjanjian Kerja dan BAST"
    },
    { 
      title: "Download SPJ", 
      url: "/spk-bast/download-spj", 
      icon: Download,
      description: "Unduh dokumen Surat Pertanggungjawaban"
    },
    { 
      title: "Download Raw Data", 
      url: "/spk-bast/download-raw-data", 
      icon: Database,
      description: "Unduh data mentah untuk keperluan analisis"
    },
    { 
      title: "Pedoman", 
      url: "/spk-bast/pedoman", 
      icon: BookOpen,
      description: "Panduan dan petunjuk penggunaan sistem"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">SPK dan BAST</h1>
        <p className="text-muted-foreground mt-2">Kelola Surat Perjanjian Kerja dan Berita Acara Serah Terima</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spkBastMenuItems.map((item) => (
          <Card key={item.title} className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader>
              <item.icon className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription className="flex-grow">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <Button 
                onClick={() => navigate(item.url)}
                className="w-full"
                variant="default"
              >
                Buka Menu
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
