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

  // Aggregate by kegiatan: per-person nominal accumulation by status
  const byKegiatan = useMemo(() => {
    const map = new Map<string, {
      kegiatan: string;
      totalAjuan: number;
      totalDisetujui: number;
      totalDitolak: number;
      totalPending: number;
      countOrang: number;
      countApproved: number;
    }>();
    for (const row of rawRows) {
      const totalPeople = row.organikList.length + row.mitraList.length;
      const existing = map.get(row.kegiatan) || {
        kegiatan: row.kegiatan,
        totalAjuan: 0,
        totalDisetujui: 0,
        totalDitolak: 0,
        totalPending: 0,
        countOrang: 0,
        countApproved: 0,
      };
      existing.totalAjuan += row.nominal * totalPeople;
      existing.countOrang += totalPeople;
      row.statusList.forEach(st => {
        if (['approved', 'approved_ppk', 'completed'].includes(st)) {
          existing.totalDisetujui += row.nominal;
          existing.countApproved += 1;
        } else if (['rejected', 'rejected_ppk'].includes(st)) {
          existing.totalDitolak += row.nominal;
        } else {
          existing.totalPending += row.nominal;
        }
      });
      map.set(row.kegiatan, existing);
    }
    return Array.from(map.values());
  }, [rawRows]);

  // Stats
  const totalOrganik = persons.filter(p => p.tipe === 'Organik').length;
  const totalMitra = persons.filter(p => p.tipe === 'Mitra').length;
  const grandTotalAjuan = byKegiatan.reduce((s, k) => s + k.totalAjuan, 0);
  const grandTotalDisetujui = byKegiatan.reduce((s, k) => s + k.totalDisetujui, 0);

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
            <p className="text-sm text-muted-foreground">Total Nominal Ajuan</p>
            <p className="text-2xl font-bold">Rp {grandTotalAjuan.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Disetujui PPK</p>
            <p className="text-2xl font-bold text-green-600">Rp {grandTotalDisetujui.toLocaleString('id-ID')}</p>
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
                    <th className="px-4 py-2 text-right">Jml Petugas</th>
                    <th className="px-4 py-2 text-right">Disetujui (org)</th>
                    <th className="px-4 py-2 text-right">Total Ajuan</th>
                    <th className="px-4 py-2 text-right">Total Disetujui</th>
                  </tr>
                </thead>
                <tbody>
                  {byKegiatan.map(k => (
                    <tr key={k.kegiatan} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{k.kegiatan}</td>
                      <td className="px-4 py-2 text-right">{k.countOrang}</td>
                      <td className="px-4 py-2 text-right">{k.countApproved}</td>
                      <td className="px-4 py-2 text-right font-mono">Rp {k.totalAjuan.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-600 font-semibold">Rp {k.totalDisetujui.toLocaleString('id-ID')}</td>
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
                    <th className="px-4 py-2 text-right">Total Ajuan</th>
                    <th className="px-4 py-2 text-right">Total Disetujui</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p, idx) => {
                    // Hitung total disetujui dari entries yang approved
                    const totalDisetujui = p.entries
                      .filter((e): e is NonNullable<typeof e> => e !== null)
                      .filter(e => ['approved', 'approved_ppk', 'completed'].includes(e.status))
                      .reduce((sum, e) => sum + e.nominal, 0);
                    
                    return (
                    <tr key={p.nama} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium">{p.nama}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={p.tipe === 'Organik' ? 'default' : 'secondary'}>{p.tipe}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        {p.entries
                          .filter((e): e is NonNullable<typeof e> => e !== null)
                          .map((e, i) => {
                            const statusIcon = (() => {
                              if (['approved', 'approved_ppk', 'completed'].includes(e.status)) {
                                return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 mr-1 text-xs">✓</span>;
                              }
                              if (['rejected', 'rejected_ppk'].includes(e.status)) {
                                return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 mr-1 text-xs">❌</span>;
                              }
                              if (['pending', 'pending_ppk'].includes(e.status)) {
                                return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 mr-1 text-xs">⏳</span>;
                              }
                              return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 mr-1 text-xs">-</span>;
                            })();
                            return (
                              <div key={i} className="text-xs flex items-center mb-1">
                                {statusIcon}
                                <span>{e.kegiatan} — Rp {e.nominal.toLocaleString('id-ID')}</span>
                              </div>
                            );
                          })}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">
                        Rp {p.total.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-green-600">
                        Rp {totalDisetujui.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {p.entries
                          .filter((e): e is NonNullable<typeof e> => e !== null)
                          .map((e, i) => {
                          const badge = (() => {
                            if (['approved', 'approved_ppk', 'completed'].includes(e.status))
                              return { label: '✓', variant: 'default' as const };
                            if (['rejected', 'rejected_ppk'].includes(e.status))
                              return { label: '❌', variant: 'destructive' as const };
                            if (['pending', 'pending_ppk'].includes(e.status))
                              return { label: '⏳', variant: 'outline' as const };
                            return { label: 'Draft', variant: 'secondary' as const };
                          })();
                          return <Badge key={i} variant={badge.variant} className="text-xs mx-0.5">{badge.label}</Badge>;
                        })}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
