# Quick Reference: Kode Antrian e-Tamu

## Format: `KODE-YYMM-NOURUT`

### 4 Kategori & Kode

| No. | Kategori Kepentingan | Kode | Contoh | Update | Reset |
|-----|----------------------|------|--------|--------|-------|
| 1 | Layanan Perpustakaan | **LP** | `LP-2604-001` | Auto | Monthly |
| 2 | Konsultasi Statistik | **KS** | `KS-2604-005` | Auto | Monthly |
| 3 | Rekomendasi Statistik (Khusus OPD/Pemda) | **RS** | `RS-2604-002` | Auto | Monthly |
| 4 | Lainnya | **L** | `L-2604-010` | Auto | Monthly |

---

## Part-Part Nomor Antrian

### Contoh: `LP-2604-001`

```
LP      = Kode Kategori (Layanan Perpustakaan)
2604    = YYMM (Tahun 26, Bulan 04 = April 2026)
001     = Nomor Urut (1st antrian di kategori ini bulan ini)
```

---

## Timeline Reset Bulanan

| Bulan | Format | Contoh Urut |
|-------|--------|------------|
| Jan 2026 | `LP-2601` | LP-2601-001, LP-2601-002, ... |
| Feb 2026 | `LP-2602` | LP-2602-001, LP-2602-002, ... |
| Mar 2026 | `LP-2603` | LP-2603-001, LP-2603-002, ... |
| **Apr 2026** | `LP-2604` | **LP-2604-001, LP-2604-002, ...** ← Saat ini |
| Mei 2026 | `LP-2605` | LP-2605-001, LP-2605-002, ... |
| Jun 2026 | `LP-2606` | LP-2606-001, LP-2606-002, ... |

---

## Multi-Kategori (Jika Dipilih)

**Sistem menggunakan kategori PERTAMA yang dipilih**

```
Scenario:
Tamu pilih: [✓] Layanan Perpustakaan + [✓] Lainnya

Antrian yang di-generate: LP-2604-001
(Menggunakan kode LP, bukan kombinasi)
```

---

## Keunggulan Format Ini

✅ **Mudah dibaca** - Clear kode kategori
✅ **Auto-reset** - Tidak perlu manual reset
✅ **Terstruktur** - Bisa di-sort, filter, report
✅ **Scalable** - Bisa 999 antrian per kategori per bulan
✅ **Historis** - YYMM memudahkan tracking timeline

---

## Kolom di Sheet

```
Kolom M di Google Sheet e-Tamu

Header: ANTRIAN
Isi: KODE-YYMM-NOURUT

Contoh data:
  LP-2604-001
  KS-2604-001
  RS-2604-001
  L-2604-001
  LP-2604-002
  KS-2604-002
```

---

## File Terkait

- **Generator**: `src/utils/generateAntrianNumber.ts`
- **Component**: `src/pages/ETamu.tsx`
- **Full Docs**: `DOKUMENTASI_SISTEM_ANTRIAN.md`
- **Setup Guide**: `SETUP_KOLOM_ANTRIAN.md`

---

**Last Updated**: April 27, 2026
