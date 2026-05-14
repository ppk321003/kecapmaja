import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  Clock,
  Target,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NgibarRow {
  no: number;
  tanggal: string;
  instansi: string;
  pic: string;
  targetSubmit: number;
  realisasiSubmit: number;
  dokumenPapi: string;
  kendala: string;
  solusi: string;
  tindakLanjut: string;
  status: 'Terlaksana' | 'Proses Konfirmasi';
  keterangan: string;
}

interface StatusStat {
  name: string;
  value: number;
  color: string;
}

interface InstansiData {
  name: string;
  target: number;
  realisasi: number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'];
const SPREADSHEET_ID = '1EyrssWtjEGd64SYelUMON3nnLpj6KU5INCMeD-Amjto';
const SHEET_NAME = 'Sheet1';

interface DashboardNgibarSE26Props {
  filterTahun?: string;
}

const DashboardNgibarSE26 = ({ filterTahun }: DashboardNgibarSE26Props) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<NgibarRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Terlaksana' | 'Proses Konfirmasi'>('all');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Theme-aware button styling
  const getButtonClass = () => {
    const baseClass = "inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-2xl text-sm font-semibold";
    switch(theme) {
      case 'blue':
        return `${baseClass} bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700`;
      case 'green':
        return `${baseClass} bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700`;
      case 'orange':
        return `${baseClass} bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700`;
      case 'black':
        return `${baseClass} bg-gradient-to-r from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900`;
      default:
        return `${baseClass} bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700`;
    }
  };

