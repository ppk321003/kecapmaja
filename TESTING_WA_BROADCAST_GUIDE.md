# Testing Guide - Verifikasi Perbaikan WA Broadcast Notifications

## 🎯 Tujuan Testing
Memastikan bahwa:
1. ✅ `send-karir-notifications` bisa membaca data MASTER.ORGANIK dengan benar
2. ✅ `send-kebijakan-notifications` membaca dari sheet yang correct
3. ✅ Kedua functions mengirim messages via Fonnte
4. ✅ Cron schedules akan berjalan otomatis

---

## 📝 Test Method 1: Manual Function Invocation (Easiest)

### Step 1.1: Buka Browser Console

1. Buka aplikasi di browser: `https://kecapmaja.app` (atau localhost kalau development)
2. Tekan `F12` atau `Ctrl+Shift+I` untuk buka Developer Tools
3. Pilih tab **Console**

### Step 1.2: Test Karir Notifications

Copy-paste kode ini di console:

```javascript
console.log('Testing send-karir-notifications...');

const testKarir = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('send-karir-notifications');
    
    console.log('=== KARIR NOTIFICATIONS TEST ===');
    console.log('Status:', data?.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Total Employees:', data?.totalEmployees);
    console.log('Candidates:', data?.totalCandidates);
    console.log('Sent:', data?.totalSent);
    console.log('Timestamp:', data?.timestamp);
    console.log('Error:', error?.message || 'None');
    console.log('Full Response:', data);
    
    return data;
  } catch (err) {
    console.error('Exception:', err);
  }
};

testKarir();
```

**Expected Output:**
```
=== KARIR NOTIFICATIONS TEST ===
Status: ✅ SUCCESS
Total Employees: 150
Candidates: 12
Sent: 11
Timestamp: 2026-03-23T15:30:00.000Z
Error: None
Full Response: { success: true, totalEmployees: 150, ... }
```

### Step 1.3: Test Kebijakan Notifications

```javascript
console.log('Testing send-kebijakan-notifications...');

const testKebijakan = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('send-kebijakan-notifications');
    
    console.log('=== KEBIJAKAN NOTIFICATIONS TEST ===');
    console.log('Status:', data?.status);
    console.log('Sent:', data?.sent);
    console.log('Failed:', data?.failed);
    console.log('Total Employees:', data?.total);
    console.log('Birthday Count:', data?.breakdown?.birthday?.count);
    console.log('Birthday Sent:', data?.breakdown?.birthday?.sent);
    console.log('Kebijakan Sent:', data?.breakdown?.kebijakan?.sent);
    console.log('Error:', error?.message || 'None');
    console.log('Full Response:', data);
    
    return data;
  } catch (err) {
    console.error('Exception:', err);
  }
};

testKebijakan();
```

**Expected Output:**
```
=== KEBIJAKAN NOTIFICATIONS TEST ===
Status: success
Sent: 125
Failed: 25
Total Employees: 150
Birthday Count: 2
Birthday Sent: 2
Kebijakan Sent: 123
Error: None
```

---

## 🔍 Test Method 2: Check Function Logs (Detailed)

### Step 2.1: Buka Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select project: **simaja** (yudlciokearepqzvgzxx)
3. Navigate to: **Functions** menu

### Step 2.2: Check Karir Function Logs

1. Click **send-karir-notifications**
2. Click tab **Invocations** or **Logs**
3. Find most recent execution (top of list)
4. Click to expand

**Look for:**

✅ SUCCESS indicators:
```
[Karir Notifications] Starting execution...
[Fonnte] Initialized 5 active devices
[Sheets] Header columns found: NIP, NAMA, PANGKAT, GOLONGAN, ...
[Sheets] Fetched 150 employees from 150 data rows
[Karir Notifications] Processing candidates...
[Fonnte] ✅ Sent via KECAP MAJA-1 to 628123456789
[Fonnte] ✅ Sent via KECAP MAJA-2 to 628123456790
...
[Karir Notifications] Complete. Sent: 11/12 dari 150 candidates
```

