import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function Pedoman() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pedoman</h1>
        <p className="text-muted-foreground mt-2">
          Panduan dan pedoman penggunaan sistem AKI MAJA
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <CardTitle>Pedoman Penggunaan</CardTitle>
          </div>
          <CardDescription>
            Halaman ini akan berisi pedoman dan dokumentasi sistem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground">Pedoman penggunaan sistem akan ditambahkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
