/**
 * Service untuk komunikasi antara Web App dan Google Sheets
 * Memanggil Supabase Edge Function: pulsa-sheets-bridge
 * 
 * Data flow:
 * UI Form → Service API Call → Edge Function → Google Sheets API → Google Sheets
 */

const EDGE_FUNCTION_URL =
  import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL || 
  "http://localhost:54321/functions/v1/pulsa-sheets-bridge"; // Development/Production

export interface PulsaData {
  bulan: number;
  tahun: number;
  namaPetugas: string;
  nip: string;
  kegiatan: string; // Free text input dari UI (bukan dropdown)
  organik: string; // List: Fungsi Sosial / Neraca / Produksi / Distribusi / IPDS
  mitra?: string; // Optional: nama mitra dari UI
  nominal: number;
  keterangan?: string;
}

export interface PulsaResponse {
  success: boolean;
  message: string;
  rowNumber?: number;
}

/**
 * Tambah data pulsa baru
 * Data akan disimpan ke Google Sheets sebagai draft
 */
export async function tambahPulsaBulanan(
  data: PulsaData
): Promise<PulsaResponse> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}?action=tambah`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending pulsa data:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Submit data untuk approval PPK
 * Mengubah status dari "draft" menjadi "pending"
 */
export async function submitPulsaUntukApproval(
  rowNumber: number
): Promise<PulsaResponse> {
  try {
    const response = await fetch(
      `${EDGE_FUNCTION_URL}?action=submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rowNumber }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error submitting pulsa:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Approve data pulsa (PPK action)
 * Mengubah status dari "pending" menjadi "approved"
 */
export async function approvePulsa(
  rowNumber: number,
  approvedBy: string
): Promise<PulsaResponse> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}?action=approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rowNumber, approvedBy }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error approving pulsa:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
