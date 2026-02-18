/**
 * CSV Parser untuk Bahan Revisi Anggaran - Format Bulanan
 * Parse hierarchical data dengan inheritance dan multi-line uraian handling
 */

import * as XLSX from 'xlsx';

export interface ParsedMonthlyItem {
  program: string;
  kegiatan: string;
  rincianOutput: string;
  komponenOutput: string;
  subKomponen: string;
  akun: string;
  uraian: string;
  sisaAnggaran: number;
}

export interface ParsedMonthlyData {
  items: ParsedMonthlyItem[];
  bulan: number;
  tahun: number;
  satkerId: string;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    itemsParsed: number;
    skippedRows: number;
    continuationsMerged: number;
  };
}

/**
 * Extract bulan dan tahun dari teks periode
 * Format: "Periode Januari 2025" → { bulan: 1, tahun: 2025 }
 */
export const extractPeriode = (periodeText: string): { bulan: number; tahun: number } | null => {
  const monthMap: { [key: string]: number } = {
    januari: 1, january: 1,
    februari: 2, february: 2,
    maret: 3, march: 3,
    april: 4,
    mei: 5, may: 5,
    juni: 6, june: 6,
    juli: 7, july: 7,
    agustus: 8, august: 8,
    september: 9, sept: 9,
    oktober: 10, october: 10,
    november: 11, nov: 11,
    desember: 12, december: 12,
  };

  // Extract "Periode <BULAN> <TAHUN>"
  const match = periodeText.match(/periode\s+(\w+)\s+(\d{4})/i);
  if (!match) return null;

  const monthText = match[1].toLowerCase();
  const tahun = parseInt(match[2], 10);
  const bulan = monthMap[monthText];

  return bulan ? { bulan, tahun } : null;
};

/**
 * Extract satker info dari kolom O
 * Baris 4: Kementerian/Satker Code
 * Baris 5: Unit Organisasi Code
 */
export const extractSatkerInfo = (rows: any[][]): { satkerCode: string; unitCode: string } => {
  let satkerCode = '';
  let unitCode = '';

  // Find satker info dalam baris awal
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length < 15) continue;

    // Cek kolom O (index 14)
    const colO = row[14];
    if (colO && (typeof colO === 'number' || /^\d{3}$/.test(String(colO)))) {
      satkerCode = String(colO).trim();
      if (i + 1 < rows.length && rows[i + 1] && Array.isArray(rows[i + 1]) && rows[i + 1].length > 14) {
        const nextColO = rows[i + 1][14];
        if (nextColO && /^\d{2}$/.test(String(nextColO))) {
          unitCode = String(nextColO).trim();
        }
      }
      break;
    }
  }

  return { satkerCode, unitCode };
};

/**
 * Normalize sub komponen ke 3 digit format
 * 5 → 005, 51 → 051, 051.0A → 051
 */
const normalizeSubKomponen = (subKomp: string): string => {
  if (!subKomp) return '';
  // Remove .0A suffix jika ada
  const cleaned = subKomp.split('.')[0];
  // Pad dengan leading zero ke 3 digit
  return cleaned.padStart(3, '0');
};

/**
 * Strip kode prefix dari uraian
 * "000081. honor pengajar..." → "honor pengajar..."
 */
const stripUraianPrefix = (uraian: string): string => {
  if (!uraian) return '';
  // Match pattern: "XXXXXX. teks..."
  const match = uraian.match(/^\d+\.\s*(.+)$/);
  return match ? match[1].trim() : uraian.trim();
};

/**
 * Check if parenthesis balanced
 * "(text)" → true, "(text" → false, "text)" → false
 */
const isParenthesisBalanced = (text: string): boolean => {
  let count = 0;
  for (const char of text) {
    if (char === '(') count++;
    if (char === ')') count--;
    if (count < 0) return false;
  }
  return count === 0;
};

/**
 * Check if row is summary/total row (contains "JUMLAH" in first column)
 */
const isSummaryRow = (row: any[]): boolean => {
  const colA = row[0];
  if (!colA) return false;
  const text = String(colA).trim().toUpperCase();
  return text.includes('JUMLAH') || text.includes('TOTAL');
};

/**
 * Check if row is meta/note row (starts with * in column B)
 */
const isMetaRow = (row: any[]): boolean => {
  const colB = row[1]; // Column B (index 1)
  if (!colB) return false;
  const text = String(colB).trim();
  return text.startsWith('*');
};

/**
 * Check if row is continuation (columns A-M empty, column N has text)
 */
const isContinuationRow = (row: any[]): boolean => {
  // Check if A-M (indices 0-12) are empty
  const isEmpty = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every(
    (i) => !row[i] || String(row[i]).trim() === ''
  );

  // Check if column N (index 13) has value
  const colN = row[13];
  const hasValue = colN && String(colN).trim() !== '';

  return isEmpty && hasValue;
};

/**
 * Parse CSV bulanan ke structured data
 */
