/**
 * Supabase Edge Function: Send WA Notifications untuk Kenaikan Karir
 * Trigger: Cron job setiap tanggal 1 pukul 08:00 WIB (0 1 1 * * UTC)
 * 
 * FITUR:
 * - Identifikasi karyawan kategori Keahlian/Keterampilan yang akan memenuhi syarat kenaikan jabatan/pangkat dalam 1-6 bulan
 * - Support dual kenaikan: jabatan + pangkat (combined notification jika bersamaan)
 * - Support CPNS II/c exception (40 AK instead of 60 AK)
 * - Device rotation strategy dengan rate limiting (15/jam per device)
 * - Retry mechanism dengan exponential backoff
 * - Detailed logging untuk all sends (success/failed)
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
  pangkat: string;
  golongan: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  tglPenghitunganAkTerakhir: string;
  akKumulatif: number;
  tmtPns?: string;
  tmtPangkat?: string;
}

interface DeviceToken {
  name: string;
  token: string;
  active: boolean;
  usageCount?: number;
  lastUsed?: string;
  isOnCooldown?: boolean;
}

// ==================== HELPER FUNCTIONS ====================

function parseTanggalIndonesia(tanggal: string): Date {
  if (!tanggal || tanggal.trim() === '') return new Date();
  if (tanggal.includes('-')) {
    const date = new Date(tanggal);
    if (!isNaN(date.getTime())) return date;
  }
  const bulanMap: Record<string, number> = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
    'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
    'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };
  const cleanedDate = tanggal.toLowerCase().trim();
  const parts = cleanedDate.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = bulanMap[parts[1]];
    const year = parseInt(parts[2]);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return new Date();
}

function hitungSelisihBulan(tanggalAwal: Date, tanggalAkhir: Date): number {
  const tahunAwal = tanggalAwal.getFullYear();
  const bulanAwal = tanggalAwal.getMonth();
  const tahunAkhir = tanggalAkhir.getFullYear();
  const bulanAkhir = tanggalAkhir.getMonth();
  return (tahunAkhir - tahunAwal) * 12 + (bulanAkhir - bulanAwal);
}

/**
 * Normalize tanggal ke ISO format (YYYY-MM-DD) untuk perbandingan yang akurat
 */
