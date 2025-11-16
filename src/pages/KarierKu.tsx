import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowLeft, User, TrendingUp, Calendar, Award, FileText, LogIn, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Clock, ExternalLink } from 'lucide-react';

// ==================== TYPES ====================
interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  akKumulatif: number;
  status: 'Aktif' | 'Pensiun' | 'Mutasi';
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  agama: string;
  email: string;
  telepon: string;
  alamat: string;
  linkSkJabatan?: string;
  linkSkPangkat?: string;
}

interface EstimasiKenaikan {
  kebutuhanAKPangkat: number;
  kebutuhanAKJabatan: number;
  kekuranganAKPangkat: number;
  kekuranganAKJabatan: number;
  predikatAsumsi: number;
  bulanDibutuhkanPangkat: number;
  bulanDibutuhkanJabatan: number;
  estimasiTanggalPangkat: string;
  estimasiTanggalJabatan: string;
  bisaUsulPangkat: boolean;
  bisaUsulJabatan: boolean;
  golonganBerikutnya: string;
  jabatanBerikutnya: string;
  akPerBulan: number;
  akRealSaatIni: number;
  akTambahan: number;
  isKenaikanJenjang: boolean;
  progressPangkatBulan: number;
  progressPangkatPersentase: number;
}

// ==================== GOOGLE SHEETS CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "data";

// ==================== UTILITIES - SESUAI PERATURAN BKN ====================
class AngkaKreditCalculator {
  static tentukanKategori(jabatan: string): 'Keahlian' | 'Keterampilan' | 'Reguler' {
    const jabatanLower = jabatan.toLowerCase();
    
    if (jabatanLower.includes('ahli')) {
      return 'Keahlian';
    }
    
    if (jabatanLower.includes('terampil') || 
        jabatanLower.includes('mahir') || 
        jabatanLower.includes('penyelia')) {
      return 'Keterampilan';
    }
    
    return 'Reguler';
  }

  static getKoefisien(jabatan: string): number {
    const koefisienMap: { [key: string]: number } = {
      'Ahli Pertama': 12.5,
      'Ahli Muda': 25.0,
      'Ahli Madya': 37.5,
      'Ahli Utama': 50.0,
      'Terampil': 8.0,
      'Mahir': 12.5,
      'Penyelia': 25.0,
      'Fungsional Umum': 5.0
    };
    for (const [key, value] of Object.entries(koefisienMap)) {
      if (jabatan.includes(key)) return value;
    }
    if (jabatan.includes('Ahli')) return 12.5;
    if (jabatan.includes('Penyelia')) return 25.0;
    if (jabatan.includes('Mahir')) return 12.5;
    if (jabatan.includes('Terampil')) return 8.0;
    return 12.5;
  }

  static hitungAKTambahan(karyawan: Karyawan, predikatAsumsi: number = 1.00): number {
    // Untuk kategori Reguler, tidak ada AK tambahan untuk jabatan
    if (karyawan.kategori === 'Reguler') return 0;
    
    const tmtJabatan = new Date(karyawan.tmtJabatan);
    const hariIni = new Date();
    if (tmtJabatan > hariIni) return 0;
    const selisihBulan = this.hitungSelisihBulan(tmtJabatan, hariIni);
    if (selisihBulan <= 0) return 0;
    const koefisien = this.getKoefisien(karyawan.jabatan);
    const akPerBulan = predikatAsumsi * koefisien / 12;
    const akTambahan = selisihBulan * akPerBulan;
    return Number(akTambahan.toFixed(2));
  }

  static hitungAKRealSaatIni(karyawan: Karyawan, predikatAsumsi: number = 1.00): number {
    const akTambahan = this.hitungAKTambahan(karyawan, predikatAsumsi);
    const akReal = karyawan.akKumulatif + akTambahan;
    return Number(akReal.toFixed(2));
  }

  static hitungSelisihBulan(tanggalAwal: Date, tanggalAkhir: Date): number {
    const tahunAwal = tanggalAwal.getFullYear();
    const bulanAwal = tanggalAwal.getMonth();
    const tahunAkhir = tanggalAkhir.getFullYear();
    const bulanAkhir = tanggalAkhir.getMonth();
    return (tahunAkhir - tahunAwal) * 12 + (bulanAkhir - bulanAwal);
  }

