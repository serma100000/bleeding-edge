import { FlaskConical, Clock, ShieldCheck, Activity } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { MOCK_PIPELINE_RUN, MOCK_TRAJECTORY } from '@/lib/mock-data';
import { formatAge, getAgeStatus, getAgeStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

const mockAnalyses = [MOCK_PIPELINE_RUN];

export default function DashboardPage() {
  const totalAnalyses = mockAnalyses.length;
  const avgBioAge =
    mockAnalyses.reduce((sum, r) => sum + (r.consensusAge?.consensusBiologicalAge ?? 0), 0) /
    totalAnalyses;
  const proofCount = mockAnalyses.filter((r) => r.proof).length;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gray-100">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FlaskConical}
          label="Total Analyses"
          value={totalAnalyses}
          trend={{ direction: 'up', percentage: 12 }}
        />
        <StatCard
          icon={Clock}
          label="Average Bio Age"
          value={formatAge(avgBioAge)}
          trend={{ direction: 'down', percentage: 2.4 }}
          iconColor="bg-chronos-accent-500/10 text-chronos-accent-400"
        />
        <StatCard
          icon={ShieldCheck}
          label="Proof Verifications"
          value={proofCount}
          iconColor="bg-chronos-verified/10 text-chronos-verified"
        />
        <StatCard
          icon={Activity}
          label="Active Clocks"
          value={4}
          iconColor="bg-chronos-younger/10 text-chronos-younger"
        />
      </div>

      {/* Recent analyses + system health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent analyses table */}
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">Recent Analyses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-4 text-left text-gray-400">
                  <th className="pb-3 pr-4 font-medium">Sample ID</th>
                  <th className="pb-3 pr-4 font-medium">Chrono Age</th>
                  <th className="pb-3 pr-4 font-medium">Bio Age</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {mockAnalyses.map((run) => {
                  const bioAge = run.consensusAge?.consensusBiologicalAge ?? 0;
                  const acceleration = bioAge - run.chronologicalAge;
                  const status = getAgeStatus(acceleration);
                  return (
                    <tr
                      key={run.runId}
                      className="border-b border-surface-4/50 transition-colors hover:bg-surface-3/30"
                    >
                      <td className="py-3 pr-4 font-mono text-gray-200">{run.sampleId}</td>
                      <td className="py-3 pr-4 text-gray-300">{run.chronologicalAge}</td>
                      <td className="py-3 pr-4">
                        <span className={cn('font-semibold', getAgeStatusColor(status))}>
                          {formatAge(bioAge)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'badge',
                            status === 'younger' && 'badge-younger',
                            status === 'ontrack' && 'badge-ontrack',
                            status === 'accelerated' && 'badge-accelerated',
                          )}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(run.startedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* System health */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">System Health</h2>
          <div className="space-y-4">
            {[
              { label: 'Pipeline Engine', status: 'operational' },
              { label: 'ZK Prover (Groth16)', status: 'operational' },
              { label: 'Knowledge Graph', status: 'operational' },
              { label: 'Embedding Service', status: 'degraded' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      item.status === 'operational' ? 'bg-chronos-younger' : 'bg-chronos-ontrack',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      item.status === 'operational'
                        ? 'text-chronos-younger'
                        : 'text-chronos-ontrack',
                    )}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-surface-4 pt-4">
            <p className="text-xs text-gray-500">
              Last trajectory point:{' '}
              <span className="text-gray-400">
                {MOCK_TRAJECTORY[MOCK_TRAJECTORY.length - 1].timestamp}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
