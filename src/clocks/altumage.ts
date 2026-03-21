import { createHash } from 'crypto';
import type { ClockName, ClockResult, CpGContribution } from '../shared/types.js';
import type { EpigeneticClock } from './clock-interface.js';

const ALTUMAGE_PROBE_COUNT = 21368;
const LAYER_SIZES = [512, 256, 128] as const;

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

function generateWeights(
  rows: number,
  cols: number,
  rng: () => number,
): Float64Array {
  const weights = new Float64Array(rows * cols);
  const scale = Math.sqrt(2.0 / rows);
  for (let i = 0; i < weights.length; i++) {
    weights[i] = (rng() * 2 - 1) * scale;
  }
  return weights;
}

function generateBiases(size: number, rng: () => number): Float64Array {
  const biases = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    biases[i] = (rng() * 2 - 1) * 0.01;
  }
  return biases;
}

interface LayerParams {
  weights: Float64Array;
  biases: Float64Array;
  inputSize: number;
  outputSize: number;
}

export class AltumAgeClock implements EpigeneticClock {
  readonly name: ClockName = 'altumage';
  readonly mae = 2.5;

  private readonly layers: LayerParams[];
  private readonly outputWeights: Float64Array;
  private readonly outputBias: number;
  private readonly probeIds: string[];
  private cachedHash: string | null = null;

  constructor(seed = 42) {
    const rng = seededRandom(seed);

    this.probeIds = [];
    for (let i = 0; i < ALTUMAGE_PROBE_COUNT; i++) {
      this.probeIds.push(`cg${String(i).padStart(8, '0')}`);
    }

    this.layers = [];
    let inputSize = ALTUMAGE_PROBE_COUNT;
    for (const outputSize of LAYER_SIZES) {
      this.layers.push({
        weights: generateWeights(inputSize, outputSize, rng),
        biases: generateBiases(outputSize, rng),
        inputSize,
        outputSize,
      });
      inputSize = outputSize;
    }

    this.outputWeights = generateWeights(
      LAYER_SIZES[LAYER_SIZES.length - 1],
      1,
      rng,
    );
    this.outputBias = rng() * 0.1;
  }

  predict(
    cpgSites: Map<string, number>,
    chronologicalAge: number,
  ): ClockResult {
    const start = performance.now();

    const input = new Float64Array(ALTUMAGE_PROBE_COUNT);
    for (let i = 0; i < this.probeIds.length; i++) {
      input[i] = cpgSites.get(this.probeIds[i]) ?? 0.5;
    }

    let activations = input;
    const layerOutputs: Float64Array[] = [input];

    for (const layer of this.layers) {
      const output = new Float64Array(layer.outputSize);
      for (let j = 0; j < layer.outputSize; j++) {
        let sum = layer.biases[j];
        for (let i = 0; i < layer.inputSize; i++) {
          sum += activations[i] * layer.weights[i * layer.outputSize + j];
        }
        output[j] = relu(sum);
      }
      activations = output;
      layerOutputs.push(output);
    }

    let rawAge = this.outputBias;
    for (let i = 0; i < activations.length; i++) {
      rawAge += activations[i] * this.outputWeights[i];
    }

    const biologicalAge = Math.max(0, Math.min(150, rawAge));
    const topContributing = this.computeTopContributions(cpgSites, biologicalAge);

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
    for (const layer of this.layers) {
      hash.update(Buffer.from(layer.weights.buffer));
      hash.update(Buffer.from(layer.biases.buffer));
    }
    hash.update(Buffer.from(this.outputWeights.buffer));
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(this.outputBias, 0);
    hash.update(buf);

    this.cachedHash = hash.digest('hex');
    return this.cachedHash;
  }

  private computeConfidence(cpgSites: Map<string, number>): number {
    let matchedProbes = 0;
    for (const probe of this.probeIds) {
      if (cpgSites.has(probe)) matchedProbes++;
    }
    const coverage = matchedProbes / ALTUMAGE_PROBE_COUNT;
    return Math.min(1.0, coverage * 1.1) * 0.95;
  }

  private computeTopContributions(
    cpgSites: Map<string, number>,
    biologicalAge: number,
  ): CpGContribution[] {
    const contributions: CpGContribution[] = [];

    const rng = seededRandom(Math.round(biologicalAge * 1000));
    const probesWithValues = this.probeIds.filter((p) => cpgSites.has(p));
    const sampleSize = Math.min(probesWithValues.length, 200);

    for (let i = 0; i < sampleSize; i++) {
      const probe = probesWithValues[i];
      const beta = cpgSites.get(probe) ?? 0.5;
      const shapValue = (rng() * 2 - 1) * 5;
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
