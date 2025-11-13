// App.tsx - VERSI LENGKAP SESUAI PERATURAN BKN NO. 3 TAHUN 2023 - REVISI
import React, { useState, useEffect } from 'react';

// ==================== TYPES ====================
interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jenjangJabatan: string;
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
  jenjangSaatInput: string;
  tanggalInput: string;
  inputOleh: string;
  keterangan: string;
}

interface EstimasiKenaikan {
  kebutuhanAKPangkat: number;
  kebutuhanAKJenjang: number;
  kekuranganAKPangkat: number;
  kekuranganAKJenjang: number;
  predikatAsumsi: number;
  bulanDibutuhkanPangkat: number;
  bulanDibutuhkanJenjang: number;
  estimasiTanggalPangkat: string;
  estimasiTanggalJenjang: string;
  bisaUsulPangkat: boolean;
  bisaUsulJenjang: boolean;
  golonganBerikutnya: string;
  jenjangBerikutnya: string;
  akPerBulan: number;
}

// ==================== DUMMY DATA ====================
const dummyKaryawan: Karyawan[] = [
  // KATEGORI KEAHLIAN
  {
    nip: '199209132023021001',
    nama: 'Ahmad Wijaya',
    pangkat: 'Penata Muda',
    golongan: 'III/a',
    jenjangJabatan: 'Ahli Pertama',
    kategori: 'Keahlian',
    unitKerja: 'Bagian Kepegawaian',
    tmtJabatan: '2023-03-01',
    tmtPangkat: '2023-03-01',
    pendidikan: 'S1 Manajemen',
    akKumulatif: 32.50,
    status: 'Aktif',
    tempatLahir: 'Jakarta',
    tanggalLahir: '1992-09-13',
    jenisKelamin: 'L',
    agama: 'Islam',
    email: 'ahmad.wijaya@instansi.go.id',
    telepon: '081234567890',
    alamat: 'Jl. Merdeka No. 123, Jakarta Pusat'
  },
  {
    nip: '199305152022031002',
    nama: 'Siti Rahma',
    pangkat: 'Penata Muda Tk.I',
    golongan: 'III/b',
    jenjangJabatan: 'Ahli Pertama',
    kategori: 'Keahlian',
    unitKerja: 'Bagian Umum',
    tmtJabatan: '2022-06-01',
    tmtPangkat: '2022-06-01',
    pendidikan: 'S1 Hukum',
    akKumulatif: 65.50,
    status: 'Aktif',
    tempatLahir: 'Bandung',
    tanggalLahir: '1993-05-15',
    jenisKelamin: 'P',
    agama: 'Islam',
    email: 'siti.rahma@instansi.go.id',
    telepon: '081234567891',
    alamat: 'Jl. Asia Afrika No. 456, Bandung'
  },
  {
    nip: '198811202019032003',
    nama: 'Budi Santoso',
    pangkat: 'Penata',
    golongan: 'III/c',
    jenjangJabatan: 'Ahli Muda',
    kategori: 'Keahlian',
    unitKerja: 'Bagian Keuangan',
    tmtJabatan: '2019-09-01',
    tmtPangkat: '2021-04-01',
    pendidikan: 'S1 Akuntansi',
    akKumulatif: 87.25,
    status: 'Aktif',
    tempatLahir: 'Surabaya',
    tanggalLahir: '1988-11-20',
    jenisKelamin: 'L',
    agama: 'Kristen',
    email: 'budi.santoso@instansi.go.id',
    telepon: '081234567892',
    alamat: 'Jl. Tunjungan No. 789, Surabaya'
  },

  // KATEGORI KETERAMPILAN
  {
    nip: '199810152022051005',
    nama: 'Rina Handayani',
    pangkat: 'Pengatur Muda',
    golongan: 'II/a',
    jenjangJabatan: 'Pemula',
    kategori: 'Keterampilan',
    unitKerja: 'Bagian Umum',
    tmtJabatan: '2022-05-01',
    tmtPangkat: '2022-05-01',
    pendidikan: 'D3 Administrasi',
    akKumulatif: 8.50,
    status: 'Aktif',
    tempatLahir: 'Yogyakarta',
    tanggalLahir: '1998-10-15',
    jenisKelamin: 'P',
    agama: 'Islam',
    email: 'rina.handayani@instansi.go.id',
    telepon: '081234567893',
    alamat: 'Jl. Malioboro No. 321, Yogyakarta'
  },
  {
    nip: '199512102021041006',
    nama: 'Joko Prasetyo',
    pangkat: 'Pengatur',
    golongan: 'II/c',
    jenjangJabatan: 'Terampil',
    kategori: 'Keterampilan',
    unitKerja: 'Bagian Logistik',
    tmtJabatan: '2021-04-01',
    tmtPangkat: '2022-11-01',
    pendidikan: 'D3 Teknik',
    akKumulatif: 45.20,
    status: 'Aktif',
    tempatLahir: 'Semarang',
    tanggalLahir: '1995-12-10',
    jenisKelamin: 'L',
    agama: 'Islam',
    email: 'joko.prasetyo@instansi.go.id',
    telepon: '081234567894',
    alamat: 'Jl. Pemuda No. 654, Semarang'
  }
];

