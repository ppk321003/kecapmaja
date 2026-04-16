/**
 * MANAJEMEN PEMBELIAN PULSA BULANAN - Google Apps Script
 * 
 * Fitur:
 * 1. Input data pembelian pulsa per bulan
 * 2. Validasi nomina tiap kegiatan per bulan
 * 3. Tracking approval status (draft → pending → approved)
 * 4. Auto-calculate total per bulan
 * 5. Generate laporan bulanan
 * 
 * Sheet yang dibutuhkan:
 * - PULSA-BULANAN (Main data)
 * - MASTER-KEGIATAN (Reference)
 * - LAPORAN-PULSA (Auto-generated)
 * - AUDIT-DUPLIKASI (Auto-generated)
 */

// ==================== KONFIGURASI ====================

const CONFIG = {
  // Sheet names
  sheetPulsaBulanan: 'PULSA-BULANAN',
  sheetMasterKegiatan: 'MASTER-KEGIATAN',
  sheetLaporan: 'LAPORAN-PULSA',
  sheetAudit: 'AUDIT-DUPLIKASI',
  
  // Spreadsheet IDs (untuk export ke spreadsheet lain - optional)
  reportSpreadsheetId: null, // Isi jika ingin laporan di spreadsheet terpisah
};

// ==================== FUNCTION: INITIALIZE SHEETS ====================

/**
 * Initialize semua sheet yang diperlukan
 * Jalankan ini sekali saat setup awal
 */
function initializePulsaSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Create PULSA-BULANAN sheet (kolom baru tanpa Nama Petugas & NIP)
  createSheetIfNotExists(ss, CONFIG.sheetPulsaBulanan, [
    ['No', 'Bulan', 'Tahun', 'Kegiatan', 'Nominal', 'Organik', 'Mitra', 'Status', 'Keterangan', 'Tanggal Input', 'Disetujui Oleh', 'Tanggal Approval']
  ]);
  
  // 2. Create MASTER-KEGIATAN sheet
  createSheetIfNotExists(ss, CONFIG.sheetMasterKegiatan, [
    ['No', 'Kode', 'Nama Kegiatan', 'Nominal Default', 'Kategori', 'Aktif', 'Catatan']
  ]);
  
  // 3. Create LAPORAN-PULSA sheet
  createSheetIfNotExists(ss, CONFIG.sheetLaporan, [
    ['Bulan', 'Tahun', 'Total Item', 'Total Nominal', 'Per Kegiatan', 'Per Organik', 'Total Approved', 'Total Pending', 'Total Draft']
  ]);
  
  // 4. Create AUDIT-DUPLIKASI sheet
  createSheetIfNotExists(ss, CONFIG.sheetAudit, [
    ['Tanggal Check', 'Bulan', 'Tahun', 'Kegiatan', 'Jumlah Item', 'Status', 'Catatan']
  ]);
  
  // Formatting
  formatHeaders(ss.getSheetByName(CONFIG.sheetPulsaBulanan));
  formatHeaders(ss.getSheetByName(CONFIG.sheetMasterKegiatan));
  
  SpreadsheetApp.getUi().alert('✅ Semua sheet sudah siap dengan struktur baru!');
}

function createSheetIfNotExists(ss, sheetName, headerRow) {
  if (!ss.getSheetByName(sheetName)) {
    const sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headerRow);
    return sheet;
  }
  return ss.getSheetByName(sheetName);
}

function formatHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#4472C4');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// ==================== FUNCTION: ADD DATA PULSA ====================

/**
 * Tambah data pembelian pulsa baru
 * 
 * @param {number} bulan - Bulan (1-12)
 * @param {number} tahun - Tahun
 * @param {string} kegiatan - Nama kegiatan
 * @param {number} nominal - Nominal pulsa
 * @param {string} organik - Organisasi/Tim
 * @param {string} mitra - Nama mitra (optional)
 * @param {string} keterangan - Keterangan
 * @returns {Object} Result dengan status dan message
 */
