# Analysis: "Pelatihan Sensus Ekonomi 2026" Page/Component

## 1. Page/Component File

**Primary File**: [src/pages/sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx)

**Related Components**:
- [src/components/PelatihanSE26.tsx](src/components/PelatihanSE26.tsx) - Embedded Google Sheets viewer (view-only)
- [src/components/AlokasiPelatihan.tsx](src/components/AlokasiPelatihan.tsx) - Related allocation component

**Route**: `/sensus-ekonomi-2026/pelatihan`

**Navigation**: Accessible via sidebar menu under "Sensus Ekonomi 2026" → "Pelatihan"

---

## 2. Current Page Structure & Layout Flow

### Overall Architecture
```
Pelatihan Sensus Ekonomi 2026 Page
├── Header Section (dark blue gradient background)
├── Loading State (spinner while fetching data)
├── Error State (error message display)
├── Filter Selection Screen (showTable = false)
│   ├── Four Interactive Filter Cards (grid layout)
│   ├── Statistics Dashboard (below filters)
│   └── CTA Button "Lihat Daftar Petugas"
└── Data Table Screen (showTable = true)
    ├── Header & Navigation Button
    ├── Search + Filter + Pagination Controls
    ├── Table with Data Rows
    └── Pagination Controls
```

### Background & Theme
- **Background**: `bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900` (dark blue gradient)
- **Header**: `text-center space-y-4 pb-8 border-b border-blue-700/30`
- **Page Title**: "Pelatihan Sensus Ekonomi 2026" (4xl/5xl font)
- **Subtitle**: "BPS Kabupaten Majalengka"

---

## 3. Current Filter Implementation

### Filter Selection Screen (Initial View)

#### Three Main Filter Cards (Grid Layout)

**1. Kecamatan Filter Card**
- **Icon**: MapPin (blue, `text-blue-400`)
- **Title**: "Pilih Kecamatan"
- **Component**: Select dropdown
- **Options**: 
  - "Semua Kecamatan" (default, value="all")
  - Individual kecamatan values (dynamically populated)
- **Additional Info**: Shows count `{kecamatanOptions.length} kecamatan tersedia`
- **State Variable**: `filterKecamatan`

