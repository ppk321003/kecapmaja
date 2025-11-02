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
