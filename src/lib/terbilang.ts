/**
 * Utility function untuk konversi angka ke terbilang (bahasa Indonesia)
 * Contoh: 100000 -> "seratus ribu"
 */

export const terbilang = (n: number): string => {
  const satuan = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];

  n = Math.floor(n);

  if (n === 0) return '';

  if (n > 1000000000) return 'angka terlalu besar';

  if (n < 12) return satuan[n];

  if (n < 20) return satuan[n - 10] + ' belas';

  if (n < 100)
    return terbilang(Math.floor(n / 10)) + ' puluh ' + satuan[n % 10];

  if (n < 200) return 'seratus ' + terbilang(n - 100);

  if (n < 1000)
    return terbilang(Math.floor(n / 100)) + ' ratus ' + terbilang(n % 100);

  if (n < 2000) return 'seribu ' + terbilang(n - 1000);

  if (n < 1000000)
    return terbilang(Math.floor(n / 1000)) + ' ribu ' + terbilang(n % 1000);

  if (n < 1000000000)
    return (
      terbilang(Math.floor(n / 1000000)) +
      ' juta ' +
      terbilang(n % 1000000)
    );

  return 'angka terlalu besar';
};

/**
 * Format nomor uang ke terbilang rupiah
 * Contoh: 100000 -> "seratus ribu rupiah"
 */
export const terbilangRupiah = (n: number): string => {
  const hasil = terbilang(n);
  return hasil ? hasil + ' rupiah' : '';
};

/**
 * Bersihkan terbilang dari spasi ganda
 */
export const cleanTerbilang = (str: string): string => {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+ribu\s+ratus/, ' seribu')
    .replace(/\s+juta\s+ribu/, ' sejuta');
};
