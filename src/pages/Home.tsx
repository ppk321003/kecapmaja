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
              💡 KECAP MAJA adalah sistem administrasi digital terpadu yang dirancang untuk mentransformasi pengelolaan kegiatan menjadi lebih efisien, transparan, dan andal. Sistem ini menghadirkan beragam fitur canggih, seperti pembuatan dokumen otomatis, entri data mitra statistik, rekap honorarium yang terintegrasi, serta pemantauan batas SBML secara real-time. Dengan dukungan teknologi ini, proses administrasi tidak hanya menjadi lebih cepat dan terukur, tetapi juga meminimalisir kesalahan, sehingga menciptakan standar kerja yang lebih profesional.
            </p>
            <p className="text-justify leading-relaxed">
              Berdiri di atas semangat Maju Aman jeung Amanah, KECAP MAJA tidak sekadar menjadi alat bantu, melainkan juga pendorong terwujudnya budaya kerja yang unggul di lingkungan BPS Kabupaten Majalengka. Setiap aktivitas administrasi kini dapat dijalankan dengan prinsip efisiensi, ketepatan, kecepatan, dan profesionalisme, mendukung terciptanya tata kelola yang akuntabel dan berorientasi pada kualitas.
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
              <CardTitle>Block Tanggal</CardTitle>
              <CardDescription>
                Fitur tagging yang digunakan untuk mencatat, mengunci, dan memvalidasi tanggal perjalanan dinas bagi pegawai organik maupun mitra statistik
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Download className="h-10 w-10 text-primary mb-2" />
              <CardTitle>e-Dokumen</CardTitle>
              <CardDescription>
                Pengelolaan dan penyusunan dokumen administrasi secara otomatis dan terintegrasi
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
                <span><strong>Efisiensi Administrasi:</strong> Mengurangi pekerjaan manual melalui otomatisasi dalam pembuatan dan pengelolaan dokumen</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Transparansi Data:</strong> Menyajikan informasi target dan realisasi kegiatan secara terbuka dan mudah diakses</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Tata Kelola Terstruktur:</strong> Setiap proses administrasi tercatat rapi dengan alur kerja yang jelas dan terdokumentasi</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Kemudahan Monitoring:</strong> Menyediakan dashboard interaktif untuk memantau perkembangan kegiatan secara real-time</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span><strong>Otomasi Pelaporan:</strong> Menghasilkan laporan dan dokumen administrasi secara otomatis, cepat, dan akurat</span>
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
