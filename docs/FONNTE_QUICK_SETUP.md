# Fonnte Device Token Quick Setup (5 minutes)

## What You Need

1. **Fonnte account** with active devices
2. **5 device tokens** (obtain from Fonnte → Devices → Token)
3. **Supabase project** access

## Format (Required)

The `FONNTE_DEVICE_TOKENS` secret must be valid JSON:

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

**Rules:**
- Each object has: `name`, `token`, `active`
- `active`: `true` = device used, `false` = device skipped
- All 5 should be listed (only active ones used)
- JSON must be valid (no trailing commas)

## Steps

### 1️⃣ Get Fonnte Tokens

```
1. Log in to Fonnte Dashboard
2. Go to Devices / Connected Devices
3. For each device, copy the Token value
4. Note the Device Name (e.g., "KECAP MAJA-1")
```

### 2️⃣ Format as JSON

Create the JSON array above with your actual tokens.

**Test it's valid JSON:**
```javascript
// In browser console
JSON.parse('[{"name":"...","token":"...","active":true}]');
// Should return array, not error
```

### 3️⃣ Create Supabase Secret

**Via Dashboard:**
1. Open Supabase Project
2. **Settings** → **Edge Functions** → **Secrets**
3. **New Secret**
4. **Name:** `FONNTE_DEVICE_TOKENS`
5. **Value:** Paste your JSON array
6. **Save**

**Via CLI:**
```bash
supabase secrets set FONNTE_DEVICE_TOKENS '[{"name":"KECAP MAJA-1","token":"GcrkkR51srYTi4KHanu5","active":true},...more...]'
```

### 4️⃣ Verify

```bash
# List secrets to confirm
supabase secrets list

# Should show:
# FONNTE_DEVICE_TOKENS | (value hidden)
```

### 5️⃣ Deploy Function

```bash
supabase functions deploy send-karir-notifications
```

Done! ✅

## Rate Limits (Automatic)

- **Per Device:** 15 per hour, 40 per day
- **Cooldown:** 15 seconds between sends
- **Retry:** Auto-retry max 2 times if rate-limited

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `SyntaxError: Unexpected token` | Invalid JSON | Use JSON formatter to validate |
| `No active devices found` | `"active": false` for all | Set at least one to `true` |
| `FONNTE_DEVICE_TOKENS is undefined` | Secret not created | Create in Supabase Settings |
| `Failed to send via Fonnte` | Invalid token | Verify token in Fonnte dashboard |

## Check It's Working

```javascript
// In browser console after deployment
const result = await supabase.functions.invoke('send-karir-notifications');
console.log(result);

// Look for message like:
// [Fonnte] ✅ Sent via KECAP MAJA-1 to 628123...
```

## Disable a Device Temporarily

If a device has issues, disable it:

1. Change `"active": false` for that device
2. Update the secret in Supabase
3. Redeploy function

The function will skip disabled devices automatically.

---

⏱️ **Setup Time:** ~5 minutes  
🔧 **Maintenance:** Check quarterly if tokens need refresh  
