// components/LayananKarir.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Save, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Karyawan {
  nip: string;
  nama: string;
  jabatan: string;
}

interface KonversiData {
  No?: number;
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
  rowIndex?: number; // -1 = draft lokal
}

const SPREADSHEET_ID = "16bW5Jj-WWQ9hOhhHX96B1a9SSawGJvfgn3SCosWMD80";
const SHEET_NAME = "konversi_predikat";

const Calculator = {
  ak(predikat: string, skp: number): number {
    const base = { 'Sangat Baik': 1.5, 'Baik': 1.0, 'Cukup': 0.75, 'Kurang': 0.5 }[predikat] || 1.0;
    const m = skp >= 91 ? 1.2 : skp >= 81 ? 1.1 : skp >= 71 ? 1.0 : skp >= 61 ? 0.9 : 0.8;
    return Number((base * 12.5 * m).toFixed(2));
  },
  periode(tahun: number, sem: 1 | 2) {
    return sem === 1
      ? { mulai: `01/01/${tahun}`, selesai: `30/06/${tahun}` }
      : { mulai: `01/07/${tahun}`, selesai: `31/12/${tahun}` };
  },
  today: () => new Date().toLocaleDateString('id-ID'),
  currentSem: (): { tahun: number; semester: 1 | 2 } => {
    const n = new Date();
    return { tahun: n.getFullYear(), semester: n.getMonth() >= 6 ? 2 : 1 };
  }
};

const useSheets = () => {
  const { toast } = useToast();
  const call = async (op: string, payload?: any) => {
    const { data, error } = await supabase.functions.invoke('google-sheets', {
      body: { spreadsheetId: SPREADSHEET_ID, range: SHEET_NAME, operation: op, ...payload }
    });
    if (error) throw error;
    return data;
  };
  return {
    read: () => call('read'),
    append: (v: any[]) => call('append', { values: [v] }),
    update: (row: number, v: any[]) => call('update', { rowIndex: row, values: [v] }),
    delete: (row: number) => call('delete', { rowIndex: row })
  };
};

const LayananKarir: React.FC<{ karyawan: Karyawan }> = ({ karyawan }) => {
  const { toast } = useToast();
  const api = useSheets();
  const [allData, setAllData] = useState<KonversiData[]>([]); // semua data (existing + draft)
  const [loading, setLoading] = useState(false);

  // Auto generate + nomor urut otomatis
  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await api.read();
      const rows = (res.values || []).slice(1); // skip header
      const existing: KonversiData[] = [];

      rows.forEach((row: any[], i: number) => {
        if (row[1] === karyawan.nip) { // kolom B = NIP
          existing.push({
            No: Number(row[0]) || (i + 1),
            NIP: row[1],
            Nama: row[2],
            Tahun: Number(row[3]),
            Semester: Number(row[4]) as 1 | 2,
            Predikat: row[5] || 'Baik',
            'Nilai SKP': Number(row[6]) || 95,
            'AK Konversi': Number(row[7]) || 0,
            'TMT Mulai': row[8] || '',
            'TMT Selesai': row[9] || '',
            Status: row[10] || 'Generated',
            Catatan: row[11] || '',
            Last_Update: row[13] || '',
            rowIndex: i + 2
          });
        }
      });

      // Generate missing semesters
      const { tahun: currY, semester: currS } = Calculator.currentSem();
      const drafts: KonversiData[] = [];

      for (let y = 2020; y <= currY; y++) {
        for (let s = 1; s <= 2; s++) {
          if (y === currY && s > currS) continue;
          if (existing.some(d => d.Tahun === y && d.Semester === s)) continue;

          const p = Calculator.periode(y, s as 1 | 2);
          drafts.push({
            NIP: karyawan.nip,
            Nama: karyawan.nama,
            Tahun: y,
            Semester: s as 1 | 2,
            Predikat: 'Baik',
            'Nilai SKP': 95,                    // ← DEFAULT 95
            'AK Konversi': Calculator.ak('Baik', 95),
            'TMT Mulai': p.mulai,
            'TMT Selesai': p.selesai,
            Status: 'Draft',
            Last_Update: Calculator.today(),
            rowIndex: -1
          });
        }
      }

      // Gabungkan + urutkan + beri nomor otomatis
      const combined = [...existing, ...drafts]
        .sort((a, b) => b.Tahun - a.Tahun || b.Semester - a.Semester);

      combined.forEach((item, idx) => item.No = idx + 1);

      setAllData(combined);
    } catch (e) {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, [karyawan.nip]);

  const recalc = (item: KonversiData) => {
    item['AK Konversi'] = Calculator.ak(item.Predikat, item['Nilai SKP']);
    item.Last_Update = Calculator.today();
    setAllData([...allData]);
  };

  const saveAll = async () => {
    if (!allData.some(d => d.Status === 'Draft' && d.rowIndex === -1)) {
      toast({ title: "Info", description: "Tidak ada data baru" });
      return;
    }

    setLoading(true);
    try {
      for (const item of allData.filter(d => d.rowIndex === -1)) {
        const values = [
          item.No,                                // ← No. otomatis
          item.NIP,
          item.Nama,
          item.Tahun,
          item.Semester,
          item.Predikat,
          item['Nilai SKP'],
          item['AK Konversi'],
          item['TMT Mulai'],
          item['TMT Selesai'],
          'Generated',                           // langsung jadi Generated
          item.Catatan || '',
          '',                                    // Link_Dokumen (kosong)
          Calculator.today()
        ];
        await api.append(values);
      }

      toast({ title: "Sukses!", description: "Semua data baru tersimpan ke Google Sheets" });
      refreshData();
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasDraft = allData.some(d => d.Status === 'Draft' && d.rowIndex === -1);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Konversi Predikat → Angka Kredit</CardTitle>
          <CardDescription>{karyawan.nama} • {karyawan.nip}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasDraft && (
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-300 rounded-lg">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  Ada {allData.filter(d => d.rowIndex === -1).length} semester belum disimpan permanen
                </span>
              </div>
              <Button onClick={saveAll} disabled={loading} className="font-bold">
                <Save className="h-4 w-4 mr-2" />
                Simpan Semua ke Google Sheets
              </Button>
            </div>
          )}

          {loading ? (
            <p className="text-center py-12">Memuat data...</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No.</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Predikat</TableHead>
                    <TableHead>Nilai SKP</TableHead>
                    <TableHead>AK Konversi</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allData.map((d, i) => (
                    <TableRow key={i} className={d.rowIndex === -1 ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">{d.No}</TableCell>
                      <TableCell>{d.Tahun}</TableCell>
                      <TableCell>{d.Semester}</TableCell>
                      <TableCell>
                        <select
                          value={d.Predikat}
                          onChange={e => { d.Predikat = e.target.value as any; recalc(d); }}
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
                          onChange={e => { d['Nilai SKP'] = Number(e.target.value) || 95; recalc(d); }}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">
                        {d['AK Konversi']}
                      </TableCell>
                      <TableCell className="text-xs">
                        {d['TMT Mulai']} s/d {d['TMT Selesai']}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.Status === 'Generated' ? 'default' : 'secondary'}>
                          {d.Status}
                        </Badge>
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