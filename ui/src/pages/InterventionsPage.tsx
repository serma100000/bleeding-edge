import InterventionCardGrid from '@/components/interventions/InterventionCardGrid';
import { MOCK_PIPELINE_RUN } from '@/lib/mock-data';

export default function InterventionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">
          Interventions
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Personalized recommendations based on your epigenetic profile
        </p>
      </div>

      <InterventionCardGrid
        recommendations={MOCK_PIPELINE_RUN.recommendations}
      />
    </div>
  );
}
