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
    const percentChange = totalSemula > 0 ? ((selisih / totalSemula) * 100).toFixed(2) : '0.00';

    return {
      totalSemula,
      totalMenjadi,
      selisih,
      percentChange: Number(percentChange),
    };
  }, [items]);

  // Determine color based on selisih value
  const getSelisihColor = () => {
    if (summary.selisih === 0) {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        badge: 'bg-gray-100 text-gray-700',
      };
    } else if (summary.selisih > 0) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
      };
    } else {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Semula Card */}
      <div
        className={`border rounded-lg p-4 ${totalSemulaBg.bg} ${totalSemulaBg.border} transition-all`}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Total Semula</h4>
        </div>
        <p className={`text-xl font-bold ${totalSemulaBg.text}`}>
          {formatCurrency(summary.totalSemula)}
        </p>
        <p className="text-xs text-gray-600 mt-1">{items.length} item</p>
      </div>

      {/* Total Menjadi Card */}
      <div
        className={`border rounded-lg p-4 ${totalMenjadiColor.bg} ${totalMenjadiColor.border} transition-all`}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Total Menjadi</h4>
        </div>
        <p className={`text-xl font-bold ${totalMenjadiColor.text}`}>
          {formatCurrency(summary.totalMenjadi)}
        </p>
        <p className="text-xs text-gray-600 mt-1">{items.length} item</p>
      </div>

      {/* Selisih Card */}
      <div
        className={`border rounded-lg p-4 ${selisihColor.bg} ${selisihColor.border} transition-all`}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Selisih</h4>
          {summary.selisih > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : summary.selisih < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-600" />
          ) : (
            <Minus className="h-4 w-4 text-gray-600" />
          )}
        </div>
        <p className={`text-xl font-bold ${selisihColor.text}`}>
          {summary.selisih > 0 ? '+' : ''}{formatCurrency(summary.selisih)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${selisihColor.badge}`}
          >
            {summary.selisih > 0 ? '+' : ''}{summary.percentChange}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCardsBar;
