import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, Trash2, Send, ArrowUpRight } from 'lucide-react';
import { PulsaItem, PulsaStatus } from '@/types/pulsa';
import { supabase } from '@/integrations/supabase';

interface TabelPulsaBulananProps {
  bulan: number;
  tahun: number;
  onRefresh?: () => void;
}

export const TabelPulsaBulanan: React.FC<TabelPulsaBulananProps> = ({ 
  bulan, 
  tahun,
  onRefresh 
}) => {
  const [items, setItems] = useState<PulsaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
    fetchItems();
  }, [bulan, tahun]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.auth.getSession();
    const role = data?.session?.user?.user_metadata?.role || '';
    setUserRole(role);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pulsa_items')
        .select('*')
        .eq('bulan', bulan)
        .eq('tahun', tahun)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: PulsaStatus) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      pending_ppk: { label: 'Perlu Approval', variant: 'warning' as const },
      approved_ppk: { label: 'Disetujui', variant: 'success' as const },
      rejected_ppk: { label: 'Ditolak', variant: 'destructive' as const },
      completed: { label: 'Selesai', variant: 'success' as const },
      cancelled: { label: 'Dibatalkan', variant: 'secondary' as const }
    };

    return statusConfig[status] || { label: status, variant: 'secondary' as const };
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus?')) return;
    
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('pulsa_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setItems(items.filter(item => item.id !== id));
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('Gagal menghapus data');
    } finally {
      setDeleting(null);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    setSubmitting(id);
    try {
      const { error } = await supabase
        .from('pulsa_items')
        .update({ status: 'pending_ppk' })
        .eq('id', id);

      if (error) throw error;
      
      fetchItems();
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('Gagal mengajukan approval');
    } finally {
      setSubmitting(null);
    }
  };

  const handleApprove = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const { error } = await supabase
        .from('pulsa_items')
        .update({
          status: 'approved_ppk',
          approved_by: user?.user_metadata?.name || user?.email || 'Unknown',
          approved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      fetchItems();
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('Gagal approve data');
    }
  };

  // Deteksi duplikasi untuk warning
  const getDuplicateWarning = (item: PulsaItem) => {
    const hasDuplicate = items.some(other =>
      other.id !== item.id &&
      other.nama_petugas === item.nama_petugas &&
      other.kegiatan !== item.kegiatan &&
      (other.status === 'approved_ppk' || other.status === 'completed')
    );
    return hasDuplicate;
  };

  const petugas = items.map(i => i.nama_petugas).filter((v, i, a) => a.indexOf(v) === i);
  const totalNominal = items
    .filter(i => i.status === 'approved_ppk' || i.status === 'completed')
    .reduce((sum, i) => sum + (i.nominal || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Ringkasan Pulsa {new Date(tahun, bulan - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-gray-600">Total Petugas</p>
            <p className="text-2xl font-bold">{petugas.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Nominal (Approved)</p>
            <p className="text-2xl font-bold">
              Rp {totalNominal.toLocaleString('id-ID')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Data</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pembelian Pulsa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <p>Memuat...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Tidak ada data pulsa untuk bulan ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">No</th>
                    <th className="px-4 py-2 text-left">Nama Petugas</th>
                    <th className="px-4 py-2 text-left">Kegiatan</th>
                    <th className="px-4 py-2 text-left">Organik</th>
                    <th className="px-4 py-2 text-right">Nominal</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isDuplicate = getDuplicateWarning(item);
                    return (
                      <tr key={item.id} className={`border-b ${isDuplicate ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{item.nama_petugas}</p>
                            {item.nip && <p className="text-xs text-gray-500">{item.nip}</p>}
                            {isDuplicate && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-red-600 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Duplikasi kegiatan!
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">{item.kegiatan}</td>
                        <td className="px-4 py-2">{item.organik}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          Rp {item.nominal?.toLocaleString('id-ID') || '0'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant={getStatusBadge(item.status as PulsaStatus).variant}>
                            {getStatusBadge(item.status as PulsaStatus).label}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex justify-center gap-1">
                            {item.status === 'draft' && userRole !== 'Pejabat Pembuat Komitmen' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSubmitForApproval(item.id)}
                                  disabled={submitting === item.id}
                                  title="Ajukan ke PPK"
                                >
                                  <Send className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={deleting === item.id}
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </>
                            )}
                            {item.status === 'pending_ppk' && userRole === 'Pejabat Pembuat Komitmen' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(item.id)}
                                title="Approve"
                                className="text-green-600"
                              >
                                <CheckCircle2 className="w-3 h-3" />
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
