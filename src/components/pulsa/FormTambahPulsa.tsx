import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { tambahPulsaBulanan } from '@/services/pulsaSheetsService';
import { PersonMultiSelect } from '@/components/PersonMultiSelect';
import { useOrganikBPS, useMitraStatistik } from '@/hooks/use-database';

interface FormTambahPulsaProps {
  bulanDefault?: number;
  tahunDefault?: number;
  onSuccess?: () => void;
}

const DAFTAR_KEGIATAN_PRESET = [
  { id: '2886', label: '2886 - Pendataan KSA' },
  { id: '2896', label: '2896 - Pelatihan Petugas Potensi Desa' },
  { id: '2897', label: '2897 - Survey Kepuasan Pelanggan' },
  { id: '2898', label: '2898 - Monitoring Kualitas Data' },
  { id: '2899', label: '2899 - Workshop Digital Literacy' },
  { id: '2900', label: '2900 - Pelatihan Sistem Informasi' },
  { id: '2901', label: '2901 - Verifikasi Data Lapangan' },
];

const BULAN_OPTIONS = [
  { id: 1, label: 'Januari' },
  { id: 2, label: 'Februari' },
  { id: 3, label: 'Maret' },
  { id: 4, label: 'April' },
  { id: 5, label: 'Mei' },
  { id: 6, label: 'Juni' },
  { id: 7, label: 'Juli' },
  { id: 8, label: 'Agustus' },
  { id: 9, label: 'September' },
  { id: 10, label: 'Oktober' },
  { id: 11, label: 'November' },
  { id: 12, label: 'Desember' },
];

