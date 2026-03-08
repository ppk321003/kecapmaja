"""
HASIL VERIFIKASI CSV vs GAMBAR SPREADSHEET - DETAIL ANALYSIS
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
print("DETAIL INVESTIGATION: MENCARI KEGIATAN 2886 DI CSV")
print("=" * 150)

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Search untuk kegiatan 2886
print("\n1. MENCARI KEGIATAN 2886 DI CSV:")
print("-" * 150)

kegiatan_2886_found = False
periode_ini_col = 23

for idx, line in enumerate(lines):
    if '2886' in line:
        print(f"\nBaris {idx+1}: {line[:150]}")
        
        # Check if this is kegiatan header
        if re.search(r';GG\.2886;', line):
            kegiatan_2886_found = True
            parts = line.rstrip('\n').split(';')
            
            print(f"  ✅ Ditemukan kegiatan header")
            print(f"  Format: {line[:100]}")
            
            if periode_ini_col < len(parts):
                val_str = parts[periode_ini_col].strip()
                val = parse_number(val_str)
                print(f"  Kolom [23] Periode Ini: {val_str} = {val:,.0f}")

if not kegiatan_2886_found:
    print("  ❌ Kegiatan 2886 NOT FOUND sebagai kegiatan header")

# Search untuk "Dukungan Manajemen"
print(f"\n\n2. MENCARI TEKS 'Dukungan Manajemen' DI CSV:")
print("-" * 150)

dukungan_rows = []
for idx, line in enumerate(lines):
    if 'Dukungan Manajemen' in line or 'Dukungan' in line and 'Manajemen' in line:
        dukungan_rows.append((idx+1, line[:150]))
        print(f"Baris {idx+1}: {line[:150]}")

if not dukungan_rows:
    print("  ❌ Tidak ditemukan baris dengan 'Dukungan Manajemen'")

# Check apakah 2886 adalah bagian dari kegiatan lain (nested)
print(f"\n\n3. CEK STRUKTUR KEGIATAN DI CSV (lihat semua kegiatan yang ada):")
print("-" * 150)

kegiatan_found = set()
for idx, line in enumerate(lines):
    if idx < 8:  # Skip header
        continue
    
    # Look for kegiatan pattern: ;GG.NNNN;
    match = re.search(r';(GG)\.(\d{4});', line)
    if match:
        kegiatan_code = match.group(2)
        kegiatan_found.add(kegiatan_code)
        
        # Extract nilai periode ini
        parts = line.rstrip('\n').split(';')
        val = None
        if 23 < len(parts):
            val_str = parts[23].strip()
            val = parse_number(val_str)
        
        print(f"  Kegiatan {kegiatan_code}: Periode Ini = {val:,.0f}" if val else f"  Kegiatan {kegiatan_code}: (no value)")

print(f"\nTotal kegiatan yang ditemukan di CSV: {len(kegiatan_found)}")
print(f"Kegiatan yang ada: {sorted(kegiatan_found)}")

expected_kegiatan = set(['2896', '2897', '2898', '2899', '2900', '2901', '2902', '2903', '2904', '2905', '2906', '2907', '2908', '2909', '2910', '2886'])
missing = expected_kegiatan - kegiatan_found
extra = kegiatan_found - expected_kegiatan

if missing:
    print(f"\n❌ MISSING KEGIATAN: {sorted(missing)}")
    
    # For 2886, check if value appears elsewhere
    if '2886' in missing:
        print(f"\n  Kegiatan 2886 MISSING - cari value 349.103.414 (dari sheet)")
        for idx, line in enumerate(lines):
            if '349' in line and '103' in line:
                print(f"    Baris {idx+1}: {line[:150]}")

if extra:
    print(f"\n⚠️  EXTRA KEGIATAN DI CSV: {sorted(extra)}")

# Check total aggregates
print(f"\n\n4. HITUNG TOTAL DARI SETIAP KEGIATAN AGGREGATE:")
print("-" * 150)

kegiatan_totals = {}
for idx, line in enumerate(lines):
    if idx < 8:
        continue
    
    match = re.search(r';(GG)\.(\d{4});', line)
    if match:
        kegiatan_code = match.group(2)
        parts = line.rstrip('\n').split(';')
        
        val = None
        if 23 < len(parts):
            val_str = parts[23].strip()
            val = parse_number(val_str)
        
        if val and val > 0:
            if kegiatan_code not in kegiatan_totals:
                kegiatan_totals[kegiatan_code] = 0
            kegiatan_totals[kegiatan_code] += val

print(f"Kegiatan dengan nilai Periode Ini > 0:")
for keg in sorted(kegiatan_totals.keys()):
    print(f"  {keg}: {kegiatan_totals[keg]:>15,.0f}")

total_keg = sum(kegiatan_totals.values())
print(f"\nTotal dari kegiatan aggregates: {total_keg:>15,.0f}")
print(f"Dari sheet yang seharusnya:      {489218564:>15,.0f}")
print(f"Perbedaan:                        {abs(total_keg - 489218564):>15,.0f}")

# Check JUMLAH di CSV
print(f"\n\n5. VALUE DARI JUMLAH SELURUHNYA (Baris 9):")
print("-" * 150)

if len(lines) > 8:
    jumlah_line = lines[8].rstrip('\n').split(';')
    print(f"Total baris 9: {len(jumlah_line)} columns")
    
    if 23 < len(jumlah_line):
        jumlah_val_str = jumlah_line[23].strip()
        jumlah_val = parse_number(jumlah_val_str)
        print(f"Kolom [23] Periode Ini: {jumlah_val_str} = {jumlah_val:,.0f}")
        
        print(f"\nIni adalah nilai yang saya claim sebelumnya = 500.919.458")
        print(f"Tapi dari kegiatan aggregates hanya: {total_keg:,.0f}")
        print(f"Selisih: {abs(jumlah_val - total_keg):,.0f}")

print("\n" + "=" * 150)
print("KESIMPULAN:")
print("-" * 150)
print(f"""
1. Kegiatan 2886 TIDAK ADA SEBAGAI KEGIATAN HEADER di CSV
2. Nilai 349.103.414 untuk 2886 TIDAK TERCATAT di CSV
3. Total kegiatan di CSV hanya: 146.151.044
4. Total yang seharusnya (sheet): 489.218.564
5. JUMLAH SELURUHNYA di CSV menunjukkan: 500.919.458
   
MASALAH:
- Parsing kegiatan aggregate tidak mengambil semua kegiatan
- Atau kegiatan 2886 tidak ter-extract karena format berbeda
- Atau data 2886 ada di item-level, bukan aggregate-level

HYPOTHESIS:
Kegiatan 2886 mungkin ada di item-level (detail items) tapi tidak ada sebagai kegiatan aggregate header.
Jika demikian, kegiatan 2886 akan termasuk di "matched" items tapi tidak akan ter-filter sebagai kegiatan aggregate.
""")
