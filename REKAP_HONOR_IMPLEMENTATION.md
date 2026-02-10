# Dokumentasi: Fitur Download Rekap Honor Output Kegiatan

## Overview
Fitur ini memungkinkan pengguna dengan role **PPK (Pejabat Pembuat Komitmen)** untuk mengunduh rekap honor dari semua kegiatan dalam satu tahun tertentu dalam format Excel.

## Persyaratan Akses
- Role pengguna harus: `Pejabat Pembuat Komitmen`
- Pengguna harus memiliki akses ke satker yang sesuai (berdasarkan `user.satker`)
- Satker harus memiliki konfigurasi yang valid dengan `entrikegiatan_sheet_id`

## Komponen & File yang Dibuat/Dimodifikasi

### 1. **Hook: `use-honor-data.ts`**
**Location:** `src/hooks/use-honor-data.ts`

**Fungsi:**
- Fetch data kegiatan dari Google Sheets berdasarkan satker pengguna
- Parse dan filter data berdasarkan tahun yang dipilih
- Generate array `HonorRow` dengan struktur sesuai template Excel

**Interface:**
```typescript
interface HonorRow {
  no: number;
  namaPenerimaHonor: string;
  noKontrakSKST: string;
  namaKegiatan: string;
  waktuKegiatan: string;
  output: string;
  noSPM: string;  // Kosong (requirement)
  noSP2D: string; // Kosong (requirement)
  satuanBiaya: string;
  jumlahWaktu: number;
  satuanWaktu: string;
  totalBruto: number;
  pph: number; // Default 0 (requirement)
  totalNetto: number;
}
```

**Kolom Mapping dari Google Sheets:**
- Row[2]: Periode (untuk extract tahun)
- Row[4]: Nama Kegiatan
- Row[5]: No. Kontrak/ST/SK
- Row[7]: Tanggal Mulai
- Row[8]: Tanggal Akhir
- Row[9]: Harga Satuan
- Row[10]: Satuan
- Row[13]: Nama Petugas (multiple values dipisahkan dengan `|`)
- Row[15]: Realisasi (multiple values dipisahkan dengan `|`)

### 2. **Utility: `honor-excel-generator.ts`**
**Location:** `src/utils/honor-excel-generator.ts`

**Fungsi:**
- Generate file Excel dengan format template "Format Rekap Belanja Honor Output Kegiatan.xlsx"
- Membuat struktur tabel dengan:
  - Judul: "Rincian Honor Output Kegiatan Tahun [Tahun]"
  - Header: 14 kolom (A-N) sesuai requirement
  - Data rows dengan formatting
  - Total row dengan sum calculations
  - Styling: header berwarna biru, total berwarna abu-abu
  - Frozen header row untuk memudahkan scroll

**Nama File Output:**
`Rekap_Honor_[Sanitized_Satker_Name]_[Tahun].xlsx`

**Contoh:** `Rekap_Honor_BPS_Kota_Jakarta_Selatan_2026.xlsx`

### 3. **Component: `DownloadRekapHonor.tsx`**
**Location:** `src/components/DownloadRekapHonor.tsx`

**Fungsi:**
- Menampilkan tombol "Download Rekap Honor per Tahun"
- Hanya visible untuk role PPK dengan satker valid
- Dialog untuk memilih tahun
- Handle error dan loading state
- Integration dengan hook dan utility

**Props:** None (menggunakan context)

**Features:**
- Auto-hide jika user bukan PPK atau tidak punya satker config
- Dialog untuk pilih tahun (tahun saat ini ± 2 tahun)
- Alert info tentang satker yang sedang digunakan
- Loading indicator saat processing
- Success notification dengan nama file

### 4. **Page: `DownloadSPKBAST.tsx` (Modified)**
**Location:** `src/pages/spk-bast/DownloadSPKBAST.tsx`

**Perubahan:**
1. Import component `DownloadRekapHonor`
2. Tambah section baru "Fitur Tambahan" di atas card "Download Dokumen SPK & BAST"
3. Section ini menampilkan tombol download (jika user authorized)

## Data Flow

```
User clicks "Download Rekap Honor per Tahun" button
          ↓
Dialog opens → User select year → Click "Download"
          ↓
useHonorData.fetchHonorData(tahun) called
          ↓
Fetch kegiatan data dari entri_kegiatan sheet
          ↓
Parse dan filter by tahun
          ↓
Generate HonorRow array (per petugas)
          ↓
generateHonorExcel() creates XLSX file
          ↓
Browser downloads file automatically
```

## Perhitungan Honor

**Total Bruto** = Harga Satuan × Realisasi (per petugas)
**PPH** = 0 (default per requirement)
**Total Netto** = Total Bruto - PPH

## Struktur Header Tabel (Kolom A-N)

| No | Nama | Kolom |
|---|---|---|
| A | No | Nomor urut |
| B | Nama Penerima Honor | Nama petugas |
| C | No. Kontrak/ST/SK | Nomor SK |
| D | Nama Kegiatan | Nama kegiatan |
| E | Waktu Kegiatan | Format: "DD MMM YYYY s/d DD MMM YYYY" |
| F | Output | Nilai realisasi |
| G | No SPM | Kosong (tidak ada data) |
| H | No SP2D | Kosong (tidak ada data) |
| I | Satuan Biaya | Satuan (dari data kegiatan) |
| J | Jumlah Waktu | Realisasi (jumlah) |
| K | Satuan Waktu | Satuan (dari data kegiatan) |
| L | Total Bruto | Harga × Realisasi (currency format) |
| M | PPH (Jika ada) | 0 (default) |
| N | Total Netto | Total Bruto - PPH (currency format) |

## Error Handling

- **User tidak login:** Component tidak muncul
- **User bukan PPK:** Component tidak muncul
- **Satker tidak ada config:** Component tidak muncul
- **Fetch data gagal:** Error toast ditampilkan
- **Tidak ada data untuk tahun:** Info toast ditampilkan
- **Generate Excel gagal:** Error toast ditampilkan

## Testing Checklist

- [ ] Tombol hanya muncul untuk role PPK dengan satker valid
- [ ] Dialog membuka dengan benar saat klik tombol
- [ ] Dapat memilih tahun dari dropdown (tahun saat ini ± 2 tahun)
- [ ] File Excel berhasil diunduh dengan nama benar
- [ ] File Excel memiliki struktur tabel yang sesuai template
- [ ] Data honor dihitung dengan benar (harga × realisasi)
- [ ] Multiple petugas per kegiatan ditangani dengan benar
- [ ] Kolom kosong (No SPM, No SP2D) kosong di file
- [ ] PPH bernilai 0
- [ ] Total row menampilkan sum yang benar
- [ ] Styling dan formatting sudah sesuai (header biru, total abu-abu)
- [ ] Handling error untuk data tidak ditemukan

## Catatan Khusus

1. **Data Source**: Data honor diambil dari sheet "EntriKegiatan" (entrikegiatan_sheet_id) yang disimpan di Google Sheets per satker
2. **Periode Format**: Periode di sheet dalam format "BULAN TAHUN" (misal: "Januari 2026")
3. **Multiple Workers**: Jika satu kegiatan memiliki multiple petugas, setiap petugas akan menjadi row terpisah di Excel
4. **Sanitasi Filename**: Nama satker dibersihkan untuk membuat filename yang valid (menghapus special characters)
5. **No SPM & No SP2D**: Berdasarkan requirement, kolom ini dikosongkan karena data tidak tersedia di data kegiatan

