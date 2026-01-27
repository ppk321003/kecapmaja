import { useSubmitToSheets } from './use-google-sheets-submit';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';

const DEFAULT_PENGADAAN_SPREADSHEET_ID = "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";

export const useSubmitToPengadaanSheets = (options?: { onSuccess?: () => void }) => {
  const satkerContext = useSatkerConfigContext();
  
  // Get satker-specific sheet ID from context, fallback to default if not available
  const spreadsheetId = satkerContext?.getUserSatkerSheetId('pengadaan') || DEFAULT_PENGADAAN_SPREADSHEET_ID;
  
  return useSubmitToSheets({
    spreadsheetId: spreadsheetId,
    sheetName: "DokumenPengadaan",
    onSuccess: options?.onSuccess
  });
};
