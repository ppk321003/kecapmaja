import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2, Search, Save, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SPREADSHEET_ID = "1pZie7-pHL1t4n20170pohixN46dE0I8AwVz42YAwKyY";
const SHEET_NAME = "Sheet1";
const STATUS_OPTIONS = ["Sudah", "Belum"];

const normalizeKecamatan = (value: unknown) => String(value ?? "").trim().toLowerCase()
  .replace(/[.,/\\-]+/g, " ").replace(/\b(?:kecamatan|kec|kabupaten|kab|kota)\b/gi, " ")
  .replace(/\s+/g, " ").trim();

const kecamatanFromRole = (role: string) => {
  const match = role.match(/(?:pj\s+kecamatan|pml)\s+(.+)/i);
  return match ? match[1].split(/\s*(?:,|;|\s+dan\s+|\s+&\s+)\s*/i).map(normalizeKecamatan).filter(Boolean) : [];
};

const readSheet = async () => {
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Gagal membaca spreadsheet (${response.status})`);
  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);
  if (!match) throw new Error("Respons spreadsheet tidak valid");
  const parsed = JSON.parse(match[1]);
  const headers = (parsed?.table?.rows?.[0]?.c || []).map((cell: any, index: number) => String(cell?.v ?? cell?.f ?? `Kolom ${index + 1}`));
  const rows = (parsed?.table?.rows || []).slice(1).map((row: any, rowIndex: number) => ({
    rowNumber: rowIndex + 2,
    values: headers.map((_: string, index: number) => String(row?.c?.[index]?.f ?? row?.c?.[index]?.v ?? "")),
  }));
  return { headers, rows };
};

const CekInfrastruktur = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [edits, setEdits] = useState<Record<number, string[]>>({});
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const role = String(user?.role || "");
  const isPml = role.toLowerCase().startsWith("pml ");
  const allowedKecamatan = useMemo(() => kecamatanFromRole(role), [role]);
  const { data, isPending, error } = useQuery({ queryKey: ["cek-infrastruktur", SPREADSHEET_ID, SHEET_NAME], queryFn: readSheet, staleTime: 1000 * 60 * 2 });

  const kecamatanOptions = useMemo(() => Array.from(new Set((data?.rows || [])
    .map((row) => row.values[0])
    .filter((value) => value.trim() !== "")
    .filter((value) => !isPml || allowedKecamatan.length === 0 || allowedKecamatan.includes(normalizeKecamatan(value))))
  ).sort((left, right) => left.localeCompare(right, "id-ID")), [data?.rows, isPml, allowedKecamatan]);

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.rows || []).filter((row) => {
      const kecamatan = normalizeKecamatan(row.values[0]);
      const roleAllowed = !isPml || allowedKecamatan.length === 0 || allowedKecamatan.includes(kecamatan);
      const selectedKecamatan = kecamatanFilter === "all" || kecamatan === normalizeKecamatan(kecamatanFilter);
      return roleAllowed && selectedKecamatan && (!needle || row.values.join(" ").toLowerCase().includes(needle));
    });
  }, [data?.rows, search, kecamatanFilter, isPml, allowedKecamatan]);

  const updateCell = async (rowNumber: number, column: number, value: string) => {
    const current = data?.rows.find((row) => row.rowNumber === rowNumber)?.values || [];
    const next = [...current];
    next[column] = value;
    setEdits((previous) => ({ ...previous, [rowNumber]: next }));
    setSavingRow(rowNumber);
    try {
      const { error: updateError } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: SPREADSHEET_ID, operation: "update", range: `'${SHEET_NAME}'!${String.fromCharCode(65 + column)}${rowNumber}`, values: [[value]] },
      });
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: ["cek-infrastruktur"] });
      toast({ title: "Tersimpan", description: `Perubahan kolom ${String.fromCharCode(65 + column)} berhasil disimpan.` });
    } catch (saveError: any) {
      setEdits((previous) => { const nextEdits = { ...previous }; delete nextEdits[rowNumber]; return nextEdits; });
      toast({ title: "Gagal menyimpan", description: saveError?.message || "Perubahan tidak tersimpan.", variant: "destructive" });
    } finally {
      setSavingRow(null);
    }
  };

  const getValue = (rowNumber: number, values: string[], index: number) => edits[rowNumber]?.[index] ?? values[index] ?? "";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-100 p-3 text-sky-700"><ShieldCheck className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Cek Infrastruktur</h1><p className="text-sm text-slate-600">Pemeriksaan pendataan dan input infrastruktur pada Sheet1.</p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900"><span>{isPml ? `Data dibatasi untuk: ${allowedKecamatan.join(", ") || "kecamatan pada role"}` : "Menampilkan seluruh kecamatan"}</span><span className="font-semibold">{visibleRows.length} baris</span></div>
      {isPending ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-sky-600" /></div> : error ? <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700"><AlertCircle className="h-5 w-5" />{String(error.message || error)}</div> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 p-4"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari desa atau infrastruktur..." className="pl-10" /></div><select aria-label="Filter Kecamatan" value={kecamatanFilter} onChange={(event) => setKecamatanFilter(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"><option value="all">Semua Kecamatan</option>{kecamatanOptions.map((kecamatan) => <option key={kecamatan} value={kecamatan}>{kecamatan}</option>)}</select></div>
          <div className="overflow-x-auto"><Table className="w-full table-auto"><TableHeader><TableRow className="bg-slate-50"><TableHead className="w-[18%] px-3 py-3 font-semibold text-slate-700">Kecamatan / Desa</TableHead>{(data?.headers || []).map((header, index) => index >= 3 ? <TableHead key={index} className="whitespace-normal break-words px-3 py-3 font-semibold text-slate-700">{header || `Kolom ${index + 1}`}</TableHead> : null)}<TableHead className="w-12 text-center">Aksi</TableHead></TableRow></TableHeader><TableBody>{visibleRows.map((row) => { const values = edits[row.rowNumber] || row.values; const status = getValue(row.rowNumber, values, 4); const saving = savingRow === row.rowNumber; return <TableRow key={row.rowNumber} className="hover:bg-sky-50/40"><TableCell className="w-[18%] px-3 py-3 align-top break-words"><div className="font-medium text-slate-800">{values[0] || "-"}</div><div className="mt-1 text-xs text-slate-500">{values[1] || "-"}</div></TableCell>{values.map((value, index) => index >= 3 ? <TableCell key={index} className="px-3 py-3 align-top break-words">{index === 4 ? <select value={status} onChange={(event) => updateCell(row.rowNumber, index, event.target.value)} className="h-9 w-full max-w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Pilih status</option>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select> : index >= 5 && index <= 7 ? <div className="flex items-start gap-2"><Input value={getValue(row.rowNumber, values, index)} onChange={(event) => setEdits((previous) => ({ ...previous, [row.rowNumber]: Object.assign([...values], { [index]: event.target.value }) }))} onBlur={(event) => updateCell(row.rowNumber, index, event.target.value)} placeholder="Isi keterangan..." className="w-full min-w-0" />{saving && <Check className="mt-2 h-4 w-4 shrink-0 text-emerald-600" />}</div> : <span className="text-slate-700">{value || "-"}</span>}</TableCell> : null)}<TableCell className="w-12 px-2 text-center">{saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin text-sky-600" /> : <Save className="mx-auto h-4 w-4 text-slate-400" />}</TableCell></TableRow>; })}</TableBody></Table></div>
        </div>
      )}
    </div>
  );
};

export default CekInfrastruktur;
