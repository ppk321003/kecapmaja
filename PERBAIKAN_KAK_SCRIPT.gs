/**
 * Script Google Apps untuk memproses sheet "KerangkaAcuanKerja",
 * menyalin template Google Docs, mengisi placeholder, dan mengupdate sheet.
 * 
 * PERBAIKAN: Latar Belakang Kegiatan diambil langsung dari kolom DF di sheet KerangkaAcuanKerja
 * Referensi sheet "LATARBELAKANG" sudah dihilangkan
 */
function KAKbahanModal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Ambil sheet KerangkaAcuanKerja
  const sheet = ss.getSheetByName('KerangkaAcuanKerja');
  if (!sheet) {
    throw new Error('Sheet "KerangkaAcuanKerja" tidak ditemukan');
  }

  // Ambil semua data dari sheet (header + isi)
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Temukan indeks kolom berdasarkan header
  const idx = {};
  const requiredHeaders = ['Status', 'Link', 'Jenis Kerangka Acuan Kerja', 'Akun', 'Program Pembebanan', 'Kegiatan',
    'Kode Rincian Output', 'Rincian Output', 'Komponen Output', 'Pagu Anggaran',
    'Tanggal Mulai Kegiatan', 'Tanggal Akhir Kegiatan', 'Tanggal Pengajuan KAK',
    'Nama Pembuat Daftar', 'Volume-1', 'Latar Belakang Kegiatan'
  ];
  // Tambahkan header untuk Nama Kegiatan, Volume, Satuan, Harga Satuan (1-15)
  for (let k = 1; k <= 15; k++) {
    requiredHeaders.push('Nama Kegiatan-' + k);
    requiredHeaders.push('Volume-' + k);
    requiredHeaders.push('Satuan-' + k);
    requiredHeaders.push('Harga Satuan-' + k);
  }

  requiredHeaders.forEach(function(colName) {
    const colIndex = headers.indexOf(colName);
    if (colIndex === -1) {
      Logger.log(`Warning: Kolom "${colName}" tidak ditemukan di sheet.`);
      idx[colName] = -1; // Set index ke -1 jika tidak ditemukan
    } else {
      idx[colName] = colIndex;
    }
  });

  // Validasi kolom-kolom krusial
  const crucialHeaders = ['Status', 'Link', 'Jenis Kerangka Acuan Kerja', 'Akun', 'Program Pembebanan', 'Kegiatan',
    'Kode Rincian Output', 'Rincian Output', 'Komponen Output'
  ];
  crucialHeaders.forEach(header => {
    if (idx[header] === -1) {
      throw new Error(`Kolom krusial "${header}" tidak ditemukan di sheet. Skrip dihentikan.`);
    }
  });

  // ID dokumen template Google Docs
  const templateDocId = '1Fy5rMaTKWWCpeE_RHZvJ8kLoylaamMT0DcJcnSgPJ4Q';
  // Folder tujuan menyimpan dokumen hasil
  const destFolder = DriveApp.getFolderById('1Umlq1PfjPTmegyncXpRaRReZMT8BaPrY'); // Folder KAK

  // Baca sheet MASTER.ORGANIK untuk Pengecekan NIP SM
  const masterSheet = ss.getSheetByName('MASTER.ORGANIK');
  let masterData = [];
  let idxMasterNama = -1,
    idxMasterNIP = -1;
  if (masterSheet) {
    const mrange = masterSheet.getDataRange();
    if (mrange.getNumRows() > 1) {
      const mvals = mrange.getValues();
      const mheader = mvals[0];
      idxMasterNama = mheader.indexOf('Nama');
      idxMasterNIP = mheader.indexOf('NIP');
      if (idxMasterNama !== -1 && idxMasterNIP !== -1) {
        for (let i = 1; i < mvals.length; i++) {
          if (mvals[i][idxMasterNama]) {
            masterData.push({
              nama: mvals[i][idxMasterNama].toString().trim(),
              nip: mvals[i][idxMasterNIP]
            });
          }
        }
      } else {
        Logger.log('Sheet MASTER.ORGANIK tidak memiliki kolom "Nama" atau "NIP".');
      }
    } else {
      Logger.log('Sheet "MASTER.ORGANIK" kosong atau hanya berisi header.');
    }
  } else {
    Logger.log('Sheet "MASTER.ORGANIK" tidak ditemukan.');
  }

  // Fungsi helper untuk memformat angka dengan pemisah ribuan dan ",-"
  const formatNumber = function(num) {
    if (typeof num !== 'number' || isNaN(num)) {
      return ''; // Mengembalikan string kosong jika bukan angka
    }
    return num.toLocaleString('id-ID') + ',-'; // Menggunakan toLocaleString untuk pemisah ribuan
  };

  // Fungsi helper untuk mengekstrak isi dalam kurung
  const extractValueInsideParentheses = function(text) {
    if (!text) return '';
    const match = text.match(/\((.*?)\)/);
    return match ? match[1].trim() : '';
  };

  // Loop mulai dari baris kedua (i=1 karena i=0 header)
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (row.length <= Math.max(...Object.values(idx).filter(index => index !== -1))) { // Filter index -1
      Logger.log(`Skipping row ${i+1} due to insufficient columns.`);
      continue;
    }

    const status = row[idx['Status']];
    const jenisKAK = row[idx['Jenis Kerangka Acuan Kerja']];

    // Hanya proses jika status kosong (atau spasi kosong) DAN Jenis Kerangka Acuan Kerja adalah 'Belanja Bahan' atau 'Belanja Modal'
    if ((!status || status.toString().trim() === '') &&
      (jenisKAK === 'Belanja Bahan' || jenisKAK === 'Belanja Modal')) {

      // Ambil nilai-nilai dari baris, gunakan idx dengan cek -1
      const akun = idx['Akun'] !== -1 ? row[idx['Akun']] || '' : '';
      const programPembebanan = idx['Program Pembebanan'] !== -1 ? row[idx['Program Pembebanan']] || '' : '';
      const kegiatan = idx['Kegiatan'] !== -1 ? row[idx['Kegiatan']] || '' : '';
      const kodeROAsli = idx['Kode Rincian Output'] !== -1 ? row[idx['Kode Rincian Output']] || '' : '';
      const rincianOutput = idx['Rincian Output'] !== -1 ? row[idx['Rincian Output']] || '' : '';
      const komponenOutput = idx['Komponen Output'] !== -1 ? row[idx['Komponen Output']] || '' : '';
      const paguAnggaran = idx['Pagu Anggaran'] !== -1 ? parseFloat(row[idx['Pagu Anggaran']]) || 0 : 0; // Tetap ambil sebagai angka untuk perhitungan
      const tglMulai = idx['Tanggal Mulai Kegiatan'] !== -1 ? row[idx['Tanggal Mulai Kegiatan']] : null;
      const tglAkhir = idx['Tanggal Akhir Kegiatan'] !== -1 ? row[idx['Tanggal Akhir Kegiatan']] : null;
      const tglPengajuan = idx['Tanggal Pengajuan KAK'] !== -1 ? row[idx['Tanggal Pengajuan KAK']] : null;
      const namaPembuat = idx['Nama Pembuat Daftar'] !== -1 ? row[idx['Nama Pembuat Daftar']] || '' : '';
      const namaKegiatan1 = idx['Nama Kegiatan-1'] !== -1 ? row[idx['Nama Kegiatan-1']] || '' : ''; // Ambil Nama Kegiatan-1
      const volume1 = idx['Volume-1'] !== -1 ? row[idx['Volume-1']] || '' : '';
      
      // PERBAIKAN: Ambil Latar Belakang Kegiatan langsung dari kolom DF
      const latarBelakangKegiatan = idx['Latar Belakang Kegiatan'] !== -1 ? row[idx['Latar Belakang Kegiatan']] || '' : '';

      // Kumpulkan daftar kegiatan 1..15
      let kegiatanList = [];
      for (let k = 1; k <= 15; k++) {
        const colName = 'Nama Kegiatan-' + k;
        if (idx[colName] !== -1) {
          const val = row[idx[colName]];
          if (val && val.toString().trim() !== '') {
            kegiatanList.push(val.toString().trim());
          }
        } else {
          break;
        }
      }
      const gabungKegiatan = kegiatanList.join('\n');
      let gabungKegiatan2 = '';
      if (kegiatanList.length > 1) {
        let allButLast = kegiatanList.slice(0, kegiatanList.length - 1).join(', ');
        let last = kegiatanList[kegiatanList.length - 1];
        gabungKegiatan2 = allButLast + ' dan ' + last;
      } else {
        gabungKegiatan2 = kegiatanList.join('');
      }

      const gabungNo = kegiatanList.map((_, idxN) => idxN + 1).join('\n');
      let volumeList = [],
        satuanList = [],
        hargaList = [], // Tetap simpan sebagai angka untuk perhitungan
        jumlahList = []; // Tetap simpan sebagai angka untuk perhitungan

      let hargaListFormatted = [],
        jumlahListFormatted = []; // Array baru untuk menyimpan string yang diformat

      for (let k = 1; k <= 15; k++) {
        const volCol = 'Volume-' + k;
        const satCol = 'Satuan-' + k;
        const hargaCol = 'Harga Satuan-' + k;

        if (kegiatanList[k - 1]) {
          const vol = idx[volCol] !== -1 ? parseFloat(row[idx[volCol]]) || 0 : 0;
          const sat = idx[satCol] !== -1 ? row[idx[satCol]] || '' : '';
          const harga = idx[hargaCol] !== -1 ? parseFloat(row[idx[hargaCol]]) || 0 : 0;
          const jumlah = vol * harga || 0;

          volumeList.push(vol || ''); // Volume tidak diformat
          satuanList.push(sat);
          hargaList.push(harga); // Simpan angka asli untuk perhitungan
          jumlahList.push(jumlah); // Simpan angka asli untuk perhitungan

          // Format harga dan jumlah untuk ditampilkan di dokumen
          hargaListFormatted.push(formatNumber(harga));
          jumlahListFormatted.push(formatNumber(jumlah));

        } else if (idx['Nama Kegiatan-' + k] === -1) {
          break;
        }
      }
      const gabungVol = volumeList.join('\n');
      const gabungSatuan = satuanList.join('\n');
      const gabungHarga = hargaListFormatted.join('\n'); // Gunakan array yang diformat
      const gabungJumlah = jumlahListFormatted.join('\n'); // Gunakan array yang diformat

      const jmlBiaya = jumlahList.reduce((sum, val) => sum + (parseFloat(val) || 0), 0); // Hitung total dari array angka asli
      const jmlBiayaFormatted = formatNumber(jmlBiaya); // Format total biaya

      const warning = (jmlBiaya > paguAnggaran) ? '⚠️ Biaya melebihi pagu anggaran' : '';

      // PERBAIKAN: Gunakan langsung nilai dari kolom, tanpa pencarian di LATARBELAKANG
      const gabungLatarBelakang = latarBelakangKegiatan;

      let PPK = '',
        nipPPK = '';
      if (programPembebanan && programPembebanan.toString().indexOf('WA') !== -1) {
        PPK = 'Andries Kurniawan, S.E., M.Sc.';
        nipPPK = '19840803 201101 1 010';
      } else {
        PPK = 'Andries Kurniawan, S.E., M.Sc.';
        nipPPK = '19840803 201101 1 010';
      }

      let jabatanSM = '';
      let subjekMeter = '';
      const kegiatanLower = kegiatan.toLowerCase();

      if (kegiatanLower.includes('2886')) {
        jabatanSM = 'Kepala Subbagian Umum';
        subjekMeter = 'Sri Haryati, S.IP';
      } else if (kegiatanLower.includes('2896') || kegiatanLower.includes('2898') || kegiatanLower.includes('2899')) {
        jabatanSM = 'Ketua Tim Statistik Nerwilis';
        subjekMeter = 'Fenty Jimika, S.ST., M.AP.';
      } else if (kegiatanLower.includes('2897') || kegiatanLower.includes('2900')) {
        jabatanSM = 'Ketua Tim Statistik IPDS';
        subjekMeter = 'Aep Saepudin, S.Si., M.AP.';
      } else if (kegiatanLower.includes('2902') || kegiatanLower.includes('2903') || kegiatanLower.includes('2908')) {
        jabatanSM = 'Ketua Tim Statistik Distribusi';
        subjekMeter = 'Devane Setyo Wicaksono, S.ST.';
      } else if (kegiatanLower.includes('2904') || kegiatanLower.includes('2909') || kegiatanLower.includes('2910')) {
        jabatanSM = 'Ketua Tim Statistik Produksi';
        subjekMeter = 'Deni Sarantika, S.ST.';
      } else if (kegiatanLower.includes('2905') || kegiatanLower.includes('2906') || kegiatanLower.includes('2907')) {
        jabatanSM = 'Ketua Tim Statistik Sosial';
        subjekMeter = 'Elitya Tri Permana, S.ST.';
      } else {
        jabatanSM = 'Jabatan tidak ditemukan';
        subjekMeter = namaPembuat; // Fallback ke nama pembuat jika kegiatan tidak cocok
      }

      let nipSM = '';
      masterData.forEach(function(m) {
        if (m.nama === subjekMeter) {
          nipSM = m.nip;
        }
      });

      // --- Logika Pembentukan String Pembebanan ---

      // Ekstrak nilai dari dalam kurung
      const kodeROInside = extractValueInsideParentheses(kodeROAsli);
      const rincianOutputInside = extractValueInsideParentheses(rincianOutput);
      const komponenOutputInside = extractValueInsideParentheses(komponenOutput);
      const akunInside = extractValueInsideParentheses(akun);

      // Ambil bagian dari kodeROInside sebelum titik terakhir
      let kodeROPart = kodeROInside;
      const lastDotIndex = kodeROInside.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        kodeROPart = kodeROInside.substring(0, lastDotIndex);
      }

      // Gabungkan string sesuai format yang diinginkan
      const pembebanan = [
        rincianOutputInside,
        komponenOutputInside,
        'A',
        akunInside
      ].filter(part => part !== null && part !== '').join('.');

      // --- Akhir Logika Pembentukan String Pembebanan ---

      // Tambahkan logging untuk debugging (termasuk nomor baris)
      Logger.log(`--- Baris ${i+1} ---`);
      Logger.log(`Pagu Anggaran (raw): ${paguAnggaran}`);
      Logger.log(`Pagu Anggaran (formatted): ${formatNumber(paguAnggaran)}`); // Log nilai yang diformat
      Logger.log(`Jml Biaya (raw): ${jmlBiaya}`);
      Logger.log(`Jml Biaya (formatted): ${jmlBiayaFormatted}`); // Log nilai yang diformat
      Logger.log(`Gabung Harga (formatted): \n${gabungHarga}`); // Log nilai yang diformat
      Logger.log(`Gabung Jumlah (formatted): \n${gabungJumlah}`); // Log nilai yang diformat
      Logger.log(`Final Pembebanan string: "${pembebanan}"`);
      Logger.log(`Latar Belakang Kegiatan: ${gabungLatarBelakang}`);
      Logger.log(`-----------------`);

      // Buat nama file
      const fileNumber = i;
      const fileName = `${fileNumber} - ${jenisKAK} - ${namaKegiatan1}`;

      const formatTanggal = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
        
        try {
          // Tambahkan 1 hari untuk mengkompensasi pergeseran timezone
          const adjustedDate = new Date(date);
          adjustedDate.setDate(adjustedDate.getDate() + 1);
          
          const options = {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          };
          
          // Format dengan locale Indonesia
          return adjustedDate.toLocaleDateString('id-ID', options);
        } catch (e) {
          Logger.log('Error formatting date: ' + e + ' for value: ' + date);
          return '';
        }
      };
      const tglMulaiFormatted = formatTanggal(tglMulai);
      const tglAkhirFormatted = formatTanggal(tglAkhir);
      const tglPengajuanFormatted = formatTanggal(tglPengajuan);

      let newFile;
      try {
        newFile = DriveApp.getFileById(templateDocId).makeCopy(fileName, destFolder);
      } catch (e) {
        Logger.log(`Error creating copy of template for row ${i+1}: ${e}`);
        // Update status jika kolom ada
        if (idx['Status'] !== -1) sheet.getRange(i + 1, idx['Status'] + 1).setValue('Error: Template Copy Failed');
        continue;
      }

      const newDocId = newFile.getId();
      let doc;
      try {
        doc = DocumentApp.openById(newDocId);
      } catch (e) {
        Logger.log(`Error opening new document for row ${i+1}: ${e}`);
        if (idx['Status'] !== -1) sheet.getRange(i + 1, idx['Status'] + 1).setValue('Error: Open Doc Failed');
        continue;
      }

      const body = doc.getBody();
      const footer = doc.getFooter();

      // Ganti placeholder di body
      body.replaceText('<<Akun>>', akun);
      body.replaceText('<<Gabung kegiatan>>', gabungKegiatan);
      body.replaceText('<<Gabung kegiatan 2>>', gabungKegiatan2);
      body.replaceText('<<Latar Belakang Kegiatan>>', gabungLatarBelakang);
      body.replaceText('<<Program Pembebanan>>', programPembebanan);
      body.replaceText('<<Kegiatan>>', kegiatan);
      body.replaceText('<<Kode Rincian Output>>', kodeROAsli);
      body.replaceText('<<Rincian Output>>', rincianOutput);
      body.replaceText('<<Komponen Output>>', komponenOutput);
      // Ganti placeholder Pagu Anggaran dengan nilai yang diformat
      body.replaceText('<<Pagu Anggaran>>', formatNumber(paguAnggaran));
      body.replaceText('<<Tanggal Mulai Kegiatan>>', tglMulaiFormatted);
      body.replaceText('<<Tanggal Akhir Kegiatan>>', tglAkhirFormatted);
      body.replaceText('<<Tanggal Pengajuan KAK>>', tglPengajuanFormatted);
      body.replaceText('<<Gabung no>>', gabungNo);
      body.replaceText('<<Gabung vol>>', gabungVol); // Volume tidak diformat
      body.replaceText('<<Gabung satuan>>', gabungSatuan);
      body.replaceText('<<Volume-1>>', volume1);
      // Ganti placeholder harga satuan dan jumlah dengan nilai yang diformat
      body.replaceText('<<Gabung harga satuan>>', gabungHarga);
      body.replaceText('<<Gabung jumlah biaya>>', gabungJumlah);
      // Ganti placeholder Jml biaya dengan nilai yang diformat
      body.replaceText('<<Jml biaya>>', jmlBiayaFormatted);
      body.replaceText('<<Warning>>', warning);
      body.replaceText('<<PPK>>', PPK);
      body.replaceText('<<NIP PPK>>', nipPPK);
      body.replaceText('<<Jabatan SM>>', jabatanSM);
      body.replaceText('<<Subjek meter>>', subjekMeter);
      body.replaceText('<<NIP SM>>', nipSM);
      body.replaceText('<<Pembebanan>>', pembebanan);

      if (footer) {
        footer.replaceText('<<Akun>>', akun);
        footer.replaceText('<<Gabung kegiatan>>', gabungKegiatan);
        footer.replaceText('<<Gabung kegiatan 2>>', gabungKegiatan2);
        footer.replaceText('<<Latar Belakang Kegiatan>>', gabungLatarBelakang);
        footer.replaceText('<<Program Pembebanan>>', programPembebanan);
        footer.replaceText('<<Kegiatan>>', kegiatan);
        footer.replaceText('<<Kode Rincian Output>>', kodeROAsli);
        footer.replaceText('<<Rincian Output>>', rincianOutput);
        footer.replaceText('<<Komponen Output>>', komponenOutput);
        // Ganti placeholder Pagu Anggaran dengan nilai yang diformat
        footer.replaceText('<<Pagu Anggaran>>', formatNumber(paguAnggaran));
        footer.replaceText('<<Tanggal Mulai Kegiatan>>', tglMulaiFormatted);
        footer.replaceText('<<Tanggal Akhir Kegiatan>>', tglAkhirFormatted);
        footer.replaceText('<<Tanggal Pengajuan KAK>>', tglPengajuanFormatted);
        footer.replaceText('<<Gabung no>>', gabungNo);
        footer.replaceText('<<Gabung vol>>', gabungVol); // Volume tidak diformat
        footer.replaceText('<<Gabung satuan>>', gabungSatuan);
        footer.replaceText('<<Volume-1>>', volume1);        
        // Ganti placeholder harga satuan dan jumlah dengan nilai yang diformat
        footer.replaceText('<<Gabung harga satuan>>', gabungHarga);
        footer.replaceText('<<Gabung jumlah biaya>>', gabungJumlah);
        // Ganti placeholder Jml biaya dengan nilai yang diformat
        footer.replaceText('<<Jml biaya>>', jmlBiayaFormatted);
        footer.replaceText('<<Warning>>', warning);
        footer.replaceText('<<PPK>>', PPK);
        footer.replaceText('<<NIP PPK>>', nipPPK);
        footer.replaceText('<<Jabatan SM>>', jabatanSM);
        footer.replaceText('<<Subjek meter>>', subjekMeter);
        footer.replaceText('<<NIP SM>>', nipSM);
        footer.replaceText('<<Pembebanan>>', pembebanan);
      }

      try {
        doc.saveAndClose();
      } catch (e) {
        Logger.log(`Error saving/closing document for row ${i+1}: ${e}`);
        if (idx['Status'] !== -1) sheet.getRange(i + 1, idx['Status'] + 1).setValue('Error: Save/Close Failed');
        continue;
      }

      try {
        if (idx['Status'] !== -1) sheet.getRange(i + 1, idx['Status'] + 1).setValue('Generated');
        if (idx['Link'] !== -1) sheet.getRange(i + 1, idx['Link'] + 1).setValue(newFile.getUrl());
      } catch (e) {
        Logger.log(`Error updating sheet for row ${i + 1}: ${e}`);
      }

      Utilities.sleep(500);
    }
  }
  Logger.log("--- Proses Selesai ---");
  try {
    Logger.log("Menjalankan fungsi kirim WA otomatis...");
    sendDataFromKAKToWA_KECAP();
    Logger.log("Fungsi kirim WA berhasil dijalankan");
  } catch (error) {
    Logger.log("Error saat menjalankan fungsi kirim WA: " + error.toString());
  }
}

