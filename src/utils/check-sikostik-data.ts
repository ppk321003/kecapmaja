/**
 * Check what data exists in rekap_dashboard
 * Run in browser console:
 * import { checkSikostikData } from '@/utils/check-sikostik-data'
 * await checkSikostikData()
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

export async function checkSikostikData() {
  console.log('🔍 Checking Sikostik data...');
  
  try {
    const { headers, data: allRows } = await getGoogleSheetData('rekap_dashboard');
    
    if (headers.length === 0) {
      console.error('❌ Could not fetch rekap_dashboard');
      return;
    }
    
    console.log(`📊 Total rows: ${allRows.length}`);
    console.log(`📋 Headers (first 20): `, headers.slice(0, 20));
    
    // Find period columns
    const tahunColIdx = headers.findIndex(h => 
      h.toLowerCase().includes('tahun') && h.toLowerCase().includes('periode')
    );
    const bulanColIdx = headers.findIndex(h => 
      h.toLowerCase().includes('bulan') && h.toLowerCase().includes('periode')
    );
    const anggotaColIdx = headers.findIndex(h => 
      h.toLowerCase().includes('anggota') && h.toLowerCase().includes('id')
    );
    
    console.log(`📍 Column indices: tahun=${tahunColIdx}, bulan=${bulanColIdx}, anggota=${anggotaColIdx}`);
    
    // Group by tahun
    const byTahun: any = {};
    const byTahunAndBulan: any = {};
    
    allRows.forEach((row: any) => {
      const tahun = parseInt(row[tahunColIdx] || 0);
      const bulan = parseInt(row[bulanColIdx] || 0);
      
      if (!byTahun[tahun]) byTahun[tahun] = 0;
      byTahun[tahun]++;
      
      const key = `${tahun}-${String(bulan).padStart(2, '0')}`;
      if (!byTahunAndBulan[key]) byTahunAndBulan[key] = 0;
      byTahunAndBulan[key]++;
    });
    
    console.log('📅 Data by year:', byTahun);
    console.log('📅 Data by year-month:', byTahunAndBulan);
    
    // Check for 2026 data
    const data2026 = allRows.filter((row: any) => parseInt(row[tahunColIdx] || 0) === 2026);
    const data2025 = allRows.filter((row: any) => parseInt(row[tahunColIdx] || 0) === 2025);
    
    console.log(`📅 2025 rows: ${data2025.length}`);
    console.log(`📅 2026 rows: ${data2026.length}`);
    
    if (data2026.length === 0) {
      console.warn('⚠️  No 2026 data found! You need to run seed-sikostik-2026 first.');
      return;
    }
    
    // Check Feb 2026 specifically
    const feb2026 = data2026.filter((row: any) => parseInt(row[bulanColIdx] || 0) === 2);
    console.log(`📅 February 2026 rows: ${feb2026.length}`);
    
    if (feb2026.length === 0) {
      console.warn('⚠️  No February 2026 data found!');
      console.log('Available months in 2026:', 
        [...new Set(data2026.map((row: any) => parseInt(row[bulanColIdx] || 0)))]
          .sort((a, b) => a - b)
      );
    }
    
    console.log('✅ Data check complete');
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}
