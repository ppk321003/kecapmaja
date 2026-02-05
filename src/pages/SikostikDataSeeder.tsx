import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { seedSikostik2026, seedSikostikPeriod } from '@/utils/seed-sikostik-2026';

export default function SikostikDataSeeder() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSeedAll = async () => {
    setIsLoading(true);
    setStatus('idle');
    try {
      const result = await seedSikostik2026();
      setMessage(result.message);
      setStatus('success');
    } catch (err: any) {
      setMessage(err.message || 'Failed to seed data');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedPeriod = async (bulan: number) => {
    setIsLoading(true);
    setStatus('idle');
    try {
      const result = await seedSikostikPeriod(bulan, bulan, 2026);
      setMessage(result.message);
      setStatus('success');
    } catch (err: any) {
      setMessage(err.message || 'Failed to seed period');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Sikostik28 Data Seeder</h1>
        <p className="text-muted-foreground">
          Populate 2026 data by copying 2025 data to Google Sheets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed 2026 Data</CardTitle>
          <CardDescription>
            This will copy all 2025 data and create 2026 entries in the rekap_dashboard sheet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Click to populate 2026 data:
            </p>
            <Button 
              onClick={handleSeedAll}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Seed All 2026 Data (Jan-Dec)
            </Button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Or seed specific months:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(bulan => (
                <Button
                  key={bulan}
                  onClick={() => handleSeedPeriod(bulan)}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  {bulan}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Manual Alternative</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>If the seeder doesn't work, you can manually populate the data:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open the SIKOSTIK Google Sheet</li>
            <li>Go to the "rekap_dashboard" sheet</li>
            <li>Find all rows with 2025 in the periode_tahun column</li>
            <li>Copy all 2025 data rows</li>
            <li>Paste them at the end of the sheet</li>
            <li>In the pasted rows, change all 2025 to 2026 in the periode_tahun column</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
