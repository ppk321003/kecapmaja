import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
export default function DownloadRawData() {
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-red-500">Pedoman</h1>
        <p className="text-muted-foreground mt-2">
          Panduan pedoman penggunaan Kecap Maja
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            <CardTitle>Pedoman</CardTitle>
          </div>
          <CardDescription>
            Halaman ini akan berisi fitur Panduan pedoman penggunaan Kecap Maja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground">Panduan pedoman penggunaan Kecap Maja akan ditambahkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>;
}