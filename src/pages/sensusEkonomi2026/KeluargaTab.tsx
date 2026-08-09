import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Loader2, AlertCircle, ChevronDown, ChevronRight, ArrowUpDown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const KELUARGA_SPREADSHEET_ID = "1sRg7Hi7xtBT00dx-61mugWlGL7H1P0gnr3jziaClJsw";
const STACKING_SPREADSHEET_ID = "1_LNMJ2NSujoSegGQgG4jkLCR0GFHgP6PNHeQjp6WSCo";

const ITEMS_PER_PAGE = 25;

const normalizeKey = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeStackingKey = (value: unknown): string => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 16 ? digits.slice(-16) : "";
};

const isPercentHeader = (header: string): boolean => {
  const normalized = normalizeKey(header);
  return normalized.includes("persen") || normalized.includes("persentase") || normalized.includes("percent") || String(header ?? "").includes("%");
};

const parseNumericValue = (value: unknown): number => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isPercentText = (value: unknown): boolean => String(value ?? "").includes("%");

const shortHeaderLabel = (header: string): string => {
  const normalized = String(header ?? "").trim().toLowerCase();
  if (!normalized) return "Kolom";
  if (normalized.includes("sub satuan lingkungan") || normalized.includes("sub-sls") || normalized.includes("sub sls")) return "Sub-SLS";
  if (normalized.includes("prelist awal")) return "Prelist Awal";
  if (normalized.includes("ditemukan")) return normalized.includes("persentase") ? "Ditemukan %" : "Ditemukan";
  if (normalized.includes("keluarga baru")) return normalized.includes("persentase") ? "Keluarga Baru %" : "Keluarga Baru";
  if (normalized.includes("meninggal")) return normalized.includes("persentase") ? "Meninggal %" : "Meninggal";
  if (normalized.includes("tidak eligible")) return "Tidak Eligible";
  if (normalized.includes("tidak dapat ditemui") || normalized.includes("tidak dapat ditemui sampai akhir pendataan")) return "Tidak Dapat Ditemui";
  if (normalized.includes("tidak ditemukan")) return "Tidak Ditemukan";
  if (normalized.includes("nonrespon")) return "Nonrespon";
  if (normalized.includes("total hasil pendataan")) return "Total Didata";
  if (normalized.includes("tinggal bersama keluarga")) return "Tinggal Bersama";
  if (normalized.includes("anggota keluarga baru")) return "Anggota Baru";
  if (normalized.includes("anggota keluarga khusus")) return "Anggota Khusus";
  if (normalized.includes("pendataan k1")) return "K1 Khusus";
  if (normalized.includes("bangunan keluarga khusus")) return "Bangunan Khusus";
  if (normalized.includes("bangunan")) return "Bangunan";
  if (normalized.includes("jml") || normalized.includes("jumlah")) return "Jumlah";
  return header.length > 24 ? header.replace(/\s+/g, " ").slice(0, 24) : header;
};

const looksNumeric = (value: unknown): boolean => {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  return /^-?[\d.,\s]+%?$/.test(raw);
};

type SheetTable = {
  headers: string[];
  rows: string[][];
};

/** Fetch the list of sheet (tab) names inside the Keluarga spreadsheet. */
export const useKeluargaSheetNames = () =>
  useQuery({
    queryKey: ["keluarga-sheet-names", KELUARGA_SPREADSHEET_ID],
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: KELUARGA_SPREADSHEET_ID, operation: "metadata" },
      });
      if (error) throw error;
      const sheets = (data as any)?.sheets || [];
      return sheets
        .map((sheet: any) => String(sheet?.properties?.title || "").trim())
        .filter(Boolean);
    },
  });

