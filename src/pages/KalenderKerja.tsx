import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, Pencil, Trash2, AlertTriangle, Grid3x3, GanttChart, CalendarRange, LayoutDashboard, Check, ChevronsUpDown, X, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { readSheetValues } from '@/lib/sheets-read';
import { supabase } from '@/integrations/supabase/client';
import { useOrganikBPS } from '@/hooks/use-database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  KALENDER_SHEET, FUNGSI_OPTIONS, TAHAPAN_OPTIONS, Jadwal, parseRows, countPerDay, dayKey, findOverlaps,
  findOverlapGroups, inYear, canAdd, isAdminRole, canModify, buildStatus, joinOrganik, toIsoDate, toDdMmYyyy, newId, parseTanggal,
} from '@/lib/kalender-kerja';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const OTHER = '__lainnya__';

type View = 'heatmap' | 'gantt' | 'kalender' | 'ringkasan' | 'rekap';

const heatClass = (n: number) =>
  n <= 0 ? 'bg-muted/50 text-muted-foreground'
    : n === 1 ? 'bg-green-100 text-green-800'
      : n === 2 ? 'bg-green-200 text-green-900'
        : n === 3 ? 'bg-amber-200 text-amber-950'
          : n === 4 ? 'bg-orange-300 text-orange-950'
            : n === 5 ? 'bg-rose-200 text-rose-950'
              : n === 6 ? 'bg-rose-400 text-rose-950'
                : 'bg-red-800 text-white font-semibold';

const FUNGSI_COLORS: Record<string, { label: string; soft: string; solid: string }> = {
  sosial: { label: 'Fungsi Sosial', soft: 'border-sky-300 bg-sky-100 text-sky-900', solid: 'bg-sky-500' },
  neraca: { label: 'Fungsi Neraca', soft: 'border-amber-300 bg-amber-100 text-amber-900', solid: 'bg-amber-500' },
  nerwilis: { label: 'Fungsi Neraca', soft: 'border-amber-300 bg-amber-100 text-amber-900', solid: 'bg-amber-500' },
  produksi: { label: 'Fungsi Produksi', soft: 'border-emerald-300 bg-emerald-100 text-emerald-900', solid: 'bg-emerald-500' },
  distribusi: { label: 'Fungsi Distribusi', soft: 'border-violet-300 bg-violet-100 text-violet-900', solid: 'bg-violet-500' },
  ipds: { label: 'Fungsi IPDS', soft: 'border-cyan-300 bg-cyan-100 text-cyan-900', solid: 'bg-cyan-500' },
  umum: { label: 'Fungsi Umum', soft: 'border-slate-300 bg-slate-100 text-slate-800', solid: 'bg-slate-500' },
};
const fungsiColor = (fungsi: string, variant: 'soft' | 'solid' = 'soft') => {
  const key = fungsi.replace(/^\s*fungsi\s*/i, '').trim().toLowerCase();
  return FUNGSI_COLORS[key]?.[variant] ?? (variant === 'solid' ? 'bg-gray-500' : 'border-gray-300 bg-gray-100 text-gray-800');
};
const fungsiDisplayName = (fungsi: string) => {
  const key = fungsi.replace(/^\s*fungsi\s*/i, '').trim().toLowerCase();
  return FUNGSI_COLORS[key]?.label ?? fungsi;
};
const FUNGSI_LEGEND = [
  ['Sosial', 'sosial'],
  ['Neraca', 'neraca'],
  ['Produksi', 'produksi'],
  ['Distribusi', 'distribusi'],
  ['IPDS', 'ipds'],
  ['Umum', 'umum'],
] as const;

/** "Fungsi Sosial" -> "Sosial" */
const fungsiFromRole = (role: string) => role.replace(/^\s*fungsi\s*/i, '').trim();

const fmtRange = (j: Jadwal) =>
  j.tanggal_mulai.getTime() === j.tanggal_selesai.getTime()
    ? toDdMmYyyy(j.tanggal_mulai)
    : `${toDdMmYyyy(j.tanggal_mulai)} – ${toDdMmYyyy(j.tanggal_selesai)}`;

