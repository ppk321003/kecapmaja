import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, RefreshCw, AlertCircle, Clock, CheckCircle, XCircle, Settings, FileText, ArrowRight, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useSikostikData, formatCurrency, formatNIP, parseNIP, getRetirementStatusText } from '@/hooks/use-sikostik-data';
import { UsulPerubahan as UsulPerubahanType } from '@/types/sikostik';
import { cn } from '@/lib/utils';

export const UsulPerubahan = () => {
  const { loading, error, fetchUsulPerubahan } = useSikostikData();
  const [searchQuery, setSearchQuery] = useState('');
  const [usulData, setUsulData] = useState<UsulPerubahanType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchUsulPerubahan();
    setUsulData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    let result = usulData;
    
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }
    
    if (searchQuery.trim()) {
      result = result.filter(item => 
        item.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [usulData, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = usulData.length;
    const menunggu = usulData.filter(u => u.status === 'Menunggu').length;
    const disetujui = usulData.filter(u => u.status === 'Disetujui').length;
    const ditolak = usulData.filter(u => u.status === 'Ditolak').length;
    return { total, menunggu, disetujui, ditolak };
  }, [usulData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Menunggu':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1"><Clock className="h-3 w-3" />Menunggu</Badge>;
      case 'Disetujui':
        return <Badge variant="outline" className="border-green-500 text-green-600 gap-1"><CheckCircle className="h-3 w-3" />Disetujui</Badge>;
      case 'Ditolak':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChangeTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Cicilan': 'bg-primary/10 text-primary border-primary/30',
      'Simpanan Pokok': 'bg-accent/10 text-accent border-accent/30',
      'Simpanan Wajib': 'bg-green-100 text-green-600 border-green-300',
      'Simpanan Sukarela': 'bg-yellow-100 text-yellow-600 border-yellow-300',
      'Lainnya': 'bg-muted text-muted-foreground border-muted-foreground/30',
    };
    return <Badge variant="outline" className={cn('font-medium', colors[type] || colors['Lainnya'])}>{type}</Badge>;
  };

  const StatCard = ({ label, value, icon: Icon, color, onClick, isActive }: any) => (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isActive && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("p-3 rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );

  // Loading skeleton
  if (isLoading && usulData.length === 0) {
    return (
      <div className="space-y-6">
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          label="Total Usulan" 
          value={stats.total} 
          icon={FileText} 
          color="bg-primary/10 text-primary"
          onClick={() => setStatusFilter('all')}
          isActive={statusFilter === 'all'}
        />
        <StatCard 
          label="Menunggu" 
          value={stats.menunggu} 
          icon={Clock} 
          color="bg-yellow-100 text-yellow-600"
          onClick={() => setStatusFilter('Menunggu')}
          isActive={statusFilter === 'Menunggu'}
        />
        <StatCard 
          label="Disetujui" 
          value={stats.disetujui} 
          icon={CheckCircle} 
          color="bg-green-100 text-green-600"
          onClick={() => setStatusFilter('Disetujui')}
          isActive={statusFilter === 'Disetujui'}
        />
        <StatCard 
          label="Ditolak" 
          value={stats.ditolak} 
          icon={XCircle} 
          color="bg-destructive/10 text-destructive"
          onClick={() => setStatusFilter('Ditolak')}
          isActive={statusFilter === 'Ditolak'}
        />
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
      {!isLoading && usulData.length === 0 && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data usulan perubahan. Data diambil dari sheet usul_perubahan.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Usulan Perubahan</CardTitle>
          <CardDescription>{filteredData.length} usulan ditampilkan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Nama / NIP</TableHead>
                  <TableHead className="font-semibold">Jenis Perubahan</TableHead>
                  <TableHead className="font-semibold text-center">Perubahan Nilai</TableHead>
                  <TableHead className="font-semibold">Alasan</TableHead>
                  <TableHead className="font-semibold">Tanggal Usul</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => {
                  const isIncrease = item.nilaiBaru > item.nilaiLama;
                  const nipInfo = parseNIP(item.nip);
                  
                  return (
                    <TableRow key={item.id} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.nama}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatNIP(item.nip)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChangeTypeBadge(item.jenisPerubahan)}
                          {item.jenisPerubahan === 'Cicilan' && nipInfo?.isNearRetirement && (
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-muted-foreground">{formatCurrency(item.nilaiLama)}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className={cn('font-medium flex items-center gap-1', isIncrease ? 'text-green-600' : 'text-destructive')}>
                            {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatCurrency(item.nilaiBaru)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.alasanPerubahan}>{item.alasanPerubahan}</TableCell>
                      <TableCell>{item.tanggalUsul ? new Date(item.tanggalUsul).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm"><FileText className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Detail Usul Perubahan</DialogTitle>
                              <DialogDescription>ID: {item.id}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Pengusul</p>
                                  <p className="font-medium">{item.nama}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">NIP</p>
                                  <p className="font-mono text-sm">{formatNIP(item.nip)}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Jenis Perubahan</p>
                                  {getChangeTypeBadge(item.jenisPerubahan)}
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Status</p>
                                  {getStatusBadge(item.status)}
                                </div>
                              </div>
                              
                              {nipInfo?.isNearRetirement && item.jenisPerubahan === 'Cicilan' && (
                                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                                  <div className="flex items-center gap-2 text-yellow-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Mendekati Pensiun - {getRetirementStatusText(nipInfo.remainingWorkMonths)}</span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="p-4 rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground mb-2">Perubahan Nilai</p>
                                <div className="flex items-center gap-3">
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Nilai Lama</p>
                                    <p className="text-lg font-bold">{formatCurrency(item.nilaiLama)}</p>
                                  </div>
                                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Nilai Baru</p>
                                    <p className={cn('text-lg font-bold', isIncrease ? 'text-green-600' : 'text-destructive')}>
                                      {formatCurrency(item.nilaiBaru)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-sm text-muted-foreground">Alasan Perubahan</p>
                                <p className="font-medium">{item.alasanPerubahan}</p>
                              </div>
                              
                              {item.keterangan && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Keterangan</p>
                                  <p className="font-medium">{item.keterangan}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};