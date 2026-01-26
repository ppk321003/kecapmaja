import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePencairanData } from "@/hooks/use-pencairan-data";
import { Submission, STATUS_LABELS, JENIS_BELANJA_OPTIONS } from "@/types/pencairan";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TooltipProps, LineChart, Line } from "recharts";
import { FileText, Clock, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Users, Calendar, FileEdit, ArrowRightCircle, RotateCcw, Timer } from "lucide-react";
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { useMemo } from "react";
import { format, parseISO, startOfMonth, subMonths, isAfter, isBefore, addDays } from "date-fns";
import { id } from "date-fns/locale";

// Colors for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const STATUS_COLORS: Record<string, string> = {
  draft: '#6366f1',
  pending_ppk: '#f59e0b',
  pending_ppspm: '#8b5cf6',
  pending_bendahara: '#06b6d4',
  incomplete_sm: '#ef4444',
  incomplete_ppk: '#f97316',
  incomplete_ppspm: '#dc2626',
  incomplete_bendahara: '#be123c',
  sent_arsip: '#10b981',
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background p-3 border rounded-lg shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'info' | 'danger' | 'success' | 'secondary';
  trend?: { value: number; label: string };
}

function StatCard({ title, value, subtitle, icon: Icon, variant = 'default', trend }: StatCardProps) {
  const variantClasses = {
    default: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200 dark:from-blue-950/50 dark:to-blue-900/50 dark:text-blue-300 dark:border-blue-800',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 border-amber-200 dark:from-amber-950/50 dark:to-amber-900/50 dark:text-amber-300 dark:border-amber-800',
    info: 'bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-700 border-cyan-200 dark:from-cyan-950/50 dark:to-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800',
    danger: 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-red-200 dark:from-red-950/50 dark:to-red-900/50 dark:text-red-300 dark:border-red-800',
    success: 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-200 dark:from-green-950/50 dark:to-green-900/50 dark:text-green-300 dark:border-green-800',
    secondary: 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 border-purple-200 dark:from-purple-950/50 dark:to-purple-900/50 dark:text-purple-300 dark:border-purple-800',
  };

  return (
    <Card className={`border ${variantClasses[variant]} rounded-xl shadow-sm hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`w-3 h-3 ${trend.value < 0 ? 'rotate-180' : ''}`} />
                <span>{Math.abs(trend.value)}% {trend.label}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-current/10`}>
            <Icon className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Parse date from custom format "HH:mm - dd/MM/yyyy"
function parseCustomDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    const [timePart, datePart] = dateStr.split(' - ');
    if (!timePart || !datePart) return null;
    const [hours, minutes] = timePart.split(':').map(Number);
    const [day, month, year] = datePart.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    return new Date(fullYear, month - 1, day, hours, minutes);
  } catch {
    return null;
  }
}

interface DashboardPencairanProps {
  filterTahun: string;
}

