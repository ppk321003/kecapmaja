# 🎯 Customization Guide - Manajemen Pembelian Pulsa

## 1. Update Daftar Kegiatan

Lokasi: `src/components/pulsa/FormTambahPulsa.tsx` (baris ~60)

**Current list:**
```typescript
const daftarKegiatan = [
  'Pendataan Lapangan KSA',
  'Pelatihan Petugas Potensi Desa',
  'Survei Kepuasan Pelaygan',
  'Koordinasi Tim Statistik',
  'Sosialisasi Metodologi',
  'Monitoring dan Evaluasi',
  'Lainnya'
];
```

**Untuk menambah kegiatan baru:**

```typescript
const daftarKegiatan = [
  'Pendataan Lapangan KSA',
  'Pelatihan Petugas Potensi Desa',
  'Survei Kepuasan Pelaygan',
  'Koordinasi Tim Statistik',
  'Sosialisasi Metodologi',
  'Monitoring dan Evaluasi',
  'Kegiatan Baru 1',
  'Kegiatan Baru 2',
  'Lainnya'
];
```

---

## 2. Update Daftar Organisasi/Tim

Lokasi: `src/components/pulsa/FormTambahPulsa.tsx` (baris ~68)

**Current list:**
```typescript
const daftarOrganik = [
  'Fungsi Sosial',
  'Fungsi Neraca',
  'Fungsi Produksi',
  'Fungsi Distribusi',
  'Fungsi IPDS'
];
```

Organisasi ini harus match dengan `MASTER.ORGANIK` Anda. Pastikan konsisten.

---

## 3. Cache/Load dari Database (Recommended)

Daripada hardcode, lebih baik load dari database:

**Step 1:** Update component untuk fetch dari Supabase:

```typescript
// Di FormTambahPulsa.tsx
useEffect(() => {
  fetchKegiatanList();
  fetchOrganikList();
}, []);

const fetchKegiatanList = async () => {
  const { data } = await supabase
    .from('master_kegiatan')  // Tabel baru yang dibuat
    .select('*')
    .eq('aktif', true);
  
  if (data) setDaftarKegiatan(data.map(k => k.nama));
};

const fetchOrganikList = async () => {
  const { data } = await supabase
    .from('master_organik')
    .select('organik')
    .distinct();
  
  if (data) setDaftarOrganik(data.map(o => o.organik));
};
```

**Step 2:** Buat tabel master di Supabase:

```sql
CREATE TABLE master_kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama character varying NOT NULL UNIQUE,
  nominal_default integer,
  aktif boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- Insert sample data
INSERT INTO master_kegiatan (nama, nominal_default) VALUES
  ('Pendataan Lapangan KSA', 100000),
  ('Pelatihan Petugas Potensi Desa', 150000),
  ('Survei Kepuasan Pelaygan', 75000);
```

---

## 4. Customize Status & Approval Workflow

Jika ingin mengubah status workflow, update di:

**File:** `src/types/pulsa.ts`

```typescript
// Current
export type PulsaStatus = 
  | 'draft'
  | 'pending_ppk'
  | 'approved_ppk'
  | 'rejected_ppk'
  | 'completed'
  | 'cancelled';

// Custom example (dengan Bendahara approval tambahan)
export type PulsaStatus = 
  | 'draft'
  | 'pending_ppk'
  | 'approved_ppk'
  | 'pending_bendahara'     // 🆕
  | 'approved_bendahara'    // 🆕
  | 'rejected_bendahara'    // 🆕
  | 'completed'
  | 'cancelled';
```

Kemudian update button logic di `TabelPulsaBulanan.tsx`.

---

## 5. Customize Nominal Default per Kegiatan

Jika nominal adalah fixed per kegiatan, bisa auto-fill:

```typescript
// Di FormTambahPulsa.tsx
const nominalDefault: Record<string, number> = {
  'Pendataan Lapangan KSA': 100000,
  'Pelatihan Petugas Potensi Desa': 150000,
  'Survei Kepuasan Pelaygan': 75000,
  'Koordinasi Tim Statistik': 50000,
};

const handleKegiatanChange = (kegiatan: string) => {
  const defaultNominal = nominalDefault[kegiatan] || 0;
  setFormData(prev => ({
    ...prev,
    kegiatan,
    nominal: defaultNominal
  }));
};
```

---

## 6. Tambah Kolom Tambahan

Jika perlu field tambahan (misal: nomor rekening, bank, dll):

**Step 1:** Update database:

```sql
ALTER TABLE pulsa_items ADD COLUMN bank character varying;
ALTER TABLE pulsa_items ADD COLUMN nomor_rekening character varying;
ALTER TABLE pulsa_items ADD COLUMN atas_nama character varying;
```

