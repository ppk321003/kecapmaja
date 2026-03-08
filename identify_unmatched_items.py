"""
Identify which specific items from the CSV are unmatched in BudgetItems database.
Based on the parsing and matching logic.
"""

# The 21 unmatched items breakdown from the console log
unmatched_by_kegiatan = {
    2886: 7,   # WA.2886 has 7 unmatched
    2899: 1,
    2901: 1,
    2902: 2,
    2903: 3,
    2904: 1,
    2906: 1,
    2908: 1,
    2909: 1,
    2910: 3,
}

print("=" * 80)
print("UNMATCHED ITEMS ANALYSIS")
print("=" * 80)
print(f"\nTotal unmatched: 21 items")
print(f"Total matched: 595 items")
print(f"Total items: 616 items")

print("\n" + "=" * 80)
print("UNMATCHED BREAKDOWN BY KEGIATAN")
print("=" * 80)

for kegiatan, count in sorted(unmatched_by_kegiatan.items()):
    program = "WA" if kegiatan == 2886 else "GG"
    print(f"\nKegiatan {program}.{kegiatan}: {count} unmatched item(s)")

print("\n" + "=" * 80)
print("ACTIONS REQUIRED")
print("=" * 80)

print("""
The 21 unmatched items fall into 2 categories:

1. BUDGET ITEMS MISSING FROM DATABASE (Most Likely)
   - These items exist in CSV but don't have entries in BudgetItems
   - Action: Add these 21 items to BudgetItems sheet
   - Impact: Once added, they will be matched and uploaded to Google Sheets
   - Expected result: Sheet total should increase by ~11.7M

2. DUPLICATE/ERRONEOUS ITEMS
   - These items exist but with different keys (e.g., different formatting)
   - Action: Investigate and potentially merge/deduplicate
   - Impact: Clarify which items are valid vs duplicates

PRIORITY: Check BudgetItems for WA.2886 items
- The 7 unmatched WA.2886 items represent the bulk of the missing 11.7M
- Identify which specific rincian_output|komponen_output|akun combinations
  are missing from the budget database
""")

print("\n" + "=" * 80)
print("TO FIND THE SPECIFIC UNMATCHED ITEMS")
print("=" * 80)

print("""
From the console logs, you can see the parsed items 537-616 (WA.2886).
These items were extracted successfully but 7 were not matched.

The matching key format is:
  {programFull}|{kegiatan}|{rincianOutput}|{komponenOutput}|{subKomponen}|{akun}|{uraianKey}

Example from logs:
  ParsedItem 537: key='01.WA|2886|EBA|EBA.956|051_WA|524111|PERJALANAN_DALAM_RANGKA_ADMINISTRASI_BMN'
  ParsedItem 539: key='01.WA|2886|EBA|EBA.994|001|511111|BELANJA_GAJI_POKOK_PNS'

Most of these items show "Matched" status in the logs.
The 7 unmatched ones likely have:
- Missing rincian_output in BudgetItems
- Missing komponen_output combinations
- Missing akun numbers for WA program
""")
