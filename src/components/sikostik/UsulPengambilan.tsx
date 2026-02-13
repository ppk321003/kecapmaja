import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, RefreshCw, AlertCircle, Plus, FileText, Clock, CheckCircle, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useSikostikData, formatCurrency, formatNIP } from '@/hooks/use-sikostik-data';
import { UsulPengambilan as UsulPengambilanType } from '@/types/sikostik';
import { cn } from '@/lib/utils';
import { FormPengajuanPengambilan } from './FormPengajuanPengambilan';
import { useAuth } from '@/contexts/AuthContext';

export const UsulPengambilan = () => {
  const { 
    loading, 
    error, 
    fetchAnggotaMaster,
    fetchRekapDashboard,
    fetchUsulPengambilan,
    updateUsulPengambilanStatus
  } = useSikostikData();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [usulData, setUsulData] = useState<UsulPengambilanType[]>([]);
  const [anggotaMasterData, setAnggotaMasterData] = useState([]);
  const [rekapData, setRekapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const isApprover = user?.role === 'Pejabat Pembuat Komitmen' || user?.role === 'operator';

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

  const handleApprove = async (proposalId: string) => {
    setIsApproving(proposalId);
    try {
      await updateUsulPengambilanStatus(proposalId, 'Disetujui');
      await loadData(); // Reload data after update
    } catch (err) {
      console.error('Error approving proposal:', err);
    } finally {
      setIsApproving(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    setIsApproving(proposalId);
    try {
      await updateUsulPengambilanStatus(proposalId, 'Ditolak');
      await loadData(); // Reload data after update
    } catch (err) {
      console.error('Error rejecting proposal:', err);
    } finally {
      setIsApproving(null);
    }
  };

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

      {/* Stats - Clickable Filter Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          label="Total Pengajuan" 
          value={stats.total} 
          icon={FileText} 
          color="bg-primary/10 text-primary"
          onClick={() => setStatusFilter('all')}
          isActive={statusFilter === 'all'}
        />
        <StatCard 
          label="Proses" 
          value={stats.proses} 
          icon={Clock} 
          color="bg-yellow-100 text-yellow-600"
          onClick={() => setStatusFilter('Proses')}
          isActive={statusFilter === 'Proses'}
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

      {/* Search dan Refresh */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
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
                  <TableHead className="font-semibold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm"><FileText className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Detail Usul Pengambilan</DialogTitle>
                                <DialogDescription>ID: {item.id}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Nama Anggota</p>
                                    <p className="font-medium">{item.nama}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">NIP</p>
                                    <p className="font-mono text-sm">{formatNIP(item.nip)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Jenis Pengambilan</p>
                                    <p className="font-medium">{item.jenisPengambilan}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Jumlah</p>
                                    <p className="font-bold text-lg text-orange-600">{formatCurrency(item.jumlahPengambilan)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Tanggal Usul</p>
                                    <p className="text-sm">{item.tanggalUsul ? new Date(item.tanggalUsul).toLocaleDateString('id-ID') : '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <span className={cn('px-2 py-1 rounded-md text-sm font-medium inline-block', getStatusColor(item.status))}>
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm text-muted-foreground">Alasan Pengambilan</p>
                                  <p className="font-medium">{item.alasanPengambilan || '-'}</p>
                                </div>

                                {item.keterangan && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Keterangan</p>
                                    <p className="font-medium">{item.keterangan}</p>
                                  </div>
                                )}

                                {/* Action Buttons for Approvers */}
                                {isApprover && (
                                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                    <p className="text-sm font-semibold mb-3">Aksi Persetujuan</p>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={() => handleApprove(item.id)}
                                        disabled={isApproving === item.id}
                                      >
                                        <ThumbsUp className="h-4 w-4" />
                                        Setujui
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="flex-1 gap-2"
                                        onClick={() => handleReject(item.id)}
                                        disabled={isApproving === item.id}
                                      >
                                        <ThumbsDown className="h-4 w-4" />
                                        Tolak
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                        </Dialog>
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
