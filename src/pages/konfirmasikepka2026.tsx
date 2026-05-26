import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Eye, Search, CheckCircle2, XCircle, Users, Loader2, ArrowUpDown, Check, X, Loader, AlertCircle, AlertTriangle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const SPREADSHEET_ID = "1Sa6HeJ_PqRMQOHjJc9gGeuYFgHy8Ed5TSzt9dnztkqE";
const SHEET_NAME = "Olah";
const RANGE = `${SHEET_NAME}!A1:BS`;

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
  nama: colIdx("F"),     // F
  sobatId: colIdx("G"),  // G
  tanggalLahir: colIdx("K"),  // K - Tanggal Lahir
  umur: colIdx("L"),     // L - Umur saat ini
  kec: colIdx("M"),      // M
  desa: colIdx("N"),     // N
  pendidikan: colIdx("J"),  // J - Pendidikan terakhir yang ditamatkan
  kegiatanSehariHari: colIdx("O"),  // O - Apa kegiatan sehari-hari anda
  bekerjaPNS: colIdx("P"),  // P - Apakah Anda Bekerja sebagai PNS atau PPPK?
  prosesPendaftaranPNS: colIdx("Q"),  // Q - Apakah Anda Sedang Menjalani Proses Pendaftaran sebagai PNS atau PPPK?
  smartphoneAndroid: colIdx("W"),  // W - Apakah Anda Memiliki Smartphone Android?
  pekerjaan: colIdx("R"),  // R - Apakah Anda Bekerja Sebagai...
  androidVersion: colIdx("Y"),  // Y - Apa Versi Android Smartphone Android Anda?
  pertanyaan: colIdx("AI"),  // AI - Link gambar pertanyaan Google Drive
  prioritasKejaanBPS: colIdx("AM"),  // AM - Apakah Anda bersedia Memprioritaskan Pekerjaan BPS?
  kontrakKerja: colIdx("AN"),  // AN - Apakah anda bersedia menandatangani kontrak kerja?
  pelatihanBPS: colIdx("AO"),  // AO - Apakah Anda bersedia mengikuti pelatihan BPS?
  pelatihanBPS2: colIdx("AP"),  // AP - Apakah Anda bersedia mengikuti pelatihan BPS?
  lintasKecamatan: colIdx("AQ"),  // AQ - Apakah Anda bersedia bekerja Lintas Kecamatan?
  lintasDesa: colIdx("AR"),  // AR - Apakah Anda bersedia bekerja Lintas Desa?
  deadline: colIdx("AS"),  // AS - Apakah Anda bersedia Bekerja Mengikuti Deadline?
  waktuTenagaPikiran: colIdx("AT"),  // AT - Apakah anda bersedia mencurahkan waktu, tenaga dan pikiran?
  memperbaikiHasil: colIdx("AU"),  // AU - Apakah Anda bersedia Memperbaiki Hasil Pekerjaan?
  tidakMengalihkan: colIdx("AV"),  // AV - Apakah anda bersedia tidak mengalihkan pekerjaan?
  fotoVerifikasi: colIdx("BG"),  // BG - Foto (OK/Perlu perbaikan)
  ktpVerifikasi: colIdx("BH"),  // BH - KTP/Suket (OK/Perlu perbaikan)
  ijazahVerifikasi: colIdx("BI"),  // BI - Ijazah (OK/Perlu perbaikan)
  screenshotHPVerifikasi: colIdx("BJ"),  // BJ - Screenshot HP (OK/Perlu perbaikan)
  catatanPJ: colIdx("BK"),  // BK - Catatan PJ
  status: colIdx("BD"),  // BD
  rekomendasi: colIdx("BE"), // BE - Rekomendasi / Non Rekomendasi
  statusSobat: colIdx("BF"),  // BF - Status SOBAT
  statusSeleksi: colIdx("BL"),  // BL - Status Seleksi Administrasi
  periodStart: colIdx("BP"),  // BP - Period Start
  skor: colIdx("BQ"),       // BQ - Skor
  tesStart: colIdx("BR"),   // BR - Test Start
  tesEnd: colIdx("BS"),     // BS - Test End
};

