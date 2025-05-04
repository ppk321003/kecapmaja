
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";

interface DocumentDataOptions {
  sheetId: string;
  sheetName?: string;
}

export function useDocumentData({ sheetId, sheetName = "Sheet1" }: DocumentDataOptions) {
  return useQuery({
    queryKey: ["document-data", sheetId, sheetName],
    queryFn: async () => {
      try {
        console.log(`Fetching data from sheet: ${sheetId}, tab: ${sheetName}`);
        
        // Fetch the Google Sheets data with proper URL encoding
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log("Raw response:", text.substring(0, 200) + "..."); // Log partial response for debugging
        
        // Extract the JSON from the response
        // Google returns a strange format that needs to be cleaned
        // The response is in format: "/*O_o*/google.visualization.Query.setResponse({...});"
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === 0) {
          throw new Error("Invalid response format from Google Sheets");
        }
        
        const jsonText = text.substring(jsonStart, jsonEnd);
        const data = JSON.parse(jsonText);
        
        if (!data.table || !data.table.rows) {
          console.error("No table or rows in response", data);
          return [];
        }
        
        // Get column headers from the first row
        const headers = data.table.cols.map((col: any) => col.label || "");
        console.log("Headers:", headers);
        
        // Map the data to objects
        const rows = data.table.rows.map((row: any) => {
          const obj: Record<string, any> = {};
          
          row.c.forEach((cell: any, index: number) => {
            const header = headers[index] || `column_${index}`;
            obj[header] = cell ? (cell.v !== null ? cell.v : "") : "";
          });
          
          return obj;
        });
        
        console.log("Processed data:", rows.length, "rows");
        return rows;
      } catch (error: any) {
        console.error("Error fetching document data:", error);
        // Display a toast notification for better user feedback
        toast({
          variant: "destructive",
          title: "Error fetching data",
          description: error.message || "Failed to load data from Google Sheets"
        });
        // Return empty array instead of throwing to prevent UI from breaking
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry failed requests 3 times
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: true // Refetch when component mounts
  });
}
