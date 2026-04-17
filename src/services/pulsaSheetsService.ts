/**
 * Service untuk Manajemen Pulsa via Google Sheets
 *
 * Header Sheet1 (A:L):
 * No | Bulan | Tahun | Kegiatan | Organik | Mitra | Nominal | Status | Keterangan | Tgl Input | Disetujui Oleh | Tgl Approval
 *
 * IMPORTANT: Organik, Mitra, Status, DisetujuiOleh, TglApproval semua menggunakan
 * pemisah '|' dengan jumlah elemen yang harus konsisten dengan total nama
 * (organik diikuti mitra, urutan: organik[0..n], mitra[0..m]).
 *
 * Contoh:
 *   Organik: "Budi|Siti"
 *   Mitra:   "Aan|Aam"
 *   Status:  "approved_ppk|pending_ppk|pending_ppk|rejected_ppk"
 *            (4 status untuk 4 orang)
 */

import { supabase } from '@/integrations/supabase/client';

export interface PulsaData {
  bulan: number;
  tahun: number;
  kegiatan: string;
  organik: string; // pipe-separated names
  mitra: string;   // pipe-separated names
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
  organik: string;          // pipe-separated raw
  mitra: string;            // pipe-separated raw
  organikList: string[];
  mitraList: string[];
  nominal: number;
  status: string;           // raw pipe-separated status
  statusList: string[];     // per-person status
  keterangan: string;
  tglInput: string;
  disetujuiOleh: string;          // raw pipe-separated
  disetujuiOlehList: string[];
  tglApproval: string;            // raw pipe-separated
  tglApprovalList: string[];
  rowIndex: number;
}

/** Person-centric view derived from rows */
export interface PersonPulsaEntry {
  nama: string;
  tipe: 'Organik' | 'Mitra';
  entries: (({
    kegiatan: string;
    nominal: number;
    status: string;
    disetujuiOleh: string;
    tglApproval: string;
    rowIndex: number;
    /** Index orang dalam row tersebut (urutan organik dulu, baru mitra) */
    personIndex: number;
  } | null))[]; // Allow null for entries tanpa kegiatan untuk orang tertentu
  total: number;
}

/** Parse Indonesian-formatted number: "50.000,00" → 50000 */
function parseIdNumber(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  const s = String(val).trim();
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  return Number(cleaned) || 0;
}

function splitPipe(val: string): string[] {
  if (!val) return [];
  return val.split('|').map(s => s.trim());
}

/** Hitung jumlah orang dalam row (organik + mitra) */
function countPeople(row: Pick<PulsaRow, 'organikList' | 'mitraList'>): number {
  return row.organikList.length + row.mitraList.length;
}

/**
 * Pad/trim a per-person array to match total people count.
 * Default fill is 'pending_ppk' for status, '' for others.
 */
function normalizePerPerson(arr: string[], total: number, fill: string): string[] {
  const out = arr.slice(0, total);
  while (out.length < total) out.push(fill);
  return out;
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
        const statusRaw = String(row[7] || 'pending_ppk').trim();
        const approverRaw = String(row[10] || '').trim();
        const tglApprovalRaw = String(row[11] || '').trim();

        const organikList = splitPipe(organikRaw).filter(Boolean);
        const mitraList = splitPipe(mitraRaw).filter(Boolean);
        const totalPeople = organikList.length + mitraList.length;

        const statusList = normalizePerPerson(splitPipe(statusRaw), totalPeople, 'pending_ppk');
        const disetujuiOlehList = normalizePerPerson(splitPipe(approverRaw), totalPeople, '');
        const tglApprovalList = normalizePerPerson(splitPipe(tglApprovalRaw), totalPeople, '');

        return {
          no: parseIdNumber(row[0]) || idx + 1,
          bulan: parseIdNumber(row[1]),
          tahun: parseIdNumber(row[2]),
          kegiatan: String(row[3] || '').trim(),
          organik: organikRaw,
          mitra: mitraRaw,
          organikList,
          mitraList,
          nominal: parseIdNumber(row[6]),
          status: statusRaw,
          statusList,
          keterangan: String(row[8] || '').trim(),
          tglInput: String(row[9] || '').trim(),
          disetujuiOleh: approverRaw,
          disetujuiOlehList,
          tglApproval: tglApprovalRaw,
          tglApprovalList,
          rowIndex: idx + 2,
        };
      });
  } catch (error) {
    console.error('Error reading pulsa data:', error);
    return [];
  }
}

/**
 * Build person-centric view from rows.
 * personIndex urutan: organik[0..n-1], lalu mitra[0..m-1].
 * 
 * PENTING: Entries harus terurut konsisten per kegiatan untuk semua orang,
 * agar kolom kegiatan di UI menampilkan data yang tepat.
 * Entries array panjangnya sama untuk semua orang = jumlah kegiatan unik.
 * Posisi setiap entry sesuai dengan kegiatanIndex.
 */
