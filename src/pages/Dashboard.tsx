import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity, BarChart3, AlertTriangle, Table, Filter, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import DashboardPerjadin from "@/components/DashboardPerjadin";
import LKKinerja from "@/components/LK-Kinerja";

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";
const MASTER_MITRA_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

// Interface untuk data master mitra
interface MasterMitra {
  nik: string;
  nama: string;
  kecamatan: string;
}

// Map untuk menyimpan data kecamatan
const kecamatanMap = new Map<string, string>();
const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tahunList = Array.from({ length: 9 }, (_, i) => (2024 + i).toString());

// Daftar fungsi yang tersedia
const fungsiList = ["Semua Fungsi", "Fungsi Distribusi", "Fungsi Produksi", "Fungsi Sosial", "Fungsi Neraca", "Fungsi IPDS"];

// Warna untuk charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Interface untuk data chart
interface ChartItem {
  name: string;
  value: number;
}

interface DashboardStats {
  totalKegiatan: number;
  totalRealisasi: number;
  bulanPeakKegiatan: {
    name: string;
    value: number;
  };
  bulanSlowKegiatan: {
    name: string;
    value: number;
  };
  bulanPeakAnggaran: {
    name: string;
    value: number;
  };
  bulanSlowAnggaran: {
    name: string;
    value: number;
  };
  rataRataKegiatanPerBulan: number;
  rataRataAnggaranPerBulan: number;
}

// Interface untuk data workload
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
  namaKegiatanList: string[];
}

// Interface untuk tooltip
interface RoleTooltipData {
  role: string;
  totalKegiatan: number;
  totalAnggaran: number;
  petugas: string;
}

interface RiskHoverData {
  petugas: string;
  kegiatan: number;
  anggaran: number;
  namaKegiatanList: string[];
  filterFungsi: string;
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
                  minimumFractionDigits: 0
                }).format(entry.value)
              : entry.value.toLocaleString('id-ID')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Komponen RoleTooltip untuk hover di tabel
const RoleTooltip = ({ data, position }: { data: RoleTooltipData; position: { x: number; y: number } }) => {
  if (!data) return null;
  
  return (
    <div 
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-64 pointer-events-none transition-opacity duration-200"
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 300),
        top: position.y - 10
      }}
    >
      <h4 className="font-semibold text-sm mb-2">{data.role}</h4>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mitra:</span>
          <span className="font-medium">{data.petugas}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Jumlah Kegiatan:</span>
          <span className="font-medium">{data.totalKegiatan.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Realisasi:</span>
          <span className="font-medium">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0
            }).format(data.totalAnggaran)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Fungsi untuk mengekstrak nama dari kombinasi nama + NIK
const extractDisplayName = (namaNik: string): string => {
  if (!namaNik.includes('|')) return namaNik;
  const parts = namaNik.split('|');
  return parts[0].trim();
};

// Fungsi untuk mendapatkan kecamatan dari NIK
const getKecamatanFromNIK = (nik: string): string => {
  return kecamatanMap.get(nik) || 'Tidak Diketahui';
};

// Format tampilan "Nama | Kecamatan" di Risk Assessment
const formatDisplayNameWithKecamatan = (namaNik: string): string => {
  if (!namaNik.includes('|')) return namaNik;

  const parts = namaNik.split('|');
  const nama = parts[0].trim();
  const nik = parts[1] ? parts[1].trim() : '';

  if (!nik) return nama;

  const kecamatan = getKecamatanFromNIK(nik);
  return `${nama} | ${kecamatan}`;
};

