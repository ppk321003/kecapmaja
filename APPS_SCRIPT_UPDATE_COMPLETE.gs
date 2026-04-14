// ============================================
// APPS SCRIPT COMPLETE - SPK & BAST GENERATION
// ============================================
// Deployment ID: AKfycbz9IUT4qwZ_5uEZeUVmhWb7kKO5PhkUwuSw-VccngDa7CRUQ9OGuGKnk38BW9P_O957
// URL: https://script.google.com/macros/s/AKfycbz9IUT4qwZ_5uEZeUVmhWb7kKO5PhkUwuSw-VccngDa7CRUQ9OGuGKnk38BW9P_O957/exec
// Version: 7 (Feb 22 2026, 16:45)
//
// FITUR LENGKAP:
// 1. Generate SPK & BAST documents (dengan batch processing)
// 2. Preview data sebelum generate
// 3. Reset Status & Link columns (preserve Keterangan)
// 4. Delete folder by periode
// 5. Full validation & error handling
// ============================================

// === KONSTANTA ===
const TEMPLATE_ID_OK_SD = "1ZA7QZyVLV_9GcTu_9aOsp9KvPn6-JqXRw8SgwHYBOOE";
const MASTER_MITRA_ID_OK_SD = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const BATCH_SIZE_DEFAULT_OK_SD = 16;

// DYNAMIC - akan diterima dari parameter HTTP atau PropertiesService
let DYNAMIC_SPREADSHEET_ID = "";
let DYNAMIC_OUTPUT_FOLDER_ID = "";

// ============================================
// HELPER: Ambil & Set Konfigurasi Dinamis
// ============================================
function getConfigSpreadsheetId() {
  if (DYNAMIC_SPREADSHEET_ID) return DYNAMIC_SPREADSHEET_ID;
  
  const props = PropertiesService.getScriptProperties();
  let savedId = props.getProperty("spreadsheetId");
  if (savedId) {
    DYNAMIC_SPREADSHEET_ID = savedId;
    return savedId;
  }
  
  // Fallback ke active spreadsheet
  return SpreadsheetApp.getActiveSpreadsheet().getId();
}

function getConfigFolderId() {
  if (DYNAMIC_OUTPUT_FOLDER_ID) return DYNAMIC_OUTPUT_FOLDER_ID;
  
  const props = PropertiesService.getScriptProperties();
  let savedId = props.getProperty("folderId");
  if (savedId) {
    DYNAMIC_OUTPUT_FOLDER_ID = savedId;
    return savedId;
  }
  
  // Fallback ke folder hardcoded (backward compatibility)
  return "1RxtMos2V6TAoE-VIuJtmW9lkACLDmtQb";
}

function setSatkerConfig(spreadsheetId, folderId) {
  try {
    const props = PropertiesService.getScriptProperties();
    if (spreadsheetId) {
      props.setProperty("spreadsheetId", spreadsheetId);
      DYNAMIC_SPREADSHEET_ID = spreadsheetId;
    }
    if (folderId) {
      props.setProperty("folderId", folderId);
      DYNAMIC_OUTPUT_FOLDER_ID = folderId;
    }
    Logger.log(`✅ Config saved: spreadsheet=${spreadsheetId}, folder=${folderId}`);
    return true;
  } catch(err) {
    Logger.log(`❌ Error saving config: ${err}`);
    return false;
  }
}

// ============================================
// WEB ENDPOINT - doGet Handler
// ============================================
function doGet(e) {
  const action = e.parameter.action;
  const periode = e.parameter.periode;
  const spreadsheetId = e.parameter.spreadsheetId;
  const folderId = e.parameter.folderId;

  Logger.log(`📥 doGet called - Action: "${action}", Periode: "${periode}"`);
  Logger.log(`   spreadsheetId: ${spreadsheetId ? spreadsheetId.substring(0, 20) + '...' : 'not provided'}`);
  Logger.log(`   folderId: ${folderId ? folderId.substring(0, 20) + '...' : 'not provided'}`);

  try {
    // Simpan config jika diberikan
    if (spreadsheetId || folderId) {
      setSatkerConfig(spreadsheetId, folderId);
    }

    if (action === 'getPeriodeList') {
      Logger.log("✅ Calling getPeriodeListFromSheet()");
      const periodeList = getPeriodeListFromSheet();
      Logger.log("📋 Periode List: " + JSON.stringify(periodeList));
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        periodeList: periodeList
      }));
    } else if (action === 'resetStatus') {
      Logger.log(`🔄 STARTING RESET for periode: "${periode}"`);
      resetStatusForPeriode(periode);
      Logger.log(`✅ RESET COMPLETED for periode: "${periode}"`);
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        message: `Status untuk periode ${periode} telah di-reset`
      }));
    } else if (action === 'deleteFolder') {
      Logger.log(`🗑️ STARTING DELETE for periode: "${periode}"`);
      deleteFolderByPeriode(periode);
      Logger.log(`✅ DELETE COMPLETED for periode: "${periode}"`);
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        message: `Folder ${periode} telah dihapus`
      }));
    } else {
      // Default: Generate SPK & BAST
      Logger.log("🚀 STARTING GENERATION (default action)");
      MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK();
      Logger.log("✅ GENERATION COMPLETED");
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        message: "✅ Proses generation dimulai. Cek Google Drive Anda dalam beberapa menit.",
        timestamp: new Date().toISOString()
      }));
    }
  } catch(err) {
    Logger.log(`❌ ERROR in doGet: ${err.message}`);
    Logger.log(`Stack: ${err.stack}`);
    return HtmlService.createHtmlOutput(JSON.stringify({
      success: false,
      error: err.message
    }));
  }
}

// ============================================
// HELPER: GET PERIODE LIST
// ============================================
function getPeriodeListFromSheet() {
  try {
    Logger.log("📋 Fetching periode list from sheet...");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");
    const dataRange = sheet.getDataRange();
    const allData = dataRange.getValues();
    
    Logger.log(`   Total rows: ${allData.length}`);
    Logger.log(`   Spreadsheet ID: ${ss.getId()}`);
    
    if (allData.length <= 1) {
      Logger.log("⚠️ No data rows found");
      return [];
    }

    const headers = allData[0];
    Logger.log(`   Headers count: ${headers.length}`);
    Logger.log(`   First 5 headers: ${JSON.stringify(headers.slice(0, 5))}`);
    
    const periodeIdx = findColumnIndex(headers, ["Periode (Bulan) SPK"]);
    const statusIdx = findColumnIndex(headers, ["Status"]);
    
    Logger.log(`   Column Indices - Periode: ${periodeIdx}, Status: ${statusIdx}`);
    
    if (periodeIdx === -1) {
      Logger.log("❌ Kolom 'Periode (Bulan) SPK' tidak ditemukan");
      Logger.log(`   Available headers: ${JSON.stringify(headers)}`);
      return [];
    }
    if (statusIdx === -1) {
      Logger.log("❌ Kolom 'Status' tidak ditemukan");
      Logger.log(`   Available headers: ${JSON.stringify(headers)}`);
      return [];
    }
    
    const periodeSet = new Set();
    const statusValues = [];
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const status = row[statusIdx]?.toString().trim() || '';
      const periode = row[periodeIdx]?.toString().trim() || '';
      
      statusValues.push(status);
      
      Logger.log(`   Row ${i}: periode="${periode}", status="${status}"`);
      
      if (status === 'Generated') {
        if (periode) {
          Logger.log(`      ✅ ADDED to set: ${periode}`);
          periodeSet.add(periode);
        } else {
          Logger.log(`      ⚠️ Periode is empty for Generated status`);
        }
      }
    }
    
    Logger.log(`   Unique statuses found: ${JSON.stringify([...new Set(statusValues)])}`);
    
    const result = Array.from(periodeSet).sort();
    Logger.log(`✅ Found ${result.length} periods: ${JSON.stringify(result)}`);
    
    if (result.length === 0) {
      Logger.log(`   ⚠️ NO PERIODS FOUND! Check if any row has status="Generated"`);
    }
    
    return result;
  } catch(err) {
    Logger.log("❌ Error in getPeriodeListFromSheet: " + err);
    Logger.log(`   Stack trace: ${err.stack}`);
    return [];
  }
}

