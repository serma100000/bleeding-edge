import { useState } from 'react';
import { motion } from 'framer-motion';
import ConsensusGauge from '@/components/clocks/ConsensusGauge';
import ClockRaceVisualization from '@/components/clocks/ClockRaceVisualization';
import ClockResultsTable from '@/components/tables/ClockResultsTable';
import CpGContributionTable from '@/components/tables/CpGContributionTable';
import { MOCK_PIPELINE_RUN } from '@/lib/mock-data';
import type { ClockName } from '@/types/api';

const CLOCK_LABELS: Record<ClockName, string> = {
  altumage: 'AltumAge',
  grimage: 'GrimAge',
  deepstrataage: 'DeepStrataAge',
  epinflamm: 'EpiInflamm',
};

export default function ClocksPage() {
  const run = MOCK_PIPELINE_RUN;
  const consensus = run.consensusAge!;
  const [selectedClock, setSelectedClock] = useState<ClockName>('altumage');

  const selectedResult = run.clockResults.find((r) => r.clockName === selectedClock);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-bold text-gray-100">
          Clock Comparison
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Multi-clock biological age consensus for sample{' '}
          <span className="font-mono text-gray-400">{run.sampleId}</span>
        </p>
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
