/**
 * Custom hook untuk submit/update data Bahan Revisi Anggaran ke Google Sheets
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BudgetItem, RPDItem } from '@/types/bahanrevisi';
import { generateId, formatDateIndonesia, calculateJumlahMenjadi } from '@/utils/bahanrevisi-calculations';

interface UseBahanRevisiSubmitProps {
  sheetId: string | null;
}

/**
 * Convert BudgetItem to array for Google Sheets (26 columns)
 */
const budgetItemToRow = (item: BudgetItem): (string | number | boolean | null)[] => {
  return [
    item.id,
    item.program_pembebanan,
    item.kegiatan,
    item.rincian_output,
    item.komponen_output,
    item.sub_komponen,
    item.akun,
    item.uraian,
    item.volume_semula,
    item.satuan_semula,
    item.harga_satuan_semula,
    item.jumlah_semula,
    item.volume_menjadi,
    item.satuan_menjadi,
    item.harga_satuan_menjadi,
    item.jumlah_menjadi,
    item.selisih,
    item.sisa_anggaran || 0,
    item.blokir || 0,
    item.status,
    item.approved_by || '',
    item.approved_date || '',
    item.rejected_date || '',
    item.submitted_by,
    item.submitted_date,
    item.updated_date,
    item.notes || '',
  ];
};

/**
 * Convert RPDItem to array for Google Sheets (26 columns)
 */
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
    item.may,
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

/**
 * Add new budget item to Google Sheets
 */
const addBudgetItem = async (sheetId: string, item: Omit<BudgetItem, 'id'>): Promise<BudgetItem> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const newItem: BudgetItem = {
    ...item,
    id: generateId(),
  };

  const row = budgetItemToRow(newItem);

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'append',
      range: 'budget_items!A:Z',
      values: [row],
    },
  });

  if (result.error) {
    console.error('[addBudgetItem] Error:', result.error);
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to add budget item: ${errorMsg}`);
  }

  console.log('[addBudgetItem] New item added with id:', newItem.id);
  return newItem;
};

/**
 * Update existing budget item
 */
const updateBudgetItem = async (sheetId: string, itemId: string, updates: Partial<BudgetItem>, allItems: BudgetItem[]): Promise<BudgetItem> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const itemIndex = allItems.findIndex(item => item.id === itemId);
  if (itemIndex === -1) throw new Error(`Item dengan ID ${itemId} tidak ditemukan`);

  const updatedItem = { ...allItems[itemIndex], ...updates };
  const row = budgetItemToRow(updatedItem);

  // Google Sheets row index (1-based, +1 for header)
  const sheetRowIndex = itemIndex + 2;

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'update',
      range: `budget_items!A${sheetRowIndex}:AI${sheetRowIndex}`,
      values: [row],
    },
  });

  if (result.error) {
    console.error('[updateBudgetItem] Error:', result.error);
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to update budget item: ${errorMsg}`);
  }

  console.log('[updateBudgetItem] Item updated:', itemId);
  return updatedItem;
};

/**
 * Delete budget item (soft delete by changing status to 'deleted' and zeroing out menjadi values)
 */
