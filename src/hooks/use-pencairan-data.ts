import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SPREADSHEET_ID = '1hnNCHxmQQ5rjVcxIBvJk5lEdZ8aki4YUMBi1s33cnGI';
const SHEET_NAME = 'data';

// Master Organik Spreadsheet
const MASTER_SPREADSHEET_ID = '1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM';
const MASTER_SHEET_NAME = 'MASTER.ORGANIK';

export interface PencairanRawData {
  id: string;
  title: string;
  submitterName: string;
  jenisBelanja: string;
  documents: string;
  notes: string;
  status: string;
  waktuPengajuan: string;
  waktuPpk: string;
  waktuBendahara: string;
  statusPpk: string;
  statusBendahara: string;
  statusKppn: string;
  updatedAt: string;
}

export interface OrganikData {
  nip: string;
  nama: string;
  jabatan: string;
  pangkat: string;
  golongan: string;
}

export function usePencairanData() {
  return useQuery({
    queryKey: ['pencairan-data'],
    queryFn: async (): Promise<PencairanRawData[]> => {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: 'read',
          range: `${SHEET_NAME}!A:N`,
        },
      });

      if (error) {
        console.error('Error fetching pencairan data:', error);
        throw error;
      }

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      // Skip header row
      return rows.slice(1).map((row: string[]) => ({
        id: row[0] || '',
        title: row[1] || '',
        submitterName: row[2] || '',
        jenisBelanja: row[3] || '',
        documents: row[4] || '',
        notes: row[5] || '',
        status: row[6] || 'pending_ppk',
        waktuPengajuan: row[7] || '',
        waktuPpk: row[8] || '',
        waktuBendahara: row[9] || '',
        statusPpk: row[10] || '',
        statusBendahara: row[11] || '',
        statusKppn: row[12] || '',
        updatedAt: row[13] || '',
      }));
    },
    refetchInterval: 30000,
  });
}

export function useOrganikPencairan() {
  return useQuery({
    queryKey: ['organik-pencairan-master'],
    queryFn: async (): Promise<OrganikData[]> => {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: MASTER_SPREADSHEET_ID,
          operation: 'read',
          range: `${MASTER_SHEET_NAME}!A:E`,
        },
      });

      if (error) {
        console.error('Error fetching organik data:', error);
        throw error;
      }

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      // Skip header row, Column D is Nama (index 3)
      return rows.slice(1).map((row: string[]) => ({
        nip: row[0] || '',
        nama: row[3] || '', // Column D - Nama
        jabatan: row[4] || '', // Column E - Jabatan
        pangkat: row[5] || '',
        golongan: row[6] || '',
      })).filter((item: OrganikData) => item.nama.trim() !== '');
    },
  });
}
