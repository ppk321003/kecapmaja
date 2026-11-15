import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import bpsLogo from '@/assets/bps-logo.png';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle2, Clock3, Search, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface SatkerOption {
  id: string;
  name: string;
}

interface Assignment {
  period: string;
  activity: string;
  jobType: string;
  target: number;
  realization: number;
  unit: string;
  grossAmount: number;
  stage: 'draft' | 'spk';
}

interface LookupResult {
  found: true;
  profile: { name: string; maskedNik: string };
  satker: string;
  honorMonth: string;
  assignments: Assignment[];
  historyAssignments: Assignment[];
  grossTotal: number;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(amount);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAssignment(value: unknown): value is Assignment {
  if (!isRecord(value)) return false;
  return typeof value.period === 'string'
    && typeof value.activity === 'string'
    && typeof value.jobType === 'string'
    && typeof value.target === 'number'
    && typeof value.realization === 'number'
    && typeof value.unit === 'string'
    && typeof value.grossAmount === 'number'
    && (value.stage === 'draft' || value.stage === 'spk');
}

function isLookupResult(value: unknown): value is LookupResult {
  if (!isRecord(value) || !isRecord(value.profile)) return false;
  return value.found === true
    && typeof value.profile.name === 'string'
    && typeof value.profile.maskedNik === 'string'
    && typeof value.satker === 'string'
    && typeof value.honorMonth === 'string'
    && Array.isArray(value.assignments)
    && value.assignments.every(isAssignment)
    && Array.isArray(value.historyAssignments)
    && value.historyAssignments.every(isAssignment)
    && typeof value.grossTotal === 'number';
}

export default function PortalMitra() {
  const [satkers, setSatkers] = useState<SatkerOption[]>([]);
  const [satkerId, setSatkerId] = useState('');
  const [nik, setNik] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingSatkers, setIsLoadingSatkers] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSatkers = async () => {
      setIsLoadingSatkers(true);
      try {
        const { data, error } = await supabase.functions.invoke('portal-mitra', {
          body: { action: 'satkers' },
        });
        if (error) throw new Error('Daftar satker belum dapat dimuat.');
        if (data?.error) throw new Error(data.error);
        if (!Array.isArray(data?.satkers)) throw new Error('Daftar satker belum dapat dimuat.');
        if (active) setSatkers(data.satkers as SatkerOption[]);
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Daftar satker belum dapat dimuat.');
      } finally {
        if (active) setIsLoadingSatkers(false);
      }
    };
    void loadSatkers();
    return () => {
      active = false;
    };
  }, []);

  const submitLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    setNotFound(false);
    setErrorMessage('');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('portal-mitra', {
        body: { satkerId, nik, phoneLast4 },
      });
      if (error instanceof FunctionsHttpError && error.context.status === 429) {
        throw new Error('Batas pencarian tercapai. Silakan tunggu sebelum mencoba kembali.');
      }
      if (error) throw new Error('Pencarian gagal. Silakan coba beberapa saat lagi.');
      if (data?.error) throw new Error(data.error);
      if (data?.found !== true) {
        setNotFound(true);
        return;
      }
      if (!isLookupResult(data)) {
        throw new Error('Layanan Portal Mitra belum diperbarui. Silakan hubungi admin satker.');
      }
      setResult(data);
      setNik('');
      setPhoneLast4('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Pencarian gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetResult = () => {
    setResult(null);
    setNotFound(false);
    setErrorMessage('');
  };

  const historyGrossTotal = result?.historyAssignments.reduce(
    (total, assignment) => total + assignment.grossAmount,
    0,
  ) ?? 0;

  return (
    <main className="min-h-screen bg-muted/40 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6">
        <header className="space-y-2 text-center">
          <img src={bpsLogo} alt="Badan Pusat Statistik" className="mx-auto h-12 w-16 object-contain sm:h-14 sm:w-20" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Portal Mitra Statistik</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Periksa status penugasan dan estimasi honor bulanan Anda.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Verifikasi data
            </CardTitle>
            <CardDescription>
              Pilih satker tempat Anda bertugas. Data identitas dicocokkan dengan Master Mitra pada satker tersebut.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={(event) => void submitLookup(event)}>
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="mitra-satker">Satker</Label>
                <Select
                  value={satkerId}
                  onValueChange={(value) => {
                    setSatkerId(value);
                    resetResult();
                  }}
                  disabled={isLoadingSatkers || satkers.length === 0}
                >
                  <SelectTrigger id="mitra-satker">
                    <SelectValue placeholder={isLoadingSatkers ? 'Memuat daftar satker...' : 'Pilih satker'} />
                  </SelectTrigger>
                  <SelectContent>
                    {satkers.map((satker) => (
                      <SelectItem key={satker.id} value={satker.id}>{satker.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mitra-nik">NIK</Label>
                <Input
                  id="mitra-nik"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={16}
                  placeholder="Masukkan 16 digit NIK"
                  value={nik}
                  onChange={(event) => {
                    setNik(event.target.value.replace(/\D/g, '').slice(0, 16));
                    resetResult();
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mitra-phone-last4">4 digit terakhir nomor HP terdaftar</Label>
                <Input
                  id="mitra-phone-last4"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="Contoh: 1234"
                  value={phoneLast4}
                  onChange={(event) => {
                    setPhoneLast4(event.target.value.replace(/\D/g, '').slice(0, 4));
                    resetResult();
                  }}
                  required
                />
              </div>
              <Button
                className="w-full sm:col-span-2 xl:col-span-1 xl:self-end"
                type="submit"
                disabled={isLoading || isLoadingSatkers || !satkerId || nik.length !== 16 || phoneLast4.length !== 4}
              >
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                {isLoading ? 'Memeriksa data...' : 'Periksa Data Saya'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {notFound && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Data tidak ditemukan atau tidak cocok. Pastikan satker, NIK, dan nomor HP sesuai dengan data yang terdaftar.
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <section className="space-y-4" aria-live="polite">
            <Card>
              <CardHeader>
                <CardTitle>Halo, {result.profile.name}</CardTitle>
                <CardDescription>{result.satker} · NIK {result.profile.maskedNik}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">Honor bruto berdasarkan realisasi bulan {result.honorMonth}</p>
                  <p className="mt-1 text-2xl font-bold">{formatCurrency(result.grossTotal)}</p>
                </div>
                <div
                  role="note"
                  className="mt-3 flex items-start gap-2 rounded-md border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold">Perhatian: Nilai honor masih sementara</p>
                    <p className="text-xs leading-relaxed">
                      Nilai ini merupakan rekapitulasi sementara berdasarkan realisasi dan usulan Subject Matter. Nilai akhir dapat berubah setelah proses verifikasi dan penetapan.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Penugasan bulan {result.honorMonth}</CardTitle>
                <CardDescription>Status, target, realisasi, dan honor berdasarkan realisasi per kegiatan.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {result.assignments.length === 0 ? (
                  <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
                    Belum ada penugasan yang tercatat untuk bulan ini.
                  </p>
                ) : result.assignments.map((assignment, index) => (
                  <article key={`${assignment.activity}-${index}`} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-semibold">{assignment.activity}</h3>
                        {assignment.jobType && <p className="text-sm text-muted-foreground">{assignment.jobType}</p>}
                      </div>
                      <Badge variant={assignment.stage === 'spk' ? 'default' : 'secondary'} className="w-fit shrink-0 gap-1">
                        {assignment.stage === 'spk'
                          ? <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Proses SPK</>
                          : <><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Draf Usulan</>}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
                      <p>Target: <span className="font-medium">{assignment.target.toLocaleString('id-ID')} {assignment.unit}</span></p>
                      <p>Realisasi: <span className="font-medium">{assignment.realization.toLocaleString('id-ID')} {assignment.unit}</span></p>
                      <p>Honor bruto: <span className="font-medium">{formatCurrency(assignment.grossAmount)}</span></p>
                    </div>
                    {assignment.stage === 'spk' && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        SPK yang selesai dibuat akan diinformasikan melalui WhatsApp (WA blasting).
                      </p>
                    )}
                  </article>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Riwayat Penugasan Bulan Sebelumnya</CardTitle>
                <CardDescription>Daftar penugasan pada bulan-bulan sebelumnya.</CardDescription>
              </CardHeader>
              <CardContent>
                {result.historyAssignments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Belum ada riwayat penugasan bulan sebelumnya.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-3">No.</th>
                          <th className="p-3">Periode</th>
                          <th className="p-3">Kegiatan</th>
                          <th className="p-3">Jenis Pekerjaan</th>
                          <th className="p-3 text-right">Realisasi</th>
                          <th className="p-3 text-right">Honor Bruto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.historyAssignments.map((assignment, index) => (
                          <tr key={`${assignment.period}-${assignment.activity}-${index}`} className="border-b">
                            <td className="whitespace-nowrap p-3">{index + 1}</td>
                            <td className="whitespace-nowrap p-3">{assignment.period}</td>
                            <td className="p-3 font-medium">{assignment.activity}</td>
                            <td className="p-3">{assignment.jobType || '—'}</td>
                            <td className="whitespace-nowrap p-3 text-right">
                              {assignment.realization.toLocaleString('id-ID')} {assignment.unit}
                            </td>
                            <td className="whitespace-nowrap p-3 text-right">
                              {formatCurrency(assignment.grossAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t font-semibold">
                          <td className="p-3 text-right" colSpan={5}>Jumlah Honor Bruto</td>
                          <td className="whitespace-nowrap p-3 text-right">{formatCurrency(historyGrossTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <footer className="text-center text-xs text-muted-foreground">
          Informasi hanya dapat dilihat setelah verifikasi. Jangan membagikan NIK dan nomor HP Anda kepada orang lain.
        </footer>
      </div>
    </main>
  );
}
