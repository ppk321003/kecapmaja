# Feature: Tombol Test WA Broadcast (Manual Testing)

## 📋 Overview

Menambahkan **2 tombol test** di menu Broadcast WA sehingga Anda bisa test sebelum broadcast massal:

1. ✅ **Test Kebijakan** - Test kirim kebijakan umum
2. ✅ **Test Pakaian Dinas** - Test kirim pesan pakaian dinas Korpri

---

## 🎯 Fitur

### Yang Ditambahkan

| Component | File | Perubahan |
|-----------|------|----------|
| **UI Test Buttons** | `src/components/ManualWABroadcast.tsx` | Tambah Section 0 dengan 2 tombol test |
| **Test Modal** | `src/components/ManualWABroadcast.tsx` | Tambah modal untuk pilih 1 recipient |
| **Test Mode - Karir** | `supabase/functions/send-karir-notifications/index.ts` | Parse request body, support testMode |
| **Test Mode - Kebijakan** | `supabase/functions/send-kebijakan-notifications/index.ts` | Parse request body, support testMode |

---

## 🚀 Cara Menggunakan

### Step 1: Buka Layanan Karir di App

1. Login ke: `https://kecapmaja.app` (atau localhost)
2. Navigate ke: **Layanan Karir** → **Broadcast WA Manual**

### Step 2: Klik Tombol Test

Anda akan lihat section baru di atas:

```
🧪 Test Notifikasi
[Test Kebijakan] [Test Pakaian Dinas]
```

### Step 3: Pilih Test Type

Click salah satu:
- **Test Kebijakan** → Kirim pesan kebijakan umum
- **Test Pakaian Dinas** → Kirim pesan khusus pakaian dinas

### Step 4: Pilih 1 Karyawan

Modal akan muncul berisi:
- Search field untuk cari nama/NIP
- Radio button untuk pilih 1 orang

### Step 5: Kirim Test

1. Pilih 1 karyawan
2. Click **"Kirim Test"**
3. Wait ±5-10 detik
4. Check WhatsApp - message seharusnya diterima

---

## 📱 Format Pesan Test

### Test Kebijakan
```
Halo [NAMA],

📢 Pengumuman Kebijakan - Hari Bhakti Korps Pegawai Negeri Sipil

Sehubungan dengan Hari Bhakti Korps Pegawai Negeri Sipil, kami 
menginformasikan bahwa pada tanggal 17 Februari 2026 (Kamis) seluruh 
pegawai diwajibkan memakai Pakaian Dinas Korpri.

Pakaian Dinas Korpri adalah simbol kebanggaan kami sebagai PNS. Mari 
kita tunjukkan dedikasi dan profesionalisme dengan memakai pakaian 
dinas dengan rapi dan sesuai ketentuan.

Terima kasih atas perhatian dan dukungannya.

Salam *Kecap Maja.*
_Kerja Efisien, Cepat, Akurat, Profesional_
_Maju Aman Jeung Amanah_
```

---

## ✅ Test Verification Checklist

- [ ] Button test muncul di UI (Section di atas)
- [ ] Bisa buka modal dengan click button
- [ ] Search field berfungsi (bisa cari nama/NIP)
- [ ] Radio button untuk pilih recipient
- [ ] "Kirim Test" button jadi active setelah pilih 1 orang
- [ ] Message diterima di WhatsApp dalam 10 detik
- [ ] Toast notification muncul (success/error)
- [ ] Format pesan sesuai dan employee name personalized

---

## 🔧 Technical Details

### Manual WA Broadcast Component (`src/components/ManualWABroadcast.tsx`)

**New State:**
```typescript
const [showTestModal, setShowTestModal] = useState(false);
const [testType, setTestType] = useState<'kebijakan' | 'pakaian-dinas' | null>(null);
const [testRecipientNip, setTestRecipientNip] = useState('');
const [isTestLoading, setIsTestLoading] = useState(false);
const [testSearchQuery, setTestSearchQuery] = useState('');
```

**New Function:**
```typescript
const handleTestSend = async () => {
  // 1. Validate recipient selected
  // 2. Call send-kebijakan-notifications function with testMode: true
  // 3. Show toast with result
  // 4. Close modal
}
```

**New UI Section (Section 0):**
- Purple card dengan title "🧪 Test Notifikasi"
- 2 buttons: "Test Kebijakan" & "Test Pakaian Dinas"
- Info text: "Gunakan test untuk verifikasi sebelum broadcast ke banyak orang"

