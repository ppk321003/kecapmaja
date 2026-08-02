import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Loader2, Search, ClipboardEdit, AlertCircle, MapPin, Trash2, Save } from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const UTT_SPREADSHEET_ID = "1U6TlmlpePvxXfYGhSkNBnQ9ljTe0p8jTZiyrCLp8IaY";
const UTT_SHEET = "Form Responses 1";
const UTT_RANGE = `'${UTT_SHEET}'!A:N`;

const STATUS_OPTIONS = [
  { value: "Sudah Entri", label: "✅ Sudah Entri", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "Perlu Kunjungan Ulang", label: "🔄 Perlu Kunjungan Ulang", className: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "Tidak Ditemukan", label: "🏠 Tidak Ditemukan", className: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "Menolak", label: "🚫 Menolak", className: "bg-rose-100 text-rose-700 border-rose-200" },
];

const cellText = (row: any, index: number): string => {
  const raw = Array.isArray(row?.__rawRow) ? row.__rawRow[index] : undefined;
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
};

const formatIndoStamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}.${p(d.getMinutes())} - ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

type SortKey = "no" | "kecamatan" | "desa" | "alamat" | "nama" | "deskripsi" | "lokasi" | "status";

export default function IdentifikasiUTTTab() {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: UTT_SPREADSHEET_ID,
    sheetName: UTT_SHEET,
    range: UTT_RANGE,
    refreshKey,
  });

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("no");
  const [sortAsc, setSortAsc] = useState(true);
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [entryRow, setEntryRow] = useState<any | null>(null);
  const [entryValue, setEntryValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const headers = useMemo(() => {
    const first = (data || [])[0];
    if (!first) return [] as string[];
    return Object.keys(first).filter((k) => !k.startsWith("__"));
  }, [data]);

  const rows = useMemo(() => {
    return (data || [])
      .map((r: any, idx: number) => ({
        __rowNumber: r.__rowNumber,
        __rawRow: r.__rawRow || [],
        no: idx + 1,
        nama: cellText(r, 1),
        deskripsi: cellText(r, 5),
        lokasi: cellText(r, 6),
        kecamatan: cellText(r, 7),
        desa: cellText(r, 8),
        alamat: cellText(r, 9),
        status: overrides[r.__rowNumber] ?? cellText(r, 13),
      }))
      .filter((r: any) => r.nama || r.kecamatan || r.deskripsi);
  }, [data, overrides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter((r: any) =>
          [r.kecamatan, r.desa, r.alamat, r.nama, r.deskripsi, r.lokasi, r.status]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : rows;
    const sorted = [...base].sort((a: any, b: any) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv), "id")
        : String(bv).localeCompare(String(av), "id");
    });
    return sorted;
  }, [rows, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  };

  const statusMeta = (value: string) => {
    const raw = String(value || "").split(",")[0].trim().toLowerCase();
    return STATUS_OPTIONS.find((o) => o.value.toLowerCase() === raw);
  };

  const openEntry = (row: any) => {
    setEntryRow(row);
    const meta = statusMeta(row.status);
    setEntryValue(meta?.value || "");
  };

  const writeStatus = async (row: any, value: string) => {
    setSaving(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: UTT_SPREADSHEET_ID,
          operation: "update",
          range: `'${UTT_SHEET}'!N${row.__rowNumber}`,
          values: [[value]],
        },
      });
      if (fnError) throw fnError;
      setOverrides((prev) => ({ ...prev, [row.__rowNumber]: value }));
      toast({ title: "Tersimpan", description: value ? `Status: ${value}` : "Status dihapus." });
      setEntryRow(null);
    } catch (err: any) {
      toast({ title: "Gagal", description: err?.message || "Gagal menyimpan ke sheet.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const headerCell = (label: string, key: SortKey, className = "") => (
    <TableHead
      onClick={() => toggleSort(key)}
      className={`cursor-pointer select-none whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-sky-700 ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${sortKey === key ? "text-sky-600" : "text-slate-300"}`}>
          {sortKey === key ? (sortAsc ? "▲" : "▼") : "↕"}
        </span>
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-white">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Identifikasi Usaha Tidak Tetap</CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-relaxed text-slate-600">
                Daftar usaha keliling dan usaha mangkal yang menjadi acuan petugas agar tidak terlewat dalam
                pendataan SE2026. Periksa apakah usaha sudah tercacah di wilayah tugas. Jika belum, lakukan
                pendataan melalui aplikasi FASIH, kemudian lengkapi keterangan lainnya dengan mengunjungi rumah
                responden.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari kecamatan, desa, pengusaha, deskripsi..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="font-medium">
                {filtered.length} data
              </Badge>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / halaman
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-900/5">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-gradient-to-r from-sky-100/80 via-sky-50 to-white hover:bg-sky-100/60">
                    {headerCell("No", "no", "w-14 text-center")}
                    {headerCell("Kecamatan", "kecamatan")}
                    {headerCell("Desa", "desa")}
                    {headerCell("Alamat", "alamat")}
                    {headerCell("Nama Pengusaha", "nama")}
                    {headerCell("Deskripsi Usaha", "deskripsi")}
                    {headerCell("Lokasi Ditemukan", "lokasi")}
                    {headerCell("Status", "status")}
                    <TableHead className="w-24 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-slate-500">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((row: any, idx: number) => {
                      const meta = statusMeta(row.status);
                      const rowNo = (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <TableRow
                          key={row.__rowNumber}
                          className="group border-b border-slate-100 align-top transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-sky-50"
                        >
                          <TableCell className="text-center text-sm font-semibold tabular-nums text-slate-400 group-hover:text-sky-600">
                            {rowNo}
                          </TableCell>
                          <TableCell className="whitespace-nowrap border-l-2 border-transparent text-sm font-semibold text-slate-800 group-hover:border-sky-400">
                            {row.kecamatan || "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-slate-700">{row.desa || "-"}</TableCell>
                          <TableCell className="max-w-[220px] text-sm leading-relaxed text-slate-600">{row.alamat || "-"}</TableCell>
                          <TableCell className="text-sm font-medium text-slate-900">{row.nama || "-"}</TableCell>
                          <TableCell className="max-w-[260px] text-sm leading-relaxed text-slate-600">{row.deskripsi || "-"}</TableCell>
                          <TableCell className="max-w-[200px] text-sm leading-relaxed text-slate-500">{row.lokasi || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {row.status ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className={meta?.className || "bg-slate-100 text-slate-700"}>
                                  {meta?.label || row.status}
                                </Badge>
                                <div className="text-xs text-slate-400">
                                  {String(row.status).split(",").slice(1).join(",").trim()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Belum ada</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Lihat detail"
                                className="h-8 w-8 text-sky-600 hover:bg-sky-100"
                                onClick={() => setDetailRow(row)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Entri status"
                                className="h-8 w-8 text-emerald-600 hover:bg-emerald-100"
                                onClick={() => openEntry(row)}
                              >
                                <ClipboardEdit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <span>
                Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} dari{" "}
                {filtered.length} baris
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  Sebelumnya
                </Button>
                <span className="px-1">
                  Hal. {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Usaha Tidak Tetap</DialogTitle>
            <DialogDescription>{detailRow?.nama || "-"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {Array.from({ length: 14 }).map((_, i) => {
              const label = headers[i] || `Kolom ${String.fromCharCode(65 + i)}`;
              const value = detailRow ? cellText(detailRow, i) : "";
              if (!value) return null;
              return (
                <div key={i} className="rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="mt-0.5 text-sm text-slate-800">{value}</div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!entryRow} onOpenChange={(o) => !o && setEntryRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entri Status Pendataan</DialogTitle>
            <DialogDescription>{entryRow?.nama || "-"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEntryValue(opt.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  entryValue === opt.value
                    ? `${opt.className} font-semibold`
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {entryRow?.status && (
              <p className="pt-1 text-xs text-slate-500">Tersimpan saat ini: {entryRow.status}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="text-rose-600"
              disabled={saving || !entryRow?.status}
              onClick={() => entryRow && writeStatus(entryRow, "")}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Hapus
            </Button>
            <Button
              disabled={saving || !entryValue}
              onClick={() => entryRow && writeStatus(entryRow, `${entryValue}, ${formatIndoStamp(new Date())}`)}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}