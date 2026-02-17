/**
 * Detail Item Anggaran Dialog Component
 * Menampilkan detail lengkap dari budget item dengan perbandingan Data Semula vs Menjadi
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BudgetItem } from '@/types/bahanrevisi';
import { formatCurrency } from '@/utils/bahanrevisi-calculations';

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BudgetItem | null;
}

const DetailDialog: React.FC<DetailDialogProps> = ({ open, onOpenChange, item }) => {
  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Detail Item Anggaran</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-gray-500">
            Tidak ada data item yang dipilih.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Calculate percentage change
  const percentChange = item.jumlah_semula > 0
    ? (((item.jumlah_menjadi - item.jumlah_semula) / item.jumlah_semula) * 100).toFixed(2)
    : item.jumlah_menjadi > 0
    ? '100.00'
    : '0.00';

  // Determine status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'default';
      case 'changed':
        return 'secondary';
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-green-500 text-white';
      case 'changed':
        return 'bg-amber-200 text-amber-900';
      case 'deleted':
        return 'bg-red-600 text-white';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new':
        return 'Baru';
      case 'changed':
        return 'Berubah';
      case 'deleted':
        return 'Dihapus';
      case 'unchanged':
        return 'Tidak Berubah';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Detail Item Anggaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title/Uraian */}
          <div className="border-b pb-3">
            <h3 className="text-base font-semibold text-gray-800">{item.uraian}</h3>
          </div>

          {/* Key Info: Data Semula vs Menjadi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Semula Card */}
            <Card className="bg-gray-50 border border-gray-200 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Data Semula</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Volume:</span>
                  <span className="text-sm font-medium">{item.volume_semula} {item.satuan_semula}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Harga Satuan:</span>
                  <span className="text-sm font-medium">{formatCurrency(item.harga_satuan_semula)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between items-center font-semibold">
                  <span className="text-xs text-gray-700">Jumlah:</span>
                  <span className="text-sm">{formatCurrency(item.jumlah_semula)}</span>
                </div>
              </div>
            </Card>

            {/* Data Menjadi Card */}
            <Card className="bg-blue-50 border border-blue-200 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-blue-700">Data Menjadi</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Volume:</span>
                  <span className="text-sm font-medium">{item.volume_menjadi} {item.satuan_menjadi}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Harga Satuan:</span>
                  <span className="text-sm font-medium">{formatCurrency(item.harga_satuan_menjadi)}</span>
                </div>
                <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between items-center font-semibold">
                  <span className="text-xs text-blue-700">Jumlah:</span>
                  <span className="text-sm">{formatCurrency(item.jumlah_menjadi)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Perubahan Section */}
          <div
            className={`border rounded-lg p-4 ${
              Number(percentChange) !== 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="mb-3">
              <h4 className="text-sm font-semibold" style={{
                color: Number(percentChange) !== 0 ? '#854d0e' : '#15803d'
              }}>
                Perubahan
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-600 block mb-1">Selisih:</span>
                <span className={`text-sm font-semibold ${
                  item.selisih > 0
                    ? 'text-green-600'
                    : item.selisih < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}>
                  {formatCurrency(item.selisih)}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-600 block mb-1">Persentase:</span>
                <span className={`text-sm font-semibold ${
                  Number(percentChange) > 0
                    ? 'text-green-600'
                    : Number(percentChange) < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}>
                  {Number(percentChange) > 0 ? '+' : ''}{percentChange}%
                </span>
              </div>
            </div>
          </div>

          {/* Program Pembebanan & Kegiatan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Program Pembebanan</span>
              <span className="text-xs font-medium">{item.program_pembebanan || '-'}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Kegiatan</span>
              <span className="text-xs font-medium">{item.kegiatan || '-'}</span>
            </div>
          </div>

          {/* Rincian Output & Komponen Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Rincian Output</span>
              <span className="text-xs font-medium">{item.rincian_output || '-'}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Komponen Output</span>
              <span className="text-xs font-medium">{item.komponen_output || '-'}</span>
            </div>
          </div>

          {/* Sub Komponen & Akun */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Sub Komponen</span>
              <span className="text-xs font-medium">{item.sub_komponen || '-'}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Akun</span>
              <span className="text-xs font-medium">{item.akun || '-'}</span>
            </div>
          </div>

          {/* Sisa Anggaran & Blokir */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Sisa Anggaran</span>
              <span className="text-xs font-medium">{formatCurrency(item.sisa_anggaran || 0)}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <span className="text-xs text-gray-600 block mb-1">Blokir</span>
              <span className="text-xs font-medium text-orange-600">{formatCurrency(item.blokir || 0)}</span>
            </div>
          </div>

          {/* Status Information */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-700">Status:</span>
              <Badge variant={getStatusBadgeVariant(item.status)} className={getStatusBadgeColor(item.status)}>
                {getStatusLabel(item.status)}
              </Badge>
              {item.approved_by && (
                <Badge variant="default" className="bg-green-600">
                  Disetujui oleh {item.approved_by}
                </Badge>
              )}
            </div>
            {item.notes && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <span className="text-xs font-medium text-gray-700 block mb-1">Catatan:</span>
                <span className="text-xs text-gray-700">{item.notes}</span>
              </div>
            )}
          </div>

          {/* Submission Info */}
          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-600 block mb-1">Diajukan oleh</span>
              <span className="text-xs font-medium">{item.submitted_by || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-600 block mb-1">Tanggal Pengajuan</span>
              <span className="text-xs font-medium">
                {item.submitted_date ? new Date(item.submitted_date).toLocaleDateString('id-ID') : '-'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailDialog;
