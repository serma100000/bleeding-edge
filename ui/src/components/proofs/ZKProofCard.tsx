import { useState, useCallback } from 'react';
import { ShieldCheck, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { AgeProof } from '@/types/api';
import { cn, truncateHash, formatDuration } from '@/lib/utils';
import VerificationBadge, { type VerificationStatus } from './VerificationBadge';

interface ZKProofCardProps {
  proof: AgeProof | undefined;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-gray-500 transition-colors hover:bg-surface-3 hover:text-gray-300"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ZKProofCard({ proof }: ZKProofCardProps) {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [showRaw, setShowRaw] = useState(false);

  const handleVerify = useCallback(() => {
    if (status === 'loading') return;
    setStatus('loading');
    setTimeout(() => {
      setStatus('verified');
    }, 2000);
  }, [status]);

  if (!proof) {
    return (
      <div className="rounded-xl border border-surface-4 bg-surface-1 p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-sm">No proof available</span>
        </div>
      </div>
    );
  }

  const circuitHashDisplay = proof.circuitHash;

  return (
    <div className="rounded-xl border border-surface-4 bg-surface-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chronos-verified-DEFAULT/10">
            <ShieldCheck className="h-5 w-5 text-chronos-verified-DEFAULT" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-100">Zero-Knowledge Proof</h2>
            <p className="text-xs text-gray-500">Groth16 zk-SNARK</p>
          </div>
        </div>
        <VerificationBadge status={status} />
      </div>

      <div className="space-y-5 p-6">
        {/* Proof Hash */}
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Circuit Hash
          </span>
          <div className="mt-1 flex items-center gap-2">
            <code className="font-mono text-sm text-chronos-accent-400">
              {truncateHash(circuitHashDisplay, 12, 6)}
            </code>
            <CopyButton text={circuitHashDisplay} />
          </div>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={status === 'loading' || status === 'verified'}
          className={cn(
            'w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
            status === 'verified'
              ? 'cursor-default bg-emerald-500/10 text-emerald-400'
              : status === 'loading'
                ? 'cursor-wait bg-chronos-primary-500/20 text-chronos-primary-300'
                : 'bg-gradient-to-r from-chronos-primary-600 to-chronos-accent-600 text-white hover:from-chronos-primary-500 hover:to-chronos-accent-500',
          )}
        >
          {status === 'verified' ? 'Proof Verified' : status === 'loading' ? 'Verifying...' : 'Verify Proof'}
        </button>

        {/* Public Signals */}
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Public Signals
          </span>
          <dl className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-400">Biological Age</dt>
              <dd className="font-mono text-sm text-gray-200">
                {proof.publicSignals.biologicalAge.toFixed(1)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-400">Model Hash</dt>
              <dd className="flex items-center gap-1.5 font-mono text-sm text-gray-200">
                {truncateHash(proof.publicSignals.modelHash, 8, 4)}
                <CopyButton text={proof.publicSignals.modelHash} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-400">Timestamp</dt>
              <dd className="font-mono text-sm text-gray-200">
                {new Date(proof.publicSignals.timestamp).toLocaleString()}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-400">Consensus Method</dt>
              <dd className="font-mono text-sm uppercase text-gray-200">
                {proof.publicSignals.consensusMethod}
              </dd>
            </div>
          </dl>
        </div>

        {/* Metrics */}
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Proof Metrics
          </span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-2 px-4 py-3">
              <span className="text-xs text-gray-500">Proof Size</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-gray-100">
                {formatBytes(proof.proofSizeBytes)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-2 px-4 py-3">
              <span className="text-xs text-gray-500">Proving Time</span>
              <p className="mt-0.5 font-mono text-lg font-semibold text-gray-100">
                {formatDuration(proof.provingTimeMs)}
              </p>
            </div>
          </div>
        </div>

        {/* Raw Proof Expandable */}
        <div className="border-t border-surface-4 pt-4">
          <button
            onClick={() => setShowRaw((prev) => !prev)}
            className="flex w-full items-center justify-between text-sm text-gray-400 transition-colors hover:text-gray-200"
          >
            <span>Show Raw Proof</span>
            {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showRaw && (
            <div className="mt-3 max-h-48 overflow-auto rounded-lg bg-surface-0 p-3">
              <pre className="whitespace-pre-wrap break-all font-mono text-xs text-gray-400">
                {proof.proofBytes}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
