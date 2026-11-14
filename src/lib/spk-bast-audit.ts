export type SpkAuditAction = 'ditambahkan' | 'diedit' | 'dihapus';

export function buildSpkAuditStatus(
  action: SpkAuditAction,
  role: string | null | undefined,
  date: Date = new Date(),
): string {
  const actor = role?.trim() || 'User';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${action} oleh ${actor} pada ${day}/${month}/${year} ${hour}:${minute}`;
}

export function isSpkDeleted(status: unknown): boolean {
  return String(status ?? '').toLowerCase().includes('dihapus');
}

export function resolveSpkFunction(originalFunction: string | null | undefined, actorRole: string | null | undefined): string {
  return originalFunction ?? actorRole?.trim() ?? 'User';
}