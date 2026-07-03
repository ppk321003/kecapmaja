"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit, Trash2, Lock, Unlock, MapPin, Loader2, Save, Search } from "lucide-react";
import { id as localeId } from "date-fns/locale";

const SPREADSHEET_ID = "1CEWp_jOPMQXE1lw7eVvlfyCwO147O2XpmLrNuVsdpU4";
const SHEET_NAME = "Sheet1";
const RANGE = `${SHEET_NAME}!A:J`; // A-I data + J = LOCK flag
const MASTER_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const TAHUN_OPTIONS = [2024, 2025, 2026, 2027];
const PENANGGUNG_JAWAB_OPTIONS = ["IPDS", "Sosial", "Neraca", "Produksi", "Distribusi", "Tata Usaha"];

interface Organik {
  nama: string;
  nip: string;
  jabatan: string;
}

interface Row {
  rowIndex: number; // sheet row (1-based, including header)
  no: string;
  tahun: string;
  bulan: string;
  nama: string;
  jabatan: string;
  kegiatan: string;
  tanggal: string; // "5, 6, 7"
  penanggungJawab: string;
  jumlah: string;
  locked: boolean;
}

function parseDates(str: string): number[] {
  if (!str) return [];
  return str
    .split(/[,;\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 31)
    .sort((a, b) => a - b);
}

function pjBadgeClass(pj: string) {
  switch ((pj || "").toLowerCase()) {
    case "ipds":
      return "bg-blue-100 text-blue-800";
    case "sosial":
      return "bg-green-100 text-green-800";
    case "neraca":
      return "bg-yellow-100 text-yellow-800";
    case "produksi":
      return "bg-purple-100 text-purple-800";
    case "distribusi":
      return "bg-indigo-100 text-indigo-800";
    case "tata usaha":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function LaporSupervisi() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Allow both PPK and PPSPM roles to perform lock/unlock
  const isPPK = user?.role === "Pejabat Pembuat Komitmen" || user?.role === "Pejabat Penandatangan Surat Perintah Membayar";

  const now = new Date();
  const [tahun, setTahun] = useState<string>(String(now.getFullYear()));
  const [bulan, setBulan] = useState<string>(BULAN[now.getMonth()]);
  const [search, setSearch] = useState("");

  // Sorting state: default sort by `nama` ascending
  const [sortBy, setSortBy] = useState<"nama" | "kegiatan" | "tanggal" | "penanggungJawab" | "jumlah" | "locked">("nama");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formKegiatan, setFormKegiatan] = useState("");
  const [formPJ, setFormPJ] = useState("");
  const [formDates, setFormDates] = useState<Date[]>([]);
  const [organikList, setOrganikList] = useState<Organik[]>([]);

  const monthIndex = BULAN.indexOf(bulan);

  const loadOrganik = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: MASTER_SPREADSHEET_ID, operation: "read", range: "MASTER.ORGANIK" },
      });
      if (error) throw error;
      const rows = (data?.values || []).slice(1);
      const list: Organik[] = rows
        .map((r: any[]) => ({ nama: r[3] || "", nip: r[2] || "", jabatan: r[4] || "" }))
        .filter((o: Organik) => o.nama);
      list.sort((a, b) => a.nama.localeCompare(b.nama));
      setOrganikList(list);
    } catch (e: any) {
      toast({ title: "Gagal memuat organik", description: e.message, variant: "destructive" });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: { spreadsheetId: SPREADSHEET_ID, operation: "read", range: RANGE },
      });
      if (error) throw error;
      const values: string[][] = data?.values || [];
      const parsed: Row[] = values.slice(1).map((r, idx) => ({
        rowIndex: idx + 2,
        no: r[0] || "",
        tahun: r[1] || "",
        bulan: r[2] || "",
        nama: r[3] || "",
        jabatan: r[4] || "",
        kegiatan: r[5] || "",
        tanggal: r[6] || "",
        penanggungJawab: r[7] || "",
        jumlah: r[8] || "",
        locked: String(r[9] || "").toUpperCase() === "TRUE" || String(r[9] || "").toUpperCase() === "LOCKED",
      })).filter((r) => r.nama || r.kegiatan);
      setRows(parsed);
    } catch (e: any) {
      toast({ title: "Gagal memuat data", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); loadOrganik(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.tahun && r.tahun !== tahun) return false;
      if (r.bulan && r.bulan !== bulan) return false;
      if (!s) return true;
      return (
        r.nama.toLowerCase().includes(s) ||
        r.kegiatan.toLowerCase().includes(s) ||
        r.penanggungJawab.toLowerCase().includes(s)
      );
    });
  }, [rows, tahun, bulan, search]);

  const sorted = useMemo(() => {
    const cmp = (a: any, b: any) => {
      let v = 0;
      if (sortBy === "nama") v = a.nama.localeCompare(b.nama);
      else if (sortBy === "kegiatan") v = a.kegiatan.localeCompare(b.kegiatan);
      else if (sortBy === "penanggungJawab") v = a.penanggungJawab.localeCompare(b.penanggungJawab);
      else if (sortBy === "tanggal") {
        const da = parseDates(a.tanggal)[0] || 0;
        const db = parseDates(b.tanggal)[0] || 0;
        v = da - db;
      }
      else if (sortBy === "jumlah") v = (Number(a.jumlah) || 0) - (Number(b.jumlah) || 0);
      else if (sortBy === "locked") v = (a.locked === b.locked) ? 0 : a.locked ? 1 : -1;
      else v = 0;
      return sortDir === "asc" ? v : -v;
    };
    return [...filtered].sort(cmp);
  }, [filtered, sortBy, sortDir]);

  const canModify = (row: Row) => {
    if (isPPK) return true;
    if (row.locked) return false;
    return true;
  };

  const openAdd = () => {
    setEditing(null);
    setFormNama("");
    setFormKegiatan("");
    setFormPJ("");
    setFormDates([]);
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setFormNama(row.nama);
    setFormKegiatan(row.kegiatan);
    setFormPJ(row.penanggungJawab);
    setFormDates(parseDates(row.tanggal).map((d) => new Date(parseInt(row.tahun, 10), BULAN.indexOf(row.bulan), d)));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formNama) {
      toast({ title: "Nama pelaksana wajib dipilih", variant: "destructive" });
      return;
    }
    if (!formKegiatan.trim()) {
      toast({ title: "Kegiatan wajib diisi", variant: "destructive" });
      return;
    }
    if (!formPJ) {
      toast({ title: "Penanggung Jawab wajib dipilih", variant: "destructive" });
      return;
    }
    const dates = formDates
      .filter((d) => d.getFullYear() === parseInt(tahun, 10) && d.getMonth() === monthIndex)
      .map((d) => d.getDate())
      .sort((a, b) => a - b);
    if (dates.length === 0) {
      toast({ title: "Pilih minimal satu tanggal", variant: "destructive" });
      return;
    }

    // Duplicate check: same pelaksana, same tahun+bulan, overlapping dates
    const takenByUser = new Set<number>();
    rows.forEach((r) => {
      if (r.nama !== formNama) return;
      if (r.tahun !== tahun || r.bulan !== bulan) return;
      if (editing && r.rowIndex === editing.rowIndex) return;
      parseDates(r.tanggal).forEach((d) => takenByUser.add(d));
    });
    const clash = dates.filter((d) => takenByUser.has(d));
    if (clash.length > 0) {
      toast({
        title: "Tanggal bentrok",
        description: `${formNama} sudah punya jadwal supervisi di tanggal: ${clash.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const tanggalStr = dates.join(", ");
      const jumlah = String(dates.length);
      const selectedOrganik = organikList.find((o) => o.nama === formNama);
      const jabatanValue = selectedOrganik?.jabatan || editing?.jabatan || "";
      if (editing) {
        const values = [[
          editing.no,
          tahun,
          bulan,
          formNama,
          jabatanValue,
          formKegiatan,
          tanggalStr,
          formPJ,
          jumlah,
          editing.locked ? "TRUE" : "FALSE",
        ]];
        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "update",
            range: `${SHEET_NAME}!A${editing.rowIndex}:J${editing.rowIndex}`,
            values,
          },
        });
        if (error) throw error;
        toast({ title: "Data diperbarui" });
      } else {
        const maxNo = rows.reduce((m, r) => {
          const n = parseInt(r.no, 10);
          return isNaN(n) ? m : Math.max(m, n);
        }, 0);
        const values = [[
          String(maxNo + 1),
          tahun,
          bulan,
          formNama,
          jabatanValue,
          formKegiatan,
          tanggalStr,
          formPJ,
          jumlah,
          "FALSE",
        ]];
        const { error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: SPREADSHEET_ID,
            operation: "append",
            range: RANGE,
            values,
          },
        });
        if (error) throw error;
        toast({ title: "Data tersimpan" });
      }
      setDialogOpen(false);
      await loadData();
    } catch (e: any) {
      toast({ title: "Gagal menyimpan", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Row) => {
    if (!canModify(row)) {
      toast({ title: "Tidak diizinkan", description: row.locked ? "Data sedang dikunci PPK" : "Bukan milik Anda", variant: "destructive" });
      return;
    }
    if (!confirm(`Hapus data supervisi "${row.kegiatan}" (${row.tanggal})?`)) return;
    setSaving(true);
    try {
      // Clear row content (A:J)
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "update",
          range: `${SHEET_NAME}!A${row.rowIndex}:J${row.rowIndex}`,
          values: [["", "", "", "", "", "", "", "", "", ""]],
        },
      });
      if (error) throw error;
      toast({ title: "Data dihapus" });
      await loadData();
    } catch (e: any) {
      toast({ title: "Gagal menghapus", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (row: Row) => {
    if (!isPPK) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SPREADSHEET_ID,
          operation: "update",
          range: `${SHEET_NAME}!J${row.rowIndex}`,
          values: [[row.locked ? "FALSE" : "TRUE"]],
        },
      });
      if (error) throw error;
      toast({ title: row.locked ? "Data di-unlock" : "Data dikunci" });
      await loadData();
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" /> Lapor Supervisi
          </h1>
          <p className="text-muted-foreground mt-1">
            Pelaporan perjalanan supervisi organik. Satu tanggal hanya untuk satu perjalanan supervisi.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Tambah Supervisi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Pilih periode tahun & bulan pelaporan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="w-32">
            <label className="text-xs font-medium">Tahun</label>
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAHUN_OPTIONS.map((t) => <SelectItem key={t} value={String(t)}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <label className="text-xs font-medium">Bulan</label>
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BULAN.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium">Cari</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama / kegiatan / PJ" className="pl-9" />
            </div>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Muat Ulang"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Supervisi — {bulan} {tahun}</CardTitle>
          <CardDescription>{filtered.length} entri</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  if (sortBy === 'nama') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy('nama'); setSortDir('asc'); }
                }}>Nama Pelaksana</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  if (sortBy === 'kegiatan') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy('kegiatan'); setSortDir('asc'); }
                }}>Kegiatan Supervisi</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  if (sortBy === 'tanggal') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy('tanggal' as any); setSortDir('asc'); }
                }}>Tanggal</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  if (sortBy === 'penanggungJawab') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy('penanggungJawab'); setSortDir('asc'); }
                }}>Penanggung Jawab</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => {
                  if (sortBy === 'jumlah') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy('jumlah'); setSortDir('asc'); }
                }}>Jumlah</TableHead>
                <TableHead className="cursor-pointer" onClick={() => {
                  if (sortBy === 'locked') setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy('locked'); setSortDir('asc'); }
                }}>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada data.</TableCell></TableRow>
              ) : sorted.map((row, i) => {
                const editable = canModify(row);
                return (
                  <TableRow key={row.rowIndex}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.nama}</div>
                      <div className="text-xs text-muted-foreground">{row.jabatan}</div>
                    </TableCell>
                    <TableCell>{row.kegiatan}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.tanggal}</TableCell>
                    <TableCell>
                      <Badge className={`${pjBadgeClass(row.penanggungJawab)} px-2 py-0.5`}>{row.penanggungJawab}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{row.jumlah}</TableCell>
                    <TableCell className="text-center">
                      {row.locked ? (
                        <Lock className="h-4 w-4 text-destructive mx-auto" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {isPPK && (
                        <Button size="sm" variant="ghost" onClick={() => toggleLock(row)} disabled={saving} title={row.locked ? "Unlock" : "Lock"}>
                          {row.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)} disabled={!editable || saving}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(row)} disabled={!editable || saving}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supervisi" : "Tambah Supervisi"}</DialogTitle>
            <DialogDescription>
              Periode: <b>{bulan} {tahun}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Pelaksana (Organik)</label>
              <Select value={formNama} onValueChange={setFormNama}>
                <SelectTrigger><SelectValue placeholder={organikList.length ? "Pilih nama organik" : "Memuat data organik..."} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {organikList.map((o) => (
                    <SelectItem key={o.nip || o.nama} value={o.nama}>
                      <div className="flex flex-col">
                        <span className="truncate">{o.nama}</span>
                        {o.jabatan ? <span className="text-xs text-muted-foreground">{o.jabatan}</span> : null}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Kegiatan Supervisi</label>
              <Input value={formKegiatan} onChange={(e) => setFormKegiatan(e.target.value)} placeholder="Deskripsi kegiatan supervisi" />
            </div>
            <div>
              <label className="text-sm font-medium">Penanggung Jawab Kegiatan</label>
              <Select value={formPJ} onValueChange={setFormPJ}>
                <SelectTrigger><SelectValue placeholder="Pilih penanggung jawab" /></SelectTrigger>
                <SelectContent>
                  {PENANGGUNG_JAWAB_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tanggal Supervisi</label>
              <div className="border rounded-md mt-1">
                <CalendarComponent
                  mode="multiple"
                  selected={formDates}
                  onSelect={(d) => setFormDates(d || [])}
                  month={new Date(parseInt(tahun, 10), monthIndex)}
                  locale={localeId}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Terpilih: {formDates.filter((d) => d.getMonth() === monthIndex && d.getFullYear() === parseInt(tahun, 10)).map((d) => d.getDate()).sort((a, b) => a - b).join(", ") || "-"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}