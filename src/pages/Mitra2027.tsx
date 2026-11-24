import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Eye, RefreshCw, Users, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Ban, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const WhatsAppIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
    <path
      fill="#25D366"
      d="M16.02 3C9.383 3 4 8.383 4 15.02c0 2.316.66 4.57 1.91 6.52L4 29l7.65-1.86a11.96 11.96 0 0 0 4.37.83h.01C22.657 27.97 28 22.587 28 15.95 28 12.74 26.75 9.72 24.48 7.45A11.93 11.93 0 0 0 16.02 3z"
    />
    <path
      fill="#FFFFFF"
      d="M22.57 19.27c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.6-1.5-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.97 2.63 1.11 2.81c.14.18 1.91 2.92 4.63 4.09.65.28 1.15.45 1.54.57.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z"
    />
  </svg>
);

type Row = string[];
type RowWithMeta = Row & { __sheetRowNum: number };

const SPREADSHEET_ID = "15txzji3eK-gxqqP9RPwvaQuEcF9ve4xtkMukfaAAlig";
const SHEET_NAME = "GABUNG-2026";
const RANGE = `${SHEET_NAME}!A1:AY`;

const colIdx = (letter: string): number => {
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64);
  }
  return n - 1;
};

const COL = {
  nama: colIdx("A"),
  posisi: colIdx("B"),
  alamatKecamatan: colIdx("H"),
  alamatDesa: colIdx("I"),
  umur: colIdx("K"),
  jenisKelamin: colIdx("L"),
  pendidikan: colIdx("N"),
  noTelp: colIdx("T"),
  sobatId: colIdx("U"),
  aksiPJ: colIdx("AW"),
  waktuAksi: colIdx("AX"),
  posisiBaru: colIdx("AY"),
};

const AKSI_OPTIONS = [
  { value: "belum", label: "Belum" },
  { value: "Ditawarkan", label: "Ditawarkan" },
  { value: "Tidak Ditawarkan", label: "Tidak Ditawarkan" },
] as const;

