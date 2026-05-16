import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export function PelatihanSE26() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="text-lg">📚 Pelatihan SE26</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-t-4 border-t-red-500">
        <CardHeader>
          <CardTitle className="text-lg">📚 Pelatihan SE26</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-t-4 border-t-blue-500">
      <CardHeader>
        <CardTitle className="text-lg">📚 Pelatihan SE26</CardTitle>
        <CardDescription>Data pelatihan SE26 dari Google Sheets (View Only)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.max(zoom - 10, 50))}
              disabled={zoom <= 50}
              title="Zoom Out (Min: 50%)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-12 text-center">{zoom}%</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setZoom(Math.min(zoom + 10, 200))}
              disabled={zoom >= 200}
              title="Zoom In (Max: 200%)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(100)}
              title="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          {/* Iframe Container with Zoom */}
          <div className="w-full rounded-lg border border-slate-200 overflow-x-auto bg-white">
            <iframe
              src="https://docs.google.com/spreadsheets/d/1iCZGbfPgRMiXGO6q_vtklOsJ4gFQoUS2nMwS-HlY0r4/edit?usp=sharing&rm=minimal"
              className="border-0"
              style={{
                width: "100%",
                height: "calc(100vh - 200px)",
                minHeight: "600px",
                zoom: `${zoom}%`,
                display: "block",
              }}
              title="Pelatihan SE26 Sheet"
            />
          </div>
        </div>
        <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-slate-700">
          📌 <strong>Catatan:</strong> Gunakan tombol zoom untuk memperbesar/memperkecil tampilan sheet. Data ditampilkan langsung dari Google Sheets. Untuk mengedit, buka file secara langsung.
        </div>
      </CardContent>
    </Card>
  );
}
