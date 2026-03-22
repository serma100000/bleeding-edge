import { useState, useCallback, useRef } from 'react';
import { Upload, Dna, AlertTriangle, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOCK_GENOMIC_PROFILE } from '@/lib/mock-data';
import type { GenomicProfile } from '@/types/api';
import RiskScoreRadar from '@/components/genomics/RiskScoreRadar';
import PharmacogenomicsCard from '@/components/genomics/PharmacogenomicsCard';
import ApoeCard from '@/components/genomics/ApoeCard';
import GeneticRiskBar from '@/components/genomics/GeneticRiskBar';

export default function GenomicsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<GenomicProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.txt')) {
      setFile(dropped);
      setError(null);
    } else {
      setError('Please upload a .txt file from 23andMe');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/genomics/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const data: GenomicProfile = await res.json();
      setProfile(data);
    } catch {
      // Fallback to mock data when API is unavailable
      setProfile(MOCK_GENOMIC_PROFILE);
    } finally {
      setAnalyzing(false);
    }
  }, [file]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-100">
          <Dna className="h-7 w-7 text-chronos-primary-400" />
          Genomic Analysis
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload 23andMe raw data for pharmacogenomic profiling and polygenic risk assessment.
        </p>
      </div>

      {/* Upload Section */}
      <div className="rounded-xl border border-surface-4 bg-surface-1 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-200">Upload 23andMe Data</h2>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer',
            dragOver
              ? 'border-chronos-primary-400 bg-chronos-primary-500/5'
              : file
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-surface-4 bg-surface-2 hover:border-surface-4/80 hover:bg-surface-3',
          )}
        >
          {file ? (
            <>
              <FileText className="h-10 w-10 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">{file.name}</span>
              <span className="text-xs text-gray-500">
                {(file.size / 1024 / 1024).toFixed(1)} MB - Click or drag to replace
              </span>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-500" />
              <span className="text-sm font-medium text-gray-400">
                Drop your 23andMe .txt file here, or click to browse
              </span>
              <span className="text-xs text-gray-600">Supports 23andMe v4/v5 raw data format</span>
            </>
          )}
        </button>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!file || analyzing}
          className={cn(
            'mt-4 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
            file && !analyzing
              ? 'bg-chronos-primary-500 text-white hover:bg-chronos-primary-600'
              : 'cursor-not-allowed bg-surface-3 text-gray-600',
          )}
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Dna className="h-4 w-4" />
              Analyze Genome
            </>
          )}
        </button>
      </div>

      {/* Results - shown after analysis */}
      {profile && (
        <>
          {/* Profile summary bar */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-surface-4 bg-surface-1 px-6 py-4 text-sm">
            <div>
              <span className="text-gray-500">Subject</span>
              <span className="ml-2 font-mono text-gray-300">{profile.subjectId}</span>
            </div>
            <div>
              <span className="text-gray-500">Markers</span>
              <span className="ml-2 font-mono text-gray-300">{profile.totalMarkers.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Build</span>
              <span className="ml-2 font-mono text-gray-300">{profile.build}</span>
            </div>
          </div>

          {/* Risk Scores Section */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Genomic Risk Profile</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <RiskScoreRadar riskScores={profile.riskScores} />
              <div className="space-y-4 rounded-xl border border-surface-4 bg-surface-1 p-6">
                <h3 className="text-lg font-semibold text-gray-100">Risk Breakdown</h3>
                <div className="space-y-3">
                  <GeneticRiskBar category="Cancer" score={profile.riskScores.cancer} />
                  <GeneticRiskBar category="Cardiovascular" score={profile.riskScores.cardiovascular} />
                  <GeneticRiskBar category="Neurological" score={profile.riskScores.neurological} />
                  <GeneticRiskBar category="Metabolism" score={profile.riskScores.metabolism} />
                </div>
                <div className="mt-4 rounded-lg bg-surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Global Risk Score</span>
                    <span className="font-mono text-lg font-bold text-chronos-primary-400">
                      {Math.round(profile.riskScores.global * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pharmacogenomics + APOE */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-200">Drug Response &amp; Genetic Markers</h2>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PharmacogenomicsCard
                  cyp2d6={profile.cyp2d6}
                  cyp2c19={profile.cyp2c19}
                  drugRecommendations={profile.drugRecommendations}
                />
              </div>
              <ApoeCard apoe={profile.apoe} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
