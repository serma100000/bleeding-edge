import { cn } from '@/lib/utils';

interface GeneticRiskBarProps {
  category: string;
  score: number;
}

function getBarColor(score: number): string {
  if (score >= 0.7) return 'bg-red-500';
  if (score >= 0.3) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function getBarGlow(score: number): string {
  if (score >= 0.7) return 'shadow-red-500/30';
  if (score >= 0.3) return 'shadow-yellow-500/20';
  return 'shadow-emerald-500/20';
}

export default function GeneticRiskBar({ category, score }: GeneticRiskBarProps) {
  const pct = Math.round(score * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm font-medium text-gray-300">{category}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 shadow-sm',
            getBarColor(score),
            getBarGlow(score),
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-mono text-gray-400">{pct}%</span>
    </div>
  );
}
