/**
 * Types untuk Bahan Revisi Anggaran
 */

export type BudgetItemStatus = 'new' | 'changed' | 'unchanged' | 'deleted';

export interface BudgetItem {
  id: string; // unique identifier/timestamp
  program_pembebanan: string;
  kegiatan: string;
  rincian_output: string;
  komponen_output: string;
  sub_komponen: string;
  akun: string;
  uraian: string; // deskripsi detail item
  volume_semula: number;
  satuan_semula: string;
  harga_satuan_semula: number;
  jumlah_semula: number; // auto: volume_semula * harga_satuan_semula
  volume_menjadi: number;
  satuan_menjadi: string;
  harga_satuan_menjadi: number;
  jumlah_menjadi: number; // auto: volume_menjadi * harga_satuan_menjadi
  selisih: number; // auto: jumlah_menjadi - jumlah_semula
  blokir: number; // jumlah yang diblokir/terkunci (default: 0)
  status: BudgetItemStatus;
  approved_by?: string; // username PPK
  approved_date?: string; // ISO date string
  rejected_date?: string; // ISO date string
  submitted_by: string; // username Fungsi xxx
  submitted_date: string; // ISO date string
  updated_date: string; // ISO date string
  notes?: string; // catatan tambahan
}

export interface RPDItem {
  id: string;
  program_pembebanan: string;
  kegiatan: string;
  komponen_output: string;
  sub_komponen: string;
  akun: string;
  uraian: string;
  total_pagu: number;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
  total_rpd: number; // auto sum: jan to dec
  sisa_anggaran: number; // auto: total_pagu - total_rpd
  status: string;
  modified_by?: string;
  modified_date?: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_date?: string;
}

export interface Kegiatan {
  id: string;
  program_id: string;
  program_code: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_date?: string;
}

export interface RincianOutput {
  id: string;
  kegiatan_id: string;
  kegiatan_code: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_date?: string;
}

export interface KomponenOutput {
  id: string;
  rincian_output_id: string;
  rincian_output_code: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_date?: string;
}

export interface SubKomponen {
  id: string;
  komponen_output_id: string;
  komponen_output_code: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_date?: string;
}

export interface Akun {
  id: string;
  code: string;
  name: string;
  account_group: string;
  account_group_name: string;
  description?: string;
  is_active: boolean;
  created_date?: string;
}

/**
 * Filter dan Summary types
 */
export interface BahanRevisiFilters {
  program_pembebanan?: string;
  kegiatan?: string;
  rincian_output?: string;
  komponen_output?: string;
  sub_komponen?: string;
  akun?: string;
}

export interface BudgetSummary {
  total_semula: number;
  total_menjadi: number;
  total_selisih: number;
  new_items_count: number;
  changed_items_count: number;
  unchanged_items_count: number;
  deleted_items_count: number;
  total_items_count: number;
}

export interface BudgetSummaryByGroup {
  account_group: string;
  account_group_name: string;
  total_semula: number;
  total_menjadi: number;
  total_selisih: number;
  new_items: number;
  changed_items: number;
  unchanged_items: number;
  deleted_items: number;
  total_items: number;
}

export interface RPDSummary {
  total_pagu: number;
  total_rpd: number;
  total_sisa_anggaran: number;
  items_count: number;
}
