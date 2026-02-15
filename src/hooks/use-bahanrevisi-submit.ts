/**
 * Custom hook untuk submit/update data Bahan Revisi Anggaran ke Google Sheets
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BudgetItem, RPDItem } from '@/types/bahanrevisi';
import { generateId } from '@/utils/bahanrevisi-calculations';

interface UseBahanRevisiSubmitProps {
  sheetId: string | null;
}

/**
 * Convert BudgetItem to array for Google Sheets
 */
const budgetItemToRow = (item: BudgetItem): (string | number | boolean | null)[] => {
  return [
    item.id,
    item.program_pembebanan,
    item.program_code,
    item.kegiatan,
    item.kegiatan_code,
    item.rincian_output,
    item.rincian_output_code,
    item.komponen_output,
    item.komponen_output_code,
    item.sub_komponen,
    item.sub_komponen_code,
    item.akun,
    item.akun_code,
    item.account_group,
    item.account_group_name,
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
    item.status,
    item.approved_by || '',
    item.approved_date || '',
    item.rejected_by || '',
    item.rejected_date || '',
    item.rejection_reason || '',
    item.submitted_by,
    item.submitted_date,
    item.updated_date,
    item.notes || '',
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
      range: 'budget_items!A:AI',
      values: [row],
    },
  });

  if (result.error) {
    console.error('[addBudgetItem] Error:', result.error);
    throw result.error;
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
    throw result.error;
  }

  console.log('[updateBudgetItem] Item updated:', itemId);
  return updatedItem;
};

/**
 * Delete budget item (soft delete by changing status to 'deleted')
 */
const deleteBudgetItem = async (sheetId: string, itemId: string, allItems: BudgetItem[]): Promise<void> => {
  if (!sheetId) throw new Error('Sheet ID tidak ditemukan');

  const itemIndex = allItems.findIndex(item => item.id === itemId);
  if (itemIndex === -1) throw new Error(`Item dengan ID ${itemId} tidak ditemukan`);

  const deletedItem = { ...allItems[itemIndex], status: 'deleted' as const };
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
    throw result.error;
  }

  console.log('[deleteBudgetItem] Item deleted:', itemId);
};

/**
 * Approve budget item (PPK approval)
 */
const approveBudgetItem = async (
  sheetId: string,
  itemId: string,
  approvedBy: string,
  allItems: BudgetItem[]
): Promise<BudgetItem> => {
  const updatedItem = await updateBudgetItem(sheetId, itemId, {
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
  }, allItems);

  console.log('[approveBudgetItem] Item approved by:', approvedBy);
  return updatedItem;
};

/**
 * Reject budget item (PPK rejection)
 */
const rejectBudgetItem = async (
  sheetId: string,
  itemId: string,
  rejectedBy: string,
  rejectionReason: string,
  allItems: BudgetItem[]
): Promise<BudgetItem> => {
  const updatedItem = await updateBudgetItem(sheetId, itemId, {
    rejected_by: rejectedBy,
    rejected_date: new Date().toISOString(),
    rejection_reason: rejectionReason,
  }, allItems);

  console.log('[rejectBudgetItem] Item rejected by:', rejectedBy);
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

  return {
    addItem: addMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    approveItem: approveMutation.mutate,
    rejectItem: rejectMutation.mutate,
    isLoading:
      addMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      approveMutation.isPending ||
      rejectMutation.isPending,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
};
