# Setup Kolom M (Antrian) di Google Sheet e-Tamu

## 📝 Step-by-Step Setup

### Step 1: Buka Google Sheet e-Tamu
- Spreadsheet ID: `1Q9kPlXg18BvAtnbM-cpoQ0xud1zC3rpA6CDa3EZcRGY`
- Sheet: `Sheet1`

### Step 2: Tambahkan Header Kolom M
1. Klik cell **M1**
2. Ketik: **`ANTRIAN`** (atau sesuaikan dengan preference)
3. Press **Enter**

```
Struktur Header:
A          B      C     D       E             F       G         H  I               J      K      L         M
Waktu      Nama   Asal  No.HP  Kepentingan  Tujuan  HP Tujuan  -  Jenis Kelamin  Email  Umur   Pendidikan ANTRIAN
```

### Step 3: Format Kolom M (Optional tapi Recommended)

#### A. Lebar Kolom
- Sesuaikan lebar agar nomor antrian terlihat jelas (~120px)

#### B. Alignment
- Horizontal: Center
- Vertical: Middle

#### C. Font (Optional)
- Monospace font (Courier New) agar lebih rapi
- Size: Normal/11pt

#### D. Background Color (Optional)
- Warna biru muda (#E8F4F8) untuk highlight
- Membedakan dari kolom lain

### Step 4: Data Existing (Jika Ada)
Jika sudah ada data yang ingin di-update dengan nomor antrian:

1. **Opsi A: Manual Update** (Untuk data sedikit)
   - Buka file `src/utils/generateAntrianNumber.ts`
   - Run fungsi `generateAntrianNumber()` dengan parameter data
   - Copy-paste hasilnya ke kolom M

2. **Opsi B: Google Apps Script** (Untuk banyak data)
   ```javascript
   // Template Google Apps Script
   function populateAntrianBackfill() {
     const sheet = SpreadsheetApp.getActiveSheet();
     const lastRow = sheet.getLastRow();
     
     // Kolom mapping
     const ANTRIAN_COL = 13; // M = 13
     const KEPENTINGAN_COL = 5; // E = 5
     const TIMESTAMP_COL = 1; // A = 1
     
     for (let i = 2; i <= lastRow; i++) {
       const kepentingan = sheet.getRange(i, KEPENTINGAN_COL).getValue();
       const timestamp = sheet.getRange(i, TIMESTAMP_COL).getValue();
       
       // Generate nomor antrian sesuai logic
       // ...implement logic dari generateAntrianNumber.ts
       
       // set ke kolom M
       sheet.getRange(i, ANTRIAN_COL).setValue(nomorAntrian);
     }
   }
   ```

### Step 5: Verifikasi Setup
1. Buka form e-Tamu di aplikasi
2. Submit satu kali dengan kategori "Layanan Perpustakaan"
3. Cek sheet → kolom M seharusnya ada nilai `LP-YYMM-001`
4. Submit lagi dengan kategori berbeda → kolom M harus `KS-YYMM-001`

---

## 📊 Contoh Data di Sheet

```
Row  A                B        C        D         E                    F        G        H    I           J          K            L           M
1    Waktu            Nama     Asal     No.HP    Kepentingan          Tujuan   HP Tujuan     JK       Email      Umur         Pendidikan   ANTRIAN
2    10:15, 27/04/26  Budi     BPS JWB  081234  Layanan Perpustakaan  Pak Rudi 081567               Laki-laki   budi@email   25-34 tahun   D4/S1       LP-2604-001
3    10:30, 27/04/26  Andi     OPD      082345  Konsultasi Statistik   Ibu Nia 082678               Laki-laki   andi@email   35-44 tahun   S1          KS-2604-001
4    10:45, 27/04/26  Citra    Swasta   083456  Lainnya - Informasi    Pak Rudi 081567               Perempuan   citra@email   45-54 tahun   S2          L-2604-001
5    11:00, 27/04/26  Doni     BPS JWB  084567  Layanan Perpustakaan  Ibu Nia 082678               Laki-laki   doni@email   55-65 tahun   D1/D2/D3    LP-2604-002
6    11:15, 27/04/26  Eka      OPD      085678  Rekomendasi Statistik Pak Rudi 081567               Perempuan   eka@email    17-25 tahun   S1          RS-2604-001
...
```

---

## 🔄 Kondisi Data

### Skenario 1: Fresh Setup (Data Kosong)
```
State: Kolom M belum ada data
Action: Setup header → sistem siap digunakan
Result: Data baru akan otomatis mendapat nomor antrian
```

### Skenario 2: Migrate Existing Data
```
State: Sudah ada data di row 2-100 tapi M kosong
Action: 
  - Opsi A: Biarkan kosong (hanya data baru yg dapat nomor)
  - Opsi B: Backfill manual/script
Result: Data lama punya nomor, data baru juga punya nomor
```

### Skenario 3: Mid-Month Data
```
State: 27 April 2026 (bulan sudah jalan)
Action: Setup header, mulai submit
Result: 
  - LP-2604-001 (jika belum ada data LP sebelumnya)
  - LP-2604-002 (data kedua LP di bulan ini)
```

---

## ✅ Validation Checklist

- [ ] Header "ANTRIAN" di kolom M1
- [ ] Sheet tab name masih "Sheet1"
- [ ] Spreadsheet ID: `1Q9kPlXg18BvAtnbM-cpoQ0xud1zC3rpA6CDa3EZcRGY`
- [ ] Font/alignment sudah sesuai (optional)
- [ ] Test submit form → nomor antrian ter-generate
- [ ] Nomor antrian format: `KODE-YYMM-NOURUT` ✓
- [ ] Success page menampilkan nomor antrian

---

## 🚀 Go Live Checklist

Sebelum production:

- [ ] Testing dengan semua kategori
- [ ] Test dengan data existing (jika ada)
- [ ] Verify kolom M isi dengan benar
- [ ] Backup sheet (download copy)
- [ ] Komunikasi ke staff: "Ada nomor antrian baru"
- [ ] Monitor 1-2 hari untuk edge cases

---

## 📞 Support

Jika ada masalah:

1. **Nomor tidak muncul**
   - Cek API key Google Sheets
   - Verify sheet ID & range

2. **Format salah**
   - Check `ANTRIAN_KODE` di `generateAntrianNumber.ts`
   - Verify kategori yang dipilih

3. **Duplikat nomor**
   - Clear data kolom M, re-run
   - Check untuk entry dengan format berbeda

---

**Setup Date**: April 27, 2026
**Status**: Ready for Production
