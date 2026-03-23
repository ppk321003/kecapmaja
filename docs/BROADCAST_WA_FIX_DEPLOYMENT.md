# WhatsApp Broadcast Notifications - Fix & Deployment Guide

## 🔴 Issues Found & Fixed

### Issue 1: Missing Google Sheets SpreadsheetId ✅
**Problem**: `send-karir-notifications` was calling google-sheets function WITHOUT required `spreadsheetId` parameter
- **Error**: Function would fail with "Missing required field: spreadsheetId"
- **Status**: FIXED - Added correct spreadsheetId parameter

### Issue 2: Wrong SpreadsheetId in Kebijakan Function ✅  
**Problem**: `send-kebijakan-notifications` used incorrect hardcoded spreadsheetId
- **Error**: Reading from wrong Google Sheet
- **Status**: FIXED - Updated to use same default as Home.tsx

### Issue 3: Missing Cron Schedules ✅
**Problem**: No cron triggers configured in supabase/config.toml
- **Error**: Functions never execute automatically
- **Status**: FIXED - Added cron expressions to config.toml

### Issue 4: Flexible Column Mapping ✅
**Problem**: Functions assumed fixed column indices for employee data
- **Error**: Would fail if sheet structure differs
- **Status**: FIXED - Implemented header-based dynamic column mapping

---

## 📋 Pre-Deployment Checklist

### Prerequisites (Must Do First)

- [ ] **Fonnte Device Tokens** obtained from https://fonnte.com dashboard
  - Should have 5 active devices (KECAP MAJA-1 through KECAP MAJA-5)
  - Record each device's token (not phone number)

- [ ] **Google Sheets Access** verified
  - Master organik sheet exists: `1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM`
  - Contains employee data with columns: NIP, NAMA, TELEPON/NO_HP, GOLONGAN, etc.

---

## 🚀 Deployment Steps

### Step 1: Set Environment Secrets in Supabase

1. Go to: **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Click **New Secret** (or update existing)

**Required Secret: FONNTE_DEVICE_TOKENS**

```json
[
  {
    "name": "KECAP MAJA-1",
    "token": "YOUR_DEVICE_1_TOKEN_HERE",
    "active": true
  },
  {
    "name": "KECAP MAJA-2",
    "token": "YOUR_DEVICE_2_TOKEN_HERE",
    "active": true
  },
  {
    "name": "KECAP MAJA-3",
    "token": "YOUR_DEVICE_3_TOKEN_HERE",
    "active": true
  },
  {
    "name": "KECAP MAJA-4",
    "token": "YOUR_DEVICE_4_TOKEN_HERE",
    "active": true
  },
  {
    "name": "KECAP MAJA-5",
    "token": "YOUR_DEVICE_5_TOKEN_HERE",
    "active": false
  }
]
```

- [ ] Secret saved and verified in list

---

### Step 2: Verify supabase/config.toml Changes

Check that the following has been added:

```toml
[functions.send-karir-notifications]
verify_jwt = false
schedule = "0 1 1 * *"

[functions.send-kebijakan-notifications]
verify_jwt = false
schedule = "0 13 16 * *"
```

- [ ] Confirmed in config.toml

---

### Step 3: Deploy Edge Functions

Run from terminal:

```bash
# Deploy karir notifications function
supabase functions deploy send-karir-notifications

# Deploy kebijakan notifications function
supabase functions deploy send-kebijakan-notifications

# Verify both deployed
supabase functions list
```

Expected output:
```
✓ send-karir-notifications (Cron: 0 1 1 * *)
✓ send-kebijakan-notifications (Cron: 0 13 16 * *)
```

- [ ] Both functions deployed successfully
- [ ] No deployment errors

---

### Step 4: Verify Function Status in Dashboard

1. Supabase Dashboard → **Functions**
2. Click each function to verify:

**send-karir-notifications**
- [ ] Status: **Active** (green)
- [ ] Cron Schedule: `0 1 1 * *` (1st of month at 01:00 UTC = 08:00 WIB)
- [ ] Last deployed: Recent timestamp

**send-kebijakan-notifications**  
- [ ] Status: **Active** (green)
- [ ] Cron Schedule: `0 13 16 * *` (16th of month at 13:00 UTC = 20:00 WIB)
- [ ] Last deployed: Recent timestamp

---

## 🧪 Testing

### Manual Test Invocation

#### Test 1: Karir Notifications

In browser console on your app:

```javascript
const { data, error } = await supabase.functions.invoke('send-karir-notifications');
console.log('Result:', data);
console.log('Error:', error);
```

**Expected result:**
```javascript
{
  success: true,
  timestamp: "2026-03-23T15:00:00.000Z",
  totalEmployees: 150,
  totalCandidates: 12,
  totalSent: 11,
  results: [ /* array of notification results */ ]
}
```

Key checks:
- [ ] `success: true`
- [ ] `totalSent > 0` (at least some messages sent)
- [ ] No error messages

#### Test 2: Kebijakan Notifications

```javascript
const { data, error } = await supabase.functions.invoke('send-kebijakan-notifications');
console.log('Result:', data);
console.log('Error:', error);
```

