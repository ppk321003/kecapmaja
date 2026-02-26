import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Loader2, X } from 'lucide-react';

interface ABKData {
  no: number;
  jabatan: string;
  formasi: number;
}

interface EmployeeMatch {
  nama: string;
  nip: string;
  pangkat: string;
  golongan: string;
  foto?: string;
}

interface ABKWithMatches extends ABKData {
  employees: EmployeeMatch[];
}

const LayananKarirABK: React.FC = () => {
  const { user } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  
  const [abkData, setAbkData] = useState<ABKWithMatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [satkerNama, setSatkerNama] = useState<string>('');

  // Fetch data ABK dan MASTER.ORGANIK
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get satker config
        const config = satkerConfig?.getUserSatkerConfig();
        if (!config) {
          setError('Konfigurasi satker tidak ditemukan');
          setLoading(false);
          return;
        }

        setSatkerNama(config.satker_nama);

        // Get spreadsheet ID for MASTER.ORGANIK
        const spreadsheetId = satkerConfig?.getUserSatkerSheetId('masterorganik');
        if (!spreadsheetId) {
          setError('Sheet MASTER.ORGANIK tidak dikonfigurasi');
          setLoading(false);
          return;
        }

        // Fetch ABK sheet
        console.log('[LayananKarirABK] Fetching ABK sheet...');
        const abkResponse = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: spreadsheetId,
            operation: 'read',
            range: 'ABK!A:C'
          }
        });

        if (abkResponse.error || !abkResponse.data?.values) {
          throw new Error(abkResponse.error?.message || 'Gagal membaca sheet ABK');
        }

        // Fetch MASTER.ORGANIK sheet
        console.log('[LayananKarirABK] Fetching MASTER.ORGANIK sheet...');
        const masterResponse = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: spreadsheetId,
            operation: 'read',
            range: 'MASTER.ORGANIK!A:V'
          }
        });

        if (masterResponse.error || !masterResponse.data?.values) {
          throw new Error(masterResponse.error?.message || 'Gagal membaca sheet MASTER.ORGANIK');
        }

        // Parse ABK data (skip header row)
        const abkRows = abkResponse.data.values.slice(1) || [];
        const abkParsed: ABKData[] = abkRows
          .map((row: any[], index: number) => ({
            no: index + 1,
            jabatan: row[1]?.toString().trim() || '',
            formasi: parseInt(row[2]?.toString() || '0') || 0
          }))
          .filter(item => item.jabatan); // Filter empty rows

        // Parse MASTER.ORGANIK data (skip header row)
        const masterRows = masterResponse.data.values.slice(1) || [];
        const employees = masterRows
          .map((row: any[]) => ({
            nama: row[3]?.toString() || '',
            nip: row[2]?.toString() || '',
            jabatan: row[4]?.toString().trim() || '', // Column E: Jabatan
            pangkat: row[7]?.toString() || '',
            golongan: row[6]?.toString() || '',
            foto: row[21]?.toString() || '' // Column V: Foto
          }))
          .filter(emp => emp.nama && emp.jabatan); // Filter empty rows

        // Matching: Group employees by jabatan
        const employeesByJabatan = new Map<string, EmployeeMatch[]>();
        employees.forEach(emp => {
          if (!employeesByJabatan.has(emp.jabatan)) {
            employeesByJabatan.set(emp.jabatan, []);
          }
          employeesByJabatan.get(emp.jabatan)!.push({
            nama: emp.nama,
            nip: emp.nip,
            pangkat: emp.pangkat,
            golongan: emp.golongan,
            foto: emp.foto
          });
        });

        // Merge ABK dengan employees
        const mergedData: ABKWithMatches[] = abkParsed.map(abk => ({
          ...abk,
          employees: employeesByJabatan.get(abk.jabatan) || []
        }));

        console.log('[LayananKarirABK] Data merged:', {
          abkCount: mergedData.length,
          employeesTotal: employees.length,
          matchedPositions: mergedData.filter(d => d.employees.length > 0).length
        });

        setAbkData(mergedData);
      } catch (err) {
        console.error('[LayananKarirABK] Error:', err);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data');
      } finally {
        setLoading(false);
      }
    };

    if (satkerConfig && !satkerConfig.isLoading) {
      fetchData();
    }
  }, [satkerConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span className="text-lg text-muted-foreground">Memproses data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Gagal memuat data</h3>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">ABK - {satkerNama}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Struktur organisasi dan penempatan pegawai per jabatan
        </p>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Alokasi dan Analisis Kebutuhan ({satkerNama})</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {abkData.length} Jabatan
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">No</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50 min-w-64">Nama Jabatan</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground bg-muted/50">Formasi Jabatan</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground bg-muted/50">Existing</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50 min-w-56">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {abkData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Tidak ada data jabatan
                    </td>
                  </tr>
                ) : (
                  <>
                    {abkData.map((item, index) => {
                      const existing = item.employees.length;
                      const formasi = item.formasi;
                      let keterangan = '';
                      let keteranganColor = '';
                      
                      if (existing === formasi && formasi > 0) {
                        keterangan = `✓ Terpenuhi (${existing}/${formasi})`;
                        keteranganColor = 'text-green-700';
                      } else if (existing < formasi && formasi > 0) {
                        keterangan = `✗ Belum terpenuhi, terisi ${existing} pegawai (${existing}/${formasi})`;
                        keteranganColor = 'text-orange-700';
                      } else if (existing > formasi) {
                        keterangan = `✗ Melebihi formasi (${existing}/${formasi})`;
                        keteranganColor = 'text-red-700';
                      } else {
                        keterangan = `- Tidak ada formasi`;
                        keteranganColor = 'text-gray-700';
                      }
                      
                      return (
                        <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 text-foreground">{item.no}</td>
                          <td className="py-3 px-4 text-foreground font-medium">{item.jabatan}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold bg-blue-100 text-blue-700">
                              {item.formasi}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <ExistingCell 
                              count={existing}
                              employees={item.employees}
                              jabatan={item.jabatan}
                              totalFormasi={item.formasi}
                            />
                          </td>
                          <td className={`py-3 px-4 text-xs font-medium ${keteranganColor}`}>
                            {keterangan}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Row Total */}
                    <tr className="border-t-2 border-gray-400 font-semibold bg-gray-100">
                      <td colSpan={2} className="py-3 px-4 text-foreground text-right">TOTAL</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold bg-blue-100 text-blue-700">
                          {abkData.reduce((sum, item) => sum + item.formasi, 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold bg-green-100 text-green-700">
                          {abkData.reduce((sum, item) => sum + item.employees.length, 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Formasi</p>
              <p className="text-3xl font-bold text-primary mt-2">
                {abkData.reduce((sum, item) => sum + item.formasi, 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Pegawai Terisi</p>
              <p className="text-3xl font-bold text-primary mt-2">
                {abkData.reduce((sum, item) => sum + item.employees.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {((abkData.reduce((sum, item) => sum + item.employees.length, 0) / abkData.reduce((sum, item) => sum + item.formasi, 0)) * 100).toFixed(1)}% dari total formasi
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Jabatan Terisi</p>
              <p className="text-3xl font-bold text-primary mt-2">
                {abkData.filter(item => item.employees.length > 0).length} / {abkData.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper function to convert Google Drive URL to embeddable format
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return '';
  
  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return fileIdMatch 
      ? `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`
      : url;
  } else if (url.includes('http')) {
    return url; // Return as-is if it's already an HTTP URL
  }
  
  return url; // Return original URL
};

// ExistingCell Component with Click Dialog Popup
const ExistingCell: React.FC<{
  count: number;
  employees: EmployeeMatch[];
  jabatan: string;
  totalFormasi: number;
}> = ({ count, employees, jabatan, totalFormasi }) => {
  const [openDialog, setOpenDialog] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpenDialog(true)}
        className={`
          inline-flex items-center justify-center
          w-8 h-8 rounded-lg font-semibold cursor-pointer
          transition-all hover:scale-110
          ${count === totalFormasi && totalFormasi > 0
            ? 'bg-green-100 text-green-700 ring-2 ring-green-500 hover:bg-green-200' 
            : count > 0
              ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500 hover:bg-yellow-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }
        `}
      >
        {count}
      </button>

      {/* Dialog Popup */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700">{jabatan}</DialogTitle>
            <DialogDescription>
              Detail penempatan pegawai pada posisi ini
            </DialogDescription>
          </DialogHeader>

          {/* Employees List */}
          <div className="space-y-3 py-4">
            {employees.length > 0 ? (
              employees.map((emp, idx) => (
                <div key={idx} className="flex gap-3 bg-gray-50 border border-gray-200 p-3 rounded">
                  {/* Foto */}
                  {emp.foto ? (
                    <img 
                      src={convertGoogleDriveUrl(emp.foto)} 
                      alt={emp.nama}
                      className="w-16 h-20 object-cover rounded flex-shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-20 bg-gray-300 rounded flex-shrink-0 flex items-center justify-center text-xs text-gray-600">
                      No Photo
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-gray-900">{emp.nama}</p>
                    <p className="text-gray-600 mt-1 text-xs">NIP: {emp.nip}</p>
                    <p className="text-gray-600 text-xs">
                      {emp.pangkat} ({emp.golongan})
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic py-2 text-center">
                Belum ada pegawai yang menduduki jabatan ini
              </div>
            )}
          </div>

          {/* Status Summary */}
          <div className="bg-gray-100 p-3 rounded text-sm">
            <p className="font-semibold text-gray-900 mb-2">Ringkasan</p>
            <div className="space-y-1 text-xs">
              <p>Formasi: <span className="font-bold">{totalFormasi}</span></p>
              <p>Terisi: <span className="font-bold text-green-700">{count}</span></p>
              {count < totalFormasi && (
                <p className="text-orange-700">Butuh: <span className="font-bold">{totalFormasi - count}</span> pegawai</p>
              )}
              {count > totalFormasi && (
                <p className="text-red-700">Surplus: <span className="font-bold">{count - totalFormasi}</span> pegawai</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LayananKarirABK;
