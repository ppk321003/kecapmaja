// App.tsx
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
  kebutuhanAK: number;
  kekuranganAK: number;
  predikatAsumsi: number;
  bulanDibutuhkan: number;
  tahunDibutuhkan: number;
  estimasiTanggal: string;
  bisaUsulSekarang: boolean;
  jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Keduanya';
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
    status: 'Aktif'
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
    akKumulatif: 48.75,
    status: 'Aktif'
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
    status: 'Aktif'
  },

  // KATEGORI KETERAMPILAN
  {
    nip: '199810152022051004',
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
    status: 'Aktif'
  },
  {
    nip: '199512102021041005',
    nama: 'Joko Prasetyo',
    pangkat: 'Pengatur',
    golongan: 'II/c',
    jenjangJabatan: 'Terampil',
    kategori: 'Keterampilan',
    unitKerja: 'Bagian Logistik',
    tmtJabatan: '2021-04-01',
    tmtPangkat: '2022-11-01',
    pendidikan: 'D3 Teknik',
    akKumulatif: 35.20,
    status: 'Aktif'
  },
  {
    nip: '199103152018031006',
    nama: 'Maya Sari',
    pangkat: 'Penata Muda',
    golongan: 'III/a',
    jenjangJabatan: 'Mahir',
    kategori: 'Keterampilan',
    unitKerja: 'Bidang TI',
    tmtJabatan: '2018-03-01',
    tmtPangkat: '2020-09-01',
    pendidikan: 'D4 Komputer',
    akKumulatif: 68.90,
    status: 'Aktif'
  }
];

// ==================== UTILITIES ====================
class AngkaKreditCalculator {
  // Koefisien tahunan sesuai Peraturan BKN
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

