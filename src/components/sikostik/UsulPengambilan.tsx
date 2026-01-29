import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { useSikostikData, formatCurrency, formatNIP } from '@/hooks/use-sikostik-data';
import { UsulPengambilan as UsulPengambilanType } from '@/types/sikostik';
import { cn } from '@/lib/utils';
import { FormPengajuanPengambilan } from './FormPengajuanPengambilan';

export const UsulPengambilan = () => {
  const { 
    loading, 
    error, 
    fetchAnggotaMaster,
    fetchRekapDashboard,
    fetchUsulPengambilan 
  } = useSikostikData();
  const [searchQuery, setSearchQuery] = useState('');
  const [usulData, setUsulData] = useState<UsulPengambilanType[]>([]);
  const [anggotaMasterData, setAnggotaMasterData] = useState([]);
  const [rekapData, setRekapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usulResult, masterResult, rekapResult] = await Promise.all([
        fetchUsulPengambilan(),
        fetchAnggotaMaster(),
        fetchRekapDashboard(),
      ]);
      setUsulData(usulResult);
      setAnggotaMasterData(masterResult);
      setRekapData(rekapResult);
    } catch (err) {
      console.error('Error loading data:', err);
    }
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
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nip.includes(searchQuery)
      );
    }
    
    return result.sort((a, b) => 
      new Date(b.tanggalUsul).getTime() - new Date(a.tanggalUsul).getTime()
    );
  }, [usulData, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: usulData.length,
      proses: usulData.filter(u => u.status === 'Proses').length,
      disetujui: usulData.filter(u => u.status === 'Disetujui').length,
      ditolak: usulData.filter(u => u.status === 'Ditolak').length,
    };
  }, [usulData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Proses':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Disetujui':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Ditolak':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header dengan tombol tambah */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Usul Pengambilan</h2>
          <p className="text-sm text-muted-foreground">
            Kelola pengajuan pengambilan simpanan anggota
          </p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajukan Pengambilan
            </Button>
          </DialogTrigger>
          <FormPengajuanPengambilan
            open={formOpen}
            onOpenChange={setFormOpen}
            onSuccess={loadData}
            anggotaMaster={anggotaMasterData}
            rekapDashboard={rekapData}
          />
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pengajuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dalam Proses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.proses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disetujui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.disetujui}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ditolak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.ditolak}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search dan Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Segarkan
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['all', 'Proses', 'Disetujui', 'Ditolak'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer',
              statusFilter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {status === 'all' ? 'Semua Status' : status}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Nama Anggota</TableHead>
                  <TableHead className="font-semibold">NIP</TableHead>
                  <TableHead className="font-semibold">Jenis Pengambilan</TableHead>
                  <TableHead className="text-right font-semibold">Jumlah</TableHead>
                  <TableHead className="font-semibold">Alasan</TableHead>
                  <TableHead className="font-semibold">Tanggal Usul</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Tidak ada data pengajuan pengambilan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatNIP(item.nip)}
                      </TableCell>
                      <TableCell className="font-medium">{item.jenisPengambilan}</TableCell>
                      <TableCell className="text-right font-semibold text-orange-600">
                        {formatCurrency(item.jumlahPengambilan)}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {item.alasanPengambilan || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.tanggalUsul 
                          ? new Date(item.tanggalUsul).toLocaleDateString('id-ID', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={cn('px-2 py-1 rounded-md text-sm font-medium inline-block', getStatusColor(item.status))}>
                          {item.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