// ==================== UTILITIES - SESUAI PERATURAN BKN NO. 3 TAHUN 2023 ====================
class AngkaKreditCalculator {
  // Koefisien tahunan sesuai Peraturan BKN Pasal 13
  static getKoefisien(jenjangJabatan: string): number {
    const koefisienMap: { [key: string]: number } = {
      // KATEGORI KEAHLIAN
      'Ahli Pertama': 12.5,
      'Ahli Muda': 25.0,
      'Ahli Madya': 37.5,
      'Ahli Utama': 50.0,
      
      // KATEGORI KETERAMPILAN
      'Pemula': 5.0,
      'Terampil': 8.0,
      'Mahir': 12.5,
      'Penyelia': 25.0
    };
    
    return koefisienMap[jenjangJabatan] || 12.5;
  }

  static hitungAK(
    jenjangJabatan: string, 
    predikat: number, 
    isPeriodik: boolean = false, 
    bulanPeriodik: number = 0
  ): number {
    const koefisien = this.getKoefisien(jenjangJabatan);
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

  // Kebutuhan AK untuk kenaikan jenjang - SESUAI Pasal 21 ayat (4)
  static getKebutuhanJenjang(jenjangSekarang: string, kategori: string): number {
    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100,  // → Ahli Muda
      'Ahli Muda': 200,     // → Ahli Madya  
      'Ahli Madya': 450     // → Ahli Utama
    };
    
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Pemula': 15,     // → Terampil
      'Terampil': 60,   // → Mahir
      'Mahir': 100      // → Penyelia
    };
    
