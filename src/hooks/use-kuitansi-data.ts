import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface KuitansiData {
  [key: string]: any;
}

export const useKuitansiData = (spreadsheetId: string | null | undefined) => {
  const [data, setData] = useState<KuitansiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!spreadsheetId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: response, error: err } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: spreadsheetId,
            operation: "read",
            range: "Sheet1!A:X" // Range A:X as requested
          }
        });

        if (err) throw err;

        const rows = response?.values || [];
        
        // Convert to objects with header keys
        if (rows.length > 1) {
          const headers = rows[0];
          const dataRows = rows.slice(1)
            .filter((row: any[]) => row.some((cell: any) => cell && cell.toString().trim()))
            .map((row: any[]) => {
              const obj: KuitansiData = {};
              headers.forEach((header: string, index: number) => {
                obj[header.toLowerCase().trim()] = row[index] || '';
              });
              return obj;
            });
          setData(dataRows);
        }
      } catch (err: any) {
        console.error("Error fetching kuitansi data:", err);
        setError(err.message || "Gagal memuat data kuitansi");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spreadsheetId]);

  return { data, loading, error };
};
