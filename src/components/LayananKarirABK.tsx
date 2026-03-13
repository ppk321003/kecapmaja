import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Loader2, Users, Building2, CheckCircle2, AlertTriangle, TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ABKData {
  no: number;
  jabatan: string;
  formasi: number;
  grade: string;
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
  const [sortField, setSortField] = useState<'no' | 'grade' | 'formasi' | 'existing'>('no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Fetch data ABK dan MASTER.ORGANIK
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const config = satkerConfig?.getUserSatkerConfig();
        if (!config) {
          setError('Konfigurasi satker tidak ditemukan');
          setLoading(false);
          return;
        }

        setSatkerNama(config.satker_nama);

        const spreadsheetId = satkerConfig?.getUserSatkerSheetId('masterorganik');
        if (!spreadsheetId) {
          setError('Sheet MASTER.ORGANIK tidak dikonfigurasi');
          setLoading(false);
          return;
        }

        console.log('[LayananKarirABK] Fetching ABK sheet...');
        const abkResponse = await supabase.functions.invoke('google-sheets', {
          body: { spreadsheetId, operation: 'read', range: 'ABK!A:D' }
        });

        if (abkResponse.error || !abkResponse.data?.values) {
          throw new Error(abkResponse.error?.message || 'Gagal membaca sheet ABK');
        }

        console.log('[LayananKarirABK] Fetching MASTER.ORGANIK sheet...');
        const masterResponse = await supabase.functions.invoke('google-sheets', {
          body: { spreadsheetId, operation: 'read', range: 'MASTER.ORGANIK!A:V' }
        });

        if (masterResponse.error || !masterResponse.data?.values) {
          throw new Error(masterResponse.error?.message || 'Gagal membaca sheet MASTER.ORGANIK');
        }

        const abkRows = abkResponse.data.values.slice(1) || [];
        const abkParsed: ABKData[] = abkRows
          .map((row: any[], index: number) => ({
            no: index + 1,
            jabatan: row[1]?.toString().trim() || '',
            formasi: parseInt(row[2]?.toString() || '0') || 0,
            grade: row[3]?.toString().trim() || ''
          }))
          .filter((item: ABKData) => item.jabatan);

        const masterRows = masterResponse.data.values.slice(1) || [];
        const employees = masterRows
          .map((row: any[]) => ({
            nama: row[3]?.toString() || '',
            nip: row[2]?.toString() || '',
            jabatan: row[4]?.toString().trim() || '',
            pangkat: row[7]?.toString() || '',
            golongan: row[6]?.toString() || '',
            foto: row[21]?.toString() || ''
          }))
          .filter((emp: any) => emp.nama && emp.jabatan);

        const employeesByJabatan = new Map<string, EmployeeMatch[]>();
        employees.forEach((emp: any) => {
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

        const mergedData: ABKWithMatches[] = abkParsed.map(abk => ({
          ...abk,
          employees: employeesByJabatan.get(abk.jabatan) || []
        }));

        console.log('[LayananKarirABK] Data merged:', {
          abkCount: mergedData.length,
          employeesTotal: employees.length,
          matchedPositions: mergedData.filter((d: ABKWithMatches) => d.employees.length > 0).length
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

  // Computed stats
  const stats = useMemo(() => {
    const totalFormasi = abkData.reduce((s, i) => s + i.formasi, 0);
    const totalExisting = abkData.reduce((s, i) => s + i.employees.length, 0);
    const filledPositions = abkData.filter(i => i.employees.length > 0).length;
    const fullyMet = abkData.filter(i => i.employees.length === i.formasi && i.formasi > 0).length;
    const deficit = totalFormasi - totalExisting;
    return { totalFormasi, totalExisting, filledPositions, fullyMet, deficit };
  }, [abkData]);

  // Sorted data
  const sortedData = useMemo(() => {
    const sorted = [...abkData];
    sorted.sort((a, b) => {
      let va: number, vb: number;
      switch (sortField) {
        case 'grade': va = parseInt(a.grade) || 0; vb = parseInt(b.grade) || 0; break;
        case 'formasi': va = a.formasi; vb = b.formasi; break;
        case 'existing': va = a.employees.length; vb = b.employees.length; break;
        default: va = a.no; vb = b.no;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return sorted;
  }, [abkData, sortField, sortDir]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin border-t-primary" />
        </div>
        <p className="text-muted-foreground font-medium animate-pulse">Memuat data ABK...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Gagal memuat data</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fillPercent = stats.totalFormasi > 0 ? ((stats.totalExisting / stats.totalFormasi) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ABK — {satkerNama}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Struktur organisasi dan penempatan pegawai per jabatan
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto text-xs">
          {abkData.length} Jabatan
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-border/60 hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Formasi</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{stats.totalFormasi}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pegawai Terisi</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{stats.totalExisting}</p>
                <p className="text-xs text-muted-foreground mt-1">{fillPercent.toFixed(1)}% terisi</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 to-violet-600" />
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Terpenuhi</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{stats.fullyMet}</p>
                <p className="text-xs text-muted-foreground mt-1">dari {abkData.length} jabatan</p>
              </div>
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <CheckCircle2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60 hover:shadow-lg transition-shadow duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Defisit</p>
                <p className="text-3xl font-extrabold text-foreground mt-1">{Math.max(0, stats.deficit)}</p>
                <p className="text-xs text-muted-foreground mt-1">kebutuhan tambahan</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fill Progress Bar */}
      <Card className="border-border/60">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tingkat Keterisian
            </p>
            <span className="text-sm font-bold text-primary">{fillPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, fillPercent)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
            <span>{stats.totalExisting} terisi</span>
            <span>{stats.totalFormasi} formasi</span>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
          <CardTitle className="text-lg">Alokasi dan Analisis Kebutuhan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th onClick={() => handleSort('no')} className="text-left py-3.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none">
                    <span className="inline-flex items-center gap-1">No <SortIcon field="no" /></span>
                  </th>
                  <th className="text-left py-3.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider min-w-[260px]">Nama Jabatan</th>
                  <th onClick={() => handleSort('grade')} className="text-center py-3.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none">
                    <span className="inline-flex items-center gap-1">Grade <SortIcon field="grade" /></span>
                  </th>
                  <th onClick={() => handleSort('formasi')} className="text-center py-3.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none">
                    <span className="inline-flex items-center gap-1">Formasi <SortIcon field="formasi" /></span>
                  </th>
                  <th onClick={() => handleSort('existing')} className="text-center py-3.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none">
                    <span className="inline-flex items-center gap-1">Existing <SortIcon field="existing" /></span>
                  </th>
                  <th className="text-left py-3.5 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider min-w-[220px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      Tidak ada data jabatan
                    </td>
                  </tr>
                ) : (
                  <>
                    {sortedData.map((item, index) => {
                      const existing = item.employees.length;
                      const formasi = item.formasi;
                      
                      let statusLabel = '';
                      let statusClass = '';
                      
                      if (existing === formasi && formasi > 0) {
                        statusLabel = `Terpenuhi (${existing}/${formasi})`;
                        statusClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                      } else if (existing < formasi && formasi > 0) {
                        statusLabel = `Kurang ${formasi - existing} (${existing}/${formasi})`;
                        statusClass = 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                      } else if (existing > formasi) {
                        statusLabel = `Surplus +${existing - formasi} (${existing}/${formasi})`;
                        statusClass = 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
                      } else {
                        statusLabel = 'Tidak ada formasi';
                        statusClass = 'bg-muted text-muted-foreground border-border';
                      }
                      
                      return (
                        <tr key={index} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-3 px-4 text-muted-foreground font-mono text-xs">{item.no}</td>
                          <td className="py-3 px-4 font-medium text-foreground group-hover:text-primary transition-colors">{item.jabatan}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-7 rounded-md bg-muted text-foreground text-xs font-semibold">{item.grade || '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md font-bold text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{item.formasi}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <ExistingCell count={existing} employees={item.employees} jabatan={item.jabatan} totalFormasi={item.formasi} />
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass}`}>
                              {existing === formasi && formasi > 0 && <CheckCircle2 className="w-3 h-3" />}
                              {existing < formasi && formasi > 0 && <AlertTriangle className="w-3 h-3" />}
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-muted/60 font-semibold border-t-2 border-border">
                      <td colSpan={3} className="py-3.5 px-4 text-right text-foreground uppercase text-xs tracking-wider">Total</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md font-bold text-xs bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">{stats.totalFormasi}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md font-bold text-xs bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">{stats.totalExisting}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-muted-foreground">{fillPercent.toFixed(1)}% keterisian</span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to convert Google Drive URL to embeddable format
const convertGoogleDriveUrl = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    return fileIdMatch ? `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}` : url;
  }
  return url;
};

// ExistingCell Component with Click Dialog Popup
const ExistingCell: React.FC<{
  count: number;
  employees: EmployeeMatch[];
  jabatan: string;
  totalFormasi: number;
}> = ({ count, employees, jabatan, totalFormasi }) => {
  const [openDialog, setOpenDialog] = useState(false);

  const isMet = count === totalFormasi && totalFormasi > 0;
  const isPartial = count > 0 && count < totalFormasi;

  return (
    <>
      <button
        onClick={() => setOpenDialog(true)}
        className={`
          inline-flex items-center justify-center
          min-w-[28px] h-7 px-2 rounded-md font-bold text-xs cursor-pointer
          transition-all duration-200 hover:scale-110 hover:shadow-md
          ${isMet
            ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700' 
            : isPartial
              ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700'
              : 'bg-red-100 text-red-600 ring-1 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700'
          }
        `}
      >
        {count}
      </button>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-lg">{jabatan}</DialogTitle>
            <DialogDescription>
              Detail penempatan pegawai — Formasi: {totalFormasi}, Terisi: {count}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {employees.length > 0 ? (
              employees.map((emp, idx) => (
                <div key={idx} className="flex gap-3 bg-muted/50 border border-border/60 p-3 rounded-lg hover:bg-muted/80 transition-colors">
                  {emp.foto ? (
                    <img 
                      src={convertGoogleDriveUrl(emp.foto)} 
                      alt={emp.nama}
                      className="w-14 h-18 object-cover rounded-lg flex-shrink-0 ring-1 ring-border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-14 h-18 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 text-sm">
                    <p className="font-semibold text-foreground">{emp.nama}</p>
                    <p className="text-muted-foreground mt-1 text-xs font-mono">NIP: {emp.nip}</p>
                    <p className="text-muted-foreground text-xs">{emp.pangkat} ({emp.golongan})</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground italic py-8 text-center flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-30" />
                Belum ada pegawai yang menduduki jabatan ini
              </div>
            )}
          </div>

          <div className="bg-muted/60 border border-border/40 p-4 rounded-lg text-sm">
            <p className="font-semibold text-foreground mb-2">Ringkasan</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Formasi</span>
                <span className="font-bold">{totalFormasi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terisi</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{count}</span>
              </div>
              {count < totalFormasi && (
                <div className="flex justify-between col-span-2 pt-1 border-t border-border/40">
                  <span className="text-amber-600 dark:text-amber-400">Formasi tersedia</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{totalFormasi - count}</span>
                </div>
              )}
              {count > totalFormasi && (
                <div className="flex justify-between col-span-2 pt-1 border-t border-border/40">
                  <span className="text-red-600 dark:text-red-400">Surplus</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{count - totalFormasi}</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LayananKarirABK;
