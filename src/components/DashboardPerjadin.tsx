import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity, Users, MapPin } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERJADIN_SPREADSHEET_ID = "1JNrpj2Ww42EU3FFBfoAmI6wuWl7l280m62iLXKHFpgQ";
const SHEET_NAME = "MASTER_VIEW";

const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tahunList = Array.from({ length: 9 }, (_, i) => (2024 + i).toString());

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface PerjadinData {
  no: string;
  jenis_perjalanan: string;
  nama_pelaksana: string;
  jenis_pegawai: string;
  satuan_kerja: string;
  nama_kegiatan: string;
  bulan_pelaksanaan: string;
  tahun_pelaksanaan: string;
  durasi_hari: string;
  total_biaya: string;
  kota_tujuan: string;
  kecamatan_tujuan: string;
  sumber_anggaran: string;
}

interface ChartItem {
  name: string;
  value: number;
}

interface DashboardStats {
  totalPerjadin: number;
  totalRealisasi: number;
  totalDurasi: number;
  rataRataBiayaPerjadin: number;
  rataRataDurasiPerjadin: number;
  petugasTeraktif: string;
}

interface PetugasData {
  nama: string;
  jumlahPerjadin: number;
  totalDurasi: number;
  totalBiaya: number;
  jenisPegawai: string;
}

// Custom Tooltip Components
const CurrencyTooltip = ({ active, payload, label, mode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-sm">
        <p className="font-semibold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {mode === 'biaya' 
              ? new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0
                }).format(entry.value)
              : `${entry.value} hari`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Safe Chart Components
