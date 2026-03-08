#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv

# Read CSV and check what kegiatan are actually in hierarchy level (not detail items)
with open('Laporan Fa Detail (16 Segmen) (51).csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=';')
    kegiatan_rows = {}
    
    for i, row in enumerate(reader):
        if not row or len(row) < 2:
            continue
            
        leading_semicolons = 0
        for j, cell in enumerate(row):
            if cell == "":
                leading_semicolons += 1
            else:
                break
        
        # Check for kegiatan level (1 leading semicolon)
        if leading_semicolons == 1:
            first_field = row[leading_semicolons] if leading_semicolons < len(row) else ""
            
            # Check if matches program.kegiatan pattern (e.g., GG.2886, WA.2886)
            if '.' in first_field and len(first_field.split('.')) == 2:
                parts = first_field.split('.')
                if len(parts[0]) == 2 and parts[0].isalpha() and parts[1].isdigit():
                    program = parts[0]
                    kegiatan_num = parts[1]
                    
                    # Get value from column 23 (Periode Ini)
                    periode_ini = ""
                    if len(row) > 23:
                        periode_ini = row[23]
                    
                    key = f"{program}.{kegiatan_num}"
                    if key not in kegiatan_rows:
                        kegiatan_rows[key] = {
                            'row': i + 1,
                            'program': program,
                            'kegiatan': kegiatan_num,
                            'periode_ini': periode_ini
                        }

print("KEGIATAN FOUND IN CSV HIERARCHY LEVEL:")
print("=====================================")
print(f"{'Program':<10} {'Kegiatan':<10} {'Periode Ini':<20} {'Row':<8}")
print("-" * 50)

for key in sorted(kegiatan_rows.keys()):
    data = kegiatan_rows[key]
    print(f"{data['program']:<10} {data['kegiatan']:<10} {data['periode_ini']:<20} {data['row']:<8}")

print(f"\nTotal kegiatan found: {len(kegiatan_rows)}")

# Separate by program
programs = {}
for key in kegiatan_rows:
    prog = kegiatan_rows[key]['program']
    if prog not in programs:
        programs[prog] = []
    programs[prog].append(key)

print("\nBY PROGRAM:")
for prog in sorted(programs.keys()):
    print(f"  {prog}: {len(programs[prog])} kegiatan")
