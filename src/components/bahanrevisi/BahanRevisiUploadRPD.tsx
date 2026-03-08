/**
 * Component untuk Upload RPD dengan Verifikasi Matching/Unmatching
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RPDItem } from '@/types/bahanrevisi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, Loader, AlertCircle, CheckCircle2, Info, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface UploadRPDProps {
  existingRPDItems: RPDItem[];
  onUploadSuccess: (newItems: RPDItem[], updatedItems: RPDItem[]) => Promise<void>;
  sheetId: string | null;
}

interface ParsedRPDFile {
  items: Partial<RPDItem>[];
  fileName: string;
}

interface MatchResult {
  matched: Partial<RPDItem>[];
  unmatched: Partial<RPDItem>[];
  changed: Partial<RPDItem>[];
  unchanged: Partial<RPDItem>[];
}

interface UploadState {
  step: 'idle' | 'processing' | 'verification' | 'uploading' | 'success';
  parsedData: ParsedRPDFile | null;
  matchResult: MatchResult | null;
  originalFile: File | null;
  error: string | null;
}

// Normalize komponen_output token for tolerant matching (handles OCR-like confusion: 0↔O, 1↔I)
const normalizeKomponenOutputForMatch = (value: unknown): string => {
  const raw = String(value ?? '').trim().replace(/^'+/, '').toLowerCase();
  const parts = raw.split('.');

  // Expected: kegiatan.ro.komponen (e.g., 2902.fan.zzi)
  if (parts.length === 3) {
    const detail = parts[2];
    // Only apply ambiguity normalization on non-pure-numeric suffixes
    if (!/^\d+$/.test(detail)) {
      parts[2] = detail.replace(/0/g, 'o').replace(/1/g, 'i');
    }
    return parts.join('.');
  }

  return raw;
};

const normalizeSubKomponenForMatch = (value: unknown): string => {
  const raw = String(value ?? '').trim().replace(/^'+/, '').toLowerCase();
  if (!raw) return '';

  // 051_GG -> 051, 51 -> 051
  const withOptionalSuffix = raw.match(/^(\d{1,3})(?:_[a-z]{1,5})?$/);
  if (withOptionalSuffix) {
    return withOptionalSuffix[1].replace(/^0+/, '').padStart(3, '0');
  }

  // Keep letter-based grouping as-is (A/B/C etc.)
  if (/^[a-z]$/.test(raw)) return raw;

  return raw;
};

const normalizeTextForMatch = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .replace(/^'+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to create a unique key for matching RPD items
const createRPDKey = (item: Partial<RPDItem>): string => {
  return [
    item.program_pembebanan || '',
    item.kegiatan || '',
    normalizeKomponenOutputForMatch(item.komponen_output),
    normalizeSubKomponenForMatch(item.sub_komponen),
    item.akun || '',
    normalizeTextForMatch(item.uraian),
  ]
    .map(v => String(v).trim().replace(/^'+/, '').toLowerCase())
    .join('|');
};

const createRPDLooseKey = (item: Partial<RPDItem>): string => {
  return [
    item.program_pembebanan || '',
    item.kegiatan || '',
    normalizeKomponenOutputForMatch(item.komponen_output),
    item.akun || '',
    normalizeTextForMatch(item.uraian),
  ]
    .map(v => String(v).trim().replace(/^'+/, '').toLowerCase())
    .join('|');
};

// Helper to convert RPDItem to row format for Google Sheets
const rpdItemToRow = (item: RPDItem): (string | number | boolean | null)[] => {
  return [
    item.id,
    item.program_pembebanan,
    item.kegiatan,
    item.komponen_output,
    item.sub_komponen,
    item.akun,
    item.uraian,
    item.total_pagu,
    item.jan,
    item.feb,
    item.mar,
    item.apr,
    item.mei,
    item.jun,
    item.jul,
    item.aug,
    item.sep,
    item.oct,
    item.nov,
    item.dec,
    item.total_rpd,
    item.sisa_anggaran,
    item.status,
    item.modified_by || '',
    item.modified_date || '',
    item.blokir || 0,
  ];
};

const BahanRevisiUploadRPD: React.FC<UploadRPDProps> = ({
  existingRPDItems,
  onUploadSuccess,
  sheetId,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    step: 'idle',
    parsedData: null,
    matchResult: null,
    originalFile: null,
    error: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState({
      step: 'processing',
      parsedData: null,
      matchResult: null,
      originalFile: file,
      error: null,
    });

    try {
      let items: Partial<RPDItem>[] = [];

      // Parse file based on type
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        items = parseExcelRPD(data);
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text();

        // Robust CSV parser with quote + multiline support
        const parseCSV = (content: string): string[][] => {
          const rows: string[][] = [];
          let currentRow: string[] = [];
          let currentCell = '';
          let inQuotes = false;

          for (let i = 0; i < content.length; i++) {
            const ch = content[i];
            const next = content[i + 1];

            if (ch === '"') {
              if (inQuotes && next === '"') {
                currentCell += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
              continue;
            }

            if (ch === ';' && !inQuotes) {
              currentRow.push(currentCell.trim());
              currentCell = '';
              continue;
            }

            if ((ch === '\n' || ch === '\r') && !inQuotes) {
              if (ch === '\r' && next === '\n') i++;
              currentRow.push(currentCell.trim());
              currentCell = '';
              if (currentRow.some(cell => cell !== '')) {
                rows.push(currentRow);
              }
              currentRow = [];
              continue;
            }

            currentCell += ch;
          }

          if (currentCell.length > 0 || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell !== '')) {
              rows.push(currentRow);
            }
          }

          return rows;
        };

        const data = parseCSV(text);
        items = parseExcelRPD(data);
      } else {
        throw new Error('Format file tidak didukung. Gunakan Excel (.xlsx) atau CSV (.csv)');
      }

      // Validate items
      if (items.length === 0) {
        throw new Error('File tidak mengandung data RPD yang valid');
      }

      // Perform matching
      const matchResult = performMatching(items);

      setUploadState({
        step: 'verification',
        parsedData: { items, fileName: file.name },
        matchResult,
        originalFile: file,
        error: null,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[BahanRevisiUploadRPD] Parse error:', error);
      setUploadState({
        step: 'idle',
        parsedData: null,
        matchResult: null,
        originalFile: null,
        error: error instanceof Error ? error.message : 'Gagal parse file',
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal membaca file',
      });
    }
  };

  const parseExcelRPD = (data: any[][]): Partial<RPDItem>[] => {
    const items: Partial<RPDItem>[] = [];

    // Fixed POK month column indices (0-based after semicolon split)
    const POK_MONTH_COLS: Record<string, number> = {
      jan: 17, feb: 18, mar: 19, apr: 20, mei: 21, jun: 22,
      jul: 24, aug: 26, sep: 27, oct: 28, nov: 29, dec: 31,
    };
    const JUMLAH_BIAYA_COL = 11;
    const BLOKIR_COL = 38;

    // Parse Indonesian number (dots as thousand separators)
    const parseNum = (value: any): number => {
      if (!value) return 0;
      const str = String(value).trim();
      if (!str || str === '-') return 0;
      const cleaned = str.replace(/[.\s]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    // Normalize sub_komponen to 3-digit padded
    const normalizeSubKomp = (code: string): string => {
      if (!code) return '';
      const cleaned = code.split('.')[0].trim();
      const numPart = cleaned.replace(/^0+/, '') || '0';
      return numPart.padStart(3, '0');
    };

    // Check if row is a page header (repeating headers in POK format)
    const isPageHeader = (row: any[]): boolean => {
      const col0 = String(row[0] || '').trim();
      const col1 = String(row[1] || '').trim();
      const col2 = String(row[2] || '').trim();
      if (col1.includes('PETUNJUK OPERASIONAL')) return true;
      if (col0.includes('Satuan Kerja')) return true;
      if (col1 === 'KODE') return true;
      // Column number row: ;1;2;;;3;;...
      if (col1 === '1' && col2 === '2') return true;
      // "(Dalam" keyword
      if (row.some((v: any) => String(v || '').includes('(Dalam'))) return true;
      // Header sub-rows with keywords
      const rowText = row.slice(0, 20).map((v: any) => String(v || '')).join(' ');
      if (rowText.includes('Kontraktual') || rowText.includes('Harga Satuan') ||
          (rowText.includes('Volume') && rowText.includes('Jumlah Biaya'))) return true;
      // Multiline quoted garbage
      if (col1.includes('"') || col0.includes('"')) return true;
      return false;
    };

    // Month name check (skip header month labels)
    const monthNames = new Set(['JAN', 'FEB', 'MRT', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUST', 'SEPT', 'OKT', 'NOP', 'DES']);

    // Hierarchy tracking
    let currentProgram = '';
    let currentKegiatan = '';
    let currentROCode = '';        // e.g., 'BMA'
    let currentRincianOutput = ''; // e.g., '2896.BMA'
    let currentKomponen = '';      // e.g., '2896.BMA.004'
    let currentSubKomponen = '';
    let currentAkun = '';

    // Page-break continuation tracking
    let lastItemKonstanta = '';  // konstanta (col[5]) of last pushed item
    let justPassedPageHeader = false;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 10) continue;

      // Skip page headers and track when we pass through them
      if (isPageHeader(row)) {
        justPassedPageHeader = true;
        continue;
      }

      const code = String(row[1] || '').trim();
      const name = String(row[2] || '').trim();

      // Skip TOTAL rows
      if (name.toUpperCase().startsWith('TOTAL') || code.toUpperCase() === 'TOTAL') continue;

      // Skip month name header fragments
      if (code && monthNames.has(code.toUpperCase())) continue;

      if (code) {
        // Hierarchy detection
        const isProgram = /^\d{3}\.\d{2}\.[A-Z]{2}$/.test(code);      // 054.01.GG
        const isKegiatan = /^\d{4}$/.test(code);                        // 2896
        const isRO = /^\d{4}\.[A-Z]{2,3}$/.test(code);                 // 2896.BMA
        const isKomponen = /^[A-Z]{2,3}\.[A-Z0-9]{3}$/.test(code);     // BMA.004, FAN.ZZ1
        const isSubKomp = /^\d{1,3}$/.test(code) && code.length <= 3;  // 052, 005
        const isSkipLevel = /^[A-Z]$/.test(code);                       // A, B, C — sub-komponen grouping labels
        const isAkun = /^\d{5,6}$/.test(code);                          // 524113

        if (isProgram) {
          currentProgram = code;
          currentKegiatan = ''; currentROCode = ''; currentRincianOutput = '';
          currentKomponen = ''; currentSubKomponen = ''; currentAkun = '';
        } else if (isKegiatan) {
          currentKegiatan = code;
          currentROCode = ''; currentRincianOutput = '';
          currentKomponen = ''; currentSubKomponen = ''; currentAkun = '';
        } else if (isRO) {
          // e.g., 2896.BMA → ROCode = BMA
          currentROCode = code.split('.').slice(1).join('.');
          currentRincianOutput = code;
          currentKomponen = ''; currentSubKomponen = ''; currentAkun = '';
        } else if (isKomponen) {
          // e.g., BMA.004 → full komponen: 2896.BMA.004
          const kompDetailCode = code.split('.')[1]; // '004'
          currentKomponen = `${currentKegiatan}.${currentROCode}.${kompDetailCode}`;
          currentSubKomponen = ''; currentAkun = '';
        } else if (isSkipLevel) {
          // A/B/C - sub-komponen grouping labels (TANPA SUB KOMPONEN, named groups, etc.)
          // Don't change hierarchy context — items inherit parent sub_komponen
        } else if (isSubKomp) {
          currentSubKomponen = normalizeSubKomp(code);
          // Apply _programSuffix for special codes (051, 053, 054)
          if (['051', '053', '054'].includes(currentSubKomponen) && currentProgram) {
            const programSuffix = currentProgram.split('.').pop(); // 'GG' from '054.01.GG'
            currentSubKomponen = `${currentSubKomponen}_${programSuffix}`;
          }
          currentAkun = '';
        } else if (isAkun) {
          currentAkun = code;
        }
        // Hierarchy rows are not data items
        justPassedPageHeader = false;
        continue;
      }

      // Detail item row: col[1] is empty, uraian in col[2]
      const uraian = name;
      if (!uraian || !currentAkun) continue;

      // Get konstanta value (col[5]) for continuation detection
      const konstanta = String(row[5] || '').trim();

      // Detect continuation lines after page breaks:
      // If we just passed a page header and the konstanta matches the last item,
      // this is a continuation of that item (description was split by page break)
      if (justPassedPageHeader && lastItemKonstanta && konstanta === lastItemKonstanta && items.length > 0) {
        // Merge: append uraian to last item's description
        const lastItem = items[items.length - 1];
        const prevUraian = String(lastItem.uraian || '');
        // Only append if continuation adds new text (avoid exact duplicates)
        if (!prevUraian.toLowerCase().includes(uraian.toLowerCase())) {
          lastItem.uraian = `${prevUraian} ${uraian}`.trim();
          // Update the ID to reflect the merged uraian
          lastItem.id = [
            lastItem.program_pembebanan, lastItem.kegiatan, currentRincianOutput,
            lastItem.komponen_output, lastItem.sub_komponen, lastItem.akun, lastItem.uraian,
          ].map(s => (s || '').trim()).join('|');
        }
        console.debug(`[parseExcelRPD] Merged continuation line (konstanta=${konstanta}): "${uraian}" → "${lastItem.uraian}"`);
        justPassedPageHeader = false;
        continue;
      }

      justPassedPageHeader = false;

      // Parse monthly values (in ribuan → multiply by 1000)
      const monthValues: Record<string, number> = {};
      let totalRPD = 0;
      for (const [month, colIdx] of Object.entries(POK_MONTH_COLS)) {
        const val = parseNum(row[colIdx]) * 1000;
        monthValues[month] = val;
        totalRPD += val;
      }

      const totalPagu = parseNum(row[JUMLAH_BIAYA_COL]) * 1000;
      const blokir = parseNum(row[BLOKIR_COL]) * 1000;

      // Skip items with no values at all
      if (totalPagu === 0 && totalRPD === 0) continue;

      // Generate ID using pipe separator (matching generateDeterministicId from bahanrevisi-calculations)
      const id = [
        currentProgram, currentKegiatan, currentRincianOutput,
        currentKomponen, currentSubKomponen, currentAkun, uraian,
      ].map(s => (s || '').trim()).join('|');

      lastItemKonstanta = konstanta;

      items.push({
        id,
        program_pembebanan: currentProgram,
        kegiatan: currentKegiatan,
        komponen_output: currentKomponen,
        sub_komponen: currentSubKomponen,
        akun: currentAkun,
        uraian,
        total_pagu: totalPagu,
        total_rpd: totalRPD,
        sisa_anggaran: totalPagu - totalRPD,
        status: 'active',
        blokir,
        ...monthValues,
      });
    }

    if (items.length === 0) {
      throw new Error('Tidak ada data RPD ditemukan dalam file POK. Pastikan format file sudah benar.');
    }

    console.debug('[BahanRevisiUploadRPD] Parsed', items.length, 'RPD items from POK CSV');
    return items;
  };

  const performMatching = (newItems: Partial<RPDItem>[]): MatchResult => {
    const normalizeToken = (v: unknown) => String(v ?? '').trim().replace(/^'+/, '').toLowerCase();
    const monthFields: Array<keyof RPDItem> = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    const existingById = new Map(existingRPDItems.map(item => [normalizeToken(item.id), item]));
    const existingByKey = new Map(existingRPDItems.map(item => [createRPDKey(item), item]));

    const matched: Partial<RPDItem>[] = [];
    const unmatched: Partial<RPDItem>[] = [];
    const changed: Partial<RPDItem>[] = [];
    const unchanged: Partial<RPDItem>[] = [];

    newItems.forEach(item => {
      const id = normalizeToken(item.id);
      const key = createRPDKey(item);
      const existing = (id ? existingById.get(id) : undefined) || existingByKey.get(key);

      if (!existing) {
        unmatched.push(item);
        return;
      }

      matched.push(item);

      const hasChanged =
        Number(item.total_pagu || 0) !== Number(existing.total_pagu || 0) ||
        Number(item.blokir || 0) !== Number(existing.blokir || 0) ||
        monthFields.some(month => Number((item as any)[month] || 0) !== Number((existing as any)[month] || 0));

      if (hasChanged) {
        changed.push(item);
      } else {
        unchanged.push(item);
      }
    });

    console.log('[BahanRevisiUploadRPD] Matching result:', {
      total: newItems.length,
      matched: matched.length,
      unmatched: unmatched.length,
      changed: changed.length,
      unchanged: unchanged.length,
    });

    return { matched, unmatched, changed, unchanged };
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmUpload = async () => {
    if (!uploadState.matchResult || !uploadState.parsedData || !sheetId) return;

    setIsUploading(true);
    try {
      const { unmatched, changed } = uploadState.matchResult;

      // Past-month protection: determine which months should be preserved
      const currentMonthIdx = new Date().getMonth(); // 0=Jan, 1=Feb, 2=Mar (March 2026 → 2)
      const monthFields = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const pastMonthFields = monthFields.slice(0, currentMonthIdx);
      console.log('[BahanRevisiUploadRPD] Past months protected:', pastMonthFields);

      // Prepare items to add (unmatched) — zero out past months
      const itemsToAdd = unmatched.map(item => {
        const cleaned: any = {
          ...item,
          id: item.id || [item.program_pembebanan, item.kegiatan, '', item.komponen_output, item.sub_komponen, item.akun, item.uraian].map(s => (s || '').trim()).join('|'),
          modified_by: 'system',
          modified_date: new Date().toISOString(),
        };
        // Zero out past month values — they should not be set from CSV for months already passed
        for (const field of pastMonthFields) {
          cleaned[field] = 0;
        }
        // Recalculate totals
        cleaned.total_rpd = monthFields.reduce((sum, m) => sum + (Number(cleaned[m]) || 0), 0);
        cleaned.sisa_anggaran = (Number(cleaned.total_pagu) || 0) - cleaned.total_rpd;
        return cleaned;
      }) as RPDItem[];

      // Prepare items to update (matched) with past-month protection
      const normalizeId = (value: unknown) => String(value ?? '').trim().replace(/^'+/, '');

      const itemsToUpdate = changed.map(newItem => {
        const newItemId = normalizeId(newItem.id);
        const existing = existingRPDItems.find(e => normalizeId(e.id) === newItemId)
          || existingRPDItems.find(e => createRPDKey(e) === createRPDKey(newItem));

        if (existing) {
          const merged: any = {
            ...existing,
            ...newItem,
            id: existing.id, // ALWAYS use existing sheet ID for safe row matching
            modified_by: 'system',
            modified_date: new Date().toISOString(),
          };
          // Preserve past month values from existing data (use numeric conversion)
          for (const field of pastMonthFields) {
            merged[field] = Number((existing as any)[field]) || 0;
          }
          // Recalculate total_rpd after preserving past months
          merged.total_rpd = monthFields.reduce((sum, m) => sum + (Number(merged[m]) || 0), 0);
          merged.sisa_anggaran = (Number(merged.total_pagu) || 0) - merged.total_rpd;
          return merged as RPDItem;
        }
        return { ...newItem, id: newItem.id } as RPDItem;
      });

      // Upload new items (append to sheet)
      if (itemsToAdd.length > 0) {
        const rows = itemsToAdd.map(rpdItemToRow);
        console.log('[BahanRevisiUploadRPD] Appending', itemsToAdd.length, 'new items');
        
        const appendResult = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: sheetId,
            operation: 'append',
            range: 'rpd_items!A:Z',
            values: rows,
          },
        });

        if (appendResult.error) {
          throw new Error(`Gagal append items: ${appendResult.error.message}`);
        }
      }

      // Update existing items
      if (itemsToUpdate.length > 0) {
        console.log('[BahanRevisiUploadRPD] Updating', itemsToUpdate.length, 'items');
        
        // Fetch all current items to get row indices
        const fetchResult = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: sheetId,
            operation: 'read',
            range: 'rpd_items!A:Z',
          },
        });

        const readPayload: any = fetchResult.data;
        const allRows: any[][] = Array.isArray(readPayload)
          ? readPayload
          : Array.isArray(readPayload?.values)
            ? readPayload.values
            : [];

        if (allRows.length > 1) {
          const normalizeId = (value: unknown) => String(value ?? '').trim().replace(/^'+/, '');
          const idToRowIndex = new Map<string, number>();

          for (let i = 1; i < allRows.length; i++) {
            const row = allRows[i];
            if (!row) continue;
            const rowId = normalizeId(row[0]);
            if (rowId) idToRowIndex.set(rowId, i + 1); // 1-based sheet index
          }

          // Build batched update requests to avoid Google Sheets write-rate limits
          const updateRequests: Array<{ range: string; values: (string | number | boolean | null)[][] }> = [];
          let notFoundCount = 0;

          for (const updateItem of itemsToUpdate) {
            const updateId = normalizeId(updateItem.id);
            let rowIdx = updateId ? (idToRowIndex.get(updateId) || -1) : -1;

            // Fallback by key only if ID not found
            if (rowIdx <= 0) {
              const updateKey = createRPDKey(updateItem);
              for (let i = 1; i < allRows.length; i++) {
                const row = allRows[i];
                if (!row) continue;
                const rowKey = createRPDKey({
                  program_pembebanan: row[1],
                  kegiatan: row[2],
                  komponen_output: row[3],
                  sub_komponen: row[4],
                  akun: row[5],
                  uraian: row[6],
                });
                if (rowKey === updateKey) {
                  rowIdx = i + 1;
                  break;
                }
              }
            }

            if (rowIdx > 0) {
              const updateRow = rpdItemToRow(updateItem);
              updateRequests.push({
                range: `rpd_items!A${rowIdx}:Z${rowIdx}`,
                values: [updateRow],
              });
            } else {
              notFoundCount += 1;
              console.warn('[BahanRevisiUploadRPD] Row not found for update item:', updateItem.id);
            }
          }

          if (updateRequests.length > 0) {
            const batchResult = await supabase.functions.invoke('google-sheets', {
              body: {
                spreadsheetId: sheetId,
                operation: 'batch-update',
                updates: updateRequests,
              },
            });

            if (batchResult.error) {
              throw new Error(`Gagal batch update items: ${batchResult.error.message}`);
            }

            console.log('[BahanRevisiUploadRPD] Batch update success:', {
              requested: itemsToUpdate.length,
              updated: updateRequests.length,
              notFound: notFoundCount,
              result: batchResult.data,
            });
          }
        } else {
          throw new Error('Gagal membaca data rpd_items untuk proses update');
        }
      }

      // Call parent's callback for refresh
      await onUploadSuccess(itemsToAdd, itemsToUpdate);

      setUploadState({
        step: 'success',
        parsedData: uploadState.parsedData,
        matchResult: uploadState.matchResult,
        originalFile: null,
        error: null,
      });

      toast({
        variant: 'default',
        title: 'Upload Berhasil',
        description: `${itemsToAdd.length} item baru ditambahkan, ${itemsToUpdate.length} item diperbarui`,
      });

      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsDialogOpen(false);
        setUploadState({
          step: 'idle',
          parsedData: null,
          matchResult: null,
          originalFile: null,
          error: null,
        });
      }, 2000);
    } catch (error) {
      console.error('[BahanRevisiUploadRPD] Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Error Upload',
        description: error instanceof Error ? error.message : 'Gagal upload data',
      });
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Gagal upload data',
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplateExcel = () => {
    const templateData = [
      ['program_pembebanan', 'kegiatan', 'komponen_output', 'sub_komponen', 'akun', 'uraian', 'total_pagu', 'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
      ['054.01.GG', '2896', '2896.BMA', '052', 'A', 'Contoh Item RPD', 100000000, 10000000, 10000000, 10000000, 10000000, 10000000, 10000000, 10000000, 10000000, 0, 0, 0, 0],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = Array(19).fill({ wch: 15 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RPD Template');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpd-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="gap-2"
        size="sm"
        variant="ghost"
      >
        <FileUp className="w-4 h-4" />
        Upload RPD
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Rencana Penarikan Dana (RPD)</DialogTitle>
            <DialogDescription>
              Upload file Excel/CSV dengan data RPD untuk diintegrasikan ke sistem
            </DialogDescription>
          </DialogHeader>

          {uploadState.step === 'idle' && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  File harus memiliki kolom: program_pembebanan, kegiatan, komponen_output, sub_komponen, akun, uraian, total_pagu, dan kolom bulan (jan-dec)
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-slate-50 cursor-pointer"
                onClick={triggerFileInput}
              >
                <FileUp className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                <p className="font-semibold mb-1">Pilih file untuk upload</p>
                <p className="text-sm text-slate-600 mb-4">Drag & drop file atau klik untuk browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={downloadTemplateExcel}
              >
                <Download className="w-4 h-4" />
                Download Template Excel
              </Button>

              {uploadState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadState.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {uploadState.step === 'processing' && (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2">Memproses file...</span>
            </div>
          )}

          {uploadState.step === 'verification' && uploadState.matchResult && uploadState.parsedData && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Hasil Verifikasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-blue-50">
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-blue-700">
                          {uploadState.parsedData.items.length}
                        </div>
                        <div className="text-sm text-slate-600">Total Item</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-green-700">
                          {uploadState.matchResult.unmatched.length}
                        </div>
                        <div className="text-sm text-slate-600">Item Baru</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50">
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-amber-700">
                          {uploadState.matchResult.changed?.length ?? 0}
                        </div>
                        <div className="text-sm text-slate-600">Item Berubah</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong>{uploadState.matchResult.unmatched?.length ?? 0}</strong> item baru akan ditambahkan, <strong>{uploadState.matchResult.changed?.length ?? 0}</strong> item berubah akan diperbarui, dan <strong>{uploadState.matchResult.unchanged?.length ?? 0}</strong> item tidak berubah akan dilewati
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Preview Item Baru ({uploadState.matchResult.unmatched.length} items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto border rounded max-h-96 overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-slate-100 z-10">
                        <tr className="border-b">
                          <th className="text-left p-2 border-r font-semibold">Program</th>
                          <th className="text-left p-2 border-r font-semibold">Kegiatan</th>
                          <th className="text-left p-2 border-r font-semibold">Akun</th>
                          <th className="text-left p-2 border-r font-semibold">Uraian</th>
                          <th className="text-right p-2 font-semibold">Total Pagu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadState.matchResult.unmatched.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="p-2 border-r text-xs whitespace-nowrap">{item.program_pembebanan || '-'}</td>
                            <td className="p-2 border-r text-xs whitespace-nowrap">{item.kegiatan || '-'}</td>
                            <td className="p-2 border-r text-xs whitespace-nowrap">{item.akun || '-'}</td>
                            <td className="p-2 border-r text-xs">{item.uraian || '-'}</td>
                            <td className="p-2 text-right text-xs whitespace-nowrap">{formatCurrency(item.total_pagu || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setUploadState({
                    step: 'idle',
                    parsedData: null,
                    matchResult: null,
                    originalFile: null,
                    error: null,
                  })}
                  disabled={isUploading}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading && <Loader className="w-4 h-4 animate-spin" />}
                  Konfirmasi & Upload
                </Button>
              </div>
            </div>
          )}

          {uploadState.step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">Upload Berhasil!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Data RPD telah diintegrasikan ke sistem
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BahanRevisiUploadRPD;