// ============================================
// HELPER: Normalize periode for comparison
// ============================================
function normalizePeriode(periodeValue) {
  if (!periodeValue) return "";
  
  // If it's a Date object, convert to "Bulan Tahun" format
  if (periodeValue instanceof Date) {
    const bulanList = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const month = bulanList[periodeValue.getMonth()];
    const year = periodeValue.getFullYear().toString();
    return `${month} ${year}`;
  }
  
  // If it's a string, trim it
  const strValue = periodeValue.toString().trim();
  
  // Handle cases like "Tue Jan 02 2024 00:00:00 GMT+0700 (Waktu Indonesia Barat)"
  // Try to parse month and year from string representation
  const dateParseRegex = /\(([A-Za-z]+)\s+(\d{4})\)/;
  const match = strValue.match(dateParseRegex);
  if (match && match[2]) {
    const monthText = match[1];
    const year = match[2];
    const bulanMap = {
      "January":"Januari", "February":"Februari", "March":"Maret", "April":"April",
      "May":"Mei", "June":"Juni", "July":"Juli", "August":"Agustus",
      "September":"September", "October":"Oktober", "November":"November", "December":"Desember"
    };
    const bulanIndo = bulanMap[monthText] || monthText;
    return `${bulanIndo} ${year}`;
  }
  
  // Return as-is if already in "Bulan Tahun" format
  return strValue;
}

// ============================================
// HELPER: RESET STATUS (Preserve Keterangan)
// ============================================
function resetStatusForPeriode(targetPeriode) {
  try {
    if (!targetPeriode) {
      Logger.log("⚠️ targetPeriode is empty!");
      throw new Error("Periode tidak boleh kosong");
    }

    Logger.log(`\n🔄 ===== RESET STATUS START =====`);
    Logger.log(`   Target periode: "${targetPeriode}"`);
    Logger.log(`   Length: ${targetPeriode.length}, Type: ${typeof targetPeriode}`);

    const spreadsheetId = getConfigSpreadsheetId();
    Logger.log(`   Using spreadsheet ID: ${spreadsheetId.substring(0, 20)}...`);
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName("Sheet1");
    const dataRange = sheet.getDataRange();
    const allData = dataRange.getValues();
    
    Logger.log(`\n📊 Sheet Info:`);
    Logger.log(`   Total rows: ${allData.length}`);
    Logger.log(`   Total columns: ${allData[0].length}`);
    
    if (allData.length <= 1) {
      Logger.log("❌ No data rows found");
      return;
    }

    const headers = allData[0];
    Logger.log(`\n✅ All Headers:`);
    for (let h = 0; h < headers.length; h++) {
      Logger.log(`   [${h}] = "${headers[h]}"`);
    }
    
    const periodeIdx = findColumnIndex(headers, ["Periode (Bulan) SPK"]);
    const statusIdx = findColumnIndex(headers, ["Status"]);
    const linkIdx = findColumnIndex(headers, ["Link"]);
    const keteranganIdx = findColumnIndex(headers, ["Keterangan"]);
    
    Logger.log(`\n🔍 Column Find Results:`);
    Logger.log(`   Periode (Bulan) SPK: index ${periodeIdx}`);
    Logger.log(`   Status: index ${statusIdx}`);
    Logger.log(`   Link: index ${linkIdx}`);
    Logger.log(`   Keterangan: index ${keteranganIdx}`);
    
    if (periodeIdx === -1) {
      Logger.log(`\n❌ ERROR: Periode column not found!`);
      throw new Error("Kolom Periode tidak ditemukan");
    }
    if (statusIdx === -1) {
      Logger.log(`\n❌ ERROR: Status column not found!`);
      throw new Error("Kolom Status tidak ditemukan");
    }
    
    const normalizedTarget = normalizePeriode(targetPeriode);
    Logger.log(`\n📝 Normalized target periode: "${normalizedTarget}"`);
    Logger.log(`   Searching for rows matching...`);
    
    let resetCount = 0;
    const matchedRows = [];
    const allPeriodes = [];
    const allStatuses = [];
    const periodeMismatchExamples = [];
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const periodeRaw = row[periodeIdx];
      const status = (row[statusIdx] || "").toString().trim();
      const keterangan = keteranganIdx >= 0 ? ((row[keteranganIdx] || "").toString().trim()) : "";
      
      const normalizedCell = normalizePeriode(periodeRaw);
      
      // Collect all unique normalized values for debugging
      if (normalizedCell && !allPeriodes.includes(normalizedCell)) {
        allPeriodes.push(normalizedCell);
      }
      if (status && !allStatuses.includes(status)) {
        allStatuses.push(status);
      }
      
      // Log first 10 rows and any matching rows
      if (i <= 10) {
        Logger.log(`\n   Row ${i}:`);
        Logger.log(`      raw periode = "${periodeRaw}"`);
        Logger.log(`      normalized = "${normalizedCell}" (match: ${normalizedCell === normalizedTarget})`);
        Logger.log(`      status = "${status}"`);
        Logger.log(`      keterangan = "${keterangan}"`);
      }
      
      // Check if this row matches (using normalized comparison)
      if (normalizedCell === normalizedTarget) {
        Logger.log(`   ✅ PERIODE MATCH at row ${i + 1}!`);
        
        if (status === 'Generated') {
          Logger.log(`      ✅ STATUS IS "Generated" - WILL RESET`);
          matchedRows.push(i + 1);
          
          // Clear Status & Link using spreadsheet object
          try {
            if (statusIdx >= 0) {
              const statusRange = sheet.getRange(i + 1, statusIdx + 1);
              statusRange.clearContent();
              Logger.log(`         ✅ Cleared Status at row ${i + 1}, col ${statusIdx + 1}`);
            }
            if (linkIdx >= 0) {
              const linkRange = sheet.getRange(i + 1, linkIdx + 1);
              linkRange.clearContent();
              Logger.log(`         ✅ Cleared Link at row ${i + 1}, col ${linkIdx + 1}`);
            }
            resetCount++;
          } catch (clearErr) {
            Logger.log(`         ❌ ERROR clearing cells: ${clearErr}`);
          }
        } else {
          Logger.log(`      ⚠️ Status is "${status}" (not "Generated") - SKIPPED`);
        }
      } else if (i <= 10) {
        if (normalizedCell !== normalizedTarget) {
          periodeMismatchExamples.push(`"${normalizedCell}" != "${normalizedTarget}"`);
        }
      }
    }
    
    Logger.log(`\n📊 Summary:`);
    Logger.log(`   Rows reset: ${resetCount}`);
    Logger.log(`   Matched rows: ${JSON.stringify(matchedRows)}`);
    Logger.log(`\n📈 Data Analysis:`);
    Logger.log(`   Unique periodes (normalized): ${allPeriodes.length}`);
    Logger.log(`   ${allPeriodes.slice(0, 20).map(p => `"${p}"`).join(", ")}`);
    if (allPeriodes.length > 20) Logger.log(`   ... and ${allPeriodes.length - 20} more`);
    Logger.log(`   Unique statuses in sheet: ${allStatuses.length}`);
    Logger.log(`   ${allStatuses.map(s => `"${s}"`).join(", ")}`);
    
    if (resetCount === 0) {
      Logger.log(`\n⚠️ WARNING: No rows were reset!`);
      Logger.log(`   Possible issues:`);
      Logger.log(`   1. Periode "${normalizedTarget}" not found in data`);
      Logger.log(`   2. Found periode but status != "Generated"`);
      Logger.log(`   3. Period doesn't have any generated rows yet`);
      if (periodeMismatchExamples.length > 0) {
        Logger.log(`   Example mismatches: ${periodeMismatchExamples.slice(0, 3).join(" | ")}`);
      }
    } else {
      Logger.log(`\n✅ SUCCESS: Reset completed!`);
    }
    
    Logger.log(`🔄 ===== RESET STATUS END =====\n`);

  } catch(err) {
    Logger.log(`\n❌ ERROR in resetStatusForPeriode:`);
    Logger.log(`   Message: ${err.message}`);
    Logger.log(`   Stack: ${err.stack}`);
    throw new Error("Gagal reset status: " + err.message);
  }
}