// Column mapping untuk MASTER.MITRA (Manajemen Mitra sheet A1:S)
const COL_MITRA = {
  nama: colIdx("A"),        // A - Nama Lengkap
  kec: colIdx("H"),         // H - Alamat Kec
  desa: colIdx("I"),        // I - Alamat Desa
  periodStart: colIdx("BI"),  // BI - Period Start (dari Mitra Tambahan) - NOT IN THIS SHEET
  skor: colIdx("BL"),       // BL - Skor (dari Mitra Tambahan) - NOT IN THIS SHEET
  statusSeleksiKompetensi: colIdx("BM"),  // BM - Status Seleksi Kompetensi (dari Mitra Tambahan) - NOT IN THIS SHEET
  sobatId: colIdx("P"),     // P - SOBAT ID
  email: colIdx("Q"),       // Q - Email
  statusNik: colIdx("R"),   // R - Status NIK
  statusSeleksiAdmin: colIdx("C"),  // C - Status Seleksi (1=Terpilih, 2=Tidak Terpilih)
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
const isVerifikasiNik = (s: string) => {
  const v = (s || "").toLowerCase().trim();
  return v === "terverifikasi" && !v.includes("belum");
};

// Validation helper functions
const calculateAgeFromDate = (dateStr: string): number | null => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

const isYesAnswer = (val: string): boolean => {
  const v = (val || "").toLowerCase().trim();
  return v === "ya" || v === "yes" || v === "y";
};

const isNotAnswer = (val: string): boolean => {
  const v = (val || "").toLowerCase().trim();
  return v === "tidak" || v === "no" || v === "n";
};

// Helper function untuk menentukan warna berdasarkan persentase
const getPercentageColor = (percentage: number | string): string => {
  const pct = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  
  if (pct === 100) {
    return "#10b981"; // Hijau - 100%
  } else if (pct >= 75) {
    return "#06b6d4"; // Biru Muda - 75-99.9%
  } else if (pct >= 50) {
    return "#f59e0b"; // Kuning - 50-74.9%
  } else {
    return "#ef4444"; // Merah - < 50%
  }
};

const validateResponden = (row: Row): Array<{ issue: string; severity: "error" | "warning" }> => {
  const issues: Array<{ issue: string; severity: "error" | "warning" }> = [];

  // E: Sensus Ekonomi 2026 - Jika menjawab "Tidak" adalah warning
  const sensusEkon = (row[COL.sensusEkonomi] || "").trim();
  if (sensusEkon && isNotAnswer(sensusEkon)) {
    issues.push({ issue: "Tidak ingin mengikuti Sensus Ekonomi 2026", severity: "warning" });
  }

  // J: Pendidikan = SLTP/Sederajat (hanya warning)
  const pendidikan = (row[COL.pendidikan] || "").toLowerCase().trim();
  if (pendidikan && pendidikan.includes("sltp")) {
    issues.push({ issue: "Pendidikan SLTP/Sederajat (minimal SMA lebih baik)", severity: "warning" });
  }

  // K & L: Tanggal Lahir vs Umur konsistensi
  const tanggalLahir = (row[COL.tanggalLahir] || "").trim();
  const umurStr = (row[COL.umur] || "").trim();
  if (tanggalLahir && umurStr) {
    const calculatedAge = calculateAgeFromDate(tanggalLahir);
    const statedAge = parseInt(umurStr);
    if (calculatedAge !== null && statedAge && Math.abs(calculatedAge - statedAge) > 1) {
      issues.push({ issue: "Umur tidak sesuai tanggal lahir", severity: "error" });
    }
  }

  // L: Umur - Validasi umur < 18 atau > 50
  if (umurStr) {
    const umurNum = parseInt(umurStr);
    if (!isNaN(umurNum)) {
      if (umurNum < 18) {
        issues.push({ issue: "Umur kurang dari 18 tahun", severity: "warning" });
      }
      if (umurNum > 50) {
        issues.push({ issue: "Umur lebih dari 50 tahun", severity: "warning" });
      }
    }
  }

  // O: Kegiatan sehari-hari - Jika ADA "Bekerja penuh waktu" adalah error (mencari orang senggang)
  const kegiatanSehariHari = (row[COL.kegiatanSehariHari] || "").toLowerCase();
  if (kegiatanSehariHari && kegiatanSehariHari.includes("bekerja penuh waktu")) {
    issues.push({ issue: "Memiliki pekerjaan utama (tidak senggang)", severity: "error" });
  }

  // P: Bekerja PNS/PPPK - Jika bukan "Tidak" adalah error (punya pekerjaan lain)
  const bekerjaPNS = (row[COL.bekerjaPNS] || "").trim();
  if (bekerjaPNS && !isNotAnswer(bekerjaPNS)) {
    issues.push({ issue: "Memiliki pekerjaan PNS/PPPK", severity: "error" });
  }

  // Q: Proses Pendaftaran PNS/PPPK - Jika bukan "Tidak" adalah error (sedang proses)
  const prosesPendaftaran = (row[COL.prosesPendaftaranPNS] || "").trim();
  if (prosesPendaftaran && !isNotAnswer(prosesPendaftaran)) {
    issues.push({ issue: "Sedang dalam proses pendaftaran PNS/PPPK", severity: "error" });
  }

  // W: Smartphone Android ≠ "Ya"
  const smartphone = (row[COL.smartphoneAndroid] || "").trim();
  if (smartphone && !isYesAnswer(smartphone)) {
    issues.push({ issue: "Tidak memiliki Smartphone Android", severity: "error" });
  }

  // AM: Prioritas BPS ≠ "Ya"
  const prioritasBPS = (row[COL.prioritasKejaanBPS] || "").trim();
  if (prioritasBPS && !isYesAnswer(prioritasBPS)) {
    issues.push({ issue: "Tidak bersedia prioritaskan pekerjaan BPS", severity: "error" });
  }

  // AN: Kontrak Kerja ≠ "Ya"
  const kontrakKerja = (row[COL.kontrakKerja] || "").trim();
  if (kontrakKerja && !isYesAnswer(kontrakKerja)) {
    issues.push({ issue: "Tidak bersedia menandatangani kontrak kerja", severity: "error" });
  }

  // AO: Pelatihan BPS ≠ "Ya" (warning level)
  const pelatihanBPS = (row[COL.pelatihanBPS] || "").trim();
  if (pelatihanBPS && !isYesAnswer(pelatihanBPS)) {
    issues.push({ issue: "Tidak bersedia mengikuti pelatihan BPS", severity: "warning" });
  }

  // AP: Pendataan Rumah ke Rumah/Tempat Usaha ≠ "Ya"
  const pelatihanBPS2 = (row[COL.pelatihanBPS2] || "").trim();
  if (pelatihanBPS2 && !isYesAnswer(pelatihanBPS2)) {
    issues.push({ issue: "Tidak bersedia melaksanakan pendataan dari rumah ke rumah/tempat usaha sesuai ketentuan", severity: "error" });
  }

  // AQ: Lintas Kecamatan ≠ "Ya"
  const lintasKec = (row[COL.lintasKecamatan] || "").trim();
  if (lintasKec && !isYesAnswer(lintasKec)) {
    issues.push({ issue: "Tidak bersedia bekerja lintas kecamatan", severity: "error" });
  }

  // AR: Lintas Desa ≠ "Ya"
  const lintasDe = (row[COL.lintasDesa] || "").trim();
  if (lintasDe && !isYesAnswer(lintasDe)) {
    issues.push({ issue: "Tidak bersedia bekerja lintas desa", severity: "error" });
  }

  // AS: Deadline ≠ "Ya"
  const deadline = (row[COL.deadline] || "").trim();
  if (deadline && !isYesAnswer(deadline)) {
    issues.push({ issue: "Tidak bersedia mengikuti deadline BPS", severity: "error" });
  }

  // AT: Waktu/Tenaga/Pikiran ≠ "Ya"
  const waktuTenaga = (row[COL.waktuTenagaPikiran] || "").trim();
  if (waktuTenaga && !isYesAnswer(waktuTenaga)) {
    issues.push({ issue: "Tidak bersedia mencurahkan waktu/tenaga/pikiran", severity: "error" });
  }

  // AU: Memperbaiki Hasil ≠ "Ya"
  const perbaikiHasil = (row[COL.memperbaikiHasil] || "").trim();
  if (perbaikiHasil && !isYesAnswer(perbaikiHasil)) {
    issues.push({ issue: "Tidak bersedia memperbaiki hasil kerja", severity: "error" });
  }

  // AV: Tidak Mengalihkan ≠ "Ya"
  const tidakAlihkan = (row[COL.tidakMengalihkan] || "").trim();
  if (tidakAlihkan && !isYesAnswer(tidakAlihkan)) {
    issues.push({ issue: "Tidak bersedia tidak mengalihkan pekerjaan", severity: "error" });
  }

  // BG: Foto Verifikasi - Harus "OK"
  const fotoStatus = (row[COL.fotoVerifikasi] || "").toLowerCase().trim();
  if (!fotoStatus || fotoStatus !== "ok") {
    issues.push({ issue: "Foto - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  // BH: KTP Verifikasi - Harus "OK"
  const ktpStatus = (row[COL.ktpVerifikasi] || "").toLowerCase().trim();
  if (!ktpStatus || ktpStatus !== "ok") {
    issues.push({ issue: "KTP - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  // BI: Ijazah Verifikasi - Harus "OK"
  const ijazahStatus = (row[COL.ijazahVerifikasi] || "").toLowerCase().trim();
  if (!ijazahStatus || ijazahStatus !== "ok") {
    issues.push({ issue: "Ijazah - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  // BJ: Screenshot HP Verifikasi - Harus "OK"
  const hpStatus = (row[COL.screenshotHPVerifikasi] || "").toLowerCase().trim();
  if (!hpStatus || hpStatus !== "ok") {
    issues.push({ issue: "Screenshot HP - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  return issues;
};

// Helper function to check if mitra data exists in Olah sheet (Google Form)
const checkGoogleFormStatus = (mitriRow: Row, olaRows: Row[]): boolean => {
  const mitriEmail = (mitriRow[COL_MITRA.email] || "").trim().toLowerCase();
  const mitriSobatId = (mitriRow[COL_MITRA.sobatId] || "").trim().toLowerCase();
  
  if (!mitriEmail && !mitriSobatId) return false;
  
  return olaRows.some(olaRow => {
    const olaEmail = (olaRow[COL.email] || "").trim().toLowerCase();
    const olaSobatId = (olaRow[COL.sobatId] || "").trim().toLowerCase();
    
    return (mitriEmail && olaEmail === mitriEmail) || (mitriSobatId && olaSobatId === mitriSobatId);
  });
};

// Helper function untuk mengambil data dari Olah sheet berdasarkan Email atau Sobat ID
// Jika tidak ketemu di Olah, fallback ke Mitra Tambahan langsung
const getOlaRowData = (mitriRow: Row, olaRows: Row[]): { periodStart: string; skor: string; statusSeleksiKompetensi: string } => {
  const mitriEmail = (mitriRow[COL_MITRA.email] || "").trim().toLowerCase();
  const mitriSobatId = (mitriRow[COL_MITRA.sobatId] || "").trim().toLowerCase();
  
  if (!mitriEmail && !mitriSobatId) {
    return { periodStart: "", skor: "", statusSeleksiKompetensi: "" };
  }
  
  // Try to find match in Olah sheet first
  const matchedOlaRow = olaRows.find(olaRow => {
    const olaEmail = (olaRow[COL.email] || "").trim().toLowerCase();
    const olaSobatId = (olaRow[COL.sobatId] || "").trim().toLowerCase();
    return (mitriEmail && olaEmail === mitriEmail) || (mitriSobatId && olaSobatId === mitriSobatId);
  });
  
  if (matchedOlaRow) {
    console.log("Match found in Olah! MT Email/SobatID:", mitriEmail || mitriSobatId, "→ BP:", matchedOlaRow[COL.periodStart]);
    return {
      periodStart: (matchedOlaRow[COL.periodStart] || "").trim(),
      skor: (matchedOlaRow[COL.skor] || "").trim(),
      statusSeleksiKompetensi: (matchedOlaRow[COL_MITRA.statusSeleksiKompetensi] || "").trim(),
    };
  }
  
  // Fallback: try to get from Mitra Tambahan directly (if data entered there)
  console.log("No match in Olah for MT Email/SobatID:", mitriEmail || mitriSobatId, "→ using direct columns from MT");
  return {
    periodStart: (mitriRow[COL_MITRA.periodStart] || "").trim(),
    skor: (mitriRow[COL_MITRA.skor] || "").trim(),
    statusSeleksiKompetensi: (mitriRow[COL_MITRA.statusSeleksiKompetensi] || "").trim(),
  };
};

// Helper function to find the matching Olah row for a Mitra Tambahan row
const getMatchedOlaRow = (mitriRow: Row, olaRows: Row[]): Row | undefined => {
  const mitriEmail = (mitriRow[COL_MITRA.email] || "").trim().toLowerCase();
  const mitriSobatId = (mitriRow[COL_MITRA.sobatId] || "").trim().toLowerCase();
  const mitriNama = (mitriRow[COL_MITRA.nama] || "").trim().toLowerCase();
  const mitriKec = (mitriRow[COL_MITRA.kec] || "").trim().toLowerCase();
  
  // Priority 1: Try matching by sobatId (most reliable)
  if (mitriSobatId) {
    const matchBySobatId = olaRows.find(olaRow => {
      const olaSobatId = (olaRow[COL.sobatId] || "").trim().toLowerCase();
      return olaSobatId === mitriSobatId;
    });
    if (matchBySobatId) return matchBySobatId;
  }
  
  // Priority 2: Try matching by name + kecamatan (more reliable than email)
  if (mitriNama && mitriKec) {
    const matchByNameKec = olaRows.find(olaRow => {
      const olaNama = (olaRow[COL.nama] || "").trim().toLowerCase();
      const olaKec = (olaRow[COL.kec] || "").trim().toLowerCase();
      return olaNama === mitriNama && olaKec === mitriKec;
    });
    if (matchByNameKec) return matchByNameKec;
  }
  
  // Priority 3: Try matching by email (may have issues if data entry error)
  if (mitriEmail) {
    const matchByEmail = olaRows.find(olaRow => {
      const olaEmail = (olaRow[COL.email] || "").trim().toLowerCase();
      return olaEmail === mitriEmail;
    });
    if (matchByEmail) return matchByEmail;
  }
  
  return undefined;
};

// Helper function untuk check dokumen perlu perbaikan
const getDocumentsThatNeedRepair = (row: Row): string[] => {
  const docs: string[] = [];
  if ((row[COL.fotoVerifikasi] || "").toLowerCase().includes("perlu")) docs.push("Foto");
  if ((row[COL.ktpVerifikasi] || "").toLowerCase().includes("perlu")) docs.push("KTP");
  if ((row[COL.ijazahVerifikasi] || "").toLowerCase().includes("perlu")) docs.push("Ijazah");
  if ((row[COL.screenshotHPVerifikasi] || "").toLowerCase().includes("perlu")) docs.push("HP");
  return docs;
};

// Helper function untuk mencari row Olah berdasarkan nama dari Mitra Tambahan
const getOlahRowByMitraName = (mtRow: Row, olaRows: Row[]): Row | undefined => {
  const mtName = (mtRow[COL_MITRA.nama] || "").trim().toLowerCase();
  if (!mtName) return undefined;
  return olaRows.find(olaRow => {
    const olaName = (olaRow[COL.nama] || "").trim().toLowerCase();
    return olaName === mtName;
  });
};

export default function KonfirmasiKepka2026() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // All roles can perform actions
  const canEdit = true;
  
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
  const [mtFilterGF, setMtFilterGF] = useState<string>("all");
  const [mtFilterStatusSeleksiAdmin, setMtFilterStatusSeleksiAdmin] = useState<string>("all");
  const [mtSortKey, setMtSortKey] = useState<keyof typeof COL_MITRA>("nama");
  const [mtSortDir, setMtSortDir] = useState<"asc" | "desc">("asc");
  const [mtPage, setMtPage] = useState(1);
  const [mtPageSize, setMtPageSize] = useState(20);
  const [mtDetailRow, setMtDetailRow] = useState<Row | null>(null);
  const [mtValidationDetailRow, setMtValidationDetailRow] = useState<Row | null>(null);

  // Monitoring Kecamatan Sheet (Kebutuhan Kecamatan A:Q)
  const [kkRows, setKkRows] = useState<Row[]>([]);
  const [kkLoading, setKkLoading] = useState(true);
  const [kkError, setKkError] = useState<string | null>(null);
  const [kkExpandedGroups, setKkExpandedGroups] = useState<Record<string, boolean>>({
    kebutuhan: true,
    status: true,
    manajemen: true,
    rekomendasi: true,
    mitraEligible: true,
    progres: true,
  });

  // Responden filters & pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterKec, setFilterKec] = useState<string>("all");
  const [filterRekomendasi, setFilterRekomendasi] = useState<string>("all");
  const [filterStatusSobat, setFilterStatusSobat] = useState<string>("all");
  const [filterStatusSeleksi, setFilterStatusSeleksi] = useState<string>("all");
  const [sortKey, setSortKey] = useState<keyof typeof COL>("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Mitra filters & pagination
  const [mitriSearch, setMitriSearch] = useState("");
  const [mitriFilterKec, setMitriFilterKec] = useState<string>("all");
  const [mitriFilterStatus, setMitriFilterStatus] = useState<string>("all");
  const [mitriFilterGF, setMitriFilterGF] = useState<string>("all");
  const [mitriSortKey, setMitriSortKey] = useState<keyof typeof COL_MITRA>("nama");
  const [mitriSortDir, setMitriSortDir] = useState<"asc" | "desc">("asc");
  const [mitriPage, setMitriPage] = useState(1);
  const [mitriPageSize, setMitriPageSize] = useState(20);

  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [validationDetailRow, setValidationDetailRow] = useState<Row | null>(null);
  const [mitriDetailRow, setMitriDetailRow] = useState<Row | null>(null);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [confirmChange, setConfirmChange] = useState<{ row: Row; next: "Rekomendasi" | "Non Rekomendasi" | "" } | null>(null);

  // Resume filters
  const [resumeFilterKec, setResumeFilterKec] = useState<string>("all");
  const [resumeExpandedKecs, setResumeExpandedKecs] = useState<Record<string, boolean>>({});

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
          const olaData = values.slice(1).filter(r => r && r.some(c => (c || "").toString().trim() !== ""));
          setRows(olaData);
          // Debug: log sample data and BP/BQ/BR/BS columns
          console.log("Olah loaded:", olaData.length, "rows");
          if (olaData.length > 0) {
            console.log("Sample Olah Row 1:", {
              email_B: olaData[0][colIdx("B")],
              sobatId_G: olaData[0][colIdx("G")],
              periodStart_BP: olaData[0][colIdx("BP")],
              skor_BQ: olaData[0][colIdx("BQ")],
              tesStart_BR: olaData[0][colIdx("BR")],
              tesEnd_BS: olaData[0][colIdx("BS")],
            });
          }
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
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: "Mitra Tambahan!A1:BS" },
        });
        if (error) throw error;
        const values: Row[] = data?.values || [];
        if (values.length === 0) {
          setMtHeaders([]); setMtRows([]);
        } else {
          setMtHeaders(values[0]);
          const mtData = values.slice(2).filter(r => r && r.some(c => (c || "").toString().trim() !== ""));
          setMtRows(mtData);
          // Debug: log sample data
          console.log("Mitra Tambahan loaded:", mtData.length, "rows");
          if (mtData.length > 0) {
            console.log("Sample MT Row 1:", {
              nama: mtData[0][colIdx("A")],
              email_Q: mtData[0][colIdx("Q")],
              sobatId_P: mtData[0][colIdx("P")],
              statusNik_R: mtData[0][colIdx("R")],
            });
          }
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
      if (umurNum < 18) return "<18";
      if (umurNum <= 30) return "18-30";
      if (umurNum <= 40) return "31-40";
      if (umurNum <= 50) return "41-50";
      return ">50";
    };
    
    const umurRangeMap = new Map<string, number>();
    umurMap.forEach((count, umurStr) => {
      const range = categorizeUmur(umurStr);
      umurRangeMap.set(range, (umurRangeMap.get(range) || 0) + count);
    });
    
    const umurRangeOrder = ["<18", "18-30", "31-40", "41-50", ">50"];
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
    
    // Status SOBAT
    const sobatStatusMap = new Map<string, number>();
    rows.forEach(r => {
      const sobatStatus = (r[COL.statusSobat] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      sobatStatusMap.set(sobatStatus, (sobatStatusMap.get(sobatStatus) || 0) + 1);
    });
    const sobatStatusData = Array.from(sobatStatusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Rekomendasi per Kecamatan
    const rekomendasiPerKecMap = new Map<string, {total: number, count: number}>();
    rows.forEach(r => {
      const kec = (r[COL.kec] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      const reko = (r[COL.rekomendasi] || "").toString().trim();
      const hasReko = reko !== "" && reko !== "_" && reko !== "-";
      if (!rekomendasiPerKecMap.has(kec)) {
        rekomendasiPerKecMap.set(kec, {total: 0, count: 0});
      }
      const data = rekomendasiPerKecMap.get(kec)!;
      data.total++;
      if (hasReko) data.count++;
    });
    const rekomendasiPerKecData = Array.from(rekomendasiPerKecMap.entries())
      .map(([name, {total, count}]) => ({
        name,
        value: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
        count,
        total
      }))
      .sort((a, b) => parseFloat(String(b.value)) - parseFloat(String(a.value)));
    
    // Checked Recommendation Status (Cek Rekomendasi SOBAT)
    let mitraKepka2026 = 0, mitraTambahan = 0, dobel = 0, tidakDitemukan = 0;
    rows.forEach(r => {
      const reko = (r[COL.rekomendasi] || "").toString().trim();
      // Hanya hitung yang bernilai "Rekomendasi" di kolom BE (bukan "Non Rekomendasi")
      if (reko === "Rekomendasi") {
        const respEmail = (r[COL.email] || "").trim().toLowerCase();
        const respSobatId = (r[COL.sobatId] || "").trim().toLowerCase();
        
        if (!respEmail && !respSobatId) {
          tidakDitemukan++;
          return;
        }
        
        // Check if in Mitra Kepka 2026
        const inMitri = mitriRows.some(m => {
          const mEmail = (m[COL_MITRA.email] || "").trim().toLowerCase();
          const mSobatId = (m[COL_MITRA.sobatId] || "").trim().toLowerCase();
          return (respEmail && mEmail === respEmail) || (respSobatId && mSobatId === respSobatId);
        });
        
        // Check if in Mitra Tambahan
        const inMt = mtRows.some(mt => {
          const mtEmail = (mt[COL_MITRA.email] || "").trim().toLowerCase();
          const mtSobatId = (mt[COL_MITRA.sobatId] || "").trim().toLowerCase();
          return (respEmail && mtEmail === respEmail) || (respSobatId && mtSobatId === respSobatId);
        });
        
        if (inMitri && inMt) {
          dobel++;
        } else if (inMitri) {
          mitraKepka2026++;
        } else if (inMt) {
          mitraTambahan++;
        } else {
          tidakDitemukan++;
        }
      }
    });
    
    const checkedRecommendationData = [
      { name: "Mitra Kepka 2026", value: mitraKepka2026, color: "#10b981" },
      { name: "Mitra Tambahan", value: mitraTambahan, color: "#06b6d4" },
      { name: "Dobel", value: dobel, color: "#f59e0b" },
      { name: "Tidak ditemukan", value: tidakDitemukan, color: "#ef4444" }
    ];
    
    return { 
      total, verified, mismatch, notVerified, perKec,
      umurData, pekerjaanData, androidData, prioritasData,
      lintasKecData, lintasDesaData, tidakMengalihData,
      pendidikanData, kegiatanRutinData, rekomendasiData,
      umurMap, pekerjaanMap, androidMap, prioritasMap,
      lintasKecMap, lintasDesaMap, tidakMengalihMap,
      pendidikanMap, kegiatanRutinMap, rekomendasiMap,
      sobatStatusData, rekomendasiPerKecData, checkedRecommendationData
    };
  }, [rows, mitriRows, mtRows]);

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

  const statusSobatOptions = useMemo(
    () => Array.from(new Set(rows.map(r => (r[COL.statusSobat] || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  const statusSeleksiOptions = useMemo(
    () => Array.from(new Set(rows.map(r => (r[COL.statusSeleksi] || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  // Mitra stats
  const mitriStats = useMemo(() => {
    const total = mitriRows.length;
    let cocok = 0, tidakCocok = 0, blank = 0;
    const kecMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const gfCountMap = new Map<string, number>();
    
    mitriRows.forEach(r => {
      const st = r[COL_MITRA.statusNik] || "";
      if (isNikCocok(st)) cocok++;
      else if (isNikTidakCocok(st)) tidakCocok++;
      else if (st.trim() === "") blank++;

      const k = (r[COL_MITRA.kec] || "(Tidak diisi)").trim() || "(Tidak diisi)";
      kecMap.set(k, (kecMap.get(k) || 0) + 1);
      
      const statusVal = (st || "(Tidak diisi)").trim() || "(Tidak diisi)";
      statusMap.set(statusVal, (statusMap.get(statusVal) || 0) + 1);
      
      // Count GoogleForm matches
      const hasGF = checkGoogleFormStatus(r, rows);
      const gfStatus = hasGF ? "Sudah GF" : "Belum GF";
      gfCountMap.set(gfStatus, (gfCountMap.get(gfStatus) || 0) + 1);
    });
    
    const perKec = Array.from(kecMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const perStatus = Array.from(statusMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const gfData = Array.from(gfCountMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    return { total, cocok, tidakCocok, blank, perKec, perStatus, gfData };
  }, [mitriRows, rows]);

  const mitriKecOptions = useMemo(
    () => Array.from(new Set(mitriRows.map(r => (r[COL_MITRA.kec] || "").trim()).filter(Boolean))).sort(),
    [mitriRows]
  );

  const mitriStatusOptions = useMemo(
    () => Array.from(new Set(mitriRows.map(r => (r[COL_MITRA.statusNik] || "").trim()).filter(Boolean))).sort(),
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
      if (filterStatusSobat !== "all" && (r[COL.statusSobat] || "").trim() !== filterStatusSobat) return false;
      if (filterStatusSeleksi !== "all" && (r[COL.statusSeleksi] || "").trim() !== filterStatusSeleksi) return false;
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
  }, [rows, search, filterStatus, filterKec, filterRekomendasi, filterStatusSobat, filterStatusSeleksi, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterKec, filterRekomendasi, filterStatusSobat, filterStatusSeleksi, pageSize]);

  // Mitra filtered & pagination
  const mitriFiltered = useMemo(() => {
    const q = mitriSearch.toLowerCase().trim();
    let out = mitriRows.filter(r => {
      if (mitriFilterStatus !== "all") {
        const st = (r[COL_MITRA.statusNik] || "").trim();
        if (mitriFilterStatus === "__blank__") {
          if (st !== "") return false;
        } else if (st !== mitriFilterStatus) return false;
      }
      if (mitriFilterKec !== "all" && (r[COL_MITRA.kec] || "").trim() !== mitriFilterKec) return false;
      if (mitriFilterGF !== "all") {
        const hasGF = checkGoogleFormStatus(r, rows);
        const gfStatus = hasGF ? "Sudah GF" : "Belum GF";
        if (gfStatus !== mitriFilterGF) return false;
      }
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
  }, [mitriRows, mitriSearch, mitriFilterStatus, mitriFilterKec, mitriFilterGF, mitriSortKey, mitriSortDir, rows]);

  const mitriTotalPages = Math.max(1, Math.ceil(mitriFiltered.length / mitriPageSize));
  const mitriCurrentPage = Math.min(mitriPage, mitriTotalPages);
  const mitriPageRows = mitriFiltered.slice((mitriCurrentPage - 1) * mitriPageSize, mitriCurrentPage * mitriPageSize);

  useEffect(() => { setMitriPage(1); }, [mitriSearch, mitriFilterStatus, mitriFilterKec, mitriFilterGF, mitriPageSize]);

  // Mitra Tambahan derived
  const mtKecOptions = useMemo(
    () => Array.from(new Set(mtRows.map(r => (r[COL_MITRA.kec] || "").trim()).filter(Boolean))).sort(),
    [mtRows]
  );
  const mtStatusOptions = useMemo(
    () => Array.from(new Set(mtRows.map(r => (r[COL_MITRA.statusNik] || "").trim()).filter(Boolean))).sort(),
    [mtRows]
  );
  const mtStatusSeleksiAdminOptions = useMemo(
    () => Array.from(new Set(mtRows.map(r => (r[COL_MITRA.statusSeleksiAdmin] || "").trim()).filter(Boolean))).sort(),
    [mtRows]
  );
  const mtStats = useMemo(() => {
    const total = mtRows.length;
    let cocok = 0, tidakCocok = 0, blank = 0;
    const gfCountMap = new Map<string, number>();
    
    mtRows.forEach(r => {
      const st = r[COL_MITRA.statusNik] || "";
      if (isNikCocok(st)) cocok++;
      else if (isNikTidakCocok(st)) tidakCocok++;
      else if (st.trim() === "") blank++;
      
      // Count GoogleForm matches
      const hasGF = checkGoogleFormStatus(r, rows);
      const gfStatus = hasGF ? "Sudah GF" : "Belum GF";
      gfCountMap.set(gfStatus, (gfCountMap.get(gfStatus) || 0) + 1);
    });
    
    const gfData = Array.from(gfCountMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    return { total, cocok, tidakCocok, blank, gfData };
  }, [mtRows, rows]);
  const mtFiltered = useMemo(() => {
    const q = mtSearch.toLowerCase().trim();
    let out = mtRows.filter(r => {
      if (mtFilterStatus !== "all") {
        const st = (r[COL_MITRA.statusNik] || "").trim();
        if (mtFilterStatus === "__blank__") {
          if (st !== "") return false;
        } else if (st !== mtFilterStatus) return false;
      }
      if (mtFilterKec !== "all" && (r[COL_MITRA.kec] || "").trim() !== mtFilterKec) return false;
      if (mtFilterGF !== "all") {
        const hasGF = checkGoogleFormStatus(r, rows);
        const gfStatus = hasGF ? "Sudah GF" : "Belum GF";
        if (gfStatus !== mtFilterGF) return false;
      }
      if (mtFilterStatusSeleksiAdmin !== "all" && (r[COL_MITRA.statusSeleksiAdmin] || "").trim() !== mtFilterStatusSeleksiAdmin) return false;
      if (q) return r.some(c => (c || "").toString().toLowerCase().includes(q));
      return true;
    });
    
    // Handle sorting for dynamic columns (periodStart, skor, statusSeleksiKompetensi) vs direct columns
    const isDynamicColumn = ["periodStart", "skor", "statusSeleksiKompetensi"].includes(mtSortKey);
    
    if (isDynamicColumn) {
      // For dynamic columns, fetch olaData for each row and sort based on that
      out = [...out].sort((a, b) => {
        const aData = getOlaRowData(a, rows);
        const bData = getOlaRowData(b, rows);
        const fieldKey = mtSortKey as keyof typeof aData;
        const av = (aData[fieldKey] || "").toString().trim();
        const bv = (bData[fieldKey] || "").toString().trim();
        
        // For skor column, do numeric sort
        if (mtSortKey === "skor") {
          const aNum = parseFloat(av) || 0;
          const bNum = parseFloat(bv) || 0;
          if (aNum !== bNum) {
            return mtSortDir === "asc" ? aNum - bNum : bNum - aNum;
          }
          return 0;
        }
        
        // For other columns, do string sort
        const avLower = av.toLowerCase();
        const bvLower = bv.toLowerCase();
        if (avLower < bvLower) return mtSortDir === "asc" ? -1 : 1;
        if (avLower > bvLower) return mtSortDir === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      // For direct columns, use the original sorting logic (column index lookup)
      const idx = COL_MITRA[mtSortKey];
      out = [...out].sort((a, b) => {
        const av = (a[idx] || "").toString().toLowerCase();
        const bv = (b[idx] || "").toString().toLowerCase();
        if (av < bv) return mtSortDir === "asc" ? -1 : 1;
        if (av > bv) return mtSortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return out;
  }, [mtRows, mtSearch, mtFilterStatus, mtFilterKec, mtFilterGF, mtFilterStatusSeleksiAdmin, mtSortKey, mtSortDir, rows]);
  const mtTotalPages = Math.max(1, Math.ceil(mtFiltered.length / mtPageSize));
  const mtCurrentPage = Math.min(mtPage, mtTotalPages);
  const mtPageRows = mtFiltered.slice((mtCurrentPage - 1) * mtPageSize, mtCurrentPage * mtPageSize);
  useEffect(() => { setMtPage(1); }, [mtSearch, mtFilterStatus, mtFilterKec, mtFilterGF, mtFilterStatusSeleksiAdmin, mtPageSize]);
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

  // Handle verification field updates (Foto, KTP, Ijazah, Screenshot HP, Catatan PJ)
  const updateVerificationField = async (row: Row, colKey: "fotoVerifikasi" | "ktpVerifikasi" | "ijazahVerifikasi" | "screenshotHPVerifikasi" | "catatanPJ", newValue: string) => {
    const origIdx = rows.indexOf(row);
    if (origIdx < 0) return;
    const sheetRow = origIdx + 2;
    setSavingRow(sheetRow);
    try {
      const colNum = COL[colKey];
      let colLetter = String.fromCharCode(65 + (colNum % 26));
      if (colNum >= 26) {
        colLetter = String.fromCharCode(65 + Math.floor(colNum / 26) - 1) + String.fromCharCode(65 + (colNum % 26));
      }

      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "update",
          range: `${SHEET_NAME}!${colLetter}${sheetRow}`,
          values: [[newValue]],
        },
      });
      if (error) throw error;
      setRows(prev => prev.map((r, i) => {
        if (i !== origIdx) return r;
        const copy = [...r];
        while (copy.length <= COL[colKey]) copy.push("");
        copy[COL[colKey]] = newValue;
        return copy;
      }));
      toast({ title: "Tersimpan", description: "Data verifikasi berhasil diperbarui" });
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e?.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setSavingRow(null);
    }
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
    if (isVerifikasiNik(status)) {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />{status || "Terverifikasi"}</Badge>;
    }
    if (isNikCocok(status)) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{status || "Cocok (Belum Verifikasi)"}</Badge>;
    }
    if (isNikTidakCocok(status)) {
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />{status || "Tidak Cocok"}</Badge>;
    }
    if ((status || "").trim() !== "") {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{status}</Badge>;
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
          <p className="text-slate-600">Dashboard, Detail Mitra & Monitoring Mitra</p>
        </header>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-6xl mx-auto grid-cols-3 md:grid-cols-6 gap-1">
            <TabsTrigger value="dashboard" className="text-xs md:text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="detail" className="text-xs md:text-sm">Detail ({rows.length})</TabsTrigger>
            <TabsTrigger value="monitoring" className="text-xs md:text-sm">Monitoring</TabsTrigger>
            <TabsTrigger value="mitra" className="text-xs md:text-sm">Mitra 2026 ({mitriRows.length})</TabsTrigger>
            <TabsTrigger value="mitra-tambahan" className="text-xs md:text-sm">Tambahan ({mtRows.length})</TabsTrigger>
            <TabsTrigger value="resume" className="text-xs md:text-sm">Resume Rekomendasi</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : error ? (
              <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Total Mitra + Status SOBAT */}
                  <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b">
                        <div>
                          <CardDescription>Total Mitra</CardDescription>
                          <CardTitle className="text-3xl flex items-center gap-2"><Users className="h-6 w-6 text-blue-500" />{stats.total.toLocaleString("id-ID")}</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="font-semibold text-slate-700 mt-2">Status SOBAT</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {stats.sobatStatusData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{item.name}</span>
                          <span className="text-lg font-bold text-purple-600">{item.value}</span>
                        </div>
                      ))}
                      {stats.sobatStatusData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                    </CardContent>
                  </Card>
                  
                  {/* GoogleForm Mitra Kepka 2026 + GoogleForm Mitra Tambahan */}
                  <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardDescription className="font-semibold text-slate-700">Mitra Kepka 2026 (GoogleForm)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {mitriStats.gfData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${item.name === "Sudah GF" ? "text-green-700" : "text-red-700"}`}>{item.name}</span>
                            <span className={`text-lg font-bold ${item.name === "Sudah GF" ? "text-green-600" : "text-red-600"}`}>{item.value}</span>
                          </div>
                        ))}
                        {mitriStats.gfData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                      </div>
                      
                      <div className="pt-3 border-t">
                        <CardDescription className="font-semibold text-slate-700 mb-2">Mitra Tambahan (GoogleForm)</CardDescription>
                        <div className="space-y-2">
                          {mtStats.gfData.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className={`font-medium ${item.name === "Sudah GF" ? "text-cyan-700" : "text-orange-700"}`}>{item.name}</span>
                              <span className={`text-lg font-bold ${item.name === "Sudah GF" ? "text-cyan-600" : "text-orange-600"}`}>{item.value}</span>
                            </div>
                          ))}
                          {mtStats.gfData.length === 0 && <div className="text-xs text-muted-foreground">Tidak ada data</div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Persentase Rekomendasi - Full Width Chart */}
                <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-indigo-50 to-indigo-50">
                  <CardHeader>
                    <CardDescription className="text-sm font-semibold text-indigo-800">📊 Persentase Rekomendasi per Kecamatan (Google Form)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart 
                        data={stats.rekomendasiPerKecData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={120}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          label={{ value: 'Persentase (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${value}%`, 'Persentase']}
                          labelFormatter={(label) => `Kecamatan: ${label}`}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                        />
                        <Bar 
                          dataKey="value" 
                          name="Persentase Rekomendasi"
                          radius={[8, 8, 0, 0]}
                        >
                          {stats.rekomendasiPerKecData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getPercentageColor(entry.value)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 justify-center mt-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                        <span className="text-xs font-medium">100%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#06b6d4' }}></div>
                        <span className="text-xs font-medium">75% - 99%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-xs font-medium">50% - 74%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                        <span className="text-xs font-medium">&lt; 50%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                    <CardHeader><CardTitle className="text-lg">Top 5 Kecamatan Domisili</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats.perKec.slice(0, 5)} layout="vertical" margin={{ left: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                            {stats.perKec.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Distribusi Umur Mitra</CardTitle></CardHeader>
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
                    <CardHeader><CardTitle className="text-lg">Pendidikan Terakhir Mitra</CardTitle></CardHeader>
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
                <CardTitle className="text-lg">Detail Konfirmasi Mitra</CardTitle>
                <CardDescription>Cari, filter, dan lihat detail per mitra.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search + Filter + Pagination */}
                <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                  <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, email, ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Select value={filterKec} onValueChange={setFilterKec}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="Kec" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kecamatan</SelectItem>
                        {kecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="verified">Terverifikasi</SelectItem>
                        <SelectItem value="mismatch">Tidak Cocok</SelectItem>
                        <SelectItem value="notVerified">Belum Verifikasi</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterRekomendasi} onValueChange={setFilterRekomendasi}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="Reko" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Rekomendasi</SelectItem>
                        {rekomendasiOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterStatusSobat} onValueChange={setFilterStatusSobat}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="SOBAT" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status SOBAT</SelectItem>
                        {statusSobatOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select value={filterStatusSeleksi} onValueChange={setFilterStatusSeleksi}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="Seleksi Admin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status Seleksi Administrasi</SelectItem>
                        {statusSeleksiOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("statusSobat")}>
                              <div className="flex items-center gap-1">Status SOBAT <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleSort("desa")}>
                              <div className="flex items-center gap-1">Desa <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="text-center">Foto</TableHead>
                            <TableHead className="text-center">KTP/Suket</TableHead>
                            <TableHead className="text-center">Ijazah</TableHead>
                            <TableHead className="text-center">Screenshot HP</TableHead>
                            <TableHead className="min-w-40">Catatan PJ</TableHead>
                            <TableHead className="text-center">Catatan Kecap Maja</TableHead>
                            <TableHead className="text-center">Status Seleksi Administrasi</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageRows.length === 0 ? (
                            <TableRow><TableCell colSpan={12} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                          ) : pageRows.map((r, i) => (
                            <TableRow key={i} className={isNotVerified(r[COL.status]) ? "bg-orange-50/30" : isVerified(r[COL.status]) ? "bg-emerald-50/30" : isMismatch(r[COL.status]) ? "bg-red-50/30" : ""}>
                              <TableCell className="text-muted-foreground">{(currentPage - 1) * pageSize + i + 1}</TableCell>
                              <TableCell className="font-medium">{r[COL.nama] || "-"}</TableCell>
                              <TableCell>{r[COL.kec] || "-"}</TableCell>
                              <TableCell>{r[COL.statusSobat] || "-"}</TableCell>
                              <TableCell>{r[COL.desa] || "-"}</TableCell>
                              
                              {/* Foto */}
                              <TableCell className="text-center">
                                {canEdit ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      className={`p-1.5 rounded transition-colors ${
                                        (r[COL.fotoVerifikasi] || "") === "OK"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                      }`}
                                      onClick={() => updateVerificationField(r, "fotoVerifikasi", (r[COL.fotoVerifikasi] || "") === "OK" ? "" : "OK")}
                                      title="OK"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      className={`p-1.5 rounded transition-colors ${
                                        (r[COL.fotoVerifikasi] || "") === "Perlu perbaikan"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                      }`}
                                      onClick={() => updateVerificationField(r, "fotoVerifikasi", (r[COL.fotoVerifikasi] || "") === "Perlu perbaikan" ? "" : "Perlu perbaikan")}
                                      title="Perlu perbaikan"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    {(r[COL.fotoVerifikasi] || "") === "OK" && <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>}
                                    {(r[COL.fotoVerifikasi] || "") === "Perlu perbaikan" && <Badge className="bg-red-100 text-red-700">Perlu diperbaiki</Badge>}
                                    {!r[COL.fotoVerifikasi] && <span className="text-slate-400 text-sm">-</span>}
                                  </div>
                                )}
                              </TableCell>

                              {/* KTP/Suket */}
                              <TableCell className="text-center">
                                {canEdit ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      className={`p-1.5 rounded transition-colors ${
                                        (r[COL.ktpVerifikasi] || "") === "OK"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                      }`}
                                      onClick={() => updateVerificationField(r, "ktpVerifikasi", (r[COL.ktpVerifikasi] || "") === "OK" ? "" : "OK")}
                                      title="OK"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      className={`p-1.5 rounded transition-colors ${
                                        (r[COL.ktpVerifikasi] || "") === "Perlu perbaikan"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                      }`}
                                      onClick={() => updateVerificationField(r, "ktpVerifikasi", (r[COL.ktpVerifikasi] || "") === "Perlu perbaikan" ? "" : "Perlu perbaikan")}
                                      title="Perlu perbaikan"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    {(r[COL.ktpVerifikasi] || "") === "OK" && <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>}
                                    {(r[COL.ktpVerifikasi] || "") === "Perlu perbaikan" && <Badge className="bg-red-100 text-red-700">Perlu diperbaiki</Badge>}
                                    {!r[COL.ktpVerifikasi] && <span className="text-slate-400 text-sm">-</span>}
                                  </div>
                                )}
                              </TableCell>

                              {/* Ijazah */}
                              <TableCell className="text-center">
                                {canEdit ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      className={`p-1.5 rounded transition-colors ${
                                        (r[COL.ijazahVerifikasi] || "") === "OK"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                      }`}
                                      onClick={() => updateVerificationField(r, "ijazahVerifikasi", (r[COL.ijazahVerifikasi] || "") === "OK" ? "" : "OK")}
                                      title="OK"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      className={`p-1.5 rounded transition-colors ${
                                        (r[COL.ijazahVerifikasi] || "") === "Perlu perbaikan"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                      }`}
                                      onClick={() => updateVerificationField(r, "ijazahVerifikasi", (r[COL.ijazahVerifikasi] || "") === "Perlu perbaikan" ? "" : "Perlu perbaikan")}
                                      title="Perlu perbaikan"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    {(r[COL.ijazahVerifikasi] || "") === "OK" && <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>}
                                    {(r[COL.ijazahVerifikasi] || "") === "Perlu perbaikan" && <Badge className="bg-red-100 text-red-700">Perlu diperbaiki</Badge>}
                                    {!r[COL.ijazahVerifikasi] && <span className="text-slate-400 text-sm">-</span>}
                                  </div>
                                )}
                              </TableCell>

                              {/* Screenshot HP */}
                              <TableCell className="text-center">
                                {canEdit ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      className={`p-1.5 rounded transition-colors ${
                                        (r[COL.screenshotHPVerifikasi] || "") === "OK"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                    }`}
                                    onClick={() => updateVerificationField(r, "screenshotHPVerifikasi", (r[COL.screenshotHPVerifikasi] || "") === "OK" ? "" : "OK")}
                                    title="OK"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    className={`p-1.5 rounded transition-colors ${
                                      (r[COL.screenshotHPVerifikasi] || "") === "Perlu perbaikan"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                    }`}
                                    onClick={() => updateVerificationField(r, "screenshotHPVerifikasi", (r[COL.screenshotHPVerifikasi] || "") === "Perlu perbaikan" ? "" : "Perlu perbaikan")}
                                    title="Perlu perbaikan"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </div>
                                ) : (
                                  <div>
                                    {(r[COL.screenshotHPVerifikasi] || "") === "OK" && <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>}
                                    {(r[COL.screenshotHPVerifikasi] || "") === "Perlu perbaikan" && <Badge className="bg-red-100 text-red-700">Perlu diperbaiki</Badge>}
                                    {!r[COL.screenshotHPVerifikasi] && <span className="text-slate-400 text-sm">-</span>}
                                  </div>
                                )}
                              </TableCell>

                              {/* Catatan PJ */}
                              <TableCell>
                                {canEdit ? (
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="Catatan PJ..."
                                    value={r[COL.catatanPJ] || ""}
                                    onChange={(e) => {
                                      const copy = [...r];
                                      copy[COL.catatanPJ] = e.target.value;
                                      setRows(prev => prev.map((row, idx) => rows.indexOf(row) === rows.indexOf(r) ? copy : row));
                                    }}
                                    onBlur={() => {
                                      updateVerificationField(r, "catatanPJ", r[COL.catatanPJ] || "");
                                    }}
                                  />
                                ) : (
                                  <div className="text-xs text-slate-600">{r[COL.catatanPJ] || <span className="text-slate-400">-</span>}</div>
                                )}
                              </TableCell>

                              {/* Catatan Kecap Maja */}
                              <TableCell className="text-center">
                                {(() => {
                                  const validationIssues = validateResponden(r);
                                  const isDocumentWarning = (issue: string) => {
                                    return issue.includes("Foto - belum sesuai ketentuan") ||
                                           issue.includes("KTP - belum sesuai ketentuan") ||
                                           issue.includes("Ijazah - belum sesuai ketentuan") ||
                                           issue.includes("Screenshot HP - belum sesuai ketentuan");
                                  };
                                  const errors = validationIssues.filter(v => v.severity === "error");
                                  const warnings = validationIssues.filter(v => v.severity === "warning");
                                  const filteredWarnings = warnings.filter(w => !isDocumentWarning(w.issue));
                                  const hasDisplayableIssues = errors.length > 0 || filteredWarnings.length > 0;

                                  return (
                                    <button 
                                      className="cursor-pointer hover:opacity-75 transition-opacity"
                                      onClick={() => setValidationDetailRow(r)}
                                      type="button"
                                      title={hasDisplayableIssues ? "Klik untuk lihat catatan" : "Tidak ada catatan"}
                                    >
                                      <AlertTriangle className={hasDisplayableIssues ? "h-5 w-5 text-amber-600" : "h-5 w-5 text-slate-300"} />
                                    </button>
                                  );
                                })()}
                              </TableCell>

                              {/* Status Seleksi Administrasi */}
                              <TableCell className="text-center">
                                <span className="text-sm text-slate-600">
                                  {r[COL.statusSeleksi] || "-"}
                                </span>
                              </TableCell>

                              {/* Aksi */}
                              <TableCell className="text-right">
                                {(() => {
                                  const origIdx = rows.indexOf(r);
                                  const sheetRow = origIdx + 2;
                                  const currentRek = (r[COL.rekomendasi] || "").trim();

                                  return (
                                    <div className="flex items-center justify-end gap-2">
                                      {canEdit ? (
                                        <>
                                          <button 
                                            className={`p-1.5 rounded transition-all ${
                                              currentRek === "Rekomendasi"
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                            }`}
                                            onClick={() => handleRekomendasiClick(r, "Rekomendasi")} 
                                            title="Rekomendasi"
                                            type="button"
                                          >
                                            <Check className="h-4 w-4" />
                                          </button>
                                          <button 
                                            className={`p-1.5 rounded transition-all ${
                                              currentRek === "Non Rekomendasi"
                                                ? "bg-red-600 text-white"
                                                : "bg-red-50 text-red-500 hover:bg-red-100"
                                            }`}
                                            onClick={() => handleRekomendasiClick(r, "Non Rekomendasi")} 
                                            title="Non Rekomendasi"
                                            type="button"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </>
                                      ) : (
                                        <div className="text-xs">
                                          {currentRek === "Rekomendasi" && <Badge className="bg-emerald-100 text-emerald-700">Rekomendasi</Badge>}
                                          {currentRek === "Non Rekomendasi" && <Badge className="bg-red-100 text-red-700">Non Rekomendasi</Badge>}
                                          {!currentRek && <span className="text-slate-400">-</span>}
                                        </div>
                                      )}
                                      <button 
                                        className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                        onClick={() => setDetailRow(r)} 
                                        title="Lihat detail"
                                        type="button"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
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
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, pekerjaan, kecamatan, sobat ID..."
                      value={mitriSearch}
                      onChange={(e) => setMitriSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={mitriFilterStatus} onValueChange={setMitriFilterStatus}>
                     <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status NIK" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">Semua Status</SelectItem>
                       <SelectItem value="__blank__">(Belum Diisi / Kosong)</SelectItem>
                       {mitriStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                     </SelectContent>
                   </Select>
                  <Select value={mitriFilterGF} onValueChange={setMitriFilterGF}>
                    <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Cek GoogleForm" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Sudah GF">Sudah GF</SelectItem>
                      <SelectItem value="Belum GF">Belum GF</SelectItem>
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
                          <div className="flex items-center gap-1">Nama Lengkap <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("kec")}>
                          <div className="flex items-center gap-1">Kecamatan <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("desa")}>
                          <div className="flex items-center gap-1">Desa <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>

                        <TableHead className="cursor-pointer" onClick={() => toggleMitriSort("statusNik")}>
                          <div className="flex items-center gap-1">Status NIK <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="text-center">Cek GoogleForm</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mitriPageRows.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                          ) : mitriPageRows.map((r, i) => {
                        const st = r[COL_MITRA.statusNik] || "";
                            return (
                              <TableRow key={i}>
                                <TableCell className="text-muted-foreground">{(mitriCurrentPage - 1) * mitriPageSize + i + 1}</TableCell>
                                <TableCell className="font-medium">{r[COL_MITRA.nama] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.kec] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.desa] || "-"}</TableCell>

                                <TableCell><MitriStatusBadge status={st} /></TableCell>
                                <TableCell className="text-center">
                                  {checkGoogleFormStatus(r, rows) ? (
                                    <Badge className="bg-green-600 text-white">Sudah GF</Badge>
                                  ) : (
                                    <Badge className="bg-red-600 text-white">Belum GF</Badge>
                                  )}
                                </TableCell>
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
                <CardDescription>Rekap kebutuhan, status Google Form, manajemen mitra & rekomendasi penanggung jawab per kecamatan. <span className="font-medium text-indigo-700">💡 Klik header kolom untuk expand/collapse atau gunakan tombol "Buka Semua" / "Tutup Semua"</span></CardDescription>
              </CardHeader>
              <CardContent>
                {kkLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
                ) : kkError ? (
                  <div className="py-10 text-center text-red-600">{kkError}</div>
                ) : kkRows.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">Tidak ada data</div>
                ) : (() => {
                  // Use component-level expanded groups state
                  const expandedGroups = kkExpandedGroups;
                  const toggleGroupExpand = (group: string) => {
                    setKkExpandedGroups(prev => ({
                      ...prev,
                      [group]: !prev[group]
                    }));
                  };
                  
                  // Column groups based on sheet structure
                  // Col B = Kecamatan (Identitas: 1)
                  // Col C-E = PPL, PML, Jumlah (Kebutuhan: 3)
                  // Col F = Cadangan (Kebutuhan: 1) - CALCULATED
                  // Col F-J = Status Google Form (5) - HIDDEN
                  // Col K-L = Manajemen Mitra (2)
                  // Col M-Q = Rekomendasi Penanggungjawab (5)
                  // Col R = Mitra Eligible SE26 (1)
                  // Col S = Progres (1)
                  // Total visible = 1 + 4 + 2 + 5 + 1 + 1 = 14
                  
                  const groupOf = (i: number) => {
                    if (i === 0) return "id";           // i=0: Kecamatan
                    if (i <= 4) return "kebutuhan";    // i=1-4: PPL, PML, Jumlah, Cadangan
                    if (i <= 9) return "status";       // i=5-9: Status Google Form (F-J)
                    if (i <= 11) return "manajemen";   // i=10-11: Manajemen Mitra
                    if (i <= 16) return "rekomendasi"; // i=12-16: Rekomendasi
                    if (i === 17) return "mitraEligible"; // i=17: Mitra Eligible SE26
                    return "progres";                  // i=18: Progres
                  };
                  
                  const isColumnHidden = (i: number) => {
                    // Hide columns based on group expand state
                    if (i >= 1 && i <= 4 && !expandedGroups["kebutuhan"]) return true; // Kebutuhan columns (including Cadangan)
                    if (i >= 5 && i <= 9 && !expandedGroups["status"]) return true; // Status Google Form columns
                    if (i >= 10 && i <= 11 && !expandedGroups["manajemen"]) return true; // Manajemen columns
                    if (i >= 12 && i <= 16 && !expandedGroups["rekomendasi"]) return true; // Rekomendasi columns
                    if (i === 17 && !expandedGroups["mitraEligible"]) return true; // Mitra Eligible column
                    if (i === 18 && !expandedGroups["progres"]) return true; // Progres column
                    return false;
                  };
                  
                  const groupBg: Record<string, string> = {
                    id: "bg-slate-100",
                    kebutuhan: "bg-orange-100",
                    status: "bg-blue-100",
                    manajemen: "bg-rose-100",
                    rekomendasi: "bg-emerald-100",
                    mitraEligible: "bg-indigo-100",
                    progres: "bg-purple-100",
                  };
                  const groupCellBg: Record<string, string> = {
                    id: "",
                    kebutuhan: "bg-orange-50/40",
                    status: "bg-blue-50/40",
                    manajemen: "bg-rose-50/40",
                    rekomendasi: "bg-emerald-50/40",
                    mitraEligible: "bg-indigo-50/40",
                    progres: "bg-purple-50/40",
                  };
                  const groupLabels: Array<{ label: string; span: number; bg: string; group?: string }> = [
                    { label: "Identitas Wilayah", span: 1, bg: "bg-slate-200 text-slate-700" },
                    { label: "Kebutuhan Sensus Ekonomi 2026", span: expandedGroups["kebutuhan"] ? 4 : 0, bg: "bg-orange-200 text-orange-800", group: "kebutuhan" },
                    { label: "Status Google Form", span: expandedGroups["status"] ? 5 : 0, bg: "bg-blue-200 text-blue-800", group: "status" },
                    { label: "Manajemen Mitra", span: expandedGroups["manajemen"] ? 2 : 0, bg: "bg-rose-200 text-rose-800", group: "manajemen" },
                    { label: "Rekomendasi Penanggungjawab", span: expandedGroups["rekomendasi"] ? 5 : 0, bg: "bg-emerald-200 text-emerald-800", group: "rekomendasi" },
                    { label: "Mitra Eligible SE26 - Dobel", span: expandedGroups["mitraEligible"] ? 1 : 0, bg: "bg-indigo-200 text-indigo-800", group: "mitraEligible" },
                    { label: "Progres", span: expandedGroups["progres"] ? 1 : 0, bg: "bg-purple-200 text-purple-800", group: "progres" },
                  ];
                  
                  const headerRow = kkRows[1] || []; // Ambil header kolom individual dari baris kedua
                  const dataRows = kkRows.slice(2).filter(r => r && r.some(c => (c || "").toString().trim() !== ""));
                  const cols = 19; // 16 kolom dari sheet (skip A) + Cadangan + Mitra Eligible + Progres
                  
                  // Helper function to calculate progress percentage
                  // Progress = (Lengkap + Dobel) / Jumlah Kebutuhan
                  // Jumlah is at r[4] (E column)
                  // Lengkap is at r[16] (Q column)
                  // Dobel is at r[7] (H column)
                  const calculateProgress = (r: Row): number => {
                    const jumlahStr = (r[4] || "").toString().trim();
                    const lengkapStr = (r[16] || "").toString().trim();
                    const dobelStr = (r[7] || "").toString().trim();
                    
                    const jumlah = parseInt(jumlahStr) || 0;
                    const lengkap = parseInt(lengkapStr) || 0;
                    const dobel = parseInt(dobelStr) || 0;
                    
                    if (jumlah === 0) return 0;
                    return Math.round(((lengkap + dobel) / jumlah) * 10000) / 100; // Presisi 2 desimal
                  };
                  
                  // Helper function to calculate Mitra Eligible SE26 - Dobel
                  // Mitra Eligible = (Mitra KEPKA 2026 + Mitra Tambahan - Dobel) / Jumlah
                  // Mitra KEPKA 2026 is at r[10] (K column)
                  // Mitra Tambahan is at r[11] (L column)
                  // Dobel is at r[7] (H column)
                  // Jumlah is at r[4] (E column)
                  const calculateMitraEligible = (r: Row): number => {
                    const mitraKepkaStr = (r[10] || "").toString().trim();
                    const mitraTambahanStr = (r[11] || "").toString().trim();
                    const dobelStr = (r[7] || "").toString().trim();
                    const jumlahStr = (r[4] || "").toString().trim();
                    
                    const mitraKepka = parseInt(mitraKepkaStr) || 0;
                    const mitraTambahan = parseInt(mitraTambahanStr) || 0;
                    const dobel = parseInt(dobelStr) || 0;
                    const jumlah = parseInt(jumlahStr) || 0;
                    
                    if (jumlah === 0) return 0;
                    return Math.round((((mitraKepka + mitraTambahan - dobel) / jumlah) * 10000)) / 100; // Presisi 2 desimal
                  };
                  
                  // Helper to format progress display
                  const formatProgress = (percent: number): string => {
                    if (percent % 1 === 0) {
                      // Jika nilai tepat (integer), tampilkan tanpa desimal
                      return `${Math.round(percent)}%`;
                    }
                    // Jika ada desimal, tampilkan dengan 2 digit desimal
                    return `${percent.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
                  };
                  
                  // Helper to get progress bar color
                  const getProgressColor = (percent: number): string => {
                    if (percent < 25) return "bg-red-500";
                    if (percent < 50) return "bg-orange-500";
                    if (percent < 100) return "bg-blue-500";
                    return "bg-emerald-500";
                  };
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <span className="text-sm font-medium text-slate-600">Kolom:</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setKkExpandedGroups({
                            kebutuhan: true,
                            status: true,
                            manajemen: true,
                            rekomendasi: true,
                            mitraEligible: true,
                            progres: true,
                          })}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                        >
                          ▼ Buka Semua
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setKkExpandedGroups({
                            kebutuhan: false,
                            status: false,
                            manajemen: false,
                            rekomendasi: false,
                            mitraEligible: false,
                            progres: false,
                          })}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                        >
                          ▶ Tutup Semua
                        </Button>
                      </div>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {groupLabels.map((g, gi) => {
                                if (g.span === 0) return null; // Skip if no columns visible
                                return (
                                  <TableHead key={gi} colSpan={g.span} className={`text-center font-bold border ${g.bg} cursor-pointer select-none transition-all hover:shadow-md hover:opacity-90`} onClick={() => g.group && toggleGroupExpand(g.group)} title={g.group ? `Klik untuk ${expandedGroups[g.group] ? 'tutup' : 'buka'} kolom ini` : ""}>
                                    <div className="flex items-center justify-center gap-2 py-1 px-2">
                                      <span>{g.label}</span>
                                      {g.group && (
                                        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${expandedGroups[g.group] ? "rotate-0" : "-rotate-90"}`} />
                                      )}
                                    </div>
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                            <TableRow>
                              {Array.from({ length: cols }).map((_, i) => {
                                if (isColumnHidden(i)) return null;
                                const sheetColIdx = i + 1; // Skip kolom 0 (Kondisi)
                                let headerText = "";
                                
                                // Mapping kolom individual dengan label yang lebih spesifik
                                if (i === 0) {
                                  headerText = "Kecamatan";
                                } else if (i === 1) {
                                  headerText = "PPL";
                                } else if (i === 2) {
                                  headerText = "PML";
                                } else if (i === 3) {
                                  headerText = "Jumlah";
                                } else if (i === 4) {
                                  headerText = "Plus Cadangan 10%";
                                } else if (i === 5) {
                                  headerText = "Mitra Kepka 2026";
                                } else if (i === 6) {
                                  headerText = "Mitra Tambahan";
                                } else if (i === 7) {
                                  headerText = "Dobel";
                                } else if (i === 8) {
                                  headerText = "Tidak ditemukan";
                                } else if (i === 9) {
                                  headerText = "Total";
                                } else if (i === 10) {
                                  headerText = "Mitra Kepka 2026";
                                } else if (i === 11) {
                                  headerText = "Mitra Tambahan";
                                } else if (i === 12) {
                                  headerText = "Mitra Kepka 2026";
                                } else if (i === 13) {
                                  headerText = "Mitra Tambahan";
                                } else if (i === 14) {
                                  headerText = "Dobel";
                                } else if (i === 15) {
                                  headerText = "Belum Kepka";
                                } else if (i === 16) {
                                  headerText = "Lengkap";
                                } else if (i === 17) {
                                  headerText = "Mitra Eligible SE26 - Dobel";
                                } else if (i === cols - 1) {
                                  headerText = "Progres";
                                } else if (sheetColIdx < headerRow.length) {
                                  headerText = headerRow[sheetColIdx];
                                }
                                return (
                                  <TableHead key={i} className={`text-center text-xs font-semibold border ${groupBg[groupOf(i)]}`}>
                                    {headerText}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dataRows.map((r, ri) => {
                              const isTotal = ri === dataRows.length - 1 && ((r[2] || "").toString().toUpperCase().includes("KAB"));
                              const progress = calculateProgress(r);
                              return (
                                <TableRow key={ri} className={isTotal ? "bg-yellow-50 font-bold" : "hover:bg-slate-50"}>
                                  {Array.from({ length: cols }).map((_, ci) => {
                                    if (isColumnHidden(ci)) return null;
                                    if (ci === 4) {
                                      // Cadangan cell - Jumlah + 10% * Jumlah
                                      const jumlahStr = (r[4] || "").toString().trim();
                                      const jumlah = parseInt(jumlahStr) || 0;
                                      const cadangan = Math.round(jumlah * 1.1);
                                      return (
                                        <TableCell key={ci} className={`text-xs border ${groupCellBg[groupOf(ci)]} text-center font-mono font-bold text-indigo-700`}>
                                          {cadangan || ""}
                                        </TableCell>
                                      );
                                    }
                                    if (ci === 17) {
                                      // Mitra Eligible SE26 - Dobel cell with progress bar
                                      const mitraEligible = calculateMitraEligible(r);
                                      return (
                                        <TableCell key={ci} className={`text-xs border ${groupCellBg[groupOf(ci)]} text-center`}>
                                          <div className="flex flex-col items-center gap-1">
                                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full transition-all ${getProgressColor(mitraEligible)}`}
                                                style={{width: `${mitraEligible}%`}}
                                              ></div>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700">{formatProgress(mitraEligible)}</span>
                                          </div>
                                        </TableCell>
                                      );
                                    }
                                    if (ci === cols - 1) {
                                      // Progress bar cell
                                      return (
                                        <TableCell key={ci} className={`text-xs border ${groupCellBg[groupOf(ci)]} text-center`}>
                                          <div className="flex flex-col items-center gap-1">
                                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full transition-all ${getProgressColor(progress)}`}
                                                style={{width: `${progress}%`}}
                                              ></div>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700">{formatProgress(progress)}</span>
                                          </div>
                                        </TableCell>
                                      );
                                    }
                                    const sheetColIdx = ci + 1; // Skip kolom 0
                                    let v = r[sheetColIdx] ?? "";
                                    // For columns after cadangan, adjust the sheet index to skip the cadangan calculation
                                    if (ci > 4) {
                                      v = r[sheetColIdx - 1] ?? "";
                                    }
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
                {/* Search + Filter + Pagination */}
                <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                  <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, ID, kecamatan..."
                      value={mtSearch}
                      onChange={(e) => setMtSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Select value={mtFilterKec} onValueChange={setMtFilterKec}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="Kec" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kecamatan</SelectItem>
                        {mtKecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select value={mtFilterStatus} onValueChange={setMtFilterStatus}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="NIK" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="__blank__">(Kosong)</SelectItem>
                        {mtStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select value={mtFilterGF} onValueChange={setMtFilterGF}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="GF" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua</SelectItem>
                        <SelectItem value="Sudah GF">Sudah GF</SelectItem>
                        <SelectItem value="Belum GF">Belum GF</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={mtFilterStatusSeleksiAdmin} onValueChange={setMtFilterStatusSeleksiAdmin}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue placeholder="Seleksi Admin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Seleksi Admin</SelectItem>
                        {mtStatusSeleksiAdminOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <Select value={String(mtPageSize)} onValueChange={(v) => setMtPageSize(Number(v))}>
                      <SelectTrigger className="w-auto h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                          <div className="flex items-center gap-1">Nama Lengkap <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleMtSort("kec")}>
                          <div className="flex items-center gap-1">Kecamatan <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleMtSort("desa")}>
                          <div className="flex items-center gap-1">Desa <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleMtSort("periodStart")}>
                          <div className="flex items-center gap-1">Periode Seleksi <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer" onClick={() => toggleMtSort("skor")}>
                          <div className="flex items-center gap-1">Skor <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                            <TableHead>Status Seleksi Administrasi</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => toggleMtSort("statusSeleksiKompetensi")}>
                          <div className="flex items-center gap-1">Status Seleksi Kompetensi <ArrowUpDown className="h-3 w-3" /></div>
                        </TableHead>
                            <TableHead className="min-w-40">Catatan PJ</TableHead>
                            <TableHead className="text-center">Catatan Kecap Maja</TableHead>
                            <TableHead className="text-center">Cek GoogleForm</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mtPageRows.length === 0 ? (
                        <TableRow><TableCell colSpan={15} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                          ) : mtPageRows.map((r, i) => {
                        const olaData = getOlaRowData(r, rows);
                        const matchedOlaRow = getMatchedOlaRow(r, rows);
                            return (
                              <TableRow key={i}>
                                <TableCell className="text-muted-foreground">{(mtCurrentPage - 1) * mtPageSize + i + 1}</TableCell>
                                <TableCell className="font-medium">{r[COL_MITRA.nama] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.kec] || "-"}</TableCell>
                                <TableCell>{r[COL_MITRA.desa] || "-"}</TableCell>
                            <TableCell>{olaData.periodStart || "-"}</TableCell>
                            <TableCell>{olaData.skor || "-"}</TableCell>
                                <TableCell className="text-sm">{r[COL_MITRA.statusSeleksiAdmin] || "-"}</TableCell>
                                <TableCell className="text-sm">{olaData.statusSeleksiKompetensi || "-"}</TableCell>
                                <TableCell>
                                  {matchedOlaRow ? (
                                    <Input
                                      className="h-8 text-xs"
                                      placeholder="Catatan PJ..."
                                      value={matchedOlaRow[COL.catatanPJ] || ""}
                                      onChange={(e) => {
                                        const origIdx = rows.indexOf(matchedOlaRow);
                                        if (origIdx >= 0) {
                                          const copy = [...matchedOlaRow];
                                          copy[COL.catatanPJ] = e.target.value;
                                          setRows(prev => prev.map((row, idx) => idx === origIdx ? copy : row));
                                        }
                                      }}
                                      onBlur={() => {
                                        if (matchedOlaRow) {
                                          updateVerificationField(matchedOlaRow, "catatanPJ", matchedOlaRow[COL.catatanPJ] || "");
                                        }
                                      }}
                                    />
                                  ) : "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {(() => {
                                    const validationIssues = matchedOlaRow ? validateResponden(matchedOlaRow) : [];
                                    const isDocumentWarning = (issue: string) => {
                                      return issue.includes("Foto - belum sesuai ketentuan") ||
                                             issue.includes("KTP - belum sesuai ketentuan") ||
                                             issue.includes("Ijazah - belum sesuai ketentuan") ||
                                             issue.includes("Screenshot HP - belum sesuai ketentuan");
                                    };
                                    const errors = validationIssues.filter(v => v.severity === "error");
                                    const warnings = validationIssues.filter(v => v.severity === "warning");
                                    const filteredWarnings = warnings.filter(w => !isDocumentWarning(w.issue));
                                    const hasDisplayableIssues = errors.length > 0 || filteredWarnings.length > 0;

                                    return (
                                      <button 
                                        className="cursor-pointer hover:opacity-75 transition-opacity"
                                        onClick={() => setMtValidationDetailRow(matchedOlaRow || null)}
                                        type="button"
                                        title={hasDisplayableIssues ? "Klik untuk lihat catatan" : "Tidak ada catatan"}
                                      >
                                        <AlertTriangle className={hasDisplayableIssues ? "h-5 w-5 text-amber-600 mx-auto" : "h-5 w-5 text-slate-300 mx-auto"} />
                                      </button>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-center">
                                  {checkGoogleFormStatus(r, rows) ? (
                                    <Badge className="bg-green-600 text-white">Sudah GF</Badge>
                                  ) : (
                                    <Badge className="bg-red-600 text-white">Belum GF</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(() => {
                                    if (!matchedOlaRow) {
                                      return <span className="text-xs text-slate-400">No Match</span>;
                                    }
                                    
                                    const currentRek = (matchedOlaRow[COL.rekomendasi] || "").trim();

                                    return (
                                      <div className="flex items-center justify-end gap-1">
                                        <button 
                                          className={`p-1.5 rounded transition-all ${
                                            currentRek === "Rekomendasi"
                                              ? "bg-emerald-600 text-white"
                                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                          }`}
                                          onClick={() => handleRekomendasiClick(matchedOlaRow, "Rekomendasi")} 
                                          title="Rekomendasi"
                                          type="button"
                                        >
                                          <Check className="h-4 w-4" />
                                        </button>
                                        <button 
                                          className={`p-1.5 rounded transition-all ${
                                            currentRek === "Non Rekomendasi"
                                              ? "bg-red-600 text-white"
                                              : "bg-red-50 text-red-500 hover:bg-red-100"
                                          }`}
                                          onClick={() => handleRekomendasiClick(matchedOlaRow, "Non Rekomendasi")} 
                                          title="Non Rekomendasi"
                                          type="button"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                        <Button size="icon" variant="ghost" onClick={() => setMtDetailRow(r)} title="Detail Mitra Tambahan" className="h-9 w-9">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => setDetailRow(getOlahRowByMitraName(r, rows))} title="Detail Mitra" className="h-9 w-9">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    );
                                  })()}
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

          {/* RESUME - Rekomendasi dengan Dokumen Perlu Perbaikan */}
          <TabsContent value="resume" className="space-y-6 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : error ? (
              <Card><CardContent className="py-10 text-center text-red-600">{error}</CardContent></Card>
            ) : (() => {
              // 4 Category Filters
              const rekoWithIssue = rows.filter(r => {
                const rekoStatus = (r[COL.rekomendasi] || "").trim();
                if (rekoStatus !== "Rekomendasi") return false;
                const validation = validateResponden(r);
                return validation.length > 0;
              });

              const rekoLengkap = rows.filter(r => {
                const rekoStatus = (r[COL.rekomendasi] || "").trim();
                if (rekoStatus !== "Rekomendasi") return false;
                const validation = validateResponden(r);
                return validation.length === 0;
              });

              const belumDitentukan = rows.filter(r => {
                const rekoStatus = (r[COL.rekomendasi] || "").trim();
                return rekoStatus === "" || rekoStatus === "-";
              });

              const nonRekomendasi = rows.filter(r => {
                const rekoStatus = (r[COL.rekomendasi] || "").trim();
                return rekoStatus === "Non Rekomendasi";
              });

              // Helper: Group data by kecamatan
              const groupByKec = (data: Row[]) => {
                const groups = new Map<string, Row[]>();
                data.forEach(r => {
                  const kec = (r[COL.kec] || "Tidak Ada").trim();
                  if (!groups.has(kec)) groups.set(kec, []);
                  groups.get(kec)!.push(r);
                });
                return groups;
              };

              const rekoWithIssueKecs = groupByKec(rekoWithIssue);
              const rekoLengkapKecs = groupByKec(rekoLengkap);
              const belumKecs = groupByKec(belumDitentukan);
              const nonRekoKecs = groupByKec(nonRekomendasi);

              return (
                <>
                  {/* Cek Rekomendasi SOBAT */}
                  <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs font-semibold text-blue-800">✅ Jumlah Mitra yang Telah di dipilih Rekomendasi oleh Penanggungjawab Kecamatan</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats.checkedRecommendationData.map((item, idx) => (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{item.name}</span>
                              <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all" 
                                style={{ 
                                  width: `${stats.checkedRecommendationData.reduce((sum, d) => sum + d.value, 0) > 0 ? (item.value / stats.checkedRecommendationData.reduce((sum, d) => sum + d.value, 0)) * 100 : 0}%`,
                                  backgroundColor: item.color
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        {stats.checkedRecommendationData.length > 0 && (
                          <>
                            <div className="border-t pt-3 mt-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-700">TOTAL</span>
                                <span className="text-lg font-bold text-slate-900">{stats.checkedRecommendationData.reduce((sum, d) => sum + d.value, 0)}</span>
                              </div>
                            </div>
                          </>
                        )}
                        {stats.checkedRecommendationData.length === 0 && <div className="text-xs text-muted-foreground">Belum ada mitra dengan rekomendasi</div>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 1: Rekomendasi dengan Issue */}
                  <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-amber-500" />Detail Rekomendasi dengan Issue/Warning - Sudah rekomendasi PJ tetapi terdapat issue atau perlu perbaikan</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Select value={resumeFilterKec} onValueChange={setResumeFilterKec}>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua Kecamatan</SelectItem>
                              {(() => {
                                const kecSorted = Array.from(rekoWithIssueKecs.keys()).sort();
                                return kecSorted.map(k => (
                                  <SelectItem key={k} value={k}>{k} ({rekoWithIssueKecs.get(k)?.length || 0})</SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {rekoWithIssue.length === 0 ? (
                        <div className="py-12 text-center">
                          <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                          <p className="text-slate-600 font-medium">Semua rekomendasi sudah sempurna!</p>
                          <p className="text-sm text-slate-500">Tidak ada data yang perlu diperbaiki.</p>
                        </div>
                      ) : (
                        <Accordion type="multiple" value={Object.keys(resumeExpandedKecs).filter(k => resumeExpandedKecs[k])} onValueChange={(newVal) => {
                          const newExpanded: Record<string, boolean> = {};
                          newVal.forEach(k => { newExpanded[k] = true; });
                          setResumeExpandedKecs(newExpanded);
                        }}>
                          {(() => {
                            const kecSorted = Array.from(rekoWithIssueKecs.keys()).sort();
                            const filteredKecs = resumeFilterKec === "all" ? kecSorted : kecSorted.filter(k => k === resumeFilterKec);
                            
                            return filteredKecs.map((kec, idx) => {
                              const kecData = rekoWithIssueKecs.get(kec) || [];
                              // Hitung dari SEMUA Rekomendasi di kecamatan
                              const allRekoInKec = rows.filter(r => {
                                const rKec = (r[COL.kec] || "").trim();
                                const rekoStatus = (r[COL.rekomendasi] || "").trim();
                                return rKec === kec && rekoStatus === "Rekomendasi";
                              });
                              const kecWithIssueCount = allRekoInKec.filter(r => validateResponden(r).length > 0).length;
                              const kecLengkapCount = allRekoInKec.length - kecWithIssueCount;
                              
                              // Cross-section stats
                              const nonRekoInKec = rows.filter(r => {
                                const rKec = (r[COL.kec] || "").trim();
                                const rekoStatus = (r[COL.rekomendasi] || "").trim();
                                return rKec === kec && rekoStatus === "Non Rekomendasi";
                              }).length;
                              const belumInKec = rows.filter(r => {
                                const rKec = (r[COL.kec] || "").trim();
                                const rekoStatus = (r[COL.rekomendasi] || "").trim();
                                return rKec === kec && (rekoStatus === "" || rekoStatus === "-");
                              }).length;
                              
                              return (
                                <AccordionItem key={idx} value={kec} className="border rounded-lg mb-3 px-4">
                                  <AccordionTrigger className="hover:no-underline py-3">
                                    <div className="flex items-center gap-3 w-full text-left flex-wrap">
                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                      <span className="font-semibold text-slate-800">{kec}</span>
                                      <div className="flex gap-1 ml-auto text-xs flex-wrap justify-end">
                                        <Badge className="bg-red-100 text-red-800 border-red-300">Non Reko: {nonRekoInKec}</Badge>
                                        <Badge className="bg-slate-100 text-slate-800 border-slate-300">Belum: {belumInKec}</Badge>
                                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">Issue: {kecWithIssueCount}</Badge>
                                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Lengkap: {kecLengkapCount}</Badge>
                                        <Badge variant="secondary">Reko: {allRekoInKec.length}</Badge>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="pt-0">
                                    <div className="space-y-3 mt-3">
                                      {kecData.map((r, rowIdx) => {
                                        const validation = validateResponden(r);
                                        const errors = validation.filter(v => v.severity === "error");
                                        const warnings = validation.filter(v => v.severity === "warning");
                                        return (
                                          <div key={rowIdx} className="border border-slate-200 rounded-lg p-3 bg-amber-50 hover:bg-amber-100 transition-colors">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                              <div className="flex-1">
                                                <p className="font-semibold text-slate-800">{r[COL.nama] || "N/A"}</p>
                                                <p className="text-xs text-slate-600 mt-1">Desa: {r[COL.desa] || "-"} • Pendidikan: {r[COL.pendidikan] || "-"}</p>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setDetailRow(r)}
                                                title="Lihat detail"
                                              >
                                                <Eye className="h-4 w-4" />
                                              </Button>
                                            </div>
                                            {errors.length > 0 && (
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                {errors.map((err, i) => (
                                                  <Badge key={i} className="bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                                                    <XCircle className="h-3 w-3" />
                                                    {err.issue}
                                                  </Badge>
                                                ))}
                                              </div>
                                            )}
                                            {warnings.length > 0 && (
                                              <div className="text-xs text-amber-700 mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                                                <p className="font-semibold mb-1 flex items-center gap-1">
                                                  <AlertTriangle className="h-3 w-3" />
                                                  Catatan ({warnings.length}):
                                                </p>
                                                <ul className="space-y-1">
                                                  {warnings.slice(0).map((w, i) => (
                                                    <li key={i} className="flex gap-2">
                                                      <span className="text-amber-600">•</span>
                                                      <span>{w.issue}</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            });
                          })()}
                        </Accordion>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>

        {/* Validation Notes Dialog */}
        <Dialog open={!!validationDetailRow} onOpenChange={(o) => !o && setValidationDetailRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Catatan Kecap Maja - {validationDetailRow ? (validationDetailRow[COL.nama] || "Mitra") : ""}</DialogTitle>
              <DialogDescription>Hasil validasi data mitra</DialogDescription>
            </DialogHeader>
            {validationDetailRow && (() => {
              const issues = validateResponden(validationDetailRow);
              const errors = issues.filter(v => v.severity === "error");
              const warnings = issues.filter(v => v.severity === "warning");
              
              // Filter out document verification warnings untuk dialog Detail tab saja
              const isDocumentWarning = (issue: string) => {
                return issue.includes("Foto - belum sesuai ketentuan") ||
                       issue.includes("KTP - belum sesuai ketentuan") ||
                       issue.includes("Ijazah - belum sesuai ketentuan") ||
                       issue.includes("Screenshot HP - belum sesuai ketentuan");
              };
              const filteredWarnings = warnings.filter(w => !isDocumentWarning(w.issue));
              
              return (
                <div className="space-y-4">
                  {errors.length === 0 && filteredWarnings.length === 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-emerald-700">Baik - Tidak ada isu</span>
                    </div>
                  ) : (
                    <>
                      {errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Issue Kritis ({errors.length})
                          </h4>
                          <ul className="space-y-1">
                            {errors.map((e, i) => (
                              <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                {e.issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {filteredWarnings.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Catatan ({filteredWarnings.length})
                          </h4>
                          <ul className="space-y-1">
                            {filteredWarnings.map((w, i) => (
                              <li key={i} className="text-sm text-amber-600 flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">•</span>
                                {w.issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Mitra</DialogTitle>
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
                      <div className="text-xs font-semibold text-slate-900 bg-slate-100 px-3 py-2 rounded uppercase tracking-wide">{h || `Kolom ${i + 1}`}</div>
                      <div className="text-sm break-words mt-2 bg-blue-50 px-3 py-2 rounded text-blue-900">
                        {isGDriveLink ? (
                          <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            📸 Klik untuk melihat gambar
                          </a>
                        ) : (
                          val || <span className="text-blue-400 italic">-</span>
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
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Mitra</DialogTitle>
              <DialogDescription>
                {mtDetailRow ? (mtDetailRow[COL_MITRA.nama] || "-") : ""}
              </DialogDescription>
            </DialogHeader>
            {mtDetailRow && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {mtHeaders.map((h, i) => {
                  const val = mtDetailRow[i];
                  if (!h && !val) return null;
                  const isGDriveLink = val && typeof val === "string" && val.includes("drive.google.com");
                  return (
                    <div key={i} className="border-b pb-2">
                      <div className="text-xs font-semibold text-slate-900 bg-slate-100 px-3 py-2 rounded uppercase tracking-wide">{h || `Kolom ${i + 1}`}</div>
                      <div className="text-sm break-words mt-2 bg-blue-50 px-3 py-2 rounded text-blue-900">
                        {isGDriveLink ? (
                          <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                            📸 Klik untuk melihat gambar
                          </a>
                        ) : (
                          val || <span className="text-blue-400 italic">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Validation Detail Dialog - Mitra Tambahan */}
        <Dialog open={!!mtValidationDetailRow} onOpenChange={(o) => !o && setMtValidationDetailRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Catatan Kecap Maja - {mtValidationDetailRow ? (mtValidationDetailRow[COL.nama] || "Mitra") : ""}</DialogTitle>
              <DialogDescription>Hasil validasi data mitra</DialogDescription>
            </DialogHeader>
            {mtValidationDetailRow && (() => {
              const issues = validateResponden(mtValidationDetailRow);
              const errors = issues.filter(v => v.severity === "error");
              const warnings = issues.filter(v => v.severity === "warning");
              
              // Filter out document verification warnings
              const isDocumentWarning = (issue: string) => {
                return issue.includes("Foto - belum sesuai ketentuan") ||
                       issue.includes("KTP - belum sesuai ketentuan") ||
                       issue.includes("Ijazah - belum sesuai ketentuan") ||
                       issue.includes("Screenshot HP - belum sesuai ketentuan");
              };
              const filteredWarnings = warnings.filter(w => !isDocumentWarning(w.issue));
              
              return (
                <div className="space-y-4">
                  {errors.length === 0 && filteredWarnings.length === 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-emerald-700">Baik - Tidak ada isu</span>
                    </div>
                  ) : (
                    <>
                      {errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Issue Kritis ({errors.length})
                          </h4>
                          <ul className="space-y-1">
                            {errors.map((e, i) => (
                              <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                {e.issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {filteredWarnings.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Catatan ({filteredWarnings.length})
                          </h4>
                          <ul className="space-y-1">
                            {filteredWarnings.map((w, i) => (
                              <li key={i} className="text-sm text-amber-600 flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">•</span>
                                {w.issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
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