# Setup FONNTE_DEVICE_TOKENS di Supabase

## 🎯 Tujuan
Mengkonfigurasi Fonnte device tokens di Supabase secrets sehingga edge functions bisa mengirim WhatsApp.

---

## 📋 Device Tokens yang Tersedia

```json
[
    {
      "name": "KECAP MAJA-1",
      "token": "GcrkkR51srYTi4KHanu5",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-2",
      "token": "ewRtNykz8LxzMaiGoKRs",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-3",
      "token": "atFkGTx9WDdhZkKNdEox",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-4",
      "token": "DE3t6QzC88eLpqz1Tw1y",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-5",
      "token": "Cy5Fwj5gbscfi8B97RDc",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    }
]
```

---

## 🔧 Cara Setup (2 Pilihan)

### ✅ OPTION 1: Via Supabase Dashboard (RECOMMENDED - Paling Mudah)

**Step 1: Login ke Supabase Dashboard**
1. Buka: https://app.supabase.com
2. Login dengan akun Anda
3. Pilih project: **kecapmaja** (atau sesuai nama project Anda)
4. Di sidebar, klik **Settings**

**Step 2: Akses Project Settings**
1. Klik **Settings** → **Project Settings** (atau langsung ke URL bawah)
2. Di sidebar, pilih tab **Secrets** (jika ada) atau **Environment Variables**

**Step 3: Tambah Secret Baru**
1. Klik tombol **New Secret** atau **+ Add Secret**
2. Isi field:
   - **Name**: `FONNTE_DEVICE_TOKENS`
   - **Value**: Paste seluruh JSON array devices di bawah

**Step 4: Paste Device Tokens JSON**
```json
[
    {
      "name": "KECAP MAJA-1",
      "token": "GcrkkR51srYTi4KHanu5",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-2",
      "token": "ewRtNykz8LxzMaiGoKRs",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-3",
      "token": "atFkGTx9WDdhZkKNdEox",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-4",
      "token": "DE3t6QzC88eLpqz1Tw1y",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    },
    {
      "name": "KECAP MAJA-5",
      "token": "Cy5Fwj5gbscfi8B97RDc",
      "active": true,
      "stats": { "sent": 0, "failed": 0, "lastUsed": null }
    }
]
```

**Step 5: Save**
- Klik **Save** atau **Create**
- Tunggu ±5-10 detik untuk propagate

---

### ✅ OPTION 2: Via Supabase CLI (Alternative)

**Jika Anda preferensial command line:**

```bash
# Login ke Supabase CLI
supabase login

# Link ke project
supabase link --project-ref yudlciokearepqzvgzxx

# Set secret
supabase secrets set FONNTE_DEVICE_TOKENS='[{
  "name": "KECAP MAJA-1",
  "token": "GcrkkR51srYTi4KHanu5",
  "active": true,
  "stats": { "sent": 0, "failed": 0, "lastUsed": null }
},{
  "name": "KECAP MAJA-2",
  "token": "ewRtNykz8LxzMaiGoKRs",
  "active": true,
  "stats": { "sent": 0, "failed": 0, "lastUsed": null }
},{
  "name": "KECAP MAJA-3",
  "token": "atFkGTx9WDdhZkKNdEox",
  "active": true,
  "stats": { "sent": 0, "failed": 0, "lastUsed": null }
},{
  "name": "KECAP MAJA-4",
  "token": "DE3t6QzC88eLpqz1Tw1y",
  "active": true,
  "stats": { "sent": 0, "failed": 0, "lastUsed": null }
},{
  "name": "KECAP MAJA-5",
  "token": "Cy5Fwj5gbscfi8B97RDc",
  "active": true,
  "stats": { "sent": 0, "failed": 0, "lastUsed": null }
}]'

# Verify
supabase secrets list
```

---

## ✅ Verifikasi Setup

Setelah setup, verify bahwa secret sudah tersimpan:

**Di Dashboard:**
1. Settings → Secrets
2. Pastikan `FONNTE_DEVICE_TOKENS` ada di list

**Via CLI:**
```bash
supabase secrets list
```

Expected output:
```
FONNTE_DEVICE_TOKENS: [REDACTED]
```

---

## 🚀 Setelah Setup Selesai

### Step 1: Deploy Edge Functions
```bash
supabase functions deploy send-kebijakan-notifications
supabase functions deploy send-karir-notifications
```

### Step 2: Test via Browser Console
1. Buka app → F12 (Developer Tools)
2. Pilih tab **Console**
3. Copy-paste kode test:

```javascript
// Test Kebijakan
await supabase.functions.invoke('send-kebijakan-notifications', {
  body: {
    testMode: true,
    testPhase: 'kebijakan',
    testRecipient: {
      nip: '19710322199102 1001',
      nama: 'Aep Saepudin, S.Si., M.AP.',
      no_hp: '628123456789',  // Ganti dengan nomor yang benar
      jabatan: 'Statistisi Ahli Pertama',
      satker: 'BPS Pusat'
    }
  }
});
```

### Step 3: Kirim Test via UI
1. Buka app → Layanan Karir → Broadcast WA Manual
2. Klik tombol **Test Kebijakan** atau **Test Pakaian Dinas**
3. Pilih 1 karyawan
4. Klik **Kirim Test**
5. Check WhatsApp dalam 10 detik

---

## 🔍 Troubleshooting

**Masalah: "No Fonnte devices available"**
- Pastikan `FONNTE_DEVICE_TOKENS` sudah diset dengan benar
- Verifikasi JSON format valid (gunakan https://jsonlint.com)
- Tunggu 5-10 menit untuk propagate

**Masalah: "No active session"**
- Pastikan sudah login di aplikasi
- Coba refresh browser (Ctrl+F5)
- Clear cookies dan login ulang

**Masalah: "Failed to send via Fonnte"**
- Check nomor HP format: harus pakai `62` bukan `0` (contoh: 628123456789)
- Verifikasi token device masih aktif di Fonnte dashboard
- Cek rate limit (max 15 per hour per device)

---

## 📌 Notes

- **5 devices** tersedia untuk rotation
- **Rate limit**: 15 messages/hour per device (total 75/jam)
- **Device rotation** otomatis untuk balance usage
- **Cooldown**: 15 detik antar request pada device yang sama
- **Docs**: https://fonnte.com/api/docs

