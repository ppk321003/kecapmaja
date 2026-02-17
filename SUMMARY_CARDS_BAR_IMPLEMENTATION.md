# Summary Cards Bar - Bahan Revisi Anggaran

## Overview
**Summary Cards Bar** adalah komponen visual yang menampilkan ringkasan total data budget dengan 3 card utama:
1. **Total Semula** - Total nilai anggaran sebelum revisi
2. **Total Menjadi** - Total nilai anggaran setelah revisi
3. **Selisih** - Perbedaan antara total menjadi dan total semula

Komponen ini ditempatkan **di antara Filter Data dan Tab Pilihan** untuk memberikan quick visual overview sebelum user melihat detail tabel.

## Penempatan Komponen

```
┌─────────────────────────────────┐
│  Bahan Revisi Anggaran (Title)  │
├─────────────────────────────────┤
│  [Filter Data ▼]                │  ← Filter Collapsible
├─────────────────────────────────┤
│  [Import/Export Controls]       │  ← Only for PPK
├─────────────────────────────────┤
│ ┌──────────┬──────────┬────────┐ │
│ │  Total   │  Total   │ Selisih│ │  ← SUMMARY CARDS BAR
│ │  Semula  │  Menjadi │        │ │
│ └──────────┴──────────┴────────┘ │
├─────────────────────────────────┤
│  [Anggaran] [RPD] [Ringkasan]   │  ← Tab Navigation
├─────────────────────────────────┤
│  [Tabel Budget Items]           │
└─────────────────────────────────┘
```

## Color Coding System

### Total Semula & Total Menjadi
- **Hijau** (`bg-green-50`): Tidak ada perubahan (nilai sama)
- **Kuning/Amber** (`bg-amber-50`): Ada perubahan (nilai berbeda dari semula)

### Selisih
- **Hijau** (`bg-green-50`): Selisih bernilai positif (penambahan)
  - Icon: TrendingUp (↗️)
  - Format: `+Rp xxx.xxx.xxx`
  
- **Merah** (`bg-red-50`): Selisih bernilai negatif (pengurangan)
  - Icon: TrendingDown (↘️)
  - Format: `-Rp xxx.xxx.xxx`
  
- **Abu-abu** (`bg-gray-50`): Selisih bernilai nol (tidak ada perubahan)
  - Icon: Minus (−)
  - Format: `Rp 0`

## Komponen Properties

```typescript
interface SummaryCardsBarProps {
  items: BudgetItem[];  // Array of budget items to summarize
}
```

## Fitur-Fitur

### 1. Auto-Calculated Totals
- Total Semula: `SUM(item.jumlah_semula)` untuk semua items
- Total Menjadi: `SUM(item.jumlah_menjadi)` untuk semua items
- Selisih: `totalMenjadi - totalSemula`
- Persentase Perubahan: `(selisih / totalSemula) × 100%`

### 2. Dynamic Color Based on Selisih
```typescript
if (selisih === 0) → Neutral Gray
if (selisih > 0) → Green (Penambahan)
if (selisih < 0) → Red (Pengurangan)
```

### 3. Visual Indicators
- **Icons**: TrendingUp, TrendingDown, Minus dari lucide-react
- **Badges**: Persentase perubahan di card Selisih
- **Item Count**: Jumlah items yang disertakan dalam perhitungan

### 4. Responsive Layout
- **Desktop (md+)**: Grid 3 kolom sejajar horizontal
- **Mobile**: Stack vertikal (1 kolom)
- **Smooth Transitions**: CSS transition untuk color changes

## Data Calculations

### Formula Perhitungan

```typescript
// Total Semula
totalSemula = Σ item.jumlah_semula

// Total Menjadi  
totalMenjadi = Σ item.jumlah_menjadi

// Selisih
selisih = totalMenjadi - totalSemula

// Persentase Perubahan
percentChange = (selisih / totalSemula) × 100%
```

### Contoh Perhitungan:
```
Item 1: Semula = 10.000.000, Menjadi = 10.500.000 (Selisih +500.000)
Item 2: Semula = 5.000.000,  Menjadi = 5.000.000  (Selisih 0)
Item 3: Semula = 2.000.000,  Menjadi = 1.500.000  (Selisih -500.000)

Total Semula  = 17.000.000
Total Menjadi = 17.000.000
Selisih       = 0
Persentase    = 0.00%

→ Semua card akan berwarna GREEN (tidak ada perubahan)
```

### Contoh Lain (Ada Perubahan):
```
Item 1: Semula = 10.000.000, Menjadi = 12.000.000 (Selisih +2.000.000)
Item 2: Semula = 5.000.000,  Menjadi = 5.000.000  (Selisih 0)

Total Semula  = 15.000.000
Total Menjadi = 17.000.000
Selisih       = +2.000.000
Persentase    = +13.33%

→ Total Semula: AMBER (berubah)
→ Total Menjadi: AMBER (berubah)
→ Selisih: GREEN (positif, ada penambahan)
```

## Usage dalam BahanRevisiAnggaran

```typescript
// Import
import SummaryCardsBar from './SummaryCardsBar';

// Render (hanya jika ada filtered items)
{filteredBudgetItems.length > 0 && (
  <SummaryCardsBar items={filteredBudgetItems} />
)}
```

## Styling Details

### Card Structure
```
┌─────────────────────┐
│ Header (Label)      │  ← font-semibold text-sm
├─────────────────────┤
│ Primary Value       │  ← text-xl font-bold
├─────────────────────┤
│ Secondary Info      │  ← text-xs text-gray-600
│ (Item Count / Badge)│
└─────────────────────┘
```

### Tailwind Classes Used
- Padding: `p-4`
- Border: `border rounded-lg`
- Typography: `text-sm`, `text-xl`, `font-bold`, `font-semibold`
- Colors: `bg-green-50`, `bg-amber-50`, `bg-red-50`, `bg-gray-50`
- Borders: `border-green-200`, `border-amber-200`, `border-red-200`, `border-gray-200`
- Transitions: `transition-all` (smooth color change)
- Gap: `gap-4` (space between cards)

## Integration Points

### 1. BahanRevisiAnggaran.tsx
- Import SummaryCardsBar
- Render antara BahanRevisiExcelImportExport dan Tabs
- Conditional render: `filteredBudgetItems.length > 0`

### 2. index.ts
- Export SummaryCardsBar component

## Performance Considerations

1. **Memoization**: Menggunakan `useMemo` untuk menghitung totals hanya ketika items berubah
2. **No Re-render Overhead**: Komponen hanya update ketika items array berubah
3. **Lightweight**: Tidak ada data fetching atau external API calls

## Future Enhancements

Fitur-fitur yang bisa dikembangkan di masa depan:
1. **Click to Filter** - Klik card untuk auto-filter items dengan kriteria tertentu
2. **Historical Comparison** - Bandingkan dengan periode sebelumnya
3. **Trend Indicators** - Tampilkan tren apakah naik/turun dari periode lalu
4. **Detailed Breakdown** - Breakdown totals by kategori (Program, Komponen, Akun)
5. **Export Summary** - Export summary cards ke PDF/Excel
6. **Approval Status** - Card tambahan menampilkan jumlah items yang sudah/belum diapprove

## Files Modified

| File | Action | Changes |
|------|--------|---------|
| `SummaryCardsBar.tsx` | CREATE | New component untuk summary cards |
| `BahanRevisiAnggaran.tsx` | UPDATE | +Import, +Render SummaryCardsBar |
| `index.ts` | UPDATE | +Export SummaryCardsBar |

---

**Status**: ✅ Implemented & Tested  
**Last Updated**: February 17, 2026
