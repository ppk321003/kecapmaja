import { useEffect, useMemo, useState, useRef } from "react";
import cloud from "d3-cloud";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Users, UserCheck, CalendarDays, TrendingUp, GraduationCap, Building2 } from "lucide-react";

// Word Cloud Component (powered by d3-cloud — guaranteed no-overlap)
interface WordCloudProps {
  data: Array<{ name: string; value: number }>;
}

interface PlacedWord {
  text: string;
  value: number;
  size: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
}

const WordCloud = ({ data }: WordCloudProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [placed, setPlaced] = useState<PlacedWord[]>([]);

  const SVG_WIDTH = 1100;
  const SVG_HEIGHT = 520;

  // Reference palette: slate, orange, blue (3 warna utama)
  const PALETTE = [
    "rgb(51, 65, 85)",   // slate
    "rgb(194, 65, 12)",  // orange
    "rgb(3, 105, 161)",  // blue
  ];

  const normalizeText = (text: string): string => {
    if (!text) return "";
    const mappings: Record<string, string> = {
      "petuga": "petugas",
      "banso": "bansos",
      "pendaftaran petuga": "pendaftaran petugas",
      "perekrutan petuga": "perekrutan petugas",
      "pendaftaran s": "pendaftaran sensus",
      "bps jabar": "bps jawa barat",
      "se2026": "sensus ekonomi 2026",
    };
    let n = text.trim().toLowerCase();
    for (const [from, to] of Object.entries(mappings)) {
      n = n.replace(new RegExp(`^${from}$`, "i"), to);
    }
    return n.charAt(0).toUpperCase() + n.slice(1);
  };

  const words = useMemo(() => {
    if (data.length === 0) return [] as Array<{ text: string; value: number }>;
    const map = new Map<string, number>();
    data.forEach((d) => {
      const k = normalizeText(d.name);
      if (!k) return;
      map.set(k, (map.get(k) || 0) + d.value);
    });
    return Array.from(map, ([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 60);
  }, [data]);

  useEffect(() => {
    if (words.length === 0) {
      setPlaced([]);
      return;
    }
    const max = words[0].value;
    const min = words[words.length - 1].value;
    const MIN_FS = 14;
    const MAX_FS = 70;
    const sizeFor = (v: number) => {
      if (max === min) return (MIN_FS + MAX_FS) / 2;
      const t = (v - min) / (max - min);
      // strong ease-out — top words clearly dominant, long tail at MIN
      const eased = Math.pow(t, 0.4);
      return MIN_FS + eased * (MAX_FS - MIN_FS);
    };

    const layoutWords = words.map((w, i) => ({
      text: w.text,
      value: w.value,
      size: sizeFor(w.value),
      // rotate through 3 colors deterministically
      color: PALETTE[i % PALETTE.length],
    }));

    let cancelled = false;
    cloud()
      .size([SVG_WIDTH, SVG_HEIGHT])
      .words(layoutWords as any)
      .padding(3)
      .rotate(() => 0) // horizontal only, like reference
      .font("Georgia, 'Times New Roman', serif")
      .fontWeight(() => 400)
      .fontSize((d: any) => d.size)
      .spiral("archimedean")
      .random(() => 0.5) // deterministic placement
      .on("end", (out: any[]) => {
        if (cancelled) return;
        setPlaced(
          out.map((d) => ({
            text: d.text,
            value: d.value,
            size: d.size,
            x: d.x,
            y: d.y,
            rotate: d.rotate,
            color: d.color,
          })),
        );
      })
      .start();

    return () => {
      cancelled = true;
    };
  }, [words]);

  if (words.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Tidak ada data</p>;
  }

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden bg-white rounded-lg">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        style={{ maxHeight: "560px" }}
      >
        <g transform={`translate(${SVG_WIDTH / 2},${SVG_HEIGHT / 2})`}>
          {placed.map((w, idx) => (
            <g
              key={`${w.text}-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              <text
                textAnchor="middle"
                transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "normal",
                  fontWeight: 400,
                  fontSize: `${w.size}px`,
                  fill: w.color,
                  opacity: hoveredIdx === null || hoveredIdx === idx ? 1 : 0.35,
                  transition: "opacity 150ms ease-out",
                  userSelect: "none",
                }}
              >
                {w.text}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {hoveredIdx !== null && placed[hoveredIdx] && (
        <div className="absolute top-3 right-3 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg">
          {placed[hoveredIdx].text} · {placed[hoveredIdx].value}x
        </div>
      )}
    </div>
  );
};

const TAMU_SPREADSHEET_ID = "1Q9kPlXg18BvAtnbM-cpoQ0xud1zC3rpA6CDa3EZcRGY";
const TAMU_SHEET = "Sheet1";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

interface DashboardPelayananProps {
  filterTahun?: string;
}

interface TamuRow {
  timestamp: string;
  nama: string;
  asal: string;
  noHp: string;
  kepentingan: string;
  tujuan: string;
  jenisKelamin: string;
  email: string;
  umur: string;
  pendidikan: string;
  date: Date | null;
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Parse format "HH:MM, DD/MM/YYYY"
const parseTimestamp = (ts: string): Date | null => {
  if (!ts) return null;
  const m = ts.match(/(\d{2}):(\d{2}),\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(
    parseInt(m[5]),
    parseInt(m[4]) - 1,
    parseInt(m[3]),
    parseInt(m[1]),
    parseInt(m[2]),
  );
};

const DashboardPelayanan = ({ filterTahun }: DashboardPelayananProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<TamuRow[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: err } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: TAMU_SPREADSHEET_ID,
            operation: "read",
            range: `${TAMU_SHEET}!A:L`,
          },
        });
        if (err) throw err;
        const values: any[][] = data?.values || [];
        if (values.length < 2) {
          setRows([]);
          return;
        }
        const parsed: TamuRow[] = values.slice(1).map((r) => ({
          timestamp: String(r[0] || "").trim(),
          nama: String(r[1] || "").trim(),
          asal: String(r[2] || "").trim(),
          noHp: String(r[3] || "").trim(),
          kepentingan: String(r[4] || "").trim(),
          tujuan: String(r[5] || "").trim(),
          // r[6]=noHpTujuan, r[7]=reserved
          jenisKelamin: String(r[8] || "").trim(),
          email: String(r[9] || "").trim(),
          umur: String(r[10] || "").trim(),
          pendidikan: String(r[11] || "").trim(),
          date: parseTimestamp(String(r[0] || "")),
        })).filter((r) => r.nama);
        setRows(parsed);
      } catch (e: any) {
        console.error("[DashboardPelayanan] Error:", e);
        setError(e?.message || "Gagal memuat data tamu");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Filter by tahun
  const filtered = useMemo(() => {
    if (!filterTahun) return rows;
    const yr = parseInt(filterTahun);
    return rows.filter((r) => r.date && r.date.getFullYear() === yr);
  }, [rows, filterTahun]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const uniquePengunjung = new Set(filtered.map((r) => r.nama.toLowerCase())).size;
    const uniqueInstansi = new Set(filtered.map((r) => r.asal.toLowerCase()).filter(Boolean)).size;

    // Bulan teramai
    const perBulan: Record<number, number> = {};
    filtered.forEach((r) => {
      if (r.date) {
        const m = r.date.getMonth();
        perBulan[m] = (perBulan[m] || 0) + 1;
      }
    });
    let peakBulan = { name: "-", value: 0 };
    Object.entries(perBulan).forEach(([k, v]) => {
      if (v > peakBulan.value) peakBulan = { name: BULAN[parseInt(k)], value: v };
    });

    // Hari ini
    const today = new Date();
    const todayCount = filtered.filter(
      (r) =>
        r.date &&
        r.date.getFullYear() === today.getFullYear() &&
        r.date.getMonth() === today.getMonth() &&
        r.date.getDate() === today.getDate(),
    ).length;

    return { total, uniquePengunjung, uniqueInstansi, peakBulan, todayCount };
  }, [filtered]);

  // Trend per bulan
  const trendBulanan = useMemo(() => {
    const counts = new Array(12).fill(0);
    filtered.forEach((r) => {
      if (r.date) counts[r.date.getMonth()]++;
    });
    return counts.map((c, i) => ({ name: BULAN[i], value: c }));
  }, [filtered]);

  // Distribusi Jenis Kelamin
  const jenisKelaminData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const k = r.jenisKelamin || "Tidak diisi";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Distribusi Umur
  const umurData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const k = r.umur || "Tidak diisi";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Distribusi Pendidikan
  const pendidikanData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const k = r.pendidikan || "Tidak diisi";
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Kepentingan (dengan perlakuan khusus untuk "Lainnya - ")
  const kepentinganData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      // Bisa multi kepentingan (comma-separated) – split kalau ada
      const items = r.kepentingan.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      if (items.length === 0) {
        map["Tidak diisi"] = (map["Tidak diisi"] || 0) + 1;
      } else {
        items.forEach((it) => {
          map[it] = (map[it] || 0) + 1;
        });
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Kepentingan dengan perlakuan khusus untuk "Lainnya - "
  const kepentinganRefinedData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      // Bisa multi kepentingan (comma-separated) – split kalau ada
      const items = r.kepentingan.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      if (items.length === 0) {
        map["Tidak diisi"] = (map["Tidak diisi"] || 0) + 1;
      } else {
        items.forEach((it) => {
          // Jika dimulai dengan "Lainnya - ", ambil hanya bagian setelahnya
          let displayName = it;
          if (it.startsWith("Lainnya - ")) {
            displayName = it.substring(10); // "Lainnya - ".length = 10
          }
          map[displayName] = (map[displayName] || 0) + 1;
        });
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Top 10 Instansi
  const topInstansi = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.asal) map[r.asal] = (map[r.asal] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  // Top 10 Tujuan (pegawai yang paling sering dituju)
  const topTujuan = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.tujuan) map[r.tujuan] = (map[r.tujuan] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto h-12 w-12 opacity-30 mb-3" />
          <p>Belum ada data tamu untuk tahun {filterTahun || "ini"}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Kunjungan</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {stats.total.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-blue-700 mt-1">Tamu tercatat</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Pengunjung Unik</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              {stats.uniquePengunjung.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-emerald-700 mt-1">Berdasarkan nama</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Instansi Berbeda</CardTitle>
            <Building2 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">
              {stats.uniqueInstansi.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-amber-700 mt-1">Asal tamu</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Bulan Teramai</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.peakBulan.name}</div>
            <p className="text-xs text-purple-700 mt-1">
              {stats.peakBulan.value} kunjungan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Bulanan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Tren Kunjungan Bulanan
          </CardTitle>
          <CardDescription>
            Jumlah kunjungan tamu per bulan{filterTahun ? ` tahun ${filterTahun}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendBulanan}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Kunjungan"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Kepentingan (Word Cloud Card) */}
      <Card>
        <CardHeader>
          <CardTitle>Kepentingan Tamu</CardTitle>
          <CardDescription>Layanan dan aktivitas utama yang dicari tamu</CardDescription>
        </CardHeader>
        <CardContent>
          <WordCloud data={kepentinganRefinedData} />
        </CardContent>
      </Card>

      {/* Demografi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Jenis Kelamin</CardTitle>
            <CardDescription>Komposisi tamu berdasarkan jenis kelamin</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={jenisKelaminData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {jenisKelaminData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Kelompok Umur</CardTitle>
            <CardDescription>Komposisi tamu berdasarkan kelompok umur</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={umurData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-25} textAnchor="end" height={70} fontSize={11} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" name="Jumlah" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Tingkat Pendidikan
            </CardTitle>
            <CardDescription>Pendidikan tertinggi yang ditamatkan</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pendidikanData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" name="Jumlah" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jenis Kepentingan</CardTitle>
            <CardDescription>Layanan yang paling banyak diakses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={kepentinganData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  dataKey="value"
                >
                  {kepentinganData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Instansi/Asal Tamu</CardTitle>
            <CardDescription>Instansi yang paling sering berkunjung</CardDescription>
          </CardHeader>
          <CardContent>
            {topInstansi.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topInstansi} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={140} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" name="Kunjungan" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Pegawai Dituju</CardTitle>
            <CardDescription>Pegawai yang paling sering ditemui tamu</CardDescription>
          </CardHeader>
          <CardContent>
            {topTujuan.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topTujuan} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={140} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" name="Kunjungan" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPelayanan;
