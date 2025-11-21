import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import { Karyawan } from '@/types';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'download'>('generate');

  return (
    <div className="min-h-screen bg-background">

      {/* Tombol Tab Kecil + Gradasi Senada Tema */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4">
          <div className="inline-flex rounded-xl shadow-sm border overflow-hidden text-sm font-medium">
            <button
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-2.5 px-7 py-2.5 transition-all relative overflow-hidden ${
                activeTab === 'generate' ? 'text-white' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {activeTab === 'generate' && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
              )}
              <FileText className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Generate Dokumen</span>
            </button>

            <button
              onClick={() => setActiveTab('download')}
              className={`flex items-center gap-2.5 px-7 py-2.5 transition-all relative overflow-hidden ${
                activeTab === 'download' ? 'text-white' : 'text-foreground/70 hover:text-foreground'
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

      {/* KONTEN UTAMA — FULL BLEED, TANPA CARD */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-8">

        {/* TAB GENERATE — Hanya Tabel, Full Width Maksimal */}
        {activeTab === 'generate' && (
          <div className="w-full">
            <KonversiPredikat karyawan={karyawan} />
          </div>
        )}

        {/* TAB DOWNLOAD — Placeholder Kosong */}
        {activeTab === 'download' && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <Download className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">
              Download Dokumen Karir
            </h3>
            <p className="text-muted-foreground max-w-md">
              Dokumen yang telah Anda generate akan tersedia di sini untuk diunduh.
            </p>
            <div className="mt-10 bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-12 max-w-md">
              <p className="text-primary font-medium">Belum ada dokumen</p>
              <p className="text-muted-foreground text-sm mt-2">
                Generate dokumen terlebih dahulu
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LayananKarir;