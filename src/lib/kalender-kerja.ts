/** Logika murni Kalender Kerja (sheet JADWAL_TAHUNAN, kolom A-J). */

export const KALENDER_SHEET = 'JADWAL_TAHUNAN';

export const FUNGSI_OPTIONS = ['Umum', 'Sosial', 'Produksi', 'Distribusi', 'Nerwilis', 'IPDS'];
export const TAHAPAN_OPTIONS = [
  'Persiapan',
  'Pelatihan',
  'Pencacahan Lapangan',
  'Pengolahan Data',
  'Diseminasi/Rilis',
  'Administrasi/Lainnya',
];

export interface Jadwal {
  id: string;
  fungsi: string;
  nama_kegiatan: string;
  tahapan: string;
  tanggal_mulai: Date;
  tanggal_selesai: Date;
  penanggung_jawab: string;
  keterangan: string;
  organik: string[];
  status: string;
  rowNumber: number; // nomor baris di sheet (1-based)
}

/** Terima yyyy-mm-dd, dd/mm/yyyy, atau Date(y,m,d) dari gviz. */
export function parseTanggal(raw: string | undefined | null): Date | null {
  const s = (raw ?? '').toString().trim();
  if (!s) return null;
  let m = s.match(/^Date\((\d+),(\d+),(\d+)/);
  if (m) return new Date(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toDdMmYyyy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export const splitOrganik = (s: string | undefined) =>
  (s ?? '').split('|').map((x) => x.trim()).filter(Boolean);
export const joinOrganik = (list: string[]) => list.map((x) => x.trim()).filter(Boolean).join('|');

export type StatusAksi = 'ditambahkan' | 'diedit' | 'dihapus';
export function buildStatus(aksi: StatusAksi, role: string, now: Date = new Date()): string {
  return `${aksi} oleh ${role} pada ${toDdMmYyyy(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const isDeleted = (status: string | undefined) => /^\s*dihapus\b/i.test(status ?? '');

/** Role pembuat dari teks status "... oleh {role} pada ...". */
export function ownerRole(status: string | undefined): string | null {
  const m = (status ?? '').match(/oleh\s+(.+?)\s+pada\s/i);
  return m ? m[1].trim() : null;
}

const norm = (s: string) => s.trim().toLowerCase();
export const isAdminRole = (role: string) => /admin|ppk/i.test(role ?? '');
export const canAdd = (role: string | undefined) => !!role && (/fungsi/i.test(role) || isAdminRole(role));

/** Hanya fungsi pembuat (atau admin/PPK) yang boleh edit/hapus. */
export function canModify(role: string | undefined, item: Pick<Jadwal, 'status' | 'fungsi'>): boolean {
  if (!role) return false;
  if (isAdminRole(role)) return true;
  if (!/fungsi/i.test(role)) return false;
  const owner = ownerRole(item.status);
  if (owner) return norm(owner) === norm(role);
  // tanpa status: cocokkan dengan kolom fungsi
  const f = norm(item.fungsi);
  return !!f && norm(role).includes(f);
}

/** Ubah baris sheet menjadi data; baris terhapus / tanggal tak valid dibuang. */
export function parseRows(rows: string[][]): Jadwal[] {
  const out: Jadwal[] = [];
  const startIdx = rows[0]?.[0]?.toString().trim().toLowerCase() === 'id' ? 1 : 0;
  for (let i = startIdx; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const id = (r[0] ?? '').toString().trim();
    if (!id) continue;
    const status = (r[9] ?? '').toString();
    if (isDeleted(status)) continue;
    const mulai = parseTanggal(r[4]);
    if (!mulai) continue;
    const selesaiRaw = parseTanggal(r[5]) ?? mulai;
    const selesai = selesaiRaw < mulai ? mulai : selesaiRaw;
    out.push({
      id,
      fungsi: (r[1] ?? '').toString().trim(),
      nama_kegiatan: (r[2] ?? '').toString().trim(),
      tahapan: (r[3] ?? '').toString().trim(),
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
      penanggung_jawab: (r[6] ?? '').toString().trim(),
      keterangan: (r[7] ?? '').toString().trim(),
      organik: splitOrganik(r[8]),
      status,
      rowNumber: startIdx === 1 ? i + 1 : i + 2,
    });
  }
  return out;
}

export const dayKey = (d: Date) => toIsoDate(d);

/** Hitung jumlah kegiatan per tanggal dalam tahun tertentu. */
export function countPerDay(items: Jadwal[], year: number): Map<string, Jadwal[]> {
  const map = new Map<string, Jadwal[]>();
  for (const it of items) {
    const start = new Date(Math.max(it.tanggal_mulai.getTime(), new Date(year, 0, 1).getTime()));
    const end = new Date(Math.min(it.tanggal_selesai.getTime(), new Date(year, 11, 31).getTime()));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d);
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
  }
  return map;
}

export const overlaps = (a: Jadwal, b: Jadwal) =>
  a.tanggal_mulai <= b.tanggal_selesai && b.tanggal_mulai <= a.tanggal_selesai;

/** Pasangan kegiatan yang tumpang tindih. */
export function findOverlaps(items: Jadwal[]): [Jadwal, Jadwal][] {
  const res: [Jadwal, Jadwal][] = [];
  const sorted = [...items].sort((a, b) => a.tanggal_mulai.getTime() - b.tanggal_mulai.getTime());
  for (let i = 0; i < sorted.length; i++)
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].tanggal_mulai > sorted[i].tanggal_selesai) break;
      if (overlaps(sorted[i], sorted[j])) res.push([sorted[i], sorted[j]]);
    }
  return res;
}

export const inYear = (it: Jadwal, year: number) =>
  it.tanggal_mulai.getFullYear() <= year && it.tanggal_selesai.getFullYear() >= year;

export const newId = () => `JDW-${Date.now().toString(36).toUpperCase()}`;
