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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { ArrowRight, TrendingUp, TrendingDown, AlertTriangle, Clock, Calculator, Receipt } from 'lucide-react';
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

type ChangeType = 'Cicilan' | 'Simpanan Pokok' | 'Simpanan Wajib' | 'Simpanan Sukarela' | 'Lainnya';

const changeTypes: { value: ChangeType; label: string }[] = [
  { value: 'Cicilan', label: 'Cicilan Pinjaman' },
  { value: 'Simpanan Pokok', label: 'Simpanan Pokok' },
  { value: 'Simpanan Wajib', label: 'Simpanan Wajib' },
  { value: 'Simpanan Sukarela', label: 'Simpanan Sukarela' },
  { value: 'Lainnya', label: 'Lainnya' },
];

const formSchema = z.object({
  anggotaId: z.string().min(1, 'Pilih anggota'),
  jenisPerubahan: z.enum(['Cicilan', 'Simpanan Pokok', 'Simpanan Wajib', 'Simpanan Sukarela', 'Lainnya']),
  nilaiBaru: z.number().min(0, 'Nilai harus positif'),
  alasan: z.string().min(10, 'Alasan minimal 10 karakter').max(500, 'Alasan maksimal 500 karakter'),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues & { nilaiLama: number; nip: string; nama: string; totalPotongan?: number }) => void;
}

