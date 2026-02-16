/**
 * Custom hook untuk membaca data Bahan Revisi Anggaran dari Google Sheets
 */

import { useMemo } from 'react';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BudgetItem, 
  RPDItem, 
  Program, 
  Kegiatan, 
  RincianOutput, 
  KomponenOutput, 
  SubKomponen, 
  Akun,
  BahanRevisiFilters
} from '@/types/bahanrevisi';
import { filterBudgetItems, getFilteredDropdownValues, roundToThousands, formatDateIndonesia } from '@/utils/bahanrevisi-calculations';

// Summary types untuk analisis data berdasarkan berbagai dimensi
export type BudgetSummary = {
  label: string;
  totalSemula: number;
  totalMenjadi: number;
  totalSelisih: number;
  itemCount: number;
  changedItemCount: number;
  newItemCount: number;
  type: 'komponen' | 'akun' | 'program' | 'kegiatan' | 'rincian' | 'sub_komponen' | 'account_group';
};

interface UseBahanRevisiDataProps {
  sheetId: string | null;
  filters?: BahanRevisiFilters;
  enabled?: boolean;
}

/**
 * Fetch budget_items sheet dan convert ke array of BudgetItem
 */
const fetchBudgetItems = async (sheetId: string): Promise<BudgetItem[]> => {
  if (!sheetId) {
    console.warn('[fetchBudgetItems] No sheetId provided');
    throw new Error('Sheet ID tidak ditemukan');
  }

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'budget_items!A:Z', // A sampai Z (26 kolom)
    },
  });

  if (result.error) {
    console.error('[fetchBudgetItems] Error:', result.error);
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch budget items: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) {
    console.log('[fetchBudgetItems] No budget items found');
    return [];
  }

  // Skip header row dan map ke BudgetItem[] dengan struktur kolom baru
  const items: BudgetItem[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim()) // Filter empty rows
    .map((row: string[], idx: number) => {
      const item = {
        id: row[0]?.trim() || '',
        program_pembebanan: row[1]?.trim() || '',
        kegiatan: row[2]?.trim() || '',
        rincian_output: row[3]?.trim() || '',
        komponen_output: row[4]?.trim() || '',
        sub_komponen: row[5]?.trim() || '',
        akun: row[6]?.trim() || '',
        uraian: row[7]?.trim() || '',
        volume_semula: parseFloat(row[8]) || 0,
        satuan_semula: row[9]?.trim() || '',
        harga_satuan_semula: parseFloat(row[10]) || 0,
        jumlah_semula: parseFloat(row[11]) || 0,
        volume_menjadi: parseFloat(row[12]) || 0,
        satuan_menjadi: row[13]?.trim() || '',
        harga_satuan_menjadi: parseFloat(row[14]) || 0,
        jumlah_menjadi: parseFloat(row[15]) || 0,
        selisih: parseFloat(row[16]) || 0,
        blokir: parseFloat(row[17]) || 0,
        status: (row[18]?.trim() as any) || 'unchanged',
        approved_by: row[19]?.trim(),
        approved_date: row[20]?.trim(),
        rejected_date: row[21]?.trim(),
        submitted_by: row[22]?.trim() || '',
        submitted_date: row[23]?.trim() || '',
        updated_date: row[24]?.trim() || '',
        notes: row[25]?.trim(),
      };
      
      if (idx === 0) {
        console.log('[fetchBudgetItems] First item parsed:', item);
        console.log('[fetchBudgetItems] Program:', item.program_pembebanan, 'Kegiatan:', item.kegiatan);
      }
      
      return item;
    });

  console.log(`[fetchBudgetItems] Loaded ${items.length} budget items`);
  if (items.length > 0) {
    console.log('[fetchBudgetItems] Sample item:', items[0]);
  }
  return items;
};

/**
 * Fetch RPD items
 */
