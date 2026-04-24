import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Layers, Wallet, Edit2, AlertCircle, User, Users, Copy } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readPulsaData, buildPersonView, PulsaRow } from '@/services/pulsaSheetsService';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { terbilangRupiah, cleanTerbilang } from '@/lib/terbilang';
import { useAuth } from '@/contexts/AuthContext';
import { PersonMultiSelect } from '@/components/PersonMultiSelect';
import { useOrganikBPS, useMitraStatistik } from '@/hooks/use-database';
import { supabase } from '@/integrations/supabase/client';

interface LaporanPulsaProps {
  bulan: number;
  tahun: number;
}

export const LaporanPulsa: React.FC<LaporanPulsaProps> = ({ bulan, tahun }) => {
  const satkerConfig = useSatkerConfigContext();
  const pulsaSheetId = satkerConfig?.getUserSatkerSheetId('pulsa') || '';
  const { user } = useAuth();
  const isPPK = user?.role === 'Pejabat Pembuat Komitmen';

  const { data: organikList = [], loading: loadingOrganik } = useOrganikBPS();
  const { data: mitraList = [], loading: loadingMitra } = useMitraStatistik();

  const [rawRows, setRawRows] = useState<PulsaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; row: PulsaRow | null }>({ open: false, row: null });
  const [editForm, setEditForm] = useState({ organikIds: [] as string[], mitraIds: [] as string[], nominal: 0, keterangan: '', kegiatan: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Duplicate state
  const [duplicateModal, setDuplicateModal] = useState<{ open: boolean; row: PulsaRow | null }>({ open: false, row: null });
  const [duplicateTargetBulan, setDuplicateTargetBulan] = useState<string>('');
  const [duplicateTargetTahun, setDuplicateTargetTahun] = useState<string>('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleOpenEdit = (row: PulsaRow) => {
    // Parse existing names dan cari IDs-nya
    const organikNames = row.organik.split('|').filter(n => n.trim());
    const mitraNames = row.mitra.split('|').filter(n => n.trim());
    
    const organikIds = organikNames
      .map(name => {
        const found = organikList.find(o => o.name === name);
        return found?.id || '';
      })
      .filter(id => id);
    
    const mitraIds = mitraNames
      .map(name => {
        const found = mitraList.find(m => m.name === name);
        return found?.id || '';
      })
      .filter(id => id);

    setEditForm({
      organikIds,
      mitraIds,
      nominal: row.nominal,
      keterangan: row.keterangan,
      kegiatan: row.kegiatan,
    });
    setEditModal({ open: true, row });
    setEditMessage(null);
  };

  const handleCloseEdit = () => {
    setEditModal({ open: false, row: null });
    setEditForm({ organikIds: [], mitraIds: [], nominal: 0, keterangan: '', kegiatan: '' });
    setEditMessage(null);
  };

  const handleSaveEdit = async () => {
    if (!editModal.row) return;
    
    try {
      setEditLoading(true);
      setEditMessage(null);

      // Validasi
      const totalPeople = editForm.organikIds.length + editForm.mitraIds.length;

      if (totalPeople === 0) {
        setEditMessage({ type: 'error', text: 'Minimal 1 orang (organik atau mitra) harus ada' });
        return;
      }

      if (editForm.nominal <= 0) {
        setEditMessage({ type: 'error', text: 'Nominal harus lebih dari 0' });
        return;
      }

      // Convert IDs ke pipe-separated names
      const organikNames = editForm.organikIds
        .map(id => {
          const found = organikList.find(o => o.id === id);
          return found?.name || id;
        })
        .join('|');

      const mitraNames = editForm.mitraIds
        .map(id => {
          const found = mitraList.find(m => m.id === id);
          return found?.name || id;
        })
        .join('|');

      // Generate status array yang sesuai dengan jumlah orang baru
      const oldOrganiklist = editModal.row.organikList;
      const oldMitralist = editModal.row.mitraList;
      const oldStatusList = editModal.row.statusList;
      
      const newStatusList: string[] = [];
      
      // Map organik baru dengan status lama (jika masih ada)
      editForm.organikIds.forEach(id => {
        const name = organikList.find(o => o.id === id)?.name || id;
        const oldIndex = oldOrganiklist.indexOf(name);
        const status = oldIndex >= 0 ? oldStatusList[oldIndex] : 'pending_ppk';
        newStatusList.push(status);
      });
      
      // Map mitra baru dengan status lama (jika masih ada)
      editForm.mitraIds.forEach(id => {
        const name = mitraList.find(m => m.id === id)?.name || id;
        const oldMitraIndex = oldMitralist.indexOf(name);
        const oldStatusIndex = oldOrganiklist.length + oldMitraIndex;
        const status = oldMitraIndex >= 0 ? oldStatusList[oldStatusIndex] : 'pending_ppk';
        newStatusList.push(status);
      });

      const newStatus = newStatusList.join('|');

      // Update ke Google Sheets via edge function
      const updatePayload = {
        spreadsheetId: pulsaSheetId,
        operation: 'update',
        range: `Sheet1!D${editModal.row.rowIndex}:I${editModal.row.rowIndex}`,
        values: [[
          editForm.kegiatan,
          organikNames,
          mitraNames,
          Number(editForm.nominal),
          newStatus,
          editForm.keterangan || '',
        ]],
      };

      console.log('📤 Sending update payload:', updatePayload);

      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: updatePayload,
      });

      if (error) {
        console.error('❌ Save error:', error);
        throw error;
      }

      console.log('✅ Update response:', data);

      // Refresh data
      const allData = await readPulsaData(pulsaSheetId);
      setRawRows(allData.filter(r => r.bulan === bulan && r.tahun === tahun));

      setEditMessage({ type: 'success', text: '✅ Data berhasil diperbarui' });
      setTimeout(() => handleCloseEdit(), 1500);
    } catch (err: any) {
      console.error('❌ Full error:', err);
      setEditMessage({ type: 'error', text: `❌ Error: ${err?.message || 'Gagal update data'}` });
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDuplicate = (row: PulsaRow) => {
    setDuplicateModal({ open: true, row });
    setDuplicateMessage(null);
    setDuplicateTargetBulan('');
    setDuplicateTargetTahun('');
  };

  const handleCloseDuplicate = () => {
    setDuplicateModal({ open: false, row: null });
    setDuplicateTargetBulan('');
    setDuplicateTargetTahun('');
    setDuplicateMessage(null);
  };

  const handleDuplicateConfirm = async () => {
    if (!duplicateModal.row || !duplicateTargetBulan || !duplicateTargetTahun) {
      setDuplicateMessage({ type: 'error', text: 'Pilih bulan dan tahun tujuan terlebih dahulu' });
      return;
    }

    try {
      setIsDuplicating(true);
      setDuplicateMessage(null);

      const targetBulan = Number(duplicateTargetBulan);
      const targetTahun = Number(duplicateTargetTahun);

      // Prepare duplicated data dengan status pending
      const organikNames = duplicateModal.row.organik;
      const mitraNames = duplicateModal.row.mitra;
      const totalPeople = duplicateModal.row.organikList.length + duplicateModal.row.mitraList.length;

      // Create status array dengan semua pending_ppk untuk duplikat baru
      const newStatusList = Array(totalPeople).fill('pending_ppk').join('|');

      // Get existing data untuk menemukan next row number
      const allData = await readPulsaData(pulsaSheetId);
      const nextNo = (Math.max(...allData.map(r => r.no || 0), 0) + 1) || 1;

      // Prepare new row data
      const newRowData = [
        nextNo,
        targetBulan,
        targetTahun,
        duplicateModal.row.kegiatan,
        organikNames,
        mitraNames,
        duplicateModal.row.nominal,
        newStatusList,
        duplicateModal.row.keterangan,
        new Date().toLocaleString('id-ID'),
        '',
        '',
      ];

      // Append to Sheet1
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: {
          spreadsheetId: pulsaSheetId,
          operation: 'append',
          range: 'Sheet1!A:L',
          values: [newRowData],
        },
      });

      if (error) throw error;

      // Refresh data
      const updatedData = await readPulsaData(pulsaSheetId);
      setRawRows(updatedData.filter(r => r.bulan === bulan && r.tahun === tahun));

      setDuplicateMessage({ 
        type: 'success', 
        text: `✅ Data berhasil diduplikat ke ${new Date(2020, targetBulan - 1).toLocaleString('id-ID', { month: 'long' })} ${targetTahun}` 
      });

      setTimeout(() => handleCloseDuplicate(), 2000);
    } catch (err: any) {
      console.error('❌ Duplicate error:', err);
      setDuplicateMessage({ type: 'error', text: `❌ Error: ${err?.message || 'Gagal duplikat data'}` });
    } finally {
      setIsDuplicating(false);
    }
  };

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
                    <th className="px-4 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {byKegiatan.map(k => {
                    // Cari raw row yang sesuai dengan kegiatan ini
                    const rawRow = rawRows.find(r => r.kegiatan === k.kegiatan);
                    return (
                      <tr key={k.kegiatan} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-2 font-medium">{k.kegiatan}</td>
                        <td className="px-4 py-2 text-right">{k.countOrang}</td>
                        <td className="px-4 py-2 text-right">{k.countApproved}</td>
                        <td className="px-4 py-2 text-right font-mono">Rp {k.totalAjuan.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-2 text-right font-mono text-green-600 font-semibold">Rp {k.totalDisetujui.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-2 text-center flex gap-1 justify-center">
                          {rawRow && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(rawRow)}
                                className="h-8 w-8 p-0 hover:bg-blue-100"
                                title="Edit data kegiatan ini"
                              >
                                <Edit2 className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDuplicate(rawRow)}
                                className="h-8 w-8 p-0 hover:bg-purple-100"
                                title="Duplikat ke bulan lain"
                              >
                                <Copy className="w-4 h-4 text-purple-600" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="bg-muted font-semibold border-t-2">
                    <td className="px-4 py-2 text-left">JUMLAH</td>
                    <td className="px-4 py-2 text-right">{byKegiatan.reduce((sum, k) => sum + k.countOrang, 0)}</td>
                    <td className="px-4 py-2 text-right">{byKegiatan.reduce((sum, k) => sum + k.countApproved, 0)}</td>
                    <td className="px-4 py-2 text-right font-mono">Rp {byKegiatan.reduce((sum, k) => sum + k.totalAjuan, 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600">Rp {byKegiatan.reduce((sum, k) => sum + k.totalDisetujui, 0).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-center"></td>
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

      {/* Edit Dialog */}
      <Dialog open={editModal.open} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Edit Data Kegiatan
            </DialogTitle>
          </DialogHeader>

          {editMessage && (
            <Alert
              className={`${
                editMessage.type === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              {editMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription
                className={
                  editMessage.type === 'error'
                    ? 'text-red-800'
                    : 'text-green-800'
                }
              >
                {editMessage.text}
              </AlertDescription>
            </Alert>
          )}

          {editModal.row && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-6">
              {/* Bulan & Tahun */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-bulan" className="font-semibold">Bulan</Label>
                  <Input
                    id="edit-bulan"
                    disabled
                    value={new Date(2020, bulan - 1).toLocaleString('id-ID', { month: 'long' })}
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-tahun" className="font-semibold">Tahun</Label>
                  <Input
                    id="edit-tahun"
                    disabled
                    value={tahun}
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Kegiatan */}
              <div>
                <Label htmlFor="edit-kegiatan" className="font-semibold">Nama Kegiatan</Label>
                <Input
                  id="edit-kegiatan"
                  value={editForm.kegiatan}
                  onChange={(e) => setEditForm({ ...editForm, kegiatan: e.target.value })}
                  placeholder="Masukkan nama kegiatan..."
                  className="border-amber-600"
                />
              </div>

              {/* Organik & Mitra */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">
                    Nama Organik <span className="text-muted-foreground text-xs">(opsional)</span>
                  </Label>
                  <PersonMultiSelect
                    value={editForm.organikIds}
                    onValueChange={(ids) => setEditForm({ ...editForm, organikIds: ids })}
                    options={organikList.map(o => ({
                      id: o.id,
                      name: o.name,
                      jabatan: o.jabatan,
                      kecamatan: o.kecamatan,
                    }))}
                    placeholder="Pilih organik (opsional)..."
                    loading={loadingOrganik}
                    type="organik"
                  />
                </div>

                <div>
                  <Label className="font-semibold">
                    Nama Mitra Statistik <span className="text-muted-foreground text-xs">(opsional)</span>
                  </Label>
                  <PersonMultiSelect
                    value={editForm.mitraIds}
                    onValueChange={(ids) => setEditForm({ ...editForm, mitraIds: ids })}
                    options={mitraList.map(m => ({
                      id: m.id,
                      name: m.name,
                      jabatan: m.pekerjaan,
                      kecamatan: m.kecamatan,
                    }))}
                    placeholder="Pilih mitra (opsional)..."
                    loading={loadingMitra}
                    type="mitra"
                  />
                </div>
              </div>

              {/* Nominal & Keterangan */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-keterangan" className="font-semibold">Keterangan</Label>
                  <Input
                    id="edit-keterangan"
                    placeholder="Opsional: catatan tambahan"
                    value={editForm.keterangan}
                    onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-nominal" className="font-semibold">
                    Nominal Pulsa (Rp) <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="edit-nominal"
                      type="number"
                      min="0"
                      step="1000"
                      value={editForm.nominal}
                      onChange={(e) => setEditForm({ ...editForm, nominal: Number(e.target.value) })}
                      placeholder="0"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Rp {editForm.nominal.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold mb-2">📋 Ringkasan Data:</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Kegiatan:</span> {editForm.kegiatan || '(tidak ada)'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Organik:</span>{' '}
                    {editForm.organikIds.length} orang
                    {editForm.organikIds.length > 0 && ` — ${editForm.organikIds.map(id => organikList.find(o => o.id === id)?.name || id).join(', ')}`}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Mitra:</span>{' '}
                    {editForm.mitraIds.length} orang
                    {editForm.mitraIds.length > 0 && ` — ${editForm.mitraIds.map(id => mitraList.find(m => m.id === id)?.name || id).join(', ')}`}
                  </p>
                  <p className="font-semibold">
                    <span className="text-muted-foreground">Total Orang:</span>{' '}
                    {editForm.organikIds.length + editForm.mitraIds.length} orang
                  </p>
                  <p className="font-semibold">
                    <span className="text-muted-foreground">Nominal Per Orang:</span> Rp{' '}
                    {editForm.nominal.toLocaleString('id-ID')}
                  </p>
                  <p className="font-semibold text-primary">
                    <span className="text-muted-foreground">Total Biaya:</span> Rp{' '}
                    {(editForm.nominal * (editForm.organikIds.length + editForm.mitraIds.length)).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    '💾 Simpan Perubahan'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                  disabled={editLoading}
                >
                  Batal
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateModal.open} onOpenChange={(open) => !open && handleCloseDuplicate()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-purple-600" />
              Duplikat ke Bulan Lain
            </DialogTitle>
          </DialogHeader>

          {duplicateMessage && (
            <Alert
              className={`${
                duplicateMessage.type === 'error'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              {duplicateMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription
                className={
                  duplicateMessage.type === 'error'
                    ? 'text-red-800'
                    : 'text-green-800'
                }
              >
                {duplicateMessage.text}
              </AlertDescription>
            </Alert>
          )}

          {duplicateModal.row && (
            <div className="space-y-4">
              {/* Info Kegiatan yang diduplikat */}
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-muted-foreground">📋 Kegiatan yang Diduplikat:</p>
                <p className="font-semibold text-blue-900 dark:text-blue-300 mt-1">{duplicateModal.row.kegiatan}</p>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <p>Nominal: <span className="font-mono font-semibold">Rp {duplicateModal.row.nominal.toLocaleString('id-ID')}</span></p>
                  <p>Total Orang: <span className="font-semibold">{duplicateModal.row.organikList.length + duplicateModal.row.mitraList.length}</span> orang</p>
                  <p>Status Baru: <span className="font-semibold text-amber-600">⏳ Pending</span></p>
                </div>
              </div>

              {/* Pilih Bulan & Tahun */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dup-bulan" className="font-semibold text-sm">Bulan Tujuan *</Label>
                  <Select value={duplicateTargetBulan} onValueChange={setDuplicateTargetBulan}>
                    <SelectTrigger id="dup-bulan" className="mt-1">
                      <SelectValue placeholder="Pilih bulan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2020, m - 1).toLocaleString('id-ID', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dup-tahun" className="font-semibold text-sm">Tahun Tujuan *</Label>
                  <Select value={duplicateTargetTahun} onValueChange={setDuplicateTargetTahun}>
                    <SelectTrigger id="dup-tahun" className="mt-1">
                      <SelectValue placeholder="Pilih tahun..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary */}
              {duplicateTargetBulan && duplicateTargetTahun && (
                <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs text-muted-foreground">Data akan diduplikat ke:</p>
                  <p className="font-semibold text-purple-900 dark:text-purple-300 mt-1">
                    {new Date(2020, Number(duplicateTargetBulan) - 1).toLocaleString('id-ID', { month: 'long' })} {duplicateTargetTahun}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleDuplicateConfirm}
                  disabled={isDuplicating || !duplicateTargetBulan || !duplicateTargetTahun}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {isDuplicating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menduplikat...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplikat Sekarang
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseDuplicate}
                  disabled={isDuplicating}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
