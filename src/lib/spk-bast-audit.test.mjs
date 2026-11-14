import { expect, test } from 'bun:test';
import { buildSpkAuditStatus, isSpkDeleted, resolveSpkFunction } from './spk-bast-audit.ts';

test('new SPK rows record their creator and timestamp in the audit value', () => {
  expect(buildSpkAuditStatus('ditambahkan', 'Fungsi Sosial', new Date(2026, 10, 11, 14, 8)))
    .toBe('ditambahkan oleh Fungsi Sosial pada 11/11/2026 14:08');
});

test('PPK edits are attributed to PPK in the audit value', () => {
  expect(buildSpkAuditStatus('diedit', 'Pejabat Pembuat Komitmen', new Date(2026, 10, 11, 14, 8)))
    .toBe('diedit oleh Pejabat Pembuat Komitmen pada 11/11/2026 14:08');
});

test('soft deletion records the deleting role and timestamp', () => {
  expect(buildSpkAuditStatus('dihapus', 'Fungsi Sosial', new Date(2026, 10, 11, 14, 8)))
    .toBe('dihapus oleh Fungsi Sosial pada 11/11/2026 14:08');
});

test('soft-deleted SPK rows are hidden while blank legacy status stays active', () => {
  expect(isSpkDeleted('dihapus oleh Fungsi Sosial pada 11/11/2026 14:08')).toBe(true);
  expect(isSpkDeleted('')).toBe(false);
});

test('editing as PPK preserves the original function in column B', () => {
  expect(resolveSpkFunction('Fungsi Sosial', 'Pejabat Pembuat Komitmen')).toBe('Fungsi Sosial');
  expect(resolveSpkFunction('', 'Pejabat Pembuat Komitmen')).toBe('');
  expect(resolveSpkFunction(undefined, 'Fungsi Sosial')).toBe('Fungsi Sosial');
});