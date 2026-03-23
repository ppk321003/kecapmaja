# 🧪 TEST KENAIKAN KARIER - Format & Template

## 📋 Ringkasan Test

Pengujian fitur notifikasi Kenaikan Karier untuk memastikan:
- ✅ Format pesan sesuai requirement
- ✅ Informasi jabatan/pangkat baru ditampilkan
- ✅ Estimasi waktu kenaikan ditampilkan
- ✅ Dokumen yang perlu disiapkan tercantum
- ✅ Tidak ada "undefined" di data

---

## 🎯 Test Cases

### Test Case 1: Karyawan Keterampilan (Kategori = Keterampilan)

**Data Karyawan:**
```
NIP: 197805012008122005
Nama: Arini Sukarsih
Jabatan: Pranata Komputer Ahli Muda
Golongan: III/b
Kategori: Keterampilan
AK Kumulatif: 35 AK
TMT Penghitungan: 1 Januari 2024
```

**Expected Output (Posisi Jabatan):**
```
Halo Arini, 👋

Kabar baik! Status kenaikan karir Anda:

📊 *Posisi Saat Ini*
Jabatan: Pranata Komputer Ahli Muda
Pangkat: III/b

📊 *Posisi yang akan diperoleh dalam 6 bulan*:
Jabatan: Pranata Komputer Madya
Pangkat: III/b

🎯 *Syarat yang diperlukan:*
  • Kenaikan Jabatan: 200 AK

📋 *Siapkan dokumen usulan kenaikan jabatan*
  • SK Kenaikan Jabatan
  • Bukti AK Kumulatif

📱 Pantau progress lengkap di:
https://kecapmaja.app/KarierKu

Pertanyaan? Hubungi PPK di satuan kerja Anda.

_Pesan otomatis dari Sistem Karir_
```

---

### Test Case 2: Karyawan Keahlian (Kategori = Keahlian)

**Data Karyawan:**
```
NIP: 198503152012101001
Nama: Budi Santoso
Jabatan: Ahli Pertama
Golongan: III/b
Kategori: Keahlian
AK Kumulatif: 60 AK
TMT Penghitungan: 1 Januari 2024
```

**Expected Output (Posisi Pangkat):**
```
Halo Budi, 👋

Kabar baik! Status kenaikan karir Anda:

📊 *Posisi Saat Ini*
Jabatan: Ahli Pertama
Pangkat: III/b

📊 *Posisi yang akan diperoleh dalam 4 bulan*:
Jabatan: Ahli Pertama
Pangkat: III/c

🎯 *Syarat yang diperlukan:*
  • Kenaikan Pangkat: 50 AK

📋 *Siapkan dokumen usulan kenaikan pangkat*
  • SK Kenaikan Pangkat
  • Bukti AK Kumulatif

📱 Pantau progress lengkap di:
https://kecapmaja.app/KarierKu

Pertanyaan? Hubungi PPK di satuan kerja Anda.

_Pesan otomatis dari Sistem Karir_
```

---

### Test Case 3: Dual Kenaikan (Jabatan + Pangkat Bersamaan)

**Data Karyawan:**
```
NIP: 198701012010121002
Nama: Citra Dewi
Jabatan: Terampil
Golongan: II/d
Kategori: Keterampilan
AK Kumulatif: 45 AK
TMT Penghitungan: 1 Januari 2024
```

**Expected Output (Kenaikan Jenjang):**
```
Halo Citra, 👋

Kabar baik! Status kenaikan karir Anda:

📊 *Posisi Saat Ini*
Jabatan: Terampil
Pangkat: II/d

📊 *Posisi yang akan diperoleh dalam 2 bulan*:
Jabatan: Mahir
Pangkat: III/a

🎯 *Syarat yang diperlukan:*
  • Kenaikan Jabatan: 60 AK
  • Kenaikan Pangkat: 50 AK

📋 *Persiapkan dokumen untuk kedua usulan:*
  • SK Kenaikan Jabatan
  • SK Kenaikan Pangkat

📱 Pantau progress lengkap di:
https://kecapmaja.app/KarierKu

Pertanyaan? Hubungi PPK di satuan kerja Anda.

_Pesan otomatis dari Sistem Karil_
```

