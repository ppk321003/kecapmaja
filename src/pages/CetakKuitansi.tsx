import React, { useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
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
import { toast } from "sonner";

interface KuitansiItem {
  [key: string]: any;
}

const CetakKuitansi: React.FC = () => {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const printRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<KuitansiItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Check role dan satker - PPK satker 3210
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const ppkRoles = ["Pejabat Pembuat Komitmen", "PPK", "ppk"];
    const targetSatker = "3210";
    return ppkRoles.includes(user.role) && user.satker === targetSatker;
  }, [user]);

  // Get sheet ID from satker_config kolom X (kuitansi_sheet_id)
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

  // Handle print
  const handlePrint = (item: KuitansiItem) => {
    setSelectedItem(item);
    setIsPreviewOpen(true);
    
    // Delay untuk render component preview
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Pop-up diblokir. Harap aktifkan pop-up untuk mencetak.");
        return;
      }

      const previewContent = printRef.current;
      if (!previewContent) {
        toast.error("Tidak dapat menemukan preview kuitansi");
        return;
      }

      const printContent = previewContent.innerHTML;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Kuitansi ${item.no_kuitansi || item.nomor || 'Nota'}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Arial', sans-serif;
                font-size: 11px;
                color: #000;
                line-height: 1.4;
              }
              .kuitansi-preview {
                width: 210mm;
                height: 297mm;
                margin: 0 auto;
                padding: 15mm;
                background: white;
              }
              .header {
                text-align: center;
                margin-bottom: 10mm;
                border-bottom: 2px solid #000;
                padding-bottom: 5mm;
              }
              .header h1 {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 3mm;
              }
              .content {
                margin: 10mm 0;
              }
              .row {
                display: flex;
                margin: 3mm 0;
              }
              .label {
                width: 30%;
                font-weight: bold;
              }
              .value {
                width: 70%;
              }
              .divider {
                border-top: 1px solid #000;
                margin: 5mm 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 5mm 0;
              }
              th {
                border: 1px solid #000;
                padding: 3mm;
                text-align: left;
                font-weight: bold;
                background-color: #f0f0f0;
              }
              td {
                border: 1px solid #000;
                padding: 3mm;
              }
              .footer {
                margin-top: 15mm;
                text-align: center;
                font-size: 10px;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="kuitansi-preview">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      // Delay sebelum print untuk memastikan konten ter-render
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
          setIsPreviewOpen(false);
        }, 100);
      }, 250);
    }, 100);
  };

  // Handle download CSV
  const handleDownloadCSV = (item: KuitansiItem) => {
    try {
      const headers = Object.keys(item);
      const values = Object.values(item).map(v => {
        const str = (v || '').toString();
        return `"${str.replace(/"/g, '""')}"`;
      });
      
      const csvContent = [
        headers.join(","),
        values.join(",")
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Kuitansi_${item.no_kuitansi || item.nomor || 'nota'}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("File CSV berhasil diunduh");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Gagal mengunduh file CSV.");
    }
  };

  // Not authorized
  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  // No sheet ID configured
  if (!loading && !sheetId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-yellow-200 p-8 max-w-md w-full shadow-sm">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">Konfigurasi Diperlukan</h1>
          <p className="text-gray-600">
            Sheet ID kuitansi belum dikonfigurasi di kolom X (satker_config) untuk satker 3210. Hubungi administrator.
          </p>
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
          <p className="text-gray-600">Pilih kuitansi untuk dicetak (PPK Satker 3210)</p>
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
                      {/* Tampilkan 6 kolom pertama */}
                      {kuitansiData.length > 0 && 
                        Object.keys(kuitansiData[0])
                          .slice(0, 6)
                          .map(key => (
                            <TableHead key={key} className="capitalize text-xs">
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </TableHead>
                          ))
                      }
                      <TableHead className="w-[200px] text-center text-xs">AKSI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, index) => (
                      <TableRow key={index} className="text-sm">
                        {Object.entries(item)
                          .slice(0, 6)
                          .map(([key, value]) => (
                            <TableCell key={key} className="text-xs">
                              {value?.toString() || '-'}
                            </TableCell>
                          ))
                        }
                        <TableCell className="text-xs space-x-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handlePrint(item)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            Cetak
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadCSV(item)}
                          >
                            <Download className="h-3 w-3 mr-1" />
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

      {/* Hidden Preview for Print */}
      {selectedItem && isPreviewOpen && (
        <div ref={printRef} style={{ display: 'none' }}>
          <KuitansiPreview item={selectedItem} />
        </div>
      )}
    </div>
  );
};

// Component untuk preview kuitansi
const KuitansiPreview: React.FC<{ item: KuitansiItem }> = ({ item }) => {
  const keys = Object.keys(item).slice(0, 20); // Tampilkan 20 kolom pertama
  
  return (
    <div className="kuitansi-preview">
      <div className="header">
        <h1>KUITANSI / NOTA</h1>
        <p>Nomor: {item.no_kuitansi || item.nomor || '-'}</p>
      </div>
      
      <div className="content">
        {keys.map((key, idx) => (
          <div key={idx} className="row">
            <div className="label">{key.replace(/_/g, ' ').toUpperCase()}:</div>
            <div className="value">{item[key]?.toString() || '-'}</div>
          </div>
        ))}
      </div>
      
      <div className="divider"></div>
      
      <div className="footer">
        <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        <p>Satker 3210 - PPK</p>
      </div>
    </div>
  );
};

export default CetakKuitansi;
