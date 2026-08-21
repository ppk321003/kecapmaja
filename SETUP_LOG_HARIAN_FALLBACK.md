# Fallback Write LOG_HARIAN

## Deploy Apps Script

1. Open Google Apps Script with an account that has edit access to both spreadsheets.
2. Create a standalone project and paste `APPS_SCRIPT_LOG_HARIAN_FALLBACK.gs`.
3. Deploy > New deployment > Web app.
4. Set `Execute as` to **Me** and `Who has access` to **Anyone with the link**.
5. Copy the `/exec` URL into `.env`:

```env
VITE_HARIAN_APPS_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

6. Restart Vite or rebuild the application after changing `.env`.

The endpoint is intentionally limited to `LOG_HARIAN` in the configured spreadsheet. It verifies `username` and the PPK role against the `user` sheet, validates the 11-column payload, and rejects non-PPK requests. Do not add passwords or service-account credentials to the frontend.

## Test

Open the deployed `/exec` URL in a browser. A JSON response containing `"ok":true` confirms the web app is reachable. Then log in as PPK and use **Rekam ke Harian**. The app will send the snapshot to Apps Script instead of Supabase when the URL is configured.

Because browser `sendBeacon` does not expose the server response, the UI confirms that the request was dispatched. Verify the new rows in `LOG_HARIAN` after the first test.
