// App.tsx - VERSI FINAL: RINGKAS, INFORMATIF, TANPA DROPDOWN
import React, { useState } from 'react';

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
  {
    nip: '198704102018031004',
    nama: 'Dewi Anggraini',
    pangkat: 'Pembina',
    golongan: 'IV/a',
    jenjangJabatan: 'Ahli Madya',
    kategori: 'Keahlian',
    unitKerja: 'Bidang SDM',
    tmtJabatan: '2018-03-01',
    tmtPangkat: '2020-11-01',
    pendidikan: 'S2 Psikologi',
    akKumulatif: 320.75,
    status: 'Aktif',
    tempatLahir: 'Medan',
    tanggalLahir: '1987-04-10',
    jenisKelamin: 'P',
    agama: 'Islam',
    email: 'dewi.anggraini@instansi.go.id',
    telepon: '081234567893',
    alamat: 'Jl. Gatot Subroto No. 123, Medan'
  },
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
    telepon: '081234567894',
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
    telepon: '081234567895',
    alamat: 'Jl. Pemuda No. 654, Semarang'
  }
];

// ==================== UTILITIES ====================
class AngkaKreditCalculator {
  static getKoefisien(jenjang: string): number {
    const map: { [k: string]: number } = {
      'Ahli Pertama': 12.5, 'Ahli Muda': 25.0, 'Ahli Madya': 37.5, 'Ahli Utama': 50.0,
      'Pemula': 5.0, 'Terampil': 8.0, 'Mahir': 12.5, 'Penyelia': 25.0
    };
    return map[jenjang] || 12.5;
  }

  static hitungAK(jenjang: string, predikat: number, isPeriodik = false, bulan = 0): number {
    const koef = this.getKoefisien(jenjang);
    let ak = predikat * koef;
    if (isPeriodik && bulan > 0) ak = (bulan / 12) * predikat * koef;
    return Math.round(ak * 100) / 100;
  }

  static getKebutuhanPangkat(gol: string, kat: string): number {
    const keahlian: { [k: string]: number } = { 'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100, 'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200 };
    const keterampilan: { [k: string]: number } = { 'II/a': 15, 'II/b': 20, 'II/c': 20, 'II/d': 20, 'III/a': 50, 'III/b': 50, 'III/c': 100 };
    return kat === 'Keahlian' ? keahlian[gol] || 100 : keterampilan[gol] || 100;
  }

  static getKebutuhanJenjang(jen: string, kat: string): number {
    const keahlian: { [k: string]: number } = { 'Ahli Pertama': 100, 'Ahli Muda': 200, 'Ahli Madya': 450 };
    const keterampilan: { [k: string]: number } = { 'Pemula': 15, 'Terampil': 60, 'Mahir': 100 };
    return kat === 'Keahlian' ? keahlian[jen] || 0 : keterampilan[jen] || 0;
  }

  static hitungEstimasiKenaikan(karyawan: Karyawan, predikatAsumsi = 1.0): EstimasiKenaikan {
    const golNext = this.getGolonganBerikutnya(karyawan.golongan, karyawan.kategori);
    const jenNext = this.getJenjangBerikutnya(karyawan.jenjangJabatan, karyawan.kategori);
    const butuhP = this.getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
    const butuhJ = this.getKebutuhanJenjang(karyawan.jenjangJabatan, karyawan.kategori);
    const kurangP = Math.max(0, butuhP - karyawan.akKumulatif);
    const kurangJ = Math.max(0, butuhJ - karyawan.akKumulatif);
    const koef = this.getKoefisien(karyawan.jenjangJabatan);
    const akBulan = Number(((predikatAsumsi * koef) / 12).toFixed(2));
    const bulanP = akBulan > 0 ? Math.ceil(kurangP / akBulan) : 0;
    const bulanJ = akBulan > 0 ? Math.ceil(kurangJ / akBulan) : 0;

    const now = new Date();
    const estP = new Date(now); estP.setMonth(now.getMonth() + bulanP);
    const estJ = new Date(now); estJ.setMonth(now.getMonth() + bulanJ);

    return {
      kebutuhanAKPangkat: butuhP,
      kebutuhanAKJenjang: butuhJ,
      kekuranganAKPangkat: kurangP,
      kekuranganAKJenjang: kurangJ,
      predikatAsumsi,
      bulanDibutuhkanPangkat: bulanP,
      bulanDibutuhkanJenjang: bulanJ,
      estimasiTanggalPangkat: estP.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      estimasiTanggalJenjang: estJ.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      bisaUsulPangkat: kurangP <= 0,
      bisaUsulJenjang: kurangJ <= 0,
      golonganBerikutnya: golNext,
      jenjangBerikutnya: jenNext,
      akPerBulan: akBulan
    };
  }