    const kebutuhan = kategori === 'Keahlian' ? kebutuhanKeahlian : kebutuhanKeterampilan;
    return kebutuhan[jenjangSekarang] || 0;
  }

  // Estimasi kenaikan yang benar
  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi: number = 1.00): EstimasiKenaikan {
    const golonganBerikutnya = this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jenjangBerikutnya = this.getJenjangBerikutnya(karyawan.jenjangJabatan, karyawan.kategori);
    
    const kebutuhanPangkat = this.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJenjang = this.getKebutuhanJenjang(karyawan.jenjangJabatan, karyawan.kategori);
    
    const kekuranganPangkat = Math.max(0, kebutuhanPangkat - karyawan.akKumulatif);
    const kekuranganJenjang = Math.max(0, kebutuhanJenjang - karyawan.akKumulatif);
    
    const koefisien = this.getKoefisien(karyawan.jenjangJabatan);
    const akPerBulan = (predikatAsumsi * koefisien) / 12;
    
    // Hitung bulan untuk pangkat dan jenjang terpisah
    const bulanDibutuhkanPangkat = akPerBulan > 0 ? Math.ceil(kekuranganPangkat / akPerBulan) : 0;
    const bulanDibutuhkanJenjang = akPerBulan > 0 ? Math.ceil(kekuranganJenjang / akPerBulan) : 0;
    
    const sekarang = new Date();
    const estimasiTanggalPangkat = new Date(sekarang);
    estimasiTanggalPangkat.setMonth(sekarang.getMonth() + bulanDibutuhkanPangkat);
    
    const estimasiTanggalJenjang = new Date(sekarang);
    estimasiTanggalJenjang.setMonth(sekarang.getMonth() + bulanDibutuhkanJenjang);
    
    return {
      kebutuhanAKPangkat: kebutuhanPangkat,
      kebutuhanAKJenjang: kebutuhanJenjang,
      kekuranganAKPangkat: kekuranganPangkat,
      kekuranganAKJenjang: kekuranganJenjang,
      predikatAsumsi,
      bulanDibutuhkanPangkat,
      bulanDibutuhkanJenjang,
      estimasiTanggalPangkat: estimasiTanggalPangkat.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      estimasiTanggalJenjang: estimasiTanggalJenjang.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      bisaUsulPangkat: kekuranganPangkat <= 0,
      bisaUsulJenjang: kekuranganJenjang <= 0,
      golonganBerikutnya,
      jenjangBerikutnya,
      akPerBulan: Number(akPerBulan.toFixed(2))
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

  static getJenjangBerikutnya(jenjangSekarang: string, kategori: string): string {
    const progressionKeahlian: { [key: string]: string } = {
      'Ahli Pertama': 'Ahli Muda',
      'Ahli Muda': 'Ahli Madya', 
      'Ahli Madya': 'Ahli Utama'
    };
    
    const progressionKeterampilan: { [key: string]: string } = {
      'Pemula': 'Terampil',
      'Terampil': 'Mahir',
      'Mahir': 'Penyelia'
    };
    
    const progression = kategori === 'Keahlian' ? progressionKeahlian : progressionKeterampilan;
    return progression[jenjangSekarang] || 'Tidak Ada';
  }
}

// ==================== COMPONENTS ====================

// Komponen Progress Bar
const ProgressBar: React.FC<{ 
  progress: number; 
  label: string; 
  akSaatIni: number; 
  kebutuhanAK: number;
  type: 'pangkat' | 'jenjang';
  bulanDibutuhkan: number;
}> = ({ progress, label, akSaatIni, kebutuhanAK, type, bulanDibutuhkan }) => {
  const percentage = Math.min(progress * 100, 100);
  const getColorClass = () => {
    if (percentage >= 100) return 'from-green-500 to-green-600';
    if (percentage >= 80) return 'from-blue-500 to-blue-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getIcon = () => {
    return type === 'pangkat' ? '⭐' : '📈';
  };

  const getStatusText = () => {
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
          <span className="text-lg mr-2">{getIcon()}</span>
          <h3 className="text-md font-semibold text-gray-800">{label}</h3>
        </div>
        <div className={`text-xs font-medium px-2 py-1 rounded ${
          bulanDibutuhkan === 0 ? 'bg-green-100 text-green-800' :
          bulanDibutuhkan <= 6 ? 'bg-green-100 text-green-800' :
          bulanDibutuhkan <= 12 ? 'bg-blue-100 text-blue-800' :
          bulanDibutuhkan <= 24 ? 'bg-yellow-100 text-yellow-800' :
          'bg-orange-100 text-orange-800'
        }`}>
          {getStatusText()}
        </div>
      </div>
      
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
      
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
        <div className="text-center">
          <div className="font-semibold">AK Saat Ini</div>
          <div>{akSaatIni.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">Kebutuhan</div>
          <div>{kebutuhanAK}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">Kekurangan</div>
          <div className={kebutuhanAK - akSaatIni > 0 ? 'text-red-600' : 'text-green-600'}>
            {Math.max(0, kebutuhanAK - akSaatIni).toFixed(2)}
          </div>
        </div>
      </div>

      {percentage >= 100 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-center">
          <span className="text-green-800 text-sm font-semibold">✅ Sudah memenuhi syarat!</span>
        </div>
      )}
    </div>
  );
};

// Komponen Informasi Biodata Lengkap
const BiodataLengkap: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const formatTanggal = (tanggal: string) => {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const hitungUsia = (tanggalLahir: string) => {
    const today = new Date();
    const birthDate = new Date(tanggalLahir);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const hitungMasaKerja = (tmtJabatan: string) => {
    const today = new Date();
    const tmt = new Date(tmtJabatan);
    let years = today.getFullYear() - tmt.getFullYear();
    let months = today.getMonth() - tmt.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { years, months };
  };

  const masaKerja = hitungMasaKerja(karyawan.tmtJabatan);
  const usia = hitungUsia(karyawan.tanggalLahir);

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Biodata Lengkap</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Data Pribadi</h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Nama Lengkap</p>
                <p className="font-medium">{karyawan.nama}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">NIP</p>
                <p className="font-medium">{karyawan.nip}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tempat, Tanggal Lahir</p>
                <p className="font-medium">{karyawan.tempatLahir}, {formatTanggal(karyawan.tanggalLahir)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Usia</p>
                <p className="font-medium">{usia} tahun</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Jenis Kelamin</p>
                <p className="font-medium">{karyawan.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Agama</p>
                <p className="font-medium">{karyawan.agama}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Data Kepegawaian</h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">Pangkat / Golongan</p>
                <p className="font-medium">{karyawan.pangkat} ({karyawan.golongan})</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Jenjang Jabatan</p>
                <p className="font-medium">{karyawan.jenjangJabatan}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Kategori</p>
                <p className="font-medium">{karyawan.kategori}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unit Kerja</p>
                <p className="font-medium">{karyawan.unitKerja}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  karyawan.status === 'Aktif' 
                    ? 'bg-green-100 text-green-800' 
                    : karyawan.status === 'Pensiun'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {karyawan.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Masa Kerja & Pendidikan</h4>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500">TMT Jabatan</p>
                <p className="font-medium">{formatTanggal(karyawan.tmtJabatan)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">TMT Pangkat</p>
                <p className="font-medium">{formatTanggal(karyawan.tmtPangkat)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Masa Kerja</p>
                <p className="font-medium">{masaKerja.years} tahun {masaKerja.months} bulan</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pendidikan Terakhir</p>
                <p className="font-medium">{karyawan.pendidikan}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Angka Kredit</p>
                <p className="font-bold text-blue-600 text-lg">{karyawan.akKumulatif.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="font-semibold text-gray-700 mb-2 text-sm uppercase tracking-wide">Kontak & Alamat</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-medium">{karyawan.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Telepon</p>
            <p className="font-medium">{karyawan.telepon}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-gray-500">Alamat</p>
            <p className="font-medium">{karyawan.alamat}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Komponen Estimasi Kenaikan
const EstimasiKenaikan: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const [predikatAsumsi, setPredikatAsumsi] = useState(1.00);
  
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan, predikatAsumsi);

  const getPredikatText = (value: number) => {
    switch(value) {
      case 1.50: return 'Sangat Baik';
      case 1.00: return 'Baik';
      case 0.75: return 'Cukup';
      case 0.50: return 'Kurang';
      default: return 'Baik';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Estimasi Kenaikan</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asumsi Predikat Kinerja:
          </label>
          <select 
            value={predikatAsumsi}
            onChange={(e) => setPredikatAsumsi(parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1.50">Sangat Baik (150%)</option>
            <option value="1.00">Baik (100%)</option>
            <option value="0.75">Cukup (75%)</option>
            <option value="0.50">Kurang (50%)</option>
          </select>
        </div>
        
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-sm text-blue-700 font-medium">Perolehan AK per Bulan</p>
            <p className="text-2xl font-bold text-blue-800">{estimasi.akPerBulan}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 border-b pb-2">Kenaikan Pangkat</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pangkat berikutnya:</span>
              <span className="font-semibold">{estimasi.golonganBerikutnya}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kebutuhan AK:</span>
              <span className="font-semibold">{estimasi.kebutuhanAKPangkat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kekurangan AK:</span>
              <span className={`font-semibold ${estimasi.kekuranganAKPangkat > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {estimasi.kekuranganAKPangkat.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimasi tanggal:</span>
              <span className="font-semibold text-blue-600">{estimasi.estimasiTanggalPangkat}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 border-b pb-2">Kenaikan Jenjang</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Jenjang berikutnya:</span>
              <span className="font-semibold">{estimasi.jenjangBerikutnya}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kebutuhan AK:</span>
              <span className="font-semibold">{estimasi.kebutuhanAKJenjang}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kekurangan AK:</span>
              <span className={`font-semibold ${estimasi.kekuranganAKJenjang > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {estimasi.kekuranganAKJenjang.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimasi tanggal:</span>
              <span className="font-semibold text-blue-600">{estimasi.estimasiTanggalJenjang}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>Informasi:</strong> Estimasi berdasarkan predikat "{getPredikatText(predikatAsumsi)}" 
          dengan perolehan {estimasi.akPerBulan} AK/bulan. Perhitungan sesuai Peraturan BKN No. 3 Tahun 2023.
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
      karyawan.jenjangJabatan,
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
      jenjangSaatInput: karyawan.jenjangJabatan,
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

  const currentKoefisien = AngkaKreditCalculator.getKoefisien(karyawan.jenjangJabatan);
  const calculatedAK = AngkaKreditCalculator.hitungAK(
    karyawan.jenjangJabatan,
    formData.predikatKinerja,
    formData.jenisPenilaian === 'Periodik',
    formData.bulanPeriodik
  );

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-6">Input Predikat Kinerja - {karyawan.nama}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Periode Penilaian</label>
          <input 
            type="month" 
            value={formData.periode}
            onChange={(e) => setFormData({...formData, periode: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Predikat Kinerja</label>
          <select 
            value={formData.predikatKinerja}
            onChange={(e) => setFormData({...formData, predikatKinerja: parseFloat(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1.50">Sangat Baik (150%)</option>
            <option value="1.00">Baik (100%)</option>
            <option value="0.75">Cukup (75%)</option>
            <option value="0.50">Kurang (50%)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <label className="text-sm font-medium text-gray-700">Keterangan</label>
        <input 
          type="text" 
          value={formData.keterangan}
          onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
          placeholder="Capaian SKP, evaluasi, dll."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-700 mb-3">Perhitungan Angka Kredit:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Jenjang</p>
            <p className="font-semibold text-gray-800">{karyawan.jenjangJabatan}</p>
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
            <p className="font-bold text-blue-600 text-lg">{calculatedAK}</p>
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleCalculate}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Simpan Data Kinerja
      </button>
    </div>
  );
};

// Komponen Dashboard Karyawan
const EmployeeDashboard: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const golonganBerikutnya = AngkaKreditCalculator.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
  const jenjangBerikutnya = AngkaKreditCalculator.getJenjangBerikutnya(karyawan.jenjangJabatan, karyawan.kategori);
  
  const kebutuhanPangkat = AngkaKreditCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
  const kebutuhanJenjang = AngkaKreditCalculator.getKebutuhanJenjang(karyawan.jenjangJabatan, karyawan.kategori);
  
  const progressPangkat = karyawan.akKumulatif / kebutuhanPangkat;
  const progressJenjang = karyawan.akKumulatif / kebutuhanJenjang;

  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);

  return (
    <div className="space-y-6">
      <BiodataLengkap karyawan={karyawan} />

      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{karyawan.nama}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
            <p>{karyawan.pangkat} ({karyawan.golongan})</p>
            <p>{karyawan.jenjangJabatan} - {karyawan.kategori}</p>
            <p>Unit: {karyawan.unitKerja}</p>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-600">AK Kumulatif: {karyawan.akKumulatif.toFixed(2)}</p>
          </div>
        </div>

        {/* PROGRESS BAR PANGKAT DAN JENJANG */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProgressBar 
            progress={progressPangkat}
            label={`Kenaikan Pangkat ke ${golonganBerikutnya}`}
            akSaatIni={karyawan.akKumulatif}
            kebutuhanAK={kebutuhanPangkat}
            type="pangkat"
            bulanDibutuhkan={estimasi.bulanDibutuhkanPangkat}
          />
          
          <ProgressBar 
            progress={progressJenjang}
            label={`Kenaikan Jenjang ke ${jenjangBerikutnya}`}
            akSaatIni={karyawan.akKumulatif}
            kebutuhanAK={kebutuhanJenjang}
            type="jenjang"
            bulanDibutuhkan={estimasi.bulanDibutuhkanJenjang}
          />
        </div>
      </div>

      <EstimasiKenaikan karyawan={karyawan} />
    </div>
  );
};

// Komponen Daftar Karyawan - Minimalis
const EmployeeList: React.FC<{ 
  karyawanList: Karyawan[]; 
  onSelect: (karyawan: Karyawan) => void;
  selectedNip: string | null;
}> = ({ karyawanList, onSelect, selectedNip }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredKaryawan = karyawanList.filter(karyawan =>
    karyawan.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    karyawan.nip.includes(searchTerm) ||
    karyawan.unitKerja.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari nama, NIP, atau unit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
      </div>

      <h3 className="text-lg font-semibold text-white mb-4">
        Daftar Karyawan ({filteredKaryawan.length} orang)
      </h3>
      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {filteredKaryawan.map(karyawan => (
          <div 
            key={karyawan.nip} 
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedNip === karyawan.nip 
                ? 'bg-white text-gray-900 shadow-md border border-blue-300' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            onClick={() => onSelect(karyawan)}
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium text-sm">{karyawan.nama}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                karyawan.status === 'Aktif' 
                  ? 'bg-green-500/20 text-green-300' 
                  : karyawan.status === 'Pensiun'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-yellow-500/20 text-yellow-300'
              }`}>
                {karyawan.status}
              </span>
            </div>
            <div className="text-xs opacity-90 space-y-1">
              <p>{karyawan.pangkat}</p>
              <p>{karyawan.jenjangJabatan}</p>
              <p className="font-semibold">AK: {karyawan.akKumulatif.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
const App: React.FC = () => {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>(dummyKaryawan);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [inputHistory, setInputHistory] = useState<InputKinerja[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input'>('dashboard');

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

  const totalKaryawan = karyawanList.length;
  const aktifKaryawan = karyawanList.filter(k => k.status === 'Aktif').length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white py-6 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔄 Aplikasi Penghitungan Angka Kredit</h1>
          <p className="text-white/90">Berdasarkan Peraturan BKN No. 3 Tahun 2023 - SUDAH SESUAI</p>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar - Minimalis */}
        <div className="w-80 min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 text-white shadow-xl">
          <EmployeeList 
            karyawanList={karyawanList} 
            onSelect={setSelectedKaryawan}
            selectedNip={selectedKaryawan?.nip || null}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {selectedKaryawan ? (
            <>
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 p-1 bg-gray-200 rounded-lg w-fit">
                <button 
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    activeTab === 'dashboard' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    activeTab === 'input' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('input')}
                >
                  📥 Input Kinerja
                </button>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
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
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Selamat Datang!</h2>
                <p className="text-gray-600 mb-8">
                  Pilih karyawan dari daftar di sebelah kiri untuk melihat dashboard dan input kinerja.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-2xl font-bold text-blue-600">{totalKaryawan}</h3>
                    <p className="text-sm text-gray-600">Total Karyawan</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-2xl font-bold text-green-600">{aktifKaryawan}</h3>
                    <p className="text-sm text-gray-600">Karyawan Aktif</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;