function tambahPulsaBulanan(bulan, tahun, kegiatan, nominal, organik, mitra, keterangan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  
  if (!sheet) {
    return { success: false, message: 'Sheet PULSA-BULANAN tidak ditemukan. Jalankan initializePulsaSheets() dulu.' };
  }
  
  // Validasi input
  if (!bulan || !tahun || !kegiatan || !organik || !nominal) {
    return { success: false, message: 'Field wajib tidak boleh kosong: bulan, tahun, kegiatan, organik, nominal' };
  }
  
  if (nominal <= 0) {
    return { success: false, message: 'Nominal harus lebih dari 0' };
  }
  
  // Get next row number
  const allData = sheet.getDataRange().getValues();
  const nextNo = allData.length; // Row number (0-indexed + 1 untuk no)
  
  // Add data dengan struktur baru
  // Kolom: No, Bulan, Tahun, Kegiatan, Nominal, Organik, Mitra, Status, Keterangan, Tanggal Input, Disetujui Oleh, Tanggal Approval
  const newRow = [
    nextNo,
    bulan,
    tahun,
    kegiatan,
    nominal,
    organik,
    mitra || '',
    'draft',
    keterangan || '',
    new Date(),
    '',
    ''
  ];
  
  sheet.appendRow(newRow);
  
  // Auto-update laporan
  updateLaporanPulsa(tahun, bulan);
  
  return { 
    success: true, 
    message: `✅ Data pulsa untuk "${kegiatan}" sudah disimpan sebagai draft.`,
    rowNumber: nextNo
  };
}

// ==================== FUNCTION: SUBMIT UNTUK APPROVAL ====================

/**
 * Submit data untuk approval PPK
 */
function submitPulsaUntukApproval(rowNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  
  if (!sheet) {
    return { success: false, message: 'Sheet tidak ditemukan' };
  }
  
  // Update status ke "pending" (kolom 8 = Status)
  sheet.getRange(rowNumber, 8).setValue('pending');
  
  Logger.log(`✅ Data row ${rowNumber} submitted untuk approval`);
  return { success: true, message: 'Data sudah dikirim untuk approval PPK' };
}

// ==================== FUNCTION: APPROVE DATA ====================

/**
 * Approve data pembelian pulsa (hanya untuk PPK)
 */
function approvePulsa(rowNumber, approvedBy) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  
  if (!sheet) {
    return { success: false, message: 'Sheet tidak ditemukan' };
  }
  
  // Update status: Kolom 8 = Status, Kolom 11 = Disetujui Oleh, Kolom 12 = Tanggal Approval
  sheet.getRange(rowNumber, 8).setValue('approved');
  sheet.getRange(rowNumber, 11).setValue(approvedBy || 'Unknown');
  sheet.getRange(rowNumber, 12).setValue(new Date());
  
  Logger.log(`✅ Data row ${rowNumber} approved`);
  return { success: true, message: 'Data sudah disetujui' };
}

// ==================== FUNCTION: REJECT DATA ====================

/**
 * Reject data pembelian pulsa
 */
function rejectPulsa(rowNumber, alasan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  
  if (!sheet) {
    return { success: false, message: 'Sheet tidak ditemukan' };
  }
  
  // Update status: Kolom 8 = Status, Kolom 9 = Keterangan
  sheet.getRange(rowNumber, 8).setValue('rejected');
  sheet.getRange(rowNumber, 9).setValue(`Ditolak: ${alasan}`);
  
  Logger.log(`✅ Data row ${rowNumber} rejected`);
  return { success: true, message: 'Data ditolak' };
}

// ==================== FUNCTION: DELETE DATA ====================

/**
 * Delete data (hanya jika masih draft)
 */
function deletePulsa(rowNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  
  if (!sheet) {
    return { success: false, message: 'Sheet tidak ditemukan' };
  }
  
  // Check status (kolom 8 = Status)
  const status = sheet.getRange(rowNumber, 8).getValue();
  if (status !== 'draft') {
    return { success: false, message: 'Hanya data draft yang bisa dihapus' };
  }
  
  // Delete row
  sheet.deleteRow(rowNumber);
  
  Logger.log(`✅ Data row ${rowNumber} deleted`);
  return { success: true, message: 'Data sudah dihapus' };
}

// ==================== FUNCTION: CHECK DUPLIKASI ====================

/**
 * Check dan audit duplikasi kegiatan per bulan
 * Struktur baru: No, Bulan, Tahun, Kegiatan, Nominal, Organik, Mitra, Status, Keterangan, Tanggal Input, Disetujui Oleh, Tanggal Approval
 */
