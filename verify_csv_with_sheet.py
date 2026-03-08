"""
VERIFIKASI CSV FEBRUARI dengan GAMBAR SPREADSHEET
Membandingkan nilai Februari yang ada di CSV dengan Sheet yang ditampilkan di gambar
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

# Data dari GAMBAR (screenshot spreadsheet)
sheet_data = {
    '2896': {'name': 'Pengembangan dan Analisis Statistik', 'total_pagu': 170000, 'feb': 0},
    '2897': {'name': 'Pelayanan dan Pengembangan Diseminasi Informasi Statistik', 'total_pagu': 3040000, 'feb': 0},
    '2898': {'name': 'Penyediaan dan Pengembangan Statistik Neraca Pengeluaran', 'total_pagu': 17579000, 'feb': 0},
    '2899': {'name': 'Penyediaan dan Pengembangan Statistik Neraca Produksi', 'total_pagu': 19227000, 'feb': 594000},
    '2900': {'name': 'Pengembangan Metodologi Sensus dan Survei', 'total_pagu': 1085000, 'feb': 0},
    '2901': {'name': 'Pengembangan Sistem Informasi Statistik', 'total_pagu': 7945000, 'feb': 0},
    '2902': {'name': 'Penyediaan dan Pengembangan Statistik Distribusi', 'total_pagu': 5099775000, 'feb': 4820894},
    '2903': {'name': 'Penyediaan dan Pengembangan Statistik Harga', 'total_pagu': 488736000, 'feb': 17901000},
    '2904': {'name': 'Penyediaan dan Pengembangan Statistik Industri, Pertambangan dan Penggalian, Energi, dan Konstruksi', 'total_pagu': 198667000, 'feb': 16753000},
    '2905': {'name': 'Penyediaan dan Pengembangan Statistik Keperdataan dan Kependudukan', 'total_pagu': 120389000, 'feb': 7019500},
    '2906': {'name': 'Penyediaan dan Pengembangan Statistik Kesejahteraan Rakyat', 'total_pagu': 546623000, 'feb': 40996000},
    '2907': {'name': 'Penyediaan dan Pengembangan Statistik Keamanan Sosial', 'total_pagu': 79152000, 'feb': 0},
    '2908': {'name': 'Penyediaan dan Pengembangan Statistik Keuangan, Teknologi Informasi, dan Pariwisata', 'total_pagu': 55523000, 'feb': 2689660},
    '2909': {'name': 'Penyediaan dan Pengembangan Statistik Perikanan, Perikananan, dan Kehutanan', 'total_pagu': 25349000, 'feb': 742000},
    '2910': {'name': 'Penyediaan dan Pengembangan Statistik Tenaga Kerja, Infrastruktur, dan Pertahanan', 'total_pagu': 525901000, 'feb': 53175000},
    '2886': {'name': 'Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya BPS Provinsi', 'total_pagu': 7128168000, 'feb': 349103414},
}

sheet_total_pagu = 18817720000
sheet_feb_total = 489218564  # Dari gambar "Total" row, kolom Februari

# Read CSV file
csv_file = r"d:\DOWNLOAD\Laporan Fa Detail (16 Segmen) (51).csv"

def leading_semi_count(line):
    """Count leading semicolons"""
    count = 0
    for char in line:
        if char == ';':
            count += 1
        else:
            break
    return count

print("\n" + "=" * 140)
print("VERIFIKASI CSV FEBRUARI dengan GAMBAR SPREADSHEET")
print("=" * 140)

with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract kegiatan totals dari CSV
csv_kegiatan_data = {}  # key: kegiatan code (4 digit), value: {'feb': total, 'items': [...]}

periode_ini_col = 23  # Column untuk Periode Ini (Februari)

for idx, line in enumerate(lines):
    row_num = idx + 1
    
    if idx < 8:  # Skip header
        continue
    
    parts = line.rstrip('\n').split(';')
    
    # Look for kegiatan rows (format: ;GG.NNNN;)
    if line.count(';') > 0 and 'GG.' in line:
        # Try to extract kegiatan code
        match = re.search(r';GG\.(\d{4});', line)
        if match:
            kegiatan_code = match.group(1)
            
            # Check if this is a kegiatan header row (aggregate)
            if leading_semi_count(line) == 1:
                # This is kegiatan aggregate row
                periode_val = None
                if periode_ini_col < len(parts):
                    periode_str = parts[periode_ini_col].strip()
                    periode_val = parse_number(periode_str)
                
                if kegiatan_code not in csv_kegiatan_data:
                    csv_kegiatan_data[kegiatan_code] = {'feb': 0, 'items': []}
                
                if periode_val:
                    csv_kegiatan_data[kegiatan_code]['feb'] = periode_val

# Re-parse untuk get kegiatan level aggregates
csv_kegiatan_data = {}

for idx, line in enumerate(lines):
    if idx < 8:
        continue
    
    parts = line.rstrip('\n').split(';')
    
    # Extract kegiatan rows (kegiatan level has format ;GG.NNNN;)
    match = re.search(r'^;(GG)\.(\d{4});', line)
    if match:
        program = match.group(1)
        kegiatan_code = match.group(2)
        
        # Get value from periode_ini column
        periode_val = None
        if periode_ini_col < len(parts):
            periode_str = parts[periode_ini_col].strip()
            periode_val = parse_number(periode_str)
        
        if kegiatan_code not in csv_kegiatan_data:
            csv_kegiatan_data[kegiatan_code] = {
                'feb': periode_val or 0,
                'line': line[:100]
            }

print(f"\n\n1. DATA DARI GAMBAR SPREADSHEET:")
print("-" * 140)
print(f"Total Kegiatan di gambar: {len(sheet_data)}")
print(f"Total Februari di gambar: {sheet_feb_total:,.2f}")
print(f"\nDetail per kegiatan:")
for kegiatan, data in sorted(sheet_data.items()):
    print(f"  {kegiatan}: Pagu {data['total_pagu']:>15,.0f} | Feb {data['feb']:>15,.0f}")

print(f"\n\n2. DATA DARI CSV:")
print("-" * 140)
print(f"Total kegiatan di CSV: {len(csv_kegiatan_data)}")
csv_feb_total = sum([x['feb'] for x in csv_kegiatan_data.values()])
print(f"Total Februari di CSV (sum kegiatan): {csv_feb_total:,.0f}")

print(f"\nDetail per kegiatan:")
for kegiatan in sorted(csv_kegiatan_data.keys()):
    data = csv_kegiatan_data[kegiatan]
    print(f"  {kegiatan}: Feb {data['feb']:>15,.0f}")

print(f"\n\n3. PERBANDINGAN & PERBEDAAN:")
print("-" * 140)

matches = 0
mismatches = 0
not_in_csv = []
not_in_sheet = []

for kegiatan, sheet_info in sheet_data.items():
    if kegiatan in csv_kegiatan_data:
        csv_feb = csv_kegiatan_data[kegiatan]['feb']
        sheet_feb = sheet_info['feb']
        
        if abs(csv_feb - sheet_feb) < 1:  # Allow 1 unit difference
            matches += 1
            print(f"  ✅ {kegiatan}: CSV={csv_feb:>15,.0f} ≈ Sheet={sheet_feb:>15,.0f} | {sheet_info['name'][:60]}")
        else:
            mismatches += 1
            diff = csv_feb - sheet_feb
            print(f"  ❌ {kegiatan}: CSV={csv_feb:>15,.0f} ≠ Sheet={sheet_feb:>15,.0f} | DIFF={diff:>12,.0f}")
    else:
        not_in_csv.append(kegiatan)
        print(f"  ⚠️  {kegiatan}: ❌ NOT IN CSV | {sheet_info['name'][:60]}")

for kegiatan in csv_kegiatan_data.keys():
    if kegiatan not in sheet_data:
        not_in_sheet.append(kegiatan)
        print(f"  ⚠️  {kegiatan}: ✅ IN CSV but NOT IN SHEET | Value={csv_kegiatan_data[kegiatan]['feb']:,.0f}")

print(f"\n\nSUMMARY:")
print(f"  Matches:       {matches}")
print(f"  Mismatches:    {mismatches}")
print(f"  Not in CSV:    {len(not_in_csv)}")
print(f"  Not in Sheet:  {len(not_in_sheet)}")

print(f"\n\n4. TOTAL COMPARISON:")
print("-" * 140)
print(f"Sheet Total (Februari):       {sheet_feb_total:>15,.2f}")
print(f"CSV Total (Kegiatan sum):     {csv_feb_total:>15,.0f}")
print(f"Difference:                    {abs(sheet_feb_total - csv_feb_total):>15,.2f}")

# The issue is: sheet shows 489.218.564, CSV parsing showed 502.379.458 from detail items
# Kegiatan aggregate should match sheet
expected_from_csv = 500919458  # What we found in JUMLAH SELURUHNYA

print(f"\nExpected CSV JUMLAH:          {expected_from_csv:>15,.0f}")
print(f"Actual Sheet showing:         {sheet_feb_total:>15,.2f}")
print(f"Unmatched (missing):          {expected_from_csv - sheet_feb_total:>15,.0f}")

print("\n" + "=" * 140)
