import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  Link2,
  X,
  Download,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SPREADSHEET_ID = "1x9P3MlkJySQI9FK6mV3maik3qMnUIBW8IKwWPudAA2Y";
const SHEET_NAME = "6-KECAP";
const PETA_SHEET_NAME = "7-PETA";
const PAGE_SIZES = [10, 20, 50, 100];
const COMPACT_METRIC_KEYS = new Set<MetricKey>([
  "jumlahAssignment",
  "open",
  "draft",
  "keluargaPrelist",
  "keluarga",
  "prelistUsaha",
  "nonPertanian",
  "utpSt2023",
  "pertanian",
]);
const METRIC_COLUMNS = [
  ["keluargaWilkerstat", "Keluarga Wilkerstat"],
  ["nonPertanianWilkerstat", "Non Pertanian Wilkerstat"],
  ["keluargaPrelist", "Keluarga Prelist"],
  ["prelistUsaha", "Prelist Usaha"],
  ["utpSt2023", "UTP ST2023"],
  ["jumlahAssignment", "Jml Assignment"],
  ["open", "Open"],
  ["draft", "Draft"],
  ["keluarga", "Keluarga"],
  ["art", "ART"],
  ["nonPertanian", "Non Pertanian"],
  ["pertanian", "Pertanian"],
] as const;
type MetricKey = (typeof METRIC_COLUMNS)[number][0];
type SortKey =
  | "nama"
  | "kecamatan"
  | MetricKey
  | "flagPml"
  | "pjKec"
  | "ketuaSe2026"
  | "ppk";
type Direction = "asc" | "desc";

type Metrics = Record<MetricKey, number>;
type ActionColumn = "S" | "T" | "U" | "V" | "W" | "X" | "Y";
type ActionRecord = {
  rowNumber: number;
  values: Partial<Record<ActionColumn, string>>;
};
type DetailRow = Metrics & {
  id: string;
  idsubsls: string;
  nmsls: string;
  desa: string;
  kecamatan: string;
  action: ActionRecord;
};
type PplRow = Metrics & {
  id: string;
  nama: string;
  kecamatan: string;
  details: DetailRow[];
  actionRows: ActionRecord[];
};
type PmlChild = Metrics & {
  nama: string;
  actionRows: ActionRecord[];
  pplActionRows: ActionRecord[];
};
type PmlRow = Metrics & {
  id: string;
  nama: string;
  kecamatan: string;
  children: PmlChild[];
  actionRows: ActionRecord[];
};

const SHEET_COLUMNS = {
  kecamatan: 2,
  desa: 3,
  keluargaWilkerstat: 4,
  nonPertanianWilkerstat: 5,
  keluargaPrelist: 6,
  prelistUsaha: 7,
  utpSt2023: 8,
  jumlahAssignment: 9,
  open: 10,
  draft: 11,
  keluarga: 12,
  art: 13,
  nonPertanian: 14,
  pertanian: 15,
  namaPpl: 16,
  namaPml: 17,
} as const;

