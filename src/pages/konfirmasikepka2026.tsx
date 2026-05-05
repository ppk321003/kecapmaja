import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Eye, Search, CheckCircle2, XCircle, Users, Loader2, ArrowUpDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const SPREADSHEET_ID = "1Sa6HeJ_PqRMQOHjJc9gGeuYFgHy8Ed5TSzt9dnztkqE";
const SHEET_NAME = "Olah";
const RANGE = `${SHEET_NAME}!A1:BD`;

const COLORS = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

// Column letter to index (0-based)
const colIdx = (letter: string): number => {
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64);
  }
  return n - 1;
};

const COL = {
  email: colIdx("B"),    // B
  kegiatanRutin: colIdx("C"),  // C - Kegiatan Rutin yang sudah diikuti tahun 2026
  sensusEkonomi: colIdx("E"),  // E - Sensus Ekonomi 2026
  pendidikan: colIdx("J"),  // J - Pendidikan terakhir yang ditamatkan
  nama: colIdx("F"),     // F
  sobatId: colIdx("G"),  // G
  kec: colIdx("M"),      // M
  desa: colIdx("N"),     // N
  status: colIdx("BD"),  // BD
  umur: colIdx("L"),     // L - Umur saat ini
  pekerjaan: colIdx("R"),  // R - Apakah Anda Bekerja Sebagai...
  androidVersion: colIdx("Y"),  // Y - Apa Versi Android Smartphone Android Anda?
  prioritasKejaanBPS: colIdx("AM"),  // AM - Apakah Anda bersedia Memprioritaskan Pekerjaan BPS?
  lintasKecamatan: colIdx("AQ"),  // AQ - Apakah Anda bersedia bekerja Lintas Kecamatan?
  lintasDesa: colIdx("AR"),  // AR - Apakah Anda bersedia bekerja Lintas Desa?
  tidakMengalihkan: colIdx("AV"),  // AV - Apakah anda bersedia tidak mengalihkan pekerjaan?
  pertanyaan: colIdx("AI"),  // AI - Link gambar pertanyaan Google Drive
};

type Row = string[];

const isNotVerified = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  return s.includes("belum") && s.includes("verifikasi");
};
const isVerified = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  return !isNotVerified(s) && (s.includes("verifikasi") || s.includes("cocok") && !s.includes("tidak") || s.includes("valid") || s === "ok" || s === "terverifikasi");
};
const isMismatch = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  return s.includes("tidak cocok") || s.includes("tidak sesuai") || s.includes("tidak valid") || s.includes("invalid") || s.includes("mismatch");
};

