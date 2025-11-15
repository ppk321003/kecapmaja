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
  kategori: 'Keahlian' | 'Keterampilan';
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
}

// ==================== GOOGLE SHEETS CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "data";

// ==================== UTILITIES - SESUAI PERATURAN BKN ====================
class AngkaKreditCalculator {
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

  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi: number = 1.00): EstimasiKenaikan {
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
      isKenaikanJenjang
    };
  }

  static getGolonganBerikutnya(golonganSekarang: string, kategori: string): string {
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

  static getRekomendasiKarir(karyawan: Karyawan): string {
    if (karyawan.kategori === 'Keterampilan') {
      const pendidikan = karyawan.pendidikan.toLowerCase();
      const isPendidikanRendah = pendidikan.includes('sma') || pendidikan.includes('smk') || pendidikan.includes('d1') || pendidikan.includes('d2') || pendidikan.includes('d3') || pendidikan.includes('diploma') || pendidikan.includes('slta');
      const isPendidikanTinggi = pendidikan.includes('d4') || pendidikan.includes('s1') || pendidikan.includes('sarjana') || pendidikan.includes('s2') || pendidikan.includes('s3') || pendidikan.includes('magister') || pendidikan.includes('doktor');
      if (isPendidikanRendah) return 'REKOMENDASI: Untuk pengembangan karir lebih lanjut, pertimbangkan melanjutkan pendidikan ke D4/S1 untuk dapat beralih ke jalur Keahlian.';
      if (isPendidikanTinggi) return 'REKOMENDASI: Anda sudah memenuhi syarat pendidikan untuk jalur Keahlian. Pertimbangkan untuk mengajukan alih jalur karir.';
    }
    if (karyawan.kategori === 'Keahlian') {
      const jabatanBerikutnya = this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
      if (jabatanBerikutnya === 'Tidak Ada') return 'SUKSES: Anda telah mencapai jenjang karir tertinggi di jalur Keahlian. Pertahankan kinerja dan berkontribusi sebagai mentor.';
    }
    return '';
  }
}

// ==================== NEW COMPONENTS - DASHBOARD ====================
const DashboardKarierKu: React.FC<{
  karyawanList: Karyawan[];
  onSelectKaryawan: (karyawan: Karyawan) => void;
}> = ({ karyawanList, onSelectKaryawan }) => {
  const getKaryawanWithEstimasi = (karyawan: Karyawan) => {
    const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
    return { ...karyawan, estimasi };
  };

  const karyawanWithEstimasi = karyawanList.map(getKaryawanWithEstimasi);
  const sudahMemenuhiPangkat = karyawanWithEstimasi.filter(k => k.estimasi.bisaUsulPangkat && k.estimasi.kebutuhanAKPangkat > 0);
  const sudahMemenuhiJabatan = karyawanWithEstimasi.filter(k => k.estimasi.bisaUsulJabatan && k.estimasi.kebutuhanAKJabatan > 0);
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

      {/* Table components remain the same as in your original code */}
      {/* ... (Tables for Memenuhi Syarat Pangkat, Jabatan, etc.) ... */}
    </div>
  );
};

