/**
 * Ringkasan/Summary Component untuk Bahan Revisi Anggaran
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BudgetItem } from '@/types/bahanrevisi';
import {
  formatCurrency,
  calculateBudgetSummary,
  calculateBudgetSummaryByGroup,
} from '@/utils/bahanrevisi-calculations';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';

interface BahanRevisiRingkasanProps {
  items: BudgetItem[];
  isLoading?: boolean;
}

const BahanRevisiRingkasan: React.FC<BahanRevisiRingkasanProps> = ({
  items,
  isLoading = false,
}) => {
  const summary = useMemo(() => calculateBudgetSummary(items), [items]);
  const summaryByGroup = useMemo(() => calculateBudgetSummaryByGroup(items), [items]);

  // Chart data for summary by group
  const chartData = useMemo(() => {
    return summaryByGroup.map((group) => ({
      name: group.account_group_name,
      semula: group.total_semula,
      menjadi: group.total_menjadi,
      selisih: group.total_selisih,
    }));
  }, [summaryByGroup]);

  // Pie chart data for status distribution
  const statusData = useMemo(() => {
    return [
      { name: 'New', value: summary.new_items_count },
      { name: 'Changed', value: summary.changed_items_count },
      { name: 'Unchanged', value: summary.unchanged_items_count },
      { name: 'Deleted', value: summary.deleted_items_count },
    ].filter((d) => d.value > 0);
  }, [summary]);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-slate-500">
            Loading summary data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Semula
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.total_semula)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Pagu Anggaran Awal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Menjadi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.total_menjadi)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Pagu Anggaran Revisi</p>
          </CardContent>
        </Card>

        <Card
          className={
            summary.total_selisih > 0
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Selisih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold flex items-center gap-2 ${
                summary.total_selisih > 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {summary.total_selisih > 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {formatCurrency(Math.abs(summary.total_selisih))}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.total_selisih > 0 ? 'Penambahan' : 'Pengurangan'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">
              {summary.total_items_count}
            </p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {summary.new_items_count > 0 && (
                <Badge variant="default" className="bg-blue-600 text-xs">
                  Baru: {summary.new_items_count}
                </Badge>
              )}
              {summary.changed_items_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  Berubah: {summary.changed_items_count}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart - Summary by Group */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Perbandingan per Kelompok Akun
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#f8fafc', border: 'none' }}
                  />
                  <Legend />
                  <Bar dataKey="semula" fill="#3b82f6" name="Semula" />
                  <Bar dataKey="menjadi" fill="#10b981" name="Menjadi" />
                  <Bar dataKey="selisih" fill="#f59e0b" name="Selisih" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Pie Chart - Status Distribution */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Distribusi Status Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-4 text-xs">
                {statusData.map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx] }}
                    />
                    <span>
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Summary by Group */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ringkasan Detil per Kelompok Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summaryByGroup.map((group) => (
              <div
                key={group.account_group}
                className="p-3 border border-slate-200 rounded-lg"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {group.account_group_name}
                    </p>
                    <p className="text-xs text-slate-500">{group.account_group}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(group.total_selisih)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {group.total_items} item(s)
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="flex justify-between bg-blue-50 p-2 rounded">
                    <span className="text-slate-600">Semula:</span>
                    <span className="font-medium">
                      {formatCurrency(group.total_semula)}
                    </span>
                  </div>
                  <div className="flex justify-between bg-green-50 p-2 rounded">
                    <span className="text-slate-600">Menjadi:</span>
                    <span className="font-medium">
                      {formatCurrency(group.total_menjadi)}
                    </span>
                  </div>
                  <div className="flex justify-between bg-amber-50 p-2 rounded">
                    <span className="text-slate-600">Selisih:</span>
                    <span
                      className={`font-medium ${
                        group.total_selisih > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(group.total_selisih)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {group.new_items > 0 && (
                    <Badge className="text-xs bg-blue-600">
                      Baru: {group.new_items}
                    </Badge>
                  )}
                  {group.changed_items > 0 && (
                    <Badge className="text-xs bg-amber-600">
                      Berubah: {group.changed_items}
                    </Badge>
                  )}
                  {group.unchanged_items > 0 && (
                    <Badge className="text-xs bg-green-600">
                      Tidak Berubah: {group.unchanged_items}
                    </Badge>
                  )}
                  {group.deleted_items > 0 && (
                    <Badge className="text-xs bg-red-600">
                      Dihapus: {group.deleted_items}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BahanRevisiRingkasan;
