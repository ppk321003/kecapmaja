// deno-lint-ignore-file
// This is a Deno Edge Function - ignore TypeScript/Node.js type checking
// @ts-ignore - Deno std library
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default SPREADSHEET_ID (fallback untuk 3210)
const DEFAULT_SPREADSHEET_ID = '1hnNCHxmQQ5rjVcxIBvJk5lEdZ8aki4YUMBi1s33cnGI';
const SHEET_NAME = 'data';

// Master Config Spreadsheet untuk multi-satker
const MASTER_CONFIG_SPREADSHEET_ID = '1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ';
const MASTER_CONFIG_SHEET_NAME = 'satker_config';

async function getAccessToken() {
  console.log('Getting access token for pencairan-update...');
  
  let privateKey: string;
  let serviceAccountEmail: string;
  
  // @ts-ignore - Deno runtime API
  const googlePrivateKeyEnv = Deno.env.get('GOOGLE_PRIVATE_KEY');
  // @ts-ignore - Deno runtime API
  const googleServiceAccountEmailEnv = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  
  try {
    if (googlePrivateKeyEnv?.includes('"type"')) {
      const serviceAccount = JSON.parse(googlePrivateKeyEnv);
      privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      serviceAccountEmail = serviceAccount.client_email;
    } else if (googleServiceAccountEmailEnv?.includes('"type"')) {
      const serviceAccount = JSON.parse(googleServiceAccountEmailEnv);
      privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      serviceAccountEmail = serviceAccount.client_email;
    } else {
      privateKey = googlePrivateKeyEnv?.replace(/\\n/g, '\n') || '';
      serviceAccountEmail = googleServiceAccountEmailEnv || '';
    }
  } catch (e) {
    console.error('Error parsing credentials:', e);
    privateKey = googlePrivateKeyEnv?.replace(/\\n/g, '\n') || '';
    serviceAccountEmail = googleServiceAccountEmailEnv || '';
  }

  if (!privateKey || !serviceAccountEmail) {
    throw new Error('Missing Google credentials');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsignedToken));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${unsignedToken}.${encodedSignature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  
  return tokenData.access_token;
}

