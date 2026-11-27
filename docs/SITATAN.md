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

## Surat Sisip dates

The Surat Sisip option is available for all ten letter types. When enabled, the letter date can be selected from January 1 of the current numbering year through today; otherwise, a new letter uses today's date. Editing a non-insert letter preserves its saved date. Number reservations continue to use the current year.

## Surat Keputusan generator

Surat Keputusan keeps its official number and registry status in `DARI_WEB`; no new `DARI_WEB` columns are added. Its detailed form data is written to the configured `SuratKeputusan` generator tab so the existing Apps Script can create the document. Activity/budget/price/unit details appear first. An activity already selected in another row is excluded from that row's master choices, and duplicate activity names cannot be saved. Tentang is generated from the activity names (joined with `dan` for two names and a comma before `dan` for three or more), with the standalone word `Honor` removed, and updates when activity names change. Menimbang Kesatu and Kedua are required; both are generated from Tentang, remain editable, and preserve manual edits when the source text changes. Existing records without Menimbang Kedua are initialized with the generated clause when opened. Menimbang Ketiga and Keempat are optional and added on demand; removing either closes the gap by shifting later clauses up. Activity choices show only the activity name, and Memutuskan Kesatu is generated and saved in uppercase. Tanggal SK must be earlier than Tanggal Mulai. At least one person must be selected across Organik and Mitra Statistik, and Pembuat Daftar must be selected separately. It does not calculate honor per person.

The generator row maps the three-digit SiTaTaN number to `no_sk` (column C) as text, keeps the generator ID in B, and stores the SiTaTaN record ID in R (`id_sitatan`). Activity rows are separated with `;`, while Organik and Mitra Statistik names are separated with ` | `. P is left blank for the script to process; the script sets P to `Generated` and writes the document URL to Q (`Link`). The list shows a link to the generated document in the action column when available. The action-column download icon for Surat Keputusan exports a `.docx` directly from the Google Docs URL in Q and is disabled until that URL is available. The app only adds the R header when R1 and the rest of column R are empty. Editing a linked SK clears P and Q so the generator can process the updated details again; the script creates a new Drive copy and does not delete the previous one.

## Template downloads

- The action column offers a `.docx` download for each type with a configured Google Docs template. Formulir Permintaan displays **Gunakan BOS** instead.
- Downloads use the saved row's number and date, plus its available body, destination, date range, subject, recipient, and nature fields. Every occurrence of a supported placeholder is replaced; the source Google Doc is not modified.
- Supported placeholders are `<<Nomor>>`, `<<Tanggal>>`, `<<isi_surat>>`, `<<tempat_tujuan>>`, `<<tanggal_mulai>>`, `<<tanggal_selesai>>`, `<<perihal>>`, `<<kepada>>`, and `<<sifat>>`.
- The configured Google Docs links must remain accessible through their sharing links for the Edge Function to export them as `.docx`.

## Supabase function

Apply the database migration and deploy the updated `google-sheets` Edge Function before using Sitatan. The function issues a short-lived signed session for logged-in users belonging to Satker 3210, requires that session for reads and writes to the Sitatan spreadsheet, and reserves numbers atomically by archive classification:

```powershell
supabase db push
supabase functions deploy google-sheets
```

After deployment, users should sign out and back in once to receive a Sitatan session. The session signing key is read from the Supabase Edge Function environment; it is never sent to the browser.
