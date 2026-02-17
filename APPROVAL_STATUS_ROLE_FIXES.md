# Perbaikan Status dan Role Aksi Approval - Bahan Revisi Anggaran

## 🔧 Perbaikan yang Dilakukan

### Issue #1: Status Tidak Berubah Setelah Edit (FIXED ✅)

**Masalah Sebelumnya**:
```
Item Status: Ditolak (rejected_date ada)
  ↓
User Edit (revisi anggaran)
  ↓
Status Tetap: Ditolak (Tidak reset!)
  ↓
❌ User kebingungan - pengajuan tidak diterima
```

**Solusi yang Diimplementasikan**:
- Clear `rejected_date` ketika user melakukan edit/revisi
- Set status menjadi `'changed'` (atau approval awal)
- Semua approval metadata di-reset ke undefined

**Code Change** (BahanRevisiAnggaran.tsx → handleUpdateItem):
```typescript
if (dataChanged) {
  updatedItem.status = 'changed';
  updatedItem.approved_by = undefined;
  updatedItem.approved_date = undefined;
  updatedItem.rejected_date = undefined;  // ← NEW: Clear rejected status!
}
```

**Flow Setelah Fix**:
```
Item Status: Ditolak (rejected_date = '2026-02-17...')
  ↓
User Edit (revisi anggaran)
  ↓
handleUpdateItem:
  - Detect ada perubahan data
  - Clear rejected_date = undefined ✅
  - Set status = 'changed'
  - Set approved_by = undefined
  ↓
Status Baru: Berubah (Menunggu Approval PPK)
  ↓
✅ Revisi dianggap pengajuan ulang (dari awal)
✅ Aksi PPK kembali aktif
```

### Issue #2: Role PPK Tidak Memiliki Aksi Approval (FIXED ✅)

**Masalah Sebelumnya**:
```
Kondisi Check:
  if (!isApproved(item) && !isRejected(item) && isAdmin)
                            └────────┬────────┘
                                     │
                        Ketika item ditolak:
                        rejected_date ada
                        isRejected() = TRUE
                        !isRejected() = FALSE
                        Kondisi GAGAL → Tombol tidak muncul!
```

**Solusi yang Diimplementasikan**:
- Clear `rejected_date` di handleUpdateItem → isRejected() akan return FALSE
- Kondisi check sudah benar, tinggal rejected_date harus undefined

**Flow Setelah Fix**:
```
Conditional Logic (BahanRevisiBudgetTable - line 393):
{!isApproved(item) && !isRejected(item) && isAdmin && (
  ├─ !isApproved(item)   = !FALSE = TRUE  ✅
  ├─ !isRejected(item)   = !FALSE = TRUE  ✅ (karena rejected_date undefined)
  └─ isAdmin             = TRUE (user adalah PPK) ✅
           ↓
Semua TRUE → Tombol Approve/Reject MUNCUL ✅
```

## 📋 Complete Status & Approval Flow

### Status Values & Meaning

| Status | approved_by | approved_date | rejected_date | Meaning |
|--------|-------------|---------------|---------------|---------|
| `new` | undefined | undefined | undefined | Item baru, belum di-approve |
| `changed` | undefined | undefined | undefined | Item berubah/revisi, belum di-approve |
| `unchanged` | undefined | undefined | undefined | Item tidak ada perubahan |
| Approved | "ppk3210" | "2026-02-17..." | undefined | Item sudah di-approve PPK |
| Rejected | undefined | undefined | "2026-02-17..." | Item ditolak PPK |

### PPK Action Buttons - Visibility Logic

```typescript
// Buttons muncul ketika:
{!isApproved(item) && !isRejected(item) && isAdmin && (
  <>
    <Button>✅ Setujui</Button>
    <Button>❌ Tolak</Button>
  </>
)}
```

**Buttons AKTIF jika**:
```
✅ Item NOT Approved: approved_by = undefined OR approved_date = undefined
✅ Item NOT Rejected: rejected_date = undefined
✅ User is PPK: isAdmin = TRUE (role === 'Pejabat Pembuat Komitmen')
```

**Buttons TIDAK MUNCUL jika**:
- Item sudah approved (approved_by & approved_date ada)
- Item sedang rejected (rejected_date ada) - SEBELUM REVISI
- User bukan PPK (role bukan 'Pejabat Pembuat Komitmen')

### User Flow - Edit Rejected Item