export default function KonfirmasiKepka2026() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterKec, setFilterKec] = useState<string>("all");
  const [sortKey, setSortKey] = useState<keyof typeof COL>("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [detailRow, setDetailRow] = useState<Row | null>(null);

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
          setHeaders([]); setRows([]);
        } else {
          setHeaders(values[0]);
          setRows(values.slice(1).filter(r => r && r.some(c => (c || "").toString().trim() !== "")));
        }
      } catch (e: any) {
        setError(e.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    let verified = 0, mismatch = 0, notVerified = 0;
    const kecMap = new Map<string, number>();
    const umurMap = new Map<string, number>();
    const pekerjaanMap = new Map<string, number>();
    const androidMap = new Map<string, number>();
    const prioritasMap = new Map<string, number>();
    const lintasKecMap = new Map<string, number>();
    const lintasDesaMap = new Map<string, number>();
    const tidakMengalihMap = new Map<string, number>();
    const pendidikanMap = new Map<string, number>();
    const kegiatanRutinMap = new Map<string, number>();
    
    rows.forEach(r => {
      const s = r[COL.status] || "";
      if (isVerified(s)) verified++;
      else if (isMismatch(s)) mismatch++;
      else notVerified++;
      const k = (r[COL.kec] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      kecMap.set(k, (kecMap.get(k) || 0) + 1);
      
      // Umur
      const umur = (r[COL.umur] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      umurMap.set(umur, (umurMap.get(umur) || 0) + 1);
      
      // Pekerjaan
      const pekerjaan = (r[COL.pekerjaan] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      pekerjaanMap.set(pekerjaan, (pekerjaanMap.get(pekerjaan) || 0) + 1);
      
      // Android Version
      const android = (r[COL.androidVersion] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      androidMap.set(android, (androidMap.get(android) || 0) + 1);
      
      // Prioritas Pekerjaan BPS
      const prioritas = (r[COL.prioritasKejaanBPS] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      prioritasMap.set(prioritas, (prioritasMap.get(prioritas) || 0) + 1);
      
      // Lintas Kecamatan
      const linKec = (r[COL.lintasKecamatan] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      lintasKecMap.set(linKec, (lintasKecMap.get(linKec) || 0) + 1);
      
      // Lintas Desa
      const linDesa = (r[COL.lintasDesa] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      lintasDesaMap.set(linDesa, (lintasDesaMap.get(linDesa) || 0) + 1);
      
      // Tidak Mengalihkan
      const tidakMeng = (r[COL.tidakMengalihkan] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      tidakMengalihMap.set(tidakMeng, (tidakMengalihMap.get(tidakMeng) || 0) + 1);
      
      // Pendidikan
      const pendidikan = (r[COL.pendidikan] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      pendidikanMap.set(pendidikan, (pendidikanMap.get(pendidikan) || 0) + 1);
      
      // Kegiatan Rutin
      const kegiatanRaw = (r[COL.kegiatanRutin] || "").toString().trim();
      const kegiatanKat = kegiatanRaw === "" || kegiatanRaw === "_" || kegiatanRaw === "-" ? "Non Rutin" : "Mitra Rutin";
      kegiatanRutinMap.set(kegiatanKat, (kegiatanRutinMap.get(kegiatanKat) || 0) + 1);
    });
    
    const perKec = Array.from(kecMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Group umur into ranges
    const categorizeUmur = (umurStr: string): string => {
      const umurNum = parseInt(umurStr);
      if (isNaN(umurNum)) return "Tidak ada data";
      if (umurNum < 20) return "<20";
      if (umurNum <= 30) return "21-30";
      if (umurNum <= 40) return "31-40";
      if (umurNum <= 50) return "41-50";
      return ">50";
    };
    
    const umurRangeMap = new Map<string, number>();
    umurMap.forEach((count, umurStr) => {
      const range = categorizeUmur(umurStr);
      umurRangeMap.set(range, (umurRangeMap.get(range) || 0) + count);
    });
    
    const umurRangeOrder = ["<20", "21-30", "31-40", "41-50", ">50"];
    const umurData = umurRangeOrder
      .filter(range => umurRangeMap.has(range))
      .map(range => ({ name: range, value: umurRangeMap.get(range) || 0 }));
    
    const pekerjaanData = Array.from(pekerjaanMap.entries())
      .map(([name, value]) => ({ name: name.substring(0, 20), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    const androidData = Array.from(androidMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    const prioritasData = Array.from(prioritasMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const lintasKecData = Array.from(lintasKecMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const lintasDesaData = Array.from(lintasDesaMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const tidakMengalihData = Array.from(tidakMengalihMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const pendidikanData = Array.from(pendidikanMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    const kegiatanRutinData = Array.from(kegiatanRutinMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    return { 
      total, verified, mismatch, notVerified, perKec,
      umurData, pekerjaanData, androidData, prioritasData,
      lintasKecData, lintasDesaData, tidakMengalihData,
      pendidikanData, kegiatanRutinData,
      umurMap, pekerjaanMap, androidMap, prioritasMap,
      lintasKecMap, lintasDesaMap, tidakMengalihMap,
      pendidikanMap, kegiatanRutinMap
    };
  }, [rows]);

  const kecOptions = useMemo(
    () => Array.from(new Set(rows.map(r => (r[COL.kec] || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let out = rows.filter(r => {
      if (filterStatus !== "all") {
        const s = r[COL.status] || "";
        if (filterStatus === "verified" && !isVerified(s)) return false;
        if (filterStatus === "mismatch" && !isMismatch(s)) return false;
        if (filterStatus === "notVerified" && (isVerified(s) || isMismatch(s))) return false;
      }
      if (filterKec !== "all" && (r[COL.kec] || "").trim() !== filterKec) return false;
      if (q) {
        return r.some(c => (c || "").toString().toLowerCase().includes(q));
      }
      return true;
    });
    const idx = COL[sortKey];
    out = [...out].sort((a, b) => {
      const av = (a[idx] || "").toString().toLowerCase();
      const bv = (b[idx] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, search, filterStatus, filterKec, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterKec, pageSize]);

  const toggleSort = (key: keyof typeof COL) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (isVerified(status)) {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />{status || "Terverifikasi"}</Badge>;
    }
    if (isNotVerified(status)) {
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">{status || "Belum Terverifikasi"}</Badge>;
    }
    if (isMismatch(status)) {
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />{status || "Tidak cocok"}</Badge>;
    }
    return <Badge variant="secondary">{status || "-"}</Badge>;
  };

  const pieData = [
    { name: "Terverifikasi", value: stats.verified, color: "#10b981" },
    { name: "Tidak Cocok", value: stats.mismatch, color: "#ef4444" },
    { name: "Belum Terverifikasi", value: stats.notVerified, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
            Konfirmasi KEPKA 2026
          </h1>
          <p className="text-slate-600">Dashboard & Detail Konfirmasi Responden</p>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard Konfirmasi</TabsTrigger>
            <TabsTrigger value="detail">Detail Konfirmasi</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : error ? (
              <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-2"><CardDescription>Total Responden</CardDescription>
                      <CardTitle className="text-3xl flex items-center gap-2"><Users className="h-6 w-6 text-blue-500" />{stats.total.toLocaleString("id-ID")}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="pb-2"><CardDescription>Terverifikasi</CardDescription>
                      <CardTitle className="text-3xl flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-6 w-6" />{stats.verified.toLocaleString("id-ID")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      {stats.total > 0 ? `${((stats.verified / stats.total) * 100).toFixed(1)}% dari total` : "-"}
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="pb-2"><CardDescription>ID/Email Tidak Cocok</CardDescription>
                      <CardTitle className="text-3xl flex items-center gap-2 text-red-600"><XCircle className="h-6 w-6" />{stats.mismatch.toLocaleString("id-ID")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      {stats.total > 0 ? `${((stats.mismatch / stats.total) * 100).toFixed(1)}% dari total` : "-"}
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-2"><CardDescription>Belum Terverifikasi</CardDescription>
                      <CardTitle className="text-3xl flex items-center gap-2 text-amber-600">{stats.notVerified.toLocaleString("id-ID")}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground">
                      {stats.total > 0 ? `${((stats.notVerified / stats.total) * 100).toFixed(1)}% dari total` : "-"}
                    </CardContent>
                  </Card>
                </div>

                {/* Analysis Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Prioritas Pekerjaan BPS */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Prioritas Pekerjaan BPS</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.prioritasData.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-xs truncate">{item.name}</span>
                            <span className="text-xs font-semibold text-blue-600">{item.value}</span>
                          </div>
                        ))}
                        {stats.prioritasData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lintas Kecamatan */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Lintas Kecamatan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.lintasKecData.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-xs truncate">{item.name}</span>
                            <span className="text-xs font-semibold text-purple-600">{item.value}</span>
                          </div>
                        ))}
                        {stats.lintasKecData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lintas Desa */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Lintas Desa</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.lintasDesaData.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-xs truncate">{item.name}</span>
                            <span className="text-xs font-semibold text-indigo-600">{item.value}</span>
                          </div>
                        ))}
                        {stats.lintasDesaData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tidak Mengalihkan */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">Tidak Mengalihkan Pekerjaan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.tidakMengalihData.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-xs truncate">{item.name}</span>
                            <span className="text-xs font-semibold text-cyan-600">{item.value}</span>
                          </div>
                        ))}
                        {stats.tidakMengalihData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Distribusi Status Verifikasi</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Top 10 Kecamatan Domisili</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.perKec.slice(0, 10)} layout="vertical" margin={{ left: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                            {stats.perKec.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Distribusi Umur Responden</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.umurData.slice(0, 15)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">Versi Android Smartphone</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.androidData.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">Pendidikan Terakhir Responden</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.pendidikanData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">Status Kegiatan Rutin 2026</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={stats.kegiatanRutinData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {stats.kegiatanRutinData.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? "#10b981" : "#ef4444"} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* DETAIL */}
          <TabsContent value="detail" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detail Konfirmasi Responden</CardTitle>
                <CardDescription>Cari, filter, dan lihat detail per responden.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, email, sobat ID, kecamatan..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="verified">Terverifikasi</SelectItem>
                      <SelectItem value="mismatch">Tidak Cocok</SelectItem>
                      <SelectItem value="notVerified">Belum Terverifikasi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterKec} onValueChange={setFilterKec}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Kecamatan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kecamatan</SelectItem>
                      {kecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-full md:w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 / hal</SelectItem>
                      <SelectItem value="50">50 / hal</SelectItem>
                      <SelectItem value="100">100 / hal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
                ) : error ? (
                  <div className="py-10 text-center text-red-600">{error}</div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("nama")}>
                              <div className="flex items-center gap-1">Nama Lengkap <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("kec")}>
                              <div className="flex items-center gap-1">Kecamatan <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("desa")}>
                              <div className="flex items-center gap-1">Desa/Kel. <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("sobatId")}>Sobat ID</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("email")}>Email</TableHead>
                            <TableHead>Status NIK</TableHead>
                            <TableHead>Sensus Ekonomi 2026</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageRows.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                          ) : pageRows.map((r, i) => (
                            <TableRow key={i} className={isNotVerified(r[COL.status]) ? "bg-orange-50/30" : isVerified(r[COL.status]) ? "bg-emerald-50/30" : isMismatch(r[COL.status]) ? "bg-red-50/30" : ""}>
                              <TableCell className="text-muted-foreground">{(currentPage - 1) * pageSize + i + 1}</TableCell>
                              <TableCell className="font-medium">{r[COL.nama] || "-"}</TableCell>
                              <TableCell>{r[COL.kec] || "-"}</TableCell>
                              <TableCell>{r[COL.desa] || "-"}</TableCell>
                              <TableCell className="font-mono text-xs">{r[COL.sobatId] || "-"}</TableCell>
                              <TableCell className="text-xs">{r[COL.email] || "-"}</TableCell>
                              <TableCell><StatusBadge status={r[COL.status] || ""} /></TableCell>
                              <TableCell>{r[COL.sensusEkonomi] || "-"}</TableCell>
                              <TableCell className="text-right">
                                <Button size="icon" variant="ghost" onClick={() => setDetailRow(r)} title="Lihat detail">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
                      <div className="text-muted-foreground">
                        Menampilkan {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} data
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(1)}>«</Button>
                        <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>‹</Button>
                        <span className="px-2">Hal {currentPage} / {totalPages}</span>
                        <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>›</Button>
                        <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Responden</DialogTitle>
              <DialogDescription>
                {detailRow ? (detailRow[COL.nama] || "-") : ""}
              </DialogDescription>
            </DialogHeader>
            {detailRow && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {headers.map((h, i) => {
                  const val = detailRow[i];
                  if (!h && !val) return null;
                  const isGDriveLink = val && typeof val === "string" && val.includes("drive.google.com");
                  return (
                    <div key={i} className="border-b pb-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h || `Kolom ${i + 1}`}</div>
                      <div className="text-sm break-words mt-1">
                        {isGDriveLink ? (
                          <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            📸 Klik untuk melihat gambar
                          </a>
                        ) : (
                          val || <span className="text-muted-foreground italic">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}