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
  
  // Build options from reference data (master sheets) like KAK.tsx does
  
  // Program Pembebanan options - from programs reference data
  const programPembebananOptions = useMemo<SelectOption[]>(() => {
    if (!programs || !Array.isArray(programs)) return [];
    return programs
      .filter(p => p && p.is_active)
      .map(p => {
        const val = String(p.name || '').trim();
        const lbl = String(`${p.code || ''} - ${p.name || ''}`).trim();
        return val && lbl ? { value: val, label: lbl } : null;
      })
      .filter((opt): opt is SelectOption => opt !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [programs]);

  // Kegiatan options - filtered by selected program
  const kegiatanOptions = useMemo<SelectOption[]>(() => {
    if (!filters.program_pembebanan || !kegiatans || !Array.isArray(kegiatans)) return [];
    
    const relatedProgram = programs?.find(p => p && String(p.name || '') === String(filters.program_pembebanan || ''));
    if (!relatedProgram) return [];

    return kegiatans
      .filter(k => k && k.program_id === relatedProgram.id && k.is_active)
      .map(k => {
        const val = String(k.name || '').trim();
        const lbl = String(`${k.code || ''} - ${k.name || ''}`).trim();
        return val && lbl ? { value: val, label: lbl } : null;
      })
      .filter((opt): opt is SelectOption => opt !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filters.program_pembebanan, kegiatans, programs]);

  // Rincian Output options - filtered by selected kegiatan
  const rincianOutputOptions = useMemo<SelectOption[]>(() => {
    if (!filters.kegiatan || !rincianOutputs || !Array.isArray(rincianOutputs)) return [];
    
    const relatedKegiatan = kegiatans?.find(k => k && String(k.name || '') === String(filters.kegiatan || ''));
    if (!relatedKegiatan) return [];

    return rincianOutputs
      .filter(r => r && r.kegiatan_id === relatedKegiatan.id && r.is_active)
      .map(r => {
        const val = String(r.name || '').trim();
        const lbl = String(`${r.code || ''} - ${r.name || ''}`).trim();
        return val && lbl ? { value: val, label: lbl } : null;
      })
      .filter((opt): opt is SelectOption => opt !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filters.kegiatan, rincianOutputs, kegiatans]);

  // Komponen Output options - filtered by selected rincian output
  const komponenOutputOptions = useMemo<SelectOption[]>(() => {
    if (!filters.rincian_output || !komponenOutputs || !Array.isArray(komponenOutputs)) return [];
    
    const relatedRincian = rincianOutputs?.find(r => r && String(r.name || '') === String(filters.rincian_output || ''));
    if (!relatedRincian) return [];

    return komponenOutputs
      .filter(k => k && k.rincian_output_id === relatedRincian.id && k.is_active)
      .map(k => {
        const val = String(k.name || '').trim();
        const lbl = String(`${k.code || ''} - ${k.name || ''}`).trim();
        return val && lbl ? { value: val, label: lbl } : null;
      })
      .filter((opt): opt is SelectOption => opt !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filters.rincian_output, komponenOutputs, rincianOutputs]);

  // Sub Komponen options - filtered by selected komponen output
  const subKomponenOptions = useMemo<SelectOption[]>(() => {
    if (!filters.komponen_output || !subKomponen || !Array.isArray(subKomponen)) return [];
    
    const relatedKomponen = komponenOutputs?.find(k => k && String(k.name || '') === String(filters.komponen_output || ''));
    if (!relatedKomponen) return [];

    return subKomponen
      .filter(s => s && s.komponen_output_id === relatedKomponen.id && s.is_active)
      .map(s => {
        const val = String(s.name || '').trim();
        const lbl = String(`${s.code || ''} - ${s.name || ''}`).trim();
        return val && lbl ? { value: val, label: lbl } : null;
      })
      .filter((opt): opt is SelectOption => opt !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filters.komponen_output, subKomponen, komponenOutputs]);

  // Akun options - all active akuns available
  const akunOptions = useMemo<SelectOption[]>(() => {
    if (!akuns || !Array.isArray(akuns)) return [];
    return akuns
      .filter(a => a && a.is_active)
      .map(a => {
        const val = String(a.code || '').trim();
        const lbl = String(`${a.code || ''} - ${a.name || ''}`).trim();
        return val && lbl ? { value: val, label: lbl } : null;
      })
      .filter((opt): opt is SelectOption => opt !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [akuns]);

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
