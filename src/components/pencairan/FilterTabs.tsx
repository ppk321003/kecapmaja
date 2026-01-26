import { SubmissionStatus, STATUS_LABELS } from '@/types/pencairan';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: Record<string, number>;
}

const filters: { value: string; label: string; color: string }[] = [
  { value: 'all', label: 'Semua', color: '' },
  { value: 'draft', label: 'Sedang disiapkan SM', color: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500'},
  { value: 'pending_bendahara', label: 'Menunggu Verifikasi Bendahara', color: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' },
  { value: 'incomplete_sm', label: 'Dikembalikan ke SM', color: 'bg-red-500 hover:bg-red-600 text-white border-red-500' },
  { value: 'pending_ppk', label: 'Menunggu Verifikasi PPK', color: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' },
  { value: 'incomplete_bendahara', label: 'Dikembalikan ke Bendahara', color: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500' },
  { value: 'incomplete_ppk', label: 'Dikembalikan ke PPK', color: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' },
  { value: 'pending_ppspm', label: 'Menunggu Pemeriksaan PPSPM', color: 'bg-violet-500 hover:bg-violet-600 text-white border-violet-500' },
  { value: 'incomplete_ppspm', label: 'Dikembalikan ke PPSPM', color: 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white border-fuchsia-500' },
  { value: 'pending_kppn', label: 'Menunggu KPPN', color: 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500' },
  { value: 'incomplete_kppn', label: 'Dikembalikan dari KPPN', color: 'bg-violet-500 hover:bg-violet-600 text-white border-violet-500' },
  { value: 'pending_arsip', label: 'Menunggu Arsip', color: 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500' },
  { value: 'sent_arsip', label: 'Sudah Dicatat Arsip', color: 'bg-green-500 hover:bg-green-600 text-white border-green-500' },
];

export function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            'rounded-full text-xs',
            activeFilter === filter.value && filter.value !== 'all' && filter.color,
            activeFilter === filter.value && 'shadow-md'
          )}
        >
          {filter.label}
          <span className={cn(
            'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
            activeFilter === filter.value 
              ? 'bg-white/20 text-inherit' 
              : 'bg-muted text-muted-foreground'
          )}>
            {counts[filter.value] || 0}
          </span>
        </Button>
      ))}
    </div>
  );
}
