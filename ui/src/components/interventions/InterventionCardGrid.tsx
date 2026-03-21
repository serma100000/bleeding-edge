import { useState, useMemo } from 'react';
import type { InterventionRecommendation } from '@/types/api';
import { cn } from '@/lib/utils';
import InterventionCard from './InterventionCard';

interface InterventionCardGridProps {
  recommendations: InterventionRecommendation[];
}

type CategoryFilter = 'all' | InterventionRecommendation['category'];
type SortKey = 'effectSize' | 'evidence' | 'confidence';

const FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'diet', label: 'Diet' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'pharmacological', label: 'Pharmacological' },
  { value: 'lifestyle', label: 'Lifestyle' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'effectSize', label: 'Effect Size' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'confidence', label: 'Confidence' },
];

const EVIDENCE_ORDER: Record<InterventionRecommendation['evidenceLevel'], number> = {
  strong: 3,
  moderate: 2,
  preliminary: 1,
};

export default function InterventionCardGrid({
  recommendations,
}: InterventionCardGridProps) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('effectSize');

  const filtered = useMemo(() => {
    let items =
      activeFilter === 'all'
        ? [...recommendations]
        : recommendations.filter((r) => r.category === activeFilter);

    items.sort((a, b) => {
      switch (sortKey) {
        case 'effectSize':
          return (
            Math.abs(b.expectedEffectYears) - Math.abs(a.expectedEffectYears)
          );
        case 'evidence':
          return (
            EVIDENCE_ORDER[b.evidenceLevel] - EVIDENCE_ORDER[a.evidenceLevel]
          );
        case 'confidence':
          return b.confidenceScore - a.confidenceScore;
        default:
          return 0;
      }
    });

    return items;
  }, [recommendations, activeFilter, sortKey]);

  const maxEffect = useMemo(
    () =>
      Math.max(...recommendations.map((r) => Math.abs(r.expectedEffectYears))),
    [recommendations],
  );

  return (
    <div className="space-y-6">
      {/* Filter and Sort Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                activeFilter === opt.value
                  ? 'bg-chronos-primary-500 text-white'
                  : 'bg-surface-3 text-gray-400 hover:bg-surface-4 hover:text-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort by:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-surface-4 bg-surface-2 px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-chronos-primary-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((rec) => (
          <InterventionCard
            key={rec.interventionName}
            recommendation={rec}
            maxEffect={maxEffect}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-surface-4 bg-surface-2 py-12 text-center">
          <p className="text-sm text-gray-500">
            No interventions found for this filter.
          </p>
        </div>
      )}
    </div>
  );
}
