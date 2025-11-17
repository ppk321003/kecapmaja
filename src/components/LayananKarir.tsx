// components/LayananKarir.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit, Trash2, Plus, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Karyawan {
  nip: string;
  nama: string;
  jabatan: string;
}

interface KonversiData {
  rowIndex?: number;
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
  Last_Update: string;
}

const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "konversi_predikat";

const Calculator = {
  ak(predikat: string, skp: number): number {
    const base = { 'Sangat Baik': 1.5, 'Baik': 1.0, 'Cukup': 0.75, 'Kurang': 0.5 }[predikat] || 1.0;
    const multiplier = skp >= 91 ? 1.2 : skp >= 81 ? 1.1 : skp >= 71 ? 1.0 : skp >= 61 ? 0.9 : 0.8;
    return Number((base * 12.5 * multiplier).toFixed(2));
  },
  periode(tahun: number, sem: 1 | 2) {
    return sem === 1
      ? { mulai: `01/01/${tahun}`, selesai: `30/06/${tahun}` }
      : { mulai: `01/07/${tahun}`, selesai: `31/12/${tahun}` };
  },
  today: () => new Date().toLocaleDateString('id-ID')
};

const useSheets = () => {
  const { toast } = useToast();

  const call = async (operation: string, payload?: any) => {
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: { spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME, operation, ...payload }
    });

    if (error) {
      console.error('Supabase Function Error:', error);
      toast({ title: "Error", description: error.message || "Gagal akses Google Sheets", variant: "destructive" });
      throw error;
    }
    return data;
  };

  return {
    read: () => call('read'),
    append: (values: any[]) => call('append', { values: [values] }),
    update: (rowIndex: number, values: any[]) => call('update', { rowIndex, values: [values] }),
    delete: (rowIndex: number) => call('delete', { rowIndex })
  };
};

const LayananKarir: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSheets();
  const [data, setData] = useState<KonversiData[]>([]);
  const [loading, setLoading] = useState(false);
  const [unsaved, setUnsaved] = useState<KonversiData[]>([]);
  const [editItem, setEditItem] = useState<KonversiData | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.read();
      const rows = res.values || [];
      const parsed: KonversiData[] = [];

      if (rows.length > 1) {
        rows.slice(1).forEach((row: any[], i: number) => {
          if (row[1] === karyawan.nip) { // kolom B = NIP
            parsed.push({
              rowIndex: i + 2,
              NIP: row[1] || '',
              Nama: row[2] || '',
              Tahun: Number(row[3]) || 0,
              Semester: Number(row[4]) as 1 | 2,
              Predikat: row[5] || 'Baik',
              'Nilai SKP': Number(row[6]) || 0,
              'AK Konversi': Number(row[7]) || 0,
              'TMT Mulai': row[8] || '',
              'TMT Selesai': row[9] || '',
              Status: row[10] || 'Generated',
              Catatan: row[11] || '',
              Last_Update: row[13] || ''
            });
          }
        });
      }

      // Auto-generate missing semesters
      const current = new Date();
      const currYear = current.getFullYear();
      const currSem = current.getMonth() >= 6 ? 2 : 1;

      for (let y = 2020; y <= currYear; y++) {
        for (let s = 1; s <= 2; s++) {
          if (y === currYear && s > currSem) continue;
          if (parsed.some(d => d.Tahun === y && d.Semester === s)) continue;

          const p = Calculator.periode(y, s as 1 | 2);
          unsaved.push({
            NIP: karyawan.nip,
            Nama: karyawan.nama,
            Tahun: y,
            Semester: s as 1 | 2,
            Predikat: 'Baik',
            'Nilai SKP': 80,
            'AK Konversi': Calculator.ak('Baik', 80),
            'TMT Mulai': p.mulai,
            'TMT Selesai': p.selesai,
            Status: 'Draft',
            Last_Update: Calculator.today()
          });
        }
      }

      setData(parsed);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [karyawan.nip]);

  const recalc = (item: KonversiData) => {
    item['AK Konversi'] = Calculator.ak(item.Predikat, item['Nilai SKP']);
    item.Last_Update = Calculator.today();
    setData([...data]);
    setUnsaved([...unsaved]);
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      // Simpan draft lokal (unsaved)
      for (const item of unsaved) {
        const values = [
          '', item.NIP, item.Nama, item.Tahun, item.Semester,
          item.Predikat, item['Nilai SKP'], item['AK Konversi'],
          item['TMT Mulai'], item['TMT Selesai'], 'Generated',
          item.Catatan || '', '', Calculator.today()
        ];
        await api.append(values);
      }

      // Update yang diedit
      for (const item of data.filter(d => d.Status === 'Draft' || unsaved.some(u => u.Tahun === d.Tahun && u.Semester === d.Semester))) {
        const values = [
          '', item.NIP, item.Nama, item.Tahun, item.Semester,
          item.Predikat, item['Nilai SKP'], item['AK Konversi'],
          item['TMT Mulai'], item['TMT Selesai'], 'Generated',
          item.Catatan || '', '', Calculator.today()
        ];
        if (item.rowIndex) await api.update(item.rowIndex, values);
      }

      toast({ title: "Sukses!", description: "Semua data tersimpan ke Google Sheets" });
      setUnsaved([]);
      load();
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasUnsaved = unsaved.length > 0 || data.some(d => d.Status === 'Draft');

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Konversi Predikat → Angka Kredit</CardTitle>
          <CardDescription>{karyawan.nama} ({karyawan.nip})</CardDescription>
        </CardHeader>
        <CardContent>
          {hasUnsaved && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex justify-between items-center">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Ada {unsaved.length} semester belum disimpan permanen</span>
              </div>
              <Button onClick={saveAll} disabled={loading}>
                <Save className="h-4 w-4 mr-2" /> Simpan Semua ke Google Sheets
              </Button>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Sem</TableHead>
                  <TableHead>Predikat</TableHead>
                  <TableHead>SKP</TableHead>
                  <TableHead>AK</TableHead>
                  <TableHead>Per1ode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data, ...unsaved].sort((a, b) => b.Tahun - a.Tahun || b.Semester - a.Semester).map((d, i) => (
                  <TableRow key={i} className={unsaved.includes(d) ? 'bg-yellow-50' : ''}>
                    <TableCell>{d.Tahun}</TableCell>
                    <TableCell>{d.Semester}</TableCell>
                    <TableCell>
                      <select value={d.Predikat} onChange={e => { d.Predikat = e.target.value as any; recalc(d); }}
                        className="px-2 py-1 border rounded text-sm">
                        <option>Sangat Baik</option>
                        <option>Baik</option>
                        <option>Cukup</option>
                        <option>Kurang</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <input type="number" value={d['Nilai SKP']} onChange={e => { d['Nilai SKP'] = Number(e.target.value); recalc(d); }}
                        className="w-16 px-2 py-1 border rounded text-sm" />
                    </TableCell>
                    <TableCell className="font-bold text-blue-600">{d['AK Konversi']}</TableCell>
                    <TableCell className="text-xs">{d['TMT Mulai']} - {d['TMT Selesai']}</TableCell>
                    <TableCell>
                      <Badge variant={d.Status === 'Generated' ? 'default' : 'secondary'}>{d.Status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LayananKarir;