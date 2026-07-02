import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  AlertCircle,
  Link,
  Eye,
} from "lucide-react";

interface MonitoringLapanganAnomaliTabProps {
  anomaliUsahaData: any[];
  anomaliUsahaLoading: boolean;
  anomaliKeluargaData: any[];
  anomaliKeluargaLoading: boolean;
  anomaliUsahaInfo: string;
  anomaliKeluargaInfo: string;
}

interface AnomaliTableProps {
  data?: any[];
  loading: boolean;
  title: string;
}

interface PendingPPLEntry {
  name: string;
  pendingCount: number;
  totalCount: number;
  completed: number;
  districts: Set<string>;
  kecamatan?: string;
}

interface PendingPPLCardProps {
  entries: PendingPPLEntry[];
  totalPPL: number;
  totalRows: number;
}

type PendingPPLCardSortField = "name" | "kecamatan" | "pendingCount" | "completed" | "pct";
type DistrictSortField = "kecamatan" | "usaha" | "keluarga" | "total" | "completed" | "percent";

const normalizeColumnKey = (key: string): string =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getColumnValue = (obj: any, primaryName: string, fallbackNames: string[] = [], defaultValue: any = "-"): any => {
  if (!obj || typeof obj !== "object") return defaultValue;

  const normalizedMap: Record<string, any> = {};
  const originalLowerMap: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const normalizedKey = normalizeColumnKey(key);
    if (normalizedKey) {
      normalizedMap[normalizedKey] = obj[key];
    }
    originalLowerMap[String(key).toLowerCase()] = obj[key];
  }

  const tryKeys = [primaryName, ...fallbackNames];
  for (const key of tryKeys) {
    const normalizedKey = normalizeColumnKey(key);
    const rawKeyLower = String(key).toLowerCase();

    if (normalizedKey && normalizedMap[normalizedKey] !== undefined && normalizedMap[normalizedKey] !== null && normalizedMap[normalizedKey] !== "") {
      return normalizedMap[normalizedKey];
    }

    if (rawKeyLower in originalLowerMap && originalLowerMap[rawKeyLower] !== undefined && originalLowerMap[rawKeyLower] !== null && originalLowerMap[rawKeyLower] !== "") {
      return originalLowerMap[rawKeyLower];
    }
  }

  for (const key of Object.keys(normalizedMap)) {
    if (tryKeys.some((candidate) => normalizeColumnKey(candidate).includes(key) || key.includes(normalizeColumnKey(candidate)))) {
      const value = normalizedMap[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return defaultValue;
};

const isFilled = (v: any) => {
  const s = String(v ?? "").trim().toLowerCase();
  return !(s === "" || s === "-" || s === "na" || s === "n/a" || s === "null" || s === "none");
};

const getAnomalyPPLValue = (row: any, defaultValue: any = "-"): any =>
  getColumnValue(row, "ppl", ["ppl", "nama ppl", "nama_ppl", "nama_ppl", "y"], defaultValue);

const getAnomalyPMLValue = (row: any, defaultValue: any = "-"): any =>
  getColumnValue(row, "pml", ["pml", "nama pml", "nama_pml", "nama_pml", "z"], defaultValue);

const getAnomalyCatatanPetugasValue = (row: any, defaultValue: any = "-"): any =>
  getColumnValue(row, "catatan_petugas", ["catatan petugas", "catatan_petugas", "catatan", "w"], defaultValue);

const getAnomalyPerlakuanValue = (row: any, defaultValue: any = "-"): any => {
  const val = getColumnValue(row, "perlakuan", ["perlakuan", "x"], undefined);
  const normalizeVal = (v: any) => (v === undefined || v === null ? "" : String(v).trim());
  const isEmptyLike = (s: string) => {
    const t = s.trim().toLowerCase();
    return t === "" || t === "-" || t === "na" || t === "n/a" || t === "null" || t === "none";
  };

  if (val !== undefined && val !== null) {
    const s = normalizeVal(val);
    if (!isEmptyLike(s)) return val;
  }

  return defaultValue;
};

const PendingPPLCard = React.memo(({ entries, totalPPL, totalRows }: PendingPPLCardProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<PendingPPLCardSortField>("pendingCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const getSortIndicator = (field: PendingPPLCardSortField) => {
    if (sortBy !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const handleSort = (field: PendingPPLCardSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) => {
      const districtText = Array.from(entry.districts).join(" ").toLowerCase();
      return entry.name.toLowerCase().includes(term) || districtText.includes(term);
    });
  }, [entries, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, entries]);

  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => {
      let result = 0;
      if (sortBy === "name") {
        result = a.name.localeCompare(b.name);
      } else if (sortBy === "kecamatan") {
        result = Array.from(a.districts).join(", ").localeCompare(Array.from(b.districts).join(", "));
      } else if (sortBy === "pendingCount") {
        result = a.pendingCount - b.pendingCount;
      } else if (sortBy === "completed") {
        result = a.completed - b.completed;
      } else if (sortBy === "pct") {
        const totalA = a.pendingCount + a.completed;
        const totalB = b.pendingCount + b.completed;
        const aPct = totalA ? a.completed / totalA : 0;
        const bPct = totalB ? b.completed / totalB : 0;
        result = aPct - bPct;
      }
      return sortOrder === "asc" ? result : -result;
    });
    return sorted;
  }, [filteredEntries, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / 26));
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * 26, currentPage * 26);

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">PPL dengan Anomali Belum Ditindaklanjuti</CardTitle>
            <CardDescription>{totalPPL} PPL · {totalRows} baris anomali</CardDescription>
          </div>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama PPL atau kecamatan"
              className="border-slate-300 pl-9 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead
                  className="text-left font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">Nama PPL <span className="text-xs">{getSortIndicator("name")}</span></div>
                </TableHead>
                <TableHead
                  className="text-left font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("kecamatan")}
                >
                  <div className="flex items-center gap-2">Kecamatan <span className="text-xs">{getSortIndicator("kecamatan")}</span></div>
                </TableHead>
                <TableHead
                  className="text-right font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("pendingCount")}
                >
                  <div className="flex items-center justify-end gap-2">Anomali <span className="text-xs">{getSortIndicator("pendingCount")}</span></div>
                </TableHead>
                <TableHead
                  className="text-right font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("completed")}
                >
                  <div className="flex items-center justify-end gap-2">Tindak Lanjut <span className="text-xs">{getSortIndicator("completed")}</span></div>
                </TableHead>
                <TableHead
                  className="text-right font-semibold text-slate-700 cursor-pointer select-none"
                  onClick={() => handleSort("pct")}
                >
                  <div className="flex items-center justify-end gap-2">% <span className="text-xs">{getSortIndicator("pct")}</span></div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEntries.map((entry) => {
                const totalAnomalies = entry.pendingCount + entry.completed;
                const completedPct = totalAnomalies ? Math.round((entry.completed / totalAnomalies) * 1000) / 10 : 0;
                return (
                  <TableRow key={entry.name} className="even:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">{entry.name}</TableCell>
                    <TableCell className="text-left text-slate-700">{Array.from(entry.districts).join(", ")}</TableCell>
                    <TableCell className="text-right text-slate-700">{entry.pendingCount}</TableCell>
                    <TableCell className="text-right text-slate-700">{entry.completed}</TableCell>
                    <TableCell className="text-right text-slate-700">{completedPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
          <span>Hal {currentPage} dari {totalPages}</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const AnomaliTable = ({ data, loading, title }: AnomaliTableProps) => {
  const rows = data ?? [];
  const isUsaha = title.toLowerCase().includes("usaha");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml">("kecamatan");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [anomalyFilter, setAnomalyFilter] = useState("all");
  const [perlakuanFilter, setPerlakuanFilter] = useState<"all" | "filled" | "empty">("all");
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getSortIndicator = (field: "kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml") => {
    if (sortBy !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const handleSort = (field: "kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortValue = (row: any, field: "kecamatan" | "desa" | "nama_usaha" | "catatan_petugas" | "perlakuan" | "nama_anomali" | "ppl" | "pml") => {
    switch (field) {
      case "desa":
        return String(getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "")).toLowerCase();
      case "nama_usaha":
        return String(getColumnValue(row, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "")).toLowerCase();
      case "catatan_petugas":
        return String(getAnomalyCatatanPetugasValue(row, "")).toLowerCase();
      case "perlakuan":
        return String(getAnomalyPerlakuanValue(row, "")).toLowerCase();
      case "nama_anomali":
        return String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).toLowerCase();
      case "ppl":
        return String(getAnomalyPPLValue(row, "")).toLowerCase();
      case "pml":
        return String(getAnomalyPMLValue(row, "")).toLowerCase();
      case "kecamatan":
      default:
        return String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).toLowerCase();
    }
  };

  const anomalyOptions = useMemo(() => {
    const values = rows
      .map((row) => String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).trim())
      .filter(Boolean);
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const anomalyName = String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).trim().toLowerCase();
      if (anomalyFilter !== "all" && anomalyName !== anomalyFilter.toLowerCase()) {
        return false;
      }

      if (perlakuanFilter !== "all") {
        const perlakuanVal = getAnomalyPerlakuanValue(row, "");
        const hasPerlakuan = isFilled(perlakuanVal);
        if (perlakuanFilter === "filled" && !hasPerlakuan) return false;
        if (perlakuanFilter === "empty" && hasPerlakuan) return false;
      }

      if (!normalizedSearch) return true;

      const kecamatan = String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).toLowerCase();
      const desaKel = String(getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "")).toLowerCase();
      const namaUsaha = String(getColumnValue(row, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "")).toLowerCase();
      const catatanPetugas = String(getAnomalyCatatanPetugasValue(row, "")).toLowerCase();
      const perlakuan = String(getAnomalyPerlakuanValue(row, "")).toLowerCase();
      const ppl = String(getAnomalyPPLValue(row, "")).toLowerCase();
      const pml = String(getAnomalyPMLValue(row, "")).toLowerCase();
      const anomalyText = anomalyName;

      return [kecamatan, desaKel, namaUsaha, catatanPetugas, perlakuan, ppl, pml, anomalyText].some((value) => value.includes(normalizedSearch));
    });

    const sorted = [...filtered].sort((a, b) => {
      const valueA = getSortValue(a, sortBy);
      const valueB = getSortValue(b, sortBy);
      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, searchTerm, anomalyFilter, perlakuanFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows, itemsPerPage, searchTerm, anomalyFilter, perlakuanFilter, sortBy, sortOrder]);

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">Menampilkan {filteredRows.length} dari {rows.length} baris data</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600">
              <span className="mr-2">Per halaman:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <span className="text-sm text-slate-500">Hal {currentPage} dari {totalPages}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isUsaha ? "Cari Kecamatan / Desa / Usaha / PPL / PML" : "Cari Kecamatan / Desa / PPL / PML"}
                className="border-0 p-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <select
              value={anomalyFilter}
              onChange={(e) => setAnomalyFilter(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">Semua Nama Anomali</option>
              {anomalyOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={perlakuanFilter}
              onChange={(e) => setPerlakuanFilter(e.target.value as any)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              title="Filter berdasarkan apakah kolom Perlakuan sudah diisi"
            >
              <option value="all">Semua Perlakuan</option>
              <option value="filled">Sudah diisi</option>
              <option value="empty">Belum diisi</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-slate-600">Memuat data...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          Tidak ada data anomali ditemukan
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <AlertCircle className="h-5 w-5 mr-2" />
          Tidak ada data yang sesuai pencarian/urutan
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12 text-center text-slate-700 font-semibold">No</TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("kecamatan")}> 
                    <div className="flex items-center gap-2">Kecamatan - Desa/Kel <span className="text-xs">{getSortIndicator("kecamatan")}</span></div>
                  </TableHead>
                  {!isUsaha && (
                    <TableHead className="text-slate-700 font-semibold">Nama KRT</TableHead>
                  )}
                  {isUsaha && (
                    <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("nama_usaha")}> 
                      <div className="flex items-center gap-2">Nama Usaha <span className="text-xs">{getSortIndicator("nama_usaha")}</span></div>
                    </TableHead>
                  )}
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("nama_anomali")}> 
                    <div className="flex items-center gap-2">Nama Anomali <span className="text-xs">{getSortIndicator("nama_anomali")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("catatan_petugas")}> 
                    <div className="flex items-center gap-2">Catatan Petugas <span className="text-xs">{getSortIndicator("catatan_petugas")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("perlakuan")}> 
                    <div className="flex items-center gap-2">Perlakuan <span className="text-xs">{getSortIndicator("perlakuan")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("ppl")}> 
                    <div className="flex items-center gap-2">PPL <span className="text-xs">{getSortIndicator("ppl")}</span></div>
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort("pml")}> 
                    <div className="flex items-center gap-2">PML <span className="text-xs">{getSortIndicator("pml")}</span></div>
                  </TableHead>
                  <TableHead className="text-center text-slate-700 font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row, index) => {
                  const kecamatan = getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "-");
                  const desaKel = getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "-");
                  const namaUsaha = getColumnValue(row, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "-");
                  const namaKRT = getColumnValue(row, "nama_krt", ["nama krt", "nama_krt", "krt", "nama kepala rumah tangga", "nama kepala keluarga"], "-");
                  const namaAnomali = getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "-");
                  const catatanPetugas = getAnomalyCatatanPetugasValue(row, "-");
                  const perlakuan = getAnomalyPerlakuanValue(row, "-");
                  const ppl = getAnomalyPPLValue(row, "-");
                  const pml = getAnomalyPMLValue(row, "-");
                  const linkFasih = getColumnValue(row, "link_fasih", ["link fasih", "linkfasih", "link_fasih", "url fasih", "link", "url"], "");

                  return (
                    <TableRow key={`${title}-${index}`} className="even:bg-slate-50">
                      <TableCell className="text-center text-slate-700">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">
                        <div className="flex flex-col gap-0 text-sm leading-tight">
                          <span>{kecamatan}</span>
                          <span className="text-slate-500">{desaKel}</span>
                        </div>
                      </TableCell>
                      {!isUsaha && <TableCell className="text-slate-700 px-4 py-3">{namaKRT}</TableCell>}
                      {isUsaha && <TableCell className="text-slate-700 px-4 py-3">{namaUsaha}</TableCell>}
                      <TableCell className="text-slate-700 px-4 py-3">{namaAnomali}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{catatanPetugas}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{perlakuan}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{ppl}</TableCell>
                      <TableCell className="text-slate-700 px-4 py-3">{pml}</TableCell>
                      <TableCell className="text-center px-4 py-3">
                        <div className="inline-flex items-center justify-center gap-2">
                          {linkFasih ? (
                            <a
                              href={linkFasih}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-700 p-2 hover:bg-slate-200"
                              title="Lihat Link Fasih"
                            >
                              <Link className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada link</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRow(row);
                              setIsDialogOpen(true);
                            }}
                            className="inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-700 p-2 hover:bg-slate-200"
                            title="Lihat detail baris"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setSelectedRow(null);
          }}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Detail Baris Anomali</DialogTitle>
                <DialogDescription>Menampilkan informasi utama dan pertanyaan lengkap dalam beberapa halaman.</DialogDescription>
              </DialogHeader>
              {selectedRow ? (
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <TabsTrigger value="overview" className="rounded-xl py-2 text-sm font-semibold">Ringkas</TabsTrigger>
                    <TabsTrigger value="details" className="rounded-xl py-2 text-sm font-semibold">Semua Pertanyaan</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        ["Kecamatan", String(getColumnValue(selectedRow, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "-"))],
                        ["Desa/Kel", String(getColumnValue(selectedRow, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "-"))],
                        ["Nama Usaha", String(getColumnValue(selectedRow, "nama_usaha", ["nama usaha", "nama usaha / kk", "nama usaha kk", "nama usaha"], "-"))],
                        ["Nama SLS", String(getColumnValue(selectedRow, "nama_sls", ["nama sls", "nama_sls", "sls"], "-"))],
                        ["Nama Anomali", String(getColumnValue(selectedRow, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "-"))],
                        ["Catatan Petugas", String(getAnomalyCatatanPetugasValue(selectedRow, "-"))],
                        ["Perlakuan", String(getAnomalyPerlakuanValue(selectedRow, "-"))],
                        ["PPL", String(getAnomalyPPLValue(selectedRow, "-"))],
                        ["PML", String(getAnomalyPMLValue(selectedRow, "-"))],
                        ["Link Fasih", String(getColumnValue(selectedRow, "link_fasih", ["link fasih", "linkfasih", "link_fasih", "url fasih", "link", "url"], "-"))],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-2 text-sm text-slate-800 break-words">{value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(selectedRow)
                        .filter(([key]) => {
                          const normalizedKey = String(key).trim().toLowerCase();
                          return ![
                            "no",
                            "32",
                            "nama usaha",
                            "kode prov",
                            "nama provinsi",
                            "kode kab/kota",
                            "nama kab/kota",
                          ].includes(normalizedKey);
                        })
                        .map(([key, value]) => (
                          <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                            <div className="font-medium text-slate-800">{String(key)}</div>
                            <div className="mt-1 text-slate-700 break-words">{value === null || value === undefined ? "-" : String(value)}</div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="mt-4 text-sm text-slate-500">Data tidak tersedia.</div>
              )}
            </DialogContent>
          </Dialog>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">Menampilkan {paginatedRows.length} dari {rows.length} baris</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ‹ Sebelumnya
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Berikutnya ›
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function MonitoringLapanganAnomaliTab({
  anomaliUsahaData,
  anomaliUsahaLoading,
  anomaliKeluargaData,
  anomaliKeluargaLoading,
  anomaliUsahaInfo,
  anomaliKeluargaInfo,
}: MonitoringLapanganAnomaliTabProps) {
  const [activeAnomaliTab, setActiveAnomaliTab] = useState<"dashboard" | "usaha" | "keluarga">("dashboard");
  const [expandedPML, setExpandedPML] = useState<Set<string>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [districtSortBy, setDistrictSortBy] = useState<DistrictSortField>("total");
  const [districtSortOrder, setDistrictSortOrder] = useState<"asc" | "desc">("desc");

  const getDistrictSortIndicator = (field: DistrictSortField) => {
    if (districtSortBy !== field) return "↕";
    return districtSortOrder === "asc" ? "↑" : "↓";
  };

  const handleDistrictSort = (field: DistrictSortField) => {
    if (districtSortBy === field) {
      setDistrictSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setDistrictSortBy(field);
      setDistrictSortOrder("desc");
    }
  };

  const pendingAnomalyPPL = useMemo(() => {
    const allRows = [
      ...anomaliUsahaData.map((row) => ({ row, source: "Usaha" })),
      ...anomaliKeluargaData.map((row) => ({ row, source: "Keluarga" })),
    ];

    const grouped = new Map<string, { name: string; pendingCount: number; totalCount: number; completed: number; districts: Set<string> }>();
    let totalMissingRows = 0;

    allRows.forEach(({ row }) => {
      const ppl = String(getAnomalyPPLValue(row, "")).trim();
      if (!ppl) return;

      const kecamatan = String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).trim();
      const perlakuan = getAnomalyPerlakuanValue(row, "");
      const isCompleted = isFilled(perlakuan);
      const key = `${ppl}::${kecamatan}`;
      if (!grouped.has(key)) {
        grouped.set(key, { name: ppl, pendingCount: 0, totalCount: 0, completed: 0, districts: new Set<string>() });
      }
      const entry = grouped.get(key)!;
      entry.totalCount += 1;
      if (isCompleted) {
        entry.completed += 1;
      } else {
        entry.pendingCount += 1;
        totalMissingRows += 1;
      }
      if (kecamatan) entry.districts.add(kecamatan);
    });

    const entries = Array.from(grouped.values())
      .filter((entry) => entry.pendingCount > 0)
      .map((e) => ({ ...e, kecamatan: Array.from(e.districts)[0] || "" }))
      .sort((a, b) => b.pendingCount - a.pendingCount || (a.kecamatan || "").localeCompare(b.kecamatan || "") || a.name.localeCompare(b.name));

    return {
      totalPPL: entries.length,
      totalRows: totalMissingRows,
      entries,
    };
  }, [anomaliUsahaData, anomaliKeluargaData]);

  const anomalyDashboardSummary = useMemo(() => {
    const allRows = [...anomaliUsahaData, ...anomaliKeluargaData];
    const anomalyCounts = new Map<string, number>();
    const districtCounts = new Map<string, number>();
    const pplCounts = new Map<string, number>();
    const pmlCounts = new Map<string, number>();
    const desaSet = new Set<string>();
    let completedAnomalyCount = 0;

    allRows.forEach((row) => {
      const anomalyName = String(getColumnValue(row, "nama_anomali", ["nama anomali", "anomali", "jenis anomali", "jumlah anomali"], "")).trim();
      if (anomalyName) {
        anomalyCounts.set(anomalyName, (anomalyCounts.get(anomalyName) || 0) + 1);
      }

      const districtName = String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).trim();
      if (districtName) {
        districtCounts.set(districtName, (districtCounts.get(districtName) || 0) + 1);
      }

      const ppl = String(getAnomalyPPLValue(row, "")).trim();
      if (ppl) pplCounts.set(ppl, (pplCounts.get(ppl) || 0) + 1);

      const pml = String(getAnomalyPMLValue(row, "")).trim();
      if (pml) pmlCounts.set(pml, (pmlCounts.get(pml) || 0) + 1);

      const desa = String(getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "")).trim();
      if (desa) desaSet.add(`${districtName}|${desa}`);

      const catatanPetugas = getAnomalyCatatanPetugasValue(row, "").trim();
      if (isFilled(catatanPetugas)) completedAnomalyCount += 1;
    });

    const sortedAnomalies = [...anomalyCounts.entries()].sort((a, b) => b[1] - a[1]);

    return {
      allAnomalies: sortedAnomalies,
      topAnomalies: sortedAnomalies.slice(0, 5),
      topDistricts: [...districtCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topPPL: [...pplCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      topPML: [...pmlCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      totalKecamatan: districtCounts.size,
      totalDesa: desaSet.size,
      totalPPL: pplCounts.size,
      totalPML: pmlCounts.size,
      completedAnomalyCount,
      total: allRows.length,
    };
  }, [anomaliUsahaData, anomaliKeluargaData]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-col gap-4">
        <div>
          <CardTitle className="text-lg">⚠️ Anomali</CardTitle>
          <CardDescription>
            Pilih sub-tab untuk melihat daftar anomali usaha atau keluarga.
          </CardDescription>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm text-slate-800">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-900">Informasi data terakhir</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Usaha</div>
                <div className="mt-2 text-sm text-slate-700">{anomaliUsahaInfo}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">Keluarga</div>
                <div className="mt-2 text-sm text-slate-700">{anomaliKeluargaInfo}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveAnomaliTab("dashboard")}
            className={`px-4 py-2 rounded-lg border font-medium ${activeAnomaliTab === "dashboard" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}
          >
            Dashboard Anomali
          </button>
          <button
            type="button"
            onClick={() => setActiveAnomaliTab("usaha")}
            className={`px-4 py-2 rounded-lg border font-medium ${activeAnomaliTab === "usaha" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}
          >
            Mikro Anomali Usaha
          </button>
          <button
            type="button"
            onClick={() => setActiveAnomaliTab("keluarga")}
            className={`px-4 py-2 rounded-lg border font-medium ${activeAnomaliTab === "keluarga" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}
          >
            Mikro Anomali Keluarga
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {activeAnomaliTab === "dashboard" ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {(() => {
                const total = anomaliUsahaData.length + anomaliKeluargaData.length;
                const pctUsaha = total ? Math.round((anomaliUsahaData.length / total) * 1000) / 10 : 0;
                const pctKel = total ? Math.round((anomaliKeluargaData.length / total) * 1000) / 10 : 0;
                const linkPct = total ? Math.round((anomalyDashboardSummary.completedAnomalyCount / total) * 1000) / 10 : 0;
                const kpis = [
                  { label: "Total Anomali", value: total, sub: `${anomaliUsahaData.length} usaha + ${anomaliKeluargaData.length} keluarga`, color: "slate" },
                  { label: "Anomali Usaha", value: anomaliUsahaData.length, sub: `${pctUsaha}% dari total`, color: "amber" },
                  { label: "Anomali Keluarga", value: anomaliKeluargaData.length, sub: `${pctKel}% dari total`, color: "rose" },
                  { label: "Kecamatan Terdampak", value: anomalyDashboardSummary.totalKecamatan, sub: `${anomalyDashboardSummary.totalDesa} desa/kel`, color: "blue" },
                  { label: "Petugas Terdampak", value: anomalyDashboardSummary.totalPPL, sub: `${anomalyDashboardSummary.totalPML} PML`, color: "indigo" },
                  { label: "Tindak Lanjut Anomali", value: anomalyDashboardSummary.completedAnomalyCount, sub: `${linkPct}% dari total anomali`, color: "emerald" },
                ];
                const palette: Record<string, string> = {
                  slate: "border-slate-200 bg-slate-50 text-slate-800",
                  amber: "border-amber-200 bg-amber-50 text-amber-900",
                  rose: "border-rose-200 bg-rose-50 text-rose-900",
                  blue: "border-blue-200 bg-blue-50 text-blue-900",
                  indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
                  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
                };
                return kpis.map((k) => (
                  <div key={k.label} className={`rounded-xl border p-3 ${palette[k.color]}`}>
                    <p className="text-xs font-medium opacity-80">{k.label}</p>
                    <p className="mt-1 text-2xl font-bold leading-none">{k.value.toLocaleString("id-ID")}</p>
                    <p className="mt-1 text-[11px] opacity-70">{k.sub}</p>
                  </div>
                ));
              })()}
            </div>

            <div className="grid gap-4 lg:grid-cols-2 items-stretch">
              <Card className="border-0 shadow-sm h-full">
                <CardHeader className="border-b p-4 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Detail per Kecamatan</CardTitle>
                    <CardDescription>Semua kecamatan yang tercatat memiliki anomali</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead
                          className="text-left text-slate-700 font-semibold cursor-pointer select-none"
                          onClick={() => handleDistrictSort("kecamatan")}
                        >
                          <div className="flex items-center gap-2">Kecamatan <span className="text-xs">{getDistrictSortIndicator("kecamatan")}</span></div>
                        </TableHead>
                        <TableHead
                          className="text-right text-slate-700 font-semibold cursor-pointer select-none"
                          onClick={() => handleDistrictSort("usaha")}
                        >
                          <div className="flex items-center justify-end gap-2">Usaha <span className="text-xs">{getDistrictSortIndicator("usaha")}</span></div>
                        </TableHead>
                        <TableHead
                          className="text-right text-slate-700 font-semibold cursor-pointer select-none"
                          onClick={() => handleDistrictSort("keluarga")}
                        >
                          <div className="flex items-center justify-end gap-2">Keluarga <span className="text-xs">{getDistrictSortIndicator("keluarga")}</span></div>
                        </TableHead>
                        <TableHead
                          className="text-right text-slate-700 font-semibold cursor-pointer select-none"
                          onClick={() => handleDistrictSort("total")}
                        >
                          <div className="flex items-center justify-end gap-2">Total <span className="text-xs">{getDistrictSortIndicator("total")}</span></div>
                        </TableHead>
                        <TableHead
                          className="text-right text-slate-700 font-semibold cursor-pointer select-none"
                          onClick={() => handleDistrictSort("completed")}
                        >
                          <div className="flex items-center justify-end gap-2">Tindak Lanjut <span className="text-xs">{getDistrictSortIndicator("completed")}</span></div>
                        </TableHead>
                        <TableHead
                          className="text-right text-slate-700 font-semibold cursor-pointer select-none"
                          onClick={() => handleDistrictSort("percent")}
                        >
                          <div className="flex items-center justify-end gap-2">% <span className="text-xs">{getDistrictSortIndicator("percent")}</span></div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const districtMap = new Map<string, { kecamatan: string; usaha: number; keluarga: number; total: number; completed: number; desaSet: Set<string>; pplSet: Set<string>; pmlSet: Set<string>; linkCount: number; }>();
                        const districtPMLCounts = new Map<string, Map<string, { count: number; completed: number; pplCounts: Map<string, { count: number; completed: number }> }>>();
                        const addRows = (rows: any[], type: "usaha" | "keluarga") => {
                          rows.forEach((row) => {
                            const kecamatan = String(getColumnValue(row, "kecamatan", ["nama_kecamatan", "nama kecamatan", "kec", "kecamatan"], "")).trim();
                            if (!kecamatan) return;
                            if (!districtMap.has(kecamatan)) {
                              districtMap.set(kecamatan, { kecamatan, usaha: 0, keluarga: 0, total: 0, completed: 0, desaSet: new Set<string>(), pplSet: new Set<string>(), pmlSet: new Set<string>(), linkCount: 0 });
                            }
                            const bucket = districtMap.get(kecamatan)!;
                            if (type === "keluarga") bucket.keluarga += 1; else bucket.usaha += 1;
                            bucket.total += 1;
                            const perlakuan = getAnomalyPerlakuanValue(row, "");
                            const hasCompleted = isFilled(perlakuan);
                            if (hasCompleted) bucket.completed += 1;
                            const desa = String(getColumnValue(row, "nama_desa_kel", ["desa_kel", "nama desa/kel", "nama desa kel", "desa kel", "nama desa", "desa", "kel"], "")).trim();
                            if (desa) bucket.desaSet.add(desa);
                            const ppl = String(getAnomalyPPLValue(row, "")).trim();
                            if (ppl) bucket.pplSet.add(ppl);
                            const pml = String(getAnomalyPMLValue(row, "")).trim();
                            if (pml) {
                              bucket.pmlSet.add(pml);
                              const pmlMap = districtPMLCounts.get(kecamatan) || new Map<string, { count: number; completed: number; pplCounts: Map<string, { count: number; completed: number }> }>();
                              const pmlBucket = pmlMap.get(pml) || { count: 0, completed: 0, pplCounts: new Map<string, { count: number; completed: number }>() };
                              pmlBucket.count += 1;
                              if (hasCompleted) pmlBucket.completed += 1;
                              if (ppl) {
                                const pplBucket = pmlBucket.pplCounts.get(ppl) || { count: 0, completed: 0 };
                                pplBucket.count += 1;
                                if (hasCompleted) pplBucket.completed += 1;
                                pmlBucket.pplCounts.set(ppl, pplBucket);
                              }
                              pmlMap.set(pml, pmlBucket);
                              districtPMLCounts.set(kecamatan, pmlMap);
                            }
                            const link = String(getColumnValue(row, "link_fasih", ["link fasih", "linkfasih", "link_fasih", "url fasih", "link", "url"], "")).trim();
                            if (link) bucket.linkCount += 1;
                          });
                        };
                        addRows(anomaliUsahaData, "usaha");
                        addRows(anomaliKeluargaData, "keluarga");
                        const districtRows = [...districtMap.values()];
                        districtRows.sort((a, b) => {
                          const getValue = (item: any, field: DistrictSortField) => {
                            switch (field) {
                              case "kecamatan":
                                return item.kecamatan;
                              case "usaha":
                                return item.usaha;
                              case "keluarga":
                                return item.keluarga;
                              case "total":
                                return item.total;
                              case "completed":
                                return item.completed;
                              case "percent":
                                return item.total ? item.completed / item.total : 0;
                            }
                          };
                          const aValue = getValue(a, districtSortBy);
                          const bValue = getValue(b, districtSortBy);
                          let result = 0;
                          if (typeof aValue === "string") {
                            result = (aValue as string).localeCompare(bValue as string);
                          } else {
                            result = (aValue as number) - (bValue as number);
                          }
                          return districtSortOrder === "asc" ? result : -result;
                        });
                        const totals = districtRows.reduce((acc, item) => {
                          acc.usaha += item.usaha;
                          acc.keluarga += item.keluarga;
                          acc.total += item.total;
                          acc.completed += item.completed;
                          return acc;
                        }, { usaha: 0, keluarga: 0, total: 0, completed: 0 });
                        return (
                          <>
                            {districtRows.map((item) => {
                              const isExpanded = expandedDistricts.has(item.kecamatan);
                              const pmlCounts = districtPMLCounts.get(item.kecamatan) || new Map<string, { count: number; completed: number; pplCounts: Map<string, { count: number; completed: number }> }>();
                              const pmlDetails = Array.from(pmlCounts.entries()).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
                              const completionPct = item.total ? Math.round((item.completed / item.total) * 1000) / 10 : 0;
                              return (
                                <React.Fragment key={item.kecamatan}>
                                  <TableRow className="even:bg-slate-50">
                                    <TableCell className="font-medium text-slate-900">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedDistricts((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(item.kecamatan)) {
                                              next.delete(item.kecamatan);
                                            } else {
                                              next.add(item.kecamatan);
                                            }
                                            return next;
                                          });
                                        }}
                                        className="inline-flex items-center gap-2 text-left text-slate-900 hover:text-blue-600"
                                      >
                                        <span className="text-sm font-semibold">{isExpanded ? "▼" : "▶"}</span>
                                        <span>{item.kecamatan}</span>
                                      </button>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-700">{item.usaha}</TableCell>
                                    <TableCell className="text-right text-slate-700">{item.keluarga}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-900">{item.total}</TableCell>
                                    <TableCell className="text-right text-slate-700">{item.completed}</TableCell>
                                    <TableCell className="text-right text-slate-700">{completionPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</TableCell>
                                  </TableRow>
                                  {isExpanded && (
                                    <TableRow className="bg-slate-50">
                                      <TableCell colSpan={6} className="px-4 py-3 bg-slate-100">
                                        <div className="space-y-2">
                                          <div className="text-sm font-semibold text-slate-800">Detail PML di {item.kecamatan}</div>
                                          {pmlDetails.length > 0 ? (
                                            <div className="space-y-2">
                                              {pmlDetails.map(([pmlName, detail]) => {
                                                const pmlKey = `${item.kecamatan}::${pmlName}`;
                                                const isPMLExpanded = expandedPML.has(pmlKey);
                                                const pplEntries = Array.from(detail.pplCounts.entries()).sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
                                                return (
                                                  <div key={pmlName} className="rounded-xl border border-slate-200 bg-white">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setExpandedPML((prev) => {
                                                          const next = new Set(prev);
                                                          if (next.has(pmlKey)) {
                                                            next.delete(pmlKey);
                                                          } else {
                                                            next.add(pmlKey);
                                                          }
                                                          return next;
                                                        });
                                                      }}
                                                      className="w-full px-3 py-3 text-left"
                                                    >
                                                      <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                          <div className="font-semibold text-slate-900">{pmlName}</div>
                                                          <div className="text-sm text-slate-600">
                                                            {detail.count} anomali · {pplEntries.length} PPL · {detail.completed} sudah tindak lanjut · {detail.count ? Math.round((detail.completed / detail.count) * 1000) / 10 : 0}%
                                                          </div>
                                                        </div>
                                                        <span className="text-slate-500">{isPMLExpanded ? "▼" : "▶"}</span>
                                                      </div>
                                                    </button>
                                                    {isPMLExpanded && (
                                                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                                        <div className="font-medium text-slate-800 mb-2">Daftar PPL</div>
                                                        {pplEntries.length > 0 ? (
                                                          <ul className="space-y-1 text-slate-700">
                                                            {pplEntries.map(([pplName, stats]) => (
                                                              <li key={pplName} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 shadow-sm border border-slate-200">
                                                                <span>{pplName}</span>
                                                                <span className="text-xs font-semibold text-slate-600">
                                                                  {stats.count} anomali · {stats.completed} sudah tindak lanjut · {stats.count ? Math.round((stats.completed / stats.count) * 1000) / 10 : 0}%
                                                                </span>
                                                              </li>
                                                            ))}
                                                          </ul>
                                                        ) : (
                                                          <div className="text-slate-600">Nama PPL belum tersedia untuk PML ini.</div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <div className="text-sm text-slate-600">Tidak ada data PML yang tercatat untuk kecamatan ini.</div>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                            <TableRow className="bg-slate-100 font-semibold">
                              <TableCell className="text-slate-900">Jumlah</TableCell>
                              <TableCell className="text-right text-slate-900">{totals.usaha}</TableCell>
                              <TableCell className="text-right text-slate-900">{totals.keluarga}</TableCell>
                              <TableCell className="text-right text-slate-900">{totals.total}</TableCell>
                              <TableCell className="text-right text-slate-900">{totals.completed}</TableCell>
                              <TableCell className="text-right text-slate-900">{totals.total ? Math.round((totals.completed / totals.total) * 1000) / 10 : 0}%</TableCell>
                            </TableRow>
                          </>
                        );
                      })()}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <PendingPPLCard
                entries={pendingAnomalyPPL.entries}
                totalPPL={pendingAnomalyPPL.totalPPL}
                totalRows={pendingAnomalyPPL.totalRows}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              {[
                { title: "Top PPL Terdampak", data: anomalyDashboardSummary.topPPL, accent: "bg-indigo-500" },
                { title: "Top PML Terdampak", data: anomalyDashboardSummary.topPML, accent: "bg-rose-500" },
              ].map((section) => {
                const max = section.data[0]?.[1] || 1;
                return (
                  <div key={section.title} className="rounded-xl border border-slate-200 bg-white p-4 h-full">
                    <h4 className="text-sm font-semibold text-slate-800">{section.title}</h4>
                    {section.data.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-400">Tidak ada data</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {section.data.map(([name, count]) => (
                          <li key={String(name)} className="text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-slate-700" title={String(name)}>{String(name)}</span>
                              <span className="font-semibold text-slate-900">{count}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full ${section.accent}`} style={{ width: `${(Number(count) / Number(max)) * 100}%` }} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            <Card className="border-0 shadow-sm mt-4">
              <CardHeader className="border-b p-4 pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Jenis Anomali</CardTitle>
                    <CardDescription>Seluruh jenis anomali dan jumlah kemunculannya.</CardDescription>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <span>{anomalyDashboardSummary.allAnomalies.length} jenis</span>
                    <span className="text-slate-400">·</span>
                    <span>{anomalyDashboardSummary.allAnomalies.reduce((sum, [, count]) => sum + count, 0)} anomali</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {anomalyDashboardSummary.allAnomalies.length === 0 ? (
                  <p className="p-4 text-xs text-slate-400">Tidak ada data</p>
                ) : (
                  <div className="space-y-3 p-4">
                    {anomalyDashboardSummary.allAnomalies.map(([name, count]) => {
                      const max = anomalyDashboardSummary.allAnomalies[0]?.[1] || 1;
                      return (
                        <div key={String(name)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-4">
                            <span className="truncate text-sm font-medium text-slate-800" title={String(name)}>{String(name)}</span>
                            <span className="text-sm font-semibold text-slate-900">{count.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : activeAnomaliTab === "usaha" ? (
          <AnomaliTable
            data={anomaliUsahaData}
            loading={anomaliUsahaLoading}
            title="Mikro Anomali Usaha"
          />
        ) : (
          <AnomaliTable
            data={anomaliKeluargaData}
            loading={anomaliKeluargaLoading}
            title="Mikro Anomali Keluarga"
          />
        )}
      </CardContent>
    </Card>
  );
}
