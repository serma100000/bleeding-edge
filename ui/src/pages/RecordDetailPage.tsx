import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FlaskConical, ShieldCheck, Clock, Activity } from 'lucide-react';
import { apiGet } from '@/hooks/useApi';
import { cn, formatAge, getAgeStatus, getAgeStatusColor } from '@/lib/utils';
import type { PipelineRun } from '@/types/api';

interface PopulationDetail {
  id: string;
  metadata?: {
    chronologicalAge?: number;
    sex?: string;
    tissueType?: string;
    subjectId?: string;
  };
  vector?: number[];
}

export default function RecordDetailPage() {
  const { sampleId } = useParams<{ sampleId: string }>();
  const navigate = useNavigate();

  const [populationEntry, setPopulationEntry] = useState<PopulationDetail | null>(null);
  const [pipelineRun, setPipelineRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sampleId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Try to fetch both population entry and pipeline run in parallel
        const [popResult, runsResult] = await Promise.allSettled([
          apiGet<PopulationDetail>(`/store/population/${encodeURIComponent(sampleId!)}`),
          apiGet<PipelineRun[]>('/results'),
        ]);

        if (cancelled) return;

        if (popResult.status === 'fulfilled') {
          setPopulationEntry(popResult.value);
        }

        if (runsResult.status === 'fulfilled') {
          const match = runsResult.value.find(r => r.sampleId === sampleId || r.runId === sampleId);
          if (match) setPipelineRun(match);
        }

        if (popResult.status === 'rejected' && runsResult.status === 'rejected') {
          setError('Record not found');
        }
      } catch {
        if (!cancelled) setError('Failed to load record');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sampleId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="card flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-gray-400">
            <Activity className="h-5 w-5 animate-pulse" />
            <span>Loading record...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !populationEntry && !pipelineRun) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>
        <div className="card py-16 text-center">
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  const meta = populationEntry?.metadata;
  const hasPipeline = pipelineRun && pipelineRun.status === 'complete';
  const bioAge = pipelineRun?.consensusAge?.consensusBiologicalAge;
  const acceleration = bioAge !== undefined ? bioAge - (pipelineRun?.chronologicalAge ?? 0) : undefined;
  const status = acceleration !== undefined ? getAgeStatus(acceleration) : undefined;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chronos-primary/10">
          <FlaskConical className="h-6 w-6 text-chronos-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100 font-mono">{sampleId}</h1>
          <p className="text-sm text-gray-400">
            {hasPipeline ? 'Pipeline Run' : 'Population Record'}
            {pipelineRun?.status && !hasPipeline ? ` (${pipelineRun.status})` : ''}
          </p>
        </div>
        {status && (
          <span
            className={cn(
              'badge ml-auto',
              status === 'younger' && 'badge-younger',
              status === 'ontrack' && 'badge-ontrack',
              status === 'accelerated' && 'badge-accelerated',
            )}
          >
            {status}
          </span>
        )}
      </div>

      {/* Metadata Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-100">
            <User className="h-5 w-5 text-gray-400" /> Sample Metadata
          </h2>
          <dl className="space-y-3">
            <MetaRow label="Sample ID" value={sampleId} mono />
            <MetaRow label="Chronological Age" value={meta?.chronologicalAge != null ? String(meta.chronologicalAge) : '--'} />
            <MetaRow label="Sex" value={meta?.sex ?? '--'} />
            <MetaRow label="Tissue Type" value={meta?.tissueType ?? '--'} />
            {meta?.subjectId && <MetaRow label="Subject ID" value={meta.subjectId} mono />}
          </dl>

          {/* Vector preview */}
          {populationEntry?.vector && populationEntry.vector.length > 0 && (
            <div className="mt-4 border-t border-surface-4 pt-4">
              <p className="mb-2 text-xs font-medium text-gray-400">Embedding Preview (first 10 dims)</p>
              <div className="flex flex-wrap gap-1">
                {populationEntry.vector.map((v, i) => (
                  <span key={i} className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-gray-300">
                    {v.toFixed(4)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Results or Action Card */}
        {hasPipeline ? (
          <div className="card">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-100">
              <Clock className="h-5 w-5 text-gray-400" /> Clock Results
            </h2>
            <dl className="space-y-3">
              <MetaRow
                label="Consensus Bio Age"
                value={bioAge !== undefined ? formatAge(bioAge) : '--'}
                valueClass={status ? getAgeStatusColor(status) : undefined}
              />
              <MetaRow label="Consensus Method" value={pipelineRun!.consensusAge?.consensusMethod ?? '--'} />
              <MetaRow
                label="Confidence Interval"
                value={
                  pipelineRun!.consensusAge?.confidenceInterval
                    ? `${formatAge(pipelineRun!.consensusAge.confidenceInterval[0])} - ${formatAge(pipelineRun!.consensusAge.confidenceInterval[1])}`
                    : '--'
                }
              />
              <MetaRow
                label="Committed Clocks"
                value={String(pipelineRun!.consensusAge?.committedClocks ?? '--')}
              />
            </dl>

            {/* Individual clock results */}
            {pipelineRun!.clockResults.length > 0 && (
              <div className="mt-4 border-t border-surface-4 pt-4">
                <p className="mb-2 text-xs font-medium text-gray-400">Individual Clocks</p>
                <div className="space-y-2">
                  {pipelineRun!.clockResults.map(cr => (
                    <div key={cr.clockName} className="flex items-center justify-between rounded bg-surface-3/50 px-3 py-2">
                      <span className="text-sm font-medium text-gray-200">{cr.clockName}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-300">{formatAge(cr.biologicalAge)}</span>
                        <span className="text-xs text-gray-500">
                          {cr.confidence > 0 ? `${(cr.confidence * 100).toFixed(0)}% conf` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-12">
            <FlaskConical className="mb-4 h-10 w-10 text-gray-500" />
            <p className="mb-4 text-sm text-gray-400">No pipeline analysis has been run on this sample yet.</p>
            <button
              onClick={() => navigate('/analysis')}
              className="rounded-lg bg-chronos-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-chronos-primary/80"
            >
              Run Analysis on this Sample
            </button>
          </div>
        )}
      </div>

      {/* Proof card */}
      {pipelineRun?.proof && (
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-100">
            <ShieldCheck className="h-5 w-5 text-chronos-verified" /> ZK Proof
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaRow label="Bio Age (proven)" value={String(pipelineRun.proof.publicSignals.biologicalAge)} />
            <MetaRow label="Consensus Method" value={pipelineRun.proof.publicSignals.consensusMethod} />
            <MetaRow label="Proving Time" value={`${pipelineRun.proof.provingTimeMs}ms`} />
            <MetaRow label="Proof Size" value={`${pipelineRun.proof.proofSizeBytes} bytes`} />
            <MetaRow label="Circuit Hash" value={pipelineRun.proof.circuitHash} mono truncate />
          </dl>
        </div>
      )}

      {/* Recommendations */}
      {pipelineRun?.recommendations && pipelineRun.recommendations.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-100">Intervention Recommendations</h2>
          <div className="space-y-3">
            {pipelineRun.recommendations.map((rec, i) => (
              <div key={i} className="rounded-lg border border-surface-4 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-200">{rec.interventionName}</span>
                  <span className="badge">{rec.category}</span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                  <span>Effect: {rec.expectedEffectYears > 0 ? '-' : '+'}{Math.abs(rec.expectedEffectYears).toFixed(1)} years</span>
                  <span>Evidence: {rec.evidenceLevel}</span>
                  <span>Confidence: {(rec.confidenceScore * 100).toFixed(0)}%</span>
                  <span>Similar profiles: {rec.similarProfileCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
  truncate,
  valueClass,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  truncate?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-gray-400">{label}</dt>
      <dd
        className={cn(
          'text-sm text-gray-200',
          mono && 'font-mono',
          truncate && 'max-w-[200px] truncate',
          valueClass,
        )}
        title={truncate ? value : undefined}
      >
        {value ?? '--'}
      </dd>
    </div>
  );
}
