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
import { Eye, Search, CheckCircle2, XCircle, Users, Loader2, ArrowUpDown, Check, X, Loader } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const SPREADSHEET_ID = "1Sa6HeJ_PqRMQOHjJc9gGeuYFgHy8Ed5TSzt9dnztkqE";
const SHEET_NAME = "Olah";
const RANGE = `${SHEET_NAME}!A1:BE`;

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
  rekomendasi: colIdx("BE"), // BE - Rekomendasi / Non Rekomendasi
};

// Column mapping untuk MASTER.MITRA
const COL_MITRA = {
  nama: colIdx("A"),        // A - Nama Lengkap
  kec: colIdx("H"),         // H - Alamat Kecamatan
  pendidikan: colIdx("L"),  // L - Pendidikan
  pekerjaan: colIdx("M"),   // M - Pekerjaan
  sobatId: colIdx("P"),     // P - Sobat ID
  statusNik: colIdx("R"),   // R - Status NIK
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

// Helper for Mitra status NIK
const isNikCocok = (s: string) => {
  const v = (s || "").toLowerCase().trim();
  return v.includes("cocok") && !v.includes("tidak");
};
const isNikTidakCocok = (s: string) => {
  const v = (s || "").toLowerCase().trim();
  return v.includes("tidak cocok") || v.includes("tidak sesuai") || v.includes("invalid");
};

export default function KonfirmasiKepka2026() {
  const { toast } = useToast();
  // Responden Sheet
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mitra Sheet
  const [mitriHeaders, setMitriHeaders] = useState<string[]>([]);
  const [mitriRows, setMitriRows] = useState<Row[]>([]);
  const [mitriLoading, setMitriLoading] = useState(true);
  const [mitriError, setMitriError] = useState<string | null>(null);

  // Mitra Tambahan Sheet
  const [mtHeaders, setMtHeaders] = useState<string[]>([]);
  const [mtRows, setMtRows] = useState<Row[]>([]);
  const [mtLoading, setMtLoading] = useState(true);
  const [mtError, setMtError] = useState<string | null>(null);
  const [mtSearch, setMtSearch] = useState("");
  const [mtFilterKec, setMtFilterKec] = useState<string>("all");
  const [mtFilterStatus, setMtFilterStatus] = useState<string>("all");
  const [mtSortKey, setMtSortKey] = useState<keyof typeof COL_MITRA>("nama");
  const [mtSortDir, setMtSortDir] = useState<"asc" | "desc">("asc");
  const [mtPage, setMtPage] = useState(1);
  const [mtPageSize, setMtPageSize] = useState(20);
  const [mtDetailRow, setMtDetailRow] = useState<Row | null>(null);

  // Monitoring Kecamatan Sheet (Kebutuhan Kecamatan A:Q)
  const [kkRows, setKkRows] = useState<Row[]>([]);
  const [kkLoading, setKkLoading] = useState(true);
  const [kkError, setKkError] = useState<string | null>(null);

  // Responden filters & pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterKec, setFilterKec] = useState<string>("all");
  const [filterRekomendasi, setFilterRekomendasi] = useState<string>("all");
  const [sortKey, setSortKey] = useState<keyof typeof COL>("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Mitra filters & pagination
  const [mitriSearch, setMitriSearch] = useState("");
  const [mitriFilterKec, setMitriFilterKec] = useState<string>("all");
  const [mitriFilterStatus, setMitriFilterStatus] = useState<string>("all");
  const [mitriSortKey, setMitriSortKey] = useState<keyof typeof COL_MITRA>("nama");
  const [mitriSortDir, setMitriSortDir] = useState<"asc" | "desc">("asc");
  const [mitriPage, setMitriPage] = useState(1);
  const [mitriPageSize, setMitriPageSize] = useState(20);

  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [mitriDetailRow, setMitriDetailRow] = useState<Row | null>(null);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [confirmChange, setConfirmChange] = useState<{ row: Row; next: "Rekomendasi" | "Non Rekomendasi" | "" } | null>(null);

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

  useEffect(() => {
    (async () => {
      try {
        setMitriLoading(true);
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: "Manajemen Mitra!A1:S" },
        });
        if (error) throw error;
        const values: Row[] = data?.values || [];
        if (values.length === 0) {
          setMitriHeaders([]); setMitriRows([]);
        } else {
          setMitriHeaders(values[0]);
          // Baris 2 di sheet kosong → mulai data dari index 2 (baris 3)
          setMitriRows(values.slice(2).filter(r => r && r.some(c => (c || "").toString().trim() !== "")));
        }
      } catch (e: any) {
        setMitriError(e.message || "Gagal memuat data mitra");
      } finally {
        setMitriLoading(false);
      }
    })();
  }, []);

  // Fetch Mitra Tambahan
  useEffect(() => {
    (async () => {
      try {
        setMtLoading(true);
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: "Mitra Tambahan!A1:S" },
        });
        if (error) throw error;
        const values: Row[] = data?.values || [];
        if (values.length === 0) {
          setMtHeaders([]); setMtRows([]);
        } else {
          setMtHeaders(values[0]);
          setMtRows(values.slice(2).filter(r => r && r.some(c => (c || "").toString().trim() !== "")));
        }
      } catch (e: any) {
        setMtError(e.message || "Gagal memuat data mitra tambahan");
      } finally {
        setMtLoading(false);
      }
    })();
  }, []);

  // Fetch Kebutuhan Kecamatan
  useEffect(() => {
    (async () => {
      try {
        setKkLoading(true);
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: "Kebutuhan Kecamatan!A1:Q" },
        });
        if (error) throw error;
        const values: Row[] = data?.values || [];
        setKkRows(values);
      } catch (e: any) {
        setKkError(e.message || "Gagal memuat data Kebutuhan Kecamatan");
      } finally {
        setKkLoading(false);
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
    const rekomendasiMap = new Map<string, number>();
    
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
      
      // Rekomendasi
      const rekoRaw = (r[COL.rekomendasi] || "").toString().trim();
      const rekoKat = rekoRaw === "" ? "Belum ditentukan" : rekoRaw;
      rekomendasiMap.set(rekoKat, (rekomendasiMap.get(rekoKat) || 0) + 1);
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
    
    const rekomendasiData = Array.from(rekomendasiMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    return { 
      total, verified, mismatch, notVerified, perKec,
      umurData, pekerjaanData, androidData, prioritasData,
      lintasKecData, lintasDesaData, tidakMengalihData,
      pendidikanData, kegiatanRutinData, rekomendasiData,
      umurMap, pekerjaanMap, androidMap, prioritasMap,
      lintasKecMap, lintasDesaMap, tidakMengalihMap,
      pendidikanMap, kegiatanRutinMap, rekomendasiMap
    };
  }, [rows]);

  const kecOptions = useMemo(
    () => Array.from(new Set(rows.map(r => (r[COL.kec] || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  const rekomendasiOptions = useMemo(
    () => {
      const rekoSet = new Set<string>();
      rows.forEach(r => {
        const reko = (r[COL.rekomendasi] || "").trim();
        if (reko === "") {
          rekoSet.add("Belum Ditentukan");
        } else {
          rekoSet.add(reko);
        }
      });
      return Array.from(rekoSet).sort();
    },
    [rows]
  );

  // Mitra stats
  const mitriStats = useMemo(() => {
    const total = mitriRows.length;
    let sent = 0, failed = 0, pending = 0;
    const kecMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    
    mitriRows.forEach(r => {
      const st = r[COL_MITRA.statusKirim] || "";
      if (isSent(st)) sent++;
      else if (isFailed(st)) failed++;
      else if (st.trim() !== "") pending++;
      
      const k = (r[COL_MITRA.kec] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      kecMap.set(k, (kecMap.get(k) || 0) + 1);
      
      const statusVal = (st || "(Tidak diisi)").trim() || "(Tidak diisi)";
      statusMap.set(statusVal, (statusMap.get(statusVal) || 0) + 1);
    });
    
    const perKec = Array.from(kecMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const perStatus = Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    return { total, sent, failed, pending, perKec, perStatus };
  }, [mitriRows]);

  const mitriKecOptions = useMemo(
    () => Array.from(new Set(mitriRows.map(r => (r[COL_MITRA.kec] || "").trim()).filter(Boolean))).sort(),
    [mitriRows]
  );

  const mitriStatusOptions = useMemo(
    () => Array.from(new Set(mitriRows.map(r => (r[COL_MITRA.statusKirim] || "").trim()).filter(Boolean))).sort(),
    [mitriRows]
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
      if (filterRekomendasi !== "all") {
        const reko = (r[COL.rekomendasi] || "").trim();
        const rekoDisplay = reko === "" ? "Belum Ditentukan" : reko;
        if (rekoDisplay !== filterRekomendasi) return false;
      }
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
  }, [rows, search, filterStatus, filterKec, filterRekomendasi, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterKec, filterRekomendasi, pageSize]);

  // Mitra filtered & pagination
  const mitriFiltered = useMemo(() => {
    const q = mitriSearch.toLowerCase().trim();
    let out = mitriRows.filter(r => {
      if (mitriFilterStatus !== "all") {
        const st = (r[COL_MITRA.statusKirim] || "").trim();
        if (mitriFilterStatus === "__blank__") {
          if (st !== "") return false;
        } else if (st !== mitriFilterStatus) return false;
      }
      if (mitriFilterKec !== "all" && (r[COL_MITRA.kec] || "").trim() !== mitriFilterKec) return false;
      if (q) {
        return r.some(c => (c || "").toString().toLowerCase().includes(q));
      }
      return true;
    });
    const idx = COL_MITRA[mitriSortKey];
    out = [...out].sort((a, b) => {
      const av = (a[idx] || "").toString().toLowerCase();
      const bv = (b[idx] || "").toString().toLowerCase();
      if (av < bv) return mitriSortDir === "asc" ? -1 : 1;
      if (av > bv) return mitriSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [mitriRows, mitriSearch, mitriFilterStatus, mitriFilterKec, mitriSortKey, mitriSortDir]);

  const mitriTotalPages = Math.max(1, Math.ceil(mitriFiltered.length / mitriPageSize));
  const mitriCurrentPage = Math.min(mitriPage, mitriTotalPages);
  const mitriPageRows = mitriFiltered.slice((mitriCurrentPage - 1) * mitriPageSize, mitriCurrentPage * mitriPageSize);

  useEffect(() => { setMitriPage(1); }, [mitriSearch, mitriFilterStatus, mitriFilterKec, mitriPageSize]);

  // Mitra Tambahan derived
  const mtKecOptions = useMemo(
    () => Array.from(new Set(mtRows.map(r => (r[COL_MITRA.kec] || "").trim()).filter(Boolean))).sort(),
    [mtRows]
  );
  const mtStatusOptions = useMemo(
    () => Array.from(new Set(mtRows.map(r => (r[COL_MITRA.statusKirim] || "").trim()).filter(Boolean))).sort(),
    [mtRows]
  );
  const mtStats = useMemo(() => {
    const total = mtRows.length;
    let sent = 0, failed = 0, pending = 0;
    mtRows.forEach(r => {
      const st = r[COL_MITRA.statusKirim] || "";
      if (isSent(st)) sent++;
      else if (isFailed(st)) failed++;
      else if (st.trim() !== "") pending++;
    });
    return { total, sent, failed, pending };
  }, [mtRows]);
  const mtFiltered = useMemo(() => {
    const q = mtSearch.toLowerCase().trim();
    let out = mtRows.filter(r => {
      if (mtFilterStatus !== "all") {
        const st = (r[COL_MITRA.statusKirim] || "").trim();
        if (mtFilterStatus === "__blank__") {
          if (st !== "") return false;
        } else if (st !== mtFilterStatus) return false;
      }
      if (mtFilterKec !== "all" && (r[COL_MITRA.kec] || "").trim() !== mtFilterKec) return false;
      if (q) return r.some(c => (c || "").toString().toLowerCase().includes(q));
      return true;
    });
    const idx = COL_MITRA[mtSortKey];
    out = [...out].sort((a, b) => {
      const av = (a[idx] || "").toString().toLowerCase();
      const bv = (b[idx] || "").toString().toLowerCase();
      if (av < bv) return mtSortDir === "asc" ? -1 : 1;
      if (av > bv) return mtSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [mtRows, mtSearch, mtFilterStatus, mtFilterKec, mtSortKey, mtSortDir]);
  const mtTotalPages = Math.max(1, Math.ceil(mtFiltered.length / mtPageSize));
  const mtCurrentPage = Math.min(mtPage, mtTotalPages);
  const mtPageRows = mtFiltered.slice((mtCurrentPage - 1) * mtPageSize, mtCurrentPage * mtPageSize);
  useEffect(() => { setMtPage(1); }, [mtSearch, mtFilterStatus, mtFilterKec, mtPageSize]);
  const toggleMtSort = (key: keyof typeof COL_MITRA) => {
    if (mtSortKey === key) setMtSortDir(d => d === "asc" ? "desc" : "asc");
    else { setMtSortKey(key); setMtSortDir("asc"); }
  };

  const toggleSort = (key: keyof typeof COL) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleMitriSort = (key: keyof typeof COL_MITRA) => {
    if (mitriSortKey === key) setMitriSortDir(d => d === "asc" ? "desc" : "asc");
    else { setMitriSortKey(key); setMitriSortDir("asc"); }
  };

  const applyRekomendasi = async (row: Row, value: "Rekomendasi" | "Non Rekomendasi" | "") => {
    const origIdx = rows.indexOf(row);
    if (origIdx < 0) return;
    const sheetRow = origIdx + 2;
    setSavingRow(sheetRow);
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "update",
          range: `${SHEET_NAME}!BE${sheetRow}`,
          values: [[value]],
        },
      });
      if (error) throw error;
      setRows(prev => prev.map((r, i) => {
        if (i !== origIdx) return r;
        const copy = [...r];
        while (copy.length <= COL.rekomendasi) copy.push("");
        copy[COL.rekomendasi] = value;
        return copy;
      }));
      toast({ title: "Tersimpan", description: value ? `Ditandai sebagai "${value}"` : "Pilihan dikosongkan" });
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e?.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setSavingRow(null);
    }
  };

  const handleRekomendasiClick = (row: Row, next: "Rekomendasi" | "Non Rekomendasi") => {
    const current = (row[COL.rekomendasi] || "").trim();
    if (current === next) {
      // Klik ulang pada pilihan yang sama → kosongkan (dengan konfirmasi)
      setConfirmChange({ row, next: "" });
      return;
    }
    if (current && current !== next) {
      // Mitigasi: user berubah pilihan
      setConfirmChange({ row, next });
      return;
    }
    applyRekomendasi(row, next);
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

  const MitriStatusBadge = ({ status }: { status: string }) => {
    if (isSent(status)) {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Terkirim</Badge>;
    }
    if (isFailed(status)) {
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Gagal</Badge>;
    }
    if (isPending(status)) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Menunggu</Badge>;
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
      <div className="w-full mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
            Konfirmasi KEPKA 2026
          </h1>
          <p className="text-slate-600">Dashboard, Detail Responden & Monitoring Mitra</p>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-5xl mx-auto grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="detail">Detail Responden ({rows.length})</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring Kecamatan</TabsTrigger>
            <TabsTrigger value="mitra">Mitra Kepka 2026 ({mitriRows.length})</TabsTrigger>
            <TabsTrigger value="mitra-tambahan">Mitra Tambahan ({mtRows.length})</TabsTrigger>
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

                {/* Analysis Cards - Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {/* Rekomendasi SE2026 */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-orange-50">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs font-semibold text-orange-800">⭐ Rekomendasi SE2026</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats.rekomendasiData.map((item, idx) => {
                          const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium truncate">{item.name}</span>
                                <span className="text-xs font-bold text-orange-700">{item.value}</span>
                              </div>
                              <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-600" style={{width: `${pct}%`}}></div>
                              </div>
                            </div>
                          );
                        })}
                        {stats.rekomendasiData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Prioritas Pekerjaan BPS */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-50">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs font-semibold text-blue-700">📋 Prioritas Pekerjaan BPS</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats.prioritasData.map((item, idx) => {
                          const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium truncate">{item.name}</span>
                                <span className="text-xs font-bold text-blue-600">{item.value}</span>
                              </div>
                              <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{width: `${pct}%`}}></div>
                              </div>
                            </div>
                          );
                        })}
                        {stats.prioritasData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analysis Cards - Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Lintas Kecamatan */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-50">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs font-semibold text-purple-700">🗺️ Lintas Kecamatan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats.lintasKecData.map((item, idx) => {
                          const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium truncate">{item.name}</span>
                                <span className="text-xs font-bold text-purple-600">{item.value}</span>
                              </div>
                              <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{width: `${pct}%`}}></div>
                              </div>
                            </div>
                          );
                        })}
                        {stats.lintasKecData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lintas Desa */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-indigo-50 to-indigo-50">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs font-semibold text-indigo-700">🏘️ Lintas Desa</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats.lintasDesaData.map((item, idx) => {
                          const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium truncate">{item.name}</span>
                                <span className="text-xs font-bold text-indigo-600">{item.value}</span>
                              </div>
                              <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{width: `${pct}%`}}></div>
                              </div>
                            </div>
                          );
                        })}
                        {stats.lintasDesaData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tidak Mengalihkan */}
                  <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-cyan-50 to-cyan-50">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs font-semibold text-cyan-700">✅ Tidak Mengalihkan Pekerjaan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats.tidakMengalihData.map((item, idx) => {
                          const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium truncate">{item.name}</span>
                                <span className="text-xs font-bold text-cyan-600">{item.value}</span>
                              </div>
                              <div className="w-full h-1.5 bg-cyan-100 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500" style={{width: `${pct}%`}}></div>
                              </div>
                            </div>
                          );
                        })}
                        {stats.tidakMengalihData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                  <Card className="shadow-md">
                    <CardHeader><CardTitle className="text-sm font-bold">📊 Distribusi Status Verifikasi</CardTitle></CardHeader>
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
                  <Select value={filterRekomendasi} onValueChange={setFilterRekomendasi}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Rekomendasi" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Rekomendasi</SelectItem>
                      {rekomendasiOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
                                {(() => {
                                  const rek = (r[COL.rekomendasi] || "").trim();
                                  const origIdx = rows.indexOf(r);
                                  const sheetRow = origIdx + 2;
                                  const isSaving = savingRow === sheetRow;
                                  return (
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="icon"
                                        variant={rek === "Rekomendasi" ? "default" : "ghost"}
                                        className={rek === "Rekomendasi" ? "bg-emerald-600 hover:bg-emerald-700 text-white h-8 w-8" : "h-8 w-8 text-emerald-600 hover:bg-emerald-50"}
                                        disabled={isSaving}
                                        onClick={() => handleRekomendasiClick(r, "Rekomendasi")}
                                        title={rek === "Rekomendasi" ? "Klik untuk batalkan Rekomendasi" : "Tandai Rekomendasi"}
                                      >
                                        {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant={rek === "Non Rekomendasi" ? "default" : "ghost"}
                                        className={rek === "Non Rekomendasi" ? "bg-red-600 hover:bg-red-700 text-white h-8 w-8" : "h-8 w-8 text-red-600 hover:bg-red-50"}
                                        disabled={isSaving}
                                        onClick={() => handleRekomendasiClick(r, "Non Rekomendasi")}
                                        title={rek === "Non Rekomendasi" ? "Klik untuk batalkan Non Rekomendasi" : "Tandai Non Rekomendasi"}
                                      >
                                        {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetailRow(r)} title="Lihat detail">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  );
                                })()}
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

          {/* MITRA KEPKA 2026 */}
          <TabsContent value="mitra" className="space-y-4 mt-6">
            <Card className="border-t-4 border-t-emerald-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Mitra KEPKA 2026
                </CardTitle>
                <CardDescription>Monitoring data Mitra dari sheet MASTER.MITRA — cari, filter, dan lihat detail status pengiriman.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mini stat strip — pembeda visual dari tab Detail Responden */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                    <div className="text-xs text-emerald-700/70">Total Mitra</div>
                    <div className="text-2xl font-bold text-emerald-700">{mitriStats.total.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="rounded-lg bg-teal-50 border border-teal-100 p-3">
                    <div className="text-xs text-teal-700/70">Terkirim</div>
                    <div className="text-2xl font-bold text-teal-700">{mitriStats.sent.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                    <div className="text-xs text-amber-700/70">Menunggu</div>
                    <div className="text-2xl font-bold text-amber-700">{mitriStats.pending.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                    <div className="text-xs text-rose-700/70">Gagal</div>
                    <div className="text-2xl font-bold text-rose-700">{mitriStats.failed.toLocaleString("id-ID")}</div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, pekerjaan, kecamatan, no. HP..."
                      value={mitriSearch}
                      onChange={(e) => setMitriSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                   <Select value={mitriFilterStatus} onValueChange={setMitriFilterStatus}>
                     <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status Kirim" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Semua Status</SelectItem>
                       <SelectItem value="__blank__">(Belum Diisi / Kosong)</SelectItem>
                       {mitriStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                     </SelectContent>
                   </Select>
                  <Select value={mitriFilterKec} onValueChange={setMitriFilterKec}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Kecamatan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kecamatan</SelectItem>
                      {mitriKecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={String(mitriPageSize)} onValueChange={(v) => setMitriPageSize(Number(v))}>
                    <SelectTrigger className="w-full md:w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 / hal</SelectItem>
                      <SelectItem value="50">50 / hal</SelectItem>
                      <SelectItem value="100">100 / hal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mitriLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
                ) : mitriError ? (
                  <div className="py-10 text-center text-red-600">{mitriError}</div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-emerald-50/60">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("nama")}>
                              <div className="flex items-center gap-1">Nama <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("pekerjaan")}>
                              <div className="flex items-center gap-1">Pekerjaan <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("kec")}>
                              <div className="flex items-center gap-1">Kecamatan <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("noHp")}>
                              <div className="flex items-center gap-1">No. HP <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("statusKirim")}>
                              <div className="flex items-center gap-1">Status Kirim <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mitriPageRows.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                          ) : mitriPageRows.map((r, i) => {
                            const st = r[COL_MITRA.statusKirim] || "";
                            const rowBg = isSent(st) ? "bg-emerald-50/30" : isFailed(st) ? "bg-red-50/30" : isPending(st) ? "bg-amber-50/20" : "";
                            return (
                              <TableRow key={i} className={rowBg}>
                                <TableCell className="text-muted-foreground">{(mitriCurrentPage - 1) * mitriPageSize + i + 1}</TableCell>
                                <TableCell className="font-medium">{r[COL_MITRA.nama] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.pekerjaan] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.kec] || "-"}</TableCell>
                                <TableCell className="font-mono text-xs">{r[COL_MITRA.noHp] || "-"}</TableCell>
                                <TableCell><MitriStatusBadge status={st} /></TableCell>
                                <TableCell className="text-right">
                                  <Button size="icon" variant="ghost" onClick={() => setMitriDetailRow(r)} title="Lihat detail">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
                      <div className="text-muted-foreground">
                        Menampilkan {(mitriCurrentPage - 1) * mitriPageSize + 1}-{Math.min(mitriCurrentPage * mitriPageSize, mitriFiltered.length)} dari {mitriFiltered.length} mitra
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={mitriCurrentPage <= 1} onClick={() => setMitriPage(1)}>«</Button>
                        <Button size="sm" variant="outline" disabled={mitriCurrentPage <= 1} onClick={() => setMitriPage(p => p - 1)}>‹</Button>
                        <span className="px-2">Hal {mitriCurrentPage} / {mitriTotalPages}</span>
                        <Button size="sm" variant="outline" disabled={mitriCurrentPage >= mitriTotalPages} onClick={() => setMitriPage(p => p + 1)}>›</Button>
                        <Button size="sm" variant="outline" disabled={mitriCurrentPage >= mitriTotalPages} onClick={() => setMitriPage(mitriTotalPages)}>»</Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MONITORING KECAMATAN */}
          <TabsContent value="monitoring" className="space-y-4 mt-6">
            <Card className="border-t-4 border-t-indigo-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Monitoring Kecamatan
                </CardTitle>
                <CardDescription>Rekap kebutuhan, status Google Form, manajemen mitra & rekomendasi penanggung jawab per kecamatan.</CardDescription>
              </CardHeader>
              <CardContent>
                {kkLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
                ) : kkError ? (
                  <div className="py-10 text-center text-red-600">{kkError}</div>
                ) : kkRows.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">Tidak ada data</div>
                ) : (() => {
                  // Column groups based on screenshot
                  // A,B = Identitas | C-E = Kebutuhan | F-J = Status Google Form | K-L = Manajemen Mitra | M-Q = Rekomendasi
                  const groupOf = (i: number) => {
                    if (i <= 1) return "id";
                    if (i <= 4) return "kebutuhan";
                    if (i <= 9) return "status";
                    if (i <= 11) return "manajemen";
                    return "rekomendasi";
                  };
                  const groupBg: Record<string, string> = {
                    id: "bg-slate-100",
                    kebutuhan: "bg-orange-100",
                    status: "bg-blue-100",
                    manajemen: "bg-rose-100",
                    rekomendasi: "bg-emerald-100",
                  };
                  const groupCellBg: Record<string, string> = {
                    id: "",
                    kebutuhan: "bg-orange-50/40",
                    status: "bg-blue-50/40",
                    manajemen: "bg-rose-50/40",
                    rekomendasi: "bg-emerald-50/40",
                  };
                  const groupLabels: Array<{ label: string; span: number; bg: string }> = [
                    { label: "Identitas Wilayah", span: 2, bg: "bg-slate-200 text-slate-700" },
                    { label: "Kebutuhan Sensus Ekonomi 2026", span: 3, bg: "bg-orange-200 text-orange-800" },
                    { label: "Status Google Form", span: 5, bg: "bg-blue-200 text-blue-800" },
                    { label: "Manajemen Mitra", span: 2, bg: "bg-rose-200 text-rose-800" },
                    { label: "Rekomendasi Penanggungjawab", span: 5, bg: "bg-emerald-200 text-emerald-800" },
                  ];
                  const headerRow = kkRows[0] || [];
                  const dataRows = kkRows.slice(1).filter(r => r && r.some(c => (c || "").toString().trim() !== ""));
                  const cols = 17; // A:Q
                  return (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {groupLabels.map((g, gi) => (
                              <TableHead key={gi} colSpan={g.span} className={`text-center font-bold border ${g.bg}`}>
                                {g.label}
                              </TableHead>
                            ))}
                          </TableRow>
                          <TableRow>
                            {Array.from({ length: cols }).map((_, i) => (
                              <TableHead key={i} className={`text-center text-xs font-semibold border ${groupBg[groupOf(i)]}`}>
                                {headerRow[i] || ""}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dataRows.map((r, ri) => {
                            const isTotal = ri === dataRows.length - 1 && (r[1] || "").toString().toUpperCase().includes("KAB");
                            return (
                              <TableRow key={ri} className={isTotal ? "bg-yellow-50 font-bold" : "hover:bg-slate-50"}>
                                {Array.from({ length: cols }).map((_, ci) => {
                                  const v = r[ci] ?? "";
                                  const isText = ci === 0 || ci === 1;
                                  return (
                                    <TableCell key={ci} className={`text-xs border ${groupCellBg[groupOf(ci)]} ${isText ? "" : "text-center font-mono"}`}>
                                      {v || ""}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MITRA TAMBAHAN */}
          <TabsContent value="mitra-tambahan" className="space-y-4 mt-6">
            <Card className="border-t-4 border-t-sky-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-600" />
                  Mitra Tambahan
                </CardTitle>
                <CardDescription>Monitoring data Mitra dari sheet Mitra Tambahan — cari, filter, dan lihat detail status pengiriman.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
                    <div className="text-xs text-sky-700/70">Total Mitra</div>
                    <div className="text-2xl font-bold text-sky-700">{mtStats.total.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="rounded-lg bg-teal-50 border border-teal-100 p-3">
                    <div className="text-xs text-teal-700/70">Terkirim</div>
                    <div className="text-2xl font-bold text-teal-700">{mtStats.sent.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                    <div className="text-xs text-amber-700/70">Menunggu</div>
                    <div className="text-2xl font-bold text-amber-700">{mtStats.pending.toLocaleString("id-ID")}</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                    <div className="text-xs text-rose-700/70">Gagal</div>
                    <div className="text-2xl font-bold text-rose-700">{mtStats.failed.toLocaleString("id-ID")}</div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, pekerjaan, kecamatan, no. HP..."
                      value={mtSearch}
                      onChange={(e) => setMtSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={mtFilterStatus} onValueChange={setMtFilterStatus}>
                    <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status Kirim" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="__blank__">(Belum Diisi / Kosong)</SelectItem>
                      {mtStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={mtFilterKec} onValueChange={setMtFilterKec}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Kecamatan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kecamatan</SelectItem>
                      {mtKecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={String(mtPageSize)} onValueChange={(v) => setMtPageSize(Number(v))}>
                    <SelectTrigger className="w-full md:w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 / hal</SelectItem>
                      <SelectItem value="50">50 / hal</SelectItem>
                      <SelectItem value="100">100 / hal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mtLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-sky-600" /></div>
                ) : mtError ? (
                  <div className="py-10 text-center text-red-600">{mtError}</div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-sky-50/60">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMtSort("nama")}>
                              <div className="flex items-center gap-1">Nama <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMtSort("pekerjaan")}>
                              <div className="flex items-center gap-1">Pekerjaan <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMtSort("kec")}>
                              <div className="flex items-center gap-1">Kecamatan <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMtSort("noHp")}>
                              <div className="flex items-center gap-1">No. HP <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMtSort("statusKirim")}>
                              <div className="flex items-center gap-1">Status Kirim <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mtPageRows.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                          ) : mtPageRows.map((r, i) => {
                            const st = r[COL_MITRA.statusKirim] || "";
                            const rowBg = isSent(st) ? "bg-emerald-50/30" : isFailed(st) ? "bg-red-50/30" : isPending(st) ? "bg-amber-50/20" : "";
                            return (
                              <TableRow key={i} className={rowBg}>
                                <TableCell className="text-muted-foreground">{(mtCurrentPage - 1) * mtPageSize + i + 1}</TableCell>
                                <TableCell className="font-medium">{r[COL_MITRA.nama] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.pekerjaan] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.kec] || "-"}</TableCell>
                                <TableCell className="font-mono text-xs">{r[COL_MITRA.noHp] || "-"}</TableCell>
                                <TableCell><MitriStatusBadge status={st} /></TableCell>
                                <TableCell className="text-right">
                                  <Button size="icon" variant="ghost" onClick={() => setMtDetailRow(r)} title="Lihat detail">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
                      <div className="text-muted-foreground">
                        Menampilkan {(mtCurrentPage - 1) * mtPageSize + 1}-{Math.min(mtCurrentPage * mtPageSize, mtFiltered.length)} dari {mtFiltered.length} mitra
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" disabled={mtCurrentPage <= 1} onClick={() => setMtPage(1)}>«</Button>
                        <Button size="sm" variant="outline" disabled={mtCurrentPage <= 1} onClick={() => setMtPage(p => p - 1)}>‹</Button>
                        <span className="px-2">Hal {mtCurrentPage} / {mtTotalPages}</span>
                        <Button size="sm" variant="outline" disabled={mtCurrentPage >= mtTotalPages} onClick={() => setMtPage(p => p + 1)}>›</Button>
                        <Button size="sm" variant="outline" disabled={mtCurrentPage >= mtTotalPages} onClick={() => setMtPage(mtTotalPages)}>»</Button>
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

        {/* Mitra Detail Dialog */}
        <Dialog open={!!mitriDetailRow} onOpenChange={(o) => !o && setMitriDetailRow(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Detail Mitra
              </DialogTitle>
              <DialogDescription>
                {mitriDetailRow ? (mitriDetailRow[COL_MITRA.nama] || "-") : ""}
              </DialogDescription>
            </DialogHeader>
            {mitriDetailRow && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {mitriHeaders.map((h, i) => {
                  const val = mitriDetailRow[i];
                  if (!h && !val) return null;
                  return (
                    <div key={i} className="border-b pb-2">
                      <div className="text-xs font-semibold text-emerald-700/80 uppercase tracking-wide">{h || `Kolom ${i + 1}`}</div>
                      <div className="text-sm break-words mt-1">
                        {val || <span className="text-muted-foreground italic">-</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mitra Tambahan Detail Dialog */}
        <Dialog open={!!mtDetailRow} onOpenChange={(o) => !o && setMtDetailRow(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-sky-600" />
                Detail Mitra Tambahan
              </DialogTitle>
              <DialogDescription>
                {mtDetailRow ? (mtDetailRow[COL_MITRA.nama] || "-") : ""}
              </DialogDescription>
            </DialogHeader>
            {mtDetailRow && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {mtHeaders.map((h, i) => {
                  const val = mtDetailRow[i];
                  if (!h && !val) return null;
                  return (
                    <div key={i} className="border-b pb-2">
                      <div className="text-xs font-semibold text-sky-700/80 uppercase tracking-wide">{h || `Kolom ${i + 1}`}</div>
                      <div className="text-sm break-words mt-1">
                        {val || <span className="text-muted-foreground italic">-</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm change Rekomendasi */}
        <Dialog open={!!confirmChange} onOpenChange={(o) => !o && setConfirmChange(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Konfirmasi Perubahan</DialogTitle>
              <DialogDescription>
                {confirmChange && (() => {
                  const cur = (confirmChange.row[COL.rekomendasi] || "").trim() || "(kosong)";
                  const nxt = confirmChange.next || "(kosong)";
                  const nama = confirmChange.row[COL.nama] || "-";
                  return `Ubah pilihan untuk "${nama}" dari "${cur}" menjadi "${nxt}"?`;
                })()}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmChange(null)}>Batal</Button>
              <Button
                onClick={async () => {
                  if (!confirmChange) return;
                  const { row, next } = confirmChange;
                  setConfirmChange(null);
                  await applyRekomendasi(row, next);
                }}
              >
                Ya, Ubah
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}