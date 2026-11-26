# Sitatan

Sitatan is the outgoing-letter registry under **Umum**. It is separate from the physical mail and disposition log at `/surat-disposisi`.

## Data source

- Spreadsheet: `31 - SURAT KELUAR`
- Letter rows: `DARI_WEB!A:AE`
- Archive hierarchy: `master_arsip!A:F`
- The archive `prefix` column carries OneGate's hierarchy indentation and is displayed before each classification code.
- Sitatan writes use Google Sheets `RAW` input so archive subcodes such as `001` retain leading zeros.
- Cancellation history: `status_naskah`, `alasan_pembatalan`, `dibatalkan_oleh`, and `dibatalkan_pada` in columns AB:AE.

The spreadsheet must be restricted to authorized users. The Google service account used by the `google-sheets` Supabase Edge Function also needs edit access. Do not put its credentials in frontend configuration.

When no signed Sitatan session is available and the spreadsheet is still public, the page reads it directly in read-only mode so archive choices remain visible. Saving, editing, and cancellation require the deployed Edge Function and a fresh login. Once the spreadsheet is private, reads also require the signed session.

## Numbering

Archive-classified letters share a serial sequence by year, archive code, and archive subcode, regardless of letter type. This prevents a repeated serial for the same archive classification while allowing the same serial for a different classification. Surat Keputusan and Laporan keep independent per-type sequences. Types configured for three-digit numbering pad the displayed serial to at least three digits. Before a number is appended to the Sheet, the backend reserves it under a database transaction lock, so concurrent users in the same series receive different serials. New reservations are kept in `sitatan_number_series_reservations`; older reservations remain in `sitatan_number_reservations`. Cancelled serials remain in the Sheet and are never reused. If a save fails after a reservation, that serial remains consumed.

| Jenis surat | Number format |
| --- | --- |
| Surat Keputusan | `{serial}` |
| Surat Perintah/Surat Tugas | `B-{serial padded to 3 digits}/3210/{kode}.{subkode}/{year}` |
| Surat Dinas | `B-{serial padded to 3 digits}/3210/{kode}.{subkode}/{year}` |
| Nota Dinas/Memorandum | `Nomor{serial}/3210/{kode}.{subkode}/{year}` |
| Surat Undangan Intern | `B-{serial padded to 3 digits}/3210/{kode}.{subkode}/{year}` |
| Surat Undangan Ekstern | `B-{serial padded to 3 digits}/3210/{kode}.{subkode}/{year}` |
| Surat Keterangan | `{serial padded to 3 digits}/3210/{kode}.{subkode}/{year}` |
| Surat Pengantar | `{serial padded to 3 digits}/3210/{kode}.{subkode}/{year}` |
| Laporan | `{serial padded to 3 digits}` |
| Formulir Permintaan | `B-{serial padded to 3 digits}/3210/{kode}.{subkode}/{year}` |

## Supabase function

Apply the database migration and deploy the updated `google-sheets` Edge Function before using Sitatan. The function issues a short-lived signed session for logged-in users belonging to Satker 3210, requires that session for reads and writes to the Sitatan spreadsheet, and reserves numbers atomically by archive classification:

```powershell
supabase db push
supabase functions deploy google-sheets
```

After deployment, users should sign out and back in once to receive a Sitatan session. The session signing key is read from the Supabase Edge Function environment; it is never sent to the browser.
