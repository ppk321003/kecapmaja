// App.tsx - VERSI FINAL DENGAN INTEGRASI TEMA
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';

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
  // Koefisien tahunan sesuai Peraturan BKN Pasal 13
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

  // Hitung AK tambahan sejak TMT Jabatan sampai hari ini
  static hitungAKTambahan(karyawan: Karyawan, predikatAsumsi: number = 1.00): number {
    const tmtJabatan = new Date(karyawan.tmtJabatan);
    const hariIni = new Date();
    
    if (tmtJabatan > hariIni) return 0;
    
    const selisihBulan = this.hitungSelisihBulan(tmtJabatan, hariIni);
    if (selisihBulan <= 0) return 0;
    
    const koefisien = this.getKoefisien(karyawan.jabatan);
    const akPerBulan = (predikatAsumsi * koefisien) / 12;
    const akTambahan = selisihBulan * akPerBulan;
    
    return Number(akTambahan.toFixed(2));
  }

  // Hitung AK Real saat ini
  static hitungAKRealSaatIni(karyawan: Karyawan, predikatAsumsi: number = 1.00): number {
    const akTambahan = this.hitungAKTambahan(karyawan, predikatAsumsi);
    const akReal = karyawan.akKumulatif + akTambahan;
    return Number(akReal.toFixed(2));
  }

  // Hitung selisih bulan antara dua tanggal
  static hitungSelisihBulan(tanggalAwal: Date, tanggalAkhir: Date): number {
    const tahunAwal = tanggalAwal.getFullYear();
    const bulanAwal = tanggalAwal.getMonth();
    const tahunAkhir = tanggalAkhir.getFullYear();
    const bulanAkhir = tanggalAkhir.getMonth();
    
    return (tahunAkhir - tahunAwal) * 12 + (bulanAkhir - bulanAwal);
  }

  static hitungAK(
    jabatan: string, 
    predikat: number, 
    isPeriodik: boolean = false, 
    bulanPeriodik: number = 0
  ): number {
    const koefisien = this.getKoefisien(jabatan);
    let angkaKredit = predikat * koefisien;
    
    if (isPeriodik && bulanPeriodik > 0) {
      angkaKredit = (bulanPeriodik / 12) * predikat * koefisien;
    }
    
    return Math.round(angkaKredit * 100) / 100;
  }

  // Kebutuhan AK untuk kenaikan pangkat
  static getKebutuhanPangkat(golonganSekarang: string, kategori: string): number {
    const kebutuhanKeahlian: { [key: string]: number } = {
      'III/a': 50,   // Ahli Pertama III/a → III/b
      'III/b': 50,   // Ahli Pertama III/b → III/c
      'III/c': 100,  // Ahli Muda III/c → III/d
      'III/d': 100,  // Ahli Muda III/d → IV/a
      'IV/a': 150,   // Ahli Madya IV/a → IV/b
      'IV/b': 150,   // Ahli Madya IV/b → IV/c
      'IV/c': 150,   // Ahli Madya IV/c → IV/d
      'IV/d': 200    // Ahli Utama IV/d → IV/e
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'II/a': 15,    // Pemula → Terampil
      'II/b': 20,    // Terampil II/b → II/c
      'II/c': 20,    // Terampil II/c → II/d
      'II/d': 20,    // Terampil → Mahir
      'III/a': 50,   // Mahir III/a → III/b
      'III/b': 50,   // Mahir → Penyelia
      'III/c': 100   // Penyelia III/c → III/d
    };
    
    const kebutuhan = kategori === 'Keahlian' ? kebutuhanKeahlian : kebutuhanKeterampilan;
    return kebutuhan[golonganSekarang] || 0;
  }

  // Kebutuhan AK kumulatif untuk kenaikan jabatan
  static getKebutuhanJabatan(jabatanSekarang: string, kategori: string): number {
    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100,
      'Ahli Muda': 200,
      'Ahli Madya': 450,
      'Ahli Utama': 0
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Terampil': 60,
      'Mahir': 100,
      'Penyelia': 0
    };

    if (kategori === 'Keahlian') {
      for (const [key, value] of Object.entries(kebutuhanKeahlian)) {
        if (jabatanSekarang.includes(key)) return value;
      }
      if (jabatanSekarang.includes('Pertama')) return 100;
      if (jabatanSekarang.includes('Muda')) return 200;
      if (jabatanSekarang.includes('Madya')) return 450;
    } else {
      for (const [key, value] of Object.entries(kebutuhanKeterampilan)) {
        if (jabatanSekarang.includes(key)) return value;
      }
      if (jabatanSekarang.includes('Terampil')) return 60;
      if (jabatanSekarang.includes('Mahir')) return 100;
    }
    
    return 0;
  }

  // Cek apakah ini kenaikan jenjang - VERSI SPESIFIK
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

  // Estimasi kenaikan dengan logika terbaru
  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi: number = 1.00): EstimasiKenaikan {
    const golonganBerikutnya = this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jabatanBerikutnya = this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
    
    const isKenaikanJenjang = this.isKenaikanJenjang(
      karyawan.jabatan, 
      jabatanBerikutnya, 
      karyawan.golongan, 
      golonganBerikutnya
    );
    
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
    const akPerBulan = (predikatAsumsi * koefisien) / 12;
    
    const bulanDibutuhkanPangkat = kekuranganPangkat <= 0 ? 0 : (akPerBulan > 0 ? Math.ceil(kekuranganPangkat / akPerBulan) : 0);
    const bulanDibutuhkanJabatan = kekuranganJabatan <= 0 ? 0 : (akPerBulan > 0 ? Math.ceil(kekuranganJabatan / akPerBulan) : 0);
    
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
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d',
      'III/d': 'IV/a', 'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
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
      'Ahli Pertama': 'Ahli Muda',
      'Ahli Muda': 'Ahli Madya', 
      'Ahli Madya': 'Ahli Utama',
      'Ahli Utama': 'Tidak Ada'
    };
    
    const progressionKeterampilan: { [key: string]: string } = {
      'Terampil': 'Mahir',
      'Mahir': 'Penyelia',
      'Penyelia': 'Tidak Ada'
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
          return "Kenaikan JENJANG: Butuh 100 AK kumulatif untuk naik ke Ahli Muda. Dapat mengusulkan kenaikan JABATAN dan PANGKAT sekaligus.";
        } else if (jabatanSekarang.includes('Muda') && golonganSekarang === 'III/d') {
          return "Kenaikan JENJANG: Butuh 200 AK kumulatif untuk naik ke Ahli Madya. Dapat mengusulkan kenaikan JABATAN dan PANGKAT sekaligus.";
        } else if (jabatanSekarang.includes('Madya') && golonganSekarang === 'IV/c') {
          return "Kenaikan JENJANG: Butuh 450 AK kumulatif untuk naik ke Ahli Utama. Dapat mengusulkan kenaikan JABATAN dan PANGKAT sekaligus.";
        }
      } else {
        if (jabatanSekarang.includes('Terampil') && golonganSekarang === 'II/d') {
          return "Kenaikan JENJANG: Butuh 60 AK kumulatif untuk naik ke Mahir. Dapat mengusulkan kenaikan JABATAN dan PANGKAT sekaligus.";
        } else if (jabatanSekarang.includes('Mahir') && golonganSekarang === 'III/b') {
          return "Kenaikan JENJANG: Butuh 100 AK kumulatif untuk naik ke Penyelia. Dapat mengusulkan kenaikan JABATAN dan PANGKAT sekaligus.";
        }
      }
    }
    
    return `Kenaikan PANGKAT reguler ke ${golonganBerikutnya}: Dapat diusulkan terpisah tanpa menunggu kenaikan jabatan.`;
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

