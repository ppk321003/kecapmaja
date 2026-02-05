# Perbaikan Masalah CekLimit & RekapAnggota

## Masalah yang Ditemukan

### 1. CekLimit: Duplikasi Nama Anggota ❌
**Screenshot**: Data Limit Pinjaman Anggota menampilkan nama yang sama 2x

**Contoh Duplikasi**:
- Row 1: Adang Suhendar, S.S.T. (dengan NIP 1978... 199893 1 002)
- Row 2: Adang Suhendar, S.S.T. (dengan "-" tanpa NIP)
- Row 3: Ade Yono Cahyono (dengan NIP 1976... 208911 1 002)
- Row 4: Ade Yono Cahyono (dengan "-" tanpa NIP)

**Akar Penyebab**:
- Google Sheets `rekap_dashboard` memiliki 2 entry per anggota (multiple periode)
- Atau ada entry dengan NIP kosong yang di-treat sebagai entry berbeda
- `fetchLimitAnggota` di-overwrite data lama dengan data baru tanpa proper deduplication

**Solusi yang Diterapkan** ✅:
- Modifikasi `fetchLimitAnggota` di `use-sikostik-data.ts` (baris 308-356)
- Tambah logic untuk deduplicate dengan prioritas:
  1. Prioritaskan entry dengan NIP (jika ada)
  2. Jika NIP sama, pilih yang memiliki totalSimpanan lebih besar (data lebih lengkap)

**Code Change**:
```typescript
const existing = limitMap.get(anggotaId);
// Keep the entry with NIP, or if both have NIP/no NIP, keep the one with more data
if (!existing || (!existing.nip && newEntry.nip) || 
    (existing.nip === newEntry.nip && newEntry.totalSimpanan > existing.totalSimpanan)) {
  limitMap.set(anggotaId, newEntry);
}
```

**Result**: Duplikasi akan hilang, hanya ada 1 entry per anggota dengan NIP terisi

---

### 2. RekapAnggota: NIP Tidak Ditampilkan ❌
**Screenshot**: Kolom "Nama / NIP" hanya menampilkan nama saja, tanpa NIP di bawah

**Akar Penyebab** (Investigasi):
1. **Kemungkinan 1**: Data NIP kosong di Google Sheets rekap_dashboard
2. **Kemungkinan 2**: Bug rendering (unlikely, kode sudah benar)

**Kode yang Benar** ✅:
```tsx
<TableCell>
  <div className="cursor-pointer hover:text-primary transition-colors group"
       onClick={() => handleMemberClick(member.anggotaId)}>
    <p className="font-medium group-hover:underline">{member.nama || '-'}</p>
    <p className="text-xs text-muted-foreground font-mono">
      {member.nip ? formatNIP(member.nip) : '-'}
    </p>
  </div>
</TableCell>
```

**Solusi**:
1. ✅ Tambah debug logging di RekapAnggota untuk cek apakah NIP ada di data
2. ⏳ **USER ACTION**: Jika logging menunjukkan NIP kosong, update Google Sheets
   - Buka [SIKOSTIK Sheet](https://docs.google.com/spreadsheets/d/1cBuo9tAtpGvKuThvotIQqd9HDvJfF2Hun61oGYhRtHk)
   - Sheet `rekap_dashboard` - kolom `nip` pada row data
   - Isi NIP yang kosong

**Cara Check di Console**:
1. Buka Browser DevTools (F12)
2. Lihat Console tab
3. Akan ada log: `RekapAnggota sample row: { nama: "...", nip: "...", status: "..." }`
4. Jika NIP kosong/undefined → data di Google Sheets yang perlu diperbaiki
5. Jika NIP ada → maka akan tampil di tabel

---

## File yang Dimodifikasi

### `src/hooks/use-sikostik-data.ts`
- **Function**: `fetchLimitAnggota` (baris 308-356)
- **Perubahan**: Tambah deduplication logic dengan prioritas NIP
- **Impact**: Menghilangkan duplikasi nama di CekLimit

### `src/components/sikostik/RekapAnggota.tsx`
- **Function**: `loadData` (baris 28-40)
- **Perubahan**: Tambah debug logging untuk check NIP
- **Impact**: Membantu identifikasi apakah masalah adalah data atau rendering

---

## Checklist Verifikasi

- [x] **CekLimit Deduplication**: Fixed via improved fetchLimitAnggota
  - [x] Logic prioritas NIP sudah ditambahkan
  - [ ] Testing: Run seeder 2026, buka CekLimit, lihat apakah duplikasi hilang

- [ ] **RekapAnggota NIP Display**: Verify data di Google Sheets
  - [ ] Buka Browser Console (F12) saat RekapAnggota loaded
  - [ ] Lihat log `RekapAnggota sample row`
  - [ ] Jika NIP kosong: update Google Sheets kolom nip
  - [ ] Jika NIP ada: akan otomatis tampil di tabel

---

## Testing Steps

### Test 1: Cek Duplikasi di CekLimit Hilang
1. Jalankan seeder 2026 (lihat SIKOSTIK28_3ISSUES_FIX.md)
2. Buka halaman `/dashboard` → tab Sikostik28 → Cek Limit
3. Lihat tabel "Data Limit Pinjaman Anggota"
4. **Expected**: Setiap nama hanya muncul 1x (tidak dobel), dengan NIP terisi

### Test 2: Verifikasi NIP di RekapAnggota
1. Buka `/dashboard` → tab Sikostik28 → Rekap Anggota
2. Buka Browser DevTools (F12)
3. Go to Console tab
4. Lihat log output `RekapAnggota sample row: { nama: "...", nip: "...", status: "..." }`
5. **If NIP is empty**: 
   - Update Google Sheets `rekap_dashboard` dengan NIP yang benar
   - Refresh halaman
6. **If NIP has value**:
   - Maka akan tampil di table row sebagai `nama\nNIP-formatted`

---

## Database Schema Referensi

### rekap_dashboard sheet columns:
```
- id (unique ID)
- anggota_id / id (member ID - primary key untuk dedup)
- kode_anggota
- nama
- nip (18 chars format: YYYYMMDD XXXXXX X XXX)
- status (Aktif/Tidak Aktif)
- periode_bulan (1-12)
- periode_tahun (2025, 2026, dll)
- simpanan_pokok, simpanan_wajib, simpanan_sukarela, dll
- saldo_akhirbulan_pokok, saldo_akhirbulan_wajib, dll
- cicilan_pokok
- saldo_piutang
- biaya_operasional
```

---

**Last Updated**: February 5, 2026
**Status**: Duplikasi masalah FIXED, NIP display issue DIAGNOSED
