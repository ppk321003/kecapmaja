// @ts-ignore - ESM import for Supabase Edge Runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getAccessToken, readGoogleSheetValues } from '../_shared/portalGoogleSheets.ts';

// @ts-ignore - Deno globals
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const CONFIG_SPREADSHEET_ID = '1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ';
const MONTHS_ID = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
];

interface Satker {
  id: string;
  name: string;
  activitySheetId: string;
  masterSheetId: string;
}

interface Assignment {
  period: string;
  activity: string;
  jobType: string;
  target: number;
  realization: number;
  unit: string;
  grossAmount: number;
  stage: 'draft' | 'spk';
}

interface CachedSatkers {
  expiresAt: number;
  satkers: Satker[];
}

let satkerCache: CachedSatkers | undefined;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractSpreadsheetId(value: unknown): string {
  const text = String(value ?? '').trim();
  const urlMatch = text.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return urlMatch?.[1] ?? text;
}

function normalizePeriod(value: string): string {
  return value.trim().toLocaleLowerCase('id').replace(/\s+/g, ' ');
}

function parseNumber(value: unknown): number {
  const text = String(value ?? '').trim().replace(/[^\d,.-]/g, '');
  if (!text) return 0;
  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(text)
      ? text.replace(/\./g, '')
      : text;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRekapRate(value: unknown): number {
  const digits = String(value ?? '').replace(/\D/g, '');
  return Number.parseInt(digits, 10) || 0;
}

function parseRekapRealization(value: unknown): number {
  const normalized = String(value ?? '').replace(',', '.');
  return Number.parseFloat(normalized) || 0;
}

function currentJakartaPeriod(): { month: string; year: number; label: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date());
  const monthNumber = Number(parts.find((part) => part.type === 'month')?.value);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = MONTHS_ID[monthNumber - 1];
  return { month, year, label: `${month[0].toLocaleUpperCase('id')}${month.slice(1)} ${year}` };
}

function periodOrder(period: string): number | null {
  const normalized = normalizePeriod(period);
  const yearFirst = normalized.match(/\b(\d{4})[-/ ](0?[1-9]|1[0-2])\b/);
  if (yearFirst) return Number(yearFirst[1]) * 12 + Number(yearFirst[2]);

  const monthFirst = normalized.match(/\b(0?[1-9]|1[0-2])[-/ ](\d{4})\b/);
  if (monthFirst) return Number(monthFirst[2]) * 12 + Number(monthFirst[1]);

  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const monthNumber = MONTHS_ID.findIndex((month) => normalized.includes(month)) + 1;
  return monthNumber > 0 ? Number(yearMatch[1]) * 12 + monthNumber : null;
}

function splitList(value: string): string[] {
  return value.split('|').map((item) => item.trim());
}

function maskNik(nik: string): string {
  return `${nik.slice(0, 4)}••••••••${nik.slice(-4)}`;
}

