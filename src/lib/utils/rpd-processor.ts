// lib/utils/rpd-processor.ts
import { RPDItem, SheetData } from '@/types/rpd'

/**
 * Process Google Sheets data to RPDItem array
 */
export function processSheetData(sheetData: SheetData): RPDItem[] {
  if (!sheetData.values || !Array.isArray(sheetData.values)) {
    return []
  }

  const items: RPDItem[] = []
  
  // Data mulai dari baris 3 (index 2)
  for (let i = 2; i < sheetData.values.length; i++) {
    const row = sheetData.values[i]
    if (!row || row.length < 7) continue
    
    // Check if row is active (contains "-" and not KPPN)
    const deskripsi = (row[1] || '').toString()
    const containsDash = /[-–—−]/.test(deskripsi)
    const containsKPPN = deskripsi.toUpperCase().includes('KPPN')
    const isActive = containsDash && !containsKPPN
    
    // Parse kode (remove leading apostrophe)
    const rawKode = (row[0] || '').toString().trim()
    const kode = rawKode.startsWith("'") ? rawKode.substring(1) : rawKode
    
    // Parse numbers
    const volume = parseIndonesianNumber(row[3])
    const hargaSatuan = parseIndonesianNumber(row[5])
    const pagu = parseIndonesianNumber(row[6])
    
    // Parse RPD monthly data (columns H-S, index 7-18)
    const rpdMonthly = {
      januari: parseIndonesianNumber(row[7] || 0),
      februari: parseIndonesianNumber(row[8] || 0),
      maret: parseIndonesianNumber(row[9] || 0),
      april: parseIndonesianNumber(row[10] || 0),
      mei: parseIndonesianNumber(row[11] || 0),
      juni: parseIndonesianNumber(row[12] || 0),
      juli: parseIndonesianNumber(row[13] || 0),
      agustus: parseIndonesianNumber(row[14] || 0),
      september: parseIndonesianNumber(row[15] || 0),
      oktober: parseIndonesianNumber(row[16] || 0),
      november: parseIndonesianNumber(row[17] || 0),
      desember: parseIndonesianNumber(row[18] || 0),
    }
    
    // Calculate totals
    const totalRPD = Object.values(rpdMonthly).reduce((sum, val) => sum + val, 0)
    const selisih = pagu - totalRPD
    
    // Parse timestamp
    const lastUpdated = row[21] ? row[21].toString() : undefined
    
    items.push({
      id: (i + 1).toString(), // Row number sebagai ID
      kode,
      uraian: `${row[1] || ''} ${row[2] || ''}`.trim(),
      volume,
      satuan: (row[4] || '').toString().trim(),
      hargaSatuan,
      pagu,
      rpdMonthly,
      totalRPD,
      selisih,
      lastUpdated,
      isActive
    })
  }
  
  return items
}

/**
 * Parse Indonesian number format (1.000.000,00 -> 1000000)
 */
function parseIndonesianNumber(value: any): number {
  if (!value && value !== 0) return 0
  
  const str = value.toString().trim()
  if (str === '' || str === '-') return 0
  
  // Remove thousand separators and replace decimal comma with dot
  const clean = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(clean)
  
  return isNaN(num) ? 0 : Math.round(num)
}