/**
 * Tooltip definitions untuk istilah teknis di Karir
 */

export const karirTooltips = {
  AK: {
    label: 'Angka Kredit (AK)',
    description: 'Nilai kredit yang dikumpulkan berdasarkan performa, pangkat, dan jabatan untuk kenaikan pangkat/jabatan',
    longDescription: 'Angka Kredit adalah sistem penilaian yang mengukur kontribusi ASN dalam pengembangan karir. Semakin tinggi AK, semakin dekat dengan kenaikan pangkat atau jabatan.'
  },
  SKP: {
    label: 'SKP - Surat Keterangan Pelaksanaan',
    description: 'Dokumen hasil evaluasi kinerja yang kemudian dikonversi menjadi PAK (Penetapan Angka Kredit)',
    longDescription: 'SKP adalah laporan penilaian pelaksanaan pekerjaan tahunan atau semester yang berisi nilai predikat kinerja (Sangat Baik, Baik, Cukup, Kurang). Nilai SKP kemudian dikonversi menjadi Angka Kredit.'
  },
  PAK: {
    label: 'PAK - Penetapan Angka Kredit',
    description: 'Dokumen resmi hasil konversi SKP menjadi nilai Angka Kredit',
    longDescription: 'PAK adalah surat keputusan yang menetapkan berapa banyak Angka Kredit yang diperoleh dalam periode tertentu (semester/tahunan) berdasarkan hasil penilaian SKP.'
  },
  Predikat: {
    label: 'Predikat Kinerja',
    description: 'Tingkat pencapaian kinerja: Sangat Baik (SB), Baik (B), Cukup (C), Kurang (K)',
    longDescription: 'Predikat menunjukkan kategori performa dalam periode tertentu. Semakin tinggi predikat, semakin banyak Angka Kredit yang diperoleh.',
    values: {
      'SB': 'Sangat Baik (1.25x AK)',
      'B': 'Baik (1.00x AK)',
      'C': 'Cukup (0.80x AK)',
      'K': 'Kurang (0.60x AK)'
    }
  },
  KoefisienJabatan: {
    label: 'Koefisien Jabatan',
    description: 'Angka pengalian untuk menghitung AK per bulan berdasarkan tingkat jabatan',
    examples: {
      'Ahli Pertama': '12.5',
      'Ahli Muda': '25.0',
      'Ahli Madya': '37.5',
      'Terampil': '5.0',
      'Mahir': '12.5',
      'Penyelia': '25.0'
    }
  },
  AKPerBulan: {
    label: 'AK Per Bulan',
    description: 'Rata-rata Angka Kredit yang dikumpulkan setiap bulan',
    formula: 'Predikat (%) × Koefisien Jabatan ÷ 12'
  },
  Kebutuhanpangkat: {
    label: 'Kebutuhan AK Pangkat',
    description: 'Total Angka Kredit yang diperlukan untuk naik satu tingkat pangkat',
    longDescription: 'Jumlah AK yang harus dikumpulkan untuk memenuhi syarat kenaikan pangkat sesuai peraturan BKN.'
  },
  KebutuhanJabatan: {
    label: 'Kebutuhan AK Jabatan',
    description: 'Total Angka Kredit yang diperlukan untuk naik satu tingkat jabatan',
    longDescription: 'Jumlah AK yang harus dikumpulkan untuk memenuhi syarat kenaikan jabatan fungsional sesuai peraturan BKN.\n\n⚠️ PENGECUALIAN CPNS II/c: Pegawai yang start langsung dari pangkat II/c (CPNS II/c) hanya membutuhkan 40 AK untuk naik dari Terampil ke Mahir (bukan 60 AK standar). Deteksi: TMT PNS = TMT Pangkat pada golongan II/c.'
  },
  EstimasiWaktu: {
    label: 'Estimasi Waktu Kenaikan',
    description: 'Perkiraan berapa lama waktu yang dibutuhkan untuk mengumpulkan AK yang cukup',
    note: 'Estimasi ini berdasarkan AK Per Bulan dengan asumsi predikat tetap sama'
  },
  PJL: {
    label: 'PJL - Perpindahan Jabatan Lain',
    description: 'Transisi karir dari kategori Keterampilan ke Keahlian',
    longDescription: 'Program yang memungkinkan ASN kategori Keterampilan untuk pindah ke kategori Keahlian setelah memenuhi syarat dan lulus Uji Kompetensi. Ini membuka peluang kenaikan karir yang lebih tinggi.'
  },
  UjiKompetensi: {
    label: 'Uji Kompetensi',
    description: 'Tes untuk memvalidasi kesiapan dalam transisi jabatan/kategori',
    longDescription: 'Uji yang harus diikuti sebagai syarat untuk kenaikan jenjang (khususnya dalam Perpindahan Jabatan Lain).'
  },
  KenaikanJenjang: {
    label: 'Kenaikan Jenjang',
    description: 'Transisi dari satu level jabatan ke level yang lebih tinggi dengan perubahan pangkat',
    examples: 'Terampil → Mahir (golongan II/d → III/a), Ahli Muda → Ahli Madya'
  },
  MasaKerja: {
    label: 'Masa Kerja (Reguler)',
    description: 'Durasi minimal seorang ASN harus berada pada pangkat saat ini sebelum bisa naik',
    note: 'Untuk kategori Reguler: 4 tahun dari TMT Pangkat. Untuk kategori lain menggunakan Angka Kredit.'
  }
};

export type TooltipKey = keyof typeof karirTooltips;

export const getTooltip = (key: TooltipKey) => {
  return karirTooltips[key];
};
