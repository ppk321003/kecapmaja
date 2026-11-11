export const PLOTTING_SPREADSHEET_ID = '1ABe64y-ou_L1xIBmN4or5aLpXM8rB9IEr-2e9dDnL98';
export const PLOTTING_SHEET = 'Sheet1';
export const MASTER_KEGIATAN_ID = '1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8';
export const JENIS_TUGAS = ['Pendataan', 'Pemeriksaan', 'Pengolahan'] as const;
export type JenisTugas = (typeof JENIS_TUGAS)[number];

export interface Plotting {
  rowNumber: number; id: string; fungsi: string; nama_kegiatan: string; jenis_tugas: string;
  bulan: number; tahun: number; tanggal_mulai: string; tanggal_selesai: string;
  id_mitra: string; nama_mitra: string; volume: number; satuan: string; honor_satuan: number;
  total_honor: number; keterangan: string; status: string;
}

export const parseRupiah = (s: unknown): number => {
  const n = parseInt(String(s ?? '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};
export const parseNum = (s: unknown): number => {
  const n = parseFloat(String(s ?? '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
export const fmtRp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export const isDeleted = (status?: string) => /^\s*dihapus\b/i.test(status ?? '');

export function parsePlotting(values: string[][] | undefined): Plotting[] {
  if (!values || values.length < 2) return [];
  return values.slice(1).map((r, i) => {
    const volume = parseNum(r[10]);
    const honor = parseRupiah(r[12]);
    return {
      rowNumber: i + 2, id: r[0] ?? '', fungsi: r[1] ?? '', nama_kegiatan: r[2] ?? '', jenis_tugas: r[3] ?? '',
      bulan: parseInt(r[4] ?? '', 10) || 0, tahun: parseInt(r[5] ?? '', 10) || 0,
      tanggal_mulai: r[6] ?? '', tanggal_selesai: r[7] ?? '', id_mitra: r[8] ?? '', nama_mitra: r[9] ?? '',
      volume, satuan: r[11] ?? '', honor_satuan: honor,
      total_honor: parseRupiah(r[13]) || volume * honor, keterangan: r[14] ?? '', status: r[15] ?? '',
    };
  }).filter((p) => (p.id || p.nama_mitra) && !isDeleted(p.status));
}

/** Tebak jenis tugas dari nama kegiatan. */
export function guessJenis(nama: string): JenisTugas {
  const n = nama.toLowerCase();
  if (/pengolah|entri|editing|coding|olah/.test(n)) return 'Pengolahan';
  if (/pemeriksa|pengawas|supervis|periksa|pml/.test(n)) return 'Pemeriksaan';
  return 'Pendataan';
}

/** Nama jenis pekerjaan yang dipakai pada kolom D SPK-BAST. */
export function jenisPekerjaanSpk(jenis: string): string {
  const value = jenis.trim().toLowerCase();
  if (value.startsWith('pendataan')) return 'Petugas Pendataan Lapangan';
  if (value.startsWith('pemeriksaan')) return 'Petugas Pemeriksaan Lapangan';
  if (value.startsWith('pengolahan')) return 'Petugas Pengolahan';
  return jenis;
}

export interface SbmlLimit { pendataan: number; pemeriksaan: number; pengolahan: number }
export const limitFor = (sbml: SbmlLimit | null, jenis: string) => {
  if (!sbml) return 0;
  const j = jenis.toLowerCase();
  if (j.startsWith('pemeriksa')) return sbml.pemeriksaan;
  if (j.startsWith('pengolah')) return sbml.pengolahan;
  return sbml.pendataan;
};

const mitraKey = (p: Pick<Plotting, 'id_mitra' | 'nama_mitra'>) => (p.id_mitra || p.nama_mitra).trim().toLowerCase();

/** Total honor seorang mitra per bulan (semua fungsi), dikelompokkan per jenis tugas. */
export function monthlyTotals(items: Plotting[], tahun: number) {
  const map = new Map<string, { id_mitra: string; nama: string; bulan: number; total: number; perJenis: Record<string, number>; items: Plotting[] }>();
  items.filter((p) => p.tahun === tahun).forEach((p) => {
    const k = `${mitraKey(p)}|${p.bulan}`;
    const cur = map.get(k) ?? { id_mitra: p.id_mitra, nama: p.nama_mitra, bulan: p.bulan, total: 0, perJenis: {}, items: [] };
    cur.total += p.total_honor;
    cur.perJenis[p.jenis_tugas] = (cur.perJenis[p.jenis_tugas] ?? 0) + p.total_honor;
    cur.items.push(p);
    map.set(k, cur);
  });
  return Array.from(map.values());
}

/** Batas yang berlaku = batas tertinggi dari jenis tugas yang dijalani mitra di bulan itu. */
export function effectiveLimit(sbml: SbmlLimit | null, jenisList: string[]) {
  return Math.max(0, ...jenisList.map((j) => limitFor(sbml, j)));
}

export function statusHonor(total: number, limit: number): 'aman' | 'hampir' | 'lewat' | 'na' {
  if (!limit) return 'na';
  if (total > limit) return 'lewat';
  if (total >= limit * 0.9) return 'hampir';
  return 'aman';
}

export const roleMatches = (rolesCell: string, role: string) =>
  rolesCell.split('|').map((r) => r.trim().toLowerCase()).includes(role.trim().toLowerCase());
