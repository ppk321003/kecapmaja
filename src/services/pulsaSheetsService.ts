/**
 * Service untuk Manajemen Pulsa via Google Sheets
 * Menggunakan existing google-sheets edge function
 * 
 * Header Sheet1 (A:L):
 * No | Bulan | Tahun | Kegiatan | Organik | Mitra | Nominal | Status | Keterangan | Tgl Input | Disetujui Oleh | Tgl Approval
 */

import { supabase } from '@/integrations/supabase/client';

export interface PulsaData {
  bulan: number;
  tahun: number;
  kegiatan: string;
  organik: string;
  mitra?: string;
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
  organik: string;
  mitra: string;
  nominal: number;
  status: string;
  keterangan: string;
  tglInput: string;
  disetujuiOleh: string;
  tglApproval: string;
  rowIndex: number; // for updates
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
    if (rows.length <= 1) return []; // only header

    return rows.slice(1)
      .filter((row: string[]) => row[0]?.trim())
      .map((row: string[], idx: number) => ({
        no: Number(row[0]) || idx + 1,
        bulan: Number(row[1]) || 0,
        tahun: Number(row[2]) || 0,
        kegiatan: row[3] || '',
        organik: row[4] || '',
        mitra: row[5] || '',
        nominal: Number(String(row[6] || '0').replace(/[^0-9.-]/g, '')) || 0,
        status: row[7] || 'draft',
        keterangan: row[8] || '',
        tglInput: row[9] || '',
        disetujuiOleh: row[10] || '',
        tglApproval: row[11] || '',
        rowIndex: idx + 2, // 1-indexed, skip header
      }));
  } catch (error) {
    console.error('Error reading pulsa data:', error);
    return [];
  }
}

/**
 * Tambah data pulsa baru ke Sheet1
 */
export async function tambahPulsaBulanan(
  data: PulsaData,
  spreadsheetId: string
): Promise<PulsaResponse> {
  try {
    if (!spreadsheetId) {
      return { success: false, message: 'Sheet ID pulsa belum dikonfigurasi untuk satker ini' };
    }

    // Read existing to get next No
    const existing = await readPulsaData(spreadsheetId);
    const nextNo = existing.length + 1;

    const now = new Date().toLocaleString('id-ID');
    const newRow = [
      nextNo,
      data.bulan,
      data.tahun,
      data.kegiatan,
      data.organik,
      data.mitra || '',
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
    // Update status (column H = index 7)
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
