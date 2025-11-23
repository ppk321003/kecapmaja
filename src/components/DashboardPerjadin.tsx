import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity, Users, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const PERJADIN_SPREADSHEET_ID = "1JNrpj2Ww42EU3FFBfoAmI6wuWl7l280m62iLXKHFpgQ";
const SHEET_NAME = "MASTER_VIEW";

const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

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
  rataRataKegiatanPerBulan: number;
  rataRataAnggaranPerBulan: number;
}

interface PetugasData {
  nama: string;
  jumlahPerjadin: number;
  totalDurasi: number;
  totalBiaya: number;
  jenisPegawai: string;
  namaKegiatanList: string[];
}

// PERBAIKAN: Interface untuk tooltip
interface PerjadinTooltipData {
  petugas: string;
  jumlahPerjadin: number;
  totalDurasi: number;
  totalBiaya: number;
  namaKegiatanList: string[];
}

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
                  minimumFractionDigits: 0
                }).format(entry.value)
              : `${entry.value.toLocaleString('id-ID')} hari`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// PERBAIKAN: Komponen Search untuk tabel
const SearchInput = ({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input 
        type="text" 
        placeholder={placeholder} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="pl-10 pr-4 py-2 w-full max-w-xs" 
      />
    </div>
  );
};

// PERBAIKAN: Komponen Tooltip untuk tabel dengan positioning yang lebih baik
const PerjadinTooltip = ({
  data,
  position
}: {
  data: PerjadinTooltipData;
  position: {
    x: number;
    y: number;
  };
}) => {
  if (!data) return null;
  
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // PERBAIKAN: Hitung posisi tooltip agar tidak keluar dari viewport
  const calculatePosition = () => {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x + 10;
    let y = position.y - 10;

    // Jika tooltip akan keluar dari kanan viewport
    if (x + tooltipWidth > viewportWidth) {
      x = position.x - tooltipWidth - 10;
    }

    // Jika tooltip akan keluar dari bawah viewport
    if (y + tooltipHeight > viewportHeight) {
      y = position.y - tooltipHeight - 10;
    }

    // Pastikan tidak keluar dari kiri atau atas viewport
    x = Math.max(10, x);
    y = Math.max(10, y);

    return { x, y };
  };

  const finalPosition = calculatePosition();

  return (
    <div className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 pointer-events-none transition-opacity duration-200" 
         style={{
           left: finalPosition.x,
           top: finalPosition.y
         }}>
      <h4 className="font-semibold text-sm mb-2">{data.petugas}</h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Jumlah Perjadin:</span>
          <span className="font-medium">{data.jumlahPerjadin.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Durasi:</span>
          <span className="font-medium">{data.totalDurasi} hari</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Biaya:</span>
          <span className="font-medium">{formatRupiah(data.totalBiaya)}</span>
        </div>
        <div className="mt-2">
          <h5 className="font-semibold mb-1">Jenis Perjadin ({data.jumlahPerjadin}):</h5>
          <div className="max-h-32 overflow-y-auto border rounded p-2">
            <ul className="space-y-1">
              {data.namaKegiatanList.map((kegiatan, idx) => (
                <li key={idx} className="text-gray-700 py-1 border-b last:border-b-0">
                  • {kegiatan}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const SafeBarChart = ({ data, mode }: { data: ChartItem[]; mode: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  const formatYAxisTick = (value: number) => {
    if (mode === 'anggaran') {
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
          name={mode === 'anggaran' ? 'Total Realisasi' : 'Total Durasi'} 
          fill={mode === 'anggaran' ? '#00C49F' : '#0088FE'} 
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
    if (mode === 'anggaran') {
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
          name={mode === 'anggaran' ? 'Trend Realisasi' : 'Trend Kegiatan'} 
          stroke={mode === 'anggaran' ? '#00C49F' : '#0088FE'} 
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

interface DashboardPerjadinProps {
  viewMode: 'kegiatan' | 'anggaran';
  filterTahun: string;
}

export default function DashboardPerjadin({ viewMode, filterTahun }: DashboardPerjadinProps) {
  const [loading, setLoading] = useState(true);
  const [filterJenisPerjalanan, setFilterJenisPerjalanan] = useState<string>("Semua");
  const [filterJenisPegawai, setFilterJenisPegawai] = useState<string>("Semua");
  
  // PERBAIKAN: State untuk search dan data lengkap
  const [organikSearchQuery, setOrganikSearchQuery] = useState("");
  const [mitraSearchQuery, setMitraSearchQuery] = useState("");
  const [allPetugasData, setAllPetugasData] = useState<{
    mitra: PetugasData[];
    organik: PetugasData[];
  }>({
    mitra: [],
    organik: []
  });
  
  // PERBAIKAN: State untuk tooltip
  const [tooltipData, setTooltipData] = useState<PerjadinTooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [stats, setStats] = useState<DashboardStats>({
    totalPerjadin: 0,
    totalRealisasi: 0,
    totalDurasi: 0,
    rataRataKegiatanPerBulan: 0,
    rataRataAnggaranPerBulan: 0,
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

  const { toast } = useToast();

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // PERBAIKAN: Fungsi untuk menampilkan tooltip
  const handleShowTooltip = (data: PerjadinTooltipData, position: { x: number; y: number }) => {
    setTooltipData(data);
    setTooltipPosition(position);
  };

  // PERBAIKAN: Fungsi untuk menyembunyikan tooltip
  const handleHideTooltip = () => {
    setTooltipData(null);
  };

  // Fungsi untuk membersihkan dan mengkonversi nilai biaya
  const parseBiaya = (biayaStr: string): number => {
    if (!biayaStr) return 0;
    
    const cleaned = biayaStr.toString().replace(/[^\d,.]/g, '');
    
    let normalized = cleaned;
    if (cleaned.includes('.') && cleaned.includes(',')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes('.')) {
      normalized = cleaned.replace(/\./g, '');
    } else if (cleaned.includes(',')) {
      normalized = cleaned.replace(',', '.');
    }
    
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Fungsi untuk membersihkan dan mengkonversi durasi
  const parseDurasi = (durasiStr: string): number => {
    if (!durasiStr) return 0;
    const parsed = parseFloat(durasiStr.toString().replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    fetchPerjadinData();
  }, [filterTahun, filterJenisPerjalanan, filterJenisPegawai, viewMode]);

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
      if (rows.length === 0) {
        setLoading(false);
        return;
      }

      // Process data - skip header row
      const allData: PerjadinData[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 13) continue;

        const dataItem: PerjadinData = {
          no: row[0]?.toString()?.trim() || "",
          jenis_perjalanan: row[1]?.toString()?.trim() || "",
          nama_pelaksana: row[2]?.toString()?.trim() || "",
          jenis_pegawai: row[3]?.toString()?.trim() || "",
          satuan_kerja: row[4]?.toString()?.trim() || "",
          nama_kegiatan: row[5]?.toString()?.trim() || "",
          bulan_pelaksanaan: row[6]?.toString()?.trim() || "",
          tahun_pelaksanaan: row[7]?.toString()?.trim() || "",
          durasi_hari: row[8]?.toString()?.trim() || "0",
          total_biaya: row[9]?.toString()?.trim() || "0",
          kota_tujuan: row[10]?.toString()?.trim() || "",
          kecamatan_tujuan: row[11]?.toString()?.trim() || "",
          sumber_anggaran: row[12]?.toString()?.trim() || ""
        };

        allData.push(dataItem);
      }

      // Filter data berdasarkan filter yang dipilih
      const filteredData = allData.filter((item) => {
        const tahunMatch = item.tahun_pelaksanaan === filterTahun;
        const jenisPerjalananMatch = filterJenisPerjalanan === "Semua" || item.jenis_perjalanan === filterJenisPerjalanan;
        const jenisPegawaiMatch = filterJenisPegawai === "Semua" || item.jenis_pegawai === filterJenisPegawai;
        
        return tahunMatch && jenisPerjalananMatch && jenisPegawaiMatch;
      });

      // Process data untuk stats dan charts
      const trendBulananMap = new Map<string, { biaya: number; durasi: number; count: number }>();
      const mitraMap = new Map<string, { biaya: number; durasi: number; count: number; namaKegiatanList: string[] }>();
      const organikMap = new Map<string, { biaya: number; durasi: number; count: number; namaKegiatanList: string[] }>();
      const jenisPerjalananMap = new Map<string, { biaya: number; durasi: number; count: number }>();
      const sumberAnggaranMap = new Map<string, { biaya: number; durasi: number; count: number }>();

      let totalRealisasi = 0;
      let totalDurasi = 0;

      filteredData.forEach((item) => {
        try {
          const biaya = parseBiaya(item.total_biaya);
          const durasi = parseDurasi(item.durasi_hari);
          const bulan = item.bulan_pelaksanaan;

          totalRealisasi += biaya;
          totalDurasi += durasi;

          // Trend Bulanan
          if (bulan) {
            const existing = trendBulananMap.get(bulan) || { biaya: 0, durasi: 0, count: 0 };
            trendBulananMap.set(bulan, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1
            });
          }

          // Data per petugas dengan nama kegiatan
          if (item.jenis_pegawai === "MITRA") {
            const existing = mitraMap.get(item.nama_pelaksana) || { 
              biaya: 0, durasi: 0, count: 0, namaKegiatanList: [] 
            };
            if (!existing.namaKegiatanList.includes(item.nama_kegiatan)) {
              existing.namaKegiatanList.push(item.nama_kegiatan);
            }
            mitraMap.set(item.nama_pelaksana, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1,
              namaKegiatanList: existing.namaKegiatanList
            });
          } else if (item.jenis_pegawai === "ORGANIK") {
            const existing = organikMap.get(item.nama_pelaksana) || { 
              biaya: 0, durasi: 0, count: 0, namaKegiatanList: [] 
            };
            if (!existing.namaKegiatanList.includes(item.nama_kegiatan)) {
              existing.namaKegiatanList.push(item.nama_kegiatan);
            }
            organikMap.set(item.nama_pelaksana, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1,
              namaKegiatanList: existing.namaKegiatanList
            });
          }

          // Distribusi Jenis Perjalanan
          if (item.jenis_perjalanan) {
            const existing = jenisPerjalananMap.get(item.jenis_perjalanan) || { biaya: 0, durasi: 0, count: 0 };
            jenisPerjalananMap.set(item.jenis_perjalanan, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1
            });
          }

          // Distribusi Sumber Anggaran
          if (item.sumber_anggaran) {
            const existing = sumberAnggaranMap.get(item.sumber_anggaran) || { biaya: 0, durasi: 0, count: 0 };
            sumberAnggaranMap.set(item.sumber_anggaran, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1
            });
          }

        } catch (error) {
          console.error("Error processing data:", error, item);
        }
      });

      // Prepare chart data
      const trendBulananData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: viewMode === 'anggaran' 
          ? (trendBulananMap.get(bulan)?.biaya || 0)
          : (trendBulananMap.get(bulan)?.durasi || 0)
      }));

      const topMitraData: ChartItem[] = Array.from(mitraMap.entries())
        .map(([nama, data]) => ({
          name: nama.length > 20 ? nama.substring(0, 20) + '...' : nama,
          value: viewMode === 'anggaran' ? data.biaya : data.durasi
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const topOrganikData: ChartItem[] = Array.from(organikMap.entries())
        .map(([nama, data]) => ({
          name: nama.length > 20 ? nama.substring(0, 20) + '...' : nama,
          value: viewMode === 'anggaran' ? data.biaya : data.durasi
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const distribusiJenisData: ChartItem[] = Array.from(jenisPerjalananMap.entries())
        .map(([jenis, data]) => ({
          name: jenis,
          value: viewMode === 'anggaran' ? data.biaya : data.durasi
        }));

      const distribusiSumberData: ChartItem[] = Array.from(sumberAnggaranMap.entries())
        .map(([sumber, data]) => ({
          name: sumber.length > 30 ? sumber.substring(0, 30) + '...' : sumber,
          value: viewMode === 'anggaran' ? data.biaya : data.durasi
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // PERBAIKAN: Simpan SEMUA data petugas untuk search (bukan hanya top 15)
      const allMitraPetugasData: PetugasData[] = Array.from(mitraMap.entries())
        .map(([nama, data]) => ({
          nama,
          jumlahPerjadin: data.count,
          totalDurasi: data.durasi,
          totalBiaya: data.biaya,
          jenisPegawai: "MITRA",
          namaKegiatanList: data.namaKegiatanList
        }))
        .sort((a, b) => b.totalBiaya - a.totalBiaya);

      const allOrganikPetugasData: PetugasData[] = Array.from(organikMap.entries())
        .map(([nama, data]) => ({
          nama,
          jumlahPerjadin: data.count,
          totalDurasi: data.durasi,
          totalBiaya: data.biaya,
          jenisPegawai: "ORGANIK",
          namaKegiatanList: data.namaKegiatanList
        }))
        .sort((a, b) => b.totalBiaya - a.totalBiaya);

      // Set stats
      setStats({
        totalPerjadin: filteredData.length,
        totalRealisasi,
        totalDurasi,
        rataRataKegiatanPerBulan: filteredData.length > 0 ? totalDurasi / filteredData.length : 0,
        rataRataAnggaranPerBulan: filteredData.length > 0 ? totalRealisasi / filteredData.length : 0,
      });

      // Set chart data
      setChartData({
        trendBulanan: trendBulananData,
        topMitra: topMitraData,
        topOrganik: topOrganikData,
        distribusiJenis: distribusiJenisData,
        distribusiSumber: distribusiSumberData
      });

      // PERBAIKAN: Set semua data petugas untuk search
      setAllPetugasData({
        mitra: allMitraPetugasData,
        organik: allOrganikPetugasData
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
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Memuat data perjadin...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Sedang memuat data perjadin...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PERBAIKAN: Filter data untuk search dari SEMUA data (bukan hanya top 15)
  const filteredOrganikData = organikSearchQuery 
    ? allPetugasData.organik.filter(item => 
        item.nama.toLowerCase().includes(organikSearchQuery.toLowerCase()) ||
        item.namaKegiatanList.some(kegiatan => 
          kegiatan.toLowerCase().includes(organikSearchQuery.toLowerCase())
        )
      )
    : allPetugasData.organik.slice(0, 15); // Tampilkan top 15 jika tidak ada pencarian

  const filteredMitraData = mitraSearchQuery 
    ? allPetugasData.mitra.filter(item => 
        item.nama.toLowerCase().includes(mitraSearchQuery.toLowerCase()) ||
        item.namaKegiatanList.some(kegiatan => 
          kegiatan.toLowerCase().includes(mitraSearchQuery.toLowerCase())
        )
      )
    : allPetugasData.mitra.slice(0, 15); // Tampilkan top 15 jika tidak ada pencarian

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Data Perjadin</CardTitle>
          <CardDescription>
            Filter data perjalanan dinas berdasarkan kriteria tertentu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              {viewMode === 'anggaran' ? 'Total Realisasi' : 'Total Durasi'}
            </CardTitle>
            {viewMode === 'anggaran' ? (
              <DollarSign className="h-4 w-4 text-green-600" />
            ) : (
              <Calendar className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {viewMode === 'anggaran' 
                ? formatRupiah(stats.totalRealisasi)
                : `${stats.totalDurasi.toLocaleString('id-ID')} hari`
              }
            </div>
            <p className="text-xs text-green-700">
              {viewMode === 'anggaran' ? 'Total biaya' : 'Total hari'}
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
              {viewMode === 'anggaran' 
                ? formatRupiah(stats.rataRataAnggaranPerBulan)
                : `${stats.rataRataKegiatanPerBulan.toFixed(1)} hari`
              }
            </div>
            <p className="text-xs text-purple-700">
              {viewMode === 'anggaran' ? 'Biaya rata-rata' : 'Durasi rata-rata'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {viewMode === 'anggaran' ? 'Trend Realisasi per Bulan' : 'Trend Kegiatan per Bulan'}
          </CardTitle>
          <CardDescription>
            {viewMode === 'anggaran' 
              ? `Perkembangan biaya perjadin selama tahun ${filterTahun}`
              : `Perkembangan durasi perjadin selama tahun ${filterTahun}`
            }
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
              {viewMode === 'anggaran' ? 'Top Mitra Statistik Berdasarkan Realisasi' : 'Top Mitra Statistik Berdasarkan Kegiatan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart data={chartData.topMitra} mode={viewMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'anggaran' ? 'Top Organik Berdasarkan Realisasi' : 'Top Organik Berdasarkan Kegiatan'}
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
              {viewMode === 'anggaran' ? 'Distribusi per Sumber Anggaran' : 'Distribusi per Sumber Kegiatan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart data={chartData.distribusiSumber} mode={viewMode} />
          </CardContent>
        </Card>
      </div>

      {/* Distribution Tables - PERBAIKAN: Search mencari dari semua database */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribusi Realisasi Perjadin - Organik */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Distribusi Realisasi Perjadin - Organik
                <span className="text-sm font-normal text-muted-foreground">
                  ({organikSearchQuery ? `${filteredOrganikData.length} hasil` : 'Top 15'})
                </span>
              </CardTitle>
              <SearchInput 
                value={organikSearchQuery} 
                onChange={setOrganikSearchQuery} 
                placeholder="Cari nama atau kegiatan..." 
              />
            </div>
            <CardDescription>
              Detail realisasi perjadin per petugas organik
              {organikSearchQuery && (
                <div className="mt-1 text-xs text-blue-600">
                  Pencarian: "{organikSearchQuery}" - Menampilkan {filteredOrganikData.length} dari {allPetugasData.organik.length} total data
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto relative">
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
                  {filteredOrganikData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        {organikSearchQuery 
                          ? `Tidak ada data yang cocok dengan pencarian "${organikSearchQuery}"`
                          : 'Tidak ada data organik'
                        }
                      </td>
                    </tr>
                  ) : (
                    filteredOrganikData.map((item, index) => (
                      <tr 
                        key={index} 
                        className="border-b hover:bg-muted/50 cursor-help"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          handleShowTooltip({
                            petugas: item.nama,
                            jumlahPerjadin: item.jumlahPerjadin,
                            totalDurasi: item.totalDurasi,
                            totalBiaya: item.totalBiaya,
                            namaKegiatanList: item.namaKegiatanList
                          }, {
                            x: rect.left,
                            y: rect.top
                          });
                        }}
                        onMouseLeave={handleHideTooltip}
                      >
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

        {/* Distribusi Realisasi Perjadin - Mitra Statistik */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Distribusi Realisasi Perjadin - Mitra Statistik
                <span className="text-sm font-normal text-muted-foreground">
                  ({mitraSearchQuery ? `${filteredMitraData.length} hasil` : 'Top 15'})
                </span>
              </CardTitle>
              <SearchInput 
                value={mitraSearchQuery} 
                onChange={setMitraSearchQuery} 
                placeholder="Cari nama atau kegiatan..." 
              />
            </div>
            <CardDescription>
              Detail realisasi perjadin per mitra statistik
              {mitraSearchQuery && (
                <div className="mt-1 text-xs text-blue-600">
                  Pencarian: "{mitraSearchQuery}" - Menampilkan {filteredMitraData.length} dari {allPetugasData.mitra.length} total data
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto relative">
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
                  {filteredMitraData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        {mitraSearchQuery 
                          ? `Tidak ada data yang cocok dengan pencarian "${mitraSearchQuery}"`
                          : 'Tidak ada data mitra'
                        }
                      </td>
                    </tr>
                  ) : (
                    filteredMitraData.map((item, index) => (
                      <tr 
                        key={index} 
                        className="border-b hover:bg-muted/50 cursor-help"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          handleShowTooltip({
                            petugas: item.nama,
                            jumlahPerjadin: item.jumlahPerjadin,
                            totalDurasi: item.totalDurasi,
                            totalBiaya: item.totalBiaya,
                            namaKegiatanList: item.namaKegiatanList
                          }, {
                            x: rect.left,
                            y: rect.top
                          });
                        }}
                        onMouseLeave={handleHideTooltip}
                      >
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

      {/* Render Tooltip */}
      {tooltipData && (
        <PerjadinTooltip data={tooltipData} position={tooltipPosition} />
      )}
    </div>
  );
}