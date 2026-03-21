import { MethylationSample } from '../shared/types.js';

const EMBEDDING_DIM = 256;

/**
 * Produces fixed-dimension embeddings from CpG methylation data using
 * a random projection matrix with tanh activation.
 *
 * The projection matrix is stored as a class property for save/load support.
 * On construction, a random matrix is generated if none is provided.
 */
export class CpGEmbedder {
  private projectionMatrix: Float32Array;
  private readonly inputDim: number;
  private readonly outputDim: number;

  constructor(inputDim: number, outputDim: number = EMBEDDING_DIM, projectionMatrix?: Float32Array) {
    this.inputDim = inputDim;
    this.outputDim = outputDim;

    if (projectionMatrix) {
      if (projectionMatrix.length !== inputDim * outputDim) {
        throw new Error(
          `Projection matrix size mismatch: expected ${inputDim * outputDim}, got ${projectionMatrix.length}`
        );
      }
      this.projectionMatrix = projectionMatrix;
    } else {
      this.projectionMatrix = CpGEmbedder.generateRandomProjection(inputDim, outputDim);
    }
  }

  /**
   * Generate a random projection matrix with Xavier initialization.
   * Values are drawn from a uniform distribution in [-limit, limit]
   * where limit = sqrt(6 / (inputDim + outputDim)).
   */
  static generateRandomProjection(inputDim: number, outputDim: number, seed?: number): Float32Array {
    const size = inputDim * outputDim;
    const matrix = new Float32Array(size);
    const limit = Math.sqrt(6 / (inputDim + outputDim));

    // Simple seeded PRNG (mulberry32) for reproducibility when seed is provided
    let rng: () => number;
    if (seed !== undefined) {
      let s = seed | 0;
      rng = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    } else {
      rng = Math.random;
    }

    for (let i = 0; i < size; i++) {
      matrix[i] = (rng() * 2 - 1) * limit;
    }

    return matrix;
  }

  /**
   * Embed a MethylationSample into a Float32Array of dimension outputDim.
   *
   * Steps:
   * 1. Extract beta values in a fixed order (sorted probe IDs)
   * 2. Pad or truncate to inputDim
   * 3. Multiply by projection matrix
   * 4. Apply tanh activation
   */
  embed(sample: MethylationSample): Float32Array {
    const input = this.extractBetaValues(sample);
    return this.project(input);
  }

  /**
   * Embed from a raw beta-value array (must be length inputDim).
   */
  embedRaw(betaValues: Float32Array): Float32Array {
    if (betaValues.length !== this.inputDim) {
      throw new Error(
        `Input dimension mismatch: expected ${this.inputDim}, got ${betaValues.length}`
      );
    }
    return this.project(betaValues);
  }

  /**
   * Get a copy of the projection matrix for serialization.
   */
  getProjectionMatrix(): Float32Array {
    return new Float32Array(this.projectionMatrix);
  }

  /**
   * Load a projection matrix (replaces current).
   */
  loadProjectionMatrix(matrix: Float32Array): void {
    if (matrix.length !== this.inputDim * this.outputDim) {
      throw new Error(
        `Projection matrix size mismatch: expected ${this.inputDim * this.outputDim}, got ${matrix.length}`
      );
    }
    this.projectionMatrix = new Float32Array(matrix);
  }

  getInputDim(): number {
    return this.inputDim;
  }

  getOutputDim(): number {
    return this.outputDim;
  }

  private extractBetaValues(sample: MethylationSample): Float32Array {
    const sortedKeys = Array.from(sample.cpgSites.keys()).sort();
    const input = new Float32Array(this.inputDim);

    const count = Math.min(sortedKeys.length, this.inputDim);
    for (let i = 0; i < count; i++) {
      input[i] = sample.cpgSites.get(sortedKeys[i])!;
    }
    // Remaining positions stay 0 (zero-padded)

    return input;
  }

  private project(input: Float32Array): Float32Array {
    const output = new Float32Array(this.outputDim);

    for (let j = 0; j < this.outputDim; j++) {
      let sum = 0;
      for (let i = 0; i < this.inputDim; i++) {
        sum += input[i] * this.projectionMatrix[i * this.outputDim + j];
      }
      output[j] = Math.tanh(sum);
    }

    return output;
  }
}
