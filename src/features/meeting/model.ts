export const ROLES = ['Instruktur Nasional', 'Instruktur Daerah', 'Panitia', 'Sit-In', 'Pemeriksa Lapangan (PML)', 'Pendata Lapangan (PPL)'] as const;
export const DOCUMENTS = ['Daftar Hadir', 'Tanda Terima', 'Daftar Uang Harian', 'Daftar Pernyataan Tidak Menggunakan Kendaraan Dinas', 'Daftar Pengeluaran Riil Perjalanan Dinas', 'Daftar Nama Pelaksana Perjalanan Dinas', 'Alokasi Kelas', 'Roomlist'] as const;
export type DocumentName = typeof DOCUMENTS[number];
export interface Person { id: string; name: string; category: 'Organik BPS' | 'Mitra Statistik'; gender: 'L' | 'P'; identity: string; unit: string; }
export interface Participant extends Person { role: string; classId: string; classRole: 'Peserta' | 'Instruktur' | 'Pendamping'; roomId: string; spouseId: string; paymentVerified: boolean; receipt: number; dailyRate: number; dailyDays: number; transport: number; realExpense: number; noOfficialVehicle: boolean; }
export interface MeetingClass { id: string; name: string; }
export interface Room { id: string; name: string; capacity: number; }
export interface Meeting { id: string; revision: number; name: string; number: string; package: 'Fullboard' | 'Fullday' | 'Halfday'; start: string; end: string; location: string; venue: string; address: string; responsible: string; organizer: string; notes: string; checkIn: string; checkOut: string; participants: Participant[]; classes: MeetingClass[]; rooms: Room[]; documents: DocumentName[]; }
export const newMeeting = (): Meeting => ({ id: crypto.randomUUID(), revision: 0, name: '', number: '', package: 'Fullday', start: '', end: '', location: 'Kantor', venue: '', address: '', responsible: '', organizer: '', notes: '', checkIn: '', checkOut: '', participants: [], classes: [], rooms: [], documents: ['Daftar Hadir'] });
export const participantFrom = (p: Person): Participant => ({ ...p, role: 'Pendata Lapangan (PPL)', classId: '', classRole: 'Peserta', roomId: '', spouseId: '', paymentVerified: false, receipt: 0, dailyRate: 0, dailyDays: 0, transport: 0, realExpense: 0, noOfficialVehicle: false });
export const availableDocuments = (m: Meeting): DocumentName[] => DOCUMENTS.filter(d => m.package === 'Fullboard' || (d !== 'Roomlist' && d !== 'Daftar Uang Harian'));
export function nights(m: Meeting) { return m.checkIn && m.checkOut ? Math.max(0, Math.round((Date.parse(m.checkOut) - Date.parse(m.checkIn)) / 86400000)) : 0; }
export function roomWarnings(m: Meeting): string[] {
  if (m.package !== 'Fullboard') return [];
  const warnings: string[] = [];
  for (const p of m.participants) if (!m.rooms.some(r => r.id === p.roomId)) warnings.push(`${p.name}: belum memperoleh kamar.`);
  for (const r of m.rooms) {
    const occupants = m.participants.filter(p => p.roomId === r.id);
    if (occupants.length > r.capacity) warnings.push(`Kamar ${r.name}: ${occupants.length} orang melebihi kapasitas ${r.capacity}.`);
    if (new Set(occupants.map(p => p.gender)).size > 1) {
      const validCouple = occupants.length === 2 && occupants[0].spouseId === occupants[1].id && occupants[1].spouseId === occupants[0].id;
      if (!validCouple) warnings.push(`Kamar ${r.name}: campuran jenis kelamin tanpa izin pasangan.`);
    }
  }
  return warnings;
}
export function autoAssignRooms(m: Meeting): Meeting {
  const people = m.participants.map(p => ({ ...p }));
  // Preserve all existing manual assignments. Allocate only unassigned people.
  for (const p of people.filter(p => !p.roomId)) {
    const room = m.rooms.find(r => {
      const occupants = people.filter(o => o.roomId === r.id);
      return occupants.length < r.capacity && occupants.every(o => o.gender === p.gender);
    });
    if (room) p.roomId = room.id;
  }
  return { ...m, participants: people };
}
export function validateMeeting(m: Meeting): string[] {
  const errors: string[] = [];
  if (!m.name.trim()) errors.push('Nama kegiatan wajib diisi.');
  if (!m.start || !m.end || m.end < m.start) errors.push('Tanggal mulai dan selesai tidak valid.');
  if (!m.venue.trim()) errors.push('Nama tempat wajib diisi.');
  if (!m.responsible.trim() || !m.organizer.trim()) errors.push('Penanggung jawab dan penyelenggara wajib diisi.');
  if (m.package === 'Fullboard' && (!m.checkIn || !m.checkOut || m.checkOut <= m.checkIn)) errors.push('Tanggal check-in dan check-out Fullboard tidak valid.');
  if (new Set(m.participants.map(p => p.id)).size !== m.participants.length) errors.push('Peserta tidak boleh duplikat.');
  if (m.classes.some(c => !c.name.trim()) || new Set(m.classes.map(c => c.name.trim().toLowerCase())).size !== m.classes.length) errors.push('Nama kelas harus terisi dan unik.');
  if (m.rooms.some(r => !r.name.trim() || !Number.isInteger(r.capacity) || r.capacity < 1) || new Set(m.rooms.map(r => r.name.trim().toLowerCase())).size !== m.rooms.length) errors.push('Nama kamar harus unik dan kapasitas minimal 1.');
  for (const p of m.participants) {
    if (!p.name.trim() || !ROLES.includes(p.role as typeof ROLES[number])) errors.push('Nama dan jabatan peserta wajib valid.');
    if (p.classId && !m.classes.some(c => c.id === p.classId)) errors.push(`${p.name}: kelas tidak ditemukan.`);
    if ([p.receipt, p.dailyRate, p.dailyDays, p.transport, p.realExpense].some(n => !Number.isFinite(n) || n < 0)) errors.push(`${p.name}: pembayaran harus berupa angka tidak negatif.`);
    if (p.spouseId && !m.participants.some(s => s.id === p.spouseId && s.spouseId === p.id)) errors.push(`${p.name}: izin pasangan harus saling sesuai.`);
  }
  return [...new Set(errors)];
}
export function documentRows(m: Meeting, doc: DocumentName): { headers: string[]; rows: (string | number)[][] } {
  const signature = 'Tanda tangan';
  const base = ['No', 'Nama', 'Kategori', 'Jabatan'];
  const people = m.participants;
  const common = (p: Participant, i: number) => [i + 1, p.name, p.category, p.role];
  if (doc === 'Alokasi Kelas') return { headers: [...base, 'Kelas', 'Posisi', signature], rows: people.map((p, i) => [...common(p, i), m.classes.find(c => c.id === p.classId)?.name || 'Belum dialokasikan', p.classRole, '']) };
  if (doc === 'Roomlist') return { headers: [...base, 'L/P', 'Kamar', 'Check-in', 'Check-out', signature], rows: people.map((p, i) => [...common(p, i), p.gender, m.rooms.find(r => r.id === p.roomId)?.name || 'Belum dialokasikan', m.checkIn, m.checkOut, '']) };
  if (doc === 'Tanda Terima') return { headers: [...base, 'Jumlah (Rp)', 'Verifikasi', signature], rows: people.map((p, i) => [...common(p, i), p.paymentVerified ? p.receipt : 0, p.paymentVerified ? 'Disetujui' : 'Belum diverifikasi', '']) };
  if (doc === 'Daftar Uang Harian') return { headers: [...base, 'Hari', 'Tarif (Rp)', 'Total (Rp)', 'Verifikasi', signature], rows: people.map((p, i) => [...common(p, i), p.dailyDays, p.dailyRate, p.paymentVerified ? p.dailyDays * p.dailyRate : 0, p.paymentVerified ? 'Disetujui' : 'Belum diverifikasi', '']) };
  if (doc === 'Daftar Pengeluaran Riil Perjalanan Dinas') return { headers: [...base, 'Transport (Rp)', 'Pengeluaran riil (Rp)', 'Total (Rp)', 'Verifikasi', signature], rows: people.map((p, i) => [...common(p, i), p.paymentVerified ? p.transport : 0, p.paymentVerified ? p.realExpense : 0, p.paymentVerified ? p.transport + p.realExpense : 0, p.paymentVerified ? 'Disetujui' : 'Belum diverifikasi', '']) };
  if (doc === 'Daftar Pernyataan Tidak Menggunakan Kendaraan Dinas') return { headers: [...base, 'Pernyataan tidak menggunakan kendaraan dinas', signature], rows: people.map((p, i) => [...common(p, i), p.noOfficialVehicle ? 'Ya' : 'Belum menyatakan', '']) };
  if (doc === 'Daftar Nama Pelaksana Perjalanan Dinas') return { headers: [...base, 'NIP/NIK', 'Unit kerja', 'Nomor surat tugas', signature], rows: people.map((p, i) => [...common(p, i), p.identity, p.unit, m.number, '']) };
  return { headers: [...base, 'Unit kerja', signature], rows: people.map((p, i) => [...common(p, i), p.unit, '']) };
}
