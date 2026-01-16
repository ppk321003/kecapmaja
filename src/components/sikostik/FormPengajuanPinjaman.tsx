import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Calculator, AlertTriangle, Clock, ArrowRight, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useSikostikData, 
  parseNIP, 
  getRetirementStatusText, 
  formatNIP, 
  formatCurrency,
  roundToThousand
} from '@/hooks/use-sikostik-data';
import { formatNumberWithSeparator, parseFormattedNumberToInt } from '@/lib/formatNumber';
import { toast } from 'sonner';
import type { AnggotaMaster, LimitAnggota, RekapDashboard } from '@/types/sikostik';

const formSchema = z.object({
  anggotaId: z.string().min(1, 'Pilih anggota'),
  jumlahPinjaman: z.number().min(100000, 'Minimal pinjaman Rp 100.000'),
  jangkaWaktu: z.number().min(1, 'Jangka waktu minimal 1 bulan').max(36, 'Maksimal 36 bulan'),
  cicilanBaru: z.number().min(0, 'Cicilan tidak boleh negatif'),
  alasan: z.string().min(10, 'Alasan minimal 10 karakter').max(500, 'Alasan maksimal 500 karakter'),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues & { cicilanPokok: number; nip: string; nama: string; totalPotongan: number }) => void;
}