function checkDuplikasiKegiatan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPulsa = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  const sheetAudit = ss.getSheetByName(CONFIG.sheetAudit);
  
  if (!sheetPulsa || !sheetAudit) {
    Logger.log('❌ Sheet tidak ditemukan');
    return;
  }
  
  const allData = sheetPulsa.getDataRange().getValues();
  const auditData = [];
  
  // Group by bulan+tahun+kegiatan
  const grouped = {};
  
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const bulan = row[1];
    const tahun = row[2];
    const kegiatan = row[3];
    const status = row[7];
    
    // Skip jika draft atau rejected
    if (status === 'draft' || status === 'rejected') continue;
    
    const key = `${bulan}-${tahun}-${kegiatan}`;
    if (!grouped[key]) {
      grouped[key] = 0;
    }
    grouped[key]++;
  }
  
  // Cek duplikasi
  for (const key in grouped) {
    const count = grouped[key];
    if (count > 1) {
      const [bulan, tahun, kegiatan] = key.split('-');
      
      auditData.push([
        new Date(),
        bulan,
        tahun,
        kegiatan,
        count,
        '⚠️ DUPLIKASI',
        `Ada ${count} item untuk kegiatan ini di bulan ${bulan}/${tahun}`
      ]);
    }
  }
  
  // Clear old audit data
  if (sheetAudit.getLastRow() > 1) {
    sheetAudit.deleteRows(2, sheetAudit.getLastRow() - 1);
  }
  
  // Add audit data
  if (auditData.length > 0) {
    sheetAudit.getRange(2, 1, auditData.length, auditData[0].length).setValues(auditData);
    Logger.log(`⚠️ Found ${auditData.length} duplicate kegiatans`);
  } else {
    Logger.log('✅ No duplicate kegiatan found');
  }
}

// ==================== FUNCTION: UPDATE LAPORAN ====================

/**
 * Generate laporan bulanan otomatis
 * Struktur: No, Bulan, Tahun, Kegiatan, Nominal, Organik, Mitra, Status, Keterangan, Tanggal Input, Disetujui Oleh, Tanggal Approval
 */
function updateLaporanPulsa(tahun, bulan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPulsa = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  const sheetLaporan = ss.getSheetByName(CONFIG.sheetLaporan);
  
  if (!sheetPulsa || !sheetLaporan) return;
  
  const allData = sheetPulsa.getDataRange().getValues();
  
  // Initialize counters
  let totalItem = 0;
  let totalNominal = 0;
  let totalApproved = 0;
  let totalPending = 0;
  let totalDraft = 0;
  const kegiatanMap = {};
  const organikMap = {};
  
  // Process data
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const bulanRow = row[1];
    const tahunRow = row[2];
    const kegiatan = row[3];
    const nominal = row[4];
    const organik = row[5];
    const status = row[7];
    
    // Filter by bulan & tahun
    if (bulanRow !== bulan || tahunRow !== tahun) continue;
    
    // Count status
    if (status === 'approved' || status === 'completed') {
      totalApproved += nominal;
    } else if (status === 'pending') {
      totalPending += nominal;
    } else if (status === 'draft') {
      totalDraft += nominal;
    }
    
    // Count item & nominal
    if (status === 'approved' || status === 'completed') {
      totalItem++;
      totalNominal += nominal;
      
      // By kegiatan
      kegiatanMap[kegiatan] = (kegiatanMap[kegiatan] || 0) + nominal;
      
      // By organik
      organikMap[organik] = (organikMap[organik] || 0) + nominal;
    }
  }
  
  // Format laporan
  const kegiatanDetail = Object.entries(kegiatanMap).map(([k, v]) => `${k}: Rp ${v.toLocaleString('id-ID')}`).join(' | ');
  const organikDetail = Object.entries(organikMap).map(([k, v]) => `${k}: Rp ${v.toLocaleString('id-ID')}`).join(' | ');
  
  // Find or add row
  const laporanData = sheetLaporan.getDataRange().getValues();
  let rowToUpdate = -1;
  
  for (let i = 1; i < laporanData.length; i++) {
    if (laporanData[i][0] === bulan && laporanData[i][1] === tahun) {
      rowToUpdate = i + 1; // +1 because sheets is 1-indexed
      break;
    }
  }
  
  const laporanRow = [
    bulan,
    tahun,
    totalItem,
    totalNominal,
    kegiatanDetail,
    organikDetail,
    totalApproved,
    totalPending,
    totalDraft
  ];
  
  if (rowToUpdate > 0) {
    sheetLaporan.getRange(rowToUpdate, 1, 1, laporanRow.length).setValues([laporanRow]);
  } else {
    sheetLaporan.appendRow(laporanRow);
  }
  
  Logger.log(`✅ Laporan updated for ${bulan}/${tahun}`);
}

// ==================== FUNCTION: EXPORT LAPORAN ====================

/**
 * Export laporan ke Excel/CSV
 */
