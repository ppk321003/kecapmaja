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

function formatDateTime(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())} - ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

serve(async (req) => {
  console.log('pencairan-update function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { id, status, notes, actor, action } = body;
    
    if (!id) {
      throw new Error('ID is required');
    }

    const accessToken = await getAccessToken();
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
    
    // First, read all data to find the row
    const readResponse = await fetch(`${baseUrl}/values/${SHEET_NAME}!A:N`, {
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
    
    // Update the row based on actor and action
    let waktuPpk = currentRow[8] || '';
    let waktuBendahara = currentRow[9] || '';
    let statusPpk = currentRow[10] || '';
    let statusBendahara = currentRow[11] || '';
    let statusKppn = currentRow[12] || '';
    let newNotes = notes || currentRow[5] || '';

    if (actor === 'ppk') {
      waktuPpk = updatedAt;
      statusPpk = action === 'approve' ? 'approved' : 'rejected';
    } else if (actor === 'bendahara') {
      waktuBendahara = updatedAt;
      statusBendahara = action === 'approve' ? 'approved' : 'rejected';
    } else if (actor === 'kppn') {
      statusKppn = action === 'return' ? 'returned' : 'processed';
    }

    const updatedRow = [
      currentRow[0], // id
      currentRow[1], // title
      currentRow[2], // submitterName
      currentRow[3], // jenisBelanja
      currentRow[4], // documents
      newNotes,      // notes
      status,        // status
      currentRow[7], // waktuPengajuan
      waktuPpk,
      waktuBendahara,
      statusPpk,
      statusBendahara,
      statusKppn,
      updatedAt,
    ];

    console.log(`Updating row ${rowIndex}:`, updatedRow);

    const updateResponse = await fetch(
      `${baseUrl}/values/${SHEET_NAME}!A${rowIndex}:N${rowIndex}?valueInputOption=USER_ENTERED`,
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
      JSON.stringify({ success: true, data: updateData }),
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
