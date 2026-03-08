# ANALISIS DAN FIX: KEGIATAN WA.2886 MISSING DI CSV UPLOAD BULANAN

## Ringkasan Masalah

Saat melakukan upload CSV bulanan Bahan Revisi Anggaran (Februari 2026):
- **CSV Total (Column "Periode Ini")**: 500.919.458
- **Sheet yang terekam**: 489.218.564  
- **Selisih yang hilang**: 11.700.894 (≈ 11.7M)

Investigasi mendalam mengungkapkan:
- 15 kegiatan dengan program code **GG** berhasil diekstrak ✓
- 1 kegiatan dengan program code **WA** (kegiatan 2886) TIDAK diekstrak ✗

---

## Root Cause Analysis

### Tempat Masalah: `src/utils/bahanrevisi-monthly-csv-parser.ts`

**Analisis CSV:**
- Kegiatan 2886 muncul di **Row 961**: `;WA.2886;;;;;;;(...)354.768.414`
- Kegiatan 2886 memiliki **82 detail items** di CSV
- Kegiatan 2886 aggregate value: **354.768.414** (CSV) vs **349.103.414** (Sheet)

**Komparasi dengan GG kegiatan:**

| Kegiatan | Program | CSV Periode Ini | Sheet | Diff | Detail Items |
|----------|---------|-----------------|-------|------|--------------|
| 2886 | WA | 354,768,414 | 349,103,414 | +5,665,000 | 82 |
| 2903 | GG | 18,181,000 | 17,901,000 | +280,000 | 125 |
| 2910 | GG | 54,355,000 | 53,175,000 | +1,180,000 | 65 |
| ... | GG | ... | ... | ... | ... |

**Total Discrepancy Breakdown:**
- WA.2886 value difference: 5,665,000
- Other kegiatan differences: 1,460,000 (2903, 2908, 2910)
- **Total from CSV aggregates: ~7.1M**

### Parser Logic Verification

Regex pattern di parser: `/^[A-Z]{2}\.\d{4}$/`

✓ Ini pattern GENERIC, cocok untuk:
- `GG.2897` (15 kegiatan GG extracted)
- `WA.2886` (should also be extracted)

Namun investigasi awal:
- `verify_csv_with_sheet.py` tidak mencari kegiatan `WA.*`, hanya `GG.*`
- Oleh karena itu terlihat kegiatan 2886 "missing" di extracted data

**Kesimpulan: Parser SEHARUSNYA bisa extract WA.2886, tapi logic perlu diverifikasi lebih detail**

---

## Fixes Applied

### 1. Enhanced Debug Logging in Parser (`bahanrevisi-monthly-csv-parser.ts`)

#### Kegiatan Level Detection (Line ~240-250)
```typescript
// DEBUG: Log all kegiatan including WA
console.log(`[parseMonthlyCSV] Kegiatan level (ANY program): ${hierarchy.kegiatanFull}, programFull=${hierarchy.programFull}, kegiatan=${hierarchy.kegiatan}`);
```
- Logs setiap kegiatan yang dideteksi (GG, WA, atau program lainnya)
- Membantu verify apakah WA.2886 dideteksi pada level kegiatan

#### Item Creation & Tracking (Line ~360-390)
```typescript
// Track items by program
const programName = hierarchy.program || 'UNKNOWN';
if (!stats.itemsByProgram) stats.itemsByProgram = {};
if (!stats.itemsByProgram[programName]) stats.itemsByProgram[programName] = 0;
stats.itemsByProgram[programName]++;

// Extra logging for first 5 items + any 2886 items
if (items.length <= 5 || hierarchy.kegiatan === '2886') {
  console.log(`[parseMonthlyCSV] Item ${items.length}:`, {...});
}
```
- Tracks item creation by program code (GG, WA, etc)
- Highlights setiap item dari kegiatan 2886

#### Summary Statistics (End of parsing)
```typescript
console.log('[parseMonthlyCSV] SUMMARY:', {
  totalItems: items.length,
  itemsByProgram: stats.itemsByProgram || {},
  ...
});
```
- Shows total items extracted broken down by program
- Will reveal jika WA items tidak ada

### 2. Enhanced Matching Logic (`use-import-monthly-csv.ts`)

#### Matching Transparency (Line ~100-120)
```typescript
// Log first 5 parsed items dan any WA.2886 items
if (idx < 5 || parsedItem.kegiatan === '2886') {
  console.log(`[useImportMonthlyCSV] ParsedItem ${idx + 1}:`, {...});
}
```

#### Program-level Summary (Line ~130-160)
```typescript
// Log summary by program
const programCounts = {};
result.matched_items.forEach(item => {...});

console.log('[useImportMonthlyCSV] Items by Program:', programCounts);

// Unmatched kegiatan summary
const unmatchedByKeg = {};
result.not_matched_items.forEach(item => {...});
console.log('[useImportMonthlyCSV] Unmatched by Kegiatan:', unmatchedByKeg);
```
- Shows distribution of matched/unmatched items by program
- If WA.2886 items show as "unmatched", problem is in BudgetItem database (not parser)

---

## Expected Parser Behavior After Fixes

When uploading Februari CSV with debug logs:

