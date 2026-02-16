/**
 * Komponen Modal Dialog untuk Input Rencana Penarikan Dana (RPD)
 * Menampilkan input per bulan dengan validasi otomatis
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatNumber } from '@/utils/bahanrevisi-calculations';

interface RPDMonth {
  name: string;
  key: string;
  label: string;
}

interface RPDInputData {
  jan?: number;
  feb?: number;
  mar?: number;
  apr?: number;
  mei?: number;
  jun?: number;
  jul?: number;
  aug?: number;
  sep?: number;
  oct?: number;
  nov?: number;
  dec?: number;
  paguTidakDapatDitarik?: number;
}

interface RPDInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemUraian: string;
  totalPagu: number;
  initialData?: RPDInputData;
  readOnly?: boolean;
  blokir?: number;
  onSave?: (data: RPDInputData) => Promise<void>;
}

const months: RPDMonth[] = [
  { name: 'Januari', key: 'jan', label: 'Januari' },
  { name: 'Februari', key: 'feb', label: 'Februari' },
  { name: 'Maret', key: 'mar', label: 'Maret' },
  { name: 'April', key: 'apr', label: 'April' },
  { name: 'Mei', key: 'mei', label: 'Mei' },
  { name: 'Juni', key: 'jun', label: 'Juni' },
  { name: 'Juli', key: 'jul', label: 'Juli' },
  { name: 'Agustus', key: 'aug', label: 'Agustus' },
  { name: 'September', key: 'sep', label: 'September' },
  { name: 'Oktober', key: 'oct', label: 'Oktober' },
  { name: 'November', key: 'nov', label: 'November' },
  { name: 'Desember', key: 'dec', label: 'Desember' },
];

const RPDInputDialog: React.FC<RPDInputDialogProps> = ({
  open,
  onOpenChange,
  itemId,
  itemUraian,
  totalPagu,
  initialData = {},
  readOnly = false,
  blokir = 0,
  onSave,
}) => {
  const [percentages, setPercentages] = useState<{[key: string]: number}>({});
  const [values, setValues] = useState<{[key: string]: number}>({});
  const [paguTidakDapatDitarik, setPaguTidakDapatDitarik] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize data
  useEffect(() => {
    if (open) {
      setPercentages({
        jan: 0, feb: 0, mar: 0, apr: 0, mei: 0, jun: 0,
        jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0
      });
      setValues({
        jan: initialData.jan || 0, feb: initialData.feb || 0, mar: initialData.mar || 0,
        apr: initialData.apr || 0, mei: initialData.mei || 0, jun: initialData.jun || 0,
        jul: initialData.jul || 0, aug: initialData.aug || 0, sep: initialData.sep || 0,
        oct: initialData.oct || 0, nov: initialData.nov || 0, dec: initialData.dec || 0
      });
      setPaguTidakDapatDitarik(blokir || 0);
    }
  }, [open, initialData, blokir]);

  // Calculate total, percentages, and sisa
  const calculations = useMemo((): {
    total: number;
    sisa: number;
    percentages: {[key: string]: number};
    isBalanced: boolean;
  } => {
    try {
      const monthKeys: (keyof typeof values)[] = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      
      let total: number = 0;
      for (const key of monthKeys) {
        const val = Number(values[key]) || 0;
        total += val;
      }

      const paguNotAvailable: number = Number(paguTidakDapatDitarik) || 0;
      const sisa: number = Number(totalPagu) - total - paguNotAvailable;
      
      // Calculate percentages
      const newPercentages: {[key: string]: number} = {};
      monthKeys.forEach(key => {
        const val = Number(values[key]) || 0;
        newPercentages[key] = Number(totalPagu) > 0 ? Math.round((val / Number(totalPagu)) * 100) : 0;
      });

      return {
        total,
        sisa,
        percentages: newPercentages,
        isBalanced: sisa === 0,
      };
    } catch (e) {
      console.error('[RPDInputDialog] Error calculating:', e);
      const paguNotAvailable: number = Number(paguTidakDapatDitarik) || 0;
      return {
        total: 0,
        sisa: Number(totalPagu) - paguNotAvailable,
        percentages: {},
        isBalanced: false,
      };
    }
  }, [values, paguTidakDapatDitarik, totalPagu]);

  const handleValueChange = (key: string, value: string) => {
    // Remove all non-digit characters to get clean numeric value
    const cleanValue = value.replace(/[^\d]/g, '');
    const numValue = parseInt(cleanValue, 10) || 0;
    setValues(prev => ({ ...prev, [key]: numValue }));
  };

  const getDisplayValue = (value: number): string => {
    // For display, show formatted number with separators
    return formatNumber(value);
  };

  const handlePercentageChange = (key: string, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    const newValue = (numValue / 100) * totalPagu;
    setValues(prev => ({ ...prev, [key]: newValue }));
  };

  const handleSave = async () => {
    if (!calculations.isBalanced) {
      toast({
        title: 'Validasi Gagal',
        description: 'Rencana penarikan dana belum seimbang. Sisa harus 0 sebelum data disimpan.',
        variant: 'destructive'
      });
      return;
    }

    if (readOnly) {
      toast({
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk mengubah data RPD.',
        variant: 'destructive'
      });
      return;
    }

    const data: RPDInputData = {
      jan: values.jan,
      feb: values.feb,
      mar: values.mar,
      apr: values.apr,
      mei: values.mei,
      jun: values.jun,
      jul: values.jul,
      aug: values.aug,
      sep: values.sep,
      oct: values.oct,
      nov: values.nov,
      dec: values.dec,
      paguTidakDapatDitarik,
    };

    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(data);
      }
      toast({
        title: 'Berhasil',
        description: 'Data RPD berhasil disimpan.'
      });
      onOpenChange(false);
    } catch (error) {
      console.error('[RPDInputDialog] Save error:', error);
      toast({
        title: 'Error',
        description: 'Gagal menyimpan data RPD. Silakan coba lagi.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Rencana Penarikan Dana (RPD)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Item Info */}
          <div className="bg-slate-50 p-2 rounded border border-slate-200">
            <p className="text-xs text-slate-600"><strong>Item:</strong> {itemUraian}</p>
            <p className="text-xs text-slate-600"><strong>Pagu:</strong> {formatNumber(totalPagu)}</p>
          </div>

          {/* Warning jika tidak balance */}
          {!calculations.isBalanced && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                Sisa: {formatNumber(calculations.sisa)} (harus 0 sebelum disimpan)
              </AlertDescription>
            </Alert>
          )}

          {/* Monthly Input Table - POK Style 2 Column Layout */}
          <div className="border rounded bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-xs">Bulan</th>
                  <th className="px-2 py-2 text-center font-semibold text-xs w-16">%</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs w-28">Nilai</th>
                  <th className="px-2 py-2 text-left font-semibold text-xs">Bulan</th>
                  <th className="px-2 py-2 text-center font-semibold text-xs w-16">%</th>
                  <th className="px-2 py-2 text-right font-semibold text-xs w-28">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const leftMonth = months[i];
                  const rightMonth = months[i + 6];
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      {/* Left Column */}
                      <td className="px-2 py-2 text-xs font-medium text-slate-700 whitespace-nowrap">{leftMonth.label}</td>
                      <td className="px-2 py-2 w-16">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={calculations.percentages[leftMonth.key] || 0}
                          onChange={(e) => handlePercentageChange(leftMonth.key, e.target.value)}
                          disabled={readOnly}
                          className="h-7 text-xs text-center px-1 w-full"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2 w-28">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={getDisplayValue(values[leftMonth.key as keyof typeof values] || 0)}
                          onChange={(e) => handleValueChange(leftMonth.key, e.target.value)}
                          disabled={readOnly}
                          className="h-7 text-xs text-right px-1 w-full"
                          placeholder="0"
                        />
                      </td>
                      {/* Right Column */}
                      <td className="px-2 py-2 text-xs font-medium text-slate-700 whitespace-nowrap">{rightMonth.label}</td>
                      <td className="px-2 py-2 w-16">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={calculations.percentages[rightMonth.key] || 0}
                          onChange={(e) => handlePercentageChange(rightMonth.key, e.target.value)}
                          disabled={readOnly}
                          className="h-7 text-xs text-center px-1 w-full"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2 w-28">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={getDisplayValue(values[rightMonth.key as keyof typeof values] || 0)}
                          onChange={(e) => handleValueChange(rightMonth.key, e.target.value)}
                          disabled={readOnly}
                          className="h-7 text-xs text-right px-1 w-full"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 border-t pt-3">
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Pagu Tdk Dapat Ditarik</p>
              <p className="text-sm font-bold text-slate-900">{formatNumber(paguTidakDapatDitarik)}</p>
            </div>
            <div className="bg-orange-50 p-2 rounded border border-orange-200">
              <p className="text-xs text-orange-600 font-semibold">Sisa</p>
              <p className={`text-sm font-bold ${calculations.sisa === 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatNumber(Number(calculations.sisa))}
              </p>
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">Total Penarikan</p>
              <p className="text-sm font-bold text-blue-900">{formatNumber(Number(calculations.total))}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-sm"
          >
            Tutup
          </Button>
          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={!calculations.isBalanced || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RPDInputDialog;
