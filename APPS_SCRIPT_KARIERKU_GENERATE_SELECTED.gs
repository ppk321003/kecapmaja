// ===================== SISTEM LOCK & TRACKING =====================
const LOCK_PROPERTY = 'PAK_PROCESS_LOCK';
const TRACKING_PROPERTY = 'PAK_PROCESSED_FILES';
const GENERATE_COLUMN_NAME = 'Generate';

function safeGetUi() {
  try {
    return SpreadsheetApp.getUi();
  } catch (e) {
    console.log('⚠️ UI tidak tersedia di konteks ini');
    return null;
  }
}

function safeAlert(message) {
  const ui = safeGetUi();
  if (ui) {
    ui.alert(message);
  } else {
    console.log(message);
  }
}

function safeConfirm(title, message) {
  const ui = safeGetUi();
  if (ui) {
    return ui.alert(title, message, ui.ButtonSet.YES_NO);
  }
  console.log(`${title}\n${message}`);
  return null;
}

function onOpen() {
  const ui = safeGetUi();
  if (!ui) return;
  ui.createMenu('KarierKu')
    .addItem('Jalankan Generate Baris Terpilih', 'jalankanSemuaProses')
    .addItem('Reset Lock & Cache', 'resetSystem')
    .addToUi();
}

function acquireLock() {
  const lock = PropertiesService.getScriptProperties().getProperty(LOCK_PROPERTY);
  if (lock && Date.now() - parseInt(lock, 10) < 300000) {
    throw new Error('❌ Proses sedang berjalan di instance lain. Tunggu 5 menit.');
  }
  PropertiesService.getScriptProperties().setProperty(LOCK_PROPERTY, Date.now().toString());
  console.log('🔒 Lock acquired');
}

function releaseLock() {
  PropertiesService.getScriptProperties().deleteProperty(LOCK_PROPERTY);
  console.log('🔓 Lock released');
}

function getProcessedFiles() {
  const processed = PropertiesService.getScriptProperties().getProperty(TRACKING_PROPERTY);
  return processed ? JSON.parse(processed) : {};
}

function addProcessedFile(fileName, fileUrl) {
  const processed = getProcessedFiles();
  processed[fileName] = {
    url: fileUrl,
    timestamp: Date.now(),
    normalized: normalizeName(fileName)
  };
  PropertiesService.getScriptProperties().setProperty(TRACKING_PROPERTY, JSON.stringify(processed));
}

function isFileProcessed(fileName) {
  const processed = getProcessedFiles();
  if (processed[fileName]) {
    console.log(`✅ File sudah diproses (exact): ${fileName}`);
    return processed[fileName].url;
  }
  return null;
}

// ===================== FUNGSI CEK PERIODE AKTIF =====================
function parseMonthValue(value) {
  if (!value && value !== 0) return null;
  const clean = value.toString().trim().toLowerCase();
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;

  const map = {
    januari: 1, jan: 1,
    februari: 2, feb: 2,
    maret: 3, mar: 3,
    april: 4, apr: 4,
    mei: 5,
    juni: 6, jun: 6,
    juli: 7, jul: 7,
    agustus: 8, agu: 8, aug: 8,
    september: 9, sep: 9,
    oktober: 10, okt: 10, oct: 10,
    november: 11, nov: 11,
    desember: 12, des: 12, dec: 12
  };

  return map[clean] || null;
}

function getMonthName(monthNumber) {
  const bulan = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return bulan[monthNumber] || '';
}

function isMonthFinished(year, monthNumber) {
  const sekarang = new Date();
  if (year < sekarang.getFullYear()) return true;
  if (year > sekarang.getFullYear()) return false;
  const endOfMonth = new Date(year, monthNumber, 0, 23, 59, 59, 999);
  return sekarang.getTime() > endOfMonth.getTime();
}

