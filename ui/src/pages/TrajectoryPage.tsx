import { useState, useEffect } from 'react';
import AgingTrajectoryChart from '@/components/trajectory/AgingTrajectoryChart';
import VelocityCard from '@/components/trajectory/VelocityCard';
import { MOCK_TRAJECTORY, MOCK_PIPELINE_RUN } from '@/lib/mock-data';
import type { PipelineRun, TrajectoryPoint } from '@/types/api';

interface TrajectoryResponse {
  points: TrajectoryPoint[];
  velocity: number;
  anomaly: { isAnomaly: boolean; deviation: number };
}

export default function TrajectoryPage() {
  const [trajectoryPoints, setTrajectoryPoints] = useState<TrajectoryPoint[]>(MOCK_TRAJECTORY);
  const [velocity, setVelocity] = useState(MOCK_PIPELINE_RUN.consensusAge?.agingVelocity ?? 0.85);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Step 1: get latest completed run to find a subjectId
        const runsRes = await fetch('/api/results');
        if (!runsRes.ok) throw new Error(runsRes.statusText);
        const runs: PipelineRun[] = await runsRes.json();
        const completedRun = runs.find(r => r.status === 'complete');
        if (!completedRun) throw new Error('no-completed-run');

        const subjectId = completedRun.sampleId;

        // Step 2: fetch trajectory for that subject
        const trajRes = await fetch(`/api/trajectory/${encodeURIComponent(subjectId)}`);
        if (!trajRes.ok) throw new Error(trajRes.statusText);
        const traj: TrajectoryResponse = await trajRes.json();

        if (cancelled) return;

        if (!traj.points || traj.points.length === 0) {
          setIsEmpty(true);
          // keep mock data as fallback
        } else {
          setTrajectoryPoints(traj.points);
          setVelocity(traj.velocity);
          setIsEmpty(false);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        setError(String(e));
        // fallback data already set as initial state
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">
          Aging Trajectory
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Biological age trends over time with confidence intervals
        </p>
        {isLoading && (
          <p className="mt-1 text-xs text-gray-600">Loading trajectory data...</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-amber-500">
            Using demo data (API unavailable)
          </p>
        )}
        {isEmpty && !isLoading && (
          <p className="mt-2 text-sm text-amber-400">
            No trajectory data -- submit multiple samples for the same subject to track aging over time.
          </p>
        )}
      </div>

      <AgingTrajectoryChart
        trajectoryPoints={trajectoryPoints}
        agingVelocity={velocity}
      />

      <div className="max-w-md">
        <VelocityCard velocity={velocity} />
      </div>
    </div>
  );
}
