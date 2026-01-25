import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, TooltipProps } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { TrendingUp, Calendar, DollarSign, Users, MapPin, Search } from "lucide-react";
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

interface KegiatanDetail {
  nama: string;
  durasi: number;
  biaya: number;
  jenis_perjalanan: string;
}

interface PetugasData {
  nama: string;
  jumlahPerjadin: number;
  totalDurasi: number;
  totalBiaya: number;
  jenisPegawai: string;
  kegiatanDetails: KegiatanDetail[];
  summary: {
    transportLokal: { count: number; durasi: number; biaya: number };
    dalamKota: { count: number; durasi: number; biaya: number };
    luarKota: { count: number; durasi: number; biaya: number };
  };
}

interface PerjadinTooltipData {
  petugas: string;
  jumlahPerjadin: number;
  totalBiaya: number;
  kegiatanDetails: KegiatanDetail[];
  summary: {
    transportLokal: { count: number; durasi: number; biaya: number };
    dalamKota: { count: number; durasi: number; biaya: number };
    luarKota: { count: number; durasi: number; biaya: number };
  };
}

// Custom Tooltip dengan typing yang benar dari recharts
const CurrencyTooltip = ({ active, payload, label, mode }: TooltipProps<ValueType, NameType> & { mode?: 'anggaran' | 'kegiatan' }) => {
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

  const calculatePosition = () => {
    const tooltipWidth = 400;
    const tooltipHeight = 320;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let leftPosition = position.x + 8;
    let topPosition = position.y - 10;

    if (leftPosition + tooltipWidth > viewportWidth - 20) {
      leftPosition = position.x - tooltipWidth - 10;
    }

    if (topPosition < 20) {
      topPosition = 20;
    }

    if (topPosition + tooltipHeight > viewportHeight - 20) {
      topPosition = viewportHeight - tooltipHeight - 20;
    }

    return { x: leftPosition, y: topPosition };
  };

  const finalPosition = calculatePosition();

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-96 pointer-events-auto transition-opacity duration-200" 
      style={{
        left: finalPosition.x,
        top: finalPosition.y,
        maxHeight: 'min(400px, 80vh)',
      }}
    >
      <h4 className="font-semibold text-sm mb-2 text-blue-800 border-b pb-1">{data.petugas}</h4>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Transport Lokal:</span>
          <span className="font-medium text-blue-700">
            {formatRupiah(data.summary.transportLokal.biaya)} <span className="text-muted-foreground font-normal">({data.summary.transportLokal.durasi} hari)</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Dalam Kota:</span>
          <span className="font-medium text-green-700">
            {formatRupiah(data.summary.dalamKota.biaya)} <span className="text-muted-foreground font-normal">({data.summary.dalamKota.durasi} hari)</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Luar Kota:</span>
          <span className="font-medium text-purple-700">
            {formatRupiah(data.summary.luarKota.biaya)} <span className="text-muted-foreground font-normal">({data.summary.luarKota.durasi} hari)</span>
          </span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t">
          <span className="text-muted-foreground font-medium">Total Biaya:</span>
          <span className="font-bold text-orange-700">
            {formatRupiah(data.totalBiaya)}
          </span>
        </div>
        <div className="mt-2 pt-2 border-t">
          <h5 className="font-semibold mb-1 text-blue-700">Detail Kegiatan ({data.jumlahPerjadin}):</h5>
          <div 
            className="border rounded p-2 bg-gray-50 overflow-y-auto"
            style={{ 
              minHeight: '120px',
              maxHeight: '200px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e0 #f7fafc'
            }}
          >
            <ul className="space-y-1">
              {data.kegiatanDetails.map((kegiatan, idx) => (
                <li key={idx} className="text-gray-700 py-0.5 border-b last:border-b-0">
                  <div className="font-medium mb-0.5 text-xs leading-tight">{kegiatan.nama}</div>
                  <div className="flex justify-between items-center text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">
                    <span>{kegiatan.durasi} Hari</span>
                    <span>= {formatRupiah(kegiatan.biaya)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Fix: Add proper interface for chart props
interface ChartProps {
  data: ChartItem[];
  mode: string;
}

// Create typed currency tooltip component factory
const CurrencyTooltipContent = ({ mode }: { mode: 'anggaran' | 'kegiatan' }) => (props: TooltipProps<ValueType, NameType>) => (
  <CurrencyTooltip {...props} mode={mode} />
);

const SafeBarChart = ({ data, mode }: ChartProps) => {
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
        <Tooltip content={CurrencyTooltipContent({ mode: mode as 'anggaran' | 'kegiatan' })} />
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

const SafeLineChart = ({ data, mode }: ChartProps) => {
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
        <Tooltip content={CurrencyTooltipContent({ mode: mode as 'anggaran' | 'kegiatan' })} />
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

const SafePieChart = ({ data, mode }: ChartProps) => {
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
        <Tooltip content={CurrencyTooltipContent({ mode: mode as 'anggaran' | 'kegiatan' })} />
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
  
  const [organikSearchQuery, setOrganikSearchQuery] = useState("");
  const [mitraSearchQuery, setMitraSearchQuery] = useState("");
  const [allPetugasData, setAllPetugasData] = useState<{
    mitra: PetugasData[];
    organik: PetugasData[];
  }>({
    mitra: [],
    organik: []
  });
  
  const [tooltipData, setTooltipData] = useState<PerjadinTooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const hideTooltipTimeout = useRef<ReturnType<typeof setTimeout>>();

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

  const handleShowTooltip = (data: PerjadinTooltipData, position: { x: number; y: number }) => {
    if (hideTooltipTimeout.current) {
      clearTimeout(hideTooltipTimeout.current);
    }
    setTooltipData(data);
    setTooltipPosition(position);
  };

  const handleHideTooltip = () => {
    hideTooltipTimeout.current = setTimeout(() => {
      setTooltipData(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (hideTooltipTimeout.current) {
        clearTimeout(hideTooltipTimeout.current);
      }
    };
  }, []);

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

      const filteredData = allData.filter((item) => {
        const tahunMatch = item.tahun_pelaksanaan === filterTahun;
        const jenisPerjalananMatch = filterJenisPerjalanan === "Semua" || item.jenis_perjalanan === filterJenisPerjalanan;
        const jenisPegawaiMatch = filterJenisPegawai === "Semua" || item.jenis_pegawai === filterJenisPegawai;
        
        return tahunMatch && jenisPerjalananMatch && jenisPegawaiMatch;
      });

      const trendBulananMap = new Map<string, { biaya: number; durasi: number; count: number }>();
      const mitraMap = new Map<string, { 
        biaya: number; 
        durasi: number; 
        count: number; 
        kegiatanDetails: KegiatanDetail[];
        summary: {
          transportLokal: { count: number; durasi: number; biaya: number };
          dalamKota: { count: number; durasi: number; biaya: number };
          luarKota: { count: number; durasi: number; biaya: number };
        };
      }>();
      const organikMap = new Map<string, { 
        biaya: number; 
        durasi: number; 
        count: number; 
        kegiatanDetails: KegiatanDetail[];
        summary: {
          transportLokal: { count: number; durasi: number; biaya: number };
          dalamKota: { count: number; durasi: number; biaya: number };
          luarKota: { count: number; durasi: number; biaya: number };
        };
      }>();
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

          if (bulan) {
            const existing = trendBulananMap.get(bulan) || { biaya: 0, durasi: 0, count: 0 };
            trendBulananMap.set(bulan, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1
            });
          }

          // Helper function untuk mengkategorikan jenis perjalanan
          const getJenisKategori = (jenis: string) => {
            if (jenis.includes('Transport Lokal')) return 'transportLokal';
            if (jenis.includes('Dalam Kota')) return 'dalamKota';
            if (jenis.includes('Luar Kota')) return 'luarKota';
            return 'transportLokal'; // default
          };

          // Simpan data aktual setiap kegiatan untuk MITRA
          if (item.jenis_pegawai === "MITRA") {
            const existing = mitraMap.get(item.nama_pelaksana) || { 
              biaya: 0, 
              durasi: 0, 
              count: 0, 
              kegiatanDetails: [],
              summary: {
                transportLokal: { count: 0, durasi: 0, biaya: 0 },
                dalamKota: { count: 0, durasi: 0, biaya: 0 },
                luarKota: { count: 0, durasi: 0, biaya: 0 }
              }
            };
            
            const kategori = getJenisKategori(item.jenis_perjalanan);
            existing.summary[kategori].count += 1;
            existing.summary[kategori].durasi += durasi;
            existing.summary[kategori].biaya += biaya;
            
            // Tambahkan detail kegiatan dengan data aktual dari database
            existing.kegiatanDetails.push({
              nama: item.nama_kegiatan,
              durasi: durasi,
              biaya: biaya,
              jenis_perjalanan: item.jenis_perjalanan
            });
            
            mitraMap.set(item.nama_pelaksana, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1,
              kegiatanDetails: existing.kegiatanDetails,
              summary: existing.summary
            });
          } 
          // Simpan data aktual setiap kegiatan untuk ORGANIK
          else if (item.jenis_pegawai === "ORGANIK") {
            const existing = organikMap.get(item.nama_pelaksana) || { 
              biaya: 0, 
              durasi: 0, 
              count: 0, 
              kegiatanDetails: [],
              summary: {
                transportLokal: { count: 0, durasi: 0, biaya: 0 },
                dalamKota: { count: 0, durasi: 0, biaya: 0 },
                luarKota: { count: 0, durasi: 0, biaya: 0 }
              }
            };
            
            const kategori = getJenisKategori(item.jenis_perjalanan);
            existing.summary[kategori].count += 1;
            existing.summary[kategori].durasi += durasi;
            existing.summary[kategori].biaya += biaya;
            
            // Tambahkan detail kegiatan dengan data aktual dari database
            existing.kegiatanDetails.push({
              nama: item.nama_kegiatan,
              durasi: durasi,
              biaya: biaya,
              jenis_perjalanan: item.jenis_perjalanan
            });
            
            organikMap.set(item.nama_pelaksana, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1,
              kegiatanDetails: existing.kegiatanDetails,
              summary: existing.summary
            });
          }

          if (item.jenis_perjalanan) {
            const existing = jenisPerjalananMap.get(item.jenis_perjalanan) || { biaya: 0, durasi: 0, count: 0 };
            jenisPerjalananMap.set(item.jenis_perjalanan, {
              biaya: existing.biaya + biaya,
              durasi: existing.durasi + durasi,
              count: existing.count + 1
            });
          }

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

      // Simpan semua data petugas dengan detail kegiatan aktual
      const allMitraPetugasData: PetugasData[] = Array.from(mitraMap.entries())
        .map(([nama, data]) => ({
          nama,
          jumlahPerjadin: data.count,
          totalDurasi: data.durasi,
          totalBiaya: data.biaya,
          jenisPegawai: "MITRA",
          kegiatanDetails: data.kegiatanDetails,
          summary: data.summary
        }))
        .sort((a, b) => b.totalBiaya - a.totalBiaya);

      const allOrganikPetugasData: PetugasData[] = Array.from(organikMap.entries())
        .map(([nama, data]) => ({
          nama,
          jumlahPerjadin: data.count,
          totalDurasi: data.durasi,
          totalBiaya: data.biaya,
          jenisPegawai: "ORGANIK",
          kegiatanDetails: data.kegiatanDetails,
          summary: data.summary
        }))
        .sort((a, b) => b.totalBiaya - a.totalBiaya);

      setStats({
        totalPerjadin: filteredData.length,
        totalRealisasi,
        totalDurasi,
        rataRataKegiatanPerBulan: filteredData.length > 0 ? totalDurasi / filteredData.length : 0,
        rataRataAnggaranPerBulan: filteredData.length > 0 ? totalRealisasi / filteredData.length : 0,
      });

      setChartData({
        trendBulanan: trendBulananData,
        topMitra: topMitraData,
        topOrganik: topOrganikData,
        distribusiJenis: distribusiJenisData,
        distribusiSumber: distribusiSumberData
      });

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
            <CardTitle>Memuat data Perjalanan Dinas...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">Sedang memuat data Perjalanan Dinas...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredOrganikData = organikSearchQuery 
    ? allPetugasData.organik.filter(item => 
        item.nama.toLowerCase().includes(organikSearchQuery.toLowerCase()) ||
        item.kegiatanDetails.some(kegiatan => 
          kegiatan.nama.toLowerCase().includes(organikSearchQuery.toLowerCase())
        )
      )
    : allPetugasData.organik.slice(0, 15);

  const filteredMitraData = mitraSearchQuery 
    ? allPetugasData.mitra.filter(item => 
        item.nama.toLowerCase().includes(mitraSearchQuery.toLowerCase()) ||
        item.kegiatanDetails.some(kegiatan => 
          kegiatan.nama.toLowerCase().includes(mitraSearchQuery.toLowerCase())
        )
      )
    : allPetugasData.mitra.slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Data Perjalanan Dinas</CardTitle>
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
              Total Perjalanan Dinas
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
              Rata-rata per Perjalanan Dinas
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
              ? `Perkembangan biaya Perjalanan Dinas selama tahun ${filterTahun}`
              : `Perkembangan durasi Perjalanan Dinas selama tahun ${filterTahun}`
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

      {/* Distribution Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribusi Realisasi Perjadin - Organik */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Distribusi Realisasi Perjalanan Dinas - Organik
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
              Detail realisasi Perjalanan Dinas per petugas organik
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
                    <th className="text-center py-3 font-semibold">Jumlah Kegiatan</th>
                    <th className="text-right py-3 font-semibold">Total Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrganikData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
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
                        className="border-b hover:bg-muted/50 cursor-help transition-colors"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          handleShowTooltip({
                            petugas: item.nama,
                            jumlahPerjadin: item.jumlahPerjadin,
                            totalBiaya: item.totalBiaya,
                            kegiatanDetails: item.kegiatanDetails,
                            summary: item.summary
                          }, {
                            x: rect.right,
                            y: rect.top
                          });
                        }}
                        onMouseLeave={handleHideTooltip}
                      >
                        <td className="py-3 text-muted-foreground w-12">{index + 1}</td>
                        <td className="py-3 font-medium">{item.nama}</td>
                        <td className="text-center py-3">{item.jumlahPerjadin}</td>
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
                Distribusi Realisasi Perjalanan Dinas - Mitra Statistik
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
              Detail realisasi Perjalanan Dinas per mitra statistik
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
                    <th className="text-center py-3 font-semibold">Jumlah Kegiatan</th>
                    <th className="text-right py-3 font-semibold">Total Biaya</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMitraData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">
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
                        className="border-b hover:bg-muted/50 cursor-help transition-colors"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          handleShowTooltip({
                            petugas: item.nama,
                            jumlahPerjadin: item.jumlahPerjadin,
                            totalBiaya: item.totalBiaya,
                            kegiatanDetails: item.kegiatanDetails,
                            summary: item.summary
                          }, {
                            x: rect.right,
                            y: rect.top
                          });
                        }}
                        onMouseLeave={handleHideTooltip}
                      >
                        <td className="py-3 text-muted-foreground w-12">{index + 1}</td>
                        <td className="py-3 font-medium">{item.nama}</td>
                        <td className="text-center py-3">{item.jumlahPerjadin}</td>
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
        <div 
          className="perjadin-tooltip-container" 
          onMouseEnter={() => {
            if (hideTooltipTimeout.current) {
              clearTimeout(hideTooltipTimeout.current);
            }
          }} 
          onMouseLeave={handleHideTooltip}
        >
          <PerjadinTooltip data={tooltipData} position={tooltipPosition} />
        </div>
      )}
    </div>
  );
}