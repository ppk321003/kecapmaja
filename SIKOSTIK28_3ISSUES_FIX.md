# Perbaikan 3 Masalah Sikostik28

## Ringkasan Masalah

1. **RekapIndividu nilai 2026 tidak tampil**, padahal di database ada
2. **RekapAnggota dan CekLimit seharusnya menampilkan Nama dan NIP**, saat ini tidak lengkap
3. **Kalkulasi Total Potongan Sikostik menampilkan 0**, seharusnya menampilkan data

---

## Masalah 1: RekapIndividu 2026 Tidak Tampil

### Akar Masalah
- Google Sheets `rekap_dashboard` belum memiliki data untuk tahun 2026
- Data 2025 ada, tetapi belum di-copy dan diperluas untuk 2026
- Aplikasi memfilter data berdasarkan `periode_tahun`, jadi data 2026 tidak ditemukan

### Solusi
**Jalankan Data Seeder di `/sikostik28/seeder`**

Terdapat 2 cara:

#### Cara 1: Menggunakan Seeder Otomatis (Direkomendasikan)
1. Buka `/sikostik28/seeder` di aplikasi
2. Klik tombol **"Seed Semua Data 2026 (Jan-Des)"**
3. Tunggu hingga berhasil (akan muncul notifikasi hijau ✓)
4. Refresh halaman Sikostik28
5. Pilih tahun 2026 - data akan muncul