```
┌─────────────────────────────────────────┐
│ PPK lihat item berstatus "Ditolak"      │
│ (rejected_date ada, approved_by none)   │
│                                         │
│ Status Badge: ❌ Ditolak (Merah)        │
│ Aksi PPK: Tidak aktif (tombol hilang)   │
└──────────┬──────────────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │ User Edit Item     │
  │ - Ubah Volume      │
  │ - Ubah Harga       │
  │ - Klik Save        │
  └────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ handleUpdateItem (Backend)               │
│                                          │
│ dataChanged = TRUE                       │
│ Reset Approval:                          │
│  - status = 'changed'                    │
│  - approved_by = undefined               │
│  - rejected_date = undefined ← KEY FIX!  │
│                                          │
│ updateItem() → Save to Sheet             │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Table Re-render (Auto)                   │
│                                          │
│ Status Badge: ⚠️ Berubah (Kuning)        │
│ isRejected() = FALSE (rejected_date undef)│
│ Aksi PPK: ✅ TOMBOL AKTIF!               │
│   ├─ [✅] Setujui (Hijau)                │
│   └─ [❌] Tolak (Merah)                  │
└──────┬───────────────────────────────────┘
       │
       ▼
  ┌─────────────────┐
  │ PPK Action      │
  └────────┬────────┘
           │
      ┌────┴────┐
      ▼         ▼
   APPROVE   REJECT
      │         │
      ▼         ▼ (PPK input alasan)
   APPROVED  REJECTED
```

## 📊 Technical Details

### Function: handleUpdateItem (BahanRevisiAnggaran.tsx)

**Location**: Line 183-235

**Logic**:
1. Find original item
2. Merge with updates
3. **Detect Data Change**: Check 4 fields (volume, satuan, harga, jumlah)
4. **Recalculate**: jumlah_menjadi & selisih
5. **Reset Logic**:
   - IF dataChanged:
     - status = 'changed'
     - approved_by = undefined
     - approved_date = undefined
     - **rejected_date = undefined** ← NEW!
   - ELSE: Keep original logic
6. Save & Toast notification

### Conditional Check (BahanRevisiBudgetTable.tsx)

**Location**: Line 393

**Condition**:
```typescript
{!isApproved(item) && !isRejected(item) && isAdmin && (
  // Render approve/reject buttons
)}
```

**Function Checks**:
```typescript
// isApproved: Approved both by and date exist
export const isApproved = (item: BudgetItem): boolean => {
  return !!item.approved_by && !!item.approved_date;
};

// isRejected: Rejected date exists
export const isRejected = (item: BudgetItem): boolean => {
  return !!item.rejected_date;
};
```

## ✅ Testing Scenarios

### Scenario 1: Edit Approved Item
```
Initial: status='changed', approved_by='ppk3210', approved_date='2026-02-17'
Edit & Save
Result: status='changed', approved_by=undefined, approved_date=undefined
Expected: Buttons muncul ✅
```

### Scenario 2: Edit Rejected Item
```
Initial: status='changed', rejected_date='2026-02-17', approved_by=undefined
Edit & Save
Result: status='changed', rejected_date=undefined, approved_by=undefined
Expected: Buttons muncul ✅ (tombol tidak muncul saat rejected karena isRejected=true)
```

### Scenario 3: PPK Approve After Edit/Revisi
```
Initial: status='changed', approved_by=undefined
PPK Click Approve
Result: status='changed', approved_by='ppk3210', approved_date='2026-02-17'
Expected: Buttons hilang ✅
```

### Scenario 4: Non-PPK User Sees Item Changed
```
Role: Fungsi Xxx (bukan PPK)
Item Status: Berubah (changed)
Expected: Buttons tidak ada, hanya lihat status "Menunggu Approval" ✅
```

## 📝 Toast Notifications

### Setelah Edit Item:
```
Success
"Item berhasil diperbarui. Pengajuan revisi disimpan. Status kembali menunggu persetujuan PPK."
```

### Approval Status Changes:

**Approve**:
```
Success
"Item berhasil disetujui"
```

**Reject**:
```
Success
"Item berhasil ditolak"
```

## 🔍 Code Changes Summary

| File | Function | Changes |
|------|----------|---------|
| BahanRevisiAnggaran.tsx | handleUpdateItem | Clear `rejected_date` + improve toast message |
| BahanRevisiBudgetTable.tsx | - | No change needed (conditional sudah benar) |
| DetailDialog.tsx | - | No change (hanya display status) |
| Utils | - | No change (logic isRejected sudah benar) |

## ✨ Benefits

✅ **Clear Approval Flow**: Revisi dianggap pengajuan ulang  
✅ **No Misleading Status**: Status UI selalu sesuai dengan data  
✅ **Role-Based Access**: PPK dapat approve/reject sesuai haknya  
✅ **User Experience**: User tahu kapan perlu re-approval setelah revisi  
✅ **Consistent Workflow**: Alur approval berjenjang berjalan sesuai proses  

## 🐛 Bug Fixes

| Bug | Fix | Status |
|-----|-----|--------|
| Item ditolak, status tidak reset saat edit | Clear rejected_date di handleUpdateItem | ✅ Fixed |
| PPK tidak bisa approve item setelah ditolak | Conditional check bekerja dgn baik (rejected_date cleared) | ✅ Fixed |
| Misleading status di UI | Status otomatis update, toast notif jelas | ✅ Fixed |

---

**Status**: ✅ Fully Implemented & Tested  
**Last Updated**: February 17, 2026
