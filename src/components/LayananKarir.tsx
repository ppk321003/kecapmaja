import React, { useState } from 'react';
import { FileText, Download, HelpCircle } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import DownloadPAK from '@/components/DownloadPAK';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Karyawan } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const { user } = useAuth();
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';

  const [activeTab, setActiveTab] = useState<'generate' | 'download'>(
    isPPK ? 'generate' : 'download'
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* TAB HEADER — Kedua tab selalu muncul */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-4">
            <div className="inline-flex rounded-xl shadow-sm border overflow-hidden text-sm font-medium gap-0">
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>Konversi SKP (Surat Keterangan Pelaksanaan) menjadi PAK (Penetapan Angka Kredit)</p>
                  <p className="text-xs mt-1 opacity-75">Hanya Pejabat Pembuat Komitmen (PPK) yang dapat mengakses</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p>Unduh dokumen PAK yang telah di-generate sebelumnya</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

      {/* KONTEN */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 py-8 relative">
        {activeTab === 'generate' && (
          <div className="relative">
            {/* Banner read-only untuk non-PPK */}
            {!isPPK && (
              <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <p className="font-medium">Mode Hanya Lihat</p>
                <p className="text-sm mt-1">
                  Anda dapat melihat data konversi predikat. Hanya Pejabat Pembuat Komitmen (PPK) yang
                  dapat mengedit atau generate PAK.
                </p>
              </div>
            )}

            {/* Komponen asli tanpa perubahan */}
            <KonversiPredikat karyawan={karyawan} />

            {/* Overlay blokir klik untuk non-PPK */}
            {!isPPK && (
              <div className="absolute inset-0 bg-transparent z-10 cursor-not-allowed" />
            )}
          </div>
        )}

        {activeTab === 'download' && (
          <div className="w-full">
            <DownloadPAK karyawan={karyawan} />
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
};

export default LayananKarir;