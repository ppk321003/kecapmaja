import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import DownloadPAK from '@/components/DownloadPAK';
import { Karyawan } from '@/types';
import { useAuth } from '@/contexts/AuthContext'; // Pastikan path-nya sesuai

interface LayananKarirProps {
  karyawan: Karyawan;
}

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const { user } = useAuth();

  // Cek apakah user adalah Pejabat Pembuat Komitmen
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';

  // Tentukan tab aktif otomatis jika bukan PPK
  const [activeTab, setActiveTab] = useState<'generate' | 'download'>(
    isPPK ? 'generate' : 'download'
  );

  return (
    <div className="min-h-screen bg-background">

      {/* Tombol Tab — Hanya munculkan "Generate PAK" jika PPK */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4">
          <div className="inline-flex rounded-xl shadow-sm border overflow-hidden text-sm font-medium">
            
            {/* TAB GENERATE PAK — HANYA UNTUK PPK */}
            {isPPK && (
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
                <span className="relative z-10">Generate PAK</span>
              </button>
            )}

            {/* TAB DOWNLOAD PAK — SELALU MUNCUL */}
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
              <span className="relative z-10">Download PAK</span>
            </button>
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-8">

        {/* TAB GENERATE — Hanya render jika PPK */}
        {isPPK && activeTab === 'generate' && (
          <div className="w-full">
            <KonversiPredikat karyawan={karyawan} />
          </div>
        )}

        {/* TAB DOWNLOAD — Selalu tersedia */}
        {activeTab === 'download' && (
          <div className="w-full">
            <DownloadPAK karyawan={karyawan} />
          </div>
        )}

        {/* Jika bukan PPK dan entah kenapa tab generate dipaksa (tidak mungkin), fallback ke download */}
        {!isPPK && activeTab === 'generate' && (
          <div className="w-full">
            <DownloadPAK karyawan={karyawan} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LayananKarir;