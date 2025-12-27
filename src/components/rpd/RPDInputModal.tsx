// components/rpd/RPDInputModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { RPDItem } from '@/types/rpd'
import { formatRupiah, parseRupiahInput } from '@/lib/utils/rpd-formatter'
import { X, AlertCircle, CheckCircle, Calculator } from 'lucide-react'

interface RPDInputModalProps {
  item: RPDItem
  isOpen: boolean
  onClose: () => void
  onSave: (monthlyData: Record<string, number>) => Promise<void>
}

const MONTHS = [
  { id: 'januari', name: 'Januari', order: 0 },
  { id: 'februari', name: 'Februari', order: 1 },
  { id: 'maret', name: 'Maret', order: 2 },
  { id: 'april', name: 'April', order: 3 },
  { id: 'mei', name: 'Mei', order: 4 },
  { id: 'juni', name: 'Juni', order: 5 },
  { id: 'juli', name: 'Juli', order: 6 },
  { id: 'agustus', name: 'Agustus', order: 7 },
  { id: 'september', name: 'September', order: 8 },
  { id: 'oktober', name: 'Oktober', order: 9 },
  { id: 'november', name: 'November', order: 10 },
  { id: 'desember', name: 'Desember', order: 11 },
]

export default function RPDInputModal({ item, isOpen, onClose, onSave }: RPDInputModalProps) {
  const [monthlyData, setMonthlyData] = useState<Record<string, number>>(item.rpdMonthly)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeMonth, setActiveMonth] = useState('januari')

  // Calculate totals
  const totalRPD = Object.values(monthlyData).reduce((sum, val) => sum + val, 0)
  const remaining = item.pagu - totalRPD
  const isComplete = remaining === 0
  const percentage = item.pagu > 0 ? Math.round((totalRPD / item.pagu) * 100) : 0

  // Initialize with current data
  useEffect(() => {
    setMonthlyData(item.rpdMonthly)
    setErrors({})
  }, [item])

  // Handle input change
  const handleMonthChange = (monthId: string, value: string) => {
    // Parse input
    const parsedValue = parseRupiahInput(value)
    
    // Validate
    const error = validateInput(parsedValue, monthId)
    
    if (error) {
      setErrors(prev => ({ ...prev, [monthId]: error }))
      return
    }
    
    // Clear error
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[monthId]
      return newErrors
    })
    
    // Update data
    setMonthlyData(prev => ({
      ...prev,
      [monthId]: parsedValue
    }))
  }

  const validateInput = (value: number, monthId: string): string => {
    if (isNaN(value)) return 'Harus angka'
    if (value < 0) return 'Tidak boleh negatif'
    if (!Number.isInteger(value)) return 'Harus bilangan bulat'
    
    // Check if total exceeds pagu
    const newTotal = Object.entries(monthlyData).reduce((sum, [key, val]) => {
      return sum + (key === monthId ? value : val)
    }, 0)
    
    if (newTotal > item.pagu) {
      return `Melebihi pagu sebesar ${formatRupiah(newTotal - item.pagu)}`
    }
    
    return ''
  }

  // Distribusi merata
  const distributeEvenly = () => {
    const evenAmount = Math.floor(item.pagu / 12)
    const remainder = item.pagu % 12
    
    const newData: Record<string, number> = {}
    MONTHS.forEach((month, index) => {
      newData[month.id] = evenAmount + (index < remainder ? 1 : 0)
    })
    
    setMonthlyData(newData)
    setErrors({})
  }

  // Distribusi proporsional (70% di triwulan 4)
  const distributeQuarter4 = () => {
    const q4Amount = Math.floor(item.pagu * 0.7 / 3) // 70% dibagi 3 bulan
    const otherAmount = Math.floor(item.pagu * 0.3 / 9) // 30% dibagi 9 bulan
    
    const newData: Record<string, number> = {}
    MONTHS.forEach((month, index) => {
      if (index >= 9) { // Oktober, November, Desember
        newData[month.id] = q4Amount
      } else {
        newData[month.id] = otherAmount
      }
    })
    
    // Adjust for rounding
    const currentTotal = Object.values(newData).reduce((a, b) => a + b, 0)
    const adjustment = item.pagu - currentTotal
    if (adjustment > 0) {
      newData.desember = (newData.desember || 0) + adjustment
    }
    
    setMonthlyData(newData)
    setErrors({})
  }

  // Reset form
  const resetForm = () => {
    setMonthlyData(Object.keys(item.rpdMonthly).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}))
    setErrors({})
  }

  // Handle save
  const handleSave = async () => {
    if (!isComplete) {
      alert(`Tidak bisa simpan. Sisa pagu harus 0.\nSisa saat ini: ${formatRupiah(remaining)}`)
      return
    }

    if (Object.keys(errors).length > 0) {
      alert('Ada error dalam input. Harap perbaiki terlebih dahulu.')
      return
    }

    setIsSaving(true)
    try {
      await onSave(monthlyData)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">Input Rencana Penarikan Dana</h2>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono bg-blue-700 px-2 py-1 rounded">{item.kode}</span>
                  <span className="font-medium">{item.uraian}</span>
                </div>
                <div className="text-blue-100">
                  Pagu: <span className="font-bold">{formatRupiah(item.pagu)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Sisa Counter */}
          <div className={`
            mb-6 p-4 rounded-lg text-center font-bold text-lg
            ${remaining === 0 ? 'bg-green-100 text-green-800' :
              remaining > 0 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'}
          `}>
            {remaining === 0 ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>SISA PAGU: Rp 0 ✓ Siap disimpan</span>
              </div>
            ) : remaining > 0 ? (
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>SISA PAGU: {formatRupiah(remaining)} (Kurang {percentage}%)</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>KELEBIHAN: {formatRupiah(-remaining)}</span>
              </div>
            )}
          </div>

          {/* Distribution Buttons */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={distributeEvenly}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              <span>Distribusi Merata</span>
            </button>
            <button
              onClick={distributeQuarter4}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg border flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              <span>Fokus Triwulan 4</span>
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200"
            >
              Reset Form
            </button>
            <div className="text-sm text-gray-500 p-2 border rounded-lg bg-gray-50">
              <div>Total RPD: {formatRupiah(totalRPD)}</div>
              <div>Progress: {percentage}%</div>
            </div>
          </div>

          {/* Monthly Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MONTHS.map(month => (
              <div key={month.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {month.name}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={monthlyData[month.id] ? formatRupiah(monthlyData[month.id]) : ''}
                    onChange={(e) => handleMonthChange(month.id, e.target.value)}
                    onFocus={() => setActiveMonth(month.id)}
                    className={`
                      w-full px-3 py-2 border rounded-lg text-right font-mono
                      ${errors[month.id] ? 'border-red-500 bg-red-50' : 'border-gray-300'}
                      ${activeMonth === month.id ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                    `}
                    placeholder="0"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    Rp
                  </div>
                </div>
                {errors[month.id] && (
                  <div className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors[month.id]}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {item.pagu > 0 && (
                    <span>
                      {Math.round((monthlyData[month.id] / item.pagu) * 100)}% dari pagu
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            <div className="flex flex-wrap gap-4">
              <span>🎯 <strong>Tips:</strong> Ketik angka langsung (misal: 5000000)</span>
              <span>⚡ <strong>Shortcut:</strong> TAB untuk berpindah antar bulan</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            
            <div className="text-center">
              {!isComplete && (
                <div className="text-sm text-red-600 mb-2">
                  ⚠ Harap lengkapi sampai sisa = 0
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={!isComplete || isSaving || Object.keys(errors).length > 0}
                className={`
                  px-8 py-3 rounded-lg font-medium min-w-[140px]
                  ${isComplete && !isSaving ? 
                    'bg-green-600 hover:bg-green-700 text-white' :
                    'bg-gray-300 text-gray-500 cursor-not-allowed'}
                `}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Menyimpan...
                  </span>
                ) : (
                  'SIMPAN RPD'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}