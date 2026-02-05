/**
 * Utility to seed 2026 data by copying 2025 data
 * Run this once to populate rekap_dashboard with 2026 entries
 * 
 * Usage in browser console:
 * import { seedSikostik2026 } from '@/utils/seed-sikostik-2026'
 * await seedSikostik2026()
 */

import { supabase } from '@/integrations/supabase/client';

const SIKOSTIK_SPREADSHEET_ID = "1cBuo9tAtpGvKuThvotIQqd9HDvJfF2Hun61oGYhRtHk";

async function getGoogleSheetData(sheetName: string) {
  try {
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: SIKOSTIK_SPREADSHEET_ID,
        operation: "read",
        range: sheetName
      }
    });

    if (error) throw error;
    
    const rows = data?.values || [];
    if (rows.length <= 1) return { headers: [], data: [] };
    
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    return { headers, data: dataRows };
  } catch (err) {
    console.error(`Error fetching ${sheetName}:`, err);
    throw err;
  }
}

function rowToObject(headers: string[], row: any[]) {
  const obj: any = {};
  headers.forEach((header: string, index: number) => {
    const key = header.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    obj[key] = row[index] ?? '';
  });
  return obj;
}

function objectToRow(obj: any, headers: string[]): any[] {
  return headers.map(header => {
    const key = header.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    return obj[key] ?? '';
  });
}

export async function seedSikostik2026() {
  console.log('Starting Sikostik28 2026 data seeding...');
  
  try {
    // Step 1: Fetch all existing data from rekap_dashboard
    console.log('Step 1: Fetching existing rekap_dashboard data...');
    const { headers, data: allRows } = await getGoogleSheetData('rekap_dashboard');
    
    if (headers.length === 0) {
      throw new Error('Could not fetch rekap_dashboard headers');
    }
    
    console.log(`Found ${allRows.length} total rows with headers:`, headers);
    
    // Step 2: Find 2025 data
    const tahunColumnIndex = headers.findIndex(h => 
      h.toLowerCase().includes('tahun') && h.toLowerCase().includes('periode')
    );
    
    if (tahunColumnIndex === -1) {
      throw new Error('Could not find periode_tahun column in headers');
    }
    
    console.log(`Found periode_tahun at column ${tahunColumnIndex}`);
    
    // Step 3: Filter 2025 rows
    const rows2025 = allRows.filter(row => {
      const tahun = parseInt(row[tahunColumnIndex] || 0);
      return tahun === 2025;
    });
    
    console.log(`Found ${rows2025.length} rows with year 2025`);
    
    if (rows2025.length === 0) {
      throw new Error('No 2025 data found to copy');
    }
    
    // Step 4: Create 2026 rows by copying and modifying
    const rows2026 = rows2025.map(row => {
      const newRow = [...row];
      newRow[tahunColumnIndex] = '2026'; // Change year to 2026
      return newRow;
    });
    
    console.log(`Created ${rows2026.length} rows for 2026`);
    console.log('Sample 2026 row:', rows2026[0]);
    
    // Step 5: Append 2026 rows to sheet
    console.log('Step 5: Appending 2026 data to rekap_dashboard...');
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: SIKOSTIK_SPREADSHEET_ID,
        operation: "append",
        range: "rekap_dashboard",
        values: rows2026
      }
    });
    
    if (error) throw error;
    
    console.log('✅ Successfully appended 2026 data');
    console.log('Append response:', data);
    
    return {
      success: true,
      message: `Successfully seeded ${rows2026.length} rows for 2026`,
      rowsAdded: rows2026.length
    };
    
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    throw err;
  }
}

/**
 * Alternative: Seed data for a specific period
 * Useful if you only want to populate specific months
 */
export async function seedSikostikPeriod(bulanStart: number, bulanEnd: number, tahun: number) {
  console.log(`Seeding data for ${bulanStart}-${bulanEnd}/${tahun}...`);
  
  try {
    const { headers, data: allRows } = await getGoogleSheetData('rekap_dashboard');
    
    if (headers.length === 0) {
      throw new Error('Could not fetch rekap_dashboard headers');
    }
    
    const tahunColumnIndex = headers.findIndex(h => 
      h.toLowerCase().includes('tahun') && h.toLowerCase().includes('periode')
    );
    const bulanColumnIndex = headers.findIndex(h => 
      h.toLowerCase().includes('bulan') && h.toLowerCase().includes('periode')
    );
    
    if (tahunColumnIndex === -1 || bulanColumnIndex === -1) {
      throw new Error('Could not find periode columns');
    }
    
    // Find existing data to copy from (use previous year same period)
    const previousTahun = tahun - 1;
    const sourceRows = allRows.filter(row => {
      const rowTahun = parseInt(row[tahunColumnIndex] || 0);
      const rowBulan = parseInt(row[bulanColumnIndex] || 0);
      return rowTahun === previousTahun && rowBulan >= bulanStart && rowBulan <= bulanEnd;
    });
    
    if (sourceRows.length === 0) {
      throw new Error(`No source data found for ${bulanStart}-${bulanEnd}/${previousTahun}`);
    }
    
    // Create new rows
    const newRows = sourceRows.map(row => {
      const newRow = [...row];
      newRow[tahunColumnIndex] = tahun.toString();
      return newRow;
    });
    
    console.log(`Created ${newRows.length} rows for ${tahun}`);
    
    // Append
    const { data, error } = await supabase.functions.invoke("google-sheets", {
      body: {
        spreadsheetId: SIKOSTIK_SPREADSHEET_ID,
        operation: "append",
        range: "rekap_dashboard",
        values: newRows
      }
    });
    
    if (error) throw error;
    
    console.log(`✅ Successfully seeded period ${bulanStart}-${bulanEnd}/${tahun}`);
    
    return {
      success: true,
      message: `Seeded ${newRows.length} rows for ${bulanStart}-${bulanEnd}/${tahun}`,
      rowsAdded: newRows.length
    };
    
  } catch (err) {
    console.error('Error during period seeding:', err);
    throw err;
  }
}
