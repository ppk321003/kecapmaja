// App.tsx - VERSI LENGKAP DENGAN PERBAIKAN SESUAI PERMINTAAN
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
  kategori: 'Keahlian' | 'Keterampilan';
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
  kelebihanAKPangkat: number;
  kelebihanAKJabatan: number;
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
}

// ==================== GOOGLE SHEETS CONFIG ====================
const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "data";

// ==================== UTILITIES - SESUAI JENJANG LEMBAGA ANDA ====================
class AngkaKreditCalculator {
  static getKoefisien(jabatan: string): number {
    const koefisienMap: { [key: string]: number } = {
      'Ahli Pertama': 12.5,
      'Ahli Muda': 25.0,
      'Ahli Madya': 37.5,
      'Ahli Utama': 50.0,
      'Pranata Komputer Ahli Pertama': 12.5,
      'Pranata Komputer Ahli Muda': 25.0,
      'Pranata Komputer Ahli Madya': 37.5,
      'Pranata Komputer Ahli Utama': 50.0,
      'Terampil': 8.0,
      'Mahir': 12.5,
      'Penyelia': 25.0,
      'Kepala BPS': 50.0,
      'Kepala Subbagian Umum': 37.5,
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
    return kebutuhan[golonganSekarang] || 100;
  }

  static getKebutuhanJabatan(jabatanSekarang: string, kategori: string): number {
    const kebutuhanKeahlian: { [key: string]: number } = {
      'Ahli Pertama': 100, 'Ahli Muda': 200, 'Ahli Madya': 300
    };
    const kebutuhanKeterampilan: { [key: string]: number } = {
      'Terampil': 60, 'Mahir': 100
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

  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi: number = 1.00): EstimasiKenaikan {
    const golonganBerikutnya = this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jabatanBerikutnya = this.getJabatanBerikutnya(karyawan.jabatan, karyawan.kategori);

    const kebutuhanPangkat = this.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJabatan = this.getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori);

    const kekuranganPangkat = Math.max(0, kebutuhanPangkat - karyawan.akKumulatif);
    const kekuranganJabatan = Math.max(0, kebutuhanJabatan - karyawan.akKumulatif);
    const kelebihanPangkat = Math.max(0, karyawan.akKumulatif - kebutuhanPangkat);
    const kelebihanJabatan = Math.max(0, karyawan.akKumulatif - kebutuhanJabatan);

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
      kelebihanAKPangkat: kelebihanPangkat,
      kelebihanAKJabatan: kelebihanJabatan,
      predikatAsumsi,
      bulanDibutuhkanPangkat,
      bulanDibutuhkanJabatan,
      estimasiTanggalPangkat: estimasiTanggalPangkat.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      }),
      estimasiTanggalJabatan: estimasiTanggalJabatan.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      }),
      bisaUsulPangkat: kekuranganPangkat <= 0,
      bisaUsulJabatan: kekuranganJabatan <= 0,
      golonganBerikutnya,
      jabatanBerikutnya,
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

  static getJabatanBerikutnya(jabatanSekarang: string, kategori: string): string {
    const progressionKeahlian: { [key: string]: string } = {
      'Ahli Pertama': 'Ahli Muda', 'Ahli Muda': 'Ahli Madya', 'Ahli Madya': 'Ahli Utama'
    };
    const progressionKeterampilan: { [key: string]: string } = {
      'Terampil': 'Mahir', 'Mahir': 'Penyelia'
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
    return 'Tidak Ada';
  }
}

