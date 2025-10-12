import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function EntriRealisasi() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Entri Realisasi Kegiatan</h1>
        <p className="text-muted-foreground mt-2">
          Pencatatan realisasi pelaksanaan kegiatan mitra statistik
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            <CardTitle>Form Entri Realisasi</CardTitle>
          </div>
          <CardDescription>
            Halaman ini akan berisi form untuk mencatat realisasi kegiatan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground">Form entri realisasi kegiatan akan ditambahkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