const POSISI_BARU_OPTIONS = [
  { value: "Mitra Pendataan", label: "Mitra Pendataan", className: "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200" },
  { value: "Mitra (Pendataan dan Pengolahan)", label: "Mitra (Pendataan dan Pengolahan)", className: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" },
  { value: "Mitra Pengolahan", label: "Mitra Pengolahan", className: "bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200" },
] as const;

const normalizeKecamatanName = (raw: string): string => {
  if (!raw) return "";
  return raw.replace(/^\(\d+\)\s*/i, "").trim();
};

const normalizeKey = (value: string): string =>
  normalizeKecamatanName(value).toLowerCase().replace(/\s+/g, " ").trim();

const normalizeRoleKey = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

const getAllowedKecamatanFromRole = (roleRaw: string): string[] | null => {
  const role = (roleRaw || "").trim();
  if (!role) return [];
  if (role === "Pejabat Pembuat Komitmen") return null; // all
  const lower = role.toLowerCase();
  const marker = "pj kecamatan";
  const idx = lower.indexOf(marker);
  if (idx === -1) return [];
  const after = role.slice(idx + marker.length).trim();
  if (!after) return [];
  const parts = after
    .split(/\s+dan\s+|,|&|\//i)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.map((p) => normalizeRoleKey(p));
};

const canUserEditKecamatan = (userRole: string | undefined, kecamatanRaw: string): boolean => {
  const allowed = getAllowedKecamatanFromRole(userRole || "");
  if (allowed === null) return true; // PPK
  if (!allowed || allowed.length === 0) return false;
  const kecKey = normalizeRoleKey(normalizeKecamatanName(kecamatanRaw || ""));
  return allowed.includes(kecKey);
};

const formatWaktuAksi = (role: string): string => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const hh = get("hour");
  const mm = get("minute");
  const dd = get("day");
  const mo = get("month");
  const yyyy = get("year");
  return `${role} - ${hh}:${mm}; ${dd}/${mo}/${yyyy} WIB`;
};

const statusLabel = (value: string): "Ditawarkan" | "Tidak Ditawarkan" | "Belum" => {
  const v = (value || "").trim();
  if (v === "Ditawarkan") return "Ditawarkan";
  if (v === "Tidak Ditawarkan") return "Tidak Ditawarkan";
  return "Belum";
};

type SortKey = "nama" | "alamat" | "umur" | "pendidikan";
type SortDir = "asc" | "desc";

const formatAlamat = (kecamatan: string, desa: string) => {
  const kec = normalizeKecamatanName(kecamatan || "") || (kecamatan || "").trim();
  const des = (desa || "").trim();
  if (kec && des) return `${kec}, ${des}`;
  return kec || des || "";
};

const normalizePhone = (raw: string) => (raw || "").replace(/[^\d+]/g, "");

const toWaHref = (raw: string) => {
  const cleaned = normalizePhone(raw);
  let digits = cleaned.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  // if starts with 62 keep, if other country code keep as-is
  return `https://wa.me/${digits}`;
};

export default function Mitra2027() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RowWithMeta[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterKec, setFilterKec] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPendidikan, setFilterPendidikan] = useState<string>("all");
  const [detailRow, setDetailRow] = useState<RowWithMeta | null>(null);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [didSetDefaultKec, setDidSetDefaultKec] = useState(false);
  const [posisiDialogRow, setPosisiDialogRow] = useState<RowWithMeta | null>(null);
  const [selectedPosisiBaru, setSelectedPosisiBaru] = useState<string>("");
  const [revertConfirm, setRevertConfirm] = useState<{
    row: RowWithMeta;
    target: "belum" | "Tidak Ditawarkan";
  } | null>(null);

  const userRole = user?.role || "";
  const canEditAny = useMemo(() => {
    const allowed = getAllowedKecamatanFromRole(userRole);
    return allowed === null || (Array.isArray(allowed) && allowed.length > 0);
  }, [userRole]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: RANGE },
      });
      if (err) {
        let detail = err.message || "Edge Function error";
        try {
          const ctx: any = (err as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) detail = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
            else if (body?.message) detail = body.message;
            else detail = `${detail} ${JSON.stringify(body)}`;
          }
        } catch {
          // ignore detail parse errors
        }
        throw new Error(detail);
      }
      const values: string[][] = (data?.values as string[][]) || [];
      if (values.length === 0) {
        setHeaders([]);
        setRows([]);
        return;
      }
      const hdr = (values[0] || []).map((h) => (h ?? "").toString());
      const dataRows = values.slice(1).map((r, idx) => {
        const arr = (r || []).map((c) => (c ?? "").toString()) as RowWithMeta;
        (arr as RowWithMeta).__sheetRowNum = idx + 2; // header at row 1
        return arr as RowWithMeta;
      });
      setHeaders(hdr);
      setRows(dataRows);
    } catch (e: any) {
      console.error("Gagal memuat data Mitra 2027:", e);
      setError(e?.message || "Gagal memuat data dari Google Sheets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kecamatanOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const raw = (r[COL.alamatKecamatan] || "").trim();
      if (!raw) continue;
      const key = normalizeKey(raw);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, normalizeKecamatanName(raw) || raw);
      }
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, [rows]);

  const pendidikanOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const v = (r[COL.pendidikan] || "").trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const myKecamatanKeys = useMemo(() => {
    const allowed = getAllowedKecamatanFromRole(userRole);
    if (!Array.isArray(allowed)) return [] as string[];
    return kecamatanOptions.filter((k) => canUserEditKecamatan(userRole, k.label)).map((k) => k.key);
  }, [userRole, kecamatanOptions]);

  useEffect(() => {
    if (didSetDefaultKec || loading) return;
    const allowed = getAllowedKecamatanFromRole(userRole);
    if (Array.isArray(allowed) && allowed.length > 0) {
      if (myKecamatanKeys.length === 1) setFilterKec(myKecamatanKeys[0]);
      else if (myKecamatanKeys.length > 1) setFilterKec("__mine__");
    }
    setDidSetDefaultKec(true);
  }, [didSetDefaultKec, loading, userRole, myKecamatanKeys]);

  const monitoring = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; total: number; ditawarkan: number; tidakDitawarkan: number; belum: number }
    >();
    for (const r of rows) {
      const rawKec = (r[COL.alamatKecamatan] || "").trim();
      const key = normalizeKey(rawKec) || "(tanpa kecamatan)";
      const label = normalizeKecamatanName(rawKec) || "(Tanpa Kecamatan)";
      if (!map.has(key)) {
        map.set(key, { key, label, total: 0, ditawarkan: 0, tidakDitawarkan: 0, belum: 0 });
      }
      const item = map.get(key)!;
      item.total += 1;
      const st = statusLabel(r[COL.aksiPJ] || "");
      if (st === "Ditawarkan") item.ditawarkan += 1;
      else if (st === "Tidak Ditawarkan") item.tidakDitawarkan += 1;
      else item.belum += 1;
    }
    const list = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "id"));
    const totals = list.reduce(
      (acc, it) => {
        acc.total += it.total;
        acc.ditawarkan += it.ditawarkan;
        acc.tidakDitawarkan += it.tidakDitawarkan;
        acc.belum += it.belum;
        return acc;
      },
      { total: 0, ditawarkan: 0, tidakDitawarkan: 0, belum: 0 }
    );
    return { list, totals };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mineSet = new Set(myKecamatanKeys);
    const filtered = rows.filter((r) => {
      const kecRaw = r[COL.alamatKecamatan] || "";
      const kecKey = normalizeKey(kecRaw);
      if (filterKec === "__mine__") {
        if (!mineSet.has(kecKey)) return false;
      } else if (filterKec !== "all" && kecKey !== filterKec) {
        return false;
      }
      const st = statusLabel(r[COL.aksiPJ] || "");
      if (filterStatus === "belum" && st !== "Belum") return false;
      if (filterStatus === "Ditawarkan" && st !== "Ditawarkan") return false;
      if (filterStatus === "Tidak Ditawarkan" && st !== "Tidak Ditawarkan") return false;

      const pendidikan = (r[COL.pendidikan] || "").trim();
      if (filterPendidikan !== "all" && pendidikan !== filterPendidikan) return false;

      if (!q) return true;
      const hay = [
        r[COL.nama],
        r[COL.sobatId],
        kecRaw,
        normalizeKecamatanName(kecRaw),
        r[COL.alamatDesa],
        r[COL.posisi],
        r[COL.posisiBaru],
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    if (!sortKey) return filtered;

    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (r: RowWithMeta) => {
      switch (sortKey) {
        case "nama":
          return (r[COL.nama] || "").trim();
        case "alamat":
          return formatAlamat(r[COL.alamatKecamatan] || "", r[COL.alamatDesa] || "");
        case "pendidikan":
          return (r[COL.pendidikan] || "").trim();
        case "umur":
          return (r[COL.umur] || "").trim();
        default:
          return "";
      }
    };

    return [...filtered].sort((a, b) => {
      if (sortKey === "umur") {
        const na = parseFloat(getVal(a).replace(",", "."));
        const nb = parseFloat(getVal(b).replace(",", "."));
        const aNum = Number.isFinite(na);
        const bNum = Number.isFinite(nb);
        if (aNum && bNum && na !== nb) return (na - nb) * dir;
        if (aNum !== bNum) return (aNum ? -1 : 1) * dir;
      }
      const va = getVal(a).toLocaleLowerCase("id");
      const vb = getVal(b).toLocaleLowerCase("id");
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [rows, search, filterKec, filterStatus, filterPendidikan, myKecamatanKeys, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, filterKec, filterStatus, filterPendidikan, pageSize, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(filteredRows.length, safePage * pageSize);
  const pagedRows = useMemo(
    () => filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRows, safePage, pageSize]
  );

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const updateAksiPJ = async (
    row: RowWithMeta,
    newValue: "belum" | "Ditawarkan" | "Tidak Ditawarkan",
    posisiBaruArg?: string
  ) => {
    const kecRaw = row[COL.alamatKecamatan] || "";
    if (!canUserEditKecamatan(userRole, kecRaw)) {
      window.alert("Anda tidak memiliki kewenangan mengubah data kecamatan ini.");
      return;
    }
    const sheetRow = row.__sheetRowNum;
    if (!sheetRow) return;

    const aksiValue = newValue === "belum" ? "" : newValue;
    const waktuValue = newValue === "belum" ? "" : formatWaktuAksi(userRole || user?.username || "Pengguna");
    const posisiBaruValue = newValue === "Ditawarkan" ? (posisiBaruArg ?? row[COL.posisiBaru] ?? "").trim() : "";
    if (newValue === "Ditawarkan" && !posisiBaruValue) {
      window.alert("Pilih Posisi Baru terlebih dahulu.");
      return;
    }

    const prevAksi = row[COL.aksiPJ] || "";
    const prevWaktu = row[COL.waktuAksi] || "";
    const prevPosisiBaru = row[COL.posisiBaru] || "";

    setSavingRow(sheetRow);
    try {
      const { data, error: err } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "batch-update",
          updates: [
            { range: `${SHEET_NAME}!AW${sheetRow}`, values: [[aksiValue]] },
            { range: `${SHEET_NAME}!AX${sheetRow}`, values: [[waktuValue]] },
            { range: `${SHEET_NAME}!AY${sheetRow}`, values: [[posisiBaruValue]] },
          ],
        },
      });
      if (err) throw err;
      if (data && (data as any).ok === false) {
        throw new Error((data as any).error || "Gagal menyimpan perubahan.");
      }
      setRows((prev) =>
        prev.map((r) => {
          if (r.__sheetRowNum !== sheetRow) return r;
          const copy = [...r] as RowWithMeta;
          copy.__sheetRowNum = r.__sheetRowNum;
          copy[COL.aksiPJ] = aksiValue;
          copy[COL.waktuAksi] = waktuValue;
          copy[COL.posisiBaru] = posisiBaruValue;
          return copy;
        })
      );
      setPosisiDialogRow(null);
      setSelectedPosisiBaru("");
      setRevertConfirm(null);
    } catch (e: any) {
      console.error("Gagal menyimpan Aksi PJ:", e);
      // rollback
      setRows((prev) =>
        prev.map((r) => {
          if (r.__sheetRowNum !== sheetRow) return r;
          const copy = [...r] as RowWithMeta;
          copy.__sheetRowNum = r.__sheetRowNum;
          copy[COL.aksiPJ] = prevAksi;
          copy[COL.waktuAksi] = prevWaktu;
          copy[COL.posisiBaru] = prevPosisiBaru;
          return copy;
        })
      );
      let detail = e?.message || "Gagal menyimpan perubahan ke Google Sheets.";
      try {
        const ctx: any = e?.context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) detail = typeof body.error === "string" ? body.error : JSON.stringify(body.error);
        }
      } catch {
        // ignore
      }
      window.alert(detail);
    } finally {
      setSavingRow(null);
    }
  };

  const handleAksiChange = (row: RowWithMeta, val: "belum" | "Ditawarkan" | "Tidak Ditawarkan") => {
    const current = statusLabel(row[COL.aksiPJ] || "");
    if (val === "Ditawarkan") {
      setPosisiDialogRow(row);
      setSelectedPosisiBaru((row[COL.posisiBaru] || "").trim());
      return;
    }
    if (val === "Tidak Ditawarkan") {
      setRevertConfirm({ row, target: "Tidak Ditawarkan" });
      return;
    }
    if (current === "Ditawarkan" && val === "belum") {
      setRevertConfirm({ row, target: "belum" });
      return;
    }
    void updateAksiPJ(row, val);
  };

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
  const progressBarColor = (percent: number) => {
    if (percent >= 100) return "bg-green-600";
    if (percent >= 85) return "bg-emerald-500";
    if (percent >= 70) return "bg-lime-500";
    if (percent >= 55) return "bg-yellow-500";
    if (percent >= 40) return "bg-amber-500";
    if (percent >= 25) return "bg-orange-500";
    if (percent > 0) return "bg-red-500";
    return "bg-slate-300";
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-slate-700" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-slate-700" />
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mitra 2027</h1>
          <p className="text-slate-600">
            Halaman ini digunakan untuk pengelolaan rekrutmen Mitra 2027 berdasarkan database awal 2026,
            mencakup pemantauan progres penawaran per kecamatan serta penetapan Aksi PJ Kecamatan.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Muat Ulang
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      <Tabs defaultValue="penawaran" className="space-y-4">
        <TabsList>
          <TabsTrigger value="penawaran">Penawaran</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" /> Monitoring Progres per Kecamatan
              </CardTitle>
              <CardDescription>
                Progres penawaran dihitung dari keputusan <strong>Ditawarkan</strong> dan <strong>Tidak Ditawarkan</strong> terhadap total mitra per kecamatan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="rounded-lg border p-3 bg-slate-50">
                  <div className="text-xs text-slate-500">Total</div>
                  <div className="text-xl font-semibold">{monitoring.totals.total}</div>
                </div>
                <div className="rounded-lg border p-3 bg-green-50 border-green-200">
                  <div className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Ditawarkan</div>
                  <div className="text-xl font-semibold text-green-800">{monitoring.totals.ditawarkan}</div>
                </div>
                <div className="rounded-lg border p-3 bg-red-50 border-red-200">
                  <div className="text-xs text-red-700 flex items-center gap-1"><XCircle className="h-3 w-3" /> Tidak Ditawarkan</div>
                  <div className="text-xl font-semibold text-red-800">{monitoring.totals.tidakDitawarkan}</div>
                </div>
                <div className="rounded-lg border p-3 bg-amber-50 border-amber-200">
                  <div className="text-xs text-amber-700 flex items-center gap-1"><Clock className="h-3 w-3" /> Belum</div>
                  <div className="text-xl font-semibold text-amber-800">{monitoring.totals.belum}</div>
                </div>
                <div className="rounded-lg border p-3 bg-blue-50 border-blue-200">
                  <div className="text-xs text-blue-700">Progres Penawaran</div>
                  {(() => {
                    const processed = monitoring.totals.ditawarkan + monitoring.totals.tidakDitawarkan;
                    const percent = pct(processed, monitoring.totals.total);
                    return (
                      <>
                        <div className="text-xl font-semibold text-blue-800">{percent}%</div>
                        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${progressBarColor(percent)}`}
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {monitoring.totals.ditawarkan} ditawarkan | {monitoring.totals.tidakDitawarkan} tidak ditawarkan
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100 border-b border-slate-200">
                      <TableHead className="h-12 py-3 px-4 w-[56px] text-center font-semibold text-slate-700 whitespace-nowrap">No</TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">Kecamatan</TableHead>
                      <TableHead className="h-12 py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">Total</TableHead>
                      <TableHead className="h-12 py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">Ditawarkan</TableHead>
                      <TableHead className="h-12 py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">Tidak Ditawarkan</TableHead>
                      <TableHead className="h-12 py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">Belum</TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap min-w-[220px]">Progres Penawaran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monitoring.list.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-500 py-10">
                          {loading ? "Memuat data..." : "Tidak ada data."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {monitoring.list.map((m, idx) => {
                          const processed = m.ditawarkan + m.tidakDitawarkan;
                          const percent = pct(processed, m.total);
                          return (
                            <TableRow key={m.key} className="hover:bg-slate-50/70">
                              <TableCell className="text-center text-slate-600 font-medium py-3">{idx + 1}</TableCell>
                              <TableCell className="font-medium py-3">{m.label}</TableCell>
                              <TableCell className="text-right py-3">{m.total}</TableCell>
                              <TableCell className="text-right text-green-700 font-medium py-3">{m.ditawarkan}</TableCell>
                              <TableCell className="text-right text-red-700 py-3">{m.tidakDitawarkan}</TableCell>
                              <TableCell className="text-right text-amber-700 py-3">{m.belum}</TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${progressBarColor(percent)}`}
                                      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700 w-14 text-right tabular-nums">{percent}%</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  {m.ditawarkan} ditawarkan | {m.tidakDitawarkan} tidak ditawarkan | dari mitra tersedia {m.total}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(() => {
                          const processed = monitoring.totals.ditawarkan + monitoring.totals.tidakDitawarkan;
                          const totalPercent = pct(processed, monitoring.totals.total);
                          return (
                            <TableRow className="bg-slate-100/80 font-semibold border-t-2 border-slate-300 hover:bg-slate-100">
                              <TableCell className="text-center text-slate-700 py-3"></TableCell>
                              <TableCell className="text-slate-900 py-3">Jumlah</TableCell>
                              <TableCell className="text-right text-slate-900 py-3">{monitoring.totals.total}</TableCell>
                              <TableCell className="text-right text-green-700 py-3">{monitoring.totals.ditawarkan}</TableCell>
                              <TableCell className="text-right text-red-700 py-3">{monitoring.totals.tidakDitawarkan}</TableCell>
                              <TableCell className="text-right text-amber-700 py-3">{monitoring.totals.belum}</TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${progressBarColor(totalPercent)}`}
                                      style={{ width: `${Math.min(100, Math.max(0, totalPercent))}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-slate-900 w-14 text-right tabular-nums">{totalPercent}%</span>
                                </div>
                                <div className="text-[11px] text-slate-600 mt-1">
                                  {monitoring.totals.ditawarkan} ditawarkan | {monitoring.totals.tidakDitawarkan} tidak ditawarkan | dari mitra tersedia {monitoring.totals.total}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })()}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penawaran" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detail Mitra Kepka 2026</CardTitle>
              <CardDescription>
                {canEditAny
                  ? "Silakan tentukan Aksi PJ Kecamatan untuk mencatat keputusan penawaran. Setiap perubahan akan tersimpan beserta jejak waktu secara otomatis."
                  : "Anda memiliki akses lihat. Perubahan Aksi PJ Kecamatan hanya dapat dilakukan oleh PJ Kecamatan terkait atau PPK."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari nama, SOBAT ID, kecamatan, desa, posisi baru..."
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterKec} onValueChange={setFilterKec}>
                    <SelectTrigger className="w-full md:w-56">
                      <SelectValue placeholder="Semua Kecamatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kecamatan</SelectItem>
                      {myKecamatanKeys.length > 1 && (
                        <SelectItem value="__mine__">Kecamatan Saya</SelectItem>
                      )}
                      {kecamatanOptions.map((k) => (
                        <SelectItem key={k.key} value={k.key}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-52">
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status Aksi PJ Kecamatan</SelectItem>
                      <SelectItem value="belum">Belum</SelectItem>
                      <SelectItem value="Ditawarkan">Ditawarkan</SelectItem>
                      <SelectItem value="Tidak Ditawarkan">Tidak Ditawarkan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPendidikan} onValueChange={setFilterPendidikan}>
                    <SelectTrigger className="w-full md:w-52">
                      <SelectValue placeholder="Semua Pendidikan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Pendidikan</SelectItem>
                      {pendidikanOptions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600">Filter cepat:</span>
                  <Button
                    type="button"
                    variant={filterStatus === "belum" ? "default" : "outline"}
                    size="sm"
                    className={filterStatus === "belum" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                    onClick={() => setFilterStatus("belum")}
                  >
                    Belum diproses
                  </Button>
                  <Button
                    type="button"
                    variant={filterStatus === "all" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus("all")}
                  >
                    Semua status
                  </Button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-slate-600">
                <div>
                  Menampilkan <strong>{filteredRows.length === 0 ? 0 : pageStart}-{pageEnd}</strong> dari <strong>{filteredRows.length}</strong> data
                  {filteredRows.length !== rows.length && <> (difilter dari <strong>{rows.length}</strong> total)</>}.
                </div>
                <div className="flex items-center gap-2">
                  <span>Baris per halaman:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-8 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 hover:bg-slate-100 border-b border-slate-200">
                      <TableHead className="h-12 py-3 px-4 w-[56px] text-center font-semibold text-slate-700 whitespace-nowrap">No</TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("nama")} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                          Nama Lengkap {renderSortIcon("nama")}
                        </button>
                      </TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">Posisi</TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("alamat")} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                          Alamat {renderSortIcon("alamat")}
                        </button>
                      </TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap text-center">
                        <button type="button" onClick={() => toggleSort("umur")} className="inline-flex items-center justify-center gap-1.5 hover:text-slate-900 w-full">
                          Umur {renderSortIcon("umur")}
                        </button>
                      </TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap text-center">JK</TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("pendidikan")} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                          Pendidikan {renderSortIcon("pendidikan")}
                        </button>
                      </TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">No Telp</TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">Aksi PJ Kecamatan</TableHead>
                      <TableHead className="h-12 py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">Posisi Baru</TableHead>
                      <TableHead className="h-12 py-3 px-4 w-[70px] font-semibold text-slate-700 whitespace-nowrap">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-10 text-slate-500">
                          <div className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat data...</div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-10 text-slate-500">
                          Tidak ada data yang sesuai filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedRows.map((r, idx) => {
                        const st = statusLabel(r[COL.aksiPJ] || "");
                        const kecRaw = r[COL.alamatKecamatan] || "";
                        const editable = canUserEditKecamatan(userRole, kecRaw);
                        const isSaving = savingRow === r.__sheetRowNum;
                        const selectValue = st === "Belum" ? "belum" : st;
                        return (
                          <TableRow key={`${r.__sheetRowNum}-${r[COL.sobatId] || ""}`}>
                            <TableCell className="text-center text-slate-600 font-medium">{pageStart + idx}</TableCell>
                            <TableCell className="py-3">
                              <div className="leading-snug">
                                <div className="font-medium text-slate-900">{r[COL.nama] || "-"}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{(r[COL.sobatId] || "").trim() || "-"}</div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">{r[COL.posisi] || "-"}</TableCell>
                            <TableCell className="py-3">
                              {(() => {
                                const kec = (r[COL.alamatKecamatan] || "").trim();
                                const desa = (r[COL.alamatDesa] || "").trim();
                                if (!kec && !desa) return "-";
                                return (
                                  <div className="leading-snug">
                                    <div className="text-slate-900">{kec || "-"}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{desa || "-"}</div>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="py-3 text-center">{r[COL.umur] || "-"}</TableCell>
                            <TableCell className="py-3 text-center">{r[COL.jenisKelamin] || "-"}</TableCell>
                            <TableCell className="py-3">{r[COL.pendidikan] || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap py-3">
                              {(() => {
                                const phone = (r[COL.noTelp] || "").trim();
                                if (!phone) return "-";
                                const waHref = toWaHref(phone);
                                return (
                                  <div className="flex items-center gap-2">
                                    <span>{phone}</span>
                                    {waHref && (
                                      <a
                                        href={waHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:opacity-90 transition-opacity"
                                        title={`WhatsApp ${phone}`}
                                      >
                                        <WhatsAppIcon className="h-6 w-6" />
                                        <span className="sr-only">WhatsApp</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="min-w-[210px]">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={selectValue}
                                  onValueChange={(val) => handleAksiChange(r, val as "belum" | "Ditawarkan" | "Tidak Ditawarkan")}
                                  disabled={!editable || isSaving}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Belum" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {AKSI_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
                                {!editable && (
                                  <Badge
                                    variant="outline"
                                    className="p-1 border-amber-300 bg-amber-50 text-red-600 shadow-sm"
                                    title="Akses hanya baca"
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    <span className="sr-only">Akses hanya baca</span>
                                  </Badge>
                                )}
                              </div>
                              {r[COL.waktuAksi] && (
                                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{r[COL.waktuAksi]}</div>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              {(() => {
                                const pb = (r[COL.posisiBaru] || "").trim();
                                const stNow = statusLabel(r[COL.aksiPJ] || "");
                                if (stNow === "Ditawarkan" && editable) {
                                  return (
                                    <button
                                      type="button"
                                      className="text-left hover:underline underline-offset-2"
                                      onClick={() => {
                                        setPosisiDialogRow(r);
                                        setSelectedPosisiBaru(pb);
                                      }}
                                      title="Pilih/ubah Posisi Baru"
                                    >
                                      {pb ? <span className="font-medium text-slate-800">{pb}</span> : <span className="text-amber-700">Pilih posisi</span>}
                                    </button>
                                  );
                                }
                                if (stNow === "Tidak Ditawarkan") {
                                  return (
                                    <span title="Tidak Ditawarkan">
                                      <XCircle className="h-5 w-5 text-red-600" aria-label="Tidak Ditawarkan" />
                                    </span>
                                  );
                                }
                                return pb ? <span className="font-medium text-slate-800">{pb}</span> : "-";
                              })()}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setDetailRow(r)} title="Lihat detail">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Halaman <strong>{safePage}</strong> dari <strong>{totalPages}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages || loading}
                  >
                    Berikutnya <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!revertConfirm} onOpenChange={(open) => !open && setRevertConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Status</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {revertConfirm?.target === "Tidak Ditawarkan" ? (
                <>
                  <span className="block">Apakah Anda yakin ingin menetapkan status <strong>Tidak Ditawarkan</strong>?</span>
                  <span className="block mt-1">Mitra ini tidak akan dapat mengikuti kegiatan di tahun 2027.</span>
                </>
              ) : (
                <span className="block">
                  Apakah Anda yakin ingin mengubah status dari <strong>Ditawarkan</strong> menjadi <strong>Belum</strong>? Posisi Baru dan Waktu Aksi akan dikosongkan.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {revertConfirm && (
            <div className={`rounded-md border px-3 py-2 text-sm ${revertConfirm.target === "Tidak Ditawarkan" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
              <div className="font-medium">{revertConfirm.row[COL.nama] || "-"}</div>
              <div className={revertConfirm.target === "Tidak Ditawarkan" ? "text-red-800" : "text-amber-800"}>
                SOBAT ID: {revertConfirm.row[COL.sobatId] || "-"}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevertConfirm(null)}
              disabled={revertConfirm ? savingRow === revertConfirm.row.__sheetRowNum : false}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant={revertConfirm?.target === "Tidak Ditawarkan" ? "destructive" : "default"}
              className={revertConfirm?.target === "belum" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
              onClick={() => {
                if (revertConfirm) void updateAksiPJ(revertConfirm.row, revertConfirm.target);
              }}
              disabled={revertConfirm ? savingRow === revertConfirm.row.__sheetRowNum : false}
            >
              {revertConfirm && savingRow === revertConfirm.row.__sheetRowNum ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</span>
              ) : revertConfirm?.target === "Tidak Ditawarkan" ? (
                "Ya, Tetapkan Tidak Ditawarkan"
              ) : (
                "Ya, Ubah ke Belum"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!posisiDialogRow}
        onOpenChange={(open) => {
          if (!open) {
            setPosisiDialogRow(null);
            setSelectedPosisiBaru("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pilih Posisi Baru</DialogTitle>
            <DialogDescription>
              {posisiDialogRow
                ? `Tentukan Posisi Baru untuk ${posisiDialogRow[COL.nama] || "-"} (SOBAT ID: ${posisiDialogRow[COL.sobatId] || "-"}) saat ditawarkan.`
                : "Pilih posisi baru untuk mitra yang ditawarkan."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {POSISI_BARU_OPTIONS.map((opt) => {
              const selected = selectedPosisiBaru === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedPosisiBaru(opt.value)}
                  aria-pressed={selected}
                  className={`min-h-[48px] rounded-2xl border px-3 py-2 text-sm font-medium text-center leading-snug transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 ${
                    selected
                      ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 ring-offset-1 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPosisiDialogRow(null);
                setSelectedPosisiBaru("");
              }}
              disabled={savingRow === posisiDialogRow?.__sheetRowNum}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (posisiDialogRow) void updateAksiPJ(posisiDialogRow, "Ditawarkan", selectedPosisiBaru);
              }}
              disabled={!selectedPosisiBaru || (posisiDialogRow ? savingRow === posisiDialogRow.__sheetRowNum : false)}
            >
              {posisiDialogRow && savingRow === posisiDialogRow.__sheetRowNum ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</span>
              ) : (
                "Simpan"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Data Mitra</DialogTitle>
            <DialogDescription>
              {detailRow ? `${detailRow[COL.nama] || "-"} (SOBAT ID: ${detailRow[COL.sobatId] || "-"})` : ""}
            </DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {(headers.length ? headers : Array.from({ length: detailRow.length }, (_, i) => `Kolom ${i + 1}`)).map(
                (h, idx) => {
                  const label = h || `Kolom ${idx + 1}`;
                  const value = detailRow[idx] ?? "";
                  return (
                    <div key={`${label}-${idx}`} className="border-b border-slate-100 py-1.5">
                      <div className="text-xs font-medium text-slate-500">{label}</div>
                      <div className="text-slate-900 break-words whitespace-pre-wrap">{value || "-"}</div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
