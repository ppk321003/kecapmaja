import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSikostikData, formatCurrency, formatPeriode, bulanOptions, getTahunOptions, getCurrentPeriod, formatNIP } from '@/hooks/use-sikostik-data';
import { RekapDashboard } from '@/types/sikostik';
import { cn } from '@/lib/utils';
export const RekapAnggota = () => {
  const {
    loading,
    error,
    fetchRekapDashboard,
    userSheetId
  } = useSikostikData();
  const currentPeriod = getCurrentPeriod();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBulan, setSelectedBulan] = useState(currentPeriod.bulan);
  const [selectedTahun, setSelectedTahun] = useState(currentPeriod.tahun);
  const [rekapData, setRekapData] = useState<RekapDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchRekapDashboard(selectedBulan, selectedTahun);
    setRekapData(data);
    setIsLoading(false);
  };
  useEffect(() => {
    loadData();
  }, [selectedBulan, selectedTahun, userSheetId]);

  // Filter only active members
  const activeMembers = useMemo(() => {
    return rekapData.filter(member => member.status === 'Aktif');
  }, [rekapData]);

  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return activeMembers;
    return activeMembers.filter(member => member.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeMembers, searchQuery]);
  const periodeLabel = formatPeriode(selectedBulan, selectedTahun);

  // Loading skeleton
  if (isLoading && rekapData.length === 0) {
    return <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>;
  }
  return <div className="space-y-6">
      {/* Error Alert */}
      {error && <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>}

      {/* Info Banner */}
      {rekapData.length > 0}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama anggota..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedBulan.toString()} onValueChange={v => setSelectedBulan(parseInt(v))}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {bulanOptions.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTahun.toString()} onValueChange={v => setSelectedTahun(parseInt(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {getTahunOptions().map(t => <SelectItem key={t.value} value={t.value.toString()}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Empty State */}
      {!isLoading && rekapData.length === 0 && !error && <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data untuk periode {periodeLabel}. Silakan isi data di Google Spreadsheet.
          </AlertDescription>
        </Alert>}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Rekap Keuangan Anggota</CardTitle>
          <CardDescription>{filteredData.length} dari {activeMembers.length} anggota ditampilkan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Nama / NIP</TableHead>
                  <TableHead className="font-semibold text-right">Simpanan Pokok</TableHead>
                  <TableHead className="font-semibold text-right">Simpanan Wajib</TableHead>
                  <TableHead className="font-semibold text-right">Simpanan Sukarela</TableHead>
                  <TableHead className="font-semibold text-right">Simpanan Lebaran</TableHead>
                  <TableHead className="font-semibold text-right">Simpanan Lainnya</TableHead>
                  <TableHead className="font-semibold text-right">Total Simpanan</TableHead>
                  <TableHead className="font-semibold text-right">Saldo Piutang</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((member, index) => <TableRow key={member.anggotaId} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.nama}</p>
                        <p className="text-xs text-muted-foreground font-mono">{formatNIP(member.nip)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(member.saldoAkhirbulanPokok)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(member.saldoAkhirbulanWajib)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(member.saldoAkhirbulanSukarela)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(member.saldoAkhirbulanLebaran)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(member.saldoAkhirbulanLainlain)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(member.totalSimpanan)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(member.saldoPiutang > 0 ? 'text-destructive' : 'text-success')}>
                        {formatCurrency(member.saldoPiutang)}
                      </span>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>;
};