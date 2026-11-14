export type SpkAuditAction = 'ditambahkan' | 'diedit' | 'dihapus';

export function buildSpkAuditStatus(
  action: SpkAuditAction,
  role: string | null | undefined,
  date: Date = new Date(),
): string {
  const actor = role?.trim() || 'User';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const day = value('day');
  const month = value('month');
  const year = value('year');
  const hour = value('hour');
  const minute = value('minute');
  return `${action} oleh ${actor} pada ${day}/${month}/${year} ${hour}:${minute}`;
}

export function isSpkDeleted(status: unknown): boolean {
  return String(status ?? '').toLowerCase().includes('dihapus');
}

export function resolveSpkFunction(originalFunction: string | null | undefined, actorRole: string | null | undefined): string {
  return originalFunction ?? actorRole?.trim() ?? 'User';
}