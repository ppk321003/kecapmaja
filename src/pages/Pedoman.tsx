// App.tsx - VERSI LENGKAP DENGAN AK REAL DI TABEL
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

// ==================== GOOGLE SHEETS CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "data";

// ==================== UTILITIES - SESUAI JENJANG LEMBAGA ANDA ====================
class AngkaKreditCalculator {
  // Koefisien tahunan sesuai Peraturan BKN Pasal 13 - DISESUAIKAN
  static getKoefisien(jabatan: string): number {
    const koefisienMap: { [key: string]: number } = {
      // KATEGORI KEAHLIAN - Statistisi
      'Ahli Pertama': 12.5,
      'Ahli Muda': 25.0,
      'Ahli Madya': 37.5,
      'Ahli Utama': 50.0,
      
      // KATEGORI KEAHLIAN - Pranata Komputer
      'Pranata Komputer Ahli Pertama': 12.5,
      'Pranata Komputer Ahli Muda': 25.0,
      'Pranata Komputer Ahli Madya': 37.5,
      'Pranata Komputer Ahli Utama': 50.0,
      
      // KATEGORI KETERAMPILAN
      'Terampil': 8.0,
      'Mahir': 12.5,
      'Penyelia': 25.0,
      
      // JABATAN STRUKTURAL
      'Kepala BPS': 50.0,
      'Kepala Subbagian Umum': 37.5,
      
      // FUNGSIONAL UMUM
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
    
    // Jika TMT masih di masa depan, tidak ada AK tambahan
    if (tmtJabatan > hariIni) {
      return 0;
    }
    
    // Hitung selisih bulan antara TMT Jabatan dan hari ini
    const selisihBulan = this.hitungSelisihBulan(tmtJabatan, hariIni);
    
    if (selisihBulan <= 0) {
      return 0;
    }
    
    const koefisien = this.getKoefisien(karyawan.jabatan);
    const akPerBulan = (predikatAsumsi * koefisien) / 12;
    const akTambahan = selisihBulan * akPerBulan;
    
    return Number(akTambahan.toFixed(2));
  }

  // Hitung AK Real saat ini (AK Awal + AK Tambahan)
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

  // Kebutuhan AK untuk kenaikan pangkat - SESUAI Pasal 21 ayat (3)
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
    return kebutuhan[golonganSekarang] || 100;
  }

  // Kebutuhan AK untuk kenaikan jabatan - DISESUAIKAN DENGAN JABATAN LEMBAGA ANDA
  static getKebutuhanJabatan(jabatanSekarang: string, kategori: string): number {
    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100,  // → Ahli Muda
      'Ahli Muda': 200,     // → Ahli Madya  
      'Ahli Madya': 300,    // → Ahli Utama
      'Ahli Utama': 0       // Sudah level tertinggi
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Terampil': 60,   // → Mahir
      'Mahir': 100,     // → Penyelia
      'Penyelia': 0     // Sudah level tertinggi
    };
    
    if (kategori === 'Keahlian') {
      for (const [key, value] of Object.entries(kebutuhanKeahlian)) {
        if (jabatanSekarang.includes(key)) {
          return value;
        }
      }
    } else {
      for (const [key, value] of Object.entries(kebutuhanKeterampilan)) {
        if (jabatanSekarang.includes(key)) {
          return value;
        }
      }
    }
    