const fetchRPDItems = async (sheetId: string): Promise<RPDItem[]> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'rpd_items!A:Z',
    },
  });

  if (result.error) {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch RPD items: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  console.log('[fetchRPDItems] Raw rows:', rows.length, 'rows total');
  if (rows.length > 0) {
    console.log('[fetchRPDItems] Header row:', rows[0]);
    if (rows.length > 1) {
      console.log('[fetchRPDItems] First data row (raw):', rows[1]);
    }
  }
  
  if (rows.length <= 1) return [];

  const items: RPDItem[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[], idx: number) => {
      const totalPagu = parseFloat(row[7]) || 0;
      const totalRpd = parseFloat(row[20]) || 0;
      const blokir = parseFloat(row[25]) || 0;
      const sisaAnggaran = roundToThousands(totalPagu - totalRpd - blokir);
      
      const item = {
        id: row[0]?.trim() || '',
        program_pembebanan: row[1]?.trim() || '',
        kegiatan: row[2]?.trim() || '',
        komponen_output: row[3]?.trim() || '',
        sub_komponen: row[4]?.trim() || '',
        akun: row[5]?.trim() || '',
        uraian: row[6]?.trim() || '',
        total_pagu: totalPagu,
        jan: parseFloat(row[8]) || 0,
        feb: parseFloat(row[9]) || 0,
        mar: parseFloat(row[10]) || 0,
        apr: parseFloat(row[11]) || 0,
        may: parseFloat(row[12]) || 0,
        jun: parseFloat(row[13]) || 0,
        jul: parseFloat(row[14]) || 0,
        aug: parseFloat(row[15]) || 0,
        sep: parseFloat(row[16]) || 0,
        oct: parseFloat(row[17]) || 0,
        nov: parseFloat(row[18]) || 0,
        dec: parseFloat(row[19]) || 0,
        total_rpd: totalRpd,
        sisa_anggaran: sisaAnggaran,
        status: row[22]?.trim() || '',
        blokir: blokir,
        modified_by: row[23]?.trim(),
        modified_date: row[24]?.trim(),
      };
      
      if (idx === 0) {
        console.log('[fetchRPDItems] First item parsed:', item);
        console.log('[fetchRPDItems] Column mapping check:');
        console.log('  - row[7] (total_pagu):', row[7], '=> parsed as:', item.total_pagu);
        console.log('  - row[20] (total_rpd):', row[20], '=> parsed as:', item.total_rpd);
        console.log('  - row[25] (blokir):', row[25], '=> parsed as:', item.blokir);
      }
      
      return item;
    });

  console.log(`[fetchRPDItems] Loaded ${items.length} RPD items`);
  if (items.length > 0) {
    console.log('[fetchRPDItems] Sample item:', items[0]);
  }
  return items;
};

/**
 * Fetch master Programs
 */
const fetchPrograms = async (sheetId: string): Promise<Program[]> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'programs!A:F',
    },
  });

  if (result.error) {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch programs: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) return [];

  const programs: Program[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      code: row[1]?.trim() || '',
      name: row[2]?.trim() || '',
      description: row[3]?.trim(),
      is_active: row[4]?.trim().toLowerCase() === 'true',
      created_date: row[5]?.trim(),
    }));

  console.log(`[fetchPrograms] Loaded ${programs.length} programs`);
  if (programs.length > 0) {
    console.log('[fetchPrograms] Sample programs:', programs.slice(0, 3));
  }
  return programs;
};

/**
 * Fetch master Kegiatans
 */
const fetchKegiatans = async (sheetId: string): Promise<Kegiatan[]> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'kegiatans!A:G',
    },
  });

  if (result.error) {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch kegiatans: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) return [];

  const kegiatans: Kegiatan[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      program_id: row[1]?.trim() || '',
      program_code: row[2]?.trim() || '',
      code: row[3]?.trim() || '',
      name: row[4]?.trim() || '',
      description: row[5]?.trim(),
      is_active: row[6]?.trim().toLowerCase() === 'true',
    }));

  console.log(`[fetchKegiatans] Loaded ${kegiatans.length} kegiatans`);
  if (kegiatans.length > 0) {
    console.log('[fetchKegiatans] Sample:', kegiatans.slice(0, 2));
  }
  return kegiatans;
};

