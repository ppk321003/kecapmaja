import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetItem, BahanRevisiFilters } from '@/types/bahanrevisi';

interface BudgetFilterProps {
  filters: BahanRevisiFilters;
  setFilters: (filters: BahanRevisiFilters) => void;
  budgetItems: BudgetItem[];
  loading?: boolean;
}

const BudgetFilter: React.FC<BudgetFilterProps> = ({
  filters,
  setFilters,
  budgetItems,
  loading = false,
}) => {
  // Get unique values dari budget items untuk dropdown
  const programPembebananOptions = useMemo(() => {
    return Array.from(new Set(budgetItems.map((item) => item.program_pembebanan)))
      .filter(Boolean)
      .sort();
  }, [budgetItems]);

  const kegiatanOptions = useMemo(() => {
    if (!filters.program_pembebanan) return [];
    return budgetItems
      .filter((item) => item.program_pembebanan === filters.program_pembebanan)
      .map((item) => item.kegiatan)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [filters.program_pembebanan, budgetItems]);

  const rincianOutputOptions = useMemo(() => {
    if (!filters.kegiatan) return [];
    return budgetItems
      .filter(
        (item) =>
          item.program_pembebanan === filters.program_pembebanan && item.kegiatan === filters.kegiatan
      )
      .map((item) => item.rincian_output)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [filters.program_pembebanan, filters.kegiatan, budgetItems]);

  const komponenOutputOptions = useMemo(() => {
    if (!filters.rincian_output) return [];
    return budgetItems
      .filter(
        (item) =>
          item.program_pembebanan === filters.program_pembebanan &&
          item.kegiatan === filters.kegiatan &&
          item.rincian_output === filters.rincian_output
      )
      .map((item) => item.komponen_output)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [filters.program_pembebanan, filters.kegiatan, filters.rincian_output, budgetItems]);

  const subKomponenOptions = useMemo(() => {
    if (!filters.komponen_output) return [];
    return budgetItems
      .filter(
        (item) =>
          item.program_pembebanan === filters.program_pembebanan &&
          item.kegiatan === filters.kegiatan &&
          item.rincian_output === filters.rincian_output &&
          item.komponen_output === filters.komponen_output
      )
      .map((item) => item.sub_komponen)
      .filter((v, i, a) => a.indexOf(v) === i && v)
      .sort();
  }, [
    filters.program_pembebanan,
    filters.kegiatan,
    filters.rincian_output,
    filters.komponen_output,
    budgetItems,
  ]);

  const akunOptions = useMemo(() => {
    return Array.from(new Set(budgetItems.map((item) => item.akun)))
      .filter(Boolean)
      .sort();
  }, [budgetItems]);

  const handleProgramChange = (value: string) => {
    setFilters({
      ...filters,
      program_pembebanan: value === 'all' ? undefined : value,
      kegiatan: undefined,
      rincian_output: undefined,
      komponen_output: undefined,
      sub_komponen: undefined,
    });
  };

  const handleKegiatanChange = (value: string) => {
    setFilters({
      ...filters,
      kegiatan: value === 'all' ? undefined : value,
      rincian_output: undefined,
      komponen_output: undefined,
      sub_komponen: undefined,
    });
  };

  const handleRincianOutputChange = (value: string) => {
    setFilters({
      ...filters,
      rincian_output: value === 'all' ? undefined : value,
      komponen_output: undefined,
      sub_komponen: undefined,
    });
  };

  const handleKomponenOutputChange = (value: string) => {
    setFilters({
      ...filters,
      komponen_output: value === 'all' ? undefined : value,
      sub_komponen: undefined,
    });
  };

  const handleSubKomponenChange = (value: string) => {
    setFilters({
      ...filters,
      sub_komponen: value === 'all' ? undefined : value,
    });
  };

  const handleAkunChange = (value: string) => {
    setFilters({
      ...filters,
      akun: value === 'all' ? undefined : value,
    });
  };

  return (
    <Card className="mb-3">
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-base">Pilih Program dan Anggaran</CardTitle>
      </CardHeader>
      <CardContent className="p-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Program Pembebanan</label>
          <Select value={filters.program_pembebanan || 'all'} onValueChange={handleProgramChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih Program Pembebanan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {programPembebananOptions.map((program) => (
                <SelectItem key={program} value={program}>
                  {program}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Kegiatan</label>
          <Select
            value={filters.kegiatan || 'all'}
            onValueChange={handleKegiatanChange}
            disabled={!filters.program_pembebanan}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih Kegiatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {kegiatanOptions.map((kegiatan) => (
                <SelectItem key={kegiatan} value={kegiatan}>
                  {kegiatan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Rincian Output</label>
          <Select
            value={filters.rincian_output || 'all'}
            onValueChange={handleRincianOutputChange}
            disabled={!filters.kegiatan}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih Rincian Output" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {rincianOutputOptions.map((rincian) => (
                <SelectItem key={rincian} value={rincian}>
                  {rincian}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Komponen Output</label>
          <Select
            value={filters.komponen_output || 'all'}
            onValueChange={handleKomponenOutputChange}
            disabled={!filters.rincian_output}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih Komponen Output" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {komponenOutputOptions.map((komponen) => (
                <SelectItem key={komponen} value={komponen}>
                  {komponen}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Sub Komponen</label>
          <Select
            value={filters.sub_komponen || 'all'}
            onValueChange={handleSubKomponenChange}
            disabled={!filters.komponen_output}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih Sub Komponen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {subKomponenOptions.map((subKomp) => (
                <SelectItem key={subKomp} value={subKomp}>
                  {subKomp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Akun</label>
          <Select value={filters.akun || 'all'} onValueChange={handleAkunChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih Akun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {akunOptions.map((akun) => (
                <SelectItem key={akun} value={akun}>
                  {akun}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetFilter;
