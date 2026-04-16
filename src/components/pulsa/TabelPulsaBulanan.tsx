import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Send, Trash2, Loader2 } from 'lucide-react';
import { readPulsaData, updatePulsaStatus, PulsaRow } from '@/services/pulsaSheetsService';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useAuth } from '@/contexts/AuthContext';

interface TabelPulsaBulananProps {
  bulan: number;
  tahun: number;
  onRefresh?: () => void;
}

export const TabelPulsaBulanan: React.FC<TabelPulsaBulananProps> = ({
  bulan,
  tahun,
  onRefresh,
}) => {
  const satkerConfig = useSatkerConfigContext();
  const pulsaSheetId = satkerConfig?.getUserSatkerSheetId('pulsa') || '';
  const { user } = useAuth();
  const userRole = user?.role || '';

  const [items, setItems] = useState<PulsaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, [bulan, tahun, pulsaSheetId]);

  const fetchItems = async () => {
    if (!pulsaSheetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const allData = await readPulsaData(pulsaSheetId);
      // Filter by bulan & tahun
      const filtered = allData.filter(r => r.bulan === bulan && r.tahun === tahun);
      setItems(filtered);
    } catch (error) {
      console.error('Error fetching pulsa:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'secondary' | 'destructive' | 'default' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'secondary' },
      pending: { label: 'Perlu Approval', variant: 'outline' },
      pending_ppk: { label: 'Perlu Approval', variant: 'outline' },
      approved: { label: 'Disetujui', variant: 'default' },
      approved_ppk: { label: 'Disetujui', variant: 'default' },
      completed: { label: 'Selesai', variant: 'default' },
      rejected: { label: 'Ditolak', variant: 'destructive' },
      rejected_ppk: { label: 'Ditolak', variant: 'destructive' },
    };
    return map[status] || { label: status, variant: 'secondary' as const };
  };

  const handleSubmitForApproval = async (row: PulsaRow) => {
    setActionLoading(`submit-${row.rowIndex}`);
    const result = await updatePulsaStatus(pulsaSheetId, row.rowIndex, 'pending_ppk');
    if (result.success) {
      fetchItems();
      onRefresh?.();
    } else {
      alert(result.message);
    }
    setActionLoading(null);
  };

  const handleApprove = async (row: PulsaRow) => {
    setActionLoading(`approve-${row.rowIndex}`);
    const approver = user?.name || user?.username || 'Unknown';
    const result = await updatePulsaStatus(pulsaSheetId, row.rowIndex, 'approved_ppk', approver);
    if (result.success) {
      fetchItems();
      onRefresh?.();
    } else {
      alert(result.message);
    }
    setActionLoading(null);
  };

  // Detect duplicate: same person different kegiatan in same period
  const getDuplicateWarning = (item: PulsaRow) => {
    const personName = item.organik || item.mitra;
    if (!personName) return false;
    return items.some(
      other =>
        other.rowIndex !== item.rowIndex &&
        (other.organik === personName || other.mitra === personName) &&
        other.kegiatan !== item.kegiatan &&
        (other.status === 'approved' || other.status === 'approved_ppk' || other.status === 'completed')
    );
  };

  const uniquePersons = new Set(items.map(i => i.organik || i.mitra).filter(Boolean));
  const totalNominal = items
    .filter(i => ['approved', 'approved_ppk', 'completed'].includes(i.status))
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  if (!pulsaSheetId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Sheet ID pulsa belum dikonfigurasi untuk satker ini. Hubungi admin untuk menambahkan kolom AB (pulsa_id) di satker_config.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Ringkasan Pulsa {new Date(tahun, bulan - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Petugas</p>
            <p className="text-2xl font-bold">{uniquePersons.size}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Nominal (Approved)</p>
            <p className="text-2xl font-bold">Rp {totalNominal.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Data</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pembelian Pulsa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Tidak ada data pulsa untuk bulan ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">No</th>
                    <th className="px-4 py-2 text-left">Organik</th>
                    <th className="px-4 py-2 text-left">Mitra</th>
                    <th className="px-4 py-2 text-left">Kegiatan</th>
                    <th className="px-4 py-2 text-right">Nominal</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-left">Keterangan</th>
                    <th className="px-4 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isDuplicate = getDuplicateWarning(item);
                    const badge = getStatusBadge(item.status);
                    return (
                      <tr key={item.rowIndex} className={`border-b ${isDuplicate ? 'bg-destructive/10' : 'hover:bg-muted/50'}`}>
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{item.organik || '-'}</p>
                            {isDuplicate && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-destructive font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Duplikasi kegiatan!
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">{item.mitra || '-'}</td>
                        <td className="px-4 py-2">{item.kegiatan}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          Rp {item.nominal?.toLocaleString('id-ID') || '0'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-2 text-xs">{item.keterangan}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            {item.status === 'draft' && userRole !== 'Pejabat Pembuat Komitmen' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSubmitForApproval(item)}
                                disabled={actionLoading === `submit-${item.rowIndex}`}
                                title="Ajukan ke PPK"
                              >
                                {actionLoading === `submit-${item.rowIndex}` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                            {(item.status === 'pending_ppk' || item.status === 'pending') &&
                              userRole === 'Pejabat Pembuat Komitmen' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprove(item)}
                                  disabled={actionLoading === `approve-${item.rowIndex}`}
                                  title="Approve"
                                  className="text-green-600"
                                >
                                  {actionLoading === `approve-${item.rowIndex}` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
