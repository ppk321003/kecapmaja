import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { useAuth } from "@/contexts/AuthContext";
import { MonitoringLastUpdated } from "@/components/MonitoringLastUpdated";
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
} from "recharts";

// Schedule: 15 Juni - 31 Agustus 2026 (77 hari)
// Target: flexible 7-12 submit per hari (average 9-10)
const SCHEDULE_START = new Date(2026, 5, 15); // 15 June 2026
const SCHEDULE_END = new Date(2026, 7, 31); // 31 August 2026
const TOTAL_DAYS = 77; // 15 Juni - 31 Agustus = 77 hari
const MIN_DAILY_TARGET = 7;
const MAX_DAILY_TARGET = 12;
const AVG_DAILY_TARGET = 9.5; // (7 + 12) / 2
const TOTAL_TARGET = TOTAL_DAYS * AVG_DAILY_TARGET; // ~732 submit
const ITEMS_PER_PAGE = 20;

interface AggregatedData {
  kecamatan: string;
  nama_ppl: string;
  nama_pml: string;
  draft: number;
  jumlah_submit: number;
  jumlah_approve: number;
  jumlah_reject: number;
  total_assignments: number;
  status_counts: {
    open: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
}

interface DashboardStats {
  totalKecamatan: number;
  totalSubmit: number;
  averageSubmit: number;
  topKecamatan: { name: string; value: number; totalSubmit?: number; countPPL?: number };
  lowestKecamatan: { name: string; value: number; totalSubmit?: number; countPPL?: number };
  topKecamatanByPercentage?: { name: string; value: number; totalSubmit?: number; totalAssignments?: number };
  lowestKecamatanByPercentage?: { name: string; value: number; totalSubmit?: number; totalAssignments?: number };
}

interface ChartData {
  name: string;
  value: number;
}

interface PMLData {
  nama_pml: string;
  kecamatan: string;
  jumlah_submit_ppl: number;
  jumlah_approve: number;
  jumlah_reject: number;
}

const SPREADSHEET_ID = "1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o";
const SHEET_NAME = "REKAP_SCRP";

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
const getScheduleStatus = (jumlahSubmit: number): {
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
  if (jumlahSubmit >= maxDayTarget) {
    return {
      status: "optimal",
      label: "Sesuai Jadwal",
      targetLabel: "Diatas target harian",
      notification: `Sudah submit ${jumlahSubmit} dari target ${minDayTarget}-${maxDayTarget} submit (Hari ke-${daysElapsed})`,
      icon: CheckCircle2,
      color: COLORS.optimal,
    };
  }

  // Good: between min and max target
  if (jumlahSubmit >= minDayTarget && jumlahSubmit < maxDayTarget) {
    return {
      status: "optimal",
      label: "Sesuai Jadwal",
      targetLabel: "Sesuai target harian",
      notification: `Sudah submit ${jumlahSubmit} dari target ${minDayTarget}-${maxDayTarget} submit (Hari ke-${daysElapsed})`,
      icon: CheckCircle2,
      color: COLORS.optimal,
    };
  }

  // Warning: between 60% of min target and min target
  const warningThreshold = minDayTarget * 0.6;
  if (jumlahSubmit >= warningThreshold) {
    return {
      status: "warning",
      label: "Tertinggal",
      targetLabel: "Dibawah target harian",
      notification: `Sudah submit ${jumlahSubmit} dari target ${minDayTarget}-${maxDayTarget} submit (Hari ke-${daysElapsed}). Kurang ${minDayTarget - jumlahSubmit}`,
      icon: AlertTriangle,
      color: COLORS.warning,
    };
  }

  // Critical: below 60% of min target
  return {
    status: "critical",
    label: "Sangat Tertinggal",
    targetLabel: "Dibawah target harian",
    notification: `Sudah submit ${jumlahSubmit} dari target ${minDayTarget}-${maxDayTarget} submit (Hari ke-${daysElapsed}). Kurang ${minDayTarget - jumlahSubmit}`,
    icon: AlertCircle,
    color: COLORS.critical,
  };
};

// Function to get color gradient based on TARGET (7-12), not min-max
const getColorGradient = (value: number): string => {
  // Berbasis target: 7-12 submit/hari
  // Sesuai deskripsi: Hijau ≥7/hari | Kuning 4-6/hari | Merah <4/hari
  if (value >= 7) return "#22c55e"; // Hijau (>= 7)
  if (value >= 4) return "#eab308"; // Kuning (4-6)
  return "#dc2626"; // Merah (< 4)
};

// Function untuk mendapatkan warna persentase berdasarkan hari ke-x dan target fleksibel
const getColorForPercentage = (percentage: number): string => {
  const { daysElapsed, minDayTarget, maxDayTarget } = calculateDayProgress();
  
  // Hitung target persentase berdasarkan hari ke-x
  // Target minimal: persentase yang seharusnya dicapai pada hari ke-x
  // Asumsi: target adalah 732 submit dalam 77 hari, dengan min 7/hari
  const minPercentageTarget = (daysElapsed * MIN_DAILY_TARGET / TOTAL_TARGET) * 100;
  const maxPercentageTarget = (daysElapsed * MAX_DAILY_TARGET / TOTAL_TARGET) * 100;
  
  // Optimal: mencapai atau melebihi target maksimal
  if (percentage >= maxPercentageTarget) {
    return "#22c55e"; // Hijau cerah
  }
  
  // Good: mencapai target minimal
  if (percentage >= minPercentageTarget) {
    return "#84cc16"; // Lime
  }
  
  // Warning: mencapai 60% dari target minimal
  const warningThreshold = minPercentageTarget * 0.6;
  if (percentage >= warningThreshold) {
    return "#f97316"; // Orange
  }
  
  // Critical: di bawah warning threshold
  return "#dc2626"; // Red
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
    
    // Tentukan status berdasarkan perbandingan dengan range target (7-12)
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
    const totalSubmit = data.totalSubmit || 0;
    const totalAssignments = data.totalAssignments || 0;
    
    return (
      <div className="bg-white p-3 border border-slate-300 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900">{data.name}</p>
        <div className="mt-2 space-y-1 text-xs text-slate-700">
          <p>📝 <span className="font-medium">Jumlah Submit:</span> {totalSubmit.toLocaleString("id-ID")}</p>
          <p>📋 <span className="font-medium">Total Assignments:</span> {totalAssignments.toLocaleString("id-ID")}</p>
          <p className="text-slate-600 mt-2 font-semibold">Persentase: {percentage.toLocaleString("id-ID")}%</p>
        </div>
      </div>
    );
  }
  return null;
};

