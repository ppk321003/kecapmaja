import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import OutlierGenericTab from "./OutlierGenericTab";

// Google Sheets ID and Sheet Names
const SPREADSHEET_ID = "12_gOs_3ONM1E2o_SXnljRM0Sx_YMkpXIN7yTfIRi2uU";
const PRODUKSI_SHEET = "PRODUKSI<1JT";
const TK_DIBAYAR_SHEET = "TK-DIBAYAR-1";
const VERIFIKASI_SPREADSHEET_ID = "1x9P3MlkJySQI9FK6mV3maik3qMnUIBW8IKwWPudAA2Y";
const GENERIC_OUTLIER_TABS = [
  ["AC>2", "Outlier rumah tangga yang tercatat memiliki lebih dari dua unit AC. Kondisi ini perlu ditinjau untuk memastikan jumlah kepemilikan sudah sesuai dengan kondisi rumah tangga, serta memastikan peralatan tersebut bukan aset yang digunakan untuk kegiatan usaha."],
  ["KULKAS>2", "Outlier rumah tangga yang tercatat memiliki lebih dari dua unit kulkas. Data ini perlu diverifikasi karena jumlah kulkas yang tinggi dapat mengindikasikan peralatan untuk kegiatan usaha, sehingga seharusnya tidak seluruhnya dicatat sebagai kepemilikan rumah tangga."],
  ["LAPTOP>2", "Outlier rumah tangga yang tercatat memiliki lebih dari dua unit laptop. Periksa kembali jumlah, status kepemilikan, dan penggunaannya untuk memastikan laptop tersebut benar-benar milik rumah tangga dan bukan inventaris kegiatan usaha."],
  ["PENGELUARAN<100RB", "Outlier dengan pengeluaran rumah tangga per bulan di bawah Rp100.000. Nilai ini sangat rendah sehingga perlu dikonfirmasi kembali, terutama kelengkapan komponen pengeluaran dan kesesuaian periode pencatatan yang digunakan."],
  ["LT<15", "Outlier rumah tangga dengan luas lantai kurang dari 15 meter persegi. Kondisi ini perlu dicermati untuk memastikan ukuran yang dicatat merupakan luas lantai sebenarnya dan tidak tertukar dengan luas ruangan, luas tanah, atau bagian bangunan tertentu."],
  ["LT>300", "Outlier rumah tangga dengan luas lantai lebih dari 300 meter persegi. Verifikasi diperlukan untuk memastikan angka tersebut benar, tidak tertukar dengan luas tanah, dan tidak mencakup bangunan atau ruang yang digunakan khusus untuk kegiatan usaha."],
  ["GAS3KG>5", "Outlier rumah tangga yang tercatat memiliki lebih dari lima tabung gas 3 kg. Jumlah ini perlu diperiksa karena dapat menunjukkan stok atau perlengkapan kegiatan usaha; apabila memang untuk usaha, jangan dicatat sebagai kepemilikan rumah tangga."],
  ["GAS5KG>5", "Outlier rumah tangga yang tercatat memiliki lebih dari lima tabung gas 5,5 kg. Periksa kembali jumlah dan tujuan penggunaannya karena kepemilikan tersebut dapat berkaitan dengan kegiatan usaha, bukan kebutuhan rumah tangga."],
  ["MOBIL>3", "Outlier rumah tangga yang tercatat memiliki lebih dari tiga mobil. Kondisi ini perlu diverifikasi untuk memastikan seluruh kendaraan benar-benar dimiliki rumah tangga dan tidak termasuk kendaraan usaha, kendaraan sewa, atau kendaraan milik pihak lain."],
  ["MOTOR>4", "Outlier rumah tangga yang tercatat memiliki lebih dari empat sepeda motor. Periksa kembali kepemilikan setiap kendaraan dan pastikan kendaraan untuk operasional usaha tidak tercampur dengan kepemilikan rumah tangga."],
  ["MOTOR<1JT", "Outlier dengan harga sepeda motor di bawah Rp1.000.000. Nilai ini perlu ditinjau karena kemungkinan salah input satuan, harga perolehan, atau kondisi kendaraan, sehingga tidak menggambarkan nilai motor yang sebenarnya."],
  ["LAHAN>5", "Outlier rumah tangga yang tercatat memiliki lebih dari lima bidang lahan. Verifikasi diperlukan untuk memastikan setiap bidang dihitung secara terpisah, status kepemilikannya jelas, dan lahan yang digunakan untuk usaha tidak salah klasifikasi."],
  ["LAHAN<10JT", "Outlier dengan harga lahan di bawah Rp10.000.000. Nilai tersebut perlu dikonfirmasi karena dapat terjadi kesalahan satuan, luas lahan, nilai per meter, atau nilai total lahan yang dicatat."],
  ["RUMAH>2", "Outlier rumah tangga yang tercatat memiliki lebih dari dua rumah. Periksa kembali status kepemilikan dan keberadaan setiap rumah, serta pastikan rumah yang digunakan sebagai tempat usaha atau milik anggota keluarga lain tidak salah dicatat."],
  ["RUMAH<10JT", "Outlier dengan harga rumah di bawah Rp10.000.000. Nilai ini perlu diverifikasi untuk memastikan tidak terjadi kesalahan satuan, kesalahan pengisian nilai total, atau tertukarnya harga bangunan dengan harga tanah."],
] as const;