// Fungsi untuk mendapatkan pencairan_sheet_id berdasarkan satker dari Master Config
async function getPencairanSheetIdBySatker(accessToken: string, satker: string): Promise<string> {
  try {
    console.log(`[getPencairanSheetIdBySatker] Looking up satker: ${satker}`);
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${MASTER_CONFIG_SPREADSHEET_ID}/values/${MASTER_CONFIG_SHEET_NAME}!A:F`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.warn(`[getPencairanSheetIdBySatker] Failed to fetch master config (${response.status}), using default sheet ID`);
      return DEFAULT_SPREADSHEET_ID;
    }

    const data = await response.json();
    const rows = data.values || [];
    
    console.log(`[getPencairanSheetIdBySatker] Master config loaded, rows count: ${rows.length}`);

    if (rows.length <= 1) {
      console.warn('[getPencairanSheetIdBySatker] No config data found, using default sheet ID');
      return DEFAULT_SPREADSHEET_ID;
    }

    // Cari row dengan satker_id matching
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowSatker = row[0]?.trim();
      console.log(`[getPencairanSheetIdBySatker] Checking row ${i}: satker_id="${rowSatker}"`);
      
      if (rowSatker === satker?.trim()) {
        const pencairanSheetId = row[2]?.trim(); // Column C (index 2) = pencairan_sheet_id
        if (pencairanSheetId) {
          console.log(`[getPencairanSheetIdBySatker] ✓ Found pencairan sheet ID for satker ${satker}: ${pencairanSheetId}`);
          return pencairanSheetId;
        } else {
          console.warn(`[getPencairanSheetIdBySatker] Row found but pencairan_sheet_id is empty at row ${i}`);
        }
      }
    }

    console.warn(`[getPencairanSheetIdBySatker] Satker ${satker} not found in config, using default sheet ID`);
    return DEFAULT_SPREADSHEET_ID;
  } catch (error) {
    console.error('Error fetching pencairan sheet ID by satker:', error);
    return DEFAULT_SPREADSHEET_ID;
  }
}

// Fungsi untuk mendapatkan waktu Jakarta (WIB)
function formatDateTime(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  };
  
  const formatter = new Intl.DateTimeFormat('id-ID', options);
  const parts = formatter.formatToParts(now);
  
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const hours = getPart('hour').padStart(2, '0');
  const minutes = getPart('minute').padStart(2, '0');
  const day = getPart('day').padStart(2, '0');
  const month = getPart('month').padStart(2, '0');
  const year = getPart('year');
  
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

serve(async (req: Request) => {
  console.log('pencairan-update function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { id, status, notes, actor, action, uraianPengajuan, namaPengaju, jenisPengajuan, kelengkapan, satker, pembayaran, nomorSPM, nomorSPPD } = body;
    
    if (!id) {
      throw new Error('ID is required');
    }

    const accessToken = await getAccessToken();
    
    // Dapatkan correct spreadsheet ID berdasarkan satker
    const spreadsheetId = satker 
      ? await getPencairanSheetIdBySatker(accessToken, satker)
      : DEFAULT_SPREADSHEET_ID;
    
    console.log('[pencairan-update] Using spreadsheetId:', { satker, spreadsheetId, isDefault: spreadsheetId === DEFAULT_SPREADSHEET_ID });
    
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    
    // Baca 21 kolom (A:U) - dengan Pembayaran, SPM, SPPD
    const readResponse = await fetch(`${baseUrl}/values/${SHEET_NAME}!A:U`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const readData = await readResponse.json();
    const rows = readData.values || [];
    
    // Find the row with matching ID
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === id) {
        rowIndex = i + 1; // 1-based index for Sheets API
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error(`Submission with ID ${id} not found`);
    }

    const currentRow = rows[rowIndex - 1];
    const updatedAt = formatDateTime();
    
    // Default values from current row - Struktur kolom yang benar:
    // A: ID, B: Uraian, C: Nama, D: Jenis, E: Kelengkapan, F: Catatan, G: Status Pengajuan
    // H: Waktu Pengajuan, I: Waktu Bendahara, J: Waktu PPK, K: Waktu PPSPM, L: Waktu Arsip
    // M: Status Bendahara, N: Status PPK, O: Status PPSPM, P: Status Arsip, Q: Update terakhir
    // R: User, S: Pembayaran (UP/LS), T: Nomor SPM, U: Nomor SPPD
    let newTitle = currentRow[1] || '';           // B: Uraian Pengajuan
    let newSubmitterName = currentRow[2] || '';   // C: Nama Pengaju
    let newJenisBelanja = currentRow[3] || '';    // D: Jenis Pengajuan
    let newDocuments = currentRow[4] || '';       // E: Kelengkapan
    let newNotes = notes !== undefined ? notes : (currentRow[5] || ''); // F: Catatan
    let newStatus = status || currentRow[6] || ''; // G: Status Pengajuan
    
    // Ambil nilai sesuai struktur spreadsheet
    const waktuPengajuan = currentRow.length > 7 ? currentRow[7] || '' : ''; // H: Waktu Pengajuan
    const waktuBendahara = currentRow.length > 8 ? currentRow[8] || '' : ''; // I: Waktu Bendahara
    const waktuPpk = currentRow.length > 9 ? currentRow[9] || '' : '';       // J: Waktu PPK
    const waktuPPSPM = currentRow.length > 10 ? currentRow[10] || '' : '';   // K: Waktu PPSPM
    const waktuArsip = currentRow.length > 11 ? currentRow[11] || '' : '';   // L: Waktu Arsip
    const statusBendahara = currentRow.length > 12 ? currentRow[12] || '' : ''; // M: Status Bendahara
    const statusPpk = currentRow.length > 13 ? currentRow[13] || '' : '';    // N: Status PPK
    const statusPPSPM = currentRow.length > 14 ? currentRow[14] || '' : '';  // O: Status PPSPM
    const statusArsip = currentRow.length > 15 ? currentRow[15] || '' : '';  // P: Status Arsip
    const user = currentRow.length > 17 ? currentRow[17] || '' : '';         // R: User (index 17)
    const existingPembayaran = currentRow.length > 18 ? currentRow[18] || '' : ''; // S: Pembayaran (index 18)
    const existingNomorSPM = currentRow.length > 19 ? currentRow[19] || '' : '';   // T: Nomor SPM (index 19)
    const existingNomorSPPD = currentRow.length > 20 ? currentRow[20] || '' : '';  // U: Nomor SPPD (index 20)

    // Handle edit action from SM
    if (actor === 'sm' && action === 'edit') {
      if (uraianPengajuan) newTitle = uraianPengajuan;
      if (namaPengaju) newSubmitterName = namaPengaju;
      if (jenisPengajuan) newJenisBelanja = jenisPengajuan;
      if (kelengkapan !== undefined) newDocuments = kelengkapan;
      if (status) newStatus = status;
    }
    
    // Variables untuk update
    let updatedWaktuPengajuan = waktuPengajuan;
    let updatedWaktuBendahara = waktuBendahara;
    let updatedWaktuPpk = waktuPpk;
    let updatedWaktuPPSPM = waktuPPSPM;
    let updatedWaktuArsip = waktuArsip;
    let updatedStatusBendahara = statusBendahara;
    let updatedStatusPpk = statusPpk;
    let updatedStatusPPSPM = statusPPSPM;
    let updatedStatusArsip = statusArsip;
    let updatedPembayaran = existingPembayaran;
    let updatedNomorSPM = existingNomorSPM;
    let updatedNomorSPPD = existingNomorSPPD;
    
    // Handle checklist-only save (no status change)
    if (action === 'checklist') {
      // Just update the documents, status stays the same
      if (kelengkapan !== undefined) newDocuments = kelengkapan;
      // Don't change any status or waktu
    }
    // Handle approval/rejection actions sesuai alur baru: SM > BENDAHARA > PPK > PPSPM > ARSIP
    else if (actor === 'bendahara') {
      updatedWaktuBendahara = updatedAt;
      updatedStatusBendahara = action === 'approve' ? 'Disetujui' : 'Ditolak';
      
      // Handle pembayaran and nomorSPM for Bendahara
      if (pembayaran) updatedPembayaran = pembayaran;
      if (nomorSPM) updatedNomorSPM = nomorSPM;
      
      console.log(`[Bendahara] action=${action}, pembayaran=${pembayaran}, nomorSPM=${nomorSPM}`);
      
      if (action === 'approve') {
        newStatus = 'pending_ppk'; // Bendahara approve → ke PPK
        console.log(`[Bendahara] Setting status to pending_ppk`);
      } else if (action === 'reject') {
        newStatus = 'incomplete_sm'; // Bendahara reject → kembali ke SM
      } else if (action === 'save_spby') {
        // Keep current status, just save pembayaran and nomorSPM
        updatedPembayaran = pembayaran || updatedPembayaran;
        console.log(`[Bendahara] save_spby - keeping status=${newStatus}, setting pembayaran=${pembayaran}`);
      }
      
    } else if (actor === 'ppk') {
      updatedWaktuPpk = updatedAt;
      updatedStatusPpk = action === 'approve' ? 'Disetujui' : 'Ditolak';
      
      if (action === 'approve') {
        newStatus = 'pending_ppspm'; // PPK approve → ke PPSPM
      } else if (action === 'reject') {
        newStatus = 'incomplete_bendahara'; // PPK reject → kembali ke Bendahara
      }
      
    } else if (actor === 'ppspm') {
      updatedWaktuPPSPM = updatedAt;
      updatedStatusPPSPM = action === 'approve' ? 'Disetujui' : 'Ditolak';
      
      if (action === 'approve') {
        newStatus = 'sent_kppn'; // PPSPM approve → Arsip catat
      } else if (action === 'reject') {
        newStatus = 'incomplete_ppk'; // PPSPM reject → kembali ke PPK
      }
      
    } else if (actor === 'arsip') {
      updatedWaktuArsip = updatedAt;
      updatedStatusArsip = action === 'approve' ? 'Disetujui' : 'Ditolak';
      
      // Handle nomorSPPD for Arsip
      if (nomorSPPD) updatedNomorSPPD = nomorSPPD;
      
      if (action === 'approve') {
        newStatus = 'complete_arsip'; // Arsip catat → selesai
      } else if (action === 'reject') {
        newStatus = 'incomplete_ppspm'; // Arsip reject → kembali ke PPSPM
      }
    }

    // Build updated row sesuai struktur: A-U (21 kolom)
    // A: ID, B: Uraian, C: Nama, D: Jenis, E: Kelengkapan, F: Catatan, G: Status
    // H: Waktu Pengajuan, I: Waktu Bendahara, J: Waktu PPK, K: Waktu PPSPM, L: Waktu Arsip
    // M: Status Bendahara, N: Status PPK, O: Status PPSPM, P: Status Arsip, Q: Update terakhir
    // R: User, S: Pembayaran (UP/LS), T: Nomor SPM, U: Nomor SPPD
    
    console.log(`[Before updatedRow] id=${id}, newStatus=${newStatus}, updatedPembayaran=${updatedPembayaran}, updatedNomorSPM=${updatedNomorSPM}`);
    
    const updatedRow = [
      currentRow[0] || '', // A: ID
      newTitle,            // B: Uraian Pengajuan
      newSubmitterName,    // C: Nama Pengaju
      newJenisBelanja,     // D: Jenis Pengajuan
      newDocuments,        // E: Kelengkapan
      newNotes,            // F: Catatan
      newStatus,           // G: Status Pengajuan
      updatedWaktuPengajuan, // H: Waktu Pengajuan dari SM
      updatedWaktuBendahara, // I: Waktu Bendahara
      updatedWaktuPpk,     // J: Waktu PPK
      updatedWaktuPPSPM,   // K: Waktu PPSPM
      updatedWaktuArsip,   // L: Waktu Arsip
      updatedStatusBendahara, // M: Status Bendahara
      updatedStatusPpk,    // N: Status PPK
      updatedStatusPPSPM,  // O: Status PPSPM
      updatedStatusArsip,  // P: Status Arsip
      updatedAt,           // Q: Update terakhir
      user,                // R: User
      updatedPembayaran,   // S: Pembayaran (UP/LS)
      updatedNomorSPM,     // T: Nomor SPM
      updatedNomorSPPD,    // U: Nomor SPPD
    ];

    console.log(`Updating row ${rowIndex}:`, updatedRow);
    console.log('Row length:', updatedRow.length);

    // Update dengan range A:U untuk 21 kolom
    const updateResponse = await fetch(
      `${baseUrl}/values/${SHEET_NAME}!A${rowIndex}:U${rowIndex}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [updatedRow] }),
      }
    );

    const updateData = await updateResponse.json();
    console.log('Update response:', JSON.stringify(updateData));

    if (!updateResponse.ok) {
      throw new Error(`Update failed: ${JSON.stringify(updateData)}`);
    }
    
    // Log untuk debugging
    console.log(`Updated submission ${id}:`, {
      pembayaran: updatedPembayaran,
      nomorSPM: updatedNomorSPM,
      nomorSPPD: updatedNomorSPPD
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updateData,
        updatedStatus: newStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in pencairan-update:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});