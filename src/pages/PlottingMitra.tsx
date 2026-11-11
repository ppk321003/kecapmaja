import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, ChevronsUpDown, X, AlertTriangle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { readSheetValues } from '@/lib/sheets-read';
import { supabase } from '@/integrations/supabase/client';
import { useMitraStatistik } from '@/hooks/use-database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { buildStatus, canAdd, canModify } from '@/lib/kalender-kerja';
import { PaketSpkBast } from '@/components/plotting/PaketSpkBast';
import {
  PLOTTING_SPREADSHEET_ID, PLOTTING_SHEET, MASTER_KEGIATAN_ID, JENIS_TUGAS, Plotting, parsePlotting, parseRupiah, parseNum,
  fmtRp, guessJenis, SbmlLimit, monthlyTotals, effectiveLimit, statusHonor, roleMatches,
} from '@/lib/plotting-mitra';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const isPpk = (role: string) => /admin|ppk|pejabat pembuat komitmen/i.test(role);

async function writeSheet(spreadsheetId: string, operation: 'append' | 'update', range: string, values: (string | number)[][]) {
  const { error, data } = await supabase.functions.invoke('google-sheets', { body: { spreadsheetId, operation, range, values } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

interface KegiatanOpt { role: string; nama: string; beban: string; harga: number; satuan: string }
interface MitraPick { id: string; name: string }
interface FormState {
  rowNumber?: number; id?: string; status?: string;
  fungsi: string; nama_kegiatan: string; jenis_tugas: string; bulan: string; tahun: string;
  tanggal_mulai: string; tanggal_selesai: string; mitra: MitraPick[]; volume: string; satuan: string; honor_satuan: string; keterangan: string;
}

const statusStyle = {
  aman: 'bg-green-100 text-green-800', hampir: 'bg-amber-100 text-amber-900', lewat: 'bg-red-100 text-red-800', na: 'bg-muted text-muted-foreground',
};
const statusText = { aman: 'Aman', hampir: 'Mendekati batas', lewat: 'Melebihi SBML', na: 'SBML belum ada' };

export default function PlottingMitra() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const satker = useSatkerConfigContext();
  const cfg = satker?.getUserSatkerConfig();
  const sheetId = cfg?.plotting_sheet_id || '';
  const masterId = satker?.getUserSatkerSheetId('masterorganik') || '';
  const spkSheetId = satker?.getUserSatkerSheetId('entrikegiatan') || '1ShNjmKUkkg00aAc2yNduv4kAJ8OO58lb2UfaBX8P_BA';
  const qc = useQueryClient();
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulanFilter, setBulanFilter] = useState('semua');
  const [fungsiFilter, setFungsiFilter] = useState('semua');
  const [q, setQ] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [toDelete, setToDelete] = useState<Plotting | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: mitraList = [] } = useMitraStatistik();

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['plotting-mitra', sheetId],
    enabled: !!sheetId,
    queryFn: async () => parsePlotting((await readSheetValues({ spreadsheetId: sheetId, range: `${PLOTTING_SHEET}!A:P` })).values),
    staleTime: 60_000,
  });

  const { data: kegiatanAll = [], isLoading: loadingKeg } = useQuery({
    queryKey: ['master-kegiatan-honor'],
    queryFn: async () => {
      const rows = (await readSheetValues({ spreadsheetId: MASTER_KEGIATAN_ID, range: 'Sheet1!A:F' })).values ?? [];
      return rows.slice(1).filter((r) => (r[2] ?? '').trim()).map((r): KegiatanOpt => ({
        role: r[1] ?? '', nama: (r[2] ?? '').trim(), beban: r[3] ?? '', harga: parseRupiah(r[4]), satuan: r[5] ?? '',
      }));
    },
    staleTime: 600_000,
  });
  const kegiatanOpts = useMemo(() => {
    const list = isPpk(role) ? kegiatanAll : kegiatanAll.filter((k) => roleMatches(k.role, role));
    const seen = new Set<string>();
    return list.filter((k) => !seen.has(k.nama) && seen.add(k.nama));
  }, [kegiatanAll, role]);

  const { data: sbml = null } = useQuery({
    queryKey: ['sbml', masterId, tahun],
    enabled: !!masterId,
    queryFn: async (): Promise<SbmlLimit | null> => {
      const rows = (await readSheetValues({ spreadsheetId: masterId, range: 'MASTER.SBML' })).values ?? [];
      const r = rows.find((x) => String(x[1]).trim() === String(tahun)) ?? rows[rows.length - 1];
      if (!r || rows.length < 2) return null;
      return { pendataan: parseRupiah(r[2]), pemeriksaan: parseRupiah(r[3]), pengolahan: parseRupiah(r[4]) };
    },
    staleTime: 600_000,
  });

  const totals = useMemo(() => monthlyTotals(all, tahun), [all, tahun]);
  const totalOf = (key: string, bulan: number, excludeRow?: number) =>
    all.filter((p) => p.tahun === tahun && p.bulan === bulan && (p.id_mitra || p.nama_mitra).trim().toLowerCase() === key && p.rowNumber !== excludeRow);

  const fungsiList = useMemo(() => Array.from(new Set(all.map((p) => p.fungsi).filter(Boolean))).sort(), [all]);
  const items = useMemo(() => all.filter((p) => p.tahun === tahun
    && (bulanFilter === 'semua' || p.bulan === Number(bulanFilter))
    && (fungsiFilter === 'semua' || p.fungsi === fungsiFilter)
    && (!q.trim() || `${p.nama_mitra} ${p.nama_kegiatan}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => a.bulan - b.bulan || a.nama_mitra.localeCompare(b.nama_mitra)), [all, tahun, bulanFilter, fungsiFilter, q]);

  const rowStatus = (p: Plotting) => {
    const t = totals.find((x) => x.bulan === p.bulan && (x.id_mitra || x.nama).trim().toLowerCase() === (p.id_mitra || p.nama_mitra).trim().toLowerCase());
    if (!t) return 'na' as const;
    return statusHonor(t.total, effectiveLimit(sbml, Object.keys(t.perJenis)));
  };

  const openAdd = () => setForm({
    fungsi: /fungsi/i.test(role) ? role : '', nama_kegiatan: '', jenis_tugas: 'Pendataan', bulan: String(now.getMonth() + 1), tahun: String(tahun),
    tanggal_mulai: '', tanggal_selesai: '', mitra: [], volume: '', satuan: '', honor_satuan: '', keterangan: '',
  });
  const openEdit = (p: Plotting) => setForm({
    rowNumber: p.rowNumber, id: p.id, status: p.status, fungsi: p.fungsi, nama_kegiatan: p.nama_kegiatan, jenis_tugas: p.jenis_tugas,
    bulan: String(p.bulan), tahun: String(p.tahun), tanggal_mulai: p.tanggal_mulai, tanggal_selesai: p.tanggal_selesai,
    mitra: [{ id: p.id_mitra, name: p.nama_mitra }], volume: String(p.volume), satuan: p.satuan, honor_satuan: String(p.honor_satuan), keterangan: p.keterangan,
  });

  const save = async () => {
    if (!form) return;
    if (!form.fungsi.trim() || !form.nama_kegiatan || !form.mitra.length || !parseNum(form.volume)) {
      toast.error('Fungsi, Nama Kegiatan, Mitra, dan Volume wajib diisi');
      return;
    }
    const vol = parseNum(form.volume), hs = parseRupiah(form.honor_satuan);
    const row = (m: MitraPick, id: string, status: string) => [
      id, form.fungsi.trim(), form.nama_kegiatan, form.jenis_tugas, form.bulan, form.tahun, form.tanggal_mulai, form.tanggal_selesai,
      m.id ? `'${m.id}` : '', m.name, vol, form.satuan, hs, vol * hs, form.keterangan, status,
    ];
    setSaving(true);
    try {
      if (form.rowNumber) {
        await writeSheet(sheetId, 'update', `${PLOTTING_SHEET}!A${form.rowNumber}:P${form.rowNumber}`, [row(form.mitra[0], form.id!, buildStatus('diedit', role))]);
      } else {
        const st = buildStatus('ditambahkan', role);
        const base = Date.now().toString(36).toUpperCase();
        await writeSheet(sheetId, 'append', `${PLOTTING_SHEET}!A:P`, form.mitra.map((m, i) => row(m, `PLT-${base}-${i + 1}`, st)));
      }
      setForm(null);
      toast.success(form.rowNumber ? 'Plotting diperbarui' : `${form.mitra.length} mitra diplot`);
      qc.invalidateQueries({ queryKey: ['plotting-mitra', sheetId] });
    } catch (e) {
      toast.error('Gagal menyimpan: ' + (e as Error).message);
    } finally { setSaving(false); }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      await writeSheet(sheetId, 'update', `${PLOTTING_SHEET}!P${toDelete.rowNumber}`, [[buildStatus('dihapus', role)]]);
      toast.success('Plotting dihapus');
      qc.invalidateQueries({ queryKey: ['plotting-mitra', sheetId] });
    } catch (e) { toast.error('Gagal menghapus: ' + (e as Error).message); }
    setToDelete(null);
  };

  const lewatCount = totals.filter((t) => statusHonor(t.total, effectiveLimit(sbml, Object.keys(t.perJenis))) === 'lewat').length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Plotting Mitra</h1>
          <p className="text-sm text-muted-foreground">Perencanaan penggunaan mitra statistik per Fungsi dan pemantauan batas honor SBML.</p>
        </div>
        {canAdd(role) && <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />Tambah Plotting</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total plotting" value={all.filter((p) => p.tahun === tahun).length} />
        <Kpi label="Mitra terlibat" value={new Set(all.filter((p) => p.tahun === tahun).map((p) => p.nama_mitra)).size} />
        <Kpi label="Total rencana honor" value={fmtRp(all.filter((p) => p.tahun === tahun).reduce((s, p) => s + p.total_honor, 0))} />
        <Kpi label="Mitra-bulan melebihi SBML" value={lewatCount} danger={lewatCount > 0} />
        <Kpi label={`SBML ${tahun}`} value={sbml ? `${fmtRp(sbml.pendataan)} / ${fmtRp(sbml.pemeriksaan)} / ${fmtRp(sbml.pengolahan)}` : '-'} small />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{[0, 1, 2, 3, 4].map((i) => now.getFullYear() - 2 + i).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={bulanFilter} onValueChange={setBulanFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="semua">Semua bulan</SelectItem>{BULAN.map((b, i) => <SelectItem key={b} value={String(i + 1)}>{b}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fungsiFilter} onValueChange={setFungsiFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="semua">Semua fungsi</SelectItem>{fungsiList.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="w-64" placeholder="Cari mitra / kegiatan…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Tabs defaultValue="daftar">
        <TabsList>
          <TabsTrigger value="daftar">Daftar Plotting</TabsTrigger>
          <TabsTrigger value="paket">Paket SPK-BAST</TabsTrigger>
          <TabsTrigger value="rekap">Rekap Honor Mitra</TabsTrigger>
          <TabsTrigger value="matriks">Matriks Bulanan</TabsTrigger>
        </TabsList>

        <TabsContent value="daftar">
          <Paged items={items} defaultSize={10}>{(pageItems, offset) => (
          <Card><CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-2">No</th><th className="p-2">Bulan</th><th className="p-2">Mitra</th><th className="p-2">Kegiatan</th><th className="p-2">Tugas</th>
                <th className="p-2 text-right">Volume</th><th className="p-2 text-right">Honor/sat</th><th className="p-2 text-right">Total</th><th className="p-2">Status SBML</th><th className="p-2" />
              </tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Memuat…</td></tr>}
                {!isLoading && items.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Belum ada plotting.</td></tr>}
                {pageItems.map((p, i) => {
                  const st = rowStatus(p);
                  const can = canModify(role, p);
                  return (
                    <tr key={p.rowNumber} className="border-b align-top">
                      <td className="p-2 text-muted-foreground">{offset + i + 1}</td>
                      <td className="p-2">{BULAN[p.bulan - 1] ?? '-'}{p.tanggal_mulai && <div className="text-xs text-muted-foreground">{p.tanggal_mulai}{p.tanggal_selesai && p.tanggal_selesai !== p.tanggal_mulai ? ` – ${p.tanggal_selesai}` : ''}</div>}</td>
                      <td className="p-2 font-medium">{p.nama_mitra}</td>
                      <td className="p-2"><div>{p.nama_kegiatan}</div><div className="text-xs text-muted-foreground">{p.fungsi}</div></td>
                      <td className="p-2"><Badge variant="outline">{p.jenis_tugas}</Badge></td>
                      <td className="p-2 text-right">{p.volume} {p.satuan}</td>
                      <td className="p-2 text-right">{fmtRp(p.honor_satuan)}</td>
                      <td className="p-2 text-right font-semibold">{fmtRp(p.total_honor)}</td>
                      <td className="p-2"><span className={cn('rounded px-2 py-0.5 text-xs', statusStyle[st])}>{statusText[st]}</span></td>
                      <td className="p-2 whitespace-nowrap">{can && <>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent></Card>
          )}</Paged>
        </TabsContent>

        <TabsContent value="paket">
          <PaketSpkBast items={items} role={role} spkSheetId={spkSheetId} masterId={masterId} mitraList={mitraList}
            kegiatanBeban={(n) => kegiatanAll.find((k) => k.nama === n.trim())?.beban ?? ''} />
        </TabsContent>

        <TabsContent value="rekap">
          <Paged items={totals.filter((t) => bulanFilter === 'semua' || t.bulan === Number(bulanFilter))
                  .filter((t) => !q.trim() || t.nama.toLowerCase().includes(q.trim().toLowerCase()))
                  .sort((a, b) => a.bulan - b.bulan || b.total - a.total)} defaultSize={20}>{(rekapRows) => (
          <Card><CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-2">Bulan</th><th className="p-2">Mitra</th><th className="p-2">Rincian kegiatan</th><th className="p-2 text-right">Total honor</th><th className="p-2 text-right">Batas SBML</th><th className="p-2 text-right">Sisa</th><th className="p-2">Status</th>
              </tr></thead>
              <tbody>
                {rekapRows.map((t) => {
                    const lim = effectiveLimit(sbml, Object.keys(t.perJenis));
                    const st = statusHonor(t.total, lim);
                    return (
                      <tr key={t.nama + t.bulan} className="border-b align-top">
                        <td className="p-2">{BULAN[t.bulan - 1]}</td>
                        <td className="p-2 font-medium">{t.nama}</td>
                        <td className="p-2 text-xs">{t.items.map((p) => <div key={p.rowNumber}>{p.fungsi} · {p.nama_kegiatan} · {fmtRp(p.total_honor)}</div>)}</td>
                        <td className="p-2 text-right font-semibold">{fmtRp(t.total)}</td>
                        <td className="p-2 text-right">{lim ? fmtRp(lim) : '-'}</td>
                        <td className={cn('p-2 text-right', lim && t.total > lim && 'font-semibold text-destructive')}>{lim ? fmtRp(lim - t.total) : '-'}</td>
                        <td className="p-2"><span className={cn('rounded px-2 py-0.5 text-xs', statusStyle[st])}>{statusText[st]}</span></td>
                      </tr>
                    );
                  })}
                {totals.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Belum ada data.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
          )}</Paged>
        </TabsContent>

        <TabsContent value="matriks">
          <Paged items={Array.from(new Set(totals.map((t) => t.nama))).filter((n) => !q.trim() || n.toLowerCase().includes(q.trim().toLowerCase())).sort()} defaultSize={20}>{(namaRows) => (
          <Card><CardHeader><CardTitle className="text-base">Total honor per mitra per bulan {tahun}</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-muted-foreground"><th className="p-1 text-left">Mitra</th>{BULAN.map((b) => <th key={b} className="p-1">{b.slice(0, 3)}</th>)}</tr></thead>
                <tbody>
                  {namaRows.map((n) => (
                    <tr key={n} className="border-b">
                      <td className="p-1 font-medium whitespace-nowrap">{n}</td>
                      {BULAN.map((_, i) => {
                        const t = totals.find((x) => x.nama === n && x.bulan === i + 1);
                        if (!t) return <td key={i} className="p-1 text-center text-muted-foreground">·</td>;
                        const st = statusHonor(t.total, effectiveLimit(sbml, Object.keys(t.perJenis)));
                        return <td key={i} className="p-1"><div title={t.items.map((p) => p.nama_kegiatan).join('\n')} className={cn('rounded px-1 py-0.5 text-center', statusStyle[st])}>{(t.total / 1000).toLocaleString('id-ID')}rb</div></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">Hijau: aman · Kuning: ≥90% batas · Merah: melebihi SBML.</p>
            </CardContent>
          </Card>
          )}</Paged>
        </TabsContent>
      </Tabs>

      {form && (
        <Dialog open onOpenChange={(o) => !o && setForm(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{form.rowNumber ? 'Edit Plotting' : 'Tambah Plotting Mitra'}</DialogTitle></DialogHeader>
            <PlotForm form={form} setForm={setForm} role={role} kegiatanOpts={kegiatanOpts} loadingKeg={loadingKeg}
              mitraList={mitraList.filter((m) => m.name).map((m) => ({ id: m.nik, name: m.name, kec: m.kecamatan }))}
              sbml={sbml} existing={(m) => totalOf((m.id || m.name).trim().toLowerCase(), Number(form.bulan), form.rowNumber)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setForm(null)}>Batal</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus plotting?</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.nama_mitra} — {toDelete?.nama_kegiatan}. Data tetap tersimpan sebagai arsip di spreadsheet.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={doDelete}>Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ label, value, danger, small }: { label: string; value: string | number; danger?: boolean; small?: boolean }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('font-bold', small ? 'text-xs' : 'text-xl', danger && 'text-destructive')}>{value}</div>
    </CardContent></Card>
  );
}

function PlotForm({ form, setForm, role, kegiatanOpts, loadingKeg, mitraList, sbml, existing }: {
  form: FormState; setForm: (f: FormState) => void; role: string; kegiatanOpts: KegiatanOpt[]; loadingKeg: boolean;
  mitraList: { id: string; name: string; kec: string }[]; sbml: SbmlLimit | null; existing: (m: MitraPick) => Plotting[];
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });
  const [open, setOpen] = useState(false);
  const keg = kegiatanOpts.find((k) => k.nama === form.nama_kegiatan);
  const total = parseNum(form.volume) * parseRupiah(form.honor_satuan);
  const pickKegiatan = (nama: string) => {
    const k = kegiatanOpts.find((x) => x.nama === nama);
    setForm({ ...form, nama_kegiatan: nama, satuan: k?.satuan ?? form.satuan, honor_satuan: k ? String(k.harga) : form.honor_satuan, jenis_tugas: guessJenis(nama) });
  };
  const toggle = (m: MitraPick) => set('mitra', form.mitra.some((x) => x.name === m.name) ? form.mitra.filter((x) => x.name !== m.name) : form.rowNumber ? [m] : [...form.mitra, m]);
  const fungsiOpts = Array.from(new Set([role, form.fungsi].filter((r) => r && /fungsi/i.test(r))));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>Fungsi *</Label>
        {fungsiOpts.length > 0 && !/admin|ppk|pejabat/i.test(role)
          ? <Select value={form.fungsi} onValueChange={(v) => set('fungsi', v)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{fungsiOpts.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
          : <Input value={form.fungsi} onChange={(e) => set('fungsi', e.target.value)} placeholder="mis. Fungsi Sosial" />}
      </div>
      <div className="space-y-1">
        <Label>Jenis Tugas *</Label>
        <Select value={form.jenis_tugas} onValueChange={(v) => set('jenis_tugas', v)}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{JENIS_TUGAS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label>Nama Kegiatan *</Label>
        <Combobox options={kegiatanOpts.map((k) => ({ value: k.nama, label: k.nama }))} value={form.nama_kegiatan} onValueChange={pickKegiatan}
          placeholder={loadingKeg ? 'Memuat kegiatan…' : 'Pilih atau cari kegiatan'} searchPlaceholder="Cari nama kegiatan…" disabled={loadingKeg}
          emptyText="Tidak ada kegiatan untuk role Anda" />
        {keg?.beban && <p className="text-xs text-muted-foreground">Beban anggaran: {keg.beban}</p>}
      </div>
      <div className="space-y-1">
        <Label>Bulan *</Label>
        <Select value={form.bulan} onValueChange={(v) => set('bulan', v)}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{BULAN.map((b, i) => <SelectItem key={b} value={String(i + 1)}>{b}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="space-y-1"><Label>Tahun *</Label><Input type="number" value={form.tahun} onChange={(e) => set('tahun', e.target.value)} /></div>
      <div className="space-y-1"><Label>Tanggal mulai (opsional)</Label><Input type="date" value={form.tanggal_mulai} onChange={(e) => set('tanggal_mulai', e.target.value)} /></div>
      <div className="space-y-1"><Label>Tanggal selesai (opsional)</Label><Input type="date" value={form.tanggal_selesai} onChange={(e) => set('tanggal_selesai', e.target.value)} /></div>

      <div className="space-y-1 sm:col-span-2">
        <Label>Mitra Statistik * {!form.rowNumber && <span className="text-xs font-normal text-muted-foreground">(bisa pilih beberapa)</span>}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between font-normal">
            <span className="flex items-center gap-2"><Users className="h-4 w-4" />{form.mitra.length ? `${form.mitra.length} mitra dipilih` : 'Pilih mitra'}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" /></Button></PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command filter={(v, s) => v.toLowerCase().includes(s.trim().toLowerCase()) ? 1 : 0}>
              <CommandInput placeholder="Cari nama mitra…" />
              <CommandList><CommandEmpty>Mitra tidak ditemukan</CommandEmpty>
                {mitraList.map((m) => {
                  const sel = form.mitra.some((x) => x.name === m.name);
                  return <CommandItem key={m.id + m.name} value={`${m.name} ${m.kec}`} onSelect={() => toggle(m)}>
                    <Check className={cn('mr-2 h-4 w-4', sel ? 'opacity-100' : 'opacity-0')} />{m.name}<span className="ml-auto text-xs text-muted-foreground">{m.kec}</span>
                  </CommandItem>;
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-1"><Label>Volume *</Label><Input type="number" min={0} value={form.volume} onChange={(e) => set('volume', e.target.value)} /></div>
      <div className="space-y-1"><Label>Satuan</Label><Input value={form.satuan} onChange={(e) => set('satuan', e.target.value)} placeholder="otomatis dari kegiatan" /></div>
      <div className="space-y-1"><Label>Honor per satuan (Rp)</Label><Input value={parseRupiah(form.honor_satuan).toLocaleString('id-ID')} onChange={(e) => set('honor_satuan', e.target.value)} /></div>
      <div className="space-y-1"><Label>Total honor per mitra</Label><div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 font-semibold">{fmtRp(total)}</div></div>
      <div className="space-y-1 sm:col-span-2"><Label>Keterangan</Label><Textarea rows={2} value={form.keterangan} onChange={(e) => set('keterangan', e.target.value)} /></div>

      {form.mitra.length > 0 && (
        <div className="space-y-1 sm:col-span-2">
          <Label>Simulasi honor {BULAN[Number(form.bulan) - 1]} {form.tahun}</Label>
          <div className="divide-y rounded-md border text-sm">
            {form.mitra.map((m, i) => {
              const ex = existing(m);
              const sudah = ex.reduce((s, p) => s + p.total_honor, 0);
              const lim = effectiveLimit(sbml, [form.jenis_tugas, ...ex.map((p) => p.jenis_tugas)]);
              const st = statusHonor(sudah + total, lim);
              return (
                <div key={m.name} className="flex flex-wrap items-center gap-2 p-2">
                  <span className="w-6 text-muted-foreground">{i + 1}.</span>
                  <span className="flex-1 font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">sudah {fmtRp(sudah)} + {fmtRp(total)} = <b>{fmtRp(sudah + total)}</b>{lim ? ` / ${fmtRp(lim)}` : ''}</span>
                  <span className={cn('rounded px-2 py-0.5 text-xs', statusStyle[st])}>{st === 'lewat' && <AlertTriangle className="mr-1 inline h-3 w-3" />}{statusText[st]}</span>
                  {!form.rowNumber && <button onClick={() => toggle(m)}><X className="h-4 w-4 text-muted-foreground" /></button>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Paged<T>({ items, defaultSize, children }: { items: T[]; defaultSize: number; children: (rows: T[], offset: number) => React.ReactNode }) {
  const [size, setSize] = useState(String(defaultSize));
  const [page, setPage] = useState(1);
  const per = size === 'semua' ? Math.max(items.length, 1) : Number(size);
  const pages = Math.max(1, Math.ceil(items.length / per));
  const cur = Math.min(page, pages);
  const offset = (cur - 1) * per;
  const rows = items.slice(offset, offset + per);
  return (
    <div className="space-y-2">
      {children(rows, offset)}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Tampilkan</span>
          <Select value={size} onValueChange={(v) => { setSize(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['10', '20', '50'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              <SelectItem value="semua">Semua</SelectItem>
            </SelectContent>
          </Select>
          <span>{items.length ? `${offset + 1}–${offset + rows.length} dari ${items.length}` : '0 data'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Sebelumnya</Button>
          <span>Hal. {cur} / {pages}</span>
          <Button size="sm" variant="outline" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Selanjutnya</Button>
        </div>
      </div>
    </div>
  );
}
