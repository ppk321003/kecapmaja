import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, RefreshCw, AlertCircle, Clock, CheckCircle, XCircle, HandCoins, FileText, AlertTriangle, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useSikostikData, formatCurrency, formatNIP, parseNIP, getRetirementStatusText } from '@/hooks/use-sikostik-data';
import { UsulPinjaman as UsulPinjamanType } from '@/types/sikostik';
import { cn } from '@/lib/utils';
import { FormPengajuanPinjaman } from './FormPengajuanPinjaman';
import { useAuth } from '@/contexts/AuthContext';

export const UsulPinjaman = () => {
  const { loading, error, fetchUsulPinjaman, updateUsulPinjamanStatus } = useSikostikData();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [usulData, setUsulData] = useState<UsulPinjamanType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);

  const isApprover = user?.role === 'Pejabat Pembuat Komitmen' || user?.role === 'operator';

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchUsulPinjaman();
    setUsulData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (proposalId: string) => {
    setIsApproving(proposalId);
    try {
      await updateUsulPinjamanStatus(proposalId, 'Disetujui');
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
      await updateUsulPinjamanStatus(proposalId, 'Ditolak');
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
        item.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [usulData, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = usulData.length;
    const proses = usulData.filter(u => u.status === 'Proses').length;
    const disetujui = usulData.filter(u => u.status === 'Disetujui').length;
    const ditolak = usulData.filter(u => u.status === 'Ditolak').length;
    const totalNilai = usulData.reduce((sum, u) => sum + u.jumlahPinjaman, 0);
    return { total, proses, disetujui, ditolak, totalNilai };
  }, [usulData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Proses':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1"><Clock className="h-3 w-3" />Proses</Badge>;
      case 'Disetujui':
        return <Badge variant="outline" className="border-green-500 text-green-600 gap-1"><CheckCircle className="h-3 w-3" />Disetujui</Badge>;
      case 'Ditolak':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const handleSubmitPinjaman = async (data: any) => {
    console.log('New loan proposal submitted:', data);
    loadData(); // Refresh data after submission
  };

  // Loading skeleton
  if (isLoading && usulData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {[1, 2, 3, 4, 5].map(i => (
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
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard 
          label="Total Usulan" 
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
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <HandCoins className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Nilai</p>
              <p className="text-xl font-bold text-accent">{formatCurrency(stats.totalNilai)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search, Refresh & Add Button */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama anggota..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajukan Pinjaman
        </Button>
      </div>

      {/* Empty State */}
      {!isLoading && usulData.length === 0 && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Belum ada data usulan pinjaman. Data diambil dari sheet usul_pinjaman.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daftar Usulan Pinjaman</CardTitle>
          <CardDescription>{filteredData.length} usulan ditampilkan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Nama / NIP</TableHead>
                  <TableHead className="font-semibold text-right">Jumlah Pinjaman</TableHead>
                  <TableHead className="font-semibold text-right">Cicilan Pokok</TableHead>
                  <TableHead className="font-semibold">Tujuan</TableHead>
                  <TableHead className="font-semibold">Tanggal Usul</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => {
                  const nipInfo = parseNIP(item.nip);
                  return (
                    <TableRow key={item.id} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.nama}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatNIP(item.nip)}</p>
                          {nipInfo?.isNearRetirement && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-600">Mendekati pensiun</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(item.jumlahPinjaman)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.cicilanPokok)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.tujuanPinjaman}>{item.tujuanPinjaman}</TableCell>
                      <TableCell>{item.tanggalUsul ? new Date(item.tanggalUsul).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm"><FileText className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Detail Usul Pinjaman</DialogTitle>
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
                                    <p className="text-sm text-muted-foreground">Jumlah Pinjaman</p>
                                    <p className="font-bold text-lg text-primary">{formatCurrency(item.jumlahPinjaman)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Cicilan/Bulan</p>
                                    <p className="font-bold">{formatCurrency(item.cicilanPokok)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Jangka Waktu</p>
                                    <p className="font-medium">{item.jangkaWaktu} bulan</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    {getStatusBadge(item.status)}
                                  </div>
                                </div>
                                
                                {nipInfo?.isNearRetirement && (
                                  <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                                    <div className="flex items-center gap-2 text-yellow-600">
                                      <AlertTriangle className="h-4 w-4" />
                                      <span className="text-sm font-medium">Mendekati Pensiun</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Sisa masa kerja: {getRetirementStatusText(nipInfo.remainingWorkMonths)}
                                    </p>
                                  </div>
                                )}
                                
                                <div>
                                  <p className="text-sm text-muted-foreground">Tujuan Pinjaman</p>
                                  <p className="font-medium">{item.tujuanPinjaman}</p>
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
                          {isApprover && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApprove(item.id)}
                                disabled={isApproving === item.id}
                                title="Setujui"
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleReject(item.id)}
                                disabled={isApproving === item.id}
                                title="Tolak"
                              >
                                <ThumbsDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <FormPengajuanPinjaman 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        onSubmit={handleSubmitPinjaman} 
      />
    </div>
  );
};