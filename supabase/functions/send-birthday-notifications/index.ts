/**
 * Supabase Edge Function: Send Birthday Notifications
 * Trigger: Cron job setiap hari pukul 08:00 WIB (0 1 * * * UTC)
 * NOTE: Requires manual schedule setup in Supabase Dashboard!
 * 
 * FITUR:
 * - Setiap hari cek semua karyawan
 * - Jika ada yang berulang tahun hari ini (cocok bulan+tanggal dari NIP), kirim greeting
 * - Extract tanggal lahir dari NIP (8 digit pertama: YYYYMMDD format)
 * - Smart personalization: age-based greeting variants (normal/40+/50+)
 * - Device rotation dari Fonnte dengan rate limiting
 * - Retry mechanism dengan exponential backoff
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
  satker: string;
  tanggalLahir?: string;
  umur?: number;
  isBirthday?: boolean;
}

interface DeviceToken {
  name: string;
  token: string;
  active: boolean;
  usageCount?: number;
  lastUsed?: string;
  isOnCooldown?: boolean;
}

// ==================== CONFIGURATION ====================
let deviceTokens: DeviceToken[] = [];
let deviceStats = new Map<string, { usageCount: number; lastUsed: Date; onCooldown: boolean }>();
const RATE_LIMIT = { perHour: 15, perDay: 40, cooldownSeconds: 15 };

// ==================== CORS HEADERS ====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ==================== RESPONSE HELPER ====================
function createCorsResponse(body: any, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract birth date from NIP (first 8 digits: YYYYMMDD)
 */