// ==================== COMPONENTS ====================
// Progress Bar dengan tambahan Kelebihan
const ProgressBar: React.FC<{
  progress: number;
  label: string;
  akSaatIni: number;
  kebutuhanAK: number;
  kekurangan: number;
  kelebihan: number;
  type: 'pangkat' | 'jabatan';
  bulanDibutuhkan: number;
}> = ({ progress, label, akSaatIni, kebutuhanAK, kekurangan, kelebihan, type, bulanDibutuhkan }) => {
  const percentage = Math.min(progress * 100, 100);
  const getColorClass = () => {
    if (percentage >= 100) return 'from-green-500 to-green-600';
    if (percentage >= 80) return 'from-blue-500 to-blue-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };
  const getIcon = () => type === 'pangkat' ? 'Pangkat' : 'Jabatan';
  const getStatusText = () => {
    if (bulanDibutuhkan === 0) return 'Bisa diusulkan sekarang!';
    if (bulanDibutuhkan <= 6) return `Sangat dekat (${bulanDibutuhkan} bulan)`;
    if (bulanDibutuhkan <= 12) return `Mendekati syarat (${bulanDibutuhkan} bulan)`;
    if (bulanDibutuhkan <= 24) return `Butuh waktu (${bulanDibutuhkan} bulan)`;
    return `Butuh waktu lebih lama (${bulanDibutuhkan} bulan)`;
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

      <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
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
          <div className={kekurangan > 0 ? 'text-red-600' : 'text-green-600'}>
            {kekurangan.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="font-semibold">Kelebihan</div>
          <div className="text-green-600">{kelebihan.toFixed(2)}</div>
        </div>
      </div>

      {percentage >= 100 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-center">
          <span className="text-green-800 text-sm font-semibold">Sudah memenuhi syarat!</span>
        </div>
      )}
    </div>
  );
};

// Parsing NIP
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

// Biodata dengan tmtJabatan & tmtPangkat
const BiodataSederhana: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const formatTanggal = (tanggal: string) => {
    if (!tanggal) return '-';
    try {
      const date = new Date(tanggal);
      if (isNaN(date.getTime())) {
        const parts = tanggal.split('/');
        if (parts.length === 3) {
          const newDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          return newDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        return tanggal;
      }
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-3">Informasi Karyawan</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500">Nama</p><p className="font-semibold text-gray-800">{karyawan.nama}</p></div>
          <div><p className="text-xs text-gray-500">NIP</p><p className="font-medium text-gray-700">{karyawan.nip}</p></div>
          <div><p className="text-xs text-gray-500">Usia</p><p className="font-medium text-gray-700">{usia} tahun</p></div>
        </div>
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500">Pangkat / Golongan</p><p className="font-semibold text-gray-800">{karyawan.pangkat} ({karyawan.golongan})</p></div>
          <div><p className="text-xs text-gray-500">Jabatan</p><p className="font-medium text-gray-700">{karyawan.jabatan}</p></div>
          <div><p className="text-xs text-gray-500">TMT Jabatan</p><p className="font-medium text-gray-700">{formatTanggal(karyawan.tmtJabatan)}</p></div>
        </div>
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500">Unit Kerja</p><p className="font-medium text-gray-700">{karyawan.unitKerja}</p></div>
          <div><p className="text-xs text-gray-500">TMT Pangkat</p><p className="font-medium text-gray-700">{formatTanggal(karyawan.tmtPangkat)}</p></div>
          <div><p className="text-xs text-gray-500">Pendidikan</p><p className="font-medium text-gray-700">{karyawan.pendidikan}</p></div>
        </div>
        <div className="space-y-2">
          <div><p className="text-xs text-gray-500">Jenis Kelamin</p><p className="font-medium text-gray-700">{nipData.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p></div>
          <div><p className="text-xs text-gray-500">AK Kumulatif</p><p className="font-bold text-blue-600 text-lg">{karyawan.akKumulatif.toFixed(2)}</p></div>
        </div>
      </div>
    </div>
  );
};

// Radio Button Predikat Kinerja (1 baris)
const PredikatKinerjaRadio: React.FC<{
  selectedValue: number;
  onValueChange: (value: number) => void;
}> = ({ selectedValue, onValueChange }) => {
  const options = [
    { value: 1.50, label: 'Sangat Baik (150% - Performa luar biasa)', color: 'bg-green-500' },
    { value: 1.00, label: 'Baik (100% - Performa Baik)', color: 'bg-blue-500' },
    { value: 0.75, label: 'Cukup (75% - Perlu peningkatan)', color: 'bg-yellow-500' },
    { value: 0.50, label: 'Kurang (50% - Perlu perbaikan serius)', color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Asumsi Predikat Kinerja:</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onValueChange(opt.value)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedValue === opt.value
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Tabel Karyawan Compact Tanpa Warna
const EmployeeTable: React.FC<{
  karyawanList: Karyawan[];
  onSelect: (karyawan: Karyawan) => void;
  selectedNip: string | null;
  loading: boolean;
}> = ({ karyawanList, onSelect, selectedNip, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Karyawan>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredKaryawan = karyawanList.filter(k =>
    k.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.nip.includes(searchTerm) ||
    k.unitKerja.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedKaryawan = [...filteredKaryawan].sort((a, b) => {
    const aVal = a[sortField], bVal = b[sortField];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const handleSort = (field: keyof Karyawan) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6 text-center py-8">
        <div className="text-4xl mb-2">Memuat...</div>
        <p className="text-sm text-gray-600">Sedang mengambil data dari Google Sheets</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 mb-6">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari nama, NIP, atau unit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredKaryawan.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Tidak ada data ditemukan</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b text-gray-700 uppercase">
              <tr>
                {['nama', 'nip', 'golongan', 'pangkat', 'jabatan', 'akKumulatif'].map((field) => (
                  <th key={field} className="px-3 py-2 cursor-pointer hover:bg-gray-100" onClick={() => handleSort(field as keyof Karyawan)}>
                    {field === 'akKumulatif' ? 'AK Kumulatif' : field.charAt(0).toUpperCase() + field.slice(1)}
                    <span className="ml-1">{sortField === field ? (sortDirection === 'asc' ? 'Up' : 'Down') : 'UpDown'}</span>
                  </th>
                ))}
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedKaryawan.map((k) => (
                <tr key={k.nip} className={`border-b hover:bg-gray-50 ${selectedNip === k.nip ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-2 font-medium">{k.nama}</td>
                  <td className="px-3 py-2"><code className="bg-gray-100 px-1 rounded text-xs">{k.nip}</code></td>
                  <td className="px-3 py-2">{k.golongan}</td>
                  <td className="px-3 py-2">{k.pangkat}</td>
                  <td className="px-3 py-2 truncate max-w-32">{k.jabatan}</td>
                  <td className="px-3 py-2 font-bold text-blue-600">{k.akKumulatif.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => onSelect(k)} className="text-blue-600 hover:text-blue-800">
                      Masuk
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 text-xs text-gray-500">
        Menampilkan {filteredKaryawan.length} dari {karyawanList.length} karyawan
      </div>
    </div>
  );
};

// Estimasi Kenaikan dengan "Estimasi dalam Bulan"
const EstimasiKenaikan: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const [predikatAsumsi, setPredikatAsumsi] = useState(1.00);
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan, predikatAsumsi);

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Estimasi Kenaikan</h3>
      <PredikatKinerjaRadio selectedValue={predikatAsumsi} onValueChange={setPredikatAsumsi} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
        <div className="space-y-2">
          <h4 className="font-semibold border-b pb-1">Kenaikan Pangkat</h4>
          <div className="flex justify-between"><span>Pangkat berikutnya:</span><span className="font-medium">{estimasi.golonganBerikutnya}</span></div>
          <div className="flex justify-between"><span>Kebutuhan AK:</span><span>{estimasi.kebutuhanAKPangkat}</span></div>
          <div className="flex justify-between"><span>Kekurangan AK:</span><span className={estimasi.kekuranganAKPangkat > 0 ? 'text-red-600' : 'text-green-600'}>{estimasi.kekuranganAKPangkat.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Kelebihan AK:</span><span className="text-green-600">{estimasi.kelebihanAKPangkat.toFixed(2)}</span></div>
          <div className="flex justify-between text-xs"><span>Estimasi dalam bulan:</span><span className="font-bold text-blue-600">{estimasi.bulanDibutuhkanPangkat} bulan</span></div>
          <div className="flex justify-between text-xs"><span>Estimasi tanggal:</span><span>{estimasi.estimasiTanggalPangkat}</span></div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold border-b pb-1">Kenaikan Jabatan</h4>
          <div className="flex justify-between"><span>Jabatan berikutnya:</span><span className="font-medium">{estimasi.jabatanBerikutnya}</span></div>
          <div className="flex justify-between"><span>Kebutuhan AK:</span><span>{estimasi.kebutuhanAKJabatan}</span></div>
          <div className="flex justify-between"><span>Kekurangan AK:</span><span className={estimasi.kekuranganAKJabatan > 0 ? 'text-red-600' : 'text-green-600'}>{estimasi.kekuranganAKJabatan.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Kelebihan AK:</span><span className="text-green-600">{estimasi.kelebihanAKJabatan.toFixed(2)}</span></div>
          <div className="flex justify-between text-xs"><span>Estimasi dalam bulan:</span><span className="font-bold text-blue-600">{estimasi.bulanDibutuhkanJabatan} bulan</span></div>
          <div className="flex justify-between text-xs"><span>Estimasi tanggal:</span><span>{estimasi.estimasiTanggalJabatan}</span></div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
        <strong>Info:</strong> Perolehan {estimasi.akPerBulan} AK/bulan dengan predikat {predikatAsumsi * 100}%.
      </div>
    </div>
  );
};

// Input Kinerja
const InputKinerjaForm: React.FC<{ karyawan: Karyawan; onSave: (input: InputKinerja) => void }> = ({ karyawan, onSave }) => {
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
    setFormData({ ...formData, predikatKinerja: 1.00, keterangan: '' });
    alert('Data kinerja berhasil disimpan!');
  };

  const calculatedAK = AngkaKreditCalculator.hitungAK(
    karyawan.jabatan,
    formData.predikatKinerja,
    formData.jenisPenilaian === 'Periodik',
    formData.bulanPeriodik
  );

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Input Kinerja - {karyawan.nama}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <input type="month" value={formData.periode} onChange={(e) => setFormData({ ...formData, periode: e.target.value })} className="px-3 py-2 border rounded text-sm" />
        <select value={formData.jenisPenilaian} onChange={(e) => setFormData({ ...formData, jenisPenilaian: e.target.value as any })} className="px-3 py-2 border rounded text-sm">
          <option value="Tahunan">Tahunan</option>
          <option value="Periodik">Periodik</option>
        </select>
        {formData.jenisPenilaian === 'Periodik' && (
          <input type="number" min="1" max="11" value={formData.bulanPeriodik} onChange={(e) => setFormData({ ...formData, bulanPeriodik: parseInt(e.target.value) })} className="px-3 py-2 border rounded text-sm" placeholder="Bulan" />
        )}
      </div>

      <PredikatKinerjaRadio selectedValue={formData.predikatKinerja} onValueChange={(v) => setFormData({ ...formData, predikatKinerja: v })} />
      <input type="text" value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })} placeholder="Keterangan" className="w-full mt-3 px-3 py-2 border rounded text-sm" />

      <div className="bg-gray-50 p-3 rounded mt-3 text-xs">
        <div className="grid grid-cols-4 gap-2">
          <div><strong>Jabatan:</strong> {karyawan.jabatan}</div>
          <div><strong>Koef:</strong> {AngkaKreditCalculator.getKoefisien(karyawan.jabatan)}</div>
          <div><strong>Predikat:</strong> {formData.predikatKinerja * 100}%</div>
          <div><strong>AK:</strong> <span className="font-bold text-blue-600">{calculatedAK}</span></div>
        </div>
      </div>

      <button onClick={handleCalculate} className="w-full mt-4 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition">
        Simpan Data Kinerja
      </button>
    </div>
  );
};

// Dashboard
const EmployeeDashboard: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan);
  const progressPangkat = karyawan.akKumulatif / estimasi.kebutuhanAKPangkat;
  const progressJabatan = karyawan.akKumulatif / estimasi.kebutuhanAKJabatan;

  return (
    <div className="space-y-4">
      <BiodataSederhana karyawan={karyawan} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgressBar
          progress={progressPangkat}
          label={`Kenaikan Pangkat ke ${estimasi.golonganBerikutnya}`}
          akSaatIni={karyawan.akKumulatif}
          kebutuhanAK={estimasi.kebutuhanAKPangkat}
          kekurangan={estimasi.kekuranganAKPangkat}
          kelebihan={estimasi.kelebihanAKPangkat}
          type="pangkat"
          bulanDibutuhkan={estimasi.bulanDibutuhkanPangkat}
        />
        <ProgressBar
          progress={progressJabatan}
          label={`Kenaikan Jabatan ke ${estimasi.jabatanBerikutnya}`}
          akSaatIni={karyawan.akKumulatif}
          kebutuhanAK={estimasi.kebutuhanAKJabatan}
          kekurangan={estimasi.kekuranganAKJabatan}
          kelebihan={estimasi.kelebihanAKJabatan}
          type="jabatan"
          bulanDibutuhkan={estimasi.bulanDibutuhkanJabatan}
        />
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
        body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: `${SHEET_NAME}!A:M` }
      });
      if (error) throw error;

      const rows = data.values || [];
      const karyawanData: Karyawan[] = rows.slice(1).filter((row: any[]) => row[0]).map((row: any[]) => {
        const ak = parseFloat((row[6] || '0').toString().replace(',', '.')) || 0;
        const nipData = parseNIP(row[0]?.toString() || '');
        return {
          nip: row[0]?.toString() || '',
          nama: row[1]?.toString() || '',
          pangkat: row[2]?.toString() || '',
          golongan: row[3]?.toString() || '',
          jabatan: row[4]?.toString() || '',
          unitKerja: row[8]?.toString() || '',
          tmtJabatan: row[9]?.toString() || '',
          tmtPangkat: row[10]?.toString() || '',
          pendidikan: row[11]?.toString() || '',
          akKumulatif: ak,
          status: (row[7]?.toString() as any) || 'Aktif',
          tempatLahir: '', tanggalLahir: nipData.tanggalLahir, jenisKelamin: nipData.jenisKelamin,
          agama: '', email: '', telepon: '', alamat: ''
        };
      });
      setKaryawanList(karyawanData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKaryawanData(); }, []);

  const handleSaveInput = (newInput: InputKinerja) => {
    setInputHistory([...inputHistory, newInput]);
    if (selectedKaryawan) {
      const updated = karyawanList.map(k =>
        k.nip === selectedKaryawan.nip ? { ...k, akKumulatif: k.akKumulatif + newInput.akDiperoleh } : k
      );
      setKaryawanList(updated);
      setSelectedKaryawan(updated.find(k => k.nip === selectedKaryawan.nip) || null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Aplikasi Penghitungan Angka Kredit</h1>
          <p className="text-sm opacity-90">Berdasarkan Peraturan BKN No. 3 Tahun 2023</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {!selectedKaryawan ? (
          <EmployeeTable karyawanList={karyawanList} onSelect={setSelectedKaryawan} selectedNip={null} loading={loading} />
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setSelectedKaryawan(null)} className="text-blue-600 hover:underline text-sm">Kembali</button>
              <h2 className="text-xl font-bold">{selectedKaryawan.nama}</h2>
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-600'}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
                <button className={`px-3 py-1 rounded text-sm font-medium ${activeTab === 'input' ? 'bg-blue-600 text-white' : 'text-gray-600'}`} onClick={() => setActiveTab('input')}>Input Kinerja</button>
              </div>
            </div>

            {activeTab === 'dashboard' && <EmployeeDashboard karyawan={selectedKaryawan} />}
            {activeTab === 'input' && <InputKinerjaForm karyawan={selectedKaryawan} onSave={handleSaveInput} />}
          </>
        )}
      </div>
    </div>
  );
};

export default App;