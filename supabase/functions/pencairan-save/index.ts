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
  console.log('Getting access token for pencairan-save...');
  
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

// Fungsi untuk mendapatkan pencairan_sheet_id berdasarkan satker dari Master Config
async function getPencairanSheetIdBySatker(accessToken: string, satker: string): Promise<string> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${MASTER_CONFIG_SPREADSHEET_ID}/values/${MASTER_CONFIG_SHEET_NAME}!A:F`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch master config (${response.status}), using default sheet ID`);
      return DEFAULT_SPREADSHEET_ID;
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length <= 1) {
      console.warn('No config data found, using default sheet ID');
      return DEFAULT_SPREADSHEET_ID;
    }

    // Cari row dengan satker_id matching
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]?.trim() === satker?.trim()) {
        const pencairanSheetId = row[2]?.trim(); // Column C (index 2) = pencairan_sheet_id
        if (pencairanSheetId) {
          console.log(`Found pencairan sheet ID for satker ${satker}: ${pencairanSheetId}`);
          return pencairanSheetId;
        }
      }
    }

    console.warn(`Satker ${satker} not found in master config, using default sheet ID`);
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

serve(async (req) => {
  console.log('pencairan-save function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    // Support both naming conventions from frontend
    const {
      id,
      // New naming from frontend
      uraianPengajuan,
      namaPengaju,
      jenisPengajuan,
      kelengkapan,
      catatan,
      statusPengajuan,
      satker, // Tambahan: satker dari frontend
      // Legacy naming
      title,
      submitterName,
      jenisBelanja,
      documents,
      notes,
      status,
    } = body;
    
    console.log('[pencairan-save] Received request:', { satker, id });
    
    const accessToken = await getAccessToken();
    
    // Dapatkan correct spreadsheet ID berdasarkan satker
    const spreadsheetId = satker 
      ? await getPencairanSheetIdBySatker(accessToken, satker)
      : DEFAULT_SPREADSHEET_ID;
    
    console.log('[pencairan-save] Using spreadsheetId:', { satker, spreadsheetId, isDefault: spreadsheetId === DEFAULT_SPREADSHEET_ID });
    
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const waktuPengajuan = formatDateTime();

    // Struktur kolom sesuai request (17 kolom A:Q):
    // A: ID, B: Uraian Pengajuan, C: Nama Pengaju, D: Jenis Pengajuan, E: Kelengkapan
    // F: Catatan, G: Status Pengajuan, H: Waktu Pengajuan, I: Waktu Bendahara, J: Waktu PPK
    // K: Waktu PPSPM, L: Waktu Arsip, M: Status Bendahara, N: Status PPK, O: Status PPSPM, P: Status Arsip
    // Q: Update terakhir
    const rowData = [
      id || '',                                        // A: ID
      uraianPengajuan || title || '',                 // B: Uraian Pengajuan
      namaPengaju || submitterName || '',             // C: Nama Pengaju
      jenisPengajuan || jenisBelanja || '',           // D: Jenis Pengajuan
      kelengkapan || documents || '',                 // E: Kelengkapan
      catatan || notes || '',                         // F: Catatan
      statusPengajuan || status || 'draft',          // G: Status Pengajuan (draft for new submissions)
      waktuPengajuan,                                 // H: Waktu Pengajuan dari SM
      '',                                             // I: Waktu Bendahara
      '',                                             // J: Waktu PPK
      '',                                             // K: Waktu PPSPM
      '',                                             // L: Waktu Arsip
      '',                                             // M: Status Bendahara
      '',                                             // N: Status PPK
      '',                                             // O: Status PPSPM
      '',                                             // P: Status Arsip
      waktuPengajuan,                                 // Q: Update terakhir
    ];

    console.log('Appending row with 17 columns:', rowData);
    console.log('Row length:', rowData.length);

    // Append dengan range A:Q untuk 17 kolom
    const response = await fetch(
      `${baseUrl}/values/${SHEET_NAME}!A:Q:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowData] }),
      }
    );

    const data = await response.json();
    console.log('Append response:', JSON.stringify(data));

    if (!response.ok) {
      throw new Error(`Append failed: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in pencairan-save:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});