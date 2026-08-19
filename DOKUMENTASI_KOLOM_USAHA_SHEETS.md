# Dokumentasi Kolom Sheet Pendataan Usaha di MonitoringLapanganDash.tsx

## 📋 Overview
Ada 2 tabel utama di Tab "Pendataan Usaha":
1. **Kondisi Keseluruhan** - Menampilkan kondisi usaha perusahaan dan keluarga
2. **Proporsi Pertanian / Non Pertanian** - Menampilkan proporsi usaha pertanian vs non-pertanian

---

## 1️⃣ TABEL "KONDISI KESELURUHAN"

### Data Sources:
Tabel ini menggunakan data dari **5 sheet berbeda** yang di-merge:

#### A. SHEET: "USAHA PERUSAHAAN" (usahaPerusahaanData)
**Kolom-kolom yang digunakan (index 0-based):**

| Index | Nama Kolom | Deskripsi | Digunakan Untuk |
|-------|-----------|-----------|-----------------|
| 0 | ID/Kode SLS | Kode identifikasi | Key/ID |
| 1 | SLS/RT | Nama SLS/RT | Detail row |
| 2 | Prelist Usaha | Jumlah Prelist Usaha | perusahaan_jumlah_prelist_usaha |
| 3 | Ditemukan (A) | Digunakan dalam perhitungan | perusahaan_ditemukan (A) |
| 5 | Ditemukan (B) | Digunakan dalam perhitungan | perusahaan_ditemukan (B) |
| 7 | Tutup (A) | Digunakan dalam perhitungan | perusahaan_tutup (A) |
| 9 | Tutup (B) | Digunakan dalam perhitungan | perusahaan_tutup (B) |
| 11 | Ganda (A) | Digunakan dalam perhitungan | perusahaan_ganda (A) |
| 13 | Tidak Ditemukan (A) | Digunakan dalam perhitungan | perusahaan_tidak_ditemukan (A) |
| 19 | Ditemukan (C) | Digunakan dalam perhitungan | perusahaan_ditemukan (C) |
| 21 | Tutup (C) | Digunakan dalam perhitungan | perusahaan_tutup (C) |
| 23 | Ganda (B) | Digunakan dalam perhitungan | perusahaan_ganda (B) |
| 25 | Tidak Ditemukan (B) | Digunakan dalam perhitungan | perusahaan_tidak_ditemukan (B) |
| 27 | Baru | Jumlah usaha baru | perusahaan_baru |
| 35 | Ditemukan + Baru | Total Ditemukan + Baru | perusahaan_ditemukan_plus_baru |

**Formula perhitungan:**
- `perusahaan_ditemukan` = Col[3] + Col[5] + Col[19]
- `perusahaan_tutup` = Col[7] + Col[9] + Col[21]
- `perusahaan_ganda` = Col[11] + Col[23]
- `perusahaan_tidak_ditemukan` = Col[13] + Col[25]
- `perusahaan_baru` = Col[27]
- `perusahaan_ditemukan_plus_baru` = Col[35]

#### B. SHEET: "USAHA KELUARGA" (usahaKeluargaData)
**Kolom-kolom yang digunakan (index 0-based):**

| Index | Nama Kolom | Deskripsi | Digunakan Untuk |
|-------|-----------|-----------|-----------------|
| 0 | ID/Kode SLS | Kode identifikasi | Key/ID |
| 1 | SLS/RT | Nama SLS/RT | Detail row |
| 3 | Ditemukan | Jumlah keluarga ditemukan | keluarga_ditemukan |
| 5 | Tutup | Jumlah keluarga ditutup | keluarga_tutup |
| 7 | Ganda | Jumlah keluarga ganda | keluarga_ganda |
| 9 | Tidak Ditemukan | Jumlah keluarga tidak ditemukan | keluarga_tidak_ditemukan |
| 11 | Baru | Jumlah keluarga baru | keluarga_baru |
| 15 | Ditemukan + Baru | Total Ditemukan + Baru | keluarga_ditemukan_plus_baru |

