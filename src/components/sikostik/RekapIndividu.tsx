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

// Interface untuk data historis
interface HistoryData {
  id: string;
  bulan: number;
  bulanNama: string;
  tahun: number;
  pinjamanBulanIni: number;
  pengambilanPokok: number;
  pengambilanWajib: number;
  pengambilanSukarela: number;
  pengambilanLebaran: number;
  pengambilanLainnya: number;
  totalPengambilan: number;
}

export const RekapIndividu = () => {
  const { loading, error, fetchAnggotaMaster, fetchLimitAnggota, fetchRekapDashboard } = useSikostikData();
  const currentPeriod = getCurrentPeriod();
  
  const [anggotaList, setAnggotaList] = useState<AnggotaMaster[]>([]);
  const [limitList, setLimitList] = useState<LimitAnggota[]>([]);
  const [rekapList, setRekapList] = useState<RekapDashboard[]>([]);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]); // Untuk data historis
  
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

  // Fungsi untuk mengambil data historis berdasarkan tahun
  const loadHistoryData = async () => {
    if (!selectedAnggotaId || !selectedTahunHistory) return;
    
    setIsLoadingHistory(true);
    try {
      const allMonthsData: HistoryData[] = [];
      
      // Fetch data untuk semua bulan dalam tahun yang dipilih
      const fetchPromises = [];
      for (let month = 1; month <= 12; month++) {
        fetchPromises.push(fetchRekapDashboard(month, selectedTahunHistory));
      }
      
      const results = await Promise.all(fetchPromises);
      
      // Process each month's data
      results.forEach((monthData, monthIndex) => {
        const bulan = monthIndex + 1;
        const bulanNama = bulanOptions.find(b => b.value === bulan)?.label || `Bulan ${bulan}`;
        
        // Find data for selected anggota
        const anggotaData = monthData.find((item: RekapDashboard) => 
          item.anggotaId === selectedAnggotaId
        );
        
        if (anggotaData) {
          // MAPPING KOLOM YANG BENAR:
          // Berdasarkan informasi Anda:
          // - pinjaman_bulan_ini (kolom Q)
          // - pengambilan_pokok (kolom S)
          // - pengambilan_wajib (kolom T)
          // - pengambilan_sukarela (kolom U)
          // - pengambilan_lebaran (kolom V)
          // - pengambilan_lainnya (kolom W)
          
          // PERHATIAN: Anda perlu menyesuaikan nama properti di bawah ini
          // dengan nama properti yang sebenarnya di RekapDashboard
          
          // Contoh mapping (sesuaikan dengan properti aktual):
          const pinjamanBulanIni = (anggotaData as any).pinjaman_bulan_ini || 
                                  (anggotaData as any).pinjamanBulanIni || 
                                  (anggotaData as any).pinjamanBulanini || 0;
          
          const pengambilanPokok = (anggotaData as any).pengambilan_pokok || 
                                  (anggotaData as any).pengambilanPokok || 
                                  (anggotaData as any).pengambilan_pokok || 0;
          
          const pengambilanWajib = (anggotaData as any).pengambilan_wajib || 
                                  (anggotaData as any).pengambilanWajib || 
                                  (anggotaData as any).pengambilan_wajib || 0;
          
          const pengambilanSukarela = (anggotaData as any).pengambilan_sukarela || 
                                     (anggotaData as any).pengambilanSukarela || 
                                     (anggotaData as any).pengambilan_sukarela || 0;
          
          const pengambilanLebaran = (anggotaData as any).pengambilan_lebaran || 
                                    (anggotaData as any).pengambilanLebaran || 
                                    (anggotaData as any).pengambilan_lebaran || 0;
          
          const pengambilanLainnya = (anggotaData as any).pengambilan_lainnya || 
                                    (anggotaData as any).pengambilanLainnya || 
                                    (anggotaData as any).pengambilan_lainnya || 0;
          
          const totalPengambilan = pengambilanPokok + pengambilanWajib + 
                                   pengambilanSukarela + pengambilanLebaran + 
                                   pengambilanLainnya;
          
          allMonthsData.push({
            id: `history-${selectedTahunHistory}-${bulan}-${anggotaData.anggotaId}`,
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
          });
        } else {
          // Jika tidak ada data untuk bulan ini, tambahkan entry kosong
          allMonthsData.push({
            id: `empty-${selectedTahunHistory}-${bulan}`,
            bulan,
            bulanNama,
            tahun: selectedTahunHistory,
            pinjamanBulanIni: 0,
            pengambilanPokok: 0,
            pengambilanWajib: 0,
            pengambilanSukarela: 0,
            pengambilanLebaran: 0,
            pengambilanLainnya: 0,
            totalPengambilan: 0
          });
        }
      });
      
      // Sort by bulan
      allMonthsData.sort((a, b) => a.bulan - b.bulan);
      setHistoryData(allMonthsData);
    } catch (err) {
      console.error('Failed to load history data:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Optimized version
  const loadHistoryDataOptimized = async () => {
    if (!selectedAnggotaId || !selectedTahunHistory) return;
    
    setIsLoadingHistory(true);
    try {
      await loadHistoryData();
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
    if (selectedAnggotaId && selectedTahunHistory) {
      loadHistoryDataOptimized();
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

  // Prepare history data for display
  const historyDisplayData = useMemo(() => {
    // Filter data hanya untuk tahun yang dipilih
    return historyData.filter(h => h.tahun === selectedTahunHistory);
  }, [historyData, selectedTahunHistory]);

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

  // ... (bagian render tetap sama seperti sebelumnya, hanya tampilan tabel) ...

  return (
    <div className="space-y-6">
      {/* ... (header dan bagian lainnya tetap sama) ... */}

      {/* Card Riwayat Peminjaman dan Pengambilan Simpanan */}
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
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  {/* Header utama dengan colspan */}
                  <TableRow>
                    <TableHead 
                      rowSpan={2} 
                      className="text-center align-middle font-bold border-r"
                      style={{ minWidth: '100px' }}
                    >
                      Bulan/Tahun
                    </TableHead>
                    <TableHead 
                      rowSpan={2} 
                      className="text-center align-middle font-bold border-r"
                      style={{ minWidth: '120px' }}
                    >
                      Pinjaman
                    </TableHead>
                    <TableHead 
                      colSpan={5} 
                      className="text-center font-bold bg-muted/50"
                    >
                      Pengambilan Simpanan
                    </TableHead>
                  </TableRow>
                  
                  {/* Sub-header untuk pengambilan simpanan */}
                  <TableRow>
                    <TableHead className="text-center font-medium border-r" style={{ minWidth: '120px' }}>
                      Simpanan Pokok
                    </TableHead>
                    <TableHead className="text-center font-medium border-r" style={{ minWidth: '120px' }}>
                      Simpanan Wajib
                    </TableHead>
                    <TableHead className="text-center font-medium border-r" style={{ minWidth: '120px' }}>
                      Simpanan Sukarela
                    </TableHead>
                    <TableHead className="text-center font-medium border-r" style={{ minWidth: '120px' }}>
                      Simpanan Lebaran
                    </TableHead>
                    <TableHead className="text-center font-medium" style={{ minWidth: '120px' }}>
                      Simpanan Lainnya
                    </TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {historyDisplayData.map((item) => (
                    <TableRow key={item.id} 
                      className={cn(
                        "hover:bg-muted/30",
                        item.pinjamanBulanIni > 0 || item.totalPengambilan > 0 
                          ? "bg-muted/10" 
                          : ""
                      )}
                    >
                      {/* Bulan/Tahun */}
                      <TableCell className="font-medium border-r">
                        <div className="flex flex-col">
                          <span className="font-semibold">{item.bulanNama}</span>
                          <span className="text-xs text-muted-foreground">{item.tahun}</span>
                        </div>
                      </TableCell>
                      
                      {/* Pinjaman */}
                      <TableCell className={cn(
                        "text-right font-semibold border-r",
                        item.pinjamanBulanIni > 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {item.pinjamanBulanIni > 0 
                          ? formatCurrency(item.pinjamanBulanIni) 
                          : "-"}
                      </TableCell>
                      
                      {/* Pengambilan Simpanan - Pokok */}
                      <TableCell className="text-right border-r">
                        {item.pengambilanPokok > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{formatCurrency(item.pengambilanPokok)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      {/* Pengambilan Simpanan - Wajib */}
                      <TableCell className="text-right border-r">
                        {item.pengambilanWajib > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{formatCurrency(item.pengambilanWajib)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      {/* Pengambilan Simpanan - Sukarela */}
                      <TableCell className="text-right border-r">
                        {item.pengambilanSukarela > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{formatCurrency(item.pengambilanSukarela)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      {/* Pengambilan Simpanan - Lebaran */}
                      <TableCell className="text-right border-r">
                        {item.pengambilanLebaran > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{formatCurrency(item.pengambilanLebaran)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      {/* Pengambilan Simpanan - Lainnya */}
                      <TableCell className="text-right">
                        {item.pengambilanLainnya > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{formatCurrency(item.pengambilanLainnya)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-bold border-t-2">
                    <TableCell className="font-bold">
                      <div className="flex flex-col">
                        <span>TOTAL {selectedTahunHistory}</span>
                      </div>
                    </TableCell>
                    
                    {/* Total Pinjaman */}
                    <TableCell className={cn(
                      "text-right font-bold border-r",
                      yearlyTotals.pinjamanBulanIni > 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {yearlyTotals.pinjamanBulanIni > 0 
                        ? formatCurrency(yearlyTotals.pinjamanBulanIni) 
                        : "-"}
                    </TableCell>
                    
                    {/* Total Pengambilan per Kategori */}
                    <TableCell className="text-right font-bold border-r">
                      {yearlyTotals.pengambilanPokok > 0 
                        ? formatCurrency(yearlyTotals.pengambilanPokok) 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold border-r">
                      {yearlyTotals.pengambilanWajib > 0 
                        ? formatCurrency(yearlyTotals.pengambilanWajib) 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold border-r">
                      {yearlyTotals.pengambilanSukarela > 0 
                        ? formatCurrency(yearlyTotals.pengambilanSukarela) 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold border-r">
                      {yearlyTotals.pengambilanLebaran > 0 
                        ? formatCurrency(yearlyTotals.pengambilanLebaran) 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {yearlyTotals.pengambilanLainnya > 0 
                        ? formatCurrency(yearlyTotals.pengambilanLainnya) 
                        : "-"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};