/**
 * Fetch master Rincian Outputs
 */
const fetchRincianOutputs = async (sheetId: string): Promise<RincianOutput[]> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'rincian_outputs!A:H',
    },
  });

  if (result.error) {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch rincian outputs: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) return [];

  const outputs: RincianOutput[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      kegiatan_id: row[1]?.trim() || '',
      kegiatan_code: row[2]?.trim() || '',
      code: row[3]?.trim() || '',
      name: row[4]?.trim() || '',
      description: row[5]?.trim(),
      is_active: row[6]?.trim().toLowerCase() === 'true',
    }));

  console.log(`[fetchRincianOutputs] Loaded ${outputs.length} rincian outputs`);
  if (outputs.length > 0) {
    console.log('[fetchRincianOutputs] Sample:', outputs.slice(0, 2));
  }
  return outputs;
};

/**
 * Fetch master Komponen Outputs
 */
const fetchKomponenOutputs = async (sheetId: string): Promise<KomponenOutput[]> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'komponen_outputs!A:H',
    },
  });

  if (result.error) {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch komponen outputs: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) return [];

  const komponens: KomponenOutput[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      rincian_output_id: row[1]?.trim() || '',
      rincian_output_code: row[2]?.trim() || '',
      code: row[3]?.trim() || '',
      name: row[4]?.trim() || '',
      description: row[5]?.trim(),
      is_active: row[6]?.trim().toLowerCase() === 'true',
    }));

  console.log(`[fetchKomponenOutputs] Loaded ${komponens.length} komponen outputs`);
  if (komponens.length > 0) {
    console.log('[fetchKomponenOutputs] Sample:', komponens.slice(0, 2));
  }
  return komponens;
};

/**
 * Fetch master Sub Komponen
 */
const fetchSubKomponen = async (sheetId: string): Promise<SubKomponen[]> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'sub_komponen!A:H',
    },
  });

  if (result.error) {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch sub komponen: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) return [];

  const subKomponen: SubKomponen[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      komponen_output_id: row[1]?.trim() || '',
      komponen_output_code: row[2]?.trim() || '',
      code: row[3]?.trim() || '',
      name: row[4]?.trim() || '',
      description: row[5]?.trim(),
      is_active: row[6]?.trim().toLowerCase() === 'true',
    }));

  console.log(`[fetchSubKomponen] Loaded ${subKomponen.length} sub komponens`);
  if (subKomponen.length > 0) {
    console.log('[fetchSubKomponen] Sample:', subKomponen.slice(0, 2));
  }
  return subKomponen;
};

/**
 * Fetch master Akuns
 */
