# 🚀 DEPLOY & TEST Broadcast WA Otomatis

## ✅ Checklist Sebelum Deploy

- [ ] FONNTE_DEVICE_TOKENS sudah di-setup di Supabase Secrets
- [ ] Frontend fix sudah di-edit (ManualWABroadcast.tsx)
- [ ] Supabase CLI sudah installed
- [ ] Sudah login ke Supabase CLI

---

## 📦 Deployment Steps

### Step 1: Verify Supabase Project

```bash
# Di terminal, arahkan ke workspace folder
cd c:\Users\asus-\Pictures\kecapmaja

# Check linked project
supabase projects list
```

Expected output:
```
Project ID: yudlciokearepqzvgzxx (kecapmaja)
```

### Step 2: Deploy Edge Functions

```bash
# Deploy send-kebijakan-notifications function
supabase functions deploy send-kebijakan-notifications

# Deploy send-karir-notifications function
supabase functions deploy send-karir-notifications

# Deploy send-manual-wa-notifications function
supabase functions deploy send-manual-wa-notifications
```

**Expected Output:**
```
✓ Function send-kebijakan-notifications deployed successfully
✓ Function send-karir-notifications deployed successfully
✓ Function send-manual-wa-notifications deployed successfully
```

### Step 3: Verify Secrets di Deployed Functions

```bash
# Check environment variables
supabase secrets list
```

Expected: `FONNTE_DEVICE_TOKENS: [REDACTED]`

---

## 🧪 Testing: 3 Cara

### ✅ Test 1: Via Browser Console (Paling Mudah)

**Langkah:**

1. **Open aplikasi di browser**
   - Development: `http://localhost:5173`
   - Production: `https://kecapmaja.app`

2. **Tekan F12** → Tabs **Console**

3. **Copy test code di bawah** dan paste di console:

```javascript
// Test Kebijakan Notifications
const testKebijakan = async () => {
  const { data, error } = await supabase.functions.invoke('send-kebijakan-notifications', {
    body: {
      testMode: true,
      testPhase: 'kebijakan',
      testRecipient: {
        nip: '19710322199102 1 001', // Ganti dengan NIP yang valid
        nama: 'Nama Karyawan',
        no_hp: '628123456789',        // Ganti dengan nomor valid
        jabatan: 'Statistisi Ahli Pertama',
        satker: 'BPS Pusat'
      }
    }
  });
  console.log('Response:', data);
  console.log('Error:', error);
  return { data, error };
};

await testKebijakan();
```

**Expected Output (Success):**
```javascript
{
  data: {
    status: "success",
    testMode: true,
    sent: 1,
    recipient: "Nama Karyawan",
    phone: "628123456789",
    device: "KECAP MAJA-1",
    timestamp: "2026-03-23T10:30:00.000Z"
  },
  error: null
}
```

**Apa Artinya:**
- ✅ Pesan berhasil dikirim ke device KECAP MAJA-1
- 📱 Check WhatsApp seharusnya ada message masuk dalam 5-10 detik
- ℹ️ Jika belum ada, check nomor HP format harus `62` bukan `0`

---

### ✅ Test 2: Via UI - Tombol Test (Recommended untuk User)

**Langkah:**

1. **Login ke aplikasi** (pastikan sudah login PPK)
2. **Navigate**: Layanan Karir → Broadcast WA Manual
3. **Lihat section baru**: "🧪 Test Notifikasi"
   ```
   [Test Kebijakan] [Test Pakaian Dinas]
   ```
4. **Klik tombol test** → Pilih 1 karyawan
5. **Klik "Kirim Test"** → Wait 5-10 detik
6. **Check WhatsApp** → Pesan seharusnya masuk

**Troubleshooting Kalau Error:**
- ❌ "Gagal mengirim: No Fonnte devices available"
  - Arti: FONNTE_DEVICE_TOKENS tidak ter-setup
  - Fix: Ulangi Step Setup FONNTE_DEVICE_TOKENS

- ❌ "Gagal mengirim: Failed to send via Fonnte"
  - Arti: Token device sudah reach rate limit atau offline
  - Fix: Tunggu 15 detik atau gunakan device lain

