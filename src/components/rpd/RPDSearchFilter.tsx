// components/rpd/RPDSearchFilter.tsx
'use client'

import { RPDItem } from '@/types/rpd'
import { FilterState } from '@/types/rpd'
import { Search, Filter } from 'lucide-react'

interface RPDSearchFilterProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  items: RPDItem[]
}

export default function RPDSearchFilter({ filters, onFilterChange, items }: RPDSearchFilterProps) {
  // Get unique kegiatan for filter
  const kegiatanOptions = Array.from(
    new Set(items.map(item => {
      // Extract kegiatan from kode (first 4 digits)
      const match = item.kode.match(/^\d{4}/)
      return match ? match[0] : 'other'
    }))
  ).filter(k => k !== 'other')

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, search: value })
  }

  const handleKegiatanChange = (value: string) => {
    onFilterChange({ ...filters, kegiatan: value })
  }

  const handleStatusChange = (value: string) => {
    onFilterChange({ ...filters, status: value })
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            Cari Kode/Uraian
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Contoh: 511211 atau ATK"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter by Kegiatan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Filter className="w-4 h-4 inline mr-1" />
            Kegiatan
          </label>
          <select
            value={filters.kegiatan}
            onChange={(e) => handleKegiatanChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Kegiatan</option>
            {kegiatanOptions.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status RPD
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="empty">Belum diisi</option>
            <option value="incomplete">Sebagian terisi</option>
            <option value="completed">Lengkap</option>
          </select>
        </div>
      </div>

      {/* Active Filters */}
      {(filters.search || filters.kegiatan !== 'all' || filters.status !== 'all') && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">Filter aktif:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                "{filters.search}"
                <button onClick={() => handleSearchChange('')} className="hover:text-blue-900">
                  ×
                </button>
              </span>
            )}
            {filters.kegiatan !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                Kegiatan: {filters.kegiatan}
                <button onClick={() => handleKegiatanChange('all')} className="hover:text-green-900">
                  ×
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
                {filters.status === 'empty' && 'Belum diisi'}
                {filters.status === 'incomplete' && 'Sebagian terisi'}
                {filters.status === 'completed' && 'Lengkap'}
                <button onClick={() => handleStatusChange('all')} className="hover:text-purple-900">
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => onFilterChange({ search: '', kegiatan: 'all', status: 'all' })}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Reset semua filter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}