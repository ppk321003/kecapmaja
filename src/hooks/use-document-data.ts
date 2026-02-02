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
          range: sheetName,
        },
      });

      if (error) throw error;

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      const headers = rows[0];
      return rows.slice(1).map((row: any[], index: number) => {
        const obj: any = {};
        headers.forEach((header: string, colIndex: number) => {
          obj[header] = row[colIndex] || "";
        });
        // Store the original sheet row index (1-indexed, +2 for header)
        obj.__sheetRowIndex = index + 2;
        return obj;
      });
    },
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
}
