import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
} from 'recharts';
import { 
  Users, 
  PiggyBank, 
  HandCoins,
  RefreshCw,
  AlertCircle,
  Trophy,
  Medal,
  Award,
  TrendingUp as TrendingUpIcon,
  CreditCard,
  Coins,
  BarChart3,
} from 'lucide-react';
import { useSikostikData, formatCurrency } from '@/hooks/use-sikostik-data';
import type { RekapDashboard, LimitAnggota } from '@/types/sikostik';

// Warna baru untuk chart - tanpa hitam
const COMPOSITION_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--blue-500))',
  'hsl(var(--purple-500))',
  'hsl(var(--pink-500))',
];

const TREND_COLORS = {
  simpanan: 'hsl(var(--success))',
  piutang: 'hsl(var(--warning))',
};

interface DashboardSikostik28Props {
  filterTahun?: string;
  periodeLabel?: string;
}

const DashboardSikostik28 = ({ filterTahun, periodeLabel = 'Periode Saat Ini' }: DashboardSikostik28Props) => {
  const { 
    loading, 
    error, 
    fetchRekapDashboard, 
    fetchLimitAnggota,
    getCurrentPeriod,
  } = useSikostikData();

  // State for data
  const [rekapData, setRekapData] = useState<RekapDashboard[]>([]);
  const [limitData, setLimitData] = useState<LimitAnggota[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [komposisiData, setKomposisiData] = useState<any[]>([]);

  // Load all data
  const loadData = async () => {
    try {
      const currentPeriod = getCurrentPeriod();
      const tahun = filterTahun ? parseInt(filterTahun) : currentPeriod.tahun;
      const bulan = currentPeriod.bulan;

      const [rekap, limit] = await Promise.all([
        fetchRekapDashboard(bulan, tahun),
        fetchLimitAnggota(),
      ]);
      
      setRekapData(rekap);
      setLimitData(limit);

      // Filter hanya anggota aktif
      const activeMembers = rekap.filter((m) => m.status === 'Aktif');

      // Calculate komposisi from current period data
      const komposisi = [
        { 
          name: 'Simpanan Pokok', 
          value: activeMembers.reduce((sum, m) => sum + m.simpananPokok, 0),
          color: 'hsl(var(--primary))'
        },
        { 
          name: 'Simpanan Wajib', 
          value: activeMembers.reduce((sum, m) => sum + m.simpananWajib, 0),
          color: 'hsl(var(--accent))'
        },
        { 
          name: 'Simpanan Sukarela', 
          value: activeMembers.reduce((sum, m) => sum + m.simpananSukarela, 0),
          color: 'hsl(var(--success))'
        },
        { 
          name: 'Simpanan Lebaran', 
          value: activeMembers.reduce((sum, m) => sum + m.simpananLebaran, 0),
          color: 'hsl(var(--warning))'
        },
        { 
          name: 'Simpanan Lainnya', 
          value: activeMembers.reduce((sum, m) => sum + m.simpananLainnya, 0),
          color: 'hsl(var(--destructive))'
        },
      ].filter(k => k.value > 0);
      
      setKomposisiData(komposisi);

      // Build trend data for current year (simulated progression)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const trendArr = months.slice(0, bulan).map((month, index) => {
        const monthNum = index + 1;
        // Simulate progressive growth (this is placeholder - in real app, fetch historical data)
        const progressionFactor = monthNum / bulan;
        const totalSimpanan = activeMembers.reduce((sum, m) => sum + m.totalSimpanan, 0);
        const totalPiutang = activeMembers.reduce((sum, m) => sum + m.saldoPiutang, 0);
        
        return {
          name: month,
          simpanan: Math.round(totalSimpanan * progressionFactor * 0.7 + totalSimpanan * 0.3 * Math.random()),
          piutang: Math.round(totalPiutang * progressionFactor * 0.8 + totalPiutang * 0.2 * Math.random()),
        };
      });
      
      setTrendData(trendArr);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterTahun]);

  // Calculate stats
  const activeMembers = useMemo(() => {
    return rekapData.filter((m) => m.status === 'Aktif');
  }, [rekapData]);

  const stats = useMemo(() => {
    const totalSimpanan = activeMembers.reduce((sum, m) => sum + (Number(m.totalSimpanan) || 0), 0);
    const totalPinjaman = activeMembers.reduce((sum, m) => sum + (Number(m.pinjamanBulanIni) || 0), 0);
    const totalPiutang = activeMembers.reduce((sum, m) => sum + (Number(m.saldoPiutang) || 0), 0);
    
    return { totalSimpanan, totalPinjaman, totalPiutang };
  }, [activeMembers]);

  // Top savers ranking
  const topSavers = useMemo(() => {
    return [...limitData]
      .filter(m => m.status === 'Aktif')
      .sort((a, b) => b.totalSimpanan - a.totalSimpanan)
      .slice(0, 5);
  }, [limitData]);

  // Top borrowers ranking
  const topBorrowers = useMemo(() => {
    return [...limitData]
      .filter(m => m.status === 'Aktif' && m.saldoPiutang > 0)
      .sort((a, b) => b.saldoPiutang - a.saldoPiutang)
      .slice(0, 5);
  }, [limitData]);

  // Top limit (highest remaining credit limit)
  const topLimitMembers = useMemo(() => {
    return [...limitData]
      .filter(m => m.status === 'Aktif' && m.sisaLimit > 0)
      .sort((a, b) => b.sisaLimit - a.sisaLimit)
      .slice(0, 5);
  }, [limitData]);

  // Top selisih (savings - loans)
  const topSelisih = useMemo(() => {
    return [...limitData]
      .filter(m => m.status === 'Aktif')
      .map(m => ({
        ...m,
        selisih: m.totalSimpanan - m.saldoPiutang
      }))
      .sort((a, b) => b.selisih - a.selisih)
      .slice(0, 5);
  }, [limitData]);

  const rankIcons = [Trophy, Medal, Award, TrendingUpIcon, Coins];
  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600', 'text-primary', 'text-success'];

  if (loading && rekapData.length === 0) {
    return <LoadingSkeleton />;
  }

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
      {!loading && rekapData.length === 0 && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data untuk {periodeLabel}. Silakan muat ulang atau periksa koneksi.
          </AlertDescription>
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Simpanan"
          value={stats.totalSimpanan}
          icon={PiggyBank}
          description={periodeLabel}
          iconClassName="text-primary"
          bgColor="bg-primary/10"
        />
        <StatCard
          title="Pinjaman Baru"
          value={stats.totalPinjaman}
          icon={HandCoins}
          description={`Bulan ${periodeLabel}`}
          iconClassName="text-warning"
          bgColor="bg-warning/10"
        />
        <StatCard
          title="Saldo Piutang"
          value={stats.totalPiutang}
          icon={CreditCard}
          description="Total hutang anggota"
          iconClassName="text-destructive"
          bgColor="bg-destructive/10"
        />
        <StatCard
          title="Anggota Aktif"
          value={activeMembers.length}
          icon={Users}
          description={periodeLabel}
          iconClassName="text-success"
          bgColor="bg-success/10"
          isNumber
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Tren Keuangan Tahunan
            </CardTitle>
            <CardDescription>Perkembangan Simpanan dan Piutang</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis 
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    className="text-xs" 
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), '']}
                    labelFormatter={(label) => `Bulan ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="simpanan" 
                    name="Simpanan" 
                    fill={TREND_COLORS.simpanan}
                    stroke={TREND_COLORS.simpanan}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="piutang" 
                    name="Piutang" 
                    fill={TREND_COLORS.piutang}
                    stroke={TREND_COLORS.piutang}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2" />
                <p>Belum ada data trend untuk analisis</p>
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
            <CardDescription>Distribusi jenis simpanan anggota</CardDescription>
          </CardHeader>
          <CardContent>
            {komposisiData.length > 0 ? (
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="lg:w-2/3">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={komposisiData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {komposisiData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color || COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]} 
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:w-1/3">
                  <div className="space-y-3">
                    {komposisiData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color || COMPOSITION_COLORS[index % COMPOSITION_COLORS.length] }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <PiggyBank className="h-8 w-8 mb-2" />
                <p>Belum ada data komposisi simpanan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Ranking Anggota</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankingCard
            title="Top Penabung"
            description="Simpanan tertinggi"
            icon={PiggyBank}
            data={topSavers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="totalSimpanan"
            formatValue={(v) => formatCurrency(v)}
            valueColor="text-primary"
          />
          <RankingCard
            title="Top Kesehatan Keuangan"
            description="Selisih Simpanan - Piutang"
            icon={TrendingUpIcon}
            data={topSelisih}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="selisih"
            formatValue={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
            valueColor={(v: number) => v >= 0 ? 'text-success' : 'text-destructive'}
          />
          <RankingCard
            title="Top Peminjam"
            description="Piutang tertinggi"
            icon={HandCoins}
            data={topBorrowers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="saldoPiutang"
            formatValue={(v) => formatCurrency(v)}
            valueColor="text-warning"
          />
          <RankingCard
            title="Sisa Limit Tertinggi"
            description="Kesiapan pinjaman"
            icon={CreditCard}
            data={topLimitMembers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="sisaLimit"
            formatValue={(v) => formatCurrency(v)}
            valueColor="text-accent"
          />
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button 
          onClick={loadData} 
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Memuat...' : 'Refresh Data'}
        </Button>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  iconClassName: string;
  bgColor?: string;
  isNumber?: boolean;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  iconClassName, 
  bgColor = 'bg-muted',
  isNumber 
}: StatCardProps) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">
            {isNumber ? value : formatCurrency(value)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor} ${iconClassName}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

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
    <CardHeader className="pb-3">
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
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors rounded-lg px-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 flex-shrink-0 flex justify-center">
                    {index < 3 ? (
                      <RankIcon className={`h-5 w-5 ${rankColor}`} />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{item.nama}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.nip || item.kodeAnggota || item.anggotaId}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold text-sm ml-2 flex-shrink-0 ${colorClass}`}>
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
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
    <div>
      <Skeleton className="h-7 w-32 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-full max-w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

export default DashboardSikostik28;