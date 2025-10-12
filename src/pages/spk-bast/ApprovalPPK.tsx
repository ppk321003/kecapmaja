import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function ApprovalPPK() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Approval PPK</h1>
        <p className="text-muted-foreground mt-2">
          Persetujuan Pejabat Pembuat Komitmen untuk dokumen kegiatan
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            <CardTitle>Sistem Approval PPK</CardTitle>
          </div>
          <CardDescription>
            Halaman ini akan berisi sistem approval untuk PPK
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground">Sistem approval PPK akan ditambahkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
