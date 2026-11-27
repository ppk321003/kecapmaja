import { format, isValid, parse, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export const SK_SPREADSHEET_ID = '11gtkh70Qg1ggvDNl1uXtjlh051eJ3KLe4YkCODr6TPo';
export const SK_MASTER_SPREADSHEET_ID = '1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8';
export const SK_SHEET_NAME = 'SuratKeputusan';
export const SK_LINK_HEADER = 'id_sitatan';

const REQUIRED_SK_HEADERS = [
  'No',
  'Id',
  'no_sk',
  'tentang',
  'menimbang1',
  'menimbang2',
  'menimbang3',
  'menimbang4',
  'kesatu',
  'kedua',
  'ketiga',
  'tanggal',
  'Organik',
  'Mitra Statistik',
  'Pembuat daftar',
  'Status',
  'Link',
] as const;

export interface SKActivity {
  namaKegiatan: string;
  bebanAnggaran: string;
  harga: string;
  satuan: string;
}

export interface SKMasterActivity extends SKActivity {
  index: number;
  role: string;
}

export interface SitatanSKDetails {
  tentang: string;
  menimbang1: string;
  menimbang2: string;
  menimbang3: string;
  menimbang4: string;
  kesatu: string;
  kegiatan: SKActivity[];
  organik: string[];
  mitra: string[];
  pembuatDaftar: string;
}

export interface SKGeneratorRecord {
  sitatanId: string;
  rowIndex: number;
  generatorId: string;
  number: string;
  status: string;
  documentUrl: string;
  details: SitatanSKDetails;
  startDate: string;
  endDate: string;
  date: string;
}

export const emptySKActivity = (): SKActivity => ({
  namaKegiatan: '',
  bebanAnggaran: '',
  harga: '',
  satuan: '',
});

export function normalizeSKActivityName(name: string): string {
  return name.trim().toLocaleLowerCase('id');
}

export function hasDuplicateSKActivityNames(activities: SKActivity[]): boolean {
  const names = new Set<string>();
  return activities.some(({ namaKegiatan }) => {
    const name = normalizeSKActivityName(namaKegiatan);
    if (!name) return false;
    if (names.has(name)) return true;
    names.add(name);
    return false;
  });
}

export const emptySitatanSKDetails = (): SitatanSKDetails => ({
  tentang: '',
  menimbang1: '',
  menimbang2: '',
  menimbang3: '',
  menimbang4: '',
  kesatu: '',
  kegiatan: [emptySKActivity()],
  organik: [],
  mitra: [],
  pembuatDaftar: '',
});

const cell = (row: string[], index: number): string => (row[index] ?? '').trim();

export function parseSKMasterActivities(values: string[][]): SKMasterActivity[] {
  if (values.length <= 1) return [];

  return values.slice(1).flatMap((row, index) => {
    const namaKegiatan = cell(row, 2);
    if (!namaKegiatan) return [];
    return [{
      index: index + 1,
      role: cell(row, 1),
      namaKegiatan,
      bebanAnggaran: cell(row, 3),
      harga: cell(row, 4),
      satuan: cell(row, 5),
    }];
  });
}

function parseSheetDate(value: string, label: string, rowIndex: number): string {
  const text = value.trim();
  if (!text) return '';

  const iso = parseISO(text);
  if (isValid(iso)) return format(iso, 'yyyy-MM-dd');

  for (const dateFormat of ['d MMMM yyyy', 'd MMM yyyy', 'dd/MM/yyyy', 'd/M/yyyy']) {
    const parsed = parse(text, dateFormat, new Date(), { locale: id });
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  }

  throw new Error(`Tanggal ${label} pada baris ${rowIndex} SuratKeputusan tidak dapat dibaca: ${text}`);
}

function parseActivities(value: string, rowIndex: number): SKActivity[] {
  if (!value.trim()) return [emptySKActivity()];
  return value.split(';').map((entry) => {
    const parts = entry.split('|').map((part) => part.trim());
    if (parts.length < 4) {
      throw new Error(`Format kegiatan pada baris ${rowIndex} SuratKeputusan tidak lengkap.`);
    }
    return {
      namaKegiatan: parts[0],
      bebanAnggaran: parts[1],
      harga: parts[2],
      satuan: parts[3],
    };
  });
}

function parseNames(value: string): string[] {
  return value.split('|').map((name) => name.trim()).filter(Boolean);
}

export function parseSKGeneratorRows(values: string[][]): SKGeneratorRecord[] {
  if (values.length === 0) return [];

  const headers = values[0].map((header) => header.trim().toLowerCase());
  const missingHeader = REQUIRED_SK_HEADERS.find(
    (header, index) => headers[index] !== header.toLowerCase(),
  );
  if (missingHeader) {
    throw new Error(`Header SuratKeputusan kolom ${missingHeader} tidak sesuai.`);
  }

  const linkHeader = headers[17];
  if (linkHeader && linkHeader !== SK_LINK_HEADER) {
    throw new Error(`Kolom R SuratKeputusan sudah digunakan oleh "${values[0][17]}"; tidak dapat menyimpan id_sitatan.`);
  }
  if (!linkHeader && values.slice(1).some((row) => cell(row, 17))) {
    throw new Error('Kolom R SuratKeputusan berisi data tanpa header; periksa isi kolom sebelum integrasi.');
  }

  return values.slice(1).flatMap((row, index) => {
    const sitatanId = cell(row, 17);
    if (!sitatanId) return [];

    const rowIndex = index + 2;
    const dateRange = cell(row, 10).split('|').map((part) => part.trim());
    return [{
      sitatanId,
      rowIndex,
      generatorId: cell(row, 1),
      number: cell(row, 2),
      status: cell(row, 15),
      documentUrl: cell(row, 16),
      details: {
        tentang: cell(row, 3),
        menimbang1: cell(row, 4),
        menimbang2: cell(row, 5),
        menimbang3: cell(row, 6),
        menimbang4: cell(row, 7),
        kesatu: cell(row, 8),
        kegiatan: parseActivities(cell(row, 9), rowIndex),
        organik: parseNames(cell(row, 12)),
        mitra: parseNames(cell(row, 13)),
        pembuatDaftar: cell(row, 14),
      },
      startDate: parseSheetDate(dateRange[0] ?? '', 'tanggal mulai', rowIndex),
      endDate: parseSheetDate(dateRange[1] ?? dateRange[0] ?? '', 'tanggal selesai', rowIndex),
      date: parseSheetDate(cell(row, 11), 'tanggal SK', rowIndex),
    }];
  });
}

export function formatSKDate(value: string): string {
  const parsed = parseISO(value);
  if (!isValid(parsed)) throw new Error(`Format tanggal SK tidak valid: ${value}`);
  return format(parsed, 'd MMMM yyyy', { locale: id });
}

export function formatSKActivities(activities: SKActivity[]): string {
  return activities
    .map((activity) => [
      activity.namaKegiatan.trim(),
      activity.bebanAnggaran.trim(),
      activity.harga.trim(),
      activity.satuan.trim(),
    ].join(' | '))
    .join('; ');
}

export function generateSKTentang(activities: SKActivity[]): string {
  const names = activities
    .map(({ namaKegiatan }) => namaKegiatan
      .replace(/\bhonor\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s,;:./–—-]+|[\s,;:./–—-]+$/g, '')
      .trim())
    .filter(Boolean)
    .map((name) => `${name.charAt(0).toLocaleUpperCase('id')}${name.slice(1)}`);

  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} dan ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, dan ${names[names.length - 1]}`;
}

export function generateSKMenimbangKesatu(tentang: string): string {
  const subject = tentang.trim();
  return subject
    ? `Bahwa untuk kelancaran pelaksanaan ${subject}, perlu menetapkan petugas;`
    : '';
}

export function generateSKMenimbangKedua(tentang: string): string {
  const subject = tentang.trim();
  return subject
    ? `Bahwa dalam pelaksanaan ${subject}, perlu ditetapkan pembagian tugas dan tanggung jawab setiap petugas agar kegiatan berjalan tertib dan dapat dipertanggungjawabkan;`
    : '';
}

export function generateSKMemutuskanKesatu(tentang: string): string {
  if (!tentang) return '';

  let result = tentang;
  const prefixes = [
    'tentang ', 'mengenai ', 'perihal ', 'penetapan ', 'penunjukan ',
    'pengangkatan ', 'pembentukan ', 'penetapan petugas ', 'penetapan tim ',
  ];

  for (const prefix of prefixes) {
    if (result.toLowerCase().startsWith(prefix)) {
      result = result.substring(prefix.length);
    }
  }

  result = result.toUpperCase();

  if (!result.toUpperCase().includes('PETUGAS')
    && !result.toUpperCase().includes('TIM')
    && !result.toUpperCase().includes('PENGAWAS')) {
    result = `PETUGAS ${result}`;
  }

  return result;
}
