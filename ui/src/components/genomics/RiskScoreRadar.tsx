import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface RiskScoreRadarProps {
  riskScores: {
    global: number;
    cancer: number;
    cardiovascular: number;
    neurological: number;
    metabolism: number;
  };
}

export default function RiskScoreRadar({ riskScores }: RiskScoreRadarProps) {
  const data = [
    { category: 'Cancer', score: riskScores.cancer, fill: '#ef4444' },
    { category: 'Cardiovascular', score: riskScores.cardiovascular, fill: '#f97316' },
    { category: 'Neurological', score: riskScores.neurological, fill: '#a855f7' },
    { category: 'Metabolism', score: riskScores.metabolism, fill: '#06b6d4' },
  ];

  return (
    <div className="rounded-xl border border-surface-4 bg-surface-1 p-6">
      <h3 className="mb-2 text-lg font-semibold text-gray-100">Polygenic Risk Radar</h3>
      <div className="relative h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#2d2d3d" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <PolarRadiusAxis
              domain={[0, 1]}
              tickCount={5}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name="Risk"
              dataKey="score"
              stroke="#818cf8"
              fill="#818cf8"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
        {/* Global score overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold text-chronos-primary-400">
              {Math.round(riskScores.global * 100)}
            </div>
            <div className="text-xs text-gray-500">Global Score</div>
          </div>
        </div>
      </div>
    </div>
  );
}
