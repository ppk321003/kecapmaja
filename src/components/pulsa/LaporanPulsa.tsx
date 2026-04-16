import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { readPulsaData, buildPersonView, PulsaRow } from '@/services/pulsaSheetsService';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';

interface LaporanPulsaProps {
  bulan: number;
  tahun: number;
}

export const LaporanPulsa: React.FC<LaporanPulsaProps> = ({ bulan, tahun }) => {
  const satkerConfig = useSatkerConfigContext();
  const pulsaSheetId = satkerConfig?.getUserSatkerSheetId('pulsa') || '';

  const [rawRows, setRawRows] = useState<PulsaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pulsaSheetId) { setLoading(false); return; }
    setLoading(true);
    readPulsaData(pulsaSheetId)
      .then(all => setRawRows(all.filter(r => r.bulan === bulan && r.tahun === tahun)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bulan, tahun, pulsaSheetId]);

  const persons = useMemo(() => buildPersonView(rawRows), [rawRows]);

  // Aggregate by kegiatan
  const byKegiatan = useMemo(() => {
    const map = new Map<string, { kegiatan: string; nominal: number; count: number; approved: number }>();
    for (const row of rawRows) {
      const peopleCount = row.organikList.length + row.mitraList.length;
      const existing = map.get(row.kegiatan) || { kegiatan: row.kegiatan, nominal: 0, count: 0, approved: 0 };
      existing.nominal += row.nominal * peopleCount;
      existing.count += peopleCount;
      if (['approved', 'approved_ppk', 'completed'].includes(row.status)) {
        existing.approved += peopleCount;
      }
      map.set(row.kegiatan, existing);
    }
    return Array.from(map.values());
  }, [rawRows]);

  // Stats
  const totalOrganik = persons.filter(p => p.tipe === 'Organik').length;
  const totalMitra = persons.filter(p => p.tipe === 'Mitra').length;
  const grandTotal = persons.reduce((s, p) => s + p.total, 0);
  const approvedTotal = rawRows
    .filter(r => ['approved', 'approved_ppk', 'completed'].includes(r.status))
    .reduce((s, r) => s + r.nominal * (r.organikList.length + r.mitraList.length), 0);

  const bulanNama = new Date(tahun, bulan - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!pulsaSheetId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Sheet ID pulsa belum dikonfigurasi.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Petugas</p>
            <p className="text-2xl font-bold">{persons.length}</p>
            <p className="text-xs text-muted-foreground">Organik: {totalOrganik} | Mitra: {totalMitra}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Kegiatan</p>
            <p className="text-2xl font-bold">{byKegiatan.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Grand Total</p>
            <p className="text-2xl font-bold">Rp {grandTotal.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Approved</p>
            <p className="text-2xl font-bold text-green-600">Rp {approvedTotal.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
      </div>

      {/* By Kegiatan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Breakdown per Kegiatan — {bulanNama}</CardTitle>
        </CardHeader>
        <CardContent>
          {byKegiatan.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Tidak ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Kegiatan</th>
                    <th className="px-4 py-2 text-right">Jumlah Petugas</th>
                    <th className="px-4 py-2 text-right">Approved</th>
                    <th className="px-4 py-2 text-right">Total Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {byKegiatan.map(k => (
                    <tr key={k.kegiatan} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{k.kegiatan}</td>
                      <td className="px-4 py-2 text-right">{k.count}</td>
                      <td className="px-4 py-2 text-right">{k.approved}</td>
                      <td className="px-4 py-2 text-right font-mono">Rp {k.nominal.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Person */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Petugas — {bulanNama}</CardTitle>
        </CardHeader>
        <CardContent>
          {persons.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Tidak ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">No</th>
                    <th className="px-4 py-2 text-left">Nama</th>
                    <th className="px-4 py-2 text-center">Tipe</th>
                    <th className="px-4 py-2 text-left">Kegiatan</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p, idx) => (
                    <tr key={p.nama} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium">{p.nama}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={p.tipe === 'Organik' ? 'default' : 'secondary'}>{p.tipe}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        {p.entries.map((e, i) => (
                          <div key={i} className="text-xs">
                            {e.kegiatan} — Rp {e.nominal.toLocaleString('id-ID')}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">
                        Rp {p.total.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {p.entries.map((e, i) => {
                          const badge = (() => {
                            if (['approved', 'approved_ppk', 'completed'].includes(e.status))
                              return { label: '✓', variant: 'default' as const };
                            if (['pending', 'pending_ppk'].includes(e.status))
                              return { label: '⏳', variant: 'outline' as const };
                            return { label: 'Draft', variant: 'secondary' as const };
                          })();
                          return <Badge key={i} variant={badge.variant} className="text-xs mx-0.5">{badge.label}</Badge>;
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
