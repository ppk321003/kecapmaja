# Career Notifications System - Complete Deployment Guide

## 🎯 Overview

This guide covers the complete deployment of the WA notifications system for career advancement (Karir) with Fonnte integration, including CPNS II/c exception handling and device token rotation.

**Components:**
- ✅ [send-karir-notifications Edge Function](../supabase/functions/send-karir-notifications/index.ts)
- ✅ [Calculation Test Helper](../src/lib/karirTestHelper.ts)
- ✅ [UI Components & Tooltips](../src/components/LayananKarir.tsx)
- ✅ [Toast Notifications](../src/lib/karirTooltips.ts)

---

## 📋 Pre-Deployment Checklist

### 1. Verify Code Changes ✓
```bash
# Check no syntax errors
npm run lint

# Check TypeScript compilation
npm run type-check

# For Edge Functions
supabase functions validate
```

**Status:** ✅ No errors in:
- `supabase/functions/send-karir-notifications/index.ts`
- `src/lib/karirTestHelper.ts`
- `src/components/LayananKarir.tsx`

### 2. Gather Required Information

**From MASTER.ORGANIK sheet, you need:**
- Column A: NIP
- Column B: NAMA
- Column I: TELEPON (phone numbers)
- Column with: PANGKAT, GOLONGAN, JABATAN
- Column with: KATEGORI (Keahlian/Keterampilan/Reguler)
- Column with: TGL_PENGHITUNGAN_AK_TERAKHIR
- Column with: AK_KUMULATIF
- Column with: TMT_PNS
- Column with: TMT_PANGKAT (for CPNS detection)

**From Fonnte Account:**
- 5 device tokens (obtain from Fonnte dashboard as tokens)
- Each device's "device ID" or token string

---

## 🔧 Step 1: Local Testing & Verification

### 1.1 Test Calculation Logic

```bash
# In your app's browser console:
import { runKarierCalculationTest, verifySpecificKaryawan } from '@/lib/karirTestHelper';

// Run all sample tests (includes CPNS II/c scenario)
const results = runKarierCalculationTest();

// Verify specific employee
verifySpecificKaryawan('STATISTISI TERAMPIL CPNS');
```

**Expected Output for CPNS II/c:**
```
✅ STATISTISI TERAMPIL CPNS (19850315201001001)
   CPNS II/c exception: Kebutuhan AK = 40 (NOT 60)
   AK Sekarang: 35.00
   Estimasi: 2 bulan
```

### 1.2 Test with Actual Data

```bash
# Export 5-10 rows from MASTER.ORGANIK sheet as JSON
# Include mix of:
#   - CPNS employees at II/c (tmtPns === tmtPangkat)
#   - Promoted employees at II/c (tmtPns ≠ tmtPangkat)
#   - Different kategori levels
#   - Various phone number formats (0xxx, 62xxx)

# Example export structure:
const actualData = [
  {
    nip: "19850315201001001",
    nama: "BUDI SANTOSO",
    no_hp: "081234567890",
    pangkat: "Penata",
    golongan: "II/c",
    jabatan: "Statistisi Terampil",
    kategori: "Keterampilan",
    tglPenghitunganAkTerakhir: "2023-12-01",
    akKumulatif: 35.0,
    tmtPns: "2023-01-01",
    tmtPangkat: "2023-01-01"
  }
  // ... more rows
];

// Test with actual data
runKarierCalculationTest(actualData);
```

---

## 🌐 Step 2: Supabase Configuration

### 2.1 Set Up Environment Secrets

**Via Supabase Dashboard:**

1. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**

2. **Create Secret #1: `FONNTE_DEVICE_TOKENS`**
   - Copy your tokens from Fonnte dashboard
   - Format as JSON array:

```json
[
  {
    "name": "KECAP MAJA-1",
    "token": "GcrkkR51srYTi4KHanu5",
    "active": true
  },
  {
    "name": "KECAP MAJA-2",
    "token": "ewRtNykz8LxzMaiGoKRs",
    "active": true
  },
  {
    "name": "KECAP MAJA-3",
    "token": "atFkGTx9WDdhZkKNdEox",
    "active": true
  },
  {
    "name": "KECAP MAJA-4",
    "token": "DE3t6QzC88eLpqz1Tw1y",
    "active": true
  },
  {
    "name": "KECAP MAJA-5",
    "token": "Cy5Fwj5gbscfi8B97RDc",
    "active": false
  }
]
```

   > ⚠️ Paste the **entire JSON array** as a single string value

