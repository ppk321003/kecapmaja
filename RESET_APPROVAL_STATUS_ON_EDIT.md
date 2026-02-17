# Reset Approval Status - Edit Item Budget

## Overview
Ketika user melakukan perubahan (edit) pada item budget yang sudah di-approve oleh PPK, status item otomatis direset dari "Approved" menjadi "Changed" dan approval status dihapus. Hal ini memastikan bahwa semua perubahan data harus di-approve oleh PPK sebelum difinalisasi.

## Flow & Logic

### Sebelumnya (v1)
```
Item Approved
   ↓
User Edit Item
   ↓
Item Status: Tetap berubah (sesuai logic lama)
   ↓
Aksi PPK: Tidak aktif (butuh manual)
```

### Sekarang (v2 - Fixed)
```
Item Approved
   ↓
User Edit Item (ubah volume/harga/satuan)
   ↓
Detect Ada Perubahan Data
   ↓
Reset Approval Status:
   - status = 'changed'
   - approved_by = undefined
   - approved_date = undefined
   ↓
Container/Table Re-render
   ↓
Aksi PPK: Otomatis Aktif Lagi ✅
```

## Implementasi Detail

### Function: handleUpdateItem (BahanRevisiAnggaran.tsx)

#### 1. Detect Perubahan Data
```typescript
const dataChanged = 
  originalItem.volume_menjadi !== updatedItem.volume_menjadi ||
  originalItem.satuan_menjadi !== updatedItem.satuan_menjadi ||
  originalItem.harga_satuan_menjadi !== updatedItem.harga_satuan_menjadi ||
  originalItem.jumlah_menjadi !== updatedItem.jumlah_menjadi;
```

**Fields yang di-monitor**:
- `volume_menjadi` - Volume yang dirubah
- `satuan_menjadi` - Satuan yang dirubah
- `harga_satuan_menjadi` - Harga yang dirubah
- `jumlah_menjadi` - Jumlah otomatis (hasil perhitungan)

#### 2. Reset Approval Jika Ada Perubahan
```typescript
if (dataChanged) {
  updatedItem.status = 'changed';
  updatedItem.approved_by = undefined;
  updatedItem.approved_date = undefined;
} else {
  // Jika tidak ada perubahan data, use standard logic
  ...
}
```

#### 3. Toast Notification
User notifikasi perubahan status:
```javascript
toast({
  title: 'Success',
  description: 'Item berhasil diperbarui. Status persetujuan direset untuk persetujuan ulang oleh PPK.',
});
```

## UI/UX Flow

### 1. Table Display - Item Approved
```
┌────────┬──────────┬──────────┐
│ Item   │ Status   │ Aksi PPK │
├────────┼──────────┼──────────┤
│ ABC123 │ ✓Disetujui│   ✓     │
└────────┴──────────┴──────────┘
        (Tombol approve/reject tidak aktif)
```

### 2. User Edit Item
```
Dialog Edit Item
├─ Volume Menjadi: [13] → [15]
├─ Harga Satuan: [Rp 170.000]
└─ [Save] button
```

### 3. Table Display - Setelah Edit (AUTO RELOAD)
```
┌────────┬──────────┬──────────┐
│ Item   │ Status   │ Aksi PPK │
├────────┼──────────┼──────────┤
│ ABC123 │ Berubah  │ ✓ ✗  │
└────────┴──────────┴──────────┘
        (Tombol approve/reject KEMBALI AKTIF)
```

**Background row**: KUNING (status changed)

### 4. PPK Approve/Reject

#### PPK Approve
```
PPK lihat status Berubah
   ↓
Klik tombol ✓ (Check)
   ↓
Item Status: Disetujui
   ↓
Tombol approve/reject menjadi not active
```

#### PPK Reject
```
PPK lihat status Berubah
   ↓
Klik tombol ✗ (X)
   ↓
Dialog: Masukkan alasan penolakan
   ↓
Item Status: Ditolak
   ↓
Tombol approve/reject menjadi not active
```

## Conditional Logic - Aksi PPK Buttons

### Tombol Approve & Reject AKTIF jika:
```typescript
{!isApproved(item) && !isRejected(item) && isAdmin && (
  <>
    <Button onClick={handleApprove}>✓</Button>
    <Button onClick={handleReject}>✗</Button>
  </>
)}
```

