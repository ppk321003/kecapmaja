# Production Deployment Checklist

Use this checklist to deploy the Career Notifications system to production.

---

## 📋 Phase 1: Pre-Deployment Verification (Do this first)

### Code Quality

- [ ] Run lint check: `npm run lint`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] All files compile without errors

**Status Check:**
```bash
supabase functions validate
# Should show: ✓ send-karir-notifications
```

### Data Readiness

- [ ] MASTER.ORGANIK sheet populated with employee data
- [ ] Phone numbers in column I (TELEPON) are valid
- [ ] TMT_PNS and TMT_PANGKAT fields populated for CPNS detection
- [ ] Sample of 5-10 employee records verified

### Testing

- [ ] Ran `runKarierCalculationTest()` in browser console
- [ ] CPNS II/c exception verified (40 AK vs 60 AK)
- [ ] Test with actual employee data from MASTER.ORGANIK
- [ ] Results match expected outcomes

---

## 🔐 Phase 2: Supabase Configuration (10 minutes)

### Step 1: Gather Fonnte Tokens

- [ ] Log in to Fonnte dashboard
- [ ] Export 5 active device tokens and their names
- [ ] Verify each device has active status

**Record here:**
```
Device 1: KECAP MAJA-1 = GcrkkR51srYTi4KHanu5
Device 2: KECAP MAJA-2 = ewRtNykz8LxzMaiGoKRs
Device 3: KECAP MAJA-3 = atFkGTx9WDdhZkKNdEox
Device 4: KECAP MAJA-4 = DE3t6QzC88eLpqz1Tw1y
Device 5: KECAP MAJA-5 = Cy5Fwj5gbscfi8B97RDc (inactive)
```

### Step 2: Create Environment Secret

- [ ] Go to Supabase Dashboard
- [ ] Navigate to: Settings → Edge Functions → Secrets
- [ ] Click "New Secret"
- [ ] Name: `FONNTE_DEVICE_TOKENS`
- [ ] Value: (paste the full JSON array below)
- [ ] Save
- [ ] Verify it appears in secrets list (value hidden)

**JSON to Paste:**
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

### Step 3: Verify Secrets Created

```bash
supabase secrets list
```

Expected output:
```
FONNTE_DEVICE_TOKENS      | (value hidden)
SUPABASE_URL              | (value hidden)
SUPABASE_SERVICE_ROLE_KEY | (value hidden)
```

- [ ] All three secrets listed
- [ ] FONNTE_DEVICE_TOKENS visible

---

## 🚀 Phase 3: Deploy Edge Function (5 minutes)

### Step 1: Deploy via CLI

```bash
supabase functions deploy send-karir-notifications
```

Expected output:
```
✓ send-karir-notifications deployed successfully
```

- [ ] Deployment successful
- [ ] No errors shown

### Step 2: Verify Deployment in Dashboard

1. Open Supabase Dashboard
2. Navigate to: Functions → send-karir-notifications
3. Check status tab

- [ ] Status shows **Active** (green)
- [ ] "Last deployed" shows recent timestamp
- [ ] No error symbols

### Step 3: Test Manual Invocation

In browser console on your app:

```javascript
const { data, error } = await supabase.functions.invoke('send-karir-notifications');
console.log('Status:', data?.success);
console.log('Sent:', data?.totalSent);
console.log('Errors:', error);
```

- [ ] Response is `{ success: true, ... }`
- [ ] No error message appears
- [ ] totalSent > 0 (at least 1 message sent)

---

## ✉️ Phase 4: End-to-End Testing (10 minutes)

### Step 1: Verify WA Messages Received

After manual invocation, check your test phone:

- [ ] WA message received within 5 seconds
- [ ] Message format correct (with emojis and line breaks)
- [ ] Employee name personalized
- [ ] Contains link to `https://kecapmaja.app/KarierKu`

**Example message should look like:**
```
Halo [NAME], 👋

Kabar baik! Status kenaikan karir Anda:

📊 Posisi Saat Ini
Jabatan: [JABATAN]
Pangkat: [GOLONGAN]

✅ Anda SUDAH BISA mengajukan kenaikan!
...
```

### Step 2: Check NOTIF_LOG Sheet

