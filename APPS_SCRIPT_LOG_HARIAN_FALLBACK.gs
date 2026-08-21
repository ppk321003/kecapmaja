// Deploy as Web app: execute as the owner, accessible to anyone with the URL.
// The frontend sends only PPK username and validated snapshot rows.

const HARIAN_SPREADSHEET_ID = '1uA5nThGOntZrqfwFo_TNHhP3P7P78BATfc4p4BZQe9U';
const USERS_SPREADSHEET_ID = '1kVxQHL3TPfDKJ1ZnZ_fxJECGctc1UBjU_8E--9UK938';
const HARIAN_SHEET_NAME = 'LOG_HARIAN';
const USERS_SHEET_NAME = 'user';
const PPK_ROLE = 'pejabat pembuat komitmen';
const HARIAN_HEADERS = [
  'Tanggal_Rekam', 'Waktu_Rekam', 'Nama_PPL', 'Kecamatan',
  'Prelist_Awal', 'Jml_Assignment', 'Submit', 'Draft', 'Netto',
  'Persentase_Progress', 'Dicatat_Oleh'
];

function doGet(event) {
  const params = event && event.parameter ? event.parameter : {};
  const callback = String(params.callback || '').match(/^[A-Za-z_$][\w.$]*$/) ? params.callback : '';
  try {
    if (params.action === 'listSheets') {
      const result = { ok: true, sheets: listAllowedSheets(params.spreadsheetId) };
      return jsonpResponse(result, callback);
    }
    if (params.action === 'readSheet') {
      const result = { ok: true, values: readAllowedSheet(params.spreadsheetId, params.sheetName) };
      return jsonpResponse(result, callback);
    }
    return jsonResponse({ ok: true, service: 'LOG_HARIAN fallback' });
  } catch (error) {
    return jsonpResponse({ ok: false, error: String(error.message || error) }, callback);
  }
}

function listAllowedSheets(spreadsheetId) {
  assertAllowedSpreadsheet(spreadsheetId);
  return SpreadsheetApp.openById(spreadsheetId).getSheets().map((sheet) => sheet.getName());
}

function readAllowedSheet(spreadsheetId, sheetName) {
  assertAllowedSpreadsheet(spreadsheetId);
  if (!sheetName) throw new Error('Nama sheet wajib diisi');
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
  return sheet.getDataRange().getDisplayValues();
}

function assertAllowedSpreadsheet(spreadsheetId) {
  if ([HARIAN_SPREADSHEET_ID, USERS_SPREADSHEET_ID, '1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o', '1_LNMJ2NSujoSegGQgG4jkLCR0GFHgP6PNHeQjp6WSCo', '1sRg7Hi7xtBT00dx-61mugWlGL7H1P0gnr3jziaClJsw', '1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ'].indexOf(spreadsheetId) === -1) {
    throw new Error('Spreadsheet tidak diizinkan');
  }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || '{}');
    if (body.action !== 'appendHarian') {
      throw new Error('Action tidak valid');
    }

    const username = normalize(body.username);
    if (!username || !isPpkUser(username)) {
      throw new Error('Hanya akun Pejabat Pembuat Komitmen yang diizinkan');
    }

    const values = body.values;
    validateRows(values, username);

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = SpreadsheetApp.openById(HARIAN_SPREADSHEET_ID).getSheetByName(HARIAN_SHEET_NAME);
      if (!sheet) throw new Error('Sheet LOG_HARIAN tidak ditemukan');
      ensureHeader(sheet);
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, HARIAN_HEADERS.length).setValues(values);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({ ok: true, count: values.length });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}

function isPpkUser(username) {
  const sheet = SpreadsheetApp.openById(USERS_SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  if (!sheet) throw new Error('Sheet user tidak ditemukan');

  const rows = sheet.getDataRange().getDisplayValues();
  if (rows.length < 2) return false;

  const headers = rows[0].map(normalize);
  const usernameIndex = findHeader(headers, ['username', 'user name', 'email']);
  const roleIndex = findHeader(headers, ['role', 'peran', 'jabatan']);
  const activeIndex = findHeader(headers, ['active', 'aktif', 'status']);
  if (usernameIndex < 0 || roleIndex < 0) throw new Error('Kolom username/role pada sheet user tidak ditemukan');

  return rows.slice(1).some((row) => {
    if (normalize(row[usernameIndex]) !== username) return false;
    if (normalize(row[roleIndex]) !== PPK_ROLE) return false;
    if (activeIndex < 0) return true;
    const active = normalize(row[activeIndex]);
    return !active || ['aktif', 'active', 'true', '1', 'yes'].indexOf(active) >= 0;
  });
}

function validateRows(values, username) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 2000) {
    throw new Error('Jumlah baris harus antara 1 sampai 2000');
  }

  values.forEach((row) => {
    if (!Array.isArray(row) || row.length !== HARIAN_HEADERS.length) {
      throw new Error('Format baris LOG_HARIAN tidak valid');
    }
    if (normalize(row[10]) !== username) {
      throw new Error('Dicatat_Oleh tidak sama dengan akun PPK yang terverifikasi');
    }
    [0, 1, 2, 3, 9, 10].forEach((index) => {
      if (String(row[index] ?? '').length > 200) throw new Error('Nilai teks terlalu panjang');
    });
    [4, 5, 6, 7, 8].forEach((index) => {
      if (row[index] !== '' && !isFinite(Number(row[index]))) {
        throw new Error('Nilai numerik LOG_HARIAN tidak valid');
      }
    });
  });
}

function ensureHeader(sheet) {
  const current = sheet.getRange(1, 1, 1, HARIAN_HEADERS.length).getDisplayValues()[0];
  const matches = HARIAN_HEADERS.every((header, index) => normalize(current[index]) === normalize(header));
  if (!matches) {
    if (sheet.getLastRow() > 0 && current.some((value) => value !== '')) {
      throw new Error('Header LOG_HARIAN tidak sesuai; periksa sheet secara manual');
    }
    sheet.getRange(1, 1, 1, HARIAN_HEADERS.length).setValues([HARIAN_HEADERS]);
  }
}

function findHeader(headers, candidates) {
  return headers.findIndex((header) => candidates.indexOf(header) >= 0);
}

function normalize(value) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(payload, callback) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  if (!callback) return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
