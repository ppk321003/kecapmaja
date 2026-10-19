# Administrasi Meeting

- [x] Inspect and identify existing Google Sheets access: existing service-account secrets and google-sheets function; meeting spreadsheet read and metadata returned 200. No new Google connector required under the revised request.
- [ ] Implement meeting account authorization through Supabase and reuse existing server-side Google credentials; meeting data stays in Sheets. Verify write permission during acknowledged CRUD testing (not yet tested).
- [ ] Implement meeting identity, people Excel import and activity roles, unlimited classes, Fullboard accommodation and room assignment.
- [ ] Implement non-destructive Sheets initialization and acknowledged CRUD with stable IDs.
- [ ] Implement shared-source previews and all selected Excel/PDF documents.
- [ ] Verify real Google read/write/update/delete, package rules, rooms, classes, imports and exports; document setup and results.