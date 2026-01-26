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
  { value: 'draft', label: 'Draft SM', color: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500'},
  { value: 'pending_bendahara', label: 'Bendahara', color: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' },
  { value: 'pending_ppk', label: 'PPK', color: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' },
  { value: 'pending_ppspm', label: 'PPSPM', color: 'bg-violet-500 hover:bg-violet-600 text-white border-violet-500' },
  { value: 'sent_kppn', label: 'KPPN', color: 'bg-teal-500 hover:bg-teal-600 text-white border-teal-500' },
  { value: 'pending_arsip', label: 'Catat Arsip', color: 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500' },
  { value: 'complete_arsip', label: 'Selesai', color: 'bg-green-500 hover:bg-green-600 text-white border-green-500' },
  { value: 'incomplete_sm', label: 'Tolak SM', color: 'bg-red-500 hover:bg-red-600 text-white border-red-500' },
  { value: 'incomplete_bendahara', label: 'Tolak Bendahara', color: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' },
  { value: 'incomplete_ppk', label: 'Tolak PPK', color: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' },
  { value: 'incomplete_ppspm', label: 'Tolak PPSPM', color: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500' },
  { value: 'incomplete_kppn', label: 'Tolak KPPN', color: 'bg-pink-500 hover:bg-pink-600 text-white border-pink-500' },
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
