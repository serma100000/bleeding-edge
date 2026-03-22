import { cn } from '@/lib/utils';
import { AlertTriangle, ShieldCheck, Info } from 'lucide-react';

interface ApoeCardProps {
  apoe: { genotype: string };
}

function getAlleleColor(genotype: string): string {
  if (genotype.includes('e4')) return 'text-red-400';
  if (genotype.includes('e2')) return 'text-emerald-400';
  return 'text-gray-300';
}

function getBorderColor(genotype: string): string {
  if (genotype.includes('e4')) return 'border-red-500/30';
  if (genotype.includes('e2')) return 'border-emerald-500/30';
  return 'border-surface-4';
}

function getRiskIcon(genotype: string) {
  if (genotype.includes('e4')) return <AlertTriangle className="h-5 w-5 text-red-400" />;
  if (genotype.includes('e2')) return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
  return <Info className="h-5 w-5 text-gray-400" />;
}

function getRiskText(genotype: string): string {
  if (genotype === 'e4/e4') return 'Significantly elevated Alzheimer\'s risk (~12x). Consult a genetic counselor.';
  if (genotype === 'e3/e4') return 'Moderately elevated Alzheimer\'s risk (~3x average). Consider lifestyle interventions.';
  if (genotype === 'e2/e4') return 'Mixed alleles. Risk modestly elevated; e2 offers partial protection.';
  if (genotype.includes('e2')) return 'Lower-than-average Alzheimer\'s risk. e2 allele is protective.';
  if (genotype === 'e3/e3') return 'Average population risk. Most common genotype.';
  return 'Consult a genetic counselor for personalized interpretation.';
}

export default function ApoeCard({ apoe }: ApoeCardProps) {
  return (
    <div className={cn('rounded-xl border bg-surface-1 p-6', getBorderColor(apoe.genotype))}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100">APOE Genotype</h3>
        {getRiskIcon(apoe.genotype)}
      </div>

      <div className="mb-4 flex items-center justify-center">
        <span className={cn('font-mono text-5xl font-bold tracking-wider', getAlleleColor(apoe.genotype))}>
          {apoe.genotype}
        </span>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-gray-400">
        {getRiskText(apoe.genotype)}
      </p>

      <a
        href="https://www.alz.org/alzheimers-dementia/what-is-alzheimers/risk-factors/genetics"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-chronos-primary-400 hover:text-chronos-primary-300 transition-colors"
      >
        <Info className="h-3 w-3" />
        Learn more about APOE and Alzheimer's risk
      </a>
    </div>
  );
}
