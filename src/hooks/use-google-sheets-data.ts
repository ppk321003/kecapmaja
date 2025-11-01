import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGoogleSheetsDataProps {
  spreadsheetId: string;
  sheetName: string;
}

export const useGoogleSheetsData = ({ spreadsheetId, sheetName }: UseGoogleSheetsDataProps) => {
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
            range: sheetName
          }
        });

        if (error) throw error;

        const rows = response?.values || [];
        
        // Convert to objects with header keys
        if (rows.length > 1) {
          const headers = rows[0];
          const dataRows = rows.slice(1).map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header.toLowerCase()] = row[index] || '';
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
  }, [spreadsheetId, sheetName]);

  return { data, loading, error };
};
