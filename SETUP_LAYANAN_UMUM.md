# Setup Halaman Layanan Umum (Publikasi)

## Status: ✅ Code Fixed, ⏳ Data Setup Needed

### Masalah yang sudah diperbaiki:
- ✅ Duplikasi code di LayananUmum.tsx
- ✅ Function `getFileIcon()` ditambahkan
- ✅ Error SHEET_ID sudah dihapus

### Masalah yang perlu di-setup:
- ⏳ Sheet data Publikasi blank/tidak ada
- ⏳ Sheet ID perlu di-verifikasi/dibuat
- ⏳ Thumbnail belum tampil

---

## Step 1: Setup Google Sheet Publikasi

### 1.1 Buat Google Sheet Baru

1. Buka https://sheets.google.com
2. Buat sheet baru dengan nama **Publikasi BPS**
3. Rename sheet default menjadi **Sheet1**

### 1.2 Tambahkan Header Row

Di row pertama, tambahkan kolom berikut dengan urutan **EXACTY**:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| No | Tahun | Tanggal | Kategori | Nama Publikasi | Link | Thumbnail URL | Deskripsi | Status | Tipe File |

Contoh format:
```
No          | Tahun | Tanggal     | Kategori    | Nama Publikasi | Link | Thumbnail URL | Deskripsi | Status | Tipe File
1           | 2026  | 26 Mar 2026 | Publikasi   | Paparan ... | https://... | https://... | Paparan... | Gratis | PDF
```

### 1.3 Isi Data Publikasi

Tambahkan data publikasi minimal 2 baris untuk testing:

```
No | Tahun | Tanggal      | Kategori  | Nama Publikasi | Link | Thumbnail URL | Deskripsi | Status | Tipe File
1  | 2026  | 26 Maret 2026| Publikasi | Paparan Kepala BPS Majalengka - Pembangunan Lanjutan Gedung Kantor | https://drive.google.com/file/d/1PHzBM6nM9VO78gtdKBJSaLbRpjJRwwIR/view | https://drive.google.com/file/d/1PHzBM6nM9VO78gtdKBJSaLbRpjJRwwIR/view | Paparan Kepala BPS Majalengka | Gratis | PDF
2  | 2026  | 26 Maret 2026| Publikasi | Paparan Kepala BPS Majalengka - Pembangunan Lanjutan Gedung Kantor | https://drive.google.com/file/d/1dKkEQE4-rWJJag-u6D1eY7UMImbYI6tn/view | https://drive.google.com/file/d/1dKkEQE4-rWJJag-u6D1eY7UMImbYI6tn/view | Paparan Kepala BPS Majalengka | Gratis | PDF
```

---

## Step 2: Share Sheet dengan Service Account

### 2.1 Get Service Account Email

Dari Supabase dashboard:
1. Settings → Secrets
2. Cari `GOOGLE_SERVICE_ACCOUNT_EMAIL` atau `GOOGLE_PRIVATE_KEY` 
3. Jika menggunakan JSON: ekstrak `client_email` dari JSON

Contoh format: `bps-majalengka@xxx.iam.gserviceaccount.com`

### 2.2 Share Sheet

1. Di Google Sheet, klik **Share**
2. Masukkan Service Account Email
3. Beri permission **Editor**
4. **Uncheck** "Notify people"
5. Click **Share**

---

## Step 3: Update Sheet ID di Code

### 3.1 Copy Sheet ID

1. Buka Google Sheet Publikasi
2. URL format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Copy SHEET_ID (bagian panjang di antara `/d/` dan `/edit`)

Contoh: `1P2TulBe-XIEdmiNqGU3UB1mNr6mnTuPDEFq34E-6zf0`

### 3.2 Update LayananUmum.tsx

File: `src/pages/LayananUmum.tsx` (Line 26)

```typescript
const SHEET_ID = "YOUR_SHEET_ID_HERE";
```

Ganti `YOUR_SHEET_ID_HERE` dengan SHEET_ID yang di-copy.

---

## Step 4: Verify Setup

### 4.1 Check Browser Console

1. Buka halaman `/layanan-umum`
2. Buka Browser DevTools (F12) → Console
3. Cari logs dari `usePublikasiSheets`:

```
[usePublikasiSheets] Fetching from: { spreadsheetId: "1P2TulBe...", sheetName: "Sheet1" }
[usePublikasiSheets] API Response: { hasData: true, hasValues: true, valuesLength: 3, ... }
[usePublikasiSheets] ✅ Successfully loaded: 2 publikasi
```

