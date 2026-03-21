import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ConsensusAge, ClockName } from '@/types/api';
import { cn, formatAge, getAgeStatus, getAgeStatusColor } from '@/lib/utils';

interface ConsensusGaugeProps {
  consensusAge: ConsensusAge;
  chronologicalAge: number;
}

const CLOCK_POSITIONS: { name: ClockName; angle: number; label: string }[] = [
  { name: 'altumage', angle: -60, label: 'AltumAge' },
  { name: 'grimage', angle: 30, label: 'GrimAge' },
  { name: 'deepstrataage', angle: 120, label: 'DeepStrata' },
  { name: 'epinflamm', angle: 210, label: 'EpiInflamm' },
];

const GAUGE_RADIUS = 90;
const STROKE_WIDTH = 10;
const CENTER = 120;

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function getAccelerationColor(acceleration: number): string {
  if (acceleration < -2) return '#10b981';
  if (acceleration < 0) return '#10b981';
  if (acceleration < 2) return '#f59e0b';
  return '#ef4444';
}

function getArcColor(acceleration: number): string {
  if (acceleration < -2) return 'url(#gaugeGreen)';
  if (acceleration < 2) return 'url(#gaugeYellow)';
  return 'url(#gaugeRed)';
}

export default function ConsensusGauge({ consensusAge, chronologicalAge }: ConsensusGaugeProps) {
  const [hovering, setHovering] = useState(false);

  const bioAge = consensusAge.consensusBiologicalAge;
  const acceleration = bioAge - chronologicalAge;
  const status = getAgeStatus(acceleration);
  const statusColor = getAgeStatusColor(status);

  // Map ages to arc sweep (0-270 degrees), centered around a reasonable range
  const minAge = Math.min(bioAge, chronologicalAge) - 10;
  const maxAge = Math.max(bioAge, chronologicalAge) + 10;
  const range = maxAge - minAge;

  const bioSweep = Math.min(270, ((bioAge - minAge) / range) * 270);
  const chronoSweep = Math.min(270, ((chronologicalAge - minAge) / range) * 270);

  const committedClocks = consensusAge.committedClocks;
  const totalClocks = CLOCK_POSITIONS.length;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <svg width={240} height={240} viewBox="0 0 240 240">
          <defs>
            <linearGradient id="gaugeGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="gaugeYellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="gaugeRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d={describeArc(CENTER, CENTER, GAUGE_RADIUS, 0, 270)}
            fill="none"
            stroke="#2d2d3d"
            strokeWidth={STROKE_WIDTH + 4}
            strokeLinecap="round"
          />

          {/* Inner arc: chronological age (gray reference) */}
          <motion.path
            d={describeArc(CENTER, CENTER, GAUGE_RADIUS - 14, 0, chronoSweep)}
            fill="none"
            stroke="#4b5563"
            strokeWidth={6}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Outer arc: biological age (colored by acceleration) */}
          <motion.path
            d={describeArc(CENTER, CENTER, GAUGE_RADIUS, 0, bioSweep)}
            fill="none"
            stroke={getArcColor(acceleration)}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
          />

          {/* Clock status dots around rim */}
          {CLOCK_POSITIONS.map(({ name, angle }) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const dotR = GAUGE_RADIUS + 16;
            const cx = CENTER + dotR * Math.cos(rad);
            const cy = CENTER + dotR * Math.sin(rad);

            const clockResult = consensusAge.clockResults.find(
              (c) => c.clockName === name,
            );
            const isCommitted = consensusAge.weights[name] > 0;

            return (
              <g key={name}>
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={isCommitted ? '#10b981' : '#ef4444'}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.0 + CLOCK_POSITIONS.indexOf(CLOCK_POSITIONS.find(p => p.name === name)!) * 0.15, duration: 0.3 }}
                />
                {isCommitted && (
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1}
                    opacity={0.4}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.2 }}
                  />
                )}
              </g>
            );
          })}

          {/* Center text: consensus age */}
          <text
            x={CENTER}
            y={CENTER - 8}
            textAnchor="middle"
            className="fill-gray-100 font-display text-4xl font-bold"
            fontSize={36}
          >
            {formatAge(bioAge)}
          </text>
          <text
            x={CENTER}
            y={CENTER + 14}
            textAnchor="middle"
            className="fill-gray-400 text-xs"
            fontSize={12}
          >
            years
          </text>
        </svg>

        {/* Tooltip: CI band */}
        {hovering && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-lg border border-surface-4 bg-surface-2 px-3 py-2 text-xs shadow-lg"
          >
            <span className="text-gray-400">95% CI: </span>
            <span className="font-mono text-gray-200">
              {formatAge(consensusAge.confidenceInterval[0])} &ndash;{' '}
              {formatAge(consensusAge.confidenceInterval[1])}
            </span>
          </motion.div>
        )}
      </div>

      {/* Age acceleration badge */}
      <motion.div
        className="mt-4 flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <span className="text-sm text-gray-400">Age Acceleration</span>
        <span
          className={cn(
            'rounded-full px-2.5 py-0.5 text-sm font-semibold',
            acceleration < 0
              ? 'bg-chronos-younger/10 text-chronos-younger'
              : acceleration < 2
                ? 'bg-chronos-ontrack/10 text-chronos-ontrack'
                : 'bg-chronos-accelerated/10 text-chronos-accelerated',
          )}
        >
          {acceleration > 0 ? '+' : ''}
          {formatAge(acceleration)} yrs
        </span>
      </motion.div>

      {/* Consensus method info */}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
        <span>
          Method:{' '}
          <span className="font-mono text-gray-400">{consensusAge.consensusMethod.toUpperCase()}</span>
        </span>
        <span className="text-surface-4">|</span>
        <span>
          {committedClocks}/{totalClocks} clocks committed
        </span>
      </div>
    </div>
  );
}
