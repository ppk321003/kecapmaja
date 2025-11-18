import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, TrendingUp, Award } from 'lucide-react';
import KonversiPredikat from './KonversiPredikat';
import PenetapanAK from './PenetapanAK';
import AkumulasiAK from './AkumulasiAK';

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

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState('konversi');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Layanan Karir - {karyawan.nama}
          </CardTitle>
          <CardDescription>
            Kelola seluruh aspek pengembangan karir termasuk konversi predikat, penetapan, dan akumulasi angka kredit
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="konversi" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            KONVERSI PREDIKAT
          </TabsTrigger>
          <TabsTrigger value="penetapan" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PENETAPAN AK
          </TabsTrigger>
          <TabsTrigger value="akumulasi" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            AKUMULASI AK
          </TabsTrigger>
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
    </div>
  );
};

export default LayananKarir;