❌ ERROR indicators to avoid:
```
[Sheets] Fetch error: Missing required field: spreadsheetId
[Fonnte] No available devices
Error: Failed to fetch data
```

### Step 2.3: Check Kebijakan Function Logs

1. Click **send-kebijakan-notifications**
2. Click tab **Invocations** or **Logs**
3. Find most recent execution

**Look for:**

✅ SUCCESS indicators:
```
[Kebijakan Notifications] Starting execution...
[Kebijakan Notifications] Fetching MASTER.ORGANIK data...
[Kebijakan Notifications] Header columns found: NIP, NAMA, TELEPON, ...
[Kebijakan Notifications] Total karyawan: 150
[Birthday Phase] Sending birthday greetings to 2 employees...
[Birthday greeting sent to NAMA (35 tahun) via KECAP MAJA-1]
[Kebijakan Phase] Sending kebijakan notifications to 150 employees...
[Kebijakan Notifications] Complete. Sent: 148/150, Failed: 2
```

---

## 💬 Test Method 3: Verify WhatsApp Messages

### Step 3.1: Prepare Test Phone

1. Make sure WhatsApp is active on your test phone
2. Use employee phone number yang ada di MASTER.ORGANIK (your number atau colleague)

### Step 3.2: Run Test

1. Execute test dari Method 1 (console)
2. **Wait 5-10 seconds** untuk Fonnte API response
3. Check WhatsApp messages

**Expected Messages:**

**Karir Notification Message:**
```
Halo [FIRSTNAME], 👋

Kabar baik! Status kenaikan karir Anda:

📊 Posisi Saat Ini
Jabatan: Statistisi Terampil
Pangkat: II/c

✅ Anda SUDAH BISA mengajukan kenaikan!
Hubungi PPK atau kunjungi aplikasi untuk process selanjutnya.

📱 Pantau progress lengkap di:
https://kecapmaja.app/KarierKu

Pertanyaan? Hubungi PPK di satuan kerja Anda.

_Pesan otomatis dari Sistem Karir_
```

**Kebijakan Notification Message:**
```
Halo [FIRSTNAME],

📢 Pengumuman Kebijakan - Hari Bhakti Korps Pegawai Negeri Sipil

Sehubungan dengan Hari Bhakti Korps Pegawai Negeri Sipil, kami menginformasikan bahwa pada tanggal 17 Februari 2026 (Kamis) seluruh pegawai diwajibkan memakai Pakaian Dinas Korpri.

Pakaian Dinas Korpri adalah simbol kebanggaan kami sebagai PNS. Mari kita tunjukkan dedikasi dan profesionalisme dengan memakai pakaian dinas dengan rapi dan sesuai ketentuan.

Terima kasih atas perhatian dan dukungannya.

Salam Kecap Maja.
_Kerja Efisien, Cepat, Akurat, Profesional_
_Maju Aman Jeung Amanah_
```

✅ Check points:
- [ ] Message received within 10 seconds
- [ ] Format correct (emojis, line breaks visible)
- [ ] Employee name personalized (not [FIRSTNAME])
- [ ] Contains correct info (job title, rank, etc.)
- [ ] Links clickable

---

## 📊 Test Method 4: Verify Google Sheets Data Connection

### Step 4.1: Test Data Fetch

```javascript
const testDataFetch = async () => {
  console.log('Testing Google Sheets data fetch...');
  
  try {
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: {
        operation: 'read',
        spreadsheetId: '1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM',
        range: 'MASTER.ORGANIK'
      }
    });
    
    if (data?.data) {
      console.log('✅ Data retrieved successfully');
      console.log('Rows:', data.data.length);
      console.log('First row (header):', data.data[0]);
      console.log('Second row (first employee):', data.data[1]);
      
      // Check if phone numbers exist
      const headerRow = data.data[0];
      const phoneIndex = headerRow.findIndex(h => 
        String(h).toUpperCase().includes('TELEPON') || 
        String(h).toUpperCase().includes('HP')
      );
      console.log('Phone column index:', phoneIndex);
      console.log('Sample phone:', data.data[1]?.[phoneIndex] || 'NOT FOUND');
      
    } else {
      console.log('❌ No data retrieved:', error);
    }
  } catch (err) {
    console.error('Error:', err);
  }
};

testDataFetch();
```

