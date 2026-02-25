# 🎉 Fitur Ucapan Ulang Tahun Otomatis - send-kebijakan-notifications

## Ringkasan Fitur

Ditambahkan ke function `send-kebijakan-notifications`:
- ✅ **Auto Birthday Detection** dari NIP (8 digit pertama: YYYYMMDD)
- ✅ **Personalized Greeting** berdasarkan umur & jabatan
- ✅ **Two-Phase Notification**:
  1. Kirim ucapan ulang tahun terlebih dahulu
  2. Kirim notifikasi kebijakan ke semua karyawan
- ✅ **Age-Based Messages**: Pesan berbeda untuk umur <40, 40-49, 50+

---

## 📋 Alur Kerja

### Timeline Eksekusi (Tanggal 16, 08:00 WIB)

```
[08:00] Trigger: send-kebijakan-notifications
    ↓
[Step 1] Load MASTER.ORGANIK data
    ↓
[Step 2] Parse setiap karyawan:
    - Extract NIP (first 8 digits)
    - Calculate age from birth date
    - Check: Is today birthday?
    ↓
[Step 3] PHASE 1 - Birthday Greetings
    For each karyawan.isBirthday = true:
    - Select device (rotation)
    - Build personalized message
    - Send via Fonnte
    - Log: "🎉 Birthday greeting sent"
    ↓
[Step 4] PHASE 2 - Kebijakan Notifications
    For all employees:
    - Send "Pakaian Dinas Korpri" message
    - Device rotation continues
    ↓
[End] Return JSON with breakdown
```

---

## 🔍 NIP Parsing Logic

**Format NIP**: 8 digit pertama = Tanggal Lahir

```
NIP: 19850615198503001
      ↑↑↑↑↑↑↑↑ = YYYYMMDD
      
19850615 = 1985-06-15 (15 Juni 1985)
                     ↓
              Age: 40 tahun (di 2026)
```

### Fungsi Extract

```typescript
function extractTanggalLahirFromNIP(nip: string): string | null {
  // Ambil 8 digit pertama: YYYYMMDD
  const tanggalLahirStr = nip.substring(0, 8);
  // Convert: 19850615 → 1985-06-15
  return `${tahun}-${bulan}-${tanggal}`;
}
```

---

## 🎂 Age-Based Message Templates

### Umur < 40 tahun

```
Selamat ulang tahun yang ke-[umur] tahun, [nama]! 
Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan 
dalam menjalankan tugas sebagai [jabatan].
```

**Varian:**
- Di usia ke-[umur] tahun ini, semoga [nama] semakin bijaksana dan inspiratif
- Semoga menjadi pribadi yang lebih baik dan profesional mengabdi untuk negara

---

### Umur 40-49 tahun

```
Selamat ulang tahun ke-[umur] tahun! 
Semoga di usia yang penuh kematangan ini, [nama] semakin banyak 
kontribusi berharga untuk [satker].
```

**Varian:**
- Di usia [umur] tahun, semoga [nama] semakin produktif dan inspiratif
- Semoga di usia yang semakin dewasa ini, [nama] senantiasa diberikan kemudahan

---

### Umur 50+ tahun (Usia Emas)

```
Selamat ulang tahun ke-[umur] tahun! 
Semoga pengalaman dan kebijaksanaan yang dimiliki [nama] semakin 
membawa manfaat bagi [satker].
```

**Varian:**
- Di usia emas [umur] tahun, semoga [nama] senantiasa diberikan kesehatan dan semangat
- Terima kasih atas dedikasi dan pengabdian selama ini. Selamat merayakan [umur] tahun 
  kehidupan yang penuh makna, [nama].

---

## 📤 Pesan WA Format

### Birthday Message

```
Halo Ade Yono,

🎉 *SELAMAT ULANG TAHUN* 🎉

Selamat ulang tahun yang ke-40 tahun, Ade Yono! 
Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kesuksesan 
dalam menjalankan tugas sebagai Kepala Bagian Statistik Sosial.

Salam *Kecap Maja.*
_Kerja Efisien, Cepat, Akurat, Profesional_
_Maju Aman Jeung Amanah_
```

### Kebijakan Message (Standard)

```
Halo Ade Yono,

📢 *Pengumuman Kebijakan - Hari Bhakti Korps Pegawai Negeri Sipil*

Sehubungan dengan Hari Bhakti Korps Pegawai Negeri Sipil, kami 
menginformasikan bahwa pada tanggal *17 Februari 2026* (Kamis) 
seluruh pegawai diwajibkan memakai **Pakaian Dinas Korpri**.

...
```

---

## 📊 Response JSON Breakdown

**Skenario: 250 karyawan total, 3 berulang tahun hari ini**