function normalizeTanggal(tanggal: string): string {
  if (!tanggal) return '';
  
  const cleaned = tanggal.trim();
  
  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  
  // American format (MM/DD/YYYY) - convert to ISO
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [month, day, year] = cleaned.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // European format (DD/MM/YYYY) or (DD.MM.YYYY)
  if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(cleaned)) {
    const parts = cleaned.split(/[\/\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Indonesian format (1 Maret 2022 or 01 Maret 2022)
  const bulanMap: Record<string, string> = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
  };
  const match = cleaned.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (match) {
    const [, day, month, year] = match;
    const monthNum = bulanMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  return cleaned;
}

/**
 * Get koefisien AK berdasarkan jabatan
 * Sesuai dengan Peraturan BKN tentang perhitungan Angka Kredit
 */
function getKoefisien(jabatan: string): number {
  const koefisienMap: Record<string, number> = {
    'Ahli Pertama': 12.5,
    'Ahli Muda': 25.0,
    'Ahli Madya': 37.5,
    'Ahli Utama': 50.0,
    'Terampil': 5.0,
    'Mahir': 12.5,
    'Penyelia': 25.0,
    'Fungsional Umum': 5.0
  };
  
  for (const [key, value] of Object.entries(koefisienMap)) {
    if (jabatan.includes(key)) return value;
  }
  
  // Default fallback
  if (jabatan.includes('Ahli')) return 12.5;
  if (jabatan.includes('Penyelia')) return 25.0;
  if (jabatan.includes('Mahir')) return 12.5;
  if (jabatan.includes('Terampil')) return 5.0;
  
  return 12.5;
}

/**
 * Get kebutuhan pangkat berdasarkan golongan saat ini dan kategori
 */
function getKebutuhanPangkat(golongan: string, kategori: string): number {
  if (kategori === 'Reguler') return 0;
  
  const kebutuhanKeahlian: Record<string, number> = {
    'III/a': 50, 'III/b': 50, 'III/c': 100, 'III/d': 100,
    'IV/a': 150, 'IV/b': 150, 'IV/c': 150, 'IV/d': 200
  };
  const kebutuhanKeterampilan: Record<string, number> = {
    'II/a': 15, 'II/b': 20, 'II/c': 20, 'II/d': 20,
    'III/a': 50, 'III/b': 50, 'III/c': 100
  };
  
  const kebutuhan = kategori === 'Keahlian' ? kebutuhanKeahlian : kebutuhanKeterampilan;
  return kebutuhan[golongan] || 0;
}

/**
 * Get kebutuhan jabatan berdasarkan jabatan saat ini dan kategori
 * CPNS II/c exception: HANYA jika tmtPns === tmtPangkat, maka kebutuhan = 40 AK
 */
function getKebutuhanJabatan(jabatan: string, kategori: string, golongan?: string, tmtPns?: string, tmtPangkat?: string): number {
  if (kategori === 'Reguler') return 0;
  
  const kebutuhanKeahlian: Record<string, number> = {
    'Ahli Pertama': 100,
    'Ahli Muda': 200,
    'Ahli Madya': 450,
    'Ahli Utama': 0
  };
  const kebutuhanKeterampilan: Record<string, number> = {
    'Terampil': 60,
    'Mahir': 100,
    'Penyelia': 0
  };
  
  if (kategori === 'Keahlian') {
    for (const [key, value] of Object.entries(kebutuhanKeahlian)) {
      if (jabatan.includes(key)) return value;
    }
  } else {
    // EXCEPTION: CPNS II/c (tmtPns === tmtPangkat) hanya butuh 40 AK untuk naik ke Mahir
    if (
      jabatan.includes('Terampil') && 
      golongan === 'II/c' && 
      tmtPns && 
      tmtPangkat && 
      normalizeTanggal(tmtPns) === normalizeTanggal(tmtPangkat)
    ) {
      return 40;
    }
    for (const [key, value] of Object.entries(kebutuhanKeterampilan)) {
      if (jabatan.includes(key)) return value;
    }
  }
  return 0;
}

function hitungAKTambahan(karyawan: Karyawan, predikatAsumsi: number = 1.0): number {
  const tglPenghitunganTerakhir = parseTanggalIndonesia(karyawan.tglPenghitunganAkTerakhir);
  const hariIni = new Date();
  
  if (tglPenghitunganTerakhir > hariIni) return 0;
  
  const selisihBulan = hitungSelisihBulan(tglPenghitunganTerakhir, hariIni);
  if (selisihBulan <= 0) return 0;

  const koefisien = getKoefisien(karyawan.jabatan);
  const akPerBulan = predikatAsumsi * koefisien / 12;
  const akTambahan = selisihBulan * akPerBulan;

  return Number(akTambahan.toFixed(3));
}

function cekKaryawanBisaUsul(karyawan: Karyawan, predikatAsumsi: number = 1.0) {
  if (karyawan.kategori === 'Reguler') {
    return { bisaUsul: false, type: null, bulanDibutuhkan: 999 };
  }

  // Hitung AK real saat ini
  const akTambahan = hitungAKTambahan(karyawan, predikatAsumsi);
  const akRealSaatIni = karyawan.akKumulatif + akTambahan;
  const koefisien = getKoefisien(karyawan.jabatan);
  const akPerBulan = predikatAsumsi * koefisien / 12;

  // CEK 1: KENAIKAN JABATAN
  const kebutuhanJabatan = getKebutuhanJabatan(karyawan.jabatan, karyawan.kategori, karyawan.golongan, karyawan.tmtPns, karyawan.tmtPangkat);
  const kekuranganJabatan = Math.max(0, kebutuhanJabatan - akRealSaatIni);
  const bulanUntukJabatan = akPerBulan > 0 ? Math.ceil(kekuranganJabatan / akPerBulan) : 999;
  const bisaUsulJabatan = bulanUntukJabatan >= 1 && bulanUntukJabatan <= 6;

  // CEK 2: KENAIKAN PANGKAT
  const kebutuhanPangkat = getKebutuhanPangkat(karyawan.golongan, karyawan.kategori);
  const kekuranganPangkat = Math.max(0, kebutuhanPangkat - akRealSaatIni);
  const bulanUntukPangkat = akPerBulan > 0 ? Math.ceil(kekuranganPangkat / akPerBulan) : 999;
  const bisaUsulPangkat = bulanUntukPangkat >= 1 && bulanUntukPangkat <= 6;

  // Tentukan tipe notifikasi
  let type = null;
  let bulanDibutuhkan = 999;
  
  if (bisaUsulJabatan && bisaUsulPangkat && bulanUntukJabatan === bulanUntukPangkat) {
    // Kedua-duanya butuh waktu sama → combined notification
    type = 'jabatan_pangkat';
    bulanDibutuhkan = bulanUntukJabatan;
  } else if (bisaUsulJabatan && bulanUntukJabatan <= bulanUntukPangkat) {
    // Hanya jabatan atau jabatan lebih dulu
    type = 'jabatan';
    bulanDibutuhkan = bulanUntukJabatan;
  } else if (bisaUsulPangkat) {
    // Hanya pangkat atau pangkat lebih dulu
    type = 'pangkat';
    bulanDibutuhkan = bulanUntukPangkat;
  }

  return {
    bisaUsul: type !== null,
    type: type,
    bulanDibutuhkan: bulanDibutuhkan,
    akRealSaatIni: akRealSaatIni,
    kebutuhanJabatan: kebutuhanJabatan,
    kebutuhanPangkat: kebutuhanPangkat,
    bulanUntukJabatan: bulanUntukJabatan,
    bulanUntukPangkat: bulanUntukPangkat
  };
}

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

// ==================== FONNTE DEVICE MANAGEMENT ====================

let deviceTokens: DeviceToken[] = [];
let deviceStats = new Map<string, { usageCount: number; lastUsed: Date; onCooldown: boolean }>();
const RATE_LIMIT = { perHour: 15, perDay: 40, cooldownSeconds: 15 };

function initializeDeviceTokens() {
  try {
    const tokens = JSON.parse(fontneDeviceTokens);
    deviceTokens = Array.isArray(tokens) ? tokens : [];
    
    // Initialize stats for each device
    for (const token of deviceTokens) {
      if (token.active) {
        deviceStats.set(token.name, {
          usageCount: token.usageCount || 0,
          lastUsed: token.lastUsed ? new Date(token.lastUsed) : new Date(0),
          onCooldown: false
        });
      }
    }
    console.log(`[Fonnte] Initialized ${deviceTokens.filter(t => t.active).length} active devices`);
  } catch (error) {
    console.error('[Fonnte] Failed to parse device tokens:', error);
    deviceTokens = [];
  }
}

function selectBestDevice(): DeviceToken | null {
  const availableDevices = deviceTokens.filter(t => t.active);
  console.log(`[Device] Available active devices: ${availableDevices.length}`);
  if (availableDevices.length === 0) return null;

  // Select device with weighted distribution (prefer less-used devices)
  const candidates = availableDevices.filter(device => {
    const stats = deviceStats.get(device.name);
    if (!stats) return true;
    
    // Check cooldown (15 seconds between uses)
    if (stats.onCooldown) {
      const timeSinceLastUse = Date.now() - stats.lastUsed.getTime();
      if (timeSinceLastUse < RATE_LIMIT.cooldownSeconds * 1000) {
        console.log(`[Device] ${device.name} is on cooldown`);
        return false;
      }
      stats.onCooldown = false;
    }
    
    return true;
  });

  console.log(`[Device] Candidates after cooldown check: ${candidates.length}`);
  if (candidates.length === 0) return null;

  // True random selection with weighted distribution (prefer less-used devices)
  // Calculate weight: less usage = higher probability
  const weights = candidates.map(device => {
    const usage = deviceStats.get(device.name)?.usageCount || 0;
    return Math.max(1, 10 - usage); // Weight: 10 = unused, 1 = heavily used
  });
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  console.log(`[Device] Weights: ${candidates.map((d, i) => `${d.name}=${weights[i]}`).join(', ')}, Random: ${random.toFixed(2)} of ${totalWeight}`);
  
  for (let i = 0; i < candidates.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      console.log(`[Device] Selected device: ${candidates[i].name}`);
      return candidates[i];
    }
  }
  
  // Fallback (should never reach here)
  const fallback = candidates[Math.floor(Math.random() * candidates.length)];
  console.log(`[Device] Fallback selection: ${fallback.name}`);
  return fallback;
}

async function sendWAViaFonnte(
  phoneNumber: string,
  message: string,
  retryCount: number = 0
): Promise<{ success: boolean; device: string | null }> {
  const maxRetries = 2;

  try {
    const device = selectBestDevice();
    if (!device) {
      console.error('[Fonnte] No available devices');
      return { success: false, device: null };
    }

    const stats = deviceStats.get(device.name);
    if (!stats) {
      return { success: false, device: null };
    }

    // Check rate limits
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (stats.lastUsed > hourAgo && stats.usageCount >= RATE_LIMIT.perHour) {
      console.warn(`[Fonnte] Device ${device.name} rate-limited (hourly)`);
      if (retryCount < maxRetries) {
        const delay = retryCount === 0 ? 10000 : 20000 + Math.random() * 70000; // 10s or 20-90s
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendWAViaFonnte(phoneNumber, message, retryCount + 1);
      }
      return { success: false, device: device.name };
    }

    // Send via Fonnte
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': device.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phoneNumber,
        message: message,
        countryCode: '62'
      })
    });

    const data = await response.json();
    
    // Update stats
    stats.usageCount++;
    stats.lastUsed = new Date();
    stats.onCooldown = true;

    // DEBUG: Log Fonnte response (status is BOOLEAN, not string)
    console.log(`[Fonnte] Response for ${phoneNumber}: status=${data.status}, message=${data.message}`);

    if (data.status === true && response.ok) {
      console.log(`[Fonnte] ✅ Sent via ${device.name} to ${phoneNumber}`);
      return { success: true, device: device.name };
    } else if (response.status === 429) {
      // Rate limit hit - mark device and retry
      console.warn(`[Fonnte] Rate limit on ${device.name}, retrying...`);
      if (retryCount < maxRetries) {
        const delay = 20000 + Math.random() * 70000; // 20-90s
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendWAViaFonnte(phoneNumber, message, retryCount + 1);
      }
      return { success: false, device: device.name };
    } else {
      console.error(`[Fonnte] Failed: ${data.status || response.statusText}`);
      return { success: false, device: device.name };
    }
  } catch (error) {
    console.error(`[Fonnte] Error:`, error);
    if (retryCount < maxRetries) {
      const delay = retryCount === 0 ? 10000 : 20000 + Math.random() * 70000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendWAViaFonnte(phoneNumber, message, retryCount + 1);
    }
    return { success: false, device: null };
  }
}

