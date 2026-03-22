import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Clock, ShieldCheck, Activity, Users, Search } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { MOCK_PIPELINE_RUN, MOCK_TRAJECTORY } from '@/lib/mock-data';
import type { PipelineRun } from '@/types/api';
import { formatAge, getAgeStatus, getAgeStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { apiGet } from '@/hooks/useApi';

interface HealthResponse {
  status: string;
  clocks: number;
  runs: number;
  ruvector: {
    status: string;
    methylationStore: number;
    patientStore: number;
    interventionStore: number;
  };
}

interface PopulationEntry {
  id: string;
  metadata?: {
    chronologicalAge?: number;
    sex?: string;
    tissueType?: string;
    subjectId?: string;
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<PipelineRun[]>([MOCK_PIPELINE_RUN]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [population, setPopulation] = useState<PopulationEntry[]>([]);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [runs, h, pop] = await Promise.all([
          apiGet<PipelineRun[]>('/results'),
          apiGet<HealthResponse>('/health'),
          apiGet<PopulationEntry[]>('/store/population'),
        ]);
        if (cancelled) return;
        setAnalyses(runs.length > 0 ? runs : [MOCK_PIPELINE_RUN]);
        setHealth(h);
        setPopulation(pop);
        setApiAvailable(true);
      } catch {
        if (cancelled) return;
        // API unavailable — keep mock data as fallback
        setAnalyses([MOCK_PIPELINE_RUN]);
        setApiAvailable(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Debounced population search
  useEffect(() => {
    if (!apiAvailable) return;
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (minAge) params.set('minAge', minAge);
        if (maxAge) params.set('maxAge', maxAge);
        const qs = params.toString();
        const pop = await apiGet<PopulationEntry[]>(`/store/population${qs ? '?' + qs : ''}`);
        setPopulation(pop);
      } catch {
        // keep existing data on error
      }
    }, 300);

    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchQuery, minAge, maxAge, apiAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  const completedAnalyses = analyses.filter((r) => r.status === 'complete');
  const totalAnalyses = analyses.length + population.length;
  const avgBioAge =
    completedAnalyses.length > 0
      ? completedAnalyses.reduce(
          (sum, r) => sum + (r.consensusAge?.consensusBiologicalAge ?? 0),
          0,
        ) / completedAnalyses.length
      : 0;
  const proofCount = analyses.filter((r) => r.proof).length;
  const activeClocks = health?.clocks ?? 4;

  const ruvectorStatus = health?.ruvector?.status ?? 'unknown';

  const healthItems = health
    ? [
        {
          label: 'Pipeline Engine',
          status: health.status === 'ok' ? 'operational' : 'degraded',
        },
        {
          label: 'ZK Prover (Groth16)',
          status: health.status === 'ok' ? 'operational' : 'degraded',
        },
        {
          label: 'Knowledge Graph',
          status: health.status === 'ok' ? 'operational' : 'degraded',
        },
        {
          label: 'RuVector Backend',
          status: ruvectorStatus === 'operational' ? 'operational' : 'degraded',
        },
      ]
    : [
        { label: 'Pipeline Engine', status: 'operational' },
        { label: 'ZK Prover (Groth16)', status: 'operational' },
        { label: 'Knowledge Graph', status: 'operational' },
        { label: 'RuVector Backend', status: 'degraded' },
      ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-gray-100">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={FlaskConical}
          label="Total Analyses"
          value={totalAnalyses}
        />
        <StatCard
          icon={Users}
          label="Population Samples"
          value={population.length}
          iconColor="bg-chronos-accent-500/10 text-chronos-accent-400"
        />
        <StatCard
          icon={Clock}
          label="Average Bio Age"
          value={completedAnalyses.length > 0 ? formatAge(avgBioAge) : '--'}
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
          value={activeClocks}
          iconColor="bg-chronos-younger/10 text-chronos-younger"
        />
      </div>

      {/* Recent analyses + system health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent analyses table */}
        <div className="card lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">Recent Analyses</h2>
          {analyses.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No analyses yet. Start a new analysis to see results here.
            </p>
          ) : (
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
                  {analyses.map((run) => {
                    const bioAge = run.consensusAge?.consensusBiologicalAge ?? 0;
                    const acceleration = bioAge - run.chronologicalAge;
                    const status = getAgeStatus(acceleration);
                    return (
                      <tr
                        key={run.runId}
                        onClick={() => navigate(`/record/${encodeURIComponent(run.sampleId)}`)}
                        className="cursor-pointer border-b border-surface-4/50 transition-colors hover:bg-surface-3/30"
                      >
                        <td className="py-3 pr-4 font-mono text-gray-200">{run.sampleId}</td>
                        <td className="py-3 pr-4 text-gray-300">{run.chronologicalAge}</td>
                        <td className="py-3 pr-4">
                          {run.status === 'complete' ? (
                            <span className={cn('font-semibold', getAgeStatusColor(status))}>
                              {formatAge(bioAge)}
                            </span>
                          ) : (
                            <span className="text-gray-500">{run.status}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {run.status === 'complete' ? (
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
                          ) : (
                            <span className="badge text-gray-400">{run.status}</span>
                          )}
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
          )}
        </div>

        {/* System health */}
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">System Health</h2>
          <div className="space-y-4">
            {healthItems.map((item) => (
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
              {apiAvailable ? (
                <>
                  API connected{' '}
                  <span className="text-gray-400">
                    ({health?.runs ?? 0} pipeline runs, {health?.ruvector?.methylationStore ?? 0} methylation entries)
                  </span>
                </>
              ) : (
                <>
                  Last trajectory point:{' '}
                  <span className="text-gray-400">
                    {MOCK_TRAJECTORY[MOCK_TRAJECTORY.length - 1].timestamp}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Population Reference */}
      {(population.length > 0 || searchQuery || minAge || maxAge) && (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">
            Population Reference{' '}
            <span className="text-sm font-normal text-gray-400">({population.length} samples)</span>
          </h2>

          {/* Search filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by sample ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-surface-4 bg-surface-3 py-2 pl-9 pr-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-chronos-primary/50 focus:ring-1 focus:ring-chronos-primary/30"
              />
            </div>
            <input
              type="number"
              placeholder="Min age"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              className="w-24 rounded-lg border border-surface-4 bg-surface-3 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-chronos-primary/50 focus:ring-1 focus:ring-chronos-primary/30"
            />
            <input
              type="number"
              placeholder="Max age"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              className="w-24 rounded-lg border border-surface-4 bg-surface-3 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-chronos-primary/50 focus:ring-1 focus:ring-chronos-primary/30"
            />
            {(searchQuery || minAge || maxAge) && (
              <button
                onClick={() => { setSearchQuery(''); setMinAge(''); setMaxAge(''); }}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="border-b border-surface-4 text-left text-gray-400">
                  <th className="pb-3 pr-4 font-medium">Sample ID</th>
                  <th className="pb-3 pr-4 font-medium">Age</th>
                  <th className="pb-3 pr-4 font-medium">Sex</th>
                  <th className="pb-3 font-medium">Tissue</th>
                </tr>
              </thead>
              <tbody>
                {population.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                      No samples match your filters.
                    </td>
                  </tr>
                ) : (
                  population.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => navigate(`/record/${encodeURIComponent(entry.id)}`)}
                      className="cursor-pointer border-b border-surface-4/50 transition-colors hover:bg-surface-3/30"
                    >
                      <td className="py-2 pr-4 font-mono text-gray-200">{entry.id}</td>
                      <td className="py-2 pr-4 text-gray-300">
                        {entry.metadata?.chronologicalAge ?? '--'}
                      </td>
                      <td className="py-2 pr-4 text-gray-300">
                        {entry.metadata?.sex ?? '--'}
                      </td>
                      <td className="py-2 text-gray-300">
                        {entry.metadata?.tissueType ?? '--'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
