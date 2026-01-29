import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Home,
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  FileText,
  Download,
  Users,
  Link2,
  Database,
  ClipboardList,
  Target,
  FileCheck,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Cake,
  BarChart3,
  PieChart,
  TrendingUp,
  Filter,
  UserCheck,
  Plane,
  Award,
  Edit,
  Lock,
  FileSpreadsheet,
  Calculator,
  FileSignature,
  Receipt,
  Clock,
  Car,
  Banknote,
  Package,
  HandCoins,
  ExternalLink,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";

interface PedomanItem {
  title: string;
  icon: React.ElementType;
  url: string;
  description: string;
  features: string[];
  tips?: string[];
  accessInfo?: string;
}

const pedomanData = {
  utama: [
    {
      title: "Beranda",
      icon: Home,
      url: "/",
      description: "Halaman utama KECAP MAJA yang menampilkan informasi umum dan ucapan ulang tahun bagi karyawan Badan Pusat Statistik.",
      features: [
        "Tampilan selamat datang dengan gambaran umum aplikasi",
        "Otomatis mendeteksi pegawai yang berulang tahun hari ini",
        "Menampilkan popup ucapan selamat ulang tahun",
        "Jika ada lebih dari satu pegawai berulang tahun, bisa dilihat satu per satu",
        "Menghitung umur pegawai secara otomatis",
        "Ringkasan fitur-fitur yang tersedia di KECAP MAJA",
      ],
      tips: [
        "Buka halaman Beranda setiap hari untuk melihat siapa yang berulang tahun",
        "Sistem akan menampilkan pemberitahuan jika ada pegawai berulang tahun",
      ],
    },
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      url: "/dashboard",
      description: "Halaman untuk melihat ringkasan data dalam bentuk grafik, memantau honor mitra statistik, perjalanan dinas organik dan mitra statistik, dan LK karyawan berprestasi tahunan.",
      features: [
        "Grafik batang, pie, dan garis untuk visualisasi data",
        "Filter data berdasarkan Fungsi, Bulan, dan Tahun",
        "Pantau mitra yang mendekati batas honor maksimal (Risk Assessment)",
        "Lihat rekap perjalanan dinas per pegawai",
        "Cek capaian kinerja (LK Kinerja)",
      ],
      tips: [
        "Gunakan filter untuk fokus pada data tertentu",
        "Perhatikan warna merah/kuning pada Risk Assessment untuk mitra yang perlu diawasi",
      ],
    },
  ],
  spkBast: [
    {
      title: "SPK dan BAST",
      icon: FileText,
      url: "/spk-bast",
      description: "Menu utama untuk mengelola Surat Perintah Kerja (SPK) dan Berita Acara Serah Terima (BAST).",
      features: [
        "Akses ke 4 submenu: Entri Target, Download SPK BAST, Rekap SPK, dan SBML Tahunan",
        "Entri target dan realisasi bulanan",
        "Pantau honor bulanan mitra statistik",
        "Terdapat peringatan untuk honor bulanan yang melebihi SBML",
        "Tampilan card untuk setiap submenu",
        "Navigasi mudah ke fitur yang dibutuhkan",
      ],
      tips: [
        "Mulai dari Entri Target untuk membuat SPK baru",
        "Cek SBML Tahunan sebelum menambah mitra baru",
      ],
    },
    {
      title: "Entri Target",
      icon: Target,
      url: "/spk-bast/entri-target",
      description: "Form untuk input kegiatan dan membuat SPK baru dengan perhitungan honor otomatis.",
      features: [
        "Isi detail kegiatan (nama, periode, volume)",
        "Tambah petugas organik dengan role yang sesuai",
        "Tambah mitra dari daftar Mitra Kepka",
        "Honor dihitung otomatis sesuai jenis pekerjaan",
        "Sistem cek agar periode tidak tumpang tindih",
        "Preview SPK sebelum disimpan",
        "Otomatis cek apakah mitra masih dalam batas honor maksimal",
      ],
      tips: [
        "Pastikan periode tidak bentrok dengan kegiatan lain",
        "Cek sisa kuota SBML mitra sebelum menambahkan ke kegiatan",
        "Isi semua kolom wajib sebelum menyimpan",
      ],
      accessInfo: "Entri hanya bisa dilakukan user PJ Kegiatan",
    },
    {
      title: "Download SPK & BAST",
      icon: Download,
      url: "/spk-bast/download-spk-bast",
      description: "Halaman untuk mengunduh dokumen SPK dan BAST yang sudah dibuat.",
      features: [
        "Daftar semua dokumen SPK-BAST yang tersedia",
        "Filter berdasarkan periode, kegiatan, atau mitra",
        "Download langsung dalam format dokumen",
        "Preview sebelum download",
        "Download beberapa dokumen sekaligus",
      ],
      tips: [
        "Gunakan filter untuk menemukan dokumen dengan cepat",
        "Preview dulu sebelum print untuk memastikan data benar",
      ],
    },
    {
      title: "Rekap SPK",
      icon: ClipboardList,
      url: "/spk-bast/rekap-spk",
      description: "Rekap total honor per mitra dengan peringatan jika mendekati atau melebihi batas maksimal.",
      features: [
        "Lihat total honor yang sudah diterima setiap mitra",
        "Peringatan kuning jika mendekati batas SBML",
        "Peringatan merah jika melebihi batas SBML",
        "Rincian per jenis pekerjaan (pendataan, pemeriksaan, pengolahan)",
        "Filter berdasarkan periode dan fungsi",
        "Export rekap ke Excel",
      ],
      tips: [
        "Perhatikan peringatan kuning untuk antisipasi",
        "Export rekap untuk pelaporan bulanan",
      ],
    },
    {
      title: "Cek SBML",
      icon: FileCheck,
      url: "/spk-bast/cek-sbml",
      description: "Cek sisa kuota Standar Biaya Masukan Lainnya (SBML) untuk setiap mitra.",
      features: [
        "Lihat sisa kuota SBML per mitra",
        "Riwayat penggunaan SBML per periode",
        "Proyeksi penggunaan sampai akhir tahun",
        "Peringatan untuk mitra yang berpotensi melebihi batas",
        "Perbandingan dengan tahun sebelumnya",
      ],
      tips: [
        "Selalu cek SBML sebelum membuat SPK baru untuk mitra",
        "Perhatikan proyeksi untuk perencanaan ke depan",
      ],
    },
    {
      title: "SBML Tahunan",
      icon: DollarSign,
      url: "/spk-bast/entri-sbml",
      description: "Kelola data batas maksimal honor mitra (SBML) per tahun anggaran.",
      features: [
        "Tambah data SBML untuk tahun anggaran baru",
        "Edit data SBML yang sudah ada",
        "Hapus data SBML yang tidak terpakai",
        "Riwayat perubahan SBML",
        "Import data dari file Excel",
        "Validasi data sebelum disimpan",
      ],
      tips: [
        "Update SBML di awal tahun anggaran",
        "Backup data sebelum melakukan perubahan besar",
      ],
      accessInfo: "Hanya admin yang dapat mengubah data SBML",
    },
  ],
  eDokumen: [
    {
      title: "Buat e-Dokumen",
      icon: Edit,
      url: "/e-dokumen/buat",
      description: "Buat berbagai dokumen elektronik dengan 12 jenis template yang tersedia.",
      features: [
        "12 jenis template dokumen:",
        "• Daftar Hadir - untuk rapat/pelatihan",
        "• KAK (Kerangka Acuan Kerja) - dokumen perencanaan",
        "• Kuitansi Perjalanan - bukti pengeluaran perjadin",
        "• Kuitansi Transport - bukti pengeluaran transportasi",
        "• SPJ Honor - Surat Pertanggungjawaban honor",
        "• Surat Keputusan - SK resmi",
        "• Surat Pernyataan - berbagai surat pernyataan",
        "• Tanda Terima - bukti serah terima",
        "• Transport Lokal - dokumen transport dalam kabupaten",
        "• Uang Harian & Transport - dokumen perjadin",
        "• Lembur & Laporan - dokumen lembur pegawai",
        "• Dokumen Pengadaan - kelengkapan pengadaan",
        "Form mudah diisi dengan validasi otomatis",
        "Preview dokumen sebelum disimpan",
        "Hasil siap cetak",
      ],
      tips: [
        "Pilih template yang sesuai kebutuhan",
        "Isi semua kolom dengan benar",
        "Preview dokumen sebelum print",
      ],
    },
    {
      title: "Download e-Dokumen",
      icon: Download,
      url: "/e-dokumen/download",
      description: "Unduh dokumen elektronik yang sudah dibuat sebelumnya.",
      features: [
        "Tab navigasi per jenis dokumen",
        "Cari dokumen berdasarkan nama/tanggal",
        "Tampilan per halaman untuk dokumen yang banyak",
        "Link download langsung",
        "Filter berdasarkan tanggal pembuatan",
        "Download beberapa dokumen sekaligus",
      ],
      tips: [
        "Gunakan tab untuk navigasi cepat",
        "Manfaatkan fitur pencarian untuk dokumen tertentu",
      ],
    },
    {
      title: "Daftar Hadir",
      icon: Users,
      url: "/e-dokumen/daftar-hadir",
      description: "Buat daftar hadir untuk kegiatan rapat, pelatihan, dan sosialisasi.",
      features: [
        "Input nama kegiatan dan tanggal",
        "Pilih peserta dari daftar pegawai",
        "Tambah peserta dari luar (manual)",
        "Kolom tanda tangan bisa diatur",
        "Export ke PDF/Excel",
      ],
    },
    {
      title: "KAK",
      icon: FileText,
      url: "/e-dokumen/kak",
      description: "Buat Kerangka Acuan Kerja untuk perencanaan kegiatan.",
      features: [
        "Template KAK sesuai format BPS",
        "Input latar belakang dan tujuan kegiatan",
        "Rincian jadwal pelaksanaan",
        "Estimasi anggaran otomatis",
        "Siap untuk proses persetujuan",
      ],
    },
    {
      title: "Kuitansi",
      icon: Receipt,
      url: "/e-dokumen/kuitansi-perjalanan",
      description: "Buat kuitansi untuk pertanggungjawaban keuangan.",
      features: [
        "Kuitansi perjalanan dinas",
        "Kuitansi transport",
        "Nomor kuitansi otomatis",
        "Terbilang (angka ke huruf) otomatis",
        "Format standar keuangan",
      ],
    },
    {
      title: "SPJ Honor",
      icon: HandCoins,
      url: "/e-dokumen/spj-honor",
      description: "Buat Surat Pertanggungjawaban Honor untuk pembayaran kegiatan.",
      features: [
        "Terhubung dengan data SPK yang sudah dibuat",
        "Perhitungan pajak otomatis",
        "Rekap per kegiatan",
        "Format SPJ standar",
      ],
    },
  ],
  karirJadwal: [
    {
      title: "KarierKu",
      icon: GraduationCap,
      url: "/karierku",
      description: "Fitur untuk melihat estimasi kenaikan pangkat dan jabatan pegawai BPS Kabupaten Majalengka berdasarkan angka kredit.",
      features: [
        "Cari dan pilih pegawai dari daftar yang tersedia",
        "Lihat profil lengkap pegawai (NIP, pangkat, golongan, jabatan)",
        "Hitung otomatis angka kredit yang sudah terkumpul",
        "Estimasi kapan bisa naik pangkat berdasarkan angka kredit",
        "Estimasi kapan bisa naik jabatan",
        "Simulasi dengan asumsi predikat kinerja yang berbeda",
        "Menampilkan SK Jabatan dan SK Pangkat jika tersedia",
        "Layanan karir untuk informasi lebih lanjut",
      ],
      tips: [
        "Gunakan fitur pencarian untuk menemukan pegawai dengan cepat",
        "Ubah asumsi predikat kinerja untuk melihat skenario berbeda",
        "Data diambil dari database pegawai yang terupdate",
      ],
      accessInfo: "Semua pegawai BPS Kabupaten Majalengka dapat mengakses",
    },
    {
      title: "Block Tanggal Perjalanan",
      icon: Calendar,
      url: "/block-tanggal",
      description: "Fitur untuk mencatat dan mengkoordinasikan jadwal perjalanan dinas mitra agar tidak bentrok antar fungsi.",
      features: [
        "Pilih bulan dan tahun untuk melihat jadwal",
        "Setiap fungsi bisa menambah mitra dan tanggal kegiatan",
        "Maksimal 10 kegiatan per bulan untuk setiap fungsi",
        "Kalender interaktif untuk memilih tanggal",
        "Sistem mencegah tanggal yang sama di-block oleh fungsi lain",
        "Bisa menambah, edit, dan hapus kegiatan",
        "Data tersimpan di Google Sheets",
        "Lihat siapa penanggung jawab setiap mitra",
      ],
      tips: [
        "Koordinasi dengan fungsi lain sebelum mem-block tanggal mitra",
        "Cek jadwal fungsi lain untuk menghindari konflik",
        "Pastikan login dengan role yang benar",
      ],
      accessInfo: "Setiap fungsi hanya bisa edit jadwal milik fungsinya sendiri",
    },
  ],
  linkersPengadaan: [
    {
      title: "Pengadaan",
      icon: ShoppingCart,
      url: "/pengadaan",
      description: "Fitur untuk mencatat dan memantau proses pengadaan barang/jasa di BPS Kabupaten Majalengka.",
      features: [
        "Input usulan pengadaan baru",
        "Pantau status pengadaan: Usulan → Proses → Kontrak → Selesai",
        "Filter data berdasarkan status dan periode",
        "Lihat detail setiap pengadaan",
        "Update status pengadaan sesuai perkembangan",
        "Export data pengadaan ke Excel",
      ],
      tips: [
        "Update status pengadaan secara rutin",
        "Gunakan filter untuk mencari pengadaan tertentu",
      ],
      accessInfo: "Akses khusus untuk PPK, Bendahara, dan Pejabat Pengadaan",
    },
    {
      title: "Linkers",
      icon: Link2,
      url: "/linkers",
      description: "Kumpulan link dokumen penting dan referensi yang sering digunakan.",
      features: [
        "Link SBM 2025 (Standar Biaya Masukan)",
        "Link Perka BPS terkait",
        "Link referensi lainnya",
        "Kategori link berdasarkan jenis",
        "Akses cepat ke dokumen penting",
        "Update link terbaru",
      ],
      tips: [
        "Bookmark halaman ini untuk akses cepat",
        "Cek update link secara berkala",
      ],
    },
  ],
  lainnya: [
    {
      title: "Kecap to Bendahara",
      icon: Banknote,
      url: "/aki-to-bendahara",
      description: "Rekap honor untuk keperluan bendahara dengan export ke Excel.",
      features: [
        "Rekap honor per periode",
        "Filter berdasarkan fungsi, kegiatan, dan bulan",
        "Hitung total honor dan pajak",
        "Export ke format Excel",
        "Preview data sebelum export",
        "Pengelompokan berdasarkan kegiatan/mitra",
      ],
      tips: [
        "Gunakan filter untuk data yang spesifik",
        "Export secara berkala untuk backup",
      ],
      accessInfo: "Akses khusus untuk Bendahara dan Admin",
    },
    {
      title: "Padamel-3210 | Mitra Kepka",
      icon: Users,
      url: "/entri-pengelola",
      description: "Kelola data Pengelola Anggaran (Padamel-3210) dan Pegawai Organik BPS Kabupaten Majalengka.",
      features: [
        "Tab Padamel-3210: Data pengelola anggaran (PPK, PPSPM, Bendahara)",
        "Tab Organik: Data pegawai BPS",
        "Tambah, lihat, edit, dan hapus data",
        "Validasi NIP dan data pegawai",
        "Import data dari Excel",
        "Export data ke Excel",
        "Cari dan filter data",
      ],
      tips: [
        "Pastikan NIP valid (organik)",
        "Pastikan NIK dan Nomor Telepon valid (mitra statistik)",
      ],
    },
  ],
};

