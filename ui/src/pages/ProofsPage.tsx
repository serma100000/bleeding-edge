import ZKProofCard from '@/components/proofs/ZKProofCard';
import { useLatestRun } from '@/hooks/useLatestRun';

export default function ProofsPage() {
  const { run, isLoading, error } = useLatestRun();
  const proof = run.proof;

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-chronos-primary-500 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-400">Loading proof data...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">ZK Proof Verification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Verify the zero-knowledge proof of your biological age computation without revealing
          underlying methylation data.
        </p>
        {error && (
          <p className="mt-1 text-xs text-amber-400">
            Could not reach API — showing mock data
          </p>
        )}
      </div>

      <ZKProofCard proof={proof} />
    </div>
  );
}
