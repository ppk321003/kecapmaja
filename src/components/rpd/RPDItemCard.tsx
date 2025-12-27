// components/rpd/RPDItemCard.tsx
'use client'

import { RPDItem } from '@/types/rpd'
import { formatRupiah, getRPDStatus, getRPDStatusColor } from '@/lib/utils/rpd-formatter'
import { Edit2 } from 'lucide-react'

interface RPDItemCardProps {
  item: RPDItem
  onEditClick: () => void
}

export default function RPDItemCard({ item, onEditClick }: RPDItemCardProps) {
  const totalRPD = Object.values(item.rpdMonthly).reduce((sum, val) => sum + val, 0)
  const status = getRPDStatus(item.pagu, totalRPD)
  const statusColor = getRPDStatusColor(status)
  const percentage = item.pagu > 0 ? Math.round((totalRPD / item.pagu) * 100) : 0

  return (
    <div className={`
      bg-white rounded-lg border p-5 transition-all hover:shadow-md
      ${!item.isActive ? 'opacity-60 bg-gray-50' : ''}
    `}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left Section - Item Info */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded border">
                {item.kode}
              </span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                {status === 'complete' ? 'LENGKAP' : 
                 status === 'partial' ? `${percentage}% TERISI` : 
                 'BELUM DIISI'}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-1">
              {item.uraian}
            </h3>
          </div>

          {/* Item Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Volume</div>
              <div className="font-medium">{item.volume} {item.satuan}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Harga Satuan</div>
              <div className="font-medium">{formatRupiah(item.hargaSatuan)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Total Pagu</div>
              <div className="font-bold text-blue-700">{formatRupiah(item.pagu)}</div>
            </div>
          </div>

          {/* RPD Progress */}
          {item.isActive && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">RPD Terisi:</span>
                <span className="font-medium">{formatRupiah(totalRPD)} ({percentage}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    percentage === 100 ? 'bg-green-500' :
                    percentage >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Action Button */}
        <div className="flex flex-col items-end gap-3">
          {item.isActive ? (
            <>
              <button
                onClick={onEditClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {totalRPD > 0 ? 'Edit RPD' : 'Input RPD'}
              </button>
              
              <div className="text-sm text-gray-500 text-right">
                <div>Sisa: {formatRupiah(item.pagu - totalRPD)}</div>
                {totalRPD > 0 && (
                  <div className="text-xs">Terakhir: {item.lastUpdated || '-'}</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400 italic px-3 py-2 border rounded">
              Baris non-aktif
            </div>
          )}
        </div>
      </div>
    </div>
  )
}