const OUTLIER_TAB_LABELS: Record<string, string> = {
  "AC>2": "AC > 2",
  "KULKAS>2": "Kulkas > 2",
  "LAPTOP>2": "Laptop > 2",
  "PENGELUARAN<100RB": "Pengeluaran < 100RB",
  "LT<15": "Luas lantai < 15",
  "LT>300": "Luas lantai > 300",
  "GAS3KG>5": "Gas 3 kg > 5",
  "GAS5KG>5": "Gas 5,5 kg > 5",
  "MOBIL>3": "Mobil > 3",
  "MOTOR>4": "Motor > 4",
  "MOTOR<1JT": "Motor < 1JT",
  "LAHAN>5": "Lahan > 5",
  "LAHAN<10JT": "Lahan < 10JT",
  "RUMAH>2": "Rumah > 2",
  "RUMAH<10JT": "Rumah < 10JT",
};

const getOutlierTabLabel = (sheetName: string) => OUTLIER_TAB_LABELS[sheetName] || sheetName;

// Data types
type SortKey = "idsls" | "nama_ppl" | "nama_pml" | "kecamatan" | "nama_usaha" | "nama_komersial" | "alamat" | "pendapatan" | "pengeluaran";
type Direction = "asc" | "desc";

interface OutlierRow {
  idsls: string;
  nama_ppl: string;
  nama_pml: string;
  kecamatan: string;
  desa: string;
  alamat: string;
  nama_usaha: string;
  nama_keluarga: string;
  nama_komersial: string;
  pendapatan: number;
  pengeluaran: number;
  link: string;
  tindak_lanjut: string;
  catatan: string;
  rowNumber: number;
  raw: string[];
}

interface TkDibayarRow {
  idsls: string;
  nama_ppl: string;
  nama_pml: string;
  kecamatan: string;
  desa: string;
  alamat: string;
  nama_usaha: string;
  footer_text: string;
  link: string;
  tindak_lanjut: string;
  catatan: string;
  rowNumber: number;
  raw: string[];
}

