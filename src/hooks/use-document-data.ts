
import { useQuery } from "@tanstack/react-query";

interface DocumentDataOptions {
  sheetId: string;
  sheetName?: string;
}

export function useDocumentData({ sheetId, sheetName = "Sheet1" }: DocumentDataOptions) {
  return useQuery({
    queryKey: ["document-data", sheetId, sheetName],
    queryFn: async () => {
      try {
        // Fetch the Google Sheets data
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`
        );
        
        const text = await response.text();
        
        // Extract the JSON from the response
        // Google returns a strange format that needs to be cleaned
        const jsonText = text.substring(47).slice(0, -2);
        const data = JSON.parse(jsonText);
        
        if (!data.table || !data.table.rows) {
          return [];
        }
        
        // Get column headers from the first row
        const headers = data.table.cols.map((col: any) => col.label);
        
        // Map the data to objects
        const rows = data.table.rows.map((row: any) => {
          const obj: Record<string, any> = {};
          
          row.c.forEach((cell: any, index: number) => {
            const header = headers[index] || `column_${index}`;
            obj[header] = cell ? (cell.v || "") : "";
          });
          
          return obj;
        });
        
        return rows;
      } catch (error) {
        console.error("Error fetching document data:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