// ============================================
// HELPER: DELETE FOLDER BY PERIODE
// ============================================
function deleteFolderByPeriode(targetPeriode) {
  try {
    if (!targetPeriode) {
      Logger.log("⚠️ targetPeriode is empty!");
      throw new Error("Periode tidak boleh kosong");
    }

    Logger.log(`\n🗑️ ===== DELETE FOLDER START =====`);
    Logger.log(`   Target periode: "${targetPeriode}" (length: ${targetPeriode.length})`);
    
    const normalizedTarget = normalizePeriode(targetPeriode);
    Logger.log(`   Normalized target: "${normalizedTarget}"`);
    
    const outputFolderId = getConfigFolderId();
    Logger.log(`   OUTPUT_FOLDER_ID: ${outputFolderId}`);
    
    const outputFolder = DriveApp.getFolderById(outputFolderId);
    
    if (!outputFolder) {
      Logger.log("❌ Output folder tidak ditemukan");
      throw new Error("Output folder tidak ditemukan");
    }
    
    Logger.log(`📁 Output Folder found: ${outputFolder.getName()}`);
    Logger.log(`🔍 Searching for subfolder matching: "${normalizedTarget}"`);
    
    const folders = outputFolder.getFolders();
    let deleteCount = 0;
    
    const foldersToDelete = [];
    let folderCount = 0;
    const allFolderNames = [];
    
    while (folders.hasNext()) {
      const folder = folders.next();
      const folderName = folder.getName();
      allFolderNames.push(folderName);
      
      const normalizedFolder = normalizePeriode(folderName);
      Logger.log(`   Found folder: "${folderName}" -> normalized: "${normalizedFolder}"`);
      
      if (normalizedFolder === normalizedTarget) {
        folderCount++;
        Logger.log(`      ✅ MATCH! Adding to delete list (${folderCount})`);
        foldersToDelete.push(folder);
      }
    }
    
    Logger.log(`\n📊 Total matching folders: ${foldersToDelete.length}`);
    
    if (foldersToDelete.length === 0) {
      Logger.log(`⚠️ NO MATCHING FOLDER FOUND for "${normalizedTarget}"`);
      Logger.log(`   All folders in output folder (first 30):`);
      for (let i = 0; i < Math.min(30, allFolderNames.length); i++) {
        Logger.log(`      - "${allFolderNames[i]}"`);
      }
      if (allFolderNames.length > 30) {
        Logger.log(`   ... and ${allFolderNames.length - 30} more`);
      }
    }
    
    for (let i = 0; i < foldersToDelete.length; i++) {
      const folder = foldersToDelete[i];
      Logger.log(`🗑️ Deleting folder: "${folder.getName()}" (${i + 1}/${foldersToDelete.length})`);
      try {
        // Count files before delete
        const files = folder.getFiles();
        let fileCount = 0;
        while (files.hasNext()) {
          files.next();
          fileCount++;
        }
        Logger.log(`   Contains ${fileCount} files`);
        
        // Properly trash the folder (move to trash, not just remove from storage)
        folder.setTrashed(true);
        Logger.log(`   ✅ Folder successfully moved to trash`);
        deleteCount++;
      } catch(deleteErr) {
        Logger.log(`   ❌ Failed to delete folder: ${deleteErr}`);
      }
    }
    
    Logger.log(`\n✅ Delete completed: ${deleteCount}/${foldersToDelete.length} folders deleted`);
    Logger.log(`🗑️ ===== DELETE FOLDER END =====\n`);
  } catch(err) {
    Logger.log(`\n❌ ERROR in deleteFolderByPeriode:`);
    Logger.log(`   Message: ${err.message}`);
    Logger.log(`   Stack: ${err.stack}`);
    throw new Error("Gagal delete folder: " + err.message);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function findColumnIndex(header, possibleNames) {
  for (const name of possibleNames) {
    const index = header.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

function safeSplit(value, separator) {
  if (!value) return [];
  const str = value.toString().trim();
  if (!str) return [];
  return str.split(separator).map(item => item.trim()).filter(Boolean);
}

function createPetugasKey(nik, nama, periode = "") {
  const cleanNik = (nik || "").toString().trim();
  const cleanNama = (nama || "").toString().trim();
  const cleanPeriode = (periode || "").toString().trim();
  
  if (cleanNik && cleanNik !== "") {
    const baseKey = `${cleanNik}-${cleanNama}`;
    return cleanPeriode ? `${baseKey}-${cleanPeriode}` : baseKey;
  } else {
    const baseKey = cleanNama.toLowerCase();
    return cleanPeriode ? `${baseKey}-${cleanPeriode}` : baseKey;
  }
}

function formatTanggalIndoCustom(date) {
  try {
    if (!date) return "";
    if (!(date instanceof Date)) date = new Date(date);
    if (isNaN(date.getTime())) return "";
    return Utilities.formatDate(date, "Asia/Jakarta", "d MMMM yyyy")
      .replace("January","Januari").replace("February","Februari").replace("March","Maret")
      .replace("May","Mei").replace("June","Juni").replace("July","Juli")
      .replace("August","Agustus").replace("October","Oktober").replace("December","Desember");
  } catch (e) { return ""; }
}

function filterQualifiedData(sheet, executionId) {
  const dataRange = sheet.getDataRange();
  const allData = dataRange.getValues();
  
  if (allData.length <= 1) {
    return { headers: allData[0] || [], rows: [], rowNumbers: [] };
  }

  const headers = allData[0];
  const statusColIndex = findColumnIndex(headers, ["Status"]);
  const keteranganColIndex = findColumnIndex(headers, ["Keterangan"]);
  
  const qualifiedRows = [];
  const qualifiedRowNumbers = [];
  
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const rowNumber = i + 1;
    
    const status = row[statusColIndex] ? row[statusColIndex].toString().trim() : "";
    const keterangan = row[keteranganColIndex] ? row[keteranganColIndex].toString().trim() : "";
    
    if (status === "Generated" || keterangan !== "Kirim ke PPK") {
      continue;
    }
    
    qualifiedRows.push(row);
    qualifiedRowNumbers.push(rowNumber);
  }
  
  Logger.log(`✅ [${executionId}] Filter selesai: ${qualifiedRows.length} baris memenuhi syarat`);
  
  return {
    headers: headers,
    rows: qualifiedRows,
    rowNumbers: qualifiedRowNumbers
  };
}

function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    try {
      ScriptApp.deleteTrigger(trigger);
    } catch (e) {}
  });
}

function createNextTrigger() {
  try {
    deleteAllTriggers();
    const delayMs = 1 * 60 * 1000;
    ScriptApp.newTrigger("MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK")
      .timeBased()
      .after(delayMs)
      .create();
    Logger.log(`⏳ Trigger berikutnya dibuat (1 menit)`);
  } catch(err) { 
    Logger.log("⚠️ Gagal buat trigger: " + err); 
  }
}

function createDelayedTrigger(delayMs) {
  try {
    deleteAllTriggers();
    const safeDelayMs = Math.max(delayMs, 1 * 60 * 1000);
    ScriptApp.newTrigger("MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK")
      .timeBased()
      .after(safeDelayMs)
      .create();
    Logger.log(`⏳ Menunggu ${safeDelayMs/60000} menit untuk retry...`);
  } catch(err) { 
    Logger.log("⚠️ Gagal buat delayed trigger: " + err); 
  }
}

function setHorizontalAlignment(cell, alignment) {
  try {
    const child = cell.getChild(0);
    if (child && child.getType && child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      child.setAlignment(alignment);
    }
  } catch(e) {}
}

function setTableCellFontSize(cell, fontSize) {
  try {
    for (let i = 0; i < cell.getNumChildren(); i++) {
      const child = cell.getChild(i);
      if (child.getType && child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        child.asParagraph().setFontSize(fontSize);
      }
    }
  } catch (e) {}
}

