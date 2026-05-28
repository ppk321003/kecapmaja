import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, ArrowUpDown, ChevronLeft, ChevronRight, MapPin, Hotel, Calendar, Users, BookOpen } from "lucide-react";
import { PelatihanSE26 } from "@/components/PelatihanSE26";

type Row = string[];

const SPREADSHEET_ID = "1qjI9ZCRGeoe-suPWP8dyjUtqejjBO8qiRaPIyextcg4";
const SHEET_NAME = "GABUNG KELAS";
const RANGE = `${SHEET_NAME}!A1:M`; // Range A:M for all data columns

// Column header names (source of truth)
const COLUMN_HEADERS = {
  no: "No",
  sobat_id: "SOBAT ID",
  nama_petugas: "Nama Petugas",
  nik: "NIK",
  jabatan: "Jabatan",
  kecamatan: "Kecamatan",
  email: "email",
  bank: "BANK",
  nomor_rekening: "NOMOR REKENING",
  idkelas: "IDKELAS",
  hotel: "Hotel",
  gelombang: "Gelombang",
  kelas: "Kelas",
};

// Alternative header names for flexible matching
const HEADER_ALIASES: { [key: string]: string[] } = {
  tanggal: ["Tanggal", "Tanggal Pelaksanaan", "Tanggal Pelatihan", "Tgl", "Date", "Tanggal Mulai"],
  gelombang: ["Gelombang", "Gelombang Pelatihan", "Wave"],
  hotel: ["Hotel", "Hotel Tempat Pelatihan", "Tempat"],
  kelas: ["Kelas", "Kelas Pelatihan", "Class"],
  nik: ["NIK", "No Induk"],
  email: ["email", "Email", "EMAIL", "e-mail"],
  jabatan: ["Jabatan", "JABATAN", "Position", "Role"],
};

// Natural sort for class names (A, B, C, ... AA, AB, AC ...)
const classToSortValue = (cls: string): number => {
  if (!cls || !cls.trim()) return Infinity; // Put blank at end
  const s = cls.trim().toUpperCase();
  let value = 0;
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i) - 64; // A=1, B=2, ..., Z=26
    if (code < 1 || code > 26) return Infinity;
    value = value * 26 + code;
  }
  return value;
};

// Get jabatan priority for sorting (when filtering by kelas)
const getJabatanPriority = (jabatan: string): number => {
  const j = (jabatan || "").toString().trim();
  if (j === "Instruktur Daerah") return 1;
  if (j === "Panitia 1") return 2;
  if (j === "Panitia 2") return 3;
  return 4; // others
};

// Map kelas to date range (Kelas A-L, M-X, Y-AJ, AK-AV)
const getTanggalFromKelas = (kelas: string): string => {
  const k = (kelas || "").toString().trim().toUpperCase();
  if (!k) return "-";
  
  // Convert kelas to numeric value for range checking
  let value = 0;
  for (let i = 0; i < k.length; i++) {
    const code = k.charCodeAt(i) - 64; // A=1, B=2, ..., Z=26
    if (code < 1 || code > 26) return "-";
    value = value * 26 + code;
  }
  
  // A-L = 1-4 Juni 2026 (A=1, B=2, ... L=12)
  if (value >= 1 && value <= 12) {
    return "1-4 Juni 2026";
  }
  // M-X = 4-7 Juni 2026 (M=13, N=14, ... X=24)
  if (value >= 13 && value <= 24) {
    return "4-7 Juni 2026";
  }
  // Y-AJ = 8-11 Juni 2026 (Y=25, Z=26, AA=27, AB=28, AC=29, AD=30, AE=31, AF=32, AG=33, AH=34, AI=35, AJ=36)
  if (value >= 25 && value <= 36) {
    return "8-11 Juni 2026";
  }
  // AK-AV = 11-14 Juni 2026 (AK=37, AL=38, ... AV=48)
  if (value >= 37 && value <= 48) {
    return "11-14 Juni 2026";
  }
  
  return "-";
};

