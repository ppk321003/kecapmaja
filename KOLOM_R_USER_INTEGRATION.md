# Integrasi Kolom R (User) - Sheet 'data' Pencairan

## 📋 Ringkasan Perubahan

Kolom R telah berhasil diintegrasikan ke dalam sistem pencairan SPJ. Kolom ini menyimpan **login role** (role akun) yang membuat 'Buat Pengajuan Baru' (pengajuan permulaan).

---

## 🗂️ Struktur Sheet 'data' (18 Kolom)

| Kolom | Nama | Deskripsi | Index |
|-------|------|-----------|-------|
| A | ID | ID Pengajuan (SUB-YYMMXXXX) | 0 |
| B | Uraian Pengajuan | Judul/Uraian Pengajuan | 1 |
| C | Nama Pengaju | Nama Pembuat Pengajuan | 2 |
| D | Jenis Pengajuan | Jenis Belanja - Sub Jenis | 3 |
| E | Kelengkapan | Dokumen yang dilengkapi | 4 |
| F | Catatan | Catatan/Notes | 5 |
| G | Status Pengajuan | Status (draft, pending_*, complete_*, incomplete_*) | 6 |
| H | Waktu Pengajuan | Waktu dibuat SM (HH:mm - dd/MM/yyyy) | 7 |
| I | Waktu Bendahara | Waktu diproses Bendahara | 8 |
| J | Waktu PPK | Waktu diproses PPK | 9 |
| K | Waktu PPSPM | Waktu diproses PPSPM | 10 |
| L | Waktu Arsip | Waktu dicatat Arsip | 11 |
| M | Status Bendahara | Disetujui/Ditolak (Bendahara) | 12 |
| N | Status PPK | Disetujui/Ditolak (PPK) | 13 |
| O | Status PPSPM | Disetujui/Ditolak (PPSPM) | 14 |
| P | Status Arsip | Disetujui/Ditolak (Arsip) | 15 |
| Q | Update Terakhir | Timestamp update terakhir | 16 |
| **R** | **User** | **🆕 Role login pembuat pengajuan** | **17** |

---

## 📝 File yang Diupdate

### 1. **src/types/pencairan.ts**
- ✅ Menambahkan field `user?: string` ke interface `Submission`
- **Deskripsi**: User adalah role login dari akun yang membuat pengajuan baru

```typescript
export interface Submission {
  // ... field existing ...
  user?: string; // 🆕 Kolom R - role login yang membuat 'Buat Pengajuan Baru'
}
```

### 2. **src/hooks/use-pencairan-data.ts**
- ✅ Menambahkan field `user?: string` ke interface `PencairanRawData`
- ✅ Update range pembacaan dari `A:Q` (17 kolom) menjadi `A:R` (18 kolom)
- ✅ Update logika mapping raw data untuk mengenali 3 struktur:
  - **Old (16 kolom)**: Tanpa Waktu Bendahara
  - **Current (17 kolom)**: Dengan Waktu Bendahara, tanpa User
  - **New (18 kolom)**: Dengan Waktu Bendahara + User
- ✅ Update `mapRawToSubmission()` untuk menyertakan field `user`

```typescript
export interface PencairanRawData {
  // ... field existing ...
  user?: string; // 🆕 Kolom R - role login yang membuat pengajuan
}
```

### 3. **src/components/pencairan/SubmissionForm.tsx**
- ✅ Update kedua fungsi pencairan-save (draft dan submit) untuk mengirim user role
- ✅ Menangkap `user?.role` dari `useAuth()` context
- ✅ Menambahkan field `user: user?.role || ''` ke request body

```typescript
// Draft save
const { data, error } = await supabase.functions.invoke('pencairan-save', {
  body: {
    // ... field existing ...
    user: user?.role || '', // 🆕 Kolom R - role login pembuat
  },
});

// Submit
const { data, error } = await supabase.functions.invoke('pencairan-save', {
  body: {
    // ... field existing ...
    user: user?.role || '', // 🆕 Kolom R - role login pembuat
  },
});
```

### 4. **supabase/functions/pencairan-save/index.ts**
- ✅ Tambahkan parameter `user` dari request body
- ✅ Update array `rowData` dari 17 menjadi 18 elemen
- ✅ Kolom R diisi dengan `user || ''`
- ✅ Update range append dari `A:Q` menjadi `A:R`

