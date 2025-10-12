import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitoring dan visualisasi data kegiatan mitra statistik
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <CardTitle>Dashboard Monitoring</CardTitle>
          </div>
          <CardDescription>
            Fitur dashboard akan dikonfigurasi sesuai kebutuhan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground">Konten dashboard akan ditambahkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
