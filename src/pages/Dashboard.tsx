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
import { TrendingUp, Users, Calendar, DollarSign, Award, Activity, BarChart3, SwitchCamera, Target, AlertTriangle, Table } from "lucide-react";
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

// Extended interface untuk data
interface ChartItem {
  name: string;
  value: number;
}

interface DashboardStats {
  totalKegiatan: number;
  totalRealisasi: number;
  bulanPeakKegiatan: { name: string; value: number };
  bulanSlowKegiatan: { name: string; value: number };
  bulanPeakAnggaran: { name: string; value: number };
  bulanSlowAnggaran: { name: string; value: number };
  rataRataKegiatanPerBulan: number;
  rataRataAnggaranPerBulan: number;
}

// Interface untuk data baru
interface WorkloadData {
  petugas: string;
  jumlahKegiatan: number;
  totalAnggaran: number;
  roles: string[];
}

interface RiskData {
  name: string;
  kegiatan: number;
  anggaran: number;
  riskLevel: 'Rendah' | 'Sedang' | 'Tinggi';
}

// Custom Tooltip untuk currency dengan format yang lebih baik
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

// Komponen Chart yang aman dengan format YAxis untuk anggaran
const SafeBarChart = ({ data, title, mode }: { data: ChartItem[], title: string, mode: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  // Format tick untuk YAxis jika mode anggaran
  const formatYAxisTick = (value: number) => {
    if (mode === 'anggaran') {
      if (value >= 1000000) {
        return `Rp${(value / 1000000).toFixed(0)}Jt`;
      } else if (value >= 1000) {
        return `Rp${(value / 1000).toFixed(0)}Rb`;
      }
      return `Rp${value}`;
    }
    return value.toLocaleString('id-ID');
  };

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
        <YAxis 
          tickFormatter={formatYAxisTick}
          fontSize={12}
        />
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

// Komponen untuk Line Chart Trend dengan format YAxis
const SafeLineChart = ({ data, title, mode }: { data: ChartItem[], title: string, mode: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  // Format tick untuk YAxis jika mode anggaran
  const formatYAxisTick = (value: number) => {
    if (mode === 'anggaran') {
      if (value >= 1000000) {
        return `Rp${(value / 1000000).toFixed(0)}Jt`;
      } else if (value >= 1000) {
        return `Rp${(value / 1000).toFixed(0)}Rb`;
      }
      return `Rp${value}`;
    }
    return value.toLocaleString('id-ID');
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          fontSize={12}
        />
        <YAxis 
          tickFormatter={formatYAxisTick}
          fontSize={12}
        />
        <Tooltip content={<CurrencyTooltip mode={mode} />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          name={mode === 'anggaran' ? 'Trend Anggaran' : 'Trend Kegiatan'}
          stroke={mode === 'anggaran' ? '#00C49F' : '#0088FE'} 
          strokeWidth={3}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Komponen Risk Matrix dengan kriteria baru
const RiskMatrix = ({ data, mode }: { data: RiskData[], mode: 'kegiatan' | 'anggaran' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Rendah': return 'bg-green-100 text-green-800 border-green-300';
      case 'Sedang': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Tinggi': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-3">
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Kriteria Risiko:</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Rendah: &lt; 3</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Sedang: 3 - 10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Tinggi: &gt; 10</span>
          </div>
        </div>
      </div>
      
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex-1">
            <h4 className="font-semibold">{item.name}</h4>
            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
              <span>{item.kegiatan} kegiatan</span>
              <span>Rp {item.anggaran.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskColor(item.riskLevel)}`}>
            {item.riskLevel}
          </span>
        </div>
      ))}
    </div>
  );
};

// Fungsi helper untuk menentukan bulan yang valid untuk dianggap "terendah"
const getValidBulanForSlow = (tahun: string, data: ChartItem[]): ChartItem[] => {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().getMonth();
  
  if (tahun === currentYear) {
    return data.filter(item => {
      const bulanIndex = bulanList.indexOf(item.name);
      return bulanIndex <= currentMonth;
    });
  }
  
  return data;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [viewMode, setViewMode] = useState<'kegiatan' | 'anggaran'>('kegiatan');
  const [stats, setStats] = useState<DashboardStats>({
    totalKegiatan: 0,
    totalRealisasi: 0,
    bulanPeakKegiatan: { name: "-", value: 0 },
    bulanSlowKegiatan: { name: "-", value: 0 },
    bulanPeakAnggaran: { name: "-", value: 0 },
    bulanSlowAnggaran: { name: "-", value: 0 },
    rataRataKegiatanPerBulan: 0,
    rataRataAnggaranPerBulan: 0
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

  // Data untuk grafik baru
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [riskData, setRiskData] = useState<RiskData[]>([]);

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

      // Maps untuk data kegiatan dan anggaran
      const petugasKegiatanMap = new Map<string, number>();
      const bulanKegiatanMap = new Map<string, number>();
      const jenisPekerjaanKegiatanMap = new Map<string, number>();
      const roleKegiatanMap = new Map<string, number>();

      const petugasAnggaranMap = new Map<string, number>();
      const bulanAnggaranMap = new Map<string, number>();
      const jenisPekerjaanAnggaranMap = new Map<string, number>();
      const roleAnggaranMap = new Map<string, number>();

      // Maps untuk data workload dan risk - DIPERBAIKI untuk multiple roles
      const petugasDetailMap = new Map<string, { 
        kegiatan: number, 
        anggaran: number, 
        roles: Set<string>
      }>();

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
          
          // Parse petugas dan nilai realisasi
          const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
          const nilaiList = nilaiRealisasi.split(' | ').map(parseNilai);

          // Process untuk mode KEGIATAN dan ANGGARAN
          namaList.forEach((nama, index) => {
            const nilai = nilaiList[index] || 0;
            
            // Kegiatan
            petugasKegiatanMap.set(nama, (petugasKegiatanMap.get(nama) || 0) + 1);
            
            // Anggaran
            petugasAnggaranMap.set(nama, (petugasAnggaranMap.get(nama) || 0) + nilai);

            // Workload data - DIPERBAIKI: Support multiple roles
            if (!petugasDetailMap.has(nama)) {
              petugasDetailMap.set(nama, { 
                kegiatan: 0, 
                anggaran: 0, 
                roles: new Set() 
              });
            }
            const detail = petugasDetailMap.get(nama)!;
            detail.kegiatan += 1;
            detail.anggaran += nilai;
            
            // Tambahkan role ke Set (otomatis menghindari duplikasi)
            if (role && role.trim() !== '') {
              detail.roles.add(role.trim());
            }
          });

          if (bulan && bulanList.includes(bulan)) {
            const totalNilaiBulan = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            bulanKegiatanMap.set(bulan, (bulanKegiatanMap.get(bulan) || 0) + 1);
            bulanAnggaranMap.set(bulan, (bulanAnggaranMap.get(bulan) || 0) + totalNilaiBulan);
          }

          if (jenisPekerjaan) {
            const totalNilaiJenis = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            jenisPekerjaanKegiatanMap.set(jenisPekerjaan, (jenisPekerjaanKegiatanMap.get(jenisPekerjaan) || 0) + 1);
            jenisPekerjaanAnggaranMap.set(jenisPekerjaan, (jenisPekerjaanAnggaranMap.get(jenisPekerjaan) || 0) + totalNilaiJenis);
          }

          if (role) {
            const totalNilaiRole = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            roleKegiatanMap.set(role, (roleKegiatanMap.get(role) || 0) + 1);
            roleAnggaranMap.set(role, (roleAnggaranMap.get(role) || 0) + totalNilaiRole);
          }

          totalKegiatan++;
          totalRealisasi += nilaiList.reduce((sum, nilai) => sum + nilai, 0);

        } catch (error) {
          console.error("Error processing row:", error);
        }
      });

      // Prepare chart data untuk KEGIATAN dan ANGGARAN
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

      // Prepare workload data - DIPERBAIKI: Convert Set to Array untuk roles dan ambil TOP 10
      const workloadDataArray: WorkloadData[] = Array.from(petugasDetailMap.entries())
        .map(([petugas, detail]) => ({
          petugas,
          jumlahKegiatan: detail.kegiatan,
          totalAnggaran: detail.anggaran,
          roles: Array.from(detail.roles)
        }))
        .sort((a, b) => b.jumlahKegiatan - a.jumlahKegiatan)
        .slice(0, 10); // AMBIL TOP 10 PETUGAS

      // Prepare risk data dengan kriteria baru: Rendah < 3, Sedang 3-10, Tinggi > 10
      const riskDataArray: RiskData[] = workloadDataArray.map(item => {
        let riskLevel: 'Rendah' | 'Sedang' | 'Tinggi';
        
        if (item.jumlahKegiatan < 3) {
          riskLevel = 'Rendah';
        } else if (item.jumlahKegiatan >= 3 && item.jumlahKegiatan <= 10) {
          riskLevel = 'Sedang';
        } else {
          riskLevel = 'Tinggi';
        }

        return {
          name: item.petugas,
          kegiatan: item.jumlahKegiatan,
          anggaran: item.totalAnggaran,
          riskLevel: riskLevel
        };
      }).sort((a, b) => {
        const riskOrder = { 'Tinggi': 3, 'Sedang': 2, 'Rendah': 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      });

      // Hitung stats lainnya...
      const validBulanKegiatanForSlow = getValidBulanForSlow(filterTahun, bulanKegiatanData);
      const bulanPeakKegiatan = bulanKegiatanData.length > 0 
        ? bulanKegiatanData.reduce((max, current) => current.value > max.value ? current : max)
        : { name: "-", value: 0 };
      
      const bulanSlowKegiatan = validBulanKegiatanForSlow.length > 0
        ? validBulanKegiatanForSlow.reduce((min, current) => current.value < min.value ? current : min)
        : { name: "-", value: 0 };

      const validBulanAnggaranForSlow = getValidBulanForSlow(filterTahun, bulanAnggaranData);
      const bulanPeakAnggaran = bulanAnggaranData.length > 0 
        ? bulanAnggaranData.reduce((max, current) => current.value > max.value ? current : max)
        : { name: "-", value: 0 };
      
      const bulanSlowAnggaran = validBulanAnggaranForSlow.length > 0
        ? validBulanAnggaranForSlow.reduce((min, current) => current.value < min.value ? current : min)
        : { name: "-", value: 0 };

      const bulanDenganKegiatan = getValidBulanForSlow(filterTahun, bulanKegiatanData).filter(item => item.value > 0);
      const rataRataKegiatanPerBulan = bulanDenganKegiatan.length > 0 
        ? Math.round(bulanDenganKegiatan.reduce((sum, item) => sum + item.value, 0) / bulanDenganKegiatan.length)
        : 0;

      const bulanDenganAnggaran = getValidBulanForSlow(filterTahun, bulanAnggaranData).filter(item => item.value > 0);
      const rataRataAnggaranPerBulan = bulanDenganAnggaran.length > 0 
        ? Math.round(bulanDenganAnggaran.reduce((sum, item) => sum + item.value, 0) / bulanDenganAnggaran.length)
        : 0;

      setStats({
        totalKegiatan,
        totalRealisasi,
        bulanPeakKegiatan,
        bulanSlowKegiatan,
        bulanPeakAnggaran,
        bulanSlowAnggaran,
        rataRataKegiatanPerBulan,
        rataRataAnggaranPerBulan
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

      setWorkloadData(workloadDataArray);
      setRiskData(riskDataArray);

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
              {viewMode === 'kegiatan' ? 'Rata-rata Kegiatan per Bulan' : 'Rata-rata Anggaran per Bulan'}
            </CardTitle>
            {viewMode === 'kegiatan' ? (
              <Calendar className="h-4 w-4 text-muted-foreground" />
            ) : (
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {viewMode === 'kegiatan' 
                ? stats.rataRataKegiatanPerBulan.toLocaleString('id-ID')
                : formatRupiah(stats.rataRataAnggaranPerBulan)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'kegiatan' ? 'Kegiatan per bulan' : 'Anggaran per bulan'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'kegiatan' ? 'Bulan Puncak' : 'Bulan Anggaran Tertinggi'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {viewMode === 'kegiatan' 
                ? `${stats.bulanPeakKegiatan.name} (${stats.bulanPeakKegiatan.value})`
                : `${stats.bulanPeakAnggaran.name} (${formatRupiah(stats.bulanPeakAnggaran.value)})`
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'kegiatan' ? 'Kegiatan tertinggi' : 'Anggaran tertinggi'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {viewMode === 'kegiatan' ? 'Bulan Slow' : 'Bulan Anggaran Terendah'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {viewMode === 'kegiatan' 
                ? `${stats.bulanSlowKegiatan.name} (${stats.bulanSlowKegiatan.value})`
                : `${stats.bulanSlowAnggaran.name} (${formatRupiah(stats.bulanSlowAnggaran.value)})`
              }
            </div>
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

      {/* Grafik Baru: Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend {viewMode === 'kegiatan' ? 'Kegiatan' : 'Anggaran'} per Bulan
          </CardTitle>
          <CardDescription>
            Melihat pola musiman dan prediksi kebutuhan ke depan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SafeLineChart 
            data={currentData.bulan} 
            title={viewMode === 'kegiatan' ? 'Trend Kegiatan' : 'Trend Anggaran'}
            mode={viewMode}
          />
        </CardContent>
      </Card>

      {/* Grid untuk Risk Assessment dan Workload Distribution dengan lebar yang disesuaikan */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Risk Assessment - Lebar dikurangi 20% */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Assesmen Risiko
            </CardTitle>
            <CardDescription>
              {viewMode === 'kegiatan' 
                ? 'Identifikasi bottleneck petugas dengan workload tertinggi' 
                : 'Identifikasi cost center terbesar'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RiskMatrix data={riskData.slice(0, 5)} mode={viewMode} />
          </CardContent>
        </Card>

        {/* Workload Distribution Table - Lebar ditambah 20% */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Distribusi Beban Kerja - Top 10 Petugas
            </CardTitle>
            <CardDescription>
              Tabel detail distribusi beban kerja dan realisasi per mitra statistik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-semibold">No</th>
                    <th className="text-left py-3 font-semibold">Mitra Statistik</th>
                    <th className="text-left py-3 font-semibold">PJ Kegiatan</th>
                    <th className="text-right py-3 font-semibold">Jumlah Kegiatan</th>
                    <th className="text-right py-3 font-semibold">Total Realisasi</th>
                  </tr>
                </thead>
                <tbody>
                  {workloadData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 font-medium">{item.petugas}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.roles.map((role, roleIndex) => (
                            <span 
                              key={roleIndex} 
                              className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-right py-3 font-medium">
                        {item.jumlahKegiatan.toLocaleString('id-ID')}
                      </td>
                      <td className="text-right py-3 font-medium">
                        {formatRupiah(item.totalAnggaran)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {workloadData.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}