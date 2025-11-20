import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, TrendingUp, Award, User, Building, GraduationCap, CalendarDays } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import PenetapanAK from '@/components/PenetapanAK';
import AkumulasiAK from '@/components/AkumulasiAK';

// Interface lengkap dengan semua properti
interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golAkhir: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  tglPenghitunganAkTerakhir: string;
  akKumulatif: number;
  status: string;
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  linkSKJabatan: string;
  linkSKPangkat: string;
}

// Interface untuk kompatibilitas dengan komponen yang membutuhkan properti lama
interface KaryawanLama {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  akKumulatif: number;
  status: 'Aktif' | 'Pensiun' | 'Mutasi';
}

interface LayananKarirProps {
  karyawan: Karyawan;
}

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
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'aktif': return 'bg-green-100 text-green-800 border-green-200';
      case 'non-aktif': return 'bg-red-100 text-red-800 border-red-200';
      case 'pensiun': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'mutasi': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <p className="font-semibold">{karyawan.pangkat} - {karyawan.golAkhir}</p>
              <p className="text-xs text-gray-500">TMT: {formatDate(karyawan.tmtPangkat)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <Building className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-xs text-gray-600">Unit Kerja</p>
              <p className="font-semibold">{karyawan.unitKerja}</p>
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

        {/* Additional Information Row */}
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
          {karyawan.linkSKJabatan && (
            <a 
              href={karyawan.linkSKJabatan} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
            >
              <FileText className="h-3 w-3" />
              SK Jabatan
            </a>
          )}
          {karyawan.linkSKPangkat && (
            <a 
              href={karyawan.linkSKPangkat} 
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

// Fungsi untuk konversi ke format lama
const convertToOldFormat = (karyawan: Karyawan): KaryawanLama => {
  const mapStatus = (status: string): 'Aktif' | 'Pensiun' | 'Mutasi' => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('aktif')) return 'Aktif';
    if (statusLower.includes('pensiun')) return 'Pensiun';
    if (statusLower.includes('mutasi')) return 'Mutasi';
    return 'Aktif';
  };

  return {
    nip: karyawan.nip,
    nama: karyawan.nama,
    pangkat: karyawan.pangkat,
    golongan: karyawan.golAkhir,
    jabatan: karyawan.jabatan,
    kategori: karyawan.kategori,
    unitKerja: karyawan.unitKerja,
    tmtJabatan: karyawan.tmtJabatan,
    tmtPangkat: karyawan.tmtPangkat,
    pendidikan: karyawan.pendidikan,
    akKumulatif: karyawan.akKumulatif,
    status: mapStatus(karyawan.status)
  };
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

  // Konversi ke format lama untuk komponen yang belum diupdate
  const karyawanLama = convertToOldFormat(karyawan);

  return (
    <div className="space-y-4">
      <ProfileHeader karyawan={karyawan} />

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

        <div className="flex items-center gap-2 text-sm text-gray-600 px-2">
          <div className={`w-2 h-2 rounded-full ${activeTab === 'konversi' ? 'bg-blue-500' : activeTab === 'penetapan' ? 'bg-green-500' : 'bg-purple-500'}`}></div>
          <span className="font-medium">
            {activeTab === 'konversi' ? 'Konversi Predikat Kinerja' : 
             activeTab === 'penetapan' ? 'Penetapan Angka Kredit' : 
             'Akumulasi Angka Kredit'}
          </span>
        </div>

        <TabsContent value="konversi" className="space-y-3">
          {/* Gunakan type assertion untuk sementara */}
          <KonversiPredikat karyawan={karyawanLama as any} />
        </TabsContent>

        <TabsContent value="penetapan" className="space-y-3">
          <PenetapanAK karyawan={karyawanLama as any} />
        </TabsContent>

        <TabsContent value="akumulasi" className="space-y-3">
          <AkumulasiAK karyawan={karyawanLama as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LayananKarir;