// Helper functions
const formatNumber = (num: number | string): string => {
  if (typeof num === "string") {
    const parsed = parseFloat(num);
    return isNaN(parsed) ? num : formatNumber(parsed);
  }
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const normalizeKecamatan = (value: string) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,/\\-]+/g, " ")
    .replace(/\b(?:kecamatan|kec|kabupaten|kab|kota)\b/gi, " ")
    .replace(/\s+\d+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const kecamatanFromRole = (role: string) => {
  const match = role.match(/(?:pj\s+kecamatan|pml)\s+(.+)/i);
  if (!match) return [];
  return match[1]
    .split(/\s*(?:,|;|\s+dan\s+|\s+&\s+)\s*/i)
    .map((item) => normalizeKecamatan(item))
    .filter(Boolean);
};

const isSameKecamatan = (a: string, b: string) =>
  normalizeKecamatan(a) === normalizeKecamatan(b);

const parseOutlierData = (rows: string[][] | any): OutlierRow[] => {
  if (!rows || !Array.isArray(rows) || rows.length <= 1) return [];

  const headers = Array.isArray(rows[0]) ? rows[0] : [];
  
  // Ensure headers is an array of strings
  if (!Array.isArray(headers) || headers.length === 0) return [];

  // Find column indices dynamically
  const findCol = (name: string): number => {
    if (!Array.isArray(headers)) return -1;
    return headers.findIndex(h => {
      const headerStr = String(h || "").toLowerCase().trim();
      const searchStr = name.toLowerCase().trim();
      return headerStr.includes(searchStr);
    });
  };
  
  const idslsIdx = findCol("idsls") >= 0 ? findCol("idsls") : 0;
  const namaKeluargaIdx = 1;
  const pplIdx = 16;
  const pmlIdx = 17;
  const kecIdx = findCol("kecamatan") >= 0 ? findCol("kecamatan") : 3;
  const desaIdx = findCol("desa") >= 0 ? findCol("desa") : 4;
  const alamatIdx = findCol("alamat") >= 0 ? findCol("alamat") : 4;
  const usahaIdx = 6;
  const komersialIdx = 7;
  const pendapatanIdx = 9;
  const pengeluaranIdx = 10;
  const tindakLanjutIdx = 11;
  const catatanIdx = 12;
  const linkIdx = 13;

  return rows.slice(1).map((row, idx) => {
    // Ensure row is an array
    if (!Array.isArray(row)) {
      return null;
    }

    const idsls = String(row[idslsIdx] || `SLS-${idx + 1}`).trim();
    const nama_ppl = String(row[pplIdx] || "-").trim();
    const nama_pml = String(row[pmlIdx] || "-").trim();
    const kecamatan = String(row[kecIdx] || "-").trim();
    const desa = String(row[desaIdx] || "-").trim();
    const alamat = String(row[alamatIdx] || "-").trim();
    const nama_usaha = String(row[usahaIdx] || "-").trim();
    const nama_keluarga = String(row[namaKeluargaIdx] || "-").trim();
    const nama_komersial = String(row[komersialIdx] || "-").trim();
    const pendapatan = parseFloat(String(row[pendapatanIdx] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const pengeluaran = parseFloat(String(row[pengeluaranIdx] || "0").replace(/[^0-9.-]/g, "")) || 0;
    const link = String(row[linkIdx] || "").trim();
    const tindak_lanjut = String(row[tindakLanjutIdx] || "").trim();
    const catatan = String(row[catatanIdx] || "-").trim();

    return {
      idsls,
      nama_ppl,
      nama_pml,
      kecamatan,
      desa,
      alamat,
      nama_usaha,
      nama_keluarga,
      nama_komersial,
      pendapatan,
      pengeluaran,
      link,
      tindak_lanjut,
      catatan,
      rowNumber: idx + 2,
      raw: row,
    };
  }).filter((row): row is OutlierRow => row !== null && row.idsls && row.idsls !== "-");
};

const parseTkDibayarData = (rows: string[][] | any): TkDibayarRow[] => {
  if (!rows || !Array.isArray(rows) || rows.length <= 1) return [];

  const headers = Array.isArray(rows[0]) ? rows[0] : [];
  if (!Array.isArray(headers) || headers.length === 0) return [];

  const findCol = (name: string): number => {
    return headers.findIndex((h: any) => {
      const headerStr = String(h || "").toLowerCase().trim();
      const searchStr = name.toLowerCase().trim();
      return headerStr.includes(searchStr);
    });
  };

  const idslsIdx = findCol("idsls") >= 0 ? findCol("idsls") : 4;
  const kecIdx = findCol("kecamatan") >= 0 ? findCol("kecamatan") : 1;
  const desaIdx = findCol("desa") >= 0 ? findCol("desa") : 2;
  const alamatIdx = findCol("alamat") >= 0 ? findCol("alamat") : 3;
  const usahaIdx = 6; // kolom G = nama_usaha
  const linkIdx = 13; // kolom N = link/assignment_id
  const tindakLanjutIdx = findCol("tindak lanjut") >= 0 ? findCol("tindak lanjut") : 14;
  const catatanIdx = findCol("catatan") >= 0 ? findCol("catatan") : 15;

  return rows.slice(1).map((row: any, idx: number) => {
    if (!Array.isArray(row)) return null;

    const idsls = String(row[idslsIdx] || `TK-${idx + 1}`).trim();
    const kecamatan = String(row[kecIdx] || "-").trim();
    const desa = String(row[desaIdx] || "-").trim();
    const alamat = String(row[alamatIdx] || "-").trim();
    const nama_usaha = String(row[usahaIdx] || "-").trim();
    const footer_text = String(row[0] || "").trim();
    const link = String(row[linkIdx] || "").trim();
    const tindak_lanjut = String(row[tindakLanjutIdx] || "").trim();
    const catatan = String(row[catatanIdx] || "-").trim();

    return {
      idsls,
      nama_ppl: "",
      nama_pml: "",
      kecamatan,
      desa,
      alamat,
      nama_usaha,
      footer_text,
      link,
      tindak_lanjut,
      catatan,
      rowNumber: idx + 2,
      raw: row,
    };
  }).filter((row): row is TkDibayarRow => row !== null && row.idsls && row.idsls !== "-");
};

const compareValues = (
  a: any,
  b: any,
  key: SortKey,
  direction: Direction
): number => {
  const aVal =
    key === "idsls" || key === "nama_ppl" || key === "nama_pml" || key === "kecamatan" || key === "alamat"
      ? String(a[key]).toLowerCase()
      : Number(a[key]);
  const bVal =
    key === "idsls" || key === "nama_ppl" || key === "nama_pml" || key === "kecamatan" || key === "alamat"
      ? String(b[key]).toLowerCase()
      : Number(b[key]);

  let result = 0;
  if (typeof aVal === "number" && typeof bVal === "number") {
    result = aVal - bVal;
  } else {
    result = String(aVal).localeCompare(String(bVal), "id");
  }

  return direction === "asc" ? result : -result;
};

const SortHead = ({
  label,
  active,
  direction,
  onClick,
  numeric = true,
}: {
  label: string;
  active: boolean;
  direction: Direction;
  onClick: () => void;
  numeric?: boolean;
}): JSX.Element => (
  <TableHead
    onClick={onClick}
    className="cursor-pointer select-none whitespace-normal break-words px-1 sm:px-2 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-slate-700 align-middle hover:bg-slate-100 transition-colors"
  >
    <span className="inline-flex items-center justify-center gap-1">
      {label}
      <ArrowUpDown
        className={`h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 ${
          active ? "text-sky-600" : "text-slate-300"
        }`}
      />
      {active && (
        <span className="text-[8px] sm:text-[10px]">
          {direction === "asc" ? "▲" : "▼"}
        </span>
      )}
    </span>
  </TableHead>
);

export default function OutlierSE26() {
  const { user } = useAuth();
  const { toast } = useToast();
  const role = String(user?.role || "").toLowerCase();
  const allowedKecamatan = kecamatanFromRole(role);
  const isPmlUser = role.startsWith("pml ");
  const { data: rawData, loading, error } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: PRODUKSI_SHEET,
  });
  const { data: tkDibayarRawData, loading: tkLoading, error: tkError } = useGoogleSheetsData({
    spreadsheetId: SPREADSHEET_ID,
    sheetName: TK_DIBAYAR_SHEET,
  });
  const { data: verifikasiData } = useGoogleSheetsData({
    spreadsheetId: VERIFIKASI_SPREADSHEET_ID,
    sheetName: "6-KECAP",
  });

  // Debug log raw data
  React.useEffect(() => {
    console.log("🔍 OutlierSE26 - Raw Data Debug:", {
      hasData: !!rawData,
      isArray: Array.isArray(rawData),
      length: Array.isArray(rawData) ? rawData.length : "N/A",
      loading,
      error,
      sample: Array.isArray(rawData) ? rawData.slice(0, 3) : rawData,
    });
  }, [rawData, loading, error]);

  // State management
  const [activeTab, setActiveTab] = useState("produksi");
  const [search, setSearch] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("idsls");
  const [sortDir, setSortDir] = useState<Direction>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [rowEdits, setRowEdits] = useState<Record<number, { tindak_lanjut?: string; catatan?: string }>>({});
  const [tkRowEdits, setTkRowEdits] = useState<Record<number, { tindak_lanjut?: string; catatan?: string }>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Parse and process data
  const outlierRows = useMemo(() => {
    try {
      if (!rawData) {
        console.log("No raw data received");
        return [];
      }
      
      // The sheet hook returns objects keyed by normalized column labels.
      const firstRow = rawData[0];
      if (!firstRow) return [];
      const dataArray = Array.isArray(firstRow)
        ? rawData
        : [
            Object.keys(firstRow).filter((key) => !key.startsWith("__")),
            ...rawData.map((row: any) =>
              Object.keys(firstRow)
                .filter((key) => !key.startsWith("__"))
                .map((key) => row?.[key] ?? "")
            ),
          ];
      console.log("Raw data received:", { length: dataArray.length, firstRow: dataArray[0] });

      const parsed = parseOutlierData(dataArray);
      const personnelById = new Map<string, { namaPpl: string; namaPml: string }>();
      (verifikasiData || []).forEach((row: any) => {
        const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
        const id = String(rawRow[0] ?? row?.idsubsls ?? "").trim();
        if (!id) return;
        personnelById.set(id, {
          namaPpl: String(rawRow[16] ?? "").trim(),
          namaPml: String(rawRow[17] ?? "").trim(),
        });
      });

      const resolved = parsed.map((row) => {
        const personnel = personnelById.get(row.idsls);
        return personnel
          ? { ...row, nama_ppl: personnel.namaPpl || row.nama_ppl, nama_pml: personnel.namaPml || row.nama_pml }
          : row;
      });
      console.log("Parsed outlier rows:", resolved.length);
      return resolved;
    } catch (err) {
      console.error("Error parsing outlier data:", err);
      return [];
    }
  }, [rawData, verifikasiData]);

  const tkDibayarRows = useMemo(() => {
    try {
      if (!tkDibayarRawData) return [];

      const firstRow = tkDibayarRawData[0];
      if (!firstRow) return [];

      const dataArray = Array.isArray(firstRow)
        ? tkDibayarRawData
        : [
            Object.keys(firstRow).filter((key) => !key.startsWith("__")),
            ...tkDibayarRawData.map((row: any) =>
              Object.keys(firstRow)
                .filter((key) => !key.startsWith("__"))
                .map((key) => row?.[key] ?? "")
            ),
          ];

      const parsed = parseTkDibayarData(dataArray);
      const personnelById = new Map<string, { namaPpl: string; namaPml: string }>();
      (verifikasiData || []).forEach((row: any) => {
        const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
        const id = String(rawRow[0] ?? row?.idsubsls ?? "").trim();
        if (!id) return;
        personnelById.set(id, {
          namaPpl: String(rawRow[16] ?? "").trim(),
          namaPml: String(rawRow[17] ?? "").trim(),
        });
      });

      return parsed.map((row) => {
        const personnel = personnelById.get(row.idsls);
        return personnel
          ? { ...row, nama_ppl: personnel.namaPpl || row.nama_ppl, nama_pml: personnel.namaPml || row.nama_pml }
          : row;
      });
    } catch (err) {
      console.error("Error parsing TK dibayar data:", err);
      return [];
    }
  }, [tkDibayarRawData, verifikasiData]);

  useEffect(() => {
    if (!isPmlUser || allowedKecamatan.length === 0) return;

    const currentAllowed =
      kecamatanFilter === "all" ||
      allowedKecamatan.some((value) => isSameKecamatan(value, kecamatanFilter));
    if (!currentAllowed) setKecamatanFilter("all");
  }, [isPmlUser, allowedKecamatan, kecamatanFilter]);

  // Filter rows
  const effectiveKecamatanFilter =
    isPmlUser && allowedKecamatan.length > 0
      ? (kecamatanFilter === "all" || allowedKecamatan.some((value) => isSameKecamatan(value, kecamatanFilter)) ? kecamatanFilter : "all")
      : kecamatanFilter;

  const getFooterTextFromColumnA = (sheetData: any[] | null | undefined) => {
    if (!Array.isArray(sheetData) || sheetData.length <= 1) return "";

    for (const row of sheetData.slice(1)) {
      if (Array.isArray(row)) {
        const value = String(row[0] ?? "").trim();
        if (value) return value;
      }

      if (row && typeof row === "object") {
        const rawRow = Array.isArray(row.__rawRow) ? row.__rawRow : [];
        const value = String(rawRow[0] ?? "").trim();
        if (value) return value;
      }
    }

    return "";
  };

  const productionFooterText = useMemo(() => getFooterTextFromColumnA(rawData), [rawData]);
  const tkFooterText = useMemo(() => getFooterTextFromColumnA(tkDibayarRawData), [tkDibayarRawData]);

  const filteredRows = useMemo(() => {
    return outlierRows.filter((row) => {
      const needle = search.toLowerCase();
      const status = rowEdits[row.rowNumber]?.tindak_lanjut ?? row.tindak_lanjut;
      const rowMatchesRole =
        !isPmlUser ||
        allowedKecamatan.length === 0 ||
        allowedKecamatan.some((value) => isSameKecamatan(value, row.kecamatan));
      return (
        rowMatchesRole &&
        (!needle ||
          row.idsls.toLowerCase().includes(needle) ||
          row.nama_ppl.toLowerCase().includes(needle) ||
          row.nama_pml.toLowerCase().includes(needle) ||
          row.kecamatan.toLowerCase().includes(needle)) &&
        (effectiveKecamatanFilter === "all" || isSameKecamatan(row.kecamatan, effectiveKecamatanFilter)) &&
        (statusFilter === "all" || status === statusFilter)
      );
    });
  }, [outlierRows, search, effectiveKecamatanFilter, statusFilter, rowEdits, isPmlUser, allowedKecamatan]);

  const filteredTkRows = useMemo(() => {
    return tkDibayarRows.filter((row) => {
      const needle = search.toLowerCase();
      const status = tkRowEdits[row.rowNumber]?.tindak_lanjut ?? row.tindak_lanjut;
      const rowMatchesRole =
        !isPmlUser ||
        allowedKecamatan.length === 0 ||
        allowedKecamatan.some((value) => isSameKecamatan(value, row.kecamatan));
      return (
        rowMatchesRole &&
        (!needle ||
          row.idsls.toLowerCase().includes(needle) ||
          row.nama_ppl.toLowerCase().includes(needle) ||
          row.nama_pml.toLowerCase().includes(needle) ||
          row.kecamatan.toLowerCase().includes(needle) ||
          row.nama_usaha.toLowerCase().includes(needle) ||
          row.alamat.toLowerCase().includes(needle)) &&
        (effectiveKecamatanFilter === "all" || isSameKecamatan(row.kecamatan, effectiveKecamatanFilter)) &&
        (statusFilter === "all" || status === statusFilter)
      );
    });
  }, [tkDibayarRows, search, effectiveKecamatanFilter, statusFilter, tkRowEdits, isPmlUser, allowedKecamatan]);

  const kecamatanOptions = useMemo(() => {
    const options = Array.from(new Set(outlierRows.map((row) => row.kecamatan).filter(Boolean))).sort((a, b) => a.localeCompare(b, "id"));
    if (isPmlUser && allowedKecamatan.length > 0) {
      return options.filter((kecamatan) =>
        allowedKecamatan.some((value) => isSameKecamatan(value, kecamatan)),
      );
    }
    return options;
  }, [outlierRows, isPmlUser, allowedKecamatan]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) =>
      compareValues(a, b, sortKey, sortDir)
    );
  }, [filteredRows, sortKey, sortDir]);

  const sortedTkRows = useMemo(() => {
    return [...filteredTkRows].sort((a, b) => {
      const aValue = `${a.kecamatan} ${a.desa}`.toLowerCase();
      const bValue = `${b.kecamatan} ${b.desa}`.toLowerCase();
      const result = aValue.localeCompare(bValue, "id");
      return result;
    });
  }, [filteredTkRows]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = sortedRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const visibleTkRows = sortedTkRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [search, kecamatanFilter, statusFilter, pageSize]);

  const toggleSort = (key: SortKey) => {
    setSortKey(key);
    setSortDir((current) =>
      sortKey === key ? (current === "asc" ? "desc" : "asc") : "asc"
    );
  };

  const downloadExcel = () => {
    const headers = [
      "No",
      "Kecamatan",
      "Alamat",
      "Nama Usaha",
      "Nama Keluarga",
      "Link",
      "Tindak Lanjut",
      "Catatan",
      "Nama PPL",
      "Nama PML",
    ];

    const rowsForExport = sortedRows.map((row, index) => [
      index + 1,
      `${row.kecamatan}\n${row.desa}`,
      row.alamat,
      row.nama_usaha,
      row.nama_keluarga,
      row.link,
      row.tindak_lanjut,
      row.catatan,
      row.nama_ppl,
      row.nama_pml,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsForExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outlier Produksi");

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 30 },
      { wch: 28 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    XLSX.writeFile(
      workbook,
      `Outlier_SE26_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const updateRow = async (row: OutlierRow, column: "L" | "M", value: string) => {
    const field = column === "L" ? "tindak_lanjut" : "catatan";
    setRowEdits((current) => ({ ...current, [row.rowNumber]: { ...current[row.rowNumber], [field]: value } }));
    setSavingRow(row.rowNumber);
    try {
      const { error: updateError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "batch-update",
          updates: [{ range: `'${PRODUKSI_SHEET}'!${column}${row.rowNumber}`, values: [[value]] }],
        },
      });
      if (updateError) throw updateError;
      row.raw[column === "L" ? 11 : 12] = value;
      toast({ title: "Tersimpan", description: "Perubahan berhasil direkam ke Google Sheet." });
    } catch (updateError: any) {
      setRowEdits((current) => {
        const next = { ...current };
        const previous = { ...next[row.rowNumber] };
        delete previous[field];
        next[row.rowNumber] = previous;
        return next;
      });
      toast({ title: "Gagal menyimpan", description: updateError?.message || String(updateError), variant: "destructive" });
    } finally {
      setSavingRow(null);
    }
  };

  const updateTkRow = async (row: TkDibayarRow, column: "O" | "P", value: string) => {
    const field = column === "O" ? "tindak_lanjut" : "catatan";
    setTkRowEdits((current) => ({ ...current, [row.rowNumber]: { ...current[row.rowNumber], [field]: value } }));
    setSavingRow(row.rowNumber);
    try {
      const { error: updateError } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "batch-update",
          updates: [{ range: `'${TK_DIBAYAR_SHEET}'!${column}${row.rowNumber}`, values: [[value]] }],
        },
      });
      if (updateError) throw updateError;
      row.raw[column === "O" ? 14 : 15] = value;
      toast({ title: "Tersimpan", description: "Perubahan berhasil direkam ke Google Sheet." });
    } catch (updateError: any) {
      setTkRowEdits((current) => {
        const next = { ...current };
        const previous = { ...next[row.rowNumber] };
        delete previous[field];
        next[row.rowNumber] = previous;
        return next;
      });
      toast({ title: "Gagal menyimpan", description: updateError?.message || String(updateError), variant: "destructive" });
    } finally {
      setSavingRow(null);
    }
  };

  return (
    <div className="w-full max-w-none space-y-4 sm:space-y-6 py-3 sm:py-6 px-2 sm:px-0">
      <Card className="w-full max-w-none border-0 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-slate-50 px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Outlier SE2026</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Analisis data outlier Sensus Ekonomi 2026 berdasarkan produksi usaha
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="w-full p-3 sm:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 sm:mb-5 grid h-auto w-full max-w-none grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs sm:grid-cols-3 sm:text-sm lg:grid-cols-6 xl:grid-cols-9">
              <TabsTrigger value="produksi" className="min-h-9 whitespace-normal px-2 py-1.5 text-center leading-tight">
                Produksi &lt; 1Juta
              </TabsTrigger>
              <TabsTrigger value="tk-dibayar" className="min-h-9 whitespace-normal px-2 py-1.5 text-center leading-tight">
                Tenaga Kerja dibayar
              </TabsTrigger>
              {GENERIC_OUTLIER_TABS.map(([sheetName]) => (
                <TabsTrigger key={sheetName} value={sheetName} className="min-h-9 whitespace-normal px-2 py-1.5 text-center leading-tight">
                  {getOutlierTabLabel(sheetName)}
                </TabsTrigger>
              ))}
            </TabsList>

            {GENERIC_OUTLIER_TABS.map(([sheetName, description]) => (
              <TabsContent key={sheetName} value={sheetName} className="mt-0">
                <OutlierGenericTab
                  spreadsheetId={SPREADSHEET_ID}
                  verifikasiSpreadsheetId={VERIFIKASI_SPREADSHEET_ID}
                  verifikasiSheetName="6-KECAP"
                  sheetName={sheetName}
                  title={getOutlierTabLabel(sheetName)}
                  description={description}
                  active={activeTab === sheetName}
                  isPmlUser={isPmlUser}
                  allowedKecamatan={allowedKecamatan}
                />
              </TabsContent>
            ))}

            {(activeTab === "produksi" || activeTab === "tk-dibayar") && (
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari ID SLS, nama PPL/PML, atau kecamatan..."
                  className="pl-9 text-xs sm:text-sm h-9 sm:h-10 w-full"
                />
              </div>

              <select
                value={effectiveKecamatanFilter}
                onChange={(e) => setKecamatanFilter(e.target.value)}
                className="h-9 sm:h-10 min-w-[150px] rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
                disabled={isPmlUser && allowedKecamatan.length > 0}
              >
                {!isPmlUser && <option value="all">Semua Kecamatan</option>}
                {kecamatanOptions.map((kecamatan) => (
                  <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 sm:h-10 min-w-[150px] rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
              >
                <option value="all">Semua Status</option>
                <option value="">Belum ditindaklanjuti</option>
                <option value="Diperbaiki">Diperbaiki</option>
                <option value="Tidak diperbaiki">Tidak diperbaiki</option>
              </select>

              {user?.role === "Pejabat Pembuat Komitmen" && (
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
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-9 sm:h-10 min-w-[90px] rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-xs sm:text-sm text-slate-700"
              >
                <option value="10">10/hal</option>
                <option value="20">20/hal</option>
                <option value="50">50/hal</option>
                <option value="100">100/hal</option>
              </select>
            </div>
            )}

            {(activeTab === "produksi" || activeTab === "tk-dibayar") && (
            <div className="mb-4 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-3 sm:p-4 shadow-sm">
              {activeTab === "produksi" ? (
                <p className="text-xs sm:text-sm leading-6 text-slate-800">
                  <span className="font-bold text-violet-700">Produksi &lt; 1Juta</span>{" "}
                  <span className="text-slate-700">— Outlier usaha non pertanian yang nilai produksinya berada di bawah Rp1.000.000, sehingga masuk kategori usaha dengan skala produksi sangat kecil dan berpotensi tidak mewakili aktivitas ekonomi yang sebenarnya. Data ini dicermati untuk melihat apakah usaha tersebut memang masih berjalan secara riil atau justru merupakan entitas yang belum berkembang secara optimal.</span>
                  <span className="ml-2 font-semibold text-violet-700">{filteredRows.length} record</span>
                </p>
              ) : (
                <p className="text-xs sm:text-sm leading-6 text-slate-800">
                  <span className="font-bold text-sky-700">Tenaga Kerja dibayar</span>{" "}
                  <span className="text-slate-700">— Outlier tenaga kerja yang hanya berjumlah 1 orang tetapi tetap tercatat menerima upah, sehingga berpotensi menunjukkan bahwa pemilik usaha juga berperan sebagai pekerja yang dibayar. Kondisi ini perlu ditinjau karena pemilik usaha tidak seharusnya masuk kategori tenaga kerja dibayar bila ia merupakan satu-satunya pengelola usaha yang juga menjalankan operasionalnya.</span>
                  <span className="ml-2 font-semibold text-sky-700">{filteredTkRows.length} record</span>
                </p>
              )}
            </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-slate-500">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin shrink-0" />
                Memuat data...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-rose-600">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                {String(error)}
              </div>
            ) : outlierRows.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12 sm:py-16 text-xs sm:text-base text-slate-500">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Tidak ada data tersedia atau data gagal diproses
              </div>
            ) : (
              <>
                <TabsContent value="produksi" className="mt-0">
                  <div className="-mx-3 w-full sm:mx-0 overflow-x-auto rounded-none sm:rounded-lg border-0 sm:border border-slate-200">
                    <Table className="w-full table-fixed min-w-[1200px] sm:min-w-[1400px]">
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-8 sm:w-12 text-center align-middle text-xs sm:text-sm px-1 sm:px-2">
                            No
                          </TableHead>
                          <SortHead
                            label="Kecamatan"
                            active={sortKey === "kecamatan"}
                            direction={sortDir}
                            onClick={() => toggleSort("kecamatan")}
                            numeric={false}
                          />
                          <SortHead
                            label="Alamat"
                            active={sortKey === "alamat"}
                            direction={sortDir}
                            onClick={() => toggleSort("alamat")}
                            numeric={false}
                          />
                          <TableHead className="w-[150px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                            Nama Keluarga
                          </TableHead>
                          <SortHead
                            label="Nama Usaha"
                            active={sortKey === "nama_usaha"}
                            direction={sortDir}
                            onClick={() => toggleSort("nama_usaha")}
                            numeric={false}
                          />
                          <TableHead className="w-[70px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                            Link
                          </TableHead>
                          <TableHead className="w-[150px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                            Tindak Lanjut
                          </TableHead>
                          <TableHead className="w-[280px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                            Catatan
                          </TableHead>
                          <TableHead className="w-[280px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">
                            Nama PPL / PML
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleRows.map((row, idx) => (
                          <TableRow key={`${row.idsls}-${(page - 1) * pageSize + idx}`} className="border-b hover:bg-slate-50">
                            <TableCell className="text-center text-xs sm:text-sm text-slate-500">
                              {(page - 1) * pageSize + idx + 1}
                            </TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                              <div>{row.kecamatan || "-"}</div>
                              <div className="text-[10px] text-slate-500">{row.desa || "-"}</div>
                            </TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                              {row.alamat || "-"}
                            </TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                              {row.nama_keluarga || "-"}
                            </TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                              <div>{row.nama_usaha}</div>
                              <div className="text-[10px] text-slate-500">{row.nama_komersial || "-"}</div>
                            </TableCell>
                            <TableCell className="text-center px-1 sm:px-2 py-2 sm:py-3">
                              {row.link ? <a href={row.link} target="_blank" rel="noreferrer" title="Buka link" className="inline-flex text-sky-600 hover:text-sky-800"><ExternalLink className="h-4 w-4" /></a> : "-"}
                            </TableCell>
                            <TableCell className="px-1 sm:px-2 py-2 sm:py-3">
                              <select
                                value={rowEdits[row.rowNumber]?.tindak_lanjut ?? row.tindak_lanjut}
                                disabled={savingRow === row.rowNumber}
                                onChange={(event) => updateRow(row, "L", event.target.value)}
                                className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-xs"
                              >
                                <option value="">Pilih</option>
                                <option value="Diperbaiki">Diperbaiki</option>
                                <option value="Tidak diperbaiki">Tidak diperbaiki</option>
                              </select>
                            </TableCell>
                            <TableCell className="px-1 sm:px-2 py-2 sm:py-3">
                              <Input
                                value={rowEdits[row.rowNumber]?.catatan ?? (row.catatan === "-" ? "" : row.catatan)}
                                disabled={savingRow === row.rowNumber}
                                onChange={(event) => setRowEdits((current) => ({ ...current, [row.rowNumber]: { ...current[row.rowNumber], catatan: event.target.value } }))}
                                onBlur={(event) => updateRow(row, "M", event.target.value)}
                                placeholder="Tulis catatan..."
                                className="h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm">
                              <div>{row.nama_ppl || "-"}</div>
                              <div className="text-[10px] text-slate-500">{row.nama_pml || "-"}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={10} className="text-left text-xs sm:text-sm font-medium text-slate-700 px-2 py-2">
                            Jumlah Nama Usaha = {sortedRows.length} terindikasi sebagai outlier
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="text-slate-600">
                      Menampilkan {Math.max(0, (page - 1) * pageSize + 1)} -
                      {Math.min(page * pageSize, sortedRows.length)} dari{" "}
                      {sortedRows.length} data
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="px-2 py-1.5 sm:px-3 sm:py-2 rounded border border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 text-xs sm:text-sm"
                      >
                        Sebelumnya
                      </button>
                      <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm">
                        Hal {page} dari {totalPages}
                      </div>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="px-2 py-1.5 sm:px-3 sm:py-2 rounded border border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 text-xs sm:text-sm"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tk-dibayar" className="mt-0">
                  <div className="-mx-3 w-full sm:mx-0 overflow-x-auto rounded-none sm:rounded-lg border-0 sm:border border-slate-200">
                    <Table className="w-full table-fixed min-w-[1200px] sm:min-w-[1300px]">
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-10 text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">No</TableHead>
                          <TableHead className="w-[180px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Kecamatan</TableHead>
                          <TableHead className="w-[220px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Alamat</TableHead>
                          <TableHead className="w-[220px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Nama Usaha</TableHead>
                          <TableHead className="w-[70px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Link</TableHead>
                          <TableHead className="w-[150px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Tindak Lanjut</TableHead>
                          <TableHead className="w-[280px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Catatan</TableHead>
                          <TableHead className="w-[280px] text-center text-xs sm:text-sm px-1 sm:px-2 py-2 sm:py-3">Nama PPL / PML</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleTkRows.map((row, idx) => (
                          <TableRow key={`${row.idsls}-${(page - 1) * pageSize + idx}`} className="border-b hover:bg-slate-50 align-top">
                            <TableCell className="text-center text-xs sm:text-sm text-slate-500 align-top">{(page - 1) * pageSize + idx + 1}</TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm align-top">
                              <div>{row.kecamatan || "-"}</div>
                              <div className="text-[10px] text-slate-500">{row.desa || "-"}</div>
                            </TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm align-top">{row.alamat || "-"}</TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm align-top">
                              <div>{row.nama_usaha || "-"}</div>
                              {row.footer_text && <div className="mt-1 text-[10px] text-slate-500">{row.footer_text}</div>}
                            </TableCell>
                            <TableCell className="text-center px-1 sm:px-2 py-2 sm:py-3 align-top">
                              {row.link ? <a href={row.link} target="_blank" rel="noreferrer" title="Buka link" className="inline-flex text-sky-600 hover:text-sky-800"><ExternalLink className="h-4 w-4" /></a> : "-"}
                            </TableCell>
                            <TableCell className="px-1 sm:px-2 py-2 sm:py-3 align-top">
                              <select
                                value={tkRowEdits[row.rowNumber]?.tindak_lanjut ?? row.tindak_lanjut}
                                disabled={savingRow === row.rowNumber}
                                onChange={(event) => updateTkRow(row, "O", event.target.value)}
                                className="h-8 w-full rounded border border-slate-300 bg-white px-1 text-xs"
                              >
                                <option value="">Pilih</option>
                                <option value="Diperbaiki">Diperbaiki</option>
                                <option value="Tidak diperbaiki">Tidak diperbaiki</option>
                              </select>
                            </TableCell>
                            <TableCell className="px-1 sm:px-2 py-2 sm:py-3 align-top">
                              <Input
                                value={tkRowEdits[row.rowNumber]?.catatan ?? (row.catatan === "-" ? "" : row.catatan)}
                                disabled={savingRow === row.rowNumber}
                                onChange={(event) => setTkRowEdits((current) => ({ ...current, [row.rowNumber]: { ...current[row.rowNumber], catatan: event.target.value } }))}
                                onBlur={(event) => updateTkRow(row, "P", event.target.value)}
                                placeholder="Tulis catatan..."
                                className="h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell className="break-words px-1 sm:px-2 py-2 sm:py-3 text-xs sm:text-sm align-top"><div>{row.nama_ppl || "-"}</div><div className="text-[10px] text-slate-500">{row.nama_pml || "-"}</div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={9} className="px-2 py-2" />
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="text-slate-600">
                      Menampilkan {Math.max(0, (page - 1) * pageSize + 1)} -
                      {Math.min(page * pageSize, sortedTkRows.length)} dari {sortedTkRows.length} data
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="px-2 py-1.5 sm:px-3 sm:py-2 rounded border border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 text-xs sm:text-sm"
                      >
                        Sebelumnya
                      </button>
                      <div className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm">
                        Hal {page} dari {Math.max(1, Math.ceil(sortedTkRows.length / pageSize))}
                      </div>
                      <button
                        onClick={() => setPage(Math.min(Math.max(1, Math.ceil(sortedTkRows.length / pageSize)), page + 1))}
                        disabled={page >= Math.max(1, Math.ceil(sortedTkRows.length / pageSize))}
                        className="px-2 py-1.5 sm:px-3 sm:py-2 rounded border border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 text-xs sm:text-sm"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
