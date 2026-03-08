#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

print("\n" + "=" * 150)
print("COMPREHENSIVE PARSER SIMULATION: Extract ALL kegiatan with WA and GG support")
print("=" * 150 + "\n")

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def parse_number(s):
    if not s or not isinstance(s, str):
        return 0
    s = s.strip()
    s = s.replace('.', '').replace(',', '.')
    try:
        return float(s)
    except:
        return 0

# Simulate parser state
hierarchy = {
    'program': '',
    'programFull': '',
    'kegiatan': '',
    'kegiatanFull': '',
    'rincianOutputCode': '',
    'rincianOutput': '',
    'komponenOutputCode': '',
    'komponenOutput': '',
    'subKomponen': '',
    'akun': '',
}

kegiatan_aggregates = {}  # Store kegiatan-level data
extracted_items = []  # Store detail items

for i, line in enumerate(lines):
    if i < 8:  # Skip header
        continue
    
    row_num = i + 1
    
    # Skip JUMLAH rows
    if 'JUMLAH' in line.upper() and '000' not in line:
        continue
    
    # Count leading semicolons
    leading_semi = line.find(';') 
    if leading_semi == -1:
        continue
    
    # Count consecutive semicolons
    leading_count = 1
    while leading_count < len(line) and line[leading_count] == ';':
        leading_count += 1
    
    parts = line.rstrip('\n').split(';')
    first_field = parts[leading_count] if leading_count < len(parts) else ""
    
    # --- LEVEL 1: KEGIATAN or PROGRAM ---
    if leading_count == 1:
        # Check for kegiatan pattern (ANY program: GG, WA, etc.)
        if re.match(r'^[A-Z]{2}\.\d{4}$', first_field):
            # This is KEGIATAN level
            program_code = first_field.split('.')[0]
            kegiatan_num = first_field.split('.')[1]
            
            # Update hierarchy
            hierarchy['kegiatanFull'] = first_field
            hierarchy['program'] = program_code
            hierarchy['kegiatan'] = kegiatan_num
            hierarchy['programFull'] = program_code
            
            # Store kegiatan aggregate info
            periode_ini = parse_number(parts[23]) if len(parts) > 23 else 0
            
            key = f"{program_code}.{kegiatan_num}"
            kegiatan_aggregates[key] = {
                'row': row_num,
                'periode_ini': periode_ini,
                'detail_items': []
            }
            
            print(f"Row {row_num:5d}: KEGIATAN {first_field:<12} = {periode_ini:>15,.0f}")
        
        elif re.match(r'^[A-Z]{2}$', first_field):
            # This is PROGRAM level (pure program code)
            hierarchy['program'] = first_field
            hierarchy['kegiatan'] = ''
            hierarchy['programFull'] = first_field
            print(f"Row {row_num:5d}: PROGRAM  {first_field:<12}")
    
    # --- LEVEL 2/3/4/5/7: Sub-hierarchy (rincian, komponen, sub_komponen, akun) ---
    elif leading_count == 2 and first_field:
        # Rincian Output level
        if '.' in first_field:
            hierarchy['rincianOutputCode'] = first_field.split('.')[0]
            hierarchy['komponenOutputCode'] = first_field
        else:
            hierarchy['rincianOutputCode'] = first_field
    
    elif leading_count >= 11:
        # DETAIL ITEM level
        # Extract uraian
        uraian = ""
        for part in parts:
            if re.match(r'^\d{6,}\.', part) or re.match(r'^000\d{3}\.', part):
                # Found uraian
                uraian = part
                break
        
        if uraian and hierarchy['program'] and hierarchy['kegiatan']:
            # Extract values
            periode_ini = parse_number(parts[23]) if len(parts) > 23 else 0
            
            item = {
                'row': row_num,
                'program': hierarchy['programFull'],
                'kegiatan': hierarchy['kegiatan'],
                'uraian': uraian[:40],
                'periode_ini': periode_ini,
            }
            
            extracted_items.append(item)
            
            # Track for kegiatan
            key = f"{hierarchy['program']}.{hierarchy['kegiatan']}"
            if key in kegiatan_aggregates:
                kegiatan_aggregates[key]['detail_items'].append(item)

print("\n" + "=" * 150)
print("SUMMARY: Kegiatan Extraction Results")
print("=" * 150)

print(f"\n{'Kegiatan':<15} {'Program':<10} {'Source':<10} {'Periode Ini':<20} {'Detail Items':<15}")
print("-" * 70)

total_by_program = {}
for key in sorted(kegiatan_aggregates.keys()):
    data = kegiatan_aggregates[key]
    program = key.split('.')[0]
    kegiatan = key.split('.')[1]
    
    if program not in total_by_program:
        total_by_program[program] = {'count': 0, 'totalpperiode': 0}
    
    total_by_program[program]['count'] += 1
    total_by_program[program]['totalperiode'] = data['periode_ini']
    
    print(f"{key:<15} {program:<10} {'CSV':<10} {data['periode_ini']:>19,.0f} {len(data['detail_items']):>14d}")

print("\n" + "=" * 150)
print("BY PROGRAM:")
print("=" * 150)

for prog in sorted(total_by_program.keys()):
    count = total_by_program[prog]['count']
    print(f"  {prog}: {count} kegiatan extracted")

print(f"\nTotal kegiatan extracted: {len(kegiatan_aggregates)}")
print(f"Total detail items extracted: {len(extracted_items)}")

# Check specifically for WA.2886
print("\n" + "=" * 150)
print("SPECIFIC CHECK: WA.2886")
print("=" * 150)

if "WA.2886" in kegiatan_aggregates:
    print("\n[OK] WA.2886 FOUND in kegiatan aggregates")
    data = kegiatan_aggregates["WA.2886"]
    print(f"  Row: {data['row']}")
    print(f"  Periode Ini: {data['periode_ini']:,.0f}")
    print(f"  Detail items: {len(data['detail_items'])}")
    if data['detail_items']:
        print(f"  First 3 items:")
        for item in data['detail_items'][:3]:
            print(f"    - Row {item['row']}: {item['uraian']}")
else:
    print("\n[ERROR] WA.2886 NOT FOUND in kegiatan aggregates")