3. **Verify Auto-Secrets** (should already exist):
   - `SUPABASE_URL` ✓ (auto-set)
   - `SUPABASE_SERVICE_ROLE_KEY` ✓ (auto-set)

### 2.2 Verify Google Sheets Integration

The Edge Function assumes you have a `google-sheets` function that can fetch data.

**Check if `google-sheets` function exists:**

```bash
supabase functions list
```

**If it doesn't exist, ensure the function can:**
1. Fetch from Google Sheets API
2. Accept parameters: `{ action: 'fetch', sheet: 'MASTER.ORGANIK' }`
3. Return array of rows with columns matching MASTER.ORGANIK

---

## 🚀 Step 3: Deploy Edge Function

### 3.1 Deploy via Supabase CLI

```bash
# From project root
supabase functions deploy send-karir-notifications

# Verify deployment
supabase functions list
```

Expected output:
```
✓ send-karir-notifications (deno)
```

### 3.2 Verify in Dashboard

1. Go to **Functions** → **send-karir-notifications**
2. Status should show **Active** (green)
3. View **Logs** tab to monitor

---

## ⏱️ Step 4: Configure Cron Schedule

### Method A: Via CLI (Recommended)

Edit `supabase/config.toml`:

```toml
[env.default]

[functions."send-karir-notifications"]
verify_jwt = false
```

Then redeploy:
```bash
supabase functions deploy send-karir-notifications
```

### Method B: Manual Testing (Before Cron)

Test the function works before setting up cron:

```javascript
// In browser console on your app
const { data, error } = await supabase.functions.invoke('send-karir-notifications');
console.log('Response:', data);
console.log('Error:', error);
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-01-01T08:00:00Z",
  "totalEmployees": 250,
  "totalCandidates": 15,
  "totalSent": 14,
  "results": [...]
}
```

---

## 🧪 Step 5: End-to-End Testing

### 5.1 Test with Sample Employee

**Option 1: Manual Function Invocation**

```javascript
// Browser console
const result = await supabase.functions.invoke('send-karir-notifications');
console.table(result.results);
```

### 5.2 Monitor Logs

1. Go to **Functions** → **send-karir-notifications** → **Logs**
2. Look for:
   ```
   ✅ [Karir Notifications] Starting execution...
   [Fonnte] Initialized 5 active devices
   [Sheets] Fetched 250 employees
   [Karir Notifications] Processing candidates...
   [Fonnte] ✅ Sent via KECAP MAJA-1 to 6281234567890
   ```

### 5.3 Check Delivery

1. **WA Message received?** (Check your test phone)
   - Expected format:
     ```
     Halo Budi, 👋
     
     Kabar baik! Status kenaikan karir Anda:
     
     📊 Posisi Saat Ini
     Jabatan: Statistisi Terampil
     Pangkat: II/c
     
     ✅ Anda SUDAH BISA mengajukan kenaikan!
     ...
     ```

2. **NOTIF_LOG sheet updated?** (Check Google Sheets)
   - New row should appear with:
     - Timestamp
     - Status (SUCCESS/FAILED)
     - Device used (e.g., KECAP MAJA-1)
     - Employee info

---

## 📊 Step 6: Monitor & Verify

### 6.1 Check Device Usage Distribution

After running, verify device rotation works:

```javascript
// Review NOTIF_LOG sheet for device names in recent executions
// Should see approximately equal distribution across 4-5 active devices
```

Expected pattern (after multiple runs):
- KECAP MAJA-1: 20%
- KECAP MAJA-2: 25%
- KECAP MAJA-3: 20%
- KECAP MAJA-4: 25%
- KECAP MAJA-5: 0% (inactive)

### 6.2 Verify Rate Limiting

The system should automatically:
- Wait 15 seconds between messages per device
- Respect 15 per hour / 40 per day limits
- Retry failed sends with exponential backoff

