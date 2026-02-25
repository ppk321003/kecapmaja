# 📢 Sistem Notifikasi Kebijakan - Setup & Deployment

## Ringkasan
- **Function**: `send-kebijakan-notifications`
- **Jadwal**: Tanggal 16 setiap bulan, jam 08:00 WIB
- **Penerima**: ✅ **SEMUA karyawan aktif** (berbeda dari tanggal 1 yang hanya naik pangkat)
- **Konten**: Pengumuman Pakaian Dinas Korpri untuk tanggal 17
- **Fitur Khusus**: Cek hari libur - jika tanggal 17 adalah hari libur/akhir pekan, notifikasi TIDAK dikirim

---

## Status Deployment

| Komponen | Status | Catatan |
|----------|--------|---------|
| Function Code | ✅ Deployed | `send-kebijakan-notifications/index.ts` |
| Config | ✅ Updated | `supabase/config.toml` |
| Fonnte Integration | ✅ Ready | Menggunakan device rotation (MAJA-1,2,3,4) |
| Scheduling | ⏳ **TODO** | Harus setup di Supabase Dashboard |

---

## 🔧 Setup Scheduling di Supabase Dashboard

### Step 1: Buka Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select project: **SIMAJA** (yudlciokearepqzvgzxx)
3. Navigate to: **Functions** → **send-kebijakan-notifications**

### Step 2: Configure Cron Schedule
1. Click **Activate Cron Trigger**
2. Set schedule expression: **`0 8 16 * *`**
   - `0` = Menit 0
   - `8` = Jam 8 (UTC) → 15:00 WIB (UTC+7)
   - `16` = Tanggal 16
   - `*` = Setiap bulan
   - `*` = Setiap hari (akan dipilter ke tanggal 16)

### Step 3: Save & Verify
- Click **Save**
- You should see: "Cron trigger enabled"
- Status: `Active`

---

## 📋 Kondisi Pengiriman

### Kriteria Penerima
✅ Semua karyawan dengan:
- NIP (column B)
- Nama (column C)
- Nomor WhatsApp (column I - `no_hp`)
- Status: Aktif

### Logika Hari Libur
```
Jika tanggal 17 = hari libur ATAU akhir pekan (Sabtu/Minggu)
  → Notifikasi TIDAK dikirim
  → Status: "skipped" dengan reason "Hari libur/akhir pekan"
  
Jika tanggal 17 = hari kerja
  → Notifikasi dikirim ke semua karyawan
```

