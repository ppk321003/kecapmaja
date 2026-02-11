import React, { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKuitansi } from "@/contexts/KuitansiContext";
import { useKuitansiStore } from "@/contexts/KuitansiStoreContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash, Download, Printer, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const DetailKuitansiPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getKuitansi, deleteKuitansi } = useKuitansi();
  const { storeProfile } = useKuitansiStore();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const kuitansi = getKuitansi(id || "");

  if (!kuitansi) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg border p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Kuitansi Tidak Ditemukan
          </h1>
          <Button onClick={() => navigate("/cetak-kuitansi")} className="w-full">
            Kembali ke Daftar
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    const receiptContent = receiptRef.current;
    if (!receiptContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up diblokir. Harap aktifkan pop-up untuk mencetak.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Kuitansi ${kuitansi.no_kuitansi}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              margin: 0; 
              padding: 20px; 
              background-color: #ffffff;
            }
            .receipt-container { 
              width: 210mm; 
              margin: 0 auto; 
              padding: 10px;
              border: 1px solid #ccc;
            }
            .receipt-header { 
              text-align: center; 
              margin-bottom: 10px; 
              border-bottom: 1px dashed #000;
              padding-bottom: 8px;
            }
            .receipt-logo {
              max-width: 100px;
              height: auto;
              margin-bottom: 8px;
            }
            .receipt-title { 
              font-weight: bold; 
              font-size: 14px;
              margin-bottom: 4px;
            }
            .receipt-divider { 
              border-top: 1px dashed #000; 
              margin: 8px 0; 
            }
            .receipt-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
            }
            .receipt-label {
              font-weight: bold;
            }
            .receipt-total { 
              font-weight: bold; 
              margin-top: 8px; 
              font-size: 14px;
            }
            .receipt-footer { 
              text-align: center; 
              margin-top: 15px; 
              font-size: 10px;
              border-top: 1px dashed #000;
              padding-top: 8px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .receipt-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-header">
              <img src="/lovable-uploads/fbf25b87-5923-42c4-a574-1fc45fe58e7c.png" alt="Logo" class="receipt-logo">
              <div class="receipt-title">KUITANSI/NOTA</div>
              <div class="text-sm font-semibold">${storeProfile.storageName}</div>
              <div class="text-xs text-gray-700">${storeProfile.storeAddress}</div>
              <div class="text-xs text-gray-700">${storeProfile.storePhone}</div>
            </div>
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-row">
              <span class="receipt-label">No. Kuitansi:</span>
              <span>${kuitansi.no_kuitansi || "-"}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Tanggal:</span>
              <span>${kuitansi.tanggal || "-"}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Penerima:</span>
              <span>${kuitansi.penerima || "-"}</span>
            </div>
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-row">
              <span class="receipt-label">Jumlah:</span>
              <span>${kuitansi.jumlah || "-"}</span>
            </div>
            
            ${kuitansi.keterangan ? `<div class="receipt-row">
              <span class="receipt-label">Keterangan:</span>
              <span>${kuitansi.keterangan}</span>
            </div>` : ""}
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-footer">
              <p>${storeProfile.storeFooter || "Terima kasih atas kepercayaan Anda"}</p>
              <p>${new Date().toLocaleDateString("id-ID")}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const element = receiptRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Kuitansi_${kuitansi.no_kuitansi}.pdf`);

      toast.success("File PDF berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal mengunduh file PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    try {
      const headers = Object.keys(kuitansi);
      const values = Object.values(kuitansi).map((v) => {
        const str = (v || "").toString();
        return `"${str.replace(/"/g, '""')}"`;
      });

      const csvContent = [headers.join(","), values.join(",")].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Kuitansi_${kuitansi.no_kuitansi}.csv`);
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

  const handleDelete = async () => {
    try {
      await deleteKuitansi(id || "");
      setIsDeleteDialogOpen(false);
      setTimeout(() => navigate("/cetak-kuitansi"), 1000);
    } catch (error) {
      console.error("Error deleting kuitansi:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/cetak-kuitansi")}
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Detail Kuitansi
              </h1>
              <p className="text-gray-600">No: {kuitansi.no_kuitansi}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Cetak
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isGeneratingPDF ? "Membuat..." : "PDF"}
            </Button>
            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => navigate(`/edit-kuitansi/${id}`)}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash className="h-4 w-4" />
                  Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Kuitansi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus kuitansi ini? Tindakan
                    ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600">
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-lg border shadow-sm p-8">
          <div
            ref={receiptRef}
            className="max-w-full bg-white p-8 border border-gray-300 rounded"
          >
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
              <img
                src="/lovable-uploads/fbf25b87-5923-42c4-a574-1fc45fe58e7c.png"
                alt="Logo"
                className="h-16 mx-auto mb-2"
              />
              <h2 className="text-xl font-bold">KUITANSI/NOTA</h2>
              <p className="text-sm font-semibold text-gray-800">{storeProfile.storageName}</p>
              <p className="text-xs text-gray-600">{storeProfile.storeAddress}</p>
              <p className="text-xs text-gray-600">{storeProfile.storePhone}</p>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">No. Kuitansi:</span>
                <span>{kuitansi.no_kuitansi || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Tanggal:</span>
                <span>{kuitansi.tanggal || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Penerima:</span>
                <span>{kuitansi.penerima || "-"}</span>
              </div>
            </div>

            <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-4 mb-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Jumlah:</span>
                <span>{kuitansi.jumlah || "-"}</span>
              </div>
            </div>

            {kuitansi.keterangan && (
              <div className="mb-4 text-sm">
                <span className="font-semibold">Keterangan:</span>
                <p className="mt-1 text-gray-700">{kuitansi.keterangan}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t-2 border-dashed border-gray-400 pt-4 text-center text-xs text-gray-600">
              <p className="font-semibold">{storeProfile.storeFooter || "Terima kasih atas kepercayaan Anda"}</p>
              <p>{new Date().toLocaleDateString("id-ID")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailKuitansiPage;
