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
const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--secondary))'];
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
  const [limitData, setLimitData] = useState<LimitAnggota[]>([]); // Current
  const [pastLimitData, setPastLimitData] = useState<LimitAnggota[]>([]); // Past year end
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
      // Fetch limit data for current and past
      const currentLimit = await fetchLimitAnggota(currentPeriod.bulan, currentPeriod.tahun);
      const pastLimit = await fetchLimitAnggota(12, currentPeriod.tahun - 1);
      setLimitData(currentLimit);
      setPastLimitData(pastLimit);
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
      // Calculate selisih data for bar chart from current limit
      const selisihArr = currentLimit
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
  // Current rankings
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
  // Past rankings
  const pastTopSavers = useMemo(() => {
    return [...pastLimitData].sort((a, b) => b.totalSimpanan - a.totalSimpanan).slice(0, 5);
  }, [pastLimitData]);
  const pastTopBorrowers = useMemo(() => {
    return [...pastLimitData].filter(m => m.saldoPiutang > 0).sort((a, b) => b.saldoPiutang - a.saldoPiutang).slice(0, 5);
  }, [pastLimitData]);
  const pastTopLimitMembers = useMemo(() => {
    return [...pastLimitData].filter(m => m.sisaLimit > 0).sort((a, b) => b.sisaLimit - a.sisaLimit).slice(0, 5);
  }, [pastLimitData]);
  const pastTopSelisih = useMemo(() => {
    return [...pastLimitData]
      .map(m => ({ ...m, selisih: m.totalSimpanan - m.saldoPiutang }))
      .sort((a, b) => b.selisih - a.selisih)
      .slice(0, 5);
  }, [pastLimitData]);
  const rankIcons = [Trophy, Medal, Award, TrendingUpIcon, Coins];
  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600', 'text-primary', 'text-success'];
  const periodeLabel = `${selectedTahun}`;
  if (loading && rekapPerBulan.length === 0) {
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
      {!loading && rekapPerBulan.length === 0 && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data untuk periode {periodeLabel}. Silakan pilih periode lain.
          </AlertDescription>
        </Alert>
      )}
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Simpanan"
          value={stats.totalSimpanan}
          icon={PiggyBank}
          description={`Akhir ${periodeLabel}`}
          iconClassName="text-accent"
        />
        <StatCard
          title="Pinjaman Baru"
          value={stats.totalPinjaman}
          icon={HandCoins}
          description={`Terakhir di ${periodeLabel}`}
          iconClassName="text-warning"
        />
        <StatCard
          title="Saldo Piutang"
          value={stats.totalPiutang}
          icon={CreditCard}
          description="Total hutang anggota"
          iconClassName="text-primary"
        />
        <StatCard
          title="Anggota Aktif"
          value={activeMembers.length}
          icon={Users}
          description={periodeLabel}
          iconClassName="text-success"
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
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="selisih" name="Selisih Simpanan dengan Hutang">
                  {selisihData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.selisih > 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
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
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
        <h3 className="text-lg font-semibold mb-4">Ranking Anggota - Bulan Berjalan Tahun Berjalan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankingCard
            title="Top Penabung"
            description="Anggota dengan simpanan tertinggi"
            icon={PiggyBank}
            data={topSavers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="totalSimpanan"
            formatValue={(v) => formatCurrency(v)}
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
            formatValue={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
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
            formatValue={(v) => formatCurrency(v)}
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
            formatValue={(v) => formatCurrency(v)}
            valueColor="text-primary"
          />
        </div>
      </div>
      {/* Rankings Tahun Berlalu */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Ranking Anggota - Bulan Terakhir Tahun Berlalu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RankingCard
            title="Top Penabung"
            description="Anggota dengan simpanan tertinggi"
            icon={PiggyBank}
            data={pastTopSavers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="totalSimpanan"
            formatValue={(v) => formatCurrency(v)}
            valueColor="text-accent"
          />
          <RankingCard
            title="Top Selisih (Simpanan - Piutang)"
            description="Anggota dengan kesehatan keuangan terbaik"
            icon={TrendingUpIcon}
            data={pastTopSelisih}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="selisih"
            formatValue={(v) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`}
            valueColor={(v: number) => v >= 0 ? 'text-success' : 'text-destructive'}
          />
          <RankingCard
            title="Top Peminjam"
            description="Anggota dengan piutang tertinggi"
            icon={HandCoins}
            data={pastTopBorrowers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="saldoPiutang"
            formatValue={(v) => formatCurrency(v)}
            valueColor="text-warning"
          />
          <RankingCard
            title="Sisa Limit Tersedia"
            description="Anggota dengan limit pinjaman tertinggi"
            icon={CreditCard}
            data={pastTopLimitMembers}
            rankIcons={rankIcons}
            rankColors={rankColors}
            valueKey="sisaLimit"
            formatValue={(v) => formatCurrency(v)}
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
  value: number;
  icon: React.ElementType;
  description: string;
  iconClassName: string;
  isNumber?: boolean;
}
const StatCard = ({ title, value, icon: Icon, description, iconClassName, isNumber }: StatCardProps) => (
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
        <div className={`p-2 rounded-lg bg-muted ${iconClassName}`}>
          <Icon className="h-5 w-5" />
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