import React, { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MonitoringLastUpdated } from "@/components/MonitoringLastUpdated";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Props {
  spreadsheetId: string;
}

const normalizeColumnKey = (key: string): string =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getColumnValue = (obj: any, primaryName: string, fallbackNames: string[] = [], defaultValue: any = "-") => {
  if (!obj || typeof obj !== "object") return defaultValue;
  const normalizedMap: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    normalizedMap[normalizeColumnKey(key)] = obj[key];
  }

  const tryKeys = [primaryName, ...fallbackNames];
  for (const key of tryKeys) {
    const nk = normalizeColumnKey(key);
    if (nk in normalizedMap && normalizedMap[nk] !== "" && normalizedMap[nk] !== undefined && normalizedMap[nk] !== null) return normalizedMap[nk];
  }

  // partial contains fallback
  for (const k of Object.keys(normalizedMap)) {
    if (tryKeys.some((c) => normalizeColumnKey(c).includes(k) || k.includes(normalizeColumnKey(c)))) {
      const v = normalizedMap[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }

  return defaultValue;
};

const getRowCode = (row: any): string => {
  const code = getColumnValue(row, "kode", ["kode", "code", "__col_0"], "");
  return String(code ?? "").trim();
};

const getCodeLevel = (code: string): number => {
  const normalized = String(code || "").trim();
  if (!/^\d+$/.test(normalized)) return 0;
  if (normalized.length === 4) return 4;
  if (normalized.length === 7) return 7;
  if (normalized.length === 10) return 10;
  if (normalized.length === 16) return 16;
  return 0;
};

const getPrelistAwalForCode = (prelistAwalMap: Record<string, number>, code: string): number | undefined => {
  const normalized = String(code || "").trim();
  if (!normalized) return undefined;
  const candidates = [normalized];
  if (normalized.length >= 10) candidates.push(normalized.slice(0, 10));
  if (normalized.length >= 7) candidates.push(normalized.slice(0, 7));
  if (normalized.length >= 4) candidates.push(normalized.slice(0, 4));

  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(prelistAwalMap, candidate)) {
      return prelistAwalMap[candidate];
    }
  }
  return undefined;
};
const renderSortIcon = (active: boolean, order: "asc" | "desc") => {
  if (!active) return <ArrowUpDown className="ml-1 inline-block h-3 w-3 text-slate-500" />;
  return order === "asc" ? (
    <ChevronUp className="ml-1 inline-block h-3 w-3 text-slate-600" />
  ) : (
    <ChevronDown className="ml-1 inline-block h-3 w-3 text-slate-600" />
  );
};
const PRELIST_SPREADSHEET_ID = "1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o";

const getRowDescription = (row: any, codeParam?: string): string => {
  const code = String(
    codeParam ?? getColumnValue(row, "kode", ["kode", "code", "__col_0"], "")
  ).trim();
  const level = getCodeLevel(code);

  const getDescription = (primary: string, fallbacks: string[]) =>
    String(getColumnValue(row, primary, fallbacks, "") ?? "").trim();

  if (level === 10) {
    return getDescription("desa", [
      "nama_desa_kel",
      "kel",
      "kecamatan",
      "nama_kecamatan",
      "sub_satuan_lingkungan_setempat",
      "sub satuan lingkungan setempat",
      "sub_satuan_lingkungan_setempat (sub-sls)",
      "sub_sls",
      "subsls",
      "sls",
      "nama_sls",
      "deskripsi",
      "__col_2",
      "__col_1",
    ]);
  }

  if (level === 16) {
    return getDescription("sub_satuan_lingkungan_setempat", [
      "sub satuan lingkungan setempat",
      "sub_satuan_lingkungan_setempat (sub-sls)",
      "sub_sls",
      "subsls",
      "sls",
      "nama_sls",
      "desa",
      "nama_desa_kel",
      "kel",
      "kecamatan",
      "nama_kecamatan",
      "deskripsi",
      "__col_3",
      "__col_2",
      "__col_1",
    ]);
  }

  return getDescription("kecamatan", [
    "nama_kecamatan",
    "desa",
    "nama_desa_kel",
    "kel",
    "sub_satuan_lingkungan_setempat",
    "sub satuan lingkungan setempat",
    "sub_satuan_lingkungan_setempat (sub-sls)",
    "sub_sls",
    "subsls",
    "sls",
    "nama_sls",
    "deskripsi",
    "__col_1",
    "__col_2",
  ]);
};

const parseNumber = (v: any): number => {
  if (v === null || v === undefined) return NaN;
  const raw = String(v).trim();
  if (raw === "") return NaN;

  const onlyDigitsComma = /^[0-9]+(,[0-9]+)*$/;
  const onlyDigitsDot = /^[0-9]+(\.[0-9]+)*$/;
  const thousandsComma = /^[0-9]{1,3}(,[0-9]{3})+$/;
  const thousandsDot = /^[0-9]{1,3}(\.[0-9]{3})+$/;

  let normalized = raw;

  if (thousandsComma.test(raw) && !raw.includes('.')) {
    normalized = raw.replace(/,/g, '');
  } else if (thousandsDot.test(raw) && !raw.includes(',')) {
    normalized = raw.replace(/\./g, '');
  } else if (onlyDigitsComma.test(raw) && raw.includes(',')) {
    normalized = raw.replace(/,/g, '.');
  } else if (onlyDigitsDot.test(raw) && raw.includes('.')) {
    normalized = raw;
  } else {
    normalized = raw.replace(/[^0-9,.-]/g, '');
    if (normalized.includes(',') && !normalized.includes('.')) {
      normalized = normalized.replace(/,/g, '.');
    } else {
      normalized = normalized.replace(/,/g, '').replace(/\.(?=.*\.)/g, '');
    }
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
};

const parsePercent = (v: any): number => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(/%/g, "").trim();
  return parseNumber(s);
};

