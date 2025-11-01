import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Users, Download, Target, CheckSquare, DollarSign, UserCog, CheckCircle, Database, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";

export default function Home() {
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
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative rounded-lg overflow-hidden">
        <img 
          src={heroBanner} 
          alt="SIMAJA Hero Banner" 
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/80 flex items-center">
          <div className="px-8 text-primary-foreground">
            <h1 className="text-4xl font-bold mb-2">AKI MAJA</h1>
            <p className="text-xl">Aplikasi Kinerja, Monitoring dan Administrasi BPS Kabupaten Majalengka</p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="prose max-w-none">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tentang AKI MAJA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-foreground">
            <p className="text-justify leading-relaxed">
              Aplikasi Kinerja, Monitoring dan Administrasi BPS Kabupaten Majalengka (AKI MAJA) adalah aplikasi berbasis web 
              yang dirancang untuk mengelola dan memantau kinerja Organik dan Mitra Statistik di wilayah Kabupaten Majalengka. 
              Aplikasi ini merupakan solusi digital yang mengintegrasikan berbagai proses administrasi dan monitoring 
              dalam satu platform yang efisien dan terstruktur.
            </p>
            <p className="text-justify leading-relaxed">
              AKI MAJA dikembangkan untuk mendukung transparansi, akuntabilitas, dan efektivitas dalam pengelolaan 
              kegiatan statistik. Dengan fitur-fitur yang komprehensif, aplikasi ini memfasilitasi proses entri data, 
              monitoring target dan realisasi kegiatan, hingga penerbitan dokumen-dokumen resmi seperti Surat Perjanjian 
              Kerja (SPK) dan Berita Acara Serah Terima (BAST).
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Fitur Utama</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Administrasi SPK & BAST</CardTitle>
              <CardDescription>
                Pembuatan dan pengelolaan Surat Perjanjian Kerja serta Berita Acara Serah Terima secara digital
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Dashboard Monitoring</CardTitle>
              <CardDescription>
                Visualisasi data target dan realisasi kegiatan mitra statistik secara real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Manajemen Mitra</CardTitle>
              <CardDescription>
                Pendataan dan pengelolaan informasi petugas mitra statistik
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Download className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Laporan & Dokumen</CardTitle>
              <CardDescription>
                Download SPJ, raw data, dan berbagai dokumen laporan kegiatan
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* SPK & BAST Menu Cards */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Buat Dokumen Administrasi</h2>
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
      </section>

      {/* Benefits Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Manfaat AKI MAJA</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Efisiensi Administrasi:</strong> Mengurangi beban kerja manual dalam pengelolaan dokumen administrasi</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Transparansi Data:</strong> Memudahkan akses informasi target dan realisasi kegiatan</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Akuntabilitas:</strong> Sistem approval dan dokumentasi yang terstruktur</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Kemudahan Monitoring:</strong> Dashboard interaktif untuk memantau progress kegiatan</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Otomasi Pelaporan:</strong> Pembuatan laporan dan dokumen secara otomatis</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Footer Info */}
      <section className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          © 2025 Badan Pusat Statistik Kabupaten Majalengka. All rights reserved.
        </p>
      </section>
    </div>
  );
}
