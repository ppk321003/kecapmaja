/**
 * Component untuk Upload CSV Bulanan dan Update Sisa Anggaran
 * Dengan validation, preview, dan matching summary
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { BudgetItem } from '@/types/bahanrevisi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, Loader, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useImportMonthlyCSV, MatchResult } from '@/hooks/use-import-monthly-csv';
import { ParsedMonthlyData } from '@/utils/bahanrevisi-monthly-csv-parser';

interface BahanRevisiUploadBulananProps {
  sheetId: string | null;
  budgetItems: BudgetItem[];
  onImportSuccess: (result: MatchResult, parsedData: ParsedMonthlyData) => void;
}

interface UploadState {
  step: 'idle' | 'preview' | 'processing' | 'result';
  parsedData: ParsedMonthlyData | null;
  matchResult: MatchResult | null;
  selectedMonth: string;
  selectedYear: string;
  originalFile: File | null;
}

const BahanRevisiUploadBulanan: React.FC<BahanRevisiUploadBulananProps> = ({
  sheetId,
  budgetItems,
  onImportSuccess,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    step: 'idle',
    parsedData: null,
    matchResult: null,
    selectedMonth: new Date().getMonth().toString().padStart(2, '0'),
    selectedYear: new Date().getFullYear().toString(),
    originalFile: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isImporting, importErrors, parseProgress, handleImportFile, clearErrors } =
    useImportMonthlyCSV({
      sheetId,
      budgetItems,
      onImportSuccess: (matchResult, parsedData) => {
        setUploadState((prev) => ({
          ...prev,
          step: 'result',
          matchResult,
          parsedData,
        }));
        onImportSuccess(matchResult, parsedData);
      },
    });

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const monthOptions = monthNames.map((name, idx) => ({
    value: String(idx + 1).padStart(2, '0'),
    label: name,
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(new Date().getFullYear() - 2 + i),
    label: String(new Date().getFullYear() - 2 + i),
  }));

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearErrors();
    setUploadState((prev) => ({
      ...prev,
      step: 'processing',
      originalFile: file,
    }));

    try {
      // Parse file
      const { parseMonthlyCSV } = await import('@/utils/bahanrevisi-monthly-csv-parser');
      const parsed = await parseMonthlyCSV(file);

      setUploadState((prev) => ({
        ...prev,
        step: 'preview',
        parsedData: parsed,
        selectedMonth: String(parsed.bulan).padStart(2, '0'),
        selectedYear: String(parsed.tahun),
        originalFile: file,
      }));

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal parse file',
      });
      setUploadState((prev) => ({
        ...prev,
        step: 'idle',
        originalFile: null,
      }));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleProcessUpload = async () => {
    const parsed = uploadState.parsedData;
    const file = uploadState.originalFile;
    if (!parsed || !file) return;

    console.log('[BahanRevisiUploadBulanan] handleProcessUpload started', {
      parsedItems: parsed.items.length,
      bulan: parsed.bulan,
      selectedMonth: uploadState.selectedMonth,
    });

    // Verify month/year
    if (parseInt(uploadState.selectedMonth) !== parsed.bulan) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Bulan tidak sesuai. File: ${parsed.bulan}, Dipilih: ${uploadState.selectedMonth}`,
      });
      return;
    }

    setUploadState((prev) => ({
      ...prev,
      step: 'processing',
    }));

    console.log('[BahanRevisiUploadBulanan] State changed to processing, calling handleImportFile...');

    // Call import function with ORIGINAL FILE (already tested and parsed)
    try {
      await handleImportFile(file);
      console.log('[BahanRevisiUploadBulanan] handleImportFile completed successfully');
    } catch (error) {
      console.error('[BahanRevisiUploadBulanan] handleImportFile failed:', error);
      setUploadState((prev) => ({
        ...prev,
        step: 'preview',
      }));
    }
  };

  const handleResetAndClose = () => {
    setUploadState({
      step: 'idle',
      parsedData: null,
      matchResult: null,
      selectedMonth: new Date().getMonth().toString().padStart(2, '0'),
      selectedYear: new Date().getFullYear().toString(),
      originalFile: null,
    });
    setIsDialogOpen(false);
    clearErrors();
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="text-xs"
      >
        <FileUp className="h-4 w-4 mr-2" />
        Upload Bulanan
      </Button>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleResetAndClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload CSV Sisa Anggaran Bulanan</DialogTitle>
            <DialogDescription>
              Upload file CSV untuk update sisa anggaran per bulan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* STEP 1: IDLE - File Upload */}
            {uploadState.step === 'idle' && (
              <>
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm">📋 Panduan Upload</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>✅ File berformat CSV (dari laporan ketersediaan dana)</p>
                    <p>✅ Sistem akan auto-detect periode dari CSV</p>
                    <p>✅ Matching dilakukan berdasarkan 7 field unik: Program, Kegiatan, Rincian Output, Komponen, Sub Komponen, Akun, Uraian</p>
                    <p>✅ Hanya item yang match yang akan di-update</p>
                  </CardContent>
                </Card>

                <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center space-y-3">
                  <FileUp className="h-12 w-12 mx-auto text-blue-400" />
                  <div>
                    <p className="font-semibold text-blue-900">Pilih file CSV</p>
                    <p className="text-sm text-blue-700">atau drag & drop di sini</p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={isImporting}
                  >
                    {isImporting ? 'Memproses...' : 'Browse File'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isImporting}
                  />
                </div>
              </>
            )}

            {/* STEP 2: PROCESSING - Loading */}
            {uploadState.step === 'processing' && (
              <div className="space-y-4">
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Loader className="h-5 w-5 animate-spin text-amber-600" />
                      <div>
                        <p className="font-semibold text-amber-900">Sedang Memproses...</p>
                        <p className="text-sm text-amber-700">{parseProgress}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 3: PREVIEW - Ready to Submit */}
            {uploadState.step === 'preview' && uploadState.parsedData && (
              <>
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Preview Data CSV
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-600">Periode</p>
                        <p className="font-semibold">
                          {uploadState.parsedData.bulan > 0 
                            ? `${monthNames[uploadState.parsedData.bulan - 1]} ${uploadState.parsedData.tahun}`
                            : '⚠️ Tidak terdeteksi'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Satker</p>
                        <p className="font-semibold">{uploadState.parsedData.satkerId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Items Parsed</p>
                        <p className="font-semibold">{uploadState.parsedData.stats.itemsParsed}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Continuations Merged</p>
                        <p className="font-semibold">{uploadState.parsedData.stats.continuationsMerged}</p>
                      </div>
                    </div>

                    {uploadState.parsedData.errors.length > 0 && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-xs">
                          <p className="font-semibold text-red-700">❌ Error pada parsing:</p>
                          <ul className="ml-4 mt-1 list-disc text-red-600">
                            {uploadState.parsedData.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {uploadState.parsedData.warnings.length > 0 && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <p className="font-semibold text-yellow-700">⚠️ {uploadState.parsedData.warnings.length} warning(s):</p>
                          <ul className="ml-4 mt-1 list-disc text-yellow-600">
                            {uploadState.parsedData.warnings.slice(0, 3).map((warn, i) => (
                              <li key={i}>{warn}</li>
                            ))}
                            {uploadState.parsedData.warnings.length > 3 && (
                              <li>... dan {uploadState.parsedData.warnings.length - 3} warning lainnya</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {uploadState.parsedData.errors.length === 0 && uploadState.parsedData.stats.itemsParsed > 0 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Konfirmasi Periode</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select 
                          value={uploadState.selectedMonth}
                          onValueChange={(value) => 
                            setUploadState(prev => ({ ...prev, selectedMonth: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select 
                          value={uploadState.selectedYear}
                          onValueChange={(value) => 
                            setUploadState(prev => ({ ...prev, selectedYear: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {yearOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={handleProcessUpload}
                        disabled={isImporting}
                      >
                        {isImporting ? 'Sedang Proses...' : 'Lanjut Proses'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleResetAndClose}
                        disabled={isImporting}
                      >
                        Batal
                      </Button>
                    </div>
                  </>
                )}

                {(uploadState.parsedData.errors.length > 0 || uploadState.parsedData.stats.itemsParsed === 0) && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleResetAndClose}
                    >
                      ← Ulang Upload
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* STEP 4: RESULT - Success Summary */}
            {uploadState.step === 'result' && uploadState.matchResult && uploadState.parsedData && (
              <>
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-green-900">
                      <CheckCircle2 className="h-5 w-5" />
                      ✅ Upload Berhasil!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded border border-green-200">
                        <p className="text-xs text-gray-600">Periode</p>
                        <p className="font-bold text-lg text-green-700">
                          {monthNames[uploadState.parsedData.bulan - 1]} {uploadState.parsedData.tahun}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-green-200">
                        <p className="text-xs text-gray-600">Items Matched</p>
                        <p className="font-bold text-lg text-green-700">
                          {uploadState.matchResult.matched}
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded border border-amber-200">
                        <p className="text-xs text-gray-600">Not Matched</p>
                        <p className="font-bold text-lg text-amber-700">
                          {uploadState.matchResult.notMatched}
                        </p>
                      </div>
                    </div>

                    {uploadState.matchResult.notMatched > 0 && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <p className="font-semibold mb-2">
                            ⚠️ {uploadState.matchResult.notMatched} item tidak berhasil dimatching:
                          </p>
                          <ul className="ml-4 list-disc space-y-1 text-xs">
                            {uploadState.matchResult.not_matched_items.slice(0, 3).map((item, i) => (
                              <li key={i}>
                                {item.item.program} | {item.item.akun} | {item.item.uraian?.substring(0, 30)}...
                              </li>
                            ))}
                            {uploadState.matchResult.not_matched_items.length > 3 && (
                              <li>... dan {uploadState.matchResult.not_matched_items.length - 3} item lainnya</li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Button className="w-full" onClick={handleResetAndClose}>
                  ✌️ Selesai
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BahanRevisiUploadBulanan;
