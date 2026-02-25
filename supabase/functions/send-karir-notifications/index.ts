/**
 * Supabase Edge Function: Send WA Notifications untuk Kenaikan Karir
 * Trigger: Cron job setiap tanggal 1 pukul 08:00-09:00
 * 
 * UPDATED: Support CPNS II/c exception (40 AK instead of 60 AK)
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
const fontneApiKey = Deno.env.get("FONNTE_API_KEY") || "";

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
 * CPNS II/c exception: HANYA jika tmtPns === tmtPangkat, maka kebutuhan = 40 AK
 */
function getKebutuhanJabatanTerampil(golongan: string, tmtPns?: string, tmtPangkat?: string): number {
  // Exception: CPNS II/c (start dari II/c dengan tmtPns === tmtPangkat)
  if (
    golongan === 'II/c' && 
    tmtPns && 
    tmtPangkat && 
    tmtPns === tmtPangkat
  ) {
    return 40; // CPNS dari II/c hanya butuh 40 AK
  }
  return 60; // Normal untuk yang lain
}

function hitungAKTambahan(karyawan: Karyawan, predikatAsumsi: number = 1.0): number {
  const tglPenghitunganTerakhir = parseTanggalIndonesia(karyawan.tglPenghitunganAkTerakhir);
  const hariIni = new Date();
  
  if (tglPenghitunganTerakhir > hariIni) return 0;
  
  const selisihBulan = hitungSelisihBulan(tglPenghitunganTerakhir, hariIni);
  if (selisihBulan <= 0) return 0;

  const koefisien = 5.0; // Terampil
  const akPerBulan = predikatAsumsi * koefisien / 12;
  const akTambahan = selisihBulan * akPerBulan;

  return Number(akTambahan.toFixed(3));
}

function cekKaryawanBisaUsul(karyawan: Karyawan, predikatAsumsi: number = 1.0) {
  if (karyawan.kategori === 'Reguler') {
    return { bisaUsul: false, type: null, bulanDibutuhkan: 999 };
  }

  // Untuk Terampil yang ingin naik ke Mahir
  const kebutuhanJabatan = getKebutuhanJabatanTerampil(karyawan.golongan, karyawan.tmtPns, karyawan.tmtPangkat);
  
  const akTambahan = hitungAKTambahan(karyawan, predikatAsumsi);
  const akRealSaatIni = karyawan.akKumulatif + akTambahan;
  const kekuranganJabatan = Math.max(0, kebutuhanJabatan - akRealSaatIni);

  const koefisien = 5.0; // Terampil
  const akPerBulan = predikatAsumsi * koefisien / 12;
  const bulanDibutuhkan = akPerBulan > 0 ? Math.ceil(kekuranganJabatan / akPerBulan) : 999;

  const bisaUsulJabatan = akRealSaatIni >= kebutuhanJabatan && kebutuhanJabatan > 0;
  const dalamTigaBulan = bulanDibutuhkan > 0 && bulanDibutuhkan <= 3;

  return {
    bisaUsul: bisaUsulJabatan || dalamTigaBulan,
    type: bisaUsulJabatan ? 'sekarang' : 'dalam_3_bulan',
    bulanDibutuhkan: bulanDibutuhkan,
    akRealSaatIni: akRealSaatIni,
    kebutuhanJabatan: kebutuhanJabatan
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

async function sendWAViaFonnte(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': fontneApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phoneNumber,
        message: message,
        countryCode: '62'
      })
    });

    const data = await response.json();
    console.log(`[WA Sent] To: ${phoneNumber}, Status: ${data.status}`);
    
    return data.status === 'success' || response.ok;
  } catch (error) {
    console.error(`[WA Error] Failed to send to ${phoneNumber}:`, error);
    return false;
  }
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

  let message = `Halo ${karyawan.nama.split(' ')[0]}, 👋\n\n`;
  message += `Kabar baik! Status kenaikan karir Anda:\n\n`;
  message += `📊 *Posisi Saat Ini*\n`;
  message += `Jabatan: ${karyawan.jabatan}\n`;
  message += `Pangkat: ${karyawan.golongan}\n\n`;

  if (estimasi.type === 'sekarang') {
    message += `✅ *Anda SUDAH BISA mengajukan kenaikan!*\n`;
    message += `Hubungi PPK atau kunjungi aplikasi untuk process selanjutnya.\n\n`;
  } else if (estimasi.type === 'dalam_3_bulan') {
    message += `⏳ *Dalam ${formatEstimasiWaktu(estimasi.bulanDibutuhkan)}*\n`;
    message += `Anda akan memenuhi syarat kenaikan!\n\n`;
  }

  message += `📱 Pantau progress lengkap di:\n${appLink}\n\n`;
  message += `Pertanyaan? Hubungi PPK di satuan kerja Anda.\n`;
  message += `\n_Pesan otomatis dari Sistem Karir_`;

  return message;
}

// ==================== MAIN FUNCTION ====================

serve(async (req: Request) => {
  try {
    console.log('[Karir Notifications] Starting execution...');

    const results: any[] = [];
    const now = new Date();

    // 1. FETCH DATA (placeholder - sesuaikan dengan logic Anda)
    console.log('[Karir Notifications] Fetching data...');
    
    const karyawanList: Karyawan[] = [];
    // TODO: Fetch dari Google Sheets atau Database

    // 2. FILTER & PROCESS
    for (const karyawan of karyawanList) {
      if (!karyawan.no_hp || karyawan.no_hp.trim() === '') {
        console.log(`[Skip] ${karyawan.nama}: No HP not found`);
        continue;
      }

      const estimasi = cekKaryawanBisaUsul(karyawan);

      if (estimasi.bisaUsul) {
        const noHpNormalized = normalizePhoneNumber(karyawan.no_hp);
        const message = buildMessage(karyawan, estimasi);
        const sent = await sendWAViaFonnte(noHpNormalized, message);

        results.push({
          nip: karyawan.nip,
          nama: karyawan.nama,
          no_hp: noHpNormalized,
          type: 'jabatan',
          estimasi_bulan: estimasi.bulanDibutuhkan,
          sent: sent,
          kebutuhan_ak: estimasi.kebutuhanJabatan
        });

        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`[Karir Notifications] Complete. Sent: ${results.filter((r: any) => r.sent).length}/${results.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: results.length,
        sent: results.filter((r: any) => r.sent).length,
        results: results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Karir Notifications Error]', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
