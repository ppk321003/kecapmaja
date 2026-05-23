import { AlertCircle, Hammer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SensusEkonomiPelatihan() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-8">
      <div className="w-full mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800">
            Pelatihan Sensus Ekonomi 2026
          </h1>
          <p className="text-slate-600">Program pelatihan untuk petugas Sensus Ekonomi 2026</p>
        </header>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Hammer className="h-8 w-8 text-amber-600" />
              <div>
                <CardTitle className="text-amber-900">Under Construction</CardTitle>
                <CardDescription className="text-amber-800 mt-1">Halaman ini sedang dalam pengembangan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <AlertCircle className="h-16 w-16 text-amber-600 opacity-50" />
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-amber-900">Fitur sedang dikembangkan</h2>
                <p className="text-sm text-amber-800 max-w-md">
                  Modul pelatihan untuk Sensus Ekonomi 2026 akan segera tersedia. Silakan kembali lagi nanti.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
