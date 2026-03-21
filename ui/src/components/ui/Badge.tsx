import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'younger' | 'ontrack' | 'accelerated' | 'verified' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'badge bg-surface-3 text-gray-300',
  younger: 'badge-younger',
  ontrack: 'badge-ontrack',
  accelerated: 'badge-accelerated',
  verified: 'badge-verified',
  outline: 'badge border border-surface-4 text-gray-400',
};

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(variantStyles[variant], className)}>
      {children}
    </span>
  );
}
