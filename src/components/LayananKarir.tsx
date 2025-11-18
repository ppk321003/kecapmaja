import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, FileText, TrendingUp, Award, User, Building, GraduationCap, Star } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
interface Karyawan {
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
}
interface LayananKarirProps {
  karyawan: Karyawan;
}

// Komponen Header yang lebih informatif
const ProfileHeader: React.FC<{
  karyawan: Karyawan;
}> = ({
  karyawan
}) => {
  const getKategoriColor = (kategori: string) => {
    switch (kategori) {
      case 'Keahlian':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Keterampilan':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Reguler':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const calculateProgress = (akKumulatif: number) => {
    // Asumsi target AK untuk kenaikan pangkat
    const targetAK = 200; // Adjust based on your requirements
    return Math.min(akKumulatif / targetAK * 100, 100);
  };
  return <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-3 text-2xl text-gray-800">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Layanan Karir
              <Badge variant="secondary" className="ml-2 bg-white text-blue-600 border-blue-300">
                {karyawan.nip}
              </Badge>
            </CardTitle>
            <CardDescription className="text-lg font-semibold text-gray-700 mt-2">
              {karyawan.nama}
            </CardDescription>
          </div>
          <Badge className={`${getKategoriColor(karyawan.kategori)} border`}>
            {karyawan.kategori}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="mx-0 px-[10px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <User className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Jabatan</p>
              <p className="font-semibold">{karyawan.jabatan}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <Award className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Pangkat/Golongan</p>
              <p className="font-semibold">{karyawan.pangkat} - {karyawan.golongan}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <Building className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm text-gray-600">Unit Kerja</p>
              <p className="font-semibold">{karyawan.unitKerja}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <GraduationCap className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Pendidikan</p>
              <p className="font-semibold">{karyawan.pendidikan}</p>
            </div>
          </div>
        </div>

        {/* Progress AK */}
        
      </CardContent>
    </Card>;
};

// Komponen Statistik
const CareerStats: React.FC<{
  karyawan: Karyawan;
}> = ({
  karyawan
}) => {
  const stats = [{
    label: "Total AK",
    value: karyawan.akKumulatif,
    icon: Star,
    color: "text-yellow-600 bg-yellow-100",
    suffix: "AK"
  }, {
    label: "Masa Kerja",
    value: "3",
    // You can calculate this from TMT
    icon: Calendar,
    color: "text-blue-600 bg-blue-100",
    suffix: "Tahun"
  }, {
    label: "Status",
    value: "Aktif",
    icon: User,
    color: "text-green-600 bg-green-100",
    suffix: ""
  }, {
    label: "Kategori",
    value: karyawan.kategori,
    icon: Award,
    color: "text-purple-600 bg-purple-100",
    suffix: ""
  }];
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
      const IconComponent = stat.icon;
      return;
    })}
    </div>;
};

// Komponen sementara untuk PenetapanAK dengan improvement
const PenetapanAK: React.FC<{
  karyawan: Karyawan;
}> = ({
  karyawan
}) => {
  return <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <FileText className="h-5 w-5" />
            PENETAPAN ANGKA KREDIT
          </CardTitle>
          <CardDescription className="text-green-700">
            Kelola data penetapan angka kredit untuk {karyawan.nama}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Fitur Sedang Dalam Pengembangan</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Modul penetapan angka kredit akan segera tersedia dengan fitur lengkap untuk pengelolaan penetapan AK.
            </p>
            <div className="flex gap-3 justify-center">
              <Badge variant="outline" className="bg-green-50 text-green-700">Coming Soon</Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">AK Penetapan</Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">SK Penetapan</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};

// Komponen sementara untuk AkumulasiAK dengan improvement
const AkumulasiAK: React.FC<{
  karyawan: Karyawan;
}> = ({
  karyawan
}) => {
  return <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Award className="h-5 w-5" />
            AKUMULASI ANGKA KREDIT
          </CardTitle>
          <CardDescription className="text-purple-700">
            Kelola data akumulasi angka kredit untuk {karyawan.nama}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Fitur Sedang Dalam Pengembangan</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Modul akumulasi angka kredit akan segera tersedia dengan dashboard lengkap untuk monitoring progress karir.
            </p>
            <div className="flex gap-3 justify-center">
              <Badge variant="outline" className="bg-purple-50 text-purple-700">Coming Soon</Badge>
              <Badge variant="outline" className="bg-orange-50 text-orange-700">Progress Tracking</Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700">Analytics</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>;
};
const LayananKarir: React.FC<LayananKarirProps> = ({
  karyawan
}) => {
  const [activeTab, setActiveTab] = useState('konversi');
  const tabConfig = {
    konversi: {
      title: "KONVERSI PREDIKAT",
      icon: Calendar,
      gradient: "from-blue-50 to-cyan-50",
      color: "text-blue-800"
    },
    penetapan: {
      title: "PENETAPAN AK",
      icon: FileText,
      gradient: "from-green-50 to-emerald-50",
      color: "text-green-800"
    },
    akumulasi: {
      title: "AKUMULASI AK",
      icon: Award,
      gradient: "from-purple-50 to-violet-50",
      color: "text-purple-800"
    }
  };
  return <div className="space-y-6">
      <ProfileHeader karyawan={karyawan} />
      
      <CareerStats karyawan={karyawan} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
          {Object.entries(tabConfig).map(([key, config]) => <TabsTrigger key={key} value={key} className={`flex items-center gap-2 transition-all duration-200 ${activeTab === key ? `bg-white shadow-sm ${config.color} font-semibold` : 'text-gray-600 hover:text-gray-800'}`}>
              <config.icon className="h-4 w-4" />
              {config.title}
            </TabsTrigger>)}
        </TabsList>

        <TabsContent value="konversi" className="space-y-4">
          <KonversiPredikat karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="penetapan" className="space-y-4">
          <PenetapanAK karyawan={karyawan} />
        </TabsContent>

        <TabsContent value="akumulasi" className="space-y-4">
          <AkumulasiAK karyawan={karyawan} />
        </TabsContent>
      </Tabs>
    </div>;
};
export default LayananKarir;