### Daftar Hari Libur (Hard-coded di function)
- 1 Januari (Tahun Baru)
- 14 Februari (Isra & Mi'raj)
- 25-29 Maret (Lebaran)
- 3 April (Awal Ramadhan)
- 10 April (Jumat Agung)
- 13 April (Nyepi)
- 1 Mei (Hari Buruh)
- 14 Mei (Kenaikan Isa)
- 16 Mei (Papua Day)
- 1 Juni (Pancasila)
- 24 Juni (Hari Raya Haji)
- 25-26 Juni (Cuti Bersama)
- 14 Juli (Tahun Baru Islam)
- 17 Agustus (Kemerdekaan)
- 25-26 Desember (Natal & Cuti Bersama)

---

## 📤 Konten Pesan

### Template Pesan
```
Halo [Nama Karyawan],

📢 *Pengumuman Kebijakan - Hari Bhakti Korps Pegawai Negeri Sipil*

Sehubungan dengan Hari Bhakti Korps Pegawai Negeri Sipil, kami menginformasikan bahwa pada tanggal *17 Februari 2026* (Kamis) seluruh pegawai diwajibkan memakai **Pakaian Dinas Korpri**.

Pakaian Dinas Korpri adalah simbol kebanggaan kami sebagai PNS. Mari kita tunjukkan dedikasi dan profesionalisme dengan memakai pakaian dinas dengan rapi dan sesuai ketentuan.

Terima kasih atas perhatian dan dukungannya.

Salam *Kecap Maja.*
_Kerja Efisien, Cepat, Akurat, Profesional_
_Maju Aman Jeung Amanah_
```

### Personalisasi
- `[Nama Karyawan]` diganti dengan nama individual
- Selalu dikirim ke nomor WhatsApp dari column I (no_hp)

---

## 🧪 Testing

### Test Manual di Dashboard

1. **Method**: POST
2. **URL**: `https://yudlciokearepqzvgzxx.supabase.co/functions/v1/send-kebijakan-notifications`
3. **Body**: `{}` (kosong)
4. **Expected Response**:

**Skenario 1: Tanggal 17 adalah hari kerja**
```json
{
  "status": "success",
  "sent": 250,
  "failed": 2,
  "total": 252,
  "results": [
    {
      "nip": "123456",
      "nama": "Ade Yono",
      "status": "sent"
    },
    ...
  ]
}
```

**Skenario 2: Tanggal 17 adalah hari libur**
```json
{
  "status": "skipped",
  "reason": "Tanggal 17 adalah hari libur atau akhir pekan",
  "sent": 0
}
```

### Test via CLI
```bash
# Set token
$env:SUPABASE_ACCESS_TOKEN = "sbp_4c790aa51433ea541bfa06f341bb465aee6404fb"

# Invoke function
npx supabase functions invoke send-kebijakan-notifications \
  --project-ref yudlciokearepqzvgzxx
```

---

## 🔍 Monitoring

### Check Logs
1. Go to **Functions** → **send-kebijakan-notifications** → **Logs**
2. Look for entries like:
   - `[Kebijakan Notifications] Starting execution...`
   - `[Holiday Check] Tanggal 17 adalah hari kerja`
   - `[Kebijakan Notifications] Complete. Sent: X/Y`

### Expected Log Timeline
- **08:00 WIB** (01:00 UTC): Function trigger
- **~5-10 menit**: Processing 250+ employees dengan rate limiting 15 per jam
- **Success**: "Sent: X / Total: Y"

---

## 📊 Comparison: Tanggal 1 vs Tanggal 16

| Aspek | Tanggal 1 (Karir) | Tanggal 16 (Kebijakan) |
|-------|------------------|----------------------|
| **Function** | `send-karir-notifications` | `send-kebijakan-notifications` |
| **Penerima** | Hanya yang naik pangkat | **Semua karyawan aktif** |
| **Kriteria** | AK ≥ 60 (Keahlian/Keterampilan) atau AK ≥ 40 (Reguler) | - |
| **Cek Hari Libur** | Tidak | ✅ **Ya (cek tanggal 17)** |
| **Jam Kirim** | 08:00 WIB | 08:00 WIB |
| **Konten** | Notifikasi Kenaikan Karir | Pengumuman Kebijakan |

---

## ⚙️ Setup Hari Libur Kustom

Jika ada hari libur baru, edit file:
```
supabase/functions/send-kebijakan-notifications/index.ts
```

Cari section `HARI_LIBUR_2026` dan tambah format `YYYY-MM-DD`:
```typescript
const HARI_LIBUR_2026 = [
  "2026-01-01",
  "2026-02-14",
  // ... tambah di sini
  "2026-XX-XX", // Format baru
];
```

Kemudian deploy ulang:
```bash
npx supabase functions deploy send-kebijakan-notifications
```

---

## ✅ Checklist Implementasi

- [x] Function code created (`send-kebijakan-notifications/index.ts`)
- [x] Device rotation logic (Fonnte 5 devices)
- [x] Holiday check (tanggal 17)
- [x] Holiday list 2026 (hard-coded)
- [x] SMS personalization ({nama})
- [x] Config updated (`config.toml`)
- [x] Function deployed to Supabase
- [ ] **TODO**: Set cron schedule di Dashboard (0 8 16 * *)
- [ ] **TODO**: Manual test dari Dashboard
- [ ] **TODO**: Monitor logs pada 16 bulan depan

---

## 🚀 Next Steps

1. **Immediately**: Open Dashboard & activate cron schedule `0 8 16 * *`
2. **Testing**: Manual invoke dari Dashboard untuk verify
3. **Monitoring**: Check logs setelah tanggal 16 bulan depan

---

## Support

**Issues?**
- Check function logs: Dashboard → Functions → send-kebijakan-notifications → Logs
- Verify Fonnte tokens: Dashboard → Settings → Secrets (FONNTE_DEVICE_TOKENS)
- Test connectivity: Manual invoke dari Dashboard