function cekPeriodeAktif(tahun, jenisPeriode, semester) {
  const tahunNum = parseInt(tahun, 10);
  const sekarang = new Date();
  const tahunSekarang = sekarang.getFullYear();
  const bulanSekarang = sekarang.getMonth() + 1;

  console.log(`📅 Cek periode: ${jenisPeriode} ${semester} ${tahun}, Sekarang: ${bulanSekarang}/${tahunSekarang}`);

  if (tahunNum < tahunSekarang) {
    return { aktif: true, alasan: `${jenisPeriode} ${semester} ${tahun} sudah selesai` };
  }

  if (jenisPeriode === 'Bulanan') {
    const bulanNum = parseMonthValue(semester);
    if (!bulanNum) {
      return { aktif: false, alasan: `Bulan tidak valid: ${semester}` };
    }
    if (isMonthFinished(tahunNum, bulanNum)) {
      return { aktif: true, alasan: `Bulanan ${getMonthName(bulanNum)} ${tahun} sudah selesai` };
    }
    return { aktif: false, alasan: `Bulanan ${getMonthName(bulanNum)} ${tahun} masih berjalan` };
  }

  if (tahunNum === tahunSekarang) {
    if (jenisPeriode === 'Tahunan') {
      if (bulanSekarang >= 12) {
        return { aktif: true, alasan: `Tahunan ${tahun} sudah selesai` };
      }
      return { aktif: false, alasan: `Tahunan ${tahun} masih berjalan` };
    } else if (jenisPeriode === 'Semester') {
      const sem = parseInt(semester, 10);
      if (sem === 1) {
        if (bulanSekarang >= 7) {
          return { aktif: true, alasan: `Semester 1 ${tahun} sudah selesai` };
        }
        return { aktif: false, alasan: `Semester 1 ${tahun} masih berjalan` };
      } else if (sem === 2) {
        if (bulanSekarang >= 12) {
          return { aktif: true, alasan: `Semester 2 ${tahun} sudah selesai` };
        }
        return { aktif: false, alasan: `Semester 2 ${tahun} masih berjalan` };
      }
    }
  }

  if (tahunNum > tahunSekarang) {
    return { aktif: false, alasan: `${jenisPeriode} ${semester} ${tahun} belum dimulai` };
  }

  return { aktif: false, alasan: `Periode belum selesai` };
}

