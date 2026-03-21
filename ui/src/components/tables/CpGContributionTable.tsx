import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
import type { CpGContribution } from '@/types/api';
import { cn } from '@/lib/utils';

interface CpGContributionTableProps {
  contributions: CpGContribution[];
  clockName: string;
}

type SortKey = 'probeId' | 'betaValue' | 'shapValue' | 'direction';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'probeId', label: 'Probe ID' },
  { key: 'betaValue', label: 'Beta Value', className: 'text-right' },
  { key: 'shapValue', label: 'SHAP Value', className: 'text-right' },
  { key: 'direction', label: 'Direction', className: 'text-center' },
];

export default function CpGContributionTable({
  contributions,
  clockName,
}: CpGContributionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('shapValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'shapValue' ? 'desc' : 'asc');
    }
  };

  const maxAbsShap = useMemo(
    () => Math.max(...contributions.map((c) => Math.abs(c.shapValue)), 0.01),
    [contributions],
  );

  const sorted = useMemo(() => {
    return [...contributions].sort((a, b) => {
      let diff: number;

      switch (sortKey) {
        case 'probeId':
          diff = a.probeId.localeCompare(b.probeId);
          break;
        case 'betaValue':
          diff = a.betaValue - b.betaValue;
          break;
        case 'shapValue':
          diff = Math.abs(a.shapValue) - Math.abs(b.shapValue);
          break;
        case 'direction':
          diff = a.direction.localeCompare(b.direction);
          break;
        default:
          diff = 0;
      }

      return sortDir === 'asc' ? diff : -diff;
    });
  }, [contributions, sortKey, sortDir]);

  if (contributions.length === 0) {
    return (
      <div className="rounded-xl border border-surface-4 bg-surface-1 p-6 text-center text-sm text-gray-500">
        No CpG contributions available for this clock.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-4 bg-surface-1 overflow-hidden">
      <div className="border-b border-surface-4 px-6 py-4">
        <h3 className="font-display text-sm font-semibold text-gray-200">
          Top CpG Contributions
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          SHAP-based feature importance for{' '}
          <span className="font-medium text-gray-400">{clockName}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-4">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:text-gray-300',
                    col.className,
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown
                      className={cn(
                        'h-3 w-3',
                        sortKey === col.key ? 'text-chronos-primary-400' : 'opacity-30',
                      )}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((cpg, index) => {
              const barWidth = (Math.abs(cpg.shapValue) / maxAbsShap) * 100;
              const isDecelerating = cpg.direction === 'decelerating';

              return (
                <motion.tr
                  key={cpg.probeId}
                  className="border-b border-surface-4/50 transition-colors hover:bg-surface-2/50"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <td className="px-4 py-3">
                    <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-chronos-accent-400">
                      {cpg.probeId}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-300">
                    {cpg.betaValue.toFixed(3)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Mini SHAP bar */}
                      <div className="h-2 w-20 rounded-full bg-surface-3">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            isDecelerating ? 'bg-chronos-younger' : 'bg-chronos-accelerated',
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidth}%` }}
                          transition={{ delay: 0.2 + index * 0.06, duration: 0.4 }}
                        />
                      </div>
                      <span
                        className={cn(
                          'w-12 text-right font-mono text-xs font-semibold',
                          isDecelerating ? 'text-chronos-younger' : 'text-chronos-accelerated',
                        )}
                      >
                        {cpg.shapValue > 0 ? '+' : ''}{cpg.shapValue.toFixed(3)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        isDecelerating
                          ? 'bg-chronos-younger/10 text-chronos-younger'
                          : 'bg-chronos-accelerated/10 text-chronos-accelerated',
                      )}
                    >
                      {cpg.direction}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
