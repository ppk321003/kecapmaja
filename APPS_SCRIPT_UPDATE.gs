// ============================================
// TAMBAHKAN FUNGSI INI KE GOOGLE APPS SCRIPT
// ============================================
// Deployment ID: AKfycbxpEIe6scG_oOpvwgrxId06NmxjYYpmRRB04vawXS4
// URL: https://script.google.com/macros/s/AKfycbxpEIe6scG_oOpvwgrxId06NmxjYYpmRRB04vawXS4/exec
//
// Update fungsi doGet yang sudah ada menjadi:
function doGet(e) {
  const action = e.parameter.action;
  const periode = e.parameter.periode;

  try {
    if (action === 'getPeriodeList') {
      // Return daftar periode dari spreadsheet
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        periodeList: getPeriodeListFromSheet()
      }));
    } else if (action === 'resetStatus') {
      // Reset kolom T, U, V untuk periode tertentu
      resetStatusForPeriode(periode);
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        message: `Status untuk periode ${periode} telah di-reset`
      }));
    } else if (action === 'deleteFolder') {
      // Delete folder di Google Drive
      deleteFolderByPeriode(periode);
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        message: `Folder ${periode} telah dihapus`
      }));
    } else {
      // Default: Trigger fungsi utama generate
      MailMergeSPK_Gabungan_PreserveFormat_v20_OKSD_NIK();
      return HtmlService.createHtmlOutput(JSON.stringify({
        success: true,
        message: "✅ Proses generation dimulai. Cek Google Drive Anda dalam beberapa menit.",
        timestamp: new Date().toISOString()
      }));
    }
  } catch(err) {
    return HtmlService.createHtmlOutput(JSON.stringify({
      success: false,
      error: err.message
    }));
  }
}

// === FUNGSI UNTUK GET PERIODE LIST ===
function getPeriodeListFromSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");
    const dataRange = sheet.getDataRange();
    const allData = dataRange.getValues();
    
    if (allData.length <= 1) return [];

    const headers = allData[0];
    const periodeIdx = findColumnIndex(headers, ["Periode (Bulan) SPK"]);
    const statusIdx = findColumnIndex(headers, ["Status"]);
    
    const periodeSet = new Set();
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const status = row[statusIdx]?.toString().trim() || '';
      
      // Hanya ambil periode dengan status 'Generated'
      if (status === 'Generated') {
        const periode = row[periodeIdx]?.toString().trim();
        if (periode) {
          periodeSet.add(periode);
        }
      }
    }
    
    return Array.from(periodeSet).sort();
  } catch(err) {
    Logger.log("Error in getPeriodeListFromSheet: " + err);
    return [];
  }
}

// === FUNGSI UNTUK RESET STATUS ===
function resetStatusForPeriode(targetPeriode) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Sheet1");
    const dataRange = sheet.getDataRange();
    const allData = dataRange.getValues();
    
    if (allData.length <= 1) return;

    const headers = allData[0];
    const periodeIdx = findColumnIndex(headers, ["Periode (Bulan) SPK"]);
    const statusIdx = findColumnIndex(headers, ["Status"]);
    const keteranganIdx = findColumnIndex(headers, ["Keterangan"]); // Kolom T
    const linkIdx = findColumnIndex(headers, ["Link"]); // Kolom V
    
    Logger.log(`🔄 Reset Status untuk periode: ${targetPeriode}`);
    Logger.log(`Kolom Keterangan: ${keteranganIdx}, Status: ${statusIdx}, Link: ${linkIdx}`);
    
    let resetCount = 0;
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const periode = row[periodeIdx]?.toString().trim() || '';
      const status = row[statusIdx]?.toString().trim() || '';
      
      // Cocokkan periode dan status Generated
      if (periode === targetPeriode && status === 'Generated') {
        // Blank kolom Keterangan (T)
        if (keteranganIdx !== -1) {
          sheet.getRange(i + 1, keteranganIdx + 1).clearContent();
        }
        // Blank kolom Status (U)
        if (statusIdx !== -1) {
          sheet.getRange(i + 1, statusIdx + 1).clearContent();
        }
        // Blank kolom Link (V)
        if (linkIdx !== -1) {
          sheet.getRange(i + 1, linkIdx + 1).clearContent();
        }
        resetCount++;
      }
    }
    
    Logger.log(`✅ Reset selesai: ${resetCount} baris di-reset untuk periode ${targetPeriode}`);
  } catch(err) {
    Logger.log("Error in resetStatusForPeriode: " + err);
  }
}

// === FUNGSI UNTUK DELETE FOLDER ===
function deleteFolderByPeriode(targetPeriode) {
  try {
    const OUTPUT_FOLDER_ID_OK_SD = "1RxtMos2V6TAoE-VIuJtmW9lkACLDmtQb";
    const outputFolder = DriveApp.getFolderById(OUTPUT_FOLDER_ID_OK_SD);
    
    Logger.log(`🗑️ Mencari folder: ${targetPeriode}`);
    
    const folders = outputFolder.getFoldersByName(targetPeriode);
    let deleteCount = 0;
    
    while (folders.hasNext()) {
      const folder = folders.next();
      Logger.log(`🗑️ Deleting folder: ${folder.getName()}`);
      DriveApp.removeFile(folder);
      deleteCount++;
    }
    
    Logger.log(`✅ Delete selesai: ${deleteCount} folder dihapus`);
  } catch(err) {
    Logger.log("Error in deleteFolderByPeriode: " + err);
  }
}

// === Pastikan fungsi helper ini ada ===
function findColumnIndex(header, possibleNames) {
  for (const name of possibleNames) {
    const index = header.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}
