/**
 * Summary Cards Bar for Bahan Revisi Anggaran
 * Menampilkan ringkasan total semula, menjadi, dan selisih dengan color coding dinamis
 */

import React, { useMemo } from 'react';
import { BudgetItem } from '@/types/bahanrevisi';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SummaryCardsBarProps {
  items: BudgetItem[];
}

const SummaryCardsBar: React.FC<SummaryCardsBarProps> = ({ items }) => {
  const summary = useMemo(() => {
    const totalSemula = items.reduce((sum, item) => sum + (item.jumlah_semula || 0), 0);
    const totalMenjadi = items.reduce((sum, item) => sum + (item.jumlah_menjadi || 0), 0);
    const selisih = totalMenjadi - totalSemula;

    return {
      totalSemula,
      totalMenjadi,
      selisih,
    };
  }, [items]);

  // Determine color based on selisih value
  const getSelisihColor = () => {
    if (summary.selisih === 0) {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
      };
    } else if (summary.selisih > 0) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
      };
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
      };
    }
  };

  const selisihColor = getSelisihColor();

  // Determine color untuk total (unchanged = hijau, berubah = kuning)
  const getTotalColor = (value: number, reference: number) => {
    if (value === reference) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
      };
    } else {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
      };
    }
  };

  const totalSemulaBg = getTotalColor(summary.totalSemula, summary.totalSemula);
  const totalMenjadiColor = getTotalColor(summary.totalMenjadi, summary.totalSemula);

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Total Semula Card */}
      <div
        className={`border rounded p-2.5 ${totalSemulaBg.bg} ${totalSemulaBg.border} transition-all`}
      >
        <p className="text-xs font-medium text-gray-700">Total Semula</p>
        <p className={`text-sm font-bold ${totalSemulaBg.text}`}>
          {formatCurrency(summary.totalSemula)}
        </p>
      </div>

      {/* Total Menjadi Card */}
      <div
        className={`border rounded p-2.5 ${totalMenjadiColor.bg} ${totalMenjadiColor.border} transition-all`}
      >
        <p className="text-xs font-medium text-gray-700">Total Menjadi</p>
        <p className={`text-sm font-bold ${totalMenjadiColor.text}`}>
          {formatCurrency(summary.totalMenjadi)}
        </p>
      </div>

      {/* Selisih Card */}
      <div
        className={`border rounded p-2.5 ${selisihColor.bg} ${selisihColor.border} transition-all`}
      >
        <div className="flex items-center gap-1 mb-1">
          <p className="text-xs font-medium text-gray-700">Selisih</p>
          {summary.selisih > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : summary.selisih < 0 ? (
            <TrendingDown className="h-3 w-3 text-red-600" />
          ) : (
            <Minus className="h-3 w-3 text-gray-600" />
          )}
        </div>
        <p className={`text-sm font-bold ${selisihColor.text}`}>
          {summary.selisih > 0 ? '+' : ''}{formatCurrency(summary.selisih)}
        </p>
      </div>
    </div>
  );
};

export default SummaryCardsBar;