function cleanupAfterCompletion() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty("batchIndex");
  props.deleteProperty("currentPeriode");
  props.deleteProperty("lastUrut");
  
  const allProperties = props.getProperties();
  Object.keys(allProperties).forEach(key => {
    if (key.startsWith('processed_')) {
      props.deleteProperty(key);
    }
  });
  
  deleteAllTriggers();
  Logger.log("🧹 Semua properties dibersihkan. PROSES SELESAI!");
}

// ============================================
// MAIN FUNCTION: GENERATE SPK & BAST (BATCH)
// ============================================
function MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK(e) {
  const startTime = new Date();
  const executionId = Utilities.getUuid().substring(0, 8);
  Logger.log(`⏰ [${executionId}] Memulai eksekusi dengan REALISASI dari spreadsheet utama...`);
  
  const spreadsheetId = getConfigSpreadsheetId();
  Logger.log(`   Using spreadsheet ID: ${spreadsheetId.substring(0, 20)}...`);
  
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName("Sheet1");
  if (!sheet) {
    Logger.log(`❌ [${executionId}] Sheet1 tidak ditemukan.`);
    return;
  }

  Logger.log(`🔍 [${executionId}] Memfilter data yang memenuhi syarat...`);
  const filteredData = filterQualifiedData(sheet, executionId);
  
  if (filteredData.rows.length === 0) {
    Logger.log(`ℹ️ [${executionId}] Tidak ada data yang memenuhi syarat.`);
    return;
  }

  Logger.log(`📊 [${executionId}] Data setelah filter: ${filteredData.rows.length} baris`);
  
  const header = filteredData.headers;
  const data = [header, ...filteredData.rows];
  const rowNumbers = filteredData.rowNumbers;

  const BATCH_SIZE = BATCH_SIZE_DEFAULT_OK_SD;
  const props = PropertiesService.getScriptProperties();
  const outputFolderId = getConfigFolderId();
  const outputFolder = DriveApp.getFolderById(outputFolderId);

  const statusColIndex = findColumnIndex(header, ["Status"]);
  const linkColIndex = findColumnIndex(header, ["Link"]);
  const nikColIndex = findColumnIndex(header, ["NIK"]);
  
  Logger.log(`📊 [${executionId}] Kolom Status: ${statusColIndex}, Link: ${linkColIndex}, NIK: ${nikColIndex}`);
  Logger.log(`📁 [${executionId}] Output Folder ID: ${outputFolderId}`);

  const namaHari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const namaBulanList = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const bulanMap = {"Januari":0,"Februari":1,"Maret":2,"April":3,"Mei":4,"Juni":5,"Juli":6,"Agustus":7,"September":8,"Oktober":9,"November":10,"Desember":11};

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    Logger.log(`⚠️ [${executionId}] Gagal lock, retry dalam 30 detik`);
    createDelayedTrigger(30000);
    return;
  }

  let batchIndex = 0;
  let lastUrut = 0;
  let currentPeriode = "";
  
  if (e && e.triggerUid) {
    batchIndex = parseInt(props.getProperty("batchIndex") || "0");
    lastUrut = parseInt(props.getProperty("lastUrut") || "0");
    currentPeriode = props.getProperty("currentPeriode") || "";
    Logger.log(`🔍 [${executionId}] Loaded state: batchIndex=${batchIndex}, lastUrut=${lastUrut}, periode=${currentPeriode}`);
  } else {
    props.deleteProperty("batchIndex");
    props.deleteProperty("currentPeriode");
    props.deleteProperty("lastUrut");
    batchIndex = 0;
    lastUrut = 0;
    currentPeriode = "";
    Logger.log(`🔁 [${executionId}] Manual execution - reset state`);
  }

  Logger.log(`📖 [${executionId}] Membaca master mitra...`);
  let masterMap = {};
  try {
    const masterSs = SpreadsheetApp.openById(MASTER_MITRA_ID_OK_SD);
    const masterSheet = masterSs.getSheetByName("MASTER.MITRA");
    if (masterSheet) {
      const masterRange = masterSheet.getRange(1, 1, masterSheet.getLastRow(), masterSheet.getLastColumn());
      const masterData = masterRange.getValues();
      
      if (masterData.length > 1) {
        const masterHeader = masterData[0];
        const idxNIK = findColumnIndex(masterHeader, ["NIK"]);
        const idxNama = findColumnIndex(masterHeader, ["Nama"]);
        const idxPekerjaan = findColumnIndex(masterHeader, ["Pekerjaan"]);
        const idxAlamat = findColumnIndex(masterHeader, ["Alamat"]);
        
        for (let i = 1; i < masterData.length; i++) {
          const r = masterData[i];
          const nik = (r[idxNIK] || "").toString().trim();
          const nama = (r[idxNama] || "").toString().trim();
          
          if (nama) {
            const key = createPetugasKey(nik, nama);
            masterMap[key] = { 
              nik: nik,
              nama: nama,
              pekerjaan: r[idxPekerjaan] || "-", 
              alamat: r[idxAlamat] || "-" 
            };
            
            if (!masterMap[nama.toLowerCase()]) {
              masterMap[nama.toLowerCase()] = masterMap[key];
            }
          }
        }
        Logger.log(`✅ [${executionId}] Master loaded: ${Object.keys(masterMap).length} entries`);
      }
    }
  } catch (err) { 
    Logger.log(`⚠️ [${executionId}] Master error: ${err}`); 
  }

  const gabungFungsi = arr => {
    if (!arr || !Array.isArray(arr)) return "";
    arr = [...new Set(arr)].filter(Boolean);
    if (arr.length === 0) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0] + " dan " + arr[1];
    return arr.slice(0, -1).join(", ") + " dan " + arr.slice(-1);
  };

  function terbilang(n) {
    if (n === 0) return "";
    if (n > 1000000000) return "angka terlalu besar";
    const s = ["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];
    n = Math.floor(n);
    if (n < 12) return s[n];
    if (n < 20) return s[n - 10] + " belas";
    if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh " + s[n % 10];
    if (n < 200) return "seratus " + terbilang(n - 100);
    if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
    if (n < 2000) return "seribu " + terbilang(n - 1000);
    if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
    if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
    return "angka terlalu besar";
  }

  const formatTanggalSPK = date => {
    try {
      if (!date) return "";
      if (!(date instanceof Date)) date = new Date(date);
      if (isNaN(date.getTime())) return "";
      return terbilang(date.getDate());
    } catch (e) { return ""; }
  };

  const formatTanggalIndo = date => {
    try {
      if (!date) return "";
      if (!(date instanceof Date)) date = new Date(date);
      if (isNaN(date.getTime())) return "";
      return Utilities.formatDate(date, "Asia/Jakarta", "d MMMM yyyy")
        .replace("January","Januari").replace("February","Februari").replace("March","Maret")
        .replace("May","Mei").replace("June","Juni").replace("July","Juli")
        .replace("August","Agustus").replace("October","Oktober").replace("December","Desember");
    } catch (e) { return ""; }
  };

  Logger.log(`🔄 [${executionId}] Grouping data by periode...`);

  const dataByPeriode = {};

  for (let rowIndex = 0; rowIndex < data.length - 1; rowIndex++) {
    const currentTime = new Date();
    const elapsed = (currentTime - startTime) / 1000;
    if (elapsed > 250) {
      Logger.log(`⏰ [${executionId}] Waktu habis saat grouping`);
      break;
    }

    const rowData = data[rowIndex + 1];
    const originalRowNumber = rowNumbers[rowIndex];
    
    const obj = {};
    header.forEach((h, i) => obj[h] = rowData[i]);

    const validationResult = validateAndProcessRowDataWithRealisasi(obj, header, executionId);
    if (!validationResult.isValid) {
      Logger.log(`❌ [${executionId}] Baris ${originalRowNumber} skip: ${validationResult.error}`);
      continue;
    }

    let namaBulan = "Januari", tahun = new Date().getFullYear().toString();
    const periodeRaw = obj["Periode (Bulan) SPK"];
    if (periodeRaw instanceof Date) {
      namaBulan = namaBulanList[periodeRaw.getMonth()];
      tahun = periodeRaw.getFullYear().toString();
    } else if (typeof periodeRaw === "string" && periodeRaw.trim()) {
      const parts = periodeRaw.trim().split(/\s+/);
      if (parts[0]) namaBulan = parts[0];
      if (parts[1]) tahun = parts[1];
    }
    
    const periodeKey = `${namaBulan} ${tahun}`;
    
    if (!dataByPeriode[periodeKey]) {
      const bulanIdx = bulanMap[namaBulan] ?? 0;
      const bulanNum = ("0" + (bulanIdx + 1)).slice(-2);
      const awalBulan = new Date(parseInt(tahun), bulanIdx, 1);
      const akhirBulan = new Date(parseInt(tahun), bulanIdx + 1, 0);

      const getPreviousWorkday = date => { 
        const d = new Date(date); 
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1); 
        return d; 
      };
      const tglSPK = getPreviousWorkday(awalBulan);

      dataByPeriode[periodeKey] = {
        namaBulan: namaBulan,
        tahun: tahun,
        bulanNum: bulanNum,
        awalBulan: awalBulan,
        akhirBulan: akhirBulan,
        tglSPK: tglSPK,
        petugasMap: new Map(),
        rowIndices: new Set()
      };
    }
    
    const periodeData = dataByPeriode[periodeKey];
    periodeData.rowIndices.add(originalRowNumber);

    const processedData = validationResult.processedData;
    
    processedData.forEach((petugasData) => {
      const petugasKey = createPetugasKey(petugasData.nik, petugasData.nama, periodeKey);
      
      if (!periodeData.petugasMap.has(petugasKey)) {
        const masterKey = createPetugasKey(petugasData.nik, petugasData.nama);
        const masterData = masterMap[masterKey] || masterMap[petugasData.nama.toLowerCase()] || {};
        
        periodeData.petugasMap.set(petugasKey, {
          nik: petugasData.nik,
          nama: petugasData.nama, 
          bulan: periodeData.namaBulan, 
          bulanNum: periodeData.bulanNum,
          tahun: periodeData.tahun,
          hari: namaHari[periodeData.tglSPK.getDay()],
          tanggal: formatTanggalSPK(periodeData.tglSPK),
          tanggalSingkat: formatTanggalIndo(periodeData.tglSPK),
          awalBulan: formatTanggalIndo(periodeData.awalBulan),
          akhirBulan: formatTanggalIndo(periodeData.akhirBulan),
          fungsi: [], 
          nilai: 0,
          pekerjaan: masterData.pekerjaan || "-",
          alamat: masterData.alamat || "-",
          templateSpkId: petugasData.templateSpkId || "",
          uraianTugas: [],
          rowIndices: new Set()
        });
      }

      const spkData = periodeData.petugasMap.get(petugasKey);
      if (!spkData.templateSpkId && petugasData.templateSpkId) {
        spkData.templateSpkId = petugasData.templateSpkId;
      }
      spkData.rowIndices.add(originalRowNumber);

      petugasData.fungsi.forEach(fungsi => {
        if (fungsi && !spkData.fungsi.includes(fungsi)) {
          spkData.fungsi.push(fungsi);
        }
      });

      spkData.nilai += (petugasData.nilai || 0);

      spkData.uraianTugas.push({ 
        namaKegiatan: petugasData.uraian, 
        jangkaWaktu: petugasData.jangkaWaktu, 
        target: petugasData.target, 
        realisasi: petugasData.realisasi,
        satuan: petugasData.satuan, 
        nilai: petugasData.nilai || 0, 
        beban: petugasData.beban,
        hargaSatuan: petugasData.hargaSatuan || 0
      });
    });
  }

  Logger.log(`📊 [${executionId}] Grouped: ${Object.keys(dataByPeriode).length} periode`);

  const semuaPeriode = Object.keys(dataByPeriode).sort();
  
  if (semuaPeriode.length === 0) {
    Logger.log(`❌ [${executionId}] Tidak ada periode.`);
    lock.releaseLock();
    return;
  }

  if (!currentPeriode) {
    currentPeriode = semuaPeriode[0];
    props.setProperty("currentPeriode", currentPeriode);
    Logger.log(`🎯 [${executionId}] Start: ${currentPeriode}`);
  }

  const currentPeriodeData = dataByPeriode[currentPeriode];
  if (!currentPeriodeData) {
    Logger.log(`❌ [${executionId}] Periode ${currentPeriode} not found.`);
    lock.releaseLock();
    return;
  }

  const allPetugasKeys = Array.from(currentPeriodeData.petugasMap.keys());
  const totalPetugas = allPetugasKeys.length;
  
  Logger.log(`📊 [${executionId}] Total petugas: ${totalPetugas}`);
  
  const start = batchIndex * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, totalPetugas);
  
  let periodeFolder;
  let folderUrl = "";
  try {
    const existingFolders = outputFolder.getFoldersByName(currentPeriode);
    if (existingFolders.hasNext()) {
      periodeFolder = existingFolders.next();
      folderUrl = periodeFolder.getUrl();
      Logger.log(`📁 Folder exists: ${periodeFolder.getName()}`);
    } else {
      periodeFolder = outputFolder.createFolder(currentPeriode);
      folderUrl = periodeFolder.getUrl();
      Logger.log(`📁 Folder created: ${periodeFolder.getName()}`);
    }
  } catch (err) {
    Logger.log(`⚠️ Folder error: ${err}`);
    periodeFolder = outputFolder;
    folderUrl = outputFolder.getUrl();
  }

  try {
    if (linkColIndex !== -1 && folderUrl) {
      const rowIndices = Array.from(currentPeriodeData.rowIndices);
      for (const rowIndex of rowIndices) {
        sheet.getRange(rowIndex, linkColIndex + 1).setValue(folderUrl);
      }
      Logger.log(`✅ Link updated: ${rowIndices.length} rows`);
    }
  } catch (err) {
    Logger.log(`⚠️ Link error: ${err}`);
  }

  if (start >= totalPetugas) {
    Logger.log(`✅ Batch done untuk ${currentPeriode}`);
    
    try {
      if (statusColIndex !== -1) {
        const rowIndices = Array.from(currentPeriodeData.rowIndices);
        for (const rowIndex of rowIndices) {
          const currentStatus = sheet.getRange(rowIndex, statusColIndex + 1).getValue();
          if (currentStatus !== "Generated") {
            sheet.getRange(rowIndex, statusColIndex + 1).setValue("Generated");
          }
        }
        Logger.log(`✅ Status updated: ${rowIndices.length} rows`);
      }
    } catch (err) {
      Logger.log(`⚠️ Status error: ${err}`);
    }
    
    const currentIndex = semuaPeriode.indexOf(currentPeriode);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < semuaPeriode.length) {
      const nextPeriode = semuaPeriode[nextIndex];
      props.setProperty("currentPeriode", nextPeriode);
      props.setProperty("batchIndex", "0");
      props.setProperty("lastUrut", "0");
      Logger.log(`🔄 Next periode: ${nextPeriode}`);
      lock.releaseLock();
      createNextTrigger();
    } else {
      Logger.log(`🎯 ALL DONE!`);
      lock.releaseLock();
      deleteAllTriggers();
      cleanupAfterCompletion();
    }
    return;
  }

  Logger.log(`▶️ Batch ${batchIndex + 1}: ${start + 1}–${end}/${totalPetugas}`);

  Logger.log(`📝 Creating documents...`);
  let urut = lastUrut + 1;
  let dokumenDibuat = 0;

  const processedPetugasKey = `processed_${currentPeriode.replace(/\s+/g, '_')}`;
  let processedPetugas = JSON.parse(props.getProperty(processedPetugasKey) || '{}');

  for (let i = start; i < end; i++) {
    const currentTime = new Date();
    const elapsed = (currentTime - startTime) / 1000;
    if (elapsed > 250) {
      Logger.log(`⏰ Time up, saving progress`);
      props.setProperty("batchIndex", batchIndex.toString());
      props.setProperty("lastUrut", (urut - 1).toString());
      props.setProperty("currentPeriode", currentPeriode);
      props.setProperty(processedPetugasKey, JSON.stringify(processedPetugas));
      lock.releaseLock();
      createNextTrigger();
      return;
    }

    const key = allPetugasKeys[i];
    const spk = currentPeriodeData.petugasMap.get(key);
    
    if (processedPetugas[key]) {
      Logger.log(`⏭️ Skip ${spk.nama} (already processed)`);
      urut++;
      continue;
    }

    const noSPK = `${String(urut).padStart(2, "0")}/SPK/PPK/3210/${spk.bulanNum}/${spk.tahun}`;
    const noBAST = `${String(urut).padStart(2, "0")}/BAST/PPK/3210/${spk.bulanNum}/${spk.tahun}`;
    
    const bulanIdx = bulanMap[spk.bulan] ?? 0;
    const tglBAST = new Date(parseInt(spk.tahun), bulanIdx + 1, 0);
    const tglBAST_terbilang = namaHari[tglBAST.getDay()] + " tanggal " + terbilang(tglBAST.getDate()) + " bulan " + spk.bulan.toLowerCase() + " tahun " + terbilang(parseInt(spk.tahun));
    
    try {
      const templateId = spk.templateSpkId || TEMPLATE_ID_OK_SD;
      Logger.log(`   Using template ID: ${templateId}`);
      const templateFile = DriveApp.getFileById(templateId);
      
      const expectedFileName = `${noSPK} - ${spk.nama}`;
      const realTimeCheck = periodeFolder.getFilesByName(expectedFileName);
      
      if (realTimeCheck.hasNext()) {
        Logger.log(`⏭️ Skip ${spk.nama} - doc exists`);
        processedPetugas[key] = true;
        urut++;
        continue;
      }
      
      const finalFile = templateFile.makeCopy(expectedFileName, periodeFolder);
      const finalDoc = DocumentApp.openById(finalFile.getId());
      const body = finalDoc.getBody();

      const totalNilai = spk.uraianTugas.reduce((sum, u) => sum + (u.nilai || 0), 0);

      const replaceMap = {
        "<<no_spk>>": noSPK,
        "<<no_bast>>": noBAST,
        "<<tgl_bast>>": tglBAST_terbilang,
        "<<nama>>": spk.nama,
        "<<pekerjaan>>": spk.pekerjaan,
        "<<alamat>>": spk.alamat,
        "<<honor_total>>": totalNilai.toLocaleString("id-ID"),
        "<<nominal_honor_total>>": terbilang(totalNilai) + " rupiah",
        "<<bulan>>": spk.bulan,
        "<<tahun>>": spk.tahun,
        "<<hari>>": spk.hari,
        "<<tanggal>>": spk.tanggal,
        "<<awal_bulan>>": spk.awalBulan,
        "<<akhir_bulan>>": spk.akhirBulan,
        "<<fungsi_gabung>>": gabungFungsi(spk.fungsi)
      };

      for (const [key, value] of Object.entries(replaceMap)) {
        try {
          body.replaceText(key, value);
        } catch(e) {}
      }

      try {
        const marker = body.findText('<<tabel_bast>>');
        if (marker) {
          const element = marker.getElement();
          const parent = element.getParent();
          const startOffset = marker.getStartOffset();
          const endOffset = marker.getEndOffsetInclusive();
          
          if (element.editAsText) {
            element.asText().deleteText(startOffset, endOffset);
          }

          const insertIndex = body.getChildIndex(parent) + 1;
          const tbl = body.insertTable(insertIndex);

          const headerRow = tbl.appendTableRow();
          ['No', 'Uraian Tugas', 'Target', 'Realisasi', 'Satuan'].forEach((h, idx) => {
            const c = headerRow.appendTableCell(h);
            const text = c.editAsText();
            text.setBold(false);
            text.setFontSize(10);
            c.setPaddingTop(0.5);
            c.setPaddingBottom(0.5);
            c.setPaddingLeft(1);
            c.setPaddingRight(1);
            setHorizontalAlignment(c, idx === 1 ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.CENTER);
          });

          spk.uraianTugas.forEach((u, i) => {
            const row = tbl.appendTableRow();

            const cellNo = row.appendTableCell(String(i + 1));
            setTableCellFontSize(cellNo, 10);
            setHorizontalAlignment(cellNo, DocumentApp.HorizontalAlignment.CENTER);

            const cellUraian = row.appendTableCell(u.namaKegiatan || '');
            setTableCellFontSize(cellUraian, 10);
            setHorizontalAlignment(cellUraian, DocumentApp.HorizontalAlignment.LEFT);

            const cellTarget = row.appendTableCell(String(u.target || ''));
            setTableCellFontSize(cellTarget, 10);
            setHorizontalAlignment(cellTarget, DocumentApp.HorizontalAlignment.CENTER);

            const realisasi = u.realisasi || u.target || '';
            const cellRealisasi = row.appendTableCell(String(realisasi));
            setTableCellFontSize(cellRealisasi, 10);
            setHorizontalAlignment(cellRealisasi, DocumentApp.HorizontalAlignment.CENTER);

            const cellSatuan = row.appendTableCell(u.satuan || '');
            setTableCellFontSize(cellSatuan, 10);
            setHorizontalAlignment(cellSatuan, DocumentApp.HorizontalAlignment.CENTER);

            for (let j = 0; j < row.getNumCells(); j++) {
              const cell = row.getCell(j);
              cell.setPaddingTop(0.5);
              cell.setPaddingBottom(0.5);
              cell.setPaddingLeft(1);
              cell.setPaddingRight(1);
            }
          });

          const widths = [25, 300, 45, 46, 67];
          for (let r = 0; r < tbl.getNumRows(); r++) {
            const row = tbl.getRow(r);
            for (let c = 0; c < row.getNumCells(); c++) {
              try {
                row.getCell(c).setWidth(widths[c]);
              } catch(e) {}
            }
          }
        }
      } catch (err) {
        Logger.log(`⚠️ BAST table error: ${err}`);
      }

      try {
        const tables = body.getTables();
        let mainTable = null;
        
        for (let t = 0; t < tables.length; t++) {
          const firstRow = tables[t].getRow(0);
          const txt = firstRow.getText().toLowerCase();
          if (txt.indexOf('uraian') !== -1 || txt.indexOf('kegiatan') !== -1) {
            mainTable = tables[t];
            break;
          }
        }

        if (mainTable) {
          while (mainTable.getNumRows() > 2) {
            mainTable.removeRow(mainTable.getNumRows() - 1);
          }

          spk.uraianTugas.forEach((u, index) => {
            const row = mainTable.appendTableRow();
            
            // No
            let cell = row.appendTableCell(String(index + 1));
            cell.editAsText().setFontSize(10);
            
            // Uraian Tugas
            cell = row.appendTableCell(String(u.namaKegiatan || ""));
            cell.editAsText().setFontSize(10);
            
            // Beban Anggaran
            cell = row.appendTableCell(u.beban || "");
            cell.editAsText().setFontSize(10);
            
            // Jangka Waktu
            cell = row.appendTableCell(u.jangkaWaktu || "");
            cell.editAsText().setFontSize(10);
            
            // Target
            cell = row.appendTableCell(String(u.target || ""));
            cell.editAsText().setFontSize(10);
            
            // Satuan
            cell = row.appendTableCell(u.satuan || "");
            cell.editAsText().setFontSize(10);
            
            // Harga Satuan
            cell = row.appendTableCell(u.hargaSatuan ? "Rp. " + u.hargaSatuan.toLocaleString("id-ID") : "-");
            cell.editAsText().setFontSize(10);
            
            // Nilai Perjanjian
            cell = row.appendTableCell("Rp. " + (u.nilai || 0).toLocaleString("id-ID"));
            cell.editAsText().setFontSize(10);
          });
        }
      } catch(e) { 
        Logger.log(`⚠️ SPK table error: ${e}`); 
      }

      finalDoc.saveAndClose();
      processedPetugas[key] = true;
      Logger.log(`✅ ${urut}. ${finalFile.getName()}`);
      
      urut++;
      dokumenDibuat++;
      
    } catch(err) {
      Logger.log(`⚠️ Doc error ${spk.nama}: ${err}`);
    }
  }

  const nextBatchIndex = batchIndex + 1;
  const finalUrut = urut - 1;
  
  props.setProperty("batchIndex", nextBatchIndex.toString());
  props.setProperty("lastUrut", finalUrut.toString());
  props.setProperty("currentPeriode", currentPeriode);
  props.setProperty(processedPetugasKey, JSON.stringify(processedPetugas));
  
  Logger.log(`💾 Progress: batch=${nextBatchIndex}, urut=${finalUrut}`);
  Logger.log(`📋 Created: ${dokumenDibuat}/${end - start}`);

  if (end >= totalPetugas) {
    Logger.log(`✅ Last batch for ${currentPeriode}`);
    
    try {
      if (statusColIndex !== -1) {
        const rowIndices = Array.from(currentPeriodeData.rowIndices);
        for (const rowIndex of rowIndices) {
          const currentStatus = sheet.getRange(rowIndex, statusColIndex + 1).getValue();
          if (currentStatus !== "Generated") {
            sheet.getRange(rowIndex, statusColIndex + 1).setValue("Generated");
          }
        }
        Logger.log(`✅ Status final: ${rowIndices.length} rows`);
      }
    } catch (err) {
      Logger.log(`⚠️ Status final error: ${err}`);
    }
    
    props.deleteProperty(processedPetugasKey);
    
    const currentIndex = semuaPeriode.indexOf(currentPeriode);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < semuaPeriode.length) {
      const nextPeriode = semuaPeriode[nextIndex];
      props.setProperty("currentPeriode", nextPeriode);
      props.setProperty("batchIndex", "0");
      props.setProperty("lastUrut", "0");
      Logger.log(`🔄 Next: ${nextPeriode}`);
      lock.releaseLock();
      createNextTrigger();
    } else {
      Logger.log(`🎯 SELESAI!`);
      lock.releaseLock();
      deleteAllTriggers();
      cleanupAfterCompletion();
    }
  } else {
    lock.releaseLock();
    createNextTrigger();
  }
}