/** Fetch one sheet and resolve its header row heuristically. */
export const useKeluargaSheet = (sheetName: string, enabled: boolean) =>
  useQuery({
    queryKey: ["keluarga-sheet", KELUARGA_SPREADSHEET_ID, sheetName],
    enabled: enabled && !!sheetName,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<SheetTable> => {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: KELUARGA_SPREADSHEET_ID, operation: "read", range: `'${sheetName}'` },
      });
      if (error) throw error;

      const values: string[][] = ((data as any)?.values || []).map((row: any[]) =>
        (row || []).map((cell) => (cell === undefined || cell === null ? "" : String(cell)))
      );
      if (values.length === 0) return { headers: [], rows: [] };

      const surveyHeaderNames = [
        "prelist awal",
        "ditemukan",
        "keluarga baru",
        "meninggal",
        "tidak eligible",
        "tidak dapat ditemui",
        "tidak ditemukan",
        "nonrespon",
        "total hasil pendataan",
        "tinggal bersama keluarga",
        "anggota keluarga baru",
        "bangunan keluarga khusus",
      ];

      const firstHeaderIndex = values.findIndex((row) =>
        (row || []).some((cell) => surveyHeaderNames.some((token) => String(cell).toLowerCase().includes(token)))
      );

      let headerIndex = firstHeaderIndex !== -1 ? firstHeaderIndex : 0;
      if (firstHeaderIndex === -1) {
        const candidateLimit = Math.min(8, values.length);
        let bestScore = -1;
        for (let i = 0; i < candidateLimit; i += 1) {
          const row = values[i] || [];
          const filled = row.filter((cell) => String(cell).trim() !== "");
          const textual = filled.filter((cell) => !looksNumeric(cell));
          const score = textual.length * 2 + filled.length;
          if (score > bestScore) {
            bestScore = score;
            headerIndex = i;
          }
        }
      }

      const headerRow = values[headerIndex] || [];
      const secondRow = values[headerIndex + 1] || [];
      const columnCount = values.reduce((max, row) => Math.max(max, row.length), headerRow.length);

      // Merge a sub-header row into empty/grouped header cells (common in these BPS sheets).
      const secondRowIsSubHeader =
        secondRow.length > 0 &&
        secondRow.filter((cell) => String(cell).trim() !== "").length > 0 &&
        secondRow.filter((cell) => looksNumeric(cell)).length <= 1;

      const headers: string[] = [];
      for (let i = 0; i < columnCount; i += 1) {
        const primary = String(headerRow[i] || "").trim();
        const secondary = secondRowIsSubHeader ? String(secondRow[i] || "").trim() : "";
        let label = primary;
        if (secondary) label = primary ? `${primary} - ${secondary}` : secondary;
        headers.push(label || `Kolom ${i + 1}`);
      }

      const dataStart = headerIndex + (secondRowIsSubHeader ? 2 : 1);
      const rows = values
        .slice(dataStart)
        .map((row) => {
          const normalized: string[] = [];
          for (let i = 0; i < columnCount; i += 1) normalized.push(String(row[i] ?? "").trim());
          return normalized;
        })
        .filter((row) => row.some((cell) => cell !== ""));

      return { headers, rows };
    },
  });

export const useKeluargaStackingMap = () =>
  useQuery({
    queryKey: ["keluarga-stacking-map", STACKING_SPREADSHEET_ID],
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: STACKING_SPREADSHEET_ID, operation: "read", range: "'STACKING'" },
      });
      if (error) throw error;
      const values: string[][] = ((data as any)?.values || []).map((row: any[]) =>
        (row || []).map((cell) => (cell === undefined || cell === null ? "" : String(cell)))
      );
      const lookup = new Map<string, { namaPpl: string; kecamatan: string }>();
      if (values.length > 0) {
        const headerRow = values[0] || [];
        const idIndex = headerRow.findIndex((cell) => /idsls|id sub sls|id_sls|kode/i.test(cell));
        const kecIndex = headerRow.findIndex((cell) => /kecamatan|nmkec|wilayah/i.test(cell));
        const pplIndex = headerRow.findIndex((cell) => /nama ppl|ppl|pengawas|nama_ppl/i.test(cell));

        values.slice(1).forEach((row) => {
          const rawId = String(row[idIndex] ?? "").replace(/[^0-9]/g, "");
          if (rawId.length === 16) {
            lookup.set(rawId, {
              namaPpl: String(row[pplIndex] ?? "").trim(),
              kecamatan: String(row[kecIndex] ?? "").trim(),
            });
          }
        });
      }
      return lookup;
    },
  });