**Kondisi**:
- `!isApproved(item)` - Item belum di-approve (atau approval reset)
- `!isRejected(item)` - Item belum di-reject
- `isAdmin` - User adalah PPK (Pejabat Pembuat Komitmen)

### Check isApproved
```typescript
export const isApproved = (item: BudgetItem): boolean => {
  return !!item.approved_by && !!item.approved_date;
};
```

Jadi ketika `approved_by = undefined` dan `approved_date = undefined`, fungsi akan return `false`, tombol akan otomatis muncul.

## Status Values

| Status | approved_by | approved_date | Aksi PPK | Warna |
|--------|-------------|---------------|----------|-------|
| changed | `undefined` | `undefined` | ✓ ✗ Aktif | Kuning |
| unchanged | `undefined` | `undefined` | ✓ ✗ Aktif | Putih |
| new | `undefined` | `undefined` | ✓ ✗ Aktif | Hijau |
| Approved | Ada username | Ada timestamp | Tidak aktif | ✓ Hijau |
| Rejected | `undefined` | Ada timestamp | ✓ ✗ Aktif | ✗ Merah |

## Skenario Penggunaan

### Skenario 1: Perubahan Data pada Item Approved
```
Status Awal: Disetujui (approved_by='ppk3210', approved_date='2026-02-17')
Edit: Ubah volume dari 13 OK → 15 OK
   ↓ dataChanged = true
Status Baru: Changed (approved_by=undefined, approved_date=undefined)
Hasil: Aksi PPK kembali aktif, harus di-approve ulang
```

### Skenario 2: Edit Tanpa Perubahan Data (hanya kolom lain)
```
Catatan atau field non-data diubah
   ↓ dataChanged = false
Status: Tetap sesuai logic normal
Hasil: Tidak ada reset approval
```

**Note**: Saat ini yang di-monitor hanya data utama (volume, satuan, harga). Field lain tidak trigger reset.

### Skenario 3: PPK Approve Item setelah Reset
```
Status: Changed (dari reset)
PPK: Klik tombol ✓ (Approve)
   ↓ callApproveItem()
Status Baru: Approved (approved_by='ppk3210', approved_date='2026-02-17T...')
Aksi PPK: Kembali tidak aktif
```

## Code Changes

### File: BahanRevisiAnggaran.tsx

**Function**: `handleUpdateItem` (Update ~60 lines)

**Changes**:
1. ✅ Add dataChanged detection (check 4 fields)
2. ✅ Reset approval if dataChanged = true
3. ✅ Add toast message with dynamic text
4. ✅ Keep original logic for non-data changes

## Testing Checklist

- ✅ Edit item yang approved → status berubah ke "changed"
- ✅ Edit item yang approved → approved_by & approved_date di-reset
- ✅ Aksi PPK tombol muncul setelah reset approval
- ✅ Toast notification muncul dengan pesan yang tepat
- ✅ Table row background berubah ke kuning (status changed)
- ✅ Edit item yang belum approved → status normal (tidak double-reset)
- ✅ Edit field non-data → tidak trigger reset (jika ada)
- ✅ PPK dapat approve/reject item setelah reset
- ✅ Setelah PPK approve → status kembali approved
- ✅ Aksi PPK tombol hilang setelah approve

## Benefits

✅ **Data Integrity** - Semua perubahan harus di-approve ulang  
✅ **Clear Workflow** - User tahu kapan butuh persetujuan baru  
✅ **Prevent Bypass** - Tidak ada cara skip approval setelah edit  
✅ **Auto UI Update** - Tidak perlu refresh manual, UI auto update  
✅ **Good UX** - Toast notification memberikan feedback yang jelas  

## Related Components

| Component | Impact |
|-----------|--------|
| BahanRevisiBudgetTable | Render logic tidak berubah (conditional sudah benar) |
| DetailDialog | Tampilkan status terbaru, sudah benar |
| SummaryCardsBar | Perhitungan tetap akurat |
| Utility Functions | `isApproved()`, `isRejected()` - tidak perlu ubah |

---

**Status**: ✅ Implemented  
**Last Updated**: February 17, 2026
