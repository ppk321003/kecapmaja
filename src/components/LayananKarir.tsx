import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, TrendingUp, Award, User, Building, GraduationCap, CalendarDays } from 'lucide-react';

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
    // Coba parsing berbagai format tanggal
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

// Fallback components untuk tab content
const KonversiPredikatFallback: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Konversi Predikat</CardTitle>
        <CardDescription>Fitur konversi predikat kinerja</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Komponen Konversi Predikat untuk: {karyawan.nama}</p>
        <p>AK Kumulatif: {karyawan.akKumulatif}</p>
        <p>Penghitungan Terakhir: {formatDate(karyawan.tglPenghitunganAkTerakhir)}</p>
      </CardContent>
    </Card>
  );
};

const PenetapanAKFallback: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Penetapan AK</CardTitle>
        <CardDescription>Fitur penetapan angka kredit</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Komponen Penetapan AK untuk: {karyawan.nama}</p>
        <p>Jabatan: {karyawan.jabatan}</p>
      </CardContent>
    </Card>
  );
};

const AkumulasiAKFallback: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Akumulasi AK</CardTitle>
        <CardDescription>Fitur akumulasi angka kredit</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Komponen Akumulasi AK untuk: {karyawan.nama}</p>
        <p>Pangkat: {karyawan.pangkat} - {karyawan.golongan}</p>
      </CardContent>
    </Card>
  );
};

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState('konversi');
  
  const tabConfig = {
    konversi: { 
      title: "KONVERSI PREDIKAT", 
      icon: Calendar, 
      activeClass: "bg-blue-500 text-white border-blue-600 shadow-md",
      inactiveClass: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
    },
    penetapan: { 
      title: "PENETAPAN AK", 
      icon: FileText, 
      activeClass: "bg-green-500 text-white border-green-600 shadow-md",
      inactiveClass: "bg-white text-green-600 border-green-200 hover:bg-green-50"
    },
    akumulasi: { 
      title: "AKUMULASI AK", 
      icon: Award, 
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
          <KonversiPredikatFallback karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="penetapan" className="space-y-3">
          <PenetapanAKFallback karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="akumulasi" className="space-y-3">
          <AkumulasiAKFallback karyawan={karyawan} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LayananKarir;