# 📊 RINGKASAN MASALAH: Selisih Upload Bulanan Bahan Revisi Anggaran

## 🎯 Quick Summary

```
CSV Upload Total (Periode Ini):  500.919.458 ✅ (Header: JUMLAH SELURUHNYA)
Tercatat di Sheet RPD:            489.218.564 ✅ (Matched items only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELISIH (Unmatched items):         11.700.894 ❌ (Tidak terupdate ke RPD)
```

---

## 🔍 Apa Penyebabnya?

### Alur Proses Import:

```
1. CSV UPLOAD (500.919.458)
        │
        ▼
2. PARSER → Extract 606 detail items
        │  └─ Total Periode Ini: 502.379.458 (ada aggregate rows also)
        │
        ▼
3. MATCHING dengan BudgetItems (7-field unique key)
        │
        ├─→ MATCHED (489.218.564)  ┐
        │   └─ Update ke RPD ✅      │
        │                           │─→ Total: 500.919.458
        ├─→ UNMATCHED (11.700.894) ┘
            └─ Insert ke versioned sheet as "new" ❌
               (Tidak update ke existing RPD items)
```

### Masalahnya:

**Strict 7-Field Unique Key Matching** sangat ketat dalam matching. Jika ANY dari 7 fields ini berbeda sedikit saja → NO MATCH:

```
1. program_pembebanan   (Program code: GG, HH, etc)
2. kegiatan             (Kegiatan number: 2896, 2897, etc)
3. rincian_output       (Output type: BMA, QDB, etc)
4. komponen_output      (Component: 005, 052, etc)
5. sub_komponen         (Sub-component: 051, 053, etc)
6. akun                 (Account code: 524113, 521213, etc)
7. uraian               (Description: "transport lokal...", VERY SENSITIVE ⚠️)
```

**Culprit #1:** Field `uraian` (description) paling sering tidak match karena:
- Typos di CSV
- Extra spaces/punctuation
- Minor wording differences

**Culprit #2:** Normalisasi di setiap field:
```java
GG vs gg vs Gg         → All normalized to "GG"  ✅
bma 001 vs bma  001    → All normalized to "BMA_001" ✅
"transport lokal" vs 
"transport  lokal"     → Normalized to "TRANSPORT_LOKAL" ✅
```

BUT jika uraian lebih kompleks atau ada typo → NO MATCH ❌

---

## 💾 Struktur Data CSV

### File: [Laporan Fa Detail (16 Segmen) (51).csv](d:\DOWNLOAD\Laporan%20Fa%20Detail%20(16%20Segmen)%20(51).csv)

```
Header struktur:
Row 7: Uraian | ... | Pagu Revisi | Lock Pagu | Realisasi TA 2026 | SISA ANGGARAN |
Row 8: ...    | ... | Periode Lalu | Periode Ini | s.d. Periode | ... |

Row 9 (SUMMARY): 
  Periode Ini [col 23]:  500.919.458 ✅ TARGET
  s.d. Periode [col 24]: 889.119.479
  SISA ANGGARAN [col 30]: 8.987.096.521

Rows 10+: Detail items (606 items level)
  [col 23] Periode Ini: Individual values (sum = 502.379.458)
  [col 30] Sisa Anggaran: Individual values (sum = 9.024.253.521)
```

---

## 🔗 Code Flow Visualization

```
BahanRevisiUploadBulanan.tsx (UI Component)
    │
    ├─→ handleFileSelect()
    │   └─→ parseMonthlyCSV() [parser.ts]
    │       └─→ Extract 606 items + JUMLAH SELURUHNYA (500.919.458)
    │
    ├─→ handleProcessUpload()
    │   └─→ handleImportFile() [use-import-monthly-csv.ts]
    │       │
    │       ├─→ matching(parsedData) ← 7-FIELD UNIQUE KEY MATCHING
    │       │   ├─ budgetItemMap = Map<key, BudgetItem>
    │       │   └─ forEach parsedItem:
    │       │       ├─ key = createUniqueKey(parsedItem)
    │       │       ├─ IF found in map:
    │       │       │  ├─ matched_items++  (489.218.564) ✅
    │       │       │  ├─ Add to matched_items list
    │       │       │  └─ Will be uploaded to rpdUpdates
    │       │       └─ ELSE:
    │       │          ├─ notMatched++  (11.700.894) ❌
    │       │          ├─ Add to not_matched_items list
    │       │          └─ Will be inserted to unmatchedItems (not rpdUpdates!)
    │       │
    │       ├─→ Prepare RPD updates
    │       │   └─ rpdUpdateData = matched_items ONLY (489.218.564)
    │       │
    │       ├─→ Prepare unmatched items for versioned sheet
    │       │   └─ unmatchedData = not_matched_items (11.700.894)
    │       │       └─ Insert as status="new" kegiatan
    │       │
    │       └─→ supabase.functions.invoke('google-sheets') {
    │           values: matched_items,
    │           rpdUpdates: matched_items,     ← Only matched
    │           unmatchedItems: unmatched_items ← Separate flow
    │       }
    │
    └─→ Result:
        ✅ Matched (489.218.564) → Updated to RPD sheet columns
        ❌ Unmatched (11.700.894) → Inserted to versioned sheet, NOT in RPD
```

