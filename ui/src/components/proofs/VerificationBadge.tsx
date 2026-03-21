import { CheckCircle2, XCircle, Loader2, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VerificationStatus = 'idle' | 'loading' | 'verified' | 'failed';

interface VerificationBadgeProps {
  status: VerificationStatus;
}

const CONFIG: Record<VerificationStatus, { label: string; className: string }> = {
  idle: {
    label: 'Unverified',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  loading: {
    label: 'Verifying...',
    className: 'bg-chronos-accent-500/10 text-chronos-accent-400 border-chronos-accent-500/20',
  },
  verified: {
    label: 'Verified',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

export default function VerificationBadge({ status }: VerificationBadgeProps) {
  const { label, className } = CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all',
        className,
        status === 'verified' && 'animate-proof-verify',
      )}
    >
      {status === 'idle' && <CircleDashed className="h-3.5 w-3.5" />}
      {status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status === 'verified' && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === 'failed' && <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}
