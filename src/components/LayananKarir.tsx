// components/LayananKarir.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Save, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Karyawan {
  nip: string;
  nama: string;
  pangkat: string;
  golongan: string;
  jabatan: string;
  unitKerja: string;
}

interface KonversiData {
  No?: string;
  NIP: string;
  Nama: string;
  Tahun: number;
  Semester: 1 | 2;
  Predikat: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';
  'Nilai SKP': number;
  'AK Konversi': number;
  'TMT Mulai': string;
  'TMT Selesai': string;
  Status: 'Draft' | 'Generated';
  Catatan?: string;
  Link_Dokumen?: string;
  Last_Update: string;
  rowIndex?: number; // -1 = hanya lokal (belum di Sheets)
}

// HARUS SAMA PERSIS dengan header baris 1 di tab "konversi_predikat"
const KONVERSI_HEADERS = [
  'No', 'NIP', 'Nama', 'Tahun', 'Semester',
  'Predikat', 'Nilai SKP', 'AK Konversi',
  'TMT Mulai', 'TMT Selesai', 'Status', 'Catatan',
  'Link_Dokumen', 'Last_Update'
];

const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "konversi_predikat";

class Calculator {
  static calculateAK(predikat: string, skp: number): number {
    const base = { 'Sangat Baik': 1.5, 'Baik': 1.0, 'Cukup': 0.75, 'Kurang': 0.5 }[predikat] || 1.0;
    let multiplier = skp >= 91 ? 1.2 : skp >= 81 ? 1.1 : skp >= 71 ? 1.0 : skp >= 61 ? 0.9 : 0.8;
    return Number((base * 12.5 * multiplier).toFixed(2));
  }

  static periode(tahun: number, semester: 1 | 2) {
    return semester === 1
      ? { mulai: `01/01/${tahun}`, selesai: `30/06/${tahun}` }
      : { mulai: `01/07/${tahun}`, selesai: `31/12/${tahun}` };
  }

  static today() {
    return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  static currentYearSemester(): { tahun: number; semester: 1 | 2 } {
    const now = new Date();
    return { tahun: now.getFullYear(), semester: now.getMonth() >= 6 ? 2 : 1 };
  }
}

const useSheetsAPI = () => {
  const { toast } = useToast();
  const call = async (body: any) => {
    const res = await fetch('/api/google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME, ...body })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Request failed');
    }
    return res.json();
  };

  return {
    read: () => call({ operation: 'read' }),
    append: (values: any[]) => call({ operation: 'append', values: [values] }),
    update: (rowIndex: number, values: any[]) => call({ operation: 'update', rowIndex, values: [values] }),
    deleteRow: (rowIndex: number) => call({ operation: 'delete', rowIndex })
  };
};

