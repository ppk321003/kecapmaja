/**
 * Supabase Edge Function: Send Kebijakan (Policy) Notifications
 * Trigger: Cron job setiap tanggal 16 pukul 08:00 (dengan cek hari libur untuk tanggal 17)
 * 
 * FITUR: 
 * - Dikirim ke SEMUA karyawan aktif (bukan hanya yang naik pangkat)
 * - Cek hari libur: pastikan tanggal 17 bukan hari libur
 * - Device rotation dari Fonnte (sama dengan karir-notifications)
 * - Rate limiting dan retry mechanism
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

// Daftar Hari Libur Nasional 2026 (Indonesia)
const HARI_LIBUR_2026 = [
  "2026-01-01", // Tahun Baru
  "2026-02-14", // Isra & Mi'raj
  "2026-03-25", // Ramadhan 1 Syawal (Lebaran)
  "2026-03-26", // Lebaran
  "2026-03-27", // Cuti Bersama Lebaran
  "2026-03-28", // Cuti Bersama Lebaran
  "2026-03-29", // Cuti Bersama Lebaran
  "2026-04-03", // Awal Ramadhan
  "2026-04-10", // Jumat Agung
  "2026-04-13", // Hari Raya Nyepi
  "2026-05-01", // Hari Buruh
  "2026-05-14", // Kenaikan Isa Almasih
  "2026-05-16", // Papua Day
  "2026-06-01", // Pancasila Day
  "2026-06-24", // Hari Raya Haji
  "2026-06-25", // Cuti Bersama Idulfitri
  "2026-07-14", // Tahun Baru Islam (14 Juli dijadwalkan)
  "2026-08-17", // Hari Kemerdekaan
  "2026-12-25", // Hari Natal
  "2026-12-26", // Cuti Bersama
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract birth date from NIP (first 8 digits: YYYYMMDD)
 */