const formatNumberValue = (value: any): string => {
  const parsed = parseNumber(value);
  if (!Number.isFinite(parsed)) {
    const raw = String(value ?? "").trim();
    return raw === "" ? "-" : raw;
  }
  return parsed.toLocaleString("id-ID");
};

const formatTextValue = (value: any): string => {
  const raw = String(value ?? "").trim();
  return raw === "" ? "-" : raw;
};

const toProperCase = (value: string): string =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word === "") return "";
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

const formatPersonNameValue = (value: any): string => {
  const raw = String(value ?? "").trim();
  if (raw === "") return "-";
  return toProperCase(raw);
};

const formatPercentValue = (value: number): string => {
  if (!Number.isFinite(value)) return "-";
  const formatted = value.toFixed(2).replace(/\.00$/, "").replace(/(\.[0-9]*?)0+$/, "$1");
  return `${formatted}%`;
};

const getPercent = (value: any, total: any): number | undefined => {
  const n = parseNumber(value);
  const t = parseNumber(total);
  if (!Number.isFinite(n) || !Number.isFinite(t) || t === 0) return undefined;
  return (n / t) * 100;
};

const PercentBadge = ({ value }: { value: any }) => {
  const n = typeof value === "number" ? value : parsePercent(value);
  let bg = "bg-amber-100 text-amber-800";
  if (!Number.isFinite(n)) {
    return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">-</span>;
  }
  if (n >= 40) bg = "bg-emerald-100 text-emerald-800";
  else if (n >= 30) bg = "bg-amber-100 text-amber-800";
  else bg = "bg-rose-100 text-rose-700";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${bg}`}>{formatPercentValue(n)}</span>;
};

export default function MonitoringLapanganKualitasTab({ spreadsheetId }: Props) {
  const { data: usahaBku = [], loading: l1 } = useGoogleSheetsData({ spreadsheetId, sheetName: "Progres_Usaha_BKU" });
  const { data: usahaRumah = [], loading: l2 } = useGoogleSheetsData({ spreadsheetId, sheetName: "Usaha_Dlm_Rumah" });
  const { data: kkData = [], loading: l3 } = useGoogleSheetsData({ spreadsheetId, sheetName: "Pemutakhiran_KK" });
  const { data: anggotaData = [], loading: l4 } = useGoogleSheetsData({ spreadsheetId, sheetName: "Pemutakhiran_Anggota_K" });
  const { data: prelistAwalData = [], loading: l5 } = useGoogleSheetsData({ spreadsheetId: PRELIST_SPREADSHEET_ID, sheetName: "Prelist_Awal" });
  const { data: usahaHeader = [], loading: h1 } = useGoogleSheetsData({ spreadsheetId, sheetName: "Progres_Usaha_BKU", range: "Progres_Usaha_BKU!A2", mode: "single-cell" });
  const { data: kkHeader = [], loading: h2 } = useGoogleSheetsData({ spreadsheetId, sheetName: "Pemutakhiran_KK", range: "Pemutakhiran_KK!A2", mode: "single-cell" });
  const { data: anggotaHeader = [], loading: h3 } = useGoogleSheetsData({ spreadsheetId, sheetName: "Pemutakhiran_Anggota_K", range: "Pemutakhiran_Anggota_K!A2", mode: "single-cell" });

  const loading = l1 || l2 || l3 || l4 || l5 || h1 || h2 || h3;
  const allRows = useMemo(() => [...(usahaBku || []), ...(usahaRumah || []), ...(kkData || []), ...(anggotaData || [])], [usahaBku, usahaRumah, kkData, anggotaData]);

  // filter states (moved up to avoid TDZ when useMemo reads them)
  const [kecamatanFilter, setKecamatanFilter] = useState("");
  const [desaFilter, setDesaFilter] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"usaha"|"keluarga"|"anggota">("usaha");

  // build filter options
  // For performance, compute options from the main sheets only (usahaBku and usahaRumah)
  // map kode (col A) -> kecamatan description (col B) built from all sheets
  const kodeToDesc = useMemo(() => {
    const m: Record<string, string> = {};
    allRows.forEach((r) => {
      const code = getRowCode(r);
      if (!code) return;
      const desc = getRowDescription(r, code);
      if (desc) m[code] = desc;
    });
    return m;
  }, [allRows]);

  const kecamatanOptions = useMemo(() => {
    const seen = new Set<string>();
    allRows.forEach((r) => {
      const code = getRowCode(r);
      if (getCodeLevel(code) !== 7) return;
      const desc = kodeToDesc[code] || getRowDescription(r);
      if (desc && !seen.has(desc)) seen.add(desc);
    });
    return Array.from(seen).sort();
  }, [allRows, kodeToDesc]);

  // compute desa options as descriptions (col B for desa), dynamic per selected kecamatan description, from all sheets
  const desaOptions = useMemo(() => {
    const s = new Set<string>();
    allRows.forEach((r) => {
      const code = getRowCode(r);
      if (getCodeLevel(code) !== 10) return;
      const prefix7 = code.slice(0, 7);
      const kecDesc = kodeToDesc[prefix7] || getRowDescription(r, prefix7);
      const desaDesc = kodeToDesc[code] || getRowDescription(r, code);
      if (!desaDesc) return;
      if (kecamatanFilter) {
        if (kecDesc === kecamatanFilter) s.add(desaDesc);
      } else {
        s.add(desaDesc);
      }
    });
    return Array.from(s).sort();
  }, [allRows, kecamatanFilter, kodeToDesc]);

  // helper: get description for a prefix code at a given length (4/7/10/16)
  const getDescForPrefix = (code: string, len: number) => {
    if (!code) return "";
    const pref = code.length >= len ? code.slice(0, len) : code;
    return kodeToDesc[pref] || "";
  };

  const getDisplayDesc = (code: string) => {
    if (!code) return "-";
    const exact = kodeToDesc[code] || "";
    const level = getCodeLevel(code);
    if (desaFilter) return exact || getDescForPrefix(code, 16) || getDescForPrefix(code, 10);
    if (kecamatanFilter) return exact || getDescForPrefix(code, 10) || getDescForPrefix(code, 7);
    if (level === 7) return exact;
    if (level === 10) return getDescForPrefix(code, 7) || exact;
    return exact || getDescForPrefix(code, 4) || "";
  };



  // sorting per tab
  const [sortByUsaha, setSortByUsaha] = useState<string | null>(null);
  const [sortOrderUsaha, setSortOrderUsaha] = useState<"asc"|"desc">("asc");
  const [sortByKk, setSortByKk] = useState<string | null>(null);
  const [sortOrderKk, setSortOrderKk] = useState<"asc"|"desc">("asc");
  const [sortByAnggota, setSortByAnggota] = useState<string | null>(null);
  const [sortOrderAnggota, setSortOrderAnggota] = useState<"asc"|"desc">("asc");

  const toggleSort = (which: string, field: string) => {
    if (which === "usaha") {
      if (sortByUsaha === field) setSortOrderUsaha(sortOrderUsaha === "asc" ? "desc" : "asc");
      else { setSortByUsaha(field); setSortOrderUsaha("asc"); }
    }
    if (which === "kk") {
      if (sortByKk === field) setSortOrderKk(sortOrderKk === "asc" ? "desc" : "asc");
      else { setSortByKk(field); setSortOrderKk("asc"); }
    }
    if (which === "anggota") {
      if (sortByAnggota === field) setSortOrderAnggota(sortOrderAnggota === "asc" ? "desc" : "asc");
      else { setSortByAnggota(field); setSortOrderAnggota("asc"); }
    }
  };

  const filterRow = (row: any) => {
    const kode = String(getColumnValue(row, "kode", ["kode", "__col_0"], "")).trim();
    const level = getCodeLevel(kode);

    const isUnknownDesc = (desc: string) => {
      const value = String(desc || "").trim().toLowerCase();
      return value === "tidak diketahui";
    };

    if (desaFilter) {
      if (!kode || kode.length !== 16) return false;
      const rowDesaCode = kode.slice(0, 10);
      const rowDesaDesc = kodeToDesc[rowDesaCode] || getRowDescription(row, rowDesaCode);
      if (!rowDesaDesc || isUnknownDesc(rowDesaDesc)) return false;
      if (rowDesaDesc !== desaFilter) return false;
    } else if (kecamatanFilter) {
      if (!kode || kode.length !== 10) return false;
      const rowKecDesc = getDescForPrefix(kode, 7) || String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "kecamatan", "__col_1"], "")).trim();
      if (!rowKecDesc || isUnknownDesc(rowKecDesc)) return false;
      if (rowKecDesc !== kecamatanFilter) return false;
    } else {
      if (level !== 7) return false;
      const rowKecDesc = kodeToDesc[kode] || getRowDescription(row, kode);
      if (!rowKecDesc || isUnknownDesc(rowKecDesc)) return false;
    }
    if (search) {
      const hay = Object.values(row).join(" ").toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  };

  const usahaRows = useMemo(() => {
    // Use only Progres_Usaha_BKU as primary rows (join with Usaha_Dlm_Rumah by code)
    return (usahaBku || []).filter(filterRow);
  }, [usahaBku, usahaRumah, kecamatanFilter, desaFilter, search]);

  const kkRows = useMemo(() => kkData.filter(filterRow), [kkData, kecamatanFilter, desaFilter, search]);

  const anggotaRows = useMemo(() => anggotaData.filter(filterRow), [anggotaData, kecamatanFilter, desaFilter, search]);

  // build map from Usaha_Dlm_Rumah by code -> usaha dalam keluarga didata (col D)
  const usahaRumahMap = useMemo(() => {
    const m: Record<string, any> = {};
    (usahaRumah || []).forEach((r) => {
      const code = String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim();
      if (!code) return;
      const val = getColumnValue(r, "jumlah_usaha_dlm_keluarga", ["jumlah usaha dalam keluarga yang berhasil didata", "jumlah_usaha_dlm_keluarga", "__col_3", "d"], "");
      m[code] = val;
    });
    return m;
  }, [usahaRumah]);

  const prelistAwalMap = useMemo(() => {
    const m: Record<string, number> = {};

    (prelistAwalData || []).forEach((r) => {
      const code4 = String(getColumnValue(r, "idkab", ["idkab", "kdkab", "kdprov", "__col_0"], "")).trim();
      const code7 = String(getColumnValue(r, "idkec", ["idkec", "kdkec", "kd kec", "kd kecamatan", "__col_1"], "")).trim();
      const code10 = String(getColumnValue(r, "iddesa", ["iddesa", "kddesa", "kd desa", "__col_2"], "")).trim();
      const code16 = String(getColumnValue(r, "idsubsls_25_2", ["idsubsls_25_2", "idsubsls", "idsubsls252", "kdsubsls", "kdsls", "__col_3"], "")).trim();
      if (code16.length !== 16) return;

      const z = parseNumber(getColumnValue(r, "umk", ["umk", "umkm keluarga", "umkm", "__col_25"], "0"));
      const aa = parseNumber(getColumnValue(r, "um", ["um", "__col_26"], "0"));
      const ab = parseNumber(getColumnValue(r, "ub", ["ub", "__col_27"], "0"));
      const totalPrelist = [z, aa, ab].filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
      if (!Number.isFinite(totalPrelist) || totalPrelist === 0) return;

      const addPrelist = (code: string) => {
        if (!code) return;
        m[code] = (m[code] || 0) + totalPrelist;
      };

      addPrelist(code16);
      addPrelist(code10);
      addPrelist(code7);
      addPrelist(code4);
    });

    if (typeof window !== 'undefined') {
      (window as any).__PRELIST_DEBUG__ = {
        length: Object.keys(m).length,
        sample: {
          code10: m['3210120001'],
          code16: m['3210120001000100'],
        },
        firstRow: prelistAwalData?.[0],
      };
    }
    return m;
  }, [prelistAwalData]);

  // sorted views
  const sortedUsahaRows = useMemo(() => {
    const arr = [...usahaRows];
    if (!sortByUsaha) return arr;
    const getUsahaValue = (row: any, field: string): any => {
      if (field === "kode") return String(getColumnValue(row, "kode", ["kode", "__col_0"], "")).trim();
      if (field === "nama_ppl") return String(getColumnValue(row, "nama_ppl", ["nama_ppl", "nama ppl", "ppl"], "")).trim();
      if (field === "nama_pml") return String(getColumnValue(row, "nama_pml", ["nama_pml", "nama pml", "pml"], "")).trim();
      if (field === "jumlah_prelist_usaha") {
        const kode = String(getColumnValue(row, "kode", ["kode", "__col_0"], "")).trim();
        return getPrelistAwalForCode(prelistAwalMap, kode) ?? getColumnValue(row, "jumlah_prelist_usaha", ["prelist_usaha", "prelist"], "");
      }
      if (field === "total_usaha") {
        const kode = String(getColumnValue(row, "kode", ["kode", "__col_0"], "")).trim();
        const ditemukan = parseNumber(getColumnValue(row, "ditemukan", ["ditemukan"], "0"));
        const baru = parseNumber(getColumnValue(row, "baru", ["baru"], "0"));
        const usahaDalamKeluarga = parseNumber(usahaRumahMap[kode] ?? "0");
        return Number.isFinite(ditemukan) && Number.isFinite(baru) && Number.isFinite(usahaDalamKeluarga)
          ? ditemukan + baru + usahaDalamKeluarga
          : "";
      }
      return getColumnValue(row, field, [], "");
    };

    arr.sort((a: any, b: any) => {
      const va = getUsahaValue(a, sortByUsaha);
      const vb = getUsahaValue(b, sortByUsaha);
      const na = parseNumber(va);
      const nb = parseNumber(vb);
      if (Number.isFinite(na) && Number.isFinite(nb)) return sortOrderUsaha === "asc" ? na - nb : nb - na;
      return String(va).localeCompare(String(vb)) * (sortOrderUsaha === "asc" ? 1 : -1);
    });
    return arr;
  }, [usahaRows, sortByUsaha, sortOrderUsaha, usahaRumahMap, prelistAwalMap]);

  const sortedKkRows = useMemo(() => {
    const arr = [...kkRows];
    if (!sortByKk) return arr;
    arr.sort((a: any, b: any) => {
      const va = getColumnValue(a, sortByKk, [], "");
      const vb = getColumnValue(b, sortByKk, [], "");
      const na = parseNumber(va);
      const nb = parseNumber(vb);
      if (Number.isFinite(na) && Number.isFinite(nb)) return sortOrderKk === "asc" ? na - nb : nb - na;
      return String(va).localeCompare(String(vb)) * (sortOrderKk === "asc" ? 1 : -1);
    });
    return arr;
  }, [kkRows, sortByKk, sortOrderKk]);

  const sortedAnggotaRows = useMemo(() => {
    const arr = [...anggotaRows];
    if (!sortByAnggota) return arr;
    arr.sort((a: any, b: any) => {
      const va = getColumnValue(a, sortByAnggota, [], "");
      const vb = getColumnValue(b, sortByAnggota, [], "");
      const na = parseNumber(va);
      const nb = parseNumber(vb);
      if (Number.isFinite(na) && Number.isFinite(nb)) return sortOrderAnggota === "asc" ? na - nb : nb - na;
      return String(va).localeCompare(String(vb)) * (sortOrderAnggota === "asc" ? 1 : -1);
    });
    return arr;
  }, [anggotaRows, sortByAnggota, sortOrderAnggota]);

  const sumNumeric = (value: any): number => {
    const n = parseNumber(value);
    return Number.isFinite(n) ? n : 0;
  };

  const usahaTotals = useMemo(() => {
    const totals = {
      prelist: 0,
      ditemukan: 0,
      tutup: 0,
      ganda: 0,
      tidakDitemukan: 0,
      baru: 0,
      total: 0,
      usahaDalamKeluarga: 0,
      jumlahUsahaTotal: 0,
    };
    sortedUsahaRows.forEach((r: any) => {
      const code = String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim();
      const prelist = getPrelistAwalForCode(prelistAwalMap, code) ?? getColumnValue(r, "jumlah_prelist_usaha", ["prelist_usaha", "prelist"], "0");
      const ditemukan = getColumnValue(r, "ditemukan", ["ditemukan"], "0");
      const tutup = getColumnValue(r, "tutup", ["tutup"], "0");
      const ganda = getColumnValue(r, "ganda", ["ganda"], "0");
      const tidakDitemukan = getColumnValue(r, "tidak_ditemukan", ["tidak ditemukan", "tidak_ditemukan"], "0");
      const baru = getColumnValue(r, "baru", ["baru"], "0");
      const total = getColumnValue(r, "total", ["total"], "0");
      const usahaDalamKeluarga = code && usahaRumahMap[code] !== undefined
        ? usahaRumahMap[code]
        : getColumnValue(r, "usaha_dlm_keluarga", ["usaha dalam keluarga didata", "usaha_dlm_keluarga"], "0");
      const ditemukanNum = sumNumeric(ditemukan);
      const baruNum = sumNumeric(baru);
      const usahaDalamKeluargaNum = sumNumeric(usahaDalamKeluarga);
      totals.prelist += sumNumeric(prelist);
      totals.ditemukan += ditemukanNum;
      totals.tutup += sumNumeric(tutup);
      totals.ganda += sumNumeric(ganda);
      totals.tidakDitemukan += tidakDitemukan ? sumNumeric(tidakDitemukan) : 0;
      totals.baru += baruNum;
      totals.total += sumNumeric(total);
      totals.usahaDalamKeluarga += usahaDalamKeluargaNum;
      totals.jumlahUsahaTotal += Number.isFinite(ditemukanNum + baruNum + usahaDalamKeluargaNum)
        ? ditemukanNum + baruNum + usahaDalamKeluargaNum
        : 0;
    });
    return totals;
  }, [sortedUsahaRows, prelistAwalMap]);

  const kkTotals = useMemo(() => {
    const totals = {
      prelist: 0,
      ditemukan: 0,
      keluargaBaru: 0,
      meninggal: 0,
      tidakEligible: 0,
      tidakDapatDitemui: 0,
      tidakDitemukan: 0,
      keluargaKhusus: 0,
      totalHasilPendataan: 0,
    };
    sortedKkRows.forEach((r: any) => {
      totals.prelist += sumNumeric(getColumnValue(r, "prelist_awal", ["prelist_awal", "prelist"], "0"));
      totals.ditemukan += sumNumeric(getColumnValue(r, "ditemukan", ["ditemukan"], "0"));
      totals.keluargaBaru += sumNumeric(getColumnValue(r, "keluarga_baru", ["keluarga baru", "keluarga_baru"], "0"));
      totals.meninggal += sumNumeric(getColumnValue(r, "meninggal", ["meninggal"], "0"));
      totals.tidakEligible += sumNumeric(getColumnValue(r, "tidak_eligible", ["tidak eligible"], "0"));
      totals.tidakDapatDitemui += sumNumeric(getColumnValue(r, "tidak_dapat_ditemui", ["tdk dapat ditemui", "tidak dapat ditemui"], "0"));
      totals.tidakDitemukan += sumNumeric(getColumnValue(r, "tidak_ditemukan", ["tidak ditemukan"], "0"));
      totals.keluargaKhusus += sumNumeric(getColumnValue(r, "keluarga_khusus", ["keluarga khusus"], "0"));
      totals.totalHasilPendataan += sumNumeric(getColumnValue(r, "total_hasil_pendataan", ["total hasil pendataan"], "0"));
    });
    return totals;
  }, [sortedKkRows]);

  const anggotaTotals = useMemo(() => {
    const totals = {
      tinggalBersama: 0,
      anggotaBaru: 0,
      meninggal: 0,
      pindahDn: 0,
      pindahLn: 0,
      tidakDitemukan: 0,
      anggotaKhusus: 0,
      totalAnggotaKeluarga: 0,
    };
    sortedAnggotaRows.forEach((r: any) => {
      totals.tinggalBersama += sumNumeric(getColumnValue(r, "tinggal_bersama_keluarga", ["tinggal bersama keluarga", "tinggal_bersama_keluarga"], "0"));
      totals.anggotaBaru += sumNumeric(getColumnValue(r, "anggota_keluarga_baru", ["anggota keluarga baru"], "0"));
      totals.meninggal += sumNumeric(getColumnValue(r, "meninggal", ["meninggal"], "0"));
      totals.pindahDn += sumNumeric(getColumnValue(r, "pindah_dn", ["pindah dalam negeri", "pindah_dn"], "0"));
      totals.pindahLn += sumNumeric(getColumnValue(r, "pindah_ln", ["pindah luar negeri", "pindah_ln"], "0"));
      totals.tidakDitemukan += sumNumeric(getColumnValue(r, "tidak_ditemukan", ["tidak ditemukan"], "0"));
      totals.anggotaKhusus += sumNumeric(getColumnValue(r, "anggota_keluarga_khusus", ["anggota keluarga khusus"], "0"));
      totals.totalAnggotaKeluarga += sumNumeric(getColumnValue(r, "total_anggota_keluarga", ["total anggota keluarga"], "0"));
    });
    return totals;
  }, [sortedAnggotaRows]);

  const exportCsv = (tab: string) => {
    let rows: any[] = [];
    if (tab === "usaha") rows = sortedUsahaRows;
    if (tab === "keluarga") rows = sortedKkRows;
    if (tab === "anggota") rows = sortedAnggotaRows;

    if (!rows || rows.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }

    // prepend normalized kecamatan description and full kode to CSV
    const baseKeys = Object.keys(rows[0]);
    const headers = ["kecamatan_desc", "kode_full", ...baseKeys];
    const csv = [headers.join(",")].concat(rows.map(r => {
      const code = String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim();
      const desc = getDisplayDesc(code) || kodeToDesc[code] || String(getColumnValue(r, "kecamatan", ["nama_kecamatan", "kecamatan"], "")).trim();
      const base = baseKeys.map(h => String(r[h] ?? "").replace(/"/g, '""'));
      return [desc, code, ...base].map(v => `"${v}"`).join(",");
    })).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kualitas_${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDisplayCode = (kodeRaw: string) => {
    const kode = String(kodeRaw || "").trim();
    if (!kode) return "-";
    if (desaFilter) return kode.slice(0, Math.min(16, kode.length));
    if (kecamatanFilter) return kode.slice(0, Math.min(10, kode.length));
    return kode.slice(0, Math.min(7, kode.length));
  };

  const showPplPmlColumns = Boolean(desaFilter);

  const locationHeaderLabel = useMemo(() => {
    if (desaFilter) return "SLS / RT";
    if (kecamatanFilter) return "Desa";
    return "Kecamatan";
  }, [desaFilter, kecamatanFilter]);

  const activeHeaderText = useMemo(() => {
    if (activeTab === "usaha") return String(usahaHeader?.[0] ?? "").trim();
    if (activeTab === "keluarga") return String(kkHeader?.[0] ?? "").trim();
    if (activeTab === "anggota") return String(anggotaHeader?.[0] ?? "").trim();
    return "";
  }, [activeTab, usahaHeader, kkHeader, anggotaHeader]);

  const showActiveHeaderText = Boolean(activeHeaderText && !activeHeaderText.trim().startsWith("Waktu Update Data Terakhir:"));

  if (loading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;

  return (
    <div>
      {showActiveHeaderText ? (
        <div className="mb-4 text-sm text-blue-700 whitespace-pre-line bg-transparent px-0 py-0">
          {activeHeaderText}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select className="border rounded px-3 py-2" value={kecamatanFilter} onChange={(e) => { setKecamatanFilter(e.target.value); setDesaFilter(""); }}>
          <option value="">-- Semua Kecamatan --</option>
          {kecamatanOptions.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select disabled={!kecamatanFilter} className="border rounded px-3 py-2" value={desaFilter} onChange={(e) => setDesaFilter(e.target.value)}>
          <option value="">-- Semua Desa --</option>
          {desaOptions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input placeholder="Cari seluruh kolom..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => exportCsv(activeTab)}>Export CSV</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "usaha" | "keluarga" | "anggota")}>
        <TabsList className="mb-2">
          <TabsTrigger value="usaha">1. Kualitas Data Usaha</TabsTrigger>
          <TabsTrigger value="keluarga">2. Kualitas Data Keluarga</TabsTrigger>
          <TabsTrigger value="anggota">3. Kualitas Data Anggota (ART)</TabsTrigger>
        </TabsList>

        <TabsContent value="usaha">
          <div className="overflow-x-auto border rounded">
            <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 sticky top-0 z-20">
                        <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort("usaha", "kode")}>{locationHeaderLabel}{renderSortIcon(sortByUsaha === "kode", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","jumlah_prelist_usaha")}>Jumlah Prelist Usaha{renderSortIcon(sortByUsaha === "jumlah_prelist_usaha", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","ditemukan")}>Ditemukan{renderSortIcon(sortByUsaha === "ditemukan", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","tutup")}>Tutup{renderSortIcon(sortByUsaha === "tutup", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","ganda")}>Ganda{renderSortIcon(sortByUsaha === "ganda", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","tidak_ditemukan")}>Tidak Ditemukan{renderSortIcon(sortByUsaha === "tidak_ditemukan", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","baru")}>Baru{renderSortIcon(sortByUsaha === "baru", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","total")}>Total{renderSortIcon(sortByUsaha === "total", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","jumlah_usaha_dlm_keluarga")}>Usaha Dalam Keluarga Didata{renderSortIcon(sortByUsaha === "jumlah_usaha_dlm_keluarga", sortOrderUsaha)}</TableHead>
                        <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha","total_usaha")}>Jumlah Usaha Total{renderSortIcon(sortByUsaha === "total_usaha", sortOrderUsaha)}</TableHead>
                        {showPplPmlColumns ? (
                          <>
                            <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha", "nama_ppl")}>PPL{renderSortIcon(sortByUsaha === "nama_ppl", sortOrderUsaha)}</TableHead>
                            <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("usaha", "nama_pml")}>PML{renderSortIcon(sortByUsaha === "nama_pml", sortOrderUsaha)}</TableHead>
                          </>
                        ) : null}
                      </TableRow>
                    </TableHeader>
              <TableBody>
                {sortedUsahaRows.map((r: any, idx: number) => {
                  const code = String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim();
                  const usaharumahDisplay = code && usahaRumahMap[code] !== undefined ? usahaRumahMap[code] : getColumnValue(r, "usaha_dlm_keluarga", ["usaha dalam keluarga didata", "usaha_dlm_keluarga"], "-");
                  const prelistValue = parseNumber(getPrelistAwalForCode(prelistAwalMap, code) ?? getColumnValue(r, "jumlah_prelist_usaha", ["prelist_usaha", "prelist"], "0"));
                  const ditemukanValue = getColumnValue(r, "ditemukan", ["ditemukan"], "0");
                  const tutupValue = getColumnValue(r, "tutup", ["tutup"], "0");
                  const gandaValue = getColumnValue(r, "ganda", ["ganda"], "0");
                  const tidakDitemukanValue = getColumnValue(r, "tidak_ditemukan", ["tidak ditemukan", "tidak_ditemukan"], "0");
                  const baruValue = getColumnValue(r, "baru", ["baru"], "0");
                  const totalValue = getColumnValue(r, "total", ["total"], "0");
                  const usahaDalamKeluargaValue = usaharumahDisplay;
                  const totalUsahaValue = (() => {
                    const ditemukan = parseNumber(ditemukanValue);
                    const baru = parseNumber(baruValue);
                    const usahaDalamKeluarga = parseNumber(usaharumahDisplay ?? "0");
                    return Number.isFinite(ditemukan) && Number.isFinite(baru) && Number.isFinite(usahaDalamKeluarga)
                      ? ditemukan + baru + usahaDalamKeluarga
                      : NaN;
                  })();
                  return (
                    <TableRow key={idx} className="even:bg-white">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{getDisplayDesc(code) || "-"}</span>
                          <span className="text-sm text-slate-500">{formatDisplayCode(code)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{formatNumberValue(getPrelistAwalForCode(prelistAwalMap, code) ?? getColumnValue(r, "jumlah_prelist_usaha", ["prelist_usaha", "prelist"], undefined))}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{formatNumberValue(ditemukanValue)}</span>
                          {(() => { const p = getPercent(ditemukanValue, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{formatNumberValue(tutupValue)}</span>
                          {(() => { const p = getPercent(tutupValue, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{formatNumberValue(gandaValue)}</span>
                          {(() => { const p = getPercent(gandaValue, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{formatNumberValue(tidakDitemukanValue)}</span>
                          {(() => { const p = getPercent(tidakDitemukanValue, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{formatNumberValue(baruValue)}</span>
                          {(() => { const p = getPercent(baruValue, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{formatNumberValue(totalValue)}</span>
                          {(() => { const p = getPercent(totalValue, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{formatNumberValue(usaharumahDisplay)}</span>
                          {(() => { const p = getPercent(usaharumahDisplay, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span>{Number.isFinite(totalUsahaValue) ? formatNumberValue(totalUsahaValue) : "-"}</span>
                          {(() => { const p = getPercent(totalUsahaValue, prelistValue); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                        </div>
                      </TableCell>
                      {showPplPmlColumns ? (
                        <>
                          <TableCell className="text-center">{formatPersonNameValue(getColumnValue(r, "nama_ppl", ["nama_ppl", "nama ppl", "ppl"], "-"))}</TableCell>
                          <TableCell className="text-center">{formatPersonNameValue(getColumnValue(r, "nama_pml", ["nama_pml", "nama pml", "pml"], "-"))}</TableCell>
                        </>
                      ) : null}
                        </TableRow>
                    );
                  })}
                  <TableRow className="bg-slate-100 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{formatNumberValue(usahaTotals.prelist)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.ditemukan)}</span>
                        {(() => { const p = getPercent(usahaTotals.ditemukan, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.tutup)}</span>
                        {(() => { const p = getPercent(usahaTotals.tutup, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.ganda)}</span>
                        {(() => { const p = getPercent(usahaTotals.ganda, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.tidakDitemukan)}</span>
                        {(() => { const p = getPercent(usahaTotals.tidakDitemukan, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.baru)}</span>
                        {(() => { const p = getPercent(usahaTotals.baru, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.total)}</span>
                        {(() => { const p = getPercent(usahaTotals.total, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.usahaDalamKeluarga)}</span>
                        {(() => { const p = getPercent(usahaTotals.usahaDalamKeluarga, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>{formatNumberValue(usahaTotals.jumlahUsahaTotal)}</span>
                        {(() => { const p = getPercent(usahaTotals.jumlahUsahaTotal, usahaTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                      </div>
                    </TableCell>
                    {showPplPmlColumns ? (
                      <>
                        <TableCell />
                        <TableCell />
                      </>
                    ) : null}
                  </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="keluarga">
          <div className="overflow-x-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 sticky top-0 z-20">
                  <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort("kk", "kode")}>{locationHeaderLabel}{renderSortIcon(sortByKk === "kode", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","prelist_awal")}>Prelist Awal{renderSortIcon(sortByKk === "prelist_awal", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","ditemukan")}>Ditemukan{renderSortIcon(sortByKk === "ditemukan", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","keluarga_baru")}>Keluarga Baru{renderSortIcon(sortByKk === "keluarga_baru", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","meninggal")}>Meninggal{renderSortIcon(sortByKk === "meninggal", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","tidak_eligible")}>Tidak Eligible{renderSortIcon(sortByKk === "tidak_eligible", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","tidak_dapat_ditemui")}>Tidak Dapat Ditemui S.D. Akhir Pendataan{renderSortIcon(sortByKk === "tidak_dapat_ditemui", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","tidak_ditemukan")}>Tidak Ditemukan{renderSortIcon(sortByKk === "tidak_ditemukan", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","keluarga_khusus")}>Keluarga Khusus{renderSortIcon(sortByKk === "keluarga_khusus", sortOrderKk)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk","total_hasil_pendataan")}>Total Hasil Pendataan{renderSortIcon(sortByKk === "total_hasil_pendataan", sortOrderKk)}</TableHead>
                  {showPplPmlColumns ? (
                    <>
                      <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk", "nama_ppl")}>PPL{renderSortIcon(sortByKk === "nama_ppl", sortOrderKk)}</TableHead>
                      <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("kk", "nama_pml")}>PML{renderSortIcon(sortByKk === "nama_pml", sortOrderKk)}</TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKkRows.map((r: any, idx: number) => (
                  <TableRow key={idx} className="even:bg-white">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getDisplayDesc(String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim()) || "-"}</span>
                        <span className="text-sm text-slate-500">{formatDisplayCode(String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim())}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "prelist_awal", ["prelist_awal", "prelist"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "ditemukan", ["ditemukan"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "keluarga_baru", ["keluarga baru", "keluarga_baru"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "meninggal", ["meninggal"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "tidak_eligible", ["tidak eligible"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "tidak_dapat_ditemui", ["tdk dapat ditemui", "tidak dapat ditemui"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "tidak_ditemukan", ["tidak ditemukan"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "keluarga_khusus", ["keluarga khusus"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "total_hasil_pendataan", ["total hasil pendataan"], "-"))}</TableCell>
                    {showPplPmlColumns ? (
                      <>
                        <TableCell className="text-center">{formatPersonNameValue(getColumnValue(r, "nama_ppl", ["nama_ppl", "nama ppl", "ppl"], "-"))}</TableCell>
                        <TableCell className="text-center">{formatPersonNameValue(getColumnValue(r, "nama_pml", ["nama_pml", "nama pml", "pml"], "-"))}</TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))}
                <TableRow className="bg-slate-100 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{formatNumberValue(kkTotals.prelist)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.ditemukan)}</span>
                      {(() => { const p = getPercent(kkTotals.ditemukan, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.keluargaBaru)}</span>
                      {(() => { const p = getPercent(kkTotals.keluargaBaru, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.meninggal)}</span>
                      {(() => { const p = getPercent(kkTotals.meninggal, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.tidakEligible)}</span>
                      {(() => { const p = getPercent(kkTotals.tidakEligible, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.tidakDapatDitemui)}</span>
                      {(() => { const p = getPercent(kkTotals.tidakDapatDitemui, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.tidakDitemukan)}</span>
                      {(() => { const p = getPercent(kkTotals.tidakDitemukan, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.keluargaKhusus)}</span>
                      {(() => { const p = getPercent(kkTotals.keluargaKhusus, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(kkTotals.totalHasilPendataan)}</span>
                      {(() => { const p = getPercent(kkTotals.totalHasilPendataan, kkTotals.prelist); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  {showPplPmlColumns ? (
                    <>
                      <TableCell />
                      <TableCell />
                    </>
                  ) : null}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="anggota">
          <div className="overflow-x-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 sticky top-0 z-20">
                  <TableHead className="whitespace-nowrap cursor-pointer" onClick={() => toggleSort("anggota", "kode")}>{locationHeaderLabel}{renderSortIcon(sortByAnggota === "kode", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "tinggal_bersama_keluarga")}>Tinggal Bersama Keluarga{renderSortIcon(sortByAnggota === "tinggal_bersama_keluarga", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "anggota_keluarga_baru")}>Anggota Keluarga Baru{renderSortIcon(sortByAnggota === "anggota_keluarga_baru", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "meninggal")}>Meninggal{renderSortIcon(sortByAnggota === "meninggal", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "pindah_dn")}>Pindah Dalam Negeri (DN){renderSortIcon(sortByAnggota === "pindah_dn", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "pindah_ln")}>Pindah Luar Negeri (LN){renderSortIcon(sortByAnggota === "pindah_ln", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "tidak_ditemukan")}>Tidak Ditemukan{renderSortIcon(sortByAnggota === "tidak_ditemukan", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "anggota_keluarga_khusus")}>Anggota Keluarga Khusus{renderSortIcon(sortByAnggota === "anggota_keluarga_khusus", sortOrderAnggota)}</TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "total_anggota_keluarga")}>Total Anggota Keluarga{renderSortIcon(sortByAnggota === "total_anggota_keluarga", sortOrderAnggota)}</TableHead>
                  {showPplPmlColumns ? (
                    <>
                      <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "nama_ppl")}>PPL{renderSortIcon(sortByAnggota === "nama_ppl", sortOrderAnggota)}</TableHead>
                      <TableHead className="whitespace-nowrap cursor-pointer text-center" onClick={() => toggleSort("anggota", "nama_pml")}>PML{renderSortIcon(sortByAnggota === "nama_pml", sortOrderAnggota)}</TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAnggotaRows.map((r: any, idx: number) => (
                  <TableRow key={idx} className="even:bg-white">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{getDisplayDesc(String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim()) || "-"}</span>
                        <span className="text-sm text-slate-500">{formatDisplayCode(String(getColumnValue(r, "kode", ["kode", "__col_0"], "")).trim())}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "tinggal_bersama_keluarga", ["tinggal bersama keluarga", "tinggal_bersama_keluarga"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "anggota_keluarga_baru", ["anggota keluarga baru"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "meninggal", ["meninggal"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "pindah_dn", ["pindah dalam negeri", "pindah_dn"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "pindah_ln", ["pindah luar negeri", "pindah_ln"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "tidak_ditemukan", ["tidak ditemukan"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "anggota_keluarga_khusus", ["anggota keluarga khusus"], "-"))}</TableCell>
                    <TableCell className="text-center">{formatNumberValue(getColumnValue(r, "total_anggota_keluarga", ["total anggota keluarga"], "-"))}</TableCell>
                    {showPplPmlColumns ? (
                      <>
                        <TableCell className="text-center">{formatPersonNameValue(getColumnValue(r, "nama_ppl", ["nama_ppl", "nama ppl", "ppl"], "-"))}</TableCell>
                        <TableCell className="text-center">{formatPersonNameValue(getColumnValue(r, "nama_pml", ["nama_pml", "nama pml", "pml"], "-"))}</TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))}
                <TableRow className="bg-slate-100 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.tinggalBersama)}</span>
                      {(() => { const p = getPercent(anggotaTotals.tinggalBersama, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.anggotaBaru)}</span>
                      {(() => { const p = getPercent(anggotaTotals.anggotaBaru, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.meninggal)}</span>
                      {(() => { const p = getPercent(anggotaTotals.meninggal, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.pindahDn)}</span>
                      {(() => { const p = getPercent(anggotaTotals.pindahDn, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.pindahLn)}</span>
                      {(() => { const p = getPercent(anggotaTotals.pindahLn, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.tidakDitemukan)}</span>
                      {(() => { const p = getPercent(anggotaTotals.tidakDitemukan, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.anggotaKhusus)}</span>
                      {(() => { const p = getPercent(anggotaTotals.anggotaKhusus, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span>{formatNumberValue(anggotaTotals.totalAnggotaKeluarga)}</span>
                      {(() => { const p = getPercent(anggotaTotals.totalAnggotaKeluarga, anggotaTotals.totalAnggotaKeluarga); return Number.isFinite(p) ? <PercentBadge value={p} /> : null; })()}
                    </div>
                  </TableCell>
                  {showPplPmlColumns ? (
                    <>
                      <TableCell />
                      <TableCell />
                    </>
                  ) : null}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
