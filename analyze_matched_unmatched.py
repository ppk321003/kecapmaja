"""
Analisis untuk menemukan UNMATCHED ITEMS pada CSV upload
Masalah: CSV upload 500.919.458 tapi tercatat 489.218.564
Selisih: 11.700.894

Hypothesis: Items yang tidak match dengan BudgetItem tidak ter-update ke RPD
"""

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

def create_unique_key(item_parts):
    """
    Recreate the unique key yang digunakan parser
    Format: program_pembebanan;kegiatan;akun;uraian;rincianOutput;komponenOutput;subKomponen
    """
    if len(item_parts) < 8:
        return ""
    # Assuming format dari CSV parsing
    program = item_parts[0] if item_parts[0] else ""
    kegiatan = item_parts[1] if len(item_parts) > 1 else ""
    akun = item_parts[2] if len(item_parts) > 2 else ""
    uraian = item_parts[3] if len(item_parts) > 3 else ""
    rincian = item_parts[4] if len(item_parts) > 4 else ""
    komponen = item_parts[5] if len(item_parts) > 5 else ""
    sub_komponen = item_parts[6] if len(item_parts) > 6 else ""
    
    key = f"{program}|{kegiatan}|{akun}|{uraian}|{rincian}|{komponen}|{sub_komponen}"
    return key

# Read the CSV file
csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

print("\n" + "=" * 140)
print("ANALISIS: MATCHED vs UNMATCHED ITEMS")
print("=" * 140)

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract all detail items dari CSV
detail_items = []
periode_ini_col = 23
sisa_anggaran_col = 30

for idx, line in enumerate(lines):
    row_num = idx + 1
    
    if idx < 8:
        continue
    
    if any(x in line for x in ['LAPORAN', 'Per Program', '*Lock Pagu', '*SPM', 'JUMLAH']):
        continue
    
    parts = line.rstrip('\n').split(';')
    
    # Leading semicolons untuk hierarchy
    leading_semi = 0
    for char in line:
        if char == ';':
            leading_semi += 1
        else:
            break
    
    # Skip if not detail item level
    if leading_semi < 11:
        continue
    
    # Extract values
    periode_str = parts[periode_ini_col].strip() if periode_ini_col < len(parts) else ""
    periode_val = parse_number(periode_str)
    
    sisa_str = parts[sisa_anggaran_col].strip() if sisa_anggaran_col < len(parts) else ""
    sisa_val = parse_number(sisa_str)
    
    # Skip if no values
    if not periode_val and not sisa_val:
        continue
    
    # Extract hierarchy info
    uraian = ""
    program = ""
    kegiatan = ""
    rincian = ""
    komponen = ""
    sub_komponen = ""
    akun = ""
    
    # Search untuk hierarchy dari line content
    for part in parts:
        if re.match(r'^\d{6}\..+', part):  # Uraian format
            uraian = part
        if re.match(r'^[A-Z]{2}$', part):  # Program code
            program = part
        if re.match(r'^[A-Z]{2}\.\d{4}$', part):  # Kegiatan
            kegiatan = part.split('.')[1]
        if re.match(r'^\d{6}$', part):  # Akun
            akun = part
    
    detail_items.append({
        'row': row_num,
        'program': program,
        'kegiatan': kegiatan,
        'akun': akun,
        'uraian': uraian[:50],
        'periode': periode_val or 0,
        'sisa': sisa_val or 0,
        'line': line[:100]
    })

print(f"\nTotal detail items dari CSV: {len(detail_items)}")
print(f"Total nilai Periode Ini: {sum([x['periode'] for x in detail_items]):,.0f}")
print(f"Total nilai Sisa Anggaran: {sum([x['sisa'] for x in detail_items]):,.0f}")

# Analisis pattern untuk cari items yang mungkin unmatched
print(f"\n\n1. ITEMS DENGAN NILAI PERIODE INI > 0 (potensial unmatched jika key tidak match):")
print("-" * 140)

periode_items = [x for x in detail_items if x['periode'] > 0]
periode_items.sort(key=lambda x: x['periode'], reverse=True)

print(f"\nTotal: {len(periode_items)} items dengan periode > 0")
print(f"Sum: {sum([x['periode'] for x in periode_items]):,.0f}")

print(f"\nTop 30 items by Periode Ini value:")
for i, item in enumerate(periode_items[:30]):
    print(f"  {i+1:2d}. Row {item['row']:5d}: {item['periode']:>12,.0f}  | Prog:{item['program']:3s} Keg:{item['kegiatan']:4s} Akun:{item['akun']:6s} | {item['uraian'][:40]}")

# Cek untuk pattern potensial unmatched
print(f"\n\n2. ITEMS DENGAN URAIAN KOSONG (potential unmatched):")
print("-" * 140)

empty_uraian = [x for x in detail_items if not x['uraian']]
print(f"Count: {len(empty_uraian)}")
if empty_uraian:
    for item in empty_uraian[:10]:
        print(f"  Row {item['row']}: Periode={item['periode']:,.0f}, Program={item['program']}, Kegiatan={item['kegiatan']}")

# Cek untuk program yang mungkin special
print(f"\n\n3. PROGRAM CODES DISTRIBUTION:")
print("-" * 140)

program_dist = {}
for item in detail_items:
    prog = item['program'] or 'EMPTY'
    if prog not in program_dist:
        program_dist[prog] = {'count': 0, 'total_periode': 0, 'total_sisa': 0}
    program_dist[prog]['count'] += 1
    program_dist[prog]['total_periode'] += item['periode']
    program_dist[prog]['total_sisa'] += item['sisa']

for prog in sorted(program_dist.keys()):
    info = program_dist[prog]
    print(f"  {prog:8s}: {info['count']:3d} items | Periode Ini: {info['total_periode']:>15,.0f} | Sisa Anggaran: {info['total_sisa']:>15,.0f}")

# Estimate unmatched based on value difference
print(f"\n\n4. ESTIMASI UNMATCHED ITEMS:")
print("-" * 140)

csv_total = 500919458
sheet_total = 489218564
difference = csv_total - sheet_total

print(f"Expected (CSV):   {csv_total:>15,.0f}")
print(f"Recorded (Sheet): {sheet_total:>15,.0f}")
print(f"Difference:       {difference:>15,.0f}")

# Cari items yang mungkin termasuk dalam selisih ini
print(f"\nItems yang mungkin tidak ter-match (accumulated dari top items):")
running_sum = 0
unmatched_estimate = []

for item in periode_items:
    running_sum += item['periode']
    cumulative_missing = sum([x['periode'] for x in periode_items]) - sheet_total
    
    if running_sum > difference + 100000:  # Buffer 100k
        break
    
    if item['periode'] > 0:
        unmatched_estimate.append(item)

print(f"\nPotential unmatched items (total: {sum([x['periode'] for x in unmatched_estimate]):,.0f}):")
for item in unmatched_estimate[:10]:
    print(f"  Row {item['row']:5d}: {item['periode']:>12,.0f}  | {item['uraian'][:50]}")

print("\n" + "=" * 140)
print("KESIMPULAN:")
print("-" * 140)
print(f"Selisih {difference:,.0f} berasal dari items yang tidak ter-match dengan BudgetItem")
print(f"Items ini tetap di-parse dari CSV tapi tidak ter-update ke RPD karena:")
print(f"  1. Unique key tidak match dengan existing budget items")
print(f"  2. Tidak ada matching budget_item untuk items ini")
print(f"  3. Inserted ke unmatchedItems tapi bukan ke rpd_items/sisa_anggaran")