  // Kebutuhan AK untuk kenaikan pangkat
  static getKebutuhanPangkat(golonganSekarang: string, kategori: string): number {
    const kebutuhanKeahlian: { [key: string]: number } = {
      'III/a': 50,   // Ahli Pertama III/a → III/b
      'III/b': 50,   // Ahli Pertama → Ahli Muda
      'III/c': 100,  // Ahli Muda III/c → III/d
      'III/d': 100,  // Ahli Muda → Ahli Madya
      'IV/a': 150,   // Ahli Madya IV/a → IV/b
      'IV/b': 150,   // Ahli Madya IV/b → IV/c
      'IV/c': 150,   // Ahli Madya → Ahli Utama
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

  // Kebutuhan AK untuk kenaikan jenjang
  static getKebutuhanJenjang(jenjangSekarang: string, kategori: string): number {
    const kebutuhan: { [key: string]: number } = {
      // KETERAMPILAN
      'Pemula': 15,
      'Terampil': 60,
      'Mahir': 100,
      
      // KEAHLIAN
      'Ahli Pertama': 100,
      'Ahli Muda': 200,
      'Ahli Madya': 450
    };
    
    return kebutuhan[jenjangSekarang] || 0;
  }

  // Estimasi kenaikan - PERBAIKAN PERHITUNGAN
  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi: number = 1.00): EstimasiKenaikan {
    const golonganBerikutnya = this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jenjangBerikutnya = this.getJenjangBerikutnya(karyawan.jenjangJabatan, karyawan.kategori);
    
    const kebutuhanPangkat = this.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const kebutuhanJenjang = this.getKebutuhanJenjang(karyawan.jenjangJabatan, karyawan.kategori);
    
    const kekuranganPangkat = Math.max(0, kebutuhanPangkat - karyawan.akKumulatif);
    const kekuranganJenjang = Math.max(0, kebutuhanJenjang - karyawan.akKumulatif);
    
    const koefisien = this.getKoefisien(karyawan.jenjangJabatan);
    const akPerBulan = (predikatAsumsi * koefisien) / 12;
    
    // PERBAIKAN: Hitung bulan berdasarkan AK per bulan, bukan tahun
    const bulanDibutuhkanPangkat = akPerBulan > 0 ? Math.ceil(kekuranganPangkat / akPerBulan) : 0;
    const bulanDibutuhkanJenjang = akPerBulan > 0 ? Math.ceil(kekuranganJenjang / akPerBulan) : 0;
    
    // Ambil yang paling besar antara kenaikan pangkat dan jenjang
    const bulanDibutuhkan = Math.max(bulanDibutuhkanPangkat, bulanDibutuhkanJenjang);
    
    const sekarang = new Date();
    const estimasiTanggal = new Date(sekarang);
    estimasiTanggal.setMonth(sekarang.getMonth() + bulanDibutuhkan);
    
    const bisaUsulSekarang = kekuranganPangkat <= 0;
    
    let jenisKenaikan: 'Pangkat' | 'Jenjang' | 'Keduanya' = 'Pangkat';
    if (kekuranganPangkat <= 0 && kekuranganJenjang <= 0) {
      jenisKenaikan = 'Keduanya';
    } else if (kekuranganJenjang <= 0) {
      jenisKenaikan = 'Jenjang';
    }
    
    return {
      kebutuhanAK: kebutuhanPangkat,
      kekuranganAK: kekuranganPangkat,
      predikatAsumsi,
      bulanDibutuhkan,
      tahunDibutuhkan: Math.ceil(bulanDibutuhkan / 12),
      estimasiTanggal: estimasiTanggal.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      bisaUsulSekarang,
      jenisKenaikan,
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
const ProgressBar: React.FC<{ progress: number; label: string }> = ({ progress, label }) => {
  const percentage = Math.min(progress * 100, 100);
  const getColorClass = () => {
    if (percentage >= 100) return 'from-green-500 to-green-600';
    if (percentage >= 80) return 'from-blue-500 to-blue-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-blue-600">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`bg-gradient-to-r ${getColorClass()} h-3 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// Komponen Estimasi Kenaikan - PERBAIKAN TAMPILAN
const EstimasiKenaikan: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const [predikatAsumsi, setPredikatAsumsi] = useState(1.00);
  
  const estimasi = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan, predikatAsumsi);

  const getStatusColor = () => {
    if (estimasi.bisaUsulSekarang) return 'bg-green-50 border-green-200 text-green-800';
    if (estimasi.bulanDibutuhkan <= 6) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (estimasi.bulanDibutuhkan <= 12) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-orange-50 border-orange-200 text-orange-800';
  };

  const getStatusText = () => {
    if (estimasi.bisaUsulSekarang) return '✅ Bisa diusulkan sekarang!';
    if (estimasi.bulanDibutuhkan <= 6) return '🟢 Sangat dekat (≤ 6 bulan)';
    if (estimasi.bulanDibutuhkan <= 12) return '🟡 Mendekati syarat (≤ 1 tahun)';
    if (estimasi.bulanDibutuhkan <= 24) return '🟠 Butuh waktu (≤ 2 tahun)';
    return '🔴 Butuh waktu lebih lama (> 2 tahun)';
  };

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
      <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Estimasi Kenaikan</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
        
        <div className={`p-3 rounded-lg border-2 ${getStatusColor()}`}>
          <p className="font-semibold text-center text-sm">{getStatusText()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Informasi Kenaikan</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Pangkat berikutnya:</span>
              <span className="font-semibold">{estimasi.golonganBerikutnya}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Jenjang berikutnya:</span>
              <span className="font-semibold">{estimasi.jenjangBerikutnya}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kebutuhan AK:</span>
              <span className="font-semibold">{estimasi.kebutuhanAK}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Kekurangan AK:</span>
              <span className={`font-semibold ${estimasi.kekuranganAK > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {estimasi.kekuranganAK.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold text-gray-700">Proyeksi Waktu</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Bulan dibutuhkan:</span>
              <span className="font-semibold">{estimasi.bulanDibutuhkan} bulan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tahun dibutuhkan:</span>
              <span className="font-semibold">{estimasi.tahunDibutuhkan} tahun</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimasi tanggal:</span>
              <span className="font-semibold text-blue-600">{estimasi.estimasiTanggal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">AK/Bulan:</span>
              <span className="font-semibold text-green-600">{estimasi.akPerBulan} AK</span>
            </div>
          </div>
        </div>
      </div>

      {estimasi.bisaUsulSekarang && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            <strong>Rekomendasi:</strong> Karyawan sudah memenuhi syarat angka kredit untuk kenaikan {estimasi.jenisKenaikan.toLowerCase()}. 
            Dapat diusulkan pada periode terdekat.
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>Catatan:</strong> Estimasi ini berdasarkan asumsi predikat "{getPredikatText(estimasi.predikatAsumsi)}" 
          ({estimasi.predikatAsumsi * 100}%) dan perhitungan angka kredit bulanan sebesar {estimasi.akPerBulan} AK/bulan.
          {estimasi.kekuranganAK > 0 && (
            <span> Dengan kekurangan {estimasi.kekuranganAK.toFixed(2)} AK, dibutuhkan {estimasi.bulanDibutuhkan} bulan pada predikat ini.</span>
          )}
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
  const kebutuhanAK = AngkaKreditCalculator.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
  const progressPangkat = karyawan.akKumulatif / kebutuhanAK;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{karyawan.nama}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
            <p>{karyawan.pangkat} ({karyawan.golongan})</p>
            <p>{karyawan.jenjangJabatan} - {karyawan.kategori}</p>
            <p>Unit: {karyawan.unitKerja}</p>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-600">AK Kumulatif: {karyawan.akKumulatif}</p>
          </div>
        </div>

        <ProgressBar 
          progress={progressPangkat}
          label={`Kenaikan Pangkat ke ${golonganBerikutnya}`}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">AK Saat Ini</p>
            <p className="text-xl font-bold text-gray-800">{karyawan.akKumulatif.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Kebutuhan</p>
            <p className="text-xl font-bold text-blue-600">{kebutuhanAK}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Kekurangan</p>
            <p className="text-xl font-bold text-red-600">
              {Math.max(0, kebutuhanAK - karyawan.akKumulatif).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <EstimasiKenaikan karyawan={karyawan} />
    </div>
  );
};

// Komponen Daftar Karyawan
const EmployeeList: React.FC<{ 
  karyawanList: Karyawan[]; 
  onSelect: (karyawan: Karyawan) => void;
  selectedNip: string | null;
}> = ({ karyawanList, onSelect, selectedNip }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-white mb-4">
        Daftar Karyawan ({karyawanList.length} orang)
      </h3>
      <div className="space-y-2">
        {karyawanList.map(karyawan => (
          <div 
            key={karyawan.nip} 
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedNip === karyawan.nip 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-blue-500/20 text-white hover:bg-blue-500/30'
            }`}
            onClick={() => onSelect(karyawan)}
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium">{karyawan.nama}</h4>
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
              <p>{karyawan.pangkat} ({karyawan.golongan})</p>
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
          <p className="text-white/90">Berdasarkan Peraturan BKN No. 3 Tahun 2023</p>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
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