function getJabatanBerikutnya(jabatanSekarang: string, kategori: string): string {
  if (kategori === 'Reguler') return 'Tidak berlaku';
  
  const progressionKeahlian: Record<string, string> = {
    'Ahli Pertama': 'Ahli Muda',
    'Ahli Muda': 'Ahli Madya',
    'Ahli Madya': 'Ahli Utama',
    'Ahli Utama': 'Tidak Ada'
  };
  
  const progressionKeterampilan: Record<string, string> = {
    'Terampil': 'Mahir',
    'Mahir': 'Penyelia',
    'Penyelia': 'Tidak Ada'
  };
  
  if (kategori === 'Keahlian') {
    for (const [key, value] of Object.entries(progressionKeahlian)) {
      if (jabatanSekarang.includes(key)) return value;
    }
  } else if (kategori === 'Keterampilan') {
    for (const [key, value] of Object.entries(progressionKeterampilan)) {
      if (jabatanSekarang.includes(key)) return value;
    }
  }
  
  return 'Tidak Diketahui';
}

function getGolonganBerikutnya(golonganSekarang: string, kategori: string): string {
  if (kategori === 'Reguler') {
    const progressionReguler: Record<string, string> = {
      'II/a': 'II/b', 'II/b': 'II/c', 'II/c': 'II/d', 'II/d': 'III/a',
      'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a',
      'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
    };
    return progressionReguler[golonganSekarang] || 'Tidak Ada';
  }
  
  const progressionKeahlian: Record<string, string> = {
    'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d', 'III/d': 'IV/a',
    'IV/a': 'IV/b', 'IV/b': 'IV/c', 'IV/c': 'IV/d', 'IV/d': 'IV/e'
  };
  
  const progressionKeterampilan: Record<string, string> = {
    'II/a': 'II/b', 'II/b': 'II/c', 'II/c': 'II/d', 'II/d': 'III/a',
    'III/a': 'III/b', 'III/b': 'III/c', 'III/c': 'III/d'
  };
  
  const progression = kategori === 'Keahlian' ? progressionKeahlian : progressionKeterampilan;
  return progression[golonganSekarang] || 'Tidak Ada';
}

