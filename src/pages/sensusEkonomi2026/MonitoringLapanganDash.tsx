import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpDown, Loader2, AlertCircle, ChevronDown, ChevronRight, Search, Database, Trophy, Users, Link, Edit3, CheckSquare, User as UserIcon, Phone, Copy, Flag as FlagIcon, Mail, Eye, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import * as XLSX from "xlsx";
import IdentifikasiUTTTab from "./IdentifikasiUTTTab";
import SkalaUsahaTab from "./SkalaUsahaTab";
import KeluargaTab, { KELUARGA_SPREADSHEET_ID, useKeluargaDashboardSummary, useKeluargaDebugInfo } from "./KeluargaTab";

const STACKING_SPREADSHEET_ID = "1_LNMJ2NSujoSegGQgG4jkLCR0GFHgP6PNHeQjp6WSCo";
const STACKING_SHEET = "STACKING";
const PROGRES_SPREADSHEET_ID = STACKING_SPREADSHEET_ID;
const PROGRES_SHEET = "PROGRES PENDATAAN";
const MONITORING_LAPANGAN_SPREADSHEET_ID = "1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o";
const RECRUITMENT_SPREADSHEET_ID = "1lQPMO70a-uzojaCnMDI7AmZmhL1QOtpFRBA4Z1rET5Y";
const RECRUITMENT_SHEET_AFIRMASI = "AFIRMASI";
const SHEET_ANOMALI_USAHA = "Mikro Anomali Usaha";
const SHEET_ANOMALI_KELUARGA = "Mikro Anomali Keluarga";
const SHEET_USAHA_PERUSAHAAN = "USAHA PERUSAHAAN";
const SHEET_USAHA_KELUARGA = "USAHA KELUARGA";
const SHEET_PROPORSI_USAHA = "PROPORSI PERTANIAN NON PERTANIAN";

const normalizeSheetKey = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 16 ? digits.slice(-16) : "";
};

const normalizeString = (value: any): string =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

type ChartRatioTooltipSeries = {
  name: string;
  pctKey: string;
  pctLabel: string;
  valueKey: string;
  valueLabel: string;
  targetKey: string;
  targetLabel: string;
};

type ChartRatioTooltipProps = {
  active?: boolean;
  payload?: any[];
  label?: any;
  labelPrefix: string;
  pctKey?: string;
  pctLabel?: string;
  valueKey?: string;
  valueLabel?: string;
  targetKey?: string;
  targetLabel?: string;
  fontSize: number;
  series?: ChartRatioTooltipSeries[];
};

const ChartRatioTooltip = ({
  active,
  payload,
  label,
  labelPrefix,
  pctKey,
  pctLabel,
  valueKey,
  valueLabel,
  targetKey,
  targetLabel,
  fontSize,
  series,
}: ChartRatioTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const fmt = (n: number) => n.toLocaleString("id-ID");

  const seriesRows = series && series.length > 0
    ? series.map((entry) => {
        const row = payload.find((item) => item?.dataKey === entry.pctKey) ?? payload[0];
        const data = row?.payload || {};
        return {
          ...entry,
          pct: Number(data[entry.pctKey]) || 0,
          value: Number(data[entry.valueKey]) || 0,
          target: Number(data[entry.targetKey]) || 0,
        };
      })
    : [];

  if (seriesRows.length > 0) {
    return (
      <div
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-md"
        style={{ fontSize }}
      >
        <p className="font-semibold text-slate-800">{`${labelPrefix}: ${label}`}</p>
        {seriesRows.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className={index > 0 ? "mt-2 border-t border-slate-200 pt-2" : ""}>
            <p className="font-medium text-slate-700">{entry.name}</p>
            <p className="mt-1 text-slate-700">
              {entry.pctLabel}: <span className="font-semibold">{entry.pct.toFixed(2)}%</span>
            </p>
            <p className="text-slate-600">
              {entry.valueLabel}: <span className="font-semibold">{fmt(entry.value)}</span>
            </p>
            <p className="text-slate-600">
              {entry.targetLabel}: <span className="font-semibold">{fmt(entry.target)}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }

  const data = payload[0]?.payload || {};
  const pct = Number(data[pctKey ?? ""]) || 0;
  const value = Number(data[valueKey ?? ""]) || 0;
  const target = Number(data[targetKey ?? ""]) || 0;

  return (
    <div
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-md"
      style={{ fontSize }}
    >
      <p className="font-semibold text-slate-800">{`${labelPrefix}: ${label}`}</p>
      <p className="mt-1 text-slate-700">
        {pctLabel}: <span className="font-semibold">{pct.toFixed(2)}%</span>
      </p>
      <p className="text-slate-600">
        {valueLabel}: <span className="font-semibold">{fmt(value)}</span>
      </p>
      <p className="text-slate-600">
        {targetLabel}: <span className="font-semibold">{fmt(target)}</span>
      </p>
    </div>
  );
};

const getSheetCellText = (row: any, index: number) => {
  // (helper untuk membaca sel mentah)
  const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
  if (rawRow[index] !== undefined && rawRow[index] !== null) {
    return String(rawRow[index]).trim();
  }
  return "";
};

const parseNumericValue = (value: unknown) => {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatProporsiPercentage = (numerator: number, denominator: number): string =>
  denominator > 0 ? `${((numerator / denominator) * 100).toFixed(2)}%` : "0.00%";

const getProporsiPercentageClass = (numerator: number, denominator: number): string => {
  const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
  if (percentage >= 100) return "text-emerald-600";
  if (percentage >= 50) return "text-orange-500";
  return "text-red-600";
};

const getJumlahUsahaNonPertanian = (row: UsahaProporsiRow | UsahaProporsiDetailRow) => [
  row.bku_ditemukan_non_pertanian,
  row.bku_baru_non_pertanian,
  row.keluarga_ditemukan_non_pertanian,
  row.keluarga_baru_non_pertanian,
].reduce((total, value) => total + parseNumericValue(value), 0);

const getJumlahUsahaPertanian = (row: UsahaProporsiRow | UsahaProporsiDetailRow) => [
  row.bku_ditemukan_pertanian,
  row.bku_baru_pertanian,
  row.keluarga_ditemukan_pertanian,
  row.keluarga_baru_pertanian,
].reduce((total, value) => total + parseNumericValue(value), 0);

const normalizeColumnKey = (key: string): string =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeKecamatanKey = (key: unknown): string => {
  // strip leading bracketed numeric codes like "[050] ", leading numeric prefixes, and common region words
  const raw = String(key ?? "");
  const withoutCode = raw.replace(/^\s*\[?\s*\d+\s*\]?\s*/g, "");
  return normalizeColumnKey(
    withoutCode
      .replace(/\b(kec(amatan)?|kabupaten|kota)\b/gi, "")
      .trim()
  );
};

const normalizePersonKey = (key: unknown): string => normalizeColumnKey(String(key ?? ""));

const getRowValue = (row: any, primaryName: string, fallbackNames: string[] = [], defaultValue: any = "-"): any => {
  if (!row || typeof row !== "object") return defaultValue;

  const normalizedMap: Record<string, any> = {};
  const lowerMap: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    const normalizedKey = normalizeColumnKey(key);
    if (normalizedKey) normalizedMap[normalizedKey] = row[key];
    lowerMap[String(key).toLowerCase()] = row[key];
  });

  const tryKeys = [primaryName, ...fallbackNames];
  for (const key of tryKeys) {
    const normalizedKey = normalizeColumnKey(key);
    const rawKeyLower = String(key).toLowerCase();

    if (normalizedKey && normalizedMap[normalizedKey] !== undefined && normalizedMap[normalizedKey] !== null && normalizedMap[normalizedKey] !== "") {
      return normalizedMap[normalizedKey];
    }
    if (rawKeyLower in lowerMap && lowerMap[rawKeyLower] !== undefined && lowerMap[rawKeyLower] !== null && lowerMap[rawKeyLower] !== "") {
      return lowerMap[rawKeyLower];
    }
  }

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

const getRowSignature = (row: any): string => {
  if (!row || typeof row !== "object") return "";
  const entries = Object.entries(row)
    .filter(([key, value]) => key && !key.startsWith("__") && value !== undefined && value !== null)
    .map(([key, value]) => [String(key).trim(), String(value).trim()])
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
};

const extractAdminCountsFromRow = (row: any): number => {
  let sum = 0;
  try {
    for (const value of Object.values(row || {})) {
      if (typeof value !== "string") continue;
      const s = value.trim();
      if (!s || !(s.startsWith("{") || s.startsWith("["))) continue;
      try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === "object") {
          for (const [key, val] of Object.entries(parsed)) {
            if (String(key).toLowerCase().includes("admin")) {
              const n = parseInt(String(val || "0").replace(/[^0-9-]/g, ""), 10) || 0;
              sum += n;
            }
          }
        }
      } catch {
        // ignore invalid JSON
      }
    }
  } catch {
    // ignore
  }
  return sum;
};

const getApprovedTotalFromRow = (row: any): number => {
  const base = parseInt(String(row.approved_by_pengawas || row["approved_by_pengawas"] || 0), 10) || 0;
  return base + extractAdminCountsFromRow(row);
};

const parseRevokedFromUserRow = (row: any): number => {
  let sum = 0;
  try {
    for (const value of Object.values(row || {})) {
      if (typeof value !== "string") continue;
      const s = value.trim();
      if (!s || !(s.startsWith("{") || s.startsWith("["))) continue;
      try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === "object") {
          for (const [key, val] of Object.entries(parsed)) {
            if (String(key).toLowerCase().includes("revok")) {
              const n = parseInt(String(val || "0").replace(/[^0-9-]/g, ""), 10) || 0;
              sum += n;
            }
          }
        }
      } catch {
        // ignore invalid JSON
      }
    }
  } catch {
    // ignore
  }
  return sum;
};

