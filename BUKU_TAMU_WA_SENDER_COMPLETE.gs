// ========================================================
// BUKU TAMU - WA SENDER NOTIFIKASI TAMU & TUJUAN
// VERSION: 100 PESAN/HARI DENGAN RANDOM SELECTION
// FIX: KEPENTINGAN FORMATTER (NUMBERED LIST untuk multiple)
// FIX: TUJUAN OPTIONAL - ALWAYS SEND TO TAMU
// ========================================================

const CONFIG = {
  // =============================================
  // ⚠️ HANYA EDIT BAGIAN INI SAJA ⚠️
  // =============================================
  DEVICE_TOKENS: [
    {
      name: "KECAP MAJA-1",
      token: "GcrkkR51srYTi4KHanu5",
      active: true,
      stats: { sent: 0, failed: 0, lastUsed: null }
    },
    {
      name: "KECAP MAJA-2",
      token: "ewRtNykz8LxzMaiGoKRs",
      active: true,
      stats: { sent: 0, failed: 0, lastUsed: null }
    },
    {
      name: "KECAP MAJA-3",
      token: "atFkGTx9WDdhZkKNdEox",
      active: true,
      stats: { sent: 0, failed: 0, lastUsed: null }
    },
    {
      name: "KECAP MAJA-4",
      token: "DE3t6QzC88eLpqz1Tw1y",
      active: true,
      stats: { sent: 0, failed: 0, lastUsed: null }
    },
    {
      name: "KECAP MAJA-5",
      token: "Cy5Fwj5gbscfi8B97RDc",
      active: true,
      stats: { sent: 0, failed: 0, lastUsed: null }
    }
  ],
  // =============================================
  // ⚠️ JANGAN EDIT SETELAH BARIS INI ⚠️
  // =============================================
  
  // AUTO-CALCULATED SETTINGS
  get FONNTE_URL() { return "https://api.fonnte.com/send"; },
  get SHEET_BUKU_TAMU() { return "Sheet1"; },
  get SHEET_LOGS() { return "BUKU_TAMU_LOGS"; },
  
  // ⭐⭐ BATASAN: 100 pesan per hari (untuk TAMU + TUJUAN) ⭐⭐
  get MAX_HOURLY_PER_DEVICE() { return 20; },
  get MAX_DAILY_PER_DEVICE() { return 100; },
  get HOUR_IN_MS() { return 60 * 60 * 1000; },
  
  // ⭐⭐ DELAY SETTINGS ⭐⭐
  get MIN_DELAY() { 
    const activeCount = this.DEVICE_TOKENS.filter(d => d.active).length;
    return activeCount === 1 ? 15000 : 10000;
  },
  get BASE_DELAY() { 
    const activeCount = this.DEVICE_TOKENS.filter(d => d.active).length;
    return activeCount === 1 ? 20000 : 15000;
  },
  get MAX_DELAY() { 
    const activeCount = this.DEVICE_TOKENS.filter(d => d.active).length;
    return activeCount === 1 ? 30000 : 25000;
  },
  
  // ⭐⭐ BATCH SIZE = 10 (karena setiap entry = 2 pesan: tamu + tujuan) ⭐⭐
  get BATCH_SIZE() { 
    const activeCount = this.DEVICE_TOKENS.filter(d => d.active).length;
    return activeCount === 1 ? 10 : 10; // 10 entries = 20 pesan
  },
  
  // ⭐⭐ TIMEOUT: 5 menit per batch ⭐⭐
  get MAX_PROCESS_TIME() { return 5 * 60 * 1000; },
  
  // Safety settings
  get MAX_RETRIES() { return 1; },
  get ENABLE_LOGGING() { return true; },
  get DEBUG_MODE() { return false; },
  
  // ⭐⭐ COOLDOWN ANTAR BATCH ⭐⭐
  get COOLDOWN_AFTER_BATCH() { return true; },
  get COOLDOWN_MINUTES() { return 1; },
  
  // MAX BATCHES PER DAY
  get MAX_BATCHES_PER_DAY() { 
    const activeCount = this.DEVICE_TOKENS.filter(d => d.active).length;
    return activeCount === 1 ? 20 : 25;
  },
  
  // Auto mode settings
  get AUTO_CHECK_MINUTES() { return 1; },
  
  // Device fallback
  get DEVICE_FALLBACK_ENABLED() { 
    const activeCount = this.DEVICE_TOKENS.filter(d => d.active).length;
    return activeCount > 1;
  },
  get MAX_DEVICE_RETRIES() { 
    const activeCount = this.DEVICE_TOKENS.filter(d => d.active).length;
    return Math.min(activeCount, 2);
  },
  get FALLBACK_DELAY() { return 10000; },
  
  // ⭐⭐ AUTO MODE: RANDOM DEVICE + SEND BOTH (TAMU & TUJUAN) ⭐⭐
  get AUTO_MODE_RANDOM_DEVICE() { return true; },
  get RANDOM_MESSAGE_ORDER() { return true; }
};

// ====================== GLOBAL VARIABLES ======================

let GLOBAL = {
  startTime: null,
  stats: {
    totalSent: 0,
    totalFailed: 0,
    totalSkipped: 0,
    todaySent: 0,
    hourSent: 0,
    batchesToday: 0
  },
  bannedDevices: {},
  currentDeviceIndex: 0,
  messagesOnCurrentDevice: 0,
  lastSendTime: null,
  errors: {},
  cooldownUntil: null,
  deviceStats: {},
  lastSuccessfulDevice: null,
  deviceRotationLog: []
};

// ====================== FORMATTER FUNCTIONS ======================

/**
 * Format kepentingan menjadi:
 * - Plain text jika hanya 1 item
 * - Numbered list jika multiple items
 * 
 * Contoh:
 * Input: "Layanan Perpustakaan; Konsultasi Statistik; Lainnya - Kangen"
 * Output: 
 * 1. Layanan Perpustakaan
 * 2. Konsultasi Statistik
 * 3. Lainnya - Kangen
 * 
 * Input: "Konsultasi Statistik"
 * Output: Konsultasi Statistik
 */
