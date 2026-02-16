/**
 * Ringkasan Usulan Revisi - Complete implementation matching reference repo
 * Button-based navigation dengan Chart, Table, dan Kesimpulan
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BudgetItem } from '@/types/bahanrevisi';
import {
  formatCurrency,
  calculateRealisasi,
  calculatePersentaseRealisasi,
  formatPercentage,
  calculateBudgetSummaryByProgramPembebanan,
  calculateBudgetSummaryByKegiatan,
  calculateBudgetSummaryByRincianOutput,
  calculateBudgetSummaryByKomponenOutput,
  calculateBudgetSummaryBySubKomponen,
  calculateBudgetSummaryByAkun,
  calculateBudgetSummaryByKelompokAkun,
  calculateBudgetSummaryByKelompokBelanja,
} from '@/utils/bahanrevisi-calculations';
import BahanRevisiRingkasan from './BahanRevisiRingkasan';
import DetailedSummaryView from './DetailedSummaryView';

type SummaryViewType = 'changes' | 'program_pembebanan' | 'kegiatan' | 'rincian_output' | 'komponen_output' | 'sub_komponen' | 'akun' | 'akun_group' | 'account_group';

interface SummaryRow {
  id: string;
  name: string;
  totalSemula: number;
  totalMenjadi: number;
  totalSelisih: number;
  newItems: number;
  changedItems: number;
  totalItems: number;
  sisaAnggaran?: number;
  blokir?: number;
  realisasi?: number;
  persentaseRealisasi?: number;
}

interface BudgetChangeItem {
  id: string;
  pembebanan: string;
  uraian: string;
  detailPerubahan: string;
  jumlahSemula: number;
  jumlahMenjadi: number;
  selisih: number;
  realisasi?: number;
  persentaseRealisasi?: number;
}

interface BahanRevisiRingkasanSubtabProps {
  items: BudgetItem[];
}

const BahanRevisiRingkasanSubtab: React.FC<BahanRevisiRingkasanSubtabProps> = ({ items }) => {
  const [summaryView, setSummaryView] = useState<SummaryViewType>('changes');

  // Separate changed and new items
  const changedItems = useMemo(() => items.filter(item => item.status === 'changed'), [items]);
  const newItems = useMemo(() => items.filter(item => item.status === 'new'), [items]);

  // Calculate summaries by different groupings
  const summaryByProgram = useMemo(() =>
    calculateBudgetSummaryByProgramPembebanan(items),
    [items]
  );
  const summaryByKegiatan = useMemo(() =>
    calculateBudgetSummaryByKegiatan(items),
    [items]
  );
  const summaryByRincianOutput = useMemo(() =>
    calculateBudgetSummaryByRincianOutput(items),
    [items]
  );
  const summaryByKomponen = useMemo(() =>
    calculateBudgetSummaryByKomponenOutput(items),
    [items]
  );
  const summaryBySubKomponen = useMemo(() =>
    calculateBudgetSummaryBySubKomponen(items),
    [items]
  );
  const summaryByAkun = useMemo(() =>
    calculateBudgetSummaryByAkun(items),
    [items]
  );
  const summaryByKelompokAkun = useMemo(() =>
    calculateBudgetSummaryByKelompokAkun(items),
    [items]
  );
  const summaryByKelompokBelanja = useMemo(() =>
    calculateBudgetSummaryByKelompokBelanja(items),
    [items]
  );

  // Helper function to get combined pembebanan code
  const getCombinedPembebananCode = (item: BudgetItem): string => {
    const parts = [];
    if (item.program_pembebanan) parts.push(item.program_pembebanan);
    if (item.kegiatan) parts.push(item.kegiatan);
    if (item.rincian_output) parts.push(item.rincian_output);
    if (item.akun) parts.push(item.akun);
    return parts.join(' > ');
  };

  // Helper function to get detail perubahan text
  const getDetailPerubahan = (item: BudgetItem): string => {
    const lines = [];
    if (item.volume_semula || item.satuan_semula || item.harga_satuan_semula) {
      lines.push(`Semula: ${item.volume_semula} ${item.satuan_semula} @ ${formatCurrency(item.harga_satuan_semula || 0)}`);
    }
    if (item.volume_menjadi || item.satuan_menjadi || item.harga_satuan_menjadi) {
      lines.push(`Menjadi: ${item.volume_menjadi} ${item.satuan_menjadi} @ ${formatCurrency(item.harga_satuan_menjadi || 0)}`);
    }
    return lines.join('\n');
  };

  const getChangedBudgetItems = (): BudgetChangeItem[] => {
    return changedItems.map((item) => {
      const jumlahMenjadi = Number(item.jumlah_menjadi) || 0;
      const sisaAnggaran = Number(item.sisa_anggaran) || 0;
      const blokir = Number(item.blokir) || 0;
      const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
      const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
      return {
        id: item.id,
        pembebanan: getCombinedPembebananCode(item),
        uraian: item.uraian || '',
        detailPerubahan: getDetailPerubahan(item),
        jumlahSemula: Number(item.jumlah_semula) || 0,
        jumlahMenjadi,
        selisih: item.selisih || 0,
        realisasi,
        persentaseRealisasi,
      };
    });
  };

  const getNewBudgetItems = (): BudgetChangeItem[] => {
    return newItems.map((item) => {
      const jumlahMenjadi = Number(item.jumlah_menjadi) || 0;
      const sisaAnggaran = Number(item.sisa_anggaran) || 0;
      const blokir = Number(item.blokir) || 0;
      const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
      const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
      return {
        id: item.id,
        pembebanan: getCombinedPembebananCode(item),
        uraian: item.uraian || '',
        detailPerubahan: `Baru: ${item.volume_menjadi} ${item.satuan_menjadi} @ ${formatCurrency(item.harga_satuan_menjadi || 0)}`,
        jumlahSemula: 0,
        jumlahMenjadi,
        selisih: jumlahMenjadi,
        realisasi,
        persentaseRealisasi,
      };
    });
  };

  const getFilteredSummaryData = (): SummaryRow[] => {
    let summaryData: any[] = [];

    switch (summaryView) {
      case 'program_pembebanan':
        summaryData = summaryByProgram;
        break;
      case 'kegiatan':
        summaryData = summaryByKegiatan;
        break;
      case 'rincian_output':
        summaryData = summaryByRincianOutput;
        break;
      case 'komponen_output':
        summaryData = summaryByKomponen;
        break;
      case 'sub_komponen':
        summaryData = summaryBySubKomponen;
        break;
      case 'akun':
        summaryData = summaryByAkun;
        break;
      case 'akun_group':
        summaryData = summaryByKelompokAkun;
        break;
      case 'account_group':
        summaryData = summaryByKelompokBelanja;
        break;
      default:
        return [];
    }

    return summaryData.map((item) => {
      const jumlahMenjadi = item.total_menjadi || 0;
      const sisaAnggaran = item.sisa_anggaran || 0;
      const blokir = item.blokir || 0;
      const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
      const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
      
      // Get the appropriate name/code field based on summary type
      const itemCode = item.program_pembebanan || item.kegiatan || item.rincian_output || 
                       item.komponen_output || item.sub_komponen || item.akun || 'Unknown';
      const itemName = item.name || itemCode;
      
      return {
        id: itemCode,
        name: itemName,
        totalSemula: item.total_semula || 0,
        totalMenjadi: jumlahMenjadi,
        totalSelisih: item.total_selisih || 0,
        newItems: item.new_items || 0,
        changedItems: item.changed_items || 0,
        totalItems: item.total_items || 0,
        sisaAnggaran,
        blokir,
        realisasi,
        persentaseRealisasi,
      };
    });
  };

  const getTotalSummaryValues = () => {
    const data = getFilteredSummaryData();
    if (data.length === 0) {
      return { semula: 0, menjadi: 0, selisih: 0 };
    }

    const totalSemula = data.reduce((sum, item) => sum + item.totalSemula, 0);
    const totalMenjadi = data.reduce((sum, item) => sum + item.totalMenjadi, 0);
    const totalSelisih = data.reduce((sum, item) => sum + item.totalSelisih, 0);

    return { semula: totalSemula, menjadi: totalMenjadi, selisih: totalSelisih };
  };

  const getSummaryTitle = (): string => {
    switch (summaryView) {
      case 'program_pembebanan':
        return 'Program Pembebanan';
      case 'kegiatan':
        return 'Kegiatan';
      case 'rincian_output':
        return 'Rincian Output';
      case 'komponen_output':
        return 'Komponen Output';
      case 'sub_komponen':
        return 'Sub Komponen';
      case 'akun':
        return 'Akun';
      case 'akun_group':
        return 'Kelompok Akun (3 Digit)';
      case 'account_group':
        return 'Kelompok Belanja (2 Digit)';
      default:
        return '';
    }
  };

  const renderContent = () => {
    if (summaryView === 'changes') {
      const totalSemula = items.reduce((sum, item) => sum + (Number(item.jumlah_semula) || 0), 0);
      const totalMenjadi = items.reduce((sum, item) => sum + (Number(item.jumlah_menjadi) || 0), 0);
      const totalSelisih = totalMenjadi - totalSemula;
      const allDeletedItems = items.filter(item => item.status === 'deleted');
      const allUnchangedItems = items.filter(item => item.status === 'unchanged');

      return (
        <div className="w-full space-y-4">
          {/* Kesimpulan Card */}
          <Card className="bg-blue-50/50 border-blue-100">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-blue-900">Kesimpulan</h2>
              
              <div className="space-y-3 text-sm text-blue-900">
                <p>
                  Berdasarkan hasil analisis terhadap alokasi anggaran, total pagu anggaran
                  semula sebesar <strong>{formatCurrency(totalSemula)}</strong> mengalami perubahan menjadi
                  <strong> {formatCurrency(totalMenjadi)}</strong>, dengan selisih <strong>{formatCurrency(Math.abs(totalSelisih))}</strong> ({totalSelisih > 0 ? 'penambahan' : totalSelisih < 0 ? 'pengurangan' : 'atau tetap'}).
                </p>
                <p>
                  Perubahan ini terdiri dari <strong>{changedItems.length} komponen anggaran</strong> yang
                  mengalami penyesuaian nilai, <strong>{newItems.length} komponen anggaran baru</strong> yang ditambahkan,
                  dan <strong>{allDeletedItems.length} komponen anggaran</strong> yang dihapus.
                </p>
                <p>
                  Penyesuaian anggaran ini dilakukan untuk mengoptimalkan
                  penggunaan sumber daya keuangan sesuai dengan prioritas program dan kegiatan
                  yang telah ditetapkan. Dengan adanya <strong>{changedItems.length + newItems.length} perubahan</strong> ini, 
                  diharapkan pelaksanaan program dapat berjalan dengan lebih efektif dan efisien.
                </p>
                <p>
                  Perubahan anggaran ini perlu disetujui oleh pejabat yang berwenang sesuai dengan ketentuan yang berlaku.
                </p>
              </div>

              {/* Jumlah Item Summary Box */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-blue-200">
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-semibold text-blue-700 mb-2">Total Anggaran</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Semula:</span>
                      <span className="font-medium">{formatCurrency(totalSemula)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Menjadi:</span>
                      <span className="font-medium">{formatCurrency(totalMenjadi)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-gray-600">Selisih:</span>
                      <span className={`font-medium ${totalSelisih === 0 ? 'text-green-600' : totalSelisih > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalSelisih)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-semibold text-blue-700 mb-2">Jumlah Item</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{items.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tidak Berubah:</span>
                      <span className="font-medium">{allUnchangedItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Berubah:</span>
                      <span className="font-medium text-amber-600">{changedItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Baru:</span>
                      <span className="font-medium text-green-600">{newItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dihapus:</span>
                      <span className="font-medium text-red-600">{allDeletedItems.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagu Anggaran Berubah */}
          {changedItems.length > 0 && (
            <Card className="bg-orange-50/50 border-orange-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-orange-700 font-bold">
                  Pagu Anggaran Berubah ({changedItems.length} item)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-md">
                  <Table className="w-full text-xs">
                    <TableHeader className="bg-orange-100/50">
                      <TableRow>
                        <TableHead className="text-left py-2 px-3 font-semibold">
                          No
                        </TableHead>
                        <TableHead className="text-left py-2 px-3 font-semibold">
                          Pembebanan
                        </TableHead>
                        <TableHead className="text-left py-2 px-3 font-semibold">
                          Uraian
                        </TableHead>
                        <TableHead className="text-left py-2 px-3 font-semibold">
                          Detail Perubahan
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Jumlah Semula
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Jumlah Menjadi
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Selisih
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Realisasi
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Persentase Realisasi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getChangedBudgetItems().map((item, idx) => (
                        <TableRow key={item.id} className={idx % 2 === 0 ? '' : 'bg-slate-50'}>
                          <TableCell className="py-2 px-3">{idx + 1}</TableCell>
                          <TableCell className="py-2 px-3 text-xs font-mono">
                            {item.pembebanan}
                          </TableCell>
                          <TableCell className="py-2 px-3">{item.uraian}</TableCell>
                          <TableCell className="py-2 px-3 whitespace-pre-wrap text-xs">
                            {item.detailPerubahan}
                          </TableCell>
                          <TableCell className="text-right py-2 px-3">
                            {formatCurrency(item.jumlahSemula)}
                          </TableCell>
                          <TableCell className="text-right py-2 px-3">
                            {formatCurrency(item.jumlahMenjadi)}
                          </TableCell>
                          <TableCell
                            className={`text-right py-2 px-3 font-semibold ${
                              item.selisih === 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(item.selisih)}
                          </TableCell>
                          <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                            {formatCurrency(item.realisasi || 0)}
                          </TableCell>
                          <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                            {formatPercentage(item.persentaseRealisasi || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={4} className="py-2 px-3">
                          Total Pagu Anggaran Berubah
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrency(
                            getChangedBudgetItems().reduce((sum, item) => sum + item.jumlahSemula, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrency(
                            getChangedBudgetItems().reduce((sum, item) => sum + item.jumlahMenjadi, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrency(
                            getChangedBudgetItems().reduce((sum, item) => sum + item.selisih, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                          {formatCurrency(
                            getChangedBudgetItems().reduce((sum, item) => sum + (item.realisasi || 0), 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                          {formatPercentage(
                            getChangedBudgetItems().length > 0
                              ? Math.round(
                                  (getChangedBudgetItems().reduce((sum, item) => sum + (item.realisasi || 0), 0) /
                                    getChangedBudgetItems().reduce((sum, item) => sum + item.jumlahMenjadi, 0)) *
                                    100 *
                                    100
                                ) / 100
                              : 0
                          )}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagu Anggaran Baru */}
          {newItems.length > 0 && (
            <Card className="bg-green-50/50 border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-700 font-bold">
                  Pagu Anggaran Baru ({newItems.length} item)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-md">
                  <Table className="w-full text-xs">
                    <TableHeader className="bg-green-100/50">
                      <TableRow>
                        <TableHead className="text-left py-2 px-3 font-semibold">
                          No
                        </TableHead>
                        <TableHead className="text-left py-2 px-3 font-semibold">
                          Pembebanan
                        </TableHead>
                        <TableHead className="text-left py-2 px-3 font-semibold">
                          Uraian
                        </TableHead>
                        <TableHead className="text-center py-2 px-3 font-semibold">
                          Volume
                        </TableHead>
                        <TableHead className="text-center py-2 px-3 font-semibold">
                          Satuan
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Harga Satuan
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Jumlah
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Realisasi
                        </TableHead>
                        <TableHead className="text-right py-2 px-3 font-semibold">
                          Persentase Realisasi
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getNewBudgetItems().map((item, idx) => {
                        const newItem = newItems[idx];
                        return (
                          <TableRow key={item.id} className={idx % 2 === 0 ? '' : 'bg-slate-50'}>
                            <TableCell className="py-2 px-3">{idx + 1}</TableCell>
                            <TableCell className="py-2 px-3 text-xs font-mono">
                              {item.pembebanan}
                            </TableCell>
                            <TableCell className="py-2 px-3">{item.uraian}</TableCell>
                            <TableCell className="text-center py-2 px-3">
                              {newItem?.volume_menjadi}
                            </TableCell>
                            <TableCell className="text-center py-2 px-3">
                              {newItem?.satuan_menjadi}
                            </TableCell>
                            <TableCell className="text-right py-2 px-3">
                              {formatCurrency(newItem?.harga_satuan_menjadi || 0)}
                            </TableCell>
                            <TableCell className="text-right py-2 px-3 font-semibold text-green-600">
                              {formatCurrency(item.jumlahMenjadi)}
                            </TableCell>
                            <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                              {formatCurrency(item.realisasi || 0)}
                            </TableCell>
                            <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                              {formatPercentage(item.persentaseRealisasi || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={6} className="py-2 px-3">
                          Total Pagu Anggaran Baru
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrency(
                            getNewBudgetItems().reduce((sum, item) => sum + item.jumlahMenjadi, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                          {formatCurrency(
                            getNewBudgetItems().reduce((sum, item) => sum + (item.realisasi || 0), 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                          {formatPercentage(
                            getNewBudgetItems().length > 0
                              ? Math.round(
                                  (getNewBudgetItems().reduce((sum, item) => sum + (item.realisasi || 0), 0) /
                                    getNewBudgetItems().reduce((sum, item) => sum + item.jumlahMenjadi, 0)) *
                                    100 *
                                    100
                                ) / 100
                              : 0
                          )}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // For other summary views (by category)
    const summaryData = getFilteredSummaryData();
    const values = getTotalSummaryValues();

    return (
      <DetailedSummaryView
        title={getSummaryTitle()}
        data={summaryData}
        totalSemula={values.semula}
        totalMenjadi={values.menjadi}
        totalSelisih={values.selisih}
      />
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <h2 className="text-xl font-semibold text-slate-800">Ringkasan Usulan Revisi Anggaran</h2>

      {/* Button Navigation */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-lg border">
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

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default BahanRevisiRingkasanSubtab;
