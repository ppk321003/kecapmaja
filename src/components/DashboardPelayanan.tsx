import { useEffect, useMemo, useState, useRef } from "react";
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

// Word Cloud Component
interface WordCloudProps {
  data: Array<{ name: string; value: number }>;
}

interface WordCloudItem {
  name: string;
  value: number;
  fontSize: number;
  fontWeight: number;
  x: number;
  y: number;
  color: string;
  tier: number;
  originalIdx: number;
}

const WordCloud = ({ data }: WordCloudProps) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Color palette: 3 warna utama dengan shade variations (reference inspired)
  const PALETTE = [
    // Blue series (primary)
    "rgb(3, 105, 161)",     // Deep Blue
    "rgb(14, 165, 233)",    // Sky Blue
    "rgb(59, 130, 246)",    // Medium Blue
    "rgb(96, 165, 250)",    // Light Blue
    
    // Orange series (secondary)
    "rgb(194, 65, 12)",     // Deep Orange
    "rgb(249, 115, 22)",    // Medium Orange
    "rgb(251, 146, 60)",    // Light Orange
    
    // Gray series (tertiary)
    "rgb(51, 65, 85)",      // Slate Gray
    "rgb(100, 116, 139)",   // Medium Gray
    "rgb(148, 163, 184)",   // Light Gray
    
    // Additional neutrals
    "rgb(71, 85, 105)",     // Darker Slate
    "rgb(120, 113, 108)",   // Taupe
    "rgb(156, 163, 175)",   // Lighter Slate
    "rgb(203, 213, 225)",   // Very Light Slate
  ];

  // Helper: Normalisasi text (cleanup typo & duplikasi)
  const normalizeText = (text: string): string => {
    if (!text) return "";
    
    // Mapping typo/singkatan ke full form
    const mappings: Record<string, string> = {
      "petuga": "petugas",
      "banso": "bansos",
      "pendaftaran petuga": "pendaftaran petugas",
      "perekrutan petuga": "perekrutan petugas",
      "pendaftaran s": "pendaftaran sensus",
      "bps jabar": "bps jawa barat",
      "se2026": "sensus ekonomi 2026",
    };

    let normalized = text.trim().toLowerCase();
    
    // Apply mappings
    for (const [from, to] of Object.entries(mappings)) {
      normalized = normalized.replace(new RegExp(`^${from}$`, "i"), to);
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  // Helper: Measure text width
  const measureText = (text: string, fontSize: number): number => {
    const canvas = canvasRef.current || document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return text.length * fontSize * 0.6;

    ctx.font = `700 ${fontSize}px Georgia, serif`;
    const metrics = ctx.measureText(text);
    return metrics.width;
  };

  // Calculate font size dengan smooth scaling (linear interpolation)
  const getZoomProperties = (idx: number, totalItems: number) => {
    const MAX_FONT = 58;
    const MIN_FONT = 12;
    
    if (idx === 0) {
      // Top 1: PALING BESAR, absolutely center
      return { fontSize: MAX_FONT, fontWeight: 700, tier: 1 };
    } else if (idx === 1) {
      // Top 2: 85% of max
      return { fontSize: Math.round(MAX_FONT * 0.85), fontWeight: 700, tier: 2 };
    } else if (idx < 5) {
      // Top 3-5: Linear decrease 70%-55%
      const ratio = 0.70 - (idx - 2) * 0.05;
      return { fontSize: Math.round(MAX_FONT * ratio), fontWeight: 700, tier: 2 };
    } else if (idx < 10) {
      // Top 6-10: Linear decrease 50%-30%
      const ratio = 0.50 - (idx - 5) * 0.04;
      return { fontSize: Math.round(MAX_FONT * ratio), fontWeight: 600, tier: 3 };
    } else if (idx < 20) {
      // Top 11-20: Linear decrease 28%-18%
      const ratio = 0.28 - (idx - 10) * 0.01;
      return { fontSize: Math.round(MAX_FONT * ratio), fontWeight: 500, tier: 4 };
    } else {
      // Top 21+: Min size 12px
      return { fontSize: MIN_FONT, fontWeight: 400, tier: 4 };
    }
  };

  // AABB collision check (rect vs rect with padding)
  const rectsOverlap = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
    padX: number,
    padY: number,
  ): boolean => {
    return !(
      a.x + a.w / 2 + padX <= b.x - b.w / 2 ||
      a.x - a.w / 2 - padX >= b.x + b.w / 2 ||
      a.y + a.h / 2 + padY <= b.y - b.h / 2 ||
      a.y - a.h / 2 - padY >= b.y + b.h / 2
    );
  };

  // Archimedean spiral placement starting from center.
  // Every word (including #1) is placed via spiral so no two words ever overlap.
  const calculatePosition = (
    items: WordCloudItem[],
    index: number,
    canvasWidth: number,
    canvasHeight: number,
  ): { x: number; y: number } => {
    const current = items[index];
    const w = measureText(current.name, current.fontSize);
    const h = current.fontSize * 1.05;
    const padX = 8;
    const padY = 4;

    const placed = items.slice(0, index).map((it) => ({
      x: it.x,
      y: it.y,
      w: measureText(it.name, it.fontSize),
      h: it.fontSize * 1.05,
    }));

    const tryPos = (x: number, y: number) => {
      // bounds
      if (x - w / 2 < -canvasWidth / 2 + 10) return false;
      if (x + w / 2 > canvasWidth / 2 - 10) return false;
      if (y - h / 2 < -canvasHeight / 2 + 10) return false;
      if (y + h / 2 > canvasHeight / 2 - 10) return false;
      const me = { x, y, w, h };
      for (const p of placed) {
        if (rectsOverlap(me, p, padX, padY)) return false;
      }
      return true;
    };

    // First word: try center
    if (index === 0 && tryPos(0, 0)) return { x: 0, y: 0 };

    // Archimedean spiral: r = a * theta, step in arc-length units
    const a = 4; // tightness
    const step = 0.18; // angle step
    const maxTheta = 60 * Math.PI;
    for (let theta = 0.1; theta < maxTheta; theta += step) {
      const r = a * theta;
      if (r > Math.max(canvasWidth, canvasHeight)) break;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta) * 0.62; // ellipse aspect for landscape canvas
      if (tryPos(x, y)) return { x, y };
    }

    // Fallback: place far below (will likely be clipped); shouldn't happen often
    return { x: 0, y: canvasHeight / 2 + 100 };
  };

  // Main positioning dengan text normalization & shade-based colors
  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    // Step 1: Normalize & deduplicate text
    const normalizedMap = new Map<string, number>();
    data.forEach((item) => {
      const normalized = normalizeText(item.name);
      normalizedMap.set(normalized, (normalizedMap.get(normalized) || 0) + item.value);
    });

    // Step 2: Convert map to array and sort
    const normalized = Array.from(normalizedMap).map(([name, value]) => ({ name, value }));
    const sorted = normalized.sort((a, b) => b.value - a.value);

    // Canvas size lebih besar untuk better spread
    const canvasWidth = 1100;
    const canvasHeight = 560;

    // Step 3: Create items dengan smooth font scaling
    const items: WordCloudItem[] = sorted.map((item, idx) => {
      const { fontSize, fontWeight, tier } = getZoomProperties(idx, sorted.length);
      const colorIdx = idx % PALETTE.length; // Cycle through shade palette
      const color = PALETTE[colorIdx];

      return {
        ...item,
        fontSize: Math.max(fontSize, 12),
        fontWeight,
        x: 0,
        y: 0,
        color,
        tier,
        originalIdx: idx,
      };
    });

    // Step 4: Calculate positions dengan collision detection
    const finalItems = items.map((item, idx) => {
      const { x, y } = calculatePosition(items, idx, canvasWidth, canvasHeight);
      return {
        ...item,
        x,
        y,
      };
    });

    return finalItems;
  }, [data]);

  if (processedData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Tidak ada data</p>;
  }

  // SVG dimensions LARGER untuk better spread
  const SVG_WIDTH = 1100;
  const SVG_HEIGHT = 560;
  const CENTER_X = SVG_WIDTH / 2;
  const CENTER_Y = SVG_HEIGHT / 2;

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        style={{ maxHeight: "600px" }}
      >
        <defs>
          {processedData.map((_, idx) => (
            <filter key={`shadow-${idx}`} id={`shadow-${idx}`}>
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
            </filter>
          ))}
        </defs>
        
        <g transform={`translate(${CENTER_X},${CENTER_Y})`}>
          {processedData.map((item, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <text
                textAnchor="middle"
                transform={`translate(${item.x.toFixed(0)},${item.y.toFixed(0)})`}
                style={{
                  fontFamily: "Georgia, serif",
                  fontStyle: "normal",
                  fontWeight: item.fontWeight,
                  fontSize: `${item.fontSize}px`,
                  fill: item.color,
                  opacity: hoveredIdx === idx ? 1 : 0.88,
                  filter: hoveredIdx === idx ? "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" : "none",
                  transition: "opacity 150ms ease-out, filter 150ms ease-out",
                  userSelect: "none",
                  paintOrder: "stroke",
                  stroke: "rgba(255,255,255,0.3)",
                  strokeWidth: "0.5px",
                }}
              >
                {item.name}
              </text>

              {/* Interactive Tooltip on hover */}
              {hoveredIdx === idx && (
                <g>
                  <rect
                    x={item.x - 60}
                    y={item.y - 70}
                    width="120"
                    height="50"
                    fill="rgb(15, 23, 42)"
                    rx="6"
                    opacity="0.95"
                    filter={`url(#shadow-${idx})`}
                  />
                  <text
                    textAnchor="middle"
                    x={item.x}
                    y={item.y - 50}
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      fill: item.color,
                      fontFamily: "sans-serif",
                    }}
                  >
                    {item.value}x
                  </text>
                  <text
                    textAnchor="middle"
                    x={item.x}
                    y={item.y - 32}
                    style={{
                      fontSize: "11px",
                      fill: "rgb(148, 163, 184)",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Tier {item.tier}
                  </text>
                </g>
              )}
            </g>
          ))}
        </g>
      </svg>
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
