import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  ArrowUpDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BarChart3,
  Users,
  Zap,
  Target,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Download,
  Trophy,
  TrendingDown,
  Database,
  Link,
  Eye,
} from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { useAuth } from "@/contexts/AuthContext";
import { MonitoringLastUpdated } from "@/components/MonitoringLastUpdated";
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipProvider as UITooltipProvider, TooltipTrigger as UITooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
  LabelList,
} from "recharts";

const MonitoringLapanganAnomaliTab = React.lazy(() => import("./MonitoringLapanganAnomaliTab"));

// Schedule: 15 Juni - 17 Agustus 2026 (63 hari)
// Target: flexible 10-15 submit per hari (average 12.5), 100% reached on day 63
const SCHEDULE_START = new Date(2026, 5, 15); // 15 June 2026
const SCHEDULE_END = new Date(2026, 7, 17); // 17 August 2026
const TOTAL_DAYS = 63; // 15 Juni - 17 Agustus = 63 hari
const MIN_DAILY_TARGET = 10;
const MAX_DAILY_TARGET = 15;
const AVG_DAILY_TARGET = 12.5; // (10 + 15) / 2
const TOTAL_TARGET = TOTAL_DAYS * AVG_DAILY_TARGET; // ~788 submit

const getTargetMinimalPercentage = (daysElapsed: number): number => {
  // Linear progress: Day 16 = 27.20%, daily rate = 1.7% per day
  // 100% reached on approximately Day 59 (August 13, 2026)
  const dailyRate = 27.2 / 16; // ≈ 1.7% per day
  const rawPercentage = dailyRate * daysElapsed;
  const cappedPercentage = Math.max(0, Math.min(rawPercentage, 100));
  return Math.round(cappedPercentage * 100) / 100;
};
const ITEMS_PER_PAGE = 20;

interface AfirmasiData {
  nama: string;
  email: string;
  kategori: string; // "Ratih Megasari" or "Ledya"
}

interface AggregatedData {
  kecamatan: string;
  nama_ppl: string;
  nama_pml: string;
  email_ppl?: string;
  draft: number;
  jumlah_submit: number;
  jumlah_approve: number;
  jumlah_reject: number;
  jumlah_revoke: number;
  total_assignments: number;
  prelist_awal?: number;
  status_counts: {
    open: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    revoked: number;
  };
}

interface DashboardStats {
  totalKecamatan: number;
  totalActivity: number;
  totalSubmit: number;
  averageSubmit: number;
  topKecamatan: { name: string; value: number; totalActivity?: number; countPPL?: number };
  lowestKecamatan: { name: string; value: number; totalActivity?: number; countPPL?: number };
  topKecamatanByPercentage?: { name: string; value: number; totalActivity?: number; totalAssignments?: number };
  lowestKecamatanByPercentage?: { name: string; value: number; totalActivity?: number; totalAssignments?: number };
}

interface ChartData {
  name: string;
  value: number;
}

interface PMLData {
  nama_pml: string;
}

