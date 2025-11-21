import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Award, MapPin, Calendar, FileText, Download, 
  Sparkles, FileCheck, ScrollText, GraduationCap, Briefcase 
} from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import { Karyawan } from '@/types';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const ProfileHeader = ({ karyawan }: { karyawan: Karyawan }) => (
  <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
    <CardContent className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-10 h-10" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{karyawan.nama}</h1>
            <Badge className="bg-white/20 text-white border-0">{karyawan.kategori}</Badge>
          </div>
          <p className="text-white/90 text-lg mt-1">{karyawan.jabatan}</p>

          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>{karyawan.pangkat} • {karyawan.golongan}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{karyawan.unitKerja}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs opacity-80">NIP</p>
          <p className="font-mono text-lg font-bold">{karyawan.nip}</p>
          <div className="flex items-center justify-end gap-2 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">{karyawan.status}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-white/20 flex items-center gap-3">
        <Calendar className="w-5 h-5" />
        <div>
          <p className="text-xs opacity-80">Penghitungan AK Terakhir</p>
          <p className="font-semibold">{karyawan.tglPenghitunganAkTerakhir}</p>
        </div>
        <Sparkles className="ml-auto w-5 h-5 text-yellow-300" />
      </div>
    </CardContent>
  </Card>
);

const dokumenOptions = [
  { id: 'konversi', title: 'Konversi Predikat & Penilaian', icon: GraduationCap, color: 'from-purple-500 to-pink-500' },
  { id: 'skp', title: 'SKP Tahunan', icon: FileCheck, color: 'from-emerald-500 to-teal-500' },
  { id: 'pak', title: 'PAK & DUPAK', icon: ScrollText, color: 'from-amber-500 to-orange-500' },
  { id: 'usulan', title: 'Usulan Kenaikan Pangkat/Jabatan', icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
];

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [selectedDoc, setSelectedDoc] = useState('konversi');

  const selectedOption = dokumenOptions.find(d => d.id === selectedDoc)!;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        <ProfileHeader karyawan={karyawan} />

        <Tabs defaultValue="buat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 rounded-2xl bg-white shadow-md p-2">
            <TabsTrigger value="buat" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="w-5 h-5 mr-2" />
              Buat Dokumen
            </TabsTrigger>
            <TabsTrigger value="arsip" className="rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Download className="w-5 h-5 mr-2" />
              Arsip Dokumen
            </TabsTrigger>
          </TabsList>

          {/* TAB BUAT DOKUMEN */}
          <TabsContent value="buat" className="mt-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Pilih Jenis Dokumen</h2>
              <p className="text-gray-600">Klik kartu untuk langsung membuat dokumen yang Anda butuhkan</p>
            </div>

            {/* Interactive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dokumenOptions.map((doc) => {
                const Icon = doc.icon;
                const isActive = selectedDoc === doc.id;

                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc.id)}
                    className={`relative group overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 border-2 ${
                      isActive
                        ? 'border-transparent shadow-2xl scale-105'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xl'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${doc.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${doc.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className={`font-bold text-lg ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-r ' + doc.color : 'text-gray-900'}`}>
                        {doc.title}
                      </h3>
                      {isActive && (
                        <div className="mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                          <span className="text-sm font-medium opacity-90">Dipilih</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Konten Dokumen */}
            <div className="mt-10 animate-in slide-in-from-bottom-4 duration-500">
              {selectedDoc === 'konversi' ? (
                <KonversiPredikat karyawan={karyawan} />
              ) : (
                <Card className="border-dashed border-2 border-gray-300 bg-gray-50/80">
                  <CardContent className="p-16 text-center">
                    <div className="max-w-md mx-auto">
                      <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${selectedOption.color} flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                        <selectedOption.icon className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        {selectedOption.title}
                      </h3>
                      <p className="text-gray-600 text-lg">
                        Fitur ini sedang dalam pengembangan dan akan segera hadir
                      </p>
                      <div className="mt-6 flex justify-center">
                        <Button variant="outline" size="lg">
                          Beri Tahu Saya Saat Tersedia
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TAB ARSIP */}
          <TabsContent value="arsip" className="mt-8">
            <Card className="border-2 border-dashed border-green-300 bg-green-50/60">
              <CardContent className="p-20 text-center">
                <div className="max-w-lg mx-auto">
                  <div className="w-28 h-28 bg-gradient-to-br from-green-100 to-emerald-200 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <Download className="w-14 h-14 text-green-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Arsip Dokumen Karir</h3>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Fitur arsip dokumen sedang disempurnakan agar lebih cepat dan mudah diakses.
                  </p>
                  <Button className="mt-8 bg-green-600 hover:bg-green-700 text-lg px-8 py-6">
                    Pantau Progress Pengembangan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LayananKarir;