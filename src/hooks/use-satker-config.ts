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
  masterorganik_sheet_id: string;
  perjalanan_sheet_id?: string;
  daftarhadir_sheet_id?: string;
  dokpengadaan_sheet_id?: string;
  kak_sheet_id?: string;
  kuiperjadin_sheet_id?: string;
  kuitranport_sheet_id?: string;
  lembur_sheet_id?: string;
  spjhonor_sheet_id?: string;
  sk_sheet_id?: string;
  super_sheet_id?: string;
  tandaterima_sheet_id?: string;
  spjtranslok_sheet_id?: string;
  uh_sheet_id?: string;
  linkers_sheet_id?: string;
  kecaptobendahara_sheet_id?: string;
}

/**
 * Hook untuk membaca Master Config Sheet dan mendapatkan sheet IDs per satker
 */
export function useSatkerConfig() {
  return useQuery({
    queryKey: ['satker-config'],
    queryFn: async (): Promise<SatkerConfig[]> => {
      // Coba dua format sheet name: 'satker_config' dan 'Sheet1' (default Google Sheets)
      const sheetNames = [CONFIG_SHEET_NAME, 'Sheet1'];
      let data, error;
      
      for (const sheetName of sheetNames) {
        const result = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: MASTER_CONFIG_SPREADSHEET_ID,
            operation: 'read',
            range: `${sheetName}!A:V`, // 22 kolom (semua sheet IDs termasuk kecaptobendahara)
          },
        });
        
        if (!result.error && result.data?.values && result.data.values.length > 1) {
          data = result.data;
          error = null;
          console.log(`[useSatkerConfig] Successfully read from sheet: ${sheetName}`);
          break;
        } else {
          console.log(`[useSatkerConfig] Failed to read from ${sheetName}, trying next...`);
          error = result.error;
        }
      }

      if (error && !data) {
        console.error('Error fetching satker config from all sheets:', error);
        throw error;
      }

      const rows = data?.values || [];
      if (rows.length <= 1) {
        console.warn('No satker config data found');
        return [];
      }

      // Skip header row (index 0) dan map ke SatkerConfig[]
      const configs: SatkerConfig[] = rows.slice(1)
        .filter((row: string[]) => row[0]?.trim()) // Filter empty rows
        .map((row: string[]) => ({
          satker_id: row[0]?.trim() || '',
          satker_nama: row[1]?.trim() || '',
          pencairan_sheet_id: row[2]?.trim() || '',
          pengadaan_sheet_id: row[3]?.trim() || '',
          entrikegiatan_sheet_id: row[4]?.trim() || '',
          tagging_sheet_id: row[5]?.trim() || '',
          masterorganik_sheet_id: row[6]?.trim() || '',
          perjalanan_sheet_id: row[7]?.trim() || '',
          daftarhadir_sheet_id: row[8]?.trim() || '',
          dokpengadaan_sheet_id: row[9]?.trim() || '',
          kak_sheet_id: row[10]?.trim() || '',
          kuiperjadin_sheet_id: row[11]?.trim() || '',
          kuitranport_sheet_id: row[12]?.trim() || '',
          lembur_sheet_id: row[13]?.trim() || '',
          spjhonor_sheet_id: row[14]?.trim() || '',
          sk_sheet_id: row[15]?.trim() || '',
          super_sheet_id: row[16]?.trim() || '',
          tandaterima_sheet_id: row[17]?.trim() || '',
          spjtranslok_sheet_id: row[18]?.trim() || '',
          uh_sheet_id: row[19]?.trim() || '',
          linkers_sheet_id: row[20]?.trim() || '',
          kecaptobendahara_sheet_id: row[21]?.trim() || '',
        }));

      console.log('[useSatkerConfig] Loaded satker configs:', configs.map(c => ({
        satker_id: c.satker_id,
        satker_nama: c.satker_nama,
        pencairan_sheet_id: c.pencairan_sheet_id?.substring(0, 15) + '...',
        masterorganik_sheet_id: c.masterorganik_sheet_id?.substring(0, 15) + '...'
      })));
      console.log('[useSatkerConfig] Available satker IDs:', configs.map(c => c.satker_id).join(', '));
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
  module: 'pencairan' | 'pengadaan' | 'entrikegiatan' | 'tagging' | 'masterorganik' | 'perjalanan' | 'daftarhadir' | 'dokpengadaan' | 'kak' | 'kuiperjadin' | 'kuitranport' | 'lembur' | 'spjhonor' | 'sk' | 'super' | 'tandaterima' | 'spjtranslok' | 'uh' | 'linkers' | 'kecaptobendahara'
): string | null {
  if (!configs) {
    console.warn(`[getSheetIdBySatkerAndModule] Configs is undefined, cannot find satker ${satker_id}`);
    return null;
  }

  const config = configs.find(c => c.satker_id === satker_id);
  if (!config) {
    console.warn(`[getSheetIdBySatkerAndModule] Config not found for satker: ${satker_id}. Available satkers: ${configs.map(c => c.satker_id).join(', ')}`);
    return null;
  }

  const moduleKeyMap: Record<string, keyof SatkerConfig> = {
    pencairan: 'pencairan_sheet_id',
    pengadaan: 'pengadaan_sheet_id',
    entrikegiatan: 'entrikegiatan_sheet_id',
    tagging: 'tagging_sheet_id',
    masterorganik: 'masterorganik_sheet_id',
    perjalanan: 'perjalanan_sheet_id',
    daftarhadir: 'daftarhadir_sheet_id',
    dokpengadaan: 'dokpengadaan_sheet_id',
    kak: 'kak_sheet_id',
    kuiperjadin: 'kuiperjadin_sheet_id',
    kuitranport: 'kuitranport_sheet_id',
    lembur: 'lembur_sheet_id',
    spjhonor: 'spjhonor_sheet_id',
    sk: 'sk_sheet_id',
    super: 'super_sheet_id',
    tandaterima: 'tandaterima_sheet_id',
    spjtranslok: 'spjtranslok_sheet_id',
    uh: 'uh_sheet_id',
    linkers: 'linkers_sheet_id',
    kecaptobendahara: 'kecaptobendahara_sheet_id',
  };

  const sheetId = config[moduleKeyMap[module]];
  if (!sheetId) {
    console.warn(`[getSheetIdBySatkerAndModule] Sheet ID not found for satker ${satker_id}, module ${module}`);
    return null;
  }

  return sheetId;
}
