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
  const programPembebananOptions = useMemo<SelectOption[]>(() => {
    // Always try reference data first (most reliable)
    try {
      if (programs && Array.isArray(programs) && programs.length > 0) {
        const result: SelectOption[] = [];
        for (const p of programs) {
          try {
            if (!p || typeof p !== 'object' || !p.is_active) continue;
            const code = String(p.code || '').trim();
            const label = `${code} - ${String(p.name || '').trim()}`;
            if (code && label.trim()) {
              result.push({ value: code, label: label.trim() });
            }
          } catch (e) {
            console.error('Error processing program:', p, e);
          }
        }
        console.log('[Filter] Program options from reference:', result.length, 'programs:', programs.length);
        if (result.length > 0) return result;
      }
    } catch (e) {
      console.error('Error building program options from reference:', e);
    }
    
    // Fall back to provided options from hook
    if (programsOptions && programsOptions.length > 0) {
      console.log('[Filter] Using provided programsOptions:', programsOptions.length);
      return programsOptions;
    }

    try {
      // FALLBACK: Derive from budgetItems
      console.log('[Filter] Using fallback: deriving program options from budgetItems');
      const fallback: SelectOption[] = [];
      const seen = new Set<string>();
      for (const item of budgetItems) {
        try {
          const val = String(item.program_pembebanan || '').trim();
          if (val && !seen.has(val)) {
            seen.add(val);
            fallback.push({ value: val, label: val });
          }
        } catch {}
      }
      return fallback.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    } catch (e) {
      console.error('Error building programPembebananOptions:', e);
      return [];
    }
  }, [programs, programsOptions, budgetItems]);

  // Kegiatan options - filtered by selected program
  const kegiatanOptions = useMemo<SelectOption[]>(() => {
    try {
      if (!filters.program_pembebanan || typeof filters.program_pembebanan !== 'string') return [];
      
      // Always try reference data first (most reliable) with "code - name" format
      if (kegiatans && Array.isArray(kegiatans) && kegiatans.length > 0) {
        const relatedProgram = programs?.find(p => {
          try {
            return p && p.code && String(p.code) === String(filters.program_pembebanan);
          } catch {
            return false;
          }
        });
        if (relatedProgram) {
          const result: SelectOption[] = [];
          for (const k of kegiatans) {
            try {
              if (!k || typeof k !== 'object' || !k.is_active || k.program_id !== relatedProgram.id) continue;
              const code = String(k.code || '').trim();
              const label = `${code} - ${String(k.name || '').trim()}`;
              if (code && label.trim()) {
                result.push({ value: code, label: label.trim() });
              }
            } catch (e) {
              console.error('Error processing kegiatan:', k, e);
            }
          }
          console.log('[Filter] Kegiatan options from reference:', result.length);
          if (result.length > 0) return result;
        }
      }
      
      // Fall back to provided options from hook
      if (kegiatansOptions && Array.isArray(kegiatansOptions) && kegiatansOptions.length > 0) {
        console.log('[Filter] Using provided kegiatansOptions:', kegiatansOptions.length);
        return kegiatansOptions;
      }

      // FALLBACK: Derive from budgetItems with "code - name" format
      console.log('[Filter] Using fallback: deriving kegiatan options from budgetItems');
      const fallback: SelectOption[] = [];
      const seen = new Set<string>();
      const relevantItems = budgetItems.filter(item => String(item.program_pembebanan || '').trim() === String(filters.program_pembebanan).trim());
      const kegiatanCodes = new Set(relevantItems.map(item => String(item.kegiatan || '').trim()).filter(Boolean));
      
      for (const code of kegiatanCodes) {
        try {
          const kegRef = kegiatans?.find(k => String(k.code || '').trim() === code);
          const label = kegRef ? `${code} - ${String(kegRef.name || '').trim()}` : code;
          if (code && !seen.has(code)) {
            seen.add(code);
            fallback.push({ value: code, label });
          }
        } catch {}
      }
      return fallback.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    } catch (e) {
      console.error('Error building kegiatanOptions:', e);
      return [];
    }
  }, [filters.program_pembebanan, kegiatans, programs, budgetItems, kegiatansOptions]);

  // Rincian Output options - filtered by selected kegiatan
  const rincianOutputOptions = useMemo<SelectOption[]>(() => {
    try {
      if (!filters.kegiatan || typeof filters.kegiatan !== 'string') return [];
      
      // Always try reference data first (most reliable) with "code - name" format
      if (rincianOutputs && Array.isArray(rincianOutputs) && rincianOutputs.length > 0) {
        const relatedKegiatan = kegiatans?.find(k => {
          try {
            return k && k.code && String(k.code) === String(filters.kegiatan);
          } catch {
            return false;
          }
        });
        if (relatedKegiatan) {
          const result: SelectOption[] = [];
          for (const r of rincianOutputs) {
            try {
              if (!r || typeof r !== 'object' || !r.is_active || r.kegiatan_id !== relatedKegiatan.id) continue;
              const code = String(r.code || '').trim();
              const label = `${code} - ${String(r.name || '').trim()}`;
              if (code && label.trim()) {
                result.push({ value: code, label: label.trim() });
              }
            } catch (e) {
              console.error('Error processing rincian output:', r, e);
            }
          }
          console.log('[Filter] Rincian Output options from reference:', result.length);
          if (result.length > 0) return result;
        }
      }
      
      // Fall back to provided options from hook
      if (rincianOutputsOptions && Array.isArray(rincianOutputsOptions) && rincianOutputsOptions.length > 0) {
        console.log('[Filter] Using provided rincianOutputsOptions:', rincianOutputsOptions.length);
        return rincianOutputsOptions;
      }

      // FALLBACK: Derive from budgetItems with "code - name" format
      console.log('[Filter] Using fallback: deriving rincian output options from budgetItems');
      const fallback: SelectOption[] = [];
      const seen = new Set<string>();
      const relevantItems = budgetItems.filter(item => String(item.kegiatan || '').trim() === String(filters.kegiatan).trim());
      const rincianCodes = new Set(relevantItems.map(item => String(item.rincian_output || '').trim()).filter(Boolean));
      
      for (const code of rincianCodes) {
        try {
          const rincRef = rincianOutputs?.find(r => String(r.code || '').trim() === code);
          const label = rincRef ? `${code} - ${String(rincRef.name || '').trim()}` : code;
          if (code && !seen.has(code)) {
            seen.add(code);
            fallback.push({ value: code, label });
          }
        } catch {}
      }
      return fallback.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    } catch (e) {
      console.error('Error building rincianOutputOptions:', e);
      return [];
    }
  }, [filters.kegiatan, rincianOutputs, kegiatans, budgetItems, rincianOutputsOptions]);

  // Komponen Output options - filtered by selected rincian output
  const komponenOutputOptions = useMemo<SelectOption[]>(() => {
    try {
      if (!filters.rincian_output || typeof filters.rincian_output !== 'string') return [];
      
      // Always try reference data first (most reliable) with "code - name" format
      if (komponenOutputs && Array.isArray(komponenOutputs) && komponenOutputs.length > 0) {
        const relatedRincian = rincianOutputs?.find(r => {
          try {
            return r && r.code && String(r.code) === String(filters.rincian_output);
          } catch {
            return false;
          }
        });
        if (relatedRincian) {
          const result: SelectOption[] = [];
          for (const k of komponenOutputs) {
            try {
              if (!k || typeof k !== 'object' || !k.is_active || k.rincian_output_id !== relatedRincian.id) continue;
              const code = String(k.code || '').trim();
              const label = `${code} - ${String(k.name || '').trim()}`;
              if (code && label.trim()) {
                result.push({ value: code, label: label.trim() });
              }
            } catch (e) {
              console.error('Error processing komponen output:', k, e);
            }
          }
          console.log('[Filter] Komponen Output options from reference:', result.length);
          if (result.length > 0) return result;
        }
      }
      
      // Fall back to provided options from hook
      if (komponenOutputsOptions && Array.isArray(komponenOutputsOptions) && komponenOutputsOptions.length > 0) {
        console.log('[Filter] Using provided komponenOutputsOptions:', komponenOutputsOptions.length);
        return komponenOutputsOptions;
      }

      // FALLBACK: Derive from budgetItems with "code - name" format
      console.log('[Filter] Using fallback: deriving komponen output options from budgetItems');
      const fallback: SelectOption[] = [];
      const seen = new Set<string>();
      const relevantItems = budgetItems.filter(item => String(item.rincian_output || '').trim() === String(filters.rincian_output).trim());
      const komponenCodes = new Set(relevantItems.map(item => String(item.komponen_output || '').trim()).filter(Boolean));
      
      for (const code of komponenCodes) {
        try {
          const kompRef = komponenOutputs?.find(k => String(k.code || '').trim() === code);
          const label = kompRef ? `${code} - ${String(kompRef.name || '').trim()}` : code;
          if (code && !seen.has(code)) {
            seen.add(code);
            fallback.push({ value: code, label });
          }
        } catch {}
      }
      return fallback.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    } catch (e) {
      console.error('Error building komponenOutputOptions:', e);
      return [];
    }
  }, [filters.rincian_output, komponenOutputs, rincianOutputs, budgetItems, komponenOutputsOptions]);

  // Sub Komponen options - filtered by selected komponen output
  const subKomponenOptions = useMemo<SelectOption[]>(() => {
    try {
      if (!filters.komponen_output || typeof filters.komponen_output !== 'string') return [];
      
      // Always try reference data first (most reliable) with "code - name" format
      if (subKomponen && Array.isArray(subKomponen) && subKomponen.length > 0) {
        const relatedKomponen = komponenOutputs?.find(k => {
          try {
            return k && k.code && String(k.code) === String(filters.komponen_output);
          } catch {
            return false;
          }
        });
        if (relatedKomponen) {
          const result: SelectOption[] = [];
          for (const s of subKomponen) {
            try {
              if (!s || typeof s !== 'object' || !s.is_active || s.komponen_output_id !== relatedKomponen.id) continue;
              const code = String(s.code || '').trim();
              const label = `${code} - ${String(s.name || '').trim()}`;
              if (code && label.trim()) {
                result.push({ value: code, label: label.trim() });
              }
            } catch (e) {
              console.error('Error processing sub komponen:', s, e);
            }
          }
          console.log('[Filter] Sub Komponen options from reference:', result.length);
          if (result.length > 0) return result;
        }
      }
      
      // Fall back to provided options from hook
      if (providedSubKomponenOptions && Array.isArray(providedSubKomponenOptions) && providedSubKomponenOptions.length > 0) {
        console.log('[Filter] Using provided subKomponenOptions:', providedSubKomponenOptions.length);
        return providedSubKomponenOptions;
      }

      // FALLBACK: Derive from budgetItems with "code - name" format
      console.log('[Filter] Using fallback: deriving sub komponen options from budgetItems');
      const fallback: SelectOption[] = [];
      const seen = new Set<string>();
      const relevantItems = budgetItems.filter(item => String(item.komponen_output || '').trim() === String(filters.komponen_output).trim());
      const subKomponenCodes = new Set(relevantItems.map(item => String(item.sub_komponen || '').trim()).filter(Boolean));
      
      for (const code of subKomponenCodes) {
        try {
          const skRef = subKomponen?.find(s => String(s.code || '').trim() === code);
          const label = skRef ? `${code} - ${String(skRef.name || '').trim()}` : code;
          if (code && !seen.has(code)) {
            seen.add(code);
            fallback.push({ value: code, label });
          }
        } catch {}
      }
      return fallback.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    } catch (e) {
      console.error('Error building subKomponenOptions:', e);
      return [];
    }
  }, [filters.komponen_output, subKomponen, komponenOutputs, budgetItems, providedSubKomponenOptions]);

  // Akun options - filtered based on selected parent filters
  const akunOptions = useMemo<SelectOption[]>(() => {
    try {
      // Use provided options first if available
      if (akunsOptions && Array.isArray(akunsOptions) && akunsOptions.length > 0) {
        console.log('[Filter] Using provided akunsOptions:', akunsOptions.length);
        return akunsOptions;
      }
      
      // First, filter budgetItems based on already-selected filters
      // to get only relevant akuns
      const relevantItems = budgetItems.filter(item => {
        try {
          if (filters.program_pembebanan && String(item.program_pembebanan || '').trim() !== String(filters.program_pembebanan).trim()) {
            return false;
          }
          if (filters.kegiatan && String(item.kegiatan || '').trim() !== String(filters.kegiatan).trim()) {
            return false;
          }
          if (filters.rincian_output && String(item.rincian_output || '').trim() !== String(filters.rincian_output).trim()) {
            return false;
          }
          if (filters.komponen_output && String(item.komponen_output || '').trim() !== String(filters.komponen_output).trim()) {
            return false;
          }
          if (filters.sub_komponen && String(item.sub_komponen || '').trim() !== String(filters.sub_komponen).trim()) {
            return false;
          }
          return true;
        } catch {
          return true; // Include item if there's an error to avoid filtering it out
        }
      });

      // Try reference data first with "code - name" format
      if (akuns && Array.isArray(akuns) && akuns.length > 0) {
        // If we have relevant items, filter akuns to only those used; otherwise show all active akuns
        const relevantAkunValues = relevantItems.length > 0
          ? new Set(relevantItems.map(item => String(item.akun || '').trim()).filter(Boolean))
          : null;
        
        const result: SelectOption[] = [];
        for (const a of akuns) {
          try {
            if (!a || typeof a !== 'object' || !a.is_active) continue;
            const code = String(a.code || '').trim();
            
            // If we have relevant items, only include matching akuns; otherwise include all active
            if (relevantAkunValues && !relevantAkunValues.has(code)) continue;
            
            const label = `${code} - ${String(a.name || '').trim()}`;
            if (code && label.trim()) {
              result.push({ value: code, label: label.trim() });
            }
          } catch (e) {
            console.error('Error processing akun:', a, e);
          }
        }
        console.log('[Filter] Akun options from reference:', result.length);
        if (result.length > 0) return result;
      }      
      // Fall back to provided options from hook
      if (akunsOptions && Array.isArray(akunsOptions) && akunsOptions.length > 0) {
        console.log('[Filter] Using provided akunsOptions:', akunsOptions.length);
        return akunsOptions;
      }
      // FALLBACK: Derive from filtered budgetItems with "code - name" format
      console.log('[Filter] Using fallback: deriving akun options from budgetItems');
      const fallback: SelectOption[] = [];
      const seen = new Set<string>();
      
      // Get unique akun codes from relevant items
      const akunCodes = new Set(
        relevantItems.map(item => String(item.akun || '').trim()).filter(Boolean)
      );
      
      // Try to enhance fallback with any available reference data for names
      for (const code of akunCodes) {
        try {
          const akunRef = akuns?.find(a => String(a.code || '').trim() === code);
          const label = akunRef ? `${code} - ${String(akunRef.name || '').trim()}` : code;
          if (code && !seen.has(code)) {
            seen.add(code);
            fallback.push({ value: code, label });
          }
        } catch {}
      }
      
      return fallback.sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
    } catch (e) {
      console.error('Error building akunOptions:', e);
      return [];
    }
  }, [akunsOptions, akuns, budgetItems, filters.program_pembebanan, filters.kegiatan, filters.rincian_output, filters.komponen_output, filters.sub_komponen]);

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