  static getKebutuhanPangkat(golonganSekarang: string, kategori: string): number {
    if (kategori === 'Reguler') return 0; // Untuk Reguler, tidak ada kebutuhan AK untuk pangkat
    
    const kebutuhanKeahlian: { [key: string]: number } = {
      'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100,
      'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200
    };
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'II/a': 15, 'II/b': 20, 'II/c': 20, 'II/d': 20,
      'III/a': 50, 'III/b': 50, 'III/c': 100
    };
    const kebutuhan = kategori === 'Keahlian' ? kebutuhanKeahlian : kebutuhanKeterampilan;
    return kebutuhan[golonganSekarang] || 0;
  }

  static getKebutuhanJabatan(jabatanSekarang: string, kategori: string): number {
    if (kategori === 'Reguler') return 0; // Untuk Reguler, tidak ada kebutuhan AK untuk jabatan
    
    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100, 'Ahli Muda': 200, 'Ahli Madya': 450, 'Ahli Utama': 0
    };
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Terampil': 60, 'Mahir': 100, 'Penyelia': 0
    };
    if (kategori === 'Keahlian') {
      for (const [key, value] of Object.entries(kebutuhanKeahlian)) {
        if (jabatanSekarang.includes(key)) return value;
      }
    } else {
      for (const [key, value] of Object.entries(kebutuhanKeterampilan)) {
        if (jabatanSekarang.includes(key)) return value;
      }
    }
    return 0;
  }

  static isKenaikanJenjang(jabatanSekarang: string, jabatanBerikutnya: string, golonganSekarang: string, golonganBerikutnya: string): boolean {
    const titikJenjang = [
      { dari: 'Ahli Pertama', ke: 'Ahli Muda', golDari: 'III/b', golKe: 'III/c' },
      { dari: 'Ahli Muda', ke: 'Ahli Madya', golDari: 'III/d', golKe: 'IV/a' },
      { dari: 'Ahli Madya', ke: 'Ahli Utama', golDari: 'IV/c', golKe: 'IV/d' },
      { dari: 'Terampil', ke: 'Mahir', golDari: 'II/d', golKe: 'III/a' },
      { dari: 'Mahir', ke: 'Penyelia', golDari: 'III/b', golKe: 'III/c' }
    ];
    return titikJenjang.some(titik => 
      jabatanSekarang.includes(titik.dari) && 
      jabatanBerikutnya.includes(titik.ke) && 
      golonganSekarang === titik.golDari && 
      golonganBerikutnya === titik.golKe
    );
  }

  static hitungProgressPangkatReguler(tmtPangkat: string): { bulan: number; persentase: number } {
    const tmt = new Date(tmtPangkat);
    const sekarang = new Date();
    const selisihBulan = this.hitungSelisihBulan(tmt, sekarang);
    const persentase = Math.min((selisihBulan / 48) * 100, 100);
    return { bulan: selisihBulan, persentase };
  }

  static cekSyaratPendidikan(golonganSekarang: string, pendidikan: string): boolean {
    const pendidikanLower = pendidikan.toLowerCase();
    const punyaS2 = pendidikanLower.includes('s-2') || pendidikanLower.includes('s2') || pendidikanLower.includes('magister');
    const punyaS3 = pendidikanLower.includes('s-3') || pendidikanLower.includes('s3') || pendidikanLower.includes('doktor');
    
    // Untuk golongan di bawah III/D, tidak ada requirement pendidikan khusus
    if (!golonganSekarang.startsWith('IV/') && golonganSekarang !== 'III/d') {
      return true;
    }
    
    if (golonganSekarang === 'IV/d') {
      return punyaS3; // IV/D → IV/E wajib S3
    }
    
    // III/D dan IV/A-IV/C wajib S2
    return punyaS2;
  }

  static bisaNaikPangkatReguler(golonganSekarang: string, pendidikan: string, progressBulan: number): boolean {
    const masaKerjaCukup = progressBulan >= 48;
    const pendidikanCukup = this.cekSyaratPendidikan(golonganSekarang, pendidikan);
    return masaKerjaCukup && pendidikanCukup;
  }

  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi: number = 1.00): EstimasiKenaikan {
    // Untuk kategori Reguler, perhitungan khusus
    if (karyawan.kategori === 'Reguler') {
      const progressPangkat = this.hitungProgressPangkatReguler(karyawan.tmtPangkat);
      const bisaUsulPangkat = this.bisaNaikPangkatReguler(karyawan.golongan, karyawan.pendidikan, progressPangkat.bulan);
      
      return {
        kebutuhanAKPangkat: 0,
        kebutuhanAKJabatan: 0,
        kekuranganAKPangkat: 0,
        kekuranganAKJabatan: 0,
        predikatAsumsi,
        bulanDibutuhkanPangkat: Math.max(0, 48 - progressPangkat.bulan),
        bulanDibutuhkanJabatan: 0,
        estimasiTanggalPangkat: bisaUsulPangkat ? 'Sekarang' : 'Tidak berlaku',
        estimasiTanggalJabatan: 'Tidak berlaku',
        bisaUsulPangkat,
        bisaUsulJabatan: false,
        golonganBerikutnya: this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori),
        jabatanBerikutnya: 'Tidak berlaku',
        akPerBulan: 0,
        akRealSaatIni: karyawan.akKumulatif,
        akTambahan: 0,
        isKenaikanJenjang: false,
        progressPangkatBulan: progressPangkat.bulan,
        progressPangkatPersentase: progressPangkat.persentase
      };
    }

    // Logika original untuk Keahlian dan Keterampilan
    const golonganBerikutnya = this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jabatanBerikutnya = this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
    const isKenaikanJenjang = this.isKenaikanJenjang(karyawan.jabatan, jabatanBerikutnya, karyawan.golongan, golonganBerikutnya);
    
    let kebutuhanPangkat = this.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJabatan = this.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    
    if (isKenaikanJenjang) {
      kebutuhanPangkat = kebutuhanJabatan;
    }

    const akTambahan = this.hitungAKTambahan(karyawan, predikatAsumsi);
    const akRealSaatIni = this.hitungAKRealSaatIni(karyawan, predikatAsumsi);
    const kekuranganPangkat = Math.max(0, kebutuhanPangkat - akRealSaatIni);
    const kekuranganJabatan = Math.max(0, kebutuhanJabatan - akRealSaatIni);

    const koefisien = this.getKoefisien(karyawan.jabatan);
    const akPerBulan = predikatAsumsi * koefisien / 12;

    const bulanDibutuhkanPangkat = kekuranganPangkat <= 0 ? 0 : akPerBulan > 0 ? Math.ceil(kekuranganPangkat / akPerBulan) : 0;
    const bulanDibutuhkanJabatan = kekuranganJabatan <= 0 ? 0 : akPerBulan > 0 ? Math.ceil(kekuranganJabatan / akPerBulan) : 0;

    const sekarang = new Date();
    const estimasiTanggalPangkat = new Date(sekarang);
    estimasiTanggalPangkat.setMonth(sekarang.getMonth() + bulanDibutuhkanPangkat);
    const estimasiTanggalJabatan = new Date(sekarang);
    estimasiTanggalJabatan.setMonth(sekarang.getMonth() + bulanDibutuhkanJabatan);

    const bisaUsulJabatan = akRealSaatIni >= kebutuhanJabatan && kebutuhanJabatan > 0;
    const bisaUsulPangkat = akRealSaatIni >= kebutuhanPangkat && kebutuhanPangkat > 0;

    return {
      kebutuhanAKPangkat: kebutuhanPangkat,
      kebutuhanAKJabatan: kebutuhanJabatan,
      kekuranganAKPangkat: kekuranganPangkat,
      kekuranganAKJabatan: kekuranganJabatan,
      predikatAsumsi,
      bulanDibutuhkanPangkat,
      bulanDibutuhkanJabatan,
      estimasiTanggalPangkat: estimasiTanggalPangkat.toLocaleDateString('id-ID'),
      estimasiTanggalJabatan: estimasiTanggalJabatan.toLocaleDateString('id-ID'),
      bisaUsulPangkat,
      bisaUsulJabatan,
      golonganBerikutnya,
      jabatanBerikutnya,
      akPerBulan: Number(akPerBulan.toFixed(2)),
      akRealSaatIni,
      akTambahan,
      isKenaikanJenjang,
      progressPangkatBulan: 0,
      progressPangkatPersentase: 0
    };
  }

  static getGolonganBerikutnya(golonganSekarang: string, kategori: string): string {
    if (kategori === 'Reguler') {
      const progressionReguler: { [key: string]: string } = {
        'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a',
        'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
      };
      return progressionReguler[golonganSekarang] || 'Tidak Ada';
    }
    
    const progressionKeahlian: { [key: string]: string } = {
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a',
      'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
    };
    const progressionKeterampilan: { [key: string]: string } = {
      'II/a': 'II/b', 'II/b': 'II/c', 'II/c': 'II/d', 'II/d': 'III/a',
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d'
    };
    const progression = kategori === 'Keahlian' ? progressionKeahlian : progressionKeterampilan;
    return progression[golonganSekarang] || 'Tidak Ada';
  }

  static getJabatanBerikutnya(jabatanSekarang: string, kategori: string): string {
    if (kategori === 'Reguler') return 'Tidak berlaku';
    
    const progressionKeahlian: { [key: string]: string } = {
      'Ahli Pertama': 'Ahli Muda', 'Ahli Muda': 'Ahli Madya', 'Ahli Madya': 'Ahli Utama', 'Ahli Utama': 'Tidak Ada'
    };
    const progressionKeterampilan: { [key: string]: string } = {
      'Terampil': 'Mahir', 'Mahir': 'Penyelia', 'Penyelia': 'Tidak Ada'
    };
    if (kategori === 'Keahlian') {
      for (const [key, value] of Object.entries(progressionKeahlian)) {
        if (jabatanSekarang.includes(key)) return value;
      }
    } else {
      for (const [key, value] of Object.entries(progressionKeterampilan)) {
        if (jabatanSekarang.includes(key)) return value;
      }
    }
    return 'Tidak Diketahui';
  }

  static getPenjelasanKebutuhan(jabatanSekarang: string, kategori: string, isKenaikanJenjang: boolean, golonganSekarang: string, golonganBerikutnya: string): string {
    if (kategori === 'Reguler') {
      return "Jabatan struktural - kenaikan berdasarkan masa kerja 4 tahun";
    }
    
    if (isKenaikanJenjang) {
      if (kategori === 'Keahlian') {
        if (jabatanSekarang.includes('Pertama') && golonganSekarang === 'III/b') {
          return "Kenaikan jenjang butuh 100 AK kumulatif untuk naik ke Ahli Muda. Anda dapat mengusulkan kenaikan jabatan kemudian kenaikan pangkat.";
        } else if (jabatanSekarang.includes('Muda') && golonganSekarang === 'III/d') {
          return "Kenaikan jenjang butuh 200 AK kumulatif untuk naik ke Ahli Madya. Anda dapat mengusulkan kenaikan jabatan kemudian kenaikan pangkat.";
        } else if (jabatanSekarang.includes('Madya') && golonganSekarang === 'IV/c') {
          return "Kenaikan jenjang butuh 450 AK kumulatif untuk naik ke Ahli Utama. Anda dapat mengusulkan kenaikan jabatan kemudian kenaikan pangkat.";
        }
      } else {
        if (jabatanSekarang.includes('Terampil') && golonganSekarang === 'II/d') {
          return "Kenaikan jenjang butuh 60 AK kumulatif untuk naik ke Mahir. Anda dapat mengusulkan kenaikan jabatan kemudian kenaikan pangkat.";
        } else if (jabatanSekarang.includes('Mahir') && golonganSekarang === 'III/b') {
          return "Kenaikan jenjang butuh 100 AK kumulatif untuk naik ke Penyelia. Anda dapat mengusulkan kenaikan jabatan kemudian kenaikan pangkat.";
        }
      }
    }
    return '';
  }

  static getTingkatPendidikan(pendidikan: string): string {
    const pendLower = pendidikan.toLowerCase();
    
    if (pendLower.includes('s-3') || pendLower.includes('s3') || pendLower.includes('doktor')) return 'S3';
    if (pendLower.includes('s-2') || pendLower.includes('s2') || pendLower.includes('magister')) return 'S2';
    if (pendLower.includes('s-1') || pendLower.includes('s1') || pendLower.includes('sarjana')) return 'S1';
    if (pendLower.includes('d-iv') || pendLower.includes('div') || pendLower.includes('d4')) return 'D4';
    if (pendLower.includes('d-iii') || pendLower.includes('diii') || pendLower.includes('d3')) return 'D3';
    if (pendLower.includes('sma') || pendLower.includes('smk') || pendLower.includes('paket c')) return 'SMA';
    
    return 'Tidak Diketahui';
  }

  static cukupUntukAlihJalur(pendidikan: string): boolean {
    const tingkat = this.getTingkatPendidikan(pendidikan);
    return ['D4', 'S1', 'S2', 'S3'].includes(tingkat);
  }

  static getRekomendasiKarir(karyawan: Karyawan): string {
    const tingkatPendidikan = this.getTingkatPendidikan(karyawan.pendidikan);
    
    if (karyawan.kategori === 'Reguler') {
      if (karyawan.golongan === 'III/d' && !this.cekSyaratPendidikan('III/d', karyawan.pendidikan)) {
        return "Untuk kenaikan ke pangkat/golongan IV, Anda membutuhkan pendidikan S2. Dengan S2, Anda juga dapat mempertimbangkan beralih ke jalur Fungsional Keahlian.";
      }
      
      if (karyawan.golongan.startsWith('IV/') && !this.cekSyaratPendidikan(karyawan.golongan, karyawan.pendidikan)) {
        return "Kenaikan pangkat/golongan Anda terhambat karena persyaratan pendidikan. Segera rencanakan studi S2/S3 untuk membuka peluang kenaikan ke pangkat/golongan berikutnya.";
      }
      
      if (tingkatPendidikan === 'SMA') {
        return "Meningkatkan pendidikan ke D-IV/S-1 akan membuka ruang perkembangan karier yang lebih luas sekaligus memberikan kesempatan untuk mengajukan alih jalur ke Keahlian.";
      }
    }
    
    if (karyawan.kategori === 'Keterampilan') {
      if (karyawan.golongan === 'III/d') {
        if (this.cukupUntukAlihJalur(karyawan.pendidikan)) {
          return "Dengan pendidikan D-IV/S1 yang Anda miliki, Anda telah memenuhi syarat untuk alih jalur ke Keahlian, yang dapat menjadi langkah strategis untuk mencapai jenjang karier yang lebih tinggi.";
        } else {
          return "Anda telah mencapai puncak karir jalur Keterampilan. Dengan melanjutkan pendidikan ke D-IV/S1, Anda dapat beralih ke jalur Keahlian untuk pengembangan karir yang lebih luas.";
        }
      }
      
      if (!this.cukupUntukAlihJalur(karyawan.pendidikan)) {
        return "Untuk ekspansi karir jangka panjang, pertimbangkan meningkatkan pendidikan ke D-IV/S1 agar dapat beralih ke jalur Keahlian yang memiliki jenjang karir lebih tinggi.";
      }
    }
    
    if (karyawan.kategori === 'Keahlian') {
      const jabatanBerikutnya = this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
      if (jabatanBerikutnya === 'Tidak Ada') {
        return "Anda telah mencapai jenjang karir tertinggi di jalur Keahlian. Pertahankan kinerja dan berkontribusi sebagai mentor.";
      }
      
      if (tingkatPendidikan === 'D4' || tingkatPendidikan === 'S1') {
        return "Peningkatan kompetensi dan Pendidikan akan memperluas kesempatan Anda untuk mencapai jenjang karier yang lebih tinggi.";
      }
    }
    
    return "Terus tingkatkan kompetensi untuk menunjang perkembangan karier Anda secara optimal, sekaligus menjadi teladan bagi rekan kerja serta mampu berperan sebagai pembimbing atau mentor bagi yang lain.";
  }
}

