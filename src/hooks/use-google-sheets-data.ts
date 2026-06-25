import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGoogleSheetsDataProps {
  spreadsheetId: string;
  sheetName: string;
  range?: string;
}

export const useGoogleSheetsData = ({ spreadsheetId, sheetName, range }: UseGoogleSheetsDataProps) => {
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
        
        // Convert to objects with header keys, preserving duplicate headers as numbered keys
        if (rows.length > 1) {
          const headers = rows[0];
          const dataRows = rows.slice(1).map((row: any[]) => {
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
