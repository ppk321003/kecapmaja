# 📊 Sheet yang Diperlukan - Manajemen Pembelian Pulsa

## Overview

Sistem manajemen pulsa berfungsi **100% di aplikasi web Kecap-Maja** (bukan Google Sheets). Data disimpan di database Supabase, bukan di Google Sheets.

Jadi sheet yang perlu disiapkan `MINIMAL` atau bisa `TIDAK ADA SAMA SEKALI` jika:
- Sudah punya database Supabase
- Sudah punya aplikasi web yang berjalan

---

## 📋 Sheet Opsional (Tidak Wajib)

### **Option 1: Jika ingin backup/export ke Google Sheets**

**Sheet 1: PULSA-BULANAN** (untuk export/backup)
```
No | Bulan | Tahun | Nama Petugas | NIP | Kegiatan | Organik | Mitra | Nominal | Status | Keterangan
```

**Sheet 2: MASTER-PETUGAS** (reference data)
```
ID | Nama | NIP | Daftar Kegiatan | Organik | No HP
```

**Sheet 3: MASTER-KEGIATAN** (reference data)
```
ID | Nama Kegiatan | Nominal Default | Kategori | Aktif
```

---

### **Option 2: Jika ingin punya Report di Google Sheets**

**Sheet: LAPORAN-PULSA** (untuk dashboard)
```
Bulan | Tahun | Total Petugas | Total Nominal | Breakdown Per Kegiatan | Breakdown Per Organik | Alert Duplikasi
```

---

## ✅ Recommended Setup

### **ADA DATABASE SUPABASE + WEB APP RUNNING:**

**✓ Gunakan sistem di web app**
- Tidak perlu Google Sheets
- Data langsung ke database
- Real-time validation
- Lebih aman & terstruktur

### **BELUM ADA DATABASE / DATA LAMA DI SHEETS:**

**1. Persiapkan 1 Sheet untuk IMPORT DATA LAMA** (jika ada)
```
Kolom: No | Bulan | Tahun | Nama Petugas | NIP | Kegiatan | Organik | Nominal | No HP | Catatan

Contoh:
1 | 1 | 2026 | Budi Santoso | 19800101 | Pendataan KSA | Fungsi Sosial | 100000 | 08123456789 | Data lama
2 | 1 | 2026 | Siti Nurhaliza | 19850202 | Pelatihan | Fungsi Neraca | 150000 | 08198765432 |
```

**2. Setup di Database Supabase:**
```sql
-- Import dari sheet ke tabel `pulsa_items`
-- Bisa pake tools: Supabase Data Import atau scripting
```

---

## 🚀 JADI: Langkah Sebenarnya

### **If starting FRESH (recommended):**

1. ✅ **Jalankan migration database** (✓ sudah ada di file)
2. ✅ **Deploy aplikasi web** (start localhost)
3. ✅ **Setup di web app** (bukan sheets!)
4. ✅ **Mulai input data** di aplikasi web
5. ✅ **Export ke Excel** saat butuh laporan (fitur future)

### **If migrating OLD data from Sheets:**

1. 📊 **Siapkan 1 sheet** dengan data lama
2. 🔄 **Import ke Supabase**
3. 🚀 **Lanjutkan di web app**

---

## 📝 CHECKLIST PERSIAPAN

- [ ] Database Supabase ready (run migration)
- [ ] Aplikasi web Kecap-Maja running (localhost)
- [ ] Route `/manajemen-pulsa` sudah terdaftar
- [ ] Sidebar menu sudah added
- [ ] Login berhasil dengan berbagai role

---

## ✨ KEY POINT

**Sistem ini di-design untuk web app, bukan Google Sheets!**

Semua fitur (validasi, approval, reporting) berjalan di aplikasi web, bukan di sheets.

Sheet hanya perlu kalau:
- Ingin backup data
- Ingin import data lama
- Ingin export laporan manual

---

Siap lanjut ke step: **JALANKAN LOCALHOST**? ✅