export function buildPersonView(rows: PulsaRow[]): PersonPulsaEntry[] {
  // Step 1: Extract unique kegiatan dalam urutan pertama kali muncul
  const kegiatanOrder: string[] = [];
  const kegiatanSet = new Set<string>();
  for (const row of rows) {
    if (!kegiatanSet.has(row.kegiatan)) {
      kegiatanSet.add(row.kegiatan);
      kegiatanOrder.push(row.kegiatan);
    }
  }

  // Step 2: Build person map dengan entries array yang sudah dialokasikan per kegiatan
  const personMap = new Map<string, PersonPulsaEntry>();

  for (const row of rows) {
    const allNames = [
      ...row.organikList.map(n => ({ nama: n, tipe: 'Organik' as const })),
      ...row.mitraList.map(n => ({ nama: n, tipe: 'Mitra' as const })),
    ];

    allNames.forEach((p, personIndex) => {
      const status = row.statusList[personIndex] || 'pending_ppk';
      const approver = row.disetujuiOlehList[personIndex] || '';
      const tglApproval = row.tglApprovalList[personIndex] || '';

      if (!personMap.has(p.nama)) {
        // Initialize person dengan entries array panjang kegiatanOrder (semua null di awal)
        personMap.set(p.nama, { 
          nama: p.nama, 
          tipe: p.tipe, 
          entries: Array(kegiatanOrder.length).fill(null),
          total: 0 
        });
      }
      
      const person = personMap.get(p.nama)!;
      const kegiatanIndex = kegiatanOrder.indexOf(row.kegiatan);
      
      // Store entry di posisi kegiatan yang konsisten (bukan di akhir array)
      person.entries[kegiatanIndex] = {
        kegiatan: row.kegiatan,
        nominal: row.nominal,
        status,
        disetujuiOleh: approver,
        tglApproval,
        rowIndex: row.rowIndex,
        personIndex,
      };
      
      person.total += row.nominal;
    });
  }

  return Array.from(personMap.values()).sort((a, b) => a.nama.localeCompare(b.nama));
}

/**
 * Tambah data pulsa baru ke Sheet1 - 1 entry per row, names pipe-separated.
 * Status diinisialisasi 'pending_ppk' untuk setiap orang (pipe-separated).
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

    const organikList = splitPipe(data.organik).filter(Boolean);
    const mitraList = splitPipe(data.mitra).filter(Boolean);
    const totalPeople = organikList.length + mitraList.length;

    if (totalPeople === 0) {
      return { success: false, message: 'Minimal 1 orang (organik atau mitra) harus dipilih' };
    }

    // Initialize status list: pending_ppk per person
    const statusList = Array(totalPeople).fill('pending_ppk').join('|');
    const approverList = Array(totalPeople).fill('').join('|');
    const tglApprovalList = Array(totalPeople).fill('').join('|');

    const now = new Date().toLocaleString('id-ID');
    const newRow = [
      nextNo,
      data.bulan,
      data.tahun,
      data.kegiatan,
      data.organik,
      data.mitra,
      data.nominal,
      statusList,
      data.keterangan || '',
      now,
      approverList,
      tglApprovalList,
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
      message: `✅ Data pulsa berhasil disimpan (No. ${nextNo}, ${totalPeople} orang)`,
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
 * Update status per-orang di sebuah row.
 * Hanya mengganti index tertentu pada array status/disetujuiOleh/tglApproval,
 * lalu join kembali dengan '|'.
 *
 * @param updates Array dari { personIndex, newStatus }
 */
export async function updatePersonStatusInRow(
  spreadsheetId: string,
  rowIndex: number,
  updates: { personIndex: number; newStatus: string }[],
  approverName: string
): Promise<PulsaResponse> {
  try {
    if (!spreadsheetId) {
      return { success: false, message: 'Sheet ID pulsa belum dikonfigurasi' };
    }
    if (updates.length === 0) {
      return { success: false, message: 'Tidak ada update yang dikirim' };
    }

    // 1. Read current row to get existing arrays
    const { data, error: readErr } = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId,
        operation: 'read',
        range: `Sheet1!A${rowIndex}:L${rowIndex}`,
      },
    });
    if (readErr) throw readErr;

    const row = (data?.values || [])[0];
    if (!row) {
      return { success: false, message: `Row ${rowIndex} tidak ditemukan` };
    }

    const organikList = splitPipe(String(row[4] || '')).filter(Boolean);
    const mitraList = splitPipe(String(row[5] || '')).filter(Boolean);
    const totalPeople = organikList.length + mitraList.length;

    if (totalPeople === 0) {
      return { success: false, message: 'Row ini tidak punya nama' };
    }

    const statusList = normalizePerPerson(
      splitPipe(String(row[7] || '')),
      totalPeople,
      'pending_ppk'
    );
    const approverList = normalizePerPerson(
      splitPipe(String(row[10] || '')),
      totalPeople,
      ''
    );
    const tglApprovalList = normalizePerPerson(
      splitPipe(String(row[11] || '')),
      totalPeople,
      ''
    );

    // 2. Apply updates only to the targeted indices
    const now = new Date().toLocaleString('id-ID');
    for (const u of updates) {
      if (u.personIndex < 0 || u.personIndex >= totalPeople) {
        console.warn(`Skip invalid personIndex ${u.personIndex} (total ${totalPeople})`);
        continue;
      }
      statusList[u.personIndex] = u.newStatus;
      approverList[u.personIndex] = approverName;
      tglApprovalList[u.personIndex] = now;
    }

    // 3. Write back joined arrays to columns H, K, L
    const writes = [
      { range: `Sheet1!H${rowIndex}`, value: statusList.join('|') },
      { range: `Sheet1!K${rowIndex}`, value: approverList.join('|') },
      { range: `Sheet1!L${rowIndex}`, value: tglApprovalList.join('|') },
    ];

    for (const w of writes) {
      const { error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId,
          operation: 'update',
          range: w.range,
          values: [[w.value]],
        },
      });
      if (error) throw error;
    }

    return {
      success: true,
      message: `✅ ${updates.length} status berhasil diupdate di row ${rowIndex}`,
    };
  } catch (error) {
    console.error('Error update person status:', error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * @deprecated gunakan updatePersonStatusInRow agar status per-orang.
 * Update seluruh status row (lama, fallback). Disimpan untuk backward-compat.
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