**Expected Output:**
```
✅ Data retrieved successfully
Rows: 151
First row (header): ["", "", "NIP", "NAMA", "JABATAN", ..., "TELEPON"]
Second row (first employee): ["1", "19850315201001001", "BUDI SANTOSO", "Statistisi Terampil", ..., "081234567890"]
Phone column index: 8
Sample phone: 081234567890
```

---

## ✅ Comprehensive Test Checklist

### Test 1: Data Connection (3-5 minutes)
- [ ] Execute Method 4 code in console
- [ ] Verify data retrieved (201+ rows)
- [ ] Confirm phone numbers present
- [ ] Check columns: NIP, NAMA, TELEPON, PANGKAT, GOLONGAN

### Test 2: Function Execution (2 minutes per function)
- [ ] Run Method 1: Karir test code
  - [ ] Verify `success: true`
  - [ ] Check `totalSent > 0`
  - [ ] No errors in response

- [ ] Run Method 1: Kebijakan test code
  - [ ] Verify `status: "success"`
  - [ ] Check `sent > 0`
  - [ ] No errors in response

### Test 3: WhatsApp Receipt (10 minutes)
- [ ] Karir message received on test phone
  - [ ] Format correct
  - [ ] Employee name personalized
  - [ ] Contains career info

- [ ] Kebijakan message received on test phone
  - [ ] Format correct
  - [ ] Employee name personalized
  - [ ] Contains policy info

### Test 4: Log Verification (2 minutes per function)
- [ ] Karir function logs show:
  - [ ] "Initialized X active devices"
  - [ ] "Fetched XXX employees"
  - [ ] No "Missing required field" errors

- [ ] Kebijakan function logs show:
  - [ ] "Total karyawan: XXX"
  - [ ] "Complete. Sent: X/XXX"
  - [ ] No "Failed to fetch" errors

### Test 5: Cron Schedule Verification (1 minute)
- [ ] **Supabase Dashboard** → **Functions**
- [ ] Click `send-karir-notifications`
  - [ ] Status: **Active** (green)
  - [ ] Schedule: `0 1 1 * *` visible
  
- [ ] Click `send-kebijakan-notifications`
  - [ ] Status: **Active** (green)
  - [ ] Schedule: `0 13 16 * *` visible

---

## 🚨 Troubleshooting Test Failures

### Issue: "Missing required field: spreadsheetId"
```
Error: Missing required field: spreadsheetId
```

**Fix**:
1. Re-deploy functions:
   ```bash
   supabase functions deploy send-karir-notifications
   supabase functions deploy send-kebijakan-notifications
   ```
2. Wait 30 seconds
3. Test again

---

### Issue: "No Fonnte devices available"
```
Error: No Fonnte devices available
```

**Fix**:
1. Check Supabase Dashboard → Settings → Edge Functions → Secrets
2. Verify `FONNTE_DEVICE_TOKENS` secret exists and has non-empty value
3. If missing, create it with valid token JSON
4. Re-deploy functions
5. Test again

---

### Issue: No data returned from sheets
```
No data found in MASTER.ORGANIK
```

**Fix**:
1. Verify Google Sheet exists: https://docs.google.com/spreadsheets/d/1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM
2. Check sheet has data (not blank)
3. Verify sheet name is exactly `MASTER.ORGANIK`
4. Check Google service account has access (may need to add permissions)

---

### Issue: Messages not received on WhatsApp
```
Sent: 1 but no message on phone
```

