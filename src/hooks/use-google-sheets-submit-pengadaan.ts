import { useSubmitToSheets } from './use-google-sheets-submit';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';

const DEFAULT_PENGADAAN_SPREADSHEET_ID = "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc";

export const useSubmitToPengadaanSheets = (options?: { onSuccess?: () => void }) => {
  const satkerContext = useSatkerConfigContext();
  
  // Get satker-specific sheet ID from context
  const spreadsheetId = satkerContext?.getUserSatkerSheetId('pengadaan');
  
  console.log('[useSubmitToPengadaanSheets] spreadsheetId:', spreadsheetId, 'satkerContext:', satkerContext);
  
  return useSubmitToSheets({
    spreadsheetId: spreadsheetId || DEFAULT_PENGADAAN_SPREADSHEET_ID,
    sheetName: "DokumenPengadaan",
    onSuccess: options?.onSuccess
  });
};
