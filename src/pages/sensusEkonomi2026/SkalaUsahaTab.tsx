import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";

const SKALA_USAHA_SPREADSHEET_ID = "1_LNMJ2NSujoSegGQgG4jkLCR0GFHgP6PNHeQjp6WSCo";
const SKALA_USAHA_SHEET = "SKALA USAHA";

const parseNumericValue = (value: unknown): number => {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeColumnKey = (key: string): string =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeSheetKey = (value: unknown): string => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 16 ? digits.slice(-16) : "";
};

const getRowValue = (row: any, primaryName: string, fallbackNames: string[] = [], defaultValue: string = ""): string => {
  if (!row || typeof row !== "object") return defaultValue;

  const normalizedMap: Record<string, any> = {};
  const lowerMap: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    const normalizedKey = normalizeColumnKey(key);
    if (normalizedKey) normalizedMap[normalizedKey] = row[key];
    lowerMap[String(key).toLowerCase()] = row[key];
  });

  const tryKeys = [primaryName, ...fallbackNames];
  for (const key of tryKeys) {
    const normalizedKey = normalizeColumnKey(key);
    const rawKeyLower = String(key).toLowerCase();
    if (normalizedKey && normalizedMap[normalizedKey] !== undefined && normalizedMap[normalizedKey] !== null && normalizedMap[normalizedKey] !== "") {
      return String(normalizedMap[normalizedKey]).trim();
    }
    if (rawKeyLower in lowerMap && lowerMap[rawKeyLower] !== undefined && lowerMap[rawKeyLower] !== null && lowerMap[rawKeyLower] !== "") {
      return String(lowerMap[rawKeyLower]).trim();
    }
  }

  return defaultValue;
};

const normalizePersonKey = (value: unknown): string => normalizeColumnKey(String(value ?? ""));
const normalizeKecamatanKey = (value: unknown): string => normalizeColumnKey(String(value ?? ""));

const getRawColumnText = (row: any, index: number, defaultValue = ""): string => {
  const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
  const value = rawRow[index];
  return value === undefined || value === null ? defaultValue : String(value).trim();
};

const getRawRowId16 = (row: any): string => {
  const rawId = getRawColumnText(row, 0, getRowValue(row, "kode", ["idsubsls", "id sub sls", "kode_sls"], ""));
  return normalizeSheetKey(rawId);
};

const getStackingKey = (row: any): string => {
  const rawKey = getRawColumnText(row, 3, getRowValue(row, "idsubsls", ["id sub sls", "kode", "kode_sls"], ""));
  const normalized = normalizeSheetKey(rawKey);
  if (normalized.length === 16) return normalized;
  const rawRow = Array.isArray(row?.__rawRow) ? row.__rawRow : [];
  const candidate = rawRow.find((value: unknown) => normalizeSheetKey(value).length === 16);
  return normalizeSheetKey(candidate);
};

const getRowNumber = (row: any, primaryName: string, fallbackNames: string[] = [], defaultValue = 0, fallbackIndex?: number): number => {
  const value = getRowValue(row, primaryName, fallbackNames, "");
  if (value) {
    const num = parseNumericValue(value);
    if (num !== 0 || String(value).trim() === "0") return num;
  }
  if (fallbackIndex !== undefined) {
    return parseNumericValue(getRawColumnText(row, fallbackIndex, "0"));
  }
  return defaultValue;
};

type SkalaUsahaRow = {
  id: string;
  nama_ppl: string;
  kecamatan: string;
  sls_code?: string;
  sls_rt?: string;
  prelist_awal: number;
  prelist_usaha: number;
  didata: number;
  bku_usaha_wilkerstat: number;
  prelist_ub: number;
  prelist_um: number;
  prelist_umk: number;
  usaha_bku_didata_ub: number;
  persentase_ub: number;
  usaha_bku_didata_um: number;
  persentase_um: number;
  usaha_bku_didata_umk: number;
  persentase_umk: number;
  tidak_dapat_diklasifikasikan: number;
  total_usaha: number;
};