export function FormPengajuanPinjaman({ open, onOpenChange, onSubmit }: Props) {
  const { user } = useAuth();
  const { fetchAnggotaMaster, fetchLimitAnggota, fetchRekapDashboard } = useSikostikData();
  
  const [anggotaList, setAnggotaList] = useState<AnggotaMaster[]>([]);
  const [limitList, setLimitList] = useState<LimitAnggota[]>([]);
  const [rekapList, setRekapList] = useState<RekapDashboard[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open && !dataLoaded) {
      Promise.all([
        fetchAnggotaMaster(),
        fetchLimitAnggota(),
        fetchRekapDashboard()
      ]).then(([anggota, limit, rekap]) => {
        setAnggotaList(anggota);
        setLimitList(limit);
        setRekapList(rekap);
        setDataLoaded(true);
      });
    }
  }, [open, dataLoaded, fetchAnggotaMaster, fetchLimitAnggota, fetchRekapDashboard]);

  // Find member matching user's anggotaId
  const findUserMember = (anggota: AnggotaMaster[], userAnggotaId: string) => {
    return anggota.find(m => 
      m.id === userAnggotaId || 
      m.kodeAnggota === userAnggotaId ||
      m.id?.toLowerCase() === userAnggotaId?.toLowerCase() ||
      m.kodeAnggota?.toLowerCase() === userAnggotaId?.toLowerCase()
    );
  };

  // Filter active members
  const activeMembers = useMemo(() => {
    return anggotaList.filter(m => m.status === 'Aktif');
  }, [anggotaList]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      anggotaId: '',
      jumlahPinjaman: 0,
      jangkaWaktu: 36,
      cicilanBaru: 0,
      alasan: '',
    },
  });

  const watchAnggotaId = form.watch('anggotaId');
  const watchJumlahPinjaman = form.watch('jumlahPinjaman');
  const watchJangkaWaktu = form.watch('jangkaWaktu');
  const watchCicilanBaru = form.watch('cicilanBaru');

  // Get member info including simpanan data
  const memberInfo = useMemo(() => {
    if (!watchAnggotaId) return null;
    
    const member = anggotaList.find(m => 
      m.id === watchAnggotaId || 
      m.kodeAnggota === watchAnggotaId
    );
    if (!member) return null;
    
    const memberId = member.id || member.kodeAnggota;
    
    const limit = limitList.find(l => 
      l.anggotaId === memberId || 
      l.anggotaId === watchAnggotaId
    );
    const rekap = rekapList.find(r => 
      r.anggotaId === memberId || 
      r.anggotaId === watchAnggotaId
    );
    
    const nipInfo = parseNIP(member.nip);
    const cicilanSaatIni = limit?.cicilanPokok || 0;
    
    return {
      member,
      limit,
      rekap,
      nipInfo,
      cicilanSaatIni,
    };
  }, [watchAnggotaId, anggotaList, limitList, rekapList]);

  // Calculate installment for new loan + existing debt
  const installmentCalc = useMemo(() => {
    if (!memberInfo?.nipInfo) return null;
    
    const { remainingWorkMonths } = memberInfo.nipInfo;
    const maxMonths = Math.max(1, Math.min(36, remainingWorkMonths));
    const actualMonths = Math.min(watchJangkaWaktu || 36, maxMonths);
    
    const existingDebt = memberInfo.limit?.saldoPiutang || 0;
    const newTotalDebt = existingDebt + (watchJumlahPinjaman || 0);
    
    const minCicilanBaru = watchJumlahPinjaman > 0 
      ? roundToThousand(newTotalDebt / actualMonths) 
      : roundToThousand(memberInfo.cicilanSaatIni);
    
    const cicilanPinjamanBaru = watchJumlahPinjaman > 0 
      ? roundToThousand(watchJumlahPinjaman / actualMonths) 
      : 0;
    
    return {
      maxMonths,
      actualMonths,
      cicilanSaatIni: roundToThousand(memberInfo.cicilanSaatIni),
      minCicilanBaru,
      cicilanPinjamanBaru,
      existingDebt,
      newTotalDebt,
      isAdjusted: remainingWorkMonths < 36,
    };
  }, [memberInfo, watchJumlahPinjaman, watchJangkaWaktu]);

  // Validate cicilan baru
  const cicilanValidation = useMemo(() => {
    if (!installmentCalc || !watchCicilanBaru) {
      return { valid: true, warnings: [] as string[] };
    }
    
    const warnings: string[] = [];
    let valid = true;
    
    if (watchCicilanBaru < installmentCalc.minCicilanBaru) {
      warnings.push(`Cicilan di bawah minimal (${formatCurrency(installmentCalc.minCicilanBaru)})`);
      valid = false;
    }
    
    if (watchCicilanBaru > 0 && installmentCalc.newTotalDebt > 0) {
      const monthsNeeded = Math.ceil(installmentCalc.newTotalDebt / watchCicilanBaru);
      
      if (monthsNeeded > 36) {
        warnings.push(`Jangka waktu ${monthsNeeded} bulan melebihi maksimal 36 bulan`);
      }
      
      if (memberInfo?.nipInfo && monthsNeeded > memberInfo.nipInfo.remainingWorkMonths) {
        warnings.push(`Jangka waktu ${monthsNeeded} bulan melebihi sisa masa kerja (${memberInfo.nipInfo.remainingWorkMonths} bulan)`);
      }
    }
    
    return { valid, warnings };
  }, [watchCicilanBaru, installmentCalc, memberInfo]);

  // Calculate total deductions
  const simpatik28Calc = useMemo(() => {
    if (!memberInfo) return null;
    
    const { rekap } = memberInfo;
    const cicilanPinjaman = roundToThousand(watchCicilanBaru || memberInfo.cicilanSaatIni || 0);
    
    const breakdown = {
      simpananPokok: rekap?.simpananPokok || 0,
      simpananWajib: rekap?.simpananWajib || 0,
      simpananSukarela: rekap?.simpananSukarela || 0,
      simpananLebaran: rekap?.simpananLebaran || 0,
      simpananLainnya: rekap?.simpananLainnya || 0,
      cicilanPokok: cicilanPinjaman,
      biayaOperasional: rekap?.biayaOperasional || 0,
    };
    
    const totalPotongan = roundToThousand(
      breakdown.simpananPokok +
      breakdown.simpananWajib +
      breakdown.simpananSukarela +
      breakdown.simpananLebaran +
      breakdown.simpananLainnya +
      breakdown.cicilanPokok +
      breakdown.biayaOperasional
    );
    
    return {
      breakdown,
      totalPotongan,
    };
  }, [memberInfo, watchCicilanBaru]);

  // Validate loan against limit
  const loanValidation = useMemo(() => {
    if (!memberInfo?.limit || !watchJumlahPinjaman) return { valid: true, message: '' };
    
    const sisaLimit = memberInfo.limit.sisaLimit;
    if (watchJumlahPinjaman > sisaLimit) {
      return {
        valid: false,
        message: `Jumlah pinjaman melebihi sisa limit (${formatCurrency(sisaLimit)})`,
      };
    }
    
    return { valid: true, message: '' };
  }, [memberInfo, watchJumlahPinjaman]);

  const handleSetMinimumCicilan = () => {
    if (installmentCalc) {
      form.setValue('cicilanBaru', installmentCalc.minCicilanBaru);
    }
  };

  const handleSubmit = (data: FormValues) => {
    if (!memberInfo || !installmentCalc || !simpatik28Calc) return;
    
    onSubmit({
      ...data,
      jangkaWaktu: installmentCalc.actualMonths,
      cicilanPokok: data.cicilanBaru,
      nip: memberInfo.member.nip,
      nama: memberInfo.member.nama,
      totalPotongan: simpatik28Calc.totalPotongan,
    });
    
    toast.success('Pengajuan pinjaman berhasil disubmit!');
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Form Pengajuan Pinjaman</DialogTitle>
          <DialogDescription>
            Ajukan pinjaman baru ke koperasi. Persetujuan memerlukan approval dari Sekretaris, Bendahara, dan Ketua.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Anggota Selection */}
            <FormField
              control={form.control}
              name="anggotaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilih Anggota</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih anggota..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeMembers.map((member) => (
                        <SelectItem key={member.id || member.kodeAnggota} value={member.id || member.kodeAnggota}>
                          {member.nama} - {formatNIP(member.nip)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Member Info Card */}
            {memberInfo && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-semibold text-sm">Informasi Anggota</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">NIP</p>
                    <p className="font-mono">{formatNIP(memberInfo.member.nip)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sisa Limit Pinjaman</p>
                    <p className="font-semibold text-primary">
                      {memberInfo.limit ? formatCurrency(memberInfo.limit.sisaLimit) : '-'}
                    </p>
                  </div>
                  {memberInfo.nipInfo && (
                    <>
                      <div>
                        <p className="text-muted-foreground">Masa Kerja Tersisa</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{getRetirementStatusText(memberInfo.nipInfo.remainingWorkMonths)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Maks Jangka Waktu</p>
                        <Badge variant={memberInfo.nipInfo.isNearRetirement ? 'destructive' : 'secondary'}>
                          {Math.min(36, memberInfo.nipInfo.remainingWorkMonths)} bulan
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                
                {memberInfo.nipInfo?.isNearRetirement && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-700">
                      Anggota mendekati masa pensiun. Jangka waktu pinjaman disesuaikan ke sisa masa kerja.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Jumlah Pinjaman */}
            <FormField
              control={form.control}
              name="jumlahPinjaman"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah Pinjaman</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Masukkan jumlah pinjaman"
                      value={formatNumberWithSeparator(field.value)}
                      onChange={(e) => {
                        const parsed = parseFormattedNumberToInt(e.target.value);
                        field.onChange(parsed);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {memberInfo?.limit && `Sisa limit: ${formatCurrency(memberInfo.limit.sisaLimit)}`}
                  </FormDescription>
                  <FormMessage />
                  {!loanValidation.valid && (
                    <p className="text-sm text-destructive">{loanValidation.message}</p>
                  )}
                </FormItem>
              )}
            />

            {/* Jangka Waktu */}
            <FormField
              control={form.control}
              name="jangkaWaktu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jangka Waktu (Bulan)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={installmentCalc?.maxMonths || 36}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    {installmentCalc?.isAdjusted
                      ? `Maksimal ${installmentCalc.maxMonths} bulan (disesuaikan dengan sisa masa kerja)`
                      : 'Maksimal 36 bulan'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Installment Calculation */}
            {installmentCalc && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Kalkulasi Cicilan</h4>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <p className="text-sm text-muted-foreground mb-3 text-center">Perbandingan Cicilan</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Cicilan Saat Ini</p>
                      <p className="text-xl font-bold">{formatCurrency(installmentCalc.cicilanSaatIni)}</p>
                      <p className="text-xs text-muted-foreground">
                        (Hutang: {formatCurrency(installmentCalc.existingDebt)})
                      </p>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Cicilan Minimal Baru</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(installmentCalc.minCicilanBaru)}</p>
                      <p className="text-xs text-muted-foreground">
                        (Total Hutang: {formatCurrency(installmentCalc.newTotalDebt)})
                      </p>
                    </div>
                  </div>
                </div>
                
                {watchJumlahPinjaman > 0 && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Pinjaman Baru</p>
                      <p className="font-bold text-lg">{formatCurrency(watchJumlahPinjaman)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Jangka Waktu</p>
                      <p className="font-bold text-lg">{installmentCalc.actualMonths} bulan</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cicilan Pinjaman Baru</p>
                      <p className="font-bold text-lg text-accent">{formatCurrency(installmentCalc.cicilanPinjamanBaru)}</p>
                    </div>
                  </div>
                )}
                
                {installmentCalc.isAdjusted && (
                  <p className="text-xs text-yellow-600 text-center">
                    * Jangka waktu disesuaikan dengan sisa masa kerja ({installmentCalc.maxMonths} bulan)
                  </p>
                )}
              </div>
            )}

            {/* Cicilan Baru Input */}
            <FormField
              control={form.control}
              name="cicilanBaru"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Cicilan Pinjaman Baru (per bulan)</FormLabel>
                    {installmentCalc && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSetMinimumCicilan}
                      >
                        Set Minimal
                      </Button>
                    )}
                  </div>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Masukkan cicilan yang diinginkan"
                      value={formatNumberWithSeparator(field.value)}
                      onChange={(e) => {
                        const parsed = parseFormattedNumberToInt(e.target.value);
                        field.onChange(parsed);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimal: {installmentCalc ? formatCurrency(installmentCalc.minCicilanBaru) : '-'}
                  </FormDescription>
                  <FormMessage />
                  {cicilanValidation.warnings.length > 0 && (
                    <div className="space-y-1">
                      {cicilanValidation.warnings.map((warning, idx) => (
                        <Alert key={idx} variant="destructive" className="py-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </FormItem>
              )}
            />

            {/* Total Deduction Summary */}
            {simpatik28Calc && watchCicilanBaru > 0 && (
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-accent" />
                  <h4 className="font-semibold">Total Potongan Sikostik28</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cicilan Pokok</span>
                    <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.cicilanPokok)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Simpanan Pokok</span>
                    <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.simpananPokok)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Simpanan Wajib</span>
                    <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.simpananWajib)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Simpanan Sukarela</span>
                    <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.simpananSukarela)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Simpanan Lebaran</span>
                    <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.simpananLebaran)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Simpanan Lain-lain</span>
                    <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.simpananLainnya)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biaya Operasional</span>
                    <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.biayaOperasional)}</span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-accent/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Total Potongan/Bulan</span>
                    <span className="font-bold text-xl text-accent">{formatCurrency(simpatik28Calc.totalPotongan)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Alasan */}
            <FormField
              control={form.control}
              name="alasan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alasan Pengajuan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jelaskan alasan pengajuan pinjaman..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={!loanValidation.valid || !cicilanValidation.valid || !memberInfo || watchCicilanBaru === 0}
              >
                Ajukan Pinjaman
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
