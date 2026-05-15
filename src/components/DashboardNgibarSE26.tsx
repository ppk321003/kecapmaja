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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  // Kolom Monev Ngibar
  statusNgibar?: string; // Sudah Ngibar atau belum
  dokumenStatus?: string; // Draft atau Open
  metode?: 'CAWI' | 'PAPI'; // Metode pengisian
  entryStatus?: string; // Status entry (untuk PAPI)
  submitStatus?: string; // Status submit
}

interface TargetUBRow {
  no: number;
  idsbr: string; // dari Sheet2 kolom A
  namaUsaha: string; // dari Sheet2 kolom B
  pic: string; // dari Sheet2 kolom C
  contact: string; // dari Sheet2 kolom D (hidden)
  statusNgibar?: string; // dari Sheet1 kolom M - matched by namaUsaha/instansi
  statusDokumen?: string; // dari Sheet1 kolom N
  metode?: string; // dari Sheet1 kolom O
  papiSudahEntri?: string; // dari Sheet1 kolom P
  statusSubmit?: string; // dari Sheet1 kolom Q
  [key: string]: string | number | undefined;
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
  const [targetUBRows, setTargetUBRows] = useState<TargetUBRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Terlaksana' | 'Proses Konfirmasi'>('all');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('tracking');
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<Partial<TargetUBRow>>({});
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteRow, setPendingDeleteRow] = useState<TargetUBRow | null>(null);
  const [targetUBPage, setTargetUBPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
        
        // Fetch Sheet1 - Tracking
        const { data: data1, error: err1 } = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: 'read',
            range: `${SHEET_NAME}!A:Q`,
          },
        });

        if (err1) throw err1;

        const values: any[][] = data1?.values || [];
        let parsed: NgibarRow[] = [];
        
        if (values.length >= 2) {
          // Parse data dari row 2 onwards (skip header)
          parsed = values.slice(1).map((r, idx) => ({
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
            statusNgibar: String(r[12] || '').trim(),
            dokumenStatus: String(r[13] || '').trim(),
            metode: String(r[14] || '').trim() as 'CAWI' | 'PAPI',
            entryStatus: String(r[15] || '').trim(),
            submitStatus: String(r[16] || '').trim(),
          })).filter(r => r.instansi);
        }

        setRows(parsed);

        // Fetch Sheet2 - Target UB
        const { data: data2, error: err2 } = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: 'read',
            range: 'Sheet2!A:I',
          },
        });

        if (!err2 && data2?.values) {
          const sheet2Values: any[][] = data2.values || [];
          let parsed2: TargetUBRow[] = [];
          
          if (sheet2Values.length >= 2) {
            // Parse Sheet2 - struktur: A=IDSBR, B=Nama Usaha, C=PIC, D=Contact, E=Status Ngibar, F=Status Dokumen, G=Metode, H=PAPI Entry, I=Status Submit
            parsed2 = sheet2Values.slice(1).map((r, idx) => {
              const namaUsaha = String(r[1] || '').trim();
              
              return {
                no: parseInt(r[0]) || idx + 1,
                idsbr: String(r[0] || '').trim(),
                namaUsaha: namaUsaha,
                pic: String(r[2] || '').trim(),
                contact: String(r[3] || '').trim(),
                // Monev Ngibar fields from Sheet2 E-I
                statusNgibar: String(r[4] || '').trim(),
                statusDokumen: String(r[5] || '').trim(),
                metode: String(r[6] || '').trim(),
                papiSudahEntri: String(r[7] || '').trim(),
                statusSubmit: String(r[8] || '').trim(),
              };
            }).filter(r => r.namaUsaha);
          }

          setTargetUBRows(parsed2);
        }
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

  // Handle save Monev Ngibar data to Google Sheets (Sheet2)
  const handleSaveTargetUB = async (row: TargetUBRow) => {
    try {
      setSavingRowId(row.no);
      setSaveMessage(null);

      // Find the correct row index in targetUBRows array
      const rowIndex = targetUBRows.findIndex(r => r.no === row.no);
      if (rowIndex === -1) {
        throw new Error('Data tidak ditemukan');
      }

      // Sheet2 row number: rowIndex + 2 (1 for header, 1 for array starting at 0)
      const sheet2RowNumber = rowIndex + 2;

      // Update columns E-I in Sheet2 (Monev Ngibar fields)
      // E=Status Ngibar, F=Status Dokumen, G=Metode, H=PAPI Sudah Entri, I=Status Submit
      const updateRange = `Sheet2!E${sheet2RowNumber}:I${sheet2RowNumber}`;
      const values = [[
        editedData.statusNgibar || row.statusNgibar || '',
        editedData.statusDokumen || row.statusDokumen || '',
        editedData.metode || row.metode || '',
        editedData.papiSudahEntri || row.papiSudahEntri || '',
        editedData.statusSubmit || row.statusSubmit || '',
      ]];

      console.log('[Save] Range:', updateRange, 'Values:', values);

      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: 'update',
          range: updateRange,
          values: values,
        },
      });

      if (error) throw error;

      // Update local state - targetUBRows
      setTargetUBRows(prev => prev.map(r =>
        r.no === row.no
          ? {
              ...r,
              statusNgibar: editedData.statusNgibar || r.statusNgibar || '',
              statusDokumen: editedData.statusDokumen || r.statusDokumen || '',
              metode: editedData.metode || r.metode || '',
              papiSudahEntri: editedData.papiSudahEntri || r.papiSudahEntri || '',
              statusSubmit: editedData.statusSubmit || r.statusSubmit || '',
            }
          : r
      ));

      setSaveMessage({ type: 'success', text: `Data ${row.namaUsaha} berhasil disimpan` });
      setEditingRowId(null);
      setEditedData({});

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e: any) {
      console.error('[Save Error]:', e);
      setSaveMessage({ type: 'error', text: `Gagal menyimpan data: ${e?.message || 'Unknown error'}` });
    } finally {
      setSavingRowId(null);
    }
  };

  // Handle delete/clear Monev Ngibar data
  const handleDeleteConfirm = async () => {
    if (!pendingDeleteRow) return;
    const row = pendingDeleteRow;

    try {
      setSavingRowId(row.no);
      setSaveMessage(null);

      const rowIndex = targetUBRows.findIndex(r => r.no === row.no);
      if (rowIndex === -1) {
        throw new Error('Data tidak ditemukan');
      }

      const sheet2RowNumber = rowIndex + 2;
      const updateRange = `Sheet2!E${sheet2RowNumber}:I${sheet2RowNumber}`;
      const values = [['', '', '', '', '']]; // Clear all columns E-I

      console.log('[Delete] Range:', updateRange);

      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: 'update',
          range: updateRange,
          values: values,
        },
      });

      if (error) throw error;

      // Update local state
      setTargetUBRows(prev => prev.map(r =>
        r.no === row.no
          ? {
              ...r,
              statusNgibar: '',
              statusDokumen: '',
              metode: '',
              papiSudahEntri: '',
              statusSubmit: '',
            }
          : r
      ));

      setSaveMessage({ type: 'success', text: `Data ${row.namaUsaha} berhasil dihapus` });
      setEditingRowId(null);
      setEditedData({});

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e: any) {
      console.error('[Delete Error]:', e);
      setSaveMessage({ type: 'error', text: `Gagal menghapus data: ${e?.message || 'Unknown error'}` });
    } finally {
      setSavingRowId(null);
      setDeleteConfirmOpen(false);
      setPendingDeleteRow(null);
    }
  };

  const handleDeleteTargetUB = (row: TargetUBRow) => {
    setPendingDeleteRow(row);
    setDeleteConfirmOpen(true);
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

  // Calculate statistics for Target UB
  const targetUBStats = useMemo(() => {
    const totalTarget = targetUBRows.length;
    const totalRealisasi = targetUBRows.filter(r => r.statusSubmit === 'Sudah').length;
    const persentase = totalTarget > 0 ? ((totalRealisasi / totalTarget) * 100).toFixed(1) : '0';
    
    return {
      totalTarget,
      totalRealisasi,
      persentase,
      totalKegiatan: targetUBRows.length,
    };
  }, [targetUBRows]);

  // Determine which stats to display based on active tab
  const displayStats = activeTab === 'tracking' ? stats : targetUBStats;

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

  // Target UB Analytics
  const targetUBAnalytics = useMemo(() => {
    const countByField = (field: keyof TargetUBRow) => {
      const counts = new Map<string, number>();
      targetUBRows.forEach(row => {
        const value = String(row[field] || 'Kosong');
        counts.set(value, (counts.get(value) || 0) + 1);
      });
      return Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };

    const statusNgibar = countByField('statusNgibar');
    const statusDokumen = countByField('statusDokumen');
    const metode = countByField('metode');
    const papiSudahEntri = countByField('papiSudahEntri');
    const statusSubmit = countByField('statusSubmit');

    const selesai = targetUBRows.filter(r => r.statusSubmit === 'Sudah').length;
    const belum = targetUBRows.filter(r => r.statusSubmit !== 'Sudah').length;

    return {
      statusNgibar,
      statusDokumen,
      metode,
      papiSudahEntri,
      statusSubmit: [
        { name: 'Selesai', value: selesai, color: '#10b981' },
        { name: 'Belum', value: belum, color: '#f59e0b' },
      ].filter(s => s.value > 0),
      totalRows: targetUBRows.length,
      selesaiCount: selesai,
      completionPercent: targetUBRows.length > 0 ? ((selesai / targetUBRows.length) * 100).toFixed(1) : '0',
    };
  }, [targetUBRows]);

  // Pagination for Target UB
  const paginatedTargetUBRows = useMemo(() => {
    const startIndex = (targetUBPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return targetUBRows.slice(startIndex, endIndex);
  }, [targetUBRows, targetUBPage]);

  const totalPages = Math.ceil(targetUBRows.length / ITEMS_PER_PAGE);

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
              {displayStats.totalTarget.toLocaleString('id-ID')}
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
              {displayStats.totalRealisasi.toLocaleString('id-ID')}
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
              {displayStats.persentase}%
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
              {displayStats.totalKegiatan}
            </div>
            <p className="text-xs text-orange-700 mt-1">Instansi/Lembaga</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>Monitoring Ngibar SE26</CardTitle>
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
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tracking">Tracking Ngibar SE 2026</TabsTrigger>
              <TabsTrigger value="target-ub">Target UB</TabsTrigger>
            </TabsList>

            {/* TAB TRACKING */}
            <TabsContent value="tracking" className="mt-6">
              <div className="flex gap-4 mb-4">
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
                      <th className="text-center py-3 px-2 font-semibold">Monev Ngibar</th>
                      <th className="text-center py-3 px-2 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-muted-foreground">
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
                              <td className="py-3 px-2 text-center">
                                <div className="text-xs space-y-1">
                                  {row.statusNgibar && (
                                    <div className="font-medium text-blue-700">{row.statusNgibar}</div>
                                  )}
                                  {row.metode && (
                                    <div className="text-slate-600">({row.metode})</div>
                                  )}
                                </div>
                              </td>
                              <td className="text-center py-3 px-2 select-none">
                                <span className="text-blue-600 font-medium text-xs cursor-pointer hover:text-blue-800">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-gradient-to-r from-blue-50 to-slate-50 border-b-2 border-blue-200">
                                <td colSpan={11} className="py-6 px-4">
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
                                    <div className="bg-white p-3 rounded border-l-4 border-blue-400">
                                      <h4 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                                        <span className="text-blue-500">📋</span> Tindak Lanjut
                                      </h4>
                                      <p className="text-sm text-slate-600">
                                        {row.tindakLanjut || '—'}
                                      </p>
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
            </TabsContent>

            {/* TAB TARGET UB */}
            <TabsContent value="target-ub" className="mt-6">
              {saveMessage && (
                <Alert className={`mb-4 ${saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <AlertCircle className={`h-4 w-4 ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
                  <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {saveMessage.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-3 px-2 font-semibold w-12">No</th>
                      <th className="text-left py-3 px-2 font-semibold">IDSBR</th>
                      <th className="text-left py-3 px-2 font-semibold">Nama Usaha</th>
                      <th className="text-center py-3 px-2 font-semibold bg-blue-100">Status Ngibar</th>
                      <th className="text-left py-3 px-2 font-semibold bg-blue-100">Status Dokumen</th>
                      <th className="text-left py-3 px-2 font-semibold bg-blue-100">Metode</th>
                      <th className="text-left py-3 px-2 font-semibold bg-blue-100">PAPI Sudah Entri</th>
                      <th className="text-left py-3 px-2 font-semibold bg-blue-100">Status Submit</th>
                      <th className="text-center py-3 px-2 font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTargetUBRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          Tidak ada data Target UB
                        </td>
                      </tr>
                    ) : (
                      paginatedTargetUBRows.map((row, idx) => {
                        const isEditing = editingRowId === row.no;
                        const isSaving = savingRowId === row.no;
                        const metodeValue = editedData.metode !== undefined ? editedData.metode : (row.metode || '');
                        const isMetodePAPI = metodeValue === 'PAPI';

                        return (
                          <tr key={row.no} className="border-b hover:bg-blue-50">
                            <td className="py-3 px-2 text-muted-foreground">{(targetUBPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                            <td className="py-3 px-2 font-medium text-slate-800">{row.idsbr}</td>
                            <td className="py-3 px-2 font-medium text-slate-800">{row.namaUsaha}</td>
                            
                            {/* Status Ngibar - Icon Toggle */}
                            <td className="py-3 px-2 text-center">
                              {isEditing ? (
                                <button
                                  onClick={() => {
                                    const newStatus = (editedData.statusNgibar || row.statusNgibar) === 'Sudah' ? 'Belum' : 'Sudah';
                                    setEditedData({ ...editedData, statusNgibar: newStatus });
                                  }}
                                  disabled={isSaving}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded border-2 transition-all disabled:opacity-50"
                                  title={`${(editedData.statusNgibar || row.statusNgibar) === 'Sudah' ? 'Sudah Ngibar' : 'Belum Ngibar'}`}
                                  style={{
                                    borderColor: (editedData.statusNgibar || row.statusNgibar) === 'Sudah' ? '#10b981' : '#ef4444',
                                    color: (editedData.statusNgibar || row.statusNgibar) === 'Sudah' ? '#10b981' : '#ef4444',
                                  }}
                                >
                                  {(editedData.statusNgibar || row.statusNgibar) === 'Sudah' ? '✓' : '✗'}
                                </button>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${
                                  row.statusNgibar === 'Sudah' ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  {row.statusNgibar === 'Sudah' ? '✓' : '✗'}
                                </span>
                              )}
                            </td>

                            {/* Status Dokumen - Dropdown */}
                            <td className="py-3 px-2 text-sm">
                              {isEditing ? (
                                <Select 
                                  value={editedData.statusDokumen !== undefined ? editedData.statusDokumen : (row.statusDokumen || '')}
                                  onValueChange={(val) => setEditedData({ ...editedData, statusDokumen: val })}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Pilih" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Draft">Draft</SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Submit">Submit</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-slate-700">{row.statusDokumen || '-'}</span>
                              )}
                            </td>

                            {/* Metode - Dropdown (CAWI/PAPI) */}
                            <td className="py-3 px-2 text-sm">
                              {isEditing ? (
                                <Select 
                                  value={editedData.metode !== undefined ? editedData.metode : (row.metode || '')}
                                  onValueChange={(val) => setEditedData({ ...editedData, metode: val })}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Pilih" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CAWI">CAWI</SelectItem>
                                    <SelectItem value="PAPI">PAPI</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-slate-700">{row.metode || '-'}</span>
                              )}
                            </td>

                            {/* PAPI Sudah Entri - Conditional (hanya jika Metode=PAPI) */}
                            <td className="py-3 px-2 text-sm">
                              {isMetodePAPI ? (
                                isEditing ? (
                                  <Select 
                                    value={editedData.papiSudahEntri !== undefined ? editedData.papiSudahEntri : (row.papiSudahEntri || '')}
                                    onValueChange={(val) => setEditedData({ ...editedData, papiSudahEntri: val })}
                                    disabled={isSaving}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Pilih" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Belum Entri">Belum Entri</SelectItem>
                                      <SelectItem value="Sudah Entri">Sudah Entri</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-slate-700">{row.papiSudahEntri || '-'}</span>
                                )
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>

                            {/* Status Submit - Dropdown (Sudah/Belum) */}
                            <td className="py-3 px-2 text-sm">
                              {isEditing ? (
                                <Select 
                                  value={editedData.statusSubmit !== undefined ? editedData.statusSubmit : (row.statusSubmit || '')}
                                  onValueChange={(val) => setEditedData({ ...editedData, statusSubmit: val })}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Pilih" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Belum">Belum</SelectItem>
                                    <SelectItem value="Sudah">Sudah</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-slate-700">{row.statusSubmit || '-'}</span>
                              )}
                            </td>

                            <td className="text-center py-3 px-2 select-none">
                              {isEditing ? (
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => handleSaveTargetUB(row)}
                                    disabled={isSaving}
                                    className="text-xs text-green-600 font-medium hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                  >
                                    {isSaving ? '⏳' : '✓'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRowId(null);
                                      setEditedData({});
                                    }}
                                    disabled={isSaving}
                                    className="text-xs text-red-600 font-medium hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => {
                                      setEditingRowId(row.no);
                                      setEditedData({
                                        statusNgibar: row.statusNgibar || '',
                                        statusDokumen: row.statusDokumen || '',
                                        metode: row.metode || '',
                                        papiSudahEntri: row.papiSudahEntri || '',
                                        statusSubmit: row.statusSubmit || '',
                                      });
                                    }}
                                    className="text-xs text-blue-600 font-medium hover:text-blue-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTargetUB(row)}
                                    className="text-xs text-red-600 font-medium hover:text-red-800"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Menampilkan {(targetUBPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(targetUBPage * ITEMS_PER_PAGE, targetUBRows.length)} dari {targetUBRows.length} data
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTargetUBPage(prev => Math.max(1, prev - 1))}
                      disabled={targetUBPage === 1}
                      className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      ← Sebelumnya
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setTargetUBPage(page)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                            targetUBPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setTargetUBPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={targetUBPage === totalPages}
                      className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      Selanjutnya →
                    </button>
                  </div>
                </div>
              )}

              {/* Target UB Analytics Section */}
              {targetUBAnalytics.totalRows > 0 && (
                <div className="mt-8 space-y-6">
                  {/* Completion Status */}
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-900">
                        <CheckCircle2 className="h-5 w-5" />
                        Status Penyelesaian
                      </CardTitle>
                      <CardDescription className="text-green-800">
                        {targetUBAnalytics.selesaiCount} dari {targetUBAnalytics.totalRows} sudah selesai ({targetUBAnalytics.completionPercent}%)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={targetUBAnalytics.statusSubmit}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {targetUBAnalytics.statusSubmit.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Analytics Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Ngibar */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Status Ngibar</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={targetUBAnalytics.statusNgibar}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Status Dokumen */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Status Dokumen</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={targetUBAnalytics.statusDokumen}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8b5cf6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Metode */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Metode Pengisian</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={targetUBAnalytics.metode}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#06b6d4" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* PAPI Sudah Entri */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">PAPI Sudah Entri</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={targetUBAnalytics.papiSudahEntri}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#f59e0b" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Analytics Section - Only show in Tracking tab */}
      {activeTab === 'tracking' && (
        <>
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
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5" />
              Konfirmasi Penghapusan
            </DialogTitle>
            <DialogDescription>
              Apakah anda yakin menghapus seluruh isian baris ini?
            </DialogDescription>
          </DialogHeader>
          {pendingDeleteRow && (
            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
              <p><strong>Nama Usaha:</strong> {pendingDeleteRow.namaUsaha}</p>
              <p><strong>IDSBR:</strong> {pendingDeleteRow.idsbr}</p>
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Data yang dihapus tidak dapat dikembalikan
              </p>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-sm"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={savingRowId !== null}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {savingRowId !== null ? '⏳ Menghapus...' : '🗑️ Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardNgibarSE26;