// Color palette for different class badges - alternating warm/cool for maximum contrast
const CLASS_COLORS = [
  "bg-gradient-to-r from-red-900 to-red-500",              // A - Red/Warm
  "bg-gradient-to-r from-blue-900 to-blue-400",            // B - Blue/Cool (max contrast from A)
  "bg-gradient-to-r from-orange-900 to-orange-400",        // C - Orange/Warm (max contrast from B)
  "bg-gradient-to-r from-green-900 to-green-400",          // D - Green/Cool (max contrast from C)
  "bg-gradient-to-r from-purple-900 to-purple-400",        // E - Purple/Warm (max contrast from D)
  "bg-gradient-to-r from-cyan-900 to-cyan-400",            // F - Cyan/Cool (max contrast from E)
  "bg-gradient-to-r from-pink-900 to-pink-400",            // G - Pink/Warm (max contrast from F)
  "bg-gradient-to-r from-teal-900 to-teal-400",            // H - Teal/Cool (max contrast from G)
  "bg-gradient-to-r from-rose-900 to-rose-400",            // I - Rose/Warm (max contrast from H)
  "bg-gradient-to-r from-indigo-900 to-indigo-400",        // J - Indigo/Cool (max contrast from I)
  "bg-gradient-to-r from-amber-900 to-amber-400",          // K - Amber/Warm (max contrast from J)
  "bg-gradient-to-r from-emerald-900 to-emerald-400",      // L - Emerald/Cool (max contrast from K)
  "bg-gradient-to-r from-fuchsia-900 to-fuchsia-400",      // M - Fuchsia/Warm (max contrast from L)
  "bg-gradient-to-r from-slate-700 to-slate-400",          // N - Slate/Cool (max contrast from M)
  "bg-gradient-to-r from-lime-900 to-lime-400",            // O - Lime/Warm (max contrast from N)
  "bg-gradient-to-r from-sky-900 to-sky-400",              // P - Sky/Cool (max contrast from O)
];

// Create color mapping for classes
const createClassColorMap = (classes: string[]): Map<string, string> => {
  const map = new Map<string, string>();
  const sortedClasses = [...classes].sort((a, b) => classToSortValue(a) - classToSortValue(b));
  sortedClasses.forEach((cls, idx) => {
    map.set(cls, CLASS_COLORS[idx % CLASS_COLORS.length]);
  });
  return map;
};