**New UI Modal:**
- Show when `showTestModal === true`
- Search employees
- Radio button selection (single recipient only)
- "Kirim Test" button

---

### Send Kebijakan Notifications Function

**New Request Body Support:**
```typescript
{
  testMode: true,
  testPhase: 'kebijakan',
  testRecipient: {
    nip: '19850315201001001',
    nama: 'BUDI SANTOSO',
    no_hp: '628123456789',
    jabatan: 'Statistisi Terampil',
    satker: 'BPS Pusat'
  }
}
```

**Response (Success):**
```json
{
  "status": "success",
  "testMode": true,
  "sent": 1,
  "recipient": "BUDI SANTOSO",
  "phone": "628123456789",
  "device": "KECAP MAJA-1",
  "timestamp": "2026-03-23T15:30:00.000Z"
}
```

---

### Send Karir Notifications Function

**New Request Body Support:**
```typescript
{
  testMode: true,
  testRecipient: {
    nip: '19850315201001001',
    nama: 'BUDI SANTOSO',
    no_hp: '628123456789',
    jabatan: 'Statistisi Terampil',
    golongan: 'II/c',
    satker: 'BPS Pusat'
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "testMode": true,
  "sent": 1,
  "recipient": "BUDI SANTOSO",
  "phone": "628123456789",
  "device": "KECAP MAJA-1",
  "timestamp": "2026-03-23T15:30:00.000Z"
}
```

---

## 🎯 Benefits

✅ **Verify before broadcast**: Test dengan 1 orang dulu sebelum kirim ke ratusan  
✅ **Check message format**: Pastikan format pesan sesuai dan tidak broken  
✅ **Verify phone numbers**: Confirm nomor HP terdaftar & valid di Fonnte  
✅ **Test device rotation**: Confirm Fontte device rotation working properly  
✅ **Check timing**: Ensure message delivered dalam acceptable timeframe  

---

## 🧪 Testing Steps

### Quick Test (2 minutes)

1. **Open app** → Layanan Karir → Broadcast WA
2. **Click "Test Kebijakan"**
3. **Search** your own name / NIP
4. **Select** yourself
5. **Click "Kirim Test"**
6. **Wait 10 seconds**
7. **Check WhatsApp** ✓

### Detailed Test

1. Test both buttons (Kebijakan & Pakaian Dinas)
2. Test with different employees
3. Verify message content & format
4. Confirm personalization (names not placeholders)
5. Check timing (should be < 10 seconds)
6. Verify logs in Supabase Dashboard

---

## 🐛 Troubleshooting

### Issue: Modal tidak muncul
**Fix**: Ensure ManualWABroadcast component fully deployed dan `showTestModal` state working

### Issue: Tidak bisa cari employee
**Fix**: Check `testFilteredEmployees` filtering logic dan employee list populated

### Issue: Pesan tidak terkirim
**Fix**: 
1. Verify Fonnte devices configured (check FONNTE_DEVICE_TOKENS secret)
2. Check phone number format (should be 628xxx)
3. Check Supabase function logs for errors

### Issue: Toast notification tidak muncul
**Fix**: Ensure `useToast` hook initialized dan imported

---

## 📊 Code Changes Summary

**Files Modified:**
1. `src/components/ManualWABroadcast.tsx` (+187 lines)
   - Added test state management
   - Added handleTestSend function
   - Added test button section (UI)
   - Added test selection modal (UI)

2. `supabase/functions/send-kebijakan-notifications/index.ts` (+60 lines)
   - Parse request body
   - Check for testMode flag
   - Send only to test recipient in test mode
   - Return success/error response

3. `supabase/functions/send-karir-notifications/index.ts` (+67 lines)
   - Parse request body
   - Check for testMode flag
   - Send only to test recipient in test mode
   - Return success/error response

**Total Changes:** ~314 lines added, 1 line modified

---

## 🚀 Deployment Status

✅ **Code committed & pushed** to GitHub main branch  
⏳ **Auto-deployed** to Supabase functions (in progress)  
✅ **Ready for testing**

---

## 📝 Next Steps

1. **Wait for auto-deployment** (2-3 minutes)
2. **Refresh app** page
3. **Navigate to Broadcast WA** → Should see 2 test buttons
4. **Test both buttons** with yourself or colleague
5. **Report results** - any issues or feedback

---

**Keuntungan:** Anda sekarang bisa verify broadcast functions **tanpa perlu CLI atau dashboard** - langsung dari UI aplikasi dengan single click! 🎉

