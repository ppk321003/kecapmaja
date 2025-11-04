import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3, Users, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cake, Heart } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

interface Pegawai {
  nip: string;
  nama: string;
  tanggal_lahir: string;
  umur: number;
}

export default function Home() {
  const [ultahPegawai, setUltahPegawai] = useState<Pegawai | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Fungsi untuk mendapatkan data ulang tahun dari localStorage atau API
  const getPegawaiBerulangTahun = (): Pegawai | null => {
    try {
      // Contoh data - Anda bisa mengganti dengan data dari API atau localStorage
      const dataUltah = localStorage.getItem('ultah_pegawai');
      if (dataUltah) {
        return JSON.parse(dataUltah);
      }

      // Contoh data dummy untuk demonstrasi
      const today = new Date();
      const pegawaiContoh: Pegawai = {
        nip: "198304152006041002",
        nama: "Dr. Asep Saepudin, S.ST, M.Si",
        tanggal_lahir: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        umur: 41
      };

      // Simpan ke localStorage untuk contoh
      localStorage.setItem('ultah_pegawai', JSON.stringify(pegawaiContoh));
      return pegawaiContoh;
    } catch (error) {
      console.error('Error mendapatkan data ulang tahun:', error);
      return null;
    }
  };

  // Cek ulang tahun saat component mount
  useEffect(() => {
    const pegawaiUltah = getPegawaiBerulangTahun();
    if (pegawaiUltah) {
      setUltahPegawai(pegawaiUltah);
      setShowDialog(true);
    }
  }, []);

  // Fungsi untuk mendapatkan ucapan berdasarkan umur
  const getUcapanUltah = (umur: number, nama: string) => {
    const ucapanUmum = [
      `Selamat ulang tahun yang ke-${umur} tahun! Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan dalam menjalankan tugas.`,
      `Di usia yang ke-${umur} tahun ini, semoga semakin bijaksana dan inspiratif bagi rekan-rekan di BPS Majalengka.`,
      `Semoga di usia ${umur} tahun ini, menjadi pribadi yang lebih baik dan profesional dalam mengabdi untuk negara.`
    ];

    if (umur >= 50) {
      return [
        `Selamat ulang tahun ke-${umur} tahun! Semoga pengalaman dan kebijaksanaan yang dimiliki semakin membawa manfaat bagi BPS Majalengka.`,
        `Di usia emas ${umur} tahun, semoga senantiasa diberikan kesehatan dan semangat dalam mengabdi untuk statistik Indonesia.`,
        `Terima kasih atas dedikasi dan pengabdian selama ini. Selamat merayakan ${umur} tahun kehidupan yang penuh makna.`
      ];
    } else if (umur >= 40) {
      return [
        `Selamat ulang tahun ke-${umur} tahun! Semoga di usia yang penuh kematangan ini, semakin banyak kontribusi berharga untuk BPS.`,
        `Di usia ${umur} tahun, semoga semakin produktif dan inspiratif dalam memajukan statistik di Kabupaten Majalengka.`,
        `Semoga di usia yang semakin dewasa ini, senantiasa diberikan kemudahan dalam setiap tugas dan tanggung jawab.`
      ];
    } else {
      return ucapanUmum;
    }
  };

  const getRandomUcapan = (umur: number, nama: string) => {
    const ucapanList = getUcapanUltah(umur, nama);
    return ucapanList[Math.floor(Math.random() * ucapanList.length)];
  };

  return (
    <div className="space-y-8">
      {/* Dialog Ulang Tahun */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-gradient-to-br from-pink-50 to-red-50 border-pink-200">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Cake className="h-16 w-16 text-pink-500" />
                <Heart className="h-6 w-6 text-red-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl text-pink-700">
              🎉 Selamat Ulang Tahun! 🎉
            </DialogTitle>
            <DialogDescription className="text-center space-y-4">
              {ultahPegawai && (
                <>
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">
                      {ultahPegawai.nama}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      NIP: {ultahPegawai.nip}
                    </p>
                    <p className="text-sm text-gray-600">
                      Umur: <span className="font-semibold text-pink-600">{ultahPegawai.umur} tahun</span>
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-700 text-justify leading-relaxed italic">
                      "{getRandomUcapan(ultahPegawai.umur, ultahPegawai.nama)}"
                    </p>
                  </div>

                  <div className="flex flex-col space-y-2 text-xs text-gray-500">
                    <p>💝 Semoga hari ini penuh kebahagiaan dan keceriaan</p>
                    <p>🌟 Terus berkarya untuk BPS Majalengka</p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => setShowDialog(false)}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              Tutup & Lanjutkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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