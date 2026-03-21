import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Check, X } from 'lucide-react';
import type { ClockResult, ClockName } from '@/types/api';
import { cn, formatAge, formatDuration } from '@/lib/utils';

interface ClockResultsTableProps {
  clockResults: ClockResult[];
  weights: Record<string, number>;
  consensusAge: number;
}

type SortKey = 'clockName' | 'biologicalAge' | 'chronologicalAge' | 'ageAcceleration' | 'confidence' | 'weight' | 'inferenceTimeMs';
type SortDir = 'asc' | 'desc';

const CLOCK_LABELS: Record<ClockName, string> = {
  altumage: 'AltumAge',
  grimage: 'GrimAge',
  deepstrataage: 'DeepStrataAge',
  epinflamm: 'EpiInflamm',
};

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'clockName', label: 'Clock Name' },
  { key: 'biologicalAge', label: 'Bio Age', className: 'text-right' },
  { key: 'chronologicalAge', label: 'Chrono Age', className: 'text-right' },
  { key: 'ageAcceleration', label: 'Acceleration', className: 'text-right' },
  { key: 'confidence', label: 'Confidence', className: 'text-right' },
  { key: 'weight', label: 'Weight', className: 'text-right' },
  { key: 'inferenceTimeMs', label: 'Time', className: 'text-right' },
];

export default function ClockResultsTable({
  clockResults,
  weights,
  consensusAge,
}: ClockResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('biologicalAge');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    return [...clockResults].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortKey === 'weight') {
        aVal = weights[a.clockName] ?? 0;
        bVal = weights[b.clockName] ?? 0;
      } else if (sortKey === 'clockName') {
        aVal = a.clockName;
        bVal = b.clockName;
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [clockResults, sortKey, sortDir, weights]);

  return (
    <div className="rounded-xl border border-surface-4 bg-surface-1 overflow-hidden">
      <div className="border-b border-surface-4 px-6 py-4">
        <h3 className="font-display text-sm font-semibold text-gray-200">
          Clock Results
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Individual epigenetic clock predictions and consensus status
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
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((result, index) => {
              const weight = weights[result.clockName] ?? 0;
              const isCommitted = weight > 0;
              const accel = result.ageAcceleration;

              return (
                <motion.tr
                  key={result.clockName}
                  className="border-b border-surface-4/50 transition-colors hover:bg-surface-2/50"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-200">
                    {CLOCK_LABELS[result.clockName]}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-200">
                    {formatAge(result.biologicalAge)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-400">
                    {formatAge(result.chronologicalAge)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-mono text-sm font-semibold',
                        accel < 0 ? 'text-chronos-younger' : accel > 2 ? 'text-chronos-accelerated' : 'text-chronos-ontrack',
                      )}
                    >
                      {accel > 0 ? '+' : ''}{formatAge(accel)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-surface-3">
                        <motion.div
                          className="h-full rounded-full bg-chronos-primary-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ delay: 0.3 + index * 0.08, duration: 0.5 }}
                        />
                      </div>
                      <span className="font-mono text-xs text-gray-400">
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-gray-400">
                    {(weight * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                    {formatDuration(result.inferenceTimeMs)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isCommitted ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-chronos-younger/10 p-1">
                        <Check className="h-3.5 w-3.5 text-chronos-younger" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full bg-chronos-accelerated/10 p-1">
                        <X className="h-3.5 w-3.5 text-chronos-accelerated" />
                      </span>
                    )}
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
