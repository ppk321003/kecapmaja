import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { googleToken, googleRequest } from '../_shared/meetingGoogle.ts';
import { HEADER, sameHeader, eventRows, readEvents } from './storage.ts';
const Person = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(300), category: z.enum(['Organik BPS', 'Mitra Statistik']), gender: z.enum(['L', 'P']), identity: z.string().max(100), unit: z.string().max(300) });
const Participant = Person.extend({ role: z.enum(['Instruktur Nasional', 'Instruktur Daerah', 'Panitia', 'Sit-In', 'Pemeriksa Lapangan (PML)', 'Pendata Lapangan (PPL)']), classId: z.string(), classRole: z.enum(['Peserta', 'Instruktur', 'Pendamping']), roomId: z.string(), spouseId: z.string(), paymentVerified: z.boolean(), receipt: z.number().nonnegative(), dailyRate: z.number().nonnegative(), dailyDays: z.number().int().nonnegative(), transport: z.number().nonnegative(), realExpense: z.number().nonnegative(), noOfficialVehicle: z.boolean() });
const Document = z.enum(['Daftar Hadir', 'Tanda Terima', 'Daftar Uang Harian', 'Daftar Pernyataan Tidak Menggunakan Kendaraan Dinas', 'Daftar Pengeluaran Riil Perjalanan Dinas', 'Daftar Nama Pelaksana Perjalanan Dinas', 'Alokasi Kelas', 'Roomlist']);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)));
const Meeting = z.object({ id: z.string().uuid(), revision: z.number().int().nonnegative(), name: z.string().trim().min(1).max(500), number: z.string().max(500), package: z.enum(['Fullboard', 'Fullday', 'Halfday']), start: date, end: date, location: z.enum(['Hotel', 'Kantor', 'Rumah makan']), venue: z.string().trim().min(1).max(500), address: z.string().max(1000), responsible: z.string().trim().min(1).max(300), organizer: z.string().trim().min(1).max(300), notes: z.string().max(5000), checkIn: z.string(), checkOut: z.string(), participants: z.array(Participant), classes: z.array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1) })), rooms: z.array(z.object({ id: z.string().uuid(), name: z.string().trim().min(1), capacity: z.number().int().min(1) })), documents: z.array(Document) }).superRefine((m, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (m.end < m.start) issue('Tanggal selesai mendahului mulai.');
  if (m.package === 'Fullboard' && (!date.safeParse(m.checkIn).success || !date.safeParse(m.checkOut).success || m.checkOut <= m.checkIn)) issue('Tanggal akomodasi tidak valid.');
  if (!m.documents.includes('Daftar Hadir')) issue('Daftar Hadir wajib dipilih.');
  if (m.package !== 'Fullboard' && m.documents.some(d => d === 'Roomlist' || d === 'Daftar Uang Harian')) issue('Dokumen khusus Fullboard.');
  if (new Set(m.participants.map(p => p.id)).size !== m.participants.length) issue('Peserta duplikat.');
  for (const entries of [m.classes, m.rooms]) if (new Set(entries.map(x => x.name.toLowerCase())).size !== entries.length || new Set(entries.map(x => x.id)).size !== entries.length) issue('Kelas/kamar duplikat.');
  for (const p of m.participants) {
    if (p.classId && !m.classes.some(c => c.id === p.classId)) issue('Kelas peserta tidak valid.');
    if (p.roomId && !m.rooms.some(r => r.id === p.roomId)) issue('Kamar peserta tidak valid.');
    if (p.spouseId && !m.participants.some(s => s.id === p.spouseId && s.spouseId === p.id)) issue('Izin pasangan tidak sesuai.');
  }
});
const Input = z.discriminatedUnion('action', [z.object({ action: z.literal('list') }), z.object({ action: z.literal('save'), meeting: Meeting }), z.object({ action: z.literal('delete'), id: z.string().uuid(), revision: z.number().int().min(1) }), z.object({ action: z.literal('master'), people: z.array(Person), revision: z.number().int().nonnegative() })]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
async function storageSheet(token: string) {
  const meta = await googleRequest(token, '?fields=sheets.properties');
  const titles: string[] = meta.sheets.map((s: any) => s.properties.title);
  for (const title of ['Meeting_Activities', 'Sheet1']) {
    if (!titles.includes(title)) continue;
    const data = await googleRequest(token, `/values/${title}!A1:I1`);
    if (sameHeader(data.values?.[0] || [])) return title;
    if (title === 'Sheet1') {
      const all = await googleRequest(token, '/values/Sheet1');
      if (!all.values?.length) {
        await googleRequest(token, '/values/Sheet1!A1:I1?valueInputOption=RAW', 'PUT', { values: [HEADER] });
        return 'Sheet1';
      }
    }
    if (title === 'Meeting_Activities') throw new Error('Meeting_Activities contains unrelated data; rename that tab before continuing.');
  }
  await googleRequest(token, ':batchUpdate', 'POST', { requests: [{ addSheet: { properties: { title: 'Meeting_Activities' } } }] });
  await googleRequest(token, '/values/Meeting_Activities!A1:I1?valueInputOption=RAW', 'PUT', { values: [HEADER] });
  return 'Meeting_Activities';
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_ANON_KEY'), auth = req.headers.get('Authorization');
    if (!url || !key) return json({ error: 'Supabase configuration unavailable' }, 503);
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Silakan masuk ke akun meeting.' }, 401);
    const client = createClient(url, key, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user || user.is_anonymous || !user.email_confirmed_at) return json({ error: 'Akun meeting terverifikasi diperlukan.' }, 401);
    const input = Input.safeParse(await req.json());
    if (!input.success) return json({ error: input.error.issues.map(i => i.message).join('; ') }, 400);
    const token = await googleToken(), sheet = await storageSheet(token);
    const get = async () => { const data = await googleRequest(token, `/values/${sheet}!A:I`); return readEvents(data.values || [HEADER], user.id); };
    const events = await get(), body = input.data;
    if (body.action === 'list') return json({ meetings: [...events.entries()].filter(([id, e]) => id !== 'master' && e.action !== 'delete').map(([, e]) => ({ ...e.payload, revision: e.revision })), people: events.get('master')?.payload || [], masterRevision: events.get('master')?.revision || 0 });
    const id = body.action === 'master' ? 'master' : body.action === 'save' ? body.meeting.id : body.id;
    const revision = body.action === 'save' ? body.meeting.revision : body.revision;
    if ((events.get(id)?.revision || 0) !== revision) return json({ error: 'Data berubah. Muat ulang sebelum menyimpan.' }, 409);
    if (body.action === 'delete' && !events.has(id)) return json({ error: 'Kegiatan tidak ditemukan.' }, 404);
    const payload = body.action === 'save' ? body.meeting : body.action === 'master' ? body.people : null;
    await googleRequest(token, `/values/${sheet}!A:I:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', { values: eventRows(user.id, id, revision + 1, body.action, payload) });
    const confirmed = (await get()).get(id);
    if (confirmed?.revision !== revision + 1 || confirmed.action !== body.action) throw new Error('Penyimpanan belum terkonfirmasi. Muat ulang untuk memeriksa.');
    return json({ ok: true, revision: revision + 1 });
  } catch (error) { const message = error instanceof Error ? error.message : 'Gagal mengakses Google Sheets'; return json({ error: message }, message.startsWith('CONFLICT:') ? 409 : 502); }
});
