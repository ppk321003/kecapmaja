import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { seedSikostik2026 } from '@/utils/seed-sikostik-2026';

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
      setMessage(err.message || 'Gagal menambahkan data');
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
              Klik tombol di bawah untuk menambahkan data 2026:
            </p>
            <Button 
              onClick={handleSeedAll}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Seed Semua Data 2026 (Jan-Des)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alternatif Manual</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Jika seeder tidak bekerja, Anda dapat menambahkan data secara manual:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka Google Sheet SIKOSTIK 
              <a 
                href="https://docs.google.com/spreadsheets/d/1cBuo9tAtpGvKuThvotIQqd9HDvJfF2Hun61oGYhRtHk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                di sini
              </a>
            </li>
            <li>Ke sheet "rekap_dashboard"</li>
            <li>Cari semua baris dengan 2025 di kolom periode_tahun</li>
            <li>Copy semua baris data 2025</li>
            <li>Paste di akhir sheet</li>
            <li>Ubah semua nilai 2025 menjadi 2026 di kolom periode_tahun pada baris yang baru dipaste</li>
            <li>Refresh halaman ini dan coba Rekap Individu</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informasi</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>Masalah 3 yang dilaporkan:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>RekapIndividu 2026 tidak tampil</strong> - Perlu seed data 2026 dulu (jalankan seeder ini)</li>
            <li><strong>Nama dan NIP tidak lengkap</strong> - Verifikasi data NIP di Google Sheets tidak kosong</li>
            <li><strong>Total Potongan = 0</strong> - Akan normal setelah data 2026 diseed</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
