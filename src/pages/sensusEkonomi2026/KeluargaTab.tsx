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

const isLikelyCodeLikeName = (value: unknown): boolean => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return /^p\d{3}_\d{2}$/i.test(text) || /^[a-z]\d{3}_\d{2}$/i.test(text) || /^\d{6,}$/.test(text);
};

const normalizeSheetColumnName = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeDisplayText = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const cleaned = text.replace(/^#\s*/, "").trim();
  if (!cleaned || cleaned.toLowerCase() === "n/a" || cleaned.toLowerCase() === "na") return "";
  return cleaned;
};

const isLikelyPetugasName = (value: unknown): boolean => {
  const text = normalizeDisplayText(value);
  if (!text || text === "-") return false;
  if (isLikelyCodeLikeName(text)) return false;
  if (!/[a-z]/i.test(text)) return false;
  if (/(desa|kecamatan|sls|subsls|kode|wilayah|keluarga|petugas|ppl|pml|target|status)/i.test(text)) return false;
  return true;
};

const isHumanNameCandidate = (value: unknown): boolean => {
  const text = normalizeDisplayText(value);
  if (!text || text === "-") return false;
  if (isLikelyCodeLikeName(text)) return false;
  if (/(desa|kecamatan|sls|subsls|kode|wilayah|keluarga|petugas|ppl|pml|target|status|nonrespon|ditemukan|meninggal|persentase)/i.test(text)) {
    return false;
  }
  return /[a-z]/i.test(text);
};

const resolveDisplayValue = (rawValue: unknown, fallbackValue: unknown): string => {
  const primary = normalizeDisplayText(rawValue);
  const fallback = normalizeDisplayText(fallbackValue);

  if (primary && isHumanNameCandidate(primary)) return primary;
  if (fallback && isHumanNameCandidate(fallback)) return fallback;
  if (primary && isLikelyPetugasName(primary)) return primary;
  if (fallback && isLikelyPetugasName(fallback)) return fallback;

  return "-";
};

const findHeaderIndex = (headers: string[], aliases: string[]): number => {
  const normalizedHeaders = headers.map((header) => normalizeSheetColumnName(header));
  for (const alias of aliases) {
    const normalizedAlias = normalizeSheetColumnName(alias);
    const exactIndex = normalizedHeaders.findIndex((header) => header === normalizedAlias);
    if (exactIndex !== -1) return exactIndex;
  }
  for (const alias of aliases) {
    const normalizedAlias = normalizeSheetColumnName(alias);
    const partialIndex = normalizedHeaders.findIndex((header) => header.includes(normalizedAlias));
    if (partialIndex !== -1) return partialIndex;
  }
  return -1;
};

const getHeaderValue = (row: string[], headers: string[], aliases: string[], fallbackIndex?: number): string => {
  const index = findHeaderIndex(headers, aliases);
  if (index !== -1) return String(row[index] ?? "").trim();
  if (fallbackIndex !== undefined && fallbackIndex >= 0 && fallbackIndex < row.length) return String(row[fallbackIndex] ?? "").trim();
  return "";
};

const normalizeStackingKey = (value: unknown): string => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 16 ? digits.slice(-16) : "";
};

const getRawRowId16 = (row: unknown[]): string => {
  const exact16 = findExact16DigitKey(row);
  if (exact16) return exact16;
  const rawId = row[0] ?? "";
  return normalizeStackingKey(rawId);
};

const getStackingKey = (row: unknown[]): string => {
  const rawKey = row[3] ?? "";
  const normalized = normalizeStackingKey(rawKey);
  if (normalized.length === 16) return normalized;
  return findExact16DigitKey(row);
};

const findExact16DigitKey = (row: unknown[]): string => {
  for (const cell of row) {
    const candidate = normalizeStackingKey(cell);
    if (candidate.length === 16) return candidate;
  }
  return "";
};