const SafeBarChart = ({ data, mode }: { data: ChartItem[]; mode: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  const formatYAxisTick = (value: number) => {
    if (mode === 'biaya') {
      if (value >= 1000000) {
        return `Rp${(value / 1000000).toFixed(0)}Jt`;
      } else if (value >= 1000) {
        return `Rp${(value / 1000).toFixed(0)}Rb`;
      }
      return `Rp${value}`;
    }
    return `${value} hari`;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
        <YAxis tickFormatter={formatYAxisTick} fontSize={12} />
        <Tooltip content={<CurrencyTooltip mode={mode} />} />
        <Legend />
        <Bar 
          dataKey="value" 
          name={mode === 'biaya' ? 'Total Biaya' : 'Total Durasi'} 
          fill={mode === 'biaya' ? '#00C49F' : '#0088FE'} 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const SafeLineChart = ({ data, mode }: { data: ChartItem[]; mode: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  const formatYAxisTick = (value: number) => {
    if (mode === 'biaya') {
      if (value >= 1000000) {
        return `Rp${(value / 1000000).toFixed(0)}Jt`;
      } else if (value >= 1000) {
        return `Rp${(value / 1000).toFixed(0)}Rb`;
      }
      return `Rp${value}`;
    }
    return `${value} hari`;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
        <YAxis tickFormatter={formatYAxisTick} fontSize={12} />
        <Tooltip content={<CurrencyTooltip mode={mode} />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          name={mode === 'biaya' ? 'Trend Biaya' : 'Trend Durasi'} 
          stroke={mode === 'biaya' ? '#00C49F' : '#0088FE'} 
          strokeWidth={3} 
          dot={{ r: 4 }} 
          activeDot={{ r: 6 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const SafePieChart = ({ data, mode }: { data: ChartItem[]; mode: string }) => {
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

export default function DashboardPerjadin() {
  const [loading, setLoading] = useState(true);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [filterJenisPerjalanan, setFilterJenisPerjalanan] = useState<string>("Semua");
  const [filterJenisPegawai, setFilterJenisPegawai] = useState<string>("Semua");
  const [filterSumberAnggaran, setFilterSumberAnggaran] = useState<string>("Semua");
  const [viewMode, setViewMode] = useState<'biaya' | 'durasi'>('biaya');
  
  const [stats, setStats] = useState<DashboardStats>({
    totalPerjadin: 0,
    totalRealisasi: 0,
    totalDurasi: 0,
    rataRataBiayaPerjadin: 0,
    rataRataDurasiPerjadin: 0,
    petugasTeraktif: "-"
  });

  const [chartData, setChartData] = useState<{
    trendBulanan: ChartItem[];
    topMitra: ChartItem[];
    topOrganik: ChartItem[];
    distribusiJenis: ChartItem[];
    distribusiSumber: ChartItem[];
  }>({
    trendBulanan: [],
    topMitra: [],
    topOrganik: [],
    distribusiJenis: [],
    distribusiSumber: []
  });

  const [petugasData, setPetugasData] = useState<{
    mitra: PetugasData[];
    organik: PetugasData[];
  }>({
    mitra: [],
    organik: []
  });

  const { toast } = useToast();

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    fetchPerjadinData();
  }, [filterTahun, filterJenisPerjalanan, filterJenisPegawai, filterSumberAnggaran, viewMode]);

  const fetchPerjadinData = async () => {
    try {
      setLoading(true);
      
      const { data: perjadinResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: PERJADIN_SPREADSHEET_ID,
          operation: "read",
          range: SHEET_NAME
        }
      });

      if (error) throw error;

      const rows = perjadinResponse?.values || [];
      console.log("Total rows from PERJADIN:", rows.length);

      // Skip header row
      const allData: PerjadinData[] = rows.slice(1).map((row: any[]) => ({
        no: row[0]?.toString() || "",
        jenis_perjalanan: row[1]?.toString() || "",
        nama_pelaksana: row[2]?.toString() || "",
        jenis_pegawai: row[3]?.toString() || "",
        satuan_kerja: row[4]?.toString() || "",
        nama_kegiatan: row[5]?.toString() || "",
        bulan_pelaksanaan: row[6]?.toString() || "",
        tahun_pelaksanaan: row[7]?.toString() || "",
        durasi_hari: row[8]?.toString() || "0",
        total_biaya: row[9]?.toString() || "0",
        kota_tujuan: row[10]?.toString() || "",
        kecamatan_tujuan: row[11]?.toString() || "",
        sumber_anggaran: row[12]?.toString() || ""
      }));

      // Filter data berdasarkan filter yang dipilih
      const filteredData = allData.filter((item) => {
        const tahunMatch = item.tahun_pelaksanaan === filterTahun;
        const jenisPerjalananMatch = filterJenisPerjalanan === "Semua" || item.jenis_perjalanan === filterJenisPerjalanan;
        const jenisPegawaiMatch = filterJenisPegawai === "Semua" || item.jenis_pegawai === filterJenisPegawai;
        const sumberAnggaranMatch = filterSumberAnggaran === "Semua" || item.sumber_anggaran === filterSumberAnggaran;
        
        return tahunMatch && jenisPerjalananMatch && jenisPegawaiMatch && sumberAnggaranMatch;
      });

      console.log(`Filtered data: ${filteredData.length} rows`);

      // Process data untuk stats
      const totalPerjadin = filteredData.length;
      const totalRealisasi = filteredData.reduce((sum, item) => {
        const biaya = parseFloat(item.total_biaya.replace(/\./g, '')) || 0;
        return sum + biaya;
      }, 0);
      const totalDurasi = filteredData.reduce((sum, item) => {
        const durasi = parseFloat(item.durasi_hari) || 0;
        return sum + durasi;
      }, 0);

      // Process data untuk charts
      const trendBulananMap = new Map<string, { biaya: number; durasi: number }>();
      const mitraMap = new Map<string, { biaya: number; durasi: number; count: number }>();
      const organikMap = new Map<string, { biaya: number; durasi: number; count: number }>();
      const jenisPerjalananMap = new Map<string, { biaya: number; durasi: number; count: number }>();
      const sumberAnggaranMap = new Map<string, { biaya: number; durasi: number; count: number }>();

      filteredData.forEach((item) => {
        const biaya = parseFloat(item.total_biaya.replace(/\./g, '')) || 0;
        const durasi = parseFloat(item.durasi_hari) || 0;
        const bulan = item.bulan_pelaksanaan;

        // Trend Bulanan
        if (bulan) {
          const existing = trendBulananMap.get(bulan) || { biaya: 0, durasi: 0 };
          trendBulananMap.set(bulan, {
            biaya: existing.biaya + biaya,
            durasi: existing.durasi + durasi
          });
        }

        // Top Mitra & Organik
        if (item.jenis_pegawai === "MITRA") {
          const existing = mitraMap.get(item.nama_pelaksana) || { biaya: 0, durasi: 0, count: 0 };
          mitraMap.set(item.nama_pelaksana, {
            biaya: existing.biaya + biaya,
            durasi: existing.durasi + durasi,
            count: existing.count + 1
          });
        } else if (item.jenis_pegawai === "ORGANIK") {
          const existing = organikMap.get(item.nama_pelaksana) || { biaya: 0, durasi: 0, count: 0 };
          organikMap.set(item.nama_pelaksana, {
            biaya: existing.biaya + biaya,
            durasi: existing.durasi + durasi,
            count: existing.count + 1
          });
        }

        // Distribusi Jenis Perjalanan
        const jenisExisting = jenisPerjalananMap.get(item.jenis_perjalanan) || { biaya: 0, durasi: 0, count: 0 };
        jenisPerjalananMap.set(item.jenis_perjalanan, {
          biaya: jenisExisting.biaya + biaya,
          durasi: jenisExisting.durasi + durasi,
          count: jenisExisting.count + 1
        });

        // Distribusi Sumber Anggaran
        if (item.sumber_anggaran) {
          const sumberExisting = sumberAnggaranMap.get(item.sumber_anggaran) || { biaya: 0, durasi: 0, count: 0 };
          sumberAnggaranMap.set(item.sumber_anggaran, {
            biaya: sumberExisting.biaya + biaya,
            durasi: sumberExisting.durasi + durasi,
            count: sumberExisting.count + 1
          });
        }
      });

      // Prepare chart data
      const trendBulananData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: viewMode === 'biaya' 
          ? (trendBulananMap.get(bulan)?.biaya || 0)
          : (trendBulananMap.get(bulan)?.durasi || 0)
      }));

      const topMitraData: ChartItem[] = Array.from(mitraMap.entries())
        .map(([nama, data]) => ({
          name: nama.length > 20 ? nama.substring(0, 20) + '...' : nama,
          value: viewMode === 'biaya' ? data.biaya : data.durasi
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const topOrganikData: ChartItem[] = Array.from(organikMap.entries())
        .map(([nama, data]) => ({
          name: nama.length > 20 ? nama.substring(0, 20) + '...' : nama,
          value: viewMode === 'biaya' ? data.biaya : data.durasi
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const distribusiJenisData: ChartItem[] = Array.from(jenisPerjalananMap.entries())
        .map(([jenis, data]) => ({
          name: jenis,
          value: viewMode === 'biaya' ? data.biaya : data.durasi
        }));

      const distribusiSumberData: ChartItem[] = Array.from(sumberAnggaranMap.entries())
        .map(([sumber, data]) => ({
          name: sumber.length > 30 ? sumber.substring(0, 30) + '...' : sumber,
          value: viewMode === 'biaya' ? data.biaya : data.durasi
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // Prepare petugas data untuk tables
      const mitraPetugasData: PetugasData[] = Array.from(mitraMap.entries())
        .map(([nama, data]) => ({
          nama,
          jumlahPerjadin: data.count,
          totalDurasi: data.durasi,
          totalBiaya: data.biaya,
          jenisPegawai: "MITRA"
        }))
        .sort((a, b) => b.totalBiaya - a.totalBiaya)
        .slice(0, 15);

      const organikPetugasData: PetugasData[] = Array.from(organikMap.entries())
        .map(([nama, data]) => ({
          nama,
          jumlahPerjadin: data.count,
          totalDurasi: data.durasi,
          totalBiaya: data.biaya,
          jenisPegawai: "ORGANIK"
        }))
        .sort((a, b) => b.totalBiaya - a.totalBiaya)
        .slice(0, 15);

      // Find petugas teraktif
      const allPetugas = [...mitraPetugasData, ...organikPetugasData];
      const petugasTeraktif = allPetugas.length > 0 
        ? allPetugas.reduce((max, current) => 
            current.jumlahPerjadin > max.jumlahPerjadin ? current : max
          ).nama 
        : "-";

      setStats({
        totalPerjadin,
        totalRealisasi,
        totalDurasi,
        rataRataBiayaPerjadin: totalPerjadin > 0 ? totalRealisasi / totalPerjadin : 0,
        rataRataDurasiPerjadin: totalPerjadin > 0 ? totalDurasi / totalPerjadin : 0,
        petugasTeraktif
      });

      setChartData({
        trendBulanan: trendBulananData,
        topMitra: topMitraData,
        topOrganik: topOrganikData,
        distribusiJenis: distribusiJenisData,
        distribusiSumber: distribusiSumberData
      });

      setPetugasData({
        mitra: mitraPetugasData,
        organik: organikPetugasData
      });

    } catch (error: any) {
      console.error("Error fetching perjadin data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data perjadin",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Dashboard Perjadin</h1>
          <p className="text-muted-foreground mt-2">
            Monitoring dan analisis data perjalanan dinas
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Memuat data perjadin...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Sedang memuat data...</p>
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
          <h1 className="text-3xl font-bold text-red-500">Dashboard Perjadin</h1>
          <p className="text-muted-foreground mt-2">
            Monitoring dan analisis data perjalanan dinas
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'biaya' | 'durasi')}>
            <TabsList>
              <TabsTrigger value="biaya" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Berdasarkan Realisasi
              </TabsTrigger>
              <TabsTrigger value="durasi" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Berdasarkan Kegiatan
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filterTahun} onValueChange={setFilterTahun}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {tahunList.map(tahun => (
                <SelectItem key={tahun} value={tahun}>{tahun}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Jenis Perjalanan</label>
              <Select value={filterJenisPerjalanan} onValueChange={setFilterJenisPerjalanan}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Jenis</SelectItem>
                  <SelectItem value="Transport Lokal">Transport Lokal</SelectItem>
                  <SelectItem value="Dalam Kota">Dalam Kota</SelectItem>
                  <SelectItem value="Luar Kota">Luar Kota</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Jenis Pegawai</label>
              <Select value={filterJenisPegawai} onValueChange={setFilterJenisPegawai}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Pegawai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Pegawai</SelectItem>
                  <SelectItem value="ORGANIK">Organik</SelectItem>
                  <SelectItem value="MITRA">Mitra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sumber Anggaran</label>
              <Select value={filterSumberAnggaran} onValueChange={setFilterSumberAnggaran}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Sumber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua Sumber</SelectItem>
                  {/* Sumber anggaran akan di-load dynamically */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Total Perjadin
            </CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {stats.totalPerjadin.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-blue-700">
              Tahun {filterTahun}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              {viewMode === 'biaya' ? 'Total Realisasi' : 'Total Durasi'}
            </CardTitle>
            {viewMode === 'biaya' ? (
              <DollarSign className="h-4 w-4 text-green-600" />
            ) : (
              <Calendar className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {viewMode === 'biaya' 
                ? formatRupiah(stats.totalRealisasi)
                : `${stats.totalDurasi.toLocaleString('id-ID')} hari`
              }
            </div>
            <p className="text-xs text-green-700">
              {viewMode === 'biaya' ? 'Total biaya' : 'Total hari'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Rata-rata per Perjadin
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {viewMode === 'biaya' 
                ? formatRupiah(stats.rataRataBiayaPerjadin)
                : `${stats.rataRataDurasiPerjadin.toFixed(1)} hari`
              }
            </div>
            <p className="text-xs text-purple-700">
              Per perjadin
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">
              Petugas Teraktif
            </CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-900 truncate">
              {stats.petugasTeraktif}
            </div>
            <p className="text-xs text-orange-700">
              Jumlah perjadin terbanyak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend {viewMode === 'biaya' ? 'Realisasi' : 'Kegiatan'} per Bulan
          </CardTitle>
          <CardDescription>
            Perkembangan {viewMode === 'biaya' ? 'biaya' : 'durasi'} perjadin selama tahun {filterTahun}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SafeLineChart data={chartData.trendBulanan} mode={viewMode} />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'biaya' ? 'Top Mitra Statistik Berdasarkan Realisasi' : 'Top Mitra Statistik Berdasarkan Kegiatan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart data={chartData.topMitra} mode={viewMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'biaya' ? 'Top Organik Berdasarkan Realisasi' : 'Top Organik Berdasarkan Kegiatan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart data={chartData.topOrganik} mode={viewMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Distribusi per Jenis Perjalanan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart data={chartData.distribusiJenis} mode={viewMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Distribusi per Sumber Anggaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart data={chartData.distribusiSumber} mode={viewMode} />
          </CardContent>
        </Card>
      </div>

      {/* Distribution Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribusi Realisasi Honor - Top 15 Organik */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Distribusi Realisasi Honor - Top 15 Organik
            </CardTitle>
            <CardDescription>
              Detail realisasi honor per petugas organik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-semibold w-12">No</th>
                    <th className="text-left py-3 font-semibold">Nama</th>
                    <th className="text-center py-3 font-semibold">Jumlah</th>
                    <th className="text-center py-3 font-semibold">Total Durasi</th>
                    <th className="text-right py-3 font-semibold">Total Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {petugasData.organik.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Tidak ada data organik
                      </td>
                    </tr>
                  ) : (
                    petugasData.organik.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 text-muted-foreground w-12">{index + 1}</td>
                        <td className="py-3 font-medium">{item.nama}</td>
                        <td className="text-center py-3">{item.jumlahPerjadin}</td>
                        <td className="text-center py-3">{item.totalDurasi} hari</td>
                        <td className="text-right py-3 font-medium">
                          {formatRupiah(item.totalBiaya)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Distribusi Realisasi Honor - Top 15 Mitra Statistik */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Distribusi Realisasi Honor - Top 15 Mitra Statistik
            </CardTitle>
            <CardDescription>
              Detail realisasi honor per mitra statistik
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-semibold w-12">No</th>
                    <th className="text-left py-3 font-semibold">Nama</th>
                    <th className="text-center py-3 font-semibold">Jumlah</th>
                    <th className="text-center py-3 font-semibold">Total Durasi</th>
                    <th className="text-right py-3 font-semibold">Total Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {petugasData.mitra.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Tidak ada data mitra
                      </td>
                    </tr>
                  ) : (
                    petugasData.mitra.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 text-muted-foreground w-12">{index + 1}</td>
                        <td className="py-3 font-medium">{item.nama}</td>
                        <td className="text-center py-3">{item.jumlahPerjadin}</td>
                        <td className="text-center py-3">{item.totalDurasi} hari</td>
                        <td className="text-right py-3 font-medium">
                          {formatRupiah(item.totalBiaya)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}