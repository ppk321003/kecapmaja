import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, AlertCircle, CheckCircle2, Users, PiggyBank, HandCoins, Receipt } from 'lucide-react';
import { useSikostikData, formatCurrency, formatPeriode, bulanOptions, getTahunOptions, getCurrentPeriod, formatNIP } from '@/hooks/use-sikostik-data';
import { RekapDashboard } from '@/types/sikostik';
import { cn } from '@/lib/utils';

export const RekapAnggota = () => {
  const { loading, error, fetchRekapDashboard } = useSikostikData();
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
  }, [selectedBulan, selectedTahun]);

  // Filter only active members
  const activeMembers = useMemo(() => {
    return rekapData.filter((member) => member.status === 'Aktif');
  }, [rekapData]);

  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return activeMembers;
    return activeMembers.filter((member) =>
      member.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeMembers, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSimpanan = activeMembers.reduce((sum, m) => sum + m.totalSimpanan, 0);
    const totalPiutang = activeMembers.reduce((sum, m) => sum + m.saldoPiutang, 0);
    const totalCicilan = activeMembers.reduce((sum, m) => sum + m.cicilanPokok, 0);
    return { totalSimpanan, totalPiutang, totalCicilan, totalAnggota: activeMembers.length };
  }, [activeMembers]);

  const periodeLabel = formatPeriode(selectedBulan, selectedTahun);

  // Loading skeleton
  if (isLoading && rekapData.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info Banner */}
      {rekapData.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <span className="text-foreground">
            Menampilkan data anggota periode <strong>{periodeLabel}</strong> dengan status{' '}
            <Badge variant="outline" className="ml-1 border-accent text-accent">Aktif</Badge>
          </span>
          <span className="ml-auto text-muted-foreground text-xs">
            Data dari Google Spreadsheet
          </span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Cari nama anggota..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9" 
          />
        </div>
        <Select value={selectedBulan.toString()} onValueChange={(v) => setSelectedBulan(parseInt(v))}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {bulanOptions.map((b) => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTahun.toString()} onValueChange={(v) => setSelectedTahun(parseInt(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {getTahunOptions().map((t) => <SelectItem key={t.value} value={t.value.toString()}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Anggota Aktif</p>
              <p className="text-xl font-bold">{stats.totalAnggota}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10">
              <PiggyBank className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Simpanan</p>
              <p className="text-xl font-bold text-success">{formatCurrency(stats.totalSimpanan)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10">
              <HandCoins className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Piutang</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(stats.totalPiutang)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Receipt className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cicilan/Bulan</p>
              <p className="text-xl font-bold text-accent">{formatCurrency(stats.totalCicilan)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {!isLoading && rekapData.length === 0 && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data untuk periode {periodeLabel}. Silakan isi data di Google Spreadsheet.
          </AlertDescription>
        </Alert>
      )}

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
                  <TableHead className="font-semibold text-right">Cicilan Pokok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((member, index) => (
                  <TableRow key={member.anggotaId} className={cn(index % 2 === 1 && 'bg-muted/30')}>
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
                    <TableCell className="text-right">{formatCurrency(member.cicilanPokok)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
