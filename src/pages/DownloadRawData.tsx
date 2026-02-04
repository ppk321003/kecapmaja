import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
export default function DownloadRawData() {
  return <div className="space-y-6">
      <div className="flex items-center justify-between bg-background p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Download Raw Data
          </h1>
          <p className="text-muted-foreground text-sm">
            Unduh data mentah kegiatan untuk analisis lebih lanjut
          </p>
        </div>
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