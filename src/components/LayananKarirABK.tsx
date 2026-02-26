import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

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
            golongan: row[6]?.toString() || ''
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
            golongan: emp.golongan
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
                  <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">Nama Jabatan</th>
                  <th className="text-center py-3 px-4 font-semibold text-foreground bg-muted/50">Formasi Jabatan</th>
                </tr>
              </thead>
              <tbody>
                {abkData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      Tidak ada data jabatan
                    </td>
                  </tr>
                ) : (
                  abkData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-foreground">{item.no}</td>
                      <td className="py-3 px-4 text-foreground">{item.jabatan}</td>
                      <td className="py-3 px-4 text-center">
                        <FormationCell 
                          count={item.formasi} 
                          employees={item.employees}
                          jabatan={item.jabatan}
                        />
                      </td>
                    </tr>
                  ))
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

// FormationCell Component with Tooltip
const FormationCell: React.FC<{
  count: number;
  employees: EmployeeMatch[];
  jabatan: string;
}> = ({ count, employees, jabatan }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          inline-flex items-center justify-center
          w-8 h-8 rounded-lg font-semibold cursor-help
          transition-all
          ${count > 0 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-700'
          }
          ${employees.length === count 
            ? 'ring-2 ring-green-500' 
            : employees.length > 0 
              ? 'ring-2 ring-yellow-500' 
              : ''
          }
        `}
      >
        {count}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 w-80 p-3 text-sm bg-gray-900 text-white rounded-lg shadow-lg bottom-full mb-2 left-1/2 transform -translate-x-1/2">
          {/* Header */}
          <div className="font-semibold text-white mb-2">
            {jabatan}
          </div>

          {/* Employees List */}
          {employees.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {employees.map((emp, idx) => (
                <div key={idx} className="text-xs bg-gray-800 p-2 rounded">
                  <p className="font-medium text-yellow-200">{emp.nama}</p>
                  <p className="text-gray-300">NIP: {emp.nip}</p>
                  <p className="text-gray-300">
                    {emp.pangkat} ({emp.golongan})
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">
              Belum ada pegawai yang menduduki jabatan ini
            </div>
          )}

          {/* Status */}
          <div className="mt-2 pt-2 border-t border-gray-700 text-xs">
            <span className={
              employees.length === count
                ? 'text-green-300'
                : employees.length > 0
                  ? 'text-yellow-300'
                  : 'text-red-300'
            }>
              {employees.length} / {count} Terisi
            </span>
          </div>

          {/* Arrow Pointer */}
          <div className="absolute w-3 h-3 bg-gray-900 transform rotate-45 top-full -translate-y-1/2 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
};

export default LayananKarirABK;
