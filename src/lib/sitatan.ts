export const SITATAN_SPREADSHEET_ID = '1IvL9Dq6ITKUYMb6r1l6zkZYoaR4F1a0rKEe-0HtaCo0';

export const SITATAN_HEADERS = [
  'id_surat',
  'tahun',
  'jenis_surat',
  'nomor_urut',
  'nomor_surat',
  'tanggal_surat',
  'isi_surat',
  'surat_sisip',
  'kode_arsip',
  'subkode_arsip',
  'sifat',
  'perihal',
  'kepada',
  'dari',
  'organik',
  'mitra',
  'tanggal_mulai',
  'tanggal_selesai',
  'tempat_tujuan',
  'pembebanan_biaya',
  'e_sign',
  'catatan',
  'pembuat',
  'dibuat_pada',
  'status_dokumen',
  'url_dokumen',
  'id_surat_asal',
  'status_naskah',
  'alasan_pembatalan',
  'dibatalkan_oleh',
  'dibatalkan_pada',
] as const;

export const SITATAN_TYPES = [
  'Surat Keputusan',
  'Surat Perintah/Surat Tugas',
  'Surat Dinas',
  'Nota Dinas/Memorandum',
  'Surat Undangan Intern',
  'Surat Undangan Ekstern',
  'Surat Keterangan',
  'Surat Pengantar',
  'Laporan',
  'Formulir Permintaan',
] as const;

export type SitatanType = (typeof SITATAN_TYPES)[number];

export function isSitatanType(value: string): value is SitatanType {
  return (SITATAN_TYPES as readonly string[]).includes(value);
}

export interface ArchiveClassification {
  id: string;
  code: string;
  classification: string;
  subcode: string;
  subclassification: string;
  prefix: string;
}

export interface SitatanRecord {
  id: string;
  year: string;
  type: SitatanType;
  serial: string;
  number: string;
  date: string;
  body: string;
  insert: boolean;
  archiveCode: string;
  archiveSubcode: string;
  nature: string;
  subject: string;
  recipient: string;
  sender: string;
  organik: string;
  mitra: string;
  startDate: string;
  endDate: string;
  destination: string;
  costBearer: string;
  eSign: boolean;
  notes: string;
  creator: string;
  createdAt: string;
  documentStatus: string;
  documentUrl: string;
  sourceId: string;
  status: string;
  cancellationReason: string;
  cancelledBy: string;
  cancelledAt: string;
  rowIndex: number;
}

export interface SitatanDraft {
  type: SitatanType;
  body: string;
  insert: boolean;
  archiveCode: string;
  archiveSubcode: string;
  nature: string;
  subject: string;
  recipient: string;
  sender: string;
  organik: string;
  mitra: string;
  startDate: string;
  endDate: string;
  destination: string;
  costBearer: string;
  eSign: boolean;
  notes: string;
  documentUrl: string;
}

interface NumberRule {
  prefix: string;
  padding: number;
  includeUnit: boolean;
  includeArchive: boolean;
  includeYear: boolean;
}

const NUMBER_RULES: Record<SitatanType, NumberRule> = {
  'Surat Keputusan': { prefix: '', padding: 3, includeUnit: false, includeArchive: false, includeYear: false },
  'Surat Perintah/Surat Tugas': { prefix: 'B-', padding: 3, includeUnit: true, includeArchive: true, includeYear: true },
  'Surat Dinas': { prefix: 'B-', padding: 3, includeUnit: true, includeArchive: true, includeYear: true },
  'Nota Dinas/Memorandum': { prefix: 'Nomor', padding: 0, includeUnit: true, includeArchive: true, includeYear: true },
  'Surat Undangan Intern': { prefix: 'B-', padding: 3, includeUnit: true, includeArchive: true, includeYear: true },
  'Surat Undangan Ekstern': { prefix: 'B-', padding: 3, includeUnit: true, includeArchive: true, includeYear: true },
  'Surat Keterangan': { prefix: '', padding: 3, includeUnit: true, includeArchive: true, includeYear: true },
  'Surat Pengantar': { prefix: '', padding: 3, includeUnit: true, includeArchive: true, includeYear: true },
  'Laporan': { prefix: '', padding: 3, includeUnit: false, includeArchive: false, includeYear: false },
  'Formulir Permintaan': { prefix: 'B-', padding: 3, includeUnit: true, includeArchive: true, includeYear: true },
};