1. Open Google Sheets - NOTIF_LOG
2. Look for most recent rows (with today's timestamp)
3. Verify entries show:

- [ ] TIMESTAMP: Recent time
- [ ] TIPE_NOTIF: "KARIR"
- [ ] STATUS: "SUCCESS"
- [ ] DEVICE: One of the 5 devices (KECAP MAJA-1, etc.)
- [ ] Multiple rows should show different devices (rotation working)

### Step 3: Review Function Logs

1. Supabase Dashboard → Functions → send-karir-notifications → Logs
2. Click most recent execution
3. Scroll through console output

Look for:

- [ ] `[Karir Notifications] Starting execution...`
- [ ] `[Fonnte] Initialized 5 active devices`
- [ ] `[Sheets] Fetched XXX employees`
- [ ] `[Karir Notifications] Processing candidates...`
- [ ] Multiple `[Fonnte] ✅ Sent via KECAP MAJA-X to 62...` lines
- [ ] `[Karir Notifications] Complete. Sent: X/X dari X candidates`
- [ ] No errors (red text)

---

## ⏰ Phase 5: Schedule Monthly Execution

### Option A: Dashboard Scheduling (Recommended)

1. Supabase Dashboard → Functions → send-karir-notifications
2. Click "Cron Jobs" tab
3. Click "New Job" or "Schedule"
4. Set:
   - Schedule: `0 1 1 * *` (1st of month, 01:00 UTC = 08:00 WIB)
   - Or use UI selector: "1st of every month at 8:00 AM"
5. Save and enable toggle

- [ ] Cron job created
- [ ] Toggle is **ON** (blue)
- [ ] Schedule shows: "1st of month at 08:00 WIB"

### Option B: CLI Configuration

Edit `supabase/config.toml`:

```toml
[functions."send-karir-notifications"]
verify_jwt = false
schedule = "0 1 1 * *"
```

Then redeploy:

```bash
supabase functions deploy send-karir-notifications
```

- [ ] config.toml updated
- [ ] Redployed successfully
- [ ] Cron shows in Function details

---

## 🔄 Phase 6: Load Testing (Optional but Recommended)

### Test with Larger Employee Set

If your organization has 200+ employees:

1. Export full MASTER.ORGANIK to JSON
2. Create test function invocation
3. Monitor for:
   - [ ] All messages sent within reasonable time (< 10 minutes)
   - [ ] Device rotation balanced across 5 devices
   - [ ] No rate limiting errors (HTTP 429)
   - [ ] All entries logged to NOTIF_LOG

### Performance Metrics to Verify

- [ ] <2 seconds per message
- [ ] <10% failure rate
- [ ] Device usage: 15-25% per device (balanced)
- [ ] No duplicate sends

---

## 🎯 Phase 7: Production Readiness Sign-Off

### Final Checklist

- [ ] Code deployed and active
- [ ] Fonnte tokens configured in secrets
- [ ] Manual invocation test passed
- [ ] WA message received successfully
- [ ] NOTIF_LOG populated with results
- [ ] Function logs show no errors
- [ ] Cron schedule configured
- [ ] Device rotation working
- [ ] Load test passed (if applicable)

### Authorization

- [ ] Manager approval obtained
- [ ] Data privacy verified (phone data secure)
- [ ] Fonnte account has sufficient balance
- [ ] Support contact assigned for monitoring

---

## 🚨 Phase 8: Go-Live Plan

### Day Before

- [ ] Set Slack/Teams reminder for first execution
- [ ] Notify PPK team that messages will be sent
- [ ] Prepare FAQ response about the messages

### 1st of Month, 07:55 WIB

- [ ] Open function logs in dashboard
- [ ] Have phone ready to receive test message
- [ ] Have NOTIF_LOG sheet open

### 1st of Month, 08:00 WIB

- [ ] Watch logs for "Starting execution..."
- [ ] Verify messages sent count in real-time
- [ ] Check if message received on phone

### 1st of Month, 08:10 WIB

- [ ] Verify NOTIF_LOG updated
- [ ] Check for any error logs
- [ ] Send status update to team

### Within 24 Hours

- [ ] Get feedback from sample employees
- [ ] Monitor for support requests
- [ ] Review device rotation balance
- [ ] Document any issues for iteration

---

## 📊 Post-Deployment Monitoring

### Weekly Check

- [ ] Logs reviewed for any errors
- [ ] Fonnte device status verified
- [ ] NOTIF_LOG sheet examined for patterns
- [ ] Employee feedback gathered

### Monthly (Right after execution)

- [ ] Full execution logs reviewed
- [ ] Message delivery rate calculated
- [ ] Device rotation balanced
- [ ] Performance metrics within SLA
- [ ] Database storage checked

### Quarterly

- [ ] Fonnte tokens refreshed if needed
- [ ] Rate limits reviewed for new scale
- [ ] Message templates updated if needed
- [ ] User feedback incorporated into improvements

---

## 🔧 Troubleshooting Quick Links

| Problem | Guide |
|---------|-------|
| Fonnte tokens not working | [FONNTE_QUICK_SETUP.md](./FONNTE_QUICK_SETUP.md) |
| WA not sending | [DEPLOYMENT_KARIR_NOTIFICATIONS.md](./DEPLOYMENT_KARIR_NOTIFICATIONS.md#troubleshooting) |
| Calculations wrong | [KARIR_TEST_GUIDE.md](./KARIR_TEST_GUIDE.md) |
| Device rotation issues | [FONNTE_INTEGRATION_SETUP.md](./FONNTE_INTEGRATION_SETUP.md#device-rotation-strategy) |
| Failed deployments | [KARIR_IMPLEMENTATION_COMPLETE.md](./KARIR_IMPLEMENTATION_COMPLETE.md#need-help) |

---

## ✅ Sign-Off

When everything is complete, fill this out:

```
Deployment Date: _______________
Deployed By: _______________
Testing Date: _______________
Tested By: _______________
Go-Live Date: _______________
Manager Approval: _____ (signature)
```

---

## 📞 Support Contacts

| Role | Name | Contact |
|------|------|---------|
| Deployment Lead | | |
| Technical Support | | |
| Business Owner | | |
| Fonnte Account Manager | | |

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Status:** Ready for Production  

---

## 📝 Notes for This Deployment

Use this space to record decisions and notes:

```
[CPNS II/c Exception]: Verified working (40 AK vs 60 AK)
[Device Tokens]: All 5 verified in Fonnte
[First Run Date]: 1st [MONTH] at 08:00 WIB
[Expected Recipients]: ~[NUMBER] employees
[Success Criteria]: >95% delivery rate
[Escalation Path]: [CONTACT] → [BACKUP CONTACT]
```

---

**Good luck with your deployment! 🚀**
