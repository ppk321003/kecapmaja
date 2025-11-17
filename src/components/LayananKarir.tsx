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
  rowIndex?: number; // -1 = belum ada di Sheets (hanya lokal)
}

// Header harus 100% sama dengan baris 1 di tab "konversi_predikat"
const KONVERSI_HEADERS = [
  'No', 'NIP', 'Nama', 'Tahun', 'Semester',
  'Predikat', 'Nilai SKP', 'AK Konversi',
  'TMT Mulai', 'TMT Selesai', 'Status', 'Catatan',
  'Link_Dokumen', 'Last_Update'
];

const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_KONVERSI = "konversi_predikat";

class LayananKarirCalculator {
  static calculateAK(predikat: string, nilaiSKP: number): number {
    const base = { 'Sangat Baik': 1.5, 'Baik': 1.0, 'Cukup': 0.75, 'Kurang': 0.5 }[predikat] || 1.0;
    let multiplier = 1.0;
    if (nilaiSKP >= 91) multiplier = 1.2;
    else if (nilaiSKP >= 81) multiplier = 1.1;
    else if (nilaiSKP >= 71) multiplier = 1.0;
    else if (nilaiSKP >= 61) multiplier = 0.9;
    else multiplier = 0.8;
    return Number((base * 12.5 * multiplier).toFixed(2));
  }

  static getPeriode(tahun: number, semester: 1 | 2) {
    return semester === 1
      ? { mulai: `01/01/${tahun}`, selesai: `30/06/${tahun}` }
      : { mulai: `01/07/${tahun}`, selesai: `31/12/${tahun}` };
  }

  static formatDate(date: Date = new Date()): string {
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  static getCurrentYearSemester(): { tahun: number; semester: 1 | 2 } {
    const now = new Date();
    return { tahun: now.getFullYear(), semester: now.getMonth() >= 6 ? 2 : 1 };
  }
}

const useGoogleSheets = () => {
  const { toast } = useToast();

  const call = async (operation: string, data: any) => {
    try {
      const res = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, ...data })
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Gagal akses Google Sheets", variant: "destructive" });
      throw err;
    }
  };

  return {
    read: () => call('read', { range: SHEET_KONVERSI }),
    append: (values: any[]) => call('append', { range: SHEET_KONVERSI, values: [values] }),
    update: (rowIndex: number, values: any[]) => call('update', { range: SHEET_KONVERSI, rowIndex, values: [values] }),
    delete: (rowIndex: number) => call('delete', { range: SHEET_KONVERSI, rowIndex })
  };
};