function formatKepentingan(keperluan) {
  if (!keperluan || !keperluan.trim()) {
    return "";
  }
  
  // Split by semicolon dan trim setiap item
  const items = keperluan
    .split(";")
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  // Jika hanya 1 item, return as-is (plain text)
  if (items.length === 1) {
    return items[0];
  }
  
  // Jika multiple items, format as numbered list dengan line break
  return "\n" + items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

// ====================== INITIALIZATION ======================

function initializeSystem() {
  console.log("🔧 Initializing BUKU TAMU system...");
  
  const activeDevices = CONFIG.DEVICE_TOKENS.filter(d => d.active && !GLOBAL.bannedDevices[d.token]);
  console.log(`📱 Detected: ${activeDevices.length} active device(s)`);
  
  if (activeDevices.length === 0) {
    console.warn("⚠️ Warning: No active devices found!");
  } else if (activeDevices.length === 1) {
    console.log("✅ Mode: Single Device");
  } else {
    console.log("✅ Mode: Multi-Device (RANDOM SELECTION)");
  }
  
  loadBannedDevices();
  
  const scriptProps = PropertiesService.getScriptProperties();
  const today = new Date().toDateString();
  const storedDate = scriptProps.getProperty('LAST_RUN_DATE');
  const storedBatches = parseInt(scriptProps.getProperty('BATCHES_TODAY') || '0');
  
  if (storedDate === today) {
    GLOBAL.stats.batchesToday = storedBatches;
  } else {
    GLOBAL.stats.batchesToday = 0;
    scriptProps.setProperty('LAST_RUN_DATE', today);
    scriptProps.setProperty('BATCHES_TODAY', '0');
  }
  
  GLOBAL.lastSuccessfulDevice = scriptProps.getProperty('LAST_SUCCESS_DEVICE');
  
  const savedIndex = scriptProps.getProperty('LAST_DEVICE_INDEX');
  if (savedIndex !== null) {
    GLOBAL.currentDeviceIndex = parseInt(savedIndex);
  }
  
  CONFIG.DEVICE_TOKENS.forEach(device => {
    device.stats = device.stats || { sent: 0, failed: 0, lastUsed: null };
  });
  
  GLOBAL = {
    startTime: new Date(),
    stats: {
      totalSent: 0,
      totalFailed: 0,
      totalSkipped: 0,
      todaySent: countTodaySent(),
      hourSent: countHourSent(),
      batchesToday: GLOBAL.stats.batchesToday
    },
    bannedDevices: GLOBAL.bannedDevices || {},
    currentDeviceIndex: GLOBAL.currentDeviceIndex || 0,
    messagesOnCurrentDevice: 0,
    lastSendTime: getLastSendTime(),
    errors: {},
    cooldownUntil: GLOBAL.cooldownUntil && new Date() < GLOBAL.cooldownUntil ? GLOBAL.cooldownUntil : null,
    deviceStats: {},
    lastSuccessfulDevice: GLOBAL.lastSuccessfulDevice,
    deviceRotationLog: []
  };
  
  setupLogSheet();
  
  console.log("✅ BUKU TAMU System initialized");
  console.log(`📦 Batch: ${CONFIG.BATCH_SIZE} entries (= ${CONFIG.BATCH_SIZE * 2} pesan)`);
  console.log(`⏱️  Timeout: 5 menit per batch`);
  console.log(`❄️  Cooldown: ${CONFIG.COOLDOWN_MINUTES} menit antar batch`);
  console.log(`🎲 Device selection: RANDOM untuk setiap pesan`);
  console.log(`✨ TUJUAN: OPTIONAL - TAMU selalu mendapat notifikasi`);
}

function loadBannedDevices() {
  try {
    const scriptProps = PropertiesService.getScriptProperties();
    CONFIG.DEVICE_TOKENS.forEach(device => {
      const bannedTime = scriptProps.getProperty(`BANNED_${device.token}`);
      if (bannedTime) {
        const bannedUntil = new Date(parseInt(bannedTime));
        if (new Date() < bannedUntil) {
          GLOBAL.bannedDevices[device.token] = bannedUntil;
          device.active = false;
          console.log(`🚫 ${device.name} banned until: ${bannedUntil.toLocaleString('id-ID')}`);
        } else {
          scriptProps.deleteProperty(`BANNED_${device.token}`);
          device.active = true;
        }
      }
    });
  } catch (error) {
    console.error("Error loading banned devices:", error);
  }
}

// ====================== RANDOM DEVICE FUNCTIONS ======================

function selectRandomAvailableDevice() {
  const activeDevices = CONFIG.DEVICE_TOKENS.filter(device => 
    device.active && !GLOBAL.bannedDevices[device.token]
  );
  
  if (activeDevices.length === 0) {
    console.error("❌ No active devices available");
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * activeDevices.length);
  const selectedDevice = activeDevices[randomIndex];
  
  if (selectedDevice.stats.lastUsed) {
    const timeSinceLastUse = new Date() - selectedDevice.stats.lastUsed;
    const minDeviceDelay = 5000;
    
    if (timeSinceLastUse < minDeviceDelay) {
      const waitTime = minDeviceDelay - timeSinceLastUse;
      Utilities.sleep(waitTime);
    }
  }
  
  return selectedDevice;
}

function calculateRandomDelay(index, failedCount, consecutiveFails) {
  let minDelay = CONFIG.MIN_DELAY;
  let maxDelay = CONFIG.MAX_DELAY;
  
  const randomFactor = 0.8 + Math.random() * 0.4;
  let delay = (minDelay + Math.random() * (maxDelay - minDelay)) * randomFactor;
  
  if (failedCount > 0) {
    delay *= (1 + (failedCount * 0.1));
  }
  
  if (consecutiveFails >= 2) {
    delay *= 1.3;
  }
  
  delay = Math.max(delay, 8000);
  delay = Math.min(delay, 45000);
  
  return Math.round(delay);
}

function updateDeviceStats(device, success) {
  if (success) {
    device.stats.sent++;
    PropertiesService.getScriptProperties()
      .setProperty('LAST_SUCCESS_DEVICE', device.token);
    GLOBAL.lastSuccessfulDevice = device.token;
  } else {
    device.stats.failed++;
  }
  device.stats.lastUsed = new Date();
}

function markDeviceBanned(deviceToken, hours = 24) {
  const bannedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
  GLOBAL.bannedDevices[deviceToken] = bannedUntil;
  
  PropertiesService.getScriptProperties()
    .setProperty(`BANNED_${deviceToken}`, bannedUntil.getTime().toString());
  
  const device = CONFIG.DEVICE_TOKENS.find(d => d.token === deviceToken);
  if (device) {
    device.active = false;
    console.log(`🚫 Device "${device.name}" banned until: ${bannedUntil.toLocaleString('id-ID')}`);
    logMessage("", "SYSTEM", "WARNING", "Device banned for 24h", device.name, "", device.name);
    
    const activeDevices = CONFIG.DEVICE_TOKENS.filter(d => d.active && !GLOBAL.bannedDevices[d.token]);
    if (activeDevices.length === 0) {
      console.warn("⚠️ ALL DEVICES BANNED - Semua device telah banned!");
      logMessage("", "SYSTEM", "ALERT", "All devices banned!", "", "", "N/A");
    }
  }
}

// ====================== MESSAGE SENDING ======================

function sendSingleMessage(device, phone, message, recipient) {
  try {
    const payload = {
      target: phone,
      message: message,
      delay: "3",
      countryCode: "62",
      typing: true
    };
    
    const options = {
      method: "post",
      headers: { 
        "Authorization": device.token,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      timeout: 30000
    };
    
    const response = UrlFetchApp.fetch(CONFIG.FONNTE_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (e) {
      jsonResponse = { status: false, message: "Invalid JSON response" };
    }
    
    if (responseCode === 200) {
      if (jsonResponse.status === true || jsonResponse.success === true) {
        return { 
          success: true, 
          reason: "success", 
          banned: false,
          deviceName: device.name,
          deviceToken: device.token.substring(0, 10) + "..."
        };
      } else {
        const errorMsg = jsonResponse.message || "Unknown error";
        const isBanned = errorMsg.toLowerCase().includes("banned") ||
                        errorMsg.toLowerCase().includes("spam") ||
                        errorMsg.toLowerCase().includes("blocked") ||
                        errorMsg.toLowerCase().includes("limit");
        
        return { 
          success: false, 
          reason: errorMsg.substring(0, 50),
          banned: isBanned,
          deviceName: device.name,
          deviceToken: device.token.substring(0, 10) + "..."
        };
      }
    } else if (responseCode === 429) {
      return { 
        success: false, 
        reason: "rate_limit", 
        banned: true,
        deviceName: device.name,
        deviceToken: device.token.substring(0, 10) + "..."
      };
    } else {
      return { 
        success: false, 
        reason: `http_${responseCode}`, 
        banned: false,
        deviceName: device.name,
        deviceToken: device.token.substring(0, 10) + "..."
      };
    }
    
  } catch (error) {
    console.error(`Send error from ${device.name}:`, error);
    return { 
      success: false, 
      reason: "connection_error", 
      banned: false,
      deviceName: device.name,
      deviceToken: device.token.substring(0, 10) + "..."
    };
  }
}

// ====================== MESSAGE CREATION ======================

/**
 * Buat pesan ke Tujuan dengan format kepentingan yang sudah diformat
 */
function createTujuanMessage(namaTamu, asalTamu, keperluan, namaTarget) {
  const formattedKeperluan = formatKepentingan(keperluan);
  
  return `*e-TAMU KECAP MAJA*

Yth. ${namaTarget},

Ada tamu yang ingin bertemu dengan Anda:

Nama        : ${namaTamu}
Asal        : ${asalTamu}
Kepentingan : ${formattedKeperluan}

Tamu telah hadir dan sedang menunggu.
Mohon untuk dapat ditindaklanjuti.

Terima kasih.
Salam,
*Kecap Maja – BPS 3210*`;
}

/**
 * Buat pesan ke Tamu - SELALU dikirim (mandatory)
 */
function createTamuMessage(namaTamu) {
  return `Terima kasih atas kunjungan Bapak/Ibu ${namaTamu} ke BPS Kabupaten Majalengka.

Data Anda telah tercatat dalam sistem e-Tamu kami.
Petugas kami akan segera membantu dan mengarahkan keperluan Anda.

Mohon menunggu sejenak, kami akan segera melayani Anda.

Kami menghargai waktu dan kepercayaan Anda.

Salam,
Kecap Maja – BPS 3210`;
}

// ====================== BUKU TAMU MESSAGES ======================

function sendBukuTamuNotifications() {
  console.log("📕 Processing BUKU TAMU notifications...");
  
  try {
    initializeSystem();
    
    if (checkCooldown() && !confirmCooldownOverride()) {
      return;
    }
    
    if (GLOBAL.stats.batchesToday >= CONFIG.MAX_BATCHES_PER_DAY) {
      showAlert("Batch Limit", `Sudah mencapai batas ${CONFIG.MAX_BATCHES_PER_DAY} batch hari ini.`);
      return;
    }
    
    if (!checkSystemStatusSilent()) return;
    
    const sheet = getSheet(CONFIG.SHEET_BUKU_TAMU);
    if (!sheet) {
      showAlert("Sheet Error", "Sheet Sheet1 tidak ditemukan");
      return;
    }
    
    const pending = getPendingBukuTamuEntries(sheet);
    
    if (pending.length === 0) {
      showAlert("Info", "Tidak ada tamu yang perlu dinotifikasi");
      return;
    }
    
    console.log(`📊 Found ${pending.length} pending entries`);
    
    if (CONFIG.RANDOM_MESSAGE_ORDER) {
      shuffleArray(pending);
      console.log("🎲 Entries shuffled to random order");
    }
    
    const totalBatches = Math.ceil(pending.length / CONFIG.BATCH_SIZE);
    const totalMessages = pending.length * 2; // TAMU + TUJUAN (atau hanya TAMU jika tujuan kosong)
    const estimatedTime = Math.ceil((totalMessages * 15) / 60);
    const activeDevices = CONFIG.DEVICE_TOKENS.filter(d => d.active && !GLOBAL.bannedDevices[d.token]).length;
    
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      '⚠️ BUKU TAMU - NOTIFIKASI TAMU & TUJUAN',
      `Ditemukan ${pending.length} entry tamu.\n\n` +
      `📦 BATCH SETUP:\n` +
      `• Entry per batch: ${CONFIG.BATCH_SIZE}\n` +
      `• Pesan per entry: 1-2 (Tamu ALWAYS + Tujuan jika ada)\n` +
      `• Total estimasi pesan: ${totalMessages}\n` +
      `• Total batch: ${totalBatches}\n` +
      `• Estimasi waktu: ${estimatedTime} menit\n` +
      `• Timeout per batch: 5 menit\n` +
      `• Cooldown antar batch: ${CONFIG.COOLDOWN_MINUTES} menit\n\n` +
      `🎲 RANDOM SELECTION:\n` +
      `• Setiap pesan menggunakan device random\n` +
      `• Entry diproses dalam urutan random\n` +
      `• Active devices: ${activeDevices}\n\n` +
      `✨ NOTIFIKASI TAMU: ALWAYS (mandatory)\n` +
      `📨 NOTIFIKASI TUJUAN: Optional (jika ada data)\n\n` +
      `📊 Daily Limits:\n` +
      `• Daily max: 100 pesan/hari\n` +
      `• Sent today: ${GLOBAL.stats.todaySent}/100\n\n` +
      'Lanjutkan pengiriman?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      console.log("❌ User cancelled");
      return;
    }
    
    const result = processBukuTamuInBatches(pending, sheet);
    
    showSummary("BUKU TAMU", result);
    
  } catch (error) {
    console.error("❌ BUKU TAMU ERROR:", error);
    logError("BUKU_TAMU", error.toString());
    showAlert("Error", error.toString());
  }
}

function getPendingBukuTamuEntries(sheet) {
  const pending = [];
  
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return pending;
    
    const data = sheet.getRange(2, 1, lastRow-1, 8).getValues();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const [timestamp, nama, asal, noHp, kepentingan, tujuan, noHpTujuan, status] = row.map(cell => cell ? cell.toString().trim() : "");
      
      // Skip jika sudah ada status (sudah terkirim)
      if (status && status !== "") {
        continue;
      }
      
      // Ambil jika ada nama dan no HP tamu (MANDATORY)
      // Tujuan dan noHpTujuan bersifat OPTIONAL
      if (nama && noHp) {
        pending.push({
          rowNum: i + 2,
          timestamp: timestamp || new Date(),
          nama: nama,
          asal: asal,
          noHp: formatPhoneNumber(noHp),
          kepentingan: kepentingan,
          tujuan: tujuan,
          noHpTujuan: noHpTujuan ? formatPhoneNumber(noHpTujuan) : null,
          status: status
        });
      }
    }
    
  } catch (error) {
    console.error("Error getting entries:", error);
  }
  
  return pending;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function processBukuTamuInBatches(pending, sheet) {
  const totalEntries = pending.length;
  let processedEntries = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let batchNumber = 1;
  
  console.log(`\n🚀 Memulai pengiriman: ${totalEntries} entries`);
  
  while (processedEntries < totalEntries) {
    if (GLOBAL.stats.batchesToday >= CONFIG.MAX_BATCHES_PER_DAY) {
      console.log(`⏸️ Stop: Batas batch harian tercapai`);
      break;
    }
    
    if (GLOBAL.stats.todaySent >= 100) {
      console.log(`⏸️ Stop: Batas harian 100 pesan tercapai`);
      break;
    }
    
    const remaining = totalEntries - processedEntries;
    const currentBatchSize = Math.min(CONFIG.BATCH_SIZE, remaining);
    
    const batchStart = processedEntries;
    const batchEnd = batchStart + currentBatchSize;
    const batch = pending.slice(batchStart, batchEnd);
    
    console.log(`\n📦 BATCH ${batchNumber}: Entry ${batchStart + 1}-${batchEnd} (${batch.length} entries)`);
    
    const batchResult = processSingleBukuTamuBatch(batch, sheet, batchNumber);
    
    totalSent += batchResult.sent;
    totalFailed += batchResult.failed;
    processedEntries += batch.length;
    
    console.log(`✅ Batch ${batchNumber} selesai: ${batchResult.sent} terkirim, ${batchResult.failed} gagal`);
    console.log(`   Progress: ${processedEntries}/${totalEntries} entries`);
    
    GLOBAL.stats.batchesToday++;
    PropertiesService.getScriptProperties()
      .setProperty('BATCHES_TODAY', GLOBAL.stats.batchesToday.toString());
    
    const elapsedTime = new Date() - GLOBAL.startTime;
    const timeLeft = CONFIG.MAX_PROCESS_TIME - elapsedTime;
    
    if (timeLeft < 60000 && processedEntries < totalEntries) {
      console.log(`⏰ Hampir timeout, akan pause`);
      break;
    }
    
    if (!checkLimits()) {
      break;
    }
    
    if (processedEntries < totalEntries) {
      console.log(`⏳ Menunggu ${CONFIG.COOLDOWN_MINUTES} menit sebelum batch berikutnya...`);
      Utilities.sleep(CONFIG.COOLDOWN_MINUTES * 60 * 1000);
      GLOBAL.startTime = new Date();
    }
    
    batchNumber++;
  }
  
  console.log(`\n🎉 BUKU TAMU PROCESSING COMPLETED:`);
  console.log(`   Total entries diproses: ${processedEntries}`);
  console.log(`   Total pesan terkirim: ${totalSent}`);
  console.log(`   Total pesan gagal: ${totalFailed}`);
  
  return {
    processed: processedEntries,
    sent: totalSent,
    failed: totalFailed,
    batches: batchNumber - 1
  };
}

function processSingleBukuTamuBatch(batch, sheet, batchNum) {
  let sent = 0;
  let failed = 0;
  const startTime = new Date();
  let consecutiveFails = 0;
  
  console.log(`   Processing ${batch.length} entries (RANDOM DEVICE untuk setiap pesan)`);
  
  for (let i = 0; i < batch.length; i++) {
    const entry = batch[i];
    
    if (new Date() - startTime > CONFIG.MAX_PROCESS_TIME) {
      console.log("   ⏰ BATCH TIMEOUT");
      failed += (batch.length - i) * 2;
      break;
    }
    
    if (consecutiveFails >= 3) {
      console.log("   ⚠️ Too many consecutive failures");
      failed += (batch.length - i) * 2;
      break;
    }
    
    if (GLOBAL.stats.todaySent >= 100) {
      console.log("   ⏸️ Daily limit reached");
      failed += (batch.length - i) * 2;
      break;
    }
    
    if (!checkLimits()) {
      console.log("   ⏸️ Limits reached");
      failed += (batch.length - i) * 2;
      break;
    }
    
    console.log(`   📋 [${i + 1}] Processing: ${entry.nama}`);
    
    // Update ke status "Processing"
    updateCell(sheet, entry.rowNum, 8, "Processing...");
    
    let tujuanSuccess = false;
    let tamuSuccess = false;
    let totalMessagesSent = 0;
    
    // ========== PESAN 1: KE TUJUAN (OPTIONAL - jika ada data) ==========
    if (entry.tujuan && entry.noHpTujuan) {
      console.log(`      1️⃣ Mengirim ke Tujuan (${entry.tujuan})...`);
      
      const messageTujuan = createTujuanMessage(entry.nama, entry.asal, entry.kepentingan, entry.tujuan);
      const delay1 = calculateRandomDelay(i, failed, consecutiveFails);
      if (delay1 > 0) {
        Utilities.sleep(delay1);
      }
      
      const deviceTujuan = selectRandomAvailableDevice();
      if (!deviceTujuan) {
        console.log(`      ⚠️ No available device untuk tujuan`);
        logMessage("", "TUJUAN", "SKIPPED", "No device", entry.nama, entry.rowNum, "N/A");
      } else {
        const resultTujuan = sendSingleMessage(deviceTujuan, entry.noHpTujuan, messageTujuan, entry.tujuan);
        
        if (resultTujuan.success) {
          deviceTujuan.stats.sent++;
          sent++;
          tujuanSuccess = true;
          totalMessagesSent++;
          GLOBAL.stats.todaySent++;
          consecutiveFails = 0;
          console.log(`      ✅ Terkirim ke Tujuan via ${deviceTujuan.name}`);
          logMessage(entry.noHpTujuan, "TUJUAN", "SUCCESS", "Notifikasi tamu", entry.nama, entry.rowNum, deviceTujuan.name);
        } else {
          deviceTujuan.stats.failed++;
          failed++;
          consecutiveFails++;
          console.log(`      ❌ Gagal ke Tujuan: ${resultTujuan.reason}`);
          logMessage(entry.noHpTujuan, "TUJUAN", "FAILED", resultTujuan.reason, entry.nama, entry.rowNum, deviceTujuan.name);
          
          if (resultTujuan.banned) {
            markDeviceBanned(deviceTujuan.token, 24);
          }
        }
      }
    } else {
      console.log(`      ⚠️ Tujuan/noHpTujuan kosong - skip notifikasi tujuan`);
      logMessage("", "TUJUAN", "SKIPPED", "Empty data", entry.nama, entry.rowNum, "N/A");
    }
    
    // ========== PESAN 2: KE TAMU (ALWAYS - MANDATORY) ==========
    console.log(`      2️⃣ Mengirim ke Tamu (${entry.nama}) - ALWAYS SEND...`);
    
    const messageTamu = createTamuMessage(entry.nama);
    const delay2 = calculateRandomDelay(i + 1, failed, consecutiveFails);
    if (delay2 > 0) {
      Utilities.sleep(delay2);
    }
    
    const deviceTamu = selectRandomAvailableDevice();
    if (!deviceTamu) {
      console.log(`      ❌ No available device untuk tamu`);
      failed++;
      consecutiveFails++;
      continue;
    }
    
    const resultTamu = sendSingleMessage(deviceTamu, entry.noHp, messageTamu, entry.nama);
    
    if (resultTamu.success) {
      deviceTamu.stats.sent++;
      sent++;
      tamuSuccess = true;
      totalMessagesSent++;
      consecutiveFails = 0;
      GLOBAL.stats.todaySent++;
      console.log(`      ✅ Terkirim ke Tamu via ${deviceTamu.name}`);
      logMessage(entry.noHp, "TAMU", "SUCCESS", "Notifikasi kehadiran", entry.nama, entry.rowNum, deviceTamu.name);
    } else {
      deviceTamu.stats.failed++;
      failed++;
      consecutiveFails++;
      console.log(`      ❌ Gagal ke Tamu: ${resultTamu.reason}`);
      logMessage(entry.noHp, "TAMU", "FAILED", resultTamu.reason, entry.nama, entry.rowNum, deviceTamu.name);
      
      if (resultTamu.banned) {
        markDeviceBanned(deviceTamu.token, 24);
      }
    }
    
    // Update status - berhasil jika TAMU berhasil (tujuan optional)
    if (tamuSuccess) {
      const noteText = `Terkirim ✓ ${new Date().toLocaleDateString('id-ID')}`;
      updateCell(sheet, entry.rowNum, 8, noteText);
      
      if (tujuanSuccess) {
        console.log(`      🎉 Entry ${i + 1}: BOTH messages sent successfully`);
      } else {
        console.log(`      ✅ Entry ${i + 1}: Tamu message sent (tujuan skipped/failed)`);
      }
    } else {
      console.log(`      ❌ Entry ${i + 1}: Failed (tamu message gagal)`);
    }
    
    if (i % 3 === 0 || i === batch.length - 1) {
      const progress = Math.round(((i + 1) / batch.length) * 100);
      console.log(`   📊 Progress: ${i + 1}/${batch.length} entries (${progress}%)`);
    }
  }
  
  return { sent, failed };
}

// ====================== UTILITY FUNCTIONS ======================

function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  const clean = phone.toString().replace(/\D/g, '');
  
  if (clean.length < 10 || clean.length > 15) {
    return null;
  }
  
  let formatted = clean;
  
  if (formatted.startsWith("0")) {
    formatted = "62" + formatted.substring(1);
  } else if (formatted.startsWith("8") && formatted.length >= 9) {
    formatted = "62" + formatted;
  } else if (!formatted.startsWith("62")) {
    return null;
  }
  
  return formatted;
}

