import { Submission } from '@/types/pencairan';
import { 
  CheckCircle2, 
  Clock, 
  XCircle,
  Circle,
  Send,
  User,
  FileCheck,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingTimelineProps {
  submission: Submission;
  className?: string;
}

interface TimelineEvent {
  id: string;
  actor: string;
  actorLabel: string;
  timestamp?: string;
  status?: string;
  statusLabel?: string;
  type: 'submit' | 'approve' | 'reject' | 'pending' | 'complete' | 'incomplete';
}

function parseTimelineStatus(status?: string): { type: 'approve' | 'reject' | 'pending' | 'incomplete', label: string } {
  if (!status) return { type: 'pending', label: 'Menunggu' };
  
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('disetujui') || lowerStatus.includes('approve')) {
    return { type: 'approve', label: 'Disetujui' };
  }
  if (lowerStatus.includes('dikembalikan') || lowerStatus.includes('reject')) {
    return { type: 'reject', label: 'Dikembalikan' };
  }
  if (lowerStatus.includes('perbaikan') || lowerStatus.includes('incomplete')) {
    return { type: 'incomplete', label: 'Perlu perbaikan' };
  }
  return { type: 'pending', label: status };
}

export function TrackingTimeline({ submission, className }: TrackingTimelineProps) {
  // Build timeline events from submission data
  const events: TimelineEvent[] = [];

  // Check status flags
  const isDraft = submission.status === 'draft';
  const isIncompleteSm = submission.status === 'incomplete_sm';
  const isIncompleteBendahara = submission.status === 'incomplete_bendahara';
  const isIncompletePpk = submission.status === 'incomplete_ppk';
  const isIncompletePpspm = submission.status === 'incomplete_ppspm';
  const isIncompleteKppn = submission.status === 'incomplete_kppn';

  // 1. SM Submit (always show if waktu pengajuan exists or in draft/incomplete_sm)
  if (submission.waktuPengajuan || isDraft || isIncompleteSm) {
    let statusLabel = 'Pengajuan telah dikirim ke Bendahara';
    let type: TimelineEvent['type'] = 'submit';

    if (isDraft) {
      statusLabel = 'Masih dalam proses kelengkapan SM';
      type = 'pending';
    } else if (isIncompleteSm) {
      statusLabel = 'Diperlukan perbaikan oleh SM';
      type = 'incomplete';
    }

    events.push({
      id: 'sm-submit',
      actor: 'SM',
      actorLabel: 'Subject Matter (Fungsi)',
      timestamp: submission.waktuPengajuan || undefined,
      status: isDraft ? 'Dalam proses' : isIncompleteSm ? 'Perlu perbaikan' : 'Pengajuan dikirim',
      statusLabel,
      type,
    });
  }

  // 2. Bendahara - only show if bendahara has acted (has status) or currently pending for bendahara
  if (submission.statusBendahara || submission.waktuBendahara || submission.status === 'pending_bendahara' || isIncompleteBendahara) {
    const bendaharaStatus = parseTimelineStatus(submission.statusBendahara);
    let statusLabel = submission.statusBendahara 
      ? `Bendahara: ${submission.statusBendahara}`
      : (submission.status === 'pending_bendahara' ? 'Menunggu verifikasi Bendahara' : '');
    let type = bendaharaStatus.type;

    if (isIncompleteBendahara) {
      statusLabel = 'Diperlukan perbaikan oleh Bendahara';
      type = 'incomplete';
    } else if (!submission.statusBendahara && submission.status === 'pending_bendahara') {
      type = 'pending';
    }

    // Only add if bendahara has status or currently pending
    if (submission.statusBendahara || submission.status === 'pending_bendahara' || isIncompleteBendahara || submission.waktuBendahara) {
      events.push({
        id: 'bendahara',
        actor: 'Bendahara',
        actorLabel: 'Bendahara Pengeluaran',
        timestamp: submission.waktuBendahara,
        status: isIncompleteBendahara ? 'Perlu perbaikan' : submission.statusBendahara,
        statusLabel,
        type,
      });
    }
  }

  // 3. PPK - only show if ppk has acted (has status) or currently pending for ppk
  if (submission.statusPpk || submission.waktuPpk || submission.status === 'pending_ppk' || isIncompletePpk) {
    const ppkStatus = parseTimelineStatus(submission.statusPpk);
    let statusLabel = submission.statusPpk 
      ? `PPK: ${submission.statusPpk}`
      : (submission.status === 'pending_ppk' ? 'Menunggu verifikasi PPK' : '');
    let type = ppkStatus.type;

    if (isIncompletePpk) {
      statusLabel = 'Diperlukan perbaikan oleh PPK';
      type = 'incomplete';
    } else if (!submission.statusPpk && submission.status === 'pending_ppk') {
      type = 'pending';
    }

    // Only add if ppk has status or currently pending
    if (submission.statusPpk || submission.status === 'pending_ppk' || isIncompletePpk || submission.waktuPpk) {
      events.push({
        id: 'ppk',
        actor: 'PPK',
        actorLabel: 'Pejabat Pembuat Komitmen',
        timestamp: submission.waktuPpk,
        status: isIncompletePpk ? 'Perlu perbaikan' : submission.statusPpk,
        statusLabel,
        type,
      });
    }
  }

  // 4. PPSPM - only show if ppspm has acted (has status) or currently pending for ppspm
  if (submission.statusPPSPM || submission.waktuPPSPM || submission.status === 'pending_ppspm' || isIncompletePpspm) {
    const ppspmStatus = parseTimelineStatus(submission.statusPPSPM);
    let statusLabel = submission.statusPPSPM 
      ? `PPSPM: ${submission.statusPPSPM}`
      : (submission.status === 'pending_ppspm' ? 'Menunggu pemeriksaan PPSPM' : '');
    let type = ppspmStatus.type;

    if (isIncompletePpspm) {
      statusLabel = 'Diperlukan perbaikan oleh PPSPM';
      type = 'incomplete';
    } else if (!submission.statusPPSPM && submission.status === 'pending_ppspm') {
      type = 'pending';
    }

    // Only add if ppspm has status or currently pending
    if (submission.statusPPSPM || submission.status === 'pending_ppspm' || isIncompletePpspm || submission.waktuPPSPM) {
      events.push({
        id: 'ppspm',
        actor: 'PPSPM',
        actorLabel: 'Pejabat Penandatangan SPM',
        timestamp: submission.waktuPPSPM,
        status: isIncompletePpspm ? 'Perlu perbaikan' : submission.statusPPSPM,
        statusLabel,
        type,
      });
    }
  }

  // 5. Arsip - Show final status when Arsip has acted or status is sent_kppn/complete_arsip
  if (submission.status === 'sent_kppn' || submission.status === 'complete_arsip' || submission.statusArsip || submission.waktuArsip || isIncompleteKppn) {
    const arsipStatus = submission.statusArsip ? parseTimelineStatus(submission.statusArsip) : { type: 'pending', label: 'Menunggu' };
    let statusLabel = 'Menunggu pencatatan Arsip';
    let type: TimelineEvent['type'] = 'pending';

    if (submission.status === 'complete_arsip') {
      statusLabel = 'Selesai dicatat Arsip';
      type = 'complete';
    } else if (submission.statusArsip) {
      statusLabel = `Arsip: ${submission.statusArsip}`;
      type = arsipStatus.type as TimelineEvent['type'];
    } else if (isIncompleteKppn) {
      statusLabel = 'Dikembalikan oleh Arsip';
      type = 'incomplete';
    }

    events.push({
      id: 'arsip',
      actor: 'Arsip',
      actorLabel: 'Arsip (Pencatatan)',
      timestamp: submission.waktuArsip || undefined,
      status: submission.statusArsip || (submission.status === 'complete_arsip' ? 'Selesai' : 'Menunggu'),
      statusLabel,
      type,
    });
  }

  // Reverse events so newest is on top (like the reference image)
  const sortedEvents = [...events].reverse();

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'approve':
      case 'complete':
        return CheckCircle2;
      case 'reject':
        return XCircle;
      case 'incomplete':
        return Clock; // Use Clock icon for incomplete status
      case 'submit':
        return Send;
      default:
        return Clock;
    }
  };

  const getEventColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'approve':
      case 'complete':
        return 'text-green-600 bg-green-100 border-green-300';
      case 'reject':
        return 'text-red-600 bg-red-100 border-red-300';
      case 'incomplete':
        return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'submit':
        return 'text-blue-600 bg-blue-100 border-blue-300';
      default:
        return 'text-amber-600 bg-amber-100 border-amber-300';
    }
  };

  const getLineColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'approve':
      case 'complete':
        return 'bg-green-300';
      case 'reject':
        return 'bg-red-300';
      case 'incomplete':
        return 'bg-orange-300';
      case 'submit':
        return 'bg-blue-300';
      default:
        return 'bg-gray-200';
    }
  };

  const getDotColor = (event: TimelineEvent) => {
    switch (event.type) {
      case 'approve':
      case 'complete':
        return 'bg-green-500';
      case 'reject':
        return 'bg-red-500';
      case 'incomplete':
        return 'bg-orange-500';
      case 'submit':
        return 'bg-blue-500';
      default:
        return 'bg-amber-500';
    }
  };

  if (events.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground py-8", className)}>
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Belum ada riwayat tracking</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Timeline container */}
      <div className="space-y-0">
        {sortedEvents.map((event, index) => {
          const Icon = getEventIcon(event);
          const isLast = index === sortedEvents.length - 1;
          
          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                {/* Dot */}
                <div 
                  className={cn(
                    "w-3 h-3 rounded-full shrink-0 z-10 border-2 border-background",
                    getDotColor(event)
                  )}
                />
                {/* Line connecting to next event */}
                {!isLast && (
                  <div 
                    className={cn(
                      "w-0.5 flex-1 min-h-[60px]",
                      getLineColor(event)
                    )}
                  />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-6">
                {/* Timestamp */}
                {event.timestamp && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {formatTimelineDate(event.timestamp)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimelineTime(event.timestamp)}
                    </span>
                  </div>
                )}
                
                {/* Status description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.statusLabel}
                </p>
                
                {/* Actor badge */}
                <div className="mt-2">
                  <span 
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                      event.type === 'approve' || event.type === 'complete' 
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : event.type === 'reject'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : event.type === 'incomplete'
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : event.type === 'submit'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    )}
                  >
                    {event.actor === 'SM' && <User className="w-3 h-3" />}
                    {event.actor === 'Bendahara' && <FileCheck className="w-3 h-3" />}
                    {event.actor === 'PPK' && <FileCheck className="w-3 h-3" />}
                    {event.actor === 'PPSPM' && <FileCheck className="w-3 h-3" />}
                    {event.actor === 'KPPN' && <Building2 className="w-3 h-3" />}
                    {event.actor === 'Arsip' && <FileCheck className="w-3 h-3" />}
                    {event.actorLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper functions for date formatting
function formatTimelineDate(dateStr: string): string {
  try {
    // Format: "HH:mm - dd/MM/yyyy"
    const parts = dateStr.split(' - ');
    if (parts.length < 2) return dateStr;
    
    const datePart = parts[1];
    const [day, month, year] = datePart.split('/');
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    
    const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
    
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${fullYear}`;
  } catch {
    return dateStr;
  }
}

function formatTimelineTime(dateStr: string): string {
  try {
    // Format: "HH:mm - dd/MM/yyyy"
    const parts = dateStr.split(' - ');
    if (parts.length < 2) return '';
    
    return `${parts[0]} WIB`;
  } catch {
    return '';
  }
}
