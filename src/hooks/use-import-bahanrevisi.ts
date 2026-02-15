/**
 * Custom hook untuk import Bahan Revisi Anggaran dari Excel
 * Dengan validasi dan Google Sheets integration
 */

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { BudgetItem, RPDItem } from '@/types/bahanrevisi';
import { supabase } from '@/integrations/supabase/client';
import {
  findHeaderRow,
  mapColumnIndices,
  processBahanRevisiRows,
  getFriendlyColumnNames,
} from '@/utils/bahanrevisi-excel-utils';

interface UseImportBahanRevisiProps {
  sheetId: string | null;
  onImportSuccess: (budgetItems: Partial<BudgetItem>[], rpdItems: Partial<RPDItem>[]) => void;
  komponenOutput?: string;
  subKomponen?: string;
  akun?: string;
}

interface ImportValidationError {
  type: 'format' | 'validation' | 'upload';
  message: string;
  details?: string[];
}

export const useImportBahanRevisi = ({
  sheetId,
  onImportSuccess,
  komponenOutput,
  subKomponen,
  akun,
}: UseImportBahanRevisiProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ImportValidationError[]>([]);

  const validateImportData = (
    budgetItems: Partial<BudgetItem>[],
    rpdItems: Partial<RPDItem>[]
  ): ImportValidationError[] => {
    const errors: ImportValidationError[] = [];

    // Validation 1: Budget items harus ada
    if (budgetItems.length === 0) {
      errors.push({
        type: 'validation',
        message: 'Tidak ada data budget items yang valid',
      });
    }

    // Validation 2: RPD items harus sesuai dengan budget items
    if (budgetItems.length !== rpdItems.length) {
      errors.push({
        type: 'validation',
        message: `Ketidaksesuaian jumlah items: ${budgetItems.length} budget items vs ${rpdItems.length} RPD items`,
        details: ['Setiap baris data harus menghasilkan budget item dan RPD item yang sesuai. Periksa apakah ada baris dengan data yang incomplete atau hilang.'],
      });
    }

    // Validation 3: Check semua items punya hierarchy fields minimal
    const hierarchyFields = ['program_pembebanan', 'kegiatan', 'komponen_output', 'akun'];
    const itemsWithMissingHierarchy = budgetItems.filter((item) =>
      hierarchyFields.some((field) => !item[field as keyof BudgetItem])
    );

    if (itemsWithMissingHierarchy.length > 0) {
      errors.push({
        type: 'validation',
        message: `${itemsWithMissingHierarchy.length} items tidak memiliki data hierarchy lengkap (Program, Kegiatan, Komponen, Akun)`,
        details: [`Pastikan semua kolom hierarchy terisi`],
      });
    }

    // Validation 4: Total RPD tidak boleh melebihi jumlah_menjadi
    const rpdExcessItems = rpdItems.filter(
      (rpdItem) => (rpdItem.total_rpd || 0) > (rpdItem.total_pagu || 0)
    );

    if (rpdExcessItems.length > 0) {
      errors.push({
        type: 'validation',
        message: `${rpdExcessItems.length} items memiliki total RPD melebihi target pagu`,
        details: rpdExcessItems.slice(0, 3).map((item) => {
          const uraian = typeof item.uraian === 'string' ? item.uraian : String(item.uraian || 'Unknown');
          return `${uraian}: ${item.total_rpd} > ${item.total_pagu}`;
        }),
      });
    }

    // Validation 5: Volume dan harga tidak boleh negatif
    const negativeItems = budgetItems.filter(
      (item) =>
        (item.volume_menjadi || 0) < 0 || (item.harga_satuan_menjadi || 0) < 0
    );

    if (negativeItems.length > 0) {
      errors.push({
        type: 'validation',
        message: `${negativeItems.length} items memiliki volume atau harga yang negatif`,
        details: negativeItems.slice(0, 3).map((item) => {
          const uraian = typeof item.uraian === 'string' ? item.uraian : String(item.uraian || 'Unknown');
          return uraian;
        }),
      });
    }

    return errors;
  };

  const uploadToGoogleSheets = async (
    budgetItems: Partial<BudgetItem>[],
    rpdItems: Partial<RPDItem>[]
  ): Promise<void> => {
    if (!sheetId) {
      throw new Error('Sheet ID tidak ditemukan');
    }

    try {
      // Prepare budget items data for Google Sheets
      const budgetItemsData = budgetItems.map((item) => [
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
        item.submitted_by || '',
        item.submitted_date || '',
        item.updated_date || '',
        item.notes || '',
      ]);

      // Prepare RPD items data
      const rpdItemsData = rpdItems.map((item) => [
        item.id || '',
        item.program_pembebanan || '',
        item.kegiatan || '',
        item.komponen_output || '',
        item.sub_komponen || '',
        item.akun || '',
        item.uraian || '',
        item.total_pagu || 0,
        item.jan || 0,
        item.feb || 0,
        item.mar || 0,
        item.apr || 0,
        item.may || 0,
        item.jun || 0,
        item.jul || 0,
        item.aug || 0,
        item.sep || 0,
        item.oct || 0,
        item.nov || 0,
        item.dec || 0,
        item.total_rpd || 0,
        item.sisa_anggaran || 0,
        item.status || '',
        item.modified_date || '',
      ]);

      // Upload budget items
      console.log('[uploadToGoogleSheets] Uploading', budgetItemsData.length, 'budget items...');
      console.log('[uploadToGoogleSheets] First budget item:', budgetItemsData[0]);
      
      const budgetResult = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: sheetId,
          operation: 'append',
          range: 'budget_items',
          values: budgetItemsData,
        },
      });

      console.log('[uploadToGoogleSheets] Budget result:', budgetResult);
      
      if (budgetResult.error) {
        console.error('[uploadToGoogleSheets] Budget items error:', budgetResult.error);
        throw new Error(`Gagal upload budget items: ${JSON.stringify(budgetResult.error)}`);
      }
      
      if (!budgetResult.data) {
        console.error('[uploadToGoogleSheets] Budget result has no data:', budgetResult);
        throw new Error('Gagal upload budget items: Supabase function returned no data');
      }
      
      if (budgetResult.data?.error) {
        console.error('[uploadToGoogleSheets] Budget items data error:', budgetResult.data.error);
        throw new Error(`Gagal upload budget items: ${budgetResult.data.error}`);
      }
      
      console.log('[uploadToGoogleSheets] Budget items response successful:', budgetResult.data);

      // Upload RPD items
      console.log('[uploadToGoogleSheets] Uploading', rpdItemsData.length, 'RPD items...');
      console.log('[uploadToGoogleSheets] First RPD item:', rpdItemsData[0]);
      
      const rpdResult = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: sheetId,
          operation: 'append',
          range: 'rpd_items',
          values: rpdItemsData,
        },
      });

      console.log('[uploadToGoogleSheets] RPD result:', rpdResult);
      
      if (rpdResult.error) {
        console.error('[uploadToGoogleSheets] RPD items error:', rpdResult.error);
        throw new Error(`Gagal upload RPD items: ${JSON.stringify(rpdResult.error)}`);
      }
      
      if (!rpdResult.data) {
        console.error('[uploadToGoogleSheets] RPD result has no data:', rpdResult);
        throw new Error('Gagal upload RPD items: Supabase function returned no data');
      }
      
      if (rpdResult.data?.error) {
        console.error('[uploadToGoogleSheets] RPD items data error:', rpdResult.data.error);
        throw new Error(`Gagal upload RPD items: ${rpdResult.data.error}`);
      }

      console.log('[uploadToGoogleSheets] RPD items response successful:', rpdResult.data);
    } catch (err) {
      console.error('[uploadToGoogleSheets] Error:', err);
      throw err;
    }
  };

  const handleImportFile = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setValidationErrors([]);

      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];

        // Convert to array
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (rows.length <= 1) {
          toast({
            title: 'Data tidak lengkap',
            description: 'File Excel tidak berisi data yang cukup',
            variant: 'destructive',
          });
          setIsImporting(false);
          return;
        }

        console.log('[handleImportFile] Loaded', rows.length, 'rows');

        // Find header row
        const { headerRowIndex, headerRowMatches } = findHeaderRow(rows);

        if (headerRowIndex === -1 || headerRowMatches < 3) {
          toast({
            title: 'Format tidak valid',
            description: 'File Excel tidak berisi header kolom yang diharapkan. Gunakan template yang disediakan.',
            variant: 'destructive',
          });
          setIsImporting(false);
          return;
        }

        // Map columns
        const { columnIndices, missingRequiredColumns } = mapColumnIndices(rows[headerRowIndex]);

        if (missingRequiredColumns.length > 0) {
          const missingDisplay = getFriendlyColumnNames(missingRequiredColumns);
          toast({
            title: 'Kolom tidak lengkap',
            description: `Kolom berikut tidak ditemukan: ${missingDisplay}`,
            variant: 'destructive',
          });
          setIsImporting(false);
          return;
        }

        // Process data
        const { budgetItems, rpdItems, errors: processErrors } = processBahanRevisiRows(
          rows,
          headerRowIndex,
          columnIndices,
          komponenOutput,
          subKomponen,
          akun
        );

        // Validate processed data
        const validationErrs = validateImportData(budgetItems, rpdItems);

        if (validationErrs.length > 0) {
          setValidationErrors([...processErrors.map((e) => ({
            type: 'validation' as const,
            message: e,
          })), ...validationErrs]);

          toast({
            title: 'Data Validation Errors',
            description: `Ditemukan ${validationErrs.length} error. Silakan periksa data Anda.`,
            variant: 'destructive',
          });
          setIsImporting(false);
          return;
        }

        if (processErrors.length > 0) {
          console.warn('[handleImportFile] Processing errors:', processErrors);
          setValidationErrors(
            processErrors.map((e) => ({
              type: 'validation' as const,
              message: e,
            }))
          );
          
          // Show warning toast for processing errors
          toast({
            title: 'Peringatan Processing',
            description: `${processErrors.length} error ditemukan saat memproses data: ${processErrors.slice(0, 2).join('; ')}${processErrors.length > 2 ? '...' : ''}`,
            variant: 'destructive',
          });
          setIsImporting(false);
          return;
        }

        // Upload to Google Sheets
        console.log('[handleImportFile] Starting upload to Google Sheets...');
        await uploadToGoogleSheets(budgetItems, rpdItems);
        console.log('[handleImportFile] Upload completed successfully');
        
        // Wait a moment for Google Sheets to process the write
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[handleImportFile] Waited 2 seconds for Google Sheets to process');

        // Call success callback
        onImportSuccess(budgetItems, rpdItems);

        toast({
          title: 'Import berhasil',
          description: `Berhasil mengimport ${budgetItems.length} item anggaran dan ${rpdItems.length} RPD items.`,
        });
      } catch (error) {
        console.error('[handleImportFile] Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        toast({
          title: 'Import gagal',
          description: errorMessage,
          variant: 'destructive',
        });

        setValidationErrors([
          {
            type: 'upload',
            message: errorMessage,
          },
        ]);
      } finally {
        setIsImporting(false);
      }
    },
    [sheetId, komponenOutput, subKomponen, akun, onImportSuccess]
  );

  return {
    isImporting,
    validationErrors,
    handleImportFile,
    clearErrors: () => setValidationErrors([]),
  };
};