// ===================== FUNGSI UTILITY =====================
function toProperCase(str) {
  if (!str) return '';
  return str.toString().toLowerCase().replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

function getJabatanBerikutnya(jabatan) {
  const map = {
    'ahli pertama': 'Ahli Muda', 'ahli muda': 'Ahli Madya',
    'ahli madya': 'Ahli Utama', 'terampil': 'Mahir', 'mahir': 'Penyelia'
  };
  const lower = (jabatan || '').toString().toLowerCase();
  for (const [k, v] of Object.entries(map)) if (lower.includes(k)) return v;
  return '';
}

function getGolonganBerikutnya(golongan) {
  const map = {
    'iii/a': 'III/b', 'iii/b': 'III/c', 'iii/c': 'III/d', 'iii/d': 'IV/a',
    'iv/a': 'IV/b', 'iv/b': 'IV/c', 'iv/c': 'IV/d', 'iv/d': 'IV/e',
    'ii/a': 'II/b', 'ii/b': 'II/c', 'ii/c': 'II/d', 'ii/d': 'III/a'
  };
  return map[(golongan || '').toString().toLowerCase()] || '';
}

function isKenaikanJenjangBersamaan(jabatan, golongan) {
  const j = (jabatan || '').toString().toLowerCase();
  const g = (golongan || '').toString().toLowerCase();
  return (j.includes('ahli muda') && g === 'iii/d') || (j.includes('mahir') && g === 'iii/b');
}

function getProsentase(predikat) {
  const map = { 'Sangat Baik': 150, 'Baik': 100, 'Cukup': 75, 'Kurang': 50, 'Butuh Perbaikan': 25 };
  return map[predikat] || 100;
}

function getKoefisien(jabatan, golongan) {
  if (!jabatan || !golongan) return 12.5;
  const j = jabatan.toString().toLowerCase();
  const g = golongan.toString().toLowerCase();

  const mapJabatan = {
    'ahli pertama': 12.5, 'ahli muda': 25.0, 'ahli madya': 37.5, 'ahli utama': 50.0,
    'terampil': 5.0, 'mahir': 12.5, 'penyelia': 25.0, 'pemula': 5.0
  };
  for (const [k, v] of Object.entries(mapJabatan)) if (j.includes(k)) return v;

  const mapGolongan = {
    'iv/e':50,'iv/d':50,'iv/c':50,'iv/b':37.5,'iv/a':37.5,
    'iii/d':25,'iii/c':25,'iii/b':12.5,'iii/a':12.5,
    'ii/d':5,'ii/c':5,'ii/b':5,'ii/a':5
  };
  for (const [k, v] of Object.entries(mapGolongan)) if (g.includes(k)) return v;
  return 12.5;
}

function formatAngkaSmart(num) {
  if (!num && num !== 0) return '0';
  const n = parseFloat(num.toString().replace(',', '.'));
  if (isNaN(n)) return '0';
  if (n % 1 === 0) return n.toString();
  return n.toFixed(3)
          .replace(/\./g, ',')
          .replace(/,0+$/, '')
          .replace(/,$/, '');
}

function getTeksPeriodeDenganTahun(jenisPeriode, semester, tahun) {
  const jp = (jenisPeriode || '').toString().trim();
  const th = (tahun || '').toString().trim();
  const tahunStr = th ? ` ${th}` : '';

  if (jp === 'Tahunan') return `Januari - Desember${tahunStr}`;
  if (jp === 'Semester') {
    const s = (semester || '').toString().trim();
    if (s === '1') return `Januari - Juni${tahunStr}`;
    if (s === '2') return `Juli - Desember${tahunStr}`;
  }
  if (jp === 'Bulanan') {
    const monthNum = parseMonthValue(semester);
    if (monthNum) return `${getMonthName(monthNum)}${tahunStr}`;
  }
  return th || '';
}

function getTeksSemesterTanpaTahun(jenisPeriode, semester) {
  const jp = (jenisPeriode || '').toString().trim();
  if (jp === 'Tahunan') return 'Januari - Desember';
  if (jp === 'Semester') {
    const s = (semester || '').toString().trim();
    if (s === '1') return 'Januari - Juni';
    if (s === '2') return 'Juli - Desember';
  }
  if (jp === 'Bulanan') {
    const monthNum = parseMonthValue(semester);
    if (monthNum) return getMonthName(monthNum);
  }
  return '';
}

function getTanggalPenetapanOtomatis(tahun, jenisPeriode, semester) {
  const y = parseInt(tahun, 10);
  if (isNaN(y)) return '2 Januari ' + (new Date().getFullYear() + 1);
  jenisPeriode = (jenisPeriode || '').toString().trim();
  semester = (semester || '').toString().trim();

  if (jenisPeriode === 'Bulanan') {
    const bulanNum = parseMonthValue(semester);
    if (bulanNum) {
      const nextMonth = bulanNum === 12 ? 1 : bulanNum + 1;
      const nextYear = bulanNum === 12 ? y + 1 : y;
      return `2 ${getMonthName(nextMonth)} ${nextYear}`;
    }
  }

  if (jenisPeriode === 'Tahunan' || semester === '2') return `2 Januari ${y + 1}`;
  if (semester === '1') return `1 Juli ${y}`;
  return `2 Januari ${y + 1}`;
}

function formatTanggalIndonesia(d) {
  if (!d) return '';
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d)) return '';
  const bulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${bulan[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function generateRekomendasi(row, headers) {
  const idx = name => headers.indexOf(name);
  const jabatan = row[idx('Jabatan')] || '';
  const golongan = row[idx('Golongan')] || '';
  const totalAKStr = row[idx('Total Kumulatif')] || '0';
  const kurlebPangkatStr = row[idx('Kurleb Pangkat')] || '0';
  const kurlebJabatanStr = row[idx('Kurleb Jabatan')] || '0';
  const totalAK = parseFloat(totalAKStr.toString().replace(',', '.')) || 0;
  const kurlebPangkat = parseFloat(kurlebPangkatStr.toString().replace(',', '.')) || 0;
  const kurlebJabatan = parseFloat(kurlebJabatanStr.toString().replace(',', '.')) || 0;
  const nextJabatan = getJabatanBerikutnya(jabatan);
  const nextGolongan = getGolonganBerikutnya(golongan);

  if (isKenaikanJenjangBersamaan(jabatan, golongan) && totalAK >= 200) {
    return `Dapat dipertimbangkan untuk kenaikan jenjang jabatan menjadi ${toProperCase(nextJabatan)} dan pangkat/golongan ruang ${nextGolongan.toUpperCase()}`;
  }

  const cukupPangkat = kurlebPangkat <= 0;
  const cukupJabatan = kurlebJabatan <= 0;

  if (cukupPangkat && cukupJabatan) {
    return `Dapat dipertimbangkan untuk kenaikan pangkat/golongan ruang menjadi ${nextGolongan.toUpperCase()} dan jenjang jabatan menjadi ${toProperCase(nextJabatan)}`;
  }
  if (cukupPangkat) return `Dapat dipertimbangkan untuk kenaikan pangkat/golongan ruang menjadi ${nextGolongan.toUpperCase()}`;
  if (cukupJabatan) return `Dapat dipertimbangkan untuk kenaikan jenjang jabatan menjadi ${toProperCase(nextJabatan)}`;
  return 'Tidak dapat dipertimbangkan untuk kenaikan pangkat/jenjang jabatan pada periode ini';
}

function parseBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  const str = (value || '').toString().trim().toLowerCase();
  return ['true', 'yes', 'ya', '1'].includes(str);
}

function generateRow(row, tahun, yy, semester, urut) {
  const predikat = row[16] || 'Baik';
  const jabatan  = row[14] || '';
  const golongan = row[12] || '';
  const jenisPeriode = row[4] ? String(row[4]).trim() : '';

  const formatNumericValue = (value) => {
    if (!value && value !== 0) return '0';
    const num = parseFloat(value.toString().replace(',', '.')) || 0;
    return formatAngkaSmart(num);
  };

  return [
    `AK-${yy}${semester}${urut}`,
    `3210.${urut}/KONV/ST/${tahun}`,
    `3210.${urut}/PAK/ST/${tahun}`,
    `3210.${urut}/AKM/ST/${tahun}`,
    row[1], row[2], getTeksPeriodeDenganTahun(jenisPeriode, row[2], row[1]), row[4], row[5], row[6], row[7],
    row[8], row[9], row[10], row[11], row[12], row[13], row[14],
    row[15], row[16], row[17], row[18], row[19], row[20], row[21],
    row[22], row[23], row[24], row[25], row[26], row[27], row[28],
    row[29], row[30], row[31], row[32], row[33],
    formatNumericValue(getProsentase(predikat)),
    formatNumericValue(getKoefisien(jabatan, golongan))
  ];
}

// ===================== FUNGSI NORMALIZE =====================
function normalizeName(str) {
  if (!str) return '';
  let clean = str.toString().toLowerCase()
    .replace(/[,.]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(s\.?s?t|s\.?t|m\.?ap|sst|st)\b/g, '');
  let words = clean.split(' ').filter(w => w.length > 1);
  return words.join(' ');
}

function extractYearFromFileName(fileName) {
  const yearMatch = fileName.match(/(\d{4})/);
  return yearMatch ? yearMatch[1] : null;
}

function extractSemesterFromFileName(fileName) {
  const semMatch = fileName.match(/semester\s*(\d)/i);
  if (semMatch) return semMatch[1];
  const monthMatch = fileName.match(/(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i);
  if (monthMatch) {
    return parseMonthValue(monthMatch[1]);
  }
  return null;
}

function checkFileExists(folder, fileName) {
  try {
    console.log(`🔍 Mencari file: "${fileName}"`);
    const exactFiles = folder.getFilesByName(fileName);
    if (exactFiles.hasNext()) {
      const file = exactFiles.next();
      const url = file.getUrl();
      console.log(`✅ File ditemukan (exact match): ${url}`);
      addProcessedFile(fileName, url);
      return url;
    }

    const normalizedTarget = normalizeName(fileName);
    console.log(`🔍 Mencari dengan normalized name: "${normalizedTarget}"`);
    const allFiles = folder.getFiles();
    let foundFile = null;
    let foundCount = 0;

    while (allFiles.hasNext()) {
      const file = allFiles.next();
      const fileNorm = normalizeName(file.getName());
      if (fileNorm === normalizedTarget) {
        foundFile = file;
        foundCount++;
        console.log(`📁 Found potential match: ${file.getName()} -> ${fileNorm}`);
      }
    }

    if (foundCount === 1 && foundFile) {
      const url = foundFile.getUrl();
      console.log(`✅ File ditemukan (unique normalized match): ${url}`);
      addProcessedFile(fileName, url);
      addProcessedFile(foundFile.getName(), url);
      return url;
    }

    if (foundCount > 1) {
      console.log(`⚠️ Multiple files found with similar name: ${foundCount} files`);
      const allFiles2 = folder.getFiles();
      while (allFiles2.hasNext()) {
        const file = allFiles2.next();
        const fileNorm = normalizeName(file.getName());
        if (fileNorm === normalizedTarget) {
          const fileYear = extractYearFromFileName(file.getName());
          const fileSemester = extractSemesterFromFileName(file.getName());
          const targetYear = extractYearFromFileName(fileName);
          const targetSemester = extractSemesterFromFileName(fileName);
          if (fileYear === targetYear && fileSemester === targetSemester) {
            const url = file.getUrl();
            console.log(`✅ File ditemukan (exact year/semester match): ${url}`);
            addProcessedFile(fileName, url);
            addProcessedFile(file.getName(), url);
            return url;
          }
        }
      }
    }

    console.log(`❌ File tidak ditemukan: "${fileName}"`);
    return null;
  } catch (error) {
    console.error(`🚨 Error checking file existence: ${error}`);
    return null;
  }
}

function generateDocumentName(jenis, tahun, semester, nama) {
  const namaClean = nama.replace(/\s*,\s*s\.?s?t\.?/gi, '').replace(/\s*,\s*s\.?t\.?/gi, '').trim();
  if (jenis === 'Tahunan') {
    return `PAK Tahunan - ${tahun} - ${namaClean}`;
  } else if (jenis === 'Semester') {
    const semClean = semester.toString().replace(/[^12]/g, '');
    return `PAK Semester ${semClean} - ${tahun} - ${namaClean}`;
  } else if (jenis === 'Bulanan') {
    const bulanNum = parseMonthValue(semester);
    const bulanText = bulanNum ? getMonthName(bulanNum) : semester;
    return `PAK Bulanan ${bulanText} ${tahun} - ${namaClean}`;
  }
  return `${jenis || 'PAK'} ${tahun} - ${namaClean}`;
}

function validateDocumentCreation(item, folder) {
  const row = item.values;
  const headers = item.headers;
  const idx = name => headers.indexOf(name);
  const nama = item.nama;
  const tahun = item.tahun;
  const semester = item.semester;
  const jenis = item.jenis;
  const docName = generateDocumentName(jenis, tahun, semester, nama);

  console.log(`📄 Validating: "${docName}" (Semester: ${semester}, Tahun: ${tahun})`);

  const periodeAktif = cekPeriodeAktif(tahun, jenis, semester);
  if (!periodeAktif.aktif) {
    console.log(`ℹ️ Periode belum selesai / belum aktif: ${periodeAktif.alasan} — tetap lanjut karena baris dipilih untuk generate`);
  } else {
    console.log(`ℹ️ Periode selesai / aktif: ${periodeAktif.alasan}`);
  }

  const processedUrl = isFileProcessed(docName);
  if (processedUrl) {
    console.log(`⏩ Skip - Sudah diproses di cache: ${docName}`);
    return { skip: true, reason: 'cache', url: processedUrl, docName: docName };
  }

  if (item.oldStatus === 'Done' && item.oldLink && item.oldLink.includes('docs.google.com')) {
    console.log(`⏩ Skip - Status sudah 'Done' dengan link valid`);
    addProcessedFile(docName, item.oldLink);
    return { skip: true, reason: 'done_status', url: item.oldLink, docName: docName };
  }

  console.log(`🔍 Checking Drive for exact match: "${docName}"`);
  const exactFiles = folder.getFilesByName(docName);
  if (exactFiles.hasNext()) {
    const file = exactFiles.next();
    const existingUrl = file.getUrl();
    console.log(`⏩ Skip - File sudah ada di Drive: ${existingUrl}`);
    addProcessedFile(docName, existingUrl);
    return { skip: true, reason: 'drive_exists', url: existingUrl, docName: docName };
  }

  console.log(`🆕 Semua pengecekan lolos, buat dokumen baru: "${docName}"`);
  return { skip: false, reason: 'create_new', url: null, docName: docName };
}

function createDocument(templateFile, folder, docName, row, headers, idx) {
  const map = {};
  headers.forEach((h, i) => {
    let val = row[i] ?? '';
    if (['Tanggal Lahir','TMT Pangkat','TMT Jabatan'].includes(h)) {
      val = formatTanggalIndonesia(val);
    }
    if (['AK Sebelumnya','AK Periode Ini','Total Kumulatif','Selisih Pangkat','Selisih Jabatan',
         'Kurleb Pangkat','Kurleb Jabatan'].includes(h)) {
      const num = parseFloat(val.toString().replace(',', '.')) || 0;
      if (['Selisih Pangkat','Selisih Jabatan'].includes(h)) {
        val = formatAngkaSmart(Math.abs(num));
      } else if (['Kurleb Pangkat','Kurleb Jabatan'].includes(h)) {
        val = 'Kekurangan / Kelebihan';
      } else {
        val = formatAngkaSmart(num);
      }
    }
    if (h === 'Periode') val = getTeksPeriodeDenganTahun(row[idx('Jenis Periode')], row[idx('Semester')], row[idx('Tahun')]);
    if (h === 'Semester') val = getTeksSemesterTanpaTahun(row[idx('Jenis Periode')], row[idx('Semester')]);
    map[`<<${h}>>`] = val.toString();
  });

  map['<<Tanggal Penetapan>>'] = getTanggalPenetapanOtomatis(row[idx('Tahun')], row[idx('Jenis Periode')], row[idx('Semester')]);
  map['<<Prosentase>>'] = formatAngkaSmart(getProsentase(row[idx('Predikat Kinerja')] || 'Baik'));
  map['<<Koefisien>>'] = formatAngkaSmart(getKoefisien(row[idx('Jabatan')], row[idx('Golongan')]));
  map['<<Rekomendasi>>'] = generateRekomendasi(row, headers);

  const copy = templateFile.makeCopy(docName, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();
  Object.keys(map).forEach(ph => {
    body.replaceText(ph, map[ph]);
  });

  const teks = 'Kekurangan / Kelebihan';
  let result = null;
  let count = 0;
  const kurlebPangkatStr = row[idx('Kurleb Pangkat')] || '0';
  const kurlebJabatanStr = row[idx('Kurleb Jabatan')] || '0';
  const values = [
    parseFloat(kurlebPangkatStr.toString().replace(',', '.')) || 0,
    parseFloat(kurlebJabatanStr.toString().replace(',', '.')) || 0
  ];

  while ((result = body.findText(teks, result)) && count < 2) {
    const el = result.getElement().asText();
    const start = result.getStartOffset();
    el.setStrikethrough(start, start + 9, false);
    el.setStrikethrough(start + 12, start + 21, false);
    if (values[count] > 0) el.setStrikethrough(start + 12, start + 21, true);
    else el.setStrikethrough(start, start + 9, true);
    count++;
  }

  doc.saveAndClose();
  return copy.getUrl();
}

function updateSheetWithLink(sheet, rowNum, idx, url, timestamp) {
  if (url && url.includes('docs.google.com')) {
    sheet.getRange(rowNum, idx('Link') + 1).setValue(url);
  }
  sheet.getRange(rowNum, idx('Status Dokumen') + 1).setValue('Done');
  sheet.getRange(rowNum, idx('Last Update') + 1).setValue(timestamp);
}

function ensureGenerateCheckboxColumn(targetSheet, headersBaru) {
  const generateIdx = headersBaru.indexOf(GENERATE_COLUMN_NAME);
  if (generateIdx === -1) return;
  const rowCount = targetSheet.getLastRow();
  if (rowCount <= 1) return;
  const range = targetSheet.getRange(2, generateIdx + 1, rowCount - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireCheckbox()
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

function jalankanSemuaProses() {
  let lockAcquired = false;
  try {
    console.log('🚀 Memulai proses...');
    acquireLock();
    lockAcquired = true;
    const startTime = new Date();
    console.log('⏰ Start time:', startTime);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log('✅ Spreadsheet:', ss.getName());
    const srcSheet = ss.getSheetByName('konversi_predikat');
    if (!srcSheet) {
      throw new Error("❌ Sheet 'konversi_predikat' tidak ditemukan!");
    }
    console.log('✅ Sheet konversi_predikat ditemukan');

    const data = srcSheet.getDataRange().getValues();
    console.log('✅ Data loaded:', data.length, 'baris');
    if (data.length <= 1) {
      console.log('⚠️ Hanya header, tidak ada data di sheet konversi_predikat');
      safeAlert('ℹ️ INFORMASI: Tidak ada data di sheet "konversi_predikat".\n\nSilakan isi data terlebih dahulu sebelum menjalankan proses.');

    const headers = data[0];
    console.log('📋 Headers:', headers);

    let targetSheet = ss.getSheetByName('olah');
    if (!targetSheet) {
      console.log('📝 Membuat sheet olah baru...');
      targetSheet = ss.insertSheet('olah');
    }
    console.log('✅ Target sheet siap:', targetSheet.getName());

    const headersBaru = [
      'ID', 'Nomor Konversi', 'Nomor PAK', 'Nomor Akumulasi',
      'Tahun', 'Semester', 'Periode', 'Jenis Periode', 'Nama', 'NIP', 'Nomor Karpeg',
      'Tempat Lahir', 'Tanggal Lahir', 'Jenis Kelamin', 'Pangkat', 'Golongan',
      'TMT Pangkat', 'Jabatan', 'TMT Jabatan', 'Predikat Kinerja', 'Tanggal Penetapan',
      'Kebutuhan Pangkat', 'Kebutuhan Jabatan', 'AK Sebelumnya', 'AK Periode Ini',
      'Total Kumulatif', 'Selisih Pangkat', 'Selisih Jabatan', 'Kurleb Pangkat', 'Kurleb Jabatan',
      'Status Kenaikan', 'Jenis Kenaikan', 'Estimasi Bulan', 'Rekomendasi',
      'Pertimbangan Khusus', 'Status', 'Last Update', 'Generate',
      'Prosentase', 'Koefisien', 'Link', 'Status Dokumen'
    ];

    const existing = targetSheet.getDataRange().getValues();
    const oldMap = {};

    if (existing.length > 1) {
      const nameIdx = existing[0].indexOf('Nama');
      const tahunIdx = existing[0].indexOf('Tahun');
      const semIdx = existing[0].indexOf('Semester');
      const jenisIdx = existing[0].indexOf('Jenis Periode');
      const linkIdx = existing[0].indexOf('Link');
      const statusIdx = existing[0].indexOf('Status Dokumen');
      const generateIdx = existing[0].indexOf(GENERATE_COLUMN_NAME);

      for (let i = 1; i < existing.length; i++) {
        const r = existing[i];
        const namaNorm = normalizeName(r[nameIdx]);
        const jenisNorm = normalizeName(r[jenisIdx]);
        const key = `${namaNorm}|${r[tahunIdx] || ''}|${r[semIdx] || ''}|${jenisNorm}`.trim();
        if (key && key !== '|||') {
          oldMap[key] = {
            link: linkIdx !== -1 ? (r[linkIdx] || '') : '',
            status: statusIdx !== -1 ? (r[statusIdx] || '') : '',
            generate: generateIdx !== -1 ? parseBoolean(r[generateIdx]) : false
          };
        }
      }
    }

    console.log(`📋 Data existing ditemukan: ${Object.keys(oldMap).length} records`);

    const rows = data.slice(1);
    const dataPerTahun = {};
    const counterTahun = {};

    rows.forEach(r => {
      const tahun = r[1];
      const jenis = r[4] ? String(r[4]).trim() : '';
      const semester = r[2] ? String(r[2]).trim() : '';
      if (!tahun) return;
      if (!dataPerTahun[tahun]) {
        dataPerTahun[tahun] = { tahunan: [], semester: [], bulanan: [] };
        counterTahun[tahun] = 0;
      }
      if (jenis === 'Tahunan') dataPerTahun[tahun].tahunan.push(r);
      else if (jenis === 'Semester') dataPerTahun[tahun].semester.push(r);
      else if (jenis === 'Bulanan') dataPerTahun[tahun].bulanan.push(r);
      else dataPerTahun[tahun].semester.push(r);
    });

    const hasilOlah = [headersBaru];
    const dataMailMerge = [];
    const processedKeys = new Set();

    Object.keys(dataPerTahun).forEach(tahun => {
      const yy = String(tahun).slice(-2);
      ['tahunan', 'semester', 'bulanan'].forEach(tipe => {
        dataPerTahun[tahun][tipe].forEach(r => {
          counterTahun[tahun]++;
          const urut = String(counterTahun[tahun]).padStart(4, '0');
          const semester = r[2] || '';
          const baris = generateRow(r, tahun, yy, semester, urut);

          const namaNorm = normalizeName(r[5]);
          const jenisNorm = normalizeName(r[4]);
          const key = `${namaNorm}|${tahun}|${semester}|${jenisNorm}`.trim();

          if (!processedKeys.has(key)) {
            processedKeys.add(key);
            const old = oldMap[key] || {};
            const generateFlag = parseBoolean(old.generate || false);

            const outputRow = [
              ...baris.slice(0, 37),
              generateFlag,
              baris[37],
              baris[38],
              old.link || '',
              old.status || ''
            ];

            hasilOlah.push(outputRow);

            dataMailMerge.push({
              values: outputRow,
              headers: headersBaru,
              oldLink: old.link || '',
              oldStatus: old.status || '',
              generate: generateFlag,
              key: key,
              nama: r[5],
              tahun: tahun,
              semester: semester,
              jenis: r[4]
            });
          }
        });
      });
    });

    console.log(`📨 Data mail merge setelah deduplikasi: ${dataMailMerge.length} records`);

    targetSheet.clear();
    targetSheet.getRange(1, 1, hasilOlah.length, headersBaru.length).setValues(hasilOlah);
    targetSheet.autoResizeColumns(1, headersBaru.length);
    targetSheet.setFrozenRows(1);
    ensureGenerateCheckboxColumn(targetSheet, headersBaru);
    console.log(`✅ Sheet "olah" berhasil diupdate: ${hasilOlah.length - 1} baris`);

    const selectedRows = dataMailMerge.filter(item => item.generate === true);
    if (selectedRows.length === 0) {
      safeAlert('⚠️ Tidak ada baris yang dipilih untuk generate. Silakan centang kolom "Generate" pada sheet olah.');
      return;
    }

    const TEMPLATE_ID = '1HAk0Uc4LVgSCkIsEbKYXeNaEhyxqGCfYEu_Jqjka-J0';
    const FOLDER_ID   = '1ZAKE4or-16MVD_J3jHNVNdBtCH415NCP';
    const templateFile = DriveApp.getFileById(TEMPLATE_ID);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const now = new Date();

    console.log(`📧 Memulai mail merge untuk ${selectedRows.length} records...`);

    for (let i = 0; i < selectedRows.length; i++) {
      const item = selectedRows[i];
      const row = item.values;
      const headers = item.headers;
      const idx = name => headers.indexOf(name);

      console.log(`\n--- Processing ${i + 1}/${selectedRows.length}: ${item.nama} - ${item.tahun} - ${item.jenis} - Semester ${item.semester} ---`);

      try {
        const validation = validateDocumentCreation(item, folder);
        if (validation.skip) {
          console.log(`⏩ Skip - Alasan: ${validation.reason}`);
          if (validation.url && validation.url.includes('docs.google.com')) {
            updateSheetWithLink(targetSheet, i + 2, idx, validation.url, now);
          } else if (validation.reason === 'done_status') {
            targetSheet.getRange(i + 2, idx('Status Dokumen') + 1).setValue('Done');
            targetSheet.getRange(i + 2, idx('Last Update') + 1).setValue(now);
          }
          skipCount++;
          continue;
        }

        console.log(`🆕 Membuat dokumen baru: "${validation.docName}"`);
        const docUrl = createDocument(templateFile, folder, validation.docName, row, headers, idx);
        if (docUrl) {
          updateSheetWithLink(targetSheet, i + 2, idx, docUrl, now);
          addProcessedFile(validation.docName, docUrl);
          successCount++;
          console.log(`✅ Dokumen berhasil dibuat: ${docUrl}`);
        } else {
          throw new Error('Gagal membuat dokumen');
        }

        if (i < selectedRows.length - 1) {
          console.log('⏳ Menunggu 3 detik...');
          Utilities.sleep(3000);
        }
      } catch (error) {
        errorCount++;
        console.error(`🚨 ERROR processing ${item.nama}: ${error}`);
      }
    }

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    const message = `\n✅ PROSES SELESAI!\n\n📊 HASIL:\n• Total baris diolah: ${hasilOlah.length - 1}\n• Baris terpilih: ${selectedRows.length}\n• Dokumen baru: ${successCount}\n• Dilewati: ${skipCount}\n• Error: ${errorCount}\n• Durasi: ${duration} detik\n\n🔍 LOGICA KONDISI:\n• Status = "Done" → SKIP (abaikan link kosong)\n• File ada di cache → SKIP\n• File ada di Drive → SKIP\n• Selain itu → BUAT BARU\n\n${successCount > 0 ? '🎉 Dokumen berhasil dibuat!' : '📝 Tidak ada dokumen baru'}\n`.trim();
    console.log(message);
    safeAlert(message);
  } catch (error) {
    console.error(`🚨 ERROR dalam proses utama: ${error}`);
    console.error('Stack:', error.stack);
    safeAlert(`❌ ERROR: ${error.message}`);
  } finally {
    if (lockAcquired) {
      releaseLock();
      console.log('🔓 Lock released');
    }
  }
}

function resetSystem() {
  PropertiesService.getScriptProperties().deleteProperty(LOCK_PROPERTY);
  PropertiesService.getScriptProperties().deleteProperty(TRACKING_PROPERTY);
  console.log('🔄 System reset berhasil');
  safeAlert('✅ System reset berhasil! Lock dan cache telah dibersihkan.');
}

function hapusCacheManual() {
  try {
    const processed = PropertiesService.getScriptProperties().getProperty(TRACKING_PROPERTY);
    if (!processed) {
      safeAlert('ℹ️ Cache sudah kosong!');
      return;
    }
    const processedData = JSON.parse(processed);
    const fileCount = Object.keys(processedData).length;
    const response = safeConfirm(
      '🔄 HAPUS CACHE',
      `Anda akan menghapus ${fileCount} file dari cache.\n\nFile yang sudah dibuat TIDAK akan terhapus, hanya cache tracking-nya saja.\n\nLanjutkan?`
    );
    if (response === safeGetUi()?.Button.YES) {
      PropertiesService.getScriptProperties().deleteProperty(TRACKING_PROPERTY);
      const message = `✅ Cache berhasil dihapus!\n\n• ${fileCount} file dihapus dari cache\n• File Google Docs tetap aman\n• Proses berikutnya akan mengecek ulang semua file`;
      console.log(message);
      safeAlert(message);
    } else {
      safeAlert('❌ Penghapusan cache dibatalkan.');
    }
  } catch (error) {
    console.error('🚨 Error menghapus cache:', error);
    safeAlert(`❌ Gagal menghapus cache: ${error.message}`);
  }
}

function cekStatusCache() {
  try {
    const processed = PropertiesService.getScriptProperties().getProperty(TRACKING_PROPERTY);
    if (!processed) {
      safeAlert('ℹ️ Cache kosong!');
      return;
    }
    const processedData = JSON.parse(processed);
    const fileCount = Object.keys(processedData).length;
    let denganLink = 0;
    let tanpaLink = 0;
    let terbaru = null;
    for (const [fileName, data] of Object.entries(processedData)) {
      if (data.url && data.url.includes('docs.google.com')) {
        denganLink++;
      } else {
        tanpaLink++;
      }
      if (!terbaru || data.timestamp > terbaru.timestamp) {
        terbaru = { fileName, timestamp: data.timestamp, url: data.url };
      }
    }
    const terbaruDate = terbaru ? new Date(terbaru.timestamp).toLocaleString('id-ID') : 'Tidak ada';
    const message = `\n📊 STATUS CACHE:\n\n📁 Total Files: ${fileCount}\n✅ Dengan Link: ${denganLink}\n❌ Tanpa Link: ${tanpaLink}\n\n⏰ Update Terbaru:\n${terbaru ? `📄 ${terbaru.fileName}\n⏰ ${terbaruDate}` : 'Tidak ada data'}\n\n🔧 Opsi:\n• "lihatIsiCache()" - Lihat detail cache\n• "hapusCacheManual()" - Hapus cache\n• "resetSystem()" - Reset lengkap`.trim();
    console.log(message);
    safeAlert(message);
  } catch (error) {
    console.error('🚨 Error cek status cache:', error);
    safeAlert(`❌ Gagal cek status cache: ${error.message}`);
  }
}
