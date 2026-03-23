#!/usr/bin/env python3
"""
Test script untuk memverifikasi format pesan Karir WA - Test Case 2
dengan golongan yang undefined seperti report user
"""

def format_estimasi_waktu(bulan: int) -> str:
    """Format waktu estimasi dalam bahasa Indonesia"""
    if bulan <= 0:
        return 'Sekarang'
    if bulan == 1:
        return '1 bulan'
    if bulan <= 3:
        return f'{bulan} bulan'
    
    tahun = bulan // 12
    bulan_sisa = bulan % 12
    
    if tahun > 0 and bulan_sisa > 0:
        return f'{tahun} tahun {bulan_sisa} bulan'
    if tahun > 0:
        return f'{tahun} tahun'
    return f'{bulan} bulan'


def get_jabatan_berikutnya(jabatan: str, kategori: str) -> str:
    """Get jabatan berikutnya"""
    if kategori == 'Reguler':
        return 'Tidak berlaku'
    
    if kategori == 'Keahlian':
        if 'Ahli Pertama' in jabatan:
            return 'Ahli Muda'
        if 'Ahli Muda' in jabatan:
            return 'Ahli Madya'
        if 'Ahli Madya' in jabatan:
            return 'Ahli Utama'
        if 'Ahli Utama' in jabatan:
            return 'Tidak ada lagi'
    elif kategori == 'Keterampilan':
        if 'Terampil' in jabatan:
            return 'Mahir'
        if 'Mahir' in jabatan:
            return 'Penyelia'
        if 'Penyelia' in jabatan:
            return 'Tidak ada lagi'
    
    return 'Tidak diketahui'


def get_golongan_berikutnya(golongan: str, kategori: str) -> str:
    """Get golongan berikutnya"""
    if not golongan or golongan == 'undefined':
        return 'Tidak diketahui'
    
    if kategori == 'Reguler':
        return 'Tidak berlaku'
    
    # Keterampilan progression
    keterampilan_sequence = ['II/a', 'II/b', 'II/c', 'II/d', 'III/a', 'III/b', 'III/c']
    
    # Keahlian progression
    keahlian_sequence = ['III/a', 'III/b', 'III/c', 'III/d', 'IV/a', 'IV/b', 'IV/c', 'IV/d']
    
    sequence = keahlian_sequence if kategori == 'Keahlian' else keterampilan_sequence
    
    try:
        current_index = sequence.index(golongan)
        if current_index == len(sequence) - 1:
            return 'Tidak ada lagi'
        return sequence[current_index + 1]
    except ValueError:
        return 'Tidak ada lagi'


def build_message(karyawan: dict, estimasi: dict) -> str:
    """Build WA message"""
    app_link = 'https://kecapmaja.app/KarierKu'
    
    # Get next positions
    jabatan_berikutnya = get_jabatan_berikutnya(karyawan['jabatan'], karyawan['kategori'])
    golongan_berikutnya = get_golongan_berikutnya(karyawan.get('golongan') or '', karyawan['kategori'])
    
    # Ensure pangkat is not undefined
    pangkat_saat_ini = karyawan.get('golongan') or 'Tidak diketahui'
    
    message = f"Halo {karyawan['nama'].split()[0]}, 👋\n\n"
    message += "Kabar baik! Status kenaikan karir Anda:\n\n"
    message += "📊 *Posisi Saat Ini*\n"
    message += f"Jabatan: {karyawan['jabatan']}\n"
    message += f"Pangkat: {pangkat_saat_ini}\n\n"
    
    if estimasi['type'] == 'jabatan_pangkat':
        message += "📊 *Posisi yang akan segera diperoleh*\n"
        message += f"Jabatan: {jabatan_berikutnya}\n"
        message += f"Pangkat: {golongan_berikutnya}\n\n"
        message += f"⏳ *Estimasi kenaikan dalam jangka waktu {format_estimasi_waktu(estimasi['bulanDibutuhkan'])}*\n"
        message += "Persiapkan dokumen lengkap untuk kedua usulan!\n\n"
    elif estimasi['type'] == 'jabatan':
        message += "📊 *Posisi yang akan segera diperoleh*\n"
        message += f"Jabatan: {jabatan_berikutnya}\n"
        message += f"Pangkat: {pangkat_saat_ini}\n\n"
        message += f"⏳ *Estimasi kenaikan dalam jangka waktu {format_estimasi_waktu(estimasi['bulanDibutuhkan'])}*\n"
    elif estimasi['type'] == 'pangkat':
        message += "📊 *Posisi yang akan segera diperoleh*\n"
        message += f"Jabatan: {karyawan['jabatan']}\n"
        message += f"Pangkat: {golongan_berikutnya}\n\n"
        message += f"⏳ *Estimasi kenaikan dalam jangka waktu {format_estimasi_waktu(estimasi['bulanDibutuhkan'])}*\n"
    
    message += "\n"
    message += f"📱 Pantau progress lengkap di:\n{app_link}\n\n"
    message += "Pertanyaan? Hubungi PPK di satuan kerja Anda.\n"
    message += "\n_Pesan otomatis dari Sistem Karir_"
    
    return message


# Test case 1: Dengan golongan yang undefined (seperti report user awal)
print("=" * 60)
print("TEST 1: Dengan Golongan UNDEFINED")
print("=" * 60)

test_karyawan_undefined = {
    'nama': 'Arini',
    'jabatan': 'Statistisi Terampil',
    'golongan': None,  # undefined
    'kategori': 'Keterampilan'
}

test_estimasi = {
    'type': 'pangkat',
    'bulanDibutuhkan': 3
}

message = build_message(test_karyawan_undefined, test_estimasi)
print(message)

# Test case 2: Dengan golongan yang sudah terisi
print("\n" + "=" * 60)
print("TEST 2: Dengan Golongan II/c (Fixed)")
print("=" * 60)

test_karyawan_fixed = {
    'nama': 'Arini',
    'jabatan': 'Statistisi Terampil',
    'golongan': 'II/c',
    'kategori': 'Keterampilan'
}

message = build_message(test_karyawan_fixed, test_estimasi)
print(message)

# Test case 3: Kenaikan jabatan dan pangkat bersamaan
print("\n" + "=" * 60)
print("TEST 3: Kenaikan Jabatan + Pangkat Bersamaan")
print("=" * 60)

test_estimasi_combined = {
    'type': 'jabatan_pangkat',
    'bulanDibutuhkan': 2
}

message = build_message(test_karyawan_fixed, test_estimasi_combined)
print(message)

# Test case 4: Kenaikan jabatan saja
print("\n" + "=" * 60)
print("TEST 4: Kenaikan Jabatan Saja")
print("=" * 60)

test_estimasi_jabatan = {
    'type': 'jabatan',
    'bulanDibutuhkan': 4
}

message = build_message(test_karyawan_fixed, test_estimasi_jabatan)
print(message)