// Custom component for multi-line X-axis labels with diagonal rotation for better readability
const MultiLineLabel = (props: any) => {
  const { x, y, payload } = props;
  if (!payload?.value) return null;

  const lines = String(payload.value).split('\n');
  const lineHeight = 14;

  return (
    <g transform={`translate(${x},${y}) rotate(-45)`}>
      <text x={0} y={0} textAnchor="end" fontSize={11} fill="#475569">
        {lines.map((line: string, index: number) => (
          <tspan key={index} x={0} dy={index === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

interface PMLData {
  nama_pml: string;
  kecamatan: string;
  jumlah_submit_ppl: number;
  jumlah_approve: number;
  jumlah_reject: number;
  jumlah_revoke: number;
  totalAssignments?: number;
  targetPercent?: number;
  prelist_awal?: number;
  capaianPercent?: number;
}

const SPREADSHEET_ID = "1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o";
const SHEET_NAME = "REKAP_SCRP";
const SHEET_USERS = "Semua Users";
const SHEET_AFIRMASI = "AFIRMASI";
const SHEET_ANOMALI_USAHA = "Mikro Anomali Usaha";
const SHEET_ANOMALI_KELUARGA = "Mikro Anomali Keluarga";
const SHEET_PRELIST = "Prelist_Awal";

const COLORS = {
  optimal: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
  pending: "#6b7280",
};

// Calculate days elapsed and target for that day
const calculateDayProgress = (): {
  daysElapsed: number;
  minDayTarget: number;
  maxDayTarget: number;
  avgDayTarget: number;
} => {
  const today = new Date();
  const daysElapsed = Math.floor(
    (today.getTime() - SCHEDULE_START.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  const minTarget = daysElapsed * MIN_DAILY_TARGET;
  const maxTarget = daysElapsed * MAX_DAILY_TARGET;
  const avgTarget = Math.round(daysElapsed * AVG_DAILY_TARGET);

  return {
    daysElapsed: Math.max(0, Math.min(daysElapsed, TOTAL_DAYS)),
    minDayTarget: Math.max(0, minTarget),
    maxDayTarget: Math.max(0, maxTarget),
    avgDayTarget: Math.max(0, avgTarget),
  };
};

  // Get status and notification for current day with flexible targets
const getScheduleStatus = (jumlahAktivitas: number): {
  status: "optimal" | "warning" | "critical" | "pending";
  label: string;
  targetLabel: string;
  notification: string;
  icon: any;
  color: string;
} => {
  const { daysElapsed, minDayTarget, maxDayTarget } = calculateDayProgress();

  if (daysElapsed === 0)
    return {
      status: "pending",
      label: "Belum Dimulai",
      targetLabel: "-",
      notification: "Jadwal dimulai 15 Juni 2026",
      icon: Calendar,
      color: COLORS.pending,
    };

  // Optimal: above max target
  if (jumlahAktivitas >= maxDayTarget) {
    return {
      status: "optimal",
      label: "Sesuai Jadwal",
      targetLabel: "Diatas target harian",
      notification: `${jumlahAktivitas} aktivitas (target ${minDayTarget}-${maxDayTarget}, hari ke-${daysElapsed})`,
      icon: CheckCircle2,
      color: COLORS.optimal,
    };
  }

  // Good: between min and max target
  if (jumlahAktivitas >= minDayTarget && jumlahAktivitas < maxDayTarget) {
    return {
      status: "optimal",
      label: "Sesuai Jadwal",
      targetLabel: "Sesuai target harian",
      notification: `${jumlahAktivitas} aktivitas (target ${minDayTarget}-${maxDayTarget}, hari ke-${daysElapsed})`,
      icon: CheckCircle2,
      color: COLORS.optimal,
    };
  }

  // Warning: between 60% of min target and min target
  const warningThreshold = minDayTarget * 0.6;
  if (jumlahAktivitas >= warningThreshold) {
    return {
      status: "warning",
      label: "Tertinggal",
      targetLabel: "Dibawah target harian",
      notification: `${jumlahAktivitas} aktivitas, kurang ${minDayTarget - jumlahAktivitas} (hari ke-${daysElapsed})`,
      icon: AlertTriangle,
      color: COLORS.warning,
    };
  }

  // Critical: below 60% of min target
  return {
    status: "critical",
    label: "Sangat Tertinggal",
    targetLabel: "Dibawah target harian",
    notification: `${jumlahAktivitas} aktivitas, kurang ${minDayTarget - jumlahAktivitas} (hari ke-${daysElapsed})`,
    icon: AlertCircle,
    color: COLORS.critical,
  };
};

// Function to get color gradient based on the updated daily target rule
const getColorGradient = (value: number): string => {
  // Berbasis target: 10-15 submit/hari
  // Hijau ≥10/hari | Kuning 7-9/hari | Merah <7/hari
  if (value >= MIN_DAILY_TARGET) return "#22c55e"; // Hijau (>= 10)
  if (value >= MIN_DAILY_TARGET - 3) return "#eab308"; // Kuning (7-9)
  return "#dc2626"; // Merah (< 7)
};

// Function untuk mendapatkan warna persentase berdasarkan hari ke-x dan target fleksibel
const getColorForPercentage = (percentage: number): string => {
  const { daysElapsed } = calculateDayProgress();

  // Hitung target persentase DINAMIS berdasarkan hari ke-x
  const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);
  const deviation = minPercentageTarget - percentage;

  // Hijau: mencapai atau melebihi target minimal
  if (percentage >= minPercentageTarget) {
    return "#15803d"; // lebih gelap dari hijau terang
  }

  // Kuning: deviasi sampai 5 persentase poin dari target minimal
  if (deviation > 0 && deviation <= 5) {
    return "#f97316"; // orange
  }

  // Merah: deviasi lebih dari 5 persentase poin dari target minimal
  return "#dc2626";
};

// Static color mapping for pemeriksaan chart (explicit thresholds)
const getColorForPemeriksaanStatic = (percentage: number): string => {
  if (percentage >= 100) return "#15803d"; // green
  if (percentage >= 75) return "#3b82f6"; // blue
  if (percentage >= 50) return "#f97316"; // orange
  return "#dc2626"; // red
};

// Helper untuk normalisasi nama kolom agar cocok dengan header sheet yang bervariasi
const normalizeColumnKey = (key: string): string => {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
};

const normalizeString = (value: any): string =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

// Helper function untuk robust column access dengan fallback dan normalisasi kolom
const getColumnValue = (obj: any, primaryName: string, fallbackNames: string[] = [], defaultValue: any = "-"): any => {
  if (!obj || typeof obj !== "object") return defaultValue;

  const normalizedMap: Record<string, any> = {};
  const originalLowerMap: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const normalizedKey = normalizeColumnKey(key);
    if (normalizedKey) {
      normalizedMap[normalizedKey] = obj[key];
    }
    originalLowerMap[String(key).toLowerCase()] = obj[key];
  }

  const tryKeys = [primaryName, ...fallbackNames];
  for (const key of tryKeys) {
    const normalizedKey = normalizeColumnKey(key);
    const rawKeyLower = String(key).toLowerCase();

    if (normalizedKey && normalizedMap[normalizedKey] !== undefined && normalizedMap[normalizedKey] !== null && normalizedMap[normalizedKey] !== "") {
      return normalizedMap[normalizedKey];
    }

    if (rawKeyLower in originalLowerMap && originalLowerMap[rawKeyLower] !== undefined && originalLowerMap[rawKeyLower] !== null && originalLowerMap[rawKeyLower] !== "") {
      return originalLowerMap[rawKeyLower];
    }
  }

  // If no exact normalized match, attempt partial matching by contains
  for (const key of Object.keys(normalizedMap)) {
    if (tryKeys.some((candidate) => normalizeColumnKey(candidate).includes(key) || key.includes(normalizeColumnKey(candidate)))) {
      const value = normalizedMap[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return defaultValue;
};

const isFilled = (v: any) => {
  const s = String(v ?? "").trim().toLowerCase();
  return !(s === "" || s === "-" || s === "na" || s === "n/a" || s === "null" || s === "none");
};

const getAnomalyPPLValue = (row: any, defaultValue: any = "-"): any =>
  getColumnValue(row, "ppl", ["ppl", "nama ppl", "nama_ppl", "nama_ppl", "y"], defaultValue);

const getAnomalyPMLValue = (row: any, defaultValue: any = "-"): any =>
  getColumnValue(row, "pml", ["pml", "nama pml", "nama_pml", "nama_pml", "z"], defaultValue);

const getAnomalyCatatanPetugasValue = (row: any, defaultValue: any = "-"): any =>
  getColumnValue(row, "catatan_petugas", ["catatan petugas", "catatan_petugas", "catatan", "w"], defaultValue);

const getAnomalyPerlakuanValue = (row: any, defaultValue: any = "-"): any => {
  // First try the normalized column access (by header names)
  const val = getColumnValue(row, "perlakuan", ["perlakuan", "x"], undefined);
  const normalizeVal = (v: any) => (v === undefined || v === null) ? "" : String(v).trim();
  const isEmptyLike = (s: string) => {
    const t = s.trim().toLowerCase();
    return t === "" || t === "-" || t === "na" || t === "n/a" || t === "null" || t === "none";
  };

  if (val !== undefined && val !== null) {
    const s = normalizeVal(val);
    if (!isEmptyLike(s)) return val;
  }

  // If not found via header names, try direct column-letter access (column X)
  if (row && typeof row === "object") {
    // common keys: 'X' or 'x'
    if ("X" in row || "x" in row) {
      const direct = row["X"] ?? row["x"];
      const s = normalizeVal(direct);
      if (!isEmptyLike(s)) return direct;
    }

    // as a last resort, attempt positional access: column X is index 23 (0-based)
    // Also check for preserved placeholder key created by the sheet loader: __col_23
    if (row && typeof row === "object") {
      const placeholderKey = `__col_23`;
      if (placeholderKey in row) {
        const pos = row[placeholderKey];
        const s = normalizeVal(pos);
        if (!isEmptyLike(s)) return pos;
      }

      const values = Object.values(row || {});
      if (values.length >= 24) {
        const pos = values[23];
        const s = normalizeVal(pos);
        if (!isEmptyLike(s)) return pos;
      }
    }
  }

  return defaultValue;
};

interface AnomaliTableProps {
  data?: any[];
  loading: boolean;
  title: string;
}

const AnomaliTable = ({ data, loading, title }: AnomaliTableProps) => {
  const rows = data ?? [];
  const isUsaha = title.toLowerCase().includes("usaha");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml">("kecamatan");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [anomalyFilter, setAnomalyFilter] = useState("all");
  const [perlakuanFilter, setPerlakuanFilter] = useState<"all" | "filled" | "empty">("all");
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getSortIndicator = (field: "kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml") => {
    if (sortBy !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const handleSort = (field: "kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortValue = (row: any, field: "kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml") => {
    switch (field) {
      case "desa":
        return String(getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "")).toLowerCase();
      case "nama_usaha":
        return String(getColumnValue(row, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "")).toLowerCase();
      case "catatan_petugas":
        return String(getAnomalyCatatanPetugasValue(row, "")).toLowerCase();
      case "perlakuan":
        return String(getAnomalyPerlakuanValue(row, "")).toLowerCase();
      case "nama_anomali":
        return String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).toLowerCase();
      case "ppl":
        return String(getAnomalyPPLValue(row, "")).toLowerCase();
      case "pml":
        return String(getAnomalyPMLValue(row, "")).toLowerCase();
      case "kecamatan":
      default:
        return String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).toLowerCase();
    }
  };

  const anomalyOptions = useMemo(() => {
    const values = rows
      .map((row) => String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).trim())
      .filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const anomalyName = String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).trim().toLowerCase();
      if (anomalyFilter !== "all" && anomalyName !== anomalyFilter.toLowerCase()) {
        return false;
      }

      // Filter by perlakuan (treatment) status
      if (perlakuanFilter !== "all") {
        const perlakuanVal = getAnomalyPerlakuanValue(row, "");
        const hasPerlakuan = isFilled(perlakuanVal);
        if (perlakuanFilter === "filled" && !hasPerlakuan) return false;
        if (perlakuanFilter === "empty" && hasPerlakuan) return false;
      }

      if (!normalizedSearch) return true;

      const kecamatan = String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).toLowerCase();
      const desaKel = String(getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "")).toLowerCase();
      const namaUsaha = String(getColumnValue(row, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "")).toLowerCase();
      const catatanPetugas = String(getAnomalyCatatanPetugasValue(row, "")).toLowerCase();
      const perlakuan = String(getAnomalyPerlakuanValue(row, "")).toLowerCase();
      const ppl = String(getAnomalyPPLValue(row, "")).toLowerCase();
      const pml = String(getAnomalyPMLValue(row, "")).toLowerCase();
      const anomalyText = anomalyName;

      return [kecamatan, desaKel, namaUsaha, catatanPetugas, perlakuan, ppl, pml, anomalyText].some((value) => value.includes(normalizedSearch));
    });

    const sorted = [...filtered].sort((a, b) => {
      const valueA = getSortValue(a, sortBy);
      const valueB = getSortValue(b, sortBy);
      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, searchTerm, anomalyFilter, perlakuanFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows, itemsPerPage, searchTerm, anomalyFilter, perlakuanFilter, sortBy, sortOrder]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">Menampilkan {filteredRows.length} dari {rows.length} baris data</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600">
              <span className="mr-2">Per halaman:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <span className="text-sm text-slate-500">Hal {currentPage} dari {totalPages}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isUsaha ? "Cari Kecamatan / Desa / Usaha / PPL / PML" : "Cari Kecamatan / Desa / PPL / PML"}
                className="border-0 p-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <select
              value={anomalyFilter}
              onChange={(e) => setAnomalyFilter(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">Semua Nama Anomali</option>
              {anomalyOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={perlakuanFilter}
              onChange={(e) => setPerlakuanFilter(e.target.value as any)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              title="Filter berdasarkan apakah kolom Perlakuan sudah diisi"
            >
              <option value="all">Semua Perlakuan</option>
              <option value="filled">Sudah diisi</option>
              <option value="empty">Belum diisi</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-slate-600">Memuat data...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          Tidak ada data anomali ditemukan
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          Tidak ada data yang sesuai pencarian/urutan
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("kecamatan")}> 
                    <div className="flex items-center gap-2">Kecamatan - Desa/Kel <span className="text-xs">{getSortIndicator("kecamatan")}</span></div>
                  </TableHead>
                  {!isUsaha && (
                    <TableHead className="text-slate-700 font-semibold">Nama KRT</TableHead>
                  )}
                  {isUsaha && (
                    <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("nama_usaha")}> 
                      <div className="flex items-center gap-2">Nama Usaha <span className="text-xs">{getSortIndicator("nama_usaha")}</span></div>
                    </TableHead>
                  )}
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("nama_anomali")}> 
                    <div className="flex items-center gap-2">Nama Anomali <span className="text-xs">{getSortIndicator("nama_anomali")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("catatan_petugas")}> 
                    <div className="flex items-center gap-2">Catatan Petugas <span className="text-xs">{getSortIndicator("catatan_petugas")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("perlakuan")}> 
                    <div className="flex items-center gap-2">Perlakuan <span className="text-xs">{getSortIndicator("perlakuan")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("ppl")}> 
                    <div className="flex items-center gap-2">PPL <span className="text-xs">{getSortIndicator("ppl")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("pml")}> 
                    <div className="flex items-center gap-2">PML <span className="text-xs">{getSortIndicator("pml")}</span></div>
                  </TableHead>
                  <TableHead className="text-center text-slate-700 font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row, index) => {
                  const kecamatan = getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "-");
                  const desaKel = getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "-");
                  const namaUsaha = getColumnValue(row, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "-");
                  const namaKRT = getColumnValue(row, "nama_krt", ["nama krt", "nama_krt", "krt", "nama kepala rumah tangga", "nama kepala keluarga"], "-");
                  const namaAnomali = getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "-");
                  const catatanPetugas = getAnomalyCatatanPetugasValue(row, "-");
                  const perlakuan = getAnomalyPerlakuanValue(row, "-");
                  const ppl = getAnomalyPPLValue(row, "-");
                  const pml = getAnomalyPMLValue(row, "-");
                  const linkFasih = getColumnValue(row, "link_fasih", ["link fasih", "linkfasih", "link_fasih", "url fasih", "link", "url"], "");

                  return (
                    <TableRow key={`${title}-${index}`} className="even:bg-slate-50">
                      <TableCell className="text-center text-slate-700">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">
                        <div className="flex flex-col gap-0 text-sm leading-tight">
                          <span>{kecamatan}</span>
                          <span className="text-slate-500">{desaKel}</span>
                        </div>
                      </TableCell>
                      {!isUsaha && <TableCell className="text-slate-700 px-4 py-3">{namaKRT}</TableCell>}
                      {isUsaha && <TableCell className="text-slate-700 px-4 py-3">{namaUsaha}</TableCell>}
                      <TableCell className="text-slate-700 px-4 py-3">{namaAnomali}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{catatanPetugas}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{perlakuan}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{ppl}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{pml}</TableCell>
                      <TableCell className="text-center px-4 py-3">
                        <div className="inline-flex items-center justify-center gap-2">
                          {linkFasih ? (
                            <a
                              href={linkFasih}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-700 p-2 hover:bg-slate-200"
                              title="Lihat Link Fasih"
                            >
                              <Link className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada link</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRow(row);
                              setIsDialogOpen(true);
                            }}
                            className="inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-700 p-2 hover:bg-slate-200"
                            title="Lihat detail baris"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

<Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setSelectedRow(null);
            }}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Detail Baris Anomali</DialogTitle>
                  <DialogDescription>Menampilkan informasi utama dan pertanyaan lengkap dalam beberapa halaman.</DialogDescription>
                </DialogHeader>
                {selectedRow ? (
                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <TabsTrigger value="overview" className="rounded-xl py-2 text-sm font-semibold">Ringkas</TabsTrigger>
                      <TabsTrigger value="details" className="rounded-xl py-2 text-sm font-semibold">Semua Pertanyaan</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ["Kecamatan", String(getColumnValue(selectedRow, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "-"))],
                          ["Desa/Kel", String(getColumnValue(selectedRow, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "-"))],
                          ["Nama Usaha", String(getColumnValue(selectedRow, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "-"))],
                          ["Nama SLS", String(getColumnValue(selectedRow, "nama_sls", ["nama sls", "nama_sls", "sls"], "-"))],
                          ["Nama Anomali", String(getColumnValue(selectedRow, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "-"))],
                          ["Catatan Petugas", String(getAnomalyCatatanPetugasValue(selectedRow, "-"))],
                          ["Perlakuan", String(getAnomalyPerlakuanValue(selectedRow, "-"))],
                          ["PPL", String(getAnomalyPPLValue(selectedRow, "-"))],
                          ["PML", String(getAnomalyPMLValue(selectedRow, "-"))],
                          ["Link Fasih", String(getColumnValue(selectedRow, "link_fasih", ["link fasih", "linkfasih", "link_fasih", "url fasih", "link", "url"], "-"))],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                            <p className="mt-2 text-sm text-slate-800 break-words">{value || "-"}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                      <TabsContent value="details" className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(selectedRow)
                          .filter(([key]) => {
                            const normalizedKey = String(key).trim().toLowerCase();
                            return ![
                              "no",
                              "32",
                              "nama usaha",
                              "kode prov",
                              "nama provinsi",
                              "kode kab/kota",
                              "nama kab/kota",
                            ].includes(normalizedKey);
                          })
                          .map(([key, value]) => (
                            <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                              <div className="font-medium text-slate-800">{String(key)}</div>
                              <div className="mt-1 text-slate-700 break-words">{value === null || value === undefined ? "-" : String(value)}</div>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
              ) : (
                <div className="mt-4 text-sm text-slate-500">Data tidak tersedia.</div>
              )}
            </DialogContent>
          </Dialog>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">Menampilkan {paginatedRows.length} dari {rows.length} baris</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹
              </button>
              <span className="text-sm text-slate-700">Hal {currentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                »
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// PERBAIKAN: Custom Tooltip untuk Progres Submit Kecamatan
const KecamatanTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { daysElapsed } = calculateDayProgress();
    const data = payload[0].payload;
    const rataRataPerPPL = data.value || 0;
    const countPPL = data.countPPL || 0;
    const totalSubmit = data.totalSubmit || 0;
    
    // Hitung rata-rata/hari per PPL: (Total Submit / Hari yang berlalu) / Jumlah PPL
    const rataRataPerHari = daysElapsed > 0 ? Math.round((totalSubmit / daysElapsed) / Math.max(1, countPPL) * 100) / 100 : 0;
    
    // Tentukan status berdasarkan perbandingan dengan range target (10-15)
    let status: string;
    if (rataRataPerHari >= MAX_DAILY_TARGET) {
      status = `✅ Diatas target hari ke-${daysElapsed}`;
    } else if (rataRataPerHari >= MIN_DAILY_TARGET) {
      status = `✅ Sesuai target hari ke-${daysElapsed}`;
    } else {
      status = `⚠️ Belum memenuhi target hari ke-${daysElapsed}`;
    }
    
    return (
      <div className="bg-white p-3 border border-slate-300 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900">{data.name}</p>
        <div className="mt-2 space-y-1 text-xs text-slate-700">
          <p>👥 <span className="font-medium">Jumlah PPL:</span> {countPPL} orang</p>
          <p>📊 <span className="font-medium">Jumlah Submit:</span> {totalSubmit.toLocaleString("id-ID")} submit</p>
          <p>🎯 <span className="font-medium">Target/hari:</span> {MIN_DAILY_TARGET}-{MAX_DAILY_TARGET} submit</p>
          <p>📈 <span className="font-medium">Rata-rata/hari:</span> {rataRataPerHari.toLocaleString("id-ID")} submit/PPL</p>
          <p className="text-slate-600 mt-2">{status}</p>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip untuk Persentase Submit per Kecamatan
const PercentageTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = data.value || 0;
    const totalActivity = data.totalActivity || 0;
    const totalAssignments = data.totalAssignments || 0;
    
    return (
      <div className="bg-white p-3 border border-slate-300 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900">{data.name}</p>
        <div className="mt-2 space-y-1 text-xs text-slate-700">
          <p>📝 <span className="font-medium">Jumlah Activity:</span> {totalActivity.toLocaleString("id-ID")}</p>
          <p>📋 <span className="font-medium">Total Assignments:</span> {totalAssignments.toLocaleString("id-ID")}</p>
          <p className="text-slate-600 mt-2 font-semibold">Persentase: {percentage.toLocaleString("id-ID")}%</p>
        </div>
      </div>
    );
  }
  return null;
};

// Export PPL data to Excel
const exportPPLToExcel = (data: AggregatedData[]) => {
  // Calculate days elapsed for daily average
  const today = new Date();
  const daysElapsed = Math.floor(
    (today.getTime() - SCHEDULE_START.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const elapsedDays = Math.max(0, Math.min(daysElapsed, TOTAL_DAYS));

  const aoa: (string | number)[][] = [
    ['DATA INDIVIDU PPL (PETUGAS PENCACAH LAPANGAN)'],
    ['Tanggal Export', new Date().toLocaleString('id-ID')],
    [],
    ['No', 'Kecamatan', 'Nama PPL', 'Nama PML', 'Draft', 'Submit', 'Approve', 'Reject', 'Revoke', 'Total Assignment', 'Persentase Submit', 'Rata-rata Submit+Draft/Harian'],
    ...data.map((row, idx) => {
      const percentage = row.total_assignments > 0 ? ((row.jumlah_submit / row.total_assignments) * 100).toFixed(2) : '0.00';
      const dailyAverage = (row.draft + row.jumlah_reject + row.jumlah_submit + row.jumlah_approve + (row.jumlah_revoke || 0)) / Math.max(1, elapsedDays);
      const dailyAverageFormatted = Math.round(dailyAverage * 100) / 100;
      return [
        idx + 1,
        row.kecamatan,
        row.nama_ppl,
        row.nama_pml,
        row.draft,
        row.jumlah_submit,
        row.jumlah_approve,
        row.jumlah_reject,
        row.jumlah_revoke || 0,
        row.total_assignments,
        `${percentage}%`,
        dailyAverageFormatted
      ];
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PPL');
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 22 }
  ];

  XLSX.writeFile(wb, `Data_PPL_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export PML data to Excel (recalculated from aggregatedData for accuracy)
const exportPMLToExcel = (aggregatedRows: AggregatedData[]) => {
  // Rebuild PML data with EXACT same calculation as UI table
  // All values (Submit, Approve, Reject) must be calculated from individual PPL data
  const pmlMap = new Map<string, { 
    nama_pml: string; 
    kecamatan: string; 
    jumlah_submit_ppl: number; 
    jumlah_approve: number; 
    jumlah_reject: number;
    jumlah_revoke: number;
    totalDraft: number;
  }>();

  aggregatedRows.forEach(row => {
    const key = `${row.nama_pml}|${row.kecamatan}`;
    if (!pmlMap.has(key)) {
      pmlMap.set(key, {
        nama_pml: row.nama_pml,
        kecamatan: row.kecamatan,
        jumlah_submit_ppl: 0,
        jumlah_approve: 0,
        jumlah_reject: 0,
        jumlah_revoke: 0,
        totalDraft: 0,
      });
    }
    const current = pmlMap.get(key)!;
    // Sum all values from individual PPL rows
    current.totalDraft += row.draft;
    current.jumlah_submit_ppl += row.jumlah_submit;
    current.jumlah_approve += row.jumlah_approve;
    current.jumlah_reject += row.jumlah_reject;
    current.jumlah_revoke += (row.jumlah_revoke || 0);
  });

  // Calculate days elapsed for daily average
  const today = new Date();
  const daysElapsed = Math.floor(
    (today.getTime() - SCHEDULE_START.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const elapsedDays = Math.max(0, Math.min(daysElapsed, TOTAL_DAYS));

  // Sort by % Pemeriksaan (descending) - same as UI default
  const pmlRows = Array.from(pmlMap.values()).sort((a, b) => {
    const totalA = (a.jumlah_submit_ppl || 0) + (a.jumlah_approve || 0) + (a.jumlah_reject || 0) + (a.jumlah_revoke || 0);
    const totalB = (b.jumlah_submit_ppl || 0) + (b.jumlah_approve || 0) + (b.jumlah_reject || 0) + (b.jumlah_revoke || 0);
    const percA = totalA > 0 ? ((a.jumlah_approve + a.jumlah_reject + (a.jumlah_revoke || 0)) / totalA) * 100 : 0;
    const percB = totalB > 0 ? ((b.jumlah_approve + b.jumlah_reject + (b.jumlah_revoke || 0)) / totalB) * 100 : 0;
    return percB - percA;
  });

  const aoa: (string | number)[][] = [
    ['DATA PML (PETUGAS PENGAWAS LAPANGAN)'],
    ['Tanggal Export', new Date().toLocaleString('id-ID')],
    [],
    ['No', 'Nama PML', 'Kecamatan', 'Draft', 'Total Status', 'Approve', 'Reject', 'Revoke', '% Periksa', '% Periksa/Prelist', 'Rata-rata Submit+Draft/Harian'],
    ...pmlRows.map((row, idx) => {
      const totalStatus = row.jumlah_submit_ppl + row.jumlah_approve + row.jumlah_reject + row.jumlah_revoke;
      const percentage = totalStatus > 0 ? (((row.jumlah_approve + row.jumlah_reject + row.jumlah_revoke) / totalStatus) * 100).toFixed(2) : '0.00';
      const countPPL = aggregatedRows.filter(ppl => ppl.nama_pml === row.nama_pml && ppl.kecamatan === row.kecamatan).length;
      const totalAssignments = aggregatedRows
        .filter(ppl => ppl.nama_pml === row.nama_pml && ppl.kecamatan === row.kecamatan)
        .reduce((sum, ppl) => sum + (ppl.total_assignments || 0), 0);
      const targetPercent = totalAssignments > 0 ? (((row.jumlah_approve + row.jumlah_reject + row.jumlah_revoke) / totalAssignments) * 100).toFixed(2) : '0.00';
      const dailyAverage = countPPL > 0 ? (row.totalDraft + row.jumlah_reject + row.jumlah_submit_ppl + row.jumlah_approve) / (elapsedDays * countPPL) : 0;
      const dailyAverageFormatted = Math.round(dailyAverage * 100) / 100;
      return [
        idx + 1,
        row.nama_pml,
        row.kecamatan,
        row.totalDraft,
        row.jumlah_submit_ppl,
        row.jumlah_approve,
        row.jumlah_reject,
        row.jumlah_revoke,
        `${percentage}%`,
        `${targetPercent}%`,
        dailyAverageFormatted
      ];
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PML');
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 18 },
    { wch: 8 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 22 }
  ];

  XLSX.writeFile(wb, `Data_PML_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export TA (Tenaga Ahli) data to Excel
const exportTAToExcel = (
  data: (AggregatedData & { kategori: string })[],
  taLabel: string,
  fileSuffix: string
) => {
  const today = new Date();
  const daysElapsed = Math.floor(
    (today.getTime() - SCHEDULE_START.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  const elapsedDays = Math.max(1, Math.min(daysElapsed, TOTAL_DAYS));

  const aoa: (string | number)[][] = [
    [`DATA PPL AFIRMASI TA - ${taLabel}`],
    ['Tanggal Export', new Date().toLocaleString('id-ID')],
    ['Total Baris', data.length],
    [],
    ['No', 'Nama PPL', 'Email PPL', 'Kecamatan', 'Nama PML', 'Draft', 'Submit', 'Approve', 'Reject', 'Revoke', 'Total Aktivitas', 'Rata-rata Harian (aktivitas/hari)'],
    ...data.map((row, idx) => {
      const total = row.draft + row.jumlah_reject + row.jumlah_submit + row.jumlah_approve + (row.jumlah_revoke || 0);
      const dailyAverage = Math.round((total / elapsedDays) * 100) / 100;
      return [
        idx + 1,
        row.nama_ppl,
        row.email_ppl || '',
        row.kecamatan,
        row.nama_pml,
        row.draft,
        row.jumlah_submit,
        row.jumlah_approve,
        row.jumlah_reject,
        row.jumlah_revoke || 0,
        total,
        dailyAverage,
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 5 }, { wch: 22 }, { wch: 26 }, { wch: 18 }, { wch: 22 },
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 26 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TA');
  XLSX.writeFile(wb, `Data_TA_${fileSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

interface PendingPPLEntry {
  name: string;
  pendingCount: number;
  totalCount: number;
  completed: number;
  districts: Set<string>;
}

interface PendingPPLCardProps {
  entries: PendingPPLEntry[];
  totalPPL: number;
  totalRows: number;
}

const PendingPPLCard = React.memo(({ entries, totalPPL, totalRows }: PendingPPLCardProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) => {
      const districtText = Array.from(entry.districts).join(" ").toLowerCase();
      return entry.name.toLowerCase().includes(term) || districtText.includes(term);
    });
  }, [entries, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, entries]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / 20));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm md:col-span-2 lg:col-span-3 xl:col-span-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-rose-900">🚨 PPL dengan Anomali Belum Ditindaklanjuti</h4>
          <p className="text-sm text-rose-700">PPL yang memiliki anomali belum dilakukan konfirmasi.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-medium text-rose-900 shadow-sm">
          <span className="text-slate-500">Total PPL</span>
          <span className="text-rose-900">{totalPPL.toLocaleString("id-ID")}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">Total baris</span>
          <span className="text-rose-900">{totalRows.toLocaleString("id-ID")}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Cari nama atau kecamatan</label>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari PPL atau Kecamatan..."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
          />
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-rose-200 bg-white p-3 text-sm text-rose-700">Tidak ada PPL yang cocok dengan pencarian.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filteredEntries.slice((currentPage - 1) * 20, currentPage * 20).map((entry) => {
              const completionPct = entry.totalCount ? Math.round((entry.completed / entry.totalCount) * 1000) / 10 : 0;
              return (
                <div key={entry.name} className="flex items-center justify-between rounded-2xl border border-rose-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{entry.name}</p>
                    <p className="truncate text-xs text-slate-500">{Array.from(entry.districts).join(', ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-rose-700">{entry.pendingCount.toLocaleString('id-ID')} anomali</p>
                    <p className="text-[11px] text-slate-500">{entry.completed.toLocaleString('id-ID')} sudah ditindaklanjuti · {completionPct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredEntries.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-600">Hal {currentPage} dari {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 transition duration-150 hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 transition duration-150 hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export function MonitoringLapangan() {
  const { user } = useAuth();
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  const isLoggedIn = !!user;

  const { data: sheetData, loading, error } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
  });
  const { data: usersData, loading: usersLoading } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_USERS,
  });
  const { data: afirmasiData, loading: afirmasiLoading } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_AFIRMASI,
  });
  const { data: anomaliUsahaData, loading: anomaliUsahaLoading, error: anomaliUsahaError } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_USAHA,
  });
  const { data: anomaliKeluargaData, loading: anomaliKeluargaLoading, error: anomaliKeluargaError } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_KELUARGA,
  });
  const { data: anomaliUsahaInfoData } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_USAHA,
    range: `${SHEET_ANOMALI_USAHA}!A2`,
    mode: "single-cell",
  });
  const { data: anomaliKeluargaInfoData } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_KELUARGA,
    range: `${SHEET_ANOMALI_KELUARGA}!A2`,
    mode: "single-cell",
  });
  const { data: prelistData } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_PRELIST,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [pmlSearchTerm, setPMLSearchTerm] = useState("");
  const [debouncedPMLSearchTerm, setDebouncedPMLSearchTerm] = useState("");
  const [afirmasiSearchTerm, setAfirmasiSearchTerm] = useState("");
  const [expandedPML, setExpandedPML] = useState<Set<string>>(new Set());
  const [expandedPPL, setExpandedPPL] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"submit" | "kecamatan" | "ppl" | "draft" | "reject" | "approve" | "revoke" | "dailyavg">("dailyavg");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("dashboard");
  useEffect(() => {
    if (!isLoggedIn && (activeTab === 'afirmasi-ratih' || activeTab === 'afirmasi-ledya')) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isLoggedIn]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPagePML, setCurrentPagePML] = useState(1);
  const [itemsPerPagePPL, setItemsPerPagePPL] = useState(20);
  const [itemsPerPagePML, setItemsPerPagePML] = useState(20);
  const [currentPageAfirmasi, setCurrentPageAfirmasi] = useState(1);
  const [itemsPerPageAfirmasi, setItemsPerPageAfirmasi] = useState(20);
  const [activeAnomaliTab, setActiveAnomaliTab] = useState<"dashboard" | "usaha" | "keluarga">("dashboard");
  const anomaliUsahaInfo = anomaliUsahaInfoData?.[0] || "-";
  const anomaliKeluargaInfo = anomaliKeluargaInfoData?.[0] || "-";

  const pendingAnomalyPPL = useMemo(() => {
    const allRows = [
      ...anomaliUsahaData.map((row) => ({ row, source: "Usaha" })),
      ...anomaliKeluargaData.map((row) => ({ row, source: "Keluarga" })),
    ];

    const grouped = new Map<string, { name: string; pendingCount: number; totalCount: number; completed: number; districts: Set<string> }>();
    let totalMissingRows = 0;

    allRows.forEach(({ row }) => {
      const ppl = String(getAnomalyPPLValue(row, "")).trim();
      if (!ppl) return;
      const normalizedPPL = normalizeString(ppl);
      if (!normalizedPPL) return;

      const kecamatan = String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).trim();
      const normalizedKecamatan = normalizeString(kecamatan);
      const perlakuan = getAnomalyPerlakuanValue(row, "");
      const isCompleted = isFilled(perlakuan);

      if (!grouped.has(normalizedPPL)) {
        grouped.set(normalizedPPL, { name: ppl, pendingCount: 0, totalCount: 0, completed: 0, districts: new Set<string>() });
      }
      const entry = grouped.get(normalizedPPL)!;
      entry.totalCount += 1;
      if (isCompleted) {
        entry.completed += 1;
      } else {
        entry.pendingCount += 1;
        totalMissingRows += 1;
      }
      if (kecamatan) {
        if (![...entry.districts].some((existing) => normalizeString(existing) === normalizedKecamatan)) {
          entry.districts.add(kecamatan);
        }
      }
    });

    const entries = Array.from(grouped.values())
      .filter((entry) => entry.pendingCount > 0)
      .sort((a, b) => b.pendingCount - a.pendingCount || a.name.localeCompare(b.name));

    return {
      totalPPL: entries.length,
      totalRows: totalMissingRows,
      entries,
    };
  }, [anomaliUsahaData, anomaliKeluargaData]);


  const anomalyDashboardSummary = useMemo(() => {
    const allRows = [...anomaliUsahaData, ...anomaliKeluargaData];
    const anomalyCounts = new Map<string, number>();
    const districtCounts = new Map<string, number>();
    const pplCounts = new Map<string, number>();
    const pmlCounts = new Map<string, number>();
    const desaSet = new Set<string>();
    let completedAnomalyCount = 0;

    allRows.forEach((row) => {
      const anomalyName = String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).trim();
      if (anomalyName) {
        anomalyCounts.set(anomalyName, (anomalyCounts.get(anomalyName) || 0) + 1);
      }

      const districtName = String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).trim();
      if (districtName) {
        districtCounts.set(districtName, (districtCounts.get(districtName) || 0) + 1);
      }

      const ppl = String(getAnomalyPPLValue(row, "")).trim();
      if (ppl) pplCounts.set(ppl, (pplCounts.get(ppl) || 0) + 1);

      const pml = String(getAnomalyPMLValue(row, "")).trim();
      if (pml) pmlCounts.set(pml, (pmlCounts.get(pml) || 0) + 1);

      const desa = String(getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "")).trim();
      if (desa) desaSet.add(`${districtName}|${desa}`);

      const catatanPetugas = String(getAnomalyCatatanPetugasValue(row, "") ?? "").trim();
      if (isFilled(catatanPetugas)) completedAnomalyCount += 1;
    });

    return {
      topAnomalies: [...anomalyCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topDistricts: [...districtCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topPPL: [...pplCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topPML: [...pmlCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      totalKecamatan: districtCounts.size,
      totalDesa: desaSet.size,
      totalPPL: pplCounts.size,
      totalPML: pmlCounts.size,
      completedAnomalyCount,
      total: allRows.length,
    };
  }, [anomaliUsahaData, anomaliKeluargaData]);
  const [pmlSortBy, setPMLSortBy] = useState<"nama_pml" | "kecamatan" | "totalStatus" | "submit" | "approve" | "reject" | "revoke" | "pemeriksaan" | "targetPercent">("pemeriksaan");
  const [pmlSortOrder, setPMLSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"all" | "optimal" | "warning" | "critical">("all");
  const [kecamatanPercentageComponents, setKecamatanPercentageComponents] = useState<{draft: boolean, submit: boolean, approve: boolean, reject: boolean, revoke: boolean}>(
    { draft: true, submit: true, approve: true, reject: true, revoke: true }
  );
  const [kecamatanActivityComponents, setKecamatanActivityComponents] = useState<{draft: boolean, submit: boolean, approve: boolean, reject: boolean, revoke: boolean}>(
    { draft: true, submit: true, approve: true, reject: true, revoke: true }
  );

  // Process and aggregate data
  const { aggregatedData, dashboardStats, chartDataKecamatan, chartDataKecamatanAll, chartDataKecamatanPercentage, chartDataPPLTop, chartDataPPLLowest, chartDataPMLTop, chartDataPMLLowest, chartDataKecamatanPemeriksaanAvg, totalProgress, pmlData } =
    useMemo(() => {
      if (!sheetData || sheetData.length === 0)
        return {
          aggregatedData: { rows: [], stats: null },
          dashboardStats: null,
          chartDataKecamatan: [],
          chartDataKecamatanAll: [],
          chartDataKecamatanPercentage: [],
          chartDataPPLTop: [],
          chartDataPPLLowest: [],
          chartDataPMLTop: [],
          chartDataPMLLowest: [],
          chartDataKecamatanPemeriksaanAvg: [],
          totalProgress: { current: 0, target: TOTAL_TARGET, percentage: 0 },
          pmlData: [],
        };

      const dataMap = new Map<string, AggregatedData>();
      const kecamatanSet = new Set<string>();

      // Process raw data into unique PPL rows
      sheetData.forEach((row: any) => {
        const kecamatan = (row.kecamatan || "").trim();
        const nama_ppl = (row["nama ppl"] || "").trim();
        const nama_pml = (row["nama pml"] || "").trim();
        const jumlah_submit = parseInt(row["submitted_by_pencacah"] || 0) || 0;

        if (!kecamatan) return;

        kecamatanSet.add(kecamatan);
        const key = `${kecamatan}|${nama_ppl}`;

        if (!dataMap.has(key)) {
          dataMap.set(key, {
            kecamatan,
            nama_ppl,
            nama_pml,
            email_ppl: (row["email"] || row["Email"] || row["email_ppl"] || row["Email PPL"] || "").trim(),
            draft: 0,
            jumlah_submit: 0,
            jumlah_approve: 0,
            jumlah_reject: 0,
            jumlah_revoke: 0,
            total_assignments: 0,
            status_counts: {
              open: 0,
              draft: 0,
              submitted: 0,
              approved: 0,
              rejected: 0,
              revoked: 0,
            },
          });
        }

        const current = dataMap.get(key)!;
        current.draft += parseInt(row.draft || 0) || 0;
        current.jumlah_submit += jumlah_submit;
        current.jumlah_approve += parseInt(row.approved_by_pengawas || 0) || 0;
        current.jumlah_reject += parseInt(row.rejected_by_pengawas || 0) || 0;
        current.total_assignments += parseInt(row.totalassignments || 0) || 0;
        current.status_counts.open += parseInt(row.open || 0) || 0;
        current.status_counts.draft += parseInt(row.draft || 0) || 0;
        current.status_counts.submitted += parseInt(row.submitted_by_pencacah || 0) || 0;
        current.status_counts.approved += parseInt(row.approved_by_pengawas || 0) || 0;
        current.status_counts.rejected += parseInt(row.rejected_by_pengawas || 0) || 0;
      });

      const rows = Array.from(dataMap.values());

      // Enrich PPL rows early with REVOKED counts from "Semua Users" sheet column (JSON)
      const parseRevokedFromUserEarly = (user: any): number => {
        for (const v of Object.values(user || {})) {
          if (typeof v !== "string" || v.length < 5 || !v.includes("REVOKED")) continue;
          try {
            const parsed = JSON.parse(v.trim());
            const val =
              parsed["REVOKED BY Pengawas"] ??
              parsed["REVOKED_BY_PENGAWAS"] ??
              parsed["REVOKED"] ??
              0;
            return parseInt(val) || 0;
          } catch {
            /* ignore */
          }
        }
        return 0;
      };
      const revokedByEmailEarly = new Map<string, number>();
      (usersData || []).forEach((u: any) => {
        const email = String(u["email"] || u["Email"] || "").trim().toLowerCase();
        if (!email) return;
        revokedByEmailEarly.set(email, (revokedByEmailEarly.get(email) || 0) + parseRevokedFromUserEarly(u));
      });
      rows.forEach((r) => {
        const email = String(r.email_ppl || "").trim().toLowerCase();
        const rev = email ? revokedByEmailEarly.get(email) || 0 : 0;
        r.jumlah_revoke = rev;
        r.status_counts.revoked = rev;
      });

      // Enrich PPL rows with Prelist Awal (sum of Total Assignment Fasih for each SLS assigned to the PPL)
      const prelistBySls = new Map<string, number>();
      (prelistData || []).forEach((p: any) => {
        const sls = String(p["idsubsls_25_2"] || p["__col_3"] || "").trim();
        if (!sls) return;
        const val = parseInt(String(p["total assignment fasih"] ?? p["__col_29"] ?? "0").replace(/[^\d.-]/g, "")) || 0;
        prelistBySls.set(sls, (prelistBySls.get(sls) || 0) + val);
      });
      const prelistByEmail = new Map<string, number>();
      (usersData || []).forEach((u: any) => {
        const email = String(u["email"] || u["Email"] || "").trim().toLowerCase();
        const region = String(u["regioncode"] || u["regionCode"] || "").trim();
        if (!email || !region) return;
        const p = prelistBySls.get(region) || 0;
        if (p > 0) prelistByEmail.set(email, (prelistByEmail.get(email) || 0) + p);
      });
      rows.forEach((r) => {
        const email = String(r.email_ppl || "").trim().toLowerCase();
        r.prelist_awal = email ? (prelistByEmail.get(email) || 0) : 0;
      });

      // Calculate statistics with UNIQUE kecamatan count
      const totalKecamatan = kecamatanSet.size; // Unique count, not row count
      // Total Pendataan = Draft + Reject + Approve + Submit
      const totalActivity = rows.reduce((sum, row) => sum + (row.draft + row.jumlah_submit + row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0)), 0);
      const totalSubmit = rows.reduce((sum, row) => sum + row.jumlah_submit, 0);
      const averageSubmit = rows.length > 0 ? Math.round(totalActivity / rows.length) : 0;

      const sortedByActivity = [...rows].sort(
        (a, b) => (b.draft + b.jumlah_submit + b.jumlah_approve + b.jumlah_reject + (b.jumlah_revoke || 0)) - (a.draft + a.jumlah_submit + a.jumlah_approve + a.jumlah_reject + (a.jumlah_revoke || 0))
      );
      
      // Hitung Performa Terbaik: Rata-rata (Submit+Reject+Approve)/hari/PPL
      const { daysElapsed: elapsedDays } = calculateDayProgress();
      const kecamatanPerformaMap = new Map<string, { totalActivity: number; totalRejectApprove: number; countPPL: number; averageActivity: number; averagePerHari: number }>();
      rows.forEach((row) => {
        const current = kecamatanPerformaMap.get(row.kecamatan) || { totalActivity: 0, totalRejectApprove: 0, countPPL: 0, averageActivity: 0, averagePerHari: 0 };
        current.totalActivity += (row.jumlah_submit + row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0));
        current.totalRejectApprove += (row.jumlah_approve + row.jumlah_reject);
        current.countPPL += 1;
        current.averageActivity = Math.round(current.totalActivity / current.countPPL);
        // Rata-rata per hari: ((Submit+Reject+Approve) / Hari) / Jumlah PPL
        current.averagePerHari = elapsedDays > 0 ? Math.round((current.totalActivity / elapsedDays) / Math.max(1, current.countPPL) * 100) / 100 : 0;
        kecamatanPerformaMap.set(row.kecamatan, current);
      });

      // Chart data: Top 10 Kecamatan (Total Activity: Draft+Reject+Approve+Submit)
      const chartDataKecamatan: ChartData[] = sortedByActivity
        .slice(-10)
        .reverse()
        .map((row) => ({
          name: row.kecamatan,
          value: row.draft + row.jumlah_submit + row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0),
        }));

      // Get daysElapsed for chart calculations
      const { daysElapsed } = calculateDayProgress();

      // Chart data: Semua 26 Kecamatan - dynamic based on selected components
      // Track activity per kecamatan for chart display
      const kecamatanActivityMap = new Map<string, { totalActivity: number; totalSubmit: number; countPPL: number }>();
      rows.forEach((row) => {
        const current = kecamatanActivityMap.get(row.kecamatan) || { totalActivity: 0, totalSubmit: 0, countPPL: 0 };
        let activityToAdd = 0;
        if (kecamatanActivityComponents.draft) activityToAdd += row.draft;
        if (kecamatanActivityComponents.submit) activityToAdd += row.jumlah_submit;
        if (kecamatanActivityComponents.approve) activityToAdd += row.jumlah_approve;
        if (kecamatanActivityComponents.reject) activityToAdd += row.jumlah_reject;
        if (kecamatanActivityComponents.revoke) activityToAdd += (row.jumlah_revoke || 0);
        current.totalActivity += activityToAdd;
        current.totalSubmit += row.jumlah_submit;
        current.countPPL += 1;
        kecamatanActivityMap.set(row.kecamatan, current);
      });

      const chartDataKecamatanAll: any[] = Array.from(kecamatanActivityMap.entries())
        .map(([name, data]) => {
          const elapsedDays = Math.max(1, daysElapsed);
          return {
            name,
            value: data.countPPL > 0 ? Math.round((data.totalActivity / elapsedDays) / data.countPPL * 100) / 100 : 0,
            countPPL: data.countPPL,
            totalActivity: data.totalActivity,
            totalSubmit: data.totalSubmit,
          };
        })
        .sort((a, b) => b.value - a.value);

      // Calculate top and lowest kecamatan AFTER chartDataKecamatanAll is defined
      const topKecamatan = chartDataKecamatanAll.length > 0
        ? [...chartDataKecamatanAll].sort((a, b) => b.value - a.value)[0]
        : { name: "-", value: 0, totalActivity: 0, countPPL: 0 };

      const lowestKecamatan = chartDataKecamatanAll.length > 0
        ? [...chartDataKecamatanAll].sort((a, b) => a.value - b.value)[0]
        : { name: "-", value: 0, totalActivity: 0, countPPL: 0 };

      // Chart data: Persentase per Kecamatan - dynamic based on selected components
      const kecamatanPercentageMap = new Map<string, { totalActivity: number; totalAssignments: number }>();
      rows.forEach((row) => {
        const current = kecamatanPercentageMap.get(row.kecamatan) || { totalActivity: 0, totalAssignments: 0 };
        let activityToAdd = 0;
        if (kecamatanPercentageComponents.draft) activityToAdd += row.draft;
        if (kecamatanPercentageComponents.submit) activityToAdd += row.jumlah_submit;
        if (kecamatanPercentageComponents.approve) activityToAdd += row.jumlah_approve;
        if (kecamatanPercentageComponents.reject) activityToAdd += row.jumlah_reject;
        if (kecamatanPercentageComponents.revoke) activityToAdd += (row.jumlah_revoke || 0);
        current.totalActivity += activityToAdd;
        current.totalAssignments += row.total_assignments;
        kecamatanPercentageMap.set(row.kecamatan, current);
      });

      const chartDataKecamatanPercentage: any[] = Array.from(kecamatanPercentageMap.entries())
        .map(([name, data]) => ({
          name,
          value: data.totalAssignments > 0
            ? Math.round((data.totalActivity / data.totalAssignments) * 10000) / 100
            : 0,
          totalActivity: data.totalActivity,
          totalAssignments: data.totalAssignments,
        }))
        .sort((a, b) => b.value - a.value);

      // Top & Lowest Kecamatan by Percentage
      const topKecamatanByPercentage = chartDataKecamatanPercentage.length > 0
        ? [...chartDataKecamatanPercentage].sort((a, b) => b.value - a.value)[0]
        : { name: "-", value: 0, totalActivity: 0, totalAssignments: 1 };

      const lowestKecamatanByPercentage = chartDataKecamatanPercentage.length > 0
        ? [...chartDataKecamatanPercentage].sort((a, b) => a.value - b.value)[0]
        : { name: "-", value: 0, totalActivity: 0, totalAssignments: 1 };

      // Chart data for PPL Top 10 - dynamic based on selected components
      // Use email as key to differentiate PPL with same name, but display nama_ppl
      const pplMap = new Map<string, { value: number; nama_ppl: string; kecamatan: string }>();
      // Aggregate per PPL using the same total shown in the table: draft + submit + approve + reject + revoke
      rows.forEach((row) => {
        const key = `${(row.email_ppl || row.nama_ppl).trim().toLowerCase()}|${row.kecamatan}`;
        const current = pplMap.get(key) || { value: 0, nama_ppl: row.nama_ppl, kecamatan: row.kecamatan };
        const activityToAdd = (row.draft || 0) + (row.jumlah_submit || 0) + (row.jumlah_approve || 0) + (row.jumlah_reject || 0) + (row.jumlah_revoke || 0);
        current.value += activityToAdd;
        pplMap.set(key, current);
      });

      const pplSorted = Array.from(pplMap.values())
        .sort((a, b) => b.value - a.value)
        .map((data) => ({ name: `${data.nama_ppl}\n${data.kecamatan}`, value: data.value }));

      const chartDataPPLTop: ChartData[] = pplSorted.slice(0, 10);
      // Take the last 10 (lowest performers) and sort ascending so lowest is first (left-to-right)
      const chartDataPPLLowest: ChartData[] = pplSorted
        .slice(-10)
        .sort((a, b) => a.value - b.value);

      // Calculate total progress (based on totalActivity)
      const totalProgress = {
        current: totalActivity,
        target: Math.round(TOTAL_TARGET),
        percentage: Math.round((totalActivity / TOTAL_TARGET) * 100),
      };

      // Process PML data
      const pmlMap = new Map<string, PMLData>();
      sheetData.forEach((row: any) => {
        const nama_pml = (row["nama pml"] || "").trim();
        const kecamatan = (row.kecamatan || "").trim();
        
        if (!nama_pml) return;
        
        const key = `${nama_pml}|${kecamatan}`;
        if (!pmlMap.has(key)) {
          pmlMap.set(key, {
            nama_pml,
            kecamatan,
            jumlah_submit_ppl: 0,
            jumlah_approve: 0,
            jumlah_reject: 0,
            jumlah_revoke: 0,
          });
        }

        const current = pmlMap.get(key)!;
        current.jumlah_submit_ppl += parseInt(row["jumlah submit ppl"] || 0) || 0;
        current.jumlah_approve += parseInt(row.approved_by_pengawas || 0) || 0;
        current.jumlah_reject += parseInt(row.rejected_by_pengawas || 0) || 0;
      });

      const pmlRows = Array.from(pmlMap.values());

      // Enrich PPL rows with REVOKED counts from "Semua Users" sheet column P (JSON)
      const parseRevokedFromUser = (user: any): number => {
        for (const v of Object.values(user || {})) {
          if (typeof v !== "string" || v.length < 5 || !v.includes("REVOKED")) continue;
          try {
            const parsed = JSON.parse(v.trim());
            const val =
              parsed["REVOKED BY Pengawas"] ??
              parsed["REVOKED_BY_PENGAWAS"] ??
              parsed["REVOKED"] ??
              0;
            return parseInt(val) || 0;
          } catch {
            /* ignore */
          }
        }
        return 0;
      };
      const revokedByEmail = new Map<string, number>();
      (usersData || []).forEach((u: any) => {
        const email = String(u["email"] || u["Email"] || "").trim().toLowerCase();
        if (!email) return;
        revokedByEmail.set(email, (revokedByEmail.get(email) || 0) + parseRevokedFromUser(u));
      });
      rows.forEach((r) => {
        const email = String(r.email_ppl || "").trim().toLowerCase();
        const rev = email ? revokedByEmail.get(email) || 0 : 0;
        r.jumlah_revoke = rev;
        r.status_counts.revoked = rev;
      });
      // Aggregate revoke per PML from PPL rows
      const pmlRevokeMap = new Map<string, number>();
      rows.forEach((r) => {
        const k = `${r.nama_pml}|${r.kecamatan}`;
        pmlRevokeMap.set(k, (pmlRevokeMap.get(k) || 0) + (r.jumlah_revoke || 0));
      });
      pmlRows.forEach((p) => {
        p.jumlah_revoke = pmlRevokeMap.get(`${p.nama_pml}|${p.kecamatan}`) || 0;
      });

      // Chart data for PML Top 10 by Pemeriksaan % - use same calculation as table
      // Group PPL by PML to match table calculation
      // Use combination of nama_pml + kecamatan as unique key
      const pmlChartMap = new Map<string, { totalSubmit: number; totalApprove: number; totalReject: number; totalRevoke: number; nama_pml: string }>();
      rows.forEach(ppl => {
        if (ppl.nama_pml) {
          const key = `${ppl.nama_pml}|${ppl.kecamatan}`;
          if (!pmlChartMap.has(key)) {
            pmlChartMap.set(key, { totalSubmit: 0, totalApprove: 0, totalReject: 0, totalRevoke: 0, nama_pml: ppl.nama_pml });
          }
          const current = pmlChartMap.get(key)!;
          current.totalSubmit += ppl.jumlah_submit;
          current.totalApprove += ppl.jumlah_approve;
          current.totalReject += ppl.jumlah_reject;
          current.totalRevoke += (ppl.jumlah_revoke || 0);
        }
      });

      const pmlWithPercentage = Array.from(pmlChartMap.entries()).map(([key, data]) => {
        // Use definition: Total Status = Submit + Approve + Reject + Revoke
        // % Pemeriksaan = (Approve + Reject + Revoke) / Total Status
        const totalStatus = (data.totalSubmit || 0) + data.totalApprove + data.totalReject + (data.totalRevoke || 0);
        const pemeriksaanPercent = totalStatus > 0 
          ? Math.round(((data.totalApprove + data.totalReject + (data.totalRevoke || 0)) / totalStatus) * 10000) / 100
          : 0;
        // Extract kecamatan from key (format: nama_pml|kecamatan)
        const [, kecamatan] = key.split('|');
        return {
          nama_pml: data.nama_pml,
          kecamatan: kecamatan || '',
          pemeriksaanPercent,
        };
      });

      const pmlSortedByPemeriksaan = pmlWithPercentage.sort((a, b) => b.pemeriksaanPercent - a.pemeriksaanPercent);
      const chartDataPMLTop: ChartData[] = pmlSortedByPemeriksaan.slice(0, 10).map(item => ({
        name: `${item.nama_pml}\n${item.kecamatan}`,
        value: item.pemeriksaanPercent,
      }));
      // Ensure lowest list is sorted ascending (left-to-right: lowest -> higher)
      const chartDataPMLLowest: ChartData[] = pmlSortedByPemeriksaan
        .slice(-10)
        .sort((a, b) => a.pemeriksaanPercent - b.pemeriksaanPercent)
        .map(item => ({
          name: `${item.nama_pml}\n${item.kecamatan}`,
          value: item.pemeriksaanPercent,
        }));

      // Chart data: Rata-rata % Periksa per Kecamatan (dari data PML)
      // Hitung per-PML berdasarkan agregasi dari PPL (`rows`) sehingga menggunakan sumber data yang sama dengan tabel
      const pmlFromRowsMap = new Map<string, {
        nama_pml: string;
        kecamatan: string;
        sumSubmit: number;
        sumApprove: number;
        sumReject: number;
        sumRevoke: number;
        sumAssignments: number;
      }>();
      rows.forEach((r: any) => {
        const key = `${r.nama_pml}|${r.kecamatan}`;
        const cur = pmlFromRowsMap.get(key) || { nama_pml: r.nama_pml, kecamatan: r.kecamatan, sumSubmit: 0, sumApprove: 0, sumReject: 0, sumRevoke: 0, sumAssignments: 0 };
        cur.sumSubmit += (r.jumlah_submit || 0);
        cur.sumApprove += (r.jumlah_approve || 0);
        cur.sumReject += (r.jumlah_reject || 0);
        cur.sumRevoke += (r.jumlah_revoke || 0);
        cur.sumAssignments += (r.total_assignments || 0);
        pmlFromRowsMap.set(key, cur);
      });

      const kecamatanPemeriksaanAvgMap = new Map<string, { totalPercent: number; count: number }>();
      Array.from(pmlFromRowsMap.values()).forEach((pml) => {
        const totalStatus = (pml.sumSubmit || 0) + (pml.sumApprove || 0) + (pml.sumReject || 0) + (pml.sumRevoke || 0);
        const periksaPercent = totalStatus > 0 ? ((pml.sumApprove + pml.sumReject + (pml.sumRevoke || 0)) / totalStatus) * 100 : 0;
        const cur = kecamatanPemeriksaanAvgMap.get(pml.kecamatan) || { totalPercent: 0, count: 0 };
        cur.totalPercent += periksaPercent;
        cur.count += 1;
        kecamatanPemeriksaanAvgMap.set(pml.kecamatan, cur);
      });

      const chartDataKecamatanPemeriksaanAvg: ChartData[] = Array.from(kecamatanPemeriksaanAvgMap.entries())
        .map(([name, d]) => ({
          name,
          value: d.count > 0 ? Math.round((d.totalPercent / d.count) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        aggregatedData: {
          rows,
          stats: { totalKecamatan, totalSubmit, averageSubmit },
        },
        dashboardStats: { totalKecamatan, totalActivity, totalSubmit, averageSubmit, topKecamatan, lowestKecamatan, topKecamatanByPercentage, lowestKecamatanByPercentage },
        chartDataKecamatan,
        chartDataKecamatanAll,
        chartDataKecamatanPercentage,
        chartDataPPLTop,
        chartDataPPLLowest,
        chartDataPMLTop,
        chartDataPMLLowest,
        chartDataKecamatanPemeriksaanAvg,
        totalProgress,
        pmlData: pmlRows,
      };
    }, [sheetData, usersData, prelistData, kecamatanPercentageComponents, kecamatanActivityComponents]);

  // Map SLS id -> Prelist Awal (Total Assignment Fasih) for use in expanded rows
  const prelistBySlsMap = useMemo(() => {
    const m = new Map<string, number>();
    (prelistData || []).forEach((p: any) => {
      const sls = String(p["idsubsls_25_2"] || p["__col_3"] || "").trim();
      if (!sls) return;
      const val = parseInt(String(p["total assignment fasih"] ?? p["__col_29"] ?? "0").replace(/[^\d.-]/g, "")) || 0;
      m.set(sls, val);
    });
    return m;
  }, [prelistData]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 200);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedPMLSearchTerm(pmlSearchTerm), 200);
    return () => clearTimeout(handler);
  }, [pmlSearchTerm]);

  const toggleSort = (field: "submit" | "kecamatan" | "ppl" | "draft" | "reject" | "approve" | "revoke" | "dailyavg") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Pagination PPL
  const filteredPPLRows = useMemo(() => {
    let rows = [...aggregatedData.rows];

    if (debouncedSearchTerm) {
      const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.kecamatan.toLowerCase().includes(normalizedSearch) ||
          row.nama_ppl.toLowerCase().includes(normalizedSearch)
      );
    }

    if (statusFilter !== "all") {
      rows = rows.filter((row) => {
        const totalAktivitas = (row.draft || 0) + (row.jumlah_reject || 0) + (row.jumlah_submit || 0) + (row.jumlah_approve || 0) + (row.jumlah_revoke || 0);
        return getScheduleStatus(totalAktivitas).status === statusFilter;
      });
    }

    rows.sort((a, b) => {
      let compareValue = 0;
      if (sortBy === "submit") {
        compareValue = a.jumlah_submit - b.jumlah_submit;
      } else if (sortBy === "draft") {
        compareValue = a.draft - b.draft;
      } else if (sortBy === "reject") {
        compareValue = a.jumlah_reject - b.jumlah_reject;
      } else if (sortBy === "approve") {
        compareValue = a.jumlah_approve - b.jumlah_approve;
      } else if (sortBy === "dailyavg") {
        const { daysElapsed: elapsedDays } = calculateDayProgress();
        const avgA = (a.draft + a.jumlah_reject + a.jumlah_submit + a.jumlah_approve + (a.jumlah_revoke || 0)) / Math.max(1, elapsedDays);
        const avgB = (b.draft + b.jumlah_reject + b.jumlah_submit + b.jumlah_approve + (b.jumlah_revoke || 0)) / Math.max(1, elapsedDays);
        compareValue = avgA - avgB;
      } else if (sortBy === "kecamatan") {
        compareValue = a.kecamatan.localeCompare(b.kecamatan);
      } else if (sortBy === "ppl") {
        compareValue = a.nama_ppl.localeCompare(b.nama_ppl);
      }

      return sortOrder === "desc" ? -compareValue : compareValue;
    });

    return rows;
  }, [aggregatedData.rows, debouncedSearchTerm, statusFilter, sortBy, sortOrder]);

  const totalPagesPPL = Math.ceil(filteredPPLRows.length / itemsPerPagePPL);
  const startIndexPPL = (currentPage - 1) * itemsPerPagePPL;
  const paginatedRows = filteredPPLRows.slice(startIndexPPL, startIndexPPL + itemsPerPagePPL);

  const usersByEmail = useMemo(() => {
    const map = new Map<string, any[]>();
    usersData?.forEach((user: any) => {
      const email = String(user["email"] || user["Email"] || "").trim().toLowerCase();
      if (!email) return;
      const existing = map.get(email) || [];
      existing.push(user);
      map.set(email, existing);
    });
    return map;
  }, [usersData]);

  const pmlGroups = useMemo(() => {
    const map = new Map<string, AggregatedData[]>();
    aggregatedData.rows.forEach((ppl) => {
      const key = `${ppl.nama_pml}|${ppl.kecamatan}`;
      const list = map.get(key) || [];
      list.push(ppl);
      map.set(key, list);
    });
    return map;
  }, [aggregatedData.rows]);

  const pmlDataWithActualSubmit = useMemo(() => {
    return pmlData.map((pml) => {
      const key = `${pml.nama_pml}|${pml.kecamatan}`;
      const pplUnderPML = pmlGroups.get(key) || [];
      const actualSubmit = pplUnderPML.reduce((sum, ppl) => sum + (ppl.jumlah_submit || 0), 0);
      const totalAssignments = pplUnderPML.reduce((sum, ppl) => sum + (ppl.total_assignments || 0), 0);
      const prelist_awal = pplUnderPML.reduce((sum, ppl) => sum + (ppl.prelist_awal || 0), 0);
      const totalStatus = actualSubmit + pml.jumlah_approve + pml.jumlah_reject + (pml.jumlah_revoke || 0);
      const pemeriksaan = totalStatus > 0 ? ((pml.jumlah_approve + pml.jumlah_reject + (pml.jumlah_revoke || 0)) / totalStatus) * 100 : 0;
      const targetPercent = totalAssignments > 0 ? ((pml.jumlah_approve + pml.jumlah_reject + (pml.jumlah_revoke || 0)) / totalAssignments) * 100 : 0;
      const capaianPercent = prelist_awal > 0 ? ((pml.jumlah_approve + pml.jumlah_reject + (pml.jumlah_revoke || 0)) / prelist_awal) * 100 : 0;
      return { ...pml, actualSubmit, pemeriksaan, totalAssignments, targetPercent, prelist_awal, capaianPercent, pplUnderPML } as any;
    });
  }, [pmlData, pmlGroups]);

  // PML Data sorting and pagination
  const sortedPMLData = useMemo(() => {
    let sorted: (PMLData & { actualSubmit?: number; pemeriksaan?: number; totalAssignments?: number; targetPercent?: number; pplUnderPML?: AggregatedData[] })[] = [...pmlDataWithActualSubmit];
    
    if (debouncedPMLSearchTerm) {
      const normalizedSearch = debouncedPMLSearchTerm.trim().toLowerCase();
      sorted = sorted.filter((item) =>
        item.nama_pml.toLowerCase().includes(normalizedSearch) ||
        item.kecamatan.toLowerCase().includes(normalizedSearch)
      );
    }
    
    if (pmlSortBy === "nama_pml") {
      sorted.sort((a, b) => a.nama_pml.localeCompare(b.nama_pml));
    } else if (pmlSortBy === "submit") {
      sorted.sort((a, b) => (a.actualSubmit ?? 0) - (b.actualSubmit ?? 0));
    } else if (pmlSortBy === "totalStatus") {
      sorted.sort((a, b) => {
        const totalA = (a.actualSubmit ?? 0) + a.jumlah_approve + a.jumlah_reject + (a.jumlah_revoke || 0);
        const totalB = (b.actualSubmit ?? 0) + b.jumlah_approve + b.jumlah_reject + (b.jumlah_revoke || 0);
        return totalA - totalB;
      });
    } else if (pmlSortBy === "approve") {
      sorted.sort((a, b) => a.jumlah_approve - b.jumlah_approve);
    } else if (pmlSortBy === "reject") {
      sorted.sort((a, b) => a.jumlah_reject - b.jumlah_reject);
    } else if (pmlSortBy === "revoke") {
      sorted.sort((a, b) => (a.jumlah_revoke || 0) - (b.jumlah_revoke || 0));
    } else if (pmlSortBy === "pemeriksaan") {
      sorted.sort((a, b) => (a.pemeriksaan ?? 0) - (b.pemeriksaan ?? 0));
    } else if (pmlSortBy === "targetPercent") {
      sorted.sort((a, b) => (a.targetPercent ?? 0) - (b.targetPercent ?? 0));
    }
    if (pmlSortOrder === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [pmlDataWithActualSubmit, pmlSortBy, pmlSortOrder, debouncedPMLSearchTerm]);

  const totalPagesPML = Math.ceil(sortedPMLData.length / itemsPerPagePML);
  const startIndexPML = (currentPagePML - 1) * itemsPerPagePML;
  const paginatedRowsPML = sortedPMLData.slice(startIndexPML, startIndexPML + itemsPerPagePML);

  // Process AFIRMASI data - Extract emails for matching
  const afirmasiEmails = useMemo(() => {
    if (!afirmasiData || afirmasiData.length === 0) {
      return {
        ratih: new Set<string>(),
        ledya: new Set<string>(),
      };
    }

    const allKeys = Object.keys(afirmasiData[0]);

    // Use fixed AFIRMASI sheet layout: column B = Ratih email, column D = Ledya email
    const emailRatihKey = allKeys[1] || "";
    const emailLedyaKey = allKeys[3] || "";

    const ratihEmails = new Set<string>();
    const ledyaEmails = new Set<string>();

    afirmasiData.forEach((row: any) => {
      const emailRatih = (row[emailRatihKey] || "").trim().toLowerCase();
      const emailLedya = (row[emailLedyaKey] || "").trim().toLowerCase();

      if (emailRatih && emailRatih !== "-" && emailRatih.includes("@")) {
        ratihEmails.add(emailRatih);
      }

      if (emailLedya && emailLedya !== "-" && emailLedya.includes("@")) {
        ledyaEmails.add(emailLedya);
      }
    });

    return {
      ratih: ratihEmails,
      ledya: ledyaEmails,
    };
  }, [afirmasiData]);

  // Filter PPL data by AFIRMASI emails
  const afirmasiPPLData = useMemo(() => {
    const ratihPPL: (AggregatedData & { kategori: string })[] = [];
    const ledyaPPL: (AggregatedData & { kategori: string })[] = [];

    aggregatedData.rows.forEach((ppl) => {
      const pplEmail = (ppl.email_ppl || "").trim().toLowerCase();
      
      if (afirmasiEmails.ratih.has(pplEmail)) {
        ratihPPL.push({ ...ppl, kategori: "Ratih Megasari" });
      } else if (afirmasiEmails.ledya.has(pplEmail)) {
        ledyaPPL.push({ ...ppl, kategori: "Ledya" });
      }
    });

    // Apply search filter
    const filterData = (data: (AggregatedData & { kategori: string })[], searchTerm: string) => {
      if (!searchTerm) return data;
      return data.filter(
        (item) =>
          item.nama_ppl.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.email_ppl || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase())
      );
    };

    return {
      ratih: filterData(ratihPPL, afirmasiSearchTerm),
      ledya: filterData(ledyaPPL, afirmasiSearchTerm),
    };
  }, [aggregatedData.rows, afirmasiEmails, afirmasiSearchTerm]);

  // Pagination AFIRMASI
  const totalPagesAfirmasi = Math.ceil(
    (afirmasiPPLData.ratih.length + afirmasiPPLData.ledya.length) / itemsPerPageAfirmasi
  );
  const startIndexAfirmasi = (currentPageAfirmasi - 1) * itemsPerPageAfirmasi;
  const combinedAfirmasiData = [...afirmasiPPLData.ratih, ...afirmasiPPLData.ledya];
  const paginatedAfirmasiData = combinedAfirmasiData.slice(
    startIndexAfirmasi,
    startIndexAfirmasi + itemsPerPageAfirmasi
  );

  const { daysElapsed, avgDayTarget } = calculateDayProgress();
  const selectedPercentageLabels = Object.entries(kecamatanPercentageComponents)
    .filter(([, isSelected]) => isSelected)
    .map(([key]) => {
      switch (key) {
        case "draft": return "Draft";
        case "submit": return "Submit";
        case "approve": return "Approve";
        case "reject": return "Reject";
        default: return key;
      }
    });

  const selectedPercentageTotal = (aggregatedData.rows as any[]).reduce((sum: number, row: any) => {
    let activity = 0;
    if (kecamatanPercentageComponents.draft) activity += row.draft;
    if (kecamatanPercentageComponents.submit) activity += row.jumlah_submit;
    if (kecamatanPercentageComponents.approve) activity += row.jumlah_approve;
    if (kecamatanPercentageComponents.reject) activity += row.jumlah_reject;
    return sum + activity;
  }, 0);

  const averageKecamatanPercentage = chartDataKecamatanPercentage.length > 0
    ? chartDataKecamatanPercentage.reduce((sum, item) => sum + item.value, 0) / chartDataKecamatanPercentage.length
    : 0;

  // Chart data: Persentase Pemeriksaan per Kecamatan (agregasi dari data PML)
  // % Pemeriksaan = (Approve + Reject + Revoke) / Total Assignments per Kecamatan
  const chartDataKecamatanPemeriksaan = useMemo(() => {
    // Build PML aggregates from PPL rows to match table logic (per-PML targetPercent average)
    const pmlFromRowsMap = new Map<string, { nama_pml: string; kecamatan: string; sumApprove: number; sumReject: number; sumRevoke: number; sumAssignments: number }>();
    aggregatedData.rows.forEach((r: any) => {
      const key = `${r.nama_pml}|${r.kecamatan}`;
      const cur = pmlFromRowsMap.get(key) || { nama_pml: r.nama_pml, kecamatan: r.kecamatan, sumApprove: 0, sumReject: 0, sumRevoke: 0, sumAssignments: 0 };
      cur.sumApprove += (r.jumlah_approve || 0);
      cur.sumReject += (r.jumlah_reject || 0);
      cur.sumRevoke += (r.jumlah_revoke || 0);
      cur.sumAssignments += (r.total_assignments || 0);
      pmlFromRowsMap.set(key, cur);
    });

    const kecMap = new Map<string, { totalPercent: number; count: number; totalPeriksa: number; totalAssignments: number }>();
    Array.from(pmlFromRowsMap.values()).forEach((pml) => {
      const numerator = (pml.sumApprove || 0) + (pml.sumReject || 0) + (pml.sumRevoke || 0);
      const denom = pml.sumAssignments || 0;
      const targetPercent = denom > 0 ? (numerator / denom) * 100 : 0;
      const cur = kecMap.get(pml.kecamatan) || { totalPercent: 0, count: 0, totalPeriksa: 0, totalAssignments: 0 };
      cur.totalPercent += targetPercent;
      cur.count += 1;
      cur.totalPeriksa += numerator;
      cur.totalAssignments += denom;
      kecMap.set(pml.kecamatan, cur);
    });

    return Array.from(kecMap.entries()).map(([name, d]) => ({
      name,
      value: d.count > 0 ? Math.round((d.totalPercent / d.count) * 100) / 100 : 0,
      totalPeriksa: d.totalPeriksa,
      totalAssignments: d.totalAssignments,
    })).sort((a, b) => b.value - a.value);
  }, [aggregatedData.rows]);

  const averageKecamatanPemeriksaan = chartDataKecamatanPemeriksaan.length > 0
    ? chartDataKecamatanPemeriksaan.reduce((sum, item) => sum + item.value, 0) / chartDataKecamatanPemeriksaan.length
    : 0;

  const averageKecamatanPemeriksaanAvg = chartDataKecamatanPemeriksaanAvg.length > 0
    ? chartDataKecamatanPemeriksaanAvg.reduce((sum, item) => sum + item.value, 0) / chartDataKecamatanPemeriksaanAvg.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Monitoring Lapangan</h1>
              <p className="text-sm text-slate-600 mt-1">
                Dashboard monitoring pengerjaan sensus ekonomi 2026
              </p>
            </div>
          </div>
        </div>

        {/* Last Updated Info - Display on all tabs */}
        <div className="mb-6">
          <MonitoringLastUpdated />
        </div>

        {/* Tabs with Icon Navigation - Horizontal */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="flex w-full h-auto p-1 bg-white border border-slate-200 rounded-lg shadow-sm mb-6 gap-2">
            <TabsTrigger
              value="dashboard"
              className="flex items-center gap-3 justify-center flex-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="ppl"
              className="flex items-center gap-3 justify-center flex-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">PPL</span>
            </TabsTrigger>
            <TabsTrigger
              value="pml"
              className="flex items-center gap-3 justify-center flex-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">PML</span>
            </TabsTrigger>
            {isLoggedIn && (
              <>
                <TabsTrigger
                  value="afirmasi-ratih"
                  className="flex items-center gap-3 justify-center flex-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">TA - Ratih Megasari</span>
                </TabsTrigger>
                <TabsTrigger
                  value="afirmasi-ledya"
                  className="flex items-center gap-3 justify-center flex-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <Trophy className="h-5 w-5" />
                  <span className="font-medium">TA - Ledya</span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger
              value="anomali"
              className="flex items-center gap-3 justify-center flex-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
            >
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Anomali</span>
            </TabsTrigger>
          </TabsList>

          <div className="w-full">

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Overview Stats */}
            {dashboardStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Total Pendataan */}
                <Card className="relative overflow-hidden border border-slate-200/70 shadow-sm bg-gradient-to-br from-white to-slate-50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-slate-700 to-slate-400" />
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                          <Database className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Pendataan</span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                      {selectedPercentageTotal.toLocaleString("id-ID")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {selectedPercentageLabels.length > 0 ? (
                        selectedPercentageLabels.map((label) => (
                          <span key={label} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                            {label}
                          </span>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                          Tidak ada status dipilih
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Persentase Tertinggi */}
                <Card className="relative overflow-hidden border border-blue-200/70 shadow-sm bg-gradient-to-br from-blue-50 via-white to-blue-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-600 to-cyan-400" />
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Persentase Tertinggi ({[
                          kecamatanPercentageComponents.draft && 'Draft',
                          kecamatanPercentageComponents.submit && 'Submit',
                          kecamatanPercentageComponents.approve && 'Approve',
                          kecamatanPercentageComponents.reject && 'Reject'
                        ].filter(Boolean).join('+')})
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 truncate" title={dashboardStats.topKecamatanByPercentage?.name ?? "-"}>
                      {dashboardStats.topKecamatanByPercentage?.name ?? "-"}
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-blue-700 tabular-nums">
                        {(dashboardStats.topKecamatanByPercentage?.value ?? 0).toLocaleString("id-ID")}
                      </span>
                      <span className="text-sm font-semibold text-blue-600">%</span>
                    </div>
                    {dashboardStats.topKecamatanByPercentage?.totalActivity && (
                      <div className="mt-2 pt-2 border-t border-blue-100 text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-800 tabular-nums">{(dashboardStats.topKecamatanByPercentage?.totalActivity ?? 0).toLocaleString("id-ID")}</span>
                        <span className="text-slate-400"> dari </span>
                        <span className="font-semibold text-slate-800 tabular-nums">{(dashboardStats.topKecamatanByPercentage?.totalAssignments ?? 0).toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Persentase Terendah */}
                <Card className="relative overflow-hidden border border-orange-200/70 shadow-sm bg-gradient-to-br from-orange-50 via-white to-orange-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-orange-500 to-amber-400" />
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-orange-700">
                        Persentase Terendah ({[
                          kecamatanPercentageComponents.draft && 'Draft',
                          kecamatanPercentageComponents.submit && 'Submit',
                          kecamatanPercentageComponents.approve && 'Approve',
                          kecamatanPercentageComponents.reject && 'Reject'
                        ].filter(Boolean).join('+')})
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 truncate" title={dashboardStats.lowestKecamatanByPercentage?.name ?? "-"}>
                      {dashboardStats.lowestKecamatanByPercentage?.name ?? "-"}
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-orange-700 tabular-nums">
                        {(dashboardStats.lowestKecamatanByPercentage?.value ?? 0).toLocaleString("id-ID")}
                      </span>
                      <span className="text-sm font-semibold text-orange-600">%</span>
                    </div>
                    {dashboardStats.lowestKecamatanByPercentage?.totalActivity && (
                      <div className="mt-2 pt-2 border-t border-orange-100 text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-800 tabular-nums">{(dashboardStats.lowestKecamatanByPercentage?.totalActivity ?? 0).toLocaleString("id-ID")}</span>
                        <span className="text-slate-400"> dari </span>
                        <span className="font-semibold text-slate-800 tabular-nums">{(dashboardStats.lowestKecamatanByPercentage?.totalAssignments ?? 0).toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rata-rata Tertinggi */}
                <Card className="relative overflow-hidden border border-emerald-200/70 shadow-sm bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-600 to-teal-400" />
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        Rata-rata Tertinggi ({[
                          kecamatanActivityComponents.draft && 'Draft',
                          kecamatanActivityComponents.submit && 'Submit',
                          kecamatanActivityComponents.approve && 'Approve',
                          kecamatanActivityComponents.reject && 'Reject'
                        ].filter(Boolean).join('+')})
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 truncate" title={dashboardStats.topKecamatan?.name ?? "-"}>
                      {dashboardStats.topKecamatan?.name ?? "-"}
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                        {(dashboardStats.topKecamatan?.value ?? 0).toLocaleString("id-ID")}
                      </span>
                      <span className="text-[11px] font-medium text-emerald-600">/PPL/hari</span>
                    </div>
                    {dashboardStats.topKecamatan?.totalActivity && (
                      <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          <span className="text-slate-400">Total </span>
                          <span className="font-semibold text-slate-800 tabular-nums">{(dashboardStats.topKecamatan?.totalActivity ?? 0).toLocaleString("id-ID")}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                          <Users className="h-3 w-3" />
                          {dashboardStats.topKecamatan?.countPPL}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rata-rata Terendah */}
                <Card className="relative overflow-hidden border border-rose-200/70 shadow-sm bg-gradient-to-br from-rose-50 via-white to-rose-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-rose-500 to-red-400" />
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                        Rata-rata Terendah ({[
                          kecamatanActivityComponents.draft && 'Draft',
                          kecamatanActivityComponents.submit && 'Submit',
                          kecamatanActivityComponents.approve && 'Approve',
                          kecamatanActivityComponents.reject && 'Reject'
                        ].filter(Boolean).join('+')})
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 truncate" title={dashboardStats.lowestKecamatan?.name ?? "-"}>
                      {dashboardStats.lowestKecamatan?.name ?? "-"}
                    </div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-rose-700 tabular-nums">
                        {(dashboardStats.lowestKecamatan?.value ?? 0).toLocaleString("id-ID")}
                      </span>
                      <span className="text-[11px] font-medium text-rose-600">/PPL/hari</span>
                    </div>
                    {dashboardStats.lowestKecamatan?.totalActivity && (
                      <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          <span className="text-slate-400">Total </span>
                          <span className="font-semibold text-slate-800 tabular-nums">{(dashboardStats.lowestKecamatan?.totalActivity ?? 0).toLocaleString("id-ID")}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                          <Users className="h-3 w-3" />
                          {dashboardStats.lowestKecamatan?.countPPL}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Chart: Persentase Submit per Kecamatan */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    {(() => {
                      const { daysElapsed } = calculateDayProgress();
                      const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);
                      return (
                        <>
                          <CardTitle className="text-lg">
                            📊 Persentase Pendataan Kecamatan terhadap Prelist - Hari ke-{daysElapsed} target minimal seharusnya {minPercentageTarget.toFixed(2)}% - Rata-rata Pendataan Kabupaten Majalengka {averageKecamatanPercentage.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </CardTitle>
                          <CardDescription>
                            Persentase komponen terpilih terhadap total assignments per kecamatan (diurutkan dari terbesar ke terkecil) - Hijau ≥target | Kuning deviasi ≤5% dari target minimal | Merah deviasi &gt;5% dari target minimal. Garis biru: target minimal | Garis ungu: rata-rata keseluruhan
                          </CardDescription>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanPercentageComponents.draft}
                        onChange={(e) => setKecamatanPercentageComponents({...kecamatanPercentageComponents, draft: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Draft</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanPercentageComponents.submit}
                        onChange={(e) => setKecamatanPercentageComponents({...kecamatanPercentageComponents, submit: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Submit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanPercentageComponents.approve}
                        onChange={(e) => setKecamatanPercentageComponents({...kecamatanPercentageComponents, approve: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Approve</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanPercentageComponents.reject}
                        onChange={(e) => setKecamatanPercentageComponents({...kecamatanPercentageComponents, reject: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Reject</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kecamatanPercentageComponents.revoke}
                        onChange={(e) => setKecamatanPercentageComponents({...kecamatanPercentageComponents, revoke: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Revoke</span>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : chartDataKecamatanPercentage.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    {(() => {
                      // Hitung rata-rata persentase
                      const avgPercentage = chartDataKecamatanPercentage.length > 0
                        ? chartDataKecamatanPercentage.reduce((sum, item) => sum + item.value, 0) / chartDataKecamatanPercentage.length
                        : 0;

                      // Determine Y axis max based on days elapsed
                      const { daysElapsed } = calculateDayProgress();
                      const yAxisMax = daysElapsed <= 30 ? 50 : 100;

                      return (
                        <BarChart data={chartDataKecamatanPercentage}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            domain={[0, yAxisMax]}
                            label={{ value: 'Persentase (%)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            content={<PercentageTooltip />}
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          />
                          {/* Garis rata-rata persentase */}
                          <ReferenceLine
                            y={avgPercentage}
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{ value: `Rata-rata: ${avgPercentage.toFixed(2)}%`, position: "right", fill: "#8b5cf6", fontSize: 12 }}
                          />
                          {/* Garis target minimal berdasarkan hari ke-x */}
                          {(() => {
                            const { daysElapsed } = calculateDayProgress();
                            const minTarget = getTargetMinimalPercentage(daysElapsed);
                            return (
                              <ReferenceLine
                                y={minTarget}
                                stroke="#3b82f6"
                                strokeWidth={2}
                                label={{ value: `Target minimal hari ke-${daysElapsed}: ${minTarget.toFixed(2)}%`, position: "right", fill: "#3b82f6", fontSize: 11 }}
                              />
                            );
                          })()}
                          <Bar 
                            dataKey="value" 
                            radius={[8, 8, 0, 0]} 
                            fill="#3b82f6"
                            label={{
                              position: 'top',
                              fill: '#1f2937',
                              fontSize: 11,
                              fontWeight: 600,
                              formatter: (value: number) => `${value.toFixed(2)}%`
                            }}
                          >
                            {chartDataKecamatanPercentage.map((entry, index) => {
                              const color = getColorForPercentage(entry.value);
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </BarChart>
                      );
                    })()}
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Tidak ada data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart: Persentase Pemeriksaan per Kecamatan (dari data PML) */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div>
                  {(() => {
                    const { daysElapsed } = calculateDayProgress();
                    const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);
                    return (
                      <>
                        <CardTitle className="text-lg">
                          📊 Persentase Pemeriksaan kecamatan terhadap Prelist - Hari ke-{daysElapsed} target minimal seharusnya {minPercentageTarget.toFixed(2)}% - Rata-rata Pemeriksaan Kabupaten Majalengka {averageKecamatanPemeriksaan.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </CardTitle>
                        <CardDescription>
                          Agregasi % Periksa/Prelist per kecamatan dari data PML — (Approve + Reject + Revoke) / Total Assignments (diurutkan dari terbesar ke terkecil) - Hijau ≥target | Kuning deviasi ≤5% dari target minimal | Merah deviasi &gt;5% dari target minimal. Garis biru: target minimal | Garis ungu: rata-rata keseluruhan
                        </CardDescription>
                      </>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : chartDataKecamatanPemeriksaan.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    {(() => {
                      const { daysElapsed } = calculateDayProgress();
                      const minTarget = getTargetMinimalPercentage(daysElapsed);
                      const yAxisMax = daysElapsed <= 30 ? 50 : 100;
                      return (
                        <BarChart data={chartDataKecamatanPemeriksaan}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            domain={[0, yAxisMax]}
                            label={{ value: 'Persentase (%)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip
                            formatter={(value: number, _n, entry: any) => {
                              const p = entry?.payload || {};
                              return [
                                `${Number(value).toFixed(2)}% (Periksa ${(p.totalPeriksa ?? 0).toLocaleString("id-ID")} / Assignments ${(p.totalAssignments ?? 0).toLocaleString("id-ID")})`,
                                "% Pemeriksaan",
                              ];
                            }}
                            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                          />
                          <ReferenceLine
                            y={averageKecamatanPemeriksaan}
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{ value: `Rata-rata: ${averageKecamatanPemeriksaan.toFixed(2)}%`, position: "right", fill: "#8b5cf6", fontSize: 12 }}
                          />
                          <ReferenceLine
                            y={minTarget}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            label={{ value: `Target minimal hari ke-${daysElapsed}: ${minTarget.toFixed(2)}%`, position: "right", fill: "#3b82f6", fontSize: 11 }}
                          />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                            fill="#3b82f6"
                            label={{
                              position: 'top',
                              fill: '#1f2937',
                              fontSize: 11,
                              fontWeight: 600,
                              formatter: (value: number) => `${value.toFixed(2)}%`
                            }}
                          >
                            {chartDataKecamatanPemeriksaan.map((entry, index) => (
                              <Cell key={`cell-periksa-${index}`} fill={getColorForPercentage(entry.value)} />
                            ))}
                          </Bar>
                        </BarChart>
                      );
                    })()}
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Tidak ada data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charts Row 1: All 26 Kecamatan */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    <CardTitle className="text-lg">
                      📊 Rata-rata Aktifitas PPL per Kecamatan - Hari ke-{calculateDayProgress().daysElapsed}
                    </CardTitle>
                    <CardDescription>
                      Rata-rata aktivitas komponen terpilih per PPL per kecamatan (26 kecamatan, diurutkan terbesar ke terkecil) - Hijau ≥10/hari | Kuning 7-9/hari | Merah &lt;7/hari. Garis biru: target minimal 10/hari | Garis ungu: rata-rata keseluruhan
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanActivityComponents.draft}
                        onChange={(e) => setKecamatanActivityComponents({...kecamatanActivityComponents, draft: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Draft</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanActivityComponents.submit}
                        onChange={(e) => setKecamatanActivityComponents({...kecamatanActivityComponents, submit: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Submit</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanActivityComponents.approve}
                        onChange={(e) => setKecamatanActivityComponents({...kecamatanActivityComponents, approve: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Approve</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={kecamatanActivityComponents.reject}
                        onChange={(e) => setKecamatanActivityComponents({...kecamatanActivityComponents, reject: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Reject</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kecamatanActivityComponents.revoke}
                        onChange={(e) => setKecamatanActivityComponents({...kecamatanActivityComponents, revoke: e.target.checked})}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-medium">Revoke</span>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : chartDataKecamatanAll.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    {(() => {
                      // Hitung rata-rata keseluruhan dari semua kecamatan
                      const avgOverall = chartDataKecamatanAll.length > 0
                        ? chartDataKecamatanAll.reduce((sum, item) => sum + item.value, 0) / chartDataKecamatanAll.length
                        : 0;
                      
                      return (
                        <ComposedChart data={chartDataKecamatanAll}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip content={<KecamatanTooltip />} />
                          {/* Garis minimal target: 7 submit/hari (biru tegas) */}
                          <ReferenceLine
                            y={MIN_DAILY_TARGET}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            label={{ value: `Target minimal: ${MIN_DAILY_TARGET}/hari`, position: "right", fill: "#3b82f6", fontSize: 12 }}
                          />
                          {/* Garis rata-rata keseluruhan (ungu putus-putus) */}
                          <ReferenceLine
                            y={avgOverall}
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{ value: `Rata-rata: ${avgOverall.toFixed(2)}/hari`, position: "right", fill: "#8b5cf6", fontSize: 12 }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600, fill: '#000000' }}>
                            {chartDataKecamatanAll.map((entry, index) => {
                              const color = getColorGradient(entry.value);
                              return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                          </Bar>
                        </ComposedChart>
                      );
                    })()}
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Tidak ada data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart: Rata-rata Aktifitas Pemeriksaan per Kecamatan (dari data PML % Periksa) */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div>
                  <CardTitle className="text-lg">
                    📊 Rata-rata Aktifitas Pemeriksaan per Kecamatan - Hari ke-{calculateDayProgress().daysElapsed}
                  </CardTitle>
                  <CardDescription>
                    Rata-rata % Periksa dari data PML per kecamatan (diurutkan terbesar ke terkecil)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : chartDataKecamatanPemeriksaanAvg.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    {(() => {
                      const avgOverall = chartDataKecamatanPemeriksaanAvg.length > 0
                        ? chartDataKecamatanPemeriksaanAvg.reduce((sum, item) => sum + item.value, 0) / chartDataKecamatanPemeriksaanAvg.length
                        : 0;
                      return (
                        <ComposedChart data={chartDataKecamatanPemeriksaanAvg}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(val: any) => `${val}%`} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                            formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "% Periksa"]}
                          />
                          <ReferenceLine
                            y={avgOverall}
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{ value: `Rata-rata: ${avgOverall.toFixed(2)}%`, position: "right", fill: "#8b5cf6", fontSize: 12 }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {chartDataKecamatanPemeriksaanAvg.map((entry, idx) => (
                              <Cell key={`cell-pem-${idx}`} fill={getColorForPemeriksaanStatic(entry.value)} />
                            ))}
                            <LabelList
                              dataKey="value"
                              position="top"
                              formatter={(val: any) => `${Number(val).toFixed(2)}%`}
                              style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                              offset={6}
                            />
                          </Bar>
                        </ComposedChart>
                      );
                    })()}
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    Tidak ada data
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 10 PPL Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">⭐ Top 10 PPL Terbanyak</CardTitle>
                  <CardDescription>Performa terbaik petugas</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : chartDataPPLTop.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      {(() => {
                        const maxPPL = chartDataPPLTop.reduce((m, item) => Math.max(m, item.value || 0), 0);
                        const yMax = Math.ceil(maxPPL + 50);
                        return (
                          <BarChart data={chartDataPPLTop}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                              dataKey="name"
                              height={150}
                              tick={<MultiLineLabel />}
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 12 }} domain={[0, yMax]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                              }}
                            />
                            <Bar dataKey="value" fill={COLORS.optimal} radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600, fill: '#000000' }} />
                          </BarChart>
                        );
                      })()}
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Tidak ada data
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 PPL Terendah Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">📉 Top 10 PPL Terendah</CardTitle>
                  <CardDescription>Petugas yang perlu support</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : chartDataPPLLowest.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartDataPPLLowest}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          height={150}
                          tick={<MultiLineLabel />}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 500]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="value" fill={COLORS.warning} radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600, fill: '#000000' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Tidak ada data
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 Pemeriksaan PML Terbanyak Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">🔝 Top 10 Pemeriksaan PML Terbanyak</CardTitle>
                  <CardDescription>Persentase pemeriksaan PML tertinggi</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : chartDataPMLTop.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartDataPMLTop}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          height={150}
                          tick={<MultiLineLabel />}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => `${Number(value).toFixed(2)}%`}
                        />
                        <Bar
                          dataKey="value"
                          fill={COLORS.optimal}
                          radius={[8, 8, 0, 0]}
                          label={{
                            position: 'insideTop',
                            fontSize: 10,
                            fontWeight: 700,
                            fill: '#000000',
                            formatter: (value: any) => `${Number(value).toFixed(2)}%`,
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Tidak ada data
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top 10 Pemeriksaan PML Terendah Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">📉 Top 10 Pemeriksaan PML Terendah</CardTitle>
                  <CardDescription>Persentase pemeriksaan PML terendah</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : chartDataPMLLowest.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartDataPMLLowest}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          height={150}
                          tick={<MultiLineLabel />}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 12 }} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                          formatter={(value) => `${Number(value).toFixed(2)}%`}
                        />
                        <Bar dataKey="value" fill={COLORS.warning} radius={[8, 8, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 600, fill: '#000000', formatter: (value) => `${value.toFixed(2)}%` }} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      Tidak ada data
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PPL Tab */}
          <TabsContent value="ppl" className="space-y-6 mt-6">
            {/* Search and Filter */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Data Individu PPL</CardTitle>
                    <CardDescription>
                      Detail monitoring per Kecamatan dan Petugas ({aggregatedData.rows.length} total)
                    </CardDescription>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 flex-1 md:max-w-2xl md:justify-end">
                    {isLoggedIn && aggregatedData.rows.length > 0 && (
                      <button
                        onClick={() => exportPPLToExcel(aggregatedData.rows)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download Excel
                      </button>
                    )}
                    
                    <div className="relative flex-1 md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Cari kecamatan atau PPL..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-10 h-9"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="h-9 px-3 rounded-md border border-slate-300 text-slate-700 text-sm bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Semua Status</option>
                      <option value="optimal">✓ Sesuai Jadwal</option>
                      <option value="warning">⚠️ Tertinggal</option>
                      <option value="critical">✗ Sangat Tertinggal</option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">Memuat data...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-12">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <span className="ml-2 text-red-600">Error: {error}</span>
                  </div>
                ) : aggregatedData.rows.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-slate-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Tidak ada data ditemukan
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-12 text-center text-slate-700 font-semibold">
                              No
                            </TableHead>
                            <TableHead className="text-slate-700 font-semibold px-4 py-3">
                              Nama PPL
                            </TableHead>
                            <TableHead
                              className="text-slate-700 cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => toggleSort("kecamatan")}
                            >
                              <div className="flex items-center gap-2">
                                Kecamatan
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">Prelist Awal</div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">Prelist Awal = Total Assignment Fasih dari sheet Prelist_Awal per SLS yang menjadi assignment PPL</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => toggleSort("draft")}
                            >
                              <div className="flex items-center justify-end gap-2">
                                Draft
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => toggleSort("reject")}
                            >
                              <div className="flex items-center justify-end gap-2">
                                Reject
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "revoke") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("revoke");
                                }
                              }}
                            >
                              <div className="flex items-center justify-end gap-2">
                                Revoke
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => toggleSort("submit")}
                            >
                              <div className="flex items-center justify-end gap-2">
                                Submit
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => toggleSort("approve")}
                            >
                              <div className="flex items-center justify-end gap-2">
                                Approve
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">% Capaian</div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">% Capaian = (Reject + Revoke + Submit + Approve) / Prelist Awal</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => toggleSort("dailyavg")}
                            >
                              <div className="flex items-center justify-end gap-2">
                                Rata-rata Harian
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold px-4 py-3">
                              Status
                            </TableHead>
                            <TableHead className="text-slate-700 font-semibold px-4 py-3">
                              Notifikasi
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRows.map((row, index) => {
                            const totalAktivitas = row.draft + row.jumlah_reject + row.jumlah_submit + row.jumlah_approve + (row.jumlah_revoke || 0);
                            const scheduleStatus = getScheduleStatus(totalAktivitas);
                            const StatusIcon = scheduleStatus.icon;
                            const isExpanded = expandedPPL.has(row.nama_ppl);
                            const rowEmail = (row.email_ppl || "").trim().toLowerCase();
                            const userDetailRows = rowEmail ? usersByEmail.get(rowEmail) || [] : [];

                            return (
                              <React.Fragment key={`${row.kecamatan}-${row.nama_ppl}`}>
                                <TableRow
                                  className="hover:bg-slate-50 border-b transition-colors cursor-pointer"
                                >
                                  <TableCell className="text-center text-slate-600 font-medium w-12">
                                    {startIndexPPL + index + 1}
                                  </TableCell>
                                  <TableCell 
                                    className="text-slate-700 px-4 py-3 cursor-pointer hover:text-blue-600 flex items-center align-middle gap-2 font-semibold"
                                    onClick={() => {
                                      setExpandedPPL(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(row.nama_ppl)) {
                                          newSet.delete(row.nama_ppl);
                                        } else {
                                          newSet.add(row.nama_ppl);
                                        }
                                        return newSet;
                                      });
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 transition-transform inline flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 transition-transform inline -rotate-90 flex-shrink-0" />
                                    )}
                                    {row.nama_ppl || "-"}
                                  </TableCell>
                                  <TableCell className="text-slate-900 px-4 py-3">
                                    {row.kecamatan}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-blue-900 px-4 py-3">
                                    {(row.prelist_awal || 0).toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                    {row.draft.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-red-700 px-4 py-3">
                                    {row.jumlah_reject.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-orange-700 px-4 py-3">
                                    {(row.jumlah_revoke || 0).toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                    {row.jumlah_submit.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-700 px-4 py-3">
                                    {row.jumlah_approve.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold px-4 py-3">
                                    {(() => {
                                      const prel = row.prelist_awal || 0;
                                      const num = row.jumlah_reject + (row.jumlah_revoke || 0) + row.jumlah_submit + row.jumlah_approve;
                                      const pct = prel > 0 ? (num / prel) * 100 : 0;
                                      return <span style={{ color: getColorForPercentage(pct) }}>{pct.toFixed(2)} %</span>;
                                    })()}
                                  </TableCell>
                                  <TableCell className="text-right text-slate-700 px-4 py-3">
                                    {(Math.floor((row.draft + row.jumlah_reject + row.jumlah_submit + row.jumlah_approve + (row.jumlah_revoke || 0)) / Math.max(1, daysElapsed) * 100) / 100).toFixed(2).replace(/\.?0+$/, '')} aktivitas/hari
                                  </TableCell>
                                  <TableCell className="text-center px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <StatusIcon
                                        className="h-4 w-4"
                                        style={{
                                          color: scheduleStatus.color,
                                        }}
                                      />
                                      <span className="text-xs font-semibold text-slate-700">
                                        {scheduleStatus.label}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-600 px-4 py-3 max-w-xs">
                                    <div className="bg-blue-50 rounded px-2 py-1">
                                      {scheduleStatus.notification}
                                    </div>
                                  </TableCell>
                                </TableRow>

                                {/* Expanded User Details from Semua Users sheet */}
                                {isExpanded && (
                                  <>
                                    {userDetailRows.length > 0 ? (
                                      userDetailRows.map((user: any, userIdx: number) => (
                                        <TableRow 
                                          key={`${row.nama_ppl}-user-${userIdx}`}
                                          className="bg-slate-100 border-b hover:bg-slate-200 transition-colors"
                                        >
                                          <TableCell className="px-4 py-2" />
                                          <TableCell className="text-sm text-slate-700 px-4 py-2 italic pl-8" />
                                          <TableCell className="text-sm text-slate-600 px-4 py-2">
                                            {getColumnValue(user, "regioncode", ["regionCode", "region", "Region Code", "kecamatan", "Kecamatan"], "-")}
                                          </TableCell>
                                          <TableCell className="text-sm text-blue-900 font-semibold px-4 py-2 text-right">
                                            {(() => {
                                              const rc = String(getColumnValue(user, "regioncode", ["regionCode", "region", "Region Code"], "") || "").trim();
                                              const v = rc ? (prelistBySlsMap.get(rc) || 0) : 0;
                                              return v.toLocaleString("id-ID");
                                            })()}
                                          </TableCell>
                                          <TableCell className="text-sm text-slate-600 px-4 py-2 text-right">
                                            {getColumnValue(user, "draft", ["DRAFT", "Draft", "DRAFT"], "0")}
                                          </TableCell>
                                          <TableCell className="text-sm text-red-700 font-semibold px-4 py-2 text-right">
                                            {getColumnValue(user, "rejected_by_pengawas", ["reje", "REJECTED_BY_PENGAWAS", "rejected", "Rejected", "Reject"], "0")}
                                          </TableCell>
                                          <TableCell className="text-sm text-orange-700 font-semibold px-4 py-2 text-right">
                                            {(() => {
                                              for (const v of Object.values(user || {})) {
                                                if (typeof v !== "string" || !v.includes("REVOKED")) continue;
                                                try {
                                                  const p = JSON.parse(v.trim());
                                                  return String(p["REVOKED BY Pengawas"] ?? p["REVOKED_BY_PENGAWAS"] ?? p["REVOKED"] ?? 0);
                                                } catch { /* ignore */ }
                                              }
                                              return "0";
                                            })()}
                                          </TableCell>
                                          <TableCell className="text-sm text-slate-600 px-4 py-2 text-right">
                                            {getColumnValue(user, "submitted_by_pencacah", ["subi", "SUBMITTED_BY_PENCACAH", "submitted", "Submitted", "Submit"], "0")}
                                          </TableCell>
                                          <TableCell className="text-sm text-green-700 font-semibold px-4 py-2 text-right">
                                            {getColumnValue(user, "approved_by_pengawas", ["appr", "APPROVED_BY_PENGAWAS", "approved", "Approved", "Approve"], "0")}
                                          </TableCell>
                                          <TableCell className="text-sm font-semibold px-4 py-2 text-right">
                                            {(() => {
                                              const toNum = (v: any) => {
                                                const n = parseFloat(String(v ?? "0").replace(/[^\d.-]/g, ""));
                                                return isNaN(n) ? 0 : n;
                                              };
                                              const rc = String(getColumnValue(user, "regioncode", ["regionCode", "region", "Region Code"], "") || "").trim();
                                              const prel = rc ? (prelistBySlsMap.get(rc) || 0) : 0;
                                              const num = toNum(getColumnValue(user, "draft", ["DRAFT"], "0")) === 0 ? 0 : 0; // unused
                                              const submitted = toNum(getColumnValue(user, "submitted_by_pencacah", ["SUBMITTED_BY_PENCACAH"], "0"));
                                              const approved = toNum(getColumnValue(user, "approved_by_pengawas", ["APPROVED_BY_PENGAWAS"], "0"));
                                              const rejected = toNum(getColumnValue(user, "rejected_by_pengawas", ["REJECTED_BY_PENGAWAS"], "0"));
                                              let revoked = 0;
                                              for (const v of Object.values(user || {})) {
                                                if (typeof v !== "string" || !v.includes("REVOKED")) continue;
                                                try {
                                                  const p = JSON.parse(v.trim());
                                                  revoked = parseInt(p["REVOKED BY Pengawas"] ?? p["REVOKED_BY_PENGAWAS"] ?? p["REVOKED"] ?? 0) || 0;
                                                } catch { /* ignore */ }
                                              }
                                              const total = submitted + approved + rejected + revoked;
                                              const pct = prel > 0 ? (total / prel) * 100 : 0;
                                              const openVal = toNum(getColumnValue(user, "open", ["OPEN", "Open", "open"], "0"));
                                              return (
                                                <span className="inline-flex items-center gap-1 justify-end">
                                                  <span style={{ color: getColorForPercentage(pct) }}>{pct.toFixed(2)} %</span>
                                                  {openVal === 0 && <CheckCircle2 className="h-4 w-4 text-green-600 inline" />}
                                                </span>
                                              );
                                            })()}
                                          </TableCell>
                                          <TableCell colSpan={3} className="text-sm text-slate-600 px-4 py-2 italic" />
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow className="bg-amber-50 border-b">
                                         <TableCell colSpan={13} className="px-4 py-3 text-sm text-amber-700 italic">
                                          ⚠️ Tidak ada data dari sheet "Semua Users" untuk: {row.nama_ppl}
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}
                          {/* PPL Table Footer - Total Row */}
                          <TableRow className="bg-slate-200 font-bold border-t-2 border-slate-400">
                            <TableCell className="text-center text-slate-700 font-semibold w-12">-</TableCell>
                            <TableCell className="text-slate-700 px-4 py-3 font-semibold">TOTAL</TableCell>
                            <TableCell className="text-slate-700 px-4 py-3 font-semibold">-</TableCell>
                            <TableCell className="text-right font-bold text-blue-900 px-4 py-3">
                              {paginatedRows.reduce((sum, row) => sum + (row.prelist_awal || 0), 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 px-4 py-3">
                              {paginatedRows.reduce((sum, row) => sum + row.draft, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-700 px-4 py-3">
                              {paginatedRows.reduce((sum, row) => sum + row.jumlah_reject, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-orange-700 px-4 py-3">
                              {paginatedRows.reduce((sum, row) => sum + (row.jumlah_revoke || 0), 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 px-4 py-3">
                              {paginatedRows.reduce((sum, row) => sum + row.jumlah_submit, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-700 px-4 py-3">
                              {paginatedRows.reduce((sum, row) => sum + row.jumlah_approve, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold px-4 py-3">
                              {(() => {
                                const prel = paginatedRows.reduce((s, r) => s + (r.prelist_awal || 0), 0);
                                const num = paginatedRows.reduce((s, r) => s + r.jumlah_reject + (r.jumlah_revoke || 0) + r.jumlah_submit + r.jumlah_approve, 0);
                                const pct = prel > 0 ? (num / prel) * 100 : 0;
                                return <span style={{ color: getColorForPercentage(pct) }}>{pct.toFixed(2)} %</span>;
                              })()}
                            </TableCell>
                            <TableCell className="text-right text-slate-700 px-4 py-3 font-semibold">-</TableCell>
                            <TableCell className="text-center px-4 py-3 font-semibold">-</TableCell>
                            <TableCell className="text-center px-4 py-3 font-semibold">-</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPagesPPL > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">Tampilkan:</span>
                          <select
                            value={itemsPerPagePPL}
                            onChange={(e) => {
                              setItemsPerPagePPL(parseInt(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="h-8 px-2 rounded border border-slate-300 text-slate-700 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <span className="text-xs text-slate-600">/ halaman</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            «
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ‹
                          </button>
                          <span className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white rounded border border-slate-300">
                            Hal {currentPage} / {totalPagesPPL}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPagesPPL, currentPage + 1))}
                            disabled={currentPage === totalPagesPPL}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ›
                          </button>
                          <button
                            onClick={() => setCurrentPage(totalPagesPPL)}
                            disabled={currentPage === totalPagesPPL}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            »
                          </button>
                          <div className="text-xs text-slate-600 ml-4">
                            Menampilkan {paginatedRows.length} dari {aggregatedData.rows.length} data
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomali Tab */}
          <TabsContent value="anomali" className="space-y-6 mt-6">
            <React.Suspense fallback={<div className="py-12 text-center text-slate-500">Memuat Anomali...</div>}>
              <MonitoringLapanganAnomaliTab
                anomaliUsahaData={anomaliUsahaData}
                anomaliUsahaLoading={anomaliUsahaLoading}
                anomaliKeluargaData={anomaliKeluargaData}
                anomaliKeluargaLoading={anomaliKeluargaLoading}
                anomaliUsahaInfo={anomaliUsahaInfo}
                anomaliKeluargaInfo={anomaliKeluargaInfo}
                isLoggedIn={isLoggedIn}
                user={user}
              />
            </React.Suspense>
          </TabsContent>

          {/* PML Tab */}
          <TabsContent value="pml" className="space-y-6 mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Data PML (Petugas Pengawas Lapangan)</CardTitle>
                    <CardDescription>
                      Detail monitoring per PML ({sortedPMLData.length} total)
                    </CardDescription>
                  </div>

                  {(() => {
                    const { daysElapsed } = calculateDayProgress();
                    const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);
                    return (
                      <div className="hidden md:flex items-center">
                        <div className="rounded-2xl px-4 py-2 shadow-lg ml-4 bg-emerald-800 text-white flex flex-col justify-center items-start">
                          <div className="text-xs uppercase tracking-[0.12em] font-semibold">Hari ke-{daysElapsed}</div>
                          <div className="mt-0.5 text-sm font-bold">Target minimal: {minPercentageTarget.toFixed(2)}%</div>
                          <div className="mt-2 w-36">
                            <div className="w-full h-2 bg-white/20 rounded-full">
                              <div
                                className="h-2 bg-white rounded-full"
                                style={{ width: `${Math.min(100, minPercentageTarget)}%` }}
                                aria-label={`Progress ${minPercentageTarget.toFixed(2)} percent`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col md:flex-row gap-3 flex-1 md:max-w-2xl md:justify-end">
                    {isLoggedIn && aggregatedData.rows.length > 0 && (
                      <button
                        onClick={() => exportPMLToExcel(aggregatedData.rows)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download Excel
                      </button>
                    )}
                    
                    <div className="relative flex-1 md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Cari PML atau Kecamatan..."
                        value={pmlSearchTerm}
                        onChange={(e) => {
                          setPMLSearchTerm(e.target.value);
                          setCurrentPagePML(1);
                        }}
                        className="pl-10 h-9"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">Memuat data...</span>
                  </div>
                ) : sortedPMLData.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-slate-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Tidak ada data ditemukan
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-12 text-center text-slate-700 font-semibold">
                              No
                            </TableHead>
                            <TableHead
                              className="text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "nama_pml") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("nama_pml");
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                Nama PML
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead
                              className="text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "kecamatan") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("kecamatan");
                                }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                Kecamatan
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">Prelist Awal</div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">Prelist Awal = Total Assignment Fasih dari sheet Prelist_Awal per SLS yang menjadi assignment PPL di bawah PML</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "totalStatus") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("totalStatus");
                                }
                              }}
                            >
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">
                                      Total Status
                                      <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">Total Status = Jumlah Submit + Approve + Reject + Revoke</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "submit") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("submit");
                                }
                              }}
                            >
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">
                                      Submit
                                      <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">Submit = Jumlah data yang telah dikirim oleh PPL dan menunggu pemeriksaan PML</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "approve") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("approve");
                                }
                              }}
                            >
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">
                                      Approve
                                      <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">Approve = Jumlah data yang telah disetujui oleh PML</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "reject") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("reject");
                                }
                              }}
                            >
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">
                                      Reject
                                      <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">Reject = Jumlah data yang telah ditolak/dikembalikan oleh PML</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "revoke") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("revoke");
                                }
                              }}
                            >
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">
                                      Revoke
                                      <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">Revoke = Jumlah data yang persetujuannya telah dibatalkan (unapprove)</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">% Capaian</div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">% Capaian = (Reject + Revoke + Approve) / Prelist Awal</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "pemeriksaan") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("pemeriksaan");
                                }
                              }}
                            >
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">
                                      % Periksa
                                      <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">% Periksa = Persentase data yang telah diperiksa terhadap data yang dikirim</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                            <TableHead
                              className="text-right text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => {
                                if (pmlSortBy === "targetPercent") {
                                  setPMLSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                } else {
                                  setPMLSortBy("targetPercent");
                                }
                              }}
                            >
                              <UITooltipProvider delayDuration={200}>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <div className="flex items-center justify-end gap-2">
                                      % Periksa/Prelist
                                      <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                  </UITooltipTrigger>
                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                    <div className="text-sm text-slate-700">% Periksa/Prelist = Persentase data yang telah diperiksa terhadap jumlah muatan prelist</div>
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRowsPML.map((row, index) => {
                            const isExpanded = expandedPML.has(`${row.nama_pml}|${row.kecamatan}`);
                            const key = `${row.nama_pml}|${row.kecamatan}`;
                            const pplUnderPML = pmlGroups.get(key) || [];
                            const calculatedSubmitPPL = pplUnderPML.reduce((sum, ppl) => sum + (ppl.jumlah_submit || 0), 0);
                            
                            return (
                              <React.Fragment key={`${row.nama_pml}-${row.kecamatan}`}>
                                <TableRow className="hover:bg-slate-50 border-b transition-colors cursor-pointer">
                                  <TableCell className="text-center text-slate-600 font-medium w-12">
                                    {startIndexPML + index + 1}
                                  </TableCell>
                                  <TableCell 
                                    className="font-medium text-slate-900 px-4 py-3 cursor-pointer hover:text-blue-600 flex items-center gap-2"
                                    onClick={() => {
                                      const key = `${row.nama_pml}|${row.kecamatan}`;
                                      setExpandedPML(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(key)) {
                                          newSet.delete(key);
                                        } else {
                                          newSet.add(key);
                                        }
                                        return newSet;
                                      });
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 transition-transform inline flex-shrink-0" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 transition-transform inline -rotate-90 flex-shrink-0" />
                                    )}
                                    {row.nama_pml || "-"}
                                  </TableCell>
                                  <TableCell className="text-slate-700 px-4 py-3">
                                    {row.kecamatan || "-"}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                    <UITooltipProvider delayDuration={200}>
                                      <UITooltip>
                                        <UITooltipTrigger asChild>
                                          <div>{(calculatedSubmitPPL + row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0)).toLocaleString("id-ID")}</div>
                                        </UITooltipTrigger>
                                        <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                          <div className="text-sm text-slate-700">Total Status = Jumlah Submit + Approve + Reject + Revoke</div>
                                        </UITooltipContent>
                                      </UITooltip>
                                    </UITooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                    <UITooltipProvider delayDuration={200}>
                                      <UITooltip>
                                        <UITooltipTrigger asChild>
                                          <div>{calculatedSubmitPPL.toLocaleString("id-ID")}</div>
                                        </UITooltipTrigger>
                                        <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                          <div className="text-sm text-slate-700">Submit = Jumlah data yang telah dikirim oleh PPL dan menunggu pemeriksaan PML</div>
                                        </UITooltipContent>
                                      </UITooltip>
                                    </UITooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-700 px-4 py-3">
                                    <UITooltipProvider delayDuration={200}>
                                      <UITooltip>
                                        <UITooltipTrigger asChild>
                                          <div>{row.jumlah_approve.toLocaleString("id-ID")}</div>
                                        </UITooltipTrigger>
                                        <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                          <div className="text-sm text-slate-700">Approve = Jumlah data yang telah disetujui oleh PML</div>
                                        </UITooltipContent>
                                      </UITooltip>
                                    </UITooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-red-700 px-4 py-3">
                                    <UITooltipProvider delayDuration={200}>
                                      <UITooltip>
                                        <UITooltipTrigger asChild>
                                          <div>{row.jumlah_reject.toLocaleString("id-ID")}</div>
                                        </UITooltipTrigger>
                                        <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                          <div className="text-sm text-slate-700">Reject = Jumlah data yang telah ditolak/dikembalikan oleh PML</div>
                                        </UITooltipContent>
                                      </UITooltip>
                                    </UITooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-orange-700 px-4 py-3">
                                    <UITooltipProvider delayDuration={200}>
                                      <UITooltip>
                                        <UITooltipTrigger asChild>
                                          <div>{(row.jumlah_revoke || 0).toLocaleString("id-ID")}</div>
                                        </UITooltipTrigger>
                                        <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                          <div className="text-sm text-slate-700">Revoke = Jumlah data persetujuannya telah dibatalkan (unapprove)</div>
                                        </UITooltipContent>
                                      </UITooltip>
                                    </UITooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                    <UITooltipProvider delayDuration={200}>
                                      <UITooltip>
                                        <UITooltipTrigger asChild>
                                          <div>{(() => {
                                            const totalStatus = calculatedSubmitPPL + row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0);
                                            return totalStatus > 0 ? (((row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0)) / totalStatus) * 100).toFixed(2) : "0.00";
                                          })()} %</div>
                                        </UITooltipTrigger>
                                        <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                          <div className="text-sm text-slate-700">% Periksa = Persentase data yang telah diperiksa terhadap data yang dikirim</div>
                                        </UITooltipContent>
                                      </UITooltip>
                                    </UITooltipProvider>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold px-4 py-3" style={{ color: getColorForPercentage(row.targetPercent ?? 0) }}>
                                    <UITooltipProvider delayDuration={200}>
                                      <UITooltip>
                                        <UITooltipTrigger asChild>
                                          <div>{row.targetPercent !== undefined ? row.targetPercent.toFixed(2) : "0.00"} %</div>
                                        </UITooltipTrigger>
                                        <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                          <div className="text-sm text-slate-700">% Periksa/Prelist = Persentase data yang telah diperiksa terhadap jumlah muatan prelist</div>
                                        </UITooltipContent>
                                      </UITooltip>
                                    </UITooltipProvider>
                                  </TableCell>
                                </TableRow>

                                {/* Expanded PPL Details */}
                                {isExpanded && pplUnderPML.length > 0 && (
                                  pplUnderPML.map(ppl => (
                                    <TableRow 
                                      key={`${ppl.kecamatan}-${ppl.nama_ppl}-detail`}
                                      className="bg-slate-100 border-b hover:bg-slate-200 transition-colors"
                                    >
                                      <TableCell className="px-4 py-2" />
                                      <TableCell className="text-sm text-slate-700 px-4 py-2 italic pl-8">
                                        {ppl.nama_ppl}
                                      </TableCell>
                                      <TableCell className="text-sm text-slate-600 px-4 py-2">
                                        {ppl.kecamatan || row.kecamatan || '-'}
                                      </TableCell>
                                      <TableCell className="text-sm text-slate-600 px-4 py-2 text-right">
                                        {( (ppl.jumlah_submit || 0) + ppl.jumlah_approve + ppl.jumlah_reject + (ppl.jumlah_revoke || 0) ).toLocaleString("id-ID")}
                                      </TableCell>
                                      <TableCell className="text-sm text-slate-600 px-4 py-2 text-right">
                                        {ppl.jumlah_submit.toLocaleString("id-ID")}
                                      </TableCell>
                                      <TableCell className="text-sm text-green-700 font-semibold px-4 py-2 text-right">
                                        {ppl.jumlah_approve.toLocaleString("id-ID")}
                                      </TableCell>
                                      <TableCell className="text-sm text-red-700 font-semibold px-4 py-2 text-right">
                                        {ppl.jumlah_reject.toLocaleString("id-ID")}
                                      </TableCell>
                                      <TableCell className="text-sm text-orange-700 font-semibold px-4 py-2 text-right">
                                        {(ppl.jumlah_revoke || 0).toLocaleString("id-ID")}
                                      </TableCell>
                                      <TableCell className="text-sm text-slate-600 font-semibold px-4 py-2 text-right">
                                        <UITooltipProvider delayDuration={200}>
                                          <UITooltip>
                                            <UITooltipTrigger asChild>
                                              <div>{(() => {
                                                const totalStatus = (ppl.jumlah_submit || 0) + ppl.jumlah_approve + ppl.jumlah_reject + (ppl.jumlah_revoke || 0);
                                                return totalStatus > 0 ? (((ppl.jumlah_approve + ppl.jumlah_reject + (ppl.jumlah_revoke || 0)) / totalStatus) * 100).toFixed(2) : "0.00";
                                              })()} %</div>
                                            </UITooltipTrigger>
                                            <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                              <div className="text-sm text-slate-700">% Periksa = Persentase data yang telah diperiksa terhadap data yang dikirim</div>
                                            </UITooltipContent>
                                          </UITooltip>
                                        </UITooltipProvider>
                                      </TableCell>
                                      <TableCell className="text-sm text-slate-600 font-semibold px-4 py-2 text-right">
                                        {(() => {
                                          const totalAssignmentsPPL = ppl.total_assignments || 0;
                                          const numerator = (ppl.jumlah_approve || 0) + (ppl.jumlah_reject || 0) + (ppl.jumlah_revoke || 0);
                                          if (totalAssignmentsPPL > 0) {
                                            const percent = (numerator / totalAssignmentsPPL) * 100;
                                            return (
                                              <UITooltipProvider delayDuration={200}>
                                                <UITooltip>
                                                  <UITooltipTrigger asChild>
                                                    <div style={{ color: getColorForPercentage(percent) }}>{percent.toFixed(2)} %</div>
                                                  </UITooltipTrigger>
                                                  <UITooltipContent className="bg-white border border-gray-200 shadow-lg p-2 max-w-xs">
                                                    <div className="text-sm text-slate-700">% Periksa/Prelist = Persentase data yang telah diperiksa terhadap jumlah muatan prelist</div>
                                                  </UITooltipContent>
                                                </UITooltip>
                                              </UITooltipProvider>
                                            );
                                          }
                                          return "-";
                                        })()}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </React.Fragment>
                            );
                          })}
                          {/* PML Table Footer - Total Row */}
                          <TableRow className="bg-slate-200 font-bold border-t-2 border-slate-400">
                            <TableCell className="text-center text-slate-700 font-semibold w-12">-</TableCell>
                            <TableCell className="text-slate-700 px-4 py-3 font-semibold">TOTAL</TableCell>
                            <TableCell className="text-slate-700 px-4 py-3 font-semibold">-</TableCell>
                            <TableCell className="text-right font-bold text-slate-900 px-4 py-3">
                              {sortedPMLData.reduce((sum, row) => {
                                const key = `${row.nama_pml}|${row.kecamatan}`;
                                const pplUnderPML = pmlGroups.get(key) || [];
                                const calculatedSubmitPPL = pplUnderPML.reduce((s, ppl) => s + (ppl.jumlah_submit || 0), 0);
                                return sum + calculatedSubmitPPL + row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0);
                              }, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 px-4 py-3">
                              {sortedPMLData.reduce((sum, row) => {
                                const key = `${row.nama_pml}|${row.kecamatan}`;
                                const pplUnderPML = pmlGroups.get(key) || [];
                                const calculatedSubmitPPL = pplUnderPML.reduce((s, ppl) => s + (ppl.jumlah_submit || 0), 0);
                                return sum + calculatedSubmitPPL;
                              }, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-700 px-4 py-3">
                              {sortedPMLData.reduce((sum, row) => sum + row.jumlah_approve, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-700 px-4 py-3">
                              {sortedPMLData.reduce((sum, row) => sum + row.jumlah_reject, 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-orange-700 px-4 py-3">
                              {sortedPMLData.reduce((sum, row) => sum + (row.jumlah_revoke || 0), 0).toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 px-4 py-3">
                              {(() => {
                                  const avgPercentage = (sortedPMLData.length > 0 ? sortedPMLData.reduce((sum, row) => {
                                  const key = `${row.nama_pml}|${row.kecamatan}`;
                                  const pplUnderPML = pmlGroups.get(key) || [];
                                  const calculatedSubmitPPL = pplUnderPML.reduce((s, ppl) => s + (ppl.jumlah_submit || 0), 0);
                                  const totalStatus = calculatedSubmitPPL + row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0);
                                  if (totalStatus > 0) {
                                    return sum + ((row.jumlah_approve + row.jumlah_reject + (row.jumlah_revoke || 0)) / totalStatus * 100);
                                  }
                                  return sum;
                                }, 0) / sortedPMLData.length : 0);
                                return avgPercentage.toFixed(2);
                              })()} %
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900 px-4 py-3">
                              {(() => {
                                const avgTarget = sortedPMLData.length > 0 ? sortedPMLData.reduce((sum, row) => sum + (row.targetPercent || 0), 0) / sortedPMLData.length : 0;
                                return avgTarget.toFixed(2);
                              })()} %
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPagesPML > 1 && (
                      <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">Tampilkan:</span>
                          <select
                            value={itemsPerPagePML}
                            onChange={(e) => {
                              setItemsPerPagePML(parseInt(e.target.value));
                              setCurrentPagePML(1);
                            }}
                            className="h-8 px-2 rounded border border-slate-300 text-slate-700 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <span className="text-xs text-slate-600">/ halaman</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPagePML(1)}
                            disabled={currentPagePML === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            «
                          </button>
                          <button
                            onClick={() => setCurrentPagePML(prev => Math.max(1, prev - 1))}
                            disabled={currentPagePML === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ‹
                          </button>
                          <span className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white rounded border border-slate-300">
                            Hal {currentPagePML} / {totalPagesPML}
                          </span>
                          <button
                            onClick={() => setCurrentPagePML(prev => Math.min(totalPagesPML, prev + 1))}
                            disabled={currentPagePML === totalPagesPML}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ›
                          </button>
                          <button
                            onClick={() => setCurrentPagePML(totalPagesPML)}
                            disabled={currentPagePML === totalPagesPML}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            »
                          </button>
                          <div className="text-xs text-slate-600 ml-4">
                            Menampilkan {paginatedRowsPML.length} dari {sortedPMLData.length} data
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AFIRMASI Ratih Tab */}
          {isLoggedIn && (
            <TabsContent value="afirmasi-ratih" className="space-y-6 mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Data TA - Ratih Megasari Singkarru, MSc.</CardTitle>
                    <CardDescription>
                      Total: {afirmasiPPLData.ratih.length} data
                    </CardDescription>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 flex-1 md:max-w-2xl md:justify-end">
                    {isLoggedIn && afirmasiPPLData.ratih.length > 0 && (
                      <button
                        onClick={() => exportTAToExcel(afirmasiPPLData.ratih, "Ratih Megasari Singkarru, MSc.", "Ratih_Megasari")}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download Excel
                      </button>
                    )}
                    <div className="relative flex-1 md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Cari nama PPL atau kecamatan..."
                        value={afirmasiSearchTerm}
                        onChange={(e) => {
                          setAfirmasiSearchTerm(e.target.value);
                          setCurrentPageAfirmasi(1);
                        }}
                        className="pl-10 h-9"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {afirmasiLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">Memuat data...</span>
                  </div>
                ) : afirmasiPPLData.ratih.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-slate-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Tidak ada data ditemukan
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-12 text-center text-slate-700 font-semibold">
                              No
                            </TableHead>
                            <TableHead className="text-slate-700 font-semibold px-4 py-3">
                              Nama PPL
                            </TableHead>
                            <TableHead className="text-slate-700 px-4 py-3">
                              Kecamatan
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Draft
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Reject
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Revoke
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Submit
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Approve
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Rata-rata Harian
                            </TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold px-4 py-3">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {afirmasiPPLData.ratih.slice(startIndexAfirmasi, startIndexAfirmasi + itemsPerPageAfirmasi).map((item, index) => {
                            const totalAktivitas = item.draft + item.jumlah_reject + item.jumlah_submit + item.jumlah_approve;
                            const scheduleStatus = getScheduleStatus(totalAktivitas);
                            const StatusIcon = scheduleStatus.icon;

                            return (
                              <TableRow
                                key={`${item.email_ppl}-${index}`}
                                className="hover:bg-slate-50 border-b transition-colors"
                              >
                                <TableCell className="text-center text-slate-600 font-medium w-12">
                                  {startIndexAfirmasi + index + 1}
                                </TableCell>
                                <TableCell className="text-slate-700 px-4 py-3 font-semibold">
                                  {item.nama_ppl || "-"}
                                </TableCell>
                                <TableCell className="text-slate-900 px-4 py-3">
                                  {item.kecamatan}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                  {item.draft.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-red-700 px-4 py-3">
                                  {item.jumlah_reject.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-orange-700 px-4 py-3">
                                  {(item.jumlah_revoke || 0).toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                  {item.jumlah_submit.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-700 px-4 py-3">
                                  {item.jumlah_approve.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right text-slate-700 px-4 py-3">
                                  {(Math.floor((item.draft + item.jumlah_reject + item.jumlah_submit + item.jumlah_approve) / Math.max(1, daysElapsed) * 100) / 100).toFixed(2).replace(/\.?0+$/, '')} aktivitas/hari
                                </TableCell>
                                <TableCell className="text-center px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <StatusIcon className="h-4 w-4" style={{ color: scheduleStatus.color }} />
                                    <span className="text-xs font-semibold text-slate-700">
                                      {scheduleStatus.label}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {Math.ceil(afirmasiPPLData.ratih.length / itemsPerPageAfirmasi) > 1 && (
                      <div className="border-t bg-white px-4 py-3 flex items-center justify-between">
                        <div className="text-xs text-slate-600">
                          Total: {afirmasiPPLData.ratih.length} data
                        </div>

                        <div className="flex items-center gap-3">
                          <select
                            value={itemsPerPageAfirmasi}
                            onChange={(e) => {
                              setItemsPerPageAfirmasi(parseInt(e.target.value));
                              setCurrentPageAfirmasi(1);
                            }}
                            className="h-8 px-2 rounded border border-slate-300 text-slate-700 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <span className="text-xs text-slate-600">/ halaman</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPageAfirmasi(1)}
                            disabled={currentPageAfirmasi === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            «
                          </button>
                          <button
                            onClick={() => setCurrentPageAfirmasi(prev => Math.max(1, prev - 1))}
                            disabled={currentPageAfirmasi === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ‹
                          </button>
                          <span className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white rounded border border-slate-300">
                            Hal {currentPageAfirmasi} / {Math.ceil(afirmasiPPLData.ratih.length / itemsPerPageAfirmasi)}
                          </span>
                          <button
                            onClick={() => setCurrentPageAfirmasi(prev => Math.min(Math.ceil(afirmasiPPLData.ratih.length / itemsPerPageAfirmasi), prev + 1))}
                            disabled={currentPageAfirmasi === Math.ceil(afirmasiPPLData.ratih.length / itemsPerPageAfirmasi)}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ›
                          </button>
                          <button
                            onClick={() => setCurrentPageAfirmasi(Math.ceil(afirmasiPPLData.ratih.length / itemsPerPageAfirmasi))}
                            disabled={currentPageAfirmasi === Math.ceil(afirmasiPPLData.ratih.length / itemsPerPageAfirmasi)}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            »
                          </button>
                          <div className="text-xs text-slate-600 ml-4">
                            Menampilkan {Math.min(itemsPerPageAfirmasi, afirmasiPPLData.ratih.length - startIndexAfirmasi)} dari {afirmasiPPLData.ratih.length} data
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* AFIRMASI Ledya Tab */}
          {isLoggedIn && (
            <TabsContent value="afirmasi-ledya" className="space-y-6 mt-6">
              <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Data TA - Hj. Ledia Hanifa A., S.Si., M.Psi.T.</CardTitle>
                    <CardDescription>
                      Total: {afirmasiPPLData.ledya.length} data
                    </CardDescription>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 flex-1 md:max-w-2xl md:justify-end">
                    {isLoggedIn && afirmasiPPLData.ledya.length > 0 && (
                      <button
                        onClick={() => exportTAToExcel(afirmasiPPLData.ledya, "Hj. Ledia Hanifa A., S.Si., M.Psi.T.", "Ledia_Hanifa")}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download Excel
                      </button>
                    )}
                    <div className="relative flex-1 md:max-w-xs">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Cari nama PPL atau kecamatan..."
                        value={afirmasiSearchTerm}
                        onChange={(e) => {
                          setAfirmasiSearchTerm(e.target.value);
                          setCurrentPageAfirmasi(1);
                        }}
                        className="pl-10 h-9"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {afirmasiLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">Memuat data...</span>
                  </div>
                ) : afirmasiPPLData.ledya.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-slate-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Tidak ada data ditemukan
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-12 text-center text-slate-700 font-semibold">
                              No
                            </TableHead>
                            <TableHead className="text-slate-700 font-semibold px-4 py-3">
                              Nama PPL
                            </TableHead>
                            <TableHead className="text-slate-700 px-4 py-3">
                              Kecamatan
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Draft
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Reject
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Revoke
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Submit
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Approve
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Rata-rata Harian
                            </TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold px-4 py-3">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {afirmasiPPLData.ledya.slice(startIndexAfirmasi, startIndexAfirmasi + itemsPerPageAfirmasi).map((item, index) => {
                            const totalAktivitas = item.draft + item.jumlah_reject + item.jumlah_submit + item.jumlah_approve;
                            const scheduleStatus = getScheduleStatus(totalAktivitas);
                            const StatusIcon = scheduleStatus.icon;

                            return (
                              <TableRow
                                key={`${item.email_ppl}-${index}`}
                                className="hover:bg-slate-50 border-b transition-colors"
                              >
                                <TableCell className="text-center text-slate-600 font-medium w-12">
                                  {startIndexAfirmasi + index + 1}
                                </TableCell>
                                <TableCell className="text-slate-700 px-4 py-3 font-semibold">
                                  {item.nama_ppl || "-"}
                                </TableCell>
                                <TableCell className="text-slate-900 px-4 py-3">
                                  {item.kecamatan}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                  {item.draft.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-red-700 px-4 py-3">
                                  {item.jumlah_reject.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-orange-700 px-4 py-3">
                                  {(item.jumlah_revoke || 0).toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                  {item.jumlah_submit.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-700 px-4 py-3">
                                  {item.jumlah_approve.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right text-slate-700 px-4 py-3">
                                  {(Math.floor((item.draft + item.jumlah_reject + item.jumlah_submit + item.jumlah_approve) / Math.max(1, daysElapsed) * 100) / 100).toFixed(2).replace(/\.?0+$/, '')} aktivitas/hari
                                </TableCell>
                                <TableCell className="text-center px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <StatusIcon className="h-4 w-4" style={{ color: scheduleStatus.color }} />
                                    <span className="text-xs font-semibold text-slate-700">
                                      {scheduleStatus.label}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {Math.ceil(afirmasiPPLData.ledya.length / itemsPerPageAfirmasi) > 1 && (
                      <div className="border-t bg-white px-4 py-3 flex items-center justify-between">
                        <div className="text-xs text-slate-600">
                          Total: {afirmasiPPLData.ledya.length} data
                        </div>

                        <div className="flex items-center gap-3">
                          <select
                            value={itemsPerPageAfirmasi}
                            onChange={(e) => {
                              setItemsPerPageAfirmasi(parseInt(e.target.value));
                              setCurrentPageAfirmasi(1);
                            }}
                            className="h-8 px-2 rounded border border-slate-300 text-slate-700 text-xs bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <span className="text-xs text-slate-600">/ halaman</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPageAfirmasi(1)}
                            disabled={currentPageAfirmasi === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            «
                          </button>
                          <button
                            onClick={() => setCurrentPageAfirmasi(prev => Math.max(1, prev - 1))}
                            disabled={currentPageAfirmasi === 1}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ‹
                          </button>
                          <span className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white rounded border border-slate-300">
                            Hal {currentPageAfirmasi} / {Math.ceil(afirmasiPPLData.ledya.length / itemsPerPageAfirmasi)}
                          </span>
                          <button
                            onClick={() => setCurrentPageAfirmasi(prev => Math.min(Math.ceil(afirmasiPPLData.ledya.length / itemsPerPageAfirmasi), prev + 1))}
                            disabled={currentPageAfirmasi === Math.ceil(afirmasiPPLData.ledya.length / itemsPerPageAfirmasi)}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ›
                          </button>
                          <button
                            onClick={() => setCurrentPageAfirmasi(Math.ceil(afirmasiPPLData.ledya.length / itemsPerPageAfirmasi))}
                            disabled={currentPageAfirmasi === Math.ceil(afirmasiPPLData.ledya.length / itemsPerPageAfirmasi)}
                            className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            »
                          </button>
                          <div className="text-xs text-slate-600 ml-4">
                            Menampilkan {Math.min(itemsPerPageAfirmasi, afirmasiPPLData.ledya.length - startIndexAfirmasi)} dari {afirmasiPPLData.ledya.length} data
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
          </div>
        </Tabs>


      </div>
    </div>
  );
}

export default MonitoringLapangan;