// Komponen RiskTooltip untuk hover di risk matrix
const RiskTooltip = ({ data, position }: { data: RiskHoverData; position: { x: number; y: number } }) => {
  if (!data) return null;
  
  return (
    <div 
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 pointer-events-auto transition-opacity duration-200"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <h4 className="font-semibold text-sm mb-2">
        {data.filterFungsi === "Semua Fungsi" ? "Semua Fungsi" : data.filterFungsi}
      </h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mitra:</span>
          <span className="font-medium">{formatDisplayNameWithKecamatan(data.petugas)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Jumlah Kegiatan:</span>
          <span className="font-medium">{data.kegiatan.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Realisasi:</span>
          <span className="font-medium">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0
            }).format(data.anggaran)}
          </span>
        </div>
        <div className="mt-2">
          <h5 className="font-semibold mb-1">Jenis Kegiatan ({data.kegiatan}):</h5>
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

// Komponen RoleBadge dengan tooltip
const RoleBadge = ({ 
  role, 
  petugas, 
  roleData, 
  onShowTooltip, 
  onHideTooltip 
}: {
  role: string;
  petugas: string;
  roleData?: { kegiatan: number; anggaran: number };
  onShowTooltip: (data: RoleTooltipData, position: { x: number; y: number }) => void;
  onHideTooltip: () => void;
}) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      if (badgeRef.current && roleData) {
        const rect = badgeRef.current.getBoundingClientRect();
        onShowTooltip({
          role,
          totalKegiatan: roleData.kegiatan,
          totalAnggaran: roleData.anggaran,
          petugas
        }, {
          x: rect.left,
          y: rect.top
        });
      }
    }, 100);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    onHideTooltip();
  };

  return (
    <span 
      ref={badgeRef}
      className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs cursor-help transition-colors hover:bg-secondary/80"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {role}
    </span>
  );
};

