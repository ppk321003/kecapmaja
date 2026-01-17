import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, CreditCard, Wallet, Clock, AlertTriangle, CheckCircle, Calendar, Building2, 
  PiggyBank, HandCoins, Receipt, Target, Award, BarChart3, RefreshCw, ChevronDown, ChevronUp,
  Banknote, PieChart, Info
} from 'lucide-react';
import { 
  useSikostikData, formatCurrency, formatPeriode, bulanOptions, getTahunOptions, 
  getCurrentPeriod, parseNIP, formatNIP, getRetirementStatusText 
} from '@/hooks/use-sikostik-data';
import { AnggotaMaster, LimitAnggota, RekapDashboard } from '@/types/sikostik';
import { cn } from '@/lib/utils';

export const RekapIndividu = () => {
  const { loading, error, fetchAnggotaMaster, fetchLimitAnggota, fetchRekapDashboard } = useSikostikData();
  const currentPeriod = getCurrentPeriod();
  
  const [anggotaList, setAnggotaList] = useState<AnggotaMaster[]>([]);
  const [limitList, setLimitList] = useState<LimitAnggota[]>([]);
  const [rekapList, setRekapList] = useState<RekapDashboard[]>([]);
  
  const [selectedAnggotaId, setSelectedAnggotaId] = useState<string>('');
  const [selectedBulan, setSelectedBulan] = useState(currentPeriod.bulan);
  const [selectedTahun, setSelectedTahun] = useState(currentPeriod.tahun);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  // Get all active members
  const activeMembers = useMemo(() => anggotaList.filter(m => m.status === 'Aktif'), [anggotaList]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load data yang tidak tergantung periode
      const [anggota, limit] = await Promise.all([
        fetchAnggotaMaster(),
        fetchLimitAnggota(),
      ]);
      
      setAnggotaList(anggota);
      setLimitList(limit);
      
      // Auto-select first active member
      const activeMembersList = anggota.filter(m => m.status === 'Aktif');
      if (!selectedAnggotaId && activeMembersList.length > 0) {
        setSelectedAnggotaId(activeMembersList[0].id || activeMembersList[0].kodeAnggota);
      }
      
      // Load data rekap berdasarkan periode awal
      await loadRekapData();
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRekapData = async () => {
    try {
      const rekap = await fetchRekapDashboard(selectedBulan, selectedTahun);
      setRekapList(rekap);
    } catch (err) {
      console.error('Failed to load rekap data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load rekap data ketika periode berubah
  useEffect(() => {
    if (selectedBulan && selectedTahun) {
      loadRekapData();
    }
  }, [selectedBulan, selectedTahun]);

  const periodeLabel = formatPeriode(selectedBulan, selectedTahun);

  // Get selected member data
  const memberData = useMemo(() => {
    const member = anggotaList.find(m => m.id === selectedAnggotaId || m.kodeAnggota === selectedAnggotaId);
    const limit = limitList.find(l => l.anggotaId === selectedAnggotaId);
    const rekap = rekapList.find(r => r.anggotaId === selectedAnggotaId);
    const nipInfo = member ? parseNIP(member.nip) : null;
    
    return { member, limit, rekap, nipInfo };
  }, [selectedAnggotaId, anggotaList, limitList, rekapList]);

  // Calculate financial analysis
  const financialAnalysis = useMemo(() => {
    const { limit, rekap } = memberData;
    if (!limit || !rekap) return null;

    const limitUtilization = (limit.sisaLimit + limit.saldoPiutang) > 0 
      ? (limit.saldoPiutang / (limit.sisaLimit + limit.saldoPiutang)) * 100 : 0;
    
    // Total Simpanan Bulanan = sum(K:O) = simpanan_pokok + wajib + sukarela + lebaran + lainlain (per bulan)
    const simpananBulanan = (rekap.totalSimpananBulanan || 0) || 
      ((rekap.simpananPokok || 0) + (rekap.simpananWajib || 0) + (rekap.simpananSukarela || 0) + 
       (rekap.simpananLebaran || 0) + (rekap.simpananLainnya || 0));
    
    // Total Potongan/Bulan = simpanan bulanan + cicilan_pokok + biaya_operasional
    const totalPotonganBulanan = simpananBulanan + (rekap.cicilanPokok || 0) + (rekap.biayaOperasional || 0);
    
    return { limitUtilization, totalPotonganBulanan, simpananBulanan };
  }, [memberData]);

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
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadInitialData}><RefreshCw className="h-4 w-4 mr-2" />Coba Lagi</Button>
      </div>
    );
  }

  if (anggotaList.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Belum ada data anggota. Pastikan data sudah diisi di sheet anggota_master.</AlertDescription>
        </Alert>
        <Button onClick={loadInitialData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Refresh Data</Button>
      </div>
    );
  }

  const { member, limit, rekap, nipInfo } = memberData;
  
  // Default values
  const safeLimit = limit || { totalSimpanan: 0, saldoPiutang: 0, limitPinjaman: 0, sisaLimit: 0 };
  const safeRekap = rekap || { 
    simpananPokok: 0, simpananWajib: 0, simpananSukarela: 0, simpananLebaran: 0, 
    simpananLainnya: 0, totalSimpanan: 0, biayaOperasional: 0, cicilanPokok: 0, saldoPiutang: 0 
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rekap Individu</h1>
          <p className="text-muted-foreground">Informasi lengkap keanggotaan dan keuangan periode {periodeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
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
          <Separator orientation="vertical" className="h-6 mx-2 hidden lg:block" />
          <Select value={selectedAnggotaId} onValueChange={setSelectedAnggotaId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Pilih Anggota" />
            </SelectTrigger>
            <SelectContent>
              {activeMembers.map((m) => (
                <SelectItem key={m.id || m.kodeAnggota} value={m.id || m.kodeAnggota}>
                  {m.nama} - {formatNIP(m.nip)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadInitialData} variant="outline" size="icon" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {!member ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Pilih anggota untuk melihat data rekap individu.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Profile Card dengan Accordion */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
                    {member.nama.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{member.nama}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={member.status === 'Aktif' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                      <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetail(!showDetail)}
                  className="h-8 px-3"
                >
                  {showDetail ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Sembunyikan Detail
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Lihat Detail
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            
            {/* Summary Stats Grid */}
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <PiggyBank className="h-4 w-4" />
                    <span>Total Simpanan</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(safeLimit.totalSimpanan)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HandCoins className="h-4 w-4" />
                    <span>Saldo Piutang</span>
                  </div>
                  <p className={cn("text-xl font-bold", safeLimit.saldoPiutang > 0 ? "text-destructive" : "text-green-600")}>
                    {formatCurrency(safeLimit.saldoPiutang)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Limit Pinjaman</span>
                  </div>
                  <p className="text-xl font-bold">
                    {formatCurrency(safeLimit.limitPinjaman)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <span>Sisa Limit</span>
                  </div>
                  <p className={cn("text-xl font-bold", safeLimit.sisaLimit > 0 ? "text-green-600" : "text-muted-foreground")}>
                    {formatCurrency(safeLimit.sisaLimit)}
                  </p>
                </div>
              </div>
            </CardContent>
            
            {/* Accordion Detail Section */}
            {showDetail && (
              <>
                <Separator />
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Kode Anggota</span>
                      </div>
                      <p className="font-semibold">{member.kodeAnggota}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Bergabung</span>
                      </div>
                      <p className="font-semibold">
                        {member.tanggalBergabung ? new Date(member.tanggalBergabung).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                    
                    {nipInfo && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Sisa Masa Kerja</span>
                          </div>
                          <p className={cn("font-semibold", nipInfo.isNearRetirement && "text-destructive")}>
                            {getRetirementStatusText(nipInfo.remainingWorkMonths)}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Pensiun</span>
                          </div>
                          <p className="font-semibold">
                            {nipInfo.retirementDate.toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {nipInfo?.isNearRetirement && (
                    <Alert className="mt-4 bg-destructive/10 border-destructive/30">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <AlertDescription className="text-destructive">
                        Anda mendekati masa pensiun. Jangka waktu pinjaman maksimal adalah {nipInfo.remainingWorkMonths} bulan.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* NIP Display */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground font-medium">NIP</p>
                    <p className="font-mono text-sm">{formatNIP(member.nip)}</p>
                  </div>
                </CardContent>
              </>
            )}
          </Card>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-primary" />
                  <CardTitle>Detail Simpanan Bulanan</CardTitle>
                </div>
                <CardDescription>Simpanan yang dipotong setiap bulan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Pokok</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananPokok)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Wajib</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananWajib)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Sukarela</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananSukarela)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Lebaran</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananLebaran)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Lain-lain</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananLainnya)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center py-2 text-lg font-bold">
                    <span>Total Simpanan/Bulan</span>
                    <span className="text-primary">
                      {formatCurrency(
                        (safeRekap.simpananPokok || 0) + (safeRekap.simpananWajib || 0) + 
                        (safeRekap.simpananSukarela || 0) + (safeRekap.simpananLebaran || 0) + 
                        (safeRekap.simpananLainnya || 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-accent" />
                  <CardTitle>Total Potongan Bulanan</CardTitle>
                </div>
                <CardDescription>Ringkasan kewajiban per bulan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Pokok</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananPokok)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Wajib</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananWajib)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Sukarela</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananSukarela)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Lebaran</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananLebaran)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Simpanan Lain-lain</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.simpananLainnya)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Cicilan Pinjaman</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.cicilanPokok)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Biaya Operasional</span>
                    <span className="font-semibold">{formatCurrency(safeRekap.biayaOperasional)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center py-2 text-lg font-bold">
                    <span>Total Potongan/Bulan</span>
                    <span className="text-accent">
                      {formatCurrency(
                        (safeRekap.simpananPokok || 0) + (safeRekap.simpananWajib || 0) + 
                        (safeRekap.simpananSukarela || 0) + (safeRekap.simpananLebaran || 0) + 
                        (safeRekap.simpananLainnya || 0) + (safeRekap.cicilanPokok || 0) + 
                        (safeRekap.biayaOperasional || 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Limit Utilization */}
          {financialAnalysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>Penggunaan Limit</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limit Terpakai</span>
                    <span className="font-medium">{financialAnalysis.limitUtilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={financialAnalysis.limitUtilization} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(safeLimit.saldoPiutang)} dari {formatCurrency(safeLimit.limitPinjaman)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};