```typescript
const rowData = [
  id || '',                   // A
  uraianPengajuan || '',      // B
  // ... (C sampai Q) ...
  user || '',                 // R: 🆕 User (role login pembuat)
];

// Append dengan range A:R untuk 18 kolom
const response = await fetch(
  `${baseUrl}/values/${SHEET_NAME}!A:R:append?valueInputOption=USER_ENTERED`,
  // ...
);
```

### 5. **supabase/functions/pencairan-update/index.ts**
- ✅ Update range pembacaan dari `A:Q` menjadi `A:R`
- ✅ Menambahkan logika membaca field `user` dari row existing (index 17)
- ✅ Preserve field `user` saat melakukan update (tidak mengubah nilai user asli)
- ✅ Update array `updatedRow` dari 17 menjadi 18 elemen
- ✅ Update range update dari `A:Q` menjadi `A:R`

```typescript
// Baca kolom R
const user = currentRow.length > 17 ? currentRow[17] || '' : '';

// Updated row dengan user
const updatedRow = [
  // ... (A sampai Q) ...
  user,                       // R: Preserve user (🆕)
];

// Update dengan range A:R
const updateResponse = await fetch(
  `${baseUrl}/values/${SHEET_NAME}!A${rowIndex}:R${rowIndex}?valueInputOption=USER_ENTERED`,
  // ...
);
```

---

## 🔄 Alur Data

### Saat Membuat Pengajuan Baru (Create)
```
Frontend (SubmissionForm)
  ↓ Capture user?.role dari AuthContext
  ↓ POST ke pencairan-save dengan field: user
  ↓ Edge Function pencairan-save
  ↓ Append ke Google Sheets (18 kolom A:R)
  ↓ Kolom R terisi dengan role login pembuat
```

### Saat Membaca Pengajuan (Read)
```
Frontend (UsulanPencairan)
  ↓ Call usePencairanData()
  ↓ Hook invoke google-sheets (range A:R)
  ↓ Parse raw data (detect 16/17/18 kolom)
  ↓ Map ke Submission object dengan user field
  ↓ Display di UI
```

### Saat Update/Edit Pengajuan
```
Frontend (SubmissionForm)
  ↓ POST ke pencairan-update
  ↓ Edge Function pencairan-update
  ↓ Baca existing row (preserve kolom R)
  ↓ Update row (keep user value)
  ↓ Write back ke Google Sheets
```

---

## ✅ Validasi

Semua file telah di-verify dan tidak ada error:
- ✅ src/types/pencairan.ts - No errors
- ✅ src/hooks/use-pencairan-data.ts - No errors
- ✅ src/components/pencairan/SubmissionForm.tsx - No errors
- ✅ supabase/functions/pencairan-save/index.ts - No errors
- ✅ supabase/functions/pencairan-update/index.ts - No errors

---

## 🚀 Backward Compatibility

Sistem mendukung **3 struktur sheet**:
1. **Old (16 kolom)**: Sheet lama tanpa Waktu Bendahara dan User
2. **Current (17 kolom)**: Sheet dengan Waktu Bendahara, tanpa User
3. **New (18 kolom)**: Sheet dengan Waktu Bendahara + User (saat ini)

Logic mapping otomatis mendeteksi struktur berdasarkan jumlah kolom dan memproses dengan benar.

---

## 📌 Catatan Penting

- **User field bersifat optional** (`user?: string`) untuk backward compatibility
- **User value** di-preserve saat melakukan update (tidak akan berubah)
- **User adalah READ-ONLY** - hanya diisi saat create, tidak bisa diubah saat edit
- Jika user tidak tersedia, kolom R akan kosong (default empty string)

---

## 📖 Testing Checklist

Saat melakukan testing, pastikan:
- [ ] Buat pengajuan baru → Kolom R terisi dengan role user
- [ ] Edit pengajuan draft → Kolom R tetap sama (tidak berubah)
- [ ] Baca data pengajuan → Field `user` tersedia di object `Submission`
- [ ] Sheet lama (16/17 kolom) → Tetap bisa dibaca tanpa error
- [ ] Query A:R → Mengembalikan 18 kolom dengan benar

---

**Last Updated**: February 26, 2026
**Status**: ✅ Implementation Complete
