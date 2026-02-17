/**
 * Budget Items Table Component untuk Bahan Revisi Anggaran
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Edit,
  Trash2,
  Check,
  X,
  Plus,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import DetailDialog from './DetailDialog';
import {
  BudgetItem,
  BahanRevisiFilters,
} from '@/types/bahanrevisi';
import {
  formatCurrency,
  needsApproval,
  isApproved,
  isRejected,
  formatDate,
} from '@/utils/bahanrevisi-calculations';
import { useAuth } from '@/contexts/AuthContext';

interface BahanRevisiBudgetTableProps {
  items: BudgetItem[];
  filters: BahanRevisiFilters;
  isLoading?: boolean;
  onAdd?: (item: Omit<BudgetItem, 'id'>) => void;
  onUpdate?: (itemId: string, updates: Partial<BudgetItem>) => void;
  onDelete?: (itemId: string) => void;
  onApprove?: (itemId: string, approvedBy: string) => void;
  onReject?: (itemId: string, rejectedBy: string, reason: string) => void;
  hideZeroPagu?: boolean;
}

const BahanRevisiBudgetTable: React.FC<BahanRevisiBudgetTableProps> = ({
  items,
  filters,
  isLoading = false,
  onAdd,
  onUpdate,
  onDelete,
  onApprove,
  onReject,
  hideZeroPagu = false,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Pejabat Pembuat Komitmen';
  const [sortBy, setSortBy] = useState<keyof BudgetItem | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [newItemForm, setNewItemForm] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{
    itemId: string;
    reason: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUraian, setSearchUraian] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editFormData, setEditFormData] = useState<Partial<BudgetItem>>({});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<BudgetItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Filter items berdasarkan hideZeroPagu dan search uraian
  // Special handling: items pending PPK approval always shown even if pagu = 0
  const filteredByZeroPagu = useMemo(() => {
    let filtered = items;
    
    // Filter by zero pagu - but keep items that haven't been approved by PPK yet
    if (hideZeroPagu) {
      filtered = filtered.filter(item => {
        // If item hasn't been approved by PPK, always show it (even if pagu = 0)
        const isApprovedByPPK = !!item.approved_by;
        if (!isApprovedByPPK) {
          return true; // Show pending approvals regardless of pagu amount
        }
        // For approved items, apply the zero pagu filter
        return item.jumlah_menjadi !== 0;
      });
    }
    
    // Filter by search uraian
    if (searchUraian.trim()) {
      const searchLower = searchUraian.toLowerCase();
      filtered = filtered.filter(item => 
        item.uraian?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [items, hideZeroPagu, searchUraian]);

  const handleSort = (field: keyof BudgetItem) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedItems = [...filteredByZeroPagu].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedItems = sortedItems.slice(startIdx, endIdx);

  const getStatusBadge = (item: BudgetItem) => {
    try {
      if (isRejected(item)) {
        return <Badge variant="destructive">Ditolak</Badge>;
      }
      if (isApproved(item)) {
        return <Badge variant="default" className="bg-green-600">Disetujui</Badge>;
      }
      if (item.status === 'changed') {
        return <Badge variant="secondary" className="bg-amber-200 text-amber-900">Berubah</Badge>;
      }
      if (item.status === 'new') {
        return <Badge variant="default" className="bg-green-500">Baru</Badge>;
      }
      if (item.status === 'deleted') {
        return <Badge variant="destructive" className="bg-red-600">Dihapus</Badge>;
      }
      if (needsApproval(item)) {
        return <Badge variant="secondary">Menunggu Approval</Badge>;
      }
      if (item.status === 'unchanged') {
        return <Badge variant="outline">Tidak Berubah</Badge>;
      }
      const safeStatus = String(item.status || 'unknown');
      return <Badge>{safeStatus}</Badge>;
    } catch (e) {
      console.error('Error rendering status badge:', e, item);
      return <Badge>-</Badge>;
    }
  };

  const calculateSelisih = (item: BudgetItem) => {
    return (item.jumlah_menjadi || 0) - (item.jumlah_semula || 0);
  };

  const handleEditOpen = (item: BudgetItem) => {
    setEditingItem(item);
    setEditFormData({
      volume_menjadi: item.volume_menjadi,
      satuan_menjadi: item.satuan_menjadi,
      harga_satuan_menjadi: item.harga_satuan_menjadi,
    });
    setShowEditDialog(true);
  };

  const handleEditClose = () => {
    setShowEditDialog(false);
    setEditingItem(null);
    setEditFormData({});
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    
    // Calculate new jumlah_menjadi
    const newJumlahMenjadi = Math.round(
      (editFormData.volume_menjadi || 0) * (editFormData.harga_satuan_menjadi || 0)
    );

    onUpdate?.(editingItem.id, {
      volume_menjadi: editFormData.volume_menjadi || 0,
      satuan_menjadi: editFormData.satuan_menjadi || 'Paket',
      harga_satuan_menjadi: editFormData.harga_satuan_menjadi || 0,
      jumlah_menjadi: newJumlahMenjadi,
      selisih: newJumlahMenjadi - (editingItem.jumlah_semula || 0),
    });
    
    handleEditClose();
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center text-slate-500">
          Loading data budget items...
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <AlertCircle className="h-5 w-5" />
          <span>Tidak ada data budget items yang sesuai dengan filter</span>
        </div>
      </Card>
    );
  }

  if (filteredByZeroPagu.length === 0 && hideZeroPagu) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <AlertCircle className="h-5 w-5" />
          <span>Tidak ada data budget items dengan jumlah pagu lebih dari 0</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Search Input */}
      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Cari berdasarkan uraian..."
          value={searchUraian}
          onChange={(e) => {
            setSearchUraian(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1"
        />
        {searchUraian && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchUraian('')}
            className="text-xs"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">

        {/* Table */}
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="bg-slate-100 sticky top-0">
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead className="min-w-48">Uraian Detil</TableHead>
                <TableHead className="text-center">Volume Semula</TableHead>
                <TableHead className="text-center">Satuan Semula</TableHead>
                <TableHead className="text-right">Harga Satuan Semula</TableHead>
                <TableHead className="text-right">Jumlah Semula</TableHead>
                <TableHead className="text-center">Volume Menjadi</TableHead>
                <TableHead className="text-center">Satuan Menjadi</TableHead>
                <TableHead className="text-right">Harga Satuan Menjadi</TableHead>
                <TableHead className="text-right">Jumlah Menjadi</TableHead>
                <TableHead className="text-right">Sisa Anggaran</TableHead>
                <TableHead className="text-right">Blokir</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Aksi SM/PJK</TableHead>
                {isAdmin && <TableHead className="text-center">Aksi PPK</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item, idx) => (
                <TableRow
                  key={item.id}
                  className={`
                    ${
                      item.status === 'changed'
                        ? 'bg-yellow-50'
                        : item.status === 'new'
                        ? 'bg-green-50'
                        : item.status === 'deleted'
                        ? 'bg-red-50'
                        : isApproved(item)
                        ? 'bg-green-50'
                        : ''
                    }
                  `}
                >
                  <TableCell className="font-medium text-xs">{startIdx + idx + 1}</TableCell>
                  <TableCell className="max-w-xs">
                    <span title={item.uraian} className="line-clamp-2">{item.uraian}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs">{item.volume_semula}</TableCell>
                  <TableCell className="text-center text-xs">{item.satuan_semula}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(item.harga_satuan_semula)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(item.jumlah_semula)}</TableCell>
                  <TableCell className="text-center text-xs">{item.volume_menjadi}</TableCell>
                  <TableCell className="text-center text-xs">{item.satuan_menjadi}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(item.harga_satuan_menjadi)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(item.jumlah_menjadi)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(item.sisa_anggaran || 0)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-orange-600">{formatCurrency(item.blokir || 0)}</TableCell>
                  <TableCell
                    className={`text-right text-xs font-semibold ${
                      calculateSelisih(item) > 0
                        ? 'text-green-600'
                        : calculateSelisih(item) < 0
                        ? 'text-red-600'
                        : ''
                    }`}
                  >
                    {formatCurrency(calculateSelisih(item))}
                  </TableCell>
                  {/* Status Column */}
                  <TableCell className="text-center">
                    {getStatusBadge(item)}
                  </TableCell>
                  {/* Aksi SM/PJK Column */}
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-purple-600 hover:bg-purple-100"
                        onClick={() => {
                          setDetailItem(item);
                          setIsDetailDialogOpen(true);
                        }}
                        title="Lihat Detail"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-blue-600 hover:bg-blue-100"
                        onClick={() => handleEditOpen(item)}
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {!isApproved(item) && isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-600 hover:bg-red-100"
                          onClick={() => onDelete?.(item.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  {/* Aksi PPK Column - Only visible to PPK users */}
                  {isAdmin && (
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        {!isApproved(item) && !isRejected(item) && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:bg-green-100"
                              onClick={() => onApprove?.(item.id, user?.username || '')}
                              title="Setujui"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:bg-red-100"
                              onClick={() =>
                                setRejectDialog({ itemId: item.id, reason: '' })
                              }
                              title="Tolak"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isApproved(item) && (
                          <div title="Disetujui">
                            <Check className="h-5 w-5 text-green-600" />
                          </div>
                        )}
                        {isRejected(item) && (
                          <div title="Ditolak">
                            <X className="h-5 w-5 text-red-600" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination Controls */}
      <div className="flex flex-col gap-3 mt-4 p-4 bg-slate-50 rounded border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Menampilkan {sortedItems.length > 0 ? startIdx + 1 : 0} dari {sortedItems.length} item
            {hideZeroPagu && ' (menyembunyikan jumlah pagu 0)'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Tampilkan:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(parseInt(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          <div className="text-xs font-medium px-2">
            Halaman {currentPage} dari {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="gap-1"
          >
            Selanjutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Section - 3 Columns */}
      <div className="mt-4 grid grid-cols-3 gap-0 border border-slate-200 rounded overflow-hidden bg-white">
        {/* Column 1: Halaman */}
        <div className="bg-blue-50 p-3 border-r border-slate-200">
          <div className="text-xs font-bold text-blue-900 mb-2">Ringkasan Halaman</div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-slate-600">Total Pagu Semula (Halaman):</span>
              <p className="font-semibold text-slate-900">{formatCurrency(paginatedItems.reduce((sum, item) => sum + (item.jumlah_semula || 0), 0))}</p>
            </div>
            <div>
              <span className="text-slate-600">Total Pagu Menjadi (Halaman):</span>
              <p className="font-semibold text-slate-900">{formatCurrency(paginatedItems.reduce((sum, item) => sum + (item.jumlah_menjadi || 0), 0))}</p>
            </div>
            <div>
              <span className="text-slate-600">Total Selisih Pagu (Halaman):</span>
              <p className="font-semibold text-red-600">{formatCurrency(paginatedItems.reduce((sum, item) => sum + calculateSelisih(item), 0))}</p>
            </div>
          </div>
        </div>

        {/* Column 2: Keseluruhan */}
        <div className="p-3 border-r border-slate-200">
          <div className="text-xs font-bold mb-2">Ringkasan Keseluruhan</div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-slate-600">Total Pagu Semula (Keseluruhan):</span>
              <p className="font-semibold text-slate-900">{formatCurrency(filteredByZeroPagu.reduce((sum, item) => sum + (item.jumlah_semula || 0), 0))}</p>
            </div>
            <div>
              <span className="text-slate-600">Total Pagu Menjadi (Keseluruhan):</span>
              <p className="font-semibold text-slate-900">{formatCurrency(filteredByZeroPagu.reduce((sum, item) => sum + (item.jumlah_menjadi || 0), 0))}</p>
            </div>
            <div>
              <span className="text-slate-600">Total Selisih Pagu (Keseluruhan):</span>
              <p className="font-semibold text-red-600">{formatCurrency(filteredByZeroPagu.reduce((sum, item) => sum + calculateSelisih(item), 0))}</p>
            </div>
          </div>
        </div>

        {/* Column 3: Info */}
        <div className="bg-slate-50 p-3">
          <div className="text-xs font-bold mb-2">Informasi</div>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-slate-600">Total Items (Filter):</span>
              <p className="font-semibold text-slate-900">{filteredByZeroPagu.length}</p>
            </div>
            <div>
              <span className="text-slate-600">Halaman Saat Ini:</span>
              <p className="font-semibold text-slate-900">{currentPage} / {totalPages}</p>
            </div>
            <div>
              <span className="text-slate-600">Items per Halaman:</span>
              <p className="font-semibold text-slate-900">{itemsPerPage}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      {onAdd && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => setNewItemForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Item
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && editingItem && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">Edit Item Budget</DialogTitle>
              <DialogDescription>
                Ubah Volume, Satuan, dan Harga Satuan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Uraian</label>
                <Input
                  value={editingItem.uraian}
                  disabled
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium">Volume</label>
                  <Input
                    type="number"
                    value={editFormData.volume_menjadi || 0}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        volume_menjadi: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 h-8 text-xs"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Satuan</label>
                  <Input
                    value={editFormData.satuan_menjadi || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        satuan_menjadi: e.target.value,
                      })
                    }
                    className="mt-1 h-8 text-xs"
                    placeholder="Paket"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Harga Satuan</label>
                  <Input
                    type="number"
                    value={editFormData.harga_satuan_menjadi || 0}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        harga_satuan_menjadi: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 h-8 text-xs"
                    min="0"
                  />
                </div>
              </div>
              <div className="bg-blue-50 p-2 rounded text-xs border border-blue-100">
                <p className="text-blue-900 font-medium">
                  Jumlah: {formatCurrency(
                    Math.round((editFormData.volume_menjadi || 0) * (editFormData.harga_satuan_menjadi || 0))
                  )}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleEditClose} size="sm">
                Batal
              </Button>
              <Button onClick={handleEditSave} size="sm">
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      {rejectDialog && (
        <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tolak Item</DialogTitle>
              <DialogDescription>
                Berikan alasan penolakan untuk item ini
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Alasan Penolakan</label>
                <Input
                  value={rejectDialog.reason}
                  onChange={(e) =>
                    setRejectDialog({
                      ...rejectDialog,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Masukkan alasan penolakan..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectDialog(null)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onReject?.(
                    rejectDialog.itemId,
                    user?.username || 'unknown',
                    rejectDialog.reason
                  );
                  setRejectDialog(null);
                }}
              >
                Tolak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Detail Dialog */}
      <DetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        item={detailItem}
      />
    </>
  );
};

export default BahanRevisiBudgetTable;
