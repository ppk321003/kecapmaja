import { readSheetValues } from '@/lib/sheets-read';

/**
 * Utilitas terpusat untuk generate ID dokumen & nomor urut ke Google Sheets.
 *
 * Masalah yang diperbaiki:
 * - Sebelumnya tiap halaman punya logika sendiri yang melewati baris pertama
 *   (dianggap header). Jika sheet tidak punya header, ID pertama ikut terbuang
 *   sehingga nomor urut mulai lagi dari 001.
 * - Perbandingan prefix bersifat case-sensitive dan tidak trim, sehingga ID
 *   seperti "SK-2609001" atau " sk-2609001" tidak terdeteksi -> nomor mengulang.
 * - Nilai numerik yang berformat ("1.234") gagal diparse.
 * - Tidak ada verifikasi: jika ID hasil generate sudah ada, tetap dipakai.
 */

const COLUMN_LETTER = /^[A-Z]+$/;

async function readColumn(
  spreadsheetId: string,
  sheetName: string,
  column: string
): Promise<string[]> {
  const col = COLUMN_LETTER.test(column.toUpperCase()) ? column.toUpperCase() : 'A';
  const range = `${sheetName}!${col}:${col}`;

  // Dibaca langsung dari Google Sheets (tanpa Supabase).
  const { values: read } = await readSheetValues({
    spreadsheetId,
    range,
    unformatted: true,
  });

  const values: any[][] = read || [];
  // JANGAN skip baris pertama: header otomatis terfilter karena tidak cocok pola.
  return values.map((row) => (row?.[0] === undefined || row?.[0] === null ? '' : String(row[0]).trim()));
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Generate ID dokumen dengan format `${prefix}NNN` (contoh: sk-2609001).
 * Nomor urut selalu melanjutkan nilai tertinggi yang sudah ada di sheet
 * untuk prefix yang sama.
 */
export async function generateNextDocumentId(options: {
  spreadsheetId: string;
  sheetName: string;
  prefix: string;
  column?: string;
  padLength?: number;
}): Promise<string> {
  const { spreadsheetId, sheetName, prefix, column = 'A', padLength = 3 } = options;

  const cells = await readColumn(spreadsheetId, sheetName, column);
  const pattern = new RegExp(`^${escapeRegExp(prefix.toLowerCase())}0*(\\d+)$`);

  let max = 0;
  const existing = new Set<string>();
  for (const cell of cells) {
    const normalized = cell.toLowerCase().replace(/\s+/g, '');
    if (!normalized) continue;
    existing.add(normalized);
    const match = normalized.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (Number.isFinite(num) && num > max) max = num;
    }
  }

  // Pastikan ID hasil generate benar-benar belum dipakai.
  let next = max + 1;
  let candidate = `${prefix}${next.toString().padStart(padLength, '0')}`;
  while (existing.has(candidate.toLowerCase())) {
    next += 1;
    candidate = `${prefix}${next.toString().padStart(padLength, '0')}`;
  }
  return candidate;
}

/**
 * Prefix standar `${kode}-yymm` berdasarkan tanggal hari ini.
 */
export function monthlyPrefix(kode: string, date: Date = new Date()): string {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${kode}-${year}${month}`;
}

/**
 * Nomor urut numerik berikutnya (max + 1) dari sebuah kolom.
 */
export async function getNextSequenceNumberFromSheet(options: {
  spreadsheetId: string;
  sheetName: string;
  column?: string;
}): Promise<number> {
  const { spreadsheetId, sheetName, column = 'A' } = options;
  const cells = await readColumn(spreadsheetId, sheetName, column);

  let max = 0;
  for (const cell of cells) {
    if (!cell) continue;
    const cleaned = cell.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
    const num = parseInt(cleaned, 10);
    if (Number.isFinite(num) && num > max) max = num;
  }
  return max + 1;
}
