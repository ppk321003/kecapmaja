import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Download,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
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
type SortKey = "nama" | "kecamatan" | MetricKey;
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
const formatPercent = (value: number, total: number) =>
  total > 0 ? `${((value / total) * 100).toFixed(2)}%` : "0.00%";
const normalizeKecamatan = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
const kecamatanFromRole = (role: string) => {
  const match = role.match(/(?:pj\s+kecamatan|pml)\s+(.+)/i);
  return match
    ? match[1].split(/\s+dan\s+/i).map(normalizeKecamatan).filter(Boolean)
    : [];
};
const percentClass = (value: number, total: number, alwaysRed = false) => {
  if (alwaysRed) return "text-red-600";
  const percentage = total > 0 ? (value / total) * 100 : 0;
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

const compareValues = (a: any, b: any, key: SortKey, direction: Direction) => {
  const aValue =
    key === "nama" || key === "kecamatan"
      ? String(a[key]).toLowerCase()
      : Number(a[key]);
  const bValue =
    key === "nama" || key === "kecamatan"
      ? String(b[key]).toLowerCase()
      : Number(b[key]);
  const result =
    typeof aValue === "number" && typeof bValue === "number"
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue), "id");
  return direction === "asc" ? result : -result;
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
  onSaved,
}: {
  records: ActionRecord[];
  columns: [ActionColumn, ActionColumn, ActionColumn];
  overrides: Record<string, string>;
  kecamatan: string;
  allPplFlagged?: boolean;
  showPmlFlag?: boolean;
  onSaved: (updates: Record<string, string>) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
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
    !pjkStarted;
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
      {showPmlFlag && (
        <TableCell className="w-[50px] sm:w-[64px] min-w-[50px] sm:min-w-[64px] bg-violet-50 px-0.5 sm:px-1 py-1 sm:py-2 text-center align-middle">
          <button
            type="button"
            aria-pressed={pmlFlag}
            title={pmlFlag ? "Batalkan flag PML" : "Flag verifikasi PML"}
            disabled={saving !== null || !canPml}
            onClick={() => write("S", pmlFlag ? "" : "Approve")}
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
  const [activeTab, setActiveTab] = useState("ppl");
  const [search, setSearch] = useState("");
  const [kecamatan, setKecamatan] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [pplPage, setPplPage] = useState(1);
  const [pmlPage, setPmlPage] = useState(1);
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

  const kecamatanOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...pplRows, ...pmlRows].map((row) => row.kecamatan).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "id")),
    [pplRows, pmlRows],
  );
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
  ) => [...rows].sort((a, b) => compareValues(a, b, key, direction));
  const filteredPpl = useMemo(
    () => sortRows(filterRows(pplRows), pplSort, pplDirection),
    [pplRows, search, kecamatan, pplSort, pplDirection],
  );
  const filteredPml = useMemo(
    () => sortRows(filterRows(pmlRows), pmlSort, pmlDirection),
    [pmlRows, search, kecamatan, pmlSort, pmlDirection],
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
  const visiblePpl = filteredPpl.slice(
    (pplPage - 1) * pageSize,
    pplPage * pageSize,
  );
  const visiblePml = filteredPml.slice(
    (pmlPage - 1) * pageSize,
    pmlPage * pageSize,
  );

  useEffect(() => {
    setPplPage(1);
    setPmlPage(1);
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
  const renderMetrics = (
    row: Metrics & Partial<{ actionRows: ActionRecord[]; kecamatan: string }>,
    detail = false,
    actionRecords?: ActionRecord[],
  ) => (
    <>
      {groups.flatMap((group) =>
        group.keys.map((key) => renderMetricCell(row, key, detail)),
      )}
      {detail && !actionRecords ? (
        <>
          {Array.from({ length: activeTab === "ppl" ? 4 : 3 }, (_, index) => (
            <TableCell key={`empty-action-${index}`} className="bg-violet-50/50" />
          ))}
        </>
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
              className={`mb-4 sm:mb-5 grid w-full max-w-sm text-xs sm:text-sm ${isPmlUser ? "grid-cols-1" : "grid-cols-2"}`}
            >
              <TabsTrigger value="ppl" className="text-xs sm:text-sm">PPL ({filteredPpl.length})</TabsTrigger>
              {!isPmlUser && (
                <TabsTrigger value="pml" className="text-xs sm:text-sm">PML ({filteredPml.length})</TabsTrigger>
              )}
            </TabsList>
            <div className="mb-4 space-y-3 sm:space-y-4">
              <div className="flex flex-col gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama atau kecamatan..."
                    className="pl-9 text-xs sm:text-sm h-9 sm:h-10"
                  />
                </div>
                {verificationTimestamp && (
                  <div className="text-xs sm:text-sm font-bold text-red-600 truncate">
                    Terakhir direkam: {verificationTimestamp}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:flex sm:flex-wrap sm:items-center">
                {isPpk && (
                  <button
                    type="button"
                    title={`Download Excel ${activeTab.toUpperCase()}`}
                    aria-label={`Download Excel ${activeTab.toUpperCase()}`}
                    onClick={downloadExcel}
                    disabled={loading || !!error}
                    className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-2 sm:px-3 text-xs sm:text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 col-span-1"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="hidden sm:inline">Excel</span>
                    <span className="sm:hidden">DL</span>
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
                  className="h-9 sm:h-10 rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
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
                  className="h-9 sm:h-10 rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}/hal
                    </option>
                  ))}
                </select>
              </div>
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
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900">
                            Flag PML
                          </TableHead>
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900">
                            PJ Kec
                          </TableHead>
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900">
                            Ketua SE2026
                          </TableHead>
                          <TableHead className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold text-violet-900">
                            PPK
                          </TableHead>
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
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900">
                            PJ Kec
                          </TableHead>
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold leading-tight text-violet-900">
                            Ketua SE2026
                          </TableHead>
                          <TableHead className="border border-violet-200 bg-violet-100 px-1 text-center text-[10px] sm:text-xs font-semibold text-violet-900">
                            PPK
                          </TableHead>
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