    return 0;
  }

  // Estimasi kenaikan yang BENAR dengan AK Real
  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi: number = 1.00): EstimasiKenaikan {
    const golonganBerikutnya = this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jabatanBerikutnya = this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
    
    const kebutuhanPangkat = this.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJabatan = this.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
    
    // Hitung AK Real saat ini (termasuk AK tambahan sejak TMT)
    const akTambahan = this.hitungAKTambahan(karyawan, predikatAsumsi);
    const akRealSaatIni = this.hitungAKRealSaatIni(karyawan, predikatAsumsi);
    
    const kekuranganPangkat = Math.max(0, kebutuhanPangkat - akRealSaatIni);
    const kekuranganJabatan = Math.max(0, kebutuhanJabatan - akRealSaatIni);
    
    const koefisien = this.getKoefisien(karyawan.jabatan);
    const akPerBulan = (predikatAsumsi * koefisien) / 12;
    
    const bulanDibutuhkanPangkat = akPerBulan > 0 ? Math.ceil(kekuranganPangkat / akPerBulan) : 0;
    const bulanDibutuhkanJabatan = akPerBulan > 0 ? Math.ceil(kekuranganJabatan / akPerBulan) : 0;
    
    const sekarang = new Date();
    const estimasiTanggalPangkat = new Date(sekarang);
    estimasiTanggalPangkat.setMonth(sekarang.getMonth() + bulanDibutuhkanPangkat);
    
    const estimasiTanggalJabatan = new Date(sekarang);
    estimasiTanggalJabatan.setMonth(sekarang.getMonth() + bulanDibutuhkanJabatan);
    
    return {
      kebutuhanAKPangkat: kebutuhanPangkat,
      kebutuhanAKJabatan: kebutuhanJabatan,
      kekuranganAKPangkat: kekuranganPangkat,
      kekuranganAKJabatan: kekuranganJabatan,
      predikatAsumsi,
      bulanDibutuhkanPangkat,
      bulanDibutuhkanJabatan,
      estimasiTanggalPangkat: estimasiTanggalPangkat.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      estimasiTanggalJabatan: estimasiTanggalJabatan.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      bisaUsulPangkat: kekuranganPangkat <= 0,
      bisaUsulJabatan: kekuranganJabatan <= 0,
      golonganBerikutnya,
      jabatanBerikutnya,
      akPerBulan: Number(akPerBulan.toFixed(2)),
      akRealSaatIni,
      akTambahan
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
        if (jabatanSekarang.includes(key)) {
          return value;
        }
      }
    } else {
      for (const [key, value] of Object.entries(progressionKeterampilan)) {
        if (jabatanSekarang.includes(key)) {
          return value;
        }
      }
    }
    
    return 'Tidak Diketahui';
  }

  static getRekomendasiKarir(karyawan: Karyawan): string {
    if (karyawan.kategori === 'Keterampilan') {
      const pendidikan = karyawan.pendidikan.toLowerCase();
      
      const isPendidikanRendah = 
        pendidikan.includes('sma') || pendidikan.includes('smk') || 
        pendidikan.includes('d1') || pendidikan.includes('d2') || 
        pendidikan.includes('d3') || pendidikan.includes('diploma') ||
        pendidikan.includes('slta');
      
      const isPendidikanTinggi = 
        pendidikan.includes('d4') || pendidikan.includes('s1') || 
        pendidikan.includes('sarjana') || pendidikan.includes('s2') ||
        pendidikan.includes('s3') || pendidikan.includes('magister') ||
        pendidikan.includes('doktor');

      if (isPendidikanRendah) {
        return 'REKOMENDASI: Untuk pengembangan karir lebih lanjut, pertimbangkan melanjutkan pendidikan ke D4/S1 untuk dapat beralih ke jalur Keahlian.';
      }
      
      if (isPendidikanTinggi) {
        return 'REKOMENDASI: Anda sudah memenuhi syarat pendidikan untuk jalur Keahlian. Pertimbangkan untuk mengajukan alih jalur karir.';
      }
    }
    
    if (karyawan.kategori === 'Keahlian') {
      const jabatanBerikutnya = this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
      if (jabatanBerikutnya === 'Tidak Ada') {
        return 'SUKSES: Anda telah mencapai jenjang karir tertinggi di jalur Keahlian. Pertahankan kinerja dan berkontribusi sebagai mentor.';
      }
    }
    
    return '';
  }
}

// ==================== COMPONENTS ====================

