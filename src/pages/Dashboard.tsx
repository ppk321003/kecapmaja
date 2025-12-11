import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, TooltipProps } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { TrendingUp, Calendar, DollarSign, Activity, BarChart3, AlertTriangle, Table, Filter, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import DashboardPerjadin from "@/components/DashboardPerjadin";
import LKKinerja from "@/components/LK-Kinerja";
const TUGAS_SPREADSHEET_ID = "1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA";
const MASTER_MITRA_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

// PERBAIKAN UTAMA: Interface untuk data master mitra
interface MasterMitra {
  nik: string;
  nama: string;
  kecamatan: string;
}

// PERBAIKAN UTAMA: Map untuk menyimpan data kecamatan
const kecamatanMap = new Map<string, string>();
const bulanList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tahunList = Array.from({
  length: 9
}, (_, i) => (2024 + i).toString());

// Daftar fungsi yang tersedia
const fungsiList = ["Semua Fungsi", "Fungsi Distribusi", "Fungsi Produksi", "Fungsi Sosial", "Fungsi Neraca", "Fungsi IPDS"];

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

// Interface untuk data hover risk matrix
interface RiskHoverData {
  petugas: string;
  kegiatan: number;
  anggaran: number;
  namaKegiatanList: string[];
  filterFungsi: string;
}

// Custom Tooltip untuk currency dengan format yang lebih baik
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
              : entry.value.toLocaleString('id-ID')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Create typed currency tooltip component factory
const CurrencyTooltipContent = ({ mode }: { mode: 'anggaran' | 'kegiatan' }) => (props: TooltipProps<ValueType, NameType>) => (
  <CurrencyTooltip {...props} mode={mode} />
);

// Komponen RoleTooltip untuk hover di tabel
const RoleTooltip = ({
  data,
  position
}: {
  data: RoleTooltipData;
  position: {
    x: number;
    y: number;
  };
}) => {
  if (!data) return null;
  return <div className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-64 pointer-events-none transition-opacity duration-200" style={{
    left: Math.min(position.x + 10, window.innerWidth - 300),
    top: position.y - 10
  }}>
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
    </div>;
};

// PERBAIKAN UTAMA: Fungsi untuk mengekstrak nama dari kombinasi nama + NIK untuk tampilan UI
const extractDisplayName = (namaNik: string): string => {
  // Jika tidak mengandung pipe, kembalikan string asli
  if (!namaNik.includes('|')) return namaNik;

  // Split dan ambil bagian nama saja (sebelum pipe pertama)
  const parts = namaNik.split('|');
  return parts[0].trim();
};

// PERBAIKAN UTAMA: Fungsi untuk mendapatkan kecamatan dari NIK
const getKecamatanFromNIK = (nik: string): string => {
  return kecamatanMap.get(nik) || 'Tidak Diketahui';
};

// FUNGSI BARU: Untuk format tampilan "Nama | Kecamatan" di Risk Assessment
const formatDisplayNameWithKecamatan = (namaNik: string): string => {
  // Jika tidak mengandung pipe, kembalikan string asli
  if (!namaNik.includes('|')) return namaNik;

  // Split dan ambil nama dan NIK
  const parts = namaNik.split('|');
  const nama = parts[0].trim();
  const nik = parts[1] ? parts[1].trim() : '';

  // Jika tidak ada NIK, kembalikan hanya nama
  if (!nik) return nama;

  // Dapatkan kecamatan dari NIK
  const kecamatan = getKecamatanFromNIK(nik);
  return `${nama} | ${kecamatan}`;
};

