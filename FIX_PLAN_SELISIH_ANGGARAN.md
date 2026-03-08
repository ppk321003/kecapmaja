# MASTER PLAN: Fix Selisih Upload Bulanan 11.700.894

## Problem Summary
CSV Upload Bulanan: **500.919.458**  
Tercatat di Sheet: **489.218.564**  
**SELISIH: 11.700.894** (2.34%)

## Root Cause
Items dengan nilai 11.700.894 **tidak match** dengan existing BudgetItems menggunakan 7-field unique key matching. Sehingga:
- Items yang matched → ter-update ke RPD (489.218.564) ✅
- Items yang unmatched → insert ke versioned sheet (tidak update RPD) ❌

---

## Critical Code Locations

### 1. Matching Logic - PRIMARY ISSUE

**File:** [src/hooks/use-import-monthly-csv.ts](src/hooks/use-import-monthly-csv.ts)  
**Lines:** 42-95

```typescript
const matching = useCallback(
  (parsedData: ParsedMonthlyData): MatchResult => {
    
    // CREATE MAP from BudgetItem
    const budgetItemMap = new Map<string, BudgetItem>();
    budgetItems.forEach((item) => {
      const key = createUniqueKey(item);  // ← Key generation (7 fields)
      budgetItemMap.set(key, item);
    });

    // MATCHING parsed items with budgetItems
    parsedData.items.forEach((parsedItem) => {
      const key = createUniqueKey(parsedItem);  // ← Same key generation
      const budgetItem = budgetItemMap.get(key);
      
      if (budgetItem) {
        result.matched++;  // ← 489.218.564 items matched
      } else {
        result.notMatched++;  // ← 11.700.894 items NOT matched
      }
    });

    return result;
  },
  [budgetItems]
);
```

**Problem:** Strict 1-to-1 key matching. If ANY of 7 fields differs → no match

---

### 2. Unique Key Creation - CRITICAL

**File:** [src/utils/bahanrevisi-monthly-csv-parser.ts](src/utils/bahanrevisi-monthly-csv-parser.ts)  
**Lines:** 430-451

```typescript
export const createUniqueKey = (item: ParsedMonthlyItem | any): string => {
  return [
    normalizeForMatching(item.program || item.program_pembebanan),      // Field 1
    normalizeForMatching(item.kegiatan),                               // Field 2
    normalizeForMatching(item.rincianOutput || item.rincian_output),  // Field 3
    normalizeForMatching(item.komponenOutput || item.komponen_output), // Field 4
    normalizeForMatching(item.subKomponen || item.sub_komponen),      // Field 5
    normalizeForMatching(item.akun),                                   // Field 6
    normalizeForMatching(item.uraian),                                 // Field 7 ← MOST LIKELY CULPRIT
  ].join('|');
};

function normalizeForMatching(value: any): string {
  if (!value) return '';
  
  let str = String(value)
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\s_-]+/g, '_');
  
  // ... additional normalization
}
```

**Issue:** Field 7 (uraian/description) is very long and sensitive to typos, extra spaces, etc.

---

### 3. Unmatched Items Handling

**File:** [src/hooks/use-import-monthly-csv.ts](src/hooks/use-import-monthly-csv.ts)  
**Lines:** 260-305

```typescript
// These unmatched items (11.700.894) are INSERT as NEW kegiatan  
// but NOT updated to existing RPD items
const unmatchedData = matchResult.not_matched_items.map((item) => {
  return {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    program_pembebanan: item.item.program,
    // ... other fields ...
    sisa_anggaran: item.item.sisaAnggaran,  // ← 11.700.894 total
    sub_komponen: item.item.subKomponen,
    status: 'new',  // ← Marked as NEW kegiatan
  };
});

// SEND TO SHEET:
const uploadResult = await supabase.functions.invoke('google-sheets', {
  body: {
    operation: 'update-sisa-anggaran',
    values: updateData,        // ← matched items (489.218.564)
    rpdUpdates: rpdUpdateData,  // ← matched items for RPD
    unmatchedItems: unmatchedData,  // ← unmatched items (11.700.894)
  },
});
```

