# 🚀 QUICK SETUP: Notifications Kebijakan Tanggal 16

## ✅ Sudah Selesai
- ✅ Function deployed: `send-kebijakan-notifications`
- ✅ Config updated: `supabase/config.toml`
- ✅ Fonnte integration: Ready (MAJA-1,2,3,4)
- ✅ Holiday check: Active
- ✅ All employees target: Ready

---

## ⏰ TODO: Activate Cron (5 Menit)

### 1️⃣ Buka Dashboard Supabase
https://supabase.com/dashboard/project/yudlciokearepqzvgzxx/functions

### 2️⃣ Pilih Function
- Click: **send-kebijakan-notifications**

### 3️⃣ Enable Cron
- Click: **Enable Cron Trigger** (atau **Add Schedule**)
- Enter: `0 8 16 * *`
- Click: **Save**

### 4️⃣ Verify
- Status should show: ✅ **Active**
- Next run: **16 [Month] 2026 at 08:00 UTC (15:00 WIB)**

---

## 🧪 Test Sebelum Go Live (2 Menit)

1. Go to **send-kebijakan-notifications** function
2. Click: **Invoke function**
3. Leave body empty: `{}`
4. Click: **Send**

### Expected Results

**Jika tanggal hari ini 17 bukan hari libur:**
```json
{
  "status": "success",
  "sent": 250+,
  "failed": 0-2,
  "total": 252
}
```

**Jika tanggal hari ini 17 adalah hari libur:**
```json
{
  "status": "skipped",
  "reason": "Tanggal 17 adalah hari libur atau akhir pekan",
  "sent": 0
}
```

---

## 📅 Schedule Summary

| Tanggal | Jam | Function | Penerima |
|---------|-----|----------|----------|
| **1** (Tenant 1) | 08:00 | `send-karir-notifications` | Hanya naik pangkat |
| **16** (Tenant 16) | 08:00 | `send-kebijakan-notifications` | ✅ **Semua karyawan** |

---

## 📝 Pesan Otomatis

**Tanggal kirim**: 16 setiap bulan
**Target**: Semua 250+ karyawan
**Konten**: Pengumuman Pakaian Dinas Korpri untuk tanggal 17

---

## ✴️ Spesial Fitur

- **Smart Holiday Check**: Jika tgl 17 libur → notifikasi SKIP
- **Device Rotation**: Fonnte devices (MAJA-1,2,3,4) auto-rotate
- **Full Personalization**: Setiap karyawan dapat pesan dengan nama mereka
- **Rate Limiting**: 15 messages per jam per device
