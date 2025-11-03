import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3, Users, Download } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

export default function Home() {
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
            <h1 className="text-4xl font-bold mb-2">KECAP MAJA</h1>
            <p className="text-xl">Kerja Efisien, Cepat, Akurat, Profesional - Maju Aman Jeung Amanah</p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="prose max-w-none">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Tentang KECAP MAJA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-foreground">
            <p className="text-justify leading-relaxed">
              💡 KECAP MAJA merupakan sistem administrasi digital terpadu yang dikembangkan untuk meningkatkan efisiensi dan akurasi dalam pengelolaan kegiatan.
              Melalui fitur-fitur seperti pembuatan dokumen otomatis, entri pekerjaan mitra statistik, rekap honorarium, serta pengecekan batas SBML, seluruh proses administrasi dapat dilakukan dengan lebih cepat, terukur, dan profesional.
            </p>
            <p className="text-justify leading-relaxed">
              Dengan semangat Maju Aman Jeung Amanah, KECAP MAJA mendorong budaya kerja yang efisien, cepat, akurat, dan profesional di setiap aktivitas administrasi di lingkup BPS Kabupaten Majalengka.
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

      {/* Benefits Section */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Manfaat KECAP MAJA</CardTitle>
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