const tabConfig = [
  { value: "utama", label: "Beranda", icon: Home, color: "text-blue-500" },
  { value: "spkBast", label: "SPK dan BAST", icon: FileText, color: "text-emerald-500" },
  { value: "eDokumen", label: "e-Dokumen", icon: Edit, color: "text-purple-500" },
  { value: "karirJadwal", label: "Karir & Jadwal", icon: GraduationCap, color: "text-pink-500" },
  { value: "linkersPengadaan", label: "Linkers & Pengadaan", icon: ShoppingCart, color: "text-orange-500" },
  { value: "lainnya", label: "Lainnya", icon: Package, color: "text-amber-500" },
];

export default function Pedoman() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("utama");
  const satkerContext = useSatkerConfigContext();
  const satkerNama = useMemo(() => satkerContext?.configs?.[0]?.satker_nama || 'BPS', [satkerContext?.configs]);

  const applySatker = (text: string | undefined) => {
    if (!text) return text || "";
    return text.replace(/BPS Kabupaten Majalengka|BPS Kab\. Majalengka|BPS Majalengka/g, satkerNama);
  };

  const renderPedomanCard = (item: PedomanItem) => {
    const features = (item.features || []).map(f => applySatker(f));
    const tips = (item.tips || []).map(t => applySatker(t));
    const accessInfo = item.accessInfo ? applySatker(item.accessInfo) : undefined;
    const description = applySatker(item.description);
    return (
      <Card
      key={item.title}
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              {accessInfo && (
                <Badge variant="outline" className="mt-1 text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  {accessInfo}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription className="mt-3 text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Fitur Utama
          </h4>
          <ul className="space-y-1.5">
            {features.slice(0, 6).map((feature, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
            {item.features.length > 6 && (
              <li className="text-sm text-muted-foreground italic">
                ... dan {item.features.length - 6} fitur lainnya
              </li>
            )}
          </ul>
        </div>
        {item.tips && item.tips.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Tips
            </h4>
            <ul className="space-y-1 list-disc pl-5">
              {tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">
                    {tip}
                  </li>
                ))}
            </ul>
          </div>
        )}
        <Button
          variant="outline"
          className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={() => navigate(item.url)}
        >
          Buka Halaman
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-primary/10">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-red-500 to-orange-500 bg-clip-text text-transparent">
          Pedoman Penggunaan
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Panduan lengkap fitur-fitur KECAP MAJA untuk membantu Anda memahami dan menggunakan sistem dengan optimal
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full max-w-3xl mx-auto mb-6 bg-muted/80 p-1 rounded-full shadow-inner justify-center">
          {tabConfig.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Konten Tab - Tanpa ScrollArea yang membatasi tinggi */}
        <TabsContent value="utama" className="mt-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {pedomanData.utama.map(renderPedomanCard)}
          </div>
        </TabsContent>

        <TabsContent value="spkBast" className="mt-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {pedomanData.spkBast.map(renderPedomanCard)}
          </div>
        </TabsContent>

        <TabsContent value="eDokumen" className="mt-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {pedomanData.eDokumen.map(renderPedomanCard)}
          </div>
        </TabsContent>

        <TabsContent value="karirJadwal" className="mt-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {pedomanData.karirJadwal.map(renderPedomanCard)}
          </div>
        </TabsContent>

        <TabsContent value="linkersPengadaan" className="mt-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {pedomanData.linkersPengadaan.map(renderPedomanCard)}
          </div>
        </TabsContent>

        <TabsContent value="lainnya" className="mt-0">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {pedomanData.lainnya.map(renderPedomanCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="text-center pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Butuh bantuan lebih lanjut? Hubungi Tim IT {satkerNama}
        </p>
      </div>
    </div>
  );
}