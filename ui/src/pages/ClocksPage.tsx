import { useState } from 'react';
import { motion } from 'framer-motion';
import ConsensusGauge from '@/components/clocks/ConsensusGauge';
import ClockRaceVisualization from '@/components/clocks/ClockRaceVisualization';
import ClockResultsTable from '@/components/tables/ClockResultsTable';
import CpGContributionTable from '@/components/tables/CpGContributionTable';
import { useLatestRun } from '@/hooks/useLatestRun';
import type { ClockName } from '@/types/api';

const CLOCK_LABELS: Record<ClockName, string> = {
  altumage: 'AltumAge',
  grimage: 'GrimAge',
  deepstrataage: 'DeepStrataAge',
  epinflamm: 'EpiInflamm',
};

export default function ClocksPage() {
  const { run, allRuns, isLoading, error, selectRun } = useLatestRun();
  const consensus = run.consensusAge!;
  const [selectedClock, setSelectedClock] = useState<ClockName>('altumage');

  const selectedResult = run.clockResults.find((r) => r.clockName === selectedClock);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-chronos-primary-500 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-400">Loading pipeline runs...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-gray-100">
            Clock Comparison
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Multi-clock biological age consensus for sample{' '}
            <span className="font-mono text-gray-400">{run.sampleId}</span>
          </p>
          {error && (
            <p className="mt-1 text-xs text-amber-400">
              Could not reach API — showing mock data
            </p>
          )}
        </div>

        {/* Run selector dropdown */}
        {allRuns.length > 1 && (
          <select
            value={run.runId}
            onChange={(e) => selectRun(e.target.value)}
            className="rounded-lg border border-surface-4 bg-surface-2 px-3 py-1.5 text-sm text-gray-300 focus:border-chronos-primary-500 focus:outline-none focus:ring-1 focus:ring-chronos-primary-500"
          >
            {allRuns.map((r) => (
              <option key={r.runId} value={r.runId}>
                {r.runId} — {r.status}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Section 1: Consensus Gauge */}
      <motion.section
        className="flex justify-center rounded-xl border border-surface-4 bg-surface-1 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ConsensusGauge
          consensusAge={consensus}
          chronologicalAge={run.chronologicalAge}
        />
      </motion.section>

      {/* Section 2: Clock Race Visualization */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <ClockRaceVisualization
          clockResults={run.clockResults}
          consensusAge={consensus}
        />
      </motion.section>

      {/* Section 3: Clock Results Table */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <ClockResultsTable
          clockResults={run.clockResults}
          weights={consensus.weights}
          consensusAge={consensus.consensusBiologicalAge}
        />
      </motion.section>

      {/* Section 4: CpG Contribution Table with clock selector */}
      <motion.section
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        <div className="flex items-center gap-2">
          {run.clockResults.map((r) => (
            <button
              key={r.clockName}
              onClick={() => setSelectedClock(r.clockName)}
              className={
                selectedClock === r.clockName
                  ? 'rounded-lg bg-chronos-primary-500/20 px-3 py-1.5 text-xs font-semibold text-chronos-primary-300 ring-1 ring-chronos-primary-500/40'
                  : 'rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-surface-3 hover:text-gray-300'
              }
            >
              {CLOCK_LABELS[r.clockName]}
            </button>
          ))}
        </div>

        {selectedResult && (
          <CpGContributionTable
            contributions={selectedResult.topContributingCpGs}
            clockName={CLOCK_LABELS[selectedClock]}
          />
        )}
      </motion.section>
    </div>
  );
}
