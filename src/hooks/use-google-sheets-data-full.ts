import { useGoogleSheetsData } from './use-google-sheets-data';

const DATABASE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

export const usePrograms = () => {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: DATABASE_SPREADSHEET_ID,
    sheetName: "program"
  });

  const programs = data.map((item: any) => ({
    id: item.id || item.kode,
    name: `${item.kode} - ${item.program}`,
    kode: item.kode,
    program: item.program
  }));

  return { data: programs, loading, error };
};

export const useKegiatan = (programId: string | null) => {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: DATABASE_SPREADSHEET_ID,
    sheetName: "kegiatan"
  });

  const filteredData = programId 
    ? data.filter((item: any) => item.program_id === programId)
    : data;

  const kegiatan = filteredData.map((item: any) => ({
    id: item.id || item.kode,
    name: `${item.kode} - ${item.kegiatan}`,
    kode: item.kode,
    kegiatan: item.kegiatan,
    program_id: item.program_id
  }));

  return { data: kegiatan, loading, error };
};

export const useKRO = (kegiatanId: string | null) => {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: DATABASE_SPREADSHEET_ID,
    sheetName: "kro"
  });

  const filteredData = kegiatanId 
    ? data.filter((item: any) => item.kegiatan_id === kegiatanId)
    : data;

  const kro = filteredData.map((item: any) => ({
    id: item.id || item.kode,
    name: `${item.kode} - ${item.kro}`,
    kode: item.kode,
    kro: item.kro,
    kegiatan_id: item.kegiatan_id
  }));

  return { data: kro, loading, error };
};

export const useRO = (kroId: string | null) => {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: DATABASE_SPREADSHEET_ID,
    sheetName: "ro"
  });

  const filteredData = kroId 
    ? data.filter((item: any) => item.kro_id === kroId)
    : data;

  const ro = filteredData.map((item: any) => ({
    id: item.id || item.kode,
    name: `${item.kode} - ${item.ro}`,
    kode: item.kode,
    ro: item.ro,
    kro_id: item.kro_id
  }));

  return { data: ro, loading, error };
};

export const useKomponen = () => {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: DATABASE_SPREADSHEET_ID,
    sheetName: "komponen"
  });

  const komponen = data.map((item: any) => ({
    id: item.id || item.kode,
    name: `${item.kode} - ${item.komponen}`,
    kode: item.kode,
    komponen: item.komponen
  }));

  return { data: komponen, loading, error };
};

export const useAkun = () => {
  const { data, loading, error } = useGoogleSheetsData({
    spreadsheetId: DATABASE_SPREADSHEET_ID,
    sheetName: "akun"
  });

  const akun = data.map((item: any) => ({
    id: item.id || item.kode,
    name: `${item.kode} - ${item.akun}`,
    kode: item.kode,
    akun: item.akun
  }));

  return { data: akun, loading, error };
};

export const useJenis = () => {
  // Static jenis data
  const jenis = [
    { id: "Pelatihan", name: "Pelatihan" },
    { id: "Briefing", name: "Briefing" },
    { id: "Rapat Persiapan", name: "Rapat Persiapan" },
    { id: "Rapat Evaluasi", name: "Rapat Evaluasi" }
  ];

  return { data: jenis, loading: false, error: null };
};
