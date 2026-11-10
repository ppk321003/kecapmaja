import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { readSheetValues } from '@/lib/sheets-read';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plotting, fmtRp } from '@/lib/plotting-mitra';
import { canModify } from '@/lib/kalender-kerja';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const norm = (s: string) => (s ?? '').trim().toLowerCase();

export interface Paket {
  key: string; fungsi: string; nama_kegiatan: string; jenis_tugas: string; bulan: number; tahun: number;
  periode: string; tanggal_mulai: string; tanggal_selesai: string; satuan: string; honor_satuan: number;
  items: Plotting[]; totalVolume: number; totalHonor: number;
}

/** Kelompokkan plotting per Fungsi + Kegiatan + Jenis Tugas + Bulan/Tahun. */
export function groupPaket(items: Plotting[]): Paket[] {
  const map = new Map<string, Paket>();
  items.forEach((p) => {
    const key = [norm(p.fungsi), norm(p.nama_kegiatan), norm(p.jenis_tugas), p.bulan, p.tahun].join('|');
    const cur = map.get(key) ?? {
      key, fungsi: p.fungsi, nama_kegiatan: p.nama_kegiatan, jenis_tugas: p.jenis_tugas, bulan: p.bulan, tahun: p.tahun,
      periode: `${BULAN[p.bulan - 1] ?? ''} ${p.tahun}`, tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
      satuan: p.satuan, honor_satuan: p.honor_satuan, items: [], totalVolume: 0, totalHonor: 0,
    };
    cur.items.push(p);
    cur.totalVolume += p.volume;
    cur.totalHonor += p.total_honor;
    if (p.tanggal_mulai && (!cur.tanggal_mulai || toIso(p.tanggal_mulai) < toIso(cur.tanggal_mulai))) cur.tanggal_mulai = p.tanggal_mulai;
    if (p.tanggal_selesai && (!cur.tanggal_selesai || toIso(p.tanggal_selesai) > toIso(cur.tanggal_selesai))) cur.tanggal_selesai = p.tanggal_selesai;
    map.set(key, cur);
  });
  return Array.from(map.values()).sort((a, b) => a.bulan - b.bulan || a.nama_kegiatan.localeCompare(b.nama_kegiatan));
}

