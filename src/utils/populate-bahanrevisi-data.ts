/**
 * Simple helper script to populate Bahan Revisi data
 * Run this in browser console or as a utility function
 */

import { populateAllSheets, verifyPopulatedData } from './bahanrevisi-population';

/**
 * Main function to populate data - call from browser console
 * Usage: window.populateBahanRevisiData('<spreadsheet-id>')
 */
export async function populateBahanRevisiData(spreadsheetId: string) {
  if (!spreadsheetId) {
    console.error('❌ Spreadsheet ID required');
    return null;
  }

  console.log('🚀 Mulai populate data Bahan Revisi ke:', spreadsheetId);
  
  try {
    // Populate all sheets
    const results = await populateAllSheets(spreadsheetId);
    
    console.log('\n📊 HASIL POPULATE:');
    console.table(results.map(r => ({
      Sheet: r.sheet,
      Status: r.success ? '✅ SUCCESS' : '❌ ERROR',
      Message: r.message,
      Rows: r.rowsAdded || '-'
    })));

    // Verify some data
    console.log('\n🔍 Verifying populated data...');
    const verifyResults = await Promise.all([
      verifyPopulatedData(spreadsheetId, 'programs'),
      verifyPopulatedData(spreadsheetId, 'budget_items'),
      verifyPopulatedData(spreadsheetId, 'rpd_items')
    ]);

    console.log('\n✅ VERIFICATION:');
    verifyResults.forEach((vr, idx) => {
      const sheets = ['programs', 'budget_items', 'rpd_items'];
      console.log(`  ${sheets[idx]}: ${vr.rowCount} baris`);
    });

    const successCount = results.filter(r => r.success).length;
    const summary = successCount === results.length 
      ? `✅ Semua ${results.length} sheets berhasil diisi!`
      : `⚠️ ${successCount}/${results.length} sheets berhasil`;
    
    console.log(`\n${summary}`);
    return { success: successCount === results.length, results };

  } catch (error: any) {
    console.error('❌ Error saat populate:', error);
    return null;
  }
}

// Expose globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).populateBahanRevisiData = populateBahanRevisiData;
}
