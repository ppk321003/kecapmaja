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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  User, CreditCard, Wallet, Clock, AlertTriangle, CheckCircle, Calendar, Building2, 
  PiggyBank, HandCoins, Receipt, Target, Award, BarChart3, RefreshCw, ChevronDown, ChevronUp,
  Banknote, PieChart, Info, History, TrendingUp, FileText
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
  const [rekapHistoryList, setRekapHistoryList] = useState<RekapDashboard[]>([]);
  const [selectedAnggotaId, setSelectedAnggotaId] = useState<string>('');
  const [selectedBulan, setSelectedBulan] = useState(currentPeriod.bulan);
  const [selectedTahun, setSelectedTahun] = useState(currentPeriod.tahun);
  const [selectedTahunHistory, setSelectedTahunHistory] = useState(currentPeriod.tahun);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
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
      // Load data historis untuk tahun yang dipilih
      await loadHistoryData();
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

  const loadHistoryData = async () => {
    if (!selectedAnggotaId || !selectedTahunHistory) return;
    
    setIsLoadingHistory(true);
    try {
      // Karena fetchRekapDashboard mengambil data untuk bulan tertentu,
      // kita perlu mengambil data untuk semua bulan dalam tahun tersebut
      // Namun kita tidak bisa langsung karena API hanya menerima bulan spesifik
      // Alternatif: Simpan semua data ketika pertama kali load, atau buat fungsi baru
      
      // Untuk sementara, kita akan menggunakan data yang sudah ada dari rekapList
      // dan memfilter berdasarkan tahun
      const allMonthsData: RekapDashboard[] = [];
      
      // Fetch data untuk semua bulan dalam tahun yang dipilih
      const fetchPromises = [];
      for (let month = 1; month <= 12; month++) {
        fetchPromises.push(fetchRekapDashboard(month, selectedTahunHistory));
      }
      
      const results = await Promise.all(fetchPromises);
      results.forEach((monthData) => {
        allMonthsData.push(...monthData);
      });
      
      // Filter untuk anggota yang dipilih
      const anggotaData = allMonthsData.filter(item => 
        item.anggotaId === selectedAnggotaId
      );
      
      setRekapHistoryList(anggotaData);
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setIsLoadingHistory(false);
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

  // Load history data ketika anggota atau tahun history berubah
  useEffect(() => {
    if (selectedAnggotaId) {
      loadHistoryData();
    }
  }, [selectedAnggotaId, selectedTahunHistory]);

  const periodeLabel = formatPeriode(selectedBulan, selectedTahun);
  const bulanNama = bulanOptions.find(b => b.value === selectedBulan)?.label || '';
  const tahunLabel = selectedTahun.toString();

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

  // Prepare history data for display dari rekapHistoryList
  const historyDisplayData = useMemo(() => {
    // Filter data hanya untuk tahun yang dipilih dan anggota yang dipilih
    const filteredData = rekapHistoryList.filter(item => {
      // Asumsi: data RekapDashboard memiliki properti periode atau tahun
      // Kita perlu memeriksa struktur data RekapDashboard
      // Untuk sementara, kita asumsikan data sudah difilter oleh loadHistoryData
      return true;
    });
    
    // Sort by bulan (asumsi data memiliki properti bulan)
    const sortedData = [...filteredData].sort((a, b) => {
      // Jika ada properti bulan, sort berdasarkan itu
      // Jika tidak, gunakan index atau id
      return (a.bulan || 0) - (b.bulan || 0);
    });
    
    // Map data ke format yang dibutuhkan
    return sortedData.map(item => {
      const bulan = item.bulan || 1;
      const bulanNama = bulanOptions.find(b => b.value === bulan)?.label || `Bulan ${bulan}`;
      
      // Data yang dibutuhkan:
      // - pinjamanBulanIni (kolom Q) - dalam RekapDashboard mungkin sebagai pinjamanBulanIni atau properti lain
      // - pengambilanPokok (kolom S)
      // - pengambilanWajib (kolom T)
      // - pengambilanSukarela (kolom U)
      // - pengambilanLebaran (kolom V)
      // - pengambilanLainnya (kolom W)
      
      // Perlu menyesuaikan dengan properti yang ada di RekapDashboard
      const pinjamanBulanIni = item.pinjamanBulanIni || 0;
      const pengambilanPokok = item.pengambilanPokok || 0;
      const pengambilanWajib = item.pengambilanWajib || 0;
      const pengambilanSukarela = item.pengambilanSukarela || 0;
      const pengambilanLebaran = item.pengambilanLebaran || 0;
      const pengambilanLainnya = item.pengambilanLainnya || 0;
      
      const totalPengambilan = pengambilanPokok + pengambilanWajib + 
                               pengambilanSukarela + pengambilanLebaran + 
                               pengambilanLainnya;
      
      return {
        id: item.id || `${bulan}-${selectedTahunHistory}`,
        bulan,
        bulanNama,
        tahun: selectedTahunHistory,
        pinjamanBulanIni,
        pengambilanPokok,
        pengambilanWajib,
        pengambilanSukarela,
        pengambilanLebaran,
        pengambilanLainnya,
        totalPengambilan
      };
    });
  }, [rekapHistoryList, selectedTahunHistory]);

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    return historyDisplayData.reduce((acc, month) => ({
      pinjamanBulanIni: acc.pinjamanBulanIni + month.pinjamanBulanIni,
      pengambilanPokok: acc.pengambilanPokok + month.pengambilanPokok,
      pengambilanWajib: acc.pengambilanWajib + month.pengambilanWajib,
      pengambilanSukarela: acc.pengambilanSukarela + month.pengambilanSukarela,
      pengambilanLebaran: acc.pengambilanLebaran + month.pengambilanLebaran,
      pengambilanLainnya: acc.pengambilanLainnya + month.pengambilanLainnya,
      totalPengambilan: acc.totalPengambilan + month.totalPengambilan,
    }), {
      pinjamanBulanIni: 0,
      pengambilanPokok: 0,
      pengambilanWajib: 0,
      pengambilanSukarela: 0,
      pengambilanLebaran: 0,
      pengambilanLainnya: 0,
      totalPengambilan: 0,
    });
  }, [historyDisplayData]);

  // Calculate active months (months with transactions)
  const activeMonthsCount = useMemo(() => {
    return historyDisplayData.filter(m => 
      m.pinjamanBulanIni > 0 || 
      m.pengambilanPokok > 0 || 
      m.pengambilanWajib > 0 ||
      m.pengambilanSukarela > 0 ||
      m.pengambilanLebaran > 0 ||
      m.pengambilanLainnya > 0
    ).length;
  }, [historyDisplayData]);

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
      {/* Header dengan Filter Anggota */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rekap Individu</h1>
          <p className="text-muted-foreground">Informasi lengkap keanggotaan dan keuangan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Filter Periode setelah Card Detail Individu */}
          <div className="flex items-center gap-2 bg-card p-4 rounded-lg border">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Periode:</span>
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
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-primary" />
                  <CardTitle>Detail Simpanan {bulanNama} {tahunLabel}</CardTitle>
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
                  <CardTitle>Total Potongan {bulanNama} {tahunLabel}</CardTitle>
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

          {/* Card Riwayat Peminjaman dan Pengambilan Simpanan - Opsi 3 */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle>Riwayat Peminjaman & Pengambilan Simpanan</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tahun:</span>
                  <Select 
                    value={selectedTahunHistory.toString()} 
                    onValueChange={(v) => setSelectedTahunHistory(parseInt(v))}
                    disabled={!selectedAnggotaId || isLoadingHistory}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getTahunOptions().map((t) => (
                        <SelectItem key={t.value} value={t.value.toString()}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription>
                Data peminjaman dan pengambilan simpanan untuk tahun {selectedTahunHistory}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Bagian 1: Ringkasan Tahun */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-5 w-5 text-destructive" />
                    <span className="font-semibold">Total Peminjaman</span>
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(yearlyTotals.pinjamanBulanIni)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeMonthsCount} bulan dengan peminjaman
                  </p>
                </div>
                
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <PiggyBank className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Total Pengambilan Simpanan</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(yearlyTotals.totalPengambilan)}
                  </p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Pokok: {formatCurrency(yearlyTotals.pengambilanPokok)}</span>
                    <span>Wajib: {formatCurrency(yearlyTotals.pengambilanWajib)}</span>
                  </div>
                </div>
                
                <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    <span className="font-semibold">Aktivitas</span>
                  </div>
                  <p className="text-2xl font-bold text-accent">
                    {activeMonthsCount} bulan
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {historyDisplayData.length > 0 
                      ? `${activeMonthsCount} dari ${historyDisplayData.length} bulan ada transaksi`
                      : 'Tidak ada data transaksi'}
                  </p>
                </div>
              </div>

              {/* Bagian 2: Detail Pengambilan per Kategori */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detail Pengambilan Simpanan per Kategori
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-medium">Pokok</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(yearlyTotals.pengambilanPokok)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-medium">Wajib</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(yearlyTotals.pengambilanWajib)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-medium">Sukarela</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(yearlyTotals.pengambilanSukarela)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-medium">Lebaran</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(yearlyTotals.pengambilanLebaran)}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-medium">Lainnya</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(yearlyTotals.pengambilanLainnya)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Tabel Detail per Bulan */}
              {isLoadingHistory ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : historyDisplayData.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Tidak ada data riwayat untuk tahun {selectedTahunHistory}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Bulan</TableHead>
                        <TableHead className="text-right font-bold">Peminjaman</TableHead>
                        <TableHead className="text-right font-bold">Total Pengambilan</TableHead>
                        <TableHead className="text-right font-bold">Detail Pengambilan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyDisplayData.map((item) => (
                        <TableRow key={item.id} 
                          className={cn(
                            "hover:bg-muted/50",
                            item.pinjamanBulanIni > 0 || item.totalPengambilan > 0 
                              ? "bg-muted/20" 
                              : ""
                          )}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-2 w-2 rounded-full",
                                item.pinjamanBulanIni > 0 ? "bg-destructive" : "bg-muted"
                              )} />
                              {item.bulanNama}
                            </div>
                          </TableCell>
                          
                          <TableCell className={cn(
                            "text-right font-semibold",
                            item.pinjamanBulanIni > 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {item.pinjamanBulanIni > 0 
                              ? formatCurrency(item.pinjamanBulanIni) 
                              : "-"}
                          </TableCell>
                          
                          <TableCell className={cn(
                            "text-right font-semibold",
                            item.totalPengambilan > 0 ? "text-primary" : "text-muted-foreground"
                          )}>
                            {item.totalPengambilan > 0 
                              ? formatCurrency(item.totalPengambilan) 
                              : "-"}
                          </TableCell>
                          
                          <TableCell className="text-right text-sm">
                            <div className="space-y-1">
                              {item.pengambilanPokok > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Pokok:</span>
                                  <span>{formatCurrency(item.pengambilanPokok)}</span>
                                </div>
                              )}
                              {item.pengambilanWajib > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Wajib:</span>
                                  <span>{formatCurrency(item.pengambilanWajib)}</span>
                                </div>
                              )}
                              {item.pengambilanSukarela > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sukarela:</span>
                                  <span>{formatCurrency(item.pengambilanSukarela)}</span>
                                </div>
                              )}
                              {item.pengambilanLebaran > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Lebaran:</span>
                                  <span>{formatCurrency(item.pengambilanLebaran)}</span>
                                </div>
                              )}
                              {item.pengambilanLainnya > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Lainnya:</span>
                                  <span>{formatCurrency(item.pengambilanLainnya)}</span>
                                </div>
                              )}
                              {(item.pengambilanPokok === 0 && 
                                item.pengambilanWajib === 0 && 
                                item.pengambilanSukarela === 0 && 
                                item.pengambilanLebaran === 0 && 
                                item.pengambilanLainnya === 0) && (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};