type SkalaUsahaGroupRow = SkalaUsahaRow & {
  children: SkalaUsahaRow[];
};

type SkalaUsahaTabProps = {
  namaPplByKey: Map<string, string>;
  kecamatanByKey: Map<string, string>;
  prelistAwalByKey: Map<string, number>;
  prelistUsahaByGroupKey: Map<string, number>;
  prelistUsahaByRowKey: Map<string, number>;
  didataByKey: Map<string, number>;
  stackingWilkerstatByKey: Map<string, number>;
};

const SkalaUsahaTab = ({
  namaPplByKey,
  kecamatanByKey,
  prelistAwalByKey,
  prelistUsahaByGroupKey,
    prelistUsahaByRowKey,
  didataByKey,
  stackingWilkerstatByKey,
}: SkalaUsahaTabProps) => {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: SKALA_USAHA_SPREADSHEET_ID,
    sheetName: SKALA_USAHA_SHEET,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [kecamatanFilter, setKecamatanFilter] = useState("all");
  const [sortBy, setSortBy] = useState<keyof SkalaUsahaRow>("nama_ppl");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groupedRows = useMemo<SkalaUsahaGroupRow[]>(() => {
    const groups = new Map<string, SkalaUsahaGroupRow>();

    (data || []).forEach((row: any, index: number) => {
      const rowId = getRawRowId16(row) || getStackingKey(row);
      if (!rowId) return;

      const rawNamaPpl = getRowValue(row, "nama_ppl", ["nama ppl", "nama", "ppl", "nama_ppl"], getRawColumnText(row, 0, "-"));
      const rawKecamatan = getRowValue(row, "kecamatan", ["kecamatan", "nama kecamatan", "desa", "region"], getRawColumnText(row, 1, "-"));
      const namaPpl = (namaPplByKey.get(rowId) || rawNamaPpl || "-").trim();
      const kecamatan = (kecamatanByKey.get(rowId) || rawKecamatan || "-").trim();
      if (!namaPpl || !kecamatan) return;

      const groupKey = `${normalizePersonKey(namaPpl)}||${normalizeKecamatanKey(kecamatan)}`;
      const detailRow: SkalaUsahaRow = {
        id: rowId,
        nama_ppl: namaPpl,
        kecamatan,
        sls_code:
          getRawRowId16(row)
          || getStackingKey(row)
          || (normalizeSheetKey(getRawColumnText(row, 6, "")) || normalizeSheetKey(getRawColumnText(row, 0, "")) || ""),
        sls_rt: getRawColumnText(row, 1, ""),
        prelist_awal: prelistAwalByKey.get(rowId) ?? parseNumericValue(getRawColumnText(row, 2, "0")),
        prelist_usaha: prelistUsahaByRowKey.get(rowId) ?? parseNumericValue(getRawColumnText(row, 3, "0")),
        didata: didataByKey.get(rowId) ?? parseNumericValue(getRawColumnText(row, 4, "0")),
        bku_usaha_wilkerstat: stackingWilkerstatByKey.get(rowId) ?? parseNumericValue(getRawColumnText(row, 5, "0")),
        prelist_ub: parseNumericValue(getRawColumnText(row, 2, "0")),
        prelist_um: parseNumericValue(getRawColumnText(row, 3, "0")),
        prelist_umk: parseNumericValue(getRawColumnText(row, 4, "0")),
        usaha_bku_didata_ub: parseNumericValue(getRawColumnText(row, 6, "0")),
        persentase_ub: parseNumericValue(getRawColumnText(row, 7, "0")),
        usaha_bku_didata_um: parseNumericValue(getRawColumnText(row, 8, "0")),
        persentase_um: parseNumericValue(getRawColumnText(row, 9, "0")),
        usaha_bku_didata_umk: parseNumericValue(getRawColumnText(row, 10, "0")),
        persentase_umk: parseNumericValue(getRawColumnText(row, 11, "0")),
        tidak_dapat_diklasifikasikan: parseNumericValue(getRawColumnText(row, 12, "0")),
        total_usaha: parseNumericValue(getRawColumnText(row, 13, "0")),
      };

      const existing = groups.get(groupKey);
      if (!existing) {
        groups.set(groupKey, {
          ...detailRow,
          id: groupKey,
          prelist_usaha: prelistUsahaByGroupKey.get(groupKey) ?? detailRow.prelist_usaha,
          children: [detailRow],
        });
      } else {
        existing.prelist_awal += detailRow.prelist_awal;
        existing.prelist_usaha = prelistUsahaByGroupKey.get(groupKey) ?? existing.prelist_usaha;
        existing.didata += detailRow.didata;
        existing.bku_usaha_wilkerstat += detailRow.bku_usaha_wilkerstat;
        existing.prelist_ub += detailRow.prelist_ub;
        existing.prelist_um += detailRow.prelist_um;
        existing.prelist_umk += detailRow.prelist_umk;
        existing.usaha_bku_didata_ub += detailRow.usaha_bku_didata_ub;
        existing.usaha_bku_didata_um += detailRow.usaha_bku_didata_um;
        existing.usaha_bku_didata_umk += detailRow.usaha_bku_didata_umk;
        existing.tidak_dapat_diklasifikasikan += detailRow.tidak_dapat_diklasifikasikan;
        existing.total_usaha += detailRow.total_usaha;
        existing.children.push(detailRow);

        existing.persentase_ub = existing.prelist_ub > 0 ? (existing.usaha_bku_didata_ub / existing.prelist_ub) * 100 : 0;
        existing.persentase_um = existing.prelist_um > 0 ? (existing.usaha_bku_didata_um / existing.prelist_um) * 100 : 0;
        existing.persentase_umk = existing.prelist_umk > 0 ? (existing.usaha_bku_didata_umk / existing.prelist_umk) * 100 : 0;
      }
    });

    return Array.from(groups.values());
  }, [data, namaPplByKey, kecamatanByKey, prelistAwalByKey, didataByKey, stackingWilkerstatByKey]);

  const kecamatanOptions = useMemo(() => {
    const values = new Set<string>();
    groupedRows.forEach((row) => {
      const raw = String(row.kecamatan || "").trim();
      if (raw) values.add(raw);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, "id"));
  }, [groupedRows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return groupedRows
      .filter((row) => {
        if (kecamatanFilter !== "all") {
          return String(row.kecamatan || "").toLowerCase() === kecamatanFilter.toLowerCase();
        }
        return true;
      })
      .filter((row) => {
        if (!query) return true;
        return [row.nama_ppl, row.kecamatan]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        }
        return sortOrder === "asc"
          ? String(aValue).localeCompare(String(bValue), "id")
          : String(bValue).localeCompare(String(aValue), "id");
      });
  }, [groupedRows, searchTerm, kecamatanFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const currentPageIndex = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPageIndex - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPageIndex, itemsPerPage]);

  const toggleSort = (field: keyof SkalaUsahaRow) => {
    if (sortBy === field) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">Memuat data skala usaha...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error: {String(error)}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              Tidak ada data skala usaha yang sesuai.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="relative w-full max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari Nama PPL atau Kecamatan..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 h-10 w-full"
                  />
                </div>
                <select
                  aria-label="Filter kecamatan skala usaha"
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
              </div>
              <div className="flex items-center justify-between px-4 py-2 text-sm text-slate-600">
                <div>
                  Menampilkan <span className="font-semibold text-slate-800">{paginatedRows.length.toLocaleString('id-ID')}</span> dari <span className="font-semibold text-slate-800">{filteredRows.length.toLocaleString('id-ID')}</span> hasil
                </div>
                <div>
                  Total keseluruhan: <span className="font-semibold text-slate-800">{groupedRows.length.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 border-b border-slate-300">
                    <TableHead rowSpan={2} className="sticky left-0 z-30 w-12 min-w-[48px] bg-slate-100 text-center text-slate-700 font-semibold">No</TableHead>
                    <TableHead rowSpan={2} onClick={() => toggleSort("nama_ppl")} className="sticky left-12 z-30 w-[180px] min-w-[180px] bg-slate-100 text-slate-700 font-semibold px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-50">
                      Nama PPL
                    </TableHead>
                    <TableHead rowSpan={2} onClick={() => toggleSort("kecamatan")} className="sticky left-[228px] z-30 w-[220px] min-w-[220px] bg-slate-100 text-slate-700 font-semibold px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-50">
                      Kecamatan
                    </TableHead>
                    <TableHead colSpan={4} className="text-center text-slate-700 font-semibold px-4 py-3 border border-slate-300 bg-sky-100">Identitas data dasar</TableHead>
                    <TableHead colSpan={3} className="text-center text-slate-700 font-semibold px-4 py-3 border border-slate-300 bg-emerald-100">Jumlah Prelist</TableHead>
                    <TableHead colSpan={5} className="text-center text-slate-700 font-semibold px-4 py-3 border border-slate-300 bg-amber-100">JUMLAH USAHA BKU DIDATA (CAPI & CAWI)</TableHead>
                  </TableRow>
                  <TableRow className="bg-slate-50">
                    <TableHead onClick={() => toggleSort("prelist_awal")} className="w-[88px] min-w-[88px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">Prelist Awal</TableHead>
                    <TableHead onClick={() => toggleSort("prelist_usaha")} className="w-[88px] min-w-[88px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">Jml Prelist Usaha</TableHead>
                    <TableHead onClick={() => toggleSort("didata")} className="w-[88px] min-w-[88px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">Didata</TableHead>
                    <TableHead onClick={() => toggleSort("bku_usaha_wilkerstat")} className="w-[88px] min-w-[88px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">BKU+ Usaha Wilkerstat</TableHead>
                    <TableHead onClick={() => toggleSort("prelist_ub")} className="w-[72px] min-w-[72px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">UB</TableHead>
                    <TableHead onClick={() => toggleSort("prelist_um")} className="w-[72px] min-w-[72px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">UM</TableHead>
                    <TableHead onClick={() => toggleSort("prelist_umk")} className="w-[72px] min-w-[72px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">UMK</TableHead>
                    <TableHead onClick={() => toggleSort("usaha_bku_didata_ub")} className="w-[88px] min-w-[88px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">UB</TableHead>
                    <TableHead onClick={() => toggleSort("usaha_bku_didata_um")} className="w-[88px] min-w-[88px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">UM</TableHead>
                    <TableHead onClick={() => toggleSort("usaha_bku_didata_umk")} className="w-[88px] min-w-[88px] text-right text-slate-700 font-semibold px-3 py-2 border border-slate-300 cursor-pointer hover:bg-slate-100">UMK</TableHead>
                    <TableHead onClick={() => toggleSort("tidak_dapat_diklasifikasikan")} className="w-[96px] min-w-[96px] text-right text-slate-700 text-[11px] font-semibold px-3 py-2 whitespace-normal cursor-pointer hover:bg-slate-50 border border-slate-300">Tidak Dapat Diklasifikasikan</TableHead>
                    <TableHead onClick={() => toggleSort("total_usaha")} className="w-[96px] min-w-[96px] text-right text-slate-700 text-[12px] font-semibold px-3 py-2 whitespace-nowrap cursor-pointer hover:bg-slate-50 border border-slate-300">Total Usaha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row, index) => {
                    const rowNumber = (currentPageIndex - 1) * itemsPerPage + index + 1;
                    const isExpanded = expandedGroups.has(row.id);
                    const hasChildren = row.children.length > 1;
                    return (
                      <React.Fragment key={row.id}>
                        <TableRow className="hover:bg-slate-50 border-b transition-colors">
                          <TableCell className="sticky left-0 z-20 w-12 min-w-[48px] bg-white text-center text-slate-600 font-medium">{rowNumber}</TableCell>
                          <TableCell className="sticky left-12 z-20 w-[180px] min-w-[180px] bg-white text-slate-700 px-4 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasChildren) return;
                                setExpandedGroups((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(row.id)) next.delete(row.id);
                                  else next.add(row.id);
                                  return next;
                                });
                              }}
                              className={`flex w-full items-center gap-2 text-left ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
                            >
                              {hasChildren ? (
                                isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-slate-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-500" />
                                )
                              ) : (
                                <span className="inline-block h-4 w-4" />
                              )}
                              <span>{row.nama_ppl}</span>
                            </button>
                          </TableCell>
                          <TableCell className="text-slate-700 px-4 py-3 min-w-[220px]">{row.kecamatan}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3">{row.prelist_awal.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3">{row.prelist_usaha.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3">{row.didata.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3">{row.bku_usaha_wilkerstat.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3 border border-slate-200">{row.prelist_ub.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3 border border-slate-200">{row.prelist_um.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3 border border-slate-200">{row.prelist_umk.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3 border border-slate-200">
                            <div>{row.usaha_bku_didata_ub.toLocaleString("id-ID")}</div>
                            <div className="text-xs text-slate-500">{row.persentase_ub.toFixed(2).replace(".", ",")}%</div>
                          </TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3 border border-slate-200">
                            <div>{row.usaha_bku_didata_um.toLocaleString("id-ID")}</div>
                            <div className="text-xs text-slate-500">{row.persentase_um.toFixed(2).replace(".", ",")}%</div>
                          </TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3 border border-slate-200">
                            <div>{row.usaha_bku_didata_umk.toLocaleString("id-ID")}</div>
                            <div className="text-xs text-slate-500">{row.persentase_umk.toFixed(2).replace(".", ",")}%</div>
                          </TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3 border border-slate-200">{row.tidak_dapat_diklasifikasikan.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right text-slate-900 px-4 py-3">{row.total_usaha.toLocaleString("id-ID")}</TableCell>
                        </TableRow>
                        {hasChildren && isExpanded && row.children.map((detail, detailIndex) => (
                          <TableRow key={`${row.id}-detail-${detailIndex}`} className="bg-slate-50 border-b hover:bg-slate-100 transition-colors">
                            <TableCell className="px-4 py-2" />
                            <TableCell className="text-sm text-slate-700 px-4 py-2 italic pl-10">
                              {(detail.sls_code && String(detail.sls_code).length === 16) ? detail.sls_code : `Detail ${detailIndex + 1}`}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 px-4 py-2">
                              {detail.sls_rt || detail.kecamatan}
                            </TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2">{detail.prelist_awal.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2">{detail.prelist_usaha.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2">{detail.didata.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2">{detail.bku_usaha_wilkerstat.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2 border border-slate-200">{detail.prelist_ub.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2 border border-slate-200">{detail.prelist_um.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2 border border-slate-200">{detail.prelist_umk.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2 border border-slate-200">
                              <div>{detail.usaha_bku_didata_ub.toLocaleString("id-ID")}</div>
                              <div className="text-xs text-slate-500">{detail.persentase_ub.toFixed(2).replace(".", ",")}%</div>
                            </TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2 border border-slate-200">
                              <div>{detail.usaha_bku_didata_um.toLocaleString("id-ID")}</div>
                              <div className="text-xs text-slate-500">{detail.persentase_um.toFixed(2).replace(".", ",")}%</div>
                            </TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2 border border-slate-200">
                              <div>{detail.usaha_bku_didata_umk.toLocaleString("id-ID")}</div>
                              <div className="text-xs text-slate-500">{detail.persentase_umk.toFixed(2).replace(".", ",")}%</div>
                            </TableCell>
                            <TableCell className="text-right text-slate-900 text-xs px-3 py-2 border border-slate-200">{detail.tidak_dapat_diklasifikasikan.toLocaleString("id-ID")}</TableCell>
                            <TableCell className="text-right text-slate-900 px-4 py-2">{detail.total_usaha.toLocaleString("id-ID")}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPageIndex === 1}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPageIndex === totalPages}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                  >
                    Berikutnya
                  </button>
                </div>
                <div className="text-sm text-slate-600">
                  Halaman {currentPageIndex} dari {totalPages}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SkalaUsahaTab;
