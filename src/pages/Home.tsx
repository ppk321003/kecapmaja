import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3, Users, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cake, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heroBanner from "@/assets/hero-banner.jpg";

interface Pegawai {
  nip: string;
  nama: string;
  tanggal_lahir: string;
  umur: number;
  jabatan: string;
  pangkat: string;
}

export default function Home() {
  const [ultahPegawai, setUltahPegawai] = useState<Pegawai[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fungsi untuk extract tanggal lahir dari NIP
  const extractTanggalLahirFromNIP = (nip: string): string | null => {
    try {
      // Format NIP: 19781017 199803 1 002
      // Bagian tanggal lahir: 19781017 (tahun-bulan-tanggal)
      const nipParts = nip.toString().split(' ');
      if (nipParts.length >= 1) {
        const tanggalLahirStr = nipParts[0];
        if (tanggalLahirStr.length === 8) {
          const tahun = tanggalLahirStr.substring(0, 4);
          const bulan = tanggalLahirStr.substring(4, 6);
          const tanggal = tanggalLahirStr.substring(6, 8);
          return `${tahun}-${bulan}-${tanggal}`;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extract tanggal lahir dari NIP:', error);
      return null;
    }
  };

  // Fungsi untuk menghitung umur
  const hitungUmur = (tanggalLahir: string): number => {
    const today = new Date();
    const birthDate = new Date(tanggalLahir);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Fungsi untuk cek apakah hari ini ulang tahun
  const isHariIniUlangTahun = (tanggalLahir: string): boolean => {
    const today = new Date();
    const birthDate = new Date(tanggalLahir);
    
    return today.getMonth() === birthDate.getMonth() && 
           today.getDate() === birthDate.getDate();
  };

  // Fetch data pegawai dari Google Sheets
  const fetchPegawaiBerulangTahun = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM",
          operation: "read",
          range: "MASTER.ORGANIK"
        }
      });

      if (error) throw error;

      const rows = data.values || [];
      if (rows.length <= 1) {
        console.log('Tidak ada data pegawai');
        return [];
      }

      // Skip header row
      const pegawaiData = rows.slice(1);
      const pegawaiUltah: Pegawai[] = [];
      
      // Cari semua pegawai yang berulang tahun hari ini
      for (const row of pegawaiData) {
        const nip = row[2] || row[1]; // Kolom NIP (index 2) atau NIP BPS (index 1)
        const nama = row[3] || "";
        const jabatan = row[4] || "";
        const pangkat = row[7] || "";

        if (nip && nama) {
          const tanggalLahir = extractTanggalLahirFromNIP(nip.toString());
          
          if (tanggalLahir && isHariIniUlangTahun(tanggalLahir)) {
            const umur = hitungUmur(tanggalLahir);
            
            const pegawai: Pegawai = {
              nip: nip.toString(),
              nama: nama.toString(),
              tanggal_lahir: tanggalLahir,
              umur: umur,
              jabatan: jabatan.toString(),
              pangkat: pangkat.toString()
            };
            
            pegawaiUltah.push(pegawai);
          }
        }
      }
      
      return pegawaiUltah;
    } catch (error: any) {
      console.error('Error fetch data pegawai:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data ulang tahun pegawai",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Cek ulang tahun saat component mount
  useEffect(() => {
    const checkUltahPegawai = async () => {
      const pegawaiUltah = await fetchPegawaiBerulangTahun();
      if (pegawaiUltah.length > 0) {
        setUltahPegawai(pegawaiUltah);
        setShowDialog(true);
        
        if (pegawaiUltah.length === 1) {
          toast({
            title: "Selamat Ulang Tahun! 🎉",
            description: `Semoga ${pegawaiUltah[0].nama} senantiasa diberikan kesehatan dan kebahagiaan`,
          });
        } else {
          toast({
            title: "Selamat Ulang Tahun! 🎉",
            description: `Ada ${pegawaiUltah.length} pegawai yang berulang tahun hari ini`,
          });
        }
      }
    };

    checkUltahPegawai();
  }, []);

  // Fungsi untuk navigasi
  const nextPegawai = () => {
    setCurrentIndex((prev) => (prev + 1) % ultahPegawai.length);
  };

  const prevPegawai = () => {
    setCurrentIndex((prev) => (prev - 1 + ultahPegawai.length) % ultahPegawai.length);
  };

  // Fungsi untuk mendapatkan ucapan berdasarkan umur
  const getUcapanUltah = (umur: number, nama: string, jabatan: string) => {
    const ucapanUmum = [
      `Selamat ulang tahun yang ke-${umur} tahun, ${nama}! Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan dalam menjalankan tugas sebagai ${jabatan}.`,
      `Di usia yang ke-${umur} tahun ini, semoga ${nama} semakin bijaksana dan inspiratif bagi rekan-rekan di BPS Majalengka.`,
      `Semoga di usia ${umur} tahun ini, ${nama} menjadi pribadi yang lebih baik dan profesional dalam mengabdi untuk negara.`
    ];

    if (umur >= 50) {
      return [
        `Selamat ulang tahun ke-${umur} tahun! Semoga pengalaman dan kebijaksanaan yang dimiliki ${nama} semakin membawa manfaat bagi BPS Majalengka.`,
        `Di usia emas ${umur} tahun, semoga ${nama} senantiasa diberikan kesehatan dan semangat dalam mengabdi untuk statistik Indonesia.`,
        `Terima kasih atas dedikasi dan pengabdian selama ini. Selamat merayakan ${umur} tahun kehidupan yang penuh makna, ${nama}.`
      ];
    } else if (umur >= 40) {
      return [
        `Selamat ulang tahun ke-${umur} tahun! Semoga di usia yang penuh kematangan ini, ${nama} semakin banyak kontribusi berharga untuk BPS.`,
        `Di usia ${umur} tahun, semoga ${nama} semakin produktif dan inspiratif dalam memajukan statistik di Kabupaten Majalengka.`,
        `Semoga di usia yang semakin dewasa ini, ${nama} senantiasa diberikan kemudahan dalam setiap tugas dan tanggung jawab.`
      ];
    } else {
      return ucapanUmum;
    }
  };

  const getRandomUcapan = (umur: number, nama: string, jabatan: string) => {
    const ucapanList = getUcapanUltah(umur, nama, jabatan);
    return ucapanList[Math.floor(Math.random() * ucapanList.length)];
  };

  // Format NIP untuk display
  const formatNIP = (nip: string) => {
    return nip.toString().replace(/(\d{8}) (\d{6}) (\d) (\d{3})/, '$1 $2 $3 $4');
  };

  const currentPegawai = ultahPegawai[currentIndex];

  return (
    <div className="space-y-8">
      {/* Dialog Ulang Tahun */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-gradient-to-br from-pink-50 to-red-50 border-pink-200">
          <DialogHeader>
            <div className="flex justify-between items-center mb-4">
              {ultahPegawai.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPegawai}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              
              <div className="relative">
                <Cake className="h-16 w-16 text-pink-500" />
                <Heart className="h-6 w-6 text-red-500 absolute -top-1 -right-1 animate-pulse" />
              </div>

              {ultahPegawai.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextPegawai}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            <DialogTitle className="text-center text-2xl text-pink-700">
              🎉 Selamat Ulang Tahun! 🎉
            </DialogTitle>
            
            {ultahPegawai.length > 1 && (
              <div className="text-center text-sm text-pink-600">
                {currentIndex + 1} dari {ultahPegawai.length} pegawai
              </div>
            )}
          </DialogHeader>
          
          <DialogDescription className="text-center space-y-4">
            {currentPegawai && (
              <>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {currentPegawai.nama}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    NIP: {formatNIP(currentPegawai.nip)}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Jabatan: {currentPegawai.jabatan}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Pangkat: {currentPegawai.pangkat}
                  </p>
                  <p className="text-sm text-gray-600">
                    Umur: <span className="font-semibold text-pink-600">{currentPegawai.umur} tahun</span>
                  </p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-gray-700 text-justify leading-relaxed italic">
                    "{getRandomUcapan(currentPegawai.umur, currentPegawai.nama, currentPegawai.jabatan)}"
                  </p>
                </div>

                <div className="flex flex-col space-y-2 text-xs text-gray-500">
                  <p>💝 Semoga hari ini penuh kebahagiaan dan keceriaan</p>
                  <p>🌟 Terus berkarya untuk BPS Majalengka</p>
                  <p>🎂 Panjang umur dan sehat selalu</p>
                </div>

                {/* Indicator dots untuk multiple pegawai */}
                {ultahPegawai.length > 1 && (
                  <div className="flex justify-center space-x-2 mt-4">
                    {ultahPegawai.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          index === currentIndex ? 'bg-pink-500' : 'bg-pink-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </DialogDescription>
          
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