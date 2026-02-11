import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useKuitansiData } from "@/hooks/use-kuitansi-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, RotateCcw, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const CetakKuitansi: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const [searchTerm, setSearchTerm] = useState("");

  // Check authorization
  const isAuthorized = user?.role === "Pejabat Pembuat Komitmen" && user?.satker === "3210";

  // Get sheet ID
  const sheetId = satkerContext?.configs?.find(c => c.satker_id === "3210")?.kuitansi_sheet_id;
  
  // Fetch kuitansi data
  const { data: kuitansiList, loading: kuitansiLoading } = useKuitansiData(sheetId);

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  if (!sheetId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-yellow-200 p-8 max-w-md w-full shadow-sm">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">Konfigurasi Diperlukan</h1>
          <p className="text-gray-600">Sheet ID kuitansi belum dikonfigurasi. Hubungi administrator.</p>
        </div>
      </div>
    );
  }

  // Filter data berdasarkan search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return kuitansiList || [];

    const term = searchTerm.toLowerCase();
    return (kuitansiList || []).filter((item) =>
      Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(term)
      )
    );
  }, [kuitansiList, searchTerm]);

  // Get visible columns (first 6)
  const visibleColumns = useMemo(() => {
    if (!kuitansiList || kuitansiList.length === 0) return [];
    return Object.keys(kuitansiList[0]).slice(0, 6);
  }, [kuitansiList]);

  const handlePrint = () => {
    window.print();
    toast.success("Dialog cetak sudah dibuka");
  };

  const handleDownloadCSV = () => {
    try {
      if (!kuitansiList || kuitansiList.length === 0) {
        toast.error("Tidak ada data untuk diunduh");
        return;
      }

      const headers = visibleColumns;
      const rows = filteredData.map((item) =>
        headers
          .map((col) => {
            const str = (item[col] || "").toString();
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",")
      );

      const csvContent = [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Kuitansi_Export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("File CSV berhasil diunduh");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Gagal mengunduh file CSV");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Cetak Kuitansi/Nota</h1>
          <p className="text-gray-600">PPK Satker 3210</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => navigate("/buat-kuitansi")}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            Buat Kuitansi Baru
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </Button>
          <Button
            onClick={handleDownloadCSV}
            variant="outline"
            className="gap-2"
            disabled={!filteredData || filteredData.length === 0}
          >
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <Input
            type="text"
            placeholder="Cari berdasarkan nomor, nama, atau informasi lainnya..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Loading State */}
        {kuitansiLoading && (
          <div className="text-center py-10">
            <p className="text-gray-600">Memuat data kuitansi...</p>
          </div>
        )}

        {/* No Data State */}
        {!kuitansiLoading && (!kuitansiList || kuitansiList.length === 0) && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-600 mb-4">Tidak ada data kuitansi ditemukan</p>
            <Button
              onClick={() => navigate("/buat-kuitansi")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Buat Kuitansi Pertama Anda
            </Button>
          </div>
        )}

        {/* Data Table */}
        {!kuitansiLoading && kuitansiList && kuitansiList.length > 0 && (
          <>
            {filteredData.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center space-y-4">
                <p className="text-gray-600">Tidak ada hasil yang sesuai dengan pencarian</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="justify-center w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Pencarian
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden shadow-sm print:shadow-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((col, idx) => (
                        <TableHead key={idx} className="capitalize bg-gray-50">
                          {col.replace(/_/g, " ")}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, idx) => (
                      <TableRow key={idx}>
                        {visibleColumns.map((col, colIdx) => (
                          <TableCell key={colIdx} className="text-sm">
                            {item[col]?.toString() || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CetakKuitansi;
