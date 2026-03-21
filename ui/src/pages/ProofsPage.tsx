import ZKProofCard from '@/components/proofs/ZKProofCard';
import { MOCK_PIPELINE_RUN } from '@/lib/mock-data';

export default function ProofsPage() {
  const proof = MOCK_PIPELINE_RUN.proof;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-100">ZK Proof Verification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Verify the zero-knowledge proof of your biological age computation without revealing
          underlying methylation data.
        </p>
      </div>

      <ZKProofCard proof={proof} />
    </div>
  );
}
