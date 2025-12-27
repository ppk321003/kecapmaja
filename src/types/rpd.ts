// types/rpd.ts
export interface RPDItem {
  id: string;           // Row number dari spreadsheet
  kode: string;         // Kolom A (tanpa apostrof)
  uraian: string;       // Kolom B + C
  volume: number;       // Kolom D
  satuan: string;       // Kolom E
  hargaSatuan: number;  // Kolom F
  pagu: number;         // Kolom G
  rpdMonthly: {
    januari: number;
    februari: number;
    maret: number;
    april: number;
    mei: number;
    juni: number;
    juli: number;
    agustus: number;
    september: number;
    oktober: number;
    november: number;
    desember: number;
  };
  totalRPD: number;     // Kolom T
  selisih: number;      // Kolom U
  lastUpdated?: string; // Kolom V
  isActive: boolean;    // Baris aktif (mengandung "-" dan bukan KPPN)
}

export interface FilterState {
  search: string;
  kegiatan: string;
  status: string; // 'all' | 'empty' | 'incomplete' | 'completed'
}

export interface SheetData {
  values: string[][];
}