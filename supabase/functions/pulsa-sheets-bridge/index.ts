/**
 * BRIDGE: Google Sheets Integration untuk Manajemen Pulsa
 * 
 * Flow:
 * 1. User input di Web App (React UI)
 * 2. Data dikirim ke Supabase Edge Function
 * 3. Edge Function save ke Google Sheets via Google Sheets API
 * 4. Return response ke Web App
 * 
 * File ini untuk di-deploy di Supabase Edge Functions
 */

// @ts-nocheck
// Deno runtime - TypeScript checks disabled for Deno environment

import { serve } from "std/http/server.ts";
import { SignJWT } from "jose";

// ==================== CONFIG ====================

const GOOGLE_SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";
const SHEET_ID = Deno.env.get("GOOGLE_SHEETS_ID") || "your-sheet-id-here";
const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT") || "{}";
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);

// Sheet ranges (sesuaikan dengan nama sheet di Sheets)
const RANGES = {
  PULSA_BULANAN: "Sheet1!A:N", // Nama sheet: Sheet1 atau sesuaikan
  MASTER_PETUGAS: "MASTER-PETUGAS!A:I",
  MASTER_KEGIATAN: "MASTER-KEGIATAN!A:G",
  MASTER_ORGANIK: "MASTER.ORGANIK!A:D", // Reference untuk organik
  MASTER_MITRA: "MASTER.MITRA!A:D", // Reference untuk mitra
  LAPORAN_PULSA: "LAPORAN-PULSA!A:I",
  AUDIT_DUPLIKASI: "AUDIT-DUPLIKASI!A:H",
};

// ==================== JWT TOKEN ====================

async function getGoogleAccessToken(): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: GOOGLE_SERVICE_ACCOUNT.client_email,
    sub: GOOGLE_SERVICE_ACCOUNT.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const privateKeyStr = GOOGLE_SERVICE_ACCOUNT.private_key as string;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(privateKeyStr),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign JWT
  const jwt = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader(header)
    .sign(key);

  // Exchange for access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json() as Record<string, unknown>;
  return data.access_token as string;
}

// ==================== READ FROM SHEETS ====================

async function readFromSheet(range: string, accessToken: string): Promise<string[][]> {
  const url = `${GOOGLE_SHEETS_API_URL}/${SHEET_ID}/values/${range}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json() as Record<string, unknown>;
  return (data.values as string[][]) || [];
}

// ==================== APPEND TO SHEET ====================

async function appendToSheet(range: string, values: unknown[], accessToken: string): Promise<Record<string, unknown>> {
  const url = `${GOOGLE_SHEETS_API_URL}/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  const data = await response.json() as Record<string, unknown>;
  return data;
}

// ==================== UPDATE CELL ====================