---

## Solution Options

### Option A: Add Detailed Logging (Quick Diagnosis)

**Goal:** Identify exactly which items are unmatched

**Changes:**

Add to [src/hooks/use-import-monthly-csv.ts](src/hooks/use-import-monthly-csv.ts) around line 95:

```typescript
// After matching complete, log unmatched items details
if (result.not_matched_items.length > 0) {
  console.group(`[UNMATCHED] ${result.not_matched_items.length} items, Total: ${sumOfUnmatchedValue}`);
  
  // Group by reason (missing field, format difference, etc)
  result.not_matched_items.forEach((item, idx) => {
    const csvKey = createUniqueKey(item.item);
    
    // Try to find closest matches
    let closestMatches = [];
    budgetItemMap.forEach((budgetItem, key) => {
      const similarity = calculateFieldSimilarity(csvKey, key);
      if (similarity > 0.7) {
        closestMatches.push({ key, similarity });
      }
    });
    
    console.log(`${idx+1}. Value: ${item.item.sisaAnggaran}`, {
      csvKey: csvKey.substring(0, 60),
      closestMatches,
      reason: item.reason,
    });
  });
  
  console.groupEnd();
}
```

**Output:** Detailed unmatched report showing which fields don't match

---

### Option B: Fuzzy Matching (Medium Effort)

**Goal:** Match items with minor differences (typos, spacing)

**Changes:**

1. Modify [src/utils/bahanrevisi-monthly-csv-parser.ts](src/utils/bahanrevisi-monthly-csv-parser.ts):

```typescript
export const createUniqueKeyWithTolerance = (
  item: ParsedMonthlyItem | any, 
  tolerance: number = 0.85  // 85% match is good enough
): string | null => {
  
  // Return exact key for strict matching
  const strictKey = createUniqueKey(item);
  
  // For fuzzy match, use only critical fields (exclude uraian)
  const fuzzyKey = [
    normalizeForMatching(item.program),
    normalizeForMatching(item.kegiatan),
    normalizeForMatching(item.rincianOutput),
    normalizeForMatching(item.komponenOutput),
    normalizeForMatching(item.subKomponen),
    normalizeForMatching(item.akun),
    // EXCLUDE uraian for fuzzy matching
  ].join('|');
  
  return fuzzyKey;
};
```

2. Modify [src/hooks/use-import-monthly-csv.ts](src/hooks/use-import-monthly-csv.ts) around line 72:

```typescript
const matching = useCallback(
  (parsedData: ParsedMonthlyData): MatchResult => {
    const result: MatchResult = {/* ... */};
    
    // Try STRICT matching first
    parsedData.items.forEach((parsedItem) => {
      const strictKey = createUniqueKey(parsedItem);
      const budgetItem = budgetItemMap.get(strictKey);
      
      if (budgetItem) {
        result.matched++;
        result.matched_items.push({
          item: parsedItem,
          budgetItem: budgetItem,
          matchType: 'strict',  // ← Log match type
        });
      } else {
        // Try FUZZY matching (6 fields, exclude uraian)
        const fuzzyKey = createUniqueKeyWithTolerance(parsedItem);
        const fuzzyMatch = findBestFuzzyMatch(fuzzyKey, budgetItemMap);
        
        if (fuzzyMatch && fuzzyMatch.score > 0.85) {
          result.matched++;
          result.matched_items.push({
            item: parsedItem,
            budgetItem: fuzzyMatch.item,
            matchType: 'fuzzy',  // ← Differentiate
            matchScore: fuzzyMatch.score,
          });
        } else {
          result.notMatched++;
          result.not_matched_items.push({
            item: parsedItem,
            reason: `No match found (fuzzy score: ${fuzzyMatch?.score || 0})`,
          });
        }
      }
    });
    
    return result;
  },
  [budgetItems]
);
```

