import React, { useState } from 'react';
import { FormTambahPulsa } from '@/components/pulsa/FormTambahPulsa';
import { TabelPulsaBulanan } from '@/components/pulsa/TabelPulsaBulanan';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw } from 'lucide-react';
import { LaporanPulsa } from '@/components/pulsa/LaporanPulsa';
import * as XLSX from 'xlsx';

const ManajemenPulsa: React.FC = () => {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);

  const bulanNama = new Date(tahun, bulan - 1).toLocaleString('id-ID', { 
    month: 'long', 
    year: 'numeric' 
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleExcelExport = async () => {
    // TODO: Implement Excel export
    alert('Fitur export Excel akan segera tersedia');
  };

  const bulanOptions = Array.from({ length: 12 }, (_, i) => (
    { value: i + 1, label: new Date(2024, i).toLocaleString('id-ID', { month: 'short' }) }
  ));

  const tahunOptions = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - 2 + i,
    label: (new Date().getFullYear() - 2 + i).toString()
  }));

  return (
    <div className="w-full py-6 space-y-6 px-6">
      {/* Header */}
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Manajemen Pembelian Pulsa</h1>
            <p className="text-gray-600 mt-1">Kelola pembelian pulsa untuk petugas lapangan</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleExcelExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Filter */}
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
                <p className="text-gray-600">Periode Aktif</p>
                <p className="font-semibold text-lg">{bulanNama}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="daftar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daftar">Daftar Pulsa</TabsTrigger>
            <TabsTrigger value="tambah">Tambah Pulsa</TabsTrigger>
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

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">ℹ️ Aturan Pembelian Pulsa</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>✅ <strong>1 petugas = 1 kegiatan per bulan</strong> - Sistem akan memperingatkan jika petugas mendapat pulsa dari lebih dari satu kegiatan dalam bulan yang sama</p>
            <p>✅ Nominal bervariasi sesuai kegiatan dan organik</p>
            <p>✅ Data harus disetujui PPK sebelum dicatat final</p>
            <p>✅ Setiap bulan data baru dapat ditambahkan</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  export default ManajemenPulsa;
