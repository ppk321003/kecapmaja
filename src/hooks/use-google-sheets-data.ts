import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

const fetchPublicGoogleSheetRows = async (spreadsheetId: string, sheetName: string): Promise<any[]> => {
  const cleanSheetName = String(sheetName || '').trim();
  if (!cleanSheetName) {
    return [];
  }

  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(cleanSheetName)}`,
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
          const { data: response, error } = await supabase.functions.invoke("google-sheets", {
            body: {
              spreadsheetId: spreadsheetId,
              operation: "read",
              range: range || candidateSheet
            }
          });

          if (error) {
            console.warn(`[useGoogleSheetsData] sheet "${candidateSheet}" failed:`, error);
            lastError = error;
          } else if (response?.ok === false || response?.error) {
            const message = typeof response.error === 'string'
              ? response.error
              : response.error?.message || response.message || `Sheet "${candidateSheet}" tidak dapat dibaca`;
            console.warn(`[useGoogleSheetsData] sheet "${candidateSheet}" returned error:`, message);
            lastError = new Error(message);
          } else {
            const rows = response?.values || [];

            if (mode === "single-cell") {
              const firstCell = Array.isArray(rows[0]) ? rows[0][0] : rows[0];
              if (firstCell !== undefined && firstCell !== null && firstCell !== "") {
                return [String(firstCell)];
              }
            }

            const isHeaderRow = (row: any[]): boolean => {
              const headerText = row.map((cell) => String(cell || '').trim().toLowerCase());
              const headerCandidates = [
                'nama',
                'kode',
                'kecamatan',
                'desa',
                'sls',
                'link',
                'tindak',
                'ppl',
                'pml',
                'assignment',
                'provinsi'
              ];
              const matches = headerText.reduce((count, value) => {
                if (!value) return count;
                return headerCandidates.some((candidate) => value.includes(candidate)) ? count + 1 : count;
              }, 0);
              return matches >= 4;
            };

            let headerRowIndex = 0;
            if (rows.length > 1) {
              const found = rows.findIndex((row: any[]) => isHeaderRow(row));
              headerRowIndex = found === -1 ? 0 : found;
            }

            if (rows.length > headerRowIndex + 1) {
              let headers = rows[headerRowIndex];
              const EXTRA_SKIP_FOR_SHEETS: Record<string, number> = {
                "Mikro Anomali Usaha": 1,
                "Mikro Anomali Keluarga": 1,
                "Prelist_Awal": 1,
              };

              const extraSkip = EXTRA_SKIP_FOR_SHEETS[candidateSheet] || 0;

              if (candidateSheet === "Prelist_Awal" && rows.length > headerRowIndex + 1) {
                const secondHeaderRow = rows[headerRowIndex + 1] || [];
                headers = headers.map((header: string, index: number) => {
                  const primary = String(header || '').trim();
                  const secondary = String(secondHeaderRow[index] || '').trim();
                  const isGroupHeader = /assignment|total assignment|bku & bangunan/i.test(primary);
                  if (secondary && (!primary || isGroupHeader || secondary.length < primary.length)) {
                    return secondary;
                  }
                  return primary || secondary;
                });
              }

              const dataStartIndex = headerRowIndex + 1 + extraSkip;
              const dataRows = rows.slice(dataStartIndex).map((row: any[], rowIdx: number) => {
                const obj: any = {};
                const headerCount: Record<string, number> = {};

                headers.forEach((header: string, index: number) => {
                  const raw = String(header || '');
                  const normalizedHeader = raw.trim().toLowerCase();
                  const headerKeyBase = normalizedHeader || `__col_${index}`;

                  const count = (headerCount[headerKeyBase] || 0) + 1;
                  headerCount[headerKeyBase] = count;

                  const key = count === 1 ? headerKeyBase : `${headerKeyBase}_${count}`;
                  obj[key] = row[index] ?? '';
                });

                obj.__rowNumber = dataStartIndex + rowIdx + 1;
                obj.__rawRow = row;
                return obj;
              });
              return dataRows;
            }

            if (mode === "rows" && rows.length > 0) {
              return rows;
            }

            return [];
          }

          if (mode !== "single-cell") {
            try {
              const publicRows = await fetchPublicGoogleSheetRows(spreadsheetId, candidateSheet);
              if (publicRows.length > 0) {
                console.warn(`[useGoogleSheetsData] Fallback to public Google Sheets for "${candidateSheet}" because Edge Function is restricted.`);
                return publicRows;
              }
            } catch (publicFallbackError) {
              console.warn(`[useGoogleSheetsData] Public fallback failed for "${candidateSheet}":`, publicFallbackError);
            }
          }

          lastError = error ?? lastError ?? new Error(`Tidak dapat membaca sheet ${candidateSheet}`);
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
