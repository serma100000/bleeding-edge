import { useState, useEffect } from 'react';
import type { PipelineRun } from '@/types/api';
import { MOCK_PIPELINE_RUN } from '@/lib/mock-data';
import { apiGet } from '@/hooks/useApi';

interface UseLatestRunResult {
  run: PipelineRun;
  allRuns: PipelineRun[];
  isLoading: boolean;
  error: string | null;
  selectRun: (runId: string) => void;
}

export function useLatestRun(): UseLatestRunResult {
  const [allRuns, setAllRuns] = useState<PipelineRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRuns() {
      try {
        setIsLoading(true);
        setError(null);
        const runs = await apiGet<PipelineRun[]>('/results');

        if (cancelled) return;

        if (runs.length === 0) {
          setAllRuns([]);
          return;
        }

        setAllRuns(runs);

        const firstComplete = runs.find((r) => r.status === 'complete');
        if (firstComplete) {
          setSelectedRunId(firstComplete.runId);
        } else {
          setSelectedRunId(runs[0].runId);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch runs');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRuns();
    return () => { cancelled = true; };
  }, []);

  const selectedRun = allRuns.find((r) => r.runId === selectedRunId);
  const run = selectedRun ?? MOCK_PIPELINE_RUN;

  return {
    run,
    allRuns,
    isLoading,
    error,
    selectRun: setSelectedRunId,
  };
}
