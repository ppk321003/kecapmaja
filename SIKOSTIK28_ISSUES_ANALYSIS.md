# Analisis Masalah Sikostik28 - Data Sync & Display Issues

**Tanggal Audit:** 5 Februari 2026  
**Status:** 🔴 CRITICAL - Data tidak tersinkron dan tidak menampilkan dengan baik

---

## 📋 MASALAH UTAMA YANG DITEMUKAN

### 1. **Hook Dependency Issue - fetchSheet Callback Infinite Loop**
**File:** `src/hooks/use-sikostik-data.ts` (line 115)

**Problem:**
```typescript
const fetchSheet = useCallback(async (sheetName: string, spreadsheetId?: string) => {
  // ... function body
}, [userSheetId]);  // ⚠️ MASALAH: userSheetId change → fetchSheet recreated → dependent callbacks recreated
```

**Impact:**
- Setiap kali `userSheetId` berubah (dari context), `fetchSheet` di-recreate
- Semua callbacks yang depend on `fetchSheet` juga di-recreate (`fetchRekapDashboard`, `fetchAnggotaMaster`, dll)
- Ini trigger re-render dan re-fetch data berulang kali tanpa henti
- Menyebabkan **infinite data fetching loops** dan race conditions

**Solution:**
Tambahkan empty dependency array karena `fetchSheet` tidak butuh `userSheetId` real-time:
```typescript
const fetchSheet = useCallback(async (sheetName: string, spreadsheetId?: string) => {
  const sheetIdToUse = spreadsheetId || userSheetId;
  // ... rest of function
}, []); // Empty dependency - spreadsheetId di-pass as parameter
```

---

### 2. **Missing userSheetId Memoization in useSikostikData**
**File:** `src/hooks/use-sikostik-data.ts` (line 123)

**Current Code:**
```typescript
const userSheetId = useMemo(() => {
  return satkerContext?.getUserSatkerSheetId('tagging') || SIKOSTIK_SPREADSHEET_ID;
}, [satkerContext?.configs]);  // ⚠️ Comparing object reference - will always change
```

**Problem:**
- `satkerContext?.configs` adalah array object yang berubah reference setiap render
- React berpikir nilai berubah dan re-compute `userSheetId` setiap render
- `userSheetId` change → `fetchSheet` recreated → callbacks recreated → infinite loop

**Solution:**
```typescript
const userSheetId = useMemo(() => {
  return satkerContext?.getUserSatkerSheetId('tagging') || SIKOSTIK_SPREADSHEET_ID;
}, [satkerContext?.isLoading, satkerContext?.configs?.length]); // Banding scalar values, not objects
```

---

### 3. **Missing useCallback Dependencies in RekapIndividu**
**File:** `src/components/sikostik/RekapIndividu.tsx` (line ~70-100)

**Problem:**
```typescript
const loadInitialData = async () => {
  // ... uses fetchAnggotaMaster, fetchLimitAnggota, fetchRekapDashboard
  // ...but missing dependency array!
};

const loadRekapData = async () => {
  // uses fetchRekapDashboard
  // ... missing dependency array!
};

const loadHistoryData = async () => {
  // uses fetchRekapDashboard
  // ... missing dependency array!
};

useEffect(() => {
  loadInitialData();
}, [selectedBulan, selectedTahun, userSheetId]); // userSheetId from hook
// Missing: loadInitialData function itself!
```

**Impact:**
- `loadInitialData` function recreated every render (stale closure)
- useEffect dependency includes `userSheetId` from hook, but not `loadInitialData`
- Race conditions dalam data loading

---

### 4. **CekLimit Component - Missing Dependency in useEffect**
**File:** `src/components/sikostik/CekLimit.tsx` (line ~27-33)

**Current Code:**
```typescript
const loadData = async () => {
  setIsLoading(true);
  const data = await fetchLimitAnggota();
  setLimitData(data);
  setIsLoading(false);
};

useEffect(() => {
  loadData();
}, []); // ⚠️ Empty deps - loadData will have stale closure
```

**Impact:**
- Hanya load sekali saat mount
- Jika `fetchLimitAnggota` berubah (dari hook updates), tidak akan re-fetch
- Data tetap stale

---

### 5. **RekapAnggota - Missing userSheetId Dependency**
**File:** `src/components/sikostik/RekapAnggota.tsx` (line ~38-40)

**Current Code:**
```typescript
useEffect(() => {
  loadData();
}, [selectedBulan, selectedTahun, userSheetId]);
// ⚠️ userSheetId dalam array tapi loadData is stale closure
```

**But loadData function:**
```typescript
const loadData = async () => {
  setIsLoading(true);
  const data = await fetchRekapDashboard(selectedBulan, selectedTahun);
  // ...
};
// No dependency array on loadData function
```

---

