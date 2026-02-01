// @ts-ignore: external Deno std import may not resolve in editor type checker
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// declare Deno for editors that don't include Deno types
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reuse token helper similar to google-sheets function
async function getAccessToken() {
  const googlePrivateKeyEnv = Deno.env.get('GOOGLE_PRIVATE_KEY');
  const googleServiceAccountEmailEnv = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');

  let privateKey = '';
  let serviceAccountEmail = '';

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
      privateKey = (googlePrivateKeyEnv || '').replace(/\\n/g, '\n');
      serviceAccountEmail = googleServiceAccountEmailEnv || '';
    }
  } catch (e) {
    privateKey = (googlePrivateKeyEnv || '').replace(/\\n/g, '\n');
    serviceAccountEmail = googleServiceAccountEmailEnv || '';
  }

  if (!privateKey || !serviceAccountEmail) throw new Error('Missing Google credentials');

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

  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsignedToken));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const jwt = `${unsignedToken}.${encodedSignature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

// Utilities
const MASTER_SPREADSHEET_ID = '1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8';
const DAFTAR_SHEET_NAME = 'DaftarHadir';

function parseIndoDateToISO(text: string | null) {
  if (!text) return null;
  // Expected format: '21 Juli 2025'
  const parts = text.trim().split(' ');
  if (parts.length < 3) return null;
  const day = parseInt(parts[0]);
  const monthName = parts[1].toLowerCase();
  const year = parseInt(parts[2]);
  const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
  const month = months.indexOf(monthName);
  if (month === -1) return null;
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString().split('T')[0];
}

function formatISOToIndoDate(iso: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  } catch (e) {
    return '';
  }
}

async function readRange(accessToken: string, spreadsheetId: string, range: string) {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const res = await fetch(`${baseUrl}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`Read failed: ${JSON.stringify(data)}`);
  return data.values || [];
}

async function findRowIndexById(accessToken: string, spreadsheetId: string, sheetName: string, id: string) {
  const values = await readRange(accessToken, spreadsheetId, `${sheetName}!B:B`);
  for (let i = 0; i < values.length; i++) {
    const val = values[i] && values[i][0];
    if (val === id) return i + 1; // rows are 1-indexed
  }
  return null;
}

async function getValuesAtRow(accessToken: string, spreadsheetId: string, sheetName: string, rowIndex: number) {
  const range = `${sheetName}!A${rowIndex}:P${rowIndex}`;
  const values = await readRange(accessToken, spreadsheetId, range);
  return (values[0] || []).map((v: any) => (v === undefined ? '' : v));
}

async function lookupNameToCode(accessToken: string, sheet: string, name: string) {
  // Try to find row in master spreadsheet where column C or D matches name, return code from column B
  const values = await readRange(accessToken, MASTER_SPREADSHEET_ID, `${sheet}!A:Z`);
  // attempt to find where row[2] or row[3] equals name
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row) continue;
    if (row[2] && String(row[2]).trim() === String(name).trim()) return row[1] || null;
    if (row[3] && String(row[3]).trim() === String(name).trim()) return row[1] || null;
  }
  return null;
}

async function lookupCodeToName(accessToken: string, sheet: string, code: string) {
  const values = await readRange(accessToken, MASTER_SPREADSHEET_ID, `${sheet}!A:Z`);
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!row) continue;
    if (row[1] && String(row[1]).trim() === String(code).trim()) {
      return row[2] || row[3] || '';
    }
  }
  return '';
}

