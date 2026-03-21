import { createHash } from 'crypto';
import type { ClockName, ClockResult, CpGContribution } from '../shared/types.js';
import type { EpigeneticClock } from './clock-interface.js';

interface SurrogateModel {
  name: string;
  probeIds: string[];
  weights: Float64Array;
  intercept: number;
}

const SURROGATE_NAMES = [
  'adm',
  'b2m',
  'cystatin_c',
  'gdf15',
  'leptin',
  'pai1',
  'timp1',
  'packyrs',
] as const;

const COX_COEFFICIENTS: Record<string, number> = {
  adm: 0.1426,
  b2m: 0.0954,
  cystatin_c: 0.1183,
  gdf15: 0.1892,
  leptin: -0.0543,
  pai1: 0.1267,
  timp1: 0.0871,
  packyrs: 0.2145,
  age: 0.0913,
};

const PROBES_PER_SURROGATE = 186;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

export class GrimAgeClock implements EpigeneticClock {
  readonly name: ClockName = 'grimage';
  readonly mae = 3.5;

  private readonly surrogates: SurrogateModel[];
  private readonly allProbeIds: Set<string>;
  private cachedHash: string | null = null;

  constructor(seed = 137) {
    const rng = seededRandom(seed);

    this.surrogates = [];
    this.allProbeIds = new Set();

    for (const sName of SURROGATE_NAMES) {
      const probeIds: string[] = [];
      for (let i = 0; i < PROBES_PER_SURROGATE; i++) {
        const id = `cg${String(Math.floor(rng() * 99999999)).padStart(8, '0')}`;
        probeIds.push(id);
        this.allProbeIds.add(id);
      }

      const weights = new Float64Array(PROBES_PER_SURROGATE);
      const scale = 1.0 / Math.sqrt(PROBES_PER_SURROGATE);
      for (let i = 0; i < PROBES_PER_SURROGATE; i++) {
        weights[i] = (rng() * 2 - 1) * scale;
      }

      this.surrogates.push({
        name: sName,
        probeIds,
        weights,
        intercept: (rng() * 2 - 1) * 0.5,
      });
    }
  }

  predict(
    cpgSites: Map<string, number>,
    chronologicalAge: number,
  ): ClockResult {
    const start = performance.now();

    const surrogateValues: Record<string, number> = {};

    for (const surrogate of this.surrogates) {
      let value = surrogate.intercept;
      for (let i = 0; i < surrogate.probeIds.length; i++) {
        const beta = cpgSites.get(surrogate.probeIds[i]) ?? 0.5;
        value += beta * surrogate.weights[i];
      }
      surrogateValues[surrogate.name] = value;
    }

    let biologicalAge = COX_COEFFICIENTS['age'] * chronologicalAge;
    for (const [name, coeff] of Object.entries(COX_COEFFICIENTS)) {
      if (name === 'age') continue;
      biologicalAge += coeff * (surrogateValues[name] ?? 0);
    }

    biologicalAge = this.rescaleAge(biologicalAge, chronologicalAge);
    biologicalAge = Math.max(0, Math.min(150, biologicalAge));

    const topContributing = this.computeTopContributions(cpgSites, surrogateValues);
    const inferenceTimeMs = performance.now() - start;

    return {
      clockName: this.name,
      biologicalAge,
      chronologicalAge,
      ageAcceleration: biologicalAge - chronologicalAge,
      confidence: this.computeConfidence(cpgSites),
      topContributingCpGs: topContributing,
      modelHash: this.getModelHash(),
      inferenceTimeMs,
    };
  }

  getModelHash(): string {
    if (this.cachedHash) return this.cachedHash;

    const hash = createHash('sha256');
    for (const surrogate of this.surrogates) {
      hash.update(surrogate.name);
      hash.update(Buffer.from(surrogate.weights.buffer));
      const buf = Buffer.alloc(8);
      buf.writeDoubleBE(surrogate.intercept, 0);
      hash.update(buf);
    }
    for (const [key, val] of Object.entries(COX_COEFFICIENTS)) {
      hash.update(key);
      const buf = Buffer.alloc(8);
      buf.writeDoubleBE(val, 0);
      hash.update(buf);
    }

    this.cachedHash = hash.digest('hex');
    return this.cachedHash;
  }

  private rescaleAge(rawScore: number, chronologicalAge: number): number {
    return chronologicalAge + (rawScore - chronologicalAge * COX_COEFFICIENTS['age']) * 15;
  }

  private computeConfidence(cpgSites: Map<string, number>): number {
    let matched = 0;
    for (const probe of this.allProbeIds) {
      if (cpgSites.has(probe)) matched++;
    }
    const coverage = matched / this.allProbeIds.size;
    return Math.min(1.0, coverage * 1.1) * 0.90;
  }

  private computeTopContributions(
    cpgSites: Map<string, number>,
    surrogateValues: Record<string, number>,
  ): CpGContribution[] {
    const contributions: CpGContribution[] = [];

    for (const surrogate of this.surrogates) {
      const coxCoeff = COX_COEFFICIENTS[surrogate.name] ?? 0;
      let maxAbsContrib = 0;
      let maxProbe = '';
      let maxBeta = 0.5;
      let maxShap = 0;

      for (let i = 0; i < surrogate.probeIds.length; i++) {
        const probe = surrogate.probeIds[i];
        const beta = cpgSites.get(probe) ?? 0.5;
        const contrib = beta * surrogate.weights[i] * coxCoeff;
        if (Math.abs(contrib) > maxAbsContrib) {
          maxAbsContrib = Math.abs(contrib);
          maxProbe = probe;
          maxBeta = beta;
          maxShap = contrib * 15;
        }
      }

      if (maxProbe) {
        contributions.push({
          probeId: maxProbe,
          betaValue: maxBeta,
          shapValue: maxShap,
          direction: maxShap > 0 ? 'accelerating' : 'decelerating',
        });
      }
    }

    contributions.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    return contributions.slice(0, 10);
  }
}
