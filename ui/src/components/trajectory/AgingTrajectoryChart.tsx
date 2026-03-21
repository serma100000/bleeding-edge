import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import type { TrajectoryPoint } from '@/types/api';
import { cn } from '@/lib/utils';

interface AgingTrajectoryChartProps {
  trajectoryPoints: TrajectoryPoint[];
  agingVelocity: number;
}

interface ChartDataPoint {
  date: string;
  biologicalAge: number;
  chronologicalAge: number;
  ciLower: number;
  ciUpper: number;
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as ChartDataPoint | undefined;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-surface-4 bg-surface-2 px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-gray-400">{data.date}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-chronos-accent-400" />
          <span className="text-sm text-gray-300">Bio Age:</span>
          <span className="text-sm font-semibold text-gray-100">
            {data.biologicalAge.toFixed(1)} yrs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gray-500" />
          <span className="text-sm text-gray-300">Chrono Age:</span>
          <span className="text-sm font-semibold text-gray-100">
            {data.chronologicalAge.toFixed(1)} yrs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-chronos-accent-400/30" />
          <span className="text-sm text-gray-300">CI:</span>
          <span className="text-sm font-semibold text-gray-100">
            {data.ciLower.toFixed(1)} &ndash; {data.ciUpper.toFixed(1)} yrs
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AgingTrajectoryChart({
  trajectoryPoints,
  agingVelocity,
}: AgingTrajectoryChartProps) {
  const chartData: ChartDataPoint[] = trajectoryPoints.map((pt) => ({
    date: formatDate(pt.timestamp),
    biologicalAge: pt.biologicalAge,
    chronologicalAge: pt.chronologicalAge,
    ciLower: pt.confidenceInterval[0],
    ciUpper: pt.confidenceInterval[1],
  }));

  const allAges = trajectoryPoints.flatMap((pt) => [
    pt.biologicalAge,
    pt.chronologicalAge,
    pt.confidenceInterval[0],
    pt.confidenceInterval[1],
  ]);
  const yMin = Math.floor(Math.min(...allAges) - 1);
  const yMax = Math.ceil(Math.max(...allAges) + 1);

  const isDecelerating = agingVelocity < 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-gray-100">
          Aging Trajectory
        </h2>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium',
            isDecelerating
              ? 'bg-chronos-younger/10 text-chronos-younger'
              : 'bg-chronos-accelerated/10 text-chronos-accelerated',
          )}
        >
          {isDecelerating ? 'Decelerating' : 'Accelerating'}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#2d2d3d' }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#2d2d3d' }}
            label={{
              value: 'Age (years)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6b7280', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* CI shaded area */}
          <Area
            type="monotone"
            dataKey="ciUpper"
            stroke="none"
            fill="#22d3ee"
            fillOpacity={0.1}
          />
          <Area
            type="monotone"
            dataKey="ciLower"
            stroke="none"
            fill="#0a0a0f"
            fillOpacity={1}
          />

          {/* Chronological age reference line */}
          <Line
            type="monotone"
            dataKey="chronologicalAge"
            stroke="#6b7280"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            dot={false}
            name="Chronological Age"
          />

          {/* Biological age primary line */}
          <Line
            type="monotone"
            dataKey="biologicalAge"
            stroke="#22d3ee"
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: '#22d3ee',
              stroke: '#0a0a0f',
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: '#22d3ee',
              stroke: '#0a0a0f',
              strokeWidth: 2,
            }}
            name="Biological Age"
          />

          <ReferenceLine
            y={trajectoryPoints[trajectoryPoints.length - 1]?.chronologicalAge}
            stroke="transparent"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 rounded bg-chronos-accent-400" />
          <span>Biological Age</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 rounded border-t border-dashed border-gray-500" />
          <span>Chronological Age</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-6 rounded bg-chronos-accent-400/10" />
          <span>95% CI</span>
        </div>
      </div>
    </div>
  );
}