const emptyMetrics = (): Metrics =>
  Object.fromEntries(METRIC_COLUMNS.map(([key]) => [key, 0])) as Metrics;

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!raw) return 0;
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
        ? raw.replace(",", ".")
        : raw;
  const parsed = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (row: any, index: number, key?: string): string => {
  const raw = Array.isArray(row?.__rawRow)
    ? row.__rawRow[index]
    : Array.isArray(row)
      ? row[index]
      : undefined;
  const value =
    raw ?? (key && row && typeof row === "object" ? row[key] : undefined);
  return String(value ?? "").trim();
};
const formatNumber = (value: number) => value.toLocaleString("id-ID");
const formatVerificationTimestamp = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.hour}.${parts.minute} WIB - ${parts.weekday}, ${parts.day}/${parts.month}/${parts.year}`;
};
const formatPercent = (value: number, total: number) => {
  if (total === 0) {
    return value > 0 ? "100.00%" : "0.00%";
  }
  return `${((value / total) * 100).toFixed(2)}%`;
};
const normalizeKecamatan = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
const normalizeSheetId = (value: unknown) =>
  String(value ?? "").trim().replace(/\s+/g, "");
const isTrueFlag = (value: unknown) => {
  if (value === true || value === 1 || value === "1") return true;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "ya", "yes", "y"].includes(normalized);
};
const kecamatanFromRole = (role: string) => {
  const match = role.match(/(?:pj\s+kecamatan|pml)\s+(.+)/i);
  return match
    ? match[1].split(/\s+dan\s+/i).map(normalizeKecamatan).filter(Boolean)
    : [];
};
const percentClass = (value: number, total: number, alwaysRed = false) => {
  if (alwaysRed) return "text-red-600";
  const percentage = total === 0 ? (value > 0 ? 100 : 0) : (value / total) * 100;
  return percentage >= 100
    ? "text-emerald-600"
    : percentage >= 50
      ? "text-orange-500"
      : "text-red-600";
};

const addMetrics = (target: Metrics, row: any) => {
  METRIC_COLUMNS.forEach(([key]) => {
    target[key] += parseNumber(text(row, SHEET_COLUMNS[key], key));
  });
};

const addMetricObject = (target: Metrics, source: Metrics) => {
  METRIC_COLUMNS.forEach(([key]) => {
    target[key] += source[key];
  });
};

const getActionSortValue = (
  row: any,
  key: SortKey,
  overrides: Record<string, string>,
): string => {
  const actionRows = Array.isArray(row?.actionRows) ? row.actionRows : [];
  const actionMap: Record<string, ActionColumn> = {
    flagPml: "S",
    pjKec: row?.kecamatan ? "T" : "W",
    ketuaSe2026: row?.kecamatan ? "U" : "X",
    ppk: row?.kecamatan ? "V" : "Y",
  };

  const column = actionMap[key];
  if (!column) return "";

  const isPmlTabLike = !!row?.children || (row?.kecamatan && !Array.isArray(row?.details));
  const mappedColumn: ActionColumn =
    key === "pjKec"
      ? (isPmlTabLike ? "W" : "T")
      : key === "ketuaSe2026"
        ? (isPmlTabLike ? "X" : "U")
        : key === "ppk"
          ? (isPmlTabLike ? "Y" : "V")
          : column;

  return actionValue(actionRows, mappedColumn, overrides);
};

const compareValues = (
  a: any,
  b: any,
  key: SortKey,
  direction: Direction,
  overrides: Record<string, string> = {},
) => {
  const isActionKey =
    key === "flagPml" ||
    key === "pjKec" ||
    key === "ketuaSe2026" ||
    key === "ppk";

  const aValue = isActionKey
    ? getActionSortValue(a, key, overrides)
    : key === "nama" || key === "kecamatan"
      ? String(a[key]).toLowerCase()
      : Number(a[key]);
  const bValue = isActionKey
    ? getActionSortValue(b, key, overrides)
    : key === "nama" || key === "kecamatan"
      ? String(b[key]).toLowerCase()
      : Number(b[key]);

  const result =
    typeof aValue === "number" && typeof bValue === "number"
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue), "id");
  return direction === "asc" ? result : -result;
};

type QuadrantRow = {
  kecamatan: string;
  openDraft: number;
  deficitNonPertanian: number;
  deficitPertanian: number;
  deficitKeluarga: number;
  totalDeficit: number;
};

type QuadrantMetricKey = "deficitNonPertanian" | "deficitPertanian" | "deficitKeluarga" | "totalDeficit";
const QUADRANT_METRICS: Array<{ key: QuadrantMetricKey; label: string }> = [
  { key: "deficitNonPertanian", label: "Defisit Non Pertanian" },
  { key: "deficitPertanian", label: "Defisit Pertanian" },
  { key: "deficitKeluarga", label: "Defisit Keluarga" },
  { key: "totalDeficit", label: "Total Defisit" },
];

const KuadranTooltip = ({ active, payload, averages, selectedMetric }: { active?: boolean; payload?: any[]; averages: { openDraft: number; yAverage: number }; selectedMetric: QuadrantMetricKey }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as QuadrantRow | undefined;
  if (!row) return null;
  const selectedValue = row[selectedMetric];
  const selectedMetricLabel = QUADRANT_METRICS.find((metric) => metric.key === selectedMetric)?.label || "Defisit";
  const quadrant = row.openDraft >= averages.openDraft
    ? selectedValue >= averages.yAverage ? "Tinggi Open + Tinggi Defisit" : "Tinggi Open + Rendah Defisit"
    : selectedValue >= averages.yAverage ? "Rendah Open + Tinggi Defisit" : "Rendah Open + Rendah Defisit";
  const items = [
    ["Open + Draft", row.openDraft, "text-sky-700"],
    ["Defisit Non Pertanian", row.deficitNonPertanian, "text-amber-700"],
    ["Defisit Pertanian", row.deficitPertanian, "text-emerald-700"],
    ["Defisit Keluarga", row.deficitKeluarga, "text-violet-700"],
    ["Total Defisit", row.totalDeficit, "text-rose-700"],
  ] as const;
  return (
    <div className="min-w-[230px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <div className="mb-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">{row.kecamatan}</div>
      <div className="space-y-1.5">
        {items.map(([label, value, color]) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-slate-600">{label}</span>
            <span className={`font-semibold ${color}`}>{formatNumber(value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-slate-100 pt-2 font-semibold text-slate-700">{quadrant} ({selectedMetricLabel})</div>
    </div>
  );
};

const KuadranTab = ({ data, isPmlUser, role }: { data: any[]; isPmlUser: boolean; role: string }) => {
  const [selectedMetric, setSelectedMetric] = useState<QuadrantMetricKey>("totalDeficit");
  const [sortKey, setSortKey] = useState<keyof QuadrantRow>("kecamatan");
  const [sortDirection, setSortDirection] = useState<Direction>("asc");
  const rows = useMemo<QuadrantRow[]>(() => {
    const grouped = new Map<string, QuadrantRow>();
    data.forEach((row) => {
      const kecamatan = text(row, SHEET_COLUMNS.kecamatan, "nmkec");
      const normalizedKecamatan = normalizeKecamatan(kecamatan);
      if (!kecamatan) return;
      const current = grouped.get(normalizedKecamatan) || { kecamatan, openDraft: 0, deficitNonPertanian: 0, deficitPertanian: 0, deficitKeluarga: 0, totalDeficit: 0 };
      current.openDraft += parseNumber(text(row, SHEET_COLUMNS.open, "open")) + parseNumber(text(row, SHEET_COLUMNS.draft, "draft"));
      current.deficitNonPertanian += parseNumber(text(row, SHEET_COLUMNS.prelistUsaha, "prelistUsaha")) - parseNumber(text(row, SHEET_COLUMNS.nonPertanian, "nonPertanian"));
      current.deficitPertanian += parseNumber(text(row, SHEET_COLUMNS.utpSt2023, "utpSt2023")) - parseNumber(text(row, SHEET_COLUMNS.pertanian, "pertanian"));
      current.deficitKeluarga += parseNumber(text(row, SHEET_COLUMNS.keluargaPrelist, "keluargaPrelist")) - parseNumber(text(row, SHEET_COLUMNS.keluarga, "keluarga"));
      current.totalDeficit = current.deficitNonPertanian + current.deficitPertanian + current.deficitKeluarga;
      grouped.set(normalizedKecamatan, current);
    });
    return Array.from(grouped.values()).sort((a, b) => a.kecamatan.localeCompare(b.kecamatan, "id"));
  }, [data, isPmlUser, role]);

  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const leftValue = left[sortKey];
    const rightValue = right[sortKey];
    const result = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue), "id", { numeric: true });
    return sortDirection === "asc" ? result : -result;
  }), [rows, sortKey, sortDirection]);

  const totals = useMemo(() => rows.reduce((total, row) => ({
    openDraft: total.openDraft + row.openDraft,
    deficitNonPertanian: total.deficitNonPertanian + row.deficitNonPertanian,
    deficitPertanian: total.deficitPertanian + row.deficitPertanian,
    deficitKeluarga: total.deficitKeluarga + row.deficitKeluarga,
    totalDeficit: total.totalDeficit + row.totalDeficit,
  }), { openDraft: 0, deficitNonPertanian: 0, deficitPertanian: 0, deficitKeluarga: 0, totalDeficit: 0 }), [rows]);

  const toggleSort = (key: keyof QuadrantRow) => {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection(typeof rows[0]?.[key] === "number" ? "desc" : "asc");
    }
  };

  const averages = useMemo(() => ({
    openDraft: rows.length ? rows.reduce((sum, row) => sum + row.openDraft, 0) / rows.length : 0,
    yAverage: rows.length ? rows.reduce((sum, row) => sum + row[selectedMetric], 0) / rows.length : 0,
  }), [rows, selectedMetric]);

  const selectedMetricLabel = QUADRANT_METRICS.find((metric) => metric.key === selectedMetric)?.label || "Defisit";

  const renderDeficitCell = (value: number, isTotal = false) => {
    const isNegative = value < 0;
    const textClass = isNegative
      ? "font-bold text-emerald-700"
      : isTotal
        ? "font-semibold text-rose-600"
        : "";

    return (
      <span className={`inline-flex items-center justify-end gap-1.5 ${textClass}`}>
        <span>{formatNumber(value)}</span>
        {isNegative && (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-100">
            <Check className="h-3 w-3" />
          </span>
        )}
      </span>
    );
  };

  const getQuadrant = (row: QuadrantRow) => {
    const deficitValue = row[selectedMetric];
    const level = row.openDraft >= averages.openDraft
      ? deficitValue >= averages.yAverage ? "Tinggi Open + Tinggi Defisit" : "Tinggi Open + Rendah Defisit"
      : deficitValue >= averages.yAverage ? "Rendah Open + Tinggi Defisit" : "Rendah Open + Rendah Defisit";
    return `${level} (${selectedMetricLabel})`;
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Kuadran Open + Draft vs Defisit</CardTitle>
          <CardDescription>Rekap per kecamatan. Tinggi/rendah sumbu Y mengikuti rata-rata <strong>{selectedMetricLabel}</strong> yang dipilih.</CardDescription>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5"><label htmlFor="quadrant-metric" className="text-sm font-bold text-sky-900">Definisi Sumbu Y</label><span className="text-xs text-sky-700">Pilih indikator defisit untuk posisi vertikal:</span><select id="quadrant-metric" value={selectedMetric} onChange={(event) => setSelectedMetric(event.target.value as QuadrantMetricKey)} className="h-9 rounded-md border border-sky-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200">{QUADRANT_METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></div>
          <div className="grid gap-2 pt-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2"><span className="font-semibold text-sky-800">Sumbu X</span><div className="text-slate-600">Open + Draft</div></div>
            <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2"><span className="font-semibold text-amber-800">Defisit Non Pertanian</span><div className="text-slate-600">Prelist Usaha - Non Pertanian</div></div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2"><span className="font-semibold text-emerald-800">Defisit Pertanian</span><div className="text-slate-600">UTP ST2023 - Pertanian</div></div>
            <div className="rounded-md border border-violet-100 bg-violet-50 px-3 py-2"><span className="font-semibold text-violet-800">Defisit Keluarga</span><div className="text-slate-600">Keluarga Prelist - Keluarga</div></div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">Belum ada data kuadran.</div> : (
            <div className="h-[420px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 24, right: 28, bottom: 28, left: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis type="number" dataKey="openDraft" name="Open + Draft" tickFormatter={formatNumber} tick={{ fontSize: 11 }} label={{ value: "Open + Draft", position: "insideBottom", offset: -16, fontSize: 12, fill: "#334155" }} />
                  <YAxis type="number" dataKey={selectedMetric} name={selectedMetricLabel} tickFormatter={formatNumber} tick={{ fontSize: 11 }} label={{ value: selectedMetricLabel, angle: -90, position: "insideLeft", offset: 0, fontSize: 12, fill: "#334155" }} />
                  <Tooltip content={<KuadranTooltip averages={averages} selectedMetric={selectedMetric} />} cursor={{ strokeDasharray: "3 3" }} />
                  <ReferenceLine x={averages.openDraft} stroke="#64748b" strokeDasharray="6 4" label="Rata-rata Open + Draft" />
                  <ReferenceLine y={averages.yAverage} stroke="#64748b" strokeDasharray="6 4" label={`Rata-rata ${selectedMetricLabel}`} />
                  <Scatter name="Kecamatan" data={sortedRows} fill="#0284c7" shape="circle" label={{ dataKey: "kecamatan", position: "right", fontSize: 11, fill: "#334155" }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto"><Table className="min-w-[900px]"><TableHeader><TableRow className="bg-slate-50"><TableHead className="cursor-pointer select-none" onClick={() => toggleSort("kecamatan")}>Kecamatan {sortKey === "kecamatan" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</TableHead><TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("openDraft")}>Open + Draft {sortKey === "openDraft" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</TableHead><TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("deficitNonPertanian")}>Defisit Non Pertanian (Absolut) {sortKey === "deficitNonPertanian" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</TableHead><TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("deficitPertanian")}>Defisit Pertanian (Absolut) {sortKey === "deficitPertanian" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</TableHead><TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("deficitKeluarga")}>Defisit Keluarga (Absolut) {sortKey === "deficitKeluarga" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</TableHead><TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("totalDeficit")}>Total Defisit (Absolut) {sortKey === "totalDeficit" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</TableHead><TableHead>Kuadran</TableHead></TableRow></TableHeader><TableBody>{sortedRows.map((row) => <TableRow key={row.kecamatan}><TableCell className="font-medium">{row.kecamatan}</TableCell><TableCell className="text-right">{formatNumber(row.openDraft)}</TableCell><TableCell className="text-right">{renderDeficitCell(row.deficitNonPertanian)}</TableCell><TableCell className="text-right">{renderDeficitCell(row.deficitPertanian)}</TableCell><TableCell className="text-right">{renderDeficitCell(row.deficitKeluarga)}</TableCell><TableCell className="text-right">{renderDeficitCell(row.totalDeficit, true)}</TableCell><TableCell><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{getQuadrant(row)}</span></TableCell></TableRow>)}<TableRow className="border-t-2 border-sky-200 bg-sky-50"><TableCell className="font-bold text-sky-900">JUMLAH</TableCell><TableCell className="text-right font-bold text-sky-900">{formatNumber(totals.openDraft)}</TableCell><TableCell className="text-right font-bold text-sky-900">{formatNumber(totals.deficitNonPertanian)}</TableCell><TableCell className="text-right font-bold text-sky-900">{formatNumber(totals.deficitPertanian)}</TableCell><TableCell className="text-right font-bold text-sky-900">{formatNumber(totals.deficitKeluarga)}</TableCell><TableCell className="text-right font-bold text-rose-700">{formatNumber(totals.totalDeficit)}</TableCell><TableCell className="font-semibold text-sky-900">-</TableCell></TableRow></TableBody></Table></div>
      </Card>
    </div>
  );
};

const SortHead = ({
  label,
  active,
  direction,
  onClick,
  numeric = true,
  rowSpan,
  className = "",
}: {
  label: string;
  active: boolean;
  direction: Direction;
  onClick: () => void;
  numeric?: boolean;
  rowSpan?: number;
  className?: string;
}) => (
  <TableHead
    rowSpan={rowSpan}
    onClick={onClick}
    className={`cursor-pointer select-none whitespace-normal break-words px-1 sm:px-2 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold leading-tight text-slate-700 align-middle ${className}`}
  >
    <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-0.5 sm:gap-1">
      {label}
      <ArrowUpDown
        className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${active ? "text-sky-600" : "text-slate-400"}`}
      />
      {active && (
        <span className="text-[8px] sm:text-[10px]">{direction === "asc" ? "▲" : "▼"}</span>
      )}
    </span>
  </TableHead>
);

