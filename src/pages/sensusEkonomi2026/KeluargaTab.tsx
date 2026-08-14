import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Loader2, AlertCircle, ChevronDown, ChevronRight, ArrowUpDown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const KELUARGA_SPREADSHEET_ID = "1sRg7Hi7xtBT00dx-61mugWlGL7H1P0gnr3jziaClJsw";
const STACKING_SPREADSHEET_ID = "1_LNMJ2NSujoSegGQgG4jkLCR0GFHgP6PNHeQjp6WSCo";

const DEFAULT_ITEMS_PER_PAGE = 20;

const normalizeKey = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const isLikelyCodeLikeName = (value: unknown): boolean => {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return /^p\d{3}_\d{2}$/i.test(text) || /^[a-z]\d{3}_\d{2}$/i.test(text) || /^\d{6,}$/.test(text);
};

const normalizeSheetColumnName = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9%]/g, "");

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
  if (digits.length >= 4) {
    return digits.length > 16 ? digits.slice(-16) : digits;
  }
  return "";
};

const isFullStackingKey = (value: unknown): boolean => normalizeStackingKey(value).length === 16;

const getRawRowId16 = (row: unknown[]): string => {
  const exact16 = findExact16DigitKey(row);
  if (exact16) return exact16;
  const rawId = row[0] ?? "";
  return normalizeStackingKey(rawId);
};

const toProperCase = (value: string): string =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
    .join(" ");

const formatProperText = (value: string): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "-") return "-";
  return toProperCase(trimmed);
};