// ==================== COMPONENTS DENGAN TEMA ====================

const ProgressBar: React.FC<{ 
  label: string; 
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
}> = ({ label, akSaatIni, akRealSaatIni, kebutuhanAK, type, bulanDibutuhkan, akTambahan, penjelasan, kekuranganAK, bisaUsul, isKenaikanJenjang = false }) => {
  const { themeColors } = useTheme();
  const isTidakAda = label.includes('Tidak Ada') || kebutuhanAK === 0;
  const progressPercentage = isTidakAda ? 0 : Math.min((akRealSaatIni / kebutuhanAK) * 100, 100);
  const finalPercentage = bisaUsul ? 100 : progressPercentage;
  
  const getColorClass = () => {
    if (isTidakAda) return 'from-gray-300 to-gray-400';
    if (bisaUsul) return 'from-green-500 to-green-600';
    if (finalPercentage >= 80) return `from-[${themeColors.primary}] to-[${themeColors.primaryDark}]`;
    if (finalPercentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const formatEstimasiWaktu = (bulan: number) => {
    if (bulan <= 0) return '0 bulan';
    const tahun = Math.floor(bulan / 12);
    const bulanSisa = bulan % 12;
    if (tahun > 0 && bulanSisa > 0) return `${tahun} tahun ${bulanSisa} bulan`;
    if (tahun > 0) return `${tahun} tahun`;
    return `${bulanSisa} bulan`;
  };

  const getStatusText = () => {
    if (isTidakAda) return 'Sudah level tertinggi';
    if (bisaUsul) {
      if (isKenaikanJenjang && type === 'jabatan') return '✅ Bisa usul JABATAN & PANGKAT sekaligus!';
      return '✅ Bisa diusulkan sekarang!';
    }
    const estimasi = formatEstimasiWaktu(bulanDibutuhkan);
    if (bulanDibutuhkan <= 6) return `🟢 Sangat dekat (${estimasi})`;
    if (bulanDibutuhkan <= 12) return `🔵 Mendekati syarat (${estimasi})`;
    if (bulanDibutuhkan <= 24) return `🟡 Butuh waktu (${estimasi})`;
    return `🟠 Butuh waktu lebih lama (${estimasi})`;
  };

  const getIcon = () => type === 'pangkat' ? '⭐' : '💼';

  return (
    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-lg mr-2">{getIcon()}</span>
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
            {isTidakAda ? `Saat ini ${type === 'pangkat' ? 'Pangkat' : 'Jabatan'} anda sudah Maksimal` : label}
          </h3>
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded ${
          isTidakAda ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
          bisaUsul ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          bulanDibutuhkan <= 6 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          bulanDibutuhkan <= 12 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
          bulanDibutuhkan <= 24 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
          'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
        }`}>
          {getStatusText()}
        </div>
      </div>
      
      {!isTidakAda && penjelasan && (
        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">{penjelasan}</p>
        </div>
      )}
      
      {!isTidakAda && (
        <>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{finalPercentage.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2 dark:bg-gray-700">
            <div 
              className={`bg-gradient-to-r ${getColorClass()} h-3 rounded-full transition-all duration-500 ease-out`}
              style={{ 
                width: `${finalPercentage}%`,
                backgroundColor: finalPercentage >= 80 && !bisaUsul ? themeColors.primary : undefined
              }}
            ></div>
          </div>
        </>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
        <div className="text-center">
          <div className="font-semibold">AK Awal</div>
          <div className="text-gray-500 dark:text-gray-500">{akSaatIni.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">AK Tambahan</div>
          <div className="text-green-600 dark:text-green-400">+{akTambahan.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">AK Real Saat Ini</div>
          <div className="font-bold text-blue-600 dark:text-blue-400">{akRealSaatIni.toFixed(2)}</div>
        </div>
        {!isTidakAda && (
          <div className="text-center">
            <div className="font-semibold">Kebutuhan</div>
            <div>{kebutuhanAK}</div>
          </div>
        )}
        <div className="text-center">
          <div className="font-semibold">{isTidakAda ? 'Status' : 'Kekurangan'}</div>
          <div className={
            isTidakAda ? 'text-gray-600 dark:text-gray-400' :
            kekuranganAK > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }>
            {isTidakAda ? 'Maksimal' : kekuranganAK.toFixed(2)}
          </div>
        </div>
      </div>

      {bisaUsul && !isTidakAda && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-center dark:bg-green-900/20 dark:border-green-800">
          <span className="text-green-800 text-sm font-semibold dark:text-green-300">
            {isKenaikanJenjang && type === 'jabatan' 
              ? '✅ Bisa mengusulkan kenaikan JABATAN dan PANGKAT sekaligus!' 
              : '✅ Sudah memenuhi syarat untuk diusulkan!'}
          </span>
        </div>
      )}
    </div>
  );
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

const BiodataSederhana: React.FC<{ karyawan: Karyawan; akRealSaatIni: number; akTambahan: number }> = ({ karyawan, akRealSaatIni, akTambahan }) => {
  const { themeColors } = useTheme();
  
  const formatTanggal = (tanggal: string) => {
    if (!tanggal) return '-';
    try {
      const date = new Date(tanggal);
      return isNaN(date.getTime()) ? tanggal : date.toLocaleDateString('id-ID');
    } catch { return tanggal; }
  };

  const hitungUsia = (tanggalLahir: string) => {
    if (!tanggalLahir) return 0;
    try {
      const today = new Date();
      const birthDate = new Date(tanggalLahir);
      if (isNaN(birthDate.getTime())) return 0;
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    } catch { return 0; }
  };

  const nipData = parseNIP(karyawan.nip);
  const usia = hitungUsia(nipData.tanggalLahir);

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Informasi Karyawan</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Nama</p><p className="font-semibold text-gray-800 dark:text-gray-200">{karyawan.nama}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">NIP</p><p className="font-medium text-gray-700 dark:text-gray-300">{karyawan.nip}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Usia</p><p className="font-medium text-gray-700 dark:text-gray-300">{usia} tahun</p></div>
        </div>
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500 dark:text-gray-400">TMT PNS</p><p className="font-medium text-gray-700 dark:text-gray-300">{formatTanggal(nipData.tahunMasuk)}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Pangkat / Golongan</p><p className="font-semibold text-gray-800 dark:text-gray-200">{karyawan.pangkat} ({karyawan.golongan})</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">TMT Pangkat</p><p className="font-medium text-gray-700 dark:text-gray-300">{formatTanggal(karyawan.tmtPangkat)}</p></div>
        </div>
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Jabatan</p><p className="font-medium text-gray-700 dark:text-gray-300">{karyawan.jabatan}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">TMT Jabatan</p><p className="font-medium text-gray-700 dark:text-gray-300">{formatTanggal(karyawan.tmtJabatan)}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Fungsi Kegiatan</p><p className="font-medium text-gray-700 dark:text-gray-300">{karyawan.unitKerja}</p></div>
        </div>
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Pendidikan</p><p className="font-medium text-gray-700 dark:text-gray-300">{karyawan.pendidikan}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">Jenis Kelamin</p><p className="font-medium text-gray-700 dark:text-gray-300">{nipData.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p></div>
          <div><p className="text-xs text-gray-500 dark:text-gray-400">AK Real Saat Ini</p><p className="font-bold text-blue-600 dark:text-blue-400 text-lg">{akRealSaatIni.toFixed(2)}</p><p className="text-xs text-gray-500 dark:text-gray-400">(Database: {karyawan.akKumulatif.toFixed(2)} + Tambahan: {akTambahan.toFixed(2)})</p></div>
        </div>
      </div>
    </div>
  );
};

const PredikatKinerjaRadio: React.FC<{ selectedValue: number; onValueChange: (value: number) => void }> = ({ selectedValue, onValueChange }) => {
  const { themeColors } = useTheme();
  
  const predikatOptions = [
    { value: 1.50, label: 'Sangat Baik (Performa luar biasa)' },
    { value: 1.00, label: 'Baik (Performa Baik)' },
    { value: 0.75, label: 'Cukup (Perlu peningkatan)' },
    { value: 0.50, label: 'Kurang (Perlu perbaikan serius)' }
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Asumsi Predikat Kinerja:</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {predikatOptions.map((option) => (
          <div key={option.value} className={`relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 ${
            selectedValue === option.value 
              ? `border-[${themeColors.primary}] bg-[${themeColors.primaryLight}] shadow-md dark:bg-[${themeColors.primary}]/20` 
              : 'border-gray-200 bg-white hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
          }`} onClick={() => onValueChange(option.value)}>
            <div className="flex items-center mb-2">
              <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${
                selectedValue === option.value 
                  ? `border-[${themeColors.primary}] bg-[${themeColors.primary}]` 
                  : 'border-gray-400 dark:border-gray-600'
              }`}>
                {selectedValue === option.value && <div className="w-2 h-2 rounded-full bg-white"></div>}
              </div>
              <span className={`font-semibold text-sm ${
                selectedValue === option.value 
                  ? `text-[${themeColors.primary}] dark:text-[${themeColors.primaryLight}]` 
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {option.label}
              </span>
            </div>
            <div className={`text-xs font-bold mt-1 ${
              selectedValue === option.value 
                ? `text-[${themeColors.primary}] dark:text-[${themeColors.primaryLight}]` 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {option.value * 100}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ... [Komponen EmployeeTable, EstimasiKenaikan, InputKinerjaForm, EmployeeDashboard tetap sama dengan penambahan tema]

// ==================== MAIN APP ====================
const App: React.FC = () => {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [inputHistory, setInputHistory] = useState<InputKinerja[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input'>('dashboard');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { themeColors } = useTheme();

  const fetchKaryawanData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("google-sheets", { 
        body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: `${SHEET_NAME}!A:L` } 
      });
      if (error) throw error;
      const rows = data.values || [];
      const karyawanData: Karyawan[] = rows.slice(1).filter((row: any[]) => row.length > 0 && row[0]).map((row: any[]) => {
        let akKumulatifValue = 0;
        if (row[6]) { 
          const akValue = row[6].toString().replace(',', '.'); 
          akKumulatifValue = parseFloat(akValue) || 0; 
        }
        const nipData = parseNIP(row[0]?.toString() || '');
        return {
          nip: row[0]?.toString() || '', 
          nama: row[1]?.toString() || '', 
          pangkat: row[2]?.toString() || '', 
          golongan: row[3]?.toString() || '', 
          jabatan: row[4]?.toString() || '',
          kategori: (row[5]?.toString() as 'Keahlian' | 'Keterampilan') || 'Keahlian', 
          akKumulatif: akKumulatifValue, 
          status: (row[7]?.toString() as 'Aktif' | 'Pensiun' | 'Mutasi') || 'Aktif',
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
        k.nip === selectedKaryawan.nip ? { ...k, akKumulatif: k.akKumulatif + newInput.akDiperoleh } : k
      );
      setKaryawanList(updatedKaryawanList);
      const updatedSelected = updatedKaryawanList.find(k => k.nip === selectedKaryawan.nip);
      if (updatedSelected) setSelectedKaryawan(updatedSelected);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      {/* Header dengan tema */}
      <header 
        className="text-white py-4 px-6 shadow-lg transition-colors duration-300"
        style={{ 
          background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.primaryDark})`
        }}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-1">🔄 Aplikasi Penghitungan Angka Kredit</h1>
            <p className="text-white/90 text-sm">Berdasarkan Peraturan BKN No. 3 Tahun 2023</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {!selectedKaryawan ? (
          <EmployeeTable 
            karyawanList={karyawanList} 
            onSelect={setSelectedKaryawan}
            selectedNip={null}
            loading={loading}
          />
        ) : (
          <>
            {/* Navigation Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div>
                <button 
                  onClick={() => setSelectedKaryawan(null)}
                  className="flex items-center text-blue-600 hover:text-blue-800 font-medium mb-1 text-sm dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <span className="mr-1">←</span>
                  Kembali ke Daftar Karyawan
                </button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{selectedKaryawan.nama}</h2>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 p-1 bg-gray-200 rounded-lg w-fit dark:bg-gray-700">
                <button 
                  className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
                    activeTab === 'dashboard' 
                      ? 'text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'dashboard' ? themeColors.primary : 'transparent'
                  }}
                  onClick={() => setActiveTab('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
                    activeTab === 'input' 
                      ? 'text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: activeTab === 'input' ? themeColors.primary : 'transparent'
                  }}
                  onClick={() => setActiveTab('input')}
                >
                  📥 Input Kinerja
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'dashboard' && (
                <EmployeeDashboard karyawan={selectedKaryawan} />
              )}
              
              {activeTab === 'input' && (
                <InputKinerjaForm 
                  karyawan={selectedKaryawan} 
                  onSave={handleSaveInput} 
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;