export const findColumnIndex = (headers: string[], candidates: string[]): number => {
  const normalized = headers.map((header) => normalizeKey(header));
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const exact = normalized.findIndex((header) => header === target);
    if (exact !== -1) return exact;
  }
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const partial = normalized.findIndex((header) => header.includes(target));
    if (partial !== -1) return partial;
  }
  return -1;
};

export const useKeluargaDashboardSummary = (enabled = true) =>
  useQuery({
    queryKey: ["keluarga-dashboard-summary", KELUARGA_SPREADSHEET_ID],
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      const metadataResponse = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: KELUARGA_SPREADSHEET_ID, operation: "metadata" },
      });
      if (metadataResponse.error) throw metadataResponse.error;

      const sheetNames = ((metadataResponse.data as any)?.sheets || [])
        .map((sheet: any) => String(sheet?.properties?.title || "").trim())
        .filter(Boolean);

      if (sheetNames.length === 0) return [];

      const familyReadResults = await Promise.all(
        sheetNames.map(async (sheetName: string) => {
          const readResponse = await supabase.functions.invoke("google-sheets", {
            body: { spreadsheetId: KELUARGA_SPREADSHEET_ID, operation: "read", range: `'${sheetName}'` },
          });
          if (readResponse.error) throw readResponse.error;
          const values = ((readResponse.data as any)?.values || []).map((row: any[]) =>
            (row || []).map((cell) => (cell === undefined || cell === null ? "" : String(cell)))
          );
          return values;
        })
      );

      const groups = new Map<string, { kecamatan: string; desa: string; prelist: number; assignment: number }>();

      familyReadResults.forEach((values, sheetIndex) => {
        if (values.length === 0) return;
        const headerLimit = Math.min(8, values.length);
        let headerIndex = 0;
        let bestScore = -1;
        for (let i = 0; i < headerLimit; i += 1) {
          const row = values[i] || [];
          const filled = row.filter((cell) => String(cell).trim() !== "");
          const textual = filled.filter((cell) => !/^[-+]?\d[\d.,%\s]*$/.test(String(cell).trim()));
          const score = textual.length * 2 + filled.length;
          if (score > bestScore) {
            bestScore = score;
            headerIndex = i;
          }
        }

        const headers = values[headerIndex] || [];
        const dataStart = headerIndex + 1;
        const rows = values.slice(dataStart).filter((row) => (row || []).some((cell) => String(cell).trim() !== ""));

        const kecamatanIndex = findColumnIndex(headers, ["kecamatan", "nama kecamatan", "kec", "wilayah"]);
        const desaIndex = findColumnIndex(headers, ["desa", "desa kelurahan", "kelurahan", "sls"]);
        const prelistIndex = findColumnIndex(headers, ["prelist awal", "prelist", "prelistawal", "target", "wilkerstat"]);
        const assignmentIndex = findColumnIndex(headers, ["assignment", "assignment didata", "responden didata", "didata", "responden"]);

        rows.forEach((row) => {
          const kecamatan = String(row[kecamatanIndex] ?? "").trim() || "-";
          const desa = String(row[desaIndex] ?? "").trim() || "-";
          const prelist = parseNumericValue(row[prelistIndex] ?? "0");
          const assignment = parseNumericValue(row[assignmentIndex] ?? "0");
          if (!kecamatan || kecamatan === "-") return;
          const mapKey = `${kecamatan}||${desa}`;
          const existing = groups.get(mapKey) || { kecamatan, desa, prelist: 0, assignment: 0 };
          existing.prelist += prelist;
          existing.assignment += assignment;
          groups.set(mapKey, existing);
        });
      });

      return Array.from(groups.values()).map((item) => ({
        label: item.desa === "-" ? item.kecamatan : item.desa,
        kecamatan: item.kecamatan,
        desa: item.desa,
        prelistAwal: item.prelist,
        assignmentDidata: item.assignment,
        persentasePemutakhiran: item.prelist > 0 ? Number(((item.assignment / item.prelist) * 100).toFixed(2)) : 0,
      }));
    },
  });


