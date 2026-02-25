# Fonnte WA Integration Setup Guide

## Overview
Integrated Fonnte WA API with device token rotation strategy into the `send-karir-notifications` Edge Function. This guide explains how to deploy and configure it.

## Prerequisites
- Access to Supabase project dashboard
- 5 Fonnte device tokens from your Fonnte account
- CLI access or Supabase web dashboard

## Step 1: Configure Fonnte Device Tokens in Supabase

### Option A: Via Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard → **Settings** → **Edge Functions** → **Secrets**
2. Click **Add New Secret**
3. Create secret named `FONNTE_DEVICE_TOKENS` with value (JSON array format):

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

> **Important**: Paste the entire JSON array as a single value. Supabase will store it as a string.

### Option B: Via Supabase CLI

```bash
# Store all tokens as environment variable
supabase secrets set FONNTE_DEVICE_TOKENS '[{"name":"KECAP MAJA-1","token":"GcrkkR51srYTi4KHanu5","active":true},...more tokens...]'
```

## Step 2: Deploy the Edge Function

### Via Supabase CLI:

```bash
# Deploy the function
supabase functions deploy send-karir-notifications

# Verify deployment
supabase functions list
```

### Via Supabase Dashboard:

1. Go to **Functions** → **send-karir-notifications**
2. Deploy using the UI deploy button
3. Verify the function is **Active** (green status)

## Step 3: Set Up Monthly Cron Trigger

The function is designed to be triggered automatically on the 1st of each month at 08:00 WIB.

### Method A: Using `supabase/config.toml` (Recommended)

Add to your `supabase/config.toml`:

```toml
[functions.send-karir-notifications]
verify_jwt = false

# Add cron schedule
[functions."send-karir-notifications"]
schedule = "0 8 1 * *"
```

Then redeploy:
```bash
supabase functions deploy send-karir-notifications
```

### Method B: Manual Scheduling via Supabase Dashboard

The Edge Function can also be triggered manually via Dashboard:

1. **Functions** → **send-karir-notifications** → **Invoke function**
2. This sends a test request

> **Note**: For production monthly scheduling, use the cron configuration above.

## Step 4: Verify Function Integration

### Test with Manual Invocation:

```javascript
// Run in browser console at your app
const { data, error } = await supabase.functions.invoke('send-karir-notifications');
console.log(data);
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2024-01-01T08:00:00Z",
  "totalEmployees": 250,
  "totalCandidates": 15,
  "totalSent": 14,
  "results": [
    {
      "nip": "19850315201001001",
      "nama": "Budi Santoso",
      "no_hp": "6281234567890",
      "type": "jabatan",
      "estimasi_bulan": 0,
      "sent": true,
      "device": "KECAP MAJA-1",
      "kebutuhan_ak": 40,
      "ak_sekarang": 42.5,
      "timestamp": "2024-01-01T08:00:00Z"
    }
  ]
}
```

## Device Rotation Strategy

The function automatically:

1. **Selects devices** based on weighted distribution (prefers less-used devices)
2. **Enforces cooldown** of 15 seconds between messages per device
3. **Respects rate limits**: 15 messages/hour, 40 messages/day per device
4. **Reties automatically**: Up to 2 retries with fallback delays (10s, then 20-90s random)
5. **Marks inactive devices**: Toggle `"active": false` to disable temporarily

## Environment Variables Used

| Variable | Type | Source | Description |
|----------|------|--------|-------------|
| `SUPABASE_URL` | String | Auto | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | String | Auto | Service role API key |
| `FONNTE_DEVICE_TOKENS` | JSON Array | Manual | Array of device tokens with name, token, active status |

## Monitoring & Logging

### Monitor Function Execution:

1. Go to **Functions** → **send-karir-notifications** → **Logs**
2. Most recent execution appears at top with:
   - Status (success/error)
   - Duration
   - Memory used
   - Console output

### Example Log Output:

```
[Karir Notifications] Starting execution...
[Fonnte] Initialized 5 active devices
[Karir Notifications] Fetching MASTER.ORGANIK data...
[Sheets] Fetched 250 employees
[Karir Notifications] Processing candidates...
[Fonnte] ✅ Sent via KECAP MAJA-1 to 6281234567890
[Fonnte] ✅ Sent via KECAP MAJA-3 to 6281234567891
[Karir Notifications] Complete. Sent: 14/15 dari 250 candidates
[Log] Results logged to NOTIF_LOG
```

## Troubleshooting

### Issue: "No FONNTE_DEVICE_TOKENS secret found"
**Solution**: Ensure secret is created in Supabase Settings → Edge Functions → Secrets

### Issue: "Initialized 0 active devices"
**Solution**: Check JSON format in secret - must be valid JSON array string

### Issue: "Failed to fetch MASTER.ORGANIK data"
**Solution**: 
- Verify `google-sheets` function exists and is deployed
- Check Google Sheets API credentials in secrets
- Verify sheet name exactly matches

### Issue: Messages not sending
**Solution**:
- Verify phone numbers in MASTER.ORGANIK kolom I are valid (start with 0 or 62)
- Check device tokens are valid in Fonnte dashboard
- Check Fonnte account has sufficient balance/quota
- Review function logs for rate limit errors (HTTP 429)

## Next Steps

1. **Test with sample data**: Export 5-10 rows from MASTER.ORGANIK and run calculation verification
2. **Monitor first execution**: Wait for 1st of next month or manually invoke test
3. **Review NOTIF_LOG sheet**: Check KECAP MAJA sends to track device distribution
4. **Adjust device tokens**: If a device fails, mark as `"active": false` and update secret

## Function Capabilities

✅ Fetches employee data from MASTER.ORGANIK  
✅ Calculates AK requirements with CPNS II/c exception (40 AK vs 60 AK)  
✅ Identifies employees within 3-month promotion window  
✅ Personalizes messages with name, current position, estimated timeline  
✅ Selects optimal Fonnte device with weighted distribution  
✅ Retries failed sends with exponential backoff  
✅ Respects Fonnte rate limits (15/hr, 40/day per device)  
✅ Logs all results to NOTIF_LOG sheet for audit trail  
✅ Returns detailed response with success/failure counts

## API Reference

### Edge Function Endpoint

```
POST /functions/v1/send-karir-notifications
```

No request body required. Function runs on cron schedule (1st of month, 08:00 WIB) or manual invocation.

### Response Format

```typescript
{
  success: boolean;
  timestamp: string;          // ISO 8601 timestamp
  totalEmployees: number;      // From MASTER.ORGANIK
  totalCandidates: number;      // Eligible for promotion
  totalSent: number;            // Successfully sent messages
  results: Array<{
    nip: string;
    nama: string;
    no_hp: string;
    type: string;               // 'jabatan' or 'pangkat'
    estimasi_bulan: number;
    sent: boolean;
    device: string | null;      // Device name used
    kebutuhan_ak: number;
    ak_sekarang: number;
    timestamp: string;
  }>;
}
```

---

**Last Updated**: January 2024  
**Maintained By**: [Your Team]  
**Status**: Production Ready
