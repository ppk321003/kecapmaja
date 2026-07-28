import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpDown, Loader2, AlertCircle, ChevronDown, ChevronRight, Search, Database, Trophy, Users, Link, Edit3, CheckSquare, User as UserIcon, Phone, Copy, Flag as FlagIcon, Mail, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const STACKING_SPREADSHEET_ID = "1_LNMJ2NSujoSegGQgG4jkLCR0GFHgP6PNHeQjp6WSCo";
const STACKING_SHEET = "STACKING";
const PROGRES_SPREADSHEET_ID = "1_LNMJ2NSujoSegGQgG4jkLCR0GFHgP6PNHeQjp6WSCo";
const PROGRES_SHEET = "PROGRES PENDATAAN";
const MONITORING_LAPANGAN_SPREADSHEET_ID = "1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o";
const SHEET_ANOMALI_USAHA = "Mikro Anomali Usaha";
const SHEET_ANOMALI_KELUARGA = "Mikro Anomali Keluarga";

const MonitoringLapanganAnomaliTab = React.lazy(() => import("./MonitoringLapanganAnomaliTab"));

const normalizeSheetKey = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 16 ? digits.slice(-16) : "";
};

const getSheetCellText = (row: any, index: number) => {
  const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
  if (rawRow[index] !== undefined && rawRow[index] !== null) {
    return String(rawRow[index]).trim();
  }
  return "";
};

