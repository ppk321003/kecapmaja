import { useQuery } from "@tanstack/react-query";
import { readSheetValues } from "@/lib/sheets-read";

interface UseDocumentDataProps {
  sheetId: string;
  sheetName: string;
}

export function useDocumentData({ sheetId, sheetName }: UseDocumentDataProps) {
  return useQuery({
    queryKey: ["document-data", sheetId, sheetName],
    queryFn: async () => {
      // Dibaca langsung dari Google Sheets (tanpa Supabase)
      const data = await readSheetValues({
        spreadsheetId: sheetId,
        range: sheetName,
      });

      const rows = data?.values || [];
      if (rows.length <= 1) return [];

      const headers = rows[0];
      const items = rows.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || "";
        });

        // Fallback untuk sheet yang menyimpan tanggal pengajuan pada kolom L
        // tanpa memiliki header yang sesuai dengan key yang digunakan UI.
        const tanggalPengajuan = obj["Tanggal Pengajuan"] || obj["Tanggal pengajuan"] || row[11];
        if (tanggalPengajuan) {
          obj["Tanggal Pengajuan"] = tanggalPengajuan;
        }

        // Lembur menggunakan kolom D sebagai tanggal surat tugas lembur,
        // sedangkan header sel tersebut tidak memiliki label.
        if (sheetName === "Lembur") {
          const tanggalSuratTugasLembur = obj["Tanggal Surat Tugas Lembur"] || row[3];
          if (tanggalSuratTugasLembur) {
            obj["Tanggal Surat Tugas Lembur"] = tanggalSuratTugasLembur;
          }
        }

        // Surat Keputusan menyimpan nomor SK pada kolom C dengan header no_sk.
        if (sheetName === "SuratKeputusan") {
          const nomorSk = obj["no_sk"] || obj["Nomor SK"] || row[2];
          if (nomorSk) {
            obj["no_sk"] = nomorSk;
          }
        }

        return obj;
      });

      // Remove duplicate IDs - keep only the first occurrence
      const seenIds = new Set<string>();
      return items.filter((item: any) => {
        const id = item.Id || item.id;
        if (!id) return true; // Keep items without ID
        
        const idStr = String(id).trim();
        if (seenIds.has(idStr)) {
          return false; // Skip duplicate
        }
        
        seenIds.add(idStr);
        return true; // Keep first occurrence
      });
    },
    refetchOnWindowFocus: false,
    staleTime: 60000,
  });
}
