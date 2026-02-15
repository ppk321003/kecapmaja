/**
 * Utility functions untuk Bahan Revisi Anggaran calculations
 */

import { BudgetItem, BudgetSummary, BudgetSummaryByGroup, RPDItem, RPDSummary } from '@/types/bahanrevisi';

/**
 * Format currency to IDR format
 */
export const formatCurrency = (value: number, showDecimals = false): string => {
  if (isNaN(value)) return 'Rp 0';
  
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  
  return formatter.format(value);
};

/**
 * Round to nearest thousands
 */
export const roundToThousands = (value: number): number => {
  return Math.round(value / 1000) * 1000;
};

/**
 * Calculate jumlah_semula (volume_semula * harga_satuan_semula)
 */
export const calculateJumlahSemula = (volumeSemula: number, hargaSatuanSemula: number): number => {
  return (volumeSemula || 0) * (hargaSatuanSemula || 0);
};

/**
 * Calculate jumlah_menjadi (volume_menjadi * harga_satuan_menjadi)
 */
export const calculateJumlahMenjadi = (volumeMenjadi: number, hargaSatuanMenjadi: number): number => {
  return (volumeMenjadi || 0) * (hargaSatuanMenjadi || 0);
};

/**
 * Calculate selisih (jumlah_menjadi - jumlah_semula)
 */
export const calculateSelisih = (jumlahMenjadi: number, jumlahSemula: number): number => {
  return (jumlahMenjadi || 0) - (jumlahSemula || 0);
};

/**
 * Calculate budget summary from array of budget items
 */
export const calculateBudgetSummary = (items: BudgetItem[]): BudgetSummary => {
  const summary = items.reduce((acc, item) => {
    acc.total_semula += item.jumlah_semula || 0;
    acc.total_menjadi += item.jumlah_menjadi || 0;
    acc.total_selisih += item.selisih || 0;
    
    if (item.status === 'new') acc.new_items_count++;
    else if (item.status === 'changed') acc.changed_items_count++;
    else if (item.status === 'unchanged') acc.unchanged_items_count++;
    else if (item.status === 'deleted') acc.deleted_items_count++;
    
    acc.total_items_count++;
    return acc;
  }, {
    total_semula: 0,
    total_menjadi: 0,
    total_selisih: 0,
    new_items_count: 0,
    changed_items_count: 0,
    unchanged_items_count: 0,
    deleted_items_count: 0,
    total_items_count: 0,
  });

  return summary;
};

/**
 * Calculate budget summary grouped by account_group
 */
export const calculateBudgetSummaryByGroup = (items: BudgetItem[]): BudgetSummaryByGroup[] => {
  const groupMap = new Map<string, BudgetSummaryByGroup>();

  items.forEach(item => {
    const groupKey = `${item.account_group}|${item.account_group_name}`;
    
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        account_group: item.account_group,
        account_group_name: item.account_group_name,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        new_items: 0,
        changed_items: 0,
        unchanged_items: 0,
        deleted_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(groupKey)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
    else if (item.status === 'unchanged') group.unchanged_items++;
    else if (item.status === 'deleted') group.deleted_items++;
  });

  return Array.from(groupMap.values());
};

/**
 * Calculate RPD summary from array of RPD items
 */
export const calculateRPDSummary = (items: RPDItem[]): RPDSummary => {
  const summary = items.reduce((acc, item) => {
    acc.total_pagu += item.total_pagu || 0;
    acc.total_rpd += item.total_rpd || 0;
    acc.total_sisa_anggaran += item.sisa_anggaran || 0;
    acc.items_count++;
    return acc;
  }, {
    total_pagu: 0,
    total_rpd: 0,
    total_sisa_anggaran: 0,
    items_count: 0,
  });

  return summary;
};

/**
 * Filter budget items based on criteria
 */
export const filterBudgetItems = (
  items: BudgetItem[],
  filters: {
    program_pembebanan?: string;
    kegiatan?: string;
    rincian_output?: string;
    komponen_output?: string;
    sub_komponen?: string;
    akun?: string;
  }
): BudgetItem[] => {
  return items.filter(item => {
    if (filters.program_pembebanan && item.program_pembebanan !== filters.program_pembebanan) return false;
    if (filters.kegiatan && item.kegiatan !== filters.kegiatan) return false;
    if (filters.rincian_output && item.rincian_output !== filters.rincian_output) return false;
    if (filters.komponen_output && item.komponen_output !== filters.komponen_output) return false;
    if (filters.sub_komponen && item.sub_komponen !== filters.sub_komponen) return false;
    if (filters.akun && item.akun !== filters.akun) return false;
    return true;
  });
};

/**
 * Get unique values from items for filter dropdowns
 */
export const getUniqueValues = (items: BudgetItem[], field: keyof BudgetItem): string[] => {
  const values = new Set<string>();
  items.forEach(item => {
    const value = item[field];
    if (value && typeof value === 'string') {
      values.add(value);
    }
  });
  return Array.from(values).sort();
};

/**
 * Get filtered values based on parent filter
 * e.g., get all kegiatan that belong to selected program_pembebanan
 */
export const getFilteredDropdownValues = (
  items: BudgetItem[],
  targetField: keyof BudgetItem,
  parentFilters: Record<string, string>
): string[] => {
  let filtered = items;
  
  // Apply parent filters
  Object.entries(parentFilters).forEach(([filterKey, filterValue]) => {
    if (filterValue) {
      filtered = filtered.filter(item => {
        const itemValue = item[filterKey as keyof BudgetItem];
        return itemValue === filterValue;
      });
    }
  });

  // Get unique values for target field
  return getUniqueValues(filtered, targetField);
};

/**
 * Check if item needs approval
 */
export const needsApproval = (item: BudgetItem): boolean => {
  return (item.status === 'new' || item.status === 'changed') && !item.approved_by;
};

/**
 * Check if item is approved
 */
export const isApproved = (item: BudgetItem): boolean => {
  return !!item.approved_by && !!item.approved_date;
};

/**
 * Check if item is rejected
 */
export const isRejected = (item: BudgetItem): boolean => {
  return !!item.rejected_by && !!item.rejected_date;
};

/**
 * Format date to readable format
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

/**
 * Generate unique ID (timestamp-based)
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
