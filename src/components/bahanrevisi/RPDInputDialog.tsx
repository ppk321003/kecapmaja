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
  onSave?: (data: RPDInputData) => Promise<void>;
}

const months: RPDMonth[] = [
  { name: 'Januari', key: 'jan', label: 'Jan' },
  { name: 'Februari', key: 'feb', label: 'Feb' },
  { name: 'Maret', key: 'mar', label: 'Mar' },
  { name: 'April', key: 'apr', label: 'Apr' },
  { name: 'Mei', key: 'mei', label: 'Mei' },
  { name: 'Juni', key: 'jun', label: 'Jun' },
  { name: 'Juli', key: 'jul', label: 'Jul' },
  { name: 'Agustus', key: 'aug', label: 'Agu' },
  { name: 'September', key: 'sep', label: 'Sep' },
  { name: 'Oktober', key: 'oct', label: 'Okt' },
  { name: 'November', key: 'nov', label: 'Nov' },
  { name: 'Desember', key: 'dec', label: 'Des' },
];

const RPDInputDialog: React.FC<RPDInputDialogProps> = ({
  open,
  onOpenChange,
  itemId,
  itemUraian,
  totalPagu,
  initialData = {},
  readOnly = false,
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
      setPaguTidakDapatDitarik(initialData.paguTidakDapatDitarik || 0);
    }
  }, [open, initialData]);

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
    const numValue = parseInt(value.replace(/\D/g, ''), 10) || 0;
    setValues(prev => ({ ...prev, [key]: numValue }));
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rekam Rencana Penarikan Dana (RPD)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <p className="text-sm text-slate-600"><strong>Item:</strong> {itemUraian}</p>
            <p className="text-sm text-slate-600"><strong>Pagu:</strong> {formatNumber(totalPagu)}</p>
          </div>

          {/* Warning jika tidak balance */}
          {!calculations.isBalanced && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Rencana penarikan dana belum seimbang. Sisa: {formatNumber(calculations.sisa)} 
                (Sisa harus 0 sebelum data disimpan)
              </AlertDescription>
            </Alert>
          )}

          {/* Monthly Input Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {months.map(month => (
              <div key={month.key} className="space-y-2 border rounded p-3 bg-white">
                <div>
                  <label className="text-xs font-semibold text-slate-700">{month.name}</label>
                </div>
                
                <div>
                  <label className="text-xs text-slate-600">% Pagu:</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={calculations.percentages[month.key] || 0}
                    onChange={(e) => handlePercentageChange(month.key, e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-sm text-right"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600">Nilai:</label>
                  <Input
                    type="number"
                    min="0"
                    value={values[month.key as keyof typeof values] || 0}
                    onChange={(e) => handleValueChange(month.key, e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-sm text-right"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {formatNumber(values[month.key as keyof typeof values] || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagu Tidak Dapat Ditarik */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Pagu yang Tidak Dapat Ditarik</label>
              <Input
                type="number"
                min="0"
                value={paguTidakDapatDitarik}
                onChange={(e) => setPaguTidakDapatDitarik(parseInt(e.target.value) || 0)}
                disabled={readOnly}
                className="h-10 text-sm"
                placeholder="0"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 border-t pt-4">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">Total Penarikan</p>
              <p className="text-lg font-bold text-blue-900">{formatNumber(Number(calculations.total))}</p>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <p className="text-xs text-orange-600 font-semibold">Sisa</p>
              <p className={`text-lg font-bold ${calculations.sisa === 0 ? 'text-green-900' : 'text-red-900'}`}>
                {formatNumber(Number(calculations.sisa))}
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <p className="text-xs text-slate-600 font-semibold">Total Pagu</p>
              <p className="text-lg font-bold text-slate-900">{formatNumber(totalPagu)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={!calculations.isBalanced || isSaving}
              className="bg-blue-600 hover:bg-blue-700"
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