export default function DashboardPencairan({ filterTahun }: DashboardPencairanProps) {
  const { data: submissions = [], isLoading } = usePencairanData();

  // Filter submissions by year
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const date = sub.submittedAt instanceof Date ? sub.submittedAt : parseCustomDate(sub.waktuPengajuan || '');
      return date && date.getFullYear().toString() === filterTahun;
    });
  }, [submissions, filterTahun]);

  // Calculate statistics
  const stats = useMemo(() => {
    const counts = {
      total: filteredSubmissions.length,
      draft: 0,
      pending_ppk: 0,
      pending_ppspm: 0,
      pending_bendahara: 0,
      pending_arsip: 0,
      incomplete_sm: 0,
      incomplete_ppk: 0,
      incomplete_ppspm: 0,
      incomplete_bendahara: 0,
      sent_arsip: 0,
    };

    filteredSubmissions.forEach(sub => {
      if (sub.status in counts) {
        counts[sub.status as keyof typeof counts]++;
      }
    });

    const inProcess = counts.pending_ppk + counts.pending_ppspm + counts.pending_bendahara + counts.pending_arsip;
    const rejected = counts.incomplete_sm + counts.incomplete_ppk + counts.incomplete_ppspm + counts.incomplete_bendahara;
    const successRate = counts.total > 0 ? Math.round((counts.sent_arsip / counts.total) * 100) : 0;
    const completionPercentage = counts.total > 0 ? Math.round((counts.sent_arsip / counts.total) * 100) : 0;

    return { ...counts, inProcess, rejected, successRate, completionPercentage };
  }, [filteredSubmissions]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    filteredSubmissions.forEach(sub => {
      const label = STATUS_LABELS[sub.status] || sub.status;
      distribution[label] = (distribution[label] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredSubmissions]);

  // Jenis Belanja distribution
  const jenisBelanjaDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    filteredSubmissions.forEach(sub => {
      const jenis = sub.jenisBelanja || 'Lainnya';
      distribution[jenis] = (distribution[jenis] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSubmissions]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = months.map((name, index) => ({
      name,
      pengajuan: 0,
      selesai: 0,
      ditolak: 0,
    }));

    filteredSubmissions.forEach(sub => {
      const date = sub.submittedAt instanceof Date ? sub.submittedAt : parseCustomDate(sub.waktuPengajuan || '');
      if (date) {
        const monthIndex = date.getMonth();
        data[monthIndex].pengajuan++;
        if (sub.status === 'sent_arsip') {
          data[monthIndex].selesai++;
        } else if (['incomplete_sm', 'incomplete_ppk', 'incomplete_ppspm', 'incomplete_bendahara'].includes(sub.status)) {
          data[monthIndex].ditolak++;
        }
      }
    });

    return data;
  }, [filteredSubmissions]);

  // Top submitters
  const topSubmitters = useMemo(() => {
    const submitterCounts: Record<string, { total: number; completed: number }> = {};
    filteredSubmissions.forEach(sub => {
      const submitter = sub.submitterName || 'Unknown';
      if (!submitterCounts[submitter]) {
        submitterCounts[submitter] = { total: 0, completed: 0 };
      }
      submitterCounts[submitter].total++;
      if (sub.status === 'sent_arsip') {
        submitterCounts[submitter].completed++;
      }
    });

    return Object.entries(submitterCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredSubmissions]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return [...filteredSubmissions]
      .sort((a, b) => {
        const dateA = parseCustomDate(a.updatedAtString || '') || a.submittedAt;
        const dateB = parseCustomDate(b.updatedAtString || '') || b.submittedAt;
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      })
      .slice(0, 5);
  }, [filteredSubmissions]);

  // Workflow funnel data
  const workflowFunnel = useMemo(() => {
    return [
      { name: 'Draft', value: stats.draft, color: '#6366f1' },
      { name: 'Menunggu Bendahara', value: stats.pending_bendahara, color: '#06b6d4' },
      { name: 'Menunggu PPK', value: stats.pending_ppk, color: '#f59e0b' },
      { name: 'Menunggu PPSPM', value: stats.pending_ppspm, color: '#8b5cf6' },
      { name: 'Menunggu Arsip', value: stats.pending_arsip, color: '#06b6d4' },
      { name: 'Selesai (Arsip)', value: stats.sent_arsip, color: '#10b935' },
    ];
  }, [stats]);

  // Average processing time between stages
  const processingTimeData: Array<{ stage: string; hours: number; displayTime: string; count: number; color: string }> = useMemo(() => {
    const timeDiffs = {
      smToBendahara: [] as number[],
      bendaharaToPpk: [] as number[],
      ppkToPpspm: [] as number[],
      ppspmToArsip: [] as number[],
    };

    filteredSubmissions.forEach(sub => {
      const waktuSM = parseCustomDate(sub.waktuPengajuan || '');
      const waktuBendahara = parseCustomDate(sub.waktuBendahara || '');
      const waktuPPK = parseCustomDate(sub.waktuPpk || '');
      const waktuPPSPM = parseCustomDate(sub.waktuPPSPM || '');
      const waktuArsip = parseCustomDate(sub.waktuArsip || '');

      // SM → Bendahara
      if (waktuSM && waktuBendahara) {
        const diffHours = (waktuBendahara.getTime() - waktuSM.getTime()) / (1000 * 60 * 60);
        if (diffHours > 0) timeDiffs.smToBendahara.push(diffHours);
      }

      // Bendahara → PPK
      if (waktuBendahara && waktuPPK) {
        const diffHours = (waktuPPK.getTime() - waktuBendahara.getTime()) / (1000 * 60 * 60);
        if (diffHours > 0) timeDiffs.bendaharaToPpk.push(diffHours);
      }

      // PPK → PPSPM
      if (waktuPPK && waktuPPSPM) {
        const diffHours = (waktuPPSPM.getTime() - waktuPPK.getTime()) / (1000 * 60 * 60);
        if (diffHours > 0) timeDiffs.ppkToPpspm.push(diffHours);
      }

      // PPSPM → Arsip
      if (waktuPPSPM && waktuArsip) {
        const diffHours = (waktuArsip.getTime() - waktuPPSPM.getTime()) / (1000 * 60 * 60);
        if (diffHours > 0) timeDiffs.ppspmToArsip.push(diffHours);
      }
    });

    const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const formatTime = (hours: number) => {
      if (hours < 1) return `${Math.round(hours * 60)} menit`;
      if (hours < 24) return `${hours.toFixed(1)} jam`;
      return `${(hours / 24).toFixed(1)} hari`;
    };

    const avgSmToBendahara = calcAvg(timeDiffs.smToBendahara);
    const avgBendaharaToPpk = calcAvg(timeDiffs.bendaharaToPpk);
    const avgPpkToPpspm = calcAvg(timeDiffs.ppkToPpspm);
    const avgPpspmToArsip = calcAvg(timeDiffs.ppspmToArsip);

    return [
      { 
        stage: 'SM → Bendahara', 
        hours: parseFloat(avgSmToBendahara.toFixed(1)),
        displayTime: formatTime(avgSmToBendahara),
        count: timeDiffs.smToBendahara.length,
        color: '#3b82f6',
      },
      { 
        stage: 'Bendahara → PPK', 
        hours: parseFloat(avgBendaharaToPpk.toFixed(1)),
        displayTime: formatTime(avgBendaharaToPpk),
        count: timeDiffs.bendaharaToPpk.length,
        color: '#06b6d4',
      },
      { 
        stage: 'PPK → PPSPM', 
        hours: parseFloat(avgPpkToPpspm.toFixed(1)),
        displayTime: formatTime(avgPpkToPpspm),
        count: timeDiffs.ppkToPpspm.length,
        color: '#f59e0b',
      },
      { 
        stage: 'PPSPM → Arsip', 
        hours: parseFloat(avgPpspmToArsip.toFixed(1)),
        displayTime: formatTime(avgPpspmToArsip),
        count: timeDiffs.ppspmToArsip.length,
        color: '#10b981',
      },
    ];
  }, [filteredSubmissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Pengajuan"
          value={stats.total}
          subtitle={`Tahun ${filterTahun}`}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Draft SM"
          value={stats.draft}
          subtitle="Dalam proses"
          icon={FileEdit}
          variant="secondary"
        />
        <StatCard
          title="Sedang Diproses"
          value={stats.inProcess}
          subtitle="PPK/PPSPM/Bendahara/KPPN/Arsip"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Dikembalikan"
          value={stats.rejected}
          subtitle="Perlu perbaikan"
          icon={XCircle}
          variant="danger"
        />
        <StatCard
          title="Menunggu Arsip"
          value={stats.pending_arsip}
          subtitle="Siap dicatat"
          icon={AlertTriangle}
          variant="info"
        />
        <StatCard
          title="Tingkat Selesai"
          value={`${stats.completionPercentage}%`}
          subtitle="Sudah dicatat Arsip"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Distribusi Status</CardTitle>
            <CardDescription>Sebaran status pengajuan</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Tidak ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Jenis Belanja Bar Chart */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pengajuan per Jenis Belanja</CardTitle>
            <CardDescription>Distribusi berdasarkan jenis belanja</CardDescription>
          </CardHeader>
          <CardContent>
            {jenisBelanjaDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Tidak ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jenisBelanjaDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Jumlah" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Trend Bulanan</CardTitle>
          <CardDescription>Perbandingan pengajuan, selesai, dan ditolak per bulan</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="pengajuan" 
                name="Total Pengajuan"
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="selesai" 
                name="Selesai (KPPN)"
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="ditolak" 
                name="Dikembalikan"
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Processing Time Comparison Chart */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Rata-rata Waktu Proses Antar Tahap
          </CardTitle>
          <CardDescription>Perbandingan durasi rata-rata dari satu tahap ke tahap berikutnya</CardDescription>
        </CardHeader>
        <CardContent>
          {processingTimeData.every(d => d.count === 0) ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Tidak ada data waktu proses
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bar Chart */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={processingTimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(val) => `${val} jam`} />
                  <YAxis type="category" dataKey="stage" width={130} fontSize={12} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold text-foreground">{data.stage}</p>
                            <p className="text-sm text-muted-foreground">Rata-rata: <span className="font-medium text-foreground">{data.displayTime}</span></p>
                            <p className="text-sm text-muted-foreground">Dari {data.count} pengajuan</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="hours" 
                    name="Waktu (jam)" 
                    radius={[0, 4, 4, 0]}
                  >
                    {processingTimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {processingTimeData.map((item) => (
                  <div 
                    key={item.stage}
                    className="p-4 rounded-lg border"
                    style={{ borderColor: `${item.color}40`, backgroundColor: `${item.color}10` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium">{item.stage}</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.displayTime}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Berdasarkan {item.count} pengajuan
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Funnel */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRightCircle className="w-5 h-5" />
              Alur Kerja Saat Ini
            </CardTitle>
            <CardDescription>Jumlah pengajuan di setiap tahap</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflowFunnel.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold" style={{ backgroundColor: item.color }}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${stats.total > 0 ? (item.value / stats.total) * 100 : 0}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {/* Rejected section */}
              <div className="flex items-center gap-3 pt-2 border-t">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-red-600">Dikembalikan</span>
                    <span className="text-sm font-bold text-red-600">{stats.rejected}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Submitters */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Pengaju
            </CardTitle>
            <CardDescription>Peringkat berdasarkan jumlah pengajuan</CardDescription>
          </CardHeader>
          <CardContent>
            {topSubmitters.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Tidak ada data
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {topSubmitters.map((submitter, index) => (
                  <div key={submitter.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{submitter.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {submitter.completed}/{submitter.total} selesai
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{submitter.total}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Aktivitas Terbaru
          </CardTitle>
          <CardDescription>Pengajuan yang terakhir diperbarui</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Tidak ada aktivitas terbaru
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((submission) => {
                const updateTime = submission.updatedAtString || submission.waktuPengajuan || '-';
                const statusColor = STATUS_COLORS[submission.status] || '#6b7280';
                
                return (
                  <div key={submission.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div 
                      className="w-2 h-12 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{submission.id}</span>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ 
                            backgroundColor: `${statusColor}20`,
                            color: statusColor 
                          }}
                        >
                          {STATUS_LABELS[submission.status]}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{submission.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {submission.submitterName} • {submission.jenisBelanja}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {updateTime}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