// ==================== COMPONENTS ====================

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
}> = ({ title, akSaatIni, akRealSaatIni, kebutuhanAK, type, bulanDibutuhkan, akTambahan, penjelasan, kekuranganAK, bisaUsul, isKenaikanJenjang = false, target }) => {
  const isTidakAda = title.includes('Tidak Ada') || kebutuhanAK === 0;
  const progressPercentage = isTidakAda ? 0 : Math.min(akRealSaatIni / kebutuhanAK * 100, 100);
  const finalPercentage = bisaUsul ? 100 : progressPercentage;

  const getStatusVariant = () => {
    if (isTidakAda) return 'secondary';
    if (bisaUsul) return 'default';
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
            bulanDibutuhkan <= 6 ? "bg-blue-600 hover:bg-blue-700 text-white" : 
            "bg-orange-600 hover:bg-orange-700 text-white"
          }>
            {getStatusText()}
          </Badge>
        </div>
        <CardDescription>{target}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isTidakAda && penjelasan && (
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
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
          {!isTidakAda && (
            <div className="text-center">
              <div className="font-semibold text-xs text-muted-foreground">Kebutuhan</div>
              <div className="text-lg font-bold">{kebutuhanAK}</div>
            </div>
          )}
          <div className="text-center">
            <div className="font-semibold text-xs text-muted-foreground">
              {isTidakAda ? 'Status' : 'Kekurangan'}
            </div>
            <div className={`text-lg font-bold ${
              isTidakAda ? 'text-gray-600' : kekuranganAK > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {isTidakAda ? 'Maksimal' : kekuranganAK.toFixed(2)}
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
              <Label className="text-xs text-muted-foreground">Pendidikan</Label>
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
              <p className="text-xs text-muted-foreground">
                AK Awal: {karyawan.akKumulatif.toFixed(2)} + AK Tambahan: {akTambahan.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== NEW COMPONENT: DOKUMEN SK CARD ====================
const DokumenSKCard: React.FC<{
  karyawan: Karyawan;
}> = ({ karyawan }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Dokumen SK
        </CardTitle>
        <CardDescription>Dokumen pendukung karir dan kepangkatan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* SK Jabatan */}
          <Card className={karyawan.linkSkJabatan ? "border-green-200" : "border-gray-200"}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    karyawan.linkSkJabatan ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <TrendingUp className={`h-4 w-4 ${
                      karyawan.linkSkJabatan ? "text-green-600" : "text-gray-400"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">SK Jabatan</p>
                    <p className="text-sm text-muted-foreground">
                      {karyawan.linkSkJabatan ? "Dokumen tersedia" : "Dokumen belum tersedia"}
                    </p>
                  </div>
                </div>
                {karyawan.linkSkJabatan && (
                  <Button size="sm" asChild>
                    <a 
                      href={karyawan.linkSkJabatan} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Buka SK
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SK Pangkat */}
          <Card className={karyawan.linkSkPangkat ? "border-blue-200" : "border-gray-200"}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    karyawan.linkSkPangkat ? "bg-blue-100" : "bg-gray-100"
                  }`}>
                    <Award className={`h-4 w-4 ${
                      karyawan.linkSkPangkat ? "text-blue-600" : "text-gray-400"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">SK Pangkat</p>
                    <p className="text-sm text-muted-foreground">
                      {karyawan.linkSkPangkat ? "Dokumen tersedia" : "Dokumen belum tersedia"}
                    </p>
                  </div>
                </div>
                {karyawan.linkSkPangkat && (
                  <Button size="sm" asChild>
                    <a 
                      href={karyawan.linkSkPangkat} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Buka SK
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {!karyawan.linkSkJabatan && !karyawan.linkSkPangkat && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada dokumen SK yang tersedia</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// EmployeeTable, PredikatKinerjaRadio, EstimasiKenaikanCard components remain mostly the same
// ... (keep their existing implementations) ...

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
            AK Akhir Saat Ini: <strong>{estimasi.akRealSaatIni.toFixed(2)}</strong>{' '}
            (AK Awal: {karyawan.akKumulatif.toFixed(2)} + AK Tambahan: {estimasi.akTambahan.toFixed(2)})
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
            />
          </div>
        </CardContent>
      </Card>

      <EstimasiKenaikanCard karyawan={karyawan} />
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
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
          range: `${SHEET_NAME}!A:N` // Updated to include new columns
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
          jabatan: row[4]?.toString() || '',
          kategori: row[5]?.toString() as 'Keahlian' | 'Keterampilan' || 'Keahlian',
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
          linkSkJabatan: row[12]?.toString() || '', // New column
          linkSkPangkat: row[13]?.toString() || ''  // New column
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
              {/* EmployeeTable component - keep existing implementation */}
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