// Komponen Progress Bar dengan AK Real
const ProgressBar: React.FC<{ 
  progress: number; 
  label: string; 
  akSaatIni: number;
  akRealSaatIni: number;
  kebutuhanAK: number;
  type: 'pangkat' | 'jabatan';
  bulanDibutuhkan: number;
  akTambahan: number;
}> = ({ progress, label, akSaatIni, akRealSaatIni, kebutuhanAK, type, bulanDibutuhkan, akTambahan }) => {
  const isTidakAda = label.includes('Tidak Ada') || kebutuhanAK === 0;
  const percentage = isTidakAda ? 0 : Math.min(progress * 100, 100);
  const kelebihanAK = Math.max(0, akRealSaatIni - kebutuhanAK);
  
  const getColorClass = () => {
    if (isTidakAda) return 'from-gray-300 to-gray-400';
    if (percentage >= 100) return 'from-green-500 to-green-600';
    if (percentage >= 80) return 'from-blue-500 to-blue-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getStatusText = () => {
    if (isTidakAda) return 'Sudah level tertinggi';
    if (bulanDibutuhkan === 0) return '✅ Bisa diusulkan sekarang!';
    if (bulanDibutuhkan <= 6) return `🟢 Sangat dekat (${bulanDibutuhkan} bulan)`;
    if (bulanDibutuhkan <= 12) return `🔵 Mendekati syarat (${bulanDibutuhkan} bulan)`;
    if (bulanDibutuhkan <= 24) return `🟡 Butuh waktu (${bulanDibutuhkan} bulan)`;
    return `🟠 Butuh waktu lebih lama (${bulanDibutuhkan} bulan)`;
  };

  return (
    <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <h3 className="text-md font-semibold text-gray-800">
            {isTidakAda ? `Saat ini ${type === 'pangkat' ? 'Pangkat' : 'Jabatan'} anda sudah Maksimal` : label}
          </h3>
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded ${
          isTidakAda ? 'bg-gray-100 text-gray-800' :
          bulanDibutuhkan === 0 ? 'bg-green-100 text-green-800' :
          bulanDibutuhkan <= 6 ? 'bg-green-100 text-green-800' :
          bulanDibutuhkan <= 12 ? 'bg-blue-100 text-blue-800' :
          bulanDibutuhkan <= 24 ? 'bg-yellow-100 text-yellow-800' :
          'bg-orange-100 text-orange-800'
        }`}>
          {getStatusText()}
        </div>
      </div>
      
      {!isTidakAda && (
        <>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-semibold text-blue-600">{percentage.toFixed(1)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className={`bg-gradient-to-r ${getColorClass()} h-3 rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-gray-600 mb-3">
        <div className="text-center">
          <div className="font-semibold">AK Awal</div>
          <div className="text-gray-500">{akSaatIni.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">AK Tambahan</div>
          <div className="text-green-600">+{akTambahan.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">AK Real Saat Ini</div>
          <div className="font-bold text-blue-600">{akRealSaatIni.toFixed(2)}</div>
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
            isTidakAda ? 'text-gray-600' :
            kebutuhanAK - akRealSaatIni > 0 ? 'text-red-600' : 'text-green-600'
          }>
            {isTidakAda ? 'Maksimal' : Math.max(0, kebutuhanAK - akRealSaatIni).toFixed(2)}
          </div>
        </div>
      </div>

      {percentage >= 100 && !isTidakAda && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-center">
          <span className="text-green-800 text-sm font-semibold">✅ Sudah memenuhi syarat!</span>
        </div>
      )}
    </div>
  );
};

// Fungsi untuk parsing NIP
const parseNIP = (nip: string) => {
  if (!nip || nip.length < 15) {
    return {
      tanggalLahir: '',
      tahunMasuk: '',
      jenisKelamin: 'L'
    };
  }

  const parts = nip.split(' ');
  if (parts.length < 3) {
    return {
      tanggalLahir: '',
      tahunMasuk: '',
      jenisKelamin: 'L'
    };
  }

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

  return {
    tanggalLahir,
    tahunMasuk,
    jenisKelamin
  };
};

