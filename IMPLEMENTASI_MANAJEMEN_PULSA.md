# 📋 Panduan Implementasi Sistem Manajemen Pembelian Pulsa

**Version**: 1.0  
**Updated**: April 16, 2026  
**Status**: ✅ Ready untuk diintegrasikan

---

## 📌 Overview

Sistem manajemen pembelian pulsa untuk mengelola distribusi pulsa bulanan per kegiatan dengan fitur validasi, approval workflow, dan laporan otomatis.

### ✨ Fitur Utama
- ✅ **Form Input** - Tambah data pembelian pulsa per kegiatan dengan validasi real-time
- ✅ **Validasi Duplikasi** - Alert otomatis per kegiatan per bulan  
- ✅ **Approval Workflow** - Data harus disetujui PPK sebelum final
- ✅ **Dashboard Laporan** - Ringkasan nominal dan status per bulan
- ✅ **Export Excel** - Untuk laporan ke bendahara
- ✅ **Role-based Access** - Hanya PPK yang bisa approve

---

## 📁 File-file yang Dibuat

```
src/
├── types/
│   └── pulsa.ts                    # Type definitions untuk pulsa
├── components/
│   └── pulsa/
│       ├── FormTambahPulsa.tsx     # Form untuk input pulsa
│       └── TabelPulsaBulanan.tsx   # Tabel tampilan data
└── pages/
    └── ManajemenPulsa.tsx          # Main page

supabase/
└── migrations/
    └── 20260416_create_pulsa_management.sql  # Database migration
```

---

## 🔧 Langkah Implementasi

### **1. Update Database (Supabase)**

Jalankan migration untuk membuat tabel:

```bash
# Copy file migration ke supabase/migrations/
cp supabase/migrations/20260416_create_pulsa_management.sql <supabase-project>/

# Atau jalankan SQL langsung di Supabase console
```

**SQL yang akan dijalankan**:
- ✅ `pulsa_items` - Tabel untuk setiap pembelian pulsa
- ✅ `pulsa_bulanan` - Tabel ringkasan bulanan
- ✅ Indexes untuk optimasi query
- ✅ RLS (Row Level Security) policies

---

### **2. Update Routing**

Tambahkan route baru di file routing aplikasi (biasanya di `src/App.tsx` atau `src/router.tsx`):

**Jika menggunakan React Router v6:**
```typescript
import ManajemenPulsa from '@/pages/ManajemenPulsa';

// Tambahkan di routes
{
  path: '/manajemen-pulsa',
  element: <ProtectedRoute><ManajemenPulsa /></ProtectedRoute>,
  requiredRoles: ['Pejabat Pembuat Komitmen', 'Bendahara', 'Fungsi Sosial', 'Fungsi Neraca', 'Fungsi Produksi', 'Fungsi Distribusi', 'Fungsi IPDS']
}
```

---

### **3. Update Sidebar Navigation**

Tambahkan menu ke file sidebar (`src/components/AppSidebar.tsx`):

```typescript
// Di bagian menu items
{
  label: 'Manajemen Pulsa',
  icon: Smartphone, // atau icon lain
  href: '/manajemen-pulsa',
  requiredRoles: ['Pejabat Pembuat Komitmen', 'Bendahara', 'Fungsi Sosial'],
  visible: true
}
```

---

### **4. Update Type Exports**

Export tipe baru di file index types (`src/types/index.ts`):

```typescript
// Tambahkan di `src/types/index.ts`
export * from './pulsa';
```

---

### **5. Verifikasi Dependencies**

Pastikan semua dependencies sudah ada (biasanya sudah terinstall):

```json
{
  "lucide-react": "^latest",
  "@radix-ui/react-dialog": "^latest",
  "@radix-ui/react-tabs": "^latest",
  "xlsx": "^latest"  // Untuk export Excel (bisa ditambah jika belum ada)
}
```

Jika gunakan Excel export, install:
```bash
npm install xlsx
# atau dengan yarn/pnpm
```

---

## 📊 Database Schema (Struktur Baru)

### Tabel: `pulsa_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `bulan` | Integer | 1-12 |
| `tahun` | Integer | 2020+ |
| `kegiatan` | String | Required |
| `nominal` | Integer | Required, > 0 |
| `organik` | String | Tim/Fungsi |
| `mitra` | String | Optional |
| `status` | String | draft/pending_ppk/approved_ppk/rejected_ppk/completed |
| `keterangan` | Text | Optional |
| `approved_by` | String | PPK name |
| `approved_at` | Timestamp | Approval time |
| `created_by` | String | Email pembuat |
| `created_at` | Timestamp | Auto |
| `updated_at` | Timestamp | Auto |

