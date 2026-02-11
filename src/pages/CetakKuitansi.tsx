import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useKuitansi } from "@/contexts/KuitansiContext";
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
  const { kuitansiList, isLoading } = useKuitansi();
  const [searchTerm, setSearchTerm] = useState("");

  // Check authorization
  const isAuthorized = user?.role === "Pejabat Pembuat Komitmen" && user?.satker === "3210";

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
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

      const headers = ["no_kuitansi", "penerima", "jumlah", "keterangan", "tanggal"];
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="text-center py-10">
          <p className="text-gray-600">Memuat data kuitansi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Cetak Kuitansi</h1>
          <p className="text-gray-600">Kelola dan cetak kuitansi untuk PPK Satker 3210</p>
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

        {/* No Data State */}
        {!isLoading && (!kuitansiList || kuitansiList.length === 0) && (
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
        {!isLoading && kuitansiList && kuitansiList.length > 0 && (
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
                      <TableHead className="w-[120px]">No. Kuitansi</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="w-[100px]">Tanggal</TableHead>
                      <TableHead className="w-[100px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.no_kuitansi || "-"}</TableCell>
                        <TableCell>{item.penerima || "-"}</TableCell>
                        <TableCell className="text-right">{item.jumlah || "-"}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.keterangan || "-"}</TableCell>
                        <TableCell>{item.tanggal || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/detail-kuitansi/${item.id}`)
                            }
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            Detail
                          </Button>
                        </TableCell>
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
