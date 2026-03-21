import { useState } from 'react';
import {
  Dumbbell,
  Salad,
  Pill,
  Syringe,
  Moon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { InterventionRecommendation } from '@/types/api';
import { cn } from '@/lib/utils';
import EffectSizeBar from './EffectSizeBar';

interface InterventionCardProps {
  recommendation: InterventionRecommendation;
  maxEffect: number;
}

const CATEGORY_ICONS: Record<InterventionRecommendation['category'], LucideIcon> = {
  exercise: Dumbbell,
  diet: Salad,
  supplement: Pill,
  pharmacological: Syringe,
  lifestyle: Moon,
};

const CATEGORY_COLORS: Record<InterventionRecommendation['category'], string> = {
  exercise: 'bg-blue-500/10 text-blue-400',
  diet: 'bg-emerald-500/10 text-emerald-400',
  supplement: 'bg-amber-500/10 text-amber-400',
  pharmacological: 'bg-purple-500/10 text-purple-400',
  lifestyle: 'bg-indigo-500/10 text-indigo-400',
};

const EVIDENCE_STYLES: Record<
  InterventionRecommendation['evidenceLevel'],
  string
> = {
  strong: 'bg-chronos-younger/10 text-chronos-younger',
  moderate: 'bg-chronos-ontrack/10 text-chronos-ontrack',
  preliminary: 'bg-gray-500/10 text-gray-400',
};

export default function InterventionCard({
  recommendation,
  maxEffect,
}: InterventionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const Icon = CATEGORY_ICONS[recommendation.category];
  const iconColor = CATEGORY_COLORS[recommendation.category];
  const evidenceStyle = EVIDENCE_STYLES[recommendation.evidenceLevel];

  return (
    <div className="card-hover flex flex-col">
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg p-2.5 shrink-0', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold leading-snug text-gray-100">
            {recommendation.interventionName}
          </h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                evidenceStyle,
              )}
            >
              {recommendation.evidenceLevel}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-gray-500">
              {recommendation.category}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <EffectSizeBar
          effectYears={recommendation.expectedEffectYears}
          maxEffect={maxEffect}
        />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            <span>Hide details</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            <span>Show details</span>
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-surface-4 pt-3">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Relevant CpGs
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recommendation.relevantCpGs.map((cpg) => (
                <code
                  key={cpg}
                  className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-chronos-accent-300"
                >
                  {cpg}
                </code>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500">Similar profiles: </span>
              <span className="font-medium text-gray-300">
                {recommendation.similarProfileCount.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Confidence: </span>
              <span className="font-medium text-gray-300">
                {(recommendation.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
