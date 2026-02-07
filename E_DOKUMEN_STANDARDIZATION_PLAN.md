# E-Dokumen UI Standardization Plan

## Required Fields (9 Total)
1. **Program** - Dropdown select
2. **Kegiatan** - Dependent dropdown on Program
3. **KRO** - Dependent dropdown on Kegiatan  
4. **RO** - Dependent dropdown on KRO
5. **Komponen** - Custom KomponenSelect component
6. **Akun** - Custom AkunSelect component
7. **Pembuat Daftar** - PersonSingleSelect from organikList
8. **Organik BPS** - PersonMultiSelect (optional per context)
9. **Mitra Statistik** - PersonMultiSelect (optional per context)

## Template Reference
**`transport-lokal.tsx`** - COMPLETE & PERFECT ✅
- All 9 fields implemented correctly
- Use as exact template for implementation

---

## File Assessment & Action Plan

### ✅ COMPLETE (No Changes Needed) - 3 Files

1. **transport-lokal.tsx** (876 lines)
   - Status: COMPLETE 
   - All 9 fields present and working

2. **daftar-hadir.tsx** (1349 lines)  
   - Status: COMPLETE
   - All 9 fields present (namaKegiatan, program, kegiatan, kro, ro, komponen, akun, organik, mitra, pembuatDaftar)

3. **uang-harian-transport.tsx** (800 lines)
   - Status: COMPLETE
   - Schema shows all 9 fields (program, kegiatan, kro, ro, komponen, akun, pembuatDaftar, organik, mitra, namaKegiatan)

---

### 🔧 PARTIAL (Missing Some Fields) - 7 Files

#### 1. **kuitansi-perjalanan.tsx** (1172 lines)
   - Status: PARTIAL ⚠️
   - **Has:** program, kegiatan, kro, ro, komponen, akun (Fields 1-6)
   - **Missing:** Pembuatdaftar as PersonSingleSelect (Field 7 - currently namaPelaksana is text input), Organik BPS (Field 8), Mitra Statistik (Field 9)
   - **Action:** Add Fields 7, 8, 9 with proper components

#### 2. **spj-honor.tsx** (1208 lines)
   - Status: PARTIAL ⚠️
   - **Has:** program, kegiatan, kro, ro, komponen, akun, pembuatDaftar (Fields 1-7)
   - **Missing:** Organik BPS (Field 8), Mitra Statistik (Field 9)
   - **Action:** Add Fields 8, 9 (PersonMultiSelect components)

#### 3. **kak.tsx** (1303 lines)
   - Status: PARTIAL ⚠️
   - **Has:** program, kegiatan, kro, ro, komponen, akun, pembuatDaftar (Fields 1-7)
   - **Missing:** Organik BPS (Field 8), Mitra Statistik (Field 9)
   - **Action:** Add Fields 8, 9 (PersonMultiSelect components)

#### 4. **lembur-laporan.tsx** (660 lines)
   - Status: PARTIAL ⚠️
   - **Has:** organikBPS (Field 8), pembuatDaftar (Field 7, as PersonSingleSelect)
   - **Missing:** Program (Field 1), Kegiatan (Field 2), KRO (Field 3), RO (Field 4), Komponen (Field 5), Akun (Field 6), Mitra Statistik (Field 9)
   - **Action:** Major addition - Add Fields 1-6 (all dependency chain) + Field 9

#### 5. **surat-keputusan.tsx** (1671 lines)
   - Status: PARTIAL ⚠️
   - **Has:** organik, mitraStatistik, pembuatDaftar (Fields 7-9)
   - **Missing:** Program (Field 1), Kegiatan (Field 2), KRO (Field 3), RO (Field 4), Komponen (Field 5), Akun (Field 6)
   - **Action:** Add Fields 1-6 (dependency chain)
   - **Note:** Form is about SK (Surat Keputusan) so dependency may need context consideration

#### 6. **surat-pernyataan.tsx** (566 lines) 
   - Status: PARTIAL ⚠️
   - **Has:** organikBPS, mitraStatistik, pembuatDaftar, namaKegiatan (Fields 7-9)
   - **Missing:** Program (Field 1), Kegiatan (Field 2), KRO (Field 3), RO (Field 4), Komponen (Field 5), Akun (Field 6)
   - **Action:** Add Fields 1-6 (dependency chain)
   - **Note:** Purpose is Surat Pernyataan - Field 1-6 may be optional for context