async function writeSheet(spreadsheetId: string, operation: 'append' | 'update', range: string, values: string[][]) {
  const { error, data } = await supabase.functions.invoke('google-sheets', { body: { spreadsheetId, operation, range, values } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

interface FormState {
  id?: string; rowNumber?: number; status?: string;
  fungsi: string; nama_kegiatan: string; tahapan: string; tanggal_mulai: string; tanggal_selesai: string;
  penanggung_jawab: string; keterangan: string; organik: string[];
}
const emptyForm = (): FormState => ({ fungsi: '', nama_kegiatan: '', tahapan: '', tanggal_mulai: '', tanggal_selesai: '', penanggung_jawab: '', keterangan: '', organik: [] });

export default function KalenderKerja() {
  const { user } = useAuth();
  const satker = useSatkerConfigContext();
  const sheetId = satker?.getUserSatkerConfig()?.kalender_sheet_id || '';
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [fungsiFilter, setFungsiFilter] = useState('semua');
  const [view, setView] = useState<View>('heatmap');
  const [detailDay, setDetailDay] = useState<{ title: string; items: Jadwal[] } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [toDelete, setToDelete] = useState<Jadwal | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: all = [], isLoading, error } = useQuery({
    queryKey: ['kalender-kerja', sheetId],
    enabled: !!sheetId,
    queryFn: async () => parseRows((await readSheetValues({ spreadsheetId: sheetId, range: `${KALENDER_SHEET}!A:J` })).values),
    staleTime: 60_000,
  });

  const fungsiList = useMemo(() => Array.from(new Set([...FUNGSI_OPTIONS, ...all.map((j) => j.fungsi).filter(Boolean)])), [all]);
  const items = useMemo(
    () => all.filter((j) => inYear(j, year) && (fungsiFilter === 'semua' || j.fungsi === fungsiFilter)),
    [all, year, fungsiFilter],
  );
  const perDay = useMemo(() => countPerDay(items, year), [items, year]);
  const role = user?.role ?? '';
  const allowAdd = canAdd(role);

  const openDay = (d: Date) => setDetailDay({ title: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), items: perDay.get(dayKey(d)) ?? [] });
  const openEdit = (j: Jadwal) => setForm({
    id: j.id, rowNumber: j.rowNumber, status: j.status, fungsi: j.fungsi, nama_kegiatan: j.nama_kegiatan, tahapan: j.tahapan,
    tanggal_mulai: toIsoDate(j.tanggal_mulai), tanggal_selesai: toIsoDate(j.tanggal_selesai), penanggung_jawab: j.penanggung_jawab,
    keterangan: j.keterangan, organik: j.organik,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['kalender-kerja', sheetId] });

  const save = async () => {
    if (!form) return;
    if (!form.fungsi.trim() || !form.nama_kegiatan.trim() || !form.tanggal_mulai) {
      toast.error('Fungsi, Nama Kegiatan, dan Tanggal Mulai wajib diisi');
      return;
    }
    const selesai = form.tanggal_selesai || form.tanggal_mulai;
    if (parseTanggal(selesai)! < parseTanggal(form.tanggal_mulai)!) {
      toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai');
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!form.rowNumber;
      const row = [
        form.id || newId(), form.fungsi.trim(), form.nama_kegiatan.trim(), form.tahapan.trim(), form.tanggal_mulai, selesai,
        form.penanggung_jawab.trim(), form.keterangan.trim(), joinOrganik(form.organik), buildStatus(isEdit ? 'diedit' : 'ditambahkan', role),
      ];
      if (isEdit) await writeSheet(sheetId, 'update', `${KALENDER_SHEET}!A${form.rowNumber}:J${form.rowNumber}`, [row]);
      else await writeSheet(sheetId, 'append', `${KALENDER_SHEET}!A:J`, [row]);
      setForm(null);
      toast.success(isEdit ? 'Kegiatan diperbarui' : 'Kegiatan ditambahkan');
      refresh();
    } catch (e: any) {
      toast.error('Gagal menyimpan: ' + (e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      await writeSheet(sheetId, 'update', `${KALENDER_SHEET}!J${toDelete.rowNumber}`, [[buildStatus('dihapus', role)]]);
      toast.success('Kegiatan dihapus');
      setToDelete(null);
      setDetailDay(null);
      refresh();
    } catch (e: any) {
      toast.error('Gagal menghapus: ' + (e?.message ?? e));
    }
  };

  if (satker?.isLoading) return <div className="p-6 text-muted-foreground">Memuat konfigurasi…</div>;
  if (!sheetId)
    return (
      <Card className="m-6"><CardContent className="p-6 text-muted-foreground">
        Spreadsheet Kalender Kerja untuk satker Anda belum diatur. Isi kolom <b>kalender</b> (AC) pada sheet satker_config.
      </CardContent></Card>
    );

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Kalender Kerja</h1>
            <p className="text-sm text-muted-foreground">Agenda kegiatan seluruh Fungsi dalam satu tahun</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(+v)}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fungsiFilter} onValueChange={setFungsiFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Fungsi</SelectItem>
              {fungsiList.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          {allowAdd && <Button onClick={() => setForm({ ...emptyForm(), fungsi: isAdminRole(role) ? '' : fungsiFromRole(role) })}><Plus className="mr-1 h-4 w-4" />Tambah</Button>}
        </div>
      </div>

      <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} className="justify-start flex-wrap">
        <ToggleGroupItem value="heatmap"><Grid3x3 className="mr-1 h-4 w-4" />Heatmap</ToggleGroupItem>
        <ToggleGroupItem value="gantt"><GanttChart className="mr-1 h-4 w-4" />Timeline</ToggleGroupItem>
        <ToggleGroupItem value="kalender"><CalendarRange className="mr-1 h-4 w-4" />Kalender Bulanan</ToggleGroupItem>
        <ToggleGroupItem value="ringkasan"><LayoutDashboard className="mr-1 h-4 w-4" />Ringkasan & Overlap</ToggleGroupItem>
        <ToggleGroupItem value="rekap"><Users className="mr-1 h-4 w-4" />Rekap Karyawan</ToggleGroupItem>
      </ToggleGroup>

      {isLoading ? <div className="text-muted-foreground">Memuat jadwal…</div>
        : error ? <div className="text-destructive">Gagal memuat data: {String((error as Error).message)}</div>
        : (
          <>
            {view === 'heatmap' && <HeatmapView year={year} perDay={perDay} onDay={openDay} />}
            {view === 'gantt' && <GanttView year={year} items={items} onItem={(j) => setDetailDay({ title: j.nama_kegiatan, items: [j] })} />}
            {view === 'kalender' && <MonthView year={year} perDay={perDay} onDay={openDay} />}
            {view === 'ringkasan' && <SummaryView year={year} items={items} perDay={perDay} onItem={(j) => setDetailDay({ title: j.nama_kegiatan, items: [j] })} />}
            {view === 'rekap' && <RekapView year={year} items={items} onItem={(j) => setDetailDay({ title: j.nama_kegiatan, items: [j] })} />}
          </>
        )}

      <Sheet open={!!detailDay} onOpenChange={(o) => !o && setDetailDay(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>{detailDay?.title}</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-3">
            {detailDay?.items.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada kegiatan.</p>}
            {detailDay?.items.map((j) => (
              <Card key={j.id}><CardContent className="space-y-2 p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{j.nama_kegiatan}</div>
                  <Badge variant="outline" className={cn('shrink-0', fungsiColor(j.fungsi))}>{fungsiDisplayName(j.fungsi)}</Badge>
                </div>
                {j.tahapan && <div className="text-muted-foreground">Tahapan: {j.tahapan}</div>}
                <div>{fmtRange(j)}</div>
                {j.penanggung_jawab && <div>PIC: {j.penanggung_jawab}</div>}
                {j.keterangan && <div className="text-muted-foreground">{j.keterangan}</div>}
                {j.organik.length > 0 && (
                  <div className="min-w-0 rounded-md bg-muted/40 p-2">
                    <div className="mb-1 text-xs font-medium text-muted-foreground">Organik Terlibat ({j.organik.length})</div>
                    <ol className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs sm:grid-cols-2">
                      {j.organik.map((o, i) => (
                        <li key={o} className="flex min-w-0 gap-1">
                          <span className="w-5 shrink-0 text-right text-muted-foreground">{i + 1}.</span>
                          <span className="min-w-0 truncate" title={o}>{o}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {j.status && <div className="text-xs italic text-muted-foreground">{j.status}</div>}
                {canModify(role, j) && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => { setDetailDay(null); openEdit(j); }}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setToDelete(j)}><Trash2 className="mr-1 h-3 w-3" />Hapus</Button>
                  </div>
                )}
              </CardContent></Card>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {form && <JadwalForm form={form} setForm={setForm} saving={saving} onSave={save}
        fungsiList={isAdminRole(role) ? fungsiList : Array.from(new Set([fungsiFromRole(role), form.fungsi].filter(Boolean)))} />}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kegiatan?</AlertDialogTitle>
            <AlertDialogDescription>"{toDelete?.nama_kegiatan}" tidak akan tampil lagi. Arsipnya tetap tersimpan di spreadsheet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Kegiatan per hari: 0 netral, 1 hijau halus, 2 hijau, 3 kuning, 4 oranye, 5 merah halus, 6 merah tegas, 7 atau lebih merah bata">
      <span className="mr-1">Sepi</span>
      {Array.from({ length: 8 }, (_, n) => (
        <span key={n} title={n === 7 ? '7 atau lebih kegiatan' : `${n} kegiatan`}
          className={cn('flex h-5 w-5 items-center justify-center rounded-sm text-[10px]', heatClass(n))}>
          {n}
        </span>
      ))}
      <span className="ml-1">Padat (7+)</span>
    </div>
  );
}

function HeatmapView({ year, perDay, onDay }: { year: number; perDay: Map<string, Jadwal[]>; onDay: (d: Date) => void }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">Peta Kepadatan {year}</CardTitle><Legend /></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0.5 text-xs">
          <colgroup>
            <col className="w-10" />
            {Array.from({ length: 31 }, (_, i) => <col key={i} />)}
          </colgroup>
          <thead><tr><th />{Array.from({ length: 31 }, (_, i) => <th key={i} className="font-normal text-muted-foreground">{i + 1}</th>)}</tr></thead>
          <tbody>
            {BULAN.map((b, m) => {
              const days = new Date(year, m + 1, 0).getDate();
              return (
                <tr key={b}>
                  <td className="pr-2 font-medium xl:text-sm">{b}</td>
                  {Array.from({ length: 31 }, (_, i) => {
                    if (i >= days) return <td key={i} />;
                    const d = new Date(year, m, i + 1);
                    const n = perDay.get(dayKey(d))?.length ?? 0;
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <td key={i}>
                        <button title={`${i + 1} ${b}: ${n} kegiatan`} onClick={() => onDay(d)}
                          className={cn('flex h-[clamp(1.5rem,3vw,3rem)] w-full items-center justify-center rounded-sm transition hover:ring-2 hover:ring-ring', heatClass(n), weekend && n === 0 && 'opacity-50')}>
                          {n > 0 ? n : ''}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function GanttView({ year, items, onItem }: { year: number; items: Jadwal[]; onItem: (j: Jadwal) => void }) {
  const start = new Date(year, 0, 1).getTime();
  const total = new Date(year + 1, 0, 1).getTime() - start;
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - start) / total) * 100));
  const groups = useMemo(() => {
    const g = new Map<string, Jadwal[]>();
    [...items].sort((a, b) => a.tanggal_mulai.getTime() - b.tanggal_mulai.getTime()).forEach((j) => g.set(j.fungsi || '-', [...(g.get(j.fungsi || '-') ?? []), j]));
    return [...g.entries()];
  }, [items]);
  const DAY = 86_400_000;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Timeline {year}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="ml-48 grid grid-cols-12 border-b text-xs text-muted-foreground">{BULAN.map((b) => <div key={b} className="border-l px-1">{b}</div>)}</div>
          {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada kegiatan.</p>}
          {groups.map(([f, list]) => (
            <div key={f} className="border-b py-2">
              <div className="mb-1">
                <Badge variant="outline" className={cn('font-semibold', fungsiColor(f))}>{fungsiDisplayName(f)}</Badge>
              </div>
              {list.map((j) => {
                const l = pct(j.tanggal_mulai);
                const w = Math.max(0.4, pct(new Date(j.tanggal_selesai.getTime() + DAY)) - l);
                return (
                  <div key={j.id} className="flex items-center">
                    <div className="w-48 truncate pr-2 text-xs" title={j.nama_kegiatan}>{j.nama_kegiatan}</div>
                    <div className="relative h-5 flex-1 bg-muted/40">
                      <button onClick={() => onItem(j)} title={`${j.nama_kegiatan} (${fmtRange(j)})`}
                        aria-label={`${fungsiDisplayName(j.fungsi)}: ${j.nama_kegiatan} (${fmtRange(j)})`}
                        className={cn('absolute top-0.5 h-4 rounded hover:opacity-80', fungsiColor(j.fungsi, 'solid'))} style={{ left: `${l}%`, width: `${w}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MonthView({ year, perDay, onDay }: { year: number; perDay: Map<string, Jadwal[]>; onDay: (d: Date) => void }) {
  const [month, setMonth] = useState(new Date().getFullYear() === year ? new Date().getMonth() : 0);
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <Button variant="outline" size="sm" disabled={month === 0} onClick={() => setMonth(month - 1)}>‹</Button>
        <CardTitle className="text-base">{BULAN_PANJANG[month]} {year}</CardTitle>
        <Button variant="outline" size="sm" disabled={month === 11} onClick={() => setMonth(month + 1)}>›</Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {HARI.map((h) => <div key={h} className="text-center font-medium text-muted-foreground">{h}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const list = perDay.get(dayKey(d)) ?? [];
            return (
              <button key={i} onClick={() => onDay(d)} className={cn('min-h-24 rounded-md border p-1 text-left hover:bg-accent', list.length > 1 && 'border-primary')}>
                <div className="font-semibold">{d.getDate()}</div>
                {list.slice(0, 3).map((j) => <div key={j.id} title={fungsiDisplayName(j.fungsi)} className={cn('mt-0.5 truncate rounded border px-1', fungsiColor(j.fungsi))}>{j.nama_kegiatan}</div>)}
                {list.length > 3 && <div className="text-muted-foreground">+{list.length - 3} lainnya</div>}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryView({ year, items, perDay, onItem }: { year: number; items: Jadwal[]; perDay: Map<string, Jadwal[]>; onItem: (j: Jadwal) => void }) {
  const DAY = 86_400_000;
  const perMonthByFungsi = BULAN.map(() => new Map<string, Set<string>>());
  perDay.forEach((dayItems, key) => {
    const month = Number(key.slice(5, 7)) - 1;
    dayItems.forEach((j) => {
      const fungsi = j.fungsi || '-';
      const ids = perMonthByFungsi[month].get(fungsi) ?? new Set<string>();
      ids.add(j.id);
      perMonthByFungsi[month].set(fungsi, ids);
    });
  });
  const perMonth = perMonthByFungsi.map((counts) => [...counts.values()].reduce((sum, ids) => sum + ids.size, 0));
  const max = Math.max(1, ...perMonth);
  const busiest = perMonth.indexOf(Math.max(...perMonth));
  const top5 = [...perDay.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  const peak = top5[0];
  const ov = findOverlaps(items);
  const overlapGroups = findOverlapGroups(items);
  const hariBentrok = [...perDay.values()].filter((v) => v.length >= 2).length;
  const perFungsi = useMemo(() => {
    const m = new Map<string, { keg: number; hari: Set<string>; ov: number }>();
    items.forEach((j) => {
      const e = m.get(j.fungsi || '-') ?? { keg: 0, hari: new Set<string>(), ov: 0 };
      e.keg++;
      for (let t = j.tanggal_mulai.getTime(); t <= j.tanggal_selesai.getTime(); t += DAY) e.hari.add(dayKey(new Date(t)));
      m.set(j.fungsi || '-', e);
    });
    findOverlaps(items).forEach(([a, b]) => {
      const ea = m.get(a.fungsi || '-');
      const eb = m.get(b.fungsi || '-');
      if (ea) ea.ov++;
      if (eb) eb.ov++;
    });
    return [...m.entries()].sort((a, b) => b[1].keg - a[1].keg);
  }, [items]);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total kegiatan" value={items.length} />
        <Kpi label="Bulan tersibuk" value={items.length ? BULAN_PANJANG[busiest] : '-'} />
        <Kpi label="Tanggal terpadat" value={peak ? `${toDdMmYyyy(new Date(peak[0]))} (${peak[1].length} keg.)` : '-'} />
        <Kpi label="Hari dengan overlap" value={hariBentrok} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Kegiatan per bulan {year}</CardTitle>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {FUNGSI_LEGEND.map(([label, key]) => (
                <span key={key} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={cn('h-2.5 w-2.5 rounded-sm', fungsiColor(key, 'solid'))} />{label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex h-40 items-end gap-2">
            {perMonth.map((n, m) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-1 text-xs">
                <span>{n}</span>
                <div className="flex w-full flex-col justify-end overflow-hidden rounded-t" style={{ height: '100px' }} title={`${BULAN_PANJANG[m]}: ${n} kegiatan`}>
                  {[...perMonthByFungsi[m].entries()].map(([fungsi, ids]) => (
                    <div key={fungsi} className={fungsiColor(fungsi, 'solid')} style={{ height: `${(ids.size / max) * 100}px` }} title={`${fungsiDisplayName(fungsi)}: ${ids.size}`} />
                  ))}
                </div>
                <span className="text-muted-foreground">{BULAN[m]}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">5 tanggal terpadat</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {top5.length === 0 && <p className="text-muted-foreground">Belum ada data.</p>}
            {top5.map(([k, v]) => {
              const d = new Date(k);
              return (
                <div key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                  <span className="font-medium">{d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="hidden max-w-[240px] flex-wrap justify-end gap-1 sm:flex">
                      {v.slice(0, 2).map((j) => <Badge key={j.id} variant="outline" title={fungsiDisplayName(j.fungsi)} className={cn('max-w-[110px] truncate font-normal', fungsiColor(j.fungsi))}>{j.nama_kegiatan}</Badge>)}
                      {v.length > 2 && <span className="text-xs text-muted-foreground">+{v.length - 2}</span>}
                    </div>
                    <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', v.length >= 3 ? 'bg-red-700 text-white' : v.length === 2 ? 'bg-red-200 text-red-900' : 'bg-red-100 text-red-800')}>{v.length} kegiatan</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Beban per Fungsi</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2">Fungsi</th><th className="p-2 text-center">Kegiatan</th><th className="p-2 text-center">Hari aktif</th><th className="p-2 text-center">Terlibat overlap</th>
            </tr></thead>
            <tbody>
              {perFungsi.map(([f, s]) => (
                <tr key={f} className="border-b">
                  <td className="p-2"><Badge variant="outline" className={cn('font-medium', fungsiColor(f))}>{fungsiDisplayName(f)}</Badge></td>
                  <td className="p-2 text-center font-semibold">{s.keg}</td>
                  <td className="p-2 text-center">{s.hari.size}</td>
                  <td className="p-2 text-center">{s.ov > 0 ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">{s.ov}×</span> : '-'}</td>
                </tr>
              ))}
              {perFungsi.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Belum ada data.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-destructive" />Kelompok kegiatan overlap ({overlapGroups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {overlapGroups.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada kegiatan overlap.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-2">Kegiatan yang overlap</th>
                    <th className="p-2">Periode overlap</th>
                    <th className="p-2 text-center">Durasi</th>
                    <th className="p-2">Bulan</th>
                    <th className="p-2 text-center">Organik pada ≥2 kegiatan</th>
                  </tr>
                </thead>
                <tbody>
                  {overlapGroups.slice(0, 50).map((group) => {
                    const { items: groupItems, start: s, end: e } = group;
                    const dur = Math.round((e.getTime() - s.getTime()) / DAY) + 1;
                    const organikFrequency = new Map<string, number>();
                    groupItems.forEach((item) => {
                      new Set(item.organik.map(normName).filter(Boolean)).forEach((name) =>
                        organikFrequency.set(name, (organikFrequency.get(name) ?? 0) + 1),
                      );
                    });
                    const organikOverlap = [...organikFrequency.values()].filter((frequency) => frequency >= 2).length;
                    const bulanSet = new Set<number>();
                    for (let t = s.getTime(); t <= e.getTime(); t += DAY) bulanSet.add(new Date(t).getMonth());
                    return (
                      <tr key={groupItems.map((item) => item.id).sort().join('|')} className="border-b last:border-0">
                        <td className="p-2 align-top">
                          <div className="flex min-w-56 flex-col items-start gap-2">
                            {groupItems.map((j) => (
                              <button key={j.id} className="flex w-full flex-col items-start gap-1 rounded-md p-1 text-left hover:bg-accent" onClick={() => onItem(j)}>
                                <Badge variant="outline" className={cn('font-normal', fungsiColor(j.fungsi))}>{fungsiDisplayName(j.fungsi)}</Badge>
                                <span className="font-medium">{j.nama_kegiatan}</span>
                                <span className="text-xs text-muted-foreground">{fmtRange(j)}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-2 font-medium">{s.getTime() === e.getTime() ? toDdMmYyyy(s) : `${toDdMmYyyy(s)} – ${toDdMmYyyy(e)}`}</td>
                        <td className="p-2 text-center">{dur} hari</td>
                        <td className="p-2 text-muted-foreground">{Array.from(bulanSet).sort((x, y) => x - y).map((m) => BULAN_PANJANG[m]).join(', ')}</td>
                        <td className="p-2 text-center">{organikOverlap}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {overlapGroups.length > 50 && <p className="pt-2 text-xs text-muted-foreground">Menampilkan 50 dari {overlapGroups.length} kelompok overlap.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-bold">{value}</div></CardContent></Card>;
}

function SelectOrType({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(!!value && !options.includes(value));
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={custom ? OTHER : value || undefined} onValueChange={(v) => { if (v === OTHER) { setCustom(true); onChange(''); } else { setCustom(false); onChange(v); } }}>
        <SelectTrigger><SelectValue placeholder={`Pilih ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value={OTHER}>Lainnya (ketik sendiri)…</SelectItem>
        </SelectContent>
      </Select>
      {custom && <Input autoFocus placeholder={`Ketik ${label.toLowerCase()}`} value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function OrganikPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data } = useOrganikBPS();
  const names = useMemo(() => Array.from(new Set(data.map((o) => o.name).filter(Boolean))), [data]);
  const toggle = (n: string) => onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n]);
  return (
    <div className="space-y-1">
      <Label>Organik Terlibat (opsional)</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            {value.length ? `${value.length} pegawai dipilih` : 'Pilih pegawai'}<ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command filter={(v, s) => (v.toLowerCase().includes(s.trim().toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder="Cari nama…" />
            <CommandList>
              <CommandEmpty>Tidak ditemukan.</CommandEmpty>
              {names.map((n) => (
                <CommandItem key={n} value={n} onSelect={() => toggle(n)}>
                  <Check className={cn('mr-2 h-4 w-4', value.includes(n) ? 'opacity-100' : 'opacity-0')} />{n}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((n) => <Badge key={n} variant="secondary" className="gap-1">{n}<button onClick={() => toggle(n)}><X className="h-3 w-3" /></button></Badge>)}
        </div>
      )}
    </div>
  );
}

function JadwalForm({ form, setForm, fungsiList, saving, onSave }: {
  form: FormState; setForm: (f: FormState | null) => void; fungsiList: string[]; saving: boolean; onSave: () => void;
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });
  return (
    <Dialog open onOpenChange={(o) => !o && setForm(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{form.rowNumber ? 'Edit Kegiatan' : 'Tambah Kegiatan'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <SelectOrType label="Fungsi" value={form.fungsi} options={fungsiList} onChange={(v) => set('fungsi', v)} />
          <div className="space-y-1"><Label>Nama Kegiatan</Label><Input value={form.nama_kegiatan} onChange={(e) => set('nama_kegiatan', e.target.value)} /></div>
          <SelectOrType label="Tahapan" value={form.tahapan} options={TAHAPAN_OPTIONS} onChange={(v) => set('tahapan', v)} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Tanggal Mulai</Label><Input type="date" value={form.tanggal_mulai} onChange={(e) => set('tanggal_mulai', e.target.value)} /></div>
            <div className="space-y-1"><Label>Tanggal Selesai</Label><Input type="date" value={form.tanggal_selesai} min={form.tanggal_mulai} onChange={(e) => set('tanggal_selesai', e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Kosongkan tanggal selesai jika kegiatan hanya 1 hari.</p>
          <PenanggungJawabPicker value={form.penanggung_jawab} onChange={(v) => set('penanggung_jawab', v)} />
          <OrganikPicker value={form.organik} onChange={(v) => set('organik', v)} />
          <div className="space-y-1"><Label>Keterangan</Label><Textarea value={form.keterangan} onChange={(e) => set('keterangan', e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setForm(null)}>Batal</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

type SortKey = 'nama' | 'keg' | 'pic' | 'hari';

function RekapView({ year, items, onItem }: { year: number; items: Jadwal[]; onItem: (j: Jadwal) => void }) {
  const { data } = useOrganikBPS();
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('keg');
  const [sortAsc, setSortAsc] = useState(false);
  const [emp, setEmp] = useState<{ name: string; keg: Jadwal[]; hari: number; pic: number } | null>(null);
  const rows = useMemo(() => {
    const DAY = 86_400_000;
    const yStart = new Date(year, 0, 1).getTime(), yEnd = new Date(year, 11, 31).getTime();
    const list = data.filter((o) => o.name).map((o) => {
      const key = normName(o.name);
      const keg = items.filter((j) => j.organik.some((n) => normName(n) === key) || (j.penanggung_jawab && normName(j.penanggung_jawab) === key));
      const days = new Set<number>();
      keg.forEach((j) => {
        for (let t = Math.max(j.tanggal_mulai.getTime(), yStart); t <= Math.min(j.tanggal_selesai.getTime(), yEnd); t += DAY) days.add(Math.round(t / DAY));
      });
      return { o, keg, hari: days.size, pic: keg.filter((j) => normName(j.penanggung_jawab) === key).length };
    });
    return list.sort((a, b) => b.keg.length - a.keg.length || b.hari - a.hari || a.o.name.localeCompare(b.o.name));
  }, [data, items, year]);
  const filtered = useMemo(() => rows.filter((r) => r.o.name.toLowerCase().includes(q.trim().toLowerCase())), [rows, q]);
  const shown = useMemo(() => {
    const val = (r: (typeof rows)[number]) => (sortKey === 'nama' ? r.o.name : sortKey === 'keg' ? r.keg.length : sortKey === 'pic' ? r.pic : r.hari);
    return [...filtered].sort((a, b) => {
      const va = val(a), vb = val(b);
      const d = typeof va === 'string' ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return d !== 0 ? (sortAsc ? d : -d) : a.o.name.localeCompare(b.o.name);
    });
  }, [filtered, sortKey, sortAsc]);
  const toggleSort = (k: SortKey) => { if (k === sortKey) setSortAsc(!sortAsc); else { setSortKey(k); setSortAsc(k === 'nama'); } };
  const th = (k: SortKey, label: string, center?: boolean) => (
    <th className={cn('p-2', center && 'text-center')}>
      <button className={cn('inline-flex items-center gap-1', sortKey === k ? 'text-foreground' : 'hover:text-foreground')} onClick={() => toggleSort(k)}>
        {label}
        {sortKey === k ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
  return (
    <>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Rekap Karyawan {year} ({rows.length} pegawai)</CardTitle>
          <Input className="w-60" placeholder="Cari nama pegawai…" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2">No</th>
              {th('nama', 'Nama')}
              {th('keg', 'Kegiatan', true)}
              {th('pic', 'Sbg PIC', true)}
              {th('hari', 'Hari Sibuk', true)}
              <th className="p-2">Daftar Kegiatan</th>
            </tr></thead>
            <tbody>
              {shown.map((r, i) => {
                return (
                  <tr key={r.o.id + i} className="border-b align-top">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2"><div className="font-medium">{r.o.name}</div>{r.o.jabatan && <div className="text-xs text-muted-foreground">{r.o.jabatan}</div>}</td>
                    <td className="p-2 text-center font-semibold">{r.keg.length}</td>
                    <td className="p-2 text-center">{r.pic}</td>
                    <td className="p-2 text-center">{r.hari}</td>
                    <td className="p-2"><div className="flex flex-wrap items-center gap-1">
                      {r.keg.slice(0, 3).map((j) => <button key={j.id} onClick={() => onItem(j)}><Badge variant="outline" className={cn('font-normal hover:opacity-80', fungsiColor(j.fungsi))}>{j.nama_kegiatan}</Badge></button>)}
                      {r.keg.length > 3 && (
                        <Button size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => setEmp({ name: r.o.name, keg: r.keg, hari: r.hari, pic: r.pic })}>
                          +{r.keg.length - 3} lainnya
                        </Button>
                      )}
                    </div></td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Tidak ada pegawai.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!emp} onOpenChange={(o) => !o && setEmp(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Daftar Kegiatan — {emp?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{emp?.keg.length ?? 0} kegiatan · {emp?.hari ?? 0} hari sibuk · {emp?.pic ?? 0}× sebagai PIC</p>
          <div className="space-y-2">
            {emp?.keg.slice().sort((a, b) => a.tanggal_mulai.getTime() - b.tanggal_mulai.getTime()).map((j, index) => (
              <div key={j.id} className="flex gap-3 rounded-md border p-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{j.nama_kegiatan}</span>
                    <Badge variant="outline" className={cn('shrink-0', fungsiColor(j.fungsi))}>{fungsiDisplayName(j.fungsi)}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{fmtRange(j)}</span>
                    {j.tahapan && <span>· {j.tahapan}</span>}
                    {normName(j.penanggung_jawab) === normName(emp.name) && <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-foreground">Sebagai PIC</span>}
                  </div>
                  <Button size="sm" variant="ghost" className="mt-1 h-6 px-2 text-xs" onClick={() => { setEmp(null); onItem(j); }}>Lihat rincian</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PenanggungJawabPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data, loading } = useOrganikBPS();
  const names = useMemo(() => Array.from(new Set(data.map((o) => o.name).filter(Boolean))), [data]);
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <Label>Penanggung Jawab</Label>
      {names.length === 0 && !loading ? (
        <Input placeholder="Ketik nama penanggung jawab" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between font-normal">
              <span className={cn(!value && 'text-muted-foreground')}>{value || 'Pilih nama organik'}</span>
              <span className="flex items-center gap-1">
                {value && <X className="h-3 w-3 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange(''); }} />}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command filter={(v, s) => (v.toLowerCase().includes(s.trim().toLowerCase()) ? 1 : 0)}>
              <CommandInput placeholder="Cari nama organik…" />
              <CommandList>
                <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Memuat daftar pegawai…</div>}
                {names.map((n) => (
                  <CommandItem key={n} value={n} onSelect={() => { onChange(n); setOpen(false); }}>
                    <Check className={cn('mr-2 h-4 w-4', value === n ? 'opacity-100' : 'opacity-0')} />{n}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
