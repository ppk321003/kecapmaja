/**
 * Utility untuk mengisi Google Sheets dengan sample data
 * Digunakan untuk setup awal sistem Bahan Revisi Anggaran
 */

import { supabase } from '@/integrations/supabase/client';
import {
  SAMPLE_PROGRAMS,
  SAMPLE_KEGIATANS,
  SAMPLE_RINCIAN_OUTPUTS,
  SAMPLE_KOMPONEN_OUTPUTS,
  SAMPLE_SUB_KOMPONEN,
  SAMPLE_AKUNS,
  SAMPLE_BUDGET_ITEMS,
  SAMPLE_RPD_ITEMS
} from './bahanrevisi-sample-data';

interface PopulationResult {
  success: boolean;
  sheet: string;
  message: string;
  rowsAdded?: number;
  error?: string;
}

/**
 * Clear existing data in a sheet (except headers)
 */
export const clearSheet = async (
  spreadsheetId: string,
  sheetName: string
): Promise<PopulationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        action: 'clear',
        spreadsheetId,
        range: `${sheetName}!A2:AI1000`
      }
    });

    if (error) {
      return {
        success: false,
        sheet: sheetName,
        message: `Gagal menghapus data: ${error.message}`,
        error: error.message
      };
    }

    return {
      success: true,
      sheet: sheetName,
      message: `Data di sheet ${sheetName} berhasil dihapus`
    };
  } catch (err: any) {
    return {
      success: false,
      sheet: sheetName,
      message: `Error: ${err.message}`,
      error: err.message
    };
  }
};

/**
 * Populate a sheet with data
 */
export const populateSheet = async (
  spreadsheetId: string,
  sheetName: string,
  data: (string | number | boolean)[][]
): Promise<PopulationResult> => {
  try {
    if (!data || data.length === 0) {
      return {
        success: false,
        sheet: sheetName,
        message: 'Data kosong',
        error: 'No data provided'
      };
    }

    const range = `${sheetName}!A1:AI${data.length}`;

    const { data: result, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        action: 'write',
        spreadsheetId,
        range,
        values: data
      }
    });

    if (error) {
      return {
        success: false,
        sheet: sheetName,
        message: `Gagal mengisi data: ${error.message}`,
        error: error.message
      };
    }

    const rowsAdded = data.length - 1; // Exclude header
    return {
      success: true,
      sheet: sheetName,
      message: `Sheet ${sheetName} berhasil diisi dengan ${rowsAdded} baris data`,
      rowsAdded
    };
  } catch (err: any) {
    return {
      success: false,
      sheet: sheetName,
      message: `Error: ${err.message}`,
      error: err.message
    };
  }
};

/**
 * Populate master data sheets
 */
export const populateMasterSheets = async (
  spreadsheetId: string
): Promise<PopulationResult[]> => {
  const results: PopulationResult[] = [];

  const masterDataSets = [
    { sheet: 'programs', data: SAMPLE_PROGRAMS },
    { sheet: 'kegiatans', data: SAMPLE_KEGIATANS },
    { sheet: 'rincian_outputs', data: SAMPLE_RINCIAN_OUTPUTS },
    { sheet: 'komponen_outputs', data: SAMPLE_KOMPONEN_OUTPUTS },
    { sheet: 'sub_komponen', data: SAMPLE_SUB_KOMPONEN },
    { sheet: 'akuns', data: SAMPLE_AKUNS }
  ];

  for (const { sheet, data } of masterDataSets) {
    const result = await populateSheet(spreadsheetId, sheet, data);
    results.push(result);

    if (!result.success) {
      console.error(`Failed to populate ${sheet}:`, result.error);
    }
  }

  return results;
};

/**
 * Populate transaction data sheets
 */
export const populateTransactionSheets = async (
  spreadsheetId: string
): Promise<PopulationResult[]> => {
  const results: PopulationResult[] = [];

  // Populate budget_items
  const budgetResult = await populateSheet(
    spreadsheetId,
    'budget_items',
    SAMPLE_BUDGET_ITEMS
  );
  results.push(budgetResult);

  // Populate rpd_items
  const rpdResult = await populateSheet(
    spreadsheetId,
    'rpd_items',
    SAMPLE_RPD_ITEMS
  );
  results.push(rpdResult);

  return results;
};

/**
 * Main function to populate all sheets
 */
export const populateAllSheets = async (
  spreadsheetId: string
): Promise<PopulationResult[]> => {
  const results: PopulationResult[] = [];

  console.log('🚀 Memulai pengisian data Google Sheets...');
  console.log(`📋 Spreadsheet ID: ${spreadsheetId}`);

  try {
    // Populate master sheets first
    console.log('\n1️⃣ Mengisi master data (Programs, Kegiatans, Akuns, dll)...');
    const masterResults = await populateMasterSheets(spreadsheetId);
    results.push(...masterResults);

    // Check if master sheets were populated successfully
    const masterSuccess = masterResults.every(r => r.success);
    if (!masterSuccess) {
      console.warn('⚠️ Beberapa master sheet gagal diisi');
    }

    // Populate transaction sheets
    console.log('\n2️⃣ Mengisi data transaksi (Budget Items, RPD Items)...');
    const transactionResults = await populateTransactionSheets(spreadsheetId);
    results.push(...transactionResults);

    // Summary
    console.log('\n✅ Pengisian data selesai!');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    console.log(`📊 ${successCount}/${totalCount} sheets berhasil diisi`);

  } catch (err: any) {
    console.error('❌ Error saat mengisi data:', err);
    results.push({
      success: false,
      sheet: 'general',
      message: `Fatal error: ${err.message}`,
      error: err.message
    });
  }

  return results;
};

/**
 * Helper function untuk testing - populate sample data ke satker tertentu
 */
export const populateSatkerData = async (
  satkerSheetId: string
): Promise<{
  success: boolean;
  results: PopulationResult[];
  summary: string;
}> => {
  console.log(`\n🔄 Mengisi data untuk satker dengan Sheet ID: ${satkerSheetId}`);

  const results = await populateAllSheets(satkerSheetId);

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  const summary = successCount === results.length
    ? `✅ Semua ${results.length} sheets berhasil diisi!`
    : `⚠️ ${successCount}/${results.length} sheets berhasil diisi. ${failedCount} gagal.`;

  return {
    success: failedCount === 0,
    results,
    summary
  };
};

/**
 * Utility untuk verify data setelah populate
 */
export const verifyPopulatedData = async (
  spreadsheetId: string,
  sheetName: string
): Promise<{
  success: boolean;
  rowCount: number;
  data?: (string | number | boolean)[][];
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        action: 'read',
        spreadsheetId,
        range: `${sheetName}!A1:Z100`
      }
    });

    if (error) {
      return {
        success: false,
        rowCount: 0,
        error: error.message
      };
    }

    return {
      success: true,
      rowCount: data?.values?.length || 0,
      data: data?.values
    };
  } catch (err: any) {
    return {
      success: false,
      rowCount: 0,
      error: err.message
    };
  }
};
