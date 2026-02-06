import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Calculator, AlertTriangle, CheckCircle, Clock, RefreshCw, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useSikostikData, formatCurrency, parseNIP, formatNIP, getRetirementStatusText } from '@/hooks/use-sikostik-data';
import { LimitAnggota } from '@/types/sikostik';
import { cn } from '@/lib/utils';

export const CekLimit = ({ onSelectMember }: { onSelectMember?: (anggotaId: string) => void }) => {
  const { loading, error, fetchLimitAnggota } = useSikostikData();
  const [searchQuery, setSearchQuery] = useState('');
  const [limitData, setLimitData] = useState<LimitAnggota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{
    key: 'nama' | 'sisaLimit' | 'remainingWorkMonths';
    direction: 'asc' | 'desc';
  }>({ key: 'nama', direction: 'asc' });

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
    let filtered = enrichedData;
    
    if (searchQuery.trim()) {
      filtered = filtered.filter((member) => 
        member.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    filtered = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'nama':
          aValue = a.nama.toLowerCase();
          bValue = b.nama.toLowerCase();
          break;
        case 'sisaLimit':
          aValue = a.sisaLimit;
          bValue = b.sisaLimit;
          break;
        case 'remainingWorkMonths':
          aValue = a.nipInfo?.remainingWorkMonths ?? Infinity;
          bValue = b.nipInfo?.remainingWorkMonths ?? Infinity;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return filtered;
  }, [searchQuery, enrichedData, sortConfig]);

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

  const handleSort = (key: 'nama' | 'sisaLimit' | 'remainingWorkMonths') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
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
              <h3 className="font-semibold text-foreground">Rumus Limit</h3>
              <p className="text-sm text-muted-foreground"><code className="px-2 py-1 rounded bg-muted font-mono">Limit = 1.3 × (Total Simpanan - Total Pinjaman)</code></p>
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
          <Input 
            placeholder="Cari nama anggota..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9" 
          />
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
          <CardDescription>
            {filteredData.length} anggota ditampilkan • 
            <span className="ml-2 text-sm">
              Diurutkan berdasarkan: 
              <span className="font-medium ml-1">
                {sortConfig.key === 'nama' && 'Nama'}
                {sortConfig.key === 'sisaLimit' && 'Sisa Limit'}
                {sortConfig.key === 'remainingWorkMonths' && 'Sisa Masa Kerja'}
                {' '}({sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'})
              </span>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">No</TableHead>
                  <TableHead className="font-semibold">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto font-semibold hover:bg-transparent"
                      onClick={() => handleSort('nama')}
                    >
                      <div className="flex items-center gap-1">
                        Nama / NIP
                        <SortIcon columnKey="nama" />
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-right">Total Simpanan</TableHead>
                  <TableHead className="font-semibold text-right">Saldo Piutang</TableHead>
                  <TableHead className="font-semibold text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto font-semibold hover:bg-transparent"
                      onClick={() => handleSort('sisaLimit')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Sisa Limit Tersedia
                        <SortIcon columnKey="sisaLimit" />
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto font-semibold hover:bg-transparent"
                      onClick={() => handleSort('remainingWorkMonths')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Sisa Masa Kerja
                        <SortIcon columnKey="remainingWorkMonths" />
                      </div>
                    </Button>
                  </TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((member, index) => (
                  <TableRow key={member.anggotaId} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => onSelectMember?.(member.anggotaId)}
                      >
                        <p className="font-medium hover:underline">{member.nama}</p>
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