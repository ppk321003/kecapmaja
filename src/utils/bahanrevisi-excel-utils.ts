/**
 * Utility functions untuk Excel import/export Bahan Revisi Anggaran
 * Adapted dari reference implementation dengan integrasi Google Sheets
 */

import * as XLSX from 'xlsx';
import { BudgetItem, RPDItem } from '@/types/bahanrevisi';
import { formatCurrency, roundToThousands, formatDateIndonesia } from './bahanrevisi-calculations';

// Normalized column names untuk matching
export const normalizeColumnName = (name: string): string => {
  if (!name) return '';
  return name
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '')
    .trim();
};

// Convert Excel date value to ISO string
export const excelDateToISO = (dateValue: any): string => {
  if (!dateValue) return '';
  
  // If it's already a string that looks like ISO date
  if (typeof dateValue === 'string') {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (isoRegex.test(dateValue)) {
      return dateValue;
    }
    
    // Try to parse as date string
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }
  
  // If it's a number (Excel serial date)
  if (typeof dateValue === 'number') {
    // Excel dates start from Jan 1, 1900
    const excelBaseDate = new Date(1900, 0, 1);
    const excelDate = new Date(excelBaseDate.getTime() + (dateValue - 1) * 86400000);
    return excelDate.toISOString();
  }
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return dateValue.toISOString();
  }
  
  return '';
};

// Expected column names dan variasi mereka
export const expectedColumns = {
  // Hierarchy columns
  programPembebanan: ['programpembebanan', 'program pembebanan', 'program'],
  kegiatan: ['kegiatan', 'activity', 'kegiatan'],
  rincianOutput: ['rincianoutput', 'rincian output', 'output'],
  komponenOutput: ['komponenoutput', 'komponen output', 'komponen'],
  subKomponen: ['subkomponen', 'sub komponen', 'subcomp'],
  akun: ['akun', 'account'],

  // Budget columns
  uraian: ['uraian', 'keterangan', 'item', 'description', 'deskripsi'],
  volumeSemula: ['volumesemula', 'volume semula', 'volume awal'],
  satuanSemula: ['satuansemula', 'satuan semula', 'satuan awal', 'unit semula'],
  hargaSatuanSemula: ['hargasatuansemula', 'harga satuan semula', 'harga semula'],
  volumeMenjadi: ['volumemenjadi', 'volume menjadi', 'volume akhir'],
  satuanMenjadi: ['satuanmenjadi', 'satuan menjadi', 'satuan akhir'],
  hargaSatuanMenjadi: ['hargasatuanmenjadi', 'harga satuan menjadi', 'harga menjadi'],
  blokir: ['blokir', 'blocked', 'blocked amount', 'locked amount', 'terkunci'],
  sisaAnggaran: ['sisaanggaran', 'sisa anggaran', 'sisa budget', 'remainder'],

  // Approval and tracking columns
  approvedBy: ['approvedby', 'approved by', 'disetujui oleh'],
  rejectedBy: ['rejectedby', 'rejected by', 'ditolak oleh'],
  submittedBy: ['submittedby', 'submitted by', 'dikirim oleh'],
  notes: ['notes', 'catatan', 'remarks', 'keterangan tambahan'],

  // Date columns
  approvedDate: ['approveddate', 'approved date', 'tgl disetujui', 'tanggal disetujui'],
  rejectedDate: ['rejecteddate', 'rejected date', 'tgl ditolak', 'tanggal ditolak'],
  submittedDate: ['submitteddate', 'submitted date', 'tgl dikirim', 'tanggal dikirim'],
  updatedDate: ['updateddate', 'updated date', 'tgl diupdate', 'tanggal diupdate'],

  // RPD columns (monthly)
  januari: ['januari', 'jan', 'january'],
  februari: ['februari', 'feb', 'february'],
  maret: ['maret', 'mar', 'march'],
  april: ['april', 'apr'],
  mei: ['mei', 'may', 'mei'],
  juni: ['juni', 'jun', 'june'],
  juli: ['juli', 'jul', 'july'],
  agustus: ['agustus', 'aug', 'august'],
  september: ['september', 'sep', 'sept'],
  oktober: ['oktober', 'oct', 'october'],
  november: ['november', 'nov'],
  desember: ['desember', 'dec', 'december'],
};

