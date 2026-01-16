import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Calculator, AlertTriangle, CheckCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { useSikostikData, formatCurrency, parseNIP, formatNIP, getRetirementStatusText } from '@/hooks/use-sikostik-data';
import { LimitAnggota } from '@/types/sikostik';
import { cn } from '@/lib/utils';

export const CekLimit = () => {
  const { loading, error, fetchLimitAnggota } = useSikostikData();
  const [searchQuery, setSearchQuery] = useState('');
  const [limitData, setLimitData] = useState<LimitAnggota[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchLimitAnggota();
    setLimitData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const enrichedData = useMemo(() => {
    return limitData.map((member) => {
      const nipInfo = parseNIP(member.nip);
      return { ...member, nipInfo };
    });
  }, [limitData]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return enrichedData;
    return enrichedData.filter((member) => member.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, enrichedData]);

  const stats = useMemo(() => {
    const totalSisaLimit = limitData.reduce((sum, m) => sum + m.sisaLimit, 0);
    const membersWithLimit = limitData.filter((m) => m.sisaLimit > 0).length;
    const membersNoLimit = limitData.filter((m) => m.sisaLimit <= 0).length;
    const nearRetirement = enrichedData.filter((m) => m.nipInfo?.isNearRetirement).length;
    return { totalSisaLimit, membersWithLimit, membersNoLimit, nearRetirement };
  }, [enrichedData, limitData]);

  const getStatusBadge = (sisaLimit: number, isNearRetirement?: boolean) => {
    if (sisaLimit <= 0) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Limit Habis</Badge>;
    }
    if (isNearRetirement) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1"><Clock className="h-3 w-3" />Mendekati Pensiun</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-600 gap-1"><CheckCircle className="h-3 w-3" />Tersedia</Badge>;
  };

  // Loading skeleton
  if (isLoading && limitData.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-12 w-full" />
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

      {/* Formula Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Calculator className="h-5 w-5 text-primary" /></div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">Rumus Limit & Cicilan</h3>
              <p className="text-sm text-muted-foreground"><code className="px-2 py-1 rounded bg-muted font-mono">Limit = 1.5 × (Total Simpanan - Total Pinjaman)</code></p>
              <p className="text-sm text-muted-foreground"><code className="px-2 py-1 rounded bg-muted font-mono">Cicilan Pokok = Hutang ÷ min(36, Sisa Masa Kerja)</code></p>
              <p className="text-sm text-muted-foreground mt-2">⚠️ Anggota mendekati pensiun (sisa &lt;36 bulan) wajib melunasi sebelum pensiun.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Sisa Limit Tersedia</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(stats.totalSisaLimit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Bisa Pinjam</p>
            <p className="text-xl font-bold text-green-600 mt-1">{stats.membersWithLimit} orang</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Limit Habis</p>
            <p className="text-xl font-bold text-destructive mt-1">{stats.membersNoLimit} orang</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Mendekati Pensiun</p>
            <p className="text-xl font-bold text-yellow-600 mt-1">{stats.nearRetirement} orang</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Refresh */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama anggota..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Empty State */}
      {!isLoading && limitData.length === 0 && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data limit pinjaman. Data dihitung dari sheet rekap_dashboard.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Limit Pinjaman Anggota</CardTitle>
          <CardDescription>{filteredData.length} anggota ditampilkan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Nama / NIP</TableHead>
                  <TableHead className="font-semibold text-right">Total Simpanan</TableHead>
                  <TableHead className="font-semibold text-right">Saldo Piutang</TableHead>
                  <TableHead className="font-semibold text-right">Sisa Limit Tersedia</TableHead>
                  <TableHead className="font-semibold text-center">Sisa Masa Kerja</TableHead>
                  <TableHead className="font-semibold text-right">Cicilan Saat Ini</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
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
                    <TableCell className="text-right">{formatCurrency(member.totalSimpanan)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(member.saldoPiutang)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-bold', member.sisaLimit > 0 ? 'text-green-600' : 'text-destructive')}>
                        {formatCurrency(member.sisaLimit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {member.nipInfo ? (
                        <div className={cn('text-sm', member.nipInfo.isNearRetirement && 'text-yellow-600 font-medium')}>
                          {getRetirementStatusText(member.nipInfo.remainingWorkMonths)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(member.cicilanPokok)}</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(member.sisaLimit, member.nipInfo?.isNearRetirement)}
                    </TableCell>
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