const deleteBudgetItem = async (sheetId: string, itemId: string, allItems: BudgetItem[]): Promise<void> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const itemIndex = allItems.findIndex(item => item.id === itemId);
  if (itemIndex === -1) throw new Error(`Item dengan ID ${itemId} tidak ditemukan`);

  const deletedItem = {
    ...allItems[itemIndex],
    status: 'deleted' as const,
    volume_menjadi: 0,
    satuan_menjadi: '',
    harga_satuan_menjadi: 0,
    jumlah_menjadi: 0,
  };
  const row = budgetItemToRow(deletedItem);

  const sheetRowIndex = itemIndex + 2;

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'update',
      range: `budget_items!A${sheetRowIndex}:AI${sheetRowIndex}`,
      values: [row],
    },
  });

  if (result.error) {
    console.error('[deleteBudgetItem] Error:', result.error);
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to delete budget item: ${errorMsg}`);
  }

  console.log('[deleteBudgetItem] Item deleted:', itemId);
};

/**
 * Approve budget item (PPK approval)
 * Sets status to 'unchanged' and copies 'menjadi' values to 'semula'
 */
const approveBudgetItem = async (
  sheetId: string,
  itemId: string,
  approvedBy: string,
  allItems: BudgetItem[]
): Promise<BudgetItem> => {
  // Find the current item
  const currentItem = allItems.find(item => item.id === itemId);
  if (!currentItem) throw new Error(`Item dengan ID ${itemId} tidak ditemukan`);
  
  // Update semula values to match menjadi values
  const updatedItem = await updateBudgetItem(sheetId, itemId, {
    volume_semula: currentItem.volume_menjadi,
    satuan_semula: currentItem.satuan_menjadi,
    harga_satuan_semula: currentItem.harga_satuan_menjadi,
    jumlah_semula: currentItem.jumlah_menjadi,
    selisih: 0, // After approval, selisih becomes 0 since semula = menjadi
    status: 'unchanged' as const,
    approved_by: approvedBy,
    approved_date: formatDateIndonesia(new Date().toISOString()),
  }, allItems);

  console.log('[approveBudgetItem] Item approved by:', approvedBy);
  return updatedItem;
};

/**
 * Reject budget item (PPK rejection)
 * Reverts 'menjadi' values to 'semula' and sets status to 'unchanged'
 */
const rejectBudgetItem = async (
  sheetId: string,
  itemId: string,
  rejectedBy: string,
  rejectionReason: string,
  allItems: BudgetItem[]
): Promise<BudgetItem> => {
  // Find the current item
  const currentItem = allItems.find(item => item.id === itemId);
  if (!currentItem) throw new Error(`Item dengan ID ${itemId} tidak ditemukan`);
  
  // Revert menjadi values to semula
  const updatedItem = await updateBudgetItem(sheetId, itemId, {
    volume_menjadi: currentItem.volume_semula,
    satuan_menjadi: currentItem.satuan_semula,
    harga_satuan_menjadi: currentItem.harga_satuan_semula,
    jumlah_menjadi: currentItem.jumlah_semula,
    selisih: 0, // After rejection, selisih becomes 0 since menjadi = semula
    status: 'unchanged' as const,
    rejected_date: formatDateIndonesia(new Date().toISOString()),
    notes: rejectionReason || '',
  }, allItems);

  console.log('[rejectBudgetItem] Item rejected by:', rejectedBy, 'Reason:', rejectionReason);
  return updatedItem;
};

/**
 * Update existing RPD item
 */
const updateRPDItem = async (sheetId: string, itemId: string, updates: Partial<RPDItem>, allItems: RPDItem[]): Promise<RPDItem> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const itemIndex = allItems.findIndex(item => item.id === itemId);
  if (itemIndex === -1) throw new Error(`RPD item dengan ID ${itemId} tidak ditemukan`);

  const updatedItem = { ...allItems[itemIndex], ...updates };
  const row = rpdItemToRow(updatedItem);

  // Google Sheets row index (1-based, +1 for header)
  const sheetRowIndex = itemIndex + 2;

  const result = await supabase.functions.invoke('google-sheets', {
    body: {
      spreadsheetId: sheetId,
      operation: 'update',
      range: `rpd_items!A${sheetRowIndex}:Z${sheetRowIndex}`,
      values: [row],
    },
  });

  if (result.error) {
    console.error('[updateRPDItem] Error:', result.error);
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
    throw new Error(`Failed to update RPD item: ${errorMsg}`);
  }

  console.log('[updateRPDItem] Item updated:', itemId);
  return updatedItem;
};

/**
 * Hook untuk budget item mutations
 */
export const useBahanRevisiSubmit = ({ sheetId }: UseBahanRevisiSubmitProps) => {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (newItem: Omit<BudgetItem, 'id'>) => addBudgetItem(sheetId!, newItem),
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['bahanrevisi-budget-items', sheetId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, updates, allItems }: { itemId: string; updates: Partial<BudgetItem>; allItems: BudgetItem[] }) =>
      updateBudgetItem(sheetId!, itemId, updates, allItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bahanrevisi-budget-items', sheetId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ itemId, allItems }: { itemId: string; allItems: BudgetItem[] }) =>
      deleteBudgetItem(sheetId!, itemId, allItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bahanrevisi-budget-items', sheetId] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ itemId, approvedBy, allItems }: { itemId: string; approvedBy: string; allItems: BudgetItem[] }) =>
      approveBudgetItem(sheetId!, itemId, approvedBy, allItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bahanrevisi-budget-items', sheetId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ itemId, rejectedBy, rejectionReason, allItems }: { itemId: string; rejectedBy: string; rejectionReason: string; allItems: BudgetItem[] }) =>
      rejectBudgetItem(sheetId!, itemId, rejectedBy, rejectionReason, allItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bahanrevisi-budget-items', sheetId] });
    },
  });

  const updateRPDMutation = useMutation({
    mutationFn: ({ itemId, updates, allItems }: { itemId: string; updates: Partial<RPDItem>; allItems: RPDItem[] }) =>
      updateRPDItem(sheetId!, itemId, updates, allItems),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bahanrevisi-rpd-items', sheetId] });
    },
  });

  return {
    addItem: addMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    approveItem: approveMutation.mutate,
    rejectItem: rejectMutation.mutate,
    updateRPDItem: updateRPDMutation.mutate,
    isLoading:
      addMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      approveMutation.isPending ||
      rejectMutation.isPending ||
      updateRPDMutation.isPending,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isUpdatingRPD: updateRPDMutation.isPending,
  };
};
