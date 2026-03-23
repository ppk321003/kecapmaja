# WhatsApp Broadcast Notifications - Summary Perbaikan

## 🎯 Ringkasan Masalah

Dua fitur notifikasi WA yang tidak berjalan:
1. **Karir Notifications** - untuk pegawai yang akan naik pangkat/jabatan
2. **Kebijakan Notifications** - untuk pengumuman kebijakan (Pakaian Dinas Korpri)

---

## 🔴 Root Causes Ditemukan & Diperbaiki

| # | Masalah | Dampak | Solusi | Status |
|---|---------|--------|--------|--------|
| 1 | **Send-karir-notifications** tidak pass `spreadsheetId` ke google-sheets function | Function gagal dengan error "Missing required field: spreadsheetId" | Tambahkan parameter `spreadsheetId` dan `operation: "read"` | ✅ FIXED |
| 2 | **Send-kebijakan-notifications** menggunakan hardcoded spreadsheetId yang salah | Membaca dari sheet yang tidak sesuai | Gunakan spreadsheetId default yang sama dengan Home.tsx: `1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM` | ✅ FIXED |
| 3 | **Tidak ada cron schedule** di supabase/config.toml | Function tidak pernah berjalan otomatis, hanya manual invoke saja | Tambahkan `schedule = "0 1 1 * *"` dan `"0 13 16 * *"` | ✅ FIXED |
| 4 | **Rigid column indexing** - mengasumsikan column tetap | Gagal jika struktur sheet berbeda | Implementasi dynamic header-based mapping | ✅ FIXED |
| 5 | **FONNTE_DEVICE_TOKENS secret tidak dikonfigure** | Devices tidak ter-inisialisasi | Setup di Supabase Dashboard Secrets | ⏳ TODO |

---

## 🛠️ File yang Sudah Diperbaiki

### 1. `supabase/functions/send-karir-notifications/index.ts`

**Perubahan**:
```typescript
// BEFORE - Tidak valid, missing spreadsheetId
const { data, error } = await supabase.functions.invoke('google-sheets', {
  body: {
    action: 'fetch',
    sheet: 'MASTER.ORGANIK'
  }
});

// AFTER - Dengan spreadsheetId dan dynamic column mapping
const DEFAULT_ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const { data, error } = await supabase.functions.invoke('google-sheets', {
  body: {
    operation: 'read',
    spreadsheetId: DEFAULT_ORGANIK_SHEET_ID,
    range: 'MASTER.ORGANIK'
  }
});

// Dynamic header-based column mapping
const headerMap: Record<string, number> = {};
headerRow.forEach((header: any, idx: number) => {
  if (header) {
    headerMap[String(header).toUpperCase().trim()] = idx;
  }
});
```

**Impact**: Function sekarang bisa membaca data dengan benar

---

### 2. `supabase/functions/send-kebijakan-notifications/index.ts`

**Perubahan**:
```typescript
// BEFORE - Hardcoded spreadsheetId yang salah
const { data: sheetsData, error: sheetsError } = await supabase.functions.invoke("google-sheets", {
  body: {
    operation: "read",
    spreadsheetId: "1rw_Ly0rI2RXCf4rPfEn1ryP7fV5YZqKvjhH6J_KYtKk", // WRONG
    range: "MASTER.ORGANIK"
  },
});

// AFTER - Menggunakan spreadsheetId yang benar (same as Home.tsx)
const DEFAULT_ORGANIK_SHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";
const { data: sheetsData, error: sheetsError } = await supabase.functions.invoke("google-sheets", {
  body: {
    operation: "read",
    spreadsheetId: DEFAULT_ORGANIK_SHEET_ID,
    range: "MASTER.ORGANIK"
  },
});

// Juga updated dengan dynamic header mapping seperti karir function
```

**Impact**: Function sekarang membaca dari sheet yang benar

---

### 3. `supabase/config.toml`

**Perubahan**:
```toml
# BEFORE - Tidak ada schedule
[functions.send-karir-notifications]
verify_jwt = false

[functions.send-kebijakan-notifications]
verify_jwt = false

# AFTER - Dengan cron schedules
[functions.send-karir-notifications]
verify_jwt = false
schedule = "0 1 1 * *"  # 1st of month at 01:00 UTC (08:00 WIB)

[functions.send-kebijakan-notifications]
verify_jwt = false
schedule = "0 13 16 * *"  # 16th of month at 13:00 UTC (20:00 WIB)
```

