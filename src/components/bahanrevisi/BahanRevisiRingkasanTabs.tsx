/**
 * Ringkasan/Summary Component dengan Subtab untuk Bahan Revisi Anggaran
 * Menampilkan ringkasan dalam berbagai kategori: Perubahan, Program Pembebanan, Kegiatan, dll
 */

import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BudgetItem, BudgetSummaryByCategory } from '@/types/bahanrevisi';
import {
  formatCurrency,
  calculateBudgetSummary,
  calculateBudgetSummaryByProgramPembebanan,
  calculateBudgetSummaryByKegiatan,
  calculateBudgetSummaryByRincianOutput,
  calculateBudgetSummaryByKomponenOutput,
  calculateBudgetSummaryBySubKomponen,
  calculateBudgetSummaryByAkun,
} from '@/utils/bahanrevisi-calculations';
import BahanRevisiRingkasan from './BahanRevisiRingkasan';

interface BahanRevisiRingkasanTabsProps {
  items: BudgetItem[];
  isLoading?: boolean;
}

const BahanRevisiRingkasanTabs: React.FC<BahanRevisiRingkasanTabsProps> = ({
  items,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState('ringkasan-perubahan');

  // Calculate all summaries
  const summaryByProgram = useMemo(
    () => calculateBudgetSummaryByProgramPembebanan(items),
    [items]
  );
  const summaryByKegiatan = useMemo(
    () => calculateBudgetSummaryByKegiatan(items),
    [items]
  );
  const summaryByRincianOutput = useMemo(
    () => calculateBudgetSummaryByRincianOutput(items),
    [items]
  );
  const summaryByKomponen = useMemo(
    () => calculateBudgetSummaryByKomponenOutput(items),
    [items]
  );
  const summaryBySubKomponen = useMemo(
    () => calculateBudgetSummaryBySubKomponen(items),
    [items]
  );
  const summaryByAkun = useMemo(() => calculateBudgetSummaryByAkun(items), [items]);

  const renderSummaryTable = (data: BudgetSummaryByCategory[], title: string) => {
    if (data.length === 0) {
      return (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-slate-500">Tidak ada data</div>
          </CardContent>
        </Card>
      );
    }

    const totalSemula = data.reduce((sum, item) => sum + item.total_semula, 0);
    const totalMenjadi = data.reduce((sum, item) => sum + item.total_menjadi, 0);
    const totalSelisih = data.reduce((sum, item) => sum + item.total_selisih, 0);
    const totalSisaAnggaran = data.reduce(
      (sum, item) => sum + (item.sisa_anggaran || 0),
      0
    );
    const totalBlokir = data.reduce(
      (sum, item) => sum + (item.blokir || 0),
      0
    );

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Total Semula</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatCurrency(totalSemula)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Total Menjadi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatCurrency(totalMenjadi)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Total Selisih</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(totalSelisih)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Sisa Anggaran</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(totalSisaAnggaran)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Blokir</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(totalBlokir)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detail Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ringkasan {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-3 font-semibold">Nama</th>
                    <th className="text-right py-3 px-3 font-semibold">Jumlah Semula</th>
                    <th className="text-right py-3 px-3 font-semibold">Jumlah Menjadi</th>
                    <th className="text-right py-3 px-3 font-semibold">Selisih</th>
                    <th className="text-right py-3 px-3 font-semibold">Sisa Anggaran</th>
                    <th className="text-right py-3 px-3 font-semibold">Blokir</th>
                    <th className="text-center py-3 px-3 font-semibold">Baru</th>
                    <th className="text-center py-3 px-3 font-semibold">Berubah</th>
                    <th className="text-center py-3 px-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="text-left py-3 px-3 font-medium">
                        {item.name || 'Uncategorized'}
                      </td>
                      <td className="text-right py-3 px-3">
                        {formatCurrency(item.total_semula)}
                      </td>
                      <td className="text-right py-3 px-3">
                        {formatCurrency(item.total_menjadi)}
                      </td>
                      <td className="text-right py-3 px-3">
                        <span
                          className={
                            item.total_selisih > 0
                              ? 'text-green-600 font-semibold'
                              : item.total_selisih < 0
                              ? 'text-red-600 font-semibold'
                              : ''
                          }
                        >
                          {formatCurrency(item.total_selisih)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-3 text-blue-600">
                        {formatCurrency(item.sisa_anggaran || 0)}
                      </td>
                      <td className="text-right py-3 px-3 text-orange-600">
                        {formatCurrency(item.blokir || 0)}
                      </td>
                      <td className="text-center py-3 px-3">
                        {item.new_items > 0 && (
                          <Badge className="bg-blue-600 text-xs">
                            {item.new_items}
                          </Badge>
                        )}
                      </td>
                      <td className="text-center py-3 px-3">
                        {item.changed_items > 0 && (
                          <Badge className="bg-amber-600 text-xs">
                            {item.changed_items}
                          </Badge>
                        )}
                      </td>
                      <td className="text-center py-3 px-3 font-medium">
                        {item.total_items}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-slate-500">Loading summary data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
      <TabsList className="grid grid-cols-5 lg:grid-cols-9 gap-2 h-auto bg-transparent">
        <TabsTrigger value="ringkasan-perubahan" className="text-xs">
          Ringkasan Perubahan
        </TabsTrigger>
        <TabsTrigger value="program-pembebanan" className="text-xs">
          Program Pembebanan
        </TabsTrigger>
        <TabsTrigger value="kegiatan" className="text-xs">
          Kegiatan
        </TabsTrigger>
        <TabsTrigger value="rincian-output" className="text-xs">
          Rincian Output
        </TabsTrigger>
        <TabsTrigger value="komponen-output" className="text-xs">
          Komponen Output
        </TabsTrigger>
        <TabsTrigger value="sub-komponen" className="text-xs">
          Sub Komponen
        </TabsTrigger>
        <TabsTrigger value="akun" className="text-xs">
          Akun
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ringkasan-perubahan" className="space-y-4">
        <BahanRevisiRingkasan items={items} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="program-pembebanan">
        {renderSummaryTable(summaryByProgram, 'Program Pembebanan')}
      </TabsContent>

      <TabsContent value="kegiatan">
        {renderSummaryTable(summaryByKegiatan, 'Kegiatan')}
      </TabsContent>

      <TabsContent value="rincian-output">
        {renderSummaryTable(summaryByRincianOutput, 'Rincian Output')}
      </TabsContent>

      <TabsContent value="komponen-output">
        {renderSummaryTable(summaryByKomponen, 'Komponen Output')}
      </TabsContent>

      <TabsContent value="sub-komponen">
        {renderSummaryTable(summaryBySubKomponen, 'Sub Komponen')}
      </TabsContent>

      <TabsContent value="akun">
        {renderSummaryTable(summaryByAkun, 'Akun')}
      </TabsContent>
    </Tabs>
  );
};

export default BahanRevisiRingkasanTabs;
