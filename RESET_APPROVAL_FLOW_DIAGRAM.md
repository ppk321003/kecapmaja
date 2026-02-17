# Flow Diagram: Reset Approval Status on Edit

## Flowchart - Complete Flow

```
┌─────────────────────────────────┐
│   Item Status: APPROVED         │
│   (approved_by: 'ppk3210',      │
│    approved_date: '2026-02-17') │
└──────────────┬──────────────────┘
               │
               ▼
     ┌─────────────────┐
     │  User klik Eye  │
     │  (View Detail)  │
     └──────┬──────────┘
            │
            ▼
   ┌──────────────────────┐
   │  Detail Dialog Open  │
   │  (Read-only view)    │
   └──────┬───────────────┘
          │
          ▼
     ┌─────────────────────────┐
     │  User klik Edit Button  │
     │  (Edit Dialog Opens)    │
     └──────┬──────────────────┘
            │
            ▼
    ┌──────────────────────────┐
    │  Edit Fields:            │
    │  - Volume: 13 → 15       │
    │  - Harga: Rp 170K        │
    │  - Satuan: OK            │
    └──────┬───────────────────┘
           │
           ▼ [Save Changes]
    ┌──────────────────────────────┐
    │  handleEditSave Triggered    │
    │  (Dialog tutup)              │
    └──────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  handleUpdateItem(itemId, updates)   │
│                                      │
│  1. Calculate new jumlah_menjadi     │
│  2. Calculate new selisih            │
│  3. DETECT PERUBAHAN DATA ⭐         │
│     dataChanged = true (vol berbeda) │
│                                      │
│  4. RESET APPROVAL STATUS ⭐         │
│     IF dataChanged:                  │
│       status = 'changed'             │
│       approved_by = undefined        │
│       approved_date = undefined      │
│                                      │
│  5. updateItem() → Save to Sheet     │
└──────┬───────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  Toast Notification:               │
│  "Item berhasil diperbarui.        │
│   Status persetujuan direset        │
│   untuk persetujuan ulang oleh PPK" │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  TABLE RE-RENDER (AUTO)            │
│  isApproved(item) = FALSE          │
│  (karena approved_by = undefined)   │
└────────┬───────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Item Row Background: KUNING      │
│  (Status: Berubah)               │
│                                  │
│  Aksi SM/PJK Column:             │
│  ├─ [👁️] View Detail (Ungu)      │
│  ├─ [✏️] Edit (Biru)             │
│  └─ [🗑️] Delete (Merah)          │
│                                  │
│  Aksi PPK Column:                │
│  ├─ [✓] APPROVE (Hijau) ← AKTIF  │
│  └─ [✗] REJECT (Merah) ← AKTIF   │
└────────┬──────────────────────────┘
         │
         ▼
    ┌────────────────────┐
    │  PPK Action Choice │
    └────────┬───────────┘
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
    ┌──────┐   ┌───────┐
    │APPROVE│   │REJECT │
    └───┬──┘   └───┬───┘
        │          │
        ▼          ▼
   [Approved] [Rejected]
```

---

## State Transition Table

```
┌─────────────────┬──────────────────┬──────────────┬────────────┐
│ Initial Status  │ User Action      │ New Status   │ PPK Buttons│
├─────────────────┼──────────────────┼──────────────┼────────────┤
│ Approved ✓      │ Edit (ubah data) │ Changed ⚠️   │ ✓ ✗ Active │
│                 │                  │              │            │
│ Changed ⚠️      │ View (lihat)     │ Changed ⚠️   │ ✓ ✗ Active │
│                 │ Edit (ubah lagi) │ Changed ⚠️   │ ✓ ✗ Active │
│                 │                  │              │            │
│ Changed ⚠️      │ Approve (PPK✓)   │ Approved ✓   │ ✓ Inactive │
│ (setelah reset) │                  │              │            │
│                 │ Reject (PPK✗)    │ Rejected ✗   │ ✓ ✗ Active │
│                 │                  │              │            │
│ New ⭐          │ Edit             │ New ⭐       │ ✓ ✗ Active │
│ (item baru)     │ Approve          │ Approved ✓   │ ✓ Inactive │
│                 │ Reject           │ Rejected ✗   │ ✓ ✗ Active │
└─────────────────┴──────────────────┴──────────────┴────────────┘
```

---

## Code Execution Flow

