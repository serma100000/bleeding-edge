import { Check, X } from 'lucide-react';
import type { PipelineRun, PipelineStatus, ClockName } from '@/types/api';
import { cn, formatDuration } from '@/lib/utils';

const PIPELINE_STAGES: { key: PipelineStatus; label: string }[] = [
  { key: 'ingesting', label: 'Ingesting' },
  { key: 'embedding', label: 'Embedding' },
  { key: 'inferring', label: 'Inferring' },
  { key: 'consensus', label: 'Consensus' },
  { key: 'proving', label: 'ZK Proving' },
  { key: 'indexing', label: 'Indexing' },
  { key: 'recommending', label: 'Recommending' },
  { key: 'complete', label: 'Complete' },
];

const CLOCK_NAMES: ClockName[] = ['altumage', 'grimage', 'deepstrataage', 'epinflamm'];

const CLOCK_LABELS: Record<ClockName, string> = {
  altumage: 'AltumAge',
  grimage: 'GrimAge',
  deepstrataage: 'DeepStrata',
  epinflamm: 'EpiInflamm',
};

function getStageState(
  stageKey: PipelineStatus,
  currentStatus: PipelineStatus,
): 'pending' | 'active' | 'complete' | 'failed' {
  if (currentStatus === 'failed') {
    const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus);
    const stageIdx = PIPELINE_STAGES.findIndex((s) => s.key === stageKey);
    if (stageIdx < currentIdx) return 'complete';
    if (stageIdx === currentIdx) return 'failed';
    return 'pending';
  }

  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStatus);
  const stageIdx = PIPELINE_STAGES.findIndex((s) => s.key === stageKey);

  if (currentStatus === 'complete') return 'complete';
  if (stageIdx < currentIdx) return 'complete';
  if (stageIdx === currentIdx) return 'active';
  return 'pending';
}

function getStageDuration(stageKey: PipelineStatus, run: PipelineRun): number | null {
  const m = run.metrics;
  switch (stageKey) {
    case 'ingesting':
      return m.ingestionTimeMs;
    case 'embedding':
      return m.embeddingTimeMs;
    case 'inferring':
      return m.inferenceTimeMs;
    case 'consensus':
      return m.consensusTimeMs;
    case 'proving':
      return m.provingTimeMs;
    case 'indexing':
      return m.indexingTimeMs;
    default:
      return null;
  }
}

interface PipelineProgressTrackerProps {
  run: PipelineRun;
}

export default function PipelineProgressTracker({ run }: PipelineProgressTrackerProps) {
  return (
    <div className="card space-y-8">
      {/* Stages row */}
      <div className="flex items-start justify-between">
        {PIPELINE_STAGES.map((stage, i) => {
          const state = getStageState(stage.key, run.status);
          const duration = getStageDuration(stage.key, run);
          const isLast = i === PIPELINE_STAGES.length - 1;

          return (
            <div key={stage.key} className="flex flex-1 flex-col items-center">
              {/* Node + connector */}
              <div className="flex w-full items-center">
                {/* Left connector */}
                {i > 0 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      state === 'pending' ? 'bg-surface-4' : 'bg-chronos-primary-500',
                    )}
                  />
                )}

                {/* Circle */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    state === 'pending' && 'border-surface-4 bg-surface-3 text-gray-600',
                    state === 'active' &&
                      'animate-stage-active border-chronos-primary-500 bg-chronos-primary-500/20 text-chronos-primary-400',
                    state === 'complete' &&
                      'border-chronos-younger bg-chronos-younger/20 text-chronos-younger',
                    state === 'failed' &&
                      'border-chronos-accelerated bg-chronos-accelerated/20 text-chronos-accelerated',
                  )}
                >
                  {state === 'complete' && <Check className="h-5 w-5" />}
                  {state === 'failed' && <X className="h-5 w-5" />}
                  {state === 'active' && (
                    <div className="h-3 w-3 rounded-full bg-chronos-primary-400" />
                  )}
                  {state === 'pending' && (
                    <div className="h-2 w-2 rounded-full bg-gray-600" />
                  )}
                </div>

                {/* Right connector */}
                {!isLast && (
                  <div
                    className={cn(
                      'h-0.5 flex-1',
                      state === 'complete' ? 'bg-chronos-primary-500' : 'bg-surface-4',
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  'mt-2 text-center text-xs font-medium',
                  state === 'active' && 'text-chronos-primary-400',
                  state === 'complete' && 'text-gray-300',
                  state === 'pending' && 'text-gray-600',
                  state === 'failed' && 'text-chronos-accelerated',
                )}
              >
                {stage.label}
              </span>

              {/* Duration badge */}
              {state === 'complete' && duration !== null && (
                <span className="mt-1 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-mono text-gray-400">
                  {formatDuration(duration)}
                </span>
              )}

              {/* Error tooltip for failed */}
              {state === 'failed' && run.error && (
                <span className="mt-1 max-w-[100px] truncate text-center text-[10px] text-chronos-accelerated">
                  {run.error}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Clock sub-nodes under Inferring stage */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Clock Inference</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CLOCK_NAMES.map((clockName) => {
            const result = run.clockResults.find((c) => c.clockName === clockName);
            const inferState = getStageState('inferring', run.status);
            const clockComplete = inferState === 'complete' && result;

            return (
              <div
                key={clockName}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                  clockComplete
                    ? 'border-chronos-younger/30 bg-chronos-younger/5'
                    : inferState === 'active'
                      ? 'border-chronos-primary-500/30 bg-chronos-primary-500/5'
                      : 'border-surface-4 bg-surface-3',
                )}
              >
                {/* Mini circle */}
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    clockComplete
                      ? 'bg-chronos-younger/20 text-chronos-younger'
                      : inferState === 'active'
                        ? 'animate-stage-active bg-chronos-primary-500/20 text-chronos-primary-400'
                        : 'bg-surface-4 text-gray-600',
                  )}
                >
                  {clockComplete ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </div>

                <span className="text-xs font-medium text-gray-300">
                  {CLOCK_LABELS[clockName]}
                </span>

                {clockComplete && result && (
                  <span className="font-mono text-sm font-semibold text-chronos-younger">
                    {result.biologicalAge.toFixed(1)}y
                  </span>
                )}
                {clockComplete && result && (
                  <span className="text-[10px] font-mono text-gray-500">
                    {formatDuration(result.inferenceTimeMs)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total time */}
      {run.status === 'complete' && (
        <div className="flex items-center justify-between border-t border-surface-4 pt-4">
          <span className="text-sm text-gray-400">Total pipeline time</span>
          <span className="font-mono text-sm font-semibold text-chronos-primary-400">
            {formatDuration(run.metrics.totalTimeMs)}
          </span>
        </div>
      )}
    </div>
  );
}
