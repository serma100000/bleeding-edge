import AgingTrajectoryChart from '@/components/trajectory/AgingTrajectoryChart';
import VelocityCard from '@/components/trajectory/VelocityCard';
import { MOCK_TRAJECTORY, MOCK_PIPELINE_RUN } from '@/lib/mock-data';

export default function TrajectoryPage() {
  const agingVelocity = MOCK_PIPELINE_RUN.consensusAge?.agingVelocity ?? 0.85;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">
          Aging Trajectory
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Biological age trends over time with confidence intervals
        </p>
      </div>

      <AgingTrajectoryChart
        trajectoryPoints={MOCK_TRAJECTORY}
        agingVelocity={agingVelocity}
      />

      <div className="max-w-md">
        <VelocityCard velocity={agingVelocity} />
      </div>
    </div>
  );
}