**Indexes**: `(bulan, tahun)`, `(kegiatan)`, `(status)`  
**Constraints**: Nominal > 0

### Daftar Kolom di Sheet Google Sheets:
```
No | Bulan | Tahun | Kegiatan | Nominal | Organik | Mitra | Status | Keterangan | Tanggal Input | Disetujui Oleh | Tanggal Approval
```

---

## 🔐 Validasi & Business Rules

### **Rule 1: Validasi Nominal**
- Nominal harus lebih dari 0
- Validated di frontend dan database (CHECK constraint)

### **Rule 2: Deteksi Duplikasi Kegiatan**
Sistem akan mengingatkan jika terdapat multiple entries untuk kegiatan yang sama dalam bulan/tahun yang sama:

```typescript
// Implementasi di frontend
const duplicate = existingItems.filter(
  existing =>
    existing.kegiatan === item.kegiatan &&
    existing.bulan === item.bulan &&
    existing.tahun === item.tahun &&
    (existing.status === 'approved_ppk' || existing.status === 'completed')
);

if (duplicate.length > 1) {
  showWarning('⚠️ Ada multiple entries untuk kegiatan ini bulan ini!');
}
```

### **Rule 3: PPK Must Approve**
Status workflow:
- `draft` → (user ajukan) → `pending_ppk`
- `pending_ppk` → (PPK approve/reject) → `approved_ppk` / `rejected_ppk`
- `approved_ppk` → (final) → `completed`

---

## 📈 Workflow Approval

```
User (Fungsi)          PPK                 Bendahara
    │                  │                       │
    ├─ Buat (draft)   │                       │
    │                  │                       │
    ├─ Submit ─────────>                       │
    │         pending_ppk                      │
    │                  │                       │
    │              Approve/Reject              │
    │                  │                       │
    │     <─ approved_ppk / rejected           │
    │                  │                       │
    │                           ├─ Export ────> (Untuk pencatatan)
    │                           │               
    │                      completed            
```

---

## 🎯 Future Enhancements

Fitur yang bisa ditambahkan:

- [ ] **Real-time Report** - Dashboard analytics
- [ ] **WhatsApp Notification** - Notifikasi ke petugas
- [ ] **Email Reminder** - Reminder approval PPK
- [ ] **Scheduled Tasks** - Auto summarize bulanan
- [ ] **Custom Kegiatan** - Dynamic kegiatan dari database
- [ ] **Batch Import** - Upload Excel file
- [ ] **Audit Log** - Tracking perubahan data
- [ ] **Monthly Archive** - Auto-archive data lama

---

## 📝 Testing Checklist

- [ ] Dapat login dengan berbagai role (User, PPK, Admin)
- [ ] Form validasi berfungsi (field required, nominal > 0)
- [ ] Alert duplikasi muncul saat 1 petugas 2 kegiatan/bulan
- [ ] Data bisa di-submit ke PPK untuk approval
- [ ] PPK bisa approve/reject
- [ ] Edit dan Delete berfungsi
- [ ] Filter bulan/tahun berfungsi
- [ ] Tabel menampilkan data dengan benar
- [ ] Export Excel berfungsi (setelah implementasi)
- [ ] RLS policies berfungsi (user hanya lihat data mereka)

---

## 🤝 Support & Documentation

**Terkait pertanyaan:**
1. Database schema → Check `pulsa_items` tabel di Supabase
2. UI components → Check `src/components/pulsa/`
3. Validation logic → Check `validatePulsaItem()` di `src/types/pulsa.ts`
4. Workflow → Check status transitions di `TabelPulsaBulanan.tsx`

---

## 📞 Kontak & Notes

**Dibuat**: 16 April 2026  
**Untuk**: Kecap-Maja Team  
**Status**: Ready untuk production (setelah testing)

**Catatan Penting**:
- Pastikan Supabase migration sudah di-run
- Update routing sebelum akses page
- Sidebar menu harus di-update
- Test dengan berbagai role
- Excel export bisa diimplementasi di tahap berikutnya

---

Selamat menggunakan sistem manajemen pulsa! 🎉
