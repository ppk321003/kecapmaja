import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KuitansiFormData {
  [key: string]: any;
}

export const useKuitansiSubmit = (spreadsheetId: string | null | undefined) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitKuitansi = async (data: KuitansiFormData): Promise<boolean> => {
    if (!spreadsheetId) {
      setError("Sheet ID tidak ditemukan");
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare the data for submission
      const values = [Object.values(data)];

      const { error: err } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: spreadsheetId,
          operation: "append",
          range: "Sheet1!A:X",
          values: values,
        },
      });

      if (err) {
        setError(err.message || "Gagal menyimpan kuitansi");
        return false;
      }

      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Terjadi kesalahan saat menyimpan kuitansi";
      console.error("Error submitting kuitansi:", err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { submitKuitansi, loading, error };
};
