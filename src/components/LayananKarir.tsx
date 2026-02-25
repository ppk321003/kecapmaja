import React, { useState, useEffect } from 'react';
import { FileText, Download, HelpCircle, MessageSquare } from 'lucide-react';
import KonversiPredikat from '@/components/KonversiPredikat';
import DownloadPAK from '@/components/DownloadPAK';
import ManualWABroadcast from '@/components/ManualWABroadcast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Karyawan } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { supabase } from '@/integrations/supabase/client';

interface LayananKarirProps {
  karyawan: Karyawan;
}

const LayananKarir: React.FC<LayananKarirProps> = ({ karyawan }) => {
  const { user } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  const userRole = user?.role ? [user.role] : [];

  const [activeTab, setActiveTab] = useState<'generate' | 'download' | 'broadcast'>(
    isPPK ? 'generate' : 'download'
  );

  const [allEmployees, setAllEmployees] = useState<Karyawan[]>([]);
  const [ppkName, setPpkName] = useState<string>(user?.username || 'PPK');

  // Fetch all employees for broadcast feature
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const spreadsheetId = satkerConfig?.getUserSatkerSheetId('masterorganik');
        
        console.log('[LayananKarir] Attempting fetch with:', {
          spreadsheetId,
          isPPK,
          satkerConfigLoading: satkerConfig?.isLoading
        });
        
        if (!spreadsheetId) {
          console.warn('[LayananKarir] No spreadsheetId configured for masterorganik');
          return;
        }

        const requestBody = {
          spreadsheetId: spreadsheetId,
          operation: 'read',
          range: 'MASTER.ORGANIK!A:V'
        };

        console.log('[LayananKarir] Invoking google-sheets with body:', requestBody);

        const { data, error } = await supabase.functions.invoke('google-sheets', {
          body: requestBody
        });

        console.log('[LayananKarir] Google Sheets Response:', { 
          hasError: !!error, 
          dataLength: data?.values?.length,
          error: error?.message || error 
        });

        if (!error && data?.values && Array.isArray(data.values)) {
          const rows = data.values;
          const employees = rows.slice(1).map((row: any[]) => ({
            nip: row[2]?.toString() || '',
            nama: row[3]?.toString() || '',
            pangkat: row[7]?.toString() || '',
            golongan: row[6]?.toString() || '',
            jabatan: row[4]?.toString() || '',
            kategori: (row[11]?.toString() || 'Reguler') as 'Keahlian' | 'Keterampilan' | 'Reguler',
            tglPenghitunganAkTerakhir: row[12]?.toString() || '',
            akKumulatif: parseFloat((row[13]?.toString() || '0').replace(',', '.')) || 0,
            unitKerja: row[5]?.toString() || '',
            tmtJabatan: row[16]?.toString() || '',
            tmtPangkat: row[17]?.toString() || '',
            pendidikan: row[18]?.toString() || '',
            tempatLahir: row[14]?.toString() || '',
            tanggalLahir: '',
            jenisKelamin: 'L' as 'L' | 'P',
            telepon: row[8]?.toString() || '', // Column I: No. HP
            no_hp: row[8]?.toString() || '', // Column I: No. HP (for broadcast function)
          })) as Karyawan[];
          
          console.log('[LayananKarir] ✅ Fetched employees for broadcast:', {
            count: employees.length, 
            sample: employees[0]
          });
          setAllEmployees(employees);
        } else {
          console.error('[LayananKarir] ❌ Error or empty data from google-sheets:', {
            error,
            hasValues: !!data?.values,
            isArray: Array.isArray(data?.values)
          });
        }
      } catch (err) {
        console.error('[LayananKarir] ❌ Exception fetching employees:', err);
      }
    };

    if (isPPK && !satkerConfig?.isLoading) {
      fetchEmployees();
    }
  }, [isPPK, satkerConfig]);

  useEffect(() => {
    setPpkName(user?.username || 'PPK');
  }, [user?.username]);

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

              {/* Broadcast WA Tab — Hanya untuk PPK */}
              {isPPK && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTab('broadcast')}
                      className={`flex items-center gap-2.5 px-7 py-2.5 transition-all relative overflow-hidden ${
                        activeTab === 'broadcast' ? 'text-white' : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      {activeTab === 'broadcast' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
                      )}
                      <MessageSquare className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">Broadcast WA</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p>Kirim notifikasi WhatsApp manual ke karyawan yang dipilih atau grup tertentu</p>
                    <p className="text-xs mt-1 opacity-75">Hanya Pejabat Pembuat Komitmen (PPK) yang dapat mengakses</p>
                  </TooltipContent>
                </Tooltip>
              )}
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

        {activeTab === 'broadcast' && isPPK && (
          <div className="w-full">
            <ManualWABroadcast 
              allEmployees={allEmployees}
              userRole={userRole}
              ppkName={ppkName}
            />
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
};

export default LayananKarir;