#### 7. **tanda-terima.tsx** (617 lines)
   - Status: PARTIAL ⚠️
   - **Has:** PM fields (organikBPS, mitraStatistik), pembuatDaftar (Fields 7-9)
   - **Missing:** Program (Field 1), Kegiatan (Field 2), KRO (Field 3), RO (Field 4), Komponen (Field 5), Akun (Field 6)
   - **Action:** Add Fields 1-6 (dependency chain)
   - **Note:** Tanda Terima (Receipt) may need lightweight version

---

### ❌ MINIMAL (Missing All Structured Fields) - 1 File

#### 1. **dokumen-pengadaan.tsx** (732 lines)
   - Status: MINIMAL ⚠️⚠️
   - **Has:** Only basic commerce fields (supplier, payment, contract type), NO pertanyaan search fields
   - **Missing:** ALL 9 fields (1-9)
   - **Context:** Form is for procurement document tracking (order, contract, payment)
   - **Consideration:** May be intentionally minimal - needs user validation if this page should have all 9 fields
   - **Action:** TBD - Confirm with user if all 9 fields needed here

---

## Implementation Priority

### Priority 1: Quick Wins (Add Field 8-9 only)
- spj-honor.tsx ↬ Add Organik BPS + Mitra Statistik
- kak.tsx ↬ Add Organik BPS + Mitra Statistik

### Priority 2: Add Person Selection (Add Field 7)
- kuitansi-perjalanan.tsx ↬ Convert namaPelaksana to PersonSingleSelect + Add Organik BPS + Mitra Statistik

### Priority 3: Add Full Dependency Chain (Add Fields 1-6)
- lembur-laporan.tsx ↬ Add Program cascade + Mitra Statistik
- surat-keputusan.tsx ↬ Add Program cascade
- surat-pernyataan.tsx ↬ Add Program cascade
- tanda-terima.tsx ↬ Add Program cascade

### Priority 4: Special Decision
- dokumen-pengadaan.tsx ↬ **CONFIRM WITH USER** - Should this have all 9 fields?

---

## Implementation Notes

### Dependency Chain Implementation
When adding fields 1-6, always follow this pattern:

```typescript
// Hooks
const { data: programs = [] } = usePrograms();
const { data: kegiatans = [] } = useKegiatan(selectedProgram || "");
const { data: kros = [] } = useKRO(selectedKegiatan || "");
const { data: ros = [] } = useRO(selectedKRO || "");

// Form field handlers
const handleProgramChange = (value: string) => {
  form.setValue("program", value);
  form.setValue("kegiatan", "");  // Reset dependent fields
  form.setValue("kro", "");
  form.setValue("ro", "");
};

const handleKegiatanChange = (value: string) => {
  form.setValue("kegiatan", value);
  form.setValue("kro", "");  // Reset dependent fields
  form.setValue("ro", "");
};
```

### Person Selection Implementation
```typescript
// For Pembuat Daftar (PersonSingleSelect)
<PersonSingleSelect 
  organikList={organikBPSList}
  value={pembuatDaftarId}
  onChange={(value) => form.setValue("pembuatDaftar", value)}
/>

// For Organik BPS + Mitra Statistik (PersonMultiSelect)
<PersonMultiSelect
  title="Organik BPS"
  data={organikBPSList}
  selectedValues={form.watch("organik") || []}
  onChange={(values) => form.setValue("organik", values)}
/>
```

### Schema Changes
Add to form schema:
```typescript
program: z.string().min(1, "Program harus dipilih"),
kegiatan: z.string().min(1, "Kegiatan harus dipilih"),
kro: z.string().min(1, "KRO harus dipilih"),
ro: z.string().min(1, "RO harus dipilih"),
komponen: z.string().min(1, "Komponen harus dipilih"),
akun: z.string().min(1, "Akun harus dipilih"),
pembuatDaftar: z.string().min(1, "Pembuat daftar harus dipilih"),
organik: z.array(z.string()),
mitra: z.array(z.string()),
```

---

## Estimated Work

- **Priority 1 (2 files):** ~30 minutes
- **Priority 2 (1 file):** ~20 minutes  
- **Priority 3 (4 files):** ~90 minutes
- **Priority 4:** ~10 minutes (decision only)
- **Testing & Validation:** ~30 minutes
- **TOTAL ESTIMATED:** ~3 hours

---

## Status Tracking

- [ ] Priority 1 - spj-honor.tsx & kak.tsx
- [ ] Priority 2 - kuitansi-perjalanan.tsx  
- [ ] Priority 3 - lembur-laporan.tsx, surat-keputusan.tsx, surat-pernyataan.tsx, tanda-terima.tsx
- [ ] Priority 4 - Confirm dokumen-pengadaan.tsx requirements
- [ ] Full testing & validation
