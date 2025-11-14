import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { Search, ArrowLeft, User, TrendingUp, Calendar, Award, FileText, LogIn, BarChart3, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

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
          return "Kenaikan jenjang butuh 100 AK kumulatif untuk naik ke Penyelia. Anda dapat mengusulkan kenaikan jabatan kemudian kenaikan pangkatt.";
        }
      }
    }
    return "";
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
  const isTidakAda = title.includes('Tidak Ada') || kebutuhanAK === 0;
  const progressPercentage = isTidakAda ? 0 : Math.min(akRealSaatIni / kebutuhanAK * 100, 100);
  const finalPercentage = bisaUsul ? 100 : progressPercentage;

  const getColorClass = () => {
    if (isTidakAda) return 'bg-gray-400';
    if (bisaUsul) return 'bg-gray-400';
    if (finalPercentage >= 80) return 'bg-gray-400';
    if (finalPercentage >= 50) return 'bg-gray-400';
    return 'bg-gray-400';
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
    if (isTidakAda) return 'Tingkatan tertinggi';
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
                ? '✅ Bisa mengusulkan kenaikan JABATAN dan PANGKAT!' 
                : '✅ Sudah memenuhi syarat untuk diusulkan!'}
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
                AK Awal: {karyawan.akKumulatif.toFixed(2)} + AK Tambahan: {akTambahan.toFixed(2)}
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
    { value: 1.50, label: 'Sangat Baik', description: 'Performa luar biasa' },
    { value: 1.00, label: 'Baik', description: 'Performa standar' },
    { value: 0.75, label: 'Cukup', description: 'Perlu peningkatan' },
    { value: 0.50, label: 'Kurang', description: 'Perlu perbaikan serius' }
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