---

## 🔍 Checklist Format Pesan

- [ ] **Header**: "Halo [Nama Depan], 👋"
- [ ] **Intro**: "Kabar baik! Status kenaikan karir Anda:"
- [ ] **Posisi Saat Ini**: Jabatan dan Pangkat (tidak ada "undefined")
- [ ] **Posisi Baru**: Menampilkan jabatan & pangkat yang akan diperoleh
- [ ] **Estimasi Waktu**: "dalam X bulan" (jelas dan spesifik)
- [ ] **Syarat AK**: Menampilkan kebutuhan AK untuk setiap jenis kenaikan
- [ ] **Dokumen**: Terdapat bagian "Siapkan dokumen..." dengan tipe dokumen spesifik
- [ ] **Link**: https://kecapmaja.app/KarierKu
- [ ] **Footer**: Instruksi hubungi PPK
- [ ] **Attribution**: "_Pesan otomatis dari Sistem Karir_"

---

## 🚀 Cara Test Manual

### Via Dashboard Admin

1. Navigasi ke tab **"Test Manual WA"**
2. Pilih **"Kenaikan Karier"**
3. Cari karyawan (misal: Arini Sukarsih)
4. Klik **"Kirim Test"**
5. Tunggu 10 detik dan cek WhatsApp

**Expected**: Pesan terformat dengan baik, menampilkan semua informasi sesuai test case di atas.

### Via Browser Console

```javascript
// Test single employee
const { data, error } = await supabase.functions.invoke('send-karir-notifications', {
  body: {
    testMode: true,
    testRecipient: {
      nip: '197805012008122005',
      nama: 'Arini Sukarsih',
      no_hp: '6289xxx',
      jabatan: 'Pranata Komputer Ahli Muda',
      golongan: 'III/b',
      pangkat: 'III/b',
      kategori: 'Keterampilan'
    }
  }
});

console.log('Response:', data);
if (error) console.error('Error:', error);
```

---

## ✨ Format Tips

### Estimasi Waktu Format:
- `"dalam 1 bulan"` → 1 bulan
- `"dalam 2 bulan"` → 2-3 bulan
- `"dalam 1 tahun 2 bulan"` → 14-15 bulan
- `"Sekarang"` → 0 bulan (sudah memenuhi syarat)

### Nama Jabatan Progression:

**Keahlian:**
- Ahli Pertama → Ahli Muda → Ahli Madya → Ahli Utama

**Keterampilan:**
- Terampil → Mahir → Penyelia

**Pangkat (Keterampilan):**
- II/a → II/b → II/c → II/d → III/a → III/b → III/c

**Pangkat (Keahlian):**
- III/a → III/b → III/c → III/d → IV/a → IV/b → IV/c → IV/d → IV/e

---

## 📊 Verifikasi Data

| Field | Backend | Frontend | Match |
|-------|---------|----------|-------|
| Koefisien AK | Dynamic (getKoefisien) | getKoefisien | ✅ |
| Kebutuhan Pangkat | Mapping table | getKebutuhanPangkat | ✅ |
| Kebutuhan Jabatan | Mapping table + CPNS exception | getKebutuhanJabatan | ✅ |
| Golongan Berikutnya | getGolonganBerikutnya | getGolonganBerikutnya | ✅ |
| Jabatan Berikutnya | getJabatanBerikutnya | getJabatanBerikutnya | ✅ |
| Template Pesan | buildMessage() | Manual render | ✅ |

---

## 🎯 Success Criteria

✅ **PASS** jika:
1. Pesan tidak mengandung "undefined"
2. Jabatan dan pangkat baru ditampilkan dengan benar
3. Estimasi waktu jelas dan sesuai (X bulan)
4. Dokumen yang perlu disiapkan tercantum
5. Format pesan sesuai dengan template di test cases
6. Emoji dan formatting WhatsApp berfungsi dengan baik

❌ **FAIL** jika:
- Ada field "undefined"
- Estimasi waktu tidak jelas
- Dokumen tidak tercantum
- Format tidak sesuai template
