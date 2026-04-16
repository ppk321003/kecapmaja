import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  readPulsaData,
  updatePulsaStatus,
  buildPersonView,
  PulsaRow,
  PersonPulsaEntry,
} from '@/services/pulsaSheetsService';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { approvePulsa, rejectPulsa, isUserPPK } from '@/services/pulsaApprovalService';

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
  const isPPK = isUserPPK(userRole);

  const [rawRows, setRawRows] = useState<PulsaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRejectRow, setSelectedRejectRow] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('[TabelPulsaBulanan] Debug Info:', {
      userRole,
      isPPK,
      username: user?.username,
      satker: user?.satker,
    });
  }, [userRole, isPPK, user]);

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
      const filtered = allData.filter(r => r.bulan === bulan && r.tahun === tahun);
      setRawRows(filtered);
    } catch (error) {
      console.error('Error fetching pulsa:', error);
    } finally {
      setLoading(false);
    }
  };

  const persons = useMemo(() => buildPersonView(rawRows), [rawRows]);

  // Find max kegiatan count across all persons
  const maxKegiatan = useMemo(
    () => Math.max(1, ...persons.map(p => p.entries.length)),
    [persons]
  );

  // Count pending items
  const pendingCount = useMemo(() => {
    return persons.reduce((sum, person) => {
      return sum + person.entries.filter(e => ['pending', 'pending_ppk'].includes(e.status)).length;
    }, 0);
  }, [persons]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'secondary' | 'destructive' | 'default' | 'outline' }> = {
      draft: { label: 'Draft', variant: 'secondary' },
      pending_ppk: { label: 'Pending', variant: 'outline' },
      pending: { label: 'Pending', variant: 'outline' },
      approved: { label: 'Approved', variant: 'default' },
      approved_ppk: { label: 'Approved', variant: 'default' },
      completed: { label: 'Selesai', variant: 'default' },
      rejected: { label: 'Ditolak', variant: 'destructive' },
      rejected_ppk: { label: 'Ditolak', variant: 'destructive' },
    };
    return map[status] || { label: status, variant: 'secondary' as const };
  };

  const handleApprove = async (rowIndex: number) => {
    setActionLoading(`approve-${rowIndex}`);
    const approver = user?.username || 'Unknown';
    const result = await approvePulsa(rowIndex, approver, userRole);
    if (result.success) {
      fetchItems();
      onRefresh?.();
    } else {
      alert(result.message);
    }
    setActionLoading(null);
  };

  const handleRejectClick = (rowIndex: number) => {
    setSelectedRejectRow(rowIndex);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRejectRow || !rejectionReason.trim()) {
      alert('Alasan penolakan harus diisi');
      return;
    }

    setActionLoading(`reject-${selectedRejectRow}`);
    const rejector = user?.username || 'Unknown';
    const result = await rejectPulsa(
      selectedRejectRow,
      rejector,
      rejectionReason,
      userRole
    );
    if (result.success) {
      fetchItems();
      onRefresh?.();
      setRejectDialogOpen(false);
      setRejectionReason('');
    } else {
      alert(result.message);
    }
    setActionLoading(null);
  };

  // Stats
  const uniquePersons = persons.length;
  const totalApproved = rawRows
    .filter(r => ['approved', 'approved_ppk', 'completed'].includes(r.status))
    .reduce((sum, r) => sum + r.nominal * (r.organikList.length + r.mitraList.length), 0);

  // Duplicate warning: same person in multiple kegiatan
  const getDuplicateWarning = (person: PersonPulsaEntry) => {
    const uniqueKegiatan = new Set(person.entries.map(e => e.kegiatan));
    return uniqueKegiatan.size > 1;
  };

  if (!pulsaSheetId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Sheet ID pulsa belum dikonfigurasi untuk satker ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* PPK Role Indicator */}
      {isPPK && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">Anda Login Sebagai PPK (Pejabat Pembuat Komitmen)</p>
                  <p className="text-sm text-blue-700">
                    {pendingCount > 0
                      ? `Ada ${pendingCount} item(s) menunggu approval Anda`
                      : 'Tidak ada item menunggu approval'}
                  </p>
                </div>
              </div>
              <Badge bg-blue-200 text-blue-900>PPK</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Ringkasan Pulsa {new Date(tahun, bulan - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Petugas</p>
            <p className="text-2xl font-bold">{uniquePersons}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Nominal (Approved)</p>
            <p className="text-2xl font-bold">Rp {totalApproved.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Baris Sheet</p>
            <p className="text-2xl font-bold">{rawRows.length}</p>
          </div>
          {isPPK && (
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pulsa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : persons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Tidak ada data pulsa untuk bulan ini</p>
              <p className="text-xs mt-1">Pastikan data sudah diinput di tab Tambah Pulsa dan sheet sesuai satker</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left border" rowSpan={2}>No</th>
                    <th className="px-3 py-2 text-left border" rowSpan={2}>Nama</th>
                    <th className="px-3 py-2 text-center border" rowSpan={2}>Status</th>
                    {Array.from({ length: maxKegiatan }, (_, i) => (
                      <th key={i} className="px-3 py-2 text-center border" colSpan={2}>
                        Kegiatan {i + 1}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right border" rowSpan={2}>Total</th>
                    <th className="px-3 py-2 text-center border" rowSpan={2}>{isPPK ? 'PPK Action' : 'Status'}</th>
                  </tr>
                  <tr>
                    {Array.from({ length: maxKegiatan }, (_, i) => (
                      <React.Fragment key={i}>
                        <th className="px-3 py-1 text-left border text-xs">Nama</th>
                        <th className="px-3 py-1 text-right border text-xs">Nominal</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {persons.map((person, idx) => {
                    const isDuplicate = getDuplicateWarning(person);
                    return (
                      <tr
                        key={person.nama}
                        className={`border-b ${isDuplicate ? 'bg-destructive/10' : 'hover:bg-muted/50'}`}
                      >
                        <td className="px-3 py-2 border">{idx + 1}</td>
                        <td className="px-3 py-2 border">
                          <div>
                            <p className="font-medium">{person.nama}</p>
                            {isDuplicate && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-destructive font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Duplikasi kegiatan!
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <Badge variant={person.tipe === 'Organik' ? 'default' : 'secondary'}>
                            {person.tipe}
                          </Badge>
                        </td>
                        {Array.from({ length: maxKegiatan }, (_, i) => {
                          const entry = person.entries[i];
                          return (
                            <React.Fragment key={i}>
                              <td className="px-3 py-2 border text-xs">
                                {entry ? (
                                  <div>
                                    <span>{entry.kegiatan}</span>
                                    <div className="mt-0.5">
                                      <Badge variant={getStatusBadge(entry.status).variant} className="text-[10px]">
                                        {getStatusBadge(entry.status).label}
                                      </Badge>
                                    </div>
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 border text-right font-mono text-xs">
                                {entry ? `Rp ${entry.nominal.toLocaleString('id-ID')}` : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="px-3 py-2 border text-right font-semibold font-mono">
                          Rp {person.total.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {person.entries.map((entry, i) => {
                              const isApproved = ['approved', 'approved_ppk', 'completed'].includes(entry.status);
                              const isPending = ['pending', 'pending_ppk'].includes(entry.status);
                              const isRejected = ['rejected', 'rejected_ppk'].includes(entry.status);

                              if (isApproved) {
                                return (
                                  <div key={i} className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {entry.disetujuiOleh || 'Approved'}
                                  </div>
                                );
                              }

                              if (isRejected) {
                                return (
                                  <div key={i} className="text-xs text-red-600 flex items-center gap-1">
                                    <X className="w-3 h-3" />
                                    Rejected
                                  </div>
                                );
                              }

                              if (isPPK && isPending) {
                                return (
                                  <div key={i} className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-green-600 text-xs h-6 px-2"
                                      onClick={() => handleApprove(entry.rowIndex)}
                                      disabled={actionLoading?.startsWith('approve-')}
                                      title="Approve this item"
                                    >
                                      {actionLoading === `approve-${entry.rowIndex}` ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        '✓'
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 text-xs h-6 px-2"
                                      onClick={() => handleRejectClick(entry.rowIndex)}
                                      disabled={actionLoading?.startsWith('reject-')}
                                      title="Reject this item"
                                    >
                                      {actionLoading === `reject-${entry.rowIndex}` ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        '✕'
                                      )}
                                    </Button>
                                  </div>
                                );
                              }

                              return (
                                <span key={i} className="text-xs text-muted-foreground">
                                  {entry.status === 'draft' ? 'Draft' : entry.status}
                                </span>
                              );
                            })}
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

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Data Pulsa</DialogTitle>
            <DialogDescription>
              Mohon jelaskan alasan penolakan data pulsa ini.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Contoh: Nominal tidak sesuai budget, data tidak lengkap, dll..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-24"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading?.startsWith('reject-')}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading?.startsWith('reject-') || !rejectionReason.trim()}
            >
              {actionLoading?.startsWith('reject-') ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Tolak'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

  // Stats
  const uniquePersons = persons.length;
  const totalApproved = rawRows
    .filter(r => ['approved', 'approved_ppk', 'completed'].includes(r.status))
    .reduce((sum, r) => sum + r.nominal * (r.organikList.length + r.mitraList.length), 0);

  // Duplicate warning: same person in multiple kegiatan
  const getDuplicateWarning = (person: PersonPulsaEntry) => {
    const uniqueKegiatan = new Set(person.entries.map(e => e.kegiatan));
    return uniqueKegiatan.size > 1;
  };

  if (!pulsaSheetId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Sheet ID pulsa belum dikonfigurasi untuk satker ini.
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
            <p className="text-2xl font-bold">{uniquePersons}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Nominal (Approved)</p>
            <p className="text-2xl font-bold">Rp {totalApproved.toLocaleString('id-ID')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Baris Sheet</p>
            <p className="text-2xl font-bold">{rawRows.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Pulsa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : persons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Tidak ada data pulsa untuk bulan ini</p>
              <p className="text-xs mt-1">Pastikan data sudah diinput di tab Tambah Pulsa dan sheet sesuai satker</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left border" rowSpan={2}>No</th>
                    <th className="px-3 py-2 text-left border" rowSpan={2}>Nama</th>
                    <th className="px-3 py-2 text-center border" rowSpan={2}>Status</th>
                    {Array.from({ length: maxKegiatan }, (_, i) => (
                      <th key={i} className="px-3 py-2 text-center border" colSpan={2}>
                        Kegiatan {i + 1}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right border" rowSpan={2}>Total</th>
                    <th className="px-3 py-2 text-center border" rowSpan={2}>Approve PPK</th>
                  </tr>
                  <tr>
                    {Array.from({ length: maxKegiatan }, (_, i) => (
                      <React.Fragment key={i}>
                        <th className="px-3 py-1 text-left border text-xs">Nama</th>
                        <th className="px-3 py-1 text-right border text-xs">Nominal</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {persons.map((person, idx) => {
                    const isDuplicate = getDuplicateWarning(person);
                    return (
                      <tr
                        key={person.nama}
                        className={`border-b ${isDuplicate ? 'bg-destructive/10' : 'hover:bg-muted/50'}`}
                      >
                        <td className="px-3 py-2 border">{idx + 1}</td>
                        <td className="px-3 py-2 border">
                          <div>
                            <p className="font-medium">{person.nama}</p>
                            {isDuplicate && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-destructive font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Duplikasi kegiatan!
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <Badge variant={person.tipe === 'Organik' ? 'default' : 'secondary'}>
                            {person.tipe}
                          </Badge>
                        </td>
                        {Array.from({ length: maxKegiatan }, (_, i) => {
                          const entry = person.entries[i];
                          return (
                            <React.Fragment key={i}>
                              <td className="px-3 py-2 border text-xs">
                                {entry ? (
                                  <div>
                                    <span>{entry.kegiatan}</span>
                                    <div className="mt-0.5">
                                      <Badge variant={getStatusBadge(entry.status).variant} className="text-[10px]">
                                        {getStatusBadge(entry.status).label}
                                      </Badge>
                                    </div>
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 border text-right font-mono text-xs">
                                {entry ? `Rp ${entry.nominal.toLocaleString('id-ID')}` : '-'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="px-3 py-2 border text-right font-semibold font-mono">
                          Rp {person.total.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {person.entries.map((entry, i) => {
                              const isApproved = ['approved', 'approved_ppk', 'completed'].includes(entry.status);
                              const isPending = ['pending', 'pending_ppk'].includes(entry.status);

                              if (isApproved) {
                                return (
                                  <div key={i} className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {entry.disetujuiOleh || 'Approved'}
                                  </div>
                                );
                              }

                              if (isPPK && isPending) {
                                return (
                                  <Button
                                    key={i}
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 text-xs h-6"
                                    onClick={() => handleApprove(entry.rowIndex)}
                                    disabled={actionLoading === `approve-${entry.rowIndex}`}
                                  >
                                    {actionLoading === `approve-${entry.rowIndex}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>✓ {entry.kegiatan}</>
                                    )}
                                  </Button>
                                );
                              }

                              return (
                                <span key={i} className="text-xs text-muted-foreground">
                                  {entry.status === 'draft' ? 'Draft' : entry.status}
                                </span>
                              );
                            })}
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
