import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  action?: ReactNode;
  hover?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Card({ title, action, hover = false, className, children }: CardProps) {
  return (
    <div className={cn(hover ? 'card-hover' : 'card', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h3 className="font-display text-lg font-semibold text-gray-100">{title}</h3>
          )}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
