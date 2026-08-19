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

export const useGoogleSheetsData = ({ spreadsheetId, sheetName, sheetAliases = [], range, mode = "rows", refreshKey, enabled = true }: UseGoogleSheetsDataProps) => {
  const candidateSheets = Array.from(new Set([sheetName, ...sheetAliases].filter(Boolean))) as string[];

  const query = useQuery({
    queryKey: ['google-sheets-data', spreadsheetId, ...candidateSheets, range ?? null, mode, refreshKey ?? null],
    enabled: enabled && !!spreadsheetId && candidateSheets.length > 0,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
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
            continue;
          }

          if (response?.ok === false || response?.error) {
            const message = typeof response.error === 'string'
              ? response.error
              : response.error?.message || response.message || `Sheet "${candidateSheet}" tidak dapat dibaca`;
            console.warn(`[useGoogleSheetsData] sheet "${candidateSheet}" returned error:`, message);
            lastError = new Error(message);
            continue;
          }

          const rows = response?.values || [];

          if (mode === "single-cell") {
            const firstCell = Array.isArray(rows[0]) ? rows[0][0] : rows[0];
            return firstCell !== undefined && firstCell !== null && firstCell !== "" ? [String(firstCell)] : [];
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

          return [];
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