async function getNextSequenceNumber(accessToken: string, spreadsheetId: string, sheetName: string) {
  const values = await readRange(accessToken, spreadsheetId, `${sheetName}!A:A`);
  if (!values || values.length <= 1) return 1;
  const nums = values.slice(1).map((r: any) => parseInt((r[0] || '').toString())).filter((n: any) => !isNaN(n) && n > 0);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

async function generateDaftarId(accessToken: string, spreadsheetId: string, sheetName: string) {
  const values = await readRange(accessToken, spreadsheetId, `${sheetName}!B:B`);
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `dh-${yy}${mm}`;
  const ids = (values.slice(1).map((r: any) => r[0]).filter(Boolean) as string[]).filter((id: string) => id.startsWith(prefix));
  if (!ids.length) return `${prefix}001`;
  const seqs = ids.map((id: string) => parseInt(id.replace(prefix, '')) || 0).filter((n: number) => n > 0);
  const next = (seqs.length ? Math.max(...seqs) + 1 : 1);
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function appendRow(accessToken: string, spreadsheetId: string, sheetName: string, valuesRow: any[]) {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const res = await fetch(`${baseUrl}/values/${sheetName}!A:P:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [valuesRow] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Append failed: ${JSON.stringify(data)}`);
  return data;
}

async function updateRow(accessToken: string, spreadsheetId: string, sheetName: string, rowIndex: number, valuesRow: any[]) {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const range = `${sheetName}!A${rowIndex}:P${rowIndex}`;
  const res = await fetch(`${baseUrl}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [valuesRow] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Update failed: ${JSON.stringify(data)}`);
  return data;
}

async function deleteRow(accessToken: string, spreadsheetId: string, rowIndex: number) {
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const res = await fetch(`${baseUrl}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId: 0, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex } } }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Delete failed: ${JSON.stringify(data)}`);
  return data;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/\/+/g, '/').split('/').filter(Boolean);
    // expecting /edokumen-daftar-hadir/:id or /edokumen-daftar-hadir/:id/duplicate
    const id = pathParts[1] || null;
    const action = pathParts[2] || null;

    const accessToken = await getAccessToken();

    if (req.method === 'GET' && id) {
      // GET /:id
      // Fallback to env or require spreadsheetId param
      const spreadsheetId = Deno.env.get('DAFTAR_SHEET_ID') || Deno.env.get('DAFTARHADIR_SHEET_ID') || url.searchParams.get('sheetId');
      if (!spreadsheetId) return new Response(JSON.stringify({ error: 'Missing spreadsheetId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const foundRowIndex = await findRowIndexById(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, id);
      if (!foundRowIndex) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const values: string[] = await getValuesAtRow(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, foundRowIndex);
      // Map values
      const [no, rowId, namaKegiatan, detil, jenis, programName, kegiatanName, kroName, roName, komponenName, akunName, tanggalMulai, tanggalSelesai, pembuatName, organikStr, mitraStr] = values;

      // Try reverse lookup for codes
      const programCode = programName ? await lookupNameToCode(accessToken, 'program', programName) : null;
      const kegiatanCode = kegiatanName ? await lookupNameToCode(accessToken, 'kegiatan', kegiatanName) : null;
      const kroCode = kroName ? await lookupNameToCode(accessToken, 'kro', kroName) : null;
      const roCode = roName ? await lookupNameToCode(accessToken, 'ro', roName) : null;
      const komponenCode = komponenName ? await lookupNameToCode(accessToken, 'komponen', komponenName) : null;
      const akunCode = akunName ? await lookupNameToCode(accessToken, 'akun', akunName) : null;

      const organik = organikStr ? organikStr.split(' | ').map((s: string) => ({ id: null, name: s })) : [];
      const mitra = mitraStr ? mitraStr.split(' | ').map((s: string) => ({ id: null, name: s })) : [];

      const needsMapping = [];
      if (programName && !programCode) needsMapping.push('program');
      if (kegiatanName && !kegiatanCode) needsMapping.push('kegiatan');
      if (kroName && !kroCode) needsMapping.push('kro');
      if (roName && !roCode) needsMapping.push('ro');
      if (komponenName && !komponenCode) needsMapping.push('komponen');
      if (akunName && !akunCode) needsMapping.push('akun');

      return new Response(JSON.stringify({
        id: rowId,
        rowIndex: foundRowIndex,
        no: parseInt(no) || null,
        namaKegiatan,
        detil,
        jenis,
        program: { code: programCode, name: programName },
        kegiatan: { code: kegiatanCode, name: kegiatanName },
        kro: { code: kroCode, name: kroName },
        ro: { code: roCode, name: roName },
        komponen: { code: komponenCode, name: komponenName },
        akun: { code: akunCode, name: akunName },
        tanggalMulai: parseIndoDateToISO(tanggalMulai),
        tanggalSelesai: parseIndoDateToISO(tanggalSelesai),
        pembuatDaftar: { id: null, name: pembuatName },
        organik,
        mitra,
        needsMapping
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'PUT' && id) {
      // Update
      const body = await req.json();
      const spreadsheetId = Deno.env.get('DAFTAR_SHEET_ID') || Deno.env.get('DAFTARHADIR_SHEET_ID') || body.spreadsheetId;
      if (!spreadsheetId) return new Response(JSON.stringify({ error: 'Missing spreadsheetId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const foundRowIndex = await findRowIndexById(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, id);
      if (!foundRowIndex) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      // Read existing row to preserve No and Id if needed
      const existing = await getValuesAtRow(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, foundRowIndex);
      const no = existing[0] || '';
      const rowId = existing[1] || id;

      // Resolve codes to names
      const programName = body.program?.code ? await lookupCodeToName(accessToken, 'program', body.program.code) : (body.program?.name || existing[5] || '');
      const kegiatanName = body.kegiatan?.code ? await lookupCodeToName(accessToken, 'kegiatan', body.kegiatan.code) : (body.kegiatan?.name || existing[6] || '');
      const kroName = body.kro?.code ? await lookupCodeToName(accessToken, 'kro', body.kro.code) : (body.kro?.name || existing[7] || '');
      const roName = body.ro?.code ? await lookupCodeToName(accessToken, 'ro', body.ro.code) : (body.ro?.name || existing[8] || '');
      const komponenName = body.komponen?.code ? await lookupCodeToName(accessToken, 'komponen', body.komponen.code) : (body.komponen?.name || existing[9] || '');
      const akunName = body.akun?.code ? await lookupCodeToName(accessToken, 'akun', body.akun.code) : (body.akun?.name || existing[10] || '');

      // build organik & mitra names
      const organikNames = (body.organik && body.organik.length) ? (body.organik.join(' | ')) : (existing[14] || '');
      const mitraNames = (body.mitra && body.mitra.length) ? (body.mitra.join(' | ')) : (existing[15] || '');

      const tanggalMulaiStr = formatISOToIndoDate(body.tanggalMulai || (existing[11] || ''));
      const tanggalSelesaiStr = formatISOToIndoDate(body.tanggalSelesai || (existing[12] || ''));

      const pembuatName = (body.pembuatDaftar?.id) ? body.pembuatDaftar.name || existing[13] : (body.pembuatDaftar?.name || existing[13]);

      const row = [no, rowId, body.namaKegiatan || existing[2] || '', body.detil || existing[3] || '', body.jenis || existing[4] || '', programName, kegiatanName, kroName, roName, komponenName, akunName, tanggalMulaiStr, tanggalSelesaiStr, pembuatName, organikNames, mitraNames];

      await updateRow(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, foundRowIndex, row);

      return new Response(JSON.stringify({ ok: true, id: rowId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST' && id && action === 'duplicate') {
      // Duplicate
      const spreadsheetId = Deno.env.get('DAFTAR_SHEET_ID') || Deno.env.get('DAFTARHADIR_SHEET_ID');
      if (!spreadsheetId) return new Response(JSON.stringify({ error: 'Missing spreadsheetId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const sourceRowIndex = await findRowIndexById(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, id);
      if (!sourceRowIndex) return new Response(JSON.stringify({ error: 'Source not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const sourceValues = await getValuesAtRow(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, sourceRowIndex);

      const newNo = await getNextSequenceNumber(accessToken, spreadsheetId, DAFTAR_SHEET_NAME);
      const newId = await generateDaftarId(accessToken, spreadsheetId, DAFTAR_SHEET_NAME);

      const newRow = [newNo, newId, ...sourceValues.slice(2)];
      await appendRow(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, newRow);

      // find new row index
      const newRowIndex = await findRowIndexById(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, newId);

      return new Response(JSON.stringify({ ok: true, newId, newRowIndex }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'DELETE' && id) {
      const spreadsheetId = Deno.env.get('DAFTAR_SHEET_ID') || Deno.env.get('DAFTARHADIR_SHEET_ID') || (new URL(req.url)).searchParams.get('sheetId');
      if (!spreadsheetId) return new Response(JSON.stringify({ error: 'Missing spreadsheetId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const rowIndex = await findRowIndexById(accessToken, spreadsheetId, DAFTAR_SHEET_NAME, id);
      if (!rowIndex) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await deleteRow(accessToken, spreadsheetId, rowIndex);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in edokumen-daftar-hadir:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});