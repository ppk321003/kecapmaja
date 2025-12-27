// lib/api/rpd-api.ts
import { SheetData } from '@/types/rpd'

const RPD_SPREADSHEET_ID = '1aG743mQVL7iR6NDbulDBPsFAQJCMGZH0nj9RLWTtPvE'

/**
 * Get latest RPD sheet name (RPD-DD/MM/YYYY)
 */
async function getLatestRPDSheet(): Promise<string> {
  // Ini perlu disesuaikan dengan cara Anda mendapatkan sheet terbaru
  // Contoh: Ambil semua sheet, cari yang namanya RPD-, sort by date
  // Atau bisa dari API endpoint khusus
  
  // Untuk sekarang, return default
  return 'RPD-27/12/2025' // Ganti dengan logika yang sesuai
}

/**
 * Fetch RPD data from Google Sheets
 */
export async function fetchRPDData(): Promise<SheetData> {
  try {
    const sheetName = await getLatestRPDSheet()
    
    const response = await fetch('/api/google-sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Tambahkan header auth jika diperlukan
      },
      body: JSON.stringify({
        spreadsheetId: RPD_SPREADSHEET_ID,
        operation: 'read',
        range: `${sheetName}!A3:V1000`, // Adjust range as needed
      }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching RPD data:', error)
    throw error
  }
}

/**
 * Update RPD data for specific row and month
 */
export async function updateRPDMonth(
  rowIndex: number,
  monthColumn: string, // 'H' untuk Januari, 'I' untuk Februari, dst
  value: number
): Promise<void> {
  try {
    const sheetName = await getLatestRPDSheet()
    
    const response = await fetch('/api/google-sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spreadsheetId: RPD_SPREADSHEET_ID,
        operation: 'update',
        range: `${sheetName}!${monthColumn}${rowIndex}`,
        rowIndex,
        values: [[value]],
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Update failed: ${response.status}`)
    }
    
    await response.json()
  } catch (error) {
    console.error('Error updating RPD data:', error)
    throw error
  }
}

/**
 * Update multiple months at once
 */
export async function updateRPDRow(
  rowIndex: number,
  monthlyData: Record<string, number>
): Promise<void> {
  try {
    const sheetName = await getLatestRPDSheet()
    
    // Map bulan ke kolom spreadsheet
    const monthToColumn: Record<string, string> = {
      januari: 'H',
      februari: 'I',
      maret: 'J',
      april: 'K',
      mei: 'L',
      juni: 'M',
      juli: 'N',
      agustus: 'O',
      september: 'P',
      oktober: 'Q',
      november: 'R',
      desember: 'S',
    }
    
    // Update per kolom
    const updates = Object.entries(monthlyData).map(([month, value]) => ({
      column: monthToColumn[month],
      value
    }))
    
    // Lakukan update satu per satu atau batch jika API mendukung
    for (const update of updates) {
      await updateRPDMonth(rowIndex, update.column, update.value)
    }
    
  } catch (error) {
    console.error('Error updating RPD row:', error)
    throw error
  }
}