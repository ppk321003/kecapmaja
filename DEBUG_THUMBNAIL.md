# Debug: Kenapa Thumbnail Tidak Tampil?

## Quick Diagnosis (5 menit)

### Step 1: Cek Data Terload
1. Buka halaman `/layanan-umum`
2. Buka DevTools (F12) → Console
3. Cari message: `[usePublikasiSheets] ✅ Successfully loaded: X publikasi`
   - ✅ Jika ada → Data terload, lanjut ke Step 2
   - ❌ Jika tidak ada → Data tidak terload, check [SETUP_LAYANAN_UMUM.md](SETUP_LAYANAN_UMUM.md)

### Step 2: Cek Thumbnail URL Format
Di DevTools Console, cari logs: `[LayananUmum] Item`

**Contoh LOG BAGUS:**
```
[LayananUmum] Item 1: {
  namaPublikasi: "Paparan Kepala BPS...",
  imageLink: "https://drive.google.com/file/d/1PHzBM6...",
  isGoogleDrive: true,
  thumbnailUrl: "https://drive.google.com/uc?export=view&id=1PHzBM...",  ← BENAR
  hasViewUrl: true
}
[LayananUmum] Image loaded: 1
```

**Contoh LOG BERMASALAH:**
```
[LayananUmum] Item 1: {
  imageLink: "https://drive.google.com/file/d/1PHzBM...",
  isGoogleDrive: true,
  thumbnailUrl: null,  ← MASALAH! Tidak ter-convert
  hasViewUrl: true
}
```

### Step 3: Cek Image Load Error
Jika ada log:
```
[LayananUmum] Image failed to load: 1 {
  src: "https://drive.google.com/uc?export=view&id=1PHzBM...",
  error: {...}
}
```

Ini berarti URL sudah benar tapi image failed load → **FILE TIDAK DI-SHARE PUBLIC**

---

## Root Causes & Solutions

### ❌ MASALAH 1: Sheet Kosong / Data Tidak Ada

**Gejala:**
- Halaman menampilkan **"Tidak ada publikasi tersedia"**
- Console log: `[usePublikasiSheets] No data rows (header only or empty)`

**Solusi:**
1. Buka Google Sheet Publikasi
2. Verify row 1 = header (No, Tahun, Tanggal, ...)
3. Verify ada data di row 2 dan seterusnya
4. Refresh halaman (Ctrl+Shift+R)

---

### ❌ MASALAH 2: Thumbnail URL Format Salah

**Gejala:**
- Data tampil tapi thumbnail blank dengan fallback icon 📄
- Console: `thumbnailUrl: null`

**Penyebab:**
URL di sheet menggunakan format **sharing link** alih-alih **image URL**:
```
❌ SALAH: https://drive.google.com/file/d/{FILE_ID}/view?usp=drive_link
✅ BENAR: https://drive.google.com/uc?export=view&id={FILE_ID}
```

**Solusi:**

**Opsi A: Fix di Sheet (Recommended)**
1. Di kolom "Thumbnail URL", ubah URL:
   - Dari: `https://drive.google.com/file/d/1PHzBM6nM.../view?usp=drive_link`
   - Ke: `https://drive.google.com/uc?export=view&id=1PHzBM6nM`
   
2. Cari `id=` di URL atau extract file ID dari `/d/...` bagian
   
3. Paste corrected URL kembali

**Opsi B: Script Python untuk Batch Fix**

```python
import re

def convert_drive_url(url):
    """Convert Google Drive sharing link to image URL"""
    # Extract file ID
    match = re.search(r'/file/d/([a-zA-Z0-9-_]+)', url)
    if match:
        file_id = match.group(1)
        return f"https://drive.google.com/uc?export=view&id={file_id}"
    return url

# Test
old_url = "https://drive.google.com/file/d/1PHzBM6nM9VO78gtdKBJSaLbRpjJRwwIR/view?usp=drive_link"
new_url = convert_drive_url(old_url)
print(new_url)
# Output: https://drive.google.com/uc?export=view&id=1PHzBM6nM9VO78gtdKBJSaLbRpjJRwwIR
```

---

### ❌ MASALAH 3: File Tidak Di-Share Public

**Gejala:**
- Thumbnail URL format benar (`uc?export=view&...`)
- Tapi gambar tetap tidak muncul
- Console error: `[LayananUmum] Image failed to load`

**Penyebab:**
Google Drive file sharing permission terlalu ketat

**Solusi:**

1. **Share file dengan "Anyone with link"**
   - Buka file di Google Drive
   - Klik **Share** (top right)
   - Change to **"Anyone with the link"**
   - Role: **Viewer**
   - Click **Share**

2. **Atau buat Public**
   - Klik **Share**
   - Change to **"Public"** (optional, lebih terbuka)
   - Click **Share**

3. **Refresh halaman** (Ctrl+Shift+R) → thumbnail seharusnya muncul

---

### ❌ MASALAH 4: Sheet ID Salah

**Gejala:**
- Console error: `[usePublikasiSheets] API Error: ...`
- Atau: `Tidak ada publikasi tersedia`

**Solusi:**
1. Copy Sheet ID yang BENAR dari URL:
   - URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - Ambil bagian `{SHEET_ID}` yang panjang

2. Update di `src/pages/LayananUmum.tsx` line 26:
   ```typescript
   const SHEET_ID = "1P2TulBe-XIEdmiNqGU3UB1mNr6mnTuPDEFq34E-6zf0";
   ```

3. Refresh halaman (Ctrl+Shift+R)

---

## Manual Test: Image URL di Browser

Untuk verify URL bekerja:

1. Copy URL dari console log (thumbnailUrl)
   ```
   https://drive.google.com/uc?export=view&id=1PHzBM6nM9VO78gtdKBJSaLbRpjJRwwIR
   ```

2. Paste ke address bar browser

3. **Jika muncul image** ✅
   - URL correct, file shared public
   - Remove image setelah test

4. **Jika error "Access denied"** ❌
   - File tidak di-share → Go to MASALAH 3

5. **Jika error "File not found"** ❌
   - FILE_ID salah → Go to MASALAH 2

---

## Alternative: Upload Image Ke Tempat Lain

Jika Google Drive bermasalah, bisa upload ke:

### Option 1: Imgur (Recommended, Instant)
1. Go to https://imgur.com/upload
2. Upload image
3. Copy **Direct Link** (ending in .jpg/.png)
4. Paste ke "Thumbnail URL" di Sheet

### Option 2: GitHub
1. Upload ke folder di GitHub repo
2. Use raw.githubusercontent.com URL:
   ```
   https://raw.githubusercontent.com/user/repo/main/images/file.jpg
   ```

### Option 3: Supabase Storage (Jika pakai Supabase)
1. Upload ke Supabase → Storage bucket
2. Get public URL
3. Paste ke Sheet

---

## Checklist

- [ ] Data tampil di halaman (bukan "Tidak ada publikasi")
- [ ] Buka DevTools → Console
- [ ] Cari `[LayananUmum] Item` logs
- [ ] Verify thumbnailUrl format: `https://drive.google.com/uc?...`
- [ ] Manual test URL di browser (harus bisa lihat image)
- [ ] Jika error "Access denied" → Re-share file public
- [ ] Refresh halaman (Ctrl+Shift+R)
- [ ] Thumbnail seharusnya muncul ✅

---

## Still Not Working?

1. **Copy full console logs** - paste di chat
2. **Screenshot** - yang error terjadi di mana
3. **Link ke sheet** - shared dengan me
4. Saya akan debug lebih lanjut 🔍