interface ParsedBahanRevisiData {
  budgetItems: Partial<BudgetItem>[];
  rpdItems: Partial<RPDItem>[];
  errors: string[];
}

/**
 * Create template workbook untuk bahanrevisi
 */
export const createBahanRevisiTemplate = (
  komponenOutput?: string,
  subKomponen?: string,
  akun?: string
) => {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Program Pembebanan',
    'Kegiatan',
    'Rincian Output',
    'Komponen Output',
    'Sub Komponen',
    'Akun',
    'Uraian',
    'Volume Semula',
    'Satuan Semula',
    'Harga Satuan Semula',
    'Jumlah Semula',
    'Volume Menjadi',
    'Satuan Menjadi',
    'Harga Satuan Menjadi',
    'Jumlah Menjadi',
    'Selisih',
    'Sisa Anggaran',
    'Blokir',
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const data = [
    headers,
    [
      'Program Contoh',
      'Kegiatan Contoh',
      'Rincian Output Contoh',
      komponenOutput || 'Komponen Contoh',
      subKomponen || 'Sub Komponen Contoh',
      akun || 'Akun Contoh',
      'Contoh item anggaran',
      1,
      'Paket',
      1000000,
      1,
      'Paket',
      1200000,
      0,
      100000,
      100000,
      100000,
      100000,
      100000,
      100000,
      100000,
      100000,
      100000,
      100000,
      100000,
      100000,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  const colWidths = Array(headers.length).fill({ width: 18 });
  colWidths[6] = { width: 40 }; // Uraian lebih lebar
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Bahanrevisi');

  return wb;
};

/**
 * Find header row dalam Excel file
 */
export const findHeaderRow = (
  rows: any[]
): { headerRowIndex: number; headerRowMatches: number } => {
  let headerRowIndex = -1;
  let bestHeaderMatches = 0;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    let matches = 0;
    for (let j = 0; j < row.length; j++) {
      const cellValue = row[j];
      if (!cellValue || typeof cellValue !== 'string') continue;

      const normalizedCell = normalizeColumnName(cellValue);

      for (const [_, variations] of Object.entries(expectedColumns)) {
        if (variations.some((v) => normalizedCell.includes(normalizeColumnName(v)))) {
          matches++;
          break;
        }
      }
    }

    if (matches > bestHeaderMatches) {
      bestHeaderMatches = matches;
      headerRowIndex = i;
    }
  }

  console.log('[findHeaderRow] Found at index:', headerRowIndex, 'with', bestHeaderMatches, 'matches');

  return { headerRowIndex, headerRowMatches: bestHeaderMatches };
};

/**
 * Map column indices ke expected columns
 */
export const mapColumnIndices = (headerRow: any[]): {
  columnIndices: Record<string, number>;
  missingRequiredColumns: string[];
} => {
  const columnIndices: Record<string, number> = {};
  const requiredColumns = [
    'uraian',
    'volumeSemula',
    'satuanSemula',
    'hargaSatuanSemula',
    'volumeMenjadi',
    'satuanMenjadi',
    'hargaSatuanMenjadi',
  ];

  headerRow.forEach((header: any, index: number) => {
    if (!header) return;

    const normalizedHeader = normalizeColumnName(header);
    let matched = false;

    for (const [key, variations] of Object.entries(expectedColumns)) {
      for (const variation of variations) {
        const normalizedVariation = normalizeColumnName(variation);

        if (normalizedHeader === normalizedVariation) {
          columnIndices[key] = index;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  });

  console.log('[mapColumnIndices] Mapped indices:', columnIndices);

  const missingRequiredColumns = requiredColumns.filter(
    (col) => typeof columnIndices[col] === 'undefined'
  );

  return { columnIndices, missingRequiredColumns };
};

/**
 * Process data rows ke budget items dan RPD items
 */
export const processBahanRevisiRows = (
  rows: any[],
  headerRowIndex: number,
  columnIndices: Record<string, number>,
  komponenOutput?: string,
  subKomponen?: string,
  akun?: string
): ParsedBahanRevisiData => {
  const budgetItems: Partial<BudgetItem>[] = [];
  const rpdItems: Partial<RPDItem>[] = [];
  const errors: string[] = [];

  const monthColumns = [
    'januari',
    'februari',
    'maret',
    'april',
    'mei',
    'juni',
    'juli',
    'agustus',
    'september',
    'oktober',
    'november',
    'desember',
  ];

  rows.slice(headerRowIndex + 1)
    .filter((row) => row && row[columnIndices.uraian] && String(row[columnIndices.uraian]).trim())
    .forEach((row, rowIndex) => {
      try {
        // Build deterministic ID from hierarchy fields
        const programVal = columnIndices.programPembebanan !== undefined ? String(row[columnIndices.programPembebanan] || '') : '';
        const kegiatanVal = columnIndices.kegiatan !== undefined ? String(row[columnIndices.kegiatan] || '') : '';
        const rincianVal = columnIndices.rincianOutput !== undefined ? String(row[columnIndices.rincianOutput] || '') : '';
        const komponenVal = columnIndices.komponenOutput !== undefined ? String(row[columnIndices.komponenOutput] || '') : komponenOutput || '';
        const subKomponenVal = columnIndices.subKomponen !== undefined ? String(row[columnIndices.subKomponen] || '') : subKomponen || '';
        const akunVal = columnIndices.akun !== undefined ? String(row[columnIndices.akun] || '') : akun || '';
        const uraianVal = String(row[columnIndices.uraian] || '');
        const id = [programVal.trim(), kegiatanVal.trim(), rincianVal.trim(), komponenVal.trim(), subKomponenVal.trim(), akunVal.trim(), uraianVal.trim()].join('|');

        // Parse budget data
        const volumeSemula = parseFloat(row[columnIndices.volumeSemula]) || 0;
        const volumeMenjadi = parseFloat(row[columnIndices.volumeMenjadi]) || 0;
        const hargaSatuanSemula = parseFloat(row[columnIndices.hargaSatuanSemula]) || 0;
        const hargaSatuanMenjadi = parseFloat(row[columnIndices.hargaSatuanMenjadi]) || 0;

        const jumlahSemula = roundToThousands(volumeSemula * hargaSatuanSemula);
        const jumlahMenjadi = roundToThousands(volumeMenjadi * hargaSatuanMenjadi);
        const selisih = roundToThousands(jumlahMenjadi - jumlahSemula);

        // Determine status
        let status: 'new' | 'changed' | 'unchanged' | 'deleted' = 'unchanged';
        if (volumeSemula === 0 || hargaSatuanSemula === 0) {
          status = 'new';
        } else if (
          volumeSemula !== volumeMenjadi ||
          hargaSatuanSemula !== hargaSatuanMenjadi
        ) {
          status = 'changed';
        }

        const budgetItem: Partial<BudgetItem> = {
          id,
          program_pembebanan:
            columnIndices.programPembebanan !== undefined
              ? String(row[columnIndices.programPembebanan] || '')
              : '',
          kegiatan:
            columnIndices.kegiatan !== undefined
              ? String(row[columnIndices.kegiatan] || '')
              : '',
          rincian_output:
            columnIndices.rincianOutput !== undefined
              ? String(row[columnIndices.rincianOutput] || '')
              : '',
          komponen_output:
            columnIndices.komponenOutput !== undefined
              ? String(row[columnIndices.komponenOutput] || '')
              : komponenOutput || '',
          sub_komponen:
            columnIndices.subKomponen !== undefined
              ? String(row[columnIndices.subKomponen] || '')
              : subKomponen || '',
          akun:
            columnIndices.akun !== undefined
              ? String(row[columnIndices.akun] || '')
              : akun || '',
          uraian: String(row[columnIndices.uraian] || ''),
          volume_semula: volumeSemula,
          satuan_semula: String(row[columnIndices.satuanSemula] || 'Paket'),
          harga_satuan_semula: hargaSatuanSemula,
          jumlah_semula: jumlahSemula,
          volume_menjadi: volumeMenjadi,
          satuan_menjadi: String(row[columnIndices.satuanMenjadi] || 'Paket'),
          harga_satuan_menjadi: hargaSatuanMenjadi,
          jumlah_menjadi: jumlahMenjadi,
          selisih,
          sisa_anggaran:
            columnIndices.sisaAnggaran !== undefined
              ? parseFloat(row[columnIndices.sisaAnggaran]) || 0
              : 0,
          blokir:
            columnIndices.blokir !== undefined
              ? parseFloat(row[columnIndices.blokir]) || 0
              : 0,
          status,
          approved_by: 
            columnIndices.approvedBy !== undefined
              ? String(row[columnIndices.approvedBy] || '')
              : '',
          approved_date:
            columnIndices.approvedDate !== undefined && row[columnIndices.approvedDate]
              ? excelDateToISO(row[columnIndices.approvedDate])
              : '',
          rejected_date:
            columnIndices.rejectedDate !== undefined && row[columnIndices.rejectedDate]
              ? excelDateToISO(row[columnIndices.rejectedDate])
              : '',
          submitted_by: 
            columnIndices.submittedBy !== undefined
              ? String(row[columnIndices.submittedBy] || '')
              : 'import',
          submitted_date:
            columnIndices.submittedDate !== undefined && row[columnIndices.submittedDate]
              ? excelDateToISO(row[columnIndices.submittedDate])
              : new Date().toISOString(),
          updated_date:
            columnIndices.updatedDate !== undefined && row[columnIndices.updatedDate]
              ? excelDateToISO(row[columnIndices.updatedDate])
              : new Date().toISOString(),
          notes: 
            columnIndices.notes !== undefined
              ? String(row[columnIndices.notes] || '')
              : '',
        };

        budgetItems.push(budgetItem);

        // Parse RPD data (monthly allocations)
        const monthValues: Record<string, number> = {};
        let totalRPD = 0;

        monthColumns.forEach((month) => {
          if (columnIndices[month] !== undefined) {
            const value = parseFloat(row[columnIndices[month]]) || 0;
            monthValues[month] = roundToThousands(value);
            totalRPD += value;
          }
        });

        totalRPD = roundToThousands(totalRPD);

        // Validation: Total RPD tidak boleh melebihi jumlah_menjadi
        if (totalRPD > 0 && totalRPD > jumlahMenjadi) {
          errors.push(
            `Row ${rowIndex + 1}: Total RPD (${formatCurrency(totalRPD)}) melebihi Jumlah Menjadi (${formatCurrency(jumlahMenjadi)})`
          );
        }

        // Determine RPD status
        let rpdStatus = 'belum_isi';
        if (totalRPD === jumlahMenjadi) {
          rpdStatus = 'ok';
        } else if (totalRPD > 0 && totalRPD < jumlahMenjadi) {
          rpdStatus = 'sisa';
        } else if (totalRPD === 0) {
          rpdStatus = 'belum_isi';
        }

        const rpdItem: Partial<RPDItem> = {
          id,
          program_pembebanan: budgetItem.program_pembebanan,
          kegiatan: budgetItem.kegiatan,
          komponen_output: budgetItem.komponen_output,
          sub_komponen: budgetItem.sub_komponen,
          akun: budgetItem.akun,
          uraian: budgetItem.uraian,
          total_pagu: jumlahMenjadi,
          jan: monthValues.januari || 0,
          feb: monthValues.februari || 0,
          mar: monthValues.maret || 0,
          apr: monthValues.april || 0,
          mei: monthValues.mei || 0,
          jun: monthValues.juni || 0,
          jul: monthValues.juli || 0,
          aug: monthValues.agustus || 0,
          sep: monthValues.september || 0,
          oct: monthValues.oktober || 0,
          nov: monthValues.november || 0,
          dec: monthValues.desember || 0,
          total_rpd: totalRPD,
          sisa_anggaran: roundToThousands(jumlahMenjadi - totalRPD),
          status: rpdStatus,
          modified_date: new Date().toISOString(),
        };

        rpdItems.push(rpdItem);
      } catch (err) {
        errors.push(`Row ${rowIndex + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

  console.log('[processBahanRevisiRows] Processed:', budgetItems.length, 'budget items,', rpdItems.length, 'RPD items');

  return { budgetItems, rpdItems, errors };
};

/**
 * Get friendly column names
 */
export const getFriendlyColumnNames = (columns: string[]): string => {
  const friendlyNames: Record<string, string> = {
    uraian: 'Uraian',
    volumeSemula: 'Volume Semula',
    satuanSemula: 'Satuan Semula',
    hargaSatuanSemula: 'Harga Satuan Semula',
    volumeMenjadi: 'Volume Menjadi',
    satuanMenjadi: 'Satuan Menjadi',
    hargaSatuanMenjadi: 'Harga Satuan Menjadi',
    blokir: 'Blokir',
    approvedBy: 'Disetujui Oleh',
    approvedDate: 'Tgl Disetujui',
    rejectedBy: 'Ditolak Oleh',
    rejectedDate: 'Tgl Ditolak',
    submittedBy: 'Dikirim Oleh',
    submittedDate: 'Tgl Dikirim',
    updatedDate: 'Tgl Diupdate',
    notes: 'Catatan',
  };

  return columns.map((col) => friendlyNames[col] || col).join(', ');
};

/**
 * Apply worksheet styling
 */
export const applyWorksheetStyling = (worksheet: XLSX.WorkSheet): void => {
  if (!worksheet['!cols']) {
    worksheet['!cols'] = Array(26).fill({ wch: 15 });
  }
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight' };
};

/**
 * Apply header style
 */
export const applyHeaderStyle = (worksheet: XLSX.WorkSheet): void => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!worksheet[cellRef]) continue;

    worksheet[cellRef].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E6E6E6' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  }
};

/**
 * Export bahanrevisi data ke Excel comprehensive
 */
export const exportBahanRevisiExcel = (
  budgetItems: Partial<BudgetItem>[],
  fileName: string = 'Bahanrevisi'
) => {
  try {
    const headers = [
      'ID',
      'Program Pembebanan',
      'Kegiatan',
      'Rincian Output',
      'Komponen Output',
      'Sub Komponen',
      'Akun',
      'Uraian',
      'Volume Semula',
      'Satuan Semula',
      'Harga Satuan Semula',
      'Jumlah Semula',
      'Volume Menjadi',
      'Satuan Menjadi',
      'Harga Satuan Menjadi',
      'Jumlah Menjadi',
      'Selisih',
      'Blokir',
      'Status',
      'Approved By',
      'Approved Date',
      'Rejected Date',
      'Submitted By',
      'Submitted Date',
      'Updated Date',
      'Notes',
      'Catatan PPK',
    ];

    const data = budgetItems.map((item) => [
      item.id || '',
      item.program_pembebanan || '',
      item.kegiatan || '',
      item.rincian_output || '',
      item.komponen_output || '',
      item.sub_komponen || '',
      item.akun || '',
      item.uraian || '',
      item.volume_semula || 0,
      item.satuan_semula || '',
      item.harga_satuan_semula || 0,
      item.jumlah_semula || 0,
      item.volume_menjadi || 0,
      item.satuan_menjadi || '',
      item.harga_satuan_menjadi || 0,
      item.jumlah_menjadi || 0,
      item.selisih || 0,
      item.blokir || 0,
      item.status || '',
      item.approved_by || '',
      formatDateIndonesia(item.approved_date),
      formatDateIndonesia(item.rejected_date),
      item.submitted_by || '',
      formatDateIndonesia(item.submitted_date),
      formatDateIndonesia(item.updated_date),
      item.notes || '',
      item.catatan_ppk || '',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

    worksheet['!cols'] = [
      { wch: 12 },  // ID
      { wch: 20 },  // Program Pembebanan
      { wch: 20 },  // Kegiatan
      { wch: 20 },  // Rincian Output
      { wch: 20 },  // Komponen Output
      { wch: 20 },  // Sub Komponen
      { wch: 15 },  // Akun
      { wch: 40 },  // Uraian
      { wch: 12 },  // Volume Semula
      { wch: 12 },  // Satuan Semula
      { wch: 15 },  // Harga Satuan Semula
      { wch: 15 },  // Jumlah Semula
      { wch: 12 },  // Volume Menjadi
      { wch: 12 },  // Satuan Menjadi
      { wch: 15 },  // Harga Satuan Menjadi
      { wch: 15 },  // Jumlah Menjadi
      { wch: 15 },  // Selisih
      { wch: 15 },  // Blokir
      { wch: 12 },  // Status
      { wch: 15 },  // Approved By
      { wch: 16 },  // Approved Date
      { wch: 16 },  // Rejected Date
      { wch: 15 },  // Submitted By
      { wch: 16 },  // Submitted Date
      { wch: 16 },  // Updated Date
      { wch: 40 },  // Notes
      { wch: 40 },  // Catatan PPK
    ];

    applyWorksheetStyling(worksheet);
    applyHeaderStyle(worksheet);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bahanrevisi');

    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    console.error('[exportBahanRevisiExcel] Error:', error);
    throw new Error('Gagal mengekspor file Excel');
  }
};
