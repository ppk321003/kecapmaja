/**
 * Utility functions untuk Bahan Revisi Anggaran calculations
 */

import { BudgetItem, BudgetItemStatus, BudgetSummary, BudgetSummaryByGroup, BudgetSummaryByProgramPembebanan, BudgetSummaryByKegiatan, BudgetSummaryByRincianOutput, BudgetSummaryByKomponenOutput, BudgetSummaryBySubKomponen, BudgetSummaryByAkun, RPDItem, RPDSummary } from '@/types/bahanrevisi';

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
 * Format number with thousands separator (no currency symbol)
 */
export const formatNumber = (value: number, showDecimals = false): string => {
  if (isNaN(value)) return '0';
  
  const formatter = new Intl.NumberFormat('id-ID', {
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
 * Format date to Indonesia format: hh:mm - dd/mm/yyyy
 */
export const formatDateIndonesia = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch (e) {
    return '';
  }
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
    // Group by akun (account) instead of removed account_group field
    const groupKey = item.akun || 'Uncategorized';
    
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        account_group: groupKey,
        account_group_name: groupKey,
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
 * Determine the status of an item based on changes from semula to menjadi
 * Adapted from reference implementation
 */
export const determineStatusFromChanges = (item: BudgetItem): BudgetItemStatus => {
  // Check if this is a new item (no semula values)
  if ((item.volume_semula === 0 || item.jumlah_semula === 0) && item.jumlah_menjadi > 0) {
    return 'new';
  }
  
  // Check if there are changes
  const volumeChanged = item.volume_semula !== item.volume_menjadi;
  const satuanChanged = item.satuan_semula !== item.satuan_menjadi;
  const hargaChanged = item.harga_satuan_semula !== item.harga_satuan_menjadi;
  const selisihExists = (item.selisih || 0) !== 0;
  
  if (volumeChanged || satuanChanged || hargaChanged || selisihExists) {
    return 'changed';
  }
  
  // No changes detected
  return 'unchanged';
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
  return !!item.rejected_date;
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
/**
 * Calculate amount (volume * price per unit)
 * Adapted from reference implementation
 */
export const calculateAmount = (volume: number, pricePerUnit: number): number => {
  return (volume || 0) * (pricePerUnit || 0);
};

/**
 * Calculate difference with rounding
 */
export const calculateDifference = (amountAfter: number, amountBefore: number): number => {
  return roundToThousands((amountAfter || 0) - (amountBefore || 0));
};

/**
 * Determine item status based on volume and price changes
 */
export const updateItemStatus = (item: BudgetItem): BudgetItem => {
  const updated = { ...item };
  
  // Check if unchanged
  if (
    item.volume_semula === item.volume_menjadi &&
    item.satuan_semula === item.satuan_menjadi &&
    item.harga_satuan_semula === item.harga_satuan_menjadi
  ) {
    updated.status = 'unchanged';
  }
  // Check if new (any field went from 0/empty to having a value)
  else if (
    (item.volume_semula === 0 && item.volume_menjadi > 0) ||
    (item.satuan_semula === '' && item.satuan_menjadi !== '') ||
    (item.harga_satuan_semula === 0 && item.harga_satuan_menjadi > 0)
  ) {
    updated.status = 'new';
  }
  // Otherwise changed
  else {
    updated.status = 'changed';
  }
  
  return updated;
};

/**
 * Apply status determination to multiple items
 */
export const applyStatusToItems = (items: BudgetItem[]): BudgetItem[] => {
  return items.map(item => updateItemStatus(item));
};

/**
 * Calculate grand total by field
 */
export const calculateGrandTotal = (items: BudgetItem[], field: keyof BudgetItem): number => {
  return roundToThousands(
    items.reduce((sum, item) => {
      const value = item[field];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0)
  );
};

/**
 * Get statistics for items
 */
export const getItemStatistics = (items: BudgetItem[]) => {
  return {
    totalItems: items.length,
    newItems: items.filter(i => i.status === 'new').length,
    changedItems: items.filter(i => i.status === 'changed').length,
    unchangedItems: items.filter(i => i.status === 'unchanged').length,
    deletedItems: items.filter(i => i.status === 'deleted').length,
    approvedItems: items.filter(i => i.approved_by).length,
    needsApprovalItems: items.filter(item => needsApproval(item)).length,
  };
};

/**
 * Group items by a specific field
 */
export const groupItemsByField = (
  items: BudgetItem[], 
  field: keyof BudgetItem
): Map<string, BudgetItem[]> => {
  const grouped = new Map<string, BudgetItem[]>();
  
  items.forEach(item => {
    const key = String(item[field] || 'Unknown');
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  });
  
  return grouped;
};

/**
 * Convert JSON to CSV format for export
 */
export const convertToCSV = (items: BudgetItem[], headers: (keyof BudgetItem)[]): string => {
  const headerRow = headers.join(',');
  const dataRows = items.map(item =>
    headers.map(header => {
      const value = item[header];
      // Escape CSV values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Export items to CSV file
 */
export const exportToCSV = (items: BudgetItem[], filename: string, headers: (keyof BudgetItem)[]) => {
  const csv = convertToCSV(items, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

/**
 * Parse CSV file to items array
 */
export const parseCSV = async (file: File): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) {
          resolve([]);
          return;
        }
        
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(v => v.trim());
            const record: Record<string, string> = {};
            headers.forEach((header, index) => {
              record[header] = values[index] || '';
            });
            return record;
          });
        
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * Calculate summary by Program Pembebanan
 */
export const calculateBudgetSummaryByProgramPembebanan = (
  items: BudgetItem[]
): BudgetSummaryByProgramPembebanan[] => {
  const groupMap = new Map<string, BudgetSummaryByProgramPembebanan>();

  items.forEach((item) => {
    const key = item.program_pembebanan || 'Uncategorized';

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        program_pembebanan: key,
        name: key,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(key)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.program_pembebanan.localeCompare(b.program_pembebanan)
  );
};

/**
 * Calculate summary by Kegiatan
 */
export const calculateBudgetSummaryByKegiatan = (
  items: BudgetItem[]
): BudgetSummaryByKegiatan[] => {
  const groupMap = new Map<string, BudgetSummaryByKegiatan>();

  items.forEach((item) => {
    const key = item.kegiatan || 'Uncategorized';

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        kegiatan: key,
        name: key,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(key)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.kegiatan.localeCompare(b.kegiatan)
  );
};

/**
 * Calculate summary by Rincian Output
 */
export const calculateBudgetSummaryByRincianOutput = (
  items: BudgetItem[]
): BudgetSummaryByRincianOutput[] => {
  const groupMap = new Map<string, BudgetSummaryByRincianOutput>();

  items.forEach((item) => {
    const key = item.rincian_output || 'Uncategorized';

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        rincian_output: key,
        name: key,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(key)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.rincian_output.localeCompare(b.rincian_output)
  );
};

/**
 * Calculate summary by Komponen Output
 */
export const calculateBudgetSummaryByKomponenOutput = (
  items: BudgetItem[]
): BudgetSummaryByKomponenOutput[] => {
  const groupMap = new Map<string, BudgetSummaryByKomponenOutput>();

  items.forEach((item) => {
    const key = item.komponen_output || 'Uncategorized';

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        komponen_output: key,
        name: key,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(key)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.komponen_output.localeCompare(b.komponen_output)
  );
};

/**
 * Calculate summary by Sub Komponen
 */
export const calculateBudgetSummaryBySubKomponen = (
  items: BudgetItem[]
): BudgetSummaryBySubKomponen[] => {
  const groupMap = new Map<string, BudgetSummaryBySubKomponen>();

  items.forEach((item) => {
    const key = item.sub_komponen || 'Uncategorized';

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        sub_komponen: key,
        name: key,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(key)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.sub_komponen.localeCompare(b.sub_komponen)
  );
};

/**
 * Calculate summary by Akun
 */
export const calculateBudgetSummaryByAkun = (
  items: BudgetItem[]
): BudgetSummaryByAkun[] => {
  const groupMap = new Map<string, BudgetSummaryByAkun>();

  items.forEach((item) => {
    const key = item.akun || 'Uncategorized';

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        akun: key,
        name: key,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(key)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.akun.localeCompare(b.akun)
  );
};

/**
 * Calculate realisasi (realisasi = jumlah_menjadi - sisa_anggaran - blokir)
 */
export const calculateRealisasi = (jumlahMenjadi: number, sisaAnggaran: number, blokir: number = 0): number => {
  return roundToThousands(jumlahMenjadi - sisaAnggaran - blokir);
};

/**
 * Calculate percentage realisasi
 */
export const calculatePersentaseRealisasi = (realisasi: number, jumlahMenjadi: number): number => {
  if (jumlahMenjadi === 0) return 0;
  return Math.round((realisasi / jumlahMenjadi) * 100 * 100) / 100; // Round to 2 decimal places
};

/**
 * Format percentage to string
 */
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(2)}%`;
};

/**
 * Calculate summary by Kelompok Akun (first 3 digits of akun code)
 */
export const calculateBudgetSummaryByKelompokAkun = (
  items: BudgetItem[]
): BudgetSummaryByAkun[] => {
  const groupMap = new Map<string, BudgetSummaryByAkun>();

  items.forEach((item) => {
    if (!item.akun) return;
    
    // Extract first 3 characters/digits from akun code
    const kelompokAkun = item.akun.substring(0, 3);
    
    if (!groupMap.has(kelompokAkun)) {
      groupMap.set(kelompokAkun, {
        akun: kelompokAkun,
        name: kelompokAkun,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(kelompokAkun)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.akun.localeCompare(b.akun)
  );
};

/**
 * Calculate summary by Kelompok Belanja (first 2 digits of akun code)
 */
export const calculateBudgetSummaryByKelompokBelanja = (
  items: BudgetItem[]
): BudgetSummaryByAkun[] => {
  const groupMap = new Map<string, BudgetSummaryByAkun>();

  items.forEach((item) => {
    if (!item.akun) return;
    
    // Extract first 2 characters/digits from akun code
    const kelompokBelanja = item.akun.substring(0, 2);
    
    if (!groupMap.has(kelompokBelanja)) {
      groupMap.set(kelompokBelanja, {
        akun: kelompokBelanja,
        name: kelompokBelanja,
        total_semula: 0,
        total_menjadi: 0,
        total_selisih: 0,
        sisa_anggaran: 0,
        blokir: 0,
        new_items: 0,
        changed_items: 0,
        total_items: 0,
      });
    }

    const group = groupMap.get(kelompokBelanja)!;
    group.total_semula += item.jumlah_semula || 0;
    group.total_menjadi += item.jumlah_menjadi || 0;
    group.total_selisih += item.selisih || 0;
    group.sisa_anggaran += item.sisa_anggaran || 0;
    group.blokir += item.blokir || 0;
    group.total_items++;

    if (item.status === 'new') group.new_items++;
    else if (item.status === 'changed') group.changed_items++;
  });

  return Array.from(groupMap.values()).sort((a, b) =>
    a.akun.localeCompare(b.akun)
  );
};