**Impact**: Functions sekarang akan berjalan otomatis sesuai jadwal

---

## 📋 Langkah-Langkah Deployment

### Step 1: Push Code Changes
```bash
git add .
git commit -m "Fix: Perbaiki WA broadcast notifications - add spreadsheetId, cron schedules, dynamic column mapping"
git push
```

### Step 2: Deploy Edge Functions
```bash
supabase functions deploy send-karir-notifications
supabase functions deploy send-kebijakan-notifications
supabase functions list  # Verify deployment
```

### Step 3: Configure Fonnte Secrets ⚠️ PENTING

1. Buka: https://supabase.com/dashboard → Project → Settings → Edge Functions → Secrets
2. Click **New Secret**
3. Name: `FONNTE_DEVICE_TOKENS`
4. Value: Paste JSON berikut dengan token devices Fonnte Anda:

```json
[
  {
    "name": "KECAP MAJA-1",
    "token": "GcrkkR51srYTi4KHanu5",
    "active": true
  },
  {
    "name": "KECAP MAJA-2",
    "token": "ewRtNykz8LxzMaiGoKRs",
    "active": true
  },
  {
    "name": "KECAP MAJA-3",
    "token": "atFkGTx9WDdhZkKNdEox",
    "active": true
  },
  {
    "name": "KECAP MAJA-4",
    "token": "DE3t6QzC88eLpqz1Tw1y",
    "active": true
  }
]
```

### Step 4: Verify di Dashboard

Cek: Supabase Dashboard → Functions

**send-karir-notifications**:
- [ ] Status: **Active** ✅
- [ ] Schedule: `0 1 1 * *` (1st of month, 08:00 WIB)

**send-kebijakan-notifications**:
- [ ] Status: **Active** ✅  
- [ ] Schedule: `0 13 16 * *` (16th of month, 20:00 WIB)

---

## 🧪 Quick Test

### Test di Browser Console:

```javascript
// Test Karir Notifications
const result1 = await supabase.functions.invoke('send-karir-notifications');
console.log('Karir:', result1.data);

// Test Kebijakan Notifications
const result2 = await supabase.functions.invoke('send-kebijakan-notifications');
console.log('Kebijakan:', result2.data);
```

**Expected**: Messages dikirim ke WA pegawai dalam 10 detik

---

## 📅 Jadwal Otomatis (Setelah Fix)

| Fitur | Jadwal | Waktu | Penerima |
|-------|--------|-------|---------|
| **Karir Notifications** | 1st setiap bulan | 08:00 WIB | Pegawai eligible untuk naik jabatan/pangkat |
| **Kebijakan Notifications** | 16th setiap bulan | 20:00 WIB* | Semua pegawai aktif |

*Jika 17th adalah hari kerja (tidak libur/weekend), akan mengirim pengumuman tadinya 17th

---

## ✅ Hasil Akhir

Setelah semua langkah di atas:

✅ **Karir Notifications** akan:
- Berjalan otomatis setiap 1st of month jam 08:00 WIB
- Mengirim pesan WA ke pegawai yang eligible untuk naik
- Tampilkan estimasi waktu naik karir

✅ **Kebijakan Notifications** akan:
- Berjalan otomatis setiap 16th of month jam 20:00 WIB
- Mengirim pengumuman kebijakan (Pakaian Dinas Korpri) hari berikutnya (17th)
- Support birthday detection & greeting otomatis
- Skip jika 17th adalah hari libur/weekend

---

## 📞 Troubleshooting

**Masalah**: Notifikasi tidak terkirim
- Cek: Supabase Dashboard → Functions → Logs
- Verifikasi: FONNTE_DEVICE_TOKENS secret sudah di-set
- Verifikasi: MASTER.ORGANIK sheet ada dan punya data pegawai dengan nomor HP

**Masalah**: "No Fonnte devices available"
- Fix: Pastikan FONNTE_DEVICE_TOKENS sudah dikonfigure di Secrets

**Masalah**: "Missing required field: spreadsheetId"
- Fix: Re-deploy functions: `supabase functions deploy send-karir-notifications`

---

**Dokumentasi lengkap**: Lihat `docs/BROADCAST_WA_FIX_DEPLOYMENT.md` untuk step-by-step deployment guide dengan troubleshooting & testing