function formatEstimasiWaktu(bulan: number): string {
  if (bulan <= 0) return 'Sekarang';
  if (bulan === 1) return '1 bulan';
  if (bulan <= 3) return `${bulan} bulan`;
  
  const tahun = Math.floor(bulan / 12);
  const bulanSisa = bulan % 12;
  
  if (tahun > 0 && bulanSisa > 0) return `${tahun} tahun ${bulanSisa} bulan`;
  if (tahun > 0) return `${tahun} tahun`;
  return `${bulan} bulan`;
}

function buildMessage(karyawan: Karyawan, estimasi: any): string {
  const appLink = 'https://kecapmaja.app/KarierKu';
  
  // Handle undefined values - use safe defaults
  const golonganSaat = karyawan.golongan || 'Tidak tersedia';
  const kategoriSaat = karyawan.kategori || 'Reguler';
  
  const jabatanBerikutnya = getJabatanBerikutnya(karyawan.jabatan, kategoriSaat);
  const golonganBerikutnya = getGolonganBerikutnya(golonganSaat, kategoriSaat);

  let message = `Halo ${karyawan.nama.split(' ')[0]}, 👋\n\n`;
  message += `Kabar baik! Status kenaikan karir Anda:\n\n`;
  message += `📊 *Posisi Saat Ini*\n`;
  message += `Jabatan: ${karyawan.jabatan}\n`;
  message += `Pangkat: ${golonganSaat}\n\n`;

  // Check if karyawan qualifies for advancement in next 6 months
  if (estimasi.type === 'jabatan_pangkat') {
    // Kedua-duanya akan memenuhi syarat dalam waktu sama
    message += `📊 *Posisi yang akan diperoleh dalam ${formatEstimasiWaktu(estimasi.bulanDibutuhkan)}*:\n`;
    message += `Jabatan: ${jabatanBerikutnya}\n`;
    message += `Pangkat: ${golonganBerikutnya}\n\n`;
    message += `🎯 *Syarat yang diperlukan:*\n`;
    message += `  • Kenaikan Jabatan: ${estimasi.kebutuhanJabatan} AK\n`;
    message += `  • Kenaikan Pangkat: ${estimasi.kebutuhanPangkat} AK\n\n`;
    message += `📋 *Persiapkan dokumen untuk kedua usulan:*\n`;
    message += `  • SK Kenaikan Jabatan\n`;
    message += `  • SK Kenaikan Pangkat\n\n`;
  } else if (estimasi.type === 'jabatan') {
    message += `📊 *Posisi yang akan diperoleh dalam ${formatEstimasiWaktu(estimasi.bulanDibutuhkan)}*:\n`;
    message += `Jabatan: ${jabatanBerikutnya}\n`;
    message += `Pangkat: ${golonganSaat}\n\n`;
    message += `🎯 *Syarat yang diperlukan:*\n`;
    message += `  • Kenaikan Jabatan: ${estimasi.kebutuhanJabatan} AK\n\n`;
    message += `📋 *Siapkan dokumen usulan kenaikan jabatan*\n`;
    message += `  • SK Kenaikan Jabatan\n`;
    message += `  • Bukti AK Kumulatif\n\n`;
  } else if (estimasi.type === 'pangkat') {
    message += `📊 *Posisi yang akan diperoleh dalam ${formatEstimasiWaktu(estimasi.bulanDibutuhkan)}*:\n`;
    message += `Jabatan: ${karyawan.jabatan}\n`;
    message += `Pangkat: ${golonganBerikutnya}\n\n`;
    message += `🎯 *Syarat yang diperlukan:*\n`;
    message += `  • Kenaikan Pangkat: ${estimasi.kebutuhanPangkat} AK\n\n`;
    message += `📋 *Siapkan dokumen usulan kenaikan pangkat*\n`;
    message += `  • SK Kenaikan Pangkat\n`;
    message += `  • Bukti AK Kumulatif\n\n`;
  } else {
    // Fallback: karyawan belum memenuhi syarat dalam 6 bulan ke depan
    message += `⚠️ *Status Kenaikan*\n`;
    message += `Anda saat ini belum memenuhi syarat kenaikan dalam 6 bulan ke depan.\n\n`;
    message += `💪 *Tips Pengembangan Karir*\n`;
    message += `Terus tingkatkan pencapaian dan kinerja Anda untuk meraih target karier. Pantau perkembangan AK Anda secara berkala.\n\n`;
  }

  message += `📱 Pantau progress lengkap di:\n${appLink}\n\n`;
  message += `Pertanyaan? Hubungi PPK di satuan kerja Anda.\n`;
  message += `\n_Pesan otomatis dari Sistem Karir_`;

  return message;
}

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

