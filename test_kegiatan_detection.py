#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import re

csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

print("\n" + "=" * 150)
print("TEST: KEGIATAN DETECTION IN CSV")
print("=" * 150)

kegiatan_rows = {}

try:
    with open(csv_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Total lines in file: {len(lines)}")
    
    for i, line in enumerate(lines):
        row_num = i + 1
        
        # Check for kegiatan pattern: leading semicolon + kegiatan code
        if re.search(r'^;[A-Z]{2}\.\d{4};', line):
            # Extract program and kegiatan
            match = re.search(r'^;([A-Z]{2})\.(\d{4});', line)
            if match:
                program = match.group(1)
                kegiatan = match.group(2)
                
                # Get periode ini value (column 23)
                parts = line.rstrip('\n').split(';')
                periode_ini = parts[23] if len(parts) > 23 else ""
                
                key = f"{program}.{kegiatan}"
                
                if key not in kegiatan_rows:
                    kegiatan_rows[key] = {
                        'row': row_num,
                        'program': program,
                        'kegiatan': kegiatan,
                        'periode_ini': periode_ini
                    }
                    print(f"Found at Row {row_num:5d}: {key:<15} = {periode_ini}")
    
    print(f"\nTotal kegiatan found: {len(kegiatan_rows)}")
    
    # Separate by program
    programs = {}
    for key in kegiatan_rows:
        prog = kegiatan_rows[key]['program']
        if prog not in programs:
            programs[prog] = 0
        programs[prog] += 1
    
    print("\nBy program:")
    for prog in sorted(programs.keys()):
        print(f"  {prog}: {programs[prog]} kegiatan")
        
except FileNotFoundError as e:
    print(f"ERROR: File not found: {e}")
except Exception as e:
    print(f"ERROR: {e}")
