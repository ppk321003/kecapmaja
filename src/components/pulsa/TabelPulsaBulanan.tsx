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
  Clock,
  XCircle,
  Edit3,
  Zap,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  readPulsaData,
  updatePersonStatusInRow,
  buildPersonView,
  PulsaRow,
  PersonPulsaEntry,
} from '@/services/pulsaSheetsService';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { isUserPPK } from '@/services/pulsaApprovalService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [selectedApprovePerson, setSelectedApprovePerson] = useState<PersonPulsaEntry | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveAction, setApproveAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  // Bulk approve confirmation dialog (custom AlertDialog, not browser confirm)
  const [bulkConfirm, setBulkConfirm] = useState<{
    open: boolean;
    filter: { type: 'all-pending' } | { type: 'kegiatan'; kegiatan: string };
    targetsCount: number;
    label: string;
  } | null>(null);

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
      return sum + person.entries.filter((e): e is NonNullable<typeof e> => e !== null && ['pending', 'pending_ppk'].includes(e.status)).length;
    }, 0);
  }, [persons]);

  // Debug logging - moved after persons definition
  useEffect(() => {
    console.log('[TabelPulsaBulanan] Debug Info:', {
      userRole,
      isPPK,
      username: user?.username,
      satker: user?.satker,
      personsCount: persons.length,
      personsWithPending: persons.filter(p => p.entries.some((e): e is NonNullable<typeof e> => e !== null && ['pending', 'pending_ppk'].includes(e.status))).length,
    });
    persons.forEach((p, idx) => {
      const pendingStatus = p.entries.filter((e): e is NonNullable<typeof e> => e !== null && ['pending', 'pending_ppk'].includes(e.status));
      console.log(`  Person ${idx}: ${p.nama}, Pending: ${pendingStatus.length}, Entries: ${p.entries.filter((e): e is NonNullable<typeof e> => e !== null).map(e => e.status).join(', ')}`);
    });
  }, [userRole, isPPK, user, persons]);

  // Dialog state change logging
  useEffect(() => {
    console.log('[Dialog State] approveDialogOpen:', approveDialogOpen, 'selectedApprovePerson:', selectedApprovePerson?.nama);
  }, [approveDialogOpen, selectedApprovePerson]);

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

  const handleApproveClick = (person: PersonPulsaEntry) => {
    console.log('[handleApproveClick] Clicked person:', person.nama);
    setSelectedApprovePerson(person);
    setApproveAction(null);
    // Initialize selected items - select all PENDING entries by default
    // Use full entries array indices (includes null positions)
    const pendingIndices = new Set(
      person.entries
        .map((e, idx) => ({ e, idx }))
        .filter(({ e }) => e !== null && ['pending', 'pending_ppk'].includes(e.status))
        .map(({ idx }) => idx)
    );
    setSelectedItems(pendingIndices);
    setApproveDialogOpen(true);
    setRejectionReason('');
    console.log('[handleApproveClick] Dialog opens, default selected pending items:', Array.from(pendingIndices));
  };

  /**
   * Group selected entries (any status) by rowIndex, then call
   * updatePersonStatusInRow once per row with all per-person updates.
   * PPK can re-edit any entry, including changing approved → rejected and vice versa.
   */
  const processSelectedItems = async (newStatus: 'approved_ppk' | 'rejected_ppk') => {
    if (!selectedApprovePerson || selectedItems.size === 0) {
      alert('Pilih minimal 1 item');
      return false;
    }

    const approver = user?.username || 'Unknown';
    // Allow re-edit: include all entries, not just pending
    const allEntries = selectedApprovePerson.entries;
    const selectedEntries = Array.from(selectedItems)
      .map(idx => allEntries[idx])
      .filter(Boolean);

    if (selectedEntries.length === 0) return false;

    // Group by rowIndex
    const byRow = new Map<number, { personIndex: number; newStatus: string }[]>();
    for (const entry of selectedEntries) {
      if (!byRow.has(entry.rowIndex)) byRow.set(entry.rowIndex, []);
      byRow.get(entry.rowIndex)!.push({
        personIndex: entry.personIndex,
        newStatus,
      });
    }

    for (const [rowIndex, updates] of byRow) {
      const result = await updatePersonStatusInRow(
        pulsaSheetId,
        rowIndex,
        updates,
        approver
      );
      if (!result.success) {
        alert(`Error update row ${rowIndex}: ${result.message}`);
        return false;
      }
    }
    return true;
  };

  const handleApproveConfirm = async () => {
    setActionLoading('approve-processing');
    try {
      const ok = await processSelectedItems('approved_ppk');
      if (ok) {
        fetchItems();
        onRefresh?.();
        setApproveDialogOpen(false);
        setSelectedApprovePerson(null);
        setSelectedItems(new Set());
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (person: PersonPulsaEntry) => {
    setSelectedApprovePerson(person);
    setApproveAction('reject');
    setRejectionReason('');
    setApproveDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      alert('Isi alasan penolakan');
      return;
    }
    setActionLoading('reject-processing');
    try {
      const ok = await processSelectedItems('rejected_ppk');
      if (ok) {
        fetchItems();
        onRefresh?.();
        setApproveDialogOpen(false);
        setSelectedApprovePerson(null);
        setRejectionReason('');
        setApproveAction(null);
        setSelectedItems(new Set());
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const uniquePersons = persons.length;
  const totalApproved = rawRows
    .filter(r => ['approved', 'approved_ppk', 'completed'].includes(r.status))
    .reduce((sum, r) => sum + r.nominal * (r.organikList.length + r.mitraList.length), 0);

  // Duplicate warning: same person in multiple kegiatan
  const getDuplicateWarning = (person: PersonPulsaEntry) => {
    const validEntries = person.entries.filter((e): e is NonNullable<typeof e> => e !== null);
    const uniqueKegiatan = new Set(validEntries.map(e => e.kegiatan));
    return uniqueKegiatan.size > 1;
  };

  // Unique kegiatan list with pending counts (untuk bulk approve by kegiatan)
  const kegiatanPendingMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rawRows) {
      const pendingInRow = row.statusList.filter(s => ['pending', 'pending_ppk'].includes(s)).length;
      if (pendingInRow > 0) {
        map.set(row.kegiatan, (map.get(row.kegiatan) || 0) + pendingInRow);
      }
    }
    return map;
  }, [rawRows]);

  /**
   * Open custom confirmation dialog (replaces browser confirm).
   */
  const requestBulkApprove = (
    filter: { type: 'all-pending' } | { type: 'kegiatan'; kegiatan: string }
  ) => {
    let count = 0;
    for (const row of rawRows) {
      if (filter.type === 'kegiatan' && row.kegiatan !== filter.kegiatan) continue;
      count += row.statusList.filter(s => ['pending', 'pending_ppk'].includes(s)).length;
    }
    if (count === 0) return;
    const label = filter.type === 'kegiatan' ? `kegiatan "${filter.kegiatan}"` : 'SEMUA pending';
    setBulkConfirm({ open: true, filter, targetsCount: count, label });
  };

  /**
   * Execute bulk approve after user confirms in custom dialog.
   * Group by rowIndex, parallel update via Promise.all.
   */
  const executeBulkApprove = async (
    filter: { type: 'all-pending' } | { type: 'kegiatan'; kegiatan: string },
    newStatus: 'approved_ppk' | 'rejected_ppk' = 'approved_ppk'
  ) => {
    const targets: { rowIndex: number; personIndex: number }[] = [];
    for (const row of rawRows) {
      if (filter.type === 'kegiatan' && row.kegiatan !== filter.kegiatan) continue;
      row.statusList.forEach((status, personIndex) => {
        if (['pending', 'pending_ppk'].includes(status)) {
          targets.push({ rowIndex: row.rowIndex, personIndex });
        }
      });
    }
    if (targets.length === 0) return;

    setActionLoading(`bulk-${filter.type}`);
    try {
      const byRow = new Map<number, { personIndex: number; newStatus: string }[]>();
      for (const t of targets) {
        if (!byRow.has(t.rowIndex)) byRow.set(t.rowIndex, []);
        byRow.get(t.rowIndex)!.push({ personIndex: t.personIndex, newStatus });
      }

      const approver = user?.username || 'Unknown';
      const results = await Promise.all(
        Array.from(byRow.entries()).map(([rowIndex, updates]) =>
          updatePersonStatusInRow(pulsaSheetId, rowIndex, updates, approver)
        )
      );

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        console.error('Bulk approve failures:', failed);
      }

      await fetchItems();
      onRefresh?.();
    } catch (err) {
      console.error('Bulk approve error:', err);
    } finally {
      setActionLoading(null);
      setBulkConfirm(null);
    }
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
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Daftar Pulsa</CardTitle>
          {isPPK && kegiatanPendingMap.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => requestBulkApprove({ type: 'all-pending' })}
                disabled={actionLoading !== null}
                title="Setujui semua item pending sekaligus"
              >
                {actionLoading === 'bulk-all-pending' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Approve Semua Pending ({pendingCount})
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={actionLoading !== null}>
                    Per Kegiatan
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-popover">
                  <DropdownMenuLabel>Approve semua pending dari:</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Array.from(kegiatanPendingMap.entries()).map(([keg, count]) => (
                    <DropdownMenuItem
                      key={keg}
                      onClick={() => requestBulkApprove({ type: 'kegiatan', kegiatan: keg })}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                      <span className="flex-1 truncate">{keg}</span>
                      <Badge variant="outline" className="ml-2">{count}</Badge>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
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
                    <th className="px-3 py-2 text-left border" style={{ minWidth: '40px' }}>No</th>
                    <th className="px-3 py-2 text-left border">Nama</th>
                    <th className="px-3 py-2 text-center border">Status</th>
                    {Array.from({ length: maxKegiatan }).map((_, i) => {
                      const kegiatanName = persons
                        .flatMap(p => p.entries[i]?.kegiatan)
                        .filter(Boolean)[0] || `Kegiatan ${i + 1}`;
                      return (
                        <th key={i} className="px-3 py-2 text-right border" style={{ minWidth: '120px' }}>
                          {kegiatanName}
                        </th>
                      );
                    })}
                    <th className="px-3 py-2 text-right border" style={{ minWidth: '100px' }}>Total</th>
                    <th className="px-3 py-2 text-center border" style={{ minWidth: '50px' }}>✓</th>
                    {isPPK && (
                      <th className="px-3 py-2 text-center border" style={{ minWidth: '90px' }}>Aksi PPK</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {persons.map((person, idx) => {
                    const isDuplicate = getDuplicateWarning(person);
                    // Filter out null entries
                    const validEntries = person.entries.filter((e): e is NonNullable<typeof e> => e !== null);
                    const hasPending = validEntries.some(e => ['pending', 'pending_ppk'].includes(e.status));
                    const hasAnyAction = validEntries.some(e =>
                      ['approved', 'approved_ppk', 'completed', 'rejected', 'rejected_ppk'].includes(e.status)
                    );
                    // Build keterangan from approved entries
                    const approvedEntries = validEntries.filter(e =>
                      ['approved', 'approved_ppk', 'completed'].includes(e.status)
                    );
                    const keterangan = approvedEntries.length === 0
                      ? ''
                      : approvedEntries
                          .map(e => `Pulsa disetujui dari kegiatan ${e.kegiatan} nominal Rp ${e.nominal.toLocaleString('id-ID')}`)
                          .join('; ');
                    return (
                      <tr
                        key={person.nama}
                        className={`border-b ${isDuplicate ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'hover:bg-muted/50'}`}
                      >
                        <td className="px-3 py-2 border text-center">{idx + 1}</td>
                        <td className="px-3 py-2 border">
                          <div>
                            <p className="font-medium">{person.nama}</p>
                            {isDuplicate && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-yellow-700 dark:text-yellow-400 font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Duplikasi kegiatan
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 border text-center">
                          <Badge variant={person.tipe === 'Organik' ? 'default' : 'secondary'}>
                            {person.tipe}
                          </Badge>
                        </td>
                        {Array.from({ length: maxKegiatan }).map((_, i) => {
                          const entry = person.entries[i];
                          if (!entry) {
                            return (
                              <td key={i} className="px-3 py-2 border text-right font-mono text-xs text-muted-foreground">
                                -
                              </td>
                            );
                          }
                          const statusIcon =
                            ['approved', 'approved_ppk', 'completed'].includes(entry.status) ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : ['rejected', 'rejected_ppk'].includes(entry.status) ? (
                              <XCircle className="w-4 h-4 text-red-600" />
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 ring-2 ring-amber-200 animate-pulse">
                                <Clock className="w-3 h-3 text-white" />
                              </span>
                            );
                          return (
                            <td key={i} className="px-3 py-2 border">
                              <div className="flex items-center justify-end gap-2">
                                <span className="font-mono text-xs">
                                  Rp {entry.nominal.toLocaleString('id-ID')}
                                </span>
                                <span title={entry.status}>{statusIcon}</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 border text-right font-semibold font-mono">
                          Rp {person.total.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 border text-center">
                          {approvedEntries.length > 0 ? (
                            <span title={`${approvedEntries.length} disetujui`}>
                              <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                            </span>
                          ) : validEntries.some(e => ['rejected', 'rejected_ppk'].includes(e.status)) ? (
                            <span title="Ada yang ditolak">
                              <XCircle className="w-4 h-4 text-red-600 mx-auto" />
                            </span>
                          ) : (
                            <span title="Menunggu approval" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 ring-2 ring-amber-200 mx-auto animate-pulse">
                              <Clock className="w-3 h-3 text-white" />
                            </span>
                          )}
                        </td>
                        {isPPK && (
                          <td className="px-3 py-2 border text-center">
                            <Button
                              size="icon"
                              variant={hasPending ? 'default' : 'ghost'}
                              className={`h-8 w-8 ${hasPending ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 animate-pulse' : ''}`}
                              title={hasPending ? 'Approve / Reject' : (hasAnyAction ? 'Edit keputusan' : 'Belum ada data')}
                              onClick={() => handleApproveClick(person)}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : hasPending ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <Edit3 className="w-4 h-4" />
                              )}
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-muted font-semibold border-t-2">
                    <td colSpan={3} className="px-3 py-2 border text-right">JUMLAH AJUAN:</td>
                    {Array.from({ length: maxKegiatan }).map((_, i) => {
                      const subtotal = persons.reduce((sum, p) => {
                        const entry = p.entries[i];
                        return sum + (entry ? entry.nominal : 0);
                      }, 0);
                      return (
                        <td key={i} className="px-3 py-2 border text-right font-mono text-sm">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 border text-right font-mono text-sm">
                      Rp {persons.reduce((sum, p) => sum + p.total, 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 border text-center"></td>
                  </tr>
                  {/* Approved Row */}
                  <tr className="bg-green-50 dark:bg-green-900/20 font-semibold border-b">
                    <td colSpan={3} className="px-3 py-2 border text-right">DISETUJUI:</td>
                    {Array.from({ length: maxKegiatan }).map((_, i) => {
                      const subtotal = persons.reduce((sum, p) => {
                        const entry = p.entries[i];
                        return sum + (entry && ['approved', 'approved_ppk', 'completed'].includes(entry.status) ? entry.nominal : 0);
                      }, 0);
                      return (
                        <td key={i} className="px-3 py-2 border text-right font-mono text-sm">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 border text-right font-mono text-sm">
                      Rp {persons.reduce((sum, p) => {
                        const approved = p.entries.filter((e): e is NonNullable<typeof e> => e !== null && ['approved', 'approved_ppk', 'completed'].includes(e.status));
                        return sum + approved.reduce((s, e) => s + e.nominal, 0);
                      }, 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 border text-center text-xs text-green-600">
                      {persons.filter(p => p.entries.some((e): e is NonNullable<typeof e> => e !== null && ['approved', 'approved_ppk', 'completed'].includes(e.status))).length} org
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve/Reject Dialog */}
      <Dialog 
        open={approveDialogOpen} 
        onOpenChange={(open) => {
          console.log('[Dialog] onOpenChange called with:', open, 'Current state:', approveDialogOpen);
          if (!open) {
            setApproveDialogOpen(false);
            setSelectedApprovePerson(null);
            setApproveAction(null);
            setRejectionReason('');
            setSelectedItems(new Set());
          } else {
            setApproveDialogOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approval Data Pulsa</DialogTitle>
            <DialogDescription>
              {selectedApprovePerson && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span><strong>Disetujui oleh:</strong> {user?.username || 'Unknown'}</span>
                    <Badge variant="secondary">{user?.role}</Badge>
                  </div>
                  <div>
                    <strong>Nama Petugas:</strong> {selectedApprovePerson.nama}
                  </div>
                  <div>
                    <strong>Tipe:</strong> {selectedApprovePerson.tipe}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedApprovePerson && (
            <div className="space-y-4">
              {/* Items to approve with checkboxes — show ALL entries so PPK bisa re-edit keputusan */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="font-medium text-sm mb-3">Pilih item untuk disetujui/ditolak (PPK boleh mengubah keputusan sebelumnya):</p>
                <div className="space-y-2">
                  {selectedApprovePerson.entries
                    .map((entry, idx) => entry ? { entry, idx } : null)
                    .filter((item): item is { entry: NonNullable<typeof item['entry']>; idx: number } => item !== null)
                    .map(({ entry, idx }) => {
                    const isApproved = ['approved', 'approved_ppk', 'completed'].includes(entry.status);
                    const isRejected = ['rejected', 'rejected_ppk'].includes(entry.status);
                    const badgeVariant: 'default' | 'destructive' | 'outline' =
                      isApproved ? 'default' : isRejected ? 'destructive' : 'outline';
                    const badgeLabel =
                      isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending';
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2 bg-background border rounded text-sm hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`item-${idx}`}
                          checked={selectedItems.has(idx)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedItems);
                            if (checked) newSet.add(idx); else newSet.delete(idx);
                            setSelectedItems(newSet);
                          }}
                        />
                        <label
                          htmlFor={`item-${idx}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <p className="font-medium">{entry.kegiatan}</p>
                            <p className="text-xs text-muted-foreground">Rp {entry.nominal.toLocaleString('id-ID')}</p>
                          </div>
                        </label>
                        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action selection */}
              {approveAction === null && (
                <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                  <p className="font-medium text-sm">Pilih Aksi ({selectedItems.size} item terpilih):</p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => setApproveAction('approve')}
                      disabled={actionLoading !== null || selectedItems.size === 0}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Setujui Terpilih
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => setApproveAction('reject')}
                      disabled={actionLoading !== null || selectedItems.size === 0}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Tolak Terpilih
                    </Button>
                  </div>
                </div>
              )}
              {/* Rejection reason input */}
              {approveAction === 'reject' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alasan Penolakan</label>
                  <Textarea
                    placeholder="Contoh: Nominal tidak sesuai budget, data tidak lengkap, dll..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-20"
                    disabled={actionLoading !== null}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialogOpen(false);
                setSelectedApprovePerson(null);
                setApproveAction(null);
                setRejectionReason('');
                setSelectedItems(new Set());
              }}
              disabled={actionLoading !== null}
            >
              Batal
            </Button>
            {approveAction !== null && (
              <Button
                variant={approveAction === 'reject' ? 'destructive' : 'default'}
                onClick={
                  approveAction === 'reject'
                    ? handleRejectConfirm
                    : handleApproveConfirm
                }
                disabled={
                  actionLoading !== null ||
                  (approveAction === 'reject' && !rejectionReason.trim())
                }
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : approveAction === 'reject' ? (
                  'Tolak'
                ) : (
                  'Setujui'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
