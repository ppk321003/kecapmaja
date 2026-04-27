/**
 * Utilitas untuk generate nomor antrian e-Tamu
 * Format: KODE-YYMM-NOURUT
 * 
 * Kode antrian:
 * - LP = Layanan Perpustakaan
 * - KS = Konsultasi Statistik
 * - RS = Rekomendasi Statistik (Khusus OPD/Pemda)
 * - L  = Lainnya
 */

export interface AntrianMapping {
  [key: string]: string;
}

export const ANTRIAN_KODE: AntrianMapping = {
  perpustakaan: "LP",
  konsultasi: "KS",
  rekomendasi: "RS",
  lainnya: "L",
};

/**
 * Generate nomor antrian berdasarkan kategori kepentingan
 * @param kepentinganList - array id kategori (contoh: ['perpustakaan'])
 * @param existingData - array data existing dari sheet untuk counting
 * @returns nomor antrian (contoh: LP-2604-001)
 */
export const generateAntrianNumber = (
  kepentinganList: string[],
  existingData?: string[][]
): string => {
  if (!kepentinganList || kepentinganList.length === 0) {
    return "";
  }

  // Ambil kategori utama (yang pertama dipilih)
  const kategori = kepentinganList[0];
  const kode = ANTRIAN_KODE[kategori] || "L";

  // Format YYMM
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yearMonth = `${yy}${mm}`;

  // Hitung nomor urut
  let nomor = 1;

  if (existingData && existingData.length > 0) {
    // Asumsi kolom antrian ada di index 12 (kolom M = 13, tapi array 0-indexed = 12)
    // Filter yang sesuai kode dan tahun-bulan yang sama
    const prefix = `${kode}-${yearMonth}`;
    
    const matching = existingData.filter((row) => {
      if (row[12]) {
        const antrianStr = String(row[12]).trim();
        return antrianStr.startsWith(prefix);
      }
      return false;
    });

    if (matching.length > 0) {
      // Extract nomor urut dari entry terakhir
      const lastEntry = matching[matching.length - 1];
      const lastAntrianStr = String(lastEntry[12]).trim();
      const lastNomor = parseInt(lastAntrianStr.split("-")[2] || "0", 10);
      nomor = lastNomor + 1;
    }
  }

  const nomorStr = String(nomor).padStart(3, "0");
  return `${kode}-${yearMonth}-${nomorStr}`;
};

/**
 * Validate format nomor antrian
 * @param nomorAntrian - nomor yang akan di-validate
 * @returns true jika format valid
 */
export const isValidAntrianFormat = (nomorAntrian: string): boolean => {
  const pattern = /^(LP|KS|RS|L)-\d{4}-\d{3}$/;
  return pattern.test(nomorAntrian);
};