function getSheet(sheetName) {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  } catch (error) {
    return null;
  }
}

function updateCell(sheet, row, col, value) {
  try {
    sheet.getRange(row, col).setValue(value);
    SpreadsheetApp.flush();
  } catch (error) {
    console.error(`Error updating cell:`, error);
  }
}

// ====================== LIMIT AND STATUS ======================

function checkCooldown() {
  if (GLOBAL.cooldownUntil && new Date() < GLOBAL.cooldownUntil) {
    const minutesLeft = Math.ceil((GLOBAL.cooldownUntil - new Date()) / 60000);
    console.log(`⏳ Cooldown: ${minutesLeft} menit tersisa`);
    return true;
  }
  return false;
}

function confirmCooldownOverride() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    '⏳ COOLDOWN ACTIVE',
    'Sistem sedang dalam cooldown. Lanjutkan?',
    ui.ButtonSet.YES_NO
  );
  return response === ui.Button.YES;
}

function checkLimits() {
  const activeDevices = CONFIG.DEVICE_TOKENS.filter(d => d.active && !GLOBAL.bannedDevices[d.token]).length;
  
  if (GLOBAL.stats.todaySent >= 100) {
    console.log(`❌ Daily limit: ${GLOBAL.stats.todaySent}/100`);
    return false;
  }
  
  return true;
}