const toProperCase = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const calculateDayProgress = (baseline = new Date(2026, 5, 15)): { daysElapsed: number } => {
  const today = new Date();
  const daysElapsed = Math.floor((today.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return { daysElapsed: Math.max(0, Math.min(daysElapsed, 63)) };
};

const getTargetMinimalPercentage = (daysElapsed: number): number => {
  const dailyRate = 27.2 / 16;
  const rawPercentage = dailyRate * daysElapsed;
  return Math.round(Math.max(0, Math.min(rawPercentage, 100)) * 100) / 100;
};

const getActivityStatusText = (jumlahAktivitas: number): { label: string; detail: string; color: string } => {
  const { daysElapsed } = calculateDayProgress();
  const minDayTarget = daysElapsed * 10;
  const maxDayTarget = daysElapsed * 15;

  if (daysElapsed <= 0) {
    return {
      label: "Belum Dimulai",
      detail: "Jadwal dimulai 15 Juni 2026",
      color: "#64748b",
    };
  }

  if (jumlahAktivitas >= maxDayTarget) {
    return {
      label: "Sesuai Jadwal",
      detail: `${jumlahAktivitas} aktivitas (target ${minDayTarget}-${maxDayTarget}, hari ke-${daysElapsed})`,
      color: "#16a34a",
    };
  }

  if (jumlahAktivitas >= minDayTarget) {
    return {
      label: "Sesuai Jadwal",
      detail: `${jumlahAktivitas} aktivitas (target ${minDayTarget}-${maxDayTarget}, hari ke-${daysElapsed})`,
      color: "#16a34a",
    };
  }

  const warningThreshold = minDayTarget * 0.6;
  if (jumlahAktivitas >= warningThreshold) {
    return {
      label: "Tertinggal",
      detail: `${jumlahAktivitas} aktivitas, kurang ${minDayTarget - jumlahAktivitas} (hari ke-${daysElapsed})`,
      color: "#ea580c",
    };
  }

  return {
    label: "Sangat Tertinggal",
    detail: `${jumlahAktivitas} aktivitas, kurang ${minDayTarget - jumlahAktivitas} (hari ke-${daysElapsed})`,
    color: "#dc2626",
  };
};

const parsePercentage = (value: unknown): number => {
  const text = String(value ?? "").trim();
  if (!text) return 0;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  let cleaned = text.replace(/\s+/g, "");

  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma) {
    cleaned = cleaned.replace(/,/g, ".");
  } else if (hasDot) {
    if (/\.\d{3}$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  cleaned = cleaned.replace(/[^0-9.\-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getColorForPercentage = (percentage: number): string => {
  // Change color rules to fixed thresholds for Persentase Assignment per Kecamatan
  if (percentage >= 100) return "#15803d"; // green
  if (percentage >= 50) return "#f97316"; // orange
  return "#dc2626"; // red
};

const getColorForPemutakhiranPercentage = (percentage: number): string => {
  if (percentage >= 100) return "#15803d";
  if (percentage >= 50) return "#f97316";
  return "#dc2626";
};

const getColorForProporsiChart = (percentage: number): string => {
  if (percentage > 100) return "#15803d";
  if (percentage >= 50) return "#f97316";
  return "#dc2626";
};

const getRowNumeric = (row: any, primary: string, fallbackNames: string[] = [], defaultValue = 0): number => {
  const value = getRowValue(row, primary, fallbackNames, "");
  return parseNumericValue(value);
};

const getRawColumnText = (row: any, columnIndex: number, defaultValue = ""): string => {
  const value = getSheetCellText(row, columnIndex);
  return value !== "" ? value : defaultValue;
};

const getRawColumnNumber = (row: any, columnIndex: number, defaultValue = 0): number => {
  const value = getRawColumnText(row, columnIndex, String(defaultValue));
  return parseNumericValue(value);
};

const getRawRowId16 = (row: any): string => {
  const rawId = getRawColumnText(row, 0, getRowValue(row, "kode", ["idsubsls", "id sub sls", "kode_sls"], ""));
  const normalized = normalizeSheetKey(rawId);
  return normalized.length === 16 ? normalized : "";
};

const getStackingKey = (row: any): string => {
  const rawKey = getRawColumnText(row, 3, getRowValue(row, "idsubsls", ["id sub sls", "kode", "kode_sls"], ""));
  const normalized = normalizeSheetKey(rawKey);
  if (normalized.length === 16) return normalized;
  const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
  const candidate = rawRow.find((value: unknown) => normalizeSheetKey(value).length === 16);
  return normalizeSheetKey(candidate);
};

const getStackingNamaPpl = (row: any): string => toProperCase(
  getRawColumnText(row, 26, getRowValue(row, "nama_ppl", ["nama ppl", "ppl"], ""))
);

const getStackingKecamatan = (row: any): string => toProperCase(
  getRawColumnText(row, 12, getRowValue(row, "nmkec", ["nama kecamatan", "kecamatan"], ""))
);

const getStackingWilkerstatValue = (row: any): number => {
  // Kolom X (jumlah_usaha) saja
  return parseNumericValue(getRawColumnText(row, 23, ""));
};

const extractProgressHeader = (value: string): string => {
  const segments = String(value || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const selected = segments.filter((part) => /^(sumber:|diperbarui:)/i.test(part));
  return selected.join(" | ");
};

interface PPLDetail {
  matchingKey: string;
  address: string;
  prelist_awal: string;
  prelist_wilkerstat: string;
  responden_didata: string;
  didata_netto: string;
  persentase_responden_didata: string;
  persentase_didata_netto: string;
  persentase_wilkerstat: string;
  aktivitas: string;
  aktivitasColor: string;
  draft: string;
  persentase_draft: string;
}

interface PPLRow {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: string;
  prelist_wilkerstat: string;
  responden_didata: string;
  didata_netto: string;
  persentase_responden_didata: string;
  persentase_didata_netto: string;
  persentase_wilkerstat: string;
  aktivitas: string;
  aktivitasColor: string;
  draft: string;
  persentase_draft: string;
  matchingKeys: string;
  details: PPLDetail[];
}

interface PMLChildRow {
  nama_ppl: string;
  prelist_wilkerstat: string;
  prelist_awal: string;
  responden_didata: string;
  didata_netto: string;
  persentase_responden_didata: string;
  persentase_didata_netto: string;
  persentase_wilkerstat: string;
  draft: string;
  persentase_draft: string;
}

interface PMLRow {
  id: string;
  nama_pml: string;
  kecamatan: string;
  prelist_wilkerstat: string;
  prelist_awal: string;
  responden_didata: string;
  didata_netto: string;
  persentase_responden_didata: string;
  persentase_didata_netto: string;
  persentase_wilkerstat: string;
  draft: string;
  persentase_draft: string;
  children: PMLChildRow[];
}

interface UsahaChildRow {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: string;
  jumlah_prelist_usaha: string;
  ditemukan: string;
  tutup: string;
  ganda: string;
  tidak_ditemukan: string;
  baru: string;
  ditemukan_plus_baru: string;
}

interface UsahaPerusahaanRow {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: string;
  jumlah_prelist_usaha: string;
  ditemukan: string;
  tutup: string;
  ganda: string;
  tidak_ditemukan: string;
  baru: string;
  ditemukan_plus_baru: string;
  children: UsahaChildRow[];
}

interface UsahaKeluargaRow {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: string;
  ditemukan: string;
  tutup: string;
  ganda: string;
  tidak_ditemukan: string;
  baru: string;
  ditemukan_plus_baru: string;
  children: UsahaChildRow[];
}

interface UsahaProporsiRow {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: string;
  prelist_usaha: string;
  utp_subsektor_st2023: string;
  bku_usaha_wilkerstat_baru: string;
  didata: string;
  bku_ditemukan_pertanian: string;
  bku_ditemukan_non_pertanian: string;
  bku_baru_pertanian: string;
  bku_baru_non_pertanian: string;
  keluarga_ditemukan_pertanian: string;
  keluarga_ditemukan_non_pertanian: string;
  keluarga_baru_pertanian: string;
  keluarga_baru_non_pertanian: string;
  children: UsahaProporsiDetailRow[];
}

type ProporsiExportMode = "kecamatan" | "ppl" | "sls";

interface UsahaProporsiDetailRow {
  id: string;
  kode: string;
  sls_rt: string;
  prelist_awal: string;
  prelist_usaha: string;
  utp_subsektor_st2023: string;
  bku_usaha_wilkerstat_baru: string;
  didata: string;
  bku_ditemukan_pertanian: string;
  bku_ditemukan_non_pertanian: string;
  bku_baru_pertanian: string;
  bku_baru_non_pertanian: string;
  keluarga_ditemukan_pertanian: string;
  keluarga_ditemukan_non_pertanian: string;
  keluarga_baru_pertanian: string;
  keluarga_baru_non_pertanian: string;
}

type UsahaProporsiNumericField =
  | "prelist_awal"
  | "prelist_usaha"
  | "utp_subsektor_st2023"
  | "didata"
  | "bku_usaha_wilkerstat_baru"
  | "bku_ditemukan_pertanian"
  | "bku_ditemukan_non_pertanian"
  | "bku_baru_pertanian"
  | "bku_baru_non_pertanian"
  | "keluarga_ditemukan_pertanian"
  | "keluarga_ditemukan_non_pertanian"
  | "keluarga_baru_pertanian"
  | "keluarga_baru_non_pertanian";

interface MergedUsahaDetailRow {
  id: string;
  sourceType: "Perusahaan" | "Keluarga" | "Gabungan";
  nama_ppl: string;
  kecamatan: string;
  sls_code: string;
  sls_rt: string;
  prelist_awal_baru: string;
  didata: string;
  bku_usaha_wilkerstat_baru: string;
  perusahaan_prelist_awal: string;
  perusahaan_jumlah_prelist_usaha: string;
  perusahaan_ditemukan: string;
  perusahaan_tutup: string;
  perusahaan_ganda: string;
  perusahaan_tidak_ditemukan: string;
  perusahaan_baru: string;
  perusahaan_ditemukan_plus_baru: string;
  keluarga_ditemukan: string;
  keluarga_tutup: string;
  keluarga_ganda: string;
  keluarga_tidak_ditemukan: string;
  keluarga_baru: string;
  keluarga_ditemukan_plus_baru: string;
}

interface MergedUsahaRow {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal_baru: string;
  didata: string;
  bku_usaha_wilkerstat_baru: string;
  perusahaan_prelist_awal: string;
  perusahaan_jumlah_prelist_usaha: string;
  perusahaan_ditemukan: string;
  perusahaan_tutup: string;
  perusahaan_ganda: string;
  perusahaan_tidak_ditemukan: string;
  perusahaan_baru: string;
  perusahaan_ditemukan_plus_baru: string;
  keluarga_ditemukan: string;
  keluarga_tutup: string;
  keluarga_ganda: string;
  keluarga_tidak_ditemukan: string;
  keluarga_baru: string;
  keluarga_ditemukan_plus_baru: string;
  details: MergedUsahaDetailRow[];
}

export default function MonitoringLapanganDash() {
  // Tab yang sudah pernah dibuka -> data hanya di-fetch saat dibutuhkan (lazy),
  // lalu tetap tersimpan di cache react-query.
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(["dashboard"]));
  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
  }, [activeTab]);
  const tabVisited = (tab: string) => visitedTabs.has(tab);

  const { data: stackingData, loading: stackingLoading, error: stackingError } = useGoogleSheetsData({
    spreadsheetId: STACKING_SPREADSHEET_ID,
    sheetName: STACKING_SHEET,
  });
  const { data: progresData, loading: progresLoading, error: progresError } = useGoogleSheetsData({
    spreadsheetId: PROGRES_SPREADSHEET_ID,
    sheetName: PROGRES_SHEET,
  });
  const { data: progresHeaderData, loading: progresHeaderLoading, error: progresHeaderError } = useGoogleSheetsData({
    spreadsheetId: PROGRES_SPREADSHEET_ID,
    sheetName: PROGRES_SHEET,
    range: `${PROGRES_SHEET}!A2`,
    mode: "single-cell",
  });

  const { data: monitoringSheetData, loading: monitoringSheetLoading, error: monitoringSheetError } = useGoogleSheetsData({
    spreadsheetId: MONITORING_LAPANGAN_SPREADSHEET_ID,
    sheetName: "REKAP_SCRP",
    // enable when capaian-kinerja tab OR dashboard is visited so mapping is available for dashboard calculations
    enabled: tabVisited("capaian-kinerja") || tabVisited("dashboard"),
  });
  const { data: monitoringUsersData, loading: monitoringUsersLoading, error: monitoringUsersError } = useGoogleSheetsData({
    spreadsheetId: MONITORING_LAPANGAN_SPREADSHEET_ID,
    sheetName: "Semua Users",
    enabled: tabVisited("capaian-kinerja") || tabVisited("umkm-sosek") || tabVisited("dashboard"),
  });
  // AFIRMASI sheet removed — do not fetch to avoid invalid range errors
  const afirmasiData: any[] = [];
  
  const monitoringLoading = monitoringSheetLoading || monitoringUsersLoading;
  const monitoringError = monitoringSheetError || monitoringUsersError;

  const afirmasiEmailSets = useMemo(() => ({ ratih: new Set<string>(), ledya: new Set<string>() }), []);

  const pplEmailByName = useMemo(() => {
    const map = new Map<string, string>();
    (monitoringUsersData || []).forEach((row: any) => {
      const email = String(getRowValue(row, "email", ["email", "Email"], "")).trim().toLowerCase();
      const namaPpl = String(getRowValue(row, "nama_ppl", ["nama_ppl", "nama ppl", "nama pencacah", "nama"], "")).trim().toLowerCase();
      const kecamatan = normalizeKecamatanKey(getRowValue(row, "regioncode", ["regioncode", "regionCode", "region", "kecamatan"], ""));
      if (!email || !namaPpl) return;
      map.set(`${namaPpl}|${kecamatan}`, email);
      map.set(namaPpl, email);
    });
    return map;
  }, [monitoringUsersData]);

  // Hardcoded TA name lists (fallback matching by name)
  const afirmasiNameSets = useMemo(() => {
    const normalizeNameKey = (s: string) => {
      const raw = String(s || "");
      // strip surrounding quotes and common unicode quote characters
      const strippedQuotes = raw.replace(/^["'`\u201C\u201D\u2018\u2019]+|["'`\u201C\u201D\u2018\u2019]+$/g, "");
      return normalizeString(strippedQuotes)
        .replace(/[^a-z0-9\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    };

    const ratihNames = [
      'Gita Sumartono',
      'Nono Julianto',
      'Purnama',
      'Widi Permana',
      'Tia Agustianingsih Mustafa',
      'Moch. Hamdani Budiman',
      'Riki Rahmatullah',
      'Fahmi Miftahul Firdaus',
      'Fauzi Fajar Nugraha',
      'Riza Yulfianti',
      'Nur Alam',
      'Anggi Muhamad Algifari'
    ].map(normalizeNameKey);

    const ledyaNames = [
      'Mifta Muflihun Nisa',
      'Tri Hendrawan',
      'Haris Haryono',
      'Haris Haryono"',
      'Ade Abdul Muis',
      'Ratih Kamilia Rahmah',
      'Rahman Syah',
      'Muhamad Daffa Arsyad',
      'Shania Pratiwi Ayuningrum',
      'Farid Badruzzaman',
      'Rini Usman',
      'Edi Junaedi',
      'Irvan Susanto',
      'Aghni Wildah Alimatul Ula',
      'Dewi Sifa Marwati',
      'Moch. Firdaus Noor Rochman, S.I.Pus.',
      'Rahma Dita',
      'Kiki Suryadi Putra',
      'Rifqi Muhamad Baehaqi',
      'Ilah Haryati',
      'Muhammad Gumilar Habibul Ihsan',
      'Endang Wandar',
      'Gendra Putra Yasfa',
      'David Ramadhan',
      'Imran Saheman'
    ].map(normalizeNameKey);

    return {
      ratih: new Set(ratihNames),
      ledya: new Set(ledyaNames),
    };
  }, []);

  const { data: usahaPerusahaanData, loading: usahaPerusahaanLoading, error: usahaPerusahaanError } = useGoogleSheetsData({
    spreadsheetId: STACKING_SPREADSHEET_ID,
    sheetName: SHEET_USAHA_PERUSAHAAN,
    enabled: tabVisited("pendataan-usaha"),
  });
  const { data: usahaKeluargaData, loading: usahaKeluargaLoading, error: usahaKeluargaError } = useGoogleSheetsData({
    spreadsheetId: STACKING_SPREADSHEET_ID,
    sheetName: SHEET_USAHA_KELUARGA,
    enabled: tabVisited("pendataan-usaha"),
  });
  const { data: usahaProporsiData, loading: usahaProporsiLoading, error: usahaProporsiError } = useGoogleSheetsData({
    spreadsheetId: STACKING_SPREADSHEET_ID,
    sheetName: SHEET_PROPORSI_USAHA,
    enabled: tabVisited("pendataan-usaha") || tabVisited("dashboard"),
  });

  const { user } = useAuth();
  const isLoggedIn = !!user?.username;
  const isPpk = user?.role === "Pejabat Pembuat Komitmen";

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPPL, setExpandedPPL] = useState<Set<string>>(new Set());
  const [expandedPML, setExpandedPML] = useState<Set<string>>(new Set());
  const [expandedMergedUsaha, setExpandedMergedUsaha] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<keyof PPLRow>("nama_ppl");
  const [pmlSortOrder, setPmlSortOrder] = useState<"asc" | "desc">("asc");
  const [pmlSortBy, setPmlSortBy] = useState<keyof PMLRow>("nama_pml");
  const [currentPage, setCurrentPage] = useState(1);
  const [pmlCurrentPage, setPmlCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pmlItemsPerPage, setPmlItemsPerPage] = useState(20);
  const [capaianSearchTerm, setCapaianSearchTerm] = useState("");
  const [capaianKecamatanFilter, setCapaianKecamatanFilter] = useState("all");
  const [capaianSortBy, setCapaianSortBy] = useState<"nama_ppl" | "kecamatan" | "prelist_awal" | "delta" | "totalStatus" | "didata" | "status">("nama_ppl");
  const [capaianSortOrder, setCapaianSortOrder] = useState<"asc" | "desc">("asc");
  const [capaianCurrentPage, setCapaianCurrentPage] = useState(1);
  const [capaianItemsPerPage, setCapaianItemsPerPage] = useState(20);
  const [umkmSubTab, setUmkmSubTab] = useState<string>("ppl");
  const [usahaSubTab, setUsahaSubTab] = useState<string>("kondisi");
  const [usahaSearchTerm, setUsahaSearchTerm] = useState("");
  const [umkmKecamatanFilter, setUmkmKecamatanFilter] = useState("all");
  const [umkmAfirmasiFilter, setUmkmAfirmasiFilter] = useState<"all" | "ratih" | "ledya">("all");
  const [usahaKecamatanFilter, setUsahaKecamatanFilter] = useState("all");
  const [proporsiKecamatanFilter, setProporsiKecamatanFilter] = useState("all");
  const [usahaItemsPerPage, setUsahaItemsPerPage] = useState(20);
  const [usahaKondisiPerusahaanCurrentPage, setUsahaKondisiPerusahaanCurrentPage] = useState(1);
  const [usahaKondisiKeluargaCurrentPage, setUsahaKondisiKeluargaCurrentPage] = useState(1);
  const [usahaKondisiMergedCurrentPage, setUsahaKondisiMergedCurrentPage] = useState(1);
  const [usahaMergedSortBy, setUsahaMergedSortBy] = useState<string>("nama_ppl");
  const [usahaMergedSortOrder, setUsahaMergedSortOrder] = useState<"asc" | "desc">("asc");
  const [usahaProporsiCurrentPage, setUsahaProporsiCurrentPage] = useState(1);
  const [usahaPerusahaanSortBy, setUsahaPerusahaanSortBy] = useState<string>("nama_ppl");
  const [usahaPerusahaanSortOrder, setUsahaPerusahaanSortOrder] = useState<"asc" | "desc">("asc");
  const [usahaKeluargaSortBy, setUsahaKeluargaSortBy] = useState<string>("nama_ppl");
  const [usahaKeluargaSortOrder, setUsahaKeluargaSortOrder] = useState<"asc" | "desc">("asc");
  const [usahaProporsiSortBy, setUsahaProporsiSortBy] = useState<string>("nama_ppl");
  const [usahaProporsiSortOrder, setUsahaProporsiSortOrder] = useState<"asc" | "desc">("asc");
  const [proporsiExportMode, setProporsiExportMode] = useState<ProporsiExportMode>("sls");
  const [expandedUsahaPerusahaan, setExpandedUsahaPerusahaan] = useState<Set<string>>(new Set());
  const [expandedUsahaKeluarga, setExpandedUsahaKeluarga] = useState<Set<string>>(new Set());
  const [expandedUsahaProporsi, setExpandedUsahaProporsi] = useState<Set<string>>(new Set());
  const [proporsiColumnGroups, setProporsiColumnGroups] = useState({
    dasar: true,
    prelistAwal: true,
    prelistUsaha: true,
    utpSt2023: true,
    bkuUsahaWilkerstat: true,
    didata: true,
    bkuDitemukanPertanian: true,
    bkuDitemukanNonPertanian: true,
    bkuBaruPertanian: true,
    bkuBaruNonPertanian: true,
    keluargaDitemukanPertanian: true,
    keluargaDitemukanNonPertanian: true,
    keluargaBaruPertanian: true,
    keluargaBaruNonPertanian: true,
    ringkasan: true,
  });
  const [usahaKondisiColumns, setUsahaKondisiColumns] = useState({
    prelistAwal: true,
    prelistUsaha: true,
    didata: true,
    bkuUsahaWilkerstatBaru: true,
    perusahaanDitemukan: true,
    perusahaanTutup: true,
    perusahaanGanda: true,
    perusahaanTidakDitemukan: true,
    perusahaanBaru: true,
    perusahaanDitemukanBaru: true,
    keluargaDitemukan: true,
    keluargaTutup: true,
    keluargaGanda: true,
    keluargaTidakDitemukan: true,
    keluargaBaru: true,
    keluargaDitemukanBaru: true,
    totalTidakDitemukan: true,
    totalUsaha: true,
    surplusDefisit: true,
  });

  // Data Ngibar tab: combine existing data with the new Google Sheets source
  const NGIBAR_LEGACY_SPREADSHEET_ID = "1EyrssWtjEGd64SYelUMON3nnLpj6KU5INCMeD-Amjto";
  const NGIBAR_LEGACY_SHEET = "Sheet4";
  const NGIBAR_NEW_SPREADSHEET_ID = "1pKXf07TfCteNvGRW0hO7mD0A_RY1d1yNbrN_Ee_ZVKc";
  const NGIBAR_NEW_SHEET = "Form Responses 1";
  const NGIBAR_SPPG_SPREADSHEET_ID = "1oK66oIFQ5P_-HBlU5Q7Fa65JdTQXxr4h4HkApNxlCDo";
  const NGIBAR_SPPG_SHEET = "Form Responses 1";
  const { data: ngibarData, loading: ngibarLegacyLoading, error: ngibarLegacyError } = useGoogleSheetsData({
    spreadsheetId: NGIBAR_LEGACY_SPREADSHEET_ID,
    sheetName: NGIBAR_LEGACY_SHEET,
    enabled: tabVisited("ngibar"),
  });
  const { data: ngibarNewData, loading: ngibarNewLoading, error: ngibarNewError } = useGoogleSheetsData({
    spreadsheetId: NGIBAR_NEW_SPREADSHEET_ID,
    sheetName: NGIBAR_NEW_SHEET,
    enabled: tabVisited("ngibar"),
  });
  const { data: ngibarSppgData, loading: ngibarSppgLoading, error: ngibarSppgError } = useGoogleSheetsData({
    spreadsheetId: NGIBAR_SPPG_SPREADSHEET_ID,
    sheetName: NGIBAR_SPPG_SHEET,
    enabled: tabVisited("ngibar"),
  });
  const ngibarLoading = ngibarLegacyLoading || ngibarNewLoading || ngibarSppgLoading;
  const ngibarError = [ngibarLegacyError, ngibarNewError, ngibarSppgError].filter(Boolean).join(" | ") || null;
  const [ngibarSearch, setNgibarSearch] = useState("");
  const [ngibarSortField, setNgibarSortField] = useState<string | null>(null);
  const [ngibarSortOrder, setNgibarSortOrder] = useState<"asc" | "desc">("asc");
  const [ngibarPage, setNgibarPage] = useState(1);
  const [ngibarItemsPerPage, setNgibarItemsPerPage] = useState(20);
  const { toast } = useToast();
  const [ngibarOverrides, setNgibarOverrides] = useState<Record<string, Record<string, string>>>({});
  const [ngibarJenisFilter, setNgibarJenisFilter] = useState<string | null>(null);

  const handleNgibarSort = (field: string) => {
    setNgibarPage(1);
    if (ngibarSortField === field) {
      setNgibarSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setNgibarSortField(field);
    setNgibarSortOrder("asc");
  };

  const getNgibarSortIndicator = (field: string) => {
    if (ngibarSortField !== field) return null;
    return ngibarSortOrder === "asc" ? "▲" : "▼";
  };

  const getNgibarRowKey = (row: any) => {
    const source = String(row?.source || "legacy").toLowerCase();
    const rowNumber = Number(row?.__rowNumber ?? 0);
    return `${source}:${rowNumber}`;
  };

  const getNgibarSourceConfig = (rowOrSource: any) => {
    const source = String(rowOrSource?.source || rowOrSource || "legacy").toLowerCase();
    switch (source) {
      case "new":
        return {
          source,
          spreadsheetId: NGIBAR_NEW_SPREADSHEET_ID,
          sheetName: NGIBAR_NEW_SHEET,
          fieldColumns: {
            hasil_pengecekkan: "I",
            flag_input_fasih: "L",
            nama_pml: "M",
            nama_ppl: "N",
          },
        };
      case "sppg":
        return {
          source,
          spreadsheetId: NGIBAR_SPPG_SPREADSHEET_ID,
          sheetName: NGIBAR_SPPG_SHEET,
          fieldColumns: {
            hasil_pengecekkan: "J",
            flag_input_fasih: "K",
            nama_pml: "L",
            nama_ppl: "M",
          },
        };
      case "legacy":
      default:
        return {
          source: "legacy",
          spreadsheetId: NGIBAR_LEGACY_SPREADSHEET_ID,
          sheetName: NGIBAR_LEGACY_SHEET,
          fieldColumns: {
            hasil_pengecekkan: "K",
            flag_input_fasih: "L",
            nama_pml: "M",
            nama_ppl: "N",
          },
        };
    }
  };

  const formatSheetRange = (sheetName: string, columnLetter: string, rowNumber: number | string) => {
    const safeSheetName = String(sheetName).replace(/'/g, "''");
    return `'${safeSheetName}'!${columnLetter}${rowNumber}`;
  };

  const getNgibarTarget = (row: any, field: string) => {
    const config = getNgibarSourceConfig(row);
    const columnLetter = config.fieldColumns[field as keyof typeof config.fieldColumns];
    return columnLetter
      ? {
          spreadsheetId: config.spreadsheetId,
          sheetName: config.sheetName,
          columnLetter,
          range: formatSheetRange(config.sheetName, columnLetter, row.__rowNumber),
        }
      : null;
  };

  // Dialog state for editing fields
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogField, setEditDialogField] = useState<string | null>(null);
  const [editDialogRowKey, setEditDialogRowKey] = useState<string | null>(null);
  const [editDialogValue, setEditDialogValue] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);
  const debugRef = React.useRef<{ sizes: any; zeroEntries: any[]; zeroCount: number; unmatched?: any[]; unmatchedDetails?: any[] }>({ sizes: {}, zeroEntries: [], zeroCount: 0 });

  useEffect(() => {
    console.debug("editDialogOpen changed", { editDialogOpen, editDialogField, editDialogRowKey });
  }, [editDialogOpen, editDialogField, editDialogRowKey]);

  const openEditDialog = (field: string, row: any, initialValue: string) => {
    console.debug("openEditDialog called", { field, row, initialValue });
    if (!row || row.__rowNumber == null) {
      console.warn("openEditDialog skipped because row is invalid", { field, row, initialValue });
      return;
    }
    console.debug("openEditDialog", { field, row, initialValue });
    setEditDialogField(field);
    setEditDialogRowKey(getNgibarRowKey(row));
    setEditDialogValue(initialValue ?? "");
    setEditDialogOpen(true);
  };

  const saveEditDialog = async () => {
    if (editDialogField == null || editDialogRowKey == null) return;
    const targetRow = (ngibarRows || []).find((row: any) => getNgibarRowKey(row) === editDialogRowKey);
    if (!targetRow) return;

    setEditSaving(true);
    // optimistic update
    setNgibarOverrides((prev) => ({ ...(prev || {}), [editDialogRowKey]: { ...(prev?.[editDialogRowKey] || {}), [editDialogField]: editDialogValue } }));
    try {
      await updateNgibarCell(targetRow, editDialogField, editDialogValue);
      setEditDialogOpen(false);
    } catch (err) {
      // rollback
      setNgibarOverrides((prev) => {
        const copy = { ...(prev || {}) };
        if (copy[editDialogRowKey]) {
          const { [editDialogField]: _removed, ...rest } = copy[editDialogRowKey];
          copy[editDialogRowKey] = rest;
        }
        return copy;
      });
    } finally {
      setEditSaving(false);
    }
  };

  const formatIndoNow = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}.${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const toggleFlag = async (row: any) => {
    if (!row || row.__rowNumber == null) return;
    const current = String(row.flag_input_fasih || "").trim();
    if (current) {
      // unflag -> write blank
      setNgibarOverrides((prev) => ({ ...(prev || {}), [getNgibarRowKey(row)]: { ...(prev?.[getNgibarRowKey(row)] || {}), flag_input_fasih: "" } }));
      await updateNgibarCell(row, "flag_input_fasih", "");
    } else {
      const val = `Sudah - ${formatIndoNow()}`;
      setNgibarOverrides((prev) => ({ ...(prev || {}), [getNgibarRowKey(row)]: { ...(prev?.[getNgibarRowKey(row)] || {}), flag_input_fasih: val } }));
      await updateNgibarCell(row, "flag_input_fasih", val);
    }
  };

  const normalizeWa = (raw: string) => {
    if (!raw) return "";
    const digits = String(raw).replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) return "62" + digits.slice(1);
    return digits;
  };

  const updateNgibarCell = async (row: any | undefined, field: string, value: string) => {
    if (!row || row.__rowNumber == null) return;
    const target = getNgibarTarget(row, field);
    if (!target) return;

    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: target.spreadsheetId,
          operation: "update",
          range: target.range,
          values: [[value]],
        },
      });
      if (error) throw error;
      toast({ title: "Sukses", description: "Perubahan tersimpan." });
      setNgibarOverrides((prev) => {
        const copy = { ...(prev || {}) };
        const rowKey = getNgibarRowKey(row);
        copy[rowKey] = { ...(copy[rowKey] || {}), [field]: value };
        return copy;
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Gagal", description: err?.message || "Gagal menyimpan ke sheet.", variant: "destructive" });
    }
  };

  const ngibarRows = useMemo(() => {
    const applyOverrides = (row: any) => {
      const overrides = ngibarOverrides?.[getNgibarRowKey(row)];
      if (overrides) {
        Object.keys(overrides).forEach((k) => {
          row[k] = overrides[k];
        });
      }
      return row;
    };

    const mapLegacyRows = (rows: any[] = []) =>
      rows.map((r: any) => {
        const row: any = {
          __rowNumber: r.__rowNumber,
          source: "legacy",
          timestamp: getSheetCellText(r, 0),
          nama_lengkap: getSheetCellText(r, 1),
          nomor_wa: getSheetCellText(r, 2),
          email: getSheetCellText(r, 3),
          nama_satuan: getSheetCellText(r, 4),
          upload_link: getSheetCellText(r, 5),
          kecamatan: getSheetCellText(r, 6),
          alamat: getSheetCellText(r, 7),
          desa: getSheetCellText(r, 8),
          jenis_satuan: getSheetCellText(r, 9),
          hasil_pengecekkan: getSheetCellText(r, 10),
          flag_input_fasih: getSheetCellText(r, 11),
          nama_pml: getSheetCellText(r, 12),
          nama_ppl: getSheetCellText(r, 13),
        };
        return applyOverrides(row);
      });

    const mapNewRows = (rows: any[] = []) =>
      rows.map((r: any) => {
        const raw = Array.isArray(r?.__rawRow) ? r.__rawRow : [];
        const row: any = {
          __rowNumber: r.__rowNumber,
          source: "new",
          timestamp: "",
          nama_lengkap: String(raw[1] ?? "").trim(),
          nomor_wa: String(raw[2] ?? "").trim(),
          email: String(raw[3] ?? "").trim(),
          nama_satuan: String(raw[4] ?? "").trim(),
          upload_link: String(raw[5] ?? "").trim(),
          kecamatan: String(raw[7] ?? "").trim(),
          alamat: "",
          desa: String(raw[9] ?? "").trim(),
          jenis_satuan: String(raw[10] ?? "").trim(),
          hasil_pengecekkan: String(raw[8] ?? "").trim(),
          flag_input_fasih: String(raw[11] ?? "").trim(),
          nama_pml: String(raw[12] ?? "").trim(),
          nama_ppl: String(raw[13] ?? "").trim(),
        };
        return applyOverrides(row);
      });

    const mapSppgRows = (rows: any[] = []) =>
      rows.map((r: any) => {
        const raw = Array.isArray(r?.__rawRow) ? r.__rawRow : [];
        const row: any = {
          __rowNumber: r.__rowNumber,
          source: "sppg",
          timestamp: "",
          nama_lengkap: String(raw[1] ?? "").trim(),
          nomor_wa: String(raw[2] ?? "").trim(),
          email: String(raw[3] ?? "").trim(),
          nama_satuan: String(raw[4] ?? "").trim(),
          upload_link: String(raw[8] ?? "").trim(),
          kecamatan: String(raw[6] ?? "").trim(),
          alamat: "",
          desa: String(raw[7] ?? "").trim(),
          jenis_satuan: "SPPG",
          hasil_pengecekkan: String(raw[9] ?? "").trim(),
          flag_input_fasih: String(raw[10] ?? "").trim(),
          nama_pml: String(raw[11] ?? "").trim(),
          nama_ppl: String(raw[12] ?? "").trim(),
        };
        return applyOverrides(row);
      });

    return [...mapLegacyRows(ngibarData || []), ...mapNewRows(ngibarNewData || []), ...mapSppgRows(ngibarSppgData || [])];
  }, [ngibarData, ngibarNewData, ngibarSppgData, ngibarOverrides]);

  const ngibarFilteredSorted = useMemo(() => {
    const q = String(ngibarSearch || "").trim().toLowerCase();
    let rows = ngibarRows.slice();
    if (q) {
      rows = rows.filter((r) => {
        return (
          String(r.nama_satuan || "").toLowerCase().includes(q) ||
          String(r.kecamatan || "").toLowerCase().includes(q) ||
          String(r.desa || "").toLowerCase().includes(q) ||
          String(r.jenis_satuan || "").toLowerCase().includes(q)
        );
      });
    }
    if (ngibarJenisFilter) {
      rows = rows.filter((r) => String(r.jenis_satuan || "").toLowerCase() === String(ngibarJenisFilter).toLowerCase());
    }
    if (ngibarSortField) {
      const getValue = (row: any) => {
        if (ngibarSortField === "kecamatan_desa") {
          return `${String(row.kecamatan || "").trim()} ${String(row.desa || "").trim()}`.trim();
        }
        if (ngibarSortField === "kontak") {
          return `${String(row.nama_lengkap || "").trim()} ${String(row.nomor_wa || "").trim()} ${String(row.email || "").trim()}`.trim();
        }
        return String(row[ngibarSortField] ?? "").trim();
      };

      rows.sort((a: any, b: any) => {
        const vaRaw = getValue(a);
        const vbRaw = getValue(b);
        const va = String(vaRaw).toLowerCase();
        const vb = String(vbRaw).toLowerCase();

        if (!va && !vb) {
          return getNgibarRowKey(a).localeCompare(getNgibarRowKey(b));
        }
        if (!va) return ngibarSortOrder === "asc" ? 1 : -1;
        if (!vb) return ngibarSortOrder === "asc" ? -1 : 1;

        const compare = va.localeCompare(vb, "id", { numeric: true, sensitivity: "base" });
        if (compare !== 0) return ngibarSortOrder === "asc" ? compare : -compare;
        return getNgibarRowKey(a).localeCompare(getNgibarRowKey(b));
      });
    }
    return rows;
  }, [ngibarRows, ngibarSearch, ngibarSortField, ngibarSortOrder, ngibarJenisFilter]);

  const ngibarJenisOptions = useMemo(() => {
    const s = new Set<string>();
    (ngibarRows || []).forEach((r: any) => { if (r?.jenis_satuan) s.add(String(r.jenis_satuan)); });
    return Array.from(s).filter(Boolean);
  }, [ngibarRows]);

  const ngibarTotalPages = Math.max(1, Math.ceil((ngibarFilteredSorted || []).length / ngibarItemsPerPage));
  const ngibarTotalCount = ngibarFilteredSorted.length;
  const ngibarFlaggedCount = ngibarFilteredSorted.filter((row: any) => String(row.flag_input_fasih || "").trim()).length;
  const ngibarVerifiedCount = ngibarFilteredSorted.filter((row: any) => String(row.hasil_pengecekkan || "").trim()).length;
  const ngibarLinkCount = ngibarFilteredSorted.filter((row: any) => String(row.upload_link || "").trim()).length;

  const ngibarFlaggedPercent = ngibarTotalCount > 0 ? (ngibarFlaggedCount / ngibarTotalCount) * 100 : 0;
  const ngibarVerifiedPercent = ngibarTotalCount > 0 ? (ngibarVerifiedCount / ngibarTotalCount) * 100 : 0;
  const ngibarLinkPercent = ngibarTotalCount > 0 ? (ngibarLinkCount / ngibarTotalCount) * 100 : 0;

  const ngibarJenisSummary = useMemo(() => {
    const summary = new Map<string, { count: number; percent: number }>();
    ngibarFilteredSorted.forEach((row: any) => {
      const jenis = String(row.jenis_satuan || "-");
      const existing = summary.get(jenis) || { count: 0, percent: 0 };
      existing.count += 1;
      summary.set(jenis, existing);
    });
    return Array.from(summary.entries()).map(([jenis, data]) => ({
      jenis,
      count: data.count,
      percent: ngibarTotalCount > 0 ? (data.count / ngibarTotalCount) * 100 : 0,
    })).sort((a, b) => b.count - a.count);
  }, [ngibarFilteredSorted, ngibarTotalCount]);

  const pplRows = useMemo<PPLRow[]>(() => {
    const progressByKey = new Map<string, Array<{
      address: string;
      prelistAwal: string;
      respondenDidata: string;
      // kolom G -> didata netto
      didataNetto: string;
      persentaseDidata: string;
      draft: string;
      persentaseDraft: string;
    }>>();
    const wilkerstatByKey = new Map<string, number>();

    (progresData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 0));
      if (!key) return;
      const existing = progressByKey.get(key) || [];
      existing.push({
        address: getSheetCellText(row, 1),
        prelistAwal: getSheetCellText(row, 2),
        respondenDidata: getSheetCellText(row, 4),
        // kolom G -> didata netto
        didataNetto: getSheetCellText(row, 6),
        persentaseDidata: getSheetCellText(row, 5),
        draft: getSheetCellText(row, 8),
        persentaseDraft: getSheetCellText(row, 9),
      });
      progressByKey.set(key, existing);
    });

    (stackingData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 3));
      if (!key) return;
      const wilkerstatValue = parseNumericValue(getSheetCellText(row, 24));
      wilkerstatByKey.set(key, (wilkerstatByKey.get(key) || 0) + wilkerstatValue);
    });

    const pplMap = new Map<string, { nama_ppl: string; kecamatan: string; keys: Set<string>; prelistWilkerstat: number }>();

    (stackingData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 3));
      if (!key) return;
      const namaPpl = toProperCase(getSheetCellText(row, 26));
      const kecamatan = toProperCase(getSheetCellText(row, 12));
      if (!namaPpl || !kecamatan) return;

      const wilkerstatValue = parseNumericValue(getSheetCellText(row, 24));
      const mapKey = `${namaPpl}||${kecamatan}`;
      const existing = pplMap.get(mapKey);
      if (!existing) {
        pplMap.set(mapKey, {
          nama_ppl: namaPpl,
          kecamatan,
          keys: new Set([key]),
          prelistWilkerstat: wilkerstatValue,
        });
      } else {
        existing.keys.add(key);
        existing.prelistWilkerstat += wilkerstatValue;
      }
    });

    return Array.from(pplMap.values()).map((ppl, index) => {
      const keys = Array.from(ppl.keys).sort();
      const details: PPLDetail[] = keys.flatMap((key) =>
        (progressByKey.get(key) || []).map((progressRow) => {
          const prelist = parseNumericValue(progressRow.prelistAwal || "0");
          const responden = parseNumericValue(progressRow.respondenDidata || "0");
          const draft = parseNumericValue(progressRow.draft || "0");
          const pctResponden = prelist > 0 ? ((responden / prelist) * 100).toFixed(2) : "0.00";
          const pctDraft = prelist > 0 ? ((draft / prelist) * 100).toFixed(2) : "0.00";
          const activityStatus = getActivityStatusText(responden);

          const wilkerstatValue = parseNumericValue(wilkerstatByKey.get(key) || 0);
          const pctWilkerstat = wilkerstatValue > 0 ? ((responden / wilkerstatValue) * 100).toFixed(2) : "0.00";

          return {
            matchingKey: key,
            address: toProperCase(progressRow.address || "-"),
            prelist_awal: progressRow.prelistAwal || "0",
            prelist_wilkerstat: (wilkerstatByKey.get(key) || 0).toString(),
            responden_didata: progressRow.respondenDidata || "0",
            didata_netto: progressRow.didataNetto || "0",
            persentase_responden_didata: pctResponden,
            persentase_didata_netto: prelist > 0 ? ((parseNumericValue(progressRow.didataNetto || "0") / prelist) * 100).toFixed(2) : "0.00",
            persentase_wilkerstat: pctWilkerstat,
            aktivitas: activityStatus.detail,
            aktivitasColor: activityStatus.color,
            draft: progressRow.draft || "0",
            persentase_draft: pctDraft,
          };
        })
      );
      const prelistSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.prelist_awal), 0);
      const wilkerstatSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.prelist_wilkerstat), 0);
      const respondenSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.responden_didata), 0);
      const didataNettoSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.didata_netto), 0);
      const draftSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.draft), 0);
      const pctResponden = prelistSum > 0 ? ((respondenSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctDidataNetto = prelistSum > 0 ? ((didataNettoSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctDraft = prelistSum > 0 ? ((draftSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctWilkerstat = wilkerstatSum > 0 ? ((respondenSum / wilkerstatSum) * 100).toFixed(2) : "0.00";
      const activityStatus = getActivityStatusText(respondenSum);
      const kecamatanText = ppl.kecamatan || "-";

      return {
        id: `${index}-${ppl.nama_ppl}`,
        nama_ppl: ppl.nama_ppl,
        kecamatan: kecamatanText,
        prelist_awal: prelistSum.toString(),
        prelist_wilkerstat: wilkerstatSum.toString(),
        responden_didata: respondenSum.toString(),
        didata_netto: didataNettoSum.toString(),
        persentase_responden_didata: pctResponden,
        persentase_didata_netto: pctDidataNetto,
        persentase_wilkerstat: pctWilkerstat,
        aktivitas: activityStatus.detail,
        aktivitasColor: activityStatus.color,
        draft: draftSum.toString(),
        persentase_draft: pctDraft,
        matchingKeys: keys.join(", "),
        details,
      };
    });
  }, [stackingData, progresData]);



  const monitoringProgressMap = useMemo(() => {
    const map = new Map<string, { draft: number; submit: number; approve: number; reject: number; revoke: number; totalStatus: number }>();
    const seenSignatures = new Set<string>();

    (monitoringSheetData || []).forEach((row: any) => {
      const signature = getRowSignature(row);
      if (signature && seenSignatures.has(signature)) return;
      if (signature) seenSignatures.add(signature);

      const kecamatan = String(getRowValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).trim();
      const namaPpl = String(getRowValue(row, "nama_ppl", ["nama ppl", "nama_ppl", "nama pencacah", "nama"], "")).trim();
      if (!kecamatan || !namaPpl) return;

      const draft = parseInt(String(getRowValue(row, "draft", ["draft"], "0")), 10) || 0;
      const submit = parseInt(String(getRowValue(row, "submitted_by_pencacah", ["submitted_by_pencacah", "submitted", "submit", "submitted_by"], "0")), 10) || 0;
      const approve = getApprovedTotalFromRow(row) || 0;
      const reject = parseInt(String(getRowValue(row, "rejected_by_pengawas", ["rejected_by_pengawas", "rejected", "reject"], "0")), 10) || 0;
      const key = `${normalizeKecamatanKey(kecamatan)}|${normalizePersonKey(namaPpl)}`;
      const existing = map.get(key) || { draft: 0, submit: 0, approve: 0, reject: 0, revoke: 0, totalStatus: 0 };
      existing.draft += draft;
      existing.submit += submit;
      existing.approve += approve;
      existing.reject += reject;
      existing.totalStatus = existing.submit + existing.approve + existing.reject + existing.revoke;
      map.set(key, existing);
    });

    const seenUserSignatures = new Map<string, Set<string>>();
    (monitoringUsersData || []).forEach((row: any) => {
      const signature = getRowSignature(row);
      const email = String(getRowValue(row, "email", ["email", "Email"], "")).trim().toLowerCase();
      const seen = seenUserSignatures.get(email) || new Set<string>();
      if (signature && seen.has(signature)) return;
      if (signature) {
        seen.add(signature);
        seenUserSignatures.set(email, seen);
      }

      const kecamatan = String(getRowValue(row, "regioncode", ["regioncode", "regionCode", "region", "kecamatan"], "")).trim();
      const namaPpl = String(getRowValue(row, "nama_ppl", ["nama_ppl", "nama ppl", "nama pencacah", "nama"], "")).trim();
      if (!kecamatan || !namaPpl) return;

      const submit = parseInt(String(getRowValue(row, "submitted_by_pencacah", ["submitted_by_pencacah", "submitted", "submit", "submitted_by"], "0")), 10) || 0;
      const approve = getApprovedTotalFromRow(row) || 0;
      const reject = parseInt(String(getRowValue(row, "rejected_by_pengawas", ["rejected_by_pengawas", "rejected", "reject"], "0")), 10) || 0;
      const revoke = parseRevokedFromUserRow(row);
      if (!submit && !approve && !reject && !revoke) return;

      const key = `${normalizeKecamatanKey(kecamatan)}|${normalizePersonKey(namaPpl)}`;
      const existing = map.get(key) || { draft: 0, submit: 0, approve: 0, reject: 0, revoke: 0, totalStatus: 0 };
      existing.submit += submit;
      existing.approve += approve;
      existing.reject += reject;
      existing.revoke += revoke;
      existing.totalStatus = existing.submit + existing.approve + existing.reject + existing.revoke;
      map.set(key, existing);
    });

    return map;
  }, [monitoringSheetData, monitoringUsersData]);

  const monitoringProgressRawMap = useMemo(() => {
    const map = new Map<string, { draft: number; submit: number; approve: number; reject: number; revoke: number; totalStatus: number }>();

    (monitoringSheetData || []).forEach((row: any) => {
      const signature = getRowSignature(row);
      // we don't dedupe signature here because raw map is for fallback only
      const kecamatan = String(getRowValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).trim().toLowerCase();
      const namaPpl = String(getRowValue(row, "nama_ppl", ["nama ppl", "nama_ppl", "nama pencacah", "nama"], "")).trim().toLowerCase();
      if (!kecamatan || !namaPpl) return;

      const draft = parseInt(String(getRowValue(row, "draft", ["draft"], "0")), 10) || 0;
      const submit = parseInt(String(getRowValue(row, "submitted_by_pencacah", ["submitted_by_pencacah", "submitted", "submit", "submitted_by"], "0")), 10) || 0;
      const approve = getApprovedTotalFromRow(row) || 0;
      const reject = parseInt(String(getRowValue(row, "rejected_by_pengawas", ["rejected_by_pengawas", "rejected", "reject"], "0")), 10) || 0;
      const key = `${kecamatan}|${namaPpl}`;
      const existing = map.get(key) || { draft: 0, submit: 0, approve: 0, reject: 0, revoke: 0, totalStatus: 0 };
      existing.draft += draft;
      existing.submit += submit;
      existing.approve += approve;
      existing.reject += reject;
      existing.totalStatus = existing.submit + existing.approve + existing.reject + existing.revoke;
      map.set(key, existing);
      try {
        const strippedKec = String(kecamatan || "").replace(/^\s*\[?\s*\d+\s*\]?\s*/g, "").trim();
        if (strippedKec && strippedKec !== kecamatan) {
          const altKey = `${strippedKec}|${namaPpl}`;
          if (!map.has(altKey)) map.set(altKey, existing);
        }
      } catch (e) {
        // ignore
      }
    });

    (monitoringUsersData || []).forEach((row: any) => {
      const email = String(getRowValue(row, "email", ["email", "Email"], "")).trim().toLowerCase();
      const kecamatan = String(getRowValue(row, "regioncode", ["regioncode", "regionCode", "region", "kecamatan"], "")).trim().toLowerCase();
      const namaPpl = String(getRowValue(row, "nama_ppl", ["nama_ppl", "nama ppl", "nama pencacah", "nama"], "")).trim().toLowerCase();
      if (!kecamatan || !namaPpl) return;

      const submit = parseInt(String(getRowValue(row, "submitted_by_pencacah", ["submitted_by_pencacah", "submitted", "submit", "submitted_by"], "0")), 10) || 0;
      const approve = getApprovedTotalFromRow(row) || 0;
      const reject = parseInt(String(getRowValue(row, "rejected_by_pengawas", ["rejected_by_pengawas", "rejected", "reject"], "0")), 10) || 0;
      const revoke = parseRevokedFromUserRow(row);
      if (!submit && !approve && !reject && !revoke) return;

      const key = `${kecamatan}|${namaPpl}`;
      const existing = map.get(key) || { draft: 0, submit: 0, approve: 0, reject: 0, revoke: 0, totalStatus: 0 };
      existing.submit += submit;
      existing.approve += approve;
      existing.reject += reject;
      existing.revoke += revoke;
      existing.totalStatus = existing.submit + existing.approve + existing.reject + existing.revoke;
      map.set(key, existing);
      try {
        const strippedKec = String(kecamatan || "").replace(/^\s*\[?\s*\d+\s*\]?\s*/g, "").trim();
        if (strippedKec && strippedKec !== kecamatan) {
          const altKey = `${strippedKec}|${namaPpl}`;
          if (!map.has(altKey)) map.set(altKey, existing);
        }
      } catch (e) {
        // ignore
      }
    });

    return map;
  }, [monitoringSheetData, monitoringUsersData]);

  const monitoringProgressByName = useMemo(() => {
    const countByName = new Map<string, number>();
    const valueByName = new Map<string, { draft: number; submit: number; approve: number; reject: number; revoke: number; totalStatus: number }>();

    monitoringProgressMap.forEach((value, key) => {
      const parts = key.split("|");
      const name = parts.length > 1 ? parts[1] : parts[0];
      const normalizedName = normalizePersonKey(name);
      countByName.set(normalizedName, (countByName.get(normalizedName) || 0) + 1);
      valueByName.set(normalizedName, value);
    });

    const result = new Map<string, { draft: number; submit: number; approve: number; reject: number; revoke: number; totalStatus: number }>();
    valueByName.forEach((value, normalizedName) => {
      if (countByName.get(normalizedName) === 1) {
        result.set(normalizedName, value);
      }
    });

    return result;
  }, [monitoringProgressMap]);

  const debugInfo = useMemo(() => {
    try {
      const entries: any[] = [];
      const keys = Array.from(monitoringProgressMap.keys());
      (pplRows || []).forEach((row: any, index: number) => {
        const normalizedName = normalizePersonKey(row.nama_ppl);
        const normalizedKec = normalizeKecamatanKey(row.kecamatan);
        const key = `${normalizedKec}|${normalizedName}`;
        let monitoring = monitoringProgressMap.get(key);
        if (!monitoring) {
          const rawKey = `${String(row.kecamatan || "").trim().toLowerCase()}|${String(row.nama_ppl || "").trim().toLowerCase()}`;
          monitoring = monitoringProgressRawMap.get(rawKey) || monitoringProgressByName.get(normalizedName);
        }
        const prelist = parseNumericValue(row.prelist_awal);
        const termin = monitoring ? Number(monitoring.totalStatus) : 0;
        const now = parseNumericValue(row.didata);
        if (termin === 0) {
          entries.push({ index, key, normalizedName, normalizedKec, termin, now, prelist, monitoringFound: !!monitoring });
        }
      });
      return {
        sizes: { monitoringProgressMap: monitoringProgressMap.size, monitoringProgressRawMap: monitoringProgressRawMap.size, monitoringProgressByName: monitoringProgressByName.size },
        zeroEntries: entries.slice(0, 100),
        zeroCount: entries.length,
      };
    } catch (err) {
      return { sizes: {}, zeroEntries: [], zeroCount: 0 };
    }
  }, [pplRows, monitoringProgressMap, monitoringProgressRawMap, monitoringProgressByName]);

  const pmlRows = useMemo<PMLRow[]>(() => {
    const pmlMap = new Map<string, { nama_pml: string; kecamatan: string; childMap: Map<string, { prelist: number; prelist_wilkerstat: number; responden: number; draft: number; didataNetto: number }> }>();

    (stackingData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 3));
      if (!key) return;

      const namaPml = toProperCase(getSheetCellText(row, 29));
      const kecamatan = toProperCase(getSheetCellText(row, 12));
      const namaPpl = toProperCase(getSheetCellText(row, 26));
      if (!namaPml || !namaPpl || !kecamatan) return;

      const progressRows = progresData?.filter((progressRow: any) => normalizeSheetKey(getSheetCellText(progressRow, 0)) === key) || [];
      const prelist = progressRows.reduce((sum: number, progressRow: any) => sum + parseNumericValue(getSheetCellText(progressRow, 2)), 0);
      const responden = progressRows.reduce((sum: number, progressRow: any) => sum + parseNumericValue(getSheetCellText(progressRow, 4)), 0);
      const didataNetto = progressRows.reduce((sum: number, progressRow: any) => sum + parseNumericValue(getSheetCellText(progressRow, 6)), 0);
      const draft = progressRows.reduce((sum: number, progressRow: any) => sum + parseNumericValue(getSheetCellText(progressRow, 8)), 0);
      const prelistWilkerstat = parseNumericValue(getSheetCellText(row, 24));

      const mapKey = namaPml;
      const existing = pmlMap.get(mapKey);
      if (!existing) {
        const childMap = new Map<string, { prelist: number; prelist_wilkerstat: number; responden: number; draft: number; didataNetto: number }>();
        childMap.set(namaPpl, { prelist, prelist_wilkerstat: prelistWilkerstat, responden, draft, didataNetto });
        pmlMap.set(mapKey, {
          nama_pml: namaPml,
          kecamatan,
          childMap,
        });
      } else {
        const childEntry = existing.childMap.get(namaPpl);
        if (!childEntry) {
          existing.childMap.set(namaPpl, { prelist, prelist_wilkerstat: prelistWilkerstat, responden, draft, didataNetto });
        } else {
          childEntry.prelist += prelist;
          childEntry.prelist_wilkerstat += prelistWilkerstat;
          childEntry.responden += responden;
          childEntry.draft += draft;
          childEntry.didataNetto += didataNetto;
        }
      }
    });

    return Array.from(pmlMap.values()).map((pml, index) => {
      const childArray = Array.from(pml.childMap.entries()).map(([namaPpl, values]) => {
        const pctResponden = values.prelist > 0 ? ((values.responden / values.prelist) * 100).toFixed(2) : "0.00";
        const pctDraft = values.prelist > 0 ? ((values.draft / values.prelist) * 100).toFixed(2) : "0.00";
        const pctWilkerstat = values.prelist_wilkerstat > 0 ? ((values.responden / values.prelist_wilkerstat) * 100).toFixed(2) : "0.00";
        const pctDidataNetto = values.prelist > 0 ? ((values.didataNetto || 0) / values.prelist * 100).toFixed(2) : "0.00";
        return {
          nama_ppl: namaPpl,
          prelist_wilkerstat: values.prelist_wilkerstat.toString(),
          prelist_awal: values.prelist.toString(),
          responden_didata: values.responden.toString(),
          didata_netto: (values.didataNetto || 0).toString(),
          persentase_responden_didata: pctResponden,
          persentase_didata_netto: pctDidataNetto,
          persentase_wilkerstat: pctWilkerstat,
          draft: values.draft.toString(),
          persentase_draft: pctDraft,
        };
      });

      const prelistSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.prelist_awal), 0);
      const prelistWilkerstatSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.prelist_wilkerstat), 0);
      const respondenSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.responden_didata), 0);
      const didataNettoSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.didata_netto), 0);
      const draftSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.draft), 0);
      const pctResponden = prelistSum > 0 ? ((respondenSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctDidataNetto = prelistSum > 0 ? ((didataNettoSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctDraft = prelistSum > 0 ? ((draftSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctWilkerstat = prelistWilkerstatSum > 0 ? ((respondenSum / prelistWilkerstatSum) * 100).toFixed(2) : "0.00";

      return {
        id: `${index}-${pml.nama_pml}`,
        nama_pml: pml.nama_pml,
        kecamatan: pml.kecamatan,
        prelist_wilkerstat: prelistWilkerstatSum.toString(),
        prelist_awal: prelistSum.toString(),
        responden_didata: respondenSum.toString(),
        didata_netto: didataNettoSum.toString(),
        persentase_responden_didata: pctResponden,
        persentase_didata_netto: pctDidataNetto,
        persentase_wilkerstat: pctWilkerstat,
        draft: draftSum.toString(),
        persentase_draft: pctDraft,
        children: childArray,
      };
    });
  }, [stackingData, progresData]);

  const usahaPerusahaanRows = useMemo<UsahaPerusahaanRow[]>(() => {
    const groups = new Map<string, {
      id: string;
      nama_ppl: string;
      kecamatan: string;
      prelist_awal: number;
      jumlah_prelist_usaha: number;
      ditemukan: number;
      tutup: number;
      ganda: number;
      tidak_ditemukan: number;
      baru: number;
      ditemukan_plus_baru: number;
      children: UsahaChildRow[];
    }>();

    (usahaPerusahaanData || []).forEach((row: any, index: number) => {
      const namaPpl = toProperCase(getRawColumnText(row, 0, "-"));
      const kecamatan = toProperCase(getRawColumnText(row, 1, "-"));
      const key = `${namaPpl}|${kecamatan}`;
      const prelistAwal = getRawColumnNumber(row, 2, 0);
      // Kolom C = prelist / jumlah prelist usaha (kolom D sudah dipakai untuk Ditemukan)
      const jumlahPrelistUsaha = getRawColumnNumber(row, 2, 0);
      // Mapping kolom sheet USAHA PERUSAHAAN (A=0):
      // Ditemukan = D+F+T, Tutup = H+J+V, Ganda = L+X,
      // Tidak Ditemukan = N+Z, Baru = AB, Ditemukan+Baru = AH
      const ditemukan =
        getRawColumnNumber(row, 3, 0) + getRawColumnNumber(row, 5, 0) + getRawColumnNumber(row, 19, 0);
      const tutup =
        getRawColumnNumber(row, 7, 0) + getRawColumnNumber(row, 9, 0) + getRawColumnNumber(row, 21, 0);
      const ganda = getRawColumnNumber(row, 11, 0) + getRawColumnNumber(row, 23, 0);
      const tidakDitemukan = getRawColumnNumber(row, 13, 0) + getRawColumnNumber(row, 25, 0);
      const baru = getRawColumnNumber(row, 27, 0);
      const ditemukanPlusBaru = getRawColumnNumber(row, 33, 0);

      const child: UsahaChildRow = {
        id: `${key}-child-${index}`,
        nama_ppl: namaPpl,
        kecamatan,
        prelist_awal: prelistAwal.toString(),
        jumlah_prelist_usaha: jumlahPrelistUsaha.toString(),
        ditemukan: ditemukan.toString(),
        tutup: tutup.toString(),
        ganda: ganda.toString(),
        tidak_ditemukan: tidakDitemukan.toString(),
        baru: baru.toString(),
        ditemukan_plus_baru: ditemukanPlusBaru.toString(),
      };

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          id: key,
          nama_ppl: namaPpl,
          kecamatan,
          prelist_awal: prelistAwal,
          jumlah_prelist_usaha: jumlahPrelistUsaha,
          ditemukan,
          tutup,
          ganda,
          tidak_ditemukan: tidakDitemukan,
          baru,
          ditemukan_plus_baru: ditemukanPlusBaru,
          children: [child],
        });
      } else {
        existing.prelist_awal += prelistAwal;
        existing.jumlah_prelist_usaha += jumlahPrelistUsaha;
        existing.ditemukan += ditemukan;
        existing.tutup += tutup;
        existing.ganda += ganda;
        existing.tidak_ditemukan += tidakDitemukan;
        existing.baru += baru;
        existing.ditemukan_plus_baru += ditemukanPlusBaru;
        existing.children.push(child);
      }
    });

    return Array.from(groups.values()).map((entry) => ({
      id: entry.id,
      nama_ppl: entry.nama_ppl,
      kecamatan: entry.kecamatan,
      prelist_awal: entry.prelist_awal.toString(),
      jumlah_prelist_usaha: entry.jumlah_prelist_usaha.toString(),
      ditemukan: entry.ditemukan.toString(),
      tutup: entry.tutup.toString(),
      ganda: entry.ganda.toString(),
      tidak_ditemukan: entry.tidak_ditemukan.toString(),
      baru: entry.baru.toString(),
      ditemukan_plus_baru: entry.ditemukan_plus_baru.toString(),
      children: entry.children,
    }));
  }, [usahaPerusahaanData]);

  const usahaKeluargaRows = useMemo<UsahaKeluargaRow[]>(() => {
    const groups = new Map<string, {
      id: string;
      nama_ppl: string;
      kecamatan: string;
      prelist_awal: number;
      ditemukan: number;
      tutup: number;
      ganda: number;
      tidak_ditemukan: number;
      baru: number;
      ditemukan_plus_baru: number;
      children: UsahaChildRow[];
    }>();

    (usahaKeluargaData || []).forEach((row: any, index: number) => {
      const namaPpl = toProperCase(getRawColumnText(row, 0, getRowValue(row, "nama_ppl", ["nama pml", "pml", "nama_ppl"], "-")));
      const kecamatan = toProperCase(getRawColumnText(row, 1, getRowValue(row, "kecamatan", ["kecamatan", "nama_kecamatan"], "-")));
      const key = `${namaPpl}|${kecamatan}`;
      const prelistAwal = getRawColumnNumber(row, 2, getRowNumeric(row, "prelist_awal", ["prelist_awal", "prelist"], 0));
      // Mapping kolom sheet USAHA KELUARGA (A=0):
      // Ditemukan = D, Tutup = F, Ganda = H, Tidak Ditemukan = J, Baru = L, Ditemukan+Baru = P
      const ditemukan = getRawColumnNumber(row, 3, getRowNumeric(row, "ditemukan", ["ditemukan"], 0));
      const tutup = getRawColumnNumber(row, 5, getRowNumeric(row, "tutup", ["tutup"], 0));
      const ganda = getRawColumnNumber(row, 7, getRowNumeric(row, "ganda", ["ganda"], 0));
      const tidakDitemukan = getRawColumnNumber(row, 9, getRowNumeric(row, "tidak_ditemukan", ["tidak ditemukan", "tidak_ditemukan"], 0));
      const baru = getRawColumnNumber(row, 11, getRowNumeric(row, "baru", ["baru"], 0));
      const ditemukanPlusBaru = getRawColumnNumber(row, 15, getRowNumeric(row, "ditemukan_plus_baru", ["ditemukan_plus_baru", "ditemukan + baru", "ditemukan dan baru", "total_ditemukan"], 0));

      const child: UsahaChildRow = {
        id: `${key}-child-${index}`,
        nama_ppl: namaPpl,
        kecamatan,
        prelist_awal: prelistAwal.toString(),
        jumlah_prelist_usaha: "0",
        ditemukan: ditemukan.toString(),
        tutup: tutup.toString(),
        ganda: ganda.toString(),
        tidak_ditemukan: tidakDitemukan.toString(),
        baru: baru.toString(),
        ditemukan_plus_baru: ditemukanPlusBaru.toString(),
      };

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          id: key,
          nama_ppl: namaPpl,
          kecamatan,
          prelist_awal: prelistAwal,
          ditemukan,
          tutup,
          ganda,
          tidak_ditemukan: tidakDitemukan,
          baru,
          ditemukan_plus_baru: ditemukanPlusBaru,
          children: [child],
        });
      } else {
        existing.prelist_awal += prelistAwal;
        existing.ditemukan += ditemukan;
        existing.tutup += tutup;
        existing.ganda += ganda;
        existing.tidak_ditemukan += tidakDitemukan;
        existing.baru += baru;
        existing.ditemukan_plus_baru += ditemukanPlusBaru;
        existing.children.push(child);
      }
    });

    return Array.from(groups.values()).map((entry) => ({
      id: entry.id,
      nama_ppl: entry.nama_ppl,
      kecamatan: entry.kecamatan,
      prelist_awal: entry.prelist_awal.toString(),
      ditemukan: entry.ditemukan.toString(),
      tutup: entry.tutup.toString(),
      ganda: entry.ganda.toString(),
      tidak_ditemukan: entry.tidak_ditemukan.toString(),
      baru: entry.baru.toString(),
      ditemukan_plus_baru: entry.ditemukan_plus_baru.toString(),
      children: entry.children,
    }));
  }, [usahaKeluargaData]);

  const namaPplByKey = useMemo(() => {
    const lookup = new Map<string, string>();
    (pplRows || []).forEach((ppl) => {
      const keys = String(ppl.matchingKeys || "").split(",").map((k) => normalizeSheetKey(k));
      keys.forEach((key) => {
        if (key.length === 16 && !lookup.has(key)) {
          lookup.set(key, ppl.nama_ppl);
        }
      });
    });

    (stackingData || []).forEach((row: any) => {
      const key = getStackingKey(row);
      if (key.length !== 16) return;
      if (!lookup.has(key)) {
        const namaPpl = getStackingNamaPpl(row);
        if (namaPpl) lookup.set(key, namaPpl);
      }
    });

    return lookup;
  }, [pplRows, stackingData]);

  const kecamatanByKey = useMemo(() => {
    const lookup = new Map<string, string>();
    (stackingData || []).forEach((row: any) => {
      const key = getStackingKey(row);
      if (key.length !== 16) return;
      const kecamatan = getStackingKecamatan(row);
      if (kecamatan && !lookup.has(key)) {
        lookup.set(key, kecamatan);
      }
    });
    return lookup;
  }, [stackingData]);

  const stackingWilkerstatByKey = useMemo(() => {
    const lookup = new Map<string, number>();
    (stackingData || []).forEach((row: any) => {
      const key = getStackingKey(row);
      if (key.length !== 16) return;
      const value = getStackingWilkerstatValue(row);
      lookup.set(key, value);
    });
    return lookup;
  }, [stackingData]);

  const didataByKey = useMemo(() => {
    const lookup = new Map<string, number>();
    (pplRows || []).forEach((ppl) => {
      (ppl.details || []).forEach((detail) => {
        const key = normalizeSheetKey(detail.matchingKey);
        if (key.length === 16) lookup.set(key, parseNumericValue(detail.responden_didata));
      });
    });
    return lookup;
  }, [pplRows]);

  const prelistAwalByKey = useMemo(() => {
    const lookup = new Map<string, number>();
    (pplRows || []).forEach((ppl) => {
      (ppl.details || []).forEach((detail) => {
        const key = normalizeSheetKey(detail.matchingKey);
        if (key.length === 16) lookup.set(key, parseNumericValue(detail.prelist_awal));
      });
    });
    return lookup;
  }, [pplRows]);

  const usahaProporsiRows = useMemo<UsahaProporsiRow[]>(() => {
    const groups = new Map<string, UsahaProporsiRow>();
    const numericFields: Array<keyof Omit<UsahaProporsiDetailRow, "id" | "kode" | "sls_rt" | "utp_subsektor_st2023">> = [
      "prelist_usaha",
      "prelist_awal",
      "bku_usaha_wilkerstat_baru",
      "bku_ditemukan_pertanian",
      "bku_ditemukan_non_pertanian",
      "bku_baru_pertanian",
      "bku_baru_non_pertanian",
      "keluarga_ditemukan_pertanian",
      "keluarga_ditemukan_non_pertanian",
      "keluarga_baru_pertanian",
      "keluarga_baru_non_pertanian",
      "didata",
    ];

    (usahaProporsiData || [])
      .filter((row: any) => getRawRowId16(row) || getStackingKey(row))
      .forEach((row: any, index: number) => {
        const rowId = getRawRowId16(row) || getStackingKey(row);
        const rawNamaPpl = toProperCase(String(getRowValue(row, "nama_ppl", ["nama ppl", "nama_ppl", "nama pencacah", "nama"], "")).trim());
        const rawKecamatan = toProperCase(String(getRowValue(row, "kecamatan", ["nama kecamatan", "kecamatan", "region", "regioncode"], "")).trim());
        const namaPpl = (rowId ? namaPplByKey.get(rowId) : undefined) || rawNamaPpl || "-";
        const kecamatan = (rowId ? kecamatanByKey.get(rowId) : undefined) || rawKecamatan || "-";
        if (namaPpl === "-") return;
        const detail: UsahaProporsiDetailRow = {
          id: `proporsi-detail-${rowId || index}`,
          kode: rowId,
          sls_rt: toProperCase(getRawColumnText(row, 1, "-")),
          prelist_awal: (rowId ? prelistAwalByKey.get(rowId) : 0)?.toString() || "0",
          prelist_usaha: getRawColumnText(row, 2, "0"),
          utp_subsektor_st2023: getRawColumnText(row, 4, ""),
          didata: (rowId ? didataByKey.get(rowId) : 0)?.toString() || "0",
          bku_ditemukan_pertanian: getRawColumnText(row, 5, "0"),
          bku_ditemukan_non_pertanian: getRawColumnText(row, 7, "0"),
          bku_baru_pertanian: getRawColumnText(row, 8, "0"),
          bku_baru_non_pertanian: getRawColumnText(row, 10, "0"),
          bku_usaha_wilkerstat_baru: (() => {
            const stackingVal = rowId ? stackingWilkerstatByKey.get(rowId) : undefined;
            if (typeof stackingVal === "number") return stackingVal.toString();
            const fallback = parseNumericValue(getRawColumnText(row, 23, ""));
            return fallback.toString();
          })(),
          keluarga_ditemukan_pertanian: getRawColumnText(row, 11, "0"),
          keluarga_ditemukan_non_pertanian: getRawColumnText(row, 13, "0"),
          keluarga_baru_pertanian: getRawColumnText(row, 14, "0"),
          keluarga_baru_non_pertanian: getRawColumnText(row, 16, "0"),
        };
        const groupKey = `${normalizePersonKey(namaPpl)}||${normalizeKecamatanKey(kecamatan)}`;
        const existing = groups.get(groupKey);
        if (!existing) {
          groups.set(groupKey, {
            id: `proporsi-${groupKey}`,
            nama_ppl: namaPpl,
            kecamatan,
            prelist_awal: detail.prelist_awal,
            prelist_usaha: detail.prelist_usaha,
            utp_subsektor_st2023: detail.utp_subsektor_st2023,
            didata: detail.didata,
            bku_ditemukan_pertanian: detail.bku_ditemukan_pertanian,
            bku_ditemukan_non_pertanian: detail.bku_ditemukan_non_pertanian,
            bku_baru_pertanian: detail.bku_baru_pertanian,
            bku_baru_non_pertanian: detail.bku_baru_non_pertanian,
            bku_usaha_wilkerstat_baru: detail.bku_usaha_wilkerstat_baru,
            keluarga_ditemukan_pertanian: detail.keluarga_ditemukan_pertanian,
            keluarga_ditemukan_non_pertanian: detail.keluarga_ditemukan_non_pertanian,
            keluarga_baru_pertanian: detail.keluarga_baru_pertanian,
            keluarga_baru_non_pertanian: detail.keluarga_baru_non_pertanian,
            children: [detail],
          });
          return;
        }

        existing.utp_subsektor_st2023 = (
          parseNumericValue(existing.utp_subsektor_st2023) + parseNumericValue(detail.utp_subsektor_st2023)
        ).toString();
        numericFields.forEach((field) => {
          existing[field] = (parseNumericValue(existing[field]) + parseNumericValue(detail[field])).toString();
        });
        existing.children.push(detail);
      });

    return Array.from(groups.values());
  }, [usahaProporsiData, namaPplByKey, kecamatanByKey, didataByKey, prelistAwalByKey]);

  const mergedUsahaRows = useMemo<MergedUsahaRow[]>(() => {
    type GroupedUsaha = {
      id: string;
      nama_ppl: string;
      kecamatanSet: Set<string>;
      prelist_awal_baru: number;
      didata: number;
      perusahaan_prelist_awal: number;
      perusahaan_jumlah_prelist_usaha: number;
      perusahaan_ditemukan: number;
      perusahaan_tutup: number;
      perusahaan_ganda: number;
      perusahaan_tidak_ditemukan: number;
      perusahaan_baru: number;
      perusahaan_ditemukan_plus_baru: number;
      keluarga_ditemukan: number;
      keluarga_tutup: number;
      keluarga_ganda: number;
      keluarga_tidak_ditemukan: number;
      keluarga_baru: number;
      keluarga_ditemukan_plus_baru: number;
      details: MergedUsahaDetailRow[];
      detailsMap: Map<string, MergedUsahaDetailRow>;
    };

    const prelistAwalByKey = new Map<string, number>();
    (progresData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 0));
      if (!key) return;
      const prelistAwal = parseNumericValue(getSheetCellText(row, 2));
      prelistAwalByKey.set(key, (prelistAwalByKey.get(key) || 0) + prelistAwal);
    });

    const wilkerstatByKey = new Map<string, number>();
    (stackingData || []).forEach((row: any) => {
      const key = getStackingKey(row);
      if (!key) return;
      const wilkerstatValue = getStackingWilkerstatValue(row);
      wilkerstatByKey.set(key, (wilkerstatByKey.get(key) || 0) + wilkerstatValue);
    });

    const proporsiByKey = new Map<string, UsahaProporsiDetailRow>();
    const proporsiByGroup = new Map<string, { prelist_awal: number; didata: number }>();
    (usahaProporsiRows || []).forEach((row) => {
      const groupKey = `${normalizePersonKey(row.nama_ppl)}||${normalizeKecamatanKey(row.kecamatan)}`;
      proporsiByGroup.set(groupKey, {
        prelist_awal: parseNumericValue(row.prelist_awal),
        didata: parseNumericValue(row.didata),
      });
      row.children.forEach((detail) => proporsiByKey.set(normalizeSheetKey(detail.kode), detail));
    });

    const merged = new Map<string, GroupedUsaha>();

    const upsert = (groupKey: string, namaPpl: string) => {
      if (!merged.has(groupKey)) {
        merged.set(groupKey, {
          id: groupKey,
          nama_ppl: namaPpl,
          kecamatanSet: new Set<string>(),
          prelist_awal_baru: proporsiByGroup.get(groupKey)?.prelist_awal || 0,
          didata: proporsiByGroup.get(groupKey)?.didata || 0,
          perusahaan_prelist_awal: 0,
          perusahaan_jumlah_prelist_usaha: 0,
          perusahaan_ditemukan: 0,
          perusahaan_tutup: 0,
          perusahaan_ganda: 0,
          perusahaan_tidak_ditemukan: 0,
          perusahaan_baru: 0,
          perusahaan_ditemukan_plus_baru: 0,
          keluarga_ditemukan: 0,
          keluarga_tutup: 0,
          keluarga_ganda: 0,
          keluarga_tidak_ditemukan: 0,
          keluarga_baru: 0,
          keluarga_ditemukan_plus_baru: 0,
          details: [],
          detailsMap: new Map<string, MergedUsahaDetailRow>(),
        });
      }
      return merged.get(groupKey)!;
    };

    const addDetail = (entry: GroupedUsaha, row: any, id: string, sourceType: "Perusahaan" | "Keluarga") => {
      if (!id) return;
      const slsRt = toProperCase(
        getRowValue(row, "sls_rt", ["sls", "slsrt", "sls/rt", "rt", "nama_sls"], getRawColumnText(row, 1, ""))
      );
      const kecamatan = kecamatanByKey.get(id) || toProperCase(
        getRowValue(row, "kecamatan", ["nama_kecamatan", "desa", "kelurahan", "kec"], getRawColumnText(row, 1, ""))
      );
      if (kecamatan) entry.kecamatanSet.add(kecamatan);

      const existingDetail = entry.detailsMap.get(id);
      const proporsiDetail = proporsiByKey.get(normalizeSheetKey(id));
      const perusahaanPrelistAwal = (prelistAwalByKey.get(id) ?? 0).toString();
      const perusahaanJumlahPrelistUsaha = sourceType === "Perusahaan" ? getRawColumnText(row, 2, "0") : "0";
      const bkuUsahaWilkerstatBaru = (wilkerstatByKey.get(id) ?? 0).toString();
      const sumRawColumns = (...columns: number[]) => columns.reduce((sum, column) => sum + getRawColumnNumber(row, column, 0), 0).toString();
      // USAHA PERUSAHAAN (A=0): Ditemukan = D+F+T, Tutup = H+J+V, Ganda = L+X,
      // Tidak Ditemukan = N+Z, Baru = AB, Ditemukan+Baru = AH
      const perusahaanDitemukan = sourceType === "Perusahaan" ? sumRawColumns(3, 5, 19) : "0";
      const perusahaanTutup = sourceType === "Perusahaan" ? sumRawColumns(7, 9, 21) : "0";
      const perusahaanGanda = sourceType === "Perusahaan" ? sumRawColumns(11, 23) : "0";
      const perusahaanTidakDitemukan = sourceType === "Perusahaan" ? sumRawColumns(13, 25) : "0";
      const perusahaanBaru = sourceType === "Perusahaan" ? getRawColumnText(row, 27, "0") : "0";
      const perusahaanDitemukanPlusBaru = sourceType === "Perusahaan" ? getRawColumnText(row, 33, "0") : "0";
      // USAHA KELUARGA (A=0): Ditemukan = D, Tutup = F, Ganda = H,
      // Tidak Ditemukan = J, Baru = L, Ditemukan+Baru = P
      const keluargaDitemukan = sourceType === "Keluarga" ? getRawColumnText(row, 3, "0") : "0";
      const keluargaTutup = sourceType === "Keluarga" ? getRawColumnText(row, 5, "0") : "0";
      const keluargaGanda = sourceType === "Keluarga" ? getRawColumnText(row, 7, "0") : "0";
      const keluargaTidakDitemukan = sourceType === "Keluarga" ? getRawColumnText(row, 9, "0") : "0";
      const keluargaBaru = sourceType === "Keluarga" ? getRawColumnText(row, 11, "0") : "0";
      const keluargaDitemukanPlusBaru = sourceType === "Keluarga" ? getRawColumnText(row, 15, "0") : "0";

      if (existingDetail) {
        existingDetail.perusahaan_prelist_awal = (parseNumericValue(existingDetail.perusahaan_prelist_awal) + parseNumericValue(perusahaanPrelistAwal)).toString();
        existingDetail.perusahaan_jumlah_prelist_usaha = (parseNumericValue(existingDetail.perusahaan_jumlah_prelist_usaha) + parseNumericValue(perusahaanJumlahPrelistUsaha)).toString();
        existingDetail.perusahaan_ditemukan = (parseNumericValue(existingDetail.perusahaan_ditemukan) + parseNumericValue(perusahaanDitemukan)).toString();
        existingDetail.perusahaan_tutup = (parseNumericValue(existingDetail.perusahaan_tutup) + parseNumericValue(perusahaanTutup)).toString();
        existingDetail.perusahaan_ganda = (parseNumericValue(existingDetail.perusahaan_ganda) + parseNumericValue(perusahaanGanda)).toString();
        existingDetail.perusahaan_tidak_ditemukan = (parseNumericValue(existingDetail.perusahaan_tidak_ditemukan) + parseNumericValue(perusahaanTidakDitemukan)).toString();
        existingDetail.perusahaan_baru = (parseNumericValue(existingDetail.perusahaan_baru) + parseNumericValue(perusahaanBaru)).toString();
        existingDetail.perusahaan_ditemukan_plus_baru = (parseNumericValue(existingDetail.perusahaan_ditemukan_plus_baru) + parseNumericValue(perusahaanDitemukanPlusBaru)).toString();
        existingDetail.keluarga_ditemukan = (parseNumericValue(existingDetail.keluarga_ditemukan) + parseNumericValue(keluargaDitemukan)).toString();
        existingDetail.keluarga_tutup = (parseNumericValue(existingDetail.keluarga_tutup) + parseNumericValue(keluargaTutup)).toString();
        existingDetail.keluarga_ganda = (parseNumericValue(existingDetail.keluarga_ganda) + parseNumericValue(keluargaGanda)).toString();
        existingDetail.keluarga_tidak_ditemukan = (parseNumericValue(existingDetail.keluarga_tidak_ditemukan) + parseNumericValue(keluargaTidakDitemukan)).toString();
        existingDetail.keluarga_baru = (parseNumericValue(existingDetail.keluarga_baru) + parseNumericValue(keluargaBaru)).toString();
        existingDetail.keluarga_ditemukan_plus_baru = (parseNumericValue(existingDetail.keluarga_ditemukan_plus_baru) + parseNumericValue(keluargaDitemukanPlusBaru)).toString();
        existingDetail.sourceType = "Gabungan";
      } else {
        entry.detailsMap.set(id, {
          id: `${id}-${sourceType.toLowerCase()}`,
          sourceType: sourceType,
          nama_ppl: entry.nama_ppl,
          kecamatan,
          sls_code: id,
          sls_rt: slsRt,
          prelist_awal_baru: proporsiDetail?.prelist_awal || "0",
          didata: proporsiDetail?.didata || "0",
          bku_usaha_wilkerstat_baru: bkuUsahaWilkerstatBaru,
          perusahaan_prelist_awal: perusahaanPrelistAwal,
          perusahaan_jumlah_prelist_usaha: perusahaanJumlahPrelistUsaha,
          perusahaan_ditemukan: perusahaanDitemukan,
          perusahaan_tutup: perusahaanTutup,
          perusahaan_ganda: perusahaanGanda,
          perusahaan_tidak_ditemukan: perusahaanTidakDitemukan,
          perusahaan_baru: perusahaanBaru,
          perusahaan_ditemukan_plus_baru: perusahaanDitemukanPlusBaru,
          keluarga_ditemukan: keluargaDitemukan,
          keluarga_tutup: keluargaTutup,
          keluarga_ganda: keluargaGanda,
          keluarga_tidak_ditemukan: keluargaTidakDitemukan,
          keluarga_baru: keluargaBaru,
          keluarga_ditemukan_plus_baru: keluargaDitemukanPlusBaru,
        });
      }
    };

    (usahaPerusahaanData || []).forEach((row: any) => {
      const id = getRawRowId16(row);
      if (!id || !id.startsWith("3210")) return;
      const rawNamaPpl = toProperCase(getRowValue(row, "nama_ppl", ["nama_ppl", "nama_pml", "ppl"], "-"));
      const kecamatanFromRow = toProperCase(getRowValue(row, "kecamatan", ["nama_kecamatan", "desa", "kelurahan", "kec"], getRawColumnText(row, 1, "")));
      const namaPpl = namaPplByKey.get(id) || rawNamaPpl || "-";
      const kecamatan = kecamatanByKey.get(id) || kecamatanFromRow;
      const groupKey = `${normalizePersonKey(namaPpl)}||${normalizeKecamatanKey(kecamatan)}`;
      const entry = upsert(groupKey, namaPpl);
      if (kecamatan) entry.kecamatanSet.add(kecamatan);
      addDetail(entry, row, id, "Perusahaan");
    });

    (usahaKeluargaData || []).forEach((row: any) => {
      const id = getRawRowId16(row);
      if (!id || !id.startsWith("3210")) return;
      const rawNamaPpl = toProperCase(getRowValue(row, "nama_ppl", ["nama_ppl", "nama_pml", "ppl"], "-"));
      const kecamatanFromRow = toProperCase(getRowValue(row, "kecamatan", ["nama_kecamatan", "desa", "kelurahan", "kec"], getRawColumnText(row, 1, "")));
      const namaPpl = namaPplByKey.get(id) || rawNamaPpl || "-";
      const kecamatan = kecamatanByKey.get(id) || kecamatanFromRow;
      const groupKey = `${normalizePersonKey(namaPpl)}||${normalizeKecamatanKey(kecamatan)}`;
      const entry = upsert(groupKey, namaPpl);
      if (kecamatan) entry.kecamatanSet.add(kecamatan);
      entry.keluarga_ditemukan += getRawColumnNumber(row, 3, 0);
      entry.keluarga_tutup += getRawColumnNumber(row, 5, 0);
      entry.keluarga_ganda += getRawColumnNumber(row, 7, 0);
      entry.keluarga_tidak_ditemukan += getRawColumnNumber(row, 9, 0);
      entry.keluarga_baru += getRawColumnNumber(row, 11, 0);
      entry.keluarga_ditemukan_plus_baru += getRawColumnNumber(row, 13, 0);
      addDetail(entry, row, id, "Keluarga");
    });

    return Array.from(merged.values()).map((entry) => {
      const details = Array.from(entry.detailsMap.values());
      const perusahaan_prelist_awal = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_prelist_awal),
        0
      );
      const perusahaan_jumlah_prelist_usaha = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_jumlah_prelist_usaha),
        0
      );
      const perusahaan_ditemukan = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_ditemukan),
        0
      );
      const perusahaan_tutup = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_tutup),
        0
      );
      const perusahaan_ganda = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_ganda),
        0
      );
      const perusahaan_tidak_ditemukan = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_tidak_ditemukan),
        0
      );
      const perusahaan_baru = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_baru),
        0
      );
      const perusahaan_ditemukan_plus_baru = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.perusahaan_ditemukan_plus_baru),
        0
      );
      const keluarga_ditemukan = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.keluarga_ditemukan),
        0
      );
      const keluarga_tutup = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.keluarga_tutup),
        0
      );
      const keluarga_ganda = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.keluarga_ganda),
        0
      );
      const keluarga_tidak_ditemukan = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.keluarga_tidak_ditemukan),
        0
      );
      const keluarga_baru = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.keluarga_baru),
        0
      );
      const keluarga_ditemukan_plus_baru = details.reduce(
        (sum, detail) => sum + parseNumericValue(detail.keluarga_ditemukan_plus_baru),
        0
      );
      return {
        id: entry.id,
        nama_ppl: entry.nama_ppl,
        kecamatan: Array.from(entry.kecamatanSet).filter(Boolean).join(", "),
        prelist_awal_baru: entry.prelist_awal_baru.toString(),
        didata: entry.didata.toString(),
        bku_usaha_wilkerstat_baru: (details.reduce((sum, detail) => sum + parseNumericValue(detail.bku_usaha_wilkerstat_baru), 0)).toString(),
        perusahaan_prelist_awal: perusahaan_prelist_awal.toString(),
        perusahaan_jumlah_prelist_usaha: perusahaan_jumlah_prelist_usaha.toString(),
        perusahaan_ditemukan: perusahaan_ditemukan.toString(),
        perusahaan_tutup: perusahaan_tutup.toString(),
        perusahaan_ganda: perusahaan_ganda.toString(),
        perusahaan_tidak_ditemukan: perusahaan_tidak_ditemukan.toString(),
        perusahaan_baru: perusahaan_baru.toString(),
        perusahaan_ditemukan_plus_baru: perusahaan_ditemukan_plus_baru.toString(),
        keluarga_ditemukan: keluarga_ditemukan.toString(),
        keluarga_tutup: keluarga_tutup.toString(),
        keluarga_ganda: keluarga_ganda.toString(),
        keluarga_tidak_ditemukan: keluarga_tidak_ditemukan.toString(),
        keluarga_baru: keluarga_baru.toString(),
        keluarga_ditemukan_plus_baru: keluarga_ditemukan_plus_baru.toString(),
        details,
      };
    });
  }, [usahaPerusahaanData, usahaKeluargaData, namaPplByKey, usahaProporsiRows]);

  const prelistUsahaByGroupKey = useMemo(() => {
    const lookup = new Map<string, number>();
    (mergedUsahaRows || []).forEach((row) => {
      const groupKey = `${normalizePersonKey(row.nama_ppl)}||${normalizeKecamatanKey(row.kecamatan)}`;
      lookup.set(groupKey, parseNumericValue(row.perusahaan_jumlah_prelist_usaha));
    });
    return lookup;
  }, [mergedUsahaRows]);

  const prelistUsahaByRowKey = useMemo(() => {
    const lookup = new Map<string, number>();
    (usahaProporsiRows || []).forEach((row) => {
      row.children.forEach((detail) => {
        const key = normalizeSheetKey(detail.kode);
        if (key) lookup.set(key, parseNumericValue(detail.prelist_usaha));
      });
    });
    return lookup;
  }, [usahaProporsiRows]);

  const mergedUsahaKecamatanOptions = useMemo(() => {
    const values = new Set<string>();
    mergedUsahaRows.forEach((row) => {
      const rawKec = String(row.kecamatan || "").trim();
      if (!rawKec) return;
      rawKec.split(/,|\n/).map((part) => part.trim()).filter(Boolean).forEach((value) => values.add(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "id"));
  }, [mergedUsahaRows]);

  const filteredMergedUsahaRows = useMemo(() => {
    const q = usahaSearchTerm.trim().toLowerCase();
    let rows = mergedUsahaRows;
    if (q) {
      rows = rows.filter((row) =>
        row.nama_ppl.toLowerCase().includes(q) ||
        row.id.includes(q) ||
        row.kecamatan.toLowerCase().includes(q)
      );
    }
    if (usahaKecamatanFilter !== "all") {
      const selected = usahaKecamatanFilter.toLowerCase();
      rows = rows.filter((row) => {
        const values = String(row.kecamatan || "")
          .split(/,|\n/)
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean);
        return values.includes(selected);
      });
    }

    const isBlankNamaPpl = (value: string) => {
      const normalized = String(value || "").trim().toLowerCase();
      return normalized === "" || normalized === "-" || normalized === "tidak diketahui";
    };

    const getSortValue = (row: MergedUsahaRow): string | number => {
      const totalTidakDitemukan = parseNumericValue(row.perusahaan_tidak_ditemukan) + parseNumericValue(row.keluarga_tidak_ditemukan);
      const totalUsaha = parseNumericValue(row.perusahaan_ditemukan) + parseNumericValue(row.perusahaan_baru) + parseNumericValue(row.keluarga_ditemukan) + parseNumericValue(row.keluarga_baru);
      switch (usahaMergedSortBy) {
        case "nama_ppl": return row.nama_ppl;
        case "kecamatan": return row.kecamatan;
        case "prelist_awal_baru": return parseNumericValue(row.prelist_awal_baru);
        case "perusahaan_jumlah_prelist_usaha": return parseNumericValue(row.perusahaan_jumlah_prelist_usaha);
        case "didata": return parseNumericValue(row.didata);
        case "bku_usaha_wilkerstat_baru": return parseNumericValue(row.bku_usaha_wilkerstat_baru);
        case "perusahaan_ditemukan": return parseNumericValue(row.perusahaan_ditemukan);
        case "perusahaan_tutup": return parseNumericValue(row.perusahaan_tutup);
        case "perusahaan_ganda": return parseNumericValue(row.perusahaan_ganda);
        case "perusahaan_tidak_ditemukan": return parseNumericValue(row.perusahaan_tidak_ditemukan);
        case "perusahaan_baru": return parseNumericValue(row.perusahaan_baru);
        case "perusahaan_ditemukan_plus_baru": return parseNumericValue(row.perusahaan_ditemukan_plus_baru);
        case "keluarga_ditemukan": return parseNumericValue(row.keluarga_ditemukan);
        case "keluarga_tutup": return parseNumericValue(row.keluarga_tutup);
        case "keluarga_ganda": return parseNumericValue(row.keluarga_ganda);
        case "keluarga_tidak_ditemukan": return parseNumericValue(row.keluarga_tidak_ditemukan);
        case "keluarga_baru": return parseNumericValue(row.keluarga_baru);
        case "keluarga_ditemukan_plus_baru": return parseNumericValue(row.keluarga_ditemukan_plus_baru);
        case "total_tidak_ditemukan": return totalTidakDitemukan;
        case "total_usaha": return totalUsaha;
        case "surplus_defisit": return totalUsaha - totalTidakDitemukan;
        default: return row.nama_ppl;
      }
    };

    return [...rows].sort((a, b) => {
      if (usahaMergedSortBy === "nama_ppl") {
        const aBlank = isBlankNamaPpl(a.nama_ppl);
        const bBlank = isBlankNamaPpl(b.nama_ppl);
        if (aBlank !== bBlank) return aBlank ? 1 : -1;
      }
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      const direction = usahaMergedSortOrder === "asc" ? 1 : -1;
      const comparison = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), "id");
      return comparison !== 0 ? comparison * direction : a.id.localeCompare(b.id, "id");
    });
  }, [mergedUsahaRows, usahaSearchTerm, usahaMergedSortBy, usahaMergedSortOrder, usahaKecamatanFilter]);

  const toggleMergedUsahaSort = (field: string) => {
    if (usahaMergedSortBy === field) {
      setUsahaMergedSortOrder((order) => order === "asc" ? "desc" : "asc");
    } else {
      setUsahaMergedSortBy(field);
      setUsahaMergedSortOrder("asc");
    }
    setUsahaKondisiMergedCurrentPage(1);
  };

  const usahaMergedTotalPages = Math.max(1, Math.ceil(filteredMergedUsahaRows.length / usahaItemsPerPage));
  const usahaMergedPaginatedRows = useMemo(() => {
    const startIndex = (usahaKondisiMergedCurrentPage - 1) * usahaItemsPerPage;
    return filteredMergedUsahaRows.slice(startIndex, startIndex + usahaItemsPerPage);
  }, [filteredMergedUsahaRows, usahaKondisiMergedCurrentPage, usahaItemsPerPage]);

  const summarizeMergedUsahaRows = (rows: MergedUsahaRow[]) => rows.reduce((summary, row) => {
    summary.prelist_awal_baru += parseNumericValue(row.prelist_awal_baru);
    summary.perusahaan_jumlah_prelist_usaha += parseNumericValue(row.perusahaan_jumlah_prelist_usaha);
    summary.didata += parseNumericValue(row.didata);
    summary.bku_usaha_wilkerstat_baru += parseNumericValue(row.bku_usaha_wilkerstat_baru);
    summary.perusahaan_ditemukan += parseNumericValue(row.perusahaan_ditemukan);
    summary.perusahaan_tutup += parseNumericValue(row.perusahaan_tutup);
    summary.perusahaan_ganda += parseNumericValue(row.perusahaan_ganda);
    summary.perusahaan_tidak_ditemukan += parseNumericValue(row.perusahaan_tidak_ditemukan);
    summary.perusahaan_baru += parseNumericValue(row.perusahaan_baru);
    summary.perusahaan_ditemukan_plus_baru += parseNumericValue(row.perusahaan_ditemukan_plus_baru);
    summary.keluarga_ditemukan += parseNumericValue(row.keluarga_ditemukan);
    summary.keluarga_tutup += parseNumericValue(row.keluarga_tutup);
    summary.keluarga_ganda += parseNumericValue(row.keluarga_ganda);
    summary.keluarga_tidak_ditemukan += parseNumericValue(row.keluarga_tidak_ditemukan);
    summary.keluarga_baru += parseNumericValue(row.keluarga_baru);
    summary.keluarga_ditemukan_plus_baru += parseNumericValue(row.keluarga_ditemukan_plus_baru);
    return summary;
  }, {
    prelist_awal_baru: 0,
    perusahaan_jumlah_prelist_usaha: 0,
    didata: 0,
    bku_usaha_wilkerstat_baru: 0,
    perusahaan_ditemukan: 0,
    perusahaan_tutup: 0,
    perusahaan_ganda: 0,
    perusahaan_tidak_ditemukan: 0,
    perusahaan_baru: 0,
    perusahaan_ditemukan_plus_baru: 0,
    keluarga_ditemukan: 0,
    keluarga_tutup: 0,
    keluarga_ganda: 0,
    keluarga_tidak_ditemukan: 0,
    keluarga_baru: 0,
    keluarga_ditemukan_plus_baru: 0,
  });

  const paginatedMergedUsahaSummary = summarizeMergedUsahaRows(usahaMergedPaginatedRows);
  const totalMergedUsahaSummary = summarizeMergedUsahaRows(mergedUsahaRows);

  const renderMergedUsahaSummaryRow = (label: string, summary: typeof paginatedMergedUsahaSummary) => {
    const totalTidakDitemukan = summary.perusahaan_tidak_ditemukan + summary.keluarga_tidak_ditemukan;
    const totalUsaha = summary.perusahaan_ditemukan + summary.perusahaan_baru + summary.keluarga_ditemukan + summary.keluarga_baru;
    const surplusDefisit = totalUsaha - totalTidakDitemukan;
    const percentage = (value: number) => summary.perusahaan_jumlah_prelist_usaha > 0
      ? `${((value / summary.perusahaan_jumlah_prelist_usaha) * 100).toFixed(2).replace(".", ",")}%`
      : "0,00%";
    const number = (value: number) => value.toLocaleString("id-ID");
    return (
      <TableRow className="border-t-2 border-slate-300 bg-slate-100 hover:bg-slate-100">
        <TableCell colSpan={3} className="font-bold text-slate-800 px-4 py-3">{label}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.prelistAwal} className="text-right font-bold text-slate-900 px-4 py-3">{number(summary.prelist_awal_baru)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.prelistUsaha} className="text-right font-bold text-slate-900 px-4 py-3">{number(summary.perusahaan_jumlah_prelist_usaha)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.didata} className="text-right font-bold text-slate-900 px-4 py-3">{number(summary.didata)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.bkuUsahaWilkerstatBaru} className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-slate-900 px-2 py-3 whitespace-normal break-words leading-tight">{number(summary.bku_usaha_wilkerstat_baru)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.perusahaanDitemukan} className="text-right font-bold text-slate-900 px-4 py-3 bg-slate-100">{number(summary.perusahaan_ditemukan)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.perusahaanTutup} className="text-right font-bold text-slate-900 px-4 py-3 bg-slate-50">{number(summary.perusahaan_tutup)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.perusahaanGanda} className="text-right font-bold text-slate-900 px-4 py-3 bg-slate-100">{number(summary.perusahaan_ganda)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.perusahaanTidakDitemukan} className="text-right font-bold text-rose-800 px-2 py-3 bg-rose-50">{number(summary.perusahaan_tidak_ditemukan)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.perusahaanBaru} className="text-right font-bold text-slate-900 px-3 py-3 bg-amber-50">{number(summary.perusahaan_baru)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.perusahaanDitemukanBaru} className="text-right font-bold text-sky-700 px-2 py-3 bg-cyan-50">{number(summary.perusahaan_ditemukan_plus_baru)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.keluargaDitemukan} className="text-right font-bold text-slate-900 px-4 py-3 bg-slate-100">{number(summary.keluarga_ditemukan)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.keluargaTutup} className="text-right font-bold text-slate-900 px-4 py-3 bg-slate-50">{number(summary.keluarga_tutup)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.keluargaGanda} className="text-right font-bold text-slate-900 px-4 py-3 bg-slate-100">{number(summary.keluarga_ganda)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.keluargaTidakDitemukan} className="text-right font-bold text-rose-800 px-2 py-3 bg-rose-50">{number(summary.keluarga_tidak_ditemukan)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.keluargaBaru} className="text-right font-bold text-slate-900 px-3 py-3 bg-amber-50">{number(summary.keluarga_baru)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.keluargaDitemukanBaru} className="text-right font-bold text-sky-700 px-2 py-3 bg-cyan-50">{number(summary.keluarga_ditemukan_plus_baru)}</TableCell>
        <TableCell hidden={!usahaKondisiColumns.totalTidakDitemukan} className="text-right font-bold text-rose-800 px-4 py-3 bg-rose-50"><div>{number(totalTidakDitemukan)}</div><div className="text-xs font-medium">{percentage(totalTidakDitemukan)}</div></TableCell>
        <TableCell hidden={!usahaKondisiColumns.totalUsaha} className="text-right font-bold text-sky-700 px-4 py-3 bg-cyan-50"><div>{number(totalUsaha)}</div><div className="text-xs font-medium">{percentage(totalUsaha)}</div></TableCell>
        <TableCell hidden={!usahaKondisiColumns.surplusDefisit} className={`text-right font-bold px-4 py-3 ${surplusDefisit < 0 ? "text-rose-800" : "text-emerald-700"}`}>{number(surplusDefisit)}</TableCell>
      </TableRow>
    );
  };

  const proporsiKecamatanOptions = useMemo(() => {
    const values = new Set<string>();
    usahaProporsiRows.forEach((row) => {
      const rawKec = String(row.kecamatan || "").trim();
      if (!rawKec) return;
      rawKec.split(/,|\n/).map((part) => part.trim()).filter(Boolean).forEach((value) => values.add(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "id"));
  }, [usahaProporsiRows]);

  const filteredUsahaPerusahaanRows = useMemo(() => {
    const q = usahaSearchTerm.trim().toLowerCase();
    let rows = usahaPerusahaanRows;
    if (q) {
      rows = rows.filter((row) =>
        row.nama_ppl.toLowerCase().includes(q) ||
        row.kecamatan.toLowerCase().includes(q)
      );
    }

    const getValue = (row: UsahaPerusahaanRow) => {
      const numericFields = [
        "prelist_awal",
        "jumlah_prelist_usaha",
        "ditemukan",
        "tutup",
        "ganda",
        "tidak_ditemukan",
        "baru",
        "ditemukan_plus_baru",
      ];
      if (numericFields.includes(usahaPerusahaanSortBy)) {
        return parseNumericValue(row[usahaPerusahaanSortBy as keyof UsahaPerusahaanRow]);
      }
      return String(row[usahaPerusahaanSortBy as keyof UsahaPerusahaanRow] || "").toLowerCase();
    };

    return [...rows].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return usahaPerusahaanSortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      return usahaPerusahaanSortOrder === "asc"
        ? String(aValue).localeCompare(String(bValue), "id")
        : String(bValue).localeCompare(String(aValue), "id");
    });
  }, [usahaPerusahaanRows, usahaSearchTerm, usahaPerusahaanSortBy, usahaPerusahaanSortOrder]);

  const filteredUsahaKeluargaRows = useMemo(() => {
    const q = usahaSearchTerm.trim().toLowerCase();
    let rows = usahaKeluargaRows;
    if (q) {
      rows = rows.filter((row) =>
        row.nama_ppl.toLowerCase().includes(q) ||
        row.kecamatan.toLowerCase().includes(q)
      );
    }

    const getValue = (row: UsahaKeluargaRow) => {
      const numericFields = [
        "prelist_awal",
        "ditemukan",
        "tutup",
        "ganda",
        "tidak_ditemukan",
        "baru",
        "ditemukan_plus_baru",
      ];
      if (numericFields.includes(usahaKeluargaSortBy)) {
        return parseNumericValue(row[usahaKeluargaSortBy as keyof UsahaKeluargaRow]);
      }
      return String(row[usahaKeluargaSortBy as keyof UsahaKeluargaRow] || "").toLowerCase();
    };

    return [...rows].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return usahaKeluargaSortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      return usahaKeluargaSortOrder === "asc"
        ? String(aValue).localeCompare(String(bValue), "id")
        : String(bValue).localeCompare(String(aValue), "id");
    });
  }, [usahaKeluargaRows, usahaSearchTerm, usahaKeluargaSortBy, usahaKeluargaSortOrder]);

  const filteredUsahaProporsiRows = useMemo(() => {
    const q = usahaSearchTerm.trim().toLowerCase();
    let rows = usahaProporsiRows;
    if (q) {
      rows = rows.filter((row) =>
        row.nama_ppl.toLowerCase().includes(q) ||
        row.kecamatan.toLowerCase().includes(q)
      );
    }
    if (proporsiKecamatanFilter !== "all") {
      const selected = proporsiKecamatanFilter.toLowerCase();
      rows = rows.filter((row) => {
        const values = String(row.kecamatan || "")
          .split(/,|\n/)
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean);
        return values.includes(selected);
      });
    }

    const getValue = (row: UsahaProporsiRow) => {
      const numericValues: Record<string, number> = {
        prelist_awal: parseNumericValue(row.prelist_awal),
        prelist_usaha: parseNumericValue(row.prelist_usaha),
        utp_subsektor_st2023: parseNumericValue(row.utp_subsektor_st2023),
        bku_usaha_wilkerstat_baru: parseNumericValue(row.bku_usaha_wilkerstat_baru),
        didata: parseNumericValue(row.didata),
        bku_ditemukan_pertanian: parseNumericValue(row.bku_ditemukan_pertanian),
        bku_ditemukan_non_pertanian: parseNumericValue(row.bku_ditemukan_non_pertanian),
        bku_baru_pertanian: parseNumericValue(row.bku_baru_pertanian),
        bku_baru_non_pertanian: parseNumericValue(row.bku_baru_non_pertanian),
        keluarga_ditemukan_pertanian: parseNumericValue(row.keluarga_ditemukan_pertanian),
        keluarga_ditemukan_non_pertanian: parseNumericValue(row.keluarga_ditemukan_non_pertanian),
        keluarga_baru_pertanian: parseNumericValue(row.keluarga_baru_pertanian),
        keluarga_baru_non_pertanian: parseNumericValue(row.keluarga_baru_non_pertanian),
      };
      numericValues.jumlah_usaha = [
        "bku_ditemukan_non_pertanian", "bku_baru_non_pertanian",
        "keluarga_ditemukan_non_pertanian", "keluarga_baru_non_pertanian",
      ].reduce((sum, field) => sum + numericValues[field], 0);
      numericValues.jumlah_usaha_pertanian = [
        "bku_ditemukan_pertanian", "bku_baru_pertanian", "keluarga_ditemukan_pertanian", "keluarga_baru_pertanian",
      ].reduce((sum, field) => sum + numericValues[field], 0);
      if (usahaProporsiSortBy === "jumlah_usaha") {
        return numericValues.jumlah_usaha;
      }
      if (usahaProporsiSortBy === "persen_non_pertanian_prelist") {
        return numericValues.prelist_usaha > 0
          ? numericValues.jumlah_usaha / numericValues.prelist_usaha
          : 0;
      }
      if (usahaProporsiSortBy === "jumlah_usaha_pertanian") {
        return numericValues.jumlah_usaha_pertanian;
      }
      if (usahaProporsiSortBy === "persen_non_pertanian_wilkerstat") {
        return numericValues.bku_usaha_wilkerstat_baru > 0
          ? numericValues.jumlah_usaha / numericValues.bku_usaha_wilkerstat_baru
          : 0;
      }
      if (usahaProporsiSortBy in numericValues) return numericValues[usahaProporsiSortBy];
      return String(row[usahaProporsiSortBy as keyof UsahaProporsiRow] || "").toLowerCase();
    };

    return [...rows].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return usahaProporsiSortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      return usahaProporsiSortOrder === "asc"
        ? String(aValue).localeCompare(String(bValue), "id")
        : String(bValue).localeCompare(String(aValue), "id");
    });
  }, [usahaProporsiRows, usahaSearchTerm, usahaProporsiSortBy, usahaProporsiSortOrder, proporsiKecamatanFilter]);

  const toggleUsahaProporsiSort = (field: string) => {
    setUsahaProporsiSortBy(field);
    setUsahaProporsiSortOrder((current) => usahaProporsiSortBy === field ? (current === "asc" ? "desc" : "asc") : "asc");
    setUsahaProporsiCurrentPage(1);
  };

  const proporsiSortHead = (label: string, field: string, className = "", rowSpan = 1, visibilityKey?: keyof typeof proporsiColumnGroups) => (
    <TableHead
      rowSpan={rowSpan > 1 ? rowSpan : undefined}
      className={`${className} cursor-pointer hover:bg-slate-100`}
      onClick={() => toggleUsahaProporsiSort(field)}
    >
      <div className={`flex ${className.includes("w-[72px]") ? "flex-wrap items-center justify-center text-center" : "items-center"} ${className.includes("text-right") && !className.includes("w-[72px]") ? "justify-end" : ""}`}>
        <span className={className.includes("w-[72px]") ? "w-full leading-tight" : ""}>{label}</span>
        {visibilityKey && (
          <button
            type="button"
            aria-label={`Sembunyikan ${label}`}
            onClick={(event) => {
              event.stopPropagation();
              setProporsiColumnGroups((previous) => ({ ...previous, [visibilityKey]: false }));
            }}
            className="rounded p-0.5 text-slate-500 hover:bg-white hover:text-slate-900"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>
    </TableHead>
  );

  const kondisiSortHead = (label: React.ReactNode, field: string, visibilityKey: keyof typeof usahaKondisiColumns, className = "", rowSpan = 1) => (
    <TableHead
      rowSpan={rowSpan > 1 ? rowSpan : undefined}
      className={`${className} cursor-pointer hover:bg-slate-100`}
      onClick={() => toggleMergedUsahaSort(field)}
    >
      <div className="flex flex-col items-end gap-0">
        <span>{label}</span>
        <button
          type="button"
          aria-label={`Sembunyikan ${String(label)}`}
          onClick={(event) => {
            event.stopPropagation();
            setUsahaKondisiColumns((previous) => ({ ...previous, [visibilityKey]: false }));
          }}
          className="rounded p-0.5 text-slate-500 hover:bg-white hover:text-slate-900"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </TableHead>
  );

  const bkuColumnKeys = ["perusahaanDitemukan", "perusahaanTutup", "perusahaanGanda", "perusahaanTidakDitemukan", "perusahaanBaru", "perusahaanDitemukanBaru"] as const;
  const keluargaColumnKeys = ["keluargaDitemukan", "keluargaTutup", "keluargaGanda", "keluargaTidakDitemukan", "keluargaBaru", "keluargaDitemukanBaru"] as const;

  const usahaPerusahaanTotalPages = Math.max(1, Math.ceil(filteredUsahaPerusahaanRows.length / usahaItemsPerPage));
  const usahaKeluargaTotalPages = Math.max(1, Math.ceil(filteredUsahaKeluargaRows.length / usahaItemsPerPage));
  const usahaProporsiTotalPages = Math.max(1, Math.ceil(filteredUsahaProporsiRows.length / usahaItemsPerPage));

  const usahaPerusahaanPaginatedRows = useMemo(() => {
    const startIndex = (usahaKondisiPerusahaanCurrentPage - 1) * usahaItemsPerPage;
    return filteredUsahaPerusahaanRows.slice(startIndex, startIndex + usahaItemsPerPage);
  }, [filteredUsahaPerusahaanRows, usahaKondisiPerusahaanCurrentPage, usahaItemsPerPage]);

  const usahaKeluargaPaginatedRows = useMemo(() => {
    const startIndex = (usahaKondisiKeluargaCurrentPage - 1) * usahaItemsPerPage;
    return filteredUsahaKeluargaRows.slice(startIndex, startIndex + usahaItemsPerPage);
  }, [filteredUsahaKeluargaRows, usahaKondisiKeluargaCurrentPage, usahaItemsPerPage]);

  const usahaProporsiPaginatedRows = useMemo(() => {
    const startIndex = (usahaProporsiCurrentPage - 1) * usahaItemsPerPage;
    return filteredUsahaProporsiRows.slice(startIndex, startIndex + usahaItemsPerPage);
  }, [filteredUsahaProporsiRows, usahaProporsiCurrentPage, usahaItemsPerPage]);

  const usahaProporsiTotals = useMemo(() => {
    const total = (field: keyof UsahaProporsiRow) => usahaProporsiPaginatedRows.reduce(
      (sum, row) => sum + parseNumericValue(row[field]),
      0
    );
    return {
      prelistAwal: total("prelist_awal"),
      prelistUsaha: total("prelist_usaha"),
      utpSt2023: total("utp_subsektor_st2023"),
      bkuUsahaWilkerstat: total("bku_usaha_wilkerstat_baru"),
      didata: total("didata"),
      bkuDitemukanPertanian: total("bku_ditemukan_pertanian"),
      bkuDitemukanNonPertanian: total("bku_ditemukan_non_pertanian"),
      bkuBaruPertanian: total("bku_baru_pertanian"),
      bkuBaruNonPertanian: total("bku_baru_non_pertanian"),
      keluargaDitemukanPertanian: total("keluarga_ditemukan_pertanian"),
      keluargaDitemukanNonPertanian: total("keluarga_ditemukan_non_pertanian"),
      keluargaBaruPertanian: total("keluarga_baru_pertanian"),
      keluargaBaruNonPertanian: total("keluarga_baru_non_pertanian"),
    };
  }, [usahaProporsiPaginatedRows]);

  const usahaProporsiOverallTotals = useMemo(() => {
    const total = (field: keyof UsahaProporsiRow) => usahaProporsiRows.reduce(
      (sum, row) => sum + parseNumericValue(row[field]),
      0
    );
    return {
      prelistAwal: total("prelist_awal"),
      prelistUsaha: total("prelist_usaha"),
      utpSt2023: total("utp_subsektor_st2023"),
      bkuUsahaWilkerstat: total("bku_usaha_wilkerstat_baru"),
      didata: total("didata"),
      bkuDitemukanPertanian: total("bku_ditemukan_pertanian"),
      bkuDitemukanNonPertanian: total("bku_ditemukan_non_pertanian"),
      bkuBaruPertanian: total("bku_baru_pertanian"),
      bkuBaruNonPertanian: total("bku_baru_non_pertanian"),
      keluargaDitemukanPertanian: total("keluarga_ditemukan_pertanian"),
      keluargaDitemukanNonPertanian: total("keluarga_ditemukan_non_pertanian"),
      keluargaBaruPertanian: total("keluarga_baru_pertanian"),
      keluargaBaruNonPertanian: total("keluarga_baru_non_pertanian"),
    };
  }, [usahaProporsiRows]);

  const totalJumlahUsaha = usahaProporsiTotals.bkuDitemukanNonPertanian
    + usahaProporsiTotals.bkuBaruNonPertanian
    + usahaProporsiTotals.keluargaDitemukanNonPertanian
    + usahaProporsiTotals.keluargaBaruNonPertanian;
  const totalJumlahUsahaPertanian = usahaProporsiTotals.bkuDitemukanPertanian
    + usahaProporsiTotals.bkuBaruPertanian
    + usahaProporsiTotals.keluargaDitemukanPertanian
    + usahaProporsiTotals.keluargaBaruPertanian;
  const overallJumlahUsaha = usahaProporsiOverallTotals.bkuDitemukanNonPertanian
    + usahaProporsiOverallTotals.bkuBaruNonPertanian
    + usahaProporsiOverallTotals.keluargaDitemukanNonPertanian
    + usahaProporsiOverallTotals.keluargaBaruNonPertanian;
  const overallJumlahUsahaPertanian = usahaProporsiOverallTotals.bkuDitemukanPertanian
    + usahaProporsiOverallTotals.bkuBaruPertanian
    + usahaProporsiOverallTotals.keluargaDitemukanPertanian
    + usahaProporsiOverallTotals.keluargaBaruPertanian;

  const handleDownloadProporsiExcel = () => {
    if (!isPpk) return;

    const getJumlahUsaha = (row: UsahaProporsiRow | UsahaProporsiDetailRow) => [
      row.bku_ditemukan_non_pertanian,
      row.bku_baru_non_pertanian,
      row.keluarga_ditemukan_non_pertanian,
      row.keluarga_baru_non_pertanian,
    ].reduce((total, value) => total + parseNumericValue(value), 0);
    const getJumlahUsahaPertanian = (row: UsahaProporsiRow | UsahaProporsiDetailRow) => [
      row.bku_ditemukan_pertanian,
      row.bku_baru_pertanian,
      row.keluarga_ditemukan_pertanian,
      row.keluarga_baru_pertanian,
    ].reduce((total, value) => total + parseNumericValue(value), 0);
    const toExportRow = (row: UsahaProporsiRow | UsahaProporsiDetailRow, namaPpl: string, kecamatan: string, tipe: string) => {
      const jumlahUsaha = getJumlahUsaha(row);
      const jumlahUsahaPertanian = getJumlahUsahaPertanian(row);
      return {
        Tipe: tipe,
        "Nama PPL": namaPpl,
        Kecamatan: kecamatan,
        "Prelist Awal": parseNumericValue(row.prelist_awal),
        "Prelist Usaha": parseNumericValue(row.prelist_usaha),
        "UTP ST2023": parseNumericValue(row.utp_subsektor_st2023),
        "Usaha Wilkerstat": parseNumericValue(row.bku_usaha_wilkerstat_baru),
        Didata: parseNumericValue(row.didata),
        "BKU Ditemukan Pertanian": parseNumericValue(row.bku_ditemukan_pertanian),
        "BKU Ditemukan Non Pertanian": parseNumericValue(row.bku_ditemukan_non_pertanian),
        "BKU Baru Pertanian": parseNumericValue(row.bku_baru_pertanian),
        "BKU Baru Non Pertanian": parseNumericValue(row.bku_baru_non_pertanian),
        "Keluarga Ditemukan Pertanian": parseNumericValue(row.keluarga_ditemukan_pertanian),
        "Keluarga Ditemukan Non Pertanian": parseNumericValue(row.keluarga_ditemukan_non_pertanian),
        "Keluarga Baru Pertanian": parseNumericValue(row.keluarga_baru_pertanian),
        "Keluarga Baru Non Pertanian": parseNumericValue(row.keluarga_baru_non_pertanian),
        "Jumlah Usaha": jumlahUsaha,
        "% Usaha": formatProporsiPercentage(jumlahUsaha, parseNumericValue(row.prelist_usaha)),
        "% Non Pertanian - Wilkerstat": formatProporsiPercentage(jumlahUsaha, parseNumericValue(row.bku_usaha_wilkerstat_baru)),
        "Jumlah Usaha Pertanian": jumlahUsahaPertanian,
        "% Usaha Pertanian": formatProporsiPercentage(jumlahUsahaPertanian, parseNumericValue(row.utp_subsektor_st2023)),
      };
    };

    const numericFields: UsahaProporsiNumericField[] = [
      "prelist_awal",
      "prelist_usaha",
      "utp_subsektor_st2023",
      "bku_usaha_wilkerstat_baru",
      "didata",
      "bku_ditemukan_pertanian",
      "bku_ditemukan_non_pertanian",
      "bku_baru_pertanian",
      "bku_baru_non_pertanian",
      "keluarga_ditemukan_pertanian",
      "keluarga_ditemukan_non_pertanian",
      "keluarga_baru_pertanian",
      "keluarga_baru_non_pertanian",
    ];
    const aggregateRows = (groupBy: (row: UsahaProporsiRow) => string, labelFor: (rows: UsahaProporsiRow[]) => string) => Array.from(
      filteredUsahaProporsiRows.reduce((groups, row) => {
        const groupKey = groupBy(row);
        const existing = groups.get(groupKey);
        if (!existing) {
          groups.set(groupKey, {
            ...row,
            id: `proporsi-kecamatan-${groupKey}`,
            nama_ppl: labelFor([row]),
            children: [],
          });
          return groups;
        }
        existing.kecamatan = labelFor([...filteredUsahaProporsiRows.filter((candidate) => groupBy(candidate) === groupKey)]);
        numericFields.forEach((field) => {
          existing[field] = (parseNumericValue(existing[field]) + parseNumericValue(row[field])).toString();
        });
        return groups;
      }, new Map<string, UsahaProporsiRow>()).values()
    );
    const kecamatanRows = aggregateRows(
      (row) => normalizeKecamatanKey(row.kecamatan),
      (rows) => rows[0].kecamatan
    );
    const pplRows = aggregateRows(
      (row) => normalizePersonKey(row.nama_ppl),
      (rows) => rows[0].nama_ppl
    );
    const exportRows = proporsiExportMode === "kecamatan"
      ? kecamatanRows.map((row) => toExportRow(row, "Semua PPL", row.kecamatan, "Kecamatan"))
      : proporsiExportMode === "ppl"
        ? pplRows.map((row) => toExportRow(row, row.nama_ppl, row.kecamatan, "PPL"))
        : filteredUsahaProporsiRows.flatMap((row) => [
          toExportRow(row, row.nama_ppl, row.kecamatan, "PPL"),
          ...row.children.map((detail) => toExportRow(detail, detail.kode, detail.sls_rt, "Detail")),
        ]);
    if (exportRows.length === 0) return;

    const autoCols = (rows: Record<string, any>[]) =>
      Object.keys(rows[0] || {}).map((key) => ({ wch: Math.min(Math.max(key.length + 2, 12), 34) }));
    const workbook = XLSX.utils.book_new();

    // ---------- Sheet 1: Detail (sesuai tampilan UI) ----------
    const detailSheet = XLSX.utils.json_to_sheet(exportRows);
    detailSheet["!cols"] = autoCols(exportRows);
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail");

    // ---------- Rekap Kecamatan - Desa ----------
    type WilayahAgg = {
      kecamatan: string;
      desa: string;
      prelistAwal: number;
      prelistUsaha: number;
      utp: number;
      wilkerstat: number;
      didata: number;
      nonPertanian: number;
      pertanian: number;
      jumlahSls: number;
    };
    const wilayahMap = new Map<string, WilayahAgg>();
    filteredUsahaProporsiRows.forEach((row) => {
      const kecamatan = row.kecamatan || "-";
      row.children.forEach((detail) => {
        const desa = proporsiKeyToDesa.get(normalizeSheetKey(detail.kode)) || "-";
        const mapKey = `${kecamatan}||${desa}`;
        const existing = wilayahMap.get(mapKey) || {
          kecamatan,
          desa,
          prelistAwal: 0,
          prelistUsaha: 0,
          utp: 0,
          wilkerstat: 0,
          didata: 0,
          nonPertanian: 0,
          pertanian: 0,
          jumlahSls: 0,
        };
        existing.prelistAwal += parseNumericValue(detail.prelist_awal);
        existing.prelistUsaha += parseNumericValue(detail.prelist_usaha);
        existing.utp += parseNumericValue(detail.utp_subsektor_st2023);
        existing.wilkerstat += parseNumericValue(detail.bku_usaha_wilkerstat_baru);
        existing.didata += parseNumericValue(detail.didata);
        existing.nonPertanian += getJumlahUsahaNonPertanian(detail);
        existing.pertanian += getJumlahUsahaPertanian(detail);
        existing.jumlahSls += 1;
        wilayahMap.set(mapKey, existing);
      });
    });
    const wilayahRows = Array.from(wilayahMap.values()).sort((a, b) =>
      a.kecamatan === b.kecamatan ? a.desa.localeCompare(b.desa, "id-ID") : a.kecamatan.localeCompare(b.kecamatan, "id-ID")
    );

    const pct = (numerator: number, denominator: number) =>
      denominator > 0 ? parseFloat(((numerator / denominator) * 100).toFixed(2)) : 0;
    const statusOf = (numerator: number, denominator: number) => {
      if (denominator <= 0) return "Tanpa Pembanding";
      const ratio = (numerator / denominator) * 100;
      if (ratio >= 100) return "LEBIH / Terpenuhi";
      if (ratio >= 90) return "Mendekati Target";
      if (ratio >= 70) return "KURANG";
      return "SANGAT KURANG";
    };

    const sumBy = (selector: (row: WilayahAgg) => number) => wilayahRows.reduce((total, row) => total + selector(row), 0);
    const totalPrelistAwal = sumBy((row) => row.prelistAwal);
    const totalPrelistUsaha = sumBy((row) => row.prelistUsaha);
    const totalUtp = sumBy((row) => row.utp);
    const totalWilkerstat = sumBy((row) => row.wilkerstat);
    const totalDidata = sumBy((row) => row.didata);
    const totalNonPertanian = sumBy((row) => row.nonPertanian);
    const totalPertanian = sumBy((row) => row.pertanian);

    // ---------- Sheet 2: Non Pertanian ----------
    const nonPertanianRows = wilayahRows.map((row, index) => ({
      No: index + 1,
      Kecamatan: row.kecamatan,
      "Desa/Kelurahan": row.desa,
      "Jumlah SLS/RT": row.jumlahSls,
      "Prelist Awal": row.prelistAwal,
      "Prelist Usaha": row.prelistUsaha,
      "Usaha Wilkerstat": row.wilkerstat,
      Didata: row.didata,
      "Jumlah Usaha Non Pertanian": row.nonPertanian,
      "% Non Pertanian - Prelist Usaha": pct(row.nonPertanian, row.prelistUsaha),
      "Status vs Prelist Usaha": statusOf(row.nonPertanian, row.prelistUsaha),
      "Selisih vs Prelist Usaha": row.nonPertanian - row.prelistUsaha,
      "% Non Pertanian - Wilkerstat": pct(row.nonPertanian, row.wilkerstat),
      "Status vs Usaha Wilkerstat": statusOf(row.nonPertanian, row.wilkerstat),
      "Selisih vs Usaha Wilkerstat": row.nonPertanian - row.wilkerstat,
      "% Didata - Prelist Awal": pct(row.didata, row.prelistAwal),
      "% Non Pertanian - Didata": pct(row.nonPertanian, row.didata),
    }));
    nonPertanianRows.push({
      No: "" as any,
      Kecamatan: "TOTAL",
      "Desa/Kelurahan": "",
      "Jumlah SLS/RT": sumBy((row) => row.jumlahSls),
      "Prelist Awal": totalPrelistAwal,
      "Prelist Usaha": totalPrelistUsaha,
      "Usaha Wilkerstat": totalWilkerstat,
      Didata: totalDidata,
      "Jumlah Usaha Non Pertanian": totalNonPertanian,
      "% Non Pertanian - Prelist Usaha": pct(totalNonPertanian, totalPrelistUsaha),
      "Status vs Prelist Usaha": statusOf(totalNonPertanian, totalPrelistUsaha),
      "Selisih vs Prelist Usaha": totalNonPertanian - totalPrelistUsaha,
      "% Non Pertanian - Wilkerstat": pct(totalNonPertanian, totalWilkerstat),
      "Status vs Usaha Wilkerstat": statusOf(totalNonPertanian, totalWilkerstat),
      "Selisih vs Usaha Wilkerstat": totalNonPertanian - totalWilkerstat,
      "% Didata - Prelist Awal": pct(totalDidata, totalPrelistAwal),
      "% Non Pertanian - Didata": pct(totalNonPertanian, totalDidata),
    });
    const nonPertanianSheet = XLSX.utils.json_to_sheet(nonPertanianRows);
    nonPertanianSheet["!cols"] = autoCols(nonPertanianRows);
    XLSX.utils.book_append_sheet(workbook, nonPertanianSheet, "Non Pertanian");

    // ---------- Sheet 3: Pertanian ----------
    const pertanianRows = wilayahRows.map((row, index) => ({
      No: index + 1,
      Kecamatan: row.kecamatan,
      "Desa/Kelurahan": row.desa,
      "Jumlah SLS/RT": row.jumlahSls,
      "Prelist Awal": row.prelistAwal,
      "Prelist Usaha": row.prelistUsaha,
      "UTP ST2023": row.utp,
      Didata: row.didata,
      "Jumlah Usaha Pertanian": row.pertanian,
      "% Usaha Pertanian - UTP ST2023": pct(row.pertanian, row.utp),
      "Status vs UTP ST2023": statusOf(row.pertanian, row.utp),
      "Selisih vs UTP ST2023": row.pertanian - row.utp,
      "% Pertanian - Didata": pct(row.pertanian, row.didata),
      "% Didata - Prelist Awal": pct(row.didata, row.prelistAwal),
    }));
    pertanianRows.push({
      No: "" as any,
      Kecamatan: "TOTAL",
      "Desa/Kelurahan": "",
      "Jumlah SLS/RT": sumBy((row) => row.jumlahSls),
      "Prelist Awal": totalPrelistAwal,
      "Prelist Usaha": totalPrelistUsaha,
      "UTP ST2023": totalUtp,
      Didata: totalDidata,
      "Jumlah Usaha Pertanian": totalPertanian,
      "% Usaha Pertanian - UTP ST2023": pct(totalPertanian, totalUtp),
      "Status vs UTP ST2023": statusOf(totalPertanian, totalUtp),
      "Selisih vs UTP ST2023": totalPertanian - totalUtp,
      "% Pertanian - Didata": pct(totalPertanian, totalDidata),
      "% Didata - Prelist Awal": pct(totalDidata, totalPrelistAwal),
    });
    const pertanianSheet = XLSX.utils.json_to_sheet(pertanianRows);
    pertanianSheet["!cols"] = autoCols(pertanianRows);
    XLSX.utils.book_append_sheet(workbook, pertanianSheet, "Pertanian");

    // ---------- Sheet 4: Grafik + analisis ----------
    const kecamatanMap = new Map<string, WilayahAgg>();
    wilayahRows.forEach((row) => {
      const existing = kecamatanMap.get(row.kecamatan) || {
        ...row,
        desa: "-",
        prelistAwal: 0,
        prelistUsaha: 0,
        utp: 0,
        wilkerstat: 0,
        didata: 0,
        nonPertanian: 0,
        pertanian: 0,
        jumlahSls: 0,
      };
      existing.prelistAwal += row.prelistAwal;
      existing.prelistUsaha += row.prelistUsaha;
      existing.utp += row.utp;
      existing.wilkerstat += row.wilkerstat;
      existing.didata += row.didata;
      existing.nonPertanian += row.nonPertanian;
      existing.pertanian += row.pertanian;
      existing.jumlahSls += row.jumlahSls;
      kecamatanMap.set(row.kecamatan, existing);
    });
    const kecamatanAgg = Array.from(kecamatanMap.values());
    const bar = (value: number, max: number, width = 30) =>
      max > 0 ? "█".repeat(Math.max(0, Math.round((value / max) * width))) : "";

    const grafikAoa: any[][] = [];
    grafikAoa.push(["GRAFIK & ANALISIS PROPORSI PERTANIAN / NON PERTANIAN"]);
    grafikAoa.push([`Tanggal unduh: ${new Date().toLocaleString("id-ID")}`, `Mode data: ${proporsiExportMode}`]);
    grafikAoa.push([]);
    grafikAoa.push(["RINGKASAN AGREGAT"]);
    grafikAoa.push(["Indikator", "Nilai", "Persentase", "Status"]);
    grafikAoa.push(["Prelist Awal", totalPrelistAwal, "", ""]);
    grafikAoa.push(["Prelist Usaha", totalPrelistUsaha, pct(totalPrelistUsaha, totalPrelistAwal), "% dari Prelist Awal"]);
    grafikAoa.push(["Usaha Wilkerstat", totalWilkerstat, "", ""]);
    grafikAoa.push(["UTP ST2023", totalUtp, "", ""]);
    grafikAoa.push(["Didata", totalDidata, pct(totalDidata, totalPrelistAwal), statusOf(totalDidata, totalPrelistAwal)]);
    grafikAoa.push([
      "Jumlah Usaha Non Pertanian",
      totalNonPertanian,
      pct(totalNonPertanian, totalPrelistUsaha),
      statusOf(totalNonPertanian, totalPrelistUsaha),
    ]);
    grafikAoa.push([
      "Jumlah Usaha Pertanian",
      totalPertanian,
      pct(totalPertanian, totalUtp),
      statusOf(totalPertanian, totalUtp),
    ]);
    grafikAoa.push([
      "Komposisi Non Pertanian : Pertanian",
      `${pct(totalNonPertanian, totalNonPertanian + totalPertanian)}% : ${pct(totalPertanian, totalNonPertanian + totalPertanian)}%`,
    ]);
    grafikAoa.push([]);

    const maxNon = Math.max(...kecamatanAgg.map((row) => row.nonPertanian), 0);
    grafikAoa.push(["GRAFIK 1 - JUMLAH USAHA NON PERTANIAN PER KECAMATAN (terbesar ke terkecil)"]);
    grafikAoa.push(["Kecamatan", "Jumlah Non Pertanian", "Grafik", "% vs Prelist Usaha", "% vs Wilkerstat", "Status"]);
    [...kecamatanAgg]
      .sort((a, b) => b.nonPertanian - a.nonPertanian)
      .forEach((row) => {
        grafikAoa.push([
          row.kecamatan,
          row.nonPertanian,
          bar(row.nonPertanian, maxNon),
          pct(row.nonPertanian, row.prelistUsaha),
          pct(row.nonPertanian, row.wilkerstat),
          statusOf(row.nonPertanian, row.prelistUsaha),
        ]);
      });
    grafikAoa.push([]);

    const maxTani = Math.max(...kecamatanAgg.map((row) => row.pertanian), 0);
    grafikAoa.push(["GRAFIK 2 - JUMLAH USAHA PERTANIAN PER KECAMATAN (terbesar ke terkecil)"]);
    grafikAoa.push(["Kecamatan", "Jumlah Pertanian", "Grafik", "UTP ST2023", "% vs UTP ST2023", "Status"]);
    [...kecamatanAgg]
      .sort((a, b) => b.pertanian - a.pertanian)
      .forEach((row) => {
        grafikAoa.push([
          row.kecamatan,
          row.pertanian,
          bar(row.pertanian, maxTani),
          row.utp,
          pct(row.pertanian, row.utp),
          statusOf(row.pertanian, row.utp),
        ]);
      });
    grafikAoa.push([]);

    grafikAoa.push(["GRAFIK 3 - KOMPOSISI NON PERTANIAN VS PERTANIAN PER KECAMATAN"]);
    grafikAoa.push(["Kecamatan", "Non Pertanian", "Pertanian", "Total", "% Non Pertanian", "% Pertanian", "Grafik Non Pertanian"]);
    [...kecamatanAgg]
      .sort((a, b) => b.nonPertanian + b.pertanian - (a.nonPertanian + a.pertanian))
      .forEach((row) => {
        const total = row.nonPertanian + row.pertanian;
        grafikAoa.push([
          row.kecamatan,
          row.nonPertanian,
          row.pertanian,
          total,
          pct(row.nonPertanian, total),
          pct(row.pertanian, total),
          bar(row.nonPertanian, total, 20),
        ]);
      });
    grafikAoa.push([]);

    const kurangNon = kecamatanAgg.filter((row) => row.prelistUsaha > 0 && row.nonPertanian < row.prelistUsaha);
    const kurangTani = kecamatanAgg.filter((row) => row.utp > 0 && row.pertanian < row.utp);
    const topNon = [...kecamatanAgg].sort((a, b) => pct(b.nonPertanian, b.prelistUsaha) - pct(a.nonPertanian, a.prelistUsaha))[0];
    const bottomNon = [...kecamatanAgg]
      .filter((row) => row.prelistUsaha > 0)
      .sort((a, b) => pct(a.nonPertanian, a.prelistUsaha) - pct(b.nonPertanian, b.prelistUsaha))[0];
    const topTani = [...kecamatanAgg].sort((a, b) => pct(b.pertanian, b.utp) - pct(a.pertanian, a.utp))[0];
    const bottomTani = [...kecamatanAgg]
      .filter((row) => row.utp > 0)
      .sort((a, b) => pct(a.pertanian, a.utp) - pct(b.pertanian, b.utp))[0];

    grafikAoa.push(["ANALISIS"]);
    grafikAoa.push([
      `1. Cakupan pendataan: ${totalDidata.toLocaleString("id-ID")} dari ${totalPrelistAwal.toLocaleString("id-ID")} Prelist Awal (${pct(totalDidata, totalPrelistAwal)}%) - ${statusOf(totalDidata, totalPrelistAwal)}.`,
    ]);
    grafikAoa.push([
      `2. Usaha Non Pertanian tercatat ${totalNonPertanian.toLocaleString("id-ID")}, setara ${pct(totalNonPertanian, totalPrelistUsaha)}% Prelist Usaha dan ${pct(totalNonPertanian, totalWilkerstat)}% Usaha Wilkerstat.`,
    ]);
    grafikAoa.push([
      `3. Usaha Pertanian tercatat ${totalPertanian.toLocaleString("id-ID")}, setara ${pct(totalPertanian, totalUtp)}% UTP ST2023 (selisih ${(totalPertanian - totalUtp).toLocaleString("id-ID")}).`,
    ]);
    grafikAoa.push([
      `4. Komposisi hasil pendataan: ${pct(totalNonPertanian, totalNonPertanian + totalPertanian)}% non pertanian dan ${pct(totalPertanian, totalNonPertanian + totalPertanian)}% pertanian.`,
    ]);
    grafikAoa.push([
      `5. Kecamatan capaian non pertanian tertinggi: ${topNon ? `${topNon.kecamatan} (${pct(topNon.nonPertanian, topNon.prelistUsaha)}%)` : "-"}; terendah: ${bottomNon ? `${bottomNon.kecamatan} (${pct(bottomNon.nonPertanian, bottomNon.prelistUsaha)}%)` : "-"}.`,
    ]);
    grafikAoa.push([
      `6. Kecamatan capaian pertanian tertinggi: ${topTani ? `${topTani.kecamatan} (${pct(topTani.pertanian, topTani.utp)}%)` : "-"}; terendah: ${bottomTani ? `${bottomTani.kecamatan} (${pct(bottomTani.pertanian, bottomTani.utp)}%)` : "-"}.`,
    ]);
    grafikAoa.push([
      `7. ${kurangNon.length} kecamatan masih KURANG dibanding Prelist Usaha dan ${kurangTani.length} kecamatan masih KURANG dibanding UTP ST2023 - prioritaskan penyisiran ulang di wilayah tersebut.`,
    ]);
    grafikAoa.push([
      `8. Cakupan wilayah: ${kecamatanAgg.length} kecamatan, ${wilayahRows.length} desa/kelurahan, ${sumBy((row) => row.jumlahSls).toLocaleString("id-ID")} SLS/RT.`,
    ]);

    const grafikSheet = XLSX.utils.aoa_to_sheet(grafikAoa);
    grafikSheet["!cols"] = [{ wch: 46 }, { wch: 20 }, { wch: 34 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, grafikSheet, "Grafik");

    XLSX.writeFile(workbook, `proporsi-usaha-${proporsiExportMode}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const usahaKondisiSummary = useMemo(() => {
    const totalPerusahaanPrelist = filteredUsahaPerusahaanRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
    const totalPerusahaanFound = filteredUsahaPerusahaanRows.reduce((sum, row) => sum + parseNumericValue(row.ditemukan_plus_baru), 0);
    const totalKeluargaPrelist = filteredUsahaKeluargaRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
    const totalKeluargaFound = filteredUsahaKeluargaRows.reduce((sum, row) => sum + parseNumericValue(row.ditemukan_plus_baru), 0);
    const combinedPrelist = totalPerusahaanPrelist + totalKeluargaPrelist;
    const combinedFound = totalPerusahaanFound + totalKeluargaFound;
    return {
      totalPerusahaanPrelist,
      totalPerusahaanFound,
      totalKeluargaPrelist,
      totalKeluargaFound,
      combinedPrelist,
      combinedFound,
      combinedPercent: combinedPrelist > 0 ? (combinedFound / combinedPrelist) * 100 : 0,
    };
  }, [filteredUsahaPerusahaanRows, filteredUsahaKeluargaRows]);

  useEffect(() => {
    setUsahaKondisiPerusahaanCurrentPage(1);
  }, [filteredUsahaPerusahaanRows.length, usahaItemsPerPage]);

  useEffect(() => {
    setUsahaKondisiKeluargaCurrentPage(1);
  }, [filteredUsahaKeluargaRows.length, usahaItemsPerPage]);

  useEffect(() => {
    setUsahaProporsiCurrentPage(1);
  }, [filteredUsahaProporsiRows.length, usahaItemsPerPage]);

  const umkmKecamatanOptions = useMemo(() => {
    const values = new Set<string>();
    [...pplRows, ...pmlRows].forEach((row) => {
      const rawKec = String(row.kecamatan || "").trim();
      if (!rawKec) return;
      rawKec.split(/,|\n/).map((part) => part.trim()).filter(Boolean).forEach((value) => values.add(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "id"));
  }, [pplRows, pmlRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let rows = pplRows;
    if (normalizedSearch) {
      rows = rows.filter((row) =>
        row.nama_ppl.toLowerCase().includes(normalizedSearch) ||
        row.kecamatan.toLowerCase().includes(normalizedSearch) ||
        row.matchingKeys.toLowerCase().includes(normalizedSearch)
      );
    }
    if (umkmKecamatanFilter !== "all") {
      const selected = umkmKecamatanFilter.toLowerCase();
      rows = rows.filter((row) => {
        const values = String(row.kecamatan || "")
          .split(/,|\n/)
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean);
        return values.includes(selected);
      });
    }

    if (umkmAfirmasiFilter !== "all") {
      const targetEmails = umkmAfirmasiFilter === "ratih" ? afirmasiEmailSets.ratih : afirmasiEmailSets.ledya;
      rows = rows.filter((row) => {
        const email = pplEmailByName.get(String(row.nama_ppl).trim().toLowerCase()) || "";
        const normalizedName = normalizeString(String(row.nama_ppl || ''))
          .replace(/[^a-z0-9\s]/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        const nameMatches = umkmAfirmasiFilter === "ratih" ? afirmasiNameSets.ratih.has(normalizedName) : afirmasiNameSets.ledya.has(normalizedName);
        return (email && targetEmails.has(email)) || nameMatches;
      });
    }

    const compareValue = (a: PPLRow, b: PPLRow) => {
      const getValue = (row: PPLRow) => {
        switch (sortBy) {
          case "nama_ppl":
          case "kecamatan":
          case "matchingKeys":
            return String(row[sortBy]).toLowerCase();
          case "prelist_awal":
          case "prelist_wilkerstat":
          case "responden_didata":
          case "draft":
          case "didata_netto":
            return parseNumericValue(row[sortBy]);
          case "persentase_responden_didata":
          case "persentase_draft":
          case "persentase_wilkerstat":
          case "persentase_didata_netto":
            return Number(String(row[sortBy]).replace(/[^0-9.-]/g, "")) || 0;
          default:
            return String(row[sortBy]).toLowerCase();
        }
      };

      const valueA = getValue(a);
      const valueB = getValue(b);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      return sortOrder === "asc"
        ? String(valueA).localeCompare(String(valueB), "id")
        : String(valueB).localeCompare(String(valueA), "id");
    };

    return [...rows].sort(compareValue);
  }, [pplRows, searchTerm, sortBy, sortOrder, umkmKecamatanFilter, umkmAfirmasiFilter, afirmasiEmailSets, pplEmailByName]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRows, itemsPerPage]);


  const progressHeaderDisplay = progresHeaderData?.[0] ? extractProgressHeader(progresHeaderData[0]) : "";
  const { daysElapsed } = calculateDayProgress();
  const daysElapsedTer1 = calculateDayProgress(new Date(2026, 6, 15)).daysElapsed;
  const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);

  const overallTotalPrelist = pplRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
  const overallTotalResponden = pplRows.reduce((sum, row) => sum + parseNumericValue(row.responden_didata), 0);
  const overallTotalStatus = Array.from(monitoringProgressMap.values()).reduce((sum, item) => sum + item.totalStatus, 0) || overallTotalResponden;
  const averageMajalengka = overallTotalPrelist > 0 ? (overallTotalResponden / overallTotalPrelist) * 100 : 0;

  const umkmTotalDidataNetto = useMemo(() => {
    const totalDidataNetto = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.didata_netto), 0);
    const totalPrelist = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
    return totalPrelist > 0 ? (totalDidataNetto / totalPrelist) * 100 : 0;
  }, [filteredRows]);

  // PML filtering and sorting
  const filteredPmlRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let rows = pmlRows;
    if (normalizedSearch) {
      rows = rows.filter((row) =>
        row.nama_pml.toLowerCase().includes(normalizedSearch) ||
        row.kecamatan.toLowerCase().includes(normalizedSearch)
      );
    }
    if (umkmKecamatanFilter !== "all") {
      const selected = umkmKecamatanFilter.toLowerCase();
      rows = rows.filter((row) => {
        const values = String(row.kecamatan || "")
          .split(/,|\n/)
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean);
        return values.includes(selected);
      });
    }

    const compareValue = (a: PMLRow, b: PMLRow) => {
      const getValue = (row: PMLRow) => {
        switch (pmlSortBy) {
          case "nama_pml":
          case "kecamatan":
            return String(row[pmlSortBy]).toLowerCase();
          case "prelist_wilkerstat":
          case "prelist_awal":
          case "responden_didata":
          case "draft":
          case "didata_netto":
            return parseNumericValue(row[pmlSortBy]);
          case "persentase_responden_didata":
          case "persentase_draft":
          case "persentase_wilkerstat":
          case "persentase_didata_netto":
            return parsePercentage(row[pmlSortBy]);
          default:
            return String(row[pmlSortBy]).toLowerCase();
        }
      };

      const valueA = getValue(a);
      const valueB = getValue(b);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return pmlSortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      return pmlSortOrder === "asc"
        ? String(valueA).localeCompare(String(valueB), "id")
        : String(valueB).localeCompare(String(valueA), "id");
    };

    return [...rows].sort(compareValue);
  }, [pmlRows, searchTerm, pmlSortBy, pmlSortOrder, umkmKecamatanFilter]);

  const pmlTotalPages = Math.max(1, Math.ceil(filteredPmlRows.length / pmlItemsPerPage));
  const pmlPaginatedRows = useMemo(() => {
    const startIndex = (pmlCurrentPage - 1) * pmlItemsPerPage;
    return filteredPmlRows.slice(startIndex, startIndex + pmlItemsPerPage);
  }, [filteredPmlRows, pmlCurrentPage, pmlItemsPerPage]);

  useEffect(() => {
    setPmlCurrentPage(1);
  }, [filteredPmlRows, pmlItemsPerPage]);

  // Dashboard stats from PML data
  const pmlStats = useMemo(() => {
    if (pmlRows.length === 0) {
      return {
        totalPml: 0,
        totalPrelist: 0,
        totalResponden: 0,
        averageResponden: 0,
        topPml: { nama_pml: "-", value: 0 },
        lowestPml: { nama_pml: "-", value: 0 },
      };
    }

    const totalPrelist = pmlRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
    const totalResponden = pmlRows.reduce((sum, row) => sum + parseNumericValue(row.responden_didata), 0);
    const averageResponden = totalPrelist > 0 ? (totalResponden / totalPrelist) * 100 : 0;

    const topPml = pmlRows.reduce((max, row) => {
      const pctResponden = parsePercentage(row.persentase_responden_didata);
      const maxPct = parsePercentage(max.persentase_responden_didata);
      return pctResponden > maxPct ? row : max;
    });

    const lowestPml = pmlRows.reduce((min, row) => {
      const pctResponden = parsePercentage(row.persentase_responden_didata);
      const minPct = parsePercentage(min.persentase_responden_didata);
      return pctResponden < minPct ? row : min;
    });

    return {
      totalPml: pmlRows.length,
      totalPrelist,
      totalResponden,
      averageResponden,
      topPml: { nama_pml: topPml.nama_pml, value: parsePercentage(topPml.persentase_responden_didata) },
      lowestPml: { nama_pml: lowestPml.nama_pml, value: parsePercentage(lowestPml.persentase_responden_didata) },
    };
  }, [pmlRows]);

  const transitionRows = useMemo(() => {
    const targetThreshold = getTargetMinimalPercentage(daysElapsed);

    return pplRows
      .map((row) => {
        const prelistAwal = parseNumericValue(row.prelist_awal);
        const respondenDidata = parseNumericValue(row.responden_didata);
        const draft = parseNumericValue(row.draft);
        const capaian = prelistAwal > 0 ? (respondenDidata / prelistAwal) * 100 : 0;
        const delta = capaian - targetThreshold;

        let status = "Tertinggal";
        let statusClasses = "bg-rose-50 text-rose-700 border-rose-200";

        if (delta >= 0) {
          status = "Sesuai Target";
          statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
        } else if (delta >= -5) {
          status = "Tertinggal Tipis";
          statusClasses = "bg-amber-50 text-amber-700 border-amber-200";
        }

        return {
          id: row.id,
          nama_ppl: row.nama_ppl,
          kecamatan: row.kecamatan,
          prelist_awal: prelistAwal,
          responden_didata: respondenDidata,
          draft,
          totalStatus: draft + respondenDidata,
          didata: respondenDidata,
          capaian,
          delta,
          status,
          statusClasses,
        };
      })
      .sort((a, b) => b.capaian - a.capaian);
  }, [pplRows, daysElapsed]);

  const capaianRows = useMemo(() => {
    const debugEntries: any[] = [];
    const monitoringKeys = Array.from(monitoringProgressMap.keys());
    const result = transitionRows.map((row, index) => {
      const normalizedName = normalizePersonKey(row.nama_ppl);
      const normalizedKec = normalizeKecamatanKey(row.kecamatan);
      const key = `${normalizedKec}|${normalizedName}`;

      // robust monitoring lookup: prefer normalized exact key, but if it has zero totalStatus,
      // prefer any non-zero value from raw map or by-name unique map.
      let monitoring = monitoringProgressMap.get(key);
      let monitoringSource: string | null = monitoring ? "normalized" : null;

      // If normalized entry exists but has zero totalStatus, check other fallbacks for non-zero
      if (monitoring && Number(monitoring.totalStatus) === 0) {
        const rawKey = `${String(row.kecamatan || "").trim().toLowerCase()}|${String(row.nama_ppl || "").trim().toLowerCase()}`;
        const rawMonitoring = monitoringProgressRawMap.get(rawKey);
        if (rawMonitoring && Number(rawMonitoring.totalStatus) > 0) {
          monitoring = rawMonitoring;
          monitoringSource = "raw (preferred over zero normalized)";
        } else {
          const byName = monitoringProgressByName.get(normalizedName);
          if (byName && Number(byName.totalStatus) > 0) {
            monitoring = byName;
            monitoringSource = "byName (preferred over zero normalized)";
          }
        }
      }

      if (!monitoring) {
        // try to find an entry by normalized name + kecamatan in the progress map
        for (const [mkey, val] of monitoringProgressMap.entries()) {
          const parts = mkey.split("|");
          const mKec = parts.length > 0 ? parts[0] : "";
          const mName = parts.length > 1 ? parts[1] : "";
          if (mKec === normalizedKec && mName === normalizedName) {
            monitoring = val;
            monitoringSource = "normalized-loop";
            break;
          }
        }
      }

      if (!monitoring) {
        // try raw key fallback (exact kecamatan/name lowercased)
        const rawKey = `${String(row.kecamatan || "").trim().toLowerCase()}|${String(row.nama_ppl || "").trim().toLowerCase()}`;
        monitoring = monitoringProgressRawMap.get(rawKey) || monitoringProgressByName.get(normalizedName) || null;
        if (monitoring && !monitoringSource) {
          monitoringSource = monitoringProgressRawMap.has(rawKey) ? "raw" : monitoringProgressByName.has(normalizedName) ? "byName" : monitoringSource;
        }
      }

      const prelist = parseNumericValue(row.prelist_awal);
      const termin = monitoring ? Number(monitoring.totalStatus) : 0; // Termin-1 (15 Juli 2026)
      const now = parseNumericValue(row.didata); // Saat Ini

      const terminPct = prelist > 0 ? (termin / prelist) * 100 : 0;
      const nowPct = prelist > 0 ? (now / prelist) * 100 : 0;
      const pctChange = nowPct - terminPct; // percent point change
      const absChange = now - termin; // absolute change in counts

      const { daysElapsed } = calculateDayProgress();
      const { daysElapsed: daysElapsedTer1 } = calculateDayProgress(new Date(2026, 6, 15));
      const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);
      const averagePerDay = daysElapsedTer1 > 0 ? absChange / daysElapsedTer1 : 0;

      // Status logic based on average daily activity after termin-1
      let status = "Tidak Ada Data";
      if (prelist <= 0) {
        status = "Tanpa Prelist";
      } else if (averagePerDay > 7) {
        status = "Meningkat Tajam";
      } else if (averagePerDay >= 4) {
        status = "Meningkat";
      } else {
        status = "Perlu Perhatian";
      }

      const statusDetail = prelist <= 0
        ? "Tanpa prelist tersedia"
        : `Rata-rata aktivitas setelah termin-1 s.d. hari ke-${daysElapsedTer1} • ${averagePerDay >= 0 ? "+" : ""}${averagePerDay.toFixed(1)}/hari`;
      const statusLabel = status;

      const out = {
        ...row,
        prelist_awal: prelist,
        totalStatus: termin,
        didata: now,
        delta: absChange,
        deltaPct: pctChange,
        status: statusLabel,
        statusDetail,
      };

      const nameCount = monitoringKeys.filter((k) => {
        const parts = k.split("|");
        const n = parts.length > 1 ? parts[1] : parts[0];
        return n === normalizedName;
      }).length;

      debugEntries.push({
        index,
        key,
        normalizedName,
        normalizedKec,
        monitoringFound: !!monitoring,
        monitoringValue: monitoring ? monitoring.totalStatus : 0,
        monitoringSource,
        byNameFound: monitoringProgressByName.has(normalizedName),
        nameCount,
        prelist,
        now,
        termin: termin,
      });

      return out;
    });

    const zeroCount = result.filter((r) => Number(r.totalStatus) === 0).length;
    // build unmatched list once and reuse for details (fix empty unmatchedDetails)
    const unmatchedList: any[] = [];
    try {
      (transitionRows || []).forEach((row: any) => {
        const normalizedName = normalizePersonKey(row.nama_ppl);
        const normalizedKec = normalizeKecamatanKey(row.kecamatan);
        const key = `${normalizedKec}|${normalizedName}`;
        const rawKey = `${String(row.kecamatan || "").trim().toLowerCase()}|${String(row.nama_ppl || "").trim().toLowerCase()}`;
        const m1 = monitoringProgressMap.get(key);
        const m2 = monitoringProgressRawMap.get(rawKey);
        const m3 = monitoringProgressByName.get(normalizedName);
        if (!m1 && !m2 && !m3) {
          unmatchedList.push({ key, rawKey, normalizedName, normalizedKec, prelist: parseNumericValue(row.prelist_awal), didata: parseNumericValue(row.didata) });
        }
      });
    } catch (e) {
      // ignore
    }

    const findCandidates = (normalizedName: string, rawKey: string) => {
      const candidates: any = { normalized: [], raw: [], byName: null };
      for (const [mkey, val] of monitoringProgressMap.entries()) {
        const parts = mkey.split("|");
        const mName = parts.length > 1 ? parts[1] : parts[0];
        if (mName === normalizedName) {
          candidates.normalized.push({ key: mkey, value: val });
          if (candidates.normalized.length >= 6) break;
        }
      }
      for (const [rkey, val] of monitoringProgressRawMap.entries()) {
        if (rkey.includes(normalizedName) || rkey.includes(rawKey) || rkey.includes(normalizedName.replace(/\s+/g, ""))) {
          candidates.raw.push({ key: rkey, value: val });
          if (candidates.raw.length >= 6) break;
        }
      }
      if (monitoringProgressByName.has(normalizedName)) {
        candidates.byName = monitoringProgressByName.get(normalizedName);
      }
      return candidates;
    };

    const unmatchedDetails = unmatchedList.map((u) => {
      const rawKey = String(u.rawKey || "").toLowerCase();
      const normalizedName = String(u.normalizedName || "").toLowerCase();
      return {
        key: u.key,
        rawKey: u.rawKey,
        normalizedName: u.normalizedName,
        prelist: u.prelist,
        didata: u.didata,
        candidates: findCandidates(normalizedName, rawKey),
      };
    });

    // populate debugRef for UI consumption
    debugRef.current = {
      sizes: { monitoringProgressMap: monitoringProgressMap.size, monitoringProgressRawMap: monitoringProgressRawMap.size, monitoringProgressByName: monitoringProgressByName.size },
      zeroEntries: debugEntries.slice(0, 100),
      zeroCount,
      unmatched: unmatchedList,
      unmatchedDetails,
    };
    if (zeroCount > 0) {
      // also log to console for developers
      // eslint-disable-next-line no-console
      console.log("Monitoring mapping sizes:", debugRef.current.sizes);
      // eslint-disable-next-line no-console
      console.log("Monitoring mapping debug (first 50):", debugRef.current.zeroEntries);
      // eslint-disable-next-line no-console
      console.log(`Monitoring mapping: ${zeroCount} rows have Termin-1 = 0`);
    }

    return result;
  }, [transitionRows, monitoringProgressMap, monitoringProgressByName]);

  const capaianKecamatanOptions = useMemo(() => {
    const values = new Set<string>();
    capaianRows.forEach((row) => {
      const rawKec = String(row.kecamatan || "").trim();
      if (!rawKec) return;
      rawKec.split(/,|\n/).map((part) => part.trim()).filter(Boolean).forEach((value) => values.add(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "id"));
  }, [capaianRows]);

  const capaianFilteredRows = useMemo(() => {
    const normalizedSearch = capaianSearchTerm.trim().toLowerCase();
    let rows = capaianRows;

    if (normalizedSearch) {
      rows = rows.filter((row) =>
        row.nama_ppl.toLowerCase().includes(normalizedSearch) ||
        row.kecamatan.toLowerCase().includes(normalizedSearch)
      );
    }

    if (capaianKecamatanFilter !== "all") {
      const selected = capaianKecamatanFilter.toLowerCase();
      rows = rows.filter((row) => {
        const values = String(row.kecamatan || "")
          .split(/,|\n/)
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean);
        return values.includes(selected);
      });
    }

    const compareValue = (a: any, b: any) => {
      const getValue = (row: any) => {
        switch (capaianSortBy) {
          case "nama_ppl":
          case "kecamatan":
          case "status":
            return String(row[capaianSortBy]).toLowerCase();
          case "prelist_awal":
          case "delta":
          case "totalStatus":
          case "didata":
            return Number(row[capaianSortBy]) || 0;
          default:
            return String(row[capaianSortBy]).toLowerCase();
        }
      };

      const valueA = getValue(a);
      const valueB = getValue(b);
      if (typeof valueA === "number" && typeof valueB === "number") {
        return capaianSortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }
      return capaianSortOrder === "asc"
        ? String(valueA).localeCompare(String(valueB), "id")
        : String(valueB).localeCompare(String(valueA), "id");
    };

    return [...rows].sort(compareValue);
  }, [capaianRows, capaianSearchTerm, capaianKecamatanFilter, capaianSortBy, capaianSortOrder]);

  const capaianTotalPages = Math.max(1, Math.ceil(capaianFilteredRows.length / capaianItemsPerPage));
  const capaianPaginatedRows = useMemo(() => {
    const startIndex = (capaianCurrentPage - 1) * capaianItemsPerPage;
    return capaianFilteredRows.slice(startIndex, startIndex + capaianItemsPerPage);
  }, [capaianFilteredRows, capaianCurrentPage, capaianItemsPerPage]);

  useEffect(() => {
    setCapaianCurrentPage(1);
  }, [capaianFilteredRows.length, capaianItemsPerPage]);

  // Chart display controls
  const [chartKecamatanFilter, setChartKecamatanFilter] = useState<string>("all");
  const [chartSortOrder, setChartSortOrder] = useState<"asc" | "desc">("desc");
  const [chartSortBy, setChartSortBy] = useState<"prelist" | "netto" | "wilkerstat">("prelist");
  const [chartFontSize, setChartFontSize] = useState<number>(12);
  const [chartMode, setChartMode] = useState<"legacy" | "combined">("legacy");
  const [chartRespondenDivisor, setChartRespondenDivisor] = useState<"prelist" | "wilkerstat" | "netto">("netto");
  const [chartNonPertanianDivisor, setChartNonPertanianDivisor] = useState<"prelist" | "wilkerstat">("prelist");
  const [chartProporsiSortBy, setChartProporsiSortBy] = useState<"prelist" | "wilkerstat">("prelist");

  useEffect(() => {
    // Reset sorting choices when switching chart modes to keep UI predictable
    if (chartMode !== "combined") {
      setChartSortBy("prelist");
      setChartSortOrder("desc");
      setChartProporsiSortBy("prelist");
    }
  }, [chartMode]);

  const VerticalInsideLabel = (props: any) => {
    const { x, y, width, height, value, fill = "#000", fontSize = 12 } = props;
    if (value === undefined || value === null) return null;
    const cx = (x ?? 0) + (width ?? 0) / 2;
    const cy = (y ?? 0) + (height ?? 0) / 2;
    const text = typeof value === "number" ? `${value.toFixed(2)}%` : String(value);
    return (
      <text
        x={cx}
        y={cy}
        transform={`rotate(-90 ${cx} ${cy})`}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={fill}
        style={{ fontSize, fontWeight: 700 }}
      >
        {text}
      </text>
    );
  };

  // Always enable fetching keluarga summary so dashboard chart can render data
  const { data: keluargaDashboardSummary = [], isLoading: keluargaDashboardLoading } = useKeluargaDashboardSummary(true);

  useEffect(() => {
    try {
      // Debug: log when keluarga summary is loaded so developer can inspect in browser console
      console.debug("keluargaDashboardSummary loaded", {
        length: Array.isArray(keluargaDashboardSummary) ? keluargaDashboardSummary.length : 0,
        sample: Array.isArray(keluargaDashboardSummary) && keluargaDashboardSummary.length > 0 ? keluargaDashboardSummary[0] : null,
      });
    } catch (e) {
      // ignore
    }
  }, [keluargaDashboardSummary]);

  const keluargaDashboardData = useMemo(() => {
    // Prefer the processed KELUARGA summary (already aggregates and parses Prelist Awal / Total Hasil)
    if (keluargaDashboardSummary && Array.isArray(keluargaDashboardSummary) && keluargaDashboardSummary.length > 0) {
      const desaRows = keluargaDashboardSummary.map((row: any) => ({
        kecamatan: row.kecamatan,
        desa: row.desa,
        prelistAwal: Number(row.prelistAwal) || 0,
        totalHasil: Number(row.totalHasil) || 0,
        persentasePemutakhiran: Number(row.persentasePemutakhiran) || 0,
        label: row.desa === "-" ? row.kecamatan : row.desa,
      }));

      const kecMap = new Map<string, { kecamatan: string; prelist: number; totalHasil: number }>();
      desaRows.forEach((d: any) => {
        const existing = kecMap.get(d.kecamatan) || { kecamatan: d.kecamatan, prelist: 0, totalHasil: 0 };
        existing.prelist += d.prelistAwal;
        existing.totalHasil += d.totalHasil;
        kecMap.set(d.kecamatan, existing);
      });

      const keluargaKecamatanStats = Array.from(kecMap.values()).map((item) => ({
        kecamatan: item.kecamatan,
        desa: "-",
        prelistAwal: item.prelist,
        totalHasil: item.totalHasil,
        persentasePemutakhiran: item.prelist > 0 ? parseFloat(((item.totalHasil / item.prelist) * 100).toFixed(2)) : 0,
        label: item.kecamatan,
      }));

      const rows = chartKecamatanFilter === "all"
        ? keluargaKecamatanStats
        : desaRows.filter((row: any) => String(row.kecamatan ?? "").trim().toLowerCase() === String(chartKecamatanFilter ?? "").trim().toLowerCase());

      return [...rows]
        .map((row: any) => ({
          label: row.label,
          kecamatan: row.kecamatan,
          desa: row.desa,
          prelistAwal: row.prelistAwal,
          totalHasil: row.totalHasil,
          persentasePemutakhiran: row.persentasePemutakhiran,
        }))
        .sort((a: any, b: any) => (chartSortOrder === "asc" ? a.persentasePemutakhiran - b.persentasePemutakhiran : b.persentasePemutakhiran - a.persentasePemutakhiran));
    }

    // Fallback: attempt to build from progresData + stackingData (legacy)
    const keluargaDesaStats = (() => {
      const progressTotals = new Map<string, { prelist: number; totalHasil: number }>();
      (progresData || []).forEach((row: any) => {
        const key = normalizeSheetKey(getSheetCellText(row, 0));
        if (!key) return;
        const rawPre = getSheetCellText(row, 2);
        const rawTotal = getSheetCellText(row, 16);
        const parsedPre = parseNumericValue(rawPre);
        const parsedTotal = parseNumericValue(rawTotal);
        const existing = progressTotals.get(key) || { prelist: 0, totalHasil: 0 };
        existing.prelist += parsedPre;
        existing.totalHasil += parsedTotal;
        progressTotals.set(key, existing);
      });

      const seenKeys = new Set<string>();
      const desaMap = new Map<string, { kecamatan: string; desa: string; prelist: number; totalHasil: number }>();

      (stackingData || []).forEach((row: any) => {
        const key = normalizeSheetKey(getSheetCellText(row, 3));
        if (!key || seenKeys.has(key)) return;
        seenKeys.add(key);
        const kecamatan = toProperCase(getSheetCellText(row, 12));
        const desa = toProperCase(getSheetCellText(row, 14)) || "-";
        if (!kecamatan) return;
        const totals = progressTotals.get(key) || { prelist: 0, totalHasil: 0 };
        const mapKey = `${kecamatan}||${desa}`;
        const existing = desaMap.get(mapKey) || { kecamatan, desa, prelist: 0, totalHasil: 0 };
        existing.prelist += totals.prelist;
        existing.totalHasil += totals.totalHasil;
        desaMap.set(mapKey, existing);
      });

      return Array.from(desaMap.values()).map((item) => ({
        kecamatan: item.kecamatan,
        desa: item.desa,
        prelistAwal: item.prelist,
        totalHasil: item.totalHasil,
        persentasePemutakhiran: item.prelist > 0 ? parseFloat(((item.totalHasil / item.prelist) * 100).toFixed(2)) : 0,
        label: item.desa,
      }));
    })();

    const keluargaKecamatanStats = (() => {
      const map = new Map<string, { kecamatan: string; prelist: number; totalHasil: number }>();
      keluargaDesaStats.forEach((d: any) => {
        const existing = map.get(d.kecamatan) || { kecamatan: d.kecamatan, prelist: 0, totalHasil: 0 };
        existing.prelist += d.prelistAwal;
        existing.totalHasil += d.totalHasil;
        map.set(d.kecamatan, existing);
      });
      return Array.from(map.values()).map((item) => ({
        kecamatan: item.kecamatan,
        desa: "-",
        prelistAwal: item.prelist,
        totalHasil: item.totalHasil,
        persentasePemutakhiran: item.prelist > 0 ? parseFloat(((item.totalHasil / item.prelist) * 100).toFixed(2)) : 0,
        label: item.kecamatan,
      }));
    })();

    const rows = chartKecamatanFilter === "all"
      ? keluargaKecamatanStats
      : keluargaDesaStats.filter((row: any) => String(row.kecamatan ?? "").trim().toLowerCase() === String(chartKecamatanFilter ?? "").trim().toLowerCase());

    return [...rows]
      .map((row: any) => ({
        label: row.label,
        kecamatan: row.kecamatan,
        desa: row.desa,
        prelistAwal: row.prelistAwal,
        totalHasil: row.totalHasil,
        persentasePemutakhiran: row.persentasePemutakhiran,
      }))
      .sort((a: any, b: any) => (chartSortOrder === "asc" ? a.persentasePemutakhiran - b.persentasePemutakhiran : b.persentasePemutakhiran - a.persentasePemutakhiran));
  }, [chartKecamatanFilter, chartSortOrder, keluargaDashboardSummary, stackingData, progresData]);

  const keluargaDashboardAverage = keluargaDashboardData.length > 0
    ? keluargaDashboardData.reduce((total, row: any) => total + row.persentasePemutakhiran, 0) / keluargaDashboardData.length
    : 0;

  // Kecamatan data for chart
  const kecamatanStats = useMemo(() => {
    const kecamatanMap = new Map<string, { prelist: number; responden: number; wilkerstat: number; didata: number }>();

    pmlRows.forEach((row) => {
      const kecamatan = row.kecamatan || "Unknown";
      const existing = kecamatanMap.get(kecamatan) || { prelist: 0, responden: 0, wilkerstat: 0, didata: 0 };
      existing.prelist += parseNumericValue(row.prelist_awal);
      existing.responden += parseNumericValue(row.responden_didata);
      existing.wilkerstat += parseNumericValue(row.prelist_wilkerstat);
      existing.didata += parseNumericValue(row.didata_netto);
      kecamatanMap.set(kecamatan, existing);
    });

    return Array.from(kecamatanMap.entries())
      .map(([kecamatan, data]) => ({
        kecamatan,
        prelistAwal: data.prelist,
        respondenDidata: data.responden,
        wilkerstat: data.wilkerstat,
        didataNetto: data.didata,
        persentase: data.prelist > 0 ? parseFloat(((data.responden / data.prelist) * 100).toFixed(2)) : 0,
        persentaseWilkerstat: data.wilkerstat > 0 ? parseFloat(((data.responden / data.wilkerstat) * 100).toFixed(2)) : 0,
        persentaseDidataNetto: data.prelist > 0 ? parseFloat(((data.didata / data.prelist) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.persentase - a.persentase);
  }, [pmlRows]);

  // Desa/Kelurahan level data for chart drill-down
  const desaStats = useMemo(() => {
    const progressTotals = new Map<string, { prelist: number; responden: number; didata: number }>();
    (progresData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 0));
      if (!key) return;
      const existing = progressTotals.get(key) || { prelist: 0, responden: 0, didata: 0 };
      existing.prelist += parseNumericValue(getSheetCellText(row, 2));
      // Kode ini harus membaca kolom Didata dari sumber UMKM dan Sosek / progres pendataan yang benar,
      // bukan kolom yang sebelumnya dipindai secara keliru untuk per-kecamatan drilldown.
      existing.responden += parseNumericValue(getSheetCellText(row, 4));
      // kolom G -> didata netto
      existing.didata += parseNumericValue(getSheetCellText(row, 6));
      progressTotals.set(key, existing);
    });

    const seenKeys = new Set<string>();
    const desaMap = new Map<string, { kecamatan: string; desa: string; prelist: number; responden: number; wilkerstat: number; didata: number }>();

    (stackingData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 3));
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      const kecamatan = toProperCase(getSheetCellText(row, 12));
      const desa = toProperCase(getSheetCellText(row, 14)) || "-";
      if (!kecamatan) return;
      const totals = progressTotals.get(key) || { prelist: 0, responden: 0, didata: 0 };
      const mapKey = `${kecamatan}||${desa}`;
      const existing = desaMap.get(mapKey) || { kecamatan, desa, prelist: 0, responden: 0, wilkerstat: 0, didata: 0 };
      existing.prelist += totals.prelist;
      existing.responden += totals.responden;
      existing.didata += totals.didata;
      // Wilkerstat pada grafik responden mengikuti kolom "Wilkerstat" tabel UMKM dan Sosek (jumlah muatan)
      existing.wilkerstat += parseNumericValue(getSheetCellText(row, 24));
      desaMap.set(mapKey, existing);
    });

    return Array.from(desaMap.values()).map((item) => ({
      kecamatan: item.kecamatan,
      desa: item.desa,
      prelistAwal: item.prelist,
      respondenDidata: item.responden,
      wilkerstat: item.wilkerstat,
      didataNetto: item.didata,
      persentase: item.prelist > 0 ? parseFloat(((item.responden / item.prelist) * 100).toFixed(2)) : 0,
      persentaseWilkerstat: item.wilkerstat > 0 ? parseFloat(((item.responden / item.wilkerstat) * 100).toFixed(2)) : 0,
      persentaseDidataNetto: item.prelist > 0 ? parseFloat(((item.didata / item.prelist) * 100).toFixed(2)) : 0,
    }));
  }, [stackingData, progresData]);

  const proporsiKeyToDesa = useMemo(() => {
    const lookup = new Map<string, string>();
    (stackingData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 3));
      if (!key) return;
      const desa = toProperCase(getSheetCellText(row, 14)) || "-";
      if (!lookup.has(key)) lookup.set(key, desa);
    });
    return lookup;
  }, [stackingData]);

  const proporsiKecamatanStats = useMemo(() => {
    const groups = new Map<string, { kecamatan: string; prelist: number; nonPertanian: number; pertanian: number; utp: number; usahaWilkerstat: number }>();

    (usahaProporsiRows || []).forEach((row) => {
      const kecamatan = row.kecamatan || "-";
      const existing = groups.get(kecamatan) || { kecamatan, prelist: 0, nonPertanian: 0, pertanian: 0, utp: 0, usahaWilkerstat: 0 };
      existing.prelist += parseNumericValue(row.prelist_usaha);
      existing.nonPertanian += getJumlahUsahaNonPertanian(row);
      existing.pertanian += getJumlahUsahaPertanian(row);
      existing.utp += parseNumericValue(row.utp_subsektor_st2023);
      existing.usahaWilkerstat += parseNumericValue(row.bku_usaha_wilkerstat_baru);
      groups.set(kecamatan, existing);
    });

    return Array.from(groups.values()).map((item) => ({
      kecamatan: item.kecamatan,
      desa: "-",
      prelistUsaha: item.prelist,
      nonPertanian: item.nonPertanian,
      pertanian: item.pertanian,
      utpSt2023: item.utp,
      usahaWilkerstat: item.usahaWilkerstat,
      persenNonPertanianPrelist: item.prelist > 0 ? parseFloat(((item.nonPertanian / item.prelist) * 100).toFixed(2)) : 0,
      persenNonPertanianWilkerstat: item.usahaWilkerstat > 0 ? parseFloat(((item.nonPertanian / item.usahaWilkerstat) * 100).toFixed(2)) : 0,
      persenPertanianUtp: item.utp > 0 ? parseFloat(((item.pertanian / item.utp) * 100).toFixed(2)) : 0,
      label: item.kecamatan,
    }));
  }, [usahaProporsiRows]);

  const proporsiDesaStats = useMemo(() => {
    const groups = new Map<string, { kecamatan: string; desa: string; prelist: number; nonPertanian: number; pertanian: number; utp: number; usahaWilkerstat: number }>();

    (usahaProporsiRows || []).forEach((row) => {
      row.children.forEach((detail) => {
        const key = normalizeSheetKey(detail.kode);
        if (!key) return;
        const desa = proporsiKeyToDesa.get(key) || "-";
        const kecamatan = row.kecamatan || "-";
        const mapKey = `${kecamatan}||${desa}`;
        const existing = groups.get(mapKey) || { kecamatan, desa, prelist: 0, nonPertanian: 0, pertanian: 0, utp: 0, usahaWilkerstat: 0 };
        existing.prelist += parseNumericValue(detail.prelist_usaha);
        existing.nonPertanian += getJumlahUsahaNonPertanian(detail);
        existing.pertanian += getJumlahUsahaPertanian(detail);
        existing.utp += parseNumericValue(detail.utp_subsektor_st2023);
        existing.usahaWilkerstat += parseNumericValue(detail.bku_usaha_wilkerstat_baru);
        groups.set(mapKey, existing);
      });
    });

    return Array.from(groups.values()).map((item) => ({
      kecamatan: item.kecamatan,
      desa: item.desa,
      prelistUsaha: item.prelist,
      nonPertanian: item.nonPertanian,
      pertanian: item.pertanian,
      utpSt2023: item.utp,
      usahaWilkerstat: item.usahaWilkerstat,
      persenNonPertanianPrelist: item.prelist > 0 ? parseFloat(((item.nonPertanian / item.prelist) * 100).toFixed(2)) : 0,
      persenNonPertanianWilkerstat: item.usahaWilkerstat > 0 ? parseFloat(((item.nonPertanian / item.usahaWilkerstat) * 100).toFixed(2)) : 0,
      persenPertanianUtp: item.utp > 0 ? parseFloat(((item.pertanian / item.utp) * 100).toFixed(2)) : 0,
      label: item.desa,
    }));
  }, [usahaProporsiRows, proporsiKeyToDesa]);

  const combinedWilayahProporsiNonPertanianChartData = useMemo(() => {
    const rows =
      chartKecamatanFilter === "all"
        ? proporsiKecamatanStats.map((item) => ({ label: item.kecamatan, ...item }))
        : proporsiDesaStats
            .filter((item) => item.kecamatan === chartKecamatanFilter)
            .map((item) => ({ label: item.desa, ...item }));

    const mapped = rows.map((item) => ({
      ...item,
      persenNonPertanianPrelist: item.persenNonPertanianPrelist,
      persenNonPertanianWilkerstat: item.persenNonPertanianWilkerstat,
    }));

    const key = chartProporsiSortBy === "wilkerstat" ? "persenNonPertanianWilkerstat" : "persenNonPertanianPrelist";

    return mapped.sort((a, b) =>
      chartSortOrder === "asc" ? (a as any)[key] - (b as any)[key] : (b as any)[key] - (a as any)[key]
    );
  }, [chartKecamatanFilter, chartSortOrder, proporsiKecamatanStats, proporsiDesaStats, chartProporsiSortBy, chartMode]);

  const legacyWilayahProporsiNonPertanianChartData = useMemo(() => {
    const rows =
      chartKecamatanFilter === "all"
        ? proporsiKecamatanStats.map((item) => ({ label: item.kecamatan, ...item }))
        : proporsiDesaStats
            .filter((item) => item.kecamatan === chartKecamatanFilter)
            .map((item) => ({ label: item.desa, ...item }));

    const withValue = rows.map((item) => ({
      ...item,
      persenNonPertanianAktif:
        chartNonPertanianDivisor === "wilkerstat" ? item.persenNonPertanianWilkerstat : item.persenNonPertanianPrelist,
    }));

    return withValue.sort((a, b) =>
      chartSortOrder === "asc"
        ? a.persenNonPertanianAktif - b.persenNonPertanianAktif
        : b.persenNonPertanianAktif - a.persenNonPertanianAktif
    );
  }, [chartKecamatanFilter, chartSortOrder, chartNonPertanianDivisor, proporsiKecamatanStats, proporsiDesaStats]);

  const wilayahProporsiNonPertanianChartData = chartMode === "legacy" ? legacyWilayahProporsiNonPertanianChartData : combinedWilayahProporsiNonPertanianChartData;

  const wilayahProporsiPertanianChartData = useMemo(() => {
    const rows =
      chartKecamatanFilter === "all"
        ? proporsiKecamatanStats.map((item) => ({ label: item.kecamatan, ...item }))
        : proporsiDesaStats
            .filter((item) => item.kecamatan === chartKecamatanFilter)
            .map((item) => ({ label: item.desa, ...item }));

    return [...rows].sort((a, b) =>
      chartSortOrder === "asc"
        ? a.persenPertanianUtp - b.persenPertanianUtp
        : b.persenPertanianUtp - a.persenPertanianUtp
    );
  }, [chartKecamatanFilter, chartSortOrder, proporsiKecamatanStats, proporsiDesaStats]);

  const avgWilayahProporsiNonPertanian = combinedWilayahProporsiNonPertanianChartData.length > 0
    ? combinedWilayahProporsiNonPertanianChartData.reduce((sum, item) => sum + item.persenNonPertanianPrelist, 0) / combinedWilayahProporsiNonPertanianChartData.length
    : 0;

  const avgWilayahProporsiNonPertanianWilkerstat = combinedWilayahProporsiNonPertanianChartData.length > 0
    ? combinedWilayahProporsiNonPertanianChartData.reduce((sum, item) => sum + item.persenNonPertanianWilkerstat, 0) / combinedWilayahProporsiNonPertanianChartData.length
    : 0;

  const avgWilayahProporsiNonPertanianLegacy = legacyWilayahProporsiNonPertanianChartData.length > 0
    ? legacyWilayahProporsiNonPertanianChartData.reduce((sum, item) => sum + item.persenNonPertanianAktif, 0) / legacyWilayahProporsiNonPertanianChartData.length
    : 0;

  const avgWilayahProporsiPertanian = wilayahProporsiPertanianChartData.length > 0
    ? wilayahProporsiPertanianChartData.reduce((sum, item) => sum + item.persenPertanianUtp, 0) / wilayahProporsiPertanianChartData.length
    : 0;

  const chartKecamatanOptions = useMemo(
    () => Array.from(new Set(kecamatanStats.map((item) => item.kecamatan))).sort((a, b) => a.localeCompare(b, "id")),
    [kecamatanStats]
  );

  const combinedWilayahChartData = useMemo(() => {
    const rows =
      chartKecamatanFilter === "all"
        ? kecamatanStats.map((item) => ({ label: item.kecamatan, ...item }))
        : desaStats
            .filter((item) => item.kecamatan === chartKecamatanFilter)
            .map((item) => ({ label: item.desa, ...item }));

    const mapped = rows.map((item) => ({
      ...item,
      persentasePrelist: item.persentase,
      persentaseDidataNetto: item.persentaseDidataNetto ?? 0,
      persentaseWilkerstat: item.persentaseWilkerstat,
    }));

    const key = chartSortBy === "netto" ? "persentaseDidataNetto" : chartSortBy === "wilkerstat" ? "persentaseWilkerstat" : "persentasePrelist";

    return mapped.sort((a, b) =>
      chartSortOrder === "asc" ? (a as any)[key] - (b as any)[key] : (b as any)[key] - (a as any)[key]
    );
  }, [chartKecamatanFilter, chartSortOrder, kecamatanStats, desaStats, chartSortBy]);

  const avgWilayahPercentageDidata = combinedWilayahChartData.length > 0
    ? combinedWilayahChartData.reduce((sum, item) => sum + (item.persentaseDidataNetto || 0), 0) / combinedWilayahChartData.length
    : 0;

  const legacyWilayahChartData = useMemo(() => {
    const rows =
      chartKecamatanFilter === "all"
        ? kecamatanStats.map((item) => ({ label: item.kecamatan, ...item }))
        : desaStats
            .filter((item) => item.kecamatan === chartKecamatanFilter)
            .map((item) => ({ label: item.desa, ...item }));

    const withValue = rows.map((item) => ({
      ...item,
      persentaseAktif: chartRespondenDivisor === "wilkerstat" ? item.persentaseWilkerstat : chartRespondenDivisor === "netto" ? (item.persentaseDidataNetto ?? item.persentase) : item.persentase,
    }));

    return withValue.sort((a, b) =>
      chartSortOrder === "asc" ? a.persentaseAktif - b.persentaseAktif : b.persentaseAktif - a.persentaseAktif
    );
  }, [chartKecamatanFilter, chartSortOrder, chartRespondenDivisor, kecamatanStats, desaStats]);

  const wilayahChartData = chartMode === "legacy" ? legacyWilayahChartData : combinedWilayahChartData;

  const avgWilayahPercentagePrelist = combinedWilayahChartData.length > 0
    ? combinedWilayahChartData.reduce((sum, item) => sum + item.persentasePrelist, 0) / combinedWilayahChartData.length
    : 0;

  const avgWilayahPercentageWilkerstat = combinedWilayahChartData.length > 0
    ? combinedWilayahChartData.reduce((sum, item) => sum + item.persentaseWilkerstat, 0) / combinedWilayahChartData.length
    : 0;

  const avgWilayahPercentageLegacy = legacyWilayahChartData.length > 0
    ? legacyWilayahChartData.reduce((sum, item) => sum + item.persentaseAktif, 0) / legacyWilayahChartData.length
    : 0;

  // Global edit dialog (rendered outside TabsContent so it is available on all tabs)
  // Uses same state variables: editDialogOpen, editDialogField, editDialogValue, editSaving
  const GlobalEditDialog = (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editDialogField === 'hasil_pengecekkan' ? 'Hasil Pengecekkan' : editDialogField === 'flag_input_fasih' ? 'Flag Input Fasih' : editDialogField === 'nama_pml' ? 'Nama PML' : editDialogField === 'nama_ppl' ? 'Nama PPL' : 'Edit'}</DialogTitle>
          <DialogDescription>Rekam perubahan langsung ke Sheet</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <Input value={editDialogValue} onChange={(e) => setEditDialogValue(e.target.value)} className="w-full" />
        </div>
        <DialogFooter>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-slate-100" onClick={() => setEditDialogOpen(false)}>Batal</button>
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={saveEditDialog} disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  function KeluargaDebugPanel() {
    const { data: debug = null, isLoading, error } = useKeluargaDebugInfo(true) as any;

    if (isLoading) return <div className="mt-2 text-xs text-slate-500">Memeriksa spreadsheet Keluarga...</div>;
    if (error) return <div className="mt-2 text-xs text-rose-600">Error fetching debug info: {String((error as any)?.message || error)}</div>;

    return (
      <div className="mt-2 text-xs text-slate-700">
        <div className="font-medium">Metadata response</div>
        <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(debug?.metadataResponse?.data || debug?.metadataResponse || null, null, 2)}</pre>

        <div className="mt-2 font-medium">Sheets read</div>
        <ul className="list-disc pl-5">
          {(debug?.perSheetRows || []).map((entry: any, idx: number) => (
            <li key={idx}>
              <span className="font-semibold">{entry.sheetName}</span>: {entry.rows ?? 0} rows {entry.error ? `(error: ${String(entry.error)})` : ""}
            </li>
          ))}
        </ul>

        {debug?.errors && debug.errors.length > 0 && (
          <div className="mt-2 text-rose-600">Errors: <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(debug.errors, null, 2)}</pre></div>
        )}
      </div>
    );
  }

  const usahaLoading = usahaPerusahaanLoading || usahaKeluargaLoading || usahaProporsiLoading;
  const usahaError = usahaPerusahaanError || usahaKeluargaError || usahaProporsiError;
  const loading = stackingLoading || progresLoading || progresHeaderLoading;
  const error = stackingError || progresError || progresHeaderError;
  const avgKecamatanPercentage = kecamatanStats.length > 0
    ? kecamatanStats.reduce((sum, item) => sum + item.persentase, 0) / kecamatanStats.length
    : 0;
  const avgWilayahPercentage = wilayahChartData.length > 0
    ? wilayahChartData.reduce((sum, item) => {
        const record = item as any;
        const value = chartMode === "legacy" ? (record.persentaseAktif ?? record.persentase) : (record.persentasePrelist ?? record.persentase);
        return sum + value;
      }, 0) / wilayahChartData.length
    : 0;

  return (
    <div className="space-y-6 py-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Monitoring Lapangan Dash</CardTitle>
              {progressHeaderDisplay && (
                <p className="mt-2 text-sm font-semibold text-red-600">{progressHeaderDisplay}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full h-auto p-1 bg-white border border-slate-200 rounded-lg shadow-sm mb-6 gap-2 overflow-x-auto">
              <TabsTrigger value="dashboard" className="rounded-xl py-2 text-sm font-semibold">Dashboard</TabsTrigger>
              <TabsTrigger value="capaian-kinerja" className="rounded-xl py-2 text-sm font-semibold">Ter-1 &gt; Saat Ini</TabsTrigger>
              <TabsTrigger value="umkm-sosek" className="rounded-xl py-2 text-sm font-semibold">UMKM dan Sosek</TabsTrigger>
              <TabsTrigger value="pendataan-usaha" className="rounded-xl py-2 text-sm font-semibold">Pendataan Usaha</TabsTrigger>
              <TabsTrigger value="skala-usaha" className="rounded-xl py-2 text-sm font-semibold">Skala Usaha</TabsTrigger>
              <TabsTrigger value="keluarga" className="rounded-xl py-2 text-sm font-semibold">Keluarga</TabsTrigger>
              <TabsTrigger value="identifikasi-utt" className="rounded-xl py-2 text-sm font-semibold">Identifikasi UTT</TabsTrigger>
              <TabsTrigger value="ngibar" className="rounded-xl py-2 text-sm font-semibold">Data Ngibar</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {pmlStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Total PML */}
                  <Card className="relative overflow-hidden border border-slate-200/70 shadow-sm bg-gradient-to-br from-slate-50 via-white to-slate-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-slate-700 to-slate-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Total PML</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900">{pmlStats.totalPml}</div>
                      <div className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{parseNumericValue(pmlStats.totalPrelist).toLocaleString("id-ID")}</span> prelist awal
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Responden */}
                  <Card className="relative overflow-hidden border border-blue-200/70 shadow-sm bg-gradient-to-br from-blue-50 via-white to-blue-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-600 to-cyan-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                          <Database className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Responden Didata</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-900">{parseNumericValue(pmlStats.totalResponden).toLocaleString("id-ID")}</div>
                      <div className="mt-2 text-sm text-blue-700">
                        <span className="font-semibold">{pmlStats.averageResponden.toFixed(2)}%</span> dari prelist
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top PML */}
                  <Card className="relative overflow-hidden border border-emerald-200/70 shadow-sm bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-600 to-teal-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Top PML</span>
                      </div>
                      <div className="text-base font-bold text-emerald-900 truncate" title={pmlStats.topPml.nama_pml}>{pmlStats.topPml.nama_pml}</div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-emerald-700">{pmlStats.topPml.value.toFixed(2)}</span>
                        <span className="text-sm font-semibold text-emerald-600">%</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lowest PML */}
                  <Card className="relative overflow-hidden border border-rose-200/70 shadow-sm bg-gradient-to-br from-rose-50 via-white to-rose-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-rose-500 to-red-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Lowest PML</span>
                      </div>
                      <div className="text-base font-bold text-rose-900 truncate" title={pmlStats.lowestPml.nama_pml}>{pmlStats.lowestPml.nama_pml}</div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-rose-700">{pmlStats.lowestPml.value.toFixed(2)}</span>
                        <span className="text-sm font-semibold text-rose-600">%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Progress Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="rounded-2xl px-6 py-4 shadow-lg bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white flex flex-col justify-center">
                      <div className="text-sm uppercase tracking-widest font-semibold text-emerald-100">Hari ke-{daysElapsed}</div>
                      <div className="mt-2 text-2xl font-bold">Target minimal: {minPercentageTarget.toFixed(2)}%</div>
                    </div>
                    <div className="rounded-2xl px-6 py-4 shadow-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white flex flex-col justify-center min-w-[200px]">
                      <div className="text-sm uppercase tracking-widest font-semibold text-slate-300">Rata-rata Kab. Majalengka</div>
                      <div className="mt-2 text-2xl font-bold text-emerald-300">{averageMajalengka.toFixed(2)}%</div>
                    </div>
                    <div className="rounded-2xl px-6 py-4 shadow-lg bg-gradient-to-r from-orange-800 via-orange-600 to-yellow-400 text-white flex flex-col justify-center min-w-[200px]">
                      <div className="text-sm uppercase tracking-widest font-semibold text-slate-100">% Didata Netto</div>
                      <div className="mt-2 text-2xl font-bold text-emerald-300">{umkmTotalDidataNetto.toFixed(2)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Keluarga debug panel component - shows debug info when keluarga data missing */}
              
              {/* Kecamatan Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-slate-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Persentase Assignment per {chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                      </CardTitle>
                      <CardDescription>
                        Assignment Didata dibandingkan terhadap Prelist Awal dan Wilkerstat
                        {chartKecamatanFilter === "all" ? " per Kecamatan" : ` di Kecamatan ${chartKecamatanFilter}`}
                        {` (Diurutkan ${chartSortOrder === "asc" ? "Ascending" : "Descending"})`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-mode" className="text-xs font-semibold text-slate-600">Tampilan</label>
                        <select
                          id="chart-mode"
                          value={chartMode}
                          onChange={(e) => setChartMode(e.target.value as "legacy" | "combined")}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="legacy">Spesifik</option>
                          <option value="combined">Gabung</option>
                        </select>
                      </div>
                      {chartMode === "legacy" && (
                        <div className="flex flex-col gap-1">
                          <label htmlFor="chart-divisor-responden" className="text-xs font-semibold text-slate-600">Pembagi</label>
                          <select
                            id="chart-divisor-responden"
                            value={chartRespondenDivisor}
                            onChange={(e) => setChartRespondenDivisor(e.target.value as "prelist" | "wilkerstat" | "netto")}
                            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                          >
                            <option value="prelist">Prelist Awal</option>
                            <option value="wilkerstat">Wilkerstat</option>
                            <option value="netto">Netto</option>
                          </select>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-kecamatan" className="text-xs font-semibold text-slate-600">Kecamatan</label>
                        <select
                          id="chart-kecamatan"
                          value={chartKecamatanFilter}
                          onChange={(e) => setChartKecamatanFilter(e.target.value)}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="all">Semua Kecamatan</option>
                          {chartKecamatanOptions.map((kecamatan) => (
                            <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                          ))}
                        </select>
                      </div>
                      {chartMode === "combined" && (
                        <>
                          <div className="flex flex-col gap-1">
                            <label htmlFor="chart-sort-by" className="text-xs font-semibold text-slate-600">Urut berdasarkan</label>
                            <select
                              id="chart-sort-by"
                              value={chartSortBy}
                              onChange={(e) => setChartSortBy(e.target.value as "prelist" | "netto" | "wilkerstat")}
                              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                            >
                              <option value="prelist">Prelist Awal</option>
                              <option value="netto">Netto</option>
                              <option value="wilkerstat">Wilkerstat</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label htmlFor="chart-sort" className="text-xs font-semibold text-slate-600">Urutan</label>
                            <select
                              id="chart-sort"
                              value={chartSortOrder}
                              onChange={(e) => setChartSortOrder(e.target.value as "asc" | "desc")}
                              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                            >
                              <option value="desc">Tertinggi → Terendah</option>
                              <option value="asc">Terendah → Tertinggi</option>
                            </select>
                          </div>
                        </>
                      )}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-font" className="text-xs font-semibold text-slate-600">Ukuran Font ({chartFontSize}px)</label>
                        <input
                          id="chart-font"
                          type="range"
                          min={8}
                          max={20}
                          step={1}
                          value={chartFontSize}
                          onChange={(e) => setChartFontSize(Number(e.target.value))}
                          className="h-9 w-36 accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {wilayahChartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">Tidak ada data {chartKecamatanFilter === "all" ? "kecamatan" : "desa/kelurahan"}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={660}>
                      <BarChart data={wilayahChartData} margin={{ top: 20, right: 30, left: 0, bottom: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          tick={{ fontSize: chartFontSize }}
                        />
                        <YAxis
                          label={{ value: "Persentase (%)", angle: -90, position: "insideLeft" }}
                          domain={[0, 100]}
                          tick={{ fontSize: chartFontSize }}
                        />
                        <Tooltip
                          content={
                            chartMode === "legacy" ? (
                              <ChartRatioTooltip
                                labelPrefix={chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                                pctKey="persentaseAktif"
                                pctLabel={chartRespondenDivisor === "wilkerstat" ? "Assignment / Wilkerstat" : chartRespondenDivisor === "netto" ? "% Didata Netto" : "Assignment / Prelist Awal"}
                                valueKey="respondenDidata"
                                valueLabel="Assignment Didata"
                                targetKey={chartRespondenDivisor === "wilkerstat" ? "wilkerstat" : chartRespondenDivisor === "netto" ? "didataNetto" : "prelistAwal"}
                                targetLabel={chartRespondenDivisor === "wilkerstat" ? "Target (Wilkerstat)" : chartRespondenDivisor === "netto" ? "Target (% Didata Netto)" : "Target (Prelist Awal)"}
                                fontSize={chartFontSize}
                              />
                            ) : (
                              <ChartRatioTooltip
                                labelPrefix={chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                                fontSize={chartFontSize}
                                series={[
                                  {
                                    name: "Assignment / Prelist Awal",
                                    pctKey: "persentasePrelist",
                                    pctLabel: "Assignment / Prelist Awal",
                                    valueKey: "respondenDidata",
                                    valueLabel: "Assignment Didata",
                                    targetKey: "prelistAwal",
                                    targetLabel: "Target (Prelist Awal)",
                                  },
                                  {
                                    name: "Assignment / Netto",
                                    pctKey: "persentaseDidataNetto",
                                    pctLabel: "% Didata Netto",
                                    valueKey: "didataNetto",
                                    valueLabel: "Assignment Didata (Netto)",
                                    targetKey: "didataNetto",
                                    targetLabel: "Target (% Didata Netto)",
                                  },
                                  {
                                    name: "Assignment / Wilkerstat",
                                    pctKey: "persentaseWilkerstat",
                                    pctLabel: "Assignment / Wilkerstat",
                                    valueKey: "respondenDidata",
                                    valueLabel: "Assignment Didata",
                                    targetKey: "wilkerstat",
                                    targetLabel: "Target (Wilkerstat)",
                                  },
                                ]}
                              />
                            )
                          }
                        />
                        {chartMode === "legacy" ? (
                          <>
                            <ReferenceLine
                              y={avgWilayahPercentageLegacy}
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              label={{ value: `Rata-rata: ${avgWilayahPercentageLegacy.toFixed(2)}%`, position: "right", fill: "#8b5cf6", fontSize: chartFontSize }}
                            />
                            <ReferenceLine
                              y={minPercentageTarget}
                              stroke="#3b82f6"
                              strokeWidth={2}
                              label={{ value: `Target minimal hari ke-${daysElapsed}: ${minPercentageTarget.toFixed(2)}%`, position: "right", fill: "#3b82f6", fontSize: chartFontSize }}
                            />
                            <Legend wrapperStyle={{ fontSize: chartFontSize }} />
                            <Bar
                              dataKey="persentaseAktif"
                              name={chartRespondenDivisor === "wilkerstat" ? "Assignment / Wilkerstat" : chartRespondenDivisor === "netto" ? "Assignment / Netto" : "Assignment / Prelist Awal"}
                              radius={[8, 8, 0, 0]}
                              label={{
                                position: "top",
                                fill: "#1f2937",
                                fontSize: chartFontSize,
                                fontWeight: 600,
                                formatter: (value: number) => `${value.toFixed(2)}%`,
                              }}
                            >
                              {legacyWilayahChartData.map((entry, index) => (
                                <Cell key={`cell-${entry.label}-${index}`} fill={getColorForPercentage(entry.persentaseAktif)} />
                              ))}
                            </Bar>
                          </>
                            ) : (
                              <>
                                <ReferenceLine
                                  y={avgWilayahPercentagePrelist}
                                  stroke="#3b82f6"
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  label={{ value: `Rata-rata Prelist: ${avgWilayahPercentagePrelist.toFixed(2)}%`, position: "right", fill: "#3b82f6", fontSize: chartFontSize }}
                                />
                                <ReferenceLine
                                  y={avgWilayahPercentageDidata}
                                  stroke="#10b981"
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  label={{ value: `Rata-rata Netto: ${avgWilayahPercentageDidata.toFixed(2)}%`, position: "right", fill: "#10b981", fontSize: chartFontSize }}
                                />
                                <ReferenceLine
                                  y={avgWilayahPercentageWilkerstat}
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  label={{ value: `Rata-rata Wilkerstat: ${avgWilayahPercentageWilkerstat.toFixed(2)}%`, position: "right", fill: "#f59e0b", fontSize: chartFontSize }}
                                />
                                <ReferenceLine
                                  y={minPercentageTarget}
                                  stroke="#3b82f6"
                                  strokeWidth={2}
                                  label={{ value: `Target minimal hari ke-${daysElapsed}: ${minPercentageTarget.toFixed(2)}%`, position: "right", fill: "#3b82f6", fontSize: chartFontSize }}
                                />
                                <Legend wrapperStyle={{ fontSize: chartFontSize }} />
                                <Bar
                                  dataKey="persentasePrelist"
                                  name="Prelist Awal"
                                  radius={[8, 8, 0, 0]}
                                  fill="#3b82f6"
                                  maxBarSize={28}
                                  label={(props) => <VerticalInsideLabel {...props} fill="#000" fontSize={chartFontSize} />}
                                />
                                <Bar
                                  dataKey="persentaseDidataNetto"
                                  name="Netto"
                                  radius={[8, 8, 0, 0]}
                                  fill="#10b981"
                                  maxBarSize={28}
                                  label={(props) => <VerticalInsideLabel {...props} fill="#000" fontSize={chartFontSize} />}
                                />
                                <Bar
                                  dataKey="persentaseWilkerstat"
                                  name="Wilkerstat"
                                  radius={[8, 8, 0, 0]}
                                  fill="#f59e0b"
                                  maxBarSize={28}
                                  label={(props) => <VerticalInsideLabel {...props} fill="#000" fontSize={chartFontSize} />}
                                />
                              </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Persentase Usaha Non Pertanian terhadap Prelist Usaha dan Usaha Wilkerstat per {chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                      </CardTitle>
                      <CardDescription>
                        Jumlah usaha non pertanian dibandingkan dengan Prelist Usaha dan Usaha Wilkerstat
                        {chartKecamatanFilter === "all" ? " per Kecamatan" : ` di Kecamatan ${chartKecamatanFilter}`}
                        {` (Diurutkan ${chartSortOrder === "asc" ? "Ascending" : "Descending"})`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-mode-non" className="text-xs font-semibold text-slate-600">Tampilan</label>
                        <select
                          id="chart-mode-non"
                          value={chartMode}
                          onChange={(e) => setChartMode(e.target.value as "legacy" | "combined")}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="legacy">Spesifik</option>
                          <option value="combined">Gabung</option>
                        </select>
                      </div>
                      {chartMode === "legacy" && (
                        <div className="flex flex-col gap-1">
                          <label htmlFor="chart-divisor-non" className="text-xs font-semibold text-slate-600">Pembagi</label>
                          <select
                            id="chart-divisor-non"
                            value={chartNonPertanianDivisor}
                            onChange={(e) => setChartNonPertanianDivisor(e.target.value as "prelist" | "wilkerstat")}
                            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                          >
                            <option value="prelist">Prelist Usaha</option>
                            <option value="wilkerstat">Usaha Wilkerstat</option>
                          </select>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-kecamatan-non" className="text-xs font-semibold text-slate-600">Kecamatan</label>
                        <select
                          id="chart-kecamatan-non"
                          value={chartKecamatanFilter}
                          onChange={(e) => setChartKecamatanFilter(e.target.value)}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="all">Semua Kecamatan</option>
                          {chartKecamatanOptions.map((kecamatan) => (
                            <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                          ))}
                        </select>
                      </div>
                      {chartMode === "combined" && (
                        <>
                          <div className="flex flex-col gap-1">
                            <label htmlFor="chart-sort-by-non" className="text-xs font-semibold text-slate-600">Urut berdasarkan</label>
                            <select
                              id="chart-sort-by-non"
                              value={chartProporsiSortBy}
                              onChange={(e) => setChartProporsiSortBy(e.target.value as "prelist" | "wilkerstat")}
                              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                            >
                              <option value="prelist">Prelist Usaha</option>
                              <option value="wilkerstat">Usaha Wilkerstat</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label htmlFor="chart-sort-non" className="text-xs font-semibold text-slate-600">Urutan</label>
                            <select
                              id="chart-sort-non"
                              value={chartSortOrder}
                              onChange={(e) => setChartSortOrder(e.target.value as "asc" | "desc")}
                              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                            >
                              <option value="desc">Tertinggi → Terendah</option>
                              <option value="asc">Terendah → Tertinggi</option>
                            </select>
                          </div>
                        </>
                      )}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-font-non" className="text-xs font-semibold text-slate-600">Ukuran Font ({chartFontSize}px)</label>
                        <input
                          id="chart-font-non"
                          type="range"
                          min={8}
                          max={20}
                          step={1}
                          value={chartFontSize}
                          onChange={(e) => setChartFontSize(Number(e.target.value))}
                          className="h-9 w-36 accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {wilayahProporsiNonPertanianChartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">Tidak ada data {chartKecamatanFilter === "all" ? "kecamatan" : "desa/kelurahan"}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={660}>
                      <BarChart data={wilayahProporsiNonPertanianChartData} margin={{ top: 20, right: 30, left: 0, bottom: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          tick={{ fontSize: chartFontSize }}
                        />
                        <YAxis
                          label={{ value: "Persentase (%)", angle: -90, position: "insideLeft" }}
                          domain={[0, 100]}
                          tick={{ fontSize: chartFontSize }}
                        />
                        <Tooltip
                          content={
                            chartMode === "legacy" ? (
                              <ChartRatioTooltip
                                labelPrefix={chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                                pctKey="persenNonPertanianAktif"
                                pctLabel={chartNonPertanianDivisor === "wilkerstat" ? "Non Pertanian / Usaha Wilkerstat" : "Non Pertanian / Prelist Usaha"}
                                valueKey="nonPertanian"
                                valueLabel="Jumlah Usaha Non Pertanian"
                                targetKey={chartNonPertanianDivisor === "wilkerstat" ? "usahaWilkerstat" : "prelistUsaha"}
                                targetLabel={chartNonPertanianDivisor === "wilkerstat" ? "Target (Usaha Wilkerstat)" : "Target (Prelist Usaha)"}
                                fontSize={chartFontSize}
                              />
                            ) : (
                              <ChartRatioTooltip
                                labelPrefix={chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                                fontSize={chartFontSize}
                                series={[
                                  {
                                    name: "Non Pertanian / Prelist Usaha",
                                    pctKey: "persenNonPertanianPrelist",
                                    pctLabel: "Non Pertanian / Prelist Usaha",
                                    valueKey: "nonPertanian",
                                    valueLabel: "Jumlah Usaha Non Pertanian",
                                    targetKey: "prelistUsaha",
                                    targetLabel: "Target (Prelist Usaha)",
                                  },
                                  {
                                    name: "Non Pertanian / Usaha Wilkerstat",
                                    pctKey: "persenNonPertanianWilkerstat",
                                    pctLabel: "Non Pertanian / Usaha Wilkerstat",
                                    valueKey: "nonPertanian",
                                    valueLabel: "Jumlah Usaha Non Pertanian",
                                    targetKey: "usahaWilkerstat",
                                    targetLabel: "Target (Usaha Wilkerstat)",
                                  },
                                ]}
                              />
                            )
                          }
                        />
                        {chartMode === "legacy" ? (
                          <>
                            <ReferenceLine
                              y={avgWilayahProporsiNonPertanianLegacy}
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              label={{ value: `Rata-rata: ${avgWilayahProporsiNonPertanianLegacy.toFixed(2)}%`, position: "right", fill: "#8b5cf6", fontSize: chartFontSize }}
                            />
                            <Legend wrapperStyle={{ fontSize: chartFontSize }} />
                            <Bar
                              dataKey="persenNonPertanianAktif"
                              name={chartNonPertanianDivisor === "wilkerstat" ? "Non Pertanian / Usaha Wilkerstat" : "Non Pertanian / Prelist Usaha"}
                              radius={[8, 8, 0, 0]}
                              label={{
                                position: "top",
                                fill: "#1f2937",
                                fontSize: chartFontSize,
                                fontWeight: 600,
                                formatter: (value: number) => `${value.toFixed(2)}%`,
                              }}
                            >
                              {legacyWilayahProporsiNonPertanianChartData.map((entry, index) => (
                                <Cell key={`cell-non-${entry.label}-${index}`} fill={getColorForProporsiChart(entry.persenNonPertanianAktif)} />
                              ))}
                            </Bar>
                          </>
                        ) : (
                          <>
                            <ReferenceLine
                              y={avgWilayahProporsiNonPertanian}
                              stroke="#2563eb"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              label={{ value: `Rata-rata Prelist: ${avgWilayahProporsiNonPertanian.toFixed(2)}%`, position: "right", fill: "#2563eb", fontSize: chartFontSize }}
                            />
                            <ReferenceLine
                              y={avgWilayahProporsiNonPertanianWilkerstat}
                              stroke="#ec4899"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              label={{ value: `Rata-rata Wilkerstat: ${avgWilayahProporsiNonPertanianWilkerstat.toFixed(2)}%`, position: "right", fill: "#ec4899", fontSize: chartFontSize }}
                            />
                            <Legend wrapperStyle={{ fontSize: chartFontSize }} />
                            <Bar
                              dataKey="persenNonPertanianPrelist"
                              name="Non Pertanian / Prelist Usaha"
                              radius={[8, 8, 0, 0]}
                              fill="#2563eb"
                              maxBarSize={32}
                              label={{
                                position: "top",
                                fill: "#1f2937",
                                fontSize: chartFontSize,
                                fontWeight: 600,
                                formatter: (value: number) => `${value.toFixed(2)}%`,
                              }}
                            />
                            <Bar
                              dataKey="persenNonPertanianWilkerstat"
                              name="Non Pertanian / Usaha Wilkerstat"
                              radius={[8, 8, 0, 0]}
                              fill="#ec4899"
                              maxBarSize={32}
                              label={{
                                position: "top",
                                fill: "#1f2937",
                                fontSize: chartFontSize,
                                fontWeight: 600,
                                formatter: (value: number) => `${value.toFixed(2)}%`,
                              }}
                            />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Persentase Usaha Pertanian ke UTP ST2023 per {chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                      </CardTitle>
                      <CardDescription>
                        Jumlah usaha pertanian dibagi UTP ST2023
                        {chartKecamatanFilter === "all" ? " per Kecamatan" : ` di Kecamatan ${chartKecamatanFilter}`}
                        {` (Diurutkan ${chartSortOrder === "asc" ? "Ascending" : "Descending"})`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-kecamatan-pertanian" className="text-xs font-semibold text-slate-600">Kecamatan</label>
                        <select
                          id="chart-kecamatan-pertanian"
                          value={chartKecamatanFilter}
                          onChange={(e) => setChartKecamatanFilter(e.target.value)}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="all">Semua Kecamatan</option>
                          {chartKecamatanOptions.map((kecamatan) => (
                            <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-sort-pertanian" className="text-xs font-semibold text-slate-600">Urutan</label>
                        <select
                          id="chart-sort-pertanian"
                          value={chartSortOrder}
                          onChange={(e) => setChartSortOrder(e.target.value as "asc" | "desc")}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="desc">Tertinggi → Terendah</option>
                          <option value="asc">Terendah → Tertinggi</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-font-pertanian" className="text-xs font-semibold text-slate-600">Ukuran Font ({chartFontSize}px)</label>
                        <input
                          id="chart-font-pertanian"
                          type="range"
                          min={8}
                          max={20}
                          step={1}
                          value={chartFontSize}
                          onChange={(e) => setChartFontSize(Number(e.target.value))}
                          className="h-9 w-36 accent-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {wilayahProporsiPertanianChartData.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">Tidak ada data {chartKecamatanFilter === "all" ? "kecamatan" : "desa/kelurahan"}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={660}>
                      <BarChart data={wilayahProporsiPertanianChartData} margin={{ top: 20, right: 30, left: 0, bottom: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          tick={{ fontSize: chartFontSize }}
                        />
                        <YAxis
                          label={{ value: "Persentase (%)", angle: -90, position: "insideLeft" }}
                          domain={[0, 100]}
                          tick={{ fontSize: chartFontSize }}
                        />
                        <Tooltip
                          content={
                            <ChartRatioTooltip
                              labelPrefix={chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                              pctKey="persenPertanianUtp"
                              pctLabel="Pertanian / UTP ST2023"
                              valueKey="pertanian"
                              valueLabel="Jumlah Usaha Pertanian"
                              targetKey="utpSt2023"
                              targetLabel="Target (UTP ST2023)"
                              fontSize={chartFontSize}
                            />
                          }
                        />
                        <ReferenceLine
                          y={avgWilayahProporsiPertanian}
                          stroke="#16a34a"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Rata-rata: ${avgWilayahProporsiPertanian.toFixed(2)}%`, position: "right", fill: "#16a34a", fontSize: chartFontSize }}
                        />
                        <Legend wrapperStyle={{ fontSize: chartFontSize }} />
                        <Bar
                          dataKey="persenPertanianUtp"
                          name="Pertanian / UTP ST2023"
                          radius={[8, 8, 0, 0]}
                          label={{
                            position: "top",
                            fill: "#1f2937",
                            fontSize: chartFontSize,
                            fontWeight: 600,
                            formatter: (value: number) => `${value.toFixed(2)}%`,
                          }}
                        >
                          {wilayahProporsiPertanianChartData.map((entry, index) => (
                            <Cell key={`cell-pertanian-${entry.label}-${index}`} fill={getColorForProporsiChart(entry.persenPertanianUtp)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-slate-50">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <CardTitle className="text-base">Persentase Pemutakhiran Keluarga</CardTitle>
                      <CardDescription>
                        Pemutakhiran keluarga dari spreadsheet Keluarga per {chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                        {` (Diurutkan ${chartSortOrder === "asc" ? "Ascending" : "Descending"})`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-keluarga-kecamatan" className="text-xs font-semibold text-slate-600">Kecamatan</label>
                        <select
                          id="chart-keluarga-kecamatan"
                          value={chartKecamatanFilter}
                          onChange={(e) => setChartKecamatanFilter(e.target.value)}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="all">Semua Kecamatan</option>
                          {chartKecamatanOptions.map((kecamatan) => (
                            <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label htmlFor="chart-keluarga-sort" className="text-xs font-semibold text-slate-600">Urutan</label>
                        <select
                          id="chart-keluarga-sort"
                          value={chartSortOrder}
                          onChange={(e) => setChartSortOrder(e.target.value as "asc" | "desc")}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="desc">Tertinggi → Terendah</option>
                          <option value="asc">Terendah → Terendah</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {keluargaDashboardLoading ? (
                    <div className="text-center py-12 text-slate-500">Memuat data keluarga...</div>
                  ) : keluargaDashboardData.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <div>Tidak ada data keluarga untuk ditampilkan.</div>
                      <div className="mt-4 text-xs text-slate-600 text-left max-w-3xl mx-auto">
                        <div className="font-semibold">Debug: keluarga summary</div>
                        <div>Length: {Array.isArray(keluargaDashboardSummary) ? keluargaDashboardSummary.length : "n/a"}</div>
                        <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-xs">
                          {JSON.stringify(Array.isArray(keluargaDashboardSummary) ? (keluargaDashboardSummary as any).slice(0, 5) : keluargaDashboardSummary, null, 2)}
                        </pre>
                        <div className="mt-2 font-semibold">Debug: google-sheets fetch</div>
                        <KeluargaDebugPanel />
                        <div className="mt-2 text-rose-600">(Hapus debug ini setelah verifikasi)</div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={660}>
                      <BarChart data={keluargaDashboardData} margin={{ top: 20, right: 30, left: 0, bottom: 90 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" angle={-35} textAnchor="end" height={90} tick={{ fontSize: chartFontSize }} />
                        <YAxis label={{ value: "Persentase (%)", angle: -90, position: "insideLeft" }} domain={[0, 100]} tick={{ fontSize: chartFontSize }} />
                        <Tooltip
                          content={
                            <ChartRatioTooltip
                                  labelPrefix={chartKecamatanFilter === "all" ? "Kecamatan" : "Desa/Kelurahan"}
                                  pctKey="persentasePemutakhiran"
                                  pctLabel="Pemutakhiran Keluarga"
                                  valueKey="totalHasil"
                                  valueLabel="Total Hasil"
                                  targetKey="prelistAwal"
                                  targetLabel="Target (Prelist Awal)"
                                  fontSize={chartFontSize}
                                />
                          }
                        />
                        <ReferenceLine y={keluargaDashboardAverage} stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" label={{ value: `Rata-rata: ${keluargaDashboardAverage.toFixed(2)}%`, position: "right", fill: "#8b5cf6", fontSize: chartFontSize }} />
                        <Legend wrapperStyle={{ fontSize: chartFontSize }} />
                        <Bar dataKey="persentasePemutakhiran" name="Pemutakhiran Keluarga" radius={[8, 8, 0, 0]} label={{ position: "top", fill: "#1f2937", fontSize: chartFontSize, fontWeight: 600, formatter: (value: number) => `${value.toFixed(2)}%` }}>
                          {keluargaDashboardData.map((entry: any, index: number) => (
                            <Cell key={`family-cell-${entry.label}-${index}`} fill={getColorForPemutakhiranPercentage(entry.persentasePemutakhiran)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="capaian-kinerja" className="space-y-6 mt-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="text-lg">Ter-1 &gt; Saat Ini</CardTitle>
                      <p className="mt-2 text-sm text-slate-500">Termin-1 baseline ditetapkan pada 15/07/2026, perubahan dihitung sampai hari ke-{""}{daysElapsedTer1}.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
                      Hari ke-{daysElapsed} • Target minimal {minPercentageTarget.toFixed(2)}%
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <Card className="border border-slate-200/70 shadow-sm">
                    <CardHeader className="border-b bg-slate-50">
                      <CardTitle className="text-base">Capaian dari Termin-1 sampai dengan kondisi sekarang</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Cari Nama PPL atau Kecamatan..."
                            value={capaianSearchTerm}
                            onChange={(e) => {
                              setCapaianSearchTerm(e.target.value);
                              setCapaianCurrentPage(1);
                            }}
                            className="pl-10 h-10"
                          />
                        </div>
                        <select
                          aria-label="Filter kecamatan Ter-1 > Saat Ini"
                          value={capaianKecamatanFilter}
                          onChange={(e) => {
                            setCapaianKecamatanFilter(e.target.value);
                            setCapaianCurrentPage(1);
                          }}
                          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                        >
                          <option value="all">Semua Kecamatan</option>
                          {capaianKecamatanOptions.map((kecamatan) => (
                            <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>Per halaman:</span>
                          <select
                            value={capaianItemsPerPage}
                            onChange={(e) => {
                              setCapaianItemsPerPage(Number(e.target.value));
                              setCapaianCurrentPage(1);
                            }}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3"
                          >
                            {[10, 20, 50, 100].map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <span>{capaianFilteredRows.length.toLocaleString("id-ID")} baris</span>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                              <TableHead
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setCapaianSortBy("nama_ppl");
                                  setCapaianSortOrder(capaianSortBy === "nama_ppl" ? (capaianSortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Nama PPL
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setCapaianSortBy("kecamatan");
                                  setCapaianSortOrder(capaianSortBy === "kecamatan" ? (capaianSortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Kecamatan
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setCapaianSortBy("prelist_awal");
                                  setCapaianSortOrder(capaianSortBy === "prelist_awal" ? (capaianSortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Prelist
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setCapaianSortBy("totalStatus");
                                  setCapaianSortOrder(capaianSortBy === "totalStatus" ? (capaianSortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Termin-1
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setCapaianSortBy("didata");
                                  setCapaianSortOrder(capaianSortBy === "didata" ? (capaianSortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Saat Ini
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setCapaianSortBy("delta");
                                  setCapaianSortOrder(capaianSortBy === "delta" ? (capaianSortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Perubahan
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-slate-700 font-semibold px-4 py-3"
                              >
                                Status
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {capaianPaginatedRows.map((row) => {
                              const isLagging = row.delta < 0;
                              return (
                                <TableRow
                                  key={row.id}
                                  className={`border-b transition-colors ${isLagging ? "bg-amber-50/70 hover:bg-amber-100" : "hover:bg-slate-50"}`}
                                >
                                  <TableCell className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                                    <span>{row.nama_ppl || "-"}</span>
                                    {isLagging ? (
                                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-800">
                                        Tertinggal
                                      </span>
                                    ) : null}
                                  </TableCell>
                                  <TableCell className="px-4 py-3 text-slate-700">{row.kecamatan || "-"}</TableCell>
                                  <TableCell className="px-4 py-3 text-right text-slate-700">{row.prelist_awal.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="px-4 py-3 text-right font-semibold text-slate-900">{row.totalStatus.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="px-4 py-3 text-right font-semibold text-slate-900">{row.didata.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="px-4 py-3 text-right text-slate-700">{row.delta >= 0 ? "+" : ""}{row.delta.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="px-4 py-3 text-slate-700">
                                    <div className="flex flex-col gap-1">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        row.status === "Meningkat Tajam" || row.status === "Meningkat" ? "bg-emerald-100 text-emerald-700" :
                                        row.status === "Stabil (Cukup)" ? "bg-emerald-50 text-emerald-700" :
                                        row.status === "Stabil (Risiko)" ? "bg-amber-100 text-amber-700" :
                                        row.status === "Menurun" || row.status === "Menurun Tajam" ? "bg-rose-100 text-rose-700" :
                                        row.status === "Perlu Perhatian" ? "bg-amber-100 text-amber-700" :
                                        "bg-slate-100 text-slate-700"
                                      }`}>
                                        {row.status}
                                      </span>
                                      <span className="text-[11px] leading-4 text-slate-500">{row.statusDetail}</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-3 bg-slate-50 border-t border-slate-200">
                        <div className="text-sm text-slate-600">
                          Menampilkan {capaianPaginatedRows.length} dari {capaianFilteredRows.length.toLocaleString("id-ID")} baris
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCapaianCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={capaianCurrentPage === 1}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                          >
                            Sebelumnya
                          </button>
                          <span className="text-sm text-slate-600">Hal {capaianCurrentPage} dari {capaianTotalPages}</span>
                          <button
                            type="button"
                            onClick={() => setCapaianCurrentPage((prev) => Math.min(capaianTotalPages, prev + 1))}
                            disabled={capaianCurrentPage === capaianTotalPages}
                            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                          >
                            Berikutnya
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="umkm-sosek" className="space-y-6 mt-6">
              <div className="space-y-4">
                <Tabs value={umkmSubTab} onValueChange={setUmkmSubTab}>
                  <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-2 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)]">
                    <TabsList className="inline-flex h-auto w-full max-w-md gap-2 rounded-xl border border-slate-200/70 bg-white/80 p-1.5 shadow-inner">
                      <TabsTrigger
                        value="ppl"
                        className="group flex-1 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-blue-200 hover:text-slate-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-blue-200"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                          PPL
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="pml"
                        className="group flex-1 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-emerald-200 hover:text-slate-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-emerald-200"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-current opacity-80" />
                          PML
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="ppl" className="space-y-6 mt-6">
                    <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-lg font-semibold">Data Individu PPL</h2>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 w-full lg:flex-row lg:items-center lg:justify-end lg:space-x-4">
                    <div className="relative w-full lg:w-96">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Cari Nama PPL atau Kecamatan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 w-full"
                      />
                    </div>
                    <select
                      aria-label="Filter kecamatan UMKM dan Sosek"
                      value={umkmKecamatanFilter}
                      onChange={(event) => {
                        setUmkmKecamatanFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                    >
                      <option value="all">Semua Kecamatan</option>
                      {umkmKecamatanOptions.map((kecamatan) => (
                        <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                      ))}
                    </select>
                    {isLoggedIn ? (
                      <select
                        aria-label="Filter TA UMKM dan Sosek"
                        value={umkmAfirmasiFilter}
                        onChange={(event) => {
                          setUmkmAfirmasiFilter(event.target.value as "all" | "ratih" | "ledya");
                          setCurrentPage(1);
                        }}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                      >
                        <option value="all">Semua</option>
                        <option value="ratih">TA - Ratih Megasari</option>
                        <option value="ledya">TA - Ledya</option>
                      </select>
                    ) : null}
                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-4 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                            Hari ke-{daysElapsed}
                          </span>
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                            Target minimal: {minPercentageTarget.toFixed(2)}%
                          </span>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                          Rata-rata Kab. Majalengka: <span className="ml-1 text-emerald-600">{averageMajalengka.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-slate-600">Memuat data...</span>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12 text-red-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Error: {error}
                      </div>
                    ) : filteredRows.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-slate-500">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Tidak ada data PPL.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                              <TableHead className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                              <TableHead
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("nama_ppl");
                                  setSortOrder(sortBy === "nama_ppl" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Nama PPL
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("kecamatan");
                                  setSortOrder(sortBy === "kecamatan" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Kecamatan
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("prelist_wilkerstat");
                                  setSortOrder(sortBy === "prelist_wilkerstat" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Wilkerstat
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("prelist_awal");
                                  setSortOrder(sortBy === "prelist_awal" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Prelist Awal
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("draft");
                                  setSortOrder(sortBy === "draft" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Draft
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("persentase_draft");
                                  setSortOrder(sortBy === "persentase_draft" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Draft
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("responden_didata");
                                  setSortOrder(sortBy === "responden_didata" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Didata
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("persentase_responden_didata");
                                  setSortOrder(sortBy === "persentase_responden_didata" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Didata
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("didata_netto");
                                  setSortOrder(sortBy === "didata_netto" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Didata Netto
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("persentase_didata_netto");
                                  setSortOrder(sortBy === "persentase_didata_netto" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Didata Netto
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("persentase_wilkerstat");
                                  setSortOrder(sortBy === "persentase_wilkerstat" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Wilkerstat
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedRows.map((row, index) => {
                              const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                              const isExpanded = expandedPPL.has(row.nama_ppl);
                              const respPct = parsePercentage(row.persentase_responden_didata);
                              const draftPct = parsePercentage(row.persentase_draft);
                              return (
                                <React.Fragment key={row.id}>
                                  <TableRow className="hover:bg-slate-50 border-b transition-colors">
                                    <TableCell className="text-center text-slate-600 font-medium w-12">
                                      {rowNumber}
                                    </TableCell>
                                    <TableCell
                                      className="text-slate-700 px-4 py-3 cursor-pointer hover:text-blue-600 flex flex-col gap-1"
                                      onClick={() => {
                                        setExpandedPPL((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(row.nama_ppl)) next.delete(row.nama_ppl);
                                          else next.add(row.nama_ppl);
                                          return next;
                                        });
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 inline flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 inline flex-shrink-0" />
                                        )}
                                        <span>{row.nama_ppl}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-slate-900 px-4 py-3">{row.kecamatan}</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-900 px-4 py-3">{parseNumericValue(row.prelist_wilkerstat).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.draft).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                      {row.persentase_draft}%
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.responden_didata).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3" style={{ color: getColorForPercentage(respPct) }}>
                                      {row.persentase_responden_didata}%
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.didata_netto).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3" style={{ color: getColorForPercentage(parsePercentage(row.persentase_didata_netto)) }}>
                                      {row.persentase_didata_netto}%
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
                                      {row.persentase_wilkerstat}%
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && row.details.map((detail, detailIndex) => (
                                    <TableRow key={`${row.id}-detail-${detailIndex}`} className="bg-slate-50 border-b hover:bg-slate-100 transition-colors">
                                      <TableCell className="px-4 py-2" />
                                      <TableCell className="text-sm text-slate-700 px-4 py-2 italic pl-8">{detail.matchingKey}</TableCell>
                                      <TableCell className="text-sm text-slate-600 px-4 py-2">{detail.address}</TableCell>
                                      <TableCell className="text-right font-semibold text-blue-900 px-4 py-2">{parseNumericValue(detail.prelist_wilkerstat).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.draft).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">
                                        {detail.persentase_draft}%
                                      </TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.responden_didata).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2" style={{ color: getColorForPercentage(parsePercentage(detail.persentase_responden_didata)) }}>
                                        {detail.persentase_responden_didata}%
                                      </TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.didata_netto).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2" style={{ color: getColorForPercentage(parsePercentage(detail.persentase_didata_netto)) }}>
                                        {detail.persentase_didata_netto}%
                                      </TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">
                                        {detail.persentase_wilkerstat}%
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                            {/* Total Row */}
                            {(() => {
                              const totalPrelist = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
                              const totalWilkerstat = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_wilkerstat), 0);
                              const totalResponden = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.responden_didata), 0);
                              const totalDidataNetto = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.didata_netto), 0);
                              const totalDraft = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.draft), 0);
                              const totalPctResponden = totalPrelist > 0 ? ((totalResponden / totalPrelist) * 100).toFixed(2) : "0.00";
                              const totalPctDidataNetto = totalPrelist > 0 ? ((totalDidataNetto / totalPrelist) * 100).toFixed(2) : "0.00";
                              const totalPctDraft = totalPrelist > 0 ? ((totalDraft / totalPrelist) * 100).toFixed(2) : "0.00";
                              const totalPctWilkerstat = totalWilkerstat > 0 ? ((totalResponden / totalWilkerstat) * 100).toFixed(2) : "0.00";
                              return (
                                <TableRow className="bg-emerald-50 border-b font-semibold">
                                  <TableCell className="text-center text-slate-700 w-12 px-4 py-3" />
                                  <TableCell className="text-slate-900 px-4 py-3">TOTAL</TableCell>
                                  <TableCell className="text-slate-900 px-4 py-3" />
                                  <TableCell className="text-right text-blue-900 px-4 py-3">{totalWilkerstat.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalPrelist.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalDraft.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right text-blue-600 px-4 py-3">{totalPctDraft}%</TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalResponden.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right px-4 py-3" style={{ color: getColorForPercentage(parsePercentage(totalPctResponden)) }}>
                                    {totalPctResponden}%
                                  </TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalDidataNetto.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right px-4 py-3" style={{ color: getColorForPercentage(parsePercentage(totalPctDidataNetto)) }}>
                                    {totalPctDidataNetto}%
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-3" style={{ color: getColorForPercentage(parsePercentage(totalPctWilkerstat)) }}>
                                    {totalPctWilkerstat}%
                                  </TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>Per halaman:</span>
                            <select
                              value={itemsPerPage}
                              onChange={(e) => setItemsPerPage(Number(e.target.value))}
                              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                            >
                              {[10, 20, 50, 100].map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                            <span>Hal {currentPage} dari {totalPages}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Sebelumnya
                            </button>
                            <button
                              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Berikutnya
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
                    </TabsContent>
                  <TabsContent value="pml" className="space-y-6 mt-6">
                    <div className="space-y-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                          <div>
                            <h2 className="text-lg font-semibold">Data PML</h2>
                            <p className="text-sm text-slate-500">Ringkasan progres PML dari data yang tersedia.</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full lg:flex-row lg:items-center lg:justify-end lg:space-x-4">
                          <div className="relative w-full lg:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Cari Nama PML atau Kecamatan..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 h-10 w-full"
                            />
                          </div>
                          <select
                            aria-label="Filter kecamatan UMKM dan Sosek"
                            value={umkmKecamatanFilter}
                            onChange={(event) => {
                              setUmkmKecamatanFilter(event.target.value);
                              setPmlCurrentPage(1);
                            }}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                          >
                            <option value="all">Semua Kecamatan</option>
                            {umkmKecamatanOptions.map((kecamatan) => (
                              <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                            ))}
                          </select>
                          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-4 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                                  Hari ke-{daysElapsed}
                                </span>
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                                  Target minimal: {minPercentageTarget.toFixed(2)}%
                                </span>
                              </div>
                              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                                Rata-rata Kab. Majalengka: <span className="ml-1 text-emerald-600">{averageMajalengka.toFixed(2)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                          {loading ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                              <span className="ml-2 text-slate-600">Memuat data...</span>
                            </div>
                          ) : error ? (
                            <div className="flex items-center justify-center py-12 text-red-600">
                              <AlertCircle className="h-5 w-5 mr-2" />
                              Error: {error}
                            </div>
                          ) : filteredPmlRows.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-slate-500">
                              <AlertCircle className="h-5 w-5 mr-2" />
                              Tidak ada data PML.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <div className="hidden">
                                <span className="text-sm font-medium text-slate-600">Kolom:</span>
                                <button
                                  type="button"
                                  onClick={() => setUsahaKondisiColumns(Object.fromEntries(Object.keys(usahaKondisiColumns).map((key) => [key, true])) as typeof usahaKondisiColumns)}
                                  className="inline-flex h-8 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                                >
                                  <ChevronDown className="mr-1 h-4 w-4" /> Buka Semua
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUsahaKondisiColumns(Object.fromEntries(Object.keys(usahaKondisiColumns).map((key) => [key, false])) as typeof usahaKondisiColumns)}
                                  className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
                                >
                                  <ChevronRight className="mr-1 h-4 w-4" /> Tutup Semua
                                </button>
                                {([
                                  ["BKU", ["perusahaanDitemukan", "perusahaanTutup", "perusahaanGanda", "perusahaanTidakDitemukan", "perusahaanBaru", "perusahaanDitemukanBaru"]],
                                  ["Usaha Keluarga", ["keluargaDitemukan", "keluargaTutup", "keluargaGanda", "keluargaTidakDitemukan", "keluargaBaru", "keluargaDitemukanBaru"]],
                                  ["Ringkasan", ["totalTidakDitemukan", "totalUsaha", "surplusDefisit"]],
                                ] as const).map(([label, keys]) => {
                                  const isOpen = keys.some((key) => usahaKondisiColumns[key]);
                                  return (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => setUsahaKondisiColumns((previous) => ({ ...previous, ...Object.fromEntries(keys.map((key) => [key, !isOpen])) }))}
                                      className="inline-flex h-8 items-center rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
                                    >
                                      {isOpen ? <ChevronDown className="mr-1 h-4 w-4" /> : <ChevronRight className="mr-1 h-4 w-4" />} {label}
                                    </button>
                                  );
                                })}
                                {([
                                  ["prelistAwal", "Prelist Awal"],
                                  ["prelistUsaha", "Jml Prelist Usaha"],
                                  ["didata", "Didata"],
                                  ["perusahaanDitemukan", "BKU Ditemukan"],
                                  ["perusahaanTutup", "BKU Tutup"],
                                  ["perusahaanGanda", "BKU Ganda"],
                                  ["perusahaanTidakDitemukan", "BKU Tidak Ditemukan"],
                                  ["perusahaanBaru", "BKU Baru"],
                                  ["perusahaanDitemukanBaru", "BKU Ditemukan + Baru"],
                                  ["keluargaDitemukan", "Keluarga Ditemukan"],
                                  ["keluargaTutup", "Keluarga Tutup"],
                                  ["keluargaGanda", "Keluarga Ganda"],
                                  ["keluargaTidakDitemukan", "Keluarga Tidak Ditemukan"],
                                  ["keluargaBaru", "Keluarga Baru"],
                                  ["keluargaDitemukanBaru", "Keluarga Ditemukan + Baru"],
                                  ["totalTidakDitemukan", "Total Tidak Ditemukan"],
                                  ["totalUsaha", "Total Usaha"],
                                  ["surplusDefisit", "Surplus / Defisit"],
                                ] as const).map(([key, label]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setUsahaKondisiColumns((previous) => ({ ...previous, [key]: !previous[key] }))}
                                    className={`inline-flex h-7 items-center rounded border px-2 text-xs ${usahaKondisiColumns[key] ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                                  >
                                    {usahaKondisiColumns[key] ? <ChevronDown className="mr-1 h-3.5 w-3.5" /> : <ChevronRight className="mr-1 h-3.5 w-3.5" />} {label}
                                  </button>
                                ))}
                              </div>
                              <Table>
                                <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                  <TableHead className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                                  <TableHead
                                    className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("nama_pml");
                                      setPmlSortOrder(pmlSortBy === "nama_pml" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center gap-2">Nama PML<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("kecamatan");
                                      setPmlSortOrder(pmlSortBy === "kecamatan" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center gap-2">Kecamatan<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("prelist_wilkerstat");
                                      setPmlSortOrder(pmlSortBy === "prelist_wilkerstat" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">Wilkerstat<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("prelist_awal");
                                      setPmlSortOrder(pmlSortBy === "prelist_awal" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">Prelist Awal<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("draft");
                                      setPmlSortOrder(pmlSortBy === "draft" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">Draft<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("persentase_draft");
                                      setPmlSortOrder(pmlSortBy === "persentase_draft" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">% Draft<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("responden_didata");
                                      setPmlSortOrder(pmlSortBy === "responden_didata" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">Didata<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("persentase_responden_didata");
                                      setPmlSortOrder(pmlSortBy === "persentase_responden_didata" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">% Didata<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("didata_netto");
                                      setPmlSortOrder(pmlSortBy === "didata_netto" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">Didata Netto<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("persentase_didata_netto");
                                      setPmlSortOrder(pmlSortBy === "persentase_didata_netto" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">% Didata Netto<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                  <TableHead
                                    className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                    onClick={() => {
                                      setPmlSortBy("persentase_wilkerstat");
                                      setPmlSortOrder(pmlSortBy === "persentase_wilkerstat" ? (pmlSortOrder === "asc" ? "desc" : "asc") : "asc");
                                    }}
                                  >
                                    <div className="flex items-center justify-end gap-2">% Wilkerstat<ArrowUpDown className="h-4 w-4" /></div>
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pmlPaginatedRows.map((pml, index) => {
                                  const rowNumber = (pmlCurrentPage - 1) * pmlItemsPerPage + index + 1;
                                  const isExpanded = expandedPML.has(pml.id);
                                  const respPct = parsePercentage(pml.persentase_responden_didata);
                                  return (
                                    <React.Fragment key={pml.id}>
                                      <TableRow className="hover:bg-slate-50 border-b transition-colors">
                                        <TableCell className="text-center text-slate-600 font-medium w-12 px-4 py-3">
                                          {rowNumber}
                                        </TableCell>
                                        <TableCell
                                          className="text-slate-700 px-4 py-3 cursor-pointer hover:text-blue-600"
                                          onClick={() => {
                                            setExpandedPML((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(pml.id)) next.delete(pml.id);
                                              else next.add(pml.id);
                                              return next;
                                            });
                                          }}
                                        >
                                          <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                              <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                            )}
                                            <span>{pml.nama_pml}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-slate-900 px-4 py-3">{pml.kecamatan}</TableCell>
                                        <TableCell className="text-right font-semibold text-blue-900 px-4 py-3">{parseNumericValue(pml.prelist_wilkerstat).toLocaleString("id-ID")}</TableCell>
                                        <TableCell className="text-right font-semibold text-blue-900 px-4 py-3">{parseNumericValue(pml.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                        <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(pml.draft).toLocaleString("id-ID")}</TableCell>
                                        <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{pml.persentase_draft}%</TableCell>
                                        <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(pml.responden_didata).toLocaleString("id-ID")}</TableCell>
                                          <TableCell className="text-right font-semibold px-4 py-3" style={{ color: getColorForPercentage(respPct) }}>{pml.persentase_responden_didata}%</TableCell>
                                          <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(pml.didata_netto).toLocaleString("id-ID")}</TableCell>
                                          <TableCell className="text-right font-semibold px-4 py-3" style={{ color: getColorForPercentage(parsePercentage(pml.persentase_didata_netto)) }}>{pml.persentase_didata_netto}%</TableCell>
                                          <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{pml.persentase_wilkerstat}%</TableCell>
                                      </TableRow>
                                      {isExpanded && pml.children.map((child, childIndex) => (
                                        <TableRow key={`${pml.id}-child-${childIndex}`} className="bg-slate-50 border-b hover:bg-slate-100 transition-colors">
                                          <TableCell className="px-4 py-2" />
                                          <TableCell className="text-sm text-slate-700 px-4 py-2 italic pl-8">{child.nama_ppl}</TableCell>
                                          <TableCell className="text-slate-700 px-4 py-2 min-w-[220px]">{pml.kecamatan}</TableCell>
                                          <TableCell className="text-right font-semibold text-blue-900 px-4 py-2">{parseNumericValue(child.prelist_wilkerstat).toLocaleString("id-ID")}</TableCell>
                                          <TableCell className="text-right font-semibold text-blue-900 px-4 py-2">{parseNumericValue(child.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                          <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(child.draft).toLocaleString("id-ID")}</TableCell>
                                          <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{child.persentase_draft}%</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(child.responden_didata).toLocaleString("id-ID")}</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 px-4 py-2" style={{ color: getColorForPercentage(parsePercentage(child.persentase_responden_didata)) }}>{child.persentase_responden_didata}%</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(child.didata_netto).toLocaleString("id-ID")}</TableCell>
                                            <TableCell className="text-right font-semibold px-4 py-2" style={{ color: getColorForPercentage(parsePercentage(child.persentase_didata_netto)) }}>{child.persentase_didata_netto}%</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{child.persentase_wilkerstat}%</TableCell>
                                        </TableRow>
                                      ))}
                                      </React.Fragment>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setPmlCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={pmlCurrentPage === 1}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                                  >
                                    Sebelumnya
                                  </button>
                                  <button
                                    onClick={() => setPmlCurrentPage((prev) => Math.min(pmlTotalPages, prev + 1))}
                                    disabled={pmlCurrentPage === pmlTotalPages}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                                  >
                                    Berikutnya
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
            <TabsContent value="pendataan-usaha" className="space-y-6 mt-6">
              <div className="space-y-4">
                <Tabs value={usahaSubTab} onValueChange={setUsahaSubTab}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Pendataan Usaha</h2>
                      <p className="text-sm text-slate-500">Kondisi usaha dan proporsi pertanian / non pertanian berdasarkan sheet usaha.</p>
                    </div>
                    <TabsList className="inline-flex h-auto w-full max-w-md gap-2 rounded-xl border border-slate-200/70 bg-white/80 p-1.5 shadow-inner">
                      <TabsTrigger
                        value="kondisi"
                        className="group flex-1 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-blue-200 hover:text-slate-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-blue-200"
                      >
                        Kondisi Keseluruhan
                      </TabsTrigger>
                      <TabsTrigger
                        value="proporsi"
                        className="group flex-1 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-emerald-200 hover:text-slate-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:border-emerald-200"
                      >
                        Proporsi Pertanian / Non Pertanian
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="kondisi" className="space-y-6 mt-6">

                    <div className="grid gap-4 md:grid-cols-1">
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                          {usahaLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                              <span className="ml-2 text-slate-600">Memuat data usaha...</span>
                            </div>
                          ) : usahaError ? (
                            <div className="flex items-center justify-center py-12 text-red-600">
                              <AlertCircle className="h-5 w-5 mr-2" />
                              Error: {usahaError}
                            </div>
                          ) : filteredMergedUsahaRows.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-slate-500">
                              <AlertCircle className="h-5 w-5 mr-2" />
                              Tidak ada data usaha yang sesuai.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="relative w-full max-w-md flex-1">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                  <Input
                                    placeholder="Cari Nama PPL, Kecamatan, atau kode..."
                                    value={usahaSearchTerm}
                                    onChange={(e) => {
                                      setUsahaSearchTerm(e.target.value);
                                      setUsahaKondisiPerusahaanCurrentPage(1);
                                      setUsahaKondisiKeluargaCurrentPage(1);
                                      setUsahaProporsiCurrentPage(1);
                                    }}
                                    className="pl-10 h-10 w-full"
                                  />
                                </div>
                                <select
                                  aria-label="Filter kecamatan kondisi keseluruhan"
                                  value={usahaKecamatanFilter}
                                  onChange={(event) => {
                                    setUsahaKecamatanFilter(event.target.value);
                                    setUsahaKondisiMergedCurrentPage(1);
                                  }}
                                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                                >
                                  <option value="all">Semua Kecamatan</option>
                                  {mergedUsahaKecamatanOptions.map((kecamatan) => (
                                    <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                                  ))}
                                </select>
                                <span className="text-sm font-medium text-slate-600">Kolom:</span>
                                <button type="button" onClick={() => setUsahaKondisiColumns(Object.fromEntries(Object.keys(usahaKondisiColumns).map((key) => [key, true])) as typeof usahaKondisiColumns)} className="inline-flex h-8 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100"><ChevronDown className="mr-1 h-4 w-4" /> Buka Semua</button>
                                <button type="button" onClick={() => setUsahaKondisiColumns(Object.fromEntries(Object.keys(usahaKondisiColumns).map((key) => [key, false])) as typeof usahaKondisiColumns)} className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700 hover:bg-slate-200"><ChevronRight className="mr-1 h-4 w-4" /> Tutup Semua</button>
                                {([
                                  ["prelistAwal", "Prelist Awal"], ["prelistUsaha", "Jml Prelist Usaha"], ["didata", "Didata"], ["bkuUsahaWilkerstatBaru", "Usaha Wilkerstat"],
                                  ["perusahaanDitemukan", "BKU Ditemukan"], ["perusahaanTutup", "BKU Tutup"], ["perusahaanGanda", "BKU Ganda"], ["perusahaanTidakDitemukan", "BKU Tidak Ditemukan"], ["perusahaanBaru", "BKU Baru"], ["perusahaanDitemukanBaru", "BKU Ditemukan + Baru"],
                                  ["keluargaDitemukan", "Keluarga Ditemukan"], ["keluargaTutup", "Keluarga Tutup"], ["keluargaGanda", "Keluarga Ganda"], ["keluargaTidakDitemukan", "Keluarga Tidak Ditemukan"], ["keluargaBaru", "Keluarga Baru"], ["keluargaDitemukanBaru", "Keluarga Ditemukan + Baru"],
                                  ["totalTidakDitemukan", "Total Tidak Ditemukan"], ["totalUsaha", "Total Usaha"], ["surplusDefisit", "Surplus / Defisit"],
                                ] as const).filter(([key]) => !usahaKondisiColumns[key]).map(([key, label]) => <button key={key} type="button" onClick={() => setUsahaKondisiColumns((previous) => ({ ...previous, [key]: true }))} className="inline-flex h-7 items-center rounded border border-slate-300 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50"><ChevronRight className="mr-1 h-3.5 w-3.5" /> {label}</button>)}
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b-2 border-slate-300">
                                    <TableHead rowSpan={2} className="sticky left-0 z-30 w-12 min-w-[48px] bg-slate-50 text-center text-slate-700 font-semibold">No</TableHead>
                                    <TableHead rowSpan={2} onClick={() => toggleMergedUsahaSort("nama_ppl")} className="sticky left-12 z-30 w-[180px] min-w-[180px] max-w-[180px] bg-slate-50 text-slate-700 font-semibold px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100">Nama PPL</TableHead>
                                    <TableHead rowSpan={2} onClick={() => toggleMergedUsahaSort("kecamatan")} className="sticky left-[228px] z-30 w-[220px] min-w-[220px] bg-slate-50 text-slate-700 font-semibold px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100">Kecamatan</TableHead>
                                    {usahaKondisiColumns.prelistAwal && kondisiSortHead("Prelist Awal", "prelist_awal_baru", "prelistAwal", "text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap", 2)}
                                    {usahaKondisiColumns.prelistUsaha && kondisiSortHead("Jml Prelist Usaha", "perusahaan_jumlah_prelist_usaha", "prelistUsaha", "text-right text-slate-700 font-semibold px-4 py-3", 2)}
                                    {usahaKondisiColumns.didata && kondisiSortHead("Didata", "didata", "didata", "text-right text-slate-700 font-semibold px-4 py-3", 2)}
                                    {usahaKondisiColumns.bkuUsahaWilkerstatBaru && kondisiSortHead("Usaha Wilkerstat", "bku_usaha_wilkerstat_baru", "bkuUsahaWilkerstatBaru", "w-[72px] min-w-[72px] max-w-[72px] text-right text-slate-700 font-semibold px-2 py-3 whitespace-normal break-words leading-tight", 2)}
                                    {bkuColumnKeys.some((key) => usahaKondisiColumns[key]) && <TableHead colSpan={bkuColumnKeys.filter((key) => usahaKondisiColumns[key]).length} onClick={() => setUsahaKondisiColumns((previous) => ({ ...previous, ...Object.fromEntries(bkuColumnKeys.map((key) => [key, false])) }))} className="text-center text-slate-700 font-semibold px-4 py-3 border border-slate-300 cursor-pointer hover:bg-slate-100" title="Sembunyikan kolom BKU">Bangunan Khusus Usaha (BKU)</TableHead>}
                                    {keluargaColumnKeys.some((key) => usahaKondisiColumns[key]) && <TableHead colSpan={keluargaColumnKeys.filter((key) => usahaKondisiColumns[key]).length} onClick={() => setUsahaKondisiColumns((previous) => ({ ...previous, ...Object.fromEntries(keluargaColumnKeys.map((key) => [key, false])) }))} className="text-center text-slate-700 font-semibold px-4 py-3 border border-slate-300 cursor-pointer hover:bg-slate-100" title="Sembunyikan kolom Usaha Keluarga">Usaha Keluarga</TableHead>}
                                    {usahaKondisiColumns.totalTidakDitemukan && kondisiSortHead("Total Usaha Tidak Ditemukan (BKU + Keluarga)", "total_tidak_ditemukan", "totalTidakDitemukan", "w-[88px] min-w-[88px] max-w-[88px] text-right text-[10px] leading-tight break-words text-rose-800 font-semibold px-1 py-1 bg-rose-50", 2)}
                                    {usahaKondisiColumns.totalUsaha && kondisiSortHead("Total Usaha (Ditemukan + Baru)", "total_usaha", "totalUsaha", "w-[88px] min-w-[88px] max-w-[88px] text-right text-[10px] leading-tight break-words text-sky-700 font-semibold px-1 py-1 bg-cyan-50", 2)}
                                    {usahaKondisiColumns.surplusDefisit && kondisiSortHead("Surplus / Defisit (Total Usaha - Tidak Ditemukan)", "surplus_defisit", "surplusDefisit", "w-[88px] min-w-[88px] max-w-[88px] text-right text-[10px] leading-tight break-words text-slate-700 font-semibold px-1 py-1", 2)}
                                  </TableRow>
                                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    {usahaKondisiColumns.perusahaanDitemukan && kondisiSortHead("Ditemukan", "perusahaan_ditemukan", "perusahaanDitemukan", "text-right text-slate-700 font-semibold px-4 py-3 bg-slate-100")}
                                    {usahaKondisiColumns.perusahaanTutup && kondisiSortHead("Tutup", "perusahaan_tutup", "perusahaanTutup", "text-right text-slate-700 font-semibold px-4 py-3 bg-slate-50")}
                                    {usahaKondisiColumns.perusahaanGanda && kondisiSortHead("Ganda", "perusahaan_ganda", "perusahaanGanda", "text-right text-slate-700 font-semibold px-4 py-3 bg-slate-100")}
                                    {usahaKondisiColumns.perusahaanTidakDitemukan && kondisiSortHead(<><span className="block">Tidak</span><span className="block">Ditemukan</span></>, "perusahaan_tidak_ditemukan", "perusahaanTidakDitemukan", "text-right text-rose-800 font-semibold px-2 py-3 w-14 whitespace-normal break-words border-r-2 border-slate-300 bg-rose-50")}
                                    {usahaKondisiColumns.perusahaanBaru && kondisiSortHead("Baru", "perusahaan_baru", "perusahaanBaru", "text-right text-slate-700 font-semibold px-3 py-3 bg-amber-50")}
                                    {usahaKondisiColumns.perusahaanDitemukanBaru && kondisiSortHead(<><span className="block">Ditemukan+</span><span className="block">Baru</span></>, "perusahaan_ditemukan_plus_baru", "perusahaanDitemukanBaru", "text-right font-semibold px-2 py-3 w-14 whitespace-normal break-words border-r-2 border-slate-300 bg-cyan-50 text-sky-700")}
                                    {usahaKondisiColumns.keluargaDitemukan && kondisiSortHead("Ditemukan", "keluarga_ditemukan", "keluargaDitemukan", "text-right text-slate-700 font-semibold px-4 py-3 bg-slate-100")}
                                    {usahaKondisiColumns.keluargaTutup && kondisiSortHead("Tutup", "keluarga_tutup", "keluargaTutup", "text-right text-slate-700 font-semibold px-4 py-3 bg-slate-50")}
                                    {usahaKondisiColumns.keluargaGanda && kondisiSortHead("Ganda", "keluarga_ganda", "keluargaGanda", "text-right text-slate-700 font-semibold px-4 py-3 bg-slate-100")}
                                    {usahaKondisiColumns.keluargaTidakDitemukan && kondisiSortHead(<><span className="block">Tidak</span><span className="block">Ditemukan</span></>, "keluarga_tidak_ditemukan", "keluargaTidakDitemukan", "text-right text-rose-800 font-semibold px-2 py-3 w-14 whitespace-normal break-words bg-rose-50")}
                                    {usahaKondisiColumns.keluargaBaru && kondisiSortHead("Baru", "keluarga_baru", "keluargaBaru", "text-right text-slate-700 font-semibold px-3 py-3 bg-amber-50")}
                                    {usahaKondisiColumns.keluargaDitemukanBaru && kondisiSortHead(<><span className="block">Ditemukan+</span><span className="block">Baru</span></>, "keluarga_ditemukan_plus_baru", "keluargaDitemukanBaru", "text-right font-semibold px-2 py-3 w-14 whitespace-normal break-words bg-cyan-50 text-sky-700")}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {usahaMergedPaginatedRows.map((row, index) => {
                                    const rowNumber = (usahaKondisiMergedCurrentPage - 1) * usahaItemsPerPage + index + 1;
                                    const isExpanded = expandedMergedUsaha.has(row.id);
                                    const totalTidakDitemukan = parseNumericValue(row.perusahaan_tidak_ditemukan) + parseNumericValue(row.keluarga_tidak_ditemukan);
                                    const totalUsaha = parseNumericValue(row.perusahaan_ditemukan) + parseNumericValue(row.perusahaan_baru) + parseNumericValue(row.keluarga_ditemukan) + parseNumericValue(row.keluarga_baru);
                                    const surplusDefisit = totalUsaha - totalTidakDitemukan;
                                    const jmlPrelistUsaha = parseNumericValue(row.perusahaan_jumlah_prelist_usaha);
                                    const persentaseTidakDitemukan = jmlPrelistUsaha > 0 ? (totalTidakDitemukan / jmlPrelistUsaha) * 100 : 0;
                                    const persentaseTotalUsaha = jmlPrelistUsaha > 0 ? (totalUsaha / jmlPrelistUsaha) * 100 : 0;
                                    return (
                                      <React.Fragment key={row.id}>
                                        <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                          <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-white text-center text-slate-600 font-medium">{rowNumber}</TableCell>
                                          <TableCell
                                            className="sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-white text-slate-700 px-4 py-3 cursor-pointer hover:text-blue-600 flex items-center gap-2 whitespace-nowrap"
                                            onClick={() => {
                                              setExpandedMergedUsaha((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(row.id)) next.delete(row.id);
                                                else next.add(row.id);
                                                return next;
                                              });
                                            }}
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="h-4 w-4 inline flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 inline flex-shrink-0" />
                                            )}
                                            <span>{row.nama_ppl}</span>
                                          </TableCell>
                                          <TableCell className="sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-white text-slate-900 px-4 py-3 whitespace-nowrap">{row.kecamatan}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.prelistAwal} className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.prelist_awal_baru).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.prelistUsaha} className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.perusahaan_jumlah_prelist_usaha).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.didata} className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.didata).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.bkuUsahaWilkerstatBaru} className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-slate-900 px-2 py-3 whitespace-normal break-words leading-tight">{parseNumericValue(row.bku_usaha_wilkerstat_baru).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.perusahaanDitemukan} className="text-right font-semibold text-slate-900 px-4 py-3 bg-slate-100">{parseNumericValue(row.perusahaan_ditemukan).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.perusahaanTutup} className="text-right font-semibold text-slate-900 px-4 py-3 bg-slate-50">{parseNumericValue(row.perusahaan_tutup).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.perusahaanGanda} className="text-right font-semibold text-slate-900 px-4 py-3 bg-slate-100">{parseNumericValue(row.perusahaan_ganda).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.perusahaanTidakDitemukan} className="text-right font-semibold text-rose-800 px-2 py-3 w-14 whitespace-nowrap bg-rose-50">{parseNumericValue(row.perusahaan_tidak_ditemukan).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.perusahaanBaru} className="text-right font-semibold text-slate-900 px-3 py-3 bg-amber-50">{parseNumericValue(row.perusahaan_baru).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.perusahaanDitemukanBaru} className="text-right font-semibold px-2 py-3 w-14 whitespace-nowrap bg-cyan-50 text-sky-700">{parseNumericValue(row.perusahaan_ditemukan_plus_baru).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.keluargaDitemukan} className="text-right font-semibold text-slate-900 px-4 py-3 bg-slate-100">{parseNumericValue(row.keluarga_ditemukan).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.keluargaTutup} className="text-right font-semibold text-slate-900 px-4 py-3 bg-slate-50">{parseNumericValue(row.keluarga_tutup).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.keluargaGanda} className="text-right font-semibold text-slate-900 px-4 py-3 bg-slate-100">{parseNumericValue(row.keluarga_ganda).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.keluargaTidakDitemukan} className="text-right font-semibold text-rose-800 px-2 py-3 w-14 whitespace-nowrap bg-rose-50">{parseNumericValue(row.keluarga_tidak_ditemukan).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.keluargaBaru} className="text-right font-semibold text-slate-900 px-3 py-3 bg-amber-50">{parseNumericValue(row.keluarga_baru).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.keluargaDitemukanBaru} className="text-right font-semibold px-2 py-3 w-14 whitespace-nowrap bg-cyan-50 text-sky-700">{parseNumericValue(row.keluarga_ditemukan_plus_baru).toLocaleString("id-ID")}</TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.totalTidakDitemukan} className="text-right font-semibold text-rose-800 px-4 py-3 bg-rose-50"><div>{totalTidakDitemukan.toLocaleString("id-ID")}</div><div className="text-xs font-medium text-rose-700">{persentaseTidakDitemukan.toFixed(2).replace(".", ",")}%</div></TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.totalUsaha} className="text-right font-semibold text-sky-700 px-4 py-3 bg-cyan-50"><div>{totalUsaha.toLocaleString("id-ID")}</div><div className="text-xs font-medium text-sky-700">{persentaseTotalUsaha.toFixed(2).replace(".", ",")}%</div></TableCell>
                                          <TableCell hidden={!usahaKondisiColumns.surplusDefisit} className={`text-right font-semibold px-4 py-3 ${surplusDefisit < 0 ? "text-rose-800" : "text-emerald-700"}`}>{surplusDefisit.toLocaleString("id-ID")}</TableCell>
                                        </TableRow>
                                        {isExpanded && row.details.map((detail) => (
                                          <TableRow key={detail.id} className="border-b border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-slate-50 px-4 py-2" />
                                            <TableCell className="sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-slate-50 text-sm text-slate-700 px-4 py-2 italic pl-8">{detail.sls_code}</TableCell>
                                            <TableCell className="sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-slate-50 text-sm text-slate-600 px-4 py-2">{detail.sls_rt}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.prelistAwal} className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.prelist_awal_baru).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.prelistUsaha} className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.perusahaan_jumlah_prelist_usaha).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.didata} className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.didata).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.bkuUsahaWilkerstatBaru} className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-slate-900 px-2 py-2 whitespace-normal break-words leading-tight">{parseNumericValue(detail.bku_usaha_wilkerstat_baru).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.perusahaanDitemukan} className="text-right font-semibold text-slate-900 px-4 py-2 bg-slate-100">{parseNumericValue(detail.perusahaan_ditemukan).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.perusahaanTutup} className="text-right font-semibold text-slate-900 px-4 py-2 bg-slate-50">{parseNumericValue(detail.perusahaan_tutup).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.perusahaanGanda} className="text-right font-semibold text-slate-900 px-4 py-2 bg-slate-100">{parseNumericValue(detail.perusahaan_ganda).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.perusahaanTidakDitemukan} className="text-right font-semibold text-rose-800 px-2 py-2 w-14 whitespace-nowrap bg-rose-50">{parseNumericValue(detail.perusahaan_tidak_ditemukan).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.perusahaanBaru} className="text-right font-semibold text-slate-900 px-3 py-2 bg-amber-50">{parseNumericValue(detail.perusahaan_baru).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.perusahaanDitemukanBaru} className="text-right font-semibold px-2 py-2 w-14 whitespace-nowrap bg-cyan-50 text-sky-700">{parseNumericValue(detail.perusahaan_ditemukan_plus_baru).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.keluargaDitemukan} className="text-right font-semibold text-slate-900 px-4 py-2 bg-slate-100">{parseNumericValue(detail.keluarga_ditemukan).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.keluargaTutup} className="text-right font-semibold text-slate-900 px-4 py-2 bg-slate-50">{parseNumericValue(detail.keluarga_tutup).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.keluargaGanda} className="text-right font-semibold text-slate-900 px-4 py-2 bg-slate-100">{parseNumericValue(detail.keluarga_ganda).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.keluargaTidakDitemukan} className="text-right font-semibold text-rose-800 px-2 py-2 w-14 whitespace-nowrap bg-rose-50">{parseNumericValue(detail.keluarga_tidak_ditemukan).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.keluargaBaru} className="text-right font-semibold text-slate-900 px-3 py-2 bg-amber-50">{parseNumericValue(detail.keluarga_baru).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.keluargaDitemukanBaru} className="text-right font-semibold px-2 py-2 w-14 whitespace-nowrap bg-cyan-50 text-sky-700">{parseNumericValue(detail.keluarga_ditemukan_plus_baru).toLocaleString("id-ID")}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.totalTidakDitemukan} className="text-right font-semibold text-rose-800 px-4 py-2 bg-rose-50">{(() => { const prelist = parseNumericValue(detail.perusahaan_jumlah_prelist_usaha); const total = parseNumericValue(detail.perusahaan_tidak_ditemukan) + parseNumericValue(detail.keluarga_tidak_ditemukan); return <><div>{total.toLocaleString("id-ID")}</div><div className="text-xs font-medium text-rose-700">{(prelist > 0 ? (total / prelist) * 100 : 0).toFixed(2).replace(".", ",")}%</div></>; })()}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.totalUsaha} className="text-right font-semibold text-sky-700 px-4 py-2 bg-cyan-50">{(() => { const prelist = parseNumericValue(detail.perusahaan_jumlah_prelist_usaha); const total = parseNumericValue(detail.perusahaan_ditemukan) + parseNumericValue(detail.perusahaan_baru) + parseNumericValue(detail.keluarga_ditemukan) + parseNumericValue(detail.keluarga_baru); return <><div>{total.toLocaleString("id-ID")}</div><div className="text-xs font-medium text-sky-700">{(prelist > 0 ? (total / prelist) * 100 : 0).toFixed(2).replace(".", ",")} %</div></>; })()}</TableCell>
                                            <TableCell hidden={!usahaKondisiColumns.surplusDefisit} className="text-right font-semibold text-slate-700 px-4 py-2">{(parseNumericValue(detail.perusahaan_ditemukan) + parseNumericValue(detail.perusahaan_baru) + parseNumericValue(detail.keluarga_ditemukan) + parseNumericValue(detail.keluarga_baru) - parseNumericValue(detail.perusahaan_tidak_ditemukan) - parseNumericValue(detail.keluarga_tidak_ditemukan)).toLocaleString("id-ID")}</TableCell>
                                          </TableRow>
                                        ))}
                                      </React.Fragment>
                                    );
                                  })}
                                  {renderMergedUsahaSummaryRow("Jumlah sesuai tampilan pagination", paginatedMergedUsahaSummary)}
                                  {renderMergedUsahaSummaryRow("Jumlah total keseluruhan", totalMergedUsahaSummary)}
                                </TableBody>
                              </Table>
                              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <span>Per halaman:</span>
                                  <select
                                    value={usahaItemsPerPage}
                                    onChange={(e) => {
                                      setUsahaItemsPerPage(Number(e.target.value));
                                      setUsahaKondisiMergedCurrentPage(1);
                                    }}
                                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                                  >
                                    {[10, 20, 50, 100].map((size) => (
                                      <option key={size} value={size}>{size}</option>
                                    ))}
                                  </select>
                                  <span>Hal {usahaKondisiMergedCurrentPage} dari {usahaMergedTotalPages}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setUsahaKondisiMergedCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={usahaKondisiMergedCurrentPage === 1}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                                  >
                                    Sebelumnya
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUsahaKondisiMergedCurrentPage((prev) => Math.min(usahaMergedTotalPages, prev + 1))}
                                    disabled={usahaKondisiMergedCurrentPage === usahaMergedTotalPages}
                                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                                  >
                                    Berikutnya
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="proporsi" className="space-y-6 mt-6">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-0">
                        {usahaLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="ml-2 text-slate-600">Memuat data proporsi usaha...</span>
                          </div>
                        ) : usahaError ? (
                          <div className="flex items-center justify-center py-12 text-red-600">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Error: {usahaError}
                          </div>
                        ) : filteredUsahaProporsiRows.length === 0 ? (
                          <div className="flex items-center justify-center py-12 text-slate-500">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Tidak ada data proporsi usaha.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <div className="flex flex-wrap items-center gap-3 border-b bg-slate-50 px-4 py-3">
                              <div className="relative w-full max-w-md flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  placeholder="Cari Nama PPL atau Kecamatan..."
                                  value={usahaSearchTerm}
                                  onChange={(event) => {
                                    setUsahaSearchTerm(event.target.value);
                                    setUsahaProporsiCurrentPage(1);
                                  }}
                                  className="pl-10 h-10 w-full"
                                />
                              </div>
                              <select
                                aria-label="Filter kecamatan proporsi"
                                value={proporsiKecamatanFilter}
                                onChange={(event) => {
                                  setProporsiKecamatanFilter(event.target.value);
                                  setUsahaProporsiCurrentPage(1);
                                }}
                                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                              >
                                <option value="all">Semua Kecamatan</option>
                                {proporsiKecamatanOptions.map((kecamatan) => (
                                  <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                                ))}
                              </select>
                              <span className="text-sm font-medium text-slate-600">Kolom:</span>
                              <button
                                type="button"
                                onClick={() => setProporsiColumnGroups({ dasar: true, prelistAwal: true, prelistUsaha: true, utpSt2023: true, bkuUsahaWilkerstat: true, didata: true, bkuDitemukanPertanian: true, bkuDitemukanNonPertanian: true, bkuBaruPertanian: true, bkuBaruNonPertanian: true, keluargaDitemukanPertanian: true, keluargaDitemukanNonPertanian: true, keluargaBaruPertanian: true, keluargaBaruNonPertanian: true, ringkasan: true })}
                                className="inline-flex h-8 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                              >
                                <ChevronDown className="mr-1 h-4 w-4" /> Buka Semua
                              </button>
                              <button
                                type="button"
                                onClick={() => setProporsiColumnGroups({ dasar: true, prelistAwal: false, prelistUsaha: false, utpSt2023: false, bkuUsahaWilkerstat: false, didata: false, bkuDitemukanPertanian: false, bkuDitemukanNonPertanian: false, bkuBaruPertanian: false, bkuBaruNonPertanian: false, keluargaDitemukanPertanian: false, keluargaDitemukanNonPertanian: false, keluargaBaruPertanian: false, keluargaBaruNonPertanian: false, ringkasan: false })}
                                className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
                              >
                                <ChevronRight className="mr-1 h-4 w-4" /> Tutup Semua
                              </button>
                              <div className="flex flex-wrap items-center gap-1">
                                {([
                                  ["bkuDitemukanPertanian", "Ditemukan Pertanian (BKU)"],
                                  ["bkuDitemukanNonPertanian", "Ditemukan Non Pertanian (BKU)"],
                                  ["bkuBaruPertanian", "Baru Pertanian (BKU)"],
                                  ["bkuBaruNonPertanian", "Baru Non Pertanian (BKU)"],
                                  ["keluargaDitemukanPertanian", "Ditemukan Pertanian (Keluarga)"],
                                  ["keluargaDitemukanNonPertanian", "Ditemukan Non Pertanian (Keluarga)"],
                                  ["keluargaBaruPertanian", "Baru Pertanian (Keluarga)"],
                                  ["keluargaBaruNonPertanian", "Baru Non Pertanian (Keluarga)"],
                                  ["prelistAwal", "Prelist Awal"],
                                  ["prelistUsaha", "Prelist Usaha"],
                                  ["utpSt2023", "UTP ST2023"],
                                  ["didata", "Didata"],
                                ] as const).filter(([key]) => !proporsiColumnGroups[key]).map(([key, label]) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setProporsiColumnGroups((previous) => ({ ...previous, [key]: true }))}
                                    className="inline-flex h-7 items-center rounded border border-slate-300 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50"
                                  >
                                    <ChevronRight className="mr-1 h-3.5 w-3.5" /> {label}
                                  </button>
                                ))}
                              </div>
                              {isPpk && (
                                <div className="ml-auto flex flex-wrap items-center gap-2">
                                  <select
                                    aria-label="Tingkat rekap ekspor Excel"
                                    value={proporsiExportMode}
                                    onChange={(event) => setProporsiExportMode(event.target.value as ProporsiExportMode)}
                                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700"
                                  >
                                    <option value="kecamatan">Kecamatan</option>
                                    <option value="ppl">PPL</option>
                                    <option value="sls">SLS</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={handleDownloadProporsiExcel}
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download Excel
                                  </button>
                                </div>
                              )}
                            </div>
                            <Table className="text-xs [&_th]:whitespace-normal [&_th]:break-words [&_th]:leading-tight [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2">
                              <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                  <TableHead rowSpan={2} className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                                  <TableHead colSpan={2 + [proporsiColumnGroups.prelistAwal, proporsiColumnGroups.prelistUsaha, proporsiColumnGroups.utpSt2023, proporsiColumnGroups.bkuUsahaWilkerstat, proporsiColumnGroups.didata].filter(Boolean).length} className="text-center font-bold border bg-slate-200 text-slate-700">
                                    <div className="flex items-center justify-center py-1 px-2">Identitas & Dasar</div>
                                  </TableHead>
                                  {[
                                    proporsiColumnGroups.bkuDitemukanPertanian,
                                    proporsiColumnGroups.bkuDitemukanNonPertanian,
                                    proporsiColumnGroups.bkuBaruPertanian,
                                    proporsiColumnGroups.bkuBaruNonPertanian,
                                  ].filter(Boolean).length > 0 && (
                                    <TableHead
                                      colSpan={[
                                        proporsiColumnGroups.bkuDitemukanPertanian,
                                        proporsiColumnGroups.bkuDitemukanNonPertanian,
                                        proporsiColumnGroups.bkuBaruPertanian,
                                        proporsiColumnGroups.bkuBaruNonPertanian,
                                      ].filter(Boolean).length}
                                      className="text-center font-bold border bg-orange-200 text-orange-800 cursor-pointer select-none transition-all hover:shadow-md hover:opacity-90"
                                      onClick={() => {
                                        const allVisible = [
                                          proporsiColumnGroups.bkuDitemukanPertanian,
                                          proporsiColumnGroups.bkuDitemukanNonPertanian,
                                          proporsiColumnGroups.bkuBaruPertanian,
                                          proporsiColumnGroups.bkuBaruNonPertanian,
                                        ].every(Boolean);
                                        setProporsiColumnGroups((previous) => ({
                                          ...previous,
                                          bkuDitemukanPertanian: !allVisible,
                                          bkuDitemukanNonPertanian: !allVisible,
                                          bkuBaruPertanian: !allVisible,
                                          bkuBaruNonPertanian: !allVisible,
                                        }));
                                      }}
                                      title={`Klik untuk ${[
                                        proporsiColumnGroups.bkuDitemukanPertanian,
                                        proporsiColumnGroups.bkuDitemukanNonPertanian,
                                        proporsiColumnGroups.bkuBaruPertanian,
                                        proporsiColumnGroups.bkuBaruNonPertanian,
                                      ].every(Boolean)
                                        ? "tutup"
                                        : "buka"} kolom Usaha BKU`}
                                    >
                                      <div className="flex items-center justify-center gap-2 py-1 px-2">
                                        Usaha BKU
                                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${[
                                          proporsiColumnGroups.bkuDitemukanPertanian,
                                          proporsiColumnGroups.bkuDitemukanNonPertanian,
                                          proporsiColumnGroups.bkuBaruPertanian,
                                          proporsiColumnGroups.bkuBaruNonPertanian,
                                        ].every(Boolean) ? "" : "-rotate-90"}`} />
                                      </div>
                                    </TableHead>
                                  )}
                                  {[
                                    proporsiColumnGroups.keluargaDitemukanPertanian,
                                    proporsiColumnGroups.keluargaDitemukanNonPertanian,
                                    proporsiColumnGroups.keluargaBaruPertanian,
                                    proporsiColumnGroups.keluargaBaruNonPertanian,
                                  ].filter(Boolean).length > 0 && (
                                    <TableHead
                                      colSpan={[
                                        proporsiColumnGroups.keluargaDitemukanPertanian,
                                        proporsiColumnGroups.keluargaDitemukanNonPertanian,
                                        proporsiColumnGroups.keluargaBaruPertanian,
                                        proporsiColumnGroups.keluargaBaruNonPertanian,
                                      ].filter(Boolean).length}
                                      className="text-center font-bold border bg-blue-200 text-blue-800 cursor-pointer select-none transition-all hover:shadow-md hover:opacity-90"
                                      onClick={() => {
                                        const allVisible = [
                                          proporsiColumnGroups.keluargaDitemukanPertanian,
                                          proporsiColumnGroups.keluargaDitemukanNonPertanian,
                                          proporsiColumnGroups.keluargaBaruPertanian,
                                          proporsiColumnGroups.keluargaBaruNonPertanian,
                                        ].every(Boolean);
                                        setProporsiColumnGroups((previous) => ({
                                          ...previous,
                                          keluargaDitemukanPertanian: !allVisible,
                                          keluargaDitemukanNonPertanian: !allVisible,
                                          keluargaBaruPertanian: !allVisible,
                                          keluargaBaruNonPertanian: !allVisible,
                                        }));
                                      }}
                                      title={`Klik untuk ${[
                                        proporsiColumnGroups.keluargaDitemukanPertanian,
                                        proporsiColumnGroups.keluargaDitemukanNonPertanian,
                                        proporsiColumnGroups.keluargaBaruPertanian,
                                        proporsiColumnGroups.keluargaBaruNonPertanian,
                                      ].every(Boolean)
                                        ? "tutup"
                                        : "buka"} kolom Usaha Dalam Keluarga`}
                                    >
                                      <div className="flex items-center justify-center gap-2 py-1 px-2">
                                        Usaha Dalam Keluarga
                                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${[
                                          proporsiColumnGroups.keluargaDitemukanPertanian,
                                          proporsiColumnGroups.keluargaDitemukanNonPertanian,
                                          proporsiColumnGroups.keluargaBaruPertanian,
                                          proporsiColumnGroups.keluargaBaruNonPertanian,
                                        ].every(Boolean) ? "" : "-rotate-90"}`} />
                                      </div>
                                    </TableHead>
                                  )}
                                  <TableHead colSpan={proporsiColumnGroups.ringkasan ? 4 : 0} className={`text-center font-bold border bg-emerald-200 text-emerald-800 cursor-pointer select-none transition-all hover:shadow-md hover:opacity-90 ${proporsiColumnGroups.ringkasan ? "" : "hidden"}`} onClick={() => setProporsiColumnGroups((previous) => ({ ...previous, ringkasan: !previous.ringkasan }))} title={`Klik untuk ${proporsiColumnGroups.ringkasan ? "tutup" : "buka"} kolom ringkasan`}>
                                    <div className="flex items-center justify-center gap-2 py-1 px-2">Ringkasan<ChevronDown className={`h-4 w-4 transition-transform duration-200 ${proporsiColumnGroups.ringkasan ? "" : "-rotate-90"}`} /></div>
                                  </TableHead>
                                </TableRow>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                  {proporsiColumnGroups.dasar && <>
                                    {proporsiSortHead("Nama PPL", "nama_ppl", "text-slate-700 font-semibold px-4 py-3")}
                                    {proporsiSortHead("Kecamatan", "kecamatan", "text-slate-700 font-semibold px-4 py-3")}
                                    {proporsiColumnGroups.prelistAwal && proporsiSortHead("Prelist Awal", "prelist_awal", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-slate-700 font-semibold px-1 py-2", 1, "prelistAwal")}
                                    {proporsiColumnGroups.prelistUsaha && proporsiSortHead("Prelist Usaha", "prelist_usaha", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-blue-700 font-bold px-1 py-2", 1, "prelistUsaha")}
                                    {proporsiColumnGroups.utpSt2023 && proporsiSortHead("UTP ST2023", "utp_subsektor_st2023", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-green-700 font-bold px-1 py-2", 1, "utpSt2023")}
                                    {proporsiColumnGroups.bkuUsahaWilkerstat && proporsiSortHead("Usaha Wilkerstat", "bku_usaha_wilkerstat_baru", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right font-bold px-1 py-2", 1, "bkuUsahaWilkerstat")}
                                    {proporsiColumnGroups.didata && proporsiSortHead("Didata", "didata", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-orange-800 font-bold px-1 py-2", 1, "didata")}
                                    </>}
                                  <>
                                    {proporsiColumnGroups.bkuDitemukanPertanian && proporsiSortHead("Ditemukan Pertanian", "bku_ditemukan_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-emerald-600 font-semibold px-1 py-2", 1, "bkuDitemukanPertanian")}
                                    {proporsiColumnGroups.bkuDitemukanNonPertanian && proporsiSortHead("Ditemukan Non Pertanian", "bku_ditemukan_non_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-blue-600 font-semibold px-1 py-2", 1, "bkuDitemukanNonPertanian")}
                                    {proporsiColumnGroups.bkuBaruPertanian && proporsiSortHead("Baru Pertanian", "bku_baru_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-emerald-600 font-semibold px-1 py-2", 1, "bkuBaruPertanian")}
                                    {proporsiColumnGroups.bkuBaruNonPertanian && proporsiSortHead("Baru Non Pertanian", "bku_baru_non_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-blue-600 font-semibold px-1 py-2", 1, "bkuBaruNonPertanian")}
                                    </>
                                  <>
                                    {proporsiColumnGroups.keluargaDitemukanPertanian && proporsiSortHead("Ditemukan Pertanian", "keluarga_ditemukan_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-emerald-600 font-semibold px-1 py-2", 1, "keluargaDitemukanPertanian")}
                                    {proporsiColumnGroups.keluargaDitemukanNonPertanian && proporsiSortHead("Ditemukan Non Pertanian", "keluarga_ditemukan_non_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-blue-600 font-semibold px-1 py-2", 1, "keluargaDitemukanNonPertanian")}
                                    {proporsiColumnGroups.keluargaBaruPertanian && proporsiSortHead("Baru Pertanian", "keluarga_baru_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-emerald-600 font-semibold px-1 py-2", 1, "keluargaBaruPertanian")}
                                    {proporsiColumnGroups.keluargaBaruNonPertanian && proporsiSortHead("Baru Non Pertanian", "keluarga_baru_non_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right text-blue-600 font-semibold px-1 py-2", 1, "keluargaBaruNonPertanian")}
                                    </>
                                  {proporsiColumnGroups.ringkasan && <>
                                    {proporsiSortHead("Jumlah Usaha Non Pertanian", "jumlah_usaha", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right font-semibold px-1 py-2 border-l-2 border-slate-300")}
                                    {proporsiSortHead("% Non Pertanian - Prelist Usaha", "persen_non_pertanian_prelist", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right font-semibold px-1 py-2 border-l-2 border-slate-300")}
                                    {proporsiSortHead("% Non Pertanian - Wilkerstat", "persen_non_pertanian_wilkerstat", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right font-semibold px-1 py-2 border-l-2 border-slate-300")}
                                    {proporsiSortHead("Jumlah Usaha Pertanian", "jumlah_usaha_pertanian", "w-[72px] min-w-[72px] max-w-[72px] text-[10px] leading-tight text-right font-semibold px-1 py-2 border-l-2 border-slate-300")}
                                  </>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {usahaProporsiPaginatedRows.map((row, index) => {
                                  const rowNumber = (usahaProporsiCurrentPage - 1) * usahaItemsPerPage + index + 1;
                                  const isExpanded = expandedUsahaProporsi.has(row.id);
                                  const jumlahUsaha = [
                                    row.bku_ditemukan_non_pertanian,
                                    row.bku_baru_non_pertanian,
                                    row.keluarga_ditemukan_non_pertanian,
                                    row.keluarga_baru_non_pertanian,
                                  ].reduce((total, value) => total + parseNumericValue(value), 0);
                                  const jumlahUsahaPertanian = [
                                    row.bku_ditemukan_pertanian,
                                    row.bku_baru_pertanian,
                                    row.keluarga_ditemukan_pertanian,
                                    row.keluarga_baru_pertanian,
                                  ].reduce((total, value) => total + parseNumericValue(value), 0);
                                  return (
                                    <React.Fragment key={row.id}>
                                      <TableRow className="hover:bg-slate-50 border-b transition-colors">
                                        <TableCell className="text-center text-slate-600 font-medium w-12">{rowNumber}</TableCell>
                                        <TableCell
                                          className="text-slate-900 px-4 py-3 cursor-pointer hover:text-blue-600 flex items-center gap-2 whitespace-nowrap"
                                          onClick={() => {
                                            setExpandedUsahaProporsi((previous) => {
                                              const next = new Set(previous);
                                              if (next.has(row.id)) next.delete(row.id);
                                              else next.add(row.id);
                                              return next;
                                            });
                                          }}
                                        >
                                          {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                                          <span>{row.nama_ppl}</span>
                                        </TableCell>
                                        {proporsiColumnGroups.dasar && <>
                                          <TableCell className="text-slate-900 px-4 py-3 whitespace-nowrap">{row.kecamatan}</TableCell>
                                          {proporsiColumnGroups.prelistAwal && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-slate-900 px-1 py-2">{parseNumericValue(row.prelist_awal).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.prelistUsaha && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-blue-700 px-1 py-2">{parseNumericValue(row.prelist_usaha).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.utpSt2023 && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-green-700 px-1 py-2">{parseNumericValue(row.utp_subsektor_st2023).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.bkuUsahaWilkerstat && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold px-1 py-2">{parseNumericValue(row.bku_usaha_wilkerstat_baru).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.didata && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-orange-800 px-1 py-2">{parseNumericValue(row.didata).toLocaleString("id-ID")}</TableCell>}
                                        </>}
                                        <>
                                          {proporsiColumnGroups.bkuDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{parseNumericValue(row.bku_ditemukan_pertanian).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.bkuDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(row.bku_ditemukan_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.bkuBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2">{parseNumericValue(row.bku_baru_pertanian).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.bkuBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(row.bku_baru_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                        </>
                                        <>
                                          {proporsiColumnGroups.keluargaDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{parseNumericValue(row.keluarga_ditemukan_pertanian).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.keluargaDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(row.keluarga_ditemukan_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.keluargaBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2">{parseNumericValue(row.keluarga_baru_pertanian).toLocaleString("id-ID")}</TableCell>}
                                          {proporsiColumnGroups.keluargaBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(row.keluarga_baru_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                        </>
                                        {proporsiColumnGroups.ringkasan && <>
                                      <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                        <div className="font-semibold text-slate-900">{jumlahUsaha.toLocaleString("id-ID")}</div>
                                      </TableCell>
                                      <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                        <div className={`font-semibold ${getProporsiPercentageClass(jumlahUsaha, parseNumericValue(row.prelist_usaha))}`}>{formatProporsiPercentage(jumlahUsaha, parseNumericValue(row.prelist_usaha))}</div>
                                      </TableCell>
                                      <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                        <div className={`font-semibold ${getProporsiPercentageClass(jumlahUsaha, parseNumericValue(row.bku_usaha_wilkerstat_baru))}`}>{formatProporsiPercentage(jumlahUsaha, parseNumericValue(row.bku_usaha_wilkerstat_baru))}</div>
                                      </TableCell>
                                      <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                        <div className="font-semibold text-slate-900">{jumlahUsahaPertanian.toLocaleString("id-ID")}</div>
                                        <div className={`text-xs font-medium ${getProporsiPercentageClass(jumlahUsahaPertanian, parseNumericValue(row.utp_subsektor_st2023))}`}>
                                          {formatProporsiPercentage(jumlahUsahaPertanian, parseNumericValue(row.utp_subsektor_st2023))}
                                        </div>
                                      </TableCell>
                                        </>}
                                      </TableRow>
                                      {isExpanded && row.children.map((detail) => (
                                        <TableRow key={detail.id} className="border-b border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                                          <TableCell className="px-4 py-2" />
                                          <TableCell className="text-sm text-slate-700 px-4 py-2 italic pl-8">{detail.kode}</TableCell>
                                          {proporsiColumnGroups.dasar && <>
                                            <TableCell className="text-sm text-slate-600 px-4 py-2">{detail.sls_rt}</TableCell>
                                            {proporsiColumnGroups.prelistAwal && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-slate-900 px-1 py-2">{parseNumericValue(detail.prelist_awal).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.prelistUsaha && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-blue-700 px-1 py-2">{parseNumericValue(detail.prelist_usaha).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.utpSt2023 && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-green-700 px-1 py-2">{parseNumericValue(detail.utp_subsektor_st2023).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.bkuUsahaWilkerstat && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold px-1 py-2">{parseNumericValue(detail.bku_usaha_wilkerstat_baru).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.didata && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-orange-800 px-1 py-2">{parseNumericValue(detail.didata).toLocaleString("id-ID")}</TableCell>}
                                          </>}
                                          <>
                                            {proporsiColumnGroups.bkuDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{parseNumericValue(detail.bku_ditemukan_pertanian).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.bkuDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(detail.bku_ditemukan_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.bkuBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2">{parseNumericValue(detail.bku_baru_pertanian).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.bkuBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(detail.bku_baru_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                          </>
                                          <>
                                            {proporsiColumnGroups.keluargaDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{parseNumericValue(detail.keluarga_ditemukan_pertanian).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.keluargaDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(detail.keluarga_ditemukan_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.keluargaBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-emerald-600 px-1 py-2">{parseNumericValue(detail.keluarga_baru_pertanian).toLocaleString("id-ID")}</TableCell>}
                                            {proporsiColumnGroups.keluargaBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-semibold text-blue-600 px-1 py-2">{parseNumericValue(detail.keluarga_baru_non_pertanian).toLocaleString("id-ID")}</TableCell>}
                                            </>
                                          {proporsiColumnGroups.ringkasan && <>
                                          <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                            <div className="font-semibold text-slate-900">{[
                                              detail.bku_ditemukan_non_pertanian,
                                              detail.bku_baru_non_pertanian,
                                              detail.keluarga_ditemukan_non_pertanian,
                                              detail.keluarga_baru_non_pertanian,
                                            ].reduce((total, value) => total + parseNumericValue(value), 0).toLocaleString("id-ID")}</div>
                                          </TableCell>
                                          <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                            <div className={`font-semibold ${getProporsiPercentageClass(
                                              [detail.bku_ditemukan_non_pertanian, detail.bku_baru_non_pertanian, detail.keluarga_ditemukan_non_pertanian, detail.keluarga_baru_non_pertanian].reduce((total, value) => total + parseNumericValue(value), 0),
                                              parseNumericValue(detail.prelist_usaha)
                                            )}`}>{formatProporsiPercentage(
                                              [detail.bku_ditemukan_non_pertanian, detail.bku_baru_non_pertanian, detail.keluarga_ditemukan_non_pertanian, detail.keluarga_baru_non_pertanian].reduce((total, value) => total + parseNumericValue(value), 0),
                                              parseNumericValue(detail.prelist_usaha)
                                            )}</div>
                                          </TableCell>
                                          <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                            <div className={`font-semibold ${getProporsiPercentageClass(
                                              [detail.bku_ditemukan_non_pertanian, detail.bku_baru_non_pertanian, detail.keluarga_ditemukan_non_pertanian, detail.keluarga_baru_non_pertanian].reduce((total, value) => total + parseNumericValue(value), 0),
                                              parseNumericValue(detail.bku_usaha_wilkerstat_baru)
                                            )}`}>{formatProporsiPercentage(
                                              [detail.bku_ditemukan_non_pertanian, detail.bku_baru_non_pertanian, detail.keluarga_ditemukan_non_pertanian, detail.keluarga_baru_non_pertanian].reduce((total, value) => total + parseNumericValue(value), 0),
                                              parseNumericValue(detail.bku_usaha_wilkerstat_baru)
                                            )}</div>
                                          </TableCell>
                                          <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                            <div className="font-semibold text-slate-900">{[
                                              detail.bku_ditemukan_pertanian,
                                              detail.bku_baru_pertanian,
                                              detail.keluarga_ditemukan_pertanian,
                                              detail.keluarga_baru_pertanian,
                                            ].reduce((total, value) => total + parseNumericValue(value), 0).toLocaleString("id-ID")}</div>
                                            <div className={`text-xs font-medium ${getProporsiPercentageClass(
                                              [detail.bku_ditemukan_pertanian, detail.bku_baru_pertanian, detail.keluarga_ditemukan_pertanian, detail.keluarga_baru_pertanian].reduce((total, value) => total + parseNumericValue(value), 0),
                                              parseNumericValue(detail.utp_subsektor_st2023)
                                            )}`}>
                                              {formatProporsiPercentage(
                                                [detail.bku_ditemukan_pertanian, detail.bku_baru_pertanian, detail.keluarga_ditemukan_pertanian, detail.keluarga_baru_pertanian].reduce((total, value) => total + parseNumericValue(value), 0),
                                                parseNumericValue(detail.utp_subsektor_st2023)
                                              )}
                                            </div>
                                          </TableCell>
                                            </>}
                                        </TableRow>
                                      ))}
                                    </React.Fragment>
                                  );
                                })}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                                  <TableCell className="text-center">-</TableCell>
                                  {proporsiColumnGroups.dasar && <>
                                    <TableCell className="text-slate-900">Jumlah ({usahaProporsiPaginatedRows.length.toLocaleString("id-ID")} PPL)</TableCell>
                                    <TableCell className="text-slate-900">Semua Kecamatan</TableCell>
                                    {proporsiColumnGroups.prelistAwal && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2">{usahaProporsiTotals.prelistAwal.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.prelistUsaha && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-700 px-1 py-2">{usahaProporsiTotals.prelistUsaha.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.utpSt2023 && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-green-700 px-1 py-2">{usahaProporsiTotals.utpSt2023.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.bkuUsahaWilkerstat && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2">{usahaProporsiTotals.bkuUsahaWilkerstat.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.didata && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-orange-800 px-1 py-2">{usahaProporsiTotals.didata.toLocaleString("id-ID")}</TableCell>}
                                      </>}
                                  <>
                                  {proporsiColumnGroups.bkuDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{usahaProporsiTotals.bkuDitemukanPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.bkuDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiTotals.bkuDitemukanNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.bkuBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2">{usahaProporsiTotals.bkuBaruPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.bkuBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiTotals.bkuBaruNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                    </>
                                  <>
                                  {proporsiColumnGroups.keluargaDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{usahaProporsiTotals.keluargaDitemukanPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.keluargaDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiTotals.keluargaDitemukanNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.keluargaBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2">{usahaProporsiTotals.keluargaBaruPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.keluargaBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiTotals.keluargaBaruNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                  </>
                                  {proporsiColumnGroups.ringkasan && <>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div>{totalJumlahUsaha.toLocaleString("id-ID")}</div>
                                  </TableCell>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div className={`text-xs ${getProporsiPercentageClass(totalJumlahUsaha, usahaProporsiTotals.prelistUsaha)}`}>{formatProporsiPercentage(totalJumlahUsaha, usahaProporsiTotals.prelistUsaha)}</div>
                                  </TableCell>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div className={getProporsiPercentageClass(totalJumlahUsaha, usahaProporsiTotals.bkuUsahaWilkerstat)}>{formatProporsiPercentage(totalJumlahUsaha, usahaProporsiTotals.bkuUsahaWilkerstat)}</div>
                                  </TableCell>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div>{totalJumlahUsahaPertanian.toLocaleString("id-ID")}</div>
                                    <div className={`text-xs ${getProporsiPercentageClass(totalJumlahUsahaPertanian, usahaProporsiTotals.utpSt2023)}`}>{formatProporsiPercentage(totalJumlahUsahaPertanian, usahaProporsiTotals.utpSt2023)}</div>
                                  </TableCell>
                                  </>}
                                </TableRow>
                                <TableRow className="border-t border-slate-300 bg-white font-bold">
                                  <TableCell className="text-center">-</TableCell>
                                  {proporsiColumnGroups.dasar && <>
                                    <TableCell className="text-slate-900">Jumlah Keseluruhan ({usahaProporsiRows.length.toLocaleString("id-ID")} PPL)</TableCell>
                                    <TableCell className="text-slate-900">Semua Kecamatan</TableCell>
                                    {proporsiColumnGroups.prelistAwal && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2">{usahaProporsiOverallTotals.prelistAwal.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.prelistUsaha && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-700 px-1 py-2">{usahaProporsiOverallTotals.prelistUsaha.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.utpSt2023 && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-green-700 px-1 py-2">{usahaProporsiOverallTotals.utpSt2023.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.bkuUsahaWilkerstat && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2">{usahaProporsiOverallTotals.bkuUsahaWilkerstat.toLocaleString("id-ID")}</TableCell>}
                                    {proporsiColumnGroups.didata && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right font-bold text-orange-800 px-1 py-2">{usahaProporsiOverallTotals.didata.toLocaleString("id-ID")}</TableCell>}
                                    </>}
                                  <>
                                  {proporsiColumnGroups.bkuDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{usahaProporsiOverallTotals.bkuDitemukanPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.bkuDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiOverallTotals.bkuDitemukanNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.bkuBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2">{usahaProporsiOverallTotals.bkuBaruPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.bkuBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiOverallTotals.bkuBaruNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                    </>
                                  <>
                                  {proporsiColumnGroups.keluargaDitemukanPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2 border-l-2 border-slate-300">{usahaProporsiOverallTotals.keluargaDitemukanPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.keluargaDitemukanNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiOverallTotals.keluargaDitemukanNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.keluargaBaruPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-emerald-600 px-1 py-2">{usahaProporsiOverallTotals.keluargaBaruPertanian.toLocaleString("id-ID")}</TableCell>}
                                  {proporsiColumnGroups.keluargaBaruNonPertanian && <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right text-blue-600 px-1 py-2">{usahaProporsiOverallTotals.keluargaBaruNonPertanian.toLocaleString("id-ID")}</TableCell>}
                                  </>
                                  {proporsiColumnGroups.ringkasan && <>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div>{overallJumlahUsaha.toLocaleString("id-ID")}</div>
                                  </TableCell>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div className={`text-xs ${getProporsiPercentageClass(overallJumlahUsaha, usahaProporsiOverallTotals.prelistUsaha)}`}>{formatProporsiPercentage(overallJumlahUsaha, usahaProporsiOverallTotals.prelistUsaha)}</div>
                                  </TableCell>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div className={getProporsiPercentageClass(overallJumlahUsaha, usahaProporsiOverallTotals.bkuUsahaWilkerstat)}>{formatProporsiPercentage(overallJumlahUsaha, usahaProporsiOverallTotals.bkuUsahaWilkerstat)}</div>
                                  </TableCell>
                                  <TableCell className="w-[72px] min-w-[72px] max-w-[72px] text-right px-1 py-2 border-l-2 border-slate-300">
                                    <div>{overallJumlahUsahaPertanian.toLocaleString("id-ID")}</div>
                                    <div className={`text-xs ${getProporsiPercentageClass(overallJumlahUsahaPertanian, usahaProporsiOverallTotals.utpSt2023)}`}>{formatProporsiPercentage(overallJumlahUsahaPertanian, usahaProporsiOverallTotals.utpSt2023)}</div>
                                  </TableCell>
                                  </>}
                                </TableRow>
                              </TableFooter>
                            </Table>
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span>Per halaman:</span>
                                <select
                                  value={usahaItemsPerPage}
                                  onChange={(e) => {
                                    setUsahaItemsPerPage(Number(e.target.value));
                                    setUsahaProporsiCurrentPage(1);
                                  }}
                                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                                >
                                  {[10, 20, 50, 100].map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                                <span>Hal {usahaProporsiCurrentPage} dari {usahaProporsiTotalPages}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setUsahaProporsiCurrentPage((prev) => Math.max(1, prev - 1))}
                                  disabled={usahaProporsiCurrentPage === 1}
                                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                                >
                                  Sebelumnya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUsahaProporsiCurrentPage((prev) => Math.min(usahaProporsiTotalPages, prev + 1))}
                                  disabled={usahaProporsiCurrentPage === usahaProporsiTotalPages}
                                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                                >
                                  Berikutnya
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
            <TabsContent value="skala-usaha" className="space-y-6 mt-6">
              <SkalaUsahaTab
                namaPplByKey={namaPplByKey}
                kecamatanByKey={kecamatanByKey}
                prelistAwalByKey={prelistAwalByKey}
                prelistUsahaByGroupKey={prelistUsahaByGroupKey}
                prelistUsahaByRowKey={prelistUsahaByRowKey}
                didataByKey={didataByKey}
                stackingWilkerstatByKey={stackingWilkerstatByKey}
              />
            </TabsContent>
            <TabsContent value="keluarga" className="space-y-6 mt-6">
              <KeluargaTab />
            </TabsContent>
            <TabsContent value="identifikasi-utt" className="space-y-6 mt-6">
              <IdentifikasiUTTTab />
            </TabsContent>
            <TabsContent value="ngibar" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-lg font-semibold">Data Ngibar</h2>
                      <p className="text-sm text-slate-500">Gabungan data dari beberapa sumber Google Sheets, termasuk pencatatan, pengecekan, dan penugasan PML/PPL untuk tiap sheet asal.</p>
                    </div>
                  </div>
                  <div className="w-full md:w-80">
                    <Input
                      placeholder="Cari nama satuan / kecamatan / desa / jenis..."
                      value={ngibarSearch}
                      onChange={(e) => {
                        setNgibarSearch(e.target.value);
                        setNgibarPage(1);
                      }}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNgibarJenisFilter(null);
                      setNgibarPage(1);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${ngibarJenisFilter ? "bg-slate-100 text-slate-700" : "bg-slate-900 text-white"}`}
                  >
                    Semua
                  </button>
                  {ngibarJenisOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setNgibarJenisFilter(opt);
                        setNgibarPage(1);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${ngibarJenisFilter === opt ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white">
                    <CardContent className="p-5">
                      <div className="text-sm font-semibold text-slate-200">Total Baris Filter</div>
                      <div className="mt-4 text-3xl font-bold">{ngibarTotalCount.toLocaleString("id-ID")}</div>
                      <div className="mt-2 text-sm text-slate-300">Jumlah baris yang sesuai pencarian dan filter saat ini.</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 text-white">
                    <CardContent className="p-5">
                      <div className="text-sm font-semibold text-emerald-100">Flag Input Fasih</div>
                      <div className="mt-4 text-3xl font-bold">{ngibarFlaggedCount.toLocaleString("id-ID")}</div>
                      <div className="mt-2 text-sm text-emerald-50">{ngibarFlaggedPercent.toFixed(1)}% sudah diberi flag.</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white">
                    <CardContent className="p-5">
                      <div className="text-sm font-semibold text-blue-100">Hasil Pengecekkan</div>
                      <div className="mt-4 text-3xl font-bold">{ngibarVerifiedCount.toLocaleString("id-ID")}</div>
                      <div className="mt-2 text-sm text-blue-50">{ngibarVerifiedPercent.toFixed(1)}% sudah diisi.</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 text-white">
                    <CardContent className="p-5">
                      <div className="text-sm font-semibold text-violet-100">Link Upload</div>
                      <div className="mt-4 text-3xl font-bold">{ngibarLinkCount.toLocaleString("id-ID")}</div>
                      <div className="mt-2 text-sm text-violet-50">{ngibarLinkPercent.toFixed(1)}% memiliki tautan upload.</div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {ngibarLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-slate-600">Memuat data Ngibar...</span>
                      </div>
                    ) : ngibarError ? (
                      <div className="flex items-center justify-center py-12 text-red-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Error: {ngibarError}
                      </div>
                    ) : ngibarFilteredSorted.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-slate-500">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Tidak ada data Ngibar.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                              <TableHead className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("nama_satuan")}
                              >
                                Nama Satuan {getNgibarSortIndicator("nama_satuan")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("jenis_satuan")}
                              >
                                Jenis Satuan {getNgibarSortIndicator("jenis_satuan")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("kecamatan_desa")}
                              >
                                Kecamatan - Desa {getNgibarSortIndicator("kecamatan_desa")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("kontak")}
                              >
                                Kontak {getNgibarSortIndicator("kontak")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("upload_link")}
                              >
                                Link {getNgibarSortIndicator("upload_link")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("hasil_pengecekkan")}
                              >
                                Hasil Pengecekkan {getNgibarSortIndicator("hasil_pengecekkan")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("flag_input_fasih")}
                              >
                                Flag {getNgibarSortIndicator("flag_input_fasih")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("nama_pml")}
                              >
                                PML {getNgibarSortIndicator("nama_pml")}
                              </TableHead>
                              <TableHead
                                className="cursor-pointer text-slate-700 font-semibold px-4 py-3 hover:bg-slate-100"
                                onClick={() => handleNgibarSort("nama_ppl")}
                              >
                                PPL {getNgibarSortIndicator("nama_ppl")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ngibarFilteredSorted.slice((ngibarPage - 1) * ngibarItemsPerPage, ngibarPage * ngibarItemsPerPage).map((row: any, idx: number) => (
                              <TableRow key={row?.__rowNumber ?? idx} className="hover:bg-slate-50 border-b transition-colors">
                                <TableCell className="text-center text-slate-600 font-medium w-12">{(ngibarPage - 1) * ngibarItemsPerPage + idx + 1}</TableCell>
                                <TableCell className="text-slate-900 px-4 py-3">{row?.nama_satuan || "-"}</TableCell>
                                <TableCell className="text-slate-700 px-4 py-3">{row?.jenis_satuan || "-"}</TableCell>
                                <TableCell className="px-4 py-3">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-slate-900 font-medium">{row?.kecamatan || "-"}</span>
                                    <span className="text-xs text-slate-500">{row?.desa || "-"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <div className="flex flex-col gap-1 text-sm">
                                    <span className="font-medium text-slate-800">{row?.nama_lengkap || "-"}</span>
                                    <div className="flex flex-wrap gap-2">
                                      {row?.nomor_wa ? (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button type="button" title="Lihat nomor WA" className="rounded bg-slate-100 p-1">
                                              <Phone className="h-4 w-4" />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent className="max-w-xs">
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="truncate">{row.nomor_wa}</div>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={async () => {
                                                    try {
                                                      await navigator.clipboard.writeText(String(row.nomor_wa));
                                                      toast({ title: "Disalin" });
                                                    } catch {}
                                                  }}
                                                  className="rounded bg-slate-100 p-1"
                                                >
                                                  <Copy className="h-4 w-4" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const n = normalizeWa(row.nomor_wa);
                                                    if (n) window.open(`https://wa.me/${n}`, "_blank", "noopener,noreferrer");
                                                  }}
                                                  className="rounded bg-slate-100 p-1"
                                                >
                                                  <Link className="h-4 w-4" />
                                                </button>
                                              </div>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      ) : null}
                                      {row?.email ? (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button type="button" title="Lihat email" className="rounded bg-slate-100 p-1">
                                              <Mail className="h-4 w-4" />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent className="max-w-xs">
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="truncate">{row.email}</div>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    await navigator.clipboard.writeText(String(row.email));
                                                    toast({ title: "Disalin" });
                                                  } catch {}
                                                }}
                                                className="rounded bg-slate-100 p-1"
                                              >
                                                <Copy className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      ) : null}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  {row?.upload_link ? (
                                    <a href={row.upload_link} target="_blank" rel="noreferrer" title="Buka tautan" className="inline-flex items-center text-blue-600 hover:underline">
                                      <Link className="h-4 w-4" />
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="max-w-[180px] truncate">{row?.hasil_pengecekkan || "-"}</span>
                                    <button
                                      type="button"
                                      title={row?.hasil_pengecekkan ? "Edit hasil pengecekkan" : "Tambah hasil pengecekkan"}
                                      onClick={() => openEditDialog("hasil_pengecekkan", row, row?.hasil_pengecekkan ?? "")}
                                      className={`rounded p-1 ${String(row?.hasil_pengecekkan || "").trim() ? "bg-emerald-600 text-white" : "bg-slate-100"}`}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <button
                                    type="button"
                                    title={row?.flag_input_fasih ? "Batal flag" : "Flag sebagai sudah"}
                                    onClick={() => toggleFlag(row)}
                                    className={`rounded p-1 ${String((ngibarOverrides?.[getNgibarRowKey(row)]?.flag_input_fasih ?? row?.flag_input_fasih ?? "") || "").trim() ? "bg-emerald-600 text-white" : "bg-slate-100"}`}
                                  >
                                    <FlagIcon className="h-4 w-4" />
                                  </button>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="max-w-[180px] truncate">{row?.nama_pml || "-"}</span>
                                    <button
                                      type="button"
                                      title={row?.nama_pml ? "Edit nama PML" : "Tambah nama PML"}
                                      onClick={() => openEditDialog("nama_pml", row, row?.nama_pml ?? "")}
                                      className={`rounded p-1 ${String(row?.nama_pml || "").trim() ? "bg-emerald-600 text-white" : "bg-slate-100"}`}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="max-w-[180px] truncate">{row?.nama_ppl || "-"}</span>
                                    <button
                                      type="button"
                                      title={row?.nama_ppl ? "Edit nama PPL" : "Tambah nama PPL"}
                                      onClick={() => openEditDialog("nama_ppl", row, row?.nama_ppl ?? "")}
                                      className={`rounded p-1 ${String(row?.nama_ppl || "").trim() ? "bg-emerald-600 text-white" : "bg-slate-100"}`}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>Per halaman:</span>
                            <select
                              value={ngibarItemsPerPage}
                              onChange={(e) => {
                                setNgibarItemsPerPage(Number(e.target.value));
                                setNgibarPage(1);
                              }}
                              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                            >
                              {[10, 20, 50, 100].map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                            <span>Hal {ngibarPage} dari {ngibarTotalPages}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setNgibarPage(1)}
                              disabled={ngibarPage === 1}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Awal
                            </button>
                            <button
                              type="button"
                              onClick={() => setNgibarPage((prev) => Math.max(1, prev - 1))}
                              disabled={ngibarPage === 1}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Sebelumnya
                            </button>
                            <button
                              type="button"
                              onClick={() => setNgibarPage((prev) => Math.min(ngibarTotalPages, prev + 1))}
                              disabled={ngibarPage === ngibarTotalPages}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Berikutnya
                            </button>
                            <button
                              type="button"
                              onClick={() => setNgibarPage(ngibarTotalPages)}
                              disabled={ngibarPage === ngibarTotalPages}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Akhir
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialogField === 'hasil_pengecekkan' ? 'Hasil Pengecekkan' : editDialogField === 'flag_input_fasih' ? 'Flag Input Fasih' : editDialogField === 'nama_pml' ? 'Nama PML' : editDialogField === 'nama_ppl' ? 'Nama PPL' : 'Edit'}</DialogTitle>
            <DialogDescription>Rekam perubahan langsung ke Sheet</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Input value={editDialogValue} onChange={(e) => setEditDialogValue(e.target.value)} className="w-full" />
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded bg-slate-100" onClick={() => setEditDialogOpen(false)}>Batal</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={saveEditDialog} disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
