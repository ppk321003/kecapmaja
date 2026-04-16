# 🏗️ Architecture: Web UI + Google Sheets Hybrid

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│             KECAP-MAJA WEB APPLICATION                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pages/Routes                                            │  │
│  │  - ManajemenPulsa.tsx (Main page with 3 tabs)          │  │
│  │    - Tab: Daftar (List view)                           │  │
│  │    - Tab: Tambah (Input form)                          │  │
│  │    - Tab: Laporan (Reports)                            │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │                                                    │
│  ┌──────────▼───────────────────────────────────────────────┐  │
│  │  React Components                                        │  │
│  │  - FormTambahPulsa: Input form + validation             │  │
│  │  - TabelPulsaBulanan: Data table with actions           │  │
│  │  - UI: Shadcn/ui, Tailwind CSS                          │  │
│  └──────────┬───────────────────────────────────────────────┘  │
│             │ (Vite dev server on http://localhost:8080)       │
└─────────────┼───────────────────────────────────────────────────┘
              │
              │ (HTTP POST with JSON)
              ▼
    ┌─────────────────────────────────────┐
    │  SUPABASE EDGE FUNCTION BRIDGE      │
    │  pulsa-sheets-bridge/index.ts       │
    │                                     │
    │  Functions:                         │
    │  - tambahPulsaBulanan()             │
    │  - validatePulsaDuplikasi()         │
    │  - submitUntukApproval()            │
    │  - approvePulsa()                   │
    │  - updateLaporanPulsa()             │
    └─────────────┬───────────────────────┘
                  │ (Google Sheets API)
                  │ (via OAuth JWT)
                  ▼
    ┌─────────────────────────────────────────────────────┐
    │  GOOGLE SHEETS STORAGE                              │
    │                                                     │
    │  📊 PULSA-BULANAN (Main data)                       │
    │     - Columns: No, Bulan, Tahun, Nama, NIP,        │
    │               Kegiatan, Organik, Mitra, Nominal,   │
    │               Status, Keterangan, TglInput,         │
    │               DisetujuiOleh, TglApproval            │
    │     - Rows: Dynamically appended                    │
    │                                                     │
    │  📋 MASTER-PETUGAS (Reference)                      │
    │     - Columns: No, Nama, NIP, Organik, Fungsi,     │
    │               Email, NoHP, Status, Catatan          │
    │     - Manual: One-time setup                        │
    │                                                     │
    │  📋 MASTER-KEGIATAN (Reference)                     │
    │     - Columns: No, Kode, Nama, Tipe PAK, Target,   │
    │               NominalMin, Catatan                  │
    │     - Manual: One-time setup                        │
    │                                                     │
    │  📈 LAPORAN-PULSA (Auto-generated)                  │
    │     - Aggregated summary by bulan, tahun            │
    │     - Total petugas, nominal, by kegiatan/organik   │
    │                                                     │
    │  🚨 AUDIT-DUPLIKASI (Auto-generated)                │
    │     - Flagged entries violating 1 petugas/kegiatan │
    │     - Alert list for manual review                  │
    └─────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
Frontend (Browser)
├── React 18+ with TypeScript
├── Vite (dev server on localhost:8080)
├── Shadcn/ui (component library)
├── Tailwind CSS (styling)
├── Lucide React (icons)
└── Fetch API (HTTP client)

Backend (Serverless)
├── Supabase Edge Functions (Deno runtime)
└── TypeScript runtime

External APIs
├── Google Sheets API v4
├── Google OAuth 2.0 (service account JWT)

Data Storage
└── Google Sheets (spreadsheet as database)
```

---

## Data Flow: Submit Pulsa

```
1. USER INPUT (Frontend)
   ┌─────────────────────────────────┐
   │ FormTambahPulsa Component       │
   │                                 │
   │ - User fills form               │
   │ - Clicks "💾 Simpan ke Sheet"   │
   │ - Local validation (non-empty) │
   └────────┬────────────────────────┘
            │
            ▼ (handleSubmit)
   ┌─────────────────────────────────┐
   │ tambahPulsaBulanan(data)         │
   │ (Service call)                   │
   └────────┬────────────────────────┘
            │
            ▼ (HTTP POST)
   POST /functions/v1/pulsa-sheets-bridge?action=tambah
   
2. EDGE FUNCTION PROCESSING
   ┌──────────────────────────────────┐
   │ 1. Parse JSON body                │
   │    {bulan, tahun, namaPetugas...} │
   │                                   │
   │ 2. Validate required fields       │
   │    - nominal > 0                  │
   │    - all mandatory filled         │
   │                                   │
   │ 3. Get Google Access Token        │
   │    - JWT signed by service account│
   │    - Exchange for OAuth token     │
   │                                   │
   │ 4. Call validatePulsaDuplikasi()  │
   │    - Read PULSA-BULANAN sheet     │
   │    - Check: existing (namaPetugas,│
   │             bulan, tahun,         │
   │             kegiatan) combinations│
   │    - Status must be: approved/    │
   │             completed (ignores    │
   │             draft/pending)        │
   │                                   │
   │ 5. If validation fails:           │
   │    Return error message ⚠️        │
   │                                   │
   │ 6. If validation passes:          │
   │    - Append new row to sheet      │
   │    - Fields: No, Bulan, Tahun,    │
   │             Nama, NIP, Kegiatan,  │
   │             Organik, Mitra,       │
   │             Nominal, Status       │
   │    - Status = "draft" (initial)   │
   │    - TglInput = now()             │
   │                                   │
   │ 7. Call updateLaporanPulsa()      │
   │    - Read all PULSA-BULANAN data │
   │    - Filter by (bulan, tahun)     │
   │    - Count: petugas, nominal      │
   │    - Group by: kegiatan, organik │
   │    - Append summary to LAPORAN    │
   │                                   │
   │ 8. Return success response ✅     │
   └──────────────────────────────────┘
            │
            ▼ (HTTP Response JSON)
   {
     "success": true,
     "message": "✅ Data pulsa untuk 'Budi' disimpan",
     "rowNumber": 15
   }

3. FRONTEND RESPONSE HANDLING
   ┌──────────────────────────────────┐
   │ response.success === true?        │
   │                                   │
   │ ✅ YES:                           │
   │    - Show green alert ✅          │
   │    - Reset form                   │
   │    - Auto-clear after 5s          │
   │    - Call onSuccess callback      │
   │                                   │
   │ ❌ NO:                            │
   │    - Show red alert with message  │
   │    - Keep form data               │
   │    - User can retry               │
   └──────────────────────────────────┘
```

---

## Duplikasi Detection Logic

### Rule: 1 Petugas = 1 Kegiatan per Bulan

```typescript
// Pseudo-code dari validatePulsaDuplikasi()

function validatePulsaDuplikasi(bulan, tahun, namaPetugas, kegiatanBaru) {
  
  // 1. Read all data from PULSA-BULANAN
  const allData = readFromSheet('PULSA-BULANAN');
  
  // 2. Iterate through each row
  for (let row of allData) {
    
    // 3. Only check rows matching (bulan, tahun, namaPetugas)
    if (row.bulan == bulan && 
        row.tahun == tahun && 
        row.namaPetugas == namaPetugas) {
      
      // 4. Check status: only approved/completed count
      if (row.status == 'approved' || row.status == 'completed') {
        
        // 5. If different kegiatan found with approved status
        if (row.kegiatan != kegiatanBaru) {
          
          // VIOLATION DETECTED!
          return {
            valid: false,
            message: `⚠️ ${namaPetugas} sudah dapat pulsa dari ${row.kegiatan}\n`
                   + `Hanya 1 kegiatan per bulan.`
          }
        }
      }
    }
  }
  
  // 6. No violation found
  return { valid: true };
}
```

### Key Point: Status Filter
- ✅ **Counted** (prevent duplicate): approved, completed
- ❌ **Not counted** (allow): draft, pending, rejected

**Reason**: User bisa input draft berkali-kali tanpa approval, tapi setelah diapprove hanya 1 kegiatan

---

## Approval Workflow

### Current Process (Manual in Sheets)

```
DRAFT
├─ Initial status when submitted via form
├─ User bisa edit/delete manual di sheet
│
→ User changes Status cell to "pending"
│
PENDING
├─ PPK review data
├─ Check: nominal, kegiatan, organik
├─ Verify: nama ada di MASTER-PETUGAS
│
→ PPK changes Status cell to "approved"  (or "rejected")
│
APPROVED ✅
├─ Data included in LAPORAN
├─ Counted for duplikasi detection
├─ Final amount locked
│
→ (Optional) After processing
│
COMPLETED
└─ Archival status for historical records
```

### Future Enhancement: Add Approval UI
```
# Would allow (PPK dashboard):
- See all "pending" records
- Click "Approve" button
- Auto-update status + TglApproval + DisetujuiOleh fields
- Better than manual sheet editing
```

---

## File Structure

```
c:\Users\asus-\Pictures\kecapmaja\

├── 📁 src/
│   ├── 📁 services/
│   │   └── 📄 pulsaSheetsService.ts (NEW)
│   │      └─ Functions: tambahPulsaBulanan(), submitPulsaUntukApproval(), 
│   │                   approvePulsa()
│   │
│   ├── 📁 components/
│   │   └── 📁 pulsa/
│   │       ├── 📄 FormTambahPulsa.tsx (UPDATED)
│   │       │  └─ Changed from Supabase insert to service call
│   │       └── 📄 TabelPulsaBulanan.tsx (EXISTS, can integrate later)
│   │
│   └── 📁 pages/
│       └── 📄 ManajemenPulsa.tsx (EXISTS, main page)
│
├── 📁 supabase/
│   └── 📁 functions/
│       └── 📁 pulsa-sheets-bridge/ (NEW)
│           └── 📄 index.ts
│              └─ Edge function with JWT + Sheets API integration
│
└── 📁 docs/
    ├── 📄 SETUP_HYBRID_PULSA.md (NEW - full detailed guide)
    └── 📄 QUICK_START_HYBRID.md (NEW - 5-min checklist)
```

---

## Security Considerations

### Authentication
```
Edge Function ← Service Account JWT
  ├─ Private key from JSON (secure env var)
  └─ Signed JWT exchanged for OAuth token

User Authentication (Frontend)
  ├─ Optional: Could add Supabase auth
  └─ Currently: No auth (localhost dev)
```

### Authorization
```
Google Sheets
  ├─ Service account has "Editor" access
  ├─ Shared by sheet owner
  └─ Can read/write all sheets

Sheet-level Access
  ├─ PULSA-BULANAN: R/W (primary data)
  ├─ MASTER-PETUGAS: R (reference only)
  ├─ MASTER-KEGIATAN: R (reference only)
  ├─ LAPORAN-PULSA: R/W (auto-generated)
  └─ AUDIT-DUPLIKASI: R/W (auto-generated)
```

### Data Privacy
```
Production Deployment Should:
✅ Use Supabase auth for web app users
✅ Add role-based access (User, PPK, Bendahara)
✅ Encrypt private key in environment
✅ Enable CORS only for trusted domains
✅ Log all API calls for audit
✅ Use HTTPS only
```

---

## Performance Characteristics

| Operation | Latency | Scalability |
|-----------|---------|------------|
| Submit new entry | 500-1000ms | Good (API quota: 500 req/min) |
| Duplikasi check | 200-500ms | Good (one sheet read per request) |
| Update laporan | 300-800ms | Good (aggregation in memory) |
| Sheets sync | Real-time | Google Sheets (eventually consistent) |

### Optimization Tips
```
✅ Cache MASTER reference data (MASTER-PETUGAS, MASTER-KEGIATAN)
✅ Batch append multiple rows if bulk import
✅ Schedule laporan generation at off-peak hours
✅ Archive old data to separate sheets quarterly
```

---

## Limitations & Future Enhancements

### Current Limitations
```
❌ No real-time notifications to PPK
❌ Manual approval via sheet editing (not ideal)
❌ No role-based UI filtering
❌ No audit log in application
❌ Bulk import not supported
```

### Future Enhancements
```
✅ PPK approval dashboard in web app
✅ Email notifications (send when submitted → pending)
✅ Webhook triggers for Fonnte WhatsApp
✅ Bulk import from CSV
✅ Dashboard analytics
✅ Permission system (User/PPK/Bendahara roles)
✅ Data export to Excel
✅ Mobile-responsive improvements
```

---

## Why Hybrid Architecture?

### Comparison: 3 Options

| Aspect | Supabase Only | Google Sheets Only | Hybrid ✅ |
|--------|---------------|--------------------|----------|
| **UI** | Custom build | Google Forms | Rich React UI |
| **Storage** | PostgreSQL | Sheets API | Sheets via API |
| **Setup** | Migration scripts | Apps Script | Service Account |
| **User Experience** | Dashboard | Sheet cells | Form + Sheets |
| **Audit Trail** | DB logs | Sheet history | Both |
| **Cost** | Database $$ | Free (Sheets) | Cheap (Edge Fn) |
| **Approval Workflow** | UI buttons | Manual cells | Manual/UI future |
| **Scaling** | Database limit | API quota | Google quota |

**Rationale**: 
- Simpler than Supabase-only (no migration + no database)
- Better UX than Sheets-only (form validation, reactive UI)
- More visible than Supabase-only (users see Sheets directly)
- Cost-effective (free Sheets storage, serverless functions)

---

## Deployment Steps (Production)

```bash
# 1. Setup Google Cloud
✅ Create project in GCP
✅ Enable Sheets API
✅ Create service account
✅ Download JSON key

# 2. Setup Supabase Production
✅ Create production project
✅ Add env vars: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT
✅ Deploy edge function: supabase functions deploy

# 3. Setup Web App
✅ Update routes & menu
✅ Test locally with dev environment
✅ Update .env.production with production URLs

# 4. Deploy Web App
# Option A: Vercel
vercel --prod

# Option B: Netlify
netlify deploy --prod

# 5. Verify in Production
✅ Test form submission
✅ Check Google Sheets real-time
✅ Monitor Edge Function logs
✅ Test duplikasi detection
```

---

## Reference Documentation

- **Setup Guide**: [SETUP_HYBRID_PULSA.md](./SETUP_HYBRID_PULSA.md)
- **Quick Start**: [QUICK_START_HYBRID.md](./QUICK_START_HYBRID.md)
- **Google Sheets API Docs**: https://developers.google.com/sheets/api/guides/concepts
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **React TypeScript Guide**: https://react-typescript-cheatsheet.netlify.app/