function checkSystemStatusSilent() {
  const activeDevices = CONFIG.DEVICE_TOKENS.filter(d => d.active && !GLOBAL.bannedDevices[d.token]);
  if (activeDevices.length === 0) {
    showAlert("No Active Devices", "Tidak ada device aktif");
    return false;
  }
  
  const testDevice = activeDevices[0];
  const testResult = testDeviceConnection(testDevice.token);
  if (!testResult.success) {
    showAlert("Connection Error", `Device "${testDevice.name}" tidak terkoneksi.`);
    return false;
  }
  
  return true;
}

function testDeviceConnection(deviceToken) {
  try {
    const testPayload = {
      target: "6281234567890",
      message: "TEST_" + new Date().getTime(),
      delay: "0",
      countryCode: "62"
    };
    
    const options = {
      method: "post",
      headers: { 
        "Authorization": deviceToken,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true,
      timeout: 10000
    };
    
    const response = UrlFetchApp.fetch(CONFIG.FONNTE_URL, options);
    const responseCode = response.getResponseCode();
    
    return {
      success: responseCode === 200,
      error: responseCode !== 200 ? `HTTP ${responseCode}` : null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ====================== LOGGING ======================

function setupLogSheet() {
  try {
    let logSheet = getSheet(CONFIG.SHEET_LOGS);
    
    if (!logSheet) {
      logSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONFIG.SHEET_LOGS);
      
      const headers = [
        ["Timestamp", "Phone", "Type", "Status", "Message", "Nama Tamu", "Row", "Device"]
      ];
      
      logSheet.getRange(1, 1, 1, 8).setValues(headers);
      
      const headerRange = logSheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#4a86e8");
      headerRange.setFontColor("white");
      logSheet.setFrozenRows(1);
      
      console.log("✅ Log sheet created");
    }
    
  } catch (error) {
    console.error("Error setup log sheet:", error);
  }
}

function logMessage(phone, type, status, message, namaTamu, row, device) {
  if (!CONFIG.ENABLE_LOGGING) return;
  
  try {
    const logSheet = getSheet(CONFIG.SHEET_LOGS);
    if (!logSheet) return;
    
    const logData = [
      new Date(),
      phone || "",
      type,
      status,
      message.substring(0, 50),
      namaTamu.substring(0, 50),
      row || "",
      device || "N/A"
    ];
    
    logSheet.appendRow(logData);
    
    const lastRow = logSheet.getLastRow();
    const rowRange = logSheet.getRange(lastRow, 1, 1, 8);
    
    if (status === "SUCCESS") {
      rowRange.setBackground("#d9ead3");
    } else if (status === "FAILED") {
      rowRange.setBackground("#f4cccc");
    }
    
    if (logSheet.getLastRow() > 1000) {
      logSheet.deleteRows(2, logSheet.getLastRow() - 1000);
    }
    
  } catch (error) {
    console.error("Error logging:", error);
  }
}

function logError(context, error) {
  logMessage("", "ERROR", "EXCEPTION", error, context, "", "N/A");
}

function countTodaySent() {
  try {
    const logSheet = getSheet(CONFIG.SHEET_LOGS);
    if (!logSheet) return 0;
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const data = logSheet.getDataRange().getValues();
    let count = 0;
    
    for (let i = 1; i < data.length; i++) {
      const timestamp = new Date(data[i][0]);
      if (timestamp >= todayStart && data[i][3] === "SUCCESS") {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    return 0;
  }
}

function countHourSent() {
  try {
    const logSheet = getSheet(CONFIG.SHEET_LOGS);
    if (!logSheet) return 0;
    
    const oneHourAgo = new Date(Date.now() - CONFIG.HOUR_IN_MS);
    
    const data = logSheet.getDataRange().getValues();
    let count = 0;
    
    for (let i = 1; i < data.length; i++) {
      const timestamp = new Date(data[i][0]);
      if (timestamp >= oneHourAgo && data[i][3] === "SUCCESS") {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    return 0;
  }
}

function getLastSendTime() {
  try {
    const logSheet = getSheet(CONFIG.SHEET_LOGS);
    if (!logSheet) return null;
    
    const data = logSheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][3] === "SUCCESS") {
        return new Date(data[i][0]);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ====================== UI HELPERS ======================

function showAlert(title, message) {
  try {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    console.log(`ALERT [${title}]: ${message}`);
  }
}

function showSummary(type, result) {
  const duration = new Date() - GLOBAL.startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  const activeDevices = CONFIG.DEVICE_TOKENS.filter(d => d.active && !GLOBAL.bannedDevices[d.token]).length;
  const bannedDevices = CONFIG.DEVICE_TOKENS.filter(d => GLOBAL.bannedDevices[d.token]).length;
  
  let deviceUsage = "\n📊 Device Usage:\n";
  CONFIG.DEVICE_TOKENS.forEach(device => {
    if (device.active && !GLOBAL.bannedDevices[device.token]) {
      deviceUsage += `• ${device.name}: ${device.stats.sent} pesan\n`;
    }
  });
  
  const summary = `
🎉 ${type} NOTIFIKASI SELESAI!

⏰ Durasi: ${minutes}m ${seconds}s

📊 Hasil:
• Entry diproses: ${result.processed || 0}
• ✅ Pesan terkirim: ${result.sent || 0}
• ❌ Pesan gagal: ${result.failed || 0}
• 📦 Total batch: ${result.batches || 0}

🎲 Mode: RANDOM DEVICE SELECTION
${deviceUsage}

📱 Device Status:
• Active: ${activeDevices}/${CONFIG.DEVICE_TOKENS.length}
• Banned: ${bannedDevices}

📈 Usage:
• Hari ini: ${GLOBAL.stats.todaySent}/100 pesan ✨
• This hour: ${GLOBAL.stats.hourSent}/${CONFIG.MAX_HOURLY_PER_DEVICE * activeDevices}

📝 Logs saved in: ${CONFIG.SHEET_LOGS}

✨ TUJUAN OPTIONAL: Notifikasi tamu SELALU dikirim
  `;
  
  console.log(summary);
  showAlert("Notifikasi Selesai", summary);
}

// ====================== SYSTEM MANAGEMENT ======================

function checkSystemStatus() {
  console.log("🔍 Checking system status...");
  
  initializeSystem();
  
  const deviceStatus = [];
  CONFIG.DEVICE_TOKENS.forEach(device => {
    const testResult = testDeviceConnection(device.token);
    const banned = GLOBAL.bannedDevices[device.token];
    deviceStatus.push({
      name: device.name,
      active: device.active,
      connected: testResult.success,
      banned: !!banned,
      bannedUntil: banned ? banned.toLocaleString('id-ID') : null,
      stats: device.stats
    });
  });
  
  const activeDevices = deviceStatus.filter(d => d.active && !d.banned).length;
  
  const status = `
📊 BUKU TAMU SYSTEM STATUS:

⚙️ CONFIGURATION:
• Batch: ${CONFIG.BATCH_SIZE} entries
• Max daily: 100 pesan/hari
• Timeout: 5 menit per batch
• Cooldown: ${CONFIG.COOLDOWN_MINUTES} menit antar batch
• Mode: 🎲 RANDOM DEVICE
• Active devices: ${activeDevices}

✨ NOTIFIKASI TAMU: ALWAYS (mandatory)
✨ NOTIFIKASI TUJUAN: OPTIONAL (jika ada data)

📈 TODAY:
• Pesan terkirim: ${GLOBAL.stats.todaySent}/100
• This hour: ${GLOBAL.stats.hourSent}/${CONFIG.MAX_HOURLY_PER_DEVICE * activeDevices}
• Batch: ${GLOBAL.stats.batchesToday}/${CONFIG.MAX_BATCHES_PER_DAY}

📱 DEVICE STATUS (${activeDevices}/${CONFIG.DEVICE_TOKENS.length} active):
${deviceStatus.map(device => `
${device.active ? (device.banned ? '🟡' : (device.connected ? '🟢' : '🔴')) : '⚫'} ${device.name}:
  • Active: ${device.active ? '✅' : '❌'}
  • Connected: ${device.connected ? '✅' : '❌'}
  • Stats: ${device.stats.sent} sent, ${device.stats.failed} failed
`).join('')}

✅ Sistem siap mengirim notifikasi BUKU TAMU
  `;
  
  console.log(status);
  showAlert("System Status", status);
}

function testAllDevices() {
  console.log("🧪 Testing all devices...");
  
  const results = [];
  CONFIG.DEVICE_TOKENS.forEach(device => {
    const testResult = testDeviceConnection(device.token);
    const banned = GLOBAL.bannedDevices[device.token];
    results.push({
      name: device.name,
      token: device.token.substring(0, 10) + "...",
      success: testResult.success,
      error: testResult.error,
      active: device.active,
      banned: !!banned
    });
    
    console.log(`${device.name}: ${testResult.success ? '✅' : '❌'} ${banned ? '(Banned)' : ''}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const message = `Device Test Results:\n\n` +
    results.map(r => 
      `${r.success ? '✅' : '❌'} ${r.name}`
    ).join('\n') +
    `\n\n${successCount}/${CONFIG.DEVICE_TOKENS.length} devices connected`;
  
  showAlert("Device Test", message);
}

function viewLogs() {
  try {
    const logSheet = getSheet(CONFIG.SHEET_LOGS);
    if (!logSheet) {
      showAlert("Info", "Log sheet belum ada");
      return;
    }
    
    logSheet.activate();
    showAlert("Logs", "Log sheet telah dibuka");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// ====================== MAIN MENU ======================

function showMainMenu() {
  const ui = SpreadsheetApp.getUi();
  
  const activeDevices = CONFIG.DEVICE_TOKENS.filter(d => d.active && !GLOBAL.bannedDevices[d.token]).length;
  
  const choice = ui.alert(
    '📕 BUKU TAMU - WA NOTIFIKASI',
    `Sistem aktif dengan ${activeDevices} device\n` +
    `Mode: 🎲 RANDOM DEVICE + AUTO SEND\n` +
    `✨ TAMU: ALWAYS (mandatory)\n` +
    `✨ TUJUAN: OPTIONAL\n` +
    `Max daily: 100 pesan/hari\n\n` +
    `⚡ SEND:\n` +
    `1️⃣ Kirim Notifikasi BUKU TAMU (Manual)\n\n` +
    `🤖 AUTO MODE:\n` +
    `2️⃣ Setup Auto Trigger (setiap 1 menit)\n` +
    `3️⃣ Disable Auto Trigger\n\n` +
    `🔧 SYSTEM:\n` +
    `4️⃣ Cek Status Sistem\n` +
    `5️⃣ Test All Devices\n` +
    `6️⃣ Lihat Logs\n` +
    `7️⃣ Help`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (choice !== ui.Button.OK) {
    return;
  }
  
  const action = ui.prompt(
    'Pilih Menu',
    'Masukkan angka (1-7):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (action.getSelectedButton() !== ui.Button.OK) return;
  
  const selected = action.getResponseText().trim();
  
  switch(selected) {
    case '1':
      sendBukuTamuNotifications();
      break;
    case '2':
      setupAutoTrigger();
      break;
    case '3':
      disableAutoTrigger();
      break;
    case '4':
      checkSystemStatus();
      break;
    case '5':
      testAllDevices();
      break;
    case '6':
      viewLogs();
      break;
    case '7':
      showHelp();
      break;
    default:
      ui.alert('Error', 'Pilihan tidak valid', ui.ButtonSet.OK);
  }
}

function launchBukuTamu() {
  showMainMenu();
}

// ====================== MENU SETUP ======================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    const menu = ui.createMenu(`📕 BUKU TAMU (100 Pesan/Hari + AUTO)`)
      .addItem('🚀 Launch', 'launchBukuTamu')
      .addSeparator()
      .addItem('📤 Kirim Manual', 'sendBukuTamuNotifications')
      .addSeparator()
      .addSubMenu(ui.createMenu('🤖 Auto Mode')
        .addItem('▶️ Setup Auto Trigger', 'setupAutoTrigger')
        .addItem('⏹️ Disable Auto Trigger', 'disableAutoTrigger')
      )
      .addSeparator()
      .addSubMenu(ui.createMenu('🔧 System')
        .addItem('📊 Status', 'checkSystemStatus')
        .addItem('🧪 Test Devices', 'testAllDevices')
        .addItem('📈 View Logs', 'viewLogs')
      )
      .addSeparator()
      .addItem('ℹ️ Help', 'showHelp');
    
    menu.addToUi();
    
    console.log(`✅ BUKU TAMU Script loaded with AUTO TRIGGERS`);
    console.log(`✨ TUJUAN OPTIONAL - TAMU ALWAYS GET NOTIFIED`);
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// ====================== HELP ======================

function showHelp() {
  const help = `
❓ BUKU TAMU NOTIFIKASI - HELP

📋 FITUR:
• Auto-send ke Tamu (SELALU/MANDATORY)
• Auto-send ke Tujuan (OPTIONAL - jika ada data)
• OTOMATIS saat data masuk ✨
• Format kepentingan: SMART (numbered list jika multiple)

✨ PERUBAHAN UTAMA: TUJUAN SEKARANG OPTIONAL!
Sekarang, bahkan jika kolom Tujuan atau No HP Tujuan kosong,
tamu TETAP akan menerima notifikasi terima kasih.

📊 SHEET REQUIREMENT (Sheet1):
Kolom yang diperlukan:
1. Timestamp (otomatis)
2. Nama (nama tamu) - MANDATORY
3. Asal (asal/instansi) - optional
4. No HP (nomor HP tamu) - MANDATORY
5. Kepentingan (tujuan kunjungan) - optional
6. Tujuan (nama PJ) - OPTIONAL (NEW: sekarang optional!)
7. No HP Tujuan (nomor HP PJ) - OPTIONAL (NEW: sekarang optional!)
8. Status (isi otomatis setelah terkirim)

🎯 SKENARIO:

SKENARIO 1: Data lengkap (nama + noHp + tujuan + noHpTujuan)
• Kirim ke Tujuan (notifikasi ada tamu)
• Kirim ke Tamu (ucapan terima kasih)
✅ Status: Terkirim ✓

SKENARIO 2: Hanya ada nama + noHp (tujuan kosong)
• SKIP tujuan
• ✅ TETAP KIRIM KE TAMU (ucapan terima kasih)
✅ Status: Terkirim ✓

SKENARIO 3: Tidak ada noHp Tamu
• SKIP (row ini tidak diproses)
❌ Status: Tidak diproses

🎲 CARA KERJA:

1️⃣ Ada 2 trigger otomatis:
   A. onEdit() TRIGGER - saat ada perubahan data
   B. TIME-BASED TRIGGER - setiap 1 menit (jika setup)

2️⃣ Saat entry ditemukan:
   • Cek apakah punya nama + noHp (required)
   • Jika ada tujuan + noHpTujuan → kirim ke tujuan dulu
   • SELALU kirim ke tamu (terlepas tujuan ada atau tidak!)
   • Auto update Status jika tamu msg berhasil

3️⃣ Setiap pesan memilih device RANDOM
   • Load balancing otomatis
   • Cegah abuse 1 device

4️⃣ Limit: Max 100 pesan/hari
   • Tamu msg = 1 pesan
   • Tujuan msg = 1 pesan (jika ada)

📨 PESAN TAMU (SELALU DIKIRIM):

Terima kasih atas kunjungan Bapak/Ibu {{NAMA}}
ke BPS Kabupaten Majalengka.

Data Anda telah tercatat dalam sistem e-Tamu kami.
Petugas kami akan segera membantu dan mengarahkan keperluan Anda.

Mohon menunggu sejenak, kami akan segera melayani Anda.

Kami menghargai waktu dan kepercayaan Anda.

Salam,
Kecap Maja – BPS 3210

📨 PESAN TUJUAN (HANYA JIKA ADA DATA):

*e-TAMU KECAP MAJA*

Yth. {{NAMA_TUJUAN}},

Ada tamu yang ingin bertemu dengan Anda:

Nama        : {{NAMA_TAMU}}
Asal        : {{ASAL}}
Kepentingan : {{SMART_FORMAT}}

Tamu telah hadir dan sedang menunggu.
Mohon untuk dapat ditindaklanjuti.

Terima kasih.
Salam,
*Kecap Maja – BPS 3210*

🚀 SETUP OTOMATIS:

1. Menu: 📕 BUKU TAMU → 🤖 Auto Mode → ▶️ Setup Auto Trigger
2. Tunggu konfirmasi "setup complete"
3. Setiap 1 menit sistem cek dan kirim entry yang pending
4. Untuk disable: ⏹️ Disable Auto Trigger

⚙️ SETTINGS:
- Edit CONFIG.DEVICE_TOKENS untuk ubah devices
- Set active: true untuk aktif
- Sistem auto-adjust batching

📝 STATUS TRACKING:
- Status kosong = belum dikirim / siap auto-send
- Jika ada status = sudah terkirim (skip)
- Auto update ke "Terkirim ✓ TANGGAL"

📊 MONITORING:
- System Status untuk statistik
- Logs untuk history lengkap
- Test Devices untuk cek koneksi

✨ KEAMANAN:
- Device banning otomatis
- Rate limiting per device
- Daily limit enforcement
- Connection testing

⚠️ CATATAN PENTING:
- Tamu SELALU dapat notifikasi (kecuali noHp invalid)
- Tujuan OPTIONAL - tidak harus ada
- Min. data: Nama + No HP Tamu
- Batas: 100 pesan/hari (tamu + tujuan combined)

✨ SMART FORMATTER:
Input: "Perpustakaan; Konsultasi; Lainnya"
Output:
1. Perpustakaan
2. Konsultasi
3. Lainnya

Input: "Konsultasi saja"
Output: Konsultasi saja
  `;
  
  console.log(help);
  showAlert("Help - BUKU TAMU Notifikasi", help);
}

// ====================== AUTO TRIGGER - ONCHANGE ======================

// 🔥 TRIGGER OTOMATIS SAAT ADA PERUBAHAN DATA
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // Hanya trigger jika edit di Sheet1 (BUKU TAMU)
    if (sheet.getName() !== CONFIG.SHEET_BUKU_TAMU) {
      return;
    }
    
    // Jika ada editing di row baru (terakhir)
    const row = range.getRow();
    if (row >= 2) {
      console.log(`📝 Data baru terdeteksi di row ${row}`);
      
      // Tunggu 2 detik agar data lengkap
      Utilities.sleep(2000);
      
      // Cek apakah sudah siap kirim (Status masih kosong)
      const statusCell = sheet.getRange(row, 8).getValue();
      if (!statusCell || statusCell === "") {
        console.log(`🎯 Row ${row} siap dikirim (Status kosong)`);
        
        // Auto-send entry ini
        autoSendBukuTamuSingle(row);
      }
    }
    
  } catch (error) {
    console.error("Error in onEdit:", error);
  }
}

// ====================== AUTO SEND SINGLE ENTRY ======================

function autoSendBukuTamuSingle(rowNum) {
  try {
    console.log(`🤖 AUTO-SEND: Processing row ${rowNum}...`);
    
    initializeSystem();
    
    // Check limits
    if (GLOBAL.stats.todaySent >= 100) {
      console.log(`⏸️ Daily limit 100 pesan sudah tercapai`);
      logMessage("", "AUTO", "SKIPPED", "Daily limit reached", "", rowNum, "N/A");
      return;
    }
    
    const sheet = getSheet(CONFIG.SHEET_BUKU_TAMU);
    if (!sheet) {
      console.log(`❌ Sheet tidak ditemukan`);
      return;
    }
    
    // Get data dari row
    const row = sheet.getRange(rowNum, 1, 1, 8).getValues()[0];
    const [timestamp, nama, asal, noHp, kepentingan, tujuan, noHpTujuan, status] = row.map(cell => cell ? cell.toString().trim() : "");
    
    // Validasi data - minimal: nama dan noHp untuk tamu
    // Tujuan bersifat OPTIONAL
    if (!nama || !noHp) {
      console.log(`⚠️ Data required tidak lengkap di row ${rowNum} (nama atau noHp kosong)`);
      logMessage("", "AUTO", "SKIPPED", "Incomplete required data", "", rowNum, "N/A");
      return;
    }
    
    const entry = {
      rowNum: rowNum,
      nama: nama,
      asal: asal,
      noHp: formatPhoneNumber(noHp),
      kepentingan: kepentingan,
      tujuan: tujuan,
      noHpTujuan: noHpTujuan ? formatPhoneNumber(noHpTujuan) : null
    };
    
    if (!entry.noHp) {
      console.log(`❌ Format nomor HP tamu tidak valid di row ${rowNum}`);
      updateCell(sheet, rowNum, 8, "Gagal - Format no HP tamu invalid");
      logMessage("", "AUTO", "FAILED", "Invalid tamu phone format", nama, rowNum, "N/A");
      return;
    }
    
    // Update status ke "Processing"
    updateCell(sheet, rowNum, 8, "Processing...");
    
    let tujuanSuccess = false;
    let tamuSuccess = false;
    
    // ========== PESAN KE TUJUAN (OPTIONAL - jika ada data) ==========
    if (entry.tujuan && entry.noHpTujuan) {
      console.log(`📋 Tujuan tersedia: ${entry.tujuan}, mengirim notifikasi...`);
      const messageTujuan = createTujuanMessage(entry.nama, entry.asal, entry.kepentingan, entry.tujuan);
      const delay1 = calculateRandomDelay(0, 0, 0);
      Utilities.sleep(delay1);
      
      const deviceTujuan = selectRandomAvailableDevice();
      if (!deviceTujuan) {
        console.log(`❌ No available device untuk tujuan`);
        logMessage("", "TUJUAN", "SKIPPED", "No device available", entry.nama, rowNum, "N/A");
      } else {
        const resultTujuan = sendSingleMessage(deviceTujuan, entry.noHpTujuan, messageTujuan, entry.tujuan);
        
        if (resultTujuan.success) {
          deviceTujuan.stats.sent++;
          tujuanSuccess = true;
          GLOBAL.stats.todaySent++;
          console.log(`✅ Terkirim ke Tujuan (${entry.tujuan})`);
          logMessage(entry.noHpTujuan, "TUJUAN", "SUCCESS", "Auto-send", entry.nama, rowNum, deviceTujuan.name);
        } else {
          console.log(`❌ Gagal ke Tujuan: ${resultTujuan.reason}`);
          logMessage(entry.noHpTujuan, "TUJUAN", "FAILED", resultTujuan.reason, entry.nama, rowNum, deviceTujuan.name);
          
          if (resultTujuan.banned) {
            markDeviceBanned(deviceTujuan.token, 24);
          }
        }
      }
    } else {
      console.log(`⚠️ Tujuan/noHpTujuan kosong - skip notifikasi tujuan, tetap kirim ke tamu`);
      logMessage("", "TUJUAN", "SKIPPED", "Tujuan data empty", entry.nama, rowNum, "N/A");
    }
    
    // ========== PESAN KE TAMU (ALWAYS - MANDATORY) ==========
    console.log(`📋 Mengirim notifikasi acknowledgment ke tamu (${entry.nama})...`);
    const messageTamu = createTamuMessage(entry.nama);
    const delay2 = calculateRandomDelay(1, 0, 0);
    Utilities.sleep(delay2);
    
    const deviceTamu = selectRandomAvailableDevice();
    if (!deviceTamu) {
      console.log(`❌ No available device untuk tamu`);
      updateCell(sheet, rowNum, 8, "Gagal - Tidak ada device untuk kirim ke tamu");
      logMessage(entry.noHp, "TAMU", "FAILED", "No device available", entry.nama, rowNum, "N/A");
      return;
    }
    
    const resultTamu = sendSingleMessage(deviceTamu, entry.noHp, messageTamu, entry.nama);
    
    if (resultTamu.success) {
      deviceTamu.stats.sent++;
      GLOBAL.stats.todaySent++;
      tamuSuccess = true;
      console.log(`✅ Terkirim ke Tamu (${entry.nama})`);
      logMessage(entry.noHp, "TAMU", "SUCCESS", "Auto-send", entry.nama, rowNum, deviceTamu.name);
      
      // Update status - sukses jika tamu berhasil
      const noteText = `Terkirim ✓ ${new Date().toLocaleDateString('id-ID')}`;
      updateCell(sheet, rowNum, 8, noteText);
      
      if (tujuanSuccess) {
        console.log(`🎉 AUTO-SEND ROW ${rowNum} - BOTH MESSAGES SENT!`);
      } else {
        console.log(`✅ AUTO-SEND ROW ${rowNum} - TAMU MESSAGE SENT (Tujuan skipped)`)
;
      }
    } else {
      console.log(`❌ Gagal ke Tamu: ${resultTamu.reason}`);
      logMessage(entry.noHp, "TAMU", "FAILED", resultTamu.reason, entry.nama, rowNum, deviceTamu.name);
      updateCell(sheet, rowNum, 8, "Gagal - " + resultTamu.reason);
      
      if (resultTamu.banned) {
        markDeviceBanned(deviceTamu.token, 24);
      }
    }
    
  } catch (error) {
    console.error("Error auto-send:", error);
    logError("AUTO_SEND", error.toString());
    // Silent fail - no UI available in trigger context
  }
}

// ====================== AUTO TRIGGER - TIME BASED ======================

function setupAutoTrigger() {
  console.log("🔧 Setting up auto trigger for BUKU TAMU...");
  
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'autoCheckBukuTamu') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger - setiap 1 menit
    ScriptApp.newTrigger('autoCheckBukuTamu')
      .timeBased()
      .everyMinutes(1)
      .create();
    
    console.log(`✅ Auto trigger setup complete - setiap 1 menit`);
    showAlert("Auto Trigger Setup", `✅ Auto trigger untuk BUKU TAMU berhasil dibuat!\n\nAkan berjalan setiap 1 menit.\n\nKlik Disable AutoTrigger untuk matikan.`);
    
  } catch (error) {
    console.error("Error setting up trigger:", error);
    showAlert("Error", "Gagal setup trigger: " + error.toString());
  }
}

function autoCheckBukuTamu() {
  console.log("🤖 AUTO-CHECK BUKU TAMU - " + new Date().toLocaleString('id-ID'));
  
  try {
    initializeSystem();
    
    // Check daily limit
    if (GLOBAL.stats.todaySent >= 100) {
      console.log(`⏸️ Daily limit tercapai`);
      return;
    }
    
    const sheet = getSheet(CONFIG.SHEET_BUKU_TAMU);
    if (!sheet) {
      console.log("❌ Sheet1 tidak ditemukan");
      return;
    }
    
    // Cari 1 entry pertama yang Status kosong
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      console.log(`✅ Tidak ada data di sheet`);
      return;
    }
    
    const data = sheet.getRange(2, 1, lastRow-1, 8).getValues();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const status = row[7] ? row[7].toString().trim() : "";
      
      // Cari yang Status kosong
      if (!status || status === "") {
        const rowNum = i + 2;
        console.log(`📨 Found pending entry at row ${rowNum}`);
        
        // Auto-send entry ini (no UI calls inside!)
        autoSendBukuTamuSingle(rowNum);
        return; // Hanya kirim 1 per trigger
      }
    }
    
    console.log(`✅ Tidak ada entry yang perlu dikirim`);
    
  } catch (error) {
    console.error("Error auto-check:", error);
    logError("AUTO_CHECK", error.toString());
  }
}

function disableAutoTrigger() {
  console.log("🛑 Disabling auto trigger...");
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'autoCheckBukuTamu') {
        ScriptApp.deleteTrigger(trigger);
        removed++;
      }
    });
    
    console.log(`✅ Removed ${removed} auto trigger(s)`);
    showAlert("Auto Trigger Disabled", "✅ Auto trigger untuk BUKU TAMU berhasil dimatikan.");
    
  } catch (error) {
    console.error("Error disabling trigger:", error);
    showAlert("Error", "Gagal disable trigger: " + error.toString());
  }
}

// ====================== INITIALIZATION ======================

console.log("✅ BUKU TAMU - WA NOTIFIKASI Script loaded");
console.log(`📦 Batch: ${CONFIG.BATCH_SIZE} entries`);
console.log(`🎲 Random device + order selection aktif`);
console.log(`✨ TAMU: ALWAYS (mandatory) - TUJUAN: OPTIONAL`);
console.log(`🔄 onEdit() trigger aktif - Auto-send saat data baru masuk`);
console.log(`✨ Smart formatter untuk kepentingan aktif`);

try {
  onOpen();
} catch (e) {
  console.log("Menu akan load saat spreadsheet dibuka");
}
