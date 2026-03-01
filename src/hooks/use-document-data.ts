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
      console.log(`[useDocumentData] Fetching ${sheetName} from ${sheetId?.substring(0, 30)}...`);
      
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: sheetId,
          operation: "read",
          range: `${sheetName}!A:ZZ`,
        },
      });

      if (error) {
        console.error(`[useDocumentData] Error fetching ${sheetName}:`, error);
        throw error;
      }

      let rows = data?.values || [];
      console.log(`[useDocumentData] Raw response: ${rows.length} rows from ${sheetName}`, {
        firstRow: rows[0],
        secondRow: rows[1],
        thirdRow: rows[2],
      });
      
      // Skip empty rows at the beginning
      const firstNonEmptyIndex = rows.findIndex(
        (row: any[]) => Array.isArray(row) && row.some((cell: any) => cell && String(cell).trim())
      );
      
      if (firstNonEmptyIndex > 0) {
        console.log(`[useDocumentData] Found first non-empty row at index ${firstNonEmptyIndex}, skipping blank rows`);
        rows = rows.slice(firstNonEmptyIndex);
      }
      
      if (rows.length <= 1) {
        console.warn(`[useDocumentData] No data rows found in ${sheetName} (only header or empty)`, {
          totalRows: rows.length,
          rows: rows.map(r => Array.isArray(r) ? r.slice(0, 5) : r)
        });
        return [];
      }

      const headers = rows[0];
      const validHeaders = headers && headers.filter((h: any) => h && String(h).trim());
      
      if (validHeaders.length === 0) {
        console.error(`[useDocumentData] Headers are empty or invalid in ${sheetName}:`, headers);
        return [];
      }
      
      console.log(`[useDocumentData] Headers from ${sheetName}:`, headers);
      
      const mappedRows = rows.slice(1)
        .filter((row: any[]) => row && row.some((cell: any) => cell && String(cell).trim()))
        .map((row: any[], rowIndex: number) => {
          const obj: any = {};
          
          // Map headers to values, supporting both exact and case-insensitive matching
          headers.forEach((header: string, index: number) => {
            const cellValue = row[index];
            
            // Use header as-is first
            obj[header] = cellValue || "";
            
            // Also add normalized version for case-insensitive access
            const normalizedHeader = header.toLowerCase().trim();
            obj[normalizedHeader] = cellValue || "";
            
            // Special case handling for common variations
            if (normalizedHeader === 'id') {
              obj['Id'] = cellValue || "";
              obj['ID'] = cellValue || "";
            }
          });
          
          if (rowIndex === 0) {
            console.log(`[useDocumentData] Sample mapped row from ${sheetName}:`, {
              allKeys: Object.keys(obj),
              firstFiveValues: Object.entries(obj).slice(0, 5).map(([k, v]) => `${k}: ${v}`)
            });
          }
          
          return obj;
        });
      
      console.log(`[useDocumentData] ✅ Mapped ${mappedRows.length} rows from ${sheetName}`);
      return mappedRows;
    },
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
}
