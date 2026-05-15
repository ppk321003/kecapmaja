# Setup Google Sheets untuk Dashboard Ngibar SE26 - Tab System

Dokumentasi ini menjelaskan struktur Google Sheets yang diperlukan untuk implementasi tab "Tracking" dan "Target UB" di halaman `DashboardNgibarSE26.tsx`.

## Spreadsheet ID
```
1EyrssWtjEGd64SYelUMON3nnLpj6KU5INCMeD-Amjto
```

---

## 1. Sheet1 - Tracking (dengan Monev Ngibar)

### Struktur Kolom:
| Kolom | Header | Tipe | Keterangan |
|-------|--------|------|-----------|
| A | No | Number | Nomor urut |
| B | Tanggal | Text | Format: DD/MM/YYYY |
| C | Instansi/Lembaga | Text | Nama instansi/lembaga |
| D | PIC | Text | Nama Person In Charge |
| E | Target Submit | Number | Target jumlah peserta submit |
| F | Realisasi Submit | Number | Realisasi jumlah peserta submit |
| G | Siap Entri | Text | Status dokumen (Draft/Open/Siap) |
| H | Kendala | Text | Deskripsi kendala yang dihadapi |
| I | Solusi | Text | Solusi untuk kendala |
| J | Tindak Lanjut | Text | Tindak lanjut yang diperlukan |
| K | Status | Text | Status kegiatan (Terlaksana / Proses Konfirmasi) |
| L | Keterangan | Text | Catatan tambahan |
| M | Status Ngibar | Text | **[BARU]** Apakah sudah Ngibar atau belum (Sudah/Belum/Proses) |
| N | Dokumen | Text | **[BARU]** Status dokumen (Draft/Open) - hanya jika sudah Ngibar |
| O | Metode | Text | **[BARU]** Metode pengisian (CAWI/PAPI) |
| P | Entry Status | Text | **[BARU]** Status entry (khusus untuk PAPI) - Belum/Sedang/Selesai |
| Q | Submit Status | Text | **[BARU]** Status submit (Belum/Sedang/Selesai) |

### Data Monev Ngibar:
- **M (Status Ngibar)**: 
  - "Belum" = Belum Ngibar
  - "Proses" = Sedang Ngibar
  - "Sudah" = Sudah Ngibar

- **N (Dokumen)**:
  - "Draft" = Dokumen masih draft
  - "Open" = Dokumen open untuk responden
  - "-" = Jika belum ada dokumen

- **O (Metode)**:
  - "CAWI" = Computer Assisted Web Interview
  - "PAPI" = Pencacahan Antar Muka Perangkat
  - "-" = Jika belum ada metode

- **P (Entry Status)** - Hanya terisi jika O = "PAPI":
  - "Belum" = Belum ada entry
  - "Sedang" = Entry sedang berjalan
  - "Selesai" = Entry sudah selesai

- **Q (Submit Status)**:
  - "Belum" = Belum submit
  - "Sedang" = Sedang dalam proses submit
  - "Selesai" = Sudah submit (SEMUA TAHAPAN SELESAI)

---

## 2. Sheet2 - Target UB

### Struktur Kolom:
| Kolom | Header | Tipe | Dapat Diedit | Keterangan |
|-------|--------|------|--------------|-----------|
| A | No | Number | ❌ Tidak | Nomor urut |
| B | Instansi | Text | ❌ Tidak | Nama instansi/UB |
| C | PIC | Text | ❌ Tidak | Person In Charge |
| D | Contact | Text | ❌ Tidak | Kontak PIC (Email/Telp) |
| E | [Kolom Custom] | Text | ✅ Ya | Field yang dapat diedit oleh user |
| F | [Kolom Custom] | Text | ✅ Ya | Field yang dapat diedit oleh user |
| G | [Kolom Custom] | Text | ✅ Ya | Field yang dapat diedit oleh user |
| H | [Kolom Custom] | Text | ✅ Ya | Field yang dapat diedit oleh user |
| I | [Kolom Custom] | Text | ✅ Ya | Field yang dapat diedit oleh user |

