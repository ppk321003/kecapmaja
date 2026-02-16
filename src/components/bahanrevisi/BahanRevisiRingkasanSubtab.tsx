/**
 * Ringkasan Usulan Revisi - Button-based subtab implementation
 * Mengikuti struktur dan tampilan dari repository referensi
 * Menampilkan ringkasan dalam berbagai kategori dengan button navigation
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BudgetItem } from '@/types/bahanrevisi';
import {
  formatCurrency,
  calculateBudgetSummaryByProgramPembebanan,
  calculateBudgetSummaryByKegiatan,
  calculateBudgetSummaryByRincianOutput,
  calculateBudgetSummaryByKomponenOutput,
  calculateBudgetSummaryBySubKomponen,
  calculateBudgetSummaryByAkun,
} from '@/utils/bahanrevisi-calculations';
import BahanRevisiRingkasan from './BahanRevisiRingkasan';

type SummaryViewType = 'changes' | 'program_pembebanan' | 'kegiatan' | 'rincian_output' | 'komponen_output' | 'sub_komponen' | 'akun' | 'akun_group' | 'account_group';

interface BahanRevisiRingkasanSubtabProps {
  items: BudgetItem[];
  isLoading?: boolean;
}

const BahanRevisiRingkasanSubtab: React.FC<BahanRevisiRingkasanSubtabProps> = ({
  items,
  isLoading = false,
}) => {
  const [summaryView, setSummaryView] = useState<SummaryViewType>('changes');

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
  const summaryByAkun = useMemo(
    () => calculateBudgetSummaryByAkun(items),
    [items]
  );

  // Calculate total values for 'changes' view
  const totalSemula = items.reduce((sum, item) => sum + (Number(item?.jumlah_semula) || 0), 0);
  const totalMenjadi = items.reduce((sum, item) => sum + (Number(item?.jumlah_menjadi) || 0), 0);
  const totalSelisih = totalMenjadi - totalSemula;
  const newItems = items.filter(item => item?.status === 'new').length;
  const changedItems = items.filter(item => item?.status === 'changed').length;
  const deletedItems = items.filter(item => item?.status === 'deleted').length;

  const renderSummaryTable = (data: any[], title: string) => {
    if (!data || data.length === 0) {
      return (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-slate-500">Tidak ada data untuk {title}</div>
          </CardContent>
        </Card>
      );
    }

    const totalSemula = data.reduce((sum, item) => sum + item.total_semula, 0);
    const totalMenjadi = data.reduce((sum, item) => sum + item.total_menjadi, 0);
    const totalSelisih = data.reduce((sum, item) => sum + item.total_selisih, 0);
    const totalSisaAnggaran = data.reduce((sum, item) => sum + (item.sisa_anggaran || 0), 0);
    const totalBlokir = data.reduce((sum, item) => sum + (item.blokir || 0), 0);
    const totalNewItems = data.reduce((sum, item) => sum + (item.new_items || 0), 0);
    const totalChangedItems = data.reduce((sum, item) => sum + (item.changed_items || 0), 0);

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Total Semula</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-bold">{formatCurrency(totalSemula)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Total Menjadi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-bold text-green-600">{formatCurrency(totalMenjadi)}</p>
            </CardContent>
          </Card>
          <Card className={totalSelisih >= 0 ? 'bg-cyan-50' : 'bg-red-50'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Selisih</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-base font-bold ${totalSelisih >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(totalSelisih)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Sisa Anggaran</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-bold text-purple-600">{formatCurrency(totalSisaAnggaran)}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-600">Blokir</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base font-bold text-orange-600">{formatCurrency(totalBlokir)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detail Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ringkasan {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-md">
              <Table className="w-full text-xs">
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="text-left py-2 px-3 font-semibold text-slate-700">Nama</TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold text-slate-700">Jumlah Semula</TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold text-slate-700">Jumlah Menjadi</TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold text-slate-700">Selisih</TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold text-slate-700">Sisa Anggaran</TableHead>
                    <TableHead className="text-right py-2 px-3 font-semibold text-slate-700">Blokir</TableHead>
                    <TableHead className="text-center py-2 px-3 font-semibold text-slate-700">Baru</TableHead>
                    <TableHead className="text-center py-2 px-3 font-semibold text-slate-700">Berubah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, idx) => (
                    <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <TableCell className="text-left py-2 px-3 font-medium">{item.name || 'Uncategorized'}</TableCell>
                      <TableCell className="text-right py-2 px-3">{formatCurrency(item.total_semula)}</TableCell>
                      <TableCell className="text-right py-2 px-3">{formatCurrency(item.total_menjadi)}</TableCell>
                      <TableCell className={`text-right py-2 px-3 font-semibold ${item.total_selisih > 0 ? 'text-green-600' : item.total_selisih < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(item.total_selisih)}
                      </TableCell>
                      <TableCell className="text-right py-2 px-3 text-blue-600">{formatCurrency(item.sisa_anggaran || 0)}</TableCell>
                      <TableCell className="text-right py-2 px-3 text-orange-600">{formatCurrency(item.blokir || 0)}</TableCell>
                      <TableCell className="text-center py-2 px-3">
                        {item.new_items > 0 && <Badge className="bg-blue-600 text-xs">{item.new_items}</Badge>}
                      </TableCell>
                      <TableCell className="text-center py-2 px-3">
                        {item.changed_items > 0 && <Badge className="bg-amber-600 text-xs">{item.changed_items}</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-slate-100 font-bold">
                  <TableRow>
                    <TableCell className="py-2 px-3">TOTAL</TableCell>
                    <TableCell className="text-right py-2 px-3">{formatCurrency(totalSemula)}</TableCell>
                    <TableCell className="text-right py-2 px-3">{formatCurrency(totalMenjadi)}</TableCell>
                    <TableCell className={`text-right py-2 px-3 ${totalSelisih > 0 ? 'text-green-600' : totalSelisih < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(totalSelisih)}
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 text-blue-600">{formatCurrency(totalSisaAnggaran)}</TableCell>
                    <TableCell className="text-right py-2 px-3 text-orange-600">{formatCurrency(totalBlokir)}</TableCell>
                    <TableCell className="text-center py-2 px-3">{totalNewItems}</TableCell>
                    <TableCell className="text-center py-2 px-3">{totalChangedItems}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSummarySection = () => {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-slate-500">Memuat data ringkasan...</div>
          </CardContent>
        </Card>
      );
    }

    switch (summaryView) {
      case 'changes':
        return <BahanRevisiRingkasan items={items} isLoading={false} />;
      case 'program_pembebanan':
        return renderSummaryTable(summaryByProgram, 'Program Pembebanan');
      case 'kegiatan':
        return renderSummaryTable(summaryByKegiatan, 'Kegiatan');
      case 'rincian_output':
        return renderSummaryTable(summaryByRincianOutput, 'Rincian Output');
      case 'komponen_output':
        return renderSummaryTable(summaryByKomponen, 'Komponen Output');
      case 'sub_komponen':
        return renderSummaryTable(summaryBySubKomponen, 'Sub Komponen');
      case 'akun':
        return renderSummaryTable(summaryByAkun, 'Akun');
      case 'akun_group':
        return (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-slate-500">Data Kelompok Akun belum tersedia</div>
            </CardContent>
          </Card>
        );
      case 'account_group':
        return (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-slate-500">Data Kelompok Belanja belum tersedia</div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Ringkasan Usulan Revisi Anggaran</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Button Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={summaryView === 'changes' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('changes')}
            className="text-xs"
          >
            Ringkasan Perubahan
          </Button>
          <Button
            variant={summaryView === 'program_pembebanan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('program_pembebanan')}
            className="text-xs"
          >
            Program Pembebanan
          </Button>
          <Button
            variant={summaryView === 'kegiatan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('kegiatan')}
            className="text-xs"
          >
            Kegiatan
          </Button>
          <Button
            variant={summaryView === 'rincian_output' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('rincian_output')}
            className="text-xs"
          >
            Rincian Output
          </Button>
          <Button
            variant={summaryView === 'komponen_output' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('komponen_output')}
            className="text-xs"
          >
            Komponen Output
          </Button>
          <Button
            variant={summaryView === 'sub_komponen' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('sub_komponen')}
            className="text-xs"
          >
            Sub Komponen
          </Button>
          <Button
            variant={summaryView === 'akun' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('akun')}
            className="text-xs"
          >
            Akun
          </Button>
          <Button
            variant={summaryView === 'akun_group' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('akun_group')}
            className="text-xs"
          >
            Kelompok Akun
          </Button>
          <Button
            variant={summaryView === 'account_group' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSummaryView('account_group')}
            className="text-xs"
          >
            Kelompok Belanja
          </Button>
        </div>

        {/* Summary Content */}
        <div className="mt-4">
          {renderSummarySection()}
        </div>
      </CardContent>
    </Card>
  );
};

export default BahanRevisiRingkasanSubtab;