// ==================== DASHBOARD COMPONENT ====================
const DashboardKarierKu: React.FC<{
  karyawanList: Karyawan[];
  onSelectKaryawan: (karyawan: Karyawan) => void;
}> = ({ karyawanList, onSelectKaryawan }) => {
  const getKaryawanWithEstimasi = (karyawan: Karyawan) => {
    const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
    return { ...karyawan, estimasi };
  };

  const karyawanWithEstimasi = karyawanList.map(getKaryawanWithEstimasi);
  const sudahMemenuhiPangkat = karyawanWithEstimasi.filter(k => k.estimasi.bisaUsulPangkat);
  const sudahMemenuhiJabatan = karyawanWithEstimasi.filter(k => k.estimasi.bisaUsulJabatan);
  const akan6BulanPangkat = karyawanWithEstimasi.filter(k => !k.estimasi.bisaUsulPangkat && k.estimasi.bulanDibutuhkanPangkat > 0 && k.estimasi.bulanDibutuhkanPangkat <= 6);
  const akan6BulanJabatan = karyawanWithEstimasi.filter(k => !k.estimasi.bisaUsulJabatan && k.estimasi.bulanDibutuhkanJabatan > 0 && k.estimasi.bulanDibutuhkanJabatan <= 6);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Dashboard Kenaikan Karir</CardTitle>
          <CardDescription>Ringkasan status kenaikan pangkat dan jabatan pegawai</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Memenuhi Syarat Pangkat</p>
                    <p className="text-3xl font-bold text-green-900">{sudahMemenuhiPangkat.length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Memenuhi Syarat Jabatan</p>
                    <p className="text-3xl font-bold text-blue-900">{sudahMemenuhiJabatan.length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Estimasi ≤ 6 Bulan (Pangkat)</p>
                    <p className="text-3xl font-bold text-yellow-900">{akan6BulanPangkat.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">Estimasi ≤ 6 Bulan (Jabatan)</p>
                    <p className="text-3xl font-bold text-orange-900">{akan6BulanJabatan.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sky-600">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Pegawai yang Sudah Memenuhi Syarat Kenaikan Pangkat
          </CardTitle>
          <CardDescription>Daftar pegawai yang telah memenuhi persyaratan angka kredit untuk kenaikan pangkat</CardDescription>
        </CardHeader>
        <CardContent>
          {sudahMemenuhiPangkat.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              Belum ada pegawai yang memenuhi syarat kenaikan pangkat
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Pangkat Saat Ini</TableHead>
                  <TableHead>Pangkat Berikutnya</TableHead>
                  <TableHead className="text-right">AK Saat Ini</TableHead>
                  <TableHead className="text-right">Kebutuhan AK</TableHead>
                  <TableHead className="text-center">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sudahMemenuhiPangkat.map((k, idx) => <TableRow key={k.nip}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{k.nama}</TableCell>
                    <TableCell><code className="text-xs">{k.nip}</code></TableCell>
                    <TableCell><Badge variant="outline">{k.golongan}</Badge></TableCell>
                    <TableCell><Badge>{k.estimasi.golonganBerikutnya}</Badge></TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{k.estimasi.akRealSaatIni.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{k.estimasi.kebutuhanAKPangkat}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => onSelectKaryawan(k)}>
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sky-600">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Pegawai yang Sudah Memenuhi Syarat Kenaikan Jabatan
          </CardTitle>
          <CardDescription>Daftar pegawai yang telah memenuhi persyaratan angka kredit untuk kenaikan jabatan</CardDescription>
        </CardHeader>
        <CardContent>
          {sudahMemenuhiJabatan.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              Belum ada pegawai yang memenuhi syarat kenaikan jabatan
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Jabatan Saat Ini</TableHead>
                  <TableHead>Jabatan Berikutnya</TableHead>
                  <TableHead className="text-right">AK Saat Ini</TableHead>
                  <TableHead className="text-right">Kebutuhan AK</TableHead>
                  <TableHead className="text-center">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sudahMemenuhiJabatan.map((k, idx) => <TableRow key={k.nip}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{k.nama}</TableCell>
                    <TableCell><code className="text-xs">{k.nip}</code></TableCell>
                    <TableCell className="text-sm">{k.jabatan}</TableCell>
                    <TableCell className="text-sm font-semibold">{k.estimasi.jabatanBerikutnya}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">{k.estimasi.akRealSaatIni.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{k.estimasi.kebutuhanAKJabatan}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => onSelectKaryawan(k)}>
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sky-600">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pegawai yang Akan Memenuhi Syarat dalam 6 Bulan (Pangkat)
          </CardTitle>
          <CardDescription>Daftar pegawai yang diperkirakan akan memenuhi syarat kenaikan pangkat dalam 6 bulan ke depan</CardDescription>
        </CardHeader>
        <CardContent>
          {akan6BulanPangkat.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              Tidak ada pegawai yang akan memenuhi syarat dalam 6 bulan
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Pangkat Berikutnya</TableHead>
                  <TableHead className="text-right">AK Saat Ini</TableHead>
                  <TableHead className="text-right">Kebutuhan</TableHead>
                  <TableHead className="text-right">Kekurangan</TableHead>
                  <TableHead>Estimasi</TableHead>
                  <TableHead className="text-center">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {akan6BulanPangkat.map((k, idx) => <TableRow key={k.nip}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{k.nama}</TableCell>
                    <TableCell><code className="text-xs">{k.nip}</code></TableCell>
                    <TableCell><Badge>{k.estimasi.golonganBerikutnya}</Badge></TableCell>
                    <TableCell className="text-right">{k.estimasi.akRealSaatIni.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{k.estimasi.kebutuhanAKPangkat}</TableCell>
                    <TableCell className="text-right text-red-600">{k.estimasi.kekuranganAKPangkat.toFixed(2)}</TableCell>
                    <TableCell>
                      {Math.floor(k.estimasi.bulanDibutuhkanPangkat)} bulan
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => onSelectKaryawan(k)}>
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sky-600">
            <Clock className="h-5 w-5 text-orange-600" />
            Pegawai yang Akan Memenuhi Syarat dalam 6 Bulan (Jabatan)
          </CardTitle>
          <CardDescription>Daftar pegawai yang diperkirakan akan memenuhi syarat kenaikan jabatan dalam 6 bulan ke depan</CardDescription>
        </CardHeader>
        <CardContent>
          {akan6BulanJabatan.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              Tidak ada pegawai yang akan memenuhi syarat dalam 6 bulan
            </div> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Jabatan Berikutnya</TableHead>
                  <TableHead className="text-right">AK Saat Ini</TableHead>
                  <TableHead className="text-right">Kebutuhan</TableHead>
                  <TableHead className="text-right">Kekurangan</TableHead>
                  <TableHead>Estimasi</TableHead>
                  <TableHead className="text-center">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {akan6BulanJabatan.map((k, idx) => <TableRow key={k.nip}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{k.nama}</TableCell>
                    <TableCell><code className="text-xs">{k.nip}</code></TableCell>
                    <TableCell className="text-sm">{k.estimasi.jabatanBerikutnya}</TableCell>
                    <TableCell className="text-right">{k.estimasi.akRealSaatIni.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{k.estimasi.kebutuhanAKJabatan}</TableCell>
                    <TableCell className="text-right text-red-600">{k.estimasi.kekuranganAKJabatan.toFixed(2)}</TableCell>
                    <TableCell>
                      {Math.floor(k.estimasi.bulanDibutuhkanJabatan)} bulan
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" onClick={() => onSelectKaryawan(k)}>
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== COMPONENTS ====================
// ==================== PDF VIEWER COMPONENT ====================
const PDFViewer: React.FC<{
  pdfUrl: string;
  title: string;
}> = ({ pdfUrl, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Extract file ID from Google Drive URL
  const getFileIdFromUrl = (url: string): string | null => {
    try {
      const match = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const fileId = getFileIdFromUrl(pdfUrl);
  const embedUrl = fileId 
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>Dokumen ditampilkan langsung dalam aplikasi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 bg-muted/50 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-sm text-muted-foreground">Memuat dokumen...</p>
          </div>
        )}
        
        <div className="border rounded-lg overflow-hidden bg-white">
          <iframe 
            src={embedUrl}
            className="w-full min-h-[500px] transition-opacity duration-300"
            onLoad={() => setIsLoading(false)}
            style={{ opacity: isLoading ? 0 : 1 }}
            title={title}
            allow="autoplay"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            PDF Viewer - Google Docs Embed
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex items-center gap-2">
              <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </a>
            </Button>
            <Button asChild size="sm" className="flex items-center gap-2">
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Buka di Tab Baru
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProgressCard: React.FC<{
  title: string;
  akSaatIni: number;
  akRealSaatIni: number;
  kebutuhanAK: number;
  type: 'pangkat' | 'jabatan';
  bulanDibutuhkan: number;
  akTambahan: number;
  penjelasan: string;
  kekuranganAK: number;
  bisaUsul: boolean;
  isKenaikanJenjang?: boolean;
  target: string;
  kategori: string;
  progressPangkatBulan?: number;
  progressPangkatPersentase?: number;
}> = ({ title, akSaatIni, akRealSaatIni, kebutuhanAK, type, bulanDibutuhkan, akTambahan, penjelasan, kekuranganAK, bisaUsul, isKenaikanJenjang = false, target, kategori, progressPangkatBulan = 0, progressPangkatPersentase = 0 }) => {
  const isReguler = kategori === 'Reguler';
  const isTidakAda = title.includes('Tidak Ada') || kebutuhanAK === 0;
  
  // Untuk Reguler, progress dihitung berdasarkan waktu
  let progressPercentage = 0;
  if (isReguler && type === 'pangkat') {
    progressPercentage = progressPangkatPersentase;
  } else {
    progressPercentage = isTidakAda ? 0 : Math.min(akRealSaatIni / kebutuhanAK * 100, 100);
  }
  
  const finalPercentage = bisaUsul ? 100 : progressPercentage;

  const getStatusVariant = () => {
    if (isTidakAda) return 'secondary';
    if (bisaUsul) return 'default';
    if (isReguler && type === 'pangkat') {
      if (progressPangkatPersentase >= 100) return 'default';
      if (progressPangkatPersentase >= 75) return 'secondary';
      return 'destructive';
    }
    if (bulanDibutuhkan <= 6) return 'default';
    if (bulanDibutuhkan <= 12) return 'secondary';
    return 'destructive';
  };

  const getStatusText = () => {
    if (isTidakAda) return 'Tingkatan tertinggi';
    if (bisaUsul) {
      if (isKenaikanJenjang && type === 'jabatan') return 'Bisa usul Jabatan & Pangkat!';
      return 'Bisa diusulkan kenaikan Pangkat!';
    }
    
    if (isReguler && type === 'pangkat') {
      if (progressPangkatPersentase >= 100) return 'Bisa usul kenaikan pangkat (4 tahun)';
      const bulanSisa = 48 - progressPangkatBulan;
      if (bulanSisa <= 0) return 'Bisa usul kenaikan pangkat';
      return `Butuh ${bulanSisa} bulan lagi`;
    }
    
    const formatEstimasiWaktu = (bulan: number) => {
      if (bulan <= 0) return '0 bulan';
      const tahun = Math.floor(bulan / 12);
      const bulanSisa = bulan % 12;
      if (tahun > 0 && bulanSisa > 0) return `${tahun} tahun ${bulanSisa} bulan`;
      if (tahun > 0) return `${tahun} tahun`;
      return `${bulanSisa} bulan`;
    };
    const estimasi = formatEstimasiWaktu(bulanDibutuhkan);
    if (bulanDibutuhkan <= 6) return `Est. kenaikan sudah sangat dekat (${estimasi})`;
    if (bulanDibutuhkan <= 12) return `Est. kenaikan sudah dekat (${estimasi})`;
    return `Butuh waktu (${estimasi})`;
  };

  const getIcon = () => type === 'pangkat' ? <Award className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant={getStatusVariant() as any} className={
            bisaUsul ? "bg-green-600 hover:bg-green-700 text-white" : 
            isReguler && progressPangkatPersentase >= 100 ? "bg-green-600 hover:bg-green-700 text-white" :
            bulanDibutuhkan <= 6 ? "bg-blue-600 hover:bg-blue-700 text-white" : 
            "bg-orange-600 hover:bg-orange-700 text-white"
          }>
            {getStatusText()}
          </Badge>
        </div>
        <CardDescription>{target}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {penjelasan && (
          <div className="p-3 bg-blue-50 rounded-lg border">
            <p className="text-blue-700 font-sans italic text-xs">{penjelasan}</p>
          </div>
        )}

        {!isTidakAda && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-semibold">{finalPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={finalPercentage} className="bg-gray-400" />
            {isReguler && type === 'pangkat' && (
              <div className="text-xs text-muted-foreground text-center">
                {progressPangkatBulan} dari 48 bulan ({progressPangkatPersentase.toFixed(1)}%)
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          {!isReguler && (
            <>
              <div className="text-center">
                <div className="font-semibold text-xs text-muted-foreground">AK Awal</div>
                <div className="text-lg font-bold">{akSaatIni.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-xs text-muted-foreground">AK Tambahan</div>
                <div className="text-lg font-bold text-green-600">+{akTambahan.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-xs text-muted-foreground">AK Akhir</div>
                <div className="text-lg font-bold text-blue-600">{akRealSaatIni.toFixed(2)}</div>
              </div>
            </>
          )}
          {!isTidakAda && !isReguler && (
            <div className="text-center">
              <div className="font-semibold text-xs text-muted-foreground">Kebutuhan</div>
              <div className="text-lg font-bold">{kebutuhanAK}</div>
            </div>
          )}
          <div className="text-center">
            <div className="font-semibold text-xs text-muted-foreground">
              {isTidakAda ? 'Status' : isReguler ? 'Masa Kerja' : 'Kekurangan'}
            </div>
            <div className={`text-lg font-bold ${
              isTidakAda ? 'text-gray-600' : 
              isReguler ? 'text-blue-600' :
              kekuranganAK > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {isTidakAda ? 'Maksimal' : 
               isReguler ? `${progressPangkatBulan} bln` : 
               kekuranganAK.toFixed(2)}
            </div>
          </div>
        </div>

        {bisaUsul && !isTidakAda && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <span className="text-green-800 text-sm font-semibold">
              {isKenaikanJenjang && type === 'jabatan' ? 
                '✅ Bisa mengusulkan kenaikan JABATAN dan PANGKAT!' : 
                '✅ Sudah memenuhi syarat untuk diusulkan!'}
            </span>
          </div>
        )}

        {isReguler && type === 'pangkat' && progressPangkatPersentase >= 100 && !bisaUsul && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <span className="text-yellow-800 text-sm font-semibold">
              ⚠️ Masa kerja sudah 4 tahun, tetapi belum memenuhi syarat pendidikan untuk kenaikan pangkat
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BiodataCard: React.FC<{
  karyawan: Karyawan;
  akRealSaatIni: number;
  akTambahan: number;
}> = ({ karyawan, akRealSaatIni, akTambahan }) => {
  const formatTanggal = (tanggal: string) => {
    if (!tanggal) return '-';
    try {
      const date = new Date(tanggal);
      return isNaN(date.getTime()) ? tanggal : date.toLocaleDateString('id-ID');
    } catch {
      return tanggal;
    }
  };

  const parseNIP = (nip: string) => {
    if (!nip || nip.length < 15) return { tanggalLahir: '', tahunMasuk: '', jenisKelamin: 'L' };
    const parts = nip.split(' ');
    if (parts.length < 3) return { tanggalLahir: '', tahunMasuk: '', jenisKelamin: 'L' };
    
    const tglLahirStr = parts[0];
    const tahunMasukStr = parts[1];
    const jenisKelaminStr = parts[2];
    
    let tanggalLahir = '';
    if (tglLahirStr.length === 8) {
      const tahun = tglLahirStr.substring(0, 4);
      const bulan = tglLahirStr.substring(4, 6);
      const tanggal = tglLahirStr.substring(6, 8);
      tanggalLahir = `${tahun}-${bulan}-${tanggal}`;
    }
    
    let tahunMasuk = '';
    if (tahunMasukStr.length === 6) {
      const tahun = tahunMasukStr.substring(0, 4);
      const bulan = tahunMasukStr.substring(4, 6);
      tahunMasuk = `${tahun}-${bulan}-01`;
    }
    
    const jenisKelamin = jenisKelaminStr === '1' ? 'L' : 'P';
    return { tanggalLahir, tahunMasuk, jenisKelamin };
  };

  const hitungMasaKerja = (tahunMasuk: string) => {
    if (!tahunMasuk) return '-';
    try {
      const masuk = new Date(tahunMasuk);
      const sekarang = new Date();
      if (isNaN(masuk.getTime())) return '-';
      
      const tahun = sekarang.getFullYear() - masuk.getFullYear();
      const bulan = sekarang.getMonth() - masuk.getMonth();
      let totalBulan = tahun * 12 + bulan;
      if (totalBulan < 0) totalBulan = 0;
      
      const tahunKerja = Math.floor(totalBulan / 12);
      const bulanKerja = totalBulan % 12;
      
      if (tahunKerja > 0 && bulanKerja > 0) return `${tahunKerja} tahun ${bulanKerja} bulan`;
      if (tahunKerja > 0) return `${tahunKerja} tahun`;
      return `${bulanKerja} bulan`;
    } catch {
      return '-';
    }
  };

  const nipData = parseNIP(karyawan.nip);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Informasi Karyawan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Nama</Label>
              <p className="font-semibold text-sm">{karyawan.nama}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">NIP</Label>
              <p className="font-medium text-xs">{karyawan.nip}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Jenis Kelamin</Label>
              <p className="font-medium text-sm">{nipData.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Pangkat / Golongan</Label>
              <p className="font-semibold text-sm">{karyawan.pangkat} ({karyawan.golongan})</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TMT Pangkat</Label>
              <p className="font-medium text-sm">{formatTanggal(karyawan.tmtPangkat)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TMT PNS</Label>
              <p className="font-medium text-sm">{formatTanggal(nipData.tahunMasuk)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Jabatan</Label>
              <p className="font-medium text-sm">{karyawan.jabatan}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TMT Jabatan</Label>
              <p className="font-medium text-sm">{formatTanggal(karyawan.tmtJabatan)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit Kerja</Label>
              <p className="font-medium text-sm">{karyawan.unitKerja}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Pendidikan Terakhir</Label>
              <p className="font-medium text-sm">{karyawan.pendidikan}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Masa Kerja</Label>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-sm">{hitungMasaKerja(nipData.tahunMasuk)}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Angka Kredit Saat Ini</Label>
              <p className="text-lg font-bold text-blue-600">{akRealSaatIni.toFixed(2)}</p>
              {karyawan.kategori !== 'Reguler' && (
                <p className="text-xs text-muted-foreground">
                  AK Awal: {karyawan.akKumulatif.toFixed(2)} + AK Tambahan: {akTambahan.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PredikatKinerjaRadio: React.FC<{
  selectedValue: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
}> = ({ selectedValue, onValueChange, disabled = false }) => {
  const predikatOptions = [{
    value: 1.50,
    label: 'Sangat Baik (Performa luar biasa)'
  }, {
    value: 1.00,
    label: 'Baik (Performa Baik)'
  }, {
    value: 0.75,
    label: 'Cukup (Perlu peningkatan)'
  }, {
    value: 0.50,
    label: 'Kurang (Perlu perbaikan serius)'
  }];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estimasi Predikat Kinerja</CardTitle>
        <CardDescription>
          {disabled 
            ? "Tidak berlaku untuk kategori Reguler" 
            : "Pilih predikat kinerja untuk simulasi perhitungan"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={selectedValue.toString()} 
          onValueChange={value => onValueChange(parseFloat(value))}
          disabled={disabled}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {predikatOptions.map(option => (
              <div key={option.value} className={`flex items-center space-x-3 rounded-lg border p-4 ${disabled ? 'opacity-50' : 'hover:bg-accent'}`}>
                <RadioGroupItem value={option.value.toString()} id={`predikat-${option.value}`} disabled={disabled} />
                <Label htmlFor={`predikat-${option.value}`} className="flex flex-col">
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-lg font-bold text-blue-600">{option.value * 100}%</span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
        {disabled && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-yellow-700 text-sm">
              Pada kategori Reguler, kenaikan pangkat tidak memakai perhitungan Angka Kredit, tetapi mengikuti masa kerja/TMT pangkat terakhir.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EmployeeTable: React.FC<{
  karyawanList: Karyawan[];
  onSelect: (karyawan: Karyawan) => void;
  selectedNip: string | null;
  loading: boolean;
}> = ({ karyawanList, onSelect, selectedNip, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<'Semua' | 'Keahlian' | 'Keterampilan' | 'Reguler'>('Semua');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

  const getKaryawanWithAKReal = (karyawan: Karyawan) => {
    const akTambahan = AngkaKreditCalculator.hitungAKTambahan(karyawan);
    const akRealSaatIni = AngkaKreditCalculator.hitungAKRealSaatIni(karyawan);
    return { ...karyawan, akTambahan, akRealSaatIni };
  };

  const karyawanWithAKReal = karyawanList.map(getKaryawanWithAKReal);
  
  const filteredKaryawan = karyawanWithAKReal.filter(karyawan => {
    const matchesSearch = karyawan.nama.toLowerCase().includes(searchTerm.toLowerCase()) || karyawan.nip.includes(searchTerm) || karyawan.unitKerja.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKategori = filterKategori === 'Semua' || karyawan.kategori === filterKategori;
    return matchesSearch && matchesKategori;
  });

  const sortedKaryawan = [...filteredKaryawan].sort((a, b) => {
    if (!sortConfig.direction) return 0;
    let aValue: any = a[sortConfig.key as keyof typeof a];
    let bValue: any = b[sortConfig.key as keyof typeof b];
    
    if (sortConfig.key === 'akKumulatif' || sortConfig.key === 'akTambahan' || sortConfig.key === 'akRealSaatIni') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 ml-1 inline" /> : <ArrowDown className="h-4 w-4 ml-1 inline" />;
  };

  const totalKaryawan = karyawanList.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold">Memuat data karyawan...</h3>
            <p className="text-muted-foreground">Sedang mengambil data dari Google Sheets</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="my-[20px]">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, NIP, atau unit kerja..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterKategori} onValueChange={(value: any) => setFilterKategori(value)}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Kategori</SelectItem>
              <SelectItem value="Keahlian">Keahlian</SelectItem>
              <SelectItem value="Keterampilan">Keterampilan</SelectItem>
              <SelectItem value="Reguler">Reguler</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sortedKaryawan.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tidak ada karyawan ditemukan</h3>
            <p className="text-muted-foreground">Coba ubah kata kunci pencarian atau filter</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('nama')}>
                    Nama {getSortIcon('nama')}
                  </TableHead>
                  <TableHead className="w-[220px]">NIP</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('kategori')}>
                    Kategori {getSortIcon('kategori')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('golongan')}>
                    Golongan {getSortIcon('golongan')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('jabatan')}>
                    Jabatan {getSortIcon('jabatan')}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('akKumulatif')}>
                    AK Awal {getSortIcon('akKumulatif')}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('akTambahan')}>
                    AK Tambahan {getSortIcon('akTambahan')}
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('akRealSaatIni')}>
                    AK Akhir {getSortIcon('akRealSaatIni')}
                  </TableHead>
                  <TableHead className="text-right w-[70px]">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKaryawan.map(karyawan => (
                  <TableRow key={karyawan.nip} className={selectedNip === karyawan.nip ? 'bg-accent' : ''}>
                    <TableCell className="font-medium py-2">{karyawan.nama}</TableCell>
                    <TableCell className="py-2">
                      <code className="relative rounded bg-muted px-2 py-1 font-mono text-sm whitespace-nowrap">
                        {karyawan.nip}
                      </code>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={
                        karyawan.kategori === 'Keahlian' ? 'default' : 
                        karyawan.kategori === 'Keterampilan' ? 'secondary' : 'outline'
                      }>
                        {karyawan.kategori}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline">{karyawan.golongan}</Badge>
                    </TableCell>
                    <TableCell className="text-sm py-2">{karyawan.jabatan}</TableCell>
                    <TableCell className="text-right py-2">{karyawan.akKumulatif.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600 py-2">+{karyawan.akTambahan.toFixed(2)}</TableCell>
                    <TableCell className="text-right py-2">
                      <Badge variant="default" className="font-bold">
                        {karyawan.akRealSaatIni.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <Button size="sm" variant="ghost" onClick={() => onSelect(karyawan)} className="h-8 w-8 p-0 hover:bg-accent" title="Masuk ke detail karyawan">
                        <LogIn className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Menampilkan {sortedKaryawan.length} dari {totalKaryawan} karyawan
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-800">Informasi Angka Kredit Akhir</h4>
              <p className="text-blue-700 text-sm">
                <strong>AK Akhir = AK Awal + AK Tambahan</strong>. Angka Kredit Tambahan dihitung otomatis sejak TMT Jabatan sampai hari ini dengan asumsi predikat kinerja "Baik". 
                <strong> Untuk kategori Reguler, perhitungan AK tidak berlaku.</strong>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EstimasiKenaikanCard: React.FC<{
  karyawan: Karyawan;
}> = ({ karyawan }) => {
  const [predikatAsumsi, setPredikatAsumsi] = useState(1.00);
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan, predikatAsumsi);
  const isReguler = karyawan.kategori === 'Reguler';
  
  const formatEstimasiWaktu = (bulanDibutuhkan: number) => {
    if (bulanDibutuhkan <= 0) return { tahun: 0, bulan: 0, formatted: '0 bulan' };
    const tahun = Math.floor(bulanDibutuhkan / 12);
    const bulan = bulanDibutuhkan % 12;
    let formatted = '';
    if (tahun > 0 && bulan > 0) formatted = `${tahun} tahun ${bulan} bulan`;
    else if (tahun > 0) formatted = `${tahun} tahun`;
    else formatted = `${bulan} bulan`;
    return { tahun, bulan, formatted };
  };

  const estimasiPangkat = formatEstimasiWaktu(estimasi.bulanDibutuhkanPangkat);
  const estimasiJabatan = formatEstimasiWaktu(estimasi.bulanDibutuhkanJabatan);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Estimasi Kenaikan Pangkat dan Jabatan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isReguler && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-blue-700 font-medium">Angka Kredit Awal</div>
              <div className="text-2xl font-bold text-blue-800">{karyawan.akKumulatif.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-green-700 font-medium">Angka Kredit Tambahan</div>
              <div className="text-2xl font-bold text-green-800">+{estimasi.akTambahan.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-red-700 font-medium">Angka Kredit Akhir Saat Ini</div>
              <div className="text-2xl font-bold text-red-800">{estimasi.akRealSaatIni.toFixed(2)}</div>
            </div>
          </div>
        )}

        {isReguler && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-blue-700 font-medium">Masa Kerja Pangkat</div>
              <div className="text-2xl font-bold text-blue-800">{estimasi.progressPangkatBulan} bulan</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-green-700 font-medium">Progress Kenaikan</div>
              <div className="text-2xl font-bold text-green-800">{estimasi.progressPangkatPersentase.toFixed(1)}%</div>
            </div>
          </div>
        )}

        {estimasi.isKenaikanJenjang && !isReguler && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-300">
                <TrendingUp className="h-4 w-4 text-yellow-900" />
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-yellow-900">Kenaikan Jenjang</h4>
                <p className="text-sm text-yellow-800">
                  Anda akan mendapatkan peluang untuk kenaikan jenjang. Ketika syarat terpenuhi, Anda dapat mengusulkan kenaikan{' '}
                  <strong>Jabatan dan Pangkat</strong>. Kenaikan pangkat akan mengikuti setelah dinyatakan lulus Uji Kompetensi.
                </p>
              </div>
            </div>
          </div>
        )}

        <PredikatKinerjaRadio 
          selectedValue={predikatAsumsi} 
          onValueChange={setPredikatAsumsi} 
          disabled={isReguler}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5" />
                Kenaikan Pangkat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pangkat berikutnya</span>
                <span className="font-semibold">{estimasi.golonganBerikutnya}</span>
              </div>
              {!isReguler && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kebutuhan Angka Kredit</span>
                    <span className="font-semibold">{estimasi.kebutuhanAKPangkat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kekurangan Angka Kredit</span>
                    <span className={`font-semibold ${estimasi.kekuranganAKPangkat > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {estimasi.kekuranganAKPangkat.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {isReguler && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Masa Kerja Saat Ini</span>
                    <span className="font-semibold">{estimasi.progressPangkatBulan} bulan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{estimasi.progressPangkatPersentase.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Syarat Pendidikan</span>
                    <span className={`font-semibold ${AngkaKreditCalculator.cekSyaratPendidikan(karyawan.golongan, karyawan.pendidikan) ? 'text-green-600' : 'text-red-600'}`}>
                      {AngkaKreditCalculator.cekSyaratPendidikan(karyawan.golongan, karyawan.pendidikan) ? 'Terpenuhi' : 'Belum'}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimasi waktu</span>
                <span className="font-semibold text-blue-600">{estimasiPangkat.formatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={estimasi.bisaUsulPangkat ? 'default' : 'secondary'} className={estimasi.bisaUsulPangkat ? "bg-green-700 hover:bg-green-800 text-white" : ""}>
                  {estimasi.bisaUsulPangkat ? '✅ Bisa diusulkan' : '❌ Belum memenuhi'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Kenaikan Jabatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jabatan berikutnya</span>
                <span className="font-semibold">{estimasi.jabatanBerikutnya}</span>
              </div>
              {!isReguler && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kebutuhan Angka Kredit</span>
                    <span className="font-semibold">{estimasi.kebutuhanAKJabatan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kekurangan Angka Kredit</span>
                    <span className={`font-semibold ${estimasi.kekuranganAKJabatan > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {estimasi.kekuranganAKJabatan.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimasi waktu</span>
                    <span className="font-semibold text-blue-600">{estimasiJabatan.formatted}</span>
                  </div>
                </>
              )}
              {isReguler && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Tidak berlaku untuk kategori Reguler</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={estimasi.bisaUsulJabatan ? 'default' : 'secondary'} className={estimasi.bisaUsulJabatan ? "bg-green-700 hover:bg-green-800 text-white" : ""}>
                  {estimasi.bisaUsulJabatan ? '✅ Bisa diusulkan' : '❌ Belum memenuhi'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border">
          <p className="text-blue-800 text-sm">
            <strong>Informasi:</strong> {isReguler 
              ? "Estimasi untuk kategori Reguler berdasarkan masa kerja 4 tahun dari TMT Pangkat. Kenaikan pangkat memerlukan syarat pendidikan sesuai golongan."
              : `Estimasi berdasarkan predikat kinerja ${predikatAsumsi * 100}% dengan perolehan ${estimasi.akPerBulan} AK/bulan. Perhitungan sesuai Peraturan BKN No. 3 Tahun 2023. AK Akhir saat ini sudah termasuk akumulasi sejak TMT Jabatan.`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const DokumenSKCard: React.FC<{
  karyawan: Karyawan;
}> = ({ karyawan }) => {
  const hasJabatan = !!karyawan.linkSkJabatan;
  const hasPangkat = !!karyawan.linkSkPangkat;

  if (!hasJabatan && !hasPangkat) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Dokumen SK
          </CardTitle>
          <CardDescription>Dokumen pendukung karir dan kepangkatan</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Belum ada dokumen SK yang tersedia</p>
            <p className="text-sm">Dokumen akan ditampilkan di sini ketika tersedia</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions - Compact */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Akses Cepat</span>
            </div>
            <div className="flex gap-2">
              {hasJabatan && (
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <a href={karyawan.linkSkJabatan!} target="_blank" rel="noopener noreferrer">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    SK Jabatan Terakhir
                  </a>
                </Button>
              )}
              {hasPangkat && (
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <a href={karyawan.linkSkPangkat!} target="_blank" rel="noopener noreferrer">
                    <Award className="h-3 w-3 mr-1" />
                    SK Pangkat Terakhir
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dual PDF View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SK Jabatan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              SK Jabatan Terakhir
              {!hasJabatan && (
                <Badge variant="secondary" className="ml-2 text-xs">Tidak Tersedia</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {hasJabatan ? (
              <CompactPDFViewer 
                pdfUrl={karyawan.linkSkJabatan!} 
                title="SK Jabatan Terakhi" 
              />
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Dokumen tidak tersedia</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SK Pangkat */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-green-600" />
              SK Pangkat Terakhir
              {!hasPangkat && (
                <Badge variant="secondary" className="ml-2 text-xs">Tidak Tersedia</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {hasPangkat ? (
              <CompactPDFViewer 
                pdfUrl={karyawan.linkSkPangkat!} 
                title="SK Pangkat Terakhir" 
              />
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Dokumen tidak tersedia</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Compact PDF Viewer Component
const CompactPDFViewer: React.FC<{
  pdfUrl: string;
  title: string;
}> = ({ pdfUrl, title }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  const getFileIdFromUrl = (url: string): string | null => {
    try {
      const match = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const fileId = getFileIdFromUrl(pdfUrl);
  const embedUrl = fileId 
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

  return (
    <div className="space-y-3" style={{ height: "500px" }}> {/* Force height di parent */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-1"></div>
          <p className="text-xs text-muted-foreground">Memuat dokumen...</p>
        </div>
      )}
      
      <div className="border rounded overflow-hidden bg-white" style={{ height: "500px" }}> {/* Force height di wrapper */}
        <iframe 
          src={embedUrl}
          className="w-full h-full transition-opacity duration-300" // Gunakan h-full
          onLoad={() => setIsLoading(false)}
          style={{ 
            opacity: isLoading ? 0 : 1,
            height: "500px", // Force inline style
            minHeight: "500px"
          }}
          title={title}
          allow="autoplay"
        />
      </div>
      
      <div className="flex justify-between items-center text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <FileText className="h-3 w-3" />
          PDF Viewer
        </div>
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </a>
          </Button>
          <Button asChild size="sm" className="h-7 text-xs">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Buka
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

const EmployeeDashboard: React.FC<{
  karyawan: Karyawan;
}> = ({ karyawan }) => {
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
  const penjelasanKebutuhanPangkat = AngkaKreditCalculator.getPenjelasanKebutuhan(
    karyawan.jabatan, karyawan.kategori, estimasi.isKenaikanJenjang, karyawan.golongan, estimasi.golonganBerikutnya
  );
  const penjelasanKebutuhanJabatan = AngkaKreditCalculator.getPenjelasanKebutuhan(
    karyawan.jabatan, karyawan.kategori, estimasi.isKenaikanJenjang, karyawan.golongan, estimasi.golonganBerikutnya
  );
  const rekomendasiKarir = AngkaKreditCalculator.getRekomendasiKarir(karyawan);

  return (
    <div className="space-y-6">
      <BiodataCard karyawan={karyawan} akRealSaatIni={estimasi.akRealSaatIni} akTambahan={estimasi.akTambahan} />
      
      {/* PESAN SELAMAT - DITAMPILKAN SETELAH BOX INFORMASI KARYAWAN */}
      {estimasi.isKenaikanJenjang && estimasi.bisaUsulJabatan && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-yellow-200">
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-2">
                🎉🎉 SELAMAT..!!! 🎉🎉
              </h3>
              <p className="text-green-700 text-lg font-medium mb-2">
                Tahap awal sukses telah Anda raih! Anda berhasil memenuhi target kenaikan jenjang
              </p>
              <p className="text-green-700 text-lg font-medium">
                Tinggal satu langkah lagi - Uji Kompetensi - untuk mewujudkan kenaikan <strong className="text-green-800">JABATAN dan PANGKAT</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {rekomendasiKarir && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-full">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Rekomendasi Pengembangan Karir</h3>
                <p className="text-yellow-700">{rekomendasiKarir}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress Kenaikan Karir
          </CardTitle>
          <CardDescription>
            {karyawan.kategori === 'Reguler' ? (
              <>Progress kenaikan pangkat berdasarkan masa kerja 4 tahun dari TMT Pangkat</>
            ) : (
              <>
                AK Akhir Saat Ini: <strong>{estimasi.akRealSaatIni.toFixed(2)}</strong>{' '}
                (AK Awal: {karyawan.akKumulatif.toFixed(2)} + AK Tambahan: {estimasi.akTambahan.toFixed(2)})
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressCard 
              title="Kenaikan Pangkat" 
              akSaatIni={karyawan.akKumulatif} 
              akRealSaatIni={estimasi.akRealSaatIni} 
              kebutuhanAK={estimasi.kebutuhanAKPangkat} 
              type="pangkat" 
              bulanDibutuhkan={estimasi.bulanDibutuhkanPangkat} 
              akTambahan={estimasi.akTambahan} 
              penjelasan={penjelasanKebutuhanPangkat} 
              kekuranganAK={estimasi.kekuranganAKPangkat} 
              bisaUsul={estimasi.bisaUsulPangkat} 
              isKenaikanJenjang={estimasi.isKenaikanJenjang} 
              target={estimasi.golonganBerikutnya} 
              kategori={karyawan.kategori}
              progressPangkatBulan={estimasi.progressPangkatBulan}
              progressPangkatPersentase={estimasi.progressPangkatPersentase}
            />
            <ProgressCard 
              title="Kenaikan Jabatan" 
              akSaatIni={karyawan.akKumulatif} 
              akRealSaatIni={estimasi.akRealSaatIni} 
              kebutuhanAK={estimasi.kebutuhanAKJabatan} 
              type="jabatan" 
              bulanDibutuhkan={estimasi.bulanDibutuhkanJabatan} 
              akTambahan={estimasi.akTambahan} 
              penjelasan={penjelasanKebutuhanJabatan} 
              kekuranganAK={estimasi.kekuranganAKJabatan} 
              bisaUsul={estimasi.bisaUsulJabatan} 
              isKenaikanJenjang={estimasi.isKenaikanJenjang} 
              target={estimasi.jabatanBerikutnya} 
              kategori={karyawan.kategori}
            />
          </div>
        </CardContent>
      </Card>

      <EstimasiKenaikanCard karyawan={karyawan} />
    </div>
  );
};

const KarierKu: React.FC = () => {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dokumen'>('dashboard');
  const [mainTab, setMainTab] = useState<'dashboardKarir' | 'tabelIndividu'>('dashboardKarir');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKaryawanData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `${SHEET_NAME}!A:N`
        }
      });

      if (error) throw error;
      
      const rows = data.values || [];
      const karyawanData: Karyawan[] = rows.slice(1).filter((row: any[]) => row.length > 0 && row[0]).map((row: any[]) => {
        let akKumulatifValue = 0;
        if (row[6]) {
          const akValue = row[6].toString().replace(',', '.');
          akKumulatifValue = parseFloat(akValue) || 0;
        }
        
        const jabatan = row[4]?.toString() || '';
        const kategori = AngkaKreditCalculator.tentukanKategori(jabatan);
        
        const parseNIP = (nip: string) => {
          if (!nip || nip.length < 15) return { tanggalLahir: '', tahunMasuk: '', jenisKelamin: 'L' };
          const parts = nip.split(' ');
          if (parts.length < 3) return { tanggalLahir: '', tahunMasuk: '', jenisKelamin: 'L' };
          
          const tglLahirStr = parts[0];
          const tahunMasukStr = parts[1];
          const jenisKelaminStr = parts[2];
          
          let tanggalLahir = '';
          if (tglLahirStr.length === 8) {
            const tahun = tglLahirStr.substring(0, 4);
            const bulan = tglLahirStr.substring(4, 6);
            const tanggal = tglLahirStr.substring(6, 8);
            tanggalLahir = `${tahun}-${bulan}-${tanggal}`;
          }
          
          let tahunMasuk = '';
          if (tahunMasukStr.length === 6) {
            const tahun = tahunMasukStr.substring(0, 4);
            const bulan = tahunMasukStr.substring(4, 6);
            tahunMasuk = `${tahun}-${bulan}-01`;
          }
          
          const jenisKelamin = jenisKelaminStr === '1' ? 'L' : 'P';
          return { tanggalLahir, tahunMasuk, jenisKelamin };
        };
        
        const nipData = parseNIP(row[0]?.toString() || '');
        return {
          nip: row[0]?.toString() || '',
          nama: row[1]?.toString() || '',
          pangkat: row[2]?.toString() || '',
          golongan: row[3]?.toString() || '',
          jabatan: jabatan,
          kategori: kategori,
          akKumulatif: akKumulatifValue,
          status: row[7]?.toString() as 'Aktif' | 'Pensiun' | 'Mutasi' || 'Aktif',
          unitKerja: row[8]?.toString() || '',
          tmtJabatan: row[9]?.toString() || '',
          tmtPangkat: row[10]?.toString() || '',
          pendidikan: row[11]?.toString() || '',
          tanggalLahir: nipData.tanggalLahir,
          jenisKelamin: nipData.jenisKelamin,
          tempatLahir: '',
          agama: '',
          email: '',
          telepon: '',
          alamat: '',
          linkSkJabatan: row[12]?.toString() || '',
          linkSkPangkat: row[13]?.toString() || ''
        };
      });
      setKaryawanList(karyawanData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data dari Google Sheets: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchKaryawanData();
  }, []);
  
  const handleSelectKaryawan = (karyawan: Karyawan) => {
    setSelectedKaryawan(karyawan);
    setMainTab('tabelIndividu');
  };
  
  return (
    <div className="space-y-6">
      {!selectedKaryawan ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-red-500">KarierKu-3210</CardTitle>
              <CardDescription>Monitoring dan penghitungan angka kredit berdasarkan Peraturan BKN No. 3 Tahun 2023</CardDescription>
            </CardHeader>
          </Card>

          <Tabs value={mainTab} onValueChange={(value: any) => setMainTab(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dashboardKarir" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Dashboard KarierKu
              </TabsTrigger>
              <TabsTrigger value="tabelIndividu" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Tabel Individu
              </TabsTrigger>
            </TabsList>
            <TabsContent value="dashboardKarir" className="space-y-6">
              <DashboardKarierKu karyawanList={karyawanList} onSelectKaryawan={handleSelectKaryawan} />
            </TabsContent>
            <TabsContent value="tabelIndividu" className="space-y-6">
              <EmployeeTable karyawanList={karyawanList} onSelect={setSelectedKaryawan} selectedNip={null} loading={loading} />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedKaryawan(null)} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-sky-800">{selectedKaryawan.nama}</h1>
                <p className="text-muted-foreground">{selectedKaryawan.nip}</p>
              </div>
            </div>            
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="dokumen" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dokumen SK
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsContent value="dashboard" className="space-y-6">
              <EmployeeDashboard karyawan={selectedKaryawan} />
            </TabsContent>            
            <TabsContent value="dokumen" className="space-y-6">
              <DokumenSKCard karyawan={selectedKaryawan} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default KarierKu;