export * from './use-google-sheets-data-full';
import { useGoogleSheetsData } from './use-google-sheets-data';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';

const DEFAULT_MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

interface OrganikBPS {
  id: string;
  name: string;
  nip: string;
  jabatan: string;
  kecamatan: string;
  golongan: string;
  pangkat: string;
  noHp: string;
  rekening: string;
  bank: string;
}

interface MitraStatistik {
  id: string;
  name: string;
  nik: string;
  pekerjaan: string;
  alamat: string;
  bank: string;
  rekening: string;
  kecamatan: string;
}

export const useOrganikBPS = () => {
  const satkerContext = useSatkerConfigContext();
  
  // Defensive logging
  if (!satkerContext) {
    console.warn('[useOrganikBPS] satkerContext is NULL - context not provided!');
  } else if (satkerContext.isLoading) {
    console.log('[useOrganikBPS] satkerContext is LOADING...');
  } else {
    console.log('[useOrganikBPS] satkerContext available:', {
      configs_count: satkerContext.configs?.length,
      is_error: !!satkerContext.error
    });
  }
  
  // Get satker-specific master organik sheet ID
  const masterSpreadsheetId = satkerContext?.getUserSatkerSheetId('masterorganik') || DEFAULT_MASTER_SPREADSHEET_ID;
  console.log('[useOrganikBPS] Final masterSpreadsheetId:', {
    is_default: masterSpreadsheetId === DEFAULT_MASTER_SPREADSHEET_ID,
    id_prefix: masterSpreadsheetId.substring(0, 20) + '...'
  });
  
  const { data: rawData, loading, error } = useGoogleSheetsData({
    spreadsheetId: masterSpreadsheetId,
    sheetName: "MASTER.ORGANIK"
  });

  const data: OrganikBPS[] = rawData.map((row: any, index: number) => ({
    id: row.nip || `organik-${index}`,
    name: row.nama || '',
    nip: row.nip || '',
    jabatan: row.jabatan || '',
    kecamatan: row.kecamatan || '',
    golongan: row['gol.akhir'] || '',
    pangkat: row.pangkat || '',
    noHp: row['no. hp'] || '',
    rekening: row.rekening || '',
    bank: row.bank || ''
  }));

  return { data, loading, error };
};

export const useMitraStatistik = () => {
  const satkerContext = useSatkerConfigContext();
  
  // Defensive logging
  if (!satkerContext) {
    console.warn('[useMitraStatistik] satkerContext is NULL - context not provided!');
  } else if (satkerContext.isLoading) {
    console.log('[useMitraStatistik] satkerContext is LOADING...');
  } else {
    console.log('[useMitraStatistik] satkerContext available:', {
      configs_count: satkerContext.configs?.length,
      is_error: !!satkerContext.error
    });
  }
  
  // Get satker-specific master organik sheet ID  
  const masterSpreadsheetId = satkerContext?.getUserSatkerSheetId('masterorganik') || DEFAULT_MASTER_SPREADSHEET_ID;
  console.log('[useMitraStatistik] Final masterSpreadsheetId:', {
    is_default: masterSpreadsheetId === DEFAULT_MASTER_SPREADSHEET_ID,
    id_prefix: masterSpreadsheetId.substring(0, 20) + '...'
  });
  
  const { data: rawData, loading, error } = useGoogleSheetsData({
    spreadsheetId: masterSpreadsheetId,
    sheetName: "MASTER.MITRA"
  });

  const data: MitraStatistik[] = rawData.map((row: any, index: number) => ({
    id: row.nik || `mitra-${index}`,
    name: row.nama || '',
    nik: row.nik || '',
    pekerjaan: row.pekerjaan || '',
    alamat: row.alamat || '',
    bank: row.bank || '',
    rekening: row.rekening || '',
    kecamatan: row.kecamatan || ''
  }));

  return { data, loading, error };
};

export const useSaveDocument = () => {
  return async (documentData: any) => {
    console.log("Saving document:", documentData);
    return { success: true };
  };
};
