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
import { TrendingUp, Users, Calendar, DollarSign, Award, Activity, BarChart3, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface DashboardStats {
  totalKegiatan: number;
  totalRealisasi: number;
  bulanPeak: string;
  bulanSlow: string;
  rataRataPerKegiatan: number;
}

// Custom Tooltip untuk currency
const CurrencyTooltip = ({ active, payload, label, mode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-sm">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {mode === 'anggaran' 
              ? new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(entry.value)
              : entry.value.toLocaleString('id-ID')
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Komponen Chart yang aman
const SafeBarChart = ({ data, title, mode }: { data: ChartItem[], title: string, mode: string }) => {
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
        <Tooltip content={<CurrencyTooltip mode={mode} />} />
        <Legend />
        <Bar 
          dataKey="value" 
          name={mode === 'anggaran' ? 'Total Anggaran' : 'Jumlah Kegiatan'}
          fill={mode === 'anggaran' ? '#00C49F' : '#0088FE'} 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const SafePieChart = ({ data, title, mode }: { data: ChartItem[], title: string, mode: string }) => {
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
        <Tooltip content={<CurrencyTooltip mode={mode} />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<'kegiatan' | 'anggaran'>('kegiatan');
  const [stats, setStats] = useState<DashboardStats>({
    totalKegiatan: 0,
    totalRealisasi: 0,
    bulanPeak: "-",
    bulanSlow: "-",
    rataRataPerKegiatan: 0
  });
  
  const [chartData, setChartData] = useState<{
    kegiatan: {
      petugas: ChartItem[];
      bulan: ChartItem[];
      jenisPekerjaan: ChartItem[];
      role: ChartItem[];
    };
    anggaran: {
      petugas: ChartItem[];
      bulan: ChartItem[];
      jenisPekerjaan: ChartItem[];
      role: ChartItem[];
    };
  }>({
    kegiatan: {
      petugas: [],
      bulan: [],
      jenisPekerjaan: [],
      role: []
    },
    anggaran: {
      petugas: [],
      bulan: [],
      jenisPekerjaan: [],
      role: []
    }
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

      // Maps untuk data kegiatan (berdasarkan jumlah)
      const petugasKegiatanMap = new Map<string, number>();
      const bulanKegiatanMap = new Map<string, number>();
      const jenisPekerjaanKegiatanMap = new Map<string, number>();
      const roleKegiatanMap = new Map<string, number>();

      // Maps untuk data anggaran (berdasarkan uang)
      const petugasAnggaranMap = new Map<string, number>();
      const bulanAnggaranMap = new Map<string, number>();
      const jenisPekerjaanAnggaranMap = new Map<string, number>();
      const roleAnggaranMap = new Map<string, number>();

      let totalKegiatan = 0;
      let totalRealisasi = 0;
      const bulanKegiatanCount = new Map<string, number>();

      filteredData.forEach((row: any[]) => {
        try {
          const periode = row[2]?.toString() || "";
          const role = row[1]?.toString() || "";
          const jenisPekerjaan = row[3]?.toString() || "";
          const namaPetugas = row[14]?.toString() || "";
          const nilaiRealisasi = row[17]?.toString() || "";

          // Extract bulan dari periode
          const bulan = periode.split(' ')[0];
          
          // Parse petugas dan nilai realisasi
          const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
          const nilaiList = nilaiRealisasi.split(' | ').map(parseNilai);

          // Process untuk mode KEGIATAN (berdasarkan jumlah)
          namaList.forEach(nama => {
            petugasKegiatanMap.set(nama, (petugasKegiatanMap.get(nama) || 0) + 1);
          });

          if (bulan && bulanList.includes(bulan)) {
            bulanKegiatanMap.set(bulan, (bulanKegiatanMap.get(bulan) || 0) + 1);
            bulanKegiatanCount.set(bulan, (bulanKegiatanCount.get(bulan) || 0) + 1);
          }

          if (jenisPekerjaan) {
            jenisPekerjaanKegiatanMap.set(jenisPekerjaan, (jenisPekerjaanKegiatanMap.get(jenisPekerjaan) || 0) + 1);
          }

          if (role) {
            roleKegiatanMap.set(role, (roleKegiatanMap.get(role) || 0) + 1);
          }

          // Process untuk mode ANGGARAN (berdasarkan uang)
          namaList.forEach((nama, index) => {
            const nilai = nilaiList[index] || 0;
            petugasAnggaranMap.set(nama, (petugasAnggaranMap.get(nama) || 0) + nilai);
          });

          if (bulan && bulanList.includes(bulan)) {
            const totalNilaiBulan = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            bulanAnggaranMap.set(bulan, (bulanAnggaranMap.get(bulan) || 0) + totalNilaiBulan);
          }

          if (jenisPekerjaan) {
            const totalNilaiJenis = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            jenisPekerjaanAnggaranMap.set(jenisPekerjaan, (jenisPekerjaanAnggaranMap.get(jenisPekerjaan) || 0) + totalNilaiJenis);
          }

          if (role) {
            const totalNilaiRole = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            roleAnggaranMap.set(role, (roleAnggaranMap.get(role) || 0) + totalNilaiRole);
          }

          totalKegiatan++;
          totalRealisasi += nilaiList.reduce((sum, nilai) => sum + nilai, 0);

        } catch (error) {
          console.error("Error processing row:", error);
        }
      });

      // Prepare chart data untuk KEGIATAN
      const petugasKegiatanData: ChartItem[] = Array.from(petugasKegiatanMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const bulanKegiatanData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: bulanKegiatanMap.get(bulan) || 0
      }));

      const jenisPekerjaanKegiatanData: ChartItem[] = Array.from(jenisPekerjaanKegiatanMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const roleKegiatanData: ChartItem[] = Array.from(roleKegiatanMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Prepare chart data untuk ANGGARAN
      const petugasAnggaranData: ChartItem[] = Array.from(petugasAnggaranMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const bulanAnggaranData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: bulanAnggaranMap.get(bulan) || 0
      }));

      const jenisPekerjaanAnggaranData: ChartItem[] = Array.from(jenisPekerjaanAnggaranMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const roleAnggaranData: ChartItem[] = Array.from(roleAnggaranMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Find peak and slow months (berdasarkan jumlah kegiatan)
      const bulanWithData = bulanKegiatanData.filter(item => item.value > 0);
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
        bulanSlow,
        rataRataPerKegiatan: totalKegiatan > 0 ? Math.round(totalRealisasi / totalKegiatan) : 0
      });

      setChartData({
        kegiatan: {
          petugas: petugasKegiatanData,
          bulan: bulanKegiatanData,
          jenisPekerjaan: jenisPekerjaanKegiatanData,
          role: roleKegiatanData
        },
        anggaran: {
          petugas: petugasAnggaranData,
          bulan: bulanAnggaranData,
          jenisPekerjaan: jenisPekerjaanAnggaranData,
          role: roleAnggaranData
        }
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

  const currentData = chartData[viewMode];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitoring dan visualisasi data kegiatan mitra statistik
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Toggle View Mode */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'kegiatan' | 'anggaran')}>
            <TabsList>
              <TabsTrigger value="kegiatan" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Berdasarkan Kegiatan
              </TabsTrigger>
              <TabsTrigger value="anggaran" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Berdasarkan Anggaran
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Tahun Filter */}
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
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'kegiatan' ? 'Total Kegiatan' : 'Total Anggaran'}
            </CardTitle>
            {viewMode === 'kegiatan' ? (
              <Activity className="h-4 w-4 text-muted-foreground" />
            ) : (
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {viewMode === 'kegiatan' 
                ? stats.totalKegiatan.toLocaleString('id-ID')
                : formatRupiah(stats.totalRealisasi)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Tahun {filterTahun}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'kegiatan' ? 'Rata-rata per Kegiatan' : 'Total Kegiatan'}
            </CardTitle>
            {viewMode === 'kegiatan' ? (
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Activity className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {viewMode === 'kegiatan' 
                ? formatRupiah(stats.rataRataPerKegiatan)
                : stats.totalKegiatan.toLocaleString('id-ID')
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'kegiatan' ? 'Nilai rata-rata' : 'Jumlah total'}
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
              {viewMode === 'kegiatan' ? 'Kegiatan tertinggi' : 'Anggaran tertinggi'}
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
              {viewMode === 'kegiatan' ? 'Kegiatan terendah' : 'Anggaran terendah'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Petugas */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Top Petugas Berdasarkan Kegiatan' 
                : 'Top Petugas Berdasarkan Anggaran'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart 
              data={currentData.petugas} 
              title={viewMode === 'kegiatan' ? 'Jumlah Kegiatan' : 'Total Anggaran'}
              mode={viewMode}
            />
          </CardContent>
        </Card>

        {/* Grafik Bulan */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Distribusi Kegiatan per Bulan' 
                : 'Distribusi Anggaran per Bulan'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart 
              data={currentData.bulan} 
              title={viewMode === 'kegiatan' ? 'Jumlah Kegiatan' : 'Total Anggaran'}
              mode={viewMode}
            />
          </CardContent>
        </Card>

        {/* Grafik Jenis Pekerjaan */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Kegiatan per Jenis Pekerjaan' 
                : 'Anggaran per Jenis Pekerjaan'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart 
              data={currentData.jenisPekerjaan} 
              title={viewMode === 'kegiatan' ? 'Jenis Pekerjaan' : 'Anggaran per Jenis'}
              mode={viewMode}
            />
          </CardContent>
        </Card>

        {/* Grafik Role */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Distribusi per Role' 
                : 'Anggaran per Role'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart 
              data={currentData.role} 
              title={viewMode === 'kegiatan' ? 'Role' : 'Anggaran per Role'}
              mode={viewMode}
            />
          </CardContent>
        </Card>
      </div>

      {/* Analisis Deskriptif */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Analisis Deskriptif - {viewMode === 'kegiatan' ? 'Berdasarkan Kegiatan' : 'Berdasarkan Anggaran'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">📊 Analisis Musiman</h3>
              <p>
                <strong>Bulan Puncak:</strong> {stats.bulanPeak} - 
                {viewMode === 'kegiatan' 
                  ? ' periode dengan jumlah kegiatan tertinggi.' 
                  : ' periode dengan alokasi anggaran tertinggi.'
                }
              </p>
              <p>
                <strong>Bulan Slow:</strong> {stats.bulanSlow} - 
                {viewMode === 'kegiatan' 
                  ? ' periode dengan jumlah kegiatan terendah.' 
                  : ' periode dengan alokasi anggaran terendah.'
                }
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">📈 Statistik Utama</h3>
              <p>
                <strong>Total {viewMode === 'kegiatan' ? 'Kegiatan' : 'Anggaran'}:</strong>{' '}
                {viewMode === 'kegiatan' 
                  ? stats.totalKegiatan.toLocaleString('id-ID') 
                  : formatRupiah(stats.totalRealisasi)
                }
              </p>
              <p>
                <strong>{viewMode === 'kegiatan' ? 'Rata-rata Nilai per Kegiatan' : 'Total Kegiatan'}:</strong>{' '}
                {viewMode === 'kegiatan' 
                  ? formatRupiah(stats.rataRataPerKegiatan)
                  : stats.totalKegiatan.toLocaleString('id-ID')
                }
              </p>
              <p><strong>Tahun Analisis:</strong> {filterTahun}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">💡 Rekomendasi Strategis</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {viewMode === 'kegiatan' ? (
                <>
                  <li>Alokasikan resource lebih banyak pada bulan {stats.bulanPeak}</li>
                  <li>Manfaatkan bulan {stats.bulanSlow} untuk training dan evaluasi</li>
                  <li>Optimalkan distribusi petugas berdasarkan beban kerja</li>
                </>
              ) : (
                <>
                  <li>Optimalkan alokasi anggaran pada bulan {stats.bulanPeak}</li>
                  <li>Evaluasi efisiensi anggaran pada bulan {stats.bulanSlow}</li>
                  <li>Monitor ROI (Return on Investment) per jenis pekerjaan</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}