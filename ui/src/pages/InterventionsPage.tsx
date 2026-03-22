import { useState, useEffect } from 'react';
import InterventionCardGrid from '@/components/interventions/InterventionCardGrid';
import { MOCK_PIPELINE_RUN } from '@/lib/mock-data';
import type { PipelineRun, InterventionRecommendation } from '@/types/api';

export default function InterventionsPage() {
  const [recommendations, setRecommendations] = useState<InterventionRecommendation[]>(
    MOCK_PIPELINE_RUN.recommendations,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/results')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((runs: PipelineRun[]) => {
        if (cancelled) return;
        const completed = runs.find(r => r.status === 'complete');
        if (completed && completed.recommendations.length > 0) {
          setRecommendations(completed.recommendations);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
        // fallback data already set as initial state
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">
          Interventions
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Personalized recommendations based on your epigenetic profile
        </p>
        {isLoading && (
          <p className="mt-1 text-xs text-gray-600">Loading recommendations...</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-amber-500">
            Using demo data (API unavailable)
          </p>
        )}
      </div>

      <InterventionCardGrid
        recommendations={recommendations}
      />
    </div>
  );
}