#### C. SHEET: "PROPORSI PERTANIAN NON PERTANIAN" (usahaProporsiRows)
**Kolom-kolom yang digunakan:**

| Field | Deskripsi | Digunakan Untuk |
|-------|-----------|-----------------|
| prelist_awal | Prelist Awal | prelist_awal_baru |
| didata | Jumlah yang didata | didata |

#### D. SHEET: "PROGRES" (progresData)
**Kolom-kolom yang digunakan (index 0-based):**

| Index | Nama Kolom | Deskripsi | Digunakan Untuk |
|-------|-----------|-----------|-----------------|
| 0 | ID/Kode | Kode identifikasi | Key |
| 2 | Prelist Awal | Jumlah prelist awal | Lookup untuk prelist_awal (backup) |

#### E. SHEET: "STACKING" (stackingData)
**Kolom-kolom yang digunakan:**

| Field | Deskripsi | Digunakan Untuk |
|-------|-----------|-----------------|
| Wilkerstat Value | Nilai wilkerstat | bku_usaha_wilkerstat_baru |

### Struktur Tabel Kondisi Keseluruhan:
```
┌─────────┬──────────────┬────────────────────────────────────────┬──────────────────────────────────┐
│   No    │  Nama PPL    │  Kecamatan  │  [Kolom-kolom berikut] │
├─────────┼──────────────┼────────────────────────────────────────┼──────────────────────────────────┤
│         │              │             │  Perusahaan:           │ Keluarga:                        │
│         │              │             │  - Prelist Awal        │ - Ditemukan                      │
│         │              │             │  - Prelist Usaha       │ - Tutup                          │
│         │              │             │  - Didata              │ - Ganda                          │
│         │              │             │  - Bku Wilkerstat      │ - Tidak Ditemukan                │
│         │              │             │  - Ditemukan           │ - Baru                           │
│         │              │             │  - Tutup               │ - Ditemukan + Baru               │
│         │              │             │  - Ganda               │                                  │
│         │              │             │  - Tidak Ditemukan     │ Ringkasan:                       │
│         │              │             │  - Baru                │ - Total Tidak Ditemukan          │
│         │              │             │  - Ditemukan + Baru    │ - Total Usaha                    │
│         │              │             │                        │ - Surplus/Defisit                │
└─────────┴──────────────┴────────────────────────────────────────┴──────────────────────────────────┘
```

---

## 2️⃣ TABEL "PROPORSI PERTANIAN / NON PERTANIAN"

### Data Source:
Tabel ini menggunakan data dari **1 sheet utama**:

#### SHEET: "PROPORSI PERTANIAN NON PERTANIAN" (usahaProporsiRows)

**Kolom-kolom yang digunakan dari sheet (index 0-based untuk column text extraction):**

| Index | Kolom di Sheet | Field Name | Deskripsi | Tipe |
|-------|---|---|---|---|
| 0 | ID/Kode SLS | kode | Kode identifikasi SLS | String |
| 1 | SLS/RT | sls_rt | Nama SLS/RT | String |
| 2 | Prelist Usaha | prelist_usaha | Jumlah Prelist Usaha | Numeric |
| 4 | UTP/Subsektor ST2023 | utp_subsektor_st2023 | UTP Subsektor ST2023 | String/Numeric |
| 5 | Bku Ditemukan Pertanian | bku_ditemukan_pertanian | BKU Ditemukan Pertanian | Numeric |
| 7 | Bku Ditemukan Non Pertanian | bku_ditemukan_non_pertanian | BKU Ditemukan Non-Pertanian | Numeric |
| 8 | Bku Baru Pertanian | bku_baru_pertanian | BKU Baru Pertanian | Numeric |
| 10 | Bku Baru Non Pertanian | bku_baru_non_pertanian | BKU Baru Non-Pertanian | Numeric |
| 11 | Keluarga Ditemukan Pertanian | keluarga_ditemukan_pertanian | Keluarga Ditemukan Pertanian | Numeric |
| 13 | Keluarga Ditemukan Non Pertanian | keluarga_ditemukan_non_pertanian | Keluarga Ditemukan Non-Pertanian | Numeric |
| 14 | Keluarga Baru Pertanian | keluarga_baru_pertanian | Keluarga Baru Pertanian | Numeric |
| 16 | Keluarga Baru Non Pertanian | keluarga_baru_non_pertanian | Keluarga Baru Non-Pertanian | Numeric |
| 23 | Bku Usaha Wilkerstat Baru | bku_usaha_wilkerstat_baru | BKU Usaha Wilkerstat Baru | Numeric |

