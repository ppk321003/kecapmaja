import React, { useMemo } from "react";
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
import { Printer, RotateCcw, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface KuitansiItem {
  [key: string]: any;
}

const CetakKuitansi: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KuitansiItem | null>(null);

  // Check role dan satker
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const ppkRoles = ["ppk", "PPK"];
    const targetSatker = "3210";
    return ppkRoles.includes(user.role) && user.satker === targetSatker;
  }, [user]);

  // Get sheet ID for kuitansi
  const sheetId = useMemo(() => {
    if (!satkerContext?.configs) return null;
    const config = satkerContext.configs.find(c => c.satker_id === "3210");
    return config?.kuitansi_sheet_id || null;
  }, [satkerContext?.configs]);

  const { data: kuitansiData, loading, error } = useKuitansiData(sheetId);

  // Filter data berdasarkan search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return kuitansiData;
    
    const term = searchTerm.toLowerCase();
    return kuitansiData.filter(item => {
      return Object.values(item).some(value => 
        value?.toString().toLowerCase().includes(term)
      );
    });
  }, [kuitansiData, searchTerm]);

  const handlePrint = (item: KuitansiItem) => {
    setSelectedItem(item);
    setIsPrinting(true);
    
    // Delay untuk memastikan data ter-render di preview
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Pop-up diblokir. Harap aktifkan pop-up untuk mencetak.");
        setIsPrinting(false);
        return;
      }

      const receiptContent = document.getElementById('kuitansi-preview');
      if (!receiptContent) {
        toast.error("Tidak dapat menemukan data kuitansi untuk dicetak");
        setIsPrinting(false);
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Kuitansi ${item.nomor || 'Nota'}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                margin: 0; 
                padding: 10px; 
                background-color: #ffffff;
              }
              .kuitansi-container { 
                width: 210mm; 
                margin: 0 auto; 
                padding: 10px;
              }
              .header { 
                text-align: center; 
                margin-bottom: 10px; 
                font-weight: bold;
              }
              .divider { 
                border-top: 1px dashed #000; 
                margin: 8px 0; 
              }
              .content { 
                margin: 8px 0; 
              }
              .row { 
                display: flex; 
                justify-content: space-between; 
                margin: 4px 0;
              }
              .label { 
                width: 40%; 
              }
              .value { 
                width: 60%; 
                text-align: right;
              }
              .footer { 
                text-align: center; 
                margin-top: 15px; 
                font-size: 10px;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
              }
              th, td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: left;
              }
              th { 
                background-color: #f0f0f0; 
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            ${receiptContent.innerHTML}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownloadPDF = async (item: KuitansiItem) => {
    try {
      toast.info("Fitur unduh PDF sedang diproses...");
      // Siapkan data untuk di-download sebagai CSV
      const csvContent = [
        Object.keys(item).join(","),
        Object.values(item).map(v => `"${v}"`).join(",")
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Kuitansi_${item.nomor || 'nota'}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("File berhasil diunduh sebagai CSV");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Gagal mengunduh file. Silakan coba lagi.");
    }
  };

  // Not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-red-200 p-8 max-w-md w-full shadow-sm">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Akses Ditolak</h1>
          <p className="text-gray-600 mb-6">
            Maaf, fitur pencetakan kuitansi/nota hanya tersedia untuk PPK satker 3210.
          </p>
          <Button 
            onClick={() => navigate("/")}
            className="w-full"
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  // Check if sheet ID is configured
  if (!loading && !sheetId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-yellow-200 p-8 max-w-md w-full shadow-sm">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">Konfigurasi Diperlukan</h1>
          <p className="text-gray-600 mb-6">
            Halaman pencetakan kuitansi/nota belum dikonfigurasi. Hubungi administrator untuk menambahkan sheet ID kuitansi di kolom X (satker_config) untuk satker 3210.
          </p>
          <Button 
            onClick={() => navigate("/")}
            className="w-full"
          >
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pencetakan Kuitansi/Nota</h1>
          <p className="text-gray-600">Cetak dan kelola kuitansi/nota untuk satker 3210</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 bg-white rounded-lg border p-4 shadow-sm">
          <Input
            type="text"
            placeholder="Cari berdasarkan nomor, nama, atau informasi lainnya..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-10">
            <p className="text-gray-600">Memuat data kuitansi...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">Terjadi kesalahan: {error}</p>
          </div>
        )}

        {/* Data Table */}
        {!loading && !error && (
          <>
            {kuitansiData.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <p className="text-gray-600">Tidak ada data kuitansi ditemukan</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Dinamis header berdasarkan kolom yang ada */}
                      {kuitansiData.length > 0 && 
                        Object.keys(kuitansiData[0])
                          .slice(0, 8) // Tampilkan 8 kolom pertama saja untuk tempilan yang rapih
                          .map(key => (
                            <TableHead key={key} className="capitalize">
                              {key.replace(/_/g, ' ')}
                            </TableHead>
                          ))
                      }
                      <TableHead className="w-[150px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, index) => (
                      <TableRow key={index}>
                        {Object.entries(item)
                          .slice(0, 8)
                          .map(([key, value]) => (
                            <TableCell key={key} className="text-sm">
                              {value?.toString() || '-'}
                            </TableCell>
                          ))
                        }
                        <TableCell className="text-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrint(item)}
                            disabled={isPrinting}
                            className="mr-2"
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Cetak
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(item)}
                            className="mr-2"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            CSV
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredData.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Tidak ada hasil yang sesuai dengan pencarian</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="mt-4"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Pencarian
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden preview for print */}
      {selectedItem && (
        <div id="kuitansi-preview" style={{ display: 'none' }}>
          <div className="kuitansi-container">
            <div className="header">
              KUITANSI / NOTA
            </div>
            <div className="divider"></div>
            <div className="content">
              {Object.entries(selectedItem).map(([key, value]) => (
                <div key={key} className="row">
                  <div className="label">{key}:</div>
                  <div className="value">{value?.toString() || '-'}</div>
                </div>
              ))}
            </div>
            <div className="divider"></div>
            <div className="footer">
              <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
              <p>Satker 3210</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CetakKuitansi;
