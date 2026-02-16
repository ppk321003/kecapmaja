/**
 * Summary Chart Component
 * Menampilkan bar chart untuk perbandingan total semula, menjadi, dan selisih
 * Menggunakan Recharts untuk visualisasi data
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';

export type SummaryViewType = 'changes' | 'program_pembebanan' | 'kegiatan' | 'rincian_output' | 'komponen_output' | 'sub_komponen' | 'akun' | 'akun_group' | 'account_group';

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
}

interface SummaryChartProps {
  data: SummaryRow[];
  title: string;
}

const SummaryChart: React.FC<SummaryChartProps> = ({ data, title }) => {
  const chartData = data
    .filter((item) => item.totalMenjadi !== 0 || item.totalSemula !== 0)
    .map((item) => ({
      name: item.name.length > 20 ? `${item.name.substring(0, 20)}...` : item.name,
      fullName: item.name,
      semula: item.totalSemula,
      menjadi: item.totalMenjadi,
      selisih: item.totalSelisih,
    }));

  if (chartData.length === 0) {
    return (
      <div className="w-full h-[450px] flex items-center justify-center bg-gray-50 rounded-lg border">
        <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 5,
          bottom: 25,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={50}
          interval={0}
          tick={{
            fontSize: 10,
          }}
        />
        <YAxis
          tickFormatter={(value) => formatCurrency(value)}
          tick={{ fontSize: 9 }}
          width={60}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(label) => `${label}`}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          wrapperStyle={{
            paddingBottom: 0,
            paddingTop: 0,
            right: 10,
            top: 0,
          }}
        />
        <Bar dataKey="semula" name="Total Semula" fill="#8884d8" />
        <Bar dataKey="menjadi" name="Total Menjadi" fill="#82ca9d" />
        <Bar dataKey="selisih" name="Selisih" fill="#ffc658">
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.selisih === 0 ? '#4ade80' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SummaryChart;