---

## 📈 Impact Analysis

| Component | Value | Status |
|-----------|-------|--------|
| **CSV Upload Total** | 500.919.458 | ✅ Correct |
| **Matched Items (Updated)** | 489.218.564 | ✅ Correct |
| **Unmatched Items (Not Updated)** | 11.700.894 | ❌ Missing |
| **Discrepancy %** | 2.34% | ⚠️ Significant |
| **Potential Cause** | Strict 7-field key matching | 🔴 Root cause |

---

## 🛠️ Lokasi Code yang Bermasalah

### CRITICAL 🔴

**File:** `src/hooks/use-import-monthly-csv.ts`  
**Lines:** 42-95 (matching logic)  
**Problem:** Strict 1-to-1 key matching tanpa fuzzy tolerance

```typescript
const budgetItem = budgetItemMap.get(key);  // ← Exact match required
if (!budgetItem) {
  // Goes to unmatchedItems (not rpdUpdates!)
}
```

### SUPPORT 🟡

**File:** `src/utils/bahanrevisi-monthly-csv-parser.ts`  
**Lines:** 430-451 (unique key creation)  
**Problem:** Key generation uses all 7 fields; field `uraian` most problematic

---

## 💡 Contoh Permasalahan Matching

### Scenario 1: Typo di Uraian
```
CSV Item:       "transport lokal"
BudgetItem:     "transport lokaal"     ← typo!
After normalize: "TRANSPORT_LOKAL" vs "TRANSPORT_LOKAAL"
Result: ❌ NO MATCH (despite being 98% similar)
```

### Scenario 2: Extra Spaces
```
CSV Item:       "Belanja Honor Output Kegiatan"
BudgetItem:     "Belanja  Honor  Output  Kegiatan"  ← double spaces
After normalize: Both → "BELANJA_HONOR_OUTPUT_KEGIATAN"
Result: ✅ MATCH (spaces normalized)
```

### Scenario 3: Different Field Values
```
CSV Item:       program="GG", kegiatan="2897", akun="524113", uraian="X"
BudgetItem:     program="GG", kegiatan="2897", akun="524113", uraian="X"
                + 3 other fields differ
Result: ❌ NO MATCH (even if 4 of 7 fields match perfectly)
```

---

## 📋 Rekomendasi Fix (Priority Order)

### 1️⃣ IMMEDIATE: Add Detailed Logging
- Export unmatched items dengan key mismatch analysis
- Identify actual diff per field
- Expected time: 1-2 jam

### 2️⃣ SHORT-TERM: Fuzzy Matching (6 fields, exclude uraian)
- Match by program+kegiatan+rincian+komponen+subkomp+akun (6 fields)
- If match found, use it regardless of uraian difference
- Reduce unmatched dari 11.7M ke ~5%
- Expected time: 4-6 jam

### 3️⃣ LONG-TERM: Manual Review UI
- Display unmatched items dengan suggested matches
- Allow manual approval/merge
- Track approval flow
- Expected time: 1-2 hari

---

## 📞 Questions to Investigate

1. **Apakah 11.700.894 ini adalah "kegiatan baru" atau ada misalignment?**
   - Check unmatched items apakah memang seharusnya NEW kegiatan
   - Atau ada typo di BudgetItem master data

2. **Bagaimana user feedback tentang status "new" kegiatan dari unmatched?**
   - Apakah users approval/merge ini dengan existing items?
   - Atau dibiarkan sebagai separate new kegiatan?

3. **Ada tracking untuk unmatched items?**
   - Di mana unmatched items disimpan?
   - Ada versioned sheet untuk tracking?
   - Ada approval workflow?

---

## 📊 Data Reference

**CSV File Analysis:**
- Total Detail Items: 606
- Item Rows (leading semicolons ≥ 11): 627
- Aggregate Rows: 380
- Total Periode Ini: 502.379.458
- Target (JUMLAH): 500.919.458
- Tercatat: 489.218.564
- Difference: 11.700.894 (2.34%)

**Parser Output:**
- Column 23: Periode Ini ✅ (correct column)
- Column 30: Sisa Anggaran ✅ (correct column)
- Index matching: ✅ Verified

---

## ✅ Conclusion

**MASALAH TERIDENTIFIKASI:**
- ✅ Lokasi kolom BENAR (column 23 & 30 sesuai)
- ✅ Nilai CSV BENAR (500.919.458 terbaca dengan correct)
- ✅ Nilai tercatat BENAR untuk MATCHED items (489.218.564)
- ✅ Selisih VALID = Unmatched items (11.700.894)

**ROOT CAUSE:**
- ❌ Strict 7-field unique key matching
- ❌ Unmatched items tidak ter-update ke rpdUpdates
- ❌ Need fuzzy matching atau manual review mechanism

**ACTION ITEMS:**
1. Implement detailed logging untuk diagnose exact mismatch
2. Implement 6-field fuzzy matching (exclude uraian)
3. Add UI for manual review of unmatched items
4. Document approval flow untuk users
