# Debug Guide: Multi-Satker Data Isolation Issue

## Problem
User dengan satker 3209 login berhasil, tetapi data yang ditampilkan masih dari satker 3210.

## Diagnosis Steps

### 1. Check Browser Console Logs
Buka Developer Tools (F12) → Console tab, login dengan user 3209, dan cari logs berikut:

**Expected logs:**
```
[AuthContext.login] User found: { username: "...", role: "...", satker: "3209" }
[useSatkerConfig] Successfully read from sheet: Sheet1
Loaded satker configs: [
  { satker_id: "3210", satker_nama: "...", pencairan_sheet_id: "...", ... },
  { satker_id: "3209", satker_nama: "...", pencairan_sheet_id: "...", ... },
  ...
]
[SatkerConfigContext.getUserSatkerSheetId(pencairan)] user.satker=3209, sheetId=<SHEET_ID_FOR_3209>
[usePencairanData] satkerContext: { spreadsheetId: "<SHEET_ID_FOR_3209>", isConfigReady: true, ... }
```

### 2. Data Flow Checklist

#### ✅ Step 1: AuthContext - Satker Extraction
- [ ] Check user sheet (spreadsheet 1kVxQHL3TPfDKJ1ZnZ_fxJECGctc1UBjU_8E--9UK938) column F has satker values
- [ ] Verify user row has value in column F (e.g., "3209")
- [ ] Console should show: `[AuthContext.login] User found: { ..., satker: "3209" }`

**Debug command:** Open DevTools console, check localStorage:
```javascript
JSON.parse(localStorage.getItem('simaja_user')).satker
```
Should output: `"3209"`

#### ✅ Step 2: Master Config Loading
- [ ] Check Master Config Sheet exists (ID: 1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ)
- [ ] Verify sheet structure:
  - Row 1: Headers (satker_id, satker_nama, pencairan_sheet_id, pengadaan_sheet_id, entrikegiatan_sheet_id, tagging_sheet_id)
  - Row 2: 3210 data with all sheet IDs
  - Row 3: 3209 data with all sheet IDs
  - Row 4: 3208 data with all sheet IDs
- [ ] Sheet name should be "satker_config" OR "Sheet1" (code tries both)
- [ ] Console should show: `[useSatkerConfig] Successfully read from sheet: <SHEET_NAME>`
- [ ] Console should show: `Loaded satker configs: [...]` with 3 entries

#### ✅ Step 3: SatkerConfigContext Resolution
- [ ] After login, SatkerConfigContext should be ready
- [ ] Calling `getUserSatkerSheetId('pencairan')` should return sheet ID for 3209
- [ ] Console should show: `[SatkerConfigContext.getUserSatkerSheetId(pencairan)] user.satker=3209, sheetId=<ID>`

#### ✅ Step 4: usePencairanData Hook
- [ ] Should call useSatkerConfigContext()
- [ ] Should receive correct spreadsheetId from context
- [ ] Should NOT use DEFAULT_SPREADSHEET_ID (3210) as fallback
- [ ] Console should show: `[usePencairanData] satkerContext: { spreadsheetId: "<ID_FOR_3209>", ... }`

## Possible Issues & Solutions

### Issue A: Satker tidak terbaca di AuthContext
**Symptom:** Console shows `satker: ""`

**Solution:**
1. Verify column F di user sheet memiliki data "3209"
2. Check apakah ada spasi extra di user sheet
3. Pastikan row index untuk user 3209 ada di row 3-10+ (tidak tertutup header)

### Issue B: Master Config Sheet tidak terbaca
**Symptom:** Console shows error atau configs empty array

**Solution:**
1. Verify Master Config Sheet ID: 1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ
2. Check sheet name:
   - Buka spreadsheet → lihat tab sheet di bawah
   - Seharusnya bernama "satker_config" atau "Sheet1"
   - Jika berbeda, edit code di use-satker-config.ts line 7
3. Verify data formatting:
   - Column A: satker_id (text, e.g., "3209")
   - Columns B-F: names and sheet IDs (long strings)
   - No empty rows
4. Ensure Supabase google-sheets function accessible

### Issue C: SatkerConfigContext returns null
**Symptom:** `[SatkerConfigContext.getUserSatkerSheetId(pencairan)] Missing: user=true, satker=3209, configs=false`

**Solution:**
1. Check if useSatkerConfig() hook loading took too long
2. Verify Master Config Sheet is readable
3. Check for errors in Supabase google-sheets function

### Issue D: usePencairanData shows DEFAULT_SPREADSHEET_ID
**Symptom:** `[usePencairanData] satkerContext: { spreadsheetId: "1hnNCHxmQQ5rjVcxIBvJk5lEdZ8aki4YUMBi1s33cnGI" }`

**Solution:**
1. This means SatkerConfigContext.getUserSatkerSheetId() returned null
2. Follow Issue B troubleshooting above
3. If satker is not in Master Config, update Master Config with missing satker

## Master Config Sheet Setup

**Spreadsheet ID:** `1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ`

**Sheet Name:** `satker_config` (or `Sheet1` if renamed)

**Structure:**
```
A              | B             | C                        | D                        | E                            | F
satker_id      | satker_nama   | pencairan_sheet_id       | pengadaan_sheet_id       | entrikegiatan_sheet_id      | tagging_sheet_id
3210           | BPS Majalengka| 1hnNCHxmQQ...           | 1rvJUdX0rc6...           | 1ShNjmKUkk...              | 14iyeMPMvl...
3209           | BPS Cirebon   | <PENCAIRAN_SHEET_ID_3209>| <PENGADAAN_SHEET_ID_3209>| <ENTRIKEGIATAN_SHEET_ID_...>| <TAGGING_SHEET_ID_3209>
3208           | BPS Kuningan  | <PENCAIRAN_SHEET_ID_3208>| <PENGADAAN_SHEET_ID_3208>| <ENTRIKEGIATAN_SHEET_ID_...>| <TAGGING_SHEET_ID_3208>
```

## Testing Checklist

1. [ ] User 3210 login → lihat data 3210
2. [ ] User 3209 login → lihat data 3209 (tidak 3210)
3. [ ] User 3208 login → lihat data 3208 (tidak 3210)
4. [ ] Dashboard Pencairan load dengan data satker user
5. [ ] Submitting pengadaan goes to user's satker sheet

## Key Code Locations

- **AuthContext:** `src/contexts/AuthContext.tsx` - reads satker from user sheet col F
- **SatkerConfigContext:** `src/contexts/SatkerConfigContext.tsx` - provides sheet ID lookup
- **use-satker-config.ts:** `src/hooks/use-satker-config.ts` - reads Master Config Sheet
- **usePencairanData:** `src/hooks/use-pencairan-data.ts` - uses context to get correct sheet ID
- **useSubmitToPengadaanSheets:** `src/hooks/use-google-sheets-submit-pengadaan.ts` - uses context for submissions

## Console Filtering

To see only multi-satker related logs, in browser console type:
```javascript
// Filter logs
window.localStorage.debug = '*satker*,*Auth*,*pencairan*'
```

Or search for specific patterns:
- `Ctrl+Shift+K` (Firefox) / `Cmd+Option+J` (Mac) to open console
- Type in filter box: `satker`, `Auth`, `pencairan`
