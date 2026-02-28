export interface TandaTerimaItem {
  namaItem: string;
  banyaknya: number;
  satuan: string;
}

export interface TandaTerimaData {
  namaKegiatan: string;
  detail: string;
  tanggalPembuatanDaftar: string;
  pembuatDaftar: string;
  organikBPS: string[];
  mitraStatistik: string[];
  daftarItem: TandaTerimaItem[];
}
// src/types/index.ts
export interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  tglPenghitunganAkTerakhir: string;
  akKumulatif: number;
  status?: 'Aktif' | 'Pensiun' | 'Mutasi';
  unitKerja: string;
  tmtJabatan: string;
  tmtPangkat: string;
  pendidikan: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan' | 'L' | 'P';
  linkSkJabatan?: string;
  linkSkPangkat?: string;
  telepon?: string;
  no_hp?: string;
}

export interface KonversiData {
  id?: string;
  No?: number;
  NIP: string;
  Nama: string;
  Tahun: number;
  Semester: 1 | 2;
  Predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  'Nilai SKP': number;
  'AK Konversi': number;
  'TMT Mulai': string;
  'TMT Selesai': string;
  Status: 'Draft' | 'Generated';
  Catatan?: string;
  Link_Dokumen?: string;
  Last_Update: string;
  rowIndex?: number;
  Masa_Kerja_Bulan?: number;
  Jenis_Penilaian?: 'PENUFH' | 'PROPORSIONAL';
}

export interface Mitra {
  id?: string;
  nama: string;
  no_hp: string;
  kecamatan: string;
  alamat?: string;
  status?: string;
}