import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FlaskConical, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_PIPELINE_RUN } from '@/lib/mock-data';
import type { PipelineRun } from '@/types/api';
import PipelineProgressTracker from '@/components/pipeline/PipelineProgressTracker';
import { apiGet, apiPost } from '@/hooks/useApi';

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pipelineRun, setPipelineRun] = useState<PipelineRun | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    chronologicalAge: '',
    sex: '',
    tissueType: '',
    arrayType: '',
  });

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  const pollForResult = useCallback((runId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const result = await apiGet<PipelineRun>(`/result/${runId}`);
        setPipelineRun(result);

        if (result.status === 'complete' || result.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // Keep polling on transient errors
      }
    }, 1000);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setSubmitting(true);

      try {
        // Read CSV file content
        const csvData = file ? await file.text() : '';

        const { runId } = await apiPost<{ runId: string }>('/submit', {
          csvData,
          metadata: {
            chronologicalAge: Number(form.chronologicalAge),
            sex: form.sex,
            tissueType: form.tissueType,
            arrayType: form.arrayType,
          },
        });

        // Set initial pipeline state while we wait for first poll
        setPipelineRun({
          runId,
          sampleId: file?.name ?? 'unknown',
          status: 'ingesting',
          startedAt: new Date().toISOString(),
          chronologicalAge: Number(form.chronologicalAge),
          clockResults: [],
          recommendations: [],
          metrics: {
            ingestionTimeMs: 0,
            embeddingTimeMs: 0,
            inferenceTimeMs: 0,
            consensusTimeMs: 0,
            provingTimeMs: 0,
            indexingTimeMs: 0,
            totalTimeMs: 0,
          },
        });

        setSubmitted(true);
        setSubmitting(false);

        // Start polling for progress
        pollForResult(runId);
      } catch (err) {
        // API unavailable — fall back to mock data
        setSubmitting(false);
        setPipelineRun(MOCK_PIPELINE_RUN);
        setSubmitted(true);
        setSubmitError(
          err instanceof Error ? err.message : 'API unavailable, showing demo results',
        );
      }
    },
    [file, form, pollForResult],
  );

  if (submitted) {
    const run = pipelineRun ?? MOCK_PIPELINE_RUN;
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-gray-100">Pipeline Progress</h1>
        {submitError && (
          <div className="flex items-center gap-2 rounded-lg border border-chronos-ontrack/30 bg-chronos-ontrack/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-chronos-ontrack" />
            <span className="text-sm text-chronos-ontrack">{submitError}</span>
          </div>
        )}
        <PipelineProgressTracker run={run} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-gray-100">New Analysis</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'relative card flex flex-col items-center justify-center gap-3 border-2 border-dashed py-12 transition-colors',
            dragOver
              ? 'border-chronos-primary-400 bg-chronos-primary-500/5'
              : 'border-surface-4 hover:border-gray-600',
          )}
        >
          <Upload
            className={cn(
              'h-10 w-10',
              file ? 'text-chronos-younger' : 'text-gray-500',
            )}
          />
          {file ? (
            <p className="text-sm text-gray-200">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-gray-300">Drop methylation CSV here</p>
              <p className="text-xs text-gray-500">or click to browse</p>
            </>
          )}
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>

        {/* Metadata form */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-100">Sample Metadata</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Chronological Age</label>
              <input
                type="number"
                min={0}
                max={120}
                value={form.chronologicalAge}
                onChange={(e) => setForm((f) => ({ ...f, chronologicalAge: e.target.value }))}
                placeholder="e.g. 45"
                className="w-full rounded-lg border border-surface-4 bg-surface-2 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none transition-colors focus:border-chronos-primary-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Sex</label>
              <select
                value={form.sex}
                onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                className="w-full rounded-lg border border-surface-4 bg-surface-2 px-3 py-2 text-sm text-gray-100 outline-none transition-colors focus:border-chronos-primary-500"
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Tissue Type</label>
              <select
                value={form.tissueType}
                onChange={(e) => setForm((f) => ({ ...f, tissueType: e.target.value }))}
                className="w-full rounded-lg border border-surface-4 bg-surface-2 px-3 py-2 text-sm text-gray-100 outline-none transition-colors focus:border-chronos-primary-500"
              >
                <option value="">Select</option>
                <option value="blood">Whole Blood</option>
                <option value="saliva">Saliva</option>
                <option value="buccal">Buccal</option>
                <option value="brain">Brain</option>
                <option value="liver">Liver</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Array Type</label>
              <select
                value={form.arrayType}
                onChange={(e) => setForm((f) => ({ ...f, arrayType: e.target.value }))}
                className="w-full rounded-lg border border-surface-4 bg-surface-2 px-3 py-2 text-sm text-gray-100 outline-none transition-colors focus:border-chronos-primary-500"
              >
                <option value="">Select</option>
                <option value="450k">Illumina 450K</option>
                <option value="epic">Illumina EPIC</option>
                <option value="epicv2">Illumina EPICv2</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-chronos-primary-600 to-chronos-primary-500 px-6 py-3 font-semibold text-white shadow-lg shadow-chronos-primary-500/20 transition-all hover:from-chronos-primary-500 hover:to-chronos-primary-400 hover:shadow-chronos-primary-500/30',
            submitting && 'cursor-not-allowed opacity-60',
          )}
        >
          <FlaskConical className="h-5 w-5" />
          {submitting ? 'Submitting...' : 'Run Analysis'}
        </button>
      </form>
    </div>
  );
}
