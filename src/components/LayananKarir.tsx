import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, TrendingUp, Award, User, Building, GraduationCap } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import PenetapanAK from '@/components/PenetapanAK';
import AkumulasiAK from '@/components/AkumulasiAK';
import { Karyawan } from '@/types'; // Import dari types

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
    switch (status) {
      case 'Aktif': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pensiun': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Mutasi': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Layanan Karir
              <Badge variant="secondary" className="ml-2 bg-white text-blue-600 border-blue-300 text-xs">
                {karyawan.nip}
              </Badge>
            </CardTitle>
            <CardDescription className="text-base font-semibold text-gray-700 mt-1">
              {karyawan.nama}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className={`${getKategoriColor(karyawan.kategori)} border text-xs`}>
              {karyawan.kategori}
            </Badge>
            <Badge className={`${getStatusColor(karyawan.status)} border text-xs`}>
              {karyawan.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <User className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Jabatan</p>
              <p className="font-semibold">{karyawan.jabatan}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <Award className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-600">Pangkat/Golongan</p>
              <p className="font-semibold">{karyawan.pangkat} - {karyawan.golongan}</p>
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
        
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-800">Tanggal Penghitungan AK Terakhir:</span>
            <span className="text-yellow-700">{karyawan.tglPenghitunganAkTerakhir}</span>
          </div>
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