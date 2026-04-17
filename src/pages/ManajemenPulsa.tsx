import React, { useState } from 'react';
import { FormTambahPulsa } from '@/components/pulsa/FormTambahPulsa';
import { TabelPulsaBulanan } from '@/components/pulsa/TabelPulsaBulanan';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { LaporanPulsa } from '@/components/pulsa/LaporanPulsa';
import { readPulsaData } from '@/services/pulsaSheetsService';
import { exportPulsaToExcel } from '@/utils/pulsa-excel-export';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useOrganikBPS, useMitraStatistik } from '@/hooks/use-database';
import { toast } from '@/hooks/use-toast';

const ManajemenPulsa: React.FC = () => {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const satkerConfig = useSatkerConfigContext();
  const pulsaSheetId = satkerConfig?.getUserSatkerSheetId('pulsa') || '';
  const { data: organikList = [] } = useOrganikBPS();
  const { data: mitraList = [] } = useMitraStatistik();

  const bulanNama = new Date(tahun, bulan - 1).toLocaleString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const handleExcelExport = async () => {
    if (!pulsaSheetId) {
      toast({ title: 'Sheet ID belum dikonfigurasi', variant: 'destructive' });
      return;
    }
    setExporting(true);
    try {
      const all = await readPulsaData(pulsaSheetId);
      const rows = all.filter(r => r.bulan === bulan && r.tahun === tahun);
      if (rows.length === 0) {
        toast({ title: 'Tidak ada data untuk bulan ini', variant: 'destructive' });
        return;
      }
      exportPulsaToExcel({
        rows,
        bulan,
        tahun,
        organikList: organikList.map(o => ({ name: o.name, noHp: o.noHp, kecamatan: o.kecamatan })),
        mitraList: mitraList.map(m => ({ name: m.name, noHp: m.noHp, kecamatan: m.kecamatan })),
      });
      toast({ title: '✅ Export berhasil' });
    } catch (e) {
      toast({
        title: 'Export gagal',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const bulanOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i).toLocaleString('id-ID', { month: 'short' }),
  }));

  const tahunOptions = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - 2 + i,
    label: (new Date().getFullYear() - 2 + i).toString(),
  }));

  return (
    <div className="w-full py-6 space-y-6 px-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Pembelian Pulsa / Paket Data</h1>
          <p className="text-muted-foreground mt-1">Kelola pembelian pulsa dan paket data untuk petugas lapangan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} title="Refresh data">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExcelExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Bulan</label>
              <select
                value={bulan}
                onChange={(e) => setBulan(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              >
                {bulanOptions.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Tahun</label>
              <select
                value={tahun}
                onChange={(e) => setTahun(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              >
                {tahunOptions.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">Periode Aktif</p>
              <p className="font-semibold text-lg">{bulanNama}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="daftar" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daftar">Daftar Pulsa</TabsTrigger>
          <TabsTrigger value="tambah">Tambah Ajuan Pulsa/Paket Data</TabsTrigger>
          <TabsTrigger value="laporan">Laporan</TabsTrigger>
        </TabsList>

        <TabsContent value="daftar" className="space-y-4">
          <TabelPulsaBulanan
            key={refreshKey}
            bulan={bulan}
            tahun={tahun}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="tambah" className="space-y-4">
          <FormTambahPulsa
            bulanDefault={bulan}
            tahunDefault={tahun}
            onSuccess={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="laporan" className="space-y-4">
          <LaporanPulsa bulan={bulan} tahun={tahun} />
        </TabsContent>
      </Tabs>


    </div>
  );
};

export default ManajemenPulsa;