async function updateCell(range: string, value: unknown, accessToken: string): Promise<Record<string, unknown>> {
  const url = `${GOOGLE_SHEETS_API_URL}/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [[value]],
    }),
  });

  const data = await response.json() as Record<string, unknown>;
  return data;
}

// ==================== VALIDATE DUPLIKASI ====================

async function validatePulsaDuplikasi(
  bulan: number,
  tahun: number,
  namaPetugas: string,
  kegiatanBaru: string,
  accessToken: string
): Promise<{ valid: boolean; message?: string }> {
  const data = await readFromSheet(RANGES.PULSA_BULANAN, accessToken);

  // Skip header (row 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Format: No, Bulan, Tahun, Nama, NIP, Kegiatan, Organik, Mitra, Nominal, Status...
    const bulanRow = Number(row[1]);
    const tahunRow = Number(row[2]);
    const namaRow = row[3];
    const kegiatanRow = row[5];
    const statusRow = row[9];

    // Hanya check data yang already approved/completed
    if (
      Number(bulanRow) === bulan &&
      Number(tahunRow) === tahun &&
      namaRow === namaPetugas &&
      (statusRow === "approved" || statusRow === "completed")
    ) {
      if (kegiatanRow && kegiatanRow !== kegiatanBaru) {
        return {
          valid: false,
          message: `⚠️ ${namaPetugas} sudah mendapat pulsa untuk kegiatan: ${kegiatanRow}\n` +
                   `Petugas tidak boleh mendapat pulsa dari lebih dari 1 kegiatan dalam bulan ${bulan}/${tahun}.`,
        };
      }
    }
  }

  return { valid: true };
}

// ==================== TAMBAH PULSA ====================

async function tambahPulsaBulanan(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json() as Record<string, unknown>;
    const {
      bulan,
      tahun,
      namaPetugas,
      nip,
      kegiatan,
      organik,
      mitra,
      nominal,
      keterangan,
    } = body;

    // Validasi
    if (!bulan || !tahun || !namaPetugas || !kegiatan || !organik || !nominal) {
      return {
        success: false,
        message: "Field wajib tidak boleh kosong: bulan, tahun, nama, kegiatan, organik, nominal",
      };
    }

    if ((nominal as number) <= 0) {
      return {
        success: false,
        message: "Nominal harus lebih dari 0",
      };
    }

    // Get access token
    const accessToken = await getGoogleAccessToken();

    // Validasi duplikasi
    const validasi = await validatePulsaDuplikasi(
      bulan as number,
      tahun as number,
      namaPetugas as string,
      kegiatan as string,
      accessToken
    );

    if (!validasi.valid) {
      return {
        success: false,
        message: validasi.message,
      };
    }

    // Get all data to find next No
    const allData = await readFromSheet(RANGES.PULSA_BULANAN, accessToken);
    const nextNo = allData.length; // Row number

    // Prepare new row
    const newRow = [
      nextNo,
      bulan,
      tahun,
      namaPetugas,
      nip || "",
      kegiatan,
      organik,
      mitra || "",
      nominal,
      "draft", // status
      keterangan || "",
      new Date().toLocaleString("id-ID"),
      "", // disetujui oleh
      "", // tanggal approval
    ];

    // Append to sheet
    await appendToSheet(
      RANGES.PULSA_BULANAN,
      newRow,
      accessToken
    );

    // Update laporan
    await updateLaporanPulsa(tahun as number, bulan as number, accessToken);

    return {
      success: true,
      message: `✅ Data pulsa untuk "${namaPetugas}" sudah disimpan sebagai draft.`,
      rowNumber: nextNo,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== SUBMIT UNTUK APPROVAL ====================

async function submitPulsaUntukApproval(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { rowNumber } = body;

    const accessToken = await getGoogleAccessToken();

    // Update status to "pending"
    // Row number + 1 (header di row 1) = rowNumber+1
    // Column J (10th column) = Status
    const cellRange = `PULSA-BULANAN!J${(rowNumber as number) + 1}`;
    await updateCell(cellRange, "pending", accessToken);

    return {
      success: true,
      message: "✅ Data sudah dikirim untuk approval PPK",
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== ROLE VALIDATION ====================

function validateRole(role: string, requiredRole: string): { valid: boolean; message?: string } {
  if (!role) {
    return {
      valid: false,
      message: "❌ Role tidak ditemukan. Silakan login kembali.",
    };
  }

  if (role !== requiredRole) {
    return {
      valid: false,
      message: `❌ Akses ditolak. Hanya ${requiredRole} yang bisa melakukan aksi ini.`,
    };
  }

  return { valid: true };
}

// ==================== APPROVE DATA ====================

async function approvePulsa(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { rowNumber, approvedBy, role } = body;

    // Validate role - only PPK can approve
    const roleCheck = validateRole(role as string, "PPK");
    if (!roleCheck.valid) {
      return roleCheck;
    }

    const accessToken = await getGoogleAccessToken();

    // Update status to "approved"
    const statusCell = `PULSA-BULANAN!J${(rowNumber as number) + 1}`;
    await updateCell(statusCell, "approved", accessToken);

    // Update approved by
    const approverCell = `PULSA-BULANAN!M${(rowNumber as number) + 1}`;
    await updateCell(approverCell, approvedBy || "Unknown", accessToken);

    // Update approval date
    const dateCell = `PULSA-BULANAN!N${(rowNumber as number) + 1}`;
    await updateCell(dateCell, new Date().toLocaleString("id-ID"), accessToken);

    // Update laporan
    await updateLaporanPulsaFromPendingRow(rowNumber as number, accessToken);

    return {
      success: true,
      message: "✅ Data pulsa sudah disetujui oleh PPK",
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== REJECT DATA ====================

async function rejectPulsa(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { rowNumber, approvedBy, rejectionReason, role } = body;

    // Validate role - only PPK can reject
    const roleCheck = validateRole(role as string, "PPK");
    if (!roleCheck.valid) {
      return roleCheck;
    }

    const accessToken = await getGoogleAccessToken();

    // Update status to "rejected"
    const statusCell = `PULSA-BULANAN!J${(rowNumber as number) + 1}`;
    await updateCell(statusCell, "rejected", accessToken);

    // Update approved by (track who rejected it)
    const approverCell = `PULSA-BULANAN!M${(rowNumber as number) + 1}`;
    await updateCell(approverCell, `DITOLAK oleh ${approvedBy || "Unknown"}`, accessToken);

    // Update approval date
    const dateCell = `PULSA-BULANAN!N${(rowNumber as number) + 1}`;
    await updateCell(dateCell, new Date().toLocaleString("id-ID"), accessToken);

    // Update or add rejection reason in keterangan (column L, 12)
    const keteranganCell = `PULSA-BULANAN!L${(rowNumber as number) + 1}`;
    const reasonText = `[DITOLAK] ${rejectionReason || "Tidak sesuai kriteria"}`;
    await updateCell(keteranganCell, reasonText, accessToken);

    return {
      success: true,
      message: `✅ Data pulsa ditolak oleh PPK. Alasan: ${rejectionReason || "Tidak sesuai kriteria"}`,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== UPDATE LAPORAN (Single Row) ====================

async function updateLaporanPulsaFromPendingRow(rowNumber: number, accessToken: string): Promise<{ success: boolean }> {
  try {
    // Read the row that was just approved
    const allData = await readFromSheet(RANGES.PULSA_BULANAN, accessToken);
    
    if (rowNumber >= allData.length) {
      return { success: false };
    }

    const row = allData[rowNumber];
    const bulan = Number(row[1]);
    const tahun = Number(row[2]);

    // Recalculate laporan for this month/year
    await updateLaporanPulsa(tahun, bulan, accessToken);
    return { success: true };
  } catch (error) {
    console.error("Error updating laporan from row:", error);
    return { success: false };
  }
}

// ==================== UPDATE LAPORAN ====================

async function updateLaporanPulsa(tahun: number, bulan: number, accessToken: string): Promise<{ success: boolean }> {
  try {
    const allData = await readFromSheet(RANGES.PULSA_BULANAN, accessToken);

    let totalPetugas = 0;
    let totalNominal = 0;
    let totalApproved = 0;
    let totalPending = 0;
    let totalDraft = 0;
    const kegiatanMap: Record<string, number> = {};
    const organikMap: Record<string, number> = {};
    const petugasSet = new Set<string>();

    // Process data
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const bulanRow = Number(row[1]);
      const tahunRow = Number(row[2]);
      const nama = row[3];
      const kegiatan = row[5];
      const organik = row[6];
      const nominal = Number(row[8]);
      const status = row[9];

      // Filter by bulan & tahun
      if (bulanRow !== bulan || tahunRow !== tahun) continue;

      // Count status
      if (status === "approved" || status === "completed") {
        totalApproved += nominal;
      } else if (status === "pending") {
        totalPending += nominal;
      } else if (status === "draft") {
        totalDraft += nominal;
      }

      // Count petugas & nominal
      if (status === "approved" || status === "completed") {
        petugasSet.add(nama);
        totalNominal += nominal;

        // By kegiatan
        kegiatanMap[kegiatan] = (kegiatanMap[kegiatan] || 0) + nominal;

        // By organik
        organikMap[organik] = (organikMap[organik] || 0) + nominal;
      }
    }

    totalPetugas = petugasSet.size;

    // Format laporan
    const kegiatanDetail = Object.entries(kegiatanMap)
      .map(([k, v]) => `${k}: Rp ${(v as number).toLocaleString("id-ID")}`)
      .join(" | ");
    const organikDetail = Object.entries(organikMap)
      .map(([k, v]) => `${k}: Rp ${(v as number).toLocaleString("id-ID")}`)
      .join(" | ");

    const laporanRow = [
      bulan,
      tahun,
      totalPetugas,
      totalNominal,
      kegiatanDetail,
      organikDetail,
      totalApproved,
      totalPending,
      totalDraft,
    ];

    // Find or add row in LAPORAN
    const laporanData = await readFromSheet(RANGES.LAPORAN_PULSA, accessToken);
    let rowToUpdate = -1;

    for (let i = 1; i < laporanData.length; i++) {
      if (
        Number(laporanData[i][0]) === bulan &&
        Number(laporanData[i][1]) === tahun
      ) {
        rowToUpdate = i + 1;
        break;
      }
    }

    if (rowToUpdate > 0) {
      // Update existing
      await appendToSheet(RANGES.LAPORAN_PULSA, laporanRow, accessToken);
    } else {
      // Append new
      await appendToSheet(RANGES.LAPORAN_PULSA, laporanRow, accessToken);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating laporan:", error);
    return { success: false };
  }
}

// ==================== MAIN HANDLER ====================

serve(async (req: Request) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  let response: Record<string, unknown>;

  if (action === "tambah") {
    response = await tambahPulsaBulanan(req);
  } else if (action === "submit") {
    response = await submitPulsaUntukApproval(req);
  } else if (action === "approve") {
    response = await approvePulsa(req);
  } else if (action === "reject") {
    response = await rejectPulsa(req);
  } else {
    response = { error: "Unknown action" };
  }

  return new Response(JSON.stringify(response), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
