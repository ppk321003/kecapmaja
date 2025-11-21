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
  <div className="gradient-header text-white shadow-xl">
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-8">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-12 h-12" />
          </div>
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl lg:text-4xl font-bold">{karyawan.nama}</h1>
              <Badge className="bg-white/25 backdrop-blur-sm border-0 text-sm px-4 py-1.5">
                {karyawan.kategori}
              </Badge>
            </div>
            <p className="text-xl lg:text-2xl mt-2 opacity-95">{karyawan.jabatan}</p>
            <div className="flex flex-wrap gap-8 mt-5 text-sm lg:text-base">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span>{karyawan.pangkat} • {karyawan.golongan}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{karyawan.unitKerja}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm opacity-80">NIP</p>
          <p className="text-3xl font-mono font-bold tracking-wider">{karyawan.nip}</p>
          <div className="flex items-center justify-end gap-3 mt-4">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-lg font-medium">{karyawan.status}</span>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Calendar className="w-7 h-7" />
          <div>
            <p className="text-sm opacity-80">Penghitungan AK Terakhir</p>
            <p className="text-xl font-bold">{karyawan.tglPenghitunganAkTerakhir}</p>
          </div>
        </div>
        <Sparkles className="w-8 h-8 text-yellow-300" />
      </div>
    </div>
  </div>
);

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'download'>('generate');

  return (
    <div className="min-h-screen bg-background">
      <ProfileHeader karyawan={karyawan} />

      {/* Tab Sederhana – Full Width */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 mt-12">
        <div className="flex bg-card rounded-2xl shadow-lg overflow-hidden border">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 flex items-center justify-center gap-3 py-6 text-lg font-semibold transition-all ${
              activeTab === 'generate'
                ? 'bg-primary text-primary-foreground'
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
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground/70 hover:bg-muted'
            }`}
          >
            <Download className="w-6 h-6" />
            Download Dokumen
          </button>
        </div>
      </div>

      {/* KONTEN UTAMA – FULL WIDTH MAKSIMAL */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 mt-10 pb-20">
        {activeTab === 'generate' && (
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-8 py-10 border-b">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
                    <GraduationCap className="w-11 h-11 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">
                      Konversi Predikat & Penilaian
                    </h2>
                    <p className="text-lg text-muted-foreground mt-2">
                      Generate dokumen konversi nilai predikat secara otomatis dan akurat
                    </p>
                  </div>
                </div>
              </div>

              {/* Isi Form – Full Width Table */}
              <div className="p-8 lg:p-12">
                <KonversiPredikat karyawan={karyawan} />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'download' && (
          <Card className="border-0 shadow-xl">
            <CardContent className="py-32 text-center">
              <div className="max-w-3xl mx-auto">
                <div className="w-32 h-32 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-2xl">
                  <Download className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-4xl font-bold text-foreground mb-6">
                  Download Dokumen Karir
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Dokumen yang telah Anda generate akan tersimpan otomatis dan dapat diunduh kapan saja di sini.
                </p>
                <div className="mt-12">
                  <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-3xl p-12 max-w-lg mx-auto">
                    <p className="text-primary font-semibold text-lg">
                      Belum ada dokumen tersedia
                    </p>
                    <p className="text-muted-foreground mt-3">
                      Generate dokumen terlebih dahulu di tab sebelah
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