export function FormTambahPulsa({ bulanDefault, tahunDefault, onSuccess }: FormTambahPulsaProps) {
  // Get real data dari Google Sheets
  const { data: organikList = [], loading: loadingOrganik } = useOrganikBPS();
  const { data: mitraList = [], loading: loadingMitra } = useMitraStatistik();
  const [formData, setFormData] = useState({
    bulan: bulanDefault || new Date().getMonth() + 1,
    tahun: tahunDefault || new Date().getFullYear(),
    kegiatan: '',
    organikIds: [] as string[],
    mitraIds: [] as string[],
    nominal: '',
    keterangan: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Format angka ke Rupiah
  const formatNumber = (value: string) => {
    if (!value) return '';
    return Number(value).toLocaleString('id-ID');
  };

  // Handle nominal input
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, nominal: value });
  };

  // Validasi form
  const validateForm = () => {
    if (!formData.kegiatan.trim()) {
      setMessage({ type: 'error', text: 'Kegiatan harus diisi' });
      return false;
    }

    if (!formData.organikIds.length) {
      setMessage({ type: 'error', text: 'Pilih minimal 1 organik' });
      return false;
    }

    if (!formData.nominal || Number(formData.nominal) <= 0) {
      setMessage({
        type: 'error',
        text: 'Nominal harus lebih dari 0',
      });
      return false;
    }

    return true;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await tambahPulsaBulanan({
        bulan: formData.bulan,
        tahun: formData.tahun,
        kegiatan: formData.kegiatan,
        organik: formData.organikIds.map(id => {
          const found = organikList.find(o => o.id === id);
          return found?.name || id;
        }).join(', '),
        mitra: formData.mitraIds.map(id => {
          const found = mitraList.find(m => m.id === id);
          return found?.name || id;
        }).join(', '),
        nominal: Number(formData.nominal),
        keterangan: formData.keterangan,
      });

      if (response.success) {
        setMessage({
          type: 'success',
          text: response.message,
        });

        // Reset form
        setFormData({
          bulan: bulanDefault || new Date().getMonth() + 1,
          tahun: tahunDefault || new Date().getFullYear(),
          kegiatan: '',
          organikIds: [],
          mitraIds: [],
          nominal: '',
          keterangan: '',
        });

        // Notify parent
        onSuccess?.();

        // Auto-clear success message
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({
          type: 'error',
          text: response.message,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Terjadi kesalahan'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="w-5 h-5" />
          Tambah Data Pulsa Bulanan
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Info Rule */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Aturan Penting:</strong> 1 petugas hanya boleh menerima
            pulsa dari <strong>1 kegiatan</strong> dalam 1 bulan.
          </AlertDescription>
        </Alert>

        {/* Message */}
        {message && (
          <Alert
            className={`mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={
                message.type === 'success'
                  ? 'text-green-800'
                  : 'text-red-800'
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bulan & Tahun */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bulan">Bulan</Label>
              <Select
                value={String(formData.bulan)}
                onValueChange={(val) =>
                  setFormData({ ...formData, bulan: Number(val) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BULAN_OPTIONS.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tahun">Tahun</Label>
              <Input
                type="number"
                value={formData.tahun}
                onChange={(e) =>
                  setFormData({ ...formData, tahun: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {/* Organik & Mitra - 1 Baris */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="organik">
                Nama Organik <span className="text-red-500">*</span>
              </Label>
              <PersonMultiSelect
                value={formData.organikIds}
                onValueChange={(ids) => 
                  setFormData({ ...formData, organikIds: ids })
                }
                options={organikList.map(o => ({
                  id: o.id,
                  name: o.name,
                  jabatan: o.jabatan,
                  kecamatan: o.kecamatan,
                }))}
                placeholder="Pilih organik..."
                loading={loadingOrganik}
                type="organik"
              />
            </div>

            <div>
              <Label htmlFor="mitra">
                Nama Mitra Statistik
              </Label>
              <PersonMultiSelect
                value={formData.mitraIds}
                onValueChange={(ids) => 
                  setFormData({ ...formData, mitraIds: ids })
                }
                options={mitraList.map(m => ({
                  id: m.id,
                  name: m.name,
                  jabatan: m.pekerjaan,
                  kecamatan: m.kecamatan,
                }))}
                placeholder="Pilih mitra (opsional)..."
                loading={loadingMitra}
                type="mitra"
              />
            </div>
          </div>

          {/* Kegiatan (Panjang) & Nominal (Disesuaikan) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="kegiatan">
                Nama Kegiatan <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-1">
                <Input
                  id="kegiatan"
                  placeholder="Contoh: 2886, Pendataan KSA, atau kode lainnya"
                  value={formData.kegiatan}
                  onChange={(e) =>
                    setFormData({ ...formData, kegiatan: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">
                  💡 Bisa isi kode (2886, 2897) atau nama kegiatan
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="nominal">
                Nominal Pulsa (Rp) <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-col gap-2">
                <Input
                  id="nominal"
                  placeholder="0"
                  value={formatNumber(formData.nominal)}
                  onChange={handleNominalChange}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Rp {formatNumber(formData.nominal) || '0'}
                </p>
              </div>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <Label htmlFor="keterangan">Keterangan</Label>
            <Input
              id="keterangan"
              placeholder="Opsional: catatan tambahan"
              value={formData.keterangan}
              onChange={(e) =>
                setFormData({ ...formData, keterangan: e.target.value })
              }
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold mb-2">📋 Ringkasan Data:</p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-600">Bulan:</span>{' '}
                {BULAN_OPTIONS.find((b) => b.id === formData.bulan)?.label}{' '}
                {formData.tahun}
              </p>
              <p>
                <span className="text-gray-600">Kegiatan:</span> {formData.kegiatan || '-'}
              </p>
              <p>
                <span className="text-gray-600">Organik:</span>{' '}
                {formData.organikIds.length > 0
                  ? formData.organikIds.map(id => {
                      const found = organikList.find(o => o.id === id);
                      return found?.name || id;
                    }).join(', ')
                  : '-'}
              </p>
              <p>
                <span className="text-gray-600">Mitra:</span>{' '}
                {formData.mitraIds.length > 0
                  ? formData.mitraIds.map(id => {
                      const found = mitraList.find(m => m.id === id);
                      return found?.name || id;
                    }).join(', ')
                  : '-'}
              </p>
              <p className="font-semibold">
                <span className="text-gray-600">Total Nominal:</span> Rp{' '}
                {formatNumber(formData.nominal) || '0'}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                '💾 Simpan ke Sheet'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  bulan: bulanDefault || new Date().getMonth() + 1,
                  tahun: tahunDefault || new Date().getFullYear(),
                  namaPetugas: '',
                  nip: '',
                  kegiatan: '',
                  organikIds: [],
                  mitraIds: [],
                  nominal: '',
                  keterangan: '',
                });
                setMessage(null);
              }}
            >
              🔄 Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
