import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, Eye, ArrowUpDown, Users, AlertTriangle, CheckCircle2, XCircle, Circle } from "lucide-react";
import { PelatihanSE26 } from "@/components/PelatihanSE26";

type Row = string[];

const SPREADSHEET_ID = "1Sa6HeJ_PqRMQOHjJc9gGeuYFgHy8Ed5TSzt9dnztkqE";
const SHEET_NAME = "Olah";
const RANGE = `${SHEET_NAME}!A1:BX`;
const SHEET_NAME_KOMPETENSI = "Scraping Seleksi";
const RANGE_KOMPETENSI = `${SHEET_NAME_KOMPETENSI}!A1:AI`;

// Column letter to index (0-based)
const colIdx = (letter: string): number => {
  let n = 0;
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64);
  }
  return n - 1;
};

// Column indices for Responden (Olah sheet)
const COL = {
  email: colIdx("B"),    // B
  kegiatanRutin: colIdx("C"),  // C
  sensusEkonomi: colIdx("E"),  // E
  nama: colIdx("F"),     // F
  sobatId: colIdx("G"),  // G
  pendidikan: colIdx("J"),  // J
  tanggalLahir: colIdx("K"),  // K
  umur: colIdx("L"),     // L
  kec: colIdx("M"),      // M
  desa: colIdx("N"),     // N
  kegiatanSehariHari: colIdx("O"),  // O
  bekerjaPNS: colIdx("P"),  // P
  prosesPendaftaran: colIdx("Q"),  // Q
  pekerjaan: colIdx("R"),  // R
  smartphoneAndroid: colIdx("W"),  // W
  androidVersion: colIdx("Y"),  // Y
  prioritasKejaanBPS: colIdx("AM"),  // AM
  kontrakKerja: colIdx("AN"),  // AN
  pelatihanBPS: colIdx("AO"),  // AO
  pelatihanBPS2: colIdx("AP"),  // AP
  lintasKecamatan: colIdx("AQ"),  // AQ
  lintasDesa: colIdx("AR"),  // AR
  deadline: colIdx("AS"),  // AS
  waktuTenagaPikiran: colIdx("AT"),  // AT
  memperbaikiHasil: colIdx("AU"),  // AU
  tidakMengalihkan: colIdx("AV"),  // AV
  fotoVerifikasi: colIdx("BG"),  // BG
  ktpVerifikasi: colIdx("BH"),  // BH
  ijazahVerifikasi: colIdx("BI"),  // BI
  screenshotHPVerifikasi: colIdx("BJ"),  // BJ
  catatanPJ: colIdx("BK"),  // BK
  status: colIdx("BD"),  // BD
  rekomendasi: colIdx("BE"),  // BE
  statusSobat: colIdx("BF"),  // BF
  statusSeleksi: colIdx("BL"),  // BL - Status Seleksi Administrasi
  statusSeleksiKompetensi: colIdx("BM"),  // BM - Status Seleksi Kompetensi
  skor: colIdx("BQ"),  // BQ - Skor
  tipeKegiatan: colIdx("BN"),  // BN - Tipe Kegiatan (SE2026 / Rutin)
  pplPml: colIdx("BO"),  // BO - PPL atau PML
  statusAkhir: colIdx("BT"),  // BT - Status Akhir (Diterima/Ditolak) untuk Mitra Tambahan
  aksiAdmin: colIdx("BU"),  // BU - Aksi Admin (PPL SE26, PML SE26, Cadangan SE26, Rutin)
  suratVideo1: colIdx("BV"),  // BV - Surat & Video (link/text)
  suratVideo2: colIdx("BW"),  // BW - Surat & Video (link/text)
  suratVideo3: colIdx("BX"),  // BX - Surat & Video (link/text)
};

// Column mapping untuk Mitra (Manajemen Mitra sheet)
const COL_MITRA = {
  nama: colIdx("A"),        // A - Nama Lengkap
  kec: colIdx("H"),         // H - Alamat Kecamatan
  desa: colIdx("I"),        // I - Desa
  sobatId: colIdx("P"),     // P - Sobat ID
  email: colIdx("Q"),       // Q - Email
  statusSeleksiAdmin: colIdx("C"),  // C - Status Seleksi Administrasi
  statusSeleksiKompetensi: colIdx("D"),  // D - Status Seleksi Kompetensi
  tipeKegiatan: colIdx("E"),  // E - Tipe Kegiatan (SE2026 / Rutin)
  pplPml: colIdx("F"),   // F - PPL atau PML
};

