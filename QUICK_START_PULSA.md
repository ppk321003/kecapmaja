# 🎯 QUICK ACTION GUIDE - Setup Pulsa di Kecap-Maja

## 📊 Sheet yang Diperlukan

### **JAWABAN SINGKAT: TIDAK PERLU!**

Sistem pulsa berjalan **100% di aplikasi web**, bukan di Google Sheets.

- ✅ Data disimpan di Supabase database
- ✅ Validasi, approval, reporting semua di web app
- ✅ Sheet hanya optional kalau ingin backup/import data lama

---

## 🚀 Localhost Status

### **✅ RUNNING SEKARANG!**

```
Local:   http://localhost:8080/
```

Buka di browser: 👉 [http://localhost:8080/](http://localhost:8080/)

---

## 🔧 3 LANGKAH SETUP CEPAT

### **Langkah 1: Run Database Migration** ⚠️ HARUS DULUAN

**Di Supabase Console:**
1. Buka: https://supabase.com/
2. Masuk ke project Anda
3. Klik **SQL Editor**
4. Copy-paste isi file: `supabase/migrations/20260416_create_pulsa_management.sql`
5. Click **Run**
6. Tunggu "Success" ✅

**File akan membuat:**
- ✅ Table `pulsa_items` (untuk setiap pembelian pulsa)
- ✅ Table `pulsa_bulanan` (untuk ringkasan per bulan)
- ✅ Indexes untuk optimasi
- ✅ RLS policies untuk keamanan

---

### **Langkah 2: Add Route ke Aplikasi**

**File: `src/App.tsx`** (atau file routing Anda)

Tambahkan:
```typescript
import ManajemenPulsa from '@/pages/ManajemenPulsa';

// Dalam routes array:
{
  path: '/manajemen-pulsa',
  element: <ProtectedRoute><ManajemenPulsa /></ProtectedRoute>,
}
```

---

### **Langkah 3: Update Sidebar Menu**

**File: `src/components/AppSidebar.tsx`**

Tambahkan menu item:
```typescript
import { Smartphone } from 'lucide-react'; // Import icon

// Dalam menu items, tambahkan:
{
  label: 'Manajemen Pulsa',
  href: '/manajemen-pulsa',
  icon: Smartphone,
  visible: true
}
```

---

## 🔄 Restart Server

Tekan **Ctrl + C** di terminal, lalu jalankan lagi:
```bash
npm run dev
```

Server akan auto-rebuild dengan changes Anda. ✅

---

## ✨ SELESAI!

Sekarang bisa:
1. Login aplikasi
2. Klik menu "Manajemen Pulsa"
3. Input data pulsa
4. System akan auto-validasi duplikasi
5. PPK bisa approve
6. Laporan bisa di-export

---

## 🎬 Test Sekarang

Buka browser:
```
http://localhost:8080/manajemen-pulsa
```

Kalau error? Kemungkinan:
- ✅ Migration belum di-run → Jalankan di Supabase SQL Editor
- ✅ Route belum di-add → Update `src/App.tsx`
- ✅ Menu belum di-add → Update `src/components/AppSidebar.tsx`
- ✅ Server perlu restart → Tekan Ctrl+C lalu `npm run dev` lagi

---

## 📚 Dokumentasi

| File | Untuk |
|------|-------|
| `README_MANAJEMEN_PULSA.md` | Overview & quick start |
| `IMPLEMENTASI_MANAJEMEN_PULSA.md` | Step-by-step setup lengkap |
| `CUSTOMIZATION_MANAJEMEN_PULSA.md` | Customize kegiatan, nominal, dll |
| `TIPS_BEST_PRACTICES_PULSA.md` | Best practices & troubleshooting |
| `LOCALHOST_RUNNING.md` | Dev server info |

---

**NEXT: Run migration di Supabase, update App.tsx & siap pakai!** 🚀
