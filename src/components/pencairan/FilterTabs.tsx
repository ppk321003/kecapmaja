import { SubmissionStatus, STATUS_LABELS } from '@/types/pencairan';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FilterTabsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: Record<string, number>;
}

const filters: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending_ppk', label: 'Menunggu PPK' },
  { value: 'pending_bendahara', label: 'Menunggu Bendahara' },
  { value: 'incomplete_sm', label: 'Dikembalikan ke SM' },
  { value: 'incomplete_ppk', label: 'Dikembalikan ke PPK' },
  { value: 'incomplete_bendahara', label: 'Dikembalikan ke Bendahara' },
  { value: 'sent_kppn', label: 'Dikirim ke KPPN' },
];

export function FilterTabs({ activeFilter, onFilterChange, counts }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            'rounded-full text-xs',
            activeFilter === filter.value && 'shadow-md'
          )}
        >
          {filter.label}
          <span className={cn(
            'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
            activeFilter === filter.value 
              ? 'bg-primary-foreground/20 text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          )}>
            {counts[filter.value] || 0}
          </span>
        </Button>
      ))}
    </div>
  );
}
