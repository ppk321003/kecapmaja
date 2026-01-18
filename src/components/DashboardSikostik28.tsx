import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  Users,
  PiggyBank,
  HandCoins,
  AlertCircle,
  Trophy,
  Medal,
  Award,
  TrendingUp as TrendingUpIcon,
  CreditCard,
  Coins,
} from 'lucide-react';
import { useSikostikData, bulanOptions, getTahunOptions, getCurrentPeriod, formatCurrency } from '@/hooks/use-sikostik-data';
import type { RekapDashboard, LimitAnggota } from '@/types/sikostik';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

interface DashboardSikostik28Props {
  filterTahun?: string;
}

const DashboardSikostik28 = ({ filterTahun }: DashboardSikostik28Props) => {
  const {
    loading,
    error,
    fetchRekapDashboard,
    fetchLimitAnggota,
  } = useSikostikData();

  // State for data
  const [rekapPerBulan, setRekapPerBulan] = useState<RekapDashboard[][]>([]);
  const [limitData, setLimitData] = useState<LimitAnggota[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [komposisiData, setKomposisiData] = useState<any[]>([]);
  const [selisihData, setSelisihData] = useState<any[]>([]);

  // State for period filter
  const currentPeriod = getCurrentPeriod();
  const [selectedTahun, setSelectedTahun] = useState(filterTahun ? parseInt(filterTahun) : currentPeriod.tahun);

  // Update selected tahun when filterTahun prop changes
  useEffect(() => {
    if (filterTahun) {
      setSelectedTahun(parseInt(filterTahun));
    }
  }, [filterTahun]);

  // Load all data
  const loadData = async () => {
    try {
      const maxBulan = selectedTahun < currentPeriod.tahun ? 12 : currentPeriod.bulan;
      const rekapPromises = Array.from({ length: maxBulan }, (_, i) => fetchRekapDashboard(i + 1, selectedTahun));
      const rekap = await Promise.all(rekapPromises);
      setRekapPerBulan(rekap);

      // Fetch limit data for current year
      const filteredLimit = await fetchLimitAnggota(maxBulan, selectedTahun);
      setLimitData(filteredLimit);

      // Calculate komposisi from all period data
      const allRekap = rekap.flat();
      const komposisi = [
        { name: 'Pokok', value: allRekap.reduce((sum, m) => sum + m.simpananPokok, 0) },
        { name: 'Wajib', value: allRekap.reduce((sum, m) => sum + m.simpananWajib, 0) },
        { name: 'Sukarela', value: allRekap.reduce((sum, m) => sum + m.simpananSukarela, 0) },
        { name: 'Lebaran', value: allRekap.reduce((sum, m) => sum + m.simpananLebaran, 0) },
        { name: 'Lainnya', value: allRekap.reduce((sum, m) => sum + m.simpananLainnya, 0) },
      ].filter(k => k.value > 0);
      setKomposisiData(komposisi);

      // Build trend data
      const trendArr = bulanOptions.slice(0, maxBulan).map((b, index) => ({
        name: b.label.substring(0, 3),
        simpanan: rekap[index].reduce((sum, m) => sum + m.totalSimpanan, 0),
        piutang: rekap[index].reduce((sum, m) => sum + m.saldoPiutang, 0),
      }));
      setTrendData(trendArr);

      // Calculate selisih data for bar chart from filtered limit
      const selisihArr = filteredLimit
        .map(m => ({
          name: m.nama,
          selisih: m.totalSimpanan - m.saldoPiutang,
        }))
        .sort((a, b) => b.selisih - a.selisih);
      setSelisihData(selisihArr);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTahun]);

  // Calculate stats from last month
  const lastRekap = rekapPerBulan[rekapPerBulan.length - 1] || [];
  const activeMembers = useMemo(() => {
    return lastRekap.filter((m) => m.status === 'Aktif');
  }, [lastRekap]);

  const stats = useMemo(() => {
    const totalSimpanan = activeMembers.reduce((sum, m) => sum + (Number(m.totalSimpanan) || 0), 0);
    const totalPinjaman = activeMembers.reduce((sum, m) => sum + (Number(m.pinjamanBulanIni) || 0), 0);
    const totalPiutang = activeMembers.reduce((sum, m) => sum + (Number(m.saldoPiutang) || 0), 0);
    return { totalSimpanan, totalPinjaman, totalPiutang };
  }, [activeMembers]);

  // Filtered rankings for current year
  const topSavers = useMemo(() => {
    return [...limitData].sort((a, b) => b.totalSimpanan - a.totalSimpanan).slice(0, 5);
  }, [limitData]);

  const topBorrowers = useMemo(() => {
    return [...limitData].filter(m => m.saldoPiutang > 0).sort((a, b) => b.saldoPiutang - a.saldoPiutang).slice(0, 5);
  }, [limitData]);

  const topLimitMembers = useMemo(() => {
    return [...limitData].filter(m => m.sisaLimit > 0).sort((a, b) => b.sisaLimit - a.sisaLimit).slice(0, 5);
  }, [limitData]);

  const topSelisih = useMemo(() => {
    return [...limitData]
      .map(m => ({ ...m, selisih: m.totalSimpanan - m.saldoPiutang }))
      .sort((a, b) => b.selisih - a.selisih)
      .slice(0, 5);
  }, [limitData]);

  const rankIcons = [Trophy, Medal, Award, TrendingUpIcon, Coins];
  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600', 'text-primary', 'text-success'];

  const periodeLabel = `${selectedTahun}`;

  if (loading && rekapPerBulan.length === 0) {
    return <LoadingSkeleton />;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-background p-2 border rounded shadow">
          <p className="font-medium">{label}</p>
          <p>{`Selisih: ${value.toLocaleString('id-ID')}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!loading && rekapPerBulan.length === 0 && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data untuk periode {periodeLabel}. Silakan pilih periode lain.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat Cards with variations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Simpanan"
          value={stats.totalSimpanan.toLocaleString('id-ID')}
          subtitle={`Akhir ${periodeLabel}`}
          icon={PiggyBank}
          variant="default"
        />
        <StatCard
          title="Pinjaman Baru"
          value={stats.totalPinjaman.toLocaleString('id-ID')}
          subtitle={`Terakhir di ${periodeLabel}`}
          icon={HandCoins}
          variant="warning"
        />
        <StatCard
          title="Saldo Piutang"
          value={stats.totalPiutang.toLocaleString('id-ID')}
          subtitle="Total hutang anggota"
          icon={CreditCard}
          variant="info"
        />
        <StatCard
          title="Anggota Aktif"
          value={activeMembers.length.toLocaleString('id-ID')}
          subtitle={periodeLabel}
          icon={Users}
          variant="success"
          isNumber
        />
      </div>

      {/* New Selisih Chart - Moved to top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Selisih Simpanan dengan Hutang
          </CardTitle>
          <CardDescription>Per anggota, diurutkan dari tertinggi ke terendah</CardDescription>
        </CardHeader>
        <CardContent>
          {selisihData.length > 0 ? (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={selisihData} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} className="text-xs" height={80} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="selisih" name="Selisih Simpanan dengan Hutang">
                  {selisihData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.selisih > 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Belum ada data selisih</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Tren Keuangan {selectedTahun}
            </CardTitle>
            <CardDescription>Perkembangan bulanan</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} className="text-xs" />
                  <Tooltip formatter={(value: number) => value.toLocaleString('id-ID')} />
                  <Legend />
                  <Area type="monotone" dataKey="simpanan" name="Simpanan" fill="hsl(var(--accent))" stroke="hsl(var(--accent))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="piutang" name="Piutang" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Belum ada data trend untuk tahun {selectedTahun}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Komposisi Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Komposisi Simpanan
            </CardTitle>
            <CardDescription>Distribusi jenis simpanan sepanjang tahun</CardDescription>
          </CardHeader>
          <CardContent>
            {komposisiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={komposisiData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {komposisiData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString('id-ID')} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>Belum ada data komposisi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rankings Tahun Berjalan */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Ranking Anggota - {periodeLabel}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankingCard
            title="Top Penabung"
            description="Anggota dengan simpanan tertinggi"
            icon={PiggyBank}
            data={topSavers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="totalSimpanan"
            formatValue={(v) => v.toLocaleString('id-ID')}
            valueColor="text-accent"
          />
          <RankingCard
            title="Top Selisih (Simpanan - Piutang)"
            description="Anggota dengan kesehatan keuangan terbaik"
            icon={TrendingUpIcon}
            data={topSelisih}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="selisih"
            formatValue={(v) => `${v >= 0 ? '+' : ''}${v.toLocaleString('id-ID')}`}
            valueColor={(v: number) => v >= 0 ? 'text-success' : 'text-destructive'}
          />
          <RankingCard
            title="Top Peminjam"
            description="Anggota dengan piutang tertinggi"
            icon={HandCoins}
            data={topBorrowers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="saldoPiutang"
            formatValue={(v) => v.toLocaleString('id-ID')}
            valueColor="text-warning"
          />
          <RankingCard
            title="Sisa Limit Tersedia"
            description="Anggota dengan limit pinjaman tertinggi"
            icon={CreditCard}
            data={topLimitMembers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="sisaLimit"
            formatValue={(v) => v.toLocaleString('id-ID')}
            valueColor="text-primary"
          />
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'info' | 'danger' | 'success' | 'secondary';
  isNumber?: boolean;
}

function StatCard({ title, value, subtitle, icon: Icon, variant = 'default', isNumber }: StatCardProps) {
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
            <p className={`text-2xl font-bold ${isNumber ? '' : ''}`}>{value}</p>
            {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-current/10`}>
            <Icon className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Ranking Card Component
interface RankingCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  data: any[];
  rankIcons: React.ElementType[];
  rankColors: string[];
  valueKey: string;
  formatValue: (value: number) => string;
  valueColor: string | ((value: number) => string);
}

const RankingCard = ({
  title,
  description,
  icon: Icon,
  data,
  rankIcons,
  rankColors,
  valueKey,
  formatValue,
  valueColor
}: RankingCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <Icon className="h-5 w-5" />
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-6 w-6 mb-2" />
            <p className="text-sm">Belum ada data</p>
          </div>
        ) : (
          data.map((item, index) => {
            const RankIcon = rankIcons[index] || Award;
            const rankColor = rankColors[index] || 'text-muted-foreground';
            const value = item[valueKey] || 0;
            const colorClass = typeof valueColor === 'function' ? valueColor(value) : valueColor;
            return (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {index < 3 ? (
                      <RankIcon className={`h-5 w-5 ${rankColor}`} />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.nama}</p>
                    <p className="text-xs text-muted-foreground">{item.kodeAnggota || item.anggotaId}</p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${colorClass}`}>
                  {formatValue(value)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </CardContent>
  </Card>
);

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
);

export default DashboardSikostik28;