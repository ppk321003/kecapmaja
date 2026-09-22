/**
 * Pembacaan data Google Sheets LANGSUNG dari browser (tanpa Supabase).
 *
 * Memakai endpoint publik gviz (`/gviz/tq`) yang tersedia untuk spreadsheet
 * yang dapat dibaca melalui tautan. Bentuk hasilnya dibuat sama dengan
 * edge function `google-sheets` (`{ values: string[][] }`) agar bisa
 * dipakai langsung sebagai pengganti.
 *
 * Penulisan data tetap melalui edge function, karena kredensial Google
 * tidak boleh berada di browser.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ReadSheetOptions {
  spreadsheetId: string;
  /** Contoh: "Sheet1", "user!A:F", "'My Sheet'!A1:D10" */
  range: string;
  /** true -> ambil nilai mentah (angka/tanggal tanpa format tampilan) */
  unformatted?: boolean;
  /** Matikan fallback ke Supabase bila pembacaan langsung gagal */
  noFallback?: boolean;
}

const columnLettersToIndex = (letters: string): number => {
  let index = 0;
  for (const char of letters.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
};

interface ParsedRange {
  sheetName: string;
  startCol?: number;
  endCol?: number;
  startRow?: number;
  endRow?: number;
}

export const parseRange = (range: string): ParsedRange => {
  const raw = (range || '').trim();
  if (!raw) return { sheetName: '' };

  const bangIndex = raw.lastIndexOf('!');
  let sheetPart = raw;
  let cellPart = '';

  if (bangIndex !== -1) {
    sheetPart = raw.slice(0, bangIndex);
    cellPart = raw.slice(bangIndex + 1);
  }

  let sheetName = sheetPart.trim();
  if (
    (sheetName.startsWith("'") && sheetName.endsWith("'")) ||
    (sheetName.startsWith('"') && sheetName.endsWith('"'))
  ) {
    sheetName = sheetName.slice(1, -1).replace(/''/g, "'");
  }

  const parsed: ParsedRange = { sheetName };
  if (!cellPart) return parsed;

  const parts = cellPart.split(':');
  const cellPattern = /^([A-Za-z]*)(\d*)$/;

  const start = parts[0]?.match(cellPattern);
  const end = (parts[1] ?? parts[0])?.match(cellPattern);

  if (start?.[1]) parsed.startCol = columnLettersToIndex(start[1]);
  if (start?.[2]) parsed.startRow = parseInt(start[2], 10);
  if (end?.[1]) parsed.endCol = columnLettersToIndex(end[1]);
  if (end?.[2]) parsed.endRow = parseInt(end[2], 10);

  return parsed;
};

const cellToString = (cell: any, unformatted: boolean): string => {
  if (cell === null || cell === undefined) return '';
  if (typeof cell !== 'object') return String(cell);
  const value = unformatted ? (cell.v ?? cell.f) : (cell.f ?? cell.v);
  if (value === null || value === undefined) return '';
  return String(value);
};

/** Buang baris kosong di bagian akhir supaya sama seperti hasil Sheets API. */
const trimTrailingEmptyRows = (rows: string[][]): string[][] => {
  let last = rows.length;
  while (last > 0 && rows[last - 1].every((cell) => cell === '')) last -= 1;
  return rows.slice(0, last);
};

async function readViaGviz(options: ReadSheetOptions): Promise<string[][]> {
  const { spreadsheetId, range, unformatted = false } = options;
  const { sheetName, startCol, endCol, startRow, endRow } = parseRange(range);

  const params = new URLSearchParams({ tqx: 'out:json', headers: '0', tq: 'select *' });
  if (sheetName) params.set('sheet', sheetName);

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params.toString()}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Gagal membaca spreadsheet (${response.status})`);

  const text = await response.text();
  const match = text.match(/setResponse\(([\s\S]*)\)\s*;?\s*$/);
  if (!match) throw new Error('Respons spreadsheet tidak dikenali');

  const parsed = JSON.parse(match[1]);
  if (parsed?.status === 'error') {
    const message = parsed?.errors?.[0]?.detailed_message || parsed?.errors?.[0]?.message || 'error';
    throw new Error(`Spreadsheet menolak permintaan: ${String(message).replace(/<[^>]*>/g, '')}`);
  }

  const colCount: number = parsed?.table?.cols?.length ?? 0;
  const gvizRows: any[] = parsed?.table?.rows ?? [];

  let rows: string[][] = gvizRows.map((row: any) => {
    const cells = row?.c ?? [];
    const out: string[] = [];
    for (let i = 0; i < colCount; i += 1) out.push(cellToString(cells[i], unformatted));
    return out;
  });

  if (startRow || endRow) {
    const from = startRow ? startRow - 1 : 0;
    const to = endRow ?? rows.length;
    rows = rows.slice(from, to);
  }

  if (startCol !== undefined || endCol !== undefined) {
    const from = startCol ?? 0;
    const to = (endCol ?? colCount - 1) + 1;
    rows = rows.map((row) => row.slice(from, to));
  }

  return trimTrailingEmptyRows(rows);
}

/**
 * Baca nilai sheet. Mengembalikan `{ values }` seperti edge function.
 * Otomatis fallback ke edge function `google-sheets` bila pembacaan
 * langsung gagal (misal sheet tidak publik).
 */
export async function readSheetValues(options: ReadSheetOptions): Promise<{ values: string[][] }> {
  try {
    const values = await readViaGviz(options);
    return { values };
  } catch (directError) {
    if (options.noFallback) throw directError;
    console.warn('[readSheetValues] Pembacaan langsung gagal, memakai Supabase:', directError);

    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId: options.spreadsheetId,
        operation: 'read',
        range: options.range,
        ...(options.unformatted ? { valueRenderOption: 'UNFORMATTED_VALUE' } : {}),
      },
    });
    if (error) throw error;
    return { values: ((data as any)?.values || []) as string[][] };
  }
}