type GroupedRow = {
  key: string;
  label: string;
  cells: string[];
  numeric: number[];
  children: string[][];
};

const KeluargaSheetTable = ({ sheetName, active }: { sheetName: string; active: boolean }) => {
  const { data: stackingMapData, isPending: isStackingPending } = useKeluargaStackingMap();
  const { data, isPending, fetchStatus, error } = useKeluargaSheet(sheetName, active);
  const table = data ?? { headers: [], rows: [] };

  const [searchTerm, setSearchTerm] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [sortKey, setSortKey] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const stackingMap = stackingMapData ?? new Map<string, { namaPpl: string; kecamatan: string }>();

  const baseHeaders = table.headers;
  const baseRows = table.rows;

  const displayTable = useMemo(() => {
    const percentIndexes = new Set<number>();
    baseHeaders.forEach((header, index) => {
      if (isPercentHeader(String(header ?? ""))) percentIndexes.add(index);
    });

    const visibleHeaderIndexes = baseHeaders.reduce<number[]>((acc, _header, index) => {
      if (!percentIndexes.has(index)) acc.push(index);
      return acc;
    }, []);

    const headers = visibleHeaderIndexes.map((index) => baseHeaders[index]);
    const rows = baseRows.map((row) => {
      const rendered = visibleHeaderIndexes.map((index) => String(row[index] ?? ""));
      return rendered;
    });

    const sourceIdHeaderIndex = findColumnIndex(baseHeaders, ["kode", "id sls", "sub sls", "id sub sls", "idsubsls", "kode sls", "idsls"]);
    const sourceIdIndex = sourceIdHeaderIndex !== -1 ? sourceIdHeaderIndex : 0;

    const hasKecamatan = findColumnIndex(headers, ["kecamatan", "nama kecamatan", "nmkec"]) !== -1;
    const hasPpl = findColumnIndex(headers, ["nama ppl", "ppl", "nama petugas", "pendata", "nama_ppl", "nama ppp"]) !== -1;

    const headersWithOverlay = [...headers];
    const rowsWithOverlay = rows.map((row, rowIndex) => {
      const tuple = [...row];
      const sourceRow = baseRows[rowIndex] || [];
      const rawId = normalizeStackingKey(sourceRow[sourceIdIndex] ?? "");
      const lookup = stackingMap.get(rawId || "") || undefined;

      if (!hasKecamatan) {
        tuple.push(lookup?.kecamatan || "-");
      }
      if (!hasPpl) {
        tuple.push(lookup?.namaPpl || "-");
      }

      return tuple;
    });

    if (!hasKecamatan) {
      headersWithOverlay.push("Kecamatan");
    }
    if (!hasPpl) {
      headersWithOverlay.push("Nama PPL");
    }

    return { headers: headersWithOverlay, rows: rowsWithOverlay };
  }, [baseHeaders, baseRows, stackingMap]);

  const { headers, rows } = displayTable;

  const idslsIndex = useMemo(() => findColumnIndex(headers, ["kode", "id sls", "sub sls", "id sub sls", "idsubsls", "kode sls", "idsls"]), [headers]);

  const pplIndex = useMemo(
    () => findColumnIndex(headers, ["nama ppl", "ppl", "nama petugas", "pendata", "nama_ppl", "nama ppp" ]),
    [headers]
  );
  const pmlIndex = useMemo(() => findColumnIndex(headers, ["nama pml", "pml", "pengawas", "ppm"]), [headers]);
  const kecamatanIndex = useMemo(() => findColumnIndex(headers, ["kecamatan", "nama kecamatan", "nmkec"]), [headers]);
  const groupIndex = pplIndex !== -1 ? pplIndex : pmlIndex !== -1 ? pmlIndex : -1;

  // Columns that hold numbers (used for aggregation + right alignment).
  const numericColumns = useMemo(() => {
    const flags = headers.map(() => false);
    const sample = rows.slice(0, 60);
    headers.forEach((_, index) => {
      if (index === groupIndex || index === kecamatanIndex || index === pmlIndex) return;
      let numericCount = 0;
      let filledCount = 0;
      sample.forEach((row) => {
        const value = row[index];
        if (!value) return;
        filledCount += 1;
        if (looksNumeric(value)) numericCount += 1;
      });
      flags[index] = filledCount > 0 && numericCount / filledCount >= 0.8;
    });
    return flags;
  }, [headers, rows, groupIndex, kecamatanIndex, pmlIndex]);

  const percentColumns = useMemo(() => {
    return headers.map((header, index) => {
      if (!numericColumns[index]) return false;
      if (normalizeKey(header).includes("persen") || header.includes("%")) return true;
      return rows.slice(0, 40).some((row) => isPercentText(row[index]));
    });
  }, [headers, rows, numericColumns]);

  const groupedRows = useMemo<GroupedRow[]>(() => {
    const groupByIndex = groupIndex !== -1 ? groupIndex : idslsIndex;
    if (groupByIndex === -1) {
      return rows.map((row, rowIndex) => ({
        key: `flat-${rowIndex}-${row.map((cell) => String(cell ?? "")).join("|")}`,
        label: String(row[0] ?? "Data"),
        cells: [...row],
        numeric: headers.map((_, index) => (numericColumns[index] ? parseNumericValue(row[index]) : 0)),
        children: [row],
      }));
    }

    const map = new Map<string, GroupedRow>();
    rows.forEach((row) => {
      const label = row[groupByIndex] || "(Tanpa Nama)";
      const key = normalizeKey(label) || `row-${map.size}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          label,
          cells: [...row],
          numeric: headers.map((_, index) => (numericColumns[index] ? parseNumericValue(row[index]) : 0)),
          children: [row],
        });
        return;
      }
      existing.children.push(row);
      headers.forEach((_, index) => {
        if (numericColumns[index]) existing.numeric[index] += parseNumericValue(row[index]);
      });
    });

    return Array.from(map.values()).map((group) => {
      // Re-derive percentage columns as weighted averages instead of raw sums.
      const cells = [...group.cells];
      headers.forEach((_, index) => {
        if (!numericColumns[index]) return;
        if (percentColumns[index]) {
          const sum = group.children.reduce((acc, row) => acc + parseNumericValue(row[index]), 0);
          group.numeric[index] = group.children.length > 0 ? sum / group.children.length : 0;
        }
        cells[index] = "";
      });
      return { ...group, cells };
    });
  }, [rows, headers, groupIndex, idslsIndex, numericColumns, percentColumns]);

  const kecamatanOptions = useMemo(() => {
    if (kecamatanIndex === -1) return [] as string[];
    const set = new Set<string>();
    rows.forEach((row) => {
      const value = row[kecamatanIndex];
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [rows, kecamatanIndex]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return groupedRows.filter((group) => {
      if (kecamatanFilter !== "all") {
        const matchesKecamatan =
          kecamatanIndex !== -1 && group.children.some((row) => row[kecamatanIndex] === kecamatanFilter);
        if (!matchesKecamatan) return false;
      }
      if (!term) return true;
      if (group.label.toLowerCase().includes(term)) return true;
      return group.children.some((row) => row.some((cell) => cell.toLowerCase().includes(term)));
    });
  }, [groupedRows, searchTerm, kecamatanFilter, kecamatanIndex]);

  const sortedRows = useMemo(() => {
    if (sortKey === null) return filteredRows;
    const factor = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      if (numericColumns[sortKey]) {
        return (a.numeric[sortKey] - b.numeric[sortKey]) * factor;
      }
      const left = sortKey === groupIndex ? a.label : a.children[0]?.[sortKey] || "";
      const right = sortKey === groupIndex ? b.label : b.children[0]?.[sortKey] || "";
      return left.localeCompare(right, "id-ID") * factor;
    });
  }, [filteredRows, sortKey, sortDir, numericColumns, groupIndex]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / ITEMS_PER_PAGE));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(
    () => sortedRows.slice((pageIndex - 1) * ITEMS_PER_PAGE, pageIndex * ITEMS_PER_PAGE),
    [sortedRows, pageIndex]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [sheetName]);

  const toggleSort = (index: number) => {
    if (sortKey === index) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(index);
    setSortDir(numericColumns[index] ? "desc" : "asc");
  };

  const formatCell = (index: number, value: number | string, isGroup: boolean): string => {
    if (numericColumns[index]) {
      const numeric = typeof value === "number" ? value : parseNumericValue(value);
      if (percentColumns[index]) return `${numeric.toFixed(2).replace(".", ",")}%`;
      return numeric.toLocaleString("id-ID", { maximumFractionDigits: 2 });
    }
    return isGroup ? "" : String(value ?? "");
  };

  const loading = isPending && fetchStatus !== "idle";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Memuat data {sheetName}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="h-5 w-5 mr-2" />
        Error: {(error as any)?.message || String(error)}
      </div>
    );
  }

  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <AlertCircle className="h-5 w-5 mr-2" />
        Tidak ada data pada sheet {sheetName}.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari nama, kecamatan, atau nilai..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-10 w-full"
          />
        </div>
        {kecamatanOptions.length > 0 && (
          <select
            aria-label={`Filter kecamatan ${sheetName}`}
            value={kecamatanFilter}
            onChange={(event) => {
              setKecamatanFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">Semua Kecamatan</option>
            {kecamatanOptions.map((kecamatan) => (
              <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-600">
        <div>
          Menampilkan <span className="font-semibold text-slate-800">{paginatedRows.length.toLocaleString("id-ID")}</span> dari{" "}
          <span className="font-semibold text-slate-800">{sortedRows.length.toLocaleString("id-ID")}</span> hasil
        </div>
        <div>
          Total keseluruhan: <span className="font-semibold text-slate-800">{groupedRows.length.toLocaleString("id-ID")}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100 border-b border-slate-300">
              <TableHead className="sticky left-0 z-30 w-12 min-w-[48px] bg-slate-100 text-center text-slate-700 font-semibold">No</TableHead>
              {headers.map((header, index) => (
                <TableHead
                  key={`${header}-${index}`}
                  onClick={() => toggleSort(index)}
                  className={`cursor-pointer select-none whitespace-normal px-4 py-3 font-semibold text-slate-700 hover:bg-slate-200/70 ${
                    numericColumns[index] ? "text-right" : "text-left"
                  } ${index === groupIndex ? "sticky left-12 z-30 min-w-[200px] bg-slate-100" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span className="leading-tight text-center">{shortHeaderLabel(header)}</span>
                    <ArrowUpDown className={`h-3 w-3 ${sortKey === index ? "text-blue-600" : "text-slate-400"}`} />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((group, rowIndex) => {
              const rowNumber = (pageIndex - 1) * ITEMS_PER_PAGE + rowIndex + 1;
              const isExpanded = expandedGroups.has(group.key);
              const hasChildren = group.children.length > 1;
              return (
                <React.Fragment key={group.key}>
                  <TableRow className="border-b transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/60">
                    <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-inherit text-center font-medium text-slate-600">
                      {rowNumber}
                    </TableCell>
                    {headers.map((_, index) => {
                      if (index === groupIndex) {
                        return (
                          <TableCell
                            key={`group-${index}`}
                            className="sticky left-12 z-20 min-w-[200px] bg-inherit px-4 py-3 text-slate-800"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasChildren) return;
                                setExpandedGroups((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(group.key)) next.delete(group.key);
                                  else next.add(group.key);
                                  return next;
                                });
                              }}
                              className={`flex w-full items-center gap-2 text-left font-medium ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
                            >
                              {hasChildren ? (
                                isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />
                              ) : (
                                <span className="inline-block h-4 w-4" />
                              )}
                              <span>{group.label}</span>
                              {hasChildren && (
                                <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {group.children.length}
                                </span>
                              )}
                            </button>
                          </TableCell>
                        );
                      }
                      const value = numericColumns[index] ? group.numeric[index] : group.children[0]?.[index] || "";
                      return (
                        <TableCell
                          key={`cell-${index}`}
                          className={`px-4 py-3 text-slate-800 ${numericColumns[index] ? "text-right tabular-nums" : ""}`}
                        >
                          {formatCell(index, value, false)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {hasChildren && isExpanded && group.children.map((child, childIndex) => (
                    <TableRow key={`${group.key}-child-${childIndex}`} className="border-b bg-blue-50/30 hover:bg-blue-50/60">
                      <TableCell className="sticky left-0 z-20 bg-inherit px-4 py-2" />
                      {headers.map((_, index) => {
                        if (index === groupIndex) {
                          return (
                            <TableCell key={`child-group-${index}`} className="sticky left-12 z-20 bg-inherit px-4 py-2 pl-10 text-sm italic text-slate-600">
                              Detail {childIndex + 1}
                            </TableCell>
                          );
                        }
                        const rawId = normalizeKey(child[idslsIndex] ?? "");
                        const enriched = stackingMap.get(rawId || "") || undefined;
                        if (index === idslsIndex && enriched) {
                          return (
                            <TableCell key={`child-cell-${index}`} className="px-4 py-2 text-sm text-slate-700">
                              <span className="font-semibold">{child[index] || "-"}</span>
                              <span className="ml-2 text-slate-500">{enriched.namaPpl || "-"}</span>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell
                            key={`child-cell-${index}`}
                            className={`px-4 py-2 text-sm text-slate-700 ${numericColumns[index] ? "text-right tabular-nums" : ""}`}
                          >
                            {formatCell(index, child[index] || "", false)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={pageIndex === 1}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={pageIndex === totalPages}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
        <div className="text-sm text-slate-600">
          Halaman {pageIndex} dari {totalPages}
        </div>
      </div>
    </div>
  );
};

const KeluargaTab = () => {
  const { data: sheetNames, isPending, fetchStatus, error } = useKeluargaSheetNames();
  const names = sheetNames ?? [];
  const [activeSheet, setActiveSheet] = useState<string>("");

  useEffect(() => {
    if (names.length > 0 && !names.includes(activeSheet)) {
      setActiveSheet(names[0]);
    }
  }, [names, activeSheet]);

  const loading = isPending && fetchStatus !== "idle";

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-slate-50">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Pemutakhiran Keluarga</CardTitle>
            <CardDescription>Monitoring pemutakhiran keluarga per petugas dan wilayah</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-slate-600">Memuat daftar sheet keluarga...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-red-600">
            <AlertCircle className="h-5 w-5" />
            <div>Gagal memuat spreadsheet Keluarga.</div>
            <div className="max-w-xl text-sm text-slate-600">
              Pastikan spreadsheet sudah dibagikan (minimal akses Viewer) ke service account{" "}
              <span className="font-mono">kecap-maja@xenon-hawk-458706-v6.iam.gserviceaccount.com</span>.
            </div>
          </div>
        ) : names.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            Tidak ada sheet yang terdeteksi.
          </div>
        ) : (
          <Tabs value={activeSheet} onValueChange={setActiveSheet} className="w-full">
            <TabsList className="inline-flex h-auto w-full flex-wrap gap-2 rounded-xl border border-slate-200/70 bg-white/80 p-1.5 shadow-inner">
              {names.map((name) => (
                <TabsTrigger key={name} value={name} className="rounded-lg px-4 py-2 text-sm font-semibold">
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
            {names.map((name) => (
              <TabsContent key={name} value={name} className="mt-6">
                <KeluargaSheetTable sheetName={name} active={activeSheet === name} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default KeluargaTab;