const LayananKarir: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useGoogleSheets();

  const [data, setData] = useState<KonversiData[]>([]);
  const [localChanges, setLocalChanges] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Generate data yang belum ada (dari 2020 sampai semester terakhir)
  const generateMissingData = (existing: KonversiData[]): KonversiData[] => {
    const { tahun: currYear, semester: currSem } = LayananKarirCalculator.getCurrentYearSemester();
    const today = LayananKarirCalculator.formatDate();
    const result: KonversiData[] = [...existing];

    for (let y = 2020; y <= currYear; y++) {
      for (let s = 1; s <= 2; s++) {
        if (y === currYear && s > currSem) continue;

        const already = existing.some(d => d.Tahun === y && d.Semester === s);
        if (!already) {
          const periode = LayananKarirCalculator.getPeriode(y, s as 1 | 2);
          const ak = LayananKarirCalculator.calculateAK('Baik', 80);
          result.push({
            NIP: karyawan.nip,
            Nama: karyawan.nama,
            Tahun: y,
            Semester: s as 1 | 2,
            Predikat: 'Baik',
            'Nilai SKP': 80,
            'AK Konversi': ak,
            'TMT Mulai': periode.mulai,
            'TMT Selesai': periode.selesai,
            Status: 'Draft',
            Last_Update: today,
            rowIndex: -1
          });
        }
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
        const headers = rows[0];
        rows.slice(1).forEach((row: any[], idx: number) => {
          const obj: any = { rowIndex: idx + 2 };
          KONVERSI_HEADERS.forEach((h, i) => {
            obj[h] = row[i] ?? '';
          });
          // Pastikan tipe data benar
          obj.Tahun = Number(obj.Tahun) || 0;
          obj.Semester = Number(obj.Semester) as 1 | 2 || 1;
          obj['Nilai SKP'] = Number(obj['Nilai SKP']) || 0;
          obj['AK Konversi'] = Number(obj['AK Konversi']) || 0;
          parsed.push(obj);
        });
      }

      // Filter hanya data karyawan ini + generate yang belum ada
      const mine = parsed.filter(d => d.NIP === karyawan.nip);
      setData(generateMissingData(mine));
      setLocalChanges(new Set());
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [karyawan.nip]);

  const recalculateAK = (item: KonversiData) => {
    const newAK = LayananKarirCalculator.calculateAK(item.Predikat, item['Nilai SKP']);
    const updated = { ...item, 'AK Konversi': newAK, Last_Update: LayananKarirCalculator.formatDate() };
    setData(prev => prev.map(i => i === item ? updated : i));
    markChanged(item);
  };

  const markChanged = (item: KonversiData) => {
    if (item.rowIndex === -1) {
      setLocalChanges(prev => new Set(prev).add(Date.now())); // dummy key
    } else {
      setLocalChanges(prev => new Set(prev).add(item.rowIndex!));
    }
  };

  const handleDelete = async (item: KonversiData) => {
    if (!confirm('Hapus baris ini?')) return;
    if (item.rowIndex === -1) {
      setData(prev => prev.filter(i => i !== item));
    } else {
      await api.delete(item.rowIndex!);
      loadData();
    }
    toast({ title: "Sukses", description: "Data dihapus" });
  };

  const saveAllToSheets = async () => {
    if (localChanges.size === 0 && !data.some(d => d.Status === 'Draft' && d.rowIndex === -1)) {
      toast({ title: "Info", description: "Tidak ada perubahan" });
      return;
    }

    setLoading(true);
    try {
      for (const item of data) {
        const values = KONVERSI_HEADERS.map(h => {
          if (h === 'Last_Update') return LayananKarirCalculator.formatDate();
          if (h === 'Status') return 'Generated';
          if (h === 'Link_Dokumen') return item[h] ?? '';
          if (h === 'No') return item[h] ?? '';
          return (item as any)[h] ?? '';
        });

        if (item.rowIndex === -1) {
          await api.append(values);
        } else if (localChanges.has(item.rowIndex!) || item.Status === 'Draft') {
          await api.update(item.rowIndex!, values);
        }
      }

      toast({ title: "Sukses!", description: "Semua data berhasil disimpan ke Google Sheets" });
      setLocalChanges(new Set());
      loadData(); // refresh rowIndex
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasUnsaved = localChanges.size > 0 || data.some(d => d.Status === 'Draft' && d.rowIndex === -1);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Layanan Karir - Konversi Predikat</CardTitle>
          <CardDescription>
            {karyawan.nama} ({karyawan.nip}) • {karyawan.jabatan}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasUnsaved && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg p-4">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Ada data belum disimpan permanen ke Google Sheets</span>
              </div>
              <Button onClick={saveAllToSheets} disabled={loading} className="font-semibold">
                <Save className="h-4 w-4 mr-2" />
                Simpan Semua ke Google Sheets
              </Button>
            </div>
          )}

          {loading && <div className="text-center py-8">Memuat data...</div>}

          {!loading && (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Predikat</TableHead>
                    <TableHead>SKP</TableHead>
                    <TableHead>AK</TableHead>
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
                          onChange={(e) => {
                            const updated = { ...d, Predikat: e.target.value as any };
                            setData(prev => prev.map(x => x === d ? updated : x));
                            recalculateAK(updated);
                          }}
                          className="px-2 py-1 rounded border text-sm"
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
                          onChange={(e) => {
                            const updated = { ...d, 'Nilai SKP': Number(e.target.value) };
                            setData(prev => prev.map(x => x === d ? updated : x));
                            recalculateAK(updated);
                          }}
                          className="w-16 px-2 py-1 border rounded text-sm"
                        />
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">{d['AK Konversi']}</TableCell>
                      <TableCell className="text-xs">
                        {d['TMT Mulai']} s/d {d['TMT Selesai']}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.Status === 'Generated' ? 'default' : 'secondary'}>
                          {d.Status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => recalculateAK(d)} title="Hitung ulang">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(d)} title="Hapus">
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