**Expected result:**
```javascript
{
  status: "success",
  sent: 45,
  failed: 5,
  total: 150,
  breakdown: {
    birthday: { count: 2, sent: 2, failed: 0 },
    kebijakan: { total: 150, sent: 43, failed: 7 }
  }
}
```

Key checks:
- [ ] `status: "success"`
- [ ] `sent` > 0 (messages were sent)
- [ ] Check phone for received messages

---

### Check WhatsApp Messages

**For Karir Notifications:**

After test invocation, check your test phone for message like:

```
Halo [NAME], 👋

Kabar baik! Status kenaikan karir Anda:

📊 Posisi Saat Ini
Jabatan: Statistisi Terampil
Pangkat: II/c

✅ Anda SUDAH BISA mengajukan kenaikan!
Hubungi PPK atau kunjungi aplikasi untuk process selanjutnya.

📱 Pantau progress lengkap di:
https://kecapmaja.app/KarierKu

...
```

- [ ] Message received within 10 seconds
- [ ] Format correct with emojis and line breaks
- [ ] Employee name personalized
- [ ] Contains correct job title and rank

**For Kebijakan Notifications:**

Message format:

```
Halo [NAME],

📢 Pengumuman Kebijakan - Hari Bhakti Korps Pegawai Negeri Sipil

Sehubungan dengan Hari Bhakti Korps Pegawai Negeri Sipil, kami menginformasikan bahwa pada tanggal 17 Februari 2026 (Kamis) seluruh pegawai diwajibkan memakai Pakaian Dinas Korpri.

...
```

- [ ] Message received
- [ ] Format correct
- [ ] Employee name personalized

---

### View Function Logs

1. Supabase Dashboard → **Functions** → **send-karir-notifications** → **Logs**
2. Click most recent execution
3. Look for:

```
[Karir Notifications] Starting execution...
[Fonnte] Initialized 5 active devices
[Sheets] Header columns found: NIP, NAMA, PANGKAT, ...
[Sheets] Fetched 150 employees from 150 data rows
[Karir Notifications] Processing candidates...
[Fonnte] ✅ Sent via KECAP MAJA-1 to 628123456789
[Fonnte] ✅ Sent via KECAP MAJA-2 to 628123456790
...
[Karir Notifications] Complete. Sent: 11/12 dari 150 candidates
```

- [ ] No error messages (red text)
- [ ] Fonnte initialization successful
- [ ] Employee data fetched
- [ ] KECAP MAJA devices rotating

---

## 🔍 Troubleshooting

### Issue: "No Fonnte devices available"

**Cause**: `FONNTE_DEVICE_TOKENS` environment variable not set or empty

**Fix**:
1. Supabase Dashboard → Settings → Edge Functions → Secrets
2. Verify `FONNTE_DEVICE_TOKENS` exists and has JSON content
3. Re-deploy functions

---

### Issue: "Missing required field: spreadsheetId"

**Cause**: Fix not applied or old version still deployed

**Fix**:
```bash
supabase functions deploy send-karir-notifications
supabase functions deploy send-kebijakan-notifications
```

---

### Issue: "No employees found"

**Cause**: Sheet ID incorrect or sheet empty

**Fix**:
1. Verify sheet exists: `1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM`
2. Check sheet has data in columns: NIP, NAMA, TELEPON
3. Verify employee phone numbers present and valid

---

### Issue: Messages not sent at scheduled time

**Cause**: Cron schedule not configured in Supabase dashboard

**Fix**:
1. Supabase Dashboard → Functions → select function
2. Check "Cron Jobs" tab
3. If empty, manually add cron:
   - schedule: `0 1 1 * *` for karir (1st of month, 08:00 WIB)
   - schedule: `0 13 16 * *` for kebijakan (16th of month, 20:00 WIB)

---

## 📅 Scheduled Execution Times

### Karir Notifications
- **Frequency**: 1st of every month
- **Time**: 01:00 UTC = **08:00 WIB**
- **Type**: Automatic (via cron)
- **Manual**: Can invoke anytime via `supabase.functions.invoke('send-karir-notifications')`

### Kebijakan Notifications
- **Frequency**: 16th of every month
- **Time**: 13:00 UTC = **20:00 WIB**
- **Condition**: Only sends if 17th is NOT a holiday/weekend
- **Type**: Automatic (via cron)
- **Manual**: Can invoke anytime (will check holiday logic)

---

## ✅ Verification Checklist (Post-Deployment)

### Week 1: Manual Testing
- [ ] Both functions deployed and active
- [ ] Manual invocation successful
- [ ] Messages received on test phone
- [ ] Format and content correct
- [ ] Device rotation working (messages from different KECAP MAJA devices)

### First Scheduled Run
- [ ] Karir function runs on 1st at 08:00 WIB
- [ ] Kebijakan function runs on 16th at 20:00 WIB
- [ ] Messages sent to appropriate recipients
- [ ] Logs show no errors

### Monthly Verification
- [ ] Check function logs weekly
- [ ] Monitor message delivery rates
- [ ] Verify device rotation is balanced
- [ ] Alert on any deployment errors

---

## 📞 Support

If issues persist after following this guide:

1. Check function logs in Supabase Dashboard
2. Verify all Fonnte device tokens are active
3. Confirm Google Sheet is accessible and has data
4. Test with manual invocation first before relying on cron

**Contact**: [Your support contact]
