# Pencairan Submission Fix - Satker Parameter

## Problem
Pencairan submissions were always saving to sheet 3210 (default) instead of user's satker-specific sheet, despite UI showing correct satker and context returning correct sheet IDs.

## Root Cause
**Missing `satker` parameter in pencairan-save and pencairan-update request bodies**

The SubmissionForm was not passing the `satker` parameter in 3 out of 4 Cloud Function calls:
1. ❌ Draft save (new) - missing satker
2. ✅ Draft update (edit) - had satker (from earlier fix)
3. ❌ Submit new - missing satker  
4. ✅ Submit update (edit) - had satker (from earlier fix)

Without the satker parameter, the Cloud Function defaulted to `DEFAULT_SPREADSHEET_ID` (3210).

## Solution Applied

### File: `src/components/pencairan/SubmissionForm.tsx`

**Change 1: Draft Save (New)**
```tsx
// Line ~217
const { data, error } = await supabase.functions.invoke('pencairan-save', {
  body: {
    id: newId,
    uraianPengajuan: title.trim(),
    namaPengaju: submitterName.trim(),
    jenisPengajuan: jenisPengajuan,
    kelengkapan: kelengkapan,
    catatan: notes.trim() || '',
    statusPengajuan: 'draft',
    waktuPengajuan: waktuPengajuan,
    statusPpk: '',
    waktuPpk: '',
    statusBendahara: '',
    waktuBendahara: '',
    statusKppn: '',
    satker: user?.satker,  // ✅ ADDED
  },
});
```

**Change 2: Draft Update (Edit)**
```tsx
// Line ~197
const { data, error } = await supabase.functions.invoke('pencairan-update', {
  body: {
    id: editData.id,
    status: 'draft',
    notes: notes.trim() || undefined,
    actor: 'sm',
    action: 'edit',
    uraianPengajuan: title.trim(),
    namaPengaju: submitterName.trim(),
    jenisPengajuan: jenisPengajuan,
    kelengkapan: kelengkapan,
    satker: user?.satker,  // ✅ ADDED
  },
});
```

**Change 3: Submit New**
```tsx
// Line ~321
const { data, error } = await supabase.functions.invoke('pencairan-save', {
  body: {
    id: newId,
    uraianPengajuan: title.trim(),
    namaPengaju: submitterName.trim(),
    jenisPengajuan: jenisPengajuan,
    kelengkapan: kelengkapan,
    catatan: notes.trim() || '',
    statusPengajuan: 'pending_bendahara',
    waktuPengajuan: waktuPengajuan,
    statusPpk: '',
    waktuPpk: '',
    statusBendahara: '',
    waktuBendahara: '',
    statusKppn: '',
    satker: user?.satker,  // ✅ ADDED
  },
});
```

**Change 4: Submit Update (Edit)** - Already had satker ✅

## Cloud Function Flow (pencairan-save)

```
1. Frontend sends: { id, satker: "3209", ... }
                              ↓
2. Cloud Function receives: const { satker, ... } = body
                              ↓
3. Lookup logic:
   if (satker) {
     await getPencairanSheetIdBySatker(accessToken, satker)
     // Queries Master Config, finds satker row, returns pencairan_sheet_id
   } else {
     DEFAULT_SPREADSHEET_ID  // Fallback to 3210
   }
                              ↓
4. Save to correct Google Sheet using dynamic spreadsheetId
```

## Verification Checklist

After deploying, verify the fix:

1. **Login as user with satker 3209**
2. **Create new pencairan submission** (not edit draft)
3. **Save as draft** (should go to 3209 pencairan sheet)
4. **Submit** (should still be in 3209 pencairan sheet)

Check logs:
- Frontend console: `[SubmissionForm] Creating new pencairan: { userSatker: "3209", ... }`
- Supabase Functions: `[pencairan-save] Received request: { satker: "3209", ... }`
- Supabase Functions: `[pencairan-save] Using spreadsheetId: { satker: "3209", spreadsheetId: "<actual-3209-id>", isDefault: false }`

Then verify:
- 3209 Pencairan sheet has the new row
- 3210 Pencairan sheet is unchanged

Repeat with satker 3210 and 3208 to ensure all three work independently.

## Build Status
✅ Project builds successfully with no errors (24.15s)

## Notes
- Cloud Function already had satker extraction and lookup logic
- Only needed to pass satker parameter from frontend
- All 4 pencairan operations now properly isolated by satker
