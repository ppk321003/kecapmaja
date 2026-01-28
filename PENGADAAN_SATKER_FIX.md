# Fix Pengadaan Page - Satker Selection Issue

## Problem
Halaman Pengadaan masih menggunakan spreadsheet ID satker 3210 (hardcoded) padahal user login menggunakan satker 3209. Data yang direkam masih masuk ke sheet 3210, bukan ke sheet 3209.

## Root Cause
File `src/pages/Pengadaan.tsx` menggunakan hardcoded `SPREADSHEET_ID` yang diset ke ID spreadsheet satker 3210:
```tsx
const SPREADSHEET_ID = "1rvJUdX0rc6kEneTUwGK6p-qyPV66PKcYuP5BL58Bc2M";
```

Seharusnya menggunakan context `useSatkerConfigContext` untuk mendapatkan spreadsheet ID yang sesuai dengan satker user yang sedang login.

## Solution
Mengubah `Pengadaan.tsx` untuk:

1. **Import `useSatkerConfigContext`**
   - Menambahkan import: `import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";`

2. **Ganti hardcoded SPREADSHEET_ID dengan dynamic spreadsheetId**
   - Mengganti `const SPREADSHEET_ID = "..."` dengan `const DEFAULT_PENGADAAN_SPREADSHEET_ID = "..."`
   - Menambahkan logic untuk get satker-specific sheet ID:
   ```tsx
   const satkerContext = useSatkerConfigContext();
   const spreadsheetId = satkerContext?.getUserSatkerSheetId('pengadaan') || DEFAULT_PENGADAAN_SPREADSHEET_ID;
   ```

3. **Replace semua SPREADSHEET_ID dengan spreadsheetId di seluruh fungsi:**
   - `loadPengadaanData()` - untuk membaca data
   - `simpanData()` - untuk menyimpan data usulan
   - `updateData()` - untuk mengupdate data
   - `getAllData()` - untuk membaca semua data
   - `deleteData()` - untuk menghapus data

## Changes Made
- **File:** `src/pages/Pengadaan.tsx`
- **Lines modified:** Multiple locations across the file
- **Type:** Enhancement - Dynamic satker-based spreadsheet selection

## How It Works
1. Ketika page dimuat, `useSatkerConfigContext()` mengambil data satker dari AuthContext
2. Context membaca Master Config Sheet untuk mendapatkan sheet ID sesuai satker dan module ('pengadaan')
3. Semua operasi Google Sheets (read, append, update, delete) menggunakan dynamic `spreadsheetId` dari context
4. Jika context tidak tersedia atau satker tidak ditemukan, fallback ke `DEFAULT_PENGADAAN_SPREADSHEET_ID`

## Testing
Untuk memverifikasi fix:
1. Login dengan satker 3209
2. Halaman Pengadaan akan otomatis menggunakan spreadsheet untuk satker 3209
3. Data yang disimpan akan masuk ke sheet 3209, bukan 3210

## Related Files
- `src/contexts/SatkerConfigContext.tsx` - Context provider
- `src/hooks/use-satker-config.ts` - Hook untuk membaca master config
- `src/contexts/AuthContext.tsx` - Context untuk user login info (termasuk satker)

## Fallback Behavior
Jika Master Config tidak tersedia atau satker tidak tercantum di config, sistem akan menggunakan `DEFAULT_PENGADAAN_SPREADSHEET_ID` (spreadsheet satker 3210) sebagai fallback untuk backward compatibility.
