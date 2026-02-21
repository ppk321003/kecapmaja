QA steps to validate Proyeksi Bulanan vs Ringkasan

1) Visual font/spacing check
- Open `BahanRevisiAnggaran` → tab `Ringkasan` and note the `Nama` column font and weight.
- Open `Proyeksi Bulanan` → choose any grouping subtab (e.g., `Program Pembebanan`).
- Confirm `Nama` column uses the same font classes (`text-xs font-mono`) and visual weight.
- Report any mismatches (font-size, font-family, font-weight, color).

2) Aggregation parity check (in-app)
- In `Proyeksi Bulanan` toolbar click `QA Compare`.
- The card will display:
  - `Total Budget (jumlah_menjadi)` — sum of `jumlah_menjadi` across current `BudgetItem` list (filtered by active filters and hide-zero setting).
  - `Total Proyeksi (RPD)` — sum of monthly RPD totals used in `Proyeksi` view.
  - `Selisih` — difference between the two totals.
- Expected: `Selisih` should be close to 0 for the same dataset; investigate differences by checking filters or source sheets.

3) Large dataset performance check
- Prepare a large `rpd_items` dataset (>>1000 rows) in the dev environment or mock via console.
- Open `Proyeksi Bulanan` and switch to a grouping table view.
- Confirm virtualization activates (renders within a scrollable area) and UI remains responsive.

4) Manual test notes
- If `QA Compare` shows a non-zero difference, verify:
  - Filters applied to both Ringkasan and Proyeksi are identical.
  - `hideZeroPagu` behavior may filter out zero-total items differently for RPD vs Budget items.
  - Check field names: (`jumlah_menjadi` in Budget vs `jan..dec` in RPD) and conversion errors.

5) Developer notes
- Exports: Excel uses SheetJS for `.xlsx`, PDF/JPEG use `html2canvas` + `jspdf`.
- Virtualization uses `react-window` and activates when rows &gt; 300.
- For automated tests, compare sums programmatically using `useBahanRevisiData` outputs.

6) Follow-up
- If differences persist, I can add a breakdown view showing top N differing codes (by program/kegiatan/akun).
