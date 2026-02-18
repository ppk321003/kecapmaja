/**
 * CSV Parser untuk Bahan Revisi Anggaran - Format Bulanan
 * Parse hierarchical data dengan inheritance dan multi-line uraian handling
 * Format: Semicolon-delimited dengan struktur hierarki indentasi
 */

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
 * Count leading semicolons to determine hierarchy level
 */
const getHierarchyLevel = (line: string): number => {
  return line.search(/[^;]/);
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

        const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
        const lines = text.split('\n');

        const errors: string[] = [];
        const warnings: string[] = [];
        const items: ParsedMonthlyItem[] = [];
        const stats = {
          totalRows: lines.length,
          itemsParsed: 0,
          skippedRows: 0,
          continuationsMerged: 0,
        };

        // Extract periode (bulan/tahun) and satker info from first lines
        let periodeInfo = { bulan: 0, tahun: 0 };
        let satkerCode = '';
        let unitCode = '';
        
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i];
          
          // Extract periode
          if (line.toLowerCase().includes('periode')) {
            const extracted = extractPeriode(line);
            if (extracted) {
              periodeInfo = extracted;
              console.log('[parseMonthlyCSV] Found periode:', extracted);
            }
          }
          
          // Extract satker info (usually lines with numbers in quotes)
          if (satkerCode === '' && line.includes('054')) {
            const parts = line.split(';');
            const numPart = parts.find(p => /^\d{3}$/.test(p.trim()));
            if (numPart) satkerCode = numPart.trim();
          }
          if (unitCode === '' && line.includes('01') && i > 0) {
            const parts = line.split(';');
            const numPart = parts.find(p => /^\d{2}$/.test(p.trim()));
            if (numPart) unitCode = numPart.trim();
          }
        }

        const satkerIdFormatted = satkerCode && unitCode ? `${satkerCode}.${unitCode}` : '';
        console.log('[parseMonthlyCSV] Extracted periode:', periodeInfo, 'Satker:', satkerIdFormatted);

        // Find data start - look for line with hierarchy pattern (mixed semicolons and content)
        let dataStartRow = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip header/metadata rows (contain special text)
          if (
            line.toLowerCase().includes('laporan realisasi') ||
            line.toLowerCase().includes('periode') ||
            line.toLowerCase().includes('kementerian') ||
            line.toLowerCase().includes('satuan kerja') ||
            line.toLowerCase().includes('uraian') ||
            line.includes('*Lock Pagu') ||
            line.includes('*SPM')
          ) {
            continue;
          }

          // Found start of data when we see hierarchical pattern with numbers
          if (line.includes(';') && /\d{6}\./.test(line)) {
            dataStartRow = i;
            console.log('[parseMonthlyCSV] Found data start at row', i);
            break;
          }
        }

        // Parse data rows
        let previousHierarchy = {
          program: '',
          kegiatan: '',
          rincianOutput: '',
          komponenOutput: '',
          subKomponen: '',
          akun: '',
        };

        let i = dataStartRow;
        while (i < lines.length) {
          const line = lines[i];

          // Skip empty lines
          if (!line || !line.trim()) {
            i++;
            continue;
          }

          // Skip metadata rows
          if (line.includes('*Lock Pagu') || line.includes('*SPM')) {
            stats.skippedRows++;
            i++;
            continue;
          }

          // Skip total/summary rows
          if (line.toUpperCase().includes('JUMLAH') && !line.includes('000')) {
            stats.skippedRows++;
            i++;
            continue;
          }

          // Parse the line - split by semicolon
          const parts = line.split(';').map(p => p.trim());
          
          // Detect the hierarchy level from leading semicolons
          const hierarchyLevel = getHierarchyLevel(line);
          
          // The structure is: Program ; Kegiatan ; Output ; SubOutput ; Komponen ; SubKomponen ; Akun ; Item/Description ; ... ; Sisa Anggaran
          // But with leading semicolons indicating level
          
          // Find the last numeric value (Sisa Anggaran)
          let sisaAnggaran = 0;
          let lastNumericIndex = -1;
          for (let j = parts.length - 1; j >= 0; j--) {
            const value = parts[j];
            const numValue = parseFloat(value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
            if (!isNaN(numValue) && numValue >= 0) {
              sisaAnggaran = numValue;
              lastNumericIndex = j;
              break;
            }
          }

          // Skip rows with zero sisa anggaran
          if (sisaAnggaran === 0) {
            stats.skippedRows++;
            i++;
            continue;
          }

          // Find the description (usually contains a number prefix like 000001.)
          let uraian = '';
          let akun = '';
          let subKomponen = '';
          
          for (let j = lastNumericIndex - 1; j >= 0; j--) {
            const value = parts[j].trim();
            
            // Description pattern: XXXXXX. text...
            if (/^\d{6,}\./.test(value) || /^000\d{3}\./.test(value)) {
              uraian = stripUraianPrefix(value);
              break;
            }
            
            // Account code pattern: 5XXXXX
            if (/^\d{6}$/.test(value) && !akun) {
              akun = value;
            }
            
            // Sub-komponen pattern: XXX or XXX.0A
            if (/^\d{3}(\.\d{1,2}[A-Z])?$/.test(value) && !subKomponen) {
              subKomponen = value;
            }
          }

          // Update hierarchy based on level
          // Level 0-1: Program
          // Level 2-3: Kegiatan
          // Level 4-5: Output
          // Level 6-7: SubOutput/Komponen
          const contentBefore = parts.slice(0, Math.max(0, parts.length - 2)).map(p => p.trim()).filter(p => p && p.length > 0);
          
          if (contentBefore.length > 0) {
            const firstNonEmpty = contentBefore[0];
            if (/^;+[A-Z]/.test(line)) {
              // This is a category/hierarchy row
              if (hierarchyLevel === 1) previousHierarchy.program = firstNonEmpty;
              else if (hierarchyLevel === 3) previousHierarchy.kegiatan = firstNonEmpty;
              else if (hierarchyLevel === 5) previousHierarchy.rincianOutput = firstNonEmpty;
              else if (hierarchyLevel === 7) previousHierarchy.komponenOutput = firstNonEmpty;
            }
          }

          if (subKomponen) previousHierarchy.subKomponen = normalizeSubKomponen(subKomponen);
          if (akun) previousHierarchy.akun = akun;

          // Only create item if we have a valid uraian
          if (uraian && sisaAnggaran > 0) {
            const item: ParsedMonthlyItem = {
              program: previousHierarchy.program,
              kegiatan: previousHierarchy.kegiatan,
              rincianOutput: previousHierarchy.rincianOutput,
              komponenOutput: previousHierarchy.komponenOutput,
              subKomponen: previousHierarchy.subKomponen,
              akun: previousHierarchy.akun,
              uraian: uraian,
              sisaAnggaran: sisaAnggaran,
            };

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
            stats.skippedRows++;
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

    reader.readAsText(file);
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
