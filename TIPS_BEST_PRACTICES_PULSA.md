# 🚀 Tips, Best Practices & Use Cases - Manajemen Pulsa

---

## 📝 Contoh Use Case

### **Use Case 1: Input Pulsa Bulanan untuk Kegiatan KSA**

**Skenario:**
- Bulan April 2026
- Tim Fungsi Sosial melakukan Pendataan Lapangan KSA
- Ada 5 petugas yang perlu pulsa

**Step-by-step:**

1. Buka halaman **Manajemen Pulsa**
2. Set bulan = April, tahun = 2026
3. Klik tab **Tambah Pulsa**
4. Isi form:
   - Nama Petugas: "Budi Santoso"
   - Kegiatan: "Pendataan Lapangan KSA"
   - Organik: "Fungsi Sosial"
   - Nominal: 100000
5. Click "Simpan sebagai Draft"
6. Ulangi untuk 4 petugas lainnya
7. Saat semua sudah draft, klik "Kirim" untuk submit ke PPK
8. PPK akan kelihat di tab "Daftar Pulsa" dengan status "Perlu Approval"
9. PPK approve dan status jadi "Disetujui"
10. Bendahara bisa lihat di laporan dan export ke Excel

---

### **Use Case 2: Validasi Duplikasi Kegiatan**

**Skenario:**
- Petugas "Siti Nurhaliza" sudah dapat pulsa untuk "Pelatihan Petugas" di April
- Manager coba tambah pulsa untuk "Koordinasi Tim Statistik" di April yang sama

**Yang terjadi:**
1. Manager input form untuk Siti dengan kegiatan berbeda
2. System mendeteksi: "Siti sudah dapat pulsa untuk kegiatan lain di bulan ini"
3. **Alert merah muncul** ⚠️
4. Manager perlu cancel atau update kegiatan
5. Data tidak bisa disimpan sampai alert resolved

---

### **Use Case 3: Monthly Reconciliation**

**Skenario:**
- Akhir bulan, manager perlu laporan untuk bendahara

**Steps:**
1. Buka **Laporan** tab
2. Filter bulan & tahun
3. Lihat summary:
   - Total petugas: 12
   - Total nominal: Rp 1.450.000
   - Per kegiatan: Pendataan (5 orang), Pelatihan (4 orang), Koordinasi (3 orang)
   - Per organik: Fungsi Sosial (7 orang), Fungsi Neraca (5 orang)
4. Export ke Excel untuk bendahara
5. Archive data setelah selesai

---

## ⚙️ Best Practices

### **1. Naming Convention**

**Nama Petugas:**
- ✅ "Budi Santoso" (Firstname Lastname)
- ✅ "Siti Nurhaliza" (Firstname Lastname)
- ❌ "Budi" (terlalu pendek, ambigu)
- ❌ "budi santoso" (harus Title Case)

**Kegiatan:**
- ✅ Gunakan daftar standard (jangan custom)
- Jika ada baru → request admin untuk update list
- ❌ "Pendataan lapangan ksa" (capital letters)

**Organik:**
- ✅ "Fungsi Sosial" (exact match dengan database)
- ✅ "Fungsi Neraca"
- ❌ "Fungsi_Sosial" (no underscore)
- ❌ "Fungsi sosial" (lowercase)

---

### **2. Data Entry Checklist**

Sebelum submit untuk approval:

- [ ] Nama petugas spelling benar
- [ ] NIP valid (jika ada)
- [ ] Kegiatan dari daftar (bukan custom)
- [ ] Organik sesuai dengan MASTER.ORGANIK
- [ ] Nominal > 0 dan reasonable (tidak terlalu besar/kecil)
- [ ] No duplikasi: 1 petugas = 1 kegiatan/bulan
- [ ] Catatan lengkap jika ada hal khusus

---

### **3. Approval Workflow**

Sebagai **User (Fungsi/Operator):**
1. Input data lengkap di form
2. Validasi di-check sistem otomatis
3. Jika valid → tanda "Simpan sebagai Draft"
4. Review data di tabel
5. Jika semua OK → "Kirim ke PPK"
   
Sebagai **PPK:**
1. Buka tab "Daftar Pulsa"
2. Filter status = "Perlu Approval"
3. Review per item
4. Jika OK → click "Approve" ✅
5. Jika ada masalah → click "Tolak" ❌
6. Sistem auto-generate audit trail

---

### **4. Monthly Routine**

**Setiap awal bulan:**
- [ ] Koordinasi dengan tim untuk daftar kegiatan bulan ini
- [ ] Set up di form: bulan & tahun baru
- [ ] Siapkan daftar kegiatan & nominal

**Setiap hari kerja:**
- [ ] Entry data petugas yang dapat pulsa
- [ ] Check daftar, validasi duplikasi
- [ ] Submit untuk approval sebelum jam 5 sore

**Setiap akhir minggu:**
- [ ] Follow up PPK untuk approval pending
- [ ] Check ada validation errors

