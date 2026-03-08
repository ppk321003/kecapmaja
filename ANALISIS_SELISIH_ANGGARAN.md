# ANALISIS ROOT CAUSE: Selisih CSV Upload Bulanan 500.919.458 vs Sejumlah Tercatat 489.218.564

**Tanggal Analisis:** 8 Maret 2026  
**Periode:** Februari 2026  
**Jumlah CSV Upload:** 500.919.458  
**Jumlah Tercatat di Sheet:** 489.218.564  
**SELISIH:** 11.700.894 (2.34%)

---

## 1. TEMUAN UTAMA

Perbedaan terjadi karena **Items Unmatched (tidak menemukan kecocokan di BudgetItem)** tidak ter-update ke RPD. Proses matching menggunakan **7-field unique key**:

```
program | kegiatan | rincianOutput | komponenOutput | subKomponen | akun | uraian
```

### Alur Proses:
1. **CSV di-parse** → Extract 606 detail items dengan total Periode Ini: **502.379.458**
2. **Matching dengan BudgetItems** → Gunakan unique key untuk menemukan kecocokan
3. **Split hasil matching:**
   - ✅ **Matched items** (success) → Update ke `rpdUpdates` → Update RPD sheet
   - ❌ **Unmatched items** (gagal match) → Insert ke `unmatchedItems` → Insert ke versioned sheet (tidak ada di RPD)
4. **Target JUMLAH SELURUHNYA** dari CSV: **500.919.458** (bukan 502.379.458)
5. **Tercatat di sheet:** **489.218.564** = 500.919.458 - 11.700.894

---

## 2. IDENTIFIKASI MASALAH

### Problem: Unmatched Items Tidak Ter-Updated ke RPD

```typescript
// File: src/hooks/use-import-monthly-csv.ts, line 280+

const rpdUpdateData = matchResult.matched_items.map((match) => {
  return {
    item: match.budgetItem,
    bulan: parsedData.bulan,
    bulanColumn: bulanColumn,
    periodeIni: match.item.periodeIni,  // ← Hanya MATCHED items
  };
});

// Unmatched items hanya di-insert ke versioned sheet, bukan ke RPD
const unmatchedData = matchResult.not_matched_items.map((item) => {
  return {
    // ... detail unmatched item structure
    sisa_anggaran: item.item.sisaAnggaran,
    // Tapi ini INSERT ke versioned sheet, bukan UPDATE ke existing RPD items
  };
});
```

### Konsekuensi:
- **Matched items:** ~489.218.564 → ter-update ke kolom "Periode Ini" di RPD
- **Unmatched items:** ~11.700.894 → INSERT as NEW items (kegiatan baru), tidak ter-update di RPD lama
- **Total masuk ke RPD:** 489.218.564 (matched only)
- **Total seharusnya:** 500.919.458 (matched + unmatched)

---

## 3. ANALISIS UNIQUE KEY MATCHING

### Matching Logic (createUniqueKey):

```typescript
export const createUniqueKey = (item: ParsedMonthlyItem | any): string => {
  return [
    normalizeForMatching(item.program),              // Kolom 1: Program code
    normalizeForMatching(item.kegiatan),             // Kolom 2: Kegiatan number
    normalizeForMatching(item.rincianOutput),        // Kolom 3: Rincian Output
    normalizeForMatching(item.komponenOutput),       // Kolom 4: Komponen Output
    normalizeForMatching(item.subKomponen),          // Kolom 5: Sub-komponen
    normalizeForMatching(item.akun),                 // Kolom 6: Akun code
    normalizeForMatching(item.uraian),               // Kolom 7: Description
  ].join('|');
};
```

### Normalisasi untuk Matching:
```
normalizeForMatching = uppercase + trim + normalize spacing + normalize separators
"gg"        → "GG"
"bma 001"   → "BMA_001"
"051-GG"    → "051_GG"
"2.0A"      → "002_0A"
```

### Penyebab Unmatched (Hipotesis):

1. **Case sensitivity di CSV vs BudgetItem sudah di-normalize** → LOW RISK
2. **Format perbedaan separator:** CSV ada separator berbeda vs BudgetItem → MEDIUM RISK
3. **Uraian tidak sesuai persis** → HIGH RISK (description field sangat panjang dan kompleks)
4. **Kegiatan/Program code berbeda di CSV vs BudgetItem** → HIGH RISK

---

## 4. LOKASI KOLOM YANG BERMASALAH

| Column | Header | CSV Index | Parser Index | Nilai di JUMLAH | Keterangan |
|--------|--------|-----------|--------------|-----------------|-----------|
| 23 | Periode Ini | 23 | 23 | 500.919.458 ✅ | Sesuai |
| 24 | s.d. Periode | 24 | - | 889.119.479 | Cumulative |
| 30 | SISA ANGGARAN | 30 | 30 | 8.987.096.521 ✅ | Sesuai |

