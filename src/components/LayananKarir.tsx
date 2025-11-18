import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, TrendingUp, Award } from 'lucide-react';
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

// Komponen sementara untuk PenetapanAK
const PenetapanAK: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PENETAPAN ANGKA KREDIT
          </CardTitle>
          <CardDescription>
            Kelola data penetapan angka kredit untuk {karyawan.nama}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Fitur Sedang Dalam Pengembangan</h3>
            <p className="text-muted-foreground mb-4">
              Modul penetapan angka kredit akan segera tersedia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Komponen sementara untuk AkumulasiAK
const AkumulasiAK: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            AKUMULASI ANGKA KREDIT
          </CardTitle>
          <CardDescription>
            Kelola data akumulasi angka kredit untuk {karyawan.nama}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Fitur Sedang Dalam Pengembangan</h3>
            <p className="text-muted-foreground mb-4">
              Modul akumulasi angka kredit akan segera tersedia.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

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
          {/* Ganti dengan komponen KonversiPredikat yang lengkap */}
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