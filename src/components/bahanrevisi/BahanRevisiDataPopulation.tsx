import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { populateAllSheets } from '@/utils/bahanrevisi-population';

interface PopulationLog {
  sheet: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message: string;
  rowsAdded?: number;
}

interface BahanRevisiDataPopulationProps {
  satkerSheetId?: string;
  onComplete?: (success: boolean) => void;
}

export default function BahanRevisiDataPopulation({ satkerSheetId, onComplete }: BahanRevisiDataPopulationProps) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<PopulationLog[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

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
    if (!satkerSheetId) {
      alert('⚠️ Sheet ID tidak tersedia');
      return;
    }

    setLoading(true);
    setCompleted(false);
    setShowLogs(true);
    initializeLogs();

    try {
      console.log('🚀 Mulai populate data:', satkerSheetId);
      const results = await populateAllSheets(satkerSheetId);

      for (const result of results) {
        const sheetLabel = sheets.find(s => s.name === result.sheet)?.label || result.sheet;
        if (result.success) {
          updateLog(sheetLabel, 'success', result.message, result.rowsAdded);
        } else {
          updateLog(sheetLabel, 'error', result.error || result.message);
        }
      }

      setCompleted(true);
      const allSuccess = results.every(r => r.success);
      onComplete?.(allSuccess);

    } catch (error: any) {
      console.error('❌ Error:', error);
      setLogs(prev => [...prev, {
        sheet: 'FATAL ERROR',
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      }]);
    } finally {
      setLoading(false);
    }
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;

  if (!satkerSheetId) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePopulateData}
        disabled={loading}
        size="sm"
        variant="outline"
        className="gap-2 w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Mengisi data...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Isi Data Sample
          </>
        )}
      </Button>

      {showLogs && (
        <Card className="bg-slate-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Status ({successCount}/{sheets.length})
              </CardTitle>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                {showLogs ? 'Tutup' : 'Buka'}
              </button>
            </div>
          </CardHeader>
          {showLogs && (
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 flex-shrink-0">
                    {log.status === 'pending' && (
                      <div className="w-3 h-3 rounded-full border border-slate-300" />
                    )}
                    {log.status === 'loading' && (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    )}
                    {log.status === 'success' && (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    )}
                    {log.status === 'error' && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{log.sheet}</div>
                    <div className={`text-xs truncate ${
                      log.status === 'error' ? 'text-red-600' :
                      log.status === 'success' ? 'text-green-600' :
                      'text-slate-500'
                    }`}>
                      {log.message}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {completed && (
        <Alert className={errorCount === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
          <CheckCircle2 className={`h-4 w-4 ${errorCount === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
          <AlertDescription className={`text-sm ${errorCount === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
            {errorCount === 0
              ? `✅ Semua ${successCount} sheets berhasil!`
              : `⚠️ ${successCount}/${sheets.length} berhasil. ${errorCount} gagal.`
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