/** Terima yyyy-mm-dd atau dd/mm/yyyy, kembalikan yyyy-mm-dd. */
function toIso(s: string): string {
  const t = (s ?? '').trim();
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return t.slice(0, 10);
}
const toDmy = (s: string) => {
  const iso = toIso(s);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

interface SpkRow { rowNumber: number; no: string; role: string; periode: string; nama: string; nomorSK: string; tanggalSK: string; koordinator: string; status: string }
const spkKey = (role: string, periode: string, nama: string) => [norm(role), norm(periode), norm(nama)].join('|');

export function PaketSpkBast({ items, role, spkSheetId, masterId, mitraList, kegiatanBeban }: {
  items: Plotting[]; role: string; spkSheetId: string; masterId: string;
  mitraList: { id: string; name: string; nik: string }[];
  kegiatanBeban: (nama: string) => string;
}) {
  const qc = useQueryClient();
  const paket = useMemo(() => groupPaket(items), [items]);
  const [target, setTarget] = useState<Paket | null>(null);
  const [nomorSK, setNomorSK] = useState('');
  const [tanggalSK, setTanggalSK] = useState('');
  const [koordinator, setKoordinator] = useState('');
  const [sending, setSending] = useState(false);

  const { data: spkRows = [], isLoading } = useQuery({
    queryKey: ['spk-bast-rows', spkSheetId],
    enabled: !!spkSheetId,
    queryFn: async (): Promise<SpkRow[]> => {
      const rows = (await readSheetValues({ spreadsheetId: spkSheetId, range: 'Sheet1!A:T' })).values ?? [];
      return rows.slice(1).map((r, i) => ({
        rowNumber: i + 2, no: r[0] ?? '', role: r[1] ?? '', periode: r[2] ?? '', nama: r[4] ?? '',
        nomorSK: r[5] ?? '', tanggalSK: r[6] ?? '', koordinator: r[11] ?? '', status: r[19] ?? '',
      }));
    },
    staleTime: 30_000,
  });
  const spkMap = useMemo(() => new Map(spkRows.map((r) => [spkKey(r.role, r.periode, r.nama), r])), [spkRows]);
  const findSpk = (p: Paket) => spkMap.get(spkKey(p.fungsi, p.periode, p.nama_kegiatan));

  const { data: koordList = [] } = useQuery({
    queryKey: ['master-organik-nama', masterId],
    enabled: !!masterId,
    queryFn: async () => {
      const rows = (await readSheetValues({ spreadsheetId: masterId, range: 'MASTER.ORGANIK!A:D' })).values ?? [];
      return Array.from(new Set(rows.slice(1).map((r) => (r[3] ?? '').trim()).filter(Boolean)));
    },
    staleTime: 600_000,
  });

  const open = (p: Paket) => {
    const ex = findSpk(p);
    setTarget(p);
    setNomorSK(ex?.nomorSK ?? '');
    setTanggalSK(ex?.tanggalSK ? toIso(ex.tanggalSK) : toIso(p.tanggal_mulai));
    setKoordinator(ex?.koordinator ?? '');
  };

  const nikOf = (p: Plotting) => {
    const m = mitraList.find((x) => (p.id_mitra && (x.nik === p.id_mitra || x.id === p.id_mitra)) || norm(x.name) === norm(p.nama_mitra));
    return (m?.nik || p.id_mitra || '').replace(/^'/, '');
  };

  const send = async () => {
    if (!target) return;
    if (!nomorSK.trim() || !tanggalSK || !koordinator) { toast.error('Nomor SK, Tanggal SK, dan Koordinator wajib diisi'); return; }
    if (!target.tanggal_mulai) { toast.error('Tanggal mulai kegiatan belum diisi di plotting'); return; }
    if (toIso(target.tanggal_mulai) < tanggalSK) { toast.error('Tanggal mulai kegiatan tidak boleh lebih awal dari Tanggal SK'); return; }
    setSending(true);
    try {
      const ws = target.items;
      const ex = findSpk(target);
      const beban = kegiatanBeban(target.nama_kegiatan);
      const hs = Math.round(target.honor_satuan);
      const join = (arr: (string | number)[]) => arr.join(' | ');
      const vols = ws.map((w) => w.volume);
      let no = ex?.no;
      if (!no) {
        const colA = (await readSheetValues({ spreadsheetId: spkSheetId, range: 'Sheet1!A:A' })).values ?? [];
        no = String(colA.length || 1);
      }
      const row = [
        no, target.fungsi, target.periode, target.jenis_tugas, target.nama_kegiatan, nomorSK.trim(), toDmy(tanggalSK),
        toDmy(target.tanggal_mulai), toDmy(target.tanggal_selesai || target.tanggal_mulai), hs, target.satuan, koordinator, beban,
        join(ws.map((w) => w.nama_mitra)), join(vols), join(vols), join(ws.map((w) => Math.round(w.volume * w.honor_satuan))),
        Math.round(ws.reduce((s, w) => s + w.volume * w.honor_satuan, 0)), beban, 'Kirim ke PPK', '', '',
        join(ws.map((w) => `'${nikOf(w)}`)), join(ws.map(() => 'Belum ditandatangani')), join(ws.map(() => 'belum')),
      ];
      const body = ex
        ? { spreadsheetId: spkSheetId, operation: 'update', range: `Sheet1!A${ex.rowNumber}:Y${ex.rowNumber}`, values: [row] }
        : { spreadsheetId: spkSheetId, operation: 'append', range: 'Sheet1!A:Y', values: [row] };
      const { error, data } = await supabase.functions.invoke('google-sheets', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(ex ? 'Draf SPK-BAST diperbarui (data lama ditimpa)' : 'Draf SPK-BAST terkirim ke PPK');
      setTarget(null);
      qc.invalidateQueries({ queryKey: ['spk-bast-rows', spkSheetId] });
    } catch (e) {
      toast.error('Gagal mengirim: ' + (e as Error).message);
    } finally { setSending(false); }
  };

  const sentCount = paket.filter((p) => findSpk(p)).length;
  const existing = target ? findSpk(target) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{paket.length} paket kegiatan</Badge>
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="mr-1 h-3 w-3" />{sentCount} sudah ke SPK-BAST</Badge>
        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100"><Clock className="mr-1 h-3 w-3" />{paket.length - sentCount} belum</Badge>
      </div>
      <Card><CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="p-2">No</th><th className="p-2">Periode</th><th className="p-2">Kegiatan</th><th className="p-2">Tugas</th>
            <th className="p-2 text-right">Mitra</th><th className="p-2 text-right">Volume</th><th className="p-2 text-right">Total Honor</th>
            <th className="p-2">Status SPK-BAST</th><th className="p-2" />
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Memeriksa SPK-BAST…</td></tr>}
            {!isLoading && paket.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Belum ada paket kegiatan.</td></tr>}
            {!isLoading && paket.map((p, i) => {
              const ex = findSpk(p);
              const can = p.items.every((it) => canModify(role, it));
              return (
                <tr key={p.key} className={ex ? 'border-b bg-green-50/60' : 'border-b'}>
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2">{p.periode}<div className="text-xs text-muted-foreground">{toDmy(p.tanggal_mulai)}{p.tanggal_selesai && p.tanggal_selesai !== p.tanggal_mulai ? ` – ${toDmy(p.tanggal_selesai)}` : ''}</div></td>
                  <td className="p-2"><div className="font-medium">{p.nama_kegiatan}</div><div className="text-xs text-muted-foreground">{p.fungsi}</div></td>
                  <td className="p-2"><Badge variant="outline">{p.jenis_tugas}</Badge></td>
                  <td className="p-2 text-right">{p.items.length}</td>
                  <td className="p-2 text-right">{p.totalVolume} {p.satuan}</td>
                  <td className="p-2 text-right font-semibold">{fmtRp(p.totalHonor)}</td>
                  <td className="p-2">{ex
                    ? <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"><CheckCircle2 className="h-3 w-3" />Terkirim · {ex.status || 'Kirim ke PPK'}</span>
                    : <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900"><Clock className="h-3 w-3" />Belum ke SPK-BAST</span>}</td>
                  <td className="p-2 whitespace-nowrap">{can && (ex
                    ? <Button size="sm" variant="outline" onClick={() => open(p)}><RefreshCw className="mr-1 h-4 w-4" />Kirim Ulang</Button>
                    : <Button size="sm" onClick={() => open(p)}><Send className="mr-1 h-4 w-4" />Kirim ke SPK-BAST</Button>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{existing ? 'Kirim Ulang Draf SPK-BAST' : 'Jadikan Draf SPK-BAST'}</DialogTitle>
            <DialogDescription>{target?.nama_kegiatan} · {target?.periode} · {target?.items.length} mitra · {fmtRp(target?.totalHonor ?? 0)}</DialogDescription>
          </DialogHeader>
          {existing && <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            Kegiatan ini sudah ada di SPK-BAST (baris ke-{existing.rowNumber}). Mengirim ulang akan menimpa baris tersebut dengan data plotting terbaru.
          </div>}
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nomor SK *</Label><Input value={nomorSK} onChange={(e) => setNomorSK(e.target.value)} placeholder="Contoh: 012/3210/KU.01/2026" /></div>
            <div className="space-y-1"><Label>Tanggal SK *</Label><Input type="date" value={tanggalSK} onChange={(e) => setTanggalSK(e.target.value)} /></div>
            <div className="space-y-1"><Label>Koordinator *</Label>
              <Combobox options={koordList.map((n) => ({ value: n, label: n }))} value={koordinator} onValueChange={setKoordinator} placeholder="Pilih pegawai organik" />
            </div>
            <p className="text-xs text-muted-foreground">Komponen POK, daftar mitra, NIK, volume, dan honor diisi otomatis. Status: <b>Kirim ke PPK</b>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Batal</Button>
            <Button onClick={send} disabled={sending}>{sending ? 'Mengirim…' : existing ? 'Timpa & Kirim' : 'Kirim'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
