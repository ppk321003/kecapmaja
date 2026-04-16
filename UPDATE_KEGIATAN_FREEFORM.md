# 📝 Update: Kegiatan Input Free-Form + Master References

## Perubahan yang dibuat:

### ✅ Kegiatan (Kolom F)
- **Sebelum**: Dropdown list yang hardcoded (2886, 2897, dll)
- **Sekarang**: **Free text input** dari UI
- **User bisa isi**: Kode (2886), nama kegiatan, atau apapun
- **Contoh**:
  ```
  - 2886
  - Pendataan KSA
  - 2886 - Pendataan Keluarga Sejahtera
  - Survey Kepuasan Pelanggan
  ```

### ✅ Master References (Optional)
Edge Function sekarang support referensi ke master sheets (jika ada):
- **MASTER.ORGANIK**: Nama, NIP (untuk referensi SM/petugas)
- **MASTER.MITRA**: NIK, Nama, Pekerjaan, Alamat (untuk referensi mitra)

User bisa populate sheets ini jika ingin, tapi **bukan requirement**.

---

## 📋 Header Sheet Tetap Sama

| Kolom | Header | Tipe | Input Method |
|-------|--------|------|-------------|
| A | No | Number | Auto |
| B | Bulan | Number | Dropdown (form) |
| C | Tahun | Number | Input number |
| D | Nama Petugas | Text | Free text |
| E | NIP | Text | Free text |
| **F** | **Kegiatan** | **Text** | **Free text (UI)** ✨ |
| G | Organik | Select | Dropdown: Fungsi Sosial / Neraca / Produksi / Distribusi / IPDS |
| H | Mitra | Text | Free text |
| I | Nominal | Number | Number input |
| J | Status | Select | draft / pending / approved / rejected / completed |
| K | Keterangan | Text | Free text |
| L | Tgl Input | DateTime | Auto |
| M | Disetujui Oleh | Text | Auto (saat approve) |
| N | Tgl Approval | DateTime | Auto (saat approve) |

---

## 🔧 Files Updated

1. **supabase/functions/pulsa-sheets-bridge/index.ts**
   - Added: MASTER.ORGANIK & MASTER.MITRA to RANGES
   - Kegiatan can be any text from API payload

2. **src/services/pulsaSheetsService.ts**
   - Updated: PulsaData interface (kegiatan is free text)
   - Updated: Comments pada service call

3. **src/components/pulsa/FormTambahPulsa.tsx**
   - Changed: Kegiatan Select → Input (text field)
   - Added: Placeholder hint
   - Updated: Summary display (tidak perlu lookup)
   - Updated: Validation message

---

## 🎯 Cara Kerja

### Web Form UI:
```
User isi:
↓
Bulan: April
Tahun: 2026
Nama Petugas: Budi Santoso
Kegiatan: 2886                  ← Free text input!
Organik: Fungsi Sosial         ← Dropdown
Nominal: 100000
↓
Click: 💾 Simpan ke Sheet
↓
```

### Edge Function:
```
1. Terima kegiatan: "2886"
2. Validasi duplikasi (check: Budi + 2886 + April/2026)
3. Append ke PULSA-BULANAN sheet
4. Update LAPORAN-PULSA
5. Return success ✅
```

### Google Sheets:
```
Row added:
No | Bulan | Tahun | Nama Petugas | NIP | Kegiatan | Organik | ...
1  | 4     | 2026  | Budi Santoso | -   | 2886     | Fungsi Sosial | ...
```

---

## 💡 Tips

**Untuk standardisasi kegiatan**, bisa:
1. ✅ Buat list kegiatan di MASTER-KEGIATAN sheet (users referensi)
2. ✅ Buat autocomplete di UI (future enhancement)
3. ✅ Dokumentasikan kode kegiatan yang valid di aplikasi

**Sekarang**: User bebas isi apa saja → easier, more flexible

---

## 🔄 Duplikasi Detection

Tetap work sama seperti sebelumnya:
- **Rule**: 1 petugas = 1 kegiatan per bulan
- **Check on**: (nama_petugas, bulan, tahun, kegiatan) - **kegiatan sekarang free text**
- **Example**:
  - ✅ Budi + "2886" + April 2026 = OK
  - ✅ Budi + "Pendataan KSA" + April 2026 = OK
  - ❌ Budi + "2886" + April 2026 + "2886" (lagi) = ERROR (duplikasi)
  - ❌ Budi + "2886" + April 2026, then "Pendataan KSA" + April 2026 = ERROR (kegiatan berbeda, same month)

---

## 📝 Implementasi Checklist

- [x] Update form: Kegiatan jadi text input
- [x] Update service: Support free text kegiatan
- [x] Update edge function: Accept any kegiatan text
- [x] Keep validation: Duplikasi tetap work
- [ ] Test: Submit dengan kegiatan berbeda (2886, "Survey", dll)
- [ ] Verify: Google Sheets punya data dengan kegiatan berbeda
- [ ] Populate: MASTER-KEGIATAN untuk referensi (optional)