const getStackingKey = (row: unknown[]): string => {
  const exact16 = findExact16DigitKey(row);
  if (exact16) return exact16;
  const rawKey = row[3] ?? row[0] ?? "";
  const normalized = normalizeStackingKey(rawKey);
  if (normalized.length === 16) return normalized;
  const joined = String(row.map((cell) => String(cell ?? "")).join(" "));
  return normalizeStackingKey(joined);
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

type RowRecord = {
  __rawRow: string[];
  values: string[];
};

type SheetTable = {
  headers: string[];
  rows: RowRecord[];
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

        const findBestStackingId = (row: string[]): string => {
          const exact16 = findExact16DigitKey(row);
          if (exact16) return exact16;

          if (idIndex !== -1) {
            const candidate = normalizeStackingKey(row[idIndex] ?? "");
            if (candidate) return candidate;
          }

          const candidates = row
            .map((cell) => String(cell ?? "").replace(/\D/g, ""))
            .filter((digits) => digits.length >= 4);
          if (candidates.length === 0) return "";
          return candidates.reduce((best, current) => (current.length > best.length ? current : best), "");
        };

        values.slice(1).forEach((row) => {
          const rawId = findBestStackingId(row) || findExact16DigitKey(row);
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

const findBestKeluargaHeaderRowIndex = (values: string[][]): number => {
  if (!values || values.length === 0) return 0;

  const candidateGroups = [
    ["kecamatan", "nama kecamatan", "kec", "wilayah"],
    ["desa", "desa kelurahan", "kelurahan", "sls", "subsls", "sub satuan lingkungan"],
    ["prelist awal", "prelist", "prelistawal", "target", "wilkerstat"],
    ["total hasil pendataan", "total_hasil_pendataan", "total hasil", "totalhasil", "total hasil / prelist awal", "totalhasilprelistawal"],
    ["assignment", "assignment didata", "responden didata", "didata", "responden"],
  ];

  const maxRows = Math.min(12, values.length);
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < maxRows; i += 1) {
    const row = values[i] || [];
    const headers = row.map((cell) => String(cell ?? ""));
    let score = 0;

    candidateGroups.forEach((aliases) => {
      if (findColumnIndex(headers, aliases) !== -1) score += 3;
    });

    const filledCount = row.filter((cell) => String(cell).trim() !== "").length;
    score += Math.min(1, filledCount / 10);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestScore >= 1) return bestIndex;

  let fallbackIndex = 0;
  let fallbackScore = -1;
  for (let i = 0; i < maxRows; i += 1) {
    const row = values[i] || [];
    const filled = row.filter((cell) => String(cell).trim() !== "");
    const textual = filled.filter((cell) => !/^[-+]?\d[\d.,%\s]*$/.test(String(cell).trim()));
    const score = textual.length * 2 + filled.length;
    if (score > fallbackScore) {
      fallbackScore = score;
      fallbackIndex = i;
    }
  }

  return fallbackIndex;
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
      try {
        // Debug: log metadata response to help diagnose empty sheet list
        // eslint-disable-next-line no-console
        console.debug("useKeluargaDashboardSummary: metadataResponse", metadataResponse);
      } catch (e) {
        // ignore
      }
      if (metadataResponse.error) throw metadataResponse.error;

      const sheetNames = ((metadataResponse.data as any)?.sheets || [])
        .map((sheet: any) => String(sheet?.properties?.title || "").trim())
        .filter(Boolean);

      const keluargaSheetNames = sheetNames.filter((name) => normalizeKey(name) === "keluarga");
      const effectiveSheetNames = keluargaSheetNames.length > 0
        ? keluargaSheetNames
        : sheetNames.length > 0
          ? sheetNames
          : ["KELUARGA"];

      try {
        // eslint-disable-next-line no-console
        console.debug("useKeluargaDashboardSummary: sheetNames", effectiveSheetNames);
      } catch (e) {
        // ignore
      }

      const familyReadResults: string[][][] = [];
      // Read each sheet but tolerate failures per-sheet so one bad sheet doesn't break the whole summary.
      for (const sheetName of effectiveSheetNames) {
        try {
          const readResponse = await supabase.functions.invoke("google-sheets", {
            body: { spreadsheetId: KELUARGA_SPREADSHEET_ID, operation: "read", range: `'${sheetName}'` },
          });
          if (readResponse.error) {
            // eslint-disable-next-line no-console
            console.debug(`useKeluargaDashboardSummary: read ${sheetName} error`, readResponse.error);
            familyReadResults.push([]);
            continue;
          }
          const values = ((readResponse.data as any)?.values || []).map((row: any[]) =>
            (row || []).map((cell) => (cell === undefined || cell === null ? "" : String(cell)))
          );
          try {
            // eslint-disable-next-line no-console
            console.debug(`useKeluargaDashboardSummary: read ${sheetName} rows`, (values || []).length);
          } catch (e) {
            // ignore
          }
          familyReadResults.push(values);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.debug(`useKeluargaDashboardSummary: exception reading ${sheetName}`, err);
          familyReadResults.push([]);
        }
      }

      const stackingLookup = new Map<string, { kecamatan: string; desa: string }>();
      const knownKecamatanNames = new Set<string>();
      const knownDesaNames = new Set<string>();
      try {
        const stackingResponse = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: STACKING_SPREADSHEET_ID, operation: "read", range: "'STACKING'" },
        });
        if (!stackingResponse.error) {
          const stackingValues = ((stackingResponse.data as any)?.values || []).map((row: any[]) =>
            (row || []).map((cell) => (cell === undefined || cell === null ? "" : String(cell)))
          );
          const stackingHeader = stackingValues[0] || [];
          const kecIndex = findHeaderIndex(stackingHeader, ["kecamatan", "nama kecamatan", "nmkec", "wilayah"]);
          const desaIndex = findHeaderIndex(stackingHeader, ["desa", "kelurahan", "desa kelurahan", "desa/kelurahan", "nama desa"]);

          stackingValues.slice(1).forEach((row) => {
            const key = getStackingKey(row) || findExact16DigitKey(row);
            if (!key) return;
            const kecamatan = String(row[kecIndex] ?? "").trim();
            const desaCell = String(row[desaIndex] ?? "").trim();
            const fallbackDesaCell = String(row[14] ?? "").trim();
            const isLikelyDesaCode = (value: string) => /^\d+$/.test(value);
            const desa = desaCell && !isLikelyDesaCode(desaCell)
              ? desaCell
              : fallbackDesaCell && !isLikelyDesaCode(fallbackDesaCell)
                ? fallbackDesaCell
                : "";
            if (!kecamatan && !desa) return;
            const record = { kecamatan: kecamatan || "-", desa: desa || "-" };
            if (!stackingLookup.has(key)) stackingLookup.set(key, record);
            if (kecamatan) knownKecamatanNames.add(normalizeSheetColumnName(kecamatan));
            if (desa) knownDesaNames.add(normalizeSheetColumnName(desa));
            for (let length = key.length; length >= 4; length -= 1) {
              const prefix = key.slice(0, length);
              if (!stackingLookup.has(prefix)) stackingLookup.set(prefix, record);
            }
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.debug("useKeluargaDashboardSummary: exception reading STACKING sheet", err);
      }

      const findKnownValue = (cells: string[], knownSet: Set<string>) => {
        for (const cell of cells) {
          const normalized = normalizeSheetColumnName(cell);
          if (knownSet.has(normalized)) return String(cell).trim();
        }
        return "";
      };

      const isLikelyRtLabel = (value: string) => {
        const txt = String(value || "").trim();
        return /\b(rt|rw)\b\s*\d+/i.test(txt) || /^\d{1,3}\s*(rt|rw)\b/i.test(txt) || /^rt\s*\d+/i.test(txt) || /^rw\s*\d+/i.test(txt);
      };

      try {
        // eslint-disable-next-line no-console
        console.debug("useKeluargaDashboardSummary: familyReadResults lengths", familyReadResults.map((v) => (v || []).length));
      } catch (e) {
        // ignore
      }

      const groups = new Map<string, { kecamatan: string; desa: string; prelist: number; assignment: number; totalHasil: number }>();

      familyReadResults.forEach((values, sheetIndex) => {
        if (values.length === 0) return;
        const headerIndex = findBestKeluargaHeaderRowIndex(values);
        const headers = values[headerIndex] || [];
        try {
          // eslint-disable-next-line no-console
          console.debug(`useKeluargaDashboardSummary: sheetIndex=${sheetIndex} headerIndex=${headerIndex} headers`, headers.slice(0, 20));
        } catch (e) {
          // ignore
        }
        const dataStart = headerIndex + 1;
        const rows = values.slice(dataStart).filter((row) => (row || []).some((cell) => String(cell).trim() !== ""));

        const kecamatanIndex = findColumnIndex(headers, ["kecamatan", "nama kecamatan", "kec", "wilayah"]);
        const desaIndex = findColumnIndex(headers, ["desa", "desa kelurahan", "kelurahan", "nama desa", "desa/kelurahan", "desa kel"]);
        const prelistIndex = findHeaderIndex(headers, ["prelist awal", "prelist", "prelistawal", "target", "wilkerstat"]);
        const assignmentIndex = findColumnIndex(headers, ["assignment", "assignment didata", "responden didata", "didata", "responden"]);
        const totalHasilIndex = findHeaderIndex(headers, ["total hasil pendataan", "total_hasil_pendataan", "total hasil", "totalhasil"]);

        try {
          // eslint-disable-next-line no-console
          console.debug(`useKeluargaDashboardSummary: sheetIndex=${sheetIndex} indices`, { kecamatanIndex, desaIndex, prelistIndex, assignmentIndex, totalHasilIndex });
        } catch (e) {
          // ignore
        }

        try {
          // eslint-disable-next-line no-console
          console.debug(`useKeluargaDashboardSummary: sheetIndex=${sheetIndex} indices`, { kecamatanIndex, desaIndex, prelistIndex, assignmentIndex, totalHasilIndex });
        } catch (e) {
          // ignore
        }

        rows.forEach((row) => {
          const rawKey = String(row[0] ?? "");
          const stackingKey = getStackingKey(row) || normalizeStackingKey(rawKey);
          const resolved = stackingLookup.get(stackingKey);
          const fallbackKecamatan = String(row[kecamatanIndex] ?? "").trim();
          const fallbackDesa = String(row[desaIndex] ?? "").trim();
          const isLikelyDesaCode = /^\d+$/.test(fallbackDesa);
          const kecamatan = resolved?.kecamatan || (fallbackKecamatan && !isLikelyRtLabel(fallbackKecamatan) ? fallbackKecamatan : "-");
          const desa = resolved?.desa || (fallbackDesa && !isLikelyRtLabel(fallbackDesa) && !isLikelyDesaCode ? fallbackDesa : "-");
          const prelist = parseNumericValue(row[prelistIndex] ?? "0");
          const assignment = parseNumericValue(row[assignmentIndex] ?? "0");
          const totalHasil = parseNumericValue(row[totalHasilIndex] ?? "0");
          if (!kecamatan || kecamatan === "-") return;
          const mapKey = `${kecamatan}||${desa}`;
          const existing = groups.get(mapKey) || { kecamatan, desa, prelist: 0, assignment: 0, totalHasil: 0 };
          existing.prelist += prelist;
          existing.assignment += assignment;
          existing.totalHasil += totalHasil;
          groups.set(mapKey, existing);
        });
      });

      return Array.from(groups.values()).map((item) => ({
        label: item.desa === "-" ? item.kecamatan : item.desa,
        kecamatan: item.kecamatan,
        desa: item.desa,
        prelistAwal: item.prelist,
        assignmentDidata: item.assignment,
        totalHasil: item.totalHasil,
        // persentase berdasarkan Total Hasil / Prelist Awal as requested
        persentasePemutakhiran: item.prelist > 0 ? Number(((item.totalHasil / item.prelist) * 100).toFixed(2)) : 0,
      }));
    },
  });

/**
 * Hook that returns debug information about the KELUARGA spreadsheet read operations.
 * Useful for rendering diagnostic UI when the dashboard shows no data.
 */
export const useKeluargaDebugInfo = (enabled = true) =>
  useQuery({
    queryKey: ["keluarga-debug", KELUARGA_SPREADSHEET_ID],
    enabled,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
    retry: 0,
    queryFn: async () => {
      const out: any = { metadataResponse: null, sheetNames: [], perSheetRows: [], errors: [] };
      try {
        const metadataResponse = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: KELUARGA_SPREADSHEET_ID, operation: "metadata" },
        });
        out.metadataResponse = metadataResponse;
        const sheetNames = ((metadataResponse.data as any)?.sheets || []).map((s: any) => String(s?.properties?.title || "").trim()).filter(Boolean);
        out.sheetNames = sheetNames.length > 0 ? sheetNames : ["KELUARGA"];

        for (const sheetName of out.sheetNames) {
          try {
            const readResponse = await supabase.functions.invoke("google-sheets", {
              body: { spreadsheetId: KELUARGA_SPREADSHEET_ID, operation: "read", range: `'${sheetName}'` },
            });
            if (readResponse.error) {
              out.perSheetRows.push({ sheetName, rows: 0, error: readResponse.error });
              out.errors.push({ sheetName, error: readResponse.error });
              continue;
            }
            const values: string[][] = ((readResponse.data as any)?.values || []).map((row: any[]) => (row || []).map((cell) => (cell === undefined || cell === null ? "" : String(cell))));

            // Attempt to detect header row and sample headers + column indices for debugging
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

            const headerRow = values[headerIndex] || [];
            const columnCount = values.reduce((max, row) => Math.max(max, row.length), headerRow.length);
            const headers: string[] = [];
            for (let i = 0; i < columnCount; i += 1) headers.push(String(headerRow[i] || "").trim() || `Kolom ${i + 1}`);

            const kecamatanIndex = findColumnIndex(headers, ["kecamatan", "nama kecamatan", "kec", "wilayah"]);
            const desaIndex = findColumnIndex(headers, ["desa", "desa kelurahan", "kelurahan", "sls"]);
            const prelistIndex = findColumnIndex(headers, ["prelist awal", "prelist", "prelistawal", "target", "wilkerstat"]);
            const assignmentIndex = findColumnIndex(headers, ["assignment", "assignment didata", "responden didata", "didata", "responden"]);
            const totalHasilIndex = findColumnIndex(headers, ["total hasil pendataan", "total_hasil_pendataan", "total hasil", "totalhasil"]);

            out.perSheetRows.push({
              sheetName,
              rows: (values || []).length,
              headerIndex,
              headers: headers.slice(0, 20),
              indices: { kecamatanIndex, desaIndex, prelistIndex, assignmentIndex, totalHasilIndex },
            });
          } catch (err) {
            out.perSheetRows.push({ sheetName, rows: 0, error: String(err) });
            out.errors.push({ sheetName, error: String(err) });
          }
        }
      } catch (err) {
        out.errors.push({ global: String(err) });
      }
      return out;
    },
  });