const parseNumericValue = (value: unknown) => {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toProperCase = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const calculateDayProgress = (): { daysElapsed: number } => {
  const today = new Date();
  const daysElapsed = Math.floor((today.getTime() - new Date(2026, 5, 15).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return { daysElapsed: Math.max(0, Math.min(daysElapsed, 63)) };
};

const getTargetMinimalPercentage = (daysElapsed: number): number => {
  const dailyRate = 27.2 / 16;
  const rawPercentage = dailyRate * daysElapsed;
  return Math.round(Math.max(0, Math.min(rawPercentage, 100)) * 100) / 100;
};

const parsePercentage = (value: unknown): number => {
  const text = String(value ?? "").trim();
  if (!text) return 0;

  const hasComma = text.includes(",");
  const hasDot = text.includes(".");
  let cleaned = text.replace(/\s+/g, "");

  if (hasComma && hasDot) {
    cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else if (hasComma) {
    cleaned = cleaned.replace(/,/g, ".");
  } else if (hasDot) {
    if (/\.\d{3}$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  cleaned = cleaned.replace(/[^0-9.\-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getColorForPercentage = (percentage: number): string => {
  const { daysElapsed } = calculateDayProgress();
  const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);
  const deviation = minPercentageTarget - percentage;

  if (percentage >= minPercentageTarget) {
    return "#15803d";
  }
  if (deviation > 0 && deviation <= 5) {
    return "#f97316";
  }
  return "#dc2626";
};

const extractProgressHeader = (value: string): string => {
  const segments = String(value || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const selected = segments.filter((part) => /^(sumber:|diperbarui:)/i.test(part));
  return selected.join(" | ");
};

interface PPLDetail {
  matchingKey: string;
  address: string;
  prelist_awal: string;
  responden_didata: string;
  persentase_responden_didata: string;
  draft: string;
  persentase_draft: string;
}

interface PPLRow {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: string;
  responden_didata: string;
  persentase_responden_didata: string;
  draft: string;
  persentase_draft: string;
  matchingKeys: string;
  details: PPLDetail[];
}

interface PMLChildRow {
  nama_ppl: string;
  prelist_awal: string;
  responden_didata: string;
  persentase_responden_didata: string;
  draft: string;
  persentase_draft: string;
}

interface PMLRow {
  id: string;
  nama_pml: string;
  kecamatan: string;
  prelist_awal: string;
  responden_didata: string;
  persentase_responden_didata: string;
  draft: string;
  persentase_draft: string;
  children: PMLChildRow[];
}

export default function MonitoringLapanganDash() {
  const { data: stackingData, loading: stackingLoading, error: stackingError } = useGoogleSheetsData({
    spreadsheetId: STACKING_SPREADSHEET_ID,
    sheetName: STACKING_SHEET,
  });
  const { data: progresData, loading: progresLoading, error: progresError } = useGoogleSheetsData({
    spreadsheetId: PROGRES_SPREADSHEET_ID,
    sheetName: PROGRES_SHEET,
  });
  const { data: progresHeaderData, loading: progresHeaderLoading, error: progresHeaderError } = useGoogleSheetsData({
    spreadsheetId: PROGRES_SPREADSHEET_ID,
    sheetName: PROGRES_SHEET,
    range: `${PROGRES_SHEET}!A2`,
    mode: "single-cell",
  });

  const { data: anomaliUsahaData, loading: anomaliUsahaLoading, error: anomaliUsahaError } = useGoogleSheetsData({
    spreadsheetId: MONITORING_LAPANGAN_SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_USAHA,
  });
  const { data: anomaliKeluargaData, loading: anomaliKeluargaLoading, error: anomaliKeluargaError } = useGoogleSheetsData({
    spreadsheetId: MONITORING_LAPANGAN_SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_KELUARGA,
  });
  const { data: anomaliUsahaInfoData } = useGoogleSheetsData({
    spreadsheetId: MONITORING_LAPANGAN_SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_USAHA,
    range: `${SHEET_ANOMALI_USAHA}!A2`,
    mode: "single-cell",
  });
  const { data: anomaliKeluargaInfoData } = useGoogleSheetsData({
    spreadsheetId: MONITORING_LAPANGAN_SPREADSHEET_ID,
    sheetName: SHEET_ANOMALI_KELUARGA,
    range: `${SHEET_ANOMALI_KELUARGA}!A2`,
    mode: "single-cell",
  });

  const { user } = useAuth();
  const isLoggedIn = !!user?.username;

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPPL, setExpandedPPL] = useState<Set<string>>(new Set());
  const [expandedPML, setExpandedPML] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortBy, setSortBy] = useState<keyof PPLRow>("nama_ppl");
  const [pmlSortOrder, setPmlSortOrder] = useState<"asc" | "desc">("asc");
  const [pmlSortBy, setPmlSortBy] = useState<keyof PMLRow>("nama_pml");
  const [currentPage, setCurrentPage] = useState(1);
  const [pmlCurrentPage, setPmlCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pmlItemsPerPage, setPmlItemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Ngibar Disdik tab: safe incremental implementation
  const NGIBAR_SPREADSHEET_ID = "1EyrssWtjEGd64SYelUMON3nnLpj6KU5INCMeD-Amjto";
  const NGIBAR_SHEET = "Sheet4";
  const { data: ngibarData, loading: ngibarLoading, error: ngibarError } = useGoogleSheetsData({
    spreadsheetId: NGIBAR_SPREADSHEET_ID,
    sheetName: NGIBAR_SHEET,
  });
  const [ngibarSearch, setNgibarSearch] = useState("");
  const [ngibarSortField, setNgibarSortField] = useState<string | null>(null);
  const [ngibarSortOrder, setNgibarSortOrder] = useState<"asc" | "desc">("asc");
  const [ngibarPage, setNgibarPage] = useState(1);
  const [ngibarItemsPerPage, setNgibarItemsPerPage] = useState(20);
  const { toast } = useToast();
  const [ngibarOverrides, setNgibarOverrides] = useState<Record<number, Record<string, string>>>({});
  const [ngibarJenisFilter, setNgibarJenisFilter] = useState<string | null>(null);

  const columnLetterToField = (col: string) => {
    switch ((col || "").toUpperCase()) {
      case "K":
        return "hasil_pengecekkan";
      case "L":
        return "flag_input_fasih";
      case "M":
        return "nama_pml";
      case "N":
        return "nama_ppl";
      default:
        return null;
    }
  };

  // Dialog state for editing fields
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogField, setEditDialogField] = useState<string | null>(null);
  const [editDialogRow, setEditDialogRow] = useState<number | null>(null);
  const [editDialogValue, setEditDialogValue] = useState<string>("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    console.debug("editDialogOpen changed", { editDialogOpen, editDialogField, editDialogRow });
  }, [editDialogOpen, editDialogField, editDialogRow]);

  const openEditDialog = (field: string, rowNumber: number | undefined, initialValue: string) => {
    console.debug("openEditDialog called", { field, rowNumber, initialValue });
    if (rowNumber == null) {
      console.warn("openEditDialog skipped because rowNumber is null/undefined", { field, rowNumber, initialValue });
      return;
    }
    console.debug("openEditDialog", { field, rowNumber, initialValue });
    setEditDialogField(field);
    setEditDialogRow(Number(rowNumber));
    setEditDialogValue(initialValue ?? "");
    setEditDialogOpen(true);
  };

  const saveEditDialog = async () => {
    if (editDialogField == null || editDialogRow == null) return;
    const col = editDialogField === 'hasil_pengecekkan' ? 'K' : editDialogField === 'flag_input_fasih' ? 'L' : editDialogField === 'nama_pml' ? 'M' : editDialogField === 'nama_ppl' ? 'N' : undefined;
    if (!col) return;
    setEditSaving(true);
    // optimistic update
    setNgibarOverrides((prev) => ({ ...(prev || {}), [Number(editDialogRow)]: { ...(prev?.[Number(editDialogRow)] || {}), [editDialogField]: editDialogValue } }));
    try {
      await updateNgibarCell(Number(editDialogRow), col, editDialogValue);
      setEditDialogOpen(false);
    } catch (err) {
      // rollback
      setNgibarOverrides((prev) => {
        const copy = { ...(prev || {}) };
        if (copy[Number(editDialogRow)]) {
          const { [editDialogField]: _removed, ...rest } = copy[Number(editDialogRow)];
          copy[Number(editDialogRow)] = rest;
        }
        return copy;
      });
    } finally {
      setEditSaving(false);
    }
  };

  const formatIndoNow = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}.${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const toggleFlag = async (row: any) => {
    if (!row || row.__rowNumber == null) return;
    const current = String(row.flag_input_fasih || "").trim();
    if (current) {
      // unflag -> write blank
      setNgibarOverrides((prev) => ({ ...(prev || {}), [row.__rowNumber]: { ...(prev?.[row.__rowNumber] || {}), flag_input_fasih: "" } }));
      await updateNgibarCell(Number(row.__rowNumber), "L", "");
    } else {
      const val = `Sudah - ${formatIndoNow()}`;
      setNgibarOverrides((prev) => ({ ...(prev || {}), [row.__rowNumber]: { ...(prev?.[row.__rowNumber] || {}), flag_input_fasih: val } }));
      await updateNgibarCell(Number(row.__rowNumber), "L", val);
    }
  };

  const normalizeWa = (raw: string) => {
    if (!raw) return "";
    const digits = String(raw).replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) return "62" + digits.slice(1);
    return digits;
  };

  const updateNgibarCell = async (rowNumber: number | undefined, columnLetter: string, value: string) => {
    if (rowNumber == null) return;
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: NGIBAR_SPREADSHEET_ID,
          operation: "update",
          range: `${NGIBAR_SHEET}!${columnLetter}${rowNumber}`,
          values: [[value]],
        },
      });
      if (error) throw error;
      toast({ title: "Sukses", description: "Perubahan tersimpan." });
      const field = columnLetterToField(columnLetter);
      if (field) {
        setNgibarOverrides((prev) => {
          const copy = { ...(prev || {}) };
          const rowKey = Number(rowNumber);
          copy[rowKey] = { ...(copy[rowKey] || {}), [field]: value };
          return copy;
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Gagal", description: err?.message || "Gagal menyimpan ke sheet.", variant: "destructive" });
    }
  };

  const ngibarRows = useMemo(() => {
    return (ngibarData || []).map((r: any) => {
      const row: any = {
        __rowNumber: r.__rowNumber,
        timestamp: getSheetCellText(r, 0),
        nama_lengkap: getSheetCellText(r, 1),
        nomor_wa: getSheetCellText(r, 2),
        email: getSheetCellText(r, 3),
        nama_satuan: getSheetCellText(r, 4),
        upload_link: getSheetCellText(r, 5),
        kecamatan: getSheetCellText(r, 6),
        alamat: getSheetCellText(r, 7),
        desa: getSheetCellText(r, 8),
        jenis_satuan: getSheetCellText(r, 9),
        hasil_pengecekkan: getSheetCellText(r, 10),
        flag_input_fasih: getSheetCellText(r, 11),
        nama_pml: getSheetCellText(r, 12),
        nama_ppl: getSheetCellText(r, 13),
      };
      const overrides = ngibarOverrides?.[row.__rowNumber];
      if (overrides) {
        Object.keys(overrides).forEach((k) => {
          row[k] = overrides[k];
        });
      }
      return row;
    });
  }, [ngibarData, ngibarOverrides]);

  const ngibarFilteredSorted = useMemo(() => {
    const q = String(ngibarSearch || "").trim().toLowerCase();
    let rows = ngibarRows.slice();
    if (q) {
      rows = rows.filter((r) => {
        return (
          String(r.nama_satuan || "").toLowerCase().includes(q) ||
          String(r.kecamatan || "").toLowerCase().includes(q) ||
          String(r.desa || "").toLowerCase().includes(q) ||
          String(r.jenis_satuan || "").toLowerCase().includes(q)
        );
      });
    }
    if (ngibarJenisFilter) {
      rows = rows.filter((r) => String(r.jenis_satuan || "").toLowerCase() === String(ngibarJenisFilter).toLowerCase());
    }
    if (ngibarSortField) {
      rows.sort((a: any, b: any) => {
        const va = String(a[ngibarSortField] ?? "").toLowerCase();
        const vb = String(b[ngibarSortField] ?? "").toLowerCase();
        if (va < vb) return ngibarSortOrder === "asc" ? -1 : 1;
        if (va > vb) return ngibarSortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [ngibarRows, ngibarSearch, ngibarSortField, ngibarSortOrder, ngibarJenisFilter]);

  const ngibarJenisOptions = useMemo(() => {
    const s = new Set<string>();
    (ngibarRows || []).forEach((r: any) => { if (r?.jenis_satuan) s.add(String(r.jenis_satuan)); });
    return Array.from(s).filter(Boolean);
  }, [ngibarRows]);

  const ngibarTotalPages = Math.max(1, Math.ceil((ngibarFilteredSorted || []).length / ngibarItemsPerPage));
  const ngibarTotalCount = ngibarFilteredSorted.length;
  const ngibarFlaggedCount = ngibarFilteredSorted.filter((row: any) => String(row.flag_input_fasih || "").trim()).length;
  const ngibarVerifiedCount = ngibarFilteredSorted.filter((row: any) => String(row.hasil_pengecekkan || "").trim()).length;
  const ngibarLinkCount = ngibarFilteredSorted.filter((row: any) => String(row.upload_link || "").trim()).length;

  const ngibarFlaggedPercent = ngibarTotalCount > 0 ? (ngibarFlaggedCount / ngibarTotalCount) * 100 : 0;
  const ngibarVerifiedPercent = ngibarTotalCount > 0 ? (ngibarVerifiedCount / ngibarTotalCount) * 100 : 0;
  const ngibarLinkPercent = ngibarTotalCount > 0 ? (ngibarLinkCount / ngibarTotalCount) * 100 : 0;

  const ngibarJenisSummary = useMemo(() => {
    const summary = new Map<string, { count: number; percent: number }>();
    ngibarFilteredSorted.forEach((row: any) => {
      const jenis = String(row.jenis_satuan || "-");
      const existing = summary.get(jenis) || { count: 0, percent: 0 };
      existing.count += 1;
      summary.set(jenis, existing);
    });
    return Array.from(summary.entries()).map(([jenis, data]) => ({
      jenis,
      count: data.count,
      percent: ngibarTotalCount > 0 ? (data.count / ngibarTotalCount) * 100 : 0,
    })).sort((a, b) => b.count - a.count);
  }, [ngibarFilteredSorted, ngibarTotalCount]);

  const pplRows = useMemo<PPLRow[]>(() => {
    const progressByKey = new Map<string, Array<{
      address: string;
      prelistAwal: string;
      respondenDidata: string;
      persentaseDidata: string;
      draft: string;
      persentaseDraft: string;
    }>>();

    (progresData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 0));
      if (!key) return;
      const existing = progressByKey.get(key) || [];
      existing.push({
        address: getSheetCellText(row, 1),
        prelistAwal: getSheetCellText(row, 2),
        respondenDidata: getSheetCellText(row, 3),
        persentaseDidata: getSheetCellText(row, 4),
        draft: getSheetCellText(row, 5),
        persentaseDraft: getSheetCellText(row, 6),
      });
      progressByKey.set(key, existing);
    });

    const pplMap = new Map<string, { nama_ppl: string; kecamatan: string; keys: Set<string> }>();

    (stackingData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 3));
      if (!key) return;
      const namaPpl = toProperCase(getSheetCellText(row, 26));
      const kecamatan = toProperCase(getSheetCellText(row, 12));
      if (!namaPpl || !kecamatan) return;

      const mapKey = `${namaPpl}||${kecamatan}`;
      const existing = pplMap.get(mapKey);
      if (!existing) {
        pplMap.set(mapKey, {
          nama_ppl: namaPpl,
          kecamatan,
          keys: new Set([key]),
        });
      } else {
        existing.keys.add(key);
      }
    });

    return Array.from(pplMap.values()).map((ppl, index) => {
      const keys = Array.from(ppl.keys).sort();
      const details: PPLDetail[] = keys.flatMap((key) =>
        (progressByKey.get(key) || []).map((progressRow) => {
          const prelist = parseNumericValue(progressRow.prelistAwal || "0");
          const responden = parseNumericValue(progressRow.respondenDidata || "0");
          const draft = parseNumericValue(progressRow.draft || "0");
          const pctResponden = prelist > 0 ? ((responden / prelist) * 100).toFixed(2) : "0.00";
          const pctDraft = prelist > 0 ? ((draft / prelist) * 100).toFixed(2) : "0.00";

          return {
            matchingKey: key,
            address: toProperCase(progressRow.address || "-"),
            prelist_awal: progressRow.prelistAwal || "0",
            responden_didata: progressRow.respondenDidata || "0",
            persentase_responden_didata: pctResponden,
            draft: progressRow.draft || "0",
            persentase_draft: pctDraft,
          };
        })
      );
      const prelistSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.prelist_awal), 0);
      const respondenSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.responden_didata), 0);
      const draftSum = details.reduce((sum, detail) => sum + parseNumericValue(detail.draft), 0);
      const pctResponden = prelistSum > 0 ? ((respondenSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctDraft = prelistSum > 0 ? ((draftSum / prelistSum) * 100).toFixed(2) : "0.00";
      const kecamatanText = ppl.kecamatan || "-";

      return {
        id: `${index}-${ppl.nama_ppl}`,
        nama_ppl: ppl.nama_ppl,
        kecamatan: kecamatanText,
        prelist_awal: prelistSum.toString(),
        responden_didata: respondenSum.toString(),
        persentase_responden_didata: pctResponden,
        draft: draftSum.toString(),
        persentase_draft: pctDraft,
        matchingKeys: keys.join(", "),
        details,
      };
    });
  }, [stackingData, progresData]);

  const pmlRows = useMemo<PMLRow[]>(() => {
    const pmlMap = new Map<string, { nama_pml: string; kecamatan: string; childMap: Map<string, { prelist: number; responden: number; draft: number }> }>();

    (stackingData || []).forEach((row: any) => {
      const key = normalizeSheetKey(getSheetCellText(row, 3));
      if (!key) return;

      const namaPml = toProperCase(getSheetCellText(row, 29));
      const kecamatan = toProperCase(getSheetCellText(row, 12));
      const namaPpl = toProperCase(getSheetCellText(row, 26));
      if (!namaPml || !namaPpl || !kecamatan) return;

      const progressRows = progresData?.filter((progressRow: any) => normalizeSheetKey(getSheetCellText(progressRow, 0)) === key) || [];
      const prelist = progressRows.reduce((sum: number, progressRow: any) => sum + parseNumericValue(getSheetCellText(progressRow, 2)), 0);
      const responden = progressRows.reduce((sum: number, progressRow: any) => sum + parseNumericValue(getSheetCellText(progressRow, 3)), 0);
      const draft = progressRows.reduce((sum: number, progressRow: any) => sum + parseNumericValue(getSheetCellText(progressRow, 5)), 0);

      const mapKey = namaPml;
      const existing = pmlMap.get(mapKey);
      if (!existing) {
        const childMap = new Map<string, { prelist: number; responden: number; draft: number }>();
        childMap.set(namaPpl, { prelist, responden, draft });
        pmlMap.set(mapKey, {
          nama_pml: namaPml,
          kecamatan,
          childMap,
        });
      } else {
        const childEntry = existing.childMap.get(namaPpl);
        if (!childEntry) {
          existing.childMap.set(namaPpl, { prelist, responden, draft });
        } else {
          childEntry.prelist += prelist;
          childEntry.responden += responden;
          childEntry.draft += draft;
        }
      }
    });

    return Array.from(pmlMap.values()).map((pml, index) => {
      const childArray = Array.from(pml.childMap.entries()).map(([namaPpl, values]) => {
        const pctResponden = values.prelist > 0 ? ((values.responden / values.prelist) * 100).toFixed(2) : "0.00";
        const pctDraft = values.prelist > 0 ? ((values.draft / values.prelist) * 100).toFixed(2) : "0.00";
        return {
          nama_ppl: namaPpl,
          prelist_awal: values.prelist.toString(),
          responden_didata: values.responden.toString(),
          persentase_responden_didata: pctResponden,
          draft: values.draft.toString(),
          persentase_draft: pctDraft,
        };
      });

      const prelistSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.prelist_awal), 0);
      const respondenSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.responden_didata), 0);
      const draftSum = childArray.reduce((sum, child) => sum + parseNumericValue(child.draft), 0);
      const pctResponden = prelistSum > 0 ? ((respondenSum / prelistSum) * 100).toFixed(2) : "0.00";
      const pctDraft = prelistSum > 0 ? ((draftSum / prelistSum) * 100).toFixed(2) : "0.00";

      return {
        id: `${index}-${pml.nama_pml}`,
        nama_pml: pml.nama_pml,
        kecamatan: pml.kecamatan,
        prelist_awal: prelistSum.toString(),
        responden_didata: respondenSum.toString(),
        persentase_responden_didata: pctResponden,
        draft: draftSum.toString(),
        persentase_draft: pctDraft,
        children: childArray,
      };
    });
  }, [stackingData, progresData]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let rows = pplRows;
    if (normalizedSearch) {
      rows = rows.filter((row) =>
        row.nama_ppl.toLowerCase().includes(normalizedSearch) ||
        row.kecamatan.toLowerCase().includes(normalizedSearch) ||
        row.matchingKeys.toLowerCase().includes(normalizedSearch)
      );
    }

    const compareValue = (a: PPLRow, b: PPLRow) => {
      const getValue = (row: PPLRow) => {
        switch (sortBy) {
          case "nama_ppl":
          case "kecamatan":
          case "matchingKeys":
            return String(row[sortBy]).toLowerCase();
          case "prelist_awal":
          case "responden_didata":
          case "draft":
            return parseNumericValue(row[sortBy]);
          case "persentase_responden_didata":
          case "persentase_draft":
            return Number(String(row[sortBy]).replace(/[^0-9.-]/g, "")) || 0;
          default:
            return String(row[sortBy]).toLowerCase();
        }
      };

      const valueA = getValue(a);
      const valueB = getValue(b);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      return sortOrder === "asc"
        ? String(valueA).localeCompare(String(valueB), "id")
        : String(valueB).localeCompare(String(valueA), "id");
    };

    return [...rows].sort(compareValue);
  }, [pplRows, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredRows, itemsPerPage]);

  const progressHeaderDisplay = progresHeaderData?.[0] ? extractProgressHeader(progresHeaderData[0]) : "";
  const { daysElapsed } = calculateDayProgress();
  const minPercentageTarget = getTargetMinimalPercentage(daysElapsed);

  const overallTotalPrelist = pplRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
  const overallTotalResponden = pplRows.reduce((sum, row) => sum + parseNumericValue(row.responden_didata), 0);
  const averageMajalengka = overallTotalPrelist > 0 ? (overallTotalResponden / overallTotalPrelist) * 100 : 0;

  // PML filtering and sorting
  const filteredPmlRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let rows = pmlRows;
    if (normalizedSearch) {
      rows = rows.filter((row) =>
        row.nama_pml.toLowerCase().includes(normalizedSearch) ||
        row.kecamatan.toLowerCase().includes(normalizedSearch)
      );
    }

    const compareValue = (a: PMLRow, b: PMLRow) => {
      const getValue = (row: PMLRow) => {
        switch (pmlSortBy) {
          case "nama_pml":
          case "kecamatan":
            return String(row[pmlSortBy]).toLowerCase();
          case "prelist_awal":
          case "responden_didata":
          case "draft":
            return parseNumericValue(row[pmlSortBy]);
          case "persentase_responden_didata":
          case "persentase_draft":
            return parsePercentage(row[pmlSortBy]);
          default:
            return String(row[pmlSortBy]).toLowerCase();
        }
      };

      const valueA = getValue(a);
      const valueB = getValue(b);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return pmlSortOrder === "asc" ? valueA - valueB : valueB - valueA;
      }

      return pmlSortOrder === "asc"
        ? String(valueA).localeCompare(String(valueB), "id")
        : String(valueB).localeCompare(String(valueA), "id");
    };

    return [...rows].sort(compareValue);
  }, [pmlRows, searchTerm, pmlSortBy, pmlSortOrder]);

  const pmlTotalPages = Math.max(1, Math.ceil(filteredPmlRows.length / pmlItemsPerPage));
  const pmlPaginatedRows = useMemo(() => {
    const startIndex = (pmlCurrentPage - 1) * pmlItemsPerPage;
    return filteredPmlRows.slice(startIndex, startIndex + pmlItemsPerPage);
  }, [filteredPmlRows, pmlCurrentPage, pmlItemsPerPage]);

  useEffect(() => {
    setPmlCurrentPage(1);
  }, [filteredPmlRows, pmlItemsPerPage]);

  // Dashboard stats from PML data
  const pmlStats = useMemo(() => {
    if (pmlRows.length === 0) {
      return {
        totalPml: 0,
        totalPrelist: 0,
        totalResponden: 0,
        averageResponden: 0,
        topPml: { nama_pml: "-", value: 0 },
        lowestPml: { nama_pml: "-", value: 0 },
      };
    }

    const totalPrelist = pmlRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
    const totalResponden = pmlRows.reduce((sum, row) => sum + parseNumericValue(row.responden_didata), 0);
    const averageResponden = totalPrelist > 0 ? (totalResponden / totalPrelist) * 100 : 0;

    const topPml = pmlRows.reduce((max, row) => {
      const pctResponden = parsePercentage(row.persentase_responden_didata);
      const maxPct = parsePercentage(max.persentase_responden_didata);
      return pctResponden > maxPct ? row : max;
    });

    const lowestPml = pmlRows.reduce((min, row) => {
      const pctResponden = parsePercentage(row.persentase_responden_didata);
      const minPct = parsePercentage(min.persentase_responden_didata);
      return pctResponden < minPct ? row : min;
    });

    return {
      totalPml: pmlRows.length,
      totalPrelist,
      totalResponden,
      averageResponden,
      topPml: { nama_pml: topPml.nama_pml, value: parsePercentage(topPml.persentase_responden_didata) },
      lowestPml: { nama_pml: lowestPml.nama_pml, value: parsePercentage(lowestPml.persentase_responden_didata) },
    };
  }, [pmlRows]);

  // Kecamatan data for chart
  const kecamatanStats = useMemo(() => {
    const kecamatanMap = new Map<string, { prelist: number; responden: number }>();

    pmlRows.forEach((row) => {
      const kecamatan = row.kecamatan || "Unknown";
      const existing = kecamatanMap.get(kecamatan) || { prelist: 0, responden: 0 };
      existing.prelist += parseNumericValue(row.prelist_awal);
      existing.responden += parseNumericValue(row.responden_didata);
      kecamatanMap.set(kecamatan, existing);
    });

    return Array.from(kecamatanMap.entries())
      .map(([kecamatan, data]) => ({
        kecamatan,
        prelistAwal: data.prelist,
        respondenDidata: data.responden,
        persentase: data.prelist > 0 ? parseFloat(((data.responden / data.prelist) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.persentase - a.persentase);
  }, [pmlRows]);

  // Global edit dialog (rendered outside TabsContent so it is available on all tabs)
  // Uses same state variables: editDialogOpen, editDialogField, editDialogValue, editSaving
  const GlobalEditDialog = (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editDialogField === 'hasil_pengecekkan' ? 'Hasil Pengecekkan' : editDialogField === 'flag_input_fasih' ? 'Flag Input Fasih' : editDialogField === 'nama_pml' ? 'Nama PML' : editDialogField === 'nama_ppl' ? 'Nama PPL' : 'Edit'}</DialogTitle>
          <DialogDescription>Rekam perubahan langsung ke Sheet</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <Input value={editDialogValue} onChange={(e) => setEditDialogValue(e.target.value)} className="w-full" />
        </div>
        <DialogFooter>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded bg-slate-100" onClick={() => setEditDialogOpen(false)}>Batal</button>
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={saveEditDialog} disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const loading = stackingLoading || progresLoading || progresHeaderLoading;
  const error = stackingError || progresError || progresHeaderError;
  const avgKecamatanPercentage = kecamatanStats.length > 0
    ? kecamatanStats.reduce((sum, item) => sum + item.persentase, 0) / kecamatanStats.length
    : 0;

  return (
    <div className="space-y-6 py-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Monitoring Lapangan Dash</CardTitle>
              {progressHeaderDisplay && (
                <p className="mt-2 text-sm font-semibold text-red-600">{progressHeaderDisplay}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full h-auto p-1 bg-white border border-slate-200 rounded-lg shadow-sm mb-6 gap-2 overflow-x-auto">
              <TabsTrigger value="dashboard" className="rounded-xl py-2 text-sm font-semibold">Dashboard</TabsTrigger>
              <TabsTrigger value="ppl" className="rounded-xl py-2 text-sm font-semibold">PPL</TabsTrigger>
              <TabsTrigger value="pml" className="rounded-xl py-2 text-sm font-semibold">PML</TabsTrigger>
              <TabsTrigger value="ngibar" className="rounded-xl py-2 text-sm font-semibold">Ngibar Disdik</TabsTrigger>
              <TabsTrigger value="anomali" className="rounded-xl py-2 text-sm font-semibold">Anomali</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {pmlStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Total PML */}
                  <Card className="relative overflow-hidden border border-slate-200/70 shadow-sm bg-gradient-to-br from-slate-50 via-white to-slate-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-slate-700 to-slate-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Total PML</span>
                      </div>
                      <div className="text-3xl font-bold text-slate-900">{pmlStats.totalPml}</div>
                      <div className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{parseNumericValue(pmlStats.totalPrelist).toLocaleString("id-ID")}</span> prelist awal
                      </div>
                    </CardContent>
                  </Card>

                  {/* Total Responden */}
                  <Card className="relative overflow-hidden border border-blue-200/70 shadow-sm bg-gradient-to-br from-blue-50 via-white to-blue-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-600 to-cyan-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                          <Database className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Responden Didata</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-900">{parseNumericValue(pmlStats.totalResponden).toLocaleString("id-ID")}</div>
                      <div className="mt-2 text-sm text-blue-700">
                        <span className="font-semibold">{pmlStats.averageResponden.toFixed(2)}%</span> dari prelist
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top PML */}
                  <Card className="relative overflow-hidden border border-emerald-200/70 shadow-sm bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-600 to-teal-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                          <Trophy className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Top PML</span>
                      </div>
                      <div className="text-base font-bold text-emerald-900 truncate" title={pmlStats.topPml.nama_pml}>{pmlStats.topPml.nama_pml}</div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-emerald-700">{pmlStats.topPml.value.toFixed(2)}</span>
                        <span className="text-sm font-semibold text-emerald-600">%</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lowest PML */}
                  <Card className="relative overflow-hidden border border-rose-200/70 shadow-sm bg-gradient-to-br from-rose-50 via-white to-rose-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-rose-500 to-red-400" />
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Lowest PML</span>
                      </div>
                      <div className="text-base font-bold text-rose-900 truncate" title={pmlStats.lowestPml.nama_pml}>{pmlStats.lowestPml.nama_pml}</div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-rose-700">{pmlStats.lowestPml.value.toFixed(2)}</span>
                        <span className="text-sm font-semibold text-rose-600">%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Progress Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="rounded-2xl px-6 py-4 shadow-lg bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white flex flex-col justify-center">
                      <div className="text-sm uppercase tracking-widest font-semibold text-emerald-100">Hari ke-{daysElapsed}</div>
                      <div className="mt-2 text-2xl font-bold">Target minimal: {minPercentageTarget.toFixed(2)}%</div>
                    </div>
                    <div className="rounded-2xl px-6 py-4 shadow-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white flex flex-col justify-center min-w-[200px]">
                      <div className="text-sm uppercase tracking-widest font-semibold text-slate-300">Rata-rata Kab. Majalengka</div>
                      <div className="mt-2 text-2xl font-bold text-emerald-300">{averageMajalengka.toFixed(2)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Kecamatan Chart */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-slate-50">
                  <CardTitle className="text-base">Persentase Responden per Kecamatan</CardTitle>
                  <CardDescription>Responden Didata / Prelist Awal per Kecamatan (Diurutkan Descending)</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {kecamatanStats.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">Tidak ada data kecamatan</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={660}>
                      <BarChart data={kecamatanStats} margin={{ top: 20, right: 30, left: 0, bottom: 110 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="kecamatan"
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          label={{ value: "Persentase (%)", angle: -90, position: "insideLeft" }}
                          domain={[0, 100]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                          }}
                          formatter={(value: any, name: string) => {
                            if (name === "persentase") {
                              return [value.toFixed(2) + "%", "Persentase Responden"];
                            }
                            return [value.toLocaleString("id-ID"), name === "prelistAwal" ? "Prelist Awal" : "Responden Didata"];
                          }}
                          labelFormatter={(label) => `Kecamatan: ${label}`}
                        />
                        <ReferenceLine
                          y={avgKecamatanPercentage}
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: `Rata-rata: ${avgKecamatanPercentage.toFixed(2)}%`, position: "right", fill: "#8b5cf6", fontSize: 12 }}
                        />
                        <ReferenceLine
                          y={minPercentageTarget}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          label={{ value: `Target minimal hari ke-${daysElapsed}: ${minPercentageTarget.toFixed(2)}%`, position: "right", fill: "#3b82f6", fontSize: 11 }}
                        />
                        <Legend />
                        <Bar
                          dataKey="persentase"
                          name="Persentase Responden"
                          radius={[8, 8, 0, 0]}
                          label={{
                            position: "top",
                            fill: "#1f2937",
                            fontSize: 11,
                            fontWeight: 600,
                            formatter: (value: number) => `${value.toFixed(2)}%`,
                          }}
                        >
                          {kecamatanStats.map((entry, index) => (
                            <Cell key={`cell-${entry.kecamatan}-${index}`} fill={getColorForPercentage(entry.persentase)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ppl" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-lg font-semibold">Data Individu PPL</h2>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    <div className="rounded-2xl px-4 py-2 shadow-lg bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white flex flex-col justify-center items-start">
                      <div className="text-xs uppercase tracking-[0.12em] font-semibold">Hari ke-{daysElapsed}</div>
                      <div className="mt-0.5 text-sm font-bold">Target minimal: {minPercentageTarget.toFixed(2)}%</div>
                    </div>
                    <div className="rounded-2xl px-4 py-2 shadow-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white flex flex-col justify-center items-start min-w-[170px]">
                      <div className="text-xs uppercase tracking-[0.12em] font-semibold text-slate-300">Rata-rata Kab. Majalengka</div>
                      <div className="mt-0.5 text-sm font-bold text-emerald-300">{averageMajalengka.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cari Nama PPL atau Kecamatan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 w-full"
                    />
                  </div>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-slate-600">Memuat data...</span>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12 text-red-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Error: {error}
                      </div>
                    ) : filteredRows.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-slate-500">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Tidak ada data PPL.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                              <TableHead className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                              <TableHead
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("nama_ppl");
                                  setSortOrder(sortBy === "nama_ppl" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Nama PPL
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("kecamatan");
                                  setSortOrder(sortBy === "kecamatan" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Kecamatan
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("prelist_awal");
                                  setSortOrder(sortBy === "prelist_awal" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Prelist Awal
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("responden_didata");
                                  setSortOrder(sortBy === "responden_didata" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Responden Didata
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("persentase_responden_didata");
                                  setSortOrder(sortBy === "persentase_responden_didata" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Responden Didata
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("draft");
                                  setSortOrder(sortBy === "draft" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Draft
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                              <TableHead
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                                onClick={() => {
                                  setSortBy("persentase_draft");
                                  setSortOrder(sortBy === "persentase_draft" ? (sortOrder === "asc" ? "desc" : "asc") : "asc");
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Draft
                                  <ArrowUpDown className="h-4 w-4" />
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedRows.map((row, index) => {
                              const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                              const isExpanded = expandedPPL.has(row.nama_ppl);
                              const respPct = parsePercentage(row.persentase_responden_didata);
                              const draftPct = parsePercentage(row.persentase_draft);
                              return (
                                <React.Fragment key={row.id}>
                                  <TableRow className="hover:bg-slate-50 border-b transition-colors">
                                    <TableCell className="text-center text-slate-600 font-medium w-12">
                                      {rowNumber}
                                    </TableCell>
                                    <TableCell
                                      className="text-slate-700 px-4 py-3 cursor-pointer hover:text-blue-600 flex flex-col gap-1"
                                      onClick={() => {
                                        setExpandedPPL((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(row.nama_ppl)) next.delete(row.nama_ppl);
                                          else next.add(row.nama_ppl);
                                          return next;
                                        });
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 inline flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 inline flex-shrink-0" />
                                        )}
                                        <span>{row.nama_ppl}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-slate-900 px-4 py-3">{row.kecamatan}</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-900 px-4 py-3">{parseNumericValue(row.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.responden_didata).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold px-4 py-3" style={{ color: getColorForPercentage(respPct) }}>
                                      {row.persentase_responden_didata}%
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(row.draft).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600 px-4 py-3">
                                      {row.persentase_draft}%
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && row.details.map((detail, detailIndex) => (
                                    <TableRow key={`${row.id}-detail-${detailIndex}`} className="bg-slate-50 border-b hover:bg-slate-100 transition-colors">
                                      <TableCell className="px-4 py-2" />
                                      <TableCell className="text-sm text-slate-700 px-4 py-2 italic pl-8">{detail.matchingKey}</TableCell>
                                      <TableCell className="text-sm text-slate-600 px-4 py-2">{detail.address}</TableCell>
                                      <TableCell className="text-right font-semibold text-blue-900 px-4 py-2">{parseNumericValue(detail.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.responden_didata).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2" style={{ color: getColorForPercentage(parsePercentage(detail.persentase_responden_didata)) }}>
                                        {detail.persentase_responden_didata}%
                                      </TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2">{parseNumericValue(detail.draft).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2" style={{ color: getColorForPercentage(parsePercentage(detail.persentase_draft)) }}>
                                        {detail.persentase_draft}%
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                            {/* Total Row */}
                            {(() => {
                              const totalPrelist = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
                              const totalResponden = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.responden_didata), 0);
                              const totalDraft = filteredRows.reduce((sum, row) => sum + parseNumericValue(row.draft), 0);
                              const totalPctResponden = totalPrelist > 0 ? ((totalResponden / totalPrelist) * 100).toFixed(2) : "0.00";
                              const totalPctDraft = totalPrelist > 0 ? ((totalDraft / totalPrelist) * 100).toFixed(2) : "0.00";
                              return (
                                <TableRow className="bg-emerald-50 border-b font-semibold">
                                  <TableCell className="text-center text-slate-700 w-12 px-4 py-3" />
                                  <TableCell className="text-slate-900 px-4 py-3">TOTAL</TableCell>
                                  <TableCell className="text-slate-900 px-4 py-3" />
                                  <TableCell className="text-right text-blue-900 px-4 py-3">{totalPrelist.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalResponden.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right px-4 py-3" style={{ color: getColorForPercentage(parsePercentage(totalPctResponden)) }}>
                                    {totalPctResponden}%
                                  </TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalDraft.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right text-blue-600 px-4 py-3">{totalPctDraft}%</TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span>Per halaman:</span>
                            <select
                              value={itemsPerPage}
                              onChange={(e) => setItemsPerPage(Number(e.target.value))}
                              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                            >
                              {[10, 20, 50, 100].map((size) => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </select>
                            <span>Hal {currentPage} dari {totalPages}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Sebelumnya
                            </button>
                            <button
                              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Berikutnya
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="ngibar" className="space-y-6 mt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Ngibar Disdik Kab. Majalengka</h3>
                  <p className="text-sm text-slate-500">Tabel ringkas dan resume progres</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => { setNgibarJenisFilter(null); setNgibarPage(1); }} className={`px-2 py-1 text-sm rounded ${ngibarJenisFilter ? 'bg-slate-100' : 'bg-slate-800 text-white'}`}>Semua</button>
                    {ngibarJenisOptions.map((opt) => (
                      <button key={opt} onClick={() => { setNgibarJenisFilter(opt); setNgibarPage(1); }} className={`px-2 py-1 text-sm rounded ${ngibarJenisFilter === opt ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div className="w-full md:w-80">
                  <Input size={"sm" as any} placeholder="Cari Nama Satuan / Kecamatan / Desa / Jenis..." value={ngibarSearch} onChange={(e) => { setNgibarSearch(e.target.value); }} />
                </div>
              </div>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead onClick={() => { setNgibarSortField('nama_satuan'); setNgibarSortOrder(ngibarSortField === 'nama_satuan' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>Nama Satuan Pendidikan</TableHead>
                          <TableHead onClick={() => { setNgibarSortField('jenis_satuan'); setNgibarSortOrder(ngibarSortField === 'jenis_satuan' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>Jenis Satuan Pendidikan</TableHead>
                          <TableHead onClick={() => { setNgibarSortField('kecamatan'); setNgibarSortOrder(ngibarSortField === 'kecamatan' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>Kecamatan</TableHead>
                          <TableHead onClick={() => { setNgibarSortField('desa'); setNgibarSortOrder(ngibarSortField === 'desa' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>Desa/Kelurahan</TableHead>
                          <TableHead onClick={() => { setNgibarSortField('nama_lengkap'); setNgibarSortOrder(ngibarSortField === 'nama_lengkap' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>Nama Lengkap</TableHead>
                          <TableHead>Nomor Telepon (WA)</TableHead>
                          <TableHead onClick={() => { setNgibarSortField('email'); setNgibarSortOrder(ngibarSortField === 'email' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>E-mail</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead>Hasil Pengecekkan</TableHead>
                          <TableHead>Flag Input Fasih</TableHead>
                          <TableHead onClick={() => { setNgibarSortField('nama_pml'); setNgibarSortOrder(ngibarSortField === 'nama_pml' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>Nama PML</TableHead>
                          <TableHead onClick={() => { setNgibarSortField('nama_ppl'); setNgibarSortOrder(ngibarSortField === 'nama_ppl' && ngibarSortOrder === 'asc' ? 'desc' : 'asc'); }}>Nama PPL</TableHead>
                          
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ngibarFilteredSorted.slice((ngibarPage - 1) * ngibarItemsPerPage, ngibarPage * ngibarItemsPerPage).map((row, idx) => (
                          <TableRow key={row?.__rowNumber ?? idx}>
                            <TableCell className="max-w-xs truncate">{row?.nama_satuan ?? '-'}</TableCell>
                            <TableCell>{row?.jenis_satuan ?? '-'}</TableCell>
                            <TableCell>{row?.kecamatan ?? '-'}</TableCell>
                            <TableCell>{row?.desa ?? '-'}</TableCell>
                            <TableCell>{row?.nama_lengkap ?? '-'}</TableCell>
                            <TableCell>
                              {row?.nomor_wa ? (
                                <div className="flex items-center gap-2">
                                  <button type="button" title="Chat WA" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const n = normalizeWa(row.nomor_wa); if (n) window.open(`https://wa.me/${n}`, '_blank'); }} className="p-1 rounded bg-slate-100">
                                    <Phone className="w-4 h-4" />
                                  </button>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button type="button" title="Tampilkan nomor" className="p-1 rounded bg-slate-100">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="truncate">{row.nomor_wa}</div>
                                        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(String(row.nomor_wa)); toast({ title: 'Disalin' }); } catch {}}} className="p-1 rounded bg-slate-100">
                                          <Copy className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ) : ('-')}
                            </TableCell>
                            <TableCell>
                              {row?.email ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button title="Tampilkan email" className="p-1 rounded bg-slate-100">
                                      <Mail className="w-4 h-4" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent>
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="truncate">{row.email}</div>
                                      <button onClick={async () => { try { await navigator.clipboard.writeText(String(row.email)); toast({ title: 'Disalin' }); } catch {}}} className="p-1 rounded bg-slate-100">
                                        <Copy className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : ('-')}
                            </TableCell>
                            <TableCell>
                              {row?.upload_link ? (
                                <a href={row.upload_link} target="_blank" rel="noreferrer"><Link className="w-4 h-4" /></a>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-xs">{row?.hasil_pengecekkan || '-'}</span>
                                <button type="button" title={row?.hasil_pengecekkan ? 'Edit Hasil Pengecekkan' : 'Tambah Hasil Pengecekkan'} onClick={() => {
                                  console.debug('hasil_pengecekkan button clicked', { rowNumber: row?.__rowNumber, value: row?.hasil_pengecekkan });
                                  openEditDialog('hasil_pengecekkan', row?.__rowNumber, row?.hasil_pengecekkan ?? '');
                                }} className={`p-1 rounded ${String(row?.hasil_pengecekkan || '').trim() ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <button type="button" title={row?.flag_input_fasih ? 'Unflag' : 'Flag as Sudah'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFlag(row); }} className={`p-1 rounded ${String(row?.flag_input_fasih || '').trim() ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>
                                <FlagIcon className="w-4 h-4" />
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate max-w-[180px]">{row?.nama_pml ?? '-'}</span>
                                <button type="button" title="Edit Nama PML" onClick={() => {
                                  console.debug('nama_pml button clicked', { rowNumber: row?.__rowNumber, value: row?.nama_pml });
                                  openEditDialog('nama_pml', row?.__rowNumber, row?.nama_pml ?? '');
                                }} className="p-1 rounded bg-slate-100">
                                  <UserIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate max-w-[180px]">{row?.nama_ppl ?? '-'}</span>
                                <button type="button" title="Edit Nama PPL" onClick={() => {
                                  console.debug('nama_ppl button clicked', { rowNumber: row?.__rowNumber, value: row?.nama_ppl });
                                  openEditDialog('nama_ppl', row?.__rowNumber, row?.nama_ppl ?? '');
                                }} className="p-1 rounded bg-slate-100">
                                  <UserIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <span>Per halaman:</span>
                        <select
                          value={ngibarItemsPerPage}
                          onChange={(e) => { setNgibarItemsPerPage(Number(e.target.value)); setNgibarPage(1); }}
                          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                        >
                          {[10, 20, 50, 100].map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                        <span>Hal {ngibarPage} dari {ngibarTotalPages}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNgibarPage(1)}
                          disabled={ngibarPage === 1}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                        >
                          Awal
                        </button>
                        <button
                          onClick={() => setNgibarPage((prev) => Math.max(1, prev - 1))}
                          disabled={ngibarPage === 1}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                        >
                          Sebelumnya
                        </button>
                        <button
                          onClick={() => setNgibarPage((prev) => Math.min(ngibarTotalPages, prev + 1))}
                          disabled={ngibarPage === ngibarTotalPages}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                        >
                          Berikutnya
                        </button>
                        <button
                          onClick={() => setNgibarPage(ngibarTotalPages)}
                          disabled={ngibarPage === ngibarTotalPages}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                        >
                          Akhir
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 mt-6">
                <Card className="h-full min-h-[180px] border-0 shadow-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
                  <CardContent className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Total Baris Filter</div>
                      <div className="mt-4 text-3xl font-bold text-white">{ngibarTotalCount.toLocaleString('id-ID')}</div>
                      <div className="mt-2 text-sm text-slate-300">Jumlah baris di tabel berdasarkan filter saat ini.</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="h-full min-h-[180px] border-0 shadow-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
                  <CardContent className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Flag Input Fasih</div>
                      <div className="mt-4 text-3xl font-bold text-white">{ngibarFlaggedCount.toLocaleString('id-ID')}</div>
                      <div className="mt-2 text-sm text-slate-300">{ngibarFlaggedPercent.toFixed(1)}% sudah diberi flag.</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="h-full min-h-[180px] border-0 shadow-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
                  <CardContent className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Hasil Pengecekkan Lengkap</div>
                      <div className="mt-4 text-3xl font-bold text-white">{ngibarVerifiedCount.toLocaleString('id-ID')}</div>
                      <div className="mt-2 text-sm text-slate-300">{ngibarVerifiedPercent.toFixed(1)}% sudah berisi hasil pengecekkan.</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="h-full min-h-[180px] border-0 shadow-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
                  <CardContent className="flex h-full flex-col justify-between p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">Distribusi Jenis Satuan</div>
                      <div className="mt-3 space-y-2">
                        {ngibarJenisSummary.slice(0, 4).map((item) => (
                          <div key={item.jenis} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-slate-100">{item.jenis}</span>
                            <span className="text-right text-slate-300">{item.count.toLocaleString('id-ID')} · {item.percent.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {ngibarJenisSummary.length > 4 && (
                      <div className="mt-3 text-xs text-slate-400">Menampilkan 4 jenis teratas dari {ngibarJenisSummary.length} jenis.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="anomali" className="space-y-6 mt-6">
              <React.Suspense fallback={<div className="py-12 text-center text-slate-500">Memuat Anomali...</div>}>
                <MonitoringLapanganAnomaliTab
                  anomaliUsahaData={anomaliUsahaData || []}
                  anomaliUsahaLoading={anomaliUsahaLoading}
                  anomaliKeluargaData={anomaliKeluargaData || []}
                  anomaliKeluargaLoading={anomaliKeluargaLoading}
                  anomaliUsahaInfo={anomaliUsahaInfoData?.[0] || "-"}
                  anomaliKeluargaInfo={anomaliKeluargaInfoData?.[0] || "-"}
                  isLoggedIn={isLoggedIn}
                  user={user}
                />
              </React.Suspense>
            </TabsContent>
            <TabsContent value="pml" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-lg font-semibold">Data PML</h2>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    <div className="rounded-2xl px-4 py-2 shadow-lg bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 text-white flex flex-col justify-center items-start">
                      <div className="text-xs uppercase tracking-[0.12em] font-semibold">Hari ke-{daysElapsed}</div>
                      <div className="mt-0.5 text-sm font-bold">Target minimal: {minPercentageTarget.toFixed(2)}%</div>
                    </div>
                    <div className="rounded-2xl px-4 py-2 shadow-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white flex flex-col justify-center items-start min-w-[170px]">
                      <div className="text-xs uppercase tracking-[0.12em] font-semibold text-slate-300">Rata-rata Kab. Majalengka</div>
                      <div className="mt-0.5 text-sm font-bold text-emerald-300">{averageMajalengka.toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cari PML atau Kecamatan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-10 w-full"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>Per halaman:</span>
                    <select
                      value={pmlItemsPerPage}
                      onChange={(e) => setPmlItemsPerPage(Number(e.target.value))}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                    <span>Hal {pmlCurrentPage} dari {pmlTotalPages}</span>
                  </div>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-slate-600">Memuat data...</span>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center py-12 text-red-600">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Error: {error}
                      </div>
                    ) : filteredPmlRows.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-slate-500">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Tidak ada data PML.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                              <TableHead className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                              <TableHead 
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                                onClick={() => {
                                  if (pmlSortBy === "nama_pml") {
                                    setPmlSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setPmlSortBy("nama_pml");
                                    setPmlSortOrder("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Nama PML
                                  {pmlSortBy === "nama_pml" && (
                                    <ArrowUpDown className="h-4 w-4" style={{ transform: pmlSortOrder === "asc" ? "rotate(0)" : "rotate(180deg)" }} />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                                onClick={() => {
                                  if (pmlSortBy === "kecamatan") {
                                    setPmlSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setPmlSortBy("kecamatan");
                                    setPmlSortOrder("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  Kecamatan
                                  {pmlSortBy === "kecamatan" && (
                                    <ArrowUpDown className="h-4 w-4" style={{ transform: pmlSortOrder === "asc" ? "rotate(0)" : "rotate(180deg)" }} />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                                onClick={() => {
                                  if (pmlSortBy === "prelist_awal") {
                                    setPmlSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setPmlSortBy("prelist_awal");
                                    setPmlSortOrder("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Prelist Awal
                                  {pmlSortBy === "prelist_awal" && (
                                    <ArrowUpDown className="h-4 w-4" style={{ transform: pmlSortOrder === "asc" ? "rotate(0)" : "rotate(180deg)" }} />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                                onClick={() => {
                                  if (pmlSortBy === "responden_didata") {
                                    setPmlSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setPmlSortBy("responden_didata");
                                    setPmlSortOrder("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Responden Didata
                                  {pmlSortBy === "responden_didata" && (
                                    <ArrowUpDown className="h-4 w-4" style={{ transform: pmlSortOrder === "asc" ? "rotate(0)" : "rotate(180deg)" }} />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                                onClick={() => {
                                  if (pmlSortBy === "persentase_responden_didata") {
                                    setPmlSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setPmlSortBy("persentase_responden_didata");
                                    setPmlSortOrder("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Responden Didata
                                  {pmlSortBy === "persentase_responden_didata" && (
                                    <ArrowUpDown className="h-4 w-4" style={{ transform: pmlSortOrder === "asc" ? "rotate(0)" : "rotate(180deg)" }} />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                                onClick={() => {
                                  if (pmlSortBy === "draft") {
                                    setPmlSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setPmlSortBy("draft");
                                    setPmlSortOrder("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  Draft
                                  {pmlSortBy === "draft" && (
                                    <ArrowUpDown className="h-4 w-4" style={{ transform: pmlSortOrder === "asc" ? "rotate(0)" : "rotate(180deg)" }} />
                                  )}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
                                onClick={() => {
                                  if (pmlSortBy === "persentase_draft") {
                                    setPmlSortOrder(pmlSortOrder === "asc" ? "desc" : "asc");
                                  } else {
                                    setPmlSortBy("persentase_draft");
                                    setPmlSortOrder("asc");
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  % Draft
                                  {pmlSortBy === "persentase_draft" && (
                                    <ArrowUpDown className="h-4 w-4" style={{ transform: pmlSortOrder === "asc" ? "rotate(0)" : "rotate(180deg)" }} />
                                  )}
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pmlPaginatedRows.map((pml, index) => {
                              const rowNumber = (pmlCurrentPage - 1) * pmlItemsPerPage + index + 1;
                              const isExpanded = expandedPML.has(pml.id);
                              const respPct = parsePercentage(pml.persentase_responden_didata);
                              return (
                                <React.Fragment key={pml.id}>
                                  <TableRow className="hover:bg-slate-50 border-b transition-colors">
                                    <TableCell className="text-center text-slate-600 font-medium w-12">
                                      {rowNumber}
                                    </TableCell>
                                    <TableCell
                                      className="text-slate-700 px-4 py-3 cursor-pointer hover:text-blue-600 flex items-center gap-2"
                                      onClick={() => {
                                        setExpandedPML((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(pml.id)) next.delete(pml.id);
                                          else next.add(pml.id);
                                          return next;
                                        });
                                      }}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                      )}
                                      <span>{pml.nama_pml}</span>
                                    </TableCell>
                                    <TableCell className="text-slate-900 px-4 py-3">{pml.kecamatan}</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-900 px-4 py-3">{parseNumericValue(pml.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(pml.responden_didata).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold px-4 py-3" style={{ color: getColorForPercentage(respPct) }}>
                                      {pml.persentase_responden_didata}%
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900 px-4 py-3">{parseNumericValue(pml.draft).toLocaleString("id-ID")}</TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600 px-4 py-3">
                                      {pml.persentase_draft}%
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && pml.children.map((child, childIndex) => (
                                    <TableRow key={`${pml.id}-child-${childIndex}`} className="bg-slate-50 border-b hover:bg-slate-100 transition-colors">
                                      <TableCell className="px-4 py-2" />
                                      <TableCell className="text-sm text-slate-700 px-4 py-2 pl-12 font-medium">{child.nama_ppl}</TableCell>
                                      <TableCell className="text-sm text-slate-600 px-4 py-2">-</TableCell>
                                      <TableCell className="text-right font-semibold text-blue-900 px-4 py-2 text-sm">{parseNumericValue(child.prelist_awal).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2 text-sm">{parseNumericValue(child.responden_didata).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold px-4 py-2 text-sm" style={{ color: getColorForPercentage(parsePercentage(child.persentase_responden_didata)) }}>
                                        {child.persentase_responden_didata}%
                                      </TableCell>
                                      <TableCell className="text-right font-semibold text-slate-900 px-4 py-2 text-sm">{parseNumericValue(child.draft).toLocaleString("id-ID")}</TableCell>
                                      <TableCell className="text-right font-semibold text-blue-600 px-4 py-2 text-sm">
                                        {child.persentase_draft}%
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </React.Fragment>
                              );
                            })}
                            {/* Total Row */}
                            {(() => {
                              const totalPrelist = filteredPmlRows.reduce((sum, row) => sum + parseNumericValue(row.prelist_awal), 0);
                              const totalResponden = filteredPmlRows.reduce((sum, row) => sum + parseNumericValue(row.responden_didata), 0);
                              const totalDraft = filteredPmlRows.reduce((sum, row) => sum + parseNumericValue(row.draft), 0);
                              const totalPctResponden = totalPrelist > 0 ? ((totalResponden / totalPrelist) * 100).toFixed(2) : "0.00";
                              const totalPctDraft = totalPrelist > 0 ? ((totalDraft / totalPrelist) * 100).toFixed(2) : "0.00";
                              return (
                                <TableRow className="bg-blue-50 border-b font-semibold">
                                  <TableCell className="text-center text-slate-700 w-12 px-4 py-3" />
                                  <TableCell className="text-slate-900 px-4 py-3">TOTAL</TableCell>
                                  <TableCell className="text-slate-900 px-4 py-3" />
                                  <TableCell className="text-right text-blue-900 px-4 py-3">{totalPrelist.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalResponden.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right px-4 py-3" style={{ color: getColorForPercentage(parsePercentage(totalPctResponden)) }}>
                                    {totalPctResponden}%
                                  </TableCell>
                                  <TableCell className="text-right text-slate-900 px-4 py-3">{totalDraft.toLocaleString("id-ID")}</TableCell>
                                  <TableCell className="text-right text-blue-600 px-4 py-3">{totalPctDraft}%</TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPmlCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={pmlCurrentPage === 1}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Sebelumnya
                            </button>
                            <button
                              onClick={() => setPmlCurrentPage((prev) => Math.min(pmlTotalPages, prev + 1))}
                              disabled={pmlCurrentPage === pmlTotalPages}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                            >
                              Berikutnya
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialogField === 'hasil_pengecekkan' ? 'Hasil Pengecekkan' : editDialogField === 'flag_input_fasih' ? 'Flag Input Fasih' : editDialogField === 'nama_pml' ? 'Nama PML' : editDialogField === 'nama_ppl' ? 'Nama PPL' : 'Edit'}</DialogTitle>
            <DialogDescription>Rekam perubahan langsung ke Sheet</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <Input value={editDialogValue} onChange={(e) => setEditDialogValue(e.target.value)} className="w-full" />
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded bg-slate-100" onClick={() => setEditDialogOpen(false)}>Batal</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={saveEditDialog} disabled={editSaving}>{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