async function hmacHash(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getSatkers(accessToken: string): Promise<Satker[]> {
  if (satkerCache && satkerCache.expiresAt > Date.now()) return satkerCache.satkers;

  let rows = await readGoogleSheetValues(CONFIG_SPREADSHEET_ID, 'satker_config!A:AG', accessToken);
  if (rows.length <= 1) {
    rows = await readGoogleSheetValues(CONFIG_SPREADSHEET_ID, 'Sheet1!A:AG', accessToken);
  }
  const satkers = rows.slice(1)
    .filter((row) => row[0]?.trim() && row[1]?.trim())
    .map((row) => ({
      id: row[0].trim(),
      name: row[1].trim(),
      activitySheetId: extractSpreadsheetId(row[4]),
      masterSheetId: extractSpreadsheetId(row[6]),
    }))
    .filter((satker) => satker.activitySheetId && satker.masterSheetId);

  if (satkers.length === 0) throw new Error('Satker configuration is unavailable.');
  satkerCache = { satkers, expiresAt: Date.now() + 5 * 60 * 1000 };
  return satkers;
}

function findMasterColumns(headers: string[]): { nik: number; name: number; phone: number } {
  const normalized = headers.map(normalizeHeader);
  const find = (aliases: string[]) => normalized.findIndex((header) => aliases.includes(header));
  const columns = {
    nik: find(['nik', 'nomorindukkependudukan']),
    name: find(['nama', 'namalengkap']),
    phone: find(['nohp', 'nomorhp', 'nomorhandphone', 'telepon', 'notelp', 'whatsapp']),
  };
  if (columns.nik < 0 || columns.name < 0 || columns.phone < 0) {
    throw new Error('Master Mitra headers are incomplete.');
  }
  return columns;
}

async function checkRateLimit(request: Request, nik: string, satkerId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service configuration is missing.');
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ipAddress = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const [subjectHash, ipHash] = await Promise.all([
    hmacHash(serviceRoleKey, `satker:${satkerId}:nik:${nik}`),
    hmacHash(serviceRoleKey, `ip:${ipAddress}`),
  ]);
  const { data, error } = await client.rpc('portal_mitra_check_rate_limit', {
    p_subject_hash: subjectHash,
    p_ip_hash: ipHash,
  });
  if (error) throw new Error('Rate limit service unavailable.');
  return data === true;
}

async function handleLookup(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Permintaan tidak valid.' }, 400);
  }

  const satkerId = String(body.satkerId ?? '').trim();
  const nik = normalizeDigits(body.nik);
  const phoneLast4 = normalizeDigits(body.phoneLast4);
  if (!satkerId || nik.length !== 16 || phoneLast4.length !== 4) {
    return jsonResponse({ error: 'Pilih satker, masukkan NIK 16 digit, dan 4 digit terakhir nomor HP.' }, 400);
  }

  try {
    if (!await checkRateLimit(request, nik, satkerId)) {
      return jsonResponse({ error: 'Batas pencarian tercapai. Silakan coba lagi nanti.' }, 429);
    }

    const accessToken = await getAccessToken();
    const satkers = await getSatkers(accessToken);
    const satker = satkers.find((item) => item.id === satkerId);
    if (!satker) return jsonResponse({ error: 'Satker tidak tersedia.' }, 400);

    const [masterRows, activityRows] = await Promise.all([
      readGoogleSheetValues(satker.masterSheetId, 'MASTER.MITRA!A:Z', accessToken),
      readGoogleSheetValues(satker.activitySheetId, 'Sheet1!A:Z', accessToken),
    ]);
    if (masterRows.length === 0) throw new Error('Master Mitra data is unavailable.');
    const columns = findMasterColumns(masterRows[0]);
    const matchingMitra = masterRows.slice(1).find((row) => {
      const rowNik = normalizeDigits(row[columns.nik]);
      const rowPhone = normalizeDigits(row[columns.phone]);
      return rowNik === nik && rowPhone.slice(-4) === phoneLast4;
    });
    if (!matchingMitra) return jsonResponse({ found: false });

    const period = currentJakartaPeriod();
    const currentPeriodOrder = period.year * 12 + MONTHS_ID.indexOf(period.month) + 1;
    const assignments: Assignment[] = [];
    const historyAssignments: Assignment[] = [];
    for (const row of activityRows.slice(1)) {
      if (!row[0] || !row[2] || row[25]?.toLocaleLowerCase('id').includes('dihapus')) continue;
      const activityPeriodOrder = periodOrder(row[2]);
      if (activityPeriodOrder === null || activityPeriodOrder > currentPeriodOrder) continue;

      const workerNiks = splitList(row[22] ?? '').map(normalizeDigits);
      const workerIndex = workerNiks.findIndex((value) => value === nik);
      if (workerIndex < 0) continue;

      const targets = splitList(row[14] ?? '');
      const realizations = splitList(row[15] ?? '');
      const target = parseNumber(targets[workerIndex]);
      const realization = parseRekapRealization(realizations[workerIndex]);
      const price = parseRekapRate(row[9]);
      const sentToPpk = (row[19] ?? '').toLocaleLowerCase('id').includes('kirim ke ppk');
      const assignment: Assignment = {
        period: row[2].trim(),
        activity: row[4]?.trim() || 'Kegiatan',
        jobType: row[3]?.trim() || '',
        target,
        realization,
        unit: row[10]?.trim() || '',
        grossAmount: price * realization,
        stage: sentToPpk ? 'spk' : 'draft',
      };
      if (activityPeriodOrder === currentPeriodOrder) {
        assignments.push(assignment);
      } else {
        historyAssignments.push(assignment);
      }
    }
    historyAssignments.sort((a, b) => (periodOrder(b.period) ?? 0) - (periodOrder(a.period) ?? 0));

    return jsonResponse({
      found: true,
      profile: {
        name: matchingMitra[columns.name]?.trim() || 'Mitra Statistik',
        maskedNik: maskNik(nik),
      },
      satker: satker.name,
      honorMonth: period.label,
      assignments,
      historyAssignments,
      grossTotal: assignments.reduce((sum, assignment) => sum + assignment.grossAmount, 0),
    });
  } catch (error) {
    console.error('[portal-mitra] Lookup failed:', error instanceof Error ? error.message : 'Unknown error');
    return jsonResponse({ error: 'Data belum dapat diperiksa. Silakan coba lagi beberapa saat.' }, 503);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Metode permintaan tidak didukung.' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.clone().json();
  } catch {
    return jsonResponse({ error: 'Permintaan tidak valid.' }, 400);
  }

  if (body.action === 'satkers') {
    try {
      const accessToken = await getAccessToken();
      const satkers = await getSatkers(accessToken);
      return jsonResponse({
        satkers: satkers.map(({ id, name }) => ({ id, name })),
      });
    } catch (error) {
      console.error('[portal-mitra] Satker list unavailable:', error instanceof Error ? error.message : 'Unknown error');
      return jsonResponse({ error: 'Daftar satker belum dapat dimuat. Silakan coba lagi.' }, 503);
    }
  }

  return handleLookup(request);
});
