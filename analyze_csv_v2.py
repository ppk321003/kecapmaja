import csv
import re

# Read the CSV file
csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

print("\n" + "=" * 100)
print("IDENTIFIKASI MASALAH: CSV Upload Bulanan 500.919.458 vs Tercatat di Sheet 489.218.564")
print("=" * 100)

def parse_number(s):
    """Parse number format Indonesia ke float"""
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    # Remove thousand separators (dots) and replace comma with dot
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except:
        return None

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Baris 9 adalah JUMLAH SELURUHNYA  
print("\n1. STRUKTUR KOLOM CSV (dari baris header):")
print("-" * 100)

header1 = lines[6].rstrip('\n').split(';')
header2 = lines[7].rstrip('\n').split(';')

print(f"Baris 7 header (levels 1):")
for i, col in enumerate(header1[15:35]):
    if col.strip():
        print(f"  [{i+15}] {col}")

print(f"\nBaris 8 header (levels 2):")
for i, col in enumerate(header2[15:35]):
    if col.strip():
        print(f"  [{i+15}] {col}")

# Parse JUMLAH SELURUHNYA
jumlah_line = lines[8].rstrip('\n').split(';')

print(f"\n\n2. BARIS JUMLAH SELURUHNYA (Total Summary):")
print("-" * 100)
print(f"Nilai signifikan:")
for i in range(15, min(35, len(jumlah_line))):
    val = jumlah_line[i].strip()
    if val and re.search(r'\d', val):
        num = parse_number(val)
        print(f"  [{i}] {val:20s} = {num:15,.0f}" if num else f"  [{i}] {val}")

# Cari kolom "Periode Ini" (500.919.458) dan "SISA ANGGARAN"
print(f"\n\n3. LOKASI NILAI TARGET:")
print("-" * 100)

periode_ini_col = None
sisa_anggaran_col = None

for i, col in enumerate(header1):
    if 'SISA ANGGARAN' in col:
        sisa_anggaran_col = i
        print(f"✓ Column {i}: SISA ANGGARAN (header1)")

for i, col in enumerate(header2):
    if 'Periode Ini' in col:
        periode_ini_col = i
        print(f"✓ Column {i}: Periode Ini (header2)")

if periode_ini_col is not None:
    val = jumlah_line[periode_ini_col].strip() if periode_ini_col < len(jumlah_line) else ""
    num = parse_number(val)
    print(f"\nDi baris JUMLAH SELURUHNYA:")
    print(f"  Kolom [Periode Ini] = {val} = {num:,.0f}")

# Sekarang hitung detail items summing
print(f"\n\n4. KALKULASI DETAIL ITEMS:")
print("-" * 100)

periode_items = []
sisa_items = []

for idx, line in enumerate(lines):
    if idx < 8:  # Skip header
        continue
    
    # Skip metadata rows
    if any(x in line for x in ['LAPORAN', 'Per Program', 'JUMLAH', 'Periode ', 'Kementerian', 'Unit Organisasi', 'Satuan Kerja', 'Uraian;', '*Lock Pagu', '*SPM']):
        continue
    
    parts = line.rstrip('\n').split(';')
    
    # Collect detail item rows (bukan summary)
    # Summary rows biasanya dimulai dengan ";GG;" atau ";GG.xxxx;" (kegiatan level)
    # Detail items dimulai dengan banyak semicolon
    if parts[0] != '' or (len(parts) > 0 and parts[0].startswith(';')):
        if sisa_anggaran_col is not None and sisa_anggaran_col < len(parts):
            val = parts[sisa_anggaran_col].strip()
            if val:
                num = parse_number(val)
                if num is not None and num > 0:
                    sisa_items.append((idx, val, num))

periode_sum = sum([x[2] for x in periode_items])
sisa_sum = sum([x[2] for x in sisa_items])

print(f"Total items collected untuk Periode Ini: {len(periode_items)}")
print(f"Total items collected untuk Sisa Anggaran: {len(sisa_items)}")

if sisa_items:
    print(f"\nTop 10 values dari kolom Sisa Anggaran:")
    sorted_items = sorted(sisa_items, key=lambda x: x[2], reverse=True)[:10]
    for row, val, num in sorted_items:
        print(f"  Row {row}: {val:20s} = {num:15,.0f}")

print(f"\n\n5. ANALISIS PARSER CODE (Column Index):")
print("-" * 100)
print(f"Dari code parser:")
print(f"  - Column 24 (index 23) = 'Periode Ini' (untuk RPD items monthly values)")
print(f"  - Column AE (index 30) = 'SISA ANGGARAN' (untuk budget_items.sisa_anggaran)")
print(f"\nDari analisis header aktual:")
print(f"  - Column {periode_ini_col} = 'Periode Ini' actual")
print(f"  - Column {sisa_anggaran_col} = 'SISA ANGGARAN' actual")

if periode_ini_col != 23:
    print(f"\n⚠️ MISMATCH! Parser expects column 23 but 'Periode Ini' is at column {periode_ini_col}")
if sisa_anggaran_col != 30:
    print(f"⚠️ MISMATCH! Parser expects column 30 but 'SISA ANGGARAN' is at column {sisa_anggaran_col}")

# Summary
print(f"\n\n6. KESIMPULAN:")
print("-" * 100)
print(f"Nilai dari CSV (JUMLAH SELURUHNYA):")
if periode_ini_col is not None and periode_ini_col < len(jumlah_line):
    val = jumlah_line[periode_ini_col].strip()
    num = parse_number(val)
    print(f"  Periode Ini [col {periode_ini_col}]: {val} = {num:,.0f}")

expected_val = 500919458
sheet_val = 489218564
diff = expected_val - sheet_val

print(f"\nExpected (from CSV):  {expected_val:,.0f}")
print(f"Recorded (in sheet):  {sheet_val:,.0f}")
print(f"Difference:           {diff:,.0f} ({diff/expected_val*100:.2f}%)")

print("\n" + "=" * 100)