  static getGolonganBerikutnya(gol: string, kat: string): string {
    const pKeahlian: { [k: string]: string } = { 'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a', 'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e' };
    const pKeterampilan: { [k: string]: string } = { 'II/a': 'II/b', 'II/b': 'II/c', 'II/c': 'II/d', 'II/d': 'III/a', 'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d' };
    return kat === 'Keahlian' ? pKeahlian[gol] || 'Tidak Ada' : pKeterampilan[gol] || 'Tidak Ada';
  }

  static getJenjangBerikutnya(jen: string, kat: string): string {
    const pKeahlian: { [k: string]: string } = { 'Ahli Pertama': 'Ahli Muda', 'Ahli Muda': 'Ahli Madya', 'Ahli Madya': 'Ahli Utama' };
    const pKeterampilan: { [k: string]: string } = { 'Pemula': 'Terampil', 'Terampil': 'Mahir', 'Mahir': 'Penyelia' };
    return kat === 'Keahlian' ? pKeahlian[jen] || 'Tidak Ada' : pKeterampilan[jen] || 'Tidak Ada';
  }
}

// ==================== COMPONENTS ====================

// Biodata Ringkas
const BiodataRingkas: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const format = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const usia = new Date().getFullYear() - new Date(karyawan.tanggalLahir).getFullYear();
  const masaKerja = new Date().getFullYear() - new Date(karyawan.tmtJabatan).getFullYear();

  return (
    <div className="bg-white rounded-lg p-4 shadow border mb-4 text-sm">
      <h3 className="font-bold text-gray-800 mb-3 text-base">Biodata</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div><span className="text-gray-500">NIP</span><p className="font-medium">{karyawan.nip}</p></div>
        <div><span className="text-gray-500">Nama</span><p className="font-medium">{karyawan.nama}</p></div>
        <div><span className="text-gray-500">Usia</span><p className="font-medium">{usia} thn</p></div>
        <div><span className="text-gray-500">Masa Kerja</span><p className="font-medium">~{masaKerja} thn</p></div>
        <div><span className="text-gray-500">Pangkat</span><p className="font-medium">{karyawan.pangkat}</p></div>
        <div><span className="text-gray-500">Golongan</span><p className="font-medium">{karyawan.golongan}</p></div>
        <div><span className="text-gray-500">Jenjang</span><p className="font-medium">{karyawan.jenjangJabatan}</p></div>
        <div><span className="text-gray-500">Unit</span><p className="font-medium">{karyawan.unitKerja}</p></div>
        <div><span className="text-gray-500">TMT Jabatan</span><p className="font-medium">{format(karyawan.tmtJabatan)}</p></div>
        <div><span className="text-gray-500">Pendidikan</span><p className="font-medium">{karyawan.pendidikan}</p></div>
        <div><span className="text-gray-500">Status</span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            karyawan.status === 'Aktif' ? 'bg-green-100 text-green-800' : 
            karyawan.status === 'Pensiun' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
          }`}>{karyawan.status}</span>
        </div>
        <div><span className="text-gray-500">AK Kumulatif</span><p className="font-bold text-blue-600">{karyawan.akKumulatif.toFixed(2)}</p></div>
      </div>
    </div>
  );
};

// Daftar Karyawan + Analisis AK
const DaftarKaryawan: React.FC<{ 
  list: Karyawan[]; 
  onSelect: (k: Karyawan) => void; 
  selectedNip: string | null 
}> = ({ list, onSelect, selectedNip }) => {
  const [search, setSearch] = useState('');
  const filtered = list.filter(k => 
    k.nama.toLowerCase().includes(search.toLowerCase()) || 
    k.nip.includes(search) || 
    k.unitKerja.toLowerCase().includes(search.toLowerCase())
  );

  const getEstimasi = (k: Karyawan) => {
    const est = AngkaKreditCalculator.hitungEstimasiKenaikan(k, 1.0);
    const bulan = Math.min(est.bulanDibutuhkanPangkat, est.bulanDibutuhkanJenjang);
    if (bulan === 0) return { text: 'Bisa naik!', color: 'text-green-600', bg: 'bg-green-100' };
    if (bulan <= 6) return { text: `${bulan} bln`, color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (bulan <= 12) return { text: `${bulan} bln`, color: 'text-blue-600', bg: 'bg-blue-100' };
    return { text: `${bulan} bln`, color: 'text-orange-600', bg: 'bg-orange-100' };
  };

  const ProgressMini: React.FC<{ ak: number; butuh: number }> = ({ ak, butuh }) => {
    const pct = Math.min(100, (ak / butuh) * 100);
    const color = pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden mb-6">
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Daftar Karyawan & Estimasi Kenaikan</h2>
            <p className="text-xs text-gray-600">Klik baris untuk detail • Warna = estimasi terdekat</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Bisa naik</span>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded">≤6 bln</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">≤12 bln</span>
          </div>
        </div>
      </div>

      <div className="p-3 border-b">
        <input 
          type="text" 
          placeholder="Cari nama, NIP, unit..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">NIP</th>
              <th className="px-3 py-2 text-left">Nama</th>
              <th className="px-3 py-2 text-center">Pangkat</th>
              <th className="px-3 py-2 text-center">Jenjang</th>
              <th className="px-3 py-2 text-center">Unit</th>
              <th className="px-3 py-2 text-center">AK Kumulatif</th>
              <th className="px-3 py-2 text-center">Estimasi</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  Tidak ada data ditemukan
                </td>
              </tr>
            ) : (
              filtered.map(k => {
                const est = AngkaKreditCalculator.hitungEstimasiKenaikan(k, 1.0);
                const progP = k.akKumulatif / est.kebutuhanAKPangkat;
                const progJ = k.akKumulatif / est.kebutuhanAKJenjang;
                const progMin = Math.min(progP, progJ);
                const estimasi = getEstimasi(k);

                return (
                  <tr 
                    key={k.nip} 
                    onClick={() => onSelect(k)} 
                    className={`border-t cursor-pointer transition-colors ${
                      selectedNip === k.nip ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono">{k.nip}</td>
                    <td className="px-3 py-2 font-medium">{k.nama}</td>
                    <td className="px-3 py-2 text-center">{k.pangkat}</td>
                    <td className="px-3 py-2 text-center">{k.jenjangJabatan}</td>
                    <td className="px-3 py-2 text-center">{k.unitKerja}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ProgressMini ak={k.akKumulatif} butuh={Math.max(est.kebutuhanAKPangkat, est.kebutuhanAKJenjang)} />
                        <span className="font-bold text-blue-600">{k.akKumulatif.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${estimasi.bg} ${estimasi.color}`}>
                        {estimasi.text}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        k.status === 'Aktif' ? 'bg-green-100 text-green-800' : 
                        k.status === 'Pensiun' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{k.status}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Input Kinerja
const InputKinerja: React.FC<{ karyawan: Karyawan; onSave: (i: InputKinerja) => void }> = ({ karyawan, onSave }) => {
  const [form, setForm] = useState({
    periode: new Date().toISOString().slice(0, 7),
    jenis: 'Tahunan' as 'Tahunan' | 'Periodik',
    bulan: 12,
    predikat: 1.0,
    keterangan: ''
  });

  const koef = AngkaKreditCalculator.getKoefisien(karyawan.jenjangJabatan);
  const akHasil = AngkaKreditCalculator.hitungAK(karyawan.jenjangJabatan, form.predikat, form.jenis === 'Periodik', form.bulan);

  const simpan = () => {
    const input: InputKinerja = {
      idInput: `KIN-${Date.now()}`,
      nip: karyawan.nip,
      periode: form.periode,
      jenisPenilaian: form.jenis,
      bulanPeriodik: form.bulan,
      predikatKinerja: form.predikat,
      akDiperoleh: akHasil,
      jenjangSaatInput: karyawan.jenjangJabatan,
      tanggalInput: new Date().toISOString().split('T')[0],
      inputOleh: 'Admin',
      keterangan: form.keterangan
    };
    onSave(input);
    alert('Data kinerja tersimpan!');
    setForm({ ...form, predikat: 1.0, keterangan: '', bulan: 12 });
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow border">
      <h3 className="font-bold text-gray-800 mb-4">Input Kinerja</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <input type="month" value={form.periode} onChange={e => setForm({...form, periode: e.target.value})} className="px-3 py-2 border rounded" />
        <select value={form.jenis} onChange={e => setForm({...form, jenis: e.target.value as any})} className="px-3 py-2 border rounded">
          <option value="Tahunan">Tahunan</option>
          <option value="Periodik">Periodik</option>
        </select>
        {form.jenis === 'Periodik' && (
          <input type="number" min="1" max="11" value={form.bulan} onChange={e => setForm({...form, bulan: +e.target.value})} className="px-3 py-2 border rounded" placeholder="Bulan" />
        )}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Predikat (0.5 - 1.5)</label>
          <input 
            type="number" step="0.25" min="0.5" max="1.5" 
            value={form.predikat} 
            onChange={e => setForm({...form, predikat: +e.target.value})}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>
      <input type="text" placeholder="Keterangan" value={form.keterangan} onChange={e => setForm({...form, keterangan: e.target.value})} className="w-full mt-3 px-3 py-2 border rounded text-sm" />
      <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
        <div className="flex justify-between"><span>Koefisien</span><span className="font-medium">{koef}</span></div>
        <div className="flex justify-between"><span>Predikat</span><span className="font-medium">{(form.predikat * 100).toFixed(0)}%</span></div>
        <div className="flex justify-between text-blue-600 font-bold"><span>AK Diperoleh</span><span>{akHasil}</span></div>
      </div>
      <button onClick={simpan} className="mt-4 w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700">Simpan</button>
    </div>
  );
};

// Dashboard
const Dashboard: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const est = AngkaKreditCalculator.hitungEstimasiKenaikan(karyawan, 1.0);
  return (
    <div className="space-y-4">
      <BiodataRingkas karyawan={karyawan} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-sm">Pangkat → {est.golonganBerikutnya}</h4>
          <div className="mt-2 h-2 bg-gray-200 rounded-full"><div className="h-full bg-blue-600 rounded-full" style={{width: `${Math.min(100, (karyawan.akKumulatif / est.kebutuhanAKPangkat) * 100)}%`}}/></div>
          <p className="text-xs mt-1">{karyawan.akKumulatif.toFixed(1)} / {est.kebutuhanAKPangkat} AK</p>
          <p className="text-xs text-blue-600 font-medium mt-1">{est.bulanDibutuhkanPangkat === 0 ? 'Bisa diusulkan!' : `${est.bulanDibutuhkanPangkat} bulan lagi`}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-sm">Jenjang → {est.jenjangBerikutnya}</h4>
          <div className="mt-2 h-2 bg-gray-200 rounded-full"><div className="h-full bg-green-600 rounded-full" style={{width: `${Math.min(100, (karyawan.akKumulatif / est.kebutuhanAKJenjang) * 100)}%`}}/></div>
          <p className="text-xs mt-1">{karyawan.akKumulatif.toFixed(1)} / {est.kebutuhanAKJenjang} AK</p>
          <p className="text-xs text-green-600 font-medium mt-1">{est.bulanDibutuhkanJenjang === 0 ? 'Bisa diusulkan!' : `${est.bulanDibutuhkanJenjang} bulan lagi`}</p>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
const App: React.FC = () => {
  const [list, setList] = useState<Karyawan[]>(dummyKaryawan);
  const [selected, setSelected] = useState<Karyawan | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'input'>('dashboard');

  const simpanInput = (input: InputKinerja) => {
    setList(prev => prev.map(k => 
      k.nip === input.nip ? { ...k, akKumulatif: k.akKumulatif + input.akDiperoleh } : k
    ));
    const updated = list.find(k => k.nip === input.nip);
    if (updated) setSelected({ ...updated, akKumulatif: updated.akKumulatif + input.akDiperoleh });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-4 px-6 shadow">
        <h1 className="text-xl font-bold">Sistem Angka Kredit (BKN No. 3/2023)</h1>
      </header>
      <div className="max-w-6xl mx-auto p-4">
        {!selected ? (
          <DaftarKaryawan list={list} onSelect={setSelected} selectedNip={null} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelected(null)} className="text-blue-600 text-sm flex items-center">
                ← Kembali
              </button>
              <div className="flex bg-gray-200 rounded-md p-1 text-xs">
                <button onClick={() => setTab('dashboard')} className={`px-3 py-1 rounded ${tab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>Dashboard</button>
                <button onClick={() => setTab('input')} className={`px-3 py-1 rounded ${tab === 'input' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>Input</button>
              </div>
            </div>
            {tab === 'dashboard' ? <Dashboard karyawan={selected} /> : <InputKinerja karyawan={selected} onSave={simpanInput} />}
          </>
        )}
      </div>
    </div>
  );
};

export default App;