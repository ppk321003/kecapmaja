import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Calendar, FileText, TrendingUp, Award, User, Building, GraduationCap, CalendarDays, Download, Upload, Calculator, BarChart3, Target } from 'lucide-react';

// Interface yang sama dengan komponen utama
interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  tglPenghitunganAkTerakhir: string;
  akKumulatif: number;
  status: 'Aktif' | 'Pensiun' | 'Mutasi';
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  linkSkJabatan?: string;
  linkSkPangkat?: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  agama: string;
  email: string;
  telepon: string;
  alamat: string;
}

interface LayananKarirProps {
  karyawan: Karyawan;
}

// Helper function untuk format tanggal
const formatDate = (dateString: string) => {
  if (!dateString || dateString.trim() === '') return '-';
  
  try {
    let date: Date;
    
    // Format ISO (2023-04-11)
    if (dateString.includes('-')) {
      date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }
    
    // Format Indonesia (11 April 2023)
    const bulanMap: { [key: string]: number } = {
      'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
      'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };
    
    const parts = dateString.toLowerCase().split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = bulanMap[parts[1]];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      }
    }
    
    // Format dengan slash atau dash (11/04/2023 atau 11-04-2023)
    const separator = dateString.includes('/') ? '/' : '-';
    const dateParts = dateString.split(separator);
    if (dateParts.length === 3) {
      let day, month, year;
      
      if (dateParts[0].length === 4) {
        // Format: 2023/04/11
        year = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        day = parseInt(dateParts[2]);
      } else {
        // Format: 11/04/2023
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]);
      }
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      }
    }
    
    // Fallback: coba parsing langsung
    date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    return '-';
  } catch {
    return '-';
  }
};

