import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
export default function DownloadRawData() {
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Download Raw Data</h1>
        <p className="text-muted-foreground mt-2">
          Unduh data mentah kegiatan untuk analisis lebih lanjut
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <CardTitle>Download Raw Data</CardTitle>
          </div>
          <CardDescription>
            Halaman ini akan berisi fitur untuk mengunduh raw data kegiatan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground">Fitur download raw data akan ditambahkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>;
}