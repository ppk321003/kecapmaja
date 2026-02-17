/**
 * Dialog untuk menambah item Budget Baru
 * Compact, sederhana dan profesional dengan dropdown cascading
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import SearchableSelect, { SelectOption } from './SearchableSelect';
import {
  BudgetItem,
  Program,
  Kegiatan,
  RincianOutput,
  KomponenOutput,
  SubKomponen,
  Akun,
} from '@/types/bahanrevisi';
import { formatCurrency, calculateJumlahMenjadi } from '@/utils/bahanrevisi-calculations';

interface AddBudgetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  onSubmit?: (item: Omit<BudgetItem, 'id'>) => void;
  isLoading?: boolean;
}

interface FormData {
  program_pembebanan: string;
  kegiatan: string;
  rincian_output: string;
  komponen_output: string;
  sub_komponen: string;
  akun: string;
  uraian: string;
  volume_menjadi: number;
  satuan_menjadi: string;
  harga_satuan_menjadi: number;
  jumlah_menjadi: number;
}

const AddBudgetItemDialog: React.FC<AddBudgetItemDialogProps> = ({
  open,
  onOpenChange,
  programs = [],
  kegiatans = [],
  rincianOutputs = [],
  komponenOutputs = [],
  subKomponen = [],
  akuns = [],
  programsOptions = [],
  kegiatansOptions = [],
  rincianOutputsOptions = [],
  komponenOutputsOptions = [],
  subKomponenOptions = [],
  akunsOptions = [],
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<FormData>({
    program_pembebanan: '',
    kegiatan: '',
    rincian_output: '',
    komponen_output: '',
    sub_komponen: '',
    akun: '',
    uraian: '',
    volume_menjadi: 1,
    satuan_menjadi: '',
    harga_satuan_menjadi: 0,
    jumlah_menjadi: 0,
  });

  // Filter kegiatans based on program_pembebanan
  const filteredKegiatans = useMemo(() => {
    if (!formData.program_pembebanan) return [];
    return kegiatansOptions.filter(
      (opt) =>
        opt.label
          ?.includes(`- ${formData.program_pembebanan}`) ||
        opt.label?.includes(formData.program_pembebanan)
    );
  }, [formData.program_pembebanan, kegiatansOptions]);

  // Filter rincian outputs based on kegiatan
  const filteredRincianOutputs = useMemo(() => {
    if (!formData.kegiatan) return [];
    return rincianOutputsOptions.filter(
      (opt) =>
        opt.label?.includes(`- ${formData.kegiatan}`) ||
        opt.label?.includes(formData.kegiatan)
    );
  }, [formData.kegiatan, rincianOutputsOptions]);

  // Filter komponen outputs based on rincian_output
  const filteredKomponenOutputs = useMemo(() => {
    if (!formData.rincian_output) return [];
    return komponenOutputsOptions.filter(
      (opt) =>
        opt.label?.includes(`- ${formData.rincian_output}`) ||
        opt.label?.includes(formData.rincian_output)
    );
  }, [formData.rincian_output, komponenOutputsOptions]);

  // Filter sub komponen based on komponen_output
  const filteredSubKomponen = useMemo(() => {
    if (!formData.komponen_output) return [];
    return subKomponenOptions.filter(
      (opt) =>
        opt.label?.includes(`- ${formData.komponen_output}`) ||
        opt.label?.includes(formData.komponen_output)
    );
  }, [formData.komponen_output, subKomponenOptions]);

  // Auto-calculate jumlah_menjadi
  const calculateTotal = (volume: number, harga: number) => {
    return calculateJumlahMenjadi(volume, harga);
  };

  const handleVolumeChange = (value: number) => {
    const newData = {
      ...formData,
      volume_menjadi: value,
    };
    newData.jumlah_menjadi = calculateTotal(
      newData.volume_menjadi,
      newData.harga_satuan_menjadi
    );
    setFormData(newData);
  };

  const handleHargaChange = (value: number) => {
    const newData = {
      ...formData,
      harga_satuan_menjadi: value,
    };
    newData.jumlah_menjadi = calculateTotal(
      newData.volume_menjadi,
      newData.harga_satuan_menjadi
    );
    setFormData(newData);
  };

  const handleReset = () => {
    setFormData({
      program_pembebanan: '',
      kegiatan: '',
      rincian_output: '',
      komponen_output: '',
      sub_komponen: '',
      akun: '',
      uraian: '',
      volume_menjadi: 1,
      satuan_menjadi: '',
      harga_satuan_menjadi: 0,
      jumlah_menjadi: 0,
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.program_pembebanan) {
      toast({
        title: 'Validasi',
        description: 'Program Pembebanan harus dipilih',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.kegiatan) {
      toast({
        title: 'Validasi',
        description: 'Kegiatan harus dipilih',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.rincian_output) {
      toast({
        title: 'Validasi',
        description: 'Rincian Output harus dipilih',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.komponen_output) {
      toast({
        title: 'Validasi',
        description: 'Komponen Output harus dipilih',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.sub_komponen) {
      toast({
        title: 'Validasi',
        description: 'Sub Komponen harus dipilih',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.akun) {
      toast({
        title: 'Validasi',
        description: 'Akun harus dipilih',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.uraian.trim()) {
      toast({
        title: 'Validasi',
        description: 'Uraian detail harus diisi',
        variant: 'destructive',
      });
      return;
    }

    if (formData.volume_menjadi <= 0) {
      toast({
        title: 'Validasi',
        description: 'Volume Menjadi harus lebih dari 0',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.satuan_menjadi.trim()) {
      toast({
        title: 'Validasi',
        description: 'Satuan Menjadi harus diisi',
        variant: 'destructive',
      });
      return;
    }

    if (formData.harga_satuan_menjadi < 0) {
      toast({
        title: 'Validasi',
        description: 'Harga Satuan Menjadi tidak boleh negatif',
        variant: 'destructive',
      });
      return;
    }

    // Submit
    if (onSubmit) {
      const newItem: Omit<BudgetItem, 'id'> = {
        program_pembebanan: formData.program_pembebanan,
        kegiatan: formData.kegiatan,
        rincian_output: formData.rincian_output,
        komponen_output: formData.komponen_output,
        sub_komponen: formData.sub_komponen,
        akun: formData.akun,
        uraian: formData.uraian,
        volume_semula: 0,
        satuan_semula: '',
        harga_satuan_semula: 0,
        jumlah_semula: 0,
        volume_menjadi: formData.volume_menjadi,
        satuan_menjadi: formData.satuan_menjadi,
        harga_satuan_menjadi: formData.harga_satuan_menjadi,
        jumlah_menjadi: formData.jumlah_menjadi,
        selisih: formData.jumlah_menjadi,
        sisa_anggaran: 0,
        blokir: 0,
        status: 'new',
        submitted_by: '',
        submitted_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      onSubmit(newItem);
      handleReset();
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleReset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Item Budget Baru</DialogTitle>
          <DialogDescription>
            Isi form di bawah untuk menambahkan item budget baru. Jumlah Menjadi akan dihitung otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hiearchy Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Program Pembebanan */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Program Pembebanan *</label>
              <SearchableSelect
                value={formData.program_pembebanan}
                options={programsOptions}
                placeholder="Pilih Program..."
                disabled={isLoading}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    program_pembebanan: value || '',
                    kegiatan: '',
                    rincian_output: '',
                    komponen_output: '',
                    sub_komponen: '',
                  })
                }
              />
            </div>

            {/* Kegiatan */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Kegiatan *</label>
              <SearchableSelect
                value={formData.kegiatan}
                options={filteredKegiatans}
                placeholder="Pilih Kegiatan..."
                disabled={!formData.program_pembebanan || isLoading}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    kegiatan: value || '',
                    rincian_output: '',
                    komponen_output: '',
                    sub_komponen: '',
                  })
                }
              />
            </div>

            {/* Rincian Output */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Rincian Output *</label>
              <SearchableSelect
                value={formData.rincian_output}
                options={filteredRincianOutputs}
                placeholder="Pilih Rincian Output..."
                disabled={!formData.kegiatan || isLoading}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    rincian_output: value || '',
                    komponen_output: '',
                    sub_komponen: '',
                  })
                }
              />
            </div>

            {/* Komponen Output */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Komponen Output *</label>
              <SearchableSelect
                value={formData.komponen_output}
                options={filteredKomponenOutputs}
                placeholder="Pilih Komponen Output..."
                disabled={!formData.rincian_output || isLoading}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    komponen_output: value || '',
                    sub_komponen: '',
                  })
                }
              />
            </div>

            {/* Sub Komponen */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Sub Komponen *</label>
              <SearchableSelect
                value={formData.sub_komponen}
                options={filteredSubKomponen}
                placeholder="Pilih Sub Komponen..."
                disabled={!formData.komponen_output || isLoading}
                onValueChange={(value) =>
                  setFormData({ ...formData, sub_komponen: value || '' })
                }
              />
            </div>

            {/* Akun */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Akun *</label>
              <SearchableSelect
                value={formData.akun}
                options={akunsOptions}
                placeholder="Pilih Akun..."
                disabled={isLoading}
                onValueChange={(value) =>
                  setFormData({ ...formData, akun: value || '' })
                }
              />
            </div>
          </div>

          {/* Uraian Detail */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Uraian Detail *</label>
            <Input
              placeholder="Masukkan uraian detail item..."
              value={formData.uraian}
              onChange={(e) =>
                setFormData({ ...formData, uraian: e.target.value })
              }
              disabled={isLoading}
              className="h-8 text-xs"
            />
          </div>

          {/* Volume & Satuan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Volume Menjadi *</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.volume_menjadi}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value) || 0)}
                disabled={isLoading}
                className="h-8 text-xs"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Satuan Menjadi *</label>
              <Input
                placeholder="Satuan (e.g., OK, Set, Buah)"
                value={formData.satuan_menjadi}
                onChange={(e) =>
                  setFormData({ ...formData, satuan_menjadi: e.target.value })
                }
                disabled={isLoading}
                className="h-8 text-xs uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Harga Satuan Menjadi *</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.harga_satuan_menjadi}
                onChange={(e) => handleHargaChange(parseFloat(e.target.value) || 0)}
                disabled={isLoading}
                className="h-8 text-xs"
                min="0"
                step="100"
              />
            </div>
          </div>

          {/* Jumlah Menjadi (Read-only) */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Jumlah Menjadi (Otomatis)</label>
            <div className="h-8 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-700">
              {formatCurrency(formData.jumlah_menjadi)}
            </div>
          </div>

          {/* Info Box */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-700">
              Semua field yang ditandai (*) harus diisi. Jumlah Menjadi dihitung otomatis dari Volume × Harga Satuan.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            size="sm"
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Tambah Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddBudgetItemDialog;
