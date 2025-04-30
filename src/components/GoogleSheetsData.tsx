
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

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
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSheetData() {
      try {
        setLoading(true);
        setError(null);
        
        const { data: responseData, error } = await supabase.functions.invoke("google-sheets", {
          body: { 
            action: "read",
            sheetName, 
            range 
          }
        });
        
        if (error) {
          throw new Error(error.message);
        }

        if (responseData && responseData.values && responseData.values.length > 0) {
          // First row is headers
          const headers = responseData.values[0];
          setHeaders(headers);
          
          // Rest are data rows
          const rows = responseData.values.slice(1).map((row: any[]) => {
            const rowData: Record<string, any> = {};
            headers.forEach((header: string, index: number) => {
              rowData[header] = row[index] || "";
            });
            return rowData;
          });

          setData(rows);
        } else {
          setHeaders([]);
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
        ) : headers.length === 0 ? (
          <p className="text-muted-foreground">Tidak ada data yang ditemukan</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="font-medium">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.length > 0 ? (
                  data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {row[header] || ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={headers.length} className="text-center">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
