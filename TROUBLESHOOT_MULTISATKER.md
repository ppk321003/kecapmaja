# Multi-Satker Troubleshooting Guide

## Issue: Data masih masuk ke sheet 3210 (bukan satker user)

### Debugging Steps

#### 1. **Browser Console Logs (F12 → Console)**
   
Login dengan user 3209 dan cek logs berikut:

```
[BlockTanggal] satkerContext: {
  isLoading: false,
  configsCount: 3,
  userSatker: "3209",
  spreadsheetId: "1hmWiwNCiYXJ...",  ← Harus BUKAN 3210 ID
  isDefault: false                     ← Harus false!
}
```

**Jika `isDefault: true`** → Config tidak terload atau satker tidak matching

**Jika `configsCount: 0`** → Master Config tidak terbaca


#### 2. **Supabase Functions Logs**

Cek di Supabase → Functions → pencairan-save/pencairan-update → Logs

Harus melihat:
```
[pencairan-save] Received request: { satker: "3209", id: "..." }
[pencairan-save] Using spreadsheetId: { 
  satker: "3209", 
  spreadsheetId: "1hmWiwNCiYXJ...",
  isDefault: false
}
Found pencairan sheet ID for satker 3209: 1hmWiwNCiYXJ...
```

**Jika `isDefault: true`** → Lookup failed, cek Master Config


#### 3. **Verify Data Flow**

Login test dengan user 3209:

```javascript
// Di browser console, ketik:
JSON.parse(localStorage.getItem('simaja_user')).satker
// Output: "3209" ✓
```

#### 4. **Master Config Sheet Validation**

Check: https://docs.google.com/spreadsheets/d/1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ/edit

**Harus ada 3 rows (plus header):**
```
satker_id │ satker_nama        │ pencairan_sheet_id   │ pengadaan_sheet_id  │ entrikegiatan_sheet_id │ tagging_sheet_id
3210      │ BPS Kab. Majalengka│ 1hnNCHxmQQ5r...     │ 1rvJUdX0rc6...     │ 1ShNjmKUkk...          │ 14iyeMPMvl...
3209      │ BPS Kab. Cirebon   │ 1hmWiwNCiYXJ...     │ 1Ve6Z2kgY0s...     │ 1rqBic0W_6R...          │ 1pzJz9mRmET...
3208      │ BPS Kab. Kuningan  │ 1lfAlEEX-2EZ...     │ 11JK85eZElZ...     │ 1abIx6Zzhp2...          │ 1FVM1sG_JlFk...
```

**Verify:**
- [ ] Sheet name adalah "satker_config"
- [ ] Column A bukan kosong
- [ ] Tidak ada typo di satker_id (3209 bukan 3209B, dll)
- [ ] Column B-F semua terisi (tidak ada yang kosong)


#### 5. **Check Google Sheets Permissions**

Pastikan Supabase service account punya akses ke:
- [ ] User sheet (untuk login)
- [ ] Master Config sheet (untuk mappings)
- [ ] Pencairan 3209 sheet (untuk data)
- [ ] Tagging 3209 sheet (untuk perjalanan)


---

## Common Issues & Fixes

### Issue A: `isDefault: true` tapi seharusnya false

**Penyebab 1: Master Config belum load**
```
isLoading: true, configsCount: undefined
```
→ Tunggu 2-3 detik, Master Config masih di-fetch

**Penyebab 2: Master Config data tidak terbaca**
```
isLoading: false, configsCount: 0
```
→ Check Master Config sheet name (harus "satker_config")
→ Check akses Supabase ke Master Config

**Penyebab 3: Satker tidak ada di config**
```
isLoading: false, configsCount: 3, userSatker: "3209", spreadsheetId: DEFAULT
```
→ Cek apakah row untuk 3209 ada di Master Config
→ Cek apakah ada typo (spasi, uppercase, dll)


### Issue B: Data masuk ke 3210 tapi logs menunjukkan 3209

**Penyebab: Lookup mencari satker tapi tidak ketemu**
- Master Config mungkin kosong untuk satker 3209
- atau Supabase function lookup gagal silent

**Solusi:**
1. Cek Supabase Functions → pencairan-save → Logs
2. Cari: `Found pencairan sheet ID for satker 3209`
3. Jika tidak ada → lookup gagal, periksa data di Master Config


### Issue C: Submit form tapi satker tidak dikirim

**Penyebab: SubmissionForm tidak include satker dalam body**

Verify di DevTools → Network:
1. Buka Usulan Pencairan
2. Submit form
3. Cek Network tab → pencairan-save
4. Request Payload harus include: `"satker": "3209"`

Jika tidak ada → Cek [src/components/pencairan/SubmissionForm.tsx](src/components/pencairan/SubmissionForm.tsx) line ~310


### Issue D: Block Tanggal masih 3210

**Penyebab: BlockTanggal satkerContext belum ready saat loadExistingData dipanggil**

Solusi: Add useEffect dependency pada spreadsheetId di BlockTanggal

Seharusnya ada:
```typescript
useEffect(() => {
  if (spreadsheetId && spreadsheetId !== DEFAULT_SPREADSHEET_ID) {
    loadExistingData();
  }
}, [spreadsheetId]);
```


---

## Files to Check

1. **Frontend:**
   - ✓ [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx#L125) - line 125 should read `"user!A:F"` (6 kolom)
   - ✓ [src/contexts/SatkerConfigContext.tsx](src/contexts/SatkerConfigContext.tsx#L55) - should return null context, not error
   - ✓ [src/components/pencairan/SubmissionForm.tsx](src/components/pencairan/SubmissionForm.tsx#L312) - should pass `satker: user?.satker`
   - ✓ [src/pages/BlockTanggal.tsx](src/pages/BlockTanggal.tsx#L506) - should use `spreadsheetId` variable

2. **Backend (Supabase Functions):**
   - ✓ [supabase/functions/pencairan-save/index.ts](supabase/functions/pencairan-save/index.ts#L200) - should lookup satker
   - ✓ [supabase/functions/pencairan-update/index.ts](supabase/functions/pencairan-update/index.ts#L192) - should lookup satker

3. **Configuration:**
   - ✓ Master Config Sheet ID: `1CBpS-rhb5pSSHFoleUoRa8D8CGeMh61tCoF82S0W0cQ`
   - ✓ Master Config Sheet name: `satker_config`
   - ✓ User sheet range di AuthContext: `user!A:F` (bukan A:D!)


---

## Quick Checklist

- [ ] User sheet col F (satker) terisi untuk user 3209
- [ ] Master Config sheet memiliki row untuk 3209
- [ ] Master Config sheet name adalah "satker_config"
- [ ] Supabase service account punya akses ke semua sheets
- [ ] AuthContext membaca dari A:F (bukan A:D)
- [ ] SubmissionForm pass satker ke Cloud Functions
- [ ] BlockTanggal menampilkan console log dengan correct spreadsheetId
- [ ] Cloud Functions mencatat "[pencairan-save] Using spreadsheetId" dengan isDefault: false

Setelah semua ✓, test:
1. Login dengan user 3209
2. Lihat BlockTanggal → console harus show spreadsheetId untuk 3209
3. Buat Usulan Pencairan → data harus go ke 3209 sheet
4. Data harus tampil di BlockTanggal dari 3209, bukan 3210

---

## Debug Mode

To enable verbose logging, add to console:

```javascript
localStorage.setItem('DEBUG_MULTISATKER', 'true');
location.reload();
```

Logs akan lebih detailed dan membantu troubleshooting.
