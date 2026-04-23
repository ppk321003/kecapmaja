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

      {/* PPK Resume Card — visible only for PPK */}
      {isPPK && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-2 bg-primary/5 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Resume PPK — Analisis Persetujuan {bulanNama}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            {/* Top metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border bg-muted/30 p-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Jumlah Diajukan
                </p>
                <p className="text-xl font-bold leading-tight">{ppkResume.totalAjuanCount}</p>
                <p className="text-[11px] text-muted-foreground">entri pengajuan</p>
              </div>
              <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disetujui
                </p>
                <p className="text-xl font-bold leading-tight text-emerald-700 dark:text-emerald-400">
                  {ppkResume.totalDisetujuiCount}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  ({ppkResume.persetujuanRate}% dari ajuan)
                </p>
              </div>
              <div className="rounded-lg border bg-rose-50 dark:bg-rose-950/30 p-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-rose-600" /> Ditolak
                </p>
                <p className="text-xl font-bold leading-tight text-rose-700 dark:text-rose-400">
                  {ppkResume.totalRejectedCount}
                </p>
                <p className="text-[11px] text-muted-foreground">entri</p>
              </div>
              <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Belum Diproses
                </p>
                <p className="text-xl font-bold leading-tight text-amber-700 dark:text-amber-400">
                  {ppkResume.totalPendingCount}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {ppkResume.orangBelumDiproses} orang menunggu
                </p>
              </div>
            </div>

            {/* Nominal & efisiensi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Total Ajuan vs Disetujui
                </p>
                <p className="text-sm font-mono mt-0.5">
                  Rp {grandTotalAjuan.toLocaleString('id-ID')} → <span className="text-emerald-600 font-semibold">Rp {grandTotalDisetujui.toLocaleString('id-ID')}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Selisih: Rp {ppkResume.selisih.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Efisiensi Anggaran
                </p>
                <p className="text-2xl font-bold leading-tight">{ppkResume.efisiensiAnggaran}%</p>
                <p className="text-[11px] text-muted-foreground">nominal disetujui / ajuan</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Item Perhatian
                </p>
                <p className="text-2xl font-bold leading-tight text-amber-700">
                  {ppkResume.namaDisetujui0.length + ppkResume.namaDisetujuiMultiKegiatan.length + ppkResume.namaDisetujuiMelebihi.length}
                </p>
                <p className="text-[11px] text-muted-foreground">total temuan</p>
              </div>
            </div>

            {/* Alert boxes - 3 kolom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Daftar nama disetujui 0 */}
              <div className="rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 p-2">
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4" />
                  Diajukan tetapi Disetujui Rp 0
                  <Badge variant="destructive" className="ml-auto">{ppkResume.namaDisetujui0.length}</Badge>
                </p>
                {ppkResume.namaDisetujui0.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada — semua ajuan telah mendapat persetujuan ✓</p>
                ) : (
                  <ul className="text-xs space-y-0.5 max-h-48 overflow-y-auto">
                    {ppkResume.namaDisetujui0.map((n, i) => (
                      <li key={i} className="flex justify-between border-b border-rose-100 dark:border-rose-900 py-0.5">
                        <span><Badge variant="outline" className="mr-2 text-[10px]">{n.tipe}</Badge>{n.nama}</span>
                        <span className="font-mono text-muted-foreground text-[10px]">Ajuan: Rp {n.ajuan.toLocaleString('id-ID')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Daftar nama disetujui multi-kegiatan */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-2">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Disetujui Lebih dari 1 Kegiatan (potensi duplikasi)
                  <Badge variant="outline" className="ml-auto border-amber-500 text-amber-700">
                    {ppkResume.namaDisetujuiMultiKegiatan.length}
                  </Badge>
                </p>
                {ppkResume.namaDisetujuiMultiKegiatan.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada — sesuai aturan 1 orang / 1 kegiatan / bulan ✓</p>
                ) : (
                  <ul className="text-xs space-y-0.5 max-h-48 overflow-y-auto">
                    {ppkResume.namaDisetujuiMultiKegiatan.map((n, i) => (
                      <li key={i} className="border-b border-amber-100 dark:border-amber-900 py-0.5">
                        <div className="flex justify-between">
                          <span><Badge variant="outline" className="mr-2 text-[10px]">{n.tipe}</Badge><strong>{n.nama}</strong></span>
                          <span className="font-mono text-[10px]">Total: Rp {n.total.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="text-muted-foreground pl-1 text-[10px]">
                          Kegiatan: {n.kegiatan.join(' • ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Daftar nama disetujui melebihi 150rb */}
              <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 p-2">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Disetujui Melebihi Rp 150.000 / orang
                  <Badge variant="outline" className="ml-auto border-orange-500 text-orange-700">
                    {ppkResume.namaDisetujuiMelebihi.length}
                  </Badge>
                </p>
                {ppkResume.namaDisetujuiMelebihi.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Tidak ada — semua persetujuan dalam batas wajar ✓</p>
                ) : (
                  <ul className="text-xs space-y-0.5 max-h-48 overflow-y-auto">
                    {ppkResume.namaDisetujuiMelebihi.map((n, i) => (
                      <li key={i} className="flex justify-between border-b border-orange-100 dark:border-orange-900 py-0.5">
                        <span><Badge variant="outline" className="mr-2 text-[10px]">{n.tipe}</Badge>{n.nama}</span>
                        <span className="font-mono text-orange-600 font-semibold text-[10px]">+Rp {n.kelebihan.toLocaleString('id-ID')}</span>
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
                  {/* Total Row */}
                  <tr className="bg-muted font-semibold border-t-2">
                    <td className="px-4 py-2 text-left">JUMLAH</td>
                    <td className="px-4 py-2 text-right">{byKegiatan.reduce((sum, k) => sum + k.countOrang, 0)}</td>
                    <td className="px-4 py-2 text-right">{byKegiatan.reduce((sum, k) => sum + k.countApproved, 0)}</td>
                    <td className="px-4 py-2 text-right font-mono">Rp {byKegiatan.reduce((sum, k) => sum + k.totalAjuan, 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600">Rp {byKegiatan.reduce((sum, k) => sum + k.totalDisetujui, 0).toLocaleString('id-ID')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {byKegiatan.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="text-muted-foreground">Terbilang Total Disetujui:</p>
              <p className="font-semibold text-blue-900 capitalize mt-1">
                {cleanTerbilang(terbilangRupiah(byKegiatan.reduce((sum, k) => sum + k.totalDisetujui, 0)))}
              </p>
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
                              return { label: '✓', variant: 'default' as const, sizeClass: 'text-xs px-1.5 py-0.5' };
                            if (['rejected', 'rejected_ppk'].includes(e.status))
                              return { label: '✕', variant: 'destructive' as const, textColor: 'text-white font-bold', sizeClass: 'text-xs px-1.5 py-0.5' };
                            if (['pending', 'pending_ppk'].includes(e.status))
                              return { label: '⏳', variant: 'outline' as const, sizeClass: 'text-xs px-1.5 py-0.5' };
                            return { label: 'Draft', variant: 'secondary' as const, sizeClass: 'text-xs px-2' };
                          })();
                          const extraClass = badge.textColor ? badge.textColor : '';
                          const sizeClass = badge.sizeClass || 'text-xs mx-0.5';
                          return <Badge key={i} variant={badge.variant} className={`${sizeClass} mx-0.5 ${extraClass}`}>{badge.label}</Badge>;
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