type GroupedRow = {
  key: string;
  label: string;
  cells: string[];
  numeric: number[];
  children: RowRecord[];
};

const KeluargaSheetTable = ({ sheetName, active }: { sheetName: string; active: boolean }) => {
  const { data: stackingMapData } = useKeluargaStackingMap();
  const { data, isPending, fetchStatus, error } = useKeluargaSheet(sheetName, active);

  const [searchTerm, setSearchTerm] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string>("prelist_awal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const stackingMap = stackingMapData ?? new Map<string, { namaPpl: string; kecamatan: string }>();
  const isAnggotaKeluargaSheet = normalizeKey(sheetName).includes("anggotakeluarga");
  const isKeluargaKhususSheet = normalizeKey(sheetName).includes("keluargakhusus");
  const isSpecialSheet = isAnggotaKeluargaSheet || isKeluargaKhususSheet;
  const headerWrapClass = isSpecialSheet ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap";
  useEffect(() => {
    if (isAnggotaKeluargaSheet) {
      setSortKey("total_anggota_keluarga");
    } else if (isKeluargaKhususSheet) {
      setSortKey("jumlah_bangunan_keluarga_khusus_didata");
    } else {
      setSortKey("prelist_awal");
    }
    setSortDir("desc");
  }, [isAnggotaKeluargaSheet, isKeluargaKhususSheet]);

  const rows = useMemo(() => {
    const baseRows = data?.rows ?? [];
    const headers = data?.headers ?? [];

    return baseRows
      .map((rawRow, rowIndex) => {
        const row = Array.isArray((rawRow as any)?.values) ? (rawRow as any).values : (rawRow as any)?.slice?.() ?? [];
        const rawRowArray = Array.isArray((rawRow as any)?.__rawRow) ? (rawRow as any).__rawRow : row;
        const candidateHeaderId = getHeaderValue(row, headers, ["id sls", "id_sub_sls", "id sub sls", "idsubsls", "kode sls", "kode_sls", "kode", "idsls"], 0);
        const candidateColumnA = String(rawRowArray[0] ?? "");
        const kodeFromRow = normalizeStackingKey(candidateHeaderId) || normalizeStackingKey(candidateColumnA);
        const matchingKey = findMatchingStackingKey(candidateHeaderId, stackingMap) || findMatchingStackingKey(kodeFromRow, stackingMap) || "";
        const candidateCode = matchingKey || normalizeStackingKey(candidateHeaderId) || normalizeStackingKey(candidateColumnA);
        if (candidateCode.length !== 16) return null;
        const kode = candidateCode;
        const subSls = getHeaderValue(row, headers, ["sub sls", "sub-sls", "sub_sls", "id sub sls", "idsubsls", "sub satuan lingkungan"], 1);
        const namaPplRaw = getHeaderValue(row, headers, ["nama ppl", "nama_ppl", "nama pencacah", "ppl", "nama petugas", "petugas", "nama_pml"], 0);
        const kecamatanRaw = getHeaderValue(row, headers, ["kecamatan", "nama kecamatan", "nmkec", "wilayah"], 1);
        const lookup = matchingKey ? stackingMap.get(matchingKey) : undefined;

        const directNamaPpl = normalizeDisplayText(namaPplRaw);
        const directKecamatan = normalizeDisplayText(kecamatanRaw);
        const lookupNamaPpl = lookup?.namaPpl && lookup.namaPpl !== "-" ? lookup.namaPpl : undefined;
        const lookupKecamatan = lookup?.kecamatan && lookup.kecamatan !== "-" ? lookup.kecamatan : undefined;
        const namaPpl = formatProperText(lookupNamaPpl || resolveDisplayValue(directNamaPpl, "-"));
        const kecamatan = formatProperText(lookupKecamatan || resolveDisplayValue(directKecamatan, "-"));

        const prelistAwal = parseNumericValue(getHeaderValue(row, headers, ["prelist awal", "prelist_awal", "prelistawal", "prelist", "target prelist awal"], 2));
        const ditemukan = parseNumericValue(getHeaderValue(row, headers, ["ditemukan"], 3));
        const keluargaBaru = parseNumericValue(getHeaderValue(row, headers, ["keluarga baru", "keluarga_baru"], 5));
        const totalHasilPendataan = parseNumericValue(getHeaderValue(row, headers, ["total hasil pendataan", "total_hasil_pendataan"], 14));
        const jumlahBangunanKhususHasilPendataanPpl = parseNumericValue(getHeaderValue(row, headers, ["jumlah bangunan keluarga khusus hasil pendataan ppl", "bangunan keluarga khusus hasil pendataan ppl", "hasil pendataan ppl", "jumlah bangunan keluarga khusus hasil pendataan"], 2));
        const jumlahBangunanKhususDidata = parseNumericValue(getHeaderValue(row, headers, ["jumlah bangunan keluarga khusus didata", "bangunan keluarga khusus didata", "didata", "jumlah didata"], 3));
        const persentaseBangunanKhususDidata = parseNumericValue(getHeaderValue(row, headers, ["persentase bangunan keluarga khusus didata", "persentase didata", "persentase", "% didata"], 4));

        const item = {
          id: kode,
          kode: kode,
          sub_sls: subSls,
          nama_ppl: namaPpl,
          kecamatan: kecamatan,
          prelist_awal: prelistAwal,
          ditemukan,
          persentase_ditemukan: parseNumericValue(getHeaderValue(row, headers, ["persentase ditemukan", "persen ditemukan", "% ditemukan", "ditemukan %", "ditemukanpersen"], 4)),
          keluarga_baru: keluargaBaru,
          // % Keluarga Baru: calculate from kolom F / kolom C
          persentase_keluarga_baru: prelistAwal > 0 ? (keluargaBaru / prelistAwal) * 100 : 0,
          meninggal: parseNumericValue(getHeaderValue(row, headers, ["meninggal"], 6)),
          persentase_meninggal: parseNumericValue(getHeaderValue(row, headers, ["persentase meninggal", "% meninggal", "meninggal %"], 7)),
          tidak_eligible: parseNumericValue(getHeaderValue(row, headers, ["tidak eligible", "tidak_eligible", "tidak eligible keluarga"], 8)),
          persentase_tidak_eligible: parseNumericValue(getHeaderValue(row, headers, ["persentase tidak eligible", "% tidak eligible", "tidak eligible %"], 9)),
          // legacy: some sheets include 'tidak dapat ditemui' but primary mapping uses 'tidak_eligible' and 'nonrespon'
          tidak_ditemukan: parseNumericValue(getHeaderValue(row, headers, ["tidak ditemukan", "tidak_ditemukan"], 10)),
          persentase_tidak_ditemukan: parseNumericValue(getHeaderValue(row, headers, ["persentase tidak ditemukan", "% tidak ditemukan", "tidak ditemukan %"], 11)),
          nonrespon: parseNumericValue(getHeaderValue(row, headers, ["nonrespon", "non respon"], 12)),
          persentase_nonrespon: parseNumericValue(getHeaderValue(row, headers, ["persentase nonrespon", "% nonrespon", "nonrespon %"], 13)),
          total_hasil_pendataan: totalHasilPendataan,
          persentase_total_hasil_pendataan: parseNumericValue(getHeaderValue(row, headers, ["persentase total hasil pendataan", "% total hasil pendataan", "total hasil pendataan %"], 15)),
          jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl: jumlahBangunanKhususHasilPendataanPpl,
          jumlah_bangunan_keluarga_khusus_didata: jumlahBangunanKhususDidata,
          persentase_bangunan_keluarga_khusus_didata: persentaseBangunanKhususDidata,
          tinggal_bersama_keluarga: parseNumericValue(getHeaderValue(row, headers, ["tinggal bersama keluarga", "tinggal_bersama_keluarga"], 2)),
          anggota_keluarga_baru: parseNumericValue(getHeaderValue(row, headers, ["anggota keluarga baru", "anggota_keluarga_baru"], 3)),
          pindah_dalam_negeri: parseNumericValue(getHeaderValue(row, headers, ["pindah dalam negeri", "pindah_dalam_negeri", "dn"], 4)),
          pindah_luar_negeri: parseNumericValue(getHeaderValue(row, headers, ["pindah luar negeri", "pindah_luar_negeri", "ln"], 5)),
          anggota_keluarga_khusus: parseNumericValue(getHeaderValue(row, headers, ["anggota keluarga khusus", "anggota_keluarga_khusus"], 7)),
          total_anggota_keluarga: parseNumericValue(getHeaderValue(row, headers, ["total anggota keluarga", "total_anggota_keluarga"], 8)),
        };

        if (!item.kecamatan || item.kecamatan === "-") {
          item.kecamatan = "-";
        }

        if (!item.nama_ppl || item.nama_ppl === "-") {
          item.nama_ppl = "-";
        }

        return item;
      })
      .filter(Boolean) as Array<any>;
  }, [data, stackingMap]);

  const groupedRows = useMemo(() => {
    const map = new Map<string, any>();

    rows.forEach((row: any) => {
      const key = `${normalizeKey(row.nama_ppl)}|${normalizeKey(row.kecamatan)}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: key,
          nama_ppl: row.nama_ppl,
          kecamatan: row.kecamatan,
          children: [row],
          prelist_awal: row.prelist_awal || 0,
          ditemukan: row.ditemukan || 0,
          keluarga_baru: row.keluarga_baru || 0,
          meninggal: row.meninggal || 0,
          tidak_eligible: row.tidak_eligible || 0,
          tidak_ditemukan: row.tidak_ditemukan || 0,
          nonrespon: row.nonrespon || 0,
          total_hasil_pendataan: row.total_hasil_pendataan || 0,
          jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl: row.jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl || 0,
          jumlah_bangunan_keluarga_khusus_didata: row.jumlah_bangunan_keluarga_khusus_didata || 0,
          persentase_bangunan_keluarga_khusus_didata: row.persentase_bangunan_keluarga_khusus_didata || 0,
          tinggal_bersama_keluarga: row.tinggal_bersama_keluarga || 0,
          anggota_keluarga_baru: row.anggota_keluarga_baru || 0,
          pindah_dalam_negeri: row.pindah_dalam_negeri || 0,
          pindah_luar_negeri: row.pindah_luar_negeri || 0,
          anggota_keluarga_khusus: row.anggota_keluarga_khusus || 0,
          total_anggota_keluarga: row.total_anggota_keluarga || 0,
        });
        return;
      }

      existing.children.push(row);
      existing.prelist_awal += row.prelist_awal || 0;
      existing.ditemukan += row.ditemukan || 0;
      existing.keluarga_baru += row.keluarga_baru || 0;
      existing.meninggal += row.meninggal || 0;
      existing.tidak_eligible += row.tidak_eligible || 0;
      existing.tidak_ditemukan += row.tidak_ditemukan || 0;
      existing.nonrespon += row.nonrespon || 0;
      existing.total_hasil_pendataan += row.total_hasil_pendataan || 0;
      existing.jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl += row.jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl || 0;
      existing.jumlah_bangunan_keluarga_khusus_didata += row.jumlah_bangunan_keluarga_khusus_didata || 0;
      existing.persentase_bangunan_keluarga_khusus_didata += row.persentase_bangunan_keluarga_khusus_didata || 0;
      existing.tinggal_bersama_keluarga += row.tinggal_bersama_keluarga || 0;
      existing.anggota_keluarga_baru += row.anggota_keluarga_baru || 0;
      existing.pindah_dalam_negeri += row.pindah_dalam_negeri || 0;
      existing.pindah_luar_negeri += row.pindah_luar_negeri || 0;
      existing.anggota_keluarga_khusus += row.anggota_keluarga_khusus || 0;
      existing.total_anggota_keluarga += row.total_anggota_keluarga || 0;
    });

    return Array.from(map.values()).map((group: any) => ({
      ...group,
      persentase_ditemukan: group.prelist_awal > 0 ? (group.ditemukan / group.prelist_awal) * 100 : 0,
      persentase_meninggal: group.prelist_awal > 0 ? (group.meninggal / group.prelist_awal) * 100 : 0,
      persentase_keluarga_baru: group.prelist_awal > 0 ? (group.keluarga_baru / group.prelist_awal) * 100 : 0,
      persentase_tidak_eligible: group.prelist_awal > 0 ? (group.tidak_eligible / group.prelist_awal) * 100 : 0,
      // legacy 'tidak_dapat_ditemui' removed from summary; prefer 'tidak_eligible' and 'nonrespon'
      persentase_tidak_ditemukan: group.prelist_awal > 0 ? (group.tidak_ditemukan / group.prelist_awal) * 100 : 0,
      persentase_nonrespon: group.prelist_awal > 0 ? (group.nonrespon / group.prelist_awal) * 100 : 0,
      persentase_total_hasil_pendataan: group.prelist_awal > 0 ? (group.total_hasil_pendataan / group.prelist_awal) * 100 : 0,
      persentase_bangunan_keluarga_khusus_didata: group.jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl > 0
        ? (group.jumlah_bangunan_keluarga_khusus_didata / group.jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl) * 100
        : 0,
    }));
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
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      const na = Number(va);
      const nb = Number(vb);
      let cmp = 0;
      if (Number.isFinite(na) && Number.isFinite(nb)) cmp = na - nb;
      else cmp = String(va ?? "").localeCompare(String(vb ?? ""), "id-ID", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rowsToSort;
  }, [filteredRows, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sortedRows.length / itemsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedRows = sortedRows.slice((effectivePage - 1) * itemsPerPage, effectivePage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [sheetName]);

  const numericColumns = [
    "tinggal_bersama_keluarga",
    "anggota_keluarga_baru",
    "meninggal",
    "pindah_dalam_negeri",
    "pindah_luar_negeri",
    "tidak_ditemukan",
    "anggota_keluarga_khusus",
    "total_anggota_keluarga",
  ] as const;

  const formatMetric = (value: number, percentMode = false) => {
    if (percentMode) return `${value.toFixed(2).replace(".", ",")}%`;
    return value.toLocaleString("id-ID");
  };

  const getPercentColorClass = (value: number | string | undefined) => {
    const numeric = Number(value ?? 0);
    if (numeric >= 100) return "text-emerald-600";
    if (numeric >= 50) return "text-orange-600";
    return "text-rose-600";
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
              <TableHead className={`sticky left-0 z-30 w-12 min-w-[48px] bg-slate-50 text-center text-slate-700 font-semibold ${isSpecialSheet ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap"}`}>No</TableHead>
              <TableHead onClick={() => handleSort("nama_ppl")} className={`sticky left-12 z-30 w-[180px] min-w-[180px] max-w-[180px] bg-slate-50 text-slate-700 font-semibold px-4 py-3 cursor-pointer ${isSpecialSheet ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap"}`}>Nama PPL</TableHead>
              <TableHead onClick={() => handleSort("kecamatan")} className={`sticky left-[228px] z-30 w-[220px] min-w-[220px] bg-slate-50 text-slate-700 font-semibold px-4 py-3 cursor-pointer ${isSpecialSheet ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap"}`}>Kecamatan</TableHead>
              {isAnggotaKeluargaSheet ? (
                <>
                  <TableHead onClick={() => handleSort("tinggal_bersama_keluarga")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Tinggal Bersama Keluarga
                  </TableHead>
                  <TableHead onClick={() => handleSort("anggota_keluarga_baru")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Anggota Keluarga Baru
                  </TableHead>
                  <TableHead onClick={() => handleSort("meninggal")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Meninggal
                  </TableHead>
                  <TableHead onClick={() => handleSort("pindah_dalam_negeri")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Pindah Dalam Negeri (DN)
                  </TableHead>
                  <TableHead onClick={() => handleSort("pindah_luar_negeri")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Pindah Luar Negeri (LN)
                  </TableHead>
                  <TableHead onClick={() => handleSort("tidak_ditemukan")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Tidak Ditemukan
                  </TableHead>
                  <TableHead onClick={() => handleSort("anggota_keluarga_khusus")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Anggota Keluarga Khusus
                  </TableHead>
                  <TableHead onClick={() => handleSort("total_anggota_keluarga")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Total Anggota Keluarga
                  </TableHead>
                </>
              ) : isKeluargaKhususSheet ? (
                <>
                  <TableHead onClick={() => handleSort("jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Jumlah Bangunan Keluarga Khusus Hasil Pendataan PPL
                  </TableHead>
                  <TableHead onClick={() => handleSort("jumlah_bangunan_keluarga_khusus_didata")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Jumlah Bangunan Keluarga Khusus Didata
                  </TableHead>
                  <TableHead onClick={() => handleSort("persentase_bangunan_keluarga_khusus_didata")} className={`cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 ${headerWrapClass}`}>
                    Persentase Bangunan Keluarga Khusus Didata
                  </TableHead>
                </>
              ) : (
                <>
                  <TableHead onClick={() => handleSort("prelist_awal")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">Prelist Awal</TableHead>
                  <TableHead onClick={() => handleSort("ditemukan")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">
                    <div>Ditemukan</div>
                    <div className="text-xs text-slate-500">% Ditemukan</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("keluarga_baru")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">
                    <div>Keluarga Baru</div>
                    <div className="text-xs text-slate-500">% Keluarga Baru</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("meninggal")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">
                    <div>Meninggal</div>
                    <div className="text-xs text-slate-500">% Meninggal</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("tidak_eligible")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">
                    <div>Tidak Eligible</div>
                    <div className="text-xs text-slate-500">% Tidak Eligible</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("tidak_ditemukan")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">
                    <div>Tidak Ditemukan</div>
                    <div className="text-xs text-slate-500">% Tidak Ditemukan</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("nonrespon")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">
                    <div>Non Respon</div>
                    <div className="text-xs text-slate-500">% Non Respon</div>
                  </TableHead>
                  <TableHead onClick={() => handleSort("persentase_total_hasil_pendataan")} className="cursor-pointer text-right text-slate-700 font-semibold px-4 py-3 whitespace-nowrap">
                    <div>Total Hasil</div>
                    <div className="text-xs text-slate-500">% Total Hasil</div>
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((group, index) => {
              const rowNumber = (effectivePage - 1) * itemsPerPage + index + 1;
              const expanded = expandedGroups.has(group.id);
              const totalChildren = group.children.length;
              const canToggle = totalChildren > 0;
              return (
                <React.Fragment key={group.id}>
                  <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-white text-center text-slate-600 font-medium">{rowNumber}</TableCell>
                    <TableCell className={`sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-white text-slate-700 px-4 py-3 flex items-center gap-2 whitespace-nowrap ${canToggle ? "cursor-pointer hover:text-blue-600" : "cursor-default"}`} onClick={() => {
                      if (!canToggle) return;
                      setExpandedGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.id)) next.delete(group.id);
                        else next.add(group.id);
                        return next;
                      });
                    }}>
                      {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <span>{group.nama_ppl}</span>
                    </TableCell>
                    <TableCell className={`sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-white text-slate-900 px-4 py-3 ${isSpecialSheet ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap"}`}>{group.kecamatan}</TableCell>
                    {isAnggotaKeluargaSheet ? (
                      <>
                        <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.tinggal_bersama_keluarga)}</TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.anggota_keluarga_baru)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.meninggal)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.pindah_dalam_negeri)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.pindah_luar_negeri)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.tidak_ditemukan)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.anggota_keluarga_khusus)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.total_anggota_keluarga)}</div>
                        </TableCell>
                      </>
                    ) : isKeluargaKhususSheet ? (
                      <>
                        <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl)}</TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.jumlah_bangunan_keluarga_khusus_didata)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.persentase_bangunan_keluarga_khusus_didata, true)}</div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{formatMetric(group.prelist_awal)}</TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.ditemukan)}</div>
                          <div className="text-xs text-slate-600">{formatMetric(group.persentase_ditemukan, true)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.keluarga_baru)}</div>
                          <div className="text-xs text-slate-600">{formatMetric(group.persentase_keluarga_baru, true)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.meninggal)}</div>
                          <div className="text-xs text-slate-600">{formatMetric(group.persentase_meninggal, true)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.tidak_eligible)}</div>
                          <div className="text-xs text-slate-600">{formatMetric(group.persentase_tidak_eligible, true)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.tidak_ditemukan)}</div>
                          <div className="text-xs text-slate-600">{formatMetric(group.persentase_tidak_ditemukan, true)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.nonrespon)}</div>
                          <div className="text-xs text-slate-600">{formatMetric(group.persentase_nonrespon, true)}</div>
                        </TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="font-semibold text-slate-900">{formatMetric(group.total_hasil_pendataan)}</div>
                          <div className={`text-xs ${getPercentColorClass(group.persentase_total_hasil_pendataan)}`}>{formatMetric(group.persentase_total_hasil_pendataan, true)}</div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>

                  {expanded && group.children
                    .filter((child) => isFullStackingKey(child.kode) || isFullStackingKey(child.id))
                    .map((child, childIndex) => (
                    <TableRow key={`${group.id}-${child.id}-${childIndex}`} className="border-b border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-slate-50 text-center text-slate-600"> </TableCell>
                      <TableCell className="sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-slate-50 text-sm text-slate-700 px-4 py-2 pl-8 italic">{child.kode}</TableCell>
                      <TableCell className={`sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-slate-50 text-sm text-slate-600 px-4 py-2 ${isSpecialSheet ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap"}`}>{child.sub_sls}</TableCell>
                      {isAnggotaKeluargaSheet ? (
                        <>
                          <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.tinggal_bersama_keluarga)}</TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.anggota_keluarga_baru)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.meninggal)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.pindah_dalam_negeri)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.pindah_luar_negeri)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.tidak_ditemukan)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.anggota_keluarga_khusus)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.total_anggota_keluarga)}</div>
                          </TableCell>
                        </>
                      ) : isKeluargaKhususSheet ? (
                        <>
                          <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl)}</TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.jumlah_bangunan_keluarga_khusus_didata)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.persentase_bangunan_keluarga_khusus_didata, true)}</div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right text-slate-900 px-4 py-2">{formatMetric(child.prelist_awal)}</TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.ditemukan)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(child.persentase_ditemukan, true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.keluarga_baru)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(child.persentase_keluarga_baru, true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.meninggal)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(child.persentase_meninggal, true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.tidak_eligible)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(child.persentase_tidak_eligible, true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.tidak_ditemukan)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(child.persentase_tidak_ditemukan, true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.nonrespon)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(child.persentase_nonrespon, true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-medium text-slate-900">{formatMetric(child.total_hasil_pendataan)}</div>
                            <div className={`text-xs ${getPercentColorClass(child.persentase_total_hasil_pendataan)}`}>{formatMetric(child.persentase_total_hasil_pendataan, true)}</div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
          <TableBody>
            {/* Summary: Jumlah sesuai tampilan (paginated) */}
            {
              (() => {
                const sum = (rows: typeof paginatedRows, key: string) => rows.reduce((s, r) => s + Number((r as any)[key] ?? 0), 0);
                const p = paginatedRows;
                const pre = sum(p, "prelist_awal");
                const ditem = sum(p, "ditemukan");
                const kb = sum(p, "keluarga_baru");
                const men = sum(p, "meninggal");
                const tidakEligible = sum(p, "tidak_eligible");
                const tdn = sum(p, "tidak_ditemukan");
                const nonres = sum(p, "nonrespon");
                const tot = sum(p, "total_hasil_pendataan");
                const pct = (num: number) => (pre > 0 ? (num / pre) * 100 : 0);
                return (
                  <>
                    <TableRow className="bg-slate-100 border-t border-slate-200">
                      <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-slate-100 text-center text-slate-700 font-semibold"> </TableCell>
                      <TableCell className="sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-slate-100 text-slate-700 px-4 py-2">Jumlah sesuai tampilan</TableCell>
                      <TableCell className={`sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-slate-100 text-slate-700 px-4 py-2 ${isSpecialSheet ? "whitespace-normal break-words leading-tight" : "whitespace-nowrap"}`}> </TableCell>
                      {isAnggotaKeluargaSheet ? (
                        <>
                          <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{formatMetric(sum(p, "tinggal_bersama_keluarga"))}</TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "anggota_keluarga_baru"))}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "meninggal"))}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "pindah_dalam_negeri"))}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "pindah_luar_negeri"))}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "tidak_ditemukan"))}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "anggota_keluarga_khusus"))}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "total_anggota_keluarga"))}</div>
                          </TableCell>
                        </>
                      ) : isKeluargaKhususSheet ? (
                        <>
                          <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{formatMetric(sum(p, "jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl"))}</TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "jumlah_bangunan_keluarga_khusus_didata"))}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(sum(p, "jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl") > 0 ? (sum(p, "jumlah_bangunan_keluarga_khusus_didata") / sum(p, "jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl")) * 100 : 0, true)}</div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{formatMetric(pre)}</TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(ditem)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(pct(ditem), true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(kb)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(pct(kb), true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(men)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(pct(men), true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(tidakEligible)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(pct(tidakEligible), true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(tdn)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(pct(tdn), true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(nonres)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(pct(nonres), true)}</div>
                          </TableCell>
                          <TableCell className="text-right px-4 py-2">
                            <div className="font-semibold text-slate-900">{formatMetric(tot)}</div>
                            <div className="text-xs text-slate-600">{formatMetric(pct(tot), true)}</div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                    {/* Summary: Jumlah Keseluruhan (filteredRows) */}
                    <TableRow className="bg-slate-200 border-t border-slate-200">
                      <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-slate-200 text-center text-slate-700 font-semibold"> </TableCell>
                      <TableCell className="sticky left-12 z-20 w-[180px] min-w-[180px] max-w-[180px] bg-slate-200 text-slate-700 px-4 py-2">Jumlah Keseluruhan</TableCell>
                      <TableCell className="sticky left-[228px] z-20 w-[220px] min-w-[220px] bg-slate-200 text-slate-700 px-4 py-2"> </TableCell>
                      {
                        (() => {
                          const sumAll = (rows: typeof filteredRows, key: string) => rows.reduce((s, r) => s + Number((r as any)[key] ?? 0), 0);
                          const all = filteredRows;
                          return (
                            <>
                              {isAnggotaKeluargaSheet ? (
                                <>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{formatMetric(sumAll(all, "tinggal_bersama_keluarga"))}</TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "anggota_keluarga_baru"))}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "meninggal"))}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "pindah_dalam_negeri"))}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "pindah_luar_negeri"))}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "tidak_ditemukan"))}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "anggota_keluarga_khusus"))}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "total_anggota_keluarga"))}</div>
                                  </TableCell>
                                </>
                              ) : isKeluargaKhususSheet ? (
                                <>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{formatMetric(sumAll(all, "jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl"))}</TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "jumlah_bangunan_keluarga_khusus_didata"))}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl") > 0 ? (sumAll(all, "jumlah_bangunan_keluarga_khusus_didata") / sumAll(all, "jumlah_bangunan_keluarga_khusus_hasil_pendataan_ppl")) * 100 : 0, true)}</div>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{formatMetric(sumAll(all, "prelist_awal"))}</TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "ditemukan"))}</div>
                                    <div className="text-xs text-slate-600">{formatMetric(sumAll(all, "ditemukan") / Math.max(1, sumAll(all, "prelist_awal")) * 100, true)}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "keluarga_baru"))}</div>
                                    <div className="text-xs text-slate-600">{formatMetric(sumAll(all, "keluarga_baru") / Math.max(1, sumAll(all, "prelist_awal")) * 100, true)}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "meninggal"))}</div>
                                    <div className="text-xs text-slate-600">{formatMetric(sumAll(all, "meninggal") / Math.max(1, sumAll(all, "prelist_awal")) * 100, true)}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "tidak_eligible"))}</div>
                                    <div className="text-xs text-slate-600">{formatMetric(sumAll(all, "tidak_eligible") / Math.max(1, sumAll(all, "prelist_awal")) * 100, true)}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "tidak_ditemukan"))}</div>
                                    <div className="text-xs text-slate-600">{formatMetric(sumAll(all, "tidak_ditemukan") / Math.max(1, sumAll(all, "prelist_awal")) * 100, true)}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "nonrespon"))}</div>
                                    <div className="text-xs text-slate-600">{formatMetric(sumAll(all, "nonrespon") / Math.max(1, sumAll(all, "prelist_awal")) * 100, true)}</div>
                                  </TableCell>
                                  <TableCell className="text-right px-4 py-2">
                                    <div className="font-semibold text-slate-900">{formatMetric(sumAll(all, "total_hasil_pendataan"))}</div>
                                    <div className="text-xs text-slate-600">{formatMetric(sumAll(all, "total_hasil_pendataan") / Math.max(1, sumAll(all, "prelist_awal")) * 100, true)}</div>
                                  </TableCell>
                                </>
                              )}
                            </>
                          );
                        })()
                      }
                    </TableRow>
                  </>
                );
              })()
            }
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
          <div className="ml-3 flex items-center gap-2">
            <label className="text-sm text-slate-600">Per halaman</label>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-purple-100 p-2 text-purple-700">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Pemutakhiran Keluarga</h2>
          <p className="text-sm text-slate-600">Monitoring pemutakhiran keluarga per petugas dan wilayah</p>
        </div>
      </div>
      <div className="space-y-6">
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
      </div>
    </div>
  );
};

export default KeluargaTab;
