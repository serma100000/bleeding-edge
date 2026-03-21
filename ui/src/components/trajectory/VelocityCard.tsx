import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VelocityCardProps {
  velocity: number;
}

function getVelocityColor(velocity: number): {
  text: string;
  bg: string;
  icon: string;
} {
  if (velocity < 1.0) {
    return {
      text: 'text-chronos-younger',
      bg: 'bg-chronos-younger/10',
      icon: 'text-chronos-younger',
    };
  }
  if (velocity <= 1.1) {
    return {
      text: 'text-chronos-ontrack',
      bg: 'bg-chronos-ontrack/10',
      icon: 'text-chronos-ontrack',
    };
  }
  return {
    text: 'text-chronos-accelerated',
    bg: 'bg-chronos-accelerated/10',
    icon: 'text-chronos-accelerated',
  };
}

function getVelocityLabel(velocity: number): string {
  if (velocity < 0.8) return 'Significantly slower than average';
  if (velocity < 1.0) return 'Aging slower than average';
  if (velocity <= 1.1) return 'Aging at approximately average rate';
  if (velocity <= 1.3) return 'Aging faster than average';
  return 'Significantly faster than average';
}

export default function VelocityCard({ velocity }: VelocityCardProps) {
  const colors = getVelocityColor(velocity);

  const TrendIcon =
    velocity < 1.0 ? TrendingDown : velocity <= 1.1 ? Minus : TrendingUp;

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-400">Aging Velocity</p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'font-display text-4xl font-bold tabular-nums',
                colors.text,
              )}
            >
              {velocity.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500">years/year</span>
          </div>
          <p className="text-sm text-gray-400">{getVelocityLabel(velocity)}</p>
        </div>
        <div className={cn('rounded-lg p-2.5', colors.bg)}>
          <TrendIcon className={cn('h-5 w-5', colors.icon)} />
        </div>
      </div>

      <div className="mt-4 border-t border-surface-4 pt-4">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chronos-younger" />
            <span>&lt;1.0 slower</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chronos-ontrack" />
            <span>1.0-1.1 average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chronos-accelerated" />
            <span>&gt;1.1 faster</span>
          </div>
        </div>
      </div>
    </div>
  );
}
