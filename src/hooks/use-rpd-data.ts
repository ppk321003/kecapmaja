/**
 * Custom hook untuk mengelola RPD (Rencana Penarikan Dana) data
 * Adapted from reference implementation untuk Google Sheets storage
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RPDItem } from '@/types/bahanrevisi';
import { roundToThousands } from '@/utils/bahanrevisi-calculations';

export type RPDMonthValues = {
  januar: number;
  februar: number;
  maret: number;
  april: number;
  mei: number;
  juni: number;
  juli: number;
  agustus: number;
  september: number;
  oktober: number;
  november: number;
  desember: number;
};

interface UseRPDDataProps {
  sheetId: string | null;
  enabled?: boolean;
}

interface RPDDataHook {
  rpdItems: RPDItem[];
  loading: boolean;
  error: string | null;
  updateRPDItem: (itemId: string, monthValues: Partial<RPDMonthValues>) => Promise<boolean>;
  refreshData: () => void;
}

/**
 * Fetch RPD items dari Google Sheets
 */
const fetchRPDItemsFromSheet = async (sheetId: string): Promise<RPDItem[]> => {
  try {
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
    if (rows.length <= 1) {
      console.log('[fetchRPDItemsFromSheet] No RPD items found');
      return [];
    }

    const items: RPDItem[] = rows.slice(1)
      .filter((row: string[]) => row[0]?.trim())
      .map((row: string[]) => {
        // Calculate jumlah_rpd from monthly values
        const januari = parseFloat(row[8]) || 0;
        const februari = parseFloat(row[9]) || 0;
        const maret = parseFloat(row[10]) || 0;
        const april = parseFloat(row[11]) || 0;
        const mei = parseFloat(row[12]) || 0;
        const juni = parseFloat(row[13]) || 0;
        const juli = parseFloat(row[14]) || 0;
        const agustus = parseFloat(row[15]) || 0;
        const september = parseFloat(row[16]) || 0;
        const oktober = parseFloat(row[17]) || 0;
        const november = parseFloat(row[18]) || 0;
        const desember = parseFloat(row[19]) || 0;

        const jumlahRpd = roundToThousands(
          januari + februari + maret + april + mei + juni + 
          juli + agustus + september + oktober + november + desember
        );

        const jumlahMenjadi = parseFloat(row[7]) || 0;
        const blokir = parseFloat(row[25]) || 0;
        const selisih = roundToThousands(jumlahMenjadi - jumlahRpd - blokir);
        
        // Determine status based on allocation
        let status: string;
        if (jumlahRpd === jumlahMenjadi) {
          status = 'ok';
        } else if (jumlahRpd === 0 || (januari === 0 && februari === 0 && maret === 0 && 
                   april === 0 && mei === 0 && juni === 0 && juli === 0 && agustus === 0 && 
                   september === 0 && oktober === 0 && november === 0 && desember === 0)) {
          status = 'belum_isi';
        } else if (januari > 0 && februari > 0 && maret > 0 && april > 0 && mei > 0 && 
                   juni > 0 && juli > 0 && agustus > 0 && september > 0 && oktober > 0 && 
                   november > 0 && desember > 0 && jumlahRpd !== jumlahMenjadi) {
          status = 'sisa';
        } else {
          status = 'belum_lengkap';
        }

        return {
          id: row[0]?.trim() || '',
          program_pembebanan: row[1]?.trim() || '',
          kegiatan: row[2]?.trim() || '',
          komponen_output: row[3]?.trim() || '',
          sub_komponen: row[4]?.trim() || '',
          akun: row[5]?.trim() || '',
          uraian: row[6]?.trim() || '',
          total_pagu: roundToThousands(jumlahMenjadi),
          jan: roundToThousands(januari),
          feb: roundToThousands(februari),
          mar: roundToThousands(maret),
          apr: roundToThousands(april),
          mei: roundToThousands(mei),
          jun: roundToThousands(juni),
          jul: roundToThousands(juli),
          aug: roundToThousands(agustus),
          sep: roundToThousands(september),
          oct: roundToThousands(oktober),
          nov: roundToThousands(november),
          dec: roundToThousands(desember),
          total_rpd: jumlahRpd,
          sisa_anggaran: selisih,
          status,
          blokir,
          modified_by: row[23]?.trim(),
          modified_date: row[24]?.trim(),
        };
      });

    console.log(`[fetchRPDItemsFromSheet] Loaded ${items.length} RPD items`);
    return items;
  } catch (err) {
    console.error('[fetchRPDItemsFromSheet] Error:', err);
    throw err;
  }
};

/**
 * Update RPD item dalam Google Sheets
 */
