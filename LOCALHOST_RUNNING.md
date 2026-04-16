# 🚀 Localhost Running - Kecap-Maja Application

## ✅ Server Status

```
✅ VITE Development Server RUNNING

Local:   http://localhost:8080/
Network: http://10.200.2.118:8080/ (local network)
Network: http://192.168.1.55:8080/ (wifi)
```

---

## 📌 Langkah Selanjutnya

### **1. Buka Browser**
```
👉 http://localhost:8080/
```

### **2. Login ke Aplikasi**
- Gunakan credentials yang sudah ada
- Atau sign up akun baru

### **3. Verify Database Migration BELUM dijalankan**

Cek di Supabase console:
```sql
-- Cek apakah tabel pulsa_items sudah ada
SELECT * FROM pulsa_items;

-- Jika error: "relation "pulsa_items" does not exist"
-- Maka harus run migration terlebih dahulu
```

---

## 🔧 SEBELUM Testing Fitur Pulsa

### **Step 1: RUN Database Migration** ⚠️ PENTING

Di Supabase console:
1. Buka **SQL Editor**
2. Copy semua isi dari: `supabase/migrations/20260416_create_pulsa_management.sql`
3. Paste ke SQL Editor
4. Click **Run**
5. Tunggu sampai "Success"

### **Step 2: Add Route ke App** 

Di file `src/App.tsx` atau routing config, tambahkan:

```typescript
import ManajemenPulsa from '@/pages/ManajemenPulsa';
import ProtectedRoute from '@/components/ProtectedRoute';

// Dalam routes array, tambahkan:
{
  path: '/manajemen-pulsa',
  element: <ProtectedRoute><ManajemenPulsa /></ProtectedRoute>,
}
```

### **Step 3: Add Menu di Sidebar**

Di `src/components/AppSidebar.tsx`:

```typescript
// Tambahkan import
import { Smartphone } from 'lucide-react';

// Tambahkan ke menu items
{
  label: 'Manajemen Pulsa',
  href: '/manajemen-pulsa',
  icon: Smartphone,
  visible: true,
  divider: 'after' // optional
}
```

### **Step 4: Restart Dev Server**

```bash
# Tekan Ctrl+C untuk stop server
# Lalu jalankan lagi
npm run dev
```

---

## 📝 Checklist Sebelum Testing

- [ ] Server running (✅ sudah)
- [ ] Bisa buka http://localhost:8080
- [ ] Bisa login
- [ ] Database migration sudah di-run (CHECK di Supabase SQL Editor)
- [ ] Route `/manajemen-pulsa` sudah di-add
- [ ] Sidebar menu sudah updated
- [ ] Server sudah di-restart (after changes)

---

## 🧪 Testing Feature

### **Test 1: Buka halaman Manajemen Pulsa**
```
1. Login app
2. Lihat sidebar menu "Manajemen Pulsa"
3. Click → harus masuk ke /manajemen-pulsa
```

### **Test 2: Input Data Pulsa**
```
1. Klik Tab "Tambah Pulsa"
2. Isi form:
   - Bulan: April 2026
   - Nama Petugas: "Budi Santoso"
   - Kegiatan: "Pendataan Lapangan KSA"
   - Nominal: 100000
3. Click "Simpan sebagai Draft"
4. Harusnya muncul: ✅ "Data pulsa berhasil disimpan"
```

### **Test 3: Validasi Duplikasi**
```
1. Input data kedua dengan nama sama, kegiatan beda:
   - Nama: "Budi Santoso" (sama)
   - Kegiatan: "Pelatihan" (beda)
   - Bulan: April (sama)
2. Harusnya muncul: ⚠️ "DUPLIKASI TERDETEKSI - Budi sudah dapat pulsa..."
3. Form tidak bisa di-submit sampai error resolved
```

### **Test 4: Lihat Tabel Data**
```
1. Klik Tab "Daftar Pulsa"
2. Harusnya muncul semua item yang sudah di-input
3. Check: Status, Nominal, Organik sesuai
```

### **Test 5: Approval Workflow**
```
1. Login dengan role PPK
2. Buka /manajemen-pulsa
3. Klik button "Kirim" di Tab Daftar (ubah status draft → pending)
4. Switch login ke PPK
5. Harusnya ada button "Approve" biru
6. Click → status jadi "Disetujui"
```

---

## 🎯 Summary

| Item | Status |
|------|--------|
| **Dev Server** | ✅ Running di http://localhost:8080 |
| **Database** | ⏳ Perlu migration di Supabase |
| **Routes** | ⏳ Perlu di-add ke App.tsx |
| **Sidebar** | ⏳ Perlu di-update |
| **Testing** | ⏳ Bisa mulai setelah 3 langkah diatas |

---

## ⚡ Quick Commands

```bash
# Stop server
Ctrl + C

# Restart server
npm run dev

# Build untuk production
npm run build

# Preview build
npm run preview

# Lint code
npm run lint
```

---

## 🔗 Useful URLs

- **App**: http://localhost:8080/
- **Supabase Console**: https://supabase.com/
- **Documentation**: See README_MANAJEMEN_PULSA.md

---

**Sekarang server ready! Next: RUN MIGRATION di Supabase** 🚀
