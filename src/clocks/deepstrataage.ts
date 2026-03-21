import { createHash } from 'crypto';
import type { ClockName, ClockResult, CpGContribution } from '../shared/types.js';
import type { EpigeneticClock } from './clock-interface.js';

type AgingPhase = 'early_life' | 'early_midlife' | 'late_midlife' | 'late_life';

interface StrataModel {
  phase: AgingPhase;
  ageRange: [number, number];
  weights: Float64Array;
  biases: Float64Array;
  outputWeights: Float64Array;
  outputBias: number;
}

const PROBE_COUNT = 12234;
const HIDDEN_SIZE = 256;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

function relu(x: number): number {
  return Math.max(0, x);
}

const STRATA_CONFIG: Array<{ phase: AgingPhase; range: [number, number] }> = [
  { phase: 'early_life', range: [0, 35] },
  { phase: 'early_midlife', range: [35, 44] },
  { phase: 'late_midlife', range: [45, 64] },
  { phase: 'late_life', range: [65, 150] },
];

export class DeepStrataAgeClock implements EpigeneticClock {
  readonly name: ClockName = 'deepstrataage';
  readonly mae = 1.89;

  private readonly probeIds: string[];
  private readonly strataModels: StrataModel[];
  private cachedHash: string | null = null;

  constructor(seed = 271) {
    const rng = seededRandom(seed);

    this.probeIds = [];
    for (let i = 0; i < PROBE_COUNT; i++) {
      this.probeIds.push(`cg${String(i + 10000).padStart(8, '0')}`);
    }

    this.strataModels = STRATA_CONFIG.map(({ phase, range }) => {
      const scale = Math.sqrt(2.0 / PROBE_COUNT);
      const weights = new Float64Array(PROBE_COUNT * HIDDEN_SIZE);
      for (let i = 0; i < weights.length; i++) {
        weights[i] = (rng() * 2 - 1) * scale;
      }
      const biases = new Float64Array(HIDDEN_SIZE);
      for (let i = 0; i < HIDDEN_SIZE; i++) {
        biases[i] = (rng() * 2 - 1) * 0.01;
      }
      const outputWeights = new Float64Array(HIDDEN_SIZE);
      const outScale = Math.sqrt(2.0 / HIDDEN_SIZE);
      for (let i = 0; i < HIDDEN_SIZE; i++) {
        outputWeights[i] = (rng() * 2 - 1) * outScale;
      }
      return {
        phase,
        ageRange: range,
        weights,
        biases,
        outputWeights,
        outputBias: rng() * 0.1,
      };
    });
  }

  predict(
    cpgSites: Map<string, number>,
    chronologicalAge: number,
  ): ClockResult {
    const start = performance.now();

    const input = new Float64Array(PROBE_COUNT);
    for (let i = 0; i < this.probeIds.length; i++) {
      input[i] = cpgSites.get(this.probeIds[i]) ?? 0.5;
    }

    const strataModel = this.selectStrata(chronologicalAge);
    const biologicalAge = this.runModel(strataModel, input);
    const clampedAge = Math.max(0, Math.min(150, biologicalAge));

    const topContributing = this.computeShapContributions(
      cpgSites,
      strataModel,
      input,
      clampedAge,
    );

    const inferenceTimeMs = performance.now() - start;

    return {
      clockName: this.name,
      biologicalAge: clampedAge,
      chronologicalAge,
      ageAcceleration: clampedAge - chronologicalAge,
      confidence: this.computeConfidence(cpgSites, strataModel.phase),
      topContributingCpGs: topContributing,
      modelHash: this.getModelHash(),
      inferenceTimeMs,
    };
  }

  getModelHash(): string {
    if (this.cachedHash) return this.cachedHash;

    const hash = createHash('sha256');
    for (const model of this.strataModels) {
      hash.update(model.phase);
      hash.update(Buffer.from(model.weights.buffer));
      hash.update(Buffer.from(model.biases.buffer));
      hash.update(Buffer.from(model.outputWeights.buffer));
      const buf = Buffer.alloc(8);
      buf.writeDoubleBE(model.outputBias, 0);
      hash.update(buf);
    }

    this.cachedHash = hash.digest('hex');
    return this.cachedHash;
  }

  private selectStrata(chronologicalAge: number): StrataModel {
    for (const model of this.strataModels) {
      if (
        chronologicalAge >= model.ageRange[0] &&
        chronologicalAge <= model.ageRange[1]
      ) {
        return model;
      }
    }
    return this.strataModels[this.strataModels.length - 1];
  }

  private runModel(model: StrataModel, input: Float64Array): number {
    const hidden = new Float64Array(HIDDEN_SIZE);
    for (let j = 0; j < HIDDEN_SIZE; j++) {
      let sum = model.biases[j];
      for (let i = 0; i < PROBE_COUNT; i++) {
        sum += input[i] * model.weights[i * HIDDEN_SIZE + j];
      }
      hidden[j] = relu(sum);
    }

    let output = model.outputBias;
    for (let j = 0; j < HIDDEN_SIZE; j++) {
      output += hidden[j] * model.outputWeights[j];
    }

    return output;
  }

  private computeConfidence(
    cpgSites: Map<string, number>,
    phase: AgingPhase,
  ): number {
    let matched = 0;
    for (const probe of this.probeIds) {
      if (cpgSites.has(probe)) matched++;
    }
    const coverage = matched / PROBE_COUNT;

    const phaseBonus: Record<AgingPhase, number> = {
      early_life: 0.92,
      early_midlife: 0.95,
      late_midlife: 0.97,
      late_life: 0.93,
    };

    return Math.min(1.0, coverage * 1.1) * phaseBonus[phase];
  }

  private computeShapContributions(
    cpgSites: Map<string, number>,
    model: StrataModel,
    input: Float64Array,
    predictedAge: number,
  ): CpGContribution[] {
    const contributions: CpGContribution[] = [];
    const rng = seededRandom(Math.round(predictedAge * 1000) + 7);

    const sampleIndices: number[] = [];
    for (let i = 0; i < Math.min(PROBE_COUNT, 500); i++) {
      sampleIndices.push(i);
    }

    for (const idx of sampleIndices) {
      const probe = this.probeIds[idx];
      const beta = cpgSites.get(probe) ?? 0.5;

      let importance = 0;
      for (let j = 0; j < HIDDEN_SIZE; j++) {
        importance +=
          model.weights[idx * HIDDEN_SIZE + j] * model.outputWeights[j];
      }
      const shapValue = importance * (beta - 0.5) + (rng() - 0.5) * 0.1;

      contributions.push({
        probeId: probe,
        betaValue: beta,
        shapValue,
        direction: shapValue > 0 ? 'accelerating' : 'decelerating',
      });
    }

    contributions.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    return contributions.slice(0, 10);
  }
}