**Catatan:** Kolom E-I dapat disesuaikan dengan kebutuhan masing-masing UB. Header pada kolom E-I akan ditampilkan otomatis dari Google Sheets.

---

## 3. UI Behavior

### Tab Tracking:
- Menampilkan semua data dari Sheet1
- Searchable: Cari berdasarkan Instansi atau PIC
- Filterable: Filter berdasarkan Status (Semua/Terlaksana/Proses Konfirmasi)
- Expandable rows: Klik baris untuk melihat detail (Kendala, Solusi, Tindak Lanjut, Monev Ngibar)
- Kolom Monev Ngibar menampilkan ringkas di tabel utama
- Detail lengkap Monev Ngibar dapat dilihat saat row di-expand

### Tab Target UB:
- Menampilkan data dari Sheet2
- Kolom A-D: Read-only (tidak dapat diedit di UI)
- Kolom E-I: Editable (user dapat mengubah nilai)
- Ada tombol "Edit" untuk setiap baris
- Saat edit mode: Input field akan muncul untuk kolom E-I
- Ada tombol "Simpan" dan "Batal" saat edit mode

---

## 4. Contoh Data

### Sheet1 - Contoh Baris:
```
No | Tanggal | Instansi | PIC | Target | Realisasi | Siap Entri | Kendala | Solusi | Tindak Lanjut | Status | Keterangan | Status Ngibar | Dokumen | Metode | Entry Status | Submit Status
1 | 15/05/2026 | BPS Kota A | Budi Santoso | 100 | 95 | Open | Sistem Lemot | Upgrade Server | Proses Upgrade | Terlaksana | - | Sudah | Open | CAWI | - | Selesai
2 | 16/05/2026 | BPS Kota B | Siti Nurhaliza | 150 | 120 | Draft | Responden Kurang | Outreach Lebih | Follow Up | Proses Konfirmasi | Menunggu Koordinasi | Proses | Draft | PAPI | Sedang | Belum
```

### Sheet2 - Contoh Baris:
```
No | Instansi | PIC | Contact | Kolom E | Kolom F | Kolom G | Kolom H | Kolom I
1 | UB Jakarta | Rudi | rudi@bps.go.id | Data1 | Data2 | Data3 | Data4 | Data5
2 | UB Bandung | Siti | siti@bps.go.id | Data1 | Data2 | Data3 | Data4 | Data5
```

---

## 5. Catatan Penting

1. **Synchronisasi Data**: Data dari Google Sheets di-fetch melalui Supabase Edge Function
2. **Editing Sheet2**: Fitur edit di tab "Target UB" masih perlu implementasi backend untuk menyimpan data ke Google Sheets
3. **Format Tanggal**: Gunakan format DD/MM/YYYY atau YYYY-MM-DD
4. **Kolom Kosong**: Baris dengan kolom Instansi kosong akan diabaikan (filter out)
5. **Monev Ngibar**: Indikator untuk tracking tahapan Ngibar dari awal sampai submit

---

## 6. Setup Checklist

- [ ] Buat Sheet2 baru dengan nama "Sheet2" di Spreadsheet
- [ ] Tambahkan header dan data di Sheet2 (Kolom A-I)
- [ ] Tambahkan 5 kolom baru di Sheet1 (Kolom M-Q) untuk Monev Ngibar
- [ ] Isi data Monev Ngibar untuk setiap baris di Sheet1
- [ ] Test fetch data dari kedua sheet
- [ ] Verifikasi tab "Tracking" dan "Target UB" tampil dengan benar
- [ ] Test edit functionality di tab "Target UB"

---

**Last Updated**: 15 May 2026
**Implementer**: Dashboard Ngibar SE26 v2.0
