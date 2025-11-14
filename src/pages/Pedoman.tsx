// pages/KarirDashboard.tsx - VERSI FINAL DENGAN TEMA DAN KOMPONEN UI
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
import { Search, ArrowLeft, User, TrendingUp, Calendar, Award, FileText, LogIn } from 'lucide-react';

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
}

interface InputKinerja {
  idInput: string;
  nip: string;
  periode: string;
  jenisPenilaian: 'Tahunan' | 'Periodik';
  bulanPeriodik: number;
  predikatKinerja: number;
  akDiperoleh: number;
  jabatanSaatInput: string;
  tanggalInput: string;
  inputOleh: string;
  keterangan: string;
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
      if (jabatan.includes(key)) {
        return value;
      }
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

  static hitungAK(jabatan: string, predikat: number, isPeriodik: boolean = false, bulanPeriodik: number = 0): number {
    const koefisien = this.getKoefisien(jabatan);
    let angkaKredit = predikat * koefisien;
    
    if (isPeriodik && bulanPeriodik > 0) {
      angkaKredit = bulanPeriodik / 12 * predikat * koefisien;
    }
    
    return Math.round(angkaKredit * 100) / 100;
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
      'Ahli Pertama': 'Ahli Muda', 'Ahli Muda': 'Ahli Madya', 
      'Ahli Madya': 'Ahli Utama', 'Ahli Utama': 'Tidak Ada'
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
          return "Kenaikan jenjang butuh 100 AK kumulatif untuk naik ke Ahli Muda. Anda dapat mengusulkan kenaikan jabatan dan pangkat.";
        } else if (jabatanSekarang.includes('Muda') && golonganSekarang === 'III/d') {
          return "Kenaikan jenjang butuh 200 AK kumulatif untuk naik ke Ahli Madya. Anda dapat mengusulkan kenaikan jabatan dan pangkat.";
        } else if (jabatanSekarang.includes('Madya') && golonganSekarang === 'IV/c') {
          return "Kenaikan jenjang butuh 450 AK kumulatif untuk naik ke Ahli Utama. Anda dapat mengusulkan kenaikan jabatan dan pangkat.";
        }
      } else {
        if (jabatanSekarang.includes('Terampil') && golonganSekarang === 'II/d') {
          return "Kenaikan jenjang butuh 60 AK kumulatif untuk naik ke Mahir. Anda dapat mengusulkan kenaikan jabatan dan pangkat.";
        } else if (jabatanSekarang.includes('Mahir') && golonganSekarang === 'III/b') {
          return "Kenaikan jenjang butuh 100 AK kumulatif untuk naik ke Penyelia. Anda dapat mengusulkan kenaikan jabatan dan pangkat.";
        }
      }
    }
    return `Kenaikan pangkat ke ${golonganBerikutnya}, dapat diusulkan terpisah tanpa menunggu kenaikan jabatan.`;
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
}> = ({
  title,
  akSaatIni,
  akRealSaatIni,
  kebutuhanAK,
  type,
  bulanDibutuhkan,
  akTambahan,
  penjelasan,
  kekuranganAK,
  bisaUsul,
  isKenaikanJenjang = false,
  target
}) => {
  const { theme } = useTheme();
  const isTidakAda = title.includes('Tidak Ada') || kebutuhanAK === 0;
  const progressPercentage = isTidakAda ? 0 : Math.min(akRealSaatIni / kebutuhanAK * 100, 100);
  const finalPercentage = bisaUsul ? 100 : progressPercentage;

  const getColorClass = () => {
    if (isTidakAda) return 'bg-gray-400';
    if (bisaUsul) return 'bg-green-500';
    if (finalPercentage >= 80) return 'bg-blue-500';
    if (finalPercentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getStatusVariant = () => {
    if (isTidakAda) return 'secondary';
    if (bisaUsul) return 'default';
    if (bulanDibutuhkan <= 6) return 'default';
    if (bulanDibutuhkan <= 12) return 'secondary';
    if (bulanDibutuhkan <= 24) return 'destructive';
    return 'destructive';
  };

  const getStatusText = () => {
    if (isTidakAda) return 'Level tertinggi';
    if (bisaUsul) {
      if (isKenaikanJenjang && type === 'jabatan') return 'Bisa usul Jabatan & Pangkat!';
      return 'Bisa diusulkan!';
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
    if (bulanDibutuhkan <= 24) return `Butuh waktu (${estimasi})`;
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
          <Badge variant={getStatusVariant() as any}>
            {getStatusText()}
          </Badge>
        </div>
        <CardDescription>{target}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isTidakAda && penjelasan && (
          <div className="p-3 bg-blue-50 rounded-lg border">
            <p className="text-sm text-blue-700">{penjelasan}</p>
          </div>
        )}

        {!isTidakAda && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="font-semibold">{finalPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={finalPercentage} className={getColorClass()} />
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
              isTidakAda ? 'text-gray-600' : 
              kekuranganAK > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {isTidakAda ? 'Maksimal' : kekuranganAK.toFixed(2)}
            </div>
          </div>
        </div>

        {bisaUsul && !isTidakAda && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <span className="text-green-800 text-sm font-semibold">
              {isKenaikanJenjang && type === 'jabatan' 
                ? '✅ Bisa mengusulkan kenaikan JABATAN dan PANGKAT sekaligus!' 
                : '✅ Sudah memenuhi syarat untuk diusulkan!'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
    
    if (tahunKerja > 0 && bulanKerja > 0) {
      return `${tahunKerja} tahun ${bulanKerja} bulan`;
    } else if (tahunKerja > 0) {
      return `${tahunKerja} tahun`;
    } else {
      return `${bulanKerja} bulan`;
    }
  } catch {
    return '-';
  }
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
      
      if (tahunKerja > 0 && bulanKerja > 0) {
        return `${tahunKerja} tahun ${bulanKerja} bulan`;
      } else if (tahunKerja > 0) {
        return `${tahunKerja} tahun`;
      } else {
        return `${bulanKerja} bulan`;
      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nama</Label>
              <p className="font-semibold">{karyawan.nama}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">NIP</Label>
              <p className="font-medium text-sm">{karyawan.nip}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Jenis Kelamin</Label>
              <p className="font-medium">{nipData.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Pangkat / Golongan</Label>
              <p className="font-semibold">{karyawan.pangkat} ({karyawan.golongan})</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TMT Pangkat</Label>
              <p className="font-medium">{formatTanggal(karyawan.tmtPangkat)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TMT PNS</Label>
              <p className="font-medium">{formatTanggal(nipData.tahunMasuk)}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Jabatan</Label>
              <p className="font-medium">{karyawan.jabatan}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TMT Jabatan</Label>
              <p className="font-medium">{formatTanggal(karyawan.tmtJabatan)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unit Kerja</Label>
              <p className="font-medium">{karyawan.unitKerja}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Pendidikan</Label>
              <p className="font-medium">{karyawan.pendidikan}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Masa Kerja</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{hitungMasaKerja(nipData.tahunMasuk)}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Angka Kredit Saat Ini</Label>
              <p className="text-2xl font-bold text-blue-600">{akRealSaatIni.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Awal: {karyawan.akKumulatif.toFixed(2)} + Tambahan: {akTambahan.toFixed(2)}
              </p>
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
}> = ({ selectedValue, onValueChange }) => {
  const predikatOptions = [
    { value: 1.50, label: 'Sangat Baik (Performa luar biasa)' },
    { value: 1.00, label: 'Baik (Performa Baik)' },
    { value: 0.75, label: 'Cukup (Perlu peningkatan)' },
    { value: 0.50, label: 'Kurang (Perlu perbaikan serius)' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estimasi Predikat Kinerja</CardTitle>
        <CardDescription>Pilih predikat kinerja untuk simulasi perhitungan</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedValue.toString()} onValueChange={(value) => onValueChange(parseFloat(value))}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {predikatOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent">
                <RadioGroupItem value={option.value.toString()} id={`predikat-${option.value}`} />
                <Label htmlFor={`predikat-${option.value}`} className="flex flex-col">
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-sm text-muted-foreground">{option.description}</span>
                  <span className="text-lg font-bold text-blue-600">{option.value * 100}%</span>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
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
  const [filterKategori, setFilterKategori] = useState<'Semua' | 'Keahlian' | 'Keterampilan'>('Semua');

  const getKaryawanWithAKReal = (karyawan: Karyawan) => {
    const akTambahan = AngkaKreditCalculator.hitungAKTambahan(karyawan);
    const akRealSaatIni = AngkaKreditCalculator.hitungAKRealSaatIni(karyawan);
    return { ...karyawan, akTambahan, akRealSaatIni };
  };

  const karyawanWithAKReal = karyawanList.map(getKaryawanWithAKReal);
  
  const filteredKaryawan = karyawanWithAKReal.filter(karyawan => {
    const matchesSearch = karyawan.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         karyawan.nip.includes(searchTerm) || 
                         karyawan.unitKerja.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKategori = filterKategori === 'Semua' || karyawan.kategori === filterKategori;
    return matchesSearch && matchesKategori;
  });

  const totalKaryawan = karyawanList.length;
  const aktifKaryawan = karyawanList.filter(k => k.status === 'Aktif').length;
  const keahlianKaryawan = karyawanList.filter(k => k.kategori === 'Keahlian').length;
  const keterampilanKaryawan = karyawanList.filter(k => k.kategori === 'Keterampilan').length;

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
      <CardHeader>
        <CardTitle>Penghitungan Angka Kredit</CardTitle>
        <CardDescription>Berdasarkan Peraturan BKN No. 3 Tahun 2023</CardDescription>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{totalKaryawan}</div>
            <div className="text-sm text-blue-800">Total Karyawan</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{aktifKaryawan}</div>
            <div className="text-sm text-green-800">Status Aktif</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{keahlianKaryawan}</div>
            <div className="text-sm text-purple-800">Jalur Keahlian</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">{keterampilanKaryawan}</div>
            <div className="text-sm text-orange-800">Jalur Keterampilan</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIP, atau unit kerja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterKategori} onValueChange={(value: any) => setFilterKategori(value)}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Kategori</SelectItem>
              <SelectItem value="Keahlian">Keahlian</SelectItem>
              <SelectItem value="Keterampilan">Keterampilan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredKaryawan.length === 0 ? (
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
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-[220px]">NIP</TableHead>
                  <TableHead>Golongan</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead className="text-right">AK Awal</TableHead>
                  <TableHead className="text-right">AK Tambahan</TableHead>
                  <TableHead className="text-right">AK Real</TableHead>
                  <TableHead className="text-right w-[70px]">Detail</TableHead> {/* Sesuaikan width */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKaryawan.map((karyawan) => (
                  <TableRow key={karyawan.nip} className={selectedNip === karyawan.nip ? 'bg-accent' : ''}>
                    <TableCell className="font-medium">{karyawan.nama}</TableCell>
                    <TableCell>
                      <code className="relative rounded bg-muted px-2 py-1 font-mono text-sm whitespace-nowrap">
                        {karyawan.nip}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{karyawan.golongan}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{karyawan.jabatan}</TableCell>
                    <TableCell className="text-right">{karyawan.akKumulatif.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600">+{karyawan.akTambahan.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default" className="font-bold">
                        {karyawan.akRealSaatIni.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onSelect(karyawan)}
                        className="h-8 w-8 p-0 hover:bg-accent"
                        title="Masuk ke detail karyawan"
                      >
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
          Menampilkan {filteredKaryawan.length} dari {totalKaryawan} karyawan
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-blue-700 font-medium">Angka Kredit Awal</div>
            <div className="text-2xl font-bold text-blue-800">{karyawan.akKumulatif.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-green-700 font-medium">Angka Kredit Tambahan</div>
            <div className="text-2xl font-bold text-green-800">+{estimasi.akTambahan.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-purple-700 font-medium">Angka Kredit Akhir Saat Ini</div>
            <div className="text-2xl font-bold text-purple-800">{estimasi.akRealSaatIni.toFixed(2)}</div>
          </div>
        </div>

        {estimasi.isKenaikanJenjang && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">Kenaikan Jenjang</h4>
                <p className="text-yellow-700 text-sm">
                  Ini adalah kenaikan JENJANG. Ketika syarat terpenuhi, Anda dapat mengusulkan kenaikan{' '}
                  <strong>JABATAN dan PANGKAT sekaligus</strong>. Pangkat akan mengikuti 1-2 bulan setelah kenaikan jabatan.
                </p>
              </div>
            </div>
          </div>
        )}

        <PredikatKinerjaRadio selectedValue={predikatAsumsi} onValueChange={setPredikatAsumsi} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimasi waktu</span>
                <span className="font-semibold text-blue-600">{estimasiPangkat.formatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={estimasi.bisaUsulPangkat ? 'default' : 'secondary'}>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={estimasi.bisaUsulJabatan ? 'default' : 'secondary'}>
                  {estimasi.bisaUsulJabatan ? '✅ Bisa diusulkan' : '❌ Belum memenuhi'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {estimasi.isKenaikanJenjang && estimasi.bisaUsulJabatan && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-green-800 font-semibold">
              🎉 SELAMAT! Anda sudah memenuhi syarat kenaikan JENJANG. Dapat mengusulkan kenaikan{' '}
              <strong>JABATAN dan PANGKAT sekaligus</strong>.
            </p>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg border">
          <p className="text-blue-800 text-sm">
            <strong>Informasi:</strong> Estimasi berdasarkan predikat kinerja {predikatAsumsi * 100}% dengan perolehan{' '}
            {estimasi.akPerBulan} AK/bulan. Perhitungan sesuai Peraturan BKN No. 3 Tahun 2023. AK Akhir saat ini sudah termasuk
            akumulasi sejak TMT Jabatan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const InputKinerjaForm: React.FC<{
  karyawan: Karyawan;
  onSave: (input: InputKinerja) => void;
}> = ({ karyawan, onSave }) => {
  const [formData, setFormData] = useState({
    periode: new Date().toISOString().slice(0, 7),
    jenisPenilaian: 'Tahunan' as 'Tahunan' | 'Periodik',
    bulanPeriodik: 12,
    predikatKinerja: 1.00,
    keterangan: ''
  });

  const handleCalculate = () => {
    const akDiperoleh = AngkaKreditCalculator.hitungAK(
      karyawan.jabatan, 
      formData.predikatKinerja, 
      formData.jenisPenilaian === 'Periodik', 
      formData.bulanPeriodik
    );

    const newInput: InputKinerja = {
      idInput: `KIN-${Date.now()}`,
      nip: karyawan.nip,
      periode: formData.periode,
      jenisPenilaian: formData.jenisPenilaian,
      bulanPeriodik: formData.bulanPeriodik,
      predikatKinerja: formData.predikatKinerja,
      akDiperoleh,
      jabatanSaatInput: karyawan.jabatan,
      tanggalInput: new Date().toISOString().split('T')[0],
      inputOleh: 'Admin',
      keterangan: formData.keterangan
    };

    onSave(newInput);
    setFormData({
      periode: new Date().toISOString().slice(0, 7),
      jenisPenilaian: 'Tahunan',
      bulanPeriodik: 12,
      predikatKinerja: 1.00,
      keterangan: ''
    });
  };

  const currentKoefisien = AngkaKreditCalculator.getKoefisien(karyawan.jabatan);
  const calculatedAK = AngkaKreditCalculator.hitungAK(
    karyawan.jabatan, 
    formData.predikatKinerja, 
    formData.jenisPenilaian === 'Periodik', 
    formData.bulanPeriodik
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Kinerja - {karyawan.nama}</CardTitle>
        <CardDescription>Masukkan data kinerja untuk menghitung angka kredit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="periode">Periode Penilaian</Label>
            <Input
              id="periode"
              type="month"
              value={formData.periode}
              onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jenisPenilaian">Jenis Penilaian</Label>
            <Select 
              value={formData.jenisPenilaian} 
              onValueChange={(value: 'Tahunan' | 'Periodik') => setFormData({ ...formData, jenisPenilaian: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tahunan">Tahunan</SelectItem>
                <SelectItem value="Periodik">Periodik</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.jenisPenilaian === 'Periodik' && (
          <div className="space-y-2">
            <Label htmlFor="bulanPeriodik">Bulan Periodik</Label>
            <Input
              id="bulanPeriodik"
              type="number"
              min="1"
              max="11"
              value={formData.bulanPeriodik}
              onChange={(e) => setFormData({ ...formData, bulanPeriodik: parseInt(e.target.value) })}
            />
          </div>
        )}

        <PredikatKinerjaRadio 
          selectedValue={formData.predikatKinerja} 
          onValueChange={(value) => setFormData({ ...formData, predikatKinerja: value })} 
        />

        <div className="space-y-2">
          <Label htmlFor="keterangan">Keterangan</Label>
          <Input
            id="keterangan"
            placeholder="Capaian SKP, evaluasi, dll."
            value={formData.keterangan}
            onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Perhitungan Angka Kredit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Jabatan</Label>
                <p className="font-semibold">{karyawan.jabatan}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Koefisien</Label>
                <p className="font-semibold">{currentKoefisien}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Predikat</Label>
                <p className="font-semibold">{formData.predikatKinerja * 100}%</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hasil AK</Label>
                <p className="text-2xl font-bold text-blue-600">{calculatedAK}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleCalculate} className="w-full">
          Simpan Data Kinerja
        </Button>
      </CardContent>
    </Card>
  );
};

const EmployeeDashboard: React.FC<{
  karyawan: Karyawan;
}> = ({ karyawan }) => {
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
  const penjelasanKebutuhanPangkat = AngkaKreditCalculator.getPenjelasanKebutuhan(
    karyawan.jabatan, 
    karyawan.kategori, 
    estimasi.isKenaikanJenjang, 
    karyawan.golongan, 
    estimasi.golonganBerikutnya
  );
  const penjelasanKebutuhanJabatan = AngkaKreditCalculator.getPenjelasanKebutuhan(
    karyawan.jabatan, 
    karyawan.kategori, 
    estimasi.isKenaikanJenjang, 
    karyawan.golongan, 
    estimasi.golonganBerikutnya
  );
  const rekomendasiKarir = AngkaKreditCalculator.getRekomendasiKarir(karyawan);

  return (
    <div className="space-y-6">
      <BiodataCard 
        karyawan={karyawan} 
        akRealSaatIni={estimasi.akRealSaatIni} 
        akTambahan={estimasi.akTambahan} 
      />

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

const KarirDashboard: React.FC = () => {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [inputHistory, setInputHistory] = useState<InputKinerja[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input'>('dashboard');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKaryawanData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "read",
          range: `${SHEET_NAME}!A:L`
        }
      });

      if (error) throw error;

      const rows = data.values || [];
      const karyawanData: Karyawan[] = rows.slice(1)
        .filter((row: any[]) => row.length > 0 && row[0])
        .map((row: any[]) => {
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
            alamat: ''
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

  const handleSaveInput = (newInput: InputKinerja) => {
    setInputHistory([...inputHistory, newInput]);
    if (selectedKaryawan) {
      const updatedKaryawanList = karyawanList.map(k => 
        k.nip === selectedKaryawan.nip 
          ? { ...k, akKumulatif: k.akKumulatif + newInput.akDiperoleh }
          : k
      );
      setKaryawanList(updatedKaryawanList);
      const updatedSelected = updatedKaryawanList.find(k => k.nip === selectedKaryawan.nip);
      if (updatedSelected) setSelectedKaryawan(updatedSelected);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {!selectedKaryawan ? (
        <EmployeeTable
          karyawanList={karyawanList}
          onSelect={setSelectedKaryawan}
          selectedNip={null}
          loading={loading}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedKaryawan(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedKaryawan.nama}</h1>
                <p className="text-muted-foreground">{selectedKaryawan.nip}</p>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="input" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Input Kinerja
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsContent value="dashboard" className="space-y-6">
              <EmployeeDashboard karyawan={selectedKaryawan} />
            </TabsContent>
            
            <TabsContent value="input" className="space-y-6">
              <InputKinerjaForm karyawan={selectedKaryawan} onSave={handleSaveInput} />
              
              {inputHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Riwayat Input Kinerja</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Periode</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead>Predikat</TableHead>
                          <TableHead className="text-right">AK Diperoleh</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inputHistory
                          .filter(input => input.nip === selectedKaryawan.nip)
                          .map((input) => (
                            <TableRow key={input.idInput}>
                              <TableCell>{input.periode}</TableCell>
                              <TableCell>{input.jenisPenilaian}</TableCell>
                              <TableCell>{input.predikatKinerja * 100}%</TableCell>
                              <TableCell className="text-right font-semibold">
                                +{input.akDiperoleh}
                              </TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default KarirDashboard;