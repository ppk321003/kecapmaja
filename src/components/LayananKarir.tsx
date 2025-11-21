import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Award, MapPin, Calendar, Sparkles, FileText, Download, GraduationCap } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import { Karyawan } from '@/types';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const ProfileHeader = ({ karyawan }: { karyawan: Karyawan }) => (
  <div className="gradient-header text-white">
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-7">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-10 h-10" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{karyawan.nama}</h1>
              <Badge className="bg-white/20 border-0 text-xs px-3 py-1">
                {karyawan.kategori}
              </Badge>
            </div>
            <p className="text-lg mt-1 opacity-90">{karyawan.jabatan}</p>
            <div className="flex flex-wrap gap-6 mt-3 text-sm">
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
          <p className="text-xs opacity-70">NIP</p>
          <p className="text-xl font-mono font-bold tracking-wider">{karyawan.nip}</p>
          <div className="flex items-center justify-end gap-2 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{karyawan.status}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-white/20 flex items-center gap-4 text-sm">
        <Calendar className="w-5 h-5" />
        <div>
          <span className="opacity-70">Penghitungan AK Terakhir:</span>{' '}
          <span className="font-semibold">{karyawan.tglPenghitunganAkTerakhir}</span>
        </div>
        <Sparkles className="ml-auto w-5 h-5 text-yellow-300" />
      </div>
    </div>
  </div>
);

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'download'>('generate');

  return (
    <div className="min-h-screen bg-background">
      <ProfileHeader karyawan={karyawan} />

      {/* Tab Kecil & Elegan */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 mt-8">
        <div className="inline-flex bg-card rounded-xl shadow-sm border overflow-hidden">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2.5 px-8 py-3 text-sm font-medium transition-all ${
              activeTab === 'generate'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-muted'
            }`}
          >
            <FileText className="w-4 h-4" />
            Generate Dokumen
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-2.5 px-8 py-3 text-sm font-medium transition-all ${
              activeTab === 'download'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-muted'
            }`}
          >
            <Download className="w-4 h-4" />
            Download Dokumen
          </button>
        </div>
      </div>

      {/* Konten Utama – Full Width */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 mt-8 pb-20">
        {activeTab === 'generate' && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-8 py-6 border-b">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      Konversi Predikat & Penilaian
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate dokumen konversi nilai predikat secara otomatis
                    </p>
                  </div>
                </div>
              </div>

              {/* Form / Tabel – Full Width */}
              <div className="p-6 lg:p-10">
                <KonversiPredikat karyawan={karyawan} />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'download' && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-24 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Download className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Download Dokumen Karir
                </h2>
                <p className="text-muted-foreground">
                  Dokumen yang telah Anda generate akan tersedia untuk diunduh di sini.
                </p>
                <div className="mt-10">
                  <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-10 max-w-md mx-auto">
                    <p className="text-primary font-medium">
                      Belum ada dokumen tersedia
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Generate dokumen terlebih dahulu
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