  // Fetch data dari Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: 'read',
            range: `${SHEET_NAME}!A:L`,
          },
        });

        if (err) throw err;

        const values: any[][] = data?.values || [];
        if (values.length < 2) {
          setRows([]);
          return;
        }

        // Parse data dari row 2 onwards (skip header)
        const parsed: NgibarRow[] = values.slice(1).map((r, idx) => ({
          no: parseInt(r[0]) || idx + 1,
          tanggal: String(r[1] || '').trim(),
          instansi: String(r[2] || '').trim(),
          pic: String(r[3] || '').trim(),
          targetSubmit: parseInt(r[4]) || 0,
          realisasiSubmit: parseInt(r[5]) || 0,
          dokumenPapi: String(r[6] || '').trim(),
          kendala: String(r[7] || '').trim(),
          solusi: String(r[8] || '').trim(),
          tindakLanjut: String(r[9] || '').trim(),
          status: String(r[10] || 'Proses Konfirmasi').trim() as 'Terlaksana' | 'Proses Konfirmasi',
          keterangan: String(r[11] || '').trim(),
        })).filter(r => r.instansi); // Filter out empty rows

        setRows(parsed);
      } catch (e: any) {
        console.error('[DashboardNgibarSE26] Error:', e);
        setError(e?.message || 'Gagal memuat data Ngibar SE26');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function untuk parse tanggal
  const parseDate = (dateStr: string): Date => {
    if (!dateStr || dateStr === '—') return new Date(0);
    try {
      // Support format: DD/MM/YYYY atau YYYY-MM-DD
      const parts = dateStr.includes('/') 
        ? dateStr.split('/') 
        : dateStr.split('-');
      
      if (dateStr.includes('/')) {
        // DD/MM/YYYY
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        // YYYY-MM-DD
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    } catch {
      return new Date(0);
    }
  };

  // Function untuk mendapat warna berdasarkan persentase
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 font-bold'; // Hijau - mencapai target
    if (percentage >= 75) return 'text-blue-600 font-bold';   // Biru - baik
    if (percentage >= 50) return 'text-orange-600 font-bold'; // Orange - cukup
    return 'text-red-600 font-bold';                          // Merah - kurang
  };

  // Filter data berdasarkan search dan status, lalu sort berdasarkan tanggal (dari awal)
  const filteredRows = useMemo(() => {
    let filtered = rows.filter(row => {
      const matchesSearch = 
        row.instansi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.pic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || row.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Sort berdasarkan tanggal (awal ke akhir)
    filtered.sort((a, b) => {
      const dateA = parseDate(a.tanggal);
      const dateB = parseDate(b.tanggal);
      return dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [rows, searchQuery, filterStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTarget = rows.reduce((sum, r) => sum + r.targetSubmit, 0);
    const totalRealisasi = rows.reduce((sum, r) => sum + r.realisasiSubmit, 0);
    const persentase = totalTarget > 0 ? ((totalRealisasi / totalTarget) * 100).toFixed(1) : '0';
    const terlaksana = rows.filter(r => r.status === 'Terlaksana').length;
    const prosesKonfirmasi = rows.filter(r => r.status === 'Proses Konfirmasi').length;

    return {
      totalTarget,
      totalRealisasi,
      persentase,
      terlaksana,
      prosesKonfirmasi,
      totalKegiatan: rows.length,
    };
  }, [rows]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    return [
      { name: 'Terlaksana', value: stats.terlaksana, color: '#10b981' },
      { name: 'Proses Konfirmasi', value: stats.prosesKonfirmasi, color: '#f59e0b' },
    ].filter(s => s.value > 0);
  }, [stats]);

  // Realisasi by instansi for bar chart
  const instansiData = useMemo(() => {
    const grouped = new Map<string, { target: number; realisasi: number }>();
    
    rows.forEach(row => {
      const existing = grouped.get(row.instansi) || { target: 0, realisasi: 0 };
      grouped.set(row.instansi, {
        target: existing.target + row.targetSubmit,
        realisasi: existing.realisasi + row.realisasiSubmit,
      });
    });

    return Array.from(grouped, ([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.target - a.target);
  }, [rows]);

  // Kendala summary
  const kendalaList = useMemo(() => {
    return rows
      .filter(r => r.kendala)
      .map(r => r.kendala)
      .filter((value, index, self) => self.indexOf(value) === index)
      .slice(0, 5);
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Target Submit
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {stats.totalTarget.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-blue-700 mt-1">Peserta target</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Total Realisasi Submit
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {stats.totalRealisasi.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-green-700 mt-1">Peserta submit</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              % Realisasi
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {stats.persentase}%
            </div>
            <p className="text-xs text-purple-700 mt-1">Target vs Realisasi</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">
              Total Kegiatan
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {stats.totalKegiatan}
            </div>
            <p className="text-xs text-orange-700 mt-1">Instansi/Lembaga</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>Tracking Ngibar SE26</CardTitle>
            <a 
              href="https://docs.google.com/spreadsheets/d/1EyrssWtjEGd64SYelUMON3nnLpj6KU5INCMeD-Amjto/edit?gid=0#gid=0" 
              target="_blank" 
              rel="noopener noreferrer"
              className={getButtonClass()}
            >
              <FileText className="h-3.5 w-3.5" />
              Entri Data
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <CardDescription>Detail kegiatan ngibar untuk semua instansi/lembaga</CardDescription>
          
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Cari instansi atau PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Terlaksana">Terlaksana</SelectItem>
                <SelectItem value="Proses Konfirmasi">Proses Konfirmasi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-2 font-semibold w-12">No</th>
                  <th className="text-left py-3 px-2 font-semibold">Tanggal</th>
                  <th className="text-left py-3 px-2 font-semibold">Instansi/Lembaga</th>
                  <th className="text-left py-3 px-2 font-semibold">PIC</th>
                  <th className="text-center py-3 px-2 font-semibold">Target</th>
                  <th className="text-center py-3 px-2 font-semibold">Realisasi</th>
                  <th className="text-center py-3 px-2 font-semibold">%</th>
                  <th className="text-left py-3 px-2 font-semibold">Siap Entri</th>
                  <th className="text-left py-3 px-2 font-semibold">Status</th>
                  <th className="text-center py-3 px-2 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">
                      {searchQuery || filterStatus !== 'all'
                        ? `Tidak ada data yang cocok`
                        : `Tidak ada data Ngibar SE26`}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const percentage = row.targetSubmit > 0 
                      ? parseFloat(((row.realisasiSubmit / row.targetSubmit) * 100).toFixed(1))
                      : 0;
                    const isExpanded = expandedRowId === row.no;
                    const percentageColor = getPercentageColor(percentage);

                    return (
                      <React.Fragment key={row.no}>
                        <tr 
                          className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => setExpandedRowId(isExpanded ? null : row.no)}
                        >
                          <td className="py-3 px-2 text-muted-foreground">{idx + 1}</td>
                          <td className="py-3 px-2 text-sm font-medium">{row.tanggal}</td>
                          <td className="py-3 px-2 font-medium text-slate-800">{row.instansi}</td>
                          <td className="py-3 px-2 text-sm text-slate-700">{row.pic}</td>
                          <td className="text-center py-3 px-2 font-medium">{row.targetSubmit}</td>
                          <td className="text-center py-3 px-2 font-medium text-blue-700">{row.realisasiSubmit}</td>
                          <td className={`text-center py-3 px-2 text-sm ${percentageColor}`}>
                            {percentage.toFixed(1)}%
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-700">{row.dokumenPapi}</td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                row.status === 'Terlaksana'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {row.status === 'Terlaksana' ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {row.status}
                            </span>
                          </td>
                          <td className="text-center py-3 px-2 select-none">
                            <span className="text-blue-600 font-medium text-xs cursor-pointer hover:text-blue-800">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gradient-to-r from-blue-50 to-slate-50 border-b-2 border-blue-200">
                            <td colSpan={10} className="py-6 px-4">
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-white p-3 rounded border-l-4 border-red-400">
                                    <h4 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                                      <span className="text-red-500">🚨</span> Kendala
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                      {row.kendala || '—'}
                                    </p>
                                  </div>
                                  <div className="bg-white p-3 rounded border-l-4 border-green-400">
                                    <h4 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                                      <span className="text-green-500">✅</span> Solusi
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                      {row.solusi || '—'}
                                    </p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                                    <h4 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                                      <span className="text-blue-500">📋</span> Tindak Lanjut
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                      {row.tindakLanjut || '—'}
                                    </p>
                                  </div>
                                  {row.dokumenPapi && (
                                    <div className="bg-white p-3 rounded border-l-4 border-purple-400">
                                      <h4 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="text-purple-500">📄</span> Siap Entri
                                      </h4>
                                      <p className="text-sm text-slate-600">
                                        {row.dokumenPapi}
                                      </p>
                                    </div>
                                  )}
                                  {row.keterangan && (
                                    <div className="bg-white p-2 rounded border-l-4 border-amber-400">
                                      <h4 className="font-semibold text-xs text-slate-700 mb-1 flex items-center gap-2">
                                        <span className="text-amber-500">📝</span> Keterangan
                                      </h4>
                                      <p className="text-xs text-slate-600">
                                        {row.keterangan}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status Distribution
            </CardTitle>
            <CardDescription>
              {stats.terlaksana} Terlaksana, {stats.prosesKonfirmasi} Proses Konfirmasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Realisasi by Instansi - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Realisasi by Instansi
            </CardTitle>
            <CardDescription>
              Perbandingan Target vs Realisasi per Instansi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {instansiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={instansiData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="target" fill="#3b82f6" name="Target" />
                  <Bar dataKey="realisasi" fill="#10b981" name="Realisasi" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kendala Summary */}
      {kendalaList.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5" />
              🚨 Kendala yang Sedang Dihadapi ({kendalaList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {kendalaList.map((kendala, idx) => (
                <div key={idx} className="flex items-start gap-2 text-amber-900">
                  <span className="text-lg">•</span>
                  <span>{kendala}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardNgibarSE26;
