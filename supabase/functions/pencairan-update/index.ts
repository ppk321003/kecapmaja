import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '1hnNCHxmQQ5rjVcxIBvJk5lEdZ8aki4YUMBi1s33cnGI';
const SHEET_NAME = 'data';

async function getAccessToken() {
  console.log('Getting access token for pencairan-update...');
  
  let privateKey: string;
  let serviceAccountEmail: string;
  
  const googlePrivateKeyEnv = Deno.env.get('GOOGLE_PRIVATE_KEY');
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

serve(async (req) => {
  console.log('pencairan-update function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { id, status, notes, actor, action, uraianPengajuan, namaPengaju, jenisPengajuan, kelengkapan } = body;
    
    if (!id) {
      throw new Error('ID is required');
    }

    const accessToken = await getAccessToken();
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    
    // PERBAIKAN: Baca 16 kolom (A:P)
    const readResponse = await fetch(`${baseUrl}/values/${SHEET_NAME}!A:P`, {
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
    
    // Default values from current row - PERBAIKAN: mapping yang benar
    let newTitle = currentRow[1] || '';           // B: Uraian Pengajuan
    let newSubmitterName = currentRow[2] || '';   // C: Nama Pengaju
    let newJenisBelanja = currentRow[3] || '';    // D: Jenis Pengajuan
    let newDocuments = currentRow[4] || '';       // E: Kelengkapan
    let newNotes = notes !== undefined ? notes : (currentRow[5] || ''); // F: Catatan
    let newStatus = status || currentRow[6] || ''; // G: Status Pengajuan
    
    // PERBAIKAN: Ambil nilai sesuai struktur spreadsheet yang benar
    const waktuPpk = currentRow.length > 8 ? currentRow[8] || '' : '';       // I: Waktu PPK
    const waktuPPSPM = currentRow.length > 9 ? currentRow[9] || '' : '';     // J: Waktu PPSPM
    const waktuBendahara = currentRow.length > 10 ? currentRow[10] || '' : ''; // K: Waktu Bendahara
    const statusPpk = currentRow.length > 11 ? currentRow[11] || '' : '';    // L: Status PPK
    const statusPPSPM = currentRow.length > 12 ? currentRow[12] || '' : '';  // M: Status PPSPM
    const statusBendahara = currentRow.length > 13 ? currentRow[13] || '' : ''; // N: Status Bendahara
    const statusKppn = currentRow.length > 14 ? currentRow[14] || '' : '';   // O: Status KPPN

    // Handle edit action from SM
    if (actor === 'sm' && action === 'edit') {
      if (uraianPengajuan) newTitle = uraianPengajuan;
      if (namaPengaju) newSubmitterName = namaPengaju;
      if (jenisPengajuan) newJenisBelanja = jenisPengajuan;
      if (kelengkapan !== undefined) newDocuments = kelengkapan;
      if (status) newStatus = status;
    }
    
    // Variables untuk update
    let updatedWaktuPpk = waktuPpk;
    let updatedWaktuPPSPM = waktuPPSPM;
    let updatedWaktuBendahara = waktuBendahara;
    let updatedStatusPpk = statusPpk;
    let updatedStatusPPSPM = statusPPSPM;
    let updatedStatusBendahara = statusBendahara;
    let updatedStatusKppn = statusKppn;
    
    // Handle approval/rejection actions - PERBAIKAN: tambah PPSPM
    if (actor === 'ppk') {
      updatedWaktuPpk = updatedAt;
      updatedStatusPpk = action === 'approve' ? 'approved' : 'rejected';
      
      if (action === 'approve') {
        newStatus = 'pending_ppspm'; // PPK approve → ke PPSPM
      } else if (action === 'reject') {
        newStatus = 'incomplete_sm'; // PPK reject → kembali ke SM
      }
      
    } else if (actor === 'ppspm') { // PERBAIKAN: tambah handle PPSPM
      updatedWaktuPPSPM = updatedAt;
      updatedStatusPPSPM = action === 'approve' ? 'approved' : 'rejected';
      
      if (action === 'approve') {
        newStatus = 'pending_bendahara'; // PPSPM approve → ke Bendahara
      } else if (action === 'reject') {
        newStatus = 'incomplete_ppk'; // PPSPM reject → kembali ke PPK
      }
      
    } else if (actor === 'bendahara') {
      updatedWaktuBendahara = updatedAt;
      updatedStatusBendahara = action === 'approve' ? 'approved' : 'rejected';
      
      if (action === 'approve') {
        newStatus = 'sent_kppn'; // Bendahara approve → ke KPPN
      } else if (action === 'reject') {
        newStatus = 'incomplete_ppspm'; // Bendahara reject → kembali ke PPSPM
      }
      
    } else if (actor === 'kppn') {
      updatedStatusKppn = action === 'return' ? 'returned' : 'processed';
    }

    // PERBAIKAN: Build updated row dengan 16 kolom sesuai struktur
    const updatedRow = [
      currentRow[0] || '', // A: ID
      newTitle,            // B: Uraian Pengajuan
      newSubmitterName,    // C: Nama Pengaju
      newJenisBelanja,     // D: Jenis Pengajuan
      newDocuments,        // E: Kelengkapan
      newNotes,            // F: Catatan
      newStatus,           // G: Status Pengajuan
      currentRow[7] || '', // H: Waktu Pengajuan dari SM
      updatedWaktuPpk,     // I: Waktu PPK
      updatedWaktuPPSPM,   // J: Waktu PPSPM
      updatedWaktuBendahara, // K: Waktu Bendahara
      updatedStatusPpk,    // L: Status PPK
      updatedStatusPPSPM,  // M: Status PPSPM
      updatedStatusBendahara, // N: Status Bendahara
      updatedStatusKppn,   // O: Status KPPN
      updatedAt,           // P: update terakhir
    ];

    console.log(`Updating row ${rowIndex}:`, updatedRow);
    console.log('Row length:', updatedRow.length);

    // PERBAIKAN: Update dengan range A:P untuk 16 kolom
    const updateResponse = await fetch(
      `${baseUrl}/values/${SHEET_NAME}!A${rowIndex}:P${rowIndex}?valueInputOption=USER_ENTERED`,
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