const fetchAkuns = async (sheetId: string): Promise<Akun[]> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'read',
      range: 'akuns!A:H',
    },
  });

  if (result.error) {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to fetch akuns: ${errorMsg}`);
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) return [];

  const akuns: Akun[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      code: row[1]?.trim() || '',
      name: row[2]?.trim() || '',
      account_group: row[3]?.trim() || '',
      account_group_name: row[4]?.trim() || '',
      description: row[5]?.trim(),
      is_active: row[6]?.trim().toLowerCase() === 'true',
    }));

  console.log(`[fetchAkuns] Loaded ${akuns.length} akuns`);
  if (akuns.length > 0) {
    console.log('[fetchAkuns] Sample:', akuns.slice(0, 3));
  }
  return akuns;
};

/**
 * Helper: Calculate summary data by different dimensions
 */
const calculateSummaryByKomponen = (items: BudgetItem[]): BudgetSummary[] => {
  const summaryMap = new Map<string, BudgetSummary>();

  items.forEach(item => {
    const key = item.komponen_output || 'Unknown';
    const existing = summaryMap.get(key) || {
      label: key,
      totalSemula: 0,
      totalMenjadi: 0,
      totalSelisih: 0,
      itemCount: 0,
      changedItemCount: 0,
      newItemCount: 0,
      type: 'komponen' as const,
    };

    existing.totalSemula = roundToThousands(existing.totalSemula + (item.jumlah_semula || 0));
    existing.totalMenjadi = roundToThousands(existing.totalMenjadi + (item.jumlah_menjadi || 0));
    existing.totalSelisih = roundToThousands(existing.totalSelisih + (item.selisih || 0));
    existing.itemCount++;
    if (item.status === 'changed') existing.changedItemCount++;
    if (item.status === 'new') existing.newItemCount++;

    summaryMap.set(key, existing);
  });

  return Array.from(summaryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const calculateSummaryByAkun = (items: BudgetItem[]): BudgetSummary[] => {
  const summaryMap = new Map<string, BudgetSummary>();

  items.forEach(item => {
    const key = item.akun || 'Unknown';
    const existing = summaryMap.get(key) || {
      label: key,
      totalSemula: 0,
      totalMenjadi: 0,
      totalSelisih: 0,
      itemCount: 0,
      changedItemCount: 0,
      newItemCount: 0,
      type: 'akun' as const,
    };

    existing.totalSemula = roundToThousands(existing.totalSemula + (item.jumlah_semula || 0));
    existing.totalMenjadi = roundToThousands(existing.totalMenjadi + (item.jumlah_menjadi || 0));
    existing.totalSelisih = roundToThousands(existing.totalSelisih + (item.selisih || 0));
    existing.itemCount++;
    if (item.status === 'changed') existing.changedItemCount++;
    if (item.status === 'new') existing.newItemCount++;

    summaryMap.set(key, existing);
  });

  return Array.from(summaryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const calculateSummaryByProgram = (items: BudgetItem[]): BudgetSummary[] => {
  const summaryMap = new Map<string, BudgetSummary>();

  items.forEach(item => {
    const key = item.program_pembebanan || 'Unknown';
    const existing = summaryMap.get(key) || {
      label: key,
      totalSemula: 0,
      totalMenjadi: 0,
      totalSelisih: 0,
      itemCount: 0,
      changedItemCount: 0,
      newItemCount: 0,
      type: 'program' as const,
    };

    existing.totalSemula = roundToThousands(existing.totalSemula + (item.jumlah_semula || 0));
    existing.totalMenjadi = roundToThousands(existing.totalMenjadi + (item.jumlah_menjadi || 0));
    existing.totalSelisih = roundToThousands(existing.totalSelisih + (item.selisih || 0));
    existing.itemCount++;
    if (item.status === 'changed') existing.changedItemCount++;
    if (item.status === 'new') existing.newItemCount++;

    summaryMap.set(key, existing);
  });

  return Array.from(summaryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
};

const calculateSummaryByKegiatan = (items: BudgetItem[]): BudgetSummary[] => {
  const summaryMap = new Map<string, BudgetSummary>();

  items.forEach(item => {
    const key = item.kegiatan || 'Unknown';
    const existing = summaryMap.get(key) || {
      label: key,
      totalSemula: 0,
      totalMenjadi: 0,
      totalSelisih: 0,
      itemCount: 0,
      changedItemCount: 0,
      newItemCount: 0,
      type: 'kegiatan' as const,
    };

    existing.totalSemula = roundToThousands(existing.totalSemula + (item.jumlah_semula || 0));
    existing.totalMenjadi = roundToThousands(existing.totalMenjadi + (item.jumlah_menjadi || 0));
    existing.totalSelisih = roundToThousands(existing.totalSelisih + (item.selisih || 0));
    existing.itemCount++;
    if (item.status === 'changed') existing.changedItemCount++;
    if (item.status === 'new') existing.newItemCount++;

    summaryMap.set(key, existing);
  });

  return Array.from(summaryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Helper: Update budget item in Google Sheets
 */
const updateBudgetItemInSheet = async (sheetId: string, itemId: string, updates: Partial<BudgetItem>) => {
  try {
    const result = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId: sheetId,
        operation: 'update',
        range: 'budget_items',
        itemId,
        data: updates,
      },
    });

    if (result.error) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
      throw new Error(`Failed to update budget item in sheet: ${errorMsg}`);
    }
    return result.data;
  } catch (err) {
    console.error('[updateBudgetItemInSheet] Error:', err);
    throw err;
  }
};

/**
 * Helper: Update RPD item in Google Sheets
 */
const updateRPDItemInSheet = async (sheetId: string, itemId: string, monthValues: Partial<RPDItem>) => {
  try {
    const result = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId: sheetId,
        operation: 'update',
        range: 'rpd_items',
        itemId,
        data: monthValues,
      },
    });

    if (result.error) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
      throw new Error(`Failed to update RPD item in sheet: ${errorMsg}`);
    }
    return result.data;
  } catch (err) {
    console.error('[updateRPDItemInSheet] Error:', err);
    throw err;
  }
};

/**
 * Helper: Import budget items (bulk insert)
 */
const importBudgetItems = async (sheetId: string, items: Partial<BudgetItem>[]) => {
  try {
    const result = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId: sheetId,
        operation: 'append',
        range: 'budget_items',
        data: items,
      },
    });

    if (result.error) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
      throw new Error(`Failed to import budget items: ${errorMsg}`);
    }
    console.log(`[importBudgetItems] Successfully imported ${items.length} items`);
    return result.data;
  } catch (err) {
    console.error('[importBudgetItems] Error:', err);
    throw err;
  }
};

/**
 * Helper: Delete budget item from Google Sheets
 */
const deleteBudgetItem = async (sheetId: string, itemId: string) => {
  try {
    const result = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId: sheetId,
        operation: 'delete',
        range: 'budget_items',
        itemId,
      },
    });

    if (result.error) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
      throw new Error(`Failed to delete budget item: ${errorMsg}`);
    }
    return result.data;
  } catch (err) {
    console.error('[deleteBudgetItem] Error:', err);
    throw err;
  }
};

/**
 * Hook untuk fetch budget items dengan filtering
 */
export const useBahanRevisiData = ({ sheetId, filters, enabled = true }: UseBahanRevisiDataProps) => {
  const budgetItemsQuery = useQuery({
    queryKey: ['bahanrevisi-budget-items', sheetId],
    queryFn: () => fetchBudgetItems(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const rpdItemsQuery = useQuery({
    queryKey: ['bahanrevisi-rpd-items', sheetId],
    queryFn: () => fetchRPDItems(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 5,
  });

  const programsQuery = useQuery({
    queryKey: ['bahanrevisi-programs', sheetId],
    queryFn: () => fetchPrograms(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 30, // 30 minutes (master data, less frequently changed)
  });

  const kegiatansQuery = useQuery({
    queryKey: ['bahanrevisi-kegiatans', sheetId],
    queryFn: () => fetchKegiatans(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 30,
  });

  const rincianOutputsQuery = useQuery({
    queryKey: ['bahanrevisi-rincian-outputs', sheetId],
    queryFn: () => fetchRincianOutputs(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 30,
  });

  const komponenOutputsQuery = useQuery({
    queryKey: ['bahanrevisi-komponen-outputs', sheetId],
    queryFn: () => fetchKomponenOutputs(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 30,
  });

  const subKomponenQuery = useQuery({
    queryKey: ['bahanrevisi-sub-komponen', sheetId],
    queryFn: () => fetchSubKomponen(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 30,
  });

  const akunsQuery = useQuery({
    queryKey: ['bahanrevisi-akuns', sheetId],
    queryFn: () => fetchAkuns(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 30,
  });

  // Filter budget items berdasarkan filters
  const filteredBudgetItems = filters && budgetItemsQuery.data 
    ? filterBudgetItems(budgetItemsQuery.data, filters)
    : budgetItemsQuery.data;

  // Get dropdown options with "code - name" format
  // Maps codes to their display format using master sheets

  const programsOptions = budgetItemsQuery.data && programsQuery.data
    ? Array.from(new Set(budgetItemsQuery.data.map(item => item.program_pembebanan)))
        .map(code => {
          const prog = programsQuery.data.find(p => p.code === code);
          return prog ? `${prog.code} - ${prog.name}` : code;
        })
        .sort()
    : [];

  const kegiatansOptions = filters?.program_pembebanan && budgetItemsQuery.data && kegiatansQuery.data
    ? budgetItemsQuery.data
        .filter(item => item.program_pembebanan === filters.program_pembebanan)
        .map(item => item.kegiatan)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map(code => {
          const keg = kegiatansQuery.data.find(k => k.code === code);
          return keg ? `${keg.code} - ${keg.name}` : code;
        })
        .sort()
    : [];

  const rincianOutputsOptions = filters?.kegiatan && budgetItemsQuery.data && rincianOutputsQuery.data
    ? budgetItemsQuery.data
        .filter(item => item.kegiatan === filters.kegiatan)
        .map(item => item.rincian_output)
        .filter((v, i, a) => a.indexOf(v) === i && v)
        .map(code => {
          const rio = rincianOutputsQuery.data.find(r => r.code === code);
          return rio ? `${rio.code} - ${rio.name}` : code;
        })
        .sort()
    : [];

  const komponenOutputsOptions = filters?.rincian_output && budgetItemsQuery.data && komponenOutputsQuery.data
    ? budgetItemsQuery.data
        .filter(item => item.rincian_output === filters.rincian_output)
        .map(item => item.komponen_output)
        .filter((v, i, a) => a.indexOf(v) === i && v)
        .map(code => {
          const ko = komponenOutputsQuery.data.find(k => k.code === code);
          return ko ? `${ko.code} - ${ko.name}` : code;
        })
        .sort()
    : [];

  const subKomponenOptions = filters?.komponen_output && budgetItemsQuery.data && subKomponenQuery.data
    ? budgetItemsQuery.data
        .filter(item => item.komponen_output === filters.komponen_output)
        .map(item => item.sub_komponen)
        .filter((v, i, a) => a.indexOf(v) === i && v)
        .map(code => {
          const sk = subKomponenQuery.data.find(s => s.code === code);
          return sk ? `${sk.code} - ${sk.name}` : code;
        })
        .sort()
    : [];

  const akunsOptions = filters?.sub_komponen && budgetItemsQuery.data && akunsQuery.data
    ? budgetItemsQuery.data
        .filter(item => item.sub_komponen === filters.sub_komponen)
        .map(item => item.akun)
        .filter((v, i, a) => a.indexOf(v) === i && v)
        .map(code => {
          const akun = akunsQuery.data.find(a => a.code === code);
          return akun ? `${akun.code} - ${akun.name}` : code;
        })
        .sort()
    : [];

  const isLoading = budgetItemsQuery.isLoading || rpdItemsQuery.isLoading || 
                   programsQuery.isLoading || kegiatansQuery.isLoading ||
                   rincianOutputsQuery.isLoading || komponenOutputsQuery.isLoading ||
                   subKomponenQuery.isLoading || akunsQuery.isLoading;

  const error = budgetItemsQuery.error || rpdItemsQuery.error || 
               programsQuery.error || kegiatansQuery.error ||
               rincianOutputsQuery.error || komponenOutputsQuery.error ||
               subKomponenQuery.error || akunsQuery.error;

  // Convert error to string message if it exists - be defensive to avoid rendering objects
  let errorMessage: string | null = null;
  if (error) {
    try {
      if (error instanceof Error) {
        errorMessage = error.message || String(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as any).message || JSON.stringify(error);
      } else {
        errorMessage = String(error) || 'Unknown error occurred';
      }
    } catch (e) {
      errorMessage = 'Error occurred while fetching data';
    }
  }

  // Calculate summary data
  const summaryByKomponen = budgetItemsQuery.data ? calculateSummaryByKomponen(budgetItemsQuery.data) : [];
  const summaryByAkun = budgetItemsQuery.data ? calculateSummaryByAkun(budgetItemsQuery.data) : [];
  const summaryByProgram = budgetItemsQuery.data ? calculateSummaryByProgram(budgetItemsQuery.data) : [];
  const summaryByKegiatan = budgetItemsQuery.data ? calculateSummaryByKegiatan(budgetItemsQuery.data) : [];

  // Overall statistics
  const totalBudgetSemula = budgetItemsQuery.data 
    ? roundToThousands(budgetItemsQuery.data.reduce((sum, item) => sum + (item.jumlah_semula || 0), 0))
    : 0;
  
  const totalBudgetMenjadi = budgetItemsQuery.data
    ? roundToThousands(budgetItemsQuery.data.reduce((sum, item) => sum + (item.jumlah_menjadi || 0), 0))
    : 0;

  const totalSelisih = budgetItemsQuery.data
    ? roundToThousands(budgetItemsQuery.data.reduce((sum, item) => sum + (item.selisih || 0), 0))
    : 0;

  const totalNewItems = budgetItemsQuery.data
    ? budgetItemsQuery.data.filter(item => item.status === 'new').length
    : 0;

  const totalChangedItems = budgetItemsQuery.data
    ? budgetItemsQuery.data.filter(item => item.status === 'changed').length
    : 0;

  const totalRPDAllocated = (Array.isArray(rpdItemsQuery.data) && rpdItemsQuery.data.length > 0)
    ? roundToThousands(rpdItemsQuery.data.reduce((sum, item) => sum + (Number(item?.total_rpd) || 0), 0))
    : 0;

  const totalBlokir = budgetItemsQuery.data
    ? roundToThousands(budgetItemsQuery.data.reduce((sum, item) => sum + (item.blokir || 0), 0))
    : 0;

  // Enrich RPD items with blokir values from budget items (match by ID)
  const enrichedRPDItems = useMemo(() => {
    if (!rpdItemsQuery.data || !budgetItemsQuery.data) return [];
    return rpdItemsQuery.data.map(rpdItem => {
      const matchingBudgetItem = budgetItemsQuery.data?.find(b => b.id === rpdItem.id);
      return {
        ...rpdItem,
        rincian_output: matchingBudgetItem?.rincian_output || rpdItem.rincian_output || '',
        blokir: matchingBudgetItem?.blokir || 0
      };
    });
  }, [rpdItemsQuery.data, budgetItemsQuery.data]);

  return {
    budgetItems: budgetItemsQuery.data || [],
    filteredBudgetItems: filteredBudgetItems || [],
    rpdItems: enrichedRPDItems,
    programs: programsQuery.data || [],
    kegiatans: kegiatansQuery.data || [],
    rincianOutputs: rincianOutputsQuery.data || [],
    komponenOutputs: komponenOutputsQuery.data || [],
    subKomponen: subKomponenQuery.data || [],
    akuns: akunsQuery.data || [],
    programsOptions,
    kegiatansOptions,
    rincianOutputsOptions,
    komponenOutputsOptions,
    subKomponenOptions,
    akunsOptions,
    isLoading,
    error: errorMessage,
    
    // Summary data
    summaryByKomponen,
    summaryByAkun,
    summaryByProgram,
    summaryByKegiatan,
    
    // Overall statistics
    totalBudgetSemula,
    totalBudgetMenjadi,
    totalSelisih,
    totalBlokir,
    totalNewItems,
    totalChangedItems,
    totalRPDAllocated,
    
    // Operations
    updateBudgetItem: (itemId: string, updates: Partial<BudgetItem>) => 
      updateBudgetItemInSheet(sheetId!, itemId, updates),
    updateRPDItem: (itemId: string, monthValues: Partial<RPDItem>) => 
      updateRPDItemInSheet(sheetId!, itemId, monthValues),
    importBudgetItems: (items: Partial<BudgetItem>[]) => 
      importBudgetItems(sheetId!, items),
    deleteBudgetItem: (itemId: string) => 
      deleteBudgetItem(sheetId!, itemId),
    
    refetch: async () => {
      await Promise.all([
        budgetItemsQuery.refetch(),
        rpdItemsQuery.refetch(),
        programsQuery.refetch(),
        kegiatansQuery.refetch(),
        rincianOutputsQuery.refetch(),
        komponenOutputsQuery.refetch(),
        subKomponenQuery.refetch(),
        akunsQuery.refetch(),
      ]);
    },
  };
};