/**
 * Helper function untuk auto-generate RPD items dari budget items
 * Ketika user melakukan perubahan di budget, RPD harus update
 */
export const generateAutoRPDItems = (
  budgetItems: Partial<BudgetItem>[]
): Partial<RPDItem>[] => {
  return budgetItems.map((item) => ({
    id: item.id,
    program_pembebanan: item.program_pembebanan,
    kegiatan: item.kegiatan,
    komponen_output: item.komponen_output,
    sub_komponen: item.sub_komponen,
    akun: item.akun,
    uraian: item.uraian,
    total_pagu: item.jumlah_menjadi || 0,
    // Initialize dengan 0, akan di-isi oleh user
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
    total_rpd: 0,
    sisa_anggaran: item.jumlah_menjadi || 0,
    status: 'belum_isi',
    modified_date: new Date().toISOString(),
  }));
};

/**
 * Helper function untuk update RPD ketika budget berubah
 */
export const updateRPDFromBudgetChange = (
  rpdItem: Partial<RPDItem>,
  newJumlahMenjadi: number
): Partial<RPDItem> => {
  const monthFields = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

  const currentTotal = monthFields.reduce((sum, field) => sum + (rpdItem[field] || 0), 0);

  // Jika total RPD lebih besar dari budget baru, scale down proportionally
  let newMonthValues = { ...rpdItem };

  if (currentTotal > newJumlahMenjadi && currentTotal > 0) {
    const scaleFactor = newJumlahMenjadi / currentTotal;
    monthFields.forEach((field) => {
      newMonthValues[field] = Math.round((rpdItem[field] || 0) * scaleFactor / 1000) * 1000;
    });
  }

  // Update total pagu dan recalculate
  const newTotal = monthFields.reduce((sum, field) => sum + (newMonthValues[field] || 0), 0);

  newMonthValues.total_pagu = newJumlahMenjadi;
  newMonthValues.total_rpd = newTotal;
  newMonthValues.sisa_anggaran = newJumlahMenjadi - newTotal;

  // Update status
  if (newTotal === newJumlahMenjadi) {
    newMonthValues.status = 'ok';
  } else if (newTotal === 0) {
    newMonthValues.status = 'belum_isi';
  } else if (newTotal < newJumlahMenjadi) {
    newMonthValues.status = monthFields.every((f) => (newMonthValues[f] || 0) > 0) ? 'sisa' : 'belum_lengkap';
  }

  newMonthValues.modified_date = new Date().toISOString();

  return newMonthValues;
};
