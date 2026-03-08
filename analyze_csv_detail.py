import re

def parse_number(s):
    """Parse number format Indonesia ke float"""
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except:
        return None

# Read the CSV file
csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("\n" + "=" * 120)
print("ANALISIS DETAIL: ITEM-LEVEL vs AGGREGATE ROWS")
print("=" * 120)

# Determine structure
periode_ini_col = 23
sisa_anggaran_col = 30

# Categories to count
item_rows = []  # Baris item detail (starting with many semicolons)
aggregate_rows = []  # Baris aggregate (Program, Kegiatan, Output level)
skip_rows = []

total_periode_items = 0
total_sisa_items = 0
item_details = []

print(f"\n1. SCANNING ALL ROWS (starting from row 9):")
print("-" * 120)

for idx, line in enumerate(lines):
    row_num = idx + 1
    
    # Skip header
    if idx < 8:
        continue
    
    # Skip metadata
    if any(x in line for x in ['LAPORAN', 'Per Program', '*Lock Pagu', '*SPM']):
        skip_rows.append((row_num, "metadata"))
        continue
    
    parts = line.rstrip('\n').split(';')
    
    # Count leading semicolons to determine hierarchy
    leading_semi = 0
    for char in line:
        if char == ';':
            leading_semi += 1
        else:
            break
    
    # Determine row type
    row_type = None
    if leading_semi < 11:
        row_type = "aggregate"  # Program, Kegiatan, Output level
    else:
        row_type = "item"  # Detail item level
    
    # Extract values
    periode_val = None
    sisa_val = None
    
    if periode_ini_col < len(parts):
        periode_str = parts[periode_ini_col].strip()
        periode_val = parse_number(periode_str) if periode_str else None
    
    if sisa_anggaran_col < len(parts):
        sisa_str = parts[sisa_anggaran_col].strip()
        sisa_val = parse_number(sisa_str) if sisa_str else None
    
    # Skip rows with no numeric values
    if periode_val is None and sisa_val is None:
        skip_rows.append((row_num, "no_values"))
        continue
    
    # Categorize
    if row_type == "item":
        item_rows.append({
            'row': row_num,
            'periode': periode_val or 0,
            'sisa': sisa_val or 0,
            'line_preview': line[:80]
        })
        total_periode_items += (periode_val or 0)
        total_sisa_items += (sisa_val or 0)
        
        # Collect details if nilai > 100.000
        if periode_val and periode_val > 100000:
            item_details.append({
                'row': row_num,
                'periode': periode_val,
                'line_preview': line[:100]
            })
    else:
        aggregate_rows.append({
            'row': row_num,
            'periode': periode_val or 0,
            'sisa': sisa_val or 0,
            'line_preview': line[:80]
        })

print(f"\nItem rows (detail level):       {len(item_rows)}")
print(f"Aggregate rows:                 {len(aggregate_rows)}")
print(f"Skipped rows:                   {len(skip_rows)}")

print(f"\n\n2. TOTAL DARI ITEM ROWS vs SUMMARY ROW:")
print("-" * 120)

jumlah_line = lines[8].rstrip('\n').split(';')
jumlah_periode = parse_number(jumlah_line[periode_ini_col].strip()) if periode_ini_col < len(jumlah_line) else 0
jumlah_sisa = parse_number(jumlah_line[sisa_anggaran_col].strip()) if sisa_anggaran_col < len(jumlah_line) else 0

print(f"Total dari summing ITEM rows (detail level):")
print(f"  Periode Ini:  {total_periode_items:>15,.0f}")
print(f"  Sisa Anggaran: {total_sisa_items:>15,.0f}")

print(f"\nTotal dari JUMLAH SELURUHNYA summary row:")
print(f"  Periode Ini:  {jumlah_periode:>15,.0f}")
if jumlah_sisa:
    print(f"  Sisa Anggaran: {jumlah_sisa:>15,.0f}")
else:
    print(f"  Sisa Anggaran: (not found)")

print(f"\nTotal dari AGGREGATE rows (program/kegiatan/output level):")
agg_periode = sum([x['periode'] for x in aggregate_rows])
agg_sisa = sum([x['sisa'] for x in aggregate_rows])
print(f"  Periode Ini:  {agg_periode:>15,.0f}")
print(f"  Sisa Anggaran: {agg_sisa:>15,.0f}")

print(f"\n\nANALISIS:")
print(f"  Item total = {total_periode_items:,.0f}")
print(f"  Summary    = {jumlah_periode:,.0f}")
print(f"  Difference = {abs(total_periode_items - jumlah_periode):,.0f}")

if abs(total_periode_items - jumlah_periode) > 100:
    print(f"  ⚠️ ITEM SUM TIDAK MATCH DENGAN SUMMARY!")

print(f"\n\n3. TOP ITEMS DENGAN NILAI > 100.000:")
print("-" * 120)

sorted_items = sorted(item_details, key=lambda x: x['periode'], reverse=True)[:15]
running_sum = 0
for item in sorted_items:
    running_sum += item['periode']
    print(f"Row {item['row']:4d}: {item['periode']:>15,.0f}  (running sum: {running_sum:>15,.0f})")
    print(f"       {item['line_preview']}")

print(f"\n\n4. POTENTIAL ISSUE ANALYSIS:")
print("-" * 120)

# Cek apakah ada "JUMLAH" rows yang juga di-sum
jumlah_rows = []
for idx, line in enumerate(lines):
    if 'JUMLAH' in line and idx >= 8:
        parts = line.rstrip('\n').split(';')
        periode_str = parts[periode_ini_col].strip() if periode_ini_col < len(parts) else ""
        periode_val = parse_number(periode_str) if periode_str else None
        if periode_val and periode_val > 0:
            jumlah_rows.append({
                'row': idx + 1,
                'value': periode_val,
                'line': line[:100]
            })

if jumlah_rows:
    print(f"\nDitemukan {len(jumlah_rows)} baris 'JUMLAH' dengan nilai > 0:")
    for j in jumlah_rows:
        print(f"  Row {j['row']}: {j['value']:>15,.0f}")
        print(f"  {j['line']}")

# Cek apakah ada lock pagu rows
lock_rows = []
for idx, line in enumerate(lines):
    if '*Lock Pagu' in line and idx >= 8:
        lock_rows.append(idx + 1)

if lock_rows:
    print(f"\nDitemukan {len(lock_rows)} baris '*Lock Pagu'")

print("\n" + "=" * 120)

# HYPOTHESIS
print("\nHYPOTHESIS TENTANG SELISIH 11.700.894:")
print("-" * 120)
print(f"\n1. Apakah parser code SKIP beberapa items karena matching gagal?")
print(f"   - Lihat 'not_matched_items' log saat import")
print(f"\n2. Apakah ada items dengan status 'baru' yang tidak ter-update ke RPD?")
print(f"   - Nilai 489.218.564 = 500.919.458 - 11.700.894")
print(f"   - Artinya, 11.700.894 NIL tidak ter-update")
print(f"\n3. Apakah ada duplicate atau rows yang di-skip di server side?")
print(f"   - Update ke sisa_anggaran di budget_items menggunakan matched_items")
print(f"   - Tapi ada juga unmatchedItems yang di-insert terpisah")
print(f"\n\nFOKUS INVESTIGASI:")
print(f"- Lihat di hook use-import-monthly-csv.ts di mana unmatched items ditangani")
print(f"- Hitung total dari matched_items saja (tidak termasuk unmatched)")
print(f"- Cari log untuk Februari 2026 untuk melihat berapa banyak items yang unmatched")
