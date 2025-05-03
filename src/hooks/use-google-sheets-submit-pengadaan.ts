
import { useMutation } from "@tanstack/react-query";
import { GoogleSheetsService } from "@/components/GoogleSheetsService";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface SubmitToSheetsOptions {
  onSuccess?: () => void;
}

export const useSubmitToPengadaanSheets = ({ onSuccess }: SubmitToSheetsOptions) => {
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        // Generate a document ID specifically for DokumenPengadaan
        const documentId = await GoogleSheetsService.generateDocumentId("DokumenPengadaan");
        
        // Format the data for DokumenPengadaan
        const rowData = formatDokumenPengadaanData(documentId, data);
        
        // Append to Google Sheets
        const response = await GoogleSheetsService.appendData({
          sheetName: "DokumenPengadaan",
          range: "A1", // Start from the first cell
          values: [rowData] // Add as a single row
        });
        
        console.log(`Data successfully saved to DokumenPengadaan sheet:`, response);
        
        return { success: true, documentId };
      } catch (error: any) {
        console.error(`Error submitting DokumenPengadaan to Google Sheets:`, error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Data berhasil disimpan",
        description: `ID dokumen: ${data.documentId}`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message,
      });
    }
  });
};

// Helper function to format Dokumen Pengadaan data
function formatDokumenPengadaanData(documentId: string, data: any): any[] {
  const row: any[] = [
    documentId,                                // ID
    data.kodeKegiatan || "",                   // Kode Kegiatan
    data.namaPaket || "",                      // Nama Paket Pengadaan
    formatDate(data.tanggalMulai),             // Tanggal Mulai Pelaksanaan
    formatDate(data.tanggalSelesai),           // Tanggal Selesai Pelaksanaan
    data.spesifikasiTeknis || "",              // Spesifikasi Teknis
    data.volume || "",                         // Volume
    data.satuan || "",                         // Satuan
    data.hargaSatuanAwal || "",                // Harga Satuan Awal
    data.hargaSatuanSetelahNego || "",         // Harga Satuan Setelah Nego
    data.metodePengadaan || "",                // Metode Pengadaan
    data.bentukKontrak || "",                  // Bentuk/Bukti Kontrak
    data.jenisKontrak || "",                   // Jenis Kontrak
    data.caraPembayaran || "",                 // Cara Pembayaran
    data.uangMuka || "",                       // Uang Muka
    data.nomorFormulirPermintaan || "",        // Nomor Formulir Permintaan
    formatDate(data.tanggalFormulirPermintaan),// Tanggal Formulir Permintaan
    formatDate(data.tanggalKak),               // Tanggal Kerangka Acuan Kerja (KAK)
    data.nomorKertasKerjaHPS || "",            // Nomor Kertas Kerja Penyusunan HPS
    data.namaPenyedia || "",                   // Nama Penyedia Barang/Jasa
    data.namaPerwakilan || "",                 // Nama Perwakilan Penyedia
    data.jabatan || "",                        // Jabatan
    data.alamatPenyedia || "",                 // Alamat Penyedia
    data.namaBank || "",                       // Nama Bank
    data.nomorRekening || "",                  // Nomor Rekening
    data.atasNamaRekening || "",               // Atas Nama Rekening
    data.npwpPenyedia || "",                   // NPWP Penyedia
    data.nomorSuratPenawaranHarga || "",       // Nomor Surat Penawaran Harga
    data.nomorSuratPermintaanPembayaran || "", // Nomor Surat Permohonan Pembayaran
    data.nomorInvoice || ""                    // Nomor Invoice Pembayaran
  ];

  return row;
}

// Helper function to format date values
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    return format(new Date(date), "yyyy-MM-dd");
  } catch {
    return "";
  }
}
