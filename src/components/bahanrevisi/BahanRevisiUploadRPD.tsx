/**
 * Component untuk Upload RPD dengan Verifikasi Matching/Unmatching
 */

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RPDItem } from '@/types/bahanrevisi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp, Loader, AlertCircle, CheckCircle2, Info, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface UploadRPDProps {
  existingRPDItems: RPDItem[];
  onUploadSuccess: (newItems: RPDItem[], updatedItems: RPDItem[]) => Promise<void>;
  sheetId: string | null;
}

interface ParsedRPDFile {
  items: Partial<RPDItem>[];
  fileName: string;
}

interface MatchResult {
  matched: Partial<RPDItem>[];
  unmatched: Partial<RPDItem>[];
}

interface UploadState {
  step: 'idle' | 'processing' | 'verification' | 'uploading' | 'success';
  parsedData: ParsedRPDFile | null;
  matchResult: MatchResult | null;
  originalFile: File | null;
  error: string | null;
}

// Helper function to create a unique key for matching RPD items
const createRPDKey = (item: Partial<RPDItem>): string => {
  return [
    item.program_pembebanan || '',
    item.kegiatan || '',
    item.komponen_output || '',
    item.sub_komponen || '',
    item.akun || '',
    item.uraian || '',
  ]
    .map(v => String(v).trim().toLowerCase())
    .join('|');
};

// Helper to convert RPDItem to row format for Google Sheets
const rpdItemToRow = (item: RPDItem): (string | number | boolean | null)[] => {
  return [
    item.id,
    item.program_pembebanan,
    item.kegiatan,
    item.komponen_output,
    item.sub_komponen,
    item.akun,
    item.uraian,
    item.total_pagu,
    item.jan,
    item.feb,
    item.mar,
    item.apr,
    item.mei,
    item.jun,
    item.jul,
    item.aug,
    item.sep,
    item.oct,
    item.nov,
    item.dec,
    item.total_rpd,
    item.sisa_anggaran,
    item.status,
    item.modified_by || '',
    item.modified_date || '',
    item.blokir || 0,
  ];
};

