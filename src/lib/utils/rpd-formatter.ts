// lib/utils/rpd-formatter.ts
/**
 * Format number to Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Parse user input to number
 * Accepts: "1000000", "1.000.000", "1jt", "1m"
 */
export function parseRupiahInput(input: string): number {
  if (!input || input.trim() === '') return 0
  
  // Remove currency symbols and spaces
  let clean = input.replace(/[^\d,.-]/g, '')
  
  // Handle "jt" for juta
  if (input.toLowerCase().includes('jt')) {
    const num = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0
    return Math.round(num * 1000000)
  }
  
  // Handle "m" for juta (alternative)
  if (input.toLowerCase().includes('m')) {
    const num = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0
    return Math.round(num * 1000000)
  }
  
  // Handle normal number with thousand separators
  clean = clean.replace(/\./g, '')
  const num = parseFloat(clean.replace(',', '.')) || 0
  return Math.round(num)
}

/**
 * Get RPD status
 */
export function getRPDStatus(pagu: number, totalRPD: number): 'empty' | 'partial' | 'complete' {
  if (totalRPD === 0) return 'empty'
  if (totalRPD === pagu) return 'complete'
  return 'partial'
}

/**
 * Get status color class
 */
export function getRPDStatusColor(status: 'empty' | 'partial' | 'complete'): string {
  switch (status) {
    case 'complete':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}