### 4.2 Troubleshooting

**Error: "Gagal memuat data publikasi"**
- Check Sheet ID benar di LayananUmum.tsx
- Verify sheet sudah di-share dengan service account
- Check google-sheets function logs di Supabase

**Error: "No data rows (header only or empty)"**
- Verify data sudah di-input di Sheet1
- Check kolom headers sesuai urutan (No, Tahun, Tanggal, ...)
- Data mulai dari row 2 (row 1 adalah header)

**Thumbnail tidak tampil**
- Untuk Google Drive links, gunakan share link atau public link
- Format: `https://drive.google.com/file/d/{FILE_ID}/view` atau yang di-generate Google Drive
- Atau upload image ke tempat lain dan link direct URL

---

## Struktur Data Detail

### Kolom Mapping ke Aplikasi

| Column | Type | Example | Note |
|--------|------|---------|------|
| No | Integer | 1 | Auto-increment, bisa manual |
| Tahun | Integer | 2026 | Untuk filter tahun di UI |
| Tanggal | String (Date) | 26 Maret 2026 | Format display di UI |
| Kategori | String | Publikasi | Untuk filter kategori |
| Nama Publikasi | String | Paparan Kepala BPS | Title/heading di card |
| Link | String (URL) | https://drive.google.com/file/d/.../view | Link buka dokumen |
| Thumbnail URL | String (URL) | https://drive.google.com/file/d/.../view | Preview image di card |
| Deskripsi | String | Paparan pembangunan... | Short description |
| Status | String | Gratis | Badge di card (warna sekunder) |
| Tipe File | String | PDF | Emoji icon di card |

### File Type Icons

```typescript
'PDF' → 📄
'DOC', 'DOCX', 'WORD' → 📝
'XLS', 'XLSX', 'EXCEL' → 📊
'PPT', 'PPTX' → 🎯
'JPG', 'PNG', 'GIF', 'IMAGE' → 🖼️
'MP4', 'AVI', 'MOV', 'VIDEO' → 🎥
'MP3', 'WAV', 'AUDIO' → 🎵
'ZIP', 'RAR' → 📦
Default → 📎
```

---

## Quick Copy-Paste Data Format

Jika copy dari dokumen user:

```
1	2026	26 Maret 2026	Publikasi	Paparan Kepala BPS Majalengka - Pembangunan Lanjutan Gedung Kantor	https://drive.google.com/file/d/1PHzBM6nM9VO78gtdKBJSaLbRpjJRwwIR/view?usp=drive_link	https://drive.google.com/file/d/1PHzBM6nM9VO78gtdKBJSaLbRpjJRwwIR/view?usp=drive_link	Paparan Kepala BPS Majalengka - Pembangunan Lanjutan Gedung Kantor	Gratis	PDF
2	2026	26 Maret 2026	Publikasi	Paparan Kepala BPS Majalengka - Pembangunan Lanjutan Gedung Kantor	https://drive.google.com/file/d/1dKkEQE4-rWJJag-u6D1eY7UMImbYI6tn/view?usp=drive_link	https://drive.google.com/file/d/1dKkEQE4-rWJJag-u6D1eY7UMImbYI6tn/view?usp=drive_link	Paparan Kepala BPS Majalengka - Pembangunan Lanjutan Gedung Kantor	Gratis	PDF
```

1. Paste langsung ke Google Sheet (Paste Special → Unformatted text)
2. Sheet akan auto-parse tab-separated values

---

## Notes

- **Hot Reload:** Setelah update LayananUmum.tsx, refresh browser (Ctrl+Shift+R)
- **Sheet Cache:** Data di-fetch saat component mount, tidak ada automatic refresh
- **Pagination:** Menampilkan 12 item per halaman
- **Search:** Mencari di Nama Publikasi, Deskripsi, dan Kategori
- **Filter:** Bisa filter by Tahun dan Kategori (multiple select)
- **Sort:** Terbaru, Terlama, Nama A-Z

---

## Deployment Checklist

- [ ] Google Sheet Publikasi dibuat dan diisi data
- [ ] Sheet di-share dengan service account
- [ ] Sheet ID di-update di LayananUmum.tsx
- [ ] Browser refresh (Ctrl+Shift+R)
- [ ] Verify data tampil di halaman `/layanan-umum`
- [ ] Test search & filter functionality
- [ ] Test link buka dokumen
- [ ] Test thumbnail tampil/fallback icon
