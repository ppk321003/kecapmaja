import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'success' | 'danger' | 'info';
  onClick?: () => void;
  isActive?: boolean;
}

const variantStyles = {
  default: 'bg-card border-border',
  warning: 'bg-amber-50 border-amber-300',
  success: 'bg-green-50 border-green-200',
  danger: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-100 text-amber-600',
  success: 'bg-green-100 text-green-600',
  danger: 'bg-red-100 text-red-600',
  info: 'bg-blue-100 text-blue-600',
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default',
  onClick,
  isActive 
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border transition-all duration-200',
        variantStyles[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        isActive && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', iconStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </div>
    </div>
  );
}
