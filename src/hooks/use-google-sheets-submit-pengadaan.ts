import { useSubmitToSheets } from './use-google-sheets-submit';

const PENGADAAN_SPREADSHEET_ID = "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";

export const useSubmitToPengadaanSheets = (options?: { onSuccess?: () => void }) => {
  return useSubmitToSheets({
    spreadsheetId: PENGADAAN_SPREADSHEET_ID,
    sheetName: "DokumenPengadaan",
    onSuccess: options?.onSuccess
  });
};