**Code Location**: [sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx#L421-L444)

```typescript
<Select value={filterKecamatan} onValueChange={(v) => setFilterKecamatan(v)}>
  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-10">
    <SelectValue placeholder="Semua Kecamatan" />
  </SelectTrigger>
  <SelectContent className="bg-slate-700 border-slate-600">
    <SelectItem value="all">Semua Kecamatan</SelectItem>
    {kecamatanOptions.map((k) => (
      <SelectItem key={k} value={k}>{k}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**2. Hotel Filter Card**
- **Icon**: Hotel (amber, `text-amber-400`)
- **Title**: "Pilih Hotel"
- **Component**: Select dropdown
- **Options**: 
  - "Semua Hotel" (default)
  - Individual hotel values (dynamically populated)
- **Additional Info**: Shows count `{hotelOptions.length} hotel tersedia`
- **State Variable**: `filterHotel`

**Code Location**: [sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx#L399-L420)

```typescript
<Select value={filterHotel} onValueChange={(v) => setFilterHotel(v)}>
  <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-10">
    <SelectValue placeholder="Semua Hotel" />
  </SelectTrigger>
  <SelectContent className="bg-slate-700 border-slate-600">
    <SelectItem value="all">Semua Hotel</SelectItem>
    {hotelOptions.map((h) => (
      <SelectItem key={h} value={h}>{h}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**3. Kelas Filter Card**
- **Icon**: Calendar (green, `text-green-400`)
- **Title**: "Pilih Kelas"
- **Component**: Select dropdown
- **Options**: 
  - "Semua Kelas" (default)
  - Individual kelas values (A, B, C, ... AA, AB, etc. - naturally sorted)
- **Additional Info**: Shows count `{kelasOptions.length} kelas tersedia`
- **State Variable**: `filterKelas`

**Code Location**: [sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx#L377-L398)

### Data Table Screen Filters

When viewing the table, additional filters are available:

**Search Filter**
- **Placeholder**: "Cari nama, jabatan, sobat ID..."
- **Type**: Text input with search icon
- **Search Scope**: Searches across all columns (global search)
- **Case-Insensitive**: Yes
- **State Variable**: `search`

**Code Location**: [sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx#L565-L577)

```typescript
<Input
  placeholder="Cari nama, jabatan, sobat ID..."
  value={search}
  onChange={(e) => {
    setSearch(e.target.value);
    setPage(1);
  }}
  className="pl-9 h-9 text-sm bg-slate-700 border-slate-600 text-white"
/>
```

**Pagination Control**
- **Options**: 20, 50, 100 rows per page
- **Default**: 20
- **State Variable**: `pageSize`
- **Shows**: Total count, current page, total pages

### Filter State Variables
```typescript
const [filterKecamatan, setFilterKecamatan] = useState<string>("all");
const [filterHotel, setFilterHotel] = useState<string>("all");
const [filterKelas, setFilterKelas] = useState<string>("all");
const [search, setSearch] = useState("");
const [showTable, setShowTable] = useState(false);  // Toggle between views
```

### Dynamic Filter Options Generation

```typescript
// Kecamatan Options
const kecamatanOptions = useMemo(() => {
  if (COL.kecamatan === -1) return [];
  const kecSet = new Set<string>();
  rows.forEach((r) => {
    const kec = (r[COL.kecamatan] || "").toString().trim();
    if (kec) kecSet.add(kec);
  });
  return Array.from(kecSet).sort();
}, [rows, COL.kecamatan]);

// Hotel Options
const hotelOptions = useMemo(() => {
  if (COL.hotel === -1) return [];
  const hotelSet = new Set<string>();
  rows.forEach((r) => {
    const hotel = (r[COL.hotel] || "").toString().trim();
    if (hotel) hotelSet.add(hotel);
  });
  return Array.from(hotelSet).sort();
}, [rows, COL.hotel]);

// Kelas Options (naturally sorted)
const kelasOptions = useMemo(() => {
  if (COL.kelas === -1) return [];
  const kelasSet = new Set<string>();
  rows.forEach((r) => {
    const kelas = (r[COL.kelas] || "").toString().trim();
    if (kelas) kelasSet.add(kelas);
  });
  return Array.from(kelasSet).sort();  // Natural sort: A, B, C, ... AA, AB
}, [rows, COL.kelas]);
```

---

## 4. Statistics Display

### Initial Filter Screen Statistics Section

**Location**: After the three main filter cards, displays `📊 Statistik Pelatihan`

**Code Location**: [sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx#L485-L543)

#### A. Gelombang Overview Card
- **Title**: "Jumlah Gelombang"
- **Styling**: `bg-gradient-to-br from-violet-900 to-purple-900`
- **Display**: Large bold number `text-4xl font-bold text-purple-300`
- **Value**: `{stats.gelombangCount}`
- **Description**: "Gelombang pelatihan tersedia"
- **Icon**: None (purple gradient card)

```typescript
<Card className="bg-gradient-to-br from-violet-900 to-purple-900 border-purple-700">
  <CardContent className="p-6">
    <h3 className="text-sm text-purple-200 font-semibold mb-2">Jumlah Gelombang</h3>
    <p className="text-4xl font-bold text-purple-300">{stats.gelombangCount}</p>
    <p className="text-xs text-purple-400 mt-2">Gelombang pelatihan tersedia</p>
  </CardContent>
</Card>
```

#### B. Hotel Overview Card
- **Title**: "Jumlah Hotel"
- **Styling**: `bg-gradient-to-br from-amber-900 to-orange-900`
- **Display**: Large bold number `text-4xl font-bold text-orange-300`
- **Value**: `{stats.hotelCount}`
- **Description**: "Lokasi pelatihan (hotel)"
- **Icon**: None (amber gradient card)

```typescript
<Card className="bg-gradient-to-br from-amber-900 to-orange-900 border-orange-700">
  <CardContent className="p-6">
    <h3 className="text-sm text-orange-200 font-semibold mb-2">Jumlah Hotel</h3>
    <p className="text-4xl font-bold text-orange-300">{stats.hotelCount}</p>
    <p className="text-xs text-orange-400 mt-2">Lokasi pelatihan (hotel)</p>
  </CardContent>
</Card>
```

#### C. Hotel Detail Statistics Grid
- **Title**: "📍 Rincian per Hotel"
- **Layout**: 3-column grid on medium+ screens, 1-column on mobile
- **Styling**: Each card has `bg-slate-800 border-slate-700`

**Per-Hotel Card Structure**:
```
┌─────────────────────────┐
│ Hotel Name (amber-300)  │
├─────────────────────────┤
│ Jumlah Petugas: XX      │ (blue text)
│ Jumlah Kelas: X         │ (green text)
├─────────────────────────┤
│ Kelas: A, B, C, ...     │ (comma-separated list, slate-500)
└─────────────────────────┘
```

**Data Structure**:
```typescript
const stats = useMemo(() => {
  const hotelStats = new Map<string, { count: number; classes: Set<string> }>();
  const gelombangSet = new Set<string>();
  
  rows.forEach((r) => {
    const hotel = COL.hotel !== -1 ? (r[COL.hotel] || "").toString().trim() : "Unknown";
    const kelas = COL.kelas !== -1 ? (r[COL.kelas] || "").toString().trim() : "";
    const gelombang = COL.gelombang !== -1 ? (r[COL.gelombang] || "").toString().trim() : "";
    
    if (hotel) {
      if (!hotelStats.has(hotel)) {
        hotelStats.set(hotel, { count: 0, classes: new Set<string>() });
      }
      const stat = hotelStats.get(hotel)!;
      stat.count += 1;
      if (kelas) stat.classes.add(kelas);
    }
    
    if (gelombang) {
      gelombangSet.add(gelombang);
    }
  });

  return {
    hotelStats,
    gelombangCount: gelombangSet.size,
    hotelCount: hotelStats.size,
  };
}, [rows, COL.hotel, COL.kelas, COL.gelombang]);
```

**Code Location**: [sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx#L245-L271)

---

## 5. Data Source & Column Structure

### Google Sheets Configuration
- **Spreadsheet ID**: `1iCZGbfPgRMiXGO6q_vtklOsJ4gFQoUS2nMwS-HlY0r4`
- **Sheet Name**: `"PETUGAS SE26"`
- **Range**: `A1:Z` (expanded to capture all columns)
- **Access**: Via Supabase Edge Function for authenticated access

### Column Headers (Source of Truth)
```typescript
const COLUMN_HEADERS = {
  no: "NO",
  isi: "ISI",
  kecamatan: "KECAMATAN",
  nama_petugas: "NAMA PETUGAS",
  sobat_id: "SOBAT ID",
  jabatan: "JABATAN",
  bank: "BANK",
  nomor_rekening: "NOMOR REKENING",
  idkelas: "IDKELAS",
  hotel: "Hotel",
  gelombang: "Gelombang",
  kelas: "Kelas",
  tanggal: "Tanggal",
};
```

### Column Header Aliases (Flexible Matching)
```typescript
const HEADER_ALIASES: { [key: string]: string[] } = {
  tanggal: ["Tanggal", "Tanggal Pelaksanaan", "Tanggal Pelatihan", "Tgl", "Date", "Tanggal Mulai"],
  gelombang: ["Gelombang", "Gelombang Pelatihan", "Wave"],
  hotel: ["Hotel", "Hotel Tempat Pelatihan", "Tempat"],
  kelas: ["Kelas", "Kelas Pelatihan", "Class"],
};
```

### Columns Used in Filters/Display
| Column | Used For | Type |
|--------|----------|------|
| KECAMATAN | Filter dropdown, sort | String |
| Hotel | Filter dropdown, display, sort | String |
| Kelas | Filter dropdown, display, sort | String |
| Gelombang | Statistics calculation | String |
| NAMA PETUGAS | Search, table display, sort | String |
| SOBAT ID | Search, table display, sort | String |
| JABATAN | Search, table display, sort | String |

---

## 6. Table Display Section (When showTable = true)

### Table Columns Displayed
1. **#** - Row number (auto-increment from 1)
2. **Nama Petugas** - Officer name (with sort indicator)
3. **Kecamatan** - Subdistrict
4. **Sobat ID** - SOBAT ID
5. **Jabatan** - Position/Title
6. **Hotel** - Hotel name
7. **Gelombang** - Wave (orange badge, `bg-orange-600`)
8. **Kelas** - Class (dynamic color badges)

### Dynamic Class Color Badges
Each unique class (A, B, C, etc.) gets a distinct gradient color:

**Color Palette** (16 alternating warm/cool colors for max contrast):
```typescript
const CLASS_COLORS = [
  "bg-gradient-to-r from-red-900 to-red-500",           // A - Red (Warm)
  "bg-gradient-to-r from-blue-900 to-blue-400",         // B - Blue (Cool)
  "bg-gradient-to-r from-orange-900 to-orange-400",     // C - Orange (Warm)
  "bg-gradient-to-r from-green-900 to-green-400",       // D - Green (Cool)
  "bg-gradient-to-r from-purple-900 to-purple-400",     // E - Purple (Warm)
  "bg-gradient-to-r from-cyan-900 to-cyan-400",         // F - Cyan (Cool)
  // ... continues for G through P
];
```

---

## 7. State Management

### Component State Variables
```typescript
// Data
const [headers, setHeaders] = useState<string[]>([]);
const [rows, setRows] = useState<Row[]>([]);

// Loading states
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Filter states
const [search, setSearch] = useState("");
const [filterKecamatan, setFilterKecamatan] = useState<string>("all");
const [filterHotel, setFilterHotel] = useState<string>("all");
const [filterKelas, setFilterKelas] = useState<string>("all");

// Sorting
const [sortKey, setSortKey] = useState<keyof typeof COLUMN_HEADERS>("kelas");
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

// Pagination
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);

// UI State
const [showTable, setShowTable] = useState(false);  // false = filters, true = table
```

---

## 8. Key Functions & Logic

### Column Detection
```typescript
const getColumnIndices = (headers: string[]) => {
  const COL_CONFIG = useMemo(() => getColumnIndices(headers), [headers]);
  // Returns object with indices for each column (or -1 if not found)
};
```

### Data Filtering & Sorting
Location: [sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx#L290-L330)

- Combines multiple filters with AND logic
- Case-insensitive search across all columns
- Natural sorting for Kelas (A, B, C, AA, AB, ...)
- Blank value handling (puts blanks at end)

### Statistics Calculation
Uses `useMemo` to efficiently calculate:
- Unique gelombang count
- Unique hotel count
- Per-hotel statistics (count + classes)

---

## 9. UI/UX Features

### Initial Filter Screen
- **Grid Layout**: 1 column mobile, 2 columns tablet, 4 columns desktop for first set of cards
- **Card Icons**: MapPin, Hotel, Calendar, Users
- **Color Scheme**: Dark theme (slate-800 cards, slate-700 borders)
- **Count Display**: Each filter shows available options count
- **CTA Button**: "Lihat Daftar Petugas" with hover effects (scale, lift, glow)

### Table Screen
- **Responsive**: Horizontal scroll on small screens
- **Row Hover**: `hover:bg-slate-700` effect
- **Column Headers**: Sortable with arrow indicator
- **Badges**: Orange for Gelombang, dynamic colors for Kelas
- **Pagination**: First, Previous, Page Numbers, Next, Last buttons
- **Info Display**: Shows "Total: X | Halaman Y dari Z | Menampilkan A-B dari X"

---

## 10. Performance Optimizations

- **useMemo**: For filter options, statistics, sorted/filtered data
- **Dynamic header detection**: Adapts to column changes automatically
- **Efficient state management**: Only updates relevant state on filter changes

---

## 11. File Locations Summary

| File | Purpose |
|------|---------|
| [src/pages/sensusEkonomiPelatihan.tsx](src/pages/sensusEkonomiPelatihan.tsx) | Main page component |
| [src/components/PelatihanSE26.tsx](src/components/PelatihanSE26.tsx) | Google Sheets viewer |
| [src/App.tsx](src/App.tsx) | Route definition |
| [src/components/AppSidebar.tsx](src/components/AppSidebar.tsx) | Navigation menu |

---

## Summary

The "Pelatihan Sensus Ekonomi 2026" page provides a comprehensive interface for viewing and filtering training data:

✅ **Filter Implementation**: Three filter cards (Kecamatan, Hotel, Kelas) + search
✅ **Statistics Display**: Gelombang count, Hotel count, Hotel detail cards
✅ **Data Table**: 7 columns with sorting, pagination, dynamic badges
✅ **Design**: Dark theme with gradient accents and smooth animations
✅ **Performance**: Optimized with useMemo for efficient filtering/sorting