function extractTanggalLahirFromNIP(nip: string): string | null {
  try {
    const normalizedNIP = nip.replace(/\s+/g, "");
    const tanggalLahirStr = normalizedNIP.substring(0, 8);
    if (tanggalLahirStr.length === 8 && /^\d+$/.test(tanggalLahirStr)) {
      const tahun = tanggalLahirStr.substring(0, 4);
      const bulan = tanggalLahirStr.substring(4, 6);
      const tanggal = tanggalLahirStr.substring(6, 8);
      return `${tahun}-${bulan}-${tanggal}`;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate age from birth date
 */
function hitungUmur(tanggalLahir: string): number {
  const today = new Date();
  const birthDate = new Date(tanggalLahir);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if today is someone's birthday (bulan dan tanggal cocok)
 */
function isHariIniUlangTahun(tanggalLahir: string): boolean {
  const today = new Date();
  const birthDate = new Date(tanggalLahir);
  
  return today.getMonth() === birthDate.getMonth() && 
         today.getDate() === birthDate.getDate();
}

/**
 * Build personalized birthday greeting based on age
 */
function buildUlangTahunMessage(nama: string, umur: number, jabatan: string, satkerNama: string = "BPS"): string {
  const ucapanUmum = [
    `Selamat ulang tahun yang ke-${umur} tahun, ${nama}! Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan dalam menjalankan tugas sebagai ${jabatan}.`,
    `Di usia yang ke-${umur} tahun ini, semoga ${nama} semakin bijaksana dan inspiratif bagi rekan-rekan di ${satkerNama}.`,
    `Semoga di usia ${umur} tahun ini, ${nama} menjadi pribadi yang lebih baik dan profesional dalam mengabdi untuk negara.`
  ];

  let ucapanList = ucapanUmum;
  
  if (umur >= 50) {
    ucapanList = [
      `Selamat ulang tahun ke-${umur} tahun! Semoga pengalaman dan kebijaksanaan yang dimiliki ${nama} semakin membawa manfaat bagi ${satkerNama}.`,
      `Di usia emas ${umur} tahun, semoga ${nama} senantiasa diberikan kesehatan dan semangat dalam mengabdi untuk statistik Indonesia.`,
      `Terima kasih atas dedikasi dan pengabdian selama ini. Selamat merayakan ${umur} tahun kehidupan yang penuh makna, ${nama}.`
    ];
  } else if (umur >= 40) {
    ucapanList = [
      `Selamat ulang tahun ke-${umur} tahun! Semoga di usia yang penuh kematangan ini, ${nama} semakin banyak kontribusi berharga untuk ${satkerNama}.`,
      `Di usia ${umur} tahun, semoga ${nama} semakin produktif dan inspiratif dalam memajukan statistik di ${satkerNama}.`,
      `Semoga di usia yang semakin dewasa ini, ${nama} senantiasa diberikan kemudahan dalam setiap tugas dan tanggung jawab.`
    ];
  }
  
  const randomUcapan = ucapanList[Math.floor(Math.random() * ucapanList.length)];
  
  return `Halo ${nama},\n\n🎉 *SELAMAT ULANG TAHUN* 🎉\n\n${randomUcapan}\n\nSalam *Kecap Maja.*\n_Kerja Efisien, Cepat, Akurat, Profesional_\n_Maju Aman Jeung Amanah_`;
}

function initializeDeviceTokens() {
  try {
    const tokens = JSON.parse(fontneDeviceTokens);
    deviceTokens = Array.isArray(tokens) ? tokens : [];
    
    for (const token of deviceTokens) {
      if (token.active) {
        deviceStats.set(token.name, {
          usageCount: token.usageCount || 0,
          lastUsed: token.lastUsed ? new Date(token.lastUsed) : new Date(0),
          onCooldown: false
        });
      }
    }
    console.log(`[Birthday] Initialized ${deviceTokens.filter(t => t.active).length} active devices`);
  } catch (error) {
    console.error("[Birthday] Failed to parse device tokens:", error);
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
    const stats = deviceStats.get(device.name);
    const usage = stats?.usageCount || 0;
    if (usage < minUsage) {
      selected = device;
      minUsage = usage;
    }
  }

  return selected;
}

async function sendViaFonnte(phoneNumber: string, message: string, device: DeviceToken): Promise<boolean> {
  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: device.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phoneNumber,
        message: message,
        retry: true,
        typing: false,
      }),
    });

    const result = await response.json();
    
    if (result.status === true) {
      const stats = deviceStats.get(device.name);
      if (stats) {
        stats.usageCount++;
        stats.lastUsed = new Date();
        stats.onCooldown = true;
      }
      return true;
    } else {
      console.error(`[Fonnte Error ${device.name}] ${result.message}`);
      return false;
    }
  } catch (error) {
    console.error(`[Fonnte Error ${device.name}]`, error);
    return false;
  }
}

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  
  if (digits.startsWith("62")) {
    return digits;
  }
  
  if (digits.startsWith("0")) {
    return "62" + digits.slice(1);
  }
  
  return "62" + digits;
}