**Step 2:** Update TypeScript type:

```typescript
// src/types/pulsa.ts
export interface PulsaItem {
  // ...existing fields
  bank?: string;
  nomor_rekening?: string;
  atas_nama?: string;
}
```

**Step 3:** Update form component untuk input field baru

---

## 7. Integration dengan Google Sheets (Optional)

Jika ingin sync dengan Google Sheets seperti KAK:

```typescript
// Buat fungsi di Apps Script untuk auto-sync
function syncPulsaFromSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Loop dan insert ke Supabase
  // Fetch data dari Supabase
}
```

---

## 8. Report & Dashboard Enhancements

Untuk membuat report lebih detail:

```typescript
// src/components/pulsa/DashboardPulsa.tsx (buat file baru)
export const DashboardPulsa = ({ bulan, tahun }) => {
  // Breakdown per kegiatan
  // Breakdown per organik
  // Pie chart nominal per kegiatan
  // Bar chart petugas per tim
  // Alert duplikasi kegiatan
}
```

Gunakan library seperti:
- `recharts` - untuk chart
- `react-table` - untuk tabel advanced
- `lodash` - untuk data manipulation

---

## 9. Excel Export Implementation

Complete implementation untuk export:

```typescript
// src/components/pulsa/ExportPulsaExcel.tsx
import * as XLSX from 'xlsx';

export const exportPulsaToExcel = (data: PulsaItem[]) => {
  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: Raw data
  const ws1 = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, ws1, 'Pulsa Data');
  
  // Sheet 2: Summary
  const summary = generateSummary(data);
  const ws2 = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(workbook, ws2, 'Summary');
  
  // Download
  XLSX.writeFile(workbook, `Pulsa_${bulan}_${tahun}.xlsx`);
};

function generateSummary(data: PulsaItem[]) {
  // Group by kegiatan
  // Calculate totals
  // Return summary
}
```

---

## 10. Notification Integration (WhatsApp)

Jika ingin notify petugas via WhatsApp:

```typescript
// Di TabelPulsaBulanan.tsx, saat approve
const handleApprove = async (item: PulsaItem) => {
  // ... approval logic
  
  // Send WhatsApp notification
  const message = `Pulsa Anda sebesar Rp ${item.nominal.toLocaleString('id-ID')} untuk kegiatan "${item.kegiatan}" telah disetujui.`;
  
  await supabase.functions.invoke('send-wa-notification', {
    body: {
      phoneNumber: item.no_hp_petugas, // Tambah kolom ini
      message: message
    }
  });
};
```

---

## 11. Permission & Role Customization

Jika role berbeda, update di:

**File:** `supabase/migrations/20260416_create_pulsa_management.sql`

```sql
-- Update policies sesuai role
CREATE POLICY "pulsa_items_view_custom" 
  ON pulsa_items 
  FOR SELECT 
  USING (
    auth.jwt() ->> 'user_metadata' ->> 'role' IN (
      'Custom Role 1',
      'Custom Role 2',
      'admin'
    )
  );
```

---

## 12. Validation Rules Customization

Jika ada rule tambahan:

**File:** `src/types/pulsa.ts`

```typescript
export function validatePulsaItem(
  item: Partial<PulsaItem>,
  existingItems: PulsaItem[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Rule bawaan
  // ...
  
  // Custom rule: contoh - nominal max Rp 200rb
  if (item.nominal && item.nominal > 200000) {
    errors.push({
      type: 'nominal_invalid',
      message: 'Nominal pulsa tidak boleh lebih dari Rp 200.000'
    });
  }
  
  // Custom rule: kegiatan tertentu hanya untuk organik tertentu
  if (item.kegiatan === 'Pelatihan Petugas Potensi Desa' && 
      item.organik === 'Fungsi Sosial') {
    errors.push({
      type: 'kegiatan_organik_mismatch',
      message: 'Kegiatan ini hanya untuk Fungsi Neraca'
    });
  }
  
  return errors;
}
```

---

## 📋 Quick Checklist

- [ ] Update daftar kegiatan sesuai rutin bulanan
- [ ] Update daftar organik/tim
- [ ] Customize nominal default jika tetap
- [ ] Integrate dengan data petugas (MASTER.ORGANIK)
- [ ] Set up Excel export (jika perlu)
- [ ] Configure role & permissions
- [ ] Test validation rules
- [ ] Setup WhatsApp notification (optional)
- [ ] Create dashboard report (optional)
- [ ] Setup audit logging (optional)

---

**Version**: 1.0  
**Last Updated**: April 16, 2026
