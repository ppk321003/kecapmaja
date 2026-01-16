import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, AlertCircle, Clock, CheckCircle, XCircle, Settings, FileText, ArrowRight } from 'lucide-react';
import { useSikostikData, formatCurrency, formatNIP } from '@/hooks/use-sikostik-data';
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
                  <TableHead className="font-semibold text-right">Nilai Lama</TableHead>
                  <TableHead className="font-semibold text-center"></TableHead>
                  <TableHead className="font-semibold text-right">Nilai Baru</TableHead>
                  <TableHead className="font-semibold">Alasan</TableHead>
                  <TableHead className="font-semibold">Tanggal Usul</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={item.id} className={cn(index % 2 === 1 && 'bg-muted/30')}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.nama}</p>
                        <p className="text-xs text-muted-foreground font-mono">{formatNIP(item.nip)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Settings className="h-3 w-3" />
                        {item.jenisPerubahan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(item.nilaiLama)}</TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(item.nilaiBaru)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.alasanPerubahan}>{item.alasanPerubahan}</TableCell>
                    <TableCell>{item.tanggalUsul ? new Date(item.tanggalUsul).toLocaleDateString('id-ID') : '-'}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
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