Check logs for:
```
[Fonnte] ✅ Sent via KECAP MAJA-1 to 628123...
[Fonnte] Device KECAP MAJA-2 rate-limited (hourly), retrying...
```

---

## 🛠️ Troubleshooting & Fixes

### Issue: "FONNTE_DEVICE_TOKENS not found"

**Solution:**
```bash
# Verify secret exists
supabase secrets list

# Re-add if missing
supabase secrets set FONNTE_DEVICE_TOKENS '[{"name":"KECAP MAJA-1",...}]'

# Redeploy function
supabase functions deploy send-karir-notifications
```

### Issue: "Initialized 0 active devices"

**Solution:** Check JSON format in secret value:
```javascript
// In Supabase dashboard secret, verify it's valid JSON:
JSON.parse('[{"name":"KECAP MAJA-1","token":"...","active":true}]');
```

### Issue: Function timeout or fails to fetch data

**Solution:**
```javascript
// Check google-sheets function works
const { data, error } = await supabase.functions.invoke('google-sheets', {
  body: { action: 'fetch', sheet: 'MASTER.ORGANIK' }
});
console.log('Data:', data?.length, 'Error:', error);
```

### Issue: WA messages not sending

**Checkpoints:**
1. Fonnte account has active balance
2. Phone numbers in MASTER.ORGANIK kolom I are valid
3. Device tokens are current (refresh from Fonnte dashboard)
4. Network connectivity (check function logs)

---

## 📅 Step 7: Schedule Monthly Execution

Once tested and working, set cron schedule in Supabase:

**Option 1: Dashboard Cron (Recommended)**
1. **Functions** → **send-karir-notifications** → **Cron Jobs**
2. Set schedule: `0 8 1 * *` (1st of month, 08:00 UTC)
   - For Jakarta time (GMT+7): Use `0 1 1 * *` UTC instead
3. Enable toggle
4. Save

**Option 2: Via CLI**
```bash
supabase functions update send-karir-notifications --schedule "0 1 1 * *"
```

---

## 📈 Performance & Scaling

**Current Capacity (with 5 devices):**
- Daily: 40 messages/device × 5 devices = 200 messages/day
- Monthly: ~6,000 messages/month capacity
- Support: ~250-500 active employees depending on promotion cycles

**If scaling beyond 500 employees:**
1. Increase number of Fonnte devices (use more tokens)
2. Adjust `RATE_LIMIT` constants in function
3. Consider batching across multiple days (not just 1st of month)

---

## ✅ Final Verification Checklist

Before going to production, verify:

- [ ] `send-karir-notifications` function deployed and showing **Active**
- [ ] `FONNTE_DEVICE_TOKENS` secret created with valid JSON
- [ ] Manual test invocation successful
- [ ] WA message received on test phone
- [ ] NOTIF_LOG sheet updated with results
- [ ] Device rotation working (check logs for device names)
- [ ] No errors in Function Logs
- [ ] Cron schedule configured (if monthly automation desired)
- [ ] Actual employee data tested (not just samples)

---

## 🎉 Production Readiness

**Your system is ready for production when:**
1. ✅ All verification checks pass
2. ✅ CPNS II/c exception verified (40 AK vs 60 AK logic)
3. ✅ Device token rotation working smoothly
4. ✅ NOTIF_LOG tracking deliveries
5. ✅ First production run scheduled for 1st of month at 08:00

---

## 📚 Related Documentation

- [FONNTE_INTEGRATION_SETUP.md](./FONNTE_INTEGRATION_SETUP.md) - Detailed token configuration
- [KARIR_TEST_GUIDE.md](./KARIR_TEST_GUIDE.md) - Testing procedures
- [KARIR_IMPROVEMENTS_SUMMARY.md](./KARIR_IMPROVEMENTS_SUMMARY.md) - Feature overview

---

**Status:** 🟢 Ready for Deployment  
**Last Updated:** January 2024  
**Maintainer:** [Your Team]

---

## 💬 Support & Questions

For issues or questions:
1. Check Function Logs in Supabase dashboard
2. Review Google Sheets for NOTIF_LOG entries
3. Verify JSON format of environment secrets
4. Test with manual invocation first
5. Check Fonnte dashboard for device status/balance
