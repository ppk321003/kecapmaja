import { useQuery } from '@tanstack/react-query';

interface UseGoogleSheetsDataProps {
  spreadsheetId: string;
  sheetName: string;
  sheetAliases?: string[];
  range?: string;
  mode?: "rows" | "single-cell";
  refreshKey?: any;
  /** When false, the fetch is deferred (useful for lazy tab loading) */
  enabled?: boolean;
}

const fetchPublicGoogleSheetRows = async (spreadsheetId: string, sheetName: string, range?: string): Promise<any[]> => {
  const cleanSheetName = String(sheetName || '').trim();
  if (!cleanSheetName) {
    return [];
  }

  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(cleanSheetName)}${range ? `&range=${encodeURIComponent(range)}` : ''}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Public Google Sheet request failed: ${response.status}`);
  }

  const text = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?\s*$/s);

  if (!match) {
    throw new Error('Tidak dapat mem-parsing public Google Sheet response');
  }

  const parsed = JSON.parse(match[1]);
  const columns = parsed?.table?.cols ?? [];
  const rows = parsed?.table?.rows ?? [];

  return rows.map((row: any, rowIndex: number) => {
    const obj: Record<string, any> = {};
    const rawValues = (row?.c ?? []).map((cell: any) => {
      if (cell && typeof cell === 'object') {
        return cell.f ?? cell.v ?? '';
      }
      return cell ?? '';
    });

    rawValues.forEach((value: any, index: number) => {
      const key = String(columns[index]?.label ?? `__col_${index}`)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_') || `__col_${index}`;
      obj[key] = value;
    });

    obj.__rowNumber = rowIndex + 1;
    obj.__rawRow = rawValues;
    return obj;
  });
};

const HARIAN_APPS_SCRIPT_URL = String(import.meta.env.VITE_HARIAN_APPS_SCRIPT_URL || '').trim();

export const fetchAppsScriptSheetRows = (spreadsheetId: string, sheetName: string): Promise<string[][]> =>
  new Promise((resolve, reject) => {
    if (!HARIAN_APPS_SCRIPT_URL) {
      reject(new Error('Apps Script URL belum dikonfigurasi'));
      return;
    }
    const callbackName = `__sheetRead_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Apps Script read timeout; deployment belum memperbarui readSheet'));
    }, 15000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete (window as any)[callbackName];
      script.remove();
    };
    (window as any)[callbackName] = (result: any) => {
      cleanup();
      if (!result?.ok) reject(new Error(result?.error || 'Apps Script gagal membaca sheet'));
      else resolve(result.values || []);
    };
    script.onerror = () => { cleanup(); reject(new Error('Apps Script read request gagal')); };
    script.src = `${HARIAN_APPS_SCRIPT_URL}?action=readSheet&spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheetName=${encodeURIComponent(sheetName)}&callback=${callbackName}`;
    document.head.appendChild(script);
  });

const getSingleCellFromRange = (rows: string[][], range?: string): string | undefined => {
  const cellReference = String(range || "").split("!").pop()?.match(/([A-Z]+)(\d+)/i);
  if (!cellReference) return rows[0]?.[0];

  const columnLetters = cellReference[1].toUpperCase();
  const rowIndex = Number(cellReference[2]) - 1;
  let columnIndex = 0;
  for (const letter of columnLetters) columnIndex = columnIndex * 26 + letter.charCodeAt(0) - 64;
  columnIndex -= 1;
  return rows[rowIndex]?.[columnIndex];
};

export const fetchAppsScriptSheetNames = (spreadsheetId: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    if (!HARIAN_APPS_SCRIPT_URL) {
      reject(new Error('Apps Script URL belum dikonfigurasi'));
      return;
    }
    const callbackName = `__sheetNames_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const cleanup = () => { delete (window as any)[callbackName]; script.remove(); };
    (window as any)[callbackName] = (result: any) => {
      cleanup();
      if (!result?.ok) reject(new Error(result?.error || 'Apps Script gagal membaca metadata'));
      else resolve(result.sheets || []);
    };
    script.onerror = () => { cleanup(); reject(new Error('Apps Script metadata request gagal')); };
    script.src = `${HARIAN_APPS_SCRIPT_URL}?action=listSheets&spreadsheetId=${encodeURIComponent(spreadsheetId)}&callback=${callbackName}`;
    document.head.appendChild(script);
  });

export const useGoogleSheetsData = ({ spreadsheetId, sheetName, sheetAliases = [], range, mode = "rows", refreshKey, enabled = true }: UseGoogleSheetsDataProps) => {
  const candidateSheets = Array.from(new Set([sheetName, ...sheetAliases].filter(Boolean))) as string[];

  const query = useQuery({
    queryKey: ['google-sheets-data', spreadsheetId, ...candidateSheets, range ?? null, mode, refreshKey ?? null],
    enabled: enabled && !!spreadsheetId && candidateSheets.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 2,
    queryFn: async (): Promise<any[]> => {
      let lastError: any = null;

      for (const candidateSheet of candidateSheets) {
        try {
          try {
            const requestedRange = range?.split("!").pop();
            const publicRows = await fetchPublicGoogleSheetRows(spreadsheetId, candidateSheet, mode === "single-cell" ? requestedRange : undefined);
            if (publicRows.length > 0) {
              if (mode === "single-cell") {
                // The public request is already restricted to the requested cell.
                const cellValue = publicRows[0]?.__rawRow?.[0];
                return cellValue === undefined || cellValue === null || cellValue === "" ? [] : [String(cellValue)];
              }
              return publicRows;
            }
          } catch (publicFirstError) {
            console.warn(`[useGoogleSheetsData] public read failed for "${candidateSheet}":`, publicFirstError);
          }

          const appsScriptRows = await fetchAppsScriptSheetRows(spreadsheetId, candidateSheet);
          console.debug(`[useGoogleSheetsData] appsScriptRows for "${candidateSheet}":`, { rowCount: appsScriptRows.length, mode, range });
          if (mode === "single-cell") {
            const cellValue = getSingleCellFromRange(appsScriptRows, range);
            console.debug(`[useGoogleSheetsData] extracted cell value:`, { cellValue, range });
            if (cellValue !== undefined && cellValue !== null && cellValue !== "") return [String(cellValue)];
          } else if (appsScriptRows.length > 0) {
            return appsScriptRows;
          }

          lastError = new Error(`Sheet ${candidateSheet} tidak mengembalikan data`);
          continue;
        } catch (error) {
          console.warn(`[useGoogleSheetsData] unexpected error for "${candidateSheet}":`, error);
          lastError = error;
        }
      }

      console.error(`[useGoogleSheetsData] failed to read any sheet for ${sheetName}; aliases=${candidateSheets.join(', ')}`, lastError);
      throw lastError ?? new Error(`Tidak dapat membaca sheet ${sheetName}`);
    },
  });

  return {
    data: (query.data ?? []) as any[],
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.error ? ((query.error as any).message ?? String(query.error)) : null,
  };
};
