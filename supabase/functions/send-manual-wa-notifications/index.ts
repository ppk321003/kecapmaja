/**
 * Supabase Edge Function: Manual WA Broadcast Notifications
 * Triggered by PPK (Pejabat Pembuat Komitmen) for custom WA messages
 * 
 * Usage:
 * - Only accessible by user with 'Pejabat Pembuat Komitmen' role
 * - Sends custom messages to selected karyawan
 * - Uses same Fonnte device rotation as auto-notifications
 * - Logs to NOTIF_LOG with type="MANUAL"
 */

// @ts-ignore - Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

// @ts-ignore - Deno global
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
// @ts-ignore - Deno global
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// @ts-ignore - Deno global
const fontneDeviceTokens = Deno.env.get("FONNTE_DEVICE_TOKENS") || "[]";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==================== TYPES ====================
interface Karyawan {
  nip: string;
  nama: string;
  no_hp: string;
  jabatan: string;
  golongan: string;
}

interface DeviceToken {
  name: string;
  token: string;
  active: boolean;
}

interface BroadcastRequest {
  nips: string[];
  templateId: string;
  customDetail?: string;
  customMessage?: string;
  ppkName: string;
}

// ==================== DEVICE MANAGEMENT ====================
let deviceTokens: DeviceToken[] = [];
let deviceStats = new Map<string, { usageCount: number; lastUsed: Date; onCooldown: boolean }>();
const RATE_LIMIT = { perHour: 15, perDay: 40, cooldownSeconds: 15 };

function initializeDeviceTokens() {
  try {
    const tokens = JSON.parse(fontneDeviceTokens);
    deviceTokens = Array.isArray(tokens) ? tokens : [];
    for (const token of deviceTokens) {
      if (token.active) {
        deviceStats.set(token.name, {
          usageCount: 0,
          lastUsed: new Date(0),
          onCooldown: false,
        });
      }
    }
    const activeCount = deviceTokens.filter(t => t.active).length;
    console.log(`[Manual Broadcast] Initialized ${activeCount} active devices: ${deviceTokens.filter(t => t.active).map(t => t.name).join(', ')}`);
    if (activeCount === 0) {
      console.error(`[Manual Broadcast] ⚠️ WARNING: No active Fonnte devices found in FONNTE_DEVICE_TOKENS`);
    }
  } catch (error) {
    console.error('[Manual Broadcast] Failed to parse device tokens:', error);
    deviceTokens = [];
  }
}

function selectBestDevice(): DeviceToken | null {
  const availableDevices = deviceTokens.filter(t => t.active);
  if (availableDevices.length === 0) return null;

  const candidates = availableDevices.filter(device => {
    const stats = deviceStats.get(device.name);
    if (!stats) return true;
    if (stats.onCooldown) {
      const timeSinceLastUse = Date.now() - stats.lastUsed.getTime();
      if (timeSinceLastUse < RATE_LIMIT.cooldownSeconds * 1000) {
        return false;
      }
      stats.onCooldown = false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  let selected = candidates[0];
  let minUsage = deviceStats.get(candidates[0].name)?.usageCount || 0;

  for (const device of candidates) {
    const usage = deviceStats.get(device.name)?.usageCount || 0;
    if (usage < minUsage) {
      minUsage = usage;
      selected = device;
    }
  }

  return selected;
}

// ==================== FONNTE SEND ====================
async function sendWAViaFonnte(phoneNumber: string, message: string, retryCount: number = 0): Promise<{ success: boolean; device: string | null }> {
  const maxRetries = 2;

  try {
    const device = selectBestDevice();
    if (!device) {
      console.error('[Manual Broadcast] No available devices');
      return { success: false, device: null };
    }

    const stats = deviceStats.get(device.name);
    if (!stats) {
      return { success: false, device: null };
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (stats.lastUsed > hourAgo && stats.usageCount >= RATE_LIMIT.perHour) {
      console.warn(`[Manual Broadcast] Device ${device.name} rate-limited (hourly)`);
      if (retryCount < maxRetries) {
        const delay = retryCount === 0 ? 10000 : 20000 + Math.random() * 70000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendWAViaFonnte(phoneNumber, message, retryCount + 1);
      }
      return { success: false, device: device.name };
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': device.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phoneNumber,
        message: message,
        retry: true,
        typing: false,
      })
    });

    const data = await response.json();
    
    stats.usageCount++;
    stats.lastUsed = new Date();
    stats.onCooldown = true;

    // DEBUG: Log full Fonnte response
    console.log(`[Manual Broadcast] Fonnte Request sent to: ${phoneNumber}`);
    console.log(`[Manual Broadcast] Device: ${device.name}, Token prefix: ${device.token.substring(0, 20)}...`);
    console.log(`[Manual Broadcast] Fonnte Response - HTTP ${response.status}, Status: ${data.status}, Message: ${data.message || '(undefined)'}, Data:`, JSON.stringify(data));

    // Fonnte returns { status: true/false, message: "...", data: {...} }
    if (data.status === true && response.ok) {
      console.log(`[Manual Broadcast] ✅ Sent via ${device.name} to ${phoneNumber}`);
      return { success: true, device: device.name };
    } else if (response.status === 429) {
      console.warn(`[Manual Broadcast] Device ${device.name} rate-limited (429)`);
      if (retryCount < maxRetries) {
        const delay = 20000 + Math.random() * 70000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendWAViaFonnte(phoneNumber, message, retryCount + 1);
      }
      return { success: false, device: device.name };
    } else {
      const errorMsg = data.message || response.statusText || 'Unknown error';
      console.error(`[Manual Broadcast] ❌ Failed to ${phoneNumber} via ${device.name}: ${errorMsg}`);
      return { success: false, device: device.name };
    }
  } catch (error) {
    console.error(`[Manual Broadcast] Error:`, error);
    if (retryCount < maxRetries) {
      const delay = retryCount === 0 ? 10000 : 20000 + Math.random() * 70000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendWAViaFonnte(phoneNumber, message, retryCount + 1);
    }
    return { success: false, device: null };
  }
}

// ==================== HELPERS ====================
function normalizePhoneNumber(noHp: string): string {
  let normalized = noHp.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  }
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  return normalized;
}

