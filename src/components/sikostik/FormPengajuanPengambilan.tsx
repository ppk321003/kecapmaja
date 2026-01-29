import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSikostikData, formatCurrency, parseNIP } from '@/hooks/use-sikostik-data';
import { AnggotaMaster, RekapDashboard } from '@/types/sikostik';
import { cn } from '@/lib/utils';

interface FormPengajuanPengambilanProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  anggotaMaster: AnggotaMaster[];
  rekapDashboard: RekapDashboard[];
}

export const FormPengajuanPengambilan = ({
  open,
  onOpenChange,
  onSuccess,
  anggotaMaster,
  rekapDashboard,
}: FormPengajuanPengambilanProps) => {
  const { loading, submitUsulPengambilan } = useSikostikData();
  const [selectedAnggotaId, setSelectedAnggotaId] = useState('');
  const [jenisPengambilan, setJenisPengambilan] = useState<'Wajib' | 'Sukarela' | 'Lebaran' | 'Lainnya'>('Sukarela');
  const [jumlahPengambilan, setJumlahPengambilan] = useState('');
  const [alasanPengambilan, setAlasanPengambilan] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedAnggota = useMemo(() => {
    return anggotaMaster.find(a => a.id === selectedAnggotaId);
  }, [selectedAnggotaId, anggotaMaster]);

  const currentSimpananData = useMemo(() => {
    if (!selectedAnggotaId) return null;
    // Get the latest simpanan data for this member
    const memberData = rekapDashboard.filter(r => r.anggotaId === selectedAnggotaId);
    if (memberData.length === 0) return null;
    // Get the most recent entry
    return memberData.reduce((latest, current) => {
      const latestDate = new Date(latest.updatedAt);
      const currentDate = new Date(current.updatedAt);
      return currentDate > latestDate ? current : latest;
    });
  }, [selectedAnggotaId, rekapDashboard]);

  const simpananBreakdown = useMemo(() => {
    if (!currentSimpananData) return null;
    return {
      wajib: currentSimpananData.saldoAkhirbulanWajib,
      sukarela: currentSimpananData.saldoAkhirbulanSukarela,
      lebaran: currentSimpananData.saldoAkhirbulanLebaran,
      lainnya: currentSimpananData.saldoAkhirbulanLainlain,
      total: currentSimpananData.totalSimpanan,
    };
  }, [currentSimpananData]);

  const availableAmount = useMemo(() => {
    if (jenisPengambilan === 'Wajib' && simpananBreakdown) {
      return simpananBreakdown.wajib;
    } else if (jenisPengambilan === 'Sukarela' && simpananBreakdown) {
      return simpananBreakdown.sukarela;
    } else if (jenisPengambilan === 'Lebaran' && simpananBreakdown) {
      return simpananBreakdown.lebaran;
    } else if (jenisPengambilan === 'Lainnya' && simpananBreakdown) {
      return simpananBreakdown.lainnya;
    }
    return 0;
  }, [jenisPengambilan, simpananBreakdown]);

  const handleJumlahChange = (value: string) => {
    // Remove non-digit characters
    const numericValue = value.replace(/\D/g, '');
    // Format with thousand separator
    const formatted = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setJumlahPengambilan(formatted);
  };

  const requestedAmount = parseFloat(jumlahPengambilan.replace(/\./g, '')) || 0;
  const isAmountValid = requestedAmount > 0 && requestedAmount <= availableAmount;

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');

    if (!selectedAnggota) {
      setError('Pilih anggota terlebih dahulu');
      return;
    }

    if (!jenisPengambilan) {
      setError('Pilih jenis pengambilan');
      return;
    }

    if (!jumlahPengambilan || requestedAmount <= 0) {
      setError('Jumlah pengambilan harus lebih dari 0');
      return;
    }

    if (requestedAmount > availableAmount) {
      setError(
        `Jumlah pengambilan melebihi saldo ${jenisPengambilan.toLowerCase()}. Saldo tersedia: ${formatCurrency(availableAmount)}`
      );
      return;
    }

    if (!alasanPengambilan.trim()) {
      setError('Alasan pengambilan tidak boleh kosong');
      return;
    }

    try {
      const result = await submitUsulPengambilan({
        anggotaId: selectedAnggota.id,
        nama: selectedAnggota.nama,
        nip: selectedAnggota.nip,
        jenisPengambilan,
        jumlahPengambilan: requestedAmount,
        alasanPengambilan,
      });

      if (result.success) {
        setSuccessMessage(`Usul pengambilan berhasil diajukan dengan ID: ${result.id}`);
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
          onSuccess?.();
        }, 2000);
      } else {
        setError(result.error || 'Gagal mengajukan usul pengambilan');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    }
  };

  const resetForm = () => {
    setSelectedAnggotaId('');
    setJenisPengambilan('Sukarela');
    setJumlahPengambilan('');
    setAlasanPengambilan('');
    setError('');
    setSuccessMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajukan Usul Pengambilan</DialogTitle>
          <DialogDescription>
            Isi formulir untuk mengajukan pengambilan simpanan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Pilih Anggota */}
          <div className="space-y-2">
            <Label htmlFor="anggota">Pilih Anggota</Label>
            <Select value={selectedAnggotaId} onValueChange={setSelectedAnggotaId}>
              <SelectTrigger id="anggota">
                <SelectValue placeholder="Pilih anggota..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {anggotaMaster.map((anggota) => (
                  <SelectItem key={anggota.id} value={anggota.id}>
                    {anggota.nama} ({anggota.nip})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Jenis Pengambilan */}
          <div className="space-y-2">
            <Label htmlFor="jenis">Jenis Pengambilan</Label>
            <Select
              value={jenisPengambilan}
              onValueChange={(value: any) => setJenisPengambilan(value)}
            >
              <SelectTrigger id="jenis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wajib">Wajib</SelectItem>
                <SelectItem value="Sukarela">Sukarela</SelectItem>
                <SelectItem value="Lebaran">Lebaran</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Simpanan Info */}
          {simpananBreakdown && (
            <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm border border-muted">
              <div className="flex justify-between">
                <span>Total Simpanan {jenisPengambilan}:</span>
                <span className="font-semibold text-primary">{formatCurrency(availableAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Total Semua Simpanan:</span>
                <span>{formatCurrency(simpananBreakdown.total)}</span>
              </div>
            </div>
          )}

          {/* Jumlah Pengambilan */}
          <div className="space-y-2">
            <Label htmlFor="jumlah">Jumlah Pengambilan</Label>
            <Input
              id="jumlah"
              type="text"
              placeholder="0"
              value={jumlahPengambilan}
              onChange={(e) => handleJumlahChange(e.target.value)}
              className={cn(
                !isAmountValid && jumlahPengambilan && 'border-red-500'
              )}
            />
            {jumlahPengambilan && (
              <div className={cn(
                'text-sm',
                isAmountValid ? 'text-green-600' : 'text-red-600'
              )}>
                {isAmountValid
                  ? `✓ Jumlah valid`
                  : `✗ Melebihi saldo tersedia (${formatCurrency(availableAmount)})`}
              </div>
            )}
          </div>

          {/* Alasan Pengambilan */}
          <div className="space-y-2">
            <Label htmlFor="alasan">Alasan Pengambilan</Label>
            <Textarea
              id="alasan"
              placeholder="Jelaskan alasan pengambilan..."
              value={alasanPengambilan}
              onChange={(e) => setAlasanPengambilan(e.target.value)}
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedAnggota || !isAmountValid}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajukan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
