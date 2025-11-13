// App.tsx
import React, { useState, useEffect } from 'react';

// ==================== TYPES ====================
interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jenjangJabatan: string;
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

interface Konfigurasi {
  jenjangJabatan: string;
  koefisienTahunan: number;
  akDasar: number;
  minimalKinerjaNaik: number;
  masaKerjaMinimal: number;
}

// ==================== DUMMY DATA ====================
const dummyKaryawan: Karyawan[] = [
  {
    nip: '199209132023021001',
    nama: 'Ahmad Wijaya',
    pangkat: 'Penata Muda',
    golongan: 'III/a',
    jenjangJabatan: 'Ahli Pertama',
    unitKerja: 'Bagian Kepegawaian',
    tmtJabatan: '2023-03-01',
    tmtPangkat: '2023-03-01',
    pendidikan: 'S1 Manajemen',
    akKumulatif: 12.50,
    status: 'Aktif'
  },
  {
    nip: '199305152022031002',
    nama: 'Siti Rahma',
    pangkat: 'Penata Muda Tk.I',
    golongan: 'III/b',
    jenjangJabatan: 'Ahli Pertama',
    unitKerja: 'Bagian Umum',
    tmtJabatan: '2022-06-01',
    tmtPangkat: '2022-06-01',
    pendidikan: 'S1 Hukum',
    akKumulatif: 25.75,
    status: 'Aktif'
  },
  {
    nip: '198811202019032003',
    nama: 'Budi Santoso',
    pangkat: 'Penata',
    golongan: 'III/c',
    jenjangJabatan: 'Ahli Muda',
    unitKerja: 'Bagian Keuangan',
    tmtJabatan: '2019-09-01',
    tmtPangkat: '2021-04-01',
    pendidikan: 'S1 Akuntansi',
    akKumulatif: 87.25,
    status: 'Aktif'
  },
  {
    nip: '199512102021041004',
    nama: 'Maya Sari',
    pangkat: 'Pembina',
    golongan: 'IV/a',
    jenjangJabatan: 'Ahli Madya',
    unitKerja: 'Bidang Program',
    tmtJabatan: '2021-02-01',
    tmtPangkat: '2023-01-01',
    pendidikan: 'S2 Administrasi',
    akKumulatif: 142.80,
    status: 'Aktif'
  },
  {
    nip: '199008152020121005',
    nama: 'Rizki Pratama',
    pangkat: 'Penata Tk.I',
    golongan: 'III/d',
    jenjangJabatan: 'Ahli Muda',
    unitKerja: 'Bidang TI',
    tmtJabatan: '2020-12-01',
    tmtPangkat: '2022-08-01',
    pendidikan: 'S1 Informatika',
    akKumulatif: 95.30,
    status: 'Aktif'
  },
  {
    nip: '198704102018031006',
    nama: 'Dewi Anggraini',
    pangkat: 'Pembina Tk.I',
    golongan: 'IV/b',
    jenjangJabatan: 'Ahli Madya',
    unitKerja: 'Bidang SDM',
    tmtJabatan: '2018-03-01',
    tmtPangkat: '2021-11-01',
    pendidikan: 'S2 Psikologi',
    akKumulatif: 178.45,
    status: 'Aktif'
  }
];

const dummyKonfigurasi: Konfigurasi[] = [
  {
    jenjangJabatan: 'Ahli Pertama',
    koefisienTahunan: 12.5,
    akDasar: 0,
    minimalKinerjaNaik: 1.00,
    masaKerjaMinimal: 2
  },
  {
    jenjangJabatan: 'Ahli Muda',
    koefisienTahunan: 25.0,
    akDasar: 0,
    minimalKinerjaNaik: 1.00,
    masaKerjaMinimal: 2
  },
  {
    jenjangJabatan: 'Ahli Madya',
    koefisienTahunan: 37.5,
    akDasar: 0,
    minimalKinerjaNaik: 1.00,
    masaKerjaMinimal: 2
  }
];

const dummyInputKinerja: InputKinerja[] = [
  {
    idInput: 'KIN-2024-01-001',
    nip: '199209132023021001',
    periode: '2024-01',
    jenisPenilaian: 'Tahunan',
    bulanPeriodik: 12,
    predikatKinerja: 1.50,
    akDiperoleh: 18.75,
    jenjangSaatInput: 'Ahli Pertama',
    tanggalInput: '2024-01-31',
    inputOleh: 'Dra. Maya',
    keterangan: 'SKP Tahunan 2023'
  }
];

// ==================== UTILITIES ====================
class AngkaKreditCalculator {
  static hitungAK(
    jenjangJabatan: string, 
    predikat: number, 
    isPeriodik: boolean = false, 
    bulanPeriodik: number = 0
  ): number {
    const koefisienMap: { [key: string]: number } = {
      'Ahli Pertama': 12.5,
      'Ahli Muda': 25.0,
      'Ahli Madya': 37.5,
      'Ahli Utama': 50.0
    };

    const koefisien = koefisienMap[jenjangJabatan] || 12.5;
    let angkaKredit = predikat * koefisien;
    
    if (isPeriodik && bulanPeriodik > 0) {
      angkaKredit = (bulanPeriodik / 12) * predikat * koefisien;
    }
    
    return Math.round(angkaKredit * 100) / 100;
  }

