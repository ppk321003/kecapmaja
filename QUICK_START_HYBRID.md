# 🚀 Quick Start: Hybrid System (Web UI + Google Sheets)

## 5-Minute Setup Checklist

### ✅ Step 1: Google Sheets Preparation (2 min)
- [ ] Create new Google Sheets: "MANAJEMEN-PULSA"
- [ ] Add 5 sheets: PULSA-BULANAN, MASTER-PETUGAS, MASTER-KEGIATAN, LAPORAN-PULSA, AUDIT-DUPLIKASI
- [ ] Add headers to PULSA-BULANAN (see SETUP_HYBRID_PULSA.md for details)
- [ ] Copy Sheet ID from URL: `sheets.google.com/spreadsheets/d/[SHEET_ID]`

### ✅ Step 2: Google Service Account (2 min)
- [ ] Go to: https://console.cloud.google.com
- [ ] Create new project
- [ ] Enable: Google Sheets API
- [ ] Create Service Account: "pulsa-manager"
- [ ] Create JSON key and download
- [ ] Share Google Sheets with service account email (Editor permission)

### ✅ Step 3: Supabase Setup (1 min)
- [ ] Add to Environment Variables:
  ```
  GOOGLE_SHEETS_ID = your-sheet-id
  GOOGLE_SERVICE_ACCOUNT = {paste entire JSON}
  ```
- [ ] Deploy Edge Function:
  ```bash
  supabase functions deploy pulsa-sheets-bridge
  ```

### ✅ Step 4: Web App Setup (1 min)
- [ ] Update src/App.tsx: Add route for ManajemenPulsa
- [ ] Update src/components/AppSidebar.tsx: Add pulsa menu
- [ ] Update .env.local: Set EDGE_FUNCTION_URL

### ✅ Step 5: Test & Run
```bash
npm run dev
# Open: http://localhost:8080/pulsa?tab=tambah
```

---

## 🎯 First Test

1. **Input data via web form**
   ```
   Bulan: April
   Tahun: 2026
   Nama: Budi Santoso
   Kegiatan: Pendataan KSA
   Organik: Fungsi Sosial
   Nominal: 100000
   ```

2. **Click: 💾 Simpan ke Sheet**

3. **Check Google Sheets**
   - PULSA-BULANAN: Should see new row (Status: draft)
   - Data: No, 4, 2026, Budi Santoso, [NIP], Pendataan KSA, Fungsi Sosial, , 100000, draft, ...

4. **Approve in Sheets (manual)**
   - Change Status cell from "draft" → "approved"
   - LAPORAN-PULSA should auto-update

5. **Try duplicate entry**
   - Input same Budi + different kegiatan in same month
   - Should show: ⚠️ Budi already has pulsa from other kegiatan
   - Submit will fail (validation working!)

---

## 📁 Files Created

```
src/
├── services/
│   └── pulsaSheetsService.ts (Bridge to Sheets)
├── components/
│   └── pulsa/
│       └── FormTambahPulsa.tsx (Updated for Sheets)
└── pages/
    └── ManajemenPulsa.tsx (Main page - already exists)

supabase/
└── functions/
    └── pulsa-sheets-bridge/
        └── index.ts (Edge Function)

Docs:
├── SETUP_HYBRID_PULSA.md (Full setup guide)
└── QUICK_START_HYBRID.md (This file)
```

---

## 🔍 Key Differences: Web-Only vs Hybrid

| Feature | Web-Only (Supabase) | Hybrid (Sheets) |
|---------|-------------------|-----------------|
| **Data Storage** | PostgreSQL | Google Sheets |
| **UI** | Form + Table | Form + Table (same) |
| **Setup** | Run migrations | Create sheets |
| **Approval** | UI buttons | Manual in Sheets |
| **Reports** | Generated in DB | Auto-generated |
| **Collaboration** | Dashboard only | Sheets + Dashboard |

**Benefit of Hybrid**: Simpler storage (Sheets), powerful UI (Web), easy auditing (visible in Sheets)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Data not appearing | Check: Sheet ID correct, service account has access |
| Duplikasi not working | Verify: Data status is approved/completed (not draft) |
| Function error | Run: `supabase functions get-logs pulsa-sheets-bridge` |
| Form submission hangs | Check: Network tab, function response in browser |

---

## 📞 Next Steps

1. ✅ Run localhost with form (4 min to complete above)
2. ⏳ Test duplicate detection (submit → approve → resubmit same petugas)
3. ⏳ Populate MASTER-PETUGAS & MASTER-KEGIATAN sheets with real data
4. ⏳ Create custom kegiatan list matching your activities
5. ⏳ Set up PPK approval workflow (dashboard or manual sheets)

---

**Status**: Ready to test! 🎉

