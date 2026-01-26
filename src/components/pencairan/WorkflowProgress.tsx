import { SubmissionStatus } from '@/types/pencairan';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Building2 } from 'lucide-react';

interface WorkflowProgressProps {
  status: SubmissionStatus;
  className?: string;
}

const steps = [
  { key: 'sm', label: 'SM', description: 'Subject Matter' },
  { key: 'bendahara', label: 'Bendahara', description: 'Bendahara Pengeluaran' },
  { key: 'ppk', label: 'PPK', description: 'Pejabat Pembuat Komitmen' },
  { key: 'ppspm', label: 'PPSPM', description: 'Pejabat Penandatangan Surat Perintah Membayar' },
  { key: 'kppn', label: 'KPPN', description: 'Kantor Pelayanan Perbendaharaan Negara' },
  { key: 'arsip', label: 'Arsip', description: 'Arsip' },
];

function getStepStatus(stepKey: string, submissionStatus: SubmissionStatus | undefined): 'complete' | 'current' | 'pending' | 'error' {
  if (!submissionStatus) return 'pending';
  
  switch (submissionStatus) {
    case 'draft':
      if (stepKey === 'sm') return 'current';
      return 'pending';
    case 'incomplete_sm':
      if (stepKey === 'sm') return 'error';
      return 'pending';
    case 'pending_bendahara':
      if (stepKey === 'sm') return 'complete';
      if (stepKey === 'bendahara') return 'current';
      return 'pending';
    case 'incomplete_bendahara':
      if (stepKey === 'sm') return 'complete';
      if (stepKey === 'bendahara') return 'error';
      return 'pending';
    case 'pending_ppk':
      if (stepKey === 'sm' || stepKey === 'bendahara') return 'complete';
      if (stepKey === 'ppk') return 'current';
      return 'pending';
    case 'incomplete_ppk':
      if (stepKey === 'sm' || stepKey === 'bendahara') return 'complete';
      if (stepKey === 'ppk') return 'error';
      return 'pending';
    case 'pending_ppspm':
      if (stepKey === 'sm' || stepKey === 'bendahara' || stepKey === 'ppk') return 'complete';
      if (stepKey === 'ppspm') return 'current';
      return 'pending';
    case 'incomplete_ppspm':
      if (stepKey === 'sm' || stepKey === 'bendahara' || stepKey === 'ppk') return 'complete';
      if (stepKey === 'ppspm') return 'error';
      return 'pending';
    case 'sent_kppn':
      if (stepKey === 'sm' || stepKey === 'bendahara' || stepKey === 'ppk' || stepKey === 'ppspm') return 'complete';
      if (stepKey === 'arsip') return 'current';
      return 'pending';
    case 'incomplete_kppn':
      if (stepKey === 'sm' || stepKey === 'bendahara' || stepKey === 'ppk' || stepKey === 'ppspm') return 'complete';
      if (stepKey === 'arsip') return 'error';
      return 'pending';
    case 'complete_arsip':
      return 'complete';
    default:
      return 'pending';
  }
}

export function WorkflowProgress({ status, className }: WorkflowProgressProps) {
  // Determine colors based on status
  const getProgressColor = () => {
    if (status === 'draft') return 'bg-gray-500';
    if (status === 'complete_arsip') return 'bg-green-500';
    if (['pending_bendahara', 'incomplete_bendahara'].includes(status)) return 'bg-blue-500';
    if (['pending_ppk', 'incomplete_ppk'].includes(status)) return 'bg-yellow-500';
    if (['pending_ppspm', 'incomplete_ppspm'].includes(status)) return 'bg-purple-500';
    if (['sent_kppn', 'incomplete_kppn'].includes(status)) return 'bg-indigo-500';
    if (status === 'incomplete_sm') return 'bg-red-500';
    return 'bg-primary';
  };

  const getCurrentStepColor = () => {
    switch (status) {
      case 'draft': return 'bg-gray-500 text-white ring-4 ring-gray-200';
      case 'pending_bendahara': return 'bg-blue-500 text-white ring-4 ring-blue-200';
      case 'incomplete_bendahara': return 'bg-purple-500 text-white ring-4 ring-purple-200';
      case 'pending_ppk': return 'bg-yellow-500 text-white ring-4 ring-yellow-200';
      case 'incomplete_ppk': return 'bg-orange-500 text-white ring-4 ring-orange-200';
      case 'pending_ppspm': return 'bg-purple-500 text-white ring-4 ring-purple-200';
      case 'incomplete_ppspm': return 'bg-fuchsia-500 text-white ring-4 ring-fuchsia-200';
      case 'sent_kppn': return 'bg-indigo-500 text-white ring-4 ring-indigo-200';
      case 'incomplete_kppn': return 'bg-violet-500 text-white ring-4 ring-violet-200';
      case 'incomplete_sm': return 'bg-red-500 text-white ring-4 ring-red-200';
      case 'complete_arsip': return 'bg-green-500 text-white ring-4 ring-green-200';
      default: return 'bg-primary text-primary-foreground ring-4 ring-primary/20';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-muted rounded-full" />
        
        {/* Active progress line */}
        <div 
          className={cn(
            "absolute top-5 left-[10%] h-1 rounded-full transition-all duration-500",
            getProgressColor()
          )}
          style={{
            width: status === 'complete_arsip' ? '100%' : 
                   ['sent_kppn', 'incomplete_kppn'].includes(status) ? '83%' :\n                   ['pending_ppspm', 'incomplete_ppspm'].includes(status) ? '67%' :\n                   ['pending_ppk', 'incomplete_ppk'].includes(status) ? '50%' :\n                   ['pending_bendahara', 'incomplete_bendahara'].includes(status) ? '33%' : '0%'
          }}
        />
        
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.key, status);
          
          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                  stepStatus === 'complete' && 'bg-green-500 text-white shadow-lg',
                  stepStatus === 'current' && getCurrentStepColor(),
                  stepStatus === 'pending' && 'bg-muted text-muted-foreground border-2 border-muted-foreground/20',
                  stepStatus === 'error' && 'bg-red-500 text-white ring-4 ring-red-200'
                )}
              >
                {stepStatus === 'complete' && <CheckCircle2 className="w-5 h-5" />}
                {stepStatus === 'current' && <Clock className="w-5 h-5 animate-pulse" />}
                {stepStatus === 'pending' && (step.key === 'kppn' ? <Building2 className="w-5 h-5" /> : <span>{index + 1}</span>)}
                {stepStatus === 'error' && <XCircle className="w-5 h-5" />}
              </div>

              <div className="mt-2 text-center">
                <p className={cn(
                  'text-sm font-medium',
                  stepStatus === 'current' && status === 'pending_ppk' && 'text-yellow-600',
                  stepStatus === 'current' && status === 'pending_bendahara' && 'text-blue-600',
                  stepStatus === 'current' && status === 'incomplete_ppk' && 'text-orange-600',
                  stepStatus === 'current' && status === 'incomplete_bendahara' && 'text-purple-600',
                  stepStatus === 'complete' && 'text-green-600',
                  stepStatus === 'error' && 'text-red-600'
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground max-w-[80px]">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
