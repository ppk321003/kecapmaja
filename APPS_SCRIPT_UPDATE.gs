// ============================================
// APPS SCRIPT FINAL - SPK & BAST GENERATION
// ============================================
// Deployment ID: AKfycbytFwj0PO3-rmIqX9l_pBRlL_XzLWmyJ29dtd9ATmoOx3220aqWfEF89FiWupxMu8Qb
// URL: https://script.google.com/macros/s/AKfycbytFwj0PO3-rmIqX9l_pBRlL_XzLWmyJ29dtd9ATmoOx3220aqWfEF89FiWupxMu8Qb/exec
// 
// FITUR:
// 1. Generate SPK & BAST documents (dengan batch processing)
// 2. Preview data sebelum generate
// 3. Reset Status & Link columns (preserve Keterangan)
// 4. Delete folder by periode
// ============================================

// === KONSTANTA ===
const TEMPLATE_ID_OK_SD = "1ZA7QZyVLV_9GcTu_9aOsp9KvPn6-JqXRw8SgwHYBOOE";
const OUTPUT_FOLDER_ID_OK_SD = "1RxtMos2V6TAoE-VIuJtmW9lkACLDmtQb";
const MASTER_MITRA_ID_OK_SD = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const BATCH_SIZE_DEFAULT_OK_SD = 16;

// ============================================
// WEB ENDPOINT - doGet Handler
// ============================================
function doGet(e) {
  const action = e.parameter.action;
  const periode = e.parameter.periode;

  Logger.log(`📥 doGet called - Action: "${action}", Periode: "${periode}"`);

  try {
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
    
    if (allData.length <= 1) {
      Logger.log("⚠️ No data rows found");
      return [];
    }

    const headers = allData[0];
    Logger.log(`   Headers: ${JSON.stringify(headers.slice(0, 25))}`); // Log first 25 columns
    
    const periodeIdx = findColumnIndex(headers, ["Periode (Bulan) SPK"]);
    const statusIdx = findColumnIndex(headers, ["Status"]);
    
    Logger.log(`   Column Indices - Periode: ${periodeIdx}, Status: ${statusIdx}`);
    
    if (periodeIdx === -1) {
      Logger.log("❌ Kolom 'Periode (Bulan) SPK' tidak ditemukan");
      return [];
    }
    if (statusIdx === -1) {
      Logger.log("❌ Kolom 'Status' tidak ditemukan");
      return [];
    }
    
    const periodeSet = new Set();
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const status = row[statusIdx]?.toString().trim() || '';
      
      if (status === 'Generated') {
        const periode = row[periodeIdx]?.toString().trim();
        if (periode) {
          Logger.log(`   Row ${i}: periode="${periode}" (status="${status}")`);
          periodeSet.add(periode);
        }
      }
    }
    
    const result = Array.from(periodeSet).sort();
    Logger.log(`✅ Found ${result.length} periods: ${JSON.stringify(result)}`);
    return result;
  } catch(err) {
    Logger.log("❌ Error in getPeriodeListFromSheet: " + err);
    return [];
  }
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

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");
    const dataRange = sheet.getDataRange();
    const allData = dataRange.getValues();
    
    if (allData.length <= 1) {
      Logger.log("⚠️ No data in sheet");
      return;
    }

    const headers = allData[0];
    const periodeIdx = findColumnIndex(headers, ["Periode (Bulan) SPK"]);
    const statusIdx = findColumnIndex(headers, ["Status"]);
    const linkIdx = findColumnIndex(headers, ["Link"]);
    
    Logger.log(`🔍 Column Indices - Periode: ${periodeIdx}, Status: ${statusIdx}, Link: ${linkIdx}`);
    
    if (periodeIdx === -1) {
      Logger.log("❌ Kolom 'Periode (Bulan) SPK' tidak ditemukan");
      throw new Error("Kolom Periode tidak ditemukan");
    }
    if (statusIdx === -1) {
      Logger.log("❌ Kolom 'Status' tidak ditemukan");
      throw new Error("Kolom Status tidak ditemukan");
    }
    
    Logger.log(`🔄 Reset Status untuk periode: "${targetPeriode}"`);
    
    let resetCount = 0;
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const periode = row[periodeIdx]?.toString().trim() || '';
      const status = row[statusIdx]?.toString().trim() || '';
      
      Logger.log(`   Row ${i}: periode="${periode}", status="${status}"`);
      
      if (periode === targetPeriode && status === 'Generated') {
        Logger.log(`   ✅ Match found! Clearing Status and Link columns`);
        // HANYA clear kolom Status (U) & Link (V)
        // JANGAN clear kolom Keterangan (T)
        if (statusIdx !== -1) {
          sheet.getRange(i + 1, statusIdx + 1).clearContent();
        }
        if (linkIdx !== -1) {
          sheet.getRange(i + 1, linkIdx + 1).clearContent();
        }
        resetCount++;
      }
    }
    
    Logger.log(`✅ Reset selesai: ${resetCount} baris di-reset untuk periode "${targetPeriode}". Kolom T (Keterangan) PRESERVED`);
    
    if (resetCount === 0) {
      Logger.log(`⚠️ PERHATIAN: Tidak ada baris yang di-reset. Cek apakah periode atau status sesuai`);
    }
  } catch(err) {
    Logger.log("❌ Error in resetStatusForPeriode: " + err);
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

    Logger.log(`🗑️ Mencari folder dengan nama: "${targetPeriode}"`);
    const outputFolder = DriveApp.getFolderById(OUTPUT_FOLDER_ID_OK_SD);
    
    if (!outputFolder) {
      Logger.log("❌ Output folder tidak ditemukan");
      throw new Error("Output folder tidak ditemukan");
    }
    
    Logger.log(`📁 Output Folder ID: ${OUTPUT_FOLDER_ID_OK_SD}`);
    Logger.log(`🔍 Mengecheck subfolder...`);
    
    const folders = outputFolder.getFoldersByName(targetPeriode);
    let deleteCount = 0;
    
    const foldersToDelete = [];
    while (folders.hasNext()) {
      const folder = folders.next();
      Logger.log(`   Found: ${folder.getName()} (ID: ${folder.getId()})`);
      foldersToDelete.push(folder);
    }
    
    Logger.log(`📊 Total folder ditemukan: ${foldersToDelete.length}`);
    
    if (foldersToDelete.length === 0) {
      Logger.log(`⚠️ PERHATIAN: Tidak ada folder dengan nama "${targetPeriode}" ditemukan`);
    }
    
    for (let i = 0; i < foldersToDelete.length; i++) {
      const folder = foldersToDelete[i];
      Logger.log(`🗑️ Menghapus folder: ${folder.getName()} (${i + 1}/${foldersToDelete.length})`);
      try {
        DriveApp.removeFolder(folder);
        Logger.log(`   ✅ Folder berhasil dihapus`);
        deleteCount++;
      } catch(deleteErr) {
        Logger.log(`   ❌ Gagal delete folder: ${deleteErr}`);
      }
    }
    
    Logger.log(`✅ Delete selesai: ${deleteCount} folder dihapus`);
  } catch(err) {
    Logger.log("❌ Error in deleteFolderByPeriode: " + err);
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
