import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

export default function RekapBendahara() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Download SPJ</h1>
        <p className="text-muted-foreground mt-2">
          Unduh Surat Pertanggungjawaban per kegiatan
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            <CardTitle>Download Dokumen SPJ</CardTitle>
          </div>
          <CardDescription>
            Halaman ini akan berisi fitur untuk mengunduh dokumen SPJ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground">Fitur download SPJ akan ditambahkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