  static getKebutuhanAK(golonganSekarang: string, golonganTujuan: string): number {
    const kebutuhan: { [key: string]: number } = {
      'III/a_III/b': 50,
      'III/b_III/c': 50,
      'III/c_III/d': 100,
      'III/d_IV/a': 100,
      'IV/a_IV/b': 150
    };
    
    return kebutuhan[`${golonganSekarang}_${golonganTujuan}`] || 100;
  }
}

// ==================== COMPONENTS ====================

// Komponen Progress Bar
const ProgressBar: React.FC<{ progress: number; label: string }> = ({ progress, label }) => {
  const percentage = Math.min(progress * 100, 100);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-primary">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        ></div>
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
    
    // Reset form
    setFormData({
      periode: new Date().toISOString().slice(0, 7),
      jenisPenilaian: 'Tahunan',
      bulanPeriodik: 12,
      predikatKinerja: 1.00,
      keterangan: ''
    });

    alert('Data kinerja berhasil disimpan!');
  };

  const currentKoefisien = dummyKonfigurasi.find(k => k.jenjangJabatan === karyawan.jenjangJabatan)?.koefisienTahunan;
  const calculatedAK = AngkaKreditCalculator.hitungAK(
    karyawan.jenjangJabatan,
    formData.predikatKinerja,
    formData.jenisPenilaian === 'Periodik',
    formData.bulanPeriodik
  );

  return (
    <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
      <h3 className="text-xl font-bold text-foreground mb-6">Input Predikat Kinerja - {karyawan.nama}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Periode Penilaian</label>
          <input 
            type="month" 
            value={formData.periode}
            onChange={(e) => setFormData({...formData, periode: e.target.value})}
            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Jenis Penilaian</label>
          <select 
            value={formData.jenisPenilaian}
            onChange={(e) => setFormData({
              ...formData, 
              jenisPenilaian: e.target.value as 'Tahunan' | 'Periodik'
            })}
            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="Tahunan">Tahunan</option>
            <option value="Periodik">Periodik</option>
          </select>
        </div>

        {formData.jenisPenilaian === 'Periodik' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bulan Periodik</label>
            <input 
              type="number" 
              min="1" 
              max="11"
              value={formData.bulanPeriodik}
              onChange={(e) => setFormData({...formData, bulanPeriodik: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Predikat Kinerja</label>
          <select 
            value={formData.predikatKinerja}
            onChange={(e) => setFormData({...formData, predikatKinerja: parseFloat(e.target.value)})}
            className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="1.50">Sangat Baik (150%)</option>
            <option value="1.00">Baik (100%)</option>
            <option value="0.75">Cukup (75%)</option>
            <option value="0.50">Kurang (50%)</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <label className="text-sm font-medium text-foreground">Keterangan</label>
        <input 
          type="text" 
          value={formData.keterangan}
          onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
          placeholder="Capaian SKP, evaluasi, dll."
          className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-muted rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-foreground mb-3">Perhitungan Angka Kredit:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Jenjang</p>
            <p className="font-semibold text-foreground">{karyawan.jenjangJabatan}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Koefisien</p>
            <p className="font-semibold text-foreground">{currentKoefisien}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Predikat</p>
            <p className="font-semibold text-foreground">{formData.predikatKinerja * 100}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Hasil AK</p>
            <p className="font-bold text-primary text-lg">{calculatedAK}</p>
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleCalculate}
        className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Simpan Data Kinerja
      </button>
    </div>
  );
};

// Komponen Dashboard Karyawan
const EmployeeDashboard: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const getNextGolongan = (current: string): string => {
    const progression: { [key: string]: string } = {
      'III/a': 'III/b',
      'III/b': 'III/c', 
      'III/c': 'III/d',
      'III/d': 'IV/a',
      'IV/a': 'IV/b',
      'IV/b': 'IV/c'
    };
    return progression[current] || 'Tidak Ada';
  };

  const nextGolongan = getNextGolongan(karyawan.golongan);
  const kebutuhanAK = AngkaKreditCalculator.getKebutuhanAK(karyawan.golongan, nextGolongan);
  const progressPangkat = karyawan.akKumulatif / kebutuhanAK;
  const kekuranganAK = Math.max(0, kebutuhanAK - karyawan.akKumulatif);

  return (
    <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
      <div className="mb-6 pb-4 border-b border-border">
        <h2 className="text-2xl font-bold text-foreground mb-2">{karyawan.nama}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
          <p>{karyawan.pangkat} ({karyawan.golongan})</p>
          <p>{karyawan.jenjangJabatan}</p>
          <p>Unit: {karyawan.unitKerja}</p>
        </div>
        <div className="mt-3 p-3 bg-primary/10 rounded-lg">
          <p className="text-lg font-bold text-primary">AK Kumulatif: {karyawan.akKumulatif}</p>
        </div>
      </div>

      <div className="space-y-6">
        <ProgressBar 
          progress={progressPangkat}
          label={`Kenaikan Pangkat ke ${nextGolongan}`}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">AK Saat Ini</p>
            <p className="text-xl font-bold text-foreground">{karyawan.akKumulatif}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Kebutuhan</p>
            <p className="text-xl font-bold text-primary">{kebutuhanAK}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Kekurangan</p>
            <p className="text-xl font-bold text-accent">{kekuranganAK.toFixed(2)}</p>
          </div>
        </div>

        {progressPangkat >= 1 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold text-center">
              ✅ Sudah memenuhi syarat untuk kenaikan pangkat!
            </p>
          </div>
        )}
      </div>
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
      <h3 className="text-lg font-semibold text-sidebar-foreground mb-4">
        Daftar Karyawan ({karyawanList.length} orang)
      </h3>
      <div className="space-y-2">
        {karyawanList.map(karyawan => (
          <div 
            key={karyawan.nip} 
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              selectedNip === karyawan.nip 
                ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-md' 
                : 'bg-sidebar-primary/20 text-sidebar-foreground hover:bg-sidebar-primary/30'
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
              <p className="font-semibold">AK: {karyawan.akKumulatif}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Theme Selector Component
const ThemeSelector: React.FC<{
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}> = ({ currentTheme, onThemeChange }) => {
  const themes = [
    { id: 'blue', name: 'Biru', color: 'bg-blue-500' },
    { id: 'green', name: 'Hijau', color: 'bg-green-500' },
    { id: 'orange', name: 'Oranye', color: 'bg-orange-500' },
    { id: 'black', name: 'Hitam', color: 'bg-gray-800' }
  ];

  return (
    <div className="p-4 border-b border-sidebar-border">
      <h3 className="text-sm font-medium text-sidebar-foreground mb-3">Tema Warna</h3>
      <div className="grid grid-cols-2 gap-2">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`p-2 rounded-lg text-xs font-medium transition-all ${
              currentTheme === theme.id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'bg-sidebar-primary/20 text-sidebar-foreground hover:bg-sidebar-primary/30'
            }`}
          >
            <div className="flex items-center gap-2 justify-center">
              <div className={`w-3 h-3 rounded-full ${theme.color}`}></div>
              {theme.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
const App: React.FC = () => {
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>(dummyKaryawan);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [inputHistory, setInputHistory] = useState<InputKinerja[]>(dummyInputKinerja);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input'>('dashboard');
  const [currentTheme, setCurrentTheme] = useState('blue');

  useEffect(() => {
    // Set theme attribute on body
    document.body.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const handleSaveInput = (newInput: InputKinerja) => {
    setInputHistory([...inputHistory, newInput]);
    
    // Update AK Kumulatif karyawan
    if (selectedKaryawan) {
      const updatedKaryawanList = karyawanList.map(k => 
        k.nip === selectedKaryawan.nip 
          ? { ...k, akKumulatif: k.akKumulatif + newInput.akDiperoleh }
          : k
      );
      setKaryawanList(updatedKaryawanList);
      
      // Update selected karyawan juga
      const updatedSelected = updatedKaryawanList.find(k => k.nip === selectedKaryawan.nip);
      if (updatedSelected) {
        setSelectedKaryawan(updatedSelected);
      }
    }
  };

  const totalKaryawan = karyawanList.length;
  const aktifKaryawan = karyawanList.filter(k => k.status === 'Aktif').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-gradient-header text-white py-6 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔄 Aplikasi Penghitungan Angka Kredit</h1>
          <p className="text-white/90">Berdasarkan Peraturan BKN No. 3 Tahun 2023</p>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <div 
          className="w-80 min-h-screen bg-sidebar-background text-sidebar-foreground shadow-sidebar"
          style={{ background: 'var(--sidebar-background)' }}
        >
          <ThemeSelector currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
          
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
              <div className="flex space-x-1 mb-6 p-1 bg-muted rounded-lg w-fit">
                <button 
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    activeTab === 'dashboard' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    activeTab === 'input' 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
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
                <h2 className="text-2xl font-bold text-foreground mb-4">Selamat Datang!</h2>
                <p className="text-muted-foreground mb-8">
                  Pilih karyawan dari daftar di sebelah kiri untuk melihat dashboard dan input kinerja.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <h3 className="text-2xl font-bold text-primary">{totalKaryawan}</h3>
                    <p className="text-sm text-muted-foreground">Total Karyawan</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <h3 className="text-2xl font-bold text-accent">{aktifKaryawan}</h3>
                    <p className="text-sm text-muted-foreground">Karyawan Aktif</p>
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