import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Award, MapPin, Calendar, Sparkles, FileText, Download, GraduationCap, ScrollText } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import { Karyawan } from '@/types';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const ProfileHeader = ({ karyawan }: { karyawan: Karyawan }) => (
  <div className="gradient-header text-white shadow-xl">
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-11 h-11" />
          </div>
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-bold">{karyawan.nama}</h1>
              <Badge className="bg-white/25 backdrop-blur-sm border-0 text-sm px-3 py-1">
                {karyawan.kategori}
              </Badge>
            </div>
            <p className="text-xl mt-1 opacity-95">{karyawan.jabatan}</p>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
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
        </div>

        <div className="text-right">
          <p className="text-sm opacity-80">NIP</p>
          <p className="text-2xl font-mono font-bold tracking-wider">{karyawan.nip}</p>
          <div className="flex items-center justify-end gap-2 mt-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{karyawan.status}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          <div>
            <p className="text-sm opacity-80">Penghitungan AK Terakhir</p>
            <p className="text-lg font-semibold">{karyawan.tglPenghitunganAkTerakhir}</p>
          </div>
        </div>
        <Sparkles className="w-7 h-7 text-yellow-300" />
      </div>
    </div>
  </div>
);

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'download'>('generate');

  return (
    <div className="min-h-screen bg-background">
      <ProfileHeader karyawan={karyawan} />

      {/* Tabs — Otomatis pakai warna tema aktif */}
      <div className="max-w-7xl mx-auto px-6 mt-10">
        <div className="flex bg-card rounded-2xl shadow-lg overflow-hidden border">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 flex items-center justify-center gap-3 py-6 text-lg font-semibold transition-all ${
              activeTab === 'generate'
                ? 'bg-primary text-primary-foreground shadow-inner'
                : 'text-foreground/70 hover:bg-muted'
            }`}
          >
            <FileText className="w-6 h-6" />
            Generate Dokumen
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`flex-1 flex items-center justify-center gap-3 py-6 text-lg font-semibold transition-all ${
              activeTab === 'download'
                ? 'bg-primary text-primary-foreground shadow-inner'
                : 'text-foreground/70 hover:bg-muted'
            }`}
          >
            <Download className="w-6 h-6" />
            Download Dokumen
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 mt-10 pb-20">
        {activeTab === 'generate' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Konversi Predikat — AKTIF */}
            <Card className="hover:shadow-xl transition-shadow duration-300 border-2 border-transparent hover:border-primary/20">
              <CardContent className="p-8">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <GraduationCap className="w-9 h-9 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground">Konversi Predikat & Penilaian</h3>
                    <p className="text-muted-foreground mt-2">Generate dokumen konversi nilai predikat secara otomatis</p>
                  </div>
                </div>
                <div className="mt-8">
                  <KonversiPredikat karyawan={karyawan} />
                </div>
              </CardContent>
            </Card>

            {/* PAK & DUPAK — Coming Soon */}
            <Card className="hover:shadow-xl transition-shadow duration-300 border-2 border-transparent hover:border-primary/10 opacity-75">
              <CardContent className="p-8">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/60 to-primary/40 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <ScrollText className="w-9 h-9 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-foreground">PAK & DUPAK</h3>
                    <p className="text-muted-foreground mt-2">Dokumen Penilaian Angka Kredit dan DUPAK</p>
                    <span className="inline-block mt-4 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      Segera Hadir
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'download' && (
          <Card className="border-2 border-dashed border-primary/30 bg-card/50">
            <CardContent className="py-24 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-28 h-28 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  <Download className="w-14 h-14 text-primary" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">Download Dokumen Karir</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Semua dokumen yang telah Anda generate akan tersedia di sini untuk diunduh kapan saja.
                </p>
                <div className="mt-10">
                  <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl p-8 max-w-md mx-auto">
                    <p className="text-primary font-medium text-lg">
                      Belum ada dokumen tersedia
                    </p>
                    <p className="text-muted-foreground mt-2">
                      Mulai generate dokumen di tab sebelah
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LayananKarir;