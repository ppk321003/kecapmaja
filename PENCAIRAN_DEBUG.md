# Pencairan Submission Debug Guide

## Issue
Usulan Pencairan masih menyimpan ke sheet 3210 padahal UI menampilkan satker 3209 dengan benar.

## Debug Steps

### Step 1: Check Browser Console
Login dengan user 3209, buka DevTools (F12 → Console), buat Usulan Pencairan baru.

**Cek log ini:**
```
[SubmissionForm] Creating new pencairan: {
  id: "...",
  userSatker: "3209",
  timestamp: "2026-01-27T..."
}
```

**Jika `userSatker: ""` atau `undefined`:**
→ User satker tidak terbaca dari localStorage
→ Kemungkinan login baru diperlukan

---

### Step 2: Check Supabase Functions Logs

Go to: **Supabase Dashboard → Functions → pencairan-save → Logs**

**Cari logs berikut setelah submit:**

```
[pencairan-save] Received request: { satker: "3209", id: "..." }
[pencairan-save] Using spreadsheetId: { satker: "3209", spreadsheetId: "1hmWiwNCiYXJ...", isDefault: false }
[getPencairanSheetIdBySatker] Looking up satker: 3209
[getPencairanSheetIdBySatker] Master config loaded, rows count: 4
[getPencairanSheetIdBySatker] Checking row 1: satker_id="3210"
[getPencairanSheetIdBySatker] Checking row 2: satker_id="3209"
[getPencairanSheetIdBySatker] ✓ Found pencairan sheet ID for satker 3209: 1hmWiwNCiYXJ...
```

---

### Step 3: Identify the Issue

Based on logs, the problem could be:

**A) `userSatker: ""` atau undefined**
- User satker tidak tersimpan saat login
- **Solution:** Verify user sheet col F punya data untuk user tersebut
- **Test:** `localStorage.getItem('simaja_user')` di console

**B) `satker` tidak dikirim ke Cloud Function**
- SubmissionForm tidak include satker di body
- **Check:** DevTools → Network → pencairan-save → Request Payload
- **Should contain:** `"satker": "3209"`

**C) Master config tidak terload**
- `[getPencairanSheetIdBySatker] Master config loaded, rows count: 0`
- **Solution:** 
  - Verify Master Config sheet exists: `1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ`
  - Verify sheet name: "satker_config"
  - Verify Supabase service account has access

**D) Satker tidak matching**
- `[getPencairanSheetIdBySatker] Satker 3209 not found in config`
- **Solution:**
  - Check Master Config sheet, row untuk 3209 ada?
  - Check untuk typo/spasi di satker_id (harus "3209" bukan "3209 " atau "32 09")
  - Verify col A (satker_id) terisi untuk row 3209

**E) Lookup error tapi fallback ke default**
- `[getPencairanSheetIdBySatker] Satker 3209 not found in config, using default sheet ID`
- isDefault: true
- **Solution:** Data ada di Master Config tapi tidak matching
  - Check exact value di col A row 3209 di Google Sheets
  - Mungkin ada leading/trailing spaces

---

## Verification Checklist

- [ ] Login dengan user 3209, cek `localStorage.getItem('simaja_user')` menampilkan satker "3209"
- [ ] Buat Usulan Pencairan baru
- [ ] Console logs menampilkan `[SubmissionForm] Creating new pencairan: { userSatker: "3209", ... }`
- [ ] Supabase Functions logs menampilkan `[pencairan-save] Received request: { satker: "3209", ... }`
- [ ] Logs menampilkan `[getPencairanSheetIdBySatker] ✓ Found pencairan sheet ID for satker 3209: ...`
- [ ] isDefault: false (bukan true)
- [ ] Cek Google Sheets pencairan 3209 → data baru harus masuk ke sana
- [ ] Bukan ke pencairan 3210

---

## Quick Verification

**In browser console:**
```javascript
// Check user satker
const user = JSON.parse(localStorage.getItem('simaja_user'));
console.log('User satker:', user?.satker);

// Should output: "3209" (bukan empty atau undefined)
```

**In Network tab (DevTools → Network):**
1. Click filter, search "pencairan-save"
2. Buat Usulan Pencairan
3. Find pencairan-save request
4. Click → Payload tab
5. Should show:
```
{
  "id": "...",
  "satker": "3209",
  "uraianPengajuan": "...",
  ...
}
```

---

## Master Config Validation

**Spreadsheet:** https://docs.google.com/spreadsheets/d/1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ/edit

**Verify struktur (exact matching):**

| Row | satker_id | satker_nama        | pencairan_sheet_id (Col C) | ... |
|-----|-----------|-------------------|---------------------------|-----|
| 1   | satker_id | satker_nama       | pencairan_sheet_id        | ... |
| 2   | 3210      | BPS Kab. Majalengka | 1hnNCHxmQQ5r... | ... |
| 3   | 3209      | BPS Kab. Cirebon   | 1hmWiwNCiYXJ... | ... |
| 4   | 3208      | BPS Kab. Kuningan  | 1lfAlEEX-2EZ... | ... |

**Check:**
- [ ] Sheet name adalah "satker_config" (bukan "Config" atau "satker_configs")
- [ ] Row 3 col A exactly "3209" (tanpa spasi)
- [ ] Row 3 col C (pencairan_sheet_id) filled (tidak kosong)
- [ ] No empty rows di antara

---

## Common Issues & Solutions

### Issue: isDefault=true (menggunakan sheet 3210)

**Cause 1: Master config belum load/empty**
```
rows count: 0 atau 1
```
→ Verify Master Config sheet name ("satker_config" exact)
→ Verify Master Config sheet exists and data terisi
→ Check Supabase service account permissions

**Cause 2: Satker tidak match**
```
Checking row 2: satker_id="3209"
Satker 3209 not found in config
```
→ Row 2 col A value tidak "3209"
→ Mungkin ada typo, spasi, atau extra characters
→ Buka Master Config sheet, select col A row 3, check exact value

**Cause 3: pencairan_sheet_id kosong**
```
✓ Found pencairan sheet ID for satker 3209: [empty]
```
→ Row 3 col C (pencairan_sheet_id) kosong
→ Fill dengan sheet ID untuk pencairan 3209

---

## Next Steps

1. **Deploy latest code**
2. **Test with user 3209**
3. **Check Step 1 & 2 logs above**
4. **Share logs with specific issue**
5. **If still not working:**
   - Share screenshot Master Config sheet
   - Share console logs from DevTools
   - Share Supabase Functions logs

---

## Key Files to Check

- ✅ [src/components/pencairan/SubmissionForm.tsx](src/components/pencairan/SubmissionForm.tsx#L315) - Line 315 should log user satker
- ✅ [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx#L125) - Line 125 should read `user!A:F`
- ✅ [supabase/functions/pencairan-save/index.ts](supabase/functions/pencairan-save/index.ts#L102) - Helper function with detailed logs
- ✅ [supabase/functions/pencairan-update/index.ts](supabase/functions/pencairan-update/index.ts#L100) - Same helper function
- ✅ Master Config Sheet: `1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ`
