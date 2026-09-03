import React, { useMemo, useState } from "react";
import { AlertCircle, ExternalLink, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { useToast } from "@/hooks/use-toast";

interface OutlierGenericTabProps {
  spreadsheetId: string;
  verifikasiSpreadsheetId: string;
  verifikasiSheetName: string;
  sheetName: string;
  title: string;
  description: string;
  active: boolean;
  isPmlUser: boolean;
  allowedKecamatan: string[];
}

interface GenericRow {
  rowNumber: number;
  idsls: string;
  values: string[];
  kecamatan: string;
  link: string;
  status: string;
  notes: string;
  namaPpl: string;
  namaPml: string;
}

const normalize = (value: unknown) => String(value ?? "").trim();
const normalizeKecamatan = (value: string) => normalize(value).toLowerCase().replace(/[.,/\\-]+/g, " ").replace(/\b(?:kecamatan|kec|kabupaten|kab|kota)\b/g, " ").replace(/\s+/g, " ").trim();
const getColumnLabel = (key: string) => key.replace(/_/g, " ");
const formatCellValue = (value: string, header: string) => {
  const numericColumn = /jumlah|nilai|harga|pengeluaran|pendapatan|produksi|luas|lahan|rumah|motor|gas|kulkas|laptop|ac|total/i.test(header);
  if (!numericColumn || !/^-?\d+(?:[.,]\d+)?$/.test(value)) return value;

  const number = value.includes(",")
    ? Number(value.replace(/\./g, "").replace(",", "."))
    : Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(number)
    : value;
};
const isNumericCell = (value: string, header: string) =>
  /jumlah|nilai|harga|pengeluaran|pendapatan|produksi|luas|lahan|rumah|motor|gas|kulkas|laptop|ac|total/i.test(header) &&
  /^-?\d+(?:[.,]\d+)?$/.test(value);

export default function OutlierGenericTab({ spreadsheetId, verifikasiSpreadsheetId, verifikasiSheetName, sheetName, title, description, active, isPmlUser, allowedKecamatan }: OutlierGenericTabProps) {
  const { toast } = useToast();
  const { data, loading, error } = useGoogleSheetsData({ spreadsheetId, sheetName, enabled: active });
  const { data: verifikasiData } = useGoogleSheetsData({ spreadsheetId: verifikasiSpreadsheetId, sheetName: verifikasiSheetName, enabled: active });
  const [search, setSearch] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [edits, setEdits] = useState<Record<number, { status?: string; notes?: string }>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const sourceColumns = useMemo(() => {
    const firstRow = data?.[0];
    const rawFirstRow = Array.isArray(firstRow) ? firstRow : firstRow?.__rawRow;
    if (Array.isArray(firstRow)) return firstRow.slice(2, 7).map(normalize);
    if (!firstRow || typeof firstRow !== "object") return [];
    const objectColumns = Object.keys(firstRow).filter((key) => !key.startsWith("__"));
    if (objectColumns.length > 0) return objectColumns.slice(2, 7);
    return Array.isArray(rawFirstRow) ? rawFirstRow.slice(2, 7).map(normalize) : [];
  }, [data]);

  const sourceHeaders = useMemo(() => sourceColumns.map((key) => {
    if (sheetName === "PENGELUARAN<100RB" && /isian/i.test(key)) return "Pengeluaran";
    return getColumnLabel(key);
  }), [sourceColumns, sheetName]);
  const sourceKecamatanIndex = sourceHeaders.findIndex((header) => /kecamatan|kec/i.test(header));
  const sourceDesaIndex = sourceHeaders.findIndex((header) => /^desa\b/i.test(header));
  const resolvedDesaIndex = sourceDesaIndex >= 0 ? sourceDesaIndex : sourceKecamatanIndex + 1;
  const headers = useMemo(() => sourceHeaders
    .filter((_, index) => index !== resolvedDesaIndex)
    .map((header, index) => index === sourceKecamatanIndex ? "Kecamatan" : header), [sourceHeaders, sourceDesaIndex, sourceKecamatanIndex]);

  const personnelById = useMemo(() => {
    const result = new Map<string, { namaPpl: string; namaPml: string }>();
    (verifikasiData || []).forEach((row: any) => {
      const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
      const id = normalize(rawRow[0] ?? row?.idsubsls);
      if (id) result.set(id, { namaPpl: [normalize(rawRow[16]) || "-", normalize(rawRow[17]) || "-"].join("\n"), namaPml: "" });
    });
    return result;
  }, [verifikasiData]);

  const rows = useMemo<GenericRow[]>(() => (data || []).map((rawRow: any, index) => ({ rawRow, index })).filter(({ rawRow, index }) => {
    const rawValues = Array.isArray(rawRow) ? rawRow : (Array.isArray(rawRow?.__rawRow) ? rawRow.__rawRow : []);
    if (index === 0 && sourceColumns.length > 0) {
      const matchingHeaders = sourceColumns.filter((column, columnIndex) => normalize(rawValues[columnIndex + 2]).toLowerCase() === normalize(column).toLowerCase()).length;
      if (matchingHeaders >= 3) return false;
    }
    if (Array.isArray(rawRow)) return index > 0;
    if (index !== 0 || sheetName !== "PENGELUARAN<100RB") return true;
    const matchingHeaders = sourceColumns.filter((column, columnIndex) => normalize(rawValues[columnIndex + 2]).toLowerCase() === normalize(column).toLowerCase()).length;
    return matchingHeaders < 3;
  }).map(({ rawRow, index }) => {
    const rawValues = Array.isArray(rawRow) ? rawRow : (Array.isArray(rawRow?.__rawRow) ? rawRow.__rawRow : []);
    const sourceValues = rawValues.length ? rawValues.slice(2, 7).map(normalize) : sourceColumns.map((key) => normalize(rawRow?.[key]));
    const values = sourceValues.filter((_, valueIndex) => valueIndex !== resolvedDesaIndex);
    if (sourceKecamatanIndex >= 0 && resolvedDesaIndex >= 0) {
      values[sourceKecamatanIndex] = [sourceValues[sourceKecamatanIndex], sourceValues[resolvedDesaIndex]].filter(Boolean).join("\n");
    }
    const idsls = normalize(rawValues[0] ?? rawRow?.level_6_full_code);
    const personnel = personnelById.get(idsls);
    return { rowNumber: Number(rawRow?.__rowNumber || index + 1) + 1, idsls, values, kecamatan: sourceValues[sourceKecamatanIndex >= 0 ? sourceKecamatanIndex : 1] || "", link: normalize(rawValues[7]), status: normalize(rawValues[8]), notes: normalize(rawValues[9]), namaPpl: personnel?.namaPpl || "-", namaPml: personnel?.namaPml || "-" };
  }), [data, headers, sourceColumns, sourceKecamatanIndex, resolvedDesaIndex, personnelById, sheetName]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    const status = edits[row.rowNumber]?.status ?? row.status;
    const text = [row.idsls, ...row.values, row.namaPpl, row.namaPml, status, edits[row.rowNumber]?.notes ?? row.notes].join(" ").toLowerCase();
    const allowed = !isPmlUser || allowedKecamatan.length === 0 || allowedKecamatan.some((value) => normalizeKecamatan(value) === normalizeKecamatan(row.kecamatan));
    return allowed && (!search || text.includes(search.toLowerCase())) &&
      (kecamatanFilter === "all" || normalizeKecamatan(row.kecamatan) === normalizeKecamatan(kecamatanFilter)) &&
      (statusFilter === "all" || status === statusFilter);
  }), [rows, edits, search, kecamatanFilter, statusFilter, isPmlUser, allowedKecamatan]);

  const kecamatanOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.kecamatan).filter(Boolean)))
    .filter((kecamatan) => !isPmlUser || allowedKecamatan.length === 0 || allowedKecamatan.some((value) => normalizeKecamatan(value) === normalizeKecamatan(kecamatan)))
    .sort((a, b) => a.localeCompare(b, "id")), [rows, isPmlUser, allowedKecamatan]);
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const paginatedRows = visibleRows.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => setPage(1), [search, kecamatanFilter, statusFilter, pageSize]);

  const updateCell = async (row: GenericRow, column: "H" | "I", value: string) => {
    const field = column === "H" ? "status" : "notes";
    setEdits((current) => ({ ...current, [row.rowNumber]: { ...current[row.rowNumber], [field]: value } }));
    setSaving(row.rowNumber);
    try {
      const { error: updateError } = await supabase.functions.invoke("google-sheets", { body: { spreadsheetId, operation: "batch-update", updates: [{ range: `'${sheetName}'!${column}${row.rowNumber}`, values: [[value]] }] } });
      if (updateError) throw updateError;
      toast({ title: "Tersimpan", description: `Perubahan ${sheetName} berhasil direkam ke kolom ${column}.` });
    } catch (updateError: any) {
      setEdits((current) => { const next = { ...current }; const previous = { ...next[row.rowNumber] }; delete previous[field]; next[row.rowNumber] = previous; return next; });
      toast({ title: "Gagal menyimpan", description: updateError?.message || String(updateError), variant: "destructive" });
    } finally { setSaving(null); }
  };

  return <div className="outlier-generic-tab space-y-4">
    <style>{'.outlier-generic-tab table td input[placeholder="Tulis catatan..."] { min-width: 320px; } .outlier-generic-tab table th:last-child, .outlier-generic-tab table td:last-child { display: none; } .outlier-generic-tab table th:nth-last-child(2), .outlier-generic-tab table td:nth-last-child(2) { min-width: 280px; white-space: pre-line; }'}</style>
    <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-3 sm:p-4 shadow-sm"><p className="text-xs sm:text-sm leading-6 text-slate-800"><span className="font-bold text-violet-700">{title}</span>{" "}<span className="text-slate-700">— {description}</span><span className="ml-2 font-semibold text-violet-700">{visibleRows.length} record</span></p></div>
    <div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari seluruh data..." className="pl-9" /></div><select value={kecamatanFilter} onChange={(event) => setKecamatanFilter(event.target.value)} className="h-10 min-w-[170px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"><option value="all">Semua Kecamatan</option>{kecamatanOptions.map((kecamatan) => <option key={kecamatan} value={kecamatan}>{kecamatan}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 min-w-[170px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"><option value="all">Semua Status</option><option value="">Belum ditindaklanjuti</option><option value="Diperbaiki">Diperbaiki</option><option value="Tidak diperbaiki">Tidak diperbaiki</option></select><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="h-10 min-w-[100px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"><option value="10">10/hal</option><option value="20">20/hal</option><option value="50">50/hal</option><option value="100">100/hal</option></select></div>
    {loading ? <div className="flex justify-center gap-2 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Memuat data...</div> : error ? <div className="flex justify-center gap-2 py-16 text-rose-600"><AlertCircle className="h-5 w-5" />{String(error)}</div> : visibleRows.length === 0 ? <div className="py-16 text-center text-slate-500">Tidak ada data tersedia pada sheet {sheetName}</div> : <><div className="overflow-x-auto rounded-lg border border-slate-200"><Table className="min-w-[1500px]"><TableHeader><TableRow className="bg-slate-50"><TableHead className="w-12 text-center">No</TableHead>{headers.map((header, index) => <TableHead key={`${header}-${index}`} className="min-w-[150px] text-center capitalize">{header}</TableHead>)}<TableHead className="w-20 text-center">Link</TableHead><TableHead className="w-[170px] text-center">Tindak Lanjut</TableHead><TableHead className="w-[220px] text-center">Catatan</TableHead><TableHead className="w-[160px] text-center">Nama PPL</TableHead><TableHead className="w-[160px] text-center">Nama PML</TableHead></TableRow></TableHeader><TableBody>{paginatedRows.map((row, index) => <TableRow key={row.rowNumber} className="align-top"><TableCell className="text-center text-slate-500">{(page - 1) * pageSize + index + 1}</TableCell>{row.values.map((value, valueIndex) => <TableCell key={valueIndex} className={`break-words ${isNumericCell(value, headers[valueIndex] || "") ? "text-right" : "text-left"}`}>{valueIndex === sourceKecamatanIndex ? <><div>{value.split("\n")[0] || "-"}</div><div className="text-xs text-slate-500">{value.split("\n")[1] || "-"}</div></> : formatCellValue(value, headers[valueIndex] || "") || "-"}</TableCell>)}<TableCell className="text-center">{row.link ? <a href={row.link} target="_blank" rel="noreferrer" className="inline-flex text-sky-600"><ExternalLink className="h-4 w-4" /></a> : "-"}</TableCell><TableCell><select value={edits[row.rowNumber]?.status ?? row.status} disabled={saving === row.rowNumber} onChange={(event) => updateCell(row, "H", event.target.value)} className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-xs"><option value="">Pilih</option><option value="Diperbaiki">Diperbaiki</option><option value="Tidak diperbaiki">Tidak diperbaiki</option></select></TableCell><TableCell><Input value={edits[row.rowNumber]?.notes ?? row.notes} disabled={saving === row.rowNumber} onChange={(event) => setEdits((current) => ({ ...current, [row.rowNumber]: { ...current[row.rowNumber], notes: event.target.value } }))} onBlur={(event) => updateCell(row, "I", event.target.value)} placeholder="Tulis catatan..." className="h-8 text-xs" /></TableCell><TableCell className="break-words">{row.namaPpl}</TableCell><TableCell className="break-words">{row.namaPml}</TableCell></TableRow>)}</TableBody></Table></div><div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row"><div className="text-slate-600">Menampilkan {Math.max(0, (page - 1) * pageSize + 1)} - {Math.min(page * pageSize, visibleRows.length)} dari {visibleRows.length} data</div><div className="flex gap-1"><button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded border border-slate-300 px-3 py-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Sebelumnya</button><div className="px-3 py-2">Hal {page} dari {totalPages}</div><button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded border border-slate-300 px-3 py-2 hover:bg-slate-50 disabled:cursor-not-allowed">Berikutnya</button></div></div></>}
  </div>;
}
