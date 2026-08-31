export * from './use-google-sheets-data-full';
import { useGoogleSheetsData } from './use-google-sheets-data';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useMemo } from 'react';

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
  noHp: string;
}

const getFirstTruthyCell = (row: Record<string, any>, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

const getMasterPhone = (row: Record<string, any>): string => getFirstTruthyCell(row, [
  'no. hp',
  'no hp',
  'nohp',
  'no.hp',
  'no_hp',
  'no._hp',
  'no__hp',
  'nomor hp',
  'nomor_hp',
  'telepon',
  'telp',
  'phone',
  'whatsapp',
]);

export const useOrganikBPS = () => {
  const satkerContext = useSatkerConfigContext();
  
  // Get satker-specific master organik sheet ID - memoized to prevent infinite loops
  const masterSpreadsheetId = useMemo(() => {
    const sheetId = satkerContext?.getUserSatkerSheetId('masterorganik');
    return sheetId || DEFAULT_MASTER_SPREADSHEET_ID;
  }, [satkerContext?.configs, satkerContext?.getUserSatkerSheetId]);
  
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
    golongan: row['gol.akhir'] || row['gol_akhir'] || '',
    pangkat: row.pangkat || '',
    noHp: getMasterPhone(row),
    rekening: row.rekening || '',
    bank: row.bank || ''
  }));

  return { data, loading, error };
};

export const useMitraStatistik = () => {
  const satkerContext = useSatkerConfigContext();
  
  // Get satker-specific master organik sheet ID - memoized to prevent infinite loops
  const masterSpreadsheetId = useMemo(() => {
    const sheetId = satkerContext?.getUserSatkerSheetId('masterorganik');
    return sheetId || DEFAULT_MASTER_SPREADSHEET_ID;
  }, [satkerContext?.configs, satkerContext?.getUserSatkerSheetId]);
  
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
    kecamatan: row.kecamatan || '',
    noHp: getMasterPhone(row)
  }));

  return { data, loading, error };
};

export const useSaveDocument = () => {
  return async (documentData: any) => {
    console.log("Saving document:", documentData);
    return { success: true };
  };
};
