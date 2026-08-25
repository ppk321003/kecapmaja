import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Loader2,
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
type ActionColumn = "S" | "T" | "U" | "V" | "W" | "X";
type ActionRecord = {
  rowNumber: number;
  values: Partial<Record<ActionColumn, string>>;
};
type DetailRow = Metrics & {
  id: string;
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
type PmlChild = Metrics & { nama: string; actionRows: ActionRecord[] };
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
const formatPercent = (value: number, total: number) =>
  total > 0 ? `${((value / total) * 100).toFixed(2)}%` : "0.00%";
const normalizeKecamatan = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
const kecamatanFromRole = (role: string) => {
  const match = role.match(/pj\s+kecamatan\s+(.+)/i);
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
    className={`cursor-pointer select-none whitespace-normal break-words px-2 py-3 text-center text-xs font-semibold leading-tight text-slate-700 align-middle ${className}`}
  >
    <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1">
      {label}
      <ArrowUpDown
        className={`h-3.5 w-3.5 shrink-0 ${active ? "text-sky-600" : "text-slate-400"}`}
      />
      {active && (
        <span className="text-[10px]">{direction === "asc" ? "▲" : "▼"}</span>
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
  onSaved,
}: {
  records: ActionRecord[];
  columns: [ActionColumn, ActionColumn, ActionColumn];
  overrides: Record<string, string>;
  kecamatan: string;
  onSaved: (updates: Record<string, string>) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const role = String(user?.role || "").toLowerCase();
  const allowedKecamatan = kecamatanFromRole(role);
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
        : "";
  const isApproved = (column: ActionColumn) =>
    actionValue(records, column, overrides) !== "";
  const pjk = isApproved(columns[0]);
  const ketua = isApproved(columns[1]);
  const ppk = actionValue(records, columns[2], overrides);
  const canPjk =
    actor === "PJK" &&
    allowedKecamatan.includes(normalizeKecamatan(kecamatan)) &&
    !ketua &&
    !ppk;
  const canKetua = isKetuaPelaksana && pjk && !ppk;
  const canPpk = actor === "PPK" && ketua;
  const write = async (column: ActionColumn, value: string) => {
    if (
      !actor ||
      records.length === 0 ||
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
      <TableCell className="w-[64px] min-w-[64px] bg-violet-50 px-1 py-2 text-center align-middle">
        <button
          type="button"
          title={pjk ? "Batalkan flag PJ Kecamatan" : "Flag PJ Kecamatan"}
          disabled={saving !== null || !canPjk}
          onClick={() => write(columns[0], pjk ? "" : "Approve")}
          className={`rounded p-1.5 ${pjk ? "text-amber-500 hover:bg-amber-100" : "text-slate-400 hover:bg-slate-100"} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Star className="h-4 w-4" fill={pjk ? "currentColor" : "none"} />
        </button>
      </TableCell>
      <TableCell className="w-[64px] min-w-[64px] bg-violet-50 px-1 py-2 text-center align-middle">
        <button
          type="button"
          title={
            ketua ? "Batalkan flag Ketua Tim SE2026" : "Flag Ketua Tim SE2026"
          }
          disabled={
            saving !== null || (ketua ? !isKetuaPelaksana || !!ppk : !canKetua)
          }
          onClick={() => write(columns[1], ketua ? "" : "Approve")}
          className={`rounded p-1.5 ${ketua ? "text-blue-600 hover:bg-blue-100" : "text-slate-400 hover:bg-slate-100"} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <ShieldCheck className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="w-[96px] min-w-[96px] bg-violet-50 px-1 py-2 text-center align-middle">
        <select
          aria-label="Tahap PPK"
          value={ppk ? ppk.split(",")[0] : ""}
          disabled={saving !== null || (ppk ? actor !== "PPK" : !canPpk)}
          onChange={(event) => write(columns[2], event.target.value)}
          className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          <option value="">Pilih tahap</option>
          {Array.from({ length: 10 }, (_, index) => (
            <option key={index + 1} value={`Tahap-${index + 1}`}>
              Tahap-{index + 1}
            </option>
          ))}
        </select>
        {saving && (
          <Loader2 className="mx-auto mt-1 h-3.5 w-3.5 animate-spin text-slate-500" />
        )}
      </TableCell>
    </>
  );
}

export default function VerifikasiAkhir() {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: SHEET_NAME,
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

  const { pplRows, pmlRows } = useMemo(() => {
    const pplMap = new Map<string, PplRow>();
    const pmlMap = new Map<string, PmlRow>();
    (data || []).forEach((row: any, index) => {
      const namaPpl = text(row, SHEET_COLUMNS.namaPpl, "nama_ppl");
      const namaPml = text(row, SHEET_COLUMNS.namaPml, "nama_pml");
      const kec = text(row, SHEET_COLUMNS.kecamatan, "nmkec");
      if (!namaPpl && !namaPml) return;
      const detailMetrics = emptyMetrics();
      addMetrics(detailMetrics, row);
      const rowNumber = index + 2;
      const pplAction: ActionRecord = {
        rowNumber,
        values: {
          S: text(row, 18, "pjk"),
          T: text(row, 19, "ketua_tim_se2026"),
          U: text(row, 20, "ppk"),
        },
      };
      const pmlAction: ActionRecord = {
        rowNumber,
        values: {
          V: text(row, 21, "pjk_pml"),
          W: text(row, 22, "ketua_tim_se2026_pml"),
          X: text(row, 23, "ppk_pml"),
        },
      };
      const detail: DetailRow = {
        ...detailMetrics,
        id: `${index}`,
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
        } else
          current.children.push({
            ...emptyMetrics(),
            nama: namaPpl,
            actionRows: [pmlAction],
            ...detailMetrics,
          });
        pmlMap.set(key, current);
      }
    });
    return {
      pplRows: Array.from(pplMap.values()),
      pmlRows: Array.from(pmlMap.values()),
    };
  }, [data]);

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
        ? "w-[120px] min-w-[120px] max-w-[120px]"
        : key === "prelistUsaha"
          ? "w-[76px] min-w-[76px] max-w-[76px]"
          : key === "nonPertanianWilkerstat"
            ? "w-[60px] min-w-[60px] max-w-[60px]"
        : COMPACT_METRIC_KEYS.has(key)
          ? "w-[88px] min-w-[88px] max-w-[88px]"
          : "w-[104px] min-w-[104px] max-w-[104px]";
    return (
      <TableCell
        key={key}
        className={`${widthClass} px-2 py-2 text-right align-middle font-semibold ${cellBackground} ${detail ? "text-sm text-slate-700" : "text-slate-900"}`}
      >
        <div className="whitespace-nowrap">{formatNumber(row[key])}</div>
        {percentages.length > 0 && (
          <div className="flex flex-wrap justify-end gap-x-1 whitespace-normal text-[11px] font-medium leading-tight">
            {percentages.map((percentage, index) => (
              <React.Fragment key={`${key}-${index}`}>
                {index > 0 && <span className="text-slate-500">|</span>}
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
  ) => (
    <>
      {groups.flatMap((group) =>
        group.keys.map((key) => renderMetricCell(row, key, detail)),
      )}
      {detail ? (
        <>
          <TableCell className="bg-violet-50/50" />
          <TableCell className="bg-violet-50/50" />
          <TableCell className="bg-violet-50/50" />
        </>
      ) : (
        <KabupatenActions
          records={row.actionRows || []}
          columns={activeTab === "ppl" ? ["S", "T", "U"] : ["V", "W", "X"]}
          overrides={actionOverrides}
          kecamatan={row.kecamatan || ""}
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
  const renderColumnGroup = () => (
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
      <col className="w-[3%]" />
      <col className="w-[3%]" />
      <col className="w-[6%]" />
    </colgroup>
  );

  return (
    <div className="space-y-6 py-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-slate-50">
          <CardTitle>Verifikasi Akhir</CardTitle>
          <CardDescription>
            Rekap verifikasi akhir Sensus Ekonomi 2026 untuk pembayaran honor
            Petugas Lapangan
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 [&_table]:!w-full [&_table]:!min-w-0 [&_.overflow-auto]:!overflow-hidden [&_.overflow-x-auto]:!overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-5 grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="ppl">PPL ({filteredPpl.length})</TabsTrigger>
              <TabsTrigger value="pml">PML ({filteredPml.length})</TabsTrigger>
            </TabsList>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama petugas atau kecamatan..."
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Filter kecamatan"
                  value={kecamatan}
                  onChange={(event) => {
                    setKecamatan(event.target.value);
                    setPplPage(1);
                    setPmlPage(1);
                  }}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="all">Semua Kecamatan</option>
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
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} / halaman
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-16 text-rose-600">
                <AlertCircle className="h-5 w-5" /> {String(error)}
              </div>
            ) : (
              <>
                <TabsContent value="ppl" className="mt-0">
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <Table className="table-fixed min-w-[1610px]">
                      <>{renderColumnGroup()}</>
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
                              className={`whitespace-normal text-center text-xs font-bold ${groupClass[group.color]}`}
                            >
                              {group.label}
                            </TableHead>
                          ))}
                          <TableHead
                            colSpan={3}
                            className="border border-violet-200 bg-violet-100 text-center text-xs font-bold text-violet-900"
                          >
                            AKSI KABUPATEN
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
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-xs font-semibold leading-tight text-violet-900">
                            PJ Kecamatan
                          </TableHead>
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-xs font-semibold leading-tight text-violet-900">
                            Ketua Tim SE2026
                          </TableHead>
                          <TableHead className="border border-violet-200 bg-violet-100 px-1 text-center text-xs font-semibold text-violet-900">
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
                                  className="cursor-pointer px-3 py-3 font-medium text-slate-800"
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
                                  <span className="inline-flex items-center gap-2 break-words">
                                    {expanded ? (
                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0" />
                                    )}
                                    {row.nama}
                                  </span>
                                </TableCell>
                                <TableCell className="break-words px-3 py-3">
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
                                    <TableCell className="break-words pl-9 text-sm italic text-slate-700">
                                      {detail.nmsls || "-"}
                                    </TableCell>
                                    <TableCell className="break-words text-sm text-slate-600">
                                      {detail.desa || detail.kecamatan || "-"}
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
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <Table className="table-fixed min-w-[1610px]">
                      <>{renderColumnGroup()}</>
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
                              className={`whitespace-normal text-center text-xs font-bold ${groupClass[group.color]}`}
                            >
                              {group.label}
                            </TableHead>
                          ))}
                          <TableHead
                            colSpan={3}
                            className="border border-violet-200 bg-violet-100 text-center text-xs font-bold text-violet-900"
                          >
                            AKSI KABUPATEN
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
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-xs font-semibold leading-tight text-violet-900">
                            PJ Kecamatan
                          </TableHead>
                          <TableHead className="whitespace-normal border border-violet-200 bg-violet-100 px-1 text-center text-xs font-semibold leading-tight text-violet-900">
                            Ketua Tim SE2026
                          </TableHead>
                          <TableHead className="border border-violet-200 bg-violet-100 px-1 text-center text-xs font-semibold text-violet-900">
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
                                <TableCell className="text-center text-slate-500">
                                  {(pmlPage - 1) * pageSize + index + 1}
                                </TableCell>
                                <TableCell
                                  className="cursor-pointer px-3 py-3 font-medium text-slate-800"
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
                                  <span className="inline-flex items-center gap-2 break-words">
                                    {expanded ? (
                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0" />
                                    )}
                                    {row.nama}
                                  </span>
                                </TableCell>
                                <TableCell className="break-words px-3 py-3">
                                  {row.kecamatan || "-"}
                                </TableCell>
                                {renderMetrics(row)}
                              </TableRow>
                              {expanded &&
                                row.children.map((child) => (
                                  <TableRow
                                    key={`${row.id}-${child.nama}`}
                                    className="bg-slate-50"
                                  >
                                    <TableCell />
                                    <TableCell className="break-words pl-9 text-sm italic text-slate-700">
                                      {child.nama || "-"}
                                    </TableCell>
                                    <TableCell className="break-words text-sm text-slate-600">
                                      {row.kecamatan || "-"}
                                    </TableCell>
                                    {renderMetrics(child, true)}
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
