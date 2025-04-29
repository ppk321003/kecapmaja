
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";

interface GoogleSheetsDataProps {
  sheetName?: string;
  range?: string;
  title?: string;
}

export default function GoogleSheetsData({ 
  sheetName = "Sheet1", 
  range = "A1:Z1000", 
  title = "Data dari Google Sheets" 
}: GoogleSheetsDataProps) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSheetData() {
      try {
        setLoading(true);
        
        const { data: responseData, error } = await supabase.functions.invoke("google-sheets", {
          body: { sheetName, range }
        });
        
        if (error) {
          throw new Error(error.message);
        }

        if (responseData && responseData.values) {
          // First row is headers, rest are data
          const headers = responseData.values[0];
          const rows = responseData.values.slice(1).map((row: any[]) => {
            const rowData: Record<string, any> = {};
            headers.forEach((header: string, index: number) => {
              rowData[header] = row[index] || "";
            });
            return rowData;
          });

          setData(rows);
        } else {
          setData([]);
        }
      } catch (err: any) {
        console.error("Error fetching Google Sheets data:", err);
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Gagal memuat data",
          description: err.message
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSheetData();
  }, [sheetName, range]);

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Gagal memuat data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((header) => (
                    <th key={header} className="border p-2 bg-muted text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    {Object.values(row).map((cell: any, cellIndex) => (
                      <td key={cellIndex} className="border p-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">Tidak ada data yang ditemukan</p>
        )}
      </CardContent>
    </Card>
  );
}
