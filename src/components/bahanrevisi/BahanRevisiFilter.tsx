/**
 * Filter Component untuk Bahan Revisi Anggaran
 * Mendukung cascading dropdowns berdasarkan hierarchy
 */

import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { 
  BudgetItem, 
  BahanRevisiFilters,
  Program,
  Kegiatan,
  RincianOutput,
  KomponenOutput,
  SubKomponen,
  Akun
} from '@/types/bahanrevisi';

interface BahanRevisiFilterProps {
  filters: BahanRevisiFilters;
  setFilters: (filters: BahanRevisiFilters) => void;
  budgetItems: BudgetItem[];
  programs: Program[];
  kegiatans: Kegiatan[];
  rincianOutputs: RincianOutput[];
  komponenOutputs: KomponenOutput[];
  subKomponen: SubKomponen[];
  akuns: Akun[];
  loading?: boolean;
  hideZeroPagu?: boolean;
  setHideZeroPagu?: (hide: boolean) => void;
}

const BahanRevisiFilter: React.FC<BahanRevisiFilterProps> = ({
  filters,
  setFilters,
  budgetItems,
  programs,
  kegiatans,
  rincianOutputs,
  komponenOutputs,
  subKomponen,
  akuns,
  loading = false,
  hideZeroPagu = false,
  setHideZeroPagu,
}) => {
  // Get unique values dari budget items untuk dropdown
  const programPembebananOptions = useMemo(() => {
    return Array.from(
      new Set(budgetItems.map(item => item.program_pembebanan))
    )
      .filter(Boolean)
      .sort();
  }, [budgetItems]);

  const kegiatanOptions = useMemo(() => {
    if (!filters.program_pembebanan) return [];
    return budgetItems
      .filter(item => item.program_pembebanan === filters.program_pembebanan)
      .map(item => item.kegiatan)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [filters.program_pembebanan, budgetItems]);

  const rincianOutputOptions = useMemo(() => {
    if (!filters.kegiatan) return [];
    return budgetItems
      .filter(item => 
        item.program_pembebanan === filters.program_pembebanan &&
        item.kegiatan === filters.kegiatan
      )
      .map(item => item.rincian_output)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [filters.program_pembebanan, filters.kegiatan, budgetItems]);

  const komponenOutputOptions = useMemo(() => {
    if (!filters.rincian_output) return [];
    return budgetItems
      .filter(item =>
        item.program_pembebanan === filters.program_pembebanan &&
        item.kegiatan === filters.kegiatan &&
        item.rincian_output === filters.rincian_output
      )
      .map(item => item.komponen_output)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [filters.program_pembebanan, filters.kegiatan, filters.rincian_output, budgetItems]);

  const subKomponenOptions = useMemo(() => {
    if (!filters.komponen_output) return [];
    return budgetItems
      .filter(item =>
        item.program_pembebanan === filters.program_pembebanan &&
        item.kegiatan === filters.kegiatan &&
        item.rincian_output === filters.rincian_output &&
        item.komponen_output === filters.komponen_output
      )
      .map(item => item.sub_komponen)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [filters.program_pembebanan, filters.kegiatan, filters.rincian_output, filters.komponen_output, budgetItems]);

  const akunOptions = useMemo(() => {
    return Array.from(
      new Set(budgetItems.map(item => item.akun))
    )
      .filter(Boolean)
      .sort();
  }, [budgetItems]);

  const handleReset = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <Card className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Filter Data</h3>
          {hasActiveFilters && (
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Program Pembebanan */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Program Pembebanan
            </label>
            <Select
              value={filters.program_pembebanan || ''}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  program_pembebanan: value || undefined,
                  kegiatan: undefined,
                  rincian_output: undefined,
                  komponen_output: undefined,
                  sub_komponen: undefined,
                })
              }
              disabled={loading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Program..." />
              </SelectTrigger>
              <SelectContent>
                {programPembebananOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kegiatan */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Kegiatan
            </label>
            <Select
              value={filters.kegiatan || ''}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  kegiatan: value || undefined,
                  rincian_output: undefined,
                  komponen_output: undefined,
                  sub_komponen: undefined,
                })
              }
              disabled={!filters.program_pembebanan || loading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Kegiatan..." />
              </SelectTrigger>
              <SelectContent>
                {kegiatanOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rincian Output */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Rincian Output
            </label>
            <Select
              value={filters.rincian_output || ''}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  rincian_output: value || undefined,
                  komponen_output: undefined,
                  sub_komponen: undefined,
                })
              }
              disabled={!filters.kegiatan || loading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Rincian Output..." />
              </SelectTrigger>
              <SelectContent>
                {rincianOutputOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Komponen Output */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Komponen Output
            </label>
            <Select
              value={filters.komponen_output || ''}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  komponen_output: value || undefined,
                  sub_komponen: undefined,
                })
              }
              disabled={!filters.rincian_output || loading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Komponen..." />
              </SelectTrigger>
              <SelectContent>
                {komponenOutputOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub Komponen */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Sub Komponen
            </label>
            <Select
              value={filters.sub_komponen || ''}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  sub_komponen: value || undefined,
                })
              }
              disabled={!filters.komponen_output || loading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Sub Komponen..." />
              </SelectTrigger>
              <SelectContent>
                {subKomponenOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Akun */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Akun
            </label>
            <Select
              value={filters.akun || ''}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  akun: value || undefined,
                })
              }
              disabled={loading}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Pilih Akun..." />
              </SelectTrigger>
              <SelectContent>
                {akunOptions.map((option) => (
                  <SelectItem key={option} value={option} className="text-xs">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideZeroPagu}
              onChange={(e) => setHideZeroPagu?.(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-600">
              Sembunyikan jumlah pagu = 0
            </span>
          </label>
        </div>

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            {filters.program_pembebanan && (
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                Program: {filters.program_pembebanan}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      program_pembebanan: undefined,
                      kegiatan: undefined,
                      rincian_output: undefined,
                      komponen_output: undefined,
                      sub_komponen: undefined,
                    })
                  }
                  className="ml-2 text-blue-600 hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            )}
            {filters.kegiatan && (
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                Kegiatan: {filters.kegiatan}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      kegiatan: undefined,
                      rincian_output: undefined,
                      komponen_output: undefined,
                      sub_komponen: undefined,
                    })
                  }
                  className="ml-2 text-green-600 hover:text-green-900"
                >
                  ×
                </button>
              </div>
            )}
            {filters.rincian_output && (
              <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                Rincian: {filters.rincian_output}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      rincian_output: undefined,
                      komponen_output: undefined,
                      sub_komponen: undefined,
                    })
                  }
                  className="ml-2 text-purple-600 hover:text-purple-900"
                >
                  ×
                </button>
              </div>
            )}
            {filters.komponen_output && (
              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                Komponen: {filters.komponen_output}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      komponen_output: undefined,
                      sub_komponen: undefined,
                    })
                  }
                  className="ml-2 text-orange-600 hover:text-orange-900"
                >
                  ×
                </button>
              </div>
            )}
            {filters.sub_komponen && (
              <div className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs">
                Sub Komponen: {filters.sub_komponen}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      sub_komponen: undefined,
                    })
                  }
                  className="ml-2 text-cyan-600 hover:text-cyan-900"
                >
                  ×
                </button>
              </div>
            )}
            {filters.akun && (
              <div className="bg-rose-100 text-rose-800 px-2 py-1 rounded text-xs">
                Akun: {filters.akun}
                <button
                  onClick={() =>
                    setFilters({
                      ...filters,
                      akun: undefined,
                    })
                  }
                  className="ml-2 text-rose-600 hover:text-rose-900"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default BahanRevisiFilter;
