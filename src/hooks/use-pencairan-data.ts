import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const SPREADSHEET_ID = '1hnNCHxmQQ5rjVcxIBvJk5lEdZ8aki4YUMBi1s33cnGI';
const SHEET_NAME = 'data';

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
    queryKey: ['organik-pencairan'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: '1SvzXG0-CbMdEZXBpPMGq5pJOMEk3xnPP3XQQrmBCmUk',
          operation: 'read',
          range: 'dt_organik!A:E',
        },
      });

      if (error) throw error;

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      return rows.slice(1).map((row: string[]) => ({
        nip: row[0] || '',
        nama: row[1] || '',
        jabatan: row[2] || '',
        pangkat: row[3] || '',
        golongan: row[4] || '',
      }));
    },
  });
}
