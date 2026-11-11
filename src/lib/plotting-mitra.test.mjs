import { expect, test } from 'bun:test';
import { jenisPekerjaanSpk } from './plotting-mitra.ts';

test('SPK-BAST stores the full field-work title for each plotting task type', () => {
  expect(jenisPekerjaanSpk('Pendataan')).toBe('Petugas Pendataan Lapangan');
  expect(jenisPekerjaanSpk('Pemeriksaan')).toBe('Petugas Pemeriksaan Lapangan');
  expect(jenisPekerjaanSpk('Pengolahan')).toBe('Petugas Pengolahan');
});