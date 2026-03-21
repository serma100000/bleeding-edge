// CHRONOS Knowledge Context — Temporal Tracker
// Tracks longitudinal epigenetic aging trajectories per subject

import type { ConsensusAge, TrajectoryPoint } from '../shared/types.js';

// ── Internal storage type ───────────────────────────────────────────

interface StoredTimepoint {
  timestamp: Date;
  consensusBiologicalAge: number;
  embedding: Float32Array;
}

// ── Anomaly result ──────────────────────────────────────────────────

export interface AnomalyResult {
  isAnomaly: boolean;
  deviation: number;
}

// ── Linear regression helper ────────────────────────────────────────

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumXX += xs[i] * xs[i];
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ── Temporal Tracker ────────────────────────────────────────────────

export class TemporalTracker {
  private subjects = new Map<string, StoredTimepoint[]>();

  /**
   * Add a longitudinal timepoint for a subject.
   */
  addTimepoint(
    subjectId: string,
    consensusAge: ConsensusAge,
    embedding: Float32Array,
    timestamp: Date,
  ): void {
    if (!this.subjects.has(subjectId)) {
      this.subjects.set(subjectId, []);
    }

    this.subjects.get(subjectId)!.push({
      timestamp,
      consensusBiologicalAge: consensusAge.consensusBiologicalAge,
      embedding,
    });

    // Keep sorted by timestamp
    this.subjects.get(subjectId)!.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Retrieve the full trajectory for a subject.
   */
  getTrajectory(subjectId: string): TrajectoryPoint[] {
    const points = this.subjects.get(subjectId);
    if (!points) return [];

    return points.map(p => ({
      timestamp: p.timestamp,
      consensusAge: {
        consensusBiologicalAge: p.consensusBiologicalAge,
        clockResults: [],
        consensusMethod: 'weighted_average' as const,
        tolerance: 0,
        committedClocks: 0,
        confidenceInterval: [0, 0] as [number, number],
        weights: {} as Record<string, number>,
      },
      embedding: p.embedding,
    }));
  }

  /**
   * Compute d(bio_age)/dt using linear regression over timepoints.
   * Returns the slope in bio-years per calendar-year.
   * A velocity > 1 means aging faster than chronological time.
   */
  getVelocity(subjectId: string): number {
    const points = this.subjects.get(subjectId);
    if (!points || points.length < 2) return 0;

    const t0 = points[0].timestamp.getTime();
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

    const xs = points.map(p => (p.timestamp.getTime() - t0) / MS_PER_YEAR);
    const ys = points.map(p => p.consensusBiologicalAge);

    const { slope } = linearRegression(xs, ys);
    return slope;
  }

  /**
   * Detect whether the latest timepoint deviates > 2 SD from the trajectory.
   * Uses residuals of a linear fit to determine expected value.
   */
  detectAnomaly(subjectId: string): AnomalyResult {
    const points = this.subjects.get(subjectId);
    if (!points || points.length < 3) {
      return { isAnomaly: false, deviation: 0 };
    }

    const t0 = points[0].timestamp.getTime();
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

    const xs = points.map(p => (p.timestamp.getTime() - t0) / MS_PER_YEAR);
    const ys = points.map(p => p.consensusBiologicalAge);

    // Fit on all points except the last
    const xsFit = xs.slice(0, -1);
    const ysFit = ys.slice(0, -1);
    const { slope, intercept } = linearRegression(xsFit, ysFit);

    // Compute residuals of the fitting points
    const residuals = xsFit.map((x, i) => ysFit[i] - (slope * x + intercept));
    const sd = standardDeviation(residuals);

    // Predict the last point
    const lastX = xs[xs.length - 1];
    const lastY = ys[ys.length - 1];
    const predicted = slope * lastX + intercept;
    const deviation = Math.abs(lastY - predicted);

    // If SD is ~0 (perfectly linear fit), use a percentage of the predicted value
    // as the threshold to avoid false positives from floating-point noise.
    const threshold = sd < 1e-6 ? Math.max(Math.abs(predicted) * 0.01, 0.5) : 2 * sd;

    return {
      isAnomaly: deviation > threshold,
      deviation,
    };
  }
}
