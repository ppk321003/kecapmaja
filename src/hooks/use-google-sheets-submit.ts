import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseSubmitToSheetsProps {
  spreadsheetId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useSubmitToSheets = ({ spreadsheetId, onSuccess, onError }: UseSubmitToSheetsProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: spreadsheetId,
          operation: "append",
          range: "KerangkaAcuanKerja",
          values: [data]
        }
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Data berhasil dikirim ke Google Sheets"
      });

      if (onSuccess) {
        onSuccess();
      }

      return response;
    } catch (error: any) {
      console.error("Error submitting to Google Sheets:", error);
      toast({
        title: "Error",
        description: "Gagal mengirim data: " + error.message,
        variant: "destructive"
      });

      if (onError) {
        onError(error);
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitData, isSubmitting };
};