// Column mapping untuk Scraping Seleksi sheet
const COL_KOMPETENSI = {
  email: colIdx("AI"),      // AI - Email
  kompetensi: colIdx("J"),  // J - Kompetensi
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

// Validation function - mengecek data responden
const validateResponden = (row: Row): Array<{ issue: string; severity: "error" | "warning" }> => {
  const issues: Array<{ issue: string; severity: "error" | "warning" }> = [];

  // E: Sensus Ekonomi 2026 - Jika menjawab "Tidak" adalah warning
  const sensusEkon = (row[colIdx("E")] || "").trim();
  if (sensusEkon && isNotAnswer(sensusEkon)) {
    issues.push({ issue: "Tidak ingin mengikuti Sensus Ekonomi 2026", severity: "warning" });
  }

  // J: Pendidikan = SLTP/Sederajat (hanya warning)
  const pendidikan = (row[colIdx("J")] || "").toLowerCase().trim();
  if (pendidikan && pendidikan.includes("sltp")) {
    issues.push({ issue: "Pendidikan SLTP/Sederajat (minimal SMA lebih baik)", severity: "warning" });
  }

  // K & L: Tanggal Lahir vs Umur konsistensi
  const tanggalLahir = (row[colIdx("K")] || "").trim();
  const umurStr = (row[colIdx("L")] || "").trim();
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

  // O: Kegiatan sehari-hari - Jika ADA "Bekerja penuh waktu" adalah error
  const kegiatanSehariHari = (row[colIdx("O")] || "").toLowerCase();
  if (kegiatanSehariHari && kegiatanSehariHari.includes("bekerja penuh waktu")) {
    issues.push({ issue: "Memiliki pekerjaan utama (tidak senggang)", severity: "error" });
  }

  // P: Bekerja PNS/PPPK - Jika bukan "Tidak" adalah error
  const bekerjaPNS = (row[colIdx("P")] || "").trim();
  if (bekerjaPNS && !isNotAnswer(bekerjaPNS)) {
    issues.push({ issue: "Memiliki pekerjaan PNS/PPPK", severity: "error" });
  }

  // Q: Proses Pendaftaran PNS/PPPK - Jika bukan "Tidak" adalah error
  const prosesPendaftaran = (row[colIdx("Q")] || "").trim();
  if (prosesPendaftaran && !isNotAnswer(prosesPendaftaran)) {
    issues.push({ issue: "Sedang dalam proses pendaftaran PNS/PPPK", severity: "error" });
  }

  // W: Smartphone Android ≠ "Ya"
  const smartphone = (row[colIdx("W")] || "").trim();
  if (smartphone && !isYesAnswer(smartphone)) {
    issues.push({ issue: "Tidak memiliki Smartphone Android", severity: "error" });
  }

  // AM: Prioritas BPS ≠ "Ya"
  const prioritasBPS = (row[colIdx("AM")] || "").trim();
  if (prioritasBPS && !isYesAnswer(prioritasBPS)) {
    issues.push({ issue: "Tidak bersedia prioritaskan pekerjaan BPS", severity: "error" });
  }

  // AN: Kontrak Kerja ≠ "Ya"
  const kontrakKerja = (row[colIdx("AN")] || "").trim();
  if (kontrakKerja && !isYesAnswer(kontrakKerja)) {
    issues.push({ issue: "Tidak bersedia menandatangani kontrak kerja", severity: "error" });
  }

  // AO: Pelatihan BPS ≠ "Ya" (warning level)
  const pelatihanBPS = (row[colIdx("AO")] || "").trim();
  if (pelatihanBPS && !isYesAnswer(pelatihanBPS)) {
    issues.push({ issue: "Tidak bersedia mengikuti pelatihan BPS", severity: "warning" });
  }

  // AP: Pendataan Rumah ke Rumah/Tempat Usaha ≠ "Ya"
  const pelatihanBPS2 = (row[colIdx("AP")] || "").trim();
  if (pelatihanBPS2 && !isYesAnswer(pelatihanBPS2)) {
    issues.push({ issue: "Tidak bersedia melaksanakan pendataan dari rumah ke rumah/tempat usaha sesuai ketentuan", severity: "error" });
  }

  // AQ: Lintas Kecamatan ≠ "Ya"
  const lintasKec = (row[colIdx("AQ")] || "").trim();
  if (lintasKec && !isYesAnswer(lintasKec)) {
    issues.push({ issue: "Tidak bersedia bekerja lintas kecamatan", severity: "error" });
  }

  // AR: Lintas Desa ≠ "Ya"
  const lintasDe = (row[colIdx("AR")] || "").trim();
  if (lintasDe && !isYesAnswer(lintasDe)) {
    issues.push({ issue: "Tidak bersedia bekerja lintas desa", severity: "error" });
  }

  // AS: Deadline ≠ "Ya"
  const deadline = (row[colIdx("AS")] || "").trim();
  if (deadline && !isYesAnswer(deadline)) {
    issues.push({ issue: "Tidak bersedia mengikuti deadline BPS", severity: "error" });
  }

  // AT: Waktu/Tenaga/Pikiran ≠ "Ya"
  const waktuTenaga = (row[colIdx("AT")] || "").trim();
  if (waktuTenaga && !isYesAnswer(waktuTenaga)) {
    issues.push({ issue: "Tidak bersedia mencurahkan waktu/tenaga/pikiran", severity: "error" });
  }

  // AU: Memperbaiki Hasil ≠ "Ya"
  const perbaikiHasil = (row[colIdx("AU")] || "").trim();
  if (perbaikiHasil && !isYesAnswer(perbaikiHasil)) {
    issues.push({ issue: "Tidak bersedia memperbaiki hasil kerja", severity: "error" });
  }

  // AV: Tidak Mengalihkan ≠ "Ya"
  const tidakAlihkan = (row[colIdx("AV")] || "").trim();
  if (tidakAlihkan && !isYesAnswer(tidakAlihkan)) {
    issues.push({ issue: "Tidak bersedia tidak mengalihkan pekerjaan", severity: "error" });
  }

  // BG: Foto Verifikasi - Harus "OK"
  const fotoStatus = (row[colIdx("BG")] || "").toLowerCase().trim();
  if (!fotoStatus || fotoStatus !== "ok") {
    issues.push({ issue: "Foto - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  // BH: KTP Verifikasi - Harus "OK"
  const ktpStatus = (row[colIdx("BH")] || "").toLowerCase().trim();
  if (!ktpStatus || ktpStatus !== "ok") {
    issues.push({ issue: "KTP - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  // BI: Ijazah Verifikasi - Harus "OK"
  const ijazahStatus = (row[colIdx("BI")] || "").toLowerCase().trim();
  if (!ijazahStatus || ijazahStatus !== "ok") {
    issues.push({ issue: "Ijazah - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  // BJ: Screenshot HP Verifikasi - Harus "OK"
  const hpStatus = (row[colIdx("BJ")] || "").toLowerCase().trim();
  if (!hpStatus || hpStatus !== "ok") {
    issues.push({ issue: "Screenshot HP - belum sesuai ketentuan / belum periksa PJ", severity: "warning" });
  }

  return issues;
};

// Helper to find responden by email or sobatId
const findMitraForResponden = (respondenRow: Row, mitraRows: Row[]): Row | null => {
  const respondenEmail = (respondenRow[COL.email] || "").trim().toLowerCase();
  const respondenSobatId = (respondenRow[COL.sobatId] || "").trim().toLowerCase();
  
  if (!respondenEmail && !respondenSobatId) return null;
  
  return mitraRows.find(mitraRow => {
    const mitraEmail = (mitraRow[COL_MITRA.email] || "").trim().toLowerCase();
    const mitraSobatId = (mitraRow[COL_MITRA.sobatId] || "").trim().toLowerCase();
    
    return (respondenEmail && mitraEmail === respondenEmail) || (respondenSobatId && mitraSobatId === respondenSobatId);
  }) || null;
};

type RowWithMetadata = string[] & { __sheetRowNum?: number };

export default function MitraSE2026() {
  const { user } = useAuth();
  
  // Check if user is PPK or Fungsi Neraca
  const isPPK = user?.role === "Pejabat Pembuat Komitmen" || user?.role === "Fungsi Neraca";
  
  // Check if user can edit (PPK or Administrator only)
  const canEdit = user?.role === "Pejabat Pembuat Komitmen" || user?.role === "Administrator";
  
  // Data states
  const [rows, setRows] = useState<RowWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [mitriRows, setMitriRows] = useState<Row[]>([]);
  const [mitriLoading, setMitriLoading] = useState(true);
  const [mitriError, setMitriError] = useState<string | null>(null);

  const [kkRows, setKkRows] = useState<Row[]>([]);
  const [kkLoading, setKkLoading] = useState(true);
  const [kkError, setKkError] = useState<string | null>(null);

  const [kompetensiRows, setKompetensiRows] = useState<Row[]>([]);
  const [kompetensiLoading, setKompetensiLoading] = useState(true);
  const [kompetensiError, setKompetensiError] = useState<string | null>(null);

  // Filter & pagination states for Rekomendasi tab
  const [search, setSearch] = useState("");
  const [filterKec, setFilterKec] = useState<string>("");
  const [filterSobat, setFilterSobat] = useState<string>("*");
  const [sortKey, setSortKey] = useState<keyof typeof COL>("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [validationDetailRow, setValidationDetailRow] = useState<Row | null>(null);
  const [savingCell, setSavingCell] = useState<{ rowIdx: number; col: string } | null>(null);
  const [aksiAdminActiveRows, setAksiAdminActiveRows] = useState<Set<number>>(new Set());
  const [suratVideoDialogText, setSuratVideoDialogText] = useState<string>("");
  const [suratVideoDialogTitle, setSuratVideoDialogTitle] = useState<string>("");

  // Load data from Olah sheet
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: RANGE },
        });
        if (err) throw new Error(err);
        const values: Row[] = data?.values || [];
        // Skip header row, ambil data mulai dari row 1
        const rowsData = values.length > 1 ? values.slice(1).filter(r => r && r.some(c => (c || "").toString().trim() !== "")) : [];
        
        // Tambah original sheet row number untuk setiap row (row 2 di sheet = index 0 di array)
        const rowsWithIndex = rowsData.map((r, idx) => {
          const rowWithMeta = r as RowWithMetadata;
          rowWithMeta.__sheetRowNum = idx + 2; // +2: +1 untuk header, +1 karena sheet 1-indexed
          return rowWithMeta;
        });
        
        // Deduplikasi berdasarkan email (kolom B) - hanya simpan yang pertama
        const seenEmails = new Set<string>();
        const deduplicatedRows = rowsWithIndex.filter(r => {
          const email = (r[COL.email] || "").toString().trim().toLowerCase();
          if (!email) return true; // Jika tidak ada email, tetap include
          if (seenEmails.has(email)) return false; // Skip jika sudah ada email ini
          seenEmails.add(email);
          return true;
        });
        
        setRows(deduplicatedRows);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat data");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Load data from Manajemen Mitra sheet
  useEffect(() => {
    const fetchMitriData = async () => {
      try {
        setMitriLoading(true);
        const { data, error: err } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: "Manajemen Mitra!A1:S" },
        });
        if (err) throw new Error(err);
        const values: Row[] = data?.values || [];
        // Skip header (row 0) dan empty row (row 1), mulai dari row 2
        const mitraData = values.length > 2 ? values.slice(2) : [];
        setMitriRows(mitraData);
        setMitriError(null);
      } catch (e) {
        setMitriError(e instanceof Error ? e.message : "Gagal memuat data Mitra");
        setMitriRows([]);
      } finally {
        setMitriLoading(false);
      }
    };
    fetchMitriData();
  }, []);

  // Load data from Kebutuhan Kecamatan sheet
  useEffect(() => {
    const fetchKkData = async () => {
      try {
        setKkLoading(true);
        const { data, error: err } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: "Kebutuhan Kecamatan!B3:E28" },
        });
        if (err) throw new Error(err);
        const values: Row[] = data?.values || [];
        setKkRows(values);
        setKkError(null);
      } catch (e) {
        setKkError(e instanceof Error ? e.message : "Gagal memuat data Kebutuhan");
        setKkRows([]);
      } finally {
        setKkLoading(false);
      }
    };
    fetchKkData();
  }, []);

  // Load data from Kompetensi sheet
  useEffect(() => {
    const fetchKompetensiData = async () => {
      try {
        setKompetensiLoading(true);
        const { data, error: err } = await supabase.functions.invoke("google-sheets", {
          body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: RANGE_KOMPETENSI },
        });
        if (err) throw new Error(err);
        const values: Row[] = data?.values || [];
        // Skip header row (row 0), mulai dari row 1
        const kompetensiData = values.length > 1 ? values.slice(1) : [];
        setKompetensiRows(kompetensiData);
        setKompetensiError(null);
      } catch (e) {
        setKompetensiError(e instanceof Error ? e.message : "Gagal memuat data Kompetensi");
        setKompetensiRows([]);
      } finally {
        setKompetensiLoading(false);
      }
    };
    fetchKompetensiData();
  }, []);

  // Helper function to get Kebutuhan data for a specific kecamatan
  const getKebutuhanForKec = (kecName: string): { ppl: number; pml: number; jumlah: number } => {
    if (!kecName || filterKec === "") {
      return { ppl: 0, pml: 0, jumlah: 0 };
    }
    
    const kkRow = kkRows.find(r => (r[0] || "").toString().trim().toLowerCase() === kecName.toLowerCase());
    
    if (!kkRow) return { ppl: 0, pml: 0, jumlah: 0 };
    
    return {
      ppl: parseInt((kkRow[1] || "").toString().trim()) || 0,
      pml: parseInt((kkRow[2] || "").toString().trim()) || 0,
      jumlah: parseInt((kkRow[3] || "").toString().trim()) || 0,
    };
  };

  // Helper function to get Kompetensi for a responden based on email
  const getKompetensiForResponden = (respondenRow: Row): string => {
    const respondenEmail = (respondenRow[COL.email] || "").toString().trim().toLowerCase();
    const respondenName = (respondenRow[COL.nama] || "").toString().trim().toLowerCase();
    
    if (!respondenEmail && !respondenName) return "-";
    
    // Try 1: Exact email match
    let kompetensiRow = kompetensiRows.find(row => {
      const rowEmail = (row[COL_KOMPETENSI.email] || "").toString().trim().toLowerCase();
      return rowEmail === respondenEmail && respondenEmail;
    });
    
    // Try 2: Partial email match (before @)
    if (!kompetensiRow && respondenEmail.includes("@")) {
      const emailPrefix = respondenEmail.split("@")[0];
      kompetensiRow = kompetensiRows.find(row => {
        const rowEmail = (row[COL_KOMPETENSI.email] || "").toString().trim().toLowerCase();
        return rowEmail.includes(emailPrefix) && rowEmail.includes("@");
      });
    }
    
    // Try 3: Name-based match as fallback
    if (!kompetensiRow && respondenName) {
      kompetensiRow = kompetensiRows.find(row => {
        const rowName = (row[0] || "").toString().trim().toLowerCase();
        return rowName === respondenName;
      });
    }
    
    if (!kompetensiRow) return "-";
    return (kompetensiRow[COL_KOMPETENSI.kompetensi] || "-").toString().trim();
  };

  // Computed values for Rekomendasi tab
  const kecOptions = useMemo(
    () => Array.from(new Set(rows.map(r => (r[COL.kec] || "").trim()).filter(Boolean))).sort(),
    [rows]
  );

  const sobatOptions = useMemo(
    () => Array.from(new Set(rows.map(r => {
      const status = (r[COL.statusSobat] || "").toString().trim();
      // Exclude "Tidak ditemukan" dan empty values
      return (status && !status.toLowerCase().includes("tidak ditemukan")) ? status : null;
    }).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter(r => {
      // Apply search filter
      const nama = (r[COL.nama] || "").toLowerCase();
      const kec = (r[COL.kec] || "").toLowerCase();
      const searchStr = search.toLowerCase();
      const matchSearch = !search || nama.includes(searchStr) || kec.includes(searchStr);
      
      // Apply kecamatan filter
      const matchKec = filterKec === "all" || (filterKec && kec === filterKec.toLowerCase()) || !filterKec;
      
      // Filter Status SOBAT - exclude "Tidak ditemukan"
      const statusSobat = (r[COL.statusSobat] || "").toString().toLowerCase().trim();
      const isNotTidakDitemukan = !statusSobat.includes("tidak ditemukan");
      
      // Apply Sobat filter
      const matchSobat = filterSobat === "*" || statusSobat === filterSobat.toLowerCase();
      
      // Filter Status Seleksi Admin - exclude "Ditolak"
      const statusSeleksiAdmin = (r[COL.statusSeleksi] || "").toString().trim();
      const isNotDitolak = statusSeleksiAdmin.toLowerCase() !== "ditolak";
      
      return matchSearch && matchKec && isNotTidakDitemukan && matchSobat && isNotDitolak;
    });
  }, [rows, search, filterKec, filterSobat]);

  // Calculate kecamatan-filtered count (without search) for locked display
  const kecamatanFilteredCount = useMemo(() => {
    return rows.filter(r => {
      // Apply kecamatan filter only (no search)
      const kec = (r[COL.kec] || "").toLowerCase();
      const matchKec = filterKec === "all" || (filterKec && kec === filterKec.toLowerCase()) || !filterKec;
      
      // Filter Status SOBAT - exclude "Tidak ditemukan"
      const statusSobat = (r[COL.statusSobat] || "").toString().toLowerCase().trim();
      const isNotTidakDitemukan = !statusSobat.includes("tidak ditemukan");
      
      // Apply Sobat filter
      const matchSobat = filterSobat === "*" || statusSobat === filterSobat.toLowerCase();
      
      // Filter Status Seleksi Admin - exclude "Ditolak"
      const statusSeleksiAdmin = (r[COL.statusSeleksi] || "").toString().trim();
      const isNotDitolak = statusSeleksiAdmin.toLowerCase() !== "ditolak";
      
      return matchKec && isNotTidakDitemukan && matchSobat && isNotDitolak;
    }).length;
  }, [rows, filterKec, filterSobat]);

  const pageRows = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const aVal = ((a[COL[sortKey]] || "") as string).toLowerCase();
      const bVal = ((b[COL[sortKey]] || "") as string).toLowerCase();
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    const totalPages = Math.ceil(sorted.length / pageSize);
    const currentPage = Math.min(page, totalPages);
    return sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, sortKey, sortDir, page, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentPage = Math.min(page, Math.max(1, totalPages));

  // Calculate allocation statistics for the current filter
  const alokasi = useMemo(() => {
    let pplCount = 0;
    let pmlCount = 0;
    let cadanganCount = 0;
    let rutinCount = 0;
    
    filtered.forEach(r => {
      const tipeKegiatan = (r[COL.tipeKegiatan] || "").toString().trim();
      const pplPml = (r[COL.pplPml] || "").toString().trim();
      
      if (tipeKegiatan === "SE2026") {
        if (pplPml === "PPL") pplCount++;
        else if (pplPml === "PML") pmlCount++;
        else if (pplPml === "Cadangan") cadanganCount++;
      } else if (tipeKegiatan === "Rutin") {
        rutinCount++;
      }
    });
    
    return {
      ppl: pplCount,
      pml: pmlCount,
      cadangan: cadanganCount,
      rutin: rutinCount,
      total: pplCount + pmlCount,
    };
  }, [filtered]);

  // Calculate allocation statistics for kecamatan filter only (without search) - locked display
  const alokasiKecamatan = useMemo(() => {
    let pplCount = 0;
    let pmlCount = 0;
    let cadanganCount = 0;
    let rutinCount = 0;
    
    rows.filter(r => {
      // Apply kecamatan filter only (no search)
      const kec = (r[COL.kec] || "").toLowerCase();
      const matchKec = filterKec === "all" || (filterKec && kec === filterKec.toLowerCase()) || !filterKec;
      
      // Filter Status SOBAT - exclude "Tidak ditemukan"
      const statusSobat = (r[COL.statusSobat] || "").toString().toLowerCase().trim();
      const isNotTidakDitemukan = !statusSobat.includes("tidak ditemukan");
      
      // Apply Sobat filter
      const matchSobat = filterSobat === "*" || statusSobat === filterSobat.toLowerCase();
      
      // Filter Status Seleksi Admin - exclude "Ditolak"
      const statusSeleksiAdmin = (r[COL.statusSeleksi] || "").toString().trim();
      const isNotDitolak = statusSeleksiAdmin.toLowerCase() !== "ditolak";
      
      return matchKec && isNotTidakDitemukan && matchSobat && isNotDitolak;
    }).forEach(r => {
      const tipeKegiatan = (r[COL.tipeKegiatan] || "").toString().trim();
      const pplPml = (r[COL.pplPml] || "").toString().trim();
      
      if (tipeKegiatan === "SE2026") {
        if (pplPml === "PPL") pplCount++;
        else if (pplPml === "PML") pmlCount++;
        else if (pplPml === "Cadangan") cadanganCount++;
      } else if (tipeKegiatan === "Rutin") {
        rutinCount++;
      }
    });
    
    return {
      ppl: pplCount,
      pml: pmlCount,
      cadangan: cadanganCount,
      rutin: rutinCount,
      total: pplCount + pmlCount,
    };
  }, [rows, filterKec, filterSobat]);

  // Set default filterKec untuk non-PPK ke kecamatan pertama
  useEffect(() => {
    if (!isPPK && kecOptions.length > 0) {
      // Untuk non-PPK, set ke kecamatan pertama
      if (!filterKec || filterKec === "all") {
        setFilterKec(kecOptions[0]);
      }
    }
  }, [isPPK, kecOptions]);

  useEffect(() => { setPage(1); }, [search, filterKec, filterSobat, pageSize]);

  // Update cell value ke sheet Olah
  const updateCellValue = async (rowIdx: number, colLetter: string, newValue: string) => {
    try {
      setSavingCell({ rowIdx, col: colLetter });
      const respondenRow = rows[rowIdx];
      const sheetRow = respondenRow?.__sheetRowNum || (rowIdx + 2); // Gunakan stored sheet row, fallback ke formula
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "batch-update",
          updates: [{
            range: `${SHEET_NAME}!${colLetter}${sheetRow}`,
            values: [[newValue]],
          }],
        },
      });
      if (error) throw error;
      
      // Update local state
      const updatedRows = [...rows];
      updatedRows[rowIdx][colIdx(colLetter)] = newValue;
      setRows(updatedRows);
    } catch (e) {
      console.error("Error saving:", e);
      alert("Gagal menyimpan data");
    } finally {
      setSavingCell(null);
    }
  };

  useEffect(() => { setPage(1); }, [search, filterKec, filterSobat, pageSize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-8">
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.7; }
        }
        .animate-blink {
          animation: blink 0.8s infinite;
        }
      `}</style>
      <div className="w-full mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
            Mitra SE2026
          </h1>
          <p className="text-slate-600">Manajemen data Sensus Ekonomi 2026</p>
        </header>

        <Tabs defaultValue="rekomendasi" className="w-full">
          <TabsList className="w-full max-w-full mx-auto gap-1 mb-4 overflow-x-auto flex flex-wrap justify-center">
            <TabsTrigger value="rekomendasi" className="text-xs md:text-sm bg-purple-50 hover:bg-purple-100">
              Rekomendasi
            </TabsTrigger>
            <TabsTrigger value="alokasi" className="text-xs md:text-sm bg-orange-50 hover:bg-orange-100">
              Pelatihan SE26
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rekomendasi" className="space-y-4 mt-6">
            <Card className="border-t-4 border-t-purple-500">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Rekomendasi Sensus Ekonomi
                </CardTitle>
                <CardDescription>
                  Data responden dengan tipe kegiatan (SE2026/Rutin) dan PPL/PML. Sumber data dari Detail Konfirmasi Mitra.
                  {rows.length > 0 && mitriRows.length > 0 && (
                    <div className="mt-2 text-xs text-slate-600">
                      📊 {rows.length} responden | {mitriRows.length} mitra | {kecamatanFilteredCount} dari {filterKec && filterKec !== "" ? "kecamatan" : "total"}{search && kecamatanFilteredCount > filtered.length && ` (${filtered.length} cocok pencarian)`}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, kecamatan..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterKec} onValueChange={setFilterKec}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Kecamatan" /></SelectTrigger>
                    <SelectContent>
                      {isPPK && <SelectItem value="all">Semua Kecamatan</SelectItem>}
                      {kecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterSobat} onValueChange={setFilterSobat}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Cek Sobat" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="*">Semua Status Sobat</SelectItem>
                      {sobatOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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

                {/* Card Kebutuhan Petugas Sensus Ekonomi - Compact Version */}
                {filterKec && filterKec !== "" && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-4">
                      {filterKec === "all" ? (
                        (() => {
                          const totalPpl = kkLoading ? 0 : kkRows.reduce((sum, r) => sum + (parseInt((r[1] || "").toString().trim()) || 0), 0);
                          const totalPml = kkLoading ? 0 : kkRows.reduce((sum, r) => sum + (parseInt((r[2] || "").toString().trim()) || 0), 0);
                          const totalKebutuhan = kkLoading ? 0 : kkRows.reduce((sum, r) => sum + (parseInt((r[3] || "").toString().trim()) || 0), 0);
                          const pplPercent = totalPpl > 0 ? Math.round((alokasiKecamatan.ppl / totalPpl) * 100) : 0;
                          const pmlPercent = totalPml > 0 ? Math.round((alokasiKecamatan.pml / totalPml) * 100) : 0;
                          const totalPercent = totalKebutuhan > 0 ? Math.round((alokasiKecamatan.total / totalKebutuhan) * 100) : 0;
                          const cadanganTarget = Math.round(totalKebutuhan * 0.1);
                          const cadanganPercent = cadanganTarget > 0 ? Math.round((alokasiKecamatan.cadangan / cadanganTarget) * 100) : 0;
                          
                          const getWarningText = (percent: number, current: number, target: number) => {
                            if (percent > 100) {
                              const excess = current - target;
                              return ` Lebih ${excess} (${percent - 100}%)`;
                            }
                            return "";
                          };
                          
                          const ProgressBar = ({ percent }: { percent: number }) => {
                            if (percent <= 100) {
                              return <div className="h-full bg-green-600" style={{width: `${percent}%`}}></div>;
                            }
                            const filledWidth = 100;
                            const excessWidth = percent - 100;
                            const filledPercent = (filledWidth / percent) * 100;
                            const excessPercent = (excessWidth / percent) * 100;
                            return (
                              <>
                                <div className="h-full bg-green-600" style={{width: `${filledPercent}%`}}></div>
                                <div className="h-full bg-red-600" style={{width: `${excessPercent}%`}}></div>
                              </>
                            );
                          };
                          
                          return (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-slate-600 mb-3">📍 SEMUA KECAMATAN</p>
                              {/* PPL Row */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-blue-700">PPL</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-blue-600">{alokasiKecamatan.ppl}/{totalPpl} <span className="text-xs font-normal text-blue-500">({pplPercent}%)</span>{getWarningText(pplPercent, alokasiKecamatan.ppl, totalPpl)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  <ProgressBar percent={pplPercent} />
                                </div>
                              </div>
                              
                              {/* PML Row */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-indigo-700">PML</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-indigo-600">{alokasiKecamatan.pml}/{totalPml} <span className="text-xs font-normal text-indigo-500">({pmlPercent}%)</span>{getWarningText(pmlPercent, alokasiKecamatan.pml, totalPml)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  <ProgressBar percent={pmlPercent} />
                                </div>
                              </div>
                              
                              {/* TOTAL Row */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-purple-700">TOTAL</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-purple-600">{alokasiKecamatan.total}/{totalKebutuhan} <span className="text-xs font-normal text-purple-500">({totalPercent}%)</span>{getWarningText(totalPercent, alokasiKecamatan.total, totalKebutuhan)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  <ProgressBar percent={totalPercent} />
                                </div>
                              </div>
                              
                              {/* CADANGAN Row */}
                              <div className="space-y-1 pt-2 border-t border-slate-300">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-amber-700">Cadangan (10%)</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-amber-600">{alokasiKecamatan.cadangan}/{cadanganTarget} <span className="text-xs font-normal text-amber-500">({cadanganPercent}%)</span>{getWarningText(cadanganPercent, alokasiKecamatan.cadangan, cadanganTarget)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  <ProgressBar percent={cadanganPercent} />
                                </div>
                              </div>
                              
                              {/* Mitra Rutin Row */}
                              <div className="space-y-1 pt-2 border-t border-slate-300">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-emerald-700">Mitra Rutin</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-600">{alokasiKecamatan.rutin}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const kebutuhan = getKebutuhanForKec(filterKec);
                          const pplPercent = kebutuhan.ppl > 0 ? Math.round((alokasiKecamatan.ppl / kebutuhan.ppl) * 100) : 0;
                          const pmlPercent = kebutuhan.pml > 0 ? Math.round((alokasiKecamatan.pml / kebutuhan.pml) * 100) : 0;
                          const totalPercent = kebutuhan.jumlah > 0 ? Math.round((alokasiKecamatan.total / kebutuhan.jumlah) * 100) : 0;
                          const cadanganTarget = Math.round(kebutuhan.jumlah * 0.1);
                          const cadanganPercent = cadanganTarget > 0 ? Math.round((alokasiKecamatan.cadangan / cadanganTarget) * 100) : 0;
                          
                          const getWarningText = (percent: number, current: number, target: number) => {
                            if (percent > 100) {
                              const excess = current - target;
                              return ` Lebih ${excess} (${percent - 100}%)`;
                            }
                            return "";
                          };
                          
                          const ProgressBar = ({ percent }: { percent: number }) => {
                            if (percent <= 100) {
                              return <div className="h-full bg-green-600" style={{width: `${percent}%`}}></div>;
                            }
                            const filledWidth = 100;
                            const excessWidth = percent - 100;
                            const filledPercent = (filledWidth / percent) * 100;
                            const excessPercent = (excessWidth / percent) * 100;
                            return (
                              <>
                                <div className="h-full bg-green-600" style={{width: `${filledPercent}%`}}></div>
                                <div className="h-full bg-red-600" style={{width: `${excessPercent}%`}}></div>
                              </>
                            );
                          };
                          
                          return (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-slate-600 mb-3">📍 {filterKec}</p>
                              {/* PPL Row */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-blue-700">PPL</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-blue-600">{kkLoading ? "..." : `${alokasiKecamatan.ppl}/${kebutuhan.ppl}`} <span className="text-xs font-normal text-blue-500">({kkLoading ? "..." : `${pplPercent}%`})</span>{kkLoading ? "" : getWarningText(pplPercent, alokasiKecamatan.ppl, kebutuhan.ppl)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  {kkLoading ? <div className="h-full bg-green-600" style={{width: "0%"}}></div> : <ProgressBar percent={pplPercent} />}
                                </div>
                              </div>
                              
                              {/* PML Row */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-indigo-700">PML</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-indigo-600">{kkLoading ? "..." : `${alokasiKecamatan.pml}/${kebutuhan.pml}`} <span className="text-xs font-normal text-indigo-500">({kkLoading ? "..." : `${pmlPercent}%`})</span>{kkLoading ? "" : getWarningText(pmlPercent, alokasiKecamatan.pml, kebutuhan.pml)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  {kkLoading ? <div className="h-full bg-green-600" style={{width: "0%"}}></div> : <ProgressBar percent={pmlPercent} />}
                                </div>
                              </div>
                              
                              {/* TOTAL Row */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-purple-700">TOTAL</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-purple-600">{kkLoading ? "..." : `${alokasiKecamatan.total}/${kebutuhan.jumlah}`} <span className="text-xs font-normal text-purple-500">({kkLoading ? "..." : `${totalPercent}%`})</span>{kkLoading ? "" : getWarningText(totalPercent, alokasiKecamatan.total, kebutuhan.jumlah)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  {kkLoading ? <div className="h-full bg-green-600" style={{width: "0%"}}></div> : <ProgressBar percent={totalPercent} />}
                                </div>
                              </div>
                              
                              {/* CADANGAN Row */}
                              <div className="space-y-1 pt-2 border-t border-slate-300">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-amber-700">Cadangan (10%)</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-amber-600">{kkLoading ? "..." : `${alokasiKecamatan.cadangan}/${cadanganTarget}`} <span className="text-xs font-normal text-amber-500">({kkLoading ? "..." : `${cadanganPercent}%`})</span>{kkLoading ? "" : getWarningText(cadanganPercent, alokasiKecamatan.cadangan, cadanganTarget)}</p>
                                  </div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  {kkLoading ? <div className="h-full bg-green-600" style={{width: "0%"}}></div> : <ProgressBar percent={cadanganPercent} />}
                                </div>
                              </div>
                              
                              {/* Mitra Rutin Row */}
                              <div className="space-y-1 pt-2 border-t border-slate-300">
                                <div className="flex justify-between items-center">
                                  <p className="text-xs font-semibold text-emerald-700">Mitra Rutin</p>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-600">{kkLoading ? "..." : alokasiKecamatan.rutin}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </CardContent>
                  </Card>
                )}

                {loading || mitriLoading || kompetensiLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {loading ? "Memuat data responden..." : ""}{(mitriLoading || kompetensiLoading) && loading && " & "}
                        {mitriLoading ? "Memuat data mitra..." : ""}{kompetensiLoading && mitriLoading && " & "}
                        {kompetensiLoading ? "Memuat data kompetensi..." : ""}
                      </p>
                    </div>
                  </div>
                ) : error || mitriError || kompetensiError ? (
                  <div className="py-10 text-center">
                    {error && <div className="text-red-600 mb-2">{error}</div>}
                    {mitriError && <div className="text-red-600 mb-2">{mitriError}</div>}
                    {kompetensiError && <div className="text-red-600 mb-2">{kompetensiError}</div>}
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-purple-50/60">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => setSortKey("nama")}>
                              <div className="flex items-center gap-1">Nama Lengkap <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer" onClick={() => setSortKey("kec")}>
                              <div className="flex items-center gap-1">Kecamatan <ArrowUpDown className="h-3 w-3" /></div>
                            </TableHead>
                            <TableHead>Desa</TableHead>
                            <TableHead>Status SOBAT</TableHead>
                            <TableHead>Skor</TableHead>
                            <TableHead className="text-center">Kompetensi</TableHead>
                            <TableHead className="text-center">Catatan Kecap Maja</TableHead>
                            <TableHead className="text-center">Surat & Video</TableHead>
                            <TableHead className="text-center">Aksi</TableHead>
                            <TableHead className="text-center">Aksi Admin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pageRows.length === 0 ? (
                            <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                          ) : pageRows.map((respondenRow, i) => {
                            const mitraRow = findMitraForResponden(respondenRow, mitriRows);
                            return (
                            <TableRow key={i} className="hover:bg-purple-50/50">
                              <TableCell className="text-muted-foreground">{(currentPage - 1) * pageSize + i + 1}</TableCell>
                              <TableCell className="font-medium">{respondenRow[COL.nama] || "-"}</TableCell>
                              <TableCell>{respondenRow[COL.kec] || "-"}</TableCell>
                              <TableCell>{respondenRow[COL.desa] || "-"}</TableCell>
                              <TableCell className="text-sm">{respondenRow[COL.statusSobat] || "-"}</TableCell>
                              {(() => {
                                const statusSobat = (respondenRow[COL.statusSobat] || "").toString().toLowerCase().trim();
                                const isMitraKepkaOrDobel = statusSobat.includes("mitra kepka 2026") || statusSobat === "dobel";
                                const shouldBeRed = (respondenRow[COL.skor] && parseFloat(respondenRow[COL.skor]) < 60) || 
                                                   (!respondenRow[COL.skor] && !isMitraKepkaOrDobel);
                                return (
                                  <TableCell className={`text-sm text-center font-semibold px-3 py-2 rounded ${
                                    shouldBeRed ? "bg-red-600 text-white" : ""
                                  }`}>
                                    {respondenRow[COL.skor] ? parseFloat(respondenRow[COL.skor]).toFixed(2) : "-"}
                                  </TableCell>
                                );
                              })()}
                              <TableCell className="text-center">
                                {(() => {
                                  const statusKompetensi = (respondenRow[COL.statusSeleksiKompetensi] || "").toString().trim().toLowerCase();
                                  let badgeClass = "bg-gray-100 text-gray-800";
                                  if (statusKompetensi === "diterima") {
                                    badgeClass = "bg-green-700 text-white font-bold";
                                  } else if (statusKompetensi === "ditolak") {
                                    badgeClass = "bg-red-700 text-white font-bold";
                                  }
                                  return (
                                    <Badge className={badgeClass}>
                                      {respondenRow[COL.statusSeleksiKompetensi] || "-"}
                                    </Badge>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="text-center">
                                {(() => {
                                  const validationIssues = validateResponden(respondenRow);
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
                                      className="cursor-pointer hover:opacity-75 transition-opacity inline-flex items-center gap-2"
                                      onClick={() => setValidationDetailRow(respondenRow)}
                                      type="button"
                                      title={hasDisplayableIssues ? "Klik untuk lihat catatan" : "Tidak ada catatan"}
                                    >
                                      <AlertTriangle className={hasDisplayableIssues ? "h-5 w-5 text-amber-600" : "h-5 w-5 text-slate-300"} />
                                    </button>
                                  );
                                })()}
                              </TableCell>
                              
                              {/* Surat & Video - Links/Text from BV, BW, BX */}
                              <TableCell className="text-center">
                                {(() => {
                                  const isLink = (url: string): boolean => {
                                    try {
                                      new URL(url);
                                      return true;
                                    } catch {
                                      return false;
                                    }
                                  };

                                  const renderSuratVideoIcon = (value: string) => {
                                    const trimmedValue = (value || "").toString().trim();
                                    
                                    if (!trimmedValue) {
                                      return (
                                        <div title="Kosong">
                                          <Eye className="h-4 w-4 text-slate-300 cursor-not-allowed" />
                                        </div>
                                      );
                                    }

                                    if (isLink(trimmedValue)) {
                                      return (
                                        <button
                                          onClick={() => window.open(trimmedValue, "_blank")}
                                          className="p-1 rounded hover:bg-blue-100 transition-colors"
                                          title="Buka link"
                                        >
                                          <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800 cursor-pointer" />
                                        </button>
                                      );
                                    } else {
                                      // Text content, open dialog on click
                                      const nama = (respondenRow[COL.nama] || "").toString().trim();
                                      return (
                                        <button
                                          onClick={() => {
                                            setSuratVideoDialogTitle(nama);
                                            setSuratVideoDialogText(trimmedValue);
                                          }}
                                          className="p-1 rounded hover:bg-amber-100 transition-colors"
                                          title="Klik untuk lihat detail"
                                        >
                                          <Eye className="h-4 w-4 text-amber-600 hover:text-amber-800 cursor-pointer" />
                                        </button>
                                      );
                                    }
                                  };

                                  // Check if all Surat & Video icons are empty
                                  const allEmpty = !respondenRow[COL.suratVideo1]?.toString().trim() &&
                                                 !respondenRow[COL.suratVideo2]?.toString().trim() &&
                                                 !respondenRow[COL.suratVideo3]?.toString().trim();

                                  return (
                                    <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded ${
                                      allEmpty ? "bg-red-600" : ""
                                    }`}>
                                      {renderSuratVideoIcon(respondenRow[COL.suratVideo1] || "")}
                                      {renderSuratVideoIcon(respondenRow[COL.suratVideo2] || "")}
                                      {renderSuratVideoIcon(respondenRow[COL.suratVideo3] || "")}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {(() => {
                                    const origIdx = rows.indexOf(respondenRow);
                                    const statusSobat = (respondenRow[COL.statusSobat] || "").toString().trim();
                                    const statusAkhir = (respondenRow[COL.statusAkhir] || "").toString().trim();
                                    const tipeKegiatan = (respondenRow[COL.tipeKegiatan] || "").toString().trim();
                                    const pplPml = (respondenRow[COL.pplPml] || "").toString().trim();
                                    const isSavingTipe = savingCell?.rowIdx === origIdx && savingCell?.col === "BN";
                                    const isSavingPpl = savingCell?.rowIdx === origIdx && savingCell?.col === "BO";
                                    const isSavingAkhir = savingCell?.rowIdx === origIdx && savingCell?.col === "BT";
                                    const isMitraTambahan = statusSobat === "Mitra Tambahan";
                                    const isDiterimA = statusAkhir === "Diterima";
                                    
                                    return (
                                      <>
                                        {/* MITRA TAMBAHAN: Ceklis dan X Icons */}
                                        {isMitraTambahan && (
                                          <>
                                            {/* Ceklis: Diterima */}
                                            <button
                                              className={`p-1.5 rounded transition-colors ${
                                                isDiterimA
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                              }`}
                                              onClick={async () => {
                                                if (isDiterimA) {
                                                  // Unchecked: Clear BT, BN, and BO
                                                  await updateCellValue(origIdx, "BT", "");
                                                  await updateCellValue(origIdx, "BN", "");
                                                  await updateCellValue(origIdx, "BO", "");
                                                } else {
                                                  // Checked: Set BT to Diterima
                                                  await updateCellValue(origIdx, "BT", "Diterima");
                                                }
                                              }}
                                              title="Diterima"
                                              disabled={isSavingAkhir || !canEdit}
                                            >
                                              <CheckCircle2 className="h-4 w-4" />
                                            </button>
                                            
                                            {/* X: Ditolak */}
                                            <button
                                              className={`p-1.5 rounded transition-colors ${
                                                statusAkhir === "Ditolak"
                                                  ? "bg-red-100 text-red-700"
                                                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                              }`}
                                              onClick={async () => {
                                                if (statusAkhir === "Ditolak") {
                                                  await updateCellValue(origIdx, "BT", "");
                                                } else {
                                                  await updateCellValue(origIdx, "BT", "Ditolak");
                                                  // Clear BN and BO when Ditolak is set
                                                  await updateCellValue(origIdx, "BN", "");
                                                  await updateCellValue(origIdx, "BO", "");
                                                }
                                              }}
                                              title="Ditolak"
                                              disabled={isSavingAkhir || !canEdit}
                                            >
                                              <XCircle className="h-4 w-4" />
                                            </button>
                                          </>
                                        )}
                                        
                                        {/* Tipe Kegiatan Dropdown */}
                                        <Select 
                                          value={tipeKegiatan || "-"} 
                                          onValueChange={async (value) => {
                                            const finalValue = value === "-" ? "" : value;
                                            if (finalValue === "Rutin") {
                                              // Select Rutin & clear BO
                                              await updateCellValue(origIdx, "BN", finalValue);
                                              await updateCellValue(origIdx, "BO", "");
                                            } else if (finalValue === "") {
                                              // Empty/Belum ditentukan - clear both BN and BO
                                              await updateCellValue(origIdx, "BN", finalValue);
                                              await updateCellValue(origIdx, "BO", "");
                                            } else {
                                              // SE2026 - keep BO as is
                                              await updateCellValue(origIdx, "BN", finalValue);
                                            }
                                          }}
                                          disabled={(isMitraTambahan && !isDiterimA) || isSavingTipe || !canEdit}
                                        >
                                          <SelectTrigger className={`h-8 w-24 text-xs ${
                                            (isMitraTambahan && !isDiterimA) ? "opacity-50 cursor-not-allowed" : ""
                                          }`}>
                                            <SelectValue placeholder="Tipe" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="-">Belum ditentukan</SelectItem>
                                            <SelectItem value="SE2026">SE2026</SelectItem>
                                            <SelectItem value="Rutin">Rutin</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        {/* Jabatan Dropdown - hanya tampil jika SE2026 dipilih */}
                                        {tipeKegiatan === "SE2026" && (
                                          <Select 
                                            value={pplPml || "-"} 
                                            onValueChange={(value) => updateCellValue(origIdx, "BO", value === "-" ? "" : value)}
                                            disabled={(isMitraTambahan && !isDiterimA) || isSavingPpl || !canEdit}
                                          >
                                            <SelectTrigger className={`h-8 w-32 text-xs ${
                                              (isMitraTambahan && !isDiterimA) ? "opacity-50 cursor-not-allowed" : ""
                                            }`}>
                                              <SelectValue placeholder="Jabatan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="-">Belum ditentukan</SelectItem>
                                              <SelectItem value="PPL">PPL</SelectItem>
                                              <SelectItem value="PML">PML</SelectItem>
                                              <SelectItem value="Cadangan">Cadangan</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}

                                        <Button size="icon" variant="ghost" onClick={() => setDetailRow(respondenRow)} title="Lihat detail" className="hover:bg-purple-100">
                                          <Eye className="h-4 w-4 text-purple-600" />
                                        </Button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </TableCell>
                              
                              {/* Aksi Admin - Checkbox + Dropdown */}
                              <TableCell className="text-center">
                                {(() => {
                                  const origIdx = rows.indexOf(respondenRow);
                                  const aksiAdminValue = (respondenRow[COL.aksiAdmin] || "").toString().trim();
                                  const isAdmin = user?.role === "Pejabat Pembuat Komitmen" || user?.role === "Administrator";
                                  const isSavingAdmin = savingCell?.rowIdx === origIdx && savingCell?.col === "BU";
                                  const isChecked = aksiAdminValue !== "";
                                  const isActive = aksiAdminActiveRows.has(origIdx);
                                  const shouldShowDropdown = isActive || isChecked;
                                  
                                  // Read-only display
                                  if (!isAdmin) {
                                    if (isChecked) {
                                      // Get color based on value
                                      const getAksiAdminColor = (value: string): string => {
                                        switch (value) {
                                          case "PPL SE26":
                                            return "bg-blue-100 text-blue-800";
                                          case "PML SE26":
                                            return "bg-purple-100 text-purple-800";
                                          case "Cadangan SE26":
                                            return "bg-amber-100 text-amber-800";
                                          case "Rutin":
                                            return "bg-emerald-100 text-emerald-800";
                                          default:
                                            return "bg-slate-100 text-slate-800";
                                        }
                                      };
                                      return (
                                        <Badge className={`${getAksiAdminColor(aksiAdminValue)} text-xs`}>
                                          {aksiAdminValue}
                                        </Badge>
                                      );
                                    } else {
                                      return <span className="text-slate-400 text-sm">Belum</span>;
                                    }
                                  }
                                  
                                  // Admin interactive mode
                                  const getAksiAdminColorAdmin = (value: string): { button: string; icon: string } => {
                                    switch (value) {
                                      case "PPL SE26":
                                        return { button: "bg-blue-100 text-blue-600 hover:bg-blue-200", icon: "text-blue-600" };
                                      case "PML SE26":
                                        return { button: "bg-purple-100 text-purple-600 hover:bg-purple-200", icon: "text-purple-600" };
                                      case "Cadangan SE26":
                                        return { button: "bg-amber-100 text-amber-600 hover:bg-amber-200", icon: "text-amber-600" };
                                      case "Rutin":
                                        return { button: "bg-emerald-100 text-emerald-600 hover:bg-emerald-200", icon: "text-emerald-600" };
                                      default:
                                        return { button: "bg-slate-100 text-slate-400 hover:bg-slate-200", icon: "text-slate-400" };
                                    }
                                  };
                                  
                                  return (
                                    <div className="flex items-center gap-2">
                                      {/* Checkbox */}
                                      <button
                                        onClick={() => {
                                          if (isChecked) {
                                            // Checked -> uncheck and clear BU
                                            updateCellValue(origIdx, "BU", "");
                                            // Disable dropdown
                                            setAksiAdminActiveRows(prev => {
                                              const next = new Set(prev);
                                              next.delete(origIdx);
                                              return next;
                                            });
                                          } else {
                                            // Unchecked -> enable dropdown for user to select
                                            setAksiAdminActiveRows(prev => new Set([...prev, origIdx]));
                                          }
                                        }}
                                        disabled={isSavingAdmin}
                                        className={`p-1 rounded transition-colors ${
                                          isChecked
                                            ? getAksiAdminColorAdmin(aksiAdminValue).button
                                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                        }`}
                                        title={isChecked ? "Klik untuk clear" : "Klik untuk memilih opsi"}
                                      >
                                        {isChecked ? (
                                          <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                          <Circle className="h-4 w-4" />
                                        )}
                                      </button>
                                      
                                      {/* Dropdown - Only show when checked or active */}
                                      {shouldShowDropdown && (
                                        <Select 
                                          value={aksiAdminValue} 
                                          onValueChange={async (val) => {
                                            await updateCellValue(origIdx, "BU", val);
                                            // Keep dropdown open by staying active
                                            setAksiAdminActiveRows(prev => new Set([...prev, origIdx]));
                                          }}
                                        >
                                          <SelectTrigger className="w-36 h-8 text-xs">
                                            <SelectValue placeholder="Pilih opsi" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="PPL SE26">PPL SE26</SelectItem>
                                            <SelectItem value="PML SE26">PML SE26</SelectItem>
                                            <SelectItem value="Cadangan SE26">Cadangan SE26</SelectItem>
                                            <SelectItem value="Rutin">Rutin</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      )}
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

          {/* TAB: PELATIHAN SE26 */}
          <TabsContent value="alokasi" className="space-y-4 mt-6">
            <PelatihanSE26 />
          </TabsContent>
        </Tabs>

        {/* Validation Notes Dialog - Catatan Kecap Maja */}
        <Dialog open={!!validationDetailRow} onOpenChange={(o) => !o && setValidationDetailRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Catatan Kecap Maja - {validationDetailRow ? (validationDetailRow[COL.nama] || "Responden") : ""}
              </DialogTitle>
              <DialogDescription>Hasil validasi data responden</DialogDescription>
            </DialogHeader>
            {validationDetailRow && (() => {
              const issues = validateResponden(validationDetailRow);
              const errors = issues.filter(v => v.severity === "error");
              const warnings = issues.filter(v => v.severity === "warning");
              
              // Filter out document verification warnings untuk dialog saja
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Detail Responden
              </DialogTitle>
              <DialogDescription>
                {detailRow ? (detailRow[COL.nama] || "-") : ""}
              </DialogDescription>
            </DialogHeader>
            {detailRow && (() => {
              return (
              <div className="space-y-6">
                {/* Data Dasar */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Data Dasar</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-purple-50 rounded-lg">
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-purple-700/80 uppercase tracking-wide">Nama Lengkap</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.nama] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-purple-700/80 uppercase tracking-wide">Email</div>
                      <div className="text-sm break-words mt-1 font-mono">{detailRow[COL.email] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-purple-700/80 uppercase tracking-wide">Sobat ID</div>
                      <div className="text-sm break-words mt-1 font-mono">{detailRow[COL.sobatId] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-purple-700/80 uppercase tracking-wide">Kecamatan</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.kec] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-purple-700/80 uppercase tracking-wide">Desa</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.desa] || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Demografi */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Demografi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-cyan-50 rounded-lg">
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-cyan-700/80 uppercase tracking-wide">Tanggal Lahir</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.tanggalLahir] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-cyan-700/80 uppercase tracking-wide">Umur</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.umur] || "-"} tahun</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-cyan-700/80 uppercase tracking-wide">Pendidikan</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.pendidikan] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-cyan-700/80 uppercase tracking-wide">Pekerjaan</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.pekerjaan] || "-"}</div>
                    </div>
                    <div className="border-b pb-2 md:col-span-2">
                      <div className="text-xs font-semibold text-cyan-700/80 uppercase tracking-wide">Kegiatan Sehari-hari</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.kegiatanSehariHari] || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Kegiatan */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Kegiatan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-indigo-50 rounded-lg">
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-indigo-700/80 uppercase tracking-wide">Sensus Ekonomi 2026</div>
                      <div className="text-sm break-words mt-1">
                        <Badge className={`${detailRow[COL.sensusEkonomi]?.toString().toLowerCase().includes("ya") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {detailRow[COL.sensusEkonomi] || "-"}
                        </Badge>
                      </div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-indigo-700/80 uppercase tracking-wide">Kegiatan Rutin 2026</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.kegiatanRutin] || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Kesediaan */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Kesediaan & Persyaratan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-orange-50 rounded-lg text-xs">
                    {[
                      ["Smartphone Android", detailRow[COL.smartphoneAndroid]],
                      ["Prioritas Pekerjaan BPS", detailRow[COL.prioritasKejaanBPS]],
                      ["Bersedia Kontrak Kerja", detailRow[COL.kontrakKerja]],
                      ["Pelatihan BPS", detailRow[COL.pelatihanBPS]],
                      ["Pendataan Rumah ke Rumah/Tempat Usaha", detailRow[COL.pelatihanBPS2]],
                      ["Bekerja Lintas Kecamatan", detailRow[COL.lintasKecamatan]],
                      ["Bekerja Lintas Desa", detailRow[COL.lintasDesa]],
                      ["Mengikuti Deadline", detailRow[COL.deadline]],
                      ["Waktu/Tenaga/Pikiran", detailRow[COL.waktuTenagaPikiran]],
                      ["Memperbaiki Hasil Kerja", detailRow[COL.memperbaikiHasil]],
                    ].map(([label, value], idx) => (
                      <div key={idx} className="border-b pb-2">
                        <div className="font-semibold text-orange-700/80 uppercase tracking-wide">{label}</div>
                        <div className="mt-1">
                          <Badge className={value?.toString().toLowerCase().includes("ya") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {value || "-"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verifikasi Dokumen */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Verifikasi Dokumen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-red-50 rounded-lg text-xs">
                    {[
                      ["Foto", detailRow[COL.fotoVerifikasi]],
                      ["KTP", detailRow[COL.ktpVerifikasi]],
                      ["Ijazah", detailRow[COL.ijazahVerifikasi]],
                      ["Screenshot HP", detailRow[COL.screenshotHPVerifikasi]],
                    ].map(([label, value], idx) => (
                      <div key={idx} className="border-b pb-2">
                        <div className="font-semibold text-red-700/80 uppercase tracking-wide">{label}</div>
                        <div className="mt-1">
                          <Badge className={value?.toString().toLowerCase() === "ok" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                            {value || "Belum"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status & Rekomendasi */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Status & Rekomendasi</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-3 bg-slate-50 rounded-lg">
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-slate-700/80 uppercase tracking-wide">Status SOBAT</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.statusSobat] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-slate-700/80 uppercase tracking-wide">Status Seleksi Admin</div>
                      <div className="text-sm break-words mt-1">{detailRow[COL.statusSeleksi] || "-"}</div>
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-slate-700/80 uppercase tracking-wide">Skor</div>
                      {(() => {
                        const statusSobat = (detailRow[COL.statusSobat] || "").toString().toLowerCase().trim();
                        const isMitraKepkaOrDobel = statusSobat.includes("mitra kepka 2026") || statusSobat === "dobel";
                        const shouldBeRed = (detailRow[COL.skor] && parseFloat(detailRow[COL.skor]) < 60) || 
                                           (!detailRow[COL.skor] && !isMitraKepkaOrDobel);
                        return (
                          <div className={`text-sm break-words mt-1 font-semibold px-3 py-2 rounded ${
                            shouldBeRed ? "bg-red-600 text-white" : ""
                          }`}>
                            {detailRow[COL.skor] ? parseFloat(detailRow[COL.skor]).toFixed(2) : "-"}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="border-b pb-2">
                      <div className="text-xs font-semibold text-slate-700/80 uppercase tracking-wide">Rekomendasi</div>
                      <div className="text-sm break-words mt-1">
                        <Badge className={detailRow[COL.rekomendasi]?.toString().toLowerCase().includes("rekomendasi") ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                          {detailRow[COL.rekomendasi] || "-"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Catatan</h3>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {((detailRow[COL.catatanPJ] || "") as string) || "Tidak ada catatan"}
                    </p>
                  </div>
                </div>
              </div>
            );
            })()}
          </DialogContent>
        </Dialog>

        {/* Surat & Video Text Content Dialog */}
        <Dialog open={!!suratVideoDialogText} onOpenChange={(o) => !o && setSuratVideoDialogText("")}>  
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{suratVideoDialogTitle}</DialogTitle>
              <DialogDescription>Detail Surat & Video</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{suratVideoDialogText}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(suratVideoDialogText);
                    alert("Disalin ke clipboard");
                  }}
                >
                  Salin
                </Button>
                <Button onClick={() => setSuratVideoDialogText("")}>Tutup</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