```javascript
// 1. User klik tombol Edit
const handleEditOpen = (item: BudgetItem) => {
  setEditingItem(item);
  // Dialog open
}

// 2. User ubah nilai dan klik Save
const handleEditSave = () => {
  onUpdate?.(editingItem.id, {
    volume_menjadi: editFormData.volume_menjadi,    // ← Ubah dari 13 menjadi 15
    harga_satuan_menjadi: editFormData.harga_satuan_menjadi,
    // ...
  });
  handleEditClose();
}

// 3. Parent component handler callback
const handleUpdateItem = (itemId: string, updates: Partial<BudgetItem>) => {
  const originalItem = budgetItems[itemIndex];
  let updatedItem = { ...originalItem, ...updates };
  
  // 4. DETECT PERUBAHAN DATA
  const dataChanged = 
    originalItem.volume_menjadi !== updatedItem.volume_menjadi ||  // 13 !== 15 → TRUE
    originalItem.satuan_menjadi !== updatedItem.satuan_menjadi ||
    originalItem.harga_satuan_menjadi !== updatedItem.harga_satuan_menjadi ||
    originalItem.jumlah_menjadi !== updatedItem.jumlah_menjadi;
  
  if (dataChanged) {  // dataChanged = TRUE
    // 5. RESET APPROVAL
    updatedItem.status = 'changed';
    updatedItem.approved_by = undefined;      // ← Clear approved_by
    updatedItem.approved_date = undefined;    // ← Clear approved_date
  }
  
  // 6. Save to sheet
  updateItem({ itemId, updates: updatedItem, allItems: budgetItems });
  
  // 7. Toast notification
  toast({
    title: 'Success',
    description: 'Item berhasil diperbarui. Status persetujuan direset...'
  });
}

// 8. Table re-render, isApproved(item) check:
export const isApproved = (item: BudgetItem): boolean => {
  return !!item.approved_by && !!item.approved_date;
  // undefined && undefined = FALSE ← Tombol muncul!
};

// 9. Aksi PPK buttons render:
if (!isApproved(item) && !isRejected(item) && isAdmin) {  // TRUE && TRUE && TRUE
  // Render [✓] dan [✗] buttons
}
```

---

## Before & After Comparison

### BEFORE (Manual Flow)
```
Status Approved
  ↓
User Edit
  ↓
Status: unchanged (atau perlu manual change)
  ↓
PPK: Tidak tahu ada perubahan
  ↓
❌ Approval lama masih berlaku
❌ Perlu manual reset atau notifikasi
```

### AFTER (Automatic Flow)
```
Status Approved (dengan approved_by & approved_date)
  ↓
User Edit (ubah volume/harga/satuan)
  ↓
handleUpdateItem:
  - Detect perubahan data ✅
  - Reset approval otomatis ✅
  - Set status changed ✅
  ↓
Toast notification: "Status persetujuan direset..." ✅
  ↓
Table Re-render:
  - isApproved() = FALSE ✅
  - Aksi PPK buttons AKTIF ✅
  - Row background KUNING ✅
  ↓
PPK: Langsung lihat item butuh approval baru
  ↓
✅ Approval flow otomatis & clear
✅ No manual intervention needed
```

---

## Key Implementation Details

### 1. Data Fields Monitored
```typescript
const dataChanged = 
  originalItem.volume_menjadi !== updatedItem.volume_menjadi ||       // Edit volume
  originalItem.satuan_menjadi !== updatedItem.satuan_menjadi ||       // Edit satuan
  originalItem.harga_satuan_menjadi !== updatedItem.harga_satuan_menjadi || // Edit harga
  originalItem.jumlah_menjadi !== updatedItem.jumlah_menjadi;         // Calculated change
```

### 2. Approval Reset
```typescript
if (dataChanged) {
  updatedItem.status = 'changed';       // Status jelas ada perubahan
  updatedItem.approved_by = undefined;  // Clear approver info
  updatedItem.approved_date = undefined;// Clear approval timestamp
}
```

### 3. Button Condition Check
```typescript
{!isApproved(item) && !isRejected(item) && isAdmin && (
  // Render approve/reject buttons
  // TRUE karena approved_by = undefined
)}
```

### 4. Toast Feedback
```typescript
toast({
  title: 'Success',
  description: dataChanged 
    ? 'Item berhasil diperbarui. Status persetujuan direset untuk persetujuan ulang oleh PPK.'
    : 'Item berhasil diperbarui'
});
```

---

**Status**: ✅ Complete Implementation  
**Impact**: Automatic Approval Flow Reset  
**Last Updated**: February 17, 2026
