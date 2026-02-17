/**
 * Detail Item Anggaran Dialog Component
 * Menampilkan detail lengkap dari budget item dengan perbandingan Data Semula vs Menjadi
 * Dibuat kompak dan simpel
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Detail Item Anggaran</DialogTitle>
          </DialogHeader>
          <div className="p-2 text-center text-xs text-gray-500">
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-green-500 text-white';
      case 'changed':
        return 'bg-amber-200 text-amber-900';
      case 'deleted':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-bold">{item.uraian}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-xs">
          {/* Data Semula vs Menjadi - Kompakt */}
          <div className="grid grid-cols-2 gap-2">
            {/* Data Semula */}
            <div className="bg-gray-50 border border-gray-200 p-2 rounded">
              <div className="font-semibold text-gray-700 mb-1">Data Semula</div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Volume:</span>
                  <span className="font-medium">{item.volume_semula} {item.satuan_semula}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Harga Satuan:</span>
                  <span className="font-medium">{formatCurrency(item.harga_satuan_semula)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-gray-300 pt-0.5 mt-0.5">
                  <span className="text-gray-700">Jumlah:</span>
                  <span>{formatCurrency(item.jumlah_semula)}</span>
                </div>
              </div>
            </div>

            {/* Data Menjadi */}
            <div className="bg-blue-50 border border-blue-200 p-2 rounded">
              <div className="font-semibold text-blue-700 mb-1">Data Menjadi</div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Volume:</span>
                  <span className="font-medium">{item.volume_menjadi} {item.satuan_menjadi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Harga Satuan:</span>
                  <span className="font-medium">{formatCurrency(item.harga_satuan_menjadi)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-blue-300 pt-0.5 mt-0.5">
                  <span className="text-blue-700">Jumlah:</span>
                  <span>{formatCurrency(item.jumlah_menjadi)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Perubahan - Kompakt */}
          <div
            className={`border rounded p-2 ${
              Number(percentChange) !== 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="font-semibold mb-1" style={{
              color: Number(percentChange) !== 0 ? '#854d0e' : '#15803d'
            }}>
              Perubahan
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 block">Selisih:</span>
                <span className={`font-semibold ${
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
                <span className="text-gray-600 block">Persentase:</span>
                <span className={`font-semibold ${
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

          {/* Kategori - Grid 3 Kolom */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Program Pembebanan</span>
              <span className="font-medium">{item.program_pembebanan || '-'}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Kegiatan</span>
              <span className="font-medium">{item.kegiatan || '-'}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Rincian Output</span>
              <span className="font-medium">{item.rincian_output || '-'}</span>
            </div>
          </div>

          {/* Komponen & Detail */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Komponen Output</span>
              <span className="font-medium">{item.komponen_output || '-'}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Sub Komponen</span>
              <span className="font-medium">{item.sub_komponen || '-'}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Akun</span>
              <span className="font-medium">{item.akun || '-'}</span>
            </div>
          </div>

          {/* Sisa & Blokir */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Sisa Anggaran</span>
              <span className="font-medium">{formatCurrency(item.sisa_anggaran || 0)}</span>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <span className="text-gray-600 block">Blokir</span>
              <span className="font-medium text-orange-600">{formatCurrency(item.blokir || 0)}</span>
            </div>
          </div>

          {/* Status & Catatan */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-700">Status:</span>
              <Badge className={getStatusColor(item.status)}>
                {getStatusLabel(item.status)}
              </Badge>
              {item.approved_by && (
                <Badge className="bg-green-600 text-white text-xs">
                  Disetujui oleh {item.approved_by}
                </Badge>
              )}
            </div>
            {item.notes && (
              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                <span className="font-medium text-gray-700 block">Catatan:</span>
                <span className="text-gray-700">{item.notes}</span>
              </div>
            )}
          </div>

          {/* Pengajuan Info */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-600 block">Diajukan oleh</span>
                <span className="font-medium">{item.submitted_by || '-'}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-600 block">Tanggal Pengajuan</span>
                <span className="font-medium">{item.submitted_date || '-'}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <span className="text-gray-600 block">Terakhir Diupdate</span>
                <span className="font-medium">{item.updated_date || '-'}</span>
              </div>
            </div>
            {item.catatan_ppk?.trim() && (
              <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                <span className="text-gray-600 block font-medium">Catatan PPK</span>
                <span className="text-gray-700">{item.catatan_ppk}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailDialog;
