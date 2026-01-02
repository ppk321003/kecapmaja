import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Submission, Document, SubmissionStatus } from '@/types/pencairan';

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

// Fungsi untuk parse documents string ke array Document
function parseDocuments(documentsStr: string): Document[] {
  if (!documentsStr) return [];
  
  const docNames = documentsStr.split('|').filter(name => name.trim() !== '');
  return docNames.map(name => ({
    type: name.toLowerCase().replace(/\s+/g, '_'),
    name: name.trim(),
    isRequired: true,
    isChecked: true,
  }));
}

// Fungsi untuk mapping raw data ke Submission object
function mapRawToSubmission(raw: PencairanRawData): Submission {
  // Parse jenisBelanja untuk mendapatkan jenis dan sub-jenis
  const jenisParts = raw.jenisBelanja.split(' - ');
  
  // Konversi status string ke SubmissionStatus
  const statusMap: Record<string, SubmissionStatus> = {
    'pending_ppk': 'pending_ppk',
    'draft': 'draft',
    'pending_bendahara': 'pending_bendahara',
    'incomplete_sm': 'incomplete_sm',
    'incomplete_ppk': 'incomplete_ppk',
    'incomplete_bendahara': 'incomplete_bendahara',
    'sent_kppn': 'sent_kppn',
  };
  
  const status: SubmissionStatus = statusMap[raw.status] || 'pending_ppk';
  
  // Parse tanggal dengan format "HH:mm - dd/MM/yyyy"
  function parseCustomDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    try {
      // Format: "HH:mm - dd/MM/yyyy"
      const [timePart, datePart] = dateStr.split(' - ');
      if (!timePart || !datePart) return new Date();
      
      const [hours, minutes] = timePart.split(':').map(Number);
      const [day, month, year] = datePart.split('/').map(Number);
      
      // Year mungkin 2 digit, convert ke 4 digit
      const fullYear = year < 100 ? 2000 + year : year;
      
      return new Date(fullYear, month - 1, day, hours, minutes);
    } catch (error) {
      console.warn('Failed to parse date:', dateStr, error);
      return new Date();
    }
  }

  return {
    id: raw.id,
    title: raw.title,
    submitterName: raw.submitterName,
    jenisBelanja: jenisParts[0] || raw.jenisBelanja,
    subJenisBelanja: jenisParts[1] || '',
    status,
    submittedAt: parseCustomDate(raw.waktuPengajuan),
    updatedAt: raw.updatedAt || undefined,
    documents: parseDocuments(raw.documents),
    notes: raw.notes,
    waktuPengajuan: raw.waktuPengajuan,
    waktuPpk: raw.waktuPpk,
    waktuBendahara: raw.waktuBendahara,
    statusPpk: raw.statusPpk,
    statusBendahara: raw.statusBendahara,
    statusKppn: raw.statusKppn,
  };
}

export function usePencairanData() {
  return useQuery({
    queryKey: ['pencairan-data'],
    queryFn: async (): Promise<Submission[]> => {
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

      // Skip header row dan map ke Submission[]
      const submissions: Submission[] = rows.slice(1).map((row: string[]) => {
        const rawData: PencairanRawData = {
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
        };
        
        return mapRawToSubmission(rawData);
      });

      return submissions;
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
          range: `${MASTER_SHEET_NAME}!A:G`, // Baca sampai kolom G
        },
      });

      if (error) {
        console.error('Error fetching organik data:', error);
        throw error;
      }

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      // Skip header row, Column D is Nama (index 3)
      return rows.slice(1)
        .map((row: string[]) => ({
          nip: row[0] || '',
          nama: row[3] || '', // Column D - Nama
          jabatan: row[4] || '', // Column E - Jabatan
          pangkat: row[5] || '', // Column F - Pangkat
          golongan: row[6] || '', // Column G - Golongan
        }))
        .filter((item: OrganikData) => item.nama.trim() !== '');
    },
  });
}