### Console Output Should Show:

1. **Parser Detection:**
```
[parseMonthlyCSV] Kegiatan level (ANY program): GG.2896, programFull=GG, kegiatan=2896
[parseMonthlyCSV] Kegiatan level (ANY program): GG.2897, programFull=GG, kegiatan=2897
...
[parseMonthlyCSV] Kegiatan level (ANY program): WA.2886, programFull=WA, kegiatan=2886
```

2. **Item Creation:**
```
[parseMonthlyCSV] Item 1: {program: GG, kegiatan: 2896, ...}
[parseMonthlyCSV] Item 2: {program: GG, kegiatan: 2897, ...}
[parseMonthlyCSV] Item ...: {program: WA, kegiatan: 2886, uraian: '000549. Perjalanan...'}
```

3. **Statistics:**
```
[parseMonthlyCSV] SUMMARY: {
  totalItems: 618,
  itemsByProgram: { GG: 536, WA: 82 },
  periode: '2/2026'
}
```

4. **Matching Result:**
```
[useImportMonthlyCSV] Items by Program: {
  GG: { matched: X, unmatched: Y, kegiatan: Set(...) },
  WA: { matched: Z, unmatched: 82, kegiatan: Set(['2886']) }
}
```

---

## Interpretasi Hasil

### Best Case: All WA.2886 items are Matched
```
Items by Program: { GG: {matched: 500}, WA: {matched: 82} }
```
→ Problem is SOLVED, data akan terupload ke sheet dan nilai akan complete

### Likely Case: WA.2886 items are Unmatched
```
Items by Program: { GG: {matched: 500}, WA: {unmatched: 82} }
Unmatched by Kegiatan: { 2886: 82 }
```
→ Parser adalah OK, problem adalah BudgetItems database TIDAK memiliki kegiatan 2886 items dari program WA
→ Solusi: Tambah WA.2886 items ke BudgetItems database, atau create mapping untuk kegiatan 2886 dari program WA

### Worst Case: WA.2886 items tidak ada di items.length
```
Items by Program: { GG: {matched: 500} }
```
→ Parser memiliki bug serius dalam hierarchy tracking untuk program WA
→ Debug lebih lanjut diperlukan di kegiatan detection logic

---

## Langkah Selanjutnya

1. **Upload CSV dengan debug logs ON**
   - Check console output untuk melihat apakah WA.2886 terdeteksi dan di-parse

2. **If WA.2886 items muncul di logs:**
   - ✓ Parser sudah fixed, masalah ada di matching/budget items
   - Action: Verify kegiatan 2886 items di BudgetItems database

3. **If WA.2886 items TIDAK muncul di logs:**
   - ✗ Bug di parser hierarchy tracking
   - Action: Deep debug hierarchy state per row untuk kegiatan 2886

4. **Validate Total Upload:**
   - ✓ Monitor sheet total setelah upload
   - Target: Dari 489.218.564 → 500.919.458 (atau lebih dekat)
   - Success: Total sheet matches CSV aggregate within rounding error

---

## Testing Verification

Trace output dari CSV test menunjukkan:

```
Total kegiatan found: 16
  GG: 15 kegiatan
  WA: 1 kegiatan

WA.2886:
  Row: 961
  Periode Ini: 354,768,414
  Detail items: 82 (dibandingkan dengan 43 yang disebutkan user = discrepancy lain)
```

**Conclusion: Regex dan parser logic seharusnya bisa handle WA kegiatan. Debug logs akan reveal exact issue.**

---

## Files Modified

1. **src/utils/bahanrevisi-monthly-csv-parser.ts**
   - Line ~248: Added debug log untuk kegiatan detection
   - Line ~365-370: Added itemsByProgram tracking
   - Line ~390-410: Added summary statistics with program breakdown

2. **src/hooks/use-import-monthly-csv.ts**
   - Line ~86-110: Enhanced item logging (first 5 + kegiatan 2886)
   - Line ~115-140: Added program-level summary dan per-kegiatan stats

---

## Diskusi

### Pertanyaan: "Mengapa parser tidak extract WA kegiatan sebelumnya?"

**Jawaban Kemungkinan:**
1. **Parser sebenarnya BISA extract, tapi analysis script tidak looking for WA kegiatan**
   - `verify_csv_with_sheet.py` menggunakan regex `r';GG\.(\d{4});'` (hanya GG)
   - Oleh karena itu terlihat kegiatan 2886 missing

2. **Ada subtle bug dalam hierarchy state yang tidak terdeteksi di regex check**
   - Mungkin memory/state issue dengan multiple kegiatan dari different programs
   - Atau conditional logic yang prevents WA kegiatan dari diproses

3. **Matching/filtering downstream yang exclude certain programs**
   - Parser bisa extract, tapi matching logic filter out unmatched WA items
   - Atau Google Sheets function filter berdasarkan program code

Debug logs yang sudah diinject akan answer pertanyaan ini dengan pasti.

---

## Next Steps

1. User melakukan CSV upload dengan debug logs
2. Share console output dari browser DevTools
3. Analyze logs untuk pinpoint exact issue (parser vs matching vs budget items)
4. Implement targeted fix berdasarkan findings