**Field tambahan dari lookup:**
- prelist_awal - Dari sheet "PROPORSI PERTANIAN NON PERTANIAN" atau "PROGRES"
- didata - Dari sheet "PROPORSI PERTANIAN NON PERTANIAN" atau lookup prelist_awal

### Struktur Tabel Proporsi Pertanian / Non Pertanian:
```
┌─────────┬──────────────┬──────────────┬──────────────────────────────────────────────────────────────┐
│   No    │  Nama PPL    │  Kecamatan   │  Kolom Proporsi:                                             │
├─────────┼──────────────┼──────────────┼──────────────────────────────────────────────────────────────┤
│         │              │              │ Prelist:              │ Usaha:                           │
│         │              │              │ - Prelist Awal        │ - Prelist Usaha                  │
│         │              │              │ - Prelist Usaha       │ - Didata                         │
│         │              │              │ - UTP ST2023          │ - BKU Usaha Wilkerstat           │
│         │              │              │ - Didata              │                                  │
│         │              │              │                       │ BKU Pertanian:                   │
│         │              │              │                       │ - Ditemukan Pertanian            │
│         │              │              │                       │ - Baru Pertanian                 │
│         │              │              │                       │ - % Non Pertanian vs Prelist     │
│         │              │              │                       │ - % Non Pertanian vs Wilkerstat  │
│         │              │              │                       │                                  │
│         │              │              │                       │ BKU Non Pertanian:               │
│         │              │              │                       │ - Ditemukan Non Pertanian        │
│         │              │              │                       │ - Baru Non Pertanian             │
│         │              │              │                       │                                  │
│         │              │              │                       │ Keluarga Pertanian:              │
│         │              │              │                       │ - Ditemukan Pertanian            │
│         │              │              │                       │ - Baru Pertanian                 │
│         │              │              │                       │                                  │
│         │              │              │                       │ Keluarga Non Pertanian:          │
│         │              │              │                       │ - Ditemukan Non Pertanian        │
│         │              │              │                       │ - Baru Non Pertanian             │
└─────────┴──────────────┴──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## ⚠️ PENTING: Jika Ada Perubahan Struktur Kolom

**Masalah yang mungkin timbul:**
- Jika posisi kolom di sheet "PROPORSI PERTANIAN NON PERTANIAN" berubah, data akan diambil dari posisi yang salah
- Hal ini akan menyebabkan card dan grafik menampilkan nilai 0 atau kosong

**Solusi:**
- Update indeks kolom di kode jika ada perubahan struktur sheet
- Atau gunakan field name matching instead of column index untuk lebih robust

---

## 📊 Ringkasan Sheet yang Digunakan

| Tabel | Sheet Utama | Sheet Pendukung | Fungsi Pendukung |
|-------|---|---|---|
| Kondisi Keseluruhan | USAHA PERUSAHAAN + USAHA KELUARGA | PROPORSI PERTANIAN NON PERTANIAN, PROGRES, STACKING | Lookup prelist_awal, didata, wilkerstat |
| Proporsi Pertanian/Non Pertanian | PROPORSI PERTANIAN NON PERTANIAN | PROGRES, STACKING | Lookup prelist_awal, wilkerstat |

