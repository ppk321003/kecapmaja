/**
 * Custom hook untuk membaca data Bahan Revisi Anggaran dari Google Sheets
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
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
import { filterBudgetItems, getFilteredDropdownValues } from '@/utils/bahanrevisi-calculations';

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
      range: 'budget_items!A:AI', // A sampai AI (35 kolom)
    },
  });

  if (result.error) {
    console.error('[fetchBudgetItems] Error:', result.error);
    throw result.error;
  }

  const rows = result.data?.values || [];
  if (rows.length <= 1) {
    console.log('[fetchBudgetItems] No budget items found');
    return [];
  }

  // Skip header row dan map ke BudgetItem[]
  const items: BudgetItem[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim()) // Filter empty rows
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      program_pembebanan: row[1]?.trim() || '',
      program_code: row[2]?.trim() || '',
      kegiatan: row[3]?.trim() || '',
      kegiatan_code: row[4]?.trim() || '',
      rincian_output: row[5]?.trim() || '',
      rincian_output_code: row[6]?.trim() || '',
      komponen_output: row[7]?.trim() || '',
      komponen_output_code: row[8]?.trim() || '',
      sub_komponen: row[9]?.trim() || '',
      sub_komponen_code: row[10]?.trim() || '',
      akun: row[11]?.trim() || '',
      akun_code: row[12]?.trim() || '',
      account_group: row[13]?.trim() || '',
      account_group_name: row[14]?.trim() || '',
      uraian: row[15]?.trim() || '',
      volume_semula: parseFloat(row[16]) || 0,
      satuan_semula: row[17]?.trim() || '',
      harga_satuan_semula: parseFloat(row[18]) || 0,
      jumlah_semula: parseFloat(row[19]) || 0,
      volume_menjadi: parseFloat(row[20]) || 0,
      satuan_menjadi: row[21]?.trim() || '',
      harga_satuan_menjadi: parseFloat(row[22]) || 0,
      jumlah_menjadi: parseFloat(row[23]) || 0,
      selisih: parseFloat(row[24]) || 0,
      status: (row[25]?.trim() as any) || 'unchanged',
      approved_by: row[26]?.trim(),
      approved_date: row[27]?.trim(),
      rejected_by: row[28]?.trim(),
      rejected_date: row[29]?.trim(),
      rejection_reason: row[30]?.trim(),
      submitted_by: row[31]?.trim() || '',
      submitted_date: row[32]?.trim() || '',
      updated_date: row[33]?.trim() || '',
      notes: row[34]?.trim(),
    }));

  console.log(`[fetchBudgetItems] Loaded ${items.length} budget items`);
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
      range: 'rpd_items!A:Y',
    },
  });

  if (result.error) throw result.error;

  const rows = result.data?.values || [];
  if (rows.length <= 1) return [];

  const items: RPDItem[] = rows.slice(1)
    .filter((row: string[]) => row[0]?.trim())
    .map((row: string[]) => ({
      id: row[0]?.trim() || '',
      program_pembebanan: row[1]?.trim() || '',
      kegiatan: row[2]?.trim() || '',
      komponen_output: row[3]?.trim() || '',
      sub_komponen: row[4]?.trim() || '',
      akun: row[5]?.trim() || '',
      uraian: row[6]?.trim() || '',
      total_pagu: parseFloat(row[7]) || 0,
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
      total_rpd: parseFloat(row[20]) || 0,
      sisa_anggaran: parseFloat(row[21]) || 0,
      status: row[22]?.trim() || '',
      modified_by: row[23]?.trim(),
      modified_date: row[24]?.trim(),
    }));

  console.log(`[fetchRPDItems] Loaded ${items.length} RPD items`);
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

  if (result.error) throw result.error;

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

  if (result.error) throw result.error;

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

  if (result.error) throw result.error;

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

  if (result.error) throw result.error;

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

  if (result.error) throw result.error;

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

  if (result.error) throw result.error;

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
  return akuns;
};

/**
 * Hook untuk fetch budget items dengan filtering
 */