const actionValue = (
  records: ActionRecord[],
  column: ActionColumn,
  overrides: Record<string, string>,
) => {
  const values = records.map(
    (record) =>
      overrides[`${record.rowNumber}:${column}`] ?? record.values[column] ?? "",
  );
  return values.length > 0 && values.every((value) => value.trim() !== "")
    ? values[0]
    : "";
};

function KabupatenActions({
  records,
  columns,
  overrides,
  kecamatan,
  allPplFlagged = true,
  showPmlFlag = false,
  disablePmlFlag = false,
  petaAllEntered = false,
  onSaved,
}: {
  records: ActionRecord[];
  columns: [ActionColumn, ActionColumn, ActionColumn];
  overrides: Record<string, string>;
  kecamatan: string;
  allPplFlagged?: boolean;
  showPmlFlag?: boolean;
  disablePmlFlag?: boolean;
  petaAllEntered?: boolean;
  onSaved: (updates: Record<string, string>) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [pmlConfirmOpen, setPmlConfirmOpen] = useState(false);
  const [confirmChecks, setConfirmChecks] = useState({
    pemeriksaan: false,
    cakupan: false,
    kualitas: false,
  });
  const allConfirmationsChecked = Object.values(confirmChecks).every(Boolean);
  const resetConfirmChecks = () =>
    setConfirmChecks({
      pemeriksaan: false,
      cakupan: false,
      kualitas: false,
    });
  const role = String(user?.role || "").toLowerCase();
  const allowedKecamatan = kecamatanFromRole(role);
  const isPml = role.startsWith("pml ");
  const isKetuaPelaksana =
    normalizeKecamatan(role) === "ketua tim pelaksana se2026";
  const actor = role.includes("pejabat pembuat komitmen")
    ? "PPK"
    : role.includes("ketua") ||
        role.includes("kpa") ||
        role.includes("kuasa pengguna anggaran")
      ? "KPA"
      : role.includes("pj") ||
          role.includes("kecamatan") ||
          role.includes("penanggung jawab")
        ? "PJK"
        : isPml
          ? "PML"
        : "";
  const isApproved = (column: ActionColumn) =>
    actionValue(records, column, overrides) !== "";
  const pjk = isApproved(columns[0]);
  const ketua = isApproved(columns[1]);
  const ppk = actionValue(records, columns[2], overrides);
  const pmlFlag = actionValue(records, "S", overrides) !== "";
  const handlePmlFlagToggle = () => {
    if (pmlFlag) {
      write("S", "");
      return;
    }
    setPmlConfirmOpen(true);
  };
  const handlePmlApprove = () => {
    if (!allConfirmationsChecked) return;
    resetConfirmChecks();
    setPmlConfirmOpen(false);
    write("S", "Approve");
  };
  const pjkStarted = records.some(
    (record) =>
      (overrides[`${record.rowNumber}:${columns[0]}`] ??
        record.values[columns[0]] ??
        "")
        .trim() !== "",
  );
  const canPml =
    isPml &&
    allowedKecamatan.includes(normalizeKecamatan(kecamatan)) &&
    !pjkStarted &&
    !disablePmlFlag &&
    petaAllEntered;
  const canPjk =
    actor === "PJK" &&
    allowedKecamatan.includes(normalizeKecamatan(kecamatan)) &&
    (pjk || allPplFlagged) &&
    !ketua &&
    !ppk;
  const canKetua = isKetuaPelaksana && pjk && !ppk;
  const canPpk = actor === "PPK" && ketua;
  const write = async (column: ActionColumn, value: string) => {
    if (
      !actor ||
      records.length === 0 ||
      (column === "S" && pjkStarted) ||
      (column === columns[0] && !canPjk) ||
      (column === columns[1] && !canKetua) ||
      (column === columns[2] && !canPpk)
    ) return;
    setSaving(column);
    const stamp = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const recorded = value
      ? `${value}, ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}-${pad(stamp.getDate())}/${pad(stamp.getMonth() + 1)}/${String(stamp.getFullYear()).slice(-2)} oleh ${user?.username || actor}`
      : "";
    try {
      const updates = records.map((record) => ({
        range: `'${SHEET_NAME}'!${column}${record.rowNumber}`,
        values: [[recorded]],
      }));
      const { error: updateError } = await supabase.functions.invoke(
        "google-sheets",
        {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "batch-update",
            updates,
          },
        },
      );
      if (updateError) throw updateError;
      onSaved(
        Object.fromEntries(
          records.map((record) => [`${record.rowNumber}:${column}`, recorded]),
        ),
      );
      toast({
        title: "Aksi tersimpan",
        description: `${value} berhasil direkam.`,
      });
    } catch (err: any) {
      toast({
        title: "Gagal menyimpan aksi",
        description: err?.message || "Update Google Sheets gagal.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };
  return (
    <>
      <AlertDialog
        open={pmlConfirmOpen}
        onOpenChange={(isOpen) => {
          setPmlConfirmOpen(isOpen);
          if (!isOpen) resetConfirmChecks();
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Verifikasi Akhir</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <input
                  id="pml-confirm-pemeriksaan"
                  type="checkbox"
                  checked={confirmChecks.pemeriksaan}
                  onChange={(event) =>
                    setConfirmChecks((current) => ({
                      ...current,
                      pemeriksaan: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="pml-confirm-pemeriksaan" className="text-sm text-slate-700">
                  Saya telah melakukan pemeriksaan dan memastikan hasil pekerjaan telah memenuhi ketentuan.
                </label>
              </div>
              <div className="flex items-start gap-3">
                <input
                  id="pml-confirm-cakupan"
                  type="checkbox"
                  checked={confirmChecks.cakupan}
                  onChange={(event) =>
                    setConfirmChecks((current) => ({
                      ...current,
                      cakupan: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="pml-confirm-cakupan" className="text-sm text-slate-700">
                  Saya telah memastikan kewajaran cakupan pendataan telah terpenuhi.
                </label>
              </div>
              <div className="flex items-start gap-3">
                <input
                  id="pml-confirm-kualitas"
                  type="checkbox"
                  checked={confirmChecks.kualitas}
                  onChange={(event) =>
                    setConfirmChecks((current) => ({
                      ...current,
                      kualitas: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="pml-confirm-kualitas" className="text-sm text-slate-700">
                  Saya telah memastikan kualitas hasil pendataan telah memenuhi ketentuan.
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetConfirmChecks}>Batalkan</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePmlApprove}
              disabled={!allConfirmationsChecked}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ya, lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {showPmlFlag && (
        <TableCell className="w-[50px] sm:w-[64px] min-w-[50px] sm:min-w-[64px] bg-violet-50 px-0.5 sm:px-1 py-1 sm:py-2 text-center align-middle">
          <button
            type="button"
            aria-pressed={pmlFlag}
            title={
              pmlFlag
                ? "Batalkan flag PML"
                : disablePmlFlag && !petaAllEntered
                  ? "Open/Draft belum nol dan status Peta wilayah kerja belum semua masuk"
                  : petaAllEntered
                    ? "Flag verifikasi PML (semua Peta wilayah kerja sudah masuk)"
                    : "Flag verifikasi PML"
            }
            disabled={saving !== null || !canPml}
            onClick={handlePmlFlagToggle}
            className={`rounded p-0.5 sm:p-1 transition-colors ${pmlFlag ? "text-emerald-500 hover:text-emerald-600" : "text-slate-400 hover:text-slate-600"} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={pmlFlag ? 3 : 2} />
          </button>
        </TableCell>
      )}
      <TableCell className="w-[50px] sm:w-[64px] min-w-[50px] sm:min-w-[64px] bg-violet-50 px-0.5 sm:px-1 py-1 sm:py-2 text-center align-middle">
        <button
          type="button"
          title={
            pjk
              ? "Batalkan flag PJ Kecamatan"
              : allPplFlagged
                ? "Flag PJ Kecamatan"
                : "Semua PPL harus sudah flag terlebih dahulu"
          }
          disabled={saving !== null || !canPjk}
          onClick={() => write(columns[0], pjk ? "" : "Approve")}
          className={`rounded p-1 sm:p-1.5 ${pjk ? "text-amber-500 hover:bg-amber-100" : "text-slate-400 hover:bg-slate-100"} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Star className="h-3 w-3 sm:h-4 sm:w-4" fill={pjk ? "currentColor" : "none"} />
        </button>
      </TableCell>
      <TableCell className="w-[50px] sm:w-[64px] min-w-[50px] sm:min-w-[64px] bg-violet-50 px-0.5 sm:px-1 py-1 sm:py-2 text-center align-middle">
        <button
          type="button"
          title={
            ketua ? "Batalkan flag Ketua Tim SE2026" : "Flag Ketua Tim SE2026"
          }
          disabled={
            saving !== null || (ketua ? !isKetuaPelaksana || !!ppk : !canKetua)
          }
          onClick={() => write(columns[1], ketua ? "" : "Approve")}
          className={`rounded p-1 sm:p-1.5 ${ketua ? "text-blue-600 hover:bg-blue-100" : "text-slate-400 hover:bg-slate-100"} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </TableCell>
      <TableCell className="w-[75px] sm:w-[96px] min-w-[75px] sm:min-w-[96px] bg-violet-50 px-0.5 sm:px-1 py-1 sm:py-2 text-center align-middle">
        <select
          aria-label="Tahap PPK"
          value={ppk ? ppk.split(",")[0] : ""}
          disabled={saving !== null || (ppk ? actor !== "PPK" : !canPpk)}
          onChange={(event) => write(columns[2], event.target.value)}
          className="h-7 sm:h-8 w-full rounded border border-slate-300 bg-white px-0.5 sm:px-1 text-[10px] sm:text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          <option value="">Pilih</option>
          {Array.from({ length: 10 }, (_, index) => (
            <option key={index + 1} value={`Tahap-${index + 1}`}>
              T{index + 1}
            </option>
          ))}
        </select>
        {saving && (
          <Loader2 className="mx-auto mt-0.5 h-3 w-3 animate-spin text-slate-500" />
        )}
      </TableCell>
    </>
  );
}

export default function VerifikasiAkhir() {
  const { user } = useAuth();
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
  });
  const { data: timestampData } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
    range: "AA1",
    mode: "single-cell",
  });
  const { data: petaData } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: PETA_SHEET_NAME,
  });
  const { data: monitoringAdminData } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: "9-LK PPL",
  });
  const [activeTab, setActiveTab] = useState("ppl");
  const [search, setSearch] = useState("");
  const [kecamatan, setKecamatan] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [pplPage, setPplPage] = useState(1);
  const [pmlPage, setPmlPage] = useState(1);
  const [monitoringPage, setMonitoringPage] = useState(1);
  const [pplSort, setPplSort] = useState<SortKey>("nama");
  const [pmlSort, setPmlSort] = useState<SortKey>("nama");
  const [pplDirection, setPplDirection] = useState<Direction>("asc");
  const [pmlDirection, setPmlDirection] = useState<Direction>("asc");
  const [expandedPpl, setExpandedPpl] = useState<Set<string>>(new Set());
  const [expandedPml, setExpandedPml] = useState<Set<string>>(new Set());
  const [actionOverrides, setActionOverrides] = useState<
    Record<string, string>
  >({});
  const [verificationTimestamp, setVerificationTimestamp] = useState("");
  const [savingVerificationTimestamp, setSavingVerificationTimestamp] =
    useState(false);
  const isPmlUser = String(user?.role || "").toLowerCase().startsWith("pml ");
  const isPpk = user?.role === "Pejabat Pembuat Komitmen";
  const petaMatchedIds = useMemo(() => {
    const next = new Set<string>();
    (petaData || []).forEach((row: any) => {
      const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
      const idsls = normalizeSheetId(
        row?.idsubsls ?? row?.idsls ?? row?.id_sls ?? row?.idsls_ ?? rawRow[0],
      );
      const petaValue =
        row?.peta ??
        row?.Peta ??
        row?.aa ??
        row?.AA ??
        row?.a_a ??
        row?.is_peta ??
        rawRow[26] ??
        rawRow[29] ??
        rawRow[25] ??
        "";
      const isTrue = isTrueFlag(petaValue);
      if (idsls && isTrue) next.add(idsls);
    });
    return next;
  }, [petaData]);
  const petaMissingIds = useMemo(() => {
    const next = new Set<string>();
    (petaData || []).forEach((row: any) => {
      const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
      const idsls = normalizeSheetId(
        row?.idsubsls ?? row?.idsls ?? row?.id_sls ?? row?.idsls_ ?? rawRow[0],
      );
      const petaValue =
        row?.peta ??
        row?.Peta ??
        row?.aa ??
        row?.AA ??
        row?.a_a ??
        row?.is_peta ??
        rawRow[26] ??
        rawRow[29] ??
        rawRow[25] ??
        "";
      const isTrue = isTrueFlag(petaValue);
      if (idsls && !isTrue) next.add(idsls);
    });
    return next;
  }, [petaData]);

  const monitoringRows = useMemo(() => {
    const allowedKecamatan = kecamatanFromRole(
      String(user?.role || "").toLowerCase(),
    );
    const rows = (monitoringAdminData || []).map((row: any) => {
      const raw = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
      const asText = (index: number) => String(raw[index] ?? "").trim();
      const asBooleanText = (index: number) => {
        const value = String(raw[index] ?? "").trim().toLowerCase();
        if (["true", "1", "yes", "ya", "y"].includes(value)) return "Ya";
        if (["false", "0", "no", "tidak", "n"].includes(value)) return "Belum";
        return value || "-";
      };
      const kecamatanName = asText(1);
      return {
        no: asText(0),
        kecamatan: kecamatanName,
        namaPml: asText(2),
        namaPpl: asText(3),
        jumlahSls: asText(4),
        slsSelesai: asText(5),
        ujiPetik: asBooleanText(6),
        bast: asText(7),
        bapp: asText(8),
        peta: asBooleanText(9),
        anomali: asBooleanText(10),
        adaNr: asBooleanText(11),
        banr: asText(12),
        normalizedKecamatan: normalizeKecamatan(kecamatanName),
      };
    });

    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !needle ||
        `${row.kecamatan} ${row.namaPml} ${row.namaPpl} ${row.bast} ${row.bapp} ${row.banr}`
          .toLowerCase()
          .includes(needle);
      const matchesRole =
        !isPmlUser ||
        allowedKecamatan.includes(row.normalizedKecamatan);
      const matchesKecamatan =
        kecamatan === "all" || row.kecamatan === kecamatan;
      return matchesSearch && matchesRole && matchesKecamatan;
    });
  }, [monitoringAdminData, search, kecamatan, isPmlUser, user?.role]);

  useEffect(() => {
    const timestamp = String(timestampData?.[0] ?? "").trim();
    if (timestamp) setVerificationTimestamp(timestamp);
  }, [timestampData]);

  const recordVerificationTimestamp = async () => {
    if (!isPpk || savingVerificationTimestamp) return;
    setSavingVerificationTimestamp(true);
    const timestamp = formatVerificationTimestamp();
    try {
      const { error: updateError } = await supabase.functions.invoke(
        "google-sheets",
        {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "batch-update",
            updates: [
              {
                range: `'${SHEET_NAME}'!AA1`,
                values: [[timestamp]],
              },
            ],
          },
        },
      );
      if (updateError) throw updateError;
      setVerificationTimestamp(timestamp);
    } catch (err: any) {
      console.error("Gagal merekam waktu verifikasi akhir:", err);
    } finally {
      setSavingVerificationTimestamp(false);
    }
  };

  const { pplRows, pmlRows } = useMemo(() => {
    const pplMap = new Map<string, PplRow>();
    const pmlMap = new Map<string, PmlRow>();
    (data || []).forEach((row: any, index) => {
      const namaPpl = text(row, SHEET_COLUMNS.namaPpl, "nama_ppl");
      const namaPml = text(row, SHEET_COLUMNS.namaPml, "nama_pml");
      const kec = text(row, SHEET_COLUMNS.kecamatan, "nmkec");
      const allowedKecamatan = kecamatanFromRole(
        String(user?.role || "").toLowerCase(),
      );
      if (
        isPmlUser &&
        !allowedKecamatan.includes(normalizeKecamatan(kec))
      )
        return;
      if (!namaPpl && !namaPml) return;
      const detailMetrics = emptyMetrics();
      addMetrics(detailMetrics, row);
      const rowNumber = index + 2;
      const pplAction: ActionRecord = {
        rowNumber,
        values: {
          S: text(row, 18, "flag_pml"),
          T: text(row, 19, "pjk"),
          U: text(row, 20, "ketua_tim_se2026"),
          V: text(row, 21, "ppk"),
        },
      };
      const pmlAction: ActionRecord = {
        rowNumber,
        values: {
          W: text(row, 22, "pjk_pml"),
          X: text(row, 23, "ketua_tim_se2026_pml"),
          Y: text(row, 24, "ppk_pml"),
        },
      };
      const detail: DetailRow = {
        ...detailMetrics,
        id: `${index}`,
        idsubsls: text(row, 0, "idsubsls"),
        nmsls: text(row, 1, "nmsls"),
        desa: text(row, SHEET_COLUMNS.desa, "nmdesa"),
        kecamatan: kec,
        action: pplAction,
      };

      if (namaPpl) {
        const key = `${namaPpl.toLowerCase()}|${kec.toLowerCase()}`;
        const current = pplMap.get(key) || {
          ...emptyMetrics(),
          id: key,
          nama: namaPpl,
          kecamatan: kec,
          details: [],
          actionRows: [],
        };
        addMetricObject(current, detailMetrics);
        current.details.push(detail);
        current.actionRows.push(pplAction);
        pplMap.set(key, current);
      }
      if (namaPml) {
        const key = `${namaPml.toLowerCase()}|${kec.toLowerCase()}`;
        const current = pmlMap.get(key) || {
          ...emptyMetrics(),
          id: key,
          nama: namaPml,
          kecamatan: kec,
          children: [],
          actionRows: [],
        };
        addMetricObject(current, detailMetrics);
        current.actionRows.push(pmlAction);
        const child = current.children.find(
          (item) => item.nama.toLowerCase() === namaPpl.toLowerCase(),
        );
        if (child) {
          addMetricObject(child, detailMetrics);
          child.actionRows.push(pmlAction);
          child.pplActionRows.push(pplAction);
        } else
          current.children.push({
            ...emptyMetrics(),
            nama: namaPpl,
            actionRows: [pmlAction],
            pplActionRows: [pplAction],
            ...detailMetrics,
          });
        pmlMap.set(key, current);
      }
    });
    return {
      pplRows: Array.from(pplMap.values()),
      pmlRows: Array.from(pmlMap.values()),
    };
  }, [data, isPmlUser, user?.role]);

  const kecamatanOptions = useMemo(() => {
    const allowedKecamatan = kecamatanFromRole(
      String(user?.role || "").toLowerCase(),
    );
    const values = [...pplRows, ...pmlRows, ...monitoringRows]
      .map((row) => row.kecamatan)
      .filter(Boolean)
      .filter((kecamatanName) =>
        !isPmlUser ||
        allowedKecamatan.includes(normalizeKecamatan(kecamatanName)),
      );

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "id"));
  }, [pplRows, pmlRows, monitoringRows, isPmlUser, user?.role]);
  const filterRows = <T extends { nama: string; kecamatan: string }>(
    rows: T[],
  ) =>
    rows.filter((row) => {
      const needle = search.trim().toLowerCase();
      return (
        (!needle ||
          `${row.nama} ${row.kecamatan}`.toLowerCase().includes(needle)) &&
        (kecamatan === "all" || row.kecamatan === kecamatan)
      );
    });
  const sortRows = <T extends Record<string, any>>(
    rows: T[],
    key: SortKey,
    direction: Direction,
  ) => [...rows].sort((a, b) => compareValues(a, b, key, direction, actionOverrides));
  const filteredPpl = useMemo(
    () => sortRows(filterRows(pplRows), pplSort, pplDirection),
    [pplRows, search, kecamatan, pplSort, pplDirection, actionOverrides],
  );
  const filteredPml = useMemo(
    () => sortRows(filterRows(pmlRows), pmlSort, pmlDirection),
    [pmlRows, search, kecamatan, pmlSort, pmlDirection, actionOverrides],
  );
  const isPmlReadyForFlag = (row: PmlRow) =>
    row.children.length > 0 &&
    row.children.every((child) => {
      const ppl = pplRows.find(
        (item) =>
          item.nama.toLowerCase() === child.nama.toLowerCase() &&
          item.kecamatan.toLowerCase() === row.kecamatan.toLowerCase(),
      );
      return !!ppl && actionValue(ppl.actionRows, "S", actionOverrides) !== "";
    });
  const pplTotalPages = Math.max(1, Math.ceil(filteredPpl.length / pageSize));
  const pmlTotalPages = Math.max(1, Math.ceil(filteredPml.length / pageSize));
  const monitoringTotalPages = Math.max(1, Math.ceil(monitoringRows.length / pageSize));
  const visiblePpl = filteredPpl.slice(
    (pplPage - 1) * pageSize,
    pplPage * pageSize,
  );
  const visiblePml = filteredPml.slice(
    (pmlPage - 1) * pageSize,
    pmlPage * pageSize,
  );
  const visibleMonitoring = monitoringRows.slice(
    (monitoringPage - 1) * pageSize,
    monitoringPage * pageSize,
  );

  useEffect(() => {
    setPplPage(1);
    setPmlPage(1);
    setMonitoringPage(1);
  }, [search, kecamatan, pageSize]);
  const toggleSort = (tab: "ppl" | "pml", key: SortKey) => {
    if (tab === "ppl") {
      setPplSort(key);
      setPplDirection((current) =>
        pplSort === key ? (current === "asc" ? "desc" : "asc") : "asc",
      );
      setPplPage(1);
    } else {
      setPmlSort(key);
      setPmlDirection((current) =>
        pmlSort === key ? (current === "asc" ? "desc" : "asc") : "asc",
      );
      setPmlPage(1);
    }
  };

  const groupClass = {
    neutral: "bg-slate-100",
    blue: "bg-blue-100",
    orange: "bg-orange-100",
    green: "bg-emerald-100",
  };
  const groups = [
    {
      label: "IDENTIFIKASI AWAL",
      color: "neutral",
      keys: ["jumlahAssignment", "open", "draft"] as MetricKey[],
    },
    {
      label: "KELUARGA DAN PENDUDUK",
      color: "blue",
      keys: [
        "keluargaPrelist",
        "keluargaWilkerstat",
        "keluarga",
        "art",
      ] as MetricKey[],
    },
    {
      label: "USAHA NON PERTANIAN",
      color: "orange",
      keys: [
        "prelistUsaha",
        "nonPertanianWilkerstat",
        "nonPertanian",
      ] as MetricKey[],
    },
    {
      label: "USAHA PERTANIAN",
      color: "green",
      keys: ["utpSt2023", "pertanian"] as MetricKey[],
    },
  ] as const;
  const metricLabel = Object.fromEntries(METRIC_COLUMNS) as Record<
    MetricKey,
    string
  >;
  const downloadExcel = () => {
    const isPpl = activeTab === "ppl";
    const isMonitoring = activeTab === "monitoring-administrasi";
    if (isMonitoring) {
      const headers = [
        "No",
        "Kecamatan",
        "Nama PML",
        "Nama PPL",
        "Jumlah SLS",
        "SLS Selesai",
        "Uji Petik",
        "BAST",
        "BAPP",
        "PETA",
        "Anomali",
        "Ada NR",
        "BANR",
      ];
      const rowsForExport = monitoringRows.map((row, index) => [
        index + 1,
        row.kecamatan,
        row.namaPml,
        row.namaPpl,
        row.jumlahSls,
        row.slsSelesai,
        row.ujiPetik,
        row.bast,
        row.bapp,
        row.peta,
        row.anomali,
        row.adaNr,
        row.banr,
      ]);
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["MONITORING ADMINISTRASI 9-LK PPL"],
        ["Tanggal Export", new Date().toLocaleString("id-ID")],
        ["Filter Kecamatan", kecamatan === "all" ? "Semua Kecamatan" : kecamatan],
        ["Pencarian", search || "-"],
        [],
        headers,
        ...rowsForExport,
      ]);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Monitoring Administrasi");
      XLSX.writeFile(
        workbook,
        `Monitoring_Administrasi_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      return;
    }
    const rows = isPpl ? filteredPpl : filteredPml;
    const actionColumns: ActionColumn[] = isPpl ? ["S", "T", "U", "V"] : ["W", "X", "Y"];
    const actionLabels = isPpl
      ? ["Flag PML", "PJ Kecamatan", "Ketua Tim SE2026", "PPK"]
      : ["PJ Kecamatan", "Ketua Tim SE2026", "PPK"];
    const headers = [
      "No",
      isPpl ? "Nama PPL" : "Nama PML",
      "Kecamatan",
      ...METRIC_COLUMNS.map(([, label]) => label),
      ...actionLabels,
    ];
    const rowsForExport = rows.map((row, index) => [
      index + 1,
      row.nama,
      row.kecamatan,
      ...METRIC_COLUMNS.map(([key]) => row[key]),
      ...actionColumns.map((column) => actionValue(row.actionRows, column, actionOverrides)),
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([
      [`REKAP VERIFIKASI AKHIR ${isPpl ? "PPL" : "PML"}`],
      ["Tanggal Export", new Date().toLocaleString("id-ID")],
      ["Filter Kecamatan", kecamatan === "all" ? "Semua Kecamatan" : kecamatan],
      ["Pencarian", search || "-"],
      [],
      headers,
      ...rowsForExport,
    ]);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 20 },
      ...METRIC_COLUMNS.map(() => ({ wch: 18 })),
      ...actionColumns.map(() => ({ wch: 24 })),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isPpl ? "PPL" : "PML");
    XLSX.writeFile(
      workbook,
      `Verifikasi_Akhir_${isPpl ? "PPL" : "PML"}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };
  const renderGroupedHeads = (
    sort: SortKey,
    direction: Direction,
    tab: "ppl" | "pml",
  ) => (
    <>
      <TableRow className="border-b-0">
        {groups.map((group) => (
          <TableHead
            key={group.label}
            colSpan={group.keys.length}
            className={`text-center text-xs font-bold text-slate-700 ${groupClass[group.color]}`}
          >
            {group.label}
          </TableHead>
        ))}
      </TableRow>
      <TableRow className="bg-white">
        {groups.flatMap((group) =>
          group.keys.map((key) => (
            <SortHead
              key={key}
              label={metricLabel[key]}
              active={sort === key}
              direction={direction}
              onClick={() => toggleSort(tab, key)}
              className={groupClass[group.color]}
            />
          )),
        )}
      </TableRow>
    </>
  );
  const getMetricGroup = (key: MetricKey) =>
    groups.find((group) => group.keys.includes(key));
  const renderStatusBadge = (value: string, dashInsteadOfX = false) => {
    const normalized = String(value ?? "").trim();
    if (normalized === "Ya") {
      return (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-100">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      );
    }
    if (normalized === "Belum") {
      if (dashInsteadOfX) {
        return (
          <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-500">
            -
          </span>
        );
      }
      return (
        <span className="inline-flex items-center justify-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-rose-700">
          <X className="h-3 w-3" strokeWidth={3} />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-500">
        -
      </span>
    );
  };

  const renderMonitoringLink = (url: string, label: string) => {
    const trimmed = String(url ?? "").trim();
    if (!trimmed) {
      return (
        <span className="inline-flex items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium italic text-slate-500 leading-none">
          link belum tersedia
        </span>
      );
    }

    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 hover:text-sky-800"
        title={label}
      >
        <Link2 className="h-3.5 w-3.5" strokeWidth={2.5} />
        <span className="sr-only">{label}</span>
      </a>
    );
  };

  const renderMetricCell = (row: Metrics, key: MetricKey, detail = false) => {
    const percentages =
      key === "open"
        ? [
            {
              value: formatPercent(row.open, row.jumlahAssignment),
              color: row.open === 0 ? "text-emerald-600" : "text-red-600",
            },
          ]
        : key === "draft"
          ? [
              {
                value: formatPercent(row.draft, row.jumlahAssignment),
                color: row.draft === 0 ? "text-emerald-600" : "text-red-600",
              },
            ]
          : key === "keluarga"
            ? [
                {
                  value: formatPercent(row.keluarga, row.keluargaPrelist),
                  color: percentClass(row.keluarga, row.keluargaPrelist),
                },
                {
                  value: formatPercent(row.keluarga, row.keluargaWilkerstat),
                  color: percentClass(row.keluarga, row.keluargaWilkerstat),
                },
              ]
            : key === "nonPertanian"
              ? [
                  {
                    value: formatPercent(row.nonPertanian, row.prelistUsaha),
                    color: percentClass(row.nonPertanian, row.prelistUsaha),
                  },
                  {
                    value: formatPercent(
                      row.nonPertanian,
                      row.nonPertanianWilkerstat,
                    ),
                    color: percentClass(
                      row.nonPertanian,
                      row.nonPertanianWilkerstat,
                    ),
                  },
                ]
              : key === "pertanian"
                ? [
                    {
                      value: formatPercent(row.pertanian, row.utpSt2023),
                      color: percentClass(row.pertanian, row.utpSt2023),
                    },
                  ]
                : [];
    const group = getMetricGroup(key);
    const cellBackground =
      group?.color === "blue"
        ? "bg-blue-100/75"
        : group?.color === "orange"
          ? "bg-orange-100/75"
          : group?.color === "green"
            ? "bg-emerald-100/75"
            : "bg-slate-100/80";
    const widthClass =
      key === "keluarga" || key === "nonPertanian"
        ? "w-[80px] sm:w-[120px] min-w-[80px] sm:min-w-[120px] max-w-[80px] sm:max-w-[120px]"
        : key === "prelistUsaha"
          ? "w-[60px] sm:w-[76px] min-w-[60px] sm:min-w-[76px] max-w-[60px] sm:max-w-[76px]"
          : key === "nonPertanianWilkerstat"
            ? "w-[50px] sm:w-[60px] min-w-[50px] sm:min-w-[60px] max-w-[50px] sm:max-w-[60px]"
        : COMPACT_METRIC_KEYS.has(key)
          ? "w-[60px] sm:w-[88px] min-w-[60px] sm:min-w-[88px] max-w-[60px] sm:max-w-[88px]"
          : "w-[70px] sm:w-[104px] min-w-[70px] sm:min-w-[104px] max-w-[70px] sm:max-w-[104px]";
    return (
      <TableCell
        key={key}
        className={`${widthClass} px-1 sm:px-2 py-1.5 sm:py-2 text-right align-middle font-semibold text-[10px] sm:text-sm ${cellBackground} ${detail ? "text-slate-700" : "text-slate-900"}`}
      >
        <div className="whitespace-nowrap">{formatNumber(row[key])}</div>
        {percentages.length > 0 && (
          <div className="flex flex-wrap justify-end gap-x-0.5 sm:gap-x-1 whitespace-normal text-[8px] sm:text-[11px] font-medium leading-tight">
            {percentages.map((percentage, index) => (
              <React.Fragment key={`${key}-${index}`}>
                {index > 0 && <span className="text-slate-500\">|</span>}
                <span className={percentage.color}>{percentage.value}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </TableCell>
    );
  };
  const hasAllPetaInPplWork = (row: Metrics & Partial<{ details: DetailRow[]; children: PmlChild[]; kecamatan: string; nama: string }>) => {
    const detailRows =
      "details" in row && Array.isArray(row.details)
        ? row.details
        : "children" in row && Array.isArray(row.children)
          ? row.children.flatMap((child) => {
              const matchingPpl = pplRows.find(
                (ppl) =>
                  normalizeKecamatan(ppl.nama || "") === normalizeKecamatan(child.nama || "") &&
                  normalizeKecamatan(ppl.kecamatan || "") === normalizeKecamatan(row.kecamatan || ""),
              );
              return matchingPpl?.details ?? [];
            })
          : [];
    if (detailRows.length === 0) return false;
    return detailRows.every((detailItem) => {
      const value = detailItem.idsubsls ? normalizeSheetId(detailItem.idsubsls) : "";
      return value && petaMatchedIds.has(value);
    });
  };

  const renderMetrics = (
    row: Metrics & Partial<{ actionRows: ActionRecord[]; kecamatan: string; idsubsls: string }>,
    detail = false,
    actionRecords?: ActionRecord[],
  ) => {
    const normalizedIdsls = row?.idsubsls
      ? normalizeSheetId(row.idsubsls)
      : "";
    const petaStatus =
      detail &&
      activeTab === "ppl" &&
      normalizedIdsls
        ? petaMatchedIds.has(normalizedIdsls)
          ? { text: "Peta dan PSLS: Sudah Diterima", tone: "success" }
          : petaMissingIds.has(normalizedIdsls)
            ? { text: "Peta dan PSLS: Belum Diterima", tone: "warning" }
            : null
        : null;
    const petaAllEnteredForRow =
      activeTab === "ppl" && row && hasAllPetaInPplWork(row as Metrics & Partial<{ details: DetailRow[]; children: PmlChild[]; kecamatan: string; nama: string }>);

    return (
      <>
        {groups.flatMap((group) =>
          group.keys.map((key) => renderMetricCell(row, key, detail)),
        )}
        {detail && !actionRecords ? (
          activeTab === "ppl" ? (
            <TableCell
              colSpan={4}
              className="bg-violet-50/50 px-2 py-2 text-left align-middle"
            >
              {petaStatus ? (
                <div
                  className={`min-w-[180px] whitespace-normal break-words rounded-md border px-2 py-1.5 text-[10px] sm:text-xs leading-snug font-medium ${
                    petaStatus.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {petaStatus.text}
                </div>
              ) : (
                <div className="min-w-[180px] whitespace-normal break-words text-[10px] sm:text-xs leading-snug text-slate-400">
                  -
                </div>
              )}
            </TableCell>
          ) : (
            <>
              {Array.from({ length: 3 }, (_, index) => (
                <TableCell
                  key={`empty-action-${index}`}
                  className="bg-violet-50/50 px-1 py-2 text-center text-[10px] sm:text-xs text-slate-700 align-middle"
                >
                  {""}
                </TableCell>
              ))}
            </>
          )
        ) : (
          <KabupatenActions
            records={actionRecords || row.actionRows || []}
            columns={
              actionRecords
                ? ["T", "U", "V"]
                : activeTab === "ppl"
                  ? ["T", "U", "V"]
                  : ["W", "X", "Y"]
            }
            showPmlFlag={activeTab === "ppl" && !detail && !actionRecords}
            disablePmlFlag={
              activeTab === "ppl" &&
              !detail &&
              !actionRecords &&
              (!petaAllEnteredForRow || Number(row.open) !== 0 || Number(row.draft) !== 0)
            }
            petaAllEntered={petaAllEnteredForRow}
            overrides={actionOverrides}
            kecamatan={row.kecamatan || ""}
            allPplFlagged={
              !!actionRecords ||
              detail ||
              (activeTab === "ppl"
                ? actionValue(row.actionRows || [], "S", actionOverrides) !== ""
                : "children" in row && isPmlReadyForFlag(row as PmlRow))
            }
            onSaved={(updates) =>
              setActionOverrides((current) => ({ ...current, ...updates }))
            }
          />
        )}
      </>
    );
  };
  const renderTotalRow = <T extends Metrics>(
    rows: T[],
    label: string,
    className = "bg-slate-200",
  ) => {
    const rowsToTotal =
      label === "JUMLAH SESUAI FILTER"
        ? activeTab === "ppl"
          ? visiblePpl
          : visiblePml
        : rows;
    const total = rowsToTotal.reduce((sum, row) => {
      addMetricObject(sum, row);
      return sum;
    }, emptyMetrics());
    return (
      <TableRow
        className={`border-t-2 border-slate-300 ${className} font-bold`}
      >
        <TableCell />
        <TableCell className="px-3 py-3 text-slate-900">{label}</TableCell>
        <TableCell />
        {renderMetrics(total, true)}
      </TableRow>
    );
  };
  const renderColumnGroup = (actionCount: number) => (
    <colgroup>
      <col className="w-[3%]" />
      <col className="w-[14%]" />
      <col className="w-[9%]" />
      {groups.flatMap((group) => group.keys).map((key) => (
        <col
          key={key}
          className={
            key === "keluarga" || key === "nonPertanian"
              ? "w-[7%]"
              : key === "prelistUsaha"
                ? "w-[4%]"
                : key === "nonPertanianWilkerstat"
                  ? "w-[3.5%]"
                : "w-[5%]"
          }
        />
      ))}
      {Array.from({ length: actionCount }, (_, index) => (
        <col key={`action-col-${index}`} className={index === actionCount - 1 ? "w-[6%]" : "w-[3%]"} />
      ))}
    </colgroup>
  );

  return (
    <div className="space-y-4 sm:space-y-6 py-3 sm:py-6 px-2 sm:px-0">
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-slate-50 px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl sm:text-2xl">Verifikasi Akhir</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Rekap verifikasi akhir Sensus Ekonomi 2026 untuk pembayaran honor
                Petugas Lapangan
              </CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 w-full sm:w-auto sm:items-end">
              {isPpk && (
                <button
                  type="button"
                  onClick={recordVerificationTimestamp}
                  disabled={savingVerificationTimestamp}
                  className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                  title="Rekam waktu verifikasi akhir ke sel AA1"
                >
                  {savingVerificationTimestamp ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Save className="h-4 w-4 shrink-0" />
                  )}
                  <span className="hidden sm:inline">Rekam Waktu Verifikasi</span>
                  <span className="sm:hidden">Rekam</span>
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 [&_table]:!w-full [&_table]:!min-w-0 [&_.overflow-auto]:!overflow-hidden [&_.overflow-x-auto]:!overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className={`mb-4 sm:mb-5 grid w-full max-w-2xl text-xs sm:text-sm ${isPmlUser ? "grid-cols-3" : "grid-cols-4"}`}
            >
              <TabsTrigger value="ppl" className="text-xs sm:text-sm">PPL ({filteredPpl.length})</TabsTrigger>
              {!isPmlUser && (
                <TabsTrigger value="pml" className="text-xs sm:text-sm">PML ({filteredPml.length})</TabsTrigger>
              )}
              <TabsTrigger value="monitoring-administrasi" className="text-xs sm:text-sm">Monitoring Administrasi</TabsTrigger>
              <TabsTrigger value="kuadran" className="text-xs sm:text-sm">KUADRAN</TabsTrigger>
            </TabsList>
            <div className="mb-4 flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
              <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama atau kecamatan..."
                    className="h-9 pl-9 text-xs sm:text-sm"
                  />
              </div>
              {verificationTimestamp && (
                <div className="shrink-0 text-xs font-bold text-red-600">
                  Terakhir direkam: {verificationTimestamp}
                </div>
              )}
                {isPpk && (
                  <button
                    type="button"
                    title={`Download Excel ${activeTab.toUpperCase()}`}
                    aria-label={`Download Excel ${activeTab.toUpperCase()}`}
                    onClick={downloadExcel}
                    disabled={loading || !!error}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span>Excel</span>
                  </button>
                )}
                <select
                  aria-label="Filter kecamatan"
                  value={kecamatan}
                  onChange={(event) => {
                    setKecamatan(event.target.value);
                    setPplPage(1);
                    setPmlPage(1);
                  }}
                  className="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700"
                >
                  <option value="all">Semua Kec.</option>
                  {kecamatanOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Jumlah baris per halaman"
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}/hal
                    </option>
                  ))}
                </select>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-slate-500">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin shrink-0" /> Memuat data...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-rose-600">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> {String(error)}
              </div>
            ) : (
              <>
                <TabsContent value="monitoring-administrasi" className="mt-0">
                  <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-none sm:rounded-lg border-0 sm:border border-slate-200">
                    <Table className="w-full table-auto border-separate border-spacing-0">
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="min-w-[40px] w-[40px] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">No</TableHead>
                          <TableHead className="min-w-[120px] w-[12%] text-left align-middle text-[10px] sm:text-xs font-bold text-slate-700">Kecamatan</TableHead>
                          <TableHead className="min-w-[140px] w-[14%] text-left align-middle text-[10px] sm:text-xs font-bold text-slate-700">Nama PML</TableHead>
                          <TableHead className="min-w-[140px] w-[14%] text-left align-middle text-[10px] sm:text-xs font-bold text-slate-700">Nama PPL</TableHead>
                          <TableHead className="min-w-[80px] w-[8%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">Jumlah SLS</TableHead>
                          <TableHead className="min-w-[90px] w-[9%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">SLS Selesai</TableHead>
                          <TableHead className="min-w-[80px] w-[8%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">Uji Petik</TableHead>
                          <TableHead className="min-w-[80px] w-[8%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">BAST</TableHead>
                          <TableHead className="min-w-[80px] w-[8%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">BAPP</TableHead>
                          <TableHead className="min-w-[80px] w-[8%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">PETA</TableHead>
                          <TableHead className="min-w-[80px] w-[8%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">Anomali</TableHead>
                          <TableHead className="min-w-[80px] w-[8%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">Ada NR</TableHead>
                          <TableHead className="min-w-[120px] w-[12%] text-center align-middle text-[10px] sm:text-xs font-bold text-slate-700">BANR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleMonitoring.map((row, index) => (
                          <TableRow key={`${row.kecamatan}-${row.namaPpl}-${index}`} className="border-b hover:bg-slate-50">
                            <TableCell className="text-center text-[10px] sm:text-xs text-slate-500">{(monitoringPage - 1) * pageSize + index + 1}</TableCell>
                            <TableCell className="break-words px-2 py-2 text-[10px] sm:text-xs text-slate-800">{row.kecamatan || "-"}</TableCell>
                            <TableCell className="break-words px-2 py-2 text-[10px] sm:text-xs text-slate-800">{row.namaPml || "-"}</TableCell>
                            <TableCell className="break-words px-2 py-2 text-[10px] sm:text-xs text-slate-800">{row.namaPpl || "-"}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs text-slate-700">{row.jumlahSls || "-"}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs text-slate-700">{row.slsSelesai || "-"}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs">{renderStatusBadge(row.ujiPetik, true)}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs">{renderMonitoringLink(row.bast, "BAST")}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs">{renderMonitoringLink(row.bapp, "BAPP")}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs">{renderStatusBadge(row.peta)}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs">{renderStatusBadge(row.anomali, true)}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs">{renderStatusBadge(row.adaNr, true)}</TableCell>
                            <TableCell className="text-center text-[10px] sm:text-xs">{renderMonitoringLink(row.banr, "BANR")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    page={monitoringPage}
                    totalPages={monitoringTotalPages}
                    onPage={setMonitoringPage}
                    count={monitoringRows.length}
                    pageSize={pageSize}
                  />
                </TabsContent>
                <TabsContent value="kuadran" className="mt-0">
                  <KuadranTab data={data || []} isPmlUser={isPmlUser} role={String(user?.role || "")} />
                </TabsContent>
                <TabsContent value="ppl" className="mt-0">
                  <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-none sm:rounded-lg border-0 sm:border border-slate-200\">
                    <Table className="table-fixed min-w-[1400px] sm:min-w-[1610px]\">
                      <>{renderColumnGroup(4)}</>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead
                            rowSpan={2}
                            className="w-12 text-center align-middle"
                          >
                            No
                          </TableHead>
                          <SortHead
                            rowSpan={2}
                            label="Nama PPL"
                            active={pplSort === "nama"}
                            direction={pplDirection}
                            onClick={() => toggleSort("ppl", "nama")}
                            numeric={false}
                          />
                          <SortHead
                            rowSpan={2}
                            label="Kecamatan"
                            active={pplSort === "kecamatan"}
                            direction={pplDirection}
                            onClick={() => toggleSort("ppl", "kecamatan")}
                            numeric={false}
                          />
                          {groups.map((group) => (
                            <TableHead
                              key={group.label}
                              colSpan={group.keys.length}
                              className={`whitespace-normal text-center text-[10px] sm:text-xs font-bold ${groupClass[group.color]}`}
                            >
                              {group.label}
                            </TableHead>
                          ))}
                          <TableHead
                            colSpan={4}
                            className="border border-violet-200 bg-violet-100 text-center text-[10px] sm:text-xs font-bold text-violet-900"
                          >
                            AKSI KAB
                          </TableHead>
                        </TableRow>
                        <TableRow>
                          {groups.flatMap((group) =>
                            group.keys.map((key) => (
                              <SortHead
                                key={key}
                                label={metricLabel[key]}
                                active={pplSort === key}
                                direction={pplDirection}
                                onClick={() => toggleSort("ppl", key)}
                                className={groupClass[group.color]}
                              />
                            )),
                          )}
                          <SortHead
                            label="Flag PML"
                            active={pplSort === "flagPml"}
                            direction={pplDirection}
                            onClick={() => toggleSort("ppl", "flagPml")}
                            numeric={false}
                            className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900"
                          />
                          <SortHead
                            label="PJ Kec"
                            active={pplSort === "pjKec"}
                            direction={pplDirection}
                            onClick={() => toggleSort("ppl", "pjKec")}
                            numeric={false}
                            className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900"
                          />
                          <SortHead
                            label="Ketua SE2026"
                            active={pplSort === "ketuaSe2026"}
                            direction={pplDirection}
                            onClick={() => toggleSort("ppl", "ketuaSe2026")}
                            numeric={false}
                            className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900"
                          />
                          <SortHead
                            label="PPK"
                            active={pplSort === "ppk"}
                            direction={pplDirection}
                            onClick={() => toggleSort("ppl", "ppk")}
                            numeric={false}
                            className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold text-violet-900"
                          />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visiblePpl.map((row, index) => {
                          const expanded = expandedPpl.has(row.id);
                          return (
                            <React.Fragment key={row.id}>
                              <TableRow className="border-b hover:bg-slate-50">
                                <TableCell className="text-center text-slate-500">
                                  {(pplPage - 1) * pageSize + index + 1}
                                </TableCell>
                                <TableCell
                                  className="cursor-pointer px-1.5 sm:px-3 py-2 sm:py-3 font-medium text-xs sm:text-sm text-slate-800"
                                  onClick={() =>
                                    setExpandedPpl((current) => {
                                      const next = new Set(current);
                                      next.has(row.id)
                                        ? next.delete(row.id)
                                        : next.add(row.id);
                                      return next;
                                    })
                                  }
                                >
                                  <span className="inline-flex items-center gap-1 sm:gap-2 break-words">
                                    {expanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                    )}
                                    {row.nama}
                                  </span>
                                </TableCell>
                                <TableCell className="break-words px-1.5 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm">
                                  {row.kecamatan || "-"}
                                </TableCell>
                                {renderMetrics(row)}
                              </TableRow>
                              {expanded &&
                                row.details.map((detail) => (
                                  <TableRow
                                    key={detail.id}
                                    className="bg-slate-50"
                                  >
                                    <TableCell />
                                    <TableCell className="break-words pl-6 sm:pl-9 text-[10px] sm:text-sm italic text-slate-700">
                                      {detail.nmsls || "-"}
                                    </TableCell>
                                    <TableCell className="break-words text-[10px] sm:text-sm text-slate-600">
                                      <div>{detail.desa || detail.kecamatan || "-"}</div>
                                      <div className="mt-0.5 text-[8px] sm:text-[11px] text-slate-400">
                                        {detail.idsubsls || "-"}
                                      </div>
                                    </TableCell>
                                    {renderMetrics(detail, true)}
                                  </TableRow>
                                ))}
                            </React.Fragment>
                          );
                        })}
                        {renderTotalRow(filteredPpl, "JUMLAH SESUAI FILTER")}
                        {renderTotalRow(
                          pplRows,
                          "JUMLAH KESELURUHAN",
                          "bg-slate-100",
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    page={pplPage}
                    totalPages={pplTotalPages}
                    onPage={setPplPage}
                    count={filteredPpl.length}
                    pageSize={pageSize}
                  />
                </TabsContent>
                <TabsContent value="pml" className="mt-0">
                  <div className="-mx-3 sm:mx-0 overflow-x-auto rounded-none sm:rounded-lg border-0 sm:border border-slate-200\">
                    <Table className="table-fixed min-w-[1400px] sm:min-w-[1610px]\">
                      <>{renderColumnGroup(3)}</>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead
                            rowSpan={2}
                            className="w-8 sm:w-12 text-center align-middle text-xs sm:text-sm px-1 sm:px-2"
                          >
                            No
                          </TableHead>
                          <SortHead
                            rowSpan={2}
                            label="Nama PML"
                            active={pmlSort === "nama"}
                            direction={pmlDirection}
                            onClick={() => toggleSort("pml", "nama")}
                            numeric={false}
                          />
                          <SortHead
                            rowSpan={2}
                            label="Kecamatan"
                            active={pmlSort === "kecamatan"}
                            direction={pmlDirection}
                            onClick={() => toggleSort("pml", "kecamatan")}
                            numeric={false}
                          />
                          {groups.map((group) => (
                            <TableHead
                              key={group.label}
                              colSpan={group.keys.length}
                              className={`whitespace-normal text-center text-[10px] sm:text-xs font-bold ${groupClass[group.color]}`}
                            >
                              {group.label}
                            </TableHead>
                          ))}
                          <TableHead
                            colSpan={3}
                            className="border border-violet-200 bg-violet-100 text-center text-[10px] sm:text-xs font-bold text-violet-900"
                          >
                            AKSI KAB
                          </TableHead>
                        </TableRow>
                        <TableRow>
                          {groups.flatMap((group) =>
                            group.keys.map((key) => (
                              <SortHead
                                key={key}
                                label={metricLabel[key]}
                                active={pmlSort === key}
                                direction={pmlDirection}
                                onClick={() => toggleSort("pml", key)}
                                className={groupClass[group.color]}
                              />
                            )),
                          )}
                          <SortHead
                            label="PJ Kec"
                            active={pmlSort === "pjKec"}
                            direction={pmlDirection}
                            onClick={() => toggleSort("pml", "pjKec")}
                            numeric={false}
                            className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900"
                          />
                          <SortHead
                            label="Ketua SE2026"
                            active={pmlSort === "ketuaSe2026"}
                            direction={pmlDirection}
                            onClick={() => toggleSort("pml", "ketuaSe2026")}
                            numeric={false}
                            className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900"
                          />
                          <SortHead
                            label="PPK"
                            active={pmlSort === "ppk"}
                            direction={pmlDirection}
                            onClick={() => toggleSort("pml", "ppk")}
                            numeric={false}
                            className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold text-violet-900"
                          />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visiblePml.map((row, index) => {
                          const expanded = expandedPml.has(row.id);
                          return (
                            <React.Fragment key={row.id}>
                              <TableRow className="border-b hover:bg-slate-50">
                                <TableCell className="text-center text-xs sm:text-sm text-slate-500">
                                  {(pmlPage - 1) * pageSize + index + 1}
                                </TableCell>
                                <TableCell
                                  className="cursor-pointer px-1.5 sm:px-3 py-2 sm:py-3 font-medium text-xs sm:text-sm text-slate-800"
                                  onClick={() =>
                                    setExpandedPml((current) => {
                                      const next = new Set(current);
                                      next.has(row.id)
                                        ? next.delete(row.id)
                                        : next.add(row.id);
                                      return next;
                                    })
                                  }
                                >
                                  <span className="inline-flex items-center gap-1 sm:gap-2 break-words">
                                    {expanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                    )}
                                    {row.nama}
                                  </span>
                                </TableCell>
                                <TableCell className="break-words px-1.5 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm">
                                  {row.kecamatan || "-"}
                                </TableCell>
                                {renderMetrics(row)}
                              </TableRow>
                              {expanded &&
                                row.children.map((child) => (
                                  <TableRow key={`${row.id}-${child.nama}`} className="bg-slate-50">
                                    <TableCell />
                                    <TableCell className="break-words pl-6 sm:pl-9 text-[10px] sm:text-sm italic text-slate-700">
                                      <span className="inline-flex items-center gap-1 sm:gap-2">
                                        {child.nama || "-"}
                                      </span>
                                    </TableCell>
                                    <TableCell className="break-words text-[10px] sm:text-sm text-slate-600">
                                      {row.kecamatan || "-"}
                                    </TableCell>
                                    {renderMetrics(child, true, child.pplActionRows)}
                                  </TableRow>
                                ))}
                            </React.Fragment>
                          );
                        })}
                        {renderTotalRow(filteredPml, "JUMLAH SESUAI FILTER")}
                        {renderTotalRow(
                          pmlRows,
                          "JUMLAH KESELURUHAN",
                          "bg-slate-100",
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination
                    page={pmlPage}
                    totalPages={pmlTotalPages}
                    onPage={setPmlPage}
                    count={filteredPml.length}
                    pageSize={pageSize}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
  count,
  pageSize,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  count: number;
  pageSize: number;
}) {
  const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 px-2 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Menampilkan {start}-{Math.min(page * pageSize, count)} dari {count}{" "}
        petugas
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <span>
          Hal. {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
