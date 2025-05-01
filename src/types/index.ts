export interface JenisDocumentOption {
  value: string;
  label: string;
}

export interface DocumentFormData {
  id?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface Program {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Kegiatan {
  id: string;
  name: string;
  programId: string;
  created_at?: string;
  updated_at?: string;
}

export interface KRO {
  id: string;
  name: string;
  kegiatanId: string;
  created_at?: string;
  updated_at?: string;
}

export interface RO {
  id: string;
  name: string;
  kroId: string;
  created_at?: string;
  updated_at?: string;
}

export interface Komponen {
  id: string;
  name: string;
  roId: string;
  created_at?: string;
  updated_at?: string;
}

export interface Akun {
  id: string;
  name: string;
  code: string;
  created_at?: string;
  updated_at?: string;
}

export interface Jenis {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface MitraStatistik {
  id: string;
  name: string;
  kecamatan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganikBPS {
  id: string;
  name: string;
  nip: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalLinkItem {
  title: string;
  url: string;
  icon: string;
}

export interface PerjalananDinas {
  id?: string;
  jenisPerjalanan: "luar_kota" | "dalam_kota";
  nomorSuratTugas: string;
  tanggalSuratTugas: string;
  namaPelaksana: string;
  tujuanPelaksanaan: string;
  kabKotaTujuan?: string;
  namaTempat?: string;
  kecamatanTujuan?: string[];
  tanggalBerangkat: string | string[];
  tanggalKembali: string | string[];
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  tanggalPengajuan: string;
  biayaTransport?: number;
  biayaBBMTol?: number;
  biayaPenginapan?: number;
}

export interface DokumenPengadaanData {
  id?: string;
  kodeKegiatan: string;
  namaPaket: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  spesifikasiTeknis: string;
  volume: number;
  satuan: "O-H" | "O-P" | "O-K" | "Unit" | "SET";
  hargaSatuanAwal: number;
  hargaSatuanNego: number;
  metodePengadaan: string;
  bentukKontrak: string;
  jenisKontrak: string;
  caraPembayaran: string;
  uangMuka: number;
  nomorFormulirPermintaan: string;
  tanggalFormulirPermintaan: string;
  tanggalKAK: string;
  nomorKertasKerjaHPS: string;
  namaPenyedia: string;
  namaPerwakilanPenyedia: string;
  jabatan: string;
  alamatPenyedia: string;
  namaBank: string;
  nomorRekening: string;
  atasNamaRekening: string;
  npwpPenyedia: string;
  nomorSuratPenawaran: string;
  nomorSuratPermohonan: string;
  nomorInvoice: string;
}

export interface TransportLokalData {
  id?: string;
  namaKegiatan: string;
  detail: string;
  jenis: "Pendataan" | "Pemeriksaan" | "Supervisi";
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  tanggalPengajuan: string;
  pembuatDaftar: string;
  organikBPS: string[];
  mitraStatistik: string[];
  daftarTransport: TransportItem[];
}

export interface TransportItem {
  nama: string;
  jenisPetugas: "Organik BPS" | "Mitra Statistik";
  banyaknya: number;
  kecamatanTujuan: string[];
  rateTranslok: number[];
  jumlah: number;
}

export interface TandaTerimaData {
  id?: string;
  namaKegiatan: string;
  detail: string;
  tanggalPembuatanDaftar: string;
  pembuatDaftar: string;
  organikBPS: string[];
  mitraStatistik: string[];
  daftarItem: TandaTerimaItem[];
}

export interface TandaTerimaItem {
  namaItem: string;
  banyaknya: number;
  satuan: string;
}

export const KECAMATAN_MAJALENGKA = [
  "Argapura", "Banjaran", "Bantarujeg", "Cigasong", "Cikijing", 
  "Cingambul", "Dawuan", "Jatitujuh", "Jatiwangi", "Kadipaten", 
  "Kasokandel", "Kertajati", "Lemahsugih", "Leuwimunding", "Ligung", 
  "Maja", "Majalengka", "Malausma", "Palasah", "Panyingkiran", 
  "Rajagaluh", "Sindang", "Sindangwangi", "Sukahaji", "Sumberjaya", "Talaga"
]

export const METODE_PENGADAAN = [
  "Pengadaan Langsung", "E-Purchasing", "Tender/Lelang", "Seleksi", 
  "Penunjukan Langsung", "Sayembara/Kontes", "Swakelola"
]

export const BENTUK_KONTRAK = [
  "Bukti Pembelian/Pembayaran", "Kuitansi", "Surat Perintah Kerja (SPK)", 
  "Surat Perjanjian", "Surat Pesanan"
]

export const JENIS_KONTRAK = [
  "Kontrak Lump Sum", "Kontrak Harga Satuan", "Kontrak Gabungan Lump Sum dan Harga Satuan", 
  "Kontrak Waktu Penugasan", "Kontrak Turnkey", "Kontrak Payung (Framework Contract)", 
  "Kontrak Pengadaan Tunggal", "Kontrak Multi Years"
]

export const CARA_PEMBAYARAN = [
  "Termin (Bertahap)", "Bulanan", "Sekaligus", "Uang Muka (Down Payment)",
  "Prestasi Kerja (Milestone Payment)", "Waktu Penugasan (Time-Based Payment)"
]
