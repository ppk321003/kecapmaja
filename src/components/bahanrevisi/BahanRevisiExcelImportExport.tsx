/**
 * Component untuk Import/Export Bahan Revisi Anggaran dari/ke Excel
 * Dengan template download dan validation feedback
 */

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { BudgetItem, RPDItem } from '@/types/bahanrevisi';
import { FileSpreadsheet, Upload, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  createBahanRevisiTemplate,
  exportBahanRevisiExcel,
} from '@/utils/bahanrevisi-excel-utils';
import { useImportBahanRevisi } from '@/hooks/use-import-bahanrevisi';

interface BahanRevisiExcelImportExportProps {
  sheetId: string | null;
  onImportSuccess: (budgetItems: Partial<BudgetItem>[], rpdItems: Partial<RPDItem>[]) => void;
  budgetItems?: Partial<BudgetItem>[];
  komponenOutput?: string;
  subKomponen?: string;
  akun?: string;
  smallText?: boolean;
}

const BahanRevisiExcelImportExport: React.FC<BahanRevisiExcelImportExportProps> = ({
  sheetId,
  onImportSuccess,
  budgetItems = [],
  komponenOutput,
  subKomponen,
  akun,
  smallText = false,
}) => {
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isImporting, validationErrors, handleImportFile, clearErrors } =
    useImportBahanRevisi({
      sheetId,
      onImportSuccess: (budgetItems, rpdItems) => {
        setIsImportDialogOpen(false);
        clearErrors();
        onImportSuccess(budgetItems, rpdItems);
      },
      komponenOutput,
      subKomponen,
      akun,
    });

  const buttonClass = smallText ? 'text-xs px-2 py-1 h-8' : '';

  const downloadTemplate = () => {
    try {
      const wb = createBahanRevisiTemplate(komponenOutput, subKomponen, akun);
      XLSX.writeFile(wb, 'Bahanrevisi_Template.xlsx');

      toast({
        title: 'Template berhasil diunduh',
        description: 'Silakan isi template dengan data Anda dan simpan dengan format .xlsx',
      });
    } catch (error) {
      toast({
        title: 'Gagal mendownload template',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleExport = () => {
    try {
      if (budgetItems.length === 0) {
        toast({
          title: 'Data kosong',
          description: 'Tidak ada data untuk diekspor',
          variant: 'destructive',
        });
        return;
      }

      exportBahanRevisiExcel(
        budgetItems,
        `Bahanrevisi_${komponenOutput || 'All'}`
      );

      toast({
        title: 'Ekspor berhasil',
        description: `Berhasil mengekspor ${budgetItems.length} item`,
      });
    } catch (error) {
      toast({
        title: 'Gagal mengekspor',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleImportFile(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className={`flex items-center ${buttonClass}`}
          size={smallText ? 'sm' : undefined}
          title="Download template Excel untuk diisi"
        >
          <FileSpreadsheet className={`${smallText ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
          <span>Download Template</span>
        </Button>

        <Button
          variant="outline"
          className={`flex items-center cursor-pointer ${buttonClass}`}
          size={smallText ? 'sm' : undefined}
          onClick={triggerFileInput}
          disabled={isImporting || !sheetId}
          title="Upload file Excel untuk import data"
        >
          <Upload className={`${smallText ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
          <span>Import Excel</span>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isImporting || !sheetId}
        />

        <Button
          variant="outline"
          className={`flex items-center ${buttonClass}`}
          size={smallText ? 'sm' : undefined}
          onClick={handleExport}
          disabled={budgetItems.length === 0}
          title="Export data current ke Excel"
        >
          <FileSpreadsheet className={`${smallText ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
          <span>Export</span>
        </Button>
      </div>

      {!sheetId && (
        <Alert className="mt-2 bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">
            Sheet ID belum dikonfigurasi. Hubungi administrator untuk setup.
          </AlertDescription>
        </Alert>
      )}

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Data dari Excel</DialogTitle>
            <DialogDescription>
              Upload file Excel yang sudah Anda isi menggunakan template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {validationErrors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-red-700">Validation Errors:</h4>
                {validationErrors.map((error, idx) => (
                  <Alert key={idx} variant="destructive" className="text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">{error.message}</div>
                      {error.details && (
                        <ul className="mt-2 ml-4 list-disc space-y-1">
                          {error.details.slice(0, 3).map((detail, i) => (
                            <li key={i} className="text-xs">
                              {detail}
                            </li>
                          ))}
                          {error.details.length > 3 && (
                            <li className="text-xs italic">
                              ... dan {error.details.length - 3} lainnya
                            </li>
                          )}
                        </ul>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-900 font-medium mb-2">Panduan Import:</p>
              <ul className="text-blue-800 space-y-1 text-xs list-disc ml-4">
                <li>Gunakan template yang sudah diunduh</li>
                <li>Isi semua kolom yang diperlukan (uraian, volume, harga, dll)</li>
                <li>Isi kolom RPD bulanan (Januari - Desember) dengan nilai pencairan</li>
                <li>Total RPD tidak boleh melebihi "Harga Satuan Menjadi"</li>
                <li>Jangan ubah header atau urutan kolom</li>
                <li>Simpan file dalam format Excel (.xlsx)</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={triggerFileInput}
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? 'Sedang diproses...' : 'Pilih File Excel'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsImportDialogOpen(false);
                  clearErrors();
                }}
                disabled={isImporting}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BahanRevisiExcelImportExport;
