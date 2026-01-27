import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const MASTER_CONFIG_SPREADSHEET_ID = "1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ";
const CONFIG_SHEET_NAME = 'satker_config';

export interface SatkerConfig {
  satker_id: string;
  satker_nama: string;
  pencairan_sheet_id: string;
  pengadaan_sheet_id: string;
  entrikegiatan_sheet_id: string;
  tagging_sheet_id: string;
}

/**
 * Hook untuk membaca Master Config Sheet dan mendapatkan sheet IDs per satker
 */
export function useSatkerConfig() {
  return useQuery({
    queryKey: ['satker-config'],
    queryFn: async (): Promise<SatkerConfig[]> => {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: MASTER_CONFIG_SPREADSHEET_ID,
          operation: 'read',
          range: `${CONFIG_SHEET_NAME}!A:F`, // 6 kolom
        },
      });

      if (error) {
        console.error('Error fetching satker config:', error);
        throw error;
      }

      const rows = data?.values || [];
      if (rows.length <= 1) {
        console.warn('No satker config data found');
        return [];
      }

      // Skip header row (index 0) dan map ke SatkerConfig[]
      const configs: SatkerConfig[] = rows.slice(1).map((row: string[]) => ({
        satker_id: row[0]?.trim() || '',
        satker_nama: row[1]?.trim() || '',
        pencairan_sheet_id: row[2]?.trim() || '',
        pengadaan_sheet_id: row[3]?.trim() || '',
        entrikegiatan_sheet_id: row[4]?.trim() || '',
        tagging_sheet_id: row[5]?.trim() || '',
      }));

      console.log('Loaded satker configs:', configs);
      return configs;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 2, // Keep in memory for 2 hours
  });
}

/**
 * Helper function untuk mendapatkan specific sheet ID berdasarkan satker_id dan module type
 */
export function getSheetIdBySatkerAndModule(
  configs: SatkerConfig[] | undefined,
  satker_id: string,
  module: 'pencairan' | 'pengadaan' | 'entrikegiatan' | 'tagging'
): string | null {
  if (!configs) return null;

  const config = configs.find(c => c.satker_id === satker_id);
  if (!config) {
    console.warn(`Config not found for satker: ${satker_id}`);
    return null;
  }

  const moduleKeyMap = {
    pencairan: 'pencairan_sheet_id',
    pengadaan: 'pengadaan_sheet_id',
    entrikegiatan: 'entrikegiatan_sheet_id',
    tagging: 'tagging_sheet_id',
  };

  const sheetId = config[moduleKeyMap[module]];
  if (!sheetId) {
    console.warn(`Sheet ID not found for satker ${satker_id}, module ${module}`);
    return null;
  }

  return sheetId;
}