function exportLaporanToExcel(bulan, tahun) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPulsa = ss.getSheetByName(CONFIG.sheetPulsaBulanan);
  
  if (!sheetPulsa) {
    Logger.log('❌ Sheet tidak ditemukan');
    return;
  }
  
  // Filter data
  const allData = sheetPulsa.getDataRange().getValues();
  const exportData = [allData[0]]; // Header
  
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (row[1] === bulan && row[2] === tahun) {
      exportData.push(row);
    }
  }
  
  // Create new sheet for export
  const exportSheet = ss.insertSheet(`EXPORT_${bulan}_${tahun}`);
  
  if (exportData.length > 1) {
    exportSheet.getRange(1, 1, exportData.length, exportData[0].length).setValues(exportData);
    
    // Format
    const headerRange = exportSheet.getRange(1, 1, 1, exportData[0].length);
    headerRange.setBackground('#4472C4');
    headerRange.setFontColor('#FFFFFF');
    
    Logger.log(`✅ Export created: EXPORT_${bulan}_${tahun}`);
  } else {
    ss.deleteSheet(exportSheet);
    Logger.log('❌ No data found for export');
  }
}

// ==================== MENU & UI ====================

/**
 * Create custom menu di Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('📱 PULSA MANAGEMENT')
    .addItem('🔧 Initialize Sheets', 'initializePulsaSheets')
    .addItem('✅ Check Duplikasi', 'checkDuplikasiKegiatan')
    .addItem('📊 Update Laporan', 'showUpdateLaporanDialog')
    .addItem('💾 Export to Excel', 'showExportDialog')
    .addSeparator()
    .addItem('ℹ️ Help', 'showHelp')
    .addToUi();
}

function showUpdateLaporanDialog() {
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial; }
      input { padding: 8px; margin: 5px 0; width: 100%; box-sizing: border-box; }
      button { padding: 10px; margin-top: 10px; background-color: #4472C4; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
      button:hover { background-color: #2d5aa6; }
    </style>
    <h2>Update Laporan Pulsa</h2>
    <label>Bulan (1-12):</label>
    <input type="number" id="bulan" min="1" max="12" value="${new Date().getMonth() + 1}">
    
    <label>Tahun:</label>
    <input type="number" id="tahun" value="${new Date().getFullYear()}">
    
    <button onclick="
      const bulan = document.getElementById('bulan').value;
      const tahun = document.getElementById('tahun').value;
      google.script.run.updateLaporanPulsa(tahun, bulan);
      alert('✅ Laporan updated!');
      google.script.host.close();
    ">Update Laporan</button>
  `);
  ui.showModalDialog(html, 'Update Laporan');
}

function showExportDialog() {
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial; padding: 15px; }
      input { padding: 8px; margin: 5px 0; width: 100%; box-sizing: border-box; }
      button { padding: 10px; margin-top: 10px; background-color: #70AD47; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
      button:hover { background-color: #548235; }
    </style>
    <h2>Export Laporan ke Excel</h2>
    <label>Bulan (1-12):</label>
    <input type="number" id="bulan" min="1" max="12" value="${new Date().getMonth() + 1}">
    
    <label>Tahun:</label>
    <input type="number" id="tahun" value="${new Date().getFullYear()}">
    
    <button onclick="
      const bulan = document.getElementById('bulan').value;
      const tahun = document.getElementById('tahun').value;
      google.script.run.exportLaporanToExcel(bulan, tahun);
      alert('✅ Export created! Check new sheet.');
      google.script.host.close();
    ">Export</button>
  `);
  ui.showModalDialog(html, 'Export Laporan');
}

function showHelp() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(`
📱 MANAJEMEN PEMBELIAN PULSA (Struktur Baru)

📊 Sheet yang Digunakan:
- PULSA-BULANAN: Data utama pembelian pulsa
- MASTER-KEGIATAN: Daftar kegiatan referensi
- LAPORAN-PULSA: Laporan bulanan otomatis
- AUDIT-DUPLIKASI: Alert duplikasi kegiatan

✨ Fitur Utama:
✅ Input data pulsa per kegiatan dengan validasi
✅ Cek duplikasi dan analisis audit
✅ Workflow approval (draft → pending → approved)
✅ Generate laporan bulanan otomatis
✅ Export ke Excel

📋 Kolom Baru (Simplified):
No | Bulan | Tahun | Kegiatan | Nominal | Organik | Mitra | Status | Keterangan | Tanggal Input | Disetujui Oleh | Tanggal Approval

👉 Mulai: Initialize Sheets terlebih dahulu!
  `);
}
