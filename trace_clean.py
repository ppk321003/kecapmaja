"""
TRACE: Bagaimana parser seharusnya membaca kegiatan WA.2886
dan mengidentifikasi perbedaan 2903, 2910
"""

import re

def parse_number(s):
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except:
        return None

csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

print("\n" + "=" * 150)
print("TRACE: PARSER LOGIC UNTUK KEGIATAN WA.2886 DAN PERBEDAAN NILAI")
print("=" * 150)

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

period_ini_col = 23
sisa_col = 30

# 1. Lihat kegiatan 2886 dan detail itemnya
print(f"\n1. KEGIATAN 2886 (WA) - RAW DATA:")
print("-" * 150)

wa_2886_section = False
wa_2886_items = []

for idx, line in enumerate(lines):
    row_num = idx + 1
    
    # Check jika row ini kegiatan 2886 header
    if re.search(r';WA\.2886;', line):
        wa_2886_section = True
        print(f"\n[OK] FOUND Kegiatan Header - Row {row_num}:")
        print(f"   {line[:150]}")
        
        parts = line.rstrip('\n').split(';')
        periode_val = parse_number(parts[period_ini_col].strip()) if period_ini_col < len(parts) else None
        print(f"   Kolom [23] Periode Ini: {parts[period_ini_col].strip() if period_ini_col < len(parts) else 'N/A'} = {periode_val:,.0f}" if periode_val else "")
        
        kegiatan_2886_aggregate = periode_val
    
    # Collect items yang termasuk dalam 2886
    elif wa_2886_section:
        # Check jika ini masih bagian dari 2886 atau sudah pindah ke kegiatan lain
        if re.search(r';(GG|WA|AA|BB|CC|DD|EE|FF|HH|II|JJ|KK|LL|MM|NN|OO|PP|QQ|RR|SS|TT|UU|VV|XX|YY|ZZ)\.\d{4};', line):
            # Ini kegiatan baru, stop
            if not re.search(r';WA\.2886;', line):
                wa_2886_section = False
                print(f"\nEnd of WA.2886 section (row {row_num})")
                break
        
        # Skip empty/metadata rows
        if not line.strip() or any(x in line for x in ['*Lock', '*SPM', '=']):
            continue
        
        # This is item level (leading semicolons >= 11)
        leading_semi = 0
        for char in line:
            if char == ';':
                leading_semi += 1
            else:
                break
        
        if leading_semi >= 11:
            parts = line.rstrip('\n').split(';')
            periode_val = parse_number(parts[period_ini_col].strip()) if period_ini_col < len(parts) else None
            
            if periode_val and periode_val > 0:
                wa_2886_items.append({
                    'row': row_num,
                    'value': periode_val,
                    'line': line[:100]
                })

print(f"\nTotal detail items dalam WA.2886: {len(wa_2886_items)}")
if wa_2886_items:
    total_items = sum([x['value'] for x in wa_2886_items])
    print(f"Total dari detail items: {total_items:,.0f}")
    print(f"Kegiatan aggregate header: {kegiatan_2886_aggregate:,.0f}" if 'kegiatan_2886_aggregate' in locals() else "")
    match_status = "OK" if abs(total_items - kegiatan_2886_aggregate) < 1 else "NO" if 'kegiatan_2886_aggregate' in locals() else ""
    if match_status:
        print(f"Match: {match_status}")
    
    print(f"\nTop 5 items:")
    sorted_items = sorted(wa_2886_items, key=lambda x: x['value'], reverse=True)[:5]
    for item in sorted_items:
        print(f"  Row {item['row']}: {item['value']:>15,.0f}")

# 2. Lihat kegiatan 2903 dan perbedaannya
print(f"\n\n2. KEGIATAN 2903 - TRACE PERBEDAAN:")
print("-" * 150)

gg_2903_aggregate = None
gg_2903_items = []

