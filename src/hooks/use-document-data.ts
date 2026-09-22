import { useQuery } from "@tanstack/react-query";
import { readSheetValues } from "@/lib/sheets-read";

interface UseDocumentDataProps {
  sheetId: string;
  sheetName: string;
}

export function useDocumentData({ sheetId, sheetName }: UseDocumentDataProps) {
  return useQuery({
    queryKey: ["document-data", sheetId, sheetName],
    queryFn: async () => {
      // Dibaca langsung dari Google Sheets (tanpa Supabase)
      const data = await readSheetValues({
        spreadsheetId: sheetId,
        range: sheetName,
      });

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      const headers = rows[0];
      const items = rows.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });

      // Remove duplicate IDs - keep only the first occurrence
      const seenIds = new Set<string>();
      return items.filter((item: any) => {
        const id = item.Id || item.id;
        if (!id) return true; // Keep items without ID
        
        const idStr = String(id).trim();
        if (seenIds.has(idStr)) {
          return false; // Skip duplicate
        }
        
        seenIds.add(idStr);
        return true; // Keep first occurrence
      });
    },
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
}