const updateRPDItemInSheet = async (
  sheetId: string, 
  itemId: string, 
  monthValues: Partial<RPDMonthValues>
): Promise<boolean> => {
  try {
    // Normalize month values to numbers and round to thousands
    const updates: Partial<RPDMonthValues> = {};
    
    Object.entries(monthValues).forEach(([key, value]) => {
      if (typeof value === 'string') {
        updates[key as keyof RPDMonthValues] = roundToThousands(parseFloat(value) || 0);
      } else {
        updates[key as keyof RPDMonthValues] = roundToThousands(value || 0);
      }
    });

    const result = await supabase.functions.invoke('google-sheets', {
      body: {
        spreadsheetId: sheetId,
        operation: 'update',
        range: 'rpd_items',
        itemId,
        data: {
          ...updates,
          modified_date: new Date().toISOString(),
        },
      },
    });

    if (result.error) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
      throw new Error(`Failed to update RPD item: ${errorMsg}`);
    }

    console.log(`[updateRPDItemInSheet] Successfully updated RPD item ${itemId}`);
    return true;
  } catch (err) {
    console.error('[updateRPDItemInSheet] Error:', err);
    throw err;
  }
};

/**
 * Hook untuk mengelola RPD data dan operasi
 */
export const useRPDData = ({ sheetId, enabled = true }: UseRPDDataProps): RPDDataHook => {
  const [rpdItems, setRpdItems] = useState<RPDItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const dataFetchedRef = useRef<boolean>(false);
  const isUpdatingRef = useRef<boolean>(false);

  const fetchRPDData = useCallback(async () => {
    if (!sheetId) {
      setError('Sheet ID tidak ditemukan');
      setLoading(false);
      return;
    }

    try {
      if (isUpdatingRef.current) {
        return;
      }

      if (!dataFetchedRef.current) {
        setLoading(true);
      }

      const data = await fetchRPDItemsFromSheet(sheetId);
      setRpdItems(data);
      setError(null);
      dataFetchedRef.current = true;
    } catch (err) {
      console.error('[useRPDData] Error fetching RPD data:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data RPD');
      setRpdItems([]);
    } finally {
      setLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    if (enabled && sheetId) {
      fetchRPDData();
    }
  }, [fetchRPDData, enabled, sheetId]);

  const updateRPDItem = async (itemId: string, monthValues: Partial<RPDMonthValues>): Promise<boolean> => {
    if (!sheetId) {
      console.error('[updateRPDItem] No sheet ID provided');
      return false;
    }

    try {
      isUpdatingRef.current = true;

      await updateRPDItemInSheet(sheetId, itemId, monthValues);

      // Update local state
      setRpdItems(prevItems =>
        prevItems.map(item => {
          if (item.id === itemId) {
            const updatedItem = { ...item };
            
            // Update month values
            Object.entries(monthValues).forEach(([key, value]) => {
              const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0;
              const roundedValue = roundToThousands(numValue);
              
              switch (key) {
                case 'januar': updatedItem.jan = roundedValue; break;
                case 'februar': updatedItem.feb = roundedValue; break;
                case 'maret': updatedItem.mar = roundedValue; break;
                case 'april': updatedItem.apr = roundedValue; break;
                case 'mei': updatedItem.mei = roundedValue; break;
                case 'juni': updatedItem.jun = roundedValue; break;
                case 'juli': updatedItem.jul = roundedValue; break;
                case 'agustus': updatedItem.aug = roundedValue; break;
                case 'september': updatedItem.sep = roundedValue; break;
                case 'oktober': updatedItem.oct = roundedValue; break;
                case 'november': updatedItem.nov = roundedValue; break;
                case 'desember': updatedItem.dec = roundedValue; break;
              }
            });

            // Recalculate totals
            const totalRpd = roundToThousands(
              updatedItem.jan + updatedItem.feb + updatedItem.mar + updatedItem.apr +
              updatedItem.mei + updatedItem.jun + updatedItem.jul + updatedItem.aug +
              updatedItem.sep + updatedItem.oct + updatedItem.nov + updatedItem.dec
            );

            updatedItem.total_rpd = totalRpd;
            updatedItem.sisa_anggaran = roundToThousands(updatedItem.total_pagu - totalRpd - (updatedItem.blokir || 0));

            // Update status
            if (totalRpd === updatedItem.total_pagu) {
              updatedItem.status = 'ok';
            } else if (totalRpd === 0) {
              updatedItem.status = 'belum_isi';
            } else if (
              updatedItem.jan > 0 && updatedItem.feb > 0 && updatedItem.mar > 0 &&
              updatedItem.apr > 0 && updatedItem.mei > 0 && updatedItem.jun > 0 &&
              updatedItem.jul > 0 && updatedItem.aug > 0 && updatedItem.sep > 0 &&
              updatedItem.oct > 0 && updatedItem.nov > 0 && updatedItem.dec > 0 &&
              totalRpd !== updatedItem.total_pagu
            ) {
              updatedItem.status = 'sisa';
            } else {
              updatedItem.status = 'belum_lengkap';
            }

            updatedItem.modified_date = new Date().toISOString();
            return updatedItem;
          }
          return item;
        })
      );

      return true;
    } catch (err) {
      console.error('[updateRPDItem] Error:', err);
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data RPD');
      return false;
    } finally {
      isUpdatingRef.current = false;
    }
  };

  const refreshData = () => {
    dataFetchedRef.current = false;
    fetchRPDData();
  };

  return {
    rpdItems,
    loading,
    error,
    updateRPDItem,
    refreshData,
  };
};