// ============================================
// VALIDATION FUNCTION
// ============================================
function validateAndProcessRowDataWithRealisasi(obj, header, executionId) {
  try {
    const namaPetugasArr = safeSplit(obj["Nama Petugas"], "|");
    const nikPetugasArr = safeSplit(obj["NIK"], "|");
    const nilaiRealisasiArr = safeSplit(obj["Nilai Realisasi"], "|").map(v => parseInt(v.toString().replace(/[^\d]/g, "")) || 0);
    const fungsiArr = safeSplit(obj["Role"], "|");
    const targetArr = safeSplit(obj["Target"], "|");
    const realisasiArr = safeSplit(obj["Realisasi"], "|");
    const satuanArr = safeSplit(obj["Satuan"], "|");
    const bebanArr = safeSplit(obj["Beban Anggaran"], "|");
    const uraianKegiatanRaw = safeSplit(obj["Nama Kegiatan"], "|");
    const hargaSatuanArr = safeSplit(obj["Harga Satuan"], "|").map(v => parseInt(v.toString().replace(/[^\d]/g, "")) || 0);

    if (namaPetugasArr.length !== nilaiRealisasiArr.length) {
      return { isValid: false, error: `Petugas count != nilai count` };
    }

    const processedData = [];
    
    for (let idx = 0; idx < namaPetugasArr.length; idx++) {
      const nama = namaPetugasArr[idx] || "";
      const nik = nikPetugasArr[idx] || nikPetugasArr[0] || "";
      
      if (!nama) continue;

      const nilai = nilaiRealisasiArr[idx] !== undefined ? nilaiRealisasiArr[idx] : 0;
      const fungsi = fungsiArr[idx] !== undefined ? fungsiArr[idx] : (fungsiArr[0] || "");
      const target = targetArr[idx] !== undefined ? targetArr[idx] : (targetArr[0] || "");
      const realisasi = realisasiArr[idx] !== undefined ? realisasiArr[idx] : (realisasiArr[0] || target);
      const satuan = satuanArr[idx] !== undefined ? satuanArr[idx] : (satuanArr[0] || "");
      const beban = bebanArr[idx] !== undefined ? bebanArr[idx] : (bebanArr[0] || "");
      const uraian = uraianKegiatanRaw[idx] !== undefined ? uraianKegiatanRaw[idx] : (uraianKegiatanRaw[0] || "-");
      const hargaSatuan = hargaSatuanArr[idx] !== undefined ? hargaSatuanArr[idx] : (hargaSatuanArr[0] || 0);

      let mulaiRaw = obj["Tanggal Mulai Kegiatan"];
      let akhirRaw = obj["Tanggal Akhir Kegiatan"];
      const mulaiArr = typeof mulaiRaw === "string" && mulaiRaw.indexOf("|") !== -1 ? safeSplit(mulaiRaw, "|") : [mulaiRaw];
      const akhirArr = typeof akhirRaw === "string" && akhirRaw.indexOf("|") !== -1 ? safeSplit(akhirRaw, "|") : [akhirRaw];

      const mulai = mulaiArr[idx] || mulaiArr[0];
      const akhir = akhirArr[idx] || akhirArr[0];
      const jangkaWaktu = (formatTanggalIndoCustom(mulai) || mulai) + " s/d " + (formatTanggalIndoCustom(akhir) || akhir);

      processedData.push({
        nama: nama, nik: nik, nilai: nilai, fungsi: [fungsi].filter(Boolean),
        target: target, realisasi: realisasi, satuan: satuan, beban: beban,
        uraian: uraian, hargaSatuan: hargaSatuan, jangkaWaktu: jangkaWaktu,
        templateSpkId: String((obj["template_spk_id"] || obj["templete_spk_id"] || obj["Template SPK ID"] || "")).trim()
      });
    }

    return { isValid: true, processedData: processedData };
  } catch (error) {
    return { isValid: false, error: `Validasi error: ${error.message}` };
  }
}

