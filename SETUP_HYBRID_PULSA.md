# 🔄 Setup Sistem Hybrid: Input Web UI + Penyimpanan Google Sheets

**Konsep**: User input data pulsa dari UI web app Kecap-Maja yang bagus, tetapi data disimpan langsung ke Google Sheets (bukan database).

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INPUT (Web App Kecap-Maja)                          │
│    - Form yang user-friendly                                │
│    - Real-time validation                                   │
│    - Error messages yang jelas                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (HTTP POST)
              ┌──────────────────┐
              │ Supabase Edge    │
              │ Function Bridge  │
              └────────┬─────────┘
                       │
                       ▼ (Google Sheets API)
              ┌──────────────────────────┐
              │ 2. PENYIMPANAN SHEETS    │
              │ - PULSA-BULANAN          │
              │ - MASTER-PETUGAS         │
              │ - MASTER-KEGIATAN        │
              │ - LAPORAN-PULSA          │
              │ - AUDIT-DUPLIKASI        │
              └──────────────────────────┘
```

---

## 📋 Langkah Setup

### 1️⃣ Persiapan Google Sheets

#### A. Buat Google Sheets Baru
```
1. Buka Google Sheets: https://sheets.google.com/create
2. Rename menjadi: "MANAJEMEN-PULSA"
3. Buat 5 sheet dengan nama:
   - PULSA-BULANAN (utama)
   - MASTER-PETUGAS (referensi)
   - MASTER-KEGIATAN (referensi)
   - LAPORAN-PULSA (auto-generated)
   - AUDIT-DUPLIKASI (auto-generated)
```

#### B. Setup Header PULSA-BULANAN
Sheet pertama harus memiliki header di baris 1:

| A | B | C | D | E | F | G | H | I | J | K | L | M | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| No | Bulan | Tahun | Nama Petugas | NIP | Kegiatan | Organik | Mitra | Nominal | Status | Keterangan | Tgl Input | Disetujui Oleh | Tgl Approval |

#### C. Setup Header MASTER-PETUGAS
```
A: No
B: Nama Petugas
C: NIP
D: Organik
E: Fungsi
F: Email
G: No HP
H: Status
I: Catatan
```

#### D. Setup Header MASTER-KEGIATAN
```
A: No
B: Kode Kegiatan
C: Nama Kegiatan
D: Tipe PAK
E: Target
F: Nominal Minimal
G: Catatan
```

#### E. Setup Header LAPORAN-PULSA & AUDIT-DUPLIKASI
(Biarkan kosong, akan auto-generate oleh script)

#### F. Catat Google Sheets ID
```
URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
Salin [SHEET_ID] untuk langkah berikutnya
```

---

### 2️⃣ Setup Google Service Account

#### A. Akses Google Cloud Console
```
1. Buka: https://console.cloud.google.com
2. Buat project baru: "Kecap-Maja Pulsa Integration"
3. Aktifkan API: Google Sheets API
```

#### B. Buat Service Account
```
1. Navigasi ke: "Service Accounts"
2. Klik: "Create Service Account"
3. Nama: "pulsa-manager"
4. Grant role: "Editor"
5. Klik "Done"
```

#### C. Generate Key JSON
```
1. Klik Service Account yang baru dibuat
2. Tab "Keys" > "Add Key" > "Create new key"
3. Type: JSON
4. Download file JSON
5. Buka JSON, catat:
   - client_email
   - private_key
```

#### D. Share Sheets dengan Service Account
```
1. Buka Google Sheets "MANAJEMEN-PULSA"
2. Klik Share
3. Invite: [client_email dari step C]
4. Grant: "Editor" permission
```

---

### 3️⃣ Setup Supabase Edge Function

#### A. Buat Environment Variables di Supabase
```bash
# Supabase Dashboard > Project Settings > Environment Variables

GOOGLE_SHEETS_ID = "sheet-id-dari-step-1-F"

