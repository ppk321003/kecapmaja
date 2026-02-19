# Deployment Guide for Google Sheets Edge Function

## Current Status
- ✅ Code fixed and built successfully
- ❌ Deployment blocked by CORS/authentication issues
- ⏳ Waiting for Supabase authentication setup

## What Was Fixed
1. **Brace Structure**: Fixed indentation and closing braces in the try-catch block
2. **Error Handling**: Added early validation of Google credentials with proper CORS responses
3. **Syntax**: All TypeScript compilation errors resolved

## Prerequisites for Deployment

### 1. Supabase Access Token
You need a valid Supabase access token to deploy the function:

**Format**: `sbp_0102...1920` (starts with `sbp_`)

**Where to Find It**:
- Go to Supabase Dashboard: https://app.supabase.com
- Settings → Access Tokens → Personal
- Create a new token or copy existing one

### 2. Google Service Account Credentials
The function requires Google credentials to authenticate with Google Sheets API:

**Steps to Set Up**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a service account (or use existing)
3. Download the JSON key file
4. Set environment variables in Supabase:
   - Copy the `private_key` field value → `GOOGLE_PRIVATE_KEY`
   - Copy the `client_email` field value → `GOOGLE_SERVICE_ACCOUNT_EMAIL`

**Supabase Setup**:
- Go to Project Settings → Edge Functions → Secrets
- Add variable: `GOOGLE_PRIVATE_KEY`
- Add variable: `GOOGLE_SERVICE_ACCOUNT_EMAIL`

## Deployment Steps

### Option 1: Using Supabase CLI (Recommended)

```powershell
# Set the access token
$env:SUPABASE_ACCESS_TOKEN='sbp_your_token_here'

# Navigate to project
cd e:\kecapmaja-main

# Deploy the function
npx supabase functions deploy google-sheets --project-ref yudlciokearepqzvgzxx

# If successful, you should see:
# ✓ Function deployed successfully
```

### Option 2: Using Supabase Dashboard (Web UI)

1. Go to https://app.supabase.com
2. Select project: `yudlciokearepqzvgzxx`
3. Functions → google-sheets
4. Upload the new code from `supabase/functions/google-sheets/index.ts`
5. Save and deploy

### Option 3: Using GitHub Actions (if configured)

If your repo has GitHub Actions configured for Supabase deployments, simply push to the main branch and the action will handle deployment automatically.

## Verification After Deployment

### 1. Check Function Logs
```powershell
npx supabase functions logs google-sheets --project-ref yudlciokearepqzvgzxx
```

### 2. Test the Function Endpoint
The function should be accessible at:
```
https://yudlciokearepqzvgzxx.supabase.co/functions/v1/google-sheets
```

### 3. Test with Sample Request
```bash
curl -X POST https://yudlciokearepqzvgzxx.supabase.co/functions/v1/google-sheets \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "your_spreadsheet_id",
    "operation": "read",
    "range": "Sheet1"
  }'
```

## If Deployment Fails

### Common Issues and Solutions

**Issue**: `Invalid access token format`
- **Solution**: Ensure token starts with `sbp_` and has correct format

**Issue**: `Missing required environment variables`
- **Solution**: Add `GOOGLE_PRIVATE_KEY` and `GOOGLE_SERVICE_ACCOUNT_EMAIL` to Supabase Secrets

**Issue**: `CORS error on client side`
- **Solution**: This means function is deployed but returning an error. Check function logs for details.

**Issue**: `Deployment fails with parser error`
- **Solution**: Try running `npm run build` locally to verify TypeScript compilation

## Recent Commits
- `4ca5ddd` - Add early environment variable validation
- `a54130c` - Correct indentation of catch block  
- `b063a14` - Add missing closing brace for if block

## Next Steps
1. Obtain Supabase access token
2. Verify Google Service Account credentials are set in Supabase
3. Run one of the deployment options above
4. Verify function is working by checking logs and testing an endpoint call

## Support
If you encounter issues:
1. Check function logs: `npx supabase functions logs google-sheets --project-ref yudlciokearepqzvgzxx --tail`
2. Verify credentials are correctly set in Supabase Secrets
3. Ensure `npm run build` passes locally
4. Check that OPTIONS method returns 200 status code

