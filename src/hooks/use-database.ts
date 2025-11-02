export * from './use-google-sheets-data-full';
import { useGoogleSheetsData } from './use-google-sheets-data';

const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

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
  const { data: rawData, loading, error } = useGoogleSheetsData({
    spreadsheetId: MASTER_SPREADSHEET_ID,
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
  const { data: rawData, loading, error } = useGoogleSheetsData({
    spreadsheetId: MASTER_SPREADSHEET_ID,
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
