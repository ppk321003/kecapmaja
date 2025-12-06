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
} from "lucide-react";

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
      title: "Home",
      icon: Home,
      url: "/",
      description: "Halaman utama aplikasi KECAP MAJA yang menampilkan overview sistem dan fitur deteksi ulang tahun pegawai secara otomatis.",
      features: [
        "Hero banner dengan tagline aplikasi",
        "Deteksi otomatis ulang tahun pegawai berdasarkan NIP",
        "Dialog ucapan selamat ulang tahun yang interaktif",
        "Navigasi multi-pegawai jika ada lebih dari satu yang berulang tahun",
        "Perhitungan umur otomatis dari tanggal lahir",
        "Overview fitur-fitur utama KECAP MAJA",
        "Informasi manfaat penggunaan sistem",
      ],
      tips: [
        "Cek halaman Home setiap hari untuk melihat siapa yang berulang tahun",
        "Sistem akan menampilkan toast notification jika ada pegawai yang berulang tahun",
      ],
    },
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      url: "/dashboard",
      description: "Pusat visualisasi data statistik dengan berbagai jenis chart interaktif, filter dinamis, dan monitoring perjalanan dinas.",
      features: [
        "3 jenis visualisasi chart: Bar Chart, Pie Chart, dan Line Chart",
        "Filter data berdasarkan Fungsi, Bulan, dan Tahun",
        "Risk Assessment Mitra dengan kategori warna (hijau/kuning/merah)",
        "Dashboard Perjalanan Dinas (Perjadin) dengan statistik lengkap",
        "LK Kinerja untuk monitoring capaian",
        "Konversi Predikat otomatis",
        "Toggle switch untuk menampilkan/menyembunyikan komponen",
      ],
      tips: [
        "Gunakan filter untuk mempersempit data yang ditampilkan",
        "Perhatikan Risk Assessment untuk monitoring mitra yang mendekati batas SBML",
      ],
    },
    {
      title: "Block Tanggal",
      icon: Calendar,
      url: "/block-tanggal",
      description: "Pencatatan tanggal perjalanan dinas dengan sistem role-based access control untuk setiap fungsi.",
      features: [
        "Kalender interaktif untuk memilih tanggal perjalanan dinas",
        "Input maksimal 10 kegiatan per bulan per fungsi",
        "Role-based access: setiap fungsi hanya bisa input untuk fungsinya sendiri",
        "Validasi otomatis untuk mencegah duplikasi tanggal",
        "Integrasi dengan Google Sheets sebagai database",
        "View mode untuk melihat jadwal fungsi lain",
      ],
      tips: [
        "Pastikan memilih fungsi yang benar sebelum input tanggal",
        "Gunakan kalender untuk melihat ketersediaan tanggal",
      ],
      accessInfo: "Setiap fungsi hanya dapat mengedit jadwal miliknya sendiri",
    },
    {
      title: "Pengadaan",
      icon: ShoppingCart,
      url: "/pengadaan",
      description: "Sistem input dan monitoring pengadaan barang/jasa dengan tracking status dari usulan hingga selesai.",
      features: [
        "4 status pengadaan: Usulan → Proses → Kontrak → Selesai",
        "Form input pengadaan dengan field lengkap",
        "Filter data berdasarkan status dan periode",
        "Tracking progress pengadaan real-time",
        "Notifikasi untuk perubahan status",
        "Export data pengadaan",
      ],
      tips: [
        "Update status pengadaan secara berkala",
        "Gunakan filter untuk mencari pengadaan spesifik",
      ],
      accessInfo: "Akses khusus untuk PPK, Bendahara, dan Pejabat Pengadaan",
    },
  ],
  spkBast: [
    {
      title: "SPK dan BAST",
      icon: FileText,
      url: "/spk-bast",
      description: "Hub utama untuk mengelola Surat Perintah Kerja (SPK) dan Berita Acara Serah Terima (BAST) dengan 4 submenu utama.",
      features: [
        "Navigasi ke 4 submenu: Entri Target, Download SPK BAST, Rekap SPK, dan SBML Tahunan",
        "Card-based navigation dengan icon dan deskripsi",
        "Animasi hover yang interaktif",
        "Color-coded cards untuk identifikasi mudah",
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
      description: "Form input target kegiatan untuk pembuatan SPK dengan perhitungan honor otomatis dan validasi periode.",
      features: [
        "Form input detail kegiatan (nama kegiatan, periode, volume)",
        "Penambahan petugas organik dengan pilihan role",
        "Penambahan mitra dari database Mitra Kepka",
        "Perhitungan honor otomatis berdasarkan jenis pekerjaan",
        "Validasi periode SPK tidak boleh overlap",
        "Preview SPK sebelum submit",
        "Integrasi dengan database SBML untuk cek batas honor",
      ],
      tips: [
        "Pastikan periode tidak overlap dengan kegiatan lain",
        "Cek SBML mitra sebelum menambahkan ke kegiatan",
        "Isi semua field wajib sebelum submit",
      ],
    },
    {
      title: "Download SPK & BAST",
      icon: Download,
      url: "/spk-bast/download-spk-bast",
      description: "Halaman untuk mengunduh dokumen SPK dan BAST yang sudah dibuat dalam format siap cetak.",
      features: [
        "List semua dokumen SPK-BAST yang tersedia",
        "Filter berdasarkan periode, kegiatan, atau mitra",
        "Download langsung dalam format dokumen",
        "Preview dokumen sebelum download",
        "Batch download untuk multiple dokumen",
      ],
      tips: [
        "Gunakan filter untuk menemukan dokumen spesifik",
        "Cek preview sebelum print untuk memastikan data benar",
      ],
    },
    {
      title: "Rekap SPK",
      icon: ClipboardList,
      url: "/spk-bast/rekap-spk",
      description: "Rekapitulasi SPK per mitra dengan warning system jika mendekati atau melebihi batas SBML.",
      features: [
        "Rekap total honor per mitra",
        "Warning indicator jika mendekati batas SBML (kuning)",
        "Alert jika melebihi batas SBML (merah)",
        "Detail breakdown per jenis pekerjaan (pendataan, pemeriksaan, pengolahan)",
        "Filter berdasarkan periode dan fungsi",
        "Export rekap ke Excel",
      ],
      tips: [
        "Perhatikan warning kuning untuk mitra yang mendekati batas",
        "Gunakan export untuk pelaporan bulanan",
      ],
    },
    {
      title: "Cek SBML",
      icon: FileCheck,
      url: "/spk-bast/cek-sbml",
      description: "Pengecekan dan validasi Standar Biaya Masukan Lainnya untuk setiap mitra.",
      features: [
        "Cek sisa kuota SBML per mitra",
        "Histori penggunaan SBML per periode",
        "Proyeksi penggunaan sampai akhir tahun",
        "Alert system untuk mitra yang berpotensi melebihi batas",
        "Perbandingan dengan tahun sebelumnya",
      ],
      tips: [
        "Cek SBML sebelum membuat SPK baru untuk mitra",
        "Perhatikan proyeksi untuk perencanaan ke depan",
      ],
    },
    {
      title: "SBML Tahunan",
      icon: DollarSign,
      url: "/spk-bast/entri-sbml",
      description: "Pengelolaan data Standar Biaya Masukan Lainnya (SBML) per tahun anggaran dengan CRUD lengkap.",
      features: [
        "Input data SBML baru per tahun anggaran",
        "Edit data SBML yang sudah ada",
        "Hapus data SBML yang tidak terpakai",
        "Histori perubahan SBML",
        "Import data dari file Excel",
        "Validasi data sebelum simpan",
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
      description: "Pembuatan dokumen elektronik dengan 12 jenis template yang tersedia, form interaktif, dan output siap cetak.",
      features: [
        "12 jenis template dokumen tersedia:",
        "• Daftar Hadir - untuk kegiatan rapat/pelatihan",
        "• KAK (Kerangka Acuan Kerja) - dokumen perencanaan kegiatan",
        "• Kuitansi Perjalanan - bukti pengeluaran perjadin",
        "• Kuitansi Transport - bukti pengeluaran transportasi",
        "• SPJ Honor - Surat Pertanggungjawaban honor",
        "• Surat Keputusan - SK resmi",
        "• Surat Pernyataan - berbagai jenis surat pernyataan",
        "• Tanda Terima - bukti serah terima barang/dokumen",
        "• Transport Lokal - dokumen transport dalam kota",
        "• Uang Harian & Transport - dokumen perjadin",
        "• Lembur & Laporan - dokumen lembur pegawai",
        "• Dokumen Pengadaan - kelengkapan pengadaan",
        "Form interaktif dengan validasi",
        "Preview dokumen sebelum generate",
        "Output dalam format siap cetak",
      ],
      tips: [
        "Pilih template yang sesuai dengan kebutuhan",
        "Isi semua field wajib dengan benar",
        "Preview dokumen sebelum print",
      ],
    },
    {
      title: "Download e-Dokumen",
      icon: Download,
      url: "/e-dokumen/download",
      description: "Pusat pengunduhan dokumen elektronik yang sudah dibuat dengan navigasi tab per jenis dokumen.",
      features: [
        "Tab navigation per jenis dokumen",
        "Pencarian dokumen berdasarkan nama/tanggal",
        "Pagination untuk dokumen yang banyak",
        "Link download langsung",
        "Filter berdasarkan periode pembuatan",
        "Batch download untuk multiple dokumen",
      ],
      tips: [
        "Gunakan tab untuk navigasi cepat ke jenis dokumen",
        "Manfaatkan fitur pencarian untuk dokumen spesifik",
      ],
    },
    {
      title: "Daftar Hadir",
      icon: Users,
      url: "/e-dokumen/daftar-hadir",
      description: "Template pembuatan daftar hadir untuk berbagai kegiatan seperti rapat, pelatihan, dan sosialisasi.",
      features: [
        "Input nama kegiatan dan tanggal pelaksanaan",
        "Tambah peserta dari database pegawai",
        "Input peserta manual untuk eksternal",
        "Kolom tanda tangan yang customizable",
        "Export ke format PDF/Excel",
      ],
    },
    {
      title: "KAK",
      icon: FileText,
      url: "/e-dokumen/kak",
      description: "Template Kerangka Acuan Kerja untuk perencanaan kegiatan dengan format standar.",
      features: [
        "Template KAK sesuai format BPS",
        "Input latar belakang dan tujuan kegiatan",
        "Rincian jadwal pelaksanaan",
        "Estimasi anggaran otomatis",
        "Output siap approval",
      ],
    },
    {
      title: "Kuitansi",
      icon: Receipt,
      url: "/e-dokumen/kuitansi-perjalanan",
      description: "Template kuitansi untuk berbagai keperluan pertanggungjawaban keuangan.",
      features: [
        "Kuitansi perjalanan dinas",
        "Kuitansi transport",
        "Nomor kuitansi otomatis",
        "Terbilang otomatis",
        "Format standar keuangan",
      ],
    },
    {
      title: "SPJ Honor",
      icon: HandCoins,
      url: "/e-dokumen/spj-honor",
      description: "Surat Pertanggungjawaban Honor untuk pembayaran honor kegiatan.",
      features: [
        "Link dengan data SPK yang sudah dibuat",
        "Perhitungan pajak otomatis",
        "Rekap per kegiatan",
        "Format SPJ standar",
      ],
    },
  ],
  lainnya: [
    {
      title: "Kecap to Bendahara",
      icon: Banknote,
      url: "/aki-to-bendahara",
      description: "Rekap honor untuk bendahara dengan filter dinamis dan export ke Excel.",
      features: [
        "Rekap honor per periode",
        "Filter berdasarkan fungsi, kegiatan, dan bulan",
        "Perhitungan total honor dan pajak",
        "Export ke format Excel",
        "Preview data sebelum export",
        "Grouping berdasarkan kegiatan/mitra",
      ],
      tips: [
        "Gunakan filter untuk mempersempit data",
        "Export secara berkala untuk backup",
      ],
      accessInfo: "Akses role-based untuk Bendahara dan Admin",
    },
    {
      title: "Entri Pengelola",
      icon: Users,
      url: "/entri-pengelola",
      description: "Pengelolaan data Pengelola Anggaran (Padamel-3210) dan Pegawai Organik BPS dengan CRUD lengkap.",
      features: [
        "Tab Padamel-3210: Data pengelola anggaran (PPK, PPSPM, Bendahara)",
        "Tab Organik: Data pegawai organik BPS",
        "CRUD lengkap (Create, Read, Update, Delete)",
        "Validasi NIP dan data pegawai",
        "Import data dari Excel",
        "Export data ke Excel",
        "Pencarian dan filter data",
      ],
      tips: [
        "Pastikan NIP valid 18 digit",
        "Update data saat ada mutasi pegawai",
      ],
    },
    {
      title: "Mitra Kepka",
      icon: UserCheck,
      url: "/mitra-kepka",
      description: "Pengelolaan database Mitra Statistik (Kepka) dengan informasi lengkap dan tracking honor.",
      features: [
        "Data lengkap mitra: NIK, nama, alamat, kontak",
        "Status aktif/non-aktif mitra",
        "Histori kegiatan yang pernah diikuti",
        "Total honor yang sudah diterima",
        "Sisa kuota SBML per mitra",
        "CRUD lengkap dengan validasi",
        "Import/export data mitra",
      ],
      tips: [
        "Update status mitra secara berkala",
        "Cek sisa SBML sebelum assign ke kegiatan baru",
      ],
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
    {
      title: "Download Raw Data",
      icon: Database,
      url: "/download-raw-data",
      description: "Halaman untuk mengunduh data mentah dari sistem untuk keperluan analisis lebih lanjut.",
      features: [
        "Download data SPK dalam format raw",
        "Download data mitra",
        "Download data kegiatan",
        "Pilih periode data yang diunduh",
        "Format output: Excel/CSV",
      ],
      tips: [
        "Gunakan untuk backup data periodik",
        "Data raw berguna untuk analisis custom",
      ],
    },
  ],
};

const tabConfig = [
  { value: "utama", label: "Utama", icon: Home, color: "text-blue-500" },
  { value: "spkBast", label: "SPK & BAST", icon: FileText, color: "text-emerald-500" },
  { value: "eDokumen", label: "e-Dokumen", icon: Edit, color: "text-purple-500" },
  { value: "lainnya", label: "Lainnya", icon: Package, color: "text-amber-500" },
];

export default function Pedoman() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("utama");

  const renderPedomanCard = (item: PedomanItem) => (
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
              {item.accessInfo && (
                <Badge variant="outline" className="mt-1 text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  {item.accessInfo}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardDescription className="mt-3 text-sm leading-relaxed">
          {item.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Fitur Utama
          </h4>
          <ul className="space-y-1.5">
            {item.features.slice(0, 6).map((feature, idx) => (
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
            <ul className="space-y-1">
              {item.tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>{tip}</span>
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
        <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto mb-6">
          {tabConfig.map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="utama" className="mt-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 pr-4">
              {pedomanData.utama.map(renderPedomanCard)}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="spkBast" className="mt-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 pr-4">
              {pedomanData.spkBast.map(renderPedomanCard)}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="eDokumen" className="mt-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 pr-4">
              {pedomanData.eDokumen.map(renderPedomanCard)}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="lainnya" className="mt-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 pr-4">
              {pedomanData.lainnya.map(renderPedomanCard)}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="text-center pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          Butuh bantuan lebih lanjut? Hubungi Tim IT BPS Kota Majalengka
        </p>
      </div>
    </div>
  );
}
