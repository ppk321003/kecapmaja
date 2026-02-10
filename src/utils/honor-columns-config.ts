/** Column configuration for Honor Download feature */

export interface ColumnConfig {
  key: keyof HonorRowKeys;
  groupId: string;
  label: string;
  enabled: boolean; // Default enabled/disabled state
}

// Type helper for column keys
export type HonorRowKeys = {
  no: boolean;
  namaPenerimaHonor: boolean;
  nik: boolean;
  noKontrakSKST: boolean;
  tglSK: boolean;
  jenisPekerjaan: boolean;
  periode: boolean;
  namaKegiatan: boolean;
  tanggalMulai: boolean;
  tanggalAkhir: boolean;
  waktuKegiatan: boolean;
  satuanBiaya: boolean;
  jumlahWaktu: boolean;
  satuanWaktu: boolean;
  totalBruto: boolean;
  pph: boolean;
  totalNetto: boolean;
  target: boolean;
  realisasi: boolean;
  satuan: boolean;
  komponenPOK: boolean;
  koordinator: boolean;
  bebanAnggaran: boolean;
  output: boolean;
  dikirimKePPK: boolean;
  noSPM: boolean;
  noSP2D: boolean;
};

export const HONOR_COLUMN_GROUPS = {
  IDENTITAS: 'identitas',
  REFERENSI: 'referensi',
  WAKTU: 'waktu',
  FINANSIAL: 'finansial',
  KONFIGURASI: 'konfigurasi',
  STATUS: 'status'
};

export const HONOR_COLUMNS: ColumnConfig[] = [
  // Identitas Penerima (4 kolom)
  { key: 'no', groupId: HONOR_COLUMN_GROUPS.IDENTITAS, label: 'No', enabled: true },
  { key: 'namaPenerimaHonor', groupId: HONOR_COLUMN_GROUPS.IDENTITAS, label: 'Nama Penerima Honor', enabled: true },
  { key: 'nik', groupId: HONOR_COLUMN_GROUPS.IDENTITAS, label: 'NIK', enabled: false },

  // Referensi Kegiatan (4 kolom)
  { key: 'noKontrakSKST', groupId: HONOR_COLUMN_GROUPS.REFERENSI, label: 'No. Kontrak/ST/SK', enabled: true },
  { key: 'tglSK', groupId: HONOR_COLUMN_GROUPS.REFERENSI, label: 'Tgl SK', enabled: false },
  { key: 'jenisPekerjaan', groupId: HONOR_COLUMN_GROUPS.REFERENSI, label: 'Jenis Pekerjaan', enabled: false },
  { key: 'periode', groupId: HONOR_COLUMN_GROUPS.REFERENSI, label: 'Periode', enabled: false },

  // Waktu Kegiatan (4 kolom)
  { key: 'namaKegiatan', groupId: HONOR_COLUMN_GROUPS.WAKTU, label: 'Nama Kegiatan', enabled: true },
  { key: 'tanggalMulai', groupId: HONOR_COLUMN_GROUPS.WAKTU, label: 'Tanggal Mulai', enabled: false },
  { key: 'tanggalAkhir', groupId: HONOR_COLUMN_GROUPS.WAKTU, label: 'Tanggal Akhir', enabled: false },
  { key: 'waktuKegiatan', groupId: HONOR_COLUMN_GROUPS.WAKTU, label: 'Waktu Kegiatan', enabled: true },

  // Finansial (6 kolom)
  { key: 'satuanBiaya', groupId: HONOR_COLUMN_GROUPS.FINANSIAL, label: 'Satuan Biaya (Rp)', enabled: true },
  { key: 'jumlahWaktu', groupId: HONOR_COLUMN_GROUPS.FINANSIAL, label: 'Jumlah Waktu', enabled: true },
  { key: 'satuanWaktu', groupId: HONOR_COLUMN_GROUPS.FINANSIAL, label: 'Satuan Waktu', enabled: true },
  { key: 'totalBruto', groupId: HONOR_COLUMN_GROUPS.FINANSIAL, label: 'Total Bruto (Rp)', enabled: true },
  { key: 'pph', groupId: HONOR_COLUMN_GROUPS.FINANSIAL, label: 'PPH (Jika ada)', enabled: true },
  { key: 'totalNetto', groupId: HONOR_COLUMN_GROUPS.FINANSIAL, label: 'Total Netto (Rp)', enabled: true },

  // Konfigurasi (6 kolom)
  { key: 'target', groupId: HONOR_COLUMN_GROUPS.KONFIGURASI, label: 'Target', enabled: false },
  { key: 'realisasi', groupId: HONOR_COLUMN_GROUPS.KONFIGURASI, label: 'Realisasi', enabled: false },
  { key: 'satuan', groupId: HONOR_COLUMN_GROUPS.KONFIGURASI, label: 'Satuan', enabled: false },
  { key: 'komponenPOK', groupId: HONOR_COLUMN_GROUPS.KONFIGURASI, label: 'Komponen POK', enabled: false },
  { key: 'koordinator', groupId: HONOR_COLUMN_GROUPS.KONFIGURASI, label: 'Koordinator', enabled: false },
  { key: 'bebanAnggaran', groupId: HONOR_COLUMN_GROUPS.KONFIGURASI, label: 'Beban Anggaran', enabled: false },

  // Status & Output (4 kolom)
  { key: 'output', groupId: HONOR_COLUMN_GROUPS.STATUS, label: 'Output', enabled: true },
  { key: 'dikirimKePPK', groupId: HONOR_COLUMN_GROUPS.STATUS, label: 'Dikirim ke PPK', enabled: false },
  { key: 'noSPM', groupId: HONOR_COLUMN_GROUPS.STATUS, label: 'No SPM', enabled: false },
  { key: 'noSP2D', groupId: HONOR_COLUMN_GROUPS.STATUS, label: 'No SP2D', enabled: false }
];