// Komponen RiskTooltip untuk hover di risk matrix - POSISI DI SAMPING BARIS
const RiskTooltip = ({
  data,
  position
}: {
  data: RiskHoverData;
  position: {
    x: number;
    y: number;
  };
}) => {
  if (!data) return null;
  return <div className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 pointer-events-auto transition-opacity duration-200" style={{
    left: position.x,
    top: position.y
  }}>
      <h4 className="font-semibold text-sm mb-2">
        {data.filterFungsi === "Semua Fungsi" ? "Semua Fungsi" : data.filterFungsi}
      </h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mitra:</span>
          {/* PERUBAHAN: Format tampilan menjadi "Nama | Kecamatan" */}
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
              {data.namaKegiatanList.map((kegiatan, idx) => <li key={idx} className="text-gray-700 py-1 border-b last:border-b-0">
                  • {kegiatan}
                </li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>;
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
  roleData?: {
    kegiatan: number;
    anggaran: number;
  };
  onShowTooltip: (data: RoleTooltipData, position: {
    x: number;
    y: number;
  }) => void;
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
  return <span ref={badgeRef} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs cursor-help transition-colors hover:bg-secondary/80" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {role}
    </span>;
};

// Komponen RiskItem dengan hover yang stabil - POSISI DI SAMPING BARIS DENGAN SEDIKIT GESER KE KIRI
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
  onShowRiskTooltip: (data: RiskHoverData, position: {
    x: number;
    y: number;
  }) => void;
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

        // POSISI TOOLTIP DI SEBELAH KANAN BARIS DENGAN JARAK SEDIKIT - GESER SEDIKIT KE KIRI
        let leftPosition = rect.right + 8; // 8px dari sebelah kanan baris (dikurangi dari 15px)
        let topPosition = rect.top - 10; // Sedikit di atas baris

        // Jika tooltip terlalu ke kanan, posisikan di kiri baris
        if (leftPosition + tooltipWidth > window.innerWidth - 20) {
          leftPosition = rect.left - tooltipWidth - 10;
        }

        // Jika tooltip terlalu ke bawah, adjust posisi vertikal
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
  return <div ref={itemRef} className="group relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-help" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="flex-1">
        {/* PERUBAHAN: Format tampilan menjadi "Nama | Kecamatan" */}
        <h4 className="font-semibold">{formatDisplayNameWithKecamatan(item.name)}</h4>
        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
          <span>{item.kegiatan} jenis kegiatan</span>
          <span>Rp {item.anggaran.toLocaleString('id-ID')}</span>
        </div>
      </div>
      <span className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskColor(item.riskLevel)}`}>
        {item.riskLevel}
      </span>
    </div>;
};

// Komponen Search untuk tabel
const SearchInput = ({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => {
  return <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="pl-10 pr-4 py-2 w-full max-w-xs" />
    </div>;
};

// Komponen Chart yang aman dengan format YAxis untuk Realisasi
const SafeBarChart = ({
  data,
  title,
  mode
}: {
  data: ChartItem[];
  title: string;
  mode: string;
}) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>;
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
  return <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
        <YAxis tickFormatter={formatYAxisTick} fontSize={12} />
        <Tooltip content={CurrencyTooltipContent({ mode: mode as 'anggaran' | 'kegiatan' })} />
        <Legend />
        <Bar dataKey="value" name={mode === 'anggaran' ? 'Total Realisasi' : 'Jumlah Kegiatan'} fill={mode === 'anggaran' ? '#00C49F' : '#0088FE'} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>;
};
const SafePieChart = ({
  data,
  title,
  mode
}: {
  data: ChartItem[];
  title: string;
  mode: string;
}) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>;
  }
  return <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({
        name,
        percent
      }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip content={CurrencyTooltipContent({ mode: mode as 'anggaran' | 'kegiatan' })} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>;
};

// Komponen untuk Line Chart Trend dengan format YAxis
const SafeLineChart = ({
  data,
  title,
  mode
}: {
  data: ChartItem[];
  title: string;
  mode: string;
}) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>;
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
  return <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
        <YAxis tickFormatter={formatYAxisTick} fontSize={12} />
        <Tooltip content={CurrencyTooltipContent({ mode: mode as 'anggaran' | 'kegiatan' })} />
        <Legend />
        <Line type="monotone" dataKey="value" name={mode === 'anggaran' ? 'Trend Realisasi' : 'Trend Kegiatan'} stroke={mode === 'anggaran' ? '#00C49F' : '#0088FE'} strokeWidth={3} dot={{
        r: 4
      }} activeDot={{
        r: 6
      }} />
      </LineChart>
    </ResponsiveContainer>;
};

// Komponen Risk Matrix dengan Hover yang stabil
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
  onShowRiskTooltip: (data: RiskHoverData, position: {
    x: number;
    y: number;
  }) => void;
  onHideRiskTooltip: () => void;
}) => {
  // PERBAIKAN: Filter data berdasarkan search query dari data lengkap
  const filteredData = searchQuery ? data.filter(item => {
    const displayName = extractDisplayName(item.name);
    const displayNameWithKecamatan = formatDisplayNameWithKecamatan(item.name);
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) || displayNameWithKecamatan.toLowerCase().includes(searchQuery.toLowerCase()) || item.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) : data.slice(0, 10); // Tampilkan top 10 jika tidak ada search

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan</p>
      </div>;
  }
  return <div className="space-y-3">
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
        {searchQuery ? <div className="mt-2 text-xs text-blue-700">
            Menampilkan {filteredData.length} dari {data.length} mitra untuk pencarian "{searchQuery}"
          </div> : <div className="mt-2 text-xs text-blue-700">
            Menampilkan 10 mitra dengan beban tugas tertinggi dari {data.length} total mitra
          </div>}
      </div>
      
      {filteredData.length === 0 ? <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Tidak ada data yang cocok dengan pencarian "{searchQuery}"</p>
        </div> : filteredData.map((item, index) => <RiskItem key={index} item={item} filterFungsi={filterFungsi} index={index} totalItems={filteredData.length} onShowRiskTooltip={onShowRiskTooltip} onHideRiskTooltip={onHideRiskTooltip} />)}
    </div>;
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

// PERBAIKAN UTAMA: Fungsi untuk menghitung realisasi seperti entri target
const calculateRealisasiLikeEntri = (hargaSatuanStr: string, realisasiQuantityStr: string): number => {
  const hargaSatuan = parseFloat(hargaSatuanStr) || 0;
  const realisasiQuantity = parseFloat(realisasiQuantityStr) || 0;
  return Math.round(hargaSatuan * realisasiQuantity);
};

// PERBAIKAN UTAMA: Fungsi untuk membuat identifier unik nama + NIK
const createPetugasIdentifier = (nama: string, nik: string): string => {
  const namaTrimmed = nama.trim();
  const nikTrimmed = nik.trim();
  if (!nikTrimmed) return namaTrimmed;
  return `${namaTrimmed}|${nikTrimmed}`;
};

// PERBAIKAN UTAMA: Fungsi untuk load data master mitra
const loadMasterMitraData = async (): Promise<void> => {
  try {
    const {
      data: masterResponse,
      error
    } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: MASTER_MITRA_SPREADSHEET_ID,
        operation: "read",
        range: "MASTER.MITRA"
      }
    });
    if (error) throw error;
    const rows = masterResponse?.values || [];
    console.log("Total rows from MASTER.MITRA:", rows.length);

    // Skip header row (row 0)
    const dataRows = rows.slice(1);
    dataRows.forEach((row: any[]) => {
      const nik = row[1]?.toString()?.trim() || ''; // Kolom NIK
      const kecamatan = row[7]?.toString()?.trim() || ''; // Kolom Kecamatan (index 7)

      if (nik && kecamatan) {
        kecamatanMap.set(nik, kecamatan);
      }
    });
    console.log("Kecamatan map loaded:", kecamatanMap.size, "entries");

    // Log beberapa contoh data
    Array.from(kecamatanMap.entries()).slice(0, 5).forEach(([nik, kecamatan]) => {
      console.log(`NIK: ${nik} -> Kecamatan: ${kecamatan}`);
    });
  } catch (error) {
    console.error("Error loading master mitra data:", error);
  }
};
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
    bulanPeakKegiatan: {
      name: "-",
      value: 0
    },
    bulanSlowKegiatan: {
      name: "-",
      value: 0
    },
    bulanPeakAnggaran: {
      name: "-",
      value: 0
    },
    bulanSlowAnggaran: {
      name: "-",
      value: 0
    },
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

  // Data untuk grafik dan filtering
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [riskData, setRiskData] = useState<RiskData[]>([]);

  // PERBAIKAN UTAMA: Data lengkap yang sudah difilter berdasarkan fungsi (untuk search)
  const [filteredWorkloadData, setFilteredWorkloadData] = useState<WorkloadData[]>([]);
  const [filteredRiskData, setFilteredRiskData] = useState<RiskData[]>([]);

  // DATA MENTAH untuk filtering - PERBAIKAN UTAMA
  const [allPetugasData, setAllPetugasData] = useState<WorkloadData[]>([]);
  const [allPetugasRiskData, setAllPetugasRiskData] = useState<RiskData[]>([]);

  // State untuk search
  const [workloadSearchQuery, setWorkloadSearchQuery] = useState("");
  const [riskSearchQuery, setRiskSearchQuery] = useState("");

  // State untuk tooltip role
  const [roleTooltipData, setRoleTooltipData] = useState<RoleTooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0
  });

  // State untuk tooltip risk matrix
  const [riskTooltipData, setRiskTooltipData] = useState<RiskHoverData | null>(null);
  const [riskTooltipPosition, setRiskTooltipPosition] = useState({
    x: 0,
    y: 0
  });

  // Ref untuk menghindari blinking
  const petugasRoleData = useRef<Map<string, Map<string, {
    kegiatan: number;
    anggaran: number;
  }>>>(new Map());
  const allPetugasRoleData = useRef<Map<string, Map<string, {
    kegiatan: number;
    anggaran: number;
  }>>>(new Map());
  const hideTooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
  const hideRiskTooltipTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Map untuk menyimpan data kegiatan per fungsi per petugas
  const petugasFungsiKegiatanMap = useRef<Map<string, Map<string, {
    kegiatan: number;
    anggaran: number;
    namaKegiatanList: string[];
  }>>>(new Map());
  const {
    toast
  } = useToast();

  // Format currency helper
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Fungsi untuk menampilkan tooltip role
  const handleShowTooltip = (data: RoleTooltipData, position: {
    x: number;
    y: number;
  }) => {
    if (hideTooltipTimeout.current) {
      clearTimeout(hideTooltipTimeout.current);
    }
    setRoleTooltipData(data);
    setTooltipPosition(position);
  };

  // Fungsi untuk menyembunyikan tooltip role dengan delay
  const handleHideTooltip = () => {
    hideTooltipTimeout.current = setTimeout(() => {
      setRoleTooltipData(null);
    }, 100);
  };

  // Fungsi untuk menampilkan tooltip risk matrix
  const handleShowRiskTooltip = (data: RiskHoverData, position: {
    x: number;
    y: number;
  }) => {
    if (hideRiskTooltipTimeout.current) {
      clearTimeout(hideRiskTooltipTimeout.current);
    }
    setRiskTooltipData(data);
    setRiskTooltipPosition(position);
  };

  // Fungsi untuk menyembunyikan tooltip risk matrix dengan delay
  const handleHideRiskTooltip = () => {
    hideRiskTooltipTimeout.current = setTimeout(() => {
      setRiskTooltipData(null);
    }, 200);
  };

  // PERBAIKAN UTAMA: Filter data berdasarkan fungsi
  const filterDataByFungsi = () => {
    console.log(`Filtering data for fungsi: ${filterFungsi}`);
    if (filterFungsi === "Semua Fungsi") {
      // Untuk "Semua Fungsi", tampilkan top 15 untuk workload dan top 10 untuk risk
      const top15Workload = allPetugasData.slice(0, 15);
      const top10Risk = allPetugasRiskData.slice(0, 10);
      setWorkloadData(top15Workload);
      setRiskData(top10Risk);

      // Simpan data lengkap untuk search
      setFilteredWorkloadData(allPetugasData);
      setFilteredRiskData(allPetugasRiskData);
      petugasRoleData.current = allPetugasRoleData.current;
      console.log("Showing top 15 from all data:", top15Workload.length, "workload items");
    } else {
      // PERBAIKAN UTAMA: Filter data berdasarkan fungsi yang dipilih
      const filteredWorkloadData: WorkloadData[] = [];
      const filteredRiskData: RiskData[] = [];
      const filteredRoleData = new Map<string, Map<string, {
        kegiatan: number;
        anggaran: number;
      }>>();
      console.log("All petugas data count:", allPetugasData.length);
      console.log("Petugas fungsi map size:", petugasFungsiKegiatanMap.current.size);

      // Iterasi melalui semua petugas di data mentah
      allPetugasData.forEach(petugasData => {
        const fungsiMap = petugasFungsiKegiatanMap.current.get(petugasData.petugas);
        if (fungsiMap) {
          const fungsiData = fungsiMap.get(filterFungsi);
          // PERBAIKAN: Hanya tambahkan jika petugas memiliki data untuk fungsi yang dipilih
          if (fungsiData && fungsiData.kegiatan > 0) {
            console.log(`Adding ${petugasData.petugas} to filtered data with ${fungsiData.kegiatan} kegiatan`);

            // PERBAIKAN UTAMA: Hanya tampilkan fungsi yang dipilih di kolom roles
            filteredWorkloadData.push({
              petugas: petugasData.petugas,
              jumlahKegiatan: fungsiData.kegiatan,
              totalAnggaran: fungsiData.anggaran,
              roles: [filterFungsi] // HANYA tampilkan fungsi yang dipilih
            });

            // Tambahkan ke role data untuk tooltip
            const roleMap = new Map<string, {
              kegiatan: number;
              anggaran: number;
            }>();
            roleMap.set(filterFungsi, {
              kegiatan: fungsiData.kegiatan,
              anggaran: fungsiData.anggaran
            });
            filteredRoleData.set(petugasData.petugas, roleMap);
          }
        }
      });

      // PERBAIKAN: Urutkan berdasarkan totalAnggaran DESC, jumlahKegiatan DESC, nama ASC
      const sortedWorkloadData = filteredWorkloadData.sort((a, b) => {
        if (b.totalAnggaran !== a.totalAnggaran) {
          return b.totalAnggaran - a.totalAnggaran;
        }
        if (b.jumlahKegiatan !== a.jumlahKegiatan) {
          return b.jumlahKegiatan - a.jumlahKegiatan;
        }
        return a.petugas.localeCompare(b.petugas);
      });

      // Simpan data lengkap yang sudah difilter untuk search
      setFilteredWorkloadData(sortedWorkloadData);

      // Tampilkan hanya top 15 untuk workload
      const top15Workload = sortedWorkloadData.slice(0, 15);
      setWorkloadData(top15Workload);

      // Filter risk data dari seluruh data mentah
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

      // PERBAIKAN: Urutkan risk data berdasarkan jumlah kegiatan DESC, anggaran DESC, nama ASC
      const sortedRiskData = filteredRiskData.sort((a, b) => {
        if (b.kegiatan !== a.kegiatan) {
          return b.kegiatan - a.kegiatan;
        }
        if (b.anggaran !== a.anggaran) {
          return b.anggaran - a.anggaran;
        }
        return a.name.localeCompare(b.name);
      });

      // Simpan data lengkap yang sudah difilter untuk search
      setFilteredRiskData(sortedRiskData);

      // Tampilkan hanya top 10 untuk risk
      const top10Risk = sortedRiskData.slice(0, 10);
      setRiskData(top10Risk);
      petugasRoleData.current = filteredRoleData;
      console.log(`Filtered data - Full Workload: ${sortedWorkloadData.length}, Display Workload: ${top15Workload.length}`);
      console.log(`Filtered data - Full Risk: ${sortedRiskData.length}, Display Risk: ${top10Risk.length}`);
    }
  };
  useEffect(() => {
    filterDataByFungsi();
  }, [filterFungsi, allPetugasData, allPetugasRiskData]);

  // PERBAIKAN: Filter data untuk search dari data lengkap yang sudah difilter
  const searchedWorkloadData = workloadSearchQuery ? filteredWorkloadData.filter(item => {
    const displayName = extractDisplayName(item.petugas);
    const displayNameWithKecamatan = formatDisplayNameWithKecamatan(item.petugas);
    return displayName.toLowerCase().includes(workloadSearchQuery.toLowerCase()) || displayNameWithKecamatan.toLowerCase().includes(workloadSearchQuery.toLowerCase()) || item.petugas.toLowerCase().includes(workloadSearchQuery.toLowerCase()) || item.roles.some(role => role.toLowerCase().includes(workloadSearchQuery.toLowerCase()));
  }) : workloadData; // Gunakan top 15 jika tidak ada search

  const searchedRiskData = riskSearchQuery ? filteredRiskData.filter(item => {
    const displayName = extractDisplayName(item.name);
    const displayNameWithKecamatan = formatDisplayNameWithKecamatan(item.name);
    return displayName.toLowerCase().includes(riskSearchQuery.toLowerCase()) || displayNameWithKecamatan.toLowerCase().includes(riskSearchQuery.toLowerCase()) || item.name.toLowerCase().includes(riskSearchQuery.toLowerCase());
  }) : riskData; // Gunakan top 10 jika tidak ada search

  // PERBAIKAN UTAMA: Load master data terlebih dahulu
  useEffect(() => {
    const loadData = async () => {
      await loadMasterMitraData();
      setMasterDataLoaded(true);
    };
    loadData();
  }, []);

  // PERBAIKAN UTAMA: Fetch data dashboard setelah master data loaded
  useEffect(() => {
    if (masterDataLoaded) {
      fetchDashboardData();
    }
  }, [filterTahun, masterDataLoaded]);

  // PERBAIKAN UTAMA: Fetch data dengan perhitungan realisasi yang sama seperti entri target
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const {
        data: tugasResponse,
        error
      } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: TUGAS_SPREADSHEET_ID,
          operation: "read",
          range: "Sheet1"
        }
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

      // Maps untuk data KEGIATAN
      const kegiatanUnikGlobal = new Set<string>();
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
        kegiatanUnik: number;
        totalAnggaran: number;
        roles: Set<string>;
        namaKegiatanUnik: Set<string>;
        namaKegiatanList: string[];
      }>();

      // Map untuk data role per petugas (UNTUK TOOLTIP)
      const petugasRoleDetailMap = new Map<string, Map<string, {
        kegiatan: Set<string>;
        anggaran: number;
      }>>();

      // PERBAIKAN UTAMA: Map untuk data per fungsi per petugas
      const petugasFungsiDetailMap = new Map<string, Map<string, {
        kegiatan: Set<string>;
        anggaran: number;
        namaKegiatanList: string[];
      }>>();
      let totalRealisasi = 0;

      // PERBAIKAN UTAMA: Proses data dengan perhitungan realisasi seperti entri target
      filteredData.forEach((row: any[], rowIndex) => {
        try {
          const role = row[1]?.toString() || "";
          const periode = row[2]?.toString() || "";
          const jenisPekerjaan = row[3]?.toString() || "";
          const namaKegiatan = row[4]?.toString() || "";
          const namaPetugas = row[13]?.toString() || "";
          const realisasiStr = row[15]?.toString() || ""; // Kolom realisasi quantity
          const hargaSatuan = row[9]?.toString() || "0"; // Kolom harga satuan
          const nik = row[22]?.toString() || ""; // PERBAIKAN UTAMA: Kolom NIK

          // Extract bulan dari periode
          const bulanMatch = periode.match(/^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)/i);
          const bulan = bulanMatch ? bulanMatch[1] : "";

          // PERBAIKAN UTAMA: Parse petugas dan hitung realisasi seperti entri target
          const namaList = namaPetugas.split(/\s*\|\s*/).map((n: string) => n.trim()).filter(n => n && n !== '');
          const realisasiList = realisasiStr.split(/\s*\|\s*/).map((s: string) => s.trim()).filter(Boolean);
          const nikList = nik.split(/\s*\|\s*/).map((n: string) => n.trim()).filter(n => n && n !== '');

          // PERBAIKAN UTAMA: Hitung nilai realisasi untuk setiap petugas seperti entri target
          const nilaiRealisasiList = realisasiList.map((realisasiQty, index) => {
            return calculateRealisasiLikeEntri(hargaSatuan, realisasiQty);
          });

          // Validasi: pastikan jumlah petugas dan nilai sama
          const validNilaiList = nilaiRealisasiList.length === namaList.length ? nilaiRealisasiList : Array(namaList.length).fill(0).map((_, i) => nilaiRealisasiList[i] || 0);

          // Buat identifier unik untuk kegiatan
          const kegiatanUnikId = `${namaKegiatan.trim()}`;
          const kegiatanDetailId = `${namaKegiatan.trim()}|${jenisPekerjaan.trim()}|${bulan}`;

          // Tambahkan ke global set untuk total kegiatan
          if (namaKegiatan.trim()) {
            kegiatanUnikGlobal.add(kegiatanUnikId);
          }

          // Process data untuk setiap petugas
          namaList.forEach((nama, index) => {
            // PERBAIKAN UTAMA: Gunakan identifier nama + NIK
            const nikPetugas = nikList[index] || "";
            const petugasIdentifier = createPetugasIdentifier(nama, nikPetugas);

            // PERBAIKAN UTAMA: Gunakan nilai realisasi yang dihitung seperti entri target
            const nilai = validNilaiList[index] || 0;
            const namaNormalized = petugasIdentifier;
            if (!nama.trim()) return;

            // Inisialisasi map untuk petugas jika belum ada
            if (!petugasRoleDetailMap.has(namaNormalized)) {
              petugasRoleDetailMap.set(namaNormalized, new Map());
            }
            const roleMap = petugasRoleDetailMap.get(namaNormalized)!;

            // Inisialisasi data untuk role jika belum ada
            if (!roleMap.has(role)) {
              roleMap.set(role, {
                kegiatan: new Set(),
                anggaran: 0
              });
            }
            const roleData = roleMap.get(role)!;

            // PERBAIKAN UTAMA: Inisialisasi map untuk fungsi per petugas
            if (!petugasFungsiDetailMap.has(namaNormalized)) {
              petugasFungsiDetailMap.set(namaNormalized, new Map());
            }
            const fungsiMap = petugasFungsiDetailMap.get(namaNormalized)!;
            if (!fungsiMap.has(role)) {
              fungsiMap.set(role, {
                kegiatan: new Set(),
                anggaran: 0,
                namaKegiatanList: []
              });
            }
            const fungsiData = fungsiMap.get(role)!;

            // Kegiatan unik per petugas
            if (!petugasKegiatanUnikMap.has(namaNormalized)) {
              petugasKegiatanUnikMap.set(namaNormalized, new Set());
            }
            if (namaKegiatan && namaKegiatan.trim() !== '') {
              const petugasKegiatanSet = petugasKegiatanUnikMap.get(namaNormalized)!;
              if (!petugasKegiatanSet.has(kegiatanUnikId)) {
                petugasKegiatanSet.add(kegiatanUnikId);
                // Hitung kegiatan UNIK untuk tooltip role
                roleData.kegiatan.add(kegiatanUnikId);
                // Hitung kegiatan UNIK untuk fungsi
                fungsiData.kegiatan.add(kegiatanUnikId);
                if (!fungsiData.namaKegiatanList.includes(namaKegiatan.trim())) {
                  fungsiData.namaKegiatanList.push(namaKegiatan.trim());
                }
              }
            }

            // Kegiatan unik per bulan
            if (bulan && bulanList.includes(bulan)) {
              if (!bulanKegiatanUnikMap.has(bulan)) {
                bulanKegiatanUnikMap.set(bulan, new Set());
              }
              if (namaKegiatan && namaKegiatan.trim() !== '') {
                bulanKegiatanUnikMap.get(bulan)!.add(kegiatanDetailId);
              }
            }

            // Kegiatan unik per jenis pekerjaan
            if (jenisPekerjaan) {
              if (!jenisPekerjaanKegiatanUnikMap.has(jenisPekerjaan)) {
                jenisPekerjaanKegiatanUnikMap.set(jenisPekerjaan, new Set());
              }
              if (namaKegiatan && namaKegiatan.trim() !== '') {
                jenisPekerjaanKegiatanUnikMap.get(jenisPekerjaan)!.add(kegiatanDetailId);
              }
            }

            // Kegiatan unik per role
            if (role) {
              if (!roleKegiatanUnikMap.has(role)) {
                roleKegiatanUnikMap.set(role, new Set());
              }
              if (namaKegiatan && namaKegiatan.trim() !== '') {
                roleKegiatanUnikMap.get(role)!.add(kegiatanDetailId);
              }
            }

            // PERBAIKAN UTAMA: Anggaran - gunakan nilai realisasi yang dihitung seperti entri target
            const currentAnggaran = petugasAnggaranMap.get(namaNormalized) || 0;
            petugasAnggaranMap.set(namaNormalized, currentAnggaran + nilai);

            // Tambahkan anggaran untuk tooltip role
            roleData.anggaran += nilai;
            // Tambahkan anggaran untuk fungsi
            fungsiData.anggaran += nilai;

            // Workload data
            if (!petugasDetailMap.has(namaNormalized)) {
              petugasDetailMap.set(namaNormalized, {
                kegiatanUnik: 0,
                totalAnggaran: 0,
                roles: new Set(),
                namaKegiatanUnik: new Set(),
                namaKegiatanList: []
              });
            }
            const detail = petugasDetailMap.get(namaNormalized)!;
            if (namaKegiatan && namaKegiatan.trim() !== '') {
              if (!detail.namaKegiatanUnik.has(kegiatanUnikId)) {
                detail.namaKegiatanUnik.add(kegiatanUnikId);
                if (!detail.namaKegiatanList.includes(namaKegiatan.trim())) {
                  detail.namaKegiatanList.push(namaKegiatan.trim());
                }
              }
            }
            // PERBAIKAN UTAMA: Gunakan nilai realisasi yang dihitung
            detail.totalAnggaran += nilai;
            if (role && role.trim() !== '') {
              detail.roles.add(role.trim());
            }
          });

          // PERBAIKAN UTAMA: Anggaran per bulan - gunakan nilai realisasi yang dihitung
          if (bulan && bulanList.includes(bulan)) {
            const totalNilaiBulan = validNilaiList.reduce((sum, nilai) => sum + nilai, 0);
            const currentBulanAnggaran = bulanAnggaranMap.get(bulan) || 0;
            bulanAnggaranMap.set(bulan, currentBulanAnggaran + totalNilaiBulan);
          }

          // PERBAIKAN UTAMA: Anggaran per jenis pekerjaan - gunakan nilai realisasi yang dihitung
          if (jenisPekerjaan) {
            const totalNilaiJenis = validNilaiList.reduce((sum, nilai) => sum + nilai, 0);
            const currentJenisAnggaran = jenisPekerjaanAnggaranMap.get(jenisPekerjaan) || 0;
            jenisPekerjaanAnggaranMap.set(jenisPekerjaan, currentJenisAnggaran + totalNilaiJenis);
          }

          // PERBAIKAN UTAMA: Anggaran per role - gunakan nilai realisasi yang dihitung
          if (role) {
            const totalNilaiRole = validNilaiList.reduce((sum, nilai) => sum + nilai, 0);
            const currentRoleAnggaran = roleAnggaranMap.get(role) || 0;
            roleAnggaranMap.set(role, currentRoleAnggaran + totalNilaiRole);
          }

          // PERBAIKAN UTAMA: Total realisasi - gunakan nilai realisasi yang dihitung
          totalRealisasi += validNilaiList.reduce((sum, nilai) => sum + nilai, 0);
        } catch (error) {
          console.error(`Error processing row ${rowIndex}:`, error, row);
        }
      });

      // Update kegiatanUnik untuk setiap petugas
      petugasDetailMap.forEach((detail, petugas) => {
        detail.kegiatanUnik = detail.namaKegiatanUnik.size;
      });
      console.log("Total kegiatan unik global:", kegiatanUnikGlobal.size);
      console.log("Petugas processed:", petugasDetailMap.size);
      console.log("Total realisasi (calculated like entri):", totalRealisasi);

      // Konversi petugasRoleDetailMap dari Set ke number untuk tooltip
      const petugasRoleDataFinal = new Map<string, Map<string, {
        kegiatan: number;
        anggaran: number;
      }>>();
      petugasRoleDetailMap.forEach((roleMap, petugas) => {
        const convertedRoleMap = new Map<string, {
          kegiatan: number;
          anggaran: number;
        }>();
        roleMap.forEach((roleData, role) => {
          convertedRoleMap.set(role, {
            kegiatan: roleData.kegiatan.size,
            anggaran: roleData.anggaran
          });
        });
        petugasRoleDataFinal.set(petugas, convertedRoleMap);
      });

      // PERBAIKAN UTAMA: Konversi petugasFungsiDetailMap untuk risk matrix
      const petugasFungsiDataFinal = new Map<string, Map<string, {
        kegiatan: number;
        anggaran: number;
        namaKegiatanList: string[];
      }>>();
      petugasFungsiDetailMap.forEach((fungsiMap, petugas) => {
        const convertedFungsiMap = new Map<string, {
          kegiatan: number;
          anggaran: number;
          namaKegiatanList: string[];
        }>();
        fungsiMap.forEach((fungsiData, fungsi) => {
          convertedFungsiMap.set(fungsi, {
            kegiatan: fungsiData.kegiatan.size,
            anggaran: fungsiData.anggaran,
            namaKegiatanList: fungsiData.namaKegiatanList.sort()
          });
        });
        petugasFungsiDataFinal.set(petugas, convertedFungsiMap);
      });
      console.log("Petugas fungsi data final size:", petugasFungsiDataFinal.size);
      petugasFungsiDataFinal.forEach((fungsiMap, petugas) => {
        console.log(`Petugas: ${petugas}, fungsi count: ${fungsiMap.size}`);
        fungsiMap.forEach((data, fungsi) => {
          console.log(`  - ${fungsi}: ${data.kegiatan} kegiatan, ${data.anggaran} anggaran`);
        });
      });

      // Prepare chart data untuk KEGIATAN menggunakan data unik
      const petugasKegiatanData: ChartItem[] = Array.from(petugasKegiatanUnikMap.entries()).map(([name, kegiatanSet]) => ({
        name: extractDisplayName(name),
        // PERBAIKAN UTAMA: Tampilkan hanya nama
        value: kegiatanSet.size
      })).sort((a, b) => b.value - a.value).slice(0, 10);
      const bulanKegiatanData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: bulanKegiatanUnikMap.get(bulan)?.size || 0
      }));
      const jenisPekerjaanKegiatanData: ChartItem[] = Array.from(jenisPekerjaanKegiatanUnikMap.entries()).map(([name, kegiatanSet]) => ({
        name,
        value: kegiatanSet.size
      })).sort((a, b) => b.value - a.value);
      const roleKegiatanData: ChartItem[] = Array.from(roleKegiatanUnikMap.entries()).map(([name, kegiatanSet]) => ({
        name,
        value: kegiatanSet.size
      })).sort((a, b) => b.value - a.value);

      // PERBAIKAN UTAMA: Chart data anggaran menggunakan nilai realisasi yang dihitung
      const petugasAnggaranData: ChartItem[] = Array.from(petugasAnggaranMap.entries()).map(([name, value]) => ({
        name: extractDisplayName(name),
        // PERBAIKAN UTAMA: Tampilkan hanya nama
        value
      })).sort((a, b) => b.value - a.value).slice(0, 10);
      const bulanAnggaranData: ChartItem[] = bulanList.map(bulan => ({
        name: bulan,
        value: bulanAnggaranMap.get(bulan) || 0
      }));
      const jenisPekerjaanAnggaranData: ChartItem[] = Array.from(jenisPekerjaanAnggaranMap.entries()).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => b.value - a.value);
      const roleAnggaranData: ChartItem[] = Array.from(roleAnggaranMap.entries()).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => b.value - a.value);

      // Simpan DATA MENTAH untuk filtering (semua petugas)
      const allPetugasWorkloadData: WorkloadData[] = Array.from(petugasDetailMap.entries()).map(([petugas, detail]) => ({
        petugas,
        jumlahKegiatan: detail.kegiatanUnik,
        totalAnggaran: detail.totalAnggaran,
        roles: Array.from(detail.roles)
      })).sort((a, b) => {
        if (b.totalAnggaran !== a.totalAnggaran) {
          return b.totalAnggaran - a.totalAnggaran;
        }
        if (b.jumlahKegiatan !== a.jumlahKegiatan) {
          return b.jumlahKegiatan - a.jumlahKegiatan;
        }
        return a.petugas.localeCompare(b.petugas);
      });

      // Simpan DATA MENTAH risk (semua petugas)
      const allPetugasRiskDataArray: RiskData[] = Array.from(petugasDetailMap.entries()).map(([petugas, detail]) => {
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
      }).sort((a, b) => {
        if (b.kegiatan !== a.kegiatan) {
          return b.kegiatan - a.kegiatan;
        }
        if (b.anggaran !== a.anggaran) {
          return b.anggaran - a.anggaran;
        }
        return a.name.localeCompare(b.name);
      });

      // Data untuk tampilan "Semua Fungsi"
      const workloadDataArray = allPetugasWorkloadData.slice(0, 15);
      const riskDataArray = allPetugasRiskDataArray.slice(0, 10);

      // Simpan data lengkap untuk search
      setFilteredWorkloadData(allPetugasWorkloadData);
      setFilteredRiskData(allPetugasRiskDataArray);

      // Hitung stats menggunakan data unik
      const validBulanKegiatan = getValidBulanForSlow(filterTahun, bulanKegiatanData);
      const validBulanAnggaran = getValidBulanForSlow(filterTahun, bulanAnggaranData);
      const bulanPeakKegiatan = bulanKegiatanData.length > 0 ? bulanKegiatanData.reduce((max, current) => current.value > max.value ? current : max) : {
        name: "-",
        value: 0
      };
      const bulanSlowKegiatan = validBulanKegiatan.length > 0 ? validBulanKegiatan.reduce((min, current) => current.value < min.value ? current : min) : {
        name: "-",
        value: 0
      };
      const bulanPeakAnggaran = bulanAnggaranData.length > 0 ? bulanAnggaranData.reduce((max, current) => current.value > max.value ? current : max) : {
        name: "-",
        value: 0
      };
      const bulanSlowAnggaran = validBulanAnggaran.length > 0 ? validBulanAnggaran.reduce((min, current) => current.value < min.value ? current : min) : {
        name: "-",
        value: 0
      };

      // Rumus rata-rata menggunakan data unik
      const totalKegiatanValidBulan = validBulanKegiatan.reduce((sum, item) => sum + item.value, 0);
      const rataRataKegiatanPerBulan = validBulanKegiatan.length > 0 ? Math.round(totalKegiatanValidBulan / validBulanKegiatan.length) : 0;
      const totalAnggaranValidBulan = validBulanAnggaran.reduce((sum, item) => sum + item.value, 0);
      const rataRataAnggaranPerBulan = validBulanAnggaran.length > 0 ? Math.round(totalAnggaranValidBulan / validBulanAnggaran.length) : 0;

      // Total kegiatan menggunakan data unik
      const totalKegiatan = kegiatanUnikGlobal.size;

      // Set stats dan chart data
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
      setAllPetugasData(allPetugasWorkloadData);
      setAllPetugasRiskData(allPetugasRiskDataArray);
      setWorkloadData(workloadDataArray);
      setRiskData(riskDataArray);
      allPetugasRoleData.current = petugasRoleDataFinal;
      petugasRoleData.current = petugasRoleDataFinal;

      // PERBAIKAN UTAMA: Simpan data fungsi untuk filtering
      petugasFungsiKegiatanMap.current = petugasFungsiDataFinal;
      console.log("Dashboard data loaded successfully");
      console.log("All petugas data count:", allPetugasWorkloadData.length);
      console.log("Top 15 workload data count:", workloadDataArray.length);
      console.log("All risk data count:", allPetugasRiskDataArray.length);
      console.log("Top 10 risk data count:", riskDataArray.length);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Cleanup timeout saat component unmount
  useEffect(() => {
    return () => {
      if (hideTooltipTimeout.current) {
        clearTimeout(hideTooltipTimeout.current);
      }
      if (hideRiskTooltipTimeout.current) {
        clearTimeout(hideRiskTooltipTimeout.current);
      }
    };
  }, []);
  if (loading) {
    return <div className="space-y-6">
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
      </div>;
  }
  const currentData = chartData[viewMode];
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-red-500">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitoring dan visualisasi data kegiatan mitra statistik
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Tabs Utama */}
          <Tabs value={mainTab} onValueChange={value => setMainTab(value as 'honorarium' | 'perjadin' | 'kinerja')}>
            <TabsList>
              <TabsTrigger value="honorarium">Honorarium</TabsTrigger>
              <TabsTrigger value="perjadin">Perjalanan Dinas</TabsTrigger>
              <TabsTrigger value="kinerja">Kinerja</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Toggle Switch untuk View Mode - hanya tampil jika bukan loading */}
          {!loading && (
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('anggaran')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'anggaran' 
                    ? 'bg-white shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                💰
              </button>
              <button
                onClick={() => setViewMode('kegiatan')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'kegiatan' 
                    ? 'bg-white shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📊
              </button>
            </div>
          )}

          <Select value={filterTahun} onValueChange={setFilterTahun}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {tahunList.map(tahun => <SelectItem key={tahun} value={tahun}>
                  {tahun}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {mainTab === 'honorarium' ? (
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
              <CardDescription>
                Melihat pola musiman dan prediksi kebutuhan ke depan
              </CardDescription>
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

          {/* Filter Fungsi untuk Risk Assessment dan Workload Distribution */}
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
                    {fungsiList.map(fungsi => <SelectItem key={fungsi} value={fungsi}>
                        {fungsi}
                      </SelectItem>)}
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
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Assesmen Beban Tugas
                  </CardTitle>
                  <SearchInput value={riskSearchQuery} onChange={setRiskSearchQuery} placeholder="Cari nama mitra..." />
                </div>
                <CardDescription>
                  {filterFungsi === "Semua Fungsi" ? "Top 10 Mitra Statistik dengan jumlah jenis kegiatan terbanyak - Hover untuk melihat detail" : `Mitra Statistik dengan kegiatan di ${filterFungsi} - Hover untuk melihat detail`}
                  {riskSearchQuery && <div className="mt-1 text-xs text-blue-600">
                      Pencarian: "{riskSearchQuery}" - Menampilkan {searchedRiskData.length} hasil
                    </div>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RiskMatrix data={searchedRiskData} mode={viewMode} filterFungsi={filterFungsi} searchQuery={riskSearchQuery} onShowRiskTooltip={handleShowRiskTooltip} onHideRiskTooltip={handleHideRiskTooltip} />
              </CardContent>
            </Card>

            {/* Workload Distribution Table - Top 15 Petugas dengan Hover Role */}
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
                  {filterFungsi === "Semua Fungsi" ? "Tabel detail distribusi realisasi honor per mitra statistik - Hover pada Penanggung Jawab Kegiatan untuk melihat detail per fungsi" : `Tabel detail distribusi realisasi honor di ${filterFungsi} - Hover untuk melihat detail`}
                  {workloadSearchQuery && <div className="mt-1 text-xs text-blue-600">
                      Pencarian: "{workloadSearchQuery}" - Menampilkan {searchedWorkloadData.length} hasil
                    </div>}
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
                      {searchedWorkloadData.length === 0 ? <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            {workloadSearchQuery ? `Tidak ada data yang cocok dengan pencarian "${workloadSearchQuery}"` : `Tidak ada data untuk ${filterFungsi}`}
                          </td>
                        </tr> : searchedWorkloadData.map((item, index) => <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="py-3 text-muted-foreground w-12">{index + 1}</td>
                            {/* PERBAIKAN UTAMA: Tampilkan hanya nama tanpa NIK */}
                            <td className="py-3 font-medium">{extractDisplayName(item.petugas)}</td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {/* PERBAIKAN UTAMA: Hanya tampilkan fungsi yang dipilih */}
                                {item.roles.map((role, roleIndex) => {
                          const roleData = petugasRoleData.current.get(item.petugas)?.get(role);
                          return <RoleBadge key={roleIndex} role={role} petugas={extractDisplayName(item.petugas)} // PERBAIKAN UTAMA: Tampilkan hanya nama
                          roleData={roleData} onShowTooltip={handleShowTooltip} onHideTooltip={handleHideTooltip} />;
                        })}
                              </div>
                            </td>
                            <td className="text-center py-3 font-medium">
                              {item.jumlahKegiatan.toLocaleString('id-ID')}
                            </td>
                            <td className="text-right py-3 font-medium">
                              {formatRupiah(item.totalAnggaran)}
                            </td>
                          </tr>)}
                    </tbody>
                  </table>
                  
                  {/* Render Role Tooltip */}
                  {roleTooltipData && <RoleTooltip data={roleTooltipData} position={tooltipPosition} />}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Render Risk Tooltip */}
          {riskTooltipData && <div className="risk-tooltip-container" onMouseEnter={() => {
          if (hideRiskTooltipTimeout.current) {
            clearTimeout(hideRiskTooltipTimeout.current);
          }
        }} onMouseLeave={handleHideRiskTooltip}>
                <RiskTooltip data={riskTooltipData} position={riskTooltipPosition} />
              </div>}
        </>
        ) : mainTab === 'perjadin' ? (
          <DashboardPerjadin 
            viewMode={viewMode}
            filterTahun={filterTahun}
          />
        ) : (
          <LKKinerja 
            viewMode={viewMode}
            filterTahun={filterTahun}
          />
        )}
    </div>;
};