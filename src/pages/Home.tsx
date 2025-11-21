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
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  const { width, height } = useWindowSize();

  // === Fungsi utilitas (tetap sama) ===
  const extractTanggalLahirFromNIP = (nip: string): string | null => {
    try {
      const nipParts = nip.toString().split(" ");
      if (nipParts.length >= 1 && nipParts[0].length === 8) {
        const y = nipParts[0].substring(0, 4);
        const m = nipParts[0].substring(4, 6);
        const d = nipParts[0].substring(6, 8);
        return `${y}-${m}-${d}`;
      }
      return null;
    } catch {
      return null;
    }
  };

  const hitungUmur = (tgl: string): number => {
    const today = new Date();
    const birth = new Date(tgl);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const isHariIniUlangTahun = (tgl: string): boolean => {
    const today = new Date();
    const birth = new Date(tgl);
    return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate();
  };

  const formatNIP = (nip: string) =>
    nip.toString().replace(/(\d{8})(\d{6})(\d)(\d{3})/, "$1 $2 $3 $4");

  // === Fetch data ===
  const fetchPegawaiBerulangTahun = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM",
          operation: "read",
          range: "MASTER.ORGANIK",
        },
      });

      if (error) throw error;
      if (!data?.values || data.values.length <= 1) return [];

      const rows = data.values.slice(1);
      const hasil: Pegawai[] = [];

      for (const row of rows) {
        const nip = row[2] ?? row[1] ?? "";
        const nama = row[3] ?? "";
        const jabatan = row[4] ?? "";
        const pangkat = row[7] ?? "";

        if (!nip || !nama) continue;

        const tglLahir = extractTanggalLahirFromNIP(nip);
        if (tglLahir && isHariIniUlangTahun(tglLahir)) {
          hasil.push({
            nip,
            nama,
            tanggal_lahir: tglLahir,
            umur: hitungUmur(tglLahir),
            jabatan,
            pangkat,
          });
        }
      }
      return hasil;
    } catch (err) {
      toast({
        title: "Error",
        description: "Gagal memuat data ulang tahun",
        variant: "destructive",
      });
      return [];
    }
  };

  // === Load data saat mount ===
  useEffect(() => {
    fetchPegawaiBerulangTahun().then((data) => {
      if (data.length > 0) {
        setUltahPegawai(data);
        setShowDialog(true);
        setShowConfetti(true);

        toast({
          title: "Selamat Ulang Tahun!",
          description:
            data.length === 1
              ? `Hari ini ${data[0].nama} berulang tahun!`
              : `Ada ${data.length} pegawai yang berulang tahun hari ini`,
        });
      }
    });
  }, []);

  // === Navigasi dialog ===
  const nextPegawai = () => setCurrentIndex((i) => (i + 1) % ultahPegawai.length);
  const prevPegawai = () => setCurrentIndex((i) => (i - 1 + ultahPegawai.length) % ultahPegawai.length);

  // === Ucapan random ===
  const getRandomUcapan = (umur: number, nama: string, jabatan: string) => {
    const list =
      umur >= 50
        ? [
            `Selamat ulang tahun ke-${umur}, ${nama}! Pengalaman dan kebijaksanaan Bapak/Ibu sangat berarti bagi kami semua.`,
            `Di usia emas ini, semoga ${nama} selalu sehat dan terus menginspirasi BPS Majalengka.`,
            `Terima kasih atas segala dedikasi. Selamat merayakan ${umur} tahun yang penuh makna!`,
          ]
        : umur >= 40
        ? [
            `Selamat ulang tahun ke-${umur}, ${nama}! Semoga semakin sukses dan produktif dalam mengabdi.`,
            `Di usia matang ini, semoga ${nama} terus menjadi teladan bagi kami semua.`,
            `Semoga tahun ini penuh berkah dan pencapaian baru bagi ${nama}.`,
          ]
        : [
            `Selamat ulang tahun yang ke-${umur}, ${nama}! Semoga selalu sehat, bahagia, dan sukses sebagai ${jabatan}.`,
            `Semoga di usia ini ${nama} semakin bijaksana dan terus berkarya untuk BPS Majalengka.`,
            `Panjang umur, sehat selalu, dan terus menginspirasi ya, ${nama}!`,
          ];

    return list[Math.floor(Math.random() * list.length)];
  };

  const currentPegawai = ultahPegawai[currentIndex];

  return (
    <>
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.15}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}

      {/* Dialog Ulang Tahun – SEKARANG BENAR & AMAN */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 p-6">
            <DialogHeader className="text-center">
              <div className="flex justify-between mb-4">
                {ultahPegawai.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={prevPegawai} className="rounded-full">
                    <ChevronLeft className="h-5 w-5 text-pink-600" />
                  </Button>
                )}
                <motion.div animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 0.6 }}>
                  <Cake className="h-20 w-20 text-pink-500 mx-auto" />
                  <Heart className="h-9 w-9 text-red-500 absolute -top-2 -right-2 animate-pulse" />
                </motion.div>
                {ultahPegawai.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={nextPegawai} className="rounded-full">
                    <ChevronRight className="h-5 w-5 text-pink-600" />
                  </Button>
                )}
              </div>

              <DialogTitle className="text-3xl font-bold text-pink-700">
                Selamat Ulang Tahun!
              </DialogTitle>
              {ultahPegawai.length > 1 && (
                <p className="text-pink-600 mt-2">
                  {currentIndex + 1} dari {ultahPegawai.length}
                </p>
              )}
            </DialogHeader>

            <AnimatePresence mode="wait">
              {currentPegawai && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 space-y-6"
                >
                  <div className="bg-white rounded-xl p-6 shadow-md">
                    <h3 className="text-xl font-bold text-center mb-4">{currentPegawai.nama}</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><span className="font-medium">NIP:</span> {formatNIP(currentPegawai.nip)}</p>
                      <p><span className="font-medium">Jabatan:</span> {currentPegawai.jabatan}</p>
                      <p><span className="font-medium">Pangkat:</span> {currentPegawai.pangkat}</p>
                      <p><span className="font-medium">Umur:</span> <span className="text-pink-600 font-bold">{currentPegawai.umur} tahun</span></p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 italic text-gray-700 text-center">
                    "{getRandomUcapan(currentPegawai.umur, currentPegawai.nama, currentPegawai.jabatan)}"
                  </div>

                  <div className="text-center space-y-1 text-sm text-gray-600">
                    <p>Semoga hari ini penuh kebahagiaan</p>
                    <p>Terus berkarya untuk BPS Majalengka</p>
                    <p>Panjang umur & sehat selalu</p>
                  </div>

                  {ultahPegawai.length > 1 && (
                    <div className="flex justify-center gap-2">
                      {ultahPegawai.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentIndex(i)}
                          className={`h-2 w-2 rounded-full transition-all ${
                            i === currentIndex ? "bg-pink-500 w-8" : "bg-pink-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 text-center">
              <Button
                onClick={() => setShowDialog(false)}
                className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg"
              >
                Tutup & Lanjutkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === KONTEN UTAMA (Hero + Tentang + Fitur + Manfaat) === */}
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-12">
        {/* Hero */}
        <section className="relative rounded-3xl overflow-hidden shadow-2xl mb-12">
          <motion.img
            src={heroBanner}
            alt="KECAP MAJA"
            className="w-full h-96 object-cover"
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 12, ease: "easeOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-primary/70 to-transparent flex items-end">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-white p-10 pb-16"
            >
              <h1 className="text-6xl font-extrabold tracking-tight">KECAP MAJA</h1>
              <p className="text-2xl mt-3 font-medium">
                Kerja Efisien, Cepat, Akurat, Profesional — Maju Aman Jeung Amanah
              </p>
            </motion.div>
          </div>
        </section>

        {/* Tentang */}
        <section className="max-w-5xl mx-auto px-6 mb-16">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-10">
                <CardTitle className="text-4xl font-bold">Tentang KECAP MAJA</CardTitle>
              </CardHeader>
              <CardContent className="p-10 text-lg leading-relaxed space-y-6">
                <p>
                  KECAP MAJA adalah sistem administrasi digital terpadu yang dirancang khusus untuk BPS Kabupaten Majalengka guna mentransformasi pengelolaan kegiatan menjadi lebih efisien, transparan, dan andal.
                </p>
                <p>
                  Dengan semangat <strong>Maju Aman Jeung Amanah</strong>, KECAP MAJA menjadi katalisator budaya kerja unggul melalui otomatisasi dokumen, monitoring real-time, dan tata kelola yang akuntabel.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Fitur Utama */}
        <section className="max-w-7xl mx-auto px-6 mb-16">
          <motion.h2
            className="text-4xl font-bold text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
          >
            Fitur Utama
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: FileText, title: "SPK & BAST Digital", desc: "Pembuatan kontrak dan serah terima secara otomatis" },
              { icon: BarChart3, title: "Dashboard Real-time", desc: "Monitoring target vs realisasi kegiatan" },
              { icon: Users, title: "Block Tanggal", desc: "Penguncian jadwal perjalanan dinas" },
              { icon: Download, title: "e-Dokumen", desc: "Template dokumen resmi siap pakai" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="h-full text-center p-8 hover:shadow-2xl transition-shadow rounded-3xl border-none">
                  <f.icon className="h-14 w-14 text-primary mx-auto mb-4" />
                  <CardTitle className="text-xl mb-3">{f.title}</CardTitle>
                  <CardDescription>{f.desc}</CardDescription>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Manfaat */}
        <section className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-xl rounded-3xl">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 p-10">
                <CardTitle className="text-4xl font-bold">Manfaat KECAP MAJA</CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <ul className="space-y-6 text-lg">
                  {["Efisiensi Administrasi", "Transparansi Data", "Tata Kelola Terstruktur", "Monitoring Mudah", "Otomasi Pelaporan"].map(
                    (item, i) => (
                      <motion.li
                        key={i}
                        className="flex items-start gap-4"
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <span className="text-primary text-3xl">•</span>
                        <span>
                          <strong>{item}:</strong> Proses lebih cepat, akurat, dan terdokumentasi dengan baik.
                        </span>
                      </motion.li>
                    )
                  )}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="text-center py-12 mt-20 text-muted-foreground">
          <p>© 2025 Badan Pusat Statistik Kabupaten Majalengka. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}