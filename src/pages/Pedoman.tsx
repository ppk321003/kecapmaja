// App.tsx
import React, { useState, useEffect } from 'react';
import './App.css';

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
    <div className="progress-item">
      <div className="progress-label">
        <span>{label}</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
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

  return (
    <div className="input-form">
      <h3>Input Predikat Kinerja - {karyawan.nama}</h3>
      
      <div className="form-group">
        <label>Periode Penilaian</label>
        <input 
          type="month" 
          value={formData.periode}
          onChange={(e) => setFormData({...formData, periode: e.target.value})}
        />
      </div>
      
      <div className="form-group">
        <label>Jenis Penilaian</label>
        <select 
          value={formData.jenisPenilaian}
          onChange={(e) => setFormData({
            ...formData, 
            jenisPenilaian: e.target.value as 'Tahunan' | 'Periodik'
          })}
        >
          <option value="Tahunan">Tahunan</option>
          <option value="Periodik">Periodik</option>
        </select>
      </div>

      {formData.jenisPenilaian === 'Periodik' && (
        <div className="form-group">
          <label>Bulan Periodik</label>
          <input 
            type="number" 
            min="1" 
            max="11"
            value={formData.bulanPeriodik}
            onChange={(e) => setFormData({...formData, bulanPeriodik: parseInt(e.target.value)})}
          />
        </div>
      )}
      
      <div className="form-group">
        <label>Predikat Kinerja</label>
        <select 
          value={formData.predikatKinerja}
          onChange={(e) => setFormData({...formData, predikatKinerja: parseFloat(e.target.value)})}
        >
          <option value="1.50">Sangat Baik (150%)</option>
          <option value="1.00">Baik (100%)</option>
          <option value="0.75">Cukup (75%)</option>
          <option value="0.50">Kurang (50%)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Keterangan</label>
        <input 
          type="text" 
          value={formData.keterangan}
          onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
          placeholder="Capaian SKP, evaluasi, dll."
        />
      </div>

      <div className="calculation-preview">
        <h4>Perhitungan:</h4>
        <p>Jenjang: <strong>{karyawan.jenjangJabatan}</strong></p>
        <p>Koefisien: <strong>{
          dummyKonfigurasi.find(k => k.jenjangJabatan === karyawan.jenjangJabatan)?.koefisienTahunan
        }</strong></p>
        <p>Angka Kredit: <strong>{
          AngkaKreditCalculator.hitungAK(
            karyawan.jenjangJabatan,
            formData.predikatKinerja,
            formData.jenisPenilaian === 'Periodik',
            formData.bulanPeriodik
          )
        }</strong></p>
      </div>
      
      <button className="calculate-btn" onClick={handleCalculate}>
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
      'IV/a': 'IV/b'
    };
    return progression[current] || 'Tidak Ada';
  };

  const nextGolongan = getNextGolongan(karyawan.golongan);
  const kebutuhanAK = AngkaKreditCalculator.getKebutuhanAK(karyawan.golongan, nextGolongan);
  const progressPangkat = karyawan.akKumulatif / kebutuhanAK;

  return (
    <div className="employee-dashboard">
      <div className="employee-header">
        <h2>{karyawan.nama}</h2>
        <p>{karyawan.pangkat} ({karyawan.golongan}) - {karyawan.jenjangJabatan}</p>
        <p>Unit: {karyawan.unitKerja} | AK Kumulatif: <strong>{karyawan.akKumulatif}</strong></p>
      </div>

      <div className="progress-section">
        <ProgressBar 
          progress={progressPangkat}
          label={`Kenaikan Pangkat ke ${nextGolongan}`}
        />
        
        <div className="progress-details">
          <p>AK Saat Ini: <strong>{karyawan.akKumulatif}</strong></p>
          <p>Kebutuhan: <strong>{kebutuhanAK}</strong></p>
          <p>Kekurangan: <strong>{(kebutuhanAK - karyawan.akKumulatif).toFixed(2)}</strong></p>
        </div>
      </div>
    </div>
  );
};

// Komponen Daftar Karyawan
const EmployeeList: React.FC<{ 
  karyawanList: Karyawan[]; 
  onSelect: (karyawan: Karyawan) => void 
}> = ({ karyawanList, onSelect }) => {
  return (
    <div className="employee-list">
      <h3>Daftar Karyawan ({karyawanList.length} orang)</h3>
      <div className="list-container">
        {karyawanList.map(karyawan => (
          <div 
            key={karyawan.nip} 
            className="employee-card"
            onClick={() => onSelect(karyawan)}
          >
            <div className="card-header">
              <h4>{karyawan.nama}</h4>
              <span className={`status ${karyawan.status.toLowerCase()}`}>
                {karyawan.status}
              </span>
            </div>
            <div className="card-details">
              <p>{karyawan.pangkat} ({karyawan.golongan})</p>
              <p>{karyawan.jenjangJabatan}</p>
              <p>AK: <strong>{karyawan.akKumulatif}</strong></p>
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
  const [inputHistory, setInputHistory] = useState<InputKinerja[]>(dummyInputKinerja);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'input'>('dashboard');

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

  return (
    <div className="App">
      <header className="app-header">
        <h1>🔄 Aplikasi Penghitungan Angka Kredit</h1>
        <p>Berdasarkan Peraturan BKN No. 3 Tahun 2023</p>
      </header>

      <div className="app-container">
        {/* Sidebar - Daftar Karyawan */}
        <div className="sidebar">
          <EmployeeList 
            karyawanList={karyawanList} 
            onSelect={setSelectedKaryawan} 
          />
        </div>

        {/* Main Content */}
        <div className="main-content">
          {selectedKaryawan ? (
            <>
              {/* Tab Navigation */}
              <div className="tab-navigation">
                <button 
                  className={activeTab === 'dashboard' ? 'active' : ''}
                  onClick={() => setActiveTab('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className={activeTab === 'input' ? 'active' : ''}
                  onClick={() => setActiveTab('input')}
                >
                  📥 Input Kinerja
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
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
            <div className="welcome-message">
              <h2>Selamat Datang!</h2>
              <p>Pilih karyawan dari daftar di sebelah kiri untuk mulai.</p>
              <div className="stats">
                <div className="stat-card">
                  <h3>{karyawanList.length}</h3>
                  <p>Total Karyawan</p>
                </div>
                <div className="stat-card">
                  <h3>{
                    karyawanList.filter(k => k.status === 'Aktif').length
                  }</h3>
                  <p>Karyawan Aktif</p>
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