// ==================== KOMPONEN KONVERSI PREDIKAT ====================
const KonversiPredikat: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const [nilaiKinerja, setNilaiKinerja] = useState('');
  const [predikatHasil, setPredikatHasil] = useState('');

  const konversiPredikat = (nilai: number) => {
    if (nilai >= 90) return { predikat: 'Sangat Baik', nilai: 1.50, warna: 'text-green-600' };
    if (nilai >= 80) return { predikat: 'Baik', nilai: 1.00, warna: 'text-blue-600' };
    if (nilai >= 70) return { predikat: 'Cukup', nilai: 0.75, warna: 'text-yellow-600' };
    return { predikat: 'Kurang', nilai: 0.50, warna: 'text-red-600' };
  };

  const handleKonversi = () => {
    const nilai = parseFloat(nilaiKinerja);
    if (!isNaN(nilai) && nilai >= 0 && nilai <= 100) {
      const hasil = konversiPredikat(nilai);
      setPredikatHasil(`${hasil.predikat} (${hasil.nilai})`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Konversi Nilai Kinerja ke Predikat
          </CardTitle>
          <CardDescription>
            Konversi nilai kinerja 0-100 menjadi predikat dan angka kredit sesuai Peraturan BKN
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nilai-kinerja">Nilai Kinerja (0-100)</Label>
              <Input
                id="nilai-kinerja"
                type="number"
                min="0"
                max="100"
                value={nilaiKinerja}
                onChange={(e) => setNilaiKinerja(e.target.value)}
                placeholder="Masukkan nilai kinerja"
              />
            </div>
            <div className="space-y-2">
              <Label>Hasil Konversi</Label>
              <div className="p-3 border rounded-lg bg-muted/50">
                {predikatHasil ? (
                  <div className="text-center">
                    <p className="text-lg font-semibold">{predikatHasil}</p>
                    <p className="text-sm text-muted-foreground">Predikat dan Angka Kredit</p>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Hasil akan muncul di sini</p>
                )}
              </div>
            </div>
          </div>
          
          <Button onClick={handleKonversi} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Konversi Nilai
          </Button>

          {/* Tabel Referensi */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Tabel Referensi Konversi</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rentang Nilai</TableHead>
                  <TableHead>Predikat</TableHead>
                  <TableHead>Angka Kredit</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>90 - 100</TableCell>
                  <TableCell className="font-semibold text-green-600">Sangat Baik</TableCell>
                  <TableCell className="font-bold">1.50</TableCell>
                  <TableCell>Performa luar biasa</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>80 - 89</TableCell>
                  <TableCell className="font-semibold text-blue-600">Baik</TableCell>
                  <TableCell className="font-bold">1.00</TableCell>
                  <TableCell>Performa baik sesuai target</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>70 - 79</TableCell>
                  <TableCell className="font-semibold text-yellow-600">Cukup</TableCell>
                  <TableCell className="font-bold">0.75</TableCell>
                  <TableCell>Perlu peningkatan</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>0 - 69</TableCell>
                  <TableCell className="font-semibold text-red-600">Kurang</TableCell>
                  <TableCell className="font-bold">0.50</TableCell>
                  <TableCell>Perlu perbaikan serius</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== KOMPONEN PENETAPAN AK ====================
const PenetapanAK: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const [jenisKegiatan, setJenisKegiatan] = useState('');
  const [volume, setVolume] = useState('');
  const [angkaKredit, setAngkaKredit] = useState('');

  const kegiatanList = [
    { nama: 'Penyusunan Laporan Statistik', ak: 0.25 },
    { nama: 'Analisis Data Statistik', ak: 0.50 },
    { nama: 'Publikasi Hasil Penelitian', ak: 1.00 },
    { nama: 'Bimbingan Teknis', ak: 0.75 },
    { nama: 'Pengembangan Sistem', ak: 1.25 },
  ];

  const hitungAK = () => {
    const selectedKegiatan = kegiatanList.find(k => k.nama === jenisKegiatan);
    if (selectedKegiatan && volume) {
      const vol = parseFloat(volume);
      const totalAK = selectedKegiatan.ak * vol;
      setAngkaKredit(totalAK.toFixed(2));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Penetapan Angka Kredit
          </CardTitle>
          <CardDescription>
            Hitung dan tetapkan angka kredit untuk kegiatan yang dilakukan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jenis-kegiatan">Jenis Kegiatan</Label>
              <Select value={jenisKegiatan} onValueChange={setJenisKegiatan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis kegiatan" />
                </SelectTrigger>
                <SelectContent>
                  {kegiatanList.map((kegiatan, index) => (
                    <SelectItem key={index} value={kegiatan.nama}>
                      {kegiatan.nama} ({kegiatan.ak} AK)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="volume">Volume</Label>
              <Input
                id="volume"
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="Jumlah volume"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Angka Kredit yang Diperoleh</Label>
            <div className="p-4 border rounded-lg bg-green-50">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{angkaKredit || '0.00'}</p>
                <p className="text-sm text-green-700">Total Angka Kredit</p>
              </div>
            </div>
          </div>

          <Button onClick={hitungAK} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Hitung Angka Kredit
          </Button>

          {/* Daftar Kegiatan */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Daftar Kegiatan dan AK</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Jenis Kegiatan</TableHead>
                  <TableHead>Angka Kredit</TableHead>
                  <TableHead>Satuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kegiatanList.map((kegiatan, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{kegiatan.nama}</TableCell>
                    <TableCell className="font-bold text-blue-600">{kegiatan.ak}</TableCell>
                    <TableCell>Per kegiatan</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== KOMPONEN AKUMULASI AK ====================
const AkumulasiAK: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const [periodeAwal, setPeriodeAwal] = useState('');
  const [periodeAkhir, setPeriodeAkhir] = useState('');
  const [totalAkumulasi, setTotalAkumulasi] = useState(0);

  const dataAK = [
    { bulan: 'Januari 2024', ak: 12.5 },
    { bulan: 'Februari 2024', ak: 11.8 },
    { bulan: 'Maret 2024', ak: 13.2 },
    { bulan: 'April 2024', ak: 12.0 },
    { bulan: 'Mei 2024', ak: 14.5 },
  ];

  const hitungAkumulasi = () => {
    // Simulasi perhitungan akumulasi
    const total = dataAK.reduce((sum, item) => sum + item.ak, 0);
    setTotalAkumulasi(total);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Akumulasi Angka Kredit
          </CardTitle>
          <CardDescription>
            Monitor dan hitung akumulasi angka kredit dalam periode tertentu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periode-awal">Periode Awal</Label>
              <Input
                id="periode-awal"
                type="month"
                value={periodeAwal}
                onChange={(e) => setPeriodeAwal(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="periode-akhir">Periode Akhir</Label>
              <Input
                id="periode-akhir"
                type="month"
                value={periodeAkhir}
                onChange={(e) => setPeriodeAkhir(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Total Akumulasi</Label>
              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600">{totalAkumulasi.toFixed(2)}</p>
                  <p className="text-sm text-blue-700">Angka Kredit</p>
                </div>
              </div>
            </div>
          </div>

          <Button onClick={hitungAkumulasi} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Hitung Akumulasi
          </Button>

          {/* Grafik Progress */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Progress Bulanan</h3>
            <div className="space-y-3">
              {dataAK.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{item.bulan}</span>
                    <span className="font-semibold">{item.ak} AK</span>
                  </div>
                  <Progress value={(item.ak / 15) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Ringkasan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan Akumulasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{karyawan.akKumulatif}</p>
                  <p className="text-sm text-muted-foreground">AK Awal</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{totalAkumulasi.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">AK Tambahan</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {(karyawan.akKumulatif + totalAkumulasi).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total AK</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.max(0, 100 - (karyawan.akKumulatif + totalAkumulasi)).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Kekurangan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

const ProfileHeader: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Keahlian': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Keterampilan': return 'bg-green-100 text-green-800 border-green-200';
      case 'Reguler': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'aktif': return 'bg-green-100 text-green-800 border-green-200';
      case 'non-aktif': return 'bg-red-100 text-red-800 border-red-200';
      case 'pensiun': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'mutasi': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Layanan Karir
              </CardTitle>
              <Badge variant="secondary" className="bg-white text-blue-600 border-blue-300 text-xs">
                {karyawan.nip}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <CardDescription className="text-base font-semibold text-gray-700">
                {karyawan.nama}
              </CardDescription>
              <Badge className={`${getStatusColor(karyawan.status)} border text-xs`}>
                {karyawan.status}
              </Badge>
            </div>
          </div>
          <Badge className={`${getKategoriColor(karyawan.kategori)} border text-xs`}>
            {karyawan.kategori}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Grid dengan 3 kolom - menghilangkan Unit Kerja */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <User className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Jabatan</p>
              <p className="font-semibold">{karyawan.jabatan}</p>
              <p className="text-xs text-gray-500">TMT: {formatDate(karyawan.tmtJabatan)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <Award className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-600">Pangkat/Golongan</p>
              <p className="font-semibold">{karyawan.pangkat} - {karyawan.golongan}</p>
              <p className="text-xs text-gray-500">TMT: {formatDate(karyawan.tmtPangkat)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <GraduationCap className="h-4 w-4 text-orange-600" />
            <div>
              <p className="text-xs text-gray-600">Pendidikan</p>
              <p className="font-semibold">{karyawan.pendidikan}</p>
            </div>
          </div>
        </div>

        {/* Additional Information Row - sekarang 2 kolom penuh */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <CalendarDays className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-gray-600">Penghitungan AK Terakhir</p>
              <p className="font-semibold">{formatDate(karyawan.tglPenghitunganAkTerakhir)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <Award className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs text-gray-600">AK Kumulatif</p>
              <p className="font-semibold">{karyawan.akKumulatif.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* SK Links */}
        <div className="flex gap-4 mt-3 text-xs">
          {karyawan.linkSkJabatan && (
            <a 
              href={karyawan.linkSkJabatan} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
            >
              <FileText className="h-3 w-3" />
              SK Jabatan
            </a>
          )}
          {karyawan.linkSkPangkat && (
            <a 
              href={karyawan.linkSkPangkat} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline"
            >
              <FileText className="h-3 w-3" />
              SK Pangkat
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState('konversi');
  
  const tabConfig = {
    konversi: { 
      title: "KONVERSI PREDIKAT", 
      icon: Calculator, 
      activeClass: "bg-blue-500 text-white border-blue-600 shadow-md",
      inactiveClass: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
    },
    penetapan: { 
      title: "PENETAPAN AK", 
      icon: Target, 
      activeClass: "bg-green-500 text-white border-green-600 shadow-md",
      inactiveClass: "bg-white text-green-600 border-green-200 hover:bg-green-50"
    },
    akumulasi: { 
      title: "AKUMULASI AK", 
      icon: BarChart3, 
      activeClass: "bg-purple-500 text-white border-purple-600 shadow-md",
      inactiveClass: "bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
    }
  };

  return (
    <div className="space-y-4">
      <ProfileHeader karyawan={karyawan} />

      {/* Enhanced Tabs dengan visual yang lebih menonjol */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="bg-white rounded-lg border shadow-sm p-1">
          <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 gap-1">
            {Object.entries(tabConfig).map(([key, config]) => (
              <TabsTrigger 
                key={key} 
                value={key} 
                className={`
                  flex items-center gap-2 text-sm font-medium py-3 px-4 rounded-md border-2 transition-all duration-200
                  ${activeTab === key ? config.activeClass : config.inactiveClass}
                `}
              >
                <config.icon className="h-4 w-4" />
                {config.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Active Tab Indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-600 px-2">
          <div className={`w-2 h-2 rounded-full ${activeTab === 'konversi' ? 'bg-blue-500' : activeTab === 'penetapan' ? 'bg-green-500' : 'bg-purple-500'}`}></div>
          <span className="font-medium">
            {activeTab === 'konversi' ? 'Konversi Predikat Kinerja' : 
             activeTab === 'penetapan' ? 'Penetapan Angka Kredit' : 
             'Akumulasi Angka Kredit'}
          </span>
        </div>

        <TabsContent value="konversi" className="space-y-3">
          <KonversiPredikat karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="penetapan" className="space-y-3">
          <PenetapanAK karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="akumulasi" className="space-y-3">
          <AkumulasiAK karyawan={karyawan} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LayananKarir;