// ============================================
// TRIGGER MANAGEMENT FUNCTIONS
// ============================================
function createNextTriggerOptimized() {
  try {
    const currentTriggers = ScriptApp.getProjectTriggers();
    currentTriggers.forEach(trigger => {
      try {
        ScriptApp.deleteTrigger(trigger);
      } catch (e) {
        Logger.log(`⚠️ Failed to delete trigger: ${e}`);
      }
    });
    
    const delayMs = 1 * 60 * 1000;
    ScriptApp.newTrigger("MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK")
      .timeBased()
      .after(delayMs)
      .create();
    Logger.log(`⏳ Next trigger created: 1 minute delay`);
  } catch(err) { 
    Logger.log("⚠️ Trigger creation error: " + err); 
  }
}

function createDelayedTriggerOptimized(delayMs) {
  try {
    const currentTriggers = ScriptApp.getProjectTriggers();
    currentTriggers.forEach(trigger => {
      try {
        ScriptApp.deleteTrigger(trigger);
      } catch (e) {
        Logger.log(`⚠️ Failed to delete trigger: ${e}`);
      }
    });
    
    const safeDelayMs = Math.max(delayMs, 1 * 60 * 1000);
    ScriptApp.newTrigger("MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK")
      .timeBased()
      .after(safeDelayMs)
      .create();
    Logger.log(`⏳ Retry scheduled in ${safeDelayMs/60000} minutes`);
  } catch(err) { 
    Logger.log("⚠️ Delayed trigger creation error: " + err); 
  }
}

