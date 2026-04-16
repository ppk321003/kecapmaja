# 📱 SETUP MANAJEMEN PULSA - Google Sheets Version

**Version**: 1.0  
**Created**: April 16, 2026  
**Type**: Google Apps Script  

---

## 📌 Overview

Sistem manajemen pembelian pulsa yang menyimpan data **langsung ke Google Sheets** (seperti skrip KAK sebelumnya).

### ✨ Fitur

✅ Input data pulsa bulanan  
✅ **Validasi otomatis**: 1 petugas = 1 kegiatan per bulan  
✅ Status tracking: draft → pending → approved/rejected  
✅ Auto-generate laporan bulanan  
✅ Audit duplikasi kegiatan  
✅ Export ke Excel  
✅ Custom menu di Sheets  

---

## 🚀 Setup (5 Menit)

### **Langkah 1: Siapkan Google Sheets Baru**

1. Buka [Google Sheets](https://sheets.google.com)
2. Create spreadsheet baru: **"Manajemen Pulsa BPS 3210"**
3. Copy link spreadsheet untuk langkah berikutnya

### **Langkah 2: Add Google Apps Script**

1. Di spreadsheet, klik **Tools** → **Script Editor**
2. Delete isi default
3. Copy-paste isi file: `MANAJEMEN_PULSA_GOOGLE_APPS_SCRIPT.gs`
4. **Save** (Ctrl+S)
5. Beri nama project: **"Manajemen Pulsa"**

### **Langkah 3: Authorize Script**

1. Klik **Run** button
2. Select function **`initializePulsaSheets`**
3. Click **Run**
4. Approve permissions (Google akan minta akses)
5. Selesai! 

### **Langkah 4: Setup Sheets**

Kembali ke spreadsheet Anda. Sekarang harus ada menu baru: **"📱 PULSA MANAGEMENT"**

1. Klik menu **"📱 PULSA MANAGEMENT"**
2. Klik **"🔧 Initialize Sheets"**
3. System akan auto-create 5 sheets:
   - ✅ PULSA-BULANAN (data utama)
   - ✅ MASTER-PETUGAS (reference)
   - ✅ MASTER-KEGIATAN (reference)
   - ✅ LAPORAN-PULSA (auto-report)
   - ✅ AUDIT-DUPLIKASI (duplikasi alerts)

---

## 📊 Sheet Structure

### **PULSA-BULANAN** (Main Data)

```
No | Bulan | Tahun | Nama Petugas | NIP | Kegiatan | Organik | Mitra | Nominal | Status | Keterangan | Tanggal Input | Disetujui Oleh | Tanggal Approval
```

**Contoh data:**
```
1 | 4 | 2026 | Budi Santoso | 19800101 | Pendataan KSA | Fungsi Sosial | | 100000 | approved | | 16-Apr-2026 | Approver Name | 16-Apr-2026
2 | 4 | 2026 | Siti Nurhaliza | 19850202 | Pelatihan | Fungsi Neraca | | 150000 | draft | | 16-Apr-2026 | |
```

**Status values:**
- `draft` - Belum diajukan
- `pending` - Menunggu approval
- `approved` - Sudah disetujui
- `rejected` - Ditolak
- `completed` - Final

---

### **MASTER-PETUGAS** (Reference data)

```
No | ID Petugas | Nama | NIP | Organik | Mitra | No HP | Status | Catatan
```

**Contoh:**
```
1 | P001 | Budi Santoso | 19800101 | Fungsi Sosial | | 08123456789 | Aktif | Petugas tetap
2 | P002 | Siti Nurhaliza | 19850202 | Fungsi Neraca | PT ABC | 08198765432 | Aktif | Mitra
```

---

### **MASTER-KEGIATAN** (Reference data)

```
No | Kode | Nama Kegiatan | Nominal Default | Kategori | Aktif | Catatan
```

**Contoh:**
```
1 | KSA-001 | Pendataan Lapangan KSA | 100000 | Survey | true | Kegiatan rutin
2 | TRAIN-001 | Pelatihan Petugas Potensi Desa | 150000 | Training | true | Sesuai SOP
3 | COORD-001 | Koordinasi Tim Statistik | 50000 | Meeting | true | Per bulan
```

---

### **LAPORAN-PULSA** (Auto-generated)

```
Bulan | Tahun | Total Petugas | Total Nominal | Per Kegiatan | Per Organik | Total Approved | Total Pending | Total Draft
```

**Auto-update setiap kali ada data baru**

---

### **AUDIT-DUPLIKASI** (Auto-generated)

```
Tanggal Check | Bulan | Tahun | Nama Petugas | Jumlah Kegiatan | Daftar Kegiatan | Status | Aksi Diperlukan
```

**Alert jika:** Satu petugas dapat pulsa dari 2+ kegiatan dalam bulan yang sama

---

## 🎯 Cara Menggunakan

### **Scenario 1: Input Data Pulsa Baru**

#### Manual Input (Di Sheets langsung):

1. Buka sheet **PULSA-BULANAN**
2. Klik baris kosong berikutnya
3. Isi kolom:
   - Bulan: 4
   - Tahun: 2026
   - Nama Petugas: "Budi Santoso"
   - Kegiatan: "Pendataan KSA"
   - Organik: "Fungsi Sosial"
   - Nominal: 100000
   - Status: "draft"

#### Input via Google Apps Script Function:

```javascript
// Di Script Editor, jalankan function ini:
tambahPulsaBulanan(
  4,                          // bulan
  2026,                       // tahun
  "Budi Santoso",            // nama petugas
  "19800101",                // nip
  "Pendataan KSA",           // kegiatan
  "Fungsi Sosial",           // organik
  "",                        // mitra (optional)
  100000,                    // nominal
  "Data bulan April"         // keterangan
);
```

### **Scenario 2: Validasi Duplikasi**

1. Buka menu **"📱 PULSA MANAGEMENT"**
2. Click **"✅ Check Duplikasi"**
3. System akan scan semua data
4. Jika ada duplikasi → list muncul di sheet **AUDIT-DUPLIKASI**

**Contoh alert:**
```
⚠️ Budi Santoso dapat pulsa untuk:
   - Pendataan KSA (Rp 100.000)
   - Pelatihan (Rp 150.000)
   Bulan: April 2026
   Status: DUPLIKASI ⚠️
```

### **Scenario 3: Submit Untuk Approval**

```javascript
// Submit row 2 untuk approval
submitPulsaUntukApproval(2);
// Status berubah dari "draft" → "pending"
```

### **Scenario 4: Approve Data**

```javascript
// PPK approve data
approvePulsa(2, "Andries Kurniawan, S.E., M.Sc.");
// Status berubah dari "pending" → "approved"
// Tanggal approval + approver name otomatis terisi
```

### **Scenario 5: Generate Laporan**

1. Buka menu **"📱 PULSA MANAGEMENT"**
2. Click **"📊 Update Laporan"**
3. Isi bulan & tahun
4. Click "Update Laporan"
5. Sheet **LAPORAN-PULSA** auto-updated dengan:
   - Total petugas
   - Total nominal
   - Breakdown per kegiatan
   - Breakdown per organik  
   - Status count (approved, pending, draft)

---

## 🔧 Testing Checklist

- [ ] Initialize sheets sudah dilakukan
- [ ] 5 sheet sudah terbuat (PULSA-BULANAN, MASTER-*, LAPORAN, AUDIT)
- [ ] Menu "📱 PULSA MANAGEMENT" muncul
- [ ] Bisa input data ke PULSA-BULANAN
- [ ] Check duplikasi berfungsi
- [ ] Submit & approve workflow bekerja
- [ ] Laporan auto-generate saat ada data baru
- [ ] Export ke Excel berfungsi

---

## 💾 Integration dengan Aplikasi Web (Optional)

Jika ingin data dari aplikasi web Kecap-Maja auto-sync ke Sheets:

### **Opsi 1: Webhook (Recommended)**

```typescript
// Di Kecap-Maja web app, saat save pulsa:
const sheetIntegration = async (pulsaData) => {
  // Send ke Google Sheets via Apps Script Web App
  const scriptUrl = 'https://script.google.com/macros/d/{SCRIPT_ID}/usercache/...';
  
  return fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify(pulsaData)
  });
};
```

### **Opsi 2: Manual Export**

Jika mau simple, cukup export dari web app ke spreadsheet ini secara berkala.

---

## 📝 Reference

| Kebutuhan | Fungsi |
|-----------|--------|
| Input data baru | `tambahPulsaBulanan()` |
| Submit approval | `submitPulsaUntukApproval()` |
| Approve data | `approvePulsa()` |
| Reject data | `rejectPulsa()` |
| Cek duplikasi | `checkDuplikasiKegiatan()` |
| Update laporan | `updateLaporanPulsa()` |
| Export | `exportLaporanToExcel()` |

---

## ⚠️ Penting

1. **First run**: Harus jalankan `initializePulsaSheets()` untuk setup
2. **Authorization**: Script perlu akses folder & email Anda
3. **Master data**: Isi MASTER-PETUGAS & MASTER-KEGIATAN terlebih dahulu
4. **Backup**: Backup spreadsheet sebelum production use
5. **Validasi**: Duplikasi hanya check data yang status "approved" atau "completed"

---

## 🎯 Next Steps

1. **Create spreadsheet baru**
2. **Add Apps Script** dari file `MANAJEMEN_PULSA_GOOGLE_APPS_SCRIPT.gs`
3. **Run `initializePulsaSheets()`**
4. **Setup master data** (MASTER-PETUGAS & MASTER-KEGIATAN)
5. **Start input data pulsa**
6. **Test validation & workflow**

---

**Selamat menggunakan! 🎉**

Jika ada error, cek:
- Logger di script editor (Ctrl+Enter)
- Data format (tanggal, angka)
- Sheet names match exactly
- Authorization permissions

---

**Pertanyaan?** Cek file `TIPS_BEST_PRACTICES_PULSA.md`
