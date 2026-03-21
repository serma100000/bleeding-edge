import type { ClockName, ClockResult, ConsensusAge } from '../shared/types.js';
import type { EpigeneticClock } from './clock-interface.js';

export interface ConsensusOptions {
  epsilon?: number;
  minCommitted?: number;
}

const DEFAULT_EPSILON = 5.0;
const DEFAULT_MIN_COMMITTED = 3;

export class ClockConsensus {
  private readonly epsilon: number;
  private readonly minCommitted: number;

  constructor(options: ConsensusOptions = {}) {
    this.epsilon = options.epsilon ?? DEFAULT_EPSILON;
    this.minCommitted = options.minCommitted ?? DEFAULT_MIN_COMMITTED;
  }

  computeConsensus(
    clocks: EpigeneticClock[],
    cpgSites: Map<string, number>,
    chronologicalAge: number,
  ): ConsensusAge {
    const clockResults: ClockResult[] = clocks.map((clock) =>
      clock.predict(cpgSites, chronologicalAge),
    );

    return this.computeFromResults(clockResults, clocks);
  }

  computeFromResults(
    clockResults: ClockResult[],
    clocks: EpigeneticClock[],
  ): ConsensusAge {
    const weights = this.computeWeights(clocks);
    const weightRecord: Record<ClockName, number> = {} as Record<ClockName, number>;
    for (const clock of clocks) {
      weightRecord[clock.name] = weights.get(clock.name)!;
    }

    const weightedAge = this.computeWeightedAge(clockResults, weights);
    const { committed, committedCount } = this.findCommittedClocks(
      clockResults,
      weightedAge,
    );

    let consensusAge: number;
    if (committedCount >= this.minCommitted) {
      consensusAge = this.computeCommittedWeightedAge(committed, weights);
    } else {
      consensusAge = weightedAge;
    }

    const variance = this.computeWeightedVariance(
      clockResults,
      consensusAge,
      weights,
    );
    const halfWidth = 1.96 * Math.sqrt(variance);
    const ci: [number, number] = [
      consensusAge - halfWidth,
      consensusAge + halfWidth,
    ];

    return {
      consensusBiologicalAge: consensusAge,
      clockResults,
      consensusMethod: 'weighted_average',
      tolerance: this.epsilon,
      committedClocks: committedCount,
      confidenceInterval: ci,
      weights: weightRecord,
    };
  }

  private computeWeights(clocks: EpigeneticClock[]): Map<ClockName, number> {
    const rawWeights = new Map<ClockName, number>();
    let totalWeight = 0;

    for (const clock of clocks) {
      const w = 1.0 / clock.mae;
      rawWeights.set(clock.name, w);
      totalWeight += w;
    }

    const normalized = new Map<ClockName, number>();
    for (const [name, w] of rawWeights) {
      normalized.set(name, w / totalWeight);
    }

    return normalized;
  }

  private computeWeightedAge(
    results: ClockResult[],
    weights: Map<ClockName, number>,
  ): number {
    let sum = 0;
    let weightSum = 0;

    for (const result of results) {
      const w = weights.get(result.clockName) ?? 0;
      sum += w * result.biologicalAge;
      weightSum += w;
    }

    return weightSum > 0 ? sum / weightSum : 0;
  }

  private findCommittedClocks(
    results: ClockResult[],
    weightedAge: number,
  ): { committed: ClockResult[]; committedCount: number } {
    const committed = results.filter(
      (r) => Math.abs(r.biologicalAge - weightedAge) <= this.epsilon,
    );
    return { committed, committedCount: committed.length };
  }

  private computeCommittedWeightedAge(
    committedResults: ClockResult[],
    weights: Map<ClockName, number>,
  ): number {
    let sum = 0;
    let weightSum = 0;

    for (const result of committedResults) {
      const w = weights.get(result.clockName) ?? 0;
      sum += w * result.biologicalAge;
      weightSum += w;
    }

    return weightSum > 0 ? sum / weightSum : 0;
  }

  private computeWeightedVariance(
    results: ClockResult[],
    consensusAge: number,
    weights: Map<ClockName, number>,
  ): number {
    let variance = 0;
    let weightSum = 0;

    for (const result of results) {
      const w = weights.get(result.clockName) ?? 0;
      const diff = result.biologicalAge - consensusAge;
      variance += w * diff * diff;
      weightSum += w;
    }

    return weightSum > 0 ? variance / weightSum : 0;
  }
}
