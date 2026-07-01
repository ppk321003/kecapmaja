import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGoogleSheetsDataProps {
  spreadsheetId: string;
  sheetName: string;
  range?: string;
  mode?: "rows" | "single-cell";
}

export const useGoogleSheetsData = ({ spreadsheetId, sheetName, range, mode = "rows" }: UseGoogleSheetsDataProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: response, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: spreadsheetId,
            operation: "read",
            range: range || sheetName
          }
        });

        if (error) throw error;

        const rows = response?.values || [];

        if (mode === "single-cell") {
          const firstCell = Array.isArray(rows[0]) ? rows[0][0] : rows[0];
          setData(firstCell !== undefined && firstCell !== null && firstCell !== "" ? [String(firstCell)] : []);
          return;
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

        // Detect actual header row if sheet contains title / metadata rows above it
        let headerRowIndex = 0;
        if (rows.length > 1 && !isHeaderRow(rows[0])) {
          const preferredHeaderRowIndex = rows.length > 3 ? 3 : 0;
          if (rows[preferredHeaderRowIndex] && isHeaderRow(rows[preferredHeaderRowIndex])) {
            headerRowIndex = preferredHeaderRowIndex;
          } else {
            headerRowIndex = rows.findIndex((row: any[], index: number) => index >= 3 && isHeaderRow(row));
            if (headerRowIndex === -1) {
              headerRowIndex = 0;
            }
          }
        }

        if (rows.length > headerRowIndex + 2) {
          const headers = rows[headerRowIndex];
          const dataRows = rows.slice(headerRowIndex + 2).map((row: any[]) => {
            const obj: any = {};
            const headerCount: Record<string, number> = {};

            headers.forEach((header: string, index: number) => {
              const normalizedHeader = String(header || '').trim().toLowerCase();
              if (!normalizedHeader) return;

              const count = (headerCount[normalizedHeader] || 0) + 1;
              headerCount[normalizedHeader] = count;

              const key = count === 1 ? normalizedHeader : `${normalizedHeader}_${count}`;
              obj[key] = row[index] || '';
            });
            return obj;
          });
          setData(dataRows);
        }
      } catch (err: any) {
        console.error(`Error fetching ${sheetName}:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spreadsheetId, sheetName, range]);

  return { data, loading, error };
};