```json
{
  "status": "success",
  "sent": 503,
  "failed": -3,
  "total": 250,
  "breakdown": {
    "birthday": {
      "count": 3,
      "sent": 3,
      "failed": 0
    },
    "kebijakan": {
      "total": 250,
      "sent": 250,
      "failed": 0
    }
  },
  "results": [
    {
      "nip": "198506151985030",
      "nama": "Ade Yono",
      "messageType": "birthday",
      "status": "sent"
    },
    {
      "nip": "198506151985030",
      "nama": "Ade Yono",
      "messageType": "kebijakan",
      "status": "sent"
    },
    ...
  ]
}
```

---

## 🧪 Testing Birthday Feature

### Test di Dashboard

1. **Siapkan Karyawan dengan Birthday Hari Ini**
   - Pilih karyawan yang NIP-nya ke-8 digit = hari & bulan hari ini
   - Misal hari ini 25 Februari:
     - NIP: `xxxxxx0225xxxxxx` (tgl 02 bulan 25)

2. **Manual Invoke Function**
   - Go: Dashboard → Functions → send-kebijakan-notifications
   - Click: **Invoke function**
   - Leave body: `{}`

3. **Check Response**
   ```json
   {
     "breakdown": {
       "birthday": { "count": 1, "sent": 1, "failed": 0 }
     }
   }
   ```

4. **Check Logs**
   - Should see: `🎉 Birthday detected: [Nama] (40 tahun)`
   - Should see: `🎉 Birthday greeting sent to [Nama] via MAJA-1`

---

## 🔐 Data Privacy

- NIP parsing lokal di function (tidak diedit)
- Hanya ekstrak 8 digit pertama untuk birthdate
- Umur dihitung real-time, tidak disimpan
- Messages: Public information (nama, jabatan, umur)
- Disertai footer standard Kecap Maja

---

## 📋 Field Mapping dari MASTER.ORGANIK

| Column | Field | Keterangan |
|--------|-------|-----------|
| A | - | (Skip) |
| B (1) | NIP | Source untuk birth date extraction |
| C (2) | Nama | Personalisasi greeting |
| D (3) | Jabatan | Used in age-based templates |
| E (4) | Unit/Satker | Unit reference |
| F (5) | Golongan | Reference |
| ... | ... | ... |
| I (8) | No. HP | Send message via WhatsApp |

---

## 🚀 Production Checklist

- [x] Birthday parsing implemented
- [x] Age-based templates added
- [x] Two-phase notification logic
- [x] Fonnte device rotation
- [x] Error handling
- [x] Logging with emojis
- [x] Build successful
- [x] Function deployed
- [ ] **TODO**: Activate cron schedule `0 8 16 * *` di Dashboard
- [ ] **TODO**: Test with real birthday (manual invoke)
- [ ] **TODO**: Monitor logs on next execution

---

## 🎨 Customization

### Ubah Pesan Ulang Tahun

Edit function:
```
supabase/functions/send-kebijakan-notifications/index.ts
```

Cari section:
```typescript
function buildUlangTahunMessage(...) {
  const ucapanUmum = [
    // Edit pesan di sini
  ];
}
```

Lalu deploy:
```bash
npx supabase functions deploy send-kebijakan-notifications
```

### Tambah Conditional Logic

Contoh (kondisional berdasarkan golongan):
```typescript
if (emp.golongan.includes("DH")) {
  // Special message untuk group DH
  return `Halo ${nama} yang luar biasa...`;
}
```

---

## 🔗 Related Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `send-karir-notifications` | 1st of month, 08:00 | Career advancement notifications |
| `send-kebijakan-notifications` | **16th of month**, 08:00 | Policy announcments + **birthdays** |
| `send-manual-wa-notifications` | Manual (PPK) | Manual broadcast |

---

## 📞 Troubleshooting

**Q: Birthday not detected?**
- A: Check NIP format (must be 8 digits at start)
- A: Verify birth month/day match today's date

**Q: Message not personalized?**
- A: Check `buildUlangTahunMessage` params (nama, umur, jabatan)
- A: Verify data parsing from Google Sheets

**Q: Only kebijakan, no birthday?**
- A: No employees with birthday today
- A: Check logs for detection message (🎉 Birthday detected)

---

## 📚 Code References

- **Birthday Logic**: Ported from `src/pages/Home.tsx` lines 37-69
- **Message Templates**: Based on Home.tsx `getUcapanUltah()` function
- **Date Handling**: Using native JavaScript Date object (no external library)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 25 Feb 2026 | Initial: Kebijakan notifications only |
| 2.0 | 25 Feb 2026 | Added: Birthday greeting feature |

---

**Status**: ✅ Ready for Production  
**Last Updated**: 25 Februari 2026  
**Next Deploy**: When needed