const BahanRevisiUploadRPD: React.FC<UploadRPDProps> = ({
  existingRPDItems,
  onUploadSuccess,
  sheetId,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    step: 'idle',
    parsedData: null,
    matchResult: null,
    originalFile: null,
    error: null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadState({
      step: 'processing',
      parsedData: null,
      matchResult: null,
      originalFile: file,
      error: null,
    });

    try {
      let items: Partial<RPDItem>[] = [];

      // Parse file based on type
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        items = parseExcelRPD(data);
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text();
        // Auto-detect delimiter: check first line for semicolon vs comma
        const firstLine = text.split('\n')[0];
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
        const data = text.split('\n').map(line => line.split(delimiter));
        items = parseExcelRPD(data);
      } else {
        throw new Error('Format file tidak didukung. Gunakan Excel (.xlsx) atau CSV (.csv)');
      }

      // Validate items
      if (items.length === 0) {
        throw new Error('File tidak mengandung data RPD yang valid');
      }

      // Perform matching
      const matchResult = performMatching(items);

      setUploadState({
        step: 'verification',
        parsedData: { items, fileName: file.name },
        matchResult,
        originalFile: file,
        error: null,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[BahanRevisiUploadRPD] Parse error:', error);
      setUploadState({
        step: 'idle',
        parsedData: null,
        matchResult: null,
        originalFile: null,
        error: error instanceof Error ? error.message : 'Gagal parse file',
      });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal membaca file',
      });
    }
  };

  const parseExcelRPD = (data: any[][]): Partial<RPDItem>[] => {
    const items: Partial<RPDItem>[] = [];
    
    const monthPatterns: { [key: string]: string } = {
      'jan': 'jan', 'janu': 'jan', 'januari': 'jan',
      'feb': 'feb', 'febr': 'feb', 'februari': 'feb',
      'mar': 'mar', 'maret': 'mar', 'mrt': 'mar',
      'apr': 'apr', 'april': 'apr',
      'mei': 'mei', 'may': 'mei',
      'jun': 'jun', 'juni': 'jun',
      'jul': 'jul', 'juli': 'jul',
      'aug': 'aug', 'agust': 'aug', 'agustus': 'aug',
      'sep': 'sep', 'sept': 'sep', 'september': 'sep',
      'oct': 'oct', 'okt': 'oct', 'oktober': 'oct',
      'nov': 'nov', 'nop': 'nov', 'november': 'nov',
      'dec': 'dec', 'dez': 'dec', 'des': 'dec', 'desember': 'dec',
    };

    const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    if (data.length < 2) {
      throw new Error('File harus memiliki minimal header dan 1 baris data');
    }

    // Find header row dengan deteksi bulan
    let headerRowIdx = -1;
    let monthColumnMap = new Map<string, number>();
    
    for (let i = 0; i < Math.min(30, data.length); i++) {
      const row = data[i];
      if (!row || row.length < 15) continue;
      
      const tempMonthMap = new Map<string, number>();
      row.forEach((cell: any, idx: number) => {
        const normalized = String(cell || '').toLowerCase().trim();
        for (const [pattern, monthName] of Object.entries(monthPatterns)) {
          if (normalized === pattern || normalized.startsWith(pattern)) {
            tempMonthMap.set(monthName, idx);
          }
        }
      });
      
      // Jika found >= 5 bulan, ini adalah header row
      if (tempMonthMap.size >= 5) {
        headerRowIdx = i;
        monthColumnMap = tempMonthMap;
        console.debug('[BahanRevisiUploadRPD] Found header at row', i, 'with months:', Array.from(monthColumnMap.keys()));
        break;
      }
    }

    if (headerRowIdx === -1) {
      throw new Error('Tidak menemukan header dengan bulan. Pastikan file mengandung kolom JAN, FEB, MRT, APRIL, MEI, JUNI, JULI, AGUST, SEPT, OKT, NOP, DES');
    }

    const dataStartIdx = headerRowIdx + 1;

    // Helper function to safely parse number dengan berbagai format
    const parseNumber = (value: any): number => {
      if (!value) return 0;
      const str = String(value).trim();
      if (!str || str === '-' || str === '') return 0;
      // Remove spaces and thousands separators, keep decimal point
      const cleaned = str.replace(/[.\s]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : Math.max(0, num);
    };

    // Find first month column index untuk menentukan uraian column
    const monthColIndices = Array.from(monthColumnMap.values());
    const firstMonthColIdx = monthColIndices.length > 0 ? Math.min(...monthColIndices) : 100;

    // Parse POK/hierarchical data dengan context tracking
    let currentProgram = '';
    let currentKegiatan = '';
    let currentKomponen = '';
    let currentSubKomponen = '';
    let lastAkun = '';

    for (let i = dataStartIdx; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row || row.length === 0) continue;
      
      // Ensure row has enough columns
      if (row.length < Math.max(...monthColumnMap.values())) {
        continue;
      }

      // Get first non-empty cell untuk code
      let code = '';
      
      for (let j = 0; j < Math.min(6, row.length); j++) {
        const cellStr = String(row[j] || '').trim();
        if (cellStr && cellStr !== '-' && /^[a-zA-Z0-9.]+$/.test(cellStr) && cellStr.length <= 20) {
          code = cellStr;
          break;
        }
      }

      // Get uraian dari kolom terakhir SEBELUM first month column
      let uraian = '';
      for (let j = firstMonthColIdx - 1; j >= 0; j--) {
        const cellStr = String(row[j] || '').trim();
        if (cellStr && cellStr !== '-' && cellStr.length > 2 && cellStr.length < 200) {
          uraian = cellStr;
          break;
        }
      }

      // Skip jika benar-benar kosong
      if (!code && !uraian) continue;

      // Detect hierarchy level
      const isProgram = /^[0-9]{3}(\.[0-9]{2})?[A-Z]{2}/.test(code); // 054.01.GG
      const isKegiatan = /^[0-9]{4}$/.test(code); // 2896
      const isKomponen = /^[0-9]{4}\.[A-Z]{3}/.test(code); // 2896.BMA
      const isSubKomponen = /^[A-Z]{3}$/.test(code) && code !== 'NON' && code !== 'JAN' && code !== 'KD'; // A
      const isAkun = /^[0-9]{5,6}$/.test(code); // 521213

      // Update hierarchy context (MAINTAIN program unless explicit program row)
      if (isProgram) {
        currentProgram = code;
        currentKegiatan = '';
        currentKomponen = '';
        currentSubKomponen = '';
        lastAkun = '';
      } else if (isKegiatan) {
        currentKegiatan = code;
        // Keep currentProgram intact!
        currentKomponen = '';
        currentSubKomponen = '';
        lastAkun = '';
      } else if (isKomponen) {
        currentKomponen = code;
        // Keep currentProgram and currentKegiatan intact!
        currentSubKomponen = '';
        lastAkun = '';
      } else if (isSubKomponen) {
        currentSubKomponen = code;
        lastAkun = '';
      } else if (isAkun) {
        lastAkun = code;
      }

      // Parse monthly values dengan proper number handling
      const monthValues: { [key: string]: number } = {};
      let totalRPD = 0;
      
      for (const [month, colIdx] of monthColumnMap.entries()) {
        const value = parseNumber(row[colIdx]);
        monthValues[month] = value;
        totalRPD += value;
      }

      // Untuk POK, hanya add item yang memiliki akun dan nilai > 0
      if (isAkun && totalRPD > 0) {
        const item: Partial<RPDItem> = {
          id: `rpd_${Date.now()}_${i}_${Math.random()}`,
          program_pembebanan: currentProgram,
          kegiatan: currentKegiatan,
          komponen_output: currentKomponen,
          sub_komponen: currentSubKomponen,
          akun: code,
          uraian: uraian, // Dari kolom terakhir sebelum bulan
          total_pagu: totalRPD, // Sum of january to december
          total_rpd: totalRPD,
          sisa_anggaran: 0, // No sisa since total_pagu = total_rpd
          status: 'active',
          ...monthValues,
        };

        items.push(item);
      }
    }

    if (items.length === 0) {
      throw new Error('Tidak ada data RPD (dengan Akun dan nilai > 0) ditemukan. Pastikan file POK sudah benar.');
    }

    console.debug('[BahanRevisiUploadRPD] Parsed', items.length, 'RPD items');
    return items;
  };

  const performMatching = (newItems: Partial<RPDItem>[]): MatchResult => {
    const existingKeys = new Set(existingRPDItems.map(createRPDKey));
    const matched: Partial<RPDItem>[] = [];
    const unmatched: Partial<RPDItem>[] = [];

    newItems.forEach(item => {
      const key = createRPDKey(item);
      if (existingKeys.has(key)) {
        matched.push(item);
      } else {
        unmatched.push(item);
      }
    });

    return { matched, unmatched };
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmUpload = async () => {
    if (!uploadState.matchResult || !uploadState.parsedData || !sheetId) return;

    setIsUploading(true);
    try {
      const { matched, unmatched } = uploadState.matchResult;

      // Prepare items to add (unmatched)
      const itemsToAdd = unmatched.map(item => ({
        ...item,
        id: `rpd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modified_by: 'system',
        modified_date: new Date().toISOString(),
      })) as RPDItem[];

      // Prepare items to update (matched)
      const itemsToUpdate = matched.map(newItem => {
        const existing = existingRPDItems.find(
          e => createRPDKey(e) === createRPDKey(newItem)
        );
        if (existing) {
          return {
            ...existing,
            ...newItem,
            modified_by: 'system',
            modified_date: new Date().toISOString(),
          };
        }
        return { ...newItem, id: `rpd_${Date.now()}` } as RPDItem;
      }) as RPDItem[];

      // Upload new items (append to sheet)
      if (itemsToAdd.length > 0) {
        const rows = itemsToAdd.map(rpdItemToRow);
        console.log('[BahanRevisiUploadRPD] Appending', itemsToAdd.length, 'new items');
        
        const appendResult = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: sheetId,
            operation: 'append',
            range: 'rpd_items!A:Z',
            values: rows,
          },
        });

        if (appendResult.error) {
          throw new Error(`Gagal append items: ${appendResult.error.message}`);
        }
      }

      // Update existing items
      if (itemsToUpdate.length > 0) {
        console.log('[BahanRevisiUploadRPD] Updating', itemsToUpdate.length, 'items');
        
        // Fetch all current items to get row indices
        const fetchResult = await supabase.functions.invoke('google-sheets', {
          body: {
            spreadsheetId: sheetId,
            operation: 'get',
            range: 'rpd_items!A:Z',
          },
        });

        if (fetchResult.data && Array.isArray(fetchResult.data)) {
          const allRows = fetchResult.data;
          
          // Update items
          for (const updateItem of itemsToUpdate) {
            // Find row index by matching ID or key
            let rowIdx = -1;
            for (let i = 1; i < allRows.length; i++) {
              const row = allRows[i];
              if (row && row[0] === updateItem.id) {
                rowIdx = i + 1; // 1-based for sheet
                break;
              }
            }

            if (rowIdx > 0) {
              const updateRow = rpdItemToRow(updateItem);
              const updateResult = await supabase.functions.invoke('google-sheets', {
                body: {
                  spreadsheetId: sheetId,
                  operation: 'update',
                  range: `rpd_items!A${rowIdx}:Z${rowIdx}`,
                  values: [updateRow],
                },
              });

              if (updateResult.error) {
                console.warn(`Failed to update item ${updateItem.id}:`, updateResult.error);
              }
            }
          }
        }
      }

      // Call parent's callback for refresh
      await onUploadSuccess(itemsToAdd, itemsToUpdate);

      setUploadState({
        step: 'success',
        parsedData: uploadState.parsedData,
        matchResult: uploadState.matchResult,
        originalFile: null,
        error: null,
      });

      toast({
        variant: 'default',
        title: 'Upload Berhasil',
        description: `${itemsToAdd.length} item baru ditambahkan, ${itemsToUpdate.length} item diperbarui`,
      });

      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsDialogOpen(false);
        setUploadState({
          step: 'idle',
          parsedData: null,
          matchResult: null,
          originalFile: null,
          error: null,
        });
      }, 2000);
    } catch (error) {
      console.error('[BahanRevisiUploadRPD] Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Error Upload',
        description: error instanceof Error ? error.message : 'Gagal upload data',
      });
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Gagal upload data',
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplateExcel = () => {
    const templateData = [
      ['program_pembebanan', 'kegiatan', 'komponen_output', 'sub_komponen', 'akun', 'uraian', 'total_pagu', 'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
      ['054.01.GG', '2896', '2896.BMA', '052', 'A', 'Contoh Item RPD', 100000000, 10000000, 10000000, 10000000, 10000000, 10000000, 10000000, 10000000, 10000000, 0, 0, 0, 0],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = Array(19).fill({ wch: 15 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RPD Template');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rpd-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="gap-2"
        size="sm"
        variant="ghost"
      >
        <FileUp className="w-4 h-4" />
        Upload RPD
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Rencana Penarikan Dana (RPD)</DialogTitle>
            <DialogDescription>
              Upload file Excel/CSV dengan data RPD untuk diintegrasikan ke sistem
            </DialogDescription>
          </DialogHeader>

          {uploadState.step === 'idle' && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  File harus memiliki kolom: program_pembebanan, kegiatan, komponen_output, sub_komponen, akun, uraian, total_pagu, dan kolom bulan (jan-dec)
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-slate-50 cursor-pointer"
                onClick={triggerFileInput}
              >
                <FileUp className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                <p className="font-semibold mb-1">Pilih file untuk upload</p>
                <p className="text-sm text-slate-600 mb-4">Drag & drop file atau klik untuk browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={downloadTemplateExcel}
              >
                <Download className="w-4 h-4" />
                Download Template Excel
              </Button>

              {uploadState.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadState.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {uploadState.step === 'processing' && (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2">Memproses file...</span>
            </div>
          )}

          {uploadState.step === 'verification' && uploadState.matchResult && uploadState.parsedData && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Hasil Verifikasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-blue-50">
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-blue-700">
                          {uploadState.parsedData.items.length}
                        </div>
                        <div className="text-sm text-slate-600">Total Item</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-green-700">
                          {uploadState.matchResult.unmatched.length}
                        </div>
                        <div className="text-sm text-slate-600">Item Baru</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50">
                      <CardContent className="pt-6">
                        <div className="text-3xl font-bold text-amber-700">
                          {uploadState.matchResult.matched.length}
                        </div>
                        <div className="text-sm text-slate-600">Item Update</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong>{uploadState.matchResult.unmatched.length}</strong> item baru akan ditambahkan dan <strong>{uploadState.matchResult.matched.length}</strong> item akan diperbarui
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Preview Item Baru ({uploadState.matchResult.unmatched.length} items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto border rounded max-h-96 overflow-y-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-slate-100 z-10">
                        <tr className="border-b">
                          <th className="text-left p-2 border-r font-semibold">Program</th>
                          <th className="text-left p-2 border-r font-semibold">Kegiatan</th>
                          <th className="text-left p-2 border-r font-semibold">Akun</th>
                          <th className="text-left p-2 border-r font-semibold">Uraian</th>
                          <th className="text-right p-2 font-semibold">Total Pagu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadState.matchResult.unmatched.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-slate-50">
                            <td className="p-2 border-r text-xs whitespace-nowrap">{item.program_pembebanan || '-'}</td>
                            <td className="p-2 border-r text-xs whitespace-nowrap">{item.kegiatan || '-'}</td>
                            <td className="p-2 border-r text-xs whitespace-nowrap">{item.akun || '-'}</td>
                            <td className="p-2 border-r text-xs">{item.uraian || '-'}</td>
                            <td className="p-2 text-right text-xs whitespace-nowrap">{formatCurrency(item.total_pagu || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setUploadState({
                    step: 'idle',
                    parsedData: null,
                    matchResult: null,
                    originalFile: null,
                    error: null,
                  })}
                  disabled={isUploading}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading && <Loader className="w-4 h-4 animate-spin" />}
                  Konfirmasi & Upload
                </Button>
              </div>
            </div>
          )}

          {uploadState.step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">Upload Berhasil!</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Data RPD telah diintegrasikan ke sistem
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BahanRevisiUploadRPD;