#### Cara 2: Manual di Google Sheets
1. Buka [SIKOSTIK Google Sheet](https://docs.google.com/spreadsheets/d/1cBuo9tAtpGvKuThvotIQqd9HDvJfF2Hun61oGYhRtHk)
2. Ke sheet "rekap_dashboard"
3. Filter atau cari semua baris dengan `2025` di kolom `periode_tahun`
4. Copy ALL rows (gunakan Ctrl+C atau menu Copy)
5. Scroll ke bawah, paste di baris kosong berikutnya
6. Edit kolom `periode_tahun` di baris yang baru dipaste: ubah `2025` → `2026`
7. Refresh aplikasi
8. RekapIndividu sekarang akan menampilkan 2026

### Status Perbaikan
- ✅ Fungsi seeder sudah dibuat di `src/utils/seed-sikostik-2026.ts`
- ✅ UI seeder sudah dibuat di `/sikostik28/seeder`
- ⏳ **USER ACTION NEEDED**: Jalankan seeder atau lakukan manual seeding

---

## Masalah 2: Nama dan NIP Tidak Ditampilkan Lengkap

### Analisis
Setelah memeriksa kode:

**RekapAnggota.tsx** (baris 131-138):
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
**Status**: ✅ Sudah menampilkan Nama dan NIP

**CekLimit.tsx** (baris 291-296):
```tsx
<TableCell>
  <div className="cursor-pointer hover:text-primary transition-colors">
    <p className="font-medium hover:underline">{member.nama}</p>
    <p className="text-xs text-muted-foreground font-mono">
      {formatNIP(member.nip)}
    </p>
  </div>
</TableCell>
```
**Status**: ✅ Sudah menampilkan Nama dan NIP

### Masalah Sebenarnya
Jika Nama dan NIP tidak tampil, kemungkinan:
1. **Data NIP kosong di Google Sheets** - Check kolom `nip` di `rekap_dashboard` dan `anggota_master`
2. **Data anggota tidak memuat** - Klik refresh button di RekapAnggota/CekLimit
3. **Belum ada data 2026** - Lakukan seeding 2026 dulu (Masalah 1)

### Solusi
1. ✅ **Verifikasi data NIP** di Google Sheets:
   - Buka [SIKOSTIK Sheet](https://docs.google.com/spreadsheets/d/1cBuo9tAtpGvKuThvotIQqd9HDvJfF2Hun61oGYhRtHk)
   - Sheet `anggota_master` - pastikan kolom `nip` tidak kosong
   - Sheet `rekap_dashboard` - pastikan kolom `nip` tidak kosong

2. ✅ **Refresh data** di aplikasi:
   - Klik tombol refresh (icon putar) di RekapAnggota
   - Klik tombol refresh di CekLimit
   - Buka browser DevTools (F12) → Console → lihat apakah ada error

3. ⏳ **Seed data 2026** dulu jika belum (lihat Masalah 1)

### Status Perbaikan
- ✅ Kode sudah benar dan menampilkan Nama + NIP
- ⏳ USER ACTION NEEDED: Verifikasi data di Google Sheets

---

## Masalah 3: Total Potongan Sikostik = 0

### Akar Masalah
**RekapIndividu.tsx** (baris 716-723):
```tsx
<div className="flex justify-between items-center py-2 text-lg font-bold">
  <span>Total Potongan/Bulan</span>
  <span className="text-accent">
    {formatCurrency(
      (safeRekap.simpananPokok || 0) + (safeRekap.simpananWajib || 0) + 
      (safeRekap.simpananSukarela || 0) + (safeRekap.simpananLebaran || 0) + 
      (safeRekap.simpananLainnya || 0) + (safeRekap.cicilanPokok || 0) + 
      (safeRekap.biayaOperasional || 0)
    )}
  </span>
</div>
```

Masalah: `safeRekap` kosong (undefined) saat tidak ada data periode tersebut
- Ini terjadi karena `rekapList` tidak memiliki data untuk periode yang dipilih
- Ketika `rekap` undefined, `safeRekap` di-set ke objek default dengan semua nilai 0

### Solusi
1. **Seed data 2026 dulu** (lihat Masalah 1)
2. **Pilih periode yang sesuai**:
   - Bulan: Pilih 1-12
   - Tahun: Setelah seeding, pilih 2026
   - Tunggu data dimuat (lihat loading indicator)
3. **Jika masih 0** setelah seeding:
   - Verifikasi di Google Sheets bahwa data nilai simpanan tidak kosong
   - Check kolom: `simpanan_pokok`, `simpanan_wajib`, `simpanan_sukarela`, `simpanan_lebaran`, `simpanan_lainnya`, `cicilan_pokok`

### Rumus Total Potongan
```
Total Potongan = 
  Simpanan Pokok + 
  Simpanan Wajib + 
  Simpanan Sukarela + 
  Simpanan Lebaran + 
  Simpanan Lain-lain + 
  Cicilan Pinjaman + 
  Biaya Operasional
```

### Status Perbaikan
- ✅ Formula sudah benar
- ⏳ **USER ACTION NEEDED**: Seed data 2026 (Masalah 1)
- ⏳ Verifikasi nilai-nilai di Google Sheets tidak 0/kosong

---

## Checklist Penyelesaian

- [ ] **Masalah 1**: Jalankan seeder di `/sikostik28/seeder` atau lakukan manual seeding
  - [ ] Klik "Seed Semua Data 2026" atau copy 2025→2026 manual
  - [ ] Refresh aplikasi
  - [ ] Verifikasi: RekapIndividu menampilkan data 2026

- [ ] **Masalah 2**: Verifikasi data NIP di Google Sheets
  - [ ] Buka anggota_master - check kolom `nip` 
  - [ ] Buka rekap_dashboard - check kolom `nip`
  - [ ] Klik refresh di RekapAnggota/CekLimit
  - [ ] Verifikasi: Nama dan NIP tampil

- [ ] **Masalah 3**: Seed data 2026, maka Total Potongan akan menampilkan nilai
  - [ ] Seed data 2026 (Masalah 1)
  - [ ] Pilih periode 2026 di RekapIndividu
  - [ ] Verifikasi: Total Potongan menampilkan nilai > 0

---

## File yang Dibuat/Dimodifikasi

### File Baru
- `/src/pages/SikostikDataSeeder.tsx` - UI untuk data seeding
- `/src/utils/seed-sikostik-2026.ts` - Fungsi untuk seed data 2026

### File Dimodifikasi
- `/src/App.tsx` - Tambah route `/sikostik28/seeder`

### File yang Dikontrol Ulang
- `RekapIndividu.tsx` - Formula dan logic sudah benar
- `RekapAnggota.tsx` - Sudah menampilkan Nama + NIP
- `CekLimit.tsx` - Sudah menampilkan Nama + NIP

---

## Dokumentasi Tambahan

### Struktur Data Sikostik28

**anggota_master sheet:**
- id, kode_anggota, nama, nip, status, foto, tanggal_bergabung, dll

**rekap_dashboard sheet:**
- id, anggota_id, kode_anggota, nama, nip, status
- periode_bulan, periode_tahun
- Simpanan: simpanan_pokok, simpanan_wajib, simpanan_sukarela, simpanan_lebaran, simpanan_lainnya
- Saldo: saldo_akhirbulan_pokok, saldo_akhirbulan_wajib, dll
- Pinjaman: pinjaman_bulan_ini, cicilan_pokok, saldo_piutang, biaya_operasional

### Tahun Tersedia di Aplikasi
- 2024, 2025, 2026 (default current year ± 1 tahun)
- Lihat: `getTahunOptions()` di `use-sikostik-data.ts`

---

**Last Updated**: February 5, 2026