export const parseMonthlyCSV = (file: File): Promise<ParsedMonthlyData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('File kosong');

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get array of arrays (not objects)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        const errors: string[] = [];
        const warnings: string[] = [];
        const items: ParsedMonthlyItem[] = [];
        const stats = {
          totalRows: rows.length,
          itemsParsed: 0,
          skippedRows: 0,
          continuationsMerged: 0,
        };

        // Extract periode (bulan/tahun)
        let periodeInfo = { bulan: 0, tahun: 0 };
        let periodeText = '';
        
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = rows[i];
          if (Array.isArray(row)) {
            const concatenated = row.map(v => String(v || '')).join(' ');
            if (concatenated.toLowerCase().includes('periode')) {
              periodeText = concatenated;
              const extracted = extractPeriode(concatenated);
              if (extracted) {
                periodeInfo = extracted;
                console.log('[parseMonthlyCSV] Found periode:', extracted);
              }
              break;
            }
          }
        }

        if (periodeInfo.bulan === 0) {
          errors.push('Tidak bisa mengekstrak periode (bulan/tahun) dari CSV. Pastikan CSV memiliki baris "Periode <BULAN> <TAHUN>"');
          console.warn('[parseMonthlyCSV] Checked rows:', rows.slice(0, 5).map((r, i) => ({
            index: i,
            content: Array.isArray(r) ? r.map(v => String(v || '')).join(' | ') : 'not an array'
          })));
        }

        // Extract satker info dari kolom O
        const { satkerCode, unitCode } = extractSatkerInfo(rows);
        const satkerIdFormatted = `${satkerCode}.${unitCode}`;
        console.log('[parseMonthlyCSV] Satker info:', satkerIdFormatted);

        // Find REAL data start row
        // Look for row with "Uraian" or similar header indicators
        let dataStartRow = 8;
        let columnIndexes: { [key: string]: number } = {
          program: 0,
          kegiatan: 1,
          rincianOutput: 2,
          komponenOutput: 3,
          subKomponen: 4,
          akun: 5,
          uraian: 6,
          sisaAnggaran: -1,
        };
        let actualHeaders: string[] = [];
        
        for (let i = 5; i < Math.min(10, rows.length); i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          const firstCell = String(row[0] || '').trim().toLowerCase();
          
          // Check if this looks like a header row
          if (firstCell.includes('uraian') || firstCell.includes('deskripsi') || 
              firstCell.includes('program') || firstCell.includes('item')) {
            actualHeaders = row.map(h => String(h || '').trim().toLowerCase());
            dataStartRow = i + 1; // Data starts after header row
            
            console.log('[parseMonthlyCSV] Found actual header row at row', i);
            console.log('[parseMonthlyCSV] Headers:', actualHeaders.slice(0, 10));
            break;
          }
        }

        // Auto-detect columns from actual header row
        if (actualHeaders.length > 0) {
          actualHeaders.forEach((header, idx) => {
            if (header.includes('program')) columnIndexes.program = idx;
            if (header.includes('kegiatan')) columnIndexes.kegiatan = idx;
            if (header.includes('output') && !header.includes('sub')) columnIndexes.rincianOutput = idx;
            if (header.includes('suboutput') || (header.includes('sub') && header.includes('output'))) columnIndexes.komponenOutput = idx;
            if (header.includes('subkomponen')) columnIndexes.subKomponen = idx;
            if (header.includes('akun')) columnIndexes.akun = idx;
            if (header.includes('uraian') || header.includes('item') || header.includes('deskripsi')) columnIndexes.uraian = idx;
            if (header.includes('sisa') || header.includes('pagu') || header.includes('realisasi')) columnIndexes.sisaAnggaran = idx;
          });
          
          console.log('[parseMonthlyCSV] Detected columns from actual header:', columnIndexes);
        }

        // Look for rows with actual data (non-zero budget values)
        for (let i = dataStartRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          // Skip summary rows
          if (isSummaryRow(row)) {
            console.log('[parseMonthlyCSV] Skipping summary row at', i);
            continue;
          }
          
          // Check if row has non-zero budget value in last column
          const lastCol = row[row.length - 1];
          const hasValue = lastCol && String(lastCol).trim() !== '' && String(lastCol) !== '0';
          
          if (hasValue) {
            dataStartRow = i;
            console.log('[parseMonthlyCSV] Found first real data row at', i, 'with value:', lastCol);
            break;
          }
        }

        // Parse rows dengan inheritance
        let previousHierarchy = {
          program: '',
          kegiatan: '',
          rincianOutput: '',
          komponenOutput: '',
          subKomponen: '',
          akun: '',
        };

        let i = dataStartRow;
        let rowsChecked = 0;
        while (i < rows.length) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) {
            i++;
            continue;
          }

          rowsChecked++;
          if (rowsChecked <= 5) {
            console.log(`[parseMonthlyCSV] Checking row ${i}:`, {
              'A(0)': row[0],
              'B(1)': row[1],
              'C(2)': row[2],
              'N(13)': row[13],
              'Last': row[row.length - 1],
            });
          }

          // Skip meta rows
          if (isMetaRow(row)) {
            stats.skippedRows++;
            i++;
            continue;
          }

          // Skip summary/total rows
          if (isSummaryRow(row)) {
            stats.skippedRows++;
            i++;
            continue;
          }

          // Check if continuation row
          if (isContinuationRow(row)) {
            // Merge dengan previous item jika ada
            if (items.length > 0) {
              const lastItem = items[items.length - 1];
              const contText = String(row[13]).trim();
              lastItem.uraian += ` ${contText}`;
              stats.continuationsMerged++;
              stats.skippedRows++;
            }
            i++;
            continue;
          }

          // Update hierarchy (inheritance)
          const colA = row[columnIndexes.program];
          const colB = row[columnIndexes.kegiatan];
          const colC = row[columnIndexes.rincianOutput];
          const colD = row[columnIndexes.komponenOutput];
          const colE = row[columnIndexes.subKomponen];
          const colF = row[columnIndexes.akun];
          const colG = row[columnIndexes.uraian];
          const colN = String(colG || '').trim();
          const lastColValue = row[row.length - 1]; // Last column (Sisa Anggaran)

          // Update hierarchy dengan nilai yg ada
          if (colA && String(colA).trim()) previousHierarchy.program = String(colA).trim();
          if (colB && String(colB).trim()) previousHierarchy.kegiatan = String(colB).trim();
          if (colC && String(colC).trim()) previousHierarchy.rincianOutput = String(colC).trim();
          if (colD && String(colD).trim()) previousHierarchy.komponenOutput = String(colD).trim();
          if (colE && String(colE).trim()) previousHierarchy.subKomponen = String(colE).trim();
          if (colF && String(colF).trim()) previousHierarchy.akun = String(colF).trim();

          // Only create item if ada uraian di kolom N
          if (colN) {
            let uraian = stripUraianPrefix(colN);

            // Check for incomplete parenthesis (terpotong)
            if (!isParenthesisBalanced(uraian)) {
              // Look ahead for continuation
              if (i + 1 < rows.length) {
                const nextRow = rows[i + 1];
                if (isContinuationRow(nextRow)) {
                  const contText = String(nextRow[13]).trim();
                  uraian += ` ${contText}`;
                  stats.continuationsMerged++;
                  i++; // Skip continuation row next
                }
              }
            }

            // Extract Sisa Anggaran (last numeric column)
            let sisaAnggaran = 0;
            if (lastColValue) {
              const numValue = parseFloat(String(lastColValue).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
              if (!isNaN(numValue)) {
                sisaAnggaran = numValue;
              }
            }

            // Skip rows with zero sisa_anggaran (no actual budget)
            if (sisaAnggaran === 0) {
              warnings.push(`Row ${i + 1}: Sisa Anggaran adalah 0, skip item`);
              stats.skippedRows++;
              i++;
              continue;
            }

            // Normalize sub komponen
            const normalizedSubKomp = normalizeSubKomponen(previousHierarchy.subKomponen);

            const item: ParsedMonthlyItem = {
              program: previousHierarchy.program,
              kegiatan: previousHierarchy.kegiatan,
              rincianOutput: previousHierarchy.rincianOutput,
              komponenOutput: previousHierarchy.komponenOutput,
              subKomponen: normalizedSubKomp,
              akun: previousHierarchy.akun,
              uraian: uraian,
              sisaAnggaran: sisaAnggaran,
            };

            // Validate item
            if (!item.uraian) {
              warnings.push(`Row ${i + 1}: Uraian kosong, skip item`);
              stats.skippedRows++;
              i++;
              continue;
            }

            items.push(item);
            stats.itemsParsed++;
            
            if (items.length <= 3) {
              console.log(`[parseMonthlyCSV] Item ${items.length}:`, {
                program: item.program,
                kegiatan: item.kegiatan,
                akun: item.akun,
                uraian: item.uraian.substring(0, 40),
                sisaAnggaran: item.sisaAnggaran,
              });
            }
          } else {
            // No uraian in column N
            if (i === dataStartRow && items.length === 0) {
              console.warn('[parseMonthlyCSV] First row has no uraian in column N. colN value:', colN, 'row:', row.slice(0, 6));
            }
          }

          i++;
        }

        if (items.length === 0) {
          errors.push('Tidak ada items yang berhasil di-parse dari CSV');
        }

        resolve({
          items,
          bulan: periodeInfo.bulan,
          tahun: periodeInfo.tahun,
          satkerId: satkerIdFormatted,
          errors,
          warnings,
          stats,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Create unique key dari item untuk matching
 */
export const createUniqueKey = (item: ParsedMonthlyItem | any): string => {
  return [
    item.program || item.program_pembebanan || '',
    item.kegiatan || '',
    item.rincianOutput || item.rincian_output || '',
    item.komponenOutput || item.komponen_output || '',
    item.subKomponen || item.sub_komponen || '',
    item.akun || '',
    item.uraian || '',
  ]
    .map((s) => String(s || '').toLowerCase().trim())
    .join('|');
};
