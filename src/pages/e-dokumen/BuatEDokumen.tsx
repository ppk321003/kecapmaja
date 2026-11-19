import {
  Banknote,
  Bike,
  Briefcase,
  Car,
  ChevronRight,
  Clock,
  FileCheck,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Receipt,
  Users,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BuatEDokumen() {
  const navigate = useNavigate();

  const eDokumenMenuItems = [
    { title: "Daftar Hadir (Tabel Rekap)", url: "/e-dokumen/daftar-hadir", icon: Users, description: "Buat daftar hadir kegiatan dalam format tabel rekap" },
    { title: "Dokumen Pengadaan", url: "/e-dokumen/dokumen-pengadaan", icon: Briefcase, description: "Buat dokumen pengadaan barang dan jasa" },
    { title: "Generate SPJ Honor Mitra", url: "/e-dokumen/generate-spj-honor-mitra", icon: Zap, description: "Generate SPJ honor mitra secara otomatis hasil entri dari SPK dan BAST", bosNotice: true },
    { title: "Kerangka Acuan Kerja (KAK)", url: "/e-dokumen/kak", icon: FileText, description: "Buat Kerangka Acuan Kerja / Spesifikasi Teknis kegiatan" },
    { title: "Kuitansi Perjalanan Dinas", url: "/e-dokumen/kuitansi-perjalanan", icon: Car, description: "Kuitansi Perjalanan Dinas Luar Kota / Dalam Kota > 8 Jam", bosNotice: true },
    { title: "Kuitansi Transport Lokal", url: "/e-dokumen/kuitansi-transport", icon: Bike, description: "Buat kuitansi transport lokal", bosNotice: true },
    { title: "Lembur & Laporan", url: "/e-dokumen/lembur-laporan", icon: Clock, description: "Buat dokumen lembur dan laporan" },
    { title: "SPJ Honor (Tabel Rekap)", url: "/e-dokumen/spj-honor", icon: FileSpreadsheet, description: "Buat SPJ Honor dalam format tabel rekap", bosNotice: true },
    { title: "Surat Keputusan", url: "/e-dokumen/surat-keputusan", icon: FileCheck, description: "Buat Surat Keputusan" },
    { title: "Surat Pernyataan", url: "/e-dokumen/surat-pernyataan", icon: FileSignature, description: "Buat Surat Pernyataan" },
    { title: "Tanda Terima (Tabel Rekap)", url: "/e-dokumen/tanda-terima", icon: Receipt, description: "Buat tanda terima dalam format tabel rekap" },
    { title: "Transport Lokal (Tabel Rekap)", url: "/e-dokumen/transport-lokal", icon: Bike, description: "Buat transport lokal dalam format tabel rekap", bosNotice: true },
    { title: "Uang Harian dan Transport Lokal (Tabel Rekap)", url: "/e-dokumen/uang-harian-transport", icon: Banknote, description: "Buat uang harian dan transport lokal dalam format tabel rekap", bosNotice: true },
  ];

  return (
    <main className="min-h-screen w-full bg-background pb-16 pt-6">
      <header className="mb-8 w-full">
        <h1 className="text-3xl font-bold tracking-tight text-red-500 sm:text-4xl">
          Buat e-Dokumen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pilih jenis dokumen yang ingin Anda buat. Semua template telah disesuaikan dengan standar formal pemerintahan.
        </p>
      </header>

      <ul className="w-full divide-y divide-border">
        {eDokumenMenuItems.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.url}>
              <button
                type="button"
                onClick={() => navigate(item.url)}
                className="group flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{item.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
                  {item.bosNotice && (
                    <span className="mt-1 block text-sm font-bold text-blue-700 dark:text-blue-400 sm:hidden">
                      Utamakan menggunakan aplikasi BOS / Gunakan jika BOS sedang bermasalah
                    </span>
                  )}
                </span>
                {item.bosNotice && (
                  <span className="hidden shrink-0 rounded-md bg-blue-50 px-4 py-2 text-right text-sm font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 sm:block">
                    Utamakan menggunakan aplikasi BOS / Gunakan jika BOS sedang bermasalah
                  </span>
                )}
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
