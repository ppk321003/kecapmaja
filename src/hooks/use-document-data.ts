
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
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
        );
        
        const text = await response.text();
        
        // Extract the JSON from the response
        // Google returns a strange format that needs to be cleaned
        const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}')+1);
        const data = JSON.parse(jsonText);
        
        if (!data.table || !data.table.rows) {
          return [];
        }
        
        // Get column headers from the first row
        const headers = data.table.cols.map((col: any) => col.label);
        
        // Map the data to objects with Indonesia timezone for date fields
        const rows = data.table.rows.map((row: any) => {
          const obj: Record<string, any> = {};
          
          row.c.forEach((cell: any, index: number) => {
            const header = headers[index] || `column_${index}`;
            
            // Check if it's a date type and format it for Indonesian timezone
            if (cell && cell.v && typeof cell.v === 'object' && cell.v.year && cell.v.month) {
              // For date objects from Google Sheets
              const dateObj = new Date(
                cell.v.year,
                cell.v.month - 1, // Google Sheets months are 1-indexed
                cell.v.day || 1
              );
              
              // Format date for Indonesia timezone (DD-MM-YYYY)
              obj[header] = dateObj.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                timeZone: 'Asia/Jakarta'
              });
            } else {
              // For non-date values
              obj[header] = cell ? (cell.v || "") : "";
            }
          });
          
          return obj;
        });
        
        return rows;
      } catch (error) {
        console.error("Error fetching document data:", error);
        throw new Error("Failed to fetch document data");
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
