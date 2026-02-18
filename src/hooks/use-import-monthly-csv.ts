/**
 * Custom hook untuk import CSV bulanan dan update sisa_anggaran
 * Dengan matching 7-field unique key dan Google Sheets integration
 */

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { BudgetItem } from '@/types/bahanrevisi';
import { supabase } from '@/integrations/supabase/client';
import { parseMonthlyCSV, ParsedMonthlyData, ParsedMonthlyItem, createUniqueKey } from '@/utils/bahanrevisi-monthly-csv-parser';
import { formatDateIndonesia } from '@/utils/bahanrevisi-calculations';

export interface MatchResult {
  matched: number;
  notMatched: number;
  matched_items: Array<{
    item: ParsedMonthlyItem;
    budgetItem: BudgetItem;
  }>;
  not_matched_items: Array<{
    item: ParsedMonthlyItem;
    reason: string;
  }>;
}

interface UseImportMonthlyCSVProps {
  sheetId: string | null;
  budgetItems: BudgetItem[];
  onImportSuccess: (result: MatchResult, parsedData: ParsedMonthlyData) => void;
}

interface ImportError {
  type: 'parse' | 'validation' | 'matching' | 'upload';
  message: string;
  details?: string[];
}

export const useImportMonthlyCSV = ({
  sheetId,
  budgetItems,
  onImportSuccess,
}: UseImportMonthlyCSVProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [parseProgress, setParseProgress] = useState<string>('');

  const matching = useCallback(
    (parsedData: ParsedMonthlyData): MatchResult => {
      const result: MatchResult = {
        matched: 0,
        notMatched: 0,
        matched_items: [],
        not_matched_items: [],
      };

      // Create map dari budget items untuk faster lookup
      const budgetItemMap = new Map<string, BudgetItem>();
      budgetItems.forEach((item) => {
        const key = createUniqueKey(item);
        budgetItemMap.set(key, item);
      });

      // Match parsed items dengan budget items
      parsedData.items.forEach((parsedItem) => {
        const key = createUniqueKey(parsedItem);
        const budgetItem = budgetItemMap.get(key);

        if (budgetItem) {
          result.matched++;
          result.matched_items.push({
            item: parsedItem,
            budgetItem: budgetItem,
          });
        } else {
          result.notMatched++;
          result.not_matched_items.push({
            item: parsedItem,
            reason: `Tidak ditemukan di BudgetItem (key: ${key.substring(0, 50)}...)`,
          });
        }
      });

      return result;
    },
    [budgetItems]
  );

  const handleImportFile = useCallback(
    async (file: File) => {
      const errors: ImportError[] = [];

      try {
        setIsImporting(true);
        setImportErrors([]);
        setParseProgress('Parsing CSV...');

        // Parse CSV
        const parsedData = await parseMonthlyCSV(file);

        if (parsedData.errors.length > 0) {
          parsedData.errors.forEach((err) => {
            errors.push({
              type: 'parse',
              message: err,
            });
          });
        }

        if (parsedData.items.length === 0) {
          errors.push({
            type: 'parse',
            message: 'Tidak ada items yang berhasil di-parse',
          });
          setImportErrors(errors);
          return;
        }

        setParseProgress(`Matching dengan BudgetItem (${parsedData.items.length} items)...`);

        // Matching
        const matchResult = matching(parsedData);

        setParseProgress('Validasi hasil matching...');

        // Validation
        if (matchResult.matched === 0) {
          errors.push({
            type: 'validation',
            message: 'Tidak ada item yang berhasil dimatching',
            details: [`${matchResult.notMatched} items tidak match. Cek format CSV atau BudgetItem.`],
          });
          setImportErrors(errors);
          return;
        }

        if (matchResult.notMatched > 0) {
          errors.push({
            type: 'validation',
            message: `⚠️ ${matchResult.notMatched} item(s) tidak berhasil dimatching (dari total ${parsedData.items.length})`,
            details: matchResult.not_matched_items.slice(0, 3).map((item) => {
              return `Program: ${item.item.program}, Akun: ${item.item.akun}, Uraian: ${item.item.uraian.substring(0, 40)}...`;
            }),
          });
        }

        // Upload ke Google Sheets
        if (!sheetId) {
          errors.push({
            type: 'upload',
            message: 'Sheet ID tidak ditemukan',
          });
          setImportErrors(errors);
          return;
        }

        setParseProgress('Upload ke Google Sheets...');

        // Prepare data untuk update
        const updateData = matchResult.matched_items.map((match) => {
          const updated = { ...match.budgetItem };
          updated.sisa_anggaran = match.item.sisaAnggaran;
          updated.updated_date = formatDateIndonesia(new Date().toISOString());
          return updated;
        });

        console.log('[useImportMonthlyCSV] Uploading', updateData.length, 'items to Google Sheets...');
        console.log('[useImportMonthlyCSV] First item sample:', updateData[0]);

        setParseProgress(`Calling edge function untuk ${updateData.length} items...`);

        // Call Google Sheets function
        console.log('[useImportMonthlyCSV] Invoking google-sheets function...');
        const uploadResult = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: sheetId,
            operation: 'update-sisa-anggaran',
            values: updateData,
            bulan: parsedData.bulan,
            tahun: parsedData.tahun,
          },
        });

        console.log('[useImportMonthlyCSV] Upload result received:', uploadResult);

        if (uploadResult.error) {
          console.error('[useImportMonthlyCSV] Upload error:', uploadResult.error);
          errors.push({
            type: 'upload',
            message: 'Gagal upload ke Google Sheets: ' + (uploadResult.error.message || String(uploadResult.error)),
            details: [uploadResult.error.message || uploadResult.error.toString()],
          });
          setImportErrors(errors);
          return;
        }

        const uploadData = uploadResult.data;
        if (!uploadData?.success) {
          console.error('[useImportMonthlyCSV] Upload returned success:false', uploadData);
          errors.push({
            type: 'upload',
            message: 'Gagal update data di Google Sheets',
            details: uploadData?.errors || ['Unknown error during update'],
          });
          setImportErrors(errors);
          return;
        }

        console.log(`[useImportMonthlyCSV] Successfully updated ${uploadData.updated} out of ${uploadData.matched} matched items`);

        setParseProgress('');

        // Success - call callback
        onImportSuccess(matchResult, parsedData);

        toast({
          title: '✅ Import Berhasil!',
          description: `${matchResult.matched} item(s) berhasil diupdate untuk ${parsedData.bulan < 10 ? '0' : ''}${parsedData.bulan}/${parsedData.tahun}`,
        });
      } catch (error) {
        console.error('[useImportMonthlyCSV] Error:', error);
        errors.push({
          type: 'parse',
          message: 'Error parsing file',
          details: [error instanceof Error ? error.message : String(error)],
        });
        setImportErrors(errors);

        toast({
          variant: 'destructive',
          title: '❌ Import Gagal',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsImporting(false);
        setParseProgress('');
      }
    },
    [sheetId, matching, onImportSuccess]
  );

  const clearErrors = useCallback(() => {
    setImportErrors([]);
    setParseProgress('');
  }, []);

  return {
    isImporting,
    importErrors,
    parseProgress,
    handleImportFile,
    clearErrors,
  };
};