// Komponen Informasi Biodata Sederhana
const BiodataSederhana: React.FC<{ karyawan: Karyawan; akRealSaatIni: number; akTambahan: number }> = ({ karyawan, akRealSaatIni, akTambahan }) => {
  const formatTanggal = (tanggal: string) => {
    if (!tanggal) return '-';
    try {
      const date = new Date(tanggal);
      if (isNaN(date.getTime())) {
        const parts = tanggal.split('/');
        if (parts.length === 3) {
          const newDate = new Date(parseInt(parts[2]), parseInt(parts[0])-1, parseInt(parts[1]));
          return newDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        }
        return tanggal;
      }
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return tanggal;
    }
  };

  const hitungUsia = (tanggalLahir: string) => {
    if (!tanggalLahir) return 0;
    try {
      const today = new Date();
      const birthDate = new Date(tanggalLahir);
      if (isNaN(birthDate.getTime())) return 0;
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return 0;
    }
  };

  // Parse data dari NIP
  const nipData = parseNIP(karyawan.nip);
  const usia = hitungUsia(nipData.tanggalLahir);

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-3">Informasi Karyawan</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500">Nama</p>
            <p className="font-semibold text-gray-800">{karyawan.nama}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">NIP</p>
            <p className="font-medium text-gray-700">{karyawan.nip}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Usia</p>
            <p className="font-medium text-gray-700">{usia} tahun</p>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500">TMT PNS</p>
            <p className="font-medium text-gray-700">{formatTanggal(nipData.tahunMasuk)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pangkat / Golongan</p>
            <p className="font-semibold text-gray-800">{karyawan.pangkat} ({karyawan.golongan})</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">TMT Pangkat</p>
            <p className="font-medium text-gray-700">{formatTanggal(karyawan.tmtPangkat)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500">Jabatan</p>
            <p className="font-medium text-gray-700">{karyawan.jabatan}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">TMT Jabatan</p>
            <p className="font-medium text-gray-700">{formatTanggal(karyawan.tmtJabatan)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fungsi Kegiatan</p>
            <p className="font-medium text-gray-700">{karyawan.unitKerja}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500">Pendidikan</p>
            <p className="font-medium text-gray-700">{karyawan.pendidikan}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Jenis Kelamin</p>
            <p className="font-medium text-gray-700">{nipData.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">AK Real Saat Ini</p>
            <p className="font-bold text-blue-600 text-lg">{akRealSaatIni.toFixed(2)}</p>
            <p className="text-xs text-gray-500">
              (Database: {karyawan.akKumulatif.toFixed(2)} + Tambahan: {akTambahan.toFixed(2)})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Komponen Radio Button Predikat Kinerja
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
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Asumsi Predikat Kinerja:
      </label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {predikatOptions.map((option) => (
          <div
            key={option.value}
            className={`relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 ${
              selectedValue === option.value
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => onValueChange(option.value)}
          >
            <div className="flex items-center mb-2">
              <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${
                selectedValue === option.value
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-400'
              }`}>
                {selectedValue === option.value && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
              <span className={`font-semibold text-sm ${
                selectedValue === option.value ? 'text-blue-800' : 'text-gray-800'
              }`}>
                {option.label}
              </span>
            </div>
            <div className={`text-xs font-bold mt-1 ${selectedValue === option.value ? 'text-blue-800' : 'text-gray-700'}`}>
              {option.value * 100}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Komponen Tabel Karyawan dengan AK Real
const EmployeeTable: React.FC<{ 
  karyawanList: Karyawan[]; 
  onSelect: (karyawan: Karyawan) => void;
  selectedNip: string | null;
  loading: boolean;
}> = ({ karyawanList, onSelect, selectedNip, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<'Semua' | 'Keahlian' | 'Keterampilan'>('Semua');
  const [sortField, setSortField] = useState<keyof Karyawan>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fungsi untuk menghitung AK Real untuk setiap karyawan
  const getKaryawanWithAKReal = (karyawan: Karyawan) => {
    const akTambahan = AngkaKreditCalculator.hitungAKTambahan(karyawan);
    const akRealSaatIni = AngkaKreditCalculator.hitungAKRealSaatIni(karyawan);
    return {
      ...karyawan,
      akTambahan,
      akRealSaatIni
    };
  };

  const karyawanWithAKReal = karyawanList.map(getKaryawanWithAKReal);

  const filteredKaryawan = karyawanWithAKReal.filter(karyawan => {
    const matchesSearch = 
      karyawan.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      karyawan.nip.includes(searchTerm) ||
      karyawan.unitKerja.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesKategori = filterKategori === 'Semua' || karyawan.kategori === filterKategori;
    
    return matchesSearch && matchesKategori;
  });

  const sortedKaryawan = [...filteredKaryawan].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const handleSort = (field: keyof Karyawan) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Karyawan) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const totalKaryawan = karyawanList.length;
  const aktifKaryawan = karyawanList.filter(k => k.status === 'Aktif').length;
  const keahlianKaryawan = karyawanList.filter(k => k.kategori === 'Keahlian').length;
  const keterampilanKaryawan = karyawanList.filter(k => k.kategori === 'Keterampilan').length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6">
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">⏳</div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">Memuat data karyawan...</h3>
          <p className="text-gray-500 text-xs">Sedang mengambil data dari Google Sheets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Daftar Karyawan</h2>
          <p className="text-gray-600 text-sm">Pilih karyawan untuk melihat detail</p>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <div className="text-sm font-bold text-blue-600">{totalKaryawan}</div>
            <div className="text-xs text-blue-800">Total</div>
          </div>
          <div className="bg-green-50 p-2 rounded border border-green-200">
            <div className="text-sm font-bold text-green-600">{aktifKaryawan}</div>
            <div className="text-xs text-green-800">Aktif</div>
          </div>
          <div className="bg-purple-50 p-2 rounded border border-purple-200">
            <div className="text-sm font-bold text-purple-600">{keahlianKaryawan}</div>
            <div className="text-xs text-purple-800">Keahlian</div>
          </div>
          <div className="bg-orange-50 p-2 rounded border border-orange-200">
            <div className="text-sm font-bold text-orange-600">{keterampilanKaryawan}</div>
            <div className="text-xs text-orange-800">Keterampilan</div>
          </div>
        </div>
      </div>

      {/* Filter dan Pencarian */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <input
            type="text"
            placeholder="Cari nama, NIP, atau unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <select 
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value as any)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Keahlian">Keahlian</option>
            <option value="Keterampilan">Keterampilan</option>
          </select>
        </div>
      </div>

      {/* Tabel Karyawan dengan AK Real */}
      {filteredKaryawan.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">🔍</div>
          <h3 className="text-sm font-semibold text-gray-600 mb-1">Tidak ada karyawan ditemukan</h3>
          <p className="text-gray-500 text-xs">Coba ubah kata kunci pencarian</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th 
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nama')}
                >
                  <div className="flex items-center">
                    Nama
                    <span className="ml-1 text-xs">{getSortIcon('nama')}</span>
                  </div>
                </th>
                <th 
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nip')}
                >
                  <div className="flex items-center">
                    NIP
                    <span className="ml-1 text-xs">{getSortIcon('nip')}</span>
                  </div>
                </th>
                <th 
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('golongan')}
                >
                  <div className="flex items-center">
                    Golongan
                    <span className="ml-1 text-xs">{getSortIcon('golongan')}</span>
                  </div>
                </th>
                <th 
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('jabatan')}
                >
                  <div className="flex items-center">
                    Jabatan
                    <span className="ml-1 text-xs">{getSortIcon('jabatan')}</span>
                  </div>
                </th>
                <th 
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('akKumulatif')}
                >
                  <div className="flex items-center">
                    AK Awal
                    <span className="ml-1 text-xs">{getSortIcon('akKumulatif')}</span>
                  </div>
                </th>
                <th 
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    AK Tambahan
                  </div>
                </th>
                <th 
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    AK Real
                  </div>
                </th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedKaryawan.map((karyawan) => (
                <tr 
                  key={karyawan.nip} 
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    selectedNip === karyawan.nip ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {karyawan.nama}
                  </td>
                  <td className="px-3 py-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{karyawan.nip}</code>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-semibold text-xs">{karyawan.golongan}</span>
                  </td>
                  <td className="text-gray-700 text-xs">{karyawan.jabatan}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-gray-500 text-xs">{karyawan.akKumulatif.toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-green-600 text-xs font-medium">+{karyawan.akTambahan.toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-bold text-blue-600 text-xs inline-block bg-blue-50 px-2 py-1 rounded">
                      {karyawan.akRealSaatIni.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onSelect(karyawan)}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-xs font-medium transition-colors flex items-center justify-center"
                      title="Lihat detail karyawan"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Menampilkan {filteredKaryawan.length} dari {totalKaryawan} karyawan
      </div>

      {/* Informasi tentang AK Real */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <span className="text-blue-500 mr-2">ℹ️</span>
          <div>
            <p className="text-blue-800 text-sm font-medium">Informasi AK Real</p>
            <p className="text-blue-700 text-xs">
              <strong>AK Real = AK Awal + AK Tambahan</strong>. AK Tambahan dihitung otomatis sejak TMT Jabatan sampai hari ini dengan asumsi predikat kinerja "Baik".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Komponen Estimasi Kenaikan dengan AK Real
const EstimasiKenaikan: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const [predikatAsumsi, setPredikatAsumsi] = useState(1.00);
  
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan, predikatAsumsi);

  const hitungEstimasiTahunBulan = (bulanDibutuhkan: number) => {
    const tahun = Math.floor(bulanDibutuhkan / 12);
    const bulan = bulanDibutuhkan % 12;
    return { tahun, bulan };
  };

  const estimasiPangkat = hitungEstimasiTahunBulan(estimasi.bulanDibutuhkanPangkat);
  const estimasiJabatan = hitungEstimasiTahunBulan(estimasi.bulanDibutuhkanJabatan);

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Estimasi Kenaikan Pangkat dan Jabatan</h3>
      
      {/* Informasi AK Real */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-blue-700 font-medium">AK Awal</p>
            <p className="text-xl font-bold text-blue-800">{karyawan.akKumulatif.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-green-700 font-medium">AK Tambahan</p>
            <p className="text-xl font-bold text-green-800">+{estimasi.akTambahan.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-purple-700 font-medium">AK Real Saat Ini</p>
            <p className="text-xl font-bold text-purple-800">{estimasi.akRealSaatIni.toFixed(2)}</p>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-2 text-center">
          *AK Tambahan dihitung sejak TMT Jabatan {new Date(karyawan.tmtJabatan).toLocaleDateString('id-ID')} sampai hari ini
        </p>
      </div>

      {/* Radio Button Predikat Kinerja */}
      <div className="mb-6">
        <PredikatKinerjaRadio 
          selectedValue={predikatAsumsi}
          onValueChange={setPredikatAsumsi}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-sm text-blue-700 font-medium">Perolehan AK per Bulan</p>
            <p className="text-xl font-bold text-blue-800">{estimasi.akPerBulan}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-center">
            <p className="text-sm text-green-700 font-medium">Asumsi Predikat Kinerja Terpilih</p>
            <p className="text-xl font-bold text-green-800">{predikatAsumsi * 100}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 border-b pb-2">Kenaikan Pangkat</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pangkat berikutnya:</span>
              <span className="font-semibold">{estimasi.golonganBerikutnya}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kebutuhan AK:</span>
              <span className="font-semibold">{estimasi.kebutuhanAKPangkat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kekurangan AK:</span>
              <span className={`font-semibold ${estimasi.kekuranganAKPangkat > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {estimasi.kekuranganAKPangkat.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimasi tahun:</span>
              <span className="font-semibold text-blue-600">
                {estimasiPangkat.tahun > 0 ? `${estimasiPangkat.tahun} tahun ` : ''}
                {estimasiPangkat.bulan > 0 ? `${estimasiPangkat.bulan} bulan` : estimasiPangkat.tahun === 0 ? `${estimasiPangkat.bulan} bulan` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimasi bulan:</span>
              <span className="font-semibold text-blue-600">{estimasi.bulanDibutuhkanPangkat} bulan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimasi tanggal:</span>
              <span className="font-semibold text-blue-600 text-xs">{estimasi.estimasiTanggalPangkat}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700 border-b pb-2">Kenaikan Jabatan</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Jabatan berikutnya:</span>
              <span className="font-semibold">{estimasi.jabatanBerikutnya}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kebutuhan AK:</span>
              <span className="font-semibold">{estimasi.kebutuhanAKJabatan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kekurangan AK:</span>
              <span className={`font-semibold ${estimasi.kekuranganAKJabatan > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {estimasi.kekuranganAKJabatan.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimasi tahun:</span>
              <span className="font-semibold text-blue-600">
                {estimasiJabatan.tahun > 0 ? `${estimasiJabatan.tahun} tahun ` : ''}
                {estimasiJabatan.bulan > 0 ? `${estimasiJabatan.bulan} bulan` : estimasiJabatan.tahun === 0 ? `${estimasiJabatan.bulan} bulan` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimasi bulan:</span>
              <span className="font-semibold text-blue-600">{estimasi.bulanDibutuhkanJabatan} bulan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estimasi tanggal:</span>
              <span className="font-semibold text-blue-600 text-xs">{estimasi.estimasiTanggalJabatan}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>Informasi:</strong> Estimasi berdasarkan predikat kinerja {predikatAsumsi * 100}% 
          dengan perolehan {estimasi.akPerBulan} AK/bulan. Perhitungan sesuai Peraturan BKN No. 3 Tahun 2023.
          AK Real saat ini sudah termasuk akumulasi sejak TMT Jabatan.
        </p>
      </div>
    </div>
  );
};

// Komponen Input Kinerja
const InputKinerjaForm: React.FC<{ 
  karyawan: Karyawan; 
  onSave: (input: InputKinerja) => void 
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
      akDiperoleh: akDiperoleh,
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

    alert('Data kinerja berhasil disimpan!');
  };

  const currentKoefisien = AngkaKreditCalculator.getKoefisien(karyawan.jabatan);
  const calculatedAK = AngkaKreditCalculator.hitungAK(
    karyawan.jabatan,
    formData.predikatKinerja,
    formData.jenisPenilaian === 'Periodik',
    formData.bulanPeriodik
  );

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📥 Input Kinerja - {karyawan.nama}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Periode Penilaian</label>
          <input 
            type="month" 
            value={formData.periode}
            onChange={(e) => setFormData({...formData, periode: e.target.value})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Jenis Penilaian</label>
          <select 
            value={formData.jenisPenilaian}
            onChange={(e) => setFormData({
              ...formData, 
              jenisPenilaian: e.target.value as 'Tahunan' | 'Periodik'
            })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Tahunan">Tahunan</option>
            <option value="Periodik">Periodik</option>
          </select>
        </div>

        {formData.jenisPenilaian === 'Periodik' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Bulan Periodik</label>
            <input 
              type="number" 
              min="1" 
              max="11"
              value={formData.bulanPeriodik}
              onChange={(e) => setFormData({...formData, bulanPeriodik: parseInt(e.target.value)})}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Radio Button Predikat Kinerja untuk Input */}
      <div className="mb-4">
        <PredikatKinerjaRadio 
          selectedValue={formData.predikatKinerja}
          onValueChange={(value) => setFormData({...formData, predikatKinerja: value})}
        />
      </div>

      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-gray-700">Keterangan</label>
        <input 
          type="text" 
          value={formData.keterangan}
          onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
          placeholder="Capaian SKP, evaluasi, dll."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <h4 className="font-semibold text-gray-700 mb-2 text-sm">Perhitungan Angka Kredit:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-gray-600">Jabatan</p>
            <p className="font-semibold text-gray-800">{karyawan.jabatan}</p>
          </div>
          <div>
            <p className="text-gray-600">Koefisien</p>
            <p className="font-semibold text-gray-800">{currentKoefisien}</p>
          </div>
          <div>
            <p className="text-gray-600">Predikat</p>
            <p className="font-semibold text-gray-800">{formData.predikatKinerja * 100}%</p>
          </div>
          <div>
            <p className="text-gray-600">Hasil AK</p>
            <p className="font-bold text-blue-600">{calculatedAK}</p>
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleCalculate}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm"
      >
        Simpan Data Kinerja
      </button>
    </div>
  );
};

// Komponen Dashboard Karyawan dengan AK Real
const EmployeeDashboard: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const golonganBerikutnya = AngkaKreditCalculator.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
  const jabatanBerikutnya = AngkaKreditCalculator.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);
  
  const kebutuhanPangkat = AngkaKreditCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
  const kebutuhanJabatan = AngkaKreditCalculator.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);
  
  // Hitung AK Real untuk progress bar
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
  const progressPangkat = kebutuhanPangkat > 0 ? estimasi.akRealSaatIni / kebutuhanPangkat : 0;
  const progressJabatan = kebutuhanJabatan > 0 ? estimasi.akRealSaatIni / kebutuhanJabatan : 0;

  const rekomendasiKarir = AngkaKreditCalculator.getRekomendasiKarir(karyawan);

  return (
    <div className="space-y-4">
      <BiodataSederhana 
        karyawan={karyawan} 
        akRealSaatIni={estimasi.akRealSaatIni}
        akTambahan={estimasi.akTambahan}
      />

      {rekomendasiKarir && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start">
            <span className="text-xl mr-3">💡</span>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">Rekomendasi Pengembangan Karir</h3>
              <p className="text-yellow-700 text-sm">{rekomendasiKarir}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
        <div className="mb-4 pb-3 border-b border-gray-200">
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-md font-bold text-blue-600">AK Real Saat Ini: {estimasi.akRealSaatIni.toFixed(2)}</p>
            <p className="text-xs text-gray-600">
              (Database: {karyawan.akKumulatif.toFixed(2)} + Tambahan: {estimasi.akTambahan.toFixed(2)})
            </p>
          </div>
        </div>

        {/* PROGRESS BAR PANGKAT DAN JABATAN dengan AK Real */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProgressBar 
            progress={progressPangkat}
            label={`Kenaikan Pangkat ke ${golonganBerikutnya}`}
            akSaatIni={karyawan.akKumulatif}
            akRealSaatIni={estimasi.akRealSaatIni}
            kebutuhanAK={kebutuhanPangkat}
            type="pangkat"
            bulanDibutuhkan={estimasi.bulanDibutuhkanPangkat}
            akTambahan={estimasi.akTambahan}
          />
          
          <ProgressBar 
            progress={progressJabatan}
            label={`Kenaikan Jabatan ke ${jabatanBerikutnya}`}
            akSaatIni={karyawan.akKumulatif}
            akRealSaatIni={estimasi.akRealSaatIni}
            kebutuhanAK={kebutuhanJabatan}
            type="jabatan"
            bulanDibutuhkan={estimasi.bulanDibutuhkanJabatan}
            akTambahan={estimasi.akTambahan}
          />
        </div>
      </div>

      <EstimasiKenaikan karyawan={karyawan} />
    </div>
  );
};

// ==================== MAIN APP ====================
const App: React.FC = () => {
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
      
      console.log('Data dari Google Sheets:', rows);
      
      const karyawanData: Karyawan[] = rows.slice(1)
        .filter((row: any[]) => row.length > 0 && row[0])
        .map((row: any[], index: number) => {
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

      console.log('Data karyawan yang diproses:', karyawanData);
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
      if (updatedSelected) {
        setSelectedKaryawan(updatedSelected);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">🔄 Aplikasi Penghitungan Angka Kredit</h1>
          <p className="text-white/90 text-sm">Berdasarkan Peraturan BKN No. 3 Tahun 2023</p>
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
                  className="flex items-center text-blue-600 hover:text-blue-800 font-medium mb-1 text-sm"
                >
                  <span className="mr-1">←</span>
                  Kembali ke Daftar Karyawan
                </button>
                <h2 className="text-xl font-bold text-gray-800">{selectedKaryawan.nama}</h2>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 p-1 bg-gray-200 rounded-lg w-fit">
                <button 
                  className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
                    activeTab === 'dashboard' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className={`px-3 py-1 rounded-md font-medium transition-all text-sm ${
                    activeTab === 'input' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
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