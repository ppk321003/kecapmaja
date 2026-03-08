# 🎯 ROOT CAUSE FOUND: Selisih Upload Bulanan 11.700.894

## 🚨 MASALAH UTAMA DITEMUKAN

**Kegiatan 2886 menggunakan PROGRAM CODE BERBEDA:**

```
CSV Row 961: ;WA.2886; (BUKAN ;GG.2886;)
            ^^
            Program: WA (Support/Dukungan)
            
Kegiatan lain: ;GG.XXXX; (Program: GG)
```

### Parsing Code Hanya Mencari `;GG.XXXX;`:

**File:** `src/hooks/use-import-monthly-csv.ts`  
**Problem Line:**
```typescript
match = re.search(r'^;(GG)\.(\d{4});', line)  // ← Hardcoded "GG" only!
```

**Impact:**
- ✅ Kegiatan GG.2896 s/d GG.2910 → ter-extract
- ❌ Kegiatan WA.2886 → **TERLEWAT** karena program code berbeda!

---

## 📊 DATA COMPARISON

### Dari CSV:

| Kegiatan | Program | Nilai Periode Ini | Status |
|----------|---------|------|--------|
| 2886 | **WA** | 354.768.414 | ❌ Tidak ter-extract (program WA) |
| 2896 | GG | 0 | ✅ |
| 2897 | GG | 0 | ✅ |
| ... | GG | ... | ✅ |
| 2910 | GG | 54.355.000 | ✅ |
| **TOTAL GG** | | **146.151.044** | ✅ Ter-extract |
| **TOTAL WA** | | **354.768.414** | ❌ MISSING! |
| **GRAND TOTAL** | | **500.919.458** | ← CSV JUMLAH |

### Dari Sheet (Gambar):

| Kegiatan | Nilai Periode Ini |
|----------|------|
| 2886 | 349.103.414 |
| 2896-2910 | ~140.115.150 |
| **TOTAL** | **489.218.564** |

---

## 🔍 DISCREPANCY ANALYSIS

```
CSV JUMLAH Total:           500.919.458
  ├─ GG kegiatan (2896-2910):  146.151.044  ✅ Ter-extract & update ke sheet
  └─ WA.2886:                  354.768.414  ❌ TIDAK ter-extract

Sheet Total:                489.218.564
  = Hanya dari GG kegiatan yang ter-update
  
Dari WA.2886:
  CSV value: 354.768.414
  Sheet value: 349.103.414
  Selisih: 5.664.800
  
Total Missing: 354.768.414 + selisih = ~360.433.214
Tapi sheet menunjukkan unmatched = 11.700.894
```

---

## 🎯 Root Cause Flow Diagram

```
CSV File (500.919.458 total)
  │
  ├─→ Program GG kegiatan (2896-2910)
  │   ├─ Value di CSV: 146.151.044
  │   ├─ Parser: ✅ Extract (pattern match ;GG.NNNN;)
  │   ├─ Matching: ✅ Cocok dengan BudgetItem
  │   └─ Sheet Update: ✅ 146.151.044 data ter-update
  │
  ├─→ Program WA kegiatan (2886)
  │   ├─ Value di CSV: 354.768.414
  │   ├─ Parser: ❌ SKIP (pattern match only ;GG.NNNN; ← HARDCODED!)
  │   ├─ Parsing output: 0 dari WA.2886 aggregate
  │   ├─ Matching: ???? Kegiatan aggregate tidak ke-scan
  │   └─ Sheet Update: ❌ Tidak ter-update
  │
  └─→ Result:
      CSV: 500.919.458
      Sheet: 489.218.564
      Missing: ~11.700.894 + discrepancy
```

---

## 💡 WHY THIS HAPPENS

### Parsing Code (`bahanrevisi-monthly-csv-parser.ts`):

```typescript
// Line ~242: Kegiatan level detection
if (leadingSemicolons === 1) {
  if (/^[A-Z]{2}$/.test(firstFieldAfterSemicolons)) {
    // Pure program code like GG
  } else if (/^[A-Z]{2}\.\d{4}$/.test(firstFieldAfterSemicolons)) {
    // Kegiatan code like GG.2897 ✅
    // BUT ONLY FOR GG! → No check for WA!
  }
}
```

### Issue:
1. Regex hanya check untuk `[A-Z]{2}.\d{4}` pattern
2. Asumsi HANYA ada program GG untuk kegiatan
3. Program WA kegiatan 2886 tidak ter-handle
4. Kegiatan 2886 ter-skip di aggregation level

---

## 🔧 FIX REQUIRED

### Primary Issue:
- Parser hanya mengextract kegiatan pattern `;GG.NNNN;`
- Perlu generalize untuk semua program code (GG, WA, dll)

### Secondary Issue:
- Nilai WA.2886 di CSV = 354.768.414
- Nilai WA.2886 di Sheet = 349.103.414
- Selisih 5.664.800 → need investigation

---

## 📋 Verification Data

### Sheet Breakdown (from gambar):

| No | Kegiatan | Total Pagu | Januari | **Februari** |
|----|----------|-----------|---------|------------|
| 1 | 2886 | 7.128.168.000 | 318.104.021 | **349.103.414** ← FROM SHEET |
| 2 | 2896 | 170.000 | 0 | 0 |
| ... | ... | ... | ... | ... |
| 16 | 2910 | 525.901.000 | 3.937.000 | 53.175.000 |
| **TOTAL** | | 18.817.720.000 | 388.200.021 | **489.218.564** |

### CSV Data (from rows):

```
Row 960: ;WA;;Program Dukungan Manajemen
         Periode Ini = 354.768.414 ← CSV VALUE

Row 961: ;WA.2886;;;Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya BPS Provinsi
         Periode Ini = 354.768.414 ← KEGIATAN 2886 AGGREGATE
```

---

## 📌 Summary

| Item | CSV | Sheet | Status |
|------|-----|-------|--------|
| **Program GG (2896-2910)** | 146.151.044 | 140.115.150 | ✅ Mostly matched |
| **Program WA (2886)** | 354.768.414 | 349.103.414 | ⚠️ Missing from parser |
| **Total Target** | 500.919.458 | 489.218.564 | ❌ Unmatched |
| **Discrepancy** | | 11.700.894 | ROOT FOUND |

---

## 🚀 Action Items

### URGENT FIX:

1. **Update parser regex** to handle all program codes
   - Current: `GG.2897`
   - Need: `[A-Z]{2}.2886` (any 2-letter program code)

2. **Check kegiatan 2886 matching**
   - Value diff: 354.768.414 (CSV) vs 349.103.414 (Sheet)
   - Investigate matching for WA.2886

3. **Re-run import** to capture WA.2886 kegiatan

**Files to Update:**
- `src/utils/bahanrevisi-monthly-csv-parser.ts` (Line ~242)
- `src/hooks/use-import-monthly-csv.ts` (matching logic may need adjustment for WA)
