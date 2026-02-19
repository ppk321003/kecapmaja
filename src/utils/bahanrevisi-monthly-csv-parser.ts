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
  periodeIni: number;      // Column 24 (Periode Ini) - untuk RPD items monthly values
  sisaAnggaran: number;    // Column AE (SISA ANGGARAN) - untuk budget_items.sisa_anggaran
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
  const cleaned = subKomp.split('.')[0].trim();
  // Remove leading zeros first then pad to 3 digit
  const numPart = cleaned.replace(/^0+/, '') || '0';
  return numPart.padStart(3, '0');
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
 * Parse CSV bulanan ke structured data dengan proper hierarchical parsing
 * Structure: leading semicolons indicate hierarchy level
 *   ;GG;... → Program level
 *   ;GG.2897;... → Kegiatan level
 *   ;;BMA;... → Output level
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

        // Extract periode (bulan/tahun) and satker info from first 20 lines
        let periodeInfo = { bulan: 0, tahun: 0 };
        let satkerCode = '';
        let unitCode = '';
        
        console.log('[parseMonthlyCSV] Starting extraction from', Math.min(20, lines.length), 'lines');
        
        for (let i = 0; i < Math.min(20, lines.length); i++) {
          const line = lines[i];
          console.log(`[parseMonthlyCSV] Line ${i}: ${line.substring(0, 60)}`);
          
          // Extract periode
          if (line.toLowerCase().includes('periode')) {
            const extracted = extractPeriode(line);
            if (extracted) {
              periodeInfo = extracted;
              console.log('[parseMonthlyCSV] Found periode:', extracted);
            }
          }
          
          // Extract Kementerian code - try multiple patterns
          if (line.toLowerCase().includes('kementerian') && !satkerCode) {
            // Pattern 1: "Kementerian: 054"
            let match = line.match(/kementerian:\s*(\d{3})/i);
            // Pattern 2: "Kementerian; 054" (semicolon instead of colon)
            if (!match) match = line.match(/kementerian;\s*(\d{3})/i);
            // Pattern 3: Look for any 3-digit number in Kementerian line
            if (!match) match = line.match(/(\d{3})/);
            
            if (match) {
              satkerCode = match[1];
              console.log('[parseMonthlyCSV] Found kementerian code:', satkerCode);
            }
          }
          
          // Extract Unit Organisasi code - try multiple patterns
          if (line.toLowerCase().includes('unit organisasi') && !unitCode) {
            // Pattern 1: "Unit Organisasi: 01"
            let match = line.match(/unit organisasi:\s*(\d{2})/i);
            // Pattern 2: "Unit Organisasi; 01" (semicolon instead of colon)
            if (!match) match = line.match(/unit organisasi;\s*(\d{2})/i);
            // Pattern 3: Look for any 2-digit number after first number
            if (!match && satkerCode) match = line.match(/(\d{2})(?!.*\d{2})/);
            
            if (match) {
              unitCode = match[1];
              console.log('[parseMonthlyCSV] Found unit code:', unitCode);
            }
          }
        }

        const satkerIdFormatted = satkerCode || unitCode ? 
          (satkerCode && unitCode ? `${satkerCode}.${unitCode}` : (satkerCode || unitCode)) 
          : '';
        console.log('[parseMonthlyCSV] Extracted periode:', periodeInfo, 'Satker:', satkerIdFormatted, '(code=' + satkerCode + ', unit=' + unitCode + ')');

        // Parse data rows dengan hierarchical tracking
        let hierarchy = {
          program: '', // ;GG; → GG
          programFull: '', // 054.01.GG
          kegiatan: '', // GG.2897 → 2897
          kegiatanFull: '', // GG.2897
          rincianOutput: '', // ;;BMA; → BMA (akan jadi 2897.bma)
          rincianOutputCode: '', // BMA code only
          komponenOutput: '', // ;;;052.004; → 052.004 (akan jadi 2897.bma.004)
          komponenOutputCode: '', // komponen code only
          subKomponen: '', // ;;;;;052.0A;
          akun: '', // ;;;;;;;524113;
        };

        let i = 0;
        while (i < lines.length) {
          const line = lines[i];

          // Skip empty lines
          if (!line || !line.trim()) {
            i++;
            continue;
          }

          // Skip metadata rows
          if (
            line.includes('*Lock Pagu') ||
            line.includes('*SPM') ||
            line.toLowerCase().includes('laporan realisasi') ||
            line.toLowerCase().includes('periode') ||
            line.toLowerCase().includes('kementerian') ||
            line.toLowerCase().includes('satuan kerja') ||
            line.toLowerCase().includes('uraian;')
          ) {
            i++;
            continue;
          }

          // Skip total/summary rows
          if (line.toUpperCase().includes('JUMLAH') && !line.includes('000')) {
            stats.skippedRows++;
            i++;
            continue;
          }

          // Count leading semicolons to detect hierarchy level
          const leadingSemicolons = line.search(/[^;]/);
          const parts = line.split(';').map(p => p.trim());

          // Get first non-empty field after leading semicolons
          const firstFieldAfterSemicolons = parts.find(p => p !== '');

          // Detect hierarchy level and update tracking
          if (firstFieldAfterSemicolons) {
            if (leadingSemicolons === 1) {
              // Level 1: ;GG; or ;GG.2897;
              if (/^[A-Z]{2}$/.test(firstFieldAfterSemicolons)) {
                // Pure program code like GG
                hierarchy.program = firstFieldAfterSemicolons;
                // Build full program code with satker prefix if available
                const prefix = satkerCode && unitCode ? `${satkerCode}.${unitCode}` : (satkerCode || unitCode || '');
                hierarchy.programFull = prefix ? `${prefix}.${firstFieldAfterSemicolons}` : firstFieldAfterSemicolons;
                hierarchy.kegiatan = '';
                hierarchy.kegiatanFull = '';
                console.log(`[parseMonthlyCSV] Program level: ${hierarchy.programFull}`);
              } else if (/^[A-Z]{2}\.\d{4}$/.test(firstFieldAfterSemicolons)) {
                // Kegiatan code like GG.2897
                hierarchy.kegiatanFull = firstFieldAfterSemicolons;
                hierarchy.program = firstFieldAfterSemicolons.split('.')[0];
                // Build full program code with satker prefix if available
                const prefix = satkerCode && unitCode ? `${satkerCode}.${unitCode}` : (satkerCode || unitCode || '');
                hierarchy.programFull = prefix ? `${prefix}.${hierarchy.program}` : hierarchy.program;
                // Extract kegiatan number
                const match = firstFieldAfterSemicolons.match(/^[A-Z]{2}\.(\d{4})$/);
                hierarchy.kegiatan = match ? match[1] : '';
              }
            } else if (leadingSemicolons === 2) {
              // Level 2: ;;BMA; or ;;BMA.004; → Output/Rincian Output level
              // If contains dot (e.g., BMA.004), it's the full detail code
              // If no dot (e.g., BMA), it's just the base output code
              
              if (firstFieldAfterSemicolons.includes('.')) {
                // Full format like BMA.004
                hierarchy.komponenOutputCode = firstFieldAfterSemicolons;
                const basePart = firstFieldAfterSemicolons.split('.')[0]; // BMA
                hierarchy.rincianOutputCode = basePart;
                
                if (hierarchy.kegiatan && basePart) {
                  hierarchy.rincianOutput = `${hierarchy.kegiatan}.${basePart}`.toUpperCase();
                  hierarchy.komponenOutput = `${hierarchy.kegiatan}.${firstFieldAfterSemicolons}`.toUpperCase();
                  console.log(`[parseMonthlyCSV] Level 2 with dot: set rincianOutput=${hierarchy.rincianOutput}, komponenOutput=${hierarchy.komponenOutput}`);
                }
              } else {
                // Just the base code like BMA
                hierarchy.rincianOutputCode = firstFieldAfterSemicolons;
                if (hierarchy.kegiatan && firstFieldAfterSemicolons) {
                  hierarchy.rincianOutput = `${hierarchy.kegiatan}.${firstFieldAfterSemicolons}`.toUpperCase();
                  console.log(`[parseMonthlyCSV] Level 2 no dot: set rincianOutput=${hierarchy.rincianOutput}`);
                } else {
                  hierarchy.rincianOutput = firstFieldAfterSemicolons.toUpperCase();
                  console.log(`[parseMonthlyCSV] Level 2 no kegiatan: set rincianOutput=${hierarchy.rincianOutput}`);
                }
              }
            } else if (leadingSemicolons === 3) {
              // Level 3: ;;;052; → Komponen level (if not already set at level 2)
              // Only update if we haven't set it yet at level 2
              if (!hierarchy.komponenOutput && hierarchy.rincianOutputCode && firstFieldAfterSemicolons) {
                hierarchy.komponenOutputCode = firstFieldAfterSemicolons;
                if (hierarchy.kegiatan) {
                  hierarchy.komponenOutput = `${hierarchy.kegiatan}.${hierarchy.rincianOutputCode}.${firstFieldAfterSemicolons}`.toUpperCase();
                }
              }
            } else if (leadingSemicolons === 4) {
              // Level 4: ;;;;052; or ;;;;052.0A; or ;;;;58; → sub_komponen (can be 1-3 digit)
              if (/^\d{1,3}(\.\d{1,2}[A-Z])?$/.test(firstFieldAfterSemicolons)) {
                hierarchy.subKomponen = normalizeSubKomponen(firstFieldAfterSemicolons);
              }
            } else if (leadingSemicolons === 5) {
              // Level 5: ;;;;;052.0A; → Sub-komponen (alternative format, can be 1-3 digit)
              if (/^\d{1,3}(\.\d{1,2}[A-Z])?$/.test(firstFieldAfterSemicolons)) {
                hierarchy.subKomponen = normalizeSubKomponen(firstFieldAfterSemicolons);
              }
            } else if (leadingSemicolons === 7) {
              // Level 7: ;;;;;;;524113; → Account code
              if (/^\d{6}$/.test(firstFieldAfterSemicolons)) {
                hierarchy.akun = firstFieldAfterSemicolons;
              }
            } else if (leadingSemicolons >= 11) {
              // Level 11+: ;;;;;;;;;;;;;000001. text... → Item description with value
              
              // Extract TWO values from different columns:
              // 1. Column 24 (index 23) = "Periode Ini" (Monthly Period value for RPD)
              let periodeIni = 0;
              if (parts.length > 23) {
                const periodeIniValue = parts[23];
                const numValue = parseFloat(periodeIniValue.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
                if (!isNaN(numValue) && numValue >= 0) {
                  periodeIni = numValue;
                }
              }
              
              // 2. Column AE (index 30) = "SISA ANGGARAN" (Remaining Budget for budget_items)
              let sisaAnggaran = 0;
              if (parts.length > 30) {
                const sisaAnggaranValue = parts[30];
                const numValue = parseFloat(sisaAnggaranValue.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
                if (!isNaN(numValue) && numValue >= 0) {
                  sisaAnggaran = numValue;
                }
              }

              // Extract uraian (description) - usually in format XXXXXX. text
              let uraian = '';
              for (const part of parts) {
                if (/^\d{6,}\./.test(part) || /^000\d{3}\./.test(part)) {
                  uraian = stripUraianPrefix(part);
                  break;
                }
              }

              // Only create item if we have valid uraian and hierarchy is complete
              // Note: periodeIni and sisaAnggaran can be 0, which is valid
              if (uraian && hierarchy.program && hierarchy.kegiatan) {
                // Ensure sub_komponen is always 3-digit normalized
                // Always apply normalizeSubKomponen to ensure consistent 3-digit format (001, 002, etc.)
                let normalizedSubKomponen = normalizeSubKomponen(hierarchy.subKomponen);
                
                // Append program code to sub_komponen ONLY for specific values: 051, 053, 054
                // e.g., "051" + "GG" → "051_GG"
                if (normalizedSubKomponen && ['051', '053', '054'].includes(normalizedSubKomponen) && hierarchy.program) {
                  const programCode = hierarchy.program.split('.').pop(); // Get last part (GG from 054.01.GG)
                  normalizedSubKomponen = `${normalizedSubKomponen}_${programCode}`;
                  console.log(`[parseMonthlyCSV] Sub-komponen with program (special): ${normalizedSubKomponen}`);
                }

                const item: ParsedMonthlyItem = {
                  program: hierarchy.programFull,
                  kegiatan: hierarchy.kegiatan,
                  rincianOutput: hierarchy.rincianOutput,
                  komponenOutput: hierarchy.komponenOutput,
                  subKomponen: normalizedSubKomponen,
                  akun: hierarchy.akun,
                  uraian: uraian,
                  periodeIni: periodeIni,        // Column 24 value for RPD
                  sisaAnggaran: sisaAnggaran,    // Column AE value for budget_items
                };

                items.push(item);
                stats.itemsParsed++;

                if (items.length <= 3) {
                  console.log(`[parseMonthlyCSV] Item ${items.length}:`, {
                    program: item.program,
                    kegiatan: item.kegiatan,
                    rincianOutput: item.rincianOutput,
                    komponenOutput: item.komponenOutput,
                    subKomponen: item.subKomponen,
                    akun: item.akun,
                    uraian: item.uraian.substring(0, 40),
                    sisaAnggaran: item.sisaAnggaran,
                  });
                }
              } else if (uraian) {
                if (!hierarchy.program) {
                  warnings.push(`Row ${i + 1}: Program not set, skipping item: ${uraian.substring(0, 30)}`);
                }
                if (!hierarchy.kegiatan) {
                  warnings.push(`Row ${i + 1}: Kegiatan not set, skipping item: ${uraian.substring(0, 30)}`);
                }
                stats.skippedRows++;
              }
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

    reader.readAsText(file);
  });
};

/**
 * Normalize untuk matching - sama dengan normalizeForMatching di google-sheets function
 * Handles: "2" → "002", "51.0A" → "051", "051_GG" → "051_gg" etc.
 */
function normalizeForMatching(value: any): string {
  if (!value) return '';
  
  const str = String(value).toLowerCase().trim();
  
  // Normalize sub_komponen to 3 digits (pad with zeros)
  if (/^\d+$/.test(str)) {
    return str.padStart(3, '0');
  }
  
  // Handle format like "51.0A" - extract just digits and normalize
  const digitMatch = str.match(/^(\d+)/);
  if (digitMatch) {
    const numPart = digitMatch[1].padStart(3, '0');
    const suffix = str.substring(digitMatch[1].length);
    // Keep suffix like _.GG but remove .0A type suffixes for matching
    if (suffix.startsWith('_')) {
      return numPart + suffix;
    }
    return numPart; // Ignore .0A suffix for matching purposes
  }
  
  // Strip kode prefix like "000081. " or "81. "
  const withoutPrefix = str.replace(/^\d+\.\s*/, '');
  
  return withoutPrefix;
}

/**
 * Create unique key dari item untuk matching
 * CRITICAL: Normalize sub_komponen to ensure consistent matching between CSV and DB
 */
export const createUniqueKey = (item: ParsedMonthlyItem | any): string => {
  const subKompValue = item.subKomponen || item.sub_komponen || '';
  
  return [
    item.program || item.program_pembebanan || '',
    item.kegiatan || '',
    item.rincianOutput || item.rincian_output || '',
    item.komponenOutput || item.komponen_output || '',
    normalizeForMatching(subKompValue), // NORMALIZE sub_komponen here!
    item.akun || '',
    item.uraian || '',
  ]
    .map((s) => {
      // Don't normalize again if it's already normalized
      const str = String(s || '').toLowerCase().trim();
      // Only normalize if it's not already the sub_komponen field (which we already normalized)
      return s !== subKompValue ? str : str;
    })
    .join('|');
};
