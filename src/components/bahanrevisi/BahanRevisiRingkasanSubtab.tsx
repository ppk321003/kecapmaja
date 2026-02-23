/**
 * Ringkasan Usulan Revisi - Complete implementation matching reference repo
 * Button-based navigation dengan Chart, Table, dan Kesimpulan
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BudgetItem } from '@/types/bahanrevisi';
import {
  formatCurrency,
  formatCurrencyNoRp,
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
import { Program, Kegiatan, RincianOutput, KomponenOutput, SubKomponen, Akun } from '@/types/bahanrevisi';

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
  programs?: Program[];
  kegiatans?: Kegiatan[];
  rincianOutputs?: RincianOutput[];
  komponenOutputs?: KomponenOutput[];
  subKomponen?: SubKomponen[];
  akuns?: Akun[];
}

const BahanRevisiRingkasanSubtab: React.FC<BahanRevisiRingkasanSubtabProps> = ({ 
  items, 
  programs = [],
  kegiatans = [],
  rincianOutputs = [],
  komponenOutputs = [],
  subKomponen = [],
  akuns = []
}) => {
  // Build name mappings menggunakan field yang SAMA dengan filter options
  const kegiatanNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    kegiatans.forEach(keg => {
      // Menggunakan format: ${keg.id} - ${keg.name}
      map[keg.id] = `${keg.id} - ${keg.name}`;
    });
    return map;
  }, [kegiatans]);

  const rincianOutputNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    rincianOutputs.forEach(rio => {
      // Menggunakan format: ${rio.id} - ${rio.name}
      map[rio.id] = `${rio.id} - ${rio.name}`;
    });
    return map;
  }, [rincianOutputs]);

  const komponenOutputNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    komponenOutputs.forEach(ko => {
      // Menggunakan format: ${ko.id} - ${ko.name}
      map[ko.id] = `${ko.id} - ${ko.name}`;
    });
    return map;
  }, [komponenOutputs]);

  const subKomponenNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    subKomponen.forEach(sk => {
      // Menggunakan format: ${sk.id} - ${sk.name}
      map[sk.id] = `${sk.id} - ${sk.name}`;
    });
    return map;
  }, [subKomponen]);

  const programNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    programs.forEach(prog => {
      // Menggunakan format: ${prog.id} - ${prog.name}
      map[prog.id] = `${prog.id} - ${prog.name}`;
    });
    return map;
  }, [programs]);

  const akunNameMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    akuns.forEach(akun => {
      // Menggunakan format: ${akun.id} - ${akun.name}
      map[akun.id] = `${akun.id} - ${akun.name}`;
    });
    return map;
  }, [akuns]);

  // Helper function menggunakan map sederhana
  const getFormattedName = (code: string | undefined, type: 'program' | 'kegiatan' | 'rincian_output' | 'komponen_output' | 'sub_komponen' | 'akun'): string => {
    if (!code) return 'Unknown';
    
    switch (type) {
      case 'program':
        return programNameMap[code] || code;
      case 'kegiatan':
        return kegiatanNameMap[code] || code;
      case 'rincian_output':
        return rincianOutputNameMap[code] || code;
      case 'komponen_output':
        return komponenOutputNameMap[code] || code;
      case 'sub_komponen':
        return subKomponenNameMap[code] || code;
      case 'akun':
        return akunNameMap[code] || code;
      default:
        return code;
    }
  };

  const [summaryView, setSummaryView] = useState<SummaryViewType>('changes');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState<SummaryRow | null>(null);
  const [selectedDetailItems, setSelectedDetailItems] = useState<BudgetChangeItem[]>([]);
  const [detailsModalCurrentPage, setDetailsModalCurrentPage] = useState(0);
  const itemsPerPage = 20;

  // Separate changed, new, and deleted items
  const changedItems = useMemo(() => items.filter(item => item.status === 'changed'), [items]);
  const newItems = useMemo(() => items.filter(item => item.status === 'new'), [items]);
  const deletedItems = useMemo(() => items.filter(item => item.status === 'deleted'), [items]);
  const unchangedItems = useMemo(() => items.filter(item => item.status === 'unchanged'), [items]);

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
    if (item.komponen_output) parts.push(item.komponen_output);
    if (item.sub_komponen) parts.push(item.sub_komponen);
    if (item.akun) parts.push(item.akun);
    return parts.join('.');
  };

  // Helper function to get detail perubahan text
  const getDetailPerubahan = (item: BudgetItem): string => {
    const lines = [];
    if (item.volume_semula || item.satuan_semula || item.harga_satuan_semula) {
      lines.push(`Semula: ${item.volume_semula} ${item.satuan_semula} @ ${formatCurrencyNoRp(item.harga_satuan_semula || 0)}`);
    }
    if (item.volume_menjadi || item.satuan_menjadi || item.harga_satuan_menjadi) {
      lines.push(`Menjadi: ${item.volume_menjadi} ${item.satuan_menjadi} @ ${formatCurrencyNoRp(item.harga_satuan_menjadi || 0)}`);
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

  // Get all budget items (changed + new + deleted + unchanged) for modal filtering
  const getAllBudgetItems = (): BudgetChangeItem[] => {
    const allItems: BudgetChangeItem[] = [];
    
    // Add changed items
    changedItems.forEach((item) => {
      const jumlahMenjadi = Number(item.jumlah_menjadi) || 0;
      const sisaAnggaran = Number(item.sisa_anggaran) || 0;
      const blokir = Number(item.blokir) || 0;
      const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
      const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
      allItems.push({
        id: item.id,
        pembebanan: getCombinedPembebananCode(item),
        uraian: item.uraian || '',
        detailPerubahan: getDetailPerubahan(item),
        jumlahSemula: Number(item.jumlah_semula) || 0,
        jumlahMenjadi,
        selisih: item.selisih || 0,
        realisasi,
        persentaseRealisasi,
      });
    });

    // Add new items
    newItems.forEach((item) => {
      if ((Number(item.jumlah_menjadi) || 0) > 0) {
        const jumlahMenjadi = Number(item.jumlah_menjadi) || 0;
        const sisaAnggaran = Number(item.sisa_anggaran) || 0;
        const blokir = Number(item.blokir) || 0;
        const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
        const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
        allItems.push({
          id: item.id,
          pembebanan: getCombinedPembebananCode(item),
          uraian: item.uraian || '',
          detailPerubahan: `Baru: ${item.volume_menjadi} ${item.satuan_menjadi} @ ${formatCurrencyNoRp(item.harga_satuan_menjadi || 0)}`,
          jumlahSemula: 0,
          jumlahMenjadi,
          selisih: jumlahMenjadi,
          realisasi,
          persentaseRealisasi,
        });
      }
    });

    // Add deleted items
    deletedItems.forEach((item) => {
      const jumlahSemula = Number(item.jumlah_semula) || 0;
      const jumlahMenjadi = 0;
      const selisih = jumlahMenjadi - jumlahSemula;
      const sisaAnggaran = Number(item.sisa_anggaran) || 0;
      const blokir = Number(item.blokir) || 0;
      const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
      const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
      allItems.push({
        id: item.id,
        pembebanan: getCombinedPembebananCode(item),
        uraian: item.uraian || '',
        detailPerubahan: `Dihapus: ${item.volume_semula} ${item.satuan_semula} @ ${formatCurrencyNoRp(item.harga_satuan_semula || 0)}`,
        jumlahSemula,
        jumlahMenjadi,
        selisih,
        realisasi,
        persentaseRealisasi,
      });
    });

    // Add unchanged items
    unchangedItems.forEach((item) => {
      const jumlahMenjadi = Number(item.jumlah_menjadi) || 0;
      const sisaAnggaran = Number(item.sisa_anggaran) || 0;
      const blokir = Number(item.blokir) || 0;
      const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
      const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
      allItems.push({
        id: item.id,
        pembebanan: getCombinedPembebananCode(item),
        uraian: item.uraian || '',
        detailPerubahan: getDetailPerubahan(item),
        jumlahSemula: Number(item.jumlah_semula) || 0,
        jumlahMenjadi,
        selisih: item.selisih || 0,
        realisasi,
        persentaseRealisasi,
      });
    });

    return allItems;
  };

  const getNewBudgetItems = (): BudgetChangeItem[] => {
    return newItems
      .filter((item) => (Number(item.jumlah_menjadi) || 0) > 0) // Hide new items with 0 amount
      .map((item) => {
        const jumlahMenjadi = Number(item.jumlah_menjadi) || 0;
        const sisaAnggaran = Number(item.sisa_anggaran) || 0;
        const blokir = Number(item.blokir) || 0;
        const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
        const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
        return {
          id: item.id,
          pembebanan: getCombinedPembebananCode(item),
          uraian: item.uraian || '',
          detailPerubahan: `Baru: ${item.volume_menjadi} ${item.satuan_menjadi} @ ${formatCurrencyNoRp(item.harga_satuan_menjadi || 0)}`,
          jumlahSemula: 0,
          jumlahMenjadi,
          selisih: jumlahMenjadi,
          realisasi,
          persentaseRealisasi,
        };
      });
  };

  const getDeletedBudgetItems = (): BudgetChangeItem[] => {
    return deletedItems.map((item) => {
      const jumlahSemula = Number(item.jumlah_semula) || 0;
      const jumlahMenjadi = 0;
      const selisih = jumlahMenjadi - jumlahSemula;
      const sisaAnggaran = Number(item.sisa_anggaran) || 0;
      const blokir = Number(item.blokir) || 0;
      const realisasi = calculateRealisasi(jumlahMenjadi, sisaAnggaran, blokir);
      const persentaseRealisasi = calculatePersentaseRealisasi(realisasi, jumlahMenjadi);
      return {
        id: item.id,
        pembebanan: getCombinedPembebananCode(item),
        uraian: item.uraian || '',
        detailPerubahan: `Dihapus: ${item.volume_semula} ${item.satuan_semula} @ ${formatCurrencyNoRp(item.harga_satuan_semula || 0)}`,
        jumlahSemula,
        jumlahMenjadi,
        selisih,
        realisasi,
        persentaseRealisasi,
      };
    });
  };

  // Handle row click to show detail items in modal
  const handleRowClick = (group: SummaryRow) => {
    // Get all budget items (changed + new + deleted)
    const allBudgetItems = getAllBudgetItems();
    
    // Filter based on summaryView
    let detailItems: BudgetChangeItem[] = [];
    switch (summaryView) {
      case 'program_pembebanan':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[0] === group.id;
        });
        break;
      case 'kegiatan':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[1] === group.id;
        });
        break;
      case 'rincian_output':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[2] === group.id;
        });
        break;
      case 'komponen_output':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[3] === group.id;
        });
        break;
      case 'sub_komponen':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[4] === group.id;
        });
        break;
      case 'akun':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[5] === group.id;
        });
        break;
      case 'akun_group':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[5]?.slice(0, 3) === group.id;
        });
        break;
      case 'account_group':
        detailItems = allBudgetItems.filter(item => {
          const parts = item.pembebanan.split('.');
          return parts[5]?.slice(0, 2) === group.id;
        });
        break;
      default:
        break;
    }
    
    setSelectedDetailGroup(group);
    setSelectedDetailItems(detailItems);
    setDetailsModalCurrentPage(0);
    setIsDetailsModalOpen(true);
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
      
      // Get the appropriate name/code field based on summary type and format as "code - name"
      const itemCode = item.program_pembebanan || item.kegiatan || item.rincian_output || 
                       item.komponen_output || item.sub_komponen || item.akun || 'Unknown';
      
      // Determine type and format name accordingly
      let itemName: string;
      if (summaryView === 'program_pembebanan') {
        itemName = getFormattedName(item.program_pembebanan, 'program');
      } else if (summaryView === 'kegiatan') {
        itemName = getFormattedName(item.kegiatan, 'kegiatan');
      } else if (summaryView === 'rincian_output') {
        itemName = getFormattedName(item.rincian_output, 'rincian_output');
      } else if (summaryView === 'komponen_output') {
        itemName = getFormattedName(item.komponen_output, 'komponen_output');
      } else if (summaryView === 'sub_komponen') {
        itemName = getFormattedName(item.sub_komponen, 'sub_komponen');
      } else if (summaryView === 'akun') {
        itemName = getFormattedName(item.akun, 'akun');
      } else if (summaryView === 'akun_group' || summaryView === 'account_group') {
        // For Kelompok Akun and Kelompok Belanja, use the name field directly (already has descriptions)
        itemName = item.name || itemCode;
      } else {
        itemName = itemCode;
      }
      
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
      return { 
        semula: 0, 
        menjadi: 0, 
        selisih: 0,
        sisaAnggaran: 0,
        realisasi: 0,
        blokir: 0,
        baru: 0,
        berubah: 0,
        totalItems: 0
      };
    }

    const totalSemula = data.reduce((sum, item) => sum + item.totalSemula, 0);
    const totalMenjadi = data.reduce((sum, item) => sum + item.totalMenjadi, 0);
    const totalSelisih = data.reduce((sum, item) => sum + item.totalSelisih, 0);
    const totalSisaAnggaran = data.reduce((sum, item) => sum + (item.sisaAnggaran || 0), 0);
    const totalRealisasi = data.reduce((sum, item) => sum + (item.realisasi || 0), 0);
    const totalBlokir = data.reduce((sum, item) => sum + (item.blokir || 0), 0);
    const totalBaru = data.reduce((sum, item) => sum + item.newItems, 0);
    const totalBerubah = data.reduce((sum, item) => sum + item.changedItems, 0);
    const totalAllItems = data.reduce((sum, item) => sum + item.totalItems, 0);
    
    // Hitung persentase realisasi total
    const totalPersentaseRealisasi = totalMenjadi > 0 
      ? Math.round((totalRealisasi / totalMenjadi) * 100 * 100) / 100 
      : 0;

    return { 
      semula: totalSemula, 
      menjadi: totalMenjadi, 
      selisih: totalSelisih,
      sisaAnggaran: totalSisaAnggaran,
      realisasi: totalRealisasi,
      persentaseRealisasi: totalPersentaseRealisasi,
      blokir: totalBlokir,
      baru: totalBaru,
      berubah: totalBerubah,
      totalItems: totalAllItems
    };
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
                  semula sebesar <strong>{formatCurrencyNoRp(totalSemula)}</strong> mengalami perubahan menjadi
                  <strong> {formatCurrencyNoRp(totalMenjadi)}</strong>, dengan selisih <strong>{formatCurrencyNoRp(Math.abs(totalSelisih))}</strong> ({totalSelisih > 0 ? 'penambahan' : totalSelisih < 0 ? 'pengurangan' : 'atau tetap'}).
                </p>
                <p>
                  Perubahan ini terdiri dari <strong>{changedItems.length} komponen anggaran</strong> yang
                  mengalami penyesuaian nilai, <strong>{getNewBudgetItems().length} komponen anggaran baru</strong> yang ditambahkan,
                  dan <strong>{allDeletedItems.length} komponen anggaran</strong> yang dihapus.
                </p>
                <p>
                  Penyesuaian anggaran ini dilakukan untuk mengoptimalkan
                  penggunaan sumber daya keuangan sesuai dengan prioritas program dan kegiatan
                  yang telah ditetapkan. Dengan adanya <strong>{changedItems.length + getNewBudgetItems().length} perubahan</strong> ini, 
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
                      <span className="font-medium">{formatCurrencyNoRp(totalSemula)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Menjadi:</span>
                      <span className="font-medium">{formatCurrencyNoRp(totalMenjadi)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="text-gray-600">Selisih:</span>
                      <span className={`font-medium ${totalSelisih === 0 ? 'text-green-600' : totalSelisih > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrencyNoRp(totalSelisih)}
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
                      <span className="font-medium text-green-600">{getNewBudgetItems().length}</span>
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
                            {formatCurrencyNoRp(item.jumlahSemula)}
                          </TableCell>
                          <TableCell className="text-right py-2 px-3">
                            {formatCurrencyNoRp(item.jumlahMenjadi)}
                          </TableCell>
                          <TableCell
                            className={`text-right py-2 px-3 font-semibold ${
                              item.selisih === 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {formatCurrencyNoRp(item.selisih)}
                          </TableCell>
                          <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                            {formatCurrencyNoRp(item.realisasi || 0)}
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
                          {formatCurrencyNoRp(
                            getChangedBudgetItems().reduce((sum, item) => sum + item.jumlahSemula, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrencyNoRp(
                            getChangedBudgetItems().reduce((sum, item) => sum + item.jumlahMenjadi, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrencyNoRp(
                            getChangedBudgetItems().reduce((sum, item) => sum + item.selisih, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                          {formatCurrencyNoRp(
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
          {getNewBudgetItems().length > 0 && (
            <Card className="bg-green-50/50 border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-700 font-bold">
                  Pagu Anggaran Baru ({getNewBudgetItems().length} item)
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
                              {formatCurrencyNoRp(newItem?.harga_satuan_menjadi || 0)}
                            </TableCell>
                            <TableCell className="text-right py-2 px-3 font-semibold text-green-600">
                              {formatCurrencyNoRp(item.jumlahMenjadi)}
                            </TableCell>
                            <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                              {formatCurrencyNoRp(item.realisasi || 0)}
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
                          {formatCurrencyNoRp(
                            getNewBudgetItems().reduce((sum, item) => sum + item.jumlahMenjadi, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3 text-purple-600 font-medium">
                          {formatCurrencyNoRp(
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

          {/* Pagu Anggaran yang dihapus */}
          {deletedItems.length > 0 && (
            <Card className="bg-red-50/50 border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-red-700 font-bold">
                  Pagu Anggaran yang dihapus ({deletedItems.length} item)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-md">
                  <Table className="w-full text-xs">
                    <TableHeader className="bg-red-100/50">
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
                          Detail Penghapusan
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getDeletedBudgetItems().map((item, idx) => (
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
                            {formatCurrencyNoRp(item.jumlahSemula)}
                          </TableCell>
                          <TableCell className="text-right py-2 px-3">
                            {formatCurrencyNoRp(item.jumlahMenjadi)}
                          </TableCell>
                          <TableCell
                            className="text-right py-2 px-3 font-semibold text-red-600"
                          >
                            {formatCurrencyNoRp(item.selisih)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell colSpan={4} className="py-2 px-3">
                          Total Pagu Anggaran yang dihapus
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrencyNoRp(
                            getDeletedBudgetItems().reduce((sum, item) => sum + item.jumlahSemula, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrencyNoRp(
                            getDeletedBudgetItems().reduce((sum, item) => sum + item.jumlahMenjadi, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2 px-3">
                          {formatCurrencyNoRp(
                            getDeletedBudgetItems().reduce((sum, item) => sum + item.selisih, 0)
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
        totalSisaAnggaran={values.sisaAnggaran}
        totalRealisasi={values.realisasi}
        totalPersentaseRealisasi={values.persentaseRealisasi}
        totalBlokir={values.blokir}
        totalBaru={values.baru}
        totalBerubah={values.berubah}
        totalAllItems={values.totalItems}
        onRowClick={handleRowClick}
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

      {/* Detail Items Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detail Uraian - {selectedDetailGroup?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedDetailItems && selectedDetailItems.length > 0 ? (
            <div className="flex flex-col gap-4 flex-1 overflow-hidden">
              {/* Scrollable table container with sticky header and column */}
              <div className="flex-1 overflow-auto relative bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      {/* Sticky header - Uraian column */}
                      <th className="sticky left-0 top-0 z-20 text-left py-2 px-3 font-semibold min-w-[350px] bg-slate-100 border-b border-slate-200">
                        Uraian
                      </th>
                      {/* Sticky header - other columns */}
                      <th className="sticky top-0 z-10 text-left py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Detail Perubahan
                      </th>
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Jumlah Semula
                      </th>
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Jumlah Menjadi
                      </th>
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Selisih
                      </th>
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Realisasi
                      </th>
                      <th className="sticky top-0 z-10 text-right py-2 px-3 font-semibold bg-slate-100 border-b border-slate-200 whitespace-nowrap">
                        Persentase Realisasi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? '' : 'bg-slate-50'}>
                        {/* Sticky first column */}
                        <td className={`sticky left-0 z-5 text-left py-2 px-3 font-medium min-w-[350px] border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                          {item.uraian || 'N/A'}
                        </td>
                        <td className="text-left py-2 px-3 whitespace-pre-wrap text-xs border-b border-slate-200">
                          {item.detailPerubahan}
                        </td>
                        <td className="text-right py-2 px-3 border-b border-slate-200 whitespace-nowrap">
                          {formatCurrencyNoRp(item.jumlahSemula)}
                        </td>
                        <td className="text-right py-2 px-3 border-b border-slate-200 whitespace-nowrap">
                          {formatCurrencyNoRp(item.jumlahMenjadi)}
                        </td>
                        <td className={`text-right py-2 px-3 border-b border-slate-200 whitespace-nowrap font-semibold ${item.selisih === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrencyNoRp(item.selisih)}
                        </td>
                        <td className="text-right py-2 px-3 border-b border-slate-200 whitespace-nowrap text-purple-600 font-medium">
                          {formatCurrencyNoRp(item.realisasi || 0)}
                        </td>
                        <td className="text-right py-2 px-3 border-b border-slate-200 whitespace-nowrap text-purple-600 font-medium">
                          {formatPercentage(item.persentaseRealisasi || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-50 border-t border-slate-300">
                      <td className="sticky left-0 z-5 py-2 px-3 min-w-[350px] bg-slate-50 border-b border-slate-200">
                        Total (halaman)
                      </td>
                      <td className="text-left py-2 px-3 border-b border-slate-200"></td>
                      <td className="text-right py-2 px-3 whitespace-nowrap border-b border-slate-200">
                        {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + item.jumlahSemula, 0))}
                      </td>
                      <td className="text-right py-2 px-3 whitespace-nowrap border-b border-slate-200">
                        {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + item.jumlahMenjadi, 0))}
                      </td>
                      <td className="text-right py-2 px-3 whitespace-nowrap border-b border-slate-200">
                        {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + item.selisih, 0))}
                      </td>
                      <td className="text-right py-2 px-3 whitespace-nowrap border-b border-slate-200 text-purple-600">
                        {formatCurrencyNoRp(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + (item.realisasi || 0), 0))}
                      </td>
                      <td className="text-right py-2 px-3 whitespace-nowrap border-b border-slate-200 text-purple-600">
                        {formatPercentage(selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).length > 0
                          ? selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + (item.realisasi || 0), 0) / selectedDetailItems.slice(detailsModalCurrentPage * itemsPerPage, (detailsModalCurrentPage + 1) * itemsPerPage).reduce((s, item) => s + item.jumlahMenjadi, 0) * 100
                          : 0
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="border-t pt-4 flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  Menampilkan {Math.min((detailsModalCurrentPage + 1) * itemsPerPage, selectedDetailItems.length)} dari {selectedDetailItems.length} item
                </div>
                <div className="flex gap-2 items-center">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDetailsModalCurrentPage(p => Math.max(0, p - 1))}
                    disabled={detailsModalCurrentPage === 0}
                  >
                    ← Sebelumnya
                  </Button>
                  <div className="text-xs text-slate-600 px-2">
                    Halaman {detailsModalCurrentPage + 1} dari {Math.ceil(selectedDetailItems.length / itemsPerPage)}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDetailsModalCurrentPage(p => Math.min(Math.ceil(selectedDetailItems.length / itemsPerPage) - 1, p + 1))}
                    disabled={detailsModalCurrentPage >= Math.ceil(selectedDetailItems.length / itemsPerPage) - 1}
                  >
                    Selanjutnya →
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <span>Tidak ada data detail untuk ditampilkan</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BahanRevisiRingkasanSubtab;
