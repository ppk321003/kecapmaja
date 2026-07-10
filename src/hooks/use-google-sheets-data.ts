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
        // Find the first row that looks like a header anywhere in the sheet.
        // Previously we only searched at or after row index 3 which missed headers on row 2.
        let headerRowIndex = 0;
        if (rows.length > 1) {
          const found = rows.findIndex((row: any[]) => isHeaderRow(row));
          headerRowIndex = found === -1 ? 0 : found;
        }

        if (rows.length > headerRowIndex + 1) {
          const headers = rows[headerRowIndex];
          // Default: use the row immediately after the detected header as data start.
          // Some sheets include an extra sub-header/notes row after the header (e.g. Mikro Anomali Usaha/Keluarga),
          // so allow per-sheet extra-skip here.
          const EXTRA_SKIP_FOR_SHEETS: Record<string, number> = {
            "REAL Mikro Anomali Usaha": 1,
            "REAL Mikro Anomali Keluarga": 1,
            "Mikro Anomali Usaha": 1,
            "Mikro Anomali Keluarga": 1,
          };

          const extraSkip = EXTRA_SKIP_FOR_SHEETS[sheetName] || 0;
          const dataStartIndex = headerRowIndex + 1 + extraSkip;
          const dataRows = rows.slice(dataStartIndex).map((row: any[], rowIdx: number) => {
            const obj: any = {};
            const headerCount: Record<string, number> = {};

            headers.forEach((header: string, index: number) => {
              const raw = String(header || '');
              const normalizedHeader = raw.trim().toLowerCase();
              // Preserve empty header columns with positional placeholder to keep column positions
              const headerKeyBase = normalizedHeader || `__col_${index}`;

              const count = (headerCount[headerKeyBase] || 0) + 1;
              headerCount[headerKeyBase] = count;

              const key = count === 1 ? headerKeyBase : `${headerKeyBase}_${count}`;
              obj[key] = row[index] ?? '';
            });
            // Attach the 1-based sheet row number so callers can update specific rows.
            obj.__rowNumber = dataStartIndex + rowIdx + 1;
            obj.__rawRow = row;
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
