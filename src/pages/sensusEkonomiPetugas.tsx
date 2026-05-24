import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Search, Loader2, ArrowUpDown, ZoomIn, Check, X } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";

type Row = string[];

const SPREADSHEET_ID = "1iCZGbfPgRMiXGO6q_vtklOsJ4gFQoUS2nMwS-HlY0r4";
const SHEET_NAME = "SCRAPING";
const RANGE = `${SHEET_NAME}!A1:BT`;

// Column header names (source of truth)
const COLUMN_HEADERS = {
  foto: "foto",
  nama_lengkap: "nama_lengkap",
  nik: "is_nik_verified_mitra",
  kecamatan: "alamat_kec",
  desa: "alamat_desa",
  jabatan: "nama_pos",
  status_penawaran: "ket_status",
};

// Find column index by header name
const findColumnIndex = (headers: string[], headerName: string): number => {
  const index = headers.findIndex(h => h && h.toLowerCase().trim() === headerName.toLowerCase().trim());
  return index >= 0 ? index : -1;
};

// Get column indices dynamically
const getColumnIndices = (headers: string[]) => ({
  foto: findColumnIndex(headers, COLUMN_HEADERS.foto),
  nama_lengkap: findColumnIndex(headers, COLUMN_HEADERS.nama_lengkap),
  nik: findColumnIndex(headers, COLUMN_HEADERS.nik),
  kecamatan: findColumnIndex(headers, COLUMN_HEADERS.kecamatan),
  desa: findColumnIndex(headers, COLUMN_HEADERS.desa),
  jabatan: findColumnIndex(headers, COLUMN_HEADERS.jabatan),
  status_penawaran: findColumnIndex(headers, COLUMN_HEADERS.status_penawaran),
});