**Expected Impact:** Reduce unmatched items dari 11.7M ke ~5-10%

---

### Option C: Manual Review & Approval Flow

**Goal:** Allow user to review and manually match unmatched items

**Changes:**

1. Update [src/components/bahanrevisi/BahanRevisiUploadBulanan.tsx](src/components/bahanrevisi/BahanRevisiUploadBulanan.tsx):

```typescript
// Add unmatched items summary display
<Alert variant="warning">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    {matched} items matched, {unmatched} items NOT matched (Rp {unmatchedTotal})
    <Button 
      variant="link" 
      size="sm"
      onClick={() => showUnmatchedReviewModal()}
    >
      Review Unmatched Items
    </Button>
  </AlertDescription>
</Alert>
```

2. Create new component: `BahanRevisiUnmatchedReview.tsx`

```typescript
export const BahanRevisiUnmatchedReview: React.FC<Props> = ({ unmatchedItems }) => {
  return (
    <div>
      <h3>Unmatched Items ({unmatchedItems.length})</h3>
      <p>Total Amount: Rp {unmatchedTotal}</p>
      
      <Table>
        <thead>
          <tr>
            <th>Amount</th>
            <th>Program</th>
            <th>Kegiatan</th>
            <th>Description</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {unmatchedItems.map((item) => (
            <tr key={item.id}>
              <td>{item.sisaAnggaran}</td>
              <td>{item.program}</td>
              <td>{item.kegiatan}</td>
              <td>{item.uraian}</td>
              <td>
                <Select onValueChange={(budgetItemId) => 
                  manuallyMatchItem(item.id, budgetItemId)
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Match to existing..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suggestedMatches.map((match) => (
                      <SelectItem value={match.id}>
                        {match.uraian}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};
```

---

## Recommended Implementation Path

### Phase 1: Diagnosis (Week 1)
- ✅ Implement Option A (Detailed Logging)
- Check logs untuk exact unmatched items
- Identify pattern (typo? format? missing data?)

### Phase 2: Quick Fix (Week 2)
- ✅ Implement Option B (Fuzzy Matching)
- Test with current upload
- Verify reduction in unmatched items

### Phase 3: User Experience (Week 3)
- ✅ Implement Option C (Manual Review)
- Add UI for review & approval
- Document process untuk users

---

## Testing Checklist

- [ ] Verify total matched + unmatched = CSV total
- [ ] Check RPD column "Periode Ini" updates correctly
- [ ] Verify unmatched items appear in versioned sheet with "new" status
- [ ] Test with different CSV formats (spacing, case, separator variations)
- [ ] Compare before/after match rates
- [ ] Validate unmatched total against expected value

---

## Files to Review/Modify

| File | Purpose | Status |
|------|---------|--------|
| [src/hooks/use-import-monthly-csv.ts](src/hooks/use-import-monthly-csv.ts) | Main matching logic | 🔴 **CRITICAL** |
| [src/utils/bahanrevisi-monthly-csv-parser.ts](src/utils/bahanrevisi-monthly-csv-parser.ts) | Key generation | 🟡 Needs review |
| [src/components/bahanrevisi/BahanRevisiUploadBulanan.tsx](src/components/bahanrevisi/BahanRevisiUploadBulanan.tsx) | UI flow | 🟡 Needs update |
| Google Sheets Function | Server-side update | ⚪ Check format |

---

## Conclusion

Selisih 11.700.894 adalah **VALID ISSUE**, bukan bug. Penyebabnya adalah strict 7-field unique key matching yang tidak menemukan kecocokan dengan existing BudgetItems. 

**Prioritas Fix:**
1. **Immediate:** Add logging untuk diagnosis
2. **Short-term:** Implement fuzzy matching untuk 6-field (exclude uraian)
3. **Long-term:** Review BudgetItem master data untuk ensure konsistensi
