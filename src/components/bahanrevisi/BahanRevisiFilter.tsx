/**
 * Filter Component untuk Bahan Revisi Anggaran
 * Mendukung cascading dropdowns berdasarkan hierarchy dengan reference data
 * Similar to KAK.tsx pattern - menggunakan master data bukan budgetItems
 */

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import SearchableSelect, { SelectOption } from './SearchableSelect';
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
  programsOptions?: SelectOption[];
  kegiatansOptions?: SelectOption[];
  rincianOutputsOptions?: SelectOption[];
  komponenOutputsOptions?: SelectOption[];
  subKomponenOptions?: SelectOption[];
  akunsOptions?: SelectOption[];
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
  programsOptions = [],
  kegiatansOptions = [],
  rincianOutputsOptions = [],
  komponenOutputsOptions = [],
  subKomponenOptions: providedSubKomponenOptions = [],
  akunsOptions = [],
  loading = false,
  hideZeroPagu = false,
  setHideZeroPagu,
}) => {
  // Build options from reference data (master sheets) like KAK.tsx does
  // FALLBACK: If reference data is empty, derive from budgetItems
  // IF PROVIDED: Use options from hook (pre-computed with "code - name" format)
  
  // Program Pembebanan options - use provided options if available
  // Program Pembebanan options - use provided from hook (already memoized)
  const programPembebananOptions = useMemo<SelectOption[]>(() => {
    return programsOptions && Array.isArray(programsOptions) ? programsOptions : [];
  }, [programsOptions]);

  // Kegiatan options - use provided from hook (already memoized)
  const kegiatanOptions = useMemo<SelectOption[]>(() => {
    return kegiatansOptions && Array.isArray(kegiatansOptions) ? kegiatansOptions : [];
  }, [kegiatansOptions]);

  // Rincian Output options - use provided from hook (already memoized)
  const rincianOutputOptions = useMemo<SelectOption[]>(() => {
    return rincianOutputsOptions && Array.isArray(rincianOutputsOptions) ? rincianOutputsOptions : [];
  }, [rincianOutputsOptions]);

  // Komponen Output options - use provided from hook (already memoized)
  const komponenOutputOptions = useMemo<SelectOption[]>(() => {
    return komponenOutputsOptions && Array.isArray(komponenOutputsOptions) ? komponenOutputsOptions : [];
  }, [komponenOutputsOptions]);

  // Sub Komponen options - use provided from hook (already memoized)
  const subKomponenOptions = useMemo<SelectOption[]>(() => {
    return providedSubKomponenOptions && Array.isArray(providedSubKomponenOptions) ? providedSubKomponenOptions : [];
  }, [providedSubKomponenOptions]);

  // Akun options - use provided from hook (already memoized)
  const akunOptions = useMemo<SelectOption[]>(() => {
    return akunsOptions && Array.isArray(akunsOptions) ? akunsOptions : [];
  }, [akunsOptions]);

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
            <SearchableSelect
              value={filters.program_pembebanan || ''}
              options={programPembebananOptions}
              placeholder="Pilih Program..."
              disabled={loading}
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
            />
          </div>

          {/* Kegiatan */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Kegiatan
            </label>
            <SearchableSelect
              value={filters.kegiatan || ''}
              options={kegiatanOptions}
              placeholder="Pilih Kegiatan..."
              disabled={!filters.program_pembebanan || loading}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  kegiatan: value || undefined,
                  rincian_output: undefined,
                  komponen_output: undefined,
                  sub_komponen: undefined,
                })
              }
            />
          </div>

          {/* Rincian Output */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Rincian Output
            </label>
            <SearchableSelect
              value={filters.rincian_output || ''}
              options={rincianOutputOptions}
              placeholder="Pilih Rincian Output..."
              disabled={!filters.kegiatan || loading}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  rincian_output: value || undefined,
                  komponen_output: undefined,
                  sub_komponen: undefined,
                })
              }
            />
          </div>

          {/* Komponen Output */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Komponen Output
            </label>
            <SearchableSelect
              value={filters.komponen_output || ''}
              options={komponenOutputOptions}
              placeholder="Pilih Komponen..."
              disabled={!filters.rincian_output || loading}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  komponen_output: value || undefined,
                  sub_komponen: undefined,
                })
              }
            />
          </div>

          {/* Sub Komponen */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Sub Komponen
            </label>
            <SearchableSelect
              value={filters.sub_komponen || ''}
              options={subKomponenOptions}
              placeholder="Pilih Sub Komponen..."
              disabled={!filters.komponen_output || loading}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  sub_komponen: value || undefined,
                })
              }
            />
          </div>

          {/* Akun */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Akun
            </label>
            <SearchableSelect
              value={filters.akun || ''}
              options={akunOptions}
              placeholder="Pilih Akun..."
              disabled={loading}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  akun: value || undefined,
                })
              }
            />
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
                Program: {String(filters.program_pembebanan || '').slice(0, 50)}
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
                Kegiatan: {String(filters.kegiatan || '').slice(0, 50)}
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
                Rincian: {String(filters.rincian_output || '').slice(0, 50)}
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
                Komponen: {String(filters.komponen_output || '').slice(0, 50)}
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
                Sub Komponen: {String(filters.sub_komponen || '').slice(0, 50)}
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
                Akun: {String(filters.akun || '').slice(0, 50)}
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