const LayananKarir: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSheetsAPI();
  const [data, setData] = useState<KonversiData[]>([]);
  const [changedRows, setChangedRows] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Generate data yang belum ada
  const generateMissing = (existing: KonversiData[]) => {
    const { tahun: currY, semester: currS } = Calculator.currentYearSemester();
    const today = Calculator.today();
    const result = [...existing];

    for (let y = 2020; y <= currY; y++) {
      for (let s = 1; s <= 2; s++) {
        if (y === currY && s > currS) continue;
        if (existing.some(d => d.Tahun === y && d.Semester === s)) continue;

        const p = Calculator.periode(y, s as 1 | 2);
        result.push({
          NIP: karyawan.nip,
          Nama: karyawan.nama,
          Tahun: y,
          Semester: s as 1 | 2,
          Predikat: 'Baik',
          'Nilai SKP': 80,
          'AK Konversi': Calculator.calculateAK('Baik', 80),
          'TMT Mulai': p.mulai,
          'TMT Selesai': p.selesai,
          Status: 'Draft',
          Last_Update: today,
          rowIndex: -1
        });
      }
    }
    return result.sort((a, b) => b.Tahun - a.Tahun || b.Semester - a.Semester);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.read();
      const rows = res.values || [];
      const parsed: KonversiData[] = [];

      if (rows.length > 1) {
        rows.slice(1).forEach((row: any[], i: number) => {
          const obj: any = { rowIndex: i + 2 };
          KONVERSI_HEADERS.forEach((h, idx) => obj[h] = row[idx] ?? '');
          obj.Tahun = Number(obj.Tahun);
          obj.Semester = Number(obj.Semester) as 1 | 2;
          obj['Nilai SKP'] = Number(obj['Nilai SKP']);
          obj['AK Konversi'] = Number(obj['AK Konversi']);
          if (obj.NIP === karyawan.nip) parsed.push(obj);
        });
      }

      setData(generateMissing(parsed));
      setChangedRows(new Set());
    } catch (e) {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [karyawan.nip]);

  const recalc = (item: KonversiData) => {
    const updated = {
      ...item,
      'AK Konversi': Calculator.calculateAK(item.Predikat, item['Nilai SKP']),
      Last_Update: Calculator.today()
    };
    setData(prev => prev.map(x => x === item ? updated : x));
    setChangedRows(prev => new Set(prev).add(item.rowIndex === -1 ? Date.now() : item.rowIndex!));
  };

  const deleteItem = async (item: KonversiData) => {
    if (!confirm('Hapus baris ini?')) return;
    if (item.rowIndex === -1) {
      setData(prev => prev.filter(x => x !== item));
    } else {
      await api.deleteRow(item.rowIndex!);
      loadData();
    }
    toast({ title: "Sukses", description: "Baris dihapus" });
  };

  const saveAll = async () => {
    const hasDraft = data.some(d => d.Status === 'Draft' && d.rowIndex === -1);
    if (changedRows.size === 0 && !hasDraft) {
      toast({ title: "Info", description: "Tidak ada perubahan" });
      return;
    }

    setLoading(true);
    try {
      for (const item of data) {
        const values = KONVERSI_HEADERS.map(h => {
          if (h === 'Last_Update') return Calculator.today();
          if (h === 'Status') return 'Generated';
          if (h === 'Link_Dokumen' || h === 'Catatan' || h === 'No') return item[h as keyof KonversiData] ?? '';
          return (item as any)[h] ?? '';
        });

        if (item.rowIndex === -1) await api.append(values);
        else if (changedRows.has(item.rowIndex!) || item.Status === 'Draft') await api.update(item.rowIndex!, values);
      }

      toast({ title: "Sukses!", description: "Semua data tersimpan permanen ke Google Sheets" });
      setChangedRows(new Set());
      loadData();
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan ke Google Sheets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasUnsaved = changedRows.size > 0 || data.some(d => d.Status === 'Draft' && d.rowIndex === -1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Layanan Karir – Konversi Predikat</CardTitle>
          <CardDescription>{karyawan.nama} • {karyawan.nip} • {karyawan.jabatan}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {hasUnsaved && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Ada data belum disimpan permanen</span>
              </div>
              <Button onClick={saveAll} disabled={loading} className="font-bold">
                <Save className="h-4 w-4 mr-2" /> Simpan Semua ke Google Sheets
              </Button>
            </div>
          )}

          {loading && <p className="text-center py-8">Memuat data...</p>}

          {!loading && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Predikat</TableHead>
                    <TableHead>Nilai SKP</TableHead>
                    <TableHead>AK Konversi</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d, i) => (
                    <TableRow key={i} className={d.Status === 'Draft' ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">{d.Tahun}</TableCell>
                      <TableCell>{d.Semester}</TableCell>
                      <TableCell>
                        <select
                          value={d.Predikat}
                          onChange={e => {
                            const upd = { ...d, Predikat: e.target.value as any };
                            setData(prev => prev.map(x => x === d ? upd : x));
                            recalc(upd);
                          }}
                          className="px-3 py-1 border rounded text-sm"
                        >
                          <option>Sangat Baik</option>
                          <option>Baik</option>
                          <option>Cukup</option>
                          <option>Kurang</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          value={d['Nilai SKP']}
                          onChange={e => {
                            const upd = { ...d, 'Nilai SKP': Number(e.target.value) };
                            setData(prev => prev.map(x => x === d ? upd : x));
                            recalc(upd);
                          }}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">{d['AK Konversi']}</TableCell>
                      <TableCell className="text-xs">{d['TMT Mulai']} s/d {d['TMT Selesai']}</TableCell>
                      <TableCell>
                        <Badge variant={d.Status === 'Generated' ? 'default' : 'secondary'}>
                          {d.Status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => recalc(d)} title="Hitung ulang">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteItem(d)} title="Hapus">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LayananKarir;