export const useBahanRevisiData = ({ sheetId, filters, enabled = true }: UseBahanRevisiDataProps) => {
  const queryClient = useQueryClient();

  const budgetItemsQuery = useQuery({
    queryKey: ['bahanrevisi-budget-items', sheetId],
    queryFn: () => fetchBudgetItems(sheetId!),
    enabled: enabled && !!sheetId,
    staleTime: 1000 * 60 * 5,
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
    staleTime: 1000 * 60 * 30,
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

  // Filter budget items berdasarkan filters - memoized
  const filteredBudgetItems = useMemo(() => {
    if (!filters || !budgetItemsQuery.data) return budgetItemsQuery.data || [];
    return filterBudgetItems(budgetItemsQuery.data, filters);
  }, [filters, budgetItemsQuery.data]);

  // Get dropdown options - memoized
  const programsOptions = useMemo(() => {
    if (!budgetItemsQuery.data) return [];
    return Array.from(new Set(budgetItemsQuery.data.map(item => item.program_pembebanan))).sort();
  }, [budgetItemsQuery.data]);

  const kegiatansOptions = useMemo(() => {
    if (!filters?.program_pembebanan || !budgetItemsQuery.data) return [];
    return budgetItemsQuery.data
      .filter(item => item.program_pembebanan === filters.program_pembebanan)
      .map(item => item.kegiatan)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [filters?.program_pembebanan, budgetItemsQuery.data]);

  const isLoading = useMemo(() => {
    return budgetItemsQuery.isLoading || rpdItemsQuery.isLoading || 
           programsQuery.isLoading || kegiatansQuery.isLoading ||
           rincianOutputsQuery.isLoading || komponenOutputsQuery.isLoading ||
           subKomponenQuery.isLoading || akunsQuery.isLoading;
  }, [budgetItemsQuery.isLoading, rpdItemsQuery.isLoading, programsQuery.isLoading, 
      kegiatansQuery.isLoading, rincianOutputsQuery.isLoading, komponenOutputsQuery.isLoading,
      subKomponenQuery.isLoading, akunsQuery.isLoading]);

  const error = useMemo(() => {
    return budgetItemsQuery.error || rpdItemsQuery.error || 
           programsQuery.error || kegiatansQuery.error ||
           rincianOutputsQuery.error || komponenOutputsQuery.error ||
           subKomponenQuery.error || akunsQuery.error;
  }, [budgetItemsQuery.error, rpdItemsQuery.error, programsQuery.error, 
      kegiatansQuery.error, rincianOutputsQuery.error, komponenOutputsQuery.error,
      subKomponenQuery.error, akunsQuery.error]);

  // Refetch callback - safe to use in effects
  const refetch = useCallback(() => {
    if (sheetId) {
      budgetItemsQuery.refetch();
      rpdItemsQuery.refetch();
      programsQuery.refetch();
      kegiatansQuery.refetch();
      rincianOutputsQuery.refetch();
      komponenOutputsQuery.refetch();
      subKomponenQuery.refetch();
      akunsQuery.refetch();
    }
  }, [sheetId, budgetItemsQuery, rpdItemsQuery, programsQuery, kegiatansQuery, 
      rincianOutputsQuery, komponenOutputsQuery, subKomponenQuery, akunsQuery]);

  return {
    budgetItems: budgetItemsQuery.data || [],
    filteredBudgetItems: filteredBudgetItems || [],
    rpdItems: rpdItemsQuery.data || [],
    programs: programsQuery.data || [],
    kegiatans: kegiatansQuery.data || [],
    rincianOutputs: rincianOutputsQuery.data || [],
    komponenOutputs: komponenOutputsQuery.data || [],
    subKomponen: subKomponenQuery.data || [],
    akuns: akunsQuery.data || [],
    programsOptions,
    kegiatansOptions,
    isLoading,
    error: error as Error | null,
    refetch
  };
};
