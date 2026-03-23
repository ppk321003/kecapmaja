# 📅 Jadwal Otomatis Pemberitahuan WA

## 🗓️ Jadwal Eksekusi Otomatis

### 1. **Pemberitahuan Kebijakan** 📢
- **Hari**: Setiap tanggal **16** bulan
- **Jam**: **20:00 WIB** (13:00 UTC)
- **Fungsi**: `send-kebijakan-notifications`
- **Penerima**: Semua karyawan aktif
- **Pesan**: Pengumuman Kebijakan + Birthday greeting (jika ada yang berulang tahun)

```
Contoh:
- 16 Januari 2026, 20:00 WIB
- 16 Februari 2026, 20:00 WIB
- 16 Maret 2026, 20:00 WIB
- dst... setiap bulan
```

---

### 2. **Pemberitahuan Kenaikan Karier** 📈
- **Hari**: Setiap tanggal **1** bulan
- **Jam**: **08:00 WIB** (01:00 UTC)
- **Fungsi**: `send-karir-notifications`
- **Penerima**: Karyawan yang memenuhi syarat kenaikan jabatan/golongan
- **Pesan**: Notifikasi peluang kenaikan karier + estimasi waktu

```
Contoh:
- 1 Januari 2026, 08:00 WIB
- 1 Februari 2026, 08:00 WIB
- 1 Maret 2026, 08:00 WIB
- dst... setiap bulan
```

---

## 🔧 File Konfigurasi

Jadwal disimpan di: `supabase/config.toml`

```toml
[functions.send-karir-notifications]
verify_jwt = false
# Cron: setiap hari ke-1 jam 01:00 UTC = 08:00 WIB

[functions.send-kebijakan-notifications]
verify_jwt = false
# Cron: setiap hari ke-16 jam 13:00 UTC = 20:00 WIB
```

---

## ⚙️ Cara Mengubah Jadwal

### Untuk Mengubah Waktu Eksekusi:

1. **Edit file**: `supabase/config.toml`
2. **Ubah nilai `schedule`**:

```toml
# Format: "minute hour day month day-of-week"
# Cron standard format

# Contoh 1: Setiap jam 6 pagi pada tanggal 1
# schedule = "0 6 1 * *"

# Contoh 2: Setiap jam 10 pagi pada tanggal 15
# schedule = "0 10 15 * *"

# Contoh 3: Setiap pukul 14:30 pada tanggal 1
# schedule = "30 14 1 * *"
```

3. **Deploy ulang**:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "YOUR_TOKEN"
npx supabase functions deploy send-kebijakan-notifications
npx supabase functions deploy send-karir-notifications
```

---

## 📋 Cron Expression Guide

Format: `minute hour day-of-month month day-of-week`

| Contoh | Arti |
|--------|------|
| `0 8 1 * *` | Jam 08:00, setiap tgl 1 setiap bulan |
| `0 20 16 * *` | Jam 20:00, setiap tgl 16 setiap bulan |
| `30 14 1 * *` | Jam 14:30, setiap tgl 1 setiap bulan |
| `0 6 * * 1` | Jam 06:00, setiap hari Senin |
| `0 12 1 1 *` | Jam 12:00, tanggal 1 Januari |

---

## 🕐 Timezone Reference

- **UTC**: Waktu standar global
- **WIB**: UTC + 7 jam (Indonesia)

Jadi:
- `0 1 * * *` UTC = `8:00 WIB`
- `0 13 * * *` UTC = `20:00 WIB`
- `0 6 * * *` UTC = `13:00 WIB`

---

## 🔍 Cek Eksekusi Otomatis

### Via Supabase Dashboard:
1. https://app.supabase.com
2. Project: kecapmaja
3. Edge Functions
4. Klik function → Tab **Executions**
5. Lihat history runs otomatis

### Via CLI:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "YOUR_TOKEN"
npx supabase functions logs send-kebijakan-notifications --tail
```

---

## 📝 Penyesuaian Jadwal

**Konteks Anda**: Apakah Anda ingin mengubah:
- ✅ Waktu eksekusi? (jam berapa)
- ✅ Tanggal eksekusi? (tanggal berapa dalam sebulan)
- ✅ Frekuensi? (setiap hari, setiap minggu, dll)

**Silakan beri tahu untuk penyesuaian!**