function renderTemplate(templateId: string, detail: string, customMessage: string, nama: string, ppkName: string): string {
  const templates: Record<string, string> = {
    'informasi-penting': `Halo ${nama},

Terdapat informasi penting yang perlu Anda ketahui:

${detail}

Mohon untuk membaca dengan seksama dan segera mengambil tindakan jika diperlukan.

Salam,
${ppkName}`,

    'training-sosialisasi': `Halo ${nama},

Dengan hormat, kami mengundang Anda untuk mengikuti training/sosialisasi:

${detail}

Silakan segera melakukan pendaftaran.

Salam,
${ppkName}`,

    'pengumuman-kebijakan': `Halo ${nama},

Perhatian: Kebijakan baru berlaku mulai sekarang:

${detail}

Mohon keselarasan dalam pelaksanaannya.

Salam,
${ppkName}`,

    'reminder-pengajuan': `Halo ${nama},

Reminder: Jangan lupa mengajukan PAK sebelum deadline:

${detail}

Salam,
${ppkName}`,

    'pengajuan-dana': `Halo ${nama},

Status pengajuan dana Anda:

${detail}

Hubungi bagian keuangan jika ada pertanyaan.

Salam,
${ppkName}`,

    'custom': (customMessage || '').replace(/{nama}/g, nama).replace(/{ppkName}/g, ppkName)
  };

  return templates[templateId] || '';
}

// ==================== MAIN ====================
// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Manual Broadcast] Request received');
    
    initializeDeviceTokens();

    interface RequestBody extends BroadcastRequest {
      employees?: Karyawan[];
    }

    const requestBody = await req.json() as RequestBody;
    const { nips, templateId, customDetail, customMessage, ppkName, employees } = requestBody;

    if (!nips || nips.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No recipients specified' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Use provided employee list from frontend (no database fetch needed)
    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No employee data provided' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Filter to selected NIPs
    const selectedEmployees = nips
      .map(nip => employees.find((e: Karyawan) => e.nip === nip))
      .filter(Boolean) as Karyawan[];

    if (selectedEmployees.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No matching employees found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Send notifications
    const results: any[] = [];
    let sentCount = 0;

    for (const emp of selectedEmployees) {
      if (!emp.no_hp || emp.no_hp.trim() === '') {
        console.log(`[Skip] ${emp.nama}: No phone`);
        results.push({ nip: emp.nip, nama: emp.nama, sent: false, reason: 'no_phone' });
        continue;
      }

      const message = renderTemplate(templateId, customDetail || '', customMessage || '', emp.nama, ppkName);
      const phoneNormalized = normalizePhoneNumber(emp.no_hp);
      const sendResult = await sendWAViaFonnte(phoneNormalized, message);

      if (sendResult.success) {
        sentCount++;
      }

      results.push({
        nip: emp.nip,
        nama: emp.nama,
        no_hp: phoneNormalized,
        sent: sendResult.success,
        device: sendResult.device,
        template: templateId
      });

      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[Manual Broadcast] Complete. Sent: ${sentCount}/${selectedEmployees.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: selectedEmployees.length,
        sent: sentCount,
        failed: selectedEmployees.length - sentCount,
        results
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Manual Broadcast Error]', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
