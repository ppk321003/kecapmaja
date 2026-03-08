

## Plan: Fix POK CSV Parser for Upload RPD

### Problem Analysis
The current `parseExcelRPD` function in `BahanRevisiUploadRPD.tsx` has fundamental hierarchy detection bugs that prevent proper parsing of POK (Petunjuk Operasional Kegiatan) CSV files:

1. **Broken hierarchy detection**: 
   - Sub Komponen codes (`052`, `005`, `051`) are 3-digit numbers -- no regex matches them (isKegiatan needs 4 digits, isSubKomponen needs 3 uppercase letters)
   - `A` (TANPA SUB KOMPONEN) matches nothing
   - `BMA.004` (Komponen Output) doesn't match `isKomponen = /^[0-9]{4}\.[A-Z]{3}/` which requires digits first
   - `2896.BMA` (Rincian Output) falsely matches `isKomponen`
2. **Page headers repeat** every ~40 lines and aren't skipped
3. **ID/field format mismatch**: The parser doesn't build `komponen_output` in the same format as the monthly CSV parser (`2896.BMA.004` format). Also missing `_GG` suffix for special sub_komponen codes (051, 053, 054)
4. **Past months not protected**: Jan and Feb values should not overwrite existing RPD data (current date is March 2026)
5. **Month column indices are wrong**: The current parser uses dynamic header detection which may fail due to multiline quoted headers. The POK format has fixed column positions.

### Technical Plan

**File: `src/components/bahanrevisi/BahanRevisiUploadRPD.tsx`**

**A. Rewrite `parseExcelRPD` function** with correct POK hierarchy parsing:

1. **Skip repeating page headers**: Detect lines containing `PETUNJUK OPERASIONAL KEGIATAN`, `Satuan Kerja`, `KODE`, column number rows (`1;2;;;3;;4;5;...`), and multiline header blocks. Also skip the TOTAL row at the end.

2. **Fix hierarchy detection regexes**:
   - Program: `/^\d{3}\.\d{2}\.[A-Z]{2}$/` (e.g., `054.01.GG`)
   - Kegiatan: `/^\d{4}$/` (e.g., `2896`) -- keep as-is
   - Rincian Output (RO): `/^\d{4}\.[A-Z]{2,3}$/` (e.g., `2896.BMA`, `2886.EBB`)
   - Komponen Output: `/^[A-Z]{2,3}\.\d{3}$/` (e.g., `BMA.004`, `EBB.971`)
   - Sub Komponen: `/^\d{3}$/` (e.g., `052`, `005`, `051`) -- 3-digit numeric
   - Skip level: `/^[A-Z]$/ and name contains "TANPA SUB KOMPONEN"` (e.g., `A`)
   - Akun: `/^\d{5,6}$/` (e.g., `524113`) -- keep as-is

3. **Build `komponen_output` in matching format**: Combine as `${kegiatan}.${roCode}.${komponenDetailCode}` → e.g., `2896.BMA.004` to match existing RPD item IDs.

4. **Apply sub_komponen normalization**: Add `_programCode` suffix for special codes (051, 053, 054), consistent with the monthly CSV parser logic.

5. **Use fixed column indices for months** (semicolon-delimited): JAN=17, FEB=18, MRT=19, APR=20, MEI=21, JUN=22, JUL=24, AGU=26, SEP=27, OKT=28, NOP=29, DES=31. Total pagu from col 11 (Jumlah Biaya). Blokir from col 39.

6. **Multiply values by 1000** (already done, keep).

**B. Add past-month protection in `handleConfirmUpload`**:

- Determine current month (March 2026 → month index 3)
- When updating matched items, preserve existing month values for months < current month (Jan, Feb)
- Only overwrite months >= current month with POK values

**C. Fix ID generation** to use `|` separator format matching `generateDeterministicId` from `bahanrevisi-calculations.ts`:
`program|kegiatan|rincianOutput|komponenOutput|subKomponen|akun|uraian`

**D. Update `createRPDKey`** to also normalize with leading apostrophe removal (consistent with data normalization pattern).

### Summary of Changes
- 1 file modified: `src/components/bahanrevisi/BahanRevisiUploadRPD.tsx`
- Complete rewrite of `parseExcelRPD` with correct POK hierarchy
- Past-month protection logic in upload handler
- No backend/edge function changes needed

