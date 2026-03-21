import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  iconColor?: string;
}

export default function StatCard({ icon: Icon, label, value, trend, iconColor }: StatCardProps) {
  return (
    <div className="card-hover flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        <p className="font-display text-2xl font-bold text-gray-100">{value}</p>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend.direction === 'down' ? 'text-chronos-younger' : 'text-chronos-accelerated',
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{trend.percentage}%</span>
          </div>
        )}
      </div>
      <div
        className={cn(
          'rounded-lg p-2.5',
          iconColor ?? 'bg-chronos-primary-500/10 text-chronos-primary-400',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
