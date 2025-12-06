import { useState } from "react";
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
  ChevronRight,
  Star,
  Zap,
  Shield,
  Globe,
  Clock4,
  CalendarDays,
  Users2,
  FileStack,
  Wallet,
} from "lucide-react";

interface PedomanItem {
  title: string;
  icon: React.ElementType;
  url: string;
  description: string;
  features: string[];
  tips?: string[];
  accessInfo?: string;
  badge?: string;
}

const pedomanData = {
  utama: [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      url: "/dashboard",
      description: "Halaman untuk melihat ringkasan data dalam bentuk grafik, memantau mitra, dan perjalanan dinas.",
      features: [
        "Grafik batang, pie, dan garis untuk visualisasi data",
        "Filter data berdasarkan Fungsi, Bulan, dan Tahun",
        "Pantau mitra yang mendekati batas honor maksimal (Risk Assessment)",
        "Lihat rekap perjalanan dinas per pegawai",
        "Cek capaian kinerja (LK Kinerja)",
        "Konversi nilai predikat kinerja",
        "Bisa menyembunyikan/menampilkan bagian tertentu",
      ],
      tips: [
        "Gunakan filter untuk fokus pada data tertentu",
        "Perhatikan warna merah/kuning pada Risk Assessment untuk mitra yang perlu diawasi",
      ],
      badge: "🌟 Fitur Unggulan"
    },
    {
      title: "Home",
      icon: Home,
      url: "/",
      description: "Halaman utama KECAP MAJA yang menampilkan informasi umum dan ucapan ulang tahun pegawai.",
      features: [
        "Tampilan selamat datang dengan gambaran umum aplikasi",
        "Otomatis mendeteksi pegawai yang berulang tahun hari ini",
        "Menampilkan popup ucapan selamat ulang tahun",
        "Jika ada lebih dari satu pegawai berulang tahun, bisa dilihat satu per satu",
        "Menghitung umur pegawai secara otomatis",
        "Ringkasan fitur-fitur yang tersedia di KECAP MAJA",
      ],
      tips: [
        "Buka halaman Home setiap hari untuk melihat siapa yang berulang tahun",
        "Sistem akan menampilkan pemberitahuan jika ada pegawai berulang tahun",
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
        "Tampilan card untuk setiap submenu",
        "Navigasi mudah ke fitur yang dibutuhkan",
      ],
      tips: [
        "Mulai dari Entri Target untuk membuat SPK baru",
        "Cek SBML Tahunan sebelum menambah mitra baru",
      ],
      badge: "📄 Dokumen"
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
        "12 jenis template dokumen lengkap",
        "Form mudah diisi dengan validasi otomatis",
        "Preview dokumen sebelum disimpan",
        "Hasil siap cetak dalam format PDF",
        "Template sesuai standar BPS",
        "Auto-save dan history pembuatan",
      ],
      tips: [
        "Pilih template yang sesuai kebutuhan dokumen",
        "Isi semua kolom dengan data yang benar",
        "Preview dokumen sebelum melakukan print",
        "Simpan template favorit untuk penggunaan berulang",
      ],
      badge: "⚡ Cepat"
    },
    {
      title: "Download e-Dokumen",
      icon: Download,
      url: "/e-dokumen/download",
      description: "Unduh dokumen elektronik yang sudah dibuat sebelumnya dengan berbagai filter.",
      features: [
        "Tab navigasi per jenis dokumen",
        "Cari dokumen berdasarkan nama/tanggal",
        "Tampilan per halaman untuk dokumen yang banyak",
        "Link download langsung ke PDF",
        "Filter berdasarkan tanggal pembuatan",
        "Download beberapa dokumen sekaligus",
      ],
      tips: [
        "Gunakan tab untuk navigasi cepat berdasarkan jenis dokumen",
        "Manfaatkan fitur pencarian untuk dokumen tertentu",
        "Download dalam batch untuk efisiensi waktu",
      ],
    },
    {
      title: "Kuitansi & SPJ",
      icon: Receipt,
      url: "/e-dokumen/kuitansi-perjalanan",
      description: "Buat kuitansi dan Surat Pertanggungjawaban untuk keperluan administrasi keuangan.",
      features: [
        "Kuitansi perjalanan dinas standar",
        "Kuitansi transport dan operasional",
        "Nomor kuitansi otomatis ter-generate",
        "Terbilang (angka ke huruf) otomatis",
        "Format standar keuangan BPS",
        "Template SPJ honor lengkap",
      ],
      tips: [
        "Pastikan data penerima dan nominal sesuai",
        "Cek terbilang otomatis sebelum print",
        "Simpan draft sebelum finalisasi",
      ],
    },
    {
      title: "Daftar Hadir & Surat",
      icon: Users,
      url: "/e-dokumen/daftar-hadir",
      description: "Buat daftar hadir rapat dan berbagai surat resmi dengan template terstandarisasi.",
      features: [
        "Daftar hadir untuk rapat/pelatihan",
        "Surat keputusan dan pernyataan",
        "Template KAK (Kerangka Acuan Kerja)",
        "Tanda terima dan berita acara",
        "Export ke PDF dan Excel",
        "Kolom tanda tangan teratur",
      ],
      tips: [
        "Pilih peserta dari daftar pegawai yang tersedia",
        "Tambahkan peserta manual jika diperlukan",
        "Export dalam format sesuai kebutuhan",
      ],
    },
  ],
  karirKoordinasi: [
    {
      title: "KarierKu",
      icon: GraduationCap,
      url: "/karierku",
      description: "Fitur untuk melihat estimasi kenaikan pangkat dan jabatan pegawai berdasarkan angka kredit.",
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
        "Simpan hasil estimasi untuk referensi",
      ],
      accessInfo: "Semua pegawai BPS Kabupaten Majalengka dapat mengakses",
      badge: "🎯 Karir"
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
        "Pastikan login dengan role yang benar untuk fungsi masing-masing",
        "Update jadwal secara berkala",
      ],
      accessInfo: "Setiap fungsi hanya bisa edit jadwal milik fungsinya sendiri",
    },
    {
      title: "Linkers & Referensi",
      icon: Link2,
      url: "/linkers",
      description: "Kumpulan link dokumen penting dan referensi yang sering digunakan dalam pekerjaan sehari-hari.",
      features: [
        "Link SBM 2025 (Standar Biaya Masukan) terupdate",
        "Link Perka BPS terkait terbaru",
        "Link referensi lainnya yang relevan",
        "Kategori link berdasarkan jenis dokumen",
        "Akses cepat ke dokumen penting",
        "Update link terbaru secara berkala",
        "Pencarian cepat berdasarkan kata kunci",
      ],
      tips: [
        "Bookmark halaman ini untuk akses cepat ke referensi",
        "Cek update link secara berkala untuk versi terbaru",
        "Gunakan pencarian untuk menemukan dokumen spesifik",
        "Laporkan link rusak untuk perbaikan cepat",
      ],
      badge: "🔗 Referensi"
    },
  ],
  pengadaan: [
    {
      title: "Pengadaan",
      icon: ShoppingCart,
      url: "/pengadaan",
      description: "Fitur untuk mencatat dan memantau proses pengadaan barang/jasa di BPS Kabupaten Majalengka.",
      features: [
        "Input usulan pengadaan baru dengan mudah",
        "Pantau status pengadaan: Usulan → Proses → Kontrak → Selesai",
        "Filter data berdasarkan status dan periode",
        "Lihat detail setiap pengadaan secara lengkap",
        "Update status pengadaan sesuai perkembangan",
        "Export data pengadaan ke Excel untuk laporan",
        "Notifikasi update status otomatis",
      ],
      tips: [
        "Update status pengadaan secara rutin setiap ada perkembangan",
        "Gunakan filter untuk mencari pengadaan tertentu dengan cepat",
        "Backup data export secara berkala",
        "Pantau timeline pengadaan untuk menghindari keterlambatan",
      ],
      accessInfo: "Akses khusus untuk PPK, Bendahara, dan Pejabat Pengadaan",
      badge: "📦 Procurement"
    },
  ],
  lainnya: [
    {
      title: "Kecap to Bendahara",
      icon: Banknote,
      url: "/aki-to-bendahara",
      description: "Rekap honor untuk keperluan bendahara dengan export ke Excel yang terstruktur.",
      features: [
        "Rekap honor per periode dengan detail lengkap",
        "Filter berdasarkan fungsi, kegiatan, dan bulan",
        "Hitung total honor dan pajak otomatis",
        "Export ke format Excel siap pakai",
        "Preview data sebelum export",
        "Pengelompokan berdasarkan kegiatan/mitra",
        "Format laporan sesuai standar bendahara",
      ],
      tips: [
        "Gunakan filter untuk mendapatkan data yang spesifik",
        "Export secara berkala untuk backup data",
        "Preview sebelum export untuk memastikan kelengkapan",
        "Simpan export dalam folder terorganisir",
      ],
      accessInfo: "Akses khusus untuk Bendahara dan Admin",
      badge: "💰 Keuangan"
    },
    {
      title: "Entri Pengelola",
      icon: Users2,
      url: "/entri-pengelola",
      description: "Kelola data Pengelola Anggaran (Padamel-3210) dan Pegawai Organik BPS Kabupaten Majalengka.",
      features: [
        "Tab Padamel-3210: Data pengelola anggaran (PPK, PPSPM, Bendahara)",
        "Tab Organik: Data pegawai BPS lengkap",
        "Tambah, lihat, edit, dan hapus data dengan mudah",
        "Validasi NIP dan data pegawai otomatis",
        "Import data dari Excel dalam satu klik",
        "Export data ke Excel untuk backup",
        "Cari dan filter data dengan cepat",
      ],
      tips: [
        "Pastikan NIP valid (18 digit) sebelum input",
        "Update data saat ada mutasi pegawai",
        "Backup data sebelum melakukan perubahan besar",
        "Gunakan import Excel untuk input data massal",
      ],
    },
    {
      title: "Mitra Kepka",
      icon: UserCheck,
      url: "/mitra-kepka",
      description: "Kelola database Mitra Statistik (Kepka) BPS Kabupaten Majalengka secara terpusat.",
      features: [
        "Data lengkap mitra: NIK, nama, alamat, kontak",
        "Status aktif/non-aktif mitra dengan mudah",
        "Riwayat kegiatan yang pernah diikuti",
        "Total honor yang sudah diterima",
        "Sisa kuota SBML per mitra real-time",
        "Tambah, edit, hapus data mitra",
        "Import/export data mitra ke Excel",
      ],
      tips: [
        "Update status mitra secara berkala berdasarkan kinerja",
        "Cek sisa SBML sebelum menugaskan ke kegiatan baru",
        "Validasi data NIK mitra secara berkala",
        "Gunakan filter untuk mencari mitra spesifik",
      ],
      badge: "🤝 Mitra"
    },
    {
      title: "Download Raw Data",
      icon: Database,
      url: "/download-raw-data",
      description: "Unduh data mentah dari sistem untuk keperluan analisis lebih lanjut dan backup.",
      features: [
        "Download data SPK lengkap dengan semua field",
        "Download data mitra dan kegiatan",
        "Pilih periode data yang diinginkan",
        "Format output: Excel/CSV pilihan",
        "Data terstruktur untuk analisis",
        "Backup data otomatis",
      ],
      tips: [
        "Gunakan untuk backup data berkala setiap bulan",
        "Data mentah berguna untuk analisis khusus dan reporting",
        "Pilih format CSV untuk kompatibilitas dengan berbagai tools",
        "Simpan backup di lokasi aman",
      ],
      badge: "💾 Data"
    },
  ],
};

