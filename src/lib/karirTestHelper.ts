/**
 * Test Helper for Karir Calculation Verification
 * 
 * Usage:
 * 1. Import test data (export 5-10 rows from MASTER.ORGANIK as JSON)
 * 2. Call runKarierCalculationTest() to verify all calculations
 * 3. Check console output for results breakdown
 */

interface TestKaryawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  kategori: 'Keahlian' | 'Keterampilan' | 'Reguler';
  tglPenghitunganAkTerakhir: string;
  akKumulatif: number;
  tmtPns?: string;
  tmtPangkat?: string;
  expectedAkRequirement?: number;  // For verification
  expectedEstimasiMonths?: number; // For verification
}

interface TestResult {
  nip: string;
  nama: string;
  passed: boolean;
  akRequirement: number;
  expectedAkRequirement: number;
  estimasiMonths: number;
  expectedEstimasiMonths: number | null;
  akSekarang: number;
  details: string;
}

// ==================== SAMPLE TEST DATA ====================

export const SAMPLE_TEST_DATA: TestKaryawan[] = [
  // CPNS II/c scenario: Should need only 40 AK (NOT 60)
  {
    nip: '19850315201001001',
    nama: 'STATISTISI TERAMPIL CPNS',
    pangkat: 'Penata',
    golongan: 'II/c',
    jabatan: 'Statistisi Terampil',
    kategori: 'Keterampilan',
    tglPenghitunganAkTerakhir: '2023-12-01',
    akKumulatif: 35.0,
    tmtPns: '2023-01-01',        // CPNS start
    tmtPangkat: '2023-01-01',    // Same = CPNS di II/c
    expectedAkRequirement: 40,    // CPNS II/c exception: 40 AK
    expectedEstimasiMonths: 2     // Approx 1 month with predikat 1.0
  },

  // Regular promoted to II/c: Should need 60 AK
  {
    nip: '19850315201001002',
    nama: 'STATISTISI TERAMPIL REGULAR',
    pangkat: 'Penata Muda Tingkat I',
    golongan: 'II/c',
    jabatan: 'Statistisi Terampil',
    kategori: 'Keterampilan',
    tglPenghitunganAkTerakhir: '2023-12-01',
    akKumulatif: 50.0,
    tmtPns: '2019-01-01',        // Regular PNS (non-CPNS)
    tmtPangkat: '2023-06-01',    // Different = promoted to II/c
    expectedAkRequirement: 60,    // Regular: 60 AK
    expectedEstimasiMonths: 4     // Need ~10 more AK
  },

  // CPNS II/a (not the exception): Still 60 AK
  {
    nip: '19850315201001003',
    nama: 'STATISTISI TERAMPIL CPNS II/A',
    pangkat: 'Penata',
    golongan: 'II/a',
    jabatan: 'Statistisi Terampil',
    kategori: 'Keterampilan',
    tglPenghitunganAkTerakhir: '2023-12-01',
    akKumulatif: 30.0,
    tmtPns: '2023-01-01',
    tmtPangkat: '2023-01-01',    // CPNS but at II/a (not II/c)
    expectedAkRequirement: 60,    // Exception only for II/c
    expectedEstimasiMonths: 6
  },

  // Reguler category: No AK accumulation
  {
    nip: '19850315201001004',
    nama: 'PEKERJA SOSIAL REGULER',
    pangkat: 'Pengatur',
    golongan: 'II/c',
    jabatan: 'Pekerja Sosial',
    kategori: 'Reguler',
    tglPenghitunganAkTerakhir: '2023-12-01',
    akKumulatif: 0,
    tmtPns: '2020-01-01',
    tmtPangkat: '2020-01-01',
    expectedAkRequirement: 0,     // Reguler doesn't need AK
    expectedEstimasiMonths: 999   // Based on 4-year rule, not AK
  },

  // Already eligible: Should show 0 months
  {
    nip: '19850315201001005',
    nama: 'STATISTISI MAHIR ELIGIBLE',
    pangkat: 'Penata',
    golongan: 'II/c',
    jabatan: 'Statistisi Mahir',
    kategori: 'Keterampilan',
    tglPenghitunganAkTerakhir: '2023-12-01',
    akKumulatif: 65.0,
    tmtPns: '2023-01-01',
    tmtPangkat: '2023-01-01',    // CPNS II/c
    expectedAkRequirement: 40,    // CPNS exception
    expectedEstimasiMonths: 0     // Already pass 40 AK
  }
];

// ==================== CALCULATION FUNCTIONS ====================