- ❌ "Gagal mengirim: Unknown error"
  - Check nomor HP format (harus 628xxx, bukan 08xxx`)
  - Check function logs (lihat Step Debug di bawah)

---

### ✅ Test 3: Via Supabase Dashboard Function Logs

**Langkah:**

1. **Buka**: https://app.supabase.com → kecapmaja project
2. **Navigate**: Functions → send-kebijakan-notifications
3. **Tab**: Logs
4. **Lakukan test** melalui console atau UI
5. **Monitor logs real-time** untuk see flow

**Logs Pattern (Success):**
```
[Kebijakan Notifications] Starting execution...
Initialized 5 active devices
[Test Mode] Sending test message to: Nama Karyawan
[sendViaFonnte] Sending via KECAP MAJA-1 to 628123456789
[Test Mode] ✅ Message sent to Nama Karyawan
```

---

## 🔍 Debug: Lihat Logs dari CLI

```bash
# Real-time logs untuk send-kebijakan-notifications
supabase functions logs send-kebijakan-notifications --tail

# Lihat 50 logs terakhir
supabase functions logs send-kebijakan-notifications --tail -limit=50

# Filter logs per function
supabase functions logs send-karir-notifications --tail
supabase functions logs send-manual-wa-notifications --tail
```

**Tips:**
- Jika logs tidak muncul, berarti function belum di-call
- Tunggu 2-3 detik setelah invoke untuk logs muncul
- Format: `[Module] Message` (contoh: `[Kebijakan Notifications]`)

---

## 📱 Format Pesan yang Dikirim

### Kebijakan Message
```
Halo [NAMA],

📢 Pengumuman Kebijakan - Hari Bhakti Korps Pegawai Negeri Sipil

Sehubungan dengan Hari Bhakti Korps Pegawai Negeri Sipil, kami menginformasikan bahwa pada tanggal 17 Februari 2026 (Kamis) seluruh pegawai diwajibkan memakai Pakaian Dinas Korpri.

Pakaian Dinas Korpri adalah simbol kebanggaan kami sebagai PNS. Mari kita tunjukkan dedikasi dan profesionalisme dengan memakai pakaian dinas dengan rapi dan sesuai ketentuan.

Terima kasih atas perhatian dan dukungannya.

Salam Kecap Maja.
Kerja Efisien, Cepat, Akurat, Profesional
Maju Aman Jeung Amanah
```

### Karir Message (Contoh)
```
Halo [NAMA],

📢 Notifikasi Peluang Kenaikan Karir

Berdasarkan sistem kurikulum PNS dan data kepegawaian, kami menginformasikan bahwa Anda berkesempatan untuk naik pangkat/jabatan dalam periode mendatang.

[Detail lengkap sesuai kategori: CPNS, Keahlian, Keterampilan, Reguler]

Untuk informasi lebih lanjut silakan hubungi SDMK-ASN.

Salam Kecap Maja.
```

---

## 🔄 Cron Schedule (Otomatis)

Setelah deploy, functions akan jalan otomatis sesuai schedule:

| Function | Schedule | Waktu | Frekuensi |
|----------|----------|-------|-----------|
| **send-karir-notifications** | `0 1 1 * *` UTC | **01:00 UTC** (08:00 WIB) | Setiap tanggal 1 |
| **send-kebijakan-notifications** | `0 13 16 * *` UTC | **13:00 UTC** (20:00 WIB) | Setiap tanggal 16 |

- Karir: Jumat, 1 Maret 2026, 08:00 WIB
- Kebijakan: Senin, 16 Maret 2026, 20:00 WIB

**Check Execution:**
1. Buka Supabase Dashboard → Functions
2. Klik function → Tab **Executions**
3. Lihat history runs (jika Cron active)

---

## ✨ Checklist Setelah Deploy

- [ ] Deploy berhasil tanpa error
- [ ] Test via console successfully sent
- [ ] Test via UI (test kebijakan/pakaian dinas) successfully sent
- [ ] Pesan masuk di WhatsApp
- [ ] Cron schedule aktif (lihat di Dashboard)
- [ ] Logs muncul di supabase functions logs

---

## 🎯 Next Steps

### Jika Test Berhasil:
1. ✅ Broadcast WA otomatis siap production
2. Setup monitor di Supabase untuk track usage
3. Dokumentasi untuk team

### Jika Ada Error:
1. ❌ Check logs di Supabase Dashboard
2. Verify FONNTE_DEVICE_TOKENS format (JSON valid?)
3. Check nomor HP format (62, bukan 0)
4. Check rate limit (max 15 per hour per device)
5. Hubungi support Fonnte jika device token error

---

## 📞 Support Useful Links

- **Fonnte API Docs**: https://fonnte.com/api/docs
- **Supabase Functions**: https://supabase.com/docs/guides/functions
- **Supabase Secrets**: https://supabase.com/docs/guides/functions/secrets