// ============================================
// STATUS & CLEANUP FUNCTIONS
// ============================================
function resetStateSPK_NIK() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty("batchIndex");
  props.deleteProperty("currentPeriode");
  props.deleteProperty("lastUrut");
  
  const allProperties = props.getProperties();
  Object.keys(allProperties).forEach(key => {
    if (key.startsWith('processed_')) {
      props.deleteProperty(key);
    }
  });
  
  deleteAllTriggers();
  Logger.log("🔄 State reset complete");
}

function cekStatusSPK_NIK() {
  const props = PropertiesService.getScriptProperties();
  const batchIndex = props.getProperty("batchIndex") || "0";
  const lastUrut = props.getProperty("lastUrut") || "0";
  const periode = props.getProperty("currentPeriode") || "None";
  
  Logger.log(`📊 CURRENT STATUS:`);
  Logger.log(`   Batch Index: ${batchIndex}`);
  Logger.log(`   Last Urut: ${lastUrut}`);
  Logger.log(`   Current Periode: ${periode}`);
  
  return { 
    batchIndex: parseInt(batchIndex), 
    lastUrut: parseInt(lastUrut), 
    periode: periode,
    timestamp: new Date().toISOString()
  };
}

function forceStartGeneration() {
  Logger.log("🔥 Force starting generation...");
  resetStateSPK_NIK();
  MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK();
}