function parseTanggalIndonesia(tanggal: string): Date {
  if (!tanggal || tanggal.trim() === '') return new Date();
  if (tanggal.includes('-')) {
    const date = new Date(tanggal);
    if (!isNaN(date.getTime())) return date;
  }
  const bulanMap: Record<string, number> = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
    'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
    'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };
  const cleanedDate = tanggal.toLowerCase().trim();
  const parts = cleanedDate.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = bulanMap[parts[1]];
    const year = parseInt(parts[2]);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return new Date();
}

function hitungSelisihBulan(tanggalAwal: Date, tanggalAkhir: Date): number {
  const tahunAwal = tanggalAwal.getFullYear();
  const bulanAwal = tanggalAwal.getMonth();
  const tahunAkhir = tanggalAkhir.getFullYear();
  const bulanAkhir = tanggalAkhir.getMonth();
  return (tahunAkhir - tahunAwal) * 12 + (bulanAkhir - bulanAwal);
}

function getKebutuhanJabatanTerampil(golongan: string, tmtPns?: string, tmtPangkat?: string): number {
  // Exception: CPNS II/c (start dari II/c dengan tmtPns === tmtPangkat)
  if (
    golongan === 'II/c' &&
    tmtPns &&
    tmtPangkat &&
    tmtPns === tmtPangkat
  ) {
    return 40; // CPNS dari II/c hanya butuh 40 AK
  }
  return 60; // Normal untuk yang lain
}

function hitungAKTambahan(karyawan: TestKaryawan, predikatAsumsi: number = 1.0): number {
  const tglPenghitunganTerakhir = parseTanggalIndonesia(karyawan.tglPenghitunganAkTerakhir);
  const hariIni = new Date();

  if (tglPenghitunganTerakhir > hariIni) return 0;

  const selisihBulan = hitungSelisihBulan(tglPenghitunganTerakhir, hariIni);
  if (selisihBulan <= 0) return 0;

  const koefisien = 5.0; // Terampil
  const akPerBulan = (predikatAsumsi * koefisien) / 12;
  const akTambahan = selisihBulan * akPerBulan;

  return Number(akTambahan.toFixed(3));
}

function cekKaryawanBisaUsul(karyawan: TestKaryawan, predikatAsumsi: number = 1.0) {
  if (karyawan.kategori === 'Reguler') {
    return { bisaUsul: false, type: null, bulanDibutuhkan: 999, akRealSaatIni: 0, kebutuhanJabatan: 0 };
  }

  // Untuk Terampil yang ingin naik ke Mahir
  const kebutuhanJabatan = getKebutuhanJabatanTerampil(
    karyawan.golongan,
    karyawan.tmtPns,
    karyawan.tmtPangkat
  );

  const akTambahan = hitungAKTambahan(karyawan, predikatAsumsi);
  const akRealSaatIni = karyawan.akKumulatif + akTambahan;
  const kekuranganJabatan = Math.max(0, kebutuhanJabatan - akRealSaatIni);

  const koefisien = 5.0; // Terampil
  const akPerBulan = (predikatAsumsi * koefisien) / 12;
  const bulanDibutuhkan = akPerBulan > 0 ? Math.ceil(kekuranganJabatan / akPerBulan) : 999;

  const bisaUsulJabatan = akRealSaatIni >= kebutuhanJabatan && kebutuhanJabatan > 0;
  const dalamTigaBulan = bulanDibutuhkan > 0 && bulanDibutuhkan <= 3;

  return {
    bisaUsul: bisaUsulJabatan || dalamTigaBulan,
    type: bisaUsulJabatan ? 'sekarang' : 'dalam_3_bulan',
    bulanDibutuhkan: bulanDibutuhkan,
    akRealSaatIni: akRealSaatIni,
    kebutuhanJabatan: kebutuhanJabatan
  };
}

// ==================== TEST RUNNER ====================

