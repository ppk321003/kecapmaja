# Workspace Exploration Report: MonitoringLapangan & PPK Features

**Date**: 2026-06-21  
**Focus**: MonitoringLapangan.tsx file location, PPK role features, table components, export functionality, and calculatedSubmitPPL definition

---

## 1. MonitoringLapangan.tsx - File Location & Structure

### File Path
```
src/pages/sensusEkonomi2026/MonitoringLapangan.tsx
```

### File Size & Scope
- **Lines**: ~1700+ lines
- **Type**: React TSX functional component with hooks
- **Purpose**: Dashboard monitoring pengerjaan sensus ekonomi 2026 (Field work monitoring dashboard)

### Key Imports & Dependencies
```typescript
import React, { useState, useMemo } from "react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { MonitoringLastUpdated } from "@/components/MonitoringLastUpdated";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

### Data Source
- **Google Sheet ID**: `1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o`
- **Sheet Name**: `REKAP_SCRP`
- **Hook**: `useGoogleSheetsData` for real-time data fetching

### Schedule Configuration (Lines 34-39)
```typescript
const SCHEDULE_START = new Date(2026, 5, 15);      // 15 June 2026
const SCHEDULE_END = new Date(2026, 7, 31);        // 31 August 2026
const TOTAL_DAYS = 77;                             // 15 Juni - 31 Agustus
const MIN_DAILY_TARGET = 7;                        // Minimum submissions/day
const MAX_DAILY_TARGET = 12;                       // Maximum submissions/day
const AVG_DAILY_TARGET = 9.5;                      // (7 + 12) / 2
const TOTAL_TARGET = TOTAL_DAYS * AVG_DAILY_TARGET; // ~732 submit target
const ITEMS_PER_PAGE = 20;
```

---

## 2. Interface Definitions

### AggregatedData (Line 50)
```typescript
interface AggregatedData {
  kecamatan: string;                    // District name
  nama_ppl: string;                     // Field worker (Pencacah Penduduk) name
  nama_pml: string;                     // Supervisor (Petugas Pengawas Lapangan) name
  draft: number;                        // Draft forms
  jumlah_submit: number;                // Total submitted forms
  jumlah_approve: number;               // Approved forms
  jumlah_reject: number;                // Rejected forms
  total_assignments: number;            // Total form assignments
  status_counts: {
    open: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
}
```

### DashboardStats (Line 69)
```typescript
interface DashboardStats {
  totalKecamatan: number;
  totalSubmit: number;
  averageSubmit: number;
  topKecamatan: { name: string; value: number; totalSubmit?: number; countPPL?: number };
  lowestKecamatan: { name: string; value: number; totalSubmit?: number; countPPL?: number };
  topKecamatanByPercentage?: { name: string; value: number; totalSubmit?: number; totalAssignments?: number };
  lowestKecamatanByPercentage?: { name: string; value: number; totalSubmit?: number; totalAssignments?: number };
}
```

### PMLData (Line 85)
```typescript
interface PMLData {
  nama_pml: string;               // Supervisor name
  kecamatan: string;              // District
  jumlah_submit_ppl: number;      // PPL (field worker) submissions
  jumlah_approve: number;         // Approved count
  jumlah_reject: number;          // Rejected count
}
```

---

## 3. Tab Structure

### Navigation Tabs (Lines ~700)
The component uses a 4-tab interface:

#### Tab 1: "Dashboard" (value="dashboard")
- **Content**: Overview statistics, multiple charts, performance metrics
- **Icon**: BarChart3
- **Charts**:
  - Persentase per Kecamatan (26 districts, alphabetically sorted)
  - Semua 26 Kecamatan (All 26 districts performance)
  - Top 10 PPL performers
  - Lowest 10 PPL performers

#### Tab 2: "Kecamatan" (value="kecamatan")
- **Content**: District-level metrics
- **Data**: Aggregated by district
- **Displays**: Jumlah PPL per district, average submissions, status

#### Tab 3: "PPL" (value="ppl")
- **Content**: Field worker data table
- **Table Columns** (Lines 1220+):
  - No (sequential number)
  - Nama PPL (Field worker name)
  - Kecamatan (District)
  - Draft (draft forms)
  - Reject (rejected forms)
  - Submit (submitted forms)
  - Approve (approved forms)
  - Rata-rata Submit Harian (Daily average submissions)
  - Status (Sesuai Jadwal / Tertinggal / Sangat Tertinggal)
  - Keterangan Target (Target description)
  - Notifikasi (Notification message)

#### Tab 4: "PML" (value="pml")
- **Content**: Supervisor data table with expandable PPL details
- **Main Table Columns** (Lines 1450+):
  - No
  - Nama PML (Supervisor name)
  - Kecamatan (District)
  - Submit PPL (PPL submissions count) ⚠️ **USES UNDEFINED `calculatedSubmitPPL`**
  - Approve (approved count)
  - Reject (rejected count)
  - % Pemeriksaan (Review percentage) ⚠️ **USES UNDEFINED `calculatedSubmitPPL`**

- **Expandable Feature**: Each PML row can expand to show PPL details
  - Shows: Nama PPL, Draft count, Submit count, Approve count, Reject count

---

## 4. PPK Role Implementation

### PPK Role Identification Pattern

**Pattern Used Across Project**:
```typescript
const isPPK = user?.role === 'Pejabat Pembuat Komitmen';
```

### Components Using PPK Role Check
- [AppSidebar.tsx](src/components/AppSidebar.tsx#L152)
- [GenerateSPKBAST.tsx](src/components/GenerateSPKBAST.tsx#L23)
- [DownloadRekapHonor.tsx](src/components/DownloadRekapHonor.tsx#L47)
- [DeleteFolderSPKBAST.tsx](src/components/DeleteFolderSPKBAST.tsx#L24)
- [PreviewSPKBAST.tsx](src/components/PreviewSPKBAST.tsx#L29)
- [MonitoringLastUpdated.tsx](src/components/MonitoringLastUpdated.tsx#L26)
- [ResetStatusSPKBAST.tsx](src/components/ResetStatusSPKBAST.tsx#L24)
- [ManualWABroadcast.tsx](src/components/ManualWABroadcast.tsx#L38)
- [mitraSE2026.tsx](src/pages/mitraSE2026.tsx#L295)
- [UserManagement.tsx](src/pages/UserManagement.tsx#L126)
- [EntriPengelola.tsx](src/pages/EntriPengelola.tsx#L154)
- [spk-bast/RekapSPK.tsx](src/pages/spk-bast/RekapSPK.tsx#L145)

### User Object Structure (from AuthContext)
```typescript
interface User {
  username: string;
  role: string;      // e.g., 'Pejabat Pembuat Komitmen'
  satker: string;    // Satuan Kerja (work unit)
}
```

### AuthContext Location
```
src/contexts/AuthContext.tsx
```
- **Login Source**: Google Sheets (USERS_SPREADSHEET_ID: 1kVxQHL3TPfDKJ1ZnZ_fxJECGctc1UBjU_8E--9UK938)
- **Usage**: `const { user } = useAuth();`

---

## 5. Table Components for PPL and PML

### PPL Table Component (Lines 1200-1400)

**Location in File**: Inside `TabsContent` for "ppl" tab

**Structure**:
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-slate-50">
      <TableHead>No</TableHead>
      <TableHead>Nama PPL</TableHead>
      <TableHead onClick={() => toggleSort("kecamatan")}>Kecamatan</TableHead>
      <TableHead>Draft</TableHead>
      <TableHead>Reject</TableHead>
      <TableHead onClick={() => toggleSort("submit")}>Submit</TableHead>
      <TableHead>Approve</TableHead>
      <TableHead>Rata-rata Submit Harian</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Keterangan Target</TableHead>
      <TableHead>Notifikasi</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {paginatedRows.map((row, index) => (
      <TableRow>
        {/* Row cells with status icons, colored badges */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Features**:
- **Sortable Columns**: Kecamatan (district), Submit
- **Status Icons**: CheckCircle2, AlertTriangle, AlertCircle based on schedule status
- **Color Coding**: Green (optimal), Yellow (warning), Red (critical)
- **Pagination**: 20 items per page (configurable: 10, 20, 50, 100)

### PML Table Component (Lines 1430-1610)

**Location in File**: Inside `TabsContent` for "pml" tab

**Structure**:
```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-slate-50">
      <TableHead>No</TableHead>
      <TableHead onClick={() => setPMLSortBy("nama_pml")}>Nama PML</TableHead>
      <TableHead>Kecamatan</TableHead>
      <TableHead>Submit PPL</TableHead>
      <TableHead onClick={() => setPMLSortBy("approve")}>Approve</TableHead>
      <TableHead onClick={() => setPMLSortBy("reject")}>Reject</TableHead>
      <TableHead onClick={() => setPMLSortBy("pemeriksaan")}>% Pemeriksaan</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {paginatedRowsPML.map((row, index) => (
      <React.Fragment key={`${row.nama_pml}-${row.kecamatan}`}>
        <TableRow className="hover:bg-slate-50 cursor-pointer">
          {/* Main row with PML info */}
        </TableRow>
        
        {/* Expanded PPL Details - if isExpanded */}
        {isExpanded && pplUnderPML.map(ppl => (
          <TableRow className="bg-slate-100 hover:bg-slate-200">
            {/* PPL detail row (indented) */}
          </TableRow>
        ))}
      </React.Fragment>
    ))}
  </TableBody>
</Table>
```

**Features**:
- **Expandable Rows**: Click PML name to expand/collapse PPL details
- **ChevronDown Icon**: Indicates expandable state (rotated 90° when collapsed)
- **Sortable Columns**: Nama PML, Approve, Reject, % Pemeriksaan
- **Nested Display**: PPL rows shown with lighter background (bg-slate-100)
- **Pagination**: 20 items per page (configurable)
- **Color Coding**:
  - Green text: Approve counts
  - Red text: Reject counts

---

## 6. ⚠️ CRITICAL ISSUE: calculatedSubmitPPL Definition

### Problem Location
- **Lines Used**: 1556, 1565 in MonitoringLapangan.tsx
- **Problem**: Variable is **USED but NOT DEFINED**

### Current Usage (BROKEN)
```typescript
// Line 1556
<TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
  {calculatedSubmitPPL.toLocaleString("id-ID")}
</TableCell>

// Line 1565
<TableCell className="text-right font-semibold text-slate-900 px-4 py-3">
  {calculatedSubmitPPL > 0 ? (((row.jumlah_approve + row.jumlah_reject) / calculatedSubmitPPL) * 100).toFixed(2) : "0.00"}%
</TableCell>
```

### What It Should Be

The variable should be calculated **per PML row** from the PPL data:

```typescript
// This calculation should happen inside the PML table row mapping
// Around line 1520 where pplUnderPML is calculated
const pplUnderPML = aggregatedData.rows.filter(ppl => 
  ppl.nama_pml === row.nama_pml && ppl.kecamatan === row.kecamatan
);

// Add this calculation:
const calculatedSubmitPPL = pplUnderPML.reduce((sum, ppl) => sum + ppl.jumlah_submit, 0);
```

### Similar Pattern Already Used in Code
**Line 591** shows the correct pattern:
```typescript
const sortedPMLData = useMemo(() => {
  let sorted = [...pmlData];
  
  // Recalculate actual submit PPL based on aggregatedData for accurate sorting
  sorted = sorted.map(pml => {
    const pplUnderPML = aggregatedData.rows.filter(ppl => 
      ppl.nama_pml === pml.nama_pml && ppl.kecamatan === pml.kecamatan
    );
    const actualSubmit = pplUnderPML.reduce((sum, ppl) => sum + ppl.jumlah_submit, 0);
    const pemeriksaan = actualSubmit > 0 ? ((pml.jumlah_approve + pml.jumlah_reject) / actualSubmit) * 100 : 0;
    return { ...pml, actualSubmit, pemeriksaan };
  });
  // ...
}, [pmlData, pmlSortBy, pmlSortOrder, pmlSearchTerm, aggregatedData]);
```

### Fix Recommendation
Replace the undefined `calculatedSubmitPPL` with the actual calculated value per row:
```typescript
// Inside the paginatedRowsPML.map() at line ~1520
paginatedRowsPML.map((row, index) => {
  const pplUnderPML = aggregatedData.rows.filter(ppl => 
    ppl.nama_pml === row.nama_pml && ppl.kecamatan === row.kecamatan
  );
  const calculatedSubmitPPL = pplUnderPML.reduce((sum, ppl) => sum + ppl.jumlah_submit, 0);
  
  // Then use calculatedSubmitPPL in the render
  return (
    // ... table row with calculatedSubmitPPL
  );
})
```

---

## 7. Existing Download/Export Functionality

### Dedicated Export Components

#### 1. BahanRevisiExcelImportExport.tsx
- **Path**: `src/components/bahanrevisi/BahanRevisiExcelImportExport.tsx`
- **Features**: Import and export budget data to Excel
- **Function**: `exportBahanRevisiExcel()`
- **Usage**: Used in BahanRevisiAnggaran.tsx

#### 2. BudgetChangesSummary.tsx
- **Path**: `src/components/bahanrevisi/BudgetChangesSummary.tsx`
- **Line 68**: `handleExportExcel()` function
- **Feature**: Export current data to Excel

#### 3. BahanRevisiProyeksiBulananSubtab.tsx
- **Path**: `src/components/bahanrevisi/BahanRevisiProyeksiBulananSubtab.tsx`
- **Line 529**: `downloadExcel()` function
- **Button**: "Export Excel" button (line 784)

#### 4. DetailedSummaryView.tsx
- **Path**: `src/components/bahanrevisi/DetailedSummaryView.tsx`
- **Features**: Export to JPEG, PDF, and Excel
- **Imports**: `exportSummaryToExcel()` from utils
- **Line 131**: `handleExportExcel()` function

#### 5. DownloadRekapHonor.tsx
- **Path**: `src/components/DownloadRekapHonor.tsx`
- **Note**: PPK access controlled (line 47)

#### 6. DownloadPAK.tsx
- **Path**: `src/components/DownloadPAK.tsx`
- **Features**: Download PAK document

### Excel Export Utilities

#### pulsa-excel-export.ts
```
Location: src/utils/pulsa-excel-export.ts
```

**Key Functions**:
- `exportPulsaToExcel(opts: ExportPulsaOptions): void`
- Creates multi-sheet workbook using `XLSX.utils.book_new()`
- Groups data by kegiatan (activities)
- Sanitizes sheet names (31 char limit, removes invalid chars)
- Exports approved entries with columns: No, Nama, Status, Kecamatan, Nomor Telp, Nominal, Tanda Tangan

**Pattern**:
```typescript
import * as XLSX from 'xlsx';

// Sanitize sheet name (Excel limits: 31 chars, no : \ / ? * [ ])
function sanitizeSheetName(name: string, idx: number): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '-').trim() || `Kegiatan ${idx + 1}`;
  return cleaned.length > 31 ? cleaned.slice(0, 28) + '...' : cleaned;
}

