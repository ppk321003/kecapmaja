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
  Edit,
  Trash2,
  Check,
  X,
  Plus,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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

  const ITEMS_PER_PAGE = 20;

  // Filter items berdasarkan hideZeroPagu dan search uraian
  const filteredByZeroPagu = useMemo(() => {
    let filtered = items;
    
    // Filter by zero pagu
    if (hideZeroPagu) {
      filtered = filtered.filter(item => item.jumlah_menjadi !== 0);
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
  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedItems = sortedItems.slice(startIdx, endIdx);

  const getStatusBadge = (item: BudgetItem) => {
    if (isRejected(item)) {
      return <Badge variant="destructive">Ditolak</Badge>;
    }
    if (isApproved(item)) {
      return <Badge variant="default" className="bg-green-600">Disetujui</Badge>;
    }
    if (needsApproval(item)) {
      return <Badge variant="secondary">Menunggu Approval</Badge>;
    }
    return <Badge>{item.status}</Badge>;
  };

  const calculateSelisih = (item: BudgetItem) => {
    return (item.jumlah_menjadi || 0) - (item.jumlah_semula || 0);
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
            setCurrentPage(1); // Reset ke halaman 1 saat search
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
            Bersihkan
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {/* Summary Bar - 3 Columns */}
        <div className="bg-white border-b border-slate-200">
          <div className="grid grid-cols-3 divide-x divide-slate-200">
            {/* Ringkasan Halaman */}
            <div className="bg-blue-50 p-4">
              <div className="text-sm font-semibold text-center text-blue-900 mb-3">
                Ringkasan Halaman
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-xs text-slate-600">Total Pagu Semula (Halaman):</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {formatCurrency(
                      paginatedItems.reduce((sum, item) => sum + (item.jumlah_semula || 0), 0)
                    )}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600">Total Pagu Menjadi (Halaman):</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {formatCurrency(
                      paginatedItems.reduce((sum, item) => sum + (item.jumlah_menjadi || 0), 0)
                    )}
                  </p>
                </div>
                <div className="text-center text-red-600">
                  <p className="text-xs text-slate-600">Total Selisih Pagu (Halaman):</p>
                  <p className="font-bold text-sm">
                    {formatCurrency(
                      paginatedItems.reduce((sum, item) => sum + calculateSelisih(item), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Ringkasan Keseluruhan */}
            <div className="p-4">
              <div className="text-sm font-semibold text-center mb-3">
                Ringkasan Keseluruhan
              </div>
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-xs text-slate-600">Total Pagu Semula (Keseluruhan):</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {formatCurrency(
                      filteredByZeroPagu.reduce((sum, item) => sum + (item.jumlah_semula || 0), 0)
                    )}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600">Total Pagu Menjadi (Keseluruhan):</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {formatCurrency(
                      filteredByZeroPagu.reduce((sum, item) => sum + (item.jumlah_menjadi || 0), 0)
                    )}
                  </p>
                </div>
                <div className="text-center text-red-600">
                  <p className="text-xs text-slate-600">Total Selisih Pagu (Keseluruhan):</p>
                  <p className="font-bold text-sm">
                    {formatCurrency(
                      filteredByZeroPagu.reduce((sum, item) => sum + calculateSelisih(item), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-slate-50 p-4">
              <div className="text-sm font-semibold text-center mb-3">
                Informasi
              </div>
              <div className="space-y-2 text-center text-xs">
                <div>
                  <p className="text-slate-600">Total Items (Filter):</p>
                  <p className="font-bold text-slate-900">{filteredByZeroPagu.length}</p>
                </div>
                <div>
                  <p className="text-slate-600">Halaman:</p>
                  <p className="font-bold text-slate-900">{currentPage} dari {totalPages}</p>
                </div>
                <div>
                  <p className="text-slate-600">Items per halaman:</p>
                  <p className="font-bold text-slate-900">{ITEMS_PER_PAGE}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="bg-slate-100 sticky top-0">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Uraian</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Kegiatan</TableHead>
                <TableHead>Komponen</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead className="text-right">Jumlah Semula</TableHead>
                <TableHead className="text-right">Jumlah Menjadi</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((item, idx) => (
                <TableRow
                  key={item.id}
                  className={
                    needsApproval(item) ? 'bg-yellow-50' : isApproved(item) ? 'bg-green-50' : ''
                  }
                >
                  <TableCell className="font-medium">{startIdx + idx + 1}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    <span title={item.uraian}>{item.uraian}</span>
                  </TableCell>
                  <TableCell className="text-xs">{item.program_pembebanan}</TableCell>
                  <TableCell className="text-xs">{item.kegiatan}</TableCell>
                  <TableCell className="text-xs">{item.komponen_output}</TableCell>
                  <TableCell className="text-xs">{item.akun}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.jumlah_semula)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.jumlah_menjadi)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${
                      calculateSelisih(item) > 0
                        ? 'text-green-600'
                        : calculateSelisih(item) < 0
                        ? 'text-red-600'
                        : ''
                    }`}
                  >
                    {formatCurrency(calculateSelisih(item))}
                  </TableCell>
                  <TableCell>{getStatusBadge(item)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {!isApproved(item) && !isRejected(item) && (
                        <>
                          {isAdmin && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600 hover:bg-green-100"
                                onClick={() => onApprove?.(item.id, user?.username || '')}
                                title="Approval"
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
                                title="Reject"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-blue-600 hover:bg-blue-100"
                        onClick={() => setEditingItem(item)}
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {!isApproved(item) && (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-50 rounded border border-slate-200">
        <div className="text-xs text-slate-600">
          Menampilkan {startIdx + 1} sampai {Math.min(endIdx, sortedItems.length)} dari {sortedItems.length} items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Sebelumnya
          </Button>
          <div className="text-xs font-medium">
            Halaman {currentPage} dari {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            Selanjutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
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
    </>
  );
};

export default BahanRevisiBudgetTable;