### 6. **Race Condition - Promise.all without Abort Handling**
**File:** `src/components/sikostik/RekapIndividu.tsx` (line ~130-140)

**Problem:**
```typescript
const loadHistoryData = async () => {
  // ...
  const fetchPromises = [];
  for (let month = 1; month <= 12; month++) {
    fetchPromises.push(fetchRekapDashboard(month, selectedTahun));
  }
  
  const results = await Promise.all(fetchPromises);
  // ⚠️ Jika component unmount atau selectedAnggotaId change saat loading,
  // Promise masih update state dengan data lama
  
  results.forEach((monthData, monthIndex) => {
    // ... process results
    // setHistoryData(allMonthsData);
  });
};
```

**Impact:**
- Jika user switch anggota atau change periode sebelum Promise selesai
- State update dengan data lama menyebabkan incorrect display
- "Tidak tersinkron" antara UI dan actual data

**Solution:**
Implementasi AbortController atau useCallback dependencies yang proper

---

### 7. **Data Mapping Issue - Missing null checks**
**File:** `src/hooks/use-sikostik-data.ts` (line ~250-290)

**Current:**
```typescript
const fetchRekapDashboard = useCallback(async (bulan?: number, tahun?: number): Promise<RekapDashboard[]> => {
  // ...
  return data
    .filter((row: any) => {
      const rowBulan = parseInt(row.periodeBulan || row.bulan || 0);
      const rowTahun = parseInt(row.periodeTahun || row.tahun || 0);
      return rowBulan === period.bulan && rowTahun === period.tahun;
    })
    .map((row: any, index: number) => ({
      // ... many fields
      totalSimpanan: parseNum(row.saldoAkhirbulanPokok) + // Can return NaN if parsing fails
                     parseNum(row.saldoAkhirbulanWajib) +
                     // ...
    }));
};
```

**Problem:**
- Jika sheet cell kosong atau format salah, `parseNum` mungkin return NaN
- NaN + NaN = NaN → data calculation salah
- No validation untuk ensure required fields ada

---

### 8. **Multiple Sheet ID sources - Not unified**
**File:** `src/hooks/use-sikostik-data.ts` (line ~19-20)

**Current:**
```typescript
const SIKOSTIK_SPREADSHEET_ID = "1cBuo9tAtpGvKuThvotIQqd9HDvJfF2Hun61oGYhRtHk"; // Hardcoded
const ORGANIK_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM"; // Hardcoded

const useSikostikData = () => {
  const satkerContext = useSatkerConfigContext();
  const userSheetId = useMemo(() => {
    return satkerContext?.getUserSatkerSheetId('tagging') || SIKOSTIK_SPREADSHEET_ID; // Falls back to 3210
  }, [satkerContext?.configs]);
```

**Problem:**
- SIKOSTIK_SPREADSHEET_ID adalah default untuk 3210
- Jika satkerContext belum load, akan gunakan 3210 sheet
- ORGANIK_SPREADSHEET_ID juga hardcoded, tidak dari satker config
- Multi-satker tidak berfungsi dengan baik untuk Sikostik

---

## 🔧 SUMMARY OF ROOT CAUSES

| No | Issue | Severity | Impact |
|----|-------|----------|--------|
| 1 | Dependency hell - fetchSheet recreated constantly | 🔴 CRITICAL | Infinite loops, stale data |
| 2 | userSheetId memoization comparing object refs | 🔴 CRITICAL | Cascade effect dari issue #1 |
| 3 | Missing useCallback on async load functions | 🔴 CRITICAL | Stale closures, race conditions |
| 4 | Missing useEffect dependencies | 🟠 HIGH | Data not re-fetched when deps change |
| 5 | Promise.all without abort handling | 🟠 HIGH | Wrong data displayed when switching context |
| 6 | NaN from parseNum in calculations | 🟡 MEDIUM | Incorrect totals and limits |
| 7 | Hardcoded sheet IDs | 🟠 HIGH | Multi-satker support broken for Sikostik |

---

## ✅ RECOMMENDED FIXES (in order of priority)

1. **Fix useCallback dependency issue** → Remove `userSheetId` from `fetchSheet` deps
2. **Fix useMemo dependency** → Compare scalar values, not object refs
3. **Add useCallback wrappers** → `loadData`, `loadInitialData`, `loadHistoryData`
4. **Complete useEffect dependencies** → Include all functions and variables
5. **Add abort handling** → For Promise.all operations
6. **Improve parseNum** → Add NaN validation
7. **Use satker-aware sheet IDs** → Get ORGANIK_SPREADSHEET_ID from config if available

---

## 📊 Expected Behavior After Fixes

- ✅ Data loads once per period selection
- ✅ No infinite re-renders or fetches
- ✅ Smooth data switching between anggota/bulan/tahun
- ✅ Accurate calculations with proper null handling
- ✅ Multi-satker support for Sikostik
