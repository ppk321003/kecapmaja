#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

print("\n" + "=" * 150)
print("SIMULATE PARSER LOGIC: Check WA.2886 at Row 961")
print("=" * 150 + "\n")

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check rows around WA.2886 (Row 961)
print("ROWS 955-970 (WA.2886 is at Row 961):\n")
print(f"{'Row':<6} {'Leading ;':<10} {'First Field':<20} {'Value (Col 23)':<20} {'Level':<15}")
print("-" * 80)

for i in range(954, min(970, len(lines))):
    row_num = i + 1
    line = lines[i]
    
    # Count leading semicolons
    leading_semicolons = 0
    for char in line:
        if char == ';':
            leading_semicolons += 1
        else:
            break
    
    # Get first field after semicolons
    parts = line.rstrip('\n').split(';')
    first_field = parts[leading_semicolons] if leading_semicolons < len(parts) else ""
    
    # Get value from column 23
    periode_ini = parts[23] if len(parts) > 23 else ""
    
    # Determine level
    level_desc = "???"
    if leading_semicolons == 1 and re.match(r'^[A-Z]{2}(\.[0-9]{4})?$', first_field):
        if '.' in first_field and len(first_field.split('.')) == 2:
            level_desc = "KEGIATAN"
        else:
            level_desc = "PROGRAM"
    elif leading_semicolons >= 11:
        level_desc = "DETAIL ITEM"
    
    print(f"{row_num:<6} {leading_semicolons:<10} {first_field:<20} {periode_ini:<20} {level_desc:<15}")

print("\n" + "=" * 150)
print("KEY FINDING: Is WA.2886 at Row 961 being detected as KEGIATAN level?")
print("=" * 150)

# Specifically check WA.2886
line_961 = lines[960]  # 0-indexed
parts_961 = line_961.rstrip('\n').split(';')
leading_961 = 0
for char in line_961:
    if char == ';':
        leading_961 += 1
    else:
        break

first_field_961 = parts_961[leading_961] if leading_961 < len(parts_961) else ""

print(f"\nRow 961 Analysis:")
print(f"  Raw line start: {line_961[:100]}")
print(f"  Leading semicolons: {leading_961}")
print(f"  First field: '{first_field_961}'")
print(f"  Matches regex /^[A-Z]{{2}}\\.[0-9]{{4}}$/: {bool(re.match(r'^[A-Z]{2}\.\d{4}$', first_field_961))}")
print(f"  Period Ini (Col 23): {parts_961[23] if len(parts_961) > 23 else 'N/A'}")
print(f"  Total parts in row: {len(parts_961)}")

# Now check if parser would extract this
if leading_961 == 1 and re.match(r'^[A-Z]{2}\.\d{4}$', first_field_961):
    print(f"\n  >> PARSER SHOULD EXTRACT THIS AS KEGIATAN: {first_field_961}")
    program = first_field_961.split('.')[0]
    kegiatan = first_field_961.split('.')[1]
    print(f"     - Program: {program}")
    print(f"     - Kegiatan: {kegiatan}")
else:
    print(f"\n  >> PARSER WOULD SKIP THIS (Hierarchy check failed)")
    print(f"     - Leading semicolons == 1: {leading_961 == 1}")
    print(f"     - Matches kegiatan pattern: {bool(re.match(r'^[A-Z]{2}\.\d{4}$', first_field_961))}")
