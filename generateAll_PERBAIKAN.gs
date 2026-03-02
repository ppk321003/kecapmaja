function generateAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bahanSheet = ss.getSheetByName('BAHAN REVISI & RPD');

  // === 1. Buat / Reset Template-web ===
  let templateSheet = ss.getSheetByName('Template-web');
  if (!templateSheet) {
    templateSheet = ss.insertSheet('Template-web');
  } else {
    templateSheet.clear();
  }

  // Header baru dengan tambahan kolom Jumlah Semula, Jumlah Menjadi, dan Selisih
  const header = [
    'Program Pembebanan', 'Kegiatan', 'Rincian Output', 'Komponen Output', 'Sub Komponen',
    'Akun', 'Uraian', 'Volume Semula', 'Satuan Semula', 'Harga Satuan Semula', 'Jumlah Semula',
    'Volume Menjadi', 'Satuan Menjadi', 'Harga Satuan Menjadi', 'Jumlah Menjadi', 'Selisih',
    'Sisa Anggaran', 'Blokir'
  ];
  templateSheet.appendRow(header);

  const data = bahanSheet.getDataRange().getValues();
  const output = [];

  let program = '', kegiatan = '', rincian = '', komponen = '', subkomponen = '';

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const kode = String(row[0] || '').trim();
    const kolomB = String(row[1] || '').trim();
    const kolomC = String(row[2] || '').trim();

    const containsDash = kolomB.includes('-') || /[-–—]/.test(kolomB);

    // Tangkap struktur kode
    if (/^054\.01\.(GG|WA)$/.test(kode)) {
      program = kode;
    } else if (/^\d{4}$/.test(kode)) {
      kegiatan = kode;
    } else if (/^\w{4}\.\w{3}$/.test(kode)) {
      rincian = kode;
    } else if (/^\w{4}\.\w{3}\.\d{3}$/.test(kode)) {
      komponen = kode;
    } else if (/^\d{1,3}$/.test(kode)) {
      // MODIFICATION: Added cases for 053 and 054 with GG/WA suffix
      if (kode === '051' || kode === '053' || kode === '054') {
        subkomponen = kode + '_' + (program.endsWith('GG') ? 'GG' : 'WA');
      } else {
        subkomponen = kode.padStart(3, '0');
      }
    }

    // Tambahkan hanya jika kolom B mengandung "-" dan kolom C tidak kosong
    if (containsDash && kolomC !== '') {
      // Cari akun (kode 6 digit terakhir sebelum baris ini)
      let akun = '';
      for (let j = i; j >= 0; j--) {
        const k = String(data[j][0] || '').trim();
        if (/^\d{6}$/.test(k)) {
          akun = k;
          break;
        }
      }
      if (!akun) continue;

      // PERBAIKAN: Sesuaikan index kolom dengan struktur data yang benar
      // SEMULA: kolom G(6), H(7), I(8), J(9)
      // MENJADI: kolom L(11), M(12), N(13), O(14)
      // BLOKIR: kolom M(12)
      // REALISASI: kolom S(18)
      // SISA ANGGARAN: kolom T(19)
      const uraian = kolomC;
      const volSemula = row[6] !== '' ? Number(row[6]) : 0;       // kolom G
      const satuanSemula = String(row[7] || '').trim();           // kolom H
      const hargaSemula = row[8] !== '' ? Number(row[8]) : 0;     // kolom I
      const volMenjadi = row[11] !== '' ? Number(row[11]) : 0;    // kolom L
      const satuanMenjadi = String(row[13] || '').trim();         // kolom N
      const hargaMenjadi = row[14] !== '' ? Number(row[14]) : 0;  // kolom O
      const blokir = row[12] !== '' ? Number(row[12]) : 0;        // kolom M
      const realisasi = row[18] !== '' ? Number(row[18]) : 0;     // kolom S
      const sisaAnggaran = row[19] !== '' ? Number(row[19]) : 0;  // kolom T

      // Hitung jumlah semula, jumlah menjadi, dan selisih
      const jumlahSemula = volSemula * hargaSemula;
      const jumlahMenjadi = volMenjadi * hargaMenjadi;
      const selisih = jumlahMenjadi - jumlahSemula;

      output.push([
        program,
        kegiatan,
        rincian,
        komponen,
        "'" + subkomponen,
        akun,
        uraian,
        volSemula,
        satuanSemula,
        hargaSemula,
        jumlahSemula,
        volMenjadi,
        satuanMenjadi,
        hargaMenjadi,
        jumlahMenjadi,
        selisih,
        sisaAnggaran,
        blokir
      ]);
    }
  }

  if (output.length > 0) {
    // Format kolom teks
    templateSheet.getRange(2, 5, output.length).setNumberFormat('@STRING@');
    templateSheet.getRange(2, 1, output.length, header.length).setValues(output);
    
    // Format angka untuk kolom Jumlah Semula, Jumlah Menjadi, Selisih
    templateSheet.getRange(2, 11, output.length, 1).setNumberFormat('#,##0'); // Jumlah Semula
    templateSheet.getRange(2, 15, output.length, 1).setNumberFormat('#,##0'); // Jumlah Menjadi
    templateSheet.getRange(2, 16, output.length, 1).setNumberFormat('#,##0'); // Selisih
  }

  // === 2. Buat / Reset LDS ===
  let ldsSheet = ss.getSheetByName('LDS');
  if (!ldsSheet) {
    ldsSheet = ss.insertSheet('LDS');
  } else {
    ldsSheet.clear();
  }

  const tdata = templateSheet.getDataRange().getValues();
  const theaders = tdata[0];
  const rows = tdata.slice(1);

  const colKegiatan = theaders.indexOf("Kegiatan");
  const colRincian = theaders.indexOf("Rincian Output");
  const colVol = theaders.indexOf("Volume Menjadi");
  const colHarga = theaders.indexOf("Harga Satuan Menjadi");
  const colBlokir = theaders.indexOf("Blokir");
  const colSisa = theaders.indexOf("Sisa Anggaran");

  // Hitung target bulanan
  const bulanIni = new Date().getMonth() + 1; // 1-12
  const targetPersen = bulanIni / 12;
  const namaBulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ][bulanIni - 1];

  // Helper agregasi
  function aggregate(rows, keyFn) {
    const result = {};
    rows.forEach(r => {
      const key = keyFn(r);
      if (!key) return;
      let pagu = (Number(r[colVol]) || 0) * (Number(r[colHarga]) || 0);
      const blokir = Number(r[colBlokir]) || 0;
      const sisa = Number(r[colSisa]) || 0;
      const realisasi = pagu - sisa - blokir;

      if (!result[key]) {
        result[key] = { pagu: 0, blokir: 0, realisasi: 0, sisa: 0 };
      }
      result[key].pagu += pagu;
      result[key].blokir += blokir;
      result[key].realisasi += realisasi;
      result[key].sisa += sisa;
    });
    return result;
  }

  // Fungsi keterangan
  function buatKeterangan(realisasi, pagu, blokir) {
    const dasarPagu = pagu - blokir;
    const persen = dasarPagu > 0 ? realisasi / dasarPagu : 0;
    let ket = "";

    if (persen < targetPersen) {
      ket = `Realisasi belum sesuai target bulan ${namaBulan}, target = ${(targetPersen*100).toFixed(2)}%, realisasi = ${(persen*100).toFixed(2)}%`;
    } else {
      ket = `Realisasi sudah sesuai target bulan ${namaBulan}, target = ${(targetPersen*100).toFixed(2)}%`;
    }

    if (bulanIni === 12 && persen < 1) {
      ket += `. Belum terealisasi sebesar ${((1 - persen)*100).toFixed(2)}%`;
    }
    return ket;
  }

  // Fungsi tulis tabel dengan total + pewarnaan
  function tulisTabel(title, dataObj, bgColor) {
    ldsSheet.getRange(rowPointer, 1).setValue(title).setFontWeight("bold");
    rowPointer++;
    const header = ["Nama", "Pagu (Rp)", "Blokir (Rp)", "Realisasi (Rp)", "Persentase", "Sisa Anggaran (Rp)", "Keterangan"];
    ldsSheet.getRange(rowPointer, 1, 1, header.length).setValues([header]).setFontWeight("bold").setBackground(bgColor);
    rowPointer++;

    let totalPagu = 0, totalBlokir = 0, totalRealisasi = 0, totalSisa = 0;

    Object.keys(dataObj).forEach(key => {
      const { pagu, blokir, realisasi, sisa } = dataObj[key];
      const dasarPagu = pagu - blokir;
      const persentase = dasarPagu > 0 ? realisasi / dasarPagu : 0;

      const keterangan = buatKeterangan(realisasi, pagu, blokir);
      ldsSheet.getRange(rowPointer, 1, 1, header.length).setValues([[ 
        key,
        Math.round(pagu / 1000) * 1000,
        Math.round(blokir / 1000) * 1000,
        Math.round(realisasi / 1000) * 1000,
        persentase,
        Math.round(sisa / 1000) * 1000,
        keterangan
      ]]);

      // pewarnaan berdasarkan kondisi
      const ketCell = ldsSheet.getRange(rowPointer, 7);
      const persenCell = ldsSheet.getRange(rowPointer, 5);
      if (persentase >= targetPersen) {
        ketCell.setBackground("#C6EFCE"); // hijau muda
        persenCell.setBackground("#C6EFCE");
      } else {
        ketCell.setBackground("#FFC7CE"); // merah muda
        persenCell.setBackground("#FFC7CE");
      }

      totalPagu += pagu;
      totalBlokir += blokir;
      totalRealisasi += realisasi;
      totalSisa += sisa;
      rowPointer++;
    });

    const dasarTotal = totalPagu - totalBlokir;
    const totalPersen = dasarTotal > 0 ? totalRealisasi / dasarTotal : 0;
    const totalKet = buatKeterangan(totalRealisasi, totalPagu, totalBlokir);

    ldsSheet.getRange(rowPointer, 1, 1, header.length)
      .setValues([["TOTAL",
        Math.round(totalPagu / 1000) * 1000,
        Math.round(totalBlokir / 1000) * 1000,
        Math.round(totalRealisasi / 1000) * 1000,
        totalPersen,
        Math.round(totalSisa / 1000) * 1000,
        totalKet
      ]])
      .setFontWeight("bold").setBackground("#ffe599");
    rowPointer += 2;
  }

  let rowPointer = 1;

  // --- Tabel 1: Per Kegiatan
  const aggKegiatan = aggregate(rows, r => r[colKegiatan]);
  tulisTabel("Tabel 1 - Laporan Daya Serap Per Kegiatan", aggKegiatan, "#d9ead3");

  // --- Tabel 2: Per Rincian Output
  const aggRincian = aggregate(rows, r => r[colRincian]);
  tulisTabel("Tabel 2 - Laporan Daya Serap Per Rincian Output", aggRincian, "#c9daf8");

  // --- Tabel 3: Per PIC
  const dataBahan = bahanSheet.getDataRange().getValues();
  const mapKegiatanPIC = {};
  dataBahan.forEach(r => {
    const kode = String(r[0] || "").trim();
    const pic = r[14]; // kolom O
    if (/^\d{4}$/.test(kode)) {
      mapKegiatanPIC[kode] = pic;
    }
  });

  const aggPIC = {};
  rows.forEach(r => {
    const keg = r[colKegiatan];
    const pic = mapKegiatanPIC[keg] || "Tidak ada PIC";
    let pagu = (Number(r[colVol]) || 0) * (Number(r[colHarga]) || 0);
    const blokir = Number(r[colBlokir]) || 0;
    const sisa = Number(r[colSisa]) || 0;
    const realisasi = pagu - sisa - blokir;

    if (!aggPIC[pic]) {
      aggPIC[pic] = { pagu: 0, blokir: 0, realisasi: 0, sisa: 0 };
    }
    aggPIC[pic].pagu += pagu;
    aggPIC[pic].blokir += blokir;
    aggPIC[pic].realisasi += realisasi;
    aggPIC[pic].sisa += sisa;
  });

  tulisTabel("Tabel 3 - Laporan Daya Serap Per PIC/PJ Kegiatan", aggPIC, "#f4cccc");

  // Formatting angka
  const lastRow = ldsSheet.getLastRow();
  if (lastRow > 2) {
    ldsSheet.getRange(3, 2, lastRow - 2, 1).setNumberFormat("#,##0"); // Pagu
    ldsSheet.getRange(3, 3, lastRow - 2, 1).setNumberFormat("#,##0"); // Blokir
    ldsSheet.getRange(3, 4, lastRow - 2, 1).setNumberFormat("#,##0"); // Realisasi
    ldsSheet.getRange(3, 5, lastRow - 2, 1).setNumberFormat("0.00%"); // Persentase
    ldsSheet.getRange(3, 6, lastRow - 2, 1).setNumberFormat("#,##0"); // Sisa
  }

  ldsSheet.autoResizeColumns(1, 7);
  SpreadsheetApp.flush();

  Logger.log("✅ Template-web & LDS berhasil dibuat!");
}