/**
 * Fungsi untuk mengirim data dari sheet KerangkaAcuanKerja ke sheet WA-KECAP
 * dengan pengecekan duplikasi berdasarkan Link
 */
function sendDataFromKAKToWA_KECAP() {
  try {
    // Sheet sumber
    const sourceSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = sourceSpreadsheet.getSheetByName("KerangkaAcuanKerja");
    
    // Sheet tujuan
    const targetSpreadsheet = SpreadsheetApp.openById("1sQPukgDuGxku_cQ8bsYc4gSo2KdOIanyC4VJYdn2lJ0");
    const targetSheet = targetSpreadsheet.getSheetByName("WA-KECAP");
    
    // Ambil data dari sheet sumber
    const sourceData = sourceSheet.getDataRange().getValues();
    const sourceHeaders = sourceData[0];
    
    // Cari indeks kolom yang dibutuhkan
    const pembuatDaftarIndex = sourceHeaders.indexOf("Nama Pembuat Daftar");
    const namaKegiatanIndex = sourceHeaders.indexOf("Nama Kegiatan-1");
    const linkIndex = sourceHeaders.indexOf("Link");
    
    // Validasi kolom
    if (pembuatDaftarIndex === -1 || namaKegiatanIndex === -1 || linkIndex === -1) {
      throw new Error("Salah satu kolom yang diperlukan tidak ditemukan di sheet sumber");
    }
    
    // Ambil data dari sheet tujuan
    const targetData = targetSheet.getDataRange().getValues();
    let lastNumber = 0;
    
    // Cari nomor terakhir dan kumpulkan semua existing links
    const existingLinks = new Set();
    if (targetData.length > 1) {
      for (let i = 1; i < targetData.length; i++) {
        const row = targetData[i];
        // Cari nomor terakhir
        const currentNo = row[0];
        if (currentNo && !isNaN(currentNo)) {
          lastNumber = Math.max(lastNumber, Number(currentNo));
        }
        // Kumpulkan existing links
        const existingLink = row[6]; // Kolom Link (index 6)
        if (existingLink && existingLink.toString().trim() !== '') {
          existingLinks.add(existingLink.toString().trim());
        }
      }
    }
    
    console.log(`Nomor terakhir di WA-KECAP: ${lastNumber}`);
    console.log(`Jumlah existing links: ${existingLinks.size}`);
    
    // Siapkan data untuk dikirim
    const dataToSend = [];
    let skippedCount = 0;
    let newDataCount = 0;
    
    // Loop melalui data sumber (lewati header)
    for (let i = 1; i < sourceData.length; i++) {
      const row = sourceData[i];
      
      // Skip baris kosong (cek kedua kolom penting)
      if ((!row[pembuatDaftarIndex] || row[pembuatDaftarIndex].toString().trim() === '') && 
          (!row[namaKegiatanIndex] || row[namaKegiatanIndex].toString().trim() === '')) {
        continue;
      }
      
      const currentLink = row[linkIndex] ? row[linkIndex].toString().trim() : '';
      
      // Validasi: Data harus memiliki Link untuk menghindari duplikasi
      if (!currentLink || currentLink === '') {
        console.log(`Baris ${i + 1} dilewati karena tidak memiliki Link`);
        skippedCount++;
        continue;
      }
      
      // Cek apakah data sudah ada di sheet tujuan berdasarkan Link
      if (existingLinks.has(currentLink)) {
        console.log(`Data dengan Link "${currentLink}" sudah ada, dilewati`);
        skippedCount++;
        continue;
      }
      
      lastNumber++;
      newDataCount++;
      
      const newData = [
        lastNumber, // No
        row[pembuatDaftarIndex] || '', // Pembuat Daftar (dari Nama Pembuat Daftar)
        "Kerangka Acuan Kerja", // Jenis Dokumen (default)
        row[namaKegiatanIndex] || '', // Nama Kegiatan (dari Nama Kegiatan-1)
        row[pembuatDaftarIndex] || '', // Organik (dari Nama Pembuat Daftar)
        "", // Mitra Statistik (kosong)
        currentLink, // Link
        new Date() // Last update
      ];
      
      dataToSend.push(newData);
      
      // Tambahkan ke existing links untuk menghindari duplikasi dalam batch yang sama
      existingLinks.add(currentLink);
    }
    
    // Kirim data ke sheet tujuan jika ada data baru
    if (dataToSend.length > 0) {
      const startRow = targetSheet.getLastRow() + 1;
      targetSheet.getRange(startRow, 1, dataToSend.length, dataToSend[0].length)
                .setValues(dataToSend);
      
      console.log(`✅ BERHASIL: Mengirim ${dataToSend.length} baris data baru dari KAK ke WA-KECAP`);
      console.log(`📊 STATISTIK: ${newDataCount} data baru, ${skippedCount} data dilewati`);
      console.log(`📍 Dimulai dari baris: ${startRow}`);
    } else {
      console.log("ℹ️ TIDAK ADA DATA BARU: Semua data KAK sudah ada di WA-KECAP");
      console.log(`📊 STATISTIK: ${skippedCount} data diperiksa, semua sudah ada`);
    }
    
  } catch (error) {
    console.error("❌ ERROR:", error.toString());
    console.error("Stack trace:", error.stack);
    throw error;
  }
}