// ==================== MAIN FUNCTION ====================

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    console.log('[Karir Notifications] Starting execution...');
    
    // Parse request body
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // No body is ok
    }

    const { testMode, testRecipient } = body as any;
    
    // Initialize Fonnte device tokens
    initializeDeviceTokens();

    // TEST MODE: Send only to specific recipient
    if (testMode && testRecipient) {
      console.log('[Test Mode] Sending test message to:', testRecipient.nama);
      console.log('[Test Mode] Received testRecipient:', JSON.stringify(testRecipient, null, 2));
      
      const device = selectBestDevice();
      if (!device) {
        return createCorsResponse({ error: "No available Fonnte devices" }, 503);
      }
      console.log(`[Test Mode] Selected device: ${device.name}`);

      // Create test message - use real data from frontend with sensible defaults
      const testEmployee = {
        ...testRecipient,
        akKumulatif: testRecipient.akKumulatif ?? 35,
        kategori: testRecipient.kategori ?? 'Reguler',
        tglPenghitunganAkTerakhir: testRecipient.tglPenghitunganAkTerakhir ?? new Date().toISOString().split('T')[0],
        tmtPns: testRecipient.tmtPns ?? '',
        tmtPangkat: testRecipient.tmtPangkat ?? ''
      };
      
      console.log(`[Test Mode] Final testEmployee: kategori=${testEmployee.kategori}, ak=${testEmployee.akKumulatif}, golongan=${testEmployee.golongan}`);
      const estimasi = cekKaryawanBisaUsul(testEmployee);
      console.log(`[Test Mode] Estimation result: bisaUsul=${estimasi.bisaUsul}, type=${estimasi.type}, bulan=${estimasi.bulanDibutuhkan}, akReal=${estimasi.akRealSaatIni}`);
      const message = buildMessage(testEmployee, estimasi);
      console.log(`[Test Mode] Generated message (first 200 chars): ${message.substring(0, 200)}...`);
      
      const result = await sendWAViaFonnte(testEmployee.no_hp, message);

      if (result.success) {
        console.log(`[Test Mode] ✅ Message sent via ${result.device}`);
        return createCorsResponse({
          success: true,
          testMode: true,
          sent: 1,
          recipient: testEmployee.nama,
          phone: testEmployee.no_hp,
          device: result.device,
          estimasi: {
            bisaUsul: estimasi.bisaUsul,
            type: estimasi.type,
            bulanDibutuhkan: estimasi.bulanDibutuhkan,
            akRealSaatIni: estimasi.akRealSaatIni,
            kebutuhanJabatan: estimasi.kebutuhanJabatan,
            kebutuhanPangkat: estimasi.kebutuhanPangkat
          },
          receivedData: testRecipient,
          timestamp: new Date().toISOString()
        }, 200);
      } else {
        return createCorsResponse({
          success: false,
          testMode: true,
          error: "Failed to send via Fonnte",
          recipient: testEmployee.nama,
          phone: testEmployee.no_hp,
          estimasi: estimasi
        }, 500);
      }
    }

    // NORMAL MODE: Continue with regular processing
    const results: any[] = [];
    const now = new Date();

    // 1. FETCH DATA dari Google Sheets via invoke function
    console.log('[Karir Notifications] Fetching MASTER.ORGANIK data...');
    
    let karyawanList: Karyawan[] = [];
    try {
      // Default spreadsheetId untuk MASTER.ORGANIK (BPS Pusat)
      const DEFAULT_ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
      
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          operation: 'read',
          spreadsheetId: DEFAULT_ORGANIK_SHEET_ID,
          range: 'MASTER.ORGANIK'
        }
      });
      
      if (error) {
        console.error('[Sheets] Fetch error:', error);
      } else if (data && data.length > 0) {
        // Transform Google Sheets data to Karyawan interface
        // Assuming data returns rows where each row is an array [col0, col1, col2, ...]
        const rows = data as any[];
        const headerRow = rows[0] || [];
        const dataRows = rows.slice(1) || [];
        
        // Build header index map for flexible column lookup
        const headerMap: Record<string, number> = {};
        headerRow.forEach((header: any, idx: number) => {
          if (header) {
            headerMap[String(header).toUpperCase().trim()] = idx;
          }
        });
        
        console.log(`[Sheets] Header columns found: ${Object.keys(headerMap).join(', ')}`);
        
        karyawanList = dataRows
          .filter((row: any) => row && row.length > 2 && row[headerMap['NIP'] || 0])
          .map((row: any) => ({
            nip: row[headerMap['NIP'] || 0]?.toString() || '',
            nama: row[headerMap['NAMA'] || 1]?.toString() || '',
            no_hp: (row[headerMap['NO_HP'] || headerMap['TELEPON'] || 8]?.toString() || '').trim(),
            pangkat: row[headerMap['PANGKAT'] || 6]?.toString() || '',
            golongan: row[headerMap['GOLONGAN'] || 7]?.toString() || '',
            jabatan: row[headerMap['JABATAN'] || 4]?.toString() || '',
            kategori: (row[headerMap['KATEGORI'] || 9]?.toString() || 'Reguler') as any,
            tglPenghitunganAkTerakhir: row[headerMap['TGL_PENGHITUNGAN_AK_TERAKHIR'] || 10]?.toString() || new Date().toISOString().split('T')[0],
            akKumulatif: parseFloat(row[headerMap['AK_KUMULATIF'] || 11] || 0),
            tmtPns: row[headerMap['TMT_PNS'] || 12]?.toString() || '',
            tmtPangkat: row[headerMap['TMT_PANGKAT'] || 13]?.toString() || ''
          }))
          .filter((emp: Karyawan) => emp.nip && emp.nama && emp.no_hp);
        
        console.log(`[Sheets] Fetched ${karyawanList.length} employees from ${dataRows.length} data rows`);
      }
    } catch (fetchError) {
      console.error('[Sheets] Invoke error:', fetchError);
      // Continue dengan data kosong - akan return empty results
    }

    // 2. FILTER & PROCESS
    console.log('[Karir Notifications] Processing candidates...');
    
    for (const karyawan of karyawanList) {
      if (!karyawan.no_hp || karyawan.no_hp.trim() === '') {
        console.log(`[Skip] ${karyawan.nama} (${karyawan.nip}): No HP not found`);
        continue;
      }

      const estimasi = cekKaryawanBisaUsul(karyawan);

      if (estimasi.bisaUsul) {
        const noHpNormalized = normalizePhoneNumber(karyawan.no_hp);
        const message = buildMessage(karyawan, estimasi);
        const sendResult = await sendWAViaFonnte(noHpNormalized, message);

        results.push({
          nip: karyawan.nip,
          nama: karyawan.nama,
          no_hp: noHpNormalized,
          type: 'jabatan',
          estimasi_bulan: estimasi.bulanDibutuhkan,
          sent: sendResult.success,
          device: sendResult.device,
          kebutuhan_ak: estimasi.kebutuhanJabatan,
          ak_sekarang: estimasi.akRealSaatIni,
          timestamp: new Date().toISOString()
        });

        // Cooldown between sends to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 3. LOG RESULTS (optional: write to NOTIF_LOG sheet)
    const sentCount = results.filter((r: any) => r.sent).length;
    console.log(`[Karir Notifications] Complete. Sent: ${sentCount}/${results.length} dari ${karyawanList.length} candidates`);

    // Log to NOTIF_LOG if available
    if (results.length > 0) {
      try {
        await supabase.functions.invoke('google-sheets', {
          body: {
            action: 'append',
            sheet: 'NOTIF_LOG',
            data: results.map((r: any) => ({
              TIMESTAMP: r.timestamp,
              TIPE_NOTIF: 'KARIR',
              NIP: r.nip,
              NAMA: r.nama,
              NO_HP: r.no_hp,
              STATUS: r.sent ? 'SUCCESS' : 'FAILED',
              DEVICE: r.device || 'N/A',
              PESAN: `${r.type} - ${r.estimasi_bulan} bulan`
            }))
          }
        });
        console.log('[Log] Results logged to NOTIF_LOG');
      } catch (logError) {
        console.warn('[Log] Failed to log results:', logError);
        // Don't fail the entire function if logging fails
      }
    }

    return createCorsResponse({
      success: true,
      timestamp: now.toISOString(),
      totalEmployees: karyawanList.length,
      totalCandidates: results.length,
      totalSent: sentCount,
      results: results
    }, 200);

  } catch (error) {
    console.error('[Karir Notifications Error]', error);
    return createCorsResponse({ 
      success: false, 
      error: String(error),
      timestamp: new Date().toISOString()
    }, 500);
  }
});