GOOGLE_SERVICE_ACCOUNT = {
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "pulsa-manager@...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

#### B. Deploy Edge Function
```bash
# File sudah ada di: supabase/functions/pulsa-sheets-bridge/index.ts

# Deploy ke Supabase
supabase functions deploy pulsa-sheets-bridge

# Test function
curl -X POST https://[project].supabase.co/functions/v1/pulsa-sheets-bridge?action=tambah \
  -H "Content-Type: application/json" \
  -d '{
    "bulan": 4,
    "tahun": 2026,
    "namaPetugas": "Budi Santoso",
    "nip": "199001011991101001",
    "kegiatan": "2886",
    "organik": "Fungsi Sosial",
    "mitra": "",
    "nominal": 100000,
    "keterangan": "Test data"
  }'
```

---

### 4️⃣ Setup Web App (Kecap-Maja)

#### A. Update Route di App.tsx
```tsx
// src/App.tsx

import { ManajemenPulsa } from './pages/ManajemenPulsa';

const routes = [
  // ... existing routes
  {
    path: '/pulsa',
    element: <ManajemenPulsa />,
  },
];
```

#### B. Update Sidebar Menu
```tsx
// src/components/AppSidebar.tsx

{
  title: "📱 Manajemen Pulsa",
  url: "/pulsa",
  icon: Smartphone,
  items: [
    { title: "Daftar Pulsa", url: "/pulsa?tab=daftar" },
    { title: "Tambah Pulsa", url: "/pulsa?tab=tambah" },
    { title: "Laporan", url: "/pulsa?tab=laporan" },
  ],
}
```

#### C. Update Environment Variables
```env
# .env.local

VITE_SUPABASE_EDGE_FUNCTION_URL=https://[project].supabase.co/functions/v1/pulsa-sheets-bridge

# Development (localhost)
# VITE_SUPABASE_EDGE_FUNCTION_URL=http://localhost:54321/functions/v1/pulsa-sheets-bridge
```

#### D. Update Service
```typescript
// src/services/pulsaSheetsService.ts

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL || 
  "http://localhost:54321/functions/v1/pulsa-sheets-bridge";
```

#### E. Run Development Server
```bash
cd /path/to/kecapmaja
npm run dev

# Server akan berjalan di http://localhost:8080
# Form: http://localhost:8080/pulsa?tab=tambah
```

---

## 🎯 Testing

### Test 1: Submit Data Pulsa
```
1. Buka: http://localhost:8080/pulsa?tab=tambah
2. Isi form:
   - Bulan: April
   - Tahun: 2026
   - Nama Petugas: Budi Santoso
   - Kegiatan: Pendataan KSA
   - Organik: Fungsi Sosial
   - Nominal: 100000
   - Keterangan: Test submission
3. Klik: "💾 Simpan ke Sheet"
4. Expected: ✅ Success message + data ada di Google Sheets
```

### Test 2: Duplikasi Validation
```
1. Submit data untuk: Budi Santoso + Pendataan KSA (April 2026)
2. Approve di Google Sheets (ubah status jadi "approved")
3. Submit lagi data untuk: Budi Santoso + Survey (April 2026)
4. Expected: ⚠️ Error message: Budi sudah dapat pulsa dari Pendataan KSA
```

### Test 3: Check Google Sheets
```
1. Buka: https://docs.google.com/spreadsheets/d/[SHEET_ID]
2. Verifikasi:
   - PULSA-BULANAN: Data ter-append
   - LAPORAN-PULSA: Auto-generated summary
   - AUDIT-DUPLIKASI: Alerts (jika ada duplikasi)
```

---

## 🔐 Troubleshooting

### ❌ Error: "Could not authenticate with Google"
```
✅ Solution:
1. Verifikasi private_key di GOOGLE_SERVICE_ACCOUNT
2. Pastikan Google Sheets sudah di-share dengan client_email
3. Cek Google Cloud Console: Service Account ada dan active
```

### ❌ Error: "Cannot read property 'appendToSheet' of undefined"
```
✅ Solution:
1. Verifikasi Edge Function sudah di-deploy
2. Cek VITE_SUPABASE_EDGE_FUNCTION_URL di .env
3. Jalankan: supabase functions deploy pulsa-sheets-bridge
```

### ❌ Data tidak muncul di Google Sheets
```
✅ Solution:
1. Cek GOOGLE_SHEETS_ID sudah benar
2. Verifikasi header di PULSA-BULANAN sheet
3. Check browser console untuk error messages
4. Lihat Supabase function logs: supabase functions get-logs
```

### ❌ Duplikasi tidak detect
```
✅ Solution:
1. Pastikan data sebelumnya sudah di-approve/complete
2. Script hanya check data dengan status: "approved" atau "completed"
3. Data draft/pending tidak dicount
```

---

## 📊 API Reference

### POST /pulsa-sheets-bridge?action=tambah
**Input:**
```json
{
  "bulan": 4,
  "tahun": 2026,
  "namaPetugas": "string",
  "nip": "string",
  "kegiatan": "string",
  "organik": "string",
  "mitra": "string (optional)",
  "nominal": number,
  "keterangan": "string (optional)"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "✅ Data pulsa untuk 'Budi' sudah disimpan sebagai draft.",
  "rowNumber": 5
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "⚠️ Budi Santoso sudah mendapat pulsa untuk kegiatan: Pendataan KSA..."
}
```

---

## 📈 Workflow Approval

```
1. INPUT (Status: draft)
   ↓ User submit via web app
   
2. PENDING (Status: pending)
   ↓ Manual change di Google Sheets (atau via API nanti)
   ↓ PPK review dan validate
   
3. APPROVED (Status: approved)
   ↓ All checks passed
   ↓ Data included dalam LAPORAN-PULSA
   
4. COMPLETED (Status: completed)
   ↓ Final archival setelah processing
```

---

## 🎨 UI Components

**FormTambahPulsa.tsx:**
- Input fields dengan real-time validation
- Dropdown untuk Kegiatan & Organik
- Nominal formatter (Rp XXX.XXX)
- Summary preview
- Error/success alerts

**TabelPulsaBulanan.tsx:**
- Data table dengan filter bulan/tahun
- Status badge (draft, pending, approved)
- Action buttons (approve, reject)
- Duplicate warnings

**ManajemenPulsa.tsx:**
- 3 tabs: Daftar, Tambah, Laporan
- Month/year selector
- Tab navigation

---

## 🔄 Data Flow Architecture

```typescript
// User Input → Web Form
Form Component 
  ↓ (validate locally)
Service: tambahPulsaBulanan()
  ↓ (POST to Edge Function)
Supabase Edge Function
  ↓ (auth with Google Service Account)
Google Sheets API
  ↓ (append to PULSA-BULANAN)
validatePulsaDuplikasi() check
  ↓ (query existing approved items)
updateLaporanPulsa() auto-generate
  ↓ (aggregate & summarize)
Response back to UI
  ↓ (success/error message)
User sees result
```

---

## ✨ Features

✅ **Real-time validation**: Duplikasi check sebelum save
✅ **Auto-reporting**: LAPORAN-PULSA auto-generated
✅ **Audit trail**: AUDIT-DUPLIKASI sheet untuk flagged issues
✅ **User-friendly UI**: React components dengan good UX
✅ **Role-based**: Draft status sampai PPK approve
✅ **Google Sheets**: Familiar Excel-like interface
✅ **No database setup**: Langsung ke Sheets, simpler deployment

---

## 📞 Support

- **Error logs**: Supabase > Project > Logs > Function Logs
- **Google Sheets**: Preview & manual edit anytime
- **API testing**: Use curl atau Postman untuk test endpoint
- **Browser console**: Check client-side errors (F12)