const tabConfig = [
  { value: "utama", label: "Utama", icon: LayoutDashboard, color: "text-blue-500", gradient: "from-blue-500 to-cyan-500" },
  { value: "spkBast", label: "SPK & BAST", icon: FileText, color: "text-emerald-500", gradient: "from-emerald-500 to-green-500" },
  { value: "eDokumen", label: "e-Dokumen", icon: Edit, color: "text-purple-500", gradient: "from-purple-500 to-pink-500" },
  { value: "karirKoordinasi", label: "Karir & Koordinasi", icon: CalendarDays, color: "text-amber-500", gradient: "from-amber-500 to-orange-500" },
  { value: "pengadaan", label: "Pengadaan", icon: ShoppingCart, color: "text-red-500", gradient: "from-red-500 to-rose-500" },
  { value: "lainnya", label: "Lainnya", icon: Package, color: "text-indigo-500", gradient: "from-indigo-500 to-violet-500" },
];

export default function Pedoman() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("utama");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const renderPedomanCard = (item: PedomanItem) => (
    <Card 
      key={item.title} 
      className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm overflow-hidden relative"
      onMouseEnter={() => setHoveredCard(item.title)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.badge?.includes("Unggulan") ? "from-yellow-500 to-orange-500" : "from-primary/70 to-primary"} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
      
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:from-primary/25 group-hover:to-primary/10 transition-all duration-300 shadow-md ${hoveredCard === item.title ? 'scale-110 rotate-3' : ''}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
                  {item.title}
                </CardTitle>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-semibold px-2 py-0.5 bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-primary/20"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              {item.accessInfo && (
                <Badge variant="outline" className="mt-1.5 text-xs border-primary/20 text-primary/80 bg-primary/5">
                  <Lock className="h-3 w-3 mr-1" />
                  {item.accessInfo}
                </Badge>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
        <CardDescription className="mt-3 text-sm leading-relaxed text-muted-foreground/80 line-clamp-2">
          {item.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-5 relative z-10">
        {/* Features Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              Fitur Utama
            </h4>
          </div>
          <ul className="space-y-2">
            {item.features.slice(0, 4).map((feature, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2 group/feature">
                <div className={`p-0.5 rounded-full mt-0.5 transition-all duration-300 ${hoveredCard === item.title ? 'scale-125' : ''}`}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <span className="leading-tight">{feature}</span>
              </li>
            ))}
            {item.features.length > 4 && (
              <li className="text-xs text-muted-foreground/60 italic pl-6">
                +{item.features.length - 4} fitur lainnya tersedia
              </li>
            )}
          </ul>
        </div>

        {/* Tips Section - Fixed alignment */}
        {item.tips && item.tips.length > 0 && (
          <div className="pt-4 border-t border-border/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                Tips & Rekomendasi
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-2 pl-6">
              {item.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground leading-tight flex-1">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full mt-4 group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
          onClick={() => navigate(item.url)}
        >
          <span className="font-medium">Buka Halaman</span>
          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      {/* Modern Header */}
      <div className="text-center space-y-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl opacity-50" />
        <div className="inline-flex items-center justify-center gap-4 mb-4 relative z-10">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10 shadow-lg">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <div className="text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Pedoman KECAP MAJA
            </h1>
            <p className="text-muted-foreground mt-2">
              Panduan lengkap untuk memaksimalkan penggunaan sistem
            </p>
          </div>
        </div>
        <p className="text-muted-foreground/70 max-w-3xl mx-auto text-sm md:text-base relative z-10">
          Jelajahi semua fitur KECAP MAJA dengan panduan step-by-step. Setiap tab menyediakan informasi detail untuk membantu Anda bekerja lebih efisien.
        </p>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-transparent pointer-events-none" />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-full flex flex-nowrap p-1.5 bg-gradient-to-b from-background/80 to-background/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-lg min-w-[900px] sm:min-w-0">
              {tabConfig.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className={`flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl transition-all duration-300 data-[state=active]:shadow-lg hover:bg-accent/50 ${activeTab === tab.value ? `bg-gradient-to-r ${tab.gradient} text-white border-0` : 'bg-transparent'}`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === tab.value ? 'bg-white/20' : 'bg-accent'}`}>
                    <tab.icon className={`h-5 w-5 ${activeTab === tab.value ? 'text-white' : tab.color}`} />
                  </div>
                  <span className="font-semibold whitespace-nowrap">{tab.label}</span>
                  {activeTab === tab.value && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-t-full" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Contents with improved visual feedback */}
          <div className="mt-8">
            {/* Utama Tab */}
            <TabsContent value="utama" className="mt-0 animate-in fade-in duration-500">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {pedomanData.utama.map(renderPedomanCard)}
              </div>
            </TabsContent>

            {/* SPK & BAST Tab */}
            <TabsContent value="spkBast" className="mt-0 animate-in fade-in duration-500">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {pedomanData.spkBast.map(renderPedomanCard)}
              </div>
            </TabsContent>

            {/* e-Dokumen Tab */}
            <TabsContent value="eDokumen" className="mt-0 animate-in fade-in duration-500">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {pedomanData.eDokumen.map(renderPedomanCard)}
              </div>
            </TabsContent>

            {/* Karir & Koordinasi Tab (Combined) */}
            <TabsContent value="karirKoordinasi" className="mt-0 animate-in fade-in duration-500">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {pedomanData.karirKoordinasi.map(renderPedomanCard)}
              </div>
            </TabsContent>

            {/* Pengadaan Tab */}
            <TabsContent value="pengadaan" className="mt-0 animate-in fade-in duration-500">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {pedomanData.pengadaan.map(renderPedomanCard)}
              </div>
            </TabsContent>

            {/* Lainnya Tab */}
            <TabsContent value="lainnya" className="mt-0 animate-in fade-in duration-500">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {pedomanData.lainnya.map(renderPedomanCard)}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modern Footer */}
      <div className="text-center pt-8 border-t border-border/50 relative">
        <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              Butuh bantuan lebih lanjut?
            </p>
            <p className="text-xs text-muted-foreground">
              Hubungi Tim IT BPS Kabupaten Majalengka untuk dukungan teknis
            </p>
          </div>
          <Button variant="ghost" size="sm" className="ml-4">
            Kontak
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>
        
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Aktif dan Terupdate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Dokumentasi Lengkap</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Tips Berguna</span>
          </div>
        </div>
      </div>
    </div>
  );
}