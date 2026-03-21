import { motion } from 'framer-motion';
import type { ClockResult, ClockName, ConsensusAge } from '@/types/api';
import { cn, formatAge, formatDuration } from '@/lib/utils';

interface ClockRaceVisualizationProps {
  clockResults: ClockResult[];
  consensusAge?: ConsensusAge;
}

const CLOCK_COLORS: Record<ClockName, { bg: string; bar: string; text: string }> = {
  altumage: {
    bg: 'bg-blue-500/10',
    bar: 'bg-gradient-to-r from-blue-600 to-blue-400',
    text: 'text-blue-400',
  },
  grimage: {
    bg: 'bg-amber-500/10',
    bar: 'bg-gradient-to-r from-amber-600 to-amber-400',
    text: 'text-amber-400',
  },
  deepstrataage: {
    bg: 'bg-emerald-500/10',
    bar: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
    text: 'text-emerald-400',
  },
  epinflamm: {
    bg: 'bg-purple-500/10',
    bar: 'bg-gradient-to-r from-purple-600 to-purple-400',
    text: 'text-purple-400',
  },
};

const CLOCK_LABELS: Record<ClockName, string> = {
  altumage: 'AltumAge',
  grimage: 'GrimAge',
  deepstrataage: 'DeepStrataAge',
  epinflamm: 'EpiInflamm',
};

function isOutlier(result: ClockResult, consensus: ConsensusAge | undefined): boolean {
  if (!consensus) return false;
  const diff = Math.abs(result.biologicalAge - consensus.consensusBiologicalAge);
  return diff > consensus.tolerance;
}

export default function ClockRaceVisualization({
  clockResults,
  consensusAge,
}: ClockRaceVisualizationProps) {
  const allAges = clockResults.map((r) => r.biologicalAge);
  const minAge = Math.min(...allAges) - 5;
  const maxAge = Math.max(...allAges) + 5;
  const range = maxAge - minAge;

  const consensusPosition = consensusAge
    ? ((consensusAge.consensusBiologicalAge - minAge) / range) * 100
    : null;

  return (
    <div className="rounded-xl border border-surface-4 bg-surface-1 p-6">
      <h3 className="mb-1 font-display text-sm font-semibold text-gray-200">
        Clock Race
      </h3>
      <p className="mb-5 text-xs text-gray-500">
        Biological age predictions from each epigenetic clock
      </p>

      <div className="relative space-y-5">
        {/* Consensus vertical line */}
        {consensusPosition !== null && (
          <div
            className="absolute top-0 bottom-0 z-10 w-px border-l border-dashed border-chronos-primary-400/60"
            style={{ left: `calc(140px + (100% - 200px) * ${consensusPosition / 100})` }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-chronos-primary-500/20 px-1.5 py-0.5 text-[10px] font-medium text-chronos-primary-300">
              Consensus {formatAge(consensusAge!.consensusBiologicalAge)}
            </span>
          </div>
        )}

        {clockResults.map((result, index) => {
          const color = CLOCK_COLORS[result.clockName];
          const barWidth = ((result.biologicalAge - minAge) / range) * 100;
          const outlier = isOutlier(result, consensusAge);
          const weight = consensusAge?.weights[result.clockName] ?? 0;

          return (
            <div key={result.clockName} className="group">
              <div className="flex items-center gap-3">
                {/* Clock name label */}
                <div className="w-[120px] shrink-0 text-right">
                  <span className={cn('text-sm font-medium', color.text)}>
                    {CLOCK_LABELS[result.clockName]}
                  </span>
                </div>

                {/* Bar container */}
                <div className="relative flex-1">
                  <div className="h-8 rounded-lg bg-surface-3/50">
                    <motion.div
                      className={cn(
                        'h-full rounded-lg',
                        color.bar,
                        outlier && 'border-2 border-dashed border-red-500/70',
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{
                        duration: 0.8,
                        ease: 'easeOut',
                        delay: index * 0.15,
                      }}
                    />
                  </div>

                  {/* Outlier indicator */}
                  {outlier && (
                    <motion.span
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.15 }}
                    >
                      OUTLIER
                    </motion.span>
                  )}
                </div>

                {/* Age value */}
                <motion.div
                  className="w-[60px] shrink-0 text-right"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.15 }}
                >
                  <span className="font-mono text-sm font-semibold text-gray-200">
                    {formatAge(result.biologicalAge)}
                  </span>
                </motion.div>
              </div>

              {/* Metadata row below bar */}
              <motion.div
                className="mt-1 flex gap-4 pl-[132px] text-[10px] text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + index * 0.15 }}
              >
                <span>
                  MAE: <span className="font-mono text-gray-400">{formatAge(Math.abs(result.ageAcceleration))}</span>
                </span>
                <span>
                  Weight: <span className="font-mono text-gray-400">{(weight * 100).toFixed(1)}%</span>
                </span>
                <span>
                  Time: <span className="font-mono text-gray-400">{formatDuration(result.inferenceTimeMs)}</span>
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Age axis */}
      <div className="mt-4 flex justify-between pl-[132px] pr-[60px] text-[10px] text-gray-600">
        <span>{formatAge(minAge)}</span>
        <span>{formatAge((minAge + maxAge) / 2)}</span>
        <span>{formatAge(maxAge)}</span>
      </div>
    </div>
  );
}
