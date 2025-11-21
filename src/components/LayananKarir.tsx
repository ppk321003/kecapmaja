import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, TrendingUp, Download } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import { Karyawan } from '@/types';

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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-xl text-gray-800 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Layanan Karir
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <CardDescription className="text-base font-semibold text-gray-700">
                {karyawan.nama}
              </CardDescription>
              <Badge variant="secondary" className="w-fit bg-white text-blue-600 border-blue-300 text-xs">
                {karyawan.nip}
              </Badge>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <Calendar className="h-4 w-4 text-purple-600" />
            <div>
              <p className="text-xs text-gray-600">Tanggal Penghitungan AK Terakhir</p>
              <p className="font-semibold">{karyawan.tglPenghitunganAkTerakhir}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <div>
              <p className="text-xs text-gray-600">Jabatan</p>
              <p className="font-semibold">{karyawan.jabatan}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border text-sm">
            <div>
              <p className="text-xs text-gray-600">Pangkat/Golongan</p>
              <p className="font-semibold">{karyawan.pangkat} - {karyawan.golongan}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState('generate');
  
  const tabConfig = {
    generate: { 
      title: "GENERATE DOKUMEN", 
      icon: FileText, 
      activeClass: "bg-blue-500 text-white border-blue-600 shadow-md",
      inactiveClass: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
    },
    unduh: { 
      title: "UNDUH DOKUMEN", 
      icon: Download, 
      activeClass: "bg-green-500 text-white border-green-600 shadow-md",
      inactiveClass: "bg-white text-green-600 border-green-200 hover:bg-green-50"
    }
  };

  return (
    <div className="space-y-6">
      <ProfileHeader karyawan={karyawan} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="bg-white rounded-lg border shadow-sm p-1">
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 gap-1">
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

        <div className="px-2">
          <h2 className="text-lg font-semibold text-gray-800">
            {activeTab === 'generate' 
              ? `Generate Dokumen - ${karyawan.nama}`
              : 'Unduh Dokumen'
            }
          </h2>
        </div>

        <TabsContent value="generate" className="space-y-4">
          <KonversiPredikat karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="unduh" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5 text-green-600" />
                Unduh Dokumen
              </CardTitle>
              <CardDescription>
                Halaman untuk mengunduh dokumen-dokumen terkait karir
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <div className="max-w-md mx-auto">
                <Download className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Halaman Dalam Pengembangan
                </h3>
                <p className="text-gray-500 mb-4">
                  Fitur Unduh Dokumen sedang dalam tahap pengembangan dan akan segera hadir.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    Untuk sementara, Anda dapat menggunakan fitur <strong>Generate Dokumen</strong> 
                    untuk membuat dokumen-dokumen yang diperlukan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LayananKarir;