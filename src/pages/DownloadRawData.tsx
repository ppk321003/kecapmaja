// app/rpd-sakti/page.tsx
'use client'

import { useState, useEffect } from 'react'
import RPDItemCard from '@/components/rpd/RPDItemCard'
import RPDSearchFilter from '@/components/rpd/RPDSearchFilter'
import RPDStats from '@/components/rpd/RPDStats'
import { RPDItem, FilterState } from '@/types/rpd'
import { fetchRPDData } from '@/lib/api/rpd-api'
import { processSheetData } from '@/lib/utils/rpd-processor'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function RPDSaktiPage() {
  const [items, setItems] = useState<RPDItem[]>([])
  const [filteredItems, setFilteredItems] = useState<RPDItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<RPDItem | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    kegiatan: 'all',
    status: 'all'
  })

  // Fetch data on mount
  useEffect(() => {
    loadRPDData()
  }, [])

  // Filter items when filters or items change
  useEffect(() => {
    const filtered = items.filter(item => {
      // Filter by search
      if (filters.search && !item.uraian.toLowerCase().includes(filters.search.toLowerCase()) && 
          !item.kode.includes(filters.search)) {
        return false
      }
      
      // Filter by kegiatan
      if (filters.kegiatan !== 'all' && item.kode !== filters.kegiatan) {
        return false
      }
      
      // Filter by status
      if (filters.status !== 'all') {
        const totalRPD = Object.values(item.rpdMonthly).reduce((sum, val) => sum + val, 0)
        const isComplete = totalRPD === item.pagu
        
        if (filters.status === 'completed' && !isComplete) return false
        if (filters.status === 'incomplete' && isComplete) return false
        if (filters.status === 'empty' && totalRPD > 0) return false
      }
      
      return true
    })
    
    setFilteredItems(filtered)
  }, [items, filters])

  const loadRPDData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Ambil sheet RPD terbaru
      const sheetData = await fetchRPDData()
      
      // Process data dari Google Sheets
      const processedItems = processSheetData(sheetData)
      setItems(processedItems)
      
    } catch (err) {
      console.error('Gagal memuat data RPD:', err)
      setError('Gagal memuat data RPD. Silakan refresh halaman.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRPD = async (itemId: string, monthlyData: Record<string, number>) => {
    try {
      // Find item
      const itemIndex = items.findIndex(item => item.id === itemId)
      if (itemIndex === -1) return
      
      // Update local state optimistically
      const updatedItems = [...items]
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        rpdMonthly: monthlyData,
        totalRPD: Object.values(monthlyData).reduce((sum, val) => sum + val, 0)
      }
      
      setItems(updatedItems)
      
      // Close modal
      setSelectedItem(null)
      
      // Show success message (bisa pakai toast notification)
      alert('✅ RPD berhasil disimpan!')
      
    } catch (err) {
      console.error('Gagal menyimpan RPD:', err)
      alert('❌ Gagal menyimpan RPD. Silakan coba lagi.')
      // Rollback? Atau biarkan user coba lagi
    }
  }

  const handleRefresh = () => {
    loadRPDData()
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rencana Penarikan Dana (RPD)</h1>
              <p className="text-gray-600 mt-1">
                Sistem Input Rencana Penarikan Dana Per Bulan
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <RPDSearchFilter
            filters={filters}
            onFilterChange={setFilters}
            items={items}
          />
        </div>

        {/* Stats Summary */}
        <RPDStats items={filteredItems} />

        {/* Items List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Daftar Item ({filteredItems.length} dari {items.length})
            </h2>
            <div className="text-sm text-gray-500">
              {filteredItems.filter(item => {
                const totalRPD = Object.values(item.rpdMonthly).reduce((sum, val) => sum + val, 0)
                return totalRPD === item.pagu
              }).length} item lengkap
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <div className="text-gray-400 mb-2">Tidak ada data yang cocok dengan filter</div>
              <button 
                onClick={() => setFilters({ search: '', kegiatan: 'all', status: 'all' })}
                className="text-blue-600 hover:text-blue-800"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map(item => (
                <RPDItemCard
                  key={item.id}
                  item={item}
                  onEditClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t text-sm text-gray-500">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>RPD Lengkap</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>RPD Sebagian</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span>Belum diisi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-300"></div>
              <span>Baris non-aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Modal */}
      {selectedItem && (
        <RPDInputModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={(monthlyData) => handleSaveRPD(selectedItem.id, monthlyData)}
        />
      )}
    </div>
  )
}