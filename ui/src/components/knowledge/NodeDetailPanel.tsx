import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GraphNode {
  id: string;
  type: 'CpG' | 'Gene' | 'Pathway' | 'AgingPhase' | 'Intervention';
  label: string;
  evidenceStrength?: number;
  betaValue?: number;
  shapContributions?: { probeId: string; shapValue: number; direction: string }[];
  connectedNodes?: { id: string; label: string; type: string; relation: string }[];
  interventions?: string[];
}

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CpG: { bg: 'bg-chronos-primary-500/10', text: 'text-chronos-primary-400', border: 'border-chronos-primary-500/30' },
  Gene: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Pathway: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  AgingPhase: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  Intervention: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export default function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  const colors = TYPE_COLORS[node.type] ?? TYPE_COLORS.CpG;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-surface-4 bg-surface-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-4 px-4 py-3">
        <span className="text-sm font-semibold text-gray-100">Node Details</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-gray-500 transition-colors hover:bg-surface-3 hover:text-gray-200"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Type badge + Name */}
        <div>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              colors.bg,
              colors.text,
              colors.border,
            )}
          >
            {node.type}
          </span>
          <h3 className="mt-2 font-mono text-lg font-bold text-gray-100">{node.label}</h3>
        </div>

        {/* Evidence strength */}
        {node.evidenceStrength !== undefined && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Evidence Strength
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-surface-3">
                <div
                  className="h-2 rounded-full bg-chronos-accent-500"
                  style={{ width: `${node.evidenceStrength * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs text-gray-300">
                {(node.evidenceStrength * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* CpG specific: beta value + SHAP */}
        {node.type === 'CpG' && node.betaValue !== undefined && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Beta Value
            </span>
            <p className="mt-1 font-mono text-sm text-gray-200">{node.betaValue.toFixed(3)}</p>
          </div>
        )}

        {node.type === 'CpG' && node.shapContributions && node.shapContributions.length > 0 && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              SHAP Contributions
            </span>
            <ul className="mt-2 space-y-1.5">
              {node.shapContributions.map((c) => (
                <li key={c.probeId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{c.probeId}</span>
                  <span
                    className={cn(
                      'font-mono',
                      c.direction === 'decelerating' ? 'text-emerald-400' : 'text-red-400',
                    )}
                  >
                    {c.shapValue > 0 ? '+' : ''}
                    {c.shapValue.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pathway specific: interventions */}
        {node.type === 'Pathway' && node.interventions && node.interventions.length > 0 && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Associated Interventions
            </span>
            <ul className="mt-2 space-y-1.5">
              {node.interventions.map((intv) => (
                <li
                  key={intv}
                  className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-gray-300"
                >
                  {intv}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Connected nodes */}
        {node.connectedNodes && node.connectedNodes.length > 0 && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Connected Nodes ({node.connectedNodes.length})
            </span>
            <ul className="mt-2 space-y-1.5">
              {node.connectedNodes.map((cn) => {
                const c = TYPE_COLORS[cn.type] ?? TYPE_COLORS.CpG;
                return (
                  <li
                    key={cn.id + cn.relation}
                    className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
                  >
                    <span className="text-sm text-gray-300">{cn.label}</span>
                    <span className={`text-xs font-mono ${c.text}`}>{cn.relation}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