export const HONOR_COLUMN_GROUP_LABELS: Record<string, string> = {
  [HONOR_COLUMN_GROUPS.IDENTITAS]: 'Identitas Penerima',
  [HONOR_COLUMN_GROUPS.REFERENSI]: 'Referensi Kegiatan',
  [HONOR_COLUMN_GROUPS.WAKTU]: 'Waktu Kegiatan',
  [HONOR_COLUMN_GROUPS.FINANSIAL]: 'Finansial',
  [HONOR_COLUMN_GROUPS.KONFIGURASI]: 'Konfigurasi',
  [HONOR_COLUMN_GROUPS.STATUS]: 'Status & Output'
};

/**
 * Get columns grouped by category
 */
export const getColumnsByGroup = (groupId: string): ColumnConfig[] => {
  return HONOR_COLUMNS.filter(col => col.groupId === groupId);
};

/**
 * Get all unique group IDs
 */
export const getAllGroupIds = (): string[] => {
  return Object.values(HONOR_COLUMN_GROUPS);
};

/**
 * Parse column config to get header row
 */
export const getHeaderRow = (enabledColumns: ColumnConfig[]): string[] => {
  const columnKeyMap: Record<string, string> = {
    no: 'No',
    namaPenerimaHonor: 'Nama Penerima Honor',
    nik: 'NIK',
    noKontrakSKST: 'No. Kontrak/ST/SK',
    tglSK: 'Tgl SK',
    jenisPekerjaan: 'Jenis Pekerjaan',
    periode: 'Periode',
    namaKegiatan: 'Nama Kegiatan',
    tanggalMulai: 'Tanggal Mulai',
    tanggalAkhir: 'Tanggal Akhir',
    waktuKegiatan: 'Waktu Kegiatan',
    satuanBiaya: 'Satuan Biaya',
    jumlahWaktu: 'Jumlah Waktu',
    satuanWaktu: 'Satuan Waktu',
    totalBruto: 'Total Bruto',
    pph: 'PPH (Jika ada)',
    totalNetto: 'Total Netto',
    target: 'Target',
    realisasi: 'Realisasi',
    satuan: 'Satuan',
    komponenPOK: 'Komponen POK',
    koordinator: 'Koordinator',
    bebanAnggaran: 'Beban Anggaran',
    output: 'Output',
    dikirimKePPK: 'Dikirim ke PPK',
    noSPM: 'No SPM',
    noSP2D: 'No SP2D'
  };

  return enabledColumns.map(col => columnKeyMap[col.key] || col.label);
};

/**
 * Extract row data based on enabled columns
 */
export const extractRowData = (row: any, enabledColumns: ColumnConfig[]): any[] => {
  return enabledColumns.map(col => row[col.key] ?? '');
};
