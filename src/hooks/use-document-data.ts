import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseDocumentDataProps {
  sheetId: string;
  sheetName: string;
}

export function useDocumentData({ sheetId, sheetName }: UseDocumentDataProps) {
  return useQuery({
    queryKey: ["document-data", sheetId, sheetName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: sheetId,
          operation: "read",
          range: `${sheetName}!A:ZZ`,
        },
      });

      if (error) throw error;

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      const headers = rows[0];
      return rows.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });
    },
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
}