function extractTanggalLahirFromNIP(nip: string): string | null {
  try {
    const normalizedNIP = nip.replace(/\s+/g, "");
    const tanggalLahirStr = normalizedNIP.substring(0, 8);
    if (tanggalLahirStr.length === 8) {
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
 * Check if today is someone's birthday
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

/**
 * Check if tanggal 17 is a holiday
 */
function isTanggal17Holiday(): boolean {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const tanggal17 = `${year}-${month}-17`;
  
  // Check if tanggal 17 is in holiday list
  if (HARI_LIBUR_2026.includes(tanggal17)) {
    console.log(`[Holiday Check] Tanggal 17 adalah hari libur: ${tanggal17}`);
    return true;
  }
  
  // Check if it's Saturday (5) or Sunday (6)
  const date17 = new Date(year, today.getMonth(), 17);
  const dayOfWeek = date17.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log(`[Holiday Check] Tanggal 17 adalah akhir pekan (hari ke-${dayOfWeek})`);
    return true;
  }
  
  console.log(`[Holiday Check] Tanggal 17 adalah hari kerja`);
  return false;
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
    console.log(`[Kebijakan] Initialized ${deviceTokens.filter(t => t.active).length} active devices`);
  } catch (error) {
    console.error("[Kebijakan] Failed to parse device tokens:", error);
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
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // if starts with 62, use as is
  if (digits.startsWith("62")) {
    return digits;
  }
  
  // if starts with 0, replace with 62
  if (digits.startsWith("0")) {
    return "62" + digits.slice(1);
  }
  
  // otherwise prepend 62
  return "62" + digits;
}

/**
 * Build kebijakan message dengan personalisasi
 */
function buildKebijakanMessage(nama: string): string {
  return `Halo ${nama},

📢 *Pengumuman Kebijakan - Hari Bhakti Korps Pegawai Negeri Sipil*

Sehubungan dengan Hari Bhakti Korps Pegawai Negeri Sipil, kami menginformasikan bahwa pada tanggal *17 Februari 2026* (Kamis) seluruh pegawai diwajibkan memakai **Pakaian Dinas Korpri**.

Pakaian Dinas Korpri adalah simbol kebanggaan kami sebagai PNS. Mari kita tunjukkan dedikasi dan profesionalisme dengan memakai pakaian dinas dengan rapi dan sesuai ketentuan.

Terima kasih atas perhatian dan dukungannya.

Salam *Kecap Maja.*
_Kerja Efisien, Cepat, Akurat, Profesional_
_Maju Aman Jeung Amanah_`;
}

// ==================== MAIN FUNCTION ====================
serve(async (req: Request) => {
  try {
    // Initialize device tokens
    initializeDeviceTokens();
    
    if (deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Fonnte devices available" }),
        { status: 503 }
      );
    }

    console.log("[Kebijakan Notifications] Starting execution...");

    // Check if tanggal 17 is a holiday
    if (isTanggal17Holiday()) {
      console.log("[Kebijakan Notifications] ⚠️ Tanggal 17 adalah hari libur/akhir pekan. Notifikasi TIDAK dikirim.");
      return new Response(
        JSON.stringify({ 
          status: "skipped",
          reason: "Tanggal 17 adalah hari libur atau akhir pekan",
          sent: 0
        }),
        { status: 200 }
      );
    }

    console.log("[Kebijakan Notifications] Fetching MASTER.ORGANIK data...");
    
    // Fetch all active employees from Google Sheets (MASTER.ORGANIK) - SESUAI HOME.TSX
    const { data: sheetsData, error: sheetsError } = await supabase.functions.invoke("google-sheets", {
      body: {
        operation: "read",
        spreadsheetId: "1rw_Ly0rI2RXCf4rPfEn1ryP7fV5YZqKvjhH6J_KYtKk", // MASTER.ORGANIK
        range: "MASTER.ORGANIK" // Full sheet (include header like Home.tsx)
      },
    });

    if (sheetsError || !sheetsData?.data) {
      throw new Error(`Failed to fetch data: ${sheetsError?.message || "Unknown error"}`);
    }

    // Parse employee data - SESUAI HOME.TSX INDEXING
    const karyawanList: Karyawan[] = [];
    const karyawanUltah: Karyawan[] = [];
    
    const rows = sheetsData.data || [];
    if (rows.length <= 1) {
      console.log("[Kebijakan Notifications] No data found in MASTER.ORGANIK");
      return new Response(
        JSON.stringify({ error: "No employees found", sent: 0 }),
        { status: 400 }
      );
    }

    // Skip header row (slice dari index 1)
    const pegawaiData = rows.slice(1);
    
    for (const row of pegawaiData) {
      if (!row || row.length < 9) continue;
      
      // Column indices sesuai Home.tsx:
      // row[1] atau row[2] = NIP (Column B atau C)
      // row[3] = Nama (Column D)
      // row[4] = Jabatan (Column E)
      // row[5] = Unit/Satker (Column F)
      // row[7] = Golongan/Pangkat (Column H)
      // row[8] = No. HP (Column I)
      
      const nip = row[2] || row[1]; // Kolom NIP (index 2) atau NIP BPS (index 1)
      const nama = row[3] || "";
      const jabatan = row[4] || "";
      const satker = row[5]?.toString().trim() || "";
      const golongan = row[7]?.toString().trim() || ""; // PANGKAT/GOLONGAN (Column H)
      const no_hp = row[8]?.toString().trim();
      
      if (!nip || !nama || !no_hp) continue;
      
      const karyawan: Karyawan = {
        nip: nip.toString(),
        nama: nama.toString(),
        no_hp: normalizePhoneNumber(no_hp),
        jabatan: jabatan.toString(),
        golongan: golongan,
        satker: satker,
      };
      
      // Extract birth date from NIP and check birthday
      const tanggalLahir = extractTanggalLahirFromNIP(nip);
      if (tanggalLahir) {
        karyawan.tanggalLahir = tanggalLahir;
        karyawan.umur = hitungUmur(tanggalLahir);
        karyawan.isBirthday = isHariIniUlangTahun(tanggalLahir);
        
        if (karyawan.isBirthday) {
          karyawanUltah.push(karyawan);
          console.log(`🎉 Birthday detected: ${nama} (${karyawan.umur} tahun)`);
        }
      }
      
      karyawanList.push(karyawan);
    }

    console.log(`[Kebijakan Notifications] Total karyawan: ${karyawanList.length}`);
    console.log(`[Kebijakan Notifications] Karyawan yang berulang tahun hari ini: ${karyawanUltah.length}`);

    if (karyawanList.length === 0) {
      return new Response(
        JSON.stringify({ error: "No employees found", sent: 0 }),
        { status: 400 }
      );
    }

    // Send notifications in two phases
    let sentCount = 0;
    let failedCount = 0;
    const results: { nip: string; nama: string; messageType: string; status: string; error?: string }[] = [];

    // PHASE 1: Send birthday greetings (if exist)
    console.log(`[Birthday Phase] Sending birthday greetings to ${karyawanUltah.length} employees...`);
    for (const emp of karyawanUltah) {
      try {
        const device = selectBestDevice();
        if (!device) {
          failedCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            messageType: "birthday",
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
            messageType: "birthday",
            status: "sent",
          });
          console.log(`🎉 Birthday greeting sent to ${emp.nama} (${emp.umur} tahun) via ${device.name}`);
        } else {
          failedCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            messageType: "birthday",
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
          messageType: "birthday",
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
        console.error(`Error sending birthday to ${emp.nama}:`, err);
      }
    }

    // PHASE 2: Send kebijakan notifications to all employees (including those with birthdays)
    console.log(`[Kebijakan Phase] Sending kebijakan notifications to ${karyawanList.length} employees...`);
    for (const emp of karyawanList) {
      try {
        const device = selectBestDevice();
        if (!device) {
          failedCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            messageType: "kebijakan",
            status: "failed",
            error: "No device available",
          });
          continue;
        }

        const message = buildKebijakanMessage(emp.nama);
        const success = await sendViaFonnte(emp.no_hp, message, device);

        if (success) {
          sentCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            messageType: "kebijakan",
            status: "sent",
          });
          console.log(`✓ Kebijakan sent to ${emp.nama} (${emp.nip}) via ${device.name}`);
        } else {
          failedCount++;
          results.push({
            nip: emp.nip,
            nama: emp.nama,
            messageType: "kebijakan",
            status: "failed",
            error: "Fonnte API error",
          });
          console.log(`✗ Kebijakan failed: ${emp.nama} (${emp.nip})`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        failedCount++;
        results.push({
          nip: emp.nip,
          nama: emp.nama,
          messageType: "kebijakan",
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
        console.error(`Error sending kebijakan to ${emp.nama}:`, err);
      }
    }

    console.log(`[Kebijakan Notifications] Complete. Sent: ${sentCount}/${karyawanList.length * 2}, Failed: ${failedCount}`);

    // Count by message type
    const birthdayResults = results.filter(r => r.messageType === 'birthday');
    const kebijakanResults = results.filter(r => r.messageType === 'kebijakan');
    const birthdaySent = birthdayResults.filter(r => r.status === 'sent').length;
    const kebijakanSent = kebijakanResults.filter(r => r.status === 'sent').length;

    return new Response(
      JSON.stringify({
        status: "success",
        sent: sentCount,
        failed: failedCount,
        total: karyawanList.length,
        breakdown: {
          birthday: {
            count: karyawanUltah.length,
            sent: birthdaySent,
            failed: karyawanUltah.length - birthdaySent
          },
          kebijakan: {
            total: karyawanList.length,
            sent: kebijakanSent,
            failed: karyawanList.length - kebijakanSent
          }
        },
        results: results.slice(0, 20), // Return first 20 for logging
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[Kebijakan Notifications Error]", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});
