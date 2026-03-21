import { createHash } from 'crypto';
import type { ClockName, ClockResult, CpGContribution } from '../shared/types.js';
import type { EpigeneticClock } from './clock-interface.js';

const CYTOKINE_NAMES = [
  'il1b', 'il2', 'il4', 'il5', 'il6', 'il7', 'il8', 'il10',
  'il12', 'il13', 'il17', 'il18', 'tnfa', 'ifng', 'tgfb1',
  'mcp1', 'mip1a', 'rantes', 'eotaxin', 'gcsf', 'gmcsf',
  'vegf', 'ip10', 'pdgf',
] as const;

const PROBES_PER_CYTOKINE = 95;

interface CytokineModel {
  name: string;
  probeIds: string[];
  weights: Float64Array;
  intercept: number;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

export class EpInflammAgeClock implements EpigeneticClock {
  readonly name: ClockName = 'epinflamm';
  readonly mae = 7.0;

  private readonly cytokineModels: CytokineModel[];
  private readonly ageWeights: Float64Array;
  private readonly ageIntercept: number;
  private readonly allProbeIds: Set<string>;
  private cachedHash: string | null = null;

  constructor(seed = 314) {
    const rng = seededRandom(seed);

    this.cytokineModels = [];
    this.allProbeIds = new Set();

    for (const cName of CYTOKINE_NAMES) {
      const probeIds: string[] = [];
      for (let i = 0; i < PROBES_PER_CYTOKINE; i++) {
        const id = `cg${String(Math.floor(rng() * 99999999)).padStart(8, '0')}`;
        probeIds.push(id);
        this.allProbeIds.add(id);
      }

      const weights = new Float64Array(PROBES_PER_CYTOKINE);
      const scale = 1.0 / Math.sqrt(PROBES_PER_CYTOKINE);
      for (let i = 0; i < PROBES_PER_CYTOKINE; i++) {
        weights[i] = (rng() * 2 - 1) * scale;
      }

      this.cytokineModels.push({
        name: cName,
        probeIds,
        weights,
        intercept: (rng() * 2 - 1) * 0.3,
      });
    }

    this.ageWeights = new Float64Array(CYTOKINE_NAMES.length);
    for (let i = 0; i < CYTOKINE_NAMES.length; i++) {
      this.ageWeights[i] = (rng() * 2 - 1) * 2.0;
    }
    this.ageIntercept = 40 + rng() * 20;
  }

  predict(
    cpgSites: Map<string, number>,
    chronologicalAge: number,
  ): ClockResult {
    const start = performance.now();

    const cytokineLevels = new Float64Array(CYTOKINE_NAMES.length);
    for (let c = 0; c < this.cytokineModels.length; c++) {
      const model = this.cytokineModels[c];
      let value = model.intercept;
      for (let i = 0; i < model.probeIds.length; i++) {
        const beta = cpgSites.get(model.probeIds[i]) ?? 0.5;
        value += beta * model.weights[i];
      }
      cytokineLevels[c] = value;
    }

    let biologicalAge = this.ageIntercept;
    for (let i = 0; i < cytokineLevels.length; i++) {
      biologicalAge += cytokineLevels[i] * this.ageWeights[i];
    }

    biologicalAge = Math.max(0, Math.min(150, biologicalAge));
    const topContributing = this.computeTopContributions(cpgSites, cytokineLevels);
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
    for (const model of this.cytokineModels) {
      hash.update(model.name);
      hash.update(Buffer.from(model.weights.buffer));
      const buf = Buffer.alloc(8);
      buf.writeDoubleBE(model.intercept, 0);
      hash.update(buf);
    }
    hash.update(Buffer.from(this.ageWeights.buffer));
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(this.ageIntercept, 0);
    hash.update(buf);

    this.cachedHash = hash.digest('hex');
    return this.cachedHash;
  }

  private computeConfidence(cpgSites: Map<string, number>): number {
    let matched = 0;
    for (const probe of this.allProbeIds) {
      if (cpgSites.has(probe)) matched++;
    }
    const coverage = matched / this.allProbeIds.size;
    return Math.min(1.0, coverage * 1.1) * 0.75;
  }

  private computeTopContributions(
    cpgSites: Map<string, number>,
    cytokineLevels: Float64Array,
  ): CpGContribution[] {
    const contributions: CpGContribution[] = [];

    for (let c = 0; c < this.cytokineModels.length; c++) {
      const model = this.cytokineModels[c];
      const ageWeight = this.ageWeights[c];

      let maxAbsContrib = 0;
      let maxProbe = '';
      let maxBeta = 0.5;
      let maxShap = 0;

      for (let i = 0; i < model.probeIds.length; i++) {
        const probe = model.probeIds[i];
        const beta = cpgSites.get(probe) ?? 0.5;
        const contrib = beta * model.weights[i] * ageWeight;
        if (Math.abs(contrib) > maxAbsContrib) {
          maxAbsContrib = Math.abs(contrib);
          maxProbe = probe;
          maxBeta = beta;
          maxShap = contrib;
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
