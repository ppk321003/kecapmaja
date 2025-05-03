
import { useMutation } from "@tanstack/react-query";
import { GoogleSheetsService } from "@/components/GoogleSheetsService";
import { toast } from "@/components/ui/use-toast";

interface SubmitToSheetsOptions {
  documentType: string;
  onSuccess?: () => void;
}

export const useSubmitToSheets = ({ documentType, onSuccess }: SubmitToSheetsOptions) => {
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        // Generate a document ID
        const documentId = await GoogleSheetsService.generateDocumentId(documentType);
        
        // Prepare the row data based on the document type and form data
        let rowData: any[] = [];
        
        // First item is always the document ID
        rowData.push(documentId);
        
        switch (documentType) {
          case "TandaTerima":
            // Format data according to the Tanda Terima spreadsheet structure
            rowData = formatTandaTerimaData(documentId, data);
            break;
          // Add cases for other document types as needed
          default:
            throw new Error(`Unsupported document type: ${documentType}`);
        }
        
        // Append to Google Sheets
        await GoogleSheetsService.appendData({
          sheetName: documentType,
          range: "A1", // Start from the first cell
          values: [rowData] // Add as a single row
        });
        
        return { success: true, documentId };
      } catch (error: any) {
        console.error(`Error submitting ${documentType} to Google Sheets:`, error);
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

// Helper function to format Tanda Terima data
function formatTandaTerimaData(documentId: string, data: any): any[] {
  const row: any[] = [
    documentId,                   // ID
    data.namaKegiatan || "",      // Nama Kegiatan
    data.detail || "",            // Detail Kegiatan
    data.tanggalPembuatanDaftar || "", // Tanggal Pembuatan Daftar
    data.pembuatDaftar || "",     // Pembuat Daftar
  ];

  // Add Organik BPS data
  const organikIds = data.organikBPS || [];
  row.push(organikIds.join(", ")); // Organik BPS

  // Add NIP BPS (empty for now, would need to fetch from database)
  row.push(""); // NIP BPS

  // Add Mitra Statistik data
  const mitraIds = data.mitraStatistik || [];
  row.push(mitraIds.join(", ")); // Mitra Statistik

  // Add NIK Mitra Statistik (empty for now, would need to fetch from database)
  row.push(""); // NIK Mitra Statistik

  // Add items (up to 15)
  const items = data.daftarItem || [];
  for (let i = 0; i < 15; i++) {
    const item = items[i] || {};
    row.push(item.namaItem || ""); // Nama Item
    row.push(item.banyaknya || ""); // Banyaknya
    row.push(item.satuan || ""); // Satuan
  }

  return row;
}
