import { cn } from '@/lib/utils';
import type { DrugRecommendation } from '@/types/api';

interface CypResult {
  allele1: string;
  allele2: string;
  phenotype: string;
  activity: number;
}

interface PharmacogenomicsCardProps {
  cyp2d6: CypResult;
  cyp2c19: CypResult;
  drugRecommendations: DrugRecommendation[];
}

function getPhenotypeBadgeColor(phenotype: string): string {
  const p = phenotype.toLowerCase();
  if (p.includes('ultra')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (p.includes('normal')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (p.includes('intermediate')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (p.includes('poor')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function getDoseBarColor(doseFactor: number): string {
  if (doseFactor >= 1.0) return 'bg-emerald-500';
  if (doseFactor >= 0.75) return 'bg-yellow-500';
  return 'bg-red-500';
}

function CypColumn({ label, data }: { label: string; data: CypResult }) {
  return (
    <div className="flex-1 space-y-3">
      <h4 className="text-sm font-semibold text-chronos-accent-400">{label}</h4>
      <div className="font-mono text-lg text-gray-200">
        {data.allele1}/{data.allele2}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Activity:</span>
        <span className="font-mono text-sm text-gray-300">{data.activity.toFixed(1)}</span>
      </div>
      <span
        className={cn(
          'inline-block rounded-full border px-3 py-1 text-xs font-medium',
          getPhenotypeBadgeColor(data.phenotype),
        )}
      >
        {data.phenotype}
      </span>
    </div>
  );
}

export default function PharmacogenomicsCard({
  cyp2d6,
  cyp2c19,
  drugRecommendations,
}: PharmacogenomicsCardProps) {
  return (
    <div className="rounded-xl border border-surface-4 bg-surface-1 p-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-100">Pharmacogenomics</h3>

      {/* CYP columns */}
      <div className="mb-6 flex gap-6 border-b border-surface-4 pb-6">
        <CypColumn label="CYP2D6" data={cyp2d6} />
        <div className="w-px bg-surface-4" />
        <CypColumn label="CYP2C19" data={cyp2c19} />
      </div>

      {/* Drug recommendations */}
      <h4 className="mb-3 text-sm font-semibold text-gray-300">Drug Recommendations</h4>
      <div className="space-y-3">
        {drugRecommendations.map((rec) => (
          <div key={rec.drug} className="rounded-lg bg-surface-2 p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200">{rec.drug}</span>
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-gray-500">
                  {rec.gene}
                </span>
              </div>
              <span className="font-mono text-xs text-gray-400">
                {Math.round(rec.doseFactor * 100)}%
              </span>
            </div>
            <p className="mb-2 text-xs text-gray-500">{rec.recommendation}</p>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getDoseBarColor(rec.doseFactor))}
                style={{ width: `${rec.doseFactor * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