// Export PPL data to Excel
const exportPPLToExcel = (data: AggregatedData['rows']) => {
  const aoa: (string | number)[][] = [
    ['DATA INDIVIDU PPL (PETUGAS PENCACAH LAPANGAN)'],
    ['Tanggal Export', new Date().toLocaleString('id-ID')],
    [],
    ['No', 'Kecamatan', 'Nama PPL', 'Nama PML', 'Draft', 'Submit', 'Approve', 'Reject', 'Total Assignment', 'Persentase Submit'],
    ...data.map((row, idx) => {
      const percentage = row.total_assignments > 0 ? ((row.jumlah_submit / row.total_assignments) * 100).toFixed(2) : '0.00';
      return [
        idx + 1,
        row.kecamatan,
        row.nama_ppl,
        row.nama_pml,
        row.draft,
        row.jumlah_submit,
        row.jumlah_approve,
        row.jumlah_reject,
        row.total_assignments,
        `${percentage}%`
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
    { wch: 15 },
    { wch: 15 }
  ];

  XLSX.writeFile(wb, `Data_PPL_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export PML data to Excel (recalculated from aggregatedData for accuracy)
const exportPMLToExcel = (aggregatedRows: AggregatedData['rows']) => {
  // Rebuild PML data with EXACT same calculation as UI table
  // All values (Submit, Approve, Reject) must be calculated from individual PPL data
  const pmlMap = new Map<string, { 
    nama_pml: string; 
    kecamatan: string; 
    jumlah_submit_ppl: number; 
    jumlah_approve: number; 
    jumlah_reject: number;
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
      });
    }
    const current = pmlMap.get(key)!;
    // Sum all values from individual PPL rows
    current.jumlah_submit_ppl += row.jumlah_submit;
    current.jumlah_approve += row.jumlah_approve;
    current.jumlah_reject += row.jumlah_reject;
  });

  // Sort by % Pemeriksaan (descending) - same as UI default
  const pmlRows = Array.from(pmlMap.values()).sort((a, b) => {
    const percA = a.jumlah_submit_ppl > 0 ? ((a.jumlah_approve + a.jumlah_reject) / a.jumlah_submit_ppl) * 100 : 0;
    const percB = b.jumlah_submit_ppl > 0 ? ((b.jumlah_approve + b.jumlah_reject) / b.jumlah_submit_ppl) * 100 : 0;
    return percB - percA;
  });

  const aoa: (string | number)[][] = [
    ['DATA PML (PETUGAS PENGAWAS LAPANGAN)'],
    ['Tanggal Export', new Date().toLocaleString('id-ID')],
    [],
    ['No', 'Nama PML', 'Kecamatan', 'Submit PPL', 'Approve', 'Reject', '% Pemeriksaan'],
    ...pmlRows.map((row, idx) => {
      const percentage = row.jumlah_submit_ppl > 0 ? (((row.jumlah_approve + row.jumlah_reject) / row.jumlah_submit_ppl) * 100).toFixed(2) : '0.00';
      return [
        idx + 1,
        row.nama_pml,
        row.kecamatan,
        row.jumlah_submit_ppl,
        row.jumlah_approve,
        row.jumlah_reject,
        `${percentage}%`
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
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 }
  ];

  XLSX.writeFile(wb, `Data_PML_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export function MonitoringLapangan() {
  const { user } = useAuth();
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
  
  const { data: sheetData, loading, error } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [pmlSearchTerm, setPMLSearchTerm] = useState("");
  const [expandedPML, setExpandedPML] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"submit" | "kecamatan" | "ppl">("submit");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPagePML, setCurrentPagePML] = useState(1);
  const [itemsPerPagePPL, setItemsPerPagePPL] = useState(20);
  const [itemsPerPagePML, setItemsPerPagePML] = useState(20);
  const [pmlSortBy, setPMLSortBy] = useState<"nama_pml" | "approve" | "reject" | "pemeriksaan">("pemeriksaan");
  const [pmlSortOrder, setPMLSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"all" | "optimal" | "warning" | "critical">("all");

  // Process and aggregate data
  const { aggregatedData, dashboardStats, chartDataKecamatan, chartDataKecamatanAll, chartDataKecamatanPercentage, chartDataPPLTop, chartDataPPLLowest, totalProgress, pmlData } =
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
          totalProgress: { current: 0, target: TOTAL_TARGET, percentage: 0 },
          pmlData: [],
        };

      const dataMap = new Map<string, AggregatedData>();
      const kecamatanSet = new Set<string>();

      // Process data
      sheetData.forEach((row: any) => {
        const kecamatan = (row.kecamatan || "").trim();
        const nama_ppl = (row["nama ppl"] || "").trim();
        const nama_pml = (row["nama pml"] || "").trim();
        const jumlah_submit = parseInt(row["jumlah submit"] || 0) || 0;

        if (!kecamatan) return;

        kecamatanSet.add(kecamatan);
        const key = `${kecamatan}|${nama_ppl}`;

        if (!dataMap.has(key)) {
          dataMap.set(key, {
            kecamatan,
            nama_ppl,
            nama_pml,
            draft: 0,
            jumlah_submit: 0,
            jumlah_approve: 0,
            jumlah_reject: 0,
            total_assignments: 0,
            status_counts: {
              open: 0,
              draft: 0,
              submitted: 0,
              approved: 0,
              rejected: 0,
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

      let rows = Array.from(dataMap.values());

      // Filter by search term
      if (searchTerm) {
        rows = rows.filter(
          (row) =>
            row.kecamatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.nama_ppl.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by status
      if (statusFilter !== "all") {
        rows = rows.filter((row) => {
          const status = getScheduleStatus(row.jumlah_submit).status;
          return status === statusFilter;
        });
      }

      // Sort
      rows.sort((a, b) => {
        let compareValue = 0;
        if (sortBy === "submit") {
          compareValue = a.jumlah_submit - b.jumlah_submit;
        } else if (sortBy === "kecamatan") {
          compareValue = a.kecamatan.localeCompare(b.kecamatan);
        } else if (sortBy === "ppl") {
          compareValue = a.nama_ppl.localeCompare(b.nama_ppl);
        }

        return sortOrder === "desc" ? -compareValue : compareValue;
      });

      // Calculate statistics with UNIQUE kecamatan count
      const totalKecamatan = kecamatanSet.size; // Unique count, not row count
      const totalSubmit = rows.reduce((sum, row) => sum + row.jumlah_submit, 0);
      const averageSubmit =
        rows.length > 0
          ? Math.round(totalSubmit / rows.length)
          : 0;

      const sortedBySubmit = [...Array.from(dataMap.values())].sort(
        (a, b) => b.jumlah_submit - a.jumlah_submit
      );
      
      // PERBAIKAN: Hitung Performa Terbaik berdasarkan rata-rata submit per hari per PPL per kecamatan
      const { daysElapsed: elapsedDays } = calculateDayProgress();
      const kecamatanPerformaMap = new Map<string, { totalSubmit: number; countPPL: number; averageSubmit: number; averageSubmitPerHari: number }>();
      Array.from(dataMap.values()).forEach((row) => {
        const current = kecamatanPerformaMap.get(row.kecamatan) || { totalSubmit: 0, countPPL: 0, averageSubmit: 0, averageSubmitPerHari: 0 };
        current.totalSubmit += row.jumlah_submit;
        current.countPPL += 1;
        current.averageSubmit = Math.round(current.totalSubmit / current.countPPL);
        // Hitung rata-rata per hari: (Total Submit / Hari yang berlalu) / Jumlah PPL
        current.averageSubmitPerHari = elapsedDays > 0 ? Math.round((current.totalSubmit / elapsedDays) / Math.max(1, current.countPPL) * 100) / 100 : 0;
        kecamatanPerformaMap.set(row.kecamatan, current);
      });
      
      const topKecamatan = kecamatanPerformaMap.size > 0
        ? Array.from(kecamatanPerformaMap.entries())
            .map(([name, data]) => ({
              name,
              value: data.averageSubmitPerHari,
              totalSubmit: data.totalSubmit,
              countPPL: data.countPPL,
            }))
            .sort((a, b) => b.value - a.value)[0]
        : { name: "-", value: 0, totalSubmit: 0, countPPL: 0 };

      const lowestKecamatan = kecamatanPerformaMap.size > 0
        ? Array.from(kecamatanPerformaMap.entries())
            .map(([name, data]) => ({
              name,
              value: data.averageSubmitPerHari,
              totalSubmit: data.totalSubmit,
              countPPL: data.countPPL,
            }))
            .sort((a, b) => a.value - b.value)[0]
        : { name: "-", value: 0, totalSubmit: 0, countPPL: 0 };

      // Chart data: Top 10 Kecamatan (Terendah)
      const chartDataKecamatan: ChartData[] = sortedBySubmit
        .slice(-10)
        .reverse()
        .map((row) => ({
          name: row.kecamatan,
          value: row.jumlah_submit,
        }));

      // Chart data: Semua 26 Kecamatan (sorted abjad)
      // PERBAIKAN: Gunakan rata-rata per hari per PPL, sama dengan tooltip hover
      const chartDataKecamatanAll: any[] = Array.from(kecamatanPerformaMap.entries())
        .map(([name, data]) => ({ 
          name, 
          value: data.averageSubmitPerHari,
          countPPL: data.countPPL,
          totalSubmit: data.totalSubmit
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Chart data: Persentase Submit per Kecamatan (Jumlah Submit / Total Assignments)
      const kecamatanPercentageMap = new Map<string, { totalSubmit: number; totalAssignments: number }>();
      Array.from(dataMap.values()).forEach((row) => {
        const current = kecamatanPercentageMap.get(row.kecamatan) || { totalSubmit: 0, totalAssignments: 0 };
        current.totalSubmit += row.jumlah_submit;
        current.totalAssignments += row.total_assignments;
        kecamatanPercentageMap.set(row.kecamatan, current);
      });

      const chartDataKecamatanPercentage: any[] = Array.from(kecamatanPercentageMap.entries())
        .map(([name, data]) => ({
          name,
          value: data.totalAssignments > 0 
            ? Math.round((data.totalSubmit / data.totalAssignments) * 10000) / 100 
            : 0,
          totalSubmit: data.totalSubmit,
          totalAssignments: data.totalAssignments,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Top & Lowest Kecamatan by Percentage
      const topKecamatanByPercentage = chartDataKecamatanPercentage.length > 0
        ? [...chartDataKecamatanPercentage].sort((a, b) => b.value - a.value)[0]
        : { name: "-", value: 0, totalSubmit: 0, totalAssignments: 0 };

      const lowestKecamatanByPercentage = chartDataKecamatanPercentage.length > 0
        ? [...chartDataKecamatanPercentage].sort((a, b) => a.value - b.value)[0]
        : { name: "-", value: 0, totalSubmit: 0, totalAssignments: 0 };

      // Chart data for PPL Top 10
      const pplMap = new Map<string, number>();
      Array.from(dataMap.values()).forEach((row) => {
        if (row.nama_ppl) {
          const current = pplMap.get(row.nama_ppl) || 0;
          pplMap.set(row.nama_ppl, current + row.jumlah_submit);
        }
      });

      const pplSorted = Array.from(pplMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const chartDataPPLTop: ChartData[] = pplSorted.slice(0, 10);
      const chartDataPPLLowest: ChartData[] = pplSorted.slice(-10).reverse();

      // Calculate total progress
      const totalProgress = {
        current: totalSubmit,
        target: Math.round(TOTAL_TARGET),
        percentage: Math.round((totalSubmit / TOTAL_TARGET) * 100),
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
          });
        }

        const current = pmlMap.get(key)!;
        current.jumlah_submit_ppl += parseInt(row["jumlah submit ppl"] || 0) || 0;
        current.jumlah_approve += parseInt(row.approved_by_pengawas || 0) || 0;
        current.jumlah_reject += parseInt(row.rejected_by_pengawas || 0) || 0;
      });

      const pmlRows = Array.from(pmlMap.values());

      return {
        aggregatedData: {
          rows,
          stats: { totalKecamatan, totalSubmit, averageSubmit },
        },
        dashboardStats: { totalKecamatan, totalSubmit, averageSubmit, topKecamatan, lowestKecamatan, topKecamatanByPercentage, lowestKecamatanByPercentage },
        chartDataKecamatan,
        chartDataKecamatanAll,
        chartDataKecamatanPercentage,
        chartDataPPLTop,
        chartDataPPLLowest,
        totalProgress,
        pmlData: pmlRows,
      };
    }, [sheetData, searchTerm, sortBy, sortOrder, statusFilter]);

  const toggleSort = (field: "submit" | "kecamatan" | "ppl") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Pagination PPL
  const totalPagesPPL = Math.ceil(aggregatedData.rows.length / itemsPerPagePPL);
  const startIndexPPL = (currentPage - 1) * itemsPerPagePPL;
  const paginatedRows = aggregatedData.rows.slice(startIndexPPL, startIndexPPL + itemsPerPagePPL);

  // PML Data sorting and pagination
  const sortedPMLData = useMemo(() => {
    let sorted = [...pmlData];
    
    // Recalculate actual submit PPL based on aggregatedData for accurate sorting
    sorted = sorted.map(pml => {
      const pplUnderPML = aggregatedData.rows.filter(ppl => 
        ppl.nama_pml === pml.nama_pml && ppl.kecamatan === pml.kecamatan
      );
      const actualSubmit = pplUnderPML.reduce((sum, ppl) => sum + ppl.jumlah_submit, 0);
      const pemeriksaan = actualSubmit > 0 ? ((pml.jumlah_approve + pml.jumlah_reject) / actualSubmit) * 100 : 0;
      return { ...pml, actualSubmit, pemeriksaan };
    });
    
    // Apply search filter
    if (pmlSearchTerm) {
      sorted = sorted.filter((item) =>
        item.nama_pml.toLowerCase().includes(pmlSearchTerm.toLowerCase()) ||
        item.kecamatan.toLowerCase().includes(pmlSearchTerm.toLowerCase())
      );
    }
    
    if (pmlSortBy === "nama_pml") {
      sorted.sort((a, b) => a.nama_pml.localeCompare(b.nama_pml));
    } else if (pmlSortBy === "approve") {
      sorted.sort((a, b) => a.jumlah_approve - b.jumlah_approve);
    } else if (pmlSortBy === "reject") {
      sorted.sort((a, b) => a.jumlah_reject - b.jumlah_reject);
    } else if (pmlSortBy === "pemeriksaan") {
      sorted.sort((a, b) => a.pemeriksaan - b.pemeriksaan);
    }
    if (pmlSortOrder === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [pmlData, pmlSortBy, pmlSortOrder, pmlSearchTerm, aggregatedData]);

  const totalPagesPML = Math.ceil(sortedPMLData.length / itemsPerPagePML);
  const startIndexPML = (currentPagePML - 1) * itemsPerPagePML;
  const paginatedRowsPML = sortedPMLData.slice(startIndexPML, startIndexPML + itemsPerPagePML);

  const { daysElapsed, avgDayTarget } = calculateDayProgress();

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
              value="kecamatan"
              className="flex items-center gap-3 justify-center flex-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">Kecamatan</span>
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
          </TabsList>

          <div className="w-full">

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Overview Stats */}
            {dashboardStats && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Total Submit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900">
                      {dashboardStats.totalSubmit.toLocaleString("id-ID")}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">formulir tersubmit</p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">
                      🏆 Performa Terbaik Persentase
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-blue-900">
                      {dashboardStats.topKecamatanByPercentage.name}
                    </div>
                    <p className="text-sm text-blue-700 font-semibold mt-1">
                      {dashboardStats.topKecamatanByPercentage.value.toLocaleString("id-ID")}%
                    </p>
                    {dashboardStats.topKecamatanByPercentage.totalSubmit && (
                      <p className="text-xs text-blue-600 mt-1">
                        {dashboardStats.topKecamatanByPercentage.totalSubmit.toLocaleString("id-ID")} dari {dashboardStats.topKecamatanByPercentage.totalAssignments.toLocaleString("id-ID")}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-700">
                      📉 Performa Terburuk Persentase
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-orange-900">
                      {dashboardStats.lowestKecamatanByPercentage.name}
                    </div>
                    <p className="text-sm text-orange-700 font-semibold mt-1">
                      {dashboardStats.lowestKecamatanByPercentage.value.toLocaleString("id-ID")}%
                    </p>
                    {dashboardStats.lowestKecamatanByPercentage.totalSubmit && (
                      <p className="text-xs text-orange-600 mt-1">
                        {dashboardStats.lowestKecamatanByPercentage.totalSubmit.toLocaleString("id-ID")} dari {dashboardStats.lowestKecamatanByPercentage.totalAssignments.toLocaleString("id-ID")}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-700">
                      🏆 Performa Terbaik Submit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-green-900">
                      {dashboardStats.topKecamatan.name}
                    </div>
                    <p className="text-sm text-green-700 font-semibold mt-1">
                      Rata-rata/hari: {dashboardStats.topKecamatan.value.toLocaleString("id-ID")} submit/PPL
                    </p>
                    {dashboardStats.topKecamatan.totalSubmit && (
                      <p className="text-xs text-green-600 mt-1">
                        Total: {dashboardStats.topKecamatan.totalSubmit.toLocaleString("id-ID")} submit ({dashboardStats.topKecamatan.countPPL} PPL)
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">
                      📉 Performa Terburuk Submit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold text-red-900">
                      {dashboardStats.lowestKecamatan.name}
                    </div>
                    <p className="text-sm text-red-700 font-semibold mt-1">
                      Rata-rata/hari: {dashboardStats.lowestKecamatan.value.toLocaleString("id-ID")} submit/PPL
                    </p>
                    {dashboardStats.lowestKecamatan.totalSubmit && (
                      <p className="text-xs text-red-600 mt-1">
                        Total: {dashboardStats.lowestKecamatan.totalSubmit.toLocaleString("id-ID")} submit ({dashboardStats.lowestKecamatan.countPPL} PPL)
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Chart: Persentase Submit per Kecamatan */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                {(() => {
                  const { daysElapsed } = calculateDayProgress();
                  const minPercentageTarget = (daysElapsed * MIN_DAILY_TARGET / TOTAL_TARGET) * 100;
                  return (
                    <>
                      <CardTitle className="text-lg">
                        📊 Persentase per Kecamatan - Hari ke-{daysElapsed} target minimal seharusnya {minPercentageTarget.toFixed(2)}%
                      </CardTitle>
                      <CardDescription>Persentase jumlah submit terhadap total assignments per kecamatan (26 kecamatan, diurutkan abjad)</CardDescription>
                    </>
                  );
                })()}
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
                            const minTarget = (daysElapsed * MIN_DAILY_TARGET / TOTAL_TARGET) * 100;
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

            {/* Charts Row 1: All 26 Kecamatan */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">
                  📊 Rata-rata PPL Submit per Kecamatan - Hari ke-{calculateDayProgress().daysElapsed}
                </CardTitle>
                <CardDescription>Rata-rata submit per PPL per kecamatan (26 kecamatan, diurutkan abjad) - Hijau ≥7/hari | Kuning 4-6/hari | Merah &lt;4/hari. Garis biru: target minimal 7/hari | Garis ungu: rata-rata keseluruhan</CardDescription>
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
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
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
                      <BarChart data={chartDataPPLTop}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="value" fill={COLORS.optimal} radius={[8, 8, 0, 0]} />
                      </BarChart>
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
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="value" fill={COLORS.warning} radius={[8, 8, 0, 0]} />
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

          {/* Kecamatan Tab */}
          <TabsContent value="kecamatan" className="space-y-6 mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <div>
                  <CardTitle>Data Kecamatan</CardTitle>
                  <CardDescription>
                    Detail monitoring kecamatan dengan perhitungan rata-rata submit per hari
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">Memuat data...</span>
                  </div>
                ) : chartDataKecamatanAll.length === 0 ? (
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
                              Kecamatan
                            </TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold px-4 py-3">
                              Jumlah PPL
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Jumlah Submit
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Rata-rata/hari
                            </TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold px-4 py-3">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartDataKecamatanAll.map((row, index) => {
                            const statusIcon = row.value >= MAX_DAILY_TARGET 
                              ? { label: "Diatas target", color: "#10b981", icon: CheckCircle2 }
                              : row.value >= MIN_DAILY_TARGET
                              ? { label: "Sesuai target", color: "#3b82f6", icon: CheckCircle2 }
                              : { label: "Belum target", color: "#f59e0b", icon: AlertTriangle };
                            
                            const StatusIcon = statusIcon.icon;

                            return (
                              <TableRow
                                key={row.name}
                                className="hover:bg-slate-50 border-b transition-colors\"
                              >
                                <TableCell className="text-center text-slate-600 font-medium w-12\">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900 px-4 py-3\">
                                  {row.name}
                                </TableCell>
                                <TableCell className="text-center text-slate-700 px-4 py-3\">
                                  {row.countPPL} orang
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900 px-4 py-3\">
                                  {row.totalSubmit.toLocaleString("id-ID")} submit
                                </TableCell>
                                <TableCell className="text-right text-slate-700 px-4 py-3\">
                                  {row.value.toLocaleString("id-ID")} submit/PPL
                                </TableCell>
                                <TableCell className="text-center px-4 py-3\">
                                  <div className="flex items-center justify-center gap-1.5\">
                                    <StatusIcon
                                      className="h-4 w-4\"
                                      style={{
                                        color: statusIcon.color,
                                      }}
                                    />
                                    <span className="text-xs font-semibold text-slate-700\">
                                      {statusIcon.label}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
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
                    {isPPK && aggregatedData.rows.length > 0 && (
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
                              className="text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 px-4 py-3"
                              onClick={() => toggleSort("kecamatan")}
                            >
                              <div className="flex items-center gap-2">
                                Kecamatan
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Draft
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Reject
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
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Approve
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Rata-rata Submit Harian
                            </TableHead>
                            <TableHead className="text-center text-slate-700 font-semibold px-4 py-3">
                              Status
                            </TableHead>
                            <TableHead className="text-slate-700 font-semibold px-4 py-3">
                              Keterangan Target
                            </TableHead>
                            <TableHead className="text-slate-700 font-semibold px-4 py-3">
                              Notifikasi
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRows.map((row, index) => {
                            const scheduleStatus = getScheduleStatus(row.jumlah_submit);
                            const StatusIcon = scheduleStatus.icon;

                            return (
                              <TableRow
                                key={`${row.kecamatan}-${row.nama_ppl}`}
                                className="hover:bg-slate-50 border-b transition-colors"
                              >
                                <TableCell className="text-center text-slate-600 font-medium w-12">
                                  {startIndexPPL + index + 1}
                                </TableCell>
                                <TableCell className="text-slate-700 px-4 py-3">
                                  {row.nama_ppl || "-"}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900 px-4 py-3">
                                  {row.kecamatan}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                  {row.draft.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-red-700 px-4 py-3">
                                  {row.jumlah_reject.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                  {row.jumlah_submit.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-700 px-4 py-3">
                                  {row.jumlah_approve.toLocaleString("id-ID")}
                                </TableCell>
                                <TableCell className="text-right text-slate-700 px-4 py-3">
                                  {(Math.floor(row.jumlah_submit / Math.max(1, daysElapsed) * 100) / 100).toFixed(2).replace(/\.?0+$/, '')} submit/hari
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
                                <TableCell className="text-center px-4 py-3">
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                    scheduleStatus.targetLabel === "Diatas target harian"
                                      ? "bg-green-100 text-green-700"
                                      : scheduleStatus.targetLabel === "Sesuai target harian"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}>
                                    {scheduleStatus.targetLabel}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 px-4 py-3 max-w-xs">
                                  <div className="bg-blue-50 rounded px-2 py-1">
                                    {scheduleStatus.notification}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
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

                  <div className="flex flex-col md:flex-row gap-3 flex-1 md:max-w-2xl md:justify-end">
                    {isPPK && aggregatedData.rows.length > 0 && (
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
                            <TableHead className="text-slate-700 font-semibold px-4 py-3">
                              Kecamatan
                            </TableHead>
                            <TableHead className="text-right text-slate-700 font-semibold px-4 py-3">
                              Submit PPL
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
                              <div className="flex items-center justify-end gap-2">
                                Approve
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
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
                              <div className="flex items-center justify-end gap-2">
                                Reject
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
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
                              <div className="flex items-center justify-end gap-2">
                                % Pemeriksaan
                                <ArrowUpDown className="h-4 w-4" />
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRowsPML.map((row, index) => {
                            const isExpanded = expandedPML.has(`${row.nama_pml}|${row.kecamatan}`);
                            const pplUnderPML = aggregatedData.rows.filter(ppl => 
                              ppl.nama_pml === row.nama_pml && ppl.kecamatan === row.kecamatan
                            );
                            const calculatedSubmitPPL = pplUnderPML.reduce((sum, ppl) => sum + ppl.jumlah_submit, 0);
                            
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
                                    {calculatedSubmitPPL.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-green-700 px-4 py-3">
                                    {row.jumlah_approve.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-red-700 px-4 py-3">
                                    {row.jumlah_reject.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                    {calculatedSubmitPPL > 0 ? (((row.jumlah_approve + row.jumlah_reject) / calculatedSubmitPPL) * 100).toFixed(2) : "0.00"}%
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
                                        Draft: {ppl.draft}
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
                                    </TableRow>
                                  ))
                                )}
                              </React.Fragment>
                            );
                          })}
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
          </div>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 text-xs text-slate-500 text-center space-y-1">
          <p>📊 Data terakhir diperbarui dari sheet REKAP_SCRP</p>
          <p>
            🎯 Target: ~{TOTAL_TARGET.toLocaleString("id-ID")} submit ({MIN_DAILY_TARGET}-{MAX_DAILY_TARGET} submit/hari × {TOTAL_DAYS} hari)
          </p>
          <p className="text-xs text-slate-400">Dashboard ini memberikan inovasi: unique kecamatan count, flexible target range, status filter, pagination, dan multiple analytics views</p>
        </div>
      </div>
    </div>
  );
}

export default MonitoringLapangan;