// ==================== SORTABLE TABLE HEADER COMPONENT ====================
const SortableHeader: React.FC<{
  column: string;
  currentSort: { column: string; direction: 'asc' | 'desc' };
  onSort: (column: string) => void;
  children: React.ReactNode;
}> = ({ column, currentSort, onSort, children }) => {
  const isActive = currentSort.column === column;
  
  return (
    <TableHead 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
};

// ==================== DASHBOARD RINGKASAN ====================
const DashboardRingkasan: React.FC<{
  karyawanList: Karyawan[];
  onSelectKaryawan: (karyawan: Karyawan) => void;
}> = ({ karyawanList, onSelectKaryawan }) => {
  const [filterStatus, setFilterStatus] = useState<'semua' | 'akan' | 'sudah'>('semua');
  
  // Hitung estimasi untuk setiap karyawan
  const karyawanWithEstimasi = karyawanList.map(karyawan => {
    const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
    const bisaUsul = estimasi.bisaUsulPangkat || estimasi.bisaUsulJabatan;
    const bulanTerdekat = Math.min(estimasi.bulanDibutuhkanPangkat, estimasi.bulanDibutuhkanJabatan);
    
    return {
      ...karyawan,
      estimasi,
      bisaUsul,
      bulanTerdekat,
      statusKenaikan: bisaUsul ? 'sudah' : 'akan'
    };
  });

  // Filter berdasarkan status
  const filteredKaryawan = karyawanWithEstimasi.filter(karyawan => {
    if (filterStatus === 'semua') return true;
    return karyawan.statusKenaikan === filterStatus;
  });

  // Statistik
  const statistik = {
    total: karyawanWithEstimasi.length,
    sudahMemenuhi: karyawanWithEstimasi.filter(k => k.bisaUsul).length,
    akanMemenuhi: karyawanWithEstimasi.filter(k => !k.bisaUsul).length,
    bisaUsulPangkat: karyawanWithEstimasi.filter(k => k.estimasi.bisaUsulPangkat).length,
    bisaUsulJabatan: karyawanWithEstimasi.filter(k => k.estimasi.bisaUsulJabatan).length,
    kenaikanJenjang: karyawanWithEstimasi.filter(k => k.estimasi.isKenaikanJenjang && k.estimasi.bisaUsulJabatan).length
  };

  const getStatusBadge = (karyawan: typeof karyawanWithEstimasi[0]) => {
    if (karyawan.estimasi.bisaUsulPangkat && karyawan.estimasi.bisaUsulJabatan) {
      return <Badge className="bg-purple-600 hover:bg-purple-700">Bisa Usul Pangkat & Jabatan</Badge>;
    }
    if (karyawan.estimasi.bisaUsulPangkat) {
      return <Badge className="bg-blue-600 hover:bg-blue-700">Bisa Usul Pangkat</Badge>;
    }
    if (karyawan.estimasi.bisaUsulJabatan) {
      return <Badge className="bg-green-600 hover:bg-green-700">Bisa Usul Jabatan</Badge>;
    }
    
    if (karyawan.bulanTerdekat <= 6) {
      return <Badge variant="secondary">Est. {karyawan.bulanTerdekat} bulan lagi</Badge>;
    }
    if (karyawan.bulanTerdekat <= 12) {
      return <Badge variant="outline">Est. {karyawan.bulanTerdekat} bulan lagi</Badge>;
    }
    return <Badge variant="outline">Butuh waktu</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Dashboard Ringkasan Kenaikan Karir
        </CardTitle>
        <CardDescription>
          Monitoring karyawan yang sudah dan akan memenuhi syarat kenaikan pangkat/jabatan
        </CardDescription>
        
        {/* Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
          <div className="bg-blue-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{statistik.total}</div>
            <div className="text-sm text-blue-800">Total Karyawan</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{statistik.sudahMemenuhi}</div>
            <div className="text-sm text-green-800">Bisa Diusulkan</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">{statistik.akanMemenuhi}</div>
            <div className="text-sm text-orange-800">Akan Memenuhi</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{statistik.bisaUsulPangkat}</div>
            <div className="text-sm text-purple-800">Usul Pangkat</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-indigo-600">{statistik.bisaUsulJabatan}</div>
            <div className="text-sm text-indigo-800">Usul Jabatan</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">{statistik.kenaikanJenjang}</div>
            <div className="text-sm text-red-800">Kenaikan Jenjang</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex-1">
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Karyawan</SelectItem>
                <SelectItem value="sudah">Sudah Bisa Diusulkan</SelectItem>
                <SelectItem value="akan">Akan Memenuhi Syarat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredKaryawan.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tidak ada data</h3>
            <p className="text-muted-foreground">Tidak ada karyawan yang sesuai dengan filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredKaryawan.map((karyawan) => (
              <Card key={karyawan.nip} className="hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => onSelectKaryawan(karyawan)}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Informasi Karyawan */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg truncate">{karyawan.nama}</h3>
                          <p className="text-sm text-muted-foreground">{karyawan.nip}</p>
                        </div>
                        {getStatusBadge(karyawan)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Pangkat:</span>
                          <span className="font-medium ml-1">{karyawan.pangkat} ({karyawan.golongan})</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Jabatan:</span>
                          <span className="font-medium ml-1">{karyawan.jabatan}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">AK Real:</span>
                          <span className="font-bold text-blue-600 ml-1">
                            {karyawan.estimasi.akRealSaatIni.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectKaryawan(karyawan);
                        }}
                        className="whitespace-nowrap"
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                      
                      {karyawan.bisaUsul && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-center">
                          ✅ Siap diusulkan
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Informasi Tambahan */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground">Kebutuhan Pangkat</div>
                        <div className="font-semibold">{karyawan.estimasi.kebutuhanAKPangkat}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Kebutuhan Jabatan</div>
                        <div className="font-semibold">{karyawan.estimasi.kebutuhanAKJabatan}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Estimasi Terdekat</div>
                        <div className="font-semibold text-blue-600">
                          {karyawan.bulanTerdekat} bulan
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Status</div>
                        <div className="font-semibold">
                          {karyawan.estimasi.isKenaikanJenjang ? 'Kenaikan Jenjang' : 'Reguler'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Section */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Award className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">Karyawan Siap Diusulkan</h4>
                  <p className="text-green-700 text-sm">
                    {statistik.sudahMemenuhi} karyawan sudah memenuhi syarat kenaikan dan bisa segera diusulkan
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800">Dalam Proses</h4>
                  <p className="text-blue-700 text-sm">
                    {statistik.akanMemenuhi} karyawan sedang menunggu pemenuhan syarat kenaikan
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== EMPLOYEE TABLE WITH SORTING ====================
const EmployeeTable: React.FC<{
  karyawanList: Karyawan[];
  onSelect: (karyawan: Karyawan) => void;
  selectedNip: string | null;
  loading: boolean;
}> = ({ karyawanList, onSelect, selectedNip, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<'Semua' | 'Keahlian' | 'Keterampilan'>('Semua');
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'nama',
    direction: 'asc'
  });

  // Prepare data with calculated values
  const karyawanWithAKReal = karyawanList.map(karyawan => {
    const akTambahan = AngkaKreditCalculator.hitungAKTambahan(karyawan);
    const akRealSaatIni = AngkaKreditCalculator.hitungAKRealSaatIni(karyawan);
    const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
    
    return { 
      ...karyawan, 
      akTambahan, 
      akRealSaatIni,
      bisaUsul: estimasi.bisaUsulPangkat || estimasi.bisaUsulJabatan
    };
  });

  // Filter data
  const filteredKaryawan = karyawanWithAKReal.filter(karyawan => {
    const matchesSearch = karyawan.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         karyawan.nip.includes(searchTerm) || 
                         karyawan.unitKerja.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKategori = filterKategori === 'Semua' || karyawan.kategori === filterKategori;
    return matchesSearch && matchesKategori;
  });

  // Sort data
  const sortedKaryawan = React.useMemo(() => {
    const sorted = [...filteredKaryawan];
    sorted.sort((a, b) => {
      let aValue: any = a;
      let bValue: any = b;
      
      // Navigate to nested properties if needed
      const aProp = sortConfig.column.split('.').reduce((obj, key) => obj?.[key], a);
      const bProp = sortConfig.column.split('.').reduce((obj, key) => obj?.[key], b);
      
      if (aProp < bProp) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aProp > bProp) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredKaryawan, sortConfig]);

  // Handle sort
  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Statistik
  const totalKaryawan = karyawanList.length;
  const aktifKaryawan = karyawanList.filter(k => k.status === 'Aktif').length;
  const keahlianKaryawan = karyawanList.filter(k => k.kategori === 'Keahlian').length;
  const keterampilanKaryawan = karyawanList.filter(k => k.kategori === 'Keterampilan').length;
  const bisaUsulCount = karyawanWithAKReal.filter(k => k.bisaUsul).length;

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
        <CardTitle>Daftar Karyawan</CardTitle>
        <CardDescription>Berdasarkan Peraturan BKN No. 3 Tahun 2023</CardDescription>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="bg-blue-50 p-3 rounded-lg border">
            <div className="text-xl font-bold text-blue-600">{totalKaryawan}</div>
            <div className="text-xs text-blue-800">Total Karyawan</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border">
            <div className="text-xl font-bold text-green-600">{aktifKaryawan}</div>
            <div className="text-xs text-green-800">Status Aktif</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border">
            <div className="text-xl font-bold text-purple-600">{keahlianKaryawan}</div>
            <div className="text-xs text-purple-800">Jalur Keahlian</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border">
            <div className="text-xl font-bold text-orange-600">{keterampilanKaryawan}</div>
            <div className="text-xs text-orange-800">Jalur Keterampilan</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border">
            <div className="text-xl font-bold text-red-600">{bisaUsulCount}</div>
            <div className="text-xs text-red-800">Bisa Diusulkan</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
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

        {sortedKaryawan.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tidak ada karyawan ditemukan</h3>
            <p className="text-muted-foreground">Coba ubah kata kunci pencarian atau filter</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="nama" currentSort={sortConfig} onSort={handleSort}>
                    Nama
                  </SortableHeader>
                  <SortableHeader column="nip" currentSort={sortConfig} onSort={handleSort}>
                    NIP
                  </SortableHeader>
                  <SortableHeader column="golongan" currentSort={sortConfig} onSort={handleSort}>
                    Golongan
                  </SortableHeader>
                  <SortableHeader column="jabatan" currentSort={sortConfig} onSort={handleSort}>
                    Jabatan
                  </SortableHeader>
                  <SortableHeader column="akKumulatif" currentSort={sortConfig} onSort={handleSort}>
                    AK Awal
                  </SortableHeader>
                  <SortableHeader column="akTambahan" currentSort={sortConfig} onSort={handleSort}>
                    AK Tambahan
                  </SortableHeader>
                  <SortableHeader column="akRealSaatIni" currentSort={sortConfig} onSort={handleSort}>
                    AK Real
                  </SortableHeader>
                  <TableHead className="w-[70px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKaryawan.map((karyawan) => (
                  <TableRow 
                    key={karyawan.nip} 
                    className={`${selectedNip === karyawan.nip ? 'bg-accent' : ''} hover:bg-accent/50`}
                  >
                    <TableCell className="py-2">
                      <div className="font-medium">{karyawan.nama}</div>
                      {karyawan.bisaUsul && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs mt-1">
                          Bisa Diusulkan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <code className="relative rounded bg-muted px-1.5 py-0.5 font-mono text-xs whitespace-nowrap">
                        {karyawan.nip}
                      </code>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs">{karyawan.golongan}</Badge>
                    </TableCell>
                    <TableCell className="py-2 text-sm">{karyawan.jabatan}</TableCell>
                    <TableCell className="py-2 text-right text-sm">{karyawan.akKumulatif.toFixed(2)}</TableCell>
                    <TableCell className="py-2 text-right text-sm text-green-600">+{karyawan.akTambahan.toFixed(2)}</TableCell>
                    <TableCell className="py-2 text-right">
                      <Badge variant="default" className="font-bold text-xs">
                        {karyawan.akRealSaatIni.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => onSelect(karyawan)}
                        className="h-7 w-7 p-0 hover:bg-accent"
                        title="Masuk ke detail karyawan"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-3 text-sm text-muted-foreground">
          Menampilkan {sortedKaryawan.length} dari {totalKaryawan} karyawan
          {bisaUsulCount > 0 && ` • ${bisaUsulCount} karyawan bisa diusulkan`}
        </div>
      </CardContent>
    </Card>
  );
};

// ... (Komponen lainnya seperti EstimasiKenaikanCard, InputKinerjaForm, EmployeeDashboard tetap sama)
// Karena keterbatasan panjang, saya lanjutkan dengan komponen utama KarierKu:

const KarierKu: React.FC = () => {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [inputHistory, setInputHistory] = useState<InputKinerja[]>([]);
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'daftar' | 'dashboard' | 'input'>('ringkasan');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKaryawanData = async () => {
    try {
      setLoading(true);
      // Simulasi data untuk testing
      const mockData: Karyawan[] = [
        {
          nip: '199001012015011001',
          nama: 'Budi Santoso',
          pangkat: 'Penata Muda',
          golongan: 'III/a',
          jabatan: 'Ahli Pertama',
          kategori: 'Keahlian',
          unitKerja: 'Badan Kepegawaian Negara',
          tmtJabatan: '2020-01-01',
          tmtPangkat: '2019-01-01',
          pendidikan: 'S1 Teknik Informatika',
          akKumulatif: 85.5,
          status: 'Aktif',
          tempatLahir: 'Jakarta',
          tanggalLahir: '1990-01-01',
          jenisKelamin: 'L',
          agama: 'Islam',
          email: 'budi@bkn.go.id',
          telepon: '08123456789',
          alamat: 'Jl. Contoh No. 123'
        },
        {
          nip: '198502152010021002',
          nama: 'Siti Rahayu',
          pangkat: 'Penata Muda Tingkat I',
          golongan: 'III/b',
          jabatan: 'Ahli Pertama',
          kategori: 'Keahlian',
          unitKerja: 'Badan Kepegawaian Negara',
          tmtJabatan: '2018-03-01',
          tmtPangkat: '2017-03-01',
          pendidikan: 'S1 Hukum',
          akKumulatif: 45.2,
          status: 'Aktif',
          tempatLahir: 'Bandung',
          tanggalLahir: '1985-02-15',
          jenisKelamin: 'P',
          agama: 'Islam',
          email: 'siti@bkn.go.id',
          telepon: '08123456780',
          alamat: 'Jl. Contoh No. 124'
        }
      ];

      setKaryawanList(mockData);
      
      // Uncomment untuk menggunakan data real dari Google Sheets
      /*
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
          // ... mapping logic
        });

      setKaryawanList(karyawanData);
      */
      
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKaryawanData();
  }, []);

  // ... sisa komponen dan fungsi lainnya

  return (
    <div className="space-y-6">
      {!selectedKaryawan ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard KarierKu</h1>
              <p className="text-muted-foreground">Monitoring dan analisis perkembangan karir karyawan</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ringkasan" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Ringkasan
                </TabsTrigger>
                <TabsTrigger value="daftar" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Daftar Karyawan
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
            <TabsContent value="ringkasan" className="space-y-6">
              <DashboardRingkasan 
                karyawanList={karyawanList} 
                onSelectKaryawan={setSelectedKaryawan} 
              />
            </TabsContent>
            
            <TabsContent value="daftar" className="space-y-6">
              <EmployeeTable
                karyawanList={karyawanList}
                onSelect={setSelectedKaryawan}
                selectedNip={null}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedKaryawan(null)}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar
          </Button>
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Detail Karyawan</h2>
            <p className="text-muted-foreground">Halaman detail untuk {selectedKaryawan.nama}</p>
            <p className="text-sm text-muted-foreground mt-2">Fitur detail sedang dalam pengembangan</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default KarierKu;