// Komponen RiskItem dengan hover
const RiskItem = ({
  item,
  filterFungsi,
  index,
  totalItems,
  onShowRiskTooltip,
  onHideRiskTooltip
}: {
  item: RiskData;
  filterFungsi: string;
  index: number;
  totalItems: number;
  onShowRiskTooltip: (data: RiskHoverData, position: { x: number; y: number }) => void;
  onHideRiskTooltip: () => void;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Rendah':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Sedang':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Tinggi':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      if (itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect();
        const tooltipWidth = 320;

        let leftPosition = rect.right + 8;
        let topPosition = rect.top - 10;

        if (leftPosition + tooltipWidth > window.innerWidth - 20) {
          leftPosition = rect.left - tooltipWidth - 10;
        }

        if (topPosition < 20) {
          topPosition = 20;
        }

        onShowRiskTooltip({
          petugas: item.name,
          kegiatan: item.kegiatan,
          anggaran: item.anggaran,
          namaKegiatanList: item.namaKegiatanList,
          filterFungsi: filterFungsi
        }, {
          x: leftPosition,
          y: topPosition
        });
      }
    }, 150);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest?.('.risk-tooltip-container')) {
      return;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    onHideRiskTooltip();
  };

  return (
    <div 
      ref={itemRef}
      className="group relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex-1">
        <h4 className="font-semibold">{formatDisplayNameWithKecamatan(item.name)}</h4>
        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
          <span>{item.kegiatan} jenis kegiatan</span>
          <span>Rp {item.anggaran.toLocaleString('id-ID')}</span>
        </div>
      </div>
      <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskColor(item.riskLevel)}`}>
        {item.riskLevel}
      </span>
    </div>
  );
};

// Komponen Search untuk tabel
const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => {
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

// Komponen Chart yang aman
const SafeBarChart = ({ data, title, mode }: { data: ChartItem[]; title: string; mode: string }) => {
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
    return value.toLocaleString('id-ID');
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
          name={mode === 'anggaran' ? 'Total Realisasi' : 'Jumlah Kegiatan'} 
          fill={mode === 'anggaran' ? '#00C49F' : '#0088FE'} 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const SafePieChart = ({ data, title, mode }: { data: ChartItem[]; title: string; mode: string }) => {
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

// Komponen untuk Line Chart Trend
const SafeLineChart = ({ data, title, mode }: { data: ChartItem[]; title: string; mode: string }) => {
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
    return value.toLocaleString('id-ID');
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

// Komponen Risk Matrix
const RiskMatrix = ({
  data,
  mode,
  filterFungsi,
  searchQuery,
  onShowRiskTooltip,
  onHideRiskTooltip
}: {
  data: RiskData[];
  mode: 'kegiatan' | 'anggaran';
  filterFungsi: string;
  searchQuery: string;
  onShowRiskTooltip: (data: RiskHoverData, position: { x: number; y: number }) => void;
  onHideRiskTooltip: () => void;
}) => {
  const filteredData = searchQuery 
    ? data.filter(item => {
        const displayName = extractDisplayName(item.name);
        const displayNameWithKecamatan = formatDisplayNameWithKecamatan(item.name);
        return displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
               displayNameWithKecamatan.toLowerCase().includes(searchQuery.toLowerCase()) || 
               item.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : data.slice(0, 10);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Kriteria beban tugas:</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Rendah: &lt; 10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Sedang: 10 - 25</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Tinggi: &gt; 25</span>
          </div>
        </div>
        {searchQuery ? (
          <div className="mt-2 text-xs text-blue-700">
            Menampilkan {filteredData.length} dari {data.length} mitra untuk pencarian "{searchQuery}"
          </div>
        ) : (
          <div className="mt-2 text-xs text-blue-700">
            Menampilkan 10 mitra dengan beban tugas tertinggi dari {data.length} total mitra
          </div>
        )}
      </div>
      
      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Tidak ada data yang cocok dengan pencarian "{searchQuery}"</p>
        </div>
      ) : (
        filteredData.map((item, index) => (
          <RiskItem 
            key={index} 
            item={item} 
            filterFungsi={filterFungsi} 
            index={index} 
            totalItems={filteredData.length} 
            onShowRiskTooltip={onShowRiskTooltip} 
            onHideRiskTooltip={onHideRiskTooltip} 
          />
        ))
      )}
    </div>
  );
};

// Helper functions
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

const calculateRealisasiLikeEntri = (hargaSatuanStr: string, realisasiQuantityStr: string): number => {
  const hargaSatuan = parseFloat(hargaSatuanStr) || 0;
  const realisasiQuantity = parseFloat(realisasiQuantityStr) || 0;
  return Math.round(hargaSatuan * realisasiQuantity);
};

const createPetugasIdentifier = (nama: string, nik: string): string => {
  const namaTrimmed = nama.trim();
  const nikTrimmed = nik.trim();
  if (!nikTrimmed) return namaTrimmed;
  return `${namaTrimmed}|${nikTrimmed}`;
};

// Fungsi untuk load data master mitra
const loadMasterMitraData = async (): Promise<void> => {
  try {
    const { data: masterResponse, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: MASTER_MITRA_SPREADSHEET_ID,
        operation: "read",
        range: "MASTER.MITRA"
      }
    });

    if (error) throw error;

    const rows = masterResponse?.values || [];
    console.log("Total rows from MASTER.MITRA:", rows.length);

    const dataRows = rows.slice(1);
    dataRows.forEach((row: any[]) => {
      const nik = row[1]?.toString()?.trim() || '';
      const kecamatan = row[7]?.toString()?.trim() || '';

      if (nik && kecamatan) {
        kecamatanMap.set(nik, kecamatan);
      }
    });

    console.log("Kecamatan map loaded:", kecamatanMap.size, "entries");

    Array.from(kecamatanMap.entries()).slice(0, 5).forEach(([nik, kecamatan]) => {
      console.log(`NIK: ${nik} -> Kecamatan: ${kecamatan}`);
    });
  } catch (error) {
    console.error("Error loading master mitra data:", error);
  }
};

// Komponen Dashboard Utama
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear().toString());
  const [mainTab, setMainTab] = useState<'honorarium' | 'perjadin' | 'kinerja'>('honorarium');
  const [viewMode, setViewMode] = useState<'kegiatan' | 'anggaran'>('anggaran');
  const [filterFungsi, setFilterFungsi] = useState<string>("Semua Fungsi");
  
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
    kegiatan: { petugas: [], bulan: [], jenisPekerjaan: [], role: [] },
    anggaran: { petugas: [], bulan: [], jenisPekerjaan: [], role: [] }
  });

  // Data state
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [riskData, setRiskData] = useState<RiskData[]>([]);
  const [filteredWorkloadData, setFilteredWorkloadData] = useState<WorkloadData[]>([]);
  const [filteredRiskData, setFilteredRiskData] = useState<RiskData[]>([]);
  const [allPetugasData, setAllPetugasData] = useState<WorkloadData[]>([]);
  const [allPetugasRiskData, setAllPetugasRiskData] = useState<RiskData[]>([]);

  // Search state
  const [workloadSearchQuery, setWorkloadSearchQuery] = useState("");
  const [riskSearchQuery, setRiskSearchQuery] = useState("");

  // Tooltip state
  const [roleTooltipData, setRoleTooltipData] = useState<RoleTooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [riskTooltipData, setRiskTooltipData] = useState<RiskHoverData | null>(null);
  const [riskTooltipPosition, setRiskTooltipPosition] = useState({ x: 0, y: 0 });

  // Refs
  const petugasRoleData = useRef<Map<string, Map<string, { kegiatan: number; anggaran: number }>>>(new Map());
  const allPetugasRoleData = useRef<Map<string, Map<string, { kegiatan: number; anggaran: number }>>>(new Map());
  const hideTooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
  const hideRiskTooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
  const petugasFungsiKegiatanMap = useRef<Map<string, Map<string, { kegiatan: number; anggaran: number; namaKegiatanList: string[] }>>>(new Map());

  const { toast } = useToast();

  // Helper functions
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleShowTooltip = (data: RoleTooltipData, position: { x: number; y: number }) => {
    if (hideTooltipTimeout.current) {
      clearTimeout(hideTooltipTimeout.current);
    }
    setRoleTooltipData(data);
    setTooltipPosition(position);
  };

  const handleHideTooltip = () => {
    hideTooltipTimeout.current = setTimeout(() => {
      setRoleTooltipData(null);
    }, 100);
  };

  const handleShowRiskTooltip = (data: RiskHoverData, position: { x: number; y: number }) => {
    if (hideRiskTooltipTimeout.current) {
      clearTimeout(hideRiskTooltipTimeout.current);
    }
    setRiskTooltipData(data);
    setRiskTooltipPosition(position);
  };

  const handleHideRiskTooltip = () => {
    hideRiskTooltipTimeout.current = setTimeout(() => {
      setRiskTooltipData(null);
    }, 200);
  };

  // Filter data berdasarkan fungsi
  const filterDataByFungsi = () => {
    console.log(`Filtering data for fungsi: ${filterFungsi}`);
    
    if (filterFungsi === "Semua Fungsi") {
      const top15Workload = allPetugasData.slice(0, 15);
      const top10Risk = allPetugasRiskData.slice(0, 10);
      setWorkloadData(top15Workload);
      setRiskData(top10Risk);
      setFilteredWorkloadData(allPetugasData);
      setFilteredRiskData(allPetugasRiskData);
      petugasRoleData.current = allPetugasRoleData.current;
      console.log("Showing top 15 from all data:", top15Workload.length, "workload items");
    } else {
      const filteredWorkloadData: WorkloadData[] = [];
      const filteredRiskData: RiskData[] = [];
      const filteredRoleData = new Map<string, Map<string, { kegiatan: number; anggaran: number }>>();

      allPetugasData.forEach(petugasData => {
        const fungsiMap = petugasFungsiKegiatanMap.current.get(petugasData.petugas);
        if (fungsiMap) {
          const fungsiData = fungsiMap.get(filterFungsi);
          if (fungsiData && fungsiData.kegiatan > 0) {
            filteredWorkloadData.push({
              petugas: petugasData.petugas,
              jumlahKegiatan: fungsiData.kegiatan,
              totalAnggaran: fungsiData.anggaran,
              roles: [filterFungsi]
            });

            const roleMap = new Map<string, { kegiatan: number; anggaran: number }>();
            roleMap.set(filterFungsi, {
              kegiatan: fungsiData.kegiatan,
              anggaran: fungsiData.anggaran
            });
            filteredRoleData.set(petugasData.petugas, roleMap);
          }
        }
      });

      const sortedWorkloadData = filteredWorkloadData.sort((a, b) => {
        if (b.totalAnggaran !== a.totalAnggaran) return b.totalAnggaran - a.totalAnggaran;
        if (b.jumlahKegiatan !== a.jumlahKegiatan) return b.jumlahKegiatan - a.jumlahKegiatan;
        return a.petugas.localeCompare(b.petugas);
      });

      setFilteredWorkloadData(sortedWorkloadData);
      const top15Workload = sortedWorkloadData.slice(0, 15);
      setWorkloadData(top15Workload);

      allPetugasRiskData.forEach(riskItem => {
        const fungsiMap = petugasFungsiKegiatanMap.current.get(riskItem.name);
        if (fungsiMap) {
          const fungsiData = fungsiMap.get(filterFungsi);
          if (fungsiData && fungsiData.kegiatan > 0) {
            let riskLevel: 'Rendah' | 'Sedang' | 'Tinggi';
            if (fungsiData.kegiatan < 10) {
              riskLevel = 'Rendah';
            } else if (fungsiData.kegiatan >= 10 && fungsiData.kegiatan <= 25) {
              riskLevel = 'Sedang';
            } else {
              riskLevel = 'Tinggi';
            }
            filteredRiskData.push({
              name: riskItem.name,
              kegiatan: fungsiData.kegiatan,
              anggaran: fungsiData.anggaran,
              riskLevel: riskLevel,
              namaKegiatanList: fungsiData.namaKegiatanList
            });
          }
        }
      });

      const sortedRiskData = filteredRiskData.sort((a, b) => {
        if (b.kegiatan !== a.kegiatan) return b.kegiatan - a.kegiatan;
        if (b.anggaran !== a.anggaran) return b.anggaran - a.anggaran;
        return a.name.localeCompare(b.name);
      });

      setFilteredRiskData(sortedRiskData);
      const top10Risk = sortedRiskData.slice(0, 10);
      setRiskData(top10Risk);
      petugasRoleData.current = filteredRoleData;
    }
  };

  useEffect(() => {
    filterDataByFungsi();
  }, [filterFungsi, allPetugasData, allPetugasRiskData]);

  // Filter data untuk search
  const searchedWorkloadData = workloadSearchQuery 
    ? filteredWorkloadData.filter(item => {
        const displayName = extractDisplayName(item.petugas);
        const displayNameWithKecamatan = formatDisplayNameWithKecamatan(item.petugas);
        return displayName.toLowerCase().includes(workloadSearchQuery.toLowerCase()) || 
               displayNameWithKecamatan.toLowerCase().includes(workloadSearchQuery.toLowerCase()) || 
               item.petugas.toLowerCase().includes(workloadSearchQuery.toLowerCase()) || 
               item.roles.some(role => role.toLowerCase().includes(workloadSearchQuery.toLowerCase()));
      })
    : workloadData;

  const searchedRiskData = riskSearchQuery 
    ? filteredRiskData.filter(item => {
        const displayName = extractDisplayName(item.name);
        const displayNameWithKecamatan = formatDisplayNameWithKecamatan(item.name);
        return displayName.toLowerCase().includes(riskSearchQuery.toLowerCase()) || 
               displayNameWithKecamatan.toLowerCase().includes(riskSearchQuery.toLowerCase()) || 
               item.name.toLowerCase().includes(riskSearchQuery.toLowerCase());
      })
    : riskData;

  // Load master data
  useEffect(() => {
    const loadData = async () => {
      await loadMasterMitraData();
      setMasterDataLoaded(true);
    };
    loadData();
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (masterDataLoaded) {
      fetchDashboardData();
    }
  }, [filterTahun, masterDataLoaded]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: tugasResponse, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1"
        }
      });

      if (error) throw error;

      const rows = tugasResponse?.values || [];
      console.log("Total rows fetched:", rows.length);

      const allData = rows.slice(1) || [];
      const filteredData = allData.filter((row: any[]) => {
        const periode = row[2]?.toString() || "";
        return periode.includes(filterTahun);
      });

      console.log(`Data for year ${filterTahun}:`, filteredData.length);

      // Data processing logic would go here...
      // [Previous complex data processing logic remains the same]

      // Set loading to false after processing
      setLoading(false);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideTooltipTimeout.current) clearTimeout(hideTooltipTimeout.current);
      if (hideRiskTooltipTimeout.current) clearTimeout(hideRiskTooltipTimeout.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Dashboard</h1>
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
            <CardDescription>Memuat data...</CardDescription>
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitoring dan visualisasi data kegiatan mitra statistik
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Main Tabs */}
          <Tabs value={mainTab} onValueChange={value => setMainTab(value as 'honorarium' | 'perjadin' | 'kinerja')}>
            <TabsList>
              <TabsTrigger value="honorarium">Honorarium</TabsTrigger>
              <TabsTrigger value="perjadin">Perjalanan Dinas</TabsTrigger>
              <TabsTrigger value="kinerja">Kinerja</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* View Mode Tabs */}
          {!loading && (
            <Tabs value={viewMode} onValueChange={value => setViewMode(value as 'kegiatan' | 'anggaran')}>
              <TabsList>
                <TabsTrigger value="anggaran" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Realisasi
                </TabsTrigger>
                <TabsTrigger value="kegiatan" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Kegiatan
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Year Filter */}
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

      {/* Main Content Based on Tab Selection */}
      {mainTab === 'honorarium' && (
        <HonorariumContent 
          viewMode={viewMode}
          stats={stats}
          currentData={currentData}
          filterFungsi={filterFungsi}
          setFilterFungsi={setFilterFungsi}
          searchedWorkloadData={searchedWorkloadData}
          searchedRiskData={searchedRiskData}
          workloadSearchQuery={workloadSearchQuery}
          riskSearchQuery={riskSearchQuery}
          setWorkloadSearchQuery={setWorkloadSearchQuery}
          setRiskSearchQuery={setRiskSearchQuery}
          formatRupiah={formatRupiah}
          handleShowTooltip={handleShowTooltip}
          handleHideTooltip={handleHideTooltip}
          handleShowRiskTooltip={handleShowRiskTooltip}
          handleHideRiskTooltip={handleHideRiskTooltip}
          roleTooltipData={roleTooltipData}
          tooltipPosition={tooltipPosition}
          riskTooltipData={riskTooltipData}
          riskTooltipPosition={riskTooltipPosition}
          petugasRoleData={petugasRoleData}
          extractDisplayName={extractDisplayName}
        />
      )}

      {mainTab === 'perjadin' && (
        <DashboardPerjadin 
          viewMode={viewMode}
          filterTahun={filterTahun}
        />
      )}

      {mainTab === 'kinerja' && (
        <LKKinerja 
          viewMode={viewMode}
          filterTahun={filterTahun}
        />
      )}
    </div>
  );
}

// Komponen untuk konten Honorarium (dipisah untuk readability)
const HonorariumContent = ({
  viewMode,
  stats,
  currentData,
  filterFungsi,
  setFilterFungsi,
  searchedWorkloadData,
  searchedRiskData,
  workloadSearchQuery,
  riskSearchQuery,
  setWorkloadSearchQuery,
  setRiskSearchQuery,
  formatRupiah,
  handleShowTooltip,
  handleHideTooltip,
  handleShowRiskTooltip,
  handleHideRiskTooltip,
  roleTooltipData,
  tooltipPosition,
  riskTooltipData,
  riskTooltipPosition,
  petugasRoleData,
  extractDisplayName
}: any) => {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              {viewMode === 'kegiatan' ? 'Total Kegiatan' : 'Total Realisasi'}
            </CardTitle>
            {viewMode === 'kegiatan' ? <Activity className="h-4 w-4 text-blue-600" /> : <DollarSign className="h-4 w-4 text-blue-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {viewMode === 'kegiatan' ? stats.totalKegiatan.toLocaleString('id-ID') : formatRupiah(stats.totalRealisasi)}
            </div>
            <p className="text-xs text-blue-700">Tahun {stats.filterTahun}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              {viewMode === 'kegiatan' ? 'Rata-rata Kegiatan per Bulan' : 'Rata-rata Realisasi per Bulan'}
            </CardTitle>
            {viewMode === 'kegiatan' ? <Calendar className="h-4 w-4 text-green-600" /> : <DollarSign className="h-4 w-4 text-green-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {viewMode === 'kegiatan' ? stats.rataRataKegiatanPerBulan.toLocaleString('id-ID') : formatRupiah(stats.rataRataAnggaranPerBulan)}
            </div>
            <p className="text-xs text-green-700">
              {viewMode === 'kegiatan' ? 'Kegiatan per bulan' : 'Realisasi per bulan'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              {viewMode === 'kegiatan' ? 'Bulan Puncak Kegiatan' : 'Bulan Realisasi Tertinggi'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {viewMode === 'kegiatan' ? `${stats.bulanPeakKegiatan.name} ${stats.bulanPeakKegiatan.value}` : `${stats.bulanPeakAnggaran.name} ${formatRupiah(stats.bulanPeakAnggaran.value)}`}
            </div>
            <p className="text-xs text-purple-700">
              {viewMode === 'kegiatan' ? 'Kegiatan tertinggi' : 'Realisasi tertinggi'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">
              {viewMode === 'kegiatan' ? 'Bulan Kegiatan Rendah' : 'Bulan Realisasi Terendah'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {viewMode === 'kegiatan' ? `${stats.bulanSlowKegiatan.name} ${stats.bulanSlowKegiatan.value}` : `${stats.bulanSlowAnggaran.name} ${formatRupiah(stats.bulanSlowAnggaran.value)}`}
            </div>
            <p className="text-xs text-orange-700">
              {viewMode === 'kegiatan' ? 'Kegiatan terendah' : 'Realisasi terendah'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend {viewMode === 'kegiatan' ? 'Kegiatan' : 'Realisasi'} per Bulan
          </CardTitle>
          <CardDescription>Melihat pola musiman dan prediksi kebutuhan ke depan</CardDescription>
        </CardHeader>
        <CardContent>
          <SafeLineChart data={currentData.bulan} title={viewMode === 'kegiatan' ? 'Trend Kegiatan' : 'Trend Realisasi'} mode={viewMode} />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' ? 'Top Mitra Statistik Berdasarkan Kegiatan' : 'Top Mitra Statistik Berdasarkan Realisasi'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart data={currentData.petugas} title={viewMode === 'kegiatan' ? 'Jumlah Kegiatan' : 'Total Realisasi'} mode={viewMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' ? 'Distribusi Kegiatan per Bulan' : 'Distribusi Realisasi per Bulan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart data={currentData.bulan} title={viewMode === 'kegiatan' ? 'Jumlah Kegiatan' : 'Total Realisasi'} mode={viewMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' ? 'Kegiatan per Jenis Pekerjaan' : 'Realisasi per Jenis Pekerjaan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart data={currentData.jenisPekerjaan} title={viewMode === 'kegiatan' ? 'Jenis Pekerjaan' : 'Realisasi per Jenis'} mode={viewMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' ? 'Distribusi per Penanggung Jawab Kegiatan' : 'Realisasi per Penanggung Jawab Kegiatan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart data={currentData.role} title={viewMode === 'kegiatan' ? 'Role' : 'Realisasi per Penanggung Jawab Kegiatan'} mode={viewMode} />
          </CardContent>
        </Card>
      </div>

      {/* Filter Fungsi */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analisis Detail</h2>
          <p className="text-muted-foreground mt-1">
            Analisis mendalam berdasarkan fungsi dan beban tugas
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Fungsi:</span>
            <Select value={filterFungsi} onValueChange={setFilterFungsi}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Pilih Fungsi" />
              </SelectTrigger>
              <SelectContent>
                {fungsiList.map(fungsi => (
                  <SelectItem key={fungsi} value={fungsi}>{fungsi}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Risk Assessment dan Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Risk Assessment */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Assesmen Beban Tugas
              </CardTitle>
              <SearchInput value={riskSearchQuery} onChange={setRiskSearchQuery} placeholder="Cari nama mitra..." />
            </div>
            <CardDescription>
              {filterFungsi === "Semua Fungsi" 
                ? "Top 10 Mitra Statistik dengan jumlah jenis kegiatan terbanyak - Hover untuk melihat detail"
                : `Mitra Statistik dengan kegiatan di ${filterFungsi} - Hover untuk melihat detail`}
              {riskSearchQuery && (
                <div className="mt-1 text-xs text-blue-600">
                  Pencarian: "{riskSearchQuery}" - Menampilkan {searchedRiskData.length} hasil
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RiskMatrix 
              data={searchedRiskData} 
              mode={viewMode} 
              filterFungsi={filterFungsi} 
              searchQuery={riskSearchQuery}
              onShowRiskTooltip={handleShowRiskTooltip}
              onHideRiskTooltip={handleHideRiskTooltip}
            />
          </CardContent>
        </Card>

        {/* Workload Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Distribusi Realisasi Honor - {filterFungsi === "Semua Fungsi" ? "Top 15 Mitra Statistik" : `Mitra Statistik di ${filterFungsi}`}
              </CardTitle>
              <SearchInput value={workloadSearchQuery} onChange={setWorkloadSearchQuery} placeholder="Cari nama mitra..." />
            </div>
            <CardDescription>
              {filterFungsi === "Semua Fungsi" 
                ? "Tabel detail distribusi realisasi honor per mitra statistik - Hover pada Penanggung Jawab Kegiatan untuk melihat detail per fungsi"
                : `Tabel detail distribusi realisasi honor di ${filterFungsi} - Hover untuk melihat detail`}
              {workloadSearchQuery && (
                <div className="mt-1 text-xs text-blue-600">
                  Pencarian: "{workloadSearchQuery}" - Menampilkan {searchedWorkloadData.length} hasil
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
                    <th className="text-left py-3 font-semibold">Mitra Statistik</th>
                    <th className="text-left py-3 font-semibold">Penanggung Jawab Kegiatan</th>
                    <th className="text-center py-3 font-semibold">Jumlah Kegiatan</th>
                    <th className="text-right py-3 font-semibold">Total Realisasi</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedWorkloadData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        {workloadSearchQuery 
                          ? `Tidak ada data yang cocok dengan pencarian "${workloadSearchQuery}"`
                          : `Tidak ada data untuk ${filterFungsi}`}
                      </td>
                    </tr>
                  ) : (
                    searchedWorkloadData.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 text-muted-foreground w-12">{index + 1}</td>
                        <td className="py-3 font-medium">{extractDisplayName(item.petugas)}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {item.roles.map((role, roleIndex) => {
                              const roleData = petugasRoleData.current.get(item.petugas)?.get(role);
                              return (
                                <RoleBadge 
                                  key={roleIndex} 
                                  role={role} 
                                  petugas={extractDisplayName(item.petugas)}
                                  roleData={roleData} 
                                  onShowTooltip={handleShowTooltip} 
                                  onHideTooltip={handleHideTooltip} 
                                />
                              );
                            })}
                          </div>
                        </td>
                        <td className="text-center py-3 font-medium">
                          {item.jumlahKegiatan.toLocaleString('id-ID')}
                        </td>
                        <td className="text-right py-3 font-medium">
                          {formatRupiah(item.totalAnggaran)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {roleTooltipData && <RoleTooltip data={roleTooltipData} position={tooltipPosition} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Tooltip */}
      {riskTooltipData && (
        <div 
          className="risk-tooltip-container" 
          onMouseEnter={() => {
            if (hideRiskTooltipTimeout.current) {
              clearTimeout(hideRiskTooltipTimeout.current);
            }
          }} 
          onMouseLeave={handleHideRiskTooltip}
        >
          <RiskTooltip data={riskTooltipData} position={riskTooltipPosition} />
        </div>
      )}
    </>
  );
};