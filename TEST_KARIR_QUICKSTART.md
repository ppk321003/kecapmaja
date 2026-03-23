# 📱 Panduan Test Kenaikan Karier - QUICK START

## 🚀 Step-by-Step Test Manual (2-3 Menit)

### Step 1: Buka Dashboard Admin
```
URL: https://kecapmaja.app
Login dengan akun admin
```

### Step 2: Navigasi ke Test WA Broadcast
```
Sidebar → [Cari "Test" atau "Manual WA"]
Atau: Settings/Admin → Manual WA Broadcast
```

### Step 3: Pilih "Kenaikan Karier"
```
✓ Radio button: "Kenaikan Karier"
```

### Step 4: Cari Karyawan Target
```
Search box: Ketik nama atau NIP
Contoh: "Arini" atau "197805012008122005"
```

### Step 5: Pilih & Kirim Test
```
✓ Radio button: Pilih karyawan
Button: "Kirim Test Kenaikan Karier"
Wait: 10 detik (Fonnte process)
```

### Step 6: Cek WhatsApp
```
Buka WhatsApp di smartphone
Lihat pesan masuk dari nomor Fonnte
Contoh pesan:
  ✓ "Halo [Nama], 👋"
  ✓ "📊 *Posisi Saat Ini*"
  ✓ "📊 *Posisi yang akan diperoleh dalam X bulan*"
  ✓ "🎯 *Syarat yang diperlukan*"
  ✓ "📋 *Siapkan dokumen...*"
  ✓ Link kecapmaja.app/KarierKu
```

---

## ✅ Verification Checklist

Pesan WhatsApp harus menampilkan (dalam urutan ini):

```
✓ Greeting: "Halo [Nama Depan], 👋"
✓ Intro: "Kabar baik! Status kenaikan karir Anda:"
✓ Blank line

✓ Section 1: "📊 Posisi Saat Ini"
  - Jabatan: [Actual Jabatan]
  - Pangkat: [Golongan - TIDAK ada "undefined"]
✓ Blank line

✓ Section 2: "📊 Posisi yang akan diperoleh dalam X bulan"
  - Jabatan: [Jabatan Berikutnya]
  - Pangkat: [Golongan Berikutnya]
✓ Blank line

✓ Section 3: "🎯 Syarat yang diperlukan"
  - Jenis kenaikan dengan jumlah AK
✓ Blank line

✓ Section 4: "📋 Siapkan/Persiapkan dokumen"
  - Daftar dokumen yang dibutuhkan
✓ Blank line (2x)

✓ Link: https://kecapmaja.app/KarierKu
✓ Blank line (2x)

✓ Footer: "Pertanyaan? Hubungi PPK..."
✓ Attribution: "_Pesan otomatis dari Sistem Karir_"
```

---

## 🔍 Format Estimasi Waktu

| Bulan | Format Expected |
|-------|-----------------|
| 0 | "Sekarang" |
| 1 | "1 bulan" |
| 2-3 | "X bulan" |
| 12+ | "X tahun" atau "X tahun Y bulan" |

---

## 🎯 Test Scenarios (Pick One)

### Scenario A: Karyawan Keterampilan - Kenaikan Jabatan
```
Cari: Karyawan dengan kategori "Keterampilan"
Jabatan saat ini: Terampil/Mahir
Expected: Pesan menampilkan posisi jabatan berikutnya
         (misal: Terampil → Mahir)
```

### Scenario B: Karyawan Keahlian - Kenaikan Pangkat
```
Cari: Karyawan dengan kategori "Keahlian"
Jabatan: Ahli Pertama/Ahli Muda
Expected: Pesan menampilkan posisi pangkat berikutnya
         (misal: III/b → III/c)
```

### Scenario C: Dual Kenaikan
```
Cari: Karyawan Keterampilan II/d dengan AK cukup
Expected: Pesan menampilkan KEDUA kenaikan:
         - Jabatan: Terampil → Mahir
         - Pangkat: II/d → III/a
         - 2 jenis dokumen SK
```

---

## 🔧 Troubleshooting

### ❌ Error: "No available Fonnte devices"
```
✓ Cek: Environment variables FONNTE_DEVICE_TOKENS di Supabase
✓ Pastikan: Minimal 1 device aktif
✓ Action: Hubungi admin setup Fonnte
```

### ❌ Error: "Cannot find employee"
```
✓ Cek: NIP/nama karyawan di Google Sheets MASTER.ORGANIK
✓ Pastikan: Data sudah sync ke backend
✓ Action: Refresh browser atau tunggu sync
```

### ❌ Pesan tidak diterima (timeout)
```
✓ Cek: Nomor HP karyawan (+62 format)
✓ Pastikan: Nomor HP aktif dan terdaftar di Fonnte
✓ Action: Tunggu 30 detik, check WhatsApp lagi
✓ Last resort: Cek logs di Supabase Functions
```

### ❌ Pesan berisi "undefined"
```
✗ BUG: Ada field data yang kosong
✓ Contact: Developer untuk debug
```

---

## 📊 Success Indicators

✅ **Test BERHASIL** jika:
1. ✓ Pesan diterima dalam 10-15 detik
2. ✓ Greeting nama depan benar
3. ✓ Pangkat bukan "undefined"
4. ✓ Menampilkan jabatan/pangkat yang akan diperoleh
5. ✓ Estimasi bulan jelas (misal: "dalam 3 bulan")
6. ✓ Ada section dokumen yang perlu disiapkan
7. ✓ Link kecapmaja.app/KarierKu aktif
8. ✓ Formatting: emoji, bold text, line breaks normal

❌ **Test GAGAL** jika:
1. ✗ Pesan tidak diterima setelah 60 detik
2. ✗ Ada "undefined" di pesan
3. ✗ Informasi jabatan/pangkat baru tidak ditampilkan
4. ✗ Tidak ada estimasi waktu yang jelas
5. ✗ Dokumen tidak tercantum
6. ✗ Format rusak/tidak terbaca

---

## 💡 Next Steps

Jika test **BERHASIL**:
```
✓ Dokumentasikan di TESTING_KARIR_FORMAT.md
✓ Screenshot pesan WhatsApp (untuk reference)
✓ Tandai test case sebagai PASS
✓ Siap untuk production deploy
```

Jika test **GAGAL**:
```
✓ Note error message
✓ Check backend logs: Supabase → Functions → send-karir-notifications
✓ Report to developer dengan screenshot + logs
```

---

## 📞 Contact & Support

**Untuk debugging lebih lanjut:**
1. Check function logs: https://app.supabase.com → Functions → send-karir-notifications
2. Browser console: F12 → Console → lihat error details
3. Test via curl/API jika diperlukan

---

**Last Updated**: 23 Maret 2026
**Status**: ✅ Ready for Testing
