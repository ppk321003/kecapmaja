export const AULA_ROOMS = [
  { name: 'Aula Sinergi', capacity: 40 },
  { name: 'Ruang Kolaborasi', capacity: 10 },
] as const;

export type AulaRoom = (typeof AULA_ROOMS)[number]['name'];
export type AulaAuditAction = 'dibuat' | 'diedit' | 'dihapus';

export interface AulaBooking {
  id: string;
  borrower: string;
  room: AulaRoom;
  date: string;
  startTime: string;
  endTime: string;
  participants: number;
  activity: string;
  status: string;
  createdBy: string;
  rowIndex: number;
}

export interface AulaBookingDraft {
  borrower: string;
  room: AulaRoom;
  date: string;
  startTime: string;
  endTime: string;
  participants: number;
  activity: string;
}

function formatAulaTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('day')}/${value('month')}/${value('year')} ${value('hour')}:${value('minute')}`;
}

export function buildAulaAuditStatus(
  action: AulaAuditAction,
  username: string,
  date: Date = new Date(),
): string {
  return `${action} oleh ${username.trim()} pada ${formatAulaTimestamp(date)}`;
}

export function buildAulaCreatedBy(username: string, date: Date = new Date()): string {
  return `${username.trim()} | ${formatAulaTimestamp(date)}`;
}

export function getAulaBookingOwner(createdBy: string): string {
  return createdBy.split('|', 1)[0].trim();
}

export function isAulaBookingDeleted(status: string): boolean {
  return /^dihapus\b/i.test(status.trim());
}

export function hasAulaBookingConflict(
  draft: Pick<AulaBookingDraft, 'room' | 'date' | 'startTime' | 'endTime'>,
  bookings: AulaBooking[],
  excludeId?: string,
): boolean {
  return bookings.some((booking) =>
    booking.id !== excludeId
    && !isAulaBookingDeleted(booking.status)
    && booking.room === draft.room
    && booking.date === draft.date
    && draft.startTime < booking.endTime
    && draft.endTime > booking.startTime
  );
}

export function isOverCapacity(room: AulaRoom, participants: number): boolean {
  const capacity = AULA_ROOMS.find((item) => item.name === room)?.capacity ?? 0;
  return participants > capacity;
}