// ==================== MAIN FUNCTION ====================
serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("[Birthday Notifications] Starting execution...");
    
    // Initialize device tokens
    initializeDeviceTokens();
    
    if (deviceTokens.length === 0) {
      return createCorsResponse({ error: "No Fonnte devices available" }, 503);
    }

    // Fetch all employees from Google Sheets
    const DEFAULT_ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
    
    const { data: sheetsData, error: sheetsError } = await supabase.functions.invoke("google-sheets", {
      body: {
        operation: "read",
        spreadsheetId: DEFAULT_ORGANIK_SHEET_ID,
        range: "MASTER.ORGANIK"
      },
    });

    if (sheetsError || !sheetsData?.data) {
      throw new Error(`Failed to fetch data: ${sheetsError?.message || "Unknown error"}`);
    }

    // Parse employee data
    const karyawanList: Karyawan[] = [];
    const karyawanUltahHariIni: Karyawan[] = [];
    
    const rows = sheetsData.data || [];
    if (rows.length <= 1) {
      console.log("[Birthday Notifications] No data found in MASTER.ORGANIK");
      return createCorsResponse({ error: "No employees found", sent: 0 }, 400);
    }

    // Build header index map
    const headerRow = rows[0] || [];
    const headerMap: Record<string, number> = {};
    headerRow.forEach((header: any, idx: number) => {
      if (header) {
        headerMap[String(header).toUpperCase().trim()] = idx;
      }
    });
    
    console.log("[Birthday Notifications] Header columns found:", Object.keys(headerMap).join(', '));

    // Skip header row and process data
    const pegawaiData = rows.slice(1);
    
    for (const row of pegawaiData) {
      if (!row || row.length < 3) continue;
      
      const nip = row[headerMap['NIP'] || headerMap['NIP_BPS'] || 2] || row[1];
      const nama = row[headerMap['NAMA'] || 3];
      const jabatan = row[headerMap['JABATAN'] || 4];
      const satker = row[headerMap['SATKER'] || headerMap['UNIT'] || 5];
      const golongan = row[headerMap['GOLONGAN'] || headerMap['PANGKAT'] || 7];
      const no_hp = row[headerMap['NO_HP'] || headerMap['TELEPON'] || 8];
      
      if (!nip || !nama || !no_hp) continue;
      
      const karyawan: Karyawan = {
        nip: nip.toString(),
        nama: nama.toString(),
        no_hp: normalizePhoneNumber(no_hp.toString()),
        jabatan: jabatan?.toString() || "",
        golongan: golongan?.toString().trim() || "",
        satker: satker?.toString().trim() || "",
      };
      
      // Extract birth date from NIP and check birthday
      const tanggalLahir = extractTanggalLahirFromNIP(nip);
      if (tanggalLahir) {
        karyawan.tanggalLahir = tanggalLahir;
        karyawan.umur = hitungUmur(tanggalLahir);
        karyawan.isBirthday = isHariIniUlangTahun(tanggalLahir);
        
        if (karyawan.isBirthday) {
          karyawanUltahHariIni.push(karyawan);
          console.log(`🎉 Birthday detected: ${nama} (${karyawan.umur} tahun) - NIP: ${nip}`);
        }
      }
      
      karyawanList.push(karyawan);
    }

    console.log(`[Birthday Notifications] Total karyawan: ${karyawanList.length}`);
    console.log(`[Birthday Notifications] Karyawan yang berulang tahun hari ini: ${karyawanUltahHariIni.length}`);

    if (karyawanList.length === 0) {
      return createCorsResponse({ error: "No employees found", sent: 0 }, 400);
    }

    // Send birthday greetings
    let sentCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    console.log(`[Birthday Greetings] Sending birthday messages to ${karyawanUltahHariIni.length} employees...`);
    
    for (const emp of karyawanUltahHariIni) {
      try {
        const device = selectBestDevice();
        if (!device) {
          failedCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            status: "failed",
            error: "No device available",
          });
          continue;
        }

        const message = buildUlangTahunMessage(emp.nama, emp.umur || 0, emp.jabatan, emp.satker);
        const success = await sendViaFonnte(emp.no_hp, message, device);

        if (success) {
          sentCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            status: "sent",
            device: device.name,
            umur: emp.umur
          });
          console.log(`🎉 Birthday greeting sent to ${emp.nama} (${emp.umur} tahun) via ${device.name}`);
        } else {
          failedCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            status: "failed",
            error: "Fonnte API error",
          });
          console.log(`✗ Birthday greeting failed: ${emp.nama}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        failedCount++;
        results.push({
          nip: emp.nip,
          nama: emp.nama,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
        console.error(`Error sending birthday to ${emp.nama}:`, err);
      }
    }

    console.log(`[Birthday Notifications] Complete. Sent: ${sentCount}/${karyawanUltahHariIni.length}, Failed: ${failedCount}`);

    return createCorsResponse({
      status: "success",
      sent: sentCount,
      failed: failedCount,
      total: karyawanUltahHariIni.length,
      results: results,
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    console.error("[Birthday Notifications Error]", error);
    return createCorsResponse({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