// Find column index by header name (with aliases support)
const findColumnIndex = (headers: string[], headerKey: string): number => {
  const headerNames = (headers || []).map(h => (h || "").toString());
  
  // Get all possible names for this header
  const possibleNames = HEADER_ALIASES[headerKey]?.length > 0 
    ? HEADER_ALIASES[headerKey] 
    : [COLUMN_HEADERS[headerKey as keyof typeof COLUMN_HEADERS] || headerKey];
  
  // Try each possible name
  for (const name of possibleNames) {
    const index = headerNames.findIndex(
      (h) => h && h.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (index >= 0) {
      if (process.env.NODE_ENV === "development") {
        console.log(`✓ Found "${headerKey}" at index ${index} (header: "${name}")`);
      }
      return index;
    }
  }
  
  if (process.env.NODE_ENV === "development") {
    console.warn(`✗ Column "${headerKey}" not found. Tried: ${possibleNames.join(", ")}`);
    console.log(`Available headers: ${headerNames.join(", ")}`);
  }
  return -1;
};

// Get column indices dynamically
const getColumnIndices = (headers: string[]) => ({
  no: findColumnIndex(headers, "no"),
  sobat_id: findColumnIndex(headers, "sobat_id"),
  nama_petugas: findColumnIndex(headers, "nama_petugas"),
  nik: findColumnIndex(headers, "nik"),
  jabatan: findColumnIndex(headers, "jabatan"),
  kecamatan: findColumnIndex(headers, "kecamatan"),
  email: findColumnIndex(headers, "email"),
  bank: findColumnIndex(headers, "bank"),
  nomor_rekening: findColumnIndex(headers, "nomor_rekening"),
  idkelas: findColumnIndex(headers, "idkelas"),
  hotel: findColumnIndex(headers, "hotel"),
  gelombang: findColumnIndex(headers, "gelombang"),
  kelas: findColumnIndex(headers, "kelas"),
});

export default function SensusEkonomiPelatihan() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState<string>("all");
  const [filterHotel, setFilterHotel] = useState<string>("all");
  const [filterKelas, setFilterKelas] = useState<string>("all");
  const [filterInstruktur, setFilterInstruktur] = useState<string>("all");
  const [sortKey, setSortKey] = useState<keyof typeof COLUMN_HEADERS>("kelas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showTable, setShowTable] = useState(false);
  const [showPelatihan, setShowPelatihan] = useState(false);

  // Get dynamic column indices based on current headers
  const COL = useMemo(() => getColumnIndices(headers), [headers]);

  // Debug logging
  useEffect(() => {
    if (headers.length > 0) {
      console.log("📋 All Headers found:", headers);
      console.log("🔍 Column indices:", COL);
      console.log("📊 Sample row 0:", rows[0]);
      
      // Detailed column mapping
      console.log("\n🗂️ COLUMN MAPPING:");
      headers.forEach((h, idx) => {
        console.log(`  [${idx}] ${h}`);
      });
      
      console.log("\n📌 DETECTED COLUMNS:");
      Object.entries(COL).forEach(([key, idx]) => {
        if (idx >= 0) {
          console.log(`  ✓ ${key.padEnd(20)} = index ${idx} (${headers[idx]})`);
        } else {
          console.log(`  ✗ ${key.padEnd(20)} = NOT FOUND`);
        }
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
          const dataRows = values
            .slice(1)
            .filter((r) => r && r.some((c) => (c || "").toString().trim() !== ""));
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
  const kecamatanOptions = useMemo(() => {
    if (COL.kecamatan === -1) return [];
    const kecSet = new Set<string>();
    rows.forEach((r) => {
      const kec = (r[COL.kecamatan] || "").toString().trim();
      if (kec) kecSet.add(kec);
    });
    return Array.from(kecSet).sort();
  }, [rows, COL.kecamatan]);

  // Get unique hotel values
  const hotelOptions = useMemo(() => {
    if (COL.hotel === -1) return [];
    const hotelSet = new Set<string>();
    rows.forEach((r) => {
      const hotel = (r[COL.hotel] || "").toString().trim();
      if (hotel) hotelSet.add(hotel);
    });
    return Array.from(hotelSet).sort();
  }, [rows, COL.hotel]);

  // Get unique kelas values (sorted with natural order: A, B, C, ... AA, AB, AC ...)
  const kelasOptions = useMemo(() => {
    if (COL.kelas === -1) return [];
    const kelasSet = new Set<string>();
    rows.forEach((r) => {
      const kelas = (r[COL.kelas] || "").toString().trim();
      if (kelas) kelasSet.add(kelas);
    });
    return Array.from(kelasSet).sort((a, b) => classToSortValue(a) - classToSortValue(b));
  }, [rows, COL.kelas]);

  // Get unique instruktur/panitia names (nama petugas dengan jabatan Instruktur Daerah, Panitia 1, Panitia 2)
  const instrukturOptions = useMemo(() => {
    if (COL.nama_petugas === -1 || COL.jabatan === -1) return [];
    const instrukturSet = new Set<string>();
    const validJabatan = ["Instruktur Daerah", "Panitia 1", "Panitia 2"];
    rows.forEach((r) => {
      const jabatan = (r[COL.jabatan] || "").toString().trim();
      const nama_petugas = (r[COL.nama_petugas] || "").toString().trim();
      if (nama_petugas && jabatan && validJabatan.includes(jabatan)) {
        instrukturSet.add(nama_petugas);
      }
    });
    return Array.from(instrukturSet).sort();
  }, [rows, COL.nama_petugas, COL.jabatan]);

  // Create color map for each unique class
  const classColorMap = useMemo(() => {
    return createClassColorMap(kelasOptions);
  }, [kelasOptions]);

  // Calculate statistics
  const stats = useMemo(() => {
    const hotelStats = new Map<string, { count: number; classes: Set<string> }>();
    const gelombangSet = new Set<string>();
    
    rows.forEach((r) => {
      const hotel = COL.hotel !== -1 ? (r[COL.hotel] || "").toString().trim() : "Unknown";
      const kelas = COL.kelas !== -1 ? (r[COL.kelas] || "").toString().trim() : "";
      const gelombang = COL.gelombang !== -1 ? (r[COL.gelombang] || "").toString().trim() : "";
      
      if (hotel) {
        if (!hotelStats.has(hotel)) {
          hotelStats.set(hotel, { count: 0, classes: new Set<string>() });
        }
        const stat = hotelStats.get(hotel)!;
        stat.count += 1;
        if (kelas) stat.classes.add(kelas);
      }
      
      if (gelombang) {
        gelombangSet.add(gelombang);
      }
    });

    return {
      hotelStats,
      gelombangCount: gelombangSet.size,
      hotelCount: hotelStats.size,
    };
  }, [rows, COL.hotel, COL.kelas, COL.gelombang]);

  // Filter and sort data
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let out = rows.filter((r) => {
      if (
        filterKecamatan !== "all" &&
        COL.kecamatan !== -1 &&
        (r[COL.kecamatan] || "").toString().trim() !== filterKecamatan
      )
        return false;
      if (
        filterHotel !== "all" &&
        COL.hotel !== -1 &&
        (r[COL.hotel] || "").toString().trim() !== filterHotel
      )
        return false;
      if (
        filterKelas !== "all" &&
        COL.kelas !== -1 &&
        (r[COL.kelas] || "").toString().trim() !== filterKelas
      )
        return false;
      if (
        filterInstruktur !== "all" &&
        COL.nama_petugas !== -1 &&
        COL.jabatan !== -1
      ) {
        const nama = (r[COL.nama_petugas] || "").toString().trim();
        const jabatan = (r[COL.jabatan] || "").toString().trim();
        const validJabatan = ["Instruktur Daerah", "Panitia 1", "Panitia 2"];
        if (nama !== filterInstruktur || !validJabatan.includes(jabatan)) {
          return false;
        }
      }
      if (q) {
        return r.some((c) => (c || "").toString().toLowerCase().includes(q));
      }
      return true;
    });

    // Sort with blank values at the end for specific columns
    const sortColIdx = COL[sortKey];
    if (sortColIdx === -1) return out;

    const blankColumns = ["kecamatan", "nama_petugas", "sobat_id", "jabatan"];
    const isBlankColumn = blankColumns.includes(sortKey);

    out = [...out].sort((a, b) => {
      // ALWAYS prioritize by jabatan first when filter is active
      const isAnyFilterActive = filterKelas !== "all" || filterHotel !== "all" || filterKecamatan !== "all" || filterInstruktur !== "all";
      
      if (isAnyFilterActive && COL.jabatan !== -1) {
        const aJabatan = (a[COL.jabatan] || "").toString().trim();
        const bJabatan = (b[COL.jabatan] || "").toString().trim();
        const aPriority = getJabatanPriority(aJabatan);
        const bPriority = getJabatanPriority(bJabatan);
        
        // Priority order: Instruktur Daerah (1) → Panitia 1 (2) → Panitia 2 (3) → Peserta (4)
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // If same priority (same jabatan), then sort by sortKey
      }

      const av = (a[sortColIdx] || "").toString().trim().toLowerCase();
      const bv = (b[sortColIdx] || "").toString().trim().toLowerCase();
      
      // If checking blank columns, put blank values at the end
      if (isBlankColumn) {
        const aIsBlank = !av;
        const bIsBlank = !bv;
        
        if (aIsBlank && bIsBlank) return 0;
        if (aIsBlank) return 1; // a goes to end
        if (bIsBlank) return -1; // b goes to end
      }
      
      // Special handling for Kelas - natural sort (A, B, C, ... AA, AB ...)
      if (sortKey === "kelas") {
        const aVal = classToSortValue(av);
        const bVal = classToSortValue(bv);
        if (aVal !== bVal) return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return 0;
      }
      
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, search, filterKecamatan, filterHotel, filterKelas, filterInstruktur, sortKey, sortDir, COL]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (key: keyof typeof COLUMN_HEADERS) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="w-full mx-auto space-y-6">
        {/* Header */}
        <header className="text-center space-y-4 pb-8 border-b border-blue-700/30">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Pelatihan Sensus Ekonomi 2026
            </h1>
            <p className="text-xl text-blue-200">
              BPS Kabupaten Majalengka
            </p>
            <p className="text-slate-400 text-sm md:text-base">
              Informasi lengkap tempat pelatihan, gelombang, kelas, dan data petugas pelatihan
            </p>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
          </Card>
        ) : !showTable ? (
          // Filter Selection Screen
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Kelas Card */}
              <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-all cursor-pointer" onClick={() => {}}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Calendar className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Pilih Kelas</h3>
                      <Select
                        value={filterKelas}
                        onValueChange={(v) => setFilterKelas(v)}
                      >
                        <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-10">
                          <SelectValue placeholder="Semua Kelas" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="all" className="text-white focus:bg-slate-600 focus:text-white">Semua Kelas</SelectItem>
                          {kelasOptions.map((k) => (
                            <SelectItem key={k} value={k} className="text-white focus:bg-slate-600 focus:text-white">{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400 mt-2">{kelasOptions.length} kelas tersedia</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hotel Card */}
              <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-all cursor-pointer" onClick={() => {}}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Hotel className="h-6 w-6 text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Pilih Hotel</h3>
                      <Select
                        value={filterHotel}
                        onValueChange={(v) => setFilterHotel(v)}
                      >
                        <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-10">
                          <SelectValue placeholder="Semua Hotel" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="all" className="text-white focus:bg-slate-600 focus:text-white">Semua Hotel</SelectItem>
                          {hotelOptions.map((h) => (
                            <SelectItem key={h} value={h} className="text-white focus:bg-slate-600 focus:text-white">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400 mt-2">{hotelOptions.length} hotel tersedia</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Kecamatan Card */}
              <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-all cursor-pointer" onClick={() => {}}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="h-6 w-6 text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Pilih Kecamatan</h3>
                      <Select
                        value={filterKecamatan}
                        onValueChange={(v) => setFilterKecamatan(v)}
                      >
                        <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-10">
                          <SelectValue placeholder="Semua Kecamatan" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="all" className="text-white focus:bg-slate-600 focus:text-white">Semua Kecamatan</SelectItem>
                          {kecamatanOptions.map((k) => (
                            <SelectItem key={k} value={k} className="text-white focus:bg-slate-600 focus:text-white">{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400 mt-2">{kecamatanOptions.length} kecamatan tersedia</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instruktur / Panitia Card */}
              <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-all cursor-pointer" onClick={() => {}}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Users className="h-6 w-6 text-rose-400 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">Pilih Instruktur / Panitia</h3>
                      <Select
                        value={filterInstruktur}
                        onValueChange={(v) => setFilterInstruktur(v)}
                      >
                        <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-10">
                          <SelectValue placeholder="Semua Instruktur" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="all" className="text-white focus:bg-slate-600 focus:text-white">Semua Instruktur</SelectItem>
                          {instrukturOptions.map((i) => (
                            <SelectItem key={i} value={i} className="text-white focus:bg-slate-600 focus:text-white">{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400 mt-2">{instrukturOptions.length} instruktur/panitia tersedia</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Button to View Table */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
              <Button
                onClick={() => {
                  setShowTable(true);
                  setShowPelatihan(false);
                }}
                className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-16 rounded-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 text-lg group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Lihat Daftar Petugas
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform translate-x-full group-hover:translate-x-0 transition-all duration-500" />
              </Button>

              <Button
                onClick={() => {
                  window.open("https://docs.google.com/spreadsheets/d/1qjI9ZCRGeoe-suPWP8dyjUtqejjBO8qiRaPIyextcg4/edit?gid=1725792369#gid=1725792369", "_blank");
                }}
                className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 hover:from-emerald-700 hover:via-green-600 hover:to-teal-600 text-white font-bold py-4 px-16 rounded-xl shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 text-lg group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  Spreadsheet Pelatihan
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform translate-x-full group-hover:translate-x-0 transition-all duration-500" />
              </Button>
            </div>

            {/* Statistics Section */}
            <div className="space-y-4 pt-8 border-t border-blue-700/30">
              <h2 className="text-2xl font-bold text-white">📊 Statistik Pelatihan</h2>
              
              {/* Gelombang & Hotel & Total Peserta Pelatihan Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gelombang Card */}
                <Card className="bg-gradient-to-br from-violet-900 to-purple-900 border-purple-700">
                  <CardContent className="p-6">
                    <h3 className="text-sm text-purple-200 font-semibold mb-2">Jumlah Gelombang</h3>
                    <p className="text-4xl font-bold text-purple-300">{stats.gelombangCount}</p>
                    <p className="text-xs text-purple-400 mt-2">Gelombang pelatihan tersedia</p>
                  </CardContent>
                </Card>

                {/* Hotel Overview Card */}
                <Card className="bg-gradient-to-br from-amber-900 to-orange-900 border-orange-700">
                  <CardContent className="p-6">
                    <h3 className="text-sm text-orange-200 font-semibold mb-2">Jumlah Hotel</h3>
                    <p className="text-4xl font-bold text-orange-300">{stats.hotelCount}</p>
                    <p className="text-xs text-orange-400 mt-2">Lokasi pelatihan (hotel)</p>
                  </CardContent>
                </Card>

                {/* Total Peserta Pelatihan Card */}
                <Card className="bg-gradient-to-br from-blue-900 to-cyan-900 border-cyan-700">
                  <CardContent className="p-6">
                    <h3 className="text-sm text-cyan-200 font-semibold mb-2">Total Peserta Pelatihan</h3>
                    <p className="text-4xl font-bold text-cyan-300">{rows.length}</p>
                    <p className="text-xs text-cyan-400 mt-2">Peserta pelatihan SE26</p>
                  </CardContent>
                </Card>
              </div>

              {/* Hotel Detail Statistics */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">📍 Rincian per Hotel</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Array.from(stats.hotelStats.entries())
                    .sort(([hotelA], [hotelB]) => hotelA.localeCompare(hotelB))
                    .map(([hotel, data]) => (
                    <Card key={hotel} className="bg-slate-800 border-slate-700">
                      <CardContent className="p-4">
                        <h4 className="text-sm font-semibold text-amber-300 mb-3">{hotel}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Jumlah Petugas:</span>
                            <span className="text-lg font-bold text-blue-400">{data.count}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400">Jumlah Kelas:</span>
                            <span className="text-lg font-bold text-green-400">{data.classes.size}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700">
                            Kelas: {Array.from(data.classes).sort((a, b) => classToSortValue(a) - classToSortValue(b)).join(", ")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : !showPelatihan ? (
          // Data Table Screen
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Daftar Petugas Pelatihan</CardTitle>
                  <CardDescription className="text-slate-400">Cari dan filter data petugas pelatihan SE26</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTable(false);
                    setFilterKecamatan("all");
                    setFilterHotel("all");
                    setFilterKelas("all");
                    setFilterInstruktur("all");
                    setSearch("");
                    setPage(1);
                  }}
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  ← Kembali ke Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search + Filter + Pagination */}
              <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                <div className="relative flex-1 md:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama, jabatan, sobat ID..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 h-9 text-sm bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="w-auto h-9 text-xs bg-slate-700 border-slate-600 text-white">
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

              <div className="rounded-md border border-slate-600 overflow-x-auto bg-slate-800">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-700 border-slate-600 hover:bg-slate-700">
                      <TableHead className="w-12 text-slate-300">#</TableHead>
                      <TableHead
                        className="w-36 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("nama_petugas")}
                      >
                        <div className="flex items-center gap-1">
                          Nama Petugas <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-28 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("kecamatan")}
                      >
                        <div className="flex items-center gap-1">
                          Kecamatan <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-28 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("sobat_id")}
                      >
                        <div className="flex items-center gap-1">
                          Sobat ID <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-32 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("jabatan")}
                      >
                        <div className="flex items-center gap-1">
                          Jabatan <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-32 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("hotel")}
                      >
                        <div className="flex items-center gap-1">
                          Hotel <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-16 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("gelombang")}
                      >
                        <div className="flex items-center gap-1">
                          Gelombang <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-16 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("kelas")}
                      >
                        <div className="flex items-center gap-1">
                          Kelas <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="w-40 cursor-pointer text-slate-300"
                        onClick={() => toggleSort("tanggal")}
                      >
                        <div className="flex items-center gap-1">
                          Tanggal Pelaksanaan <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                          Tidak ada data
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((r, i) => (
                        <TableRow key={i} className="border-slate-600 hover:bg-slate-700 py-1">
                          <TableCell className="text-muted-foreground text-xs py-1">
                            {(currentPage - 1) * pageSize + i + 1}
                          </TableCell>
                          <TableCell className="text-sm text-slate-200 py-1">
                            {COL.nama_petugas !== -1 ? r[COL.nama_petugas] || "-" : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-200 py-1">
                            {COL.kecamatan !== -1 ? r[COL.kecamatan] || "-" : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-200 py-1">
                            {COL.sobat_id !== -1 ? r[COL.sobat_id] || "-" : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-200 py-1">
                            {COL.jabatan !== -1 ? r[COL.jabatan] || "-" : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-200 py-1">
                            {COL.hotel !== -1 ? r[COL.hotel] || "-" : "-"}
                          </TableCell>
                          <TableCell className="text-sm py-1">
                            <span className="bg-orange-600 text-white px-3 py-1 rounded-full font-semibold text-xs">
                              {COL.gelombang !== -1 ? r[COL.gelombang] || "-" : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm py-1">
                            {(() => {
                              const kelasValue = COL.kelas !== -1 ? r[COL.kelas] || "" : "";
                              const bgColor = classColorMap.get(kelasValue) || "bg-slate-600";
                              return (
                                <span className={`${bgColor} text-white px-3 py-1 rounded-full font-semibold text-xs`}>
                                  {kelasValue || "-"}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-slate-200 py-1">
                            {(() => {
                              const kelasValue = COL.kelas !== -1 ? r[COL.kelas] || "" : "";
                              return getTanggalFromKelas(kelasValue);
                            })()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-slate-400">
                  Total: <span className="font-medium text-slate-200">{filtered.length}</span> | 
                  Halaman <span className="font-medium text-slate-200">{currentPage}</span> dari <span className="font-medium text-slate-200">{totalPages}</span> |
                  Menampilkan {pageRows.length > 0 ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)}` : "0"} dari {filtered.length}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={currentPage === 1}
                    className="text-xs bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    ⏮ Pertama
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="text-xs bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Sebelumnya
                  </Button>

                  {/* Page Number Indicators */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => {
                        const diff = Math.abs(p - currentPage);
                        return p === 1 || p === totalPages || diff <= 1;
                      })
                      .map((p, idx, arr) => (
                        <div key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">...</span>}
                          <Button
                            variant={p === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(p)}
                            className={`text-xs w-8 h-8 p-0 ${p === currentPage ? "bg-blue-600 text-white" : "bg-slate-700 border-slate-600 text-white hover:bg-slate-600"}`}
                          >
                            {p}
                          </Button>
                        </div>
                      ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="text-xs bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    Selanjutnya
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="text-xs bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    Terakhir ⏭
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Pelatihan SE26 Screen
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Pelatihan SE26</h2>
                <p className="text-slate-400 text-sm mt-1">Data pelatihan Sensus Ekonomi 2026 dari Google Sheets</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTable(false);
                  setShowPelatihan(false);
                  setFilterKecamatan("all");
                  setFilterHotel("all");
                  setFilterKelas("all");
                  setFilterInstruktur("all");
                  setSearch("");
                  setPage(1);
                }}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                ← Kembali ke Menu
              </Button>
            </div>
            <PelatihanSE26 />
          </div>
        )}
      </div>
    </div>
  );
}
