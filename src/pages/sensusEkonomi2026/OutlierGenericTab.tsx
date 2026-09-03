import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpDown,
  Download,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const normalizeKecamatan = (value: string) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,/\\-]+/g, " ")
    .replace(/\b(?:kecamatan|kec|kabupaten|kab|kota)\b/gi, " ")
    .replace(/\s+\d+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isSameKecamatan = (a: string, b: string) =>
  normalizeKecamatan(a) === normalizeKecamatan(b);

const columnLetter = (index: number): string => {
  let result = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

const prettifyHeader = (value: string) =>
  String(value ?? "")
    .replace(/_new$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const numeric = Number(raw.replace(/\./g, "").replace(/,/g, "."));
  if (!Number.isFinite(numeric)) return raw;
  return numeric.toLocaleString("id-ID", { maximumFractionDigits: 0 });
};

interface GenericRow {
  rowNumber: number;
  idsls: string;
  nama_assignment: string;
  kecamatan: string;
  desa: string;
  nama_sls: string;
  values: string[];
  link: string;
  tindak_lanjut: string;
  catatan: string;
}

interface ParsedSheet {
  rows: GenericRow[];
  valueHeaders: string[];
  tindakLanjutColumn: string;
  catatanColumn: string;
}

interface OutlierGenericTabProps {
  spreadsheetId: string;
  sheetName: string;
  title: string;
  description: string;
  accentClass?: string;
  active: boolean;
  isPmlUser: boolean;
  allowedKecamatan: string[];
  canDownload: boolean;
}

const parseSheet = (values: any[][]): ParsedSheet => {
  const empty: ParsedSheet = { rows: [], valueHeaders: [], tindakLanjutColumn: "H", catatanColumn: "I" };
  if (!Array.isArray(values) || values.length <= 1) return empty;

  const headers = (values[0] || []).map((header: any) => String(header ?? "").trim());
  const findHeader = (needle: string) =>
    headers.findIndex((header) => header.toLowerCase().includes(needle.toLowerCase()));

  const idslsIdx = 0;
  const assignmentIdx = findHeader("nama_assignment");
  const kecIdx = findHeader("kecamatan");
  const desaIdx = findHeader("desa");
  const slsIdx = findHeader("nama_sls");
  const linkIdx = findHeader("link");
  const tindakIdx = findHeader("tindak lanjut");
  const catatanIdx = findHeader("catatan");

  const valueStart = slsIdx >= 0 ? slsIdx + 1 : 6;
  const valueEnd = linkIdx > valueStart ? linkIdx : valueStart + 1;
  const valueIndices: number[] = [];
  for (let i = valueStart; i < valueEnd; i += 1) valueIndices.push(i);

  const rows: GenericRow[] = values.slice(1).map((row: any, idx: number) => {
    const cells = Array.isArray(row) ? row : [];
    const get = (index: number) => (index >= 0 ? String(cells[index] ?? "").trim() : "");
    return {
      rowNumber: idx + 2,
      idsls: get(idslsIdx),
      nama_assignment: get(assignmentIdx),
      kecamatan: get(kecIdx),
      desa: get(desaIdx),
      nama_sls: get(slsIdx),
      values: valueIndices.map((index) => get(index)),
      link: get(linkIdx),
      tindak_lanjut: get(tindakIdx),
      catatan: get(catatanIdx),
    };
  }).filter((row) => !!row.idsls || !!row.kecamatan);

  return {
    rows,
    valueHeaders: valueIndices.map((index) => prettifyHeader(headers[index] || `Nilai ${index + 1}`)),
    tindakLanjutColumn: columnLetter(tindakIdx >= 0 ? tindakIdx : 8),
    catatanColumn: columnLetter(catatanIdx >= 0 ? catatanIdx : 9),
  };
};

export default function OutlierGenericTab({
  spreadsheetId,
  sheetName,
  title,
  description,
  accentClass = "text-violet-700",
  active,
  isPmlUser,
  allowedKecamatan,
  canDownload,
}: OutlierGenericTabProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"kecamatan" | "nama_assignment" | "nama_sls" | "value">("kecamatan");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [rowEdits, setRowEdits] = useState<Record<number, { tindak_lanjut?: string; catatan?: string }>>({});

  const { data, isPending, fetchStatus, error } = useQuery({
    queryKey: ["outlier-generic-sheet", spreadsheetId, sheetName],
    enabled: active,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ParsedSheet> => {
      const { data: response, error: readError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId,
          operation: "read",
          range: `'${sheetName}'!A1:Z20000`,
        },
      });
      if (readError) throw readError;
      return parseSheet((response as any)?.values || []);
    },
  });

  const loading = active && isPending && fetchStatus !== "idle";
  const parsed = data ?? { rows: [], valueHeaders: [], tindakLanjutColumn: "H", catatanColumn: "I" };

  useEffect(() => {
    setPage(1);
  }, [search, kecamatanFilter, statusFilter, pageSize]);

  const kecamatanOptions = useMemo(() => {
    const options = Array.from(new Set(parsed.rows.map((row) => row.kecamatan).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "id"),
    );
    if (isPmlUser && allowedKecamatan.length > 0) {
      return options.filter((kecamatan) => allowedKecamatan.some((value) => isSameKecamatan(value, kecamatan)));
    }
    return options;
  }, [parsed.rows, isPmlUser, allowedKecamatan]);

  const effectiveKecamatanFilter =
    isPmlUser && allowedKecamatan.length > 0
      ? kecamatanFilter === "all" || allowedKecamatan.some((value) => isSameKecamatan(value, kecamatanFilter))
        ? kecamatanFilter
        : "all"
      : kecamatanFilter;

  const filteredRows = useMemo(() => {
    const needle = search.toLowerCase();
    return parsed.rows.filter((row) => {
      const status = rowEdits[row.rowNumber]?.tindak_lanjut ?? row.tindak_lanjut;
      const matchesRole =
        !isPmlUser ||
        allowedKecamatan.length === 0 ||
        allowedKecamatan.some((value) => isSameKecamatan(value, row.kecamatan));
      return (
        matchesRole &&
        (!needle ||
          row.idsls.toLowerCase().includes(needle) ||
          row.nama_assignment.toLowerCase().includes(needle) ||
          row.kecamatan.toLowerCase().includes(needle) ||
          row.desa.toLowerCase().includes(needle) ||
          row.nama_sls.toLowerCase().includes(needle)) &&
        (effectiveKecamatanFilter === "all" || isSameKecamatan(row.kecamatan, effectiveKecamatanFilter)) &&
        (statusFilter === "all" || status === statusFilter)
      );
    });
  }, [parsed.rows, search, effectiveKecamatanFilter, statusFilter, rowEdits, isPmlUser, allowedKecamatan]);

  const sortedRows = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      if (sortKey === "value") {
        const aNum = Number(String(a.values[0] ?? "").replace(/\./g, "").replace(/,/g, ".")) || 0;
        const bNum = Number(String(b.values[0] ?? "").replace(/\./g, "").replace(/,/g, ".")) || 0;
        return (aNum - bNum) * factor;
      }
      const aVal = sortKey === "kecamatan" ? `${a.kecamatan} ${a.desa}` : (a as any)[sortKey];
      const bVal = sortKey === "kecamatan" ? `${b.kecamatan} ${b.desa}` : (b as any)[sortKey];
      return String(aVal).localeCompare(String(bVal), "id") * factor;
    });
  }, [filteredRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: typeof sortKey) => {
    setSortKey(key);
    setSortDir((current) => (sortKey === key ? (current === "asc" ? "desc" : "asc") : "asc"));
  };

  const updateRow = async (row: GenericRow, field: "tindak_lanjut" | "catatan", value: string) => {
    const column = field === "tindak_lanjut" ? parsed.tindakLanjutColumn : parsed.catatanColumn;
    setRowEdits((current) => ({ ...current, [row.rowNumber]: { ...current[row.rowNumber], [field]: value } }));
    setSavingRow(row.rowNumber);
    try {
      const { error: updateError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId,
          operation: "batch-update",
          updates: [{ range: `'${sheetName}'!${column}${row.rowNumber}`, values: [[value]] }],
        },
      });
      if (updateError) throw updateError;
      toast({ title: "Tersimpan", description: `Perubahan direkam ke sheet ${sheetName} kolom ${column}.` });
    } catch (updateError: any) {
      setRowEdits((current) => {
        const next = { ...current };
        const previous = { ...next[row.rowNumber] };
        delete previous[field];
        next[row.rowNumber] = previous;
        return next;
      });
      toast({
        title: "Gagal menyimpan",
        description: updateError?.message || String(updateError),
        variant: "destructive",
      });
    } finally {
      setSavingRow(null);
    }
  };

  const downloadExcel = () => {
    const headers = [
      "No",
      "ID SLS",
      "Kecamatan",
      "Desa",
      "Nama SLS",
      "Nama Assignment",
      ...parsed.valueHeaders,
      "Link",
      "Tindak Lanjut",
      "Catatan",
    ];
    const rowsForExport = sortedRows.map((row, index) => [
      index + 1,
      row.idsls,
      row.kecamatan,
      row.desa,
      row.nama_sls,
      row.nama_assignment,
      ...row.values,
      row.link,
      rowEdits[row.rowNumber]?.tindak_lanjut ?? row.tindak_lanjut,
      rowEdits[row.rowNumber]?.catatan ?? row.catatan,
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsForExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.replace(/[\\/?*[\]:]/g, "-").slice(0, 31));
    XLSX.writeFile(workbook, `Outlier_${sheetName.replace(/[^A-Za-z0-9]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const SortHead = ({ label, keyName }: { label: string; keyName: typeof sortKey }) => (
    <TableHead
      onClick={() => toggleSort(keyName)}
      className="cursor-pointer select-none whitespace-normal break-words px-1 sm:px-2 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-slate-700 align-middle hover:bg-slate-100 transition-colors"
    >
      <span className="inline-flex items-center justify-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 shrink-0 ${sortKey === keyName ? "text-sky-600" : "text-slate-300"}`} />
        {sortKey === keyName && <span className="text-[8px] sm:text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </TableHead>
  );

  return (
    <div className="mt-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari ID SLS, nama, kecamatan, atau SLS..."
            className="pl-9 text-xs sm:text-sm h-9 sm:h-10 w-full"
          />
        </div>

        <select
          value={effectiveKecamatanFilter}
          onChange={(event) => setKecamatanFilter(event.target.value)}
          className="h-9 sm:h-10 min-w-[150px] rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
        >
          <option value="all">Semua Kecamatan</option>
          {kecamatanOptions.map((kecamatan) => (
            <option key={kecamatan} value={kecamatan}>
              {kecamatan}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 sm:h-10 min-w-[150px] rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
        >
          <option value="all">Semua Status</option>
          <option value="">Belum ditindaklanjuti</option>
          <option value="Diperbaiki">Diperbaiki</option>
          <option value="Tidak diperbaiki">Tidak diperbaiki</option>
        </select>

        {canDownload && (
          <button
            onClick={downloadExcel}
            disabled={loading || !!error}
            className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-2 sm:px-3 text-xs sm:text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">Excel</span>
            <span className="sm:hidden">DL</span>
          </button>
        )}

        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
          className="h-9 sm:h-10 min-w-[90px] rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
        >
          <option value="10">10/hal</option>
          <option value="20">20/hal</option>
          <option value="50">50/hal</option>
          <option value="100">100/hal</option>
        </select>
      </div>

      <div className="mb-4 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-3 sm:p-4 shadow-sm">
        <p className="text-xs sm:text-sm leading-6 text-slate-800">
          <span className={`font-bold ${accentClass}`}>{title}</span>{" "}
          <span className="text-slate-700">— {description}</span>
          <span className={`ml-2 font-semibold ${accentClass}`}>{filteredRows.length} record</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-slate-500">
          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin shrink-0" />
          Memuat data...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-rose-600">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          {(error as any)?.message || String(error)}
        </div>
      ) : parsed.rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-slate-500">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          Tidak ada data tersedia pada sheet {sheetName}
        </div>
      ) : (
        <>
          <div className="-mx-3 w-full sm:mx-0 overflow-x-auto rounded-none sm:rounded-lg border-0 sm:border border-slate-200">
            <Table className="w-full table-fixed min-w-[1200px] sm:min-w-[1400px]">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-8 sm:w-12 text-center align-middle text-xs sm:text-sm px-1 sm:px-2">No</TableHead>
                  <SortHead label="Kecamatan" keyName="kecamatan" />
                  <SortHead label="Nama SLS" keyName="nama_sls" />
                  <SortHead label="Nama Assignment" keyName="nama_assignment" />
                  {parsed.valueHeaders.map((header, idx) => (
                    <React.Fragment key={header}>
                      {idx === 0 ? (
                        <SortHead label={header} keyName="value" />
                      ) : (
                        <TableHead className="w-[120px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                          {header}
                        </TableHead>
                      )}
                    </React.Fragment>
                  ))}
                  <TableHead className="w-[70px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Link</TableHead>
                  <TableHead className="w-[150px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                    Tindak Lanjut
                  </TableHead>
                  <TableHead className="w-[180px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                    Catatan
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row, idx) => (
                  <TableRow key={`${row.rowNumber}-${idx}`} className="border-b hover:bg-slate-50">
                    <TableCell className="text-center text-xs sm:text-sm text-slate-500">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                      <div>{row.kecamatan || "-"}</div>
                      <div className="text-[10px] text-slate-500">{row.desa || "-"}</div>
                    </TableCell>
                    <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                      <div>{row.nama_sls || "-"}</div>
                      <div className="text-[10px] text-slate-500">{row.idsls || "-"}</div>
                    </TableCell>
                    <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                      {row.nama_assignment || "-"}
                    </TableCell>
                    {row.values.map((value, valueIdx) => (
                      <TableCell
                        key={valueIdx}
                        className="px-1 sm:px-2 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-slate-800"
                      >
                        {formatValue(value)}
                      </TableCell>
                    ))}
                    <TableCell className="text-center px-1 sm:px-2 py-2 sm:py-3">
                      {row.link ? (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noreferrer"
                          title="Buka link"
                          className="inline-flex text-sky-600 hover:text-sky-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="px-1 sm:px-2 py-2 sm:py-3">
                      <select
                        value={rowEdits[row.rowNumber]?.tindak_lanjut ?? row.tindak_lanjut}
                        disabled={savingRow === row.rowNumber}
                        onChange={(event) => updateRow(row, "tindak_lanjut", event.target.value)}
                        className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-xs"
                      >
                        <option value="">Pilih</option>
                        <option value="Diperbaiki">Diperbaiki</option>
                        <option value="Tidak diperbaiki">Tidak diperbaiki</option>
                      </select>
                    </TableCell>
                    <TableCell className="px-1 sm:px-2 py-2 sm:py-3">
                      <Input
                        value={rowEdits[row.rowNumber]?.catatan ?? row.catatan}
                        disabled={savingRow === row.rowNumber}
                        onChange={(event) =>
                          setRowEdits((current) => ({
                            ...current,
                            [row.rowNumber]: { ...current[row.rowNumber], catatan: event.target.value },
                          }))
                        }
                        onBlur={(event) => {
                          const value = event.target.value;
                          if (value !== row.catatan) updateRow(row, "catatan", value);
                        }}
                        placeholder="Tulis catatan..."
                        className="h-8 text-xs"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-600">
            <span>
              Menampilkan {visibleRows.length} dari {sortedRows.length} record
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="h-8 rounded-lg border border-slate-300 bg-white px-3 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span>
                Hal {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="h-8 rounded-lg border border-slate-300 bg-white px-3 disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
