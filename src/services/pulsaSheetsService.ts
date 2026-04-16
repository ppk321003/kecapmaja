/**
 * Service untuk Manajemen Pulsa via Google Sheets
 * 
 * Header Sheet1 (A:L):
 * No | Bulan | Tahun | Kegiatan | Organik | Mitra | Nominal | Status | Keterangan | Tgl Input | Disetujui Oleh | Tgl Approval
 * 
 * Organik & Mitra columns use '|' as separator for multiple names
 */

import { supabase } from '@/integrations/supabase/client';

export interface PulsaData {
  bulan: number;
  tahun: number;
  kegiatan: string;
  organik: string; // pipe-separated
  mitra: string;   // pipe-separated
  nominal: number;
  keterangan?: string;
}

export interface PulsaResponse {
  success: boolean;
  message: string;
  rowNumber?: number;
}

export interface PulsaRow {
  no: number;
  bulan: number;
  tahun: number;
  kegiatan: string;
  organik: string;   // pipe-separated raw
  mitra: string;     // pipe-separated raw
  organikList: string[];
  mitraList: string[];
  nominal: number;
  status: string;
  keterangan: string;
  tglInput: string;
  disetujuiOleh: string;
  tglApproval: string;
  rowIndex: number;
}

/** Person-centric view derived from rows */
export interface PersonPulsaEntry {
  nama: string;
  tipe: 'Organik' | 'Mitra';
  entries: {
    kegiatan: string;
    nominal: number;
    status: string;
    disetujuiOleh: string;
    tglApproval: string;
    rowIndex: number;
  }[];
  total: number;
}

/** Parse Indonesian-formatted number: "50.000,00" → 50000 */
function parseIdNumber(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  const s = String(val).trim();
  // Remove dots (thousand separator), replace comma with dot (decimal)
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  return Number(cleaned) || 0;
}

/**
 * Read all pulsa data from Sheet1
 */
export async function readPulsaData(spreadsheetId: string): Promise<PulsaRow[]> {
  try {
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId,
        operation: 'read',
        range: 'Sheet1!A:L',
      },
    });

    if (error) throw error;

    const rows = data?.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1)
      .filter((row: string[]) => row.length > 0 && String(row[0] || '').trim() !== '')
      .map((row: string[], idx: number) => {
        const organikRaw = String(row[4] || '').trim();
        const mitraRaw = String(row[5] || '').trim();
        return {
          no: parseIdNumber(row[0]) || idx + 1,
          bulan: parseIdNumber(row[1]),
          tahun: parseIdNumber(row[2]),
          kegiatan: String(row[3] || '').trim(),
          organik: organikRaw,
          mitra: mitraRaw,
          organikList: organikRaw ? organikRaw.split('|').map(s => s.trim()).filter(Boolean) : [],
          mitraList: mitraRaw ? mitraRaw.split('|').map(s => s.trim()).filter(Boolean) : [],
          nominal: parseIdNumber(row[6]),
          status: String(row[7] || 'draft').trim(),
          keterangan: String(row[8] || '').trim(),
          tglInput: String(row[9] || '').trim(),
          disetujuiOleh: String(row[10] || '').trim(),
          tglApproval: String(row[11] || '').trim(),
          rowIndex: idx + 2,
        };
      });
  } catch (error) {
    console.error('Error reading pulsa data:', error);
    return [];
  }
}

/**
 * Build person-centric view from rows
 */
export function buildPersonView(rows: PulsaRow[]): PersonPulsaEntry[] {
  const personMap = new Map<string, PersonPulsaEntry>();

  for (const row of rows) {
    // Process organik names
    for (const nama of row.organikList) {
      if (!personMap.has(nama)) {
        personMap.set(nama, { nama, tipe: 'Organik', entries: [], total: 0 });
      }
      const person = personMap.get(nama)!;
      person.entries.push({
        kegiatan: row.kegiatan,
        nominal: row.nominal,
        status: row.status,
        disetujuiOleh: row.disetujuiOleh,
        tglApproval: row.tglApproval,
        rowIndex: row.rowIndex,
      });
      person.total += row.nominal;
    }

    // Process mitra names
    for (const nama of row.mitraList) {
      if (!personMap.has(nama)) {
        personMap.set(nama, { nama, tipe: 'Mitra', entries: [], total: 0 });
      }
      const person = personMap.get(nama)!;
      person.entries.push({
        kegiatan: row.kegiatan,
        nominal: row.nominal,
        status: row.status,
        disetujuiOleh: row.disetujuiOleh,
        tglApproval: row.tglApproval,
        rowIndex: row.rowIndex,
      });
      person.total += row.nominal;
    }
  }

  return Array.from(personMap.values()).sort((a, b) => a.nama.localeCompare(b.nama));
}

/**
 * Tambah data pulsa baru ke Sheet1 - 1 entry per row, names pipe-separated
 */
export async function tambahPulsaBulanan(
  data: PulsaData,
  spreadsheetId: string
): Promise<PulsaResponse> {
  try {
    if (!spreadsheetId) {
      return { success: false, message: 'Sheet ID pulsa belum dikonfigurasi untuk satker ini' };
    }

    const existing = await readPulsaData(spreadsheetId);
    const nextNo = existing.length + 1;

    const now = new Date().toLocaleString('id-ID');
    const newRow = [
      nextNo,
      data.bulan,
      data.tahun,
      data.kegiatan,
      data.organik,    // pipe-separated
      data.mitra,      // pipe-separated
      data.nominal,
      'draft',
      data.keterangan || '',
      now,
      '',
      '',
    ];

    const { error } = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId,
        operation: 'append',
        range: 'Sheet1!A:L',
        values: [newRow],
      },
    });

    if (error) throw error;

    return {
      success: true,
      message: `✅ Data pulsa berhasil disimpan (No. ${nextNo})`,
      rowNumber: nextNo,
    };
  } catch (error) {
    console.error('Error tambah pulsa:', error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Update status pulsa di Sheet1
 */
export async function updatePulsaStatus(
  spreadsheetId: string,
  rowIndex: number,
  status: string,
  approvedBy?: string
): Promise<PulsaResponse> {
  try {
    const updates: { range: string; value: string }[] = [
      { range: `Sheet1!H${rowIndex}`, value: status },
    ];

    if (approvedBy) {
      updates.push({ range: `Sheet1!K${rowIndex}`, value: approvedBy });
      updates.push({ range: `Sheet1!L${rowIndex}`, value: new Date().toLocaleString('id-ID') });
    }

    for (const update of updates) {
      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId,
          operation: 'update',
          range: update.range,
          values: [[update.value]],
        },
      });
      if (error) throw error;
    }

    return { success: true, message: `✅ Status berhasil diupdate ke "${status}"` };
  } catch (error) {
    console.error('Error update status:', error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
