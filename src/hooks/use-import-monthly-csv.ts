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
      console.log('[useImportMonthlyCSV] Starting matching...', {
        parsedItems: parsedData.items.length,
        budgetItems: budgetItems.length,
      });

      const result: MatchResult = {
        matched: 0,
        notMatched: 0,
        matched_items: [],
        not_matched_items: [],
      };

      // Create map dari budget items untuk faster lookup
      const budgetItemMap = new Map<string, BudgetItem>();
      budgetItems.forEach((item, idx) => {
        const key = createUniqueKey(item);
        budgetItemMap.set(key, item);
        
        // Log first 3 items untuk debug
        if (idx < 3) {
          console.log(`[useImportMonthlyCSV] BudgetItem ${idx + 1}:`, {
            program_pembebanan: item.program_pembebanan,
            kegiatan: item.kegiatan,
            akun: item.akun,
            uraian: item.uraian.substring(0, 30),
            key: key.substring(0, 80),
          });
        }
      });

      console.log('[useImportMonthlyCSV] Budget item map created:', budgetItemMap.size);

      // Match parsed items dengan budget items
      parsedData.items.forEach((parsedItem, idx) => {
        const key = createUniqueKey(parsedItem);
        const budgetItem = budgetItemMap.get(key);

        // Log first 3 parsed items untuk debug
        if (idx < 3) {
          console.log(`[useImportMonthlyCSV] ParsedItem ${idx + 1}:`, {
            program: parsedItem.program,
            kegiatan: parsedItem.kegiatan,
            akun: parsedItem.akun,
            uraian: parsedItem.uraian.substring(0, 30),
            key: key.substring(0, 80),
            found: !!budgetItem,
          });
        }

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

        // Log progress every 100 items
        if ((idx + 1) % 100 === 0) {
          console.log(`[useImportMonthlyCSV] Matching progress: ${idx + 1}/${parsedData.items.length}, Matched so far: ${result.matched}`);
        }
      });

      console.log('[useImportMonthlyCSV] Matching complete:', {
        matched: result.matched,
        notMatched: result.notMatched,
        total: result.matched + result.notMatched,
      });

      // Log detailed unmatched items untuk debug
      if (result.not_matched_items.length > 0) {
        console.log(`[useImportMonthlyCSV] ⚠️ ${result.not_matched_items.length} unmatched items:`);
        result.not_matched_items.forEach((item, idx) => {
          console.log(`  ${idx + 1}. Program: ${item.item.program}, Kegiatan: ${item.item.kegiatan}, RincianOutput: ${item.item.rincianOutput}, KomponenOutput: ${item.item.komponenOutput}, SubKomponen: ${item.item.subKomponen}, Akun: ${item.item.akun}`);
          console.log(`     Uraian: ${item.item.uraian}`);
          console.log(`     SisaAnggaran: ${item.item.sisaAnggaran}, Reason: ${item.reason}`);
        });
      }

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

        // Prepare data untuk update budget_items - COPY ALL COLUMNS from CSV, not just sisa_anggaran
        const updateData = matchResult.matched_items.map((match) => {
          const updated = { ...match.budgetItem };
          // Update with ALL columns from CSV (periodeIni is for RPD, but other fields go here)
          updated.sub_komponen = match.item.subKomponen;
          updated.sisa_anggaran = match.item.sisaAnggaran;
          updated.updated_date = formatDateIndonesia(new Date().toISOString());
          // No need to set periodeIni here - it's only for RPD items
          return updated;
        });

        // Prepare data untuk update rpd_items (kolom bulan sesuai periode, plus total_rpd & sisa_anggaran auto-calc)
        // Mapping bulan ke kolom: Jan=I(8), Feb=J(9), ..., Dec=T(19)
        const bulanColumnMap: { [key: number]: string } = {
          1: 'I', 2: 'J', 3: 'K', 4: 'L', 5: 'M', 6: 'N',
          7: 'O', 8: 'P', 9: 'Q', 10: 'R', 11: 'S', 12: 'T'
        };
        const bulanColumn = bulanColumnMap[parsedData.bulan];
        
        const rpdUpdateData = matchResult.matched_items.map((match) => {
          return {
            item: match.budgetItem,
            bulan: parsedData.bulan,
            bulanColumn: bulanColumn,
            periodeIni: match.item.periodeIni,  // Column 24: Monthly realization (Periode Ini)
          };
        });

        console.log('[useImportMonthlyCSV] RPD update data prepared for bulan', parsedData.bulan, 'column', bulanColumn);
        console.log('[useImportMonthlyCSV] Sample RPD update:', {
          item_id: rpdUpdateData[0]?.item.id,
          periodeIni: rpdUpdateData[0]?.periodeIni,
          bulanColumn: rpdUpdateData[0]?.bulanColumn,
        });

        // Prepare unmatched items untuk insert ke versioned sheet
        const unmatchedData = matchResult.not_matched_items.map((item) => {
          // Create a budget item structure untuk unmatched items
          return {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            program_pembebanan: item.item.program,
            kegiatan: item.item.kegiatan,
            rincian_output: item.item.rincianOutput,
            komponen_output: item.item.komponenOutput,
            sub_komponen: item.item.subKomponen,
            akun: item.item.akun,
            uraian: item.item.uraian,
            volume_semula: 1,
            satuan_semula: 'OK',
            harga_satuan_semula: item.item.sisaAnggaran,
            jumlah_semula: item.item.sisaAnggaran,
            volume_menjadi: 1,
            satuan_menjadi: 'OK',
            harga_satuan_menjadi: item.item.sisaAnggaran,
            jumlah_menjadi: item.item.sisaAnggaran,
            selisih: 0,
            sisa_anggaran: item.item.sisaAnggaran,
            blokir: 0,
            status: 'new',
            approved_by: '',
            approved_date: '',
            rejected_date: '',
            submitted_by: 'import',
            submitted_date: formatDateIndonesia(new Date().toISOString()),
            updated_date: formatDateIndonesia(new Date().toISOString()),
            notes: `[Kegiatan Baru] ${item.reason}`,
            catatan_ppk: '',
          };
        });

        console.log('[useImportMonthlyCSV] Uploading', updateData.length, 'matched items + ', unmatchedData.length, ' unmatched items to Google Sheets...');
        console.log('[useImportMonthlyCSV] First matched item sample:', updateData[0]);
        if (unmatchedData.length > 0) {
          console.log('[useImportMonthlyCSV] First unmatched item sample:', unmatchedData[0]);
        }

        // Call Google Sheets function dengan timeout
        console.log('[useImportMonthlyCSV] Invoking google-sheets function...', {
          operation: 'update-sisa-anggaran',
          matchedItems: updateData.length,
          unmatchedItems: unmatchedData.length,
          bulan: parsedData.bulan,
          tahun: parsedData.tahun,
        });

        const startTime = Date.now();
        let uploadResult;
        
        try {
          uploadResult = await supabase.functions.invoke('google-sheets', {
            body: {
              spreadsheetId: sheetId,
              operation: 'update-sisa-anggaran',
              values: updateData,
              rpdUpdates: rpdUpdateData,
              unmatchedItems: unmatchedData,
              bulan: parsedData.bulan,
              tahun: parsedData.tahun,
            },
          });
          
          const endTime = Date.now();
          console.log('[useImportMonthlyCSV] Upload result received in', endTime - startTime, 'ms');
          console.log('[useImportMonthlyCSV] Result:', {
            hasError: !!uploadResult.error,
            errorMessage: uploadResult.error?.message,
            statusCode: uploadResult.error?.context?.response?.status,
            data: uploadResult.data,
          });
        } catch (error) {
          console.error('[useImportMonthlyCSV] Error calling edge function:', error);
          console.error('[useImportMonthlyCSV] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            status: error instanceof Error && 'status' in error ? (error as any).status : 'N/A',
          });
          throw new Error(`Edge function error: ${error instanceof Error ? error.message : String(error)}`);
        }

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