export function FormPengajuanPerubahan({ open, onOpenChange, onSubmit }: Props) {
  const { user } = useAuth();
  const { fetchAnggotaMaster, fetchLimitAnggota, fetchRekapDashboard, submitUsulPerubahan } = useSikostikData();
  
  const [anggotaList, setAnggotaList] = useState<AnggotaMaster[]>([]);
  const [limitList, setLimitList] = useState<LimitAnggota[]>([]);
  const [rekapList, setRekapList] = useState<RekapDashboard[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<FormValues | null>(null);

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

  // Filter active members
  const activeMembers = useMemo(() => {
    return anggotaList.filter(m => m.status === 'Aktif');
  }, [anggotaList]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      anggotaId: '',
      jenisPerubahan: 'Simpanan Sukarela',
      nilaiBaru: 0,
      alasan: '',
    },
  });

  const watchAnggotaId = form.watch('anggotaId');
  const watchJenisPerubahan = form.watch('jenisPerubahan');
  const watchNilaiBaru = form.watch('nilaiBaru');

  // Get member info
  const memberInfo = useMemo(() => {
    if (!watchAnggotaId) return null;
    
    const member = anggotaList.find(m => 
      m.id === watchAnggotaId || 
      m.kodeAnggota === watchAnggotaId
    );
    if (!member) return null;
    
    const memberId = member.id || member.kodeAnggota;
    
    const rekap = rekapList.find(r => 
      r.anggotaId === memberId || 
      r.anggotaId === watchAnggotaId
    );
    const limit = limitList.find(l => 
      l.anggotaId === memberId || 
      l.anggotaId === watchAnggotaId
    );
    
    const nipInfo = parseNIP(member.nip);
    
    return {
      member,
      rekap,
      limit,
      nipInfo,
    };
  }, [watchAnggotaId, anggotaList, rekapList, limitList]);

  // Calculate current installment and minimum - Cicilan Saat Ini = cicilan_pokok (kolom R)
  const cicilanInfo = useMemo(() => {
    if (!memberInfo?.nipInfo || !memberInfo?.limit) {
      return { currentCicilan: 0, minCicilan: 0, installmentMonths: 36, saldoPiutang: 0 };
    }

    const { remainingWorkMonths } = memberInfo.nipInfo;
    const saldoPiutang = memberInfo.limit.saldoPiutang;
    const installmentMonths = Math.max(1, Math.min(36, remainingWorkMonths));
    
    const minCicilan = saldoPiutang > 0 ? roundToThousand(saldoPiutang / installmentMonths) : 0;
    // Cicilan Saat Ini dari rekap (kolom R) atau limit
    const currentCicilan = memberInfo.rekap?.cicilanPokok || memberInfo.limit.cicilanPokok || 0;
    
    return { currentCicilan, minCicilan, installmentMonths, saldoPiutang };
  }, [memberInfo]);

  // Get current value based on change type
  const currentValue = useMemo(() => {
    if (!memberInfo?.rekap) return 0;
    
    const rekap = memberInfo.rekap;
    
    switch (watchJenisPerubahan) {
      case 'Cicilan':
        return cicilanInfo.currentCicilan;
      case 'Simpanan Pokok':
        return rekap.simpananPokok || 0;
      case 'Simpanan Wajib':
        return rekap.simpananWajib || 0;
      case 'Simpanan Sukarela':
        return rekap.simpananSukarela || 0;
      case 'Lainnya':
        return rekap.simpananLainnya || 0;
      default:
        return 0;
    }
  }, [memberInfo, watchJenisPerubahan, cicilanInfo]);

  // Validate cicilan change
  const cicilanValidation = useMemo(() => {
    if (watchJenisPerubahan !== 'Cicilan') {
      return { valid: true, warnings: [] as string[], hasWarnings: false };
    }

    const { minCicilan, saldoPiutang, installmentMonths } = cicilanInfo;
    const warnings: string[] = [];
    let valid = true;

    if (saldoPiutang <= 0) {
      return { valid: true, warnings: ['Tidak ada hutang yang perlu dicicil'], hasWarnings: false };
    }

    if (watchNilaiBaru > 0 && watchNilaiBaru < minCicilan) {
      warnings.push(`Cicilan di bawah minimal (${formatCurrency(minCicilan)})`);
      valid = false;
    }

    if (watchNilaiBaru > 0 && saldoPiutang > 0) {
      const monthsNeeded = Math.ceil(saldoPiutang / watchNilaiBaru);
      
      if (monthsNeeded > 36) {
        warnings.push(`Jangka waktu ${monthsNeeded} bulan melebihi maksimal 36 bulan`);
      }
      
      if (memberInfo?.nipInfo && monthsNeeded > memberInfo.nipInfo.remainingWorkMonths) {
        warnings.push(`Jangka waktu ${monthsNeeded} bulan melebihi sisa masa kerja (${memberInfo.nipInfo.remainingWorkMonths} bulan)`);
      }
    }

    return { valid, warnings, hasWarnings: warnings.length > 0 };
  }, [watchJenisPerubahan, watchNilaiBaru, cicilanInfo, memberInfo]);

  const handleSetMinimumCicilan = () => {
    if (cicilanInfo.minCicilan > 0) {
      form.setValue('nilaiBaru', cicilanInfo.minCicilan);
    }
  };

  // Calculate total deductions
  const simpatik28Calc = useMemo(() => {
    if (!memberInfo) return null;
    
    const { rekap } = memberInfo;
    
    let cicilanPokok = rekap?.cicilanPokok || 0;
    if (watchJenisPerubahan === 'Cicilan' && watchNilaiBaru > 0) {
      cicilanPokok = roundToThousand(watchNilaiBaru);
    }
    
    const simpananPokok = watchJenisPerubahan === 'Simpanan Pokok' && watchNilaiBaru > 0 
      ? watchNilaiBaru 
      : (rekap?.simpananPokok || 0);
    const simpananWajib = watchJenisPerubahan === 'Simpanan Wajib' && watchNilaiBaru > 0 
      ? watchNilaiBaru 
      : (rekap?.simpananWajib || 0);
    const simpananSukarela = watchJenisPerubahan === 'Simpanan Sukarela' && watchNilaiBaru > 0 
      ? watchNilaiBaru 
      : (rekap?.simpananSukarela || 0);
    const simpananLainnya = watchJenisPerubahan === 'Lainnya' && watchNilaiBaru > 0 
      ? watchNilaiBaru 
      : (rekap?.simpananLainnya || 0);
    
    const breakdown = {
      simpananPokok,
      simpananWajib,
      simpananSukarela,
      simpananLebaran: rekap?.simpananLebaran || 0,
      simpananLainnya,
      cicilanPokok,
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
  }, [memberInfo, watchJenisPerubahan, watchNilaiBaru]);

  const hasValidationWarnings = !cicilanValidation.valid;

  const handleFormSubmit = (data: FormValues) => {
    if (hasValidationWarnings) {
      setPendingSubmit(data);
      setShowWarningDialog(true);
    } else {
      executeSubmit(data);
    }
  };

  const executeSubmit = async (data: FormValues) => {
    if (!memberInfo) return;
    
    // Submit to Google Sheets
    const result = await submitUsulPerubahan({
      anggotaId: memberInfo.member.id || memberInfo.member.kodeAnggota,
      nama: memberInfo.member.nama,
      nip: memberInfo.member.nip,
      jenisPerubahan: data.jenisPerubahan,
      nilaiLama: currentValue,
      nilaiBaru: data.nilaiBaru,
      alasanPerubahan: data.alasan,
    });

    if (result.success) {
      onSubmit({
        ...data,
        nilaiLama: currentValue,
        nip: memberInfo.member.nip,
        nama: memberInfo.member.nama,
        totalPotongan: simpatik28Calc?.totalPotongan,
      });
      
      toast.success('Pengajuan perubahan berhasil disubmit!');
      form.reset();
      onOpenChange(false);
    } else {
      toast.error('Gagal menyimpan pengajuan: ' + result.error);
    }
  };

  const handleConfirmWarning = () => {
    if (pendingSubmit) {
      executeSubmit(pendingSubmit);
    }
    setShowWarningDialog(false);
    setPendingSubmit(null);
  };

  const isIncrease = watchNilaiBaru > currentValue;
  const difference = watchNilaiBaru - currentValue;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Form Pengajuan Perubahan</DialogTitle>
            <DialogDescription>
              Ajukan perubahan cicilan atau simpanan. Perubahan akan direview oleh pengurus.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
                      <p className="text-muted-foreground">Saldo Piutang</p>
                      <p className="font-semibold text-primary">
                        {memberInfo.limit ? formatCurrency(memberInfo.limit.saldoPiutang) : '-'}
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
                          <p className="text-muted-foreground">Maks Jangka Pelunasan</p>
                          <Badge variant={memberInfo.nipInfo.isNearRetirement ? 'destructive' : 'secondary'}>
                            {cicilanInfo.installmentMonths} bulan
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {memberInfo.nipInfo?.isNearRetirement && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700">
                        Anggota mendekati masa pensiun. Cicilan minimal dihitung berdasarkan sisa masa kerja.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Jenis Perubahan */}
              <FormField
                control={form.control}
                name="jenisPerubahan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jenis Perubahan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis perubahan..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {changeTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Kalkulasi Cicilan Box - Show for all change types when member is selected */}
              {memberInfo && watchJenisPerubahan && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">
                      {watchJenisPerubahan === 'Cicilan' ? 'Kalkulasi Cicilan' : 'Informasi Perubahan'}
                    </h4>
                  </div>
                  
                  {watchJenisPerubahan === 'Cicilan' && cicilanInfo.saldoPiutang > 0 ? (
                    <>
                      <div className="p-3 rounded-lg bg-muted/30 border">
                        <p className="text-sm text-muted-foreground mb-3 text-center">Perbandingan Cicilan</p>
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Cicilan Saat Ini</p>
                            <p className="text-xl font-bold">{formatCurrency(cicilanInfo.currentCicilan)}</p>
                          </div>
                          <ArrowRight className="h-6 w-6 text-muted-foreground" />
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Cicilan Baru</p>
                            <p className={`text-xl font-bold ${isIncrease ? 'text-green-600' : watchNilaiBaru > 0 ? 'text-destructive' : ''}`}>
                              {formatCurrency(roundToThousand(watchNilaiBaru))}
                            </p>
                          </div>
                          {watchNilaiBaru > 0 && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Selisih</p>
                              <div className={`flex items-center gap-1 ${isIncrease ? 'text-green-600' : 'text-destructive'}`}>
                                {isIncrease ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                <p className="text-lg font-bold">
                                  {isIncrease ? '+' : ''}{formatCurrency(difference)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Saldo Piutang</p>
                          <p className="font-bold text-lg">{formatCurrency(cicilanInfo.saldoPiutang)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Jangka Pelunasan</p>
                          <p className="font-bold text-lg">{cicilanInfo.installmentMonths} bulan</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Cicilan Minimal</p>
                          <p className="font-bold text-lg text-yellow-600">{formatCurrency(cicilanInfo.minCicilan)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <p className="text-sm text-muted-foreground mb-3 text-center">Perubahan Nilai</p>
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Nilai Saat Ini</p>
                          <p className="text-xl font-bold">{formatCurrency(currentValue)}</p>
                        </div>
                        <ArrowRight className="h-6 w-6 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Nilai Baru</p>
                          <p className={`text-xl font-bold ${isIncrease ? 'text-green-600' : watchNilaiBaru > 0 && watchNilaiBaru < currentValue ? 'text-destructive' : ''}`}>
                            {formatCurrency(watchNilaiBaru)}
                          </p>
                        </div>
                        {watchNilaiBaru > 0 && (
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Selisih</p>
                            <div className={`flex items-center gap-1 ${isIncrease ? 'text-green-600' : 'text-destructive'}`}>
                              {isIncrease ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              <p className="text-lg font-bold">
                                {isIncrease ? '+' : ''}{formatCurrency(difference)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Nilai Baru */}
              <FormField
                control={form.control}
                name="nilaiBaru"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {watchJenisPerubahan === 'Cicilan' ? 'Cicilan Baru (per bulan)' : 'Nilai Baru'}
                      </FormLabel>
                      {watchJenisPerubahan === 'Cicilan' && cicilanInfo.minCicilan > 0 && (
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
                        placeholder={watchJenisPerubahan === 'Cicilan' ? 'Masukkan cicilan baru' : 'Masukkan nilai baru'}
                        value={formatNumberWithSeparator(field.value)}
                        onChange={(e) => {
                          const parsed = parseFormattedNumberToInt(e.target.value);
                          field.onChange(parsed);
                        }}
                      />
                    </FormControl>
                    {watchJenisPerubahan === 'Cicilan' && cicilanInfo.minCicilan > 0 && (
                      <FormDescription className="text-yellow-600">
                        ⚠️ Cicilan tidak boleh kurang dari {formatCurrency(cicilanInfo.minCicilan)}/bulan
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cicilan Warnings */}
              {watchJenisPerubahan === 'Cicilan' && cicilanValidation.warnings.length > 0 && (
                <div className="space-y-1">
                  {cicilanValidation.warnings.map((warning, idx) => (
                    <Alert key={idx} className="bg-yellow-50 border-yellow-200 py-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-sm text-yellow-700">{warning}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Total Deduction Summary */}
              {simpatik28Calc && memberInfo && watchNilaiBaru > 0 && (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 space-y-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-accent" />
                    <h4 className="font-semibold">Total Potongan Sikostik28</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
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
                      <span className="text-muted-foreground">Cicilan Pokok</span>
                      <span className="font-medium">{formatCurrency(simpatik28Calc.breakdown.cicilanPokok)}</span>
                    </div>
                    <div className="flex justify-between col-span-2">
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
                    <FormLabel>Alasan Perubahan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jelaskan alasan pengajuan perubahan..."
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
                  disabled={!memberInfo || watchNilaiBaru === 0}
                >
                  Ajukan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Warning Confirmation Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Perhatian - Pengajuan Diluar Ketentuan
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Pengajuan Anda tidak sesuai dengan ketentuan Simpatik 28. Diperlukan persetujuan khusus dari Ketua dan Pembina Simpatik 28.
              </p>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 space-y-1">
                {cicilanValidation.warnings.map((warning, idx) => (
                  <p key={idx} className="text-sm text-yellow-700">• {warning}</p>
                ))}
              </div>
              <p className="text-sm">
                Apakah Anda yakin ingin melanjutkan pengajuan ini?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmit(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmWarning} className="bg-yellow-600 hover:bg-yellow-700">
              Ya, Lanjutkan Pengajuan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