export default function SensusEkonomiPetugas() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterKec, setFilterKec] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterJabatan, setFilterJabatan] = useState<string>("all");
  const [filterNik, setFilterNik] = useState<string>("all");
  const [sortKey, setSortKey] = useState<keyof typeof COLUMN_HEADERS>("nama_lengkap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  // Get dynamic column indices based on current headers
  const COL = useMemo(() => getColumnIndices(headers), [headers]);

  // Debug logging
  useEffect(() => {
    if (headers.length > 0) {
      console.log("📋 All Headers found:", headers);
      console.log("🔍 Column indices:", COL);
      console.log("🎯 Expected mappings:", COLUMN_HEADERS);
      console.log("📊 Sample row 0:", rows[0]);
      
      // Detail matching
      Object.entries(COLUMN_HEADERS).forEach(([key, expectedName]) => {
        const foundIndex = findColumnIndex(headers, expectedName);
        console.log(`  ${key}: looking for "${expectedName}" -> ${foundIndex !== -1 ? `✓ found at index ${foundIndex}` : "✗ NOT FOUND"}`);
      });
    }
  }, [COL, headers, rows]);

  // Load data from Google Sheets
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: RANGE },
        });
        if (error) throw error;
        const values: Row[] = data?.values || [];
        if (values.length === 0) {
          setHeaders([]);
          setRows([]);
        } else {
          setHeaders(values[0]);
          const dataRows = values.slice(1).filter(r => r && r.some(c => (c || "").toString().trim() !== ""));
          setRows(dataRows);
        }
      } catch (e: any) {
        setError(e.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Get unique kecamatan values
  const kecOptions = useMemo(() => {
    if (COL.kecamatan === -1) return [];
    const kecSet = new Set<string>();
    rows.forEach(r => {
      const kec = (r[COL.kecamatan] || "").toString().trim();
      if (kec) kecSet.add(kec);
    });
    return Array.from(kecSet).sort();
  }, [rows, COL.kecamatan]);

  // Get unique status values
  const statusOptions = useMemo(() => {
    if (COL.status_penawaran === -1) return [];
    const statusSet = new Set<string>();
    rows.forEach(r => {
      const status = (r[COL.status_penawaran] || "").toString().trim();
      if (status) statusSet.add(status);
    });
    return Array.from(statusSet).sort();
  }, [rows, COL.status_penawaran]);

  // Get unique jabatan values
  const jabatanOptions = useMemo(() => {
    if (COL.jabatan === -1) return [];
    const jabatanSet = new Set<string>();
    rows.forEach(r => {
      const jabatan = (r[COL.jabatan] || "").toString().trim();
      if (jabatan) jabatanSet.add(jabatan);
    });
    return Array.from(jabatanSet).sort();
  }, [rows, COL.jabatan]);

  // Get unique NIK values
  const nikOptions = useMemo(() => {
    if (COL.nik === -1) return [];
    const nikSet = new Set<string>();
    rows.forEach(r => {
      const nik = (r[COL.nik] || "").toString().trim().toUpperCase();
      if (nik === "TRUE" || nik === "FALSE") nikSet.add(nik);
    });
    return Array.from(nikSet).sort();
  }, [rows, COL.nik]);

  // Filter and sort data
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let out = rows.filter(r => {
      if (filterKec !== "all" && COL.kecamatan !== -1 && (r[COL.kecamatan] || "").toString().trim() !== filterKec) return false;
      if (filterStatus !== "all" && COL.status_penawaran !== -1 && (r[COL.status_penawaran] || "").toString().trim() !== filterStatus) return false;
      if (filterJabatan !== "all" && COL.jabatan !== -1 && (r[COL.jabatan] || "").toString().trim() !== filterJabatan) return false;
      if (filterNik !== "all" && COL.nik !== -1 && (r[COL.nik] || "").toString().trim().toUpperCase() !== filterNik) return false;
      if (q) {
        return r.some(c => (c || "").toString().toLowerCase().includes(q));
      }
      return true;
    });

    // Sort
    const sortColIdx = COL[sortKey];
    if (sortColIdx === -1) return out;
    
    out = [...out].sort((a, b) => {
      const av = (a[sortColIdx] || "").toString().toLowerCase();
      const bv = (b[sortColIdx] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, search, filterKec, filterStatus, filterJabatan, filterNik, sortKey, sortDir, COL]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: keyof typeof COLUMN_HEADERS) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getStatusColor = (status: string): string => {
    if (status.toLowerCase() === "diterima") {
      return "bg-green-100 text-green-800";
    }
    return "bg-slate-100 text-slate-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-8">
      <div className="w-full mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
            Petugas Sensus Ekonomi 2026
          </h1>
          <p className="text-slate-600">Daftar petugas yang terlibat dalam kegiatan Sensus Ekonomi 2026</p>
        </header>

        {/* Debug Info - Remove in production */}
        {headers.length > 0 ? (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-3 text-xs text-slate-600">
              <div className="space-y-2">
                <div className="font-semibold">Kolom yang ditemukan:</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>Foto: {COL.foto !== -1 ? `✓ Index ${COL.foto}` : "✗ Tidak ditemukan"}</div>
                  <div>Nama: {COL.nama_lengkap !== -1 ? `✓ Index ${COL.nama_lengkap}` : "✗ Tidak ditemukan"}</div>
                  <div>NIK: {COL.nik !== -1 ? `✓ Index ${COL.nik}` : "✗ Tidak ditemukan"}</div>
                  <div>Kecamatan: {COL.kecamatan !== -1 ? `✓ Index ${COL.kecamatan}` : "✗ Tidak ditemukan"}</div>
                  <div>Desa: {COL.desa !== -1 ? `✓ Index ${COL.desa}` : "✗ Tidak ditemukan"}</div>
                  <div>Jabatan: {COL.jabatan !== -1 ? `✓ Index ${COL.jabatan}` : "✗ Tidak ditemukan"}</div>
                  <div>Status: {COL.status_penawaran !== -1 ? `✓ Index ${COL.status_penawaran}` : "✗ Tidak ditemukan"}</div>
                  <div>Total Data: {rows.length} rows</div>
                </div>
                <div className="font-semibold mt-3">Semua headers di sheet:</div>
                <div className="text-xs bg-white p-2 rounded border max-h-20 overflow-y-auto">
                  {headers.map((h, i) => (
                    <div key={i}>{i}: <span className="font-mono text-blue-600">"{h}"</span></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-3 text-xs text-amber-700">
              {loading ? "📥 Memuat data..." : error ? `❌ Error: ${error}` : "⚠️ Tidak ada header ditemukan"}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Daftar Petugas</CardTitle>
            <CardDescription>Cari, filter, dan lihat detail petugas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search + Filter + Pagination */}
            <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, desa, jabatan..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={filterKec} onValueChange={(v) => { setFilterKec(v); setPage(1); }}>
                  <SelectTrigger className="w-auto h-9 text-xs">
                    <SelectValue placeholder="Kecamatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kecamatan</SelectItem>
                    {kecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                  <SelectTrigger className="w-auto h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filterJabatan} onValueChange={(v) => { setFilterJabatan(v); setPage(1); }}>
                  <SelectTrigger className="w-auto h-9 text-xs">
                    <SelectValue placeholder="Jabatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jabatan</SelectItem>
                    {jabatanOptions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filterNik} onValueChange={(v) => { setFilterNik(v); setPage(1); }}>
                  <SelectTrigger className="w-auto h-9 text-xs">
                    <SelectValue placeholder="NIK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua NIK</SelectItem>
                    {nikOptions.map(n => <SelectItem key={n} value={n}>{n === "TRUE" ? "✓ Valid" : "✗ Tidak Valid"}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-auto h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
              </Card>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="w-48 cursor-pointer" onClick={() => toggleSort("nama_lengkap")}>
                          <div className="flex items-center gap-1">Nama <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="w-14 cursor-pointer text-center" onClick={() => toggleSort("nik")}>
                          <div className="flex items-center justify-center gap-1">NIK <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="w-28 cursor-pointer" onClick={() => toggleSort("kecamatan")}>
                          <div className="flex items-center gap-1">Kecamatan <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="w-28 cursor-pointer" onClick={() => toggleSort("desa")}>
                          <div className="flex items-center gap-1">Desa <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="w-36 cursor-pointer" onClick={() => toggleSort("jabatan")}>
                          <div className="flex items-center gap-1">Jabatan <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="w-24 cursor-pointer" onClick={() => toggleSort("status_penawaran")}>
                          <div className="flex items-center gap-1">Status Penawaran <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="text-center w-12">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                            Tidak ada data
                          </TableCell>
                        </TableRow>
                      ) : (
                        pageRows.map((r, i) => (
                          <TableRow key={i} className="hover:bg-slate-50">
                            <TableCell className="text-muted-foreground text-xs">{(currentPage - 1) * pageSize + i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {COL.foto !== -1 && (r[COL.foto] || "").trim() ? (
                                  <button
                                    onClick={() => setExpandedPhoto(r[COL.foto] || "")}
                                    className="relative h-10 w-10 rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all flex-shrink-0 group"
                                    title="Klik untuk memperbesar foto"
                                  >
                                    <OptimizedImage
                                      src={r[COL.foto]}
                                      alt="Foto"
                                      size="small"
                                      priority={true}
                                      className="h-10 w-10"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                                      <ZoomIn className="h-3 w-3 text-white opacity-0 group-hover:opacity-100" />
                                    </div>
                                  </button>
                                ) : (
                                  <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">-</div>
                                )}
                                <span className="font-medium text-sm">{COL.nama_lengkap !== -1 ? r[COL.nama_lengkap] || "-" : "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {COL.nik !== -1 ? (
                                (() => {
                                  const nikValue = (r[COL.nik] || "").toString().trim().toUpperCase();
                                  if (nikValue === "TRUE") {
                                    return <div className="flex justify-center"><Check className="h-5 w-5 text-green-600" /></div>;
                                  } else if (nikValue === "FALSE") {
                                    return <div className="flex justify-center"><X className="h-5 w-5 text-red-600" /></div>;
                                  }
                                  return <span className="text-xs text-slate-500">-</span>;
                                })()
                              ) : (
                                <span className="text-xs text-slate-500">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{COL.kecamatan !== -1 ? r[COL.kecamatan] || "-" : "-"}</TableCell>
                            <TableCell className="text-sm">{COL.desa !== -1 ? r[COL.desa] || "-" : "-"}</TableCell>
                            <TableCell className="text-sm">{COL.jabatan !== -1 ? r[COL.jabatan] || "-" : "-"}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(COL.status_penawaran !== -1 ? r[COL.status_penawaran] || "" : "")}>
                                {COL.status_penawaran !== -1 ? r[COL.status_penawaran] || "-" : "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => setDetailRow(r)}
                                className="p-1.5 rounded text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Lihat detail"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Info */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
                  <div className="text-muted-foreground">
                    Menampilkan {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} data
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 rounded border hover:bg-slate-100 disabled:opacity-50"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setPage(p => p - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-1 rounded border hover:bg-slate-100 disabled:opacity-50"
                    >
                      ‹
                    </button>
                    <span className="px-2 text-xs">Hal {currentPage} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1 rounded border hover:bg-slate-100 disabled:opacity-50"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      className="px-3 py-1 rounded border hover:bg-slate-100 disabled:opacity-50"
                    >
                      »
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expanded Photo Modal */}
        {expandedPhoto && (
          <Dialog open={!!expandedPhoto} onOpenChange={() => setExpandedPhoto(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Foto Petugas</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={expandedPhoto}
                  alt="Foto Petugas"
                  className="max-w-full max-h-96 rounded"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/300?text=Foto+Tidak+Tersedia";
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Detail Modal */}
        {detailRow && (
          <Dialog open={!!detailRow} onOpenChange={() => setDetailRow(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Detail Petugas</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Foto */}
                {COL.foto !== -1 && detailRow[COL.foto] && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setExpandedPhoto(detailRow[COL.foto] || "");
                      }}
                      className="relative h-32 w-32 rounded overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer group"
                      title="Klik untuk memperbesar"
                    >
                      <OptimizedImage
                        src={detailRow[COL.foto]}
                        alt="Foto"
                        size="large"
                        priority={true}
                        className="h-32 w-32"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Data Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {headers.map((header, idx) => {
                    const value = detailRow[idx] || "";
                    if (!value || !value.toString().trim()) return null;
                    
                    const isLink = value.toString().toLowerCase().startsWith("http");
                    const photoColumnNames = ["foto", "foto_ktp", "ijazah"];
                    const isPhotoColumn = photoColumnNames.some(name => 
                      header.toLowerCase().trim() === name.toLowerCase()
                    );
                    
                    return (
                      <div key={idx}>
                        <label className="text-sm font-semibold text-slate-600">{header}</label>
                        {isLink || isPhotoColumn ? (
                          <a
                            href={value.toString()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm mt-1 text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Klik untuk melihat
                          </a>
                        ) : (
                          <p className="text-sm mt-1 break-words">{value}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
