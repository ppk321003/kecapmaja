import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Search, TrendingUp, Database } from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";

const HARIAN_SPREADSHEET_ID = "1uA5nThGOntZrqfwFo_TNHhP3P7P78BATfc4p4BZQe9U";
const HARIAN_SHEET = "LOG_HARIAN";

const HARIAN_MONTHS: Record<string, string> = {
  januari: "01",
  februari: "02",
  maret: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  agustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  desember: "12",
};

const normalizeHarianDate = (value: unknown): string => {
  const raw = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";

  const indonesian = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (indonesian) {
    const month = HARIAN_MONTHS[indonesian[2].toLowerCase()];
    if (month) return `${indonesian[3]}-${month}-${indonesian[1].padStart(2, "0")}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  const numeric = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  return raw;
};

const normalizeHarianTime = (value: unknown): string => {
  const raw = String(value ?? "").trim().replace(/:/g, ".");
  const match = raw.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}))?/);
  if (!match) return raw;
  return `${match[1].padStart(2, "0")}.${match[2].padStart(2, "0")}.${(match[3] || "00").padStart(2, "0")}`;
};

const parseHarianNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return 0;
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  const parsed = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

interface HarianRow {
  tanggal_rekam: string;
  waktu_rekam: string;
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: number;
  jumlah_assignment: number;
  submit: number;
  draft: number;
  netto: number;
  persentase_progress: string;
  dicatat_oleh: string;
  id: string;
}

interface HarianPerubahan {
  nama_ppl: string;
  kecamatan: string;
  prelist_awal: number;
  jumlah_assignment: number;
  open: number;
  perubahan_didata: number;
  perubahan_draft: number;
  perubahan_netto: number;
  perubahan_total: number;
  didata_awal: number;
  draft_awal: number;
  netto_awal: number;
  didata_akhir: number;
  draft_akhir: number;
  netto_akhir: number;
}

interface HarianTabV2Props {
  onRecordToHarian?: () => void;
  isPpk?: boolean;
  assignmentByPpl?: Record<string, number>;
  prelistByPpl?: Record<string, number>;
}

export default function HarianTabV2({ onRecordToHarian, isPpk = false, assignmentByPpl = {}, prelistByPpl = {} }: HarianTabV2Props) {
  const { data: harianRawData, loading: harianLoading, error: harianError } = useGoogleSheetsData({
    spreadsheetId: HARIAN_SPREADSHEET_ID,
    sheetName: HARIAN_SHEET,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState<string>("");
  const [filterUnder, setFilterUnder] = useState<"" | "under" | "good">("");
  const [sortBy, setSortBy] = useState<"nama_ppl" | "prelist_awal" | "jumlah_assignment" | "open" | "didata_awal" | "didata_akhir" | "perubahan_didata" | "draft_awal" | "draft_akhir" | "perubahan_draft" | "netto_awal" | "netto_akhir" | "perubahan_netto">("perubahan_netto");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [tanggalAwal, setTanggalAwal] = useState<string>("");
  const [tanggalAkhir, setTanggalAkhir] = useState<string>("");
  const [jamAwal, setJamAwal] = useState<string>("");
  const [jamAkhir, setJamAkhir] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Parse raw data from Google Sheets
  const harianRows = useMemo<HarianRow[]>(() => {
    if (!harianRawData || !Array.isArray(harianRawData) || harianRawData.length === 0) return [];

    return harianRawData.map((row: any, idx: number) => {
      // More flexible field name extraction - case insensitive + space/underscore flexible
      const getField = (row: any, ...names: string[]) => {
        // First try exact match
        for (const name of names) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name];
          }
        }
        
        // Then try flexible matching: normalize to lowercase + replace spaces/underscores
        const normalize = (s: string) => s.toLowerCase().replace(/[\s_]/g, '');
        const normalizedNames = names.map(normalize);
        
        for (const [key, value] of Object.entries(row)) {
          if (value !== undefined && value !== null && value !== '') {
            const normalizedKey = normalize(String(key));
            if (normalizedNames.includes(normalizedKey)) {
              console.log(`🔍 Field match: "${key}" matches one of [${names.join(', ')}]`);
              return value;
            }
          }
        }
        
        return undefined;
      };

      const rawRow = Array.isArray(row.__rawRow) ? row.__rawRow : [];
      const assignmentField = getField(row, "jumlah_assignment", "jml_assignment", "Jml_Assignment", "Jml Assignment", "Jumlah Assignment");
      const parsedAssignmentField = parseHarianNumber(assignmentField);
      const rawAssignmentValue = parseHarianNumber(rawRow[5]);
      const assignmentValue = parsedAssignmentField !== 0 || rawAssignmentValue === 0
        ? parsedAssignmentField
        : rawAssignmentValue;

      const result = {
        id: `${idx}`,
        tanggal_rekam: normalizeHarianDate(getField(row, "tanggal_rekam", "Tanggal_Rekam", "Tanggal Rekam")),
        waktu_rekam: normalizeHarianTime(getField(row, "waktu_rekam", "Waktu_Rekam", "Waktu Rekam")),
        nama_ppl: String(getField(row, "nama_ppl", "Nama_PPL", "Nama PPL") || ""),
        kecamatan: String(getField(row, "kecamatan", "Kecamatan") || ""),
        prelist_awal: parseHarianNumber(getField(row, "prelist_awal", "Prelist_Awal", "Prelist Awal")),
        jumlah_assignment: parseHarianNumber(assignmentValue),
        submit: parseHarianNumber(getField(row, "submit", "Submit")),
        draft: parseHarianNumber(getField(row, "draft", "Draft")),
        netto: parseHarianNumber(getField(row, "netto", "Netto")),
        persentase_progress: String(getField(row, "persentase_progress", "Persentase_Progress", "Persentase Progress") || "0%"),
        dicatat_oleh: String(getField(row, "dicatat_oleh", "Dicatat_Oleh", "Dicatat Oleh") || ""),
      };
      
      if (idx === 0) {
        console.log("🔍 First row raw data keys:", Object.keys(row));
        console.log("🔍 First row prelist_awal value:", result.prelist_awal);
      }
      
      return result;
    });
  }, [harianRawData]);

  // Get unique dates
  const uniqueTanggal = useMemo(() => {
    const dates = new Set<string>();
    harianRows.forEach(row => dates.add(row.tanggal_rekam));
    return Array.from(dates).sort();
  }, [harianRows]);

  // Get unique kecamatan
  const uniqueKecamatan = useMemo(() => {
    const kecamatan = new Set<string>();
    harianRows.forEach(row => {
      if (row.kecamatan) kecamatan.add(row.kecamatan);
    });
    return Array.from(kecamatan).sort();
  }, [harianRows]);

  // Get unique times for a specific date
  const getUniqueTimesForDate = (tanggal: string) => {
    const times = new Set<string>();
    harianRows
      .filter(row => row.tanggal_rekam === tanggal)
      .forEach(row => times.add(row.waktu_rekam));
    return Array.from(times).sort();
  };

  // Get unique times for the selected start date
  const uniqueJamAwal = useMemo(() => {
    return tanggalAwal ? getUniqueTimesForDate(tanggalAwal) : [];
  }, [tanggalAwal, harianRows]);

  // Get unique times for the selected end date
  const uniqueJamAkhir = useMemo(() => {
    return tanggalAkhir ? getUniqueTimesForDate(tanggalAkhir) : [];
  }, [tanggalAkhir, harianRows]);

  // Default to the earliest and latest available snapshots.
  React.useEffect(() => {
    if (uniqueTanggal.length > 0 && !tanggalAwal) {
      const dateAwal = uniqueTanggal[0];
      const dateAkhir = uniqueTanggal[uniqueTanggal.length - 1];
      setTanggalAkhir(dateAkhir);
      setTanggalAwal(dateAwal);
    }
  }, [uniqueTanggal, tanggalAwal]);

  // Auto-set jam when tanggal changes
  React.useEffect(() => {
    if (uniqueJamAwal.length > 0 && !jamAwal) {
      setJamAwal(uniqueJamAwal[0]);
    }
  }, [uniqueJamAwal, jamAwal, tanggalAwal, harianRows]);

  React.useEffect(() => {
    if (uniqueJamAkhir.length > 0 && !jamAkhir) {
      setJamAkhir(uniqueJamAkhir[uniqueJamAkhir.length - 1]);
    }
  }, [uniqueJamAkhir, jamAkhir, tanggalAkhir, harianRows]);

  // Calculate perubahan (delta) between two dates+times
  const perubahan = useMemo<HarianPerubahan[]>(() => {
    if (!tanggalAwal || !tanggalAkhir || !jamAwal || !jamAkhir) return [];

    const rowsByPpl = new Map<string, { awal?: HarianRow; akhir?: HarianRow }>();

    // Group rows by PPL for both date+time combinations
    harianRows.forEach(row => {
      // Check if this row matches awal or akhir date+time combination
      const isAwal = row.tanggal_rekam === tanggalAwal && row.waktu_rekam === jamAwal;
      const isAkhir = row.tanggal_rekam === tanggalAkhir && row.waktu_rekam === jamAkhir;
      
      if (isAwal || isAkhir) {
        const key = `${row.nama_ppl}|${row.kecamatan}`;
        if (!rowsByPpl.has(key)) {
          rowsByPpl.set(key, {});
        }
        const entry = rowsByPpl.get(key)!;
        if (isAwal) {
          entry.awal = row;
        }
        if (isAkhir) {
          entry.akhir = row;
        }
      }
    });

    // Calculate delta for each PPL
    return Array.from(rowsByPpl.entries())
      .map(([key, { awal, akhir }]) => {
        const [nama_ppl, kecamatan] = key.split("|");
        
        const pplKey = `${nama_ppl.trim().toLowerCase()}|${kecamatan.trim().toLowerCase()}`;
        const prelistAwal = prelistByPpl[pplKey] ?? awal?.prelist_awal ?? 0;
        const assignmentKey = `${nama_ppl.trim().toLowerCase()}|${kecamatan.trim().toLowerCase()}`;
        const jumlahAssignment = assignmentByPpl[assignmentKey] ?? akhir?.jumlah_assignment ?? awal?.jumlah_assignment ?? 0;
        const didataAwal = awal?.submit || 0;
        const draftAwal = awal?.draft || 0;
        const nettoAwal = awal?.netto || 0;
        
        const didataAkhir = akhir?.submit || 0;
        const draftAkhir = akhir?.draft || 0;
        const nettoAkhir = akhir?.netto || 0;
        const open = jumlahAssignment - draftAkhir - didataAkhir;
        
        const perubahanDidata = didataAkhir - didataAwal;
        const perubahanDraft = draftAkhir - draftAwal;
        const perubahanNetto = nettoAkhir - nettoAwal;
        const perubahanTotal = perubahanDidata + perubahanDraft;
        
        return {
          nama_ppl,
          kecamatan,
          prelist_awal: prelistAwal,
          jumlah_assignment: jumlahAssignment,
          open,
          perubahan_didata: perubahanDidata,
          perubahan_draft: perubahanDraft,
          perubahan_netto: perubahanNetto,
          perubahan_total: perubahanTotal,
          didata_awal: didataAwal,
          draft_awal: draftAwal,
          netto_awal: nettoAwal,
          didata_akhir: didataAkhir,
          draft_akhir: draftAkhir,
          netto_akhir: nettoAkhir,
        };
      });
  }, [harianRows, tanggalAwal, tanggalAkhir, jamAwal, jamAkhir, assignmentByPpl, prelistByPpl]);

  // Filter perubahan
  const filteredPerubahan = useMemo(() => {
    let filtered = perubahan;

    // Filter by nama_ppl (search term)
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.nama_ppl.toLowerCase().includes(normalizedSearch)
      );
    }

    // Filter by kecamatan
    if (filterKecamatan) {
      filtered = filtered.filter(row => row.kecamatan === filterKecamatan);
    }

    if (filterUnder === "under") {
      filtered = filtered.filter(row => row.jumlah_assignment > row.didata_akhir);
    } else if (filterUnder === "good") {
      filtered = filtered.filter(row => row.jumlah_assignment <= row.didata_akhir);
    }

    return filtered;
  }, [perubahan, searchTerm, filterKecamatan, filterUnder]);

  // Sort perubahan
  const sortedPerubahan = useMemo(() => {
    const sorted = [...filteredPerubahan].sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      switch (sortBy) {
        case "nama_ppl":
          aVal = a.nama_ppl;
          bVal = b.nama_ppl;
          return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case "prelist_awal":
          aVal = a.prelist_awal;
          bVal = b.prelist_awal;
          break;
        case "jumlah_assignment":
          aVal = a.jumlah_assignment;
          bVal = b.jumlah_assignment;
          break;
        case "open":
          aVal = a.open;
          bVal = b.open;
          break;
        case "didata_awal":
          aVal = a.didata_awal;
          bVal = b.didata_awal;
          break;
        case "didata_akhir":
          aVal = a.didata_akhir;
          bVal = b.didata_akhir;
          break;
        case "perubahan_didata":
          aVal = a.perubahan_didata;
          bVal = b.perubahan_didata;
          break;
        case "draft_awal":
          aVal = a.draft_awal;
          bVal = b.draft_awal;
          break;
        case "draft_akhir":
          aVal = a.draft_akhir;
          bVal = b.draft_akhir;
          break;
        case "perubahan_draft":
          aVal = a.perubahan_draft;
          bVal = b.perubahan_draft;
          break;
        case "netto_awal":
          aVal = a.netto_awal;
          bVal = b.netto_awal;
          break;
        case "netto_akhir":
          aVal = a.netto_akhir;
          bVal = b.netto_akhir;
          break;
        case "perubahan_netto":
          aVal = a.perubahan_netto;
          bVal = b.perubahan_netto;
          break;
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [filteredPerubahan, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedPerubahan.length / itemsPerPage);
  const paginatedPerubahan = sortedPerubahan.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: "nama_ppl" | "prelist_awal" | "jumlah_assignment" | "open" | "didata_awal" | "didata_akhir" | "perubahan_didata" | "draft_awal" | "draft_akhir" | "perubahan_draft" | "netto_awal" | "netto_akhir" | "perubahan_netto") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? <span className="text-xs">▲</span> : <span className="text-xs">▼</span>;
  };

  // Summary cards
  const summaryStats = useMemo(() => {
    if (paginatedPerubahan.length === 0) {
      return {
        totalPerubahan: 0,
        totalPerubahanDidata: 0,
        totalPerubahanDraft: 0,
        totalPerubahanNetto: 0,
      };
    }

    const all = sortedPerubahan;
    return {
      totalPerubahan: all.length,
      totalPerubahanDidata: all.reduce((sum, row) => sum + row.perubahan_didata, 0),
      totalPerubahanDraft: all.reduce((sum, row) => sum + row.perubahan_draft, 0),
      totalPerubahanNetto: all.reduce((sum, row) => sum + row.perubahan_netto, 0),
    };
  }, [sortedPerubahan, paginatedPerubahan]);

  const summarizePerubahan = (rows: HarianPerubahan[]) => rows.reduce((summary, row) => ({
    prelist_awal: summary.prelist_awal + row.prelist_awal,
    jumlah_assignment: summary.jumlah_assignment + row.jumlah_assignment,
    open: summary.open + row.open,
    didata_awal: summary.didata_awal + row.didata_awal,
    didata_akhir: summary.didata_akhir + row.didata_akhir,
    perubahan_didata: summary.perubahan_didata + row.perubahan_didata,
    draft_awal: summary.draft_awal + row.draft_awal,
    draft_akhir: summary.draft_akhir + row.draft_akhir,
    perubahan_draft: summary.perubahan_draft + row.perubahan_draft,
    netto_awal: summary.netto_awal + row.netto_awal,
    netto_akhir: summary.netto_akhir + row.netto_akhir,
    perubahan_netto: summary.perubahan_netto + row.perubahan_netto,
  }), {
    prelist_awal: 0,
    jumlah_assignment: 0,
    open: 0,
    didata_awal: 0,
    didata_akhir: 0,
    perubahan_didata: 0,
    draft_awal: 0,
    draft_akhir: 0,
    perubahan_draft: 0,
    netto_awal: 0,
    netto_akhir: 0,
    perubahan_netto: 0,
  });

  const filteredSummary = summarizePerubahan(paginatedPerubahan);
  const overallSummary = summarizePerubahan(perubahan);
  const formatChange = (value: number) => `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID")}`;

  if (harianLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Memuat data Harian...</span>
      </div>
    );
  }

  if (harianError) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="h-5 w-5 mr-2" />
        Error: {harianError}
      </div>
    );
  }

  if (harianRows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500">
        <AlertCircle className="h-5 w-5 mr-2" />
        Belum ada data Harian. Klik tombol "Rekam ke Harian" di tab UMKM dan Sosek untuk memulai.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Analisis Perubahan Harian
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Bandingkan data antara dua tanggal untuk melihat perubahan Submit, Draft, dan Netto per PPL
          </p>
        </div>
        {isPpk && onRecordToHarian && (
          <button
            type="button"
            onClick={onRecordToHarian}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
            title="Rekam snapshot harian ke sheet LOG_HARIAN"
          >
            <Database className="h-4 w-4" />
            Rekam ke Harian
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {tanggalAwal && jamAwal && tanggalAkhir && jamAkhir && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-slate-600">Total PPL</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">{summaryStats.totalPerubahan}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-slate-600">Σ Perubahan Didata</div>
              <div className="text-2xl font-bold text-orange-600 mt-2">{summaryStats.totalPerubahanDidata.toLocaleString("id-ID")}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-slate-600">Σ Perubahan Draft</div>
              <div className="text-2xl font-bold text-yellow-600 mt-2">{summaryStats.totalPerubahanDraft.toLocaleString("id-ID")}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-slate-600">Σ Perubahan Netto</div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">{summaryStats.totalPerubahanNetto.toLocaleString("id-ID")}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Range Selector */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-2 text-white">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide">Periode Perbandingan</h3>
            <p className="text-[11px] text-slate-300">Pilih snapshot awal dan akhir untuk melihat perubahan harian</p>
          </div>
          <TrendingUp className="h-5 w-5 text-slate-300" />
        </div>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-2 text-sm font-bold text-blue-900">
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">AWAL</span>
                Snapshot paling awal
              </div>
            {/* Tanggal Awal */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-blue-800">Tanggal Awal</label>
              <select
                value={tanggalAwal}
                onChange={(e) => {
                  setTanggalAwal(e.target.value);
                  setJamAwal(""); // Reset jam when date changes
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-blue-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">-- Pilih Tanggal Awal --</option>
                {uniqueTanggal.map((tanggal) => (
                  <option key={tanggal} value={tanggal}>
                    {tanggal}
                  </option>
                ))}
              </select>
            </div>

            {/* Jam Awal */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-blue-800">Jam Awal</label>
              <select
                value={jamAwal}
                onChange={(e) => {
                  setJamAwal(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!tanggalAwal || uniqueJamAwal.length === 0}
                className="h-9 w-full rounded-lg border border-blue-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Pilih Jam Awal --</option>
                {uniqueJamAwal.map((jam) => (
                  <option key={jam} value={jam}>
                    {jam}
                  </option>
                ))}
              </select>
            </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-2 text-sm font-bold text-amber-900">
                <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">AKHIR</span>
                Snapshot paling akhir
              </div>

            {/* Tanggal Akhir */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-amber-800">Tanggal Akhir</label>
              <select
                value={tanggalAkhir}
                onChange={(e) => {
                  setTanggalAkhir(e.target.value);
                  setJamAkhir(""); // Reset jam when date changes
                  setCurrentPage(1);
                }}
                className="h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="">-- Pilih Tanggal Akhir --</option>
                {uniqueTanggal.map((tanggal) => (
                  <option key={tanggal} value={tanggal}>
                    {tanggal}
                  </option>
                ))}
              </select>
            </div>

            {/* Jam Akhir */}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-amber-800">Jam Akhir</label>
              <select
                value={jamAkhir}
                onChange={(e) => {
                  setJamAkhir(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!tanggalAkhir || uniqueJamAkhir.length === 0}
                className="h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- Pilih Jam Akhir --</option>
                {uniqueJamAkhir.map((jam) => (
                  <option key={jam} value={jam}>
                    {jam}
                  </option>
                ))}
              </select>
            </div>
            </div>
          </div>
          {tanggalAwal && jamAwal && tanggalAkhir && jamAkhir && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
              Membandingkan <strong className="text-blue-700">{tanggalAwal} {jamAwal}</strong> ke <strong className="text-amber-700">{tanggalAkhir} {jamAkhir}</strong> ({filteredPerubahan.length} PPL)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search by Nama PPL */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari Nama PPL..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-10 w-full"
          />
        </div>

        {/* Filter Kecamatan */}
        <select
          value={filterKecamatan}
          onChange={(e) => {
            setFilterKecamatan(e.target.value);
            setCurrentPage(1);
          }}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">-- Semua Kecamatan --</option>
          {uniqueKecamatan.map((kecamatan) => (
            <option key={kecamatan} value={kecamatan}>
              {kecamatan}
            </option>
          ))}
        </select>

        {/* Filter Under */}
        <select
          value={filterUnder}
          onChange={(e) => {
            setFilterUnder(e.target.value as "" | "under" | "good");
            setCurrentPage(1);
          }}
          className="h-10 rounded-lg border border-red-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">-- Semua Status --</option>
          <option value="under">Under (Jml Assignment &gt; Didata Akhir)</option>
          <option value="good">Good (Jml Assignment &le; Didata Akhir)</option>
        </select>
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {!tanggalAwal || !jamAwal || !tanggalAkhir || !jamAkhir ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              Silakan pilih tanggal dan jam awal serta akhir untuk melihat perubahan
            </div>
          ) : filteredPerubahan.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              Tidak ada data perubahan yang sesuai dengan filter
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-center text-slate-700 font-semibold w-12">No</TableHead>
                    <TableHead
                      className="text-slate-700 font-semibold px-4 py-3 cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("nama_ppl")}
                    >
                      <div className="flex items-center gap-1">
                        Nama PPL {getSortIndicator("nama_ppl")}
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold px-4 py-3">Kecamatan</TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-blue-100 cursor-pointer hover:bg-blue-200"
                      onClick={() => handleSort("prelist_awal")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Prelist Awal {getSortIndicator("prelist_awal")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-blue-100 cursor-pointer hover:bg-blue-200"
                      onClick={() => handleSort("jumlah_assignment")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Jml Assignment {getSortIndicator("jumlah_assignment")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-blue-100 cursor-pointer hover:bg-blue-200"
                      onClick={() => handleSort("open")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Open {getSortIndicator("open")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-orange-100 cursor-pointer hover:bg-orange-200"
                      onClick={() => handleSort("didata_awal")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Didata Awal {getSortIndicator("didata_awal")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-orange-100 cursor-pointer hover:bg-orange-200"
                      onClick={() => handleSort("didata_akhir")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Didata Akhir {getSortIndicator("didata_akhir")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs cursor-pointer bg-orange-100 hover:bg-orange-200 whitespace-normal break-words"
                      onClick={() => handleSort("perubahan_didata")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Perubahan Didata {getSortIndicator("perubahan_didata")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-yellow-100 cursor-pointer hover:bg-yellow-200"
                      onClick={() => handleSort("draft_awal")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Draft Awal {getSortIndicator("draft_awal")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-yellow-100 cursor-pointer hover:bg-yellow-200"
                      onClick={() => handleSort("draft_akhir")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Draft Akhir {getSortIndicator("draft_akhir")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs cursor-pointer bg-yellow-100 hover:bg-yellow-200 whitespace-normal break-words"
                      onClick={() => handleSort("perubahan_draft")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Perubahan Draft {getSortIndicator("perubahan_draft")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-emerald-100 cursor-pointer hover:bg-emerald-200"
                      onClick={() => handleSort("netto_awal")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Netto Awal {getSortIndicator("netto_awal")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs bg-emerald-100 cursor-pointer hover:bg-emerald-200"
                      onClick={() => handleSort("netto_akhir")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Netto Akhir {getSortIndicator("netto_akhir")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="text-right text-slate-700 font-semibold px-4 py-3 text-xs cursor-pointer bg-emerald-100 hover:bg-emerald-200 whitespace-normal break-words"
                      onClick={() => handleSort("perubahan_netto")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Perubahan Netto {getSortIndicator("perubahan_netto")}
                      </div>
                    </TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPerubahan.map((row, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const hasProgressWarning = row.jumlah_assignment > row.didata_akhir;
                    return (
                      <TableRow key={`${row.nama_ppl}-${row.kecamatan}`} className={`border-b transition-colors ${hasProgressWarning ? "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500" : "hover:bg-slate-50"}`}>
                        <TableCell className="text-center text-slate-600 font-medium w-12">{rowNumber}</TableCell>
                        <TableCell className={`${hasProgressWarning ? "text-red-800" : "text-slate-700"} px-4 py-3 font-medium`}>{hasProgressWarning && <AlertCircle className="mr-1 inline h-4 w-4 text-red-600" aria-label="Warning: Jml Assignment lebih besar dari Didata Akhir" />}{row.nama_ppl}</TableCell>
                        <TableCell className={`${hasProgressWarning ? "text-red-700" : "text-slate-600"} px-4 py-3`}>{row.kecamatan}</TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-blue-100 font-medium">{row.prelist_awal.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-blue-100 font-medium">{row.jumlah_assignment.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-blue-100 font-medium">{row.open.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-orange-100">{row.didata_awal.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-orange-100">{row.didata_akhir.toLocaleString("id-ID")}</TableCell>
                        <TableCell className={`text-right px-4 py-3 font-semibold bg-orange-100 whitespace-normal break-words ${row.perubahan_didata > 0 ? "text-green-600" : row.perubahan_didata < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {row.perubahan_didata > 0 ? "+" : ""}{row.perubahan_didata.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-yellow-100">{row.draft_awal.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-yellow-100">{row.draft_akhir.toLocaleString("id-ID")}</TableCell>
                        <TableCell className={`text-right px-4 py-3 font-semibold bg-yellow-100 whitespace-normal break-words ${row.perubahan_draft > 0 ? "text-green-600" : row.perubahan_draft < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {row.perubahan_draft > 0 ? "+" : ""}{row.perubahan_draft.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-emerald-100">{row.netto_awal.toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right text-slate-700 px-4 py-3 text-sm bg-emerald-100">{row.netto_akhir.toLocaleString("id-ID")}</TableCell>
                        <TableCell className={`text-right px-4 py-3 font-semibold bg-emerald-100 whitespace-normal break-words ${row.perubahan_netto > 0 ? "text-emerald-600" : row.perubahan_netto < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {row.perubahan_netto > 0 ? "+" : ""}{row.perubahan_netto.toLocaleString("id-ID")}
                        </TableCell>

                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  {[{ label: "Total sesuai filter", summary: filteredSummary }, { label: "Total Keseluruhan", summary: overallSummary }].map(({ label, summary }) => (
                    <TableRow key={label} className="bg-slate-100 font-semibold">
                      <TableCell colSpan={3} className="px-4 py-3 text-slate-900">{label}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.prelist_awal.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.jumlah_assignment.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.open.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.didata_awal.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.didata_akhir.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right whitespace-normal break-words px-4 py-3">{formatChange(summary.perubahan_didata)}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.draft_awal.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.draft_akhir.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right whitespace-normal break-words px-4 py-3">{formatChange(summary.perubahan_draft)}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.netto_awal.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right px-4 py-3">{summary.netto_akhir.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right whitespace-normal break-words px-4 py-3">{formatChange(summary.perubahan_netto)}</TableCell>
                    </TableRow>
                  ))}
                </TableFooter>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>Per halaman:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
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
  );
}
