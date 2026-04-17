import * as XLSX from 'xlsx';
import { PulsaRow } from '@/services/pulsaSheetsService';

interface PersonRef {
  name: string;
  noHp?: string;
  kecamatan?: string;
}

export interface ExportPulsaOptions {
  rows: PulsaRow[];
  bulan: number;
  tahun: number;
  organikList: PersonRef[];
  mitraList: PersonRef[];
}

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Sanitize sheet name (Excel limits: 31 chars, no : \ / ? * [ ]) */
function sanitizeSheetName(name: string, idx: number): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '-').trim() || `Kegiatan ${idx + 1}`;
  return cleaned.length > 31 ? cleaned.slice(0, 28) + '...' : cleaned;
}

/**
 * Export pulsa approved_ppk per kegiatan ke Excel multi-sheet.
 * Header: Judul Kegiatan + Bulan, kolom: No, Nama, Status, Kecamatan, No Telp, Tanda Tangan.
 */
export function exportPulsaToExcel(opts: ExportPulsaOptions): void {
  const { rows, bulan, tahun, organikList, mitraList } = opts;
  const bulanNama = BULAN_NAMA[bulan - 1] || `Bulan ${bulan}`;

  // Lookup map (case-insensitive trim)
  const orgMap = new Map(organikList.map(p => [p.name.trim().toLowerCase(), p]));
  const mitMap = new Map(mitraList.map(p => [p.name.trim().toLowerCase(), p]));

  // Group rows by kegiatan (each row already 1 kegiatan; multiple rows possible)
  const byKegiatan = new Map<string, PulsaRow[]>();
  for (const row of rows) {
    const key = row.kegiatan.trim() || '(Tanpa Nama Kegiatan)';
    if (!byKegiatan.has(key)) byKegiatan.set(key, []);
    byKegiatan.get(key)!.push(row);
  }

  if (byKegiatan.size === 0) {
    throw new Error('Tidak ada data untuk diexport');
  }

  const wb = XLSX.utils.book_new();
  let exportedSheets = 0;

  let kegiatanIdx = 0;
  for (const [kegiatan, kegRows] of byKegiatan) {
    // Build approved entries for this kegiatan
    const approved: { nama: string; tipe: 'Organik' | 'Mitra'; kecamatan: string; noHp: string }[] = [];

    for (const row of kegRows) {
      const allNames = [
        ...row.organikList.map(n => ({ nama: n, tipe: 'Organik' as const })),
        ...row.mitraList.map(n => ({ nama: n, tipe: 'Mitra' as const })),
      ];
      allNames.forEach((p, idx) => {
        if (row.statusList[idx] === 'approved_ppk') {
          const lookup = p.tipe === 'Organik' ? orgMap : mitMap;
          const ref = lookup.get(p.nama.trim().toLowerCase());
          approved.push({
            nama: p.nama,
            tipe: p.tipe,
            kecamatan: ref?.kecamatan || '',
            noHp: ref?.noHp || '',
          });
        }
      });
    }

    // Skip kegiatan with no approved data
    if (approved.length === 0) continue;

    // Build AOA: header rows, blank, table header, data rows
    const aoa: (string | number)[][] = [
      [kegiatan],
      [`Bulan: ${bulanNama} ${tahun}`],
      [],
      ['No', 'Nama', 'Status', 'Kecamatan', 'Nomor Telp', 'Tanda Tangan'],
      ...approved.map((a, i) => [i + 1, a.nama, a.tipe, a.kecamatan, a.noHp, '']),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 30 },  // Nama
      { wch: 12 },  // Status
      { wch: 20 },  // Kecamatan
      { wch: 18 },  // No Telp
      { wch: 25 },  // TTD
    ];

    // Merge title row across columns A:F
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(kegiatan, kegiatanIdx));
    kegiatanIdx++;
    exportedSheets++;
  }

  if (exportedSheets === 0) {
    throw new Error('Tidak ada data approved_ppk untuk diexport');
  }

  const filename = `Pulsa_${bulanNama}_${tahun}.xlsx`;
  XLSX.writeFile(wb, filename);
}