const findMatchingStackingKey = (value: unknown, stackingMap: Map<string, unknown>): string => {
  const normalized = normalizeStackingKey(value);
  if (!normalized) return "";

  if (stackingMap.has(normalized)) return normalized;

  for (let length = normalized.length; length >= 4; length -= 1) {
    const prefix = normalized.slice(0, length);
    if (stackingMap.has(prefix)) return prefix;
  }

  return "";
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

      const actualHeaderCandidates = [
        "kode",
        "sub satuan lingkungan setempat",
        "prelist awal",
        "ditemukan",
        "keluarga baru",
        "tinggal bersama keluarga",
        "anggota keluarga baru",
        "pendataan k1",
      ];

      const isSequenceRow = (row: string[]) => {
        if (!row || row.length === 0) return false;
        const filled = row.filter((cell) => String(cell).trim() !== "");
        if (filled.length === 0) return false;
        return filled.every((cell) => /^\(?\d+\)?$/.test(String(cell).trim().replace(/\s+/g, "")) || /^\(\d+\)$/.test(String(cell).trim()));
      };

      const findActualHeaderIndex = () => {
        const limit = Math.min(12, values.length);
        for (let i = 0; i < limit; i += 1) {
          const row = values[i] || [];
          const left = row.map((cell) => String(cell || "").trim().toLowerCase());
          const hasKode = left.some((cell) => cell.includes("kode"));
          const hasSubSls = left.some((cell) => cell.includes("sub satuan lingkungan") || cell.includes("sub-sls") || cell.includes("sub sls"));
          const hasMetric = left.some((cell) => actualHeaderCandidates.some((token) => cell.includes(token)));
          if (hasKode && hasSubSls && hasMetric) return i;
        }

        const candidateLimit = Math.min(8, values.length);
        let bestScore = -1;
        let fallbackIndex = 0;
        for (let i = 0; i < candidateLimit; i += 1) {
          const row = values[i] || [];
          const filled = row.filter((cell) => String(cell).trim() !== "");
          const textual = filled.filter((cell) => !looksNumeric(cell));
          const score = textual.length * 2 + filled.length;
          if (score > bestScore) {
            bestScore = score;
            fallbackIndex = i;
          }
        }
        return fallbackIndex;
      };

      const headerIndex = findActualHeaderIndex();
      const headerRow = values[headerIndex] || [];
      const nextRow = values[headerIndex + 1] || [];
      const columnCount = values.reduce((max, row) => Math.max(max, row.length), headerRow.length);

      const headers: string[] = [];
      for (let i = 0; i < columnCount; i += 1) {
        const label = String(headerRow[i] || "").trim();
        headers.push(label || `Kolom ${i + 1}`);
      }

      const dataStart = headerIndex + 1 + (isSequenceRow(nextRow) ? 1 : 0);
      const rows = values
        .slice(dataStart)
        .map((row) => {
          const normalized: string[] = [];
          for (let i = 0; i < columnCount; i += 1) normalized.push(String(row[i] ?? "").trim());
          return normalized;
        })
        .filter((row) => row.some((cell) => cell !== ""))
        .map((row) => ({ __rawRow: row, values: row }));

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
        const idIndex = findHeaderIndex(headerRow, ["id sls", "id_sub_sls", "id sub sls", "idsubsls", "kode sls", "kode_sls", "kode", "idsls"]);
        const kecIndex = findHeaderIndex(headerRow, ["kecamatan", "nama kecamatan", "nmkec", "wilayah"]);
        const pplIndex = findHeaderIndex(headerRow, ["nama ppl", "nama_ppl", "nama pencacah", "ppl", "nama petugas", "nama_pml"]);

        values.slice(1).forEach((row) => {
          const rawId = normalizeStackingKey(row[idIndex !== -1 ? idIndex : 0] ?? "") || findExact16DigitKey(row);
          if (!rawId) return;

          const namaPpl = String(row[pplIndex !== -1 ? pplIndex : 0] ?? "").trim();
          const kecamatan = String(row[kecIndex !== -1 ? kecIndex : 0] ?? "").trim();
          if (!namaPpl && !kecamatan) return;

          const record = {
            namaPpl: namaPpl || "-",
            kecamatan: kecamatan || "-",
          };

          lookup.set(rawId, record);

          for (let length = rawId.length; length >= 4; length -= 1) {
            const prefix = rawId.slice(0, length);
            if (!lookup.has(prefix) || prefix.length > (lookup.get(prefix) ? prefix.length : 0)) {
              lookup.set(prefix, record);
            }
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
  const { data: stackingMapData } = useKeluargaStackingMap();
  const { data, isPending, fetchStatus, error } = useKeluargaSheet(sheetName, active);

  const [searchTerm, setSearchTerm] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string>("prelist_awal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const stackingMap = stackingMapData ?? new Map<string, { namaPpl: string; kecamatan: string }>();
  const rows = useMemo(() => {
    const baseRows = data?.rows ?? [];
    const headers = data?.headers ?? [];

    return baseRows
      .map((rawRow, rowIndex) => {
        const row = Array.isArray((rawRow as any)?.values) ? (rawRow as any).values : (rawRow as any)?.slice?.() ?? [];
        const rawRowArray = Array.isArray((rawRow as any)?.__rawRow) ? (rawRow as any).__rawRow : row;
        const kodeFromRow = getRawRowId16(rawRowArray) || getStackingKey(rawRowArray) || findExact16DigitKey(rawRowArray) || findExact16DigitKey(rawRowArray.slice(0, 20));
        const directId = getHeaderValue(row, headers, ["id sls", "id_sub_sls", "id sub sls", "idsubsls", "kode sls", "kode_sls", "kode", "idsls"], 0);
        const matchingKey = findMatchingStackingKey(directId, stackingMap) || findMatchingStackingKey(kodeFromRow, stackingMap) || "";
        const kode = matchingKey || normalizeStackingKey(directId) || normalizeStackingKey(kodeFromRow) || `row-${rowIndex}`;
        const subSls = getHeaderValue(row, headers, ["sub sls", "sub-sls", "sub_sls", "id sub sls", "idsubsls", "sub satuan lingkungan"], 1);
        const namaPplRaw = getHeaderValue(row, headers, ["nama ppl", "nama_ppl", "nama pencacah", "ppl", "nama petugas", "petugas", "nama_pml"], 0);
        const kecamatanRaw = getHeaderValue(row, headers, ["kecamatan", "nama kecamatan", "nmkec", "wilayah"], 1);
        const lookup = matchingKey ? stackingMap.get(matchingKey) : undefined;

        const directNamaPpl = normalizeDisplayText(namaPplRaw);
        const directKecamatan = normalizeDisplayText(kecamatanRaw);
        const namaPpl = resolveDisplayValue(
          directNamaPpl,
          lookup?.namaPpl
        );
        const kecamatan = resolveDisplayValue(
          directKecamatan,
          lookup?.kecamatan
        );

        const item = {
          id: kode,
          kode: directId || kode,
          sub_sls: subSls,
          nama_ppl: namaPpl,
          kecamatan: kecamatan,
          prelist_awal: parseNumericValue(getHeaderValue(row, headers, ["prelist awal", "prelist_awal", "prelistawal", "prelist", "target prelist awal"], 2)),
          ditemukan: parseNumericValue(getHeaderValue(row, headers, ["ditemukan"], 3)),
          persentase_ditemukan: parseNumericValue(getHeaderValue(row, headers, ["persentase ditemukan", "persen ditemukan", "% ditemukan", "ditemukan %", "ditemukanpersen"], 4)),
          keluarga_baru: parseNumericValue(getHeaderValue(row, headers, ["keluarga baru", "keluarga_baru"], 5)),
          meninggal: parseNumericValue(getHeaderValue(row, headers, ["meninggal"], 6)),
          persentase_meninggal: parseNumericValue(getHeaderValue(row, headers, ["persentase meninggal", "% meninggal", "meninggal %"], 7)),
          tidak_eligible: parseNumericValue(getHeaderValue(row, headers, ["tidak eligible", "tidak_eligible", "tidak eligible keluarga"], 8)),
          persentase_tidak_eligible: parseNumericValue(getHeaderValue(row, headers, ["persentase tidak eligible", "% tidak eligible", "tidak eligible %"], 9)),
          tidak_dapat_ditemui: parseNumericValue(getHeaderValue(row, headers, ["tidak dapat ditemui", "tidak_dapat_ditemui", "tidak dapat ditemui akhir"], 10)),
          persentase_tidak_dapat_ditemui: parseNumericValue(getHeaderValue(row, headers, ["persentase tidak dapat ditemui", "% tidak dapat ditemui", "tidak dapat ditemui %"], 11)),
          tidak_ditemukan: parseNumericValue(getHeaderValue(row, headers, ["tidak ditemukan", "tidak_ditemukan"], 12)),
          persentase_tidak_ditemukan: parseNumericValue(getHeaderValue(row, headers, ["persentase tidak ditemukan", "% tidak ditemukan", "tidak ditemukan %"], 13)),
          nonrespon: parseNumericValue(getHeaderValue(row, headers, ["nonrespon", "non respon"], 14)),
          persentase_nonrespon: parseNumericValue(getHeaderValue(row, headers, ["persentase nonrespon", "% nonrespon", "nonrespon %"], 15)),
          total_hasil_pendataan: parseNumericValue(getHeaderValue(row, headers, ["total hasil pendataan", "total_hasil_pendataan"], 16)),
          persentase_total_hasil_pendataan: parseNumericValue(getHeaderValue(row, headers, ["persentase total hasil pendataan", "% total hasil pendataan", "total hasil pendataan %"], 17)),
        };

        if (!item.kecamatan || item.kecamatan === "-") {
          item.kecamatan = "-";
        }

        if (!item.nama_ppl || item.nama_ppl === "-") {
          item.nama_ppl = "-";
        }

        return item;
      })
      .filter(Boolean) as Array<{
        id: string;
        kode: string;
        sub_sls: string;
        nama_ppl: string;
        kecamatan: string;
        prelist_awal: number;
        ditemukan: number;
        persentase_ditemukan: number;
        keluarga_baru: number;
        meninggal: number;
        persentase_meninggal: number;
        tidak_eligible: number;
        persentase_tidak_eligible: number;
        tidak_dapat_ditemui: number;
        persentase_tidak_dapat_ditemui: number;
        tidak_ditemukan: number;
        persentase_tidak_ditemukan: number;
        nonrespon: number;
        persentase_nonrespon: number;
        total_hasil_pendataan: number;
        persentase_total_hasil_pendataan: number;
      }>;
  }, [data, stackingMap]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nama_ppl: string;
      kecamatan: string;
      children: typeof rows;
      prelist_awal: number;
      ditemukan: number;
      persentase_ditemukan: number;
      keluarga_baru: number;
      meninggal: number;
      persentase_meninggal: number;
      tidak_eligible: number;
      persentase_tidak_eligible: number;
      tidak_dapat_ditemui: number;
      persentase_tidak_dapat_ditemui: number;
      tidak_ditemukan: number;
      persentase_tidak_ditemukan: number;
      nonrespon: number;
      persentase_nonrespon: number;
      total_hasil_pendataan: number;
      persentase_total_hasil_pendataan: number;
    }>();

    rows.forEach((row) => {
      const key = `${normalizeKey(row.nama_ppl)}|${normalizeKey(row.kecamatan)}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: key,
          nama_ppl: row.nama_ppl,
          kecamatan: row.kecamatan,
          children: [row],
          prelist_awal: row.prelist_awal,
          ditemukan: row.ditemukan,
          persentase_ditemukan: row.persentase_ditemukan,
          keluarga_baru: row.keluarga_baru,
          meninggal: row.meninggal,
          persentase_meninggal: row.persentase_meninggal,
          tidak_eligible: row.tidak_eligible,
          persentase_tidak_eligible: row.persentase_tidak_eligible,
          tidak_dapat_ditemui: row.tidak_dapat_ditemui,
          persentase_tidak_dapat_ditemui: row.persentase_tidak_dapat_ditemui,
          tidak_ditemukan: row.tidak_ditemukan,
          persentase_tidak_ditemukan: row.persentase_tidak_ditemukan,
          nonrespon: row.nonrespon,
          persentase_nonrespon: row.persentase_nonrespon,
          total_hasil_pendataan: row.total_hasil_pendataan,
          persentase_total_hasil_pendataan: row.persentase_total_hasil_pendataan,
        });
        return;
      }

      existing.children.push(row);
      existing.prelist_awal += row.prelist_awal;
      existing.ditemukan += row.ditemukan;
      existing.persentase_ditemukan += row.persentase_ditemukan;
      existing.keluarga_baru += row.keluarga_baru;
      existing.meninggal += row.meninggal;
      existing.persentase_meninggal += row.persentase_meninggal;
      existing.tidak_eligible += row.tidak_eligible;
      existing.persentase_tidak_eligible += row.persentase_tidak_eligible;
      existing.tidak_dapat_ditemui += row.tidak_dapat_ditemui;
      existing.persentase_tidak_dapat_ditemui += row.persentase_tidak_dapat_ditemui;
      existing.tidak_ditemukan += row.tidak_ditemukan;
      existing.persentase_tidak_ditemukan += row.persentase_tidak_ditemukan;
      existing.nonrespon += row.nonrespon;
      existing.persentase_nonrespon += row.persentase_nonrespon;
      existing.total_hasil_pendataan += row.total_hasil_pendataan;
      existing.persentase_total_hasil_pendataan += row.persentase_total_hasil_pendataan;
    });

    return Array.from(map.values());
  }, [rows]);

  const kecamatanOptions = useMemo(() => {
    const values = Array.from(new Set(rows.map((row) => row.kecamatan))).sort((a, b) => a.localeCompare(b, "id-ID"));
    return values;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return groupedRows.filter((group) => {
      const kecamatanOk = kecamatanFilter === "all" || group.kecamatan === kecamatanFilter;
      if (!kecamatanOk) return false;
      if (!term) return true;
      const text = `${group.nama_ppl} ${group.kecamatan} ${group.children.map((child) => `${child.kode} ${child.sub_sls}`).join(" ")}`.toLowerCase();
      return text.includes(term);
    });
  }, [groupedRows, searchTerm, kecamatanFilter]);

  const sortedRows = useMemo(() => {
    const rowsToSort = [...filteredRows];
    rowsToSort.sort((a, b) => {
      const left = Number((a as any)[sortKey] ?? 0);
      const right = Number((b as any)[sortKey] ?? 0);
      return sortDir === "asc" ? left - right : right - left;
    });
    return rowsToSort;
  }, [filteredRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / ITEMS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * ITEMS_PER_PAGE, effectivePage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [sheetName]);

  const numericColumns = [
    "prelist_awal",
    "ditemukan",
    "persentase_ditemukan",
    "keluarga_baru",
    "meninggal",
    "persentase_meninggal",
    "tidak_eligible",
    "persentase_tidak_eligible",
    "tidak_dapat_ditemui",
    "persentase_tidak_dapat_ditemui",
    "tidak_ditemukan",
    "persentase_tidak_ditemukan",
    "nonrespon",
    "persentase_nonrespon",
    "total_hasil_pendataan",
    "persentase_total_hasil_pendataan",
  ] as const;

  const formatMetric = (value: number, percentMode = false) => {
    if (percentMode) return `${value.toFixed(2).replace(".", ",")}%`;
    return value.toLocaleString("id-ID");
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

  if (rows.length === 0) {
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
            placeholder="Cari nama, kecamatan, atau kode..."
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
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b-2 border-slate-300">
              <TableHead className="sticky left-0 z-30 w-12 min-w-[48px] bg-slate-50 text-center text-slate-700 font-semibold">No</TableHead>
              <TableHead className="sticky left-12 z-30 w-[180px] min-w-[180px] max-w-[180px] bg-slate-50 text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Nama PPL</TableHead>
              <TableHead className="sticky left-[228px] z-30 w-[220px] min-w-[220px] bg-slate-50 text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Kecamatan</TableHead>
              <TableHead onClick={() => setSortKey("prelist_awal")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Prelist Awal</TableHead>
              <TableHead onClick={() => setSortKey("ditemukan")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Ditemukan</TableHead>
              <TableHead onClick={() => setSortKey("persentase_ditemukan")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">% Ditemukan</TableHead>
              <TableHead onClick={() => setSortKey("keluarga_baru")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Keluarga Baru</TableHead>
              <TableHead onClick={() => setSortKey("meninggal")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Meninggal</TableHead>
              <TableHead onClick={() => setSortKey("tidak_dapat_ditemui")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Tidak Dapat Ditemui</TableHead>
              <TableHead onClick={() => setSortKey("tidak_ditemukan")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Tidak Ditemukan</TableHead>
              <TableHead onClick={() => setSortKey("total_hasil_pendataan")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Total Hasil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((group, index) => {
              const rowNumber = (effectivePage - 1) * ITEMS_PER_PAGE + index + 1;
              const expanded = expandedGroups.has(group.id);
              const totalChildren = group.children.length;
              return (
                <React.Fragment key={group.id}>
                  <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-white text-center text-slate-600 font-medium">{rowNumber}</TableCell>
                    <TableCell className="sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-white text-slate-700 px-4 py-3 cursor-pointer hover:text-blue-600 flex items-center gap-2 whitespace-nowrap" onClick={() => {
                      setExpandedGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.id)) next.delete(group.id);
                        else next.add(group.id);
                        return next;
                      });
                    }}>
                      {totalChildren > 1 ? (
                        expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : (
                        <span className="h-4 w-4" />
                      )}
                      <span>{group.nama_ppl}</span>
                    </TableCell>
                    <TableCell className="sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-white text-slate-900 px-4 py-3 whitespace-nowrap">{group.kecamatan}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.prelist_awal)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.ditemukan)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.persentase_ditemukan / Math.max(group.children.length, 1), true)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.keluarga_baru)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.meninggal)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.tidak_dapat_ditemui)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.tidak_ditemukan)}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.total_hasil_pendataan)}</TableCell>
                  </TableRow>

                  {expanded && group.children.map((child, childIndex) => (
                    <TableRow key={`${group.id}-${child.id}-${childIndex}`} className="border-b border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-slate-50 text-center text-slate-600"> </TableCell>
                      <TableCell className="sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-slate-50 text-sm text-slate-700 px-4 py-2 pl-8 italic">{child.kode}</TableCell>
                      <TableCell className="sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-slate-50 text-sm text-slate-600 px-4 py-2">{child.sub_sls}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.prelist_awal)}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.ditemukan)}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.persentase_ditemukan, true)}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.keluarga_baru)}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.meninggal)}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.tidak_dapat_ditemui)}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.tidak_ditemukan)}</TableCell>
                      <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.total_hasil_pendataan)}</TableCell>
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
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={effectivePage === 1}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={effectivePage === totalPages}
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
        <div className="text-sm text-slate-600">Halaman {effectivePage} dari {totalPages}</div>
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
