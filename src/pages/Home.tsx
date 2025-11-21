import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BarChart3, Users, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Cake, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heroBanner from "@/assets/hero-banner.jpg";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

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
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  const { width, height } = useWindowSize();

  // Fungsi untuk extract tanggal lahir dari NIP
  const extractTanggalLahirFromNIP = (nip: string): string | null => {
    try {
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

  // Fetch data pegawai dari Google Sheets via Supabase
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
        setShowConfetti(true);
        
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Dialog Ulang Tahun dengan Animasi Modern */}
      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogContent className="max-w-md bg-white/95 backdrop-blur-md border border-pink-200 rounded-2xl shadow-2xl overflow-hidden">
                {showConfetti && (
                  <Confetti
                    width={width}
                    height={height}
                    recycle={false}
                    numberOfPieces={200}
                    onConfettiComplete={() => setShowConfetti(false)}
                  />
                )}
                <DialogHeader>
                  <div className="flex justify-between items-center mb-6">
                    {ultahPegawai.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={prevPegawai}
                        className="h-10 w-10 rounded-full hover:bg-pink-100"
                      >
                        <ChevronLeft className="h-5 w-5 text-pink-600" />
                      </Button>
                    )}
                    
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: 1 }}
                      className="relative"
                    >
                      <Cake className="h-20 w-20 text-pink-500" />
                      <Heart className="h-8 w-8 text-red-500 absolute -top-2 -right-2 animate-pulse" />
                    </motion.div>

                    {ultahPegawai.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextPegawai}
                        className="h-10 w-10 rounded-full hover:bg-pink-100"
                      >
                        <ChevronRight className="h-5 w-5 text-pink-600" />
                      </Button>
                    )}
                  </div>

                  <DialogTitle className="text-center text-3xl font-bold text-pink-700 tracking-tight">
                    🎉 Selamat Ulang Tahun! 🎉
                  </DialogTitle>
                  
                  {ultahPegawai.length > 1 && (
                    <div className="text-center text-sm text-pink-600 mt-2">
                      {currentIndex + 1} dari {ultahPegawai.length} pegawai
                    </div>
                  )}
                </DialogHeader>
                
                <DialogDescription className="text-center space-y-6 px-4">
                  {currentPegawai && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 shadow-md border border-gray-100"
                      >
                        <h3 className="font-semibold text-xl text-gray-900 mb-3">
                          {currentPegawai.nama}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2 flex items-center justify-center gap-2">
                          <span className="font-medium">NIP:</span> {formatNIP(currentPegawai.nip)}
                        </p>
                        <p className="text-sm text-gray-600 mb-2 flex items-center justify-center gap-2">
                          <span className="font-medium">Jabatan:</span> {currentPegawai.jabatan}
                        </p>
                        <p className="text-sm text-gray-600 mb-2 flex items-center justify-center gap-2">
                          <span className="font-medium">Pangkat:</span> {currentPegawai.pangkat}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                          <span className="font-medium">Umur:</span> 
                          <span className="font-semibold text-pink-600">{currentPegawai.umur} tahun</span>
                        </p>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-gray-700 text-justify leading-relaxed italic shadow-sm"
                      >
                        "{getRandomUcapan(currentPegawai.umur, currentPegawai.nama, currentPegawai.jabatan)}"
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col space-y-2 text-sm text-gray-500"
                      >
                        <p className="flex items-center justify-center gap-2">💝 Semoga hari ini penuh kebahagiaan dan keceriaan</p>
                        <p className="flex items-center justify-center gap-2">🌟 Terus berkarya untuk BPS Majalengka</p>
                        <p className="flex items-center justify-center gap-2">🎂 Panjang umur dan sehat selalu</p>
                      </motion.div>

                      {/* Indicator dots untuk multiple pegawai */}
                      {ultahPegawai.length > 1 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.6 }}
                          className="flex justify-center space-x-2 mt-4"
                        >
                          {ultahPegawai.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentIndex(index)}
                              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                                index === currentIndex ? 'bg-pink-500 scale-125' : 'bg-pink-200 hover:bg-pink-300'
                              }`}
                            />
                          ))}
                        </motion.div>
                      )}
                    </>
                  )}
                </DialogDescription>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="flex justify-center mt-6"
                >
                  <Button 
                    onClick={() => setShowDialog(false)}
                    className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Tutup & Lanjutkan
                  </Button>
                </motion.div>
              </DialogContent>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section dengan Parallax Effect */}
      <section className="relative rounded-2xl overflow-hidden shadow-2xl mb-12">
        <motion.img 
          src={heroBanner} 
          alt="SIMAJA Hero Banner" 
          className="w-full h-80 object-cover"
          initial={{ scale: 1.1 }}
          whileInView={{ scale: 1 }}
          transition={{ duration: 10, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/70 flex items-center justify-center">
          <motion.div 
            className="text-center text-primary-foreground px-8"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl font-extrabold mb-3 tracking-tight">KECAP MAJA</h1>
            <p className="text-2xl font-medium">Kerja Efisien, Cepat, Akurat, Profesional - Maju Aman Jeung Amanah</p>
          </motion.div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 p-8">
              <CardTitle className="text-3xl font-bold text-foreground">Tentang KECAP MAJA</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6 text-foreground text-lg leading-relaxed">
              <p>
                💡 KECAP MAJA adalah sistem administrasi digital terpadu yang dirancang untuk mentransformasi pengelolaan kegiatan menjadi lebih efisien, transparan, dan andal. Sistem ini menghadirkan beragam fitur canggih, seperti pembuatan dokumen otomatis, entri data mitra statistik, rekap honorarium yang terintegrasi, serta pemantauan batas SBML secara real-time. Dengan dukungan teknologi ini, proses administrasi tidak hanya menjadi lebih cepat dan terukur, tetapi juga meminimalisir kesalahan, sehingga menciptakan standar kerja yang lebih profesional.
              </p>
              <p>
                Berdiri di atas semangat Maju Aman jeung Amanah, KECAP MAJA tidak sekadar menjadi alat bantu, melainkan juga pendorong terwujudnya budaya kerja yang unggul di lingkungan BPS Kabupaten Majalengka. Setiap aktivitas administrasi kini dapat dijalankan dengan prinsip efisiensi, ketepatan, kecepatan, dan profesionalisme, mendukung terciptanya tata kelola yang akuntabel dan berorientasi pada kualitas.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Features Grid Section */}
      <section className="mb-12">
        <motion.h2
          className="text-3xl font-bold mb-8 text-foreground text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Fitur Utama
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: FileText,
              title: "Administrasi SPK & BAST",
              desc: "Pembuatan dan pengelolaan Surat Perjanjian Kerja serta Berita Acara Serah Terima secara digital"
            },
            {
              icon: BarChart3,
              title: "Dashboard Monitoring",
              desc: "Visualisasi data target dan realisasi kegiatan mitra statistik secara real-time"
            },
            {
              icon: Users,
              title: "Block Tanggal",
              desc: "Fitur tagging yang digunakan untuk mencatat, mengunci, dan memvalidasi tanggal perjalanan dinas bagi pegawai organik maupun mitra statistik"
            },
            {
              icon: Download,
              title: "e-Dokumen",
              desc: "Pengelolaan dan penyusunan dokumen administrasi secara otomatis dan terintegrasi"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
            >
              <Card className="hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden border-none bg-white/95 backdrop-blur-md">
                <CardHeader className="p-6">
                  <feature.icon className="h-12 w-12 text-primary mb-4 mx-auto" />
                  <CardTitle className="text-center text-xl font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 text-center text-muted-foreground">
                  {feature.desc}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 p-8">
              <CardTitle className="text-3xl font-bold text-foreground">Manfaat KECAP MAJA</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <ul className="space-y-6 text-foreground text-lg">
                {[
                  { title: "Efisiensi Administrasi", desc: "Mengurangi pekerjaan manual melalui otomatisasi dalam pembuatan dan pengelolaan dokumen" },
                  { title: "Transparansi Data", desc: "Menyajikan informasi target dan realisasi kegiatan secara terbuka dan mudah diakses" },
                  { title: "Tata Kelola Terstruktur", desc: "Setiap proses administrasi tercatat rapi dengan alur kerja yang jelas dan terdokumentasi" },
                  { title: "Kemudahan Monitoring", desc: "Menyediakan dashboard interaktif untuk memantau perkembangan kegiatan secara real-time" },
                  { title: "Otomasi Pelaporan", desc: "Menghasilkan laporan dan dokumen administrasi secara otomatis, cepat, dan akurat" }
                ].map((benefit, index) => (
                  <motion.li
                    key={benefit.title}
                    className="flex items-start gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary/10 rounded-full text-primary font-bold text-xl">•</span>
                    <div>
                      <strong className="block text-xl mb-1">{benefit.title}:</strong>
                      <span className="text-muted-foreground">{benefit.desc}</span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer Info */}
      <section className="text-center py-8 border-t border-muted">
        <p className="text-sm text-muted-foreground">
          © 2025 Badan Pusat Statistik Kabupaten Majalengka. All rights reserved.
        </p>
      </section>
    </div>
  );
}