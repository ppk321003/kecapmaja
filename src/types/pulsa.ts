// Types untuk Manajemen Pembelian Pulsa

export type PulsaStatus = 
  | 'draft'
  | 'pending_ppk'
  | 'approved_ppk'
  | 'rejected_ppk'
  | 'completed'
  | 'cancelled';

export interface PulsaItem {
  id: string;
  bulan: number; // 1-12
  tahun: number;
  namaPetugas: string;
  nip?: string;
  kegiatan: string;
  organik: string; // Tim/Fungsi (contoh: Fungsi Sosial, Fungsi Neraca)
  mitra?: string; // Nama Mitra (jika mitra statistik)
  nominal: number; // Dalam rupiah
  status: PulsaStatus;
  catatan?: string;
  approvedBy?: string; // Nama PPK yang approve
  approvedAt?: string; // Tanggal approval
  createdBy: string; // User yang membuat
  createdAt: string;
  updatedAt: string;
}

export interface PulsaBulanan {
  id: string;
  bulan: number;
  tahun: number;
  totalNominal: number;
  jumlahPetugas: number;
  daftarPetugas: string[]; // Array nama petugas
  status: 'planning' | 'in_progress' | 'completed' | 'archived';
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  type: 'duplicate_petugas_kegiatan' | 'petugas_belum_terdaftar' | 'nominal_invalid';
  message: string;
  data?: {
    namaPetugas?: string;
    bulan?: number;
    tahun?: number;
    kegiatan?: string;
    existingKegiatan?: string;
  };
}

// Helper function untuk validasi
export function validatePulsaItem(
  item: Partial<PulsaItem>,
  existingItems: PulsaItem[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validasi nominal
  if (!item.nominal || item.nominal <= 0) {
    errors.push({
      type: 'nominal_invalid',
      message: 'Nominal harus lebih dari 0'
    });
  }

  // Cek duplikasi: petugas + kegiatan di bulan/tahun yang sama
  if (item.namaPetugas && item.bulan && item.tahun) {
    const duplicate = existingItems.find(
      (existing) =>
        existing.namaPetugas === item.namaPetugas &&
        existing.bulan === item.bulan &&
        existing.tahun === item.tahun &&
        existing.kegiatan !== item.kegiatan && // Berbeda kegiatan di bulan sama
        (existing.status === 'approved_ppk' || existing.status === 'completed') // Sudah approved/completed
    );

    if (duplicate) {
      errors.push({
        type: 'duplicate_petugas_kegiatan',
        message: `⚠️ ${item.namaPetugas} sudah mendapat pulsa untuk kegiatan "${duplicate.kegiatan}" di bulan ${item.bulan}/${item.tahun}. Tidak boleh mendapat pulsa dari lebih dari 1 kegiatan dalam 1 bulan!`,
        data: {
          namaPetugas: item.namaPetugas,
          bulan: item.bulan,
          tahun: item.tahun,
          kegiatan: item.kegiatan,
          existingKegiatan: duplicate.kegiatan
        }
      });
    }
  }

  return errors;
}

// Export untuk report
export interface ReportPulsaBulanan {
  bulan: number;
  tahun: number;
  totalNominal: number;
  jumlahPetugas: number;
  jumlahKegiatan: number;
  itemByKegiatan: {
    kegiatan: string;
    nominal: number;
    jumlahPetugas: number;
    daftarPetugas: string[];
  }[];
  itemByOrganik: {
    organik: string;
    nominal: number;
    jumlahPetugas: number;
    daftarPetugas: string[];
  }[];
  alerts: ValidationError[];
}
