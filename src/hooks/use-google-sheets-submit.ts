import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseSubmitToSheetsProps {
  spreadsheetId: string;
  sheetName?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useSubmitToSheets = ({ spreadsheetId, sheetName = "Sheet1", onSuccess, onError }: UseSubmitToSheetsProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitData = async (data: any[] | any) => {
    setIsSubmitting(true);
    try {
      // Convert object to array if needed
      let rowData = data;
      if (!Array.isArray(data)) {
        rowData = Object.values(data);
      }

      const { data: response, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: spreadsheetId,
          operation: "append",
          range: sheetName,
          values: [rowData]
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

  const mutateAsync = submitData;
  const mutate = submitData;

  return { submitData, mutateAsync, mutate, isSubmitting, isPending: isSubmitting };
};
