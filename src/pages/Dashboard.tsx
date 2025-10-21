import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Award, Activity, BarChart3 } from "lucide-react";

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";

const bulanList = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const tahunList = Array.from({ length: 9 }, (_, i) => (2022 + i).toString());

// Warna untuk charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Simple interface untuk data
interface ChartItem {
  name: string;
  value: number;
}

interface SimpleChartData {
  data: ChartItem[];
}

interface DashboardStats {
  totalKegiatan: number;
  totalRealisasi: number;
  bulanPeak: string;
  bulanSlow: string;
}

// Komponen Chart yang aman
const SafeBarChart = ({ data, title, dataKey = "value" }: { data: ChartItem[], title: string, dataKey?: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          fontSize={12}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar 
          dataKey={dataKey} 
          name={title}
          fill="#0088FE" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const SafePieChart = ({ data, title }: { data: ChartItem[], title: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

const SafeLineChart = ({ data, title }: { data: ChartItem[], title: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          name={title}
          stroke="#8884d8" 
          strokeWidth={2} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [stats, setStats] = useState<DashboardStats>({
    totalKegiatan: 0,
    totalRealisasi: 0,
    bulanPeak: "-",
    bulanSlow: "-"
  });
  const [chartData, setChartData] = useState<{
    petugas: ChartItem[];
    bulan: ChartItem[];
    jenisPekerjaan: ChartItem[];
    role: ChartItem[];
  }>({
    petugas: [],
    bulan: [],
    jenisPekerjaan: [],
    role: []
  });
  
  const { toast } = useToast();

  // Format currency helper
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Parse nilai realisasi
  const parseNilai = (nilaiStr: string): number => {
    if (!nilaiStr) return 0;
    const cleaned = nilaiStr.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data: tugasResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1",
        },
      });

      if (error) throw error;

      const rows = tugasResponse?.values || [];
      console.log("Total rows fetched:", rows.length);

      // Process data
      const allData = rows.slice(1) || [];
      
      // Filter data berdasarkan tahun
      const filteredData = allData.filter((row: any[]) => {
        const periode = row[2]?.toString() || "";
        return periode.includes(filterTahun);
      });

      console.log(`Data for year ${filterTahun}:`, filteredData.length);

      // Simple analytics
      const petugasMap = new Map<string, number>();
      const bulanMap = new Map<string, number>();
      const jenisPekerjaanMap = new Map<string, number>();
      const roleMap = new Map<string, number>();

      let totalKegiatan = 0;
      let totalRealisasi = 0;

      filteredData.forEach((row: any[]) => {
        try {
          const periode = row[2]?.toString() || "";
          const role = row[1]?.toString() || "";
          const jenisPekerjaan = row[3]?.toString() || "";
          const namaPetugas = row[14]?.toString() || "";
          const nilaiRealisasi = row[17]?.toString() || "";

          // Extract bulan dari periode
          const bulan = periode.split(' ')[0];
          
          // Parse petugas
          const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
          const nilaiList = nilaiRealisasi.split(' | ').map(parseNilai);

          // Count data
          namaList.forEach(nama => {
            petugasMap.set(nama, (petugasMap.get(nama) || 0) + 1);
          });

          if (bulan && bulanList.includes(bulan)) {
            bulanMap.set(bulan, (bulanMap.get(bulan) || 0) + 1);
          }

          if (jenisPekerjaan) {
            jenisPekerjaanMap.set(jenisPekerjaan, (jenisPekerjaanMap.get(jenisPekerjaan) || 0) + 1);
          }

          if (role) {
            roleMap.set(role, (roleMap.get(role) || 0) + 1);
          }

          totalKegiatan++;
          totalRealisasi += nilaiList.reduce((sum, nilai) => sum + nilai, 0);

        } catch (error) {
          console.error("Error processing row:", error);
        }
      });

      // Prepare chart data
      const petugasData: ChartItem[] = Array.from(petugasMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const bulanData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: bulanMap.get(bulan) || 0
      }));

      const jenisPekerjaanData: ChartItem[] = Array.from(jenisPekerjaanMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const roleData: ChartItem[] = Array.from(roleMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Find peak and slow months
      const bulanWithData = bulanData.filter(item => item.value > 0);
      const bulanPeak = bulanWithData.length > 0 
        ? bulanWithData.reduce((max, current) => current.value > max.value ? current : max).name
        : "-";
      
      const bulanSlow = bulanWithData.length > 0
        ? bulanWithData.reduce((min, current) => current.value < min.value ? current : min).name
        : "-";

      setStats({
        totalKegiatan,
        totalRealisasi,
        bulanPeak,
        bulanSlow
      });

      setChartData({
        petugas: petugasData,
        bulan: bulanData,
        jenisPekerjaan: jenisPekerjaanData,
        role: roleData
      });

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterTahun]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitoring dan visualisasi data kegiatan mitra statistik
          </p>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <CardTitle>Dashboard Monitoring</CardTitle>
            </div>
            <CardDescription>
              Memuat data...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Sedang memuat data dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitoring dan visualisasi data kegiatan mitra statistik
          </p>
        </div>
        <Select value={filterTahun} onValueChange={setFilterTahun}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Pilih Tahun" />
          </SelectTrigger>
          <SelectContent>
            {tahunList.map(tahun => (
              <SelectItem key={tahun} value={tahun}>
                {tahun}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kegiatan</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKegiatan}</div>
            <p className="text-xs text-muted-foreground">
              Tahun {filterTahun}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realisasi</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(stats.totalRealisasi)}</div>
            <p className="text-xs text-muted-foreground">
              Total nilai realisasi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulan Puncak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bulanPeak}</div>
            <p className="text-xs text-muted-foreground">
              Aktivitas tertinggi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bulan Slow</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bulanSlow}</div>
            <p className="text-xs text-muted-foreground">
              Aktivitas terendah
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Petugas */}
        <Card>
          <CardHeader>
            <CardTitle>Top Petugas Berdasarkan Kegiatan</CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart 
              data={chartData.petugas} 
              title="Jumlah Kegiatan"
              dataKey="value"
            />
          </CardContent>
        </Card>

        {/* Grafik Bulan */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Kegiatan per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart 
              data={chartData.bulan} 
              title="Jumlah Kegiatan"
              dataKey="value"
            />
          </CardContent>
        </Card>

        {/* Grafik Jenis Pekerjaan */}
        <Card>
          <CardHeader>
            <CardTitle>Kegiatan per Jenis Pekerjaan</CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart 
              data={chartData.jenisPekerjaan} 
              title="Jenis Pekerjaan"
            />
          </CardContent>
        </Card>

        {/* Grafik Role */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi per Role</CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart 
              data={chartData.role} 
              title="Role"
            />
          </CardContent>
        </Card>
      </div>

      {/* Analisis Deskriptif */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Analisis Deskriptif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">📊 Analisis Musiman</h3>
              <p>
                <strong>Bulan Puncak:</strong> {stats.bulanPeak} - 
                periode dengan aktivitas tertinggi.
              </p>
              <p>
                <strong>Bulan Slow:</strong> {stats.bulanSlow} - 
                periode dengan aktivitas terendah.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">📈 Statistik Kegiatan</h3>
              <p><strong>Total Kegiatan:</strong> {stats.totalKegiatan}</p>
              <p><strong>Total Realisasi:</strong> {formatRupiah(stats.totalRealisasi)}</p>
              <p><strong>Tahun Analisis:</strong> {filterTahun}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}