export function runKarierCalculationTest(testData: TestKaryawan[] = SAMPLE_TEST_DATA): TestResult[] {
  console.log('='.repeat(60));
  console.log('🧪 KARIR CALCULATION TEST');
  console.log('='.repeat(60));

  const results: TestResult[] = [];
  let passedCount = 0;

  for (const karyawan of testData) {
    const estimasi = cekKaryawanBisaUsul(karyawan, 1.0);

    const akRequirement = estimasi.kebutuhanJabatan;
    const expectedAkRequirement = karyawan.expectedAkRequirement || 60;
    const bulanDibutuhkan = estimasi.bulanDibutuhkan;
    const expectedMonths = karyawan.expectedEstimasiMonths;

    const akMatch = akRequirement === expectedAkRequirement;
    const monthsMatch = expectedMonths === null || Math.abs(bulanDibutuhkan - expectedMonths) <= 1; // Allow ±1 month
    const passed = akMatch && monthsMatch;

    if (passed) passedCount++;

    const result: TestResult = {
      nip: karyawan.nip,
      nama: karyawan.nama,
      passed,
      akRequirement,
      expectedAkRequirement,
      estimasiMonths: bulanDibutuhkan,
      expectedEstimasiMonths: expectedMonths || 0,
      akSekarang: estimasi.akRealSaatIni,
      details: `${karyawan.jabatan} (${karyawan.golongan}) | Kategori: ${karyawan.kategori} | CPNS: ${karyawan.tmtPns === karyawan.tmtPangkat ? 'Ya' : 'Tidak'}`
    };

    results.push(result);

    const statusIcon = passed ? '✅' : '❌';
    console.log(`\n${statusIcon} ${result.nama} (${result.nip})`);
    console.log(`   ${result.details}`);
    console.log(`   AK Kebutuhan: ${result.akRequirement} (expected: ${result.expectedAkRequirement}) ${akMatch ? '✓' : '✗'}`);
    console.log(`   AK Sekarang: ${result.akSekarang.toFixed(2)}`);
    console.log(`   Estimasi: ${result.estimasiMonths} bulan (expected: ${expectedMonths ?? '≤3'}) ${monthsMatch ? '✓' : '✗'}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 SUMMARY: ${passedCount}/${testData.length} tests passed`);
  console.log('='.repeat(60));

  return results;
}

export function verifySpecificKaryawan(
  nipOrName: string,
  testData: TestKaryawan[] = SAMPLE_TEST_DATA
): TestResult | null {
  const karyawan = testData.find(
    k => k.nip === nipOrName || k.nama.includes(nipOrName.toUpperCase())
  );

  if (!karyawan) {
    console.error(`❌ Karyawan dengan NIP/nama "${nipOrName}" tidak ditemukan`);
    return null;
  }

  console.log(`\n🔍 VERIFYING: ${karyawan.nama} (${karyawan.nip})`);
  const estimasi = cekKaryawanBisaUsul(karyawan, 1.0);

  const result: TestResult = {
    nip: karyawan.nip,
    nama: karyawan.nama,
    passed: true,
    akRequirement: estimasi.kebutuhanJabatan,
    expectedAkRequirement: karyawan.expectedAkRequirement || 60,
    estimasiMonths: estimasi.bulanDibutuhkan,
    expectedEstimasiMonths: karyawan.expectedEstimasiMonths || 0,
    akSekarang: estimasi.akRealSaatIni,
    details: `${karyawan.jabatan} (${karyawan.golongan}) | ${karyawan.kategori}`
  };

  console.log(`\nℹ️  Details:`);
  console.log(`   Jabatan: ${karyawan.jabatan}`);
  console.log(`   Pangkat: ${karyawan.pangkat} (${karyawan.golongan})`);
  console.log(`   Kategori: ${karyawan.kategori}`);
  console.log(`   TMT PNS: ${karyawan.tmtPns || 'N/A'}`);
  console.log(`   TMT Pangkat: ${karyawan.tmtPangkat || 'N/A'}`);
  console.log(`   Is CPNS: ${karyawan.tmtPns === karyawan.tmtPangkat ? 'Ya' : 'Tidak'}`);

  console.log(`\n📈 Calculation Results:`);
  console.log(`   Kebutuhan AK: ${result.akRequirement}`);
  console.log(`   AK Kumulatif: ${karyawan.akKumulatif}`);
  console.log(`   AK Tambahan (since last calc): ${(result.akSekarang - karyawan.akKumulatif).toFixed(2)}`);
  console.log(`   AK Sekarang: ${result.akSekarang.toFixed(2)}`);
  console.log(`   Kekurangan: ${Math.max(0, result.akRequirement - result.akSekarang).toFixed(2)}`);

  console.log(`\n⏳ Timeline:`);
  console.log(`   Estimasi untuk naik: ${result.estimasiMonths} bulan`);
  console.log(`   Bisa usul sekarang: ${estimasi.bisaUsul ? 'Ya' : 'Tidak'}`);
  console.log(`   Status: ${estimasi.type}`);

  return result;
}

// ==================== EXPORT FOR MANUAL TESTING ====================

// Use in browser console:
// 1. Import: import { runKarierCalculationTest, SAMPLE_TEST_DATA } from '@/lib/karirTestHelper'
// 2. Run all tests: runKarierCalculationTest()
// 3. Run specific: verifySpecificKaryawan('STATISTISI TERAMPIL CPNS')

export default {
  runTest: runKarierCalculationTest,
  verify: verifySpecificKaryawan,
  sampleData: SAMPLE_TEST_DATA
};