// Create workbook
const wb = XLSX.utils.book_new();
// Add sheets, set column widths, etc.
// Download with XLSX.writeFile()
```

### Other Export Examples
- **manajemen-pulsa**: Uses `exportPulsaToExcel` (Line 10)
- **bahanrevisi-document-export**: Handles JPEG, PDF, Excel exports

---

## 8. No Export Button in MonitoringLapangan

### Current State
✅ **Tabs**: Dashboard, Kecamatan, PPL, PML  
✅ **Search & Filters**: Working  
✅ **Sorting**: Working  
✅ **Pagination**: Working  
❌ **Export to Excel**: NOT IMPLEMENTED

### Suggested Addition Locations
1. **Dashboard Tab**: Export all summary data
2. **PPL Tab**: Export PPL table data
3. **PML Tab**: Export PML table data + detailed PPL breakdown
4. **Button Placement**: Top-right corner of each tab card (near search inputs)

### Implementation Considerations
- Consider PPK-only access for sensitive data export
- Multiple export formats (Excel multi-sheet recommended)
- Include date/time stamp in filename and sheet header
- Include summary statistics along with detailed data

---

## 9. File Dependencies & Hierarchy

```
src/pages/sensusEkonomi2026/
└── MonitoringLapangan.tsx
    ├── Imports from @/components/ui/* (UI primitives)
    ├── Imports from @/components/MonitoringLastUpdated
    ├── Imports from @/hooks/use-google-sheets-data
    ├── Uses recharts library
    └── Data from: Google Sheet REKAP_SCRP (ID: 1j1pYuz0lOMjufxtOw2jxD-aPCBNlCi7y0Ymh6k3Sn_o)

Related Components:
├── src/contexts/AuthContext.tsx (User & role info)
├── src/utils/pulsa-excel-export.ts (Excel export pattern reference)
├── src/components/bahanrevisi/BahanRevisiExcelImportExport.tsx (Another export example)
└── Other PPK-gated components (for role check pattern)
```

---

## 10. Summary & Key Findings

| Item | Finding |
|------|---------|
| **File Location** | `src/pages/sensusEkonomi2026/MonitoringLapangan.tsx` (~1700 lines) |
| **PPL Role Check** | `user?.role === 'Pejabat Pembuat Komitmen'` |
| **User Context** | `useAuth()` hook from `src/contexts/AuthContext.tsx` |
| **PPL Table** | Has 11 columns, sortable, paginated, status icons, color-coded |
| **PML Table** | Has 7 columns, expandable rows, sortable, paginated, nested PPL details |
| **Excel Export** | Not yet implemented in MonitoringLapangan; examples exist in `pulsa-excel-export.ts` |
| **🐛 Bug Found** | `calculatedSubmitPPL` variable used (lines 1556, 1565) but NOT DEFINED |
| **Data Source** | Google Sheets: REKAP_SCRP sheet |
| **Target Tracking** | Schedule: June 15 - Aug 31, 2026 (77 days); Target: 7-12 submissions/day |

---

## 11. Action Items

### Priority 1 - BUG FIX
- [ ] Define `calculatedSubmitPPL` per PML row in PML table rendering

### Priority 2 - FEATURES
- [ ] Implement Excel export for PPL tab
- [ ] Implement Excel export for PML tab
- [ ] Add export button(s) to tabs
- [ ] Consider PPK role restriction on exports (if sensitive)

### Priority 3 - ENHANCEMENTS
- [ ] Add date filters for historical data
- [ ] Add export format options (Excel, CSV, PDF)
- [ ] Add print functionality
- [ ] Cache export data for performance

---

**End of Report**
