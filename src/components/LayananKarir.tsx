import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, GraduationCap } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import { Karyawan } from '@/types';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'download'>('generate');

  return (
    <div className="min-h-screen bg-background">

      {/* Tombol Tabs dengan Gradasi Senada Tema */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4">
          <div className="inline-flex rounded-xl shadow-sm border overflow-hidden">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-2.5 px-7 py-2.5 text-sm font-medium transition-all relative overflow-hidden ${
                activeTab === 'generate'
                  ? 'text-white'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {/* Gradasi otomatis ikut --gradient-primary dari tema */}
              {activeTab === 'generate' && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
              )}
              <FileText className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Generate Dokumen</span>
            </button>

            <button
              onClick={() => setActiveTab('download')}
              className={`flex items-center gap-2.5 px-7 py-2.5 text-sm font-medium transition-all relative overflow-hidden ${
                activeTab === 'download'
                  ? 'text-white'
                  : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {activeTab === 'download' && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
              )}
              <Download className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Download Dokumen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Konten Utama – Full Width Maksimal */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-10 pb-20">

        {/* TAB GENERATE */}
        {activeTab === 'generate' && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {/* Header Card Ringkas */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-8 py-6 border-b">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-md">
                    <GraduationCap className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Konversi Predikat & Penilaian
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
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

        {/* TAB DOWNLOAD */}
        {activeTab === 'download' && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-28 text-center">
              <div className="max-w-xl mx-auto">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Download className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  Download Dokumen Karir
                </h2>
                <p className="text-muted-foreground">
                  Dokumen yang telah Anda generate akan tersedia di sini.
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