**Kesimpulan:** Lokasi kolom sudah BENAR, masalah bukan di column index parsing.

---

## 5. PROSES YANG PERLU DI-REVIEW

### A. Matching di `use-import-monthly-csv.ts` (Line 42-95)

**File:**  
`src/hooks/use-import-monthly-csv.ts`

**Bagian yang perlu dioptimalkan:**
```typescript
const budgetItemMap = new Map<string, BudgetItem>();
budgetItems.forEach((item, idx) => {
  const key = createUniqueKey(item);  // ← Key dari BudgetItem (existing)
  budgetItemMap.set(key, item);
});

parsedData.items.forEach((parsedItem, idx) => {
  const key = createUniqueKey(parsedItem);  // ← Key dari CSV item (new)
  const budgetItem = budgetItemMap.get(key);  // ← CRITICAL: Harus cocok 100%
  
  if (budgetItem) {
    // Matched
  } else {
    // Unmatched - tidak ter-update ke RPD
  }
});
```

**Rekomendasi:**
1. Log semua unmatched items dengan key-nya untuk analisis
2. Bandingkan key CSV vs key BudgetItem untuk setiap unmatched case
3. Tambahkan "fuzzy matching" untuk handling minor differences (e.g., typo, perbedaan spacing)

### B. Handling Unmatched Items (Line 260-305)

**Issue:** Unmatched items di-insert ke `unmatchedItems` sebagai "kegiatan baru" ([Kegiatan Baru] tag), tapi tidak ter-update ke `rpdUpdates`.

**Perlu di-check:**
- Apakah `unmatchedItems` masuk ke sheet dengan status "new"?
- Apakah nilai-nilai ini ter-count dalam total report?
- Ada flow untuk mengapprove dan merge unmatched items ke existing RPD items?

---

## 6. REKOMENDASI FIX

### Opsi 1: Improve Matching Logic (Quick Win)

**Tujuan:** Reduce unmatched items dari 11.7M menjadi lebih kecil

**Steps:**
1. Implement fuzzy matching untuk uraian (allow minor typos, spacing)
2. Add optional field matching (e.g., match hanya berdasarkan program+kegiatan+akun jika uraian berbeda)
3. Log detail unmatched items untuk manual review

**File yang perlu di-update:**
- `src/utils/bahanrevisi-monthly-csv-parser.ts` → Improve `createUniqueKey`
- `src/hooks/use-import-monthly-csv.ts` → Improve matching logic (line 42-95)

### Opsi 2: Track & Report Unmatched Items

**Tujuan:** Full visibility tentang items yang tidak ter-match

**Steps:**
1. Calculate unmatched value di UI (show 11.7M discrepancy)
2. Add link untuk review unmatched items
3. Provide export functionality untuk unmatched items report

**File yang perlu di-update:**
- `src/components/bahanrevisi/BahanRevisiUploadBulanan.tsx` → Add unmatched value display
- `src/hooks/use-import-monthly-csv.ts` → Return unmatched total value

### Opsi 3: Auto-Merge Unmatched ke Existing Items

**Tujuan:** Automatic merging based on best-match logic

**Steps:**
1. Untuk unmatched items, find "best match" (e.g., 5-7 fields match, 1 field mismatch)
2. Flag untuk manual review
3. Auto-update if match score > threshold (e.g., 85%)

**Complexity:** HIGH - Memerlukan careful testing

---

## 7. DATA UNTUK VALIDASI

| Metric | Value |
|--------|-------|
| Total Detail Items Parsed | 606 items |
| Total Periode Ini (all items) | 502.379.458 |
| JUMLAH SELURUHNYA di CSV | 500.919.458 |
| Tercatat di Sheet (matched only) | 489.218.564 |
| Estimated Unmatched Value | 11.700.894 |
| % Unmatched | 2.34% |

---

## 8. NEXT STEPS

1. **Immediate:** Check logs dari upload Februari 2026 untuk melihat breakdown matched vs unmatched
2. **Short-term:** Implement logging/reporting untuk unmatched items
3. **Medium-term:** Improve matching logic dengan fuzzy matching
4. **Long-term:** Evaluate impact ke user dan keputusan design untuk tracking kegiatan baru + existing items

---

**Kesimpulan:**  
Selisih 11.700.894 adalah valid unmatched items yang tidak ter-update ke RPD karena unique key tidak cocok dengan existing BudgetItems. Ini bukan bug, tapi limitation dari strict matching logic. Perlu review untuk menentukan apakah items ini benar-benar "kegiatan baru" atau ada misalignment di BudgetItem master data.