**Possible fixes**:
1. Check Fonnte account has balance/quota
2. Verify phone number format (should be 628xxx)
3. Check WhatsApp is updated and internet active
4. Wait longer (up to 30 seconds for Fontre API)
5. Check phone is not in "Do Not Disturb" mode

---

## 📈 Success Criteria

All tests pass when:

✅ **Method 1 (Console)**
- Karir: `success: true` and `totalSent > 0`
- Kebijakan: `status: "success"` and `sent > 0`

✅ **Method 2 (Logs)**
- Both functions show successful execution logs
- No "Missing required field" or "No available devices" errors
- Employees fetched correctly

✅ **Method 3 (WhatsApp)**
- Messages received within 10 seconds
- Format and content correct
- Employee names personalized

✅ **Method 4 (Data)**
- Google Sheets data fetched successfully
- Phone numbers present and valid format
- All required columns found

✅ **Method 5 (Cron)**
- Functions show Active status
- Schedules visible in dashboard

---

## 📋 Test Report Template

Use this to document your test results:

```
Date: [DATE]
Tester: [NAME]

=== KARIR NOTIFICATIONS ===
Console Test: [ ] PASS [ ] FAIL
Error (if any): _______________
Function Logs: [ ] PASS [ ] FAIL
WhatsApp Message: [ ] RECEIVED [ ] NOT RECEIVED
Cron Schedule: [ ] ACTIVE [ ] INACTIVE

=== KEBIJAKAN NOTIFICATIONS ===
Console Test: [ ] PASS [ ] FAIL
Error (if any): _______________
Function Logs: [ ] PASS [ ] FAIL
WhatsApp Message: [ ] RECEIVED [ ] NOT RECEIVED
Cron Schedule: [ ] ACTIVE [ ] INACTIVE

=== OVERALL STATUS ===
[ ] ALL TESTS PASS - Ready for production
[ ] SOME TESTS FAIL - See issues above
[ ] ALL TESTS FAIL - Contact support

Notes: ____________________
```

---

## 🎓 Quick Testing Command

Copy-paste this into console to run all tests at once:

```javascript
const runAllTests = async () => {
  console.clear();
  console.log('🧪 Running comprehensive tests...\n');
  
  // Test 1: Karir
  console.log('Test 1: Karir Notifications');
  const karir = await supabase.functions.invoke('send-karir-notifications');
  console.log(karir.data?.success ? '✅ PASS' : '❌ FAIL', karir.data?.totalSent, 'messages sent\n');
  
  // Test 2: Kebijakan
  console.log('Test 2: Kebijakan Notifications');
  const kebijakan = await supabase.functions.invoke('send-kebijakan-notifications');
  console.log(kebijakan.data?.status === 'success' ? '✅ PASS' : '❌ FAIL', kebijakan.data?.sent, 'messages sent\n');
  
  // Test 3: Data
  console.log('Test 3: Google Sheets Data');
  const sheets = await supabase.functions.invoke('google-sheets', {
    body: {
      operation: 'read',
      spreadsheetId: '1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM',
      range: 'MASTER.ORGANIK'
    }
  });
  console.log(sheets.data?.data?.length ? '✅ PASS' : '❌ FAIL', sheets.data?.data?.length, 'rows\n');
  
  console.log('📊 Full results:', { karir: karir.data, kebijakan: kebijakan.data, sheets: sheets.data });
};

runAllTests();
```

---

## 💾 Next: Monitor Production

Setelah semua test lewat:

1. Monitor logs harian di Supabase Dashboard
2. Tunggu cron execution pada:
   - **1st of month, 08:00 WIB** → Karir notifications
   - **16th of month, 20:00 WIB** → Kebijakan notifications
3. Verify messages delivered to employees
4. Check function logs for any errors

---

**Need help?** Check function logs at: https://supabase.com/dashboard/project/yudlciokearepqzvgzxx/functions
