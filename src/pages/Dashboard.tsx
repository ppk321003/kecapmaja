import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
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
  Line
} from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity, BarChart3, AlertTriangle, Table, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";

const bulanList = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const tahunList = Array.from({ length: 9 }, (_, i) => (2022 + i).toString());

// Daftar fungsi yang tersedia
const fungsiList = [
  "Semua Fungsi",
  "Fungsi Distribusi",
  "Fungsi Produksi",
  "Fungsi Sosial",
  "Fungsi Neraca",
  "Fungsi IPDS"
];

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
  namaKegiatanList: string[];
}

// Interface untuk tooltip role
interface RoleTooltipData {
  role: string;
  totalKegiatan: number;
  totalAnggaran: number;
  petugas: string;
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

// Komponen RoleTooltip untuk hover di tabel
const RoleTooltip = ({ data, position }: { data: RoleTooltipData, position: { x: number, y: number } }) => {
  if (!data) return null;

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-64 pointer-events-none transition-opacity duration-200"
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 300),
        top: position.y - 10,
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
              minimumFractionDigits: 0,
            }).format(data.totalAnggaran)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Komponen RoleBadge dengan tooltip stabil
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
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

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

// Komponen Chart yang aman dengan format YAxis untuk Realisasi
const SafeBarChart = ({ data, title, mode }: { data: ChartItem[], title: string, mode: string }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  // Format tick untuk YAxis jika mode Realisasi
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
          name={mode === 'anggaran' ? 'Total Realisasi' : 'Jumlah Kegiatan'}
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

// Komponen Risk Matrix dengan Hover di samping kanan dan tepat di tengah
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
      </div>
      
      {data.map((item, index) => (
        <div 
          key={index} 
          className="group relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            <h4 className="font-semibold">{item.name}</h4>
            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
              <span>{item.kegiatan} jenis kegiatan</span>
              <span>Rp {item.anggaran.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskColor(item.riskLevel)}`}>
            {item.riskLevel}
          </span>
          
          {/* Hover Tooltip di samping kanan dan tepat di tengah */}
          <div className="absolute invisible group-hover:visible z-50 left-full top-1/2 transform -translate-y-1/2 ml-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <h5 className="font-semibold text-sm mb-2">Jenis Kegiatan ({item.kegiatan}):</h5>
            <div className="max-h-40 overflow-y-auto">
              <ul className="space-y-1 text-xs">
                {item.namaKegiatanList.map((kegiatan, idx) => (
                  <li key={idx} className="text-gray-700 py-1 border-b last:border-b-0">
                    • {kegiatan}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Arahkan kursor untuk melihat detail
            </div>
          </div>
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
  const [allWorkloadData, setAllWorkloadData] = useState<WorkloadData[]>([]);
  const [allRiskData, setAllRiskData] = useState<RiskData[]>([]);

  // State untuk tooltip role
  const [roleTooltipData, setRoleTooltipData] = useState<RoleTooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Ref untuk menghindari blinking
  const petugasRoleData = useRef<Map<string, Map<string, { kegiatan: number, anggaran: number }>>>(new Map());
  const allPetugasRoleData = useRef<Map<string, Map<string, { kegiatan: number, anggaran: number }>>>(new Map());
  const hideTooltipTimeout = useRef<NodeJS.Timeout>();

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

  // Fungsi untuk menampilkan tooltip
  const handleShowTooltip = (data: RoleTooltipData, position: { x: number; y: number }) => {
    if (hideTooltipTimeout.current) {
      clearTimeout(hideTooltipTimeout.current);
    }
    setRoleTooltipData(data);
    setTooltipPosition(position);
  };

  // Fungsi untuk menyembunyikan tooltip dengan delay
  const handleHideTooltip = () => {
    hideTooltipTimeout.current = setTimeout(() => {
      setRoleTooltipData(null);
    }, 100);
  };

  // Fungsi untuk memfilter data berdasarkan fungsi
  const filterDataByFungsi = () => {
    if (filterFungsi === "Semua Fungsi") {
      setWorkloadData(allWorkloadData);
      setRiskData(allRiskData);
      petugasRoleData.current = allPetugasRoleData.current;
    } else {
      // Filter workload data berdasarkan fungsi
      const filteredWorkloadData = allWorkloadData
        .map(item => {
          // Cek apakah petugas memiliki role yang sesuai dengan filter
          const hasMatchingRole = item.roles.some(role => role === filterFungsi);
          if (!hasMatchingRole) return null;

          // Hitung ulang data hanya untuk fungsi yang dipilih
          const roleMap = allPetugasRoleData.current.get(item.petugas);
          if (!roleMap) return null;

          const roleData = roleMap.get(filterFungsi);
          if (!roleData) return null;

          return {
            ...item,
            jumlahKegiatan: roleData.kegiatan,
            totalAnggaran: roleData.anggaran,
            roles: [filterFungsi] // Hanya tampilkan fungsi yang dipilih
          };
        })
        .filter((item): item is WorkloadData => item !== null)
        .sort((a, b) => b.totalAnggaran - a.totalAnggaran)
        .slice(0, 15);

      // Filter risk data berdasarkan fungsi
      const filteredRiskData = allRiskData
        .map(item => {
          const roleMap = allPetugasRoleData.current.get(item.name);
          if (!roleMap) return null;

          const roleData = roleMap.get(filterFungsi);
          if (!roleData) return null;

          let riskLevel: 'Rendah' | 'Sedang' | 'Tinggi';
          if (roleData.kegiatan < 10) {
            riskLevel = 'Rendah';
          } else if (roleData.kegiatan >= 10 && roleData.kegiatan <= 25) {
            riskLevel = 'Sedang';
          } else {
            riskLevel = 'Tinggi';
          }

          return {
            ...item,
            kegiatan: roleData.kegiatan,
            anggaran: roleData.anggaran,
            riskLevel: riskLevel
          };
        })
        .filter((item): item is RiskData => item !== null)
        .sort((a, b) => b.kegiatan - a.kegiatan)
        .slice(0, 10);

      // Filter petugas role data untuk tooltip
      const filteredPetugasRoleData = new Map<string, Map<string, { kegiatan: number; anggaran: number }>>();
      allPetugasRoleData.current.forEach((roleMap, petugas) => {
        const roleData = roleMap.get(filterFungsi);
        if (roleData) {
          const newRoleMap = new Map<string, { kegiatan: number; anggaran: number }>();
          newRoleMap.set(filterFungsi, roleData);
          filteredPetugasRoleData.set(petugas, newRoleMap);
        }
      });

      setWorkloadData(filteredWorkloadData);
      setRiskData(filteredRiskData);
      petugasRoleData.current = filteredPetugasRoleData;
    }
  };

  useEffect(() => {
    filterDataByFungsi();
  }, [filterFungsi, allWorkloadData, allRiskData]);

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

      // Maps untuk data KEGIATAN menggunakan namaKegiatanUnik
      const petugasKegiatanUnikMap = new Map<string, Set<string>>();
      const bulanKegiatanUnikMap = new Map<string, Set<string>>();
      const jenisPekerjaanKegiatanUnikMap = new Map<string, Set<string>>();
      const roleKegiatanUnikMap = new Map<string, Set<string>>();

      // Maps untuk data anggaran
      const petugasAnggaranMap = new Map<string, number>();
      const bulanAnggaranMap = new Map<string, number>();
      const jenisPekerjaanAnggaranMap = new Map<string, number>();
      const roleAnggaranMap = new Map<string, number>();

      // Maps untuk data workload dan risk
      const petugasDetailMap = new Map<string, { 
        kegiatanUnik: number, 
        totalAnggaran: number, 
        roles: Set<string>,
        namaKegiatanUnik: Set<string>,
        namaKegiatanList: string[]
      }>();

      // Map untuk data role per petugas (UNTUK TOOLTIP) - MENGGUNAKAN KEGIATAN UNIK
      const petugasRoleDetailMap = new Map<string, Map<string, { kegiatan: Set<string>; anggaran: number }>>();

      let totalKegiatanUnik = new Set<string>();
      let totalRealisasi = 0;

      filteredData.forEach((row: any[]) => {
        try {
          const periode = row[2]?.toString() || "";
          const role = row[1]?.toString() || "";
          const jenisPekerjaan = row[3]?.toString() || "";
          const namaKegiatan = row[4]?.toString() || "";
          const namaPetugas = row[14]?.toString() || "";
          const nilaiRealisasi = row[17]?.toString() || "";

          // Extract bulan dari periode
          const bulan = periode.split(' ')[0];
          
          // Parse petugas dan nilai realisasi
          const namaList = namaPetugas.split(' | ').map((n: string) => n.trim()).filter(n => n);
          const nilaiList = nilaiRealisasi.split(' | ').map(parseNilai);

          // Process data untuk setiap petugas
          namaList.forEach((nama, index) => {
            const nilai = nilaiList[index] || 0;
            
            // Inisialisasi map untuk petugas jika belum ada (UNTUK TOOLTIP)
            if (!petugasRoleDetailMap.has(nama)) {
              petugasRoleDetailMap.set(nama, new Map());
            }
            
            const roleMap = petugasRoleDetailMap.get(nama)!;
            
            // Inisialisasi data untuk role jika belum ada - MENGGUNAKAN SET UNTUK KEGIATAN UNIK
            if (!roleMap.has(role)) {
              roleMap.set(role, { kegiatan: new Set(), anggaran: 0 });
            }
            
            const roleData = roleMap.get(role)!;
            
            // Kegiatan unik per petugas
            if (!petugasKegiatanUnikMap.has(nama)) {
              petugasKegiatanUnikMap.set(nama, new Set());
            }
            if (namaKegiatan && namaKegiatan.trim() !== '') {
              petugasKegiatanUnikMap.get(nama)!.add(namaKegiatan.trim());
              // Hitung kegiatan UNIK untuk tooltip role
              roleData.kegiatan.add(namaKegiatan.trim());
            }

            // Kegiatan unik per bulan
            if (bulan && bulanList.includes(bulan)) {
              if (!bulanKegiatanUnikMap.has(bulan)) {
                bulanKegiatanUnikMap.set(bulan, new Set());
              }
              if (namaKegiatan && namaKegiatan.trim() !== '') {
                bulanKegiatanUnikMap.get(bulan)!.add(namaKegiatan.trim());
              }
            }

            // Kegiatan unik per jenis pekerjaan
            if (jenisPekerjaan) {
              if (!jenisPekerjaanKegiatanUnikMap.has(jenisPekerjaan)) {
                jenisPekerjaanKegiatanUnikMap.set(jenisPekerjaan, new Set());
              }
              if (namaKegiatan && namaKegiatan.trim() !== '') {
                jenisPekerjaanKegiatanUnikMap.get(jenisPekerjaan)!.add(namaKegiatan.trim());
              }
            }

            // Kegiatan unik per role
            if (role) {
              if (!roleKegiatanUnikMap.has(role)) {
                roleKegiatanUnikMap.set(role, new Set());
              }
              if (namaKegiatan && namaKegiatan.trim() !== '') {
                roleKegiatanUnikMap.get(role)!.add(namaKegiatan.trim());
              }
            }

            // Anggaran
            petugasAnggaranMap.set(nama, (petugasAnggaranMap.get(nama) || 0) + nilai);
            // Tambahkan anggaran untuk tooltip role
            roleData.anggaran += nilai;

            // Workload data
            if (!petugasDetailMap.has(nama)) {
              petugasDetailMap.set(nama, { 
                kegiatanUnik: 0, 
                totalAnggaran: 0, 
                roles: new Set(),
                namaKegiatanUnik: new Set(),
                namaKegiatanList: []
              });
            }
            const detail = petugasDetailMap.get(nama)!;
            if (namaKegiatan && namaKegiatan.trim() !== '') {
              detail.namaKegiatanUnik.add(namaKegiatan.trim());
              if (!detail.namaKegiatanList.includes(namaKegiatan.trim())) {
                detail.namaKegiatanList.push(namaKegiatan.trim());
              }
            }
            detail.totalAnggaran += nilai;
            
            if (role && role.trim() !== '') {
              detail.roles.add(role.trim());
            }
          });

          // Total kegiatan unik
          if (namaKegiatan && namaKegiatan.trim() !== '') {
            totalKegiatanUnik.add(namaKegiatan.trim());
          }

          // Anggaran per bulan
          if (bulan && bulanList.includes(bulan)) {
            const totalNilaiBulan = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            bulanAnggaranMap.set(bulan, (bulanAnggaranMap.get(bulan) || 0) + totalNilaiBulan);
          }

          // Anggaran per jenis pekerjaan
          if (jenisPekerjaan) {
            const totalNilaiJenis = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            jenisPekerjaanAnggaranMap.set(jenisPekerjaan, (jenisPekerjaanAnggaranMap.get(jenisPekerjaan) || 0) + totalNilaiJenis);
          }

          // Anggaran per role
          if (role) {
            const totalNilaiRole = nilaiList.reduce((sum, nilai) => sum + nilai, 0);
            roleAnggaranMap.set(role, (roleAnggaranMap.get(role) || 0) + totalNilaiRole);
          }

          totalRealisasi += nilaiList.reduce((sum, nilai) => sum + nilai, 0);

        } catch (error) {
          console.error("Error processing row:", error);
        }
      });

      // Update kegiatanUnik untuk setiap petugas
      petugasDetailMap.forEach((detail, petugas) => {
        detail.kegiatanUnik = detail.namaKegiatanUnik.size;
      });

      // Konversi petugasRoleDetailMap dari Set ke number untuk tooltip
      const petugasRoleDataFinal = new Map<string, Map<string, { kegiatan: number; anggaran: number }>>();
      petugasRoleDetailMap.forEach((roleMap, petugas) => {
        const convertedRoleMap = new Map<string, { kegiatan: number; anggaran: number }>();
        roleMap.forEach((roleData, role) => {
          convertedRoleMap.set(role, {
            kegiatan: roleData.kegiatan.size, // Menggunakan size dari Set (kegiatan unik)
            anggaran: roleData.anggaran
          });
        });
        petugasRoleDataFinal.set(petugas, convertedRoleMap);
      });

      // Prepare chart data untuk KEGIATAN menggunakan data unik
      const petugasKegiatanData: ChartItem[] = Array.from(petugasKegiatanUnikMap.entries())
        .map(([name, kegiatanSet]) => ({ name, value: kegiatanSet.size }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const bulanKegiatanData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: bulanKegiatanUnikMap.get(bulan)?.size || 0
      }));

      const jenisPekerjaanKegiatanData: ChartItem[] = Array.from(jenisPekerjaanKegiatanUnikMap.entries())
        .map(([name, kegiatanSet]) => ({ name, value: kegiatanSet.size }))
        .sort((a, b) => b.value - a.value);

      const roleKegiatanData: ChartItem[] = Array.from(roleKegiatanUnikMap.entries())
        .map(([name, kegiatanSet]) => ({ name, value: kegiatanSet.size }))
        .sort((a, b) => b.value - a.value);

      const petugasAnggaranData: ChartItem[] = Array.from(petugasAnggaranMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

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

      // Prepare workload data - Top 15 Petugas (SEMUA FUNGSI)
      const workloadDataArray: WorkloadData[] = Array.from(petugasDetailMap.entries())
        .map(([petugas, detail]) => ({
          petugas,
          jumlahKegiatan: detail.kegiatanUnik,
          totalAnggaran: detail.totalAnggaran,
          roles: Array.from(detail.roles)
        }))
        .sort((a, b) => b.totalAnggaran - a.totalAnggaran)
        .slice(0, 15);

      // Prepare risk data - Top 10 dan sort by jumlah kegiatan terbanyak (SEMUA FUNGSI)
      const riskDataArray: RiskData[] = Array.from(petugasDetailMap.entries())
        .map(([petugas, detail]) => {
          const jumlahNamaKegiatanUnik = detail.kegiatanUnik;
          
          let riskLevel: 'Rendah' | 'Sedang' | 'Tinggi';
          
          if (jumlahNamaKegiatanUnik < 10) {
            riskLevel = 'Rendah';
          } else if (jumlahNamaKegiatanUnik >= 10 && jumlahNamaKegiatanUnik <= 25) {
            riskLevel = 'Sedang';
          } else {
            riskLevel = 'Tinggi';
          }

          return {
            name: petugas,
            kegiatan: jumlahNamaKegiatanUnik,
            anggaran: detail.totalAnggaran,
            riskLevel: riskLevel,
            namaKegiatanList: detail.namaKegiatanList.sort()
          };
        })
        .sort((a, b) => b.kegiatan - a.kegiatan)
        .slice(0, 10);

      // Hitung stats menggunakan data unik
      const validBulanKegiatan = getValidBulanForSlow(filterTahun, bulanKegiatanData);
      const validBulanAnggaran = getValidBulanForSlow(filterTahun, bulanAnggaranData);

      const bulanPeakKegiatan = bulanKegiatanData.length > 0 
        ? bulanKegiatanData.reduce((max, current) => current.value > max.value ? current : max)
        : { name: "-", value: 0 };
      
      const bulanSlowKegiatan = validBulanKegiatan.length > 0
        ? validBulanKegiatan.reduce((min, current) => current.value < min.value ? current : min)
        : { name: "-", value: 0 };

      const bulanPeakAnggaran = bulanAnggaranData.length > 0 
        ? bulanAnggaranData.reduce((max, current) => current.value > max.value ? current : max)
        : { name: "-", value: 0 };
      
      const bulanSlowAnggaran = validBulanAnggaran.length > 0
        ? validBulanAnggaran.reduce((min, current) => current.value < min.value ? current : min)
        : { name: "-", value: 0 };

      // Rumus rata-rata menggunakan data unik
      const totalKegiatanValidBulan = validBulanKegiatan.reduce((sum, item) => sum + item.value, 0);
      const rataRataKegiatanPerBulan = validBulanKegiatan.length > 0 
        ? Math.round(totalKegiatanValidBulan / validBulanKegiatan.length)
        : 0;

      const totalAnggaranValidBulan = validBulanAnggaran.reduce((sum, item) => sum + item.value, 0);
      const rataRataAnggaranPerBulan = validBulanAnggaran.length > 0 
        ? Math.round(totalAnggaranValidBulan / validBulanAnggaran.length)
        : 0;

      // Total kegiatan menggunakan data unik
      const totalKegiatan = totalKegiatanUnik.size;

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

      // Simpan semua data untuk filtering
      setAllWorkloadData(workloadDataArray);
      setAllRiskData(riskDataArray);
      setWorkloadData(workloadDataArray);
      setRiskData(riskDataArray);
      
      allPetugasRoleData.current = petugasRoleDataFinal;
      petugasRoleData.current = petugasRoleDataFinal;

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

  // Cleanup timeout saat component unmount
  useEffect(() => {
    return () => {
      if (hideTooltipTimeout.current) {
        clearTimeout(hideTooltipTimeout.current);
      }
    };
  }, []);

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
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'kegiatan' | 'anggaran')}>
            <TabsList>
              <TabsTrigger value="anggaran" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Berdasarkan Realisasi
              </TabsTrigger>
              <TabsTrigger value="kegiatan" className="flex items-center gap-2">
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
                <SelectItem key={tahun} value={tahun}>
                  {tahun}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics dengan warna yang elegan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              {viewMode === 'kegiatan' ? 'Total Kegiatan' : 'Total Realisasi'}
            </CardTitle>
            {viewMode === 'kegiatan' ? (
              <Activity className="h-4 w-4 text-blue-600" />
            ) : (
              <DollarSign className="h-4 w-4 text-blue-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {viewMode === 'kegiatan' 
                ? stats.totalKegiatan.toLocaleString('id-ID')
                : formatRupiah(stats.totalRealisasi)
              }
            </div>
            <p className="text-xs text-blue-700">
              Tahun {filterTahun}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              {viewMode === 'kegiatan' ? 'Rata-rata Kegiatan per Bulan' : 'Rata-rata Realisasi per Bulan'}
            </CardTitle>
            {viewMode === 'kegiatan' ? (
              <Calendar className="h-4 w-4 text-green-600" />
            ) : (
              <DollarSign className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {viewMode === 'kegiatan' 
                ? stats.rataRataKegiatanPerBulan.toLocaleString('id-ID')
                : formatRupiah(stats.rataRataAnggaranPerBulan)
              }
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
              {viewMode === 'kegiatan' 
                ? `${stats.bulanPeakKegiatan.name} (${stats.bulanPeakKegiatan.value})`
                : `${stats.bulanPeakAnggaran.name} (${formatRupiah(stats.bulanPeakAnggaran.value)})`
              }
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
              {viewMode === 'kegiatan' 
                ? `${stats.bulanSlowKegiatan.name} (${stats.bulanSlowKegiatan.value})`
                : `${stats.bulanSlowAnggaran.name} (${formatRupiah(stats.bulanSlowAnggaran.value)})`
              }
            </div>
            <p className="text-xs text-orange-700">
              {viewMode === 'kegiatan' ? 'Kegiatan terendah' : 'Realisasi terendah'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Top Mitra Statistik Berdasarkan Kegiatan' 
                : 'Top Mitra Statistik Berdasarkan Realisasi'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart 
              data={currentData.petugas} 
              title={viewMode === 'kegiatan' ? 'Jumlah Kegiatan' : 'Total Realisasi'}
              mode={viewMode}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Distribusi Kegiatan per Bulan' 
                : 'Distribusi Realisasi per Bulan'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBarChart 
              data={currentData.bulan} 
              title={viewMode === 'kegiatan' ? 'Jumlah Kegiatan' : 'Total Realisasi'}
              mode={viewMode}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Kegiatan per Jenis Pekerjaan' 
                : 'Realisasi per Jenis Pekerjaan'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart 
              data={currentData.jenisPekerjaan} 
              title={viewMode === 'kegiatan' ? 'Jenis Pekerjaan' : 'Realisasi per Jenis'}
              mode={viewMode}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'kegiatan' 
                ? 'Distribusi per Penanggung Jawab Kegiatan' 
                : 'Realisasi per Penanggung Jawab Kegiatan'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SafePieChart 
              data={currentData.role} 
              title={viewMode === 'kegiatan' ? 'Role' : 'Realisasi per Penanggung Jawab Kegiatan'}
              mode={viewMode}
            />
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
          <CardDescription>
            Melihat pola musiman dan prediksi kebutuhan ke depan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SafeLineChart 
            data={currentData.bulan} 
            title={viewMode === 'kegiatan' ? 'Trend Kegiatan' : 'Trend Realisasi'}
            mode={viewMode}
          />
        </CardContent>
      </Card>

      {/* Filter Fungsi untuk Risk Assessment dan Workload Distribution */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analisis Detail</h2>
          <p className="text-muted-foreground mt-1">
            Analisis mendalam berdasarkan fungsi dan risiko
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
                  <SelectItem key={fungsi} value={fungsi}>
                    {fungsi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid untuk Risk Assessment dan Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Risk Assessment dengan Hover */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Assesmen Risiko - {filterFungsi}
            </CardTitle>
            <CardDescription>
              {filterFungsi === "Semua Fungsi" 
                ? "Top 10 Mitra Statistik dengan jumlah jenis kegiatan terbanyak - Hover untuk melihat detail"
                : `Top 10 Mitra Statistik untuk ${filterFungsi} - Hover untuk melihat detail`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RiskMatrix data={riskData} mode={viewMode} />
          </CardContent>
        </Card>

        {/* Workload Distribution Table - Top 15 Petugas dengan Hover Role */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table className="h-5 w-5" />
              Distribusi Realisasi Honor - Top 15 Mitra Statistik {filterFungsi !== "Semua Fungsi" ? `- ${filterFungsi}` : ""}
            </CardTitle>
            <CardDescription>
              {filterFungsi === "Semua Fungsi"
                ? "Tabel detail distribusi realisasi honor per mitra statistik - Hover pada Penanggung Jawab Kegiatan untuk melihat detail per fungsi"
                : `Tabel detail distribusi realisasi honor untuk ${filterFungsi} - Hover untuk melihat detail`
              }
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
                  {workloadData.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 text-muted-foreground w-12">{index + 1}</td>
                      <td className="py-3 font-medium">{item.petugas}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.roles.map((role, roleIndex) => {
                            const roleData = petugasRoleData.current.get(item.petugas)?.get(role);
                            return (
                              <RoleBadge
                                key={roleIndex}
                                role={role}
                                petugas={item.petugas}
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
                  ))}
                </tbody>
              </table>
              
              {/* Render Role Tooltip */}
              {roleTooltipData && (
                <RoleTooltip data={roleTooltipData} position={tooltipPosition} />
              )}
            </div>
            {workloadData.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">
                  {filterFungsi === "Semua Fungsi" 
                    ? "Tidak ada data untuk ditampilkan" 
                    : `Tidak ada data untuk ${filterFungsi}`
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}