export const SITATAN_UNIT_CODE = '3210';

export function normalizeArchiveSubcode(value: string): string {
  const subcode = value.trim();
  return /^\d{1,3}$/.test(subcode) ? subcode.padStart(3, '0') : subcode;
}

export const requiresArchiveCode = (type: SitatanType): boolean =>
  NUMBER_RULES[type].includeArchive;

export function formatSitatanNumber(
  type: SitatanType,
  serial: number,
  year: string,
  code: string,
  subcode: string,
): string {
  const rule = NUMBER_RULES[type];
  const serialText = String(serial).padStart(rule.padding, '0');
  const parts = [`${rule.prefix}${serialText}`];

  if (rule.includeUnit) parts.push(SITATAN_UNIT_CODE);
  if (rule.includeArchive) {
    if (!code || !subcode) throw new Error('Kode dan subkode arsip wajib dipilih untuk jenis surat ini.');
    parts.push(`${code}.${normalizeArchiveSubcode(subcode)}`);
  }
  if (rule.includeYear) parts.push(year);

  return parts.join('/');
}

const isChecked = (value: string | undefined): boolean =>
  ['1', 'true', 'ya', 'yes', 'y'].includes((value ?? '').trim().toLowerCase());

export function parseSitatanRows(values: string[][]): SitatanRecord[] {
  const headers = values[0]?.slice(0, SITATAN_HEADERS.length).map((value) => value.trim().toLowerCase()) ?? [];
  if (SITATAN_HEADERS.some((header, index) => headers[index] !== header)) {
    throw new Error('Header tab DARI_WEB tidak sesuai dengan struktur Sitatan yang disepakati.');
  }

  return values.slice(1).flatMap((row, index) => {
    const id = row[0]?.trim();
    const type = row[2]?.trim();
    if (!id || !type || !isSitatanType(type)) return [];

    return [{
      id,
      year: row[1]?.trim() ?? '',
      type,
      serial: row[3]?.trim() ?? '',
      number: row[4]?.trim() ?? '',
      date: row[5]?.trim() ?? '',
      body: row[6]?.trim() ?? '',
      insert: isChecked(row[7]),
      archiveCode: row[8]?.trim() ?? '',
      archiveSubcode: normalizeArchiveSubcode(row[9]?.trim() ?? ''),
      nature: row[10]?.trim() ?? '',
      subject: row[11]?.trim() ?? '',
      recipient: row[12]?.trim() ?? '',
      sender: row[13]?.trim() ?? '',
      organik: row[14]?.trim() ?? '',
      mitra: row[15]?.trim() ?? '',
      startDate: row[16]?.trim() ?? '',
      endDate: row[17]?.trim() ?? '',
      destination: row[18]?.trim() ?? '',
      costBearer: row[19]?.trim() ?? '',
      eSign: isChecked(row[20]),
      notes: row[21]?.trim() ?? '',
      creator: row[22]?.trim() ?? '',
      createdAt: row[23]?.trim() ?? '',
      documentStatus: row[24]?.trim() ?? '',
      documentUrl: row[25]?.trim() ?? '',
      sourceId: row[26]?.trim() ?? '',
      status: row[27]?.trim() || 'Aktif',
      cancellationReason: row[28]?.trim() ?? '',
      cancelledBy: row[29]?.trim() ?? '',
      cancelledAt: row[30]?.trim() ?? '',
      rowIndex: index + 2,
    }];
  });
}

export function parseArchiveRows(values: string[][]): ArchiveClassification[] {
  const headers = values[0]?.slice(0, 6).map((value) => value.trim().toLowerCase()) ?? [];
  const expected = ['id', 'kode', 'klasifikasi', 'subkode', 'subklasifikasi', 'prefix'];
  if (expected.some((header, index) => headers[index] !== header)) {
    throw new Error('Header tab master_arsip harus berisi id, kode, klasifikasi, subkode, subklasifikasi, prefix.');
  }

  return values.slice(1).flatMap((row) => {
    const id = row[0]?.trim();
    const code = row[1]?.trim();
    const subcode = normalizeArchiveSubcode(row[3]?.trim() ?? '');
    if (!id || !code || !subcode) return [];
    return [{
      id,
      code,
      classification: row[2]?.trim() ?? '',
      subcode,
      subclassification: row[4]?.trim() ?? '',
      prefix: row[5]?.trim() ?? '',
    }];
  });
}
