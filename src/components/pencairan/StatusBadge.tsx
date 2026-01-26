import { SubmissionStatus, STATUS_LABELS } from '@/types/pencairan';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, Send, ArrowLeft, FileEdit } from 'lucide-react';

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<SubmissionStatus, { 
  icon: React.ElementType; 
  bgClass: string; 
  textClass: string;
  borderClass: string;
}> = {
  draft: {
    icon: FileEdit,
    bgClass: 'bg-slate-100 dark:bg-slate-900/30',
    textClass: 'text-slate-700 dark:text-slate-400',
    borderClass: 'border-slate-300 dark:border-slate-700',
  },
  pending_bendahara: {
    icon: Clock,
    bgClass: 'bg-sky-100 dark:bg-sky-900/30',
    textClass: 'text-sky-700 dark:text-sky-400',
    borderClass: 'border-sky-300 dark:border-sky-700',
  },
  incomplete_bendahara: {
    icon: XCircle,
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-400',
    borderClass: 'border-purple-300 dark:border-purple-700',
  },
  pending_ppk: {
    icon: Clock,
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-300 dark:border-amber-700',
  },
  incomplete_ppk: {
    icon: XCircle,
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    textClass: 'text-orange-700 dark:text-orange-400',
    borderClass: 'border-orange-300 dark:border-orange-700',
  },
  pending_ppspm: {
    icon: Clock,
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    textClass: 'text-violet-700 dark:text-violet-400',
    borderClass: 'border-violet-300 dark:border-violet-700',
  },
  incomplete_ppspm: {
    icon: XCircle,
    bgClass: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    textClass: 'text-fuchsia-700 dark:text-fuchsia-400',
    borderClass: 'border-fuchsia-300 dark:border-fuchsia-700',
  },
  pending_kppn: {
    icon: Clock,
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    textClass: 'text-teal-700 dark:text-teal-400',
    borderClass: 'border-teal-300 dark:border-teal-700',
  },
  sent_kppn: {
    icon: Clock,
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    textClass: 'text-teal-700 dark:text-teal-400',
    borderClass: 'border-teal-300 dark:border-teal-700',
  },
  incomplete_kppn: {
    icon: XCircle,
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    textClass: 'text-violet-700 dark:text-violet-400',
    borderClass: 'border-violet-300 dark:border-violet-700',
  },
  complete_arsip: {
    icon: CheckCircle2,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
  },
  incomplete_sm: {
    icon: ArrowLeft,
    bgClass: 'bg-rose-100 dark:bg-rose-900/30',
    textClass: 'text-rose-700 dark:text-rose-400',
    borderClass: 'border-rose-300 dark:border-rose-700',
  },
};

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending_ppk;
  const Icon = config.icon;
  const label = STATUS_LABELS[status] || status || 'Tidak Diketahui';

  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px] gap-1',
    md: 'px-3 py-1.5 text-xs gap-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        sizeClasses[size],
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {label}
    </span>
  );
}