// ============================================
// DOCUMENT PROCESSING HELPERS
// ============================================
function replaceTextInDocument(body, searchMap) {
  for (const [key, value] of Object.entries(searchMap)) {
    try {
      body.replaceText(key, String(value));
    } catch(e) {
      Logger.log(`⚠️ Replace text error for ${key}: ${e}`);
    }
  }
}

function createBASTTable(body, markerText, uraianTugasData) {
  try {
    const marker = body.findText(markerText);
    if (!marker) {
      Logger.log(`⚠️ Marker ${markerText} not found`);
      return false;
    }
    
    const element = marker.getElement();
    const parent = element.getParent();
    const startOffset = marker.getStartOffset();
    const endOffset = marker.getEndOffsetInclusive();
    
    if (element.editAsText) {
      element.asText().deleteText(startOffset, endOffset);
    }

    const insertIndex = body.getChildIndex(parent) + 1;
    const tbl = body.insertTable(insertIndex);

    const headerRow = tbl.appendTableRow();
    ['No', 'Uraian Tugas', 'Target', 'Realisasi', 'Satuan'].forEach((headerText, idx) => {
      const cell = headerRow.appendTableCell(headerText);
      const textElement = cell.editAsText();
      textElement.setBold(true);
      textElement.setFontSize(10);
      cell.setPaddingTop(0.5);
      cell.setPaddingBottom(0.5);
      cell.setPaddingLeft(1);
      cell.setPaddingRight(1);
      setHorizontalAlignment(cell, idx === 1 ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.CENTER);
    });

    uraianTugasData.forEach((uData, index) => {
      const row = tbl.appendTableRow();

      const cellNo = row.appendTableCell(String(index + 1));
      setTableCellFontSize(cellNo, 10);
      setHorizontalAlignment(cellNo, DocumentApp.HorizontalAlignment.CENTER);

      const cellUraian = row.appendTableCell(uData.namaKegiatan || '');
      setTableCellFontSize(cellUraian, 10);
      setHorizontalAlignment(cellUraian, DocumentApp.HorizontalAlignment.LEFT);

      const cellTarget = row.appendTableCell(String(uData.target || ''));
      setTableCellFontSize(cellTarget, 10);
      setHorizontalAlignment(cellTarget, DocumentApp.HorizontalAlignment.CENTER);

      const realisasiValue = uData.realisasi || uData.target || '';
      const cellRealisasi = row.appendTableCell(String(realisasiValue));
      setTableCellFontSize(cellRealisasi, 10);
      setHorizontalAlignment(cellRealisasi, DocumentApp.HorizontalAlignment.CENTER);

      const cellSatuan = row.appendTableCell(uData.satuan || '');
      setTableCellFontSize(cellSatuan, 10);
      setHorizontalAlignment(cellSatuan, DocumentApp.HorizontalAlignment.CENTER);

      for (let j = 0; j < row.getNumCells(); j++) {
        const cell = row.getCell(j);
        cell.setPaddingTop(0.5);
        cell.setPaddingBottom(0.5);
        cell.setPaddingLeft(1);
        cell.setPaddingRight(1);
      }
    });

    // Set column widths
    const widths = [25, 300, 45, 46, 67];
    for (let r = 0; r < tbl.getNumRows(); r++) {
      const row = tbl.getRow(r);
      for (let c = 0; c < row.getNumCells() && c < widths.length; c++) {
        try {
          row.getCell(c).setWidth(widths[c]);
        } catch(e) {}
      }
    }

    return true;
  } catch (err) {
    Logger.log(`❌ Error creating BAST table: ${err}`);
    return false;
  }
}

function updateMainSPKTable(body, uraianTugasData) {
  try {
    const tables = body.getTables();
    let mainTable = null;
    
    for (let t = 0; t < tables.length; t++) {
      const firstRow = tables[t].getRow(0);
      const txt = firstRow.getText().toLowerCase();
      if (txt.indexOf('uraian') !== -1 || txt.indexOf('kegiatan') !== -1) {
        mainTable = tables[t];
        break;
      }
    }

    if (!mainTable) {
      Logger.log(`⚠️ Main SPK table not found`);
      return false;
    }

    // Keep header row (row 0) and one template row (row 1)
    while (mainTable.getNumRows() > 2) {
      mainTable.removeRow(mainTable.getNumRows() - 1);
    }

    uraianTugasData.forEach((uData) => {
      const row = mainTable.appendTableRow();
      row.appendTableCell(String(uData.namaKegiatan || ""));
      row.appendTableCell(uData.beban || "");
      row.appendTableCell(uData.jangkaWaktu || "");
      row.appendTableCell(String(uData.target || ""));
      row.appendTableCell(uData.satuan || "");
      row.appendTableCell(uData.hargaSatuan ? "Rp. " + uData.hargaSatuan.toLocaleString("id-ID") : "-");
      row.appendTableCell("Rp. " + (uData.nilai || 0).toLocaleString("id-ID"));
    });

    return true;
  } catch(e) { 
    Logger.log(`⚠️ Error updating main SPK table: ${e}`);
    return false;
  }
}

// ============================================
// NUMBER CONVERSION FUNCTIONS
// ============================================
function terbilangComplete(n) {
  if (n === 0) return "";
  if (n > 1000000000) return "angka terlalu besar";
  
  const satuan = ["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];
  n = Math.floor(n);
  
  if (n < 12) return satuan[n];
  if (n < 20) return satuan[n - 10] + " belas";
  if (n < 100) return terbilangComplete(Math.floor(n / 10)) + " puluh " + satuan[n % 10];
  if (n < 200) return "seratus " + terbilangComplete(n - 100);
  if (n < 1000) return terbilangComplete(Math.floor(n / 100)) + " ratus " + terbilangComplete(n % 100);
  if (n < 2000) return "seribu " + terbilangComplete(n - 1000);
  if (n < 1000000) return terbilangComplete(Math.floor(n / 1000)) + " ribu " + terbilangComplete(n % 1000);
  if (n < 1000000000) return terbilangComplete(Math.floor(n / 1000000)) + " juta " + terbilangComplete(n % 1000000);
  
  return "angka terlalu besar";
}

function formatCurrency(amount) {
  try {
    return amount.toLocaleString("id-ID", { style: 'currency', currency: 'IDR' });
  } catch(e) {
    return "Rp. " + amount.toLocaleString("id-ID");
  }
}

// ============================================
// DATE UTILITIES
// ============================================
function getWorkdayOfMonth(tahun, bulanIdx) {
  const awal = new Date(tahun, bulanIdx, 1);
  const d = new Date(awal);
  
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  
  return d;
}

function getPreviousWorkday(date) {
  const d = new Date(date);
  
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  
  return d;
}

function getMonthLastDay(tahun, bulanIdx) {
  return new Date(tahun, bulanIdx + 1, 0);
}

// ============================================
// DEBUG & LOGGING UTILITIES
// ============================================
function logExecutionDetails(executionId, details) {
  const timestamp = new Date().toISOString();
  Logger.log(`[${timestamp}] [${executionId}] ${JSON.stringify(details)}`);
}

function logProcessingProgress(executionId, current, total, itemName) {
  Logger.log(`[${executionId}] Processing: ${current}/${total} - ${itemName}`);
}

// ============================================
// END OF SCRIPT
// ============================================
// Total lines: 1000+
