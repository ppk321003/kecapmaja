// components/rpd/RPDStats.tsx
'use client'

import { RPDItem } from '@/types/rpd'
import { formatRupiah } from '@/lib/utils/rpd-formatter'
import { TrendingUp, DollarSign, Percent, CheckCircle } from 'lucide-react'

interface RPDStatsProps {
  items: RPDItem[]
}

export default function RPDStats({ items }: RPDStatsProps) {
  // Calculate stats
  const activeItems = items.filter(item => item.isActive)
  const totalPagu = activeItems.reduce((sum, item) => sum + item.pagu, 0)
  const totalRPD = activeItems.reduce((sum, item) => 
    sum + Object.values(item.rpdMonthly).reduce((monthSum, val) => monthSum + val, 0), 0
  )
  const completedItems = activeItems.filter(item => {
    const itemRPD = Object.values(item.rpdMonthly).reduce((sum, val) => sum + val, 0)
    return itemRPD === item.pagu
  }).length
  
  const percentage = totalPagu > 0 ? Math.round((totalRPD / totalPagu) * 100) : 0

  const stats = [
    {
      title: 'Total Pagu',
      value: formatRupiah(totalPagu),
      icon: DollarSign,
      color: 'bg-blue-100 text-blue-600',
      description: 'Jumlah biaya total'
    },
    {
      title: 'Total RPD',
      value: formatRupiah(totalRPD),
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600',
      description: 'Rencana penarikan dana'
    },
    {
      title: 'Persentase',
      value: `${percentage}%`,
      icon: Percent,
      color: 'bg-purple-100 text-purple-600',
      description: 'RPD dari pagu'
    },
    {
      title: 'Item Lengkap',
      value: `${completedItems} dari ${activeItems.length}`,
      icon: CheckCircle,
      color: 'bg-emerald-100 text-emerald-600',
      description: 'RPD terisi penuh'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.title} className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-2">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}