for idx, line in enumerate(lines):
    row_num = idx + 1
    
    if re.search(r';GG\.2903;', line):
        # Kegiatan header
        parts = line.rstrip('\n').split(';')
        periode_val = parse_number(parts[period_ini_col].strip()) if period_ini_col < len(parts) else None
        gg_2903_aggregate = periode_val
        print(f"[OK] Kegiatan 2903 aggregate - Row {row_num}:")
        print(f"   Periode Ini: {parts[period_ini_col].strip() if period_ini_col < len(parts) else 'N/A'} = {periode_val:,.0f}" if periode_val else "")

# 3. Compare data dengan sheet
print(f"\n\n3. COMPARISON - CSV vs SHEET vs ITEM SUM:")
print("-" * 150)

sheet_values = {
    '2886': 349103414,
    '2896': 0,
    '2897': 0,
    '2898': 0,
    '2899': 594000,
    '2900': 0,
    '2901': 0,
    '2902': 4820894,
    '2903': 17901000,
    '2904': 16753000,
    '2905': 7019500,
    '2906': 40996000,
    '2907': 0,
    '2908': 2689660,
    '2909': 742000,
    '2910': 53175000,
}

csv_aggregate_values = {}

# Extract semua kegiatan aggregates dari CSV
for idx, line in enumerate(lines):
    match = re.search(r';(GG|WA|AA|BB|CC|DD|EE|FF|HH|II|JJ|KK|LL|MM|NN|OO|PP|QQ|RR|SS|TT|UU|VV|XX|YY|ZZ)\.(\d{4});', line)
    if match:
        program = match.group(1)
        kegiatan = match.group(2)
        
        parts = line.rstrip('\n').split(';')
        periode_val = parse_number(parts[period_ini_col].strip()) if period_ini_col < len(parts) else None
        
        key = f"{kegiatan}"
        if key not in csv_aggregate_values:
            csv_aggregate_values[key] = {
                'program': program,
                'value': periode_val or 0
            }

print(f"\nComparison:")
print(f"{'Keg':>5} {'Program':>8} {'Sheet':>15} {'CSV':>15} {'Diff':>12} {'Status':>15}")
print("-" * 75)

for kegiatan in sorted(sheet_values.keys()):
    sheet_val = sheet_values[kegiatan]
    if kegiatan in csv_aggregate_values:
        csv_val = csv_aggregate_values[kegiatan]['value']
        prog = csv_aggregate_values[kegiatan]['program']
        diff = csv_val - sheet_val
        status = "OK-MATCH" if abs(diff) < 1 else f"DIFF {diff:,.0f}"
        print(f"{kegiatan:>5} {prog:>8} {sheet_val:>15,.0f} {csv_val:>15,.0f} {diff:>12,.0f} {status:>15}")
    else:
        print(f"{kegiatan:>5} {'??':>8} {sheet_val:>15,.0f} {'MISSING':>15} {'N/A':>12} {'NOT-IN-CSV':>15}")

# 4. Hitung discrepancies
print(f"\n\n4. DISCREPANCY CALCULATION:")
print("-" * 150)

sheet_total = sum(sheet_values.values())
csv_total = sum([v['value'] for v in csv_aggregate_values.values()])

print(f"Sheet Total:                 {sheet_total:>15,.0f}")
print(f"CSV Total (aggregates):      {csv_total:>15,.0f}")
print(f"Difference:                  {abs(sheet_total - csv_total):>15,.0f}")

# Detail perbedaan per kegiatan
diff_details = {}
for kegiatan, sheet_val in sheet_values.items():
    if kegiatan in csv_aggregate_values:
        csv_val = csv_aggregate_values[kegiatan]['value']
        diff = csv_val - sheet_val
        if abs(diff) > 0:
            diff_details[kegiatan] = {
                'csv': csv_val,
                'sheet': sheet_val,
                'diff': diff
            }

print(f"\nKegiatan dengan perbedaan:")
for keg in sorted(diff_details.keys()):
    info = diff_details[keg]
    print(f"  {keg}: CSV {info['csv']:>15,.0f} vs Sheet {info['sheet']:>15,.0f} | Diff {info['diff']:>12,.0f}")

total_diff = sum([v['diff'] for v in diff_details.values()])
print(f"\nTotal perbedaan (dari aggregate): {abs(total_diff):>15,.0f}")

print("\n" + "=" * 150)
