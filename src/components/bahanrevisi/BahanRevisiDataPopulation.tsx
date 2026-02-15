import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { populateAllSheets, verifyPopulatedData } from '@/utils/bahanrevisi-population';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';

interface PopulationLog {
  sheet: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message: string;
  rowsAdded?: number;
}

export default function BahanRevisiDataPopulation() {
  const satkerContext = useSatkerConfigContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<PopulationLog[]>([]);
  const [completed, setCompleted] = useState(false);
  const [sheetId, setSheetId] = useState('');

  const sheets = [
    { name: 'programs', label: 'Master Programs' },
    { name: 'kegiatans', label: 'Master Kegiatans' },
    { name: 'rincian_outputs', label: 'Master Rincian Outputs' },
    { name: 'komponen_outputs', label: 'Master Komponen Outputs' },
    { name: 'sub_komponen', label: 'Master Sub Komponen' },
    { name: 'akuns', label: 'Master Akuns' },
    { name: 'budget_items', label: 'Budget Items Data' },
    { name: 'rpd_items', label: 'RPD Items Data' }
  ];

  const initializeLogs = () => {
    const initialLogs = sheets.map(sheet => ({
      sheet: sheet.label,
      status: 'pending' as const,
      message: 'Menunggu...'
    }));
    setLogs(initialLogs);
  };

  const updateLog = (sheetLabel: string, status: 'loading' | 'success' | 'error', message: string, rowsAdded?: number) => {
    setLogs(prev =>
      prev.map(log =>
        log.sheet === sheetLabel
          ? { ...log, status, message, rowsAdded }
          : log
      )
    );
  };

  const handlePopulateData = async () => {
    const spreadsheetId = sheetId || satkerContext?.getUserSatkerSheetId('bahanrevisi');

    if (!spreadsheetId) {
      alert('⚠️ Sheet ID tidak ditemukan. Pastikan Anda telah setup satker_config dengan bahanrevisi_sheet_id');
      return;
    }

    setLoading(true);
    setCompleted(false);
    initializeLogs();

    try {
      console.log('🚀 Mulai populate data ke Sheet ID:', spreadsheetId);

      const results = await populateAllSheets(spreadsheetId);

      // Update logs dengan results
      for (const result of results) {
        const sheetLabel = sheets.find(s => s.name === result.sheet)?.label || result.sheet;
        if (result.success) {
          updateLog(sheetLabel, 'success', result.message, result.rowsAdded);
        } else {
          updateLog(sheetLabel, 'error', result.error || result.message);
        }
      }

      setCompleted(true);

      // Verify some data
      const verifyResults = await Promise.all([
        verifyPopulatedData(spreadsheetId, 'programs'),
        verifyPopulatedData(spreadsheetId, 'budget_items'),
        verifyPopulatedData(spreadsheetId, 'rpd_items')
      ]);

      console.log('📊 Verification Results:', verifyResults);

    } catch (error: any) {
      console.error('❌ Error saat populate:', error);
      updateLog('all', 'error', `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Isi Data Sample
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Isi Data Sample Bahan Revisi Anggaran</DialogTitle>
          <DialogDescription>
            Populasi semua sheet dengan data sample untuk testing dan demo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Utility ini akan mengisi 8 sheet (6 master + 2 transaksi) dengan sample data dari referensi bahanrevisi-3210
            </AlertDescription>
          </Alert>

          {/* Sheet ID Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sheet ID (Optional)</label>
            <input
              type="text"
              placeholder="Biarkan kosong untuk menggunakan Sheet ID dari satker config"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          {/* Populate Button */}
          <Button
            onClick={handlePopulateData}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sedang mengisi data...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Mulai Populate Data
              </>
            )}
          </Button>

          {/* Progress Logs */}
          {logs.length > 0 && (
            <Card className="bg-slate-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Status Pengisian ({successCount}/{sheets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5">
                      {log.status === 'pending' && (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                      )}
                      {log.status === 'loading' && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      {log.status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {log.status === 'error' && (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{log.sheet}</div>
                      <div className={`text-xs ${
                        log.status === 'error' ? 'text-red-600' :
                        log.status === 'success' ? 'text-green-600' :
                        'text-slate-500'
                      }`}>
                        {log.message}
                        {log.rowsAdded && ` (+${log.rowsAdded} baris)`}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Completion Summary */}
          {completed && (
            <Alert className={errorCount === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
              <CheckCircle2 className={`h-4 w-4 ${errorCount === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
              <AlertDescription className={errorCount === 0 ? 'text-green-800' : 'text-yellow-800'}>
                {errorCount === 0
                  ? `✅ Semua ${successCount} sheets berhasil diisi!`
                  : `⚠️ ${successCount}/${sheets.length} sheets berhasil. ${errorCount} gagal.`
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Data Summary */}
          {completed && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Data yang Diisi</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1 text-slate-700">
                <div>• 4 Budget Items (Status: new, changed, unchanged, deleted, rejected)</div>
                <div>• 3 RPD Items (Rencana Anggaran Kas Bulanan)</div>
                <div>• 4 Programs, 7 Kegiatans, 6 Rincian Outputs</div>
                <div>• 6 Komponen Outputs, 6 Sub Komponen, 8 Akuns</div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
