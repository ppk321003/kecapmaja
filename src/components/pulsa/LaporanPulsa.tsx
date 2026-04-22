import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Layers, Wallet } from 'lucide-react';
import { readPulsaData, buildPersonView, PulsaRow } from '@/services/pulsaSheetsService';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { terbilangRupiah, cleanTerbilang } from '@/lib/terbilang';
import { useAuth } from '@/contexts/AuthContext';

interface LaporanPulsaProps {
  bulan: number;
  tahun: number;
}

export const LaporanPulsa: React.FC<LaporanPulsaProps> = ({ bulan, tahun }) => {
  const satkerConfig = useSatkerConfigContext();
  const pulsaSheetId = satkerConfig?.getUserSatkerSheetId('pulsa') || '';
  const { user } = useAuth();
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';

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

  // PPK Resume — analisis per orang
  const ppkResume = useMemo(() => {
    const APPROVED = ['approved', 'approved_ppk', 'completed'];
    const PENDING = ['pending', 'pending_ppk', 'draft', ''];
    const REJECTED = ['rejected', 'rejected_ppk'];
    const LIMIT_PER_ORANG = 150000;

    let totalAjuanCount = 0;
    let totalDisetujuiCount = 0;
    let totalRejectedCount = 0;
    let totalPendingCount = 0;

    const namaDisetujui0: { nama: string; tipe: string; ajuan: number }[] = [];
    const namaDisetujuiMultiKegiatan: { nama: string; tipe: string; kegiatan: string[]; total: number }[] = [];
    const namaDisetujuiMelebihi: { nama: string; tipe: string; total: number; kelebihan: number }[] = [];

    for (const p of persons) {
      const validEntries = p.entries.filter((e): e is NonNullable<typeof e> => e !== null);
      const approvedEntries = validEntries.filter(e => APPROVED.includes(e.status));
      const rejectedEntries = validEntries.filter(e => REJECTED.includes(e.status));
      const pendingEntries = validEntries.filter(e => !APPROVED.includes(e.status) && !REJECTED.includes(e.status));

      totalAjuanCount += validEntries.length;
      totalDisetujuiCount += approvedEntries.length;
      totalRejectedCount += rejectedEntries.length;
      totalPendingCount += pendingEntries.length;

      const totalApproved = approvedEntries.reduce((s, e) => s + e.nominal, 0);

      // diajukan tapi disetujui 0 → ada ajuan tapi tidak ada yg approved
      if (validEntries.length > 0 && approvedEntries.length === 0) {
        namaDisetujui0.push({
          nama: p.nama,
          tipe: p.tipe,
          ajuan: validEntries.reduce((s, e) => s + e.nominal, 0),
        });
      }

      // disetujui lebih dari 1 kegiatan
      const uniqApprovedKeg = Array.from(new Set(approvedEntries.map(e => e.kegiatan)));
      if (uniqApprovedKeg.length > 1) {
        namaDisetujuiMultiKegiatan.push({
          nama: p.nama,
          tipe: p.tipe,
          kegiatan: uniqApprovedKeg,
          total: totalApproved,
        });
      }

      // total disetujui melebihi 150.000
      if (totalApproved > LIMIT_PER_ORANG) {
        namaDisetujuiMelebihi.push({
          nama: p.nama,
          tipe: p.tipe,
          total: totalApproved,
          kelebihan: totalApproved - LIMIT_PER_ORANG,
        });
      }
    }

    // Tambahan resume
    const persetujuanRate = totalAjuanCount > 0
      ? Math.round((totalDisetujuiCount / totalAjuanCount) * 100)
      : 0;
    const efisiensiAnggaran = grandTotalAjuan > 0
      ? Math.round((grandTotalDisetujui / grandTotalAjuan) * 100)
      : 0;
    const selisih = grandTotalAjuan - grandTotalDisetujui;
    const orangBelumDiproses = persons.filter(p => {
      const v = p.entries.filter((e): e is NonNullable<typeof e> => e !== null);
      return v.some(e => !APPROVED.includes(e.status) && !REJECTED.includes(e.status));
    }).length;

    return {
      totalAjuanCount,
      totalDisetujuiCount,
      totalRejectedCount,
      totalPendingCount,
      namaDisetujui0,
      namaDisetujuiMultiKegiatan,
      namaDisetujuiMelebihi,
      persetujuanRate,
      efisiensiAnggaran,
      selisih,
      orangBelumDiproses,
    };
  }, [persons, grandTotalAjuan, grandTotalDisetujui]);

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
    <div className="space-y-3">
      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground truncate">Total Petugas</p>
            <p className="text-2xl font-bold">{persons.length}</p>
            <p className="text-sm text-muted-foreground line-clamp-1">Organik: {totalOrganik} Mitra: {totalMitra}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Kegiatan</p>
            <p className="text-2xl font-bold">{byKegiatan.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground truncate">Nominal Ajuan</p>
            <p className="text-lg font-bold font-mono">Rp {(grandTotalAjuan/1000000).toFixed(1)} Juta</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Disetujui PPK</p>
            <p className="text-lg font-bold font-mono text-green-600">Rp {(grandTotalDisetujui/1000000).toFixed(1)} Juta</p>
          </CardContent>
        </Card>
      </div>

      {/* PPK Resume Card — visible only for PPK */}
      {isPPK && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="p-4 bg-primary/5 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Resume PPK — {bulanNama}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Top metrics - 2x2 grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Layers className="w-4 h-4" /> Diajukan
                </p>
                <p className="text-2xl font-bold">{ppkResume.totalAjuanCount}</p>
              </div>
              <div className="rounded border bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <p className="text-sm text-emerald-700 font-semibold">Disetujui</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {ppkResume.totalDisetujuiCount}
                </p>
                <p className="text-xs text-emerald-600">{ppkResume.persetujuanRate}%</p>
              </div>
              <div className="rounded border bg-rose-50 dark:bg-rose-950/30 p-3">
                <p className="text-sm text-rose-700 font-semibold">Ditolak</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                  {ppkResume.totalRejectedCount}
                </p>
              </div>
              <div className="rounded border bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-sm text-amber-700 font-semibold">Pending</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {ppkResume.totalPendingCount}
                </p>
              </div>
            </div>

            {/* Nominal & efisiensi - single row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
              <div className="rounded border p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-4 h-4" /> Ajuan vs Disetujui
                </p>
                <p className="text-sm font-mono font-semibold mt-1">
                  Rp {(grandTotalAjuan/1000000).toFixed(1)} Juta → <span className="text-emerald-600">Rp {(grandTotalDisetujui/1000000).toFixed(1)} Juta</span>
                </p>
                <p className="text-xs text-red-600 mt-1">Selisih: Rp {(ppkResume.selisih/1000000).toFixed(1)} Juta</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Efisiensi
                </p>
                <p className="text-2xl font-bold">{ppkResume.efisiensiAnggaran}%</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Perhatian
                </p>
                <p className="text-2xl font-bold text-amber-700">
                  {ppkResume.namaDisetujui0.length + ppkResume.namaDisetujuiMultiKegiatan.length + ppkResume.namaDisetujuiMelebihi.length}
                </p>
              </div>
            </div>

            {/* Alert boxes - compact */}
            <div className="space-y-2 pt-2">
              {/* Diajukan tetapi Disetujui 0 */}
              <div className="rounded border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 p-3">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  Diajukan tapi Rp 0
                  <Badge variant="destructive" className="ml-auto text-xs px-2 py-0.5">{ppkResume.namaDisetujui0.length}</Badge>
                </p>
                {ppkResume.namaDisetujui0.length > 0 && (
                  <ul className="text-xs space-y-0.5 mt-2 max-h-20 overflow-y-auto">
                    {ppkResume.namaDisetujui0.map((n, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{n.tipe === 'Organik' ? '🟢' : '🔵'} {n.nama}</span>
                        <span className="font-mono shrink-0">Rp {(n.ajuan/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Disetujui multi-kegiatan */}
              <div className="rounded border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Multi Kegiatan
                  <Badge variant="outline" className="ml-auto text-xs px-2 py-0.5 border-amber-500 text-amber-700">
                    {ppkResume.namaDisetujuiMultiKegiatan.length}
                  </Badge>
                </p>
                {ppkResume.namaDisetujuiMultiKegiatan.length > 0 && (
                  <ul className="text-xs space-y-0.5 mt-2 max-h-20 overflow-y-auto">
                    {ppkResume.namaDisetujuiMultiKegiatan.map((n, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{n.tipe === 'Organik' ? '🟢' : '🔵'} {n.nama}</span>
                        <span className="font-mono shrink-0">Rp {(n.total/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Disetujui melebihi 150rb */}
              <div className="rounded border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 p-3">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Melebihi Rp 150K
                  <Badge variant="outline" className="ml-auto text-xs px-2 py-0.5 border-orange-500 text-orange-700">
                    {ppkResume.namaDisetujuiMelebihi.length}
                  </Badge>
                </p>
                {ppkResume.namaDisetujuiMelebihi.length > 0 && (
                  <ul className="text-xs space-y-0.5 mt-2 max-h-20 overflow-y-auto">
                    {ppkResume.namaDisetujuiMelebihi.map((n, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{n.tipe === 'Organik' ? '🟢' : '🔵'} {n.nama}</span>
                        <span className="font-mono text-rose-600 shrink-0">+Rp {(n.kelebihan/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Kegiatan */}
      <Card className="shadow-sm">
        <CardHeader className="p-3 border-b">
          <CardTitle className="text-sm">Per Kegiatan — {bulanNama}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {byKegiatan.length === 0 ? (
            <p className="text-center text-muted-foreground py-2 text-sm">Tidak ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[11px]">
                  <tr>
                    <th className="px-2 py-1 text-left">Kegiatan</th>
                    <th className="px-2 py-1 text-right">Org</th>
                    <th className="px-2 py-1 text-right">OK</th>
                    <th className="px-2 py-1 text-right">Ajuan</th>
                    <th className="px-2 py-1 text-right">Disetujui</th>
                  </tr>
                </thead>
                <tbody>
                  {byKegiatan.map(k => (
                    <tr key={k.kegiatan} className="border-b hover:bg-muted/50 text-[11px]">
                      <td className="px-2 py-1 font-medium truncate">{k.kegiatan}</td>
                      <td className="px-2 py-1 text-right">{k.countOrang}</td>
                      <td className="px-2 py-1 text-right">{k.countApproved}</td>
                      <td className="px-2 py-1 text-right font-mono">Rp {(k.totalAjuan/1000000).toFixed(1)}J</td>
                      <td className="px-2 py-1 text-right font-mono text-green-600 font-semibold">Rp {(k.totalDisetujui/1000000).toFixed(1)}J</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-semibold border-t text-[11px]">
                    <td className="px-2 py-1 text-left">TOTAL</td>
                    <td className="px-2 py-1 text-right">{byKegiatan.reduce((sum, k) => sum + k.countOrang, 0)}</td>
                    <td className="px-2 py-1 text-right">{byKegiatan.reduce((sum, k) => sum + k.countApproved, 0)}</td>
                    <td className="px-2 py-1 text-right font-mono">Rp {(byKegiatan.reduce((sum, k) => sum + k.totalAjuan, 0)/1000000).toFixed(1)}J</td>
                    <td className="px-2 py-1 text-right font-mono text-green-600">Rp {(byKegiatan.reduce((sum, k) => sum + k.totalDisetujui, 0)/1000000).toFixed(1)}J</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {byKegiatan.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="text-muted-foreground text-[10px]">Total Terbilang:</p>
              <p className="font-semibold text-blue-900 capitalize line-clamp-2 text-[11px] mt-0.5">
                {cleanTerbilang(terbilangRupiah(byKegiatan.reduce((sum, k) => sum + k.totalDisetujui, 0)))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Person */}
      <Card className="shadow-sm">
        <CardHeader className="p-3 border-b">
          <CardTitle className="text-sm">Daftar Petugas — {bulanNama}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {persons.length === 0 ? (
            <p className="text-center text-muted-foreground py-2 text-sm">Tidak ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[11px]">
                  <tr>
                    <th className="px-2 py-1 text-left">Nama</th>
                    <th className="px-2 py-1 text-center">T</th>
                    <th className="px-2 py-1 text-left">Kegiatan / Nominal</th>
                    <th className="px-2 py-1 text-right">Ajuan</th>
                    <th className="px-2 py-1 text-right">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p, idx) => {
                    const totalDisetujui = p.entries
                      .filter((e): e is NonNullable<typeof e> => e !== null)
                      .filter(e => ['approved', 'approved_ppk', 'completed'].includes(e.status))
                      .reduce((sum, e) => sum + e.nominal, 0);
                    
                    const validEntries = p.entries.filter((e): e is NonNullable<typeof e> => e !== null);
                    const statusSummary = validEntries.map(e => {
                      if (['approved', 'approved_ppk', 'completed'].includes(e.status)) return '✓';
                      if (['rejected', 'rejected_ppk'].includes(e.status)) return '✕';
                      if (['pending', 'pending_ppk'].includes(e.status)) return '⏳';
                      return '−';
                    }).join('');

                    return (
                    <tr key={p.nama} className="border-b hover:bg-muted/50 text-[11px]">
                      <td className="px-2 py-1 font-medium truncate">{p.nama}</td>
                      <td className="px-2 py-1 text-center text-[10px]">{p.tipe === 'Organik' ? 'O' : 'M'}</td>
                      <td className="px-2 py-1 text-[10px]">
                        {validEntries.map((e, i) => {
                          const icon = (['approved', 'approved_ppk', 'completed'].includes(e.status) ? '✓' : 
                                       (['rejected', 'rejected_ppk'].includes(e.status) ? '✕' : 
                                        (['pending', 'pending_ppk'].includes(e.status) ? '⏳' : '−')));
                          return (
                            <div key={i} className="truncate">
                              {icon} {e.kegiatan} (Rp {(e.nominal/1000).toFixed(0)}K)
                            </div>
                          );
                        })}
                      </td>
                      <td className="px-2 py-1 text-right font-mono font-semibold text-[10px]">
                        Rp {(p.total/1000).toFixed(0)}K
                      </td>
                      <td className="px-2 py-1 text-right font-mono font-semibold text-green-600 text-[10px]">
                        Rp {(totalDisetujui/1000).toFixed(0)}K
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