**Setiap akhir bulan:**
- [ ] Finalize semua data
- [ ] PPK approve semua pending
- [ ] Export ke Excel untuk bendahara
- [ ] Archive bulan lalu

---

### **5. Error Handling**

**Error: "Duplikasi terdeteksi"**
- ✅ Ubah kegiatan menjadi yang lain
- ✅ Ubah nama petugas jika salah ketik
- ✅ Cek di tabel apakah memang sudah ada

**Error: "Gagal disimpan"**
- Refresh page
- Check internet connection
- Contact admin jika persist

**Error: "Field wajib kosong"**
- Isi semua field dengan (*) marker
- Nominal harus > 0

---

### **6. Validasi Data Quality**

Sebelum submit approval:

```
✅ Nama Petugas
   - Tidak ada karakter aneh
   - Spelling benar
   - Match dengan database master

✅ Kegiatan
   - Dari daftar standard
   - Tidak typo
   - Relevan dengan organik

✅ Nominal
   - > 0 dan <= 500000 (atau sesuai kebijakan)
   - Consistent dengan historical data
   - Reasonable range

✅ No Duplikasi
   - 1 petugas = 1 kegiatan per bulan
   - Alert sistem sudah dicheck
```

---

## 🎯 Performance Tips

### **1. Bulk Operations**

Jika input banyak data (>10 item), gunakan:
- Import Excel template (fitur future)
- Buat draft terlebih dahulu baru submit

### **2. Database Optimization**

- ✅ Index sudah di-optimize (bulan, tahun, nama_petugas, status)
- ✅ Pagination untuk tabel besar
- ✅ Lazy load untuk table columns

### **3. Caching Strategy**

```typescript
// Component akan cache daftar kegiatan & organik
// Refresh setiap 1 jam atau saat admin update

useEffect(() => {
  const timer = setInterval(() => {
    // Refresh kegiatan & organik list
  }, 3600000); // 1 hour
  return () => clearInterval(timer);
}, []);
```

---

## 🔒 Security Best Practices

### **1. Role-Based Access**

| Role | Can View | Can Create | Can Approve | Can Export |
|------|----------|-----------|-------------|-----------|
| Fungsi Sosial | Own data | ✅ | ❌ | ❌ |
| Bendahara | All data | ✅ | ❌ | ✅ |
| PPK | All data | ✅ | ✅ | ✅ |
| Admin | All data | ✅ | ✅ | ✅ |

### **2. Data Access Control**

- ✅ RLS di database level (tidak bisa bypass)
- ✅ User hanya lihat approved data mereka
- ✅ PPK bisa lihat semua untuk approval
- ✅ Audit trail untuk setiap action

### **3. Input Sanitization**

```typescript
// Sudah implement di backend
- SQL injection protection ✅
- XSS prevention ✅
- Parameter validation ✅
```

---

## 📊 Reporting Tips

### **Report ke Bendahara (Excel)**

Pastikan include:
1. **Summary Sheet**
   - Total nominal bulan ini
   - Breakdown per kegiatan
   - Breakdown per organik

2. **Detail Sheet**
   - No, Nama, Kegiatan, Organik, Nominal, Status
   - Sorted by nama & kegiatan

3. **Validation Sheet**
   - List duplikasi kegiatan (jika ada)
   - Rejected items (jika ada)

---

## 🛠️ Troubleshooting

### **Q: Data tidak muncul di tabel setelah input**
**A:** 
- Refresh page (F5)
- Check status di database (mungkin masih draft)
- Pastikan bulan & tahun filter sesuai

### **Q: Alert duplikasi tidak muncul**
**A:**
- Pastikan data sebelumnya sudah "Approved" atau "Completed"
- Draft item tidak trigger alert
- Check data lagi di tabel

### **Q: Tidak bisa export Excel**
**A:**
- Fitur sedang development
- Contact admin untuk manual export
- Gunakan copy-paste dari tabel temporary

### **Q: PPK tidak punya button approve**
**A:**
- Check user role di Supabase auth
- Harus role = "Pejabat Pembuat Komitmen"
- Contact admin untuk set role

---

## 📚 Reference Documentation

- **Database Schema** → Check `pulsa_items` table structure
- **Type Definitions** → See `src/types/pulsa.ts`
- **Component Code** → Check `src/components/pulsa/`
- **Validation Rules** → See `validatePulsaItem()` function
- **API Integration** → Check Supabase client calls

---

## 🌟 Future Roadmap

**Phase 2 (Upcoming):**
- [ ] Batch import dari Excel
- [ ] WhatsApp notification ke petugas
- [ ] Calendar view untuk schedule
- [ ] Mobile-optimized UI
- [ ] Advanced reports dengan charts

**Phase 3 (TBD):**
- [ ] Integration dengan accounting system
- [ ] Automatic reconciliation
- [ ] Prediction analysis (trend spending)
- [ ] API untuk integration dengan sistem lain

---

**Version**: 1.0  
**Created**: April 16, 2026  
**For**: Kecap-Maja Team
