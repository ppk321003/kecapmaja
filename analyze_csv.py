import csv
import re

# Read the CSV file
csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

print("=" * 80)
print("ANALISIS CSV BAHAN REVISI ANGGARAN")
print("=" * 80)

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Analyze header structure
print("\n1. ANALISIS STRUKTUR HEADER:")
print("-" * 80)

for idx, line in enumerate(lines[6:9]):  # Baris 7, 8, 9 (index 6, 7, 8)
    parts = line.rstrip('\n').split(';')
    print(f"\nBaris {idx + 7} ({len(parts)} kolom):")
    for col_idx, part in enumerate(parts):
        if part.strip():
            print(f"  Col [{col_idx:2d}]: {part[:50]}")

# Analyze JUMLAH SELURUHNYA row
print("\n\n2. ANALISIS BARIS JUMLAH SELURUHNYA:")
print("-" * 80)

jumlah_line = None
for idx, line in enumerate(lines):
    if 'JUMLAH SELURUHNYA' in line:
        jumlah_line = line
        print(f"\nDitemukan di baris {idx + 1}")
        break

if jumlah_line:
    parts = jumlah_line.rstrip('\n').split(';')
    print(f"Total kolom: {len(parts)}")
    print("\nNilai-nilai di setiap kolom:")
    for col_idx, part in enumerate(parts):
        if part.strip() and re.search(r'\d', part):
            print(f"  Col [{col_idx:2d}]: {part}")

# Ekstrak nilai numerik
print("\n\n3. EKSTRAK NILAI NUMERIK (500.919.458 atau 489.218.564):")
print("-" * 80)

def extract_number(s):
    """Extract number dari string format Indonesia"""
    # Remove everything except digits, dots, and commas
    s = s.replace('.', '')  # Remove thousand separators (dots)
    s = s.replace(',', '.')  # Replace comma with dot for decimal
    try:
        return float(s)
    except:
        return None

if jumlah_line:
    parts = jumlah_line.rstrip('\n').split(';')
    target_values = [500919458, 489218564]  # Target values (no formatting)
    
    for col_idx, part in enumerate(parts):
        cleaned = part.strip()
        if cleaned and re.search(r'\d', cleaned):
            num = extract_number(cleaned)
            if num is not None:
                if num in target_values:
                    print(f"\nKOLOM [{col_idx:2d}] MATCH: {cleaned}")
                    print(f"             Nilai numerik: {num:,.0f}")
                elif abs(num - 500919458) < 1000 or abs(num - 489218564) < 1000:
                    print(f"\nKOLOM [{col_idx:2d}] DEKAT: {cleaned}")
                    print(f"                Nilai numerik: {num:,.0f}")

# Analyze item-level rows (non-summary)
print("\n\n4. ANALISIS BARIS ITEM-LEVEL (bukan summary):")
print("-" * 80)

item_rows = []
for idx, line in enumerate(lines):
    # Skip header/metadata rows
    if any(x in line for x in ['LAPORAN', 'Per Program', 'Periode ', 'Kementerian', 'Unit Organisasi', 'Satuan Kerja', 'Uraian;', '*Lock Pagu', '*SPM']):
        continue
    
    # Skip JUMLAH SELURUHNYA and other summary rows
    if 'JUMLAH' in line and not line.startswith(';'):
        continue
        
    # Check if this is a data row (starts with semicolons and contains activity/item data)
    if line.startswith(';') and idx > 8:  # After header
        parts = line.rstrip('\n').split(';')
        # Try to find numeric values related to our target numbers
        for col_idx, part in enumerate(parts):
            cleaned = part.strip()
            if cleaned and re.search(r'\d', cleaned):
                num = extract_number(cleaned)
                if num and abs(num - 500919458) < 1000:
                    print(f"\nBaris {idx + 1}: {line[:100]}")
                    print(f"Kolom [{col_idx}] nilai: {num:,.0f}")

print("\n\n5. HITUNG TOTAL PERIODE INI & SISA ANGGARAN:")
print("-" * 80)

# Tentukan struktur by analyzing pattern
periode_ini_col = None
sisa_anggaran_col = None

# From the header dan dari parser code: 
# Column 24 (index 23) = "Periode Ini"
# Column AE (index 30) = "SISA ANGGARAN"

# Scan baris header untuk confirm
for idx, line in enumerate(lines[6:9]):
    parts = line.split(';')
    for col_idx, part in enumerate(parts):
        if 'Periode Ini' in part:
            periode_ini_col = col_idx
            print(f"Periode Ini ditemukan di kolom [{col_idx}]")
        if 'SISA ANGGARAN' in part:
            sisa_anggaran_col = col_idx
            print(f"SISA ANGGARAN ditemukan di kolom [{col_idx}]")

# Sum all item rows
periode_ini_total = 0
sisa_anggaran_total = 0

for idx, line in enumerate(lines):
    # Skip header/metadata
    if idx < 8 or any(x in line for x in ['LAPORAN', 'Per Program', 'Periode ', 'Kementerian', 'Unit Organisasi', 'Satuan Kerja', 'Uraian;', '*Lock Pagu', '*SPM']):
        continue
    
    # Skip summary rows
    if 'JUMLAH' in line and not line.startswith(';'):
        continue
    
    if line.startswith(';') and not line.startswith(';;;'):
        parts = line.rstrip('\n').split(';')
        
        # Try standard columns from parser code
        if sisa_anggaran_col and sisa_anggaran_col < len(parts):
            num = extract_number(parts[sisa_anggaran_col].strip())
            if num:
                sisa_anggaran_total += num
        
        if periode_ini_col and periode_ini_col < len(parts):
            num = extract_number(parts[periode_ini_col].strip())
            if num:
                periode_ini_total += num

print(f"\nTerukur Periode Ini: {periode_ini_total:,.0f}")
print(f"Terukur Sisa Anggaran: {sisa_anggaran_total:,.0f}")
print(f"\nTarget CSV: 500.919.458")
print(f"Target Sheet: 489.218.564")
print(f"Selisih: {500919458 